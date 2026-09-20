import { PDFDocument, rgb } from "pdf-lib"
import fontkit from "@pdf-lib/fontkit"
import crypto from "crypto"
import fs from "fs"
import path from "path"
import { extractPdfText } from "./pdf-extractor"

// Known tokens that classify a page as an elválasztólap (separator sheet)
const SEPARATOR_KEYWORDS = [
  "DOC-SPLIT",
  "DOC_SPLIT",
  "EAISYDOCS-SEPARATOR",
  "EAISYDOCS_SEPARATOR",
  "ELVALASZTO-LAP",
  "ELVÁLASZTÓ LAP",
  "ELVALASZTO LAP",
  "PATCH-T",
  "PATCH-2",
  "*SPLIT*",
  "BARCODE:SPLIT",
]

export interface SplitDocumentItem {
  index: number
  pageCount: number
  sourcePages: number[] // 1-indexed page numbers in the original scanned batch
  buffer: Buffer
}

export interface BatchSplitResult {
  totalOriginalPages: number
  separatorPagesFound: number[] // 1-indexed page numbers
  documents: SplitDocumentItem[]
}

export interface IngestBatchMetadata {
  targyPrefix?: string
  kuldoNev?: string
  kuldoTipus?: string
  partnerId?: string | null
  minosites?: string
  felhasznaloId?: string
  erkezesModja?: string
}

export interface IngestedDocumentResult {
  iratId: string
  erkeztetoszam: string
  targy: string
  pageCount: number
  sourcePages: number[]
}

/**
 * Extracts text page-by-page from a PDF buffer using pdf-parse.
 */
export async function extractPagesText(buffer: Buffer): Promise<string[]> {
  try {
    const pdfParseModule = eval('require("pdf-parse")')

    if (pdfParseModule?.PDFParse) {
      const parser = new pdfParseModule.PDFParse({ data: buffer })
      const res = await parser.getText()
      if (res?.pages && Array.isArray(res.pages)) {
        return res.pages.map((p: any) => (typeof p.text === "string" ? p.text : ""))
      }
      if (typeof res?.text === "string") {
        return [res.text]
      }
    }

    if (typeof pdfParseModule === "function") {
      const pagesText: string[] = []
      const options = {
        pagerender: (pageData: any) => {
          return pageData.getTextContent().then((textContent: any) => {
            let text = ""
            for (const item of textContent.items) {
              text += (item.str || "") + " "
            }
            pagesText.push(text)
            return text
          })
        },
      }
      await pdfParseModule(buffer, options)
      return pagesText
    }

    return []
  } catch (err) {
    console.warn("[BatchScanner] Warning during page text extraction:", err)
    return []
  }
}

/**
 * Checks if a page is an elválasztólap (separator sheet).
 */
export function isPageSeparator(pageText: string): boolean {
  if (!pageText || typeof pageText !== "string") return false
  const upper = pageText.toUpperCase()
  for (const kw of SEPARATOR_KEYWORDS) {
    if (upper.includes(kw)) {
      return true
    }
  }
  return false
}

/**
 * Splits a multi-page batch scanned PDF into individual documents by identifying and removing separator sheets.
 */
