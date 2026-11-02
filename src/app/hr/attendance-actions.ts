"use server"

import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { revalidatePath } from "next/cache"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"
import { checkMedicalValidityForDate } from "@/utils/hr/medical-compliance-checker"
import { resolveEffectiveHolidays } from "@/utils/hr/leave-calculator"

async function verifyTimesheetEmployeeAccess(
  employeeId: string,
  options: { allowSelf: boolean; requiredModules?: string[] }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false as const, error: "Nincs bejelentkezve", isSelf: false }
  }

  const modules = options.requiredModules || ["time", "admin", "vezeto", "payroll", "employees", "auditor"]
  const auth = await requireHrAuthServer(modules, null)
  const activeCompanyId = auth.activeCompanyId || (await getActiveCompanyIdServer())
  const isSelf = user.id === employeeId

  if (!auth.authorized && !(options.allowSelf && isSelf)) {
    return {
      ok: false as const,
      error: isSelf
        ? "Saját jelenléti ív közvetlen módosítása nem engedélyezett. Kérjük, használd a jelenlétkorrekciós kérelmet!"
        : "Nincs jogosultság a jelenléti adatok eléréséhez.",
      isSelf,
    }
  }

  if (activeCompanyId && !isSelf) {
    const [{ data: card }, { data: member }] = await Promise.all([
      supabase
        .from("hr_dolgozo_adatlap")
        .select("id")
        .eq("id", employeeId)
        .eq("company_id", activeCompanyId)
        .maybeSingle(),
      supabase
        .from("company_members")
        .select("user_id")
        .eq("user_id", employeeId)
        .eq("company_id", activeCompanyId)
        .maybeSingle(),
    ])
    if (!card && !member) {
      return {
        ok: false as const,
        error: "A dolgozó nem tartozik az aktív vállalathoz.",
        isSelf: false,
      }
    }
  }

  return {
    ok: true as const,
    supabase,
    user,
    auth,
    activeCompanyId,
    isSelf,
  }
}

export type TimesheetEntry = {
  id: string
  record_id?: string
  datum: string
  becsekkolas_ideje: string | null
  kicsekkolas_ideje: string | null
  szunet_perc?: number
  szunet_ms?: number
  type: "munka" | "szabadsag" | "betegseg" | "hetvege" | "unnep" | "csusztatas"
  note?: string
  tavollet_id?: string
  pendingCorrection?: {
    uj_becsekkolas: string
    uj_kicsekkolas: string
    indoklas: string
  }
  shiftPlannedHours?: number | null
  shiftCode?: string | null
  shiftName?: string | null
  shiftStartTime?: string | null
  shiftEndTime?: string | null
  shiftColor?: string | null
  isWeekendShift?: boolean
  isTransferredWorkday?: boolean
  pendingLeave?: {
    id: string
    tipus: string
  } | null
}

function getDaysInMonth(year: number, month: number) {
  const date = new Date(Date.UTC(year, month - 1, 1))
  const days = []
  while (date.getUTCMonth() === month - 1) {
    days.push(new Date(date))
    date.setUTCDate(date.getUTCDate() + 1)
  }
  return days
}

