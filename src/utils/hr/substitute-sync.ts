import { createClient as createAdminClient } from "@supabase/supabase-js"

/**
 * Automatikusan ellenőrzi a lejárt helyettesítéseket.
 * Ha egy helyettesítés végdátuma elmúlt (veg_datuma < today):
 * 1. Inaktiválja a rekordot (aktiv = false).
 * 2. Az összes olyan függőben lévő kérelmet (statusz = 'jovahagyasra_var'),
 *    amit a helyettes nem bírált el a helyettesítési időszakban,
 *    automatikusan visszaszignálja az eredeti vezetőre.
 */
export async function syncExpiredSubstitutions() {
  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const today = new Date().toISOString().split("T")[0]

    // Lejárt, de még aktívnak jelölt helyettesítések megkeresése
    const { data: expiredSubs, error: fetchErr } = await supabaseAdmin
      .from("hr_helyettesites")
      .select("id, vezeto_id, helyettes_id, company_id")
      .eq("aktiv", true)
      .lt("veg_datuma", today)

    if (fetchErr || !expiredSubs || expiredSubs.length === 0) return

    for (const sub of expiredSubs) {
      // 1. Inaktiváljuk a helyettesítést
      await supabaseAdmin
        .from("hr_helyettesites")
        .update({ aktiv: false })
        .eq("id", sub.id)

      // 2. Függő távolléti kérelmek visszaszignálása az eredeti vezetőre
      let tavolletQuery = supabaseAdmin
        .from("hr_tavollet")
        .update({ aktualis_jovahagyo_id: sub.vezeto_id })
        .eq("aktualis_jovahagyo_id", sub.helyettes_id)
        .eq("statusz", "jovahagyasra_var")

      if (sub.company_id) {
        tavolletQuery = tavolletQuery.eq("company_id", sub.company_id)
      }
      await tavolletQuery

      // 3. Függő jelenlét korrekciók visszaszignálása az eredeti vezetőre
      let korrekcioQuery = supabaseAdmin
        .from("hr_jelenlet_korrekcio")
        .update({ jovahagyo_id: sub.vezeto_id })
        .eq("jovahagyo_id", sub.helyettes_id)
        .eq("statusz", "jovahagyasra_var")

      if (sub.company_id) {
        korrekcioQuery = korrekcioQuery.eq("company_id", sub.company_id)
      }
      await korrekcioQuery
    }
  } catch (err) {
    console.error("Hiba a lejárt helyettesítések szinkronizálásakor:", err)
  }
}
