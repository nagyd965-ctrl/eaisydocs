import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import type { Company } from "@/types/company"
import { resolveUserCompanyRoles, type ResolvedCompanyRoles } from "@/utils/hr/company-role-resolver"
import { DEFAULT_COMPANY_DETAILS, type CompanyDetails } from "@/utils/hr/employment-contract-constants"

export const SELECTED_COMPANY_COOKIE = "eaisydocs_selected_company_id"

/**
 * Lekéri a bejelentkezett felhasználó számára elérhető cégeket a szerver oldalon.
 * Magyar ABC sorrendben adja vissza őket.
 */
export async function getUserCompaniesServer(): Promise<Company[]> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Lekérjük a cégeket a tagságok alapján
  const { data: memberships } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)

  const companyIds = (memberships || []).map(m => m.company_id)
  if (companyIds.length === 0) {
    return []
  }

  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, tax_number, address, representative_name, phone, owner_id, share_token, share_token_created_at, country_code, logo_url, filing_prefix, referral_bonus_amount, eaisybill_company_id, created_at, updated_at")
    .in("id", companyIds)

  if (error || !companies) {
    console.error("Hiba a cégek lekérdezésekor:", error)
    return []
  }

  return (companies as Company[]).sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "hu", { sensitivity: "base" })
  )
}

/**
 * Visszaadja az aktuálisan aktív cég azonosítóját a szerver oldalon (Cookie alapján).
 * Ha a cookie hiányzik vagy érvénytelen, automatikusan az első elérhető cégre áll vissza.
 */
export async function getActiveCompanyIdServer(): Promise<string | null> {
  const cookieStore = await cookies()
  const cookieVal = cookieStore.get(SELECTED_COMPANY_COOKIE)?.value
  const companies = await getUserCompaniesServer()

  if (companies.length === 0) {
    return null
  }

  if (cookieVal && companies.some(c => c.id === cookieVal)) {
    return cookieVal
  }

  return companies[0].id
}

/**
 * Visszaadja az aktuálisan aktív cég teljes rekordját a szerver oldalon.
 */
export async function getActiveCompanyServer(): Promise<Company | null> {
  const activeId = await getActiveCompanyIdServer()
  if (!activeId) return null

  const companies = await getUserCompaniesServer()
  return companies.find(c => c.id === activeId) || null
}

/**
 * Lekéri a bejelentkezett felhasználó aktív cégre vonatkozó cég-specifikus (scoped) szerepköreit és modul-engedélyeit.
 * A company_members és felhasznalo_profil alapján feloldja a valós docsRole, hrRole és hrModules értékeket.
 */
export async function getActiveCompanyMemberRolesServer(targetCompanyId?: string | null): Promise<ResolvedCompanyRoles> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return resolveUserCompanyRoles(null, null)
  }

  const activeId = targetCompanyId || (await getActiveCompanyIdServer())
  if (!activeId) {
    return resolveUserCompanyRoles(null, null)
  }

  // 1. Lekérjük a cégtagsági rekordot
  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id, role, docs_szerepkor, hr_szerepkor, hr_modulok")
    .eq("user_id", user.id)
    .eq("company_id", activeId)
    .maybeSingle()

  // 2. Lekérjük a globális profilt a fallbackhez
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("id, docs_szerepkor, hr_szerepkor, hr_modulok")
    .eq("id", user.id)
    .single()

  return resolveUserCompanyRoles(
    membership
      ? {
          companyId: membership.company_id,
          role: membership.role,
          docs_szerepkor: membership.docs_szerepkor,
          hr_szerepkor: membership.hr_szerepkor,
          hr_modulok: (membership as any).hr_modulok || [],
        }
      : null,
    profile
      ? {
          id: profile.id,
          docs_szerepkor: profile.docs_szerepkor,
          hr_szerepkor: profile.hr_szerepkor,
          hr_modulok: (profile as any).hr_modulok || [],
        }
      : null
  )
}

/**
 * Feloldja az aktív vagy megadott vállalat hivatalos cégadatait (név, székhely, adószám, képviselő)
 * a PDF generátorokhoz (T1041, Offboarding dokumentumok, Munkaszerződés, Mt. 46 tájékoztató).
 * Hiányzó mezőknél a DEFAULT_COMPANY_DETAILS szolgál biztonsági fallback-ként.
 */
export async function resolveCompanyDetailsServer(
  explicitCompanyId?: string | null,
  adminClient?: any
): Promise<CompanyDetails> {
  try {
    const companyId = explicitCompanyId || (await getActiveCompanyIdServer())
    if (!companyId) {
      return { ...DEFAULT_COMPANY_DETAILS }
    }

    const client = adminClient || (await createClient())
    const { data: company } = await client
      .from("companies")
      .select("name, address, tax_number, representative_name")
      .eq("id", companyId)
      .maybeSingle()

    return {
      nev: company?.name || DEFAULT_COMPANY_DETAILS.nev,
      szekhely: company?.address || DEFAULT_COMPANY_DETAILS.szekhely,
      adoszam: company?.tax_number || DEFAULT_COMPANY_DETAILS.adoszam,
      cegjegyzekszam: DEFAULT_COMPANY_DETAILS.cegjegyzekszam,
      kepviselo: company?.representative_name || DEFAULT_COMPANY_DETAILS.kepviselo,
    }
  } catch (err) {
    console.warn("Nem sikerült feloldani a cégadatokat, fallback használata:", err)
    return { ...DEFAULT_COMPANY_DETAILS }
  }
}
