"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

export async function closeDossier(ugyiratId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve." }
  }

  // Lekérjük az ügyiratot és az irattári tervet
  const { data: ugyirat } = await supabase
    .from("ugyirat")
    .select("ugy_id, irattari_terv(megorzesi_ido_ev)")
    .eq("id", ugyiratId)
    .single()

  if (!ugyirat) return { error: "Ügyirat nem található." }

  const megorzesi_ev = (ugyirat.irattari_terv as any)?.megorzesi_ido_ev || 5 // default 5 ha nincs
  const endDate = new Date()
  endDate.setFullYear(endDate.getFullYear() + megorzesi_ev)
  const endDateStr = endDate.toISOString().split('T')[0] // Csak a dátum része

  // 1. Ügyirat frissítése
  const { error: ugyiratError } = await supabase
    .from("ugyirat")
    .update({ 
      statusz: "irattarban",
      megorzesi_ido_vege: endDateStr
    })
    .eq("id", ugyiratId)

  if (ugyiratError) return { error: "Hiba az ügyirat lezárásakor." }

  // 2. Ügy frissítése
  if (ugyirat.ugy_id) {
    await supabase
      .from("ugy")
      .update({
        statusz: "lezart",
        lezarva: new Date().toISOString()
      })
      .eq("id", ugyirat.ugy_id)
  }

  // 3. Eseménynapló
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
    esemeny_tipus: "lezarva",
    user_id: user.id,
    indoklas: "Ügyirat lezárva és irattározva."
  })
  
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
    esemeny_tipus: "irattarozva",
    user_id: user.id,
    uj_ertek: { megorzesi_ido_vege: endDateStr }
  })

  revalidatePath("/dossiers")
  revalidatePath(`/dossiers/${ugyiratId}`)
  revalidatePath("/archive")

  return { success: true }
}

export async function addPolymorphicLink(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  const ugyirat_id = formData.get("ugyirat_id") as string
  const irat_id = formData.get("irat_id") as string || null
  const entitas_tipus = formData.get("entitas_tipus") as string
  const entitas_forras = formData.get("entitas_forras") as string
  const entitas_id = formData.get("entitas_id") as string
  const kapcsolat_tipusa = formData.get("kapcsolat_tipusa") as string

  if (!ugyirat_id || !entitas_tipus || !entitas_forras || !entitas_id || !kapcsolat_tipusa) {
    return { error: "Minden kötelező mezőt ki kell tölteni!" }
  }

  const { error: insertError } = await supabase
    .from("irat_kapcsolat")
    .insert({
      ugyirat_id,
      irat_id,
      entitas_tipus,
      entitas_forras,
      entitas_id,
      kapcsolat_tipusa
    })

  if (insertError) {
    return { error: "Hiba történt a kapcsolat létrehozásakor: " + insertError.message }
  }

  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyirat_id,
    esemeny_tipus: "modositva",
    user_id: user.id,
    indoklas: `Új ${entitas_tipus} (${entitas_forras}: ${entitas_id}) kapcsolat hozzáadva.`
  })

  revalidatePath(`/dossiers/${ugyirat_id}`)
  return { success: true }
}

export async function deletePolymorphicLink(id: string, ugyirat_id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  const { error: deleteError } = await supabase
    .from("irat_kapcsolat")
    .delete()
    .eq("id", id)

  if (deleteError) {
    return { error: "Hiba történt a kapcsolat törlésekor." }
  }

  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyirat_id,
    esemeny_tipus: "modositva",
    user_id: user.id,
    indoklas: "Polimorf kapcsolat törölve."
  })

  revalidatePath(`/dossiers/${ugyirat_id}`)
  return { success: true }
}
