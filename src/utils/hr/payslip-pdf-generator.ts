import { formatHufCurrency, MONTH_NAMES_HU, getMonthNameHu } from "./payslip-calculator"

export { MONTH_NAMES_HU, getMonthNameHu }

export interface PayslipPdfData {
  // Időszak
  ev: number
  honap: number
  honapNev: string

  // Munkáltató
  munkaltatoNev: string
  munkaltatoCim: string
  munkaltatoAdoszam: string

  // Dolgozó
  dolgozoNev: string
  adoazonosito: string
  tajSzam: string
  munkakor: string
  feorKod?: string
  reszleg: string
  bankszamlaszam: string

  // Munkaidő és jelenlét
  tervezettMunkanap: number
  ledolgozottMunkanap: number
  ledolgozottMunkaora: number
  szabadsagNap: number
  betegszabadsagNap: number
  tuloraOra: number

  // Bérelemek
  bruttoAlapber: number
  alapberReszlet: number
  szabadsagDij: number
  betegszabadsagDij: number
  tuloraPotlek: number
  bonuszJutalom: number
  cafeteriaBrutto: number
  bruttoOsszesen: number

  // Kedvezmények
  kedvezmeny25EvAlatti: boolean
  csaladiKedvezmenyOsszeg: number
  egyebAdokedvezmeny: number
  adokedvezmenyekOsszesen: number

  // Levonások
  szjaLevonas: number
  tbJarulekLevonas: number
  letiltasEgyebLevonas: number
  levonasokOsszesen: number

  // Nettó és kifizetés
  nettoKifizetendo: number
  szochoMunkaltatoi: number
  kifizetesHatarido: string
  kifizetesModja: string

  // Átvétel
  statusz: "tervezet" | "kikuldve" | "atveve"
  atvetelDatuma?: string | null
  atvetelIp?: string | null
}


