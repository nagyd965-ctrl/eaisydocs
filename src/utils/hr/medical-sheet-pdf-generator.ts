import { SupabaseClient } from "@supabase/supabase-js"
import { launchPdfBrowser } from "@/utils/pdf-browser"

const TIPUS_LABELS: Record<string, string> = {
  elozetes: "Előzetes munkaköri alkalmassági vizsgálat",
  idoszakos: "Időszakos munkaköri alkalmassági vizsgálat",
  soron_kivuli: "Soron kívüli alkalmassági vizsgálat",
  zaro: "Záróvizsgálat",
}

const EREDMENY_LABELS: Record<string, { label: string; desc: string }> = {
  alkalmas: {
    label: "ALKALMAS",
    desc: "A munkavállaló a megjelölt munkakör feladatainak ellátására egészségi szempontból alkalmas.",
  },
  fetelekkel_alkalmas: {
    label: "FELTÉTELEKKEL / KORLÁTOZÁSSAL ALKALMAS",
    desc: "A munkavállaló a megjelölt munkakör feladatainak ellátására meghatározott feltételekkel (pl. korrekciós szemüveg, teheremelési korlátozás) alkalmas.",
  },
  nem_alkalmas: {
    label: "NEM ALKALMAS",
    desc: "A munkavállaló a megjelölt munkakör feladatainak ellátására egészségi szempontból nem alkalmas.",
  },
}

export interface MedicalExaminationData {
  id: string
  dolgozoId: string
  employeeName: string
  szuletesiDatum: string
  anyjaNeve: string
  lakcim: string
  tajSzam: string
  munkakor: string
  feorKod: string
  tipus: string
  tipusLabel: string
  vizsgalatDatuma: string
  ervenyessegDatuma: string
  eredmeny: string
  eredmenyLabel: string
  eredmenyDesc: string
  megjegyzes: string
  orvosNeve: string
  szakrendeles: string
  cegNev: string
  cegCim: string
}

export async function fetchMedicalExaminationData(
  supabase: SupabaseClient,
  orvosiId: string
): Promise<MedicalExaminationData> {
  const { data: orvosi, error: orvosiErr } = await supabase
    .from("hr_orvosi_vizsgalat")
    .select("*")
    .eq("id", orvosiId)
    .single()

  if (orvosiErr || !orvosi) {
    throw new Error(`Orvosi vizsgálat nem található (id: ${orvosiId})`)
  }

  const employeeId = orvosi.dolgozo_id

  // Dolgozó alapadatok lekérése
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
      console.warn("Nem sikerült admin klienssel profilt lekérni:", e)
    }
  }

  const { data: adatlap } = await supabase
    .from("hr_dolgozo_adatlap")
    .select("szuletesi_ido, anyja_neve, lakcim")
    .eq("id", employeeId)
    .maybeSingle()

  // Jogviszony és munkakör adatok
  const { data: jogviszony } = await supabase
    .from("hr_jogviszony")
    .select(`
      id,
      hr_beosztas (
        id,
        ervenyes_tol,
        hr_munkakor (
          megnevezes,
          feor_kod,
          szukseges_kepzettseg
        )
      )
    `)
    .eq("dolgozo_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const beosztas = jogviszony?.hr_beosztas?.[0]
  const munkakorData = beosztas?.hr_munkakor as any

  // Titkos adatok (TAJ szám) ha hozzáférhető
  let tajSzamMasked = "•••-•••-•••"
  try {
    const { data: secretData } = await supabase
      .from("hr_dolgozo_titkos_adat")
      .select("taj_szam_titkositott")
      .eq("dolgozo_id", employeeId)
      .maybeSingle()

    if (secretData?.taj_szam_titkositott) {
      tajSzamMasked = "Nyilvántartva (Bizalmas)"
    }
  } catch {
    // Ha nem elérhető, maszkolt marad
  }

  const employeeName = profileData?.nev || "Munkavállaló"
  const szuletesiDatum = adatlap?.szuletesi_ido
    ? new Date(adatlap.szuletesi_ido).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })
    : "Nyilvántartásban rögzítve"
  const anyjaNeve = adatlap?.anyja_neve || "Nyilvántartásban rögzítve"
  const lakcim = adatlap?.lakcim || "Nyilvántartásban rögzítve"

  const munkakor = munkakorData?.megnevezes || "Irodai munkatárs"
  const feorKod = munkakorData?.feor_kod || "2141"

  const tipusLabel = TIPUS_LABELS[orvosi.tipus] || "Időszakos munkaköri alkalmassági vizsgálat"
  const eredmenyInfo = EREDMENY_LABELS[orvosi.eredmeny] || {
    label: "ALKALMAS",
    desc: "Egészségi szempontból alkalmas.",
  }

  const vizsgalatDatuma = new Date(orvosi.vizsgalat_datuma).toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const ervenyessegDatuma = new Date(orvosi.ervenyesseg_datuma).toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return {
    id: orvosi.id,
    dolgozoId: employeeId,
    employeeName,
    szuletesiDatum,
    anyjaNeve,
    lakcim,
    tajSzam: tajSzamMasked,
    munkakor,
    feorKod,
    tipus: orvosi.tipus,
    tipusLabel,
    vizsgalatDatuma,
    ervenyessegDatuma,
    eredmeny: orvosi.eredmeny,
    eredmenyLabel: eredmenyInfo.label,
    eredmenyDesc: eredmenyInfo.desc,
    megjegyzes: orvosi.megjegyzes || "",
    orvosNeve: orvosi.orvos_neve || "Dr. Foglalkozás-egészségügyi Szakorvos",
    szakrendeles: orvosi.szakrendeles || "Foglalkozás-egészségügyi Alapszolgálat",
    cegNev: "eaisyDocs Zrt. / Munkáltató",
    cegCim: "1054 Budapest, Szabadság tér 7.",
  }
}

