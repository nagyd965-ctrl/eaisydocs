/**
 * eaisyHR & eaisyDocs – Többcég-kezelés, 3-Szintű Alapszerepkör és Modul-hozzáférési Motor
 *
 * Alapszerepkörök (hr_szerepkor):
 *  - 'munkavallalo' : Dolgozói Portál (saját adatok, jelenlét, bérjegyzék, célok)
 *  - 'vezeto'       : Dolgozói Portál + Vezetői nézet (saját beosztottak / csapat)
 *  - 'admin'        : Teljes hozzáférés minden HR modulhoz + Jogosultságkezelő Mátrix
 *
 * Egyedileg kapcsolható HR modulok (hr_modulok text[]):
 *  - 'admin'        : Állomány áttekintés & 360° Karton (/hr/admin, /hr/employee/[id])
 *  - 'organization' : Szervezeti Felépítés (/hr/organization)
 *  - 'time'         : Műszakbeosztás (/hr/time)
 *  - 'payroll'      : Bérszámfejtés (/hr/payroll)
 *  - 'compliance'   : Munkaügyi Megfelelőség (/hr/compliance)
 *  - 'reports'      : Riportok (/hr/reports)
 *  - 'recruitment'  : Toborzás (/hr/recruitment)
 *  - 'onboarding'   : Onboarding (/hr/onboarding)
 *  - 'offboarding'  : Offboarding (/hr/offboarding)
 *  - 'audit'        : Eseménynapló (/hr/audit)
 */

export const ALL_HR_MODULES = [
  "admin",
  "organization",
  "time",
  "payroll",
  "compliance",
  "reports",
  "recruitment",
  "onboarding",
  "offboarding",
  "audit",
] as const

export type HrModuleKey = (typeof ALL_HR_MODULES)[number]

export interface HrModuleDefinition {
  key: HrModuleKey
  label: string
  shortLabel: string
  group: "HR Munkaasztal" | "Dolgozói Életút" | "Rendszer"
  url: string
  description: string
}

export const HR_MODULE_DEFINITIONS: HrModuleDefinition[] = [
  {
    key: "admin",
    label: "Állomány áttekintés",
    shortLabel: "Állomány",
    group: "HR Munkaasztal",
    url: "/hr/admin",
    description: "Dolgozói törzsállomány és 360°-os kartonok kezelése",
  },
  {
    key: "organization",
    label: "Szervezeti Felépítés",
    shortLabel: "Szervezet",
    group: "HR Munkaasztal",
    url: "/hr/organization",
    description: "Szervezeti egységek, munkakörök és organigram",
  },
  {
    key: "time",
    label: "Műszakbeosztás",
    shortLabel: "Műszak",
    group: "HR Munkaasztal",
    url: "/hr/time",
    description: "Csapatnaptár, műszaktervező és munkaszüneti napok",
  },
  {
    key: "payroll",
    label: "Bérszámfejtés",
    shortLabel: "Bérszámfejtés",
    group: "HR Munkaasztal",
    url: "/hr/payroll",
    description: "Havi bérjegyzékek, alapbérek és juttatások számfejtése",
  },
  {
    key: "compliance",
    label: "Munkaügyi Megfelelőség",
    shortLabel: "Megfelelőség",
    group: "HR Munkaasztal",
    url: "/hr/compliance",
    description: "Szabadság, orvosi alkalmasság, munkavédelem és túlóra kontroll",
  },
  {
    key: "reports",
    label: "Riportok",
    shortLabel: "Riportok",
    group: "HR Munkaasztal",
    url: "/hr/reports",
    description: "NAV T1041, KSH jelentés, fluktuáció és havi archívum",
  },
  {
    key: "recruitment",
    label: "Toborzás",
    shortLabel: "Toborzás",
    group: "Dolgozói Életút",
    url: "/hr/recruitment",
    description: "Álláshirdetések, pályázók (ATS Kanban) és toborzási analitika",
  },
  {
    key: "onboarding",
    label: "Onboarding",
    shortLabel: "Onboarding",
    group: "Dolgozói Életút",
    url: "/hr/onboarding",
    description: "Új belépők feladatsorai, szerződés- és T1041 generálás",
  },
  {
    key: "offboarding",
    label: "Offboarding",
    shortLabel: "Offboarding",
    group: "Dolgozói Életút",
    url: "/hr/offboarding",
    description: "Kiléptetési folyamat, eszközleadás és kilépő igazolások",
  },
  {
    key: "audit",
    label: "Eseménynapló",
    shortLabel: "Eseménynapló",
    group: "Rendszer",
    url: "/hr/audit",
    description: "Személyügyi műveletek és GDPR betekintések audit naplója",
  },
]

