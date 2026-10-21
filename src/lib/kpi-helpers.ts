export const WORKFLOW_STEPS = [
  { key: "celkituzes", label: "Célkitűzés", shortLabel: "Cél", description: "Rögzítve" },
  { key: "onertekeles", label: "Önértékelés", shortLabel: "Önért.", description: "Dolgozói Portál" },
  { key: "vezetoi_ertekeles", label: "Vezetői értékelés", shortLabel: "Vez. ért.", description: "Vezetői visszajelzés" },
  { key: "megbeszeles", label: "Megbeszélés", shortLabel: "Megbesz.", description: "Személyes egyeztetés" },
  { key: "lezart", label: "Lezárva", shortLabel: "Lezárt", description: "Hitelesített lezárás" },
] as const

export type WorkflowPhase = typeof WORKFLOW_STEPS[number]["key"]

export function getStepIndex(phase: string): number {
  const idx = WORKFLOW_STEPS.findIndex(s => s.key === phase)
  return idx >= 0 ? idx : 0
}

/** Utility: derive the workflow phase from existing data if the DB field is missing */
export function deriveWorkflowPhase(kpi: {
  workflow_fazis?: string | null
  onertekeles_szovege?: string | null
  ertekeles_szovege?: string | null
  ertekeles_lezarva_datum?: string | null
  megbeszeles_datum?: string | null
}): WorkflowPhase {
  if (kpi.workflow_fazis) return kpi.workflow_fazis as WorkflowPhase
  
  if (kpi.ertekeles_lezarva_datum) return "lezart"
  if (kpi.megbeszeles_datum) return "megbeszeles"
  if (kpi.ertekeles_szovege) return "vezetoi_ertekeles"
  if (kpi.onertekeles_szovege) return "onertekeles"
  return "celkituzes"
}

/** Utility: return human-readable unit abbreviation for KPI metric type */
export function getMetricUnitLabel(type?: string | null): string {
  switch (type) {
    case "szam":
      return "db"
    case "osszeg":
      return "Ft"
    case "szazalek":
      return "%"
    case "skala":
      return "pont"
    default:
      return ""
  }
}

/** Utility: format target and actual value as a badge label */
export function formatKpiTargetBadge(kpi: {
  meroszam_tipusa?: string | null
  cel_ertek?: number | null
  aktualis_ertek?: number | null
}): string | null {
  const type = kpi.meroszam_tipusa
  if (!type || type === "igen_nem" || kpi.cel_ertek === null || kpi.cel_ertek === undefined) {
    return null
  }

  const target = Number(kpi.cel_ertek)
  const current = kpi.aktualis_ertek !== null && kpi.aktualis_ertek !== undefined ? Number(kpi.aktualis_ertek) : null
  const hasCurrent = current !== null && current > 0

  switch (type) {
    case "szam":
      return hasCurrent ? `${current} / ${target} db` : `Cél: ${target} db`
    case "osszeg": {
      const nf = new Intl.NumberFormat("hu-HU")
      return hasCurrent ? `${nf.format(current)} / ${nf.format(target)} Ft` : `Cél: ${nf.format(target)} Ft`
    }
    case "szazalek":
      return hasCurrent ? `${current}% / ${target}%` : `Cél: ${target}%`
    case "skala":
      return hasCurrent ? `${current} / ${target} pont` : `Cél: ${target}/10 pont`
    default:
      return hasCurrent ? `${current} / ${target}` : `Cél: ${target}`
  }
}

/** Utility: format just the target value with its unit */
export function formatKpiTargetOnly(kpi: {
  meroszam_tipusa?: string | null
  cel_ertek?: number | null
}): string | null {
  const type = kpi.meroszam_tipusa
  if (!type || type === "igen_nem" || kpi.cel_ertek === null || kpi.cel_ertek === undefined) {
    return null
  }
  const target = Number(kpi.cel_ertek)
  switch (type) {
    case "szam":
      return `${target} db`
    case "osszeg":
      return `${new Intl.NumberFormat("hu-HU").format(target)} Ft`
    case "szazalek":
      return `${target}%`
    case "skala":
      return `${target}/10 pont`
    default:
      return `${target}`
  }
}

/** Utility: return human-readable labels and placeholder for target and actual values based on metric type */
export function getMetricFieldLabels(type?: string | null) {
  switch (type) {
    case "osszeg":
      return {
        target: "Kitűzött összeg",
        actual: "Elért összeg",
        unit: "Ft",
        placeholder: "pl. 200 000",
      }
    case "szam":
      return {
        target: "Kitűzött darabszám",
        actual: "Elért darabszám",
        unit: "db",
        placeholder: "pl. 10",
      }
    case "szazalek":
      return {
        target: "Kitűzött célérték",
        actual: "Elért százalék",
        unit: "%",
        placeholder: "pl. 100",
      }
    case "skala":
      return {
        target: "Kitűzött pontszám",
        actual: "Elért pontszám",
        unit: "pont",
        placeholder: "pl. 8",
      }
    default:
      return {
        target: "Kitűzött cél",
        actual: "Elért eredmény",
        unit: "",
        placeholder: "",
      }
  }
}

/** Utility: format numeric value according to its metric type */
export function formatMetricValue(value: number | null | undefined, type?: string | null): string {
  if (value === null || value === undefined) return "—"
  const num = Number(value)
  if (isNaN(num)) return "—"
  if (type === "osszeg") {
    return `${new Intl.NumberFormat("hu-HU").format(num)} Ft`
  }
  if (type === "szam") {
    return `${num} db`
  }
  if (type === "szazalek") {
    return `${num}%`
  }
  if (type === "skala") {
    return `${num} pont`
  }
  return String(num)
}

