import { createClient } from "@supabase/supabase-js"

// In-memory cache for recent notifications: key (user_id:saved_search_id:irat_id) -> timestamp (ms)
const recentAlertsCache = new Map<string, number>()
const ALERT_COOLDOWN_MS = 60_000 // 1 minute in-memory cooldown per user+saved_search+doc

function pruneRecentAlertsCache(now: number) {
  if (recentAlertsCache.size > 200) {
    for (const [k, timestamp] of recentAlertsCache.entries()) {
      if (now - timestamp > ALERT_COOLDOWN_MS * 2) {
        recentAlertsCache.delete(k)
      }
    }
  }
}

/**
 * Checks all active saved searches with notifications enabled against a newly created or updated irat.
 * If matches are found and the user is authorized to view the irat, inserts an in-app notification
 * into the `alkalmazas_ertesites` table with strict idempotency and deduplication.
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

    function stripAccents(str: string): string {
      if (!str) return ""
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
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
    
    const normSearchable = stripAccents(searchableFullText)

    const notifiedUsers: string[] = []

    // 3. Evaluate each saved search
    for (const item of savedSearches) {
      const now = Date.now()
      pruneRecentAlertsCache(now)

      // Fast in-memory check to prevent duplicate concurrent executions in the same process
      const dedupKey = `${item.user_id}:${item.id}:${irat.id}`
      const lastAlertTime = recentAlertsCache.get(dedupKey)
      if (lastAlertTime && now - lastAlertTime < ALERT_COOLDOWN_MS) {
        continue
      }

      const p = item.kereso_parameterek || {}
      const q = (p.query || "").trim().toLowerCase()
      const f = p.filters || {}

      // Check text query (both verbatim and accent-stripped)
      if (q) {
        const normQ = stripAccents(q)
        if (!searchableFullText.includes(q) && !normSearchable.includes(normQ)) {
          continue
        }
      }

      // Check filters
      if (f.minosites && f.minosites !== "all" && irat.minosites !== f.minosites) {
        continue
      }
      if (f.irany && f.irany !== "all" && irat.irany !== f.irany) {
        continue
      }
      if (f.iktatoszam && (irat.ugyirat as any)?.iktatoszam) {
        const normIktato = stripAccents((irat.ugyirat as any).iktatoszam)
        const normFilterIktato = stripAccents(f.iktatoszam)
        if (!normIktato.includes(normFilterIktato)) {
          continue
        }
      }
      if (f.erkeztetoszam && irat.erkeztetoszam) {
        const normErk = stripAccents(irat.erkeztetoszam)
        const normFilterErk = stripAccents(f.erkeztetoszam)
        if (!normErk.includes(normFilterErk)) {
          continue
        }
      }
      if (f.partner) {
        const partnerName = (irat.partner as any)?.nev || ""
        const normFilterPartner = stripAccents(f.partner)
        const normIratPartner = stripAccents(partnerName)
        const normTargy = stripAccents(irat.targy || "")
        // Matches if either the partner entity name matches, or partner name appears in subject or full text
        if (
          !normIratPartner.includes(normFilterPartner) &&
          !normTargy.includes(normFilterPartner) &&
          !normSearchable.includes(normFilterPartner)
        ) {
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
      const role = userProfile.docs_szerepkor
      const isPrivileged = ["admin", "iktato", "auditor"].includes(role)
      let hasAccess = isPrivileged

      // If document is in inbox (no ugyirat_id yet), managers and clerks are also authorized
      if (!hasAccess && !irat.ugyirat_id && ["vezeto", "ugyintezo"].includes(role)) {
        hasAccess = true
      }

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

      // 5. Send Notification (with strict deduplication against database)
      const displayIdentifier =
        (irat.ugyirat as any)?.iktatoszam || irat.erkeztetoszam || "Új dokumentum"
      const linkUrl = irat.ugyirat_id ? `/dossiers/${irat.ugyirat_id}` : `/inbox/${irat.id}`
      const notifTitle = `Új találat: "${item.nev}"`

      // Check if an alert for this user and this saved search already exists for this document
      const docIdentifiers = [
        irat.erkeztetoszam,
        (irat.ugyirat as any)?.iktatoszam,
        displayIdentifier
      ].filter((id): id is string => Boolean(id && id !== "Új dokumentum"))

      let alreadyNotified = false

      for (const idf of docIdentifiers) {
        const { data: exists } = await supabase
          .from("alkalmazas_ertesites")
          .select("id")
          .eq("user_id", item.user_id)
          .eq("cim", notifTitle)
          .ilike("szoveg", `%(${idf})%`)
          .limit(1)
          .maybeSingle()

        if (exists) {
          alreadyNotified = true
          break
        }
      }

      if (!alreadyNotified) {
        const { data: linkExists } = await supabase
          .from("alkalmazas_ertesites")
          .select("id")
          .eq("user_id", item.user_id)
          .eq("cim", notifTitle)
          .eq("link_url", linkUrl)
          .limit(1)
          .maybeSingle()

        if (linkExists) {
          alreadyNotified = true
        }
      }

      if (alreadyNotified) {
        recentAlertsCache.set(dedupKey, now)
        continue
      }

      await supabase.from("alkalmazas_ertesites").insert({
        user_id: item.user_id,
        cim: notifTitle,
        szoveg: `Új dokumentum érkezett a mentett keresésedhez: "${irat.targy}" (${displayIdentifier})`,
        link_url: linkUrl,
        olvasott: false,
      })

      recentAlertsCache.set(dedupKey, now)

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
