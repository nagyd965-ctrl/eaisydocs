import { SupabaseClient } from "@supabase/supabase-js"
import { getAnnualLeaveBreakdown } from "@/utils/hr/leave-calculator"
import { calculateWorkingDays } from "@/utils/hr/leave-calculator"
import { launchPdfBrowser } from "@/utils/pdf-browser"

const TIPUS_LABELS: Record<string, string> = {
  szabadsag: "Rendes szabadság",
  beteg: "Betegszabadság",
  betegseg: "Betegszabadság",
  fizetetlen: "Fizetetlen szabadság",
  fizetett_szabadsag: "Fizetett szabadság",
  fizetetlen_szabadsag: "Fizetetlen szabadság",
  rendkivuli: "Rendkívüli távollét",
  home_office: "Home Office",
  apasan: "Apasági szabadság",
  tanulmanyi: "Tanulmányi szabadság",
  egyeb: "Egyéb távollét",
}

const STATUS_LABELS: Record<string, string> = {
  jovahagyva: "Jóváhagyva",
  jovahagyasra_var: "Folyamatban",
  elutasitva: "Elutasítva",
  tervezet: "Tervezet",
}

export interface AnnualLeaveData {
  employeeId: string
  employeeName: string
  year: number
  munkakor: string
  feorKod: string
  belepesDatuma: string
  vezetoNev: string
  breakdown: {
    baseLeave: number
    age: number
    ageExtra: number
    childrenCount: number
    childrenExtra: number
    isVulnerable: boolean
    vulnerableExtra: number
    totalLeave: number
  }
  leaves: Array<{
    id: string
    tipus: string
    kezdet: string
    veg: string
    munkanapok: number
    jovahagyo: string
    statusz: string
    egyenleg: number
  }>
  summary: {
    totalLeave: number
    usedLeave: number
    remainingLeave: number
    plannedLeave: number
    otherDays: number
  }
}

