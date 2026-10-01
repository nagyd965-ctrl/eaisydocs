import { launchPdfBrowser } from "@/utils/pdf-browser"

export interface SafetyTrainingPdfData {
  employeeName: string
  employeeId?: string | null
  onboardingId?: string | null
  munkakor: string
  reszleg?: string | null
  szuletesiDatum?: string | null
  szuletesiHely?: string | null
  anyjaNeve?: string | null
  lakcim?: string | null
  oktatasDatuma: string
  oktatasTipusa?: string | null
  oktatoNeve: string
  oktatoBeosztasa?: string | null
  iktatoszam?: string | null
  cegNev: string
  cegSzekhely: string
  cegAdoszam: string
  cegKepviselo: string
  tematika?: string[] | null
  megjegyzes?: string | null
}

export const DEFAULT_SAFETY_TOPICS = [
  "Általános munkavédelmi ismeretek, a munkáltató és munkavállaló alapvető jogai és kötelezettségei (1993. évi XCIII. tv. - Mvt. 54–60. §).",
  "A munkakörhöz kapcsolódó fizikai, ergonómiai és pszichoszociális kockázatok, a képernyős munkavégzés szabályai (50/1999. EüM rendelet).",
  "Munkahelyi balesetek, rosszullétek és veszélyhelyzetek haladéktalan bejelentésének rendje, elsősegélynyújtó helyek és kijelölt elsősegélynyújtók.",
  "Tűzvédelmi Szabályzat és Házirend rendelkezései, tűzveszélyességi osztályok, dohányzási tilalom és dohányzásra kijelölt helyek (1996. évi XXXI. tv. - Ttv.).",
  "Tűzjelzés menete (112 segélyhívó), a munkahely kiürítési és menekülési útvonalai, vészkijáratok és külső gyülekezőhelyek (OTSZ).",
  "Kézi tűzoltó készülékek (porral/habbal/CO2-vel oltók) fali elhelyezése, felülvizsgálata és rendeltetésszerű használata vészhelyzetben.",
  "Munkahelyi rend, tisztaság, villamos berendezések és IT eszközök biztonságos üzemeltetése, kábelvezetési szabályok."
]

export const TRAINING_TYPE_LABELS: Record<string, string> = {
  elozetes_munkaba_allasi: "Előzetes munkába állási oktatás (Onboarding)",
  idoszakos_ismetlo: "Éves időszakos ismétlő oktatás",
  rendkivuli: "Rendkívüli oktatás (technológiaváltás / baleset után)",
  munkakor_valtozas: "Munkakör vagy munkahely változása miatti oktatás"
}

/**
 * Legenerálja a Munkavédelmi és Tűzvédelmi Oktatási Jegyzőkönyv hivatalos HTML reprezentációját.
 */
