import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const id = params.id
  const supabase = await createClient()

  // ── HITELESÍTÉS: Supabase session VAGY Bearer API kulcs (A-020) ──
  const authHeader = request.headers.get("authorization")
  const apiKey = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null

  if (!(apiKey && apiKey === process.env.REST_API_V1_KEY)) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized — érvényes Supabase session vagy Bearer API kulcs szükséges." },
        { status: 401 }
      )
    }
  }

  // UUID validáció (PostgREST filter-injekció ellen)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: "Érvénytelen ügyirat azonosító." }, { status: 400 })
  }

  // Lekérdezzük az adott ügyirathoz (vagy a hozzá tartozó iratokhoz) tartozó naplóbejegyzéseket
  const { data, error } = await supabase
    .from("esemeny_naplo")
    .select(`
      id,
      tortent,
      esemeny_tipus,
      user_id,
      elozo_ertek,
      uj_ertek,
      indoklas,
      entitas_tipus,
      entitas_id
    `)
    .or(`and(entitas_tipus.eq.ugyirat,entitas_id.eq.${id})`)
    .order('tortent', { ascending: false })

  // Jegyzet: Ideális esetben lekérdeznénk az ugyirathoz tartozó iratok ID-jait is,
  // és azokra is rászűrnénk, de a demó kedvéért a közvetlen ügyirat események is elegendőek.

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ 
    ugyirat_id: id,
    eletciklus: data 
  })
}
