import * as XLSX from "xlsx"
import { toast } from "sonner"

export interface T1041ReportRow {
  id?: string
  biztositottNeve: string
  bejelentesTipus: "U" | "V" | "T"
  bejelentesTipusLabel: string
  adoazonositoJel: string
  tajSzam: string
  munkakor: string
  feorKod: string
  reszleg: string
  jogviszonyKezdete: string
  jogviszonyVege?: string
  valtozasDatuma?: string
  valtozasJellege?: string
  hetiMunkaidoOra: number
  allapot: "elokeszitve" | "bekuldve" | "igazolva" | "elokeszitesre_var"
  allapotLabel: string
  bekuldesDatuma?: string
  hasAdatlap: boolean
  adatlapUrl?: string
  hasNyugta: boolean
  nyugtaUrl?: string
}

export interface KshReportData {
  yearMonth: string
  zaroLetszam: number
  atlagosFte: number
  belepettFo: number
  kilepettFo: number
  normaMunkaora: number
  osszesLedolgozottOra: number
  teljesitesiArany: number
  rendesMunkaora: number
  tulora: number
  szabadsagNap: number
  szabadsagOra: number
  betegszabadsagNap: number
  betegszabadsagOra: number
  tappenzNap: number
  egyebTavolletNap: number
  reszlegek: {
    reszlegNev: string
    aktivLetszam: number
    atlagosFte: number
    normaOra: number
    ledolgozottOra: number
    tavolletOra: number
  }[]
}

