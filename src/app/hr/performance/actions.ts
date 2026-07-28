"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

export async function addKpi(formData: FormData) {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('hr_szerepkor')
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor)) {
    return { error: "Nincs jogosultságod KPI-ok kezeléséhez." }
  }

  const dolgozoId = formData.get("dolgozoId") as string
  const ertekelesSzovege = formData.get("ertekelesSzovege") as string
  const ciklusId = formData.get("ciklusId") as string
  const meroszamTipusa = formData.get("meroszamTipusa") as string || "szazalek"
  const celErtek = parseFloat(formData.get("celErtek") as string || "100")
  const sulyozas = parseFloat(formData.get("sulyozas") as string || "1.0")
  const aktualisErtek = parseFloat(formData.get("aktualisErtek") as string || "0")
  const szuloKpiId = formData.get("szuloKpiId") as string || null

  // Százalék kiszámítása a megjelenítéshez
  let pontszam = 0;
  if (meroszamTipusa === "igen_nem") {
    pontszam = aktualisErtek > 0 ? 100 : 0;
  } else if (celErtek > 0) {
    pontszam = Math.min(100, Math.round((aktualisErtek / celErtek) * 100));
  }

  if (!dolgozoId || !ertekelesSzovege) return { error: "Kötelező adatok hiányoznak!" }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error, data: newKpi } = await adminClient
    .from("hr_teljesitmeny")
    .insert([{
      dolgozo_id: dolgozoId,
      celkituzes: ertekelesSzovege, // ez lesz a cél neve
      ertekeles_szovege: null, // részletes értékelés később
      ciklus_id: ciklusId || null,
      szulo_kpi_id: szuloKpiId,
      ertekelt_idoszak: null, // deprecated
      pontszam: pontszam, // számított százalék
      meroszam_tipusa: meroszamTipusa,
      cel_ertek: celErtek,
      aktualis_ertek: aktualisErtek,
      sulyozas: sulyozas,
      ertekeles_datuma: new Date().toISOString().split('T')[0],
      ertekeles_keszito_id: user.id
    }])
    .select("id")
    .single()

  if (error) {
    console.error("Hiba KPI rögzítésekor:", error)
    return { error: error.message }
  }

  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "kpi_hozzaadas", 
    entitas_tipus: "hr_teljesitmeny",
    entitas_id: dolgozoId,
    megjegyzes: `Új célkitűzés / KPI hozzáadva a dolgozónak`
  })

  revalidatePath("/hr/performance")
  return { success: true }
}

export async function updateKpiProgress(kpiId: string, newValue: number) {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('hr_szerepkor')
    .eq("id", user.id)
    .single()

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Először le kell kérni a meglévő KPI adatokat a százalék számításához
  const { data: kpiData } = await adminClient
    .from("hr_teljesitmeny")
    .select("dolgozo_id, cel_ertek, meroszam_tipusa")
    .eq("id", kpiId)
    .single()

  if (!kpiData) return { error: "Célkitűzés nem található." }

  if (!profile || (!["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor) && kpiData.dolgozo_id !== user.id)) {
    return { error: "Nincs jogosultságod a célkitűzés frissítéséhez." }
  }

  let pontszam = 0;
  if (kpiData.meroszam_tipusa === "igen_nem") {
    pontszam = newValue > 0 ? 100 : 0;
  } else if (kpiData.cel_ertek && kpiData.cel_ertek > 0) {
    pontszam = Math.min(100, Math.round((newValue / kpiData.cel_ertek) * 100));
  } else {
    pontszam = Math.min(100, Math.round(newValue)); // Ha nincs célérték, fallback
  }

  const { error } = await adminClient
    .from("hr_teljesitmeny")
    .update({ 
      aktualis_ertek: newValue,
      pontszam: pontszam
    })
    .eq("id", kpiId)

  if (error) {
    console.error("Hiba KPI frissítésekor:", error)
    return { error: error.message }
  }

  // Naplózás
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "kpi_frissites", 
    entitas_tipus: "hr_teljesitmeny",
    entitas_id: kpiId,
    megjegyzes: `Célkitűzés állapota frissítve: ${newValue}`
  })

  revalidatePath("/hr/performance")
  revalidatePath("/hr/self-service")
  return { success: true }
}

export async function deleteKpi(kpiId: string) {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('hr_szerepkor')
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor)) {
    return { error: "Nincs jogosultságod KPI-ok kezeléséhez." }
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await adminClient
    .from("hr_teljesitmeny")
    .delete()
    .eq("id", kpiId)

  if (error) {
    console.error("Hiba KPI törlésekor:", error)
    return { error: error.message }
  }

  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "kpi_torles", 
    entitas_tipus: "hr_teljesitmeny",
    entitas_id: kpiId,
    megjegyzes: `Célkitűzés / KPI törölve`
  })

  revalidatePath("/hr/performance")
  revalidatePath("/hr/self-service")
  return { success: true }
}

