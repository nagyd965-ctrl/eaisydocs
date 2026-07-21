import { config } from 'dotenv';
import { processIncomingEmails } from './src/utils/imap-service';

config({ path: '.env.local' });

async function run() {
  console.log("Starting IMAP test...");
  try {
    const result = await processIncomingEmails();
    console.log("Finished:", result);
  } catch (e) {
    console.error("Error during IMAP processing:", e);
  }
}

run();
