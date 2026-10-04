import { createClient } from "@/utils/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import nodemailer from "nodemailer"

// --- BREVO ÉRTESÍTÉSI INTERFÉSZEK ---
interface SendNotificationEmailParams {
  to: string
  subject: string
  html: string
  dossierId?: string
  senderName?: string
  senderEmail?: string
}

/**
 * Brevo alapú rendszerértesítő e-mailek küldése (pl. státuszváltozás, határidő, HR értesítés).
 */
export async function sendNotificationEmail({
  to,
  subject,
  html,
  dossierId,
  senderName,
  senderEmail,
}: SendNotificationEmailParams) {
  const apiKey = process.env.BREVO_API_KEY
  const supabase = await createClient()

  // Aktuális user lekérése a naplózáshoz
  const { data: { user } } = await supabase.auth.getUser()

  if (!apiKey) {
    console.error("Hiányzik a BREVO_API_KEY a környezeti változókból!")
    await logNotification(supabase, to, subject, html, "hibas", "Hiányzó API kulcs", dossierId, user?.id)
    return { success: false, error: "Hiányzó API kulcs" }
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: senderName || "eaisyDocs Rendszer",
          email: senderEmail || "ertesites@thinkai.hu",
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Brevo API hiba:", errorText)
      await logNotification(supabase, to, subject, html, "hibas", `Brevo hiba: ${errorText}`, dossierId, user?.id)
      return { success: false, error: errorText }
    }

    const data = await response.json()
    await logNotification(supabase, to, subject, html, "sikeres", null, dossierId, user?.id)
    return { success: true, messageId: data.messageId }
  } catch (error: unknown) {
    console.error("Kivétel az e-mail küldés során:", error)
    const errorMessage = error instanceof Error ? error.message : "Ismeretlen hiba"
    await logNotification(supabase, to, subject, html, "hibas", errorMessage, dossierId, user?.id)
    return { success: false, error: errorMessage }
  }
}

async function logNotification(
  supabaseClient: SupabaseClient | any,
  to: string,
  subject: string,
  html: string,
  status: "sikeres" | "hibas" | "folyamatban",
  errorReason: string | null = null,
  dossierId?: string,
  userId?: string
) {
  try {
    let adminSupabase = supabaseClient
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceRoleKey) {
      const { createClient } = await import("@supabase/supabase-js")
      adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    }

    const { error } = await adminSupabase.from("ertesites_naplo").insert({
      csatorna: "email",
      cimzett_email: to,
      targy: subject,
      uzenet: html,
      statusz: status,
      hiba_oka: errorReason,
      ugyirat_id: dossierId || null,
      kivato_user_id: userId || null,
    })

    if (error) {
      console.error("Adatbázis hiba az e-mail naplózása során:", error)
    }
  } catch (logError) {
    console.error("Kivétel az e-mail naplózása során:", logError)
  }
}

export function buildHtmlEmail(
  title: string,
  message: string,
  details?: { label: string; value: string }[],
  actionText?: string,
  actionUrl?: string
) {
  const detailsHtml =
    details && details.length > 0
      ? `
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
      ${details
        .map(
          (d) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eef2f6; color: #64748b; width: 35%; font-size: 14px;">${d.label}</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eef2f6; color: #0f172a; font-weight: 600; font-size: 14px;">${d.value}</td>
        </tr>
      `
        )
        .join("")}
    </table>
  `
      : ""

  const buttonHtml =
    actionText && actionUrl
      ? `
    <div style="margin-top: 32px; text-align: center;">
      <a href="${actionUrl}" style="background-color: #0eb39e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 15px;">${actionText}</a>
    </div>
  `
      : ""

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #334155;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background-color: #0eb39e; padding: 24px 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">eaisyDocs</h1>
        </div>
        <div style="padding: 40px 32px;">
          <h2 style="color: #0f172a; margin-top: 0; margin-bottom: 16px; font-size: 20px; font-weight: 600;">${title}</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px;">${message}</p>
          ${detailsHtml}
          ${buttonHtml}
        </div>
        <div style="background-color: #f1f5f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">Ezt az üzenetet az eaisyDocs rendszer automatikusan generálta.</p>
          <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">Kérjük, ne válaszolj erre az e-mailre!</p>
        </div>
      </div>
    </div>
  `
}

