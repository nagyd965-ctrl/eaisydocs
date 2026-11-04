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

// ═══════════════════════════════════════════════════════════════════════════
// eaisyDocs – 3-Szintű Alapszerepkör és Vállalati Modul-hozzáférési Mátrix
// ═══════════════════════════════════════════════════════════════════════════

export const ALL_DOCS_MODULES = [
  "inbox",
  "dossiers",
  "archive",
  "partners",
  "rules",
  "settings",
  "audit",
] as const

export type DocsModuleKey = (typeof ALL_DOCS_MODULES)[number]

export interface DocsModuleDefinition {
  key: DocsModuleKey
  label: string
  shortLabel: string
  group: "Iratkezelési Munkaasztal" | "Automatizáció és Szervezet" | "Rendszer"
  url: string
  description: string
}

export const DOCS_MODULE_DEFINITIONS: DocsModuleDefinition[] = [
  {
    key: "inbox",
    label: "Bejövő sor",
    shortLabel: "Bejövő sor",
    group: "Iratkezelési Munkaasztal",
    url: "/inbox",
    description: "Bejövő iratok érkeztetése, eaisyBill számlaátvétel, AI iktatás és előzmény-párosítás",
  },
  {
    key: "dossiers",
    label: "Iktatókönyv",
    shortLabel: "Iktatókönyv",
    group: "Iratkezelési Munkaasztal",
    url: "/dossiers",
    description: "Ügyiratok, dossziék, iktatószámok, kiadmányozás és válaszlevelek kezelése",
  },
  {
    key: "archive",
    label: "Irattár",
    shortLabel: "Irattár",
    group: "Iratkezelési Munkaasztal",
    url: "/archive",
    description: "Lezárt ügyiratok, fizikai tárolási helyek, kölcsönzés és selejtezési eljárások",
  },
  {
    key: "partners",
    label: "Partnerek",
    shortLabel: "Partnerek",
    group: "Iratkezelési Munkaasztal",
    url: "/partners",
    description: "Partner törzsadatok, kapcsolattartók és AI szerződésgenerátor kezelése",
  },
  {
    key: "rules",
    label: "Szabályok",
    shortLabel: "Szabályok",
    group: "Automatizáció és Szervezet",
    url: "/rules",
    description: "Céges iktatási szabályok, munkafolyamatok és AI feldolgozási szabályok",
  },
  {
    key: "settings",
    label: "Szervezeti Egységek & Cégbeállítások",
    shortLabel: "Beállítások",
    group: "Automatizáció és Szervezet",
    url: "/settings",
    description: "Szervezeti egységek, organigram, irattári terv és céges csapat kezelése",
  },
  {
    key: "audit",
    label: "Eseménynapló",
    shortLabel: "Eseménynapló",
    group: "Rendszer",
    url: "/audit",
    description: "Hitelesített, megváltoztathatatlan iratkezelési és biztonsági audit napló",
  },
]

export const DOCS_CORE_ROLES = [
  { value: "munkavallalo", label: "Munkavállaló" },
  { value: "vezeto", label: "Vezető" },
  { value: "admin", label: "Admin" },
] as const

export type DocsCoreRole = (typeof DOCS_CORE_ROLES)[number]["value"]

export const DOCS_ROLE_LABELS: Record<string, string> = {
  munkavallalo: "Munkavállaló",
  vezeto: "Vezető",
  admin: "Admin",
  // Visszafelé kompatibilis címkék esetleges régi adatokhoz:
  rendszergazda: "Admin",
  iktato: "Munkavállaló",
  ugyintezo: "Munkavállaló",
  betekinto: "Munkavállaló",
  auditor: "Munkavállaló",
}

export const DEFAULT_DOCS_MODULES_FOR_ROLE: Record<DocsCoreRole, DocsModuleKey[]> = {
  admin: [...ALL_DOCS_MODULES],
  vezeto: ["inbox", "dossiers", "archive", "partners", "audit"],
  munkavallalo: ["inbox", "dossiers", "archive", "partners"],
}

