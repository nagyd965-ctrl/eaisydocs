"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server"
import { isUserAuthorizedForHrView } from "@/utils/hr/company-role-resolver"

export type ActionCategory = "read" | "create" | "update" | "delete" | "approval" | "system"

const HR_ENTITY_CONFIG_SERVER: Record<string, { label: string; category: string }> = {
  "hr_dolgozo_titkos_adat": { label: "Érzékeny Adatok (TAJ, Adó, Bér)", category: "Bizalmas adatok" },
  "hr_dolgozo_adatlap": { label: "Dolgozói Személyes Adatok", category: "Személyes adatok" },
  "hr_dokumentum": { label: "Hivatalos HR Irat", category: "Iratok & Szerződések" },
  "hr_munkaszerzodes": { label: "Munkaszerződés", category: "Iratok & Szerződések" },
  "hr_tanulmanyi_szerzodes": { label: "Tanulmányi Szerződés", category: "Iratok & Szerződések" },
  "hr_munkavedelmi_oktatas": { label: "Munkavédelmi Oktatás", category: "Munkavédelem & Egészségügy" },
  "hr_orvosi_vizsgalat": { label: "Orvosi Alkalmassági", category: "Munkavédelem & Egészségügy" },
  "hr_cafeteria_keret": { label: "Cafeteria Keret", category: "Cafeteria" },
  "hr_cafeteria_valasztas": { label: "Cafeteria Nyilatkozat", category: "Cafeteria" },
  "hr_tavollet": { label: "Távollét / Szabadság", category: "Munkaidő & Jelenlét" },
  "hr_jelenlet": { label: "Jelenléti Ív", category: "Munkaidő & Jelenlét" },
  "hr_jelenlet_korrekcio": { label: "Jelenléti Korrekció", category: "Munkaidő & Jelenlét" },
  "hr_muszak_beosztas": { label: "Műszakbeosztás", category: "Munkaidő & Jelenlét" },
  "hr_onboarding_feladat": { label: "Beléptetési Feladat (Onboarding)", category: "Beléptetés & Kiléptetés" },
  "hr_offboarding": { label: "Kiléptetési Ügy (Offboarding)", category: "Beléptetés & Kiléptetés" },
  "hr_berpapir": { label: "Havi Bérpapír", category: "Bérszámfejtés" },
  "hr_teljesitmeny": { label: "Teljesítményértékelés (KPI)", category: "Teljesítmény" },
  "hr_fegyelmi": { label: "Fegyelmi Határozat", category: "Fegyelmi ügyek" },
  "hr_ceges_dokumentum": { label: "Céges Szabályzat", category: "Szabályzatok" },
  "hr_toborzas": { label: "Toborzás & Jelöltek", category: "Toborzás" },
  "system": { label: "Rendszer", category: "Rendszer" }
}

const HR_EVENT_CONFIG_SERVER: Record<string, { label: string; category: ActionCategory }> = {
  "adat_megtekintes": { label: "Megtekintés", category: "read" },
  "megtekintes": { label: "Megtekintés", category: "read" },
  "irat_megtekintes": { label: "Megtekintés", category: "read" },
  "hr_megtekintve": { label: "Megtekintés", category: "read" },
  "lekerdezes": { label: "Adatlekérés", category: "read" },
  "irat_letoltes": { label: "Letöltés", category: "read" },
  "letrehozas": { label: "Létrehozás", category: "create" },
  "adat_letrehozas": { label: "Létrehozás", category: "create" },
  "irat_letrehozas": { label: "Iratkészítés", category: "create" },
  "munkatars_felvetel": { label: "Rögzítés", category: "create" },
  "kpi_hozzaadas": { label: "KPI rögzítés", category: "create" },
  "iktatva": { label: "Iktatás", category: "create" },
  "irat_alairas": { label: "Aláírás", category: "create" },
  "tavollet_igenyles": { label: "Szabadság kérelem", category: "create" },
  "modositas": { label: "Módosítás", category: "update" },
  "adat_modositas": { label: "Módosítás", category: "update" },
  "munkatars_modositas": { label: "Módosítás", category: "update" },
  "hr_modositva": { label: "Módosítás", category: "update" },
  "kpi_frissites": { label: "KPI módosítás", category: "update" },
  "jelenlet_korrekcio_keres": { label: "Korrekció kérés", category: "update" },
  "torles": { label: "Törlés", category: "delete" },
  "adat_torles": { label: "Törlés", category: "delete" },
  "irat_torles": { label: "Irat törlése", category: "delete" },
  "kpi_torles": { label: "KPI törlés", category: "delete" },
  "jovahagyas": { label: "Jóváhagyás", category: "approval" },
  "tavollet_jovahagyas": { label: "Jóváhagyás", category: "approval" },
  "elutasitas": { label: "Elutasítás", category: "approval" },
  "tavollet_elutasitas": { label: "Elutasítás", category: "approval" },
  "dokumentum_nyugtazas": { label: "Nyugtázás", category: "approval" },
  "rendszer_inditas": { label: "Rendszer", category: "system" },
  "system": { label: "Rendszer", category: "system" }
}

