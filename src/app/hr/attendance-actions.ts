"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export type TimesheetEntry = {
  id: string
  record_id?: string
  datum: string
  becsekkolas_ideje: string | null
  kicsekkolas_ideje: string | null
  type: "munka" | "szabadsag" | "betegseg" | "hetvege" | "unnep"
  note?: string
  tavollet_id?: string
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
    const supabase = await createClient()

    const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString().split('T')[0]
    const endDate = new Date(Date.UTC(year, month, 0)).toISOString().split('T')[0]

    // Fetch Jelenlét
    const { data: jelenletData, error: jelenletError } = await supabase
      .from("hr_jelenlet")
      .select("*")
      .eq("dolgozo_id", employeeId)
      .gte("datum", startDate)
      .lte("datum", endDate)

    if (jelenletError) throw new Error(jelenletError.message)

    // Fetch Távollét
    const { data: tavolletData, error: tavolletError } = await supabase
      .from("hr_tavollet")
      .select("*")
      .eq("dolgozo_id", employeeId)
      .eq("statusz", "jovahagyva")
      .or(`kezdet_datuma.lte.${endDate},veg_datuma.gte.${startDate}`)

    if (tavolletError) throw new Error(tavolletError.message)

    // Munkaszüneti napok lekérése az adott hónapra
    const { data: unnepnapData } = await supabase
      .from("hr_munkaszuneti_nap")
      .select("datum, megnevezes, athelye_munkanap")
      .gte("datum", startDate)
      .lte("datum", endDate)
      .eq("athelye_munkanap", false)

    const unnepnapok = new Set((unnepnapData || []).map(n => n.datum as string))
    const unnepNevek = new Map((unnepnapData || []).map(n => [n.datum as string, n.megnevezes as string]))

    const days = getDaysInMonth(year, month)
    const timesheet: TimesheetEntry[] = []

    for (const day of days) {
      const dateStr = day.toISOString().split('T')[0]
      const dayOfWeek = day.getUTCDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

      // Jelenlét (Munka)
      const munka = jelenletData?.find(j => j.datum === dateStr)
      
      // Távollét
      const tavollet = tavolletData?.find(t => {
        return dateStr >= t.kezdet_datuma && dateStr <= t.veg_datuma
      })

      if (tavollet) {
        timesheet.push({
          id: dateStr,
          datum: dateStr,
          becsekkolas_ideje: null,
          kicsekkolas_ideje: null,
          type: tavollet.tipus === "betegszabadsag" || tavollet.tipus === "tappenz" ? "betegseg" : "szabadsag",
          note: tavollet.indoklas,
          tavollet_id: tavollet.id
        })
      } else if (unnepnapok.has(dateStr)) {
        // Magyar munkaszüneti nap
        timesheet.push({
          id: dateStr,
          datum: dateStr,
          becsekkolas_ideje: null,
          kicsekkolas_ideje: null,
          type: "unnep",
          note: unnepNevek.get(dateStr)
        })
      } else if (munka) {
        timesheet.push({
          id: dateStr, // Unique key for the day
          record_id: munka.id, // Keep the db ID for edits/deletes
          datum: dateStr,
          becsekkolas_ideje: munka.becsekkolas_ideje,
          kicsekkolas_ideje: munka.kicsekkolas_ideje,
          type: "munka"
        })
      } else if (isWeekend) {
        timesheet.push({
          id: dateStr, // Unique key for the day
          datum: dateStr,
          becsekkolas_ideje: null,
          kicsekkolas_ideje: null,
          type: "hetvege"
        })
      } else {
        // Nincs adat, de munkanap
        timesheet.push({
          id: dateStr, // Unique key for the day
          datum: dateStr,
          becsekkolas_ideje: null,
          kicsekkolas_ideje: null,
          type: "munka" // üres munkanap
        })
      }
    }

    let employeeFte = 1.0;
    const today = new Date().toISOString().split('T')[0];

    // Az aktuálisan érvényes beosztásból kell az FTE-t kiolvasni
    const { data: jogviszonyData } = await supabase
      .from("hr_jogviszony")
      .select("id")
      .eq("dolgozo_id", employeeId)
      .is("kilepes_datuma", null) // aktív jogviszony (kilepes_datuma IS NULL)
      .order("belepes_datuma", { ascending: false })
      .limit(1)
      .single()

    if (jogviszonyData) {
      const { data: beosztasData } = await supabase
        .from("hr_beosztas")
        .select("fte, munkaido_fte")
        .eq("jogviszony_id", jogviszonyData.id)
        .or(`ervenyes_ig.is.null,ervenyes_ig.gte.${today}`)
        .order("ervenyes_tol", { ascending: false })
        .limit(1)
        .single()

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
async function checkIsMonthClosed(supabase: any, employeeId: string, datum: string) {
  const dateObj = new Date(datum)
  const ev = dateObj.getUTCFullYear()
  const honap = dateObj.getUTCMonth() + 1
  const { data } = await supabase
    .from("hr_havi_jelenlet_zaras")
    .select("statusz")
    .eq("dolgozo_id", employeeId)
    .eq("ev", ev)
    .eq("honap", honap)
    .single()
  
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
    const supabase = await createClient()

    if (await checkIsMonthClosed(supabase, employeeId, datum)) {
      throw new Error("Ez a hónap már le van zárva vagy jóváhagyásra vár, nem szerkeszthető!")
    }

    const { data: existing } = await supabase
      .from("hr_jelenlet")
      .select("id")
      .eq("dolgozo_id", employeeId)
      .eq("datum", datum)
      .single()

    if (existing) {
      const { error } = await supabase
        .from("hr_jelenlet")
        .update({
          becsekkolas_ideje,
          kicsekkolas_ideje
        })
        .eq("id", existing.id)

      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase
        .from("hr_jelenlet")
        .insert({
          dolgozo_id: employeeId,
          datum,
          becsekkolas_ideje,
          kicsekkolas_ideje
        })

      if (error) throw new Error(error.message)
    }

    revalidatePath("/hr")
    return { error: null }
  } catch (err: any) {
    return { error: err.message }
  }
}

