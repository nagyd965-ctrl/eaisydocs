"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { getClientInfo } from "@/utils/client-info"
import { requireDocsAuthServer } from "@/utils/docs-auth-guard"

/**
 * Lekéri az adott ügyirathoz tartozó explicit hozzáféréseket
 */
export async function getDossierExplicitAccess(ugyiratId: string) {
  const supabase = await createClient()

  const { data: ugyirat } = await supabase
    .from("ugyirat")
    .select("id, company_id, szervezeti_egyseg_id, ugy:ugy_id(felelos_user_id)")
    .eq("id", ugyiratId)
    .maybeSingle()

  if (!ugyirat) {
    return { error: "Ügyirat nem található.", data: [] }
  }

  const auth = await requireDocsAuthServer(undefined, ugyirat.company_id || null)
  if (!auth.authorized || !auth.user) {
    return { error: auth.error || "Nincs bejelentkezve", data: [] }
  }

  const user = auth.user
  const privilegedRole = ["admin", "rendszergazda", "iktato", "auditor"].includes(auth.docsRole || "")
  const inDept = Boolean(ugyirat.szervezeti_egyseg_id && ugyirat.szervezeti_egyseg_id === auth.szervezetiEgysegId)
  const isAssigned = (ugyirat.ugy as any)?.felelos_user_id === user.id

  if (!privilegedRole && !inDept && !isAssigned) {
    const { data: access } = await supabase
      .from("ugyirat_hozzaferes")
      .select("id")
      .eq("ugyirat_id", ugyiratId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (!access) {
      return { error: "Nincs jogosultságod az ügyirat hozzáférési listájának megtekintéséhez.", data: [] }
    }
  }

  const { data, error } = await supabase
    .from("ugyirat_hozzaferes")
    .select(`
      id,
      ugyirat_id,
      user_id,
      created_at,
      user:user_id (
        id,
        nev,
        docs_szerepkor,
        szerepkor,
        szervezeti_egyseg:szervezeti_egyseg_id ( nev )
      )
    `)
    .eq("ugyirat_id", ugyiratId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Hiba az explicit hozzáférések lekérésekor:", error)
    return { error: error.message, data: [] }
  }

  return { success: true, data: data || [] }
}

/**
 * Explicit hozzáférés megadása egy másik felhasználónak (osztályhatárokon átívelően)
 */
export async function grantDossierExplicitAccess(
  ugyiratId: string,
  targetUserId: string,
  indoklas?: string
) {
  const supabase = await createClient()
  if (!ugyiratId || !targetUserId) return { error: "Hiányzó azonosító." }

  const { data: ugyirat } = await supabase
    .from("ugyirat")
    .select("id, company_id, iktatoszam, szervezeti_egyseg_id")
    .eq("id", ugyiratId)
    .single()

  if (!ugyirat) return { error: "Ügyirat nem található." }

  const auth = await requireDocsAuthServer(undefined, ugyirat.company_id || null)
  if (!auth.authorized || !auth.user) return { error: auth.error || "Nincs bejelentkezve." }
  const user = auth.user

  const actorRole = auth.docsRole || "ugyintezo"
  const isPrivileged = ["admin", "rendszergazda"].includes(actorRole)
  const isLeaderInDept = actorRole === "vezeto" && ugyirat.szervezeti_egyseg_id === auth.szervezetiEgysegId
  const actorProfile = { nev: auth.nev }

  if (!isPrivileged && !isLeaderInDept) {
    return { error: "Kizárólag Rendszergazda, Adminisztrátor vagy az osztály vezetője oszthat meg ügyiratot!" }
  }

  // 2. Admin kliens a biztonságos beszúráshoz
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  let dbAdmin = supabase
  if (serviceRoleKey) {
    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
    dbAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }

  // 2b. Célszemély cég-tagságának és Docs modul-hozzáférésének ellenőrzése
  if (ugyirat.company_id) {
    const { data: targetMembership } = await dbAdmin
      .from("company_members")
      .select("user_id")
      .eq("company_id", ugyirat.company_id)
      .eq("user_id", targetUserId)
      .maybeSingle()

    if (!targetMembership) {
      return { error: "A kiválasztott munkatárs nem tagja az ügyirat vállalatának." }
    }
  }

  const { data: targetProfile } = await dbAdmin
    .from("felhasznalo_profil")
    .select("nev, elerheto_modulok")
    .eq("id", targetUserId)
    .single()

  const targetModules = Array.isArray((targetProfile as any)?.elerheto_modulok)
    ? (targetProfile as any).elerheto_modulok
    : ["docs", "hr"]
  if (!targetModules.includes("docs")) {
    return { error: "A kiválasztott munkatárs nem rendelkezik eaisyDocs modul-hozzáféréssel." }
  }

  // 3. Beszúrás ugyirat_hozzaferes táblába
  const { error: insertError } = await dbAdmin
    .from("ugyirat_hozzaferes")
    .upsert({
      ugyirat_id: ugyiratId,
      user_id: targetUserId,
      created_at: new Date().toISOString()
    }, { onConflict: "ugyirat_id,user_id" })

  if (insertError) {
    console.error("Hiba az explicit hozzáférés beszúrásakor:", insertError)
    return { error: "Nem sikerült menteni a hozzáférést: " + insertError.message }
  }

  const targetName = targetProfile?.nev || "Munkatárs"

  // 5. Eseménynapló rögzítés (Audit Trail)
  const { ip, userAgent } = await getClientInfo()
  await dbAdmin.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
    esemeny_tipus: "modositva",
    user_id: user.id,
    indoklas: indoklas 
      ? `Explicit hozzáférés engedélyezve (${targetName}): ${indoklas}` 
      : `Explicit hozzáférés engedélyezve a(z) ${targetName} nevű munkatársnak.`,
    ip_cim: ip,
    user_agent: userAgent
  })

  // 6. Értesítés a kedvezményezettnek (a vállalati értesítési szabály alapján)
  const { getActiveCompanyIdServer } = await import("@/utils/company-server")
  const activeCompanyId = await getActiveCompanyIdServer()
  const { dispatchDocsNotification } = await import("@/utils/docs-notification-dispatcher")
  await dispatchDocsNotification({
    esemenyTipus: "explicit_hozzaferes",
    kinek: "erintett",
    companyId: activeCompanyId,
    recipientUserIds: [targetUserId],
    inAppTitle: `Új ügyirat hozzáférés: ${ugyirat.iktatoszam}`,
    inAppBody: `${actorProfile?.nev || "Egy vezető"} explicit hozzáférést adott neked a(z) ${ugyirat.iktatoszam} számú ügyirathoz.`,
    linkPath: `/dossiers/${ugyiratId}`,
    emailSubject: `Új ügyirat hozzáférés: ${ugyirat.iktatoszam}`,
    emailHeading: "Explicit ügyirat-hozzáférést kaptál",
    emailIntroHtml: `<b>${actorProfile?.nev || "Egy vezető"}</b> egyedi hozzáférést biztosított számodra a(z) <b>${ugyirat.iktatoszam}</b> számú ügyirathoz.`,
    emailDetails: [
      { label: "Iktatószám", value: ugyirat.iktatoszam },
      ...(indoklas ? [{ label: "Indoklás", value: indoklas }] : []),
    ],
    emailCtaLabel: "Ügyirat megnyitása",
    smsBody: `eaisyDocs: Explicit hozzáférést kaptál a(z) ${ugyirat.iktatoszam} ügyirathoz.`,
    dossierId: ugyiratId,
    defaultChannels: ["in_app"],
  })

  revalidatePath(`/dossiers/${ugyiratId}`)
  revalidatePath("/dossiers")
  return { success: true }
}

