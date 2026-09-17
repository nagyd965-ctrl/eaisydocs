import * as fs from "fs/promises"
import * as path from "path"
import { createClient } from "@supabase/supabase-js"
import { splitBatchPdf, ingestSplitDocuments } from "./batch-scanner"

export function getHotfolderBasePath(): string {
  return process.env.SCANNER_HOTFOLDER_PATH || path.resolve(process.cwd(), "scanner_hotfolder")
}

export interface HotfolderProcessReport {
  scannedFilesFound: number
  processedFiles: number
  failedFiles: number
  totalDocumentsCreated: number
  details: {
    fileName: string
    status: "success" | "failed" | "skipped"
    documentsCreated?: number
    separatorPages?: number[]
    error?: string
  }[]
}

/**
 * Ensures input, processed, and failed directories exist in the hot folder.
 */
export async function ensureHotfolderDirs(): Promise<{
  inputDir: string
  processedDir: string
  failedDir: string
}> {
  const base = getHotfolderBasePath()
  const inputDir = path.join(base, "input")
  const processedDir = path.join(base, "processed")
  const failedDir = path.join(base, "failed")

  await fs.mkdir(inputDir, { recursive: true })
  await fs.mkdir(processedDir, { recursive: true })
  await fs.mkdir(failedDir, { recursive: true })

  return { inputDir, processedDir, failedDir }
}

/**
 * Scans the hot folder input directory, splits multi-page scanned batches
 * at separator sheets, ingests the individual documents, and moves files to processed/failed.
 */
export async function processHotfolderFiles(
  customClient?: any
): Promise<HotfolderProcessReport> {
  const { inputDir, processedDir, failedDir } = await ensureHotfolderDirs()

  const supabase =
    customClient ||
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

  const entries = await fs.readdir(inputDir, { withFileTypes: true })
  const pdfFiles = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".pdf"))

  const report: HotfolderProcessReport = {
    scannedFilesFound: pdfFiles.length,
    processedFiles: 0,
    failedFiles: 0,
    totalDocumentsCreated: 0,
    details: [],
  }

  for (const file of pdfFiles) {
    const filePath = path.join(inputDir, file.name)

    try {
      // 1. Read file buffer
      const fileBuffer = await fs.readFile(filePath)
      if (fileBuffer.length === 0) {
        report.details.push({
          fileName: file.name,
          status: "skipped",
          error: "A fájl üres vagy még írás alatt áll a szkenner által.",
        })
        continue
      }

      // 2. Perform Batch Split (detects & removes separator sheets)
      const splitResult = await splitBatchPdf(fileBuffer)

      if (splitResult.documents.length === 0) {
        throw new Error("A kötet nem tartalmaz feldolgozható tartalmi oldalt.")
      }

      // 3. Ingest each split document into eaisyDocs incoming queue
      const baseName = path.parse(file.name).name
      const ingested = await ingestSplitDocuments(
        splitResult.documents,
        {
          targyPrefix: `Szkenner: ${baseName}`,
          minosites: "nyilt",
        },
        supabase
      )

      report.processedFiles++
      report.totalDocumentsCreated += ingested.length

      // 4. Move to processed directory with timestamp
      const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)
      const targetProcessedPath = path.join(processedDir, `${timestamp}_${file.name}`)
      await fs.rename(filePath, targetProcessedPath)

      report.details.push({
        fileName: file.name,
        status: "success",
        documentsCreated: ingested.length,
        separatorPages: splitResult.separatorPagesFound,
      })
    } catch (err: any) {
      console.error(`[ScannerHotfolder] Error processing ${file.name}:`, err)
      report.failedFiles++

      const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)
      const targetFailedPath = path.join(failedDir, `${timestamp}_${file.name}`)
      try {
        await fs.rename(filePath, targetFailedPath)
        await fs.writeFile(
          path.join(failedDir, `${timestamp}_${file.name}.error.txt`),
          err.message || String(err)
        )
      } catch (moveErr) {
        console.error("[ScannerHotfolder] Error moving failed file:", moveErr)
      }

      report.details.push({
        fileName: file.name,
        status: "failed",
        error: err.message || String(err),
      })
    }
  }

  return report
}
