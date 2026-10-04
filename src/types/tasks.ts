export type TaskCategory = "penzugy" | "szerzodes" | "szallitmanyozas" | "hr" | "egyeb"

export type TaskPriority = "alacsony" | "normal" | "magas" | "surgos"

export type TaskStatus = "nyitott" | "folyamatban" | "varakozik" | "kesz" | "elutasitott"

export interface TaskTemplate {
  id: string
  cim: string
  kategoria: TaskCategory
  leiras?: string
  alapertelmezett_hatarido_nap: number
  prioritas: TaskPriority
  isCustom?: boolean
  created_by?: string
  created_at?: string
}

export interface Task {
  id: string
  ugyirat_id?: string | null
  felelos_user_id: string
  leiras: string
  reszletek?: string | null
  hatarido: string
  allapot: TaskStatus | string
  kategoria?: TaskCategory | string | null
  prioritas?: TaskPriority | string | null
  indoklas?: string | null
  created_at?: string
  updated_at?: string
  ugyirat?: {
    id: string
    iktatoszam: string
  } | null
}
