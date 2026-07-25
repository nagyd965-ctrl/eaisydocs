"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

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
export async function getMonthlyTimesheet(employeeId: string, year: number, month: number): Promise<{ data: TimesheetEntry[] | null, error: string | null }> {
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
          id: dateStr, // Unique key for the day
          datum: dateStr,
          becsekkolas_ideje: null,
          kicsekkolas_ideje: null,
          type: tavollet.tipus === "betegszabadsag" || tavollet.tipus === "tappenz" ? "betegseg" : "szabadsag",
          note: tavollet.indoklas,
          tavollet_id: tavollet.id
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

    return { data: timesheet, error: null }
  } catch (err: any) {
    return { data: null, error: err.message }
  }
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
export async function deleteAttendanceRecord(id: string) {
  try {
    const supabase = await createClient()
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
