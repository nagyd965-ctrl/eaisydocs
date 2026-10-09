"use server"

import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { revalidatePath } from "next/cache"
import {
  ShiftTemplate,
  ShiftAssignment,
  ShiftPlannerEmployee,
  WeeklyRosterData,
  ShiftDayLeave,
} from "@/types/shifts"
import { addDays, format, parseISO, startOfWeek, endOfWeek, subDays } from "date-fns"

export async function getCompanyShiftTemplates(): Promise<ShiftTemplate[]> {
  const supabase = await createClient()
  const activeCompanyId = await getActiveCompanyIdServer()
  if (!activeCompanyId) return []

  const { data, error } = await supabase
    .from("hr_muszak_sablon")
    .select("*")
    .eq("company_id", activeCompanyId)
    .eq("is_active", true)
    .order("kod", { ascending: true })

  if (error) {
    console.error("Error fetching shift templates:", error)
    return []
  }

  return (data || []).map((t) => ({
    id: t.id,
    company_id: t.company_id,
    kod: t.kod,
    megnevezes: t.megnevezes,
    kezdes_ido: t.kezdes_ido,
    befejezes_ido: t.befejezes_ido,
    munkaora: Number(t.munkaora || 8),
    szunet_perc: t.szunet_perc || 30,
    szin_kod: t.szin_kod || "#0d9488",
    is_active: t.is_active,
    created_at: t.created_at,
    updated_at: t.updated_at,
  }))
}

