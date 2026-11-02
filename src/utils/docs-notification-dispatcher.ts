import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import { sendNotificationEmail, buildHtmlEmail } from "@/utils/mailer"
import { getBaseUrl } from "@/utils/url"

export interface DispatchDocsNotificationParams {
  esemenyTipus:
    | "hatarido_kozeledik"
    | "hatarido_lejart"
    | "uj_szignalas"
    | "allapotvaltozas"
    | "megorzesi_ido_lejart"
    | "uj_irat_erkezett"
    | "uj_feladat_szignalva"
    | "megjegyzes_emlitve"
    | "explicit_hozzaferes"
    | "mentett_kereses_talalat"
  kinek?: string
  companyId?: string | null
  recipientUserIds: string[]
  inAppTitle: string
  inAppBody: string
  linkPath: string
  emailSubject?: string
  emailHeading?: string
  emailIntroHtml?: string
  emailDetails?: { label: string; value: string }[]
  emailCtaLabel?: string
  smsBody?: string
  dossierId?: string
  defaultChannels?: ("in_app" | "email" | "sms")[]
}

function normalizePhone(rawPhone: string): string {
  const trimmed = rawPhone.trim()
  if (trimmed.startsWith("06")) return "+36" + trimmed.substring(2)
  if (trimmed.startsWith("36")) return "+" + trimmed
  if (!trimmed.startsWith("+")) return "+36" + trimmed
  return trimmed
}

/**
 * Egységes eaisyDocs értesítés-kiküldő segéd, amely figyelembe veszi az `ertesitesi_szabaly`
 * táblában vállalatonként konfigurált `aktiv` kapcsolót és a `csatorna` (`in_app`, `email`, `sms`) tömböt.
 */
export async function dispatchDocsNotification(params: DispatchDocsNotificationParams): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return

  const uniqueUserIds = Array.from(new Set(params.recipientUserIds.filter(Boolean)))
  if (uniqueUserIds.length === 0) return

  const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Szabály lekérdezése az adott eseménytípusra és vállalatra
  let ruleQuery = supabaseAdmin
    .from("ertesitesi_szabaly")
    .select("aktiv, csatorna")
    .eq("esemeny_tipus", params.esemenyTipus)

  if (params.kinek) {
    ruleQuery = ruleQuery.eq("kinek", params.kinek)
  }
  if (params.companyId) {
    ruleQuery = ruleQuery.eq("company_id", params.companyId)
  }

  const { data: rule } = await ruleQuery.limit(1).maybeSingle()

  // Ha a szabály létezik és ki van kapcsolva, nem küldünk semmit
  if (rule && rule.aktiv === false) {
    return
  }

  const channels: string[] =
    rule?.csatorna && Array.isArray(rule.csatorna)
      ? rule.csatorna
      : params.defaultChannels || ["in_app"]

  if (channels.length === 0) return

  const fullUrl = params.linkPath.startsWith("http")
    ? params.linkPath
    : `${getBaseUrl()}${params.linkPath.startsWith("/") ? "" : "/"}${params.linkPath}`

  // 2. Rendszeren belüli (in_app / harang) értesítés
  if (channels.includes("in_app")) {
    try {
      const notifications = uniqueUserIds.map((uid) => ({
        user_id: uid,
        cim: params.inAppTitle,
        szoveg: params.inAppBody,
        link_url: params.linkPath,
        olvasott: false,
      }))
      await supabaseAdmin.from("alkalmazas_ertesites").insert(notifications)
    } catch (err) {
      console.warn(`[DocsNotification] in_app küldési hiba (${params.esemenyTipus}):`, err)
    }
  }

  // 3. E-mail értesítés
  if (channels.includes("email")) {
    for (const uid of uniqueUserIds) {
      try {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(uid)
        const userEmail = userData?.user?.email
        if (userEmail) {
          await sendNotificationEmail({
            to: userEmail,
            subject: params.emailSubject || params.inAppTitle,
            html: buildHtmlEmail(
              params.emailHeading || params.inAppTitle,
              params.emailIntroHtml || params.inAppBody,
              params.emailDetails || [],
              params.emailCtaLabel || "Megnyitás az eaisyDocs-ban",
              fullUrl
            ),
            dossierId: params.dossierId,
          })
        }
      } catch (err) {
        console.warn(`[DocsNotification] e-mail küldési hiba (${params.esemenyTipus}):`, err)
      }
    }
  }

  // 4. SMS értesítés
  if (channels.includes("sms")) {
    try {
      const { data: profiles } = await supabaseAdmin
        .from("felhasznalo_profil")
        .select("id, telefon")
        .in("id", uniqueUserIds)

      if (profiles && profiles.length > 0) {
        const { sendSmsNotification } = await import("@/utils/sms/twilio")
        for (const p of profiles) {
          if (p.telefon) {
            await sendSmsNotification({
              to: normalizePhone(p.telefon),
              body: params.smsBody || `eaisyDocs: ${params.inAppTitle} — ${params.inAppBody}`,
              subject: params.emailSubject || params.inAppTitle,
              dossierId: params.dossierId,
              modul: "docs",
              companyId: params.companyId || undefined,
            })
          }
        }
      }
    } catch (err) {
      console.warn(`[DocsNotification] SMS küldési hiba (${params.esemenyTipus}):`, err)
    }
  }
}
