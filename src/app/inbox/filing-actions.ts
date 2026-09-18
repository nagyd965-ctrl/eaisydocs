"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

export async function fileIncomingDocument(formData: FormData) {
  const supabase = await createClient()

  const mode = (formData.get("mode") as "new" | "existing") || "new"
  const irat_id = formData.get("irat_id") as string
  
  if (!irat_id) return { error: "Hiányzó irat azonosító." }

  const ev = new Date().getFullYear()
  let ugyiratIdToUse = "";
  let iktatoszam = "";
  let alszam = 1;

  // Közös metaadatok kiolvasása
  const targy = (formData.get("targy") as string)?.trim() || ""
  const dokumentum_tipus = (formData.get("dokumentum_tipus") as string)?.trim() || ""
  let kuldo_partner_id = (formData.get("kuldo_partner_id") as string)?.trim() || ""
  const partner_nev = (formData.get("partner_nev") as string)?.trim() || ""
  const partner_adoszam = (formData.get("partner_adoszam") as string)?.trim() || ""
  const hivatkozott_szam = (formData.get("hivatkozott_szam") as string)?.trim() || ""
  const hatarido = (formData.get("hatarido") as string)?.trim() || ""

  // 0. Double-filing concurrency check: ensure document is still unfiled
  const { data: checkIrat } = await supabase
    .from("irat")
    .select("id, ugyirat_id")
    .eq("id", irat_id)
    .single()

  if (checkIrat?.ugyirat_id) {
    return { error: "Ezt az iratot már egy másik felhasználó vagy folyamat iktatta!" }
  }

  // Partner kezelése: ha van partner_nev vagy partner_adoszam, de nincs kuldo_partner_id, megkeressük vagy létrehozzuk
  if (!kuldo_partner_id && (partner_nev || partner_adoszam)) {
    try {
      const { findOrCreatePartner } = await import("@/utils/partner-matcher")
      const pRes = await findOrCreatePartner(supabase, { 
        nev: partner_nev || "Ismeretlen partner", 
        adoszam: partner_adoszam || null,
        tipus: "ceg" 
      })
      if (pRes?.id) {
        kuldo_partner_id = pRes.id
      }
    } catch (pErr) {
      console.warn("[Filing] Partner automatikus rögzítési hiba:", pErr)
    }
  } else if (kuldo_partner_id && partner_adoszam) {
    try {
      const { normalizeAdoszam } = await import("@/utils/partner-matcher")
      const normalized = normalizeAdoszam(partner_adoszam)
      await supabase.from("partner").update({ adoszam: normalized }).eq("id", kuldo_partner_id).is("adoszam", null)
    } catch (pErr) {
      console.warn("[Filing] Partner adószám pótlási hiba:", pErr)
    }
  }

  if (mode === "new") {
    const ugytipus_id = (formData.get("ugytipus_id") || formData.get("irattari_terv_id")) as string
    const prefix = (formData.get("prefix") as string) || "NYILV"
    const department_id = formData.get("department_id") as string

    if (!targy || !ugytipus_id || !department_id) {
      return { error: "Minden mező kitöltése kötelező új ügyirat esetén (Tárgy, Tételszám, Osztály)!" }
    }

    const { data: ugyszam, error: ugyszamError } = await supabase.rpc('generate_ugyszam', { p_ev: ev, p_prefix: prefix })
    if (ugyszamError) return { error: "Hiba az ügyszám generálásakor." }

    const ugyInsertData: Record<string, any> = {
      ugyszam,
      targy,
      ugytipus_id,
      statusz: "folyamatban"
    }
    if (hatarido) {
      ugyInsertData.hatarido = hatarido
    }

    const { data: ugyData, error: ugyError } = await supabase
      .from("ugy")
      .insert(ugyInsertData)
      .select("id")
      .single()
    if (ugyError || !ugyData) return { error: "Hiba az ügy létrehozásakor: " + (ugyError?.message || "") }

    const { data: iktatoszamData, error: iktatoszamError } = await supabase.rpc('generate_iktatoszam', { p_ev: ev, p_prefix: prefix })
    if (iktatoszamError) return { error: "Hiba az iktatószám generálásakor." }
    iktatoszam = iktatoszamData

    const { data: ugyiratData, error: ugyiratError } = await supabase
      .from("ugyirat")
      .insert({
        ugy_id: ugyData.id,
        iktatoszam,
        irattari_tetel_id: ugytipus_id,
        statusz: "iktatva",
        szervezeti_egyseg_id: department_id
      })
      .select("id")
      .single()
    if (ugyiratError || !ugyiratData) return { error: "Hiba az ügyirat létrehozásakor: " + (ugyiratError?.message || "") }
    
    ugyiratIdToUse = ugyiratData.id;
    alszam = 1;

  } else {
    // Existing dossier
    ugyiratIdToUse = formData.get("existing_ugyirat_id") as string
    if (!ugyiratIdToUse) return { error: "Nincs kiválasztva ügyirat!" }

    // Fetch existing ugyirat to get its iktatószám and ugy_id
    const { data: existingDossier, error: dossierError } = await supabase
      .from("ugyirat")
      .select("id, iktatoszam, ugy_id")
      .eq("id", ugyiratIdToUse)
      .single()
    if (dossierError || !existingDossier) return { error: "A kiválasztott ügyirat nem található." }
    iktatoszam = existingDossier.iktatoszam

    // Calculate max alszam
    const { data: iratok, error: iratokError } = await supabase
      .from("irat")
      .select("alszam")
      .eq("ugyirat_id", ugyiratIdToUse)
    
    if (iratokError) return { error: "Hiba az alszám kiszámításakor." }
    
    const maxAlszam = iratok?.reduce((max, i) => Math.max(max, i.alszam || 0), 0) || 0
    alszam = maxAlszam + 1

    // Ha van határidő megadva és a meglévő ügyhöz nincs vagy frissíteni szeretnénk
    if (hatarido && existingDossier.ugy_id) {
      await supabase.from("ugy").update({ hatarido }).eq("id", existingDossier.ugy_id)
    }
  }

  // Update Irat with ugyirat_id, alszam, partner, targy and leiras
  const iratUpdateData: Record<string, any> = { 
    ugyirat_id: ugyiratIdToUse, 
    alszam 
  }
  if (targy) {
    iratUpdateData.targy = targy
  }
  if (kuldo_partner_id) {
    iratUpdateData.kuldo_partner_id = kuldo_partner_id
  }

  if (dokumentum_tipus || hivatkozott_szam) {
    const tipusLabels: Record<string, string> = {
      szerzodes: "Szerződés",
      szamla: "Számla",
      hatosagi_level: "Hatósági levél",
      beadvany: "Beadvány",
      igazolas: "Igazolás",
      egyeb: "Egyéb irat"
    }
    const tipusStr = tipusLabels[dokumentum_tipus] || dokumentum_tipus || "Irat"
    iratUpdateData.leiras = `[Típus: ${tipusStr}]${hivatkozott_szam ? ` [Hiv: ${hivatkozott_szam}]` : ""}`
  }

  const { error: iratUpdateError } = await supabase
    .from("irat")
    .update(iratUpdateData)
    .eq("id", irat_id);
  
  if (iratUpdateError) return { error: "Hiba az irat frissítésekor: " + iratUpdateError.message };

  // Ha van hivatkozott szám, rögzítünk egy kapcsolatot is
  if (hivatkozott_szam) {
    try {
      const entitasTipus = dokumentum_tipus === "szamla" ? "szamla" : (dokumentum_tipus === "szerzodes" ? "szerzodes" : "partner")
      await supabase.from("irat_kapcsolat").insert({
        irat_id,
        ugyirat_id: ugyiratIdToUse,
        entitas_tipus: entitasTipus,
        entitas_id: hivatkozott_szam,
        entitas_forras: "belso",
        kapcsolat_tipusa: "hivatkozas"
      })
    } catch (kapcsErr) {
      console.warn("[Filing] Irat kapcsolat rögzítési hiba:", kapcsErr)
    }
  }

  // Audit naplózás (append-only)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const { getClientInfo } = await import("@/utils/client-info")
    const { ip, userAgent } = await getClientInfo()
    await supabase.from("esemeny_naplo").insert({
      entitas_tipus: "irat",
      entitas_id: irat_id,
      esemeny_tipus: "iktatva",
      user_id: user?.id || null,
      ip_cim: ip,
      user_agent: userAgent,
      indoklas: `Iktatva a(z) ${iktatoszam} ügyiratra (${alszam}. alszám). Tárgy: ${targy || "N/A"}`
    })
  } catch (auditErr) {
    console.warn("[Filing] Audit napló bejegyzési hiba:", auditErr)
  }
  
  // Queue embedding refresh and saved search alerts via persistent ai_feladat_sor
  try {
    await supabase
      .from("ai_feladat_sor")
      .upsert({
        irat_id,
        feladat_tipus: "embedding",
        statusz: "fuggoben",
        kovetkezo_futtatas: new Date().toISOString()
      }, { onConflict: "irat_id,feladat_tipus" })
  } catch (qErr) {
    console.warn("[Filing] Error queueing embedding in ai_feladat_sor:", qErr)
  }

  // Queue PDF/A conversion for files if not already converted
  try {
    const { data: fajlok } = await supabase
      .from("irat_fajl")
      .select("id, pdfa_path")
      .eq("irat_id", irat_id)

    if (fajlok && fajlok.length > 0) {
      const { enqueuePdfaConversion } = await import("@/utils/ai-worker-service")
      for (const f of fajlok) {
        if (!f.pdfa_path) {
          await enqueuePdfaConversion(irat_id, f.id, supabase)
        }
      }
    }
  } catch (pdfaQueueErr) {
    console.warn("[Filing] PDF/A sorba állítási hiba:", pdfaQueueErr)
  }

  // Trigger saved search notifications for newly filed or updated document
  (async () => {
    try {
      const { checkSavedSearchesForNewIrat } = await import("@/utils/saved-search-alerts")
      await checkSavedSearchesForNewIrat(irat_id, supabase)
    } catch (alertErr) {
      console.warn("[Filing] Saved search alert processing error:", alertErr)
    }
  })().catch(console.error)

  revalidatePath("/inbox")
  revalidatePath(`/inbox/${irat_id}`)
  revalidatePath(`/dossiers/${ugyiratIdToUse}`)
  revalidatePath("/dossiers")
  return { success: true }
}

