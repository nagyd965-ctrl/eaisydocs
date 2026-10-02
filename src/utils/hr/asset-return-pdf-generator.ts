import { launchPdfBrowser } from "@/utils/pdf-browser"
import { type CompanyDetails, DEFAULT_COMPANY_DETAILS } from "./employment-contract-constants"

export interface AssetReturnItem {
  megnevezes: string
  eszkoz_kategoria: string
  gyari_szam?: string | null
  tartozekok?: string | null
  visszavetel_allapot: "ep" | "normal_kopas" | "serult" | "hianyzik"
  visszavetel_megjegyzes?: string | null
}

export interface AssetReturnPdfData {
  employeeName: string
  employeeId?: string | null
  offboardingId?: string | null
  munkakor: string
  reszleg?: string | null
  szuletesiHely?: string | null
  szuletesiDatum?: string | null
  anyjaNeve?: string | null
  lakcim?: string | null
  adoazonosito?: string | null
  tajSzam?: string | null
  visszavetelDatuma: string
  cegAdatok?: CompanyDetails
  items: AssetReturnItem[]
  fizetendoKarteritesOsszeg?: number
  vagyoniElszamolasNyilatkozat?: string | null
  iktatoszam?: string | null
  kelt?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  it: "Informatika / Hardver",
  telekom: "Telekommunikáció / Mobil",
  iroda: "Iroda / Beléptetés / Kulcs",
  jarmu: "Gépjármű / Üzemanyag",
  egyeb: "Egyéb munkaeszköz"
}

const RETURN_STATUS_LABELS: Record<string, { label: string, color: string }> = {
  ep: { label: "Ép / Hibátlan", color: "#166534" },
  normal_kopas: { label: "Rendeltetésszerűen kopott", color: "#0369a1" },
  serult: { label: "Sérült / Hibás", color: "#b45309" },
  hianyzik: { label: "Hiányzik / Nem adott le", color: "#b91c1c" }
}

