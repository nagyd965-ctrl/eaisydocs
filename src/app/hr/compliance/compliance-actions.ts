"use server"

import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { revalidatePath } from "next/cache"
import {
  calculate14DayConsecutiveLeave,
  calculateYearEndLeaveRisk,
  CompanyComplianceOverview,
  EmployeeComplianceSummary,
} from "@/utils/hr/leave-compliance-calculator"
import {
  calculateCompanySafetyOverview,
  CompanySafetyOverview,
  EmployeeSafetyRecord,
} from "@/utils/hr/safety-compliance-calculator"
import { calculateAnnualLeave } from "@/utils/hr/leave-calculator"
import { startOfWeek, endOfWeek, format } from "date-fns"
import {
  determineAnnualOvertimeLimit,
  calculateOvertimeQuotaStatus,
  checkWeeklyHoursCompliance,
  calculateDailyOvertimeFromAttendance,
  CompanyOvertimeComplianceOverview,
  EmployeeOvertimeComplianceRecord,
} from "@/utils/hr/overtime-engine"

export async function getCompanyLeaveComplianceData(
  targetYear?: number
): Promise<CompanyComplianceOverview> {
  const supabase = await createClient()
  const activeCompanyId = await getActiveCompanyIdServer()
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"
  const year = targetYear || new Date().getFullYear()

  // 1. Dolgozók lekérése az aktív cégből
  const { data: rawEmployees } = await supabase
    .from("hr_jogviszony")
    .select(`
      id,
      dolgozo_id,
      kilepes_datuma,
      hr_dolgozo_adatlap (
        id,
        szuletesi_datum,
        gyermekek_szama,
        megvaltozott_munkakepessegu,
        eltero_megallapodas_14_nap,
        felhasznalo_profil (
          id,
          nev,
          avatar_url,
          hr_szervezeti_egyseg_id,
          hr_szervezeti_egyseg:hr_szervezeti_egyseg_id ( id, nev )
        )
      ),
      hr_beosztas (
        hr_munkakor ( megnevezes )
      )
    `)
    .eq("company_id", companyScope)
    .order("created_at", { ascending: false })

  // 2. Munkaszüneti napok lekérése
  const { data: rawHolidays } = await supabase
    .from("hr_munkaszuneti_nap")
    .select("datum")
    .gte("datum", `${year}-01-01`)
    .lte("datum", `${year}-12-31`)

  const holidays = (rawHolidays || []).map((h) => h.datum)

  // 3. Távollétek lekérése az évre
  const { data: rawLeaves } = await supabase
    .from("hr_tavollet")
    .select("id, dolgozo_id, kezdet_datuma, veg_datuma, tipus, statusz, indoklas")
    .eq("company_id", companyScope)
    .gte("veg_datuma", `${year}-01-01`)
    .lte("kezdet_datuma", `${year}-12-31`)

  // 4. Műszakbeosztások lekérése az évre (hétvégi munkavégzés kiszűréséhez)
  const { data: rawShifts } = await supabase
    .from("hr_muszak_beosztas")
    .select("id, dolgozo_id, datum, tervezett_ora")
    .eq("company_id", companyScope)
    .gte("datum", `${year}-01-01`)
    .lte("datum", `${year}-12-31`)

  // Dolgozónkénti csoportosítás
  const leavesByEmployee = new Map<string, any[]>()
  for (const l of rawLeaves || []) {
    if (!l.dolgozo_id) continue
    const arr = leavesByEmployee.get(l.dolgozo_id) || []
    arr.push(l)
    leavesByEmployee.set(l.dolgozo_id, arr)
  }

  const shiftsByEmployee = new Map<string, any[]>()
  for (const s of rawShifts || []) {
    if (!s.dolgozo_id) continue
    const arr = shiftsByEmployee.get(s.dolgozo_id) || []
    arr.push(s)
    shiftsByEmployee.set(s.dolgozo_id, arr)
  }

  // Egyedi aktív dolgozók feldolgozása
  const processedEmployeeIds = new Set<string>()
  const employeeSummaries: EmployeeComplianceSummary[] = []

  const todayStr = new Date().toISOString().split("T")[0]

  for (const j of (rawEmployees as any[]) || []) {
    if (!j.dolgozo_id || processedEmployeeIds.has(j.dolgozo_id)) continue
    // Csak aktív vagy idei évben kilépett dolgozók
    if (j.kilepes_datuma && j.kilepes_datuma < `${year}-01-01`) continue

    processedEmployeeIds.add(j.dolgozo_id)

    const adatlap = j.hr_dolgozo_adatlap
    const profil = adatlap?.felhasznalo_profil
    if (!profil) continue

    const empLeaves = leavesByEmployee.get(j.dolgozo_id) || []
    const empShifts = shiftsByEmployee.get(j.dolgozo_id) || []

    const orgUnit = Array.isArray(profil.hr_szervezeti_egyseg)
      ? profil.hr_szervezeti_egyseg[0]
      : profil.hr_szervezeti_egyseg

    const munkakor = Array.isArray(j.hr_beosztas)
      ? j.hr_beosztas[0]?.hr_munkakor?.megnevezes
      : j.hr_beosztas?.hr_munkakor?.megnevezes

    // Éves alapszabadság és pótszabadságok számítása
    const totalLeave = calculateAnnualLeave(
      adatlap?.szuletesi_datum,
      adatlap?.gyermekek_szama,
      adatlap?.megvaltozott_munkakepessegu,
      year
    )

    // Kivett és betervezett napok számítása (csak jóváhagyott napok)
    let usedLeave = 0
    let plannedLeave = 0

    for (const l of empLeaves) {
      if (l.tipus !== "szabadsag" || l.statusz !== "jovahagyva") continue

      const s = new Date(l.kezdet_datuma)
      const e = new Date(l.veg_datuma)
      const cur = new Date(s)

      while (cur <= e) {
        const dStr = cur.toISOString().split("T")[0]
        if (dStr.startsWith(String(year))) {
          const dow = cur.getUTCDay()
          // Munkanap: nem hétvége és nem ünnep
          if (dow !== 0 && dow !== 6 && !holidays.includes(dStr)) {
            if (dStr <= todayStr) {
              usedLeave++
            } else {
              plannedLeave++
            }
          }
        }
        cur.setDate(cur.getDate() + 1)
      }
    }

    const remainingLeave = Math.max(0, totalLeave - usedLeave - plannedLeave)
    const hasWaiver = Boolean(adatlap?.eltero_megallapodas_14_nap)

    // 14 napos egybefüggő kötelezettség kalkulációja
    const consecutiveResult = calculate14DayConsecutiveLeave(
      empLeaves,
      empShifts,
      holidays,
      year,
      hasWaiver
    )

    // Év végi maradványszabadság kockázat
    const riskResult = calculateYearEndLeaveRisk(
      totalLeave,
      usedLeave,
      plannedLeave,
      holidays,
      year
    )

    employeeSummaries.push({
      dolgozoId: j.dolgozo_id,
      nev: profil.nev || "Névtelen munkatárs",
      szervezetiEgysegId: profil.hr_szervezeti_egyseg_id,
      szervezetiEgysegNev: orgUnit?.nev || "Nincs részleg",
      munkakorMegnevezes: munkakor || "Nincs megadva",
      avatarUrl: profil.avatarUrl,
      hasWaiver,
      totalLeave,
      usedLeave,
      plannedLeave,
      remainingLeave,
      consecutiveResult,
      riskResult,
    })
  }

  // Rendezés: Kockázatosak (kritikus/figyelmeztetés), hiányzók elöl, majd név szerint
  employeeSummaries.sort((a, b) => {
    const riskWeight = { kritikus: 3, figyelmeztetes: 2, rendben: 1 }
    const rwA = riskWeight[a.riskResult.riskLevel] || 0
    const rwB = riskWeight[b.riskResult.riskLevel] || 0
    if (rwA !== rwB) return rwB - rwA

    const missingA = a.consecutiveResult.status === "nem_teljesult" ? 1 : 0
    const missingB = b.consecutiveResult.status === "nem_teljesult" ? 1 : 0
    if (missingA !== missingB) return missingB - missingA

    return a.nev.localeCompare(b.nev, "hu")
  })

  // Összesítők
  let fulfilled14DaysCount = 0
  let waiverCount = 0
  let missing14DaysCount = 0
  let totalRemainingDays = 0
  let criticalRiskCount = 0
  let warningRiskCount = 0

  for (const emp of employeeSummaries) {
    if (emp.consecutiveResult.isFulfilled) fulfilled14DaysCount++
    if (emp.hasWaiver) waiverCount++
    if (emp.consecutiveResult.status === "nem_teljesult") missing14DaysCount++
    totalRemainingDays += emp.remainingLeave
    if (emp.riskResult.riskLevel === "kritikus") criticalRiskCount++
    if (emp.riskResult.riskLevel === "figyelmeztetes") warningRiskCount++
  }

  return {
    year,
    totalEmployees: employeeSummaries.length,
    fulfilled14DaysCount,
    waiverCount,
    missing14DaysCount,
    totalRemainingDays,
    criticalRiskCount,
    warningRiskCount,
    employees: employeeSummaries,
  }
}

