"use server"

import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { executeHrDocumentFiling } from "@/utils/hr-filing-bridge"
import type { T1041ReportRow, KshReportData, PayrollReportRow } from "@/utils/hr/reports-export"
import { getActiveCompanyIdServer } from "@/utils/company-server"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function hexToAscii(hex: string | null) {
  if (!hex || !hex.startsWith("\\x")) return null
  const h = hex.substring(2)
  let str = ""
  for (let i = 0; i < h.length; i += 2) {
    str += String.fromCharCode(parseInt(h.substr(i, 2), 16))
  }
  return str
}

export interface T1041ReportResponse {
  yearMonth: string
  items: T1041ReportRow[]
  metrics: {
    totalCount: number
    newIntakeCount: number
    exitCount: number
    changeCount: number
    verifiedCount: number
  }
}

/**
 * Közös HR törzsadat betöltő segédfüggvény
 * Biztosítja a hibamentes, gyors adatösszekapcsolást PostgREST kapcsolat-hibák nélkül.
 */
async function loadHrMasterData(adminClient: any, targetCompanyId?: string | null) {
  const activeCompanyId = targetCompanyId !== undefined ? targetCompanyId : (await getActiveCompanyIdServer())

  let memberUserIds: string[] = []
  if (activeCompanyId) {
    const { data: members } = await adminClient
      .from("company_members")
      .select("user_id")
      .eq("company_id", activeCompanyId)
    memberUserIds = (members || []).map((m: any) => m.user_id)
  }

  // 1. Profilok (csak az aktív cég tagjai)
  let profQuery = adminClient
    .from("felhasznalo_profil")
    .select("id, nev, szervezeti_egyseg_id, hr_szervezeti_egyseg_id")
  if (activeCompanyId && memberUserIds.length > 0) {
    profQuery = profQuery.in("id", memberUserIds)
  }
  const { data: profiles } = await profQuery
  const profMap = new Map<string, { nev: string; orgId: string | null }>()
  profiles?.forEach((p: any) =>
    profMap.set(p.id, { nev: p.nev, orgId: p.hr_szervezeti_egyseg_id || p.szervezeti_egyseg_id })
  )

  // 2. Szervezeti egységek (csak az aktív cég)
  let orgQuery = adminClient.from("szervezeti_egyseg").select("id, nev")
  if (activeCompanyId) {
    orgQuery = orgQuery.eq("company_id", activeCompanyId)
  }
  const { data: orgUnits } = await orgQuery
  const orgMap = new Map<string, string>()
  orgUnits?.forEach((o: any) => orgMap.set(o.id, o.nev))

  // 3. Munkakörök (csak az aktív cég)
  let mkQuery = adminClient
    .from("hr_munkakor")
    .select("id, megnevezes, feor_kod, szervezeti_egyseg_id")
  if (activeCompanyId) {
    mkQuery = mkQuery.eq("company_id", activeCompanyId)
  }
  const { data: munkakorok } = await mkQuery
  const mkMap = new Map<string, { megnevezes: string; feor: string; orgId: string | null }>()
  munkakorok?.forEach((m: any) =>
    mkMap.set(m.id, { megnevezes: m.megnevezes, feor: m.feor_kod, orgId: m.szervezeti_egyseg_id })
  )

  // 4. Beosztások
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

  // 5. Titkos bér- és azonosító adatok (csak az aktív cég tagjai)
  let secretQuery = adminClient.from("hr_dolgozo_titkos_adat").select("*")
  if (activeCompanyId && memberUserIds.length > 0) {
    secretQuery = secretQuery.in("dolgozo_id", memberUserIds)
  }
  const { data: secretData } = await secretQuery
  const secretMap = new Map<string, { taj: string | null; ado: string | null; brutto: number | null }>()
  secretData?.forEach((s: any) => {
    const bruttoStr = hexToAscii(s.brutto_ber_titkositott)
    secretMap.set(s.dolgozo_id, {
      taj: hexToAscii(s.taj_szam_titkositott),
      ado: hexToAscii(s.adoazonosito_titkositott),
      brutto: bruttoStr ? parseInt(bruttoStr, 10) : null,
    })
  })

  // 6. Jogviszonyok (csak az aktív cég)
  let jogvQuery = adminClient
    .from("hr_jogviszony")
    .select("id, dolgozo_id, belepes_datuma, kilepes_datuma, tipus")
  if (activeCompanyId) {
    jogvQuery = jogvQuery.eq("company_id", activeCompanyId)
  }
  const { data: jogviszonyok } = await jogvQuery

  return {
    activeCompanyId,
    memberUserIds,
    profMap,
    orgMap,
    mkMap,
    beosztasMap,
    secretMap,
    jogviszonyok: jogviszonyok || [],
  }
}

