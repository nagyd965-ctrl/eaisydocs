export interface IratFajl {
  id: string
  irat_id?: string
  storage_path: string
  eredeti_fajlnev: string
  meret_byte?: number
  mime_type?: string
  verzio?: number
  sha256?: string
  created_at?: string
  ocr_szoveg?: string | null
}

export interface IratKolcsonzesLog {
  id: string
  irat_id?: string
  statusz: "kikolcsonozve" | "visszahozva" | string
  kolcsonvevo_user_id?: string
  kolcsonvevo_nev?: string | null
  kolcsonzes_datuma?: string
  visszahozatal_datuma?: string | null
}

export interface IratListItem {
  id: string
  targy: string
  erkeztetoszam?: string | null
  irany?: "bejovo" | "kimeno" | "belso" | string
  minosites?: string
  erkezes_datuma?: string | null
  kuldo_partner?: { nev?: string } | null
  irat_fajl?: IratFajl[]
  irat_kolcsonzes_naplo?: IratKolcsonzesLog[]
  fizikai_tarolas_helye?: string | null
}

export interface PartnerSuggestion {
  id: string
  nev: string
  adoszam?: string | null
  email?: string | null
  telefonszam?: string | null
  cim?: string | null
  tipus?: "ceg" | "maganszemely" | "egyeni_vallalkozo" | "intezmeny" | string
}
