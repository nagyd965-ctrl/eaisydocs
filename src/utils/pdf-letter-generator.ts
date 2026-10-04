import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

export interface LetterPdfOptions {
  targy: string
  cimzett?: string
  iktatoszam?: string
  ugyTargy?: string
  hivatkozas?: string
  tartalom: string
  authorNev?: string
}

/**
 * Szabványos kimenő hivatalos levél PDF generálása pdf-lib segítségével.
 * Kezeli az A4-es formátumot, margókat, iktatószámot, címzettet, tárgyat,
 * többsoros és többoldalas szövegtördelést, valamint az aláírás blokkot és láblécet.
 */
export async function generateLetterPdfBuffer(options: LetterPdfOptions): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()

  // PDF metaadatok
  pdfDoc.setTitle(options.targy)
  pdfDoc.setAuthor(options.authorNev || "eaisyDocs")
  if (options.ugyTargy) pdfDoc.setSubject(options.ugyTargy)
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
  if (options.iktatoszam) {
    const iktatoText = `Iktatószám: ${options.iktatoszam}`
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
  if (options.cimzett) {
    page.drawText("Címzett:", {
      x: margin,
      y,
      size: 9,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    })
    y -= lineHeight
    page.drawText(options.cimzett, {
      x: margin,
      y,
      size: fontSize,
      font: helveticaBold,
      color: rgb(0, 0, 0),
    })
    y -= lineHeight * 2
  }

  // Tárgy
  page.drawText("Tárgy:", {
    x: margin,
    y,
    size: 9,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  })
  y -= lineHeight
  page.drawText(options.targy, {
    x: margin,
    y,
    size: headerFontSize,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  })
  y -= lineHeight

  // Hivatkozás
  if (options.hivatkozas) {
    page.drawText(`Hivatkozás: ${options.hivatkozas}`, {
      x: margin,
      y,
      size: 9,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
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

  // --- Törzs szöveg (sortörés és szótördelés) ---
  const cleanTartalom = options.tartalom
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "")
  const lines = cleanTartalom.split("\n")

  for (const line of lines) {
    if (line.trim() === "") {
      y -= lineHeight * 0.7
      continue
    }

    const words = line.split(" ")
    let currentLine = ""
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const textWidth = helvetica.widthOfTextAtSize(testLine, fontSize)
      if (textWidth > contentWidth) {
        if (y < margin + lineHeight * 3) {
          page = pdfDoc.addPage([pageWidth, pageHeight])
          y = pageHeight - margin
        }
        page.drawText(currentLine, {
          x: margin,
          y,
          size: fontSize,
          font: helvetica,
          color: rgb(0, 0, 0),
        })
        y -= lineHeight
        currentLine = word
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) {
      if (y < margin + lineHeight * 3) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin
      }
      page.drawText(currentLine, {
        x: margin,
        y,
        size: fontSize,
        font: helvetica,
        color: rgb(0, 0, 0),
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
    x: margin,
    y,
    size: fontSize,
    font: helvetica,
    color: rgb(0, 0, 0),
  })
  y -= lineHeight * 2.5
  page.drawText(options.authorNev || "Aláíró", {
    x: margin,
    y,
    size: fontSize,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  })

  // --- Lábléc minden oldalon ---
  const footerText = `Generálva: eaisyDocs | ${dateStr} | ${options.iktatoszam || "Iktatószám nélkül"}`
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

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
