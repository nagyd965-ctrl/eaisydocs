import {
  checkHrWriteAccess,
  isStrictHrReadOnlyUser,
  type HrAuthContext,
} from "@/utils/hr/hr-auth-guard"

/**
 * Eldönti, hogy a felhasználó a teljes vállalat összes dolgozójának
 * teljesítményértékelését LÁTHATJA-e (olvasási szinten: Admin, HR vezető, HR munkatárs,
 * Auditor, vagy Állomány/Admin modul-jogosultsággal rendelkező felhasználó).
 */
export function hasFullCompanyPerformanceAccess(auth: HrAuthContext): boolean {
  return (
    auth.isCompanyAdmin ||
    ["admin", "hr_vezeto", "hr_munkatars", "auditor"].includes(auth.hrRole) ||
    auth.hrModules.includes("admin")
  )
}

/**
 * Eldönti, hogy a felhasználó a teljes vállalat szintjén MÓDOSÍTHATJA / KEZELHETI-e
 * a teljesítményértékelési ciklusokat és bármely dolgozó KPI-jait
 * (ehhez az 'admin' HR modul ÍRÁSI jogosultsága vagy Cég Admin szerepkör szükséges).
 */
export function hasFullCompanyPerformanceWriteAccess(auth: HrAuthContext): boolean {
  if (!auth.authorized || !auth.user) return false
  return checkHrWriteAccess(auth, "admin")
}

/**
 * Visszaadja azoknak a dolgozóknak az azonosítóit (`user_id`), akiknek a KPI-jait
 * az adott felhasználó láthatja és kezelheti az aktív vállalatban.
 * - HR / Admin esetén: a vállalat összes tagja (`companyMemberIds`)
 * - Sima `vezeto` esetén: a saját közvetlen beosztottak (`kozvetlen_vezeto_id`),
 *   a vezetett szervezeti egységek tagjai, valamint az aktív helyettesítéssel
 *   (`hr_helyettesites`) átvett vezetők beosztottjai.
 */
export async function getScopedPerformanceEmployeeIds(
  supabaseAdmin: any,
  auth: HrAuthContext,
  companyMemberIds: string[]
): Promise<string[]> {
  if (hasFullCompanyPerformanceAccess(auth)) {
    return companyMemberIds
  }

  const userId = auth.user?.id
  if (!userId || companyMemberIds.length === 0) return []

  const companySet = new Set(companyMemberIds)
  const todayStr = new Date().toISOString().split("T")[0]

  // 1. Aktív helyettesítések lekérése (csak az aktív vállalatban)
  let subsQuery = supabaseAdmin
    .from("hr_helyettesites")
    .select("helyettesitett_id")
    .eq("helyettes_id", userId)
    .eq("aktiv", true)
    .lte("kezdet_datuma", todayStr)
    .gte("veg_datuma", todayStr)
  if (auth.activeCompanyId) {
    subsQuery = subsQuery.eq("company_id", auth.activeCompanyId)
  }
  const { data: activeSubs } = await subsQuery

  const managerIds = Array.from(
    new Set([
      userId,
      ...((activeSubs || []).map((s: any) => s.helyettesitett_id).filter(Boolean)),
    ])
  )

  // 2. Közvetlen beosztottak a `felhasznalo_profil.kozvetlen_vezeto_id` alapján
  const { data: directReports } = await supabaseAdmin
    .from("felhasznalo_profil")
    .select("id")
    .in("kozvetlen_vezeto_id", managerIds)

  // 3. Szervezeti egység vezetés alapján (`szervezeti_egyseg.vezeto_id` és `hr_szervezeti_egyseg.vezeto_id`)
  let docsUnitsQuery = supabaseAdmin
    .from("szervezeti_egyseg")
    .select("id")
    .in("vezeto_id", managerIds)
  let hrUnitsQuery = supabaseAdmin
    .from("hr_szervezeti_egyseg")
    .select("id")
    .in("vezeto_id", managerIds)
  if (auth.activeCompanyId) {
    docsUnitsQuery = docsUnitsQuery.eq("company_id", auth.activeCompanyId)
    hrUnitsQuery = hrUnitsQuery.eq("company_id", auth.activeCompanyId)
  }
  const [{ data: docsUnits }, { data: hrUnits }] = await Promise.all([
    docsUnitsQuery,
    hrUnitsQuery,
  ])

  const managedUnitIds = Array.from(
    new Set([
      ...((docsUnits || []).map((u: any) => u.id).filter(Boolean)),
      ...((hrUnits || []).map((u: any) => u.id).filter(Boolean)),
    ])
  )

  let unitMemberIds: string[] = []
  if (managedUnitIds.length > 0) {
    const { data: unitProfiles } = await supabaseAdmin
      .from("felhasznalo_profil")
      .select("id")
      .in("szervezeti_egyseg_id", managedUnitIds)
    unitMemberIds = (unitProfiles || []).map((p: any) => p.id).filter(Boolean)
  }

  const allTeamIds = Array.from(
    new Set([
      ...((directReports || []).map((p: any) => p.id).filter(Boolean)),
      ...unitMemberIds,
    ])
  )

  // Kizárólag az aktív vállalat tagjai (és saját magát kizárva, ha részlegvezetőként benne lenne)
  return allTeamIds.filter(
    (id: string) => id !== userId && companySet.has(id)
  )
}

/**
 * Ellenőrzi, hogy a bejelentkezett vezető/HR-es jogosult-e a megadott dolgozó
 * (`targetEmployeeId`) KPI-jainak módosítására / értékelésére az aktív cégben.
 */
export async function canManageEmployeePerformance(
  supabaseAdmin: any,
  auth: HrAuthContext,
  targetEmployeeId: string
): Promise<boolean> {
  if (!auth.authorized || !targetEmployeeId || !auth.activeCompanyId) return false

  const { data: companyMembers } = await supabaseAdmin
    .from("company_members")
    .select("user_id")
    .eq("company_id", auth.activeCompanyId)
  const memberUserIds = (companyMembers || []).map((m: any) => m.user_id)

  // A cél dolgozónak kötelezően az aktív vállalat tagjának kell lennie
  if (!memberUserIds.includes(targetEmployeeId)) {
    return false
  }

  if (hasFullCompanyPerformanceWriteAccess(auth)) {
    return true
  }

  // Ha a felhasználó kifejezetten „Csak olvasás” (0 írási modul) módban van, nem módosíthat KPI-t
  if (isStrictHrReadOnlyUser(auth)) {
    return false
  }

  const allowedIds = await getScopedPerformanceEmployeeIds(
    supabaseAdmin,
    auth,
    memberUserIds
  )
  return allowedIds.includes(targetEmployeeId)
}
