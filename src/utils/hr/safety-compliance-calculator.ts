/**
 * Munkavédelmi és Tűzvédelmi Oktatási Megfelelőségi Kalkulátor
 * Jogszabályi háttér: 1993. évi XCIII. tv. (Mvt. 55. §) és 1996. évi XXXI. tv. (Ttv. 22. §)
 */

export type SafetyTrainingStatus = "ervenyess" | "hamarosan_lejar" | "lejart" | "hianyzik"

export interface EmployeeSafetyRecord {
  dolgozoId: string
  nev: string
  avatarUrl?: string | null
  szervezetiEgysegNev?: string | null
  munkakorMegnevezes?: string | null
  oktatasId?: string | null
  oktatasTipusa?: string | null
  oktatasDatuma?: string | null
  ervenyessegVege?: string | null
  oktatoNeve?: string | null
  dokumentumId?: string | null
  iktatoszam?: string | null
  ugyiratId?: string | null
  documentUrl?: string | null
}

export interface EmployeeSafetyComplianceItem extends EmployeeSafetyRecord {
  status: SafetyTrainingStatus
  daysRemaining: number | null
  statusLabel: string
}

export interface CompanySafetyOverview {
  totalEmployees: number
  validCount: number
  expiringSoonCount: number
  expiredCount: number
  missingCount: number
  expiredOrMissingCount: number
  compliancePercent: number
  items: EmployeeSafetyComplianceItem[]
}

/**
 * Számítja egy munkavállaló munkavédelmi oktatásának érvényességét a megadott referencia dátumhoz (alapértelmezetten ma).
 */
export function calculateSafetyTrainingStatus(
  ervenyessegVege?: string | null,
  refDate: string | Date = new Date()
): { status: SafetyTrainingStatus; daysRemaining: number | null; statusLabel: string } {
  if (!ervenyessegVege) {
    return {
      status: "hianyzik",
      daysRemaining: null,
      statusLabel: "Nincs oktatás rögzítve",
    }
  }

  const today = typeof refDate === "string" ? new Date(refDate) : new Date(refDate)
  // Normalizálás éjfélre az időzóna-csúszások elkerülésére
  const todayNormalized = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))

  const exp = new Date(ervenyessegVege)
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
    status: "ervenyess",
    daysRemaining: diffDays,
    statusLabel: `Érvényes (${diffDays} nap van hátra)`,
  }
}

/**
 * Cégszintű összesítés készítése az összes munkatárs munkavédelmi oktatási adataiból.
 */
export function calculateCompanySafetyOverview(
  employees: EmployeeSafetyRecord[],
  refDate: string | Date = new Date()
): CompanySafetyOverview {
  let validCount = 0
  let expiringSoonCount = 0
  let expiredCount = 0
  let missingCount = 0

  const items: EmployeeSafetyComplianceItem[] = employees.map((emp) => {
    const calc = calculateSafetyTrainingStatus(emp.ervenyessegVege, refDate)
    if (calc.status === "ervenyess") validCount++
    else if (calc.status === "hamarosan_lejar") expiringSoonCount++
    else if (calc.status === "lejart") expiredCount++
    else if (calc.status === "hianyzik") missingCount++

    return {
      ...emp,
      status: calc.status,
      daysRemaining: calc.daysRemaining,
      statusLabel: calc.statusLabel,
    }
  })

  const totalEmployees = employees.length
  const expiredOrMissingCount = expiredCount + missingCount
  const compliancePercent =
    totalEmployees > 0 ? Math.round((validCount / totalEmployees) * 100) : 100

  return {
    totalEmployees,
    validCount,
    expiringSoonCount,
    expiredCount,
    missingCount,
    expiredOrMissingCount,
    compliancePercent,
    items,
  }
}
