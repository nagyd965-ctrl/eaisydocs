import { SupabaseClient } from "@supabase/supabase-js"
import { launchPdfBrowser } from "@/utils/pdf-browser"

export interface StudyContractPdfData {
  id: string
  contractNumber: string
  employeeId: string
  employeeName: string
  szuletesiHely: string
  szuletesiDatum: string
  anyjaNeve: string
  lakcim: string
  tajSzam: string
  adoazonosito: string
  munkakor: string
  kepzesNeve: string
  intezmenyNeve: string
  kepzesSzintje: string
  koltseg: number
  vallaltHonap: number
  lejaratDatuma: string
  visszafizetesiKotelezettseg: boolean
  munkaidoKedvezmeny: string
  iktatoszam?: string | null
  cegNev: string
  cegSzekhely: string
  cegAdoszam: string
  cegCegjegyzekszam: string
  cegKepviselo: string
  datum: string
}

/**
 * Lekérdezi a tanulmányi szerződés előállításához szükséges adatokat.
 */
export async function fetchStudyContractPdfData(
  supabase: SupabaseClient,
  contractId: string
): Promise<StudyContractPdfData> {
  const { data: contract, error: contractErr } = await supabase
    .from("hr_tanulmanyi_szerzodes")
    .select("*")
    .eq("id", contractId)
    .single()

  if (contractErr || !contract) {
    throw new Error(`Tanulmányi szerződés nem található (id: ${contractId})`)
  }

  const employeeId = contract.dolgozo_id

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
    .select("szuletesi_hely, szuletesi_ido, anyja_neve, lakcim, taj_szam, adoazonosito_jel")
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

  // 4. Cégadatok a beállításokból
  let cegNev = "eaisyDocs Vállalati Rendszerek Zrt."
  let cegSzekhely = "1054 Budapest, Szabadság tér 7."
  let cegAdoszam = "12345678-2-41"
  let cegCegjegyzekszam = "01-10-123456"
  let cegKepviselo = "Vezérigazgató / Munkáltatói jogkör gyakorlója"

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
    // Használjuk a default adatokat
  }

  const creationDate = contract.created_at
    ? new Date(contract.created_at).toLocaleDateString("hu-HU")
    : new Date().toLocaleDateString("hu-HU")

  const contractNumber =
    contract.szerzodes_szam ||
    contract.iktatoszam ||
    `TSZ-${new Date().getFullYear()}/${contract.id.slice(0, 6).toUpperCase()}`

  return {
    id: contract.id,
    contractNumber,
    employeeId,
    employeeName,
    szuletesiHely: adatlap?.szuletesi_hely || "Budapest",
    szuletesiDatum: adatlap?.szuletesi_ido ? new Date(adatlap.szuletesi_ido).toLocaleDateString("hu-HU") : "–",
    anyjaNeve: adatlap?.anyja_neve || "–",
    lakcim: adatlap?.lakcim || "–",
    tajSzam: adatlap?.taj_szam || "–",
    adoazonosito: adatlap?.adoazonosito_jel || "–",
    munkakor,
    kepzesNeve: contract.kepzes_neve,
    intezmenyNeve: contract.intezmeny_neve || "Akkreditált képző intézmény",
    kepzesSzintje: contract.kepzes_szintje || "Szakmai továbbképzés",
    koltseg: Number(contract.koltseg) || 0,
    vallaltHonap: contract.vallalt_munkaviszony_honap || 12,
    lejaratDatuma: contract.lejarat_datuma ? new Date(contract.lejarat_datuma).toLocaleDateString("hu-HU") : "–",
    visszafizetesiKotelezettseg: contract.visszafizetesi_kotelezettseg !== false,
    munkaidoKedvezmeny:
      contract.munkaido_kedvezmeny ||
      "A kötelező konzultációk és vizsganapok idejére a munkavégzés alóli mentesülés távolléti díj fizetése mellett.",
    iktatoszam: contract.iktatoszam || null,
    cegNev,
    cegSzekhely,
    cegAdoszam,
    cegCegjegyzekszam,
    cegKepviselo,
    datum: creationDate,
  }
}

/**
 * Számformázó Ft-hoz
 */
function formatFt(amount: number): string {
  return amount.toLocaleString("hu-HU") + " Ft"
}

/**
 * Legenerálja a tanulmányi szerződés nyomtatóbarát HTML sablonját (Mt. 229. § alapján)
 */
