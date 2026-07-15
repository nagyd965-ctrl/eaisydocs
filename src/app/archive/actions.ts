"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

export async function scrapDossier(ugyiratId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve." }
  }

  // Frissítjük a státuszt "selejtezheto"-re
  const { error: updateError } = await supabase
    .from("ugyirat")
    .update({ statusz: "selejtezheto" })
    .eq("id", ugyiratId)

  if (updateError) {
    return { error: "Hiba történt a selejtezés során: " + updateError.message }
  }

  // Bejegyzés az eseménynaplóba
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
    esemeny_tipus: "selejtezve",
    user_id: user.id,
    indoklas: "A megőrzési idő lejárt, az ügyirat selejtezési listára került (selejtezhető)."
  })

  revalidatePath("/archive")
  return { success: true }
}
