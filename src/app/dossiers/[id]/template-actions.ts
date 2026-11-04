"use server"

import crypto from "crypto"
import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { insertIratWithNextAlszam } from "@/utils/alszam-helper"
import { ReplyTemplate, ReplyTemplateCategory } from "@/types/reply-templates"
import { DEFAULT_REPLY_TEMPLATES } from "@/utils/reply-templates"

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Hiányzó Supabase Service Role környezeti változó.")
  }
  return createAdminClient(url, key)
}

/**
 * Cég-specifikus kulcs a válaszlevél-sablonok tárolásához.
 * Korábban GLOBÁLIS kulcsot használt ("valaszlevel_sablonok"), ami miatt
 * minden cég ugyanazt a sablonlistát látta — ez a P0 multi-tenant hiba.
 */
async function getTemplateKey(): Promise<string | null> {
  const { getActiveCompanyIdServer } = await import("@/utils/company-server")
  const companyId = await getActiveCompanyIdServer()
  if (!companyId) return null
  return `valaszlevel_sablonok:${companyId}`
}

/**
 * A-097 / A-106 ŐRBLOKK a sablon-műveletekhez:
 * - Olvasáshoz: bejelentkezett felhasználó az aktív vállalatban
 * - Íráshoz (létrehozás/módosítás/törlés/generálás): szerkesztési jogosultságú szerepkör
 */
async function requireTemplateAccess(writeMode = false): Promise<string | null> {
  const { requireDocsAuthServer } = await import("@/utils/docs-auth-guard")
  const auth = await requireDocsAuthServer(
    writeMode ? ["admin", "rendszergazda", "iktato", "vezeto", "ugyintezo", "dossiers"] : undefined
  )
  if (!auth.authorized || !auth.user) {
    return auth.error || "Nincs jogosultságod a válaszlevél-sablonok kezeléséhez."
  }
  return null
}

/**
 * Lekérdezi az összes válaszlevél- és iratsablont (beépített + egyéni/vállalati)
 * Az AKTÍV CÉG saját listáját adja vissza (multi-tenant izoláció).
 */
export async function getReplyTemplates(): Promise<{
  success: boolean
  templates?: ReplyTemplate[]
  error?: string
}> {
  try {
    const authError = await requireTemplateAccess()
    if (authError) return { success: false, error: authError, templates: [] }

    const key = await getTemplateKey()
    if (!key) {
      return { success: true, templates: DEFAULT_REPLY_TEMPLATES }
    }

    const supabase = await createClient()

    const { data: settingRow } = await supabase
      .from("rendszer_beallitas")
      .select("ertek")
      .eq("kulcs", key)
      .maybeSingle()

    // Ha az adatbázisban még nincs feltöltve a céghez, inicializáljuk a DEFAULT_REPLY_TEMPLATES-szel
    if (!settingRow || !Array.isArray(settingRow.ertek) || settingRow.ertek.length === 0) {
      const admin = getAdminClient()
      await admin
        .from("rendszer_beallitas")
        .upsert(
          {
            kulcs: key,
            ertek: DEFAULT_REPLY_TEMPLATES,
            leiras: `Válaszlevél-sablonok (cég: ${key.split(":")[1]?.slice(0, 8) || "?"})`,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "kulcs" }
        )
      return { success: true, templates: DEFAULT_REPLY_TEMPLATES }
    }

    return { success: true, templates: settingRow.ertek }
  } catch (err: any) {
    console.error("Hiba a válaszlevél sablonok lekérésekor:", err)
    return { success: false, error: err.message, templates: DEFAULT_REPLY_TEMPLATES }
  }
}

/**
 * Új egyéni / vállalati válaszlevél sablon rögzítése
 */
