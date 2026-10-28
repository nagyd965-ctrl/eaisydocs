"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"
import { canManageEmployeePerformance } from "@/utils/hr/performance-access"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function addKpi(formData: FormData) {
  const auth = await requireHrAuthServer(
    ["hr_munkatars", "hr_vezeto", "admin", "vezeto"],
    null
  )
  if (!auth.authorized || !auth.user) {
    return { error: "Nincs jogosultságod KPI-ok kezeléséhez." }
  }

  const dolgozoId = formData.get("dolgozoId") as string
  const ertekelesSzovege = formData.get("ertekelesSzovege") as string
  const ciklusId = formData.get("ciklusId") as string
  const meroszamTipusa = (formData.get("meroszamTipusa") as string) || "szazalek"
  const celErtek = parseFloat((formData.get("celErtek") as string) || "100")
  const sulyozas = parseFloat((formData.get("sulyozas") as string) || "1.0")
  const aktualisErtek = parseFloat((formData.get("aktualisErtek") as string) || "0")
  const szuloKpiId = (formData.get("szuloKpiId") as string) || null

  if (!dolgozoId || !ertekelesSzovege) {
    return { error: "Kötelező adatok hiányoznak!" }
  }

  const adminClient = getAdminClient()

  // Vezetői hatáskör ellenőrzése (vezeto csak a saját beosztottjainak tűzhet ki célt)
  const canManage = await canManageEmployeePerformance(adminClient, auth, dolgozoId)
  if (!canManage) {
    return { error: "Csak a saját közvetlen beosztottjaid célkitűzéseit kezelheted." }
  }

  // Százalék kiszámítása a megjelenítéshez
  let pontszam = 0
  if (meroszamTipusa === "igen_nem") {
    pontszam = aktualisErtek > 0 ? 100 : 0
  } else if (celErtek > 0) {
    pontszam = Math.min(100, Math.round((aktualisErtek / celErtek) * 100))
  }

  const activeCompanyId = auth.activeCompanyId || (await getActiveCompanyIdServer())

  const { error } = await adminClient
    .from("hr_teljesitmeny")
    .insert([
      {
        dolgozo_id: dolgozoId,
        company_id: activeCompanyId,
        celkituzes: ertekelesSzovege,
        ertekeles_szovege: null,
        ciklus_id: ciklusId || null,
        szulo_kpi_id: szuloKpiId,
        ertekelt_idoszak: null,
        pontszam: pontszam,
        meroszam_tipusa: meroszamTipusa,
        cel_ertek: celErtek,
        aktualis_ertek: aktualisErtek,
        sulyozas: sulyozas,
        ertekeles_datuma: new Date().toISOString().split("T")[0],
        ertekeles_keszito_id: auth.user.id,
        workflow_fazis: "celkituzes",
      },
    ])
    .select("id")
    .single()

  if (error) {
    console.error("Hiba KPI rögzítésekor:", error)
    return { error: error.message }
  }

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: auth.user.id,
    company_id: activeCompanyId,
    esemeny_tipus: "kpi_hozzaadas",
    entitas_tipus: "hr_teljesitmeny",
    entitas_id: dolgozoId,
    megjegyzes: "Új célkitűzés / KPI hozzáadva a dolgozónak",
  })

  revalidatePath("/hr/performance")
  revalidatePath("/hr/performance/dashboard")
  revalidatePath("/hr/self-service")
  revalidatePath("/hr/self-service/goals")
  return { success: true }
}