export interface AISuggestionsResult {
  success: boolean
  error?: string
  suggestions?: {
    targy: string
    dokumentum_tipus: string
    partner_id: string
    partner_nev: string
    partner_adoszam: string
    hivatkozott_szam: string
    hatarido: string
    department_id: string
    irattari_tetel_id: string
    indoklas: string
    elozmeny_ugyirat_id?: string
    elozmeny_iktatoszam?: string
    confidence_score?: number
  }
}

export async function executeAiMetadataExtraction(iratId: string, customSupabase?: any): Promise<AISuggestionsResult> {
  const supabase = customSupabase || (await createClient())

  // 1. Lekérjük az iratot és a kapcsolódó fájlokat
  const { data: irat } = await supabase
    .from("irat")
    .select(`
      id,
      targy,
      kulso_forras,
      kulso_hivatkozas_id,
      kuldo_partner_id,
      partner ( id, nev, adoszam )
    `)
    .eq("id", iratId)
    .single()

  if (!irat) {
    return { success: false, error: "Az irat nem található." }
  }

  const { data: files } = await supabase
    .from("irat_fajl")
    .select("id, storage_path, kulso_fajl_url, mime_type, eredeti_fajlnev, ocr_szoveg")
    .eq("irat_id", iratId)

  // 2. Fájl letöltése és szöveg kinyerése hibrid OCR segítségével
  let docText = ""
  let fileBase64: string | null = null
  let fileMime = "application/pdf"
  const firstFile = files?.[0]

  if (firstFile) {
    let fileBuf: Buffer | null = null

    if (firstFile.kulso_fajl_url) {
      try {
        const res = await fetch(firstFile.kulso_fajl_url)
        if (res.ok) {
          fileBuf = Buffer.from(await res.arrayBuffer())
        }
      } catch (err) {
        console.warn("[AISuggest] Nem sikerült letölteni a külső fájlt:", err)
      }
    } else if (firstFile.storage_path && !firstFile.storage_path.startsWith("eaisybill:")) {
      try {
        const { data: fileData } = await supabase.storage.from("irat_files").download(firstFile.storage_path)
        if (fileData) {
          fileBuf = Buffer.from(await fileData.arrayBuffer())
        }
      } catch (err) {
        console.warn("[AISuggest] Nem sikerült storage-ból letölteni a fájlt:", err)
      }
    }

    if (fileBuf) {
      fileMime = firstFile.mime_type || (firstFile.eredeti_fajlnev.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg")
      
      const { extractDocumentText } = await import("@/utils/document-ocr")
      const ocrResult = await extractDocumentText(fileBuf, fileMime, firstFile.eredeti_fajlnev)
      docText = ocrResult.text || ""

      // Ha a fájl mérete ésszerű (< 10MB), átadjuk base64-ként is Vision LLM-nek
      if (fileBuf.length < 10 * 1024 * 1024) {
        fileBase64 = fileBuf.toString("base64")
      }

      // Ha eddig nem volt érvényes OCR szöveg, frissítjük az adatbázisban a kereshetőséghez
      if (docText && docText.trim() && (!firstFile.ocr_szoveg || firstFile.ocr_szoveg.includes("DEMO OCR SZÖVEG"))) {
        await supabase.from("irat_fajl").update({ ocr_szoveg: docText }).eq("id", firstFile.id)
      }
    }
  }

  // Ha korábbról volt érvényes OCR szöveg
  if (!docText) {
    const existingWithOcr = files?.find((f: any) => f.ocr_szoveg && !f.ocr_szoveg.includes("DEMO OCR SZÖVEG"))
    if (existingWithOcr?.ocr_szoveg) {
      docText = existingWithOcr.ocr_szoveg
    }
  }

  // 3. Lekérjük a dinamikus törzsadatokat (Szervezeti Egységek, Irattári Terv, Partnerek)
  const { data: departments } = await supabase
    .from("szervezeti_egyseg")
    .select("id, nev, iktato_prefix")
    .order("nev")

  const { data: tervek } = await supabase
    .from("irattari_terv")
    .select("id, tetelszam, megnevezes")
    .order("tetelszam")

  const { data: partners } = await supabase
    .from("partner")
    .select("id, nev, adoszam")
    .order("nev")

  const deptsList = departments || []
  const plansList = tervek || []
  const partnersList = partners || []

  // 4. LLM entitás- és mezőkinyerés Gemini 2.5 Flash segítségével
  let aiResult: any = null
  const googleApiKey = process.env.GOOGLE_API_KEY

  if (googleApiKey) {
    try {
      const { GoogleGenAI } = await import("@google/genai")
      const ai = new GoogleGenAI({ apiKey: googleApiKey })

      const prompt = `Te egy magyar elektronikus iratkezelő rendszer (eaisyDocs) automatikus dokumentum-osztályozó és metaadat-kinyerő mesterséges intelligenciája vagy.
Feladatod: elemezd a beérkezett dokumentum tartalmát (a csatolt PDF/képet vagy kinyert szövegét) és metaadatait.
Különös pontossággal olvasd ki az alábbi kötelező mezőket:
1. "targy": Hivatalos, tömör magyar ügyirat tárgy (pl. "Munkaszerződés - Kovács Béla", vagy "Szolgáltatási keretszerződés - Telekom Nyrt.", vagy "NAV határozat adóügyben").
2. "dokumentum_tipus": Az alábbiak egyike pontosan: "szerzodes" | "szamla" | "hatosagi_level" | "beadvany" | "igazolas" | "egyeb".
3. "partner_nev": A feladó, küldő vagy kibocsátó partner / szervezet / személy hivatalos neve.
4. "partner_adoszam": Ha szerepel, a partner adószáma (pl. "12345678-1-42" vagy 8 számjegy).
5. "hivatkozott_szam": Ha a dokumentumban szerepel korábbi iktatószám, ügyszám, szerződésszám vagy határozatszám, azt olvasd ki pontosan (pl. "SZERZ-2025/11", "NAV/2026/9876", "2026/00012").
6. "hatarido": Ha a dokumentum konkrét teljesítési, fizetési vagy jogorvoslati/válaszadási határidőt tartalmaz, azt YYYY-MM-DD formátumban add meg. Ha nincs konkrét határidő, értéke legyen null.
7. "department_id": A legmegfelelőbb Szervezeti Egység ID-ja az alábbi listából.
8. "irattari_tetel_id": A legmegfelelőbb Irattári Tételszám ID-ja az alábbi listából.
9. "indoklas": 1-2 mondatos magyar indoklás a kiválasztott típusokról és kinyert adatokról.

ELÉRHETŐ SZERVEZETI EGYSÉGEK:
${deptsList.map((d: any) => `- ID: "${d.id}", Név: "${d.nev}"`).join("\n")}

ÉRVÉNYES IRATTÁRI TERV TÉTELEI:
${plansList.map((p: any) => `- ID: "${p.id}", Tételszám: "${p.tetelszam}", Megnevezés: "${p.megnevezes}"`).join("\n")}

ISMERT PARTNEREK ÍZELÍTŐ:
${partnersList.slice(0, 30).map((p: any) => `- Név: "${p.nev}"${p.adoszam ? `, Adószám: "${p.adoszam}"` : ""}`).join("\n")}

ÉRKEZTETÉSI ADATOK:
- Rögzített tárgy: ${irat.targy || "Nincs"}
- Rögzített partner: ${(irat.partner as any)?.nev || "Nincs"}
- Eredeti fájlnév: ${firstFile?.eredeti_fajlnev || "dokumentum.pdf"}
${docText ? `\nDOKUMENTUMBÓL KINYERT SZÖVEG:\n"""\n${docText.slice(0, 10000)}\n"""` : ""}

Kizárólag érvényes JSON formátumban válaszolj az alábbi kulcsokkal:
{
  "targy": string,
  "dokumentum_tipus": "szerzodes" | "szamla" | "hatosagi_level" | "beadvany" | "igazolas" | "egyeb",
  "partner_nev": string | null,
  "partner_adoszam": string | null,
  "hivatkozott_szam": string | null,
  "hatarido": string | null,
  "department_id": string,
  "irattari_tetel_id": string,
  "indoklas": string
}`

      const contents: any[] = [prompt]
      if (fileBase64) {
        contents.push({
          inlineData: {
            mimeType: fileMime,
            data: fileBase64
          }
        })
      }

      const res = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          responseMimeType: "application/json"
        }
      })

      if (res.text) {
        aiResult = JSON.parse(res.text)
      }
    } catch (llmErr) {
      console.warn("[AISuggest] Gemini AI kivonatolási hiba, heurisztikus tartalék aktiválása:", llmErr)
    }
  }

  // 5. Intelligens szabályalapú tartalék (fallback)
  if (!aiResult) {
    const textLower = docText.toLowerCase()
    let suggestedTargy = irat?.targy || "Beérkező irat"
    let suggestedDeptId = deptsList[0]?.id || ""
    let suggestedPlanId = plansList[0]?.id || ""
    let suggestedType: "szerzodes" | "szamla" | "hatosagi_level" | "beadvany" | "igazolas" | "egyeb" = "egyeb"
    let extractedHatarido: string | null = null
    let extractedHivSzam: string | null = null

    // Dátum és határidő keresés regex-szel (pl. 2026.04.15 vagy 2026-04-15)
    const deadlineMatch = docText.match(/(?:határidő|esedékesség|fizetési határidő|teljesítési határidő)[:\s]+(\d{4})[.-](\d{2})[.-](\d{2})/i)
    if (deadlineMatch) {
      extractedHatarido = `${deadlineMatch[1]}-${deadlineMatch[2]}-${deadlineMatch[3]}`
    }

    // Hivatkozási szám keresés
    const refMatch = docText.match(/(?:iktatószám|szerződésszám|ügyszám|határozatszám|számlaszám)[:\s]+([A-Z0-9\-_/]+)/i)
    if (refMatch) {
      extractedHivSzam = refMatch[1]
    }

    if (textLower.includes("munkaszerz") || textLower.includes("munkaviszony") || textLower.includes("munkavállaló")) {
      suggestedType = "szerzodes"
      suggestedTargy = "Munkaszerződés"
      const hrDept = deptsList.find((d: any) => d.nev.toLowerCase().includes("hr") || d.nev.toLowerCase().includes("humán"))
      if (hrDept) suggestedDeptId = hrDept.id
      const hrPlan = plansList.find((p: any) => p.megnevezes.toLowerCase().includes("hr") || p.megnevezes.toLowerCase().includes("munkaügy"))
      if (hrPlan) suggestedPlanId = hrPlan.id
    } else if (textLower.includes("számla") || textLower.includes("szamla") || textLower.includes("invoice") || textLower.includes("díjbekérő")) {
      suggestedType = "szamla"
      suggestedTargy = "Bejövő számla"
      const finDept = deptsList.find((d: any) => d.nev.toLowerCase().includes("pénz") || d.nev.toLowerCase().includes("számv"))
      if (finDept) suggestedDeptId = finDept.id
      const finPlan = plansList.find((p: any) => p.megnevezes.toLowerCase().includes("számla") || p.megnevezes.toLowerCase().includes("pénzügy"))
      if (finPlan) suggestedPlanId = finPlan.id
    } else if (textLower.includes("szerződés") || textLower.includes("megállapodás")) {
      suggestedType = "szerzodes"
      suggestedTargy = "Szerződés"
      const contractPlan = plansList.find((p: any) => p.megnevezes.toLowerCase().includes("szerződés") || p.megnevezes.toLowerCase().includes("jogi"))
      if (contractPlan) suggestedPlanId = contractPlan.id
    } else if (textLower.includes("határozat") || textLower.includes("végzés") || textLower.includes("nav")) {
      suggestedType = "hatosagi_level"
      suggestedTargy = "Hatósági megkeresés / végzés"
      const legalDept = deptsList.find((d: any) => d.nev.toLowerCase().includes("jogi"))
      if (legalDept) suggestedDeptId = legalDept.id
    }

    aiResult = {
      targy: suggestedTargy,
      dokumentum_tipus: suggestedType,
      partner_nev: (irat?.partner as any)?.nev || null,
      partner_adoszam: (irat?.partner as any)?.adoszam || null,
      hivatkozott_szam: extractedHivSzam,
      hatarido: extractedHatarido,
      department_id: suggestedDeptId,
      irattari_tetel_id: suggestedPlanId,
      indoklas: "Automatikus szabályalapú szövegelemzés és kinyerés."
    }
  }

  // 6. Partner beazonosítása adatbázisból (Adószám vagy normalizált név alapján)
  let matchedPartnerId = (irat.partner as any)?.id || irat.kuldo_partner_id || ""
  let partnerNevToUse = aiResult.partner_nev || (irat.partner as any)?.nev || ""

  const cleanTax = (tax?: string | null) => tax?.replace(/[-\s]/g, "") || ""
  const { normalizePartnerName } = await import("@/utils/partner-matcher")

  if (aiResult.partner_adoszam) {
    const foundByTax = partnersList.find((p: any) => p.adoszam && cleanTax(p.adoszam) === cleanTax(aiResult.partner_adoszam))
    if (foundByTax) {
      matchedPartnerId = foundByTax.id
      partnerNevToUse = foundByTax.nev
    }
  }

  if (!matchedPartnerId && partnerNevToUse) {
    const normalizedAiName = normalizePartnerName(partnerNevToUse)
    const foundByName = partnersList.find((p: any) => normalizePartnerName(p.nev) === normalizedAiName)
    if (foundByName) {
      matchedPartnerId = foundByName.id
      partnerNevToUse = foundByName.nev
    }
  }

  // 7. Előzmény-ügyirat detektálása hivatkozott szám vagy előzményminták alapján
  let elozmenyUgyiratId: string | undefined
  let elozmenyIktatoszam: string | undefined
  let antecedentConfidence: number | undefined

  if (aiResult.hivatkozott_szam) {
    const { data: matchedDossier } = await supabase
      .from("ugyirat")
      .select("id, iktatoszam")
      .ilike("iktatoszam", `%${aiResult.hivatkozott_szam.trim()}%`)
      .limit(1)
      .maybeSingle()

    if (matchedDossier) {
      elozmenyUgyiratId = matchedDossier.id
      elozmenyIktatoszam = matchedDossier.iktatoszam
      antecedentConfidence = 95
    }
  }

  if (!elozmenyUgyiratId) {
    const { findAntecedentSuggestion } = await import("@/utils/antecedent-matcher")
    const match = await findAntecedentSuggestion(iratId, supabase)
    if (match && match.confidence_score >= 50 && match.ugyirat_id) {
      elozmenyUgyiratId = match.ugyirat_id
      elozmenyIktatoszam = match.iktatoszam || undefined
      antecedentConfidence = match.confidence_score
    }
  }

  // 8. Osztály és Irattári tétel validáció
  const validDept = deptsList.find((d: any) => d.id === aiResult.department_id) || deptsList[0]
  const validPlan = plansList.find((p: any) => p.id === aiResult.irattari_tetel_id) || plansList[0]

  return {
    success: true,
    suggestions: {
      targy: aiResult.targy || irat?.targy || "Beérkező irat",
      dokumentum_tipus: aiResult.dokumentum_tipus || "egyeb",
      partner_id: matchedPartnerId,
      partner_nev: partnerNevToUse,
      partner_adoszam: aiResult.partner_adoszam || "",
      hivatkozott_szam: aiResult.hivatkozott_szam || "",
      hatarido: aiResult.hatarido || "",
      department_id: validDept?.id || "",
      irattari_tetel_id: validPlan?.id || "",
      indoklas: aiResult.indoklas || "AI besorolás és metaadat-kinyerés elkészült.",
      elozmeny_ugyirat_id: elozmenyUgyiratId,
      elozmeny_iktatoszam: elozmenyIktatoszam,
      confidence_score: antecedentConfidence
    }
  }
}

