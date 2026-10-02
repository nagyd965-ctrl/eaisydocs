import { launchPdfBrowser } from "@/utils/pdf-browser"
import { type EmploymentContractPdfData } from "./employment-contract-constants"

export function generateMt46NoticeHtml(data: EmploymentContractPdfData): string {
  const cegNev = data.cegAdatok?.nev || "eaisyDocs Zrt."
  const cegCim = data.cegAdatok?.szekhely || "1111 Budapest, Példa utca 1."
  const cegAdoszam = data.cegAdatok?.adoszam || "12345678-2-41"
  const kelt = data.kezdesDatuma ? new Date(data.kezdesDatuma).toLocaleDateString("hu-HU") : new Date().toLocaleDateString("hu-HU")
  const formattedSalary = Number(data.alapber || 0).toLocaleString("hu-HU")

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Munkáltatói Írásbeli Tájékoztató - ${data.employeeName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 16mm 16mm 16mm 16mm;
      @bottom-right {
        content: counter(page) " / " counter(pages);
        font-family: 'Montserrat', sans-serif;
        font-size: 8pt;
        color: #94a3b8;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 9pt;
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
    .header-table td { vertical-align: middle; }
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
      font-size: 15pt;
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
      margin-bottom: 12px;
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
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 2px;
      margin: 10px 0 4px 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .section-title span {
      color: #0d9488;
      margin-right: 6px;
    }
    .section-body {
      font-size: 8.5pt;
      text-align: justify;
      color: #1e293b;
      margin-bottom: 6px;
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
      margin-top: 20px;
      border-collapse: collapse;
    }
    .signatures td {
      width: 50%;
      vertical-align: top;
      padding: 0 16px;
    }
    .sign-line {
      border-top: 1px dashed #64748b;
      margin-top: 36px;
      padding-top: 6px;
      text-align: center;
      font-size: 8pt;
    }
    .sign-title { font-weight: 700; color: #0f172a; }
    .sign-sub { font-size: 7pt; color: #64748b; }
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
          <div class="filing-val">${data.iktatoszam ? `Iktatószám: ${data.iktatoszam}` : "Dosszié: 1.2 Munkaviszony iratok"}</div>
          <div style="font-size: 6.5pt; color: #64748b; margin-top: 2px;">Mt. 46. § szerinti kötelező tájékoztató</div>
        </div>
      </td>
    </tr>
  </table>

  <!-- Cím -->
  <div class="doc-title-container">
    <div class="doc-badge">Kötelező Írásbeli Értesítés</div>
    <div class="doc-title">MUNKÁLTATÓI ÍRÁSBELI TÁJÉKOZTATÓ</div>
    <div class="doc-subtitle">A Munka Törvénykönyvéről szóló 2012. évi I. törvény (Mt.) 46. §-a alapján</div>
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
        <span class="label">Adóazonosító Jel / TAJ:</span>
        <span class="value">${data.adoazonositoJel || "-"} / ${data.tajSzam || "-"}</span>
      </td>
      <td>
        <span class="label">Szervezeti Egység / Részleg:</span>
        <span class="value">${data.reszleg || "Központi"}</span>
      </td>
    </tr>
    <tr>
      <td>
        <span class="label">Munkaviszony Kezdete:</span>
        <span class="value">${kelt}</span>
      </td>
      <td>
        <span class="label">Napi Munkaidő / Heti Óraszám:</span>
        <span class="value">${data.napiMunkaidoOra || 8} óra/nap (${(data.napiMunkaidoOra || 8) * 5} óra/hét)</span>
      </td>
    </tr>
  </table>

  <!-- 1. Munkaidő -->
  <div class="section-title"><span>1.</span> Napi munkaidő, pihenőnapok és munkaidő-beosztás</div>
  <div class="section-body">
    A Munkavállaló napi munkaideje <strong>${data.napiMunkaidoOra || 8} óra</strong>, heti munkaideje <strong>${(data.napiMunkaidoOra || 8) * 5} óra</strong>. 
    A munkarend alapértelmezés szerint általános munkarend (hétfőtől péntekig, napi egyenlő munkaidő-beosztással). 
    A Munkavállalót heti két pihenőnap illeti meg (szombat és vasárnap). A Munkáltató a munkaidő-beosztást legalább egy héttel korábban, írásban közli.
  </div>

  <!-- 2. Munkabér -->
  <div class="section-title"><span>2.</span> Alapbér, bérpótlékok és egyéb juttatások</div>
  <div class="section-body">
    A Munkavállaló személyi alapbére havi bruttó <strong>${formattedSalary} Ft</strong>. 
    Rendkívüli munkaidő, éjszakai munkavégzés és műszakpótlék esetén az Mt. 139–145. §-aiban meghatározott törvényes pótlékok illetik meg. 
    A Munkáltató a belső szabályzataiban foglaltak szerint cafeteria juttatást és egyéb béren kívüli juttatásokat biztosíthat.
  </div>

  <!-- 3. Kifizetés -->
  <div class="section-title"><span>3.</span> Munkabérfizetés napja és elszámolásának módja</div>
  <div class="section-body">
    A munkabér elszámolása havonta utólag történik. A Munkáltató a munkabért legkésőbb a tárgyhónapot követő hónap <strong>10. napjáig</strong> utalja át a Munkavállaló által megadott bankszámlára (${data.bankszamlaszam || "megadott fizetési számlaszám"}).
  </div>

  <!-- 4. Szabadság -->
  <div class="section-title"><span>4.</span> A fizetett szabadság mértéke és kiadása</div>
  <div class="section-body">
    A Munkavállalót az Mt. 115–121. §-ai alapján alapszabadság (évi 20 munkanap), valamint életkora és gyermekei száma szerinti pótszabadság illeti meg. 
    A szabadságot a Munkáltató adja ki, ebből évente 7 munkanapot a Munkavállaló kérésének megfelelően köteles kiadni.
  </div>

  <!-- 5. Felmondási idő -->
  <div class="section-title"><span>5.</span> Felmondási idő megállapításának szabályai</div>
  <div class="section-body">
    A felmondási idő az Mt. 69. §-a szerint legalább 30 nap, amely a munkáltatónál munkaviszonyban töltött idő függvényében legfeljebb 60 nappal meghosszabbodik. 
    Munkáltatói felmondás esetén a Munkavállalót a felmondási idő legalább felére fel kell menteni a munkavégzés alól.
  </div>

  <!-- 6. Hatóság -->
  <div class="section-title"><span>6.</span> Illetékes adó- és társadalombiztosítási hatóság</div>
  <div class="section-body">
    A Munkáltató a munkaviszonnyal kapcsolatos közterheket (személyi jövedelemadó előleg, társadalombiztosítási járulék, szociális hozzájárulási adó) a <strong>Nemzeti Adó- és Vámhivatal (NAV)</strong> felé vallja be és fizeti meg.
  </div>

  <!-- 7. Kollektív szerződés -->
  <div class="section-title"><span>7.</span> Kollektív szerződés és képzési politika</div>
  <div class="section-body">
    A Munkáltatónál kollektív szerződés nem hatályos. A Munkáltató belső képzési és szakmai továbbképzési programokat indíthat a munkaköri követelmények fenntartása érdekében.
  </div>

  <!-- Átvételi záradék -->
  <div class="note-box">
    <strong>Munkavállalói Átvételi Elismervény:</strong><br>
    Alulírott <strong>${data.employeeName}</strong> ezennel elismerem, hogy a fenti Munkáltatói Írásbeli Tájékoztató egy eredeti példányát a mai napon átvettem, tartalmát megismertem és tudomásul vettem.
  </div>

  <!-- Aláírások -->
  <table class="signatures">
    <tr>
      <td>
        <div style="font-size: 8pt; color: #64748b; margin-bottom: 2px;">Kelt: ${cegCim.split(",")[0] || "Budapest"}, ${kelt}</div>
        <div class="sign-line">
          <div class="sign-title">${cegNev}</div>
          <div class="sign-sub">Munkáltató képviseletében</div>
        </div>
      </td>
      <td>
        <div style="font-size: 8pt; color: #64748b; margin-bottom: 2px;">Kelt: ${cegCim.split(",")[0] || "Budapest"}, ${kelt}</div>
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

export async function generateMt46NoticePdfBuffer(data: EmploymentContractPdfData): Promise<Buffer> {
  const html = generateMt46NoticeHtml(data)
  const browser = await launchPdfBrowser()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" as any })
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "14mm",
        right: "14mm",
        bottom: "14mm",
        left: "14mm"
      }
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
