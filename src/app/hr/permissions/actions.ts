"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"
import {
  ALL_HR_MODULES,
  HR_ROLE_LABELS,
  type HrCoreRole,
  type HrModuleKey,
} from "@/utils/hr/company-role-resolver"

export async function updateEmployeePermissionsAction(params: {
  employeeId: string
  hrRole: HrCoreRole
  hrModules: string[]
}) {
  const auth = await requireHrAuthServer(["admin"], null)
  if (!auth.authorized || !auth.user) {
    return { error: "Nincs jogosultságod a jogosultságok módosításához (kizárólag Admin)." }
  }

  const { employeeId, hrRole, hrModules } = params
  if (!employeeId) {
    return { error: "Hiányzó dolgozó azonosító." }
  }

  const validRoles: HrCoreRole[] = ["munkavallalo", "vezeto", "admin"]
  const normalizedRole: HrCoreRole = validRoles.includes(hrRole) ? hrRole : "munkavallalo"

  const validModuleSet = new Set<string>(ALL_HR_MODULES)
  const sanitizedModules: HrModuleKey[] =
    normalizedRole === "admin"
      ? [...ALL_HR_MODULES]
      : Array.from(new Set(hrModules.filter((m): m is HrModuleKey => validModuleSet.has(m))))

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Profil frissítése
  const { data: targetProfile, error: profileError } = await supabaseAdmin
    .from("felhasznalo_profil")
    .update({
      hr_szerepkor: normalizedRole,
      hr_modulok: sanitizedModules,
    })
    .eq("id", employeeId)
    .select("nev")
    .maybeSingle()

  if (profileError) {
    return { error: "Hiba a profil jogosultságainak mentésekor: " + profileError.message }
  }

  // 2. Aktív cégtagság szinkronizálása
  if (auth.activeCompanyId) {
    const { error: memberError } = await supabaseAdmin
      .from("company_members")
      .update({
        hr_szerepkor: normalizedRole,
        hr_modulok: sanitizedModules,
      })
      .eq("company_id", auth.activeCompanyId)
      .eq("user_id", employeeId)

    if (memberError) {
      return { error: "Hiba a cégtagsági jogosultságok mentésekor: " + memberError.message }
    }
  }

  // 3. Audit napló bejegyzés
  const empName = targetProfile?.nev || "Munkavállaló"
  const roleLabel = HR_ROLE_LABELS[normalizedRole] || normalizedRole
  const modulesDesc =
    normalizedRole === "admin"
      ? "Teljes hozzáférés (Admin)"
      : sanitizedModules.length > 0
      ? sanitizedModules.join(", ")
      : "Csak alapértelmezett portál"

  await supabaseAdmin.from("hr_esemeny_naplo").insert({
    felhasznalo_id: auth.user.id,
    company_id: auth.activeCompanyId || null,
    entitas_tipus: "felhasznalo_profil",
    entitas_id: employeeId,
    esemeny_tipus: "jogosultsag_modositas",
    megjegyzes: `${empName} HR jogosultságai frissítve: Szerepkör = ${roleLabel}, Modulok = [${modulesDesc}]`,
  })

  revalidatePath("/hr", "layout")
  revalidatePath("/hr/organization")
  revalidatePath("/hr/permissions")
  revalidatePath("/hr/admin")

  return {
    success: true,
    hrRole: normalizedRole,
    hrModules: sanitizedModules,
  }
}
