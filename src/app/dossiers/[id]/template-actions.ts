"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import crypto from "crypto"

/**
 * Sablon alapú kimenő irat generálása
 * HTML tartalom → PDF konvertálása és irat_fajl-ként mentése
 */
export async function generateFromTemplate(ugyiratId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  const targy = formData.get("targy") as string
  const sablon_tipus = formData.get("sablon_tipus") as string
  const tartalom = formData.get("tartalom") as string
  const cimzett = formData.get("cimzett") as string
  const hivatkozas = formData.get("hivatkozas") as string

  if (!targy || !tartalom) {
    return { error: "A tárgy és a tartalom megadása kötelező!" }
  }

  // Felhasználó profil lekérése a sablonhoz
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("nev")
    .eq("id", user.id)
    .single()

  // Ügyirat adatai a sablonhoz
  const { data: ugyirat } = await supabase
    .from("ugyirat")
    .select("iktatoszam, ugy(targy)")
    .eq("id", ugyiratId)
    .single()

  const iktatoszam = ugyirat?.iktatoszam || ""
  const ugyTargy = (ugyirat?.ugy as any)?.targy || ""

  // HTML → PDF generálás pdf-lib-bel
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")

  const pdfDoc = await PDFDocument.create()
  // PDF/A-2b metaadat
  pdfDoc.setTitle(targy)
  pdfDoc.setAuthor(profile?.nev || "eaisyDocs")
  pdfDoc.setSubject(ugyTargy)
  pdfDoc.setCreator("eaisyDocs - Elektronikus Iratkezelő Rendszer")
  pdfDoc.setCreationDate(new Date())

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 595.28 // A4
  const pageHeight = 841.89
  const margin = 60
  const contentWidth = pageWidth - margin * 2
  const lineHeight = 16
  const fontSize = 11
  const headerFontSize = 13

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  // --- Fejléc ---
  const now = new Date()
  const dateStr = now.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })

  // Iktatószám jobb felső sarok
  if (iktatoszam) {
    const iktatoText = `Iktatószám: ${iktatoszam}`
    const iktatoWidth = helvetica.widthOfTextAtSize(iktatoText, 9)
    page.drawText(iktatoText, {
      x: pageWidth - margin - iktatoWidth,
      y,
      size: 9,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    })
  }

  // Dátum
  page.drawText(dateStr, {
    x: margin,
    y,
    size: 9,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  })
  y -= lineHeight * 2

  // Címzett
  if (cimzett) {
    page.drawText("Címzett:", {
      x: margin, y, size: 9, font: helvetica, color: rgb(0.4, 0.4, 0.4),
    })
    y -= lineHeight
    page.drawText(cimzett, {
      x: margin, y, size: fontSize, font: helveticaBold, color: rgb(0, 0, 0),
    })
    y -= lineHeight * 2
  }

  // Tárgy
  page.drawText("Tárgy:", {
    x: margin, y, size: 9, font: helvetica, color: rgb(0.4, 0.4, 0.4),
  })
  y -= lineHeight
  page.drawText(targy, {
    x: margin, y, size: headerFontSize, font: helveticaBold, color: rgb(0, 0, 0),
  })
  y -= lineHeight

  // Hivatkozás
  if (hivatkozas) {
    page.drawText(`Hivatkozás: ${hivatkozas}`, {
      x: margin, y, size: 9, font: helvetica, color: rgb(0.4, 0.4, 0.4),
    })
    y -= lineHeight
  }

  // Elválasztó vonal
  y -= 8
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  })
  y -= lineHeight * 1.5

  // --- Törzs szöveg (sortörés kezelésével) ---
  const lines = tartalom.split("\n")
  for (const line of lines) {
    if (line.trim() === "") {
      y -= lineHeight * 0.7
      continue
    }

    // Sortörés kezelés — szavankénti tördelés
    const words = line.split(" ")
    let currentLine = ""
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const textWidth = helvetica.widthOfTextAtSize(testLine, fontSize)
      if (textWidth > contentWidth) {
        // Új oldal szükség esetén
        if (y < margin + lineHeight * 3) {
          page = pdfDoc.addPage([pageWidth, pageHeight])
          y = pageHeight - margin
        }
        page.drawText(currentLine, {
          x: margin, y, size: fontSize, font: helvetica, color: rgb(0, 0, 0),
        })
        y -= lineHeight
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    // Maradék sor
    if (currentLine) {
      if (y < margin + lineHeight * 3) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin
      }
      page.drawText(currentLine, {
        x: margin, y, size: fontSize, font: helvetica, color: rgb(0, 0, 0),
      })
      y -= lineHeight
    }
  }

  // --- Aláírás blokk ---
  y -= lineHeight * 3
  if (y < margin + lineHeight * 5) {
    page = pdfDoc.addPage([pageWidth, pageHeight])
    y = pageHeight - margin
  }
  page.drawText("Üdvözlettel,", {
    x: margin, y, size: fontSize, font: helvetica, color: rgb(0, 0, 0),
  })
  y -= lineHeight * 3
  page.drawText(profile?.nev || "Aláíró", {
    x: margin, y, size: fontSize, font: helveticaBold, color: rgb(0, 0, 0),
  })

  // --- Lábléc ---
  const footerText = `Generálva: eaisyDocs | ${dateStr} | ${iktatoszam || "Iktatószám nélkül"}`
  const firstPage = pdfDoc.getPages()[0]
  const footerWidth = helvetica.widthOfTextAtSize(footerText, 7)
  for (const p of pdfDoc.getPages()) {
    p.drawText(footerText, {
      x: (pageWidth - footerWidth) / 2,
      y: 30,
      size: 7,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    })
  }

  // PDF binary generálás
  const pdfBytes = await pdfDoc.save()
  const buffer = Buffer.from(pdfBytes)

  // SHA-256 hash
  const hash = crypto.createHash("sha256").update(buffer).digest("hex")

  // Storage feltöltés
  const fileName = `${crypto.randomUUID()}.pdf`
  const { error: uploadError } = await supabase.storage
    .from("irat_files")
    .upload(fileName, buffer, {
      contentType: "application/pdf",
      upsert: false,
    })

  if (uploadError) return { error: "Hiba a fájl feltöltésekor: " + uploadError.message }

  // Alszám számítás
  const { data: iratok } = await supabase
    .from("irat")
    .select("alszam")
    .eq("ugyirat_id", ugyiratId)

  const maxAlszam = iratok?.reduce((max, i) => Math.max(max, i.alszam || 0), 0) || 0
  const alszam = maxAlszam + 1

  // Irat rekord (kimenő)
  const { data: iratData, error: iratError } = await supabase
    .from("irat")
    .insert({
      ugyirat_id: ugyiratId,
      targy,
      irany: "kimeno",
      erkezes_modja: "rendszer",
      adathordozo_tipus: "elektronikus_eredeti",
      minosites: "nyilt",
      alszam,
    })
    .select("id")
    .single()

  if (iratError || !iratData) return { error: "Hiba az irat rekord létrehozásakor." }

  // Irat fájl rekord
  const generatedFilename = `${sablon_tipus || "sablon"}_${dateStr.replace(/\./g, "").replace(/ /g, "_")}.pdf`
  const { data: fajlResult } = await supabase
    .from("irat_fajl")
    .insert({
      irat_id: iratData.id,
      storage_path: fileName,
      eredeti_fajlnev: generatedFilename,
      mime_type: "application/pdf",
      meret_byte: buffer.length,
      sha256: hash,
      verzio: 1,
    })
    .select("id")
    .single()

  // Eseménynapló
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
    esemeny_tipus: "modositva",
    user_id: user.id,
    indoklas: `Kimenő irat generálva sablonból: ${sablon_tipus || "Általános"} — ${targy}`,
  })

  // PDF/A konverzió trigger
  if (fajlResult) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    fetch(`${appUrl}/api/pdf/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fajl_id: fajlResult.id }),
    }).catch((err) => console.error("PDF/A Worker Trigger Error:", err))
  }

  revalidatePath(`/dossiers/${ugyiratId}`)
  return { success: true }
}
