import { config } from 'dotenv';
import { ImapFlow } from 'imapflow';

config({ path: '.env.local' });

async function run() {
  const client = new ImapFlow({
    host: process.env.EMAIL_HOST!,
    port: parseInt(process.env.EMAIL_IMAP_PORT || '993', 10),
    secure: true,
    auth: { user: process.env.EMAIL_USER!, pass: process.env.EMAIL_PASSWORD! },
    logger: false // Enable logging to see what IMAP commands are sent
  });

  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    const messages = client.fetch({ seen: false }, { uid: true });
    for await (const message of messages) {
      console.log("Setting Seen for UID", message.uid);
      await client.messageFlagsAdd(message.uid.toString(), ['\\Seen'], { uid: true });
    }
  } finally {
    lock.release();
    await client.logout();
  }
}

run().catch(console.error);
