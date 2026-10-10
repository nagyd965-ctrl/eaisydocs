import { calculateWorkingDays } from "./leave-calculator"

export interface LeaveRecordInput {
  kezdet_datuma: string // YYYY-MM-DD
  veg_datuma: string // YYYY-MM-DD
  tipus: string // "szabadsag", "betegszabadsag", etc.
  statusz: string // "jovahagyva", "jovahagyasra_var", "elutasitva"
}

export interface ShiftRecordInput {
  datum: string // YYYY-MM-DD
  tervezett_ora?: number | null
}

export interface ConsecutiveBlock {
  startDate: string
  endDate: string
  days: number
  hasVacation: boolean
}

export interface ConsecutiveLeaveResult {
  isFulfilled: boolean
  status: "teljesitve" | "betervezve" | "megallapodas_alapjan_mentes" | "nem_teljesult"
  maxConsecutiveDays: number
  longestBlock: ConsecutiveBlock | null
  pendingMaxConsecutiveDays: number
  longestPendingBlock: ConsecutiveBlock | null
  hasWaiver: boolean
}

export interface YearEndLeaveRiskResult {
  remainingDays: number
  remainingWorkingDays: number
  riskLevel: "rendben" | "figyelmeztetes" | "kritikus"
  isNovemberAlertActive: boolean
  statusLabel: string
  ratioPercent: number
}

export interface EmployeeComplianceSummary {
  dolgozoId: string
  nev: string
  szervezetiEgysegId?: string | null
  szervezetiEgysegNev?: string | null
  munkakorMegnevezes?: string | null
  avatarUrl?: string | null
  hasWaiver: boolean
  totalLeave: number
  usedLeave: number
  plannedLeave: number
  remainingLeave: number
  consecutiveResult: ConsecutiveLeaveResult
  riskResult: YearEndLeaveRiskResult
}

export interface CompanyComplianceOverview {
  year: number
  totalEmployees: number
  fulfilled14DaysCount: number
  waiverCount: number
  missing14DaysCount: number
  totalRemainingDays: number
  criticalRiskCount: number
  warningRiskCount: number
  employees: EmployeeComplianceSummary[]
}

/**
 * Segédfüggvény: Legenerálja egy naptári év összes napját 'YYYY-MM-DD' formátumban.
 */
