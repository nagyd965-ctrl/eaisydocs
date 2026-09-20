import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
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
        probalkozasok_szama: 0,
        utolso_hiba: null,
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
      // Find all files belonging to this irat that still need PDF/A conversion
      const { data: allIratFiles, error: fetchErr } = await supabase
        .from("irat_fajl")
        .select("id, storage_path, pdfa_path, eredeti_fajlnev, kulso_fajl_url")
        .eq("irat_id", task.task_irat_id)

      if (fetchErr) {
        throw new Error("Hiba a fájlok lekérdezésekor a PDF/A konverzióhoz: " + fetchErr.message)
      }

      if (!allIratFiles || allIratFiles.length === 0) {
        throw new Error("Fájl rekord nem található a PDF/A konverzióhoz")
      }

      // Filter files to those that either match task_fajl_id or have no pdfa_path yet
      const filesToConvert = allIratFiles.filter((f) => !f.pdfa_path)
      if (task.task_fajl_id) {
        const specificFile = allIratFiles.find((f) => f.id === task.task_fajl_id)
        if (specificFile && !specificFile.pdfa_path && !filesToConvert.some((f) => f.id === specificFile.id)) {
          filesToConvert.push(specificFile)
        }
      }

      const { convertToPdfA } = await import("@/utils/pdfa-converter")

      for (const fajl of filesToConvert) {
        let inputBuffer: Buffer

        if (fajl.kulso_fajl_url) {
          const resp = await fetch(fajl.kulso_fajl_url)
          if (!resp.ok) {
            throw new Error(`Nem sikerült letölteni a külső fájlt (${resp.status} ${resp.statusText}): ${fajl.kulso_fajl_url}`)
          }
          inputBuffer = Buffer.from(await resp.arrayBuffer())
        } else if (fajl.storage_path) {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from("irat_files")
            .download(fajl.storage_path)

          if (downloadError || !fileData) {
            throw new Error("Nem sikerült letölteni a fájlt a Supabase Storage-ból: " + downloadError?.message)
          }

          inputBuffer = Buffer.from(await fileData.arrayBuffer())
        } else {
          continue
        }

        const { buffer: pdfaBuffer } = await convertToPdfA(inputBuffer)

        let newStoragePath: string
        if (fajl.storage_path && !fajl.storage_path.startsWith("eaisybill:")) {
          const dotIndex = fajl.storage_path.lastIndexOf(".")
          if (dotIndex !== -1) {
            newStoragePath = fajl.storage_path.slice(0, dotIndex) + "_pdfa.pdf"
          } else {
            newStoragePath = `${fajl.storage_path}_pdfa.pdf`
          }
        } else {
          newStoragePath = `${crypto.randomUUID()}_pdfa.pdf`
        }

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