// 1. Get Monthly Timesheet
export async function getMonthlyTimesheet(employeeId: string, year: number, month: number): Promise<{ data: TimesheetEntry[] | null, fte: number, error: string | null }> {
  try {
    const access = await verifyTimesheetEmployeeAccess(employeeId, { allowSelf: true })
    if (!access.ok) {
      return { data: null, fte: 1.0, error: access.error }
    }
    const { supabase, activeCompanyId } = access

    const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString().split('T')[0]
    const endDate = new Date(Date.UTC(year, month, 0)).toISOString().split('T')[0]

    // Fetch Jelenlét
    let jelenletQuery = supabase
      .from("hr_jelenlet")
      .select("*")
      .eq("dolgozo_id", employeeId)
      .gte("datum", startDate)
      .lte("datum", endDate)
    if (activeCompanyId) {
      jelenletQuery = jelenletQuery.eq("company_id", activeCompanyId)
    }
    const { data: jelenletData, error: jelenletError } = await jelenletQuery

    if (jelenletError) throw new Error(jelenletError.message)

    // Fetch Távollét (jóváhagyott és jóváhagyásra váró is a naptár nézethez)
    let tavolletQuery = supabase
      .from("hr_tavollet")
      .select("*")
      .eq("dolgozo_id", employeeId)
      .in("statusz", ["jovahagyva", "jovahagyasra_var"])
      .lte("kezdet_datuma", endDate)
      .gte("veg_datuma", startDate)
    if (activeCompanyId) {
      tavolletQuery = tavolletQuery.eq("company_id", activeCompanyId)
    }
    const { data: tavolletData, error: tavolletError } = await tavolletQuery

    if (tavolletError) throw new Error(tavolletError.message)

    // Fetch függőben lévő munkaidő korrekciós kérelmek részletekkel
    let corrQuery = supabase
      .from("hr_jelenlet_korrekcio")
      .select("datum, uj_becsekkolas, uj_kicsekkolas, indoklas")
      .eq("dolgozo_id", employeeId)
      .eq("statusz", "jovahagyasra_var")
      .gte("datum", startDate)
      .lte("datum", endDate)
    if (activeCompanyId) {
      corrQuery = corrQuery.eq("company_id", activeCompanyId)
    }
    const { data: pendingCorrections } = await corrQuery

    const pendingMap = new Map<string, { uj_becsekkolas: string; uj_kicsekkolas: string; indoklas: string }>()
    for (const c of pendingCorrections || []) {
      pendingMap.set(c.datum as string, {
        uj_becsekkolas: c.uj_becsekkolas as string,
        uj_kicsekkolas: c.uj_kicsekkolas as string,
        indoklas: c.indoklas as string
      })
    }

    // Munkaszüneti napok és áthelyezett munkanapok lekérése az adott hónapra (országos + vállalati felülbírálás)
    let unnepnapQuery = supabase
      .from("hr_munkaszuneti_nap")
      .select("datum, megnevezes, athelye_munkanap, company_id")
      .gte("datum", startDate)
      .lte("datum", endDate)
    if (activeCompanyId) {
      unnepnapQuery = unnepnapQuery.or(`company_id.is.null,company_id.eq.${activeCompanyId}`)
    } else {
      unnepnapQuery = unnepnapQuery.is("company_id", null)
    }
    const { data: unnepnapData } = await unnepnapQuery
    const effectiveHolidayInfo = resolveEffectiveHolidays(unnepnapData as any[], activeCompanyId)

    const unnepnapok = new Set(effectiveHolidayInfo.holidays)
    const athelyezettMunkanapok = new Set(effectiveHolidayInfo.transferredWorkdays)
    const unnepNevek = new Map(effectiveHolidayInfo.rows.map(n => [n.datum as string, (n.megnevezes as string) || ""]))

    // Műszakbeosztások lekérése (HR-TASK-01 / Előzetes műszakok szinkronja)
    let shiftQuery = supabase
      .from("hr_muszak_beosztas")
      .select(`
        datum,
        sablon_id,
        egyedi_kezdes,
        egyedi_befejezes,
        tervezett_ora,
        megjegyzes,
        hr_muszak_sablon (
          kod,
          megnevezes,
          kezdes_ido,
          befejezes_ido,
          szin_kod
        )
      `)
      .eq("dolgozo_id", employeeId)
      .gte("datum", startDate)
      .lte("datum", endDate)
    if (activeCompanyId) {
      shiftQuery = shiftQuery.eq("company_id", activeCompanyId)
    }
    const { data: shiftAssignments } = await shiftQuery

    const shiftMap = new Map<string, any>()
    for (const s of (shiftAssignments as any[]) || []) {
      const rawSablon = Array.isArray(s.hr_muszak_sablon) ? s.hr_muszak_sablon[0] : s.hr_muszak_sablon
      shiftMap.set(s.datum, {
        ...s,
        sablon: rawSablon
      })
    }

    const days = getDaysInMonth(year, month)
    const timesheet: TimesheetEntry[] = []

    for (const day of days) {
      const dateStr = day.toISOString().split('T')[0]
      const dayOfWeek = day.getUTCDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const pendingCorr = pendingMap.get(dateStr)

      // Beosztott műszak ellenőrzése
      const assignedShift = shiftMap.get(dateStr)
      const shiftHours = assignedShift ? Number(assignedShift.tervezett_ora || 8.0) : null
      const shiftCode = assignedShift?.sablon?.kod || (assignedShift ? "Egyedi" : null)
      const shiftName = assignedShift?.sablon?.megnevezes || (assignedShift ? "Egyedi műszak" : null)
      const rawStart = assignedShift?.egyedi_kezdes || assignedShift?.sablon?.kezdes_ido || null
      const rawEnd = assignedShift?.egyedi_befejezes || assignedShift?.sablon?.befejezes_ido || null
      const shiftStartTime = rawStart ? String(rawStart).slice(0, 5) : null
      const shiftEndTime = rawEnd ? String(rawEnd).slice(0, 5) : null
      const shiftColor = assignedShift?.sablon?.szin_kod || null
      const isWeekendShift = isWeekend && !!assignedShift
      const isTransferredWorkday = athelyezettMunkanapok.has(dateStr)

      // Jelenlét (Munka)
      const munka = jelenletData?.find(j => j.datum === dateStr)

      // Jóváhagyott távollét
      const tavollet = tavolletData?.find(t => {
        return t.statusz === "jovahagyva" && dateStr >= t.kezdet_datuma && dateStr <= t.veg_datuma
      })

      // Jóváhagyásra váró távollét
      const pendingLeaveRow = tavolletData?.find(t => {
        return t.statusz === "jovahagyasra_var" && dateStr >= t.kezdet_datuma && dateStr <= t.veg_datuma
      })
      const pendingLeave = pendingLeaveRow
        ? { id: String(pendingLeaveRow.id), tipus: String(pendingLeaveRow.tipus) }
        : null

      if (tavollet) {
        timesheet.push({
          id: dateStr,
          datum: dateStr,
          becsekkolas_ideje: null,
          kicsekkolas_ideje: null,
          type: tavollet.tipus === "betegszabadsag" || tavollet.tipus === "tappenz" || tavollet.tipus === "beteg"
            ? "betegseg"
            : tavollet.tipus === "csusztatas"
              ? "csusztatas"
              : "szabadsag",
          note: tavollet.indoklas,
          tavollet_id: tavollet.id,
          pendingCorrection: pendingCorr,
          shiftPlannedHours: shiftHours,
          shiftCode,
          shiftName,
          shiftStartTime,
          shiftEndTime,
          shiftColor,
          isWeekendShift: false,
          isTransferredWorkday,
          pendingLeave
        })
      } else if (unnepnapok.has(dateStr)) {
        // Magyar munkaszüneti nap
        timesheet.push({
          id: dateStr,
          datum: dateStr,
          becsekkolas_ideje: null,
          kicsekkolas_ideje: null,
          type: "unnep",
          note: unnepNevek.get(dateStr),
          pendingCorrection: pendingCorr,
          shiftPlannedHours: shiftHours,
          shiftCode,
          shiftName,
          shiftStartTime,
          shiftEndTime,
          shiftColor,
          isWeekendShift: false,
          isTransferredWorkday,
          pendingLeave
        })
      } else if (munka) {
        timesheet.push({
          id: dateStr, // Unique key for the day
          record_id: munka.id, // Keep the db ID for edits/deletes
          datum: dateStr,
          becsekkolas_ideje: munka.becsekkolas_ideje,
          kicsekkolas_ideje: munka.kicsekkolas_ideje,
          szunet_perc: Number((munka as any).szunet_perc || 0),
          szunet_ms: Number((munka as any).szunet_ms || 0),
          type: "munka",
          note: assignedShift ? `Beosztott műszak (${shiftCode})` : undefined,
          pendingCorrection: pendingCorr,
          shiftPlannedHours: shiftHours,
          shiftCode,
          shiftName,
          shiftStartTime,
          shiftEndTime,
          shiftColor,
          isWeekendShift,
          isTransferredWorkday,
          pendingLeave
        })
      } else if (isWeekend) {
        timesheet.push({
          id: dateStr, // Unique key for the day
          datum: dateStr,
          becsekkolas_ideje: null,
          kicsekkolas_ideje: null,
          type: isWeekendShift || isTransferredWorkday ? "munka" : "hetvege",
          note: isWeekendShift
            ? `Hétvégi műszak (${shiftCode}: ${shiftName || "Túlóra"})`
            : isTransferredWorkday
              ? unnepNevek.get(dateStr) || "Áthelyezett munkanap"
              : undefined,
          pendingCorrection: pendingCorr,
          shiftPlannedHours: shiftHours,
          shiftCode,
          shiftName,
          shiftStartTime,
          shiftEndTime,
          shiftColor,
          isWeekendShift,
          isTransferredWorkday,
          pendingLeave
        })
      } else {
        // Nincs adat, de munkanap
        timesheet.push({
          id: dateStr, // Unique key for the day
          datum: dateStr,
          becsekkolas_ideje: null,
          kicsekkolas_ideje: null,
          type: "munka", // üres munkanap
          note: assignedShift ? `Beosztott műszak (${shiftCode})` : undefined,
          pendingCorrection: pendingCorr,
          shiftPlannedHours: shiftHours,
          shiftCode,
          shiftName,
          shiftStartTime,
          shiftEndTime,
          shiftColor,
          isWeekendShift: false,
          isTransferredWorkday,
          pendingLeave
        })
      }
    }

    let employeeFte = 1.0;
    const today = new Date().toISOString().split('T')[0];

    // Az aktuálisan érvényes beosztásból kell az FTE-t kiolvasni
    let jvQuery = supabase
      .from("hr_jogviszony")
      .select("id")
      .eq("dolgozo_id", employeeId)
      .is("kilepes_datuma", null) // aktív jogviszony (kilepes_datuma IS NULL)
      .order("belepes_datuma", { ascending: false })
      .limit(1)
    if (activeCompanyId) {
      jvQuery = jvQuery.eq("company_id", activeCompanyId)
    }
    const { data: jogviszonyData } = await jvQuery.single()

    if (jogviszonyData) {
      let beosztasQuery = supabase
        .from("hr_beosztas")
        .select("fte, munkaido_fte")
        .eq("jogviszony_id", jogviszonyData.id)
        .or(`ervenyes_ig.is.null,ervenyes_ig.gte.${today}`)
        .order("ervenyes_tol", { ascending: false })
        .limit(1)
      if (activeCompanyId) {
        beosztasQuery = beosztasQuery.eq("company_id", activeCompanyId)
      }
      const { data: beosztasData } = await beosztasQuery.maybeSingle()

      if (beosztasData) {
        // munkaido_fte az RPC által frissített érték, fte az eredeti oszlop – a frissebbet használjuk
        employeeFte = beosztasData.munkaido_fte ?? beosztasData.fte ?? 1.0
      }
    }

    return { data: timesheet, fte: employeeFte, error: null }
  } catch (err: any) {
    return { data: null, fte: 1.0, error: err.message }
  }
}

