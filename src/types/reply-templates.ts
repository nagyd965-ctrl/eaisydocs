export type ReplyTemplateCategory =
  | "hivatalos"
  | "penzugy"
  | "tajekoztatas"
  | "hianypotlas"
  | "szerzodes"
  | "egyedi"

export interface ReplyTemplate {
  id: string
  nev: string
  kategoria: ReplyTemplateCategory
  targy: string
  description?: string
  tartalom: string
  isCustom?: boolean
  created_by?: string
  created_at?: string
}

export interface ReplyCategoryDefinition {
  id: ReplyTemplateCategory
  nev: string
  shortLabel: string
  badgeClass: string
}
