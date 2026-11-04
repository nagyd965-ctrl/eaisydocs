"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import crypto from "crypto"
// pdf-parse requires DOMMatrix globally in some Node environments
if (typeof global !== "undefined" && typeof (global as any).DOMMatrix === "undefined") {
  (global as any).DOMMatrix = class {};
}

const ALLOWED_MINOSITES = ["nyilt", "belso", "bizalmas", "szigoruan_bizalmas"] as const

export async function uploadIncomingDocument(formData: FormData) {
  const supabase = await createClient()
  const activeCompanyId = await getActiveCompanyIdServer()

  const { requireDocsAuthServer } = await import("@/utils/docs-auth-guard")
  const auth = await requireDocsAuthServer(["admin", "rendszergazda", "iktato", "inbox"], activeCompanyId)
  if (!auth.authorized || !auth.user) {
    return { error: auth.error || "Nincs jogosultságod új irat érkeztetéséhez." }
  }

  const targy = formData.get("targy") as string
  const kuldo_nev = (formData.get("kuldo_nev") as string)?.trim()
  const kuldo_tipus = (formData.get("kuldo_tipus") as string)?.trim() || "ceg"
  const erkezes_modja = formData.get("erkezes_modja") as string
  const adathordozo_tipus = formData.get("adathordozo_tipus") as string
  const rawMinosites = (formData.get("minosites") as string) || "nyilt"
  const minosites = ALLOWED_MINOSITES.includes(rawMinosites as any) ? rawMinosites : "nyilt"
  const file = formData.get("file") as File | null

  if (!targy || !erkezes_modja || !adathordozo_tipus || !file) {
    return { error: "Minden mező és a fájl csatolása is kötelező!" }
  }

  if (file.size === 0) {
    return { error: "A kiválasztott fájl üres (0 bájt)! Kérjük, töltsön fel valós iratot." }
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { validateUploadedDocument } = await import("@/utils/file-validator")
  const fileCheck = await validateUploadedDocument(file, buffer)
  if (!fileCheck.valid) {
    return { error: fileCheck.error || "A kiválasztott fájl érvénytelen vagy sérült!" }
  }

  // 1. Partner kezelés
  let partner_id = null
  if (kuldo_nev) {
    const { findOrCreatePartner } = await import("@/utils/partner-matcher")
    try {
      const partnerResult = await findOrCreatePartner(supabase, {
        company_id: activeCompanyId,
        nev: kuldo_nev,
        tipus: kuldo_tipus
      })
      partner_id = partnerResult.id
    } catch (err) {
      console.warn("Partner keresési / létrehozási hiba:", err)
    }
  }

  // 2. Fájl feltöltése Storage-ba
  const fileExt = file.name.split('.').pop()
  const fileName = `${crypto.randomUUID()}.${fileExt}`
  
  const { error: uploadError } = await supabase.storage
    .from("irat_files")
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false
    })

  if (uploadError) {
    return { error: "Hiba a fájl feltöltésekor: " + uploadError.message }
  }
  
  // 3. SHA256 számítás és PDF OCR/szöveg kinyerés
  const hash = crypto.createHash('sha256').update(buffer).digest('hex')
  
  let ocr_szoveg: string | null = null
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const { extractPdfText } = await import("@/utils/pdf-extractor")
    ocr_szoveg = await extractPdfText(buffer)
  }

  // 4. Érkeztetőszám generálás (szekvenciális, pl. E/2026/00001)
  const currentYear = new Date().getFullYear()
  const { data: erkezId, error: erkezErr } = await supabase.rpc("generate_erkeztetoszam", {
    p_ev: currentYear,
    p_company_id: activeCompanyId || null,
  })
  if (erkezErr || !erkezId) {
    await supabase.storage.from("irat_files").remove([fileName])
    return { error: "Hiba az érkeztetőszám generálásakor: " + (erkezErr?.message || "Nem sikerült sorszámot allokálni.") }
  }
  const erkeztetoszam = erkezId

  // 5. Irat rekord létrehozása
  const { data: iratData, error: iratError } = await supabase
    .from("irat")
    .insert({
      company_id: activeCompanyId || undefined,
      targy,
      erkezes_modja,
      adathordozo_tipus,
      minosites,
      irany: "bejovo",
      kuldo_partner_id: partner_id,
      erkeztetoszam
    })
    .select("id")
    .single()

  if (iratError || !iratData) {
    await supabase.storage.from("irat_files").remove([fileName])
    const msg = iratError?.message || ""
    // RLS jogsértés = a felhasználónak nincs jogosultsága ehhez a biztonsági minősítéshez
    if (msg.includes("row-level security") || msg.includes("violates") || iratError?.code === "42501") {
      return { error: `Nincs jogosultsága „${minosites}" minősítésű irat érkeztetéséhez. Kérje meg rendszergazdáját a szükséges jogosultság beállításához, vagy válasszon alacsonyabb biztonsági minősítést.` }
    }
    return { error: "Az irat létrehozása sikertelen. Kérjük, ellenőrizze az adatokat, majd próbálja újra." }
  }

  // 6. Irat fájl rekord létrehozása
  const { data: fajlResult, error: fajlError } = await supabase
    .from("irat_fajl")
    .insert({
      irat_id: iratData.id,
      storage_path: fileName,
      eredeti_fajlnev: file.name,
      mime_type: file.type,
      meret_byte: file.size,
      sha256: hash,
      ocr_szoveg
    })
    .select("id")
    .single()

  if (fajlError) {
    await supabase.storage.from("irat_files").remove([fileName])
    await supabase.from("irat").delete().eq("id", iratData.id)
    return { error: "Hiba a fájl mentésekor: " + fajlError.message }
  }

  // 7. Fire-and-forget hívás a PDF/A konverternek (nem várjuk meg a végét!)
  if (fajlResult) {
    const { getBaseUrl } = await import("@/utils/url")
    const appUrl = getBaseUrl()
    fetch(`${appUrl}/api/pdf/convert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      },
      body: JSON.stringify({ fajl_id: fajlResult.id })
    }).catch(err => console.error("PDF/A Worker Trigger Error:", err))
  }

  // 8. Fire-and-forget mentett keresések értesítése (az embeddinget a háttérben az ai_feladat_sor és worker végzi)
  (async () => {
    try {
      const { checkSavedSearchesForNewIrat } = await import("@/utils/saved-search-alerts")
      await checkSavedSearchesForNewIrat(iratData.id, supabase)
    } catch (bgErr) {
      console.error("[Upload] Error in background alert processing:", bgErr)
    }
  })().catch(console.error)

  revalidatePath("/inbox")
  return { success: true }
}

export async function syncIncomingEmailsAction() {
  try {
    const { requireDocsAuthServer } = await import("@/utils/docs-auth-guard")
    const auth = await requireDocsAuthServer(["admin", "rendszergazda", "iktato", "vezeto", "ugyintezo", "inbox"])
    if (!auth.authorized) {
      return { success: false, error: auth.error || "Nincs jogosultságod az e-mail szinkronizáláshoz." }
    }
    const { processIncomingEmails } = await import("@/utils/imap-service")
    const res = await processIncomingEmails()
    revalidatePath("/inbox")
    return res
  } catch (err: any) {
    console.error("[IMAP Sync Action] Error:", err)
    return { success: false, error: err?.message || String(err) }
  }
}