export async function splitBatchPdf(buffer: Buffer): Promise<BatchSplitResult> {
  const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const totalPages = srcDoc.getPageCount()

  if (totalPages === 0) {
    return {
      totalOriginalPages: 0,
      separatorPagesFound: [],
      documents: [],
    }
  }

  // 1. Extract text for each page to detect separator keywords / barcodes
  const pagesText = await extractPagesText(buffer)

  const separatorPages: number[] = []
  const contentPageRanges: number[][] = []
  let currentRange: number[] = []

  for (let i = 0; i < totalPages; i++) {
    const pageNum = i + 1
    const text = pagesText[i] || ""
    const isSep = isPageSeparator(text)

    if (isSep) {
      separatorPages.push(pageNum)
      if (currentRange.length > 0) {
        contentPageRanges.push(currentRange)
        currentRange = []
      }
    } else {
      currentRange.push(i) // 0-indexed page index for pdf-lib copyPages
    }
  }

  if (currentRange.length > 0) {
    contentPageRanges.push(currentRange)
  }

  // If no separator pages were detected, the entire document is treated as a single document
  if (separatorPages.length === 0 && contentPageRanges.length === 0) {
    contentPageRanges.push(Array.from({ length: totalPages }, (_, i) => i))
  }

  // 2. Build separate PDFDocuments for each content range
  const documents: SplitDocumentItem[] = []

  for (let idx = 0; idx < contentPageRanges.length; idx++) {
    const range = contentPageRanges[idx]
    if (range.length === 0) continue

    const newDoc = await PDFDocument.create()
    const copiedPages = await newDoc.copyPages(srcDoc, range)
    for (const page of copiedPages) {
      newDoc.addPage(page)
    }

    const docBytes = await newDoc.save()
    documents.push({
      index: idx + 1,
      pageCount: range.length,
      sourcePages: range.map((p) => p + 1), // 1-indexed for reporting
      buffer: Buffer.from(docBytes),
    })
  }

  return {
    totalOriginalPages: totalPages,
    separatorPagesFound: separatorPages,
    documents,
  }
}

