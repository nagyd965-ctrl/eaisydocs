import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server"
import {
  hasHrWriteAccess,
  isUserAuthorizedForHrView,
  type HrModuleKey,
} from "@/utils/hr/company-role-resolver"

export interface HrAuthContext {
  authorized: boolean
  user: any
  activeCompanyId: string
  companyScope: string
  hrRole: string
  hrModules: HrModuleKey[]
  hrWriteModules: HrModuleKey[]
  docsRole: string
  isCompanyAdmin: boolean
}

/**
 * Segédfüggvény annak ellenőrzésére, hogy a már feloldott `HrAuthContext`
 * rendelkezik-e írási (`hr_iras_modulok`) jogosultsággal a megadott HR modul(ok)hoz.
 */
export function checkHrWriteAccess(
  auth: Pick<HrAuthContext, "isCompanyAdmin" | "hrRole" | "hrModules" | "hrWriteModules">,
  moduleKey: HrModuleKey | string | (HrModuleKey | string)[]
): boolean {
  if (auth.hrRole === "admin" || auth.hrRole === "rendszergazda") {
    return true
  }
  return hasHrWriteAccess(auth.hrRole, auth.hrModules, auth.hrWriteModules, moduleKey)
}

/**
 * Ellenőrzi, hogy a felhasználó tisztán „Csak olvasás” (Auditor / Betekintő) módban van-e
 * az aktív cégben (azaz van legalább 1 olvasási modulja, de 0 írási modulja).
 */
export function isStrictHrReadOnlyUser(
  auth: Pick<HrAuthContext, "isCompanyAdmin" | "hrRole" | "hrModules" | "hrWriteModules">
): boolean {
  if (auth.hrRole === "admin" || auth.hrRole === "rendszergazda") {
    return false
  }
  if (auth.hrRole === "auditor") return true
  return (auth.hrModules?.length || 0) > 0 && (auth.hrWriteModules?.length || 0) === 0
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
      hrWriteModules: [],
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

  const isHrAdmin = scopedRoles.hrRole === "admin" || scopedRoles.hrRole === "rendszergazda"

  return {
    authorized: isAuthorized,
    user,
    activeCompanyId: activeCompanyId || "",
    companyScope,
    hrRole: scopedRoles.hrRole,
    hrModules: scopedRoles.hrModules,
    hrWriteModules: scopedRoles.hrWriteModules,
    docsRole: scopedRoles.docsRole,
    isCompanyAdmin: isHrAdmin,
  }
}

/**
 * eaisyHR Szerveroldali Írási Jogosultság Kapu (HR Write Auth Guard)
 *
 * Ellenőrzi, hogy a bejelentkezett felhasználónak van-e ÍRÁSI (`hr_iras_modulok`)
 * jogosultsága a megadott HR modul(ok) legalább egyikéhez.
 * Ha nincs (pl. „Csak olvasás” / Auditor mód), az `authorized` mezőt `false`-ra állítja
 * (vagy átirányít, ha `fallbackRedirect` meg van adva).
 */
export async function requireHrWriteServer(
  allowedWriteModules: HrModuleKey | HrModuleKey[],
  fallbackRedirect: string | null = null
): Promise<HrAuthContext> {
  const modulesList = Array.isArray(allowedWriteModules)
    ? allowedWriteModules
    : [allowedWriteModules]

  const auth = await requireHrAuthServer(modulesList, fallbackRedirect)
  const canWrite =
    auth.authorized &&
    Boolean(auth.user) &&
    checkHrWriteAccess(auth, modulesList)

  if (!canWrite && fallbackRedirect) {
    redirect(fallbackRedirect)
  }

  return {
    ...auth,
    authorized: canWrite,
  }
}

