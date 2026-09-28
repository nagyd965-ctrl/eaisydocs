/**
 * PDF szövegtartalom kinyerése - Vercel és Node.js kompatibilis implementáció.
 *
 * A pdfjs-dist/legacy modult használja, amely:
 *  - Tisztán fut Node.js és Vercel Serverless (AWS Lambda) környezetben.
 *  - Nem igényel C++ natív kiegészítőket (mint pl. az @napi-rs/canvas).
 *  - Nem igényel eval() vagy dinamikus createRequire hívásokat, így a Vercel
 *    build/NFT megfelelően felcsomagolja.
 */

async function getPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
  return pdfjs
}

/**
 * A teljes PDF szövegét adja vissza egyetlen összefűzött stringként.
 * Iktatáshoz, OCR tároláshoz és AI elemzéshez használatos.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pages = await extractPdfPagesText(buffer)
  return pages.join("\n\n")
}

/**
 * Az egyes oldalak szövegét adja vissza tömbként (oldalanként 1 elem).
 * A batch-scanner elválasztólap-felismeréshez szükséges.
 */
export async function extractPdfPagesText(buffer: Buffer): Promise<string[]> {
  if (!buffer || buffer.length === 0) return []

  try {
    const pdfjs = await getPdfJs()
    const data = new Uint8Array(buffer)

    const loadingTask = pdfjs.getDocument({
      data,
      disableFontFace: true,
      useSystemFonts: false,
      verbosity: 0,
    })

    const doc = await loadingTask.promise
    const pages: string[] = []

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const textContent = await page.getTextContent()
      const text = textContent.items
        .map((item: { str?: string }) => (typeof item?.str === "string" ? item.str : ""))
        .join(" ")
        .trim()
      pages.push(text)
    }

    try {
      await doc.destroy()
    } catch {
      // ignore
    }

    return pages
  } catch (err) {
    console.warn("[PDFExtractor] Pages text extraction error:", err)
    return []
  }
}