/**
 * Normalizálja a régi vagy új eaisyDocs szerepkör-értékeket a 3 kanonikus alapszerepkörre
 * ('munkavallalo' | 'vezeto' | 'admin'), a hozzájuk tartozó Olvasás (`modules`) és Írás (`writeModules`) modul-listára.
 */
export function normalizeDocsRoleAndModules(
  rawRole: string | null | undefined,
  rawModules?: string[] | null,
  rawWriteModules?: string[] | null
): { role: DocsCoreRole; modules: DocsModuleKey[]; writeModules: DocsModuleKey[] } {
  const validModuleSet = new Set<string>(ALL_DOCS_MODULES)
  const hasExplicitArray = Array.isArray(rawModules)
  const explicitModules = (rawModules || []).filter((m): m is DocsModuleKey => validModuleSet.has(m))

  const r = (rawRole || "munkavallalo").trim().toLowerCase()

  if (r === "admin" || r === "rendszergazda") {
    return {
      role: "admin",
      modules: [...ALL_DOCS_MODULES],
      writeModules: [...ALL_DOCS_MODULES],
    }
  }

  let role: DocsCoreRole = "munkavallalo"
  let modules: DocsModuleKey[]

  if (r === "vezeto") {
    role = "vezeto"
    modules = hasExplicitArray ? explicitModules : [...DEFAULT_DOCS_MODULES_FOR_ROLE.vezeto]
  } else if (r === "iktato") {
    modules =
      hasExplicitArray && explicitModules.length > 0
        ? explicitModules
        : ["inbox", "dossiers", "archive", "partners"]
  } else if (r === "auditor") {
    modules =
      hasExplicitArray && explicitModules.length > 0
        ? explicitModules
        : ["inbox", "dossiers", "archive", "audit"]
  } else if (r === "betekinto") {
    modules =
      hasExplicitArray && explicitModules.length > 0 ? explicitModules : ["dossiers", "archive"]
  } else if (r === "ugyintezo") {
    modules =
      hasExplicitArray && explicitModules.length > 0
        ? explicitModules
        : [...DEFAULT_DOCS_MODULES_FOR_ROLE.munkavallalo]
  } else {
    modules = hasExplicitArray ? explicitModules : [...DEFAULT_DOCS_MODULES_FOR_ROLE.munkavallalo]
  }

  const readSet = new Set<DocsModuleKey>(modules)
  let writeModules: DocsModuleKey[]
  if (Array.isArray(rawWriteModules)) {
    writeModules = rawWriteModules.filter(
      (m): m is DocsModuleKey => validModuleSet.has(m) && readSet.has(m as DocsModuleKey)
    )
  } else if (r === "auditor" || r === "betekinto") {
    writeModules = []
  } else {
    writeModules = [...modules]
  }

  return {
    role,
    modules,
    writeModules,
  }
}

export interface CompanyMembershipRoleInput {
  companyId: string
  role?: string | null // 'owner', 'admin', 'member'
  docs_szerepkor?: string | null
  docs_modulok?: string[] | null
  docs_iras_modulok?: string[] | null
  hr_szerepkor?: string | null
  hr_modulok?: string[] | null
  hr_iras_modulok?: string[] | null
}

export interface UserProfileRoleInput {
  id: string
  docs_szerepkor?: string | null
  docs_modulok?: string[] | null
  docs_iras_modulok?: string[] | null
  hr_szerepkor?: string | null
  hr_modulok?: string[] | null
  hr_iras_modulok?: string[] | null
  elerheto_modulok?: string[] | null
}

export interface ResolvedCompanyRoles {
  companyId: string | null
  isMember: boolean
  isCompanyAdmin: boolean
  docsRole: string
  docsModules: DocsModuleKey[]
  docsWriteModules: DocsModuleKey[]
  hrRole: string
  hrModules: HrModuleKey[]
  hrWriteModules: HrModuleKey[]
}

/**
 * Normalizálja a régi szerepkör-értékeket a 3 kanonikus alapszerepkörre,
 * és szükség esetén visszaadja a belőlük következő alapértelmezett Olvasás (`modules`) és Írás (`writeModules`) modulokat.
 */
