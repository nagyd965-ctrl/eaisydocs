export interface ShiftTemplate {
  id: string
  company_id: string
  kod: string
  megnevezes: string
  kezdes_ido: string // "HH:MM:SS"
  befejezes_ido: string // "HH:MM:SS"
  munkaora: number
  szunet_perc: number
  szin_kod: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface ShiftAssignment {
  id: string
  company_id: string
  dolgozo_id: string
  datum: string // "YYYY-MM-DD"
  sablon_id: string | null
  egyedi_kezdes?: string | null
  egyedi_befejezes?: string | null
  tervezett_ora: number
  megjegyzes?: string | null
  statusz: "tervezett" | "jovahagyva" | "lezart"
  sablon?: ShiftTemplate | null
  created_at?: string
  updated_at?: string
}

export interface ShiftPlannerEmployee {
  id: string
  nev: string
  avatar_url?: string | null
  munkakor: string
  szervezeti_egyseg_id: string | null
  szervezeti_egyseg_nev: string | null
  orvosi_ervenyesseg?: string | null // "YYYY-MM-DD"
  orvosi_statusz?: "ervenyes" | "lejar_hamarosan" | "lejart" | "nincs_adat"
}

export interface ShiftDayLeave {
  id: string
  dolgozo_id: string
  tipus: string // "szabadsag", "tappenz", etc.
  kezdet_datuma: string
  veg_datuma: string
  statusz: string
}

export interface WeeklyRosterData {
  weekStart: string // "YYYY-MM-DD" (Monday)
  weekEnd: string // "YYYY-MM-DD" (Sunday)
  templates: ShiftTemplate[]
  employees: ShiftPlannerEmployee[]
  assignments: ShiftAssignment[]
  leaves: ShiftDayLeave[]
}
