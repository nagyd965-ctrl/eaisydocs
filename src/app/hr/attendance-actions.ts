"use server"

import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { revalidatePath } from "next/cache"

export type TimesheetEntry = {
  id: string
  record_id?: string
  datum: string
  becsekkolas_ideje: string | null
  kicsekkolas_ideje: string | null
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
  isWeekendShift?: boolean
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

    // Fetch függőben lévő munkaidő korrekciós kérelmek részletekkel
    const { data: pendingCorrections } = await supabase
      .from("hr_jelenlet_korrekcio")
      .select("datum, uj_becsekkolas, uj_kicsekkolas, indoklas")
      .eq("dolgozo_id", employeeId)
      .eq("statusz", "jovahagyasra_var")
      .gte("datum", startDate)
      .lte("datum", endDate)

    const pendingMap = new Map<string, { uj_becsekkolas: string; uj_kicsekkolas: string; indoklas: string }>()
    for (const c of pendingCorrections || []) {
      pendingMap.set(c.datum as string, {
        uj_becsekkolas: c.uj_becsekkolas as string,
        uj_kicsekkolas: c.uj_kicsekkolas as string,
        indoklas: c.indoklas as string
      })
    }

    // Munkaszüneti napok lekérése az adott hónapra
    const { data: unnepnapData } = await supabase
      .from("hr_munkaszuneti_nap")
      .select("datum, megnevezes, athelye_munkanap")
      .gte("datum", startDate)
      .lte("datum", endDate)
      .eq("athelye_munkanap", false)

    const unnepnapok = new Set((unnepnapData || []).map(n => n.datum as string))
    const unnepNevek = new Map((unnepnapData || []).map(n => [n.datum as string, n.megnevezes as string]))

    // Műszakbeosztások lekérése (HR-TASK-01 / Előzetes műszakok szinkronja)
    const { data: shiftAssignments } = await supabase
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
      const isWeekendShift = isWeekend && !!assignedShift

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
          isWeekendShift: false
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
          isWeekendShift: false
        })
      } else if (munka) {
        timesheet.push({
          id: dateStr, // Unique key for the day
          record_id: munka.id, // Keep the db ID for edits/deletes
          datum: dateStr,
          becsekkolas_ideje: munka.becsekkolas_ideje,
          kicsekkolas_ideje: munka.kicsekkolas_ideje,
          type: "munka",
          note: assignedShift ? `Beosztott műszak (${shiftCode})` : undefined,
          pendingCorrection: pendingCorr,
          shiftPlannedHours: shiftHours,
          shiftCode,
          shiftName,
          isWeekendShift
        })
      } else if (isWeekend) {
        timesheet.push({
          id: dateStr, // Unique key for the day
          datum: dateStr,
          becsekkolas_ideje: null,
          kicsekkolas_ideje: null,
          type: isWeekendShift ? "munka" : "hetvege",
          note: isWeekendShift ? `Hétvégi műszak (${shiftCode}: ${shiftName || "Túlóra"})` : undefined,
          pendingCorrection: pendingCorr,
          shiftPlannedHours: shiftHours,
          shiftCode,
          shiftName,
          isWeekendShift
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
          isWeekendShift: false
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
      const activeCompanyId = await getActiveCompanyIdServer()
      const { error } = await supabase
        .from("hr_jelenlet")
        .insert({
          company_id: activeCompanyId || undefined,
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
      const activeCompanyId = await getActiveCompanyIdServer()
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

// 7. Get Monthly Timesheet Filed Document
export async function getMonthlyTimesheetDocument(employeeId: string, year: number, month: number) {
  try {
    const supabase = await createClient()
    const monthNames = [
      "január", "február", "március", "április", "május", "június",
      "július", "augusztus", "szeptember", "október", "november", "december"
    ]
    const monthName = monthNames[month - 1]

    const { data: docs } = await supabase
      .from("hr_dokumentum")
      .select("id, nev, kategoria, url, iktatoszam, ugyirat_id, created_at")
      .eq("dolgozo_id", employeeId)
      .eq("kategoria", "Havi jelenléti ív")
      .order("created_at", { ascending: false })

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Nincs bejelentkezve")

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
    const docName = `${employeeName} - Havi jelenléti ív (${year}. ${monthName})`
    const { data: existingDoc } = await supabase
      .from("hr_dokumentum")
      .select("id, iktatoszam")
      .eq("dolgozo_id", employeeId)
      .eq("kategoria", "Havi jelenléti ív")
      .ilike("nev", `%${year}.%${monthName}%`)
      .maybeSingle()

    let docId = existingDoc?.id

    if (!docId) {
      const { data: newDoc, error: insertError } = await supabase
        .from("hr_dokumentum")
        .insert({
          dolgozo_id: employeeId,
          nev: docName,
          kategoria: "Havi jelenléti ív",
          url: storagePath
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
export async function handleOvertimeApproval(requestId: string, action: "jovahagyva" | "elutasitva") {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  // Lekérjük a kérelmet
  const { data: req, error: fetchErr } = await supabase
    .from("hr_tulora_felhasznalás")
    .select("*, felhasznalo_profil:dolgozo_id(nev)")
    .eq("id", requestId)
    .single()

  if (fetchErr || !req) {
    return { error: "A túlóra kérelem nem található." }
  }

  const { error } = await supabase
    .from("hr_tulora_felhasznalás")
    .update({
      statusz: action,
      jovahagyo_id: user.id,
      jovahagyva_at: new Date().toISOString()
    })
    .eq("id", requestId)

  if (error) {
    console.error("Overtime approval error:", error)
    return { error: "Hiba történt a kérelem feldolgozásakor: " + error.message }
  }

  // Értesítés küldése a kérelmező dolgozónak
  const cim = action === "jovahagyva" ? "Túlóra kérelem jóváhagyva" : "Túlóra kérelem elutasítva"
  const tipusNev = req.tipus === "kiveszi_szabinak" ? "csúsztatási" : "kifizetési"
  const h = Math.floor(req.perc / 60)
  const m = req.perc % 60
  const durationStr = h > 0 ? `${h} óra${m > 0 ? ` ${m} perc` : ""}` : `${m} perc`

  const szoveg = action === "jovahagyva"
    ? `A vezetőd jóváhagyta a ${tipusNev} kérelmedet (${durationStr}).`
    : `A vezetőd elutasította a ${tipusNev} kérelmedet (${durationStr}).`

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

  const nowIso = new Date().toISOString()
  const { createClient: createAdminClient } = await import("@supabase/supabase-js")
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (action === "jovahagyva") {
    // 1. Érvényesítjük a módosítást a hr_jelenlet táblában ELŐSZÖR
    const { data: existingJelenlet } = await adminClient
      .from("hr_jelenlet")
      .select("id")
      .eq("dolgozo_id", request.dolgozo_id)
      .eq("datum", request.datum)
      .maybeSingle()

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
          kicsekkolas_ideje: request.uj_kicsekkolas
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

