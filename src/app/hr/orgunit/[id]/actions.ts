"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

export async function assignEmployeeToOrgUnit(orgUnitId: string, employeeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin
    .from("felhasznalo_profil")
    .update({ hr_szervezeti_egyseg_id: orgUnitId })
    .eq("id", employeeId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/hr/orgunit/${orgUnitId}`)
  revalidatePath("/hr/settings")
  return { success: true }
}

export async function removeEmployeeFromOrgUnit(orgUnitId: string, employeeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin
    .from("felhasznalo_profil")
    .update({ hr_szervezeti_egyseg_id: null })
    .eq("id", employeeId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/hr/orgunit/${orgUnitId}`)
  revalidatePath("/hr/settings")
  return { success: true }
}
