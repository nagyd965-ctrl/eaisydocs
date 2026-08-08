"use server"

import { createClient } from "@/utils/supabase/server"

export async function searchDocuments(query: string, filters: any = {}) {
  const supabase = await createClient()

  const baseSelect = `
    id, 
    targy, 
    leiras, 
    erkeztetoszam, 
    irany, 
    minosites, 
    erkezes_datuma,
    ugyirat_id,
    ugyirat!inner(
      iktatoszam, 
      statusz,
      ugy!inner(targy, felelos_user_id)
    ),
    partner:kuldo_partner_id(nev)
  `

  // ── 1. Szöveges keresés: FTS (kereso_vektor) → ILIKE fallback ──
  let searchResults: any[] | null = null

  if (query && query.trim() !== "") {
    const cleanQuery = query.trim()

    // Elsődleges: Postgres FTS (tsvector) — GIN index, kereso_vektor tartalmazza
    // a targy + leiras + ocr_szoveg (PDF szöveg, email szöveg) összesítését
    const { data: ftsData, error: ftsError } = await supabase
      .from("irat")
      .select(baseSelect)
      .textSearch("kereso_vektor", cleanQuery, {
        type: "plain",       // plainto_tsquery — kezeli a szóközöket, egyszerű
        config: "hungarian", // magyar szótár (ékezetek, toldalékok)
      })
      .order("erkezes_datuma", { ascending: false })
      .limit(50)

    if (!ftsError && ftsData && ftsData.length > 0) {
      searchResults = ftsData
    } else {
      // Fallback: ILIKE a tárgy, leírás, érkeztetőszám mezőkön
      // (ha a kereso_vektor üres, vagy a szó nem szerepel a szótárban)
      const { data: matchingPartners } = await supabase
        .from("partner")
        .select("id")
        .ilike("nev", `%${cleanQuery}%`)

      const partnerIds = matchingPartners?.map(p => p.id) || []
      let orConditions = `targy.ilike.%${cleanQuery}%,leiras.ilike.%${cleanQuery}%,erkeztetoszam.ilike.%${cleanQuery}%`
      if (partnerIds.length > 0) {
        orConditions += `,kuldo_partner_id.in.(${partnerIds.join(",")})`
      }

      const { data: ilikeData } = await supabase
        .from("irat")
        .select(baseSelect)
        .or(orConditions)
        .order("erkezes_datuma", { ascending: false })
        .limit(50)

      searchResults = ilikeData ?? []
    }
  }

  // ── 2. Metaadat szűrők (a szöveges találatokra, vagy az összes iratra) ──
  let dbQuery = supabase.from("irat").select(baseSelect)

  if (searchResults !== null) {
    // Van szöveges keresés — a találatokat az ID-k alapján szűrjük tovább
    const ids = searchResults.map(r => r.id)
    if (ids.length === 0) return { data: [], error: null }
    dbQuery = dbQuery.in("id", ids)
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

  if (error) {
    console.error("Search error:", error)
    return { error: error.message, data: [] }
  }

  return { data, error: null }
}



export async function saveSearch(name: string, query: string, filters: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const { error } = await supabase.from("mentett_kereses").insert({
    user_id: user.id,
    nev: name,
    kereso_parameterek: { query, filters }
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getSavedSearches() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from("mentett_kereses")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return data || []
}

export async function deleteSavedSearch(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("mentett_kereses").delete().eq("id", id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