export async function createCustomReplyTemplate(templateData: {
  nev: string
  kategoria: ReplyTemplateCategory
  targy: string
  description?: string
  tartalom: string
}): Promise<{
  success: boolean
  template?: ReplyTemplate
  error?: string
}> {
  try {
    const authError = await requireTemplateAccess(true)
    if (authError) return { success: false, error: authError }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Nincs bejelentkezve." }
    }

    if (!templateData.nev.trim()) {
      return { success: false, error: "A sablon megnevezése kötelező!" }
    }

    if (!templateData.tartalom.trim()) {
      return { success: false, error: "A sablon levélszövegezése kötelező!" }
    }

    const key = await getTemplateKey()
    if (!key) return { success: false, error: "Nincs aktív cég kiválasztva." }

    const newTemplate: ReplyTemplate = {
      id: `custom-reply-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nev: templateData.nev.trim(),
      kategoria: templateData.kategoria || "hivatalos",
      targy: templateData.targy.trim() || templateData.nev.trim(),
      description: templateData.description?.trim() || undefined,
      tartalom: templateData.tartalom.trim(),
      isCustom: true,
      created_by: user.id,
      created_at: new Date().toISOString(),
    }

    const admin = getAdminClient()

    // Lekérjük a meglévőket (cég-specifikus kulcsról)
    const { data: settingRow } = await admin
      .from("rendszer_beallitas")
      .select("ertek")
      .eq("kulcs", key)
      .maybeSingle()

    const existing: ReplyTemplate[] =
      Array.isArray(settingRow?.ertek) && settingRow.ertek.length > 0
        ? settingRow.ertek
        : [...DEFAULT_REPLY_TEMPLATES]

    const updated = [newTemplate, ...existing]

    const { error } = await admin
      .from("rendszer_beallitas")
      .upsert(
        {
          kulcs: key,
          ertek: updated,
          leiras: `Válaszlevél-sablonok (cég-specifikus)`,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        },
        { onConflict: "kulcs" }
      )

    if (error) {
      console.error("Hiba az új válaszlevél sablon mentésekor:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/dossiers")
    return { success: true, template: newTemplate }
  } catch (err: any) {
    console.error("Váratlan hiba válaszlevél sablon mentésekor:", err)
    return { success: false, error: err.message || "Váratlan hiba történt." }
  }
}

/**
 * Meglévő válaszlevél sablon módosítása (bármelyik sablon szerkeszthető)
 */
export async function updateCustomReplyTemplate(
  templateId: string,
  updates: Partial<ReplyTemplate>
): Promise<{
  success: boolean
  template?: ReplyTemplate
  error?: string
}> {
  try {
    const authError = await requireTemplateAccess(true)
    if (authError) return { success: false, error: authError }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Nincs bejelentkezve." }
    }

    const admin = getAdminClient()

    const key = await getTemplateKey()
    if (!key) return { success: false, error: "Nincs aktív cég kiválasztva." }

    const { data: settingRow } = await admin
      .from("rendszer_beallitas")
      .select("ertek")
      .eq("kulcs", key)
      .maybeSingle()

    const existing: ReplyTemplate[] =
      Array.isArray(settingRow?.ertek) && settingRow.ertek.length > 0
        ? settingRow.ertek
        : [...DEFAULT_REPLY_TEMPLATES]

    const index = existing.findIndex((t) => t.id === templateId)

    let updatedItem: ReplyTemplate

    if (index === -1) {
      const defaultTpl = DEFAULT_REPLY_TEMPLATES.find((t) => t.id === templateId)
      if (!defaultTpl) {
        return {
          success: false,
          error: "A sablon nem található.",
        }
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

    const { error } = await admin
      .from("rendszer_beallitas")
      .upsert(
        {
          kulcs: key,
          ertek: existing,
          leiras: `Válaszlevél-sablonok (cég-specifikus)`,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        },
        { onConflict: "kulcs" }
      )

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath("/dossiers")
    return { success: true, template: updatedItem }
  } catch (err: any) {
    return { success: false, error: err.message || "Váratlan hiba történt." }
  }
}

/**
 * Válaszlevél sablon törlése (bármelyik sablon törölhető)
 */
export async function deleteCustomReplyTemplate(
  templateId: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const authError = await requireTemplateAccess(true)
    if (authError) return { success: false, error: authError }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Nincs bejelentkezve." }
    }

    const admin = getAdminClient()

    const key = await getTemplateKey()
    if (!key) return { success: false, error: "Nincs aktív cég kiválasztva." }

    const { data: settingRow } = await admin
      .from("rendszer_beallitas")
      .select("ertek")
      .eq("kulcs", key)
      .maybeSingle()

    const existing: ReplyTemplate[] =
      Array.isArray(settingRow?.ertek) && settingRow.ertek.length > 0
        ? settingRow.ertek
        : [...DEFAULT_REPLY_TEMPLATES]

    const filtered = existing.filter((t) => t.id !== templateId)

    const { error } = await admin
      .from("rendszer_beallitas")
      .upsert(
        {
          kulcs: key,
          ertek: filtered,
          leiras: `Válaszlevél-sablonok (cég-specifikus)`,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        },
        { onConflict: "kulcs" }
      )

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath("/dossiers")
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Váratlan hiba történt." }
  }
}

/**
 * Kimenő irat generálása sablonból (PDF előállítása és mentése az ügyiratba)
 */
export async function generateFromTemplate(
  ugyiratId: string,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()

  // Ügyirat adatai a sablonhoz és jogosultság ellenőrzéshez
  const { data: ugyirat } = await supabase
    .from("ugyirat")
    .select("id, statusz, iktatoszam, company_id, szervezeti_egyseg_id, ugy(targy, felelos_user_id)")
    .eq("id", ugyiratId)
    .single()

  if (!ugyirat) {
    return { error: "Ügyirat nem található." }
  }

  if (["irattarban", "lezart", "selejtezheto", "selejtezett"].includes(ugyirat.statusz)) {
    return { error: `A kiválasztott ügyirat (${ugyirat.iktatoszam}) lezárt vagy irattározott állapotban van, ezért nem generálható bele új irat!` }
  }

  const { requireDocsAuthServer } = await import("@/utils/docs-auth-guard")
  const auth = await requireDocsAuthServer(
    ["admin", "rendszergazda", "iktato", "vezeto", "ugyintezo", "dossiers"],
    ugyirat.company_id || null
  )
  if (!auth.authorized || !auth.user) {
    return { error: auth.error || "Nincs jogosultságod irat generálásához." }
  }
  const user = auth.user

  if (!["admin", "rendszergazda", "iktato"].includes(auth.docsRole)) {
    const { data: explicitAccess } = await supabase
      .from("ugyirat_hozzaferes")
      .select("id")
      .eq("ugyirat_id", ugyiratId)
      .eq("user_id", user.id)
      .maybeSingle()

    const inDept =
      !ugyirat.szervezeti_egyseg_id ||
      (Boolean(auth.szervezetiEgysegId) && ugyirat.szervezeti_egyseg_id === auth.szervezetiEgysegId)
    const isAssigned = (ugyirat.ugy as any)?.felelos_user_id === user.id

    if (auth.docsRole === "vezeto" && !inDept && !isAssigned && !explicitAccess) {
      return { error: "Nincs jogosultságod ehhez a művelethez a szervezeti egységeden kívül." }
    }
    if ((auth.docsRole === "ugyintezo" || auth.docsRole === "munkavallalo") && !inDept && !isAssigned && !explicitAccess) {
      return { error: "Nincs jogosultságod ehhez a művelethez, mivel nem vagy felelőse az ügyiratnak és nem tartozik a szervezeti egységedhez." }
    }
  }

  const targy = formData.get("targy") as string
  const sablon_tipus = formData.get("sablon_tipus") as string
  const tartalom = formData.get("tartalom") as string
  const cimzett = formData.get("cimzett") as string
  const hivatkozas = formData.get("hivatkozas") as string

  if (!targy || !tartalom) {
    return { error: "A tárgy és a tartalom megadása kötelező!" }
  }

  const profile = { nev: auth.nev }

  const iktatoszam = ugyirat?.iktatoszam || ""
  const ugyTargy = (ugyirat?.ugy as any)?.targy || ""

  // UTF-8 kompatibilis PDF generálás (LiberationSans fonttal: ő, ű, Ő, Ű támogatással)
  const { generateLetterPdfBuffer } = await import("@/utils/pdf-letter-generator")
  const buffer = await generateLetterPdfBuffer({
    targy,
    cimzett: cimzett || undefined,
    iktatoszam: iktatoszam || undefined,
    ugyTargy: ugyTargy || undefined,
    hivatkozas: hivatkozas || undefined,
    tartalom,
    authorNev: profile?.nev || "eaisyDocs",
  })

  // SHA-256 hash
  const hash = crypto.createHash("sha256").update(buffer).digest("hex")

  // Storage feltöltés (irat_files bucket)
  const fileName = `${crypto.randomUUID()}.pdf`
  const { error: uploadError } = await supabase.storage
    .from("irat_files")
    .upload(fileName, buffer, {
      contentType: "application/pdf",
      upsert: false,
    })

  if (uploadError) return { error: "Hiba a fájl feltöltésekor: " + uploadError.message }

  // Alszám számítás és Irat rekord (kimenő) ütközésvédelemmel
  const dossierCompanyId = (ugyirat as any)?.company_id || (await getActiveCompanyIdServer())
  const { data: iratData, error: iratError } = await insertIratWithNextAlszam(
    supabase,
    ugyiratId,
    (alszam) => ({
      ugyirat_id: ugyiratId,
      company_id: dossierCompanyId,
      targy,
      irany: "kimeno",
      erkezes_modja: "rendszer",
      adathordozo_tipus: "elektronikus_eredeti",
      minosites: "nyilt",
      alszam,
      kezbesites_statusz: "vazlat",
    })
  )

  if (iratError || !iratData) {
    await supabase.storage.from("irat_files").remove([fileName])
    return { error: "Hiba az irat rekord létrehozásakor." }
  }

  // Irat fájl rekord
  const dateStr = new Date().toLocaleDateString("hu-HU")
  const generatedFilename = `${sablon_tipus || "sablon"}_${dateStr.replace(/\./g, "").replace(/ /g, "_")}.pdf`
  const { data: fajlResult, error: fajlError } = await supabase
    .from("irat_fajl")
    .insert({
      irat_id: iratData.id,
      storage_path: fileName,
      eredeti_fajlnev: generatedFilename,
      mime_type: "application/pdf",
      meret_byte: buffer.length,
      sha256: hash,
      verzio: 1,
    })
    .select("id")
    .single()

  if (fajlError || !fajlResult) {
    await supabase.storage.from("irat_files").remove([fileName])
    await supabase.from("irat").delete().eq("id", iratData.id)
    return { error: "Hiba a fájl rekord létrehozásakor: " + (fajlError?.message || "") }
  }

  // Eseménynapló
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
    company_id: dossierCompanyId,
    esemeny_tipus: "modositva",
    user_id: user.id,
    indoklas: `Kimenő irat generálva sablonból: ${sablon_tipus || "Általános"} — ${targy}`,
  })

  // PDF/A konverzió háttérsorba állítása
  if (fajlResult) {
    try {
      const { enqueuePdfaConversion } = await import("@/utils/ai-worker-service")
      await enqueuePdfaConversion(iratData.id, fajlResult.id, supabase)
    } catch (err) {
      console.warn("PDF/A sorba állítás figyelmeztetés sablon generálásakor:", err)
    }
  }

  revalidatePath(`/dossiers/${ugyiratId}`)
  return { success: true }
}