export async function getWeeklyShiftRoster(
  weekStartInput?: string
): Promise<WeeklyRosterData> {
  const supabase = await createClient()
  const activeCompanyId = await getActiveCompanyIdServer()
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"

  // Számoljuk a hétfőtől vasárnapig tartó intervallumot
  const baseDate = weekStartInput ? parseISO(weekStartInput) : new Date()
  const monday = startOfWeek(baseDate, { weekStartsOn: 1 })
  const sunday = endOfWeek(baseDate, { weekStartsOn: 1 })

  const weekStartStr = format(monday, "yyyy-MM-dd")
  const weekEndStr = format(sunday, "yyyy-MM-dd")

  // 1. Sablonok lekérése
  const templates = await getCompanyShiftTemplates()

  // 2. Dolgozók és orvosi adatok lekérése
  const { data: rawEmployees } = await supabase
    .from("hr_jogviszony")
    .select(`
      id,
      dolgozo_id,
      kilepes_datuma,
      created_at,
      hr_dolgozo_adatlap (
        id,
        orvosi_alkalmassag_ervenyesseg,
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

  const employeeMap = new Map<string, ShiftPlannerEmployee>()
  for (const j of (rawEmployees as any[]) || []) {
    if (!j.dolgozo_id) continue
    const existing = employeeMap.get(j.dolgozo_id)
    if (!existing || (!j.kilepes_datuma && (existing as any).kilepes_datuma)) {
      const adatlap = j.hr_dolgozo_adatlap
      const prof = adatlap?.felhasznalo_profil
      const orgUnitObj = Array.isArray(prof?.hr_szervezeti_egyseg)
        ? prof?.hr_szervezeti_egyseg[0]
        : prof?.hr_szervezeti_egyseg

      const medExpiry = adatlap?.orvosi_alkalmassag_ervenyesseg
        ? format(parseISO(adatlap.orvosi_alkalmassag_ervenyesseg), "yyyy-MM-dd")
        : null

      let medStatus: "ervenyes" | "lejar_hamarosan" | "lejart" | "nincs_adat" = "nincs_adat"
      if (medExpiry) {
        if (medExpiry < weekStartStr) {
          medStatus = "lejart"
        } else {
          // Ha a következő 30 napban jár le
          const thirtyDaysLater = format(addDays(monday, 30), "yyyy-MM-dd")
          if (medExpiry <= thirtyDaysLater) {
            medStatus = "lejar_hamarosan"
          } else {
            medStatus = "ervenyes"
          }
        }
      }

      employeeMap.set(j.dolgozo_id, {
        id: j.dolgozo_id,
        nev: prof?.nev || "Ismeretlen dolgozó",
        avatar_url: prof?.avatar_url || null,
        munkakor: j.hr_beosztas?.[0]?.hr_munkakor?.megnevezes || "Nincs beosztás",
        szervezeti_egyseg_id: prof?.hr_szervezeti_egyseg_id || orgUnitObj?.id || null,
        szervezeti_egyseg_nev: orgUnitObj?.nev || "Egyéb részleg",
        orvosi_ervenyesseg: medExpiry,
        orvosi_statusz: medStatus,
      })
    }
  }
  const employees = Array.from(employeeMap.values()).sort((a, b) =>
    a.nev.localeCompare(b.nev, "hu")
  )

  // 3. Adott heti műszakbeosztások lekérése sablonnal összekapcsolva
  const { data: rawAssignments } = await supabase
    .from("hr_muszak_beosztas")
    .select(`
      id,
      company_id,
      dolgozo_id,
      datum,
      sablon_id,
      egyedi_kezdes,
      egyedi_befejezes,
      tervezett_ora,
      megjegyzes,
      statusz,
      hr_muszak_sablon (
        id,
        company_id,
        kod,
        megnevezes,
        kezdes_ido,
        befejezes_ido,
        munkaora,
        szunet_perc,
        szin_kod,
        is_active
      )
    `)
    .eq("company_id", companyScope)
    .gte("datum", weekStartStr)
    .lte("datum", weekEndStr)

  const assignments: ShiftAssignment[] = ((rawAssignments as any[]) || []).map((a) => {
    const rawSablon = Array.isArray(a.hr_muszak_sablon)
      ? a.hr_muszak_sablon[0]
      : a.hr_muszak_sablon
    return {
      id: a.id,
      company_id: a.company_id,
      dolgozo_id: a.dolgozo_id,
      datum: a.datum,
      sablon_id: a.sablon_id,
      egyedi_kezdes: a.egyedi_kezdes,
      egyedi_befejezes: a.egyedi_befejezes,
      tervezett_ora: Number(a.tervezett_ora || 8),
      megjegyzes: a.megjegyzes,
      statusz: a.statusz,
      sablon: rawSablon
        ? {
            id: rawSablon.id,
            company_id: rawSablon.company_id,
            kod: rawSablon.kod,
            megnevezes: rawSablon.megnevezes,
            kezdes_ido: rawSablon.kezdes_ido,
            befejezes_ido: rawSablon.befejezes_ido,
            munkaora: Number(rawSablon.munkaora || 8),
            szunet_perc: rawSablon.szunet_perc || 30,
            szin_kod: rawSablon.szin_kod || "#0d9488",
            is_active: rawSablon.is_active,
          }
        : null,
    }
  })

  // 4. Adott heti jóváhagyott/folyamatban lévő távollétek lekérése
  const { data: rawLeaves } = await supabase
    .from("hr_tavollet")
    .select("id, dolgozo_id, tipus, kezdet_datuma, veg_datuma, statusz")
    .eq("company_id", companyScope)
    .neq("statusz", "elutasitva")
    .lte("kezdet_datuma", weekEndStr)
    .gte("veg_datuma", weekStartStr)

  const leaves: ShiftDayLeave[] = (rawLeaves || []).map((l) => ({
    id: l.id,
    dolgozo_id: l.dolgozo_id,
    tipus: l.tipus,
    kezdet_datuma: l.kezdet_datuma,
    veg_datuma: l.veg_datuma,
    statusz: l.statusz,
  }))

  return {
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    templates,
    employees,
    assignments,
    leaves,
  }
}

export async function saveShiftAssignmentAction(params: {
  dolgozo_id: string
  datum: string
  sablon_id: string | null
  egyedi_kezdes?: string | null
  egyedi_befejezes?: string | null
  tervezett_ora?: number
  megjegyzes?: string | null
}): Promise<{ success: boolean; error?: string; warning?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Nincs bejelentkezve" }

    const activeCompanyId = await getActiveCompanyIdServer()
    if (!activeCompanyId) return { success: false, error: "Nincs aktív cég kiválasztva" }

    const { dolgozo_id, datum, sablon_id, egyedi_kezdes, egyedi_befejezes, megjegyzes } =
      params

    // Ha nincs sablon és nincs egyedi idő => törlés
    if (!sablon_id && !egyedi_kezdes) {
      await supabase
        .from("hr_muszak_beosztas")
        .delete()
        .eq("company_id", activeCompanyId)
        .eq("dolgozo_id", dolgozo_id)
        .eq("datum", datum)

      revalidatePath("/hr/time")
      return { success: true }
    }

    // Óraszám megállapítása
    let oraszam = params.tervezett_ora || 8.0
    if (sablon_id) {
      const { data: tmpl } = await supabase
        .from("hr_muszak_sablon")
        .select("munkaora")
        .eq("id", sablon_id)
        .single()
      if (tmpl?.munkaora) {
        oraszam = Number(tmpl.munkaora)
      }
    }

    // Orvosi érvényesség ellenőrzése figyelmeztetéshez
    let warningMsg: string | undefined
    const { data: adatlap } = await supabase
      .from("hr_dolgozo_adatlap")
      .select("orvosi_alkalmassag_ervenyesseg")
      .eq("id", dolgozo_id)
      .single()

    if (adatlap?.orvosi_alkalmassag_ervenyesseg) {
      const expiry = format(parseISO(adatlap.orvosi_alkalmassag_ervenyesseg), "yyyy-MM-dd")
      if (expiry < datum) {
        warningMsg = `Figyelem: A dolgozó orvosi alkalmassága ezen a napon (${datum}) már lejárt (${expiry})!`
      }
    }

    // Upsert a hr_muszak_beosztas táblába
    const { error } = await supabase.from("hr_muszak_beosztas").upsert(
      {
        company_id: activeCompanyId,
        dolgozo_id,
        datum,
        sablon_id,
        egyedi_kezdes: egyedi_kezdes || null,
        egyedi_befejezes: egyedi_befejezes || null,
        tervezett_ora: oraszam,
        megjegyzes: megjegyzes || null,
        statusz: "tervezett",
        letrehozo_id: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "dolgozo_id,datum" }
    )

    if (error) {
      console.error("Shift assignment upsert error:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/hr/time")
    return { success: true, warning: warningMsg }
  } catch (err: any) {
    console.error("saveShiftAssignmentAction error:", err)
    return { success: false, error: err.message || "Ismeretlen hiba" }
  }
}

export async function copyPreviousWeekRosterAction(
  targetWeekStartStr: string
): Promise<{ success: boolean; copiedCount?: number; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Nincs bejelentkezve" }

    const activeCompanyId = await getActiveCompanyIdServer()
    if (!activeCompanyId) return { success: false, error: "Nincs aktív cég" }

    const targetMonday = parseISO(targetWeekStartStr)
    const sourceMonday = subDays(targetMonday, 7)
    const sourceSunday = addDays(sourceMonday, 6)

    const sourceStartStr = format(sourceMonday, "yyyy-MM-dd")
    const sourceEndStr = format(sourceSunday, "yyyy-MM-dd")
    const targetEndStr = format(addDays(targetMonday, 6), "yyyy-MM-dd")

    // 1. Forrás hét beosztásainak lekérése
    const { data: sourceShifts, error: fetchErr } = await supabase
      .from("hr_muszak_beosztas")
      .select("*")
      .eq("company_id", activeCompanyId)
      .gte("datum", sourceStartStr)
      .lte("datum", sourceEndStr)

    if (fetchErr) {
      return { success: false, error: fetchErr.message }
    }

    if (!sourceShifts || sourceShifts.length === 0) {
      return { success: false, error: "Az előző héten nem található másolható műszakbeosztás." }
    }

    // 2. Cél heti távollétek lekérése (szabadság, táppénz) a felülírás elkerülésére
    const { data: targetLeaves } = await supabase
      .from("hr_tavollet")
      .select("dolgozo_id, kezdet_datuma, veg_datuma")
      .eq("company_id", activeCompanyId)
      .neq("statusz", "elutasitva")
      .lte("kezdet_datuma", targetEndStr)
      .gte("veg_datuma", targetWeekStartStr)

    const isEmployeeAbsentOnDay = (dolgozoId: string, dayStr: string) => {
      return (targetLeaves || []).some(
        (l) =>
          l.dolgozo_id === dolgozoId &&
          l.kezdet_datuma <= dayStr &&
          l.veg_datuma >= dayStr
      )
    }

    // 3. Új beosztások előkészítése (+7 nappal eltolva)
    const newAssignments = []
    for (const shift of sourceShifts) {
      const shiftDate = parseISO(shift.datum)
      const targetDate = addDays(shiftDate, 7)
      const targetDateStr = format(targetDate, "yyyy-MM-dd")

      // Ha az alkalmazott a cél napon szabadságon vagy táppénzen van, kihagyjuk!
      if (isEmployeeAbsentOnDay(shift.dolgozo_id, targetDateStr)) {
        continue
      }

      newAssignments.push({
        company_id: activeCompanyId,
        dolgozo_id: shift.dolgozo_id,
        datum: targetDateStr,
        sablon_id: shift.sablon_id,
        egyedi_kezdes: shift.egyedi_kezdes,
        egyedi_befejezes: shift.egyedi_befejezes,
        tervezett_ora: shift.tervezett_ora,
        megjegyzes: shift.megjegyzes,
        statusz: "tervezett",
        letrehozo_id: user.id,
        updated_at: new Date().toISOString(),
      })
    }

    if (newAssignments.length > 0) {
      const { error: upsertErr } = await supabase
        .from("hr_muszak_beosztas")
        .upsert(newAssignments, { onConflict: "dolgozo_id,datum" })

      if (upsertErr) {
        return { success: false, error: upsertErr.message }
      }
    }

    revalidatePath("/hr/time")
    return { success: true, copiedCount: newAssignments.length }
  } catch (err: any) {
    console.error("copyPreviousWeekRosterAction error:", err)
    return { success: false, error: err.message || "Ismeretlen hiba másoláskor" }
  }
}

export async function saveShiftTemplateAction(template: {
  id?: string
  kod: string
  megnevezes: string
  kezdes_ido: string
  befejezes_ido: string
  munkaora: number
  szunet_perc: number
  szin_kod: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const activeCompanyId = await getActiveCompanyIdServer()
    if (!activeCompanyId) return { success: false, error: "Nincs aktív cég" }

    if (template.id) {
      const { error } = await supabase
        .from("hr_muszak_sablon")
        .update({
          kod: template.kod.trim().toUpperCase(),
          megnevezes: template.megnevezes.trim(),
          kezdes_ido: template.kezdes_ido,
          befejezes_ido: template.befejezes_ido,
          munkaora: template.munkaora,
          szunet_perc: template.szunet_perc,
          szin_kod: template.szin_kod,
          updated_at: new Date().toISOString(),
        })
        .eq("id", template.id)
        .eq("company_id", activeCompanyId)

      if (error) return { success: false, error: error.message }
    } else {
      const { error } = await supabase.from("hr_muszak_sablon").insert({
        company_id: activeCompanyId,
        kod: template.kod.trim().toUpperCase(),
        megnevezes: template.megnevezes.trim(),
        kezdes_ido: template.kezdes_ido,
        befejezes_ido: template.befejezes_ido,
        munkaora: template.munkaora,
        szunet_perc: template.szunet_perc,
        szin_kod: template.szin_kod,
        is_active: true,
      })

      if (error) return { success: false, error: error.message }
    }

    revalidatePath("/hr/time")
    return { success: true }
  } catch (err: any) {
    console.error("saveShiftTemplateAction error:", err)
    return { success: false, error: err.message || "Ismeretlen hiba sablon mentésekor" }
  }
}

export async function deleteShiftTemplateAction(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const activeCompanyId = await getActiveCompanyIdServer()
    if (!activeCompanyId) return { success: false, error: "Nincs aktív cég" }

    // Soft delete: inaktiváljuk a sablont
    const { error } = await supabase
      .from("hr_muszak_sablon")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", templateId)
      .eq("company_id", activeCompanyId)

    if (error) return { success: false, error: error.message }

    revalidatePath("/hr/time")
    return { success: true }
  } catch (err: any) {
    console.error("deleteShiftTemplateAction error:", err)
    return { success: false, error: err.message || "Ismeretlen hiba sablon törlésekor" }
  }
}
