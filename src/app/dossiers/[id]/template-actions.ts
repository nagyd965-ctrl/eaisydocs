"use server"

import crypto from "crypto"
import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
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
 * Lekérdezi az összes válaszlevél- és iratsablont (beépített + egyéni/vállalati)
 */
export async function getReplyTemplates(): Promise<{
  success: boolean
  templates?: ReplyTemplate[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data: settingRow } = await supabase
      .from("rendszer_beallitas")
      .select("ertek")
      .eq("kulcs", "valaszlevel_sablonok")
      .maybeSingle()

    // Ha az adatbázisban még nincs feltöltve (null vagy nem tömb vagy üres), inicializáljuk a DEFAULT_REPLY_TEMPLATES-szel
    if (!settingRow || !Array.isArray(settingRow.ertek) || settingRow.ertek.length === 0) {
      const admin = getAdminClient()
      await admin
        .from("rendszer_beallitas")
        .upsert(
          {
            kulcs: "valaszlevel_sablonok",
            ertek: DEFAULT_REPLY_TEMPLATES,
            leiras: "Válaszlevél- és iratsablonok az expediálási modulhoz.",
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

    // Lekérjük a meglévőket
    const { data: settingRow } = await admin
      .from("rendszer_beallitas")
      .select("ertek")
      .eq("kulcs", "valaszlevel_sablonok")
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
          kulcs: "valaszlevel_sablonok",
          ertek: updated,
          leiras: "Válaszlevél- és iratsablonok az expediálási modulhoz.",
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
      .eq("kulcs", "valaszlevel_sablonok")
      .maybeSingle()

    let existing: ReplyTemplate[] =
      Array.isArray(settingRow?.ertek) && settingRow.ertek.length > 0
        ? settingRow.ertek
        : [...DEFAULT_REPLY_TEMPLATES]

    let index = existing.findIndex((t) => t.id === templateId)

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
          kulcs: "valaszlevel_sablonok",
          ertek: existing,
          leiras: "Válaszlevél- és iratsablonok az expediálási modulhoz.",
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
      .eq("kulcs", "valaszlevel_sablonok")
      .maybeSingle()

    let existing: ReplyTemplate[] =
      Array.isArray(settingRow?.ertek) && settingRow.ertek.length > 0
        ? settingRow.ertek
        : [...DEFAULT_REPLY_TEMPLATES]

    const filtered = existing.filter((t) => t.id !== templateId)

    const { error } = await admin
      .from("rendszer_beallitas")
      .upsert(
        {
          kulcs: "valaszlevel_sablonok",
          ertek: filtered,
          leiras: "Válaszlevél- és iratsablonok az expediálási modulhoz.",
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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  const targy = formData.get("targy") as string
  const sablon_tipus = formData.get("sablon_tipus") as string
  const tartalom = formData.get("tartalom") as string
  const cimzett = formData.get("cimzett") as string
  const hivatkozas = formData.get("hivatkozas") as string

  if (!targy || !tartalom) {
    return { error: "A tárgy és a tartalom megadása kötelező!" }
  }

  // Felhasználó profil lekérése a sablonhoz
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("nev")
    .eq("id", user.id)
    .single()

  // Ügyirat adatai a sablonhoz
  const { data: ugyirat } = await supabase
    .from("ugyirat")
    .select("iktatoszam, ugy(targy)")
    .eq("id", ugyiratId)
    .single()

  const iktatoszam = ugyirat?.iktatoszam || ""
  const ugyTargy = (ugyirat?.ugy as any)?.targy || ""

  // HTML → PDF generálás pdf-lib-bel
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")

  const pdfDoc = await PDFDocument.create()
  // PDF/A-2b metaadat
  pdfDoc.setTitle(targy)
  pdfDoc.setAuthor(profile?.nev || "eaisyDocs")
  pdfDoc.setSubject(ugyTargy)
  pdfDoc.setCreator("eaisyDocs - Elektronikus Iratkezelő Rendszer")
  pdfDoc.setCreationDate(new Date())

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 595.28 // A4
  const pageHeight = 841.89
  const margin = 60
  const contentWidth = pageWidth - margin * 2
  const lineHeight = 16
  const fontSize = 11
  const headerFontSize = 13

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  // --- Fejléc ---
  const now = new Date()
  const dateStr = now.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })

  // Iktatószám jobb felső sarok
  if (iktatoszam) {
    const iktatoText = `Iktatószám: ${iktatoszam}`
    const iktatoWidth = helvetica.widthOfTextAtSize(iktatoText, 9)
    page.drawText(iktatoText, {
      x: pageWidth - margin - iktatoWidth,
      y,
      size: 9,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    })
  }

  // Dátum
  page.drawText(dateStr, {
    x: margin,
    y,
    size: 9,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  })
  y -= lineHeight * 2

  // Címzett
  if (cimzett) {
    page.drawText("Címzett:", {
      x: margin, y, size: 9, font: helvetica, color: rgb(0.4, 0.4, 0.4),
    })
    y -= lineHeight
    page.drawText(cimzett, {
      x: margin, y, size: fontSize, font: helveticaBold, color: rgb(0, 0, 0),
    })
    y -= lineHeight * 2
  }

  // Tárgy
  page.drawText("Tárgy:", {
    x: margin, y, size: 9, font: helvetica, color: rgb(0.4, 0.4, 0.4),
  })
  y -= lineHeight
  page.drawText(targy, {
    x: margin, y, size: headerFontSize, font: helveticaBold, color: rgb(0, 0, 0),
  })
  y -= lineHeight

  // Hivatkozás
  if (hivatkozas) {
    page.drawText(`Hivatkozás: ${hivatkozas}`, {
      x: margin, y, size: 9, font: helvetica, color: rgb(0.4, 0.4, 0.4),
    })
    y -= lineHeight
  }

  // Elválasztó vonal
  y -= 8
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  })
  y -= lineHeight * 1.5

  // --- Törzs szöveg (sortörés kezelésével) ---
  const cleanTartalom = tartalom.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "")
  const lines = cleanTartalom.split("\n")
  for (const line of lines) {
    if (line.trim() === "") {
      y -= lineHeight * 0.7
      continue
    }

    const words = line.split(" ")
    let currentLine = ""
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const textWidth = helvetica.widthOfTextAtSize(testLine, fontSize)
      if (textWidth > contentWidth) {
        if (y < margin + lineHeight * 3) {
          page = pdfDoc.addPage([pageWidth, pageHeight])
          y = pageHeight - margin
        }
        page.drawText(currentLine, {
          x: margin, y, size: fontSize, font: helvetica, color: rgb(0, 0, 0),
        })
        y -= lineHeight
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) {
      if (y < margin + lineHeight * 3) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        y = pageHeight - margin
      }
      page.drawText(currentLine, {
        x: margin, y, size: fontSize, font: helvetica, color: rgb(0, 0, 0),
      })
      y -= lineHeight
    }
  }

  // --- Aláírás blokk ---
  y -= lineHeight * 3
  if (y < margin + lineHeight * 5) {
    page = pdfDoc.addPage([pageWidth, pageHeight])
    y = pageHeight - margin
  }
  page.drawText("Üdvözlettel,", {
    x: margin, y, size: fontSize, font: helvetica, color: rgb(0, 0, 0),
  })
  y -= lineHeight * 3
  page.drawText(profile?.nev || "Aláíró", {
    x: margin, y, size: fontSize, font: helveticaBold, color: rgb(0, 0, 0),
  })

  // --- Lábléc ---
  const footerText = `Generálva: eaisyDocs | ${dateStr} | ${iktatoszam || "Iktatószám nélkül"}`
  const footerWidth = helvetica.widthOfTextAtSize(footerText, 7)
  for (const p of pdfDoc.getPages()) {
    p.drawText(footerText, {
      x: (pageWidth - footerWidth) / 2,
      y: 30,
      size: 7,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    })
  }

  // PDF binary generálás
  const pdfBytes = await pdfDoc.save()
  const buffer = Buffer.from(pdfBytes)

  // SHA-256 hash
  const hash = crypto.createHash("sha256").update(buffer).digest("hex")

  // Storage feltöltés
  const fileName = `${crypto.randomUUID()}.pdf`
  const { error: uploadError } = await supabase.storage
    .from("iratok")
    .upload(fileName, buffer, {
      contentType: "application/pdf",
      upsert: false,
    })

  if (uploadError) return { error: "Hiba a fájl feltöltésekor: " + uploadError.message }

  // Alszám számítás
  const { data: iratok } = await supabase
    .from("irat")
    .select("alszam")
    .eq("ugyirat_id", ugyiratId)

  const maxAlszam = iratok?.reduce((max, i) => Math.max(max, i.alszam || 0), 0) || 0
  const alszam = maxAlszam + 1

  // Irat rekord (kimenő)
  const { data: iratData, error: iratError } = await supabase
    .from("irat")
    .insert({
      ugyirat_id: ugyiratId,
      targy,
      irany: "kimeno",
      erkezes_modja: "rendszer",
      adathordozo_tipus: "elektronikus_eredeti",
      minosites: "nyilt",
      alszam,
      kezbesites_statusz: "vazlat",
    })
    .select("id")
    .single()

  if (iratError || !iratData) return { error: "Hiba az irat rekord létrehozásakor." }

  // Irat fájl rekord
  const generatedFilename = `${sablon_tipus || "sablon"}_${dateStr.replace(/\./g, "").replace(/ /g, "_")}.pdf`
  const { data: fajlResult } = await supabase
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

  // Eseménynapló
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
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
