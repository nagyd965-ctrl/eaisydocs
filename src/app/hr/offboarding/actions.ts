"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function toggleOffboardingTaskStatus(taskId: string, currentStatus: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const newStatus = currentStatus === 'pending' ? 'done' : 'pending'

  const { data: taskData } = await supabase
    .from("hr_offboarding_feladat")
    .select(`cim, offboarding_id, hr_offboarding(dolgozo_id)`)
    .eq("id", taskId)
    .single()

  const { error } = await supabase
    .from("hr_offboarding_feladat")
    .update({ statusz: newStatus })
    .eq("id", taskId)

  if (error) {
    console.error("Hiba feladat módosításakor:", error)
    return { error: error.message }
  }

  if (taskData) {
    const statusText = newStatus === 'done' ? 'Elvégezve' : 'Folyamatban'
    await supabase.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      esemeny_tipus: "adat_megtekintes", 
      entitas_tipus: "hr_offboarding_feladat",
      entitas_id: taskId,
      megjegyzes: `Offboarding feladat (${taskData.cim}) státusza átállítva: ${statusText}`
    })
  }

  revalidatePath("/hr/offboarding")
  return { success: true }
}

export async function updateOffboardingDate(offboardingId: string, newDate: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("hr_offboarding")
    .update({ kilepes_datuma: newDate })
    .eq("id", offboardingId)

  if (error) {
    console.error("Hiba a dátum mentésekor:", error)
    return { error: error.message }
  }

  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_felvetel", 
    entitas_tipus: "hr_offboarding",
    entitas_id: offboardingId,
    megjegyzes: `Kilépési dátum frissítve erre: ${newDate}`
  })

  revalidatePath("/hr/offboarding")
  return { success: true }
}

export async function addOffboardingTask(offboardingId: string, cim: string, felelos_reszleg: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("hr_offboarding_feladat")
    .insert([{
      offboarding_id: offboardingId,
      cim,
      felelos_reszleg,
      statusz: 'pending'
    }])

  if (error) {
    console.error("Hiba a feladat hozzáadásakor:", error)
    return { error: error.message }
  }

  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_felvetel", 
    entitas_tipus: "hr_offboarding",
    entitas_id: offboardingId,
    megjegyzes: `Új offboarding feladat rögzítve: ${cim} (${felelos_reszleg})`
  })

  revalidatePath("/hr/offboarding")
  return { success: true }
}

export async function deleteOffboardingTask(taskId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("hr_offboarding_feladat")
    .delete()
    .eq("id", taskId)

  if (error) {
    console.error("Hiba a feladat törlésekor:", error)
    return { error: error.message }
  }

  revalidatePath("/hr/offboarding")
  return { success: true }
}

export async function createOffboarding(dolgozoId: string, kilepesDatuma: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  // Check if offboarding already exists
  const { data: existing } = await supabase
    .from("hr_offboarding")
    .select("id")
    .eq("dolgozo_id", dolgozoId)
    .single()

  if (existing) {
    return { error: "Ennek a dolgozónak már van aktív kiléptetési folyamata." }
  }

  const { data: newOffboarding, error: createError } = await supabase
    .from("hr_offboarding")
    .insert([{
      dolgozo_id: dolgozoId,
      kilepes_datuma: kilepesDatuma,
      statusz: 'folyamatban'
    }])
    .select()
    .single()

  if (createError) {
    return { error: createError.message }
  }

  // Create default tasks
  const defaultTasks = [
    { offboarding_id: newOffboarding.id, cim: "Céges laptop, mobiltelefon leadása", felelos_reszleg: "IT" },
    { offboarding_id: newOffboarding.id, cim: "Belépőkártya és kulcsok leadása", felelos_reszleg: "Üzemeltetés" },
    { offboarding_id: newOffboarding.id, cim: "E-mail fiók és hozzáférések lezárása", felelos_reszleg: "IT" },
    { offboarding_id: newOffboarding.id, cim: "T1041 NAV kijelentés", felelos_reszleg: "Bérszámfejtés" },
    { offboarding_id: newOffboarding.id, cim: "Kilépő papírok aláíratása", felelos_reszleg: "HR" }
  ]

  await supabase.from("hr_offboarding_feladat").insert(defaultTasks)

  revalidatePath("/hr/offboarding")
  return { success: true }
}

export async function closeOffboarding(offboardingId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("hr_offboarding")
    .update({ statusz: 'lezart' })
    .eq("id", offboardingId)

  if (error) {
    console.error("Hiba a kiléptetés lezárásakor:", error)
    return { error: error.message }
  }

  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_felvetel", 
    entitas_tipus: "hr_offboarding",
    entitas_id: offboardingId,
    megjegyzes: `Kiléptetés hivatalosan lezárva`
  })

  revalidatePath("/hr/offboarding")
  return { success: true }
}

export async function deleteOffboardingProcess(offboardingId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("hr_offboarding")
    .delete()
    .eq("id", offboardingId)

  if (error) {
    console.error("Hiba a kiléptetés törlésekor:", error)
    return { error: error.message }
  }

  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "adat_torles", 
    entitas_tipus: "hr_offboarding",
    entitas_id: offboardingId,
    megjegyzes: `Kiléptetési folyamat véglegesen törölve`
  })

  revalidatePath("/hr/offboarding")
  return { success: true }
}

// ---------------------------------------------------------------------------
// Kilépési Interjú
// ---------------------------------------------------------------------------

export async function getExitInterview(offboardingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data, error } = await supabase
    .from("hr_kilepes_interju")
    .select("*")
    .eq("offboarding_id", offboardingId)
    .maybeSingle()

  if (error) {
    console.error("Hiba az exit interjú lekérésekor:", error)
    return { error: error.message }
  }

  return { data }
}

export async function saveExitInterview(offboardingId: string, formData: {
  kilepes_kategoria: string
  kilepes_oka: string
  altalanos_elegedettseg: number | null
  vezeto_kapcsolat: number | null
  munkakornyezet_ertekeles: number | null
  csapat_ertekeles: number | null
  mi_tetszett: string
  mit_valtoztatna: string
  ajanlana: boolean | null
  kovetkezo_allomashely: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("hr_kilepes_interju")
    .upsert({
      offboarding_id: offboardingId,
      ...formData,
      rogzito_id: user.id,
    }, { onConflict: "offboarding_id" })

  if (error) {
    console.error("Hiba az exit interjú mentésekor:", error)
    return { error: error.message }
  }

  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_modositas",
    entitas_tipus: "hr_kilepes_interju",
    entitas_id: offboardingId,
    megjegyzes: `Kilépési interjú rögzítve / frissítve az offboarding folyamathoz`
  })

  revalidatePath("/hr/offboarding")
  return { success: true }
}
