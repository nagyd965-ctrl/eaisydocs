import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const partner_id = searchParams.get("partner_id")

  const supabase = await createClient()

  // Mivel ez demó API, egyelőre nem várunk el Authorization headert, hanem
  // hagyjuk, hogy a Supabase Auth session, vagy fallbackként egyszerű publikus adatként jöjjön le.
  // Élesben: const authHeader = request.headers.get('authorization') -> JWT ellenőrzés

  let query = supabase
    .from("ugyirat")
    .select(`
      id,
      iktatoszam,
      iktatas_datuma,
      statusz,
      ugy:ugy_id (
        targy,
        ugyszam
      )
    `)
    .order('iktatas_datuma', { ascending: false })

  // Ha van partner szűrés, megkeressük az irat_kapcsolaton keresztül azokat az ügyiratokat
  if (partner_id) {
    const { data: kapcs } = await supabase
      .from("irat_kapcsolat")
      .select("ugyirat_id")
      .eq("entitas_tipus", "partner")
      .eq("entitas_id", partner_id)

    if (kapcs && kapcs.length > 0) {
      const ugyiratIds = kapcs.map(k => k.ugyirat_id).filter(id => id != null)
      query = query.in("id", ugyiratIds)
    } else {
      // Ha nincs ilyen kapcsolat, üres listát adunk
      return NextResponse.json({ data: [] })
    }
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
