"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function acknowledgeDocument(documentId: string) {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("hr_ceges_dokumentum_nyugtazas")
    .insert([{
      dokumentum_id: documentId,
      dolgozo_id: user.id
    }])

  if (error) {
    console.error("Hiba a dokumentum nyugtázásakor:", error)
    if (error.code === '23505') { // Unique violation
       return { success: true } // Already acknowledged
    }
    return { error: error.message }
  }

  revalidatePath("/hr/self-service/dokumentumok")
  return { success: true }
}