export function getDaysOfYear(year: number): string[] {
  const days: string[] = []
  const start = new Date(Date.UTC(year, 0, 1))
  const end = new Date(Date.UTC(year, 11, 31))

  const cur = new Date(start)
  while (cur <= end) {
    days.push(cur.toISOString().split("T")[0])
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return days
}

/**
 * Mt. 122. § (3) szerinti 14 napos egybefüggő mentesülés ellenőrzése.
 *
 * Figyelembe veszi:
 * - A fizetett szabadság napjait (tipus === 'szabadsag')
 * - A heti pihenőnapokat (hétvégék), HA nincs rajta beosztott műszak
 * - A munkaszüneti napokat, HA nincs rajta beosztott műszak
 */
export function calculate14DayConsecutiveLeave(
  leaves: LeaveRecordInput[],
  shifts: ShiftRecordInput[] = [],
  holidays: string[] = [],
  year: number = new Date().getFullYear(),
  hasWaiver: boolean = false
): ConsecutiveLeaveResult {
  const holidaySet = new Set(holidays)

  // Szombati / vasárnapi beosztott műszakok halmaza
  const workingShiftDates = new Set<string>()
  for (const s of shifts) {
    if (s.datum && (s.tervezett_ora ?? 0) > 0) {
      workingShiftDates.add(s.datum)
    }
  }

  // Jóváhagyott szabadság napok halmaza
  const approvedVacationDates = new Set<string>()
  // Folyamatban lévő (jóváhagyásra váró) szabadság napok halmaza
  const pendingVacationDates = new Set<string>()

  for (const l of leaves) {
    if (l.tipus !== "szabadsag" || l.statusz === "elutasitva") continue

    const start = new Date(l.kezdet_datuma)
    const end = new Date(l.veg_datuma)
    const cur = new Date(start)

    while (cur <= end) {
      const dateStr = cur.toISOString().split("T")[0]
      if (dateStr.startsWith(String(year))) {
        if (l.statusz === "jovahagyva") {
          approvedVacationDates.add(dateStr)
        } else if (l.statusz === "jovahagyasra_var") {
          pendingVacationDates.add(dateStr)
        }
      }
      cur.setDate(cur.getDate() + 1)
    }
  }

  const allYearDays = getDaysOfYear(year)

  // 1. Blokkkereső futtatás (csak jóváhagyott napokkal)
  const approvedBlocks = extractConsecutiveBlocks(
    allYearDays,
    holidaySet,
    workingShiftDates,
    approvedVacationDates,
    new Set<string>()
  )

  // 2. Blokkkereső futtatás (jóváhagyott + jóváhagyásra váró napokkal)
  const allBlocksWithPending = extractConsecutiveBlocks(
    allYearDays,
    holidaySet,
    workingShiftDates,
    approvedVacationDates,
    pendingVacationDates
  )

  let maxConsecutiveDays = 0
  let longestBlock: ConsecutiveBlock | null = null
  for (const b of approvedBlocks) {
    if (b.hasVacation && b.days > maxConsecutiveDays) {
      maxConsecutiveDays = b.days
      longestBlock = b
    }
  }

  let pendingMaxConsecutiveDays = 0
  let longestPendingBlock: ConsecutiveBlock | null = null
  for (const b of allBlocksWithPending) {
    if (b.hasVacation && b.days > pendingMaxConsecutiveDays) {
      pendingMaxConsecutiveDays = b.days
      longestPendingBlock = b
    }
  }

  const isFulfilled = maxConsecutiveDays >= 14

  let status: "teljesitve" | "betervezve" | "megallapodas_alapjan_mentes" | "nem_teljesult"
  if (isFulfilled) {
    status = "teljesitve"
  } else if (pendingMaxConsecutiveDays >= 14) {
    status = "betervezve"
  } else if (hasWaiver) {
    status = "megallapodas_alapjan_mentes"
  } else {
    status = "nem_teljesult"
  }

  return {
    isFulfilled,
    status,
    maxConsecutiveDays,
    longestBlock,
    pendingMaxConsecutiveDays,
    longestPendingBlock,
    hasWaiver,
  }
}

function extractConsecutiveBlocks(
  days: string[],
  holidaySet: Set<string>,
  workingShiftDates: Set<string>,
  approvedVacationDates: Set<string>,
  pendingVacationDates: Set<string>
): ConsecutiveBlock[] {
  const blocks: ConsecutiveBlock[] = []
  let currentDates: string[] = []
  let hasVacationInCurrent = false

  for (const d of days) {
    const dateObj = new Date(d)
    const dow = dateObj.getUTCDay()
    const isWeekend = dow === 0 || dow === 6
    const isHoliday = holidaySet.has(d)
    const isVacation = approvedVacationDates.has(d) || pendingVacationDates.has(d)
    const hasWork = workingShiftDates.has(d)

    // Pihenőnap-e a nap?
    // Ha van beosztott munkavégzés azon a napon, akkor NEM pihenőnap!
    // Egyébként pihenőnap, ha szabadságon van, vagy hétvége/ünnepnap.
    const isRestDay = !hasWork && (isVacation || isWeekend || isHoliday)

    if (isRestDay) {
      currentDates.push(d)
      if (isVacation) {
        hasVacationInCurrent = true
      }
    } else {
      if (currentDates.length > 0) {
        blocks.push({
          startDate: currentDates[0],
          endDate: currentDates[currentDates.length - 1],
          days: currentDates.length,
          hasVacation: hasVacationInCurrent,
        })
      }
      currentDates = []
      hasVacationInCurrent = false
    }
  }

  if (currentDates.length > 0) {
    blocks.push({
      startDate: currentDates[0],
      endDate: currentDates[currentDates.length - 1],
      days: currentDates.length,
      hasVacation: hasVacationInCurrent,
    })
  }

  return blocks
}

/**
 * Mt. 123. § szerinti év végi maradványszabadság kockázat számítása.
 *
 * @param totalLeave Éves összes szabadságkeret (nap)
 * @param usedLeave Eddig kivett és lezárt napok
 * @param plannedLeave Jövőbeli jóváhagyott napok az évben
 * @param holidays Ünnepnapok tömbje
 * @param year Vizsgált év
 * @param refDate Bázisdátum (alapértelmezetten a mai nap)
 */
export function calculateYearEndLeaveRisk(
  totalLeave: number,
  usedLeave: number,
  plannedLeave: number,
  holidays: string[] = [],
  year: number = new Date().getFullYear(),
  refDate: string | Date = new Date()
): YearEndLeaveRiskResult {
  const remainingDays = Math.max(0, totalLeave - usedLeave - plannedLeave)

  const dateObj = typeof refDate === "string" ? new Date(refDate) : new Date(refDate)
  const endOfYear = new Date(Date.UTC(year, 11, 31))

  // Hátralévő munkanapok az évben a mai naptól december 31-ig
  const remainingWorkingDays =
    dateObj > endOfYear
      ? 0
      : calculateWorkingDays(dateObj.toISOString().split("T")[0], `${year}-12-31`, holidays)

  const currentMonth = dateObj.getMonth() + 1 // 1-12
  const isQ4 = currentMonth >= 10
  const isNovemberAlertActive = currentMonth >= 11

  let riskLevel: "rendben" | "figyelmeztetes" | "kritikus" = "rendben"
  let statusLabel = "Kiadható a rendes keretben"
  const ratio = remainingWorkingDays > 0 ? (remainingDays / remainingWorkingDays) * 100 : 0
  const ratioPercent = Math.round(ratio * 10) / 10

  if (remainingDays === 0) {
    riskLevel = "rendben"
    statusLabel = "Minden szabadság kiadva"
  } else if (remainingDays > remainingWorkingDays) {
    riskLevel = "kritikus"
    statusLabel = `Kritikus: Nem adható ki! (${remainingDays} nap maradvány > ${remainingWorkingDays} munkanap)`
  } else if (isQ4) {
    if (remainingDays >= 10 || (remainingWorkingDays > 0 && remainingDays / remainingWorkingDays >= 0.3)) {
      riskLevel = "figyelmeztetes"
      statusLabel = isNovemberAlertActive
        ? `Novemberi riasztás: ${remainingDays} nap maradvány (${ratioPercent}% a munkanapokból)`
        : `Év végi figyelmeztetés: ${remainingDays} nap maradvány`
    }
  }

  return {
    remainingDays,
    remainingWorkingDays,
    riskLevel,
    isNovemberAlertActive,
    statusLabel,
    ratioPercent,
  }
}