// Helper to check if month is closed
async function checkIsMonthClosed(supabase: any, employeeId: string, datum: string, activeCompanyId?: string | null) {
  const dateObj = new Date(datum)
  const ev = dateObj.getUTCFullYear()
  const honap = dateObj.getUTCMonth() + 1
  let query = supabase
    .from("hr_havi_jelenlet_zaras")
    .select("statusz")
    .eq("dolgozo_id", employeeId)
    .eq("ev", ev)
    .eq("honap", honap)
  if (activeCompanyId) {
    query = query.eq("company_id", activeCompanyId)
  }
  const { data } = await query.single()

  if (data && data.statusz !== 'nyitott') {
    return true
  }
  return false
}

// 2. Add or Update Attendance Record
export async function saveAttendanceRecord(
  employeeId: string,
  datum: string,
  becsekkolas_ideje: string | null,
  kicsekkolas_ideje: string | null
) {
  try {
    const access = await verifyTimesheetEmployeeAccess(employeeId, {
      allowSelf: false,
      requiredModules: ["time", "admin", "vezeto"],
    })
    if (!access.ok) {
      throw new Error(access.error)
    }
    const { supabase, activeCompanyId } = access

    if (await checkIsMonthClosed(supabase, employeeId, datum, activeCompanyId)) {
      throw new Error("Ez a hónap már le van zárva vagy jóváhagyásra vár, nem szerkeszthető!")
    }

    // Orvosi alkalmasság cégszintű ellenőrzése jelenlét rögzítése előtt (Mvt. 49. §)
    let examQuery = supabase
      .from("hr_orvosi_vizsgalat")
      .select("ervenyesseg_datuma")
      .eq("dolgozo_id", employeeId)
      .order("vizsgalat_datuma", { ascending: false })
      .limit(1)
    if (activeCompanyId) {
      examQuery = examQuery.eq("company_id", activeCompanyId)
    }

    const [{ data: latestExam }, { data: adatlap }] = await Promise.all([
      examQuery.maybeSingle(),
      supabase
        .from("hr_dolgozo_adatlap")
        .select("company_id, orvosi_alkalmassag_ervenyesseg")
        .eq("id", employeeId)
        .maybeSingle(),
    ])

    const isAdatlapForCompany =
      !activeCompanyId || !adatlap?.company_id || adatlap.company_id === activeCompanyId
    const effectiveMedicalExpiry =
      latestExam?.ervenyesseg_datuma ||
      (isAdatlapForCompany ? adatlap?.orvosi_alkalmassag_ervenyesseg : null)

    const medicalCheck = checkMedicalValidityForDate(effectiveMedicalExpiry, datum)
    if (!medicalCheck.isValid) {
      throw new Error(
        medicalCheck.errorMessage ||
          "A jelenlét nem rögzíthető: a dolgozó orvosi alkalmassága lejárt vagy hiányzik!"
      )
    }

    const { error } = await supabase
      .from("hr_jelenlet")
      .upsert(
        {
          company_id: activeCompanyId || undefined,
          dolgozo_id: employeeId,
          datum,
          becsekkolas_ideje,
          kicsekkolas_ideje,
        },
        { onConflict: "dolgozo_id,datum" }
      )

    if (error) throw new Error(error.message)

    revalidatePath("/hr")
    return { error: null }
  } catch (err: any) {
    return { error: err.message }
  }
}

