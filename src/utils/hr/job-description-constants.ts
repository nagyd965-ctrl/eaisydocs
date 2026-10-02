export interface JobDescriptionPdfData {
  employeeName: string
  munkakor: string
  feorKod?: string | null
  reszleg?: string | null
  jogviszonyKezdete?: string | null
  hetiMunkaidoOra?: number | null
  szerzodesTipus?: "határozatlan" | "határozott" | string
  vezetoNev?: string | null
  leiras?: string | null
  feladatok?: string[]
  kompetenciak?: string[]
  orvosiVizsgalat?: string | null
  vedoeszkoz?: string | null
  cegNev?: string
  cegCim?: string
  cegAdoszam?: string
  iktatoszam?: string | null
  iktatvaEkor?: string | null
  kelt?: string
}

export const DEFAULT_JOB_TASKS: string[] = [
  "A munkakörhöz tartozó szakmai feladatok önálló, felelősségteljes és határidőre történő ellátása a vonatkozó jogszabályok és belső utasítások szerint.",
  "Rendszeres együttműködés és proaktív kommunikáció a társaság belső társosztályaival és a közvetlen szakmai vezetővel.",
  "A munkavégzéshez kapcsolódó adminisztratív nyilvántartások, adatok és rendszerek folyamatos, pontos és naprakész vezetése.",
  "A társaság minőségbiztosítási, munkavédelmi, tűzvédelmi és adatvédelmi (GDPR) szabályzatainak szigorú betartása.",
  "A közvetlen felettes vezető által meghatározott eseti feladatok és rendkívüli intézkedések haladéktalan végrehajtása."
]

export const DEFAULT_JOB_COMPETENCIES: string[] = [
  "Szakirányú végzettség és/vagy releváns szakmai tapasztalat",
  "Nagyfokú megbízhatóság, önállóság és felelősségteljes munkavégzés",
  "Jó problémamegoldó és kommunikációs készség",
  "Digitális rendszerek, irodai szoftverek és vállalatirányítási eszközök magabiztos kezelése",
  "Csapatszellem és együttműködési hajlandóság"
]
