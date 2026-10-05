"use server"

import crypto from "crypto"
import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { getClientInfo } from "@/utils/client-info"
import {
  ContractParty,
  ContractTemplate,
  ContractType,
  GenerateContractDraftParams,
  ContractDraftResult,
  FinalizeContractParams,
} from "@/types/contract-templates"
import {
  DEFAULT_MEGBIZO_COMPANY,
  DEFAULT_CONTRACT_TEMPLATES,
  generateFallbackContractText,
  extractAmountFromPrompt,
} from "@/utils/contract-templates"
import { generateContractPdfBuffer } from "@/utils/contract-pdf-generator"
import { sendEmailWithAttachment } from "@/utils/mailer"

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Hiányzó Supabase Service Role környezeti változó.")
  }
  return createAdminClient(url, key)
}

/**
 * Lekérdezi az összes elérhető üzleti szerződéssablont (alapértelmezett + egyéni vállalati).
 * Ha a rendszerbeállítások még üresek, automatikusan inicializálja az alapsablonokkal.
 */
export async function getContractTemplatesAction(): Promise<{
  success: boolean
  templates?: ContractTemplate[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data: settingRow } = await supabase
      .from("rendszer_beallitas")
      .select("ertek")
      .eq("kulcs", "szerzodes_sablonok")
      .maybeSingle()

    const customTemplates = Array.isArray(settingRow?.ertek)
      ? settingRow.ertek.filter((t: ContractTemplate) => t.isCustom)
      : []

    const mergedTemplates: ContractTemplate[] = [...DEFAULT_CONTRACT_TEMPLATES, ...customTemplates]

    const admin = getAdminClient()
    await admin
      .from("rendszer_beallitas")
      .upsert(
        {
          kulcs: "szerzodes_sablonok",
          ertek: mergedTemplates,
          leiras: "Üzleti szerződéssablonok a szerződésgenerátor modulhoz.",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "kulcs" }
      )

    return { success: true, templates: mergedTemplates }
  } catch (err: any) {
    console.error("Hiba a szerződéssablonok lekérésekor:", err)
    return { success: false, error: err.message, templates: DEFAULT_CONTRACT_TEMPLATES }
  }
}

/**
 * Új egyéni / vállalati szerződéssablon és típus rögzítése
 */
