import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  const id = params.id
  const { searchParams } = new URL(request.url)
  const supabase = await createClient()

  // UUID validáció (PostgREST filter-injekció ellen)
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: "Érvénytelen ügyirat azonosító." }, { status: 400 })
  }

  // ── HITELESÍTÉS: Supabase session VAGY Bearer API kulcs (A-020) ──
  const authHeader = request.headers.get("authorization")
  const apiKey = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null

  const isBearerAuth = Boolean(
    process.env.REST_API_V1_KEY &&
      apiKey &&
      apiKey === process.env.REST_API_V1_KEY
  )

  let effectiveCompanyId: string | null = null

  if (isBearerAuth) {
    // Env-first sorrend: a REST_API_V1_COMPANY_ID felülírja a kliens által küldött fejlécet/paramétert
    effectiveCompanyId =
      process.env.REST_API_V1_COMPANY_ID?.trim() ||
      request.headers.get("x-company-id")?.trim() ||
      searchParams.get("company_id")?.trim() ||
      null
  } else {
    const { getActiveCompanyIdServer } = await import("@/utils/company-server")
    const { requireDocsAuthServer } = await import("@/utils/docs-auth-guard")
    const activeCompanyId = await getActiveCompanyIdServer()
    const auth = await requireDocsAuthServer(undefined, activeCompanyId)
    if (!auth.authorized || !auth.user) {
      return NextResponse.json(
        { error: "Unauthorized — érvényes Supabase session vagy Bearer API kulcs szükséges." },
        { status: 401 }
      )
    }
    effectiveCompanyId = auth.activeCompanyId
  }

  if (!effectiveCompanyId || !uuidRegex.test(effectiveCompanyId)) {
    return NextResponse.json(
      { error: "Hiányzó vagy érvénytelen vállalat-azonosító (company_id)." },
      { status: 400 }
    )
  }

  // Ellenőrizzük, hogy az ügyirat valóban az adott vállalathoz tartozik-e
  const { data: targetDossier } = await supabase
    .from("ugyirat")
    .select("id")
    .eq("id", id)
    .eq("company_id", effectiveCompanyId)
    .maybeSingle()

  if (!targetDossier) {
    return NextResponse.json({ error: "Az ügyirat nem található a vállalatnál." }, { status: 404 })
  }

  // Lekérdezzük az adott ügyirathoz tartozó naplóbejegyzéseket (company_id szűréssel és limittel)
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
    .eq("company_id", effectiveCompanyId)
    .eq("entitas_tipus", "ugyirat")
    .eq("entitas_id", id)
    .order("tortent", { ascending: false })
    .limit(200)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ 
    ugyirat_id: id,
    eletciklus: data 
  })
}
