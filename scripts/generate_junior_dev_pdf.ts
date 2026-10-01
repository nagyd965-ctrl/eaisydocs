import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

async function generate() {
  const desktopDir = path.join(process.env.USERPROFILE || 'C:\\Users\\dani pc xd', 'Desktop');
  const targetPdf = path.join(desktopDir, 'Munkakori_Leiras_Junior_Fejleszto_v1.pdf');

  const html = `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Munkaköri Leírás - Junior Fejlesztő</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
    }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      line-height: 1.5;
      font-size: 11pt;
      margin: 0;
      padding: 0;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 18pt;
      margin: 0 0 6px 0;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #0f766e;
    }
    .header .subtitle {
      font-size: 10pt;
      color: #666;
      margin: 0;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px;
      margin-bottom: 20px;
      font-size: 10pt;
    }
    .grid-item strong {
      display: block;
      color: #64748b;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .grid-item span {
      font-weight: 600;
      color: #0f172a;
    }
    h2 {
      font-size: 12pt;
      color: #0f172a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-top: 18px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    p, li {
      text-align: justify;
      font-size: 10pt;
      color: #334155;
    }
    ul, ol {
      margin-top: 4px;
      margin-bottom: 12px;
      padding-left: 20px;
    }
    li {
      margin-bottom: 4px;
    }
    .notice-box {
      background: #f0fdfa;
      border-left: 4px solid #0f766e;
      padding: 10px 12px;
      margin: 16px 0;
      font-size: 9.5pt;
      color: #134e4a;
    }
    .signatures {
      margin-top: 40px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      page-break-inside: avoid;
    }
    .sig-col {
      text-align: center;
    }
    .sig-line {
      border-top: 1px dotted #475569;
      margin-top: 45px;
      padding-top: 6px;
      font-size: 9.5pt;
      color: #334155;
    }
    .footer {
      margin-top: 30px;
      font-size: 8pt;
      color: #94a3b8;
      text-align: center;
      border-top: 1px solid #f1f5f9;
      padding-top: 8px;
    }
  </style>
</head>
<body>

  <div class="header">
    <h1>Hivatalos Munkaköri Leírás</h1>
    <div class="subtitle">A Munka Törvénykönyvéről szóló 2012. évi I. törvény rendelkezései alapján</div>
  </div>

  <div class="grid">
    <div class="grid-item">
      <strong>Munkakör megnevezése:</strong>
      <span>Junior Fejlesztő (Frontend / Full-stack)</span>
    </div>
    <div class="grid-item">
      <strong>FEOR-08 kód / Besorolás:</strong>
      <span>2142 - Szoftverfejlesztő (Junior szint)</span>
    </div>
    <div class="grid-item">
      <strong>Szervezeti egység / Részleg:</strong>
      <span>Termékfejlesztési és IT Osztály</span>
    </div>
    <div class="grid-item">
      <strong>Közvetlen felettes vezető:</strong>
      <span>Lead Developer / Fejlesztési Vezető</span>
    </div>
    <div class="grid-item">
      <strong>Munkavégzés helye:</strong>
      <span>Központi Iroda (1111 Budapest, Példa utca 1.) / Hibrid</span>
    </div>
    <div class="grid-item">
      <strong>Verziószám és Érvényesség:</strong>
      <span>v1.0 (Kiadva: 2026. október)</span>
    </div>
  </div>

  <h2>1. A munkakör célja és küldetése</h2>
  <p>
    A Junior Fejlesztő munkakör célja az eaisy vállalati platformok (eaisyDocs, eaisyHR) digitális komponenseinek, felhasználói felületeinek és üzleti logikájának megvalósítása a vezető fejlesztők szakmai iránymutatása mellett. A munkakör betöltője felel a tiszta, karbantartható kód írásáért, a felhasználói élmény következetes fejlesztéséért és az automatizált tesztek megbízhatóságáért.
  </p>

  <h2>2. Főbb feladatok és hatáskörök</h2>
  <ol>
    <li>Modern webes felhasználói felületek és komponensek fejlesztése Next.js, React, TypeScript és Tailwind CSS technológiák segítségével.</li>
    <li>Közreműködés az adatbázis-kapcsolatok, API útvonalak és Supabase szerverfunkciók implementálásában és optimalizálásában.</li>
    <li>Egységtesztek (TDD) és integrációs tesztek készítése a kiadott kód megbízhatóságának és stabilitásának biztosítására.</li>
    <li>Részvétel a napi agilis állományi megbeszéléseken (Daily Standup), sprint tervezéseken és kódátvizsgálásokon (Code Review).</li>
    <li>Szoftverhibák (bugok) feltárása, reprodukálása, pontos diagnosztizálása és javítása a fejlesztői környezetben.</li>
    <li>Rendszerdokumentáció, döntéstár (ADR, PRD) és változásnaplók naprakész vezetése a vállalati szabványok szerint.</li>
  </ol>

  <h2>3. Elvárt szaktudás és kompetenciák</h2>
  <ul>
    <li>Szakirányú informatikai végzettség vagy folyamatban lévő felsőfokú tanulmányok (vagy releváns bootcamp képesítés).</li>
    <li>TypeScript és JavaScript ES6+ magabiztos szintű ismerete, DOM kezelés és modern aszinkron programozási minták ismerete.</li>
    <li>Git verziókövető rendszer (branching, pull request, merge konvenciók) magabiztos mindennapi használata.</li>
    <li>Relációs adatbázisok és SQL alapfogalmak (PostgreSQL, Supabase) alapos ismerete.</li>
    <li>Precizitás, nyitottság a szakmai fejlődésre, önálló problémamegoldó képesség és konstruktív csapatmunka.</li>
  </ul>

  <h2>4. Munka- és egészségvédelmi előírások, munkakörülmények</h2>
  <div class="notice-box">
    <strong>Munkaügyi besorolás:</strong> Képernyő előtti munkavégzés kategória.
  </div>
  <ul>
    <li>A munkavállaló köteles betartani az 50/1999. (III. 3.) EüM rendeletben előírt, képernyő előtti munkavégzésre vonatkozó szabályokat (óránként 10 perc szünet biztosított).</li>
    <li>Időszakos foglalkozás-egészségügyi orvosi alkalmassági vizsgálaton való részvétel: <strong>Évente kötelező</strong>.</li>
    <li>Biztosított munkaeszközök: Vállalati laptop, monitorok, ergonómikus szék, szoftverlicencek.</li>
  </ul>

  <h2>5. Munkavállalói átvételi nyilatkozat és jóváhagyás</h2>
  <p>
    Alulírott munkavállaló kijelentem, hogy a fenti munkaköri leírást átvettem, annak tartalmát megismertem, megértettem, és azt magamra nézve kötelezőnek fogadom el. Vállalom, hogy a munkámat a jogszabályok, a belső szabályzatok és a szakmai elvárások szerint lelkiismeretesen végzem.
  </p>

  <div class="signatures">
    <div class="sig-col">
      <div class="sig-line">
        <strong>eaisyDocs Zrt.</strong><br>
        Munkáltató képviseletében
      </div>
    </div>
    <div class="sig-col">
      <div class="sig-line">
        <strong>Munkavállaló</strong><br>
        Átvevő aláírása
      </div>
    </div>
  </div>

  <div class="footer">
    eaisyDocs & eaisyHR Rendszer • Hivatalos Dokumentum Sablon • Iktatási kategória: Munkaköri leírás • Megőrzési idő: 50 év (Mt. 3.1)
  </div>

</body>
</html>`;

  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });

  await page.pdf({
    path: targetPdf,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '15mm',
      right: '15mm',
      bottom: '15mm',
      left: '15mm'
    }
  });

  await browser.close();
  console.log("PDF generated successfully at:", targetPdf);
}

generate().catch(err => {
  console.error("PDF generation failed:", err);
  process.exit(1);
});
