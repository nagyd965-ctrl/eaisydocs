"use server"

import { createClient } from "@/utils/supabase/server"
import { generateEmbedding } from "@/utils/embedding-service"
import { getActiveCompanyIdServer } from "@/utils/company-server"

function sanitizeSearchSnippet(raw: string | null | undefined): string | null {
  if (!raw) return null
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/&lt;b&gt;/gi, "<b>")
    .replace(/&lt;\/b&gt;/gi, "</b>")
}

export async function searchDocuments(query: string, filters: any = {}) {
  const supabase = await createClient()
  const activeCompanyId = await getActiveCompanyIdServer()
  const cleanQuery = query?.trim() || ""

  try {
    // 1. Generate semantic query embedding if a query is present
    let queryEmbedding: number[] | null = null
    if (cleanQuery) {
      queryEmbedding = await generateEmbedding(cleanQuery)
    }

    // 2. Call the hybrid search RPC function (runs with SECURITY INVOKER for RLS compliance)
    const { data: rpcData, error: rpcError } = await supabase.rpc("search_iratok_hybrid", {
      p_query: cleanQuery || null,
      p_embedding: queryEmbedding ? `[${queryEmbedding.join(",")}]` : null,
      p_minosites: filters.minosites && filters.minosites !== "all" ? filters.minosites : null,
      p_irany: filters.irany && filters.irany !== "all" ? filters.irany : null,
      p_iktatoszam: filters.iktatoszam || null,
      p_erkeztetoszam: filters.erkeztetoszam || null,
      p_date_from: filters.dateFrom || null,
      p_date_to: filters.dateTo || null,
      p_partner: filters.partner || null,
      p_match_count: 50,
      p_similarity_threshold: 0.65,
      p_company_id: activeCompanyId || null,
    })

    if (rpcError) {
      console.warn("[SearchActions] search_iratok_hybrid RPC warning/fallback:", rpcError)
      return await fallbackSearch(supabase, cleanQuery, filters, activeCompanyId)
    }

    let filteredRpcData = rpcData || []
    if (activeCompanyId && filteredRpcData.length > 0) {
      const candidateIds = filteredRpcData.map((d: any) => d.id)
      const { data: companyDocs } = await supabase
        .from("irat")
        .select("id")
        .in("id", candidateIds)
        .eq("company_id", activeCompanyId)
      const allowedIdSet = new Set((companyDocs || []).map((row: any) => row.id))
      filteredRpcData = filteredRpcData.filter((d: any) => allowedIdSet.has(d.id))
    }

    // 3. Format results into structured UI data
    const formatted = filteredRpcData.map((d: any) => ({
      id: d.id,
      targy: d.targy,
      leiras: d.leiras,
      erkeztetoszam: d.erkeztetoszam,
      irany: d.irany,
      minosites: d.minosites,
      erkezes_datuma: d.erkezes_datuma,
      ugyirat_id: d.ugyirat_id,
      ugyirat: d.ugyirat_id
        ? {
            id: d.ugyirat_id,
            iktatoszam: d.iktatoszam,
            ugy: d.ugy_id
              ? {
                  id: d.ugy_id,
                  targy: d.ugy_targy,
                  felelos_user_id: d.felelos_user_id,
                }
              : null,
          }
        : null,
      partner: d.partner_id ? { id: d.partner_id, nev: d.partner_nev } : null,
      fts_score: d.fts_score,
      vector_similarity: d.vector_similarity,
      combined_score: d.combined_score,
      match_type: d.match_type,
      snippet: sanitizeSearchSnippet(d.snippet),
    }))

    return { data: formatted, error: null }
  } catch (err: any) {
    console.error("[SearchActions] Error executing hybrid search:", err)
    return await fallbackSearch(supabase, cleanQuery, filters, activeCompanyId)
  }
}

async function fallbackSearch(
  supabase: any,
  query: string,
  filters: any,
  activeCompanyId?: string | null
) {
  const baseSelect = `
    id, 
    targy, 
    leiras, 
    erkeztetoszam, 
    irany, 
    minosites, 
    erkezes_datuma,
    ugyirat_id,
    ugyirat(
      id,
      iktatoszam, 
      statusz,
      ugy(id, targy, felelos_user_id)
    ),
    partner:kuldo_partner_id(id, nev)
  `

  let dbQuery = supabase.from("irat").select(baseSelect)

  if (activeCompanyId) {
    dbQuery = dbQuery.eq("company_id", activeCompanyId)
  }

  if (query) {
    dbQuery = dbQuery.or(`targy.ilike.%${query}%,leiras.ilike.%${query}%,erkeztetoszam.ilike.%${query}%`)
  }

  if (filters.minosites && filters.minosites !== "all") {
    dbQuery = dbQuery.eq("minosites", filters.minosites)
  }
  if (filters.irany && filters.irany !== "all") {
    dbQuery = dbQuery.eq("irany", filters.irany)
  }
  if (filters.iktatoszam) {
    dbQuery = dbQuery.ilike("ugyirat.iktatoszam", `%${filters.iktatoszam}%`)
  }
  if (filters.erkeztetoszam) {
    dbQuery = dbQuery.ilike("erkeztetoszam", `%${filters.erkeztetoszam}%`)
  }
  if (filters.dateFrom) {
    dbQuery = dbQuery.gte("erkezes_datuma", filters.dateFrom)
  }
  if (filters.dateTo) {
    dbQuery = dbQuery.lte("erkezes_datuma", filters.dateTo)
  }
  if (filters.partner) {
    dbQuery = dbQuery.ilike("partner.nev", `%${filters.partner}%`)
  }

  const { data, error } = await dbQuery.order("erkezes_datuma", { ascending: false }).limit(50)
  return { data: data || [], error: error?.message || null }
}