export async function updateKpiProgress(kpiId: string, newValue: number) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const adminClient = getAdminClient()

  const { data: kpiData } = await adminClient
    .from("hr_teljesitmeny")
    .select("dolgozo_id, cel_ertek, meroszam_tipusa, company_id")
    .eq("id", kpiId)
    .single()

  if (!kpiData) return { error: "Célkitűzés nem található." }

  if (kpiData.dolgozo_id !== user.id) {
    const auth = await requireHrAuthServer(
      ["hr_munkatars", "hr_vezeto", "admin", "vezeto"],
      null
    )
    const canManage = await canManageEmployeePerformance(
      adminClient,
      auth,
      kpiData.dolgozo_id
    )
    if (!canManage) {
      return { error: "Nincs jogosultságod a célkitűzés frissítéséhez." }
    }
  }

  let pontszam = 0
  if (kpiData.meroszam_tipusa === "igen_nem") {
    pontszam = newValue > 0 ? 100 : 0
  } else if (kpiData.cel_ertek && kpiData.cel_ertek > 0) {
    pontszam = Math.min(100, Math.round((newValue / kpiData.cel_ertek) * 100))
  } else {
    pontszam = Math.min(100, Math.round(newValue))
  }

  const { error } = await adminClient
    .from("hr_teljesitmeny")
    .update({
      aktualis_ertek: newValue,
      pontszam: pontszam,
    })
    .eq("id", kpiId)

  if (error) {
    console.error("Hiba KPI frissítésekor:", error)
    return { error: error.message }
  }

  const activeCompanyId = kpiData.company_id || (await getActiveCompanyIdServer())

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    company_id: activeCompanyId,
    esemeny_tipus: "kpi_frissites",
    entitas_tipus: "hr_teljesitmeny",
    entitas_id: kpiId,
    megjegyzes: `Célkitűzés állapota frissítve: ${newValue}`,
  })

  revalidatePath("/hr/performance")
  revalidatePath("/hr/performance/dashboard")
  revalidatePath("/hr/self-service")
  revalidatePath("/hr/self-service/goals")
  return { success: true }
}

export async function deleteKpi(kpiId: string) {
  const auth = await requireHrAuthServer(
    ["hr_munkatars", "hr_vezeto", "admin", "vezeto"],
    null
  )
  if (!auth.authorized || !auth.user) {
    return { error: "Nincs jogosultságod KPI-ok kezeléséhez." }
  }

  const adminClient = getAdminClient()

  const { data: kpiData } = await adminClient
    .from("hr_teljesitmeny")
    .select("dolgozo_id, company_id")
    .eq("id", kpiId)
    .single()

  if (!kpiData) return { error: "Célkitűzés nem található." }

  const canManage = await canManageEmployeePerformance(
    adminClient,
    auth,
    kpiData.dolgozo_id
  )
  if (!canManage) {
    return { error: "Csak a saját közvetlen beosztottjaid célkitűzéseit törölheted." }
  }

  const { error } = await adminClient
    .from("hr_teljesitmeny")
    .delete()
    .eq("id", kpiId)

  if (error) {
    console.error("Hiba KPI törlésekor:", error)
    return { error: error.message }
  }

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: auth.user.id,
    company_id: kpiData.company_id || auth.activeCompanyId,
    esemeny_tipus: "kpi_torles",
    entitas_tipus: "hr_teljesitmeny",
    entitas_id: kpiId,
    megjegyzes: "Célkitűzés / KPI törölve",
  })

  revalidatePath("/hr/performance")
  revalidatePath("/hr/performance/dashboard")
  revalidatePath("/hr/self-service")
  revalidatePath("/hr/self-service/goals")
  return { success: true }
}

export async function addCycle(formData: FormData) {
  const auth = await requireHrAuthServer(
    ["hr_munkatars", "hr_vezeto", "admin"],
    null
  )
  if (!auth.authorized || !auth.user) {
    return { error: "Nincs jogosultságod ciklusok kezeléséhez." }
  }

  const megnevezes = formData.get("megnevezes") as string
  const kezdoDatum = formData.get("kezdoDatum") as string
  const befejezoDatum = formData.get("befejezoDatum") as string

  if (!megnevezes || !kezdoDatum || !befejezoDatum) {
    return { error: "Minden mező kötelező!" }
  }

  const adminClient = getAdminClient()
  const activeCompanyId = auth.activeCompanyId || (await getActiveCompanyIdServer())

  const { error } = await adminClient.from("hr_teljesitmeny_ciklus").insert([
    {
      megnevezes,
      kezdo_datum: kezdoDatum,
      befejezo_datum: befejezoDatum,
      statusz: "nyitott",
      company_id: activeCompanyId,
    },
  ])

  if (error) {
    console.error("Hiba ciklus rögzítésekor:", error)
    return { error: error.message }
  }

  revalidatePath("/hr/performance")
  revalidatePath("/hr/performance/dashboard")
  return { success: true }
}

export async function updateCycleStatus(cycleId: string, newStatus: string) {
  const auth = await requireHrAuthServer(
    ["hr_munkatars", "hr_vezeto", "admin"],
    null
  )
  if (!auth.authorized || !auth.user) {
    return { error: "Nincs jogosultságod ciklusok kezeléséhez." }
  }

  const adminClient = getAdminClient()

  const { error } = await adminClient
    .from("hr_teljesitmeny_ciklus")
    .update({ statusz: newStatus })
    .eq("id", cycleId)

  if (error) {
    console.error("Hiba ciklus frissítésekor:", error)
    return { error: error.message }
  }

  revalidatePath("/hr/performance")
  revalidatePath("/hr/performance/dashboard")
  return { success: true }
}

