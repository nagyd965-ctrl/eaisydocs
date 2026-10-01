import { SupabaseClient } from "@supabase/supabase-js"
import { launchPdfBrowser } from "@/utils/pdf-browser"

export interface DisciplinaryPdfData {
  id: string
  decisionNumber: string
  employeeId: string
  employeeName: string
  szuletesiHely: string
  szuletesiDatum: string
  anyjaNeve: string
  lakcim: string
  tajSzam: string
  munkakor: string
  tipus: "figyelmeztetes" | "megrovas" | "karterites" | "egyeb" | string
  tipusLabel: string
  datum: string
  indoklas: string
  karOsszeg?: number | null
  reszletfizetesLeiras?: string | null
  jogorvoslatHatarido?: string | null
  atvetelDatuma?: string | null
  iktatoszam?: string | null
  cegNev: string
  cegSzekhely: string
  cegAdoszam: string
  cegCegjegyzekszam: string
  cegKepviselo: string
}

const TIPUS_TITLES: Record<string, { title: string; legalRef: string; actionText: string }> = {
  figyelmeztetes: {
    title: "MUNKÁLTATÓI ÍRÁSBELI FIGYELMEZTETÉS",
    legalRef: "a Munka Törvénykönyvéről szóló 2012. évi I. törvény (Mt.) 56. §-a alapján",
    actionText: "írásbeli figyelmeztetésben részesíti",
  },
  megrovas: {
    title: "MUNKÁLTATÓI ÍRÁSBELI MEGROVÁS",
    legalRef: "a Munka Törvénykönyvéről szóló 2012. évi I. törvény (Mt.) 56. §-a alapján",
    actionText: "írásbeli megrovásban részesíti",
  },
  karterites: {
    title: "KÁRTÉRÍTÉSI FIZETÉSI FELSZÓLÍTÁS ÉS HATÁROZAT",
    legalRef: "a Munka Törvénykönyvéről szóló 2012. évi I. törvény (Mt.) 179. §-a alapján",
    actionText: "kártérítés megfizetésére kötelezi",
  },
  egyeb: {
    title: "MUNKÁLTATÓI INTÉZKEDÉS ÉS HATÁROZAT",
    legalRef: "a Munka Törvénykönyvéről szóló 2012. évi I. törvény (Mt.) rendelkezései alapján",
    actionText: "munkáltatói intézkedést alkalmaz",
  },
}

/**
 * Lekérdezi a fegyelmi határozat PDF előállításához szükséges adatokat.
 */
