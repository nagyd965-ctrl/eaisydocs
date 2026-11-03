import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"
import { sendNotificationEmail, buildHtmlEmail } from "@/utils/mailer"
import { sendSmsNotification } from "@/utils/sms/twilio"
import { getBaseUrl } from "@/utils/url"

export interface DispatchHrNotificationParams {
  esemenyTipus: string
  companyId?: string | null
  recipientUserIds: string[]
  title: string
  message: string
  linkPath?: string
  emailDetails?: { label: string; value: string }[]
  emailCtaText?: string
  smsBody?: string
}

/**
 * Központi eaisyHR értesítés-kiküldő:
 * Lekérdezi az `ertesitesi_szabaly` táblából az adott eseményhez és vállalathoz tartozó szabályt.
 * Ha a szabály inaktív (`aktiv === false`), nem küld értesítést.
 * Ha aktív, a `csatorna` tömbben engedélyezett csatornákon (`in_app`, `email`, `sms`) kézbesíti.
 * SMS küldésnél a `felhasznalo_profil.telefon` mellett a `hr_dolgozo_adatlap.telefonszam` mezőt is ellenőrzi.
 */
export async function dispatchHrNotification({
  esemenyTipus,
  companyId,
  recipientUserIds,
  title,
  message,
  linkPath = "/hr",
  emailDetails = [],
  emailCtaText = "Megnyitás az eaisyHR-ben",
  smsBody,
}: DispatchHrNotificationParams): Promise<void> {
  const uniqueUserIds = Array.from(new Set(recipientUserIds.filter(Boolean)))
  if (uniqueUserIds.length === 0) return

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return

  const supabaseAdmin = createSupabaseAdmin(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let resolvedCompanyId = companyId || null
  if (!resolvedCompanyId) {
    try {
      const { getActiveCompanyIdServer } = await import("@/utils/company-server")
      resolvedCompanyId = await getActiveCompanyIdServer()
    } catch {
      // Háttérfolyamat esetén előfordulhat, hogy nincs request cookie kontextus
    }
  }

  // Szabály lekérdezése
  let rule: { aktiv: boolean; csatorna: string[] | null } | null = null

  if (resolvedCompanyId) {
    const { data } = await supabaseAdmin
      .from("ertesitesi_szabaly")
      .select("aktiv, csatorna")
      .eq("esemeny_tipus", esemenyTipus)
      .eq("company_id", resolvedCompanyId)
      .limit(1)
      .maybeSingle()
    if (data) rule = data
  }

  if (!rule) {
    const { data } = await supabaseAdmin
      .from("ertesitesi_szabaly")
      .select("aktiv, csatorna")
      .eq("esemeny_tipus", esemenyTipus)
      .limit(1)
      .maybeSingle()
    if (data) rule = data
  }

  // Ha létezik a szabály és ki van kapcsolva, nem küldünk semmit
  if (rule && !rule.aktiv) {
    return
  }

  // Ha még nincs szabály a DB-ben, alapértelmezetten in_app + email csatornán küldünk
  const channels: string[] = rule
    ? Array.isArray(rule.csatorna)
      ? rule.csatorna
      : []
    : ["in_app", "email"]

  if (channels.length === 0) return

  const fullUrl = linkPath.startsWith("http")
    ? linkPath
    : `${getBaseUrl()}${linkPath.startsWith("/") ? "" : "/"}${linkPath}`

  // 1. Rendszeren belüli (in_app) értesítés
  if (channels.includes("in_app")) {
    const notifications = uniqueUserIds.map((uid) => ({
      user_id: uid,
      company_id: resolvedCompanyId || null,
      modul: "hr",
      cim: title,
      szoveg: message,
      link_url: linkPath,
      olvasott: false,
    }))
    await supabaseAdmin.from("alkalmazas_ertesites").insert(notifications)
  }

  // 2. E-mail értesítés
  if (channels.includes("email")) {
    for (const uid of uniqueUserIds) {
      try {
        let recipientEmail: string | undefined
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(uid)
        recipientEmail = authUser?.user?.email

        if (!recipientEmail) {
          const { data: adatlap } = await supabaseAdmin
            .from("hr_dolgozo_adatlap")
            .select("email")
            .eq("id", uid)
            .maybeSingle()
          recipientEmail = adatlap?.email || undefined
        }

        if (recipientEmail) {
          await sendNotificationEmail({
            to: recipientEmail,
            subject: `eaisyHR - ${title}`,
            senderName: "eaisyHR Rendszer",
            senderEmail: "eaisyhr@thinkai.hu",
            html: buildHtmlEmail(
              title,
              message,
              emailDetails,
              emailCtaText,
              fullUrl,
              "eaisyHR"
            ),
            modul: "hr",
            companyId: resolvedCompanyId || undefined,
          })
        }
      } catch (err) {
        console.error(`HR E-mail értesítési hiba (${esemenyTipus}):`, err)
      }
    }
  }

  // 3. SMS értesítés (felhasznalo_profil.telefon VAGY hr_dolgozo_adatlap.telefonszam)
  if (channels.includes("sms")) {
    for (const uid of uniqueUserIds) {
      try {
        const { data: prof } = await supabaseAdmin
          .from("felhasznalo_profil")
          .select("telefon")
          .eq("id", uid)
          .maybeSingle()

        let phone = prof?.telefon || null
        if (!phone) {
          const { data: adatlap } = await supabaseAdmin
            .from("hr_dolgozo_adatlap")
            .select("telefonszam")
            .eq("id", uid)
            .maybeSingle()
          phone = adatlap?.telefonszam || null
        }

        if (phone) {
          await sendSmsNotification({
            to: phone,
            body: smsBody || `eaisyHR: ${title} - ${message}`,
            subject: title,
            modul: "hr",
            companyId: resolvedCompanyId || undefined,
          })
        }
      } catch (err) {
        console.error(`HR SMS értesítési hiba (${esemenyTipus}):`, err)
      }
    }
  }
}
