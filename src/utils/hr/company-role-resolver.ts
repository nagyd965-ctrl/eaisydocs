/**
 * eaisyHR & eaisyDocs – Többcég-kezelés és Céghez Kötött (Scoped) Szerepkör Resolver Motor
 * 
 * Biztosítja a szigorú GDPR és béradat-izolációt:
 * - A felhasználó jogosultsága az AKTÍV cégre vonatkozó tagságából (company_members) származik.
 * - Megakadályozza az adatszivárgást kettős szerepkör esetén (pl. Kiss Péter A cégben HR vezető, B cégben munkavállaló).
 * - Támogatja mind a dedikált belső HR-est, mind a holding / shared service központi HR-est.
 */

export interface CompanyMembershipRoleInput {
  companyId: string
  role?: string | null // 'owner', 'admin', 'member'
  docs_szerepkor?: string | null
  hr_szerepkor?: string | null
}

export interface UserProfileRoleInput {
  id: string
  docs_szerepkor?: string | null
  hr_szerepkor?: string | null
}

export interface ResolvedCompanyRoles {
  companyId: string | null
  isMember: boolean
  isCompanyAdmin: boolean
  docsRole: string
  hrRole: string
}

/**
 * Feloldja a felhasználó érvényes szerepköreit az aktív cég kontextusában.
 * 
 * Szabályok:
 * 1. Ha a felhasználó NEM tagja az adott cégnek, mindkét szerepköre 'none' (hozzáférés megtagadva).
 * 2. Ha van explicit `hr_szerepkor` a cégtagságban (`company_members`), AZ LESZ az érvényes szerepkör.
 * 3. Ha a cégtagságban nincs megadva explicit szerepkör, de a cégben 'admin' vagy 'owner', adminisztrátori jogot kap.
 * 4. Kompatibilitási fallback: ha nincs cég-specifikus felülbírálás, a globális profil szerepköre lép érvénybe.
 */
export function resolveUserCompanyRoles(
  membership: CompanyMembershipRoleInput | null | undefined,
  profile: UserProfileRoleInput | null | undefined
): ResolvedCompanyRoles {
  if (!membership) {
    return {
      companyId: null,
      isMember: false,
      isCompanyAdmin: false,
      docsRole: "none",
      hrRole: "none",
    }
  }

  const isCompanyAdmin = membership.role === "admin" || membership.role === "owner"

  // Docs szerepkör feloldása
  let docsRole: string
  if (membership.docs_szerepkor && membership.docs_szerepkor.trim() !== "") {
    docsRole = membership.docs_szerepkor
  } else if (isCompanyAdmin) {
    docsRole = "admin"
  } else if (profile?.docs_szerepkor && profile.docs_szerepkor.trim() !== "") {
    docsRole = profile.docs_szerepkor
  } else {
    docsRole = "ugyintezo"
  }

  // HR szerepkör feloldása
  let hrRole: string
  if (membership.hr_szerepkor && membership.hr_szerepkor.trim() !== "") {
    hrRole = membership.hr_szerepkor
  } else if (isCompanyAdmin) {
    hrRole = "admin"
  } else if (profile?.hr_szerepkor && profile.hr_szerepkor.trim() !== "") {
    hrRole = profile.hr_szerepkor
  } else {
    hrRole = "munkavallalo"
  }

  return {
    companyId: membership.companyId,
    isMember: true,
    isCompanyAdmin,
    docsRole,
    hrRole,
  }
}

/**
 * Ellenőrzi, hogy egy munkavállaló adataihoz / béréhez hozzáférhet-e az aktív cég kontextusa.
 * GDPR & Mt. védelmi kapu: megakadályozza, hogy A cég bérszámfejtője láthassa B cég dolgozóját.
 */
export function validateEmployeeCompanyAccess(
  employeeCompanyId: string | null | undefined,
  activeCompanyId: string | null | undefined
): boolean {
  if (!employeeCompanyId || !activeCompanyId) {
    return false
  }
  return employeeCompanyId === activeCompanyId
}

/**
 * Megvizsgálja, hogy az adott feloldott HR szerepkör jogosult-e a megtekinteni kívánt felületre.
 */
export function isUserAuthorizedForHrView(
  currentHrRole: string,
  allowedRoles: string[]
): boolean {
  if (currentHrRole === "none") {
    return false
  }
  if (currentHrRole === "admin" || currentHrRole === "rendszergazda") {
    return true
  }
  return allowedRoles.includes(currentHrRole)
}