export function generatePayslipHtml(data: PayslipPdfData): string {
  const isAtveve = data.statusz === "atveve"
  const formattedAtvetel = data.atvetelDatuma
    ? new Date(data.atvetelDatuma).toLocaleString("hu-HU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    : null

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Bérjegyzék - ${data.dolgozoNev} - ${data.ev}/${data.honap}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #1e293b;
      background: #ffffff;
      padding: 8px;
    }
    .header-box {
      border-bottom: 2px solid #0f766e;
      padding-bottom: 10px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f766e;
      letter-spacing: -0.02em;
    }
    .brand-sub {
      font-size: 9px;
      color: #64748b;
      margin-top: 2px;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-period {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .doc-ref {
      font-size: 9px;
      color: #64748b;
      margin-top: 2px;
    }

    .two-col-grid {
      display: table;
      width: 100%;
      margin-bottom: 12px;
    }
    .col-half {
      display: table-cell;
      width: 50%;
      vertical-align: top;
      padding-right: 8px;
    }
    .col-half:last-child {
      padding-right: 0;
      padding-left: 8px;
    }

    .card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      background: #f8fafc;
    }
    .card-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .data-row {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      margin-bottom: 3px;
    }
    .data-label {
      color: #64748b;
    }
    .data-value {
      font-weight: 600;
      color: #0f172a;
    }

    .table-container {
      margin-bottom: 12px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #0f766e;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    table.data-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
      text-align: left;
      padding: 5px 8px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
      font-size: 9.5px;
      text-transform: uppercase;
    }
    table.data-table td {
      padding: 5px 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    table.data-table tr:last-child td {
      border-bottom: 1px solid #cbd5e1;
    }
    .text-right {
      text-align: right;
    }
    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-variant-numeric: tabular-nums;
    }
    .subtotal-row td {
      font-weight: 700;
      background: #f8fafc;
      color: #0f172a;
      border-top: 1px solid #94a3b8 !important;
    }

    .net-box {
      border: 2px solid #0f766e;
      background: #f0fdf4;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .net-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #166534;
      letter-spacing: 0.05em;
    }
    .net-sub {
      font-size: 9.5px;
      color: #15803d;
      margin-top: 2px;
    }
    .net-value {
      font-size: 20px;
      font-weight: 800;
      color: #14532d;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .tax-box {
      border: 1px dashed #cbd5e1;
      background: #fafafa;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
      font-size: 10px;
      color: #475569;
      display: flex;
      justify-content: space-between;
    }

    .receipt-box {
      border: 1px solid ${isAtveve ? "#86efac" : "#fde68a"};
      background: ${isAtveve ? "#f0fdf4" : "#fefce8"};
      border-radius: 6px;
      padding: 10px 12px;
      margin-top: 10px;
      margin-bottom: 12px;
    }
    .receipt-title {
      font-size: 10.5px;
      font-weight: 700;
      color: ${isAtveve ? "#166534" : "#854d0e"};
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .receipt-text {
      font-size: 9.5px;
      color: #475569;
      margin-top: 4px;
      line-height: 1.4;
    }

    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      margin-top: 14px;
      font-size: 8.5px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>

  <!-- Fejléc -->
  <div class="header-box">
    <div>
      <div class="brand-title">HAVI MUNKABÉR ELSZÁMOLÁS (BÉRJEGYZÉK)</div>
      <div class="brand-sub">Hivatalos munkaügyi bizonylat a Munka Törvénykönyve (2012. évi I. tv. – Mt.) 155. § alapján</div>
    </div>
    <div class="doc-meta">
      <div class="doc-period">${data.ev}. ${data.honapNev}</div>
      <div class="doc-ref">Kifizetés határideje: ${data.kifizetesHatarido}</div>
    </div>
  </div>

  <!-- Munkáltató és Dolgozó adatok -->
  <div class="two-col-grid">
    <div class="col-half">
      <div class="card">
        <div class="card-title">Munkáltató (Foglalkoztató) Adatai</div>
        <div class="data-row"><span class="data-label">Munkáltató neve:</span><span class="data-value">${data.munkaltatoNev}</span></div>
        <div class="data-row"><span class="data-label">Székhely:</span><span class="data-value">${data.munkaltatoCim}</span></div>
        <div class="data-row"><span class="data-label">Adószám:</span><span class="data-value font-mono">${data.munkaltatoAdoszam}</span></div>
        <div class="data-row"><span class="data-label">Fizetés módja:</span><span class="data-value">${data.kifizetesModja}</span></div>
      </div>
    </div>
    <div class="col-half">
      <div class="card">
        <div class="card-title">Munkavállaló Törzsadatai</div>
        <div class="data-row"><span class="data-label">Név:</span><span class="data-value">${data.dolgozoNev}</span></div>
        <div class="data-row"><span class="data-label">Adóazonosító jel:</span><span class="data-value font-mono">${data.adoazonosito}</span></div>
        <div class="data-row"><span class="data-label">TAJ szám:</span><span class="data-value font-mono">${data.tajSzam}</span></div>
        <div class="data-row"><span class="data-label">Munkakör / Osztály:</span><span class="data-value">${data.munkakor} • ${data.reszleg}</span></div>
        <div class="data-row"><span class="data-label">Bankszámlaszám:</span><span class="data-value font-mono">${data.bankszamlaszam || "-"}</span></div>
      </div>
    </div>
  </div>

  <!-- Jelenlét és munkaidő adatok -->
  <div class="table-container">
    <div class="section-title">1. Időelszámolás és Távollétek (Havi Munkaidő Norma)</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Tervezett munkanap</th>
          <th>Ledolgozott munkanap</th>
          <th>Ledolgozott munkaóra</th>
          <th>Fizetett szabadság</th>
          <th>Betegszabadság</th>
          <th>Túlóra</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="font-mono">${data.tervezettMunkanap} nap</td>
          <td class="font-mono"><strong>${data.ledolgozottMunkanap} nap</strong></td>
          <td class="font-mono">${data.ledolgozottMunkaora} óra</td>
          <td class="font-mono">${data.szabadsagNap} nap</td>
          <td class="font-mono">${data.betegszabadsagNap} nap</td>
          <td class="font-mono">${data.tuloraOra} óra</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Bérelemek táblázata -->
  <div class="table-container">
    <div class="section-title">2. Jövedelmek és Bérelemek Részletezése (Bruttó)</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Jogcím megnevezése</th>
          <th>Mennyiség / Eltöltött idő</th>
          <th class="text-right">Bruttó összeg (Ft)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Szerződés szerinti havi alapbér (törzsbér)</td>
          <td class="font-mono">${data.tervezettMunkanap} munkanap</td>
          <td class="text-right font-mono">${formatHufCurrency(data.bruttoAlapber)}</td>
        </tr>
        <tr>
          <td>Ledolgozott időre járó alapbér</td>
          <td class="font-mono">${data.ledolgozottMunkanap} nap (${data.ledolgozottMunkaora} óra)</td>
          <td class="text-right font-mono">${formatHufCurrency(data.alapberReszlet)}</td>
        </tr>
        ${data.szabadsagNap > 0 ? `
        <tr>
          <td>Fizetett szabadság távolléti díja</td>
          <td class="font-mono">${data.szabadsagNap} munkanap</td>
          <td class="text-right font-mono">${formatHufCurrency(data.szabadsagDij)}</td>
        </tr>` : ""}
        ${data.betegszabadsagNap > 0 ? `
        <tr>
          <td>Betegszabadság távolléti díj (Mt. 146. § (4) bek. 70%)</td>
          <td class="font-mono">${data.betegszabadsagNap} munkanap</td>
          <td class="text-right font-mono">${formatHufCurrency(data.betegszabadsagDij)}</td>
        </tr>` : ""}
        ${data.tuloraOra > 0 ? `
        <tr>
          <td>Rendkívüli munkaidő (túlóra) díjazás és pótlék (150%)</td>
          <td class="font-mono">${data.tuloraOra} óra</td>
          <td class="text-right font-mono">${formatHufCurrency(data.tuloraPotlek)}</td>
        </tr>` : ""}
        ${data.bonuszJutalom > 0 ? `
        <tr>
          <td>Teljesítmény bónusz / Jutalom / Prémium</td>
          <td class="font-mono">-</td>
          <td class="text-right font-mono">${formatHufCurrency(data.bonuszJutalom)}</td>
        </tr>` : ""}
        ${data.cafeteriaBrutto > 0 ? `
        <tr>
          <td>Béren kívüli juttatás (Cafeteria bruttó elszámolás)</td>
          <td class="font-mono">-</td>
          <td class="text-right font-mono">${formatHufCurrency(data.cafeteriaBrutto)}</td>
        </tr>` : ""}
        <tr class="subtotal-row">
          <td colspan="2">ÖSSZES BRUTTÓ JÖVEDELEM</td>
          <td class="text-right font-mono">${formatHufCurrency(data.bruttoOsszesen)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Adókedvezmények és Levonások táblázata -->
  <div class="table-container">
    <div class="section-title">3. Törvényes Levonások és Adókedvezmények</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Levonás jogcíme / Kulcs</th>
          <th>Kedvezmény alapja / Jogosultság</th>
          <th class="text-right">Levont összeg (Ft)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Személyi jövedelemadó előleg (SZJA 15%)</td>
          <td>${data.kedvezmeny25EvAlatti ? "25 év alattiak SZJA-mentessége érvényesítve" : data.csaladiKedvezmenyOsszeg > 0 ? `Családi adókedvezmény: ${formatHufCurrency(data.csaladiKedvezmenyOsszeg)}` : "Standard SZJA alap"}</td>
          <td class="text-right font-mono">-${formatHufCurrency(data.szjaLevonas)}</td>
        </tr>
        <tr>
          <td>Társadalombiztosítási járulék (TB járulék 18,5%)</td>
          <td>Egészségbiztosítási, munkaerő-piaci és nyugdíjjárulék</td>
          <td class="text-right font-mono">-${formatHufCurrency(data.tbJarulekLevonas)}</td>
        </tr>
        ${data.letiltasEgyebLevonas > 0 ? `
        <tr>
          <td>Bírósági végrehajtás / Munkabér letiltás</td>
          <td>Végrehajtói határozat alapján</td>
          <td class="text-right font-mono">-${formatHufCurrency(data.letiltasEgyebLevonas)}</td>
        </tr>` : ""}
        <tr class="subtotal-row">
          <td colspan="2">LEVONÁSOK ÖSSZESEN</td>
          <td class="text-right font-mono" style="color: #b91c1c;">-${formatHufCurrency(data.levonasokOsszesen)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Kiemelt Nettó Kifizetés Box -->
  <div class="net-box">
    <div>
      <div class="net-label">Nettó Kifizetendő Munkabér</div>
      <div class="net-sub">Átutalás helye: ${data.bankszamlaszam || "Bankszámlaszám rögzítésre vár"} • Határidő: ${data.kifizetesHatarido}</div>
    </div>
    <div class="net-value">${formatHufCurrency(data.nettoKifizetendo)}</div>
  </div>

  <!-- Munkáltatói Teher Tájékoztató -->
  <div class="tax-box">
    <div><strong>Munkáltatót terhelő szociális hozzájárulási adó (SZOCHO 13%):</strong> ${formatHufCurrency(data.szochoMunkaltatoi)}</div>
    <div><strong>Teljes munkáltatói bérköltség (Összköltség):</strong> ${formatHufCurrency(data.bruttoOsszesen + data.szochoMunkaltatoi)}</div>
  </div>

  <!-- Elektronikus Átvételi Nyugta Záradék -->
  <div class="receipt-box">
    <div class="receipt-title">
      ${isAtveve ? "✓ ELEKTRONIKUSAN ÁTVÉVE ÉS NYUGTÁZVA (Mt. 155. §)" : "⏳ MUNKAVÁLLALÓI ÁTVÉTELRE VÁR"}
    </div>
    <div class="receipt-text">
      ${isAtveve ? `
        A munkavállaló a fenti elszámolást az eaisyHR dolgozói önkiszolgáló portálján (ESS) megismerte, átvételét elektronikus aláírással jóváhagyta.<br>
        <strong>Átvétel időpontja:</strong> ${formattedAtvetel} • <strong>Hálózati azonosító (IP):</strong> ${data.atvetelIp || "Belső hálózat"} • <strong>Audit azonosító:</strong> SHA-256 hitelesítve
      ` : `
        A munkabér elszámolása közzétételre került. A munkavállaló a bérpapírt az eaisyHR Önkiszolgáló pultjában (Bérpapírjaim menüpontban) tekintheti meg és nyugtázhatja.
      `}
    </div>
  </div>

  <!-- Lábléc -->
  <div class="footer">
    <span>eaisyDocs & eaisyHR • Elektronikus Munkaügyi és Bérszámfejtési Platform</span>
    <span>Irattári tétel: 3.1 - Munkabér elszámolási jegyzékek • Megőrzési idő: 50 év (Mt. 155. § / Lvt.)</span>
  </div>

</body>
</html>`
}

export async function generatePayslipPdfBuffer(data: PayslipPdfData): Promise<{ buffer: Buffer; fileName: string }> {
  const html = generatePayslipHtml(data)
  const { launchPdfBrowser } = await import("@/utils/pdf-browser")
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

  const safeName = data.dolgozoNev.replace(/[^a-zA-Z0-9_\-áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/g, "_")
  const fileName = `berjegyzek_${safeName}_${data.ev}_${String(data.honap).padStart(2, "0")}.pdf`

  return {
    buffer: Buffer.from(pdfArray),
    fileName
  }
}
