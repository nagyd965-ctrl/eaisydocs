"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { requireHrAuthServer, checkHrWriteAccess } from "@/utils/hr/hr-auth-guard"
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
  hrWriteModules?: string[]
}) {
  const auth = await requireHrAuthServer(["admin"], null)
  if (!auth.authorized || !auth.user || !(auth.isCompanyAdmin || auth.hrRole === "admin" || checkHrWriteAccess(auth, "admin"))) {
    return { error: "Nincs jogosultságod a jogosultságok módosításához (kizárólag Admin írási joggal)." }
  }

  const { employeeId, hrRole, hrModules, hrWriteModules } = params
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

  const sanitizedWriteModules: HrModuleKey[] =
    normalizedRole === "admin"
      ? [...ALL_HR_MODULES]
      : hrWriteModules !== undefined
      ? Array.from(
          new Set(
            hrWriteModules.filter(
              (m): m is HrModuleKey => validModuleSet.has(m) && sanitizedModules.includes(m as HrModuleKey)
            )
          )
        )
      : [...sanitizedModules]

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 0. Ellenőrizzük, hogy a cél-dolgozó az aktív céghez tartozik-e
  if (auth.activeCompanyId) {
    const [{ data: memberRow }, { data: adatlapRow }] = await Promise.all([
      supabaseAdmin
        .from("company_members")
        .select("id")
        .eq("company_id", auth.activeCompanyId)
        .eq("user_id", employeeId)
        .maybeSingle(),
      supabaseAdmin
        .from("hr_dolgozo_adatlap")
        .select("company_id")
        .eq("id", employeeId)
        .maybeSingle(),
    ])
    const belongsToActiveCompany =
      Boolean(memberRow) || (adatlapRow?.company_id === auth.activeCompanyId)
    if (!belongsToActiveCompany) {
      return { error: "A kiválasztott dolgozó nem tartozik az aktív céghez." }
    }
  }

  // 1. Aktív cégtagság szinkronizálása
  if (auth.activeCompanyId) {
    const { error: memberError } = await supabaseAdmin
      .from("company_members")
      .update({
        hr_szerepkor: normalizedRole,
        hr_modulok: sanitizedModules,
        hr_iras_modulok: sanitizedWriteModules,
      })
      .eq("company_id", auth.activeCompanyId)
      .eq("user_id", employeeId)

    if (memberError) {
      return { error: "Hiba a cégtagsági jogosultságok mentésekor: " + memberError.message }
    }
  }

  // 2. Globális profil frissítése kizárólag akkor, ha a felhasználó legfeljebb 1 cégnek tagja
  const { count: membershipCount } = await supabaseAdmin
    .from("company_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", employeeId)

  let targetProfile: { nev?: string } | null = null
  if ((membershipCount || 0) <= 1) {
    const { data: updatedProfile, error: profileError } = await supabaseAdmin
      .from("felhasznalo_profil")
      .update({
        hr_szerepkor: normalizedRole,
        hr_modulok: sanitizedModules,
        hr_iras_modulok: sanitizedWriteModules,
      })
      .eq("id", employeeId)
      .select("nev")
      .maybeSingle()

    if (profileError) {
      return { error: "Hiba a profil jogosultságainak mentésekor: " + profileError.message }
    }
    targetProfile = updatedProfile
  } else {
    const { data: existingProfile } = await supabaseAdmin
      .from("felhasznalo_profil")
      .select("nev")
      .eq("id", employeeId)
      .maybeSingle()
    targetProfile = existingProfile
  }

  // 3. Audit napló bejegyzés
  const empName = targetProfile?.nev || "Munkavállaló"
  const roleLabel = HR_ROLE_LABELS[normalizedRole] || normalizedRole
  const modulesDesc =
    normalizedRole === "admin"
      ? "Teljes hozzáférés (Admin)"
      : sanitizedModules.length > 0
      ? sanitizedModules
          .map((m) => `${m} (${sanitizedWriteModules.includes(m) ? "Írás" : "Olvasás"})`)
          .join(", ")
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
    hrWriteModules: sanitizedWriteModules,
  }
}