export function generateSafetyTrainingHtml(data: SafetyTrainingPdfData): string {
  const iktatottClass = data.iktatoszam ? "stamp-filed" : "stamp-draft"
  const iktatottLabel = data.iktatoszam ? `IKTATVA: ${data.iktatoszam}` : "TERVEZET - IKTATÁSRA VÁR"
  const trainingType = TRAINING_TYPE_LABELS[data.oktatasTipusa || "elozetes_munkaba_allasi"] || data.oktatasTipusa || "Előzetes munkába állási oktatás"
  const topics = data.tematika && data.tematika.length > 0 ? data.tematika : DEFAULT_SAFETY_TOPICS

  const topicsList = topics.map((topic, idx) => `
    <li class="topic-item">
      <span class="topic-num">${idx + 1}.</span>
      <span class="topic-text">${topic}</span>
    </li>
  `).join("")

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Munkavédelmi és Tűzvédelmi Oktatási Jegyzőkönyv</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 15mm 18mm 15mm;
    }
    body {
      font-family: 'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 9.5pt;
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
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .company-info h1 {
      font-size: 14pt;
      font-weight: 700;
      margin: 0 0 4px 0;
      color: #0f172a;
    }
    .company-info p {
      margin: 1px 0;
      font-size: 8pt;
      color: #64748b;
    }
    .filing-stamp {
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 12px;
      text-align: right;
      background-color: #f8fafc;
      min-width: 170px;
    }
    .stamp-title {
      font-size: 7pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      color: #64748b;
    }
    .stamp-value {
      font-size: 8.5pt;
      font-weight: 700;
      margin-top: 2px;
    }
    .stamp-draft .stamp-value {
      color: #d97706;
    }
    .stamp-filed .stamp-value {
      color: #0d9488;
    }
    .title-box {
      text-align: center;
      margin: 12px 0 16px 0;
    }
    .title-box h2 {
      font-size: 13pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 4px 0;
      color: #0f172a;
    }
    .title-box .subtitle {
      font-size: 8pt;
      color: #475569;
      font-style: italic;
    }
    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 14px;
    }
    .party-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      background: #ffffff;
    }
    .party-card h4 {
      font-size: 8.5pt;
      text-transform: uppercase;
      font-weight: 700;
      margin: 0 0 6px 0;
      padding-bottom: 4px;
      border-bottom: 1px solid #f1f5f9;
      color: #0d9488;
    }
    .party-card p {
      margin: 2.5px 0;
      font-size: 8.5pt;
    }
    .party-card strong {
      color: #0f172a;
    }
    .training-details {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      background: #f8fafc;
      margin-bottom: 14px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .training-details p {
      margin: 2px 0;
      font-size: 8.5pt;
    }
    .topics-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      background: #ffffff;
      margin-bottom: 14px;
    }
    .topics-box h5 {
      font-size: 8.5pt;
      text-transform: uppercase;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: #0f172a;
    }
    .topic-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .topic-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 5px;
      font-size: 8pt;
      line-height: 1.4;
      color: #334155;
    }
    .topic-num {
      font-weight: 700;
      color: #0d9488;
      min-width: 20px;
    }
    .legal-declaration {
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 20px;
      font-size: 8pt;
      line-height: 1.45;
      color: #134e4a;
    }
    .legal-declaration h5 {
      margin: 0 0 6px 0;
      font-size: 8.5pt;
      font-weight: 700;
      color: #0f766e;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 30px;
      margin-bottom: 12px;
    }
    .sign-col {
      text-align: center;
    }
    .sign-line {
      border-bottom: 1px solid #475569;
      height: 40px;
      margin-bottom: 6px;
    }
    .sign-name {
      font-size: 9pt;
      font-weight: 700;
      color: #0f172a;
    }
    .sign-title {
      font-size: 7.5pt;
      color: #64748b;
      margin-top: 1px;
    }
    .footer-note {
      font-size: 7pt;
      color: #94a3b8;
      text-align: center;
      margin-top: 14px;
      border-top: 1px solid #f1f5f9;
      padding-top: 6px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <h1>${data.cegNev}</h1>
      <p>Székhely: ${data.cegSzekhely}</p>
      <p>Adószám: ${data.cegAdoszam} | Képviseletében: ${data.cegKepviselo}</p>
    </div>
    <div class="filing-stamp ${iktatottClass}">
      <div class="stamp-title">eaisyDocs Iktató Pecsét</div>
      <div class="stamp-value">${iktatottLabel}</div>
      <div class="stamp-title" style="margin-top: 3px;">Tétel: 3.4 • Munkavédelem (10 év)</div>
    </div>
  </div>

  <div class="title-box">
    <h2>Munkavédelmi és Tűzvédelmi Oktatási Jegyzőkönyv</h2>
    <div class="subtitle">
      A munkavédelemről szóló 1993. évi XCIII. törvény (Mvt.) 55. §, valamint a tűz elleni védekezésről szóló 1996. évi XXXI. törvény (Ttv.) 22. § alapján
    </div>
  </div>

  <div class="parties-grid">
    <div class="party-card">
      <h4>Munkavállaló Adatai (Oktatott)</h4>
      <p>Név: <strong>${data.employeeName}</strong></p>
      <p>Munkakör: <strong>${data.munkakor}</strong></p>
      ${data.reszleg ? `<p>Részleg / Osztály: <strong>${data.reszleg}</strong></p>` : ""}
      ${data.szuletesiHely || data.szuletesiDatum ? `<p>Születési hely, idő: ${data.szuletesiHely || "—"}, ${data.szuletesiDatum || "—"}</p>` : ""}
      ${data.anyjaNeve ? `<p>Anyja neve: ${data.anyjaNeve}</p>` : ""}
      ${data.lakcim ? `<p>Lakcím: ${data.lakcim}</p>` : ""}
    </div>

    <div class="party-card">
      <h4>Oktató Adatai & Szervezet</h4>
      <p>Oktató neve: <strong>${data.oktatoNeve}</strong></p>
      <p>Beosztása / Minősítése: <strong>${data.oktatoBeosztasa || "Munkavédelmi és Tűzvédelmi Megbízott"}</strong></p>
      <p>Foglalkoztató: <strong>${data.cegNev}</strong></p>
      <p>Oktatás helyszíne: <strong>${data.cegSzekhely}</strong></p>
      <p>Időtartam: <strong>2 óra (elmélet és gyakorlat)</strong></p>
    </div>
  </div>

  <div class="training-details">
    <div>
      <p>Oktatás típusa: <strong>${trainingType}</strong></p>
      <p>Oktatás dátuma: <strong>${data.oktatasDatuma ? new Date(data.oktatasDatuma).toLocaleDateString("hu-HU") : new Date().toLocaleDateString("hu-HU")}</strong></p>
    </div>
    <div>
      <p>Következő esedékes oktatás: <strong>1 év múlva (Éves ismétlő)</strong></p>
      <p>Státusz: <strong>Sikeresen teljesítve, önálló munkavégzésre alkalmas</strong></p>
    </div>
  </div>

  <div class="topics-box">
    <h5>Az Oktatás Anyaga és Tételes Tematikája:</h5>
    <ul class="topic-list">
      ${topicsList}
    </ul>
    ${data.megjegyzes ? `<p style="font-size: 8pt; margin-top: 6px; color: #475569;"><strong>Egyedi megjegyzés / Kiegészítés:</strong> ${data.megjegyzes}</p>` : ""}
  </div>

  <div class="legal-declaration">
    <h5>Munkavállalói Kifejezett Elismerő Nyilatkozat:</h5>
    Alulírott <strong>${data.employeeName}</strong> kijelentem, hogy a mai napon a fenti munkavédelmi és tűzvédelmi oktatáson hiánytalanul részt vettem. 
    Az oktatás elméleti és gyakorlati anyagát, a vonatkozó Munkavédelmi és Tűzvédelmi Szabályzat előírásait megismertem, megértettem, és a biztonságos munkavégzés szabályait magamra nézve kötelezőnek ismerem el. 
    Kijelentem továbbá, hogy a munkába álláshoz megfelelő fizikai és szellemi állapotban vagyok, és tudomásul veszem, hogy szeszes ital vagy bódító szer hatása alatt munkát végezni tilos.
  </div>

  <div class="signatures">
    <div class="sign-col">
      <div class="sign-line"></div>
      <div class="sign-name">${data.oktatoNeve}</div>
      <div class="sign-title">${data.oktatoBeosztasa || "Munkavédelmi / Tűzvédelmi Oktató"}</div>
    </div>
    <div class="sign-col">
      <div class="sign-line"></div>
      <div class="sign-name">${data.employeeName}</div>
      <div class="sign-title">Munkavállaló (Oktatott)</div>
    </div>
  </div>

  <div class="footer-note">
    Készült 2 eredeti példányban. 1. sz. példány: Munkáltatói Személyi Dosszié (eaisyDocs), 2. sz. példány: Munkavállaló részére. 
    Megőrzési kötelezettség: 10 év az 1993. évi XCIII. törvény (Mvt.) és az Irattári Szabályzat szerint.
  </div>
</body>
</html>`
}

/**
 * Legenerálja a Munkavédelmi és Tűzvédelmi Oktatási Jegyzőkönyv PDF-et Puppeteer segítségével.
 */
export async function generateSafetyTrainingPdf(data: SafetyTrainingPdfData): Promise<Buffer> {
  const html = generateSafetyTrainingHtml(data)
  const browser = await launchPdfBrowser()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" as any })
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "18mm",
        right: "15mm",
        bottom: "18mm",
        left: "15mm"
      }
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