async function loadSeparatorFonts(doc: PDFDocument) {
  doc.registerFontkit(fontkit)

  const candidatesBold = [
    path.join(process.cwd(), "src", "assets", "fonts", "LiberationSans-Bold.ttf"),
    path.join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts", "LiberationSans-Bold.ttf"),
  ]
  const candidatesReg = [
    path.join(process.cwd(), "src", "assets", "fonts", "LiberationSans-Regular.ttf"),
    path.join(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts", "LiberationSans-Regular.ttf"),
  ]

  let boldBytes: Buffer | null = null
  for (const p of candidatesBold) {
    if (fs.existsSync(p)) {
      boldBytes = fs.readFileSync(p)
      break
    }
  }

  let regBytes: Buffer | null = null
  for (const p of candidatesReg) {
    if (fs.existsSync(p)) {
      regBytes = fs.readFileSync(p)
      break
    }
  }

  if (boldBytes && regBytes) {
    const fontBold = await doc.embedFont(boldBytes)
    const fontRegular = await doc.embedFont(regBytes)
    return { fontBold, fontRegular }
  }

  const { StandardFonts } = await import("pdf-lib")
  return {
    fontBold: await doc.embedFont(StandardFonts.HelveticaBold),
    fontRegular: await doc.embedFont(StandardFonts.Helvetica),
  }
}

/**
 * Generates a standardized, printable A4 PDF Elválasztólap (Separator Sheet)
 * with 1D Code128 / Code39 style bars, standard marker tokens, and proper Hungarian accents.
 */
export async function generateSeparatorSheetPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595.28, 841.89]) // A4 dimensions in points
  const { fontBold, fontRegular } = await loadSeparatorFonts(doc)

  const { width, height } = page.getSize()

  // Top header border
  page.drawRectangle({
    x: 40,
    y: height - 60,
    width: width - 80,
    height: 4,
    color: rgb(0.08, 0.72, 0.65), // Fintech Teal
  })

  // System Title
  page.drawText("eaisyDocs – Iratkezelő Rendszer", {
    x: 40,
    y: height - 85,
    size: 14,
    font: fontBold,
    color: rgb(0.15, 0.2, 0.25),
  })

  // Main Banner
  page.drawRectangle({
    x: 40,
    y: height - 200,
    width: width - 80,
    height: 90,
    color: rgb(0.95, 0.97, 0.98),
    borderColor: rgb(0.8, 0.85, 0.9),
    borderWidth: 1,
  })

  page.drawText("DOKUMENTUM ELVÁLASZTÓ LAP", {
    x: 60,
    y: height - 150,
    size: 20,
    font: fontBold,
    color: rgb(0.08, 0.72, 0.65),
  })

  page.drawText("Helyezze ezt a lapot két szkennelendő fizikai irat közé az adagolóba!", {
    x: 60,
    y: height - 180,
    size: 11,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.4),
  })

  // Simulated Barcode Box in the center
  const barcodeBoxY = height - 440
  page.drawRectangle({
    x: 90,
    y: barcodeBoxY,
    width: width - 180,
    height: 180,
    borderColor: rgb(0.2, 0.2, 0.2),
    borderWidth: 2,
    color: rgb(1, 1, 1),
  })

  // Draw vertical barcode lines
  const startX = 120
  const barTopY = barcodeBoxY + 150
  const barHeight = 90
  const pattern = [
    3, 1, 1, 3, 2, 1, 4, 1, 2, 2, 1, 3, 3, 1, 2, 1, 4, 2, 1, 3, 2, 1, 1, 4, 2, 1, 3, 2, 1, 2,
    3, 1, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 1, 3, 2, 2, 1, 4, 3, 1, 2, 1, 3, 1, 2, 4, 1, 3, 2, 1,
  ]

  let curX = startX
  for (let i = 0; i < pattern.length; i++) {
    const barWidth = pattern[i] * 2
    if (i % 2 === 0) {
      page.drawRectangle({
        x: curX,
        y: barTopY - barHeight,
        width: barWidth,
        height: barHeight,
        color: rgb(0, 0, 0),
      })
    }
    curX += barWidth + 2
  }

  // Explicit Barcode Text (scannable via OCR & vision)
  page.drawText("*DOC-SPLIT*", {
    x: width / 2 - 55,
    y: barcodeBoxY + 35,
    size: 16,
    font: fontBold,
    color: rgb(0, 0, 0),
  })

  page.drawText("EAISYDOCS-SEPARATOR", {
    x: width / 2 - 70,
    y: barcodeBoxY + 15,
    size: 10,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  })

  // Instructions & Guidelines Footer
  page.drawRectangle({
    x: 40,
    y: 90,
    width: width - 80,
    height: 120,
    color: rgb(0.97, 0.98, 0.99),
  })

  page.drawText("HASZNÁLATI ÚTMUTATÓ KÖTEGELT SZKENNELÉSHEZ:", {
    x: 60,
    y: 180,
    size: 10,
    font: fontBold,
    color: rgb(0.2, 0.25, 0.3),
  })

  page.drawText("1. Nyomtasson annyi elválasztólapot, ahány önálló irat közé határvonalat szeretne tenni.", {
    x: 60,
    y: 160,
    size: 9,
    font: fontRegular,
    color: rgb(0.35, 0.4, 0.45),
  })

  page.drawText("2. Helyezze a szkennerbe a csomagot a fizikai elválasztólapokkal együtt.", {
    x: 60,
    y: 145,
    size: 9,
    font: fontRegular,
    color: rgb(0.35, 0.4, 0.45),
  })

  page.drawText("3. A rendszer a köteg beérkezésekor automatikusan felismeri a vonalkódot,", {
    x: 60,
    y: 130,
    size: 9,
    font: fontRegular,
    color: rgb(0.35, 0.4, 0.45),
  })

  page.drawText("   szétvágja a PDF-et, és EZT AZ ELVÁLASZTÓLAPOT AUTOMATIKUSAN KIDOBJA a végső iratból.", {
    x: 60,
    y: 115,
    size: 9,
    font: fontBold,
    color: rgb(0.08, 0.72, 0.65),
  })

  const pdfBytes = await doc.save()
  return Buffer.from(pdfBytes)
}


/**
 * Ingests an array of split documents into eaisyDocs incoming queue (`irat` + `irat_fajl`).
 */
