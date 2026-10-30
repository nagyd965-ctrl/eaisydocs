"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { getClientInfo } from "@/utils/client-info"
import { TaskStatus, TaskPriority, TaskCategory, TaskTemplate } from "@/types/tasks"
import { DEFAULT_TASK_TEMPLATES } from "@/utils/task-templates"

export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  expectedCurrentStatus?: TaskStatus,
  indoklas?: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Nincs bejelentkezve." }
  }

  // 0. Ha az elem egy szignált ügyirat (ugyirat_{id})
  if (taskId.startsWith("ugyirat_")) {
    const ugyiratId = taskId.replace("ugyirat_", "")

    // 1. Ügyirat és meglévő állapot lekérése
    const { data: currentUgyirat, error: fetchErr } = await supabase
      .from("ugyirat")
      .select("id, statusz, ugy_id, iktatoszam, ugy!inner ( id, statusz, felelos_user_id, targy )")
      .eq("id", ugyiratId)
      .single()

    if (fetchErr || !currentUgyirat) {
      return { success: false, error: "Az ügyirat nem található." }
    }

    const ugy = currentUgyirat.ugy as any
    const isAssignee = ugy?.felelos_user_id === user.id

    // 2. Jogosultság ellenőrzése
    const { data: profile } = await supabase
      .from("felhasznalo_profil")
      .select("docs_szerepkor")
      .eq("id", user.id)
      .single()

    const role = profile?.docs_szerepkor || "ugyintezo"
    const isPrivileged = ["admin", "iktato", "vezeto", "rendszergazda"].includes(role)

    let isSubstitute = false
    if (!isAssignee && !isPrivileged && ugy?.felelos_user_id) {
      const { data: sub } = await supabase
        .from("helyettesites")
        .select("id")
        .eq("kilepo_user_id", ugy.felelos_user_id)
        .eq("helyettesito_user_id", user.id)
        .eq("aktiv", true)
        .lte("mettol", new Date().toISOString())
        .gte("meddig", new Date().toISOString())
        .maybeSingle()
      if (sub) {
        isSubstitute = true
      }
    }

    if (!isAssignee && !isPrivileged && !isSubstitute) {
      return {
        success: false,
        error:
          "Nincs jogosultságod az ügyirat állapotának módosításához (csak a felelős, a helyettes vagy a vezető módosíthatja).",
      }
    }

    // 3. Ha elutasítás történik, az indoklás kötelező
    if (newStatus === "elutasitott" && (!indoklas || !indoklas.trim())) {
      return {
        success: false,
        error: "Elutasítás esetén a szöveges indoklás megadása kötelező.",
      }
    }

    // 4. Befejezés (Kész) ellenőrzése: ne lehessen lezárni, ha vannak befejezetlen feladatok
    if (newStatus === "kesz") {
      const { data: tasks } = await supabase
        .from("feladat")
        .select("id, allapot")
        .eq("ugyirat_id", ugyiratId)

      if (tasks && tasks.length > 0) {
        const rejectedCount = tasks.filter((t) => t.allapot === "elutasitott").length
        if (rejectedCount > 0) {
          return {
            success: false,
            error: `Az ügyirat nem zárható le: ${rejectedCount} db elutasított feladat található benne. Kérjük vizsgálja felül a feladatokat.`,
          }
        }
        const unfinishedCount = tasks.filter((t) => t.allapot !== "kesz").length
        if (unfinishedCount > 0) {
          return {
            success: false,
            error: `Az ügyirat nem zárható le: még ${unfinishedCount} db befejezetlen feladat van folyamatban.`,
          }
        }
      }
    }

    // 5. Cél státusz meghatározása
    let targetUgyiratStatusz = "iktatva"
    let targetUgyStatusz = ugy?.statusz || "folyamatban"

    if (newStatus === "nyitott") {
      targetUgyiratStatusz = "iktatva"
      targetUgyStatusz = "folyamatban"
    } else if (newStatus === "folyamatban") {
      targetUgyiratStatusz = "ugyintezes_alatt"
      targetUgyStatusz = "folyamatban"
    } else if (newStatus === "kesz") {
      targetUgyiratStatusz = "elintezett"
      targetUgyStatusz = "lezart"
    } else if (newStatus === "elutasitott") {
      targetUgyiratStatusz = "elutasitott"
    }

    const { error: ugyiratUpdateErr } = await supabase
      .from("ugyirat")
      .update({ statusz: targetUgyiratStatusz })
      .eq("id", ugyiratId)

    if (ugyiratUpdateErr) {
      console.error("Hiba az ügyirat státusz frissítésekor:", ugyiratUpdateErr)
      return { success: false, error: ugyiratUpdateErr.message }
    }

    if (ugy?.id && (newStatus === "kesz" || newStatus === "folyamatban" || newStatus === "nyitott")) {
      const ugyUpdatePayload: Record<string, any> = { statusz: targetUgyStatusz }
      if (newStatus === "kesz") {
        ugyUpdatePayload.lezarva = new Date().toISOString()
      } else {
        ugyUpdatePayload.lezarva = null
      }
      await supabase
        .from("ugy")
        .update(ugyUpdatePayload)
        .eq("id", ugy.id)
    }

    // 6. Audit naplózás
    const { ip, userAgent } = await getClientInfo()
    await supabase.from("esemeny_naplo").insert({
      entitas_tipus: "ugyirat",
      entitas_id: ugyiratId,
      esemeny_tipus: "modositva",
      user_id: user.id,
      elozo_ertek: { statusz: currentUgyirat.statusz },
      uj_ertek: { statusz: targetUgyiratStatusz, allapot: newStatus, indoklas: indoklas || null },
      indoklas: indoklas
        ? `Ügyirat állapota módosítva: ${currentUgyirat.statusz} -> ${targetUgyiratStatusz}. Indoklás: ${indoklas}`
        : `Ügyirat állapota módosítva: ${currentUgyirat.statusz} -> ${targetUgyiratStatusz}`,
      ip_cim: ip,
      user_agent: userAgent,
    })

    revalidatePath(`/dossiers/${ugyiratId}`)
    revalidatePath("/tasks")
    revalidatePath("/dossiers")
    revalidatePath("/")
    return { success: true }
  }

  // 1. Feladat és meglévő állapot lekérése
  const { data: currentTask, error: fetchErr } = await supabase
    .from("feladat")
    .select("id, ugyirat_id, felelos_user_id, allapot, leiras")
    .eq("id", taskId)
    .single()

  if (fetchErr || !currentTask) {
    return { success: false, error: "A feladat nem található." }
  }

  // 2. Jogosultság ellenőrzése: Csak a feladat felelőse VAGY iktató / admin / vezető módosíthatja
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor")
    .eq("id", user.id)
    .single()

  const role = profile?.docs_szerepkor || "ugyintezo"
  const isPrivileged = ["admin", "iktato", "vezeto", "rendszergazda"].includes(role)
  const isAssignee = currentTask.felelos_user_id === user.id

  let isSubstitute = false
  if (!isAssignee && !isPrivileged && currentTask.felelos_user_id) {
    const { data: sub } = await supabase
      .from("helyettesites")
      .select("id")
      .eq("kilepo_user_id", currentTask.felelos_user_id)
      .eq("helyettesito_user_id", user.id)
      .eq("aktiv", true)
      .lte("mettol", new Date().toISOString())
      .gte("meddig", new Date().toISOString())
      .maybeSingle()
    if (sub) {
      isSubstitute = true
    }
  }

  if (!isAssignee && !isPrivileged && !isSubstitute) {
    return {
      success: false,
      error:
        "Nincs jogosultságod a feladat állapotának módosításához (csak a felelős, a helyettes vagy a vezető módosíthatja).",
    }
  }

  // 3. Optimistic concurrency check: ha a kliens által ismert állapot időközben eltért
  if (expectedCurrentStatus && currentTask.allapot !== expectedCurrentStatus) {
    return {
      success: false,
      error: `A feladat állapota időközben megváltozott egy másik munkatárs által (${currentTask.allapot}).`,
    }
  }

  // 4. Ha elutasítás történik, az indoklás kötelező
  if (newStatus === "elutasitott" && (!indoklas || !indoklas.trim())) {
    return {
      success: false,
      error: "Elutasítás vagy lezárás esetén a szöveges indoklás megadása kötelező.",
    }
  }

  // 5. Frissítés megkísérlése indoklás oszloppal, vagy fallback ha az oszlop még hiányzik
  const updatePayload: Record<string, any> = {
    allapot: newStatus,
    updated_at: new Date().toISOString(),
  }
  if (indoklas) {
    updatePayload.indoklas = indoklas.trim()
  } else if (newStatus === "nyitott" || newStatus === "folyamatban") {
    // Ha újranyitják, az elutasítási indoklás törölhető
    updatePayload.indoklas = null
  }

  const { error: updateError } = await supabase
    .from("feladat")
    .update(updatePayload)
    .eq("id", taskId)

  if (updateError) {
    // Ha az indoklas oszlop még hiányzik a táblából (Postgres 42703), próbáljuk indoklás oszlop nélkül
    if (updateError.code === "42703" || updateError.message?.includes("indoklas")) {
      const fallbackPayload: Record<string, any> = {
        allapot: newStatus,
        updated_at: new Date().toISOString(),
      }
      const { error: fallbackErr } = await supabase
        .from("feladat")
        .update(fallbackPayload)
        .eq("id", taskId)

      if (fallbackErr) {
        console.error("Hiba a feladat frissítésekor (fallback):", fallbackErr)
        return { success: false, error: fallbackErr.message }
      }
    } else {
      console.error("Hiba a feladat frissítésekor:", updateError)
      return { success: false, error: updateError.message }
    }
  }

  const ugyiratId = currentTask.ugyirat_id

  // 6. Audit naplózás
  if (ugyiratId) {
    const { ip, userAgent } = await getClientInfo()
    await supabase.from("esemeny_naplo").insert({
      entitas_tipus: "ugyirat",
      entitas_id: ugyiratId,
      esemeny_tipus: "modositva",
      user_id: user.id,
      elozo_ertek: { allapot: currentTask.allapot },
      uj_ertek: { allapot: newStatus, indoklas: indoklas || null },
      indoklas: indoklas
        ? `Feladat állapota módosítva: ${currentTask.allapot} -> ${newStatus}. Indoklás: ${indoklas}`
        : `Feladat állapota módosítva: ${currentTask.allapot} -> ${newStatus}`,
      ip_cim: ip,
      user_agent: userAgent,
    })
  }

  // Revalidate érintett oldalak
  if (ugyiratId) {
    revalidatePath(`/dossiers/${ugyiratId}`)
  }
  revalidatePath("/tasks")
  revalidatePath("/")
  return { success: true }
}

