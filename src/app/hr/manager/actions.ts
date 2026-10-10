"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { getActiveCompanyIdServer } from "@/utils/company-server"

export async function approveLeaveRequest(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const activeCompanyId = await getActiveCompanyIdServer()
  if (activeCompanyId) {
    const { data: req } = await supabase
      .from("hr_tavollet")
      .select("company_id")
      .eq("id", id)
      .maybeSingle()

    if (req?.company_id && req.company_id !== activeCompanyId) {
      return { error: "A kérelem egy másik vállalathoz tartozik." }
    }
  }

  const { error } = await supabase
    .from("hr_tavollet")
    .update({ statusz: "jovahagyva", jovahagyo_id: user.id })
    .eq("id", id)

  if (error) {
    console.error("Approve leave error:", error)
    return { error: "Nem sikerült jóváhagyni a kérelmet." }
  }

  // Audit log is handled automatically by PostgreSQL triggers!
  revalidatePath("/hr", "layout")
  return { success: true }
}

export async function rejectLeaveRequest(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const activeCompanyId = await getActiveCompanyIdServer()
  if (activeCompanyId) {
    const { data: req } = await supabase
      .from("hr_tavollet")
      .select("company_id")
      .eq("id", id)
      .maybeSingle()

    if (req?.company_id && req.company_id !== activeCompanyId) {
      return { error: "A kérelem egy másik vállalathoz tartozik." }
    }
  }

  const { error } = await supabase
    .from("hr_tavollet")
    .update({ statusz: "elutasitva" })
    .eq("id", id)

  if (error) {
    console.error("Reject leave error:", error)
    return { error: "Nem sikerült elutasítani a kérelmet." }
  }

  revalidatePath("/hr", "layout")
  return { success: true }
}
