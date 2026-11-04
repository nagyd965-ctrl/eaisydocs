"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { requireHrAuthServer, checkHrWriteAccess } from "@/utils/hr/hr-auth-guard"

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function getNotificationRules() {
  const auth = await requireHrAuthServer(["admin", "settings", "organization"], null)
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
  const auth = await requireHrAuthServer(["admin", "settings", "organization"], null)
  if (!auth.authorized || !checkHrWriteAccess(auth, ["admin", "organization"])) {
    return { error: "Nincs jogosultságod az értesítési szabályok módosításához (Csak olvasási jogosultság)." }
  }

  const activeCompanyId = auth.activeCompanyId || (await getActiveCompanyIdServer())
  if (!activeCompanyId) {
    return { error: "Nincs kiválasztott vállalat." }
  }

  const { error } = await supabaseAdmin
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
