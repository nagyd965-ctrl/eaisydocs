import { config } from "dotenv"
import { runWorkerIteration } from "./src/utils/ai-worker-service"

// Load environment variables
config({ path: ".env.local" })

const POLL_INTERVAL_MS = 3000 // Check queue every 3 seconds
let isRunning = false

async function runWorker() {
  console.log(`[AI Worker] Elindítva. Sor figyelése ${POLL_INTERVAL_MS / 1000} másodpercenként...`)

  // Initial check
  await checkQueue()

  setInterval(async () => {
    await checkQueue()
  }, POLL_INTERVAL_MS)
}

async function checkQueue() {
  if (isRunning) return
  isRunning = true

  try {
    const processed = await runWorkerIteration(2)
    if (processed > 0) {
      console.log(`[AI Worker] ${processed} feladat sikeresen feldolgozva a sorból.`)
    }
  } catch (error) {
    console.error("[AI Worker] Hiba a feldolgozás során:", error)
  } finally {
    isRunning = false
  }
}

runWorker()
