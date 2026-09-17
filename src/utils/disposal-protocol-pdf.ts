/**
 * eaisyDocs - Selejtezési és Levéltári Átadási Jegyzőkönyv PDF Generátor
 * Megfelel a hatályos magyar irattári és levéltári előírásoknak (pl. 335/2005. Korm. rendelet)
 */

export interface DisposalProtocolItem {
  iktatoszam: string
  targy: string
  tetelszam?: string
  tetelMegnevezes?: string
  megorzesiEv?: number
  megorzesiIdoVege?: string
  iratDarab?: number
  selejtezheto: boolean // true = Selejtezve (megsemmisítve), false = Levéltári átadásra átadva
}

export interface DisposalProtocolData {
  protocolNumber: string
  date: string
  cutoffDate?: string
  organizationName?: string
  proposerName: string
  approverName: string
  items: DisposalProtocolItem[]
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

export async function generateDisposalProtocolPdf(data: DisposalProtocolData): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")

  const pdfDoc = await PDFDocument.create()
  pdfDoc.setTitle(`Selejtezési Jegyzőkönyv — ${data.protocolNumber}`)
  pdfDoc.setAuthor("eaisyDocs")
  pdfDoc.setCreator("eaisyDocs - Elektronikus Iratkezelő Rendszer")
  pdfDoc.setCreationDate(new Date())

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  const pageWidth = 595.28 // A4 portrait
  const pageHeight = 841.89
  const margin = 45
  const contentWidth = pageWidth - margin * 2

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  const checkNewPage = (neededSpace: number) => {
    if (y - neededSpace < margin + 40) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
      return true
    }
    return false
  }

  // ==========================================
  // 1. FEJLÉC
  // ==========================================
  const org = data.organizationName || "eaisyDocs Iratkezelési Rendszer"
  page.drawText(clean(org.toUpperCase()), {
    x: margin,
    y,
    size: 10,
    font: helveticaBold,
    color: rgb(0.3, 0.3, 0.3),
  })

  page.drawText(clean(`Iktatószám: ${data.protocolNumber}`), {
    x: pageWidth - margin - 180,
    y,
    size: 10,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  })
  y -= 18

  page.drawText(clean("SELEJTEZÉSI ÉS LEVÉLTÁRI ÁTADÁSI JEGYZŐKÖNYV"), {
    x: margin,
    y,
    size: 15,
    font: helveticaBold,
    color: rgb(0.08, 0.12, 0.2),
  })
  y -= 8

  // Fintech teal vonal
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 2,
    color: rgb(0.01, 0.72, 0.80),
  })
  y -= 18

  // ==========================================
  // 2. JEGYZŐKÖNYVI ADATOK
  // ==========================================
  const meta = [
    ["Jegyzőkönyv száma", data.protocolNumber],
    ["Készítés dátuma", data.date],
    ["Fordulónap (ellenőrzési határnap)", data.cutoffDate || data.date],
    ["Selejtezést javasolta (Iratkezelő)", data.proposerName || "Iratkezelő"],
    ["Jóváhagyta és ellenőrizte (Vezető)", data.approverName || "Intézményvezető"],
    ["Eljárás jogalapja", "335/2005. (XII. 29.) Korm. rendelet / Hatályos Irattári Terv"],
  ]

  for (const [label, val] of meta) {
    page.drawText(`${clean(label)}:`, {
      x: margin,
      y,
      size: 9,
      font: helveticaBold,
      color: rgb(0.25, 0.25, 0.25),
    })
    page.drawText(clean(String(val)), {
      x: margin + 175,
      y,
      size: 9,
      font: helvetica,
      color: rgb(0.05, 0.05, 0.05),
    })
    y -= 13
  }
  y -= 10

  // ==========================================
  // 3. TÉTELES LISTA FEJLÉC
  // ==========================================
  page.drawText(clean("ÉRINTETT ÜGYIRATOK ÉS IRATTÁRI TÉTELEK JEGYZÉKE:"), {
    x: margin,
    y,
    size: 10,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  })
  y -= 14

  const drawTableHeader = () => {
    // Fejléc háttér
    page.drawRectangle({
      x: margin,
      y: y - 4,
      width: contentWidth,
      height: 18,
      color: rgb(0.93, 0.95, 0.97),
    })

    page.drawText("Ssz.", { x: margin + 4, y, size: 8, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) })
    page.drawText(clean("Iktatószám"), { x: margin + 28, y, size: 8, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) })
    page.drawText(clean("Tétel"), { x: margin + 115, y, size: 8, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) })
    page.drawText(clean("Tárgy"), { x: margin + 165, y, size: 8, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) })
    page.drawText(clean("Irat"), { x: margin + 355, y, size: 8, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) })
    page.drawText(clean("Lejárat"), { x: margin + 385, y, size: 8, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) })
    page.drawText(clean("Intézkedés"), { x: margin + 438, y, size: 8, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) })

    y -= 16
  }

  drawTableHeader()

  // Tételek rajzolása
  data.items.forEach((item, idx) => {
    if (checkNewPage(24)) {
      drawTableHeader()
    }

    const isEven = idx % 2 === 0
    if (isEven) {
      page.drawRectangle({
        x: margin,
        y: y - 3,
        width: contentWidth,
        height: 14,
        color: rgb(0.98, 0.98, 0.99),
      })
    }

    const ssz = `${idx + 1}.`
    const ikt = item.iktatoszam.length > 15 ? item.iktatoszam.substring(0, 15) + "..." : item.iktatoszam
    const tetel = item.tetelszam ? `${item.tetelszam}` : "-"
    
    // Tárgy levágása ha túl hosszú
    let targy = item.targy || "-"
    if (targy.length > 36) {
      targy = targy.substring(0, 33) + "..."
    }

    const iratDb = item.iratDarab !== undefined ? `${item.iratDarab} db` : "1 db"
    const lejarat = item.megorzesiIdoVege || "-"
    const intezkedes = item.selejtezheto ? "Megsemmisítés" : "Levéltári átadás"

    page.drawText(clean(ssz), { x: margin + 4, y, size: 8, font: helvetica, color: rgb(0.2, 0.2, 0.2) })
    page.drawText(clean(ikt), { x: margin + 28, y, size: 8, font: helveticaBold, color: rgb(0.05, 0.05, 0.05) })
    page.drawText(clean(tetel), { x: margin + 115, y, size: 8, font: helvetica, color: rgb(0.3, 0.3, 0.3) })
    page.drawText(clean(targy), { x: margin + 165, y, size: 8, font: helvetica, color: rgb(0.1, 0.1, 0.1) })
    page.drawText(clean(iratDb), { x: margin + 355, y, size: 8, font: helvetica, color: rgb(0.3, 0.3, 0.3) })
    page.drawText(clean(lejarat), { x: margin + 385, y, size: 8, font: helvetica, color: rgb(0.3, 0.3, 0.3) })

    // Megsemmisítés / Levéltári átadás szövegszín
    const intColor = item.selejtezheto ? rgb(0.7, 0.1, 0.1) : rgb(0.1, 0.4, 0.7)
    page.drawText(clean(intezkedes), { x: margin + 438, y, size: 8, font: helveticaBold, color: intColor })

    y -= 14
  })

  y -= 12
  checkNewPage(180)

  // Elválasztó vonal
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  })
  y -= 16

  // ==========================================
  // 4. JOGI NYILATKOZAT & NÉGY-SZEM ZÁRADÉK
  // ==========================================
  page.drawText(clean("SELEJTEZÉSI ÉS MEGSZÜNTETÉSI ZÁRADÉK:"), {
    x: margin,
    y,
    size: 9,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  })
  y -= 13

  const statementLines = [
    "Alulírott felek igazoljuk, hogy a fenti jegyzékben szereplő ügyiratok megőrzési ideje az érvényes irattári terv",
    "alapján lejárt. Megállapítjuk, hogy az iratok sem a folyamatos feladatellátáshoz, sem ellenőrzésekhez,",
    "sem pedig egyéb jogviták tisztázásához a továbbiakban nem szükségesek.",
    "A négy-szem elvű jóváhagyási eljárást lefolytattuk. A selejtezhető iratok fizikai és logikai digitális",
    "állományai véglegesen és helyreállíthatatlanul törlésre kerültek, míg a maradandó értékű iratok",
    "az illetékes közlevéltár részére történő átadásra előkészítést nyertek.",
  ]

  for (const line of statementLines) {
    page.drawText(clean(line), {
      x: margin,
      y,
      size: 8,
      font: helveticaOblique,
      color: rgb(0.25, 0.25, 0.25),
    })
    y -= 11
  }

  y -= 35
  checkNewPage(70)

  // ==========================================
  // 5. ALÁÍRÁSI SÁV
  // ==========================================
  const col1X = margin + 20
  const col2X = margin + 300
  const signLineWidth = 180

  page.drawLine({
    start: { x: col1X, y },
    end: { x: col1X + signLineWidth, y },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.2),
  })

  page.drawLine({
    start: { x: col2X, y },
    end: { x: col2X + signLineWidth, y },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.2),
  })
  y -= 13

  page.drawText(clean(data.proposerName || "Iratkezelő"), {
    x: col1X + 10,
    y,
    size: 9,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  })

  page.drawText(clean(data.approverName || "Intézményvezető"), {
    x: col2X + 10,
    y,
    size: 9,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  })
  y -= 11

  page.drawText(clean("Javaslattevő (Iratkezelő)"), {
    x: col1X + 10,
    y,
    size: 8,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  })

  page.drawText(clean("Jóváhagyó (Vezető / Selejtezési Bizottság)"), {
    x: col2X + 10,
    y,
    size: 8,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  })

  // Lábléc minden oldalon
  const totalPages = pdfDoc.getPageCount()
  for (let i = 0; i < totalPages; i++) {
    const p = pdfDoc.getPage(i)
    p.drawText(
      clean(`eaisyDocs Iratkezelő — Selejtezési Jegyzőkönyv: ${data.protocolNumber} — Oldal: ${i + 1} / ${totalPages}`),
      {
        x: margin,
        y: 20,
        size: 7,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      }
    )
  }

  return await pdfDoc.save()
}
