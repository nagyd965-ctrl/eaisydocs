/**
 * eaisyHR: Munkaidőkorlátok (Mt. 99. §) és Éves Túlórakeret (Mt. 135. §) Számító Motor
 * 
 * Jogszabályi hivatkozások:
 * - Mt. 99. §: Heti maximális munkaidő legfeljebb 48 óra (rendes + rendkívüli munkaidő együtt).
 * - Mt. 135. §: Éves rendkívüli munkaidő (túlóra) keret:
 *     - Alapesetben: legfeljebb 250 óra / naptári év.
 *     - Önként vállalt túlmunka megállapodás esetén: legfeljebb 400 óra / naptári év.
 */

export type OvertimeQuotaStatusLevel = "normal" | "warning" | "exceeded"

export interface OvertimeQuotaStatus {
  annualLimit: 250 | 400
  workedHours: number
  remainingHours: number
  percentage: number
  status: OvertimeQuotaStatusLevel
}

export type WeeklyHoursLevel = "normal" | "overtime" | "limit" | "illegal"

export interface WeeklyHoursCompliance {
  weeklyHours: number
  isOver40: boolean
  isOver48: boolean
  level: WeeklyHoursLevel
  message?: string
}

export interface DailyOvertimeResult {
  workedHours: number
  scheduledHours: number
  overtimeHours: number
}

export interface ShiftAssignmentOvertimeRisk {
  currentWeeklyHours: number
  additionalShiftHours: number
  newWeeklyHours: number
  wouldExceedWeekly48h: boolean
  isAnnualOvertimeExceeded: boolean
  isAnnualOvertimeNearLimit: boolean
  warningMessage?: string
}

export interface EmployeeOvertimeComplianceRecord {
  dolgozoId: string
  nev: string
  avatarUrl: string | null
  szervezetiEgysegNev: string
  munkakorMegnevezes: string
  // Heti adatok (aktuális naptári hét)
  weeklyPlannedHours: number
  weeklyActualHours: number
  weeklyCompliance: WeeklyHoursCompliance
  // Éves túlóra adatok (aktuális naptári év)
  year: number
  annualLimit: 250 | 400
  hasVoluntaryAgreement: boolean
  agreementDate: string | null
  workedOvertimeHours: number
  remainingHours: number
  percentage: number
  quotaStatus: OvertimeQuotaStatusLevel
}

export interface CompanyOvertimeComplianceOverview {
  year: number
  currentWeekStart: string
  currentWeekEnd: string
  totalEmployees: number
  exceeded48hCount: number
  nearOvertimeLimitCount: number
  exceededOvertimeLimitCount: number
  voluntaryAgreementCount: number
  totalCompanyOvertimeHours: number
  records: EmployeeOvertimeComplianceRecord[]
}

/**
 * Mt. 135. § szerinti éves túlórakeret meghatározása
 * @param hasVoluntaryAgreement Dolgozóval kötött írásbeli megállapodás önként vállalt túlmunkára
 */
export function determineAnnualOvertimeLimit(hasVoluntaryAgreement?: boolean): 250 | 400 {
  return hasVoluntaryAgreement ? 400 : 250
}

/**
 * Éves túlórakeret kihasználtság és riasztási státusz kiszámítása
 * - 0% – 79%: normal (zöld)
 * - 80% – 99%: warning (sárga küszöb)
 * - 100%+: exceeded (piros riasztás)
 */
export function calculateOvertimeQuotaStatus(
  workedOvertimeHours: number,
  annualLimit: number = 250
): OvertimeQuotaStatus {
  const safeLimit = annualLimit > 0 ? annualLimit : 250
  const safeWorked = Math.max(0, workedOvertimeHours)
  const percentage = Number(((safeWorked / safeLimit) * 100).toFixed(1))
  const remainingHours = Math.max(0, Number((safeLimit - safeWorked).toFixed(1)))

  let status: OvertimeQuotaStatusLevel = "normal"
  if (percentage >= 100) {
    status = "exceeded"
  } else if (percentage >= 80) {
    status = "warning"
  }

  return {
    annualLimit: safeLimit as 250 | 400,
    workedHours: Number(safeWorked.toFixed(1)),
    remainingHours,
    percentage,
    status,
  }
}

