import { SupabaseClient } from "@supabase/supabase-js"
import { launchPdfBrowser } from "@/utils/pdf-browser"

export interface AwardCertificatePdfData {
  id: string
  employeeId: string
  employeeName: string
  munkakor: string
  megnevezes: string
  kategoria: string
  kategoriaLabel: string
  datum: string
  adomanyozo: string
  indoklas: string
  jutalomOsszeg?: number | null
  iktatoszam?: string | null
  cegNev: string
  cegSzekhely: string
  cegKepviselo: string
}

export const KATEGORIA_LABELS: Record<string, string> = {
  vallalati_dij: "Vállalati Kiválósági Díj",
  szakmai_innovacio: "Szakmai és Technológiai Innováció",
  projekt_kivalosag: "Kiemelkedő Projekt Teljesítmény",
  jubileum: "Törzsgárda és Jubileumi Elismerés",
  csapatmunka: "Kiemelkedő Csapatmunka és Együttműködés",
  vezeto_dicseret: "Vezérigazgatói Dicséret",
  egyeb: "Szakmai Elismerés",
}

/**
 * Lekérdezi az elismerő oklevél PDF-hez szükséges adatokat.
 */
export async function fetchAwardCertificatePdfData(
  supabase: SupabaseClient,
  awardId: string
): Promise<AwardCertificatePdfData> {
  const { data: item, error: itemErr } = await supabase
    .from("hr_kituntetes")
    .select("*")
    .eq("id", awardId)
    .single()

  if (itemErr || !item) {
    throw new Error(`Kitüntetés rekord nem található (id: ${awardId})`)
  }

  const employeeId = item.dolgozo_id

  // 1. Profil adatok
  let profileData: { id?: string; nev?: string } | null = null
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("id, nev")
    .eq("id", employeeId)
    .maybeSingle()

  profileData = profile

  if (!profileData?.nev && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
      const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: adminProfile } = await adminClient
        .from("felhasznalo_profil")
        .select("id, nev")
        .eq("id", employeeId)
        .maybeSingle()
      if (adminProfile) profileData = adminProfile
    } catch (e) {
      console.warn("Admin profil lekérési figyelmeztetés:", e)
    }
  }

  const employeeName = profileData?.nev || "Munkavállaló"

  // 2. Munkakör
  let munkakor = "Munkatárs"
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
    munkakor = beosztas?.hr_munkakor?.megnevezes || "Munkatárs"
  }

  // 3. Cégadatok
  let cegNev = "eaisyDocs Vállalati Rendszerek Zrt."
  let cegSzekhely = "1054 Budapest, Szabadság tér 7."
  const cegKepviselo = "Vezérigazgató"

  try {
    const { data: settings } = await supabase
      .from("rendszer_beallitasok")
      .select("cegnev, ceg_cim")
      .limit(1)
      .maybeSingle()

    if (settings) {
      if (settings.cegnev) cegNev = settings.cegnev
      if (settings.ceg_cim) cegSzekhely = settings.ceg_cim
    }
  } catch (e) {
    // Default fallback
  }

  const awardDate = item.datum
    ? new Date(item.datum).toLocaleDateString("hu-HU")
    : new Date().toLocaleDateString("hu-HU")

  const kategoriaLabel = KATEGORIA_LABELS[item.kategoria] || "Szakmai Elismerés"

  return {
    id: item.id,
    employeeId,
    employeeName,
    munkakor,
    megnevezes: item.megnevezes,
    kategoria: item.kategoria,
    kategoriaLabel,
    datum: awardDate,
    adomanyozo: item.adomanyozo || "A Menedzsment nevében",
    indoklas: item.indoklas,
    jutalomOsszeg: item.jutalom_osszeg ? Number(item.jutalom_osszeg) : null,
    iktatoszam: item.iktatoszam || null,
    cegNev,
    cegSzekhely,
    cegKepviselo,
  }
}

/**
 * Számformázó Ft-hoz
 */
function formatFt(amount: number): string {
  return amount.toLocaleString("hu-HU") + " Ft"
}

/**
 * Legenerálja a díszes elismerő oklevél nyomtatási HTML sablonját (fekvő A4)
 */
