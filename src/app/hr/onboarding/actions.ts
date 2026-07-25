"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function toggleTaskStatus(taskId: string, currentStatus: string) {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const newStatus = currentStatus === 'pending' ? 'done' : 'pending'

  // Feladat lekérése audit infóhoz
  const { data: taskData } = await supabase
    .from("hr_onboarding_feladat")
    .select(`cim, onboarding_id, hr_onboarding(nev)`)
    .eq("id", taskId)
    .single()

  const { error } = await supabase
    .from("hr_onboarding_feladat")
    .update({ statusz: newStatus })
    .eq("id", taskId)

  if (error) {
    console.error("Hiba feladat módosításakor:", error)
    return { error: error.message }
  }

  // Audit napló írása
  if (taskData) {
    const statusText = newStatus === 'done' ? 'Elvégezve' : 'Folyamatban'
    await supabase.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      esemeny_tipus: "adat_megtekintes", 
      entitas_tipus: "hr_onboarding_feladat",
      entitas_id: taskId,
      megjegyzes: `Onboarding feladat (${taskData.cim}) státusza átállítva: ${statusText} - ${taskData.hr_onboarding?.nev} profilján`
    })
  }

  revalidatePath("/hr/onboarding")
  return { success: true }
}

export async function updateOnboardingDate(onboardingId: string, newDate: string) {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("hr_onboarding")
    .update({ belepes_datuma: newDate })
    .eq("id", onboardingId)

  if (error) {
    console.error("Hiba a dátum mentésekor:", error)
    return { error: error.message }
  }

  // Logolás
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_felvetel", 
    entitas_tipus: "hr_onboarding",
    entitas_id: onboardingId,
    megjegyzes: `Belépési dátum frissítve erre: ${newDate}`
  })

  revalidatePath("/hr/onboarding")
  return { success: true }
}

export async function addOnboardingTask(onboardingId: string, cim: string, felelos_reszleg: string) {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("hr_onboarding_feladat")
    .insert([{
      onboarding_id: onboardingId,
      cim,
      felelos_reszleg,
      statusz: 'pending'
    }])

  if (error) {
    console.error("Hiba a feladat hozzáadásakor:", error)
    return { error: error.message }
  }

  // Logolás
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "adat_modositas", 
    entitas_tipus: "hr_onboarding",
    entitas_id: onboardingId,
    megjegyzes: `Új feladat hozzáadva: ${cim} (${felelos_reszleg})`
  })

  revalidatePath("/hr/onboarding")
  return { success: true }
}

export async function deleteOnboardingTask(taskId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  // Get task info for log before delete
  const { data: taskData } = await supabase
    .from("hr_onboarding_feladat")
    .select(`cim, onboarding_id`)
    .eq("id", taskId)
    .single()

  const { error } = await supabase
    .from("hr_onboarding_feladat")
    .delete()
    .eq("id", taskId)

  if (error) {
    console.error("Hiba a feladat törlésekor:", error)
    return { error: error.message }
  }

  // Logolás
  if (taskData) {
    await supabase.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      esemeny_tipus: "adat_torles", 
      entitas_tipus: "hr_onboarding",
      entitas_id: taskData.onboarding_id,
      megjegyzes: `Feladat törölve: ${taskData.cim}`
    })
  }

  revalidatePath("/hr/onboarding")
  return { success: true }
}
