import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { launchPdfBrowser } from "@/utils/pdf-browser"

const TIPUS_LABEL: Record<string, string> = {
  szabadsag: "Szabadság",
  betegseg: "Betegszabadság",
  fizetett_szabadsag: "Fizetett szabadság",
  fizetetlen_szabadsag: "Fizetetlen szabadság",
  rendkivuli: "Rendkívüli távollét",
  home_office: "Home Office",
  egyeb: "Egyéb távollét",
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const tavolletId = searchParams.get("tavolletId")

  if (!tavolletId) {
    return new NextResponse("Hiányzó tavolletId paraméter", { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse("Nincs bejelentkezve", { status: 401 })
  }

  // 1. Lekéri a távollétet
  const { data: tavollet, error } = await supabase
    .from("hr_tavollet")
    .select("id, tipus, kezdet_datuma, veg_datuma, statusz, created_at, dolgozo_id, jovahagyo_id")
    .eq("id", tavolletId)
    .single()

  if (error || !tavollet) {
    return new NextResponse(
      `A távolléti kérelem nem található. (${error?.message ?? "ismeretlen hiba"})`,
      { status: 404 }
    )
  }

  if (tavollet.statusz !== "jovahagyva") {
    return new NextResponse(
      `A kérelem státusza: "${tavollet.statusz}" – csak jóváhagyott kérelmekhez generálható igazolás.`,
      { status: 422 }
    )
  }

  // 2. Biztonsági ellenőrzés: saját igazolás vagy HR
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor")
    .eq("id", user.id)
    .single()

  const isHrOrAdmin = ["hr_munkatars", "hr_vezeto", "admin"].includes(profile?.hr_szerepkor || "")
  // dolgozo_id az hr_dolgozo_adatlap.id-re mutat, ami = felhasznalo_profil.id
  const isOwn = tavollet.dolgozo_id === user.id

  if (!isOwn && !isHrOrAdmin) {
    return new NextResponse("Nincs jogosultságod", { status: 403 })
  }

  // 3. Dolgozó neve
  const { data: dolgozoProfil } = await supabase
    .from("felhasznalo_profil")
    .select("nev")
    .eq("id", tavollet.dolgozo_id)
    .single()

  // 4. Jóváhagyó neve (ha van)
  let jovahagyoNev = "—"
  if (tavollet.jovahagyo_id) {
    const { data: jovahagyoProfil } = await supabase
      .from("felhasznalo_profil")
      .select("nev")
      .eq("id", tavollet.jovahagyo_id)
      .single()
    jovahagyoNev = jovahagyoProfil?.nev ?? "—"
  }

  // 5. Munkakör lekérése az aktív jogviszonyból
  let munkakori = "—"
  const { data: jogviszony } = await supabase
    .from("hr_jogviszony")
    .select(`id, hr_beosztas ( hr_munkakor ( megnevezes ) )`)
    .eq("dolgozo_id", tavollet.dolgozo_id)
    .is("kilepes_datuma", null)
    .order("belepes_datuma", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (jogviszony) {
    const beosztas = (jogviszony.hr_beosztas as any)?.[0]
    munkakori = beosztas?.hr_munkakor?.megnevezes ?? "—"
  }

  const nev = dolgozoProfil?.nev ?? "Ismeretlen"

  const kezdet = tavollet.kezdet_datuma
    ? new Date(tavollet.kezdet_datuma).toLocaleDateString("hu-HU")
    : "—"
  const veg = tavollet.veg_datuma
    ? new Date(tavollet.veg_datuma).toLocaleDateString("hu-HU")
    : "—"

  // Munkanapok számítása (egyszerű: hétköznap számolás)
  const munkanapok = (() => {
    if (!tavollet.kezdet_datuma || !tavollet.veg_datuma) return "—"
    let count = 0
    const cur = new Date(tavollet.kezdet_datuma)
    const end = new Date(tavollet.veg_datuma)
    while (cur <= end) {
      const dow = cur.getDay()
      if (dow !== 0 && dow !== 6) count++
      cur.setDate(cur.getDate() + 1)
    }
    return count.toString()
  })()

  const tipusLabel = TIPUS_LABEL[tavollet.tipus] ?? tavollet.tipus
  const today = new Date().toLocaleDateString("hu-HU")
  const igazolasAzonosito = tavolletId.split("-")[0].toUpperCase()

  const html = `
    <!DOCTYPE html>
    <html lang="hu">
    <head>
      <meta charset="UTF-8">
      <title>Szabadság Igazolás</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; margin: 40px; font-size: 14px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f766e; padding-bottom: 20px; margin-bottom: 30px; }
        .header-left h1 { font-size: 22px; font-weight: 700; color: #0f766e; letter-spacing: 0.5px; }
        .header-left p { color: #64748b; font-size: 12px; margin-top: 4px; }
        .header-right { text-align: right; font-size: 12px; color: #64748b; }
        .badge { display: inline-block; background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; border-radius: 20px; padding: 4px 14px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
        .section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 14px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .field label { font-size: 11px; color: #94a3b8; font-weight: 600; display: block; margin-bottom: 3px; }
        .field span { font-size: 14px; font-weight: 500; color: #1e293b; }
        .highlight { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .highlight span:first-child { font-size: 13px; color: #065f46; font-weight: 600; }
        .highlight span:last-child { font-size: 24px; font-weight: 700; color: #065f46; }
        .signature-area { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
        .signature-box { text-align: center; }
        .signature-line { border-top: 1px solid #334155; padding-top: 8px; font-size: 12px; color: #64748b; margin-top: 50px; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <h1>TÁVOLLÉTI IGAZOLÁS</h1>
          <p>eaisyHR – Emberi Erőforrás Gazdálkodási Rendszer</p>
        </div>
        <div class="header-right">
          <p>Kiállítva: <strong>${today}</strong></p>
          <p>Azonosító: <strong>${igazolasAzonosito}</strong></p>
        </div>
      </div>

      <div class="badge">✓ JÓVÁHAGYVA</div>

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
        <div class="section-title">Távolléti időszak</div>
        <div class="highlight">
          <span>Munkanapok száma</span>
          <span>${munkanapok} munkanap</span>
        </div>
        <div class="grid">
          <div class="field">
            <label>Távolléti időszak kezdete</label>
            <span>${kezdet}</span>
          </div>
          <div class="field">
            <label>Távolléti időszak vége</label>
            <span>${veg}</span>
          </div>
          <div class="field">
            <label>Távolléti típus</label>
            <span>${tipusLabel}</span>
          </div>
          <div class="field">
            <label>Jóváhagyó neve</label>
            <span>${jovahagyoNev}</span>
          </div>
        </div>
      </div>

      <div class="signature-area">
        <div class="signature-box">
          <div class="signature-line">Munkáltató képviselője</div>
        </div>
        <div class="signature-box">
          <div class="signature-line">${nev} (dolgozó)</div>
        </div>
      </div>

      <div class="footer">
        <span>Ez az igazolás az eaisyHR rendszer által automatikusan generált dokumentum.</span>
        <span>Azonosító: ${tavolletId}</span>
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
      margin: { top: "15px", bottom: "15px", left: "15px", right: "15px" }
    })
    await browser.close()

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="tavollet_igazolas_${igazolasAzonosito}.pdf"`
      }
    })
  } catch (error) {
    console.error("PDF generálási hiba:", error)
    return new NextResponse("Hiba a PDF generálása során", { status: 500 })
  }
}
