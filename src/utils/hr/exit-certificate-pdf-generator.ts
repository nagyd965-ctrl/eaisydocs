import { launchPdfBrowser } from "@/utils/pdf-browser"
import { 
  type ExitCertificatePdfData, 
  DEFAULT_EXIT_DOCUMENTS, 
  DEFAULT_COMPANY_DETAILS 
} from "./exit-certificate-constants"

export function generateExitCertificateHtml(data: ExitCertificatePdfData): string {
  const ceg = data.cegAdatok || DEFAULT_COMPANY_DETAILS
  const isFiled = Boolean(data.iktatoszam)
  const kelt = data.kelt || new Date().toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })
  const kiadottIratok = data.kiadottIratok && data.kiadottIratok.length > 0 
    ? data.kiadottIratok 
    : DEFAULT_EXIT_DOCUMENTS

  const isPersonal = data.atvetelModja === "szemelyes"
  const formattedSeverance = Number(data.vegkielegitesOsszeg || 0).toLocaleString("hu-HU")

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Munkáltatói Igazolás & Kilépő Iratok Átadás-Átvételi Jegyzőkönyve (Mt. 80. §) - ${data.employeeName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 16mm 16mm 16mm 16mm;
    }
    body {
      font-family: 'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 8.5pt;
      line-height: 1.45;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0d9488;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .company-info h1 {
      font-size: 13pt;
      font-weight: 700;
      margin: 0 0 3px 0;
      color: #0f172a;
    }
    .company-info p {
      margin: 1px 0;
      font-size: 7.5pt;
      color: #64748b;
    }
    .filing-stamp {
      border: 1.5px solid #0d9488;
      background: #f0fdfa;
      padding: 6px 12px;
      border-radius: 4px;
      text-align: right;
      min-width: 170px;
    }
    .filing-stamp .app-name {
      font-size: 7pt;
      font-weight: 700;
      color: #0d9488;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .filing-stamp .stamp-id {
      font-size: 10pt;
      font-weight: 800;
      font-family: 'Courier New', Courier, monospace;
      color: #0f172a;
      margin: 2px 0;
    }
    .filing-stamp .stamp-meta {
      font-size: 6.5pt;
      color: #64748b;
    }
    .doc-title {
      text-align: center;
      margin: 10px 0 12px 0;
    }
    .doc-title h2 {
      font-size: 11pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #0f172a;
      margin: 0 0 3px 0;
      text-transform: uppercase;
    }
    .doc-title .subtitle {
      font-size: 8pt;
      color: #475569;
      font-weight: 600;
    }
    .section-title {
      font-size: 8pt;
      font-weight: 700;
      color: #0d9488;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 2px;
      margin: 10px 0 6px 0;
    }
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 10px;
    }
    .party-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 8px 10px;
      font-size: 8pt;
    }
    .party-card strong {
      display: block;
      font-size: 8.5pt;
      color: #0f172a;
      margin-bottom: 3px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
      font-size: 8pt;
    }
    .data-table th, .data-table td {
      border: 1px solid #e2e8f0;
      padding: 4px 6px;
      text-align: left;
    }
    .data-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
      width: 35%;
    }
    .checklist-table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
      font-size: 7.5pt;
    }
    .checklist-table th, .checklist-table td {
      border: 1px solid #e2e8f0;
      padding: 4px 6px;
    }
    .checklist-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
    }
    .checklist-table .check-col {
      width: 30px;
      text-align: center;
      font-weight: bold;
      color: #0d9488;
    }
    .statement-box {
      background: #f8fafc;
      border-left: 3px solid #0d9488;
      padding: 7px 10px;
      font-size: 7.5pt;
      margin: 8px 0;
      color: #334155;
    }
    .sig-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 18px;
    }
    .sig-block {
      text-align: center;
      font-size: 7.5pt;
    }
    .sig-line {
      border-top: 1px dotted #94a3b8;
      margin-top: 36px;
      padding-top: 4px;
    }
    .sig-name {
      font-weight: 700;
      color: #0f172a;
    }
    .sig-role {
      font-size: 7pt;
      color: #64748b;
    }
  </style>
