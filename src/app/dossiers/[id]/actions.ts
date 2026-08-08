"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { getClientInfo } from "@/utils/client-info"

export async function closeDossier(ugyiratId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve." }
  }

  // Lekérjük az ügyiratot és az irattári tervet
  const { data: ugyirat } = await supabase
    .from("ugyirat")
    .select("ugy_id, irattari_terv(megorzesi_ido_ev)")
    .eq("id", ugyiratId)
    .single()

  if (!ugyirat) return { error: "Ügyirat nem található." }

  const megorzesi_ev = (ugyirat.irattari_terv as any)?.megorzesi_ido_ev || 5 // default 5 ha nincs
  const endDate = new Date()
  endDate.setFullYear(endDate.getFullYear() + megorzesi_ev)
  const endDateStr = endDate.toISOString().split('T')[0] // Csak a dátum része

  // 1. Ügyirat frissítése
  const { error: ugyiratError } = await supabase
    .from("ugyirat")
    .update({ 
      statusz: "irattarban",
      megorzesi_ido_vege: endDateStr
    })
    .eq("id", ugyiratId)

  if (ugyiratError) return { error: "Hiba az ügyirat lezárásakor." }

  // 2. Ügy frissítése
  if (ugyirat.ugy_id) {
    await supabase
      .from("ugy")
      .update({
        statusz: "lezart",
        lezarva: new Date().toISOString()
      })
      .eq("id", ugyirat.ugy_id)
  }

  // 3. Eseménynapló
  const { ip, userAgent } = await getClientInfo()

  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
    esemeny_tipus: "lezarva",
    user_id: user.id,
    indoklas: "Ügyirat lezárva és irattározva.",
    ip_cim: ip,
    user_agent: userAgent
  })
  
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
    esemeny_tipus: "irattarozva",
    user_id: user.id,
    uj_ertek: { megorzesi_ido_vege: endDateStr },
    ip_cim: ip,
    user_agent: userAgent
  })

  revalidatePath("/dossiers")
  revalidatePath(`/dossiers/${ugyiratId}`)
  revalidatePath("/archive")

  return { success: true }
}

export async function addComment(ugyiratId: string, text: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }
  if (!text.trim()) return { error: "A megjegyzés nem lehet üres." }

  const { error } = await supabase
    .from("ugyirat_megjegyzes")
    .insert({
      ugyirat_id: ugyiratId,
      user_id: user.id,
      szoveg: text
    })

  if (error) return { error: "Hiba a megjegyzés mentésekor." }

  const { ip, userAgent } = await getClientInfo()

  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
    esemeny_tipus: "modositva",
    user_id: user.id,
    indoklas: "Megjegyzés hozzáadva",
    ip_cim: ip,
    user_agent: userAgent
  })

  revalidatePath(`/dossiers/${ugyiratId}`)
  return { success: true }
}

export async function updateDossierStatus(ugyiratId: string, ugyId: string, newStatus: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  // Check if valid status transition
  if (!["ugyintezes_alatt", "elintezett"].includes(newStatus)) {
    return { error: "Érvénytelen státusz." }
  }

  const { error: ugyiratError } = await supabase
    .from("ugyirat")
    .update({ statusz: newStatus })
    .eq("id", ugyiratId)

  if (ugyiratError) return { error: "Hiba az ügyirat frissítésekor." }

  const { ip, userAgent } = await getClientInfo()

  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
    esemeny_tipus: "modositva",
    user_id: user.id,
    indoklas: `Állapot módosítva erre: ${newStatus}`,
    ip_cim: ip,
    user_agent: userAgent
  })

  revalidatePath(`/dossiers/${ugyiratId}`)
  return { success: true }
}

