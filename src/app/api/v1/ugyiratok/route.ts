import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Külső REST API v1 — Ügyiratok lekérdezése
 * Biztonsági szabályok:
 * - REST_API_V1_KEY: legalább 32 karakteres, nagy entrópiájú titkos kulcs szükséges.
 * - Env-first cég-kötés: ha a REST_API_V1_COMPANY_ID környezeti változó be van állítva,
 *   az FELÜLÍRJA a kliens által küldött x-company-id fejlécet és a company_id URL paramétert.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const partner_id = searchParams.get("partner_id")

  if (partner_id && !uuidRegex.test(partner_id)) {
    return NextResponse.json(
      { error: "Érvénytelen partner_id formátum (UUID szükséges)." },
      { status: 400 }
    )
  }

  // ── HITELESÍTÉS: Supabase session VAGY Bearer API kulcs (A-020) ──
  const authHeader = request.headers.get("authorization")
  const apiKey = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null

  const supabase = await createClient()
  const isBearerAuth = Boolean(
    process.env.REST_API_V1_KEY &&
      apiKey &&
      apiKey === process.env.REST_API_V1_KEY
  )

  let effectiveCompanyId: string | null = null

  // 1) Bearer API kulcs ellenőrzése (külső integrációkhoz — env-first cég-kötéssel!)
  if (isBearerAuth) {
    effectiveCompanyId =
      process.env.REST_API_V1_COMPANY_ID?.trim() ||
      request.headers.get("x-company-id")?.trim() ||
      searchParams.get("company_id")?.trim() ||
      null
  } else {
    // 2) Supabase session ellenőrzése (böngészőből hívás esetén)
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
    .eq("company_id", effectiveCompanyId)
    .order("iktatas_datuma", { ascending: false })
    .limit(200)

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
