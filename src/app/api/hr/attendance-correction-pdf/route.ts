import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { launchPdfBrowser } from "@/utils/pdf-browser"

function formatTimeOnly(isoString?: string | null): string {
  if (!isoString) return "--:--"
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) {
      return isoString.length >= 5 ? isoString.substring(0, 5) : isoString
    }
    return d.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })
  } catch {
    return "--:--"
  }
}

function calculateDurationString(startIso?: string | null, endIso?: string | null): string {
  if (!startIso || !endIso) return "—"
  try {
    const start = new Date(startIso).getTime()
    const end = new Date(endIso).getTime()
    if (isNaN(start) || isNaN(end) || end < start) return "—"
    const totalMinutes = Math.round((end - start) / (1000 * 60))
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours === 0) return `${minutes} perc`
    if (minutes === 0) return `${hours} óra`
    return `${hours} óra ${minutes} perc`
  } catch {
    return "—"
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const korrekcioId = searchParams.get("korrekcioId") || searchParams.get("id")
  const isPreview = searchParams.get("preview") === "true"

  if (!korrekcioId) {
    return new NextResponse("Hiányzó korrekcioId paraméter", { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse("Nincs bejelentkezve", { status: 401 })
  }

  // 1. Lekéri a korrekciót
  const { data: korrekcio, error } = await supabase
    .from("hr_jelenlet_korrekcio")
    .select("id, datum, eredeti_becsekkolas, eredeti_kicsekkolas, uj_becsekkolas, uj_kicsekkolas, indoklas, statusz, created_at, dolgozo_id, jovahagyo_id, jovahagyva_ekkor")
    .eq("id", korrekcioId)
    .single()

  if (error || !korrekcio) {
    return new NextResponse(
      `A munkaidő korrekciós kérelem nem található. (${error?.message ?? "ismeretlen hiba"})`,
      { status: 404 }
    )
  }

  if (korrekcio.statusz !== "jovahagyva") {
    return new NextResponse(
      `A kérelem státusza: "${korrekcio.statusz}" – csak jóváhagyott kérelmekhez generálható igazolás.`,
      { status: 422 }
    )
  }

  // 2. Biztonsági ellenőrzés: saját igazolás, HR/Admin, vagy közvetlen vezető
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor")
    .eq("id", user.id)
    .single()

  const isHrOrAdmin = ["hr_munkatars", "hr_vezeto", "admin"].includes(profile?.hr_szerepkor || "")
  const isOwn = korrekcio.dolgozo_id === user.id

  let isManager = false
  if (!isOwn && !isHrOrAdmin) {
    if (korrekcio.jovahagyo_id === user.id) {
      isManager = true
    } else {
      const { data: sub } = await supabase
        .from("felhasznalo_profil")
        .select("kozvetlen_vezeto_id")
        .eq("id", korrekcio.dolgozo_id)
        .single()
      if (sub?.kozvetlen_vezeto_id === user.id) {
        isManager = true
      }
    }
  }

  if (!isOwn && !isHrOrAdmin && !isManager) {
    return new NextResponse("Nincs jogosultságod", { status: 403 })
  }

  // 3. Dolgozó neve
  const { data: dolgozoProfil } = await supabase
    .from("felhasznalo_profil")
    .select("nev")
    .eq("id", korrekcio.dolgozo_id)
    .single()

  // 4. Jóváhagyó neve (ha van)
  let jovahagyoNev = "—"
  if (korrekcio.jovahagyo_id) {
    const { data: jovahagyoProfil } = await supabase
      .from("felhasznalo_profil")
      .select("nev")
      .eq("id", korrekcio.jovahagyo_id)
      .single()
    jovahagyoNev = jovahagyoProfil?.nev ?? "—"
  }

  // 5. Munkakör lekérése az aktív jogviszonyból
  let munkakori = "—"
  const { data: jogviszony } = await supabase
    .from("hr_jogviszony")
    .select(`id, hr_beosztas ( hr_munkakor ( megnevezes ) )`)
    .eq("dolgozo_id", korrekcio.dolgozo_id)
    .is("kilepes_datuma", null)
    .order("belepes_datuma", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (jogviszony) {
    const beosztas = (jogviszony.hr_beosztas as any)?.[0]
    munkakori = beosztas?.hr_munkakor?.megnevezes ?? "—"
  }

  const nev = dolgozoProfil?.nev ?? "Ismeretlen"
  const today = new Date().toLocaleDateString("hu-HU")
  const igazolasAzonosito = korrekcioId.split("-")[0].toUpperCase()

  const datumFormatted = korrekcio.datum
    ? new Date(korrekcio.datum).toLocaleDateString("hu-HU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—"

  const hasOriginal = korrekcio.eredeti_becsekkolas || korrekcio.eredeti_kicsekkolas
  const eredetiIdoText = hasOriginal
    ? `${formatTimeOnly(korrekcio.eredeti_becsekkolas)} – ${formatTimeOnly(korrekcio.eredeti_kicsekkolas)}`
    : "Nem volt rögzített jelenlét (Hiányzó csekkolás)"

  const ujIdoText = `${formatTimeOnly(korrekcio.uj_becsekkolas)} – ${formatTimeOnly(korrekcio.uj_kicsekkolas)}`
  const jovahagyottIdotartam = calculateDurationString(korrekcio.uj_becsekkolas, korrekcio.uj_kicsekkolas)

  const jovahagyasIdopontja = korrekcio.jovahagyva_ekkor
    ? new Date(korrekcio.jovahagyva_ekkor).toLocaleDateString("hu-HU", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—"

  const html = `
    <!DOCTYPE html>
    <html lang="hu">
    <head>
      <meta charset="UTF-8">
      <title>Munkaidő Korrekciós Igazolás</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 40px; font-size: 14px; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f766e; padding-bottom: 20px; margin-bottom: 24px; }
        .header-left h1 { font-size: 22px; font-weight: 700; color: #0f766e; letter-spacing: 0.5px; }
        .header-left p { color: #64748b; font-size: 12px; margin-top: 4px; }
        .header-right { text-align: right; font-size: 12px; color: #64748b; }
        .badge { display: inline-block; background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; border-radius: 20px; padding: 4px 14px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
        .section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 18px; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .field label { font-size: 11px; color: #94a3b8; font-weight: 600; display: block; margin-bottom: 3px; }
        .field span { font-size: 14px; font-weight: 500; color: #1e293b; }
        .highlight { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 14px 18px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }
        .highlight span:first-child { font-size: 13px; color: #065f46; font-weight: 600; }
        .highlight span:last-child { font-size: 20px; font-weight: 700; color: #065f46; }
        .reason-box { background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 12px; font-style: italic; color: #475569; font-size: 13px; margin-top: 8px; }
        .signature-area { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .signature-box { text-align: center; }
        .signature-line { border-top: 1px solid #334155; padding-top: 8px; font-size: 12px; color: #64748b; margin-top: 50px; }
        .footer { margin-top: 36px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <h1>MUNKAIDŐ KORREKCIÓS IGAZOLÁS</h1>
          <p>eaisyHR – Emberi Erőforrás Gazdálkodási Rendszer</p>
        </div>
        <div class="header-right">
          <p>Kiállítva: <strong>${today}</strong></p>
          <p>Azonosító: <strong>${igazolasAzonosito}</strong></p>
        </div>
      </div>

      <div class="badge">JÓVÁHAGYVA ÉS ÉRVÉNYESÍTVE</div>

      <div class="section">
        <div class="section-title">Dolgozó adatai</div>
        <div class="grid">
          <div class="field">
            <label>Teljes neve</label>
            <span>${nev}</span>
          </div>
          <div class="field">
            <label>Munkakör</label>
            <span>${munkakori}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Jóváhagyott Munkaidő Adatok</div>
        <div class="highlight">
          <span>Jóváhagyott érvényes munkaidő</span>
          <span>${ujIdoText} (${jovahagyottIdotartam})</span>
        </div>
        <div class="grid">
          <div class="field">
            <label>Érintett munkanap</label>
            <span>${datumFormatted}</span>
          </div>
          <div class="field">
            <label>Eredetileg rögzített időpont</label>
            <span>${eredetiIdoText}</span>
          </div>
          <div class="field">
            <label>Jóváhagyó vezető</label>
            <span>${jovahagyoNev}</span>
          </div>
          <div class="field">
            <label>Jóváhagyás időpontja</label>
            <span>${jovahagyasIdopontja}</span>
          </div>
        </div>

        ${
          korrekcio.indoklas
            ? `
          <div style="margin-top: 14px;">
            <label style="font-size: 11px; color: #94a3b8; font-weight: 600; display: block; margin-bottom: 4px;">Dolgozói indoklás</label>
            <div class="reason-box">„${korrekcio.indoklas}”</div>
          </div>
        `
            : ""
        }
      </div>

      <div class="signature-area">
        <div class="signature-box">
          <div class="signature-line">Munkáltató képviselője (${jovahagyoNev})</div>
        </div>
        <div class="signature-box">
          <div class="signature-line">${nev} (dolgozó)</div>
        </div>
      </div>

      <div class="footer">
        <span>Ez az igazolás az eaisyHR rendszer által automatikusan generált hivatalos dokumentum.</span>
        <span>Azonosító: ${korrekcioId}</span>
      </div>
    </body>
    </html>
  `

  try {
    const browser = await launchPdfBrowser()
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" as any })
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15px", bottom: "15px", left: "15px", right: "15px" },
    })
    await browser.close()

    const dispositionType = isPreview ? "inline" : "attachment"
    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${dispositionType}; filename="munkaido_korrekcio_${igazolasAzonosito}.pdf"`,
        "Cache-Control": "private, max-age=60",
      },
    })
  } catch (error) {
    console.error("PDF generálási hiba:", error)
    return new NextResponse("Hiba a PDF generálása során", { status: 500 })
  }
}