/**
 * Explicit hozzáférés visszavonása
 */
export async function revokeDossierExplicitAccess(ugyiratId: string, targetUserId: string) {
  const supabase = await createClient()

  const { data: ugyirat } = await supabase
    .from("ugyirat")
    .select("id, company_id, iktatoszam, szervezeti_egyseg_id")
    .eq("id", ugyiratId)
    .single()

  if (!ugyirat) return { error: "Ügyirat nem található." }

  const auth = await requireDocsAuthServer(undefined, ugyirat.company_id || null)
  if (!auth.authorized || !auth.user) return { error: auth.error || "Nincs bejelentkezve." }
  const user = auth.user

  const actorRole = auth.docsRole || "ugyintezo"
  const isPrivileged = ["admin", "rendszergazda"].includes(actorRole)
  const isLeaderInDept = actorRole === "vezeto" && ugyirat.szervezeti_egyseg_id === auth.szervezetiEgysegId

  if (!isPrivileged && !isLeaderInDept) {
    return { error: "Nincs jogosultságod a hozzáférés visszavonásához!" }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  let dbAdmin = supabase
  if (serviceRoleKey) {
    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
    dbAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }

  const { error: deleteError } = await dbAdmin
    .from("ugyirat_hozzaferes")
    .delete()
    .eq("ugyirat_id", ugyiratId)
    .eq("user_id", targetUserId)

  if (deleteError) {
    return { error: "Hiba a hozzáférés törlésekor: " + deleteError.message }
  }

  const { ip, userAgent } = await getClientInfo()
  await dbAdmin.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
    esemeny_tipus: "modositva",
    user_id: user.id,
    indoklas: `Explicit hozzáférés visszavonva.`,
    ip_cim: ip,
    user_agent: userAgent
  })

  revalidatePath(`/dossiers/${ugyiratId}`)
  revalidatePath("/dossiers")
  return { success: true }
}
