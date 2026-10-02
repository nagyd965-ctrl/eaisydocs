import { launchPdfBrowser } from "@/utils/pdf-browser"
import { type JobDescriptionPdfData, DEFAULT_JOB_TASKS, DEFAULT_JOB_COMPETENCIES } from "./job-description-constants"

export function generateJobDescriptionHtml(data: JobDescriptionPdfData): string {
  const cegNev = data.cegNev || "eaisyDocs Zrt."
  const cegCim = data.cegCim || "1111 Budapest, Példa utca 1."
  const cegAdoszam = data.cegAdoszam || "12345678-2-41"
  const kelt = data.kelt || new Date().toISOString().split("T")[0]
  const formattedKelt = new Date(kelt).toLocaleDateString("hu-HU")
  const kezdesStr = data.jogviszonyKezdete ? new Date(data.jogviszonyKezdete).toLocaleDateString("hu-HU") : "Szerződés szerint"
  
  const tasks = (data.feladatok && data.feladatok.length > 0) ? data.feladatok : DEFAULT_JOB_TASKS
  const competencies = (data.kompetenciak && data.kompetenciak.length > 0) ? data.kompetenciak : DEFAULT_JOB_COMPETENCIES

  const tasksListHtml = tasks.map((t, i) => `<li>${t}</li>`).join("\n")
  const compListHtml = competencies.map((c, i) => `<li>${c}</li>`).join("\n")

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Hivatalos Munkaköri Leírás - ${data.employeeName} (${data.munkakor})</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 14mm 14mm 14mm;
      @bottom-right {
        content: counter(page) " / " counter(pages);
        font-family: 'Montserrat', sans-serif;
        font-size: 8pt;
        color: #94a3b8;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 9.5pt;
      line-height: 1.45;
      color: #0f172a;
      background: #ffffff;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0d9488;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .header-table td {
      vertical-align: middle;
    }
    .company-title {
      font-size: 13pt;
      font-weight: 700;
      color: #0d9488;
      letter-spacing: -0.2px;
    }
    .company-sub {
      font-size: 7.5pt;
      color: #64748b;
      margin-top: 2px;
    }
    .filing-box {
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 7.5pt;
      background-color: #f8fafc;
      text-align: right;
    }
    .filing-label {
      font-size: 6.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      font-weight: 600;
    }
    .filing-val {
      font-family: monospace;
      font-weight: bold;
      color: #0f172a;
    }
    .doc-title-container {
      text-align: center;
      margin: 10px 0 14px 0;
    }
    .doc-badge {
      display: inline-block;
      font-size: 7.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0d9488;
      background: #f0fdfa;
      border: 1px solid #ccfbf1;
      padding: 2px 10px;
      border-radius: 9999px;
      margin-bottom: 4px;
    }
    .doc-title {
      font-size: 16pt;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.3px;
    }
    .doc-subtitle {
      font-size: 8pt;
      color: #475569;
      margin-top: 2px;
    }
    .meta-card {
      width: 100%;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: #f8fafc;
      margin-bottom: 14px;
      border-collapse: collapse;
    }
    .meta-card td {
      padding: 6px 10px;
      border: 1px solid #e2e8f0;
      font-size: 8.5pt;
      vertical-align: top;
    }
    .meta-card .label {
      font-size: 7pt;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #64748b;
      font-weight: 600;
      display: block;
      margin-bottom: 2px;
    }
    .meta-card .value {
      font-weight: 600;
      color: #0f172a;
    }
    .section-title {
      font-size: 10pt;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
      margin: 12px 0 6px 0;
      display: flex;
      align-items: center;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .section-title span {
      color: #0d9488;
      margin-right: 6px;
    }
    .section-body {
      font-size: 9pt;
      text-align: justify;
      color: #1e293b;
      margin-bottom: 8px;
    }
    ol.styled-list, ul.styled-list {
      margin-left: 20px;
      margin-bottom: 8px;
    }
    ol.styled-list li, ul.styled-list li {
      margin-bottom: 4px;
      font-size: 8.5pt;
      color: #1e293b;
      text-align: justify;
    }
    .note-box {
      border: 1px solid #e2e8f0;
      border-left: 3px solid #0d9488;
      background: #f0fdfa;
      padding: 8px 10px;
      border-radius: 4px;
      font-size: 8pt;
      color: #134e4a;
      margin: 10px 0;
      text-align: justify;
    }
    .signatures {
      width: 100%;
      margin-top: 24px;
      border-collapse: collapse;
    }
    .signatures td {
      width: 50%;
      vertical-align: top;
      padding: 0 16px;
    }
    .sign-line {
      border-top: 1px dashed #64748b;
      margin-top: 40px;
      padding-top: 6px;
      text-align: center;
      font-size: 8pt;
    }
    .sign-title {
      font-weight: 700;
      color: #0f172a;
    }
    .sign-sub {
      font-size: 7pt;
      color: #64748b;
    }
  </style>
</head>
<body>

  <!-- Fejléc -->
  <table class="header-table">
    <tr>
      <td style="width: 65%;">
        <div class="company-title">${cegNev}</div>
        <div class="company-sub">Székhely: ${cegCim} • Adószám: ${cegAdoszam}</div>
      </td>
      <td style="width: 35%;">
        <div class="filing-box">
          <div class="filing-label">eaisyDocs Ügyviteli Iktatás</div>
          <div class="filing-val">${data.iktatoszam ? `Iktatószám: ${data.iktatoszam}` : "Dosszié kategória: 1.1 Munkaköri leírások"}</div>
          <div style="font-size: 6.5pt; color: #64748b; margin-top: 2px;">Mt. 45. § (4) bekezdés szerinti melléklet</div>
        </div>
      </td>
    </tr>
  </table>

  <!-- Cím -->
  <div class="doc-title-container">
    <div class="doc-badge">Hivatalos Munkáltatói Dokumentum</div>
    <div class="doc-title">MUNKAKÖRI LEÍRÁS</div>
    <div class="doc-subtitle">A Munka Törvénykönyvéről szóló 2012. évi I. törvény 45. § (4) bekezdése alapján</div>
  </div>

  <!-- Alapadatok -->
  <table class="meta-card">
    <tr>
      <td style="width: 50%;">
        <span class="label">Munkavállaló Neve:</span>
        <span class="value">${data.employeeName}</span>
      </td>
      <td style="width: 50%;">
        <span class="label">Munkakör Megnevezése:</span>
        <span class="value">${data.munkakor}</span>
      </td>
    </tr>
    <tr>
      <td>
        <span class="label">FEOR-08 Szám / Besorolás:</span>
        <span class="value">${data.feorKod ? `${data.feorKod}` : "Nincs rögzítve"}</span>
      </td>
      <td>
        <span class="label">Szervezeti Egység / Részleg:</span>
        <span class="value">${data.reszleg || "Központi állomány"}</span>
      </td>
    </tr>
    <tr>
      <td>
        <span class="label">Munkaviszony Kezdete:</span>
        <span class="value">${kezdesStr}</span>
      </td>
      <td>
        <span class="label">Heti Munkaidő / Munkarend:</span>
        <span class="value">${data.hetiMunkaidoOra ? `${data.hetiMunkaidoOra} óra/hét` : "40 óra/hét"} (Teljes munkaidő)</span>
      </td>
    </tr>
    <tr>
      <td>
        <span class="label">Közvetlen Szakmai Felettes:</span>
        <span class="value">${data.vezetoNev || "Részlegvezető / Ügyvezető igazgató"}</span>
      </td>
      <td>
        <span class="label">Keltezés / Kiadás Napja:</span>
        <span class="value">${formattedKelt}</span>
      </td>
    </tr>
  </table>

  <!-- 1. Cél -->
  <div class="section-title"><span>1.</span> A munkakör célja és küldetése</div>
  <div class="section-body">
    ${data.leiras || `A(z) <strong>${data.munkakor}</strong> munkakör célja a társaság üzleti célkitűzéseinek és operatív működésének professzionális támogatása a szakterülethez tartozó feladatok precíz, felelősségteljes és határidőre történő megvalósításával, a hatályos belső szabályzatok és jogszabályi keretek betartása mellett.`}
  </div>

  <!-- 2. Feladatok -->
  <div class="section-title"><span>2.</span> Főbb feladatok és hatáskörök</div>
  <ol class="styled-list">
    ${tasksListHtml}
  </ol>

  <!-- 3. Kompetenciák -->
  <div class="section-title"><span>3.</span> Elvárt szaktudás, készségek és kompetenciák</div>
  <ul class="styled-list">
    ${compListHtml}
  </ul>

  <!-- 4. Munkavédelem & Egészségügy -->
  <div class="section-title"><span>4.</span> Munkavédelem és egészségügyi előírások</div>
  <div class="section-body">
    <p>• <strong>Foglalkozás-egészségügyi vizsgálat:</strong> ${data.orvosiVizsgalat || "Előzetes és időszakos orvosi alkalmassági vizsgálaton való kötelező részvétel a munkaköri kockázatoknak megfelelően."}</p>
    <p style="margin-top: 3px;">• <strong>Egyéni védőeszköz (EVE) juttatás:</strong> ${data.vedoeszkoz || "A társaság Munkavédelmi Szabályzatában rögzített védőeszközök és biztonsági előírások maradéktalan alkalmazása kötelező."}</p>
  </div>

  <!-- 5. Elismerő Nyilatkozat -->
  <div class="note-box">
    <strong>Munkavállalói Átvételi és Elismerő Nyilatkozat:</strong><br>
    Alulírott <strong>${data.employeeName}</strong> kijelentem, hogy a fenti munkaköri leírás tartalmát részletesen megismertem, megértettem, és azt magamra nézve kötelezőnek fogadom el. 
    Egyúttal elismerem, hogy a munkaköri leírás 1 (egy) eredeti példányát a mai napon átvettem, és a munkaköri feladataimat a leírás és a munkaszerződés rendelkezései szerint látom el.
  </div>

  <!-- Aláírások -->
  <table class="signatures">
    <tr>
      <td>
        <div style="font-size: 8pt; color: #64748b; margin-bottom: 2px;">Kelt: ${cegCim.split(",")[0] || "Budapest"}, ${formattedKelt}</div>
        <div class="sign-line">
          <div class="sign-title">${cegNev}</div>
          <div class="sign-sub">Munkáltató képviseletében</div>
        </div>
      </td>
      <td>
        <div style="font-size: 8pt; color: #64748b; margin-bottom: 2px;">Kelt: ${cegCim.split(",")[0] || "Budapest"}, ${formattedKelt}</div>
        <div class="sign-line">
          <div class="sign-title">${data.employeeName}</div>
          <div class="sign-sub">Munkavállaló (átvevő)</div>
        </div>
      </td>
    </tr>
  </table>

</body>
</html>`
}

export async function generateJobDescriptionPdfBuffer(data: JobDescriptionPdfData): Promise<Buffer> {
  const html = generateJobDescriptionHtml(data)
  const browser = await launchPdfBrowser()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" as any })
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "12mm",
        right: "12mm",
        bottom: "12mm",
        left: "12mm"
      }
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
