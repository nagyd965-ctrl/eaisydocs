"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"

export async function assignEmployeeToOrgUnit(orgUnitId: string, employeeId: string) {
  const auth = await requireHrAuthServer(["admin"], null)
  if (!auth.authorized || !auth.user) {
    return { error: "Nincs jogosultságod szervezeti egység módosításához." }
  }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ── HR deep-analysis 20261029 (2.3) P0-javítás (2026-11-01): Docs-mező védelme ──
  // Korábban az update a `szervezeti_egyseg_id`-t is felülírta — ez a DOCS-oldali
  // osztály, ami az iratláthatóságot (4-dim RLS) határozza meg! A HR-oldali
  // áthelyezés mostantól CSAK a hr_szervezeti_egyseg_id-t módosítja.
  const { data: updated, error } = await supabaseAdmin
    .from("felhasznalo_profil")
    .update({ hr_szervezeti_egyseg_id: orgUnitId })
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
  const auth = await requireHrAuthServer(["admin"], null)
  if (!auth.authorized || !auth.user) {
    return { error: "Nincs jogosultságod szervezeti egység módosításához." }
  }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ── P0-javítás: a Docs-oldali szervezeti_egyseg_id itt SEM írható felül ──
  const { error } = await supabaseAdmin
    .from("felhasznalo_profil")
    .update({ hr_szervezeti_egyseg_id: null })
    .eq("id", employeeId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/hr/orgunit/${orgUnitId}`)
  revalidatePath("/hr/organization")
  revalidatePath("/hr/admin")
  return { success: true }
}