/**
 * Mt. 99. § szerinti heti munkaidő megfelelőség vizsgálata (tervezett vagy tény órákra)
 */
export function checkWeeklyHoursCompliance(weeklyHours: number): WeeklyHoursCompliance {
  const isOver48 = weeklyHours > 48
  const isLimit48 = weeklyHours === 48
  const isOver40 = weeklyHours > 40 && !isOver48

  let level: WeeklyHoursLevel = "normal"
  let message: string | undefined

  if (isOver48) {
    level = "illegal"
    message = `A heti munkaidő (${weeklyHours} óra) meghaladja a törvényes heti 48 órás Mt. felső határt!`
  } else if (isLimit48) {
    level = "limit"
    message = `A heti munkaidő (${weeklyHours} óra) elérte a törvényes heti 48 órás felső plafont.`
  } else if (isOver40) {
    level = "overtime"
    const diff = Number((weeklyHours - 40).toFixed(1))
    message = `A heti munkaidő (${weeklyHours} óra) ${diff} óra túlórát tartalmaz.`
  }

  return {
    weeklyHours,
    isOver40: isOver40 || isLimit48,
    isOver48,
    level,
    message,
  }
}

/**
 * Napi túlóra kiszámítása a tényleges jelenlétből és a beosztásból
 */
export function calculateDailyOvertimeFromAttendance(input: {
  checkIn: string | null
  checkOut: string | null
  scheduledHours?: number | null
  isRestDay?: boolean
}): DailyOvertimeResult {
  if (!input.checkIn || !input.checkOut) {
    return {
      workedHours: 0,
      scheduledHours: input.scheduledHours ?? 8.0,
      overtimeHours: 0,
    }
  }

  const inDate = new Date(input.checkIn)
  const outDate = new Date(input.checkOut)
  const diffHours = Math.max(0, (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60))
  const workedHours = Math.round(diffHours * 100) / 100

  // Ha pihenőnapi munkavégzés történt, minden ledolgozott perc túlóra (rendkívüli munkaidő)
  if (input.isRestDay) {
    return {
      workedHours,
      scheduledHours: 0,
      overtimeHours: workedHours,
    }
  }

  const scheduled = input.scheduledHours !== undefined && input.scheduledHours !== null
    ? input.scheduledHours
    : 8.0

  const overtimeHours = Math.max(0, Math.round((workedHours - scheduled) * 100) / 100)

  return {
    workedHours,
    scheduledHours: scheduled,
    overtimeHours,
  }
}

/**
 * Műszaktervező popover kockázatelemzés műszak hozzárendelés előtt
 */
export function validateShiftAssignmentOvertimeRisk(params: {
  currentWeeklyPlannedHours: number
  additionalShiftHours: number
  annualOvertimeHours: number
  annualLimit: number
}): ShiftAssignmentOvertimeRisk {
  const currentWeeklyHours = params.currentWeeklyPlannedHours
  const additionalShiftHours = params.additionalShiftHours
  const newWeeklyHours = currentWeeklyHours + additionalShiftHours
  const wouldExceedWeekly48h = newWeeklyHours > 48

  const quota = calculateOvertimeQuotaStatus(params.annualOvertimeHours, params.annualLimit)
  const isAnnualOvertimeExceeded = quota.status === "exceeded"
  const isAnnualOvertimeNearLimit = quota.status === "warning"

  let warningMessage: string | undefined
  if (wouldExceedWeekly48h) {
    warningMessage = `Ezzel a műszakkal a heti munkaidő ${newWeeklyHours} órára nő, ami meghaladja a törvényes 48 órás Mt. felső határt!`
  } else if (isAnnualOvertimeExceeded) {
    warningMessage = `A dolgozó éves túlórakerete kimerült (${params.annualOvertimeHours}h / ${params.annualLimit}h)! További túlóra jogellenes.`
  } else if (isAnnualOvertimeNearLimit) {
    warningMessage = `A dolgozó éves túlórakerete elérte a 80%-os küszöböt (${params.annualOvertimeHours}h / ${params.annualLimit}h).`
  }

  return {
    currentWeeklyHours,
    additionalShiftHours,
    newWeeklyHours,
    wouldExceedWeekly48h,
    isAnnualOvertimeExceeded,
    isAnnualOvertimeNearLimit,
    warningMessage,
  }
}
