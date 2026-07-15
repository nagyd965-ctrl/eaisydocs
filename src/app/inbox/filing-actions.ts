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

    if (!targy || !ugytipus_id) {
      return { error: "Minden mező kitöltése kötelező új ügyirat esetén!" }
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
        statusz: "iktatva"
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
  
  // 1. Fetch the OCR text for this document
  const { data: fileData, error } = await supabase
    .from("irat_fajl")
    .select("ocr_szoveg")
    .eq("irat_id", iratId)
    .single()

  if (error || !fileData || !fileData.ocr_szoveg) {
    return { error: "Nem található OCR szöveg az AI elemzéshez." }
  }

  const text = fileData.ocr_szoveg.toLowerCase()
  
  // 2. MOCK AI / Heuristics Logic
  // This simulates an LLM call parsing the document text.
  let suggestedTargy = ""
  let suggestedPartner = ""

  // Tárgy (Subject) heuristics
  if (text.includes("számla") || text.includes("szamla") || text.includes("invoice")) {
    suggestedTargy = "Bejövő számla"
  } else if (text.includes("szerződés") || text.includes("szerzodes") || text.includes("megállapodás")) {
    suggestedTargy = "Szerződés"
  } else if (text.includes("igazolás") || text.includes("certificate")) {
    suggestedTargy = "Igazolás / Bizonyítvány"
  } else if (text.includes("felszólítás") || text.includes("fizetési")) {
    suggestedTargy = "Fizetési felszólítás"
  } else {
    suggestedTargy = "Általános beadvány"
  }

  // Partner heuristics
  if (text.includes("telekom")) suggestedPartner = "Magyar Telekom Nyrt."
  else if (text.includes("vodafone")) suggestedPartner = "Vodafone Magyarország Zrt."
  else if (text.includes("e.on") || text.includes("eon")) suggestedPartner = "E.ON Energiamegoldások Kft."
  else if (text.includes("otp")) suggestedPartner = "OTP Bank Nyrt."
  else if (text.includes("apex")) suggestedPartner = "Apex Trader Funding"
  else if (text.includes("nav") || text.includes("nemzeti adó")) suggestedPartner = "Nemzeti Adó- és Vámhivatal"

  // Simulate network delay for the "AI" feeling
  await new Promise(resolve => setTimeout(resolve, 1500))

  return {
    success: true,
    suggestions: {
      targy: suggestedTargy,
      partner: suggestedPartner
    }
  }
}