export function generateStudyContractHtml(data: StudyContractPdfData): string {
  const today = new Date().toLocaleDateString("hu-HU")

  return `
<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Tanulmányi Szerződés - ${data.employeeName}</title>
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
      border-bottom: 2px solid #0f766e;
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
      color: #0f766e;
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
      background: #f0fdfa;
      border: 1px solid #ccfbf1;
      padding: 6px 12px;
      border-radius: 6px;
      color: #0f766e;
      font-weight: 600;
    }

    .title-section {
      text-align: center;
      margin: 16px 0 20px 0;
    }

    .title-section h1 {
      font-size: 17px;
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

    .parties-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 18px;
    }

    .party-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 12px;
      background: #f8fafc;
    }

    .party-title {
      font-size: 11px;
      font-weight: 700;
      color: #0f766e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }

    .party-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 10.5px;
    }

    .party-label {
      color: #64748b;
      font-weight: 500;
    }

    .party-val {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }

    .section {
      margin-bottom: 14px;
    }

    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .section p {
      margin-bottom: 6px;
      text-align: justify;
    }

    .highlight-card {
      background: #f0fdfa;
      border-left: 3px solid #0f766e;
      padding: 10px 12px;
      border-radius: 0 6px 6px 0;
      margin: 10px 0;
      font-size: 11px;
    }

    .highlight-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 10px 0;
    }

    .stat-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      background: #ffffff;
      text-align: center;
    }

    .stat-label {
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 3px;
    }

    .stat-val {
      font-size: 13px;
      font-weight: 800;
      color: #0f766e;
    }

    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 30px;
      padding-top: 10px;
    }

    .sign-box {
      text-align: center;
    }

    .sign-line {
      border-top: 1px dotted #475569;
      margin-top: 40px;
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
      <div class="brand-subtitle">Munkaügyi és Képzési Nyilvántartás • eaisyHR</div>
    </div>
    <div class="filing-badge">
      ${data.iktatoszam ? `Iktatószám: <b>${data.iktatoszam}</b>` : `Azonosító: <b>${data.contractNumber}</b>`}<br/>
      <span>Irattári tétel: 3.1 (HR és munkaügyi iratok)</span>
    </div>
  </div>

  <div class="title-section">
    <h1>TANULMÁNYI SZERZŐDÉS</h1>
    <p>amely létrejött a Munka Törvénykönyvéről szóló 2012. évi I. törvény (Mt.) 229. §-a alapján alulírott felek között</p>
  </div>

  <div class="parties-grid">
    <div class="party-box">
      <div class="party-title">1. Munkáltató</div>
      <div class="party-row">
        <span class="party-label">Cégnév:</span>
        <span class="party-val">${data.cegNev}</span>
      </div>
      <div class="party-row">
        <span class="party-label">Székhely:</span>
        <span class="party-val">${data.cegSzekhely}</span>
      </div>
      <div class="party-row">
        <span class="party-label">Cégjegyzékszám:</span>
        <span class="party-val">${data.cegCegjegyzekszam}</span>
      </div>
      <div class="party-row">
        <span class="party-label">Adószám:</span>
        <span class="party-val">${data.cegAdoszam}</span>
      </div>
      <div class="party-row">
        <span class="party-label">Képviselő:</span>
        <span class="party-val">${data.cegKepviselo}</span>
      </div>
    </div>

    <div class="party-box">
      <div class="party-title">2. Munkavállaló</div>
      <div class="party-row">
        <span class="party-label">Név:</span>
        <span class="party-val">${data.employeeName}</span>
      </div>
      <div class="party-row">
        <span class="party-label">Szül. hely, idő:</span>
        <span class="party-val">${data.szuletesiHely}, ${data.szuletesiDatum}</span>
      </div>
      <div class="party-row">
        <span class="party-label">Anyja neve:</span>
        <span class="party-val">${data.anyjaNeve}</span>
      </div>
      <div class="party-row">
        <span class="party-label">Lakcím:</span>
        <span class="party-val">${data.lakcim}</span>
      </div>
      <div class="party-row">
        <span class="party-label">Munkakör:</span>
        <span class="party-val">${data.munkakor}</span>
      </div>
    </div>
  </div>

  <div class="highlight-grid">
    <div class="stat-card">
      <div class="stat-label">Támogatás összege</div>
      <div class="stat-val">${data.koltseg > 0 ? formatFt(data.koltseg) : "Költségmentes"}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Vállalt munkaviszony</div>
      <div class="stat-val">${data.vallaltHonap} hónap</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Tanulmányok vége</div>
      <div class="stat-val">${data.lejaratDatuma}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">1. A tanulmányok meghatározása</div>
    <p>
      1.1. Munkáltató és Munkavállaló megállapodnak abban, hogy a Munkavállaló a Munkáltató támogatásával részt vesz az alábbi képzésen:
    </p>
    <div class="highlight-card">
      <b>Képzés megnevezése:</b> ${data.kepzesNeve}<br/>
      <b>Képző intézmény / szolgáltató:</b> ${data.intezmenyNeve}<br/>
      <b>Képzés szintje / jellege:</b> ${data.kepzesSzintje}<br/>
      <b>A képzés tervezett befejezése / vizsgaidőpont:</b> ${data.lejaratDatuma}
    </div>
  </div>

  <div class="section">
    <div class="section-title">2. A Munkáltató kötelezettségvállalása</div>
    <p>
      2.1. <b>Anyagi támogatás:</b> A Munkáltató vállalja, hogy a fenti képzés költségeihez hozzájárul, és a képző intézmény által kiállított számla alapján megfizeti a képzés díját <b>${formatFt(data.koltseg)}</b> összegben.
    </p>
    <p>
      2.2. <b>Munkaidő-kedvezmény:</b> A Munkáltató a tanulmányok folytatásához, a kötelező konzultációkon és foglalkozásokon való részvételhez, valamint a vizsgákra való felkészüléshez az alábbi munkaidő-kedvezményt biztosítja:
    </p>
    <div class="highlight-card">
      ${data.munkaidoKedvezmeny}
    </div>
  </div>

  <div class="section">
    <div class="section-title">3. A Munkavállaló kötelezettségvállalása</div>
    <p>
      3.1. A Munkavállaló kötelezi magát arra, hogy a képzésben aktívan, rendszeresen részt vesz, a tanulmányi és vizsgakövetelményeknek eleget tesz, és a tanulmányok sikeres befejezését (bizonyítvány, oklevél, tanúsítvány megszerzését) követő 8 munkanapon belül az ezt igazoló dokumentum másolatát a Munkáltató részére bemutatja.
    </p>
    <p>
      3.2. A Munkavállaló kötelezi magát arra, hogy a képesítés / végzettség megszerzésétől számított <b>${data.vallaltHonap} hónap</b> (legfeljebb 3 év) időtartamban a Munkáltatóval fennálló munkaviszonyát fenntartja, azt munkavállalói felmondással nem szünteti meg.
    </p>
  </div>

  <div class="section">
    <div class="section-title">4. Visszafizetési kötelezettség és jogkövetkezmények (Mt. 229. § (5)–(6) bek.)</div>
    ${
      data.visszafizetesiKotelezettseg
        ? `
    <p>
      4.1. Amennyiben a Munkavállaló a tanulmányait felróható okból nem fejezi be, vagy a szerződésben vállalt ${data.vallaltHonap} hónapos időtartam lejárta előtt a munkaviszonyát felmondással, vagy a Munkáltató által jogszerűen gyakorolt azonnali hatályú felmondással megszünteti, <b>köteles a Munkáltató által kifizetett támogatás összegét időarányosan visszatéríteni</b>.
    </p>
    <p>
      4.2. A visszafizetési kötelezettség mértéke arányos a vállalt munkaviszonyból még le nem dolgozott idővel. A visszatérítést a munkaviszony megszűnésétől, illetve a tanulmányok abbahagyásától számított 30 napon belül köteles teljesíteni a Munkáltató bankszámlájára.
    </p>
    <p>
      4.3. Mentesül a Munkavállaló a visszafizetési kötelezettség alól, ha a munkaviszony a Munkáltató érdekkörében felmerült okból (pl. létszámleépítés, minőségi csere miatti munkáltatói felmondás) szűnik meg, vagy ha a Munkavállaló a munkaviszonyát a Munkáltató súlyos szerződésszegése miatt azonnali hatállyal szünteti meg.
    </p>
    `
        : `
    <p>
      4.1. A felek kifejezetten megállapodnak abban, hogy a Munkáltató a képzés díját teljes mértékben saját kockázatára viseli, és a Munkavállalóval szemben semmilyen jogcímen nem érvényesít visszafizetési igényt a munkaviszony esetleges megszűnése esetén sem.
    </p>
    `
    }
  </div>

  <div class="section">
    <div class="section-title">5. Záró rendelkezések</div>
    <p>
      5.1. A jelen szerződésben nem szabályozott kérdésekben a Munka Törvénykönyvéről szóló 2012. évi I. törvény rendelkezései az irányadók.
    </p>
    <p>
      5.2. A jelen szerződés két egymással megegyező eredeti példányban készült, amelyet a felek elolvasás és értelmezés után, mint akaratukkal mindenben megegyezőt, jóváhagyólag írtak alá.
    </p>
  </div>

  <div style="margin-top: 14px; font-size: 11px;">
    Kelt: Budapest, ${data.datum}
  </div>

  <div class="signatures">
    <div class="sign-box">
      <div class="sign-line">${data.cegNev}</div>
      <div class="sign-sub">Munkáltató képviseletében</div>
    </div>
    <div class="sign-box">
      <div class="sign-line">${data.employeeName}</div>
      <div class="sign-sub">Munkavállaló</div>
    </div>
  </div>

  <div class="footer">
    <span>eaisyHR & eaisyDocs Integrált Rendszer • Mt. 229. § jogszabályi megfelelőség</span>
    <span>Nyomtatva: ${today} • Elektronikus iratpéldány</span>
  </div>
</body>
</html>
  `
}

/**
 * Legenerálja a Tanulmányi Szerződés PDF buffert és a szabványos fájlnevet.
 */
export async function generateStudyContractPdfBuffer(
  supabase: SupabaseClient,
  contractId: string
): Promise<{ buffer: Buffer; fileName: string; data: StudyContractPdfData }> {
  const data = await fetchStudyContractPdfData(supabase, contractId)
  const html = generateStudyContractHtml(data)

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
  const fileName = `tanulmanyi_szerzodes_${safeName}_${data.id.slice(0, 8)}.pdf`

  return {
    buffer: Buffer.from(pdfBuffer),
    fileName,
    data,
  }
}
