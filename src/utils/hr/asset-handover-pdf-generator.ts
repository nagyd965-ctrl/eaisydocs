import { SupabaseClient } from "@supabase/supabase-js"
import { launchPdfBrowser } from "@/utils/pdf-browser"

export interface AssetItemData {
  megnevezes: string
  eszkoz_kategoria: string
  gyari_szam?: string | null
  tartozekok?: string | null
  allapot?: string | null
  megjegyzes?: string | null
}

export interface AssetHandoverPdfData {
  employeeName: string
  employeeId?: string | null
  onboardingId?: string | null
  munkakor: string
  lakcim?: string | null
  tajSzam?: string | null
  adoazonosito?: string | null
  atadasDatuma: string
  iktatoszam?: string | null
  cegNev: string
  cegSzekhely: string
  cegAdoszam: string
  cegKepviselo: string
  items: AssetItemData[]
  egyediZaradek?: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  it: "Informatika / Hardver",
  telekom: "Telekommunikáció / Mobil",
  iroda: "Iroda / Beléptetés / Kulcs",
  jarmu: "Gépjármű / Üzemanyag",
  egyeb: "Egyéb munkaeszköz"
}

const ALLAPOT_LABELS: Record<string, string> = {
  uj: "Új",
  ujszeru: "Újszerű",
  hasznalt: "Használt / Megkímélt",
  serult: "Sérült / Hibás"
}

/**
 * Legenerálja a Munkahelyi Eszköz Átadás-Átvételi Jegyzőkönyv hivatalos HTML reprezentációját.
 */
