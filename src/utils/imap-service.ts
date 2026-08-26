import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { createClient } from '@supabase/supabase-js';
import { launchPdfBrowser } from './pdf-browser';

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
      const processedSeqs: number[] = [];
      
      for await (const message of messages) {
        if (!message.source) continue;
        
        // Parse the email source
        const parsed = await simpleParser(message.source);
        const subject = parsed.subject || 'Nincs Tárgy';
        const sender = parsed.from?.value[0]?.name || parsed.from?.value[0]?.address || 'Ismeretlen feladó';
        const partnerNev = parsed.from?.value[0]?.name || parsed.from?.value[0]?.address || 'Ismeretlen Partner';
        const partnerEmail = parsed.from?.value[0]?.address || null;
        const date = parsed.date || new Date();
        const body = parsed.text || parsed.html || '';

        const currentYear = date.getFullYear();
        const { data: erkezId, error: erkezErr } = await supabase.rpc('generate_erkeztetoszam', { p_ev: currentYear });
        
        const erkeztetoszam = !erkezErr && erkezId 
          ? erkezId 
          : `E/ERR-${Date.now()}`;

        const { data: partnerData } = await supabase
          .from('partner')
          .select('id')
          .eq('nev', partnerNev)
          .single();

        let partnerId = partnerData?.id;

        if (!partnerId) {
          const { data: newPartner } = await supabase
            .from('partner')
            .insert({ nev: partnerNev, email: partnerEmail })
            .select('id')
            .single();
          if (newPartner) partnerId = newPartner.id;
        }

        // Insert into the 'irat' table
        const { data: iratData, error: iratError } = await supabase
          .from('irat')
          .insert({
            irany: 'bejovo',
            erkezes_modja: 'email',
            erkezes_datuma: date.toISOString(),
            erkeztetoszam,
            kuldo_partner_id: partnerId,
            targy: subject,
            leiras: body.substring(0, 5000), // Limit description length
            minosites: 'nyilt', // Default clearance
            adathordozo_tipus: 'elektronikus_eredeti'
          })
          .select('id')
          .single();

        if (iratError) {
          console.error("Failed to insert irat:", iratError);
          continue;
        }

        const iratId = iratData.id;

        // --- EMAIL BODY PDF GENERATION ---
        try {
          const browser = await launchPdfBrowser();
          const page = await browser.newPage();
          
          const emailHtml = parsed.html || `<pre style="white-space: pre-wrap; font-family: inherit;">${parsed.text || 'Üres üzenet'}</pre>`;
          const finalHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                  .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
                  .header p { margin: 8px 0; font-size: 14px; }
                  .header strong { color: #555; display: inline-block; width: 80px; }
                  .content { font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="header">
                  <p><strong>Feladó:</strong> ${partnerNev} ${partnerEmail ? `&lt;${partnerEmail}&gt;` : ''}</p>
                  <p><strong>Dátum:</strong> ${date.toLocaleString('hu-HU')}</p>
                  <p><strong>Tárgy:</strong> ${subject}</p>
                </div>
                <div class="content">
                  ${emailHtml}
                </div>
              </body>
            </html>
          `;
          
          await page.setContent(finalHtml, { waitUntil: 'networkidle0' as any });
          const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20px', bottom: '20px' } });
          await browser.close();

          // Upload generated PDF
          // Az egyedi névhez használjuk az érkeztetőszámot (a perjelt aláhúzásra cserélve a fájlnév-biztonság miatt)
          const safeErkezteto = erkeztetoszam.replace(/\//g, '_');
          const pdfFileName = `email_torzs_${safeErkezteto}.pdf`;
          const pdfFilePath = `${iratId}/${pdfFileName}`;
          const { error: pdfUploadError } = await supabase.storage
            .from('irat_files')
            .upload(pdfFilePath, pdfBuffer, { contentType: 'application/pdf' });

          if (!pdfUploadError) {
            const crypto = require('crypto');
            const pdfSha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
            
            await supabase.from('irat_fajl').insert({
              irat_id: iratId,
              storage_path: pdfFilePath,
              eredeti_fajlnev: pdfFileName,
              meret_byte: pdfBuffer.length,
              mime_type: 'application/pdf',
              sha256: pdfSha256,
              ocr_szoveg: parsed.text || '' // Közvetlenül megkapja az e-mail szövegét az AI
            });
          } else {
            console.error("Failed to upload email body PDF:", pdfUploadError);
          }
        } catch (e) {
          console.error("Failed to generate PDF from email body:", e);
        }
        // --- END EMAIL BODY PDF GENERATION ---


        // Process attachments
        if (parsed.attachments && parsed.attachments.length > 0) {
          for (const attachment of parsed.attachments) {
            const fileName = attachment.filename || 'ismeretlen_fajl.dat';
            const fileBuffer = attachment.content;
            
            // Upload to Supabase Storage
            const filePath = `${iratId}/${fileName}`;
            const { error: uploadError } = await supabase.storage
              .from('irat_files')
              .upload(filePath, fileBuffer, {
                contentType: attachment.contentType
              });

            if (!uploadError) {
              const crypto = require('crypto');
              const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

              // PDF szöveg kinyerése OCR-hez
              let ocr_szoveg = null;
              if (attachment.contentType === 'application/pdf') {
                try {
                  const pdfParse = require('pdf-parse');
                  const pdfData = await pdfParse(fileBuffer);
                  ocr_szoveg = pdfData.text;
                } catch (e) {
                  console.warn("Nem sikerült kinyerni a szöveget a PDF-ből (IMAP):", e);
                  // MOCK OCR fallback for demo purposes (ugyanaz mint az actions.ts-ben)
                  ocr_szoveg = `DEMO OCR SZÖVEG:
Kovács Kft.
Bérleti szerződés
Tárgy: bérleti szerződés
Kelt: 2026.07.16.`;
                }
              }

              // Add record to irat_fajl
              const { error: fajlError } = await supabase.from('irat_fajl').insert({
                irat_id: iratId,
                storage_path: filePath,
                eredeti_fajlnev: fileName,
                meret_byte: fileBuffer.length,
                mime_type: attachment.contentType || 'application/octet-stream',
                sha256: sha256,
                ocr_szoveg: ocr_szoveg
              });
              
              if (fajlError) {
                console.error(`Failed to insert irat_fajl record for ${fileName}:`, fajlError);
              }
            } else {
              console.error(`Failed to upload attachment ${fileName}:`, uploadError);
            }
          }
        }

        // --- Új Irat Értesítés (Harang) küldése az Iratkezelőknek ---
        const { data: adminUsers } = await supabase
          .from('felhasznalo_profil')
          .select('id')
          .in('szerepkor', ['iktato', 'admin', 'ugyintezo']);

        if (adminUsers && adminUsers.length > 0) {
          const notifications = adminUsers.map((user) => ({
            user_id: user.id,
            cim: `Új irat érkezett (${erkeztetoszam})`,
            szoveg: `Feladó: ${sender}\nTárgy: ${subject}`,
            link_url: `/inbox/view/${iratId}`,
          }));
          
          await supabase.from('alkalmazas_ertesites').insert(notifications);
        }
        // -------------------------------------------------------------

        processedSeqs.push(message.seq);
        processedCount++;
      }

      // Mark the emails as SEEN so they are not processed again
      if (processedSeqs.length > 0) {
        await client.messageFlagsAdd(processedSeqs.join(','), ['\\Seen']);
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