/**
 * NAV T1041 Havi Hatósági Riport Adatgyűjtés
 */
export async function getT1041ReportData(yearMonth: string): Promise<T1041ReportResponse> {
  const adminClient = getAdminClient()
  const activeCompanyId = await getActiveCompanyIdServer()
  const firstDay = `${yearMonth}-01`
  const [yearStr, monthStr] = yearMonth.split("-")
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  const lastDayNum = new Date(year, month, 0).getDate()
  const lastDay = `${yearMonth}-${String(lastDayNum).padStart(2, "0")}`

  // 1. Törzsadatok betöltése
  const { profMap, orgMap, beosztasMap, secretMap, jogviszonyok } = await loadHrMasterData(adminClient, activeCompanyId)

  // 2. Meglévő T1041 bejelentési rekordok lekérése valós mezőkkel
  let t1041Query = adminClient
    .from("hr_t1041_bejelentes")
    .select(`
      id,
      bejelentes_tipus,
      biztositott_neve,
      taj_szam,
      adoazonosito_jel,
      munkakor,
      feor_kod,
      jogviszony_kezdete,
      jogviszony_vege,
      heti_munkaido_ora,
      allapot,
      bekuldes_datuma,
      adatlap_url,
      nyugta_url,
      created_at,
      dolgozo_id,
      onboarding_id,
      offboarding_id
    `)
    .order("created_at", { ascending: false })

  if (activeCompanyId) {
    t1041Query = t1041Query.eq("company_id", activeCompanyId)
  }

  const { data: t1041Records, error: t1041Err } = await t1041Query

  if (t1041Err) {
    console.error("Hiba a T1041 lekérésekor:", t1041Err)
  }

  const results: T1041ReportRow[] = []
  const processedNames = new Set<string>()

  // A) Rögzített T1041 rekordok szűrése az adott hónapra
  for (const r of t1041Records || []) {
    const isRelevantDate =
      (r.jogviszony_kezdete && r.jogviszony_kezdete.startsWith(yearMonth)) ||
      (r.jogviszony_vege && r.jogviszony_vege.startsWith(yearMonth)) ||
      (r.bekuldes_datuma && r.bekuldes_datuma.startsWith(yearMonth)) ||
      (r.created_at && r.created_at.startsWith(yearMonth))

    if (!isRelevantDate) continue

    const nameKey = (r.biztositott_neve || "").trim().toLowerCase()
    processedNames.add(nameKey)

    let reszlegNev = "Központi Osztály"
    if (r.dolgozo_id) {
      const matchJogv = jogviszonyok.find((j: any) => j.dolgozo_id === r.dolgozo_id)
      if (matchJogv) {
        const b = beosztasMap.get(matchJogv.id)
        const p = profMap.get(r.dolgozo_id)
        const oId = b?.orgId || p?.orgId
        if (oId && orgMap.has(oId)) reszlegNev = orgMap.get(oId)!
      }
    }

    let taj = r.taj_szam || ""
    let adojel = r.adoazonosito_jel || ""
    if (r.dolgozo_id && (!taj || !adojel)) {
      const sec = secretMap.get(r.dolgozo_id)
      if (sec) {
        if (!taj && sec.taj) taj = sec.taj
        if (!adojel && sec.ado) adojel = sec.ado
      }
    }

    let adatlapSignedUrl = undefined
    if (r.adatlap_url) {
      const { data: sUrl } = await adminClient.storage
        .from("irat_files")
        .createSignedUrl(r.adatlap_url, 3600)
      if (sUrl?.signedUrl) adatlapSignedUrl = sUrl.signedUrl
    }

    let nyugtaSignedUrl = undefined
    if (r.nyugta_url) {
      const { data: sUrl } = await adminClient.storage
        .from("irat_files")
        .createSignedUrl(r.nyugta_url, 3600)
      if (sUrl?.signedUrl) nyugtaSignedUrl = sUrl.signedUrl
    }

    const typeLabel =
      r.bejelentes_tipus === "U"
        ? "Új bejelentés (U)"
        : r.bejelentes_tipus === "T"
        ? "Kijelentés / Törlés (T)"
        : "Változás / Módosítás (V)"

    const allapotLabel =
      r.allapot === "igazolva" || r.nyugta_url
        ? "Igazolva (Nyugta csatolva)"
        : r.allapot === "bekuldve"
        ? "Beküldve a NAV-hoz"
        : "Előkészítve"

    results.push({
      id: r.id,
      biztositottNeve: r.biztositott_neve || "Biztosított",
      bejelentesTipus: (r.bejelentes_tipus as "U" | "V" | "T") || "U",
      bejelentesTipusLabel: typeLabel,
      adoazonositoJel: adojel || "-",
      tajSzam: taj || "-",
      munkakor: r.munkakor || "-",
      feorKod: r.feor_kod || "-",
      reszleg: reszlegNev,
      jogviszonyKezdete: r.jogviszony_kezdete || "",
      jogviszonyVege: r.jogviszony_vege || undefined,
      hetiMunkaidoOra: r.heti_munkaido_ora || 40,
      allapot: r.nyugta_url ? "igazolva" : r.allapot || "elokeszitve",
      allapotLabel,
      bekuldesDatuma: r.bekuldes_datuma || undefined,
      hasAdatlap: Boolean(r.adatlap_url),
      adatlapUrl: adatlapSignedUrl,
      hasNyugta: Boolean(r.nyugta_url) || r.allapot === "igazolva",
      nyugtaUrl: nyugtaSignedUrl,
    })
  }

  // B) Hónapban belépő vagy kilépő dolgozók, akikhez még nincs rögzített T1041 rekord (Gap-detektálás)
  for (const j of jogviszonyok) {
    const prof = profMap.get(j.dolgozo_id)
    const pNev = prof?.nev || ""
    if (!pNev) continue

    const entersInMonth = j.belepes_datuma && j.belepes_datuma >= firstDay && j.belepes_datuma <= lastDay
    const exitsInMonth = j.kilepes_datuma && j.kilepes_datuma >= firstDay && j.kilepes_datuma <= lastDay

    if ((entersInMonth || exitsInMonth) && !processedNames.has(pNev.trim().toLowerCase())) {
      const b = beosztasMap.get(j.id)
      const sec = secretMap.get(j.dolgozo_id)
      const oId = b?.orgId || prof?.orgId
      const reszleg = (oId && orgMap.get(oId)) || "Központi Osztály"

      const taj = sec?.taj || "-"
      const adojel = sec?.ado || "-"
      const munkakor = b?.munkakor || "-"
      const feor = b?.feor || "-"
      const fte = b?.fte || 1.0
      const hetiOra = fte * 40

      const bejelentesTipus = exitsInMonth ? "T" : "U"
      const typeLabel = exitsInMonth ? "Kijelentés / Törlés (T)" : "Új bejelentés (U)"

      results.push({
        biztositottNeve: pNev,
        bejelentesTipus,
        bejelentesTipusLabel: typeLabel,
        adoazonositoJel: adojel,
        tajSzam: taj,
        munkakor,
        feorKod: feor,
        reszleg,
        jogviszonyKezdete: j.belepes_datuma || "",
        jogviszonyVege: j.kilepes_datuma || undefined,
        hetiMunkaidoOra: hetiOra,
        allapot: "elokeszitesre_var",
        allapotLabel: "Bejelentésre vár",
        hasAdatlap: false,
        hasNyugta: false,
      })
      processedNames.add(pNev.trim().toLowerCase())
    }
  }

  // Metrikák kiszámítása
  const totalCount = results.length
  const newIntakeCount = results.filter((r) => r.bejelentesTipus === "U").length
  const exitCount = results.filter((r) => r.bejelentesTipus === "T").length
  const changeCount = results.filter((r) => r.bejelentesTipus === "V").length
  const verifiedCount = results.filter((r) => r.hasNyugta || r.allapot === "igazolva").length

  return {
    yearMonth,
    items: results,
    metrics: {
      totalCount,
      newIntakeCount,
      exitCount,
      changeCount,
      verifiedCount,
    },
  }
}

