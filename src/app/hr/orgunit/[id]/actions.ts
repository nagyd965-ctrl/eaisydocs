"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"

export async function assignEmployeeToOrgUnit(orgUnitId: string, employeeId: string) {
  const auth = await requireHrAuthServer(["hr_munkatars", "hr_vezeto", "admin"], null)
  if (!auth.authorized || !auth.user) {
    return { error: "Nincs jogosultságod szervezeti egység módosításához." }
  }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: updated, error } = await supabaseAdmin
    .from("felhasznalo_profil")
    .update({ hr_szervezeti_egyseg_id: orgUnitId, szervezeti_egyseg_id: orgUnitId })
    .eq("id", employeeId)
    .select("id, hr_szervezeti_egyseg_id")

  if (error) {
    console.error("[assignEmployeeToOrgUnit] DB error:", error)
    return { error: error.message }
  }

  if (!updated || updated.length === 0) {
    return { error: "A megadott dolgozó nem található az adatbázisban." }
  }

  revalidatePath(`/hr/orgunit/${orgUnitId}`)
  revalidatePath("/hr/organization")
  revalidatePath("/hr/admin")
  return { success: true }
}

export async function removeEmployeeFromOrgUnit(orgUnitId: string, employeeId: string) {
  const auth = await requireHrAuthServer(["hr_munkatars", "hr_vezeto", "admin"], null)
  if (!auth.authorized || !auth.user) {
    return { error: "Nincs jogosultságod szervezeti egység módosításához." }
  }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin
    .from("felhasznalo_profil")
    .update({ hr_szervezeti_egyseg_id: null, szervezeti_egyseg_id: null })
    .eq("id", employeeId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/hr/orgunit/${orgUnitId}`)
  revalidatePath("/hr/organization")
  revalidatePath("/hr/admin")
  return { success: true }
}