// 3. Delete Attendance Record
export async function deleteAttendanceRecord(id: string, employeeId: string, datum: string) {
  try {
    const access = await verifyTimesheetEmployeeAccess(employeeId, {
      allowSelf: false,
      requiredModules: ["time", "admin", "vezeto"],
    })
    if (!access.ok) {
      throw new Error(access.error)
    }
    const { supabase, activeCompanyId } = access

    if (await checkIsMonthClosed(supabase, employeeId, datum)) {
      throw new Error("Ez a hónap már le van zárva, nem törölhető!")
    }

    const { createClient: createAdminClient } = await import("@supabase/supabase-js")
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let delQuery = adminClient
      .from("hr_jelenlet")
      .delete()
      .eq("id", id)
      .eq("dolgozo_id", employeeId)
    if (activeCompanyId) {
      delQuery = delQuery.eq("company_id", activeCompanyId)
    }

    const { error } = await delQuery

    if (error) throw new Error(error.message)

    revalidatePath("/hr")
    return { error: null }
  } catch (err: any) {
    return { error: err.message }
  }
}

// 4. Get Monthly Closing Status
export async function getMonthlyClosingStatus(employeeId: string, year: number, month: number) {
  try {
    const access = await verifyTimesheetEmployeeAccess(employeeId, { allowSelf: true })
    if (!access.ok) {
      return { data: null, error: access.error }
    }
    const { supabase, activeCompanyId } = access

    let query = supabase
      .from("hr_havi_jelenlet_zaras")
      .select("*")
      .eq("dolgozo_id", employeeId)
      .eq("ev", year)
      .eq("honap", month)
    if (activeCompanyId) {
      query = query.eq("company_id", activeCompanyId)
    }
    const { data, error } = await query.single()

    if (error && error.code !== 'PGRST116') throw new Error(error.message)
    return { data: data || { statusz: 'nyitott' }, error: null }
  } catch (err: any) {
    return { data: null, error: err.message }
  }
}

