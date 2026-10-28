import type { HrAuthContext } from "@/utils/hr/hr-auth-guard"

/**
 * Eldönti, hogy a felhasználó a teljes vállalat összes dolgozójának
 * teljesítményértékelésére jogosult-e (Admin, HR vezető, HR munkatárs, Auditor,
 * vagy Állomány/Admin modul-jogosultsággal rendelkező felhasználó).
 *
 * Ha `false`, de `auth.hrRole === "vezeto"`, akkor a felhasználó kizárólag a saját
 * közvetlen beosztottjai (és az aktív helyettesítéssel átvett csapattagok) KPI-jait
 * láthatja és kezelheti.
 */
export function hasFullCompanyPerformanceAccess(auth: HrAuthContext): boolean {
  return (
    auth.isCompanyAdmin ||
    ["admin", "hr_vezeto", "hr_munkatars", "auditor"].includes(auth.hrRole) ||
    auth.hrModules.includes("admin")
  )
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
  if (!userId) return []

  const companySet = new Set(companyMemberIds)
  const todayStr = new Date().toISOString().split("T")[0]

  // 1. Aktív helyettesítések lekérése (ha a vezető jelenleg más vezetőt is helyettesít)
  const { data: activeSubs } = await supabaseAdmin
    .from("hr_helyettesites")
    .select("helyettesitett_id")
    .eq("helyettes_id", userId)
    .eq("aktiv", true)
    .lte("kezdet_datuma", todayStr)
    .gte("veg_datuma", todayStr)

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
  const [{ data: docsUnits }, { data: hrUnits }] = await Promise.all([
    supabaseAdmin
      .from("szervezeti_egyseg")
      .select("id")
      .in("vezeto_id", managerIds),
    supabaseAdmin
      .from("hr_szervezeti_egyseg")
      .select("id")
      .in("vezeto_id", managerIds),
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
    (id: string) => id !== userId && (companySet.size === 0 || companySet.has(id))
  )
}

/**
 * Ellenőrzi, hogy a bejelentkezett vezető/HR-es jogosult-e a megadott dolgozó
 * (`targetEmployeeId`) KPI-jainak módosítására / értékelésére.
 */
export async function canManageEmployeePerformance(
  supabaseAdmin: any,
  auth: HrAuthContext,
  targetEmployeeId: string
): Promise<boolean> {
  if (!auth.authorized || !targetEmployeeId) return false
  if (hasFullCompanyPerformanceAccess(auth)) return true

  const companyScope = auth.activeCompanyId || "00000000-0000-0000-0000-000000000000"
  const { data: companyMembers } = await supabaseAdmin
    .from("company_members")
    .select("user_id")
    .eq("company_id", companyScope)
  const memberUserIds = (companyMembers || []).map((m: any) => m.user_id)

  const allowedIds = await getScopedPerformanceEmployeeIds(
    supabaseAdmin,
    auth,
    memberUserIds
  )
  return allowedIds.includes(targetEmployeeId)
}