export async function saveSearch(
  name: string,
  query: string,
  filters: any,
  ertesites_bekapcsolva = false
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const activeCompanyId = await getActiveCompanyIdServer()

  const { error } = await supabase.from("mentett_kereses").insert({
    user_id: user.id,
    nev: name,
    kereso_parameterek: { query, filters },
    ertesites_bekapcsolva: Boolean(ertesites_bekapcsolva),
    utolso_ertesites_datuma: new Date().toISOString(),
    ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function toggleSavedSearchAlert(id: string, enabled: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const activeCompanyId = await getActiveCompanyIdServer()

  let updateQuery = supabase
    .from("mentett_kereses")
    .update({ ertesites_bekapcsolva: enabled })
    .eq("id", id)
    .eq("user_id", user.id)

  if (activeCompanyId) {
    updateQuery = updateQuery.eq("company_id", activeCompanyId)
  }

  const { error } = await updateQuery

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getSavedSearches() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const activeCompanyId = await getActiveCompanyIdServer()

  let query = supabase
    .from("mentett_kereses")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (activeCompanyId) {
    query = query.eq("company_id", activeCompanyId)
  }

  const { data } = await query

  return data || []
}

export async function deleteSavedSearch(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const activeCompanyId = await getActiveCompanyIdServer()

  let deleteQuery = supabase
    .from("mentett_kereses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (activeCompanyId) {
    deleteQuery = deleteQuery.eq("company_id", activeCompanyId)
  }

  const { error } = await deleteQuery
  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * Fast autocomplete and header quick search.
 * Scoped to the active company (`activeCompanyId`).
 */
export async function quickSearch(query: string) {
  const supabase = await createClient()
  const clean = query?.trim()
  if (!clean || clean.length < 2) return { dossiers: [], documents: [], partners: [] }

  const activeCompanyId = await getActiveCompanyIdServer()

  try {
    let dossiersQuery = supabase
      .from("ugyirat")
      .select("id, iktatoszam, statusz, ugy:ugy_id(targy)")
      .or(`iktatoszam.ilike.%${clean}%`)
    if (activeCompanyId) {
      dossiersQuery = dossiersQuery.eq("company_id", activeCompanyId)
    }

    let partnersQuery = supabase
      .from("partner")
      .select("id, nev, tipus, email, adoszam, kulfoldi_adoszam")
      .or(`nev.ilike.%${clean}%,email.ilike.%${clean}%,adoszam.ilike.%${clean}%,kulfoldi_adoszam.ilike.%${clean}%`)
    if (activeCompanyId) {
      partnersQuery = partnersQuery.eq("company_id", activeCompanyId)
    }

    const [dossiersRes, docsRes, partnersRes] = await Promise.all([
      // 1. Ügyiratok
      dossiersQuery.limit(5),

      // 2. Iratok — first check title / registry number or FTS vector match
      (async () => {
        let titleQuery = supabase
          .from("irat")
          .select("id, targy, erkeztetoszam, ugyirat_id, ugyirat(iktatoszam), partner:kuldo_partner_id(nev)")
          .or(`targy.ilike.%${clean}%,erkeztetoszam.ilike.%${clean}%`)
        if (activeCompanyId) {
          titleQuery = titleQuery.eq("company_id", activeCompanyId)
        }
        const { data: titleData } = await titleQuery.limit(5)

        if (titleData && titleData.length > 0) {
          return { data: titleData }
        }

        let ftsQuery = supabase
          .from("irat")
          .select("id, targy, erkeztetoszam, ugyirat_id, ugyirat(iktatoszam), partner:kuldo_partner_id(nev)")
          .textSearch("kereso_vektor", clean, { type: "plain", config: "simple" })
        if (activeCompanyId) {
          ftsQuery = ftsQuery.eq("company_id", activeCompanyId)
        }
        const { data: ftsData } = await ftsQuery.limit(5)

        return { data: ftsData || [] }
      })(),

      // 3. Partnerek
      partnersQuery.limit(5),
    ])

    return {
      dossiers: dossiersRes.data || [],
      documents: docsRes.data || [],
      partners: partnersRes.data || [],
    }
  } catch (err) {
    console.error("[QuickSearch] Error:", err)
    return { dossiers: [], documents: [], partners: [] }
  }
}