export async function addCycle(formData: FormData) {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('hr_szerepkor')
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor)) {
    return { error: "Nincs jogosultságod ciklusok kezeléséhez." }
  }

  const megnevezes = formData.get("megnevezes") as string
  const kezdoDatum = formData.get("kezdoDatum") as string
  const befejezoDatum = formData.get("befejezoDatum") as string

  if (!megnevezes || !kezdoDatum || !befejezoDatum) return { error: "Minden mező kötelező!" }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await adminClient
    .from("hr_teljesitmeny_ciklus")
    .insert([{
      megnevezes,
      kezdo_datum: kezdoDatum,
      befejezo_datum: befejezoDatum,
      statusz: "tervezes"
    }])

  if (error) {
    console.error("Hiba ciklus rögzítésekor:", error)
    return { error: error.message }
  }

  revalidatePath("/hr/performance")
  return { success: true }
}

export async function updateCycleStatus(cycleId: string, newStatus: string) {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('hr_szerepkor')
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor)) {
    return { error: "Nincs jogosultságod ciklusok kezeléséhez." }
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await adminClient
    .from("hr_teljesitmeny_ciklus")
    .update({ statusz: newStatus })
    .eq("id", cycleId)

  if (error) {
    console.error("Hiba ciklus frissítésekor:", error)
    return { error: error.message }
  }

  revalidatePath("/hr/performance")
  return { success: true }
}

export async function deleteCycle(cycleId: string) {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('hr_szerepkor')
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor)) {
    return { error: "Nincs jogosultságod ciklusok kezeléséhez." }
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Ellenőrizzük, hogy van-e hozzákapcsolt KPI
  const { count } = await adminClient
    .from("hr_teljesitmeny")
    .select("id", { count: "exact", head: true })
    .eq("ciklus_id", cycleId)
    
  if (count && count > 0) {
    return { error: "Ez a ciklus nem törölhető, mert már tartalmaz célkitűzéseket!" }
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
  return { success: true }
}

export async function addKpiSelfEvaluation(kpiId: string, ertekelesSzovege: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await adminClient
    .from("hr_teljesitmeny")
    .update({ 
      onertekeles_szovege: ertekelesSzovege
    })
    .eq("id", kpiId)

  if (error) {
    console.error("Hiba önértékelés rögzítésekor:", error)
    return { error: error.message }
  }

  // Naplózás
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "kpi_onertekeles", 
    entitas_tipus: "hr_teljesitmeny",
    entitas_id: kpiId,
    megjegyzes: `Önértékelés rögzítve: "${ertekelesSzovege.substring(0, 50)}${ertekelesSzovege.length > 50 ? '...' : ''}"`
  })

  revalidatePath("/hr/performance")
  revalidatePath("/hr/self-service")
  return { success: true }
}

export async function addKpiManagerEvaluation(kpiId: string, ertekelesSzovege: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await adminClient
    .from("hr_teljesitmeny")
    .update({ 
      ertekeles_szovege: ertekelesSzovege,
      ertekeles_lezarva_datum: new Date().toISOString()
    })
    .eq("id", kpiId)

  if (error) {
    console.error("Hiba vezetői értékelés rögzítésekor:", error)
    return { error: error.message }
  }

  // Naplózás
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "kpi_vegsodonto", 
    entitas_tipus: "hr_teljesitmeny",
    entitas_id: kpiId,
    megjegyzes: `Vezetői végleges értékelés: "${ertekelesSzovege.substring(0, 50)}${ertekelesSzovege.length > 50 ? '...' : ''}"`
  })

  revalidatePath("/hr/performance")
  revalidatePath("/hr/self-service")
  return { success: true }
}

export async function editKpi(kpiId: string, formData: FormData) {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('hr_szerepkor')
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor)) {
    return { error: "Nincs jogosultságod KPI-ok kezeléséhez." }
  }

  const ertekelesSzovege = formData.get("ertekelesSzovege") as string
  const ciklusId = formData.get("ciklusId") as string
  const meroszamTipusa = formData.get("meroszamTipusa") as string || "szazalek"
  const celErtek = parseFloat(formData.get("celErtek") as string || "100")
  const sulyozas = parseFloat(formData.get("sulyozas") as string || "1.0")
  const szuloKpiId = formData.get("szuloKpiId") as string || null

  if (!ertekelesSzovege) return { error: "Kötelező adatok hiányoznak!" }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await adminClient
    .from("hr_teljesitmeny")
    .update({
      celkituzes: ertekelesSzovege,
      ciklus_id: ciklusId || null,
      szulo_kpi_id: szuloKpiId,
      meroszam_tipusa: meroszamTipusa,
      cel_ertek: celErtek,
      sulyozas: sulyozas
    })
    .eq("id", kpiId)

  if (error) {
    console.error("Hiba KPI frissítésekor:", error)
    return { error: error.message }
  }

  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "kpi_frissites", 
    entitas_tipus: "hr_teljesitmeny",
    entitas_id: kpiId,
    megjegyzes: `Célkitűzés paraméterei szerkesztve.`
  })

  revalidatePath("/hr/performance")
  return { success: true }
}

export async function addKpiActivity(kpiId: string, megjegyzes: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "kpi_bejegyzes", 
    entitas_tipus: "hr_teljesitmeny",
    entitas_id: kpiId,
    megjegyzes: megjegyzes
  })

  if (error) {
    console.error("Hiba KPI bejegyzés hozzáadásakor:", error)
    return { error: error.message }
  }

  revalidatePath("/hr/performance")
  revalidatePath("/hr/self-service")
  return { success: true }
}
