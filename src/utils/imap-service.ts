import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { createClient } from '@supabase/supabase-js';

// Note: Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function processIncomingEmails() {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_IMAP_PORT || '993', 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!host || !user || !pass) {
    console.warn("IMAP configuration is missing. Skipping incoming email processing.");
    return { success: false, reason: "Missing config" };
  }

  const client = new ImapFlow({
    host,
    port,
    secure: port === 993,
    auth: { user, pass },
    logger: false // Set to true for debugging
  });

  let processedCount = 0;

  try {
    // Connect to the IMAP server
    await client.connect();
    
    // Select the INBOX
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Fetch all UNSEEN emails
      const messages = client.fetch({ seen: false }, { source: true, uid: true });
      
      for await (const message of messages) {
        if (!message.source) continue;
        
        // Parse the email source
        const parsed = await simpleParser(message.source);
        const subject = parsed.subject || 'Nincs tárgy';
        const sender = parsed.from?.value[0]?.address || 'Ismeretlen feladó';
        const date = parsed.date || new Date();
        const body = parsed.text || parsed.html || '';

        console.log(`Processing email from ${sender}: ${subject}`);

        // Insert into the 'irat' table
        const { data: iratData, error: iratError } = await supabase
          .from('irat')
          .insert({
            irany: 'bejovo',
            erkezes_modja: 'email',
            erkezes_datuma: date.toISOString(),
            targy: subject,
            leiras: body.substring(0, 5000), // Limit description length
            minosites: 'nyilt' // Default clearance
          })
          .select('id')
          .single();

        if (iratError) {
          console.error("Failed to insert irat:", iratError);
          continue;
        }

        const iratId = iratData.id;

        // Process attachments
        if (parsed.attachments && parsed.attachments.length > 0) {
          for (const attachment of parsed.attachments) {
            const fileName = attachment.filename || 'ismeretlen_fajl.dat';
            const fileBuffer = attachment.content;
            
            // Upload to Supabase Storage
            const filePath = `${iratId}/${fileName}`;
            const { error: uploadError } = await supabase.storage
              .from('iratok')
              .upload(filePath, fileBuffer, {
                contentType: attachment.contentType
              });

            if (!uploadError) {
              // Add record to irat_fajl
              await supabase.from('irat_fajl').insert({
                irat_id: iratId,
                fajl_eleres: filePath,
                eredeti_fajlnev: fileName,
                fajl_meret_byte: fileBuffer.length,
                mime_tipus: attachment.contentType
              });
            } else {
              console.error(`Failed to upload attachment ${fileName}:`, uploadError);
            }
          }
        }

        // Mark the email as SEEN so it is not processed again
        await client.messageFlagsAdd({ uid: message.uid }, ['\\Seen']);
        processedCount++;
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error("IMAP processing error:", err);
    return { success: false, error: err };
  } finally {
    await client.logout();
  }

  return { success: true, processedCount };
}
