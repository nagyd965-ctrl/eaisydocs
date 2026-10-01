import { SupabaseClient } from "@supabase/supabase-js"
import { getMonthlyTimesheet } from "@/app/hr/attendance-actions"
import { calculateMonthlyTimesheet } from "@/utils/hr/timesheet-calculator"
import { launchPdfBrowser } from "@/utils/pdf-browser"

const MONTH_NAMES = [
  "Január", "Február", "Március", "Április", "Május", "Június",
  "Július", "Augusztus", "Szeptember", "Október", "November", "December"
]

const DAY_NAMES = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"]

export async function generateTimesheetHtml(
  supabase: SupabaseClient,
  employeeId: string,
  year: number,
  month: number
): Promise<{ html: string; employeeName: string; monthName: string }> {
  // 1. Dolgozó profil adatok
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("id, nev")
    .eq("id", employeeId)
    .single()

  const employeeName = profile?.nev || "Munkavállaló"
  const monthName = MONTH_NAMES[month - 1]

  // 2. Beosztás és munkakör adatok
  const { data: jogviszony } = await supabase
    .from("hr_jogviszony")
    .select(`
      id,
      belepes_datuma,
      hr_beosztas (
        fte,
        munkaido_fte,
        munkarend,
        hr_munkakor ( megnevezes, feor_kod )
      )
    `)
    .eq("dolgozo_id", employeeId)
    .is("kilepes_datuma", null)
    .order("belepes_datuma", { ascending: false })
    .limit(1)
    .maybeSingle()

  const currentBeosztas = (jogviszony?.hr_beosztas as any)?.[0]
  const munkakorNev = currentBeosztas?.hr_munkakor?.megnevezes || "Általános munkakör"
  const feorKod = currentBeosztas?.hr_munkakor?.feor_kod ? `FEOR: ${currentBeosztas.hr_munkakor.feor_kod}` : ""
  const fte = currentBeosztas?.munkaido_fte ?? currentBeosztas?.fte ?? 1.0
  const napiMunkaido = (8 * fte).toFixed(1)

  // 3. Jelenléti adatok lekérése
  const { data: timesheetEntries } = await getMonthlyTimesheet(employeeId, year, month)
  const entries = timesheetEntries || []

  // 4. Havi számítások
  const timesheetInput = entries.map(t => ({
    date: t.datum,
    type: t.type,
    checkIn: t.becsekkolas_ideje,
    checkOut: t.kicsekkolas_ideje
  }))

  const { calculatedDays, totalActual, totalBalance } = calculateMonthlyTimesheet(timesheetInput, 8.0, fte)

  // 5. Zárási adatok (ki és mikor hagyta jóvá)
  const { data: closing } = await supabase
    .from("hr_havi_jelenlet_zaras")
    .select("*, felhasznalo_profil:jovahagyo_vezeto_id(nev)")
    .eq("dolgozo_id", employeeId)
    .eq("ev", year)
    .eq("honap", month)
    .maybeSingle()

  const jovahagyoNev = (closing?.felhasznalo_profil as any)?.nev || "Közvetlen Vezető / HR"
  const jovahagyasDatuma = closing?.jovahagyva_at 
    ? new Date(closing.jovahagyva_at).toLocaleDateString("hu-HU") 
    : new Date().toLocaleDateString("hu-HU")

  // Összesítő statisztikák
  let munkanapokSzama = 0
  let szabadsagNapok = 0
  let betegsegNapok = 0
  let unnepNapok = 0

  entries.forEach(e => {
    if (e.type === "munka") munkanapokSzama++
    if (e.type === "szabadsag") szabadsagNapok++
    if (e.type === "betegseg") betegsegNapok++
    if (e.type === "unnep") unnepNapok++
  })

  // Táblázat sorok összeállítása
  const rowsHtml = entries.map((entry, idx) => {
    const d = new Date(entry.datum)
    const dayNum = String(d.getUTCDate()).padStart(2, "0")
    const dayOfWeek = DAY_NAMES[d.getUTCDay()]
    const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6

    const calcDay = calculatedDays.find(c => c.date === entry.datum)
    const hoursWorked = calcDay?.actualHours ? calcDay.actualHours.toFixed(1) : "-"

    let checkIn = "-"
    let checkOut = "-"
    if (entry.becsekkolas_ideje) {
      const cin = new Date(entry.becsekkolas_ideje)
      checkIn = `${String(cin.getHours()).padStart(2, "0")}:${String(cin.getMinutes()).padStart(2, "0")}`
    }
    if (entry.kicsekkolas_ideje) {
      const cout = new Date(entry.kicsekkolas_ideje)
      checkOut = `${String(cout.getHours()).padStart(2, "0")}:${String(cout.getMinutes()).padStart(2, "0")}`
    }

    let typeBadge = "Munkanap"
    let rowBg = "#ffffff"
    let textColor = "#1e293b"

    if (entry.type === "szabadsag") {
      typeBadge = "Fizetett Szabadság"
      rowBg = "#f0fdf4"
      textColor = "#166534"
    } else if (entry.type === "betegseg") {
      typeBadge = "Betegszabadság / Táppénz"
      rowBg = "#fef2f2"
      textColor = "#991b1b"
    } else if (entry.type === "unnep") {
      typeBadge = entry.note || "Munkaszüneti nap"
      rowBg = "#f0fdfa"
      textColor = "#0f766e"
    } else if (isWeekend) {
      typeBadge = "Hétvégi pihenőnap"
      rowBg = "#f8fafc"
      textColor = "#64748b"
    }

    return `
      <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 4px 8px; font-weight: 600; text-align: center; border-right: 1px solid #e2e8f0;">${dayNum}.</td>
        <td style="padding: 4px 8px; border-right: 1px solid #e2e8f0; color: ${textColor};">${dayOfWeek}</td>
        <td style="padding: 4px 8px; border-right: 1px solid #e2e8f0; font-weight: 500; color: ${textColor};">${typeBadge}</td>
        <td style="padding: 4px 8px; text-align: center; border-right: 1px solid #e2e8f0; font-family: monospace;">${checkIn}</td>
        <td style="padding: 4px 8px; text-align: center; border-right: 1px solid #e2e8f0; font-family: monospace;">${checkOut}</td>
        <td style="padding: 4px 8px; text-align: right; font-weight: 600; border-right: 1px solid #e2e8f0;">${hoursWorked !== "-" ? hoursWorked + " h" : "—"}</td>
        <td style="padding: 4px 8px; color: #64748b; font-size: 10px;">${entry.note || ""}</td>
      </tr>
    `
  }).join("")

  const html = `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Havi Jelenléti Ív - ${employeeName} - ${year}. ${monthName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.35;
      margin: 0;
      padding: 0;
      font-size: 11px;
    }
    .header {
      border-bottom: 2px solid #0f766e;
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header-left h1 {
      font-size: 16px;
      font-weight: 700;
      color: #0f766e;
      margin: 0 0 2px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-left p {
      font-size: 9.5px;
      color: #64748b;
      margin: 0;
    }
    .header-right {
      text-align: right;
    }
    .header-right .period {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 12px;
    }
    .info-item .label {
      font-size: 8.5px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
      display: block;
    }
    .info-item .val {
      font-size: 11px;
      font-weight: 600;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      margin-bottom: 12px;
    }
    th {
      background-color: #0f766e;
      color: #ffffff;
      padding: 5px 8px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 1px solid #0f766e;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .summary-card {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 10px;
      text-align: center;
    }
    .summary-card .lbl {
      font-size: 8.5px;
      color: #475569;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .summary-card .num {
      font-size: 13px;
      font-weight: 700;
      color: #0f766e;
    }
    .legal-notice {
      font-size: 8.5px;
      color: #64748b;
      text-align: justify;
      margin-bottom: 20px;
      line-height: 1.3;
      border-left: 3px solid #0f766e;
      padding-left: 8px;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 15px;
      page-break-inside: avoid;
    }
    .sig-col {
      text-align: center;
    }
    .sig-line {
      border-top: 1px dotted #475569;
      margin-top: 30px;
      padding-top: 4px;
      font-size: 10px;
      color: #334155;
    }
    .footer {
      margin-top: 12px;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      color: #94a3b8;
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="header-left">
      <h1>Hivatalos Havi Jelenléti Ív</h1>
      <p>eaisyDocs Zrt. • Munka Törvénykönyve (Mt. 99–106. §) szerinti munkaidő-nyilvántartás</p>
    </div>
    <div class="header-right">
      <div class="period">${year}. ${monthName}</div>
      <p style="font-size: 8.5px; color: #64748b; margin-top: 2px;">Kiállítás / Lezárás dátuma: ${jovahagyasDatuma}</p>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-item">
      <span class="label">Munkavállaló neve</span>
      <span class="val">${employeeName}</span>
    </div>
    <div class="info-item">
      <span class="label">Munkakör / Beosztás</span>
      <span class="val">${munkakorNev}</span>
    </div>
    <div class="info-item">
      <span class="label">Napi Munkaidő / FTE</span>
      <span class="val">${napiMunkaido} óra / nap (FTE: ${fte})</span>
    </div>
    <div class="info-item">
      <span class="label">Jóváhagyó vezető</span>
      <span class="val">${jovahagyoNev}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 40px;">Nap</th>
        <th style="width: 90px; text-align: left;">Nap neve</th>
        <th style="text-align: left;">Munkaidő jellege / Jogcím</th>
        <th style="width: 65px; text-align: center;">Érkezés</th>
        <th style="width: 65px; text-align: center;">Távozás</th>
        <th style="width: 70px; text-align: right;">Ledolgozott</th>
        <th style="width: 140px; text-align: left;">Megjegyzés</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="lbl">Ledolgozott órák</div>
      <div class="num">${totalActual.toFixed(1)} óra</div>
    </div>
    <div class="summary-card">
      <div class="lbl">Ledolgozott munkanap</div>
      <div class="num">${munkanapokSzama} nap</div>
    </div>
    <div class="summary-card">
      <div class="lbl">Fizetett szabadság</div>
      <div class="num">${szabadsagNapok} nap</div>
    </div>
    <div class="summary-card">
      <div class="lbl">Betegszabadság / Táp.</div>
      <div class="num">${betegsegNapok} nap</div>
    </div>
    <div class="summary-card">
      <div class="lbl">Időszaki Egyenleg</div>
      <div class="num" style="color: ${totalBalance >= 0 ? '#0f766e' : '#b91c1c'};">${totalBalance >= 0 ? '+' : ''}${totalBalance.toFixed(1)} óra</div>
    </div>
  </div>

  <div class="legal-notice">
    A jelen munkaidő-nyilvántartás a Munka Törvénykönyvéről szóló 2012. évi I. törvény 99. § (2) bekezdése és 134. §-a alapján hitelesen igazolja a munkavállaló rendes és rendkívüli munkaidejének, valamint a pihenőidők és távollétek tartamának pontos elszámolását.
  </div>

  <div class="signatures">
    <div class="sig-col">
      <div class="sig-line">
        <strong>${employeeName}</strong><br>
        Munkavállaló aláírása
      </div>
    </div>
    <div class="sig-col">
      <div class="sig-line">
        <strong>${jovahagyoNev}</strong><br>
        Közvetlen felettes vezető / Munkáltatói jogkörgyakorló
      </div>
    </div>
  </div>

  <div class="footer">
    <span>eaisyDocs & eaisyHR • Elektronikus Munkaügyi Nyilvántartás</span>
    <span>Irattári tétel: 3.2 - Munkaidő nyilvántartások • Megőrzési idő: 5 év</span>
  </div>

</body>
</html>`

  return { html, employeeName, monthName }
}

export async function generateTimesheetPdfBuffer(
  supabase: SupabaseClient,
  employeeId: string,
  year: number,
  month: number
): Promise<{ buffer: Buffer; employeeName: string; monthName: string }> {
  const { html, employeeName, monthName } = await generateTimesheetHtml(supabase, employeeId, year, month)

  const browser = await launchPdfBrowser()
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: "load" })
  
  const pdfArray = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "10mm",
      right: "12mm",
      bottom: "10mm",
      left: "12mm"
    }
  })

  await browser.close()

  return {
    buffer: Buffer.from(pdfArray),
    employeeName,
    monthName
  }
}
