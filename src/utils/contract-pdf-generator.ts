import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { ContractParty } from "@/types/contract-templates"

export interface ContractPdfOptions {
  title: string
  contractType?: string
  iktatoszam?: string
  megbizo: ContractParty
  megbizott: ContractParty
  sections: {
    number: number
    title: string
    paragraphs: string[]
  }[]
  effectiveDate?: string
  authorNev?: string
}

/**
 * PDF-lib kompatibilis ékezet-tisztítás a standard WinAnsi betűkészlethez (ő/ű -> ö/ü)
 */
function clean(text: string | null | undefined): string {
  if (!text) return ""
  return String(text)
    .replace(/ő/g, "ö")
    .replace(/Ő/g, "Ö")
    .replace(/ű/g, "ü")
    .replace(/Ű/g, "Ü")
}

/**
 * Hivatalos kétoldalú üzleti szerződés A4 formátumú PDF generálása pdf-lib segítségével.
 * Kezeli a margókat, fejlécet, fejezetenkénti számozott bekezdéseket, automatikus oldaltörést,
 * kétoszlopos cégszerű aláírási blokkot és láblécet.
 */
export async function generateContractPdfBuffer(options: ContractPdfOptions): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()

  // PDF metaadatok
  pdfDoc.setTitle(clean(options.title))
  pdfDoc.setAuthor(clean(options.authorNev || options.megbizo.nev || "eaisyDocs"))
  pdfDoc.setSubject(clean(`Üzleti megállapodás: ${options.megbizo.nev} - ${options.megbizott.nev}`))
  pdfDoc.setCreator("eaisyDocs - Elektronikus Iratkezelő Rendszer")
  pdfDoc.setCreationDate(new Date())

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  const pageWidth = 595.28 // A4 portrait
  const pageHeight = 841.89
  const margin = 50
  const contentWidth = pageWidth - margin * 2
  const lineHeight = 15
  const bodyFontSize = 10
  const sectionTitleFontSize = 11

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  const checkNewPage = (neededSpace: number) => {
    if (y - neededSpace < margin + 45) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
      return true
    }
    return false
  }

  // --- FEJLÉC ---
  const dateStr = options.effectiveDate || new Date().toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })

  page.drawText(clean("EAISYDOCS ÜZLETI SZERZŐDÉSTÁR"), {
    x: margin,
    y,
    size: 9,
    font: helveticaBold,
    color: rgb(0.35, 0.35, 0.35),
  })

  if (options.iktatoszam) {
    const iktatoText = `Iktatószám: ${options.iktatoszam}`
    const iktatoWidth = helveticaBold.widthOfTextAtSize(clean(iktatoText), 9)
    page.drawText(clean(iktatoText), {
      x: pageWidth - margin - iktatoWidth,
      y,
      size: 9,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    })
  }
  y -= 14

  // Fintech teal hangsúlyos elválasztó vonal
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1.5,
    color: rgb(0.01, 0.72, 0.80),
  })
  y -= 24

  // Szerződés címe középen
  const titleText = clean(options.title.toUpperCase())
  const titleWidth = helveticaBold.widthOfTextAtSize(titleText, 14)
  page.drawText(titleText, {
    x: Math.max(margin, (pageWidth - titleWidth) / 2),
    y,
    size: 14,
    font: helveticaBold,
    color: rgb(0.08, 0.12, 0.2),
  })
  y -= 22

  // --- FEJEZETEK ÉS SZÖVEG MEGJELENÍTÉSE ---
  for (const section of options.sections) {
    checkNewPage(45)

    // Fejezet sorszáma és címe
    const sectionHeading = clean(`${section.number}. ${section.title.toUpperCase()}`)
    page.drawText(sectionHeading, {
      x: margin,
      y,
      size: sectionTitleFontSize,
      font: helveticaBold,
      color: rgb(0.1, 0.15, 0.25),
    })
    y -= 16

    // Bekezdések
    for (const paragraph of section.paragraphs) {
      if (!paragraph || !paragraph.trim()) continue

      const cleanParagraph = clean(paragraph.trim())
      const words = cleanParagraph.split(" ")
      let currentLine = ""

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        const textWidth = helvetica.widthOfTextAtSize(testLine, bodyFontSize)
        
        if (textWidth > contentWidth) {
          checkNewPage(lineHeight * 2)
          page.drawText(currentLine, {
            x: margin,
            y,
            size: bodyFontSize,
            font: helvetica,
            color: rgb(0.15, 0.15, 0.15),
          })
          y -= lineHeight
          currentLine = word
        } else {
          currentLine = testLine
        }
      }

      if (currentLine) {
        checkNewPage(lineHeight * 2)
        page.drawText(currentLine, {
          x: margin,
          y,
          size: bodyFontSize,
          font: helvetica,
          color: rgb(0.15, 0.15, 0.15),
        })
        y -= lineHeight
      }

      // Bekezdések közti kis térköz
      y -= 4
    }

    y -= 8
  }

  // --- DÁTUM ÉS HATÁLYOSSÁGI ZÁRADÉK ---
  checkNewPage(140)
  y -= 10
  const closingText = clean(`Kelt: Budapest, ${dateStr} napján, két eredeti példányban.`)
  page.drawText(closingText, {
    x: margin,
    y,
    size: 9,
    font: helveticaOblique,
    color: rgb(0.3, 0.3, 0.3),
  })
  y -= 35

  // --- KÉTOSZLOPOS CÉGSZERŰ ALÁÍRÁSI BLOKK ---
  const col1X = margin + 10
  const col2X = margin + 270
  const signLineWidth = 200

  // Aláírási vonalak
  page.drawLine({
    start: { x: col1X, y },
    end: { x: col1X + signLineWidth, y },
    thickness: 1,
    color: rgb(0.3, 0.3, 0.3),
  })

  page.drawLine({
    start: { x: col2X, y },
    end: { x: col2X + signLineWidth, y },
    thickness: 1,
    color: rgb(0.3, 0.3, 0.3),
  })
  y -= 14

  // Megbízó
  page.drawText(clean(options.megbizo.nev), {
    x: col1X,
    y,
    size: 9.5,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  })

  // Megbízott
  page.drawText(clean(options.megbizott.nev), {
    x: col2X,
    y,
    size: 9.5,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  })
  y -= 12

  // Képviselők / Szerepkörök
  page.drawText(clean(`Képviseli: ${options.megbizo.kepviselo || "cégvezető / megbízó"}`), {
    x: col1X,
    y,
    size: 8.5,
    font: helvetica,
    color: rgb(0.35, 0.35, 0.35),
  })

  page.drawText(clean(`Képviseli: ${options.megbizott.kepviselo || "ügyvezető / meghatalmazott"}`), {
    x: col2X,
    y,
    size: 8.5,
    font: helvetica,
    color: rgb(0.35, 0.35, 0.35),
  })
  y -= 11

  page.drawText(clean("Megbízó / Megrendelő"), {
    x: col1X,
    y,
    size: 8,
    font: helveticaOblique,
    color: rgb(0.5, 0.5, 0.5),
  })

  page.drawText(clean("Megbízott / Szolgáltató"), {
    x: col2X,
    y,
    size: 8,
    font: helveticaOblique,
    color: rgb(0.5, 0.5, 0.5),
  })

  // --- LÁBLÉC MINDEN OLDALON ---
  const totalPages = pdfDoc.getPageCount()
  for (let i = 0; i < totalPages; i++) {
    const p = pdfDoc.getPage(i)
    const footerText = clean(`eaisyDocs Üzleti Szerződés | ${options.iktatoszam || "Vázlat"} | Oldal: ${i + 1} / ${totalPages}`)
    const footerWidth = helvetica.widthOfTextAtSize(footerText, 7.5)

    p.drawText(footerText, {
      x: (pageWidth - footerWidth) / 2,
      y: 24,
      size: 7.5,
      font: helvetica,
      color: rgb(0.45, 0.45, 0.45),
    })
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
