"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import {
  getActiveCompanyIdServer,
  getActiveCompanyMemberRolesServer,
} from "@/utils/company-server"
import {
  CompanyCareerPresentation,
  PresentationBriefingInput,
  PRESENTATION_VISUAL_THEMES,
  buildDefaultCompanyPresentation,
} from "@/utils/hr/career-presentation-types"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verifyPresentationAccess() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { allowed: false, error: "Nincs bejelentkezve", activeCompanyId: null, user: null }
  }

  const activeCompanyId = await getActiveCompanyIdServer()
  if (!activeCompanyId) {
    return { allowed: false, error: "Nincs kiválasztott vállalat", activeCompanyId: null, user }
  }

  const { hrRole, isCompanyAdmin } = await getActiveCompanyMemberRolesServer(activeCompanyId)
  if (!isCompanyAdmin && !["hr_munkatars", "hr_vezeto", "admin", "toborzo"].includes(hrRole)) {
    return {
      allowed: false,
      error: "Nincs jogosultságod a vállalati karrier-prezentáció szerkesztéséhez.",
      activeCompanyId,
      user,
    }
  }

  return { allowed: true, activeCompanyId, user }
}

/**
 * Intelligens determinisztikus prezentáció-építő (fallback ha nincs AI API kulcs, vagy ha az AI válasz részleges)
 */
function buildPresentationFromBriefing(
  companyName: string,
  companyAddress: string | null,
  briefing: PresentationBriefingInput
): CompanyCareerPresentation {
  const base = buildDefaultCompanyPresentation(
    companyName,
    companyAddress,
    briefing.visualTheme || "tech_ai"
  )
  const theme =
    PRESENTATION_VISUAL_THEMES[briefing.visualTheme] ||
    PRESENTATION_VISUAL_THEMES.tech_ai
  const locationShort = companyAddress
    ? companyAddress.split(",")[0].trim()
    : "Budapest"

  const cultureItems = briefing.cultureInput
    ? briefing.cultureInput
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  const perkItems = briefing.perksInput
    ? briefing.perksInput
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  return {
    ...base,
    updatedAt: new Date().toISOString(),
    briefing,
    heroSlide: {
      badgeText: `${companyName} — ${briefing.industry || "Vállalati Bemutatkozó"}`,
      headline: `Ismerd meg a(z) ${companyName} világát és építsük együtt a jövőt`,
      subheadline:
        briefing.missionInput ||
        base.heroSlide.subheadline,
      missionStatement:
        briefing.missionInput
          ? `${briefing.missionInput} Hiszünk abban, hogy a kiváló szakmai eredmények alapja az inspiráló munkakörnyezet, a kölcsönös bizalom és a folyamatos fejlődés.`
          : base.heroSlide.missionStatement,
      coverImageUrl: theme.coverImageUrl,
      stats: [
        {
          label: "Alapítás éve",
          value: briefing.foundedYear || "2021",
          sub: "Stabil, növekvő háttér",
        },
        {
          label: "Csapatméret",
          value: briefing.teamSize || "25–50 fő",
          sub: "Közvetlen szakmai közösség",
        },
        {
          label: "Központi iroda",
          value: locationShort,
          sub: companyAddress || "Korszerű irodai környezet",
        },
        {
          label: "Munkavégzés",
          value: briefing.workModel
            ? briefing.workModel.split("(")[0].trim()
            : "Hibrid",
          sub: briefing.workModel || "Rugalmas munkarend",
        },
      ],
    },
    cultureSlide: {
      ...base.cultureSlide,
      storyParagraph: briefing.cultureInput
        ? `A(z) ${companyName} csapatában a mindennapi munkát a következő alapelvek határozzák meg: ${briefing.cultureInput}`
        : base.cultureSlide.storyParagraph,
      featureImageUrl: theme.featureImageUrl,
      values:
        cultureItems.length >= 3
          ? cultureItems.slice(0, 4).map((item, idx) => ({
              title: item.charAt(0).toUpperCase() + item.slice(1),
              description:
                base.cultureSlide.values[idx]?.description ||
                "Mindennapi döntéseinket és szakmai együttműködésünket ez az alapérték vezérli.",
            }))
          : base.cultureSlide.values,
    },
    environmentSlide: {
      ...base.environmentSlide,
      gallery: theme.gallery,
    },
    perksSlide: {
      ...base.perksSlide,
      perkCategories:
        perkItems.length >= 2
          ? [
              {
                category: "Kiemelt vállalati juttatások",
                items: perkItems.slice(0, 4),
              },
              ...base.perksSlide.perkCategories.slice(1),
            ]
          : base.perksSlide.perkCategories,
    },
  }
}

