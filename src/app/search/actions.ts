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
      ugyirat:ugyirat_id(
        iktatoszam, 
        statusz,
        ugy:ugy_id(targy)
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

  // Alapértelmezetten a legújabb elöl
  const { data, error } = await dbQuery.order("erkezes_datuma", { ascending: false }).limit(50)

  if (error) {
    console.error("Search error:", error)
    return { error: error.message, data: [] }
  }

  return { data, error: null }
}