function classifyEventServer(type: string, entity?: string): { label: string; category: ActionCategory } {
  if (entity === "hr_dolgozo_titkos_adat" && ["irat_megtekintes", "adat_megtekintes", "megtekintes"].includes(type)) {
    return { label: "Adatfeloldás", category: "read" }
  }
  if (HR_EVENT_CONFIG_SERVER[type]) return HR_EVENT_CONFIG_SERVER[type]
  if (type.includes("torles")) return { label: "Törlés", category: "delete" }
  if (type.includes("megtekint") || type.includes("olvas") || type.includes("letolt")) {
    return { label: "Megtekintés", category: "read" }
  }
  if (type.includes("modosit") || type.includes("frissit") || type.includes("korrekcio")) {
    return { label: "Módosítás", category: "update" }
  }
  if (type.includes("letrehoz") || type.includes("iktat") || type.includes("alair") || type.includes("felvetel")) {
    return { label: "Létrehozás", category: "create" }
  }
  if (type.includes("jovahagy") || type.includes("nyugtaz")) {
    return { label: "Jóváhagyás", category: "approval" }
  }
  return { label: type.replace(/_/g, " "), category: "system" }
}

function classifyEntityServer(type: string): { label: string; category: string } {
  if (HR_ENTITY_CONFIG_SERVER[type]) return HR_ENTITY_CONFIG_SERVER[type]
  const clean = (type || "").replace(/^hr_/, "").replace(/_/g, " ")
  return {
    label: clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "Egyéb",
    category: "Egyéb"
  }
}

async function authorizeAuditRequest(requestedCompanyId?: string): Promise<{
  authorized: boolean
  companyId: string
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { authorized: false, companyId: "", error: "Nincs bejelentkezve." }
  }

  const effectiveCompanyId = requestedCompanyId || (await getActiveCompanyIdServer()) || ""
  if (!effectiveCompanyId) {
    return { authorized: false, companyId: "", error: "Nincs kiválasztott vállalat." }
  }

  const scopedRoles = await getActiveCompanyMemberRolesServer(effectiveCompanyId)
  if (!scopedRoles.isMember) {
    return { authorized: false, companyId: effectiveCompanyId, error: "Nincs hozzáférésed a kiválasztott vállalathoz." }
  }

  const isAuthorized = isUserAuthorizedForHrView(
    scopedRoles.hrRole,
    ["admin", "audit", "compliance", "hr_vezeto", "hr_munkatars"],
    scopedRoles.hrModules
  )

  if (!isAuthorized) {
    return { authorized: false, companyId: effectiveCompanyId, error: "Nincs jogosultságod a HR eseménynapló megtekintéséhez." }
  }

  return { authorized: true, companyId: effectiveCompanyId }
}

export interface GetHrEventAuditLogsParams {
  companyId?: string
  page?: number
  pageSize?: number
  search?: string
  selectedUsers?: string[]
  selectedActionTypes?: ActionCategory[]
  selectedEntityCategories?: string[]
  dateFrom?: string
  dateTo?: string
  exportAll?: boolean
}

export interface HrEventAuditLogsResponse {
  logs: any[]
  totalCount: number
  kpiStats: {
    total: number
    secretAccessCount: number
    modificationsCount: number
    uniqueUsersCount: number
  }
  availableUsers: { id: string; name: string }[]
  availableCategories: string[]
  error?: string
}