/**
 * KSH Havi Munkaügyi Jelentés Adatgyűjtés és Aggregáció
 */
export async function getKshReportData(yearMonth: string): Promise<KshReportData> {
  const adminClient = getAdminClient()
  const activeCompanyId = await getActiveCompanyIdServer()
  const [yearStr, monthStr] = yearMonth.split("-")
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)

  const firstDay = `${yearMonth}-01`
  const lastDayNum = new Date(year, month, 0).getDate()
  const lastDay = `${yearMonth}-${String(lastDayNum).padStart(2, "0")}`

  // 1. Törzsadatok betöltése
  const { profMap, orgMap, beosztasMap, jogviszonyok } = await loadHrMasterData(adminClient, activeCompanyId)

  let zaroLetszam = 0
  let atlagosFte = 0
  let belepettFo = 0
  let kilepettFo = 0

  const deptMap = new Map<
    string,
    { reszlegNev: string; aktivLetszam: number; fteSum: number; ledolgozottOra: number; tavolletOra: number }
  >()

  const activeEmployeeIds = new Set<string>()

  for (const j of jogviszonyok) {
    // Belépés ebben a hónapban?
    if (j.belepes_datuma && j.belepes_datuma >= firstDay && j.belepes_datuma <= lastDay) {
      belepettFo++
    }
    // Kilépés ebben a hónapban?
    if (j.kilepes_datuma && j.kilepes_datuma >= firstDay && j.kilepes_datuma <= lastDay) {
      kilepettFo++
    }

    // Aktív volt a hónap utolsó napján?
    const isActiveAtEnd =
      j.belepes_datuma &&
      j.belepes_datuma <= lastDay &&
      (!j.kilepes_datuma || j.kilepes_datuma >= lastDay)

    if (isActiveAtEnd) {
      zaroLetszam++
      const b = beosztasMap.get(j.id)
      const p = profMap.get(j.dolgozo_id)
      const fte = b?.fte || 1.0
      atlagosFte += fte
      if (j.dolgozo_id) activeEmployeeIds.add(j.dolgozo_id)

      const oId = b?.orgId || p?.orgId
      const deptName = (oId && orgMap.get(oId)) || "Központi Osztály"

      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, {
          reszlegNev: deptName,
          aktivLetszam: 0,
          fteSum: 0,
          ledolgozottOra: 0,
          tavolletOra: 0,
        })
      }
      const dEntry = deptMap.get(deptName)!
      dEntry.aktivLetszam += 1
      dEntry.fteSum += fte
    }
  }

  // 2. Tervezett havi munkanapok száma
  let plannedWorkdays = 0
  for (let day = 1; day <= lastDayNum; day++) {
    const dateObj = new Date(year, month - 1, day)
    const dayOfWeek = dateObj.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      plannedWorkdays++
    }
  }

  // Törvényes havi norma munkaidő-alap (Terv órák)
  const normaMunkaora = Number((atlagosFte * plannedWorkdays * 8.0).toFixed(1))

  // 3. Ténylegesen ledolgozott órák a hr_jelenlet alapján (Tény órák, cégre szűrve)
  let jelenletQuery = adminClient
    .from("hr_jelenlet")
    .select("datum, becsekkolas_ideje, kicsekkolas_ideje, dolgozo_id")
    .gte("datum", firstDay)
    .lte("datum", lastDay)

  if (activeCompanyId) {
    jelenletQuery = jelenletQuery.eq("company_id", activeCompanyId)
  }

  const { data: jelenletek } = await jelenletQuery

  let osszesLedolgozottOra = 0
  for (const row of jelenletek || []) {
    if (row.becsekkolas_ideje && row.kicsekkolas_ideje) {
      const inTime = new Date(row.becsekkolas_ideje).getTime()
      const outTime = new Date(row.kicsekkolas_ideje).getTime()
      if (outTime > inTime) {
        const diffHours = (outTime - inTime) / (1000 * 60 * 60)
        osszesLedolgozottOra += diffHours
      }
    } else if (row.becsekkolas_ideje) {
      osszesLedolgozottOra += 8.0
    }
  }

  // 4. Túlórák (cégre szűrve)
  let tuloraOra = 0
  try {
    let tuloraQuery = adminClient.from("hr_tulora_felhasznalas").select("perc, statusz")
    if (activeCompanyId) {
      tuloraQuery = tuloraQuery.eq("company_id", activeCompanyId)
    }
    const { data: tuloraData } = await tuloraQuery
    for (const t of tuloraData || []) {
      if (t.statusz === "jovahagyva" && t.perc) {
        tuloraOra += t.perc / 60.0
      }
    }
  } catch {
    // Ha a tábla még üres
  }

  const rendesMunkaora = Math.max(0, osszesLedolgozottOra - tuloraOra)
  const teljesitesiArany = normaMunkaora > 0 ? Number(((osszesLedolgozottOra / normaMunkaora) * 100).toFixed(1)) : 0

  // 5. Távollétek összesítése (cégre szűrve)
  let tavolletQuery = adminClient
    .from("hr_tavollet")
    .select("kezdet_datuma, veg_datuma, tipus, statusz, dolgozo_id")
    .lte("kezdet_datuma", lastDay)
    .gte("veg_datuma", firstDay)

  if (activeCompanyId) {
    tavolletQuery = tavolletQuery.eq("company_id", activeCompanyId)
  }

  const { data: tavolletek } = await tavolletQuery

  let szabadsagNap = 0
  let betegszabadsagNap = 0
  let tappenzNap = 0
  let egyebTavolletNap = 0

  for (const row of tavolletek || []) {
    if (row.statusz !== "jovahagyva") continue

    const kDate = new Date(Math.max(new Date(row.kezdet_datuma).getTime(), new Date(firstDay).getTime()))
    const vDate = new Date(Math.min(new Date(row.veg_datuma).getTime(), new Date(lastDay).getTime()))
    const days = Math.max(1, Math.round((vDate.getTime() - kDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)

    const tType = (row.tipus || "").toLowerCase()
    if (tType.includes("szabad") || tType.includes("fizetett")) {
      szabadsagNap += days
    } else if (tType.includes("beteg")) {
      betegszabadsagNap += days
    } else if (tType.includes("tappenz") || tType.includes("táppénz")) {
      tappenzNap += days
    } else {
      egyebTavolletNap += days
    }
  }

  const szabadsagOra = szabadsagNap * 8.0
  const betegszabadsagOra = betegszabadsagNap * 8.0

  // Részlegenkénti óraarányosítás
  const totalFteAll = atlagosFte > 0 ? atlagosFte : 1
  const reszlegek = Array.from(deptMap.values()).map((d) => {
    const fteRatio = d.fteSum / totalFteAll
    return {
      reszlegNev: d.reszlegNev,
      aktivLetszam: d.aktivLetszam,
      atlagosFte: Number(d.fteSum.toFixed(2)),
      normaOra: Number((d.fteSum * plannedWorkdays * 8.0).toFixed(1)),
      ledolgozottOra: Number((osszesLedolgozottOra * fteRatio).toFixed(1)),
      tavolletOra: Number(((szabadsagOra + betegszabadsagOra) * fteRatio).toFixed(1)),
    }
  })

  return {
    yearMonth,
    zaroLetszam,
    atlagosFte: Number(atlagosFte.toFixed(2)),
    belepettFo,
    kilepettFo,
    normaMunkaora,
    osszesLedolgozottOra: Number(osszesLedolgozottOra.toFixed(1)),
    teljesitesiArany,
    rendesMunkaora: Number(rendesMunkaora.toFixed(1)),
    tulora: Number(tuloraOra.toFixed(1)),
    szabadsagNap,
    szabadsagOra: Number(szabadsagOra.toFixed(1)),
    betegszabadsagNap,
    betegszabadsagOra: Number(betegszabadsagOra.toFixed(1)),
    tappenzNap,
    egyebTavolletNap,
    reszlegek,
  }
}

/**
 * Havi Bérszámfejtési Csomag és Jelenlét Adatgyűjtés
 */
export async function getPayrollReportData(yearMonth: string) {
  const adminClient = getAdminClient()
  const activeCompanyId = await getActiveCompanyIdServer()
  const [yearStr, monthStr] = yearMonth.split("-")
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)

  const firstDay = `${yearMonth}-01`
  const lastDayNum = new Date(year, month, 0).getDate()
  const lastDay = `${yearMonth}-${String(lastDayNum).padStart(2, "0")}`

  // Havi naptári munkanapok becslése (alapértelmezett: 21-22 nap)
  let plannedWorkdays = 0
  for (let day = 1; day <= lastDayNum; day++) {
    const dateObj = new Date(year, month - 1, day)
    const dayOfWeek = dateObj.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      plannedWorkdays++
    }
  }

  // 1. Törzsadatok betöltése
  const { profMap, orgMap, beosztasMap, secretMap, jogviszonyok } = await loadHrMasterData(adminClient, activeCompanyId)

  // 2. Havi jelenléti zárások (cégre szűrve)
  let zarasQuery = adminClient
    .from("hr_havi_jelenlet_zaras")
    .select("dolgozo_id, statusz")
    .eq("ev", year)
    .eq("honap", month)

  if (activeCompanyId) {
    zarasQuery = zarasQuery.eq("company_id", activeCompanyId)
  }

  const { data: zarások } = await zarasQuery

  const zarasMap = new Map<string, string>()
  zarások?.forEach((z) => zarasMap.set(z.dolgozo_id, z.statusz))

  // 3. Jelenlétek az adott hónapban (cégre szűrve)
  let jelenletQuery = adminClient
    .from("hr_jelenlet")
    .select("dolgozo_id, datum, becsekkolas_ideje, kicsekkolas_ideje")
    .gte("datum", firstDay)
    .lte("datum", lastDay)

  if (activeCompanyId) {
    jelenletQuery = jelenletQuery.eq("company_id", activeCompanyId)
  }

  const { data: jelenletek } = await jelenletQuery

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

  // 4. Távollétek (cégre szűrve)
  let tavolletQuery = adminClient
    .from("hr_tavollet")
    .select("dolgozo_id, kezdet_datuma, veg_datuma, tipus, statusz")
    .lte("kezdet_datuma", lastDay)
    .gte("veg_datuma", firstDay)
    .eq("statusz", "jovahagyva")

  if (activeCompanyId) {
    tavolletQuery = tavolletQuery.eq("company_id", activeCompanyId)
  }

  const { data: tavolletek } = await tavolletQuery

  const leaveMap = new Map<string, { szabadsag: number; beteg: number; tappenz: number; egyeb: number }>()
  tavolletek?.forEach((t) => {
    if (!leaveMap.has(t.dolgozo_id)) {
      leaveMap.set(t.dolgozo_id, { szabadsag: 0, beteg: 0, tappenz: 0, egyeb: 0 })
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
    } else if (tType.includes("tappenz") || tType.includes("táppénz")) {
      cur.tappenz += days
    } else {
      cur.egyeb += days
    }
  })

  // 5. Cafeteria havi igényelt összeg (cégre szűrve)
  let cafeteriaQuery = adminClient
    .from("hr_cafeteria_valasztas")
    .select("dolgozo_id, kert_osszeg, ev")
    .eq("ev", year)

  if (activeCompanyId) {
    cafeteriaQuery = cafeteriaQuery.eq("company_id", activeCompanyId)
  }

  const { data: cafeteriaChoices } = await cafeteriaQuery

  const cafeteriaMap = new Map<string, number>()
  cafeteriaChoices?.forEach((c) => {
    const monthlyAmt = Math.round((c.kert_osszeg || 0) / 12)
    cafeteriaMap.set(c.dolgozo_id, (cafeteriaMap.get(c.dolgozo_id) || 0) + monthlyAmt)
  })

  const results: PayrollReportRow[] = []
  const processedDolgozoIds = new Set<string>()

  for (const j of jogviszonyok) {
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
    const brutto = sec?.brutto || null

    const b = beosztasMap.get(j.id)
    const fte = b?.fte || 1.0
    const hetiOra = fte * 40
    const munkakor = b?.munkakor || "-"
    const feor = b?.feor || "-"
    const oId = b?.orgId || prof?.orgId
    const reszleg = (oId && orgMap.get(oId)) || "Központi Osztály"

    const plannedHours = plannedWorkdays * fte * 8.0
    const att = attendanceMap.get(dId) || {
      days: 0,
      hours: 0,
    }

    const leaves = leaveMap.get(dId) || { szabadsag: 0, beteg: 0, tappenz: 0, egyeb: 0 }
    const cafeteriaMonthly = cafeteriaMap.get(dId) || 0

    const zarasStatuszRaw = zarasMap.get(dId) || "nyitott"
    const zarasStatusz: "jovahagyva" | "jovahagyasra_var" | "nyitott" =
      zarasStatuszRaw === "jovahagyva"
        ? "jovahagyva"
        : zarasStatuszRaw === "jovahagyasra_var"
        ? "jovahagyasra_var"
        : "nyitott"

    const zarasStatuszLabel =
      zarasStatusz === "jovahagyva"
        ? "Vezető által jóváhagyva"
        : zarasStatusz === "jovahagyasra_var"
        ? "Jóváhagyásra vár"
        : "Jelenlét még nyitott"

    results.push({
      dolgozoId: dId,
      nev,
      adoazonosito: ado,
      tajSzam: taj,
      reszleg,
      munkakor,
      feorKod: feor,
      hetiMunkaidoOra: hetiOra,
      bruttoAlapber: brutto,
      tervezettMunkanap: plannedWorkdays,
      tervezettMunkaora: Number(plannedHours.toFixed(1)),
      ledolgozottMunkanap: att.days,
      ledolgozottMunkaora: Number(att.hours.toFixed(1)),
      tuloraOra: 0,
      szabadsagNap: leaves.szabadsag,
      betegszabadsagNap: leaves.beteg,
      tappenzNap: leaves.tappenz,
      egyebTavolletNap: leaves.egyeb,
      cafeteriaHaviBrutto: cafeteriaMonthly,
      zarasStatusz,
      zarasStatuszLabel,
    })
  }

  const closedCount = results.filter((r) => r.zarasStatusz === "jovahagyva").length
  const pendingCount = results.filter((r) => r.zarasStatusz === "jovahagyasra_var").length
  const totalPlannedHours = results.reduce((acc, r) => acc + r.tervezettMunkaora, 0)
  const totalWorkedHours = results.reduce((acc, r) => acc + r.ledolgozottMunkaora, 0)
  const totalCafeteriaGross = results.reduce((acc, r) => acc + r.cafeteriaHaviBrutto, 0)

  return {
    yearMonth,
    items: results,
    metrics: {
      totalEmployees: results.length,
      closedCount,
      pendingCount,
      totalPlannedHours: Number(totalPlannedHours.toFixed(1)),
      totalWorkedHours: Number(totalWorkedHours.toFixed(1)),
      totalCafeteriaGross,
    },
  }
}

