import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { createClient } from '@supabase/supabase-js';
import { launchPdfBrowser } from './pdf-browser';
import crypto from 'crypto';
import { extractPdfText } from './pdf-extractor';

// Note: Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

let isImapProcessing = false;

export async function processIncomingEmails() {
  if (isImapProcessing) {
    console.log("[IMAP] A mail sync is already running, skipping overlapping invocation.");
    return { success: false, reason: "Already running" };
  }

  isImapProcessing = true;
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_IMAP_PORT || '993', 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!host || !user || !pass) {
    isImapProcessing = false;
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
        const recipientText = Array.isArray(parsed.to)
          ? parsed.to.map((t: any) => t.text || t.address).join(', ')
          : (parsed.to?.text || user);
        const date = parsed.date || new Date();
        const body = parsed.text || parsed.html || '';

        const currentYear = date.getFullYear();
        const { data: erkezId, error: erkezErr } = await supabase.rpc('generate_erkeztetoszam', { p_ev: currentYear });
        
        const erkeztetoszam = !erkezErr && erkezId 
          ? erkezId 
          : `E/ERR-${Date.now()}`;

        const { findOrCreatePartner } = await import("@/utils/partner-matcher");
        let partnerId = null;
        try {
          const partnerRes = await findOrCreatePartner(supabase, {
            nev: partnerNev,
            email: partnerEmail || null,
            tipus: "ceg"
          });
          partnerId = partnerRes.id;
        } catch (err) {
          console.warn("IMAP partner match error:", err);
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

        // --- EMAIL BODY PDF & PDF/A-2B GENERATION ---
        let browser: any = null;
        try {
          browser = await launchPdfBrowser();
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
                  <p><strong>Címzett:</strong> ${recipientText}</p>
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

          // Standard PDF és PDF/A-2b normalizálás
          const { convertToPdfA } = await import('@/utils/pdfa-converter');
          const { buffer: pdfaBuffer } = await convertToPdfA(Buffer.from(pdfBuffer));

          const safeErkezteto = erkeztetoszam.replace(/\//g, '_');
          const pdfFileName = `email_torzs_${safeErkezteto}.pdf`;
          const pdfFilePath = `${iratId}/${pdfFileName}`;
          const pdfaFileName = `email_torzs_${safeErkezteto}_pdfa.pdf`;
          const pdfaFilePath = `${iratId}/${pdfaFileName}`;

          const { error: pdfUploadError } = await supabase.storage
            .from('irat_files')
            .upload(pdfFilePath, pdfBuffer, { contentType: 'application/pdf' });

          let savedPdfaPath: string | null = null;
          if (!pdfUploadError) {
            const { error: pdfaUploadError } = await supabase.storage
              .from('irat_files')
              .upload(pdfaFilePath, pdfaBuffer, { contentType: 'application/pdf', upsert: true });

            if (!pdfaUploadError) {
              savedPdfaPath = pdfaFilePath;
            }

            const pdfSha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
            
            await supabase.from('irat_fajl').insert({
              irat_id: iratId,
              storage_path: pdfFilePath,
              pdfa_path: savedPdfaPath,
              eredeti_fajlnev: pdfFileName,
              meret_byte: pdfBuffer.length,
              mime_type: 'application/pdf',
              sha256: pdfSha256,
              ocr_szoveg: parsed.text || ''
            });
          } else {
            console.error("Failed to upload email body PDF:", pdfUploadError);
          }
        } catch (e) {
          console.error("Failed to generate PDF from email body:", e);
        } finally {
          if (browser) {
            try {
              await browser.close();
            } catch (bErr) {
              console.warn("Browser close error:", bErr);
            }
          }
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
              const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

              // PDF szöveg kinyerése OCR-hez
              let ocr_szoveg = null;
              if (attachment.contentType === 'application/pdf') {
                try {
                  ocr_szoveg = await extractPdfText(fileBuffer);
                } catch (e) {
                  console.warn("Nem sikerült kinyerni a szöveget a PDF-ből (IMAP):", e);
                }
              }

              // Add record to irat_fajl
              const { data: fajlData, error: fajlError } = await supabase.from('irat_fajl').insert({
                irat_id: iratId,
                storage_path: filePath,
                eredeti_fajlnev: fileName,
                meret_byte: fileBuffer.length,
                mime_type: attachment.contentType || 'application/octet-stream',
                sha256: sha256,
                ocr_szoveg: ocr_szoveg
              }).select('id').single();
              
              if (fajlError) {
                console.error(`Failed to insert irat_fajl record for ${fileName}:`, fajlError);
              } else if (fajlData && attachment.contentType === 'application/pdf') {
                // PDF/A normalizálás csatolmányra is
                try {
                  const { convertToPdfA } = await import('@/utils/pdfa-converter');
                  const { buffer: attPdfaBuffer } = await convertToPdfA(fileBuffer);
                  const attPdfaPath = filePath.replace(/\.pdf$/i, '_pdfa.pdf');
                  const { error: attPdfaUploadError } = await supabase.storage
                    .from('irat_files')
                    .upload(attPdfaPath, attPdfaBuffer, { contentType: 'application/pdf', upsert: true });

                  if (!attPdfaUploadError) {
                    await supabase.from('irat_fajl').update({ pdfa_path: attPdfaPath }).eq('id', fajlData.id);
                  }
                } catch (attPdfaErr) {
                  console.warn(`PDF/A conversion warning for attachment ${fileName}:`, attPdfaErr);
                }
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
          const notifications = adminUsers.map((u: any) => ({
            user_id: u.id,
            cim: `Új irat érkezett (${erkeztetoszam})`,
            szoveg: `Feladó: ${sender}\nTárgy: ${subject}`,
            link_url: `/inbox/view/${iratId}`,
          }));
          
          await supabase.from('alkalmazas_ertesites').insert(notifications);
        }

        // --- Felvétel az AI Háttér Feladatsorba (Embedding és Riasztások feldolgozása a Worker által) ---
        try {
          await supabase.from('ai_feladat_sor').upsert({
            irat_id: iratId,
            feladat_tipus: 'embedding',
            statusz: 'fuggoben',
            kovetkezo_futtatas: new Date().toISOString()
          }, { onConflict: 'irat_id,feladat_tipus' });
        } catch (bgErr) {
          console.warn("[IMAP] AI task queueing warning:", bgErr);
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
    try {
      await client.logout();
    } catch (lErr) {
      console.warn("IMAP logout error:", lErr);
    }
    isImapProcessing = false;
  }

  return { success: true, processedCount };
}