export function normalizeHrRoleAndModules(
  rawRole: string | null | undefined,
  rawModules?: string[] | null,
  rawWriteModules?: string[] | null
): { role: HrCoreRole; modules: HrModuleKey[]; writeModules: HrModuleKey[] } {
  const validModuleSet = new Set<string>(ALL_HR_MODULES)
  const explicitModules = (rawModules || []).filter((m): m is HrModuleKey => validModuleSet.has(m))

  const r = (rawRole || "munkavallalo").trim().toLowerCase()

  if (r === "admin" || r === "rendszergazda") {
    return {
      role: "admin",
      modules: [...ALL_HR_MODULES],
      writeModules: [...ALL_HR_MODULES],
    }
  }

  let role: HrCoreRole = "munkavallalo"
  let modules: HrModuleKey[] = explicitModules

  if (r === "hr_vezeto") {
    role = "vezeto"
    modules = explicitModules.length > 0 ? explicitModules : [...ALL_HR_MODULES]
  } else if (r === "hr_munkatars" || r === "auditor") {
    role = "munkavallalo"
    modules = explicitModules.length > 0 ? explicitModules : [...ALL_HR_MODULES]
  } else if (r === "berugyi") {
    role = "munkavallalo"
    modules =
      explicitModules.length > 0
        ? explicitModules
        : ["admin", "organization", "time", "payroll", "reports"]
  } else if (r === "munkavedelmi") {
    role = "munkavallalo"
    modules = explicitModules.length > 0 ? explicitModules : ["admin", "compliance"]
  } else if (r === "toborzo") {
    role = "munkavallalo"
    modules = explicitModules.length > 0 ? explicitModules : ["recruitment", "onboarding"]
  } else if (r === "vezeto") {
    role = "vezeto"
    modules = explicitModules
  }

  const readSet = new Set<HrModuleKey>(modules)
  let writeModules: HrModuleKey[]
  if (Array.isArray(rawWriteModules)) {
    writeModules = rawWriteModules.filter(
      (m): m is HrModuleKey => validModuleSet.has(m) && readSet.has(m as HrModuleKey)
    )
  } else if (r === "auditor") {
    writeModules = []
  } else {
    writeModules = [...modules]
  }

  return { role, modules, writeModules }
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
      docsModules: [],
      docsWriteModules: [],
      hrRole: "none",
      hrModules: [],
      hrWriteModules: [],
    }
  }

  const isCompanyAdmin = membership.role === "admin" || membership.role === "owner"

  const hasExplicitAllowedModules = Array.isArray(profile?.elerheto_modulok)
  const hasDocsModule = hasExplicitAllowedModules
    ? profile!.elerheto_modulok!.includes("docs")
    : true
  const hasHrModule = hasExplicitAllowedModules
    ? profile!.elerheto_modulok!.includes("hr")
    : true

  // Docs szerepkör és modulok feloldása
  const hasExplicitMemberDocsRole = Boolean(
    membership.docs_szerepkor && membership.docs_szerepkor.trim() !== ""
  )
  const isProfileDocsGlobalAdmin =
    profile?.docs_szerepkor === "admin" || profile?.docs_szerepkor === "rendszergazda"
  let rawDocsRole: string
  if (hasExplicitMemberDocsRole) {
    rawDocsRole = membership.docs_szerepkor!
  } else if (isCompanyAdmin) {
    rawDocsRole = "admin"
  } else if (profile?.docs_szerepkor && profile.docs_szerepkor.trim() !== "") {
    rawDocsRole = isProfileDocsGlobalAdmin ? "munkavallalo" : profile.docs_szerepkor
  } else {
    rawDocsRole = "munkavallalo"
  }

  const rawDocsModules = Array.isArray(membership.docs_modulok)
    ? membership.docs_modulok
    : !isProfileDocsGlobalAdmin && Array.isArray(profile?.docs_modulok)
    ? profile!.docs_modulok
    : undefined

  const rawDocsWriteModules = Array.isArray(membership.docs_iras_modulok)
    ? membership.docs_iras_modulok
    : !isProfileDocsGlobalAdmin && Array.isArray(profile?.docs_iras_modulok)
    ? profile!.docs_iras_modulok
    : undefined

  const normalizedDocs = hasDocsModule
    ? normalizeDocsRoleAndModules(rawDocsRole, rawDocsModules, rawDocsWriteModules)
    : { role: "none", modules: [] as DocsModuleKey[], writeModules: [] as DocsModuleKey[] }

  // HR szerepkör és modulok feloldása
  const hasExplicitMemberHrRole = Boolean(
    membership.hr_szerepkor && membership.hr_szerepkor.trim() !== ""
  )
  const isProfileHrGlobalAdmin =
    profile?.hr_szerepkor === "admin" || profile?.hr_szerepkor === "rendszergazda"
  const rawHrRole = hasExplicitMemberHrRole
    ? membership.hr_szerepkor!
    : isCompanyAdmin
    ? "admin"
    : profile?.hr_szerepkor && profile.hr_szerepkor.trim() !== ""
    ? isProfileHrGlobalAdmin
      ? "munkavallalo"
      : profile.hr_szerepkor
    : "munkavallalo"

  const useMemberHrModules = Boolean(membership.hr_modulok && membership.hr_modulok.length > 0)
  const rawHrModules = useMemberHrModules
    ? membership.hr_modulok!
    : hasExplicitMemberHrRole && membership.hr_szerepkor !== profile?.hr_szerepkor
    ? []
    : isProfileHrGlobalAdmin && !isCompanyAdmin
    ? []
    : profile?.hr_modulok || []

  const rawHrWriteModules = useMemberHrModules
    ? Array.isArray(membership.hr_iras_modulok)
      ? membership.hr_iras_modulok
      : undefined
    : hasExplicitMemberHrRole && Array.isArray(membership.hr_iras_modulok)
    ? membership.hr_iras_modulok
    : isProfileHrGlobalAdmin && !isCompanyAdmin
    ? []
    : Array.isArray(profile?.hr_iras_modulok)
    ? profile!.hr_iras_modulok
    : undefined

  const normalized = hasHrModule
    ? normalizeHrRoleAndModules(rawHrRole, rawHrModules, rawHrWriteModules)
    : { role: "none", modules: [] as HrModuleKey[], writeModules: [] as HrModuleKey[] }

  return {
    companyId: membership.companyId,
    isMember: true,
    isCompanyAdmin: isCompanyAdmin || normalized.role === "admin" || normalizedDocs.role === "admin",
    docsRole: normalizedDocs.role,
    docsModules: normalizedDocs.modules,
    docsWriteModules: normalizedDocs.writeModules,
    hrRole: normalized.role,
    hrModules: normalized.modules,
    hrWriteModules: normalized.writeModules,
  }
}