export async function uploadReply(ugyiratId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  const targy = formData.get("targy") as string
  const file = formData.get("file") as File | null

  if (!targy || !file || file.size === 0) {
    return { error: "Minden mező és a fájl is kötelező!" }
  }

  // 1. Fájl feltöltése Storage-ba
  const crypto = require("crypto")
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

  if (uploadError) return { error: "Hiba a fájl feltöltésekor: " + uploadError.message }

  const hash = crypto.createHash('sha256').update(buffer).digest('hex')

  // PDF szöveg kinyerése a teljes szöveges kereséshez (FTS)
  let ocr_szoveg: string | null = null
  if (file.type === "application/pdf") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse")
      const pdfData = await pdfParse(buffer)
      ocr_szoveg = pdfData.text || null
    } catch (e) {
      console.warn("Nem sikerült kinyerni a szöveget a PDF-ből (dossier upload):", e)
    }
  }

  // 2. Számoljuk ki az alszámot az irathoz
  const { data: iratok } = await supabase
    .from("irat")
    .select("alszam")
    .eq("ugyirat_id", ugyiratId)
  
  const maxAlszam = iratok?.reduce((max, i) => Math.max(max, i.alszam || 0), 0) || 0
  const alszam = maxAlszam + 1

  // 3. Irat rekord létrehozása (Kimenő)
  const { data: iratData, error: iratError } = await supabase
    .from("irat")
    .insert({
      ugyirat_id: ugyiratId,
      targy,
      irany: "kimeno",
      erkezes_modja: "rendszer",
      adathordozo_tipus: "elektronikus_eredeti",
      minosites: "nyilt",
      alszam
    })
    .select("id")
    .single()

  if (iratError || !iratData) return { error: "Hiba az irat rekord létrehozásakor." }

  // 4. Irat fájl összekapcsolása
  const { data: fajlResult, error: fajlError } = await supabase
    .from("irat_fajl")
    .insert({
      irat_id: iratData.id,
      storage_path: fileName,
      eredeti_fajlnev: file.name,
      mime_type: file.type,
      meret_byte: file.size,
      sha256: hash,
      verzio: 1,
      ocr_szoveg
    })
    .select("id")
    .single()

  // 5. Eseménynapló
  const { ip, userAgent } = await getClientInfo()

  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
    esemeny_tipus: "modositva",
    user_id: user.id,
    indoklas: `Válaszlevél feltöltve: ${file.name}`,
    ip_cim: ip,
    user_agent: userAgent
  })

  // 6. Fire-and-forget hívás a PDF/A konverternek
  if (fajlResult) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    fetch(`${appUrl}/api/pdf/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fajl_id: fajlResult.id })
    }).catch(err => console.error("PDF/A Worker Trigger Error:", err))
  }

  revalidatePath(`/dossiers/${ugyiratId}`)
  return { success: true }
}

export async function addPolymorphicLink(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  const ugyirat_id = formData.get("ugyirat_id") as string
  const irat_id = formData.get("irat_id") as string || null
  const entitas_tipus = formData.get("entitas_tipus") as string
  const entitas_forras = formData.get("entitas_forras") as string
  const entitas_id = formData.get("entitas_id") as string
  const kapcsolat_tipusa = formData.get("kapcsolat_tipusa") as string

  if (!ugyirat_id || !entitas_tipus || !entitas_forras || !entitas_id || !kapcsolat_tipusa) {
    return { error: "Minden kötelező mezőt ki kell tölteni!" }
  }

  const { error: insertError } = await supabase
    .from("irat_kapcsolat")
    .insert({
      ugyirat_id,
      irat_id,
      entitas_tipus,
      entitas_forras,
      entitas_id,
      kapcsolat_tipusa
    })

  if (insertError) {
    return { error: "Hiba történt a kapcsolat létrehozásakor: " + insertError.message }
  }

  const { ip, userAgent } = await getClientInfo()

  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyirat_id,
    esemeny_tipus: "modositva",
    user_id: user.id,
    indoklas: `Új ${entitas_tipus} (${entitas_forras}: ${entitas_id}) kapcsolat hozzáadva.`,
    ip_cim: ip,
    user_agent: userAgent
  })

  revalidatePath(`/dossiers/${ugyirat_id}`)
  return { success: true }
}

export async function deletePolymorphicLink(id: string, ugyirat_id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  const { error: deleteError } = await supabase
    .from("irat_kapcsolat")
    .delete()
    .eq("id", id)

  if (deleteError) {
    return { error: "Hiba történt a kapcsolat törlésekor." }
  }

  const { ip, userAgent } = await getClientInfo()

  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyirat_id,
    esemeny_tipus: "modositva",
    user_id: user.id,
    indoklas: "Polimorf kapcsolat törölve.",
    ip_cim: ip,
    user_agent: userAgent
  })

  revalidatePath(`/dossiers/${ugyirat_id}`)
  return { success: true }
}
