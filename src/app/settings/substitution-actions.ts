"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

export async function createSubstitution(helyettesitoUserId: string, mettol: string, meddig: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const { error } = await supabase.from("helyettesites").insert({
    kilepo_user_id: user.id,
    helyettesito_user_id: helyettesitoUserId,
    mettol: new Date(mettol).toISOString(),
    meddig: new Date(meddig).toISOString(),
    aktiv: true
  })

  if (error) {
    console.error("Helyettesítés mentése hiba:", error)
    return { success: false, error: "Nem sikerült elmenteni a helyettesítést." }
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function deleteSubstitution(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const { error } = await supabase.from("helyettesites").delete().eq("id", id).eq("kilepo_user_id", user.id)

  if (error) {
    console.error("Helyettesítés törlése hiba:", error)
    return { success: false, error: "Nem sikerült törölni." }
  }

  revalidatePath("/settings")
  return { success: true }
}
