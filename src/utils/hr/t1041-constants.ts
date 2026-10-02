export interface T1041PdfData {
  bejelentesTipus: "U" | "V" | "T"
  employeeName: string
  tajSzam?: string | null
  adoazonositoJel?: string | null
  munkakor?: string | null
  feorKod?: string | null
  reszleg?: string | null
  jogviszonyKezdete?: string | null
  jogviszonyVege?: string | null
  valtozasDatuma?: string | null
  valtozasJellege?: string | null
  hetiMunkaidoOra?: number | null
  szuletesiHely?: string | null
  szuletesiDatum?: string | null
  anyjaNeve?: string | null
  lakcim?: string | null
  bekuldesDatuma?: string | null
  cegNev?: string
  cegCim?: string
  cegAdoszam?: string
  iktatoszam?: string | null
  iktatvaEkor?: string | null
  megjegyzes?: string | null
}

export const T1041_TYPE_LABELS: Record<string, string> = {
  U: "Új biztosítotti bejelentés (U)",
  V: "Változás bejelentése (V)",
  T: "Biztosítási jogviszony törlése / Kijelentés (T)"
}