export function generateAwardCertificateHtml(data: AwardCertificatePdfData): string {
  return `
<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Elismerő Oklevél - ${data.employeeName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Montserrat:wght@400;500;600;700&display=swap');
    
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Montserrat', sans-serif;
      color: #0f172a;
      background: #ffffff;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .certificate-container {
      width: 100%;
      height: 185mm;
      border: 4px solid #0f766e;
      outline: 1.5px solid #d97706;
      outline-offset: -10px;
      padding: 24px 36px;
      background: radial-gradient(circle at center, #ffffff 60%, #f0fdfa 100%);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }

    .corner-dec {
      position: absolute;
      width: 28px;
      height: 28px;
      border-color: #d97706;
    }
    .corner-tl { top: 12px; left: 12px; border-top: 3px solid #d97706; border-left: 3px solid #d97706; }
    .corner-tr { top: 12px; right: 12px; border-top: 3px solid #d97706; border-right: 3px solid #d97706; }
    .corner-bl { bottom: 12px; left: 12px; border-bottom: 3px solid #d97706; border-left: 3px solid #d97706; }
    .corner-br { bottom: 12px; right: 12px; border-bottom: 3px solid #d97706; border-right: 3px solid #d97706; }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .brand-name {
      font-size: 13px;
      font-weight: 700;
      color: #0f766e;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .filing-seal {
      text-align: right;
      font-size: 9px;
      color: #64748b;
      font-family: 'Montserrat', sans-serif;
    }

    .filing-seal b {
      color: #0f766e;
    }

    .center-content {
      text-align: center;
      margin: 6px 0;
    }

    .cert-sub {
      font-size: 11px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #d97706;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .cert-title {
      font-family: 'Cinzel', serif;
      font-size: 32px;
      font-weight: 900;
      color: #0f766e;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 12px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .award-name-badge {
      display: inline-block;
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      background: #fef3c7;
      border: 1px solid #fde68a;
      padding: 6px 20px;
      border-radius: 20px;
      letter-spacing: 0.5px;
      margin-bottom: 14px;
    }

    .presented-to {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #64748b;
      margin-bottom: 4px;
    }

    .recipient-name {
      font-family: 'Cinzel', serif;
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 2px solid #0f766e;
      display: inline-block;
      padding-bottom: 4px;
      margin-bottom: 4px;
      min-width: 320px;
    }

    .recipient-role {
      font-size: 11px;
      font-weight: 600;
      color: #475569;
      margin-bottom: 12px;
    }

    .citation {
      font-size: 11.5px;
      color: #334155;
      line-height: 1.6;
      max-width: 680px;
      margin: 0 auto;
      font-style: italic;
    }

    .reward-box {
      margin-top: 10px;
      font-size: 11px;
      font-weight: 700;
      color: #047857;
    }

    .signatures-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 0 40px 10px 40px;
    }

    .sign-col {
      text-align: center;
      width: 200px;
    }

    .sign-line {
      border-top: 1px solid #475569;
      padding-top: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
    }

    .sign-sub {
      font-size: 9.5px;
      color: #64748b;
    }

    .seal-circle {
      width: 64px;
      height: 64px;
      border: 2px dashed #d97706;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      color: #d97706;
      letter-spacing: 0.5px;
      text-align: center;
      line-height: 1.2;
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    <div class="corner-dec corner-tl"></div>
    <div class="corner-dec corner-tr"></div>
    <div class="corner-dec corner-bl"></div>
    <div class="corner-dec corner-br"></div>

    <div class="header">
      <div class="brand-name">${data.cegNev}</div>
      <div class="filing-seal">
        ${data.iktatoszam ? `Iktatószám: <b>${data.iktatoszam}</b>` : `Azonosító: <b>OKL-${data.id.slice(0, 8).toUpperCase()}</b>`}<br/>
        <span>Irattári tétel: 3.1 • eaisyDocs Személyi Dosszié</span>
      </div>
    </div>

    <div class="center-content">
      <div class="cert-sub">${data.kategoriaLabel}</div>
      <div class="cert-title">ELISMERŐ OKLEVÉL</div>

      <div class="award-name-badge">
        ★ ${data.megnevezes} ★
      </div>

      <div class="presented-to">Tisztelettel adományozva</div>
      <div class="recipient-name">${data.employeeName}</div>
      <div class="recipient-role">${data.munkakor}</div>

      <div class="citation">
        „${data.indoklas}”
      </div>

      ${data.jutalomOsszeg && data.jutalomOsszeg > 0 ? `
        <div class="reward-box">
          Adományozott pénzjutalom: ${formatFt(data.jutalomOsszeg)}
        </div>
      ` : ""}
    </div>

    <div class="signatures-row">
      <div class="sign-col">
        <div class="sign-line">${data.datum}</div>
        <div class="sign-sub">Kelt (Dátum)</div>
      </div>

      <div class="seal-circle">
        HIVATALOS<br/>ELISMERÉS<br/>★ ★ ★
      </div>

      <div class="sign-col">
        <div class="sign-line">${data.adomanyozo}</div>
        <div class="sign-sub">${data.cegKepviselo}</div>
      </div>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Legenerálja az elismerő oklevél PDF buffert (fekvő formátum).
 */
export async function generateAwardCertificatePdfBuffer(
  supabase: SupabaseClient,
  awardId: string
): Promise<{ buffer: Buffer; fileName: string; data: AwardCertificatePdfData }> {
  const data = await fetchAwardCertificatePdfData(supabase, awardId)
  const html = generateAwardCertificateHtml(data)

  const browser = await launchPdfBrowser()
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: "networkidle0" as any })
  const pdfBuffer = await page.pdf({
    format: "A4",
    landscape: true,
    printBackground: true,
    margin: { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" },
  })
  await browser.close()

  const safeName = (data.employeeName || "Munkavallalo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
  const fileName = `elismero_oklevel_${safeName}_${data.id.slice(0, 8)}.pdf`

  return {
    buffer: Buffer.from(pdfBuffer),
    fileName,
    data,
  }
}
