"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { getClientInfo } from "@/utils/client-info"
import { getPermissions } from "@/utils/permissions"

export async function dismissInboxItem(iratId: string, indoklas: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve." }
  }

  // Ellenőrizzük a felhasználó jogosultságát
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor")
    .eq("id", user.id)
    .single()

  const permissions = getPermissions(profile?.docs_szerepkor || "")
  if (!permissions.canEdit) {
    return { error: "Nincs jogosultsága az irat elintézésére vagy státuszának módosítására!" }
  }

  if (!indoklas || !indoklas.trim()) {
    return { error: "Kérjük, adjon meg egy rövid indoklást a nem iktatandó minősítéshez!" }
  }

  // Ellenőrizzük az iratot: létezik-e és nincs-e már ügyiratba iktatva
  const { data: irat, error: fetchError } = await supabase
    .from("irat")
    .select("id, erkeztetoszam, targy, ugyirat_id, statusz")
    .eq("id", iratId)
    .single()

  if (fetchError || !irat) {
    return { error: "Az érintett irat nem található az adatbázisban." }
  }

  if (irat.ugyirat_id || irat.statusz === "iktatva") {
    return { error: "Ez az irat már iktatásra került egy ügyiratba, így nem jelölhető meg iktatás nélküliként!" }
  }

  // Frissítjük az irat státuszát
  const { error: updateError } = await supabase
    .from("irat")
    .update({ statusz: "nem_iktatando" })
    .eq("id", iratId)

  if (updateError) {
    return { error: "Hiba az irat státuszának mentésekor: " + updateError.message }
  }

  // Naplózás az esemeny_naplo-ba
  const { ip, userAgent } = await getClientInfo()
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "irat",
    entitas_id: iratId,
    user_id: user.id,
    esemeny_tipus: "elintezve",
    indoklas: `Nem iktatandó küldemény (nem képződik belőle ügyirat). Indoklás: ${indoklas.trim()}`,
    uj_ertek: { statusz: "nem_iktatando" },
    ip_cim: ip,
    user_agent: userAgent,
  })

  revalidatePath("/inbox")
  return { success: true }
}
