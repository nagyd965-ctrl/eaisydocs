export interface CompanyFilingRule {
  id?: string
  company_id?: string
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
  is_active?: boolean
  created_at?: string
  updated_at?: string
  // Joins
  szervezeti_egyseg?: { id: string; nev: string } | null
  irattari_terv?: { id: string; tetelszam: string; megnevezes: string } | null
}

export interface FilingMatchResult {
  matchedRule: CompanyFilingRule
  department_id?: string | null
  irattari_tetel_id?: string | null
  target_document_type?: string | null
  target_subject_prefix?: string | null
}

export interface MatchParams {
  text?: string | null
  partnerName?: string | null
  partnerTax?: string | null
}

/**
 * Validates user input when creating or editing a filing rule.
 */
export function validateFilingRuleInput(input: Partial<CompanyFilingRule>): { isValid: boolean; error?: string } {
  if (!input.rule_name || !input.rule_name.trim()) {
    return { isValid: false, error: "A szabály neve kötelező." }
  }

  const hasPattern = Boolean(input.search_pattern && input.search_pattern.trim())
  const hasPartner = Boolean(input.partner_name && input.partner_name.trim())
  const hasTax = Boolean(input.partner_tax_number && input.partner_tax_number.trim())

  if (!hasPattern && !hasPartner && !hasTax) {
    return {
      isValid: false,
      error: "Legalább egy feltétel megadása kötelező (szövegminta, partner neve vagy partner adószáma).",
    }
  }

  return { isValid: true }
}

/**
 * Normalizes text for accent-insensitive and case-insensitive matching.
 * Converts characters like 'é', 'ő', 'ü' to 'e', 'o', 'u' and trims whitespace.
 */
export function normalizeTextForMatching(str?: string | null): string {
  if (!str) return ""
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

/**
 * Deterministically matches incoming document data against company filing rules.
 */
export function matchFilingRules(
  rules: CompanyFilingRule[] | null | undefined,
  params: MatchParams
): FilingMatchResult | null {
  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    return null
  }

  const activeRules = rules.filter((r) => r && r.is_active !== false)
  const normText = normalizeTextForMatching(params.text)
  const normPartner = normalizeTextForMatching(params.partnerName)
  const cleanTax = (params.partnerTax || "").replace(/[^0-9]/g, "")

  for (const rule of activeRules) {
    let matches = false

    // 1. Partner tax match (if specified in rule)
    if (rule.partner_tax_number && rule.partner_tax_number.trim() && cleanTax) {
      const ruleTaxClean = rule.partner_tax_number.replace(/[^0-9]/g, "")
      if (ruleTaxClean && cleanTax.includes(ruleTaxClean)) {
        matches = true
      }
    }

    // 2. Partner name match (if specified in rule)
    if (!matches && rule.partner_name && rule.partner_name.trim() && normPartner) {
      const rulePartnerNorm = normalizeTextForMatching(rule.partner_name)
      const matchType = rule.match_type || "contains"

      if (matchType === "exact" && normPartner === rulePartnerNorm) {
        matches = true
      } else if (matchType === "starts_with" && normPartner.startsWith(rulePartnerNorm)) {
        matches = true
      } else if (matchType === "contains" && normPartner.includes(rulePartnerNorm)) {
        matches = true
      }
    }

    // 3. Document text search pattern (if specified in rule)
    if (!matches && rule.search_pattern && rule.search_pattern.trim() && normText) {
      const patternNorm = normalizeTextForMatching(rule.search_pattern)
      const matchType = rule.match_type || "contains"

      if (matchType === "exact" && normText === patternNorm) {
        matches = true
      } else if (matchType === "starts_with" && normText.startsWith(patternNorm)) {
        matches = true
      } else if (matchType === "contains" && normText.includes(patternNorm)) {
        matches = true
      }
    }

    if (matches) {
      return {
        matchedRule: rule,
        department_id: rule.target_department_id || null,
        irattari_tetel_id: rule.target_irattari_tetel_id || null,
        target_document_type: rule.target_document_type || null,
        target_subject_prefix: rule.target_subject_prefix || null,
      }
    }
  }

  return null
}
