"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { 
  calculatePayslipDetails, 
  type PayslipCalculationInput 
} from "@/utils/hr/payslip-calculator"
import { 
  generatePayslipPdfBuffer, 
  getMonthNameHu, 
  type PayslipPdfData 
} from "@/utils/hr/payslip-pdf-generator"
import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function hexToAscii(hexStr: any): string | null {
  if (!hexStr) return null
  if (typeof hexStr !== "string") return null
  try {
    let clean = hexStr
    if (clean.startsWith("\\x")) clean = clean.slice(2)
    if (clean.length % 2 !== 0) return null
    return Buffer.from(clean, "hex").toString("utf-8")
  } catch {
    return null
  }
}

export interface PayrollDashboardRow {
  dolgozoId: string
  nev: string
  adoazonosito: string
  tajSzam: string
  reszleg: string
  munkakor: string
  bankszamlaszam: string
  bruttoAlapber: number

  // Időszaki adatok
  tervezettMunkanap: number
  ledolgozottMunkanap: number
  ledolgozottMunkaora: number
  szabadsagNap: number
  betegszabadsagNap: number
  tuloraOra: number

  // Bérpapír státusz és összegek
  berpapirId?: string
  statusz: "nem_generalt" | "tervezet" | "kikuldve" | "atveve"
  bruttoOsszesen: number
  kedvezmeny25EvAlatti: boolean
  csaladiKedvezmenyOsszeg: number
  egyebAdokedvezmeny: number
  szjaLevonas: number
  tbJarulekLevonas: number
  letiltasEgyebLevonas: number
  levonasokOsszesen: number
  nettoKifizetendo: number
  szochoMunkaltatoi: number
  bonuszJutalom: number
  cafeteriaBrutto: number

  // Átvétel
  kikuldesDatuma?: string | null
  atvetelDatuma?: string | null
  atvetelIp?: string | null
}

export interface PayrollDashboardData {
  year: number
  month: number
  monthName: string
  plannedWorkdays: number
  items: PayrollDashboardRow[]
  metrics: {
    totalEmployees: number
    generatedCount: number
    acknowledgedCount: number
    pendingCount: number
    unpreparedCount: number
    totalNetPayout: number
    totalGrossPayout: number
    totalEmployerCost: number
  }
}

/**
 * Lekéri a havi bérszámfejtési és bérpapír műszerfal adatait
 */
