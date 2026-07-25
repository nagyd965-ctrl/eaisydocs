"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function assignEmployeeToJob(jobId: string, employeeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("hr_dolgozo_adatlap")
    .update({ munkakor_id: jobId })
    .eq("id", employeeId)

  if (error) {
    return { error: "Hiba a dolgozó hozzárendelésekor: " + error.message }
  }

  revalidatePath(`/hr/job/${jobId}`)
  revalidatePath("/hr/settings")
  return { success: true }
}

export async function removeEmployeeFromJob(jobId: string, employeeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("hr_dolgozo_adatlap")
    .update({ munkakor_id: null })
    .eq("id", employeeId)

  if (error) {
    return { error: "Hiba a dolgozó eltávolításakor: " + error.message }
  }

  revalidatePath(`/hr/job/${jobId}`)
  revalidatePath("/hr/settings")
  return { success: true }
}
