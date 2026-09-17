import { createClient } from "@supabase/supabase-js"

/**
 * Checks all active saved searches with notifications enabled against a newly created or updated irat.
 * If matches are found and the user is authorized to view the irat, inserts an in-app notification
 * into the `alkalmazas_ertesites` table.
 */
export async function checkSavedSearchesForNewIrat(
  iratId: string,
  adminClient?: any
): Promise<{ checked: number; notifiedUsers: string[] }> {
  try {
    const supabase =
      adminClient ||
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

    // 1. Fetch full details of the irat
    const { data: irat, error: iratErr } = await supabase
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
          id,
          iktatoszam,
          szervezeti_egyseg_id
        ),
        partner:kuldo_partner_id(nev),
        irat_fajl(ocr_szoveg)
      `)
      .eq("id", iratId)
      .single()

    if (iratErr || !irat) {
      return { checked: 0, notifiedUsers: [] }
    }

    // 2. Fetch all saved searches with notifications enabled
    const { data: savedSearches, error: savedErr } = await supabase
      .from("mentett_kereses")
      .select("id, user_id, nev, kereso_parameterek, ertesites_bekapcsolva")
      .eq("ertesites_bekapcsolva", true)

    if (savedErr || !savedSearches || savedSearches.length === 0) {
      return { checked: 0, notifiedUsers: [] }
    }

    const aggregatedOcr =
      (irat.irat_fajl as any[])?.map((f) => f.ocr_szoveg || "").filter(Boolean).join(" ") || ""
    const searchableFullText = [
      irat.targy,
      irat.leiras,
      irat.erkeztetoszam,
      (irat.ugyirat as any)?.iktatoszam,
      (irat.partner as any)?.nev,
      aggregatedOcr,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    const notifiedUsers: string[] = []

    // 3. Evaluate each saved search
    for (const item of savedSearches) {
      const p = item.kereso_parameterek || {}
      const q = (p.query || "").trim().toLowerCase()
      const f = p.filters || {}

      // Check text query
      if (q && !searchableFullText.includes(q)) {
        // Query string not found in document text/meta
        continue
      }

      // Check filters
      if (f.minosites && f.minosites !== "all" && irat.minosites !== f.minosites) {
        continue
      }
      if (f.irany && f.irany !== "all" && irat.irany !== f.irany) {
        continue
      }
      if (f.iktatoszam && (irat.ugyirat as any)?.iktatoszam) {
        if (
          !(irat.ugyirat as any).iktatoszam.toLowerCase().includes(f.iktatoszam.toLowerCase())
        ) {
          continue
        }
      }
      if (f.erkeztetoszam && irat.erkeztetoszam) {
        if (!irat.erkeztetoszam.toLowerCase().includes(f.erkeztetoszam.toLowerCase())) {
          continue
        }
      }
      if (f.partner && (irat.partner as any)?.nev) {
        if (!(irat.partner as any).nev.toLowerCase().includes(f.partner.toLowerCase())) {
          continue
        }
      }

      // 4. Verify Authorization (ABAC / RLS compliance)
      // Check user profile for role, max_minosites and department
      const { data: userProfile } = await supabase
        .from("felhasznalo_profil")
        .select("id, docs_szerepkor, szervezeti_egyseg_id, max_minosites")
        .eq("id", item.user_id)
        .single()

      if (!userProfile) continue

      // Check classification level
      const minositesHierarchy: Record<string, number> = {
        nyilt: 1,
        belso: 2,
        bizalmas: 3,
        szigoruan_bizalmas: 4,
      }
      const docLevel = minositesHierarchy[irat.minosites] || 1
      const userMaxLevel = minositesHierarchy[userProfile.max_minosites] || 1
      if (docLevel > userMaxLevel) {
        continue // User does not have high enough security clearance
      }

      // Check role and department permissions
      const isPrivileged = ["admin", "iktato", "auditor"].includes(
        userProfile.docs_szerepkor
      )
      let hasAccess = isPrivileged

      if (!hasAccess && irat.ugyirat_id) {
        const docDept = (irat.ugyirat as any)?.szervezeti_egyseg_id
        if (docDept && docDept === userProfile.szervezeti_egyseg_id) {
          hasAccess = true
        } else {
          // Check explicit access table
          const { data: explicitAccess } = await supabase
            .from("ugyirat_hozzaferes")
            .select("id")
            .eq("ugyirat_id", irat.ugyirat_id)
            .eq("user_id", userProfile.id)
            .maybeSingle()
          if (explicitAccess) {
            hasAccess = true
          }
        }
      }

      if (!hasAccess) continue

      // 5. Send Notification
      const displayIdentifier =
        (irat.ugyirat as any)?.iktatoszam || irat.erkeztetoszam || "Új dokumentum"
      const linkUrl = irat.ugyirat_id ? `/dossiers/${irat.ugyirat_id}` : `/inbox`

      await supabase.from("alkalmazas_ertesites").insert({
        user_id: item.user_id,
        cim: `Új találat: "${item.nev}"`,
        szoveg: `Új dokumentum érkezett a mentett keresésedhez: "${irat.targy}" (${displayIdentifier})`,
        link_url: linkUrl,
        olvasott: false,
      })

      await supabase
        .from("mentett_kereses")
        .update({ utolso_ertesites_datuma: new Date().toISOString() })
        .eq("id", item.id)

      notifiedUsers.push(item.user_id)
    }

    return { checked: savedSearches.length, notifiedUsers }
  } catch (error) {
    console.error("[SavedSearchAlerts] Error processing saved search alerts:", error)
    return { checked: 0, notifiedUsers: [] }
  }
}
