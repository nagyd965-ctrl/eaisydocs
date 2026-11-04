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

const TECHNICAL_IGNORED_KEYS = new Set([
  "embedding",
  "kereso_vektor",
  "updated_at",
  "user_email",
  "company_id",
])

/**
 * Eldönti, hogy egy "modositva" (indoklas nélküli) DB-trigger rekord kizárólag
 * technikai háttérmezőket (AI embedding vektor, FTS kereso_vektor, updated_at,
 * company_id backfill) érintett-e, érdemi üzleti adatváltozás nélkül.
 */
function isPureTechnicalNoopUpdate(raw: {
  esemeny_tipus?: string | null
  indoklas?: string | null
  elozo_ertek?: any
  uj_ertek?: any
}): boolean {
  if (raw.esemeny_tipus !== "modositva") return false
  if (raw.indoklas && raw.indoklas.trim().length > 0) return false
  if (!raw.elozo_ertek || !raw.uj_ertek) return false
  if (typeof raw.elozo_ertek !== "object" || typeof raw.uj_ertek !== "object") return false

  const allKeys = new Set([
    ...Object.keys(raw.elozo_ertek),
    ...Object.keys(raw.uj_ertek),
  ])

  for (const key of allKeys) {
    if (TECHNICAL_IGNORED_KEYS.has(key)) continue
    const oldVal = raw.elozo_ertek[key]
    const newVal = raw.uj_ertek[key]
    if (JSON.stringify(oldVal ?? null) !== JSON.stringify(newVal ?? null)) {
      return false
    }
  }

  return true
}

function sanitizeAndEnrichAuditPayload(
  payload: any,
  maps: {
    userMap: Record<string, { nev: string }>
    partnerMap: Record<string, string>
    dossierMap: Record<string, string>
    deptMap: Record<string, string>
  }
): Record<string, any> | null {
  if (!payload || typeof payload !== "object") return null
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (k === "embedding" || k === "kereso_vektor") continue
    if (k === "felelos_user_id" && typeof v === "string" && maps.userMap[v]) {
      out[k] = maps.userMap[v].nev
    } else if (k === "rogzito_user_id" && typeof v === "string" && maps.userMap[v]) {
      out[k] = maps.userMap[v].nev
    } else if ((k === "kuldo_partner_id" || k === "partner_id") && typeof v === "string" && maps.partnerMap[v]) {
      out[k] = maps.partnerMap[v]
    } else if (k === "ugyirat_id" && typeof v === "string" && maps.dossierMap[v]) {
      out[k] = maps.dossierMap[v]
    } else if (k === "szervezeti_egyseg_id" && typeof v === "string" && maps.deptMap[v]) {
      out[k] = maps.deptMap[v]
    } else {
      out[k] = v
    }
  }
  return out
}

