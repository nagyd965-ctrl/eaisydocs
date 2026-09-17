import { GoogleGenAI } from "@google/genai"

let genAiInstance: GoogleGenAI | null = null

function getGoogleGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    return null
  }
  if (!genAiInstance) {
    genAiInstance = new GoogleGenAI({ apiKey })
  }
  return genAiInstance
}

/**
 * Generate a 768-dimensional semantic embedding vector for a given text.
 * Returns null if the API key is missing or an error occurs.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const clean = text?.trim()
  if (!clean) return null

  const ai = getGoogleGenAI()
  if (!ai) {
    return null
  }

  // Truncate if excessively long (Gemini supports large context, but ~6000 chars is ideal for embeddings)
  const truncated = clean.length > 6000 ? clean.slice(0, 6000) : clean

  try {
    const res = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: truncated,
      config: {
        outputDimensionality: 768,
      },
    })

    const values = res.embeddings?.[0]?.values
    if (Array.isArray(values) && values.length === 768) {
      return values
    }

    return null
  } catch (error) {
    console.error("[EmbeddingService] Error generating embedding:", error)
    return null
  }
}

/**
 * Builds a structured, semantically rich string from document metadata and OCR text.
 */
export function buildDocumentEmbeddingText(doc: {
  targy: string
  leiras?: string | null
  ocr_szoveg?: string | null
  partner_nev?: string | null
  iktatoszam?: string | null
}): string {
  const parts: string[] = []

  if (doc.targy) parts.push(`Tárgy: ${doc.targy}`)
  if (doc.partner_nev) parts.push(`Partner: ${doc.partner_nev}`)
  if (doc.iktatoszam) parts.push(`Iktatószám: ${doc.iktatoszam}`)
  if (doc.leiras) parts.push(`Leírás / Feljegyzés: ${doc.leiras}`)
  if (doc.ocr_szoveg) parts.push(`Dokumentum tartalma:\n${doc.ocr_szoveg}`)

  return parts.join("\n")
}

/**
 * Computes and updates the embedding for a specific irat.
 */
export async function updateIratEmbedding(iratId: string, supabase: any): Promise<boolean> {
  try {
    const { data: irat, error: iratErr } = await supabase
      .from("irat")
      .select(`
        id,
        targy,
        leiras,
        partner:kuldo_partner_id(nev),
        ugyirat:ugyirat_id(iktatoszam),
        irat_fajl(ocr_szoveg)
      `)
      .eq("id", iratId)
      .single()

    if (iratErr || !irat) {
      console.error("[EmbeddingService] Failed to load irat for embedding:", iratErr)
      return false
    }

    const ocrAggregated = (irat.irat_fajl as any[])?.map(f => f.ocr_szoveg || "").filter(Boolean).join(" ") || ""
    const textToEmbed = buildDocumentEmbeddingText({
      targy: irat.targy,
      leiras: irat.leiras,
      partner_nev: (irat.partner as any)?.nev,
      iktatoszam: (irat.ugyirat as any)?.iktatoszam,
      ocr_szoveg: ocrAggregated,
    })

    const embedding = await generateEmbedding(textToEmbed)
    if (!embedding) {
      return false
    }

    const vectorString = `[${embedding.join(",")}]`
    const { error: updateErr } = await supabase
      .from("irat")
      .update({ embedding: vectorString })
      .eq("id", iratId)

    if (updateErr) {
      console.error("[EmbeddingService] Failed to save embedding vector:", updateErr)
      return false
    }

    return true
  } catch (error) {
    console.error("[EmbeddingService] Error in updateIratEmbedding:", error)
    return false
  }
}

/**
 * Backfills embeddings for iratok that currently do not have an embedding vector.
 */
export async function backfillMissingEmbeddings(
  supabase: any,
  batchSize = 25
): Promise<{ processed: number; successCount: number }> {
  const { data: iratok, error } = await supabase
    .from("irat")
    .select("id")
    .is("embedding", null)
    .limit(batchSize)

  if (error || !iratok) {
    return { processed: 0, successCount: 0 }
  }

  let successCount = 0
  for (const item of iratok) {
    const ok = await updateIratEmbedding(item.id, supabase)
    if (ok) successCount++
  }

  return { processed: iratok.length, successCount }
}