/**
 * AI Vállalati Prezentáció Generáló Akció (Google Gemini 2.5 Flash)
 */
export async function generateCompanyPresentationWithAiAction(
  briefing: PresentationBriefingInput
): Promise<{
  success: boolean
  presentation?: CompanyCareerPresentation
  error?: string
}> {
  const auth = await verifyPresentationAccess()
  if (!auth.allowed || !auth.activeCompanyId) {
    return { success: false, error: auth.error || "Hozzáférés megtagadva" }
  }

  const adminClient = getAdminClient()
  const { data: comp } = await adminClient
    .from("companies")
    .select("id, name, address, career_presentation")
    .eq("id", auth.activeCompanyId)
    .single()

  const companyName = comp?.name || "Vállalatunk"
  const companyAddress = comp?.address || "Budapest"
  const fallbackPresentation = buildPresentationFromBriefing(
    companyName,
    companyAddress,
    briefing
  )

  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    return {
      success: true,
      presentation: fallbackPresentation,
    }
  }

  try {
    const { GoogleGenAI } = await import("@google/genai")
    const ai = new GoogleGenAI({ apiKey })

    const prompt = `Te egy nemzetközi szintű Employer Branding (munkáltatói márkaépítés) stratéga és prezentáció-tervező vagy az eaisyHR rendszerben.
Feladatod, hogy a megadott vállalati alapadatokból egy lenyűgöző, 5 fejezetből (slide-ból) álló magyar nyelvű karrier-prezentáció szöveges tartalmát állítsd össze a pályázók számára.

VÁLLALAT ADATAI:
- Vállalat neve: "${companyName}"
- Székhely / Iroda: "${companyAddress}"
- Iparág / Fő terület: "${briefing.industry}"
- Alapítás éve: "${briefing.foundedYear}"
- Csapatméret: "${briefing.teamSize}"
- Munkarend: "${briefing.workModel}"
- Küldetés / Mit épít a cég: "${briefing.missionInput}"
- Csapatkultúra / Hogyan dolgozunk: "${briefing.cultureInput}"
- Juttatások / Amit kínálunk: "${briefing.perksInput}"

Válaszolj KIZÁRÓLAG érvényes JSON formátumban (markdown kódblokk nélkül), az alábbi pontos struktúrában:
{
  "heroSlide": {
    "badgeText": "Rövid, elegáns kategória felirat (pl. ${companyName} — Iparág)",
    "headline": "Erőteljes, inspiráló főcím a vállalatról (max 90 karakter)",
    "subheadline": "1-2 mondatos összefoglaló a cég víziójáról",
    "missionStatement": "2-3 mondatos részletes, hiteles küldetésnyilatkozat arról, mit alkot a cég és miért érdemes csatlakozni."
  },
  "cultureSlide": {
    "sectionTitle": "Kultúránk és alapértékeink",
    "sectionSubtitle": "1 mondatos bevezető a csapatkultúráról",
    "storyParagraph": "2-3 mondatos bemutató arról, milyen a mindennapi hangulat és az együttműködés a(z) ${companyName} csapatában.",
    "values": [
      { "title": "1. Alapérték címe", "description": "1-2 mondatos konkrét kifejtés" },
      { "title": "2. Alapérték címe", "description": "1-2 mondatos konkrét kifejtés" },
      { "title": "3. Alapérték címe", "description": "1-2 mondatos konkrét kifejtés" },
      { "title": "4. Alapérték címe", "description": "1-2 mondatos konkrét kifejtés" }
    ]
  },
  "environmentSlide": {
    "sectionTitle": "Munkakörnyezet, Eszközök & Mindennapok",
    "sectionSubtitle": "1 mondatos összefoglaló a munkafeltételekről",
    "workflowDescription": "2 mondat arról, hogyan támogatja a cég a hatékony és kényelmes munkavégzést.",
    "techAndTools": [
      "1. konkrét eszköz / módszertan / munkakörnyezeti előny",
      "2. konkrét eszköz / módszertan / munkakörnyezeti előny",
      "3. konkrét eszköz / módszertan / munkakörnyezeti előny",
      "4. konkrét eszköz / módszertan / munkakörnyezeti előny"
    ]
  },
  "perksSlide": {
    "sectionTitle": "Juttatási csomag és fejlődési lehetőségek",
    "sectionSubtitle": "1 mondatos bevezető a juttatásokról",
    "perkCategories": [
      { "category": "Kompenzáció & Pénzügyi juttatások", "items": ["...", "...", "..."] },
      { "category": "Rugalmasság & Munkakörnyezet", "items": ["...", "...", "..."] },
      { "category": "Szakmai fejlődés & Gondoskodás", "items": ["...", "...", "..."] }
    ]
  },
  "closingSlide": {
    "headline": "Inspiráló záró felhívás a jelölteknek",
    "leadershipMessage": "2-3 mondatos személyes, közvetlen hangvételű üzenet a pályázóknak.",
    "leaderName": "HR & Vezetői Csapat",
    "leaderRole": "${companyName}",
    "callToActionText": "Tekintsd meg nyitott pozícióinkat vagy jelentkezz a Talent Poolba!"
  }
}

FONTOS SZABÁLYOK:
- Soha NE használj semmilyen emojit!
- Fogalmazz prémium, modern, hiteles üzleti nyelvezettel.`

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.65,
      },
    })

    const rawText = response.text?.trim() || ""
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim()

    const parsed = JSON.parse(cleaned)
    const theme =
      PRESENTATION_VISUAL_THEMES[briefing.visualTheme] ||
      PRESENTATION_VISUAL_THEMES.tech_ai

    const generatedPresentation: CompanyCareerPresentation = {
      published: true,
      updatedAt: new Date().toISOString(),
      briefing,
      heroSlide: {
        badgeText: parsed.heroSlide?.badgeText || fallbackPresentation.heroSlide.badgeText,
        headline: parsed.heroSlide?.headline || fallbackPresentation.heroSlide.headline,
        subheadline:
          parsed.heroSlide?.subheadline || fallbackPresentation.heroSlide.subheadline,
        missionStatement:
          parsed.heroSlide?.missionStatement ||
          fallbackPresentation.heroSlide.missionStatement,
        coverImageUrl: theme.coverImageUrl,
        stats: fallbackPresentation.heroSlide.stats,
      },
      cultureSlide: {
        sectionTitle:
          parsed.cultureSlide?.sectionTitle ||
          fallbackPresentation.cultureSlide.sectionTitle,
        sectionSubtitle:
          parsed.cultureSlide?.sectionSubtitle ||
          fallbackPresentation.cultureSlide.sectionSubtitle,
        storyParagraph:
          parsed.cultureSlide?.storyParagraph ||
          fallbackPresentation.cultureSlide.storyParagraph,
        featureImageUrl: theme.featureImageUrl,
        values:
          Array.isArray(parsed.cultureSlide?.values) &&
          parsed.cultureSlide.values.length > 0
            ? parsed.cultureSlide.values
            : fallbackPresentation.cultureSlide.values,
      },
      environmentSlide: {
        sectionTitle:
          parsed.environmentSlide?.sectionTitle ||
          fallbackPresentation.environmentSlide.sectionTitle,
        sectionSubtitle:
          parsed.environmentSlide?.sectionSubtitle ||
          fallbackPresentation.environmentSlide.sectionSubtitle,
        workflowDescription:
          parsed.environmentSlide?.workflowDescription ||
          fallbackPresentation.environmentSlide.workflowDescription,
        techAndTools:
          Array.isArray(parsed.environmentSlide?.techAndTools) &&
          parsed.environmentSlide.techAndTools.length > 0
            ? parsed.environmentSlide.techAndTools
            : fallbackPresentation.environmentSlide.techAndTools,
        gallery: theme.gallery,
      },
      perksSlide: {
        sectionTitle:
          parsed.perksSlide?.sectionTitle || fallbackPresentation.perksSlide.sectionTitle,
        sectionSubtitle:
          parsed.perksSlide?.sectionSubtitle ||
          fallbackPresentation.perksSlide.sectionSubtitle,
        perkCategories:
          Array.isArray(parsed.perksSlide?.perkCategories) &&
          parsed.perksSlide.perkCategories.length > 0
            ? parsed.perksSlide.perkCategories
            : fallbackPresentation.perksSlide.perkCategories,
      },
      closingSlide: {
        headline:
          parsed.closingSlide?.headline || fallbackPresentation.closingSlide.headline,
        leadershipMessage:
          parsed.closingSlide?.leadershipMessage ||
          fallbackPresentation.closingSlide.leadershipMessage,
        leaderName:
          parsed.closingSlide?.leaderName || fallbackPresentation.closingSlide.leaderName,
        leaderRole:
          parsed.closingSlide?.leaderRole || fallbackPresentation.closingSlide.leaderRole,
        callToActionText:
          parsed.closingSlide?.callToActionText ||
          fallbackPresentation.closingSlide.callToActionText,
      },
    }

    return {
      success: true,
      presentation: generatedPresentation,
    }
  } catch (err) {
    console.warn("Gemini prezentáció generálás fallback:", err)
    return {
      success: true,
      presentation: fallbackPresentation,
    }
  }
}

