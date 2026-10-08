"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer } from "@/utils/company-server"

export async function forceExpireAllDossiers() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve." }
  }

  const activeCompanyId = await getActiveCompanyIdServer()

  // Teszt célból az aktív cég minden irattári ügyirat megőrzési idejét lejárttá tesszük, státuszát irattárban-ra állítva
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  
  let updateQuery = supabase
    .from("ugyirat")
    .update({ 
      statusz: "irattarban",
      megorzesi_ido_vege: yesterday.toISOString().split('T')[0] 
    })
    .not("statusz", "in", '("selejtezheto","selejtezett")')

  if (activeCompanyId) {
    updateQuery = updateQuery.eq("company_id", activeCompanyId)
  }

  await updateQuery

  revalidatePath("/archive")
  return { success: true }
}
