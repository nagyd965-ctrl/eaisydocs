"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function assignEmployeeToJob(jobId: string, employeeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve" }

  // 1. Get active jogviszony
  const { data: jogviszony } = await supabase
    .from("hr_jogviszony")
    .select("id")
    .eq("dolgozo_id", employeeId)
    .is("kilepes_datuma", null)
    .order("belepes_datuma", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!jogviszony) {
    return { error: "A dolgozónak nincs aktív jogviszonya!" }
  }

  // 2. Get active beosztas
  const { data: beosztas } = await supabase
    .from("hr_beosztas")
    .select("id")
    .eq("jogviszony_id", jogviszony.id)
    .is("ervenyes_ig", null)
    .order("ervenyes_tol", { ascending: false })
    .limit(1)
    .maybeSingle()

  let error;
  if (beosztas) {
    // Update existing
    const res = await supabase.from("hr_beosztas").update({ munkakor_id: jobId }).eq("id", beosztas.id)
    error = res.error
  } else {
    // Insert new
    const res = await supabase.from("hr_beosztas").insert({ 
      jogviszony_id: jogviszony.id, 
      munkakor_id: jobId, 
      ervenyes_tol: new Date().toISOString().split('T')[0] 
    })
    error = res.error
  }

  if (error) {
    return { error: "Hiba a dolgozó hozzárendelésekor: " + error.message }
  }

  revalidatePath(`/hr/job/${jobId}`)
  revalidatePath("/hr/organization")
  revalidatePath("/hr/admin")
  return { success: true }
}

export async function removeEmployeeFromJob(jobId: string, employeeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve" }

  // 1. Get active jogviszony
  const { data: jogviszony } = await supabase
    .from("hr_jogviszony")
    .select("id")
    .eq("dolgozo_id", employeeId)
    .is("kilepes_datuma", null)
    .order("belepes_datuma", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!jogviszony) return { success: true }

  // Close the active beosztas for this job
  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from("hr_beosztas")
    .update({ ervenyes_ig: today })
    .eq("jogviszony_id", jogviszony.id)
    .eq("munkakor_id", jobId)
    .is("ervenyes_ig", null)

  if (error) {
    return { error: "Hiba a dolgozó eltávolításakor: " + error.message }
  }

  revalidatePath(`/hr/job/${jobId}`)
  revalidatePath("/hr/organization")
  revalidatePath("/hr/admin")
  return { success: true }
}

export async function addJobTaskAction(jobId: string, task: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const trimmed = task.trim()
  if (!trimmed) return { error: "A feladat nem lehet üres!" }

  const { data: job, error: fetchErr } = await supabase
    .from("hr_munkakor")
    .select("feladatok_es_hataskorok")
    .eq("id", jobId)
    .single()

  if (fetchErr || !job) return { error: "Munkakör nem található" }

  let currentTasks: string[] = []
  if (Array.isArray(job.feladatok_es_hataskorok)) {
    currentTasks = [...job.feladatok_es_hataskorok]
  } else if (typeof job.feladatok_es_hataskorok === "string") {
    try {
      const parsed = JSON.parse(job.feladatok_es_hataskorok)
      if (Array.isArray(parsed)) currentTasks = parsed
    } catch {
      currentTasks = job.feladatok_es_hataskorok.split("\n").map((s: string) => s.trim()).filter(Boolean)
    }
  }

  currentTasks.push(trimmed)

  const { error: updateErr } = await supabase
    .from("hr_munkakor")
    .update({ feladatok_es_hataskorok: currentTasks })
    .eq("id", jobId)

  if (updateErr) return { error: updateErr.message }

  revalidatePath(`/hr/job/${jobId}`)
  return { success: true }
}

export async function removeJobTaskAction(jobId: string, taskIndex: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: job, error: fetchErr } = await supabase
    .from("hr_munkakor")
    .select("feladatok_es_hataskorok")
    .eq("id", jobId)
    .single()

  if (fetchErr || !job) return { error: "Munkakör nem található" }

  let currentTasks: string[] = []
  if (Array.isArray(job.feladatok_es_hataskorok)) {
    currentTasks = [...job.feladatok_es_hataskorok]
  }

  const updatedTasks = currentTasks.filter((_, idx) => idx !== taskIndex)

  const { error: updateErr } = await supabase
    .from("hr_munkakor")
    .update({ feladatok_es_hataskorok: updatedTasks })
    .eq("id", jobId)

  if (updateErr) return { error: updateErr.message }

  revalidatePath(`/hr/job/${jobId}`)
  return { success: true }
}

export async function addJobCompetencyAction(jobId: string, competency: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const trimmed = competency.trim()
  if (!trimmed) return { error: "A kompetencia nem lehet üres!" }

  const { data: job, error: fetchErr } = await supabase
    .from("hr_munkakor")
    .select("elvart_kompetenciak")
    .eq("id", jobId)
    .single()

  if (fetchErr || !job) return { error: "Munkakör nem található" }

  let currentComp: string[] = []
  if (Array.isArray(job.elvart_kompetenciak)) {
    currentComp = [...job.elvart_kompetenciak]
  } else if (typeof job.elvart_kompetenciak === "string") {
    try {
      const parsed = JSON.parse(job.elvart_kompetenciak)
      if (Array.isArray(parsed)) currentComp = parsed
    } catch {
      currentComp = job.elvart_kompetenciak.split("\n").map((s: string) => s.trim()).filter(Boolean)
    }
  }

  if (!currentComp.includes(trimmed)) {
    currentComp.push(trimmed)
  }

  const { error: updateErr } = await supabase
    .from("hr_munkakor")
    .update({ elvart_kompetenciak: currentComp })
    .eq("id", jobId)

  if (updateErr) return { error: updateErr.message }

  revalidatePath(`/hr/job/${jobId}`)
  return { success: true }
}

export async function removeJobCompetencyAction(jobId: string, compIndex: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: job, error: fetchErr } = await supabase
    .from("hr_munkakor")
    .select("elvart_kompetenciak")
    .eq("id", jobId)
    .single()

  if (fetchErr || !job) return { error: "Munkakör nem található" }

  let currentComp: string[] = []
  if (Array.isArray(job.elvart_kompetenciak)) {
    currentComp = [...job.elvart_kompetenciak]
  }

  const updatedComp = currentComp.filter((_, idx) => idx !== compIndex)

  const { error: updateErr } = await supabase
    .from("hr_munkakor")
    .update({ elvart_kompetenciak: updatedComp })
    .eq("id", jobId)

  if (updateErr) return { error: updateErr.message }

  revalidatePath(`/hr/job/${jobId}`)
  return { success: true }
}