/**
 * Hivatalos NAV T1041 Befogadási Nyugta feltöltése közvetlenül a Riport felületről
 */
export async function uploadT1041ReceiptFromReport(formData: FormData) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: "Nincs bejelentkezve" }

    const adminClient = getAdminClient()
    const file = formData.get("file") as File
    const t1041Id = formData.get("t1041Id") as string
    const employeeName = (formData.get("employeeName") as string) || "Munkavállaló"

    if (!file) return { error: "Nincs kiválasztva fájl!" }

    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const storagePath = `hr/t1041/report_${t1041Id || timestamp}/nyugta_${timestamp}_${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadErr } = await adminClient.storage
      .from("irat_files")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/pdf",
        upsert: true,
      })

    if (uploadErr) {
      console.error("Receipt upload error:", uploadErr)
      return { error: "Nem sikerült feltölteni a nyugtát a tárolóba." }
    }

    const docName = `${employeeName} - Hivatalos NAV T1041 Befogadási Nyugta`

    const { data: newDoc, error: docErr } = await adminClient
      .from("hr_dokumentum")
      .insert({
        nev: docName,
        kategoria: "Hatósági bejelentés",
        url: storagePath,
      })
      .select()
      .single()

    if (docErr || !newDoc) {
      return { error: "Nem sikerült menteni a nyugtát az adatbázisba." }
    }

    // Ha van meglévő hr_t1041_bejelentes rekord
    if (t1041Id && t1041Id !== "new") {
      await adminClient
        .from("hr_t1041_bejelentes")
        .update({
          nyugta_dokumentum_id: newDoc.id,
          nyugta_url: storagePath,
          allapot: "igazolva",
          updated_at: new Date().toISOString(),
        })
        .eq("id", t1041Id)
    }

    // Audit napló
    await adminClient.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      esemeny_tipus: "adat_letrehozas",
      entitas_tipus: "hr_t1041_bejelentes",
      entitas_id: newDoc.id,
      megjegyzes: `NAV T1041 befogadási nyugta feltöltve a riport felületről: ${employeeName}`,
    })

    revalidatePath("/hr/reports")
    return { success: true, document: newDoc }
  } catch (err: any) {
    console.error("uploadT1041ReceiptFromReport error:", err)
    return { error: err.message || "Hiba történt a nyugta feltöltésekor." }
  }
}

/**
 * Bevallás archívum mentése
 */
export async function saveArchiveRecord(
  tipus: string,
  idoszak: string,
  fajl_nev: string,
  fajl_utvonal: string,
  feltolto_id: string
) {
  const adminClient = getAdminClient()
  const activeCompanyId = await getActiveCompanyIdServer()
  const { data, error } = await adminClient
    .from("hr_bevallas_archivum")
    .insert([{ 
      tipus, 
      idoszak, 
      fajl_nev, 
      fajl_utvonal, 
      feltolto_id,
      company_id: activeCompanyId 
    }])
    .select()

  if (error) {
    console.error("Archive hiba:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Új bevallás feltöltése az archívumba
 */
export async function uploadArchiveFileAdmin(formData: FormData) {
  const adminClient = getAdminClient()
  const activeCompanyId = await getActiveCompanyIdServer()
  const file = formData.get("file") as File
  const type = formData.get("type") as string
  const month = formData.get("month") as string
  const userId = formData.get("userId") as string
  const ugyszam = formData.get("ugyszam") as string

  if (!file) return { success: false, error: "Nincs fájl kiválasztva!" }

  const fileExt = file.name.split(".").pop()
  const fileName = `${type.replace(/[^a-zA-Z0-9]/g, "_")}_${month}_${Date.now()}.${fileExt}`
  const filePath = `reports/${month}/${fileName}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await adminClient.storage
    .from("hr_reports")
    .upload(filePath, buffer, {
      contentType: file.type || "application/pdf",
      upsert: true,
    })

  if (uploadError) {
    console.error("Storage hiba:", uploadError)
    return { success: false, error: uploadError.message }
  }

  const { error: dbError } = await adminClient.from("hr_bevallas_archivum").insert([
    {
      company_id: activeCompanyId,
      tipus: type,
      idoszak: month,
      fajl_nev: file.name,
      fajl_utvonal: filePath,
      feltolto_id: userId,
      ugyszam: ugyszam || null,
    },
  ])

  if (dbError) {
    console.error("Archive DB hiba:", dbError)
    return { success: false, error: dbError.message }
  }

  revalidatePath("/hr/reports")
  return { success: true }
}

