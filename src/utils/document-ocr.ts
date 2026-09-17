import { GoogleGenAI } from "@google/genai"
import { extractPdfText } from "./pdf-extractor"

/**
 * Hibrid magyar nyelvű OCR és szövegkinyerő szerviz.
 * 1. Digitális PDF esetén gyors helyi szövegréteg-kinyerés.
 * 2. Szkennelt iratok, képek vagy szövegréteg nélküli PDF-ek esetén Gemini Vision OCR.
 */
export async function extractDocumentText(
  fileBuffer: Buffer,
  mimeType: string,
  fileName?: string
): Promise<{ text: string; isScanned: boolean }> {
  const isPdf = mimeType === "application/pdf" || fileName?.toLowerCase().endsWith(".pdf")

  // 1. Ha PDF, megpróbáljuk a gyors helyi kinyerést
  if (isPdf) {
    try {
      const digitalText = await extractPdfText(fileBuffer)
      if (digitalText && digitalText.trim().length >= 40) {
        return {
          text: digitalText.trim(),
          isScanned: false,
        }
      }
    } catch (err) {
      console.warn("[DocumentOCR] Helyi PDF szövegkinyerési figyelmeztetés:", err)
    }
  }

  // 2. Ha szkennelt irat vagy kép, Gemini Vision OCR-t alkalmazunk
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    console.warn("[DocumentOCR] GOOGLE_API_KEY hiányzik, Vision OCR nem futtatható.")
    return { text: "", isScanned: true }
  }

  // Méretkorlát ellenőrzése (max 15MB Vision híváshoz)
  if (fileBuffer.length > 15 * 1024 * 1024) {
    console.warn("[DocumentOCR] A fájl meghaladja a 15MB-os méretkorlátot.")
    return { text: "", isScanned: true }
  }

  try {
    const ai = new GoogleGenAI({ apiKey })
    const base64Data = fileBuffer.toString("base64")
    const docMime = isPdf ? "application/pdf" : mimeType || "image/jpeg"

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          text: `Te egy magyar nyelvű OCR és hivatalos dokumentumolvasó motor vagy.
Feladatod: Olvasd ki a csatolt szkennelt magyar nyelvű hivatalos dokumentum teljes szöveges tartalmát betűhűen!
- Őrizd meg a magyar ékezeteket (á, é, í, ó, ö, ő, ú, ü, ű).
- Különösen ügyelj a dátumokra, számokra, iktatószámokra, adószámokra és nevekre.
- Csak a kinyert szöveget add vissza, semmilyen bevezető vagy magyarázó szöveg nélkül!`,
        },
        {
          inlineData: {
            mimeType: docMime,
            data: base64Data,
          },
        },
      ],
    })

    const ocrText = response.text?.trim() || ""
    return {
      text: ocrText,
      isScanned: true,
    }
  } catch (ocrErr) {
    console.error("[DocumentOCR] Gemini Vision OCR hiba:", ocrErr)
    return { text: "", isScanned: true }
  }
}
