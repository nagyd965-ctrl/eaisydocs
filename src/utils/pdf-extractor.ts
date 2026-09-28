/**
 * PDF szövegtartalom kinyerése - Vercel-kompatibilis implementáció.
 *
 * A projekt pdf-parse v2-t használ. A v2 API class-alapú:
 *   new PDFParse({ data: buffer, verbosity: -1 })
 *   await parser.load()
 *   await parser.getText()  → { text: string, pages: string[] }
 *
 * createRequire segítségével töltjük be (nem eval, nem dynamic import),
 * ami Node.js-ben és Vercelen egyaránt megbízhatóan működik.
 * A csomag a serverExternalPackages listában van → a bundler nem nyúl hozzá.
 */
import { createRequire } from "node:module"
import path from "node:path"

// Vercel-safe createRequire: import.meta.url az ESM context-ben érhető el,
// de ha valamilyen okból undefined lenne, process.cwd() alapú fallback-et használunk.
const _require = createRequire(
  typeof import.meta?.url === "string"
    ? import.meta.url
    : path.join(process.cwd(), "index.js")
)

type PDFParseConstructorOpts = { data: Buffer; verbosity?: number }
type PDFParseInstance = {
  load(): Promise<unknown>
  getText(): Promise<{ text: string; pages?: string[] }>
  destroy(): Promise<void>
}
type PDFParseClass = new (opts: PDFParseConstructorOpts) => PDFParseInstance

let _PDFParseCache: PDFParseClass | null = null

function getPDFParse(): PDFParseClass | null {
  if (_PDFParseCache) return _PDFParseCache
  try {
    const mod = _require("pdf-parse")
    _PDFParseCache = mod?.PDFParse ?? null
    return _PDFParseCache
  } catch (err) {
    console.warn("[PDFExtractor] pdf-parse betöltési hiba:", err)
    return null
  }
}

/**
 * A teljes PDF szövegét adja vissza egyetlen stringként.
 * Iktatáshoz és OCR tároláshoz használatos.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const PDFParse = getPDFParse()
  if (!PDFParse) return ""
  const parser = new PDFParse({ data: buffer, verbosity: -1 })
  try {
    await parser.load()
    const result = await parser.getText()
    return result?.text ?? ""
  } catch (err) {
    console.warn("[PDFExtractor] Text extraction warning:", err)
    return ""
  } finally {
    try { await parser.destroy() } catch { /* ignore */ }
  }
}

/**
 * Az egyes oldalak szövegét adja vissza tömbként (oldalanként 1 elem).
 * A batch-scanner elválasztólap-felismeréshez szükséges.
 *
 * A pdf-parse v2 getText() visszatér { text, pages } ahol pages string[].
 */
export async function extractPdfPagesText(buffer: Buffer): Promise<string[]> {
  const PDFParse = getPDFParse()
  if (!PDFParse) return []

  const parser = new PDFParse({ data: buffer, verbosity: -1 })
  try {
    await parser.load()
    const result = await parser.getText()

    // pdf-parse v2: result.pages = string[] (oldalanként 1 szöveg)
    if (Array.isArray(result?.pages) && result.pages.length > 0) {
      return result.pages.map((p: any) =>
        typeof p === "string" ? p : (typeof p?.text === "string" ? p.text : "")
      )
    }

    // Fallback: a teljes szöveg egy darabban → 1 oldalként kezeljük
    return result?.text ? [result.text] : []
  } catch (err) {
    console.warn("[PDFExtractor] Pages text extraction warning:", err)
    return []
  } finally {
    try { await parser.destroy() } catch { /* ignore */ }
  }
}