/**
 * Archívum rekordok listázása (cégre szűrve)
 */
export async function getArchiveRecords() {
  const adminClient = getAdminClient()
  const activeCompanyId = await getActiveCompanyIdServer()
  let query = adminClient
    .from("hr_bevallas_archivum")
    .select("*")
    .order("created_at", { ascending: false })

  if (activeCompanyId) {
    query = query.eq("company_id", activeCompanyId)
  }

  const { data, error } = await query

  if (error) {
    console.error("Archive fetch hiba:", error)
    return []
  }

  return data
}

/**
 * Archív rekord törlése
 */
export async function deleteArchiveRecordAdmin(id: string, filePath: string) {
  const adminClient = getAdminClient()
  const { error: storageError } = await adminClient.storage.from("hr_reports").remove([filePath])

  if (storageError) {
    console.error("Storage delete hiba:", storageError)
  }

  const { error: dbError } = await adminClient.from("hr_bevallas_archivum").delete().eq("id", id)

  if (dbError) {
    console.error("Archive delete hiba:", dbError)
    return { success: false, error: dbError.message }
  }

  revalidatePath("/hr/reports")
  return { success: true }
}

export interface ReportEmployeeOption {
  dolgozoId: string
  nev: string
  adoazonosito: string
  tajSzam: string
  munkakor: string
  feorKod: string
  hetiMunkaidoOra: number
  belepesDatuma: string | null
  kilepesDatuma: string | null
  reszleg: string
}

