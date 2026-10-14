"use server"

import { createClient } from "@/utils/supabase/server"
import { createEaisyBillClient } from "@/utils/supabase/eaisybill"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { buildHtmlEmail, sendNotificationEmail } from "@/utils/mailer"
import { revalidatePath } from "next/cache"
import { getActiveCompanyIdServer, getActiveCompanyServer } from "@/utils/company-server"

export interface EaisyBillMemberItem {
  eaisybillUserId: string
  name: string
  email: string
  eaisybillRole: string
  status: "already_member" | "existing_user" | "new_user"
  suggestedDocsRole: "admin" | "vezeto" | "iktato" | "ugyintezo" | "betekinto"
  existingDocsUserId?: string
}

export interface GetEaisyBillMembersResult {
  success: boolean
  companyName?: string
  eaisybillCompanyId?: string
  members?: EaisyBillMemberItem[]
  error?: string
}

export interface ImportEaisyBillMemberInput {
  email: string
  name: string
  eaisybillUserId: string
  docsRole: "admin" | "vezeto" | "iktato" | "ugyintezo" | "betekinto"
}

export interface ImportEaisyBillMembersResult {
  success: boolean
  importedCount?: number
  invitedCount?: number
  error?: string
}

/**
 * Szerepkör megfeleltetés: eaisyBill szerepkör -> eaisyDocs iratkezelési szerepkör
 */
function mapEaisyBillRoleToDocsRole(eaisybillRole: string): "admin" | "vezeto" | "iktato" | "ugyintezo" | "betekinto" {
  switch (eaisybillRole?.toLowerCase()) {
    case "owner":
    case "admin":
      return "admin"
    case "assistant":
      return "iktato"
    case "member":
    case "employee":
      return "ugyintezo"
    case "viewer":
      return "betekinto"
    default:
      return "ugyintezo"
  }
}

/**
 * Lekéri az aktív céghez tartozó felhasználókat az eaisyBill adatbázisból,
 * és összeveti az eaisyDocs helyi tagjaival és meglévő felhasználóival.
 */