export function generateAssetReturnHtml(data: AssetReturnPdfData): string {
  const ceg = data.cegAdatok || DEFAULT_COMPANY_DETAILS
  const isFiled = Boolean(data.iktatoszam)
  const kelt = data.kelt || new Date().toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })
  const karterites = Number(data.fizetendoKarteritesOsszeg || 0)

  const itemsRows = data.items && data.items.length > 0 
    ? data.items.map((item, idx) => {
      const statusMeta = RETURN_STATUS_LABELS[item.visszavetel_allapot] || { label: item.visszavetel_allapot, color: "#334155" }
      return `
      <tr>
        <td class="text-center font-mono">${idx + 1}.</td>
        <td>
          <strong>${item.megnevezes}</strong>
          ${item.tartozekok ? `<div class="sub-text">Tartozékok: ${item.tartozekok}</div>` : ""}
          ${item.visszavetel_megjegyzes ? `<div class="sub-text note">${item.visszavetel_megjegyzes}</div>` : ""}
        </td>
        <td class="text-center">${CATEGORY_LABELS[item.eszkoz_kategoria] || item.eszkoz_kategoria}</td>
        <td class="text-center font-mono text-xs">${item.gyari_szam || "–"}</td>
        <td class="text-center">
          <span style="font-weight: 700; color: ${statusMeta.color};">
            ${statusMeta.label}
          </span>
        </td>
      </tr>
      `
    }).join("")
    : `
      <tr>
        <td colspan="5" class="text-center" style="padding: 18px; color: #64748b;">
          A munkavállalóhoz nem volt leltárilag nyilvántartott céges eszköz kiadva.
        </td>
      </tr>
    `

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Eszköz Visszavételi és Vagyoni Leszámoló Lap - ${data.employeeName}</title>
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
      margin-bottom: 14px;
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
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      padding: 5px 10px;
      text-align: right;
      background-color: #f8fafc;
      min-width: 170px;
    }
    .stamp-title {
      font-size: 6.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 2px;
    }
    .stamp-number {
      font-size: 9pt;
      font-weight: 700;
      font-family: monospace;
      color: #0f172a;
    }
    .stamp-date {
      font-size: 7pt;
      color: #94a3b8;
      margin-top: 1px;
    }
    .draft-badge {
      border: 1.5px dashed #f59e0b;
      background-color: #fffbeb;
      color: #b45309;
      padding: 5px 10px;
      border-radius: 6px;
      font-size: 8pt;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-title {
      text-align: center;
      margin: 12px 0 14px 0;
    }
    .doc-title h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.3px;
      margin: 0 0 4px 0;
      line-height: 1.3;
    }
    .doc-title p {
      font-size: 8pt;
      color: #0d9488;
      font-weight: 600;
      margin: 0;
    }
    .parties {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 14px;
      font-size: 8pt;
    }
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .party-title {
      font-weight: 700;
      font-size: 8pt;
      color: #0d9488;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 2px;
    }
    .party-details p {
      margin: 2px 0;
      line-height: 1.35;
    }
    .party-details strong {
      color: #334155;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 14px 0;
      font-size: 7.5pt;
    }
    th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 600;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #0f172a;
    }
    td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .text-center { text-align: center; }
    .font-mono { font-family: monospace; }
    .sub-text {
      font-size: 7pt;
      color: #64748b;
      margin-top: 2px;
    }
    .sub-text.note {
      color: #0284c7;
      font-style: italic;
    }
    .section-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #0f172a;
      border-left: 3px solid #0d9488;
      padding-left: 6px;
      margin: 12px 0 5px 0;
    }
    .section-body {
      color: #334155;
      text-align: justify;
      margin: 0 0 6px 0;
    }
    .clearance-box {
      background-color: ${karterites > 0 ? "#fef2f2" : "#f0fdf4"};
      border: 1px solid ${karterites > 0 ? "#fecaca" : "#bbf7d0"};
      border-radius: 6px;
      padding: 10px 14px;
      margin: 10px 0;
    }
    .clearance-box h3 {
      margin: 0 0 3px 0;
      font-size: 9pt;
      color: ${karterites > 0 ? "#991b1b" : "#166534"};
    }
    .clearance-box p {
      margin: 0;
      font-size: 7.5pt;
      color: ${karterites > 0 ? "#7f1d1d" : "#14532d"};
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 36px;
      margin-top: 28px;
      padding-top: 10px;
    }
    .sig-block {
      text-align: center;
      font-size: 8pt;
    }
    .sig-line {
      border-top: 1px solid #475569;
      margin-top: 36px;
      padding-top: 4px;
    }
    .sig-role {
      font-weight: 700;
      color: #0f172a;
    }
    .sig-name {
      color: #64748b;
      font-size: 7.5pt;
    }
  </style>
