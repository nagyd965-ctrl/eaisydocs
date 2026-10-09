export type RuleCategory = "iktatas" | "felelos" | "penzugy" | "altalanos"

export const RULE_CATEGORY_LABELS: Record<RuleCategory, string> = {
  iktatas: "Iktatás és Besorolás",
  felelos: "Felelős és Részleg",
  penzugy: "Pénzügyi megjegyzés",
  altalanos: "Általános szabály",
}

export interface PromptRuleItem {
  id?: string
  company_id?: string
  rule_name: string
  rule_prompt: string
  category?: RuleCategory | string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface RuleTemplate {
  name: string
  prompt: string
  badge: string
  category: RuleCategory
}

export const RULE_TEMPLATES_HU: RuleTemplate[] = [
  {
    name: "Hatósági és bírósági levelek sürgős kezelése",
    prompt:
      "A Nemzeti Adó- és Vámhivataltól (NAV), bíróságoktól és kormányhivataloktól érkező hivatalos határozatokat és leveleket automatikusan 'Sürgős' prioritással lásd el, a tárgy mezőbe írd be a hivatalos ügyszámot, a megőrzési időt állítsd 'Nem selejtezhető'-re, és 8 munkanapos elintézési határidőt állíts be.",
    badge: "Iktatás",
    category: "iktatas",
  },
  {
    name: "Partneri szerződések és megállapodások",
    prompt:
      "Minden bejövő kétoldalú szerződést, megállapodást és mellékletet a 'SZERZ' ügyirattípusba iktass be 10 éves megőrzési idővel. A tárgy mezőben tüntesd fel a szerződő partner nevét és típusát (pl. 'Megbízási szerződés - Partner Kft.').",
    badge: "Iktatás",
    category: "iktatas",
  },
  {
    name: "Informatikai és felhő számlák szignálása",
    prompt:
      "Minden informatikai, szoftverlicenc, felhő- és tárhelyszolgáltatótól érkező számlát és iratot (pl. Google Workspace, Microsoft, Adobe, Slack, AWS, GitHub) automatikusan az 'Informatika / IT' szervezeti egységhez delegálj.",
    badge: "Részleg",
    category: "felelos",
  },
  {
    name: "Marketing és hirdetési számlák átadása",
    prompt:
      "A Meta (Facebook/Instagram), Google Ads, LinkedIn, rendezvényszervező és reklámügynökségi számlákat és szerződéseket automatikusan a 'Marketing és Kommunikáció' szervezeti egységhez szignáld.",
    badge: "Részleg",
    category: "felelos",
  },
  {
    name: "Telekommunikáció és céges telefon 50% ÁFA",
    prompt:
      "A Magyar Telekom, Yettel és Vodafone / One számlák feldolgozásakor a megjegyzés mezőbe kötelezően rögzítsd a könyvelő számára: 'Figyelem: A telefonszámla ÁFA-tartalmának 50%-a levonható, 50%-a a vélelmezett magánhasználat miatt nem levonható.'",
    badge: "Pénzügy",
    category: "penzugy",
  },
  {
    name: "Külföldi EU számlák fordított adózás (FAD)",
    prompt:
      "Külföldi, EU-s adószámmal rendelkező partnerektől érkező számlák esetén a megjegyzés mezőben jelezd: 'Fordított adózású ügylet (FAD) - 27% fizetendő és levonható ÁFA önadózással feljegyzendő a könyvelésnek.'",
    badge: "Pénzügy",
    category: "penzugy",
  },
]

/**
 * Validates user input when creating or editing a rule.
 */
export function validateRuleInput(name: string, prompt: string): { isValid: boolean; error?: string } {
  if (!name || !name.trim()) {
    return { isValid: false, error: "A szabály neve nem lehet üres." }
  }
  if (name.trim().length > 150) {
    return { isValid: false, error: "A szabály neve maximum 150 karakter lehet." }
  }
  if (!prompt || !prompt.trim()) {
    return { isValid: false, error: "Az AI instrukció (prompt) megadása kötelező." }
  }
  if (prompt.trim().length < 5) {
    return { isValid: false, error: "Az AI instrukció legalább 5 karakter hosszú legyen." }
  }
  if (prompt.trim().length > 2000) {
    return { isValid: false, error: "Az AI instrukció legfeljebb 2000 karakter lehet." }
  }
  return { isValid: true }
}

/**
 * Formats active company prompt rules into a high-priority system directive block
 * to be injected into Gemini LLM calls.
 */
export function formatRulesForAiPrompt(rules?: PromptRuleItem[] | null): string {
  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    return ""
  }

  const activeRules = rules.filter((r) => r && r.is_active !== false && r.rule_prompt && r.rule_prompt.trim())
  if (activeRules.length === 0) {
    return ""
  }

  const formattedItems = activeRules
    .map((r, idx) => {
      const categoryLabel = r.category && RULE_CATEGORY_LABELS[r.category as RuleCategory] 
        ? ` (${RULE_CATEGORY_LABELS[r.category as RuleCategory]})` 
        : ""
      return `${idx + 1}. [Szabály: "${r.rule_name.trim()}"]${categoryLabel}\n   ${r.rule_prompt.trim()}`
    })
    .join("\n\n")

  return `
CÉG-SPECIFIKUS EGYEDI IKTATÁSI ÉS KÖNYVELÉSI SZABÁLYOK (KÖTELEZŐ PRIORITÁS):
Az alábbi szabályok a jelenlegi cég hivatalos, belső könyvelési és iratkezelési házirendjét képezik.
EZEK A SZABÁLYOK MINDEN ESETBEN FELÜLBÍRÁLJÁK AZ ÁLTALÁNOS OSZTÁLYOZÁSI LOGIKÁT!
Ha egy beérkező dokumentum vagy számla megfelel valamelyik szabály feltételének, kötelezően alkalmazd az abban leírtakat (tárgy, ügyirattípus, szervezeti egység, határidő, minősítés, megjegyzés)!
Ha szabályt alkalmaztál, az "indoklas" mezőben kötelezően hivatkozz a szabály nevére (pl. "Alkalmazott szabály: Telekom számlák").

${formattedItems}
`.trim()
}
