import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import puppeteer from "puppeteer"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const employeeId = searchParams.get('employeeId')
  const year = searchParams.get('year')

  if (!employeeId || !year) {
    return new NextResponse("Hiányzó paraméterek", { status: 400 })
  }

  const supabase = await createClient()

  // 1. Jogosultság ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse("Nincs bejelentkezve", { status: 401 })
  }

  // 2. Adatok lekérdezése
  const [profilRes, keretRes, valasztasRes, katalogusRes] = await Promise.all([
    supabase.from("felhasznalo_profil").select("nev").eq("id", employeeId).single(),
    supabase.from("hr_cafeteria_keret").select("osszeg, nyilatkozat_lezarva").eq("dolgozo_id", employeeId).eq("ev", year).single(),
    supabase.from("hr_cafeteria_valasztas").select("*").eq("dolgozo_id", employeeId).eq("ev", year),
    supabase.from("hr_cafeteria_katalogus").select("id, nev")
  ])

  if (profilRes.error || !profilRes.data) {
    return new NextResponse("Dolgozó nem található", { status: 404 })
  }

  const nev = profilRes.data.nev
  const keret = keretRes.data?.osszeg || 0
  const isClosed = keretRes.data?.nyilatkozat_lezarva || false
  const choices = valasztasRes.data || []
  const catalog = katalogusRes.data || []

  if (!isClosed) {
    return new NextResponse("A nyilatkozat még nincs véglegesítve", { status: 400 })
  }

  let totalUsed = 0
  
  // 3. HTML összeállítása
  let trs = ""
  choices.forEach(c => {
    const item = catalog.find(k => k.id === c.katalogus_elem_id)
    totalUsed += c.levont_keret_osszeg
    
    trs += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item?.nev || "Ismeretlen elem"}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(c.kert_osszeg)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; color: #555;">${new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(c.levont_keret_osszeg)}</td>
      </tr>
    `
  })

  const html = `
    <!DOCTYPE html>
    <html lang="hu">
    <head>
      <meta charset="UTF-8">
      <title>Cafeteria Nyilatkozat</title>
      <style>
        body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333; margin: 40px; }
        h1 { color: #0f766e; margin-bottom: 5px; }
        .subtitle { color: #666; font-size: 14px; margin-bottom: 30px; }
        .details { margin-bottom: 30px; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
        .details p { margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 14px; color: #475569; }
        th.right { text-align: right; }
        .total { font-weight: bold; font-size: 16px; padding: 15px 10px; background: #f8fafc; border-top: 2px solid #cbd5e1; display: flex; justify-content: space-between; }
        .signature-area { margin-top: 80px; display: flex; justify-content: space-between; }
        .signature-line { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 5px; font-size: 14px; }
      </style>
    </head>
    <body>
      <h1>Cafeteria Nyilatkozat - ${year}</h1>
      <div class="subtitle">Készült: ${new Date().toLocaleDateString('hu-HU')}</div>
      
      <div class="details">
        <p><strong>Dolgozó neve:</strong> ${nev}</p>
        <p><strong>Éves bruttó cafeteria keret:</strong> ${new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(keret)}</p>
        <p><strong>Nyilatkozat állapota:</strong> Véglegesítve és lezárva</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Juttatási elem</th>
            <th class="right">Kért összeg</th>
            <th class="right">Keretből levont</th>
          </tr>
        </thead>
        <tbody>
          ${trs}
        </tbody>
      </table>

      <div class="total">
        <span>Összesen felhasznált keret:</span>
        <span>${new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(totalUsed)}</span>
      </div>

      <div class="signature-area">
        <div>
          <div class="signature-line">Munkáltató képviselője</div>
        </div>
        <div>
          <div class="signature-line">${nev} (Dolgozó)</div>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdfBuffer = await page.pdf({ 
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    })
    await browser.close()

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="cafeteria_nyilatkozat_${employeeId}_${year}.pdf"`
      }
    })
  } catch (error) {
    console.error("PDF generálási hiba:", error)
    return new NextResponse("Hiba történt a PDF generálása során", { status: 500 })
  }
}
