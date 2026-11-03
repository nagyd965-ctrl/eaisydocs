"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer } from "@/utils/company-server"

export async function forceExpireAllDossiers() {
  const supabase = await createClient()
  const activeCompanyId = await getActiveCompanyIdServer()
  if (!activeCompanyId) {
    return { error: "Nincs kiválasztott aktív cég." }
  }

  const { requireDocsAuthServer } = await import("@/utils/docs-auth-guard")
  const auth = await requireDocsAuthServer(["admin", "rendszergazda"], activeCompanyId)
  if (!auth.authorized || !auth.user) {
    return { error: auth.error || "Csak adminisztrátor vagy rendszergazda futtathatja ezt a műveletet." }
  }

  // Teszt célból az aktív cég minden irattári ügyirat megőrzési idejét lejárttá tesszük, státuszát irattárban-ra állítva
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  
  await supabase
    .from("ugyirat")
    .update({ 
      statusz: "irattarban",
      megorzesi_ido_vege: yesterday.toISOString().split('T')[0] 
    })
    .not("statusz", "in", '("selejtezheto","selejtezett")')
    .eq("company_id", activeCompanyId)

  revalidatePath("/archive")
  return { success: true }
}
