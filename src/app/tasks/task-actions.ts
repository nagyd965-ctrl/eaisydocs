"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { getClientInfo } from "@/utils/client-info"

export async function updateTaskStatus(taskId: string, newStatus: "nyitott" | "folyamatban" | "kesz" | "elutasitott") {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from("feladat")
    .update({ allapot: newStatus, updated_at: new Date().toISOString() })
    .eq("id", taskId)

  if (error) {
    console.error("Hiba a feladat frissítésekor:", error)
    return { success: false, error: error.message }
  }

  // Naplózás
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: feladatData } = await supabase.from("feladat").select("ugyirat_id").eq("id", taskId).single()
    if (feladatData?.ugyirat_id) {
        const { ip, userAgent } = await getClientInfo()
        await supabase.from("esemeny_naplo").insert({
          entitas_tipus: "ugyirat",
          entitas_id: feladatData.ugyirat_id,
          esemeny_tipus: "modositva",
          user_id: user.id,
          indoklas: `Feladat állapota módosítva: ${newStatus}`,
          ip_cim: ip,
          user_agent: userAgent
        })
    }
  }

  // Revalidate dossier page too so task progress updates
  if (user) {
    const { data: feladatForPath } = await supabase.from("feladat").select("ugyirat_id").eq("id", taskId).single()
    if (feladatForPath?.ugyirat_id) {
      revalidatePath(`/dossiers/${feladatForPath.ugyirat_id}`)
    }
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
