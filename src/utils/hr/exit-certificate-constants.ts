import { type CompanyDetails, DEFAULT_COMPANY_DETAILS } from "./employment-contract-constants"

export interface ExitCertificatePdfData {
  employeeName: string
  employeeId?: string | null
  offboardingId?: string | null
  munkakor: string
  feorKod?: string | null
  reszleg?: string | null
  szuletesiHely?: string | null
  szuletesiDatum?: string | null
  anyjaNeve?: string | null
  lakcim?: string | null
  adoazonosito?: string | null
  tajSzam?: string | null

  jogviszonyKezdete?: string | null
  jogviszonyVege: string
  megszunesModja: string
  megszunesModjaLabel?: string

  // Munkabérből történő levonások (Mt. 80. § (2))
  levonasok: string // pl. "A munkavállaló munkabérét végrehajtói vagy egyéb bírósági letiltás, gyermektartásdíj nem terheli."
  vanLevonas: boolean
  levonasReszletek?: string | null

  // Tárgyévi igénybe vett betegszabadság (1-15 nap)
  betegszabadsagNapok: number

  // Végkielégítés összege
  vegkielegitesOsszeg: number

  // Átvétel módja
  atvetelModja: "szemelyes" | "postai"
  postaiAzonosito?: string | null

  // Kiadott iratok listája
  kiadottIratok?: string[]

  cegAdatok?: CompanyDetails
  iktatoszam?: string | null
  kelt?: string
}

export const DEFAULT_EXIT_DOCUMENTS = [
  "Munkáltatói Igazolás a munkaviszony megszűnésekor (Mt. 80. § (2))",
  "Igazolólap az álláskeresési járadék és segély megállapításához (Flt. 36/A. §)",
  "Jövedelemigazolás egészségbiztosítási ellátás megállapításához (TB kiskönyv bejegyzés)",
  "Adatlap a személyi jövedelemadó és járulékok levonásáról a tárgyévben (NAV Adóadatlap)",
  "Nyilatkozat a munkabérből történő tartozásokról és bírósági végrehajtói letiltásokról"
]

export { DEFAULT_COMPANY_DETAILS }