export const HR_CORE_ROLES = [
  { value: "munkavallalo", label: "Munkavállaló" },
  { value: "vezeto", label: "Vezető" },
  { value: "admin", label: "Admin" },
] as const

export type HrCoreRole = (typeof HR_CORE_ROLES)[number]["value"]

export const HR_ROLE_LABELS: Record<string, string> = {
  munkavallalo: "Munkavállaló",
  vezeto: "Vezető",
  admin: "Admin",
  // Visszafelé kompatibilis címkék esetleges régi adatokhoz:
  hr_munkatars: "Munkavállaló",
  hr_vezeto: "Vezető",
  berugyi: "Munkavállaló",
  toborzo: "Munkavállaló",
  munkavedelmi: "Munkavállaló",
  rendszergazda: "Admin",
  auditor: "Munkavállaló",
}

export interface CompanyMembershipRoleInput {
  companyId: string
  role?: string | null // 'owner', 'admin', 'member'
  docs_szerepkor?: string | null
  hr_szerepkor?: string | null
  hr_modulok?: string[] | null
}

export interface UserProfileRoleInput {
  id: string
  docs_szerepkor?: string | null
  hr_szerepkor?: string | null
  hr_modulok?: string[] | null
}

export interface ResolvedCompanyRoles {
  companyId: string | null
  isMember: boolean
  isCompanyAdmin: boolean
  docsRole: string
  hrRole: string
  hrModules: HrModuleKey[]
}

/**
 * Normalizálja a régi szerepkör-értékeket a 3 kanonikus alapszerepkörre,
 * és szükség esetén visszaadja a belőlük következő alapértelmezett modulokat.
 */
export function normalizeHrRoleAndModules(
  rawRole: string | null | undefined,
  rawModules?: string[] | null
): { role: HrCoreRole; modules: HrModuleKey[] } {
  const validModuleSet = new Set<string>(ALL_HR_MODULES)
  const explicitModules = (rawModules || []).filter((m): m is HrModuleKey => validModuleSet.has(m))

  const r = (rawRole || "munkavallalo").trim().toLowerCase()

  if (r === "admin" || r === "rendszergazda") {
    return { role: "admin", modules: [...ALL_HR_MODULES] }
  }

  if (r === "hr_vezeto") {
    return {
      role: "vezeto",
      modules: explicitModules.length > 0 ? explicitModules : [...ALL_HR_MODULES],
    }
  }

  if (r === "hr_munkatars" || r === "auditor") {
    return {
      role: "munkavallalo",
      modules: explicitModules.length > 0 ? explicitModules : [...ALL_HR_MODULES],
    }
  }

  if (r === "berugyi") {
    return {
      role: "munkavallalo",
      modules: explicitModules.length > 0 ? explicitModules : ["admin", "organization", "time", "payroll", "reports"],
    }
  }

  if (r === "munkavedelmi") {
    return {
      role: "munkavallalo",
      modules: explicitModules.length > 0 ? explicitModules : ["admin", "compliance"],
    }
  }

  if (r === "toborzo") {
    return {
      role: "munkavallalo",
      modules: explicitModules.length > 0 ? explicitModules : ["recruitment", "onboarding"],
    }
  }

  if (r === "vezeto") {
    return { role: "vezeto", modules: explicitModules }
  }

  return { role: "munkavallalo", modules: explicitModules }
}