export async function getPayrollDashboardData(
  year: number,
  month: number,
  targetCompanyId?: string
): Promise<{ data: PayrollDashboardData | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: "Nincs bejelentkezve" }

  const activeCompanyId = targetCompanyId || (await getActiveCompanyIdServer())
  if (!activeCompanyId) {
    return { data: null, error: "Nincs kiválasztott cég." }
  }

  const adminClient = getAdminClient()

  // 1. Tervezett munkanapok számítása (Hétfő-Péntek)
  const lastDayNum = new Date(year, month, 0).getDate()
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`
  const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(lastDayNum).padStart(2, "0")}`

  let plannedWorkdays = 0
  for (let day = 1; day <= lastDayNum; day++) {
    const d = new Date(year, month - 1, day).getDay()
    if (d !== 0 && d !== 6) plannedWorkdays++
  }

  // 1.5. Céghez tartozó dolgozók (company_members) azonosítói
  const { data: companyMembers } = await adminClient
    .from("company_members")
    .select("user_id")
    .eq("company_id", activeCompanyId)

  const memberUserIds = (companyMembers || []).map((m: any) => m.user_id)
  if (memberUserIds.length === 0) {
    return {
      data: {
        year,
        month,
        monthName: getMonthNameHu(month),
        plannedWorkdays,
        items: [],
        metrics: {
          totalEmployees: 0,
          generatedCount: 0,
          acknowledgedCount: 0,
          pendingCount: 0,
          unpreparedCount: 0,
          totalNetPayout: 0,
          totalGrossPayout: 0,
          totalEmployerCost: 0,
        },
      },
    }
  }

  // 2. Profilok és szervezeti egységek (csak az aktív cég tagjai)
  const { data: profiles } = await adminClient
    .from("felhasznalo_profil")
    .select("id, nev, szervezeti_egyseg_id, hr_szervezeti_egyseg_id")
    .in("id", memberUserIds)
  const profMap = new Map<string, { nev: string; orgId: string | null }>()
  profiles?.forEach((p: any) => profMap.set(p.id, { nev: p.nev, orgId: p.hr_szervezeti_egyseg_id || p.szervezeti_egyseg_id }))

  const { data: orgUnits } = await adminClient
    .from("szervezeti_egyseg")
    .select("id, nev")
    .eq("company_id", activeCompanyId)
  const orgMap = new Map<string, string>()
  orgUnits?.forEach((o: any) => orgMap.set(o.id, o.nev))

  // 3. Munkakörök és beosztások
  const { data: munkakorok } = await adminClient
    .from("hr_munkakor")
    .select("id, megnevezes, feor_kod, szervezeti_egyseg_id")
    .eq("company_id", activeCompanyId)
  const mkMap = new Map<string, { megnevezes: string; feor: string; orgId: string | null }>()
  munkakorok?.forEach((m: any) => mkMap.set(m.id, { megnevezes: m.megnevezes, feor: m.feor_kod, orgId: m.szervezeti_egyseg_id }))

  const { data: beosztasok } = await adminClient
    .from("hr_beosztas")
    .select("id, jogviszony_id, munkakor_id, munkaido_fte")
  const beosztasMap = new Map<string, { fte: number; munkakor: string; feor: string; orgId: string | null }>()
  beosztasok?.forEach((b: any) => {
    const mk = b.munkakor_id ? mkMap.get(b.munkakor_id) : null
    beosztasMap.set(b.jogviszony_id, {
      fte: Number(b.munkaido_fte || 1.0),
      munkakor: mk?.megnevezes || "-",
      feor: mk?.feor || "-",
      orgId: mk?.orgId || null,
    })
  })

  // 4. Jogviszonyok az adott hónapban (csak az aktív céghez)
  const { data: jogviszonyok } = await adminClient
    .from("hr_jogviszony")
    .select("id, dolgozo_id, belepes_datuma, kilepes_datuma")
    .eq("company_id", activeCompanyId)
    .in("dolgozo_id", memberUserIds)
  
  // 5. Titkos béradatok (csak az aktív cég tagjai)
  const { data: secretData } = await adminClient
    .from("hr_dolgozo_titkos_adat")
    .select("*")
    .in("dolgozo_id", memberUserIds)
  const secretMap = new Map<string, { taj: string | null; ado: string | null; bankszamla: string | null; brutto: number | null }>()
  secretData?.forEach((s: any) => {
    const bruttoStr = hexToAscii(s.brutto_ber_titkositott)
    secretMap.set(s.dolgozo_id, {
      taj: hexToAscii(s.taj_szam_titkositott),
      ado: hexToAscii(s.adoazonosito_titkositott),
      bankszamla: hexToAscii(s.bankszamla_titkositott),
      brutto: bruttoStr ? parseInt(bruttoStr, 10) : null,
    })
  })

  // 6. Jelenlétek az adott hónapban (csak az aktív céghez)
  const { data: jelenletek } = await adminClient
    .from("hr_jelenlet")
    .select("dolgozo_id, datum, becsekkolas_ideje, kicsekkolas_ideje")
    .eq("company_id", activeCompanyId)
    .in("dolgozo_id", memberUserIds)
    .gte("datum", firstDay)
    .lte("datum", lastDay)

  const attendanceMap = new Map<string, { days: number; hours: number }>()
  jelenletek?.forEach((j) => {
    if (!attendanceMap.has(j.dolgozo_id)) {
      attendanceMap.set(j.dolgozo_id, { days: 0, hours: 0 })
    }
    const cur = attendanceMap.get(j.dolgozo_id)!
    cur.days += 1
    if (j.becsekkolas_ideje && j.kicsekkolas_ideje) {
      const diff = (new Date(j.kicsekkolas_ideje).getTime() - new Date(j.becsekkolas_ideje).getTime()) / (1000 * 60 * 60)
      cur.hours += Math.max(0, diff)
    } else {
      cur.hours += 8.0
    }
  })

  // 7. Távollétek az adott hónapban (csak az aktív céghez)
  const { data: tavolletek } = await adminClient
    .from("hr_tavollet")
    .select("dolgozo_id, kezdet_datuma, veg_datuma, tipus, statusz")
    .eq("company_id", activeCompanyId)
    .in("dolgozo_id", memberUserIds)
    .lte("kezdet_datuma", lastDay)
    .gte("veg_datuma", firstDay)
    .eq("statusz", "jovahagyva")

  const leaveMap = new Map<string, { szabadsag: number; beteg: number }>()
  tavolletek?.forEach((t) => {
    if (!leaveMap.has(t.dolgozo_id)) {
      leaveMap.set(t.dolgozo_id, { szabadsag: 0, beteg: 0 })
    }
    const cur = leaveMap.get(t.dolgozo_id)!
    const kDate = new Date(Math.max(new Date(t.kezdet_datuma).getTime(), new Date(firstDay).getTime()))
    const vDate = new Date(Math.min(new Date(t.veg_datuma).getTime(), new Date(lastDay).getTime()))
    const days = Math.max(1, Math.round((vDate.getTime() - kDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)

    const tType = (t.tipus || "").toLowerCase()
    if (tType.includes("szabad") || tType.includes("fizetett")) {
      cur.szabadsag += days
    } else if (tType.includes("beteg")) {
      cur.beteg += days
    }
  })

  // 8. Cafeteria havi igényelt összeg (csak az aktív céghez)
  const { data: cafeteriaChoices } = await adminClient
    .from("hr_cafeteria_valasztas")
    .select("dolgozo_id, kert_osszeg, ev")
    .in("dolgozo_id", memberUserIds)
    .eq("ev", year)

  const cafeteriaMap = new Map<string, number>()
  cafeteriaChoices?.forEach((c) => {
    const monthlyAmt = Math.round((c.kert_osszeg || 0) / 12)
    cafeteriaMap.set(c.dolgozo_id, (cafeteriaMap.get(c.dolgozo_id) || 0) + monthlyAmt)
  })

  // 9. Meglévő hr_berpapir rekordok az aktív céghez
  const { data: existingPayslips } = await adminClient
    .from("hr_berpapir")
    .select("*")
    .eq("company_id", activeCompanyId)
    .eq("ev", year)
    .eq("honap", month)

  const payslipMap = new Map<string, any>()
  existingPayslips?.forEach((p) => payslipMap.set(p.dolgozo_id, p))

  // 10. Összeállítás
  const items: PayrollDashboardRow[] = []
  const processedDolgozoIds = new Set<string>()

  let totalNetPayout = 0
  let totalGrossPayout = 0
  let totalEmployerCost = 0
  let acknowledgedCount = 0
  let pendingCount = 0
  let generatedCount = 0

  for (const j of (jogviszonyok || [])) {
    const dId = j.dolgozo_id
    if (!dId || processedDolgozoIds.has(dId)) continue

    // Aktív ebben a hónapban?
    const isActiveInMonth =
      j.belepes_datuma &&
      j.belepes_datuma <= lastDay &&
      (!j.kilepes_datuma || j.kilepes_datuma >= firstDay)

    if (!isActiveInMonth) continue
    processedDolgozoIds.add(dId)

    const prof = profMap.get(dId)
    const nev = prof?.nev || "Munkavállaló"
    const sec = secretMap.get(dId)
    const taj = sec?.taj || "-"
    const ado = sec?.ado || "-"
    const bankszamla = sec?.bankszamla || ""
    const bruttoAlapber = sec?.brutto || 500000

    const b = beosztasMap.get(j.id)
    const munkakor = b?.munkakor || "-"
    const oId = b?.orgId || prof?.orgId
    const reszleg = (oId && orgMap.get(oId)) || "Központi Osztály"

    const att = attendanceMap.get(dId) || { days: plannedWorkdays, hours: plannedWorkdays * 8 }
    const leaves = leaveMap.get(dId) || { szabadsag: 0, beteg: 0 }
    const cafeteriaMonthly = cafeteriaMap.get(dId) || 0

    // Ha van már mentett bérpapír
    const existing = payslipMap.get(dId)

    if (existing) {
      if (existing.statusz === "kikuldve" || existing.statusz === "atveve") {
        generatedCount++
      }
      if (existing.statusz === "atveve") acknowledgedCount++
      else if (existing.statusz === "kikuldve") pendingCount++

      const net = Number(existing.netto_kifizetendo || 0)
      const gross = Number(existing.brutto_osszesen || 0)
      const szocho = Number(existing.szocho_munkaltatoi || 0)

      totalNetPayout += net
      totalGrossPayout += gross
      totalEmployerCost += (gross + szocho)

      items.push({
        dolgozoId: dId,
        nev,
        adoazonosito: ado,
        tajSzam: taj,
        reszleg,
        munkakor,
        bankszamlaszam: existing.bankszamlaszam || bankszamla,
        bruttoAlapber: Number(existing.brutto_alapber),
        tervezettMunkanap: existing.tervezett_munkanap || plannedWorkdays,
        ledolgozottMunkanap: existing.ledolgozott_munkanap || att.days,
        ledolgozottMunkaora: Number(existing.ledolgozott_munkaora || att.hours),
        szabadsagNap: existing.szabadsag_nap || leaves.szabadsag,
        betegszabadsagNap: existing.betegszabadsag_nap || leaves.beteg,
        tuloraOra: Number(existing.tulora_ora || 0),
        berpapirId: existing.id,
        statusz: existing.statusz,
        bruttoOsszesen: gross,
        kedvezmeny25EvAlatti: Boolean(existing.kedvezmeny_25_ev_alatti),
        csaladiKedvezmenyOsszeg: Number(existing.csaladi_kedvezmeny_osszeg || 0),
        egyebAdokedvezmeny: Number(existing.egyeb_adokedvezmeny_osszeg || 0),
        szjaLevonas: Number(existing.szja_levonas || 0),
        tbJarulekLevonas: Number(existing.tb_jarulek_levonas || 0),
        letiltasEgyebLevonas: Number(existing.letiltas_egyeb_levonas || 0),
        levonasokOsszesen: Number(existing.levonasok_osszesen || 0),
        nettoKifizetendo: net,
        szochoMunkaltatoi: szocho,
        bonuszJutalom: Number(existing.bonusz_jutalom || 0),
        cafeteriaBrutto: Number(existing.cafeteria_brutto || 0),
        kikuldesDatuma: existing.kikuldes_datuma,
        atvetelDatuma: existing.atvetel_datuma,
        atvetelIp: existing.atvetel_ip,
      })
    } else {
      // Előzetes becsült számítás a tervezet nézethez
      const calc = calculatePayslipDetails({
        bruttoAlapber,
        tervezettMunkanap: plannedWorkdays,
        ledolgozottMunkanap: att.days,
        ledolgozottMunkaora: att.hours,
        szabadsagNap: leaves.szabadsag,
        betegszabadsagNap: leaves.beteg,
        tuloraOra: 0,
        bonuszJutalom: 0,
        cafeteriaBrutto: cafeteriaMonthly,
      })

      items.push({
        dolgozoId: dId,
        nev,
        adoazonosito: ado,
        tajSzam: taj,
        reszleg,
        munkakor,
        bankszamlaszam: bankszamla,
        bruttoAlapber,
        tervezettMunkanap: plannedWorkdays,
        ledolgozottMunkanap: att.days,
        ledolgozottMunkaora: att.hours,
        szabadsagNap: leaves.szabadsag,
        betegszabadsagNap: leaves.beteg,
        tuloraOra: 0,
        statusz: "nem_generalt",
        bruttoOsszesen: calc.bruttoOsszesen,
        kedvezmeny25EvAlatti: false,
        csaladiKedvezmenyOsszeg: 0,
        egyebAdokedvezmeny: 0,
        szjaLevonas: calc.szjaLevonas,
        tbJarulekLevonas: calc.tbJarulekLevonas,
        letiltasEgyebLevonas: 0,
        levonasokOsszesen: calc.levonasokOsszesen,
        nettoKifizetendo: calc.nettoKifizetendo,
        szochoMunkaltatoi: calc.szochoMunkaltatoi,
        bonuszJutalom: 0,
        cafeteriaBrutto: cafeteriaMonthly,
      })
    }
  }

  const unpreparedCount = items.length - generatedCount

  return {
    data: {
      year,
      month,
      monthName: getMonthNameHu(month),
      plannedWorkdays,
      items,
      metrics: {
        totalEmployees: items.length,
        generatedCount,
        acknowledgedCount,
        pendingCount,
        unpreparedCount,
        totalNetPayout,
        totalGrossPayout,
        totalEmployerCost
      }
    }
  }
}

/**
 * Havi bérpapírok kötegelt előállítása és közzététele (Mt. 155. §)
 */
export async function generateMonthlyPayslipsAction(params: {
  year: number
  month: number
  employeeIds?: string[]
  publishImmediately?: boolean
}): Promise<{ success: boolean; count?: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const activeCompanyId = await getActiveCompanyIdServer()
  const adminClient = getAdminClient()
  const { data: dash, error } = await getPayrollDashboardData(params.year, params.month, activeCompanyId || undefined)
  if (error || !dash) return { success: false, error: error || "Nem sikerült az adatok betöltése" }

  const targetItems = params.employeeIds && params.employeeIds.length > 0
    ? dash.items.filter(i => params.employeeIds!.includes(i.dolgozoId))
    : dash.items

  if (targetItems.length === 0) {
    return { success: false, error: "Nincs kiválasztott munkavállaló a bérpapír előállításához." }
  }

  // Következő hónap 10-e mint határidő
  const nextMonth = params.month === 12 ? 1 : params.month + 1
  const nextYear = params.month === 12 ? params.year + 1 : params.year
  const kifizetesHatarido = `${nextYear}-${String(nextMonth).padStart(2, "0")}-10`

  const publish = params.publishImmediately !== false
  const nowIso = new Date().toISOString()

  let generatedCount = 0

  for (const item of targetItems) {
    const calc = calculatePayslipDetails({
      bruttoAlapber: item.bruttoAlapber,
      tervezettMunkanap: item.tervezettMunkanap,
      ledolgozottMunkanap: item.ledolgozottMunkanap,
      ledolgozottMunkaora: item.ledolgozottMunkaora,
      szabadsagNap: item.szabadsagNap,
      betegszabadsagNap: item.betegszabadsagNap,
      tuloraOra: item.tuloraOra,
      bonuszJutalom: item.bonuszJutalom,
      cafeteriaBrutto: item.cafeteriaBrutto,
      kedvezmeny25EvAlatti: item.kedvezmeny25EvAlatti,
      csaladiKedvezmenyOsszeg: item.csaladiKedvezmenyOsszeg,
      egyebAdokedvezmeny: item.egyebAdokedvezmeny,
      letiltasLevonas: item.letiltasEgyebLevonas
    })

    const payload = {
      dolgozo_id: item.dolgozoId,
      company_id: activeCompanyId,
      ev: params.year,
      honap: params.month,
      statusz: publish ? "kikuldve" : "tervezet",
      brutto_alapber: calc.bruttoAlapber,
      tervezett_munkanap: calc.tervezettMunkanap,
      ledolgozott_munkanap: calc.ledolgozottMunkanap,
      ledolgozott_munkaora: calc.ledolgozottMunkaora,
      alapber_reszlet: calc.alapberReszlet,
      szabadsag_nap: calc.szabadsagNap,
      szabadsag_dij: calc.szabadsagDij,
      betegszabadsag_nap: calc.betegszabadsagNap,
      betegszabadsag_dij: calc.betegszabadsagDij,
      tulora_ora: calc.tuloraOra,
      tulora_potlek: calc.tuloraOsszeg,
      bonusz_jutalom: calc.bonuszJutalom,
      cafeteria_brutto: calc.cafeteriaBrutto,
      brutto_osszesen: calc.bruttoOsszesen,
      kedvezmeny_25_ev_alatti: calc.kedvezmeny25EvAlatti,
      csaladi_kedvezmeny_osszeg: calc.csaladiKedvezmenyOsszeg,
      egyeb_adokedvezmeny_osszeg: calc.egyebAdokedvezmeny,
      adokedvezmenyek_osszesen: calc.kedvezmenyekOsszesen,
      szja_alap: calc.szjaAlap,
      szja_levonas: calc.szjaLevonas,
      tb_jarulek_alap: calc.tbJarulekAlap,
      tb_jarulek_levonas: calc.tbJarulekLevonas,
      letiltas_egyeb_levonas: calc.letiltasEgyebLevonas,
      levonasok_osszesen: calc.levonasokOsszesen,
      netto_kifizetendo: calc.nettoKifizetendo,
      szocho_munkaltatoi: calc.szochoMunkaltatoi,
      bankszamlaszam: item.bankszamlaszam || null,
      kifizetes_hatarido: kifizetesHatarido,
      kikuldes_datuma: publish ? nowIso : null,
      updated_at: nowIso
    }

    const { error: upsertErr } = await adminClient
      .from("hr_berpapir")
      .upsert(payload, { onConflict: "dolgozo_id,ev,honap" })

    if (upsertErr) {
      console.error("Hiba bérpapír mentésekor:", upsertErr)
      return { success: false, error: `Hiba a bérpapír mentésekor (${item.nev}): ${upsertErr.message}` }
    } else {
      generatedCount++
    }
  }

  // Audit napló bejegyzés
  await adminClient.from("esemeny_naplo").insert({
    entitas_tipus: "hr_berpapir",
    entitas_id: user.id,
    esemeny_tipus: "hr_modositva",
    user_id: user.id,
    indoklas: `Havi bérpapírok előállítása és közzététele (Mt. 155. §) - ${params.year}/${params.month}. Érintett dolgozók száma: ${generatedCount}`
  })

  revalidatePath("/hr/payroll")
  revalidatePath("/hr/self-service/payroll")

  return { success: true, count: generatedCount }
}

/**
 * Egyéni bérpapír paramétereinek frissítése (pl. bónusz, családi kedvezmény, letiltás)
 * Működik generálás után meglévő rekordon, vagy generálás ELŐTT is (piszkozatként mentve 'tervezet' státusszal).
 */
export interface UpdateSinglePayslipParams {
  payslipId?: string
  dolgozoId: string
  year: number
  month: number
  bonuszJutalom?: number
  kedvezmeny25EvAlatti?: boolean
  csaladiKedvezmenyOsszeg?: number
  egyebAdokedvezmeny?: number
  letiltasLevonas?: number
  bankszamlaszam?: string
}

export async function updateSinglePayslipAction(
  targetOrPayslipId: string | UpdateSinglePayslipParams,
  params?: {
    bonuszJutalom?: number
    kedvezmeny25EvAlatti?: boolean
    csaladiKedvezmenyOsszeg?: number
    egyebAdokedvezmeny?: number
    letiltasLevonas?: number
    bankszamlaszam?: string
  }
): Promise<{ success: boolean; berpapirId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const activeCompanyId = await getActiveCompanyIdServer()
  if (!activeCompanyId) {
    return { success: false, error: "Nincs kiválasztott cég" }
  }

  const { hrRole, isCompanyAdmin } = await getActiveCompanyMemberRolesServer(activeCompanyId)
  const isAuthorized = isCompanyAdmin || ["admin", "hr_vezeto", "hr_munkatars"].includes(hrRole)
  if (!isAuthorized) {
    return { success: false, error: "Nincs jogosultságod a bérpapír módosításához" }
  }

  const adminClient = getAdminClient()
  let payslipId = typeof targetOrPayslipId === "string" ? targetOrPayslipId : targetOrPayslipId.payslipId
  let dolgozoId = typeof targetOrPayslipId === "object" ? targetOrPayslipId.dolgozoId : undefined
  let year = typeof targetOrPayslipId === "object" ? targetOrPayslipId.year : undefined
  let month = typeof targetOrPayslipId === "object" ? targetOrPayslipId.month : undefined

  let current: any = null

  if (payslipId) {
    const { data } = await adminClient.from("hr_berpapir").select("*").eq("id", payslipId).maybeSingle()
    if (data) {
      current = data
      dolgozoId = current.dolgozo_id
      year = current.ev
      month = current.honap
    }
  }

  if (!current && dolgozoId && year && month) {
    const { data } = await adminClient
      .from("hr_berpapir")
      .select("*")
      .eq("dolgozo_id", dolgozoId)
      .eq("ev", year)
      .eq("honap", month)
      .maybeSingle()
    if (data) {
      current = data
      payslipId = current.id
    }
  }

  const p = params || (typeof targetOrPayslipId === "object" ? (targetOrPayslipId as any) : {})

  if (current) {
    // Frissítés meglévő rekordon
    const calc = calculatePayslipDetails({
      bruttoAlapber: Number(current.brutto_alapber),
      tervezettMunkanap: current.tervezett_munkanap,
      ledolgozottMunkanap: current.ledolgozott_munkanap,
      ledolgozottMunkaora: Number(current.ledolgozott_munkaora),
      szabadsagNap: current.szabadsag_nap,
      betegszabadsagNap: current.betegszabadsag_nap,
      tuloraOra: Number(current.tulora_ora),
      bonuszJutalom: p.bonuszJutalom ?? Number(current.bonusz_jutalom || 0),
      cafeteriaBrutto: Number(current.cafeteria_brutto || 0),
      kedvezmeny25EvAlatti: p.kedvezmeny25EvAlatti ?? Boolean(current.kedvezmeny_25_ev_alatti),
      csaladiKedvezmenyOsszeg: p.csaladiKedvezmenyOsszeg ?? Number(current.csaladi_kedvezmeny_osszeg || 0),
      egyebAdokedvezmeny: p.egyebAdokedvezmeny ?? Number(current.egyeb_adokedvezmeny_osszeg || 0),
      letiltasLevonas: p.letiltasLevonas ?? Number(current.letiltas_egyeb_levonas || 0)
    })

    const { error: updateErr } = await adminClient
      .from("hr_berpapir")
      .update({
        bonusz_jutalom: calc.bonuszJutalom,
        kedvezmeny_25_ev_alatti: calc.kedvezmeny25EvAlatti,
        csaladi_kedvezmeny_osszeg: calc.csaladiKedvezmenyOsszeg,
        egyeb_adokedvezmeny_osszeg: calc.egyebAdokedvezmeny,
        adokedvezmenyek_osszesen: calc.kedvezmenyekOsszesen,
        brutto_osszesen: calc.bruttoOsszesen,
        szja_alap: calc.szjaAlap,
        szja_levonas: calc.szjaLevonas,
        tb_jarulek_alap: calc.tbJarulekAlap,
        tb_jarulek_levonas: calc.tbJarulekLevonas,
        letiltas_egyeb_levonas: calc.letiltasEgyebLevonas,
        levonasok_osszesen: calc.levonasokOsszesen,
        netto_kifizetendo: calc.nettoKifizetendo,
        szocho_munkaltatoi: calc.szochoMunkaltatoi,
        company_id: current.company_id || activeCompanyId,
        bankszamlaszam: p.bankszamlaszam !== undefined ? p.bankszamlaszam : current.bankszamlaszam,
        updated_at: new Date().toISOString()
      })
      .eq("id", current.id)

    if (updateErr) return { success: false, error: updateErr.message }

    revalidatePath("/hr/payroll")
    revalidatePath("/hr/self-service/payroll")
    return { success: true, berpapirId: current.id }
  } else {
    // Generálás előtti mentés: létrehozzuk a rekordot 'tervezet' státusszal!
    if (!dolgozoId || !year || !month) {
      return { success: false, error: "Hiányzó dolgozó vagy időszak azonosító" }
    }

    const dash = await getPayrollDashboardData(year, month)
    const row = dash.data?.items.find(i => i.dolgozoId === dolgozoId)
    if (!row) {
      return { success: false, error: "A dolgozó adatai nem találhatók a megadott hónapban" }
    }

    const calc = calculatePayslipDetails({
      bruttoAlapber: row.bruttoAlapber,
      tervezettMunkanap: row.tervezettMunkanap,
      ledolgozottMunkanap: row.ledolgozottMunkanap,
      ledolgozottMunkaora: row.ledolgozottMunkaora,
      szabadsagNap: row.szabadsagNap,
      betegszabadsagNap: row.betegszabadsagNap,
      tuloraOra: row.tuloraOra,
      bonuszJutalom: p.bonuszJutalom ?? 0,
      cafeteriaBrutto: row.cafeteriaBrutto,
      kedvezmeny25EvAlatti: p.kedvezmeny25EvAlatti ?? false,
      csaladiKedvezmenyOsszeg: p.csaladiKedvezmenyOsszeg ?? 0,
      egyebAdokedvezmeny: p.egyebAdokedvezmeny ?? 0,
      letiltasLevonas: p.letiltasLevonas ?? 0
    })

    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const kifizetesHatarido = `${nextYear}-${String(nextMonth).padStart(2, "0")}-10`

    const { data: inserted, error: insertErr } = await adminClient
      .from("hr_berpapir")
      .insert({
        dolgozo_id: dolgozoId,
        company_id: activeCompanyId,
        ev: year,
        honap: month,
        statusz: "tervezet",
        brutto_alapber: calc.bruttoAlapber,
        tervezett_munkanap: calc.tervezettMunkanap,
        ledolgozott_munkanap: calc.ledolgozottMunkanap,
        ledolgozott_munkaora: calc.ledolgozottMunkaora,
        alapber_reszlet: calc.alapberReszlet,
        szabadsag_nap: calc.szabadsagNap,
        szabadsag_dij: calc.szabadsagDij,
        betegszabadsag_nap: calc.betegszabadsagNap,
        betegszabadsag_dij: calc.betegszabadsagDij,
        tulora_ora: calc.tuloraOra,
        tulora_potlek: calc.tuloraOsszeg,
        bonusz_jutalom: calc.bonuszJutalom,
        cafeteria_brutto: calc.cafeteriaBrutto,
        brutto_osszesen: calc.bruttoOsszesen,
        kedvezmeny_25_ev_alatti: calc.kedvezmeny25EvAlatti,
        csaladi_kedvezmeny_osszeg: calc.csaladiKedvezmenyOsszeg,
        egyeb_adokedvezmeny_osszeg: calc.egyebAdokedvezmeny,
        adokedvezmenyek_osszesen: calc.kedvezmenyekOsszesen,
        szja_alap: calc.szjaAlap,
        szja_levonas: calc.szjaLevonas,
        tb_jarulek_alap: calc.tbJarulekAlap,
        tb_jarulek_levonas: calc.tbJarulekLevonas,
        letiltas_egyeb_levonas: calc.letiltasEgyebLevonas,
        levonasok_osszesen: calc.levonasokOsszesen,
        netto_kifizetendo: calc.nettoKifizetendo,
        szocho_munkaltatoi: calc.szochoMunkaltatoi,
        bankszamlaszam: p.bankszamlaszam || row.bankszamlaszam || null,
        kifizetes_hatarido: kifizetesHatarido,
        kifizetes_modja: "Banki átutalás",
        kikuldes_datuma: null,
        atvetel_datuma: null
      })
      .select("id")
      .single()

    if (insertErr) return { success: false, error: insertErr.message }

    revalidatePath("/hr/payroll")
    revalidatePath("/hr/self-service/payroll")
    return { success: true, berpapirId: inserted?.id }
  }
}

/**
 * Bérpapír letöltése PDF formátumban
 * Támogatja mind a meglévő (id alapú) bérpapírokat, mind a még nem generált (on-the-fly) tervezeteket.
 */
export async function downloadPayslipPdfAction(
  target: string | { payslipId?: string; dolgozoId: string; year: number; month: number }
): Promise<{ base64?: string; fileName?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const activeCompanyId = await getActiveCompanyIdServer()
  const adminClient = getAdminClient()
  const payslipId = typeof target === "string" ? target : target.payslipId
  const dolgozoId = typeof target === "object" ? target.dolgozoId : undefined
  const year = typeof target === "object" ? target.year : undefined
  const month = typeof target === "object" ? target.month : undefined

  let p: any = null

  if (payslipId) {
    const { data } = await adminClient.from("hr_berpapir").select("*").eq("id", payslipId).maybeSingle()
    if (data) p = data
  }

  if (!p && dolgozoId && year && month) {
    const { data } = await adminClient
      .from("hr_berpapir")
      .select("*")
      .eq("dolgozo_id", dolgozoId)
      .eq("ev", year)
      .eq("honap", month)
      .maybeSingle()
    if (data) p = data
  }

  // 1. Ha megtalálható az adatbázisban (kiküldött vagy mentett tervezet):
  if (p) {
    const isOwner = p.dolgozo_id === user.id
    if (!isOwner) {
      const targetCompId = p.company_id || activeCompanyId
      const { hrRole, isCompanyAdmin } = await getActiveCompanyMemberRolesServer(targetCompId)
      const isHr = isCompanyAdmin || ["admin", "hr_vezeto", "hr_munkatars"].includes(hrRole)
      if (!isHr) return { error: "Nincs jogosultságod a bérpapír letöltéséhez" }
    }

    const { data: prof } = await adminClient.from("felhasznalo_profil").select("nev, szervezeti_egyseg_id, hr_szervezeti_egyseg_id").eq("id", p.dolgozo_id).single()
    const { data: secret } = await adminClient.from("hr_dolgozo_titkos_adat").select("*").eq("dolgozo_id", p.dolgozo_id).maybeSingle()
    
    const taj = hexToAscii(secret?.taj_szam_titkositott) || "-"
    const ado = hexToAscii(secret?.adoazonosito_titkositott) || "-"
    const employeeName = prof?.nev || "Munkavállaló"

    // Cégadatok dinamikus betöltése az aktív vagy a bérpapírhoz rendelt cég alapján
    const companyToLookup = p.company_id || activeCompanyId
    let employerName = "eaisyDocs & eaisyHR Rendszer"
    let employerAddress = "1054 Budapest, Szabadság tér 7."
    let employerTaxNumber = "12345678-2-41"

    if (companyToLookup) {
      const { data: comp } = await adminClient
        .from("companies")
        .select("name, address, tax_number")
        .eq("id", companyToLookup)
        .maybeSingle()
      if (comp) {
        if (comp.name) employerName = comp.name
        if (comp.address) employerAddress = comp.address
        if (comp.tax_number) employerTaxNumber = comp.tax_number
      }
    }

    const pdfData: PayslipPdfData = {
      ev: p.ev,
      honap: p.honap,
      honapNev: getMonthNameHu(p.honap),
      munkaltatoNev: employerName,
      munkaltatoCim: employerAddress,
      munkaltatoAdoszam: employerTaxNumber,
      dolgozoNev: employeeName,
      adoazonosito: ado,
      tajSzam: taj,
      munkakor: "Munkatárs",
      reszleg: "Központi Osztály",
      bankszamlaszam: p.bankszamlaszam || "-",
      tervezettMunkanap: p.tervezett_munkanap,
      ledolgozottMunkanap: p.ledolgozott_munkanap,
      ledolgozottMunkaora: Number(p.ledolgozott_munkaora),
      szabadsagNap: p.szabadsag_nap,
      betegszabadsagNap: p.betegszabadsag_nap,
      tuloraOra: Number(p.tulora_ora),
      bruttoAlapber: Number(p.brutto_alapber),
      alapberReszlet: Number(p.alapber_reszlet),
      szabadsagDij: Number(p.szabadsag_dij),
      betegszabadsagDij: Number(p.betegszabadsag_dij),
      tuloraPotlek: Number(p.tulora_potlek),
      bonuszJutalom: Number(p.bonusz_jutalom),
      cafeteriaBrutto: Number(p.cafeteria_brutto),
      bruttoOsszesen: Number(p.brutto_osszesen),
      kedvezmeny25EvAlatti: Boolean(p.kedvezmeny_25_ev_alatti),
      csaladiKedvezmenyOsszeg: Number(p.csaladi_kedvezmeny_osszeg),
      egyebAdokedvezmeny: Number(p.egyeb_adokedvezmeny_osszeg),
      adokedvezmenyekOsszesen: Number(p.adokedvezmenyek_osszesen),
      szjaLevonas: Number(p.szja_levonas),
      tbJarulekLevonas: Number(p.tb_jarulek_levonas),
      letiltasEgyebLevonas: Number(p.letiltas_egyeb_levonas),
      levonasokOsszesen: Number(p.levonasok_osszesen),
      nettoKifizetendo: Number(p.netto_kifizetendo),
      szochoMunkaltatoi: Number(p.szocho_munkaltatoi),
      kifizetesHatarido: p.kifizetes_hatarido || `${p.ev}. ${getMonthNameHu(p.honap === 12 ? 1 : p.honap + 1)} 10.`,
      kifizetesModja: p.kifizetes_modja || "Banki átutalás",
      statusz: p.statusz,
      atvetelDatuma: p.atvetel_datuma,
      atvetelIp: p.atvetel_ip
    }

    const { buffer, fileName } = await generatePayslipPdfBuffer(pdfData)
    return {
      base64: buffer.toString("base64"),
      fileName
    }
  }

  // 2. Ha még nincs mentve az adatbázisban (még "nem_generalt"), on-the-fly generálás:
  if (dolgozoId && year && month) {
    const isOwner = dolgozoId === user.id
    if (!isOwner) {
      const { hrRole, isCompanyAdmin } = await getActiveCompanyMemberRolesServer(activeCompanyId)
      const isHr = isCompanyAdmin || ["admin", "hr_vezeto", "hr_munkatars"].includes(hrRole)
      if (!isHr) return { error: "Nincs jogosultságod a bérpapír letöltéséhez" }
    }

    const dash = await getPayrollDashboardData(year, month)
    const row = dash.data?.items.find(i => i.dolgozoId === dolgozoId)
    if (!row) return { error: "Bérpapír és dolgozó nem található" }

    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year

    let employerName = "eaisyDocs & eaisyHR Rendszer"
    let employerAddress = "1054 Budapest, Szabadság tér 7."
    let employerTaxNumber = "12345678-2-41"

    if (activeCompanyId) {
      const { data: comp } = await adminClient
        .from("companies")
        .select("name, address, tax_number")
        .eq("id", activeCompanyId)
        .maybeSingle()
      if (comp) {
        if (comp.name) employerName = comp.name
        if (comp.address) employerAddress = comp.address
        if (comp.tax_number) employerTaxNumber = comp.tax_number
      }
    }

    const pdfData: PayslipPdfData = {
      ev: year,
      honap: month,
      honapNev: getMonthNameHu(month),
      munkaltatoNev: employerName,
      munkaltatoCim: employerAddress,
      munkaltatoAdoszam: employerTaxNumber,
      dolgozoNev: row.nev,
      adoazonosito: row.adoazonosito,
      tajSzam: row.tajSzam,
      munkakor: row.munkakor,
      reszleg: row.reszleg,
      bankszamlaszam: row.bankszamlaszam || "-",
      tervezettMunkanap: row.tervezettMunkanap,
      ledolgozottMunkanap: row.ledolgozottMunkanap,
      ledolgozottMunkaora: row.ledolgozottMunkaora,
      szabadsagNap: row.szabadsagNap,
      betegszabadsagNap: row.betegszabadsagNap,
      tuloraOra: row.tuloraOra,
      bruttoAlapber: row.bruttoAlapber,
      alapberReszlet: row.bruttoAlapber,
      szabadsagDij: 0,
      betegszabadsagDij: 0,
      tuloraPotlek: 0,
      bonuszJutalom: row.bonuszJutalom,
      cafeteriaBrutto: row.cafeteriaBrutto,
      bruttoOsszesen: row.bruttoOsszesen,
      kedvezmeny25EvAlatti: row.kedvezmeny25EvAlatti,
      csaladiKedvezmenyOsszeg: row.csaladiKedvezmenyOsszeg,
      egyebAdokedvezmeny: row.egyebAdokedvezmeny,
      adokedvezmenyekOsszesen: 0,
      szjaLevonas: row.szjaLevonas,
      tbJarulekLevonas: row.tbJarulekLevonas,
      letiltasEgyebLevonas: row.letiltasEgyebLevonas,
      levonasokOsszesen: row.levonasokOsszesen,
      nettoKifizetendo: row.nettoKifizetendo,
      szochoMunkaltatoi: row.szochoMunkaltatoi,
      kifizetesHatarido: `${nextYear}. ${getMonthNameHu(nextMonth)} 10.`,
      kifizetesModja: "Banki átutalás",
      statusz: "tervezet",
      atvetelDatuma: null,
      atvetelIp: null
    }

    const { buffer, fileName } = await generatePayslipPdfBuffer(pdfData)
    return {
      base64: buffer.toString("base64"),
      fileName
    }
  }

  return { error: "Bérpapír nem található" }
}
