"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { formatAuditLogEvent } from "@/utils/audit-log-formatter"

export interface DocsAuditLogItem {
  id: string
  tortent: string
  esemeny_tipus: string
  entitas_tipus?: string
  entitas_id?: string
  user_id?: string | null
  felhasznalo_nev: string
  docs_szerepkor: string
  pozicio?: string | null
  ip_cim?: string | null
  user_agent?: string | null
  elozo_ertek?: any
  uj_ertek?: any
  indoklas?: string | null
  reszletek?: string | null
  company_id?: string | null
  formatted_title: string
  formatted_description: string
  formatted_icon: string
  formatted_color: string
}

export async function getDocsCentralAuditLogs(companyId?: string): Promise<{
  logs: DocsAuditLogItem[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { logs: [], error: "Nincs bejelentkezve." }

    // Jogosultság ellenőrzése
    const { data: profile } = await supabase
      .from("felhasznalo_profil")
      .select("docs_szerepkor, szerepkor")
      .eq("id", user.id)
      .single()

    const role = profile?.docs_szerepkor || profile?.szerepkor || ""
    const isAuthorized = ["admin", "rendszergazda", "auditor", "vezeto"].includes(role)
    if (!isAuthorized) {
      return { logs: [], error: "Nincs jogosultságod a központi eseménynapló megtekintéséhez." }
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let query = supabaseAdmin
      .from("esemeny_naplo")
      .select(`
        id,
        tortent,
        esemeny_tipus,
        entitas_tipus,
        entitas_id,
        user_id,
        ip_cim,
        user_agent,
        elozo_ertek,
        uj_ertek,
        indoklas,
        company_id
      `)
      .order("tortent", { ascending: false })
      .limit(500)

    if (companyId) {
      query = query.eq("company_id", companyId)
    }

    const { data: rawLogs, error: logError } = await query
    if (logError) {
      return { logs: [], error: logError.message }
    }

    if (!rawLogs || rawLogs.length === 0) {
      return { logs: [] }
    }

    // Felhasználói profilok lekérése a felhasználókhoz
    const userIds = [...new Set(rawLogs.map(l => l.user_id).filter(Boolean))] as string[]
    const userMap: Record<string, { nev: string; docs_szerepkor: string; pozicio?: string | null }> = {}

    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("felhasznalo_profil")
        .select("id, nev, docs_szerepkor, pozicio")
        .in("id", userIds)

      if (profiles) {
        profiles.forEach(p => {
          userMap[p.id] = {
            nev: p.nev || "Névtelen munkatárs",
            docs_szerepkor: p.docs_szerepkor || "ügyintéző",
            pozicio: p.pozicio || null
          }
        })
      }
    }

    const userNameMap: Record<string, string> = {}
    Object.entries(userMap).forEach(([uid, u]) => {
      userNameMap[uid] = u.nev
    })

    const formattedLogs: DocsAuditLogItem[] = rawLogs.map(raw => {
      const uInfo = raw.user_id ? userMap[raw.user_id] : null
      const formatted = formatAuditLogEvent(
        {
          id: raw.id,
          tortent: raw.tortent,
          esemeny_tipus: raw.esemeny_tipus,
          entitas_tipus: raw.entitas_tipus,
          entitas_id: raw.entitas_id,
          user_id: raw.user_id,
          ip_cim: raw.ip_cim,
          user_agent: raw.user_agent,
          elozo_ertek: raw.elozo_ertek,
          uj_ertek: raw.uj_ertek,
          indoklas: raw.indoklas,
        },
        { userMap: userNameMap }
      )

      return {
        ...raw,
        felhasznalo_nev: uInfo?.nev || "Rendszer / Automatizmus",
        docs_szerepkor: uInfo?.docs_szerepkor || "rendszer",
        pozicio: uInfo?.pozicio || null,
        formatted_title: formatted.title,
        formatted_description: formatted.description,
        formatted_icon: formatted.icon,
        formatted_color: formatted.color
      }
    })

    return { logs: formattedLogs }
  } catch (err: any) {
    console.error("Hiba a getDocsCentralAuditLogs futtatásakor:", err)
    return { logs: [], error: err.message || "Váratlan hiba történt az eseménynapló lekérésekor." }
  }
}
