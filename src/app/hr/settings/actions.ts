"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

export async function createMunkakor(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const megnevezes = formData.get("megnevezes") as string
  const feor_kod = formData.get("feor_kod") as string
  const besorolasi_szint = formData.get("besorolasi_szint") as string
  const kockazat_tipusa = formData.get("kockazat_tipusa") as string

  if (!megnevezes) {
    return { error: "A megnevezés megadása kötelező" }
  }

  const { data, error } = await supabase
    .from("hr_munkakor")
    .insert([
      {
        megnevezes,
        feor_kod: feor_kod || null,
        besorolasi_szint: besorolasi_szint || null,
        kockazat_tipusa: kockazat_tipusa || null,
      }
    ])
    .select()

  if (error) {
    console.error("Hiba a munkakör létrehozásánál:", error)
    return { error: error.message }
  }

  revalidatePath("/hr/settings")
  return { success: true }
}

export async function updateEmployeeInfo(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const employeeId = formData.get("employeeId") as string
  const role = formData.get("role") as string
  const munkakorId = formData.get("munkakorId") as string
  const entryDate = formData.get("entryDate") as string
  const jogviszonyId = formData.get("jogviszonyId") as string
  const formDataOrgUnitId = formData.get("orgUnitId") as string

  // 0. Szerviz kliens inicializálása (mivel RLS miatt a profilt csak admin joggal tudjuk módosítani)
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (!employeeId) return { error: "Hiányzó dolgozó azonosító" }

  // 1. Megnézzük, hogy változott-e a munkakör, és ha igen, lekérjük a hozzá tartozó szervezeti egységet
  let targetMunkakor = munkakorId === "none" ? null : munkakorId
  let defaultOrgUnitId = null;
  if (targetMunkakor) {
    const { data: jobData } = await supabaseAdmin
      .from("hr_munkakor")
      .select("szervezeti_egyseg_id")
      .eq("id", targetMunkakor)
      .single()
    if (jobData?.szervezeti_egyseg_id) {
      defaultOrgUnitId = jobData.szervezeti_egyseg_id
    }
  }

  const finalOrgUnitId = formDataOrgUnitId && formDataOrgUnitId !== "none"
    ? formDataOrgUnitId
    : (formDataOrgUnitId === "none" ? null : defaultOrgUnitId)

  // 2. Profil (Szerepkör és Szervezeti Egység) frissítése admin klienssel
  const profileUpdateData: any = {}
  if (role) profileUpdateData.hr_szerepkor = role
  
  if (finalOrgUnitId !== undefined) {
    profileUpdateData.hr_szervezeti_egyseg_id = finalOrgUnitId
  }

  if (Object.keys(profileUpdateData).length > 0) {
    const { error: profileError } = await supabaseAdmin
      .from("felhasznalo_profil")
      .update(profileUpdateData)
      .eq("id", employeeId)

    if (profileError) return { error: "Hiba a profil frissítésekor: " + profileError.message }
  }

  if (jogviszonyId) {
    // 3. Jogviszony frissítése (Belépés dátuma)
    if (entryDate) {
      const { error: hrError } = await supabaseAdmin
        .from("hr_jogviszony")
        .update({ belepes_datuma: entryDate })
        .eq("id", jogviszonyId)

      if (hrError) return { error: "Hiba a jogviszony frissítésekor: " + hrError.message }
    }

    // 4. Munkakör (Beosztás) frissítése
    // Megnézzük mi az aktív beosztás
    const { data: beosztasok } = await supabaseAdmin
      .from("hr_beosztas")
      .select("id, munkakor_id")
      .eq("jogviszony_id", jogviszonyId)
      .is("ervenyes_ig", null)
      .order("ervenyes_tol", { ascending: false })
      .limit(1)

    const activeBeosztas = beosztasok?.[0]

    // Csak akkor változtatunk beosztást, ha tényleg módosult a munkakör
    if (targetMunkakor !== (activeBeosztas?.munkakor_id || null)) {
      // 1. Lezárjuk a régit a mai nappal
      if (activeBeosztas) {
        await supabaseAdmin
          .from("hr_beosztas")
          .update({ ervenyes_ig: new Date().toISOString().split("T")[0] })
          .eq("id", activeBeosztas.id)
      }

      // 2. Nyitunk egy újat, ha van megadva új
      if (targetMunkakor) {
        await supabaseAdmin
          .from("hr_beosztas")
          .insert([{
            jogviszony_id: jogviszonyId,
            munkakor_id: targetMunkakor,
            ervenyes_tol: new Date().toISOString().split("T")[0]
          }])
      }
    }
  }

  revalidatePath("/hr/settings")
  return { success: true }
}

