import { launchPdfBrowser } from "@/utils/pdf-browser"
import { type EmploymentContractPdfData, CONTRACT_TYPE_LABELS, WORK_TIME_LABELS } from "@/utils/hr/employment-contract-constants"

export function generateEmploymentContractHtml(data: EmploymentContractPdfData): string {
  const isFiled = Boolean(data.iktatoszam)
  const isFixedTerm = data.szerzodesTipusa === "hatarozott"
  const formattedSalary = Number(data.alapber || 0).toLocaleString("hu-HU")

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Munkaszerződés - ${data.employeeName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 16mm 16mm 16mm 16mm;
    }
    body {
      font-family: 'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 9pt;
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
      font-size: 14pt;
      font-weight: 800;
      margin: 0;
      color: #0f172a;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .doc-title p {
      font-size: 8pt;
      color: #64748b;
      margin: 2px 0 0 0;
      font-style: italic;
    }
    .intro-block {
      margin-bottom: 12px;
      font-size: 8.5pt;
      text-align: justify;
      line-height: 1.5;
    }
    .parties-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 8.5pt;
    }
    .parties-table td {
      width: 50%;
      vertical-align: top;
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      background-color: #f8fafc;
    }
    .parties-table h4 {
      margin: 0 0 6px 0;
      font-size: 9pt;
      font-weight: 700;
      color: #0d9488;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .party-row {
      margin: 2px 0;
      display: flex;
      justify-content: space-between;
    }
    .party-label {
      color: #64748b;
      font-size: 8pt;
    }
    .party-val {
      font-weight: 600;
      color: #1e293b;
      text-align: right;
    }
    .clauses-container {
      margin-top: 10px;
    }
    .clause-item {
      margin-bottom: 10px;
      text-align: justify;
      line-height: 1.45;
    }
    .clause-title {
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .clause-body {
      font-size: 8.5pt;
      color: #334155;
    }
    .highlight-box {
      background-color: #f0fdfa;
      border: 1px solid #99f6e4;
      border-radius: 6px;
      padding: 8px 12px;
      margin: 8px 0;
      font-size: 8.5pt;
    }
    .signatures {
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .sig-col {
      width: 44%;
      text-align: center;
    }
    .sig-date {
      font-size: 8pt;
      color: #64748b;
      margin-bottom: 30px;
      text-align: left;
    }
    .sig-line {
      border-top: 1px solid #0f172a;
      padding-top: 5px;
      margin-top: 35px;
    }
    .sig-name {
      font-weight: 700;
      font-size: 9pt;
      color: #0f172a;
    }
    .sig-title {
      font-size: 7.5pt;
      color: #64748b;
    }
    .footer {
      margin-top: 18px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>

  <!-- Fejléc: Cégadatok + eaisyDocs Iktató Pecsét -->
  <div class="header">
    <div class="company-info">
      <h1>${data.cegAdatok.nev}</h1>
      <p>Székhely: ${data.cegAdatok.szekhely}</p>
      <p>Cégjegyzékszám: ${data.cegAdatok.cegjegyzekszam} • Adószám: ${data.cegAdatok.adoszam}</p>
      <p>Képviseli: ${data.cegAdatok.kepviselo}</p>
    </div>

    ${isFiled ? `
      <div class="filing-stamp" style="border-color: #0d9488; background-color: #f0fdfa;">
        <div class="stamp-title" style="color: #0d9488;">eaisyDocs Hivatalos Iktatás</div>
        <div class="stamp-number" style="color: #0f766e;">${data.iktatoszam}</div>
        <div class="stamp-date">Irattári tétel: 1.2 (50 év megőrzés)</div>
      </div>
    ` : `
      <div class="draft-badge">
        <div>TERVEZET</div>
        <div style="font-size: 6.5pt; font-weight: normal; margin-top: 1px;">Aktiváláskor iktatódik (1.2 tétel)</div>
      </div>
    `}
  </div>

  <!-- Cím -->
  <div class="doc-title">
    <h2>Munkaszerződés</h2>
    <p>Létrejött a munka törvénykönyvéről szóló 2012. évi I. törvény (Mt.) 42–45. § rendelkezései alapján</p>
  </div>

  <!-- Bevezető -->
  <div class="intro-block">
    amely létrejött egyrészről a fent megjelölt <strong>${data.cegAdatok.nev}</strong> mint Munkáltató, másrészről az alábbiakban megjelölt Munkavállaló között az alulírott helyen és napon, a következő feltételekkel:
  </div>

  <!-- Felek Adattáblája -->
  <table class="parties-table">
    <tr>
      <td>
        <h4>Munkáltató</h4>
        <div class="party-row"><span class="party-label">Cégnév:</span><span class="party-val">${data.cegAdatok.nev}</span></div>
        <div class="party-row"><span class="party-label">Székhely:</span><span class="party-val">${data.cegAdatok.szekhely}</span></div>
        <div class="party-row"><span class="party-label">Adószám:</span><span class="party-val">${data.cegAdatok.adoszam}</span></div>
        <div class="party-row"><span class="party-label">Cégjegyzékszám:</span><span class="party-val">${data.cegAdatok.cegjegyzekszam}</span></div>
        <div class="party-row"><span class="party-label">Képviselő:</span><span class="party-val">${data.cegAdatok.kepviselo}</span></div>
      </td>
      <td>
        <h4>Munkavállaló</h4>
        <div class="party-row"><span class="party-label">Név:</span><span class="party-val">${data.employeeName}</span></div>
        <div class="party-row"><span class="party-label">Születési hely, idő:</span><span class="party-val">${data.szuletesiHely || "—"}, ${data.szuletesiDatum || "—"}</span></div>
        <div class="party-row"><span class="party-label">Anyja neve:</span><span class="party-val">${data.anyjaNeve || "—"}</span></div>
        <div class="party-row"><span class="party-label">Lakcím:</span><span class="party-val">${data.lakcim || "—"}</span></div>
        <div class="party-row"><span class="party-label">Adóazonosító jel:</span><span class="party-val">${data.adoazonositoJel || "—"}</span></div>
        <div class="party-row"><span class="party-label">TAJ szám:</span><span class="party-val">${data.tajSzam || "—"}</span></div>
      </td>
    </tr>
  </table>

  <!-- Szerződéses Pontok -->
  <div class="clauses-container">
    <div class="clause-item">
      <div class="clause-title">1. Munkakör és Feladatok (Mt. 45. § (1))</div>
      <div class="clause-body">
        A Munkáltató a Munkavállalót <strong>${data.munkakor}</strong> munkakörben foglalkoztatja (${data.reszleg || "Központi"} részleg). A munkakörhöz kapcsolódó részletes feladat- és hatásköröket, valamint a felelősségi köröket a Munkaköri Leírás tartalmazza, amely a jelen szerződés elválaszthatatlan mellékletét képezi.
      </div>
    </div>

    <div class="clause-item">
      <div class="clause-title">2. A Munkaviszony Kezdete és Időtartama</div>
      <div class="clause-body">
        A felek megállapodnak abban, hogy a munkaviszony kezdő napja: <strong>${data.kezdesDatuma}</strong>.
        A munkaviszony <strong>${isFixedTerm ? `határozott időre jön létre, amelynek lejárati napja: ${data.hatarozottLejarat || "—"}` : "határozatlan időre jön létre"}</strong>.
      </div>
    </div>

    <div class="clause-item">
      <div class="clause-title">3. Munkaidő és Munkarend</div>
      <div class="clause-body">
        A Munkavállaló foglalkoztatása <strong>${data.munkaidoTipus === "teljes" ? "teljes munkaidőben (napi 8 óra, heti 40 óra)" : `részmunkaidőben (napi ${data.napiMunkaidoOra} óra, heti ${Number(data.napiMunkaidoOra) * 5} óra)`}</strong> történik. A munkaidő-beosztásra és a pihenőidőre a Munkáltató munkarendje és az Mt. általános szabályai az irányadók.
      </div>
    </div>

    <div class="clause-item">
      <div class="clause-title">4. Próbaidő (Mt. 45. § (5))</div>
      <div class="clause-body">
        ${data.probaidoHonap > 0 
          ? `A felek a munkaviszony kezdetétől számított <strong>${data.probaidoHonap} hónap próbaidőt</strong> kötnek ki. A próbaidő alatt a munkaviszonyt bármelyik fél azonnali hatállyal, indoklás nélkül írásban megszüntetheti.`
          : `A felek a jelen munkaviszony létesítésekor próbaidőt nem kötnek ki.`
        }
      </div>
    </div>

    <div class="clause-item">
      <div class="clause-title">5. Munkabér és Elszámolás (Mt. 45. § (1))</div>
      <div class="clause-body">
        A Munkavállaló havi bruttó személyi alapbére: <strong>${formattedSalary} Ft / hó</strong> (azaz ${formattedSalary} forint / hó).
        A munkabér elszámolása havonta utólag történik. A Munkáltató a tárgyhavi munkabért a tárgyhónapot követő hónap 10. napjáig átutalással fizeti meg a Munkavállaló által megadott bankszámlára ${data.bankszamlaszam ? `(${data.bankszamlaszam})` : ""}.
      </div>
    </div>

    <div class="clause-item">
      <div class="clause-title">6. A Munkavégzés Helye</div>
      <div class="clause-body">
        A munkavégzés szokásos helye: <strong>${data.munkavegzesHelye}</strong>.
        ${data.tavmunkaMegallapodas 
          ? "A felek külön megállapodás alapján hibrid munkavégzésben (részben otthoni távmunka keretében) állapodnak meg a vonatkozó belső szabályzatok szerint." 
          : "A Munkáltató jogosult a Munkavállalót a munkaköri feladatok ellátása céljából gazdasági érdekből átmenetileg egyéb helyszínen történő munkavégzésre kötelezni."
        }
      </div>
    </div>

    <div class="clause-item">
      <div class="clause-title">7. Titoktartási Kötelezettség és Összeférhetetlenség (Mt. 8. §, Mt. 211. §)</div>
      <div class="clause-body">
        A Munkavállaló a munkaviszony fennállása alatt, valamint annak megszűnését követően is köteles a Munkáltató működésével, üzleti tevékenységével, ügyfeleivel és partnereivel összefüggő minden bizalmas adatot, információt és üzleti titkot megőrizni.
      </div>
    </div>

    <div class="clause-item">
      <div class="clause-title">8. Záró Rendelkezések</div>
      <div class="clause-body">
        A jelen munkaszerződésben nem szabályozott kérdésekben a munka törvénykönyvéről szóló 2012. évi I. törvény (Mt.), valamint a Munkáltató belső szabályzatai az irányadók. A felek a jelen szerződést közös elolvasás és értelmezés után, mint akaratukkal mindenben megegyezőt, jóváhagyólag írták alá.
      </div>
    </div>
  </div>

  <!-- Aláírási záradék -->
  <div class="signatures">
    <div class="sig-col">
      <div class="sig-date">Kelt: Budapest, ${data.kezdesDatuma}</div>
      <div class="sig-line">
        <div class="sig-name">${data.cegAdatok.kepviselo}</div>
        <div class="sig-title">${data.cegAdatok.nev} (Munkáltató)</div>
      </div>
    </div>

    <div class="sig-col">
      <div class="sig-date">&nbsp;</div>
      <div class="sig-line">
        <div class="sig-name">${data.employeeName}</div>
        <div class="sig-title">Munkavállaló</div>
      </div>
    </div>
  </div>

  <!-- Lábléc -->
  <div class="footer">
    <span>eaisyDocs HR Munkaszerződés Rendszer • Mt. 42-45. §</span>
    <span>Azonosító: ${data.contractNumber}</span>
    <span>Oldal: 1 / 1</span>
  </div>

</body>
</html>
`
}

export async function generateEmploymentContractPdfBuffer(
  data: EmploymentContractPdfData
): Promise<{ buffer: Buffer; fileName: string }> {
  const html = generateEmploymentContractHtml(data)
  const browser = await launchPdfBrowser()
  const page = await browser.newPage()

  try {
    await page.setContent(html, { waitUntil: "networkidle0" as any })
    const pdfUint8Array = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "12mm",
        right: "12mm",
        bottom: "12mm",
        left: "12mm",
      },
    })

    const buffer = Buffer.from(pdfUint8Array)
    const sanitizedName = data.employeeName.toLowerCase().replace(/[^a-z0-9]/g, "_")
    const fileName = `munkaszerzodes_${sanitizedName}_${Date.now()}.pdf`

    return { buffer, fileName }
  } finally {
    await browser.close()
  }
}
