import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const partner_id = searchParams.get("partner_id")

  // ── HITELESÍTÉS: Supabase session VAGY Bearer API kulcs (A-020) ──
  const authHeader = request.headers.get("authorization")
  const apiKey = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null

  const supabase = await createClient()

  // 1) Bearer API kulcs ellenőrzése ( külső integrációkhoz)
  if (apiKey && apiKey === process.env.REST_API_V1_KEY) {
    // API kulcs valid — tovább a lekérdezésre
  } else {
    // 2) Supabase session ellenőrzése (böngészőből hívás esetén)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized — érvényes Supabase session vagy Bearer API kulcs szükséges." },
        { status: 401 }
      )
    }
  }

  // Cég-szűrés (multi-tenant): az aktív cég ügyiratai only
  const { getActiveCompanyIdServer } = await import("@/utils/company-server")
  const activeCompanyId = await getActiveCompanyIdServer()

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

  if (activeCompanyId) {
    query = query.eq("company_id", activeCompanyId)
  }

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
