export type ContractType = 
  | "megbizasi" 
  | "nda" 
  | "keretszerzodes" 
  | "teljesites_igazolas" 
  | "egyedi"
  | (string & {})

export interface ContractParty {
  nev: string
  szekhely: string
  adoszam?: string | null
  kulfoldi_adoszam?: string | null
  cegjegyzekszam?: string | null
  kepviselo?: string | null
  bankszamlaszam?: string | null
  email?: string | null
  telefonszam?: string | null
}

export interface ContractClause {
  title: string
  content: string
}

export interface ContractTemplate {
  id: string
  type: ContractType
  name: string
  category: string
  description: string
  defaultTitle: string
  promptPlaceholder: string
  examplePrompts: string[]
  defaultClauses?: ContractClause[]
  isCustom?: boolean
  created_by?: string
  created_at?: string
}

export interface GenerateContractDraftParams {
  partnerId: string
  contractType: ContractType
  templateId?: string
  customPrompt: string
  title?: string
  effectiveDate?: string
  validityMonths?: number
  feeAmount?: number
  currency?: string
  customParams?: Record<string, any>
}

export interface ContractDraftResult {
  title: string
  contractType: ContractType
  megbizo: ContractParty
  megbizott: ContractParty
  sections: {
    number: number
    title: string
    paragraphs: string[]
  }[]
  fullText: string
  estimatedPages: number
  generatedAt: string
}

export interface FinalizeContractParams {
  partnerId: string
  title: string
  contractType: ContractType
  content: string
  dossierId?: string | null
  createNewDossier?: boolean
  dossierTitle?: string
  sendEmailToPartner?: boolean
  partnerEmail?: string
  emailSubject?: string
  emailMessage?: string
  megbizo?: ContractParty
  megbizott?: ContractParty
}