export async function fetchDisciplinaryPdfData(
  supabase: SupabaseClient,
  disciplinaryId: string
): Promise<DisciplinaryPdfData> {
  const { data: item, error: itemErr } = await supabase
    .from("hr_fegyelmi")
    .select("*")
    .eq("id", disciplinaryId)
    .single()

  if (itemErr || !item) {
    throw new Error(`Fegyelmi rekord nem található (id: ${disciplinaryId})`)
  }

  const employeeId = item.dolgozo_id

  // 1. Profil adatok
  let profileData: { id?: string; nev?: string; email?: string } | null = null
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("id, nev, email")
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
        .select("id, nev, email")
        .eq("id", employeeId)
        .maybeSingle()
      if (adminProfile) profileData = adminProfile
    } catch (e) {
      console.warn("Admin profil lekérési figyelmeztetés:", e)
    }
  }

  const employeeName = profileData?.nev || "Munkavállaló"

  // 2. Dolgozó személyes adatai
  const { data: adatlap } = await supabase
    .from("hr_dolgozo_adatlap")
    .select("szuletesi_hely, szuletesi_ido, anyja_neve, lakcim, taj_szam")
    .eq("id", employeeId)
    .maybeSingle()

  // 3. Munkakör aktív jogviszonyból
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

  // 4. Cégadatok
  let cegNev = "eaisyDocs Vállalati Rendszerek Zrt."
  let cegSzekhely = "1054 Budapest, Szabadság tér 7."
  let cegAdoszam = "12345678-2-41"
  let cegCegjegyzekszam = "01-10-123456"
  let cegKepviselo = "Munkáltatói jogkör gyakorlója"

  try {
    const { data: settings } = await supabase
      .from("rendszer_beallitasok")
      .select("cegnev, ceg_cim, ceg_adoszam")
      .limit(1)
      .maybeSingle()

    if (settings) {
      if (settings.cegnev) cegNev = settings.cegnev
      if (settings.ceg_cim) cegSzekhely = settings.ceg_cim
      if (settings.ceg_adoszam) cegAdoszam = settings.ceg_adoszam
    }
  } catch (e) {
    // Default fallback
  }

  const tipus = item.tipus || "figyelmeztetes"
  const tipusLabel = TIPUS_TITLES[tipus]?.title || "MUNKÁLTATÓI HATÁROZAT"
  const decisionNumber =
    item.hatarozat_szam ||
    item.iktatoszam ||
    `FEGY-${new Date().getFullYear()}/${item.id.slice(0, 6).toUpperCase()}`

  const eventDate = item.datum
    ? new Date(item.datum).toLocaleDateString("hu-HU")
    : new Date().toLocaleDateString("hu-HU")

  return {
    id: item.id,
    decisionNumber,
    employeeId,
    employeeName,
    szuletesiHely: adatlap?.szuletesi_hely || "Budapest",
    szuletesiDatum: adatlap?.szuletesi_ido ? new Date(adatlap.szuletesi_ido).toLocaleDateString("hu-HU") : "–",
    anyjaNeve: adatlap?.anyja_neve || "–",
    lakcim: adatlap?.lakcim || "–",
    tajSzam: adatlap?.taj_szam || "–",
    munkakor,
    tipus,
    tipusLabel,
    datum: eventDate,
    indoklas: item.indoklas,
    karOsszeg: item.kar_osszeg ? Number(item.kar_osszeg) : null,
    reszletfizetesLeiras: item.reszletfizetes_leiras || null,
    jogorvoslatHatarido: item.jogorvoslat_hatarido
      ? new Date(item.jogorvoslat_hatarido).toLocaleDateString("hu-HU")
      : null,
    atvetelDatuma: item.atvetel_datuma
      ? new Date(item.atvetel_datuma).toLocaleDateString("hu-HU")
      : null,
    iktatoszam: item.iktatoszam || null,
    cegNev,
    cegSzekhely,
    cegAdoszam,
    cegCegjegyzekszam,
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
 * Legenerálja a fegyelmi határozat / kártérítési felszólítás nyomtatási HTML sablonját
 */
export function generateDisciplinaryHtml(data: DisciplinaryPdfData): string {
  const meta = TIPUS_TITLES[data.tipus] || TIPUS_TITLES.figyelmeztetes
  const today = new Date().toLocaleDateString("hu-HU")
  const isKarterites = data.tipus === "karterites"

  return `
<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>${meta.title} - ${data.employeeName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
    
    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Montserrat', sans-serif;
      color: #1e293b;
      background: #ffffff;
      font-size: 11.5px;
      line-height: 1.55;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid ${isKarterites ? "#b91c1c" : "#0f766e"};
      padding-bottom: 12px;
      margin-bottom: 16px;
    }

    .brand {
      display: flex;
      flex-direction: column;
    }

    .brand-title {
      font-size: 18px;
      font-weight: 800;
      color: ${isKarterites ? "#b91c1c" : "#0f766e"};
      letter-spacing: -0.5px;
    }

    .brand-subtitle {
      font-size: 10px;
      color: #64748b;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 2px;
    }

    .filing-badge {
      text-align: right;
      font-size: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 6px 12px;
      border-radius: 6px;
      color: #334155;
      font-weight: 600;
    }

    .filing-badge b {
      color: ${isKarterites ? "#b91c1c" : "#0f766e"};
    }

    .title-section {
      text-align: center;
      margin: 18px 0 22px 0;
    }

    .title-section h1 {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .title-section p {
      font-size: 11px;
      color: #475569;
      font-style: italic;
    }

    .person-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 18px;
    }

    .person-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 16px;
      font-size: 10.5px;
    }

    .person-label {
      color: #64748b;
      font-weight: 500;
    }

    .person-val {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }

    .decision-box {
      background: ${isKarterites ? "#fef2f2" : "#f0fdfa"};
      border-left: 4px solid ${isKarterites ? "#dc2626" : "#0f766e"};
      padding: 12px 14px;
      border-radius: 0 6px 6px 0;
      margin-bottom: 18px;
      font-size: 12px;
      font-weight: 600;
      color: #0f172a;
      line-height: 1.6;
    }

    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }

    .section-content {
      margin-bottom: 16px;
      text-align: justify;
      white-space: pre-wrap;
    }

    .remedy-box {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 14px;
      border-radius: 0 6px 6px 0;
      margin: 18px 0;
      font-size: 11px;
      color: #78350f;
      line-height: 1.55;
    }

    .remedy-title {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10.5px;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      color: #92400e;
    }

    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 32px;
      padding-top: 10px;
    }

    .sign-box {
      text-align: center;
    }

    .sign-line {
      border-top: 1px dotted #475569;
      margin-top: 42px;
      padding-top: 6px;
      font-size: 10.5px;
      font-weight: 600;
      color: #334155;
    }

    .sign-sub {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 2px;
    }

    .receipt-clause {
      margin-top: 24px;
      border: 1px dashed #cbd5e1;
      padding: 10px 14px;
      border-radius: 6px;
      background: #f8fafc;
      font-size: 10.5px;
      color: #475569;
    }

    .footer {
      margin-top: 24px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-title">${data.cegNev}</div>
      <div class="brand-subtitle">Munkaügyi és Fegyelmi Határozatok Tára • eaisyHR</div>
    </div>
    <div class="filing-badge">
      ${data.iktatoszam ? `Iktatószám: <b>${data.iktatoszam}</b>` : `Iktatási azonosító: <b>${data.decisionNumber}</b>`}<br/>
      <span>Irattári tétel: 3.1 • Megőrzési idő: 5 év (Mt. 286. §)</span>
    </div>
  </div>

  <div class="title-section">
    <h1>${meta.title}</h1>
    <p>${meta.legalRef}</p>
  </div>

  <div class="person-card">
    <div style="font-size: 11px; font-weight: 700; color: #0f766e; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
      Érintett Munkavállaló Adatai
    </div>
    <div class="person-grid">
      <div style="display: flex; justify-content: space-between;">
        <span class="person-label">Név:</span>
        <span class="person-val">${data.employeeName}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span class="person-label">Munkakör:</span>
        <span class="person-val">${data.munkakor}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span class="person-label">Születési hely, idő:</span>
        <span class="person-val">${data.szuletesiHely}, ${data.szuletesiDatum}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span class="person-label">Anyja neve:</span>
        <span class="person-val">${data.anyjaNeve}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span class="person-label">Lakcím:</span>
        <span class="person-val">${data.lakcim}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span class="person-label">Intézkedés napja:</span>
        <span class="person-val">${data.datum}</span>
      </div>
    </div>
  </div>

  <div class="decision-box">
    I. RENDELKEZŐ RÉSZ<br/>
    <span style="font-weight: 400; font-size: 11.5px; display: block; margin-top: 4px;">
      A Munkáltató a Munka Törvénykönyvéről szóló 2012. évi I. törvény felhatalmazása alapján a fent nevezett Munkavállalót a munkaviszonyával összefüggő kötelezettségszegés miatt
      <b> ${meta.actionText}</b>${isKarterites && data.karOsszeg ? `, és kötelezi a munkáltatónak okozott <b>${formatFt(data.karOsszeg)}</b> kár megfizetésére` : ""}.
    </span>
    ${
      isKarterites && data.reszletfizetesLeiras
        ? `
      <div style="margin-top: 6px; font-size: 11px; font-weight: 500; color: #7f1d1d;">
        <b>Fizetési feltételek / levonási ütemezés:</b> ${data.reszletfizetesLeiras}
      </div>
    `
        : ""
    }
  </div>

  <div>
    <div class="section-title">II. Indoklás és Tényállás</div>
    <div class="section-content">
${data.indoklas}
    </div>
  </div>

  <div class="remedy-box">
    <div class="remedy-title">III. Jogorvoslati Tájékoztató (Mt. 285. § (1) bek.)</div>
    Tájékoztatom a Munkavállalót, hogy a jelen határozat ellen a kézbesítéstől számított <b>30 (harminc) napon belül</b> keresettel fordulhat az illetékes Törvényszék Munkaügyi Kollégiumához. A keresetlevelet az illetékes bírósághoz kell benyújtani. Kártérítés megfizetésére kötelezés esetén a keresetlevél benyújtásának a határozat végrehajtására <b>halasztó hatálya van</b>.
  </div>

  <div style="margin-top: 14px; font-size: 11px;">
    Kelt: Budapest, ${today}
  </div>

  <div class="signatures">
    <div class="sign-box">
      <div class="sign-line">${data.cegNev}</div>
      <div class="sign-sub">Munkáltatói jogkör gyakorlója</div>
    </div>
    <div class="sign-box">
      <div class="sign-line">${data.employeeName}</div>
      <div class="sign-sub">Munkavállaló (Átvevő)</div>
    </div>
  </div>

  <div class="receipt-clause">
    <b>Kézbesítési záradék:</b> A jelen határozat egy eredeti példányát a mai napon átvettem, a jogorvoslati tájékoztatást megértettem és tudomásul vettem.<br/>
    Átvétel dátuma: ${data.atvetelDatuma || "20.... év ................ hó ..... nap"} &nbsp;&nbsp;&nbsp;&nbsp; Munkavállaló kézjegye: .....................................................
  </div>

  <div class="footer">
    <span>eaisyHR & eaisyDocs Rendszer • Mt. 56. § & 179. § Jogi Megfelelőség</span>
    <span>Nyomtatva: ${today} • Szigorúan Bizalmas HR Irat</span>
  </div>
</body>
</html>
  `
}

/**
 * Legenerálja a fegyelmi határozat PDF buffert és fájlnevet.
 */
export async function generateDisciplinaryPdfBuffer(
  supabase: SupabaseClient,
  disciplinaryId: string
): Promise<{ buffer: Buffer; fileName: string; data: DisciplinaryPdfData }> {
  const data = await fetchDisciplinaryPdfData(supabase, disciplinaryId)
  const html = generateDisciplinaryHtml(data)

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
  const fileName = `fegyelmi_hatarozat_${safeName}_${data.id.slice(0, 8)}.pdf`

  return {
    buffer: Buffer.from(pdfBuffer),
    fileName,
    data,
  }
}