export function generateMedicalHtml(data: MedicalExaminationData): string {
  const isAlkalmas = data.eredmeny === "alkalmas"
  const isFelteteles = data.eredmeny === "fetelekkel_alkalmas"
  const isNemAlkalmas = data.eredmeny === "nem_alkalmas"

  const badgeColor = isAlkalmas
    ? "#059669"
    : isFelteteles
    ? "#d97706"
    : "#dc2626"
  const badgeBg = isAlkalmas
    ? "#ecfdf5"
    : isFelteteles
    ? "#fffbeb"
    : "#fef2f2"
  const badgeBorder = isAlkalmas
    ? "#a7f3d0"
    : isFelteteles
    ? "#fde68a"
    : "#fecaca"

  return `
    <!DOCTYPE html>
    <html lang="hu">
    <head>
      <meta charset="UTF-8">
      <title>Foglalkozás-egészségügyi Alkalmassági Vélemény - ${data.employeeName}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm 15mm 15mm 15mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 10.5pt;
          line-height: 1.45;
          color: #1e293b;
          margin: 0;
          padding: 0;
        }
        .header {
          border-bottom: 2px solid #0f766e;
          padding-bottom: 12px;
          margin-bottom: 18px;
        }
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .brand {
          font-size: 15pt;
          font-weight: 700;
          color: #0f766e;
          letter-spacing: -0.5px;
        }
        .doc-meta {
          text-align: right;
          font-size: 8.5pt;
          color: #64748b;
        }
        .main-title {
          font-size: 14pt;
          font-weight: 700;
          color: #0f172a;
          margin: 10px 0 2px 0;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .sub-title {
          font-size: 8.5pt;
          color: #64748b;
          text-align: center;
          margin-bottom: 4px;
        }
        .exam-type-badge {
          display: block;
          width: fit-content;
          margin: 6px auto 0 auto;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 3px 12px;
          border-radius: 12px;
          font-size: 9pt;
          font-weight: 600;
        }
        .section-title {
          font-size: 9.5pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #0f766e;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
          margin-top: 14px;
          margin-bottom: 8px;
        }
        table.grid {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
        }
        table.grid td {
          padding: 5px 8px;
          font-size: 9.5pt;
          vertical-align: top;
          border-bottom: 1px solid #f1f5f9;
        }
        table.grid td.label {
          width: 32%;
          color: #64748b;
          font-weight: 500;
        }
        table.grid td.value {
          width: 68%;
          color: #0f172a;
          font-weight: 600;
        }
        .decision-box {
          border: 2px solid ${badgeBorder};
          background: ${badgeBg};
          border-radius: 8px;
          padding: 14px 18px;
          margin: 14px 0;
          text-align: center;
        }
        .decision-title {
          font-size: 13pt;
          font-weight: 800;
          color: ${badgeColor};
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .decision-desc {
          font-size: 9.5pt;
          color: #334155;
          margin-bottom: 8px;
        }
        .decision-dates {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-top: 10px;
          font-size: 9pt;
          color: #475569;
          border-top: 1px solid ${badgeBorder};
          padding-top: 8px;
        }
        .notice-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 14px;
          font-size: 8.5pt;
          color: #475569;
          margin-top: 14px;
          line-height: 1.4;
        }
        .signatures {
          margin-top: 28px;
          display: flex;
          justify-content: space-between;
          page-break-inside: avoid;
        }
        .sig-col {
          width: 45%;
          text-align: center;
        }
        .stamp-box {
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          font-size: 8pt;
          border: 1px dashed #cbd5e1;
          border-radius: 4px;
          margin-bottom: 8px;
        }
        .sig-line {
          border-top: 1px solid #334155;
          padding-top: 4px;
          font-weight: 600;
          font-size: 9pt;
          color: #0f172a;
        }
        .sig-sub {
          font-size: 8pt;
          color: #64748b;
        }
        .footer {
          margin-top: 24px;
          padding-top: 8px;
          border-top: 1px solid #cbd5e1;
          display: flex;
          justify-content: space-between;
          font-size: 7.5pt;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-top">
          <div class="brand">eaisyDocs <span style="font-weight:300; color:#475569;">| eaisyHR</span></div>
          <div class="doc-meta">
            <div><strong>Iratkategória:</strong> 3.1 HR és Munkaügyi irat</div>
            <div><strong>Megőrzési idő:</strong> 50 év (Mt. 134. §)</div>
            <div><strong>Biztonsági besorolás:</strong> Szigorúan Bizalmas (GDPR 9. cikk)</div>
          </div>
        </div>
        <div class="main-title">Elsőfokú Munkaköri Alkalmassági Vélemény</div>
        <div class="sub-title">33/1998. (VI. 24.) NM rendelet a munkaköri, szakmai, illetve személyi higiénés alkalmasság orvosi vizsgálatáról és véleményezéséről</div>
        <div class="exam-type-badge">${data.tipusLabel}</div>
      </div>

      <div class="section-title">I. A Munkáltató Adatai</div>
      <table class="grid">
        <tr>
          <td class="label">Munkáltató neve:</td>
          <td class="value">${data.cegNev}</td>
        </tr>
        <tr>
          <td class="label">Munkáltató székhelye:</td>
          <td class="value">${data.cegCim}</td>
        </tr>
      </table>

      <div class="section-title">II. A Munkavállaló Adatai</div>
      <table class="grid">
        <tr>
          <td class="label">Munkavállaló teljes neve:</td>
          <td class="value">${data.employeeName}</td>
        </tr>
        <tr>
          <td class="label">Születési ideje:</td>
          <td class="value">${data.szuletesiDatum}</td>
        </tr>
        <tr>
          <td class="label">Anyja születési neve:</td>
          <td class="value">${data.anyjaNeve}</td>
        </tr>
        <tr>
          <td class="label">Lakcíme:</td>
          <td class="value">${data.lakcim}</td>
        </tr>
        <tr>
          <td class="label">TAJ azonosító:</td>
          <td class="value">${data.tajSzam}</td>
        </tr>
      </table>

      <div class="section-title">III. A Munkakör és Munkakörülmények</div>
      <table class="grid">
        <tr>
          <td class="label">Munkakör megnevezése:</td>
          <td class="value">${data.munkakor} (FEOR: ${data.feorKod})</td>
        </tr>
        <tr>
          <td class="label">Megterhelések és környezeti tényezők:</td>
          <td class="value">Képernyő előtti munkavégzés (50/1999. EüM rend.), ergonómiai ülőmunka, pszichés megterhelés</td>
        </tr>
      </table>

      <div class="section-title">IV. Orvosi Minősítés és Döntés</div>
      <div class="decision-box">
        <div class="decision-title">${data.eredmenyLabel}</div>
        <div class="decision-desc">${data.eredmenyDesc}</div>
        ${data.megjegyzes ? `<div style="font-size:9.5pt; color:#0f172a; margin-top:6px; font-weight:600;">Orvosi záradék / megjegyzés: ${data.megjegyzes}</div>` : ""}
        <div class="decision-dates">
          <div><strong>Vizsgálat napja:</strong> ${data.vizsgalatDatuma}</div>
          <div><strong>Érvényesség / Következő vizsgálat:</strong> ${data.ervenyessegDatuma}</div>
        </div>
      </div>

      <div class="section-title">V. Kiállító Egészségügyi Szolgáltató</div>
      <table class="grid">
        <tr>
          <td class="label">Foglalkozás-egészségügyi szolgálat:</td>
          <td class="value">${data.szakrendeles}</td>
        </tr>
        <tr>
          <td class="label">Vizsgáló szakorvos neve:</td>
          <td class="value">${data.orvosNeve}</td>
        </tr>
      </table>

      <div class="notice-box">
        <strong>Jogorvoslati tájékoztató:</strong> A vélemény ellen a kézhezvételtől számított 15 napon belül a területileg illetékes Fővárosi vagy Vármegyei Kormányhivatal Népegészségügyi Főosztályánál másodfokú orvosi alkalmassági vizsgálat kezdeményezhető.<br>
        <strong>Iratkezelési záradék:</strong> Jelen dokumentum az eaisyDocs rendszerben 50 éves levéltári megőrzésű, szigorúan bizalmas munkaügyi egészségügyi iratként kerül iktatásra.
      </div>

      <div class="signatures">
        <div class="sig-col">
          <div class="stamp-box">Foglalkozás-egészségügyi Szolgálat Pecsétje</div>
          <div class="sig-line">${data.orvosNeve}</div>
          <div class="sig-sub">Foglalkozás-orvostan szakorvos</div>
        </div>
        <div class="sig-col">
          <div class="stamp-box" style="visibility:hidden;"></div>
          <div class="sig-line">${data.employeeName}</div>
          <div class="sig-sub">Munkavállaló (Véleményt átvettem)</div>
        </div>
      </div>

      <div class="footer">
        <span>Generálva: ${new Date().toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        <span>Azonosító: MED-EXAM-${data.id.slice(0, 8)}</span>
        <span>eaisyDocs & eaisyHR platform</span>
      </div>
    </body>
    </html>
  `
}

export async function generateMedicalPdfBuffer(
  supabase: SupabaseClient,
  orvosiId: string
): Promise<{ buffer: Buffer; fileName: string; employeeName: string; employeeId: string }> {
  const data = await fetchMedicalExaminationData(supabase, orvosiId)
  const html = generateMedicalHtml(data)

  const browser = await launchPdfBrowser()
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: "networkidle0" as any })
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
  })
  await browser.close()

  const asciiName = (data.employeeName || "Munkavallalo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
  const fileName = `Orvosi_Alkalmassagi_Velemeny_${asciiName || "Munkavallalo"}_${data.id.slice(0, 6)}.pdf`

  return {
    buffer: Buffer.from(pdfBuffer),
    fileName,
    employeeName: data.employeeName,
    employeeId: data.dolgozoId,
  }
}