export async function ingestSplitDocuments(
  splitDocs: SplitDocumentItem[],
  metadata: IngestBatchMetadata,
  supabase: any
): Promise<IngestedDocumentResult[]> {
  const results: IngestedDocumentResult[] = []

  for (const doc of splitDocs) {
    const currentYear = new Date().getFullYear()
    const { data: erkezId } = await supabase.rpc("generate_erkeztetoszam", { p_ev: currentYear })
    const erkeztetoszam = erkezId || `E/${currentYear}/${Math.floor(10000 + Math.random() * 90000)}`

    const fileExt = "pdf"
    const fileName = `${crypto.randomUUID()}.${fileExt}`
    const hash = crypto.createHash("sha256").update(doc.buffer).digest("hex")

    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("irat_files")
      .upload(fileName, doc.buffer, {
        contentType: "application/pdf",
        upsert: false,
      })

    if (uploadError) {
      console.error(`[BatchScanner] Storage upload error for doc ${doc.index}:`, uploadError)
      continue
    }

    // 2. Extract OCR text
    const ocr_szoveg = await extractPdfText(doc.buffer)

    // 3. Prepare Title
    let targy = metadata.targyPrefix
      ? `${metadata.targyPrefix} (${doc.index}. tétel – ${doc.pageCount} oldal)`
      : `Szkennelt irat (${doc.index}. tétel – ${doc.pageCount} oldal)`

    // If first lines of OCR text contain a prominent title, we can enhance the subject
    if (ocr_szoveg) {
      const firstLines = ocr_szoveg
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 5 && !l.includes("DOC-SPLIT"))
      if (firstLines.length > 0 && !metadata.targyPrefix) {
        targy = `${firstLines[0].slice(0, 80)} (${doc.index}. tétel)`
      }
    }

    // 4. Insert into `irat` table
    const { data: iratData, error: iratErr } = await supabase
      .from("irat")
      .insert({
        targy,
        erkezes_modja: metadata.erkezesModja || "rendszer",
        adathordozo_tipus: "papir_digitalizalt",
        minosites: metadata.minosites || "nyilt",
        irany: "bejovo",
        kuldo_partner_id: metadata.partnerId || null,
        erkeztetoszam,
        kulso_forras: "szkenner",
      })
      .select("id")
      .single()

    if (iratErr || !iratData) {
      console.error(`[BatchScanner] DB insert error for irat ${doc.index}:`, iratErr)
      continue
    }

    // 5. Insert into `irat_fajl` table
    const { data: fajlResult, error: fajlErr } = await supabase
      .from("irat_fajl")
      .insert({
        irat_id: iratData.id,
        storage_path: fileName,
        eredeti_fajlnev: `szkennelt_irat_${doc.index}.pdf`,
        mime_type: "application/pdf",
        meret_byte: doc.buffer.length,
        sha256: hash,
        ocr_szoveg,
      })
      .select("id")
      .single()

    if (fajlErr) {
      console.error(`[BatchScanner] DB insert error for irat_fajl ${doc.index}:`, fajlErr)
    }

    // 6. Background PDF/A conversion trigger
    if (fajlResult) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      fetch(`${appUrl}/api/pdf/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fajl_id: fajlResult.id }),
      }).catch((err) => console.warn("[BatchScanner] PDF/A worker trigger warning:", err))
    }

    // 7. Background saved search alerts (embedding is handled by ai_feladat_sor and worker)
    ;(async () => {
      try {
        const { checkSavedSearchesForNewIrat } = await import("@/utils/saved-search-alerts")
        await checkSavedSearchesForNewIrat(iratData.id, supabase)
      } catch (bgErr) {
        console.error("[BatchScanner] Error in background alert:", bgErr)
      }
    })().catch(console.error)

    results.push({
      iratId: iratData.id,
      erkeztetoszam,
      targy,
      pageCount: doc.pageCount,
      sourcePages: doc.sourcePages,
    })
  }

  return results
}