// 5. Submit Monthly Timesheet
export async function submitMonthlyTimesheet(employeeId: string, year: number, month: number) {
  try {
    const access = await verifyTimesheetEmployeeAccess(employeeId, {
      allowSelf: true,
      requiredModules: ["time", "admin", "vezeto"],
    })
    if (!access.ok) {
      return { error: access.error }
    }
    const { supabase, activeCompanyId } = access

    let existingQuery = supabase
      .from("hr_havi_jelenlet_zaras")
      .select("id")
      .eq("dolgozo_id", employeeId)
      .eq("ev", year)
      .eq("honap", month)
    if (activeCompanyId) {
      existingQuery = existingQuery.eq("company_id", activeCompanyId)
    }
    const { data: existing } = await existingQuery.single()

    if (existing) {
      let updateQuery = supabase
        .from("hr_havi_jelenlet_zaras")
        .update({ statusz: 'jovahagyasra_var', bekuldve_at: new Date().toISOString() })
        .eq("id", existing.id)
      if (activeCompanyId) {
        updateQuery = updateQuery.eq("company_id", activeCompanyId)
      }
      const { error } = await updateQuery
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase
        .from("hr_havi_jelenlet_zaras")
        .insert({
          company_id: activeCompanyId || undefined,
          dolgozo_id: employeeId,
          ev: year,
          honap: month,
          statusz: 'jovahagyasra_var',
          bekuldve_at: new Date().toISOString()
        })
      if (error) throw new Error(error.message)
    }

    revalidatePath("/hr")
    return { error: null }
  } catch (err: any) {
    return { error: err.message }
  }
}

// 6. Approve Monthly Timesheet
export async function approveMonthlyTimesheet(employeeId: string, year: number, month: number) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Nincs bejelentkezve")

    const { requireHrAuthServer } = await import("@/utils/hr/hr-auth-guard")
    const auth = await requireHrAuthServer(["time", "admin", "vezeto"], null)
    if (!auth.authorized) {
      throw new Error("Nincs jogosultságod a havi jelenléti ív jóváhagyásához!")
    }

    // Önjóváhagyás tiltása (kivéve cégadmin)
    if (employeeId === user.id && !auth.isCompanyAdmin && auth.hrRole !== "admin") {
      throw new Error("Saját havi jelenléti ívedet nem hagyhatod jóvá önmagadnak!")
    }

    const activeCompanyId = auth.activeCompanyId || (await getActiveCompanyIdServer())
    let updateQuery = supabase
      .from("hr_havi_jelenlet_zaras")
      .update({
        statusz: 'jovahagyva',
        jovahagyva_at: new Date().toISOString(),
        jovahagyo_vezeto_id: user.id
      })
      .eq("dolgozo_id", employeeId)
      .eq("ev", year)
      .eq("honap", month)
    if (activeCompanyId) {
      updateQuery = updateQuery.eq("company_id", activeCompanyId)
    }

    const { error } = await updateQuery

    if (error) throw new Error(error.message)

    revalidatePath("/hr")
    return { error: null }
  } catch (err: any) {
    return { error: err.message }
  }
}

// 7. Get Monthly Timesheet Filed Document
export async function getMonthlyTimesheetDocument(employeeId: string, year: number, month: number) {
  try {
    const access = await verifyTimesheetEmployeeAccess(employeeId, { allowSelf: true })
    if (!access.ok) {
      return { doc: null, error: access.error }
    }
    const { supabase, activeCompanyId } = access

    const monthNames = [
      "január", "február", "március", "április", "május", "június",
      "július", "augusztus", "szeptember", "október", "november", "december"
    ]
    const monthName = monthNames[month - 1]

    let docsQuery = supabase
      .from("hr_dokumentum")
      .select("id, nev, kategoria, url, iktatoszam, ugyirat_id, created_at")
      .eq("dolgozo_id", employeeId)
      .eq("kategoria", "Havi jelenléti ív")
      .order("created_at", { ascending: false })
    if (activeCompanyId) {
      docsQuery = docsQuery.eq("company_id", activeCompanyId)
    }
    const { data: docs } = await docsQuery

    const matchingDoc = docs?.find(d =>
      d.nev.includes(`${year}`) && (d.nev.toLowerCase().includes(monthName) || d.nev.includes(`.${month}.`))
    )

    if (matchingDoc?.url) {
      const { data } = await supabase.storage.from("irat_files").createSignedUrl(matchingDoc.url, 3600)
      return { doc: { ...matchingDoc, signedUrl: data?.signedUrl || matchingDoc.url } }
    }

    return { doc: matchingDoc || null }
  } catch (err: any) {
    return { doc: null, error: err.message }
  }
}