/**
 * Feloldja a felhasználó érvényes szerepköreit és modul-jogosultságait az aktív cég kontextusában.
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
      hrModules: [],
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

  // HR szerepkör és modulok feloldása
  const rawHrRole =
    membership.hr_szerepkor && membership.hr_szerepkor.trim() !== ""
      ? membership.hr_szerepkor
      : isCompanyAdmin
      ? "admin"
      : profile?.hr_szerepkor && profile.hr_szerepkor.trim() !== ""
      ? profile.hr_szerepkor
      : "munkavallalo"

  const rawHrModules =
    membership.hr_modulok && membership.hr_modulok.length > 0
      ? membership.hr_modulok
      : profile?.hr_modulok || []

  const normalized = normalizeHrRoleAndModules(rawHrRole, rawHrModules)

  return {
    companyId: membership.companyId,
    isMember: true,
    isCompanyAdmin: isCompanyAdmin || normalized.role === "admin",
    docsRole,
    hrRole: normalized.role,
    hrModules: normalized.modules,
  }
}

/**
 * Ellenőrzi, hogy egy munkavállaló adataihoz / béréhez hozzáférhet-e az aktív cég kontextusa.
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
 * Megvizsgálja, hogy a felhasználó rendelkezik-e az adott HR modulhoz való hozzáféréssel.
 */
export function hasHrModuleAccess(
  currentHrRole: string,
  hrModules: string[] | undefined,
  moduleKey: HrModuleKey
): boolean {
  if (currentHrRole === "none") return false
  if (currentHrRole === "admin" || currentHrRole === "rendszergazda") return true
  return (hrModules || []).includes(moduleKey)
}

/**
 * Megvizsgálja, hogy az adott feloldott HR szerepkör és modul-lista jogosult-e a megtekinteni kívánt felületre.
 * Támogatja mind az új modul-kulcsokat ('payroll', 'recruitment', stb.), mind a korábbi szerepkör-listákat.
 */
export function isUserAuthorizedForHrView(
  currentHrRole: string,
  allowedRolesOrModules: string[],
  hrModules: string[] = []
): boolean {
  if (currentHrRole === "none") {
    return false
  }
  if (currentHrRole === "admin" || currentHrRole === "rendszergazda") {
    return true
  }

  // 1. Közvetlen szerepkör egyezés (pl. 'vezeto', 'munkavallalo')
  if (allowedRolesOrModules.includes(currentHrRole)) {
    return true
  }

  // 2. Közvetlen modul-kulcs egyezés (pl. 'payroll', 'recruitment', 'admin', 'compliance')
  const moduleSet = new Set(hrModules)
  for (const item of allowedRolesOrModules) {
    if (moduleSet.has(item)) {
      return true
    }
  }

  // 3. Kompatibilitási leképezés a meglévő Server Action / Page hívásokhoz:
  if (allowedRolesOrModules.includes("toborzo") && moduleSet.has("recruitment")) {
    return true
  }
  if (
    allowedRolesOrModules.includes("berugyi") &&
    (moduleSet.has("payroll") || moduleSet.has("reports") || moduleSet.has("time"))
  ) {
    return true
  }
  if (allowedRolesOrModules.includes("munkavedelmi") && moduleSet.has("compliance")) {
    return true
  }
  if (allowedRolesOrModules.includes("auditor") && moduleSet.has("audit")) {
    return true
  }
  if (
    (allowedRolesOrModules.includes("hr_munkatars") || allowedRolesOrModules.includes("hr_vezeto")) &&
    moduleSet.size > 0
  ) {
    return true
  }

  return false
}
