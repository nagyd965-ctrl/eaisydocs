import fs from "fs"
import path from "path"
import os from "os"

const watcherDir = path.join(os.tmpdir(), "eaisydocs-ai-watcher")
const triggerFile = path.join(watcherDir, "last-analyzed-errors.json")
const stateFile = path.join(watcherDir, "state.json")

try {
  fs.mkdirSync(watcherDir, { recursive: true })
} catch {
  // ignore
}

function getAnalyzedAt(): string | null {
  try {
    if (!fs.existsSync(triggerFile)) return null
    const raw = fs.readFileSync(triggerFile, "utf-8")
    const parsed = JSON.parse(raw)
    return parsed?.analyzed_at || null
  } catch {
    return null
  }
}

function isEnabled(): boolean {
  try {
    if (!fs.existsSync(stateFile)) return false
    const raw = fs.readFileSync(stateFile, "utf-8")
    const parsed = JSON.parse(raw)
    return Boolean(parsed?.enabled)
  } catch {
    return false
  }
}

const initialAnalyzedAt = getAnalyzedAt()

// 0% CPU-s natív OS fájlrendszer-esemény figyelő (nincs setInterval / polling!)
const watcher = fs.watch(watcherDir, (_eventType, filename) => {
  if (filename && filename !== "last-analyzed-errors.json") return
  setTimeout(() => {
    try {
      if (!isEnabled()) return
      const currentAnalyzedAt = getAnalyzedAt()
      if (currentAnalyzedAt && currentAnalyzedAt !== initialAnalyzedAt) {
        watcher.close()
        const raw = fs.readFileSync(triggerFile, "utf-8")
        console.log("\n=== [MGMT_AI_ANALYSIS_TRIGGERED] ===")
        console.log(raw)
        console.log("=== [/MGMT_AI_ANALYSIS_TRIGGERED] ===\n")
        process.exit(0)
      }
    } catch {
      // ignore transient write state
    }
  }, 80)
})