// --- KIMENŐ IRAT EXPEDÍCIÓ ÉS CSATOLT PDF KÜLDÉS ---

export interface EmailAttachment {
  filename: string
  content: Buffer
  contentType?: string
}

export interface SendExpeditionEmailParams {
  to: string
  subject: string
  text: string
  html?: string
  attachments?: EmailAttachment[]
  iratId?: string
  ugyiratId?: string
  userId?: string
  saveToPartnerId?: string
}

export interface PostalDispatchParams {
  iratId: string
  ugyiratId?: string
  userId?: string
  recipientName: string
  recipientAddress?: string
  trackingNumber?: string
  dispatchDate?: string
  note?: string
}

/**
 * Kimenő válaszlevél / dokumentum küldése SMTP-n keresztül csatolt PDF-fel.
 * Frissíti az irat kezbesites_* mezőit és rögzíti az audit eseményt.
 */
export async function sendEmailWithAttachment(params: SendExpeditionEmailParams): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const effectiveUserId = params.userId || authData?.user?.id

    const to = params.to?.trim()
    const subject = params.subject?.trim()
    const text = params.text?.trim()

    if (!to || !subject || !text) {
      return { success: false, error: "Hiányzó adatok (címzett, tárgy vagy üzenet szövege)!" }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return { success: false, error: `Érvénytelen címzett e-mail formátum: ${to}` }
    }

    const smtpHost = process.env.SMTP_HOST || (process.env.EMAIL_HOST ? process.env.EMAIL_HOST.replace("imap.", "smtp.") : "")
    if (!smtpHost || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return { success: false, error: "SMTP konfiguráció hiányzik a szerveren (.env.local)!" }
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.EMAIL_SMTP_PORT) || 465,
      secure: Number(process.env.EMAIL_SMTP_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    })

    let effectiveAttachments = params.attachments || []
    if (params.iratId && effectiveAttachments.length === 0) {
      try {
        const { data: fajlok } = await supabase
          .from("irat_fajl")
          .select("storage_path, pdfa_path, eredeti_fajlnev, mime_type, verzio")
          .eq("irat_id", params.iratId)
          .order("verzio", { ascending: false })

        const latestFile = fajlok?.[0]
        if (latestFile?.storage_path) {
          const pathToFetch = latestFile.pdfa_path || latestFile.storage_path
          const { data: fileBlob, error: dlError } = await supabase.storage
            .from("irat_files")
            .download(pathToFetch)

          if (fileBlob && !dlError) {
            const fileBuf = Buffer.from(await fileBlob.arrayBuffer())
            effectiveAttachments = [
              {
                filename: latestFile.eredeti_fajlnev || "valaszlevel.pdf",
                content: fileBuf,
                contentType: latestFile.mime_type || "application/pdf",
              },
            ]
          }
        }
      } catch (attachErr) {
        console.warn("Nem sikerült csatolni a meglévő irat fájlt:", attachErr)
      }
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html: params.html,
      attachments: effectiveAttachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType || "application/pdf",
      })),
    })

    const nowIso = new Date().toISOString()
    const attachedFileNames = effectiveAttachments.map((a) => a.filename).join(", ")

    if (params.iratId) {
      await supabase
        .from("irat")
        .update({
          kezbesites_statusz: "expedialva",
          kezbesites_modja: "email",
          kezbesites_datuma: nowIso,
          kezbesites_cimzett: to,
          kezbesites_azonosito: info.messageId,
          kezbesites_megjegyzes: `Sikeresen kiküldve e-mailben (${attachedFileNames ? "Csatolt fájl: " + attachedFileNames : "Csatolmány nélkül"}). Message-ID: ${info.messageId}`,
        })
        .eq("id", params.iratId)

      await supabase.from("esemeny_naplo").insert({
        entitas_tipus: "irat",
        entitas_id: params.iratId,
        user_id: effectiveUserId || null,
        esemeny_tipus: "tovabbitva",
        indoklas: `Kimenő irat expedíció e-mailben: Címzett: ${to}\nMessage-ID: ${info.messageId}\nCsatolt dokumentum: ${attachedFileNames || "nincs"}\n\nKísérőszöveg:\n${text}`,
      })
    }

    if (params.ugyiratId) {
      await supabase.from("esemeny_naplo").insert({
        entitas_tipus: "ugyirat",
        entitas_id: params.ugyiratId,
        user_id: effectiveUserId || null,
        esemeny_tipus: "modositva",
        indoklas: `Válaszlevél elküldve e-mailben a partnernek (${to}). ${attachedFileNames ? "Csatolt irat: " + attachedFileNames : ""}`,
      })
    }

    if (params.saveToPartnerId) {
      try {
        await supabase
          .from("partner")
          .update({ email: to })
          .eq("id", params.saveToPartnerId)
      } catch (pErr) {
        console.warn("Nem sikerült elmenteni az új központi e-mailt a partnerhez:", pErr)
      }
    }

    return {
      success: true,
      messageId: info.messageId,
    }
  } catch (err: any) {
    console.error("Hiba az e-mail kiküldésekor:", err)

    if (params.iratId) {
      try {
        const supabase = await createClient()
        await supabase
          .from("irat")
          .update({
            kezbesites_statusz: "expedialasra_var",
            kezbesites_megjegyzes: `Sikertelen kiküldési kísérlet (${new Date().toLocaleDateString("hu-HU")}): ${err.message || "Ismeretlen hiba"}`,
          })
          .eq("id", params.iratId)
      } catch {}
    }

    return {
      success: false,
      error: err.message || "Belső hiba az e-mail elküldése során.",
    }
  }
}

