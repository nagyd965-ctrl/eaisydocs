/**
 * Segédfüggvény PDF szövegtartalom megbízható kinyeréséhez.
 * Kezeli a pdf-parse v2 API-t és a Turbopack bundle kompatibilitást.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line no-eval
    const pdfParseModule = eval('require("pdf-parse")')
    if (typeof pdfParseModule === "function") {
      const result = await pdfParseModule(buffer)
      return result.text || ""
    } else if (pdfParseModule?.PDFParse) {
      const parser = new pdfParseModule.PDFParse({ data: buffer })
      const result = await parser.getText()
      return result.text || ""
    }
  } catch (err) {
    console.warn("PDF text extraction warning:", err)
  }
  return ""
}
