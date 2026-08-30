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

  if (mode === "new") {
    const targy = formData.get("targy") as string
    const ugytipus_id = formData.get("ugytipus_id") as string
    const prefix = (formData.get("prefix") as string) || "NYILV"
    const department_id = formData.get("department_id") as string

    if (!targy || !ugytipus_id || !department_id) {
      return { error: "Minden mező kitöltése kötelező új ügyirat esetén (Osztály is)!" }
    }

    const { data: ugyszam, error: ugyszamError } = await supabase.rpc('generate_ugyszam', { p_ev: ev, p_prefix: prefix })
    if (ugyszamError) return { error: "Hiba az ügyszám generálásakor." }

    const { data: ugyData, error: ugyError } = await supabase
      .from("ugy")
      .insert({ ugyszam, targy, ugytipus_id, statusz: "folyamatban" })
      .select("id")
      .single()
    if (ugyError || !ugyData) return { error: "Hiba az ügy létrehozásakor." }

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
    if (ugyiratError || !ugyiratData) return { error: "Hiba az ügyirat létrehozásakor." }
    
    ugyiratIdToUse = ugyiratData.id;
    alszam = 1;

  } else {
    // Existing dossier
    ugyiratIdToUse = formData.get("existing_ugyirat_id") as string
    if (!ugyiratIdToUse) return { error: "Nincs kiválasztva ügyirat!" }

    // Fetch existing ugyirat to get its iktatószám
    const { data: existingDossier, error: dossierError } = await supabase
      .from("ugyirat")
      .select("iktatoszam")
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
  }

  // Update Irat with ugyirat_id AND alszam
  const { error: iratUpdateError } = await supabase
    .from("irat")
    .update({ ugyirat_id: ugyiratIdToUse, alszam })
    .eq("id", irat_id)
  
  if (iratUpdateError) return { error: "Hiba az irat frissítésekor." }

  revalidatePath("/inbox")
  revalidatePath("/dossiers")
  return { success: true }
}