/**
 * Vállalati karrier-prezentáció mentése az aktív céghez (companies.career_presentation)
 */
export async function saveCompanyPresentationAction(
  presentation: CompanyCareerPresentation
): Promise<{ success: boolean; error?: string }> {
  const auth = await verifyPresentationAccess()
  if (!auth.allowed || !auth.activeCompanyId || !auth.user) {
    return { success: false, error: auth.error || "Hozzáférés megtagadva" }
  }

  const adminClient = getAdminClient()
  const updatedPayload: CompanyCareerPresentation = {
    ...presentation,
    updatedAt: new Date().toISOString(),
  }

  const { error } = await adminClient
    .from("companies")
    .update({ career_presentation: updatedPayload })
    .eq("id", auth.activeCompanyId)

  if (error) {
    console.error("Hiba a vállalati prezentáció mentésekor:", error)
    return { success: false, error: error.message }
  }

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: auth.user.id,
    modul: "toborzas",
    esemeny_tipus: "adat_modositas",
    entitas_tipus: "companies",
    entitas_id: auth.activeCompanyId,
    megjegyzes: "Vállalati karrier-prezentáció (Cégünkről) frissítve és publikálva",
    company_id: auth.activeCompanyId,
  })

  revalidatePath("/hr/recruitment")
  revalidatePath("/karrier")

  return { success: true }
}