export async function fetchAnnualLeaveData(
  supabase: SupabaseClient,
  employeeId: string,
  year: number
): Promise<AnnualLeaveData> {
  // 1. Dolgozó profil
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("id, nev")
    .eq("id", employeeId)
    .single()

  const employeeName = profile?.nev || "Munkavállaló"

  // 2. Dolgozó adatlap (születési dátum, gyermekek száma, stb.)
  const { data: adatlap } = await supabase
    .from("hr_dolgozo_adatlap")
    .select("*")
    .eq("id", employeeId)
    .maybeSingle()

  // 3. Beosztás és jogviszony
  const { data: jogviszony } = await supabase
    .from("hr_jogviszony")
    .select(`
      id,
      belepes_datuma,
      hr_beosztas (
        munkarend,
        hr_munkakor ( megnevezes, feor_kod )
      )
    `)
    .eq("dolgozo_id", employeeId)
    .is("kilepes_datuma", null)
    .order("belepes_datuma", { ascending: false })
    .limit(1)
    .maybeSingle()

  const beosztas = (jogviszony?.hr_beosztas as any)?.[0]
  const munkakor = beosztas?.hr_munkakor?.megnevezes || "Általános munkakör"
  const feorKod = beosztas?.hr_munkakor?.feor_kod ? `FEOR: ${beosztas.hr_munkakor.feor_kod}` : ""
  const belepesDatuma = jogviszony?.belepes_datuma
    ? new Date(jogviszony.belepes_datuma).toLocaleDateString("hu-HU")
    : "—"

  // Vezető megkeresése
  let vezetoNev = "—"
  try {
    const { data: teamMember } = await supabase
      .from("hr_szervezeti_egyseg_tag")
      .select(`
        egyseg_id,
        hr_szervezeti_egyseg (
          vezeto_id,
          felhasznalo_profil!hr_szervezeti_egyseg_vezeto_id_fkey ( nev )
        )
      `)
      .eq("dolgozo_id", employeeId)
      .maybeSingle()

    const vNev = (teamMember as any)?.hr_szervezeti_egyseg?.felhasznalo_profil?.nev
    if (vNev) vezetoNev = vNev
  } catch {
    // optional
  }

  // 4. Szabadságkalkuláció levezetése
  const breakdown = getAnnualLeaveBreakdown(
    adatlap?.szuletesi_datum,
    adatlap?.gyermekek_szama || 0,
    Boolean(adatlap?.megvaltozott_munkakepessegu),
    year
  )

  // 5. Ünnepnapok lekérése
  let unnepnapok: string[] = []
  try {
    const { data: unnepData } = await supabase
      .from("hr_munkaszuneti_nap")
      .select("datum")
      .gte("datum", `${year}-01-01`)
      .lte("datum", `${year}-12-31`)
    if (unnepData) {
      unnepnapok = unnepData.map((u: any) => u.datum)
    }
  } catch {
    // optional
  }

  // 6. Tárgyévi távollétek lekérése
  const { data: rawLeaves } = await supabase
    .from("hr_tavollet")
    .select("id, tipus, kezdet_datuma, veg_datuma, statusz, jovahagyo_id, created_at")
    .eq("dolgozo_id", employeeId)
    .gte("kezdet_datuma", `${year}-01-01`)
    .lte("kezdet_datuma", `${year}-12-31`)
    .order("kezdet_datuma", { ascending: true })

  const leavesList = rawLeaves || []

  // Jóváhagyók profilneveinek lekérése
  const approverIds = Array.from(new Set(leavesList.map(l => l.jovahagyo_id).filter(Boolean))) as string[]
  const approverMap: Record<string, string> = {}
  if (approverIds.length > 0) {
    const { data: approvers } = await supabase
      .from("felhasznalo_profil")
      .select("id, nev")
      .in("id", approverIds)
    if (approvers) {
      approvers.forEach(a => {
        approverMap[a.id] = a.nev
      })
    }
  }

  // Időrendi egyenleg levezetése
  let currentBalance = breakdown.totalLeave
  let usedLeave = 0
  let plannedLeave = 0
  let otherDays = 0

  const leaves = leavesList.map(item => {
    const workDays = calculateWorkingDays(item.kezdet_datuma, item.veg_datuma, unnepnapok)
    const isApproved = item.statusz === "jovahagyva"
    const isPlanned = item.statusz === "jovahagyasra_var" || item.statusz === "tervezet"
    const isAnnualLeave = item.tipus === "szabadsag" || item.tipus === "fizetett_szabadsag"

    if (isAnnualLeave) {
      if (isApproved) {
        usedLeave += workDays
        currentBalance -= workDays
      } else if (isPlanned) {
        plannedLeave += workDays
      }
    } else {
      if (isApproved) {
        otherDays += workDays
      }
    }

    return {
      id: item.id,
      tipus: TIPUS_LABELS[item.tipus] || item.tipus,
      kezdet: new Date(item.kezdet_datuma).toLocaleDateString("hu-HU"),
      veg: new Date(item.veg_datuma).toLocaleDateString("hu-HU"),
      munkanapok: workDays,
      jovahagyo: item.jovahagyo_id ? (approverMap[item.jovahagyo_id] || "Vezető") : "—",
      statusz: STATUS_LABELS[item.statusz] || item.statusz,
      egyenleg: currentBalance,
    }
  })

  const remainingLeave = breakdown.totalLeave - usedLeave

  return {
    employeeId,
    employeeName,
    year,
    munkakor,
    feorKod,
    belepesDatuma,
    vezetoNev,
    breakdown,
    leaves,
    summary: {
      totalLeave: breakdown.totalLeave,
      usedLeave,
      remainingLeave,
      plannedLeave,
      otherDays,
    },
  }
}

