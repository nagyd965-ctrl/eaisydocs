import { launchPdfBrowser } from "@/utils/pdf-browser"
import { type T1041PdfData, T1041_TYPE_LABELS } from "@/utils/hr/t1041-constants"

export function generateT1041Html(data: T1041PdfData): string {
  const isFiled = Boolean(data.iktatoszam)
  const bejelentesLabel = T1041_TYPE_LABELS[data.bejelentesTipus] || "Új bejelentés (U)"

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>NAV T1041 Bejelentő Adatlap - ${data.employeeName}</title>
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
      text-align: right;
    }
    .doc-title {
      text-align: center;
      margin: 16px 0 6px 0;
    }
    .doc-title h2 {
      font-size: 13pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .doc-title .doc-subtitle {
      font-size: 8pt;
      color: #475569;
      font-weight: 500;
    }
    .badge-bar {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      color: #0f766e;
      border-radius: 12px;
      font-size: 8pt;
      font-weight: 700;
    }
    .section {
      margin-bottom: 14px;
    }
    .section-title {
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #0f766e;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
      margin-bottom: 8px;
    }
    .data-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 16px;
      background: #f8fafc;
      padding: 10px 12px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .data-row {
      display: flex;
      font-size: 8pt;
      line-height: 1.4;
    }
    .data-label {
      width: 140px;
      font-weight: 600;
      color: #64748b;
      flex-shrink: 0;
    }
    .data-value {
      color: #0f172a;
      font-weight: 600;
      flex-grow: 1;
      font-family: monospace;
    }
    .data-value-regular {
      color: #0f172a;
      font-weight: 500;
      flex-grow: 1;
    }
    .nav-box {
      border: 1px solid #0d9488;
      border-radius: 6px;
      padding: 10px 12px;
      background: #f0fdfa;
      margin-top: 10px;
    }
    .nav-box-title {
      font-size: 8pt;
      font-weight: 700;
      color: #0f766e;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .notice {
      margin-top: 16px;
      padding: 8px 12px;
      background: #fffbeb;
      border-left: 3px solid #f59e0b;
      border-radius: 4px;
      font-size: 7.5pt;
      color: #78350f;
      line-height: 1.4;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 10px;
    }
    .signature-block {
      width: 220px;
      text-align: center;
      font-size: 8pt;
    }
    .signature-line {
      border-top: 1px solid #1a1a1a;
      margin-bottom: 4px;
      padding-top: 4px;
    }
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 4px;
    }
  </style>