/**
 * Postai kézbesítés rögzítése az irathoz.
 */
export async function recordPostalDispatch(params: PostalDispatchParams): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    const effectiveUserId = params.userId || authData?.user?.id

    const dispatchDate = params.dispatchDate || new Date().toISOString()
    const cimzett = `${params.recipientName.trim()}${params.recipientAddress ? ` (${params.recipientAddress.trim()})` : ""}`

    const { error: updateError } = await supabase
      .from("irat")
      .update({
        kezbesites_statusz: "expedialva",
        kezbesites_modja: "posta",
        kezbesites_datuma: dispatchDate,
        kezbesites_cimzett: cimzett,
        kezbesites_azonosito: params.trackingNumber?.trim() || null,
        kezbesites_megjegyzes: params.note?.trim() || "Postai úton feladva",
      })
      .eq("id", params.iratId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    await supabase.from("esemeny_naplo").insert({
      entitas_tipus: "irat",
      entitas_id: params.iratId,
      user_id: effectiveUserId || null,
      esemeny_tipus: "tovabbitva",
      indoklas: `Postai feladás rögzítve: Címzett: ${cimzett}\nRagszám/Követési kód: ${params.trackingNumber || "Nincs"}\nDátum: ${dispatchDate}`,
    })

    if (params.ugyiratId) {
      await supabase.from("esemeny_naplo").insert({
        entitas_tipus: "ugyirat",
        entitas_id: params.ugyiratId,
        user_id: effectiveUserId || null,
        esemeny_tipus: "modositva",
        indoklas: `Kimenő irat postai feladása rögzítve (${cimzett}, ragszám: ${params.trackingNumber || "N/A"}).`,
      })
    }

    return { success: true }
  } catch (err: any) {
    console.error("Hiba a postai feladás rögzítésekor:", err)
    return { success: false, error: err.message || "Hiba a postai feladás rögzítésekor." }
  }
}