export function generateAssetHandoverHtml(data: AssetHandoverPdfData): string {
  const iktatottClass = data.iktatoszam ? "stamp-filed" : "stamp-draft"
  const iktatottLabel = data.iktatoszam ? `IKTATVA: ${data.iktatoszam}` : "TERVEZET - IKTATÁSRA VÁR"

  const itemsRows = data.items && data.items.length > 0 
    ? data.items.map((item, idx) => `
      <tr>
        <td class="text-center font-mono">${idx + 1}.</td>
        <td>
          <strong>${item.megnevezes}</strong>
          ${item.megjegyzes ? `<div class="sub-text">${item.megjegyzes}</div>` : ""}
        </td>
        <td>${CATEGORY_LABELS[item.eszkoz_kategoria] || item.eszkoz_kategoria}</td>
        <td class="font-mono text-xs">${item.gyari_szam || "—"}</td>
        <td class="text-xs">${item.tartozekok || "—"}</td>
        <td class="text-center"><span class="badge">${ALLAPOT_LABELS[item.allapot || "uj"] || item.allapot}</span></td>
      </tr>
    `).join("")
    : `
      <tr>
        <td colspan="6" class="text-center text-muted" style="padding: 24px;">
          Nincsenek rögzített eszközök a jegyzőkönyvben.
        </td>
      </tr>
    `

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Munkahelyi Eszköz Átadás-Átvételi Jegyzőkönyv</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 20mm 15mm 20mm 15mm;
    }
    body {
      font-family: 'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #14b8a6;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .company-info h2 {
      font-size: 14pt;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .company-info p {
      font-size: 8.5pt;
      color: #64748b;
      margin: 0;
    }
    .stamp-box {
      border: 2px solid;
      border-radius: 6px;
      padding: 6px 12px;
      text-align: right;
      font-family: monospace;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .stamp-filed {
      border-color: #059669;
      color: #059669;
      background-color: #ecfdf5;
    }
    .stamp-draft {
      border-color: #d97706;
      color: #d97706;
      background-color: #fffbeb;
    }
    .title-box {
      text-align: center;
      margin: 20px 0 24px 0;
    }
    .title-box h1 {
      font-size: 15pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 0 0 6px 0;
      color: #0f172a;
    }
    .title-box p {
      font-size: 9.5pt;
      color: #475569;
      margin: 0;
      font-weight: 500;
    }
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 16px;
    }
    .party-col h4 {
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0d9488;
      margin: 0 0 8px 0;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
    }
    .party-col p {
      font-size: 8.5pt;
      margin: 2px 0;
      color: #334155;
    }
    .party-col strong {
      color: #0f172a;
    }
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 20px 0;
      font-size: 8.5pt;
    }
    table.items-table th {
      background-color: #0f172a;
      color: #ffffff;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 1px solid #0f172a;
    }
    table.items-table td {
      padding: 8px 10px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
    }
    table.items-table tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .text-center { text-align: center; }
    .font-mono { font-family: monospace; }
    .text-xs { font-size: 8pt; }
    .sub-text { font-size: 7.5pt; color: #64748b; margin-top: 2px; }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      background-color: #f1f5f9;
      border: 1px solid #cbd5e1;
      font-size: 7.5pt;
      font-weight: 600;
    }
    .legal-box {
      border-left: 3px solid #0d9488;
      background-color: #f0fdfa;
      padding: 10px 14px;
      margin-bottom: 24px;
      font-size: 8pt;
      color: #134e4a;
      line-height: 1.5;
    }
    .legal-box h5 {
      margin: 0 0 6px 0;
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f766e;
    }
    .legal-box ol {
      margin: 0;
      padding-left: 18px;
    }
    .legal-box li {
      margin-bottom: 4px;
      text-align: justify;
    }
    .signatures {
      margin-top: 40px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }
    .sign-col {
      text-align: center;
    }
    .sign-line {
      border-bottom: 1px solid #0f172a;
      margin-bottom: 6px;
      height: 45px;
    }
    .sign-name {
      font-weight: 700;
      font-size: 9pt;
      color: #0f172a;
    }
    .sign-title {
      font-size: 8pt;
      color: #64748b;
    }
    .date-footer {
      margin-top: 30px;
      text-align: right;
      font-size: 8.5pt;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <h2>${data.cegNev}</h2>
      <p>Székhely: ${data.cegSzekhely}</p>
      <p>Adószám: ${data.cegAdoszam}</p>
    </div>
    <div class="stamp-box ${iktatottClass}">
      <div>${iktatottLabel}</div>
      <div style="font-size: 7.5pt; font-weight: normal; margin-top: 2px;">
        Kategória: 3.3 - Eszközfelelősség (5 év)
      </div>
    </div>
  </div>

  <div class="title-box">
    <h1>Munkahelyi Eszköz Átadás-Átvételi Jegyzőkönyv</h1>
    <p>Leltár- és Megőrzési Felelősségvállalási Nyilatkozat (Mt. 179. §)</p>
  </div>

  <div class="parties-grid">
    <div class="party-col">
      <h4>Átadó (Munkáltató)</h4>
      <p>Cégnév: <strong>${data.cegNev}</strong></p>
      <p>Képviselő: <strong>${data.cegKepviselo}</strong></p>
      <p>Székhely: ${data.cegSzekhely}</p>
    </div>
    <div class="party-col">
      <h4>Átvevő (Munkavállaló)</h4>
      <p>Név: <strong>${data.employeeName}</strong></p>
      <p>Munkakör: <strong>${data.munkakor}</strong></p>
      ${data.lakcim ? `<p>Lakcím: ${data.lakcim}</p>` : ""}
      ${data.adoazonosito ? `<p>Adóazonosító: ${data.adoazonosito}</p>` : ""}
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 30px;" class="text-center">#</th>
        <th>Eszköz Megnevezése</th>
        <th style="width: 130px;">Kategória</th>
        <th style="width: 140px;">Gyári szám / IMEI</th>
        <th style="width: 150px;">Tartozékok</th>
        <th style="width: 70px;" class="text-center">Állapot</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="legal-box">
    <h5>Felelősségvállalási és Visszaszolgáltatási Záradék (Mt. 179. §):</h5>
    <ol>
      <li><strong>Átvétel elismerése:</strong> A Munkavállaló elismeri, hogy a fenti táblázatban tételesen felsorolt eszközöket hiánytalanul, rendeltetésszerű működésre alkalmas, megkímélt állapotban a mai napon átvette.</li>
      <li><strong>Kizárólagos megőrzési felelősség:</strong> A felek rögzítik, hogy a fenti vagyontárgyak a Munkavállaló kizárólagos használatába és őrizetébe kerülnek átadásra. A Munka Törvénykönyvéről szóló 2012. évi I. törvény (Mt.) 179. § (1) bekezdése értelmében a Munkavállaló a visszaszolgáltatási vagy elszámolási kötelezettséggel átvett olyan dolgokban bekövetkezett hiányért, amelyeket állandóan őrizetben tart, <strong>a vétkességére tekintet nélkül felel (megőrzési felelősség)</strong>.</li>
      <li><strong>Rendeltetésszerű használat:</strong> A Munkavállaló vállalja, hogy az eszközöket rendeltetésszerűen, a vonatkozó biztonsági és informatikai szabályzatok betartásával kezeli, azokat harmadik fél használatába nem bocsátja, és a tőle elvárható gondossággal megóvja az illetéktelen hozzáféréstől, sérüléstől és elvesztéstől.</li>
      <li><strong>Visszaszolgáltatási kötelezettség:</strong> A Munkavállaló kifejezetten kötelezettséget vállal arra, hogy a munkaviszonyának bármely okból történő megszűnésekor – a kilépési eljárás keretében, legkésőbb az utolsó munkában töltött napon –, vagy a Munkáltató írásbeli felhívására a fenti eszközöket a tartozékaikkal együtt haladéktalanul, tiszta és működőképes állapotban visszaszolgáltatja.</li>
      <li><strong>Kártérítés hiány esetén:</strong> Amennyiben a Munkavállaló az eszközökkel a munkaviszony lezárásakor nem tud hiánytalanul elszámolni, vagy az eszközökben nem rendeltetésszerű használatból eredő kár keletkezett, a Munkáltató jogosult a dolog beszerzési/pótlási értékét a Munkavállalóval szemben polgári és munkaügyi úton érvényesíteni.</li>
    </ol>
  </div>

  <div class="signatures">
    <div class="sign-col">
      <div class="sign-line"></div>
      <div class="sign-name">${data.cegKepviselo}</div>
      <div class="sign-title">Munkáltató képviseletében (Átadó)</div>
    </div>
    <div class="sign-col">
      <div class="sign-line"></div>
      <div class="sign-name">${data.employeeName}</div>
      <div class="sign-title">Munkavállaló (Átvevő)</div>
    </div>
  </div>

  <div class="date-footer">
    Kelt: Budapest, ${data.atadasDatuma ? new Date(data.atadasDatuma).toLocaleDateString("hu-HU") : new Date().toLocaleDateString("hu-HU")}
  </div>
</body>
</html>`
}

/**
 * Legenerálja a PDF dokumentumot a HTML sablonból Puppeteer segítségével.
 */
export async function generateAssetHandoverPdf(data: AssetHandoverPdfData): Promise<Buffer> {
  const html = generateAssetHandoverHtml(data)
  const browser = await launchPdfBrowser()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" as any })
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm"
      }
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