/**
 * Megvizsgálja, hogy a felhasználó rendelkezik-e az adott eaisyDocs modulhoz való (olvasási) hozzáféréssel.
 */
export function hasDocsModuleAccess(
  currentDocsRole: string,
  docsModules: string[] | undefined,
  moduleKey: DocsModuleKey
): boolean {
  if (currentDocsRole === "none") return false
  if (currentDocsRole === "admin" || currentDocsRole === "rendszergazda") return true
  return (docsModules || []).includes(moduleKey)
}

/**
 * Megvizsgálja, hogy a felhasználó rendelkezik-e az adott eaisyDocs modul(ok)hoz való ÍRÁSI hozzáféréssel.
 */
export function hasDocsWriteAccess(
  currentDocsRole: string,
  docsModules: string[] | undefined,
  docsWriteModules: string[] | undefined,
  moduleKey: DocsModuleKey | DocsModuleKey[]
): boolean {
  if (!currentDocsRole || currentDocsRole === "none") return false
  if (currentDocsRole === "admin" || currentDocsRole === "rendszergazda") return true
  const keys = Array.isArray(moduleKey) ? moduleKey : [moduleKey]
  const readSet = new Set(docsModules || [])
  const writeSet = new Set(docsWriteModules ?? docsModules ?? [])
  return keys.some((k) => readSet.has(k) && writeSet.has(k))
}