export async function deleteCycle(cycleId: string) {
  const auth = await requireHrAuthServer(
    ["hr_munkatars", "hr_vezeto", "admin"],
    null
  )
  if (!auth.authorized || !auth.user) {
    return { error: "Nincs jogosultságod ciklusok kezeléséhez." }
  }

  const adminClient = getAdminClient()

  const { count } = await adminClient
    .from("hr_teljesitmeny")
    .select("id", { count: "exact", head: true })
    .eq("ciklus_id", cycleId)

  if (count && count > 0) {
    return {
      error: "Ez a ciklus nem törölhető, mert már tartalmaz célkitűzéseket!",
    }
  }

  const { error } = await adminClient
    .from("hr_teljesitmeny_ciklus")
    .delete()
    .eq("id", cycleId)

  if (error) {
    console.error("Hiba ciklus törlésekor:", error)
    return { error: error.message }
  }

  revalidatePath("/hr/performance")
  revalidatePath("/hr/performance/dashboard")
  return { success: true }
}

export async function addKpiSelfEvaluation(
  kpiId: string,
  ertekelesSzovege: string,
  aktualisErtek?: number
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const adminClient = getAdminClient()

  const { data: kpiData } = await adminClient
    .from("hr_teljesitmeny")
    .select("dolgozo_id, meroszam_tipusa, cel_ertek, company_id")
    .eq("id", kpiId)
    .single()

  if (!kpiData) return { error: "Célkitűzés nem található." }

  const updatePayload: any = {
    onertekeles_szovege: ertekelesSzovege,
    workflow_fazis: "onertekeles",
  }

  if (aktualisErtek !== undefined && !isNaN(aktualisErtek)) {
    let pontszam = 0
    if (kpiData?.meroszam_tipusa === "igen_nem") {
      pontszam = aktualisErtek > 0 ? 100 : 0
    } else if (kpiData?.cel_ertek && kpiData.cel_ertek > 0) {
      pontszam = Math.min(100, Math.round((aktualisErtek / kpiData.cel_ertek) * 100))
    }

    updatePayload.aktualis_ertek = aktualisErtek
    updatePayload.pontszam = pontszam
  }

  const { error } = await adminClient
    .from("hr_teljesitmeny")
    .update(updatePayload)
    .eq("id", kpiId)

  if (error) {
    console.error("Hiba önértékelés rögzítésekor:", error)
    return { error: error.message }
  }

  const activeCompanyId = kpiData.company_id || (await getActiveCompanyIdServer())

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    company_id: activeCompanyId,
    esemeny_tipus: "kpi_onertekeles",
    entitas_tipus: "hr_teljesitmeny",
    entitas_id: kpiId,
    megjegyzes: `Önértékelés rögzítve: "${ertekelesSzovege.substring(0, 50)}${ertekelesSzovege.length > 50 ? "..." : ""}"${aktualisErtek !== undefined && !isNaN(aktualisErtek) ? ` (Elért eredmény: ${aktualisErtek})` : ""}`,
  })

  revalidatePath("/hr/performance")
  revalidatePath("/hr/performance/dashboard")
  revalidatePath("/hr/self-service")
  revalidatePath("/hr/self-service/goals")
  return { success: true }
}