</head>
<body>

  <!-- Fejléc -->
  <div class="header">
    <div class="company-info">
      <h1>${ceg.nev}</h1>
      <p>Székhely: ${ceg.szekhely} | Adószám: ${ceg.adoszam} | Cégjegyzékszám: ${ceg.cegjegyzekszam}</p>
      <p>Képviseli: ${ceg.kepviselo} ügyvezető | E-mail: hr@eaisydocs.hu</p>
    </div>
    <div class="filing-stamp">
      <div class="app-name">eaisyDocs HR Iratkezelő</div>
      <div class="stamp-id">${isFiled ? data.iktatoszam : "TERVEZET (MT. 80. §)"}</div>
      <div class="stamp-meta">
        ${isFiled ? "Hivatalos Iktatott Példány" : "Iktatás a kiléptetés lezárásakor"}<br>
        Irattári tétel: 1.2 Munkaviszony (50 év)
      </div>
    </div>
  </div>

  <!-- Dokumentum címe -->
  <div class="doc-title">
    <h2>Munkáltatói Igazolás & Kilépő Iratok Átadás-Átvételi Jegyzőkönyve</h2>
    <div class="subtitle">A munka törvénykönyvéről szóló 2012. évi I. törvény (Mt.) 80. § (2) bekezdése és az Flt. 36/A. § alapján</div>
  </div>

  <!-- Felek adatai -->
  <div class="parties-grid">
    <div class="party-card">
      <strong>MUNKÁLTATÓ</strong>
      <div>Név: ${ceg.nev}</div>
      <div>Székhely: ${ceg.szekhely}</div>
      <div>Adószám: ${ceg.adoszam}</div>
      <div>Képviselő: ${ceg.kepviselo} ügyvezető</div>
    </div>
    <div class="party-card">
      <strong>MUNKAVÁLLALÓ</strong>
      <div>Név: <strong>${data.employeeName}</strong></div>
      <div>Születési hely, idő: ${data.szuletesiHely || "-"}, ${data.szuletesiDatum || "-"}</div>
      <div>Anyja születési neve: ${data.anyjaNeve || "-"}</div>
      <div>Lakcím: ${data.lakcim || "-"}</div>
      <div>Adóazonosító: ${data.adoazonosito || "-"} | TAJ: ${data.tajSzam || "-"}</div>
    </div>
  </div>

  <!-- 1. Munkaviszony adatai -->
  <div class="section-title">1. Munkaviszony és Megszűnés Adatai</div>
  <table class="data-table">
    <tr>
      <th>Munkakör megnevezése / FEOR</th>
      <td><strong>${data.munkakor}</strong> ${data.feorKod ? `(FEOR-08: ${data.feorKod})` : ""} ${data.reszleg ? `• Részleg: ${data.reszleg}` : ""}</td>
    </tr>
    <tr>
      <th>Munkaviszony időtartama</th>
      <td>${data.jogviszonyKezdete ? `${data.jogviszonyKezdete} – ` : ""}${data.jogviszonyVege} (Munkaviszony megszűnésének napja)</td>
    </tr>
    <tr>
      <th>Megszűnés jogcíme</th>
      <td>${data.megszunesModjaLabel || data.megszunesModja}</td>
    </tr>
  </table>

  <!-- 2. Munkabérből történő levonások -->
  <div class="section-title">2. Munkabérből Történő Levonások Nyilatkozata (Mt. 80. § (2))</div>
  <table class="data-table">
    <tr>
      <th>Bírósági letiltás / Levonás kötelezettség</th>
      <td>
        ${data.vanLevonas 
          ? `<strong>Igen, levonási kötelezettség áll fenn:</strong> ${data.levonasReszletek || data.levonasok}`
          : `<strong>Levonási kötelezettség nem áll fenn:</strong> A Munkáltató igazolja, hogy a Munkavállaló munkabérét bírósági végrehajtói letiltás, gyermektartásdíj vagy egyéb tartozás nem terheli.`}
      </td>
    </tr>
  </table>

  <!-- 3. Tárgyévi betegszabadság és juttatások -->
  <div class="section-title">3. Tárgyévi Betegszabadság és Pénzügyi Elszámolás</div>
  <table class="data-table">
    <tr>
      <th>Tárgyévben igénybe vett betegszabadság</th>
      <td><strong>${data.betegszabadsagNapok} munkanap</strong> (az Mt. 126. § szerinti 15 munkanap évi keretből)</td>
    </tr>
    ${data.vegkielegitesOsszeg > 0 ? `
    <tr>
      <th>Folyósított végkielégítés összege</th>
      <td><strong>${formattedSeverance} Ft</strong></td>
    </tr>
    ` : ""}
  </table>

  <!-- 4. Kiadott hivatalos iratok listája -->
  <div class="section-title">4. Kiadásra és Átadásra Kerülő Törvényes Igazolások</div>
  <table class="checklist-table">
    <thead>
      <tr>
        <th class="check-col">Átadva</th>
        <th>Okirat / Igazolás Hivatalos Megnevezése</th>
        <th>Jogszabályi Hivatkozás</th>
      </tr>
    </thead>
    <tbody>
      ${kiadottIratok.map((irat) => `
        <tr>
          <td class="check-col">✓</td>
          <td><strong>${irat}</strong></td>
          <td>Mt. 80. § (2) bek., Flt. 36/A. §</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <!-- 5. Átvételi mód és nyilatkozat -->
  <div class="section-title">5. Átvételi Mód és Jognyilatkozat</div>
  <div class="statement-box">
    ${isPersonal ? `
      <strong>Személyes átvételi elismervény:</strong> Alulírott <strong>${data.employeeName}</strong> büntetőjogi felelősségem tudatában kijelentem és aláírásommal igazolom, hogy a fent tételesen felsorolt törvényes munkáltatói kilépő igazolásokat, elszámolásokat és a munkaviszony megszűnésével összefüggő hivatalos iratokat a mai napon hiánytalanul átvettem.
    ` : `
      <strong>Postai kézbesítés igazolása:</strong> A Munkáltató a fent megjelölt törvényes igazolásokat az Mt. 80. § (2) bekezdésében előírt 5 munkanapos törvényes határidőn belül igazoltan, ajánlott tértivevényes postai küldeményként feladta a Munkavállaló bejelentett lakcímére. Postai feladási azonosító / ragszám: <strong>${data.postaiAzonosito || "Folyamatban"}</strong>.
    `}
  </div>

  <div style="font-size: 7.5pt; color: #475569; margin: 10px 0;">
    Kelt: ${ceg.szekhely.split(",")[0]}, ${kelt}
  </div>

  <!-- 6. Aláírási blokk -->
  <div class="sig-grid">
    <div class="sig-block">
      <div class="sig-line">
        <div class="sig-name">${ceg.nev}</div>
        <div class="sig-role">Munkáltató képviseletében: ${ceg.kepviselo} ügyvezető</div>
      </div>
    </div>
    <div class="sig-block">
      <div class="sig-line">
        <div class="sig-name">${data.employeeName}</div>
        <div class="sig-role">Munkavállaló / Átvevő</div>
      </div>
    </div>
  </div>

</body>
</html>`
}

export async function generateExitCertificatePdfBuffer(data: ExitCertificatePdfData): Promise<Buffer> {
  const html = generateExitCertificateHtml(data)
  const browser = await launchPdfBrowser()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "domcontentloaded" })
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "16mm",
        right: "16mm",
        bottom: "16mm",
        left: "16mm"
      }
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
