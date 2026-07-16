"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

export async function assignDossier(formData: FormData) {
  const ugy_id = formData.get("ugy_id") as string
  const felelos_user_id = formData.get("felelos_user_id") as string
  const hatarido = formData.get("hatarido") as string
  const ugyirat_id = formData.get("ugyirat_id") as string

  if (!ugy_id) return { error: "Hiányzó ügy azonosító" }

  const supabase = await createClient()

  // 1. Update the ugy table
  const updateData: any = {}
  if (felelos_user_id) {
    updateData.felelos_user_id = felelos_user_id === "none" ? null : felelos_user_id
  }
  if (hatarido) {
    updateData.hatarido = hatarido
  } else if (hatarido === "") {
    updateData.hatarido = null
  }

  const { error: ugyError } = await supabase
    .from("ugy")
    .update(updateData)
    .eq("id", ugy_id)

  if (ugyError) {
    return { error: "Hiba a felelős beállításakor: " + ugyError.message }
  }

  // 2. Also update ugyirat statusz to szignalt if it's currently iktatva and a felelos was set
  if (felelos_user_id && felelos_user_id !== "none") {
    const { data: ugyirat } = await supabase.from("ugyirat").select("statusz").eq("id", ugyirat_id).single()
    if (ugyirat && ugyirat.statusz === "iktatva") {
      await supabase.from("ugyirat").update({ statusz: "szignalt" }).eq("id", ugyirat_id)
    }
  }

  // 3. Log event
  const { data: user } = await supabase.auth.getUser()
  if (user?.user) {
    let reszletek = `Felelős frissítve.`
    if (hatarido) reszletek += ` Határidő: ${hatarido}.`
    await supabase.from("esemeny_naplo").insert({
      irat_id: null,
      ugyirat_id: ugyirat_id,
      felhasznalo_id: user.user.id,
      esemeny_tipus: 'hozzaferes_modositas',
      reszletek: reszletek,
      ip_cim: '127.0.0.1'
    })
  }

  revalidatePath("/dossiers")
  revalidatePath(`/dossiers/${ugyirat_id}`)
  return { success: true }
}
