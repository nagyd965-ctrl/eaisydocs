export interface SafetyTrainingPdfData {
  employeeName: string
  employeeId?: string | null
  onboardingId?: string | null
  munkakor: string
  reszleg?: string | null
  szuletesiDatum?: string | null
  szuletesiHely?: string | null
  anyjaNeve?: string | null
  lakcim?: string | null
  oktatasDatuma: string
  oktatasTipusa?: string | null
  oktatoNeve: string
  oktatoBeosztasa?: string | null
  iktatoszam?: string | null
  cegNev: string
  cegSzekhely: string
  cegAdoszam: string
  cegKepviselo: string
  tematika?: string[] | null
  megjegyzes?: string | null
}

export const DEFAULT_SAFETY_TOPICS = [
  "Általános munkavédelmi ismeretek, a munkáltató és munkavállaló alapvető jogai és kötelezettségei (1993. évi XCIII. tv. - Mvt. 54–60. §).",
  "A munkakörhöz kapcsolódó fizikai, ergonómiai és pszichoszociális kockázatok, a képernyős munkavégzés szabályai (50/1999. EüM rendelet).",
  "Munkahelyi balesetek, rosszullétek és veszélyhelyzetek haladéktalan bejelentésének rendje, elsősegélynyújtó helyek és kijelölt elsősegélynyújtók.",
  "Tűzvédelmi Szabályzat és Házirend rendelkezései, tűzveszélyességi osztályok, dohányzási tilalom és dohányzásra kijelölt helyek (1996. évi XXXI. tv. - Ttv.).",
  "Tűzjelzés menete (112 segélyhívó), a munkahely kiürítési és menekülési útvonalai, vészkijáratok és külső gyülekezőhelyek (OTSZ).",
  "Kézi tűzoltó készülékek (porral/habbal/CO2-vel oltók) fali elhelyezése, felülvizsgálata és rendeltetésszerű használata vészhelyzetben.",
  "Munkahelyi rend, tisztaság, villamos berendezések és IT eszközök biztonságos üzemeltetése, kábelvezetési szabályok."
]

export const TRAINING_TYPE_LABELS: Record<string, string> = {
  elozetes_munkaba_allasi: "Előzetes munkába állási oktatás (Onboarding)",
  idoszakos_ismetlo: "Éves időszakos ismétlő oktatás",
  rendkivuli: "Rendkívüli oktatás (technológiaváltás / baleset után)",
  munkakor_valtozas: "Munkakör vagy munkahely változása miatti oktatás"
}
