import { SupabaseClient } from "@supabase/supabase-js"
import { launchPdfBrowser } from "@/utils/pdf-browser"

export interface CafeteriaChoiceItem {
  id: string
  nev: string
  kategoria: string
  kertOsszeg: number
  levontOsszeg: number
  szorzo: number
}

export interface CafeteriaPdfData {
  employeeId: string
  employeeName: string
  year: number
  munkakor: string
  szervezetiEgyseg: string
  annualBudget: number
  totalDeducted: number
  remainingBudget: number
  isClosed: boolean
  submissionDate: string
  iktatoszam?: string | null
  choices: CafeteriaChoiceItem[]
}

/**
 * Lekérdezi a cafeteria nyilatkozat előállításához szükséges összes adatot.
 */
export async function fetchCafeteriaPdfData(
  supabase: SupabaseClient,
  employeeId: string,
  year: number
): Promise<CafeteriaPdfData> {
  // 1. Profil adatok
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("id, nev, szervezeti_egyseg:szervezeti_egyseg_id(nev)")
    .eq("id", employeeId)
    .single()

  const employeeName = profile?.nev || "Munkavállaló"
  const szervezetiEgyseg = (profile?.szervezeti_egyseg as any)?.nev || "Központi szervezet"

  // 2. Munkakör aktív jogviszonyból
  let munkakor = "Munkavállaló"
  const { data: jogviszony } = await supabase
    .from("hr_jogviszony")
    .select(`
      id,
      hr_beosztas (
        hr_munkakor ( megnevezes )
      )
    `)
    .eq("dolgozo_id", employeeId)
    .is("kilepes_datuma", null)
    .order("belepes_datuma", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (jogviszony) {
    const beosztas = (jogviszony.hr_beosztas as any)?.[0]
    munkakor = beosztas?.hr_munkakor?.megnevezes || "Munkavállaló"
  }

  // 3. Keret adatok
  const { data: keret } = await supabase
    .from("hr_cafeteria_keret")
    .select("*")
    .eq("dolgozo_id", employeeId)
    .eq("ev", year)
    .single()

  const annualBudget = keret?.osszeg || 0
  const isClosed = keret?.nyilatkozat_lezarva || false
  const iktatoszam = keret?.iktatoszam || null
  const submissionDate = keret?.lezaras_datuma 
    ? new Date(keret.lezaras_datuma).toLocaleDateString("hu-HU")
    : (keret?.created_at ? new Date(keret.created_at).toLocaleDateString("hu-HU") : new Date().toLocaleDateString("hu-HU"))

  // 4. Választott elemek és katalógus
  const { data: choicesData } = await supabase
    .from("hr_cafeteria_valasztas")
    .select(`
      id,
      katalogus_elem_id,
      kert_osszeg,
      levont_keret_osszeg,
      hr_cafeteria_katalogus (
        id,
        nev,
        kategoria,
        szorzo
      )
    `)
    .eq("dolgozo_id", employeeId)
    .eq("ev", year)

  let totalDeducted = 0
  const choices: CafeteriaChoiceItem[] = (choicesData || []).map((c: any) => {
    const item = Array.isArray(c.hr_cafeteria_katalogus)
      ? c.hr_cafeteria_katalogus[0]
      : c.hr_cafeteria_katalogus

    const kert = c.kert_osszeg || 0
    const levont = c.levont_keret_osszeg || 0
    totalDeducted += levont

    return {
      id: c.id,
      nev: item?.nev || "Egyéb juttatási elem",
      kategoria: item?.kategoria || "Béren kívüli juttatás",
      kertOsszeg: kert,
      levontOsszeg: levont,
      szorzo: item?.szorzo || 1.0,
    }
  })

  const remainingBudget = annualBudget - totalDeducted

  return {
    employeeId,
    employeeName,
    year,
    munkakor,
    szervezetiEgyseg,
    annualBudget,
    totalDeducted,
    remainingBudget,
    isClosed,
    submissionDate,
    iktatoszam,
    choices,
  }
}

/**
 * HTML sablon előállítása
 */
export function generateCafeteriaHtml(data: CafeteriaPdfData): string {
  const formatFt = (num: number) =>
    new Intl.NumberFormat("hu-HU", {
      style: "currency",
      currency: "HUF",
      maximumFractionDigits: 0,
    }).format(num)

  const today = new Date().toLocaleDateString("hu-HU")
  const utilizationPercent = data.annualBudget > 0 
    ? Math.min(100, Math.round((data.totalDeducted / data.annualBudget) * 100))
    : 0

  const choicesRows = data.choices.length > 0 
    ? data.choices.map((c, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? "background-color: #f8fafc;" : ""}">
          <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">${idx + 1}.</td>
          <td style="padding: 10px 12px; font-weight: 600; color: #0f172a;">
            ${c.nev}
            <div style="font-size: 11px; font-weight: normal; color: #64748b;">${c.kategoria}</div>
          </td>
          <td style="padding: 10px 12px; text-align: center; color: #475569; font-size: 12px;">${c.szorzo.toFixed(2)}x</td>
          <td style="padding: 10px 12px; text-align: right; color: #1e293b; font-weight: 500;">${formatFt(c.kertOsszeg)}</td>
          <td style="padding: 10px 12px; text-align: right; color: #0f766e; font-weight: 700;">${formatFt(c.levontOsszeg)}</td>
        </tr>
      `).join("")
    : `
        <tr>
          <td colspan="5" style="padding: 24px; text-align: center; color: #94a3b8; font-style: italic;">
            Nincsenek rögzített választási tételek.
          </td>
        </tr>
      `

  return `
<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Cafeteria Nyilatkozat - ${data.year} - ${data.employeeName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 32px 36px;
      font-size: 13px;
      line-height: 1.5;
      background: #ffffff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 16px;
      margin-bottom: 22px;
    }
    .header-left h1 {
      font-size: 20px;
      font-weight: 800;
      color: #0f766e;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .header-left .subtitle {
      font-size: 11px;
      color: #64748b;
      line-height: 1.4;
      max-width: 480px;
    }
    .header-right {
      text-align: right;
    }
    .filing-badge {
      display: inline-block;
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 6px;
      font-family: monospace;
    }
    .status-badge {
      display: inline-block;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      border-radius: 4px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0f766e;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 18px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .data-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 12px;
    }
    .data-row:last-child {
      margin-bottom: 0;
    }
    .data-label {
      color: #64748b;
      font-weight: 500;
    }
    .data-value {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }
    .metric-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      text-align: center;
    }
    .metric-box.primary {
      background: #f0fdfa;
      border-color: #99f6e4;
    }
    .metric-box.highlight {
      background: #ecfdf5;
      border-color: #a7f3d0;
    }
    .metric-label {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .metric-value {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
    }
    .metric-box.primary .metric-value {
      color: #0f766e;
    }
    .metric-box.highlight .metric-value {
      color: #047857;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      font-size: 12px;
    }
    th {
      background: #f1f5f9;
      color: #475569;
      padding: 10px 12px;
      font-weight: 700;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #cbd5e1;
    }
    th.right { text-align: right; }
    th.center { text-align: center; }
    .table-total {
      background: #f8fafc;
      border-top: 2px solid #cbd5e1;
      font-weight: 700;
      font-size: 13px;
    }
    .legal-notice {
      background: #f8fafc;
      border-left: 3px solid #0f766e;
      padding: 12px 14px;
      margin-bottom: 24px;
      border-radius: 0 6px 6px 0;
      font-size: 11px;
      color: #334155;
      line-height: 1.5;
    }
    .legal-notice h4 {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #0f766e;
      margin-bottom: 6px;
    }
    .legal-notice p {
      margin-bottom: 4px;
    }
    .legal-notice p:last-child {
      margin-bottom: 0;
    }
    .signature-area {
      margin-top: 40px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      page-break-inside: avoid;
    }
    .signature-box {
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #475569;
      padding-top: 8px;
      font-size: 12px;
      color: #475569;
      margin-top: 55px;
      font-weight: 600;
    }
    .signature-sub {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 2px;
    }
    .footer {
      margin-top: 35px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>Cafeteria Nyilatkozat – ${data.year}</h1>
      <div class="subtitle">
        A személyi jövedelemadóról szóló 1995. évi CXVII. törvény (Szja tv.) 71. § és a Munkáltatói Cafeteria Szabályzat rendelkezései alapján kiállított hivatalos elszámoló ív.
      </div>
    </div>
    <div class="header-right">
      ${data.iktatoszam ? `
        <div class="filing-badge">IKTATÓSZÁM: ${data.iktatoszam}</div>
      ` : ""}
      <div>
        <span class="status-badge">${data.isClosed ? "Véglegesítve & Lezárva" : "Tervezet / Nyitott"}</span>
      </div>
      <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
        Készült: <strong>${data.submissionDate}</strong>
      </div>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="section-title">1. Munkavállaló Adatai</div>
      <div class="data-row">
        <span class="data-label">Munkavállaló neve:</span>
        <span class="data-value">${data.employeeName}</span>
      </div>
      <div class="data-row">
        <span class="data-label">Munkakör:</span>
        <span class="data-value">${data.munkakor}</span>
      </div>
      <div class="data-row">
        <span class="data-label">Szervezeti egység:</span>
        <span class="data-value">${data.szervezetiEgyseg}</span>
      </div>
    </div>

    <div class="card">
      <div class="section-title">2. Keretgazdálkodás és Jogviszony</div>
      <div class="data-row">
        <span class="data-label">Tárgyév:</span>
        <span class="data-value">${data.year}. naptári év</span>
      </div>
      <div class="data-row">
        <span class="data-label">Nyilatkozat státusza:</span>
        <span class="data-value">${data.isClosed ? "Leadva és elfogadva" : "Szerkesztés alatt"}</span>
      </div>
      <div class="data-row">
        <span class="data-label">Keret-kihasználtság:</span>
        <span class="data-value">${utilizationPercent}%</span>
      </div>
    </div>
  </div>

  <div class="metric-grid">
    <div class="metric-box primary">
      <div class="metric-label">Éves Megállapított Keret</div>
      <div class="metric-value">${formatFt(data.annualBudget)}</div>
    </div>
    <div class="metric-box highlight">
      <div class="metric-label">Választott Elemek Levonása</div>
      <div class="metric-value">${formatFt(data.totalDeducted)}</div>
    </div>
    <div class="metric-box">
      <div class="metric-label">Fennmaradó Keretösszeg</div>
      <div class="metric-value">${formatFt(data.remainingBudget)}</div>
    </div>
  </div>

  <div class="section-title">3. Választott Béren Kívüli és Egyéb Juttatási Elemek Részletezése</div>
  <table>
    <thead>
      <tr>
        <th style="width: 36px;">#</th>
        <th>Juttatási Elem & Kategória</th>
        <th class="center" style="width: 70px;">Szorzó</th>
        <th class="right" style="width: 140px;">Kért Nettó Összeg</th>
        <th class="right" style="width: 140px;">Keretből Levont</th>
      </tr>
    </thead>
    <tbody>
      ${choicesRows}
      <tr class="table-total">
        <td colspan="3" style="padding: 12px; text-align: right; color: #0f172a;">Összesen felhasznált keret:</td>
        <td style="padding: 12px; text-align: right; color: #64748b;">
          ${formatFt(data.choices.reduce((sum, c) => sum + c.kertOsszeg, 0))}
        </td>
        <td style="padding: 12px; text-align: right; color: #0f766e; font-size: 14px;">
          ${formatFt(data.totalDeducted)}
        </td>
      </tr>
    </tbody>
  </table>

  <div class="legal-notice">
    <h4>Munkavállalói Jognyilatkozat és Záradék</h4>
    <p>1. Alulírott munkavállaló kijelentem, hogy a fenti juttatási elemeket a Munkáltató hatályos Cafeteria Szabályzatának megismerése és elfogadása után, saját elhatározásomból választottam ki a rendelkezésemre álló éves keret terhére.</p>
    <p>2. Kijelentem, hogy a választott juttatási elemek igénybevételéhez szükséges törvényes feltételek a részemről maradéktalanul fennállnak, és az adatváltozásokról (pl. tagság, számlaszám) haladéktalanul tájékoztatom a Munkáltatót.</p>
    <p>3. Hozzájárulok ahhoz, hogy a Munkáltató a választott juttatások bruttó költségét a bérszámfejtés során a megállapított keretem terhére érvényesítse.</p>
    <p>4. Tudomásul veszem, hogy a nyilatkozat lezárását követően a választás év közben csak a jogszabályban és a szabályzatban meghatározott esetekben (pl. jogviszony megszűnés, gyes/tgyás) módosítható.</p>
  </div>

  <div class="signature-area">
    <div class="signature-box">
      <div class="signature-line">Munkáltató Képviselője</div>
      <div class="signature-sub">Jóváhagyó HR / Cégvezetés</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">${data.employeeName}</div>
      <div class="signature-sub">Munkavállaló saját kezű aláírása</div>
    </div>
  </div>

  <div class="footer">
    <span>eaisyHR & eaisyDocs – Integrált Munkaügyi és Iratkezelő Rendszer</span>
    <span>Irattári tétel: 3.1 (HR és Munkaügyi iratok) • Kiállítva: ${today}</span>
  </div>
</body>
</html>
  `
}

/**
 * Legenerálja a Cafeteria nyilatkozat PDF buffert és a szabványos fájlnevet.
 */
export async function generateCafeteriaPdfBuffer(
  supabase: SupabaseClient,
  employeeId: string,
  year: number
): Promise<{ buffer: Buffer; fileName: string; data: CafeteriaPdfData }> {
  const data = await fetchCafeteriaPdfData(supabase, employeeId, year)
  const html = generateCafeteriaHtml(data)

  const browser = await launchPdfBrowser()
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: "networkidle0" as any })
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "15px", bottom: "15px", left: "15px", right: "15px" },
  })
  await browser.close()

  const safeName = (data.employeeName || "Munkavallalo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
  const fileName = `cafeteria_nyilatkozat_${year}_${safeName}.pdf`

  return {
    buffer: Buffer.from(pdfBuffer),
    fileName,
    data,
  }
}