// 3. Delete Attendance Record
export async function deleteAttendanceRecord(id: string, employeeId: string, datum: string) {
  try {
    const supabase = await createClient()
    
    if (await checkIsMonthClosed(supabase, employeeId, datum)) {
      throw new Error("Ez a hónap már le van zárva, nem törölhető!")
    }

    const { error } = await supabase
      .from("hr_jelenlet")
      .delete()
      .eq("id", id)

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
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("hr_havi_jelenlet_zaras")
      .select("*")
      .eq("dolgozo_id", employeeId)
      .eq("ev", year)
      .eq("honap", month)
      .single()

    if (error && error.code !== 'PGRST116') throw new Error(error.message)
    return { data: data || { statusz: 'nyitott' }, error: null }
  } catch (err: any) {
    return { data: null, error: err.message }
  }
}

// 5. Submit Monthly Timesheet
export async function submitMonthlyTimesheet(employeeId: string, year: number, month: number) {
  try {
    const supabase = await createClient()
    
    const { data: existing } = await supabase
      .from("hr_havi_jelenlet_zaras")
      .select("id")
      .eq("dolgozo_id", employeeId)
      .eq("ev", year)
      .eq("honap", month)
      .single()

    if (existing) {
      const { error } = await supabase
        .from("hr_havi_jelenlet_zaras")
        .update({ statusz: 'jovahagyasra_var', bekuldve_at: new Date().toISOString() })
        .eq("id", existing.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase
        .from("hr_havi_jelenlet_zaras")
        .insert({
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

    const { error } = await supabase
      .from("hr_havi_jelenlet_zaras")
      .update({ 
        statusz: 'jovahagyva', 
        jovahagyva_at: new Date().toISOString(),
        jovahagyo_vezeto_id: user.id
      })
      .eq("dolgozo_id", employeeId)
      .eq("ev", year)
      .eq("honap", month)

    if (error) throw new Error(error.message)

    revalidatePath("/hr")
    return { error: null }
  } catch (err: any) {
    return { error: err.message }
  }
}
