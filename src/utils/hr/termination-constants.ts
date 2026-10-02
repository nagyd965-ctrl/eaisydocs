import { type CompanyDetails, DEFAULT_COMPANY_DETAILS } from "./employment-contract-constants"

export type TerminationType = 
  | "kozos_megegyezes" 
  | "munkaltatoi_felmondas" 
  | "munkavallaloi_felmondas" 
  | "azonnali_felmondas_probaido" 
  | "azonnali_felmondas_rendkivuli"

export const TERMINATION_TYPE_LABELS: Record<TerminationType, string> = {
  kozos_megegyezes: "Közös megegyezés (Mt. 64. § (1) bek. a) pont)",
  munkaltatoi_felmondas: "Munkáltatói felmondás (Mt. 64. § (1) bek. b) pont, Mt. 66. §)",
  munkavallaloi_felmondas: "Munkavállalói felmondás (Mt. 64. § (1) bek. b) pont, Mt. 67. §)",
  azonnali_felmondas_probaido: "Azonnali hatályú próbaidő alatt (Mt. 79. § (1) bek. a) pont)",
  azonnali_felmondas_rendkivuli: "Azonnali hatályú felmondás kötelezettségszegés miatt (Mt. 78. §)",
}

export const TERMINATION_SHORT_LABELS: Record<TerminationType, string> = {
  kozos_megegyezes: "Közös megegyezés",
  munkaltatoi_felmondas: "Munkáltatói felmondás",
  munkavallaloi_felmondas: "Munkavállalói felmondás",
  azonnali_felmondas_probaido: "Azonnali (próbaidő)",
  azonnali_felmondas_rendkivuli: "Azonnali felmondás",
}

export interface TerminationPdfData {
  employeeName: string
  employeeId?: string | null
  offboardingId?: string | null
  munkakor: string
  reszleg?: string | null
  szuletesiHely?: string | null
  szuletesiDatum?: string | null
  anyjaNeve?: string | null
  lakcim?: string | null
  adoazonosito?: string | null
  tajSzam?: string | null
  
  megszunesModja: TerminationType
  utolsoMunkanap: string
  utolsoMunkabanToltottNap?: string | null
  megszunesDatuma: string
  felmentesiIdoNap: number
  megvaltottSzabadsagNap: number
  vegkielegitesOsszeg: number
  indoklas?: string | null
  egyediZaradek?: string | null
  
  cegAdatok?: CompanyDetails
  iktatoszam?: string | null
  kelt?: string
}

export { DEFAULT_COMPANY_DETAILS }