export async function generateAISuggestions(iratId: string) {
  const supabase = await createClient()

  // 1. Lekérjük az iratot és a kapcsolódó fájlokat
  const { data: irat } = await supabase
    .from("irat")
    .select(`
      id,
      targy,
      kulso_forras,
      kulso_hivatkozas_id,
      partner ( nev )
    `)
    .eq("id", iratId)
    .single()

  if (!irat) {
    return { error: "Az irat nem található." }
  }

  const { data: files } = await supabase
    .from("irat_fajl")
    .select("id, storage_path, kulso_fajl_url, mime_type, eredeti_fajlnev, ocr_szoveg")
    .eq("irat_id", iratId)

  // 2. Fájl letöltése és szöveg kinyerése
  let docText = ""
  let pdfBase64: string | null = null
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
        console.warn("Nem sikerült letölteni a külső PDF-et:", err)
      }
    } else if (firstFile.storage_path && !firstFile.storage_path.startsWith("eaisybill:")) {
      try {
        const { data: fileData } = await supabase.storage.from("irat_files").download(firstFile.storage_path)
        if (fileData) {
          fileBuf = Buffer.from(await fileData.arrayBuffer())
        }
      } catch (err) {
        console.warn("Nem sikerült storage-ból letölteni a PDF-et:", err)
      }
    }

    if (fileBuf) {
      const { extractPdfText } = await import("@/utils/pdf-extractor")
      docText = await extractPdfText(fileBuf)
      
      // Ha a PDF mérete ésszerű (< 10MB), átadjuk base64-ként is a Gemini multimodális kép/PDF olvasójának
      if (fileBuf.length < 10 * 1024 * 1024) {
        pdfBase64 = fileBuf.toString("base64")
      }

      if (docText && docText.trim()) {
        // Frissítjük az adatbázisban az OCR szöveget
        await supabase.from("irat_fajl").update({ ocr_szoveg: docText }).eq("id", firstFile.id)
      }
    }
  }

  // Ha korábbról volt érvényes OCR szöveg (és nem a régi mock szöveg)
  if (!docText) {
    const existingWithOcr = files?.find(f => f.ocr_szoveg && !f.ocr_szoveg.includes("DEMO OCR SZÖVEG"))
    if (existingWithOcr?.ocr_szoveg) {
      docText = existingWithOcr.ocr_szoveg
    }
  }

  // 3. Lekérjük a dinamikus adatbázis adatokat (Szervezeti Egységek + Irattári Terv)
  const { data: departments } = await supabase
    .from("szervezeti_egyseg")
    .select("id, nev, iktato_prefix")
    .order("nev")

  const { data: tervek } = await supabase
    .from("irattari_terv")
    .select("id, tetelszam, megnevezes")
    .order("tetelszam")

  const deptsList = departments || []
  const plansList = tervek || []

  // 4. LLM hívás Gemini API-val
  let aiResult: any = null
  const googleApiKey = process.env.GOOGLE_API_KEY

  if (googleApiKey) {
    try {
      const { GoogleGenAI } = await import("@google/genai")
      const ai = new GoogleGenAI({ apiKey: googleApiKey })

      const prompt = `Te egy magyar elektronikus iratkezelő rendszer (eaisyDocs) automatikus dokumentum-osztályozó és iktatási AI asszisztense vagy.
Feladatod: elemezd a beérkezett dokumentum tartalmát (a csatolt PDF-et vagy kinyert szövegét) és metaadatait, majd rendeld hozzá a legmegfelelőbb Szervezeti Egységet és Irattári Tételt a megadott listákból!

ELÉRHETŐ SZERVEZETI EGYSÉGEK (Osztályok):
${deptsList.map(d => `- ID: "${d.id}", Név: "${d.nev}"`).join("\n")}

ÉRVÉNYES IRATTÁRI TERV TÉTELEI:
${plansList.map(p => `- ID: "${p.id}", Tételszám: "${p.tetelszam}", Megnevezés: "${p.megnevezes}"`).join("\n")}

ÉRKEZTETÉSI ÉS RÖGZÍTÉSI METAADATOK:
- Érkeztetési tárgy: ${irat.targy || "Nincs megadva"}
- Rögzített partner: ${(irat.partner as any)?.nev || "Nincs megadva"}
- Fájlnév: ${files?.[0]?.eredeti_fajlnev || "dokumentum.pdf"}
${docText ? `\nKINYERT SZÖVEG:\n"""\n${docText.slice(0, 10000)}\n"""` : ""}

Kérlek, válaszolj kizárólag érvényes JSON formátumban az alábbi mezőkkel:
{
  "targy": "tömör és pontos hivatalos magyar irattárgy (pl. Munkaszerződés – Nagy Dániel, vagy Celonis Inc. előfizetési számla)",
  "partner": "partner vagy személy neve",
  "department_id": "a fenti listából kiválasztott legmegfelelőbb osztály pontos ID-ja (UUID)",
  "irattari_tetel_id": "a fenti listából kiválasztott legmegfelelőbb irattári tétel pontos ID-ja (UUID)",
  "indoklas": "1 rövid magyar mondat az indoklásról"
}`

      const contents: any[] = [prompt]
      if (pdfBase64) {
        contents.push({
          inlineData: {
            mimeType: "application/pdf",
            data: pdfBase64
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
      console.warn("Gemini AI classification error, falling back to smart heuristics:", llmErr)
    }
  }

  // 5. Fallback heurisztika ha az LLM nem adott választ
  if (!aiResult) {
    const textLower = docText.toLowerCase()
    let suggestedTargy = irat?.targy || "Általános beadvány"
    let suggestedDeptId = deptsList[0]?.id || ""
    let suggestedPlanId = plansList[0]?.id || ""

    if (textLower.includes("munkaszerz") || textLower.includes("munkaviszony") || textLower.includes("munkavállaló") || textLower.includes("távollét") || textLower.includes("szabadság")) {
      suggestedTargy = "Munkaszerződés"
      const hrDept = deptsList.find(d => d.nev.toLowerCase().includes("hr") || d.nev.toLowerCase().includes("humán"))
      if (hrDept) suggestedDeptId = hrDept.id
      const hrPlan = plansList.find(p => p.megnevezes.toLowerCase().includes("hr") || p.megnevezes.toLowerCase().includes("munkaügy"))
      if (hrPlan) suggestedPlanId = hrPlan.id
    } else if (textLower.includes("számla") || textLower.includes("szamla") || textLower.includes("invoice") || textLower.includes("díjbekérő")) {
      suggestedTargy = "Bejövő számla"
      const finDept = deptsList.find(d => d.nev.toLowerCase().includes("pénz") || d.nev.toLowerCase().includes("számv"))
      if (finDept) suggestedDeptId = finDept.id
      const finPlan = plansList.find(p => p.megnevezes.toLowerCase().includes("számla") || p.megnevezes.toLowerCase().includes("pénzügy"))
      if (finPlan) suggestedPlanId = finPlan.id
    } else if (textLower.includes("szerződés") || textLower.includes("megállapodás")) {
      suggestedTargy = "Szerződés"
      const contractPlan = plansList.find(p => p.megnevezes.toLowerCase().includes("szerződés") || p.megnevezes.toLowerCase().includes("jogi"))
      if (contractPlan) suggestedPlanId = contractPlan.id
    }

    aiResult = {
      targy: suggestedTargy,
      partner: (irat?.partner as any)?.nev || "",
      department_id: suggestedDeptId,
      irattari_tetel_id: suggestedPlanId,
      indoklas: "Automatikus szabályalapú besorolás."
    }
  }

  // 6. Validáljuk, hogy a kapott ID-k tényleg léteznek az adatbázisban
  const validDept = deptsList.find(d => d.id === aiResult.department_id) || deptsList[0]
  const validPlan = plansList.find(p => p.id === aiResult.irattari_tetel_id) || plansList[0]

  return {
    success: true,
    suggestions: {
      targy: aiResult.targy || irat?.targy || "Irat",
      partner: aiResult.partner || (irat?.partner as any)?.nev || "",
      department_id: validDept?.id || "",
      irattari_tetel_id: validPlan?.id || "",
      indoklas: aiResult.indoklas || "AI besorolás elkészült."
    }
  }
}

