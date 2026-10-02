import { launchPdfBrowser } from "@/utils/pdf-browser"
import { 
  type TerminationPdfData, 
  TERMINATION_TYPE_LABELS, 
  DEFAULT_COMPANY_DETAILS 
} from "./termination-constants"

export function generateTerminationHtml(data: TerminationPdfData): string {
  const ceg = data.cegAdatok || DEFAULT_COMPANY_DETAILS
  const isFiled = Boolean(data.iktatoszam)
  const formattedSeverance = Number(data.vegkielegitesOsszeg || 0).toLocaleString("hu-HU")
  const kelt = data.kelt || new Date().toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })

  const isMutual = data.megszunesModja === "kozos_megegyezes"
  const isEmployerDismissal = data.megszunesModja === "munkaltatoi_felmondas" || data.megszunesModja === "azonnali_felmondas_rendkivuli"
  const isEmployeeDismissal = data.megszunesModja === "munkavallaloi_felmondas"
  const isProbation = data.megszunesModja === "azonnali_felmondas_probaido"

  const docTitle = isMutual
    ? "MEGÁLLAPODÁS MUNKAVISZONY KÖZÖS MEGEGYEZÉSSEL TÖRTÉNŐ MEGSZÜNTETÉSÉRŐL"
    : isEmployerDismissal
      ? "MUNKÁLTATÓI FELMONDÁS MUNKAVISZONY MEGSZÜNTETÉSÉRE"
      : isEmployeeDismissal
        ? "MUNKAVÁLLALÓI FELMONDÁS TUDOMÁSULVÉTELE ÉS ELSZÁMOLÁS"
        : "AZONNALI HATÁLYÚ MEGSZÜNTETÉS PRÓBAIDŐ ALATT"

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>${docTitle} - ${data.employeeName}</title>
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
      font-size: 12.5pt;
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
    .section {
      margin-bottom: 11px;
    }
    .section-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #0f172a;
      border-left: 3px solid #0d9488;
      padding-left: 6px;
      margin: 0 0 5px 0;
    }
    .section-body {
      color: #334155;
      text-align: justify;
      margin: 0 0 5px 0;
    }
    .info-box {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 5px;
      padding: 8px 12px;
      margin: 8px 0;
      font-size: 8pt;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .info-item p:first-child {
      font-size: 7pt;
      color: #166534;
      text-transform: uppercase;
      font-weight: 600;
      margin: 0 0 1px 0;
    }
    .info-item p:last-child {
      font-size: 8.5pt;
      font-weight: 700;
      color: #14532d;
      margin: 0;
      font-family: monospace;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 36px;
      margin-top: 24px;
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
    .legal-notice {
      margin-top: 14px;
      padding: 6px 10px;
      background-color: #f8fafc;
      border-radius: 4px;
      font-size: 7pt;
      color: #64748b;
      border-left: 2px solid #94a3b8;
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
      <div class="stamp-date">Irattári tétel: 1.2 (50 év megőrzés)</div>
      <div class="stamp-date">Iktatva: ${kelt}</div>
    </div>
    ` : `
    <div class="draft-badge">
      Tervezet<br>
      <span style="font-size: 6.5pt; font-weight: normal; color: #92400e;">Aláírásra és Iktatásra vár</span>
    </div>
    `}
  </div>

  <!-- Cím -->
  <div class="doc-title">
    <h2>${docTitle}</h2>
    <p>${TERMINATION_TYPE_LABELS[data.megszunesModja] || data.megszunesModja}</p>
  </div>

  <!-- Felek -->
  <div class="parties">
    <div class="parties-grid">
      <div class="party-details">
        <div class="party-title">Munkáltató</div>
        <p><strong>Cégnév:</strong> ${ceg.nev}</p>
        <p><strong>Székhely:</strong> ${ceg.szekhely}</p>
        <p><strong>Cégjegyzékszám:</strong> ${ceg.cegjegyzekszam}</p>
        <p><strong>Adószám:</strong> ${ceg.adoszam}</p>
        <p><strong>Képviselő:</strong> ${ceg.kepviselo}</p>
      </div>
      <div class="party-details">
        <div class="party-title">Munkavállaló</div>
        <p><strong>Név:</strong> ${data.employeeName}</p>
        <p><strong>Születési hely, idő:</strong> ${data.szuletesiHely || "–"}, ${data.szuletesiDatum || "–"}</p>
        <p><strong>Anyja születési neve:</strong> ${data.anyjaNeve || "–"}</p>
        <p><strong>Lakcím:</strong> ${data.lakcim || "–"}</p>
        <p><strong>Adóazonosító / TAJ:</strong> ${data.adoazonosito || "–"} / ${data.tajSzam || "–"}</p>
        <p><strong>Munkakör / Részleg:</strong> ${data.munkakor}${data.reszleg ? ` (${data.reszleg})` : ""}</p>
      </div>
    </div>
  </div>

  <!-- 1. Munkaviszony megszűnésének megállapítása -->
  <div class="section">
    <div class="section-title">1. Munkaviszony Megszűnése és Időpontja</div>
    <p class="section-body">
      ${isMutual ? `
        Felek közös és egybehangzó akarattal megállapodnak abban, hogy a közöttük fennálló munkaviszonyt 
        a munka törvénykönyvéről szóló 2012. évi I. törvény (Mt.) 64. § (1) bekezdés a) pontja alapján 
        <strong>közös megegyezéssel megszüntetik</strong>.
      ` : isEmployerDismissal ? `
        A Munkáltató a fent megjelölt Munkavállaló munkaviszonyát az Mt. 64. § (1) bekezdés b) pontja és a 66. § alapján 
        <strong>munkáltatói felmondással megszünteti</strong>.
      ` : isEmployeeDismissal ? `
        A Munkavállaló által benyújtott felmondás alapján Felek rögzítik a munkaviszony Mt. 64. § (1) bekezdés b) pontja és a 67. § szerinti 
        <strong>munkavállalói felmondással történő megszűnését</strong>.
      ` : `
        Felek megállapítják a munkaviszony azonnali hatályú megszűnését a próbaidő alatt (Mt. 79. § (1) bekezdés a) pontja alapján).
      `}
    </p>
    <div class="info-box">
      <div class="info-grid">
        <div class="info-item">
          <p>Utolsó munkanap</p>
          <p>${data.utolsoMunkanap || "–"}</p>
        </div>
        <div class="info-item">
          <p>Munkaviszony vége</p>
          <p>${data.megszunesDatuma || "–"}</p>
        </div>
        <div class="info-item">
          <p>Felmentési idő</p>
          <p>${data.felmentesiIdoNap > 0 ? `${data.felmentesiIdoNap} nap` : "Nincs felmentés"}</p>
        </div>
      </div>
    </div>
  </div>

  ${data.indoklas ? `
  <!-- Indoklás -->
  <div class="section">
    <div class="section-title">2. A Megszüntetés Indoklása</div>
    <p class="section-body">${data.indoklas}</p>
  </div>
  ` : ""}

  <!-- 3. Pénzügyi és szabadság elszámolás -->
  <div class="section">
    <div class="section-title">${data.indoklas ? "3" : "2"}. Pénzügyi Elszámolás és Szabadság Megváltás (Mt. 80. §)</div>
    <p class="section-body">
      A Munkáltató az Mt. 80. § (2) bekezdése alapján a Munkavállaló munkabérét, egyéb járandóságait, valamint a jogszabályban előírt 
      munkaügyi és adóhatósági igazolásokat legkésőbb a munkaviszony megszűnését követő ötödik munkanapon kiadja és elszámolja.
    </p>
    <div class="info-box">
      <div class="info-grid">
        <div class="info-item">
          <p>Megváltandó szabadság</p>
          <p>${Number(data.megvaltottSzabadsagNap || 0) > 0 ? `${data.megvaltottSzabadsagNap} munkanap` : "0 munkanap (elszámolva)"}</p>
        </div>
        <div class="info-item">
          <p>Végkielégítés összege</p>
          <p>${Number(data.vegkielegitesOsszeg || 0) > 0 ? `${formattedSeverance} Ft` : "0 Ft (nem illeti meg)"}</p>
        </div>
        <div class="info-item">
          <p>Kifizetés határideje</p>
          <p>5 munkanapon belül</p>
        </div>
      </div>
    </div>
  </div>

  <!-- 4. Munkaeszközök és feladatok átadása -->
  <div class="section">
    <div class="section-title">${data.indoklas ? "4" : "3"}. Munkaeszközök Leadása és Feladatok Átadása (Mt. 179. §)</div>
    <p class="section-body">
      A Munkavállaló köteles az utolsó munkanapjáig a birtokában lévő valamennyi munkáltatói tulajdont képező munkaeszközt 
      (így különösen: számítástechnikai eszközök, mobiltelefon, belépőkártya, kulcsok, dokumentumok) a Munkáltató részére 
      hiánytalanul, működőképes állapotban visszaszolgáltatni. A visszavételről külön 
      <strong>Eszköz Visszavételi és Vagyoni Leszámoló Lap</strong> kerül kiállításra.
    </p>
  </div>

  <!-- 5. Titoktartási kötelezettség és elszámolás -->
  <div class="section">
    <div class="section-title">${data.indoklas ? "5" : "4"}. Titoktartási Kötelezettség és Egyéb Rendelkezések</div>
    <p class="section-body">
      A Munkavállaló tudomásul veszi, hogy a munkaviszonyának megszűnése nem érinti a munkaköre ellátása során tudomására jutott 
      üzleti titkok, bizalmas céginformációk és személyes adatok tekintetében fennálló, határidő nélküli titoktartási kötelezettségét 
      (Mt. 8. § (4) bekezdés, Ptk. 2:47. §).
    </p>
    ${isMutual ? `
    <p class="section-body">
      Felek kijelentik, hogy a jelen megállapodásban foglalt elszámolás teljesítésével egymással szemben a munkaviszonyból eredően 
      mindennemű pénzügyi, vagyoni és jogi követelésüket végérvényesen rendezettnek tekintik, a jövőben egymással szemben további 
      igényt nem támasztanak.
    </p>
    ` : ""}
    ${data.egyediZaradek ? `
    <p class="section-body"><strong>Külön megállapodás:</strong> ${data.egyediZaradek}</p>
    ` : ""}
  </div>

  ${isEmployerDismissal ? `
  <div class="legal-notice">
    <strong>Jogorvoslati tájékoztatás:</strong> A jelen felmondással szemben a kézbesítéstől számított harminc (30) napon belül 
    a hatáskörrel és illetékességgel rendelkező Törvényszék Munkaügyi Kollégiumánál keresetlevél nyújtható be (Mt. 287. §).
  </div>
  ` : ""}

  <p style="margin-top: 14px; font-size: 8pt; color: #475569;">
    Kelt: ${ceg.szekhely.split(",")[0] || "Budapest"}, ${kelt}
  </p>

  <!-- Aláírási blokk -->
  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line">
        <div class="sig-role">${ceg.nev}</div>
        <div class="sig-name">Munkáltató (képviselő: ${ceg.kepviselo})</div>
      </div>
    </div>
    <div class="sig-block">
      <div class="sig-line">
        <div class="sig-role">${data.employeeName}</div>
        <div class="sig-name">Munkavállaló</div>
      </div>
    </div>
  </div>

</body>
</html>`
}

export async function generateTerminationPdfBuffer(data: TerminationPdfData): Promise<Buffer> {
  const html = generateTerminationHtml(data)
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