export async function addKpiManagerEvaluation(
  kpiId: string,
  ertekelesSzovege: string,
  aktualisErtek?: number
) {
  const auth = await requireHrAuthServer(
    ["hr_munkatars", "hr_vezeto", "admin", "vezeto"],
    null
  )
  if (!auth.authorized || !auth.user) {
    return { error: "Nincs jogosultságod vezetői értékelés rögzítéséhez." }
  }

  const adminClient = getAdminClient()

  const { data: kpiData } = await adminClient
    .from("hr_teljesitmeny")
    .select("dolgozo_id, meroszam_tipusa, cel_ertek, company_id")
    .eq("id", kpiId)
    .single()

  if (!kpiData) return { error: "Célkitűzés nem található." }

  const canManage = await canManageEmployeePerformance(
    adminClient,
    auth,
    kpiData.dolgozo_id
  )
  if (!canManage) {
    return { error: "Csak a saját közvetlen beosztottjaid célkitűzéseit értékelheted." }
  }

  const updatePayload: any = {
    ertekeles_szovege: ertekelesSzovege,
    workflow_fazis: "vezetoi_ertekeles",
  }

  if (aktualisErtek !== undefined && !isNaN(aktualisErtek)) {
    let pontszam = 0
    if (kpiData?.meroszam_tipusa === "igen_nem") {
      pontszam = aktualisErtek > 0 ? 100 : 0
    } else if (kpiData?.cel_ertek && kpiData.cel_ertek > 0) {
      pontszam = Math.min(100, Math.round((aktualisErtek / kpiData.cel_ertek) * 100))
    }

    updatePayload.aktualis_ertek = aktualisErtek
    updatePayload.pontszam = pontszam
  }

  const { error } = await adminClient
    .from("hr_teljesitmeny")
    .update(updatePayload)
    .eq("id", kpiId)

  if (error) {
    console.error("Hiba vezetői értékelés rögzítésekor:", error)
    return { error: error.message }
  }

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: auth.user.id,
    company_id: kpiData.company_id || auth.activeCompanyId,
    esemeny_tipus: "kpi_vezetoi_ertekeles",
    entitas_tipus: "hr_teljesitmeny",
    entitas_id: kpiId,
    megjegyzes: `Vezetői értékelés rögzítve: "${ertekelesSzovege.substring(0, 50)}${ertekelesSzovege.length > 50 ? "..." : ""}"${aktualisErtek !== undefined && !isNaN(aktualisErtek) ? ` (Elért eredmény: ${aktualisErtek})` : ""}`,
  })

  revalidatePath("/hr/performance")
  revalidatePath("/hr/performance/dashboard")
  revalidatePath("/hr/self-service")
  revalidatePath("/hr/self-service/goals")
  return { success: true }
}

export async function confirmMeeting(kpiId: string, megjegyzes?: string) {
  const auth = await requireHrAuthServer(
    ["hr_munkatars", "hr_vezeto", "admin", "vezeto"],
    null
  )
  if (!auth.authorized || !auth.user) {
    return { error: "Csak vezető jelölheti a megbeszélést megtörténtnek." }
  }

  const adminClient = getAdminClient()

  const { data: kpiData } = await adminClient
    .from("hr_teljesitmeny")
    .select("dolgozo_id, company_id")
    .eq("id", kpiId)
    .single()

  if (!kpiData) return { error: "Célkitűzés nem található." }

  const canManage = await canManageEmployeePerformance(
    adminClient,
    auth,
    kpiData.dolgozo_id
  )
  if (!canManage) {
    return { error: "Csak a saját közvetlen beosztottjaid értékelő megbeszélését igazolhatod." }
  }

  const { error } = await adminClient
    .from("hr_teljesitmeny")
    .update({
      workflow_fazis: "megbeszeles",
      megbeszeles_datum: new Date().toISOString(),
      megbeszeles_megjegyzes: megjegyzes || null,
    })
    .eq("id", kpiId)

  if (error) {
    console.error("Hiba megbeszélés rögzítésekor:", error)
    return { error: error.message }
  }

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: auth.user.id,
    company_id: kpiData.company_id || auth.activeCompanyId,
    esemeny_tipus: "kpi_megbeszeles",
    entitas_tipus: "hr_teljesitmeny",
    entitas_id: kpiId,
    megjegyzes: `Értékelő megbeszélés megtörtént.${megjegyzes ? ` Jegyzőkönyv: ${megjegyzes.substring(0, 100)}` : ""}`,
  })

  revalidatePath("/hr/performance")
  revalidatePath("/hr/performance/dashboard")
  revalidatePath("/hr/self-service")
  revalidatePath("/hr/self-service/goals")
  return { success: true }
}