// 8. File Monthly Timesheet into Personal Dossier (eaisyDocs)
export async function fileMonthlyTimesheet(employeeId: string, year: number, month: number) {
  try {
    const access = await verifyTimesheetEmployeeAccess(employeeId, {
      allowSelf: false,
      requiredModules: ["time", "admin", "vezeto", "payroll", "employees"],
    })
    if (!access.ok) {
      return { success: false, error: access.error }
    }
    const { supabase, user } = access

    const { generateTimesheetPdfBuffer } = await import("@/utils/hr/timesheet-pdf-generator")
    const { executeHrDocumentFiling } = await import("@/utils/hr-filing-bridge")
    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")

    // 1. PDF Buffer generálása
    const { buffer, employeeName, monthName } = await generateTimesheetPdfBuffer(supabase, employeeId, year, month)
    const storagePath = `timesheets/${employeeId}/${year}_${month}_jelenleti_iv_${Date.now()}.pdf`

    // 2. Feltöltés a Supabase Storage-be
    const { error: uploadError } = await supabase.storage
      .from("irat_files")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true
      })

    if (uploadError) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceRoleKey) {
        const supabaseAdmin = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
        const { error: adminUploadError } = await supabaseAdmin.storage
          .from("irat_files")
          .upload(storagePath, buffer, {
            contentType: "application/pdf",
            upsert: true
          })
        if (adminUploadError) {
          throw new Error("Storage feltöltési hiba: " + adminUploadError.message)
        }
      } else {
        throw new Error("Storage feltöltési hiba: " + uploadError.message)
      }
    }

    // 3. Dokumentum rekord létrehozása / keresése
    const activeCompanyId = await getActiveCompanyIdServer()
    const docName = `${employeeName} - Havi jelenléti ív (${year}. ${monthName})`
    let existingDocQuery = supabase
      .from("hr_dokumentum")
      .select("id, iktatoszam")
      .eq("dolgozo_id", employeeId)
      .eq("kategoria", "Havi jelenléti ív")
      .ilike("nev", `%${year}.%${monthName}%`)
    if (activeCompanyId) {
      existingDocQuery = existingDocQuery.eq("company_id", activeCompanyId)
    }
    const { data: existingDoc } = await existingDocQuery.maybeSingle()

    let docId = existingDoc?.id

    if (!docId) {
      const { data: newDoc, error: insertError } = await supabase
        .from("hr_dokumentum")
        .insert({
          dolgozo_id: employeeId,
          nev: docName,
          kategoria: "Havi jelenléti ív",
          url: storagePath,
          company_id: activeCompanyId
        })
        .select("id")
        .single()

      if (insertError) throw new Error("Dokumentum mentési hiba: " + insertError.message)
      docId = newDoc.id
    }

    // 4. Hivatalos iktatás végrehajtása az eaisyDocs személyi dossziéba
    const filingResult = await executeHrDocumentFiling(supabase, {
      documentId: docId,
      employeeId,
      customTargy: docName,
      currentUserId: user.id
    })

    if (!filingResult.success) {
      return { success: false, error: filingResult.error }
    }

    // 5. Naplózás
    await supabase.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      esemeny_tipus: "adat_letrehozas",
      entitas_tipus: "hr_dokumentum",
      entitas_id: docId,
      megjegyzes: `Havi jelenléti ív (${year}. ${monthName}) hivatalosan beiktatva a dolgozó személyi dossziéjába (${filingResult.iktatoszam}).`
    })

    revalidatePath(`/hr/employee/${employeeId}`)
    revalidatePath("/hr")

    return {
      success: true,
      iktatoszam: filingResult.iktatoszam,
      ugyirat_id: filingResult.ugyirat_id
    }
  } catch (err: any) {
    console.error("fileMonthlyTimesheet error:", err)
    return { success: false, error: err.message || "Váratlan hiba történt a jelenléti ív iktatásakor." }
  }
}