export async function getEaisyBillCompanyMembersAction(
  targetCompanyId?: string
): Promise<GetEaisyBillMembersResult> {
  try {
    const docsClient = await createClient()
    const { data: { user } } = await docsClient.auth.getUser()

    if (!user) {
      return { success: false, error: "Nincs bejelentkezett felhasználó." }
    }

    // 1. Cég meghatározása
    let activeCompany = null
    if (targetCompanyId) {
      const { data } = await docsClient.from("companies").select("*").eq("id", targetCompanyId).maybeSingle()
      activeCompany = data
    } else {
      activeCompany = await getActiveCompanyServer()
    }

    if (!activeCompany) {
      return { success: false, error: "Nem található a kiválasztott cég." }
    }

    const billClient = createEaisyBillClient()

    // 2. eaisyBill Company ID meghatározása
    let eaisybillCompanyId = activeCompany.eaisybill_company_id

    // Ha még nincs összekötve, megpróbáljuk adószám vagy név alapján megkeresni
    if (!eaisybillCompanyId) {
      try {
        const cleanTax = activeCompany.tax_number?.replace(/[-\s]/g, "")
        if (cleanTax && cleanTax.length >= 8) {
          const { data: matchedComp } = await billClient
            .from("companies")
            .select("id")
            .ilike("tax_number", `%${cleanTax.slice(0, 8)}%`)
            .maybeSingle()
          if (matchedComp?.id) {
            eaisybillCompanyId = matchedComp.id
          }
        }

        if (!eaisybillCompanyId && activeCompany.name) {
          const { data: matchedComp } = await billClient
            .from("companies")
            .select("id")
            .ilike("name", `%${activeCompany.name.trim()}%`)
            .maybeSingle()
          if (matchedComp?.id) {
            eaisybillCompanyId = matchedComp.id
          }
        }

        if (eaisybillCompanyId) {
          // Ha találtunk megbízható egyezést, automatikusan rögzítjük
          await docsClient
            .from("companies")
            .update({ eaisybill_company_id: eaisybillCompanyId })
            .eq("id", activeCompany.id)
        }
      } catch (matchErr) {
        console.warn("[eaisyBill] Tagok: Cég párosítási figyelmeztetés:", matchErr)
      }
    }

    if (!eaisybillCompanyId) {
      return {
        success: false,
        error: `A(z) „${activeCompany.name}” nincs eaisyBill fiókhoz társítva. Importáld vagy válaszd ki a megfelelő eaisyBill céget a cégválasztóban!`,
      }
    }

    // 3. eaisyBill tagok lekérése
    const { data: billMembers, error: billMembersErr } = await billClient
      .from("company_members")
      .select("id, user_id, role, created_at")
      .eq("company_id", eaisybillCompanyId)

    if (billMembersErr) {
      return { success: false, error: "Hiba az eaisyBill tagok lekérésekor: " + billMembersErr.message }
    }

    if (!billMembers || billMembers.length === 0) {
      return {
        success: true,
        companyName: activeCompany.name,
        eaisybillCompanyId,
        members: [],
      }
    }

    // 4. Profilok és e-mailek lekérése eaisyBill-ből
    const billUserIds = billMembers.map((m) => m.user_id)
    const { data: billProfiles } = await billClient
      .from("profiles")
      .select("user_id, name")
      .in("user_id", billUserIds)

    const profileNameMap = new Map((billProfiles || []).map((p) => [p.user_id, p.name]))

    // Auth adatok lekérése párhuzamosan
    const billUsersWithEmail = await Promise.all(
      billMembers.map(async (m) => {
        try {
          const { data: authUser } = await billClient.auth.admin.getUserById(m.user_id)
          const name = profileNameMap.get(m.user_id) || authUser?.user?.user_metadata?.name || "Névtelen tag"
          const email = authUser?.user?.email?.trim().toLowerCase() || ""
          return {
            eaisybillUserId: m.user_id,
            role: m.role || "member",
            name,
            email,
          }
        } catch {
          return {
            eaisybillUserId: m.user_id,
            role: m.role || "member",
            name: profileNameMap.get(m.user_id) || "Névtelen tag",
            email: "",
          }
        }
      })
    )

    // Érvényes e-maillel rendelkezők szűrése
    const validBillMembers = billUsersWithEmail.filter((u) => u.email)

    // 5. eaisyDocs helyi tagok lekérése az aktív céghez
    const { data: localMembers } = await docsClient
      .from("company_members")
      .select("user_id")
      .eq("company_id", activeCompany.id)

    const localMemberUserIds = new Set((localMembers || []).map((m) => m.user_id))

    // 6. eaisyDocs összes meglévő profil lekérése (e-mail alapján való egyeztetéshez)
    const emailsToMatch = validBillMembers.map((u) => u.email)
    const { data: localProfiles } = await docsClient
      .from("felhasznalo_profil")
      .select("id, email")
      .in("email", emailsToMatch)

    const emailToLocalProfileMap = new Map((localProfiles || []).map((p) => [p.email.toLowerCase(), p.id]))

    // 7. Összeállítás és státusz meghatározása
    const resultList: EaisyBillMemberItem[] = validBillMembers.map((bm) => {
      const localUserId = emailToLocalProfileMap.get(bm.email)
      let status: "already_member" | "existing_user" | "new_user" = "new_user"

      if (localUserId) {
        if (localMemberUserIds.has(localUserId)) {
          status = "already_member"
        } else {
          status = "existing_user"
        }
      }

      return {
        eaisybillUserId: bm.eaisybillUserId,
        name: bm.name,
        email: bm.email,
        eaisybillRole: bm.role,
        status,
        suggestedDocsRole: mapEaisyBillRoleToDocsRole(bm.role),
        existingDocsUserId: localUserId,
      }
    })

    return {
      success: true,
      companyName: activeCompany.name,
      eaisybillCompanyId,
      members: resultList,
    }
  } catch (err: any) {
    console.error("[eaisyBill] Tagok lekérdezési hiba:", err)
    return { success: false, error: err.message || "Nem sikerült lekérni az eaisyBill tagokat." }
  }
}

/**
 * Kiválasztott eaisyBill tagok importálása az aktív céghez.
 * Csak és kizárólag a bepipált tételeket importálja!
 * Az új felhasználóknak meghívó linket generál és elküldi nekik e-mailben.
 */
