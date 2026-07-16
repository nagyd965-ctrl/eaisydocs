"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

export async function savePartner(formData: FormData) {
  const supabase = await createClient()
  
  const id = formData.get("id")?.toString()
  const nev = formData.get("nev")?.toString()
  const adoszam = formData.get("adoszam")?.toString()
  const cegjegyzekszam = formData.get("cegjegyzekszam")?.toString()

  if (!nev) {
    return { error: "A név megadása kötelező." }
  }

  if (id) {
    // Update
    const { error } = await supabase
      .from("partner")
      .update({ adoszam, cegjegyzekszam, nev })
      .eq("id", id)
      
    if (error) return { error: error.message }
  } else {
    // Insert
    const { error } = await supabase
      .from("partner")
      .insert({ nev, adoszam, cegjegyzekszam })
      
    if (error) return { error: error.message }
  }

  revalidatePath("/partners")
  if (id) {
    revalidatePath(`/partners/${id}`)
  }
  
  return { success: true }
}