// 7. Túlóra kérelem jóváhagyása vagy elutasítása (Vezető / HR)
export async function handleOvertimeApproval(
  requestId: string,
  action: "jovahagyva" | "elutasitva",
  rejectReason?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const auth = await requireHrAuthServer(["time", "admin", "vezeto"], null)
  if (!auth.authorized) {
    return { error: "A túlóra kérelem elbírálása csak vezetői vagy HR/admin jogosultsággal lehetséges." }
  }
  const activeCompanyId = auth.activeCompanyId || (await getActiveCompanyIdServer())

  // Lekérjük a kérelmet
  const { data: req, error: fetchErr } = await supabase
    .from("hr_tulora_felhasznalás")
    .select("*, felhasznalo_profil:dolgozo_id(nev)")
    .eq("id", requestId)
    .single()

  if (fetchErr || !req) {
    return { error: "A túlóra kérelem nem található." }
  }

  if (req.dolgozo_id === user.id) {
    return { error: "Saját túlóra kérelmet nem hagyhatsz jóvá!" }
  }

  if (activeCompanyId && req.company_id && req.company_id !== activeCompanyId) {
    return { error: "A túlóra kérelem másik vállalathoz tartozik." }
  }

  const cleanedReason = action === "elutasitva" ? (rejectReason?.trim() || null) : null

  let updateQuery = supabase
    .from("hr_tulora_felhasznalás")
    .update({
      statusz: action,
      jovahagyo_id: user.id,
      jovahagyva_at: new Date().toISOString(),
      elutasitas_oka: cleanedReason,
    })
    .eq("id", requestId)
  if (activeCompanyId) {
    updateQuery = updateQuery.eq("company_id", activeCompanyId)
  }
  const { error } = await updateQuery

  if (error) {
    console.error("Overtime approval error:", error)
    return { error: "Hiba történt a kérelem feldolgozásakor: " + error.message }
  }

  if (req.tavollet_id) {
    await supabase
      .from("hr_tavollet")
      .update({ elutasitas_oka: cleanedReason })
      .eq("id", req.tavollet_id)
  }

  // Értesítés küldése a kérelmező dolgozónak
  const cim = action === "jovahagyva" ? "Túlóra kérelem jóváhagyva" : "Túlóra kérelem elutasítva"
  const tipusNev = req.tipus === "kiveszi_szabinak" ? "csúsztatási" : "kifizetési"
  const h = Math.floor(req.perc / 60)
  const m = req.perc % 60
  const durationStr = h > 0 ? `${h} óra${m > 0 ? ` ${m} perc` : ""}` : `${m} perc`

  const szoveg = action === "jovahagyva"
    ? `A vezetőd jóváhagyta a ${tipusNev} kérelmedet (${durationStr}).`
    : `A vezetőd elutasította a ${tipusNev} kérelmedet (${durationStr}).${rejectReason?.trim() ? ` Indoklás: ${rejectReason.trim()}` : ""}`

  if (action === "elutasitva") {
    await supabase.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      entitas_tipus: "hr_tulora_felhasznalás",
      entitas_id: requestId,
      esemeny_tipus: "elutasitas",
      megjegyzes: `Túlóra (${tipusNev}, ${durationStr}) kérelem elutasítva.${rejectReason?.trim() ? ` Indoklás: ${rejectReason.trim()}` : ""}`,
      ...(activeCompanyId ? { company_id: activeCompanyId } : {})
    })
  }

  await supabase.from("alkalmazas_ertesites").insert({
    user_id: req.dolgozo_id,
    cim,
    szoveg,
    link_url: "/hr/self-service/time"
  })

  revalidatePath("/hr", "layout")
  return { success: true }
}