</head>
<body>

  <!-- Fejléc és iktatási pecsét -->
  <div class="header">
    <div class="company-info">
      <h1>${ceg.nev}</h1>
      <p>Székhely: ${ceg.szekhely} | Cégjegyzékszám: ${ceg.cegjegyzekszam}</p>
      <p>Adószám: ${ceg.adoszam} | Képviselő: ${ceg.kepviselo}</p>
    </div>
    ${isFiled ? `
    <div class="filing-stamp">
      <div class="stamp-title">eaisyDocs Iktatási Pecsét</div>
      <div class="stamp-number">${data.iktatoszam}</div>
      <div class="stamp-date">Irattári tétel: 1.4 (Eszközfelelősség)</div>
      <div class="stamp-date">Megőrzés: 5 év a leadást követően</div>
    </div>
    ` : `
    <div class="draft-badge">
      Tervezet<br>
      <span style="font-size: 6.5pt; font-weight: normal; color: #92400e;">Leadás ellenőrzésre vár</span>
    </div>
    `}
  </div>

  <!-- Cím -->
  <div class="doc-title">
    <h2>ESZKÖZ VISSZAVÉTELI ÉS VAGYONI LESZÁMOLÓ LAP</h2>
    <p>Munkaügyi vagyoni elszámolás és felelősségmegszüntetés (Mt. 179. § / Mt. 80. §)</p>
  </div>

  <!-- Felek -->
  <div class="parties">
    <div class="parties-grid">
      <div class="party-details">
        <div class="party-title">Munkáltató (Átvevő)</div>
        <p><strong>Cégnév:</strong> ${ceg.nev}</p>
        <p><strong>Székhely:</strong> ${ceg.szekhely}</p>
        <p><strong>Képviselő:</strong> ${ceg.kepviselo}</p>
        <p><strong>Adószám:</strong> ${ceg.adoszam}</p>
      </div>
      <div class="party-details">
        <div class="party-title">Munkavállaló (Átadó)</div>
        <p><strong>Név:</strong> ${data.employeeName}</p>
        <p><strong>Munkakör / Részleg:</strong> ${data.munkakor}${data.reszleg ? ` (${data.reszleg})` : ""}</p>
        <p><strong>Adóazonosító / TAJ:</strong> ${data.adoazonosito || "–"} / ${data.tajSzam || "–"}</p>
        <p><strong>Lakcím:</strong> ${data.lakcim || "–"}</p>
      </div>
    </div>
  </div>

  <!-- 1. Visszavett eszközök tételes jegyzéke -->
  <div class="section-title">1. Visszaszolgáltatott Munkahelyi Eszközök Tételes Jegyzéke</div>
  <table>
    <thead>
      <tr>
        <th style="width: 30px;" class="text-center">#</th>
        <th>Eszköz megnevezése és tartozékai</th>
        <th style="width: 140px;" class="text-center">Kategória</th>
        <th style="width: 120px;" class="text-center">Gyári szám / IMEI</th>
        <th style="width: 130px;" class="text-center">Visszavételi Állapot</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <!-- 2. Vagyoni elszámolás és kártérítés -->
  <div class="section-title">2. Vagyoni Elszámolás és Tartozásmentességi Záradék</div>
  <div class="clearance-box">
    ${karterites > 0 ? `
      <h3>Anyagi Megtérítési Kötelezettség Rögzítve: ${karterites.toLocaleString("hu-HU")} Ft</h3>
      <p>
        A fenti leltárban megjelölt sérülés, kár vagy hiány miatt Felek megállapodnak a fenti kártérítési összeg 
        munkabérből történő levonásában (Mt. 161. §) vagy külön megfizetésében.
      </p>
    ` : `
      <h3>✓ Teljes Vagyoni és Eszközbeli Tartozásmentesség</h3>
      <p>
        A Munkáltató igazolja, hogy a Munkavállaló a részére kiadott valamennyi munkaeszközzel (számítástechnikai eszközök, 
        mobiltelefon, belépőkártyák, kulcsok, iratok) hiánytalanul elszámolt. A felek kijelentik, hogy egymással szemben 
        eszköz- és leltárhiányból eredő semminemű anyagi követeléssel nem élnek.
      </p>
    `}
  </div>

  ${data.vagyoniElszamolasNyilatkozat ? `
  <p class="section-body"><strong>Külön megjegyzés:</strong> ${data.vagyoniElszamolasNyilatkozat}</p>
  ` : ""}

  <p class="section-body" style="font-size: 7.5pt; color: #64748b; margin-top: 10px;">
    Jelen jegyzőkönyv aláírásával a Munkavállaló leltári felelőssége a leadott munkaeszközök tekintetében végérvényesen megszűnik. 
    A Munkavállaló tudomásul veszi, hogy az eszközökön tárolt munkáltatói és ügyféladatok törlésre kerülnek, és a vállalati 
    hozzáférési jogosultságok (e-mail, szerver, VPN) a mai nappal visszavonásra kerülnek.
  </p>

  <p style="margin-top: 14px; font-size: 8pt; color: #475569;">
    Kelt: ${ceg.szekhely.split(",")[0] || "Budapest"}, ${data.visszavetelDatuma || kelt}
  </p>

  <!-- Aláírási blokk -->
  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line">
        <div class="sig-role">${ceg.nev}</div>
        <div class="sig-name">Munkáltató képviseletében átvevő (IT / Üzemeltetés / HR)</div>
      </div>
    </div>
    <div class="sig-block">
      <div class="sig-line">
        <div class="sig-role">${data.employeeName}</div>
        <div class="sig-name">Munkavállaló (Átadó)</div>
      </div>
    </div>
  </div>

</body>
</html>`
}

export async function generateAssetReturnPdfBuffer(data: AssetReturnPdfData): Promise<Buffer> {
  const html = generateAssetReturnHtml(data)
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
