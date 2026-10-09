import { addDays, format, parseISO } from "date-fns"

export function calculateWeeklyPlannedHours(
  assignments: Array<{ tervezett_ora: number }>
): number {
  return assignments.reduce((sum, a) => sum + (Number(a.tervezett_ora) || 0), 0)
}

export function checkWeeklyHoursLimit(totalHours: number): {
  isOver40: boolean
  isOver48: boolean
  warning?: string
} {
  const isOver48 = totalHours > 48
  const isOver40 = totalHours > 40 && !isOver48

  let warning: string | undefined
  if (isOver48) {
    warning = `A tervezett heti munkaidő (${totalHours} óra) meghaladja a törvényes 48 órás Mt. felső határt!`
  } else if (isOver40) {
    warning = `A heti tervezett munkaidő (${totalHours} óra) ${totalHours - 40} óra túlórát tartalmaz.`
  }

  return { isOver40, isOver48, warning }
}

export function determineMedicalStatus(
  expiryDateStr: string | null | undefined,
  referenceDateStr: string
): "ervenyes" | "lejar_hamarosan" | "lejart" | "nincs_adat" {
  if (!expiryDateStr) return "nincs_adat"

  const refDate = parseISO(referenceDateStr)
  const expDate = parseISO(expiryDateStr)
  const expStr = format(expDate, "yyyy-MM-dd")
  const refStr = format(refDate, "yyyy-MM-dd")

  if (expStr < refStr) {
    return "lejart"
  }

  const thirtyDaysLater = format(addDays(refDate, 30), "yyyy-MM-dd")
  if (expStr <= thirtyDaysLater) {
    return "lejar_hamarosan"
  }

  return "ervenyes"
}

export interface ShiftForCopy {
  dolgozo_id: string
  datum: string
  sablon_id: string | null
  egyedi_kezdes?: string | null
  egyedi_befejezes?: string | null
  tervezett_ora: number
  megjegyzes?: string | null
}

export interface LeaveForCopy {
  dolgozo_id: string
  kezdet_datuma: string
  veg_datuma: string
}

export function filterShiftsForCopy(
  sourceShifts: ShiftForCopy[],
  targetLeaves: LeaveForCopy[],
  daysOffset: number = 7
): ShiftForCopy[] {
  const result: ShiftForCopy[] = []

  for (const shift of sourceShifts) {
    const shiftDate = parseISO(shift.datum)
    const targetDate = addDays(shiftDate, daysOffset)
    const targetDateStr = format(targetDate, "yyyy-MM-dd")

    // Ellenőrizzük, hogy a dolgozónak van-e jóváhagyott távolléte az adott cél napon
    const isAbsent = targetLeaves.some(
      (l) =>
        l.dolgozo_id === shift.dolgozo_id &&
        l.kezdet_datuma <= targetDateStr &&
        l.veg_datuma >= targetDateStr
    )

    if (!isAbsent) {
      result.push({
        ...shift,
        datum: targetDateStr,
      })
    }
  }

  return result
}