export async function rejectTask(taskId: string, indoklas: string) {
  if (!indoklas || !indoklas.trim()) {
    return { success: false, error: "Kérlek add meg az elutasítás vagy lezárás indokát!" }
  }
  return updateTaskStatus(taskId, "elutasitott", undefined, indoklas)
}

export async function deleteTask(taskId: string) {
  if (taskId.startsWith("ugyirat_")) {
    return { success: false, error: "Iktatott ügyirat nem törölhető a feladatok nézetből." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve." }

  const { data: currentTask } = await supabase
    .from("feladat")
    .select("id, ugyirat_id, felelos_user_id, leiras")
    .eq("id", taskId)
    .single()

  if (!currentTask) return { success: false, error: "A feladat nem található." }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor")
    .eq("id", user.id)
    .single()

  const role = profile?.docs_szerepkor || "ugyintezo"
  const isPrivileged = ["admin", "iktato", "vezeto", "rendszergazda", "ugyintezo"].includes(role)
  const isAssignee = currentTask.felelos_user_id === user.id

  if (!isAssignee && !isPrivileged) {
    return { success: false, error: "Nincs jogosultságod a feladat törléséhez." }
  }

  const { error } = await supabase.from("feladat").delete().eq("id", taskId)
  if (error) {
    return { success: false, error: error.message }
  }

  if (currentTask.ugyirat_id) {
    const { ip, userAgent } = await getClientInfo()
    await supabase.from("esemeny_naplo").insert({
      entitas_tipus: "ugyirat",
      entitas_id: currentTask.ugyirat_id,
      esemeny_tipus: "modositva",
      user_id: user.id,
      indoklas: `Feladat törölve: ${currentTask.leiras}`,
      ip_cim: ip,
      user_agent: userAgent,
    })
    revalidatePath(`/dossiers/${currentTask.ugyirat_id}`)
  }

  revalidatePath("/tasks")
  return { success: true }
}

export interface CreateTaskParams {
  ugyiratId?: string | null
  leiras: string
  hatarido: string
  felelos?: string
  felelosUserId?: string
  kategoria?: TaskCategory
  prioritas?: TaskPriority
  reszletek?: string
  jegyzet?: string
}

export async function createTask(
  paramsOrUgyiratId: string | CreateTaskParams,
  leirasArg?: string,
  hataridoArg?: string,
  felelosUserIdArg?: string,
  kategoriaArg: TaskCategory = "egyeb",
  prioritasArg: TaskPriority = "normal",
  reszletekArg?: string
) {
  let ugyiratId: string | null = null
  let cleanTitle = ""
  let hatarido = ""
  let felelosUserId = ""
  let kategoria: TaskCategory = "egyeb"
  let prioritas: TaskPriority = "normal"
  let reszletek: string | undefined = undefined

  if (typeof paramsOrUgyiratId === "object" && paramsOrUgyiratId !== null) {
    ugyiratId = paramsOrUgyiratId.ugyiratId || null
    cleanTitle = (paramsOrUgyiratId.leiras || "").trim()
    hatarido = paramsOrUgyiratId.hatarido
    felelosUserId = paramsOrUgyiratId.felelosUserId || paramsOrUgyiratId.felelos || ""
    kategoria = paramsOrUgyiratId.kategoria || "egyeb"
    prioritas = paramsOrUgyiratId.prioritas || "normal"
    reszletek = paramsOrUgyiratId.reszletek || paramsOrUgyiratId.jegyzet || undefined
  } else {
    ugyiratId = paramsOrUgyiratId || null
    cleanTitle = (leirasArg || "").trim()
    hatarido = hataridoArg || ""
    felelosUserId = felelosUserIdArg || ""
    kategoria = kategoriaArg
    prioritas = prioritasArg
    reszletek = reszletekArg
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  if (!cleanTitle) return { success: false, error: "A feladat megnevezése kötelező!" }

  const activeCompanyId = await getActiveCompanyIdServer()

  // 1. Első kísérlet natív metaadat oszlopokkal
  const primaryPayload: Record<string, any> = {
    ugyirat_id: ugyiratId || null,
    leiras: cleanTitle,
    hatarido: hatarido,
    felelos_user_id: felelosUserId,
    allapot: "nyitott",
    kategoria: kategoria,
    prioritas: prioritas,
    reszletek: reszletek?.trim() || null,
  }
  if (activeCompanyId) {
    primaryPayload.company_id = activeCompanyId
  }

  let insertError = null
  const { data: inserted, error: primaryErr } = await supabase
    .from("feladat")
    .insert(primaryPayload)
    .select("id")
    .single()

  if (primaryErr) {
    // Ha az oszlopok még nem léteznek (Postgres 42703), fallback szabványos mezőkkel + meta címkével
    if (primaryErr.code === "42703" || primaryErr.message?.includes("kategoria")) {
      const fallbackTitle = `[${kategoria} | ${prioritas}] ${cleanTitle}${
        reszletek ? `\n${reszletek.trim()}` : ""
      }`
      const fallbackPayload: Record<string, any> = {
        ugyirat_id: ugyiratId || null,
        leiras: fallbackTitle,
        hatarido: hatarido,
        felelos_user_id: felelosUserId,
        allapot: "nyitott",
      }
      if (activeCompanyId) {
        fallbackPayload.company_id = activeCompanyId
      }
      const { error: fallbackErr } = await supabase.from("feladat").insert(fallbackPayload)
      if (fallbackErr) insertError = fallbackErr
    } else {
      insertError = primaryErr
    }
  }

  if (insertError) {
    console.error("Hiba a feladat létrehozásakor:", insertError)
    return { success: false, error: insertError.message }
  }

  // 2. Naplózás
  if (ugyiratId) {
    const { ip, userAgent } = await getClientInfo()
    await supabase.from("esemeny_naplo").insert({
      entitas_tipus: "ugyirat",
      entitas_id: ugyiratId,
      esemeny_tipus: "modositva",
      user_id: user.id,
      indoklas: `Új feladat kiírva: ${cleanTitle} (Prioritás: ${prioritas}, Kategória: ${kategoria})`,
      ip_cim: ip,
      user_agent: userAgent,
    })

    // 3. Értesítés a felelősnek
    const { data: senderProfile } = await supabase
      .from("felhasznalo_profil")
      .select("nev")
      .eq("id", user.id)
      .single()

    const { data: ugyiratData } = await supabase
      .from("ugyirat")
      .select("iktatoszam")
      .eq("id", ugyiratId)
      .single()

    const senderName = senderProfile?.nev || "Munkatárs"
    const iktatoszam = ugyiratData?.iktatoszam || ""
    const hataridoFormatted = new Date(hatarido).toLocaleDateString("hu-HU")

    await supabase.from("alkalmazas_ertesites").insert({
      user_id: felelosUserId,
      cim: `Új feladat szignálva${iktatoszam ? ` (${iktatoszam})` : ""}`,
      szoveg: `${senderName} feladatot írt ki: ${cleanTitle} — Határidő: ${hataridoFormatted}`,
      link_url: `/dossiers/${ugyiratId}?tab=feladatok`,
    })

    revalidatePath(`/dossiers/${ugyiratId}`)
  }

  revalidatePath("/tasks")
  return { success: true }
}

// ====================================================================
// FELADATSABLONOK (TEMPLATES) KEZELÉSE
// ====================================================================

/**
 * Cég-specifikus kulcs a feladatsablonok tárolásához (multi-tenant).
 */
async function getTaskTemplateKey(): Promise<string> {
  const { getActiveCompanyIdServer } = await import("@/utils/company-server")
  const companyId = await getActiveCompanyIdServer()
  return companyId ? `feladat_sablonok:${companyId}` : "feladat_sablonok"
}
export async function getTaskTemplates(): Promise<{
  success: boolean
  templates: TaskTemplate[]
}> {
  const supabase = await createClient()

  // Cég-specifikus kulcs (multi-tenant)
  const { getActiveCompanyIdServer } = await import("@/utils/company-server")
  const activeCompanyId = await getActiveCompanyIdServer()
  const key = await getTaskTemplateKey()

  const { data: settingRow } = await supabase
    .from("rendszer_beallitas")
    .select("ertek")
    .eq("kulcs", key)
    .maybeSingle()

  // Ha még nincs elmentve semmi, inicializáljuk a DEFAULT sablonokkal
  if (!settingRow || !Array.isArray(settingRow.ertek) || settingRow.ertek.length === 0) {
    await supabase
      .from("rendszer_beallitas")
      .upsert({
        kulcs: key,
        ertek: DEFAULT_TASK_TEMPLATES,
        leiras: "Feladatsablonok a feladatkatalógushoz (cég-specifikus).",
        updated_at: new Date().toISOString(),
      })
    return { success: true, templates: DEFAULT_TASK_TEMPLATES }
  }

  return { success: true, templates: settingRow.ertek }
}

export async function createCustomTaskTemplate(templateData: {
  cim: string
  kategoria: TaskCategory
  leiras?: string
  alapertelmezett_hatarido_nap: number
  prioritas: TaskPriority
  isCustom?: boolean
}): Promise<{ success: boolean; template?: TaskTemplate; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Nincs bejelentkezve." }

  const newTemplate: TaskTemplate = {
    id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    cim: templateData.cim.trim(),
    kategoria: templateData.kategoria,
    leiras: templateData.leiras?.trim() || undefined,
    alapertelmezett_hatarido_nap: Math.max(1, templateData.alapertelmezett_hatarido_nap || 3),
    prioritas: templateData.prioritas || "normal",
    isCustom: true,
    created_by: user.id,
    created_at: new Date().toISOString(),
  }

  const templateKey = await getTaskTemplateKey()

  const { data: settingRow } = await supabase
    .from("rendszer_beallitas")
    .select("ertek")
    .eq("kulcs", templateKey)
    .maybeSingle()

  const existing: TaskTemplate[] =
    Array.isArray(settingRow?.ertek) && settingRow.ertek.length > 0
      ? settingRow.ertek
      : [...DEFAULT_TASK_TEMPLATES]

  const updated = [newTemplate, ...existing]

  const { error } = await supabase
    .from("rendszer_beallitas")
    .upsert({
      kulcs: templateKey,
      ertek: updated,
      leiras: "Feladatsablonok a feladatkatalógushoz.",
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })

  if (error) {
    console.error("Hiba az egyéni sablon mentésekor:", error)
    return { success: false, error: error.message }
  }

  return { success: true, template: newTemplate }
}

export async function deleteCustomTaskTemplate(templateId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Nincs bejelentkezve." }

  const templateKey = await getTaskTemplateKey()

  const { data: settingRow } = await supabase
    .from("rendszer_beallitas")
    .select("ertek")
    .eq("kulcs", templateKey)
    .maybeSingle()

  const existing: TaskTemplate[] =
    Array.isArray(settingRow?.ertek) && settingRow.ertek.length > 0
      ? settingRow.ertek
      : [...DEFAULT_TASK_TEMPLATES]

  const filtered = existing.filter((t) => t.id !== templateId)

  const { error } = await supabase
    .from("rendszer_beallitas")
    .upsert({
      kulcs: templateKey,
      ertek: filtered,
      leiras: "Feladatsablonok a feladatkatalógushoz.",
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function updateCustomTaskTemplate(
  templateId: string,
  updates: Partial<TaskTemplate>
): Promise<{ success: boolean; error?: string; template?: TaskTemplate }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: "Nincs bejelentkezve." }

  const templateKey = await getTaskTemplateKey()

  const { data: settingRow } = await supabase
    .from("rendszer_beallitas")
    .select("ertek")
    .eq("kulcs", templateKey)
    .maybeSingle()

  const existing: TaskTemplate[] =
    Array.isArray(settingRow?.ertek) && settingRow.ertek.length > 0
      ? settingRow.ertek
      : [...DEFAULT_TASK_TEMPLATES]

  const index = existing.findIndex((t) => t.id === templateId)

  let updatedItem: TaskTemplate

  if (index === -1) {
    const defaultTpl = DEFAULT_TASK_TEMPLATES.find((t) => t.id === templateId)
    if (!defaultTpl) {
      return { success: false, error: "A sablon nem található." }
    }
    updatedItem = {
      ...defaultTpl,
      ...updates,
      id: defaultTpl.id,
    }
    existing.push(updatedItem)
  } else {
    updatedItem = {
      ...existing[index],
      ...updates,
      id: existing[index].id,
    }
    existing[index] = updatedItem
  }

  const { error } = await supabase
    .from("rendszer_beallitas")
    .upsert({
      kulcs: templateKey,
      ertek: existing,
      leiras: "Feladatsablonok a feladatkatalógushoz.",
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, template: updatedItem }
}

export const saveTaskTemplate = createCustomTaskTemplate
