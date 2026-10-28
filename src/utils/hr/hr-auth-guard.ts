import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server"
import { isUserAuthorizedForHrView, type HrModuleKey } from "@/utils/hr/company-role-resolver"

export interface HrAuthContext {
  authorized: boolean
  user: any
  activeCompanyId: string
  companyScope: string
  hrRole: string
  hrModules: HrModuleKey[]
  docsRole: string
  isCompanyAdmin: boolean
}

/**
 * eaisyHR Központi Szerveroldali Jogosultság és Cégkontextus Kapu (HR Auth Guard)
 * 
 * Biztosítja a szigorú GDPR és béradat-védelmet:
 * 1. Ellenőrzi, hogy van-e aktív bejelentkezett felhasználó.
 * 2. Feloldja az aktív céget (Company Selector kontextus).
 * 3. Feloldja a felhasználó aktív cégre vonatkozó cég-specifikus (scoped) HR szerepkörét és modul-jogosultságait.
 * 4. Ha a felhasználó nem rendelkezik a megadott szerepkörrel / modul-hozzáféréssel, átirányítja.
 */
export async function requireHrAuthServer(
  allowedRolesOrModules: string[] = ["hr_munkatars", "hr_vezeto", "admin"],
  fallbackRedirect: string | null = "/hr/self-service/profile"
): Promise<HrAuthContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    if (fallbackRedirect) {
      redirect("/auth/login")
    }
    return {
      authorized: false,
      user: null,
      activeCompanyId: "",
      companyScope: "00000000-0000-0000-0000-000000000000",
      hrRole: "none",
      hrModules: [],
      docsRole: "none",
      isCompanyAdmin: false,
    }
  }

  const activeCompanyId = await getActiveCompanyIdServer()
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"

  const scopedRoles = await getActiveCompanyMemberRolesServer(activeCompanyId)

  const isAuthorized = isUserAuthorizedForHrView(
    scopedRoles.hrRole,
    allowedRolesOrModules,
    scopedRoles.hrModules
  )
  if (!isAuthorized && fallbackRedirect) {
    redirect(fallbackRedirect)
  }

  return {
    authorized: isAuthorized,
    user,
    activeCompanyId: activeCompanyId || "",
    companyScope,
    hrRole: scopedRoles.hrRole,
    hrModules: scopedRoles.hrModules,
    docsRole: scopedRoles.docsRole,
    isCompanyAdmin: scopedRoles.isCompanyAdmin,
  }
}
