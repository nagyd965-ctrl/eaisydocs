import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

/**
 * GDPR Anonimizáló Cron (BRD-007 / A-014)
 *
 * Két szabályt hajt végre:
 * 1. ELUTASÍTOTT jelöltek: a döntés közlésétől számított 30 nap elteltével
 *    anonimizálás (név, e-mail, telefon, LinkedIn törlése; CV törlése)
 * 2. TALENT POOL jelöltek: a jelentkezéstől számított 12 hónap elteltével
 *    anonimizálás
 *
 * Ütemezés: vercel.json-ban (napi 1x javasolt)
 * Hitelesítés: CRON_SECRET Bearer token
 */

export async function GET(request: NextRequest) {
  // Hitelesítés
  const authHeader = request.headers.get("authorization")
  const secret = authHeader?.replace("Bearer ", "") || request.nextUrl.searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

  let anonymizedRejected = 0
  let anonymizedTalentPool = 0
  let deletedCvs = 0

  // ── 1. Elutasított jelöltek anonimizálása (30 nap után) ──
  const { data: rejectedCandidates } = await supabaseAdmin
    .from("hr_toborzas")
    .select("id, nev, cv_storage_path, updated_at, statusz")
    .eq("statusz", "elutasitva")
    .lt("updated_at", thirtyDaysAgo.toISOString())
    .neq("nev", "[Anonimizált jelölt]") // még nem anonimizált

  if (rejectedCandidates && rejectedCandidates.length > 0) {
    for (const candidate of rejectedCandidates) {
      // CV törlése
      if (candidate.cv_storage_path) {
        try {
          await supabaseAdmin.storage
            .from("hr_dokumentumok")
            .remove([candidate.cv_storage_path])
          deletedCvs++
        } catch (err) {
          console.warn(`CV törlési hiba (${candidate.id}):`, err)
        }
      }

      // Adatok anonimizálása
      const { error } = await supabaseAdmin
        .from("hr_toborzas")
        .update({
          nev: "[Anonimizált jelölt]",
          email: null,
          telefon: null,
          linkedin_url: null,
          cv_storage_path: null,
          uzenet: null,
          berigeny: null,
        })
        .eq("id", candidate.id)

      if (!error) {
        anonymizedRejected++
        // Audit napló
        await supabaseAdmin.from("hr_esemeny_naplo").insert({
          esemeny_tipus: "gdpr_anonymizalas",
          entitas_tipus: "hr_toborzas",
          entitas_id: candidate.id,
          megjegyzes: `GDPR anonimizálás: elutasított jelölt (30 nap után) — eredeti név törölve.`,
        })
      }
    }
  }

  // ── 2. Talent Pool jelöltek anonimizálása (12 hónap után) ──
  const { data: talentPoolCandidates } = await supabaseAdmin
    .from("hr_toborzas")
    .select("id, nev, cv_storage_path, created_at, statusz")
    .in("statusz", ["talent_pool", "nem_foglalkoztathato", "visszavonta"])
    .lt("created_at", twelveMonthsAgo.toISOString())
    .neq("nev", "[Anonimizált jelölt]")

  if (talentPoolCandidates && talentPoolCandidates.length > 0) {
    for (const candidate of talentPoolCandidates) {
      // CV törlése
      if (candidate.cv_storage_path) {
        try {
          await supabaseAdmin.storage
            .from("hr_dokumentumok")
            .remove([candidate.cv_storage_path])
          deletedCvs++
        } catch (err) {
          console.warn(`CV törlési hiba (${candidate.id}):`, err)
        }
      }

      // Adatok anonimizálása
      const { error } = await supabaseAdmin
        .from("hr_toborzas")
        .update({
          nev: "[Anonimizált jelölt]",
          email: null,
          telefon: null,
          linkedin_url: null,
          cv_storage_path: null,
          uzenet: null,
          berigeny: null,
        })
        .eq("id", candidate.id)

      if (!error) {
        anonymizedTalentPool++
        await supabaseAdmin.from("hr_esemeny_naplo").insert({
          esemeny_tipus: "gdpr_anonymizalas",
          entitas_tipus: "hr_toborzas",
          entitas_id: candidate.id,
          megjegyzes: `GDPR anonimizálás: Talent Pool jelölt (12 hónap után) — eredeti név törölve.`,
        })
      }
    }
  }

  return NextResponse.json({
    success: true,
    anonymizedRejected,
    anonymizedTalentPool,
    deletedCvs,
    checkedRejected: rejectedCandidates?.length || 0,
    checkedTalentPool: talentPoolCandidates?.length || 0,
  })
}