</head>
<body>

  <!-- Fejléc / Cégszerű adatok és Iktatás -->
  <div class="header">
    <div class="company-info">
      <h1>${data.cegNev || "eaisyDocs Szolgáltató Zrt."}</h1>
      <p>${data.cegCim || "1117 Budapest, Infopark sétány 1."} • Adószám: ${data.cegAdoszam || "28491029-2-41"}</p>
      <p>Munkaügyi és Személyzeti Főosztály • Bérszámfejtés</p>
    </div>
    ${isFiled ? `
      <div class="filing-stamp">
        <div class="stamp-title">eaisyDocs Iktató Pecsét</div>
        <div class="stamp-number">${data.iktatoszam}</div>
        <div class="stamp-date">${data.iktatvaEkor ? new Date(data.iktatvaEkor).toLocaleDateString("hu-HU") : new Date().toLocaleDateString("hu-HU")} • 1.3 - Hatósági bejelentés</div>
      </div>
    ` : `
      <div class="draft-badge">
        <div>T1041 ADATLAP TERVEZET</div>
        <div style="font-size: 6.5pt; font-weight: normal; margin-top: 2px;">Iktatás fiókaktiváláskor (1.3 tétel)</div>
      </div>
    `}
  </div>

  <!-- Dokumentum Cím -->
  <div class="doc-title">
    <h2>NAV T1041 BIZTOSÍTOTTI BEJELENTŐ ADATLAP</h2>
    <div class="doc-subtitle">A biztosítottak adatairól szóló T1041 jelű bejelentéshez (2019. évi CXXII. tv. és 1997. évi LXXX. tv. alapján)</div>
  </div>

  <div class="badge-bar">
    <span class="badge">${bejelentesLabel}</span>
  </div>

  <!-- I. Bejelentés Adatai -->
  <div class="section">
    <div class="section-title">I. A Hatósági Bejelentés Adatai</div>
    <div class="data-grid">
      <div class="data-row">
        <span class="data-label">Bejelentés kódja:</span>
        <span class="data-value">${data.bejelentesTipus} (${data.bejelentesTipus === "U" ? "Új bejelentés" : data.bejelentesTipus === "V" ? "Változás" : "Kijelentés"})</span>
      </div>
      <div class="data-row">
        <span class="data-label">Kiállítás dátuma:</span>
        <span class="data-value">${data.bekuldesDatuma || new Date().toLocaleDateString("hu-HU")}</span>
      </div>
      <div class="data-row">
        <span class="data-label">Foglalkoztató neve:</span>
        <span class="data-value-regular">${data.cegNev || "eaisyDocs Szolgáltató Zrt."}</span>
      </div>
      <div class="data-row">
        <span class="data-label">Foglalkoztató adószáma:</span>
        <span class="data-value">${data.cegAdoszam || "28491029-2-41"}</span>
      </div>
    </div>
  </div>

  <!-- II. Biztosított Adatai -->
  <div class="section">
    <div class="section-title">II. A Biztosított Természetes Személyazonosító Adatai</div>
    <div class="data-grid">
      <div class="data-row">
        <span class="data-label">Biztosított neve:</span>
        <span class="data-value-regular" style="font-weight: 700;">${data.employeeName}</span>
      </div>
      <div class="data-row">
        <span class="data-label">Anyja születési neve:</span>
        <span class="data-value-regular">${data.anyjaNeve || "—"}</span>
      </div>
      <div class="data-row">
        <span class="data-label">Adóazonosító jel:</span>
        <span class="data-value">${data.adoazonositoJel || "HIÁNYZIK!"}</span>
      </div>
      <div class="data-row">
        <span class="data-label">TAJ szám:</span>
        <span class="data-value">${data.tajSzam || "HIÁNYZIK!"}</span>
      </div>
      <div class="data-row">
        <span class="data-label">Születési hely, idő:</span>
        <span class="data-value-regular">${data.szuletesiHely || "—"}${data.szuletesiDatum ? `, ${data.szuletesiDatum}` : ""}</span>
      </div>
      <div class="data-row">
        <span class="data-label">Lakcím:</span>
        <span class="data-value-regular">${data.lakcim || "—"}</span>
      </div>
    </div>
  </div>

  <!-- III. Jogviszony Adatai -->
  <div class="section">
    <div class="section-title">III. A Biztosítási Jogviszony Adatai (NAV ÁNYK 13-as Pótlap Rovatok)</div>
    <div class="data-grid">
      ${data.bejelentesTipus === "T" ? `
      <div class="data-row">
        <span class="data-label">Jogviszony vége:</span>
        <span class="data-value" style="color: #b45309;">${data.jogviszonyVege || data.jogviszonyKezdete || "Megszűnés napja"}</span>
      </div>
      <div class="data-row">
        <span class="data-label">Jogviszony kezdete:</span>
        <span class="data-value">${data.jogviszonyKezdete || "—"}</span>
      </div>
      ` : data.bejelentesTipus === "V" ? `
      <div class="data-row">
        <span class="data-label">Változás időpontja (hatálya):</span>
        <span class="data-value" style="color: #0284c7;">${data.valtozasDatuma || data.bekuldesDatuma || "—"}</span>
      </div>
      <div class="data-row">
        <span class="data-label">Eredeti jogviszony kezdete:</span>
        <span class="data-value">${data.jogviszonyKezdete || "—"}</span>
      </div>
      <div class="data-row">
        <span class="data-label">Változás jellege:</span>
        <span class="data-value-regular" style="font-weight: 600; color: #0f172a;">${data.valtozasJellege || "Munkaszerződés / munkaidő / munkakör módosulása"}</span>
      </div>
      ` : `
      <div class="data-row">
        <span class="data-label">Jogviszony kezdete:</span>
        <span class="data-value">${data.jogviszonyKezdete || "Hamarosan"}</span>
      </div>
      `}
      <div class="data-row">
        <span class="data-label">Jogviszony kódja:</span>
        <span class="data-value">1101 (Munkaviszony)</span>
      </div>
      <div class="data-row">
        <span class="data-label">FEOR-08 kód:</span>
        <span class="data-value">${data.feorKod || "HIÁNYZIK!"}</span>
      </div>
      <div class="data-row">
        <span class="data-label">Munkakör megnevezése:</span>
        <span class="data-value-regular">${data.munkakor || "—"}</span>
      </div>
      <div class="data-row">
        <span class="data-label">Heti munkaidő:</span>
        <span class="data-value">${data.hetiMunkaidoOra || 40} óra/hét</span>
      </div>
      <div class="data-row">
        <span class="data-label">Szervezeti egység:</span>
        <span class="data-value-regular">${data.reszleg || "—"}</span>
      </div>
    </div>
  </div>

  <!-- ÁNYK / ONYA Rovat Segédlet Box -->
  <div class="nav-box">
    <div class="nav-box-title">ÁNYK / ONYA T1041 Elektronikus Beküldési Segédlet</div>
    <div style="font-size: 7.5pt; color: #334155; line-height: 1.4;">
      <strong>13-01 lap:</strong> Adózó adatai (Adószám: ${data.cegAdoszam || "28491029-2-41"}) • 
      <strong>13-02 lap:</strong> Biztosított (Adóazonosító: ${data.adoazonositoJel || "—"}, TAJ: ${data.tajSzam || "—"}) • 
      <strong>Rovat (1):</strong> ${data.bejelentesTipus} • 
      <strong>Rovat (2):</strong> 1101 • 
      ${data.bejelentesTipus === "T" ? `
      <strong>Rovat (4) Megszűnés:</strong> ${data.jogviszonyVege || data.jogviszonyKezdete || "—"} • 
      ` : data.bejelentesTipus === "V" ? `
      <strong>Rovat (3) Eredeti kezdés:</strong> ${data.jogviszonyKezdete || "—"} • 
      <strong>Rovat (7) Változás napja:</strong> ${data.valtozasDatuma || data.bekuldesDatuma || "—"} • 
      ` : `
      <strong>Rovat (3) Kezdés:</strong> ${data.jogviszonyKezdete || "—"} • 
      `}
      <strong>Rovat (5):</strong> ${data.feorKod || "—"} (${data.munkakor || "—"}) • 
      <strong>Rovat (6):</strong> ${data.hetiMunkaidoOra || 40} óra
    </div>
  </div>

  <!-- Figyelmeztető jogi záradék -->
  <div class="notice">
    <strong>Jogszabályi határidő:</strong> ${data.bejelentesTipus === "T" 
      ? "Az Art. (2017. évi CL. törvény) 1. melléklet 3. pontja alapján a munkaviszony megszűnését (T1041 T-jelű adatlap) annak bekövetkeztét követő 8 napon belül be kell jelenteni az állami adó- és vámhatósághoz. A beküldést követően a NAV befogadási igazolás kötelezően megőrzendő a személyi dossziéban." 
      : data.bejelentesTipus === "V"
      ? "Az Art. (2017. évi CL. törvény) 1. melléklet 3. pontja alapján a biztosítási jogviszonyt érintő adatok változását (T1041 V-jelű adatlap) a változás bekövetkeztétől (hatálybalépésétől) számított 8 napon belül be kell jelenteni az állami adó- és vámhatósághoz. A beküldést követően az elektronikus NAV befogadási igazolás (nyugta) kötelezően megőrzendő az eaisyDocs személyi dossziéban."
      : "Az Art. (2017. évi CL. törvény) 1. melléklet 3. pontja alapján a munkaviszony létesítését legkésőbb a biztosítási jogviszony első napján a munkavégzés megkezdése előtt be kell jelenteni az állami adó- és vámhatósághoz. A beküldést követően az elektronikus NAV befogadási igazolás (nyugta) kötelezően megőrzendő az eaisyDocs személyi dossziéban."
    }
  </div>

  <!-- Aláírási blokk -->
  <div class="signatures">
    <div class="signature-block">
      <div class="signature-line">Biztosított munkavállaló</div>
      <div style="font-size: 7pt; color: #64748b;">(Adatok egyezőségét igazolja)</div>
    </div>
    <div class="signature-block">
      <div class="signature-line">Foglalkoztató / Bérszámfejtő</div>
      <div style="font-size: 7pt; color: #64748b;">Cégszerű aláírás és bélyegző</div>
    </div>
  </div>

  <!-- Lábléc -->
  <div class="footer">
    <span>eaisyHR & eaisyDocs Rendszer • Hatósági Adatszolgáltatás</span>
    <span>Nyomtatva: ${new Date().toLocaleString("hu-HU")}</span>
  </div>

</body>
</html>`
}

export async function generateT1041PdfBuffer(data: T1041PdfData): Promise<Buffer> {
  const html = generateT1041Html(data)
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
