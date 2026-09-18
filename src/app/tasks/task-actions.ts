"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { getClientInfo } from "@/utils/client-info"

export async function updateTaskStatus(
  taskId: string, 
  newStatus: "nyitott" | "folyamatban" | "kesz" | "elutasitott",
  expectedCurrentStatus?: "nyitott" | "folyamatban" | "kesz" | "elutasitott"
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Nincs bejelentkezve." }
  }

  // 1. Feladat és meglévő állapot lekérése
  const { data: currentTask, error: fetchErr } = await supabase
    .from("feladat")
    .select("id, ugyirat_id, felelos_user_id, allapot")
    .eq("id", taskId)
    .single()

  if (fetchErr || !currentTask) {
    return { success: false, error: "A feladat nem található." }
  }

  // 2. Jogosultság ellenőrzése: Csak a feladat felelőse VAGY iktató / admin / vezető módosíthatja
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor")
    .eq("id", user.id)
    .single()

  const role = profile?.docs_szerepkor || "ugyintezo"
  const isPrivileged = ["admin", "iktato", "vezeto", "rendszergazda"].includes(role)
  const isAssignee = currentTask.felelos_user_id === user.id

  if (!isAssignee && !isPrivileged) {
    return { success: false, error: "Nincs jogosultságod a feladat állapotának módosításához (csak a felelős vagy vezető módosíthatja)." }
  }

  // 3. Optimistic concurrency check: ha a kliens által ismert állapot időközben eltért
  if (expectedCurrentStatus && currentTask.allapot !== expectedCurrentStatus) {
    return { 
      success: false, 
      error: `A feladat állapota időközben megváltozott egy másik munkatárs által (${currentTask.allapot}).` 
    }
  }
  
  const { error } = await supabase
    .from("feladat")
    .update({ allapot: newStatus, updated_at: new Date().toISOString() })
    .eq("id", taskId)

  if (error) {
    console.error("Hiba a feladat frissítésekor:", error)
    return { success: false, error: error.message }
  }

  const ugyiratId = currentTask.ugyirat_id

  // 4. Naplózás
  if (ugyiratId) {
    const { ip, userAgent } = await getClientInfo()
    await supabase.from("esemeny_naplo").insert({
      entitas_tipus: "ugyirat",
      entitas_id: ugyiratId,
      esemeny_tipus: "modositva",
      user_id: user.id,
      elozo_ertek: { allapot: currentTask.allapot },
      uj_ertek: { allapot: newStatus },
      indoklas: `Feladat állapota módosítva: ${currentTask.allapot} -> ${newStatus}`,
      ip_cim: ip,
      user_agent: userAgent
    })
  }

  // Revalidate dossier page too so task progress updates
  if (ugyiratId) {
    revalidatePath(`/dossiers/${ugyiratId}`)
  }

  revalidatePath("/tasks")
  return { success: true }
}

export async function createTask(ugyiratId: string, leiras: string, hatarido: string, felelosUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("feladat")
    .insert({
      ugyirat_id: ugyiratId,
      leiras: leiras,
      hatarido: hatarido,
      felelos_user_id: felelosUserId,
      allapot: "nyitott"
    })

  if (error) {
    console.error("Hiba a feladat létrehozásakor:", error)
    return { success: false, error: error.message }
  }

  // Naplózás
  const { ip, userAgent } = await getClientInfo()
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
    esemeny_tipus: "modositva",
    user_id: user.id,
    indoklas: `Új feladat kiírva: ${leiras}`,
    ip_cim: ip,
    user_agent: userAgent
  })

  // --- Értesítés a felelősnek ---
  {
    // Küldő neve
    const { data: senderProfile } = await supabase
      .from("felhasznalo_profil")
      .select("nev")
      .eq("id", user.id)
      .single()
    
    // Ügyirat iktatószáma
    const { data: ugyiratData } = await supabase
      .from("ugyirat")
      .select("iktatoszam")
      .eq("id", ugyiratId)
      .single()

    const senderName = senderProfile?.nev || "Valaki"
    const iktatoszam = ugyiratData?.iktatoszam || ""
    const hataridoFormatted = new Date(hatarido).toLocaleDateString("hu-HU")

    await supabase.from("alkalmazas_ertesites").insert({
      user_id: felelosUserId,
      cim: `Új feladat szignálva${iktatoszam ? ` (${iktatoszam})` : ""}`,
      szoveg: `${senderName} feladatot írt ki: ${leiras} — Határidő: ${hataridoFormatted}`,
      link_url: `/dossiers/${ugyiratId}?tab=feladatok`
    })
  }

  revalidatePath(`/dossiers/${ugyiratId}`)
  revalidatePath("/tasks")
  return { success: true }
}