/**
 * Megvizsgálja, hogy az adott feloldott eaisyDocs szerepkör és modul-lista jogosult-e a műveletre vagy felületre.
 * Támogatja mind a 3 új alapszerepkört ('munkavallalo', 'vezeto', 'admin'), mind a 7 modul-kulcsot
 * ('inbox', 'dossiers', 'archive', 'partners', 'rules', 'settings', 'audit'), mind a korábbi
 * szerepkör-listákat ('rendszergazda', 'iktato', 'ugyintezo', 'betekinto', 'auditor').
 */
export function isUserAuthorizedForDocsView(
  currentDocsRole: string,
  allowedRolesOrModules: string[],
  docsModules: string[] = []
): boolean {
  if (!currentDocsRole || currentDocsRole === "none") {
    return false
  }

  const normalizedRole =
    currentDocsRole === "rendszergazda"
      ? "admin"
      : currentDocsRole === "ugyintezo" ||
        currentDocsRole === "iktato" ||
        currentDocsRole === "betekinto" ||
        currentDocsRole === "auditor"
      ? "munkavallalo"
      : currentDocsRole

  if (normalizedRole === "admin") {
    return true
  }

  // 1. Közvetlen szerepkör egyezés (pl. 'vezeto', 'munkavallalo' vagy a nyers szerepkör)
  if (
    allowedRolesOrModules.includes(currentDocsRole) ||
    allowedRolesOrModules.includes(normalizedRole)
  ) {
    return true
  }

  // 2. Közvetlen modul-kulcs egyezés (pl. 'inbox', 'dossiers', 'archive', 'partners', 'rules', 'settings', 'audit')
  const moduleSet = new Set(docsModules)
  for (const item of allowedRolesOrModules) {
    if (moduleSet.has(item)) {
      return true
    }
  }

  // 3. Kompatibilitási leképezés a meglévő Server Action / Page hívásokhoz:
  // - Ha a hívó 'ugyintezo' vagy 'betekinto' szerepkört engedett meg -> a 'munkavallalo' és 'vezeto' jogosult
  if (
    (allowedRolesOrModules.includes("ugyintezo") || allowedRolesOrModules.includes("betekinto")) &&
    (normalizedRole === "munkavallalo" || normalizedRole === "vezeto")
  ) {
    return true
  }

  // - Ha a hívó 'iktato'-t kért (pl. érkeztetés, iktatás, eaisyBill számlaátvétel, selejtezés) ->
  //   átengedjük, ha be van kapcsolva az 'inbox', 'dossiers' vagy 'archive' modul
  if (
    allowedRolesOrModules.includes("iktato") &&
    (moduleSet.has("inbox") || moduleSet.has("dossiers") || moduleSet.has("archive"))
  ) {
    return true
  }

  // - Ha a hívó 'auditor'-t kért -> átengedjük, ha be van kapcsolva az 'audit' modul
  if (allowedRolesOrModules.includes("auditor") && moduleSet.has("audit")) {
    return true
  }

  return false
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
 * Megvizsgálja, hogy a felhasználó rendelkezik-e az adott HR modulhoz való (olvasási) hozzáféréssel.
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
 * Megvizsgálja, hogy a felhasználó rendelkezik-e az adott HR modul(ok)hoz való ÍRÁSI hozzáféréssel.
 */
export function hasHrWriteAccess(
  currentHrRole: string,
  hrModules: string[] | undefined,
  hrWriteModules: string[] | undefined,
  moduleKey: HrModuleKey | string | (HrModuleKey | string)[]
): boolean {
  if (!currentHrRole || currentHrRole === "none") return false
  if (currentHrRole === "admin" || currentHrRole === "rendszergazda") return true
  const keys = Array.isArray(moduleKey) ? moduleKey : [moduleKey]
  const readSet = new Set(hrModules || [])
  const writeSet = new Set(hrWriteModules ?? hrModules ?? [])
  return keys.some((k) => readSet.has(k) && writeSet.has(k))
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
