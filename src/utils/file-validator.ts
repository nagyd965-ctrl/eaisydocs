import { PDFDocument, PDFName } from "pdf-lib"
import { extractPdfText } from "./pdf-extractor"

export interface FileValidationResult {
  valid: boolean
  error?: string
}

/**
 * Ellenőrzi a feltöltött fájl méretét, integritását, formátumát és tartalmát.
 * Kiszűri a 0 bájtos, csonka, sérült, jelszóval védett vagy teljesen üres (fehér lap) PDF fájlokat.
 */
export async function validateUploadedDocument(
  file: File,
  buffer: Buffer
): Promise<FileValidationResult> {
  // 1. 0 bájtos üres fájl ellenőrzése
  if (!buffer || buffer.length === 0 || file.size === 0) {
    return {
      valid: false,
      error: "A kiválasztott fájl üres (0 bájt)! Kérjük, töltsön fel valós iratot.",
    }
  }

  const isPdf =
    file.name.toLowerCase().endsWith(".pdf") ||
    file.type === "application/pdf"

  if (isPdf) {
    // 2. Minimum PDF méret és fejléc ellenőrzés
    if (buffer.length < 32) {
      return {
        valid: false,
        error: "A feltöltött fájl mérete túl kicsi, nem érvényes PDF dokumentum!",
      }
    }

    const header = buffer.subarray(0, 5).toString("utf-8")
    if (!header.startsWith("%PDF-")) {
      return {
        valid: false,
        error: "A feltöltött fájl nem valódi PDF állomány (hiányzó vagy hibás '%PDF-' fejléc)!",
      }
    }

    // 3. PDF strukturális integritás és jelszóvédelem ellenőrzése
    let pdfDoc: PDFDocument
    try {
      pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: false })
      const pageCount = pdfDoc.getPageCount()

      if (pageCount === 0) {
        return {
          valid: false,
          error: "A PDF dokumentum érvénytelen, nem tartalmaz egyetlen oldalt sem!",
        }
      }
    } catch (pdfErr: any) {
      const errMsg = (pdfErr?.message || "").toLowerCase()
      if (
        pdfErr?.name === "EncryptedPDFError" ||
        errMsg.includes("encrypted") ||
        errMsg.includes("password")
      ) {
        return {
          valid: false,
          error: "A PDF dokumentum jelszóval vagy titkosítással védett! Kérjük, oldja fel a védelmet a feltöltés előtt.",
        }
      }
      return {
        valid: false,
        error: `A PDF dokumentum sérült vagy csonka (${pdfErr.message || "nem olvasható formátum"})!`,
      }
    }

    // 4. Tartalom ellenőrzése: ne lehessen teljesen üres (tartalom nélküli fehér lapot) feltölteni
    try {
      const rawText = await extractPdfText(buffer)
      const cleanText = (rawText || "")
        .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, "")
        .replace(/Page\s*\d+\s*of\s*\d+/gi, "")
        .trim()

      let hasAnyContent = cleanText.length > 0

      if (!hasAnyContent) {
        const pages = pdfDoc.getPages()
        for (const page of pages) {
          // Ha a lapon van beágyazott XObject (pl. kép vagy űrlap)
          const resources = page.node.Resources()
          if (resources) {
            const xObject = resources.lookup(PDFName.of("XObject"))
            if (xObject) {
              hasAnyContent = true
              break
            }
          }

          // Ha a lapnak van érdemi tartalomfolyama (rajzolás, vonalak, vektorok)
          const contents = page.node.Contents()
          if (contents) {
            const size =
              typeof (contents as any).sizeInBytes === "function"
                ? (contents as any).sizeInBytes()
                : 0
            if (size > 30) {
              hasAnyContent = true
              break
            }
          }
        }
      }

      if (!hasAnyContent) {
        return {
          valid: false,
          error: "A kiválasztott PDF dokumentum teljesen üres (nem tartalmaz szöveget, képet vagy egyéb tartalmat)! Kérjük, töltsön fel valós iratot.",
        }
      }
    } catch (contentCheckErr) {
      console.warn("[FileValidator] Tartalom-ellenőrzési figyelmeztetés:", contentCheckErr)
      // Ha a tartalomvizsgálat váratlanul hibára futna de a PDF egyébként ép, átengedjük
    }
  }

  return { valid: true }
}