export async function finalCloseKpi(kpiId: string) {
  const auth = await requireHrAuthServer(
    ["hr_munkatars", "hr_vezeto", "admin", "vezeto"],
    null
  )
  if (!auth.authorized || !auth.user) {
    return { error: "Nincs jogosultságod a cél lezárásához." }
  }

  const adminClient = getAdminClient()

  const { data: kpiData } = await adminClient
    .from("hr_teljesitmeny")
    .select("dolgozo_id, company_id")
    .eq("id", kpiId)
    .single()

  if (!kpiData) return { error: "Célkitűzés nem található." }

  const canManage = await canManageEmployeePerformance(
    adminClient,
    auth,
    kpiData.dolgozo_id
  )
  if (!canManage) {
    return { error: "Csak a saját közvetlen beosztottjaid célkitűzéseit zárhatod le." }
  }

  const { error } = await adminClient
    .from("hr_teljesitmeny")
    .update({
      workflow_fazis: "lezart",
      ertekeles_lezarva_datum: new Date().toISOString(),
    })
    .eq("id", kpiId)

  if (error) {
    console.error("Hiba cél lezárásakor:", error)
    return { error: error.message }
  }

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: auth.user.id,
    company_id: kpiData.company_id || auth.activeCompanyId,
    esemeny_tipus: "kpi_lezaras",
    entitas_tipus: "hr_teljesitmeny",
    entitas_id: kpiId,
    megjegyzes: "Célkitűzés véglegesen lezárva.",
  })

  revalidatePath("/hr/performance")
  revalidatePath("/hr/performance/dashboard")
  revalidatePath("/hr/self-service")
  revalidatePath("/hr/self-service/goals")
  return { success: true }
}

export async function editKpi(kpiId: string, formData: FormData) {
  const auth = await requireHrAuthServer(
    ["hr_munkatars", "hr_vezeto", "admin", "vezeto"],
    null
  )
  if (!auth.authorized || !auth.user) {
    return { error: "Nincs jogosultságod KPI-ok kezeléséhez." }
  }

  const ertekelesSzovege = formData.get("ertekelesSzovege") as string
  const ciklusId = formData.get("ciklusId") as string
  const meroszamTipusa = (formData.get("meroszamTipusa") as string) || "szazalek"
  const celErtek = parseFloat((formData.get("celErtek") as string) || "100")
  const sulyozas = parseFloat((formData.get("sulyozas") as string) || "1.0")
  const szuloKpiId = (formData.get("szuloKpiId") as string) || null

  if (!ertekelesSzovege) return { error: "Kötelező adatok hiányoznak!" }

  const adminClient = getAdminClient()

  const { data: currKpi } = await adminClient
    .from("hr_teljesitmeny")
    .select("dolgozo_id, aktualis_ertek, company_id")
    .eq("id", kpiId)
    .single()

  if (!currKpi) return { error: "Célkitűzés nem található." }

  const canManage = await canManageEmployeePerformance(
    adminClient,
    auth,
    currKpi.dolgozo_id
  )
  if (!canManage) {
    return { error: "Csak a saját közvetlen beosztottjaid célkitűzéseit szerkesztheted." }
  }

  let pontszam = 0
  const currentVal = currKpi?.aktualis_ertek ? Number(currKpi.aktualis_ertek) : 0
  if (meroszamTipusa === "igen_nem") {
    pontszam = currentVal > 0 ? 100 : 0
  } else if (celErtek > 0) {
    pontszam = Math.min(100, Math.round((currentVal / celErtek) * 100))
  }

  const { error } = await adminClient
    .from("hr_teljesitmeny")
    .update({
      celkituzes: ertekelesSzovege,
      ciklus_id: ciklusId || null,
      szulo_kpi_id: szuloKpiId,
      meroszam_tipusa: meroszamTipusa,
      cel_ertek: celErtek,
      sulyozas: sulyozas,
      pontszam: pontszam,
    })
    .eq("id", kpiId)

  if (error) {
    console.error("Hiba KPI frissítésekor:", error)
    return { error: error.message }
  }

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: auth.user.id,
    company_id: currKpi.company_id || auth.activeCompanyId,
    esemeny_tipus: "kpi_frissites",
    entitas_tipus: "hr_teljesitmeny",
    entitas_id: kpiId,
    megjegyzes: "Célkitűzés paraméterei szerkesztve.",
  })

  revalidatePath("/hr/performance")
  revalidatePath("/hr/performance/dashboard")
  revalidatePath("/hr/self-service")
  revalidatePath("/hr/self-service/goals")
  return { success: true }
}

export async function addKpiActivity(kpiId: string, megjegyzes: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const adminClient = getAdminClient()
  const activeCompanyId = await getActiveCompanyIdServer()

  const { error } = await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    company_id: activeCompanyId,
    esemeny_tipus: "kpi_bejegyzes",
    entitas_tipus: "hr_teljesitmeny",
    entitas_id: kpiId,
    megjegyzes: megjegyzes,
  })

  if (error) {
    console.error("Hiba KPI bejegyzés hozzáadásakor:", error)
    return { error: error.message }
  }

  revalidatePath("/hr/performance")
  revalidatePath("/hr/self-service")
  revalidatePath("/hr/self-service/goals")
  return { success: true }
}
