export interface TeamMember {
  id: string
  nev?: string
  email?: string
  telefonszam?: string | null
  avatar_url?: string | null
  szervezeti_egyseg_id?: string | null
  szervezeti_egyseg?: { nev?: string; megnevezes?: string } | null
  hr_munkakor?: { megnevezes?: string } | null
  beosztas?: string | null
  felhasznalo_profil?: { nev?: string | null; avatar_url?: string | null } | null
  [key: string]: any
}

export interface LeaveRecord {
  id: string
  user_id?: string
  felhasznalo_id?: string
  dolgozo_id?: string
  kezdete?: string
  vege?: string
  kezdet_datuma?: string
  veg_datuma?: string
  tipus: "szabadsag" | "betegszabadsag" | "beteg" | "fizetetlen" | "tanulmanyi" | "egyeb" | string
  statusz: "jovahagyva" | "fuggo" | "jovahagyasra_var" | "elutasitva" | string
  indoklas?: string | null
  munkanapok_szama?: number
  helyettes_user_id?: string | null
  helyettes?: { nev?: string } | null
  felhasznalo?: { nev?: string } | null
  created_at?: string
  [key: string]: any
}

export interface Candidate {
  id: string
  nev: string
  email?: string
  telefonszam?: string | null
  statusz: "uj" | "eloszurt" | "interju" | "ajanlat" | "elfogadva" | "elutasitva" | "talent_pool" | string
  megpalyazott_munkakor_id?: string | null
  allashirdetes_id?: string | null
  hr_munkakor?: { megnevezes?: string } | null
  hr_allashirdetes?: { cim?: string } | null
  oneletrajz_url?: string | null
  ertekeles?: number | null
  jegyzet?: string | null
  naptar_jegyzet?: string | null
  pozicio?: string | null
  ai_status?: string | null
  ai_summary?: string | null
  ai_relevance_score?: number | null
  ai_skills?: string[] | null
  gdpr_consent_until?: string | null
  created_at?: string
  [key: string]: any
}

export interface JobOption {
  id: string
  megnevezes: string
  [key: string]: any
}

export interface JobPosting {
  id: string
  munkakor_id?: string | null
  cim: string
  leiras?: string | null
  kovetelmenyek?: string | null
  bersav_min?: number | null
  bersav_max?: number | null
  statusz: "aktiv" | "lezart" | "piszkozat" | string
  aktiv?: boolean
  publikus?: boolean
  created_at?: string
  hr_munkakor?: { megnevezes?: string } | null
  jelentkezok_szama?: number
  [key: string]: any
}

export interface Employee {
  id: string
  nev: string
  email?: string
  telefonszam?: string | null
  avatar_url?: string | null
  munkakor_id?: string | null
  munkakor?: string | null
  hr_munkakor?: { megnevezes?: string; feor?: string } | null
  szervezeti_egyseg_id?: string | null
  szervezeti_egyseg?: { nev?: string; megnevezes?: string } | null
  felhasznalo_profil?: { nev?: string | null; avatar_url?: string | null; hr_szerepkor?: string | null } | null
  statusz?: "aktiv" | "inaktiv" | "kilepett" | string
  kezdes_datuma?: string | null
  adoazonosito?: string | null
  adoazonosito_jel?: string | null
  taj_szam?: string | null
  szuletesi_datum?: string | null
  munkaido_fte?: number | null
  kpis?: KpiItem[]
  [key: string]: any
}

export interface KpiItem {
  id: string
  megnevezes: string
  leiras?: string | null
  suly?: number | null
  cel_ertek?: number | null
  aktualis_ertek?: number | null
  pontszam?: number | null
  onertekeles_pontszam?: number | null
  onertekeles_szoveg?: string | null
  vezeto_ertekeles_szoveg?: string | null
  statusz?: string
  ciklus_id?: string | null
  dolgozo_id?: string
  szulo_kpi_id?: string | null
  mertekegyseg?: string | null
  created_at?: string
  [key: string]: unknown
}

export type PerformanceKpi = KpiItem

export interface PerformanceCycle {
  id: string
  megnevezes: string
  kezdes_datuma?: string
  zaras_datuma?: string
  kezdo_datum?: string
  befejezo_datum?: string
  statusz: "tervezett" | "aktiv" | "lezart" | "tervezes" | "nyitott" | "lezarva" | string
  [key: string]: any
}

export interface OnboardingTask {
  id: string
  cim?: string
  leiras?: string
  statusz: "pending" | "in_progress" | "done" | string
  felelos_user_id?: string | null
  felelos_reszleg?: string | null
  hatarido?: string | null
  sorrend?: number
  [key: string]: any
}

export interface OnboardingProfile {
  id: string
  dolgozo_id?: string | null
  nev: string
  email?: string | null
  pozicio?: string | null
  munkakor?: string | null
  kezdes_datuma?: string | null
  belepes_datuma?: string | null
  mentor_id?: string | null
  statusz: "folyamatban" | "befejezve" | "megszakitva" | string
  tasks?: OnboardingTask[]
  hr_onboarding_feladat?: OnboardingTask[]
  hr_toborzas?: { pozicio?: string; email?: string; [key: string]: any } | null
  [key: string]: any
}

export interface OffboardingTask {
  id: string
  leiras: string
  statusz: "pending" | "done" | string
  felelos_user_id?: string | null
  hatarido?: string | null
  [key: string]: any
}

export interface ExitInterview {
  id: string
  dolgozo_id?: string
  felhasznalo_profil?: { nev?: string | null } | null
  datum: string
  kilepes_oka?: string | null
  megjegyzes?: string | null
  elegedettseg_pontszam?: number | null
  vezeto_elegedettseg?: number | null
  csapat_elegedettseg?: number | null
  ber_elegedettseg?: number | null
  uj_allomashely?: string | null
  [key: string]: any
}

export interface OffboardingProfile {
  id: string
  dolgozo_id?: string
  nev?: string
  felhasznalo_profil?: { nev?: string | null } | null
  utolso_munkanap?: string | null
  statusz: "folyamatban" | "lezart" | string
  tasks?: OffboardingTask[]
  hr_offboarding_feladat?: OffboardingTask[]
  [key: string]: any
}

export interface OrgUnit {
  id: string
  nev: string
  kod?: string | null
  leiras?: string | null
  szulo_egyseg_id?: string | null
  vezeto_user_id?: string | null
  [key: string]: unknown
}
