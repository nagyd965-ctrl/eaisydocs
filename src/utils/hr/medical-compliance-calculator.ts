/**
 * Foglalkozás-egészségügyi (Orvosi Alkalmassági) Megfelelőségi Kalkulátor
 * Jogszabályi háttér: 1993. évi XCIII. tv. (Mvt. 49. § (1)) és 33/1998. (VI. 24.) NM rendelet
 */

export type MedicalComplianceStatus =
  | "ervenyes"
  | "hamarosan_lejar"
  | "lejart"
  | "hianyzik"
  | "nem_alkalmas"

export const MEDICAL_EXAM_TYPE_LABELS: Record<string, string> = {
  elozetes: "Előzetes (Munkába lépéskor)",
  idoszakos: "Időszakos (Éves / Kétéves)",
  soron_kivuli: "Soron kívüli",
  zaro: "Záró vizsgálat",
  alapadat: "Alapadatoknál rögzített",
}

export const MEDICAL_RESULT_LABELS: Record<string, string> = {
  alkalmas: "Alkalmas",
  fetelekkel_alkalmas: "Feltételekkel alkalmas",
  nem_alkalmas: "Nem alkalmas",
}

export interface EmployeeMedicalRecord {
  dolgozoId: string
  nev: string
  avatarUrl?: string | null
  szervezetiEgysegNev?: string | null
  munkakorMegnevezes?: string | null
  vizsgalatId?: string | null
  vizsgalatTipusa?: string | null
  vizsgalatDatuma?: string | null
  ervenyessegDatuma?: string | null
  eredmeny?: string | null
  orvosNeve?: string | null
  szakrendeles?: string | null
  megjegyzes?: string | null
  dokumentumId?: string | null
  iktatoszam?: string | null
  ugyiratId?: string | null
  fajlUrl?: string | null
}

export interface EmployeeMedicalComplianceItem extends EmployeeMedicalRecord {
  status: MedicalComplianceStatus
  daysRemaining: number | null
  statusLabel: string
}

export interface CompanyMedicalOverview {
  totalEmployees: number
  validCount: number
  expiringSoonCount: number
  expiredCount: number
  missingCount: number
  unfitCount: number
  expiredOrMissingCount: number
  compliancePercent: number
  items: EmployeeMedicalComplianceItem[]
}

/**
 * Számítja egy munkavállaló foglalkozás-egészségügyi alkalmasságának érvényességét
 * a megadott referencia dátumhoz (alapértelmezetten ma).
 */
export function calculateMedicalComplianceStatus(
  ervenyessegDatuma?: string | null,
  eredmeny?: string | null,
  refDate: string | Date = new Date()
): { status: MedicalComplianceStatus; daysRemaining: number | null; statusLabel: string } {
  if (eredmeny === "nem_alkalmas") {
    return {
      status: "nem_alkalmas",
      daysRemaining: null,
      statusLabel: "Nem alkalmas (Munkavégzés tiltva)",
    }
  }

  if (!ervenyessegDatuma) {
    return {
      status: "hianyzik",
      daysRemaining: null,
      statusLabel: "Nincs vizsgálat rögzítve",
    }
  }

  const today = typeof refDate === "string" ? new Date(refDate) : new Date(refDate)
  const todayNormalized = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))

  const exp = new Date(ervenyessegDatuma)
  const expNormalized = new Date(Date.UTC(exp.getFullYear(), exp.getMonth(), exp.getDate()))

  const diffMs = expNormalized.getTime() - todayNormalized.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return {
      status: "lejart",
      daysRemaining: diffDays,
      statusLabel: `Lejárt (${Math.abs(diffDays)} napja)`,
    }
  }

  if (diffDays <= 30) {
    return {
      status: "hamarosan_lejar",
      daysRemaining: diffDays,
      statusLabel: diffDays === 0 ? "Ma jár le!" : `Hamarosan lejár (${diffDays} nap)`,
    }
  }

  return {
    status: "ervenyes",
    daysRemaining: diffDays,
    statusLabel: `Érvényes (${diffDays} nap van hátra)`,
  }
}

/**
 * Cégszintű összesítés készítése az összes munkatárs orvosi alkalmassági adataiból.
 */
export function calculateCompanyMedicalOverview(
  employees: EmployeeMedicalRecord[],
  refDate: string | Date = new Date()
): CompanyMedicalOverview {
  let validCount = 0
  let expiringSoonCount = 0
  let expiredCount = 0
  let missingCount = 0
  let unfitCount = 0

  const items: EmployeeMedicalComplianceItem[] = employees.map((emp) => {
    const calc = calculateMedicalComplianceStatus(emp.ervenyessegDatuma, emp.eredmeny, refDate)
    if (calc.status === "ervenyes") validCount++
    else if (calc.status === "hamarosan_lejar") expiringSoonCount++
    else if (calc.status === "lejart") expiredCount++
    else if (calc.status === "hianyzik") missingCount++
    else if (calc.status === "nem_alkalmas") unfitCount++

    return {
      ...emp,
      status: calc.status,
      daysRemaining: calc.daysRemaining,
      statusLabel: calc.statusLabel,
    }
  })

  const totalEmployees = employees.length
  const expiredOrMissingCount = expiredCount + missingCount + unfitCount
  const compliancePercent =
    totalEmployees > 0 ? Math.round(((validCount + expiringSoonCount) / totalEmployees) * 100) : 100

  return {
    totalEmployees,
    validCount,
    expiringSoonCount,
    expiredCount,
    missingCount,
    unfitCount,
    expiredOrMissingCount,
    compliancePercent,
    items,
  }
}
