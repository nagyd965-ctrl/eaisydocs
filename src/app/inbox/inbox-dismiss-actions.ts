"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { getClientInfo } from "@/utils/client-info"
import { requireDocsAuthServer } from "@/utils/docs-auth-guard"

/**
 * Küldemény iktatásának mellőzése (Nem iktatandó)
 */
export async function dismissInboxItem(iratId: string, indoklas: string) {
  const supabase = await createClient()

  if (!indoklas || !indoklas.trim()) {
    return { error: "Kérjük, adjon meg egy rövid indoklást a nem iktatandó minősítéshez!" }
  }

  // Ellenőrizzük az iratot: létezik-e és nincs-e már ügyiratba iktatva
  const { data: irat, error: fetchError } = await supabase
    .from("irat")
    .select("id, erkeztetoszam, targy, ugyirat_id, statusz, leiras, company_id")
    .eq("id", iratId)
    .single()

  if (fetchError || !irat) {
    return { error: "Az érintett irat nem található az adatbázisban." }
  }

  const auth = await requireDocsAuthServer(
    ["admin", "rendszergazda", "iktato", "vezeto", "ugyintezo"],
    irat.company_id || null
  )
  if (!auth.authorized || !auth.user) {
    return { error: auth.error || "Nincs jogosultsága az irat elintézésére vagy státuszának módosítására!" }
  }
  const user = auth.user

  if (irat.ugyirat_id || irat.statusz === "iktatva") {
    return { error: "Ez az irat már iktatásra került egy ügyiratba, így nem jelölhető meg iktatás nélküliként!" }
  }

  const trimmedReason = indoklas.trim()
  const existingLeiras = (irat.leiras || "").trim()
  const mergedLeiras = existingLeiras
    ? `${existingLeiras}\n\n[Nem iktatandó indoklás]: ${trimmedReason}`
    : trimmedReason

  // Frissítjük az irat státuszát és megőrizzük a korábbi leírást az indoklással kiegészítve
  const { data: updatedRows, error: updateError } = await supabase
    .from("irat")
    .update({ 
      statusz: "nem_iktatando",
      leiras: mergedLeiras
    })
    .eq("id", iratId)
    .is("ugyirat_id", null)
    .select("id")

  if (updateError) {
    return { error: "Hiba az irat státuszának mentésekor: " + updateError.message }
  }
  if (!updatedRows || updatedRows.length === 0) {
    return { error: "Ez az irat közben már iktatásra került egy ügyiratba, így nem jelölhető meg iktatás nélküliként!" }
  }

  // Naplózás az esemeny_naplo-ba
  const { ip, userAgent } = await getClientInfo()
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "irat",
    entitas_id: iratId,
    user_id: user.id,
    company_id: irat.company_id || auth.activeCompanyId || null,
    esemeny_tipus: "elintezve",
    indoklas: `Nem iktatandó küldemény (nem képződik belőle ügyirat). Indoklás: ${trimmedReason}`,
    uj_ertek: { statusz: "nem_iktatando", indoklas: trimmedReason },
    ip_cim: ip,
    user_agent: userAgent,
  })

  revalidatePath("/inbox")
  return { success: true }
}

/**
 * Nem iktatandó küldemény visszaállítása a normál bejövő sorba
 */
export async function restoreInboxItem(iratId: string) {
  const supabase = await createClient()

  // Ellenőrizzük az iratot
  const { data: irat, error: fetchError } = await supabase
    .from("irat")
    .select("id, erkeztetoszam, statusz, ugyirat_id, company_id")
    .eq("id", iratId)
    .single()

  if (fetchError || !irat) {
    return { error: "Az érintett irat nem található." }
  }

  const auth = await requireDocsAuthServer(
    ["admin", "rendszergazda", "iktato", "vezeto", "ugyintezo"],
    irat.company_id || null
  )
  if (!auth.authorized || !auth.user) {
    return { error: auth.error || "Nincs jogosultsága az irat státuszának visszaállítására!" }
  }
  const user = auth.user

  if (irat.ugyirat_id) {
    return { error: "Ez az irat már iktatásra került egy ügyiratba!" }
  }

  // Visszaállítás feldolgozandó (erkeztetve) státuszba
  const { data: updatedRows, error: updateError } = await supabase
    .from("irat")
    .update({ 
      statusz: "erkeztetve" 
    })
    .eq("id", iratId)
    .is("ugyirat_id", null)
    .select("id")

  if (updateError) {
    return { error: "Hiba az irat visszaállításakor: " + updateError.message }
  }
  if (!updatedRows || updatedRows.length === 0) {
    return { error: "Ez az irat közben már iktatásra került egy ügyiratba!" }
  }

  // Naplózás az esemeny_naplo-ba
  const { ip, userAgent } = await getClientInfo()
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "irat",
    entitas_id: iratId,
    user_id: user.id,
    company_id: irat.company_id || auth.activeCompanyId || null,
    esemeny_tipus: "modositva",
    indoklas: "Nem iktatandó minősítés visszavonva. Visszaállítva a bejövő iktatandó sorba.",
    uj_ertek: { statusz: "erkeztetve" },
    ip_cim: ip,
    user_agent: userAgent,
  })

  revalidatePath("/inbox")
  return { success: true }
}