/**
 * Szerveroldali Eseménynapló (`hr_esemeny_naplo`) lekérdezés szigorú `company_id` izolációval és lapozással.
 */
export async function getHrEventAuditLogs(
  params: GetHrEventAuditLogsParams
): Promise<HrEventAuditLogsResponse> {
  const emptyResponse: HrEventAuditLogsResponse = {
    logs: [],
    totalCount: 0,
    kpiStats: { total: 0, secretAccessCount: 0, modificationsCount: 0, uniqueUsersCount: 0 },
    availableUsers: [],
    availableCategories: [],
  }

  try {
    const auth = await authorizeAuditRequest(params.companyId)
    if (!auth.authorized || !auth.companyId) {
      return { ...emptyResponse, error: auth.error }
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Szigorú company_id izoláció (.eq("company_id", auth.companyId))
    const { data: allCompanyLogs, error: fetchError } = await supabaseAdmin
      .from("hr_esemeny_naplo")
      .select(`
        *,
        felhasznalo_profil:felhasznalo_id ( nev, hr_szerepkor, pozicio )
      `)
      .eq("company_id", auth.companyId)
      .order("created_at", { ascending: false })

    if (fetchError) {
      console.error("Hiba a hr_esemeny_naplo lekérésekor:", fetchError)
      return { ...emptyResponse, error: fetchError.message }
    }

    const rawList = allCompanyLogs || []

    // Aktív munkakör feloldása a végrehajtó felhasználókhoz (hr_munkaviszony)
    const userIds = Array.from(new Set(rawList.map(l => l.felhasznalo_id).filter(Boolean))) as string[]
    const activeJobTitleByUser: Record<string, string> = {}
    const companyRoleByUser: Record<string, string> = {}

    if (userIds.length > 0) {
      const [{ data: activeJobs }, { data: members }] = await Promise.all([
        supabaseAdmin
          .from("hr_munkaviszony")
          .select("dolgozo_id, ervenyes_ig, hr_munkakor ( megnevezes )")
          .eq("company_id", auth.companyId)
          .in("dolgozo_id", userIds)
          .is("ervenyes_ig", null),
        supabaseAdmin
          .from("company_members")
          .select("user_id, hr_szerepkor")
          .eq("company_id", auth.companyId)
          .in("user_id", userIds)
      ])

      for (const j of activeJobs || []) {
        const mk = Array.isArray((j as any).hr_munkakor) ? (j as any).hr_munkakor[0] : (j as any).hr_munkakor
        if (mk?.megnevezes) {
          activeJobTitleByUser[j.dolgozo_id] = mk.megnevezes
        }
      }
      for (const m of members || []) {
        if (m.hr_szerepkor) {
          companyRoleByUser[m.user_id] = m.hr_szerepkor
        }
      }
    }

    const enrichedList = rawList.map(log => {
      const uid = log.felhasznalo_id
      const baseProfile = log.felhasznalo_profil
      return {
        ...log,
        felhasznalo_profil: baseProfile
          ? {
              ...baseProfile,
              pozicio: (uid && activeJobTitleByUser[uid]) || baseProfile.pozicio || null,
              hr_szerepkor: (uid && companyRoleByUser[uid]) || baseProfile.hr_szerepkor || "munkavallalo",
            }
          : null,
      }
    })

    // 1. Teljes cégre vonatkozó KPI statisztikák (500-as vágás nélkül)
    let secretAccessCount = 0
    let modificationsCount = 0
    const uniqueUsersSet = new Set<string>()
    const usersMap = new Map<string, string>()
    const categoriesSet = new Set<string>()

    for (const log of enrichedList) {
      if (log.entitas_tipus === "hr_dolgozo_titkos_adat") {
        secretAccessCount++
      }
      const evCat = classifyEventServer(log.esemeny_tipus, log.entitas_tipus).category
      if (evCat === "update" || evCat === "delete") {
        modificationsCount++
      }
      if (log.felhasznalo_id) {
        uniqueUsersSet.add(log.felhasznalo_id)
      }

      const uid = log.felhasznalo_id || "system"
      const uname = log.felhasznalo_profil?.nev || (uid === "system" ? "Rendszer" : "Ismeretlen")
      usersMap.set(uid, uname)

      const entCat = classifyEntityServer(log.entitas_tipus).category
      if (entCat) categoriesSet.add(entCat)
    }

    const kpiStats = {
      total: enrichedList.length,
      secretAccessCount,
      modificationsCount,
      uniqueUsersCount: uniqueUsersSet.size,
    }

    const availableUsers = Array.from(usersMap.entries()).map(([id, name]) => ({ id, name }))
    const availableCategories = Array.from(categoriesSet).sort()

    // 2. Szerveroldali szűrés
    const search = (params.search || "").toLowerCase().trim()
    const selectedUsers = params.selectedUsers || []
    const selectedActionTypes = params.selectedActionTypes || []
    const selectedEntityCategories = params.selectedEntityCategories || []
    const dateFrom = params.dateFrom || ""
    const dateTo = params.dateTo || ""

    const filteredLogs = enrichedList.filter(log => {
      if (search) {
        const note = (log.megjegyzes || "").toLowerCase()
        const userName = (log.felhasznalo_profil?.nev || "rendszer").toLowerCase()
        const entityLabel = classifyEntityServer(log.entitas_tipus).label.toLowerCase()
        const eventLabel = classifyEventServer(log.esemeny_tipus, log.entitas_tipus).label.toLowerCase()
        const matches =
          note.includes(search) ||
          userName.includes(search) ||
          entityLabel.includes(search) ||
          eventLabel.includes(search) ||
          (log.entitas_tipus || "").toLowerCase().includes(search) ||
          (log.esemeny_tipus || "").toLowerCase().includes(search)
        if (!matches) return false
      }

      if (selectedUsers.length > 0) {
        const userId = log.felhasznalo_id || "system"
        if (!selectedUsers.includes(userId)) return false
      }

      if (selectedActionTypes.length > 0) {
        const actionCat = classifyEventServer(log.esemeny_tipus, log.entitas_tipus).category
        if (!selectedActionTypes.includes(actionCat)) return false
      }

      if (selectedEntityCategories.length > 0) {
        const entityCat = classifyEntityServer(log.entitas_tipus).category
        if (!selectedEntityCategories.includes(entityCat)) return false
      }

      if (dateFrom) {
        const logDate = new Date(log.created_at).toISOString().slice(0, 10)
        if (logDate < dateFrom) return false
      }

      if (dateTo) {
        const logDate = new Date(log.created_at).toISOString().slice(0, 10)
        if (logDate > dateTo) return false
      }

      return true
    })

    const totalCount = filteredLogs.length

    if (params.exportAll) {
      return {
        logs: filteredLogs,
        totalCount,
        kpiStats,
        availableUsers,
        availableCategories,
      }
    }

    // 3. Szerveroldali lapozás (oldalszeletelés)
    const page = Math.max(1, params.page || 1)
    const pageSize = Math.max(1, params.pageSize || 25)
    const start = (page - 1) * pageSize
    const paginatedLogs = filteredLogs.slice(start, start + pageSize)

    return {
      logs: paginatedLogs,
      totalCount,
      kpiStats,
      availableUsers,
      availableCategories,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Váratlan hiba történt a HR eseménynapló lekérésekor."
    console.error("Hiba a getHrEventAuditLogs futtatásakor:", err)
    return { ...emptyResponse, error: errorMsg }
  }
}

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

export interface GetHrNotificationAuditLogsParams {
  companyId?: string
  page?: number
  pageSize?: number
  search?: string
  selectedChannels?: string[]
  selectedStatuses?: string[]
  selectedCategories?: string[]
  dateFrom?: string
  dateTo?: string
  exportAll?: boolean
}

export interface HrNotificationAuditLogsResponse {
  logs: HrNotificationAuditLogItem[]
  totalCount: number
  stats: {
    total: number
    successful: number
    failed: number
    uniqueRecipients: number
    successRate: number
  }
  error?: string
}

/**
 * Szerveroldali HR Kiküldési Napló (`ertesites_naplo`) lekérdezés szigorú `company_id` izolációval és lapozással.
 */
export async function getHrNotificationAuditLogs(
  companyIdOrParams?: string | GetHrNotificationAuditLogsParams
): Promise<HrNotificationAuditLogsResponse> {
  const emptyStats = { total: 0, successful: 0, failed: 0, uniqueRecipients: 0, successRate: 0 }
  const params: GetHrNotificationAuditLogsParams =
    typeof companyIdOrParams === "string"
      ? { companyId: companyIdOrParams, exportAll: true }
      : companyIdOrParams || {}

  try {
    const auth = await authorizeAuditRequest(params.companyId)
    if (!auth.authorized || !auth.companyId) {
      return { logs: [], totalCount: 0, stats: emptyStats, error: auth.error }
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Szigorú company_id izoláció (.eq("company_id", auth.companyId)), a company_id.is.null kiskapu eltávolítva!
    const { data: rawLogs, error: logError } = await supabaseAdmin
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
      .eq("company_id", auth.companyId)
      .order("mikor", { ascending: false })

    if (logError) {
      console.error("Hiba a HR ertesites_naplo lekérésekor:", logError)
      return { logs: [], totalCount: 0, stats: emptyStats, error: logError.message }
    }

    if (!rawLogs || rawLogs.length === 0) {
      return { logs: [], totalCount: 0, stats: emptyStats }
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

    const allFormattedLogs: HrNotificationAuditLogItem[] = rawLogs.map(raw => ({
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
    }))

    // 1. Teljes cégre vonatkozó KPI statisztikák
    const total = allFormattedLogs.length
    const successful = allFormattedLogs.filter(l => l.statusz === "sikeres").length
    const failed = allFormattedLogs.filter(l => l.statusz === "hibas").length
    const uniqueRecipients = new Set(allFormattedLogs.map(l => l.cimzett_email).filter(Boolean)).size
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 0

    const stats = { total, successful, failed, uniqueRecipients, successRate }

    // 2. Szerveroldali szűrés
    const search = (params.search || "").toLowerCase().trim()
    const selectedChannels = params.selectedChannels || []
    const selectedStatuses = params.selectedStatuses || []
    const selectedCategories = params.selectedCategories || []
    const dateFrom = params.dateFrom || ""
    const dateTo = params.dateTo || ""

    const filteredLogs = allFormattedLogs.filter(log => {
      if (search) {
        const matchEmail = (log.cimzett_email || "").toLowerCase().includes(search)
        const matchSubject = (log.targy || "").toLowerCase().includes(search)
        const matchError = (log.hiba_oka || "").toLowerCase().includes(search)
        const matchUser = (log.kivato_nev || "").toLowerCase().includes(search)
        const matchContent = (log.uzenet || "").toLowerCase().includes(search)
        if (!matchEmail && !matchSubject && !matchError && !matchUser && !matchContent) {
          return false
        }
      }

      if (selectedChannels.length > 0 && !selectedChannels.includes(log.csatorna)) {
        return false
      }

      if (selectedStatuses.length > 0 && !selectedStatuses.includes(log.statusz)) {
        return false
      }

      if (selectedCategories.length > 0 && !selectedCategories.includes(log.kategoria)) {
        return false
      }

      if (dateFrom) {
        const fromDate = new Date(dateFrom)
        fromDate.setHours(0, 0, 0, 0)
        const logDate = new Date(log.mikor)
        if (logDate < fromDate) return false
      }

      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        const logDate = new Date(log.mikor)
        if (logDate > toDate) return false
      }

      return true
    })

    const totalCount = filteredLogs.length

    if (params.exportAll) {
      return {
        logs: filteredLogs,
        totalCount,
        stats,
      }
    }

    // 3. Szerveroldali lapozás (oldalszeletelés)
    const page = Math.max(1, params.page || 1)
    const pageSize = Math.max(1, params.pageSize || 25)
    const start = (page - 1) * pageSize
    const paginatedLogs = filteredLogs.slice(start, start + pageSize)

    return {
      logs: paginatedLogs,
      totalCount,
      stats,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Váratlan hiba történt a HR kiküldési napló lekérésekor."
    console.error("Hiba a getHrNotificationAuditLogs futtatásakor:", err)
    return { logs: [], totalCount: 0, stats: emptyStats, error: errorMsg }
  }
}