export async function handleAttendanceCorrectionApproval(
  correctionId: string,
  action: "jovahagyva" | "elutasitva",
  elutasitasOka?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  // ── HR deep-analysis 20261029 (2.1) P0-javítás (2026-11-01): őrblokk ──
  // A jóváhagyás közvetlenül a BÉRSZÁMFEJTÉS alapját író hr_jelenlet-adatot módosítja —
  // korábban csak bejelentkezést ellenőrzött, a dolgozó saját magának is jóváhagyhatott.
  const { requireHrAuthServer } = await import("@/utils/hr/hr-auth-guard")
  const auth = await requireHrAuthServer(["vezeto"], null)
  if (!auth.authorized) {
    return { error: "A jelenlétkorrekció elbírálása csak vezetői vagy adminisztrátori szerepkörrel lehetséges." }
  }

  // Lekérjük a kérelmet
  const { data: request, error: reqErr } = await supabase
    .from("hr_jelenlet_korrekcio")
    .select("*, felhasznalo_profil:dolgozo_id(nev)")
    .eq("id", correctionId)
    .single()

  if (reqErr || !request) {
    return { error: "A kérelem nem található." }
  }

  if (request.statusz !== "jovahagyasra_var") {
    return { error: "Ez a kérelem már el lett bírálva!" }
  }

  // Saját maga kérelmét senki nem bíálhatja el (önjóváhagyás tiltása)
  if (request.dolgozo_id === user.id) {
    return { error: "Saját jelenlétkorrekciós kérelmedet nem hagyhatod jóvá önmagadnak." }
  }

  // Cég-ellenőrzés: a kérelem az aktív céghez tartozzon
  if (auth.activeCompanyId && request.company_id && request.company_id !== auth.activeCompanyId) {
    return { error: "A kérelem másik céghez tartozik." }
  }

  const nowIso = new Date().toISOString()
  const { createClient: createAdminClient } = await import("@supabase/supabase-js")
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const resolvedCompanyId = request.company_id || auth.activeCompanyId || (await getActiveCompanyIdServer())

  if (action === "jovahagyva") {
    // 1. Érvényesítjük a módosítást a hr_jelenlet táblában ELŐSZÖR
    let existingJelenletQuery = adminClient
      .from("hr_jelenlet")
      .select("id")
      .eq("dolgozo_id", request.dolgozo_id)
      .eq("datum", request.datum)
    if (resolvedCompanyId) {
      existingJelenletQuery = existingJelenletQuery.eq("company_id", resolvedCompanyId)
    }
    const { data: existingJelenlet } = await existingJelenletQuery.maybeSingle()

    if (existingJelenlet) {
      const { error: jelenletUpdateErr } = await adminClient
        .from("hr_jelenlet")
        .update({
          becsekkolas_ideje: request.uj_becsekkolas,
          kicsekkolas_ideje: request.uj_kicsekkolas
        })
        .eq("id", existingJelenlet.id)

      if (jelenletUpdateErr) {
        console.error("Hiba a hr_jelenlet frissítésekor:", jelenletUpdateErr)
        return { error: "Hiba a jelenlét rekord frissítésekor: " + jelenletUpdateErr.message }
      }
    } else {
      const { error: jelenletInsertErr } = await adminClient
        .from("hr_jelenlet")
        .insert({
          dolgozo_id: request.dolgozo_id,
          datum: request.datum,
          becsekkolas_ideje: request.uj_becsekkolas,
          kicsekkolas_ideje: request.uj_kicsekkolas,
          ...(resolvedCompanyId ? { company_id: resolvedCompanyId } : {})
        })

      if (jelenletInsertErr) {
        console.error("Hiba a hr_jelenlet beszúrásakor:", jelenletInsertErr)
        return { error: "Hiba a jelenlét rekord beszúrásakor: " + jelenletInsertErr.message }
      }
    }

    // 2. Csak a sikeres jelenlét mentés után frissítjük a kérelem státuszát
    const { error: updateReqErr } = await adminClient
      .from("hr_jelenlet_korrekcio")
      .update({
        statusz: "jovahagyva",
        jovahagyo_id: user.id,
        jovahagyva_ekkor: nowIso
      })
      .eq("id", correctionId)

    if (updateReqErr) return { error: "Nem sikerült frissíteni a kérelmet: " + updateReqErr.message }

    // 3. Audit log
    await adminClient.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      entitas_tipus: "hr_jelenlet_korrekcio",
      entitas_id: correctionId,
      esemeny_tipus: "jelenlet_korrekcio_jovahagyva",
      megjegyzes: `Vezető jóváhagyta a(z) ${request.datum} napi jelenlét korrekciót (${(request as any).felhasznalo_profil?.nev || "Dolgozó"}).`,
      ...(resolvedCompanyId ? { company_id: resolvedCompanyId } : {}),
    })

    // 4. Dolgozó értesítése
    await adminClient.from("alkalmazas_ertesites").insert({
      user_id: request.dolgozo_id,
      cim: "Jelenléti korrekció jóváhagyva",
      szoveg: `A(z) ${request.datum} napra benyújtott munkaidő korrekciódat a vezetőd jóváhagyta.`,
      link_url: "/hr/self-service/time"
    })
  } else {
    // Elutasítás
    const { error: rejectErr } = await adminClient
      .from("hr_jelenlet_korrekcio")
      .update({
        statusz: "elutasitva",
        jovahagyo_id: user.id,
        elutasitas_oka: elutasitasOka || null
      })
      .eq("id", correctionId)

    if (rejectErr) return { error: "Nem sikerült elutasítani a kérelmet: " + rejectErr.message }

    // Audit log
    await adminClient.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      entitas_tipus: "hr_jelenlet_korrekcio",
      entitas_id: correctionId,
      esemeny_tipus: "jelenlet_korrekcio_elutasitva",
      megjegyzes: `Vezető elutasította a(z) ${request.datum} napi korrekciót. Indok: ${elutasitasOka || "Nincs megadva"}`,
      ...(resolvedCompanyId ? { company_id: resolvedCompanyId } : {}),
    })

    // Dolgozó értesítése
    await adminClient.from("alkalmazas_ertesites").insert({
      user_id: request.dolgozo_id,
      cim: "Jelenléti korrekció elutasítva",
      szoveg: `A(z) ${request.datum} napra benyújtott munkaidő korrekciódat elutasították.${elutasitasOka ? ` Indoklás: ${elutasitasOka}` : ""}`,
      link_url: "/hr/self-service/time"
    })
  }

  const { revalidatePath } = await import("next/cache")
  revalidatePath("/hr", "layout")
  revalidatePath("/hr/manager")
  revalidatePath(`/hr/employee/${request.dolgozo_id}`)
  revalidatePath("/hr/self-service/time")
  return { success: true }
}

