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

  // 1. Kérelem lekérése
  const { data: req } = await supabase
    .from("hr_tavollet")
    .select("company_id, dolgozo_id, aktualis_jovahagyo_id")
    .eq("id", id)
    .maybeSingle()

  if (!req) {
    return { error: "A kérelem nem található." }
  }

  if (activeCompanyId && req.company_id && req.company_id !== activeCompanyId) {
    return { error: "A kérelem egy másik vállalathoz tartozik." }
  }

  // 2. Szerepkör és jóváhagyói jogosultság ellenőrzése
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor, docs_szerepkor")
    .eq("id", user.id)
    .single()

  const isHrOrAdmin = ["admin", "hr_vezeto", "hr_munkatars"].includes(profile?.hr_szerepkor || "") ||
                      ["admin", "rendszergazda"].includes(profile?.docs_szerepkor || "")

  if (req.dolgozo_id === user.id && !isHrOrAdmin) {
    return { error: "Saját távolléti kérelmet nem hagyhatsz jóvá." }
  }

  const isAssignedApprover = req.aktualis_jovahagyo_id === user.id
  let isSubordinate = false
  if (!isAssignedApprover && !isHrOrAdmin) {
    const { data: subList } = await supabase.rpc("get_hr_subordinates", { p_manager_id: user.id })
    if (Array.isArray(subList) && subList.includes(req.dolgozo_id)) {
      isSubordinate = true
    }
  }

  if (!isAssignedApprover && !isHrOrAdmin && !isSubordinate) {
    return { error: "Nincs jogosultságod a kérelem jóváhagyására." }
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

  // 1. Kérelem lekérése
  const { data: req } = await supabase
    .from("hr_tavollet")
    .select("company_id, dolgozo_id, aktualis_jovahagyo_id")
    .eq("id", id)
    .maybeSingle()

  if (!req) {
    return { error: "A kérelem nem található." }
  }

  if (activeCompanyId && req.company_id && req.company_id !== activeCompanyId) {
    return { error: "A kérelem egy másik vállalathoz tartozik." }
  }

  // 2. Szerepkör és jogosultság ellenőrzése
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor, docs_szerepkor")
    .eq("id", user.id)
    .single()

  const isHrOrAdmin = ["admin", "hr_vezeto", "hr_munkatars"].includes(profile?.hr_szerepkor || "") ||
                      ["admin", "rendszergazda"].includes(profile?.docs_szerepkor || "")

  const isAssignedApprover = req.aktualis_jovahagyo_id === user.id
  let isSubordinate = false
  if (!isAssignedApprover && !isHrOrAdmin) {
    const { data: subList } = await supabase.rpc("get_hr_subordinates", { p_manager_id: user.id })
    if (Array.isArray(subList) && subList.includes(req.dolgozo_id)) {
      isSubordinate = true
    }
  }

  if (!isAssignedApprover && !isHrOrAdmin && !isSubordinate) {
    return { error: "Nincs jogosultságod a kérelem elutasítására." }
  }

  const { error } = await supabase
    .from("hr_tavollet")
    .update({ statusz: "elutasitva", jovahagyo_id: user.id })
    .eq("id", id)

  if (error) {
    console.error("Reject leave error:", error)
    return { error: "Nem sikerült elutasítani a kérelmet." }
  }

  revalidatePath("/hr", "layout")
  return { success: true }
}
