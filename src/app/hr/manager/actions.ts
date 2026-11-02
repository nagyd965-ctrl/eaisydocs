"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { getActiveCompanyIdServer, getActiveCompanyMemberRolesServer } from "@/utils/company-server"
import { isUserAuthorizedForHrView } from "@/utils/hr/company-role-resolver"

export async function approveLeaveRequest(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const activeCompanyId = await getActiveCompanyIdServer()
  const scoped = await getActiveCompanyMemberRolesServer(activeCompanyId)

  // 1. Kérelem lekérése
  const { data: req } = await supabase
    .from("hr_tavollet")
    .select("company_id, dolgozo_id, aktualis_jovahagyo_id, kezdet_datuma, veg_datuma")
    .eq("id", id)
    .maybeSingle()

  if (!req) {
    return { error: "A kérelem nem található." }
  }

  if (activeCompanyId && req.company_id && req.company_id !== activeCompanyId) {
    return { error: "A kérelem egy másik vállalathoz tartozik." }
  }

  // 2. Szerepkör és jóváhagyói jogosultság ellenőrzése (cég-scoped modulkulcsokkal)
  const isHrOrAdmin =
    scoped.isCompanyAdmin ||
    isUserAuthorizedForHrView(scoped.hrRole, ["admin", "time", "payroll"], scoped.hrModules)

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
    .update({ statusz: "jovahagyva", jovahagyo_id: user.id, elutasitas_oka: null })
    .eq("id", id)

  if (error) {
    console.error("Approve leave error:", error)
    return { error: "Nem sikerült jóváhagyni a kérelmet." }
  }

  const { dispatchHrNotification } = await import("@/utils/hr-notification-dispatcher")
  await dispatchHrNotification({
    esemenyTipus: "tavollet_elbiralas",
    companyId: req.company_id || activeCompanyId,
    recipientUserIds: [req.dolgozo_id],
    title: "Szabadság kérelem jóváhagyva",
    message: `A(z) ${req.kezdet_datuma} – ${req.veg_datuma} időszakra benyújtott szabadság kérelmedet a vezetőd jóváhagyta.`,
    linkPath: "/hr/self-service/time",
    emailDetails: [
      { label: "Időszak", value: `${req.kezdet_datuma} – ${req.veg_datuma}` },
      { label: "Státusz", value: "Jóváhagyva" },
    ],
    emailCtaText: "Szabadságaim megtekintése",
  })

  // Audit log is handled automatically by PostgreSQL triggers!
  revalidatePath("/hr", "layout")
  return { success: true }
}

export async function rejectLeaveRequest(id: string, rejectReason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const activeCompanyId = await getActiveCompanyIdServer()

  // 1. Kérelem lekérése
  const { data: req } = await supabase
    .from("hr_tavollet")
    .select("company_id, dolgozo_id, aktualis_jovahagyo_id, kezdet_datuma, veg_datuma")
    .eq("id", id)
    .maybeSingle()

  if (!req) {
    return { error: "A kérelem nem található." }
  }

  if (activeCompanyId && req.company_id && req.company_id !== activeCompanyId) {
    return { error: "A kérelem egy másik vállalathoz tartozik." }
  }

  // 2. Szerepkör és jogosultság ellenőrzése (cég-scoped modulkulcsokkal)
  const scoped = await getActiveCompanyMemberRolesServer(activeCompanyId)
  const isHrOrAdmin =
    scoped.isCompanyAdmin ||
    isUserAuthorizedForHrView(scoped.hrRole, ["admin", "time", "payroll"], scoped.hrModules)

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

  const cleanedReason = rejectReason?.trim() || null

  const { error } = await supabase
    .from("hr_tavollet")
    .update({
      statusz: "elutasitva",
      jovahagyo_id: user.id,
      elutasitas_oka: cleanedReason,
    })
    .eq("id", id)

  if (error) {
    console.error("Reject leave error:", error)
    return { error: "Nem sikerült elutasítani a kérelmet." }
  }

  // Ha csúsztatásról van szó, a kapcsolt túlóra-igényléshez is átmásoljuk az elutasítás okát
  if (cleanedReason) {
    await supabase
      .from("hr_tulora_felhasznalás")
      .update({ elutasitas_oka: cleanedReason })
      .eq("tavollet_id", id)
  }

  const targetCompanyId = req.company_id || activeCompanyId
  if (cleanedReason) {
    await supabase.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      entitas_tipus: "hr_tavollet",
      entitas_id: id,
      esemeny_tipus: "tavollet_elutasitas",
      megjegyzes: `Szabadság kérelem (${req.kezdet_datuma} – ${req.veg_datuma}) elutasítva. Indoklás: ${cleanedReason}`,
      ...(targetCompanyId ? { company_id: targetCompanyId } : {})
    })
  }

  const { dispatchHrNotification } = await import("@/utils/hr-notification-dispatcher")
  await dispatchHrNotification({
    esemenyTipus: "tavollet_elbiralas",
    companyId: targetCompanyId,
    recipientUserIds: [req.dolgozo_id],
    title: "Szabadság kérelem elutasítva",
    message: `A(z) ${req.kezdet_datuma} – ${req.veg_datuma} időszakra benyújtott szabadság kérelmedet elutasították.${cleanedReason ? ` Indoklás: ${cleanedReason}` : ""}`,
    linkPath: "/hr/self-service/time",
    emailDetails: [
      { label: "Időszak", value: `${req.kezdet_datuma} – ${req.veg_datuma}` },
      { label: "Státusz", value: "Elutasítva" },
      ...(cleanedReason ? [{ label: "Indoklás", value: cleanedReason }] : []),
    ],
    emailCtaText: "Szabadságaim megtekintése",
  })

  revalidatePath("/hr", "layout")
  return { success: true }
}