export async function getDocsCentralAuditLogs(companyId?: string): Promise<{
  logs: DocsAuditLogItem[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { getActiveCompanyIdServer } = await import("@/utils/company-server")
    const effectiveCompanyId = companyId || (await getActiveCompanyIdServer())
    if (!effectiveCompanyId) {
      return { logs: [], error: "Nincs kiválasztott vállalat." }
    }

    const { requireDocsAuthServer } = await import("@/utils/docs-auth-guard")
    const auth = await requireDocsAuthServer(
      ["admin", "rendszergazda", "auditor", "vezeto"],
      effectiveCompanyId
    )
    if (!auth.authorized || !auth.user) {
      return { logs: [], error: auth.error || "Nincs jogosultságod a központi eseménynapló megtekintéséhez." }
    }
    const user = auth.user

    // ── A-091 port: cég-tagság ellenőrzése SZERVEROLDALON ──
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
      .not("entitas_tipus", "ilike", "hr_%")
      .limit(1500)

    const { data: fetchedLogs, error: logError } = await query
    if (logError) {
      return { logs: [], error: logError.message }
    }

    // Kiszűrjük a tisztán technikai (AI embedding vektor / FTS kereso_vektor / company_id backfill) sorokat
    const rawLogs = (fetchedLogs || []).filter(r => !isPureTechnicalNoopUpdate(r)).slice(0, 1000)

    if (rawLogs.length === 0) {
      return { logs: [] }
    }

    // Összegyűjtjük az összes hivatkozott UUID-t (felhasználók, partnerek, ügyiratok, szervezeti egységek)
    const userIdSet = new Set<string>()
    const userEmailSet = new Set<string>()
    const partnerIdSet = new Set<string>()
    const dossierIdSet = new Set<string>()
    const deptIdSet = new Set<string>()

    for (const r of rawLogs) {
      if (r.user_id) userIdSet.add(r.user_id)
      for (const obj of [r.elozo_ertek, r.uj_ertek]) {
        if (!obj || typeof obj !== "object") continue
        if (typeof obj.rogzito_user_id === "string") userIdSet.add(obj.rogzito_user_id)
        if (typeof obj.felelos_user_id === "string") userIdSet.add(obj.felelos_user_id)
        if (typeof obj.user_email === "string" && obj.user_email.includes("@")) {
          userEmailSet.add(obj.user_email.toLowerCase())
        }
        if (typeof obj.kuldo_partner_id === "string") partnerIdSet.add(obj.kuldo_partner_id)
        if (typeof obj.partner_id === "string") partnerIdSet.add(obj.partner_id)
        if (typeof obj.ugyirat_id === "string") dossierIdSet.add(obj.ugyirat_id)
        if (typeof obj.szervezeti_egyseg_id === "string") deptIdSet.add(obj.szervezeti_egyseg_id)
      }
    }

    const userIds = [...userIdSet]
    const userMap: Record<string, { nev: string; docs_szerepkor: string; pozicio?: string | null }> = {}
    const emailToUserMap: Record<string, { id: string; nev: string; docs_szerepkor: string; pozicio?: string | null }> = {}
    const partnerMap: Record<string, string> = {}
    const dossierMap: Record<string, string> = {}
    const deptMap: Record<string, string> = {}

    const [profilesRes, companyRolesRes, partnersRes, dossiersRes, deptsRes] = await Promise.all([
      supabaseAdmin
        .from("felhasznalo_profil")
        .select("id, nev, email, docs_szerepkor, pozicio, elerheto_modulok"),
      supabaseAdmin
        .from("company_members")
        .select("user_id, role, docs_szerepkor")
        .eq("company_id", effectiveCompanyId),
      partnerIdSet.size > 0
        ? supabaseAdmin.from("partner").select("id, nev").in("id", [...partnerIdSet])
        : Promise.resolve({ data: [] as any[] }),
      dossierIdSet.size > 0
        ? supabaseAdmin.from("ugyirat").select("id, iktatoszam, targy").in("id", [...dossierIdSet])
        : Promise.resolve({ data: [] as any[] }),
      deptIdSet.size > 0
        ? supabaseAdmin.from("szervezeti_egyseg").select("id, nev").in("id", [...deptIdSet])
        : Promise.resolve({ data: [] as any[] }),
    ])

    const memberRoleMap = new Map<string, string>()
    for (const cm of companyRolesRes.data || []) {
      if (cm.docs_szerepkor) {
        memberRoleMap.set(cm.user_id, cm.docs_szerepkor)
      } else if (cm.role === "owner" || cm.role === "admin") {
        memberRoleMap.set(cm.user_id, "admin")
      }
    }

    for (const p of profilesRes.data || []) {
      const hasDocsModule = Array.isArray((p as any).elerheto_modulok)
        ? (p as any).elerheto_modulok.includes("docs")
        : true
      const scopedRole = hasDocsModule
        ? memberRoleMap.get(p.id) || p.docs_szerepkor || "munkavallalo"
        : "külső / HR"
      const entry = {
        id: p.id,
        nev: p.nev || "Névtelen munkatárs",
        docs_szerepkor: scopedRole,
        pozicio: p.pozicio || null,
      }
      userMap[p.id] = entry
      if (p.email) {
        emailToUserMap[p.email.toLowerCase()] = entry
      }
    }

    for (const pt of partnersRes.data || []) {
      if (pt.id && pt.nev) partnerMap[pt.id] = pt.nev
    }
    for (const d of dossiersRes.data || []) {
      if (d.id) {
        dossierMap[d.id] = d.iktatoszam
          ? `${d.iktatoszam}${d.targy ? ` (${d.targy})` : ""}`
          : d.targy || d.id
      }
    }
    for (const dp of deptsRes.data || []) {
      if (dp.id && dp.nev) deptMap[dp.id] = dp.nev
    }

    const userNameMap: Record<string, string> = {}
    Object.entries(userMap).forEach(([uid, u]) => {
      userNameMap[uid] = u.nev
    })

    const formattedLogs: DocsAuditLogItem[] = rawLogs.map(raw => {
      const uj = raw.uj_ertek || {}
      const elozo = raw.elozo_ertek || {}

      // 1. Felhasználó feloldása (user_id -> user_email -> rogzito_user_id -> felelos_user_id -> csatorna)
      let resolvedUser: { id?: string; nev: string; docs_szerepkor: string; pozicio?: string | null } | null = null
      if (raw.user_id && userMap[raw.user_id]) {
        resolvedUser = { id: raw.user_id, ...userMap[raw.user_id] }
      } else if (typeof uj.user_email === "string" && emailToUserMap[uj.user_email.toLowerCase()]) {
        resolvedUser = emailToUserMap[uj.user_email.toLowerCase()]
      } else if (typeof uj.rogzito_user_id === "string" && userMap[uj.rogzito_user_id]) {
        resolvedUser = { id: uj.rogzito_user_id, ...userMap[uj.rogzito_user_id] }
      } else if (typeof uj.felelos_user_id === "string" && userMap[uj.felelos_user_id]) {
        resolvedUser = { id: uj.felelos_user_id, ...userMap[uj.felelos_user_id] }
      } else if (typeof elozo.felelos_user_id === "string" && userMap[elozo.felelos_user_id]) {
        resolvedUser = { id: elozo.felelos_user_id, ...userMap[elozo.felelos_user_id] }
      }

      if (!resolvedUser) {
        const forras = uj.kulso_forras || elozo.kulso_forras
        const mod = uj.erkezes_modja || elozo.erkezes_modja
        if (forras === "eaisybill" || mod === "eaisybill") {
          resolvedUser = { nev: "eaisyBill Szinkron", docs_szerepkor: "integráció" }
        } else if (forras === "email" || mod === "email") {
          resolvedUser = { nev: "E-mail Érkeztető", docs_szerepkor: "automatizmus" }
        } else if (forras === "szkenner" || mod === "szkenner") {
          resolvedUser = { nev: "Batch Szkenner", docs_szerepkor: "automatizmus" }
        } else {
          resolvedUser = { nev: "Automatikus Ügymenet", docs_szerepkor: "rendszer" }
        }
      }

      const formatted = formatAuditLogEvent(
        {
          id: raw.id,
          tortent: raw.tortent,
          esemeny_tipus: raw.esemeny_tipus,
          entitas_tipus: raw.entitas_tipus,
          entitas_id: raw.entitas_id,
          user_id: resolvedUser.id || raw.user_id,
          ip_cim: raw.ip_cim,
          user_agent: raw.user_agent,
          elozo_ertek: raw.elozo_ertek,
          uj_ertek: raw.uj_ertek,
          indoklas: raw.indoklas,
        },
        {
          userMap: userNameMap,
          partnerMap,
          dossierMap,
          deptMap,
        }
      )

      const cleanElozo = sanitizeAndEnrichAuditPayload(raw.elozo_ertek, {
        userMap,
        partnerMap,
        dossierMap,
        deptMap,
      })
      const cleanUj = sanitizeAndEnrichAuditPayload(raw.uj_ertek, {
        userMap,
        partnerMap,
        dossierMap,
        deptMap,
      })

      return {
        ...raw,
        user_id: resolvedUser.id || raw.user_id,
        elozo_ertek: cleanElozo,
        uj_ertek: cleanUj,
        felhasznalo_nev: resolvedUser.nev,
        docs_szerepkor: resolvedUser.docs_szerepkor,
        pozicio: resolvedUser.pozicio || null,
        formatted_title: formatted.title,
        formatted_description: formatted.description,
        formatted_icon: formatted.icon,
        formatted_color: formatted.color,
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
    const { getActiveCompanyIdServer } = await import("@/utils/company-server")
    const effectiveCompanyId = companyId || (await getActiveCompanyIdServer())
    if (!effectiveCompanyId) {
      return { logs: [], error: "Nincs kiválasztott vállalat." }
    }

    const { requireDocsAuthServer } = await import("@/utils/docs-auth-guard")
    const auth = await requireDocsAuthServer(
      ["admin", "rendszergazda", "auditor", "vezeto", "iktato"],
      effectiveCompanyId
    )
    if (!auth.authorized || !auth.user) {
      return { logs: [], error: auth.error || "Nincs jogosultságod a kiküldési napló megtekintéséhez." }
    }
    const user = auth.user

    // ── A-091 port: cég-tagság ellenőrzése SZERVEROLDALON ──
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
