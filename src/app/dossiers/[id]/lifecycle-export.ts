"use server"

import { createClient } from "@/utils/supabase/server"

/**
 * Életciklus riport PDF generálása egy ügyirathoz
 * Az eseménynapló összes bejegyzését tartalmazza időrendi sorrendben
 */
export async function generateLifecycleReport(ugyiratId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  // 1. Ügyirat adatai
  const { data: dossier } = await supabase
    .from("ugyirat")
    .select(`
      id, iktatoszam, statusz, iktatas_datuma, megorzesi_ido_vege,
      szervezeti_egyseg:szervezeti_egyseg_id ( nev ),
      ugy:ugy_id ( targy, ugyszam, felelos_user_id ),
      irattari_terv:irattari_tetel_id ( megnevezes, megorzesi_ido_ev )
    `)
    .eq("id", ugyiratId)
    .single()

  if (!dossier) return { error: "Ügyirat nem található." }

  // 2. Eseménynapló
  const { data: events } = await supabase
    .from("esemeny_naplo")
    .select("*")
    .eq("entitas_tipus", "ugyirat")
    .eq("entitas_id", ugyiratId)
    .order("tortent", { ascending: true })

  // 3. Felhasználónevek kigyűjtése
  const ugy = dossier.ugy as any
  const felelosId = ugy?.felelos_user_id
  const userIds = [...new Set((events || []).map(e => e.user_id).filter(Boolean))]
  if (felelosId) {
    userIds.push(felelosId)
  }

  const { data: profiles } = await supabase
    .from("felhasznalo_profil")
    .select("id, nev")
    .in("id", userIds.length > 0 ? userIds : ["__none__"])

  const userMap: Record<string, string> = {}
  profiles?.forEach(p => { userMap[p.id] = p.nev })

  // 4. PDF generálás
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")

  const pdfDoc = await PDFDocument.create()
  pdfDoc.setTitle(`Életciklus riport — ${dossier.iktatoszam}`)
  pdfDoc.setAuthor("eaisyDocs")
  pdfDoc.setCreator("eaisyDocs - Elektronikus Iratkezelő Rendszer")
  pdfDoc.setCreationDate(new Date())

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 50
  const contentWidth = pageWidth - margin * 2
  const lineHeight = 14
  const smallLine = 11

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  const szervEgyseg = dossier.szervezeti_egyseg as any
  const irattariTerv = dossier.irattari_terv as any

  // Helper function to sanitize Hungarian non-WinAnsi characters (ő/ű) for pdf-lib standard fonts
  const clean = (text: string | null | undefined): string => {
    if (!text) return ""
    return String(text)
      .replace(/ő/g, "ö")
      .replace(/Ő/g, "Ö")
      .replace(/ű/g, "ü")
      .replace(/Ű/g, "Ü")
  }

  // --- Fejléc ---
  page.drawText(clean("ÉLETCIKLUS RIPORT"), {
    x: margin, y, size: 18, font: helveticaBold, color: rgb(0.1, 0.1, 0.1),
  })
  y -= 6
  page.drawLine({
    start: { x: margin, y }, end: { x: pageWidth - margin, y },
    thickness: 2, color: rgb(0.01, 0.72, 0.80), // Fintech teal
  })
  y -= lineHeight * 1.5

  // --- Metaadatok ---
  const meta = [
    ["Iktatószám", dossier.iktatoszam || "—"],
    ["Ügyszám", ugy?.ugyszam || "—"],
    ["Tárgy", ugy?.targy || "—"],
    ["Állapot", dossier.statusz?.toUpperCase() || "—"],
    ["Szervezeti egység", szervEgyseg?.nev || "—"],
    ["Felelős", (ugy?.felelos_user_id ? userMap[ugy.felelos_user_id] : null) || "—"],
    ["Irattári tétel", irattariTerv?.megnevezes || "—"],
    ["Megőrzési idő", irattariTerv?.megorzesi_ido_ev ? `${irattariTerv.megorzesi_ido_ev} év` : "—"],
    ["Iktatás dátuma", dossier.iktatas_datuma ? new Date(dossier.iktatas_datuma).toLocaleDateString("hu-HU") : "—"],
    ["Megőrzés vége", dossier.megorzesi_ido_vege ? new Date(dossier.megorzesi_ido_vege).toLocaleDateString("hu-HU") : "—"],
  ]

  for (const [label, value] of meta) {
    page.drawText(`${clean(label)}:`, {
      x: margin, y, size: 9, font: helveticaBold, color: rgb(0.3, 0.3, 0.3),
    })
    page.drawText(clean(String(value)), {
      x: margin + 120, y, size: 9, font: helvetica, color: rgb(0, 0, 0),
    })
    y -= smallLine
  }

  y -= lineHeight

  // --- Eseménynapló cím ---
  page.drawLine({
    start: { x: margin, y }, end: { x: pageWidth - margin, y },
    thickness: 0.5, color: rgb(0.7, 0.7, 0.7),
  })
  y -= lineHeight * 1.5

  page.drawText(clean("ESEMÉNYNAPLÓ"), {
    x: margin, y, size: 13, font: helveticaBold, color: rgb(0.1, 0.1, 0.1),
  })
  y -= lineHeight * 1.5

  // Tábla fejléc
  const colDatum = margin
  const colTipus = margin + 110
  const colUser = margin + 240
  const colLeiras = margin + 340

  page.drawText(clean("Dátum"), {
    x: colDatum, y, size: 8, font: helveticaBold, color: rgb(0.4, 0.4, 0.4),
  })
  page.drawText(clean("Esemény"), {
    x: colTipus, y, size: 8, font: helveticaBold, color: rgb(0.4, 0.4, 0.4),
  })
  page.drawText(clean("Felhasználó"), {
    x: colUser, y, size: 8, font: helveticaBold, color: rgb(0.4, 0.4, 0.4),
  })
  page.drawText(clean("Leírás"), {
    x: colLeiras, y, size: 8, font: helveticaBold, color: rgb(0.4, 0.4, 0.4),
  })
  y -= 4
  page.drawLine({
    start: { x: margin, y }, end: { x: pageWidth - margin, y },
    thickness: 0.5, color: rgb(0.8, 0.8, 0.8),
  })
  y -= smallLine

  // --- Események ---
  const eventTypeLabels: Record<string, string> = {
    erkeztetve: "Érkeztetés",
    iktatva: "Iktatás",
    szignalva: "Szignálás",
    megtekintve: "Megtekintés",
    modositva: "Módosítás",
    letoltve: "Letöltés",
    nyomtatva: "Nyomtatás",
    tovabbitva: "Továbbítás",
    elintezve: "Elintézés",
    lezarva: "Lezárás",
    irattarozva: "Irattározás",
    selejtezve: "Selejtezés",
    jogosultsag_valtozott: "Jogosultság változás",
    hozzaferes_modositas: "Hozzáférés módosítás",
  }

  for (const event of (events || [])) {
    // Új oldal szükség esetén
    if (y < margin + lineHeight * 3) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }

    const dateStr = new Date(event.tortent).toLocaleString("hu-HU", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    })
    const typeLabel = eventTypeLabels[event.esemeny_tipus] || event.esemeny_tipus
    const userName = userMap[event.user_id] || "Rendszer"
    let description = event.indoklas || ""
    
    // Truncálás a leíráshoz, hogy elférjen
    const maxDescWidth = pageWidth - margin - colLeiras
    if (description.length > 40) {
      description = description.substring(0, 40) + "..."
    }

    page.drawText(clean(dateStr), {
      x: colDatum, y, size: 8, font: helvetica, color: rgb(0, 0, 0),
    })
    page.drawText(clean(typeLabel), {
      x: colTipus, y, size: 8, font: helveticaBold, color: rgb(0.01, 0.72, 0.80),
    })
    page.drawText(clean(userName), {
      x: colUser, y, size: 8, font: helvetica, color: rgb(0.3, 0.3, 0.3),
    })
    page.drawText(clean(description), {
      x: colLeiras, y, size: 8, font: helvetica, color: rgb(0.3, 0.3, 0.3),
    })

    y -= smallLine * 1.3

    // Halvány elválasztó
    page.drawLine({
      start: { x: margin, y: y + 4 }, end: { x: pageWidth - margin, y: y + 4 },
      thickness: 0.3, color: rgb(0.9, 0.9, 0.9),
    })
  }

  if (!events || events.length === 0) {
    page.drawText(clean("Nincs rögzített esemény."), {
      x: margin, y, size: 10, font: helvetica, color: rgb(0.5, 0.5, 0.5),
    })
  }

  // --- Lábléc minden oldalra ---
  const now = new Date()
  const footerText = `Generálva: ${now.toLocaleString("hu-HU")} | eaisyDocs Életciklus Riport | ${dossier.iktatoszam}`
  for (const p of pdfDoc.getPages()) {
    p.drawText(clean(footerText), {
      x: margin,
      y: 25,
      size: 7,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    })
  }

  // Naplózás — az export maga is naplózandó
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
    esemeny_tipus: "letoltve",
    user_id: user.id,
    indoklas: "Életciklus riport PDF exportálva",
  })

  // PDF binary visszaadása base64-ben
  const pdfBytes = await pdfDoc.save()
  const base64 = Buffer.from(pdfBytes).toString("base64")

  return { success: true, base64, filename: `eletciklus_${dossier.iktatoszam}.pdf` }
}