export async function updateMunkakor(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve" }

  const megnevezes = formData.get("megnevezes") as string
  const feor_kod = formData.get("feor_kod") as string
  const besorolasi_szint = formData.get("besorolasi_szint") as string
  const kockazat_tipusa = formData.get("kockazat_tipusa") as string

  if (!megnevezes) return { error: "A megnevezés megadása kötelező" }

  const { error } = await supabase
    .from("hr_munkakor")
    .update({
      megnevezes,
      feor_kod: feor_kod || null,
      besorolasi_szint: besorolasi_szint || null,
      kockazat_tipusa: kockazat_tipusa || null,
    })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/hr/settings")
  return { success: true }
}

export async function deleteMunkakor(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve" }

  // 1. Töröljük a beosztásokat is, amik erre a munkakörre hivatkoznak (hogy a tesztadatokat lehessen törölni)
  await supabase
    .from("hr_beosztas")
    .delete()
    .eq("munkakor_id", id)

  // 2. Töröljük a munkakört
  const { error } = await supabase
    .from("hr_munkakor")
    .delete()
    .eq("id", id)

  if (error) {
    if (error.code === '23503') {
      return { error: "Nem törölhető, mert vannak hozzárendelt dolgozók vagy jelentkezők." }
    }
    return { error: error.message }
  }

  revalidatePath("/hr/settings")
  return { success: true }
}

export async function removeEmployeeFromHR(employeeId: string) {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Töröljük a hr_dolgozo_adatlapot
  // (A DB szinten a CASCADE miatt elvileg a hr_jogviszony és hr_beosztas is törlődik)
  const { error } = await supabaseAdmin
    .from("hr_dolgozo_adatlap")
    .delete()
    .eq("id", employeeId)

  if (error) {
    return { error: "Hiba a HR profil törlésekor: " + error.message }
  }

  // 2. Visszaállítjuk a hr_szerepkort az alapértelmezett "ugyintezo"-re, 
  // így az illető elveszíti az eaisyHR hozzáférését (de a sima eaisyDocs-ba be tud lépni).
  await supabaseAdmin
    .from("felhasznalo_profil")
    .update({ hr_szerepkor: "ugyintezo" })
    .eq("id", employeeId)

  revalidatePath("/hr/settings")
  revalidatePath("/hr/admin")
  return { success: true }
}

export async function createHrDepartment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const nev = formData.get("nev") as string
  if (!nev) return { error: "Név megadása kötelező!" }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin
    .from("hr_szervezeti_egyseg")
    .insert({ nev })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/hr/settings")
  return { success: true }
}

export async function updateHrDepartment(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const nev = formData.get("nev") as string
  if (!nev) return { error: "Név megadása kötelező!" }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin
    .from("hr_szervezeti_egyseg")
    .update({ nev })
    .eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/hr/settings")
  return { success: true }
}

export async function deleteHrDepartment(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: employees } = await supabaseAdmin
    .from("felhasznalo_profil")
    .select("id")
    .eq("hr_szervezeti_egyseg_id", id)
    .limit(1)

  if (employees && employees.length > 0) {
    return { error: "A szervezeti egység nem törölhető, mert vannak hozzárendelt dolgozók!" }
  }

  const { data: subUnits } = await supabaseAdmin
    .from("hr_szervezeti_egyseg")
    .select("id")
    .eq("szulo_id", id)
    .limit(1)

  if (subUnits && subUnits.length > 0) {
    return { error: "A szervezeti egység nem törölhető, mert vannak alatta lévő egységek!" }
  }

  const { error } = await supabaseAdmin
    .from("hr_szervezeti_egyseg")
    .delete()
    .eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/hr/settings")
  return { success: true }
}
