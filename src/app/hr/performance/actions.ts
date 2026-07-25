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
  const idoszak = formData.get("ertekeltIdoszak") as string
  const pontszam = parseInt(formData.get("pontszam") as string || "0")

  if (!dolgozoId || !ertekelesSzovege) return { error: "Kötelező adatok hiányoznak!" }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await adminClient
    .from("hr_teljesitmeny")
    .insert([{
      dolgozo_id: dolgozoId,
      celkituzes: ertekelesSzovege, // ez lesz a cél neve
      ertekeles_szovege: null, // részletes értékelés később
      ertekelt_idoszak: idoszak,
      pontszam: pontszam, // százalék
      kpi_statusz: "aktiv", // alapértelmezett
      ertekeles_datuma: new Date().toISOString().split('T')[0],
      ertekeles_keszito_id: user.id
    }])

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

export async function updateKpiProgress(kpiId: string, percentage: number) {
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
    .update({ pontszam: percentage })
    .eq("id", kpiId)

  if (error) {
    console.error("Hiba KPI frissítésekor:", error)
    return { error: error.message }
  }

  revalidatePath("/hr/performance")
  revalidatePath("/hr/self-service")
  return { success: true }
}
