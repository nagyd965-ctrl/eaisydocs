"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export interface HrNotificationAuditLogItem {
  id: string
  mikor: string
  csatorna: "email" | "sms"
  cimzett_email: string
  targy: string
  uzenet: string
  statusz: "sikeres" | "hibas" | "folyamatban"
  hiba_oka: string | null
  kivato_user_id: string | null
  kivato_nev?: string | null
  kategoria: "recruitment" | "leave" | "health" | "contract" | "system"
  company_id?: string | null
}

export async function getHrNotificationAuditLogs(companyId?: string): Promise<{
  logs: HrNotificationAuditLogItem[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { logs: [], error: "Nincs bejelentkezve." }

    const { data: profile } = await supabase
      .from("felhasznalo_profil")
      .select("hr_szerepkor, szerepkor, docs_szerepkor")
      .eq("id", user.id)
      .single()

    const role = profile?.hr_szerepkor || profile?.szerepkor || profile?.docs_szerepkor || ""
    const isAuthorized = ["admin", "rendszergazda", "hr_vezeto", "hr_munkatars", "vezeto"].includes(role)
    if (!isAuthorized) {
      return { logs: [], error: "Nincs jogosultságod a HR kiküldési napló megtekintéséhez." }
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let query = supabaseAdmin
      .from("ertesites_naplo")
      .select(`
        id,
        mikor,
        csatorna,
        cimzett_email,
        targy,
        uzenet,
        statusz,
        hiba_oka,
        ugyirat_id,
        kivato_user_id,
        modul,
        company_id
      `)
      .eq("modul", "hr")
      .order("mikor", { ascending: false })
      .limit(500)

    if (companyId) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`)
    }

    const { data: rawLogs, error: logError } = await query

    if (logError) {
      console.error("Hiba a HR ertesites_naplo lekérésekor:", logError)
      return { logs: [], error: logError.message }
    }

    if (!rawLogs || rawLogs.length === 0) {
      return { logs: [] }
    }

    // Felhasználói nevek feloldása kiváltó user_id alapján
    const userIds = [...new Set(rawLogs.map(l => l.kivato_user_id).filter(Boolean))] as string[]
    const userMap: Record<string, string> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("felhasznalo_profil")
        .select("id, nev")
        .in("id", userIds)

      if (profiles) {
        profiles.forEach(p => {
          userMap[p.id] = p.nev || "Névtelen munkatárs"
        })
      }
    }

    const detectHrCategory = (subject: string): "recruitment" | "leave" | "health" | "contract" | "system" => {
      const s = (subject || "").toLowerCase()
      if (
        s.includes("interjú") ||
        s.includes("interju") ||
        s.includes("jelentkezés") ||
        s.includes("jelentkezes") ||
        s.includes("toborzás") ||
        s.includes("karrier") ||
        s.includes("flottakezelő") ||
        s.includes("állás") ||
        s.includes("allas")
      ) {
        return "recruitment"
      }
      if (
        s.includes("szabadság") ||
        s.includes("szabadsag") ||
        s.includes("távollét") ||
        s.includes("tavollet") ||
        s.includes("jelenlét") ||
        s.includes("jelenlet") ||
        s.includes("túlóra") ||
        s.includes("tulora")
      ) {
        return "leave"
      }
      if (
        s.includes("orvosi") ||
        s.includes("alkalmasság") ||
        s.includes("alkalmassag") ||
        s.includes("munkavédelem") ||
        s.includes("munkavedelm") ||
        s.includes("tűzvédelem") ||
        s.includes("tuzvedelm")
      ) {
        return "health"
      }
      if (
        s.includes("szerződés") ||
        s.includes("szerzodes") ||
        s.includes("próbaidő") ||
        s.includes("probaido") ||
        s.includes("tanulmányi") ||
        s.includes("tanulmanyi") ||
        s.includes("t1041") ||
        s.includes("bérpapír") ||
        s.includes("berpapir") ||
        s.includes("cafeteria") ||
        s.includes("onboarding") ||
        s.includes("belép") ||
        s.includes("belep") ||
        s.includes("kilép") ||
        s.includes("kilep") ||
        s.includes("kpi")
      ) {
        return "contract"
      }
      return "system"
    }

    const formattedLogs: HrNotificationAuditLogItem[] = rawLogs
      .filter(raw => {
        if (!companyId) return true
        if (raw.company_id && raw.company_id !== companyId) {
          return false
        }
        return true
      })
      .map(raw => {
        return {
          id: raw.id,
          mikor: raw.mikor,
          csatorna: raw.csatorna as "email" | "sms",
          cimzett_email: raw.cimzett_email,
          targy: raw.targy,
          uzenet: raw.uzenet,
          statusz: raw.statusz as "sikeres" | "hibas" | "folyamatban",
          hiba_oka: raw.hiba_oka,
          kivato_user_id: raw.kivato_user_id,
          kivato_nev: raw.kivato_user_id ? (userMap[raw.kivato_user_id] || "Rendszer") : "Rendszer / Automatizmus",
          kategoria: detectHrCategory(raw.targy),
          company_id: raw.company_id,
        }
      })

    return { logs: formattedLogs }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Váratlan hiba történt a HR kiküldési napló lekérésekor."
    console.error("Hiba a getHrNotificationAuditLogs futtatásakor:", err)
    return { logs: [], error: errorMsg }
  }
}
