"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { getClientInfo } from "@/utils/client-info"

/**
 * Lekéri az adott ügyirathoz tartozó explicit hozzáféréseket
 */
export async function getDossierExplicitAccess(ugyiratId: string) {
  const supabase = await createClient()
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
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }
  if (!ugyiratId || !targetUserId) return { error: "Hiányzó azonosító." }

  // 1. Ellenőrizzük a kérő jogosultságát (Admin vagy a feladó osztály vezetője)
  const { data: actorProfile } = await supabase
    .from("felhasznalo_profil")
    .select("id, docs_szerepkor, szerepkor, szervezeti_egyseg_id, nev")
    .eq("id", user.id)
    .single()

  const actorRole = actorProfile?.docs_szerepkor || actorProfile?.szerepkor || "ugyintezo"
  const isPrivileged = ["admin", "rendszergazda"].includes(actorRole)

  const { data: ugyirat } = await supabase
    .from("ugyirat")
    .select("id, iktatoszam, szervezeti_egyseg_id")
    .eq("id", ugyiratId)
    .single()

  if (!ugyirat) return { error: "Ügyirat nem található." }

  const isLeaderInDept = actorRole === "vezeto" && ugyirat.szervezeti_egyseg_id === actorProfile?.szervezeti_egyseg_id

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

  // 4. Célszemély adatai az audit naplóhoz
  const { data: targetProfile } = await dbAdmin
    .from("felhasznalo_profil")
    .select("nev")
    .eq("id", targetUserId)
    .single()

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

  // 6. Értesítés a kedvezményezettnek
  await dbAdmin.from("alkalmazas_ertesites").insert({
    user_id: targetUserId,
    cim: `Új ügyirat hozzáférés: ${ugyirat.iktatoszam}`,
    szoveg: `${actorProfile?.nev || "Egy vezető"} explicit hozzáférést adott neked a(z) ${ugyirat.iktatoszam} számú ügyirathoz.`,
    link_url: `/dossiers/${ugyiratId}`,
    olvasott: false
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
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  const { data: actorProfile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor, szerepkor, szervezeti_egyseg_id, nev")
    .eq("id", user.id)
    .single()

  const actorRole = actorProfile?.docs_szerepkor || actorProfile?.szerepkor || "ugyintezo"
  const isPrivileged = ["admin", "rendszergazda"].includes(actorRole)

  const { data: ugyirat } = await supabase
    .from("ugyirat")
    .select("id, iktatoszam, szervezeti_egyseg_id")
    .eq("id", ugyiratId)
    .single()

  if (!ugyirat) return { error: "Ügyirat nem található." }

  const isLeaderInDept = actorRole === "vezeto" && ugyirat.szervezeti_egyseg_id === actorProfile?.szervezeti_egyseg_id

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
