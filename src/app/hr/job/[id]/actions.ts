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
  revalidatePath("/hr/settings")
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
  revalidatePath("/hr/settings")
  return { success: true }
}