export function generateAnnualLeaveHtml(data: AnnualLeaveData): string {
  const currentDate = new Date().toLocaleDateString("hu-HU")

  return `
    <!DOCTYPE html>
    <html lang="hu">
    <head>
      <meta charset="UTF-8">
      <title>Éves Szabadság Nyilvántartó Lap - ${data.employeeName} (${data.year})</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm 15mm 15mm 15mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1e293b;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 11px;
          line-height: 1.4;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f766e;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .header-title h1 {
          font-size: 18px;
          font-weight: 700;
          color: #0f766e;
          margin: 0 0 4px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .header-title .law-ref {
          font-size: 9.5px;
          color: #64748b;
          font-style: italic;
        }
        .header-badge {
          text-align: right;
        }
        .header-badge .brand {
          font-size: 14px;
          font-weight: 700;
          color: #0f766e;
          display: block;
        }
        .header-badge .sub {
          font-size: 9px;
          color: #94a3b8;
        }
        .header-badge .year-badge {
          display: inline-block;
          background: #0f766e;
          color: #ffffff;
          padding: 3px 10px;
          border-radius: 4px;
          font-weight: 700;
          font-size: 12px;
          margin-top: 4px;
        }

        /* 2 oszlopos törzs és munkáltató adatok */
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        .info-card {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 12px;
          background: #f8fafc;
        }
        .info-card h3 {
          font-size: 11px;
          font-weight: 700;
          color: #334155;
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 4px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 2px 0;
          font-size: 10.5px;
        }
        .info-row .label {
          color: #64748b;
        }
        .info-row .val {
          font-weight: 600;
          color: #0f172a;
        }

        /* Jogszabályi keret levezetése */
        .section-title {
          font-size: 12px;
          font-weight: 700;
          color: #0f766e;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 14px 0 6px 0;
          border-left: 3px solid #0f766e;
          padding-left: 6px;
        }

        .breakdown-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        .breakdown-table th, .breakdown-table td {
          border: 1px solid #e2e8f0;
          padding: 6px 10px;
          font-size: 10.5px;
        }
        .breakdown-table th {
          background: #f1f5f9;
          font-weight: 600;
          color: #475569;
          text-align: left;
        }
        .breakdown-table .num {
          text-align: right;
          font-variant-numeric: tabular-nums;
          font-weight: 600;
        }
        .breakdown-table .total-row {
          background: #f0fdfa;
          font-weight: 700;
          color: #0f766e;
          border-top: 2px solid #0f766e;
        }
        .breakdown-table .total-row td {
          font-size: 11.5px;
        }

        /* Távolléti lista táblázat */
        .leaves-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
        }
        .leaves-table th, .leaves-table td {
          border: 1px solid #cbd5e1;
          padding: 5px 8px;
          font-size: 10px;
        }
        .leaves-table th {
          background: #0f766e;
          color: #ffffff;
          font-weight: 600;
          text-align: left;
        }
        .leaves-table .text-center {
          text-align: center;
        }
        .leaves-table .text-right {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .leaves-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }
        .status-badge {
          display: inline-block;
          padding: 1px 6px;
          border-radius: 3px;
          font-size: 9px;
          font-weight: 600;
        }
        .status-jovahagyva {
          background: #dcfce7;
          color: #15803d;
        }
        .status-folyamatban {
          background: #fef3c7;
          color: #b45309;
        }

        /* Összesítő sáv */
        .summary-banner {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 10px;
          margin-bottom: 20px;
          text-align: center;
        }
        .summary-item .s-label {
          font-size: 9.5px;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .summary-item .s-val {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          font-variant-numeric: tabular-nums;
        }
        .summary-item.highlight .s-val {
          color: #0f766e;
        }

        /* Aláírás */
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 36px;
          padding-top: 10px;
        }
        .sig-box {
          width: 42%;
          text-align: center;
        }
        .sig-line {
          border-top: 1px dashed #64748b;
          margin-top: 40px;
          padding-top: 6px;
          font-size: 10px;
          color: #334155;
          font-weight: 600;
        }
        .sig-sub {
          font-size: 8.5px;
          color: #94a3b8;
          margin-top: 2px;
        }

        /* Lábléc */
        .footer {
          margin-top: 25px;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
          font-size: 8.5px;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-title">
          <h1>Éves Szabadság- és Távollét Nyilvántartás</h1>
          <div class="law-ref">A munka törvénykönyvéről szóló 2012. évi I. törvény (Mt.) 134. § (1) bekezdése alapján</div>
        </div>
        <div class="header-badge">
          <span class="brand">eaisyDocs Zrt.</span>
          <span class="sub">eaisyHR Emberi Erőforrás Modul</span>
          <div class="year-badge">${data.year}. ÉV</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="info-card">
          <h3>Munkavállaló Adatai</h3>
          <div class="info-row">
            <span class="label">Név:</span>
            <span class="val">${data.employeeName}</span>
          </div>
          <div class="info-row">
            <span class="label">Munkakör:</span>
            <span class="val">${data.munkakor} ${data.feorKod ? `(${data.feorKod})` : ""}</span>
          </div>
          <div class="info-row">
            <span class="label">Munkaviszony kezdete:</span>
            <span class="val">${data.belepesDatuma}</span>
          </div>
          <div class="info-row">
            <span class="label">Közvetlen vezető:</span>
            <span class="val">${data.vezetoNev}</span>
          </div>
        </div>

        <div class="info-card">
          <h3>Munkáltató & Nyilvántartás Adatai</h3>
          <div class="info-row">
            <span class="label">Munkáltató:</span>
            <span class="val">eaisyDocs Zrt.</span>
          </div>
          <div class="info-row">
            <span class="label">Adószám:</span>
            <span class="val">12345678-2-41</span>
          </div>
          <div class="info-row">
            <span class="label">Székhely:</span>
            <span class="val">1111 Budapest, Példa utca 1.</span>
          </div>
          <div class="info-row">
            <span class="label">Kiállítás dátuma:</span>
            <span class="val">${currentDate}</span>
          </div>
        </div>
      </div>

      <div class="section-title">I. Törvényes Szabadságkeret Megállapítása (${data.year})</div>
      <table class="breakdown-table">
        <thead>
          <tr>
            <th>Jogcím</th>
            <th>Jogszabályi Hivatkozás</th>
            <th>Megállapítás alapja</th>
            <th class="num">Mérték</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Alapszabadság</strong></td>
            <td>Mt. 116. §</td>
            <td>Minden munkavállalót megillető alaptétel</td>
            <td class="num">${data.breakdown.baseLeave} nap</td>
          </tr>
          <tr>
            <td><strong>Életkor szerinti pótszabadság</strong></td>
            <td>Mt. 117. §</td>
            <td>Betöltött életkor: ${data.breakdown.age ? `${data.breakdown.age} év` : "—"}</td>
            <td class="num">+${data.breakdown.ageExtra} nap</td>
          </tr>
          <tr>
            <td><strong>Gyermekek után járó pótszabadság</strong></td>
            <td>Mt. 118. §</td>
            <td>16 évesnél fiatalabb gyermekek száma: ${data.breakdown.childrenCount} fő</td>
            <td class="num">+${data.breakdown.childrenExtra} nap</td>
          </tr>
          <tr>
            <td><strong>Megváltozott munkaképességű pótszabadság</strong></td>
            <td>Mt. 120. §</td>
            <td>${data.breakdown.isVulnerable ? "Megváltozott munkaképesség igazolva" : "Nem releváns"}</td>
            <td class="num">+${data.breakdown.vulnerableExtra} nap</td>
          </tr>
          <tr class="total-row">
            <td colspan="3"><strong>Mindösszesen megállapított tárgyévi szabadságkeret:</strong></td>
            <td class="num"><strong>${data.breakdown.totalLeave} nap</strong></td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">II. Tárgyévi Távollétek és Szabadságok Kronologikus Naplója</div>
      <table class="leaves-table">
        <thead>
          <tr>
            <th style="width: 30px;" class="text-center">#</th>
            <th>Távollét Jogcíme</th>
            <th style="width: 85px;" class="text-center">Kezdete</th>
            <th style="width: 85px;" class="text-center">Vége</th>
            <th style="width: 70px;" class="text-right">Munkanap</th>
            <th style="width: 110px;">Jóváhagyó</th>
            <th style="width: 80px;" class="text-center">Státusz</th>
            <th style="width: 90px;" class="text-right">Fennmaradó</th>
          </tr>
        </thead>
        <tbody>
          ${data.leaves.length === 0 ? `
            <tr>
              <td colspan="8" style="text-align: center; padding: 16px; color: #64748b; font-style: italic;">
                A(z) ${data.year}. évben eddig még nem történt távolléti vagy szabadság igénylés.
              </td>
            </tr>
          ` : data.leaves.map((l, idx) => `
            <tr>
              <td class="text-center">${idx + 1}.</td>
              <td><strong>${l.tipus}</strong></td>
              <td class="text-center">${l.kezdet}</td>
              <td class="text-center">${l.veg}</td>
              <td class="text-right">${l.munkanapok} nap</td>
              <td>${l.jovahagyo}</td>
              <td class="text-center">
                <span class="status-badge ${l.statusz === "Jóváhagyva" ? "status-jovahagyva" : "status-folyamatban"}">
                  ${l.statusz}
                </span>
              </td>
              <td class="text-right"><strong>${l.egyenleg} nap</strong></td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div class="section-title">III. Éves Összesítő és Egyenlegzárás</div>
      <div class="summary-banner">
        <div class="summary-item">
          <div class="s-label">Törvényes Keret</div>
          <div class="s-val">${data.summary.totalLeave} nap</div>
        </div>
        <div class="summary-item highlight">
          <div class="s-label">Igénybe Vett Szabadság</div>
          <div class="s-val">${data.summary.usedLeave} nap</div>
        </div>
        <div class="summary-item highlight">
          <div class="s-label">Fennmaradó Keret</div>
          <div class="s-val">${data.summary.remainingLeave} nap</div>
        </div>
        <div class="summary-item">
          <div class="s-label">Egyéb Távollétek (pl. Beteg)</div>
          <div class="s-val">${data.summary.otherDays} nap</div>
        </div>
      </div>

      <div class="signatures">
        <div class="sig-box">
          <div class="sig-line">Munkáltató képviselője (HR / Igazgató)</div>
          <div class="sig-sub">A nyilvántartás hitelességét igazolom</div>
        </div>
        <div class="sig-box">
          <div class="sig-line">${data.employeeName} (Munkavállaló)</div>
          <div class="sig-sub">A nyilvántartás tartalmát megismertem és elfogadom</div>
        </div>
      </div>

      <div class="footer">
        <span>Készült az eaisyDocs & eaisyHR integrált munkaügyi és iratkezelő platformon.</span>
        <span>Azonosító: HR-LEAVE-${data.year}-${data.employeeId.slice(0, 8)} | Generálva: ${currentDate}</span>
      </div>
    </body>
    </html>
  `
}

export async function generateAnnualLeavePdfBuffer(
  supabase: SupabaseClient,
  employeeId: string,
  year: number
): Promise<{ buffer: Buffer; employeeName: string; year: number }> {
  const data = await fetchAnnualLeaveData(supabase, employeeId, year)
  const html = generateAnnualLeaveHtml(data)

  const browser = await launchPdfBrowser()
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: "networkidle0" as any })
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
  })
  await browser.close()

  return {
    buffer: Buffer.from(pdfBuffer),
    employeeName: data.employeeName,
    year,
  }
}
