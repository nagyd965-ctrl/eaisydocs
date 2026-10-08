import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import type { Company } from "@/types/company"

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
    .select("id, name, tax_number, address, representative_name, phone, owner_id, share_token, share_token_created_at, country_code, logo_url, filing_prefix, created_at, updated_at")
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
