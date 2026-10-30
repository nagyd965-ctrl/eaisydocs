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

    // ── A-091 port: cég-tagság ellenőrzése SZERVEROLDALON ──
    // A kliens által küldött companyId önmagában nem elfogadható: ellenőrizzük,
    // hogy a hívó ténylegesen tagja-e a kért cégnek (aktív cég fallbackkal).
    const { getActiveCompanyIdServer } = await import("@/utils/company-server")
    const effectiveCompanyId = companyId || (await getActiveCompanyIdServer())
    if (!effectiveCompanyId) {
      return { logs: [], error: "Nincs kiválasztott vállalat." }
    }

    const { data: membership } = await supabase
      .from("company_members")
      .select("user_id")
      .eq("company_id", effectiveCompanyId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (!membership) {
      return { logs: [], error: "Nincs hozzáférésed a kért vállalat naplójához." }
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const query = supabaseAdmin
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
      .eq("company_id", effectiveCompanyId)
      // Tudatos limit: a legfrissebb 1000 esemény (explicit, a DB-API implicit 1000 helyett)
      .limit(1000)

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

export interface NotificationAuditLogItem {
  id: string
  mikor: string
  csatorna: "email" | "sms"
  cimzett_email: string
  targy: string
  uzenet: string | null
  statusz: "sikeres" | "hibas" | "folyamatban"
  hiba_oka: string | null
  ugyirat_id: string | null
  ugyirat_szam?: string | null
  ugyirat_targy?: string | null
  kivato_user_id: string | null
  kivato_nev?: string | null
  kategoria: "docs" | "hr" | "system"
}

export async function getNotificationAuditLogs(companyId?: string): Promise<{
  logs: NotificationAuditLogItem[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { logs: [], error: "Nincs bejelentkezve." }

    const { data: profile } = await supabase
      .from("felhasznalo_profil")
      .select("docs_szerepkor, szerepkor")
      .eq("id", user.id)
      .single()

    const role = profile?.docs_szerepkor || profile?.szerepkor || ""
    const isAuthorized = ["admin", "rendszergazda", "auditor", "vezeto", "iktato"].includes(role)
    if (!isAuthorized) {
      return { logs: [], error: "Nincs jogosultságod a kiküldési napló megtekintéséhez." }
    }

    // ── A-091 port: cég-tagság ellenőrzése SZERVEROLDALON ──
    const { getActiveCompanyIdServer } = await import("@/utils/company-server")
    const effectiveCompanyId = companyId || (await getActiveCompanyIdServer())
    if (!effectiveCompanyId) {
      return { logs: [], error: "Nincs kiválasztott vállalat." }
    }

    const { data: membership } = await supabase
      .from("company_members")
      .select("user_id")
      .eq("company_id", effectiveCompanyId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (!membership) {
      return { logs: [], error: "Nincs hozzáférésed a kért vállalat naplójához." }
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const query = supabaseAdmin
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
        company_id,
        ugyirat:ugyirat_id(id, iktatoszam, company_id)
      `)
      .eq("modul", "docs")
      .order("mikor", { ascending: false })
      .eq("company_id", effectiveCompanyId)
      .limit(1000)

    const { data: rawLogs, error: logError } = await query

    if (logError) {
      return { logs: [], error: logError.message }
    }

    if (!rawLogs || rawLogs.length === 0) {
      return { logs: [] }
    }

    // Felhasználói profilok lekérése kiváltó user_id alapján
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

    const detectCategory = (subject: string): "docs" | "hr" | "system" => {
      const s = (subject || "").toLowerCase()
      if (
        s.includes("hr") ||
        s.includes("orvosi") ||
        s.includes("t1041") ||
        s.includes("szabadság") ||
        s.includes("szabadsag") ||
        s.includes("próbaidő") ||
        s.includes("probaido") ||
        s.includes("tanulmányi") ||
        s.includes("kpi") ||
        s.includes("interjú") ||
        s.includes("interju") ||
        s.includes("jelentkezés") ||
        s.includes("jelentkezes") ||
        s.includes("flottakezelő") ||
        s.includes("flottakezelo") ||
        s.includes("dolgozó") ||
        s.includes("munkavállaló")
      ) {
        return "hr"
      }
      if (
        s.includes("ügyirat") ||
        s.includes("ugyirat") ||
        s.includes("szignálva") ||
        s.includes("szignalva") ||
        s.includes("iktat") ||
        s.includes("selejtez") ||
        s.includes("határidő") ||
        s.includes("hatarido") ||
        s.includes("eszkaláció") ||
        s.includes("eszkalacio")
      ) {
        return "docs"
      }
      return "system"
    }

    type UgyiratJoin = { id?: string; iktatoszam?: string; company_id?: string } | null

    const formattedLogs: NotificationAuditLogItem[] = rawLogs
      .filter(raw => {
        if (!companyId) return true
        if (raw.company_id && raw.company_id !== companyId) {
          return false
        }
        const ugyiratCompId = (raw.ugyirat as unknown as UgyiratJoin)?.company_id
        if (ugyiratCompId && ugyiratCompId !== companyId) {
          return false
        }
        return true
      })
      .map(raw => {
        const u = raw.ugyirat as unknown as UgyiratJoin
        return {
          id: raw.id,
          mikor: raw.mikor,
          csatorna: raw.csatorna as "email" | "sms",
          cimzett_email: raw.cimzett_email,
          targy: raw.targy,
          uzenet: raw.uzenet,
          statusz: raw.statusz as "sikeres" | "hibas" | "folyamatban",
          hiba_oka: raw.hiba_oka,
          ugyirat_id: raw.ugyirat_id,
          ugyirat_szam: u?.iktatoszam || null,
          ugyirat_targy: null,
          kivato_user_id: raw.kivato_user_id,
          kivato_nev: raw.kivato_user_id ? (userMap[raw.kivato_user_id] || "Rendszer") : "Rendszer / Automatizmus",
          kategoria: detectCategory(raw.targy)
        }
      })

    return { logs: formattedLogs }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Váratlan hiba történt a kiküldési napló lekérésekor."
    console.error("Hiba a getNotificationAuditLogs futtatásakor:", err)
    return { logs: [], error: errorMsg }
  }
}

