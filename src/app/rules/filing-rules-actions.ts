"use server"

import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { validateFilingRuleInput, type CompanyFilingRule } from "@/utils/filing-rules-engine"
import { revalidatePath } from "next/cache"

export interface FilingRuleActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Lekéri az aktív vagy megadott céghez tartozó determinisztikus iktatási szabályokat.
 */
export async function getCompanyFilingRules(targetCompanyId?: string): Promise<CompanyFilingRule[]> {
  try {
    const supabase = await createClient()
    const activeCompanyId = targetCompanyId || (await getActiveCompanyIdServer())

    if (!activeCompanyId) {
      return []
    }

    const { data, error } = await supabase
      .from("company_filing_rules")
      .select(`
        id,
        company_id,
        rule_name,
        search_pattern,
        partner_name,
        partner_tax_number,
        match_type,
        target_department_id,
        target_irattari_tetel_id,
        target_document_type,
        target_subject_prefix,
        scope,
        is_active,
        created_at,
        updated_at,
        szervezeti_egyseg ( id, nev ),
        irattari_terv ( id, tetelszam, megnevezes )
      `)
      .or(`company_id.eq.${activeCompanyId},scope.eq.all`)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[getCompanyFilingRules] Hiba a szabályok lekérésekor:", error)
      return []
    }

    const normalized = (data || []).map((row: any) => ({
      ...row,
      szervezeti_egyseg: Array.isArray(row.szervezeti_egyseg)
        ? row.szervezeti_egyseg[0] || null
        : row.szervezeti_egyseg || null,
      irattari_terv: Array.isArray(row.irattari_terv)
        ? row.irattari_terv[0] || null
        : row.irattari_terv || null,
    }))

    return (normalized as unknown as CompanyFilingRule[]) || []
  } catch (err: any) {
    console.error("[getCompanyFilingRules] Kivétel:", err)
    return []
  }
}

/**
 * Új determinisztikus iktatási szabály létrehozása.
 */
export async function createCompanyFilingRule(input: {
  companyId?: string
  rule_name: string
  search_pattern?: string | null
  partner_name?: string | null
  partner_tax_number?: string | null
  match_type?: "contains" | "exact" | "starts_with"
  target_department_id?: string | null
  target_irattari_tetel_id?: string | null
  target_document_type?: string | null
  target_subject_prefix?: string | null
  scope?: "company" | "all"
}): Promise<FilingRuleActionResult<CompanyFilingRule>> {
  try {
    const validation = validateFilingRuleInput(input)
    if (!validation.isValid) {
      return { success: false, error: validation.error }
    }

    const supabase = await createClient()
    const companyId = input.companyId || (await getActiveCompanyIdServer())

    if (!companyId) {
      return { success: false, error: "Nincs kiválasztva aktív cég a szabály rögzítéséhez." }
    }

    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id || null

    const { data, error } = await supabase
      .from("company_filing_rules")
      .insert({
        company_id: companyId,
        rule_name: input.rule_name.trim(),
        search_pattern: input.search_pattern?.trim() || null,
        partner_name: input.partner_name?.trim() || null,
        partner_tax_number: input.partner_tax_number?.trim() || null,
        match_type: input.match_type || "contains",
        target_department_id: input.target_department_id || null,
        target_irattari_tetel_id: input.target_irattari_tetel_id || null,
        target_document_type: input.target_document_type || null,
        target_subject_prefix: input.target_subject_prefix?.trim() || null,
        scope: input.scope || "company",
        is_active: true,
        created_by: userId,
      })
      .select(`
        id,
        company_id,
        rule_name,
        search_pattern,
        partner_name,
        partner_tax_number,
        match_type,
        target_department_id,
        target_irattari_tetel_id,
        target_document_type,
        target_subject_prefix,
        scope,
        is_active,
        created_at,
        updated_at,
        szervezeti_egyseg ( id, nev ),
        irattari_terv ( id, tetelszam, megnevezes )
      `)
      .single()

    if (error) {
      console.error("[createCompanyFilingRule] Beszúrási hiba:", error)
      return { success: false, error: error.message || "Nem sikerült menteni a szabályt." }
    }

    revalidatePath("/rules")
    revalidatePath("/inbox")

    const normalizedData = data
      ? ({
          ...data,
          szervezeti_egyseg: Array.isArray((data as any).szervezeti_egyseg)
            ? (data as any).szervezeti_egyseg[0] || null
            : (data as any).szervezeti_egyseg || null,
          irattari_terv: Array.isArray((data as any).irattari_terv)
            ? (data as any).irattari_terv[0] || null
            : (data as any).irattari_terv || null,
        } as unknown as CompanyFilingRule)
      : undefined

    return { success: true, data: normalizedData }
  } catch (err: any) {
    console.error("[createCompanyFilingRule] Kivétel:", err)
    return { success: false, error: err.message || "Váratlan hiba történt." }
  }
}

/**
 * Meglévő iktatási szabály módosítása.
 */
export async function updateCompanyFilingRule(input: {
  ruleId: string
  rule_name: string
  search_pattern?: string | null
  partner_name?: string | null
  partner_tax_number?: string | null
  match_type?: "contains" | "exact" | "starts_with"
  target_department_id?: string | null
  target_irattari_tetel_id?: string | null
  target_document_type?: string | null
  target_subject_prefix?: string | null
  scope?: "company" | "all"
}): Promise<FilingRuleActionResult> {
  try {
    const validation = validateFilingRuleInput(input)
    if (!validation.isValid) {
      return { success: false, error: validation.error }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from("company_filing_rules")
      .update({
        rule_name: input.rule_name.trim(),
        search_pattern: input.search_pattern?.trim() || null,
        partner_name: input.partner_name?.trim() || null,
        partner_tax_number: input.partner_tax_number?.trim() || null,
        match_type: input.match_type || "contains",
        target_department_id: input.target_department_id || null,
        target_irattari_tetel_id: input.target_irattari_tetel_id || null,
        target_document_type: input.target_document_type || null,
        target_subject_prefix: input.target_subject_prefix?.trim() || null,
        scope: input.scope || "company",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.ruleId)

    if (error) {
      console.error("[updateCompanyFilingRule] Hiba:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/rules")
    revalidatePath("/inbox")

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Iktatási szabály státuszának kapcsolása (Switch toggle).
 */
export async function toggleCompanyFilingRuleActive(
  ruleId: string,
  isActive: boolean
): Promise<FilingRuleActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from("company_filing_rules")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ruleId)

    if (error) {
      console.error("[toggleCompanyFilingRuleActive] Hiba:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/rules")
    revalidatePath("/inbox")

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Iktatási szabály törlése.
 */
export async function deleteCompanyFilingRule(ruleId: string): Promise<FilingRuleActionResult> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from("company_filing_rules")
      .delete()
      .eq("id", ruleId)

    if (error) {
      console.error("[deleteCompanyFilingRule] Hiba:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/rules")
    revalidatePath("/inbox")

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