export async function generateAISuggestions(iratId: string): Promise<AISuggestionsResult> {
  const supabase = await createClient()

  // 1. Gyors ellenőrzés: Van-e már előre kiszámolt eredmény az ai_feladat_sor-ban?
  try {
    const { data: cachedTask } = await supabase
      .from("ai_feladat_sor")
      .select("eredmeny, statusz")
      .eq("irat_id", iratId)
      .eq("feladat_tipus", "ai_metadata_extraction")
      .eq("statusz", "kesz")
      .maybeSingle()

    if (cachedTask?.eredmeny) {
      return {
        success: true,
        suggestions: cachedTask.eredmeny
      }
    }
  } catch (cErr) {
    console.warn("[AISuggest] Cache olvasási hiba:", cErr)
  }

  // 2. Ha nincs cache, futtatjuk a kinyerést on-demand
  const result = await executeAiMetadataExtraction(iratId, supabase)

  // 3. Mentjük a gyorsítótárba a jövőbeli lekérdezésekhez
  if (result.success && result.suggestions) {
    try {
      await supabase
        .from("ai_feladat_sor")
        .upsert({
          irat_id: iratId,
          feladat_tipus: "ai_metadata_extraction",
          statusz: "kesz",
          eredmeny: result.suggestions,
          kovetkezo_futtatas: new Date().toISOString()
        }, { onConflict: "irat_id,feladat_tipus" })
    } catch (saveErr) {
      console.warn("[AISuggest] Cache mentési hiba:", saveErr)
    }
  }

  return result
}

