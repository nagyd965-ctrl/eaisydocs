"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"

export async function getNotificationRules() {
  const auth = await requireHrAuthServer(["admin", "organization"], null)
  if (!auth.authorized) {
    return []
  }

  const supabase = await createClient()
  const activeCompanyId = auth.activeCompanyId || (await getActiveCompanyIdServer())

  let query = supabase
    .from("ertesitesi_szabaly")
    .select("*")
    .order("esemeny_tipus")

  if (activeCompanyId) {
    query = query.eq("company_id", activeCompanyId)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching notification rules:", error)
    return []
  }

  return data || []
}

export async function updateNotificationRule(id: string, aktiv: boolean, csatorna: string[]) {
  const auth = await requireHrAuthServer(["admin", "organization"], null)
  if (!auth.authorized) {
    return { error: "Nincs jogosultságod az értesítési szabályok módosításához." }
  }

  const supabase = await createClient()
  const activeCompanyId = auth.activeCompanyId || (await getActiveCompanyIdServer())
  if (!activeCompanyId) {
    return { error: "Nincs kiválasztott vállalat." }
  }

  const { error } = await supabase
    .from("ertesitesi_szabaly")
    .update({ aktiv, csatorna })
    .eq("id", id)
    .eq("company_id", activeCompanyId)

  if (error) {
    console.error("Error updating notification rule:", error)
    return { error: error.message }
  }

  revalidatePath("/hr/settings")
  revalidatePath("/settings")
  return { success: true }
}
