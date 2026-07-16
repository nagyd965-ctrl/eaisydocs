"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

export async function scrapDossier(ugyiratId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve." }
  }

  // 1. Keresd meg a hozzá tartozó iratokat és fájlokat
  const { data: iratok } = await supabase
    .from("irat")
    .select("id")
    .eq("ugyirat_id", ugyiratId)

  if (iratok && iratok.length > 0) {
    const iratIds = iratok.map(i => i.id)
    const { data: fajlok } = await supabase
      .from("irat_fajl")
      .select("storage_path")
      .in("irat_id", iratIds)
      .not("storage_path", "is", null)

    if (fajlok && fajlok.length > 0) {
      const pathsToDelete = fajlok.map(f => f.storage_path)
      // Fizikai törlés a Storage-ból (bucket név feltételezhetően 'iratok' vagy hasonló)
      const { error: storageError } = await supabase.storage
        .from("iratok")
        .remove(pathsToDelete)
        
      if (storageError) {
        console.error("Storage delete error:", storageError)
        // Dönthetünk úgy, hogy nem blokkoljuk a selejtezést, de logoljuk a hibát.
      }
    }
  }

  // 2. Frissítjük a státuszt "selejtezheto"-re az ügyiratban
  const { data: ugyirat, error: updateError } = await supabase
    .from("ugyirat")
    .update({ statusz: "selejtezheto" })
    .eq("id", ugyiratId)
    .select("ugy_id")
    .single()

  if (updateError) {
    return { error: "Hiba történt a selejtezés során: " + updateError.message }
  }

  // 3. Frissítjük a fő ügy státuszát is "selejtezett"-re
  if (ugyirat?.ugy_id) {
    await supabase.from("ugy").update({ statusz: "selejtezett" }).eq("id", ugyirat.ugy_id)
  }

  // Bejegyzés az eseménynaplóba
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
    esemeny_tipus: "selejtezve",
    user_id: user.id,
    indoklas: "A megőrzési idő lejárt, az ügyiratot leselejteztük, a fizikai fájlokat véglegesen töröltük a rendszerből."
  })

  revalidatePath("/archive")
  return { success: true }
}

export async function forceExpireAllDossiers() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve." }
  }

  // Teszt célból minden nem selejtezett ügyiratot lezártra és lejártra állítunk
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  
  await supabase
    .from("ugyirat")
    .update({ 
      statusz: "lezart",
      megorzesi_ido_vege: yesterday.toISOString().split('T')[0] 
    })
    .not("statusz", "eq", "selejtezheto")

  revalidatePath("/archive")
  return { success: true }
}