/**
 * A vállalati „Cégünkről" prezentáció végleges törlése (visszaállítás a varázsló alapállapotba)
 */
export async function deleteCompanyPresentationAction(): Promise<{
  success: boolean
  error?: string
}> {
  const auth = await verifyPresentationAccess()
  if (!auth.allowed || !auth.activeCompanyId || !auth.user) {
    return { success: false, error: auth.error || "Hozzáférés megtagadva" }
  }

  const adminClient = getAdminClient()
  const { error } = await adminClient
    .from("companies")
    .update({ career_presentation: null })
    .eq("id", auth.activeCompanyId)

  if (error) {
    console.error("Hiba a vállalati prezentáció törlésekor:", error)
    return { success: false, error: error.message }
  }

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: auth.user.id,
    modul: "toborzas",
    esemeny_tipus: "adat_torles",
    entitas_tipus: "companies",
    entitas_id: auth.activeCompanyId,
    megjegyzes: "Vállalati karrier-prezentáció (Cégünkről) törölve és levéve a Karrieroldalról",
    company_id: auth.activeCompanyId,
  })

  revalidatePath("/hr/recruitment")
  revalidatePath("/karrier")

  return { success: true }
}

/**
 * Saját irodai / csapatfotó feltöltése a prezentációhoz
 */
export async function uploadCompanyPresentationImageAction(
  formData: FormData
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const auth = await verifyPresentationAccess()
  if (!auth.allowed || !auth.activeCompanyId) {
    return { success: false, error: auth.error || "Hozzáférés megtagadva" }
  }

  const file = formData.get("file") as File | null
  if (!file || file.size === 0) {
    return { success: false, error: "Nem választottál ki képfájlt!" }
  }

  if (file.size > 8 * 1024 * 1024) {
    return { success: false, error: "A kép mérete nem haladhatja meg a 8 MB-ot!" }
  }

  const cleanName = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")

  const storagePath = `companies/${auth.activeCompanyId}/career_${Date.now()}_${cleanName}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const adminClient = getAdminClient()

  const { error: uploadError } = await adminClient.storage
    .from("avatars")
    .upload(storagePath, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    })

  if (uploadError) {
    console.error("Hiba a kép feltöltésekor:", uploadError)
    return { success: false, error: "Nem sikerült feltölteni a képet: " + uploadError.message }
  }

  const { data: pub } = adminClient.storage.from("avatars").getPublicUrl(storagePath)

  return {
    success: true,
    imageUrl: pub.publicUrl,
  }
}
