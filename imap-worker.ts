import { config } from 'dotenv';
import { processIncomingEmails } from './src/utils/imap-service';

// Load environment variables
config({ path: '.env.local' });

const POLL_INTERVAL_MS = 60 * 1000; // 1 perc

async function runWorker() {
  console.log(`[IMAP Worker] Elindítva. Keresés ${POLL_INTERVAL_MS / 1000} másodpercenként...`);
  
  // Futtassuk le azonnal indításkor is
  await checkEmails();

  setInterval(async () => {
    await checkEmails();
  }, POLL_INTERVAL_MS);
}

async function checkEmails() {
  try {
    const result = await processIncomingEmails();
    if (result.success && (result.processedCount || 0) > 0) {
      console.log(`[IMAP Worker] ${result.processedCount} új levél sikeresen érkeztetve!`);
    } else if (!result.success) {
      console.log(`[IMAP Worker] Szinkronizáció kihagyva: ${result.reason || 'ismeretlen ok'}`);
    }
  } catch (error) {
    console.error("[IMAP Worker] Hiba történt az IMAP feldolgozás során:", error);
  }
}

runWorker();
