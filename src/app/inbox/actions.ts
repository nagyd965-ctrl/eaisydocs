"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import crypto from "crypto"
// pdf-parse requires DOMMatrix globally in some Node environments
if (typeof global !== "undefined" && typeof (global as any).DOMMatrix === "undefined") {
  (global as any).DOMMatrix = class {};
}

export async function uploadIncomingDocument(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve." }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor")
    .eq("id", user.id)
    .single()

  const userRole = profile?.docs_szerepkor || "ugyintezo"
  const isAllowed = ["admin", "rendszergazda", "iktato"].includes(userRole)
  if (!isAllowed) {
    return { error: "Nincs jogosultságod új irat érkeztetéséhez." }
  }

  const targy = formData.get("targy") as string
  const kuldo_nev = (formData.get("kuldo_nev") as string)?.trim()
  const kuldo_tipus = (formData.get("kuldo_tipus") as string)?.trim() || "ceg"
  const erkezes_modja = formData.get("erkezes_modja") as string
  const adathordozo_tipus = formData.get("adathordozo_tipus") as string
  const minosites = (formData.get("minosites") as string) || "nyilt"
  const file = formData.get("file") as File | null

  if (!targy || !erkezes_modja || !adathordozo_tipus || !file || file.size === 0) {
    return { error: "Minden mező és a fájl is kötelező!" }
  }

  // 1. Partner kezelés
  let partner_id = null
  if (kuldo_nev) {
    const { findOrCreatePartner } = await import("@/utils/partner-matcher")
    try {
      const partnerResult = await findOrCreatePartner(supabase, {
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
  
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
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

  // 4. Érkeztetőszám generálás (éves szintű, pl. E/2026/0714-1234)
  const dateStr = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 8)
  const randNum = Math.floor(1000 + Math.random() * 9000)
  const erkeztetoszam = `E/${dateStr}-${randNum}`

  // 5. Irat rekord létrehozása
  const { data: iratData, error: iratError } = await supabase
    .from("irat")
    .insert({
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
    return { error: "Hiba az irat létrehozásakor: " + iratError?.message }
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
    return { error: "Hiba a fájl mentésekor: " + fajlError.message }
  }

  // 7. Fire-and-forget hívás a PDF/A konverternek (nem várjuk meg a végét!)
  if (fajlResult) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    fetch(`${appUrl}/api/pdf/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fajl_id: fajlResult.id })
    }).catch(err => console.error("PDF/A Worker Trigger Error:", err))
  }

  revalidatePath("/inbox")
  return { success: true }
}
