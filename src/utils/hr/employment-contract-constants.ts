export interface CompanyDetails {
  nev: string
  szekhely: string
  adoszam: string
  cegjegyzekszam: string
  kepviselo: string
}

export interface EmploymentContractPdfData {
  id?: string
  contractNumber: string
  employeeName: string
  szuletesiHely?: string | null
  szuletesiDatum?: string | null
  anyjaNeve?: string | null
  lakcim?: string | null
  adoazonositoJel?: string | null
  tajSzam?: string | null
  bankszamlaszam?: string | null
  munkakor: string
  reszleg?: string | null
  kezdesDatuma: string
  szerzodesTipusa: "hatarozatlan" | "hatarozott"
  hatarozottLejarat?: string | null
  munkaidoTipus: "teljes" | "reszmunkaido"
  napiMunkaidoOra: number
  probaidoHonap: number
  alapber: number
  munkavegzesHelye: string
  tavmunkaMegallapodas?: boolean
  cegAdatok: CompanyDetails
  iktatoszam?: string | null
  iktatvaEkor?: string | null
  isDraft?: boolean
}

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  hatarozatlan: "Határozatlan idejű",
  hatarozott: "Határozott idejű",
}

export const WORK_TIME_LABELS: Record<string, string> = {
  teljes: "Teljes munkaidő (napi 8 óra, heti 40 óra)",
  reszmunkaido: "Részmunkaidő",
}

export const DEFAULT_COMPANY_DETAILS = {
  nev: "eaisyDocs Szolgáltató Zrt.",
  szekhely: "1117 Budapest, Infopark sétány 1.",
  adoszam: "28491029-2-41",
  cegjegyzekszam: "01-10-149201",
  kepviselo: "Nagy Dániel Vezérigazgató",
}