export async function createCustomContractTemplateAction(templateData: {
  name: string
  category: string
  description?: string
  defaultTitle: string
  promptPlaceholder: string
  examplePrompts?: string[]
  defaultClauses?: { title: string; content: string }[]
}): Promise<{
  success: boolean
  template?: ContractTemplate
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Nincs bejelentkezve." }
    }

    if (!templateData.name.trim()) {
      return { success: false, error: "A sablon megnevezése kötelező!" }
    }

    const typeSlug = templateData.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")

    const newTemplate: ContractTemplate = {
      id: `custom-contract-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: typeSlug || "egyedi",
      name: templateData.name.trim(),
      category: templateData.category?.trim() || "Egyedi Szerződések",
      description: templateData.description?.trim() || "Egyedileg létrehozott üzleti szerződéssablon.",
      defaultTitle: templateData.defaultTitle?.trim() || templateData.name.trim(),
      promptPlaceholder: templateData.promptPlaceholder?.trim() || "Írd le a szerződés speciális paramétereit...",
      examplePrompts:
        templateData.examplePrompts && templateData.examplePrompts.length > 0
          ? templateData.examplePrompts.filter((p) => p.trim())
          : [templateData.promptPlaceholder || "Egyedi megállapodás feltételei..."],
      defaultClauses: templateData.defaultClauses || [],
      isCustom: true,
      created_by: user.id,
      created_at: new Date().toISOString(),
    }

    const admin = getAdminClient()
    const { data: settingRow } = await admin
      .from("rendszer_beallitas")
      .select("ertek")
      .eq("kulcs", "szerzodes_sablonok")
      .maybeSingle()

    const existing: ContractTemplate[] =
      Array.isArray(settingRow?.ertek) && settingRow.ertek.length > 0
        ? settingRow.ertek
        : [...DEFAULT_CONTRACT_TEMPLATES]

    const updated = [newTemplate, ...existing]

    const { error } = await admin
      .from("rendszer_beallitas")
      .upsert(
        {
          kulcs: "szerzodes_sablonok",
          ertek: updated,
          leiras: "Üzleti szerződéssablonok a szerződésgenerátor modulhoz.",
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        },
        { onConflict: "kulcs" }
      )

    if (error) {
      console.error("Hiba az új szerződéssablon mentésekor:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/partners")
    return { success: true, template: newTemplate }
  } catch (err: any) {
    console.error("Váratlan hiba szerződéssablon mentésekor:", err)
    return { success: false, error: err.message || "Váratlan hiba történt." }
  }
}

/**
 * Egyéni szerződéssablon törlése
 */
export async function deleteContractTemplateAction(templateId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Nincs bejelentkezve." }
    }

    const admin = getAdminClient()
    const { data: settingRow } = await admin
      .from("rendszer_beallitas")
      .select("ertek")
      .eq("kulcs", "szerzodes_sablonok")
      .maybeSingle()

    let existing: ContractTemplate[] =
      Array.isArray(settingRow?.ertek) && settingRow.ertek.length > 0
        ? settingRow.ertek
        : [...DEFAULT_CONTRACT_TEMPLATES]

    const filtered = existing.filter((t) => t.id !== templateId)

    const { error } = await admin
      .from("rendszer_beallitas")
      .upsert(
        {
          kulcs: "szerzodes_sablonok",
          ertek: filtered,
          leiras: "Üzleti szerződéssablonok a szerződésgenerátor modulhoz.",
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        },
        { onConflict: "kulcs" }
      )

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath("/partners")
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || "Váratlan hiba történt." }
  }
}

/**
 * Lekéri a szerződésgeneráláshoz szükséges kiinduló kontextust:
 * Partner törzsadatai, kapcsolattartója, elérhető sablonok, megbízó cégadatai,
 * valamint az iktatáshoz kapcsolható meglévő nyitott ügyiratok.
 */
export async function getContractGeneratorContextAction(partnerId: string): Promise<{
  success: boolean
  partner?: any
  templates?: ContractTemplate[]
  megbizo?: ContractParty
  dossiers?: { id: string; iktatoszam: string; targy: string; statusz: string }[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    // 1. Partner adatok lekérése (biztonságos, beágyazott join hiba nélkül)
    let partnerQuery = await supabase
      .from("partner")
      .select("*")
      .eq("id", partnerId)
      .maybeSingle()

    let partner = partnerQuery.data
    let partnerError = partnerQuery.error

    if (partnerError || !partner) {
      const admin = getAdminClient()
      const adminPartnerQuery = await admin
        .from("partner")
        .select("*")
        .eq("id", partnerId)
        .maybeSingle()

      partner = adminPartnerQuery.data
      partnerError = adminPartnerQuery.error
    }

    if (partnerError || !partner) {
      console.error("Partner kontextus betöltési hiba:", { partnerId, partnerError })
      return { success: false, error: "A megadott partner nem található az adatbázisban." }
    }

    // Kapcsolattartók lekérése külön táblából
    const dbClient = partnerQuery.data ? supabase : getAdminClient()
    const { data: kapcsolattartok } = await dbClient
      .from("partner_kapcsolattarto")
      .select("*")
      .eq("partner_id", partner.id)
      .order("elsodleges", { ascending: false })

    partner.kapcsolattartok = kapcsolattartok || []

    // 2. Megbízó vállalati adatok (rendszerbeállításból vagy alapértelmezett)
    let megbizo = { ...DEFAULT_MEGBIZO_COMPANY }
    const { data: configRow } = await supabase
      .from("rendszer_beallitas")
      .select("ertek")
      .eq("kulcs", "szervezet_alapadatok")
      .maybeSingle()

    if (configRow?.ertek && typeof configRow.ertek === "object") {
      megbizo = {
        ...megbizo,
        nev: configRow.ertek.nev || megbizo.nev,
        szekhely: configRow.ertek.szekhely || megbizo.szekhely,
        adoszam: configRow.ertek.adoszam || megbizo.adoszam,
        cegjegyzekszam: configRow.ertek.cegjegyzekszam || megbizo.cegjegyzekszam,
        kepviselo: configRow.ertek.kepviselo || megbizo.kepviselo,
        bankszamlaszam: configRow.ertek.bankszamlaszam || megbizo.bankszamlaszam,
        email: configRow.ertek.email || megbizo.email,
        telefonszam: configRow.ertek.telefonszam || megbizo.telefonszam,
      }
    }

    // 3. Partnerhez kapcsolódó, vagy általános aktív ügyiratok a könnyű választáshoz
    const { data: partnerDossiers } = await supabase
      .from("irat_kapcsolat")
      .select(`
        ugyirat:ugyirat_id (
          id,
          iktatoszam,
          statusz,
          ugy:ugy_id ( targy )
        )
      `)
      .eq("entitas_tipus", "partner")
      .eq("entitas_id", partnerId)
      .not("ugyirat_id", "is", null)
      .limit(10)

    const mappedPartnerDossiers = (partnerDossiers || [])
      .map((item: any) => item.ugyirat)
      .filter((u: any) => u && u.id && u.statusz !== "irattarban" && u.statusz !== "selejtezett")
      .map((u: any) => ({
        id: u.id,
        iktatoszam: u.iktatoszam || "Nincs iktatószám",
        targy: u.ugy?.targy || "Névtelen ügyirat",
        statusz: u.statusz,
      }))

    // További aktív ügyiratok ha a partnernek nincs sok
    const { data: recentDossiers } = await supabase
      .from("ugyirat")
      .select("id, iktatoszam, statusz, ugy:ugy_id ( targy )")
      .in("statusz", ["iktatva", "folyamatban", "uj"])
      .order("created_at", { ascending: false })
      .limit(15)

    const mappedRecent = (recentDossiers || []).map((u: any) => ({
      id: u.id,
      iktatoszam: u.iktatoszam || "Nincs iktatószám",
      targy: (u.ugy as any)?.targy || "Névtelen ügyirat",
      statusz: u.statusz,
    }))

    // Összefésülés és egyediesítés
    const allDossiersMap = new Map<string, any>()
    mappedPartnerDossiers.forEach((d: any) => allDossiersMap.set(d.id, d))
    mappedRecent.forEach((d: any) => {
      if (!allDossiersMap.has(d.id)) {
        allDossiersMap.set(d.id, d)
      }
    })

    const tmplsRes = await getContractTemplatesAction()
    const activeTemplates =
      tmplsRes.templates && tmplsRes.templates.length > 0
        ? tmplsRes.templates
        : DEFAULT_CONTRACT_TEMPLATES

    return {
      success: true,
      partner,
      templates: activeTemplates,
      megbizo,
      dossiers: Array.from(allDossiersMap.values()),
    }
  } catch (err: any) {
    console.error("Hiba a szerződésgenerálási kontextus lekérésekor:", err)
    return { success: false, error: err.message || "Váratlan hiba történt." }
  }
}

/**
 * AI alapú szerződéstervezet generálása a partner törzsadatai,
 * kiválasztott sablon és természetes nyelvű prompt alapján.
 */
export async function generateContractDraftAction(
  params: GenerateContractDraftParams
): Promise<{
  success: boolean
  draft?: ContractDraftResult
  isAiGenerated?: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // 1. Partner adatok betöltése
    let partnerQuery = await supabase
      .from("partner")
      .select("*")
      .eq("id", params.partnerId)
      .maybeSingle()

    let partner = partnerQuery.data
    let partnerError = partnerQuery.error

    if (partnerError || !partner) {
      const admin = getAdminClient()
      const adminPartnerQuery = await admin
        .from("partner")
        .select("*")
        .eq("id", params.partnerId)
        .maybeSingle()

      partner = adminPartnerQuery.data
      partnerError = adminPartnerQuery.error
    }

    if (partnerError || !partner) {
      console.error("Szerződő partner nem található a generáláshoz:", { partnerId: params.partnerId, partnerError })
      return { success: false, error: "A szerződő partner nem található." }
    }

    // Kapcsolattartók lekérése külön táblából
    const dbClient = partnerQuery.data ? supabase : getAdminClient()
    const { data: kapcsolattartok } = await dbClient
      .from("partner_kapcsolattarto")
      .select("*")
      .eq("partner_id", partner.id)
      .order("elsodleges", { ascending: false })

    partner.kapcsolattartok = kapcsolattartok || []

    // Sablon kikeresése (alapértelmezett vagy egyéni)
    const tmplsRes = await getContractTemplatesAction()
    const allTemplates =
      tmplsRes.templates && tmplsRes.templates.length > 0
        ? tmplsRes.templates
        : DEFAULT_CONTRACT_TEMPLATES

    const template =
      allTemplates.find((t) => t.id === params.templateId || t.type === params.contractType) ||
      allTemplates[0]

    // Cím
    const contractTitle = params.title?.trim() || template.defaultTitle

    // Megbízó és Megbízott összeállítása
    const megbizo: ContractParty = { ...DEFAULT_MEGBIZO_COMPANY }

    const primaryContact =
      partner.kapcsolattartok?.find((c: any) => c.elsodleges) || partner.kapcsolattartok?.[0]

    const fullSzekhely = [
      partner.szekhely_iranyitoszam,
      partner.szekhely_varos,
      partner.szekhely_utca,
    ]
      .filter(Boolean)
      .join(" ")

    const megbizott: ContractParty = {
      nev: partner.nev,
      szekhely: fullSzekhely || "Magyarország",
      adoszam: partner.adoszam,
      kulfoldi_adoszam: partner.kulfoldi_adoszam,
      cegjegyzekszam: partner.cegjegyzekszam,
      kepviselo: primaryContact ? `${primaryContact.nev} (${primaryContact.beosztas || "képviselő"})` : null,
      bankszamlaszam: partner.bankszamlaszam,
      email: partner.email || primaryContact?.email,
      telefonszam: partner.telefonszam || primaryContact?.telefonszam,
    }

    // 2. Mesterséges Intelligencia (Google GenAI Gemini 2.5 Flash) meghívása
    const googleApiKey = process.env.GOOGLE_API_KEY
    let aiDraft: ContractDraftResult | null = null

    if (googleApiKey && params.customPrompt?.trim()) {
      try {
        const { GoogleGenAI } = await import("@google/genai")
        const ai = new GoogleGenAI({ apiKey: googleApiKey })

        // Pénzügyi / kötbér összeg feloldása: a kitöltött mező vagy a prompt szövegéből kinyert érték
        const effectiveFeeAmount = params.feeAmount ?? extractAmountFromPrompt(params.customPrompt)

        const prompt = `Te egy profi magyar vállalati jogász és szerződéskészítő AI asszisztens vagy az eaisyDocs rendszerben.
Feladatod egy hatályos magyar jogszabályoknak (különösen a 2013. évi V. törvény a Polgári Törvénykönyvről) megfelelő, hivatalos, cégszerűen aláírható üzleti szerződés elkészítése JSON formátumban.

SZERZŐDÉS ALAPADATAI:
- Típus: ${template.name} (${params.contractType})
- Javasolt cím: "${contractTitle}"
- Megbízó / Megrendelő:
  * Név: ${megbizo.nev}
  * Székhely: ${megbizo.szekhely}
  * Adószám: ${megbizo.adoszam || "–"}
  * Cégjegyzékszám: ${megbizo.cegjegyzekszam || "–"}
  * Képviselő: ${megbizo.kepviselo || "–"}
  * Bankszámla: ${megbizo.bankszamlaszam || "–"}

- Megbízott / Szolgáltató (Partner):
  * Név: ${megbizott.nev}
  * Székhely: ${megbizott.szekhely}
  * Adószám: ${megbizott.adoszam || megbizott.kulfoldi_adoszam || "–"}
  * Cégjegyzékszám: ${megbizott.cegjegyzekszam || "–"}
  * Képviselő: ${megbizott.kepviselo || "–"}
  * Bankszámla: ${megbizott.bankszamlaszam || "–"}

KÖTELEZŐ SZERZŐDÉSI ÉS PÉNZÜGYI PARAMÉTEREK:
- Hatálybalépés dátuma: ${params.effectiveDate || "a mai nap"}
- Érvényesség ideje: ${params.validityMonths ? `${params.validityMonths} hónapos határozott idő` : "határozatlan időtartam"}
- Szerződéses összeg (Megbízási díj / Kötbér / Igazolt összeg): ${effectiveFeeAmount ? `${effectiveFeeAmount.toLocaleString("hu-HU")} ${params.currency || "HUF"}` : "nincs külön összeg megadva"}

FELHASZNÁLÓI EGYEDI LEÍRÁS, FELADATOK ÉS KIKÖTÉSEK:
"""
${params.customPrompt.trim()}
"""

KÖVETELMÉNYEK:
1. Amennyiben az Összeg paraméterben vagy a Felhasználói Egyedi Leírásban konkrét összeg szerepel (pl. "1.000.000 Ft kötbér", "havi 500.000 Ft megbízási díj"), KÖTELEZŐEN azt a konkrét összeget és pénznemet írd bele a szerződés vonatkozó fejezetébe!
2. Titoktartási megállapodás (NDA) esetén a megadott összeg a titoksértés esetére kikötött SZERZŐDÉSES KÖTBÉR (nem megbízási díj!). Ezt a "Szerződéses kötbér és jogkövetkezmények" fejezetbe foglald bele!
3. Teljesítésigazolás esetén a megadott összeg az elvégzett munka jóváhagyott, számlázható ellenértéke.
4. A Felhasználói Egyedi Leírás szövege a feladatok szakmai tartalmát, rendelkezésre állást, elszámolási mérföldköveket, fizetési határidőket (pl. 15 napos átutalás), SLA-t és speciális jogi kikötéseket részletezi.
5. A generált szerződés legyen teljes értékű, fejezetekre (sections) és számozott bekezdésekre (paragraphs) bontva.
6. A Felek felsorolása (1. fejezet) pontosan tartalmazza mindkét cég adatait és képviselőit.
7. Fogalmazz meg szabatos, hivatalos jogi nyelvezetet a szerződés tárgyára, a felek kötelezettségeire, a díjazásra / kötbérre és fizetési feltételekre, a titoktartásra és felelősségre, valamint a hatályra és záró rendelkezésekre.
8. KIZÁRÓLAG érvényes JSON formátumban válaszolj, a következő struktúrában:
{
  "title": string,
  "sections": [
    {
      "number": 1,
      "title": "A SZERZŐDŐ FELEK ÉS PREAMBULUM",
      "paragraphs": ["bekezdés 1", "bekezdés 2"]
    },
    {
      "number": 2,
      "title": "A SZERZŐDÉS TÁRGYA",
      "paragraphs": ["bekezdés 1", "bekezdés 2"]
    }
  ]
}`

        const res = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [prompt],
          config: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        })

        if (res.text) {
          const parsed = JSON.parse(res.text)
          if (parsed && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
            const fullTextLines: string[] = []
            fullTextLines.push(`\n${(parsed.title || contractTitle).toUpperCase()}\n`)
            for (const s of parsed.sections) {
              fullTextLines.push(`\n${s.number}. ${s.title}\n`)
              for (const p of s.paragraphs || []) {
                fullTextLines.push(`${p}\n`)
              }
            }

            const fullTextStr = fullTextLines.join("\n")

            aiDraft = {
              title: parsed.title || contractTitle,
              contractType: params.contractType,
              megbizo,
              megbizott,
              sections: parsed.sections,
              fullText: fullTextStr,
              estimatedPages: Math.max(1, Math.ceil(fullTextStr.length / 1800)),
              generatedAt: new Date().toISOString(),
            }
          }
        }
      } catch (genErr) {
        console.warn("[ContractGenerator] Gemini hívás sikertelen vagy JSON parse hiba, fallback aktiválása:", genErr)
      }
    }

    // 3. Fallback ha az AI nem érhető el vagy nem adott választ
    if (!aiDraft) {
      const effectiveFeeAmount = params.feeAmount ?? extractAmountFromPrompt(params.customPrompt)
      aiDraft = generateFallbackContractText({
        title: contractTitle,
        contractType: params.contractType,
        template,
        megbizo,
        megbizott,
        prompt: params.customPrompt || "",
        effectiveDate: params.effectiveDate,
        feeAmount: effectiveFeeAmount,
        currency: params.currency,
        validityMonths: params.validityMonths,
      })
      return { success: true, draft: aiDraft, isAiGenerated: false }
    }

    return { success: true, draft: aiDraft, isAiGenerated: true }
  } catch (err: any) {
    console.error("Hiba a szerződéstervezet generálásakor:", err)
    return { success: false, error: err.message || "Váratlan hiba történt a generálás során." }
  }
}

/**
 * Szöveges szerződés véglegesítése:
 * PDF generálás, iktatás (új vagy meglévő ügyiratba), csatolás, kapcsolatok rögzítése,
 * audit naplózás és opcionális azonnali e-mail kiküldés a partnernek.
 */
export async function finalizeAndFileContractAction(
  params: FinalizeContractParams
): Promise<{
  success: boolean
  iratId?: string
  ugyiratId?: string
  iktatoszam?: string
  emailed?: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Nincs bejelentkezve." }
    }

    if (!params.partnerId) {
      return { success: false, error: "Partner azonosító megadása kötelező!" }
    }

    if (!params.title?.trim() || !params.content?.trim()) {
      return { success: false, error: "A szerződés címe és tartalma kötelező!" }
    }

    // 1. Partner törzsadat betöltése
    let partnerQuery = await supabase
      .from("partner")
      .select("id, nev, email")
      .eq("id", params.partnerId)
      .maybeSingle()

    let partner = partnerQuery.data
    let partnerErr = partnerQuery.error

    if (partnerErr || !partner) {
      const admin = getAdminClient()
      const adminQuery = await admin
        .from("partner")
        .select("id, nev, email")
        .eq("id", params.partnerId)
        .maybeSingle()

      partner = adminQuery.data
      partnerErr = adminQuery.error
    }

    if (partnerErr || !partner) {
      console.error("Partner nem található a véglegesítéshez:", { partnerId: params.partnerId, partnerErr })
      return { success: false, error: "A megadott partner nem található." }
    }

    // 2. Felhasználó profil
    const { data: profile } = await supabase
      .from("felhasznalo_profil")
      .select("nev, docs_szerepkor, szervezeti_egyseg_id")
      .eq("id", user.id)
      .single()

    const currentYear = new Date().getFullYear()
    let ugyiratIdToUse = params.dossierId || null
    let iktatoszamToUse = ""

    // 3. Ügyirat feloldása vagy új létrehozása
    if (!ugyiratIdToUse || params.createNewDossier) {
      // Irattári tétel keresése (pl. Szerződések)
      const { data: tetel } = await supabase
        .from("irattari_terv")
        .select("id, megorzesi_ido_ev")
        .ilike("megnevezes", "%szerződ%")
        .limit(1)
        .maybeSingle()

      const irattariTetelId = tetel?.id || null
      const megorzesiEv = tetel?.megorzesi_ido_ev || 8 // Számviteli / polgári jogi 8 év

      // Ügyszám allokáció
      let ugyszam = `UGY-${currentYear}-${Date.now().toString().slice(-5)}`
      try {
        const { data: rpcUgyszam } = await supabase.rpc("generate_ugyszam", {
          p_ev: currentYear,
          p_prefix: "SZERZ",
        })
        if (rpcUgyszam) ugyszam = rpcUgyszam
      } catch (e) {
        console.warn("generate_ugyszam RPC nem elérhető, fallback ügyszám:", ugyszam)
      }

      // Ügy rekord
      const dossierSubject = params.dossierTitle?.trim() || `Szerződés: ${params.title} — ${partner.nev}`
      const { data: ugyData, error: ugyErr } = await supabase
        .from("ugy")
        .insert({
          ugyszam,
          targy: dossierSubject,
          ugytipus_id: irattariTetelId,
          statusz: "folyamatban",
          felelos_user_id: user.id,
        })
        .select("id")
        .single()

      if (ugyErr || !ugyData) {
        return { success: false, error: `Hiba az ügy létrehozásakor: ${ugyErr?.message || "Ismeretlen hiba"}` }
      }

      // Iktatószám allokáció
      let iktatoszam = `SZERZ-${currentYear}/${Date.now().toString().slice(-4)}`
      try {
        const { data: rpcIktatoszam } = await supabase.rpc("generate_iktatoszam", {
          p_ev: currentYear,
          p_prefix: "SZERZ",
        })
        if (rpcIktatoszam) iktatoszam = rpcIktatoszam
      } catch (e) {
        console.warn("generate_iktatoszam RPC nem elérhető, fallback iktatószám:", iktatoszam)
      }

      const retentionEnd = new Date()
      retentionEnd.setFullYear(retentionEnd.getFullYear() + megorzesiEv)

      // Ügyirat rekord
      const { data: ugyiratData, error: ugyiratErr } = await supabase
        .from("ugyirat")
        .insert({
          ugy_id: ugyData.id,
          iktatoszam,
          irattari_tetel_id: irattariTetelId,
          megorzesi_ido_vege: retentionEnd.toISOString().split("T")[0],
          statusz: "iktatva",
          szervezeti_egyseg_id: profile?.szervezeti_egyseg_id || null,
          iktato_user_id: user.id,
        })
        .select("id, iktatoszam")
        .single()

      if (ugyiratErr || !ugyiratData) {
        return { success: false, error: `Hiba az ügyirat létrehozásakor: ${ugyiratErr?.message || "Ismeretlen hiba"}` }
      }

      ugyiratIdToUse = ugyiratData.id
      iktatoszamToUse = ugyiratData.iktatoszam

      // Polimorf dosszié-kapcsolat a partnerhez
      await supabase.from("irat_kapcsolat").insert({
        ugyirat_id: ugyiratData.id,
        entitas_tipus: "partner",
        entitas_id: params.partnerId,
        kapcsolat_tipusa: "targya",
      })
    } else {
      // Meglévő ügyirat ellenőrzése
      const { data: existingDossier, error: dErr } = await supabase
        .from("ugyirat")
        .select("id, iktatoszam")
        .eq("id", ugyiratIdToUse)
        .single()

      if (dErr || !existingDossier) {
        return { success: false, error: "A kiválasztott ügyirat nem található." }
      }
      iktatoszamToUse = existingDossier.iktatoszam
    }

    // 4. Szerződés szövegének feldolgozása szakaszokra a PDF generáláshoz
    const rawLines = params.content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
    const sections: { number: number; title: string; paragraphs: string[] }[] = []
    let currentSection: { number: number; title: string; paragraphs: string[] } | null = null
    let sectionCount = 0

    for (const line of rawLines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      // Cím vagy Fejezetszám felismerése (pl. "1. A SZERZŐDŐ FELEK" vagy "I. FEJEZET")
      const sectionMatch = trimmed.match(/^([0-9]+|[IVXLCDM]+)[\.\)]\s+(.*)/i)
      if (sectionMatch) {
        if (currentSection && currentSection.paragraphs.length > 0) {
          sections.push(currentSection)
        }
        sectionCount++
        currentSection = {
          number: sectionCount,
          title: sectionMatch[2].trim(),
          paragraphs: [],
        }
      } else if (!currentSection) {
        sectionCount++
        currentSection = {
          number: sectionCount,
          title: "ÁLTALÁNOS RENDELKEZÉSEK",
          paragraphs: [trimmed],
        }
      } else {
        currentSection.paragraphs.push(trimmed)
      }
    }
    if (currentSection && currentSection.paragraphs.length > 0) {
      sections.push(currentSection)
    }

    // Ha nincsenek fejezetek (egyetlen folyó szöveg)
    if (sections.length === 0) {
      sections.push({
        number: 1,
        title: "SZERZŐDÉSI FELTÉTELEK",
        paragraphs: rawLines.filter((l) => l.trim().length > 0),
      })
    }

    const megbizo = params.megbizo || { ...DEFAULT_MEGBIZO_COMPANY }
    const megbizott = params.megbizott || {
      nev: partner.nev,
      szekhely: "–",
      kepviselo: "ügyvezető",
    }

    // 5. PDF előállítása
    const pdfBuffer = await generateContractPdfBuffer({
      title: params.title.trim(),
      contractType: params.contractType,
      iktatoszam: iktatoszamToUse,
      megbizo,
      megbizott,
      sections,
      authorNev: profile?.nev || megbizo.nev,
    })

    // SHA-256 hash
    const hash = crypto.createHash("sha256").update(pdfBuffer).digest("hex")

    // Storage feltöltés (irat_files bucket)
    const storageFileName = `${crypto.randomUUID()}.pdf`
    let uploadRes = await supabase.storage
      .from("irat_files")
      .upload(storageFileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      })

    // Ha jogosultság miatt sikertelen, admin klienssel kíséreljük meg
    if (uploadRes.error) {
      const admin = getAdminClient()
      uploadRes = await admin.storage
        .from("irat_files")
        .upload(storageFileName, pdfBuffer, {
          contentType: "application/pdf",
          upsert: false,
        })
    }

    if (uploadRes.error) {
      return { success: false, error: `Hiba a PDF fájl feltöltésekor: ${uploadRes.error.message}` }
    }

    // Alszám meghatározása az ügyiratban
    const { data: existingIratok } = await supabase
      .from("irat")
      .select("alszam")
      .eq("ugyirat_id", ugyiratIdToUse)

    const maxAlszam = existingIratok?.reduce((max, i) => Math.max(max, i.alszam || 0), 0) || 0
    const nextAlszam = maxAlszam + 1

    // Irat rekord beszúrása (kimenő)
    const { data: iratData, error: iratErr } = await supabase
      .from("irat")
      .insert({
        ugyirat_id: ugyiratIdToUse,
        targy: params.title.trim(),
        irany: "kimeno",
        erkezes_modja: "rendszer",
        adathordozo_tipus: "elektronikus_eredeti",
        minosites: "nyilt",
        alszam: nextAlszam,
        kezbesites_modja: params.sendEmailToPartner ? "email" : "szemelyes",
        kezbesites_statusz: params.sendEmailToPartner ? "folyamatban" : "vazlat",
        kuldo_partner_id: params.partnerId,
      })
      .select("id")
      .single()

    if (iratErr || !iratData) {
      return { success: false, error: `Hiba az irat létrehozásakor: ${iratErr?.message || "Ismeretlen hiba"}` }
    }

    // Irat fájl rekord
    const sanitizedFilename = `${params.title.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}.pdf`
    const { data: fajlResult } = await supabase
      .from("irat_fajl")
      .insert({
        irat_id: iratData.id,
        storage_path: storageFileName,
        eredeti_fajlnev: sanitizedFilename,
        mime_type: "application/pdf",
        meret_byte: pdfBuffer.length,
        sha256: hash,
        verzio: 1,
      })
      .select("id")
      .single()

    // Polimorf kapcsolat a partnerhez
    await supabase.from("irat_kapcsolat").insert({
      irat_id: iratData.id,
      entitas_tipus: "partner",
      entitas_id: params.partnerId,
      kapcsolat_tipusa: "szerzodo_partner",
      ugyirat_id: ugyiratIdToUse,
    })

    // Eseménynapló audit bejegyzés
    const { ip, userAgent } = await getClientInfo()
    await supabase.from("esemeny_naplo").insert({
      entitas_tipus: "irat",
      entitas_id: iratData.id,
      esemeny_tipus: "iktatva",
      user_id: user.id,
      indoklas: `Új üzleti szerződés generálva és iktatva: ${params.title} (${params.contractType})`,
      ip_cim: ip,
      user_agent: userAgent,
    })

    // 6. Opcionális e-mail kiküldés a partnernek
    let emailSent = false
    if (params.sendEmailToPartner && params.partnerEmail) {
      const emailSubject = params.emailSubject?.trim() || `Szerződés tervezet: ${params.title}`
      const emailBody =
        params.emailMessage?.trim() ||
        `Tisztelt Partnerünk!\n\nMellékelten megküldjük a(z) ${params.title} megállapodás hivatalos elektronikus példányát.\nIktatószám: ${iktatoszamToUse}/${nextAlszam}\n\nÜdvözlettel,\n${megbizo.nev}`

      const mailRes = await sendEmailWithAttachment({
        to: params.partnerEmail,
        subject: emailSubject,
        text: emailBody,
        attachments: [
          {
            filename: sanitizedFilename,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
        iratId: iratData.id,
        ugyiratId: ugyiratIdToUse || undefined,
        userId: user.id,
        saveToPartnerId: params.partnerId,
      })

      if (mailRes.success) {
        emailSent = true
        await supabase
          .from("irat")
          .update({
            kezbesites_statusz: "kezbesitve",
            kezbesites_ideje: new Date().toISOString(),
          })
          .eq("id", iratData.id)
      } else {
        console.warn("Szerződés e-mail kiküldési hiba:", mailRes.error)
      }
    }

    // PDF/A-2b háttérkonverzió sorba állítása
    if (fajlResult) {
      try {
        const { enqueuePdfaConversion } = await import("@/utils/ai-worker-service")
        await enqueuePdfaConversion(iratData.id, fajlResult.id, supabase)
      } catch (err) {
        console.warn("PDF/A sorba állítás hiba:", err)
      }
    }

    revalidatePath(`/partners/${params.partnerId}`)
    revalidatePath(`/dossiers/${ugyiratIdToUse}`)
    revalidatePath("/dossiers")
    revalidatePath("/partners")

    return {
      success: true,
      iratId: iratData.id,
      ugyiratId: ugyiratIdToUse || undefined,
      iktatoszam: `${iktatoszamToUse}/${nextAlszam}`,
      emailed: emailSent,
    }
  } catch (err: any) {
    console.error("Hiba a szerződés véglegesítésekor:", err)
    return { success: false, error: err.message || "Váratlan hiba történt a véglegesítés során." }
  }
}

export interface GenerateContractPreviewParams {
  title: string
  content: string
  effectiveDate?: string
  megbizo?: ContractParty
  megbizott?: ContractParty
}

/**
 * Azonnali PDF előnézet generálása a szerződés jelenlegi szerkesztett szövegéből.
 * Nem hoz létre adatbázis rekordot vagy iktatást, pusztán előállítja a valós A4-es PDF binárist base64 formátumban.
 */
export async function generateContractPdfPreviewAction(
  params: GenerateContractPreviewParams
): Promise<{
  success: boolean
  pdfDataUri?: string
  error?: string
}> {
  try {
    if (!params.content?.trim()) {
      return { success: false, error: "A szerződés tartalma üres." }
    }

    const rawLines = params.content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
    const sections: { number: number; title: string; paragraphs: string[] }[] = []
    let currentSection: { number: number; title: string; paragraphs: string[] } | null = null
    let sectionCount = 0

    for (const line of rawLines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      const sectionMatch = trimmed.match(/^([0-9]+|[IVXLCDM]+)[\.\)]\s+(.*)/i)
      if (sectionMatch) {
        if (currentSection && currentSection.paragraphs.length > 0) {
          sections.push(currentSection)
        }
        sectionCount++
        currentSection = {
          number: sectionCount,
          title: sectionMatch[2].trim(),
          paragraphs: [],
        }
      } else if (!currentSection) {
        sectionCount++
        currentSection = {
          number: sectionCount,
          title: "ÁLTALÁNOS RENDELKEZÉSEK",
          paragraphs: [trimmed],
        }
      } else {
        currentSection.paragraphs.push(trimmed)
      }
    }
    if (currentSection && currentSection.paragraphs.length > 0) {
      sections.push(currentSection)
    }

    if (sections.length === 0) {
      sections.push({
        number: 1,
        title: "SZERZŐDÉSI FELTÉTELEK",
        paragraphs: rawLines.filter((l) => l.trim().length > 0),
      })
    }

    const megbizo = params.megbizo || { ...DEFAULT_MEGBIZO_COMPANY }
    const megbizott = params.megbizott || {
      nev: "Partner",
      szekhely: "–",
      kepviselo: "–",
    }

    const pdfBuffer = await generateContractPdfBuffer({
      title: params.title.trim() || "Szerződéstervezet",
      contractType: "megallapodas",
      iktatoszam: "TERVEZET (NEM IKTATOTT)",
      megbizo,
      megbizott,
      sections,
      effectiveDate: params.effectiveDate || new Date().toISOString().split("T")[0],
    })

    const base64 = pdfBuffer.toString("base64")
    return {
      success: true,
      pdfDataUri: `data:application/pdf;base64,${base64}`,
    }
  } catch (err: any) {
    console.error("Hiba a PDF előnézet készítésekor:", err)
    return {
      success: false,
      error: err.message || "Váratlan hiba történt a PDF előnézet készítése során.",
    }
  }
}