export interface PayrollReportRow {
  dolgozoId: string
  nev: string
  adoazonosito: string
  tajSzam: string
  reszleg: string
  munkakor: string
  feorKod: string
  hetiMunkaidoOra: number
  bruttoAlapber?: number | null
  tervezettMunkanap: number
  tervezettMunkaora: number
  ledolgozottMunkanap: number
  ledolgozottMunkaora: number
  tuloraOra: number
  szabadsagNap: number
  betegszabadsagNap: number
  tappenzNap: number
  egyebTavolletNap: number
  cafeteriaHaviBrutto: number
  zarasStatusz: "jovahagyva" | "jovahagyasra_var" | "nyitott"
  zarasStatuszLabel: string
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

/**
 * NAV T1041 Excel (.xlsx) Export
 */
export function exportT1041ToXlsx(data: T1041ReportRow[], yearMonth: string) {
  if (!data || data.length === 0) {
    toast.error("Nincs exportálható T1041 bejelentési adat az adott hónapban!")
    return
  }

  const exportRows = data.map((row, index) => ({
    "Ssz.": index + 1,
    "Biztosított Neve": row.biztositottNeve,
    "Bejelentés Jellege": row.bejelentesTipusLabel,
    "Kód": row.bejelentesTipus,
    "Adóazonosító Jel": row.adoazonositoJel || "-",
    "TAJ Szám": row.tajSzam || "-",
    "Szervezeti Egység": row.reszleg || "-",
    "Munkakör": row.munkakor || "-",
    "FEOR-08": row.feorKod || "-",
    "Jogviszony Kezdete": row.jogviszonyKezdete || "-",
    "Jogviszony Vége": row.jogviszonyVege || "-",
    "Változás Dátuma": row.valtozasDatuma || "-",
    "Változás Jellege": row.valtozasJellege || "-",
    "Heti Munkaidő (Óra)": row.hetiMunkaidoOra,
    "Állapot": row.allapotLabel,
    "Beküldés Dátuma": row.bekuldesDatuma || "-",
    "NAV Nyugta Csatolva": row.hasNyugta ? "Igen (Igazolva)" : "Nem",
  }))

  const ws = XLSX.utils.json_to_sheet(exportRows)

  ws["!cols"] = [
    { wch: 6 },  // Ssz
    { wch: 26 }, // Név
    { wch: 28 }, // Jelleg
    { wch: 6 },  // Kód
    { wch: 16 }, // Adóazonosító
    { wch: 14 }, // TAJ
    { wch: 20 }, // Részleg
    { wch: 24 }, // Munkakör
    { wch: 10 }, // FEOR
    { wch: 16 }, // Kezdet
    { wch: 16 }, // Vég
    { wch: 16 }, // Változás dátum
    { wch: 24 }, // Változás jelleg
    { wch: 18 }, // Heti óra
    { wch: 18 }, // Állapot
    { wch: 16 }, // Beküldés
    { wch: 20 }, // Nyugta
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "NAV_T1041_Bejelentesek")

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

  downloadBlob(blob, `NAV_T1041_Export_${yearMonth}.xlsx`)
  toast.success("NAV T1041 Excel (.xlsx) export sikeresen letöltve!")
}

/**
 * NAV T1041 Szabványos pontosvesszős CSV Export UTF-8 BOM-mal (Excel és ÁNYK kompatibilis)
 */
export function exportT1041ToCsv(data: T1041ReportRow[], yearMonth: string) {
  if (!data || data.length === 0) {
    toast.error("Nincs exportálható adat!")
    return
  }

  const headers = [
    "Ssz",
    "Biztosított Neve",
    "Bejelentés Kód",
    "Bejelentés Megnevezés",
    "Adóazonosító Jel",
    "TAJ Szám",
    "Munkakör",
    "FEOR Kód",
    "Jogviszony Kezdete",
    "Jogviszony Vége",
    "Heti Munkaidő Óra",
    "Állapot",
    "Beküldés Dátuma"
  ]

  const lines = data.map((r, i) => [
    i + 1,
    `"${r.biztositottNeve.replace(/"/g, '""')}"`,
    `"${r.bejelentesTipus}"`,
    `"${r.bejelentesTipusLabel}"`,
    `"${r.adoazonositoJel || ""}"`,
    `"${r.tajSzam || ""}"`,
    `"${(r.munkakor || "").replace(/"/g, '""')}"`,
    `"${r.feorKod || ""}"`,
    `"${r.jogviszonyKezdete || ""}"`,
    `"${r.jogviszonyVege || ""}"`,
    r.hetiMunkaidoOra,
    `"${r.allapotLabel}"`,
    `"${r.bekuldesDatuma || ""}"`
  ].join(";"))

  // \uFEFF az UTF-8 BOM, hogy a magyar Excel az ékezeteket helyesen, külön oszlopokba rendezve nyissa meg
  const csvContent = "\uFEFF" + [headers.join(";"), ...lines].join("\r\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })

  downloadBlob(blob, `NAV_T1041_Export_${yearMonth}.csv`)
  toast.success("T1041 CSV (UTF-8 BOM) export sikeresen letöltve!")
}

/**
 * NAV T1041 Adatok Vágólapra Másolása ÁNYK / ONYA űrlapkitöltéshez
 */
export function copyT1041ToClipboard(data: T1041ReportRow[]) {
  if (!data || data.length === 0) {
    toast.error("Nincs másolható adat!")
    return
  }

  const textBlocks = data.map((item, idx) => {
    return [
      `=== ${idx + 1}. Munkavállaló: ${item.biztositottNeve} (${item.bejelentesTipusLabel}) ===`,
      `Bejelentés Jellege (U/V/T): ${item.bejelentesTipus}`,
      `Biztosított Neve: ${item.biztositottNeve}`,
      `Adóazonosító Jel: ${item.adoazonositoJel || "Nincs rögzítve"}`,
      `TAJ Szám: ${item.tajSzam || "Nincs rögzítve"}`,
      `FEOR-08 Kód: ${item.feorKod || "Nincs rögzítve"}`,
      `Munkakör: ${item.munkakor || "Nincs rögzítve"}`,
      `Jogviszony Kezdete: ${item.jogviszonyKezdete || "Nincs megadva"}`,
      item.jogviszonyVege ? `Jogviszony Vége (Törlés): ${item.jogviszonyVege}` : null,
      item.valtozasDatuma ? `Változás Dátuma: ${item.valtozasDatuma}` : null,
      item.valtozasJellege ? `Változás Jellege: ${item.valtozasJellege}` : null,
      `Heti Munkaidő: ${item.hetiMunkaidoOra} óra/hét`,
      `Státusz: ${item.allapotLabel}`,
      `----------------------------------------------------`
    ].filter(Boolean).join("\n")
  })

  const fullText = `NAV T1041 Havi Bejelentési Csomag (${data.length} tétel)\n\n` + textBlocks.join("\n\n")

  navigator.clipboard.writeText(fullText)
  toast.success(`${data.length} dolgozó T1041 adatai vágólapra másolva ÁNYK / ONYA-hoz!`)
}

/**
 * KSH Havi Munkaügyi Jelentés Excel (.xlsx) Export
 */
export function exportKshToXlsx(data: KshReportData, yearMonth: string) {
  if (!data) {
    toast.error("Nincs exportálható KSH adat!")
    return
  }

  const wb = XLSX.utils.book_new()

  // 1. Lap: Főmutatók
  const summaryRows = [
    { "KSH Munkaügyi Indikátor": "Jelentési Időszak", "Kód": "-", "Érték": yearMonth, "Mértékegység": "hónap" },
    { "KSH Munkaügyi Indikátor": "Havi Záró Állományi Létszám", "Kód": "L_ZARO", "Érték": data.zaroLetszam, "Mértékegység": "fő" },
    { "KSH Munkaügyi Indikátor": "Átlagos Statisztikai Állományi Létszám (FTE)", "Kód": "L_STAT_FTE", "Érték": Number(data.atlagosFte.toFixed(2)), "Mértékegység": "FTE" },
    { "KSH Munkaügyi Indikátor": "Tárgyhónapban Belépők Száma", "Kód": "FLUK_BE", "Érték": data.belepettFo, "Mértékegység": "fő" },
    { "KSH Munkaügyi Indikátor": "Tárgyhónapban Kilépők Száma", "Kód": "FLUK_KI", "Érték": data.kilepettFo, "Mértékegység": "fő" },
    { "KSH Munkaügyi Indikátor": "Törvényes Munkaidő-alap (Havi Norma)", "Kód": "ORA_NORMA", "Érték": Number(data.normaMunkaora.toFixed(1)), "Mértékegység": "óra" },
    { "KSH Munkaügyi Indikátor": "Ténylegesen Teljesített Munkaórák (Tény)", "Kód": "ORA_OSSZES", "Érték": Number(data.osszesLedolgozottOra.toFixed(1)), "Mértékegység": "óra" },
    { "KSH Munkaügyi Indikátor": "Munkaidő-teljesítési Arány", "Kód": "TELJESITES_PCT", "Érték": `${Number(data.teljesitesiArany.toFixed(1))}%`, "Mértékegység": "%" },
    { "KSH Munkaügyi Indikátor": "Teljesített Rendes Munkaórák", "Kód": "ORA_RENDES", "Érték": Number(data.rendesMunkaora.toFixed(1)), "Mértékegység": "óra" },
    { "KSH Munkaügyi Indikátor": "Teljesített Túlórák Száma", "Kód": "ORA_TULORA", "Érték": Number(data.tulora.toFixed(1)), "Mértékegység": "óra" },
    { "KSH Munkaügyi Indikátor": "Fizetett Szabadság", "Kód": "TAV_SZAB_NAP", "Érték": data.szabadsagNap, "Mértékegység": "nap" },
    { "KSH Munkaügyi Indikátor": "Fizetett Szabadság Időtartama", "Kód": "TAV_SZAB_ORA", "Érték": Number(data.szabadsagOra.toFixed(1)), "Mértékegység": "óra" },
    { "KSH Munkaügyi Indikátor": "Betegszabadság (Munkáltatói)", "Kód": "TAV_BETEG_NAP", "Érték": data.betegszabadsagNap, "Mértékegység": "nap" },
    { "KSH Munkaügyi Indikátor": "Betegszabadság Időtartama", "Kód": "TAV_BETEG_ORA", "Érték": Number(data.betegszabadsagOra.toFixed(1)), "Mértékegység": "óra" },
    { "KSH Munkaügyi Indikátor": "Táppénzes Távollét", "Kód": "TAV_TAPPENZ_NAP", "Érték": data.tappenzNap, "Mértékegység": "nap" },
    { "KSH Munkaügyi Indikátor": "Egyéb Távollétek", "Kód": "TAV_EGYEB_NAP", "Érték": data.egyebTavolletNap, "Mértékegység": "nap" },
  ]

  const ws1 = XLSX.utils.json_to_sheet(summaryRows)
  ws1["!cols"] = [
    { wch: 38 }, // Indikátor
    { wch: 16 }, // Kód
    { wch: 14 }, // Érték
    { wch: 16 }, // Mértékegység
  ]
  XLSX.utils.book_append_sheet(wb, ws1, "KSH_Fomutatok")

  // 2. Lap: Részlegenkénti bontás
  if (data.reszlegek && data.reszlegek.length > 0) {
    const deptRows = data.reszlegek.map((r, i) => ({
      "Ssz.": i + 1,
      "Szervezeti Egység / Részleg": r.reszlegNev,
      "Aktív Létszám (fő)": r.aktivLetszam,
      "Átlagos Statisztikai Létszám (FTE)": Number(r.atlagosFte.toFixed(2)),
      "Törvényes Norma Munkaidő (óra)": Number(r.normaOra.toFixed(1)),
      "Ténylegesen Ledolgozott Munkaórák (óra)": Number(r.ledolgozottOra.toFixed(1)),
      "Kiesett Távolléti Órák (óra)": Number(r.tavolletOra.toFixed(1)),
    }))

    const ws2 = XLSX.utils.json_to_sheet(deptRows)
    ws2["!cols"] = [
      { wch: 6 },  // Ssz
      { wch: 30 }, // Részleg
      { wch: 18 }, // Létszám
      { wch: 30 }, // FTE
      { wch: 26 }, // Norma
      { wch: 28 }, // Ledolgozott
      { wch: 24 }, // Távollét
    ]
    XLSX.utils.book_append_sheet(wb, ws2, "Reszlegenkenti_Bontas")
  }

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

  downloadBlob(blob, `KSH_Munkaygyi_Jelentes_${yearMonth}.xlsx`)
  toast.success("KSH Munkaügyi Jelentés Excel (.xlsx) sikeresen letöltve!")
}

/**
 * Havi Bérszámfejtési Csomag Excel (.xlsx) Export
 */
export function exportPayrollToXlsx(data: PayrollReportRow[], yearMonth: string) {
  if (!data || data.length === 0) {
    toast.error("Nincs exportálható bérszámfejtési adat az adott hónapban!")
    return
  }

  const exportRows = data.map((r, i) => ({
    "Ssz.": i + 1,
    "Munkavállaló Neve": r.nev,
    "Adóazonosító Jel": r.adoazonosito || "-",
    "TAJ Szám": r.tajSzam || "-",
    "Szervezeti Egység": r.reszleg || "-",
    "Munkakör": r.munkakor || "-",
    "FEOR-08": r.feorKod || "-",
    "Heti Munkaidő (Óra)": r.hetiMunkaidoOra,
    "Bruttó Alapbér (Ft)": r.bruttoAlapber ? Number(r.bruttoAlapber) : "-",
    "Tervezett Munkanap": r.tervezettMunkanap,
    "Tervezett Munkaidő (Óra)": Number(r.tervezettMunkaora.toFixed(1)),
    "Ténylegesen Ledolgozott Munkanap": r.ledolgozottMunkanap,
    "Ténylegesen Ledolgozott Munkaidő (Óra)": Number(r.ledolgozottMunkaora.toFixed(1)),
    "Elszámolt Túlóra (Óra)": Number(r.tuloraOra.toFixed(1)),
    "Fizetett Szabadság (Nap)": r.szabadsagNap,
    "Betegszabadság (Nap)": r.betegszabadsagNap,
    "Táppénz (Nap)": r.tappenzNap,
    "Egyéb Távollét (Nap)": r.egyebTavolletNap,
    "Havi Cafeteria (Ft)": r.cafeteriaHaviBrutto,
    "Jelenléti Ív Állapota": r.zarasStatuszLabel,
  }))

  const ws = XLSX.utils.json_to_sheet(exportRows)

  ws["!cols"] = [
    { wch: 6 },  // Ssz
    { wch: 26 }, // Név
    { wch: 16 }, // Adójel
    { wch: 14 }, // TAJ
    { wch: 20 }, // Részleg
    { wch: 24 }, // Munkakör
    { wch: 10 }, // FEOR
    { wch: 18 }, // Heti óra
    { wch: 18 }, // Alapbér
    { wch: 18 }, // Terv nap
    { wch: 18 }, // Ledolgozott nap
    { wch: 22 }, // Ledolgozott óra
    { wch: 18 }, // Túlóra óra
    { wch: 20 }, // Szabadság nap
    { wch: 20 }, // Betegszabadság nap
    { wch: 16 }, // Táppénz nap
    { wch: 18 }, // Egyéb távollét nap
    { wch: 18 }, // Cafeteria
    { wch: 20 }, // Jelenlét állapot
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Havi_Berszamfejtes")

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

  downloadBlob(blob, `Berszamfejtesi_Csomag_${yearMonth}.xlsx`)
  toast.success("Bérszámfejtési Csomag Excel (.xlsx) sikeresen letöltve!")
}

/**
 * Egyéni Munkavállalói Bérszámfejtési és Jelenléti Összesítő Excel (.xlsx) Export
 */
export function exportSingleEmployeePayrollToXlsx(r: PayrollReportRow, yearMonth: string) {
  if (!r) {
    toast.error("Nincs exportálható dolgozói adat!")
    return
  }

  const wb = XLSX.utils.book_new()

  // 1. Lap: Munkavállaló havi elszámolási adatlapja (Key-Value formátum)
  const masterData = [
    { "Adat megnevezése": "Munkavállaló Neve", "Érték": r.nev },
    { "Adat megnevezése": "Elszámolási Időszak", "Érték": yearMonth },
    { "Adat megnevezése": "Adóazonosító Jel", "Érték": r.adoazonosito || "-" },
    { "Adat megnevezése": "TAJ Szám", "Érték": r.tajSzam || "-" },
    { "Adat megnevezése": "Szervezeti Egység / Részleg", "Érték": r.reszleg || "-" },
    { "Adat megnevezése": "Munkakör", "Érték": r.munkakor || "-" },
    { "Adat megnevezése": "FEOR-08 Kód", "Érték": r.feorKod || "-" },
    { "Adat megnevezése": "Heti Munkaidő", "Érték": `${r.hetiMunkaidoOra} óra/hét` },
    { "Adat megnevezése": "Bruttó Alapbér", "Érték": r.bruttoAlapber ? `${Number(r.bruttoAlapber).toLocaleString("hu-HU")} Ft` : "-" },
    { "Adat megnevezése": "--- Munkaidő és Jelenlét ---", "Érték": "------------------------------------" },
    { "Adat megnevezése": "Törvényes Munkanapok (Terv)", "Érték": `${r.tervezettMunkanap} munkanap` },
    { "Adat megnevezése": "Törvényes Munkaidő Norma (Terv)", "Érték": `${Number(r.tervezettMunkaora.toFixed(1))} óra` },
    { "Adat megnevezése": "Ténylegesen Ledolgozott Munkanap", "Érték": `${r.ledolgozottMunkanap} munkanap` },
    { "Adat megnevezése": "Ténylegesen Ledolgozott Munkaidő (Tény)", "Érték": `${Number(r.ledolgozottMunkaora.toFixed(1))} óra` },
    { "Adat megnevezése": "Elszámolt Túlóra", "Érték": `${Number(r.tuloraOra.toFixed(1))} óra` },
    { "Adat megnevezése": "--- Távollétek és Szabadság ---", "Érték": "------------------------------------" },
    { "Adat megnevezése": "Fizetett Szabadság", "Érték": `${r.szabadsagNap} nap` },
    { "Adat megnevezése": "Betegszabadság (Munkáltatói teher)", "Érték": `${r.betegszabadsagNap} nap` },
    { "Adat megnevezése": "Táppénz (TB teher)", "Érték": `${r.tappenzNap} nap` },
    { "Adat megnevezése": "Egyéb Igazolt Távollét", "Érték": `${r.egyebTavolletNap} nap` },
    { "Adat megnevezése": "--- Egyéb Juttatás és Zárás ---", "Érték": "------------------------------------" },
    { "Adat megnevezése": "Havi Igényelt Cafeteria (Bruttó)", "Érték": r.cafeteriaHaviBrutto > 0 ? `${r.cafeteriaHaviBrutto.toLocaleString("hu-HU")} Ft` : "0 Ft" },
    { "Adat megnevezése": "Jelenléti Ív Havi Zárási Státusza", "Érték": r.zarasStatuszLabel },
  ]

  const wsMaster = XLSX.utils.json_to_sheet(masterData)
  wsMaster["!cols"] = [{ wch: 38 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, wsMaster, "Dolgozoi_Adatlap")

  // 2. Lap: Bérprogram-kompatibilis egysoros adatsor
  const singleRow = [{
    "Munkavállaló Neve": r.nev,
    "Időszak": yearMonth,
    "Adóazonosító Jel": r.adoazonosito || "-",
    "TAJ Szám": r.tajSzam || "-",
    "Szervezeti Egység": r.reszleg || "-",
    "Munkakör": r.munkakor || "-",
    "FEOR-08": r.feorKod || "-",
    "Heti Munkaidő (Óra)": r.hetiMunkaidoOra,
    "Bruttó Alapbér (Ft)": r.bruttoAlapber ? Number(r.bruttoAlapber) : "-",
    "Tervezett Munkanap": r.tervezettMunkanap,
    "Tervezett Munkaidő (Óra)": Number(r.tervezettMunkaora.toFixed(1)),
    "Ténylegesen Ledolgozott Munkanap": r.ledolgozottMunkanap,
    "Ténylegesen Ledolgozott Munkaidő (Óra)": Number(r.ledolgozottMunkaora.toFixed(1)),
    "Elszámolt Túlóra (Óra)": Number(r.tuloraOra.toFixed(1)),
    "Fizetett Szabadság (Nap)": r.szabadsagNap,
    "Betegszabadság (Nap)": r.betegszabadsagNap,
    "Táppénz (Nap)": r.tappenzNap,
    "Egyéb Távollét (Nap)": r.egyebTavolletNap,
    "Havi Cafeteria (Ft)": r.cafeteriaHaviBrutto,
    "Jelenléti Ív Állapota": r.zarasStatuszLabel,
  }]
  const wsRow = XLSX.utils.json_to_sheet(singleRow)
  XLSX.utils.book_append_sheet(wb, wsRow, "Berszamfejtesi_Sor")

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

  const safeName = r.nev.replace(/[^a-zA-Z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ_-]/g, "_")
  downloadBlob(blob, `Berszamfejtes_${safeName}_${yearMonth}.xlsx`)
  toast.success(`${r.nev} egyéni bérszámfejtési exportja (.xlsx) sikeresen letöltve!`)
}

/**
 * Havi / Éves Cafeteria Részletező Excel (.xlsx) Export
 */
export function exportCafeteriaToXlsx(data: Record<string, any>[], year: number) {
  if (!data || data.length === 0) {
    toast.error("Nincs exportálható cafeteria adat az adott évben!")
    return
  }

  const ws = XLSX.utils.json_to_sheet(data)
  ws["!cols"] = [
    { wch: 26 }, // Név
    { wch: 16 }, // Adóazonosító
    { wch: 22 }, // SZÉP Szállás
    { wch: 24 }, // SZÉP Vendéglátás
    { wch: 22 }, // SZÉP Szabadidő
    { wch: 18 }, // Egészségpénztár
    { wch: 16 }, // Helyi bérlet
    { wch: 16 }, // Egyéb
    { wch: 20 }, // Összes
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `Cafeteria_${year}`)

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

  downloadBlob(blob, `Cafeteria_Export_${year}.xlsx`)
  toast.success("Cafeteria Részletező Excel (.xlsx) sikeresen letöltve!")
}