export async function importEaisyBillCompanyMembersAction(
  targetCompanyId: string,
  selectedMembers: ImportEaisyBillMemberInput[]
): Promise<ImportEaisyBillMembersResult> {
  try {
    if (!targetCompanyId || !selectedMembers || selectedMembers.length === 0) {
      return { success: false, error: "Nincs kijelölt importálandó felhasználó." }
    }

    const docsClient = await createClient()
    const { data: { user } } = await docsClient.auth.getUser()

    if (!user) {
      return { success: false, error: "Nincs bejelentkezett felhasználó." }
    }

    // 1. Jogosultság ellenőrzése: A hívó fél tulajdonos-e a cégnél, vagy rendszergazda?
    const { data: company } = await docsClient
      .from("companies")
      .select("id, name, owner_id")
      .eq("id", targetCompanyId)
      .maybeSingle()

    if (!company) {
      return { success: false, error: "A megadott cég nem található." }
    }

    const { data: callerMember } = await docsClient
      .from("company_members")
      .select("role")
      .eq("company_id", targetCompanyId)
      .eq("user_id", user.id)
      .maybeSingle()

    const { data: callerProfile } = await docsClient
      .from("felhasznalo_profil")
      .select("docs_szerepkor")
      .eq("id", user.id)
      .maybeSingle()

    const isOwner = company.owner_id === user.id || callerMember?.role === "owner"
    const isSysAdmin = callerProfile?.docs_szerepkor === "rendszergazda"

    if (!isOwner && !isSysAdmin) {
      return { success: false, error: "Kizárólag a cég tulajdonosa vagy rendszergazda importálhat új tagokat!" }
    }

    // 2. Supabase Admin kliens inicializálása
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return { success: false, error: "Hiányzik a SUPABASE_SERVICE_ROLE_KEY konfiguráció." }
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let importedCount = 0
    let invitedCount = 0

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://eaisydocs2.vercel.app"
    const redirectUrl = `${appUrl}/auth/callback?next=/auth/set-password`

    // 3. Feldolgozás tételenként – KIZÁRÓLAG a kiválasztottakra
    for (const item of selectedMembers) {
      const email = item.email.trim().toLowerCase()
      const name = item.name.trim()
      const docsRole = item.docsRole || "ugyintezo"
      const memberRole = docsRole === "admin" ? "admin" : "member"

      // Megnézzük, létezik-e már a felhasználó az eaisyDocs profilok között
      const { data: existingProfile } = await supabaseAdmin
        .from("felhasznalo_profil")
        .select("id, elerheto_modulok, docs_szerepkor")
        .eq("email", email)
        .maybeSingle()

      let targetUserId: string | null = null

      if (existingProfile) {
        // --- LÉTEZŐ FELHASZNÁLÓ ---
        targetUserId = existingProfile.id

        // Modulok és szinkron adatbázis mezők frissítése
        const currentModules: string[] = Array.isArray(existingProfile.elerheto_modulok)
          ? existingProfile.elerheto_modulok
          : []

        const newModules = currentModules.includes("docs") ? currentModules : [...currentModules, "docs"]

        await supabaseAdmin
          .from("felhasznalo_profil")
          .update({
            elerheto_modulok: newModules,
            eaisybill_user_id: item.eaisybillUserId || null,
            sync_source: "eaisybill",
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", targetUserId)

        // Tagság hozzáadása az aktív céghez ha még nincs
        const { error: memberInsertErr } = await supabaseAdmin
          .from("company_members")
          .upsert(
            {
              company_id: targetCompanyId,
              user_id: targetUserId,
              role: memberRole,
              docs_szerepkor: docsRole,
            },
            { onConflict: "company_id,user_id" }
          )

        if (!memberInsertErr) {
          importedCount++
        }

        // Létező felhasználó esetén recovery link generálása és e-mail küldése
        try {
          const { data: recLinkData } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email,
            options: {
              redirectTo: redirectUrl,
            },
          })

          let actionLink = recLinkData?.properties?.action_link
          if (actionLink) {
            try {
              const parsed = new URL(actionLink)
              parsed.searchParams.set("redirect_to", redirectUrl)
              actionLink = parsed.toString()
            } catch {
              // fallback
            }
            if (actionLink.includes("localhost:3000") || actionLink.includes("localhost%3A3000")) {
              actionLink = actionLink
                .replaceAll("http://localhost:3000", appUrl)
                .replaceAll("http%3A%2F%2Flocalhost%3A3000", encodeURIComponent(appUrl))
                .replaceAll("localhost:3000", new URL(appUrl).host)
                .replaceAll("localhost%3A3000", encodeURIComponent(new URL(appUrl).host))
            }
            if (actionLink.includes("127.0.0.1:3000") || actionLink.includes("127.0.0.1%3A3000")) {
              actionLink = actionLink
                .replaceAll("http://127.0.0.1:3000", appUrl)
                .replaceAll("http%3A%2F%2F127.0.0.1%3A3000", encodeURIComponent(appUrl))
                .replaceAll("127.0.0.1:3000", new URL(appUrl).host)
                .replaceAll("127.0.0.1%3A3000", encodeURIComponent(new URL(appUrl).host))
            }

            const emailHtml = buildHtmlEmail(
              "Meghívás az eaisyDocs rendszerébe",
              `Kedves <strong>${name}</strong>!<br/><br/>Hozzáférést kaptál a(z) <strong>${company.name}</strong> iratkezelő munkaterületéhez az eaisyDocs rendszerben (<a href="${appUrl}">${appUrl}</a>). Az alábbi gombra kattintva beállíthatod a jelszavadat, és azonnal beléphetsz a rendszerbe.`,
              [
                { label: "Alkalmazás", value: appUrl },
                { label: "Munkaterület / Cég", value: company.name },
                { label: "Felhasználónév (E-mail)", value: email },
                { label: "Szerepkör", value: docsRole },
              ],
              "Meghívás elfogadása és jelszó beállítása",
              actionLink
            )

            await sendNotificationEmail({
              to: email,
              subject: `Meghívás az eaisyDocs rendszerébe – ${company.name}`,
              html: emailHtml,
              senderName: "eaisyDocs Rendszer",
            })
            invitedCount++
          }
        } catch (emailErr) {
          console.error(`[eaisyBill] Hiba az értesítő e-mail kiküldésekor (${email}):`, emailErr)
        }
      } else {
        // --- ÚJ FELHASZNÁLÓ: MEGHÍVÓ LINK GENERÁLÁSA & EMAIL KÜLDÉS ---
        const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
          type: "invite",
          email,
          options: {
            data: { name, source: "eaisybill_import" },
            redirectTo: redirectUrl,
          },
        })

        if (linkErr || !linkData?.user) {
          console.error(`[eaisyBill] Hiba a meghívó link generálásakor (${email}):`, linkErr?.message)
          continue
        }

        targetUserId = linkData.user.id

        // Profil létrehozása
        await supabaseAdmin
          .from("felhasznalo_profil")
          .upsert({
            id: targetUserId,
            nev: name,
            email,
            szerepkor: docsRole === "admin" ? "admin" : "ugyintezo",
            docs_szerepkor: docsRole,
            elerheto_modulok: ["docs"],
            eaisybill_user_id: item.eaisybillUserId || null,
            sync_source: "eaisybill",
            last_synced_at: new Date().toISOString(),
          })

        // Tagság hozzáadása az aktív céghez
        await supabaseAdmin
          .from("company_members")
          .upsert({
            company_id: targetCompanyId,
            user_id: targetUserId,
            role: memberRole,
            docs_szerepkor: docsRole,
          })

        importedCount++
        invitedCount++

        // Meghívó e-mail küldése a generált jelszóbeállító linkkel
        let actionLink = linkData.properties?.action_link
        if (actionLink) {
          try {
            const parsed = new URL(actionLink)
            parsed.searchParams.set("redirect_to", redirectUrl)
            actionLink = parsed.toString()
          } catch {
            // fallback
          }
          // Ha az actionLink véletlenül localhostra mutatna (pl. Supabase Auth Site URL miatt),
          // biztosítjuk az éles https://eaisydocs2.vercel.app domainre történő cserét
          if (actionLink.includes("localhost:3000") || actionLink.includes("localhost%3A3000")) {
            actionLink = actionLink
              .replaceAll("http://localhost:3000", appUrl)
              .replaceAll("http%3A%2F%2Flocalhost%3A3000", encodeURIComponent(appUrl))
              .replaceAll("localhost:3000", new URL(appUrl).host)
              .replaceAll("localhost%3A3000", encodeURIComponent(new URL(appUrl).host))
          }
          if (actionLink.includes("127.0.0.1:3000") || actionLink.includes("127.0.0.1%3A3000")) {
            actionLink = actionLink
              .replaceAll("http://127.0.0.1:3000", appUrl)
              .replaceAll("http%3A%2F%2F127.0.0.1%3A3000", encodeURIComponent(appUrl))
              .replaceAll("127.0.0.1:3000", new URL(appUrl).host)
              .replaceAll("127.0.0.1%3A3000", encodeURIComponent(new URL(appUrl).host))
          }

          try {
            const emailHtml = buildHtmlEmail(
              "Meghívás az eaisyDocs rendszerébe",
              `Kedves <strong>${name}</strong>!<br/><br/>Hozzáférést kaptál a(z) <strong>${company.name}</strong> iratkezelő munkaterületéhez az eaisyDocs rendszerben (<a href="${appUrl}">${appUrl}</a>). Az alábbi gombra kattintva beállíthatod a saját jelszavadat, és azonnal használatba veheted az alkalmazást.`,
              [
                { label: "Alkalmazás", value: appUrl },
                { label: "Munkaterület / Cég", value: company.name },
                { label: "Felhasználónév (E-mail)", value: email },
                { label: "Szerepkör", value: docsRole },
              ],
              "Meghívás elfogadása és jelszó beállítása",
              actionLink
            )

            await sendNotificationEmail({
              to: email,
              subject: `Meghívás az eaisyDocs rendszerébe – ${company.name}`,
              html: emailHtml,
              senderName: "eaisyDocs Rendszer",
            })
          } catch (emailErr) {
            console.error(`[eaisyBill] Hiba az értesítő e-mail kiküldésekor (${email}):`, emailErr)
          }
        }
      }
    }

    revalidatePath("/settings")
    return {
      success: true,
      importedCount,
      invitedCount,
    }
  } catch (err: any) {
    console.error("[eaisyBill] Tagok importálási hiba:", err)
    return { success: false, error: err.message || "Nem sikerült az eaisyBill tagok importálása." }
  }
}