export async function toggle14DayWaiverAction(
  employeeId: string,
  hasWaiver: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("hr_dolgozo_adatlap")
    .update({ eltero_megallapodas_14_nap: hasWaiver })
    .eq("id", employeeId)

  if (error) {
    console.error("Error updating 14-day waiver:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/hr/compliance")
  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

/**
 * Lekéri az aktív cég összes munkavállalójának munkavédelmi és tűzvédelmi oktatási adatait,
 * és kiszámítja a hatósági lejárati státuszokat és cégszintű KPI mutatókat.
 */
export async function getCompanySafetyComplianceData(): Promise<CompanySafetyOverview> {
  const supabase = await createClient()
  const activeCompanyId = await getActiveCompanyIdServer()
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"

  // 1. Dolgozók lekérése az aktív cégből
  const { data: rawEmployees } = await supabase
    .from("hr_jogviszony")
    .select(`
      id,
      dolgozo_id,
      kilepes_datuma,
      hr_dolgozo_adatlap (
        id,
        felhasznalo_profil (
          id,
          nev,
          avatar_url,
          hr_szervezeti_egyseg:hr_szervezeti_egyseg_id ( id, nev )
        )
      ),
      hr_beosztas (
        hr_munkakor ( megnevezes )
      )
    `)
    .eq("company_id", companyScope)
    .order("created_at", { ascending: false })

  // 2. Munkavédelmi oktatások lekérése
  const { data: rawTrainings } = await supabase
    .from("hr_munkavedelmi_oktatas")
    .select(`
      id,
      dolgozo_id,
      oktatas_tipusa,
      oktatas_datuma,
      ervenyesseg_vege,
      oktato_neve,
      oktato_beosztasa,
      dokumentum_id,
      hr_dokumentum:dokumentum_id (
        id,
        nev,
        url,
        iktatoszam,
        ugyirat_id
      )
    `)
    .order("oktatas_datuma", { ascending: false })

  // Csoportosítás dolgozónként (legfrissebb oktatás kiválasztása)
  const trainingsByEmployee = new Map<string, any>()
  for (const t of rawTrainings || []) {
    if (!t.dolgozo_id) continue
    if (!trainingsByEmployee.has(t.dolgozo_id)) {
      trainingsByEmployee.set(t.dolgozo_id, t)
    }
  }

  // Dolgozók feldolgozása
  const processedEmployeeIds = new Set<string>()
  const employeeRecords: EmployeeSafetyRecord[] = []
  const todayStr = new Date().toISOString().split("T")[0]

  for (const j of (rawEmployees as any[]) || []) {
    if (!j.dolgozo_id || processedEmployeeIds.has(j.dolgozo_id)) continue
    // Csak aktív vagy jövőben kilépő dolgozók
    if (j.kilepes_datuma && j.kilepes_datuma < todayStr) continue

    processedEmployeeIds.add(j.dolgozo_id)

    const adatlap = j.hr_dolgozo_adatlap
    const profil = adatlap?.felhasznalo_profil
    const nev = profil?.nev || "Névtelen munkatárs"
    const avatarUrl = profil?.avatar_url || null
    const reszlegNev = profil?.hr_szervezeti_egyseg?.nev || "Nincs részleg"
    const munkakor = j.hr_beosztas?.[0]?.hr_munkakor?.megnevezes || "Nincs megadva"

    const training = trainingsByEmployee.get(j.dolgozo_id)
    const doc = training?.hr_dokumentum

    employeeRecords.push({
      dolgozoId: j.dolgozo_id,
      nev,
      avatarUrl,
      szervezetiEgysegNev: reszlegNev,
      munkakorMegnevezes: munkakor,
      oktatasId: training?.id || null,
      oktatasTipusa: training?.oktatas_tipusa || null,
      oktatasDatuma: training?.oktatas_datuma || null,
      ervenyessegVege: training?.ervenyesseg_vege || (training?.oktatas_datuma ? new Date(new Date(training.oktatas_datuma).setFullYear(new Date(training.oktatas_datuma).getFullYear() + 1)).toISOString().split("T")[0] : null),
      oktatoNeve: training?.oktato_neve || null,
      dokumentumId: doc?.id || null,
      iktatoszam: doc?.iktatoszam || null,
      ugyiratId: doc?.ugyirat_id || null,
      documentUrl: doc?.url || null,
    })
  }

  // Kalkuláció a tiszta motorral
  const overview = calculateCompanySafetyOverview(employeeRecords, new Date())

  // Rendezés: Hiányzó és lejárt elöl, majd hamarosan lejáró, majd érvényes, végül név szerint
  overview.items.sort((a, b) => {
    const statusWeight: Record<string, number> = {
      hianyzik: 4,
      lejart: 3,
      hamarosan_lejar: 2,
      ervenyess: 1,
    }
    const weightDiff = (statusWeight[b.status] || 0) - (statusWeight[a.status] || 0)
    if (weightDiff !== 0) return weightDiff

    if (a.daysRemaining !== null && b.daysRemaining !== null) {
      return a.daysRemaining - b.daysRemaining
    }

    return a.nev.localeCompare(b.nev, "hu")
  })

  return overview
}

/**
 * Lekéri az aktív cég összes munkavállalójának heti munkaidő és éves túlórakeret adatait (Mt. 99. § és 135. §),
 * és kiszámítja a hatósági megfelelőségi mutatókat.
 */
export async function getCompanyOvertimeComplianceData(
  targetYear?: number
): Promise<CompanyOvertimeComplianceOverview> {
  const supabase = await createClient()
  const activeCompanyId = await getActiveCompanyIdServer()
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"
  const year = targetYear || new Date().getFullYear()

  // 1. Aktuális naptári hét határai (Hétfő – Vasárnap)
  const now = new Date()
  const monday = startOfWeek(now, { weekStartsOn: 1 })
  const sunday = endOfWeek(now, { weekStartsOn: 1 })
  const weekStartStr = format(monday, "yyyy-MM-dd")
  const weekEndStr = format(sunday, "yyyy-MM-dd")

  // 2. Dolgozók lekérése az aktív cégből
  const { data: rawEmployees } = await supabase
    .from("hr_jogviszony")
    .select(`
      id,
      dolgozo_id,
      kilepes_datuma,
      hr_dolgozo_adatlap (
        id,
        onkent_vallalt_tulora_400h,
        onkent_vallalt_tulora_datum,
        felhasznalo_profil (
          id,
          nev,
          avatar_url,
          hr_szervezeti_egyseg_id,
          hr_szervezeti_egyseg:hr_szervezeti_egyseg_id ( id, nev )
        )
      ),
      hr_beosztas (
        hr_munkakor ( megnevezes )
      )
    `)
    .eq("company_id", companyScope)
    .order("created_at", { ascending: false })

  // 3. Tervezett műszakok az aktuális hétre
  const { data: weeklyShifts } = await supabase
    .from("hr_muszak_beosztas")
    .select("dolgozo_id, datum, tervezett_ora")
    .eq("company_id", companyScope)
    .gte("datum", weekStartStr)
    .lte("datum", weekEndStr)

  const plannedHoursByEmployee = new Map<string, number>()
  for (const s of weeklyShifts || []) {
    if (!s.dolgozo_id) continue
    const current = plannedHoursByEmployee.get(s.dolgozo_id) || 0
    plannedHoursByEmployee.set(s.dolgozo_id, current + (Number(s.tervezett_ora) || 0))
  }

  // 4. Jelenlétek az aktuális hétre (tény heti munkaidő)
  const { data: weeklyAttendance } = await supabase
    .from("hr_jelenlet")
    .select("dolgozo_id, datum, becsekkolas_ideje, kicsekkolas_ideje")
    .gte("datum", weekStartStr)
    .lte("datum", weekEndStr)

  const actualHoursByEmployee = new Map<string, number>()
  for (const a of weeklyAttendance || []) {
    if (!a.dolgozo_id || !a.becsekkolas_ideje || !a.kicsekkolas_ideje) continue
    const inTime = new Date(a.becsekkolas_ideje).getTime()
    const outTime = new Date(a.kicsekkolas_ideje).getTime()
    const hours = Math.max(0, (outTime - inTime) / (1000 * 60 * 60))
    const current = actualHoursByEmployee.get(a.dolgozo_id) || 0
    actualHoursByEmployee.set(a.dolgozo_id, current + hours)
  }

  // 5. Éves jelenlétek az éves túlóra számlálóhoz
  const { data: annualAttendance } = await supabase
    .from("hr_jelenlet")
    .select("dolgozo_id, datum, becsekkolas_ideje, kicsekkolas_ideje")
    .gte("datum", `${year}-01-01`)
    .lte("datum", `${year}-12-31`)

  // Tervezett műszakok az évre a napi tervezett órák pontos meghatározásához
  const { data: annualShifts } = await supabase
    .from("hr_muszak_beosztas")
    .select("dolgozo_id, datum, tervezett_ora")
    .eq("company_id", companyScope)
    .gte("datum", `${year}-01-01`)
    .lte("datum", `${year}-12-31`)

  const shiftMap = new Map<string, number>()
  for (const s of annualShifts || []) {
    if (s.dolgozo_id && s.datum) {
      shiftMap.set(`${s.dolgozo_id}_${s.datum}`, Number(s.tervezett_ora) || 8.0)
    }
  }

  const annualOvertimeByEmployee = new Map<string, number>()
  for (const a of annualAttendance || []) {
    if (!a.dolgozo_id || !a.becsekkolas_ideje || !a.kicsekkolas_ideje) continue
    const scheduled = shiftMap.get(`${a.dolgozo_id}_${a.datum}`) ?? 8.0
    const dayOfWeek = new Date(a.datum).getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const hasExplicitShift = shiftMap.has(`${a.dolgozo_id}_${a.datum}`)

    const ot = calculateDailyOvertimeFromAttendance({
      checkIn: a.becsekkolas_ideje,
      checkOut: a.kicsekkolas_ideje,
      scheduledHours: scheduled,
      isRestDay: isWeekend && !hasExplicitShift,
    })

    const currentOt = annualOvertimeByEmployee.get(a.dolgozo_id) || 0
    annualOvertimeByEmployee.set(a.dolgozo_id, currentOt + ot.overtimeHours)
  }

  // 6. Dolgozók rekordjainak felépítése
  const processedEmployeeIds = new Set<string>()
  const records: EmployeeOvertimeComplianceRecord[] = []

  let exceeded48hCount = 0
  let nearOvertimeLimitCount = 0
  let exceededOvertimeLimitCount = 0
  let voluntaryAgreementCount = 0
  let totalCompanyOvertimeHours = 0

  for (const j of (rawEmployees as any[]) || []) {
    if (!j.dolgozo_id || processedEmployeeIds.has(j.dolgozo_id)) continue
    processedEmployeeIds.add(j.dolgozo_id)

    const adatlap = Array.isArray(j.hr_dolgozo_adatlap)
      ? j.hr_dolgozo_adatlap[0]
      : j.hr_dolgozo_adatlap

    const profil = adatlap?.felhasznalo_profil
    const nev = profil?.nev || "Névtelen munkatárs"
    const avatarUrl = profil?.avatar_url || null
    const reszlegNev = profil?.hr_szervezeti_egyseg?.nev || "Nincs részleg"
    const munkakor = j.hr_beosztas?.[0]?.hr_munkakor?.megnevezes || "Nincs megadva"

    const hasVoluntary = !!adatlap?.onkent_vallalt_tulora_400h
    if (hasVoluntary) voluntaryAgreementCount++

    const annualLimit = determineAnnualOvertimeLimit(hasVoluntary)
    const workedOvertime = Math.round((annualOvertimeByEmployee.get(j.dolgozo_id) || 0) * 10) / 10
    totalCompanyOvertimeHours += workedOvertime

    const quota = calculateOvertimeQuotaStatus(workedOvertime, annualLimit)
    if (quota.status === "warning") nearOvertimeLimitCount++
    if (quota.status === "exceeded") exceededOvertimeLimitCount++

    const weeklyPlanned = Math.round((plannedHoursByEmployee.get(j.dolgozo_id) || 0) * 10) / 10
    const weeklyActual = Math.round((actualHoursByEmployee.get(j.dolgozo_id) || 0) * 10) / 10
    const maxWeeklyHours = Math.max(weeklyPlanned, weeklyActual)
    const weeklyCompliance = checkWeeklyHoursCompliance(maxWeeklyHours)

    if (weeklyCompliance.isOver48) {
      exceeded48hCount++
    }

    records.push({
      dolgozoId: j.dolgozo_id,
      nev,
      avatarUrl,
      szervezetiEgysegNev: reszlegNev,
      munkakorMegnevezes: munkakor,
      weeklyPlannedHours: weeklyPlanned,
      weeklyActualHours: weeklyActual,
      weeklyCompliance,
      year,
      annualLimit,
      hasVoluntaryAgreement: hasVoluntary,
      agreementDate: adatlap?.onkent_vallalt_tulora_datum || null,
      workedOvertimeHours: workedOvertime,
      remainingHours: quota.remainingHours,
      percentage: quota.percentage,
      quotaStatus: quota.status,
    })
  }

  // 7. Rendezés: Heti 48h törvénysértők legfelül, majd kimerült túlórakeret, majd 80% küszöb, majd név
  records.sort((a, b) => {
    // 1. Súly: heti 48h törvénysértés
    const aIllegal = a.weeklyCompliance.isOver48 ? 1 : 0
    const bIllegal = b.weeklyCompliance.isOver48 ? 1 : 0
    if (bIllegal !== aIllegal) return bIllegal - aIllegal

    // 2. Súly: éves túlórakeret státusz
    const statusWeight: Record<string, number> = {
      exceeded: 3,
      warning: 2,
      normal: 1,
    }
    const weightDiff = (statusWeight[b.quotaStatus] || 0) - (statusWeight[a.quotaStatus] || 0)
    if (weightDiff !== 0) return weightDiff

    // 3. Súly: túlóra százalék csökkenő
    if (b.percentage !== a.percentage) return b.percentage - a.percentage

    return a.nev.localeCompare(b.nev, "hu")
  })

  return {
    year,
    currentWeekStart: weekStartStr,
    currentWeekEnd: weekEndStr,
    totalEmployees: records.length,
    exceeded48hCount,
    nearOvertimeLimitCount,
    exceededOvertimeLimitCount,
    voluntaryAgreementCount,
    totalCompanyOvertimeHours: Math.round(totalCompanyOvertimeHours * 10) / 10,
    records,
  }
}

/**
 * Mt. 135. § szerinti önként vállalt túmunka (400 óra) megállapodás kapcsolása
 */
export async function toggleVoluntaryOvertimeAgreementAction(
  employeeId: string,
  hasAgreement: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("hr_dolgozo_adatlap")
    .update({
      onkent_vallalt_tulora_400h: hasAgreement,
      onkent_vallalt_tulora_datum: hasAgreement ? new Date().toISOString().split("T")[0] : null,
    })
    .eq("id", employeeId)

  if (error) {
    console.error("Error updating voluntary overtime agreement:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/hr/compliance")
  revalidatePath(`/hr/employee/${employeeId}`)
  revalidatePath("/hr/time")
  return { success: true }
}

