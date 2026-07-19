"use server"

import { createClient } from "@/utils/supabase/server"

export async function searchDocuments(query: string, filters: any = {}) {
  const supabase = await createClient()

  let dbQuery = supabase
    .from("irat")
    .select(`
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
    `)

  // Ha van szabadszavas keresés, ráengedjük a magyar FTS motort
  if (query && query.trim() !== "") {
    dbQuery = dbQuery.textSearch("kereso_vektor", query, {
      config: 'hungarian',
      type: 'websearch'
    })
  }

  // Metaadat szűrések
  if (filters.minosites && filters.minosites !== "all") {
    dbQuery = dbQuery.eq("minosites", filters.minosites)
  }
  if (filters.irany && filters.irany !== "all") {
    dbQuery = dbQuery.eq("irany", filters.irany)
  }
  
  if (filters.iktatoszam) {
    dbQuery = dbQuery.ilike("ugyirat.iktatoszam", `%${filters.iktatoszam}%`)
    // IMPORTANT: Since iktatoszam is on ugyirat, we need to make sure the join filters inner rows if we want to exclude irat. 
    // Supabase JS ilike on joined tables filters the inner joined object (sets it to null if no match). 
    // To filter the parent rows, we must use !inner in the select string.
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
  
  // Alapértelmezetten a legújabb elöl
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