/**
 * Összes munkavállaló lekérése az egyéni riportkészítéshez és T1041 generáláshoz (cégre szűrve)
 */
export async function getAllEmployeesForReports(): Promise<ReportEmployeeOption[]> {
  const adminClient = getAdminClient()
  const activeCompanyId = await getActiveCompanyIdServer()
  const { profMap, orgMap, beosztasMap, secretMap, jogviszonyok } = await loadHrMasterData(adminClient, activeCompanyId)

  const employees: ReportEmployeeOption[] = []
  const seenDolgozoIds = new Set<string>()

  for (const j of jogviszonyok) {
    if (!j.dolgozo_id || seenDolgozoIds.has(j.dolgozo_id)) continue
    seenDolgozoIds.add(j.dolgozo_id)

    const prof = profMap.get(j.dolgozo_id)
    const nev = prof?.nev || "Munkavállaló"
    const sec = secretMap.get(j.dolgozo_id)
    const b = beosztasMap.get(j.id)
    const fte = b?.fte || 1.0
    const oId = b?.orgId || prof?.orgId
    const reszleg = (oId && orgMap.get(oId)) || "Központi Osztály"

    employees.push({
      dolgozoId: j.dolgozo_id,
      nev,
      adoazonosito: sec?.ado || "-",
      tajSzam: sec?.taj || "-",
      munkakor: b?.munkakor || "-",
      feorKod: b?.feor || "-",
      hetiMunkaidoOra: fte * 40,
      belepesDatuma: j.belepes_datuma || null,
      kilepesDatuma: j.kilepes_datuma || null,
      reszleg,
    })
  }

  return employees.sort((a, b) => a.nev.localeCompare(b.nev, "hu"))
}

