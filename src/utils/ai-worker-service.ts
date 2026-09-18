import { createClient } from "@supabase/supabase-js"
import { updateIratEmbedding } from "./embedding-service"
import { checkSavedSearchesForNewIrat } from "./saved-search-alerts"

// Service role Supabase client for background worker operations
function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Rate Limiter configuration (Gemini API quotas protection)
const MIN_REQUEST_INTERVAL_MS = 3500 // Min 3.5s between external LLM calls (~17 req/min max)
let lastRequestTime = 0

async function throttleRateLimit() {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    const delay = MIN_REQUEST_INTERVAL_MS - elapsed
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
  lastRequestTime = Date.now()
}

export interface ClaimedTask {
  task_id: string
  task_irat_id: string
  task_tipus: "embedding" | "ai_metadata_extraction" | "ocr" | "pdfa_conversion"
  task_probalkozasok: number
  task_created_at: string
  task_fajl_id?: string | null
}

/**
 * Enqueues a PDF/A conversion task into the background queue.
 */
export async function enqueuePdfaConversion(iratId: string, fajlId?: string, client?: any) {
  const supabase = client || getAdminSupabase()
  return await supabase
    .from("ai_feladat_sor")
    .upsert(
      {
        irat_id: iratId,
        fajl_id: fajlId || null,
        feladat_tipus: "pdfa_conversion",
        statusz: "fuggoben",
        kovetkezo_futtatas: new Date().toISOString(),
      },
      { onConflict: "irat_id, feladat_tipus" }
    )
}

/**
 * Claims pending tasks atomically from the queue using Postgres row-level locks.
 */
export async function claimTasks(limit: number = 3): Promise<ClaimedTask[]> {
  const supabase = getAdminSupabase()
  const { data, error } = await supabase.rpc("claim_ai_tasks", { p_limit: limit })

  if (error) {
    console.error("[AIWorker] Error claiming tasks:", error)
    return []
  }

  return (data as ClaimedTask[]) || []
}

/**
 * Processes a single AI task according to its type.
 */
export async function processTask(task: ClaimedTask): Promise<{ success: boolean; error?: string }> {
  const supabase = getAdminSupabase()

  try {
    if (task.task_tipus === "embedding") {
      await throttleRateLimit()
      const embeddingSuccess = await updateIratEmbedding(task.task_irat_id, supabase)
      if (!embeddingSuccess) {
        throw new Error("Failed to generate or persist document embedding")
      }
      // Check saved search alerts for this document
      try {
        await checkSavedSearchesForNewIrat(task.task_irat_id, supabase)
      } catch (alertErr) {
        console.warn("[AIWorker] Warning checking saved search alerts:", alertErr)
      }

      // Mark task as completed
      await supabase
        .from("ai_feladat_sor")
        .update({
          statusz: "kesz",
          utolso_hiba: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.task_id)

      return { success: true }
    }

    if (task.task_tipus === "ai_metadata_extraction") {
      await throttleRateLimit()
      const { executeAiMetadataExtraction } = await import("@/app/inbox/filing-actions")
      const extractionResult = await executeAiMetadataExtraction(task.task_irat_id, supabase)

      if (!extractionResult || !extractionResult.success) {
        throw new Error(extractionResult?.error || "AI metadata extraction failed")
      }

      await supabase
        .from("ai_feladat_sor")
        .update({
          statusz: "kesz",
          eredmeny: extractionResult.suggestions,
          utolso_hiba: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.task_id)

      return { success: true }
    }

    if (task.task_tipus === "pdfa_conversion") {
      let fajlQuery = supabase.from("irat_fajl").select("id, storage_path, pdfa_path, eredeti_fajlnev")
      if (task.task_fajl_id) {
        fajlQuery = fajlQuery.eq("id", task.task_fajl_id)
      } else {
        fajlQuery = fajlQuery.eq("irat_id", task.task_irat_id)
      }
      const { data: fajlok, error: fetchErr } = await fajlQuery.limit(1)
      const fajl = fajlok?.[0]
      if (fetchErr || !fajl) {
        throw new Error("Fájl rekord nem található a PDF/A konverzióhoz")
      }

      if (!fajl.pdfa_path && fajl.storage_path) {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("irat_files")
          .download(fajl.storage_path)

        if (downloadError || !fileData) {
          throw new Error("Nem sikerült letölteni a fájlt a Supabase Storage-ból: " + downloadError?.message)
        }

        const inputBuffer = Buffer.from(await fileData.arrayBuffer())
        const { convertToPdfA } = await import("@/utils/pdfa-converter")
        const { buffer: pdfaBuffer } = await convertToPdfA(inputBuffer)

        const ext = fajl.eredeti_fajlnev?.split(".").pop() || "pdf"
        const newStoragePath = fajl.storage_path.replace(new RegExp(`\\.${ext}$`, "i"), "_pdfa.pdf")

        const { error: uploadError } = await supabase.storage
          .from("irat_files")
          .upload(newStoragePath, pdfaBuffer, {
            contentType: "application/pdf",
            upsert: true,
          })

        if (uploadError) {
          throw new Error("Nem sikerült feltölteni az elkészült PDF/A állományt: " + uploadError.message)
        }

        await supabase
          .from("irat_fajl")
          .update({ pdfa_path: newStoragePath })
          .eq("id", fajl.id)
      }

      await supabase
        .from("ai_feladat_sor")
        .update({
          statusz: "kesz",
          utolso_hiba: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.task_id)

      return { success: true }
    }

    throw new Error(`Unknown task type: ${task.task_tipus}`)
  } catch (err: any) {
    const errorMsg = err?.message || String(err)
    console.error(`[AIWorker] Task ${task.task_id} failed:`, errorMsg)

    const isRateLimit =
      errorMsg.includes("429") ||
      errorMsg.includes("RESOURCE_EXHAUSTED") ||
      errorMsg.includes("quota") ||
      errorMsg.toLowerCase().includes("rate limit")

    // Determine backoff delay
    let backoffSeconds = 15
    if (isRateLimit) {
      backoffSeconds = Math.min(300, 30 * Math.pow(2, Math.max(0, task.task_probalkozasok - 1)))
      console.warn(`[AIWorker] Rate limit detected. Backing off for ${backoffSeconds} seconds.`)
    }

    const nextRun = new Date(Date.now() + backoffSeconds * 1000).toISOString()
    const isFatal = task.task_probalkozasok >= 4 && !isRateLimit

    await supabase
      .from("ai_feladat_sor")
      .update({
        statusz: isFatal ? "hibas" : "fuggoben",
        kovetkezo_futtatas: nextRun,
        utolso_hiba: errorMsg.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.task_id)

    return { success: false, error: errorMsg }
  }
}

/**
 * Executes a single batch pass of the worker queue.
 */
export async function runWorkerIteration(limit: number = 2): Promise<number> {
  const tasks = await claimTasks(limit)
  if (tasks.length === 0) return 0

  for (const task of tasks) {
    await processTask(task)
  }

  return tasks.length
}