/**
 * Lekéri az automatikus előzmény-ügyirat javaslatot az adott beérkező irathoz.
 */
export async function getAntecedentSuggestionAction(iratId: string) {
  const supabase = await createClient()
  const { findAntecedentSuggestion } = await import("@/utils/antecedent-matcher")
  return await findAntecedentSuggestion(iratId, supabase)
}

/**
 * Egykattintásos ügyirat-összerendelés:
 * A beérkező iratot a megadott előzmény-ügyirathoz kapcsolja a következő szabad alszámként
 * atomi adatbázis-tranzakcióban (attach_irat_to_dossier_atomic).
 */
export async function quickAttachToDossier(iratId: string, ugyiratId: string, indoklasText?: string) {
  const supabase = await createClient()

  if (!iratId || !ugyiratId) {
    return { error: "Hiányzó irat vagy ügyirat azonosító." }
  }

  // 1. Felhasználó és jogosultság ellenőrzése
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Nincs bejelentkezett felhasználó." }
  }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor")
    .eq("id", user.id)
    .single()

  const role = profile?.docs_szerepkor || "ugyintezo"
  if (role === "betekinto") {
    return { error: "Betekintő jogosultsággal nem végezhető összerendelés." }
  }

  // 2. Atomi Postgres RPC hívása: sorzárolás, alszám kalkuláció, audit napló, feladatsorba ütemezés
  const { data: rpcResult, error: rpcError } = await supabase.rpc("attach_irat_to_dossier_atomic", {
    p_irat_id: iratId,
    p_ugyirat_id: ugyiratId,
    p_user_id: user.id,
    p_indoklas: indoklasText || null
  })

  if (rpcError) {
    return { error: "Hiba az irat hozzárendelésekor: " + rpcError.message }
  }

  if (!rpcResult?.success) {
    return { error: rpcResult?.error || "Hiba az irat hozzárendelésekor." }
  }

  // 3. Cache revalidálás
  revalidatePath("/inbox")
  revalidatePath(`/inbox/view/${iratId}`)
  revalidatePath(`/inbox/${iratId}`)
  revalidatePath(`/dossiers/${ugyiratId}`)
  revalidatePath("/dossiers")

  return {
    success: true,
    iktatoszam: rpcResult.iktatoszam,
    alszam: rpcResult.alszam,
    ugyiratId: rpcResult.ugyirat_id
  }
}
