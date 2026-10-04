"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { getClientInfo } from "@/utils/client-info"
import crypto from "crypto"

async function checkDossierWritePermission(supabase: any, user: any, ugyiratId: string) {
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor, szervezeti_egyseg_id")
    .eq("id", user.id)
    .single()

  if (!profile) {
    return { error: "Felhasználói profil nem található." }
  }

  const userRole = profile.docs_szerepkor || "ugyintezo"
  const isSzuper = ["admin", "iktato"].includes(userRole)
  
  if (isSzuper) {
    return { success: true, profile }
  }

  const { data: ugyirat } = await supabase
    .from("ugyirat")
    .select("szervezeti_egyseg_id, ugy ( felelos_user_id )")
    .eq("id", ugyiratId)
    .single()

  const { data: explicitAccess } = await supabase
    .from("ugyirat_hozzaferes")
    .select("id")
    .eq("ugyirat_id", ugyiratId)
    .eq("user_id", user.id)
    .maybeSingle()
  
  const hasExplicit = !!explicitAccess

  if (userRole === "vezeto") {
    const inDept = ugyirat?.szervezeti_egyseg_id === profile.szervezeti_egyseg_id
    if (!inDept && !hasExplicit) {
      return { error: "Nincs jogosultságod ehhez a művelethez a szervezeti egységeden kívül." }
    }
  } else if (userRole === "ugyintezo") {
    const isAssigned = (ugyirat?.ugy as any)?.felelos_user_id === user.id
    if (!isAssigned && !hasExplicit) {
      return { error: "Nincs jogosultságod ehhez a művelethez, mivel nem vagy felelőse az ügyiratnak." }
    }
  } else {
    return { error: "Nincs jogosultságod ehhez a művelethez." }
  }

  return { success: true, profile }
}

export async function closeDossier(ugyiratId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve." }
  }

  const permCheck = await checkDossierWritePermission(supabase, user, ugyiratId)
  if (permCheck.error) return { error: permCheck.error }
  if (permCheck.profile.docs_szerepkor === "ugyintezo") {
    return { error: "Ügyintéző nem zárhat le ügyiratot." }
  }

  // Lekérjük az ügyiratot és az irattári tervet
  const { data: ugyirat } = await supabase
    .from("ugyirat")
    .select("ugy_id, irattari_terv(megorzesi_ido_ev)")
    .eq("id", ugyiratId)
    .single()

  if (!ugyirat) return { error: "Ügyirat nem található." }

  // Feladatok ellenőrzése: ne lehessen lezáratlan vagy elutasított feladattal irattározni
  const { data: tasks } = await supabase
    .from("feladat")
    .select("id, allapot")
    .eq("ugyirat_id", ugyiratId)

  if (tasks && tasks.length > 0) {
    const hasRejected = tasks.some((t) => t.allapot === "elutasitott")
    if (hasRejected) {
      return { error: "Az ügyirat nem irattározható: elutasított feladat található benne. Kérjük vizsgálja felül a feladatokat." }
    }
    const hasUnfinished = tasks.some((t) => t.allapot !== "kesz")
    if (hasUnfinished) {
      return { error: "Az ügyirat nem irattározható: még befejezetlen feladatok vannak folyamatban." }
    }
  }

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

  const permCheck = await checkDossierWritePermission(supabase, user, ugyiratId)
  if (permCheck.error) return { error: permCheck.error }
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

  // --- @mention értesítések ---
  // Felhasználók kikeresése név alapján — a szövegben @FelhasználóNév mintákat keresünk
  const { data: allUsers } = await supabase
    .from("felhasznalo_profil")
    .select("id, nev")

  if (allUsers && allUsers.length > 0) {
    // Küldő neve
    const senderProfile = allUsers.find(u => u.id === user.id)
    const senderName = senderProfile?.nev || "Valaki"

    // Ügyirat iktatószámának lekérése
    const { data: ugyiratData } = await supabase
      .from("ugyirat")
      .select("iktatoszam")
      .eq("id", ugyiratId)
      .single()

    const iktatoszam = ugyiratData?.iktatoszam || ""

    // Ismert felhasználóneveket keresünk a szövegben (hosszabb nevek először, 
    // hogy "Nagy Dániel" ne matcheljen "Nagy"-ként ha van egy "Nagy" nevű user is)
    const sortedUsers = [...allUsers].sort((a, b) => b.nev.length - a.nev.length)

    for (const u of sortedUsers) {
      if (text.includes(`@${u.nev}`)) {
        await supabase.from("alkalmazas_ertesites").insert({
          user_id: u.id,
          cim: `Megemlítettek egy megjegyzésben${iktatoszam ? ` (${iktatoszam})` : ""}`,
          szoveg: `${senderName}: ${text.length > 120 ? text.substring(0, 120) + "…" : text}`,
          link_url: `/dossiers/${ugyiratId}?tab=feladatok`
        })
      }
    }
  }

  revalidatePath(`/dossiers/${ugyiratId}`)
  return { success: true }
}

export async function updateDossierStatus(ugyiratId: string, ugyId: string, newStatus: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  const permCheck = await checkDossierWritePermission(supabase, user, ugyiratId)
  if (permCheck.error) return { error: permCheck.error }

  // Check if valid status transition
  if (!["ugyintezes_alatt", "elintezett"].includes(newStatus)) {
    return { error: "Érvénytelen státusz." }
  }

  // Ha elintézettre állítjuk: szigorú feladat-ellenőrzés
  if (newStatus === "elintezett") {
    const { data: tasks } = await supabase
      .from("feladat")
      .select("id, allapot")
      .eq("ugyirat_id", ugyiratId)

    if (tasks && tasks.length > 0) {
      const rejectedCount = tasks.filter((t) => t.allapot === "elutasitott").length
      if (rejectedCount > 0) {
        return {
          error: `Az ügyirat nem intézhető el: ${rejectedCount} db elutasított feladat található benne. Kérjük vizsgálja felül vagy ossza ki újra a feladatot az elintézés előtt.`
        }
      }
      const unfinishedCount = tasks.filter((t) => t.allapot !== "kesz").length
      if (unfinishedCount > 0) {
        return {
          error: `Az ügyirat nem intézhető el: még ${unfinishedCount} db befejezetlen feladat van folyamatban.`
        }
      }
    }
  }

  const { error: ugyiratError } = await supabase
    .from("ugyirat")
    .update({ statusz: newStatus })
    .eq("id", ugyiratId)

  if (ugyiratError) return { error: "Hiba az ügyirat frissítésekor." }

  // Szülő ügy státuszának szinkronizálása
  if (ugyId) {
    if (newStatus === "elintezett") {
      const { data: siblings } = await supabase
        .from("ugyirat")
        .select("id, statusz")
        .eq("ugy_id", ugyId)

      const hasUnfinishedSiblings = siblings?.some(
        (s) => s.id !== ugyiratId && !["elintezett", "lezart", "irattarban", "selejtezheto"].includes(s.statusz)
      )

      if (!hasUnfinishedSiblings) {
        await supabase
          .from("ugy")
          .update({ statusz: "lezart", lezarva: new Date().toISOString() })
          .eq("id", ugyId)
      }
    } else if (newStatus === "ugyintezes_alatt") {
      await supabase
        .from("ugy")
        .update({ statusz: "folyamatban" })
        .eq("id", ugyId)
    }
  }

  const { ip, userAgent } = await getClientInfo()

  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
    esemeny_tipus: newStatus === "elintezett" ? "elintezve" : "modositva",
    user_id: user.id,
    indoklas: newStatus === "elintezett"
      ? "Ügyirat szakmailag elintézve (ügyintézési folyamat lezárult)."
      : "Ügyirat visszahelyezve ügyintézés alá.",
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

  const permCheck = await checkDossierWritePermission(supabase, user, ugyiratId)
  if (permCheck.error) return { error: permCheck.error }

  // Ellenőrizzük, hogy az ügyirat nincs-e lezárva vagy irattárban
  const { data: ugyirat } = await supabase
    .from("ugyirat")
    .select("statusz, iktatoszam")
    .eq("id", ugyiratId)
    .single()

  if (ugyirat && ["irattarban", "lezart", "selejtezheto", "selejtezett"].includes(ugyirat.statusz)) {
    const statusLabels: Record<string, string> = {
      irattarban: "irattározott",
      lezart: "lezárt",
      selejtezheto: "selejtezésre jelölt",
      selejtezett: "selejtezett"
    }
    const label = statusLabels[ugyirat.statusz] || "lezárt"
    return { error: `A kiválasztott ügyirat (${ugyirat.iktatoszam}) már ${label}, ezért nem tölthető fel hozzá új válaszlevél / irat!` }
  }

  const targy = formData.get("targy") as string
  const file = formData.get("file") as File | null

  if (!targy || !file) {
    return { error: "A tárgy és a fájl csatolása kötelező!" }
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

  // Expedíciós paraméterek beolvasása
  const expediteMode = (formData.get("expediteMode") as string) || "none"
  const recipientEmail = (formData.get("recipientEmail") as string)?.trim()
  const emailSubject = (formData.get("emailSubject") as string)?.trim() || targy
  const emailMessage = (formData.get("emailMessage") as string)?.trim()
  const saveToPartnerId = (formData.get("saveToPartnerId") as string)?.trim()
  const partnerId = (formData.get("partnerId") as string)?.trim() || saveToPartnerId || null
  const postalTracking = (formData.get("postalTracking") as string)?.trim()
  const postalDate = (formData.get("postalDate") as string)?.trim()
  const postalAddress = (formData.get("postalAddress") as string)?.trim()
  const postalRecipient = (formData.get("postalRecipient") as string)?.trim()
  const postalNote = (formData.get("postalNote") as string)?.trim()

  // 1. Fájl feltöltése Storage-ba
  const fileExt = file.name.split('.').pop()
  const fileName = `${crypto.randomUUID()}.${fileExt}`
  
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
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    try {
      const { extractPdfText } = await import("@/utils/pdf-extractor")
      ocr_szoveg = await extractPdfText(buffer)
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
  const initialKezbesitesStatusz = expediteMode === "none" ? "expedialasra_var" : "expedialasra_var"
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
      kuldo_partner_id: partnerId || null,
      kezbesites_statusz: initialKezbesitesStatusz,
      kezbesites_modja: expediteMode === "posta" ? "posta" : (expediteMode === "email" ? "email" : null)
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

  // 5. Eseménynapló rögzítése a feltöltésről
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

  // 6. Expedíció végrehajtása (ha kérték az azonnali kézbesítést)
  let expediteError: string | undefined = undefined
  let dispatched = false

  if (expediteMode === "email") {
    if (!recipientEmail) {
      expediteError = "A kért e-mail kiküldéshez hiányzik a címzett e-mail címe!"
    } else {
      const { sendEmailWithAttachment } = await import("@/utils/mailer")
      const mailRes = await sendEmailWithAttachment({
        to: recipientEmail,
        subject: emailSubject || targy,
        text: emailMessage || `Tisztelt Partnerünk!\n\nMellékelten továbbítjuk a(z) ${ugyirat?.iktatoszam || ""} ügyirathoz tartozó "${targy}" kimenő iratunkat.\n\nÜdvözlettel,\neaisyDocs`,
        attachments: [
          {
            filename: file.name,
            content: buffer,
            contentType: file.type || "application/pdf"
          }
        ],
        iratId: iratData.id,
        ugyiratId,
        userId: user.id,
        saveToPartnerId: saveToPartnerId || undefined
      })

      if (!mailRes.success) {
        expediteError = `A válaszlevél rögzítve lett, de az e-mail kiküldés meghiúsult: ${mailRes.error}`
      } else {
        dispatched = true
      }
    }
  } else if (expediteMode === "posta") {
    const { recordPostalDispatch } = await import("@/utils/mailer")
    const postalRes = await recordPostalDispatch({
      iratId: iratData.id,
      ugyiratId,
      userId: user.id,
      recipientName: postalRecipient || "Partner",
      recipientAddress: postalAddress,
      trackingNumber: postalTracking,
      dispatchDate: postalDate,
      note: postalNote
    })

    if (!postalRes.success) {
      expediteError = `A válaszlevél rögzítve lett, de a postai feladás mentése hibát adott: ${postalRes.error}`
    } else {
      dispatched = true
    }
  }

  // 7. Háttérsorba állítás a PDF/A normalizáláshoz
  if (fajlResult) {
    try {
      const { enqueuePdfaConversion } = await import("@/utils/ai-worker-service")
      await enqueuePdfaConversion(iratData.id, fajlResult.id, supabase)
    } catch (err) {
      console.warn("PDF/A sorba állítás figyelmeztetés:", err)
    }
  }

  // 8. Értesítések kiküldése mentett keresésekre
  (async () => {
    try {
      const { checkSavedSearchesForNewIrat } = await import("@/utils/saved-search-alerts")
      await checkSavedSearchesForNewIrat(iratData.id, supabase)
    } catch (err) {
      console.warn("Mentett keresés értesítési figyelmeztetés:", err)
    }
  })().catch(console.error)

  revalidatePath(`/dossiers/${ugyiratId}`)
  return {
    success: true,
    iratId: iratData.id,
    dispatched,
    expediteError
  }
}

/**
 * Kimenő irat generálása közvetlen szöveg-szerkesztőből vagy sablonból,
 * és opcionális azonnali kiküldése (expediálás e-mailben PDF csatolmánnyal vagy postán).
 */
export async function generateAndExpediteReply(ugyiratId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  const permCheck = await checkDossierWritePermission(supabase, user, ugyiratId)
  if (permCheck.error) return { error: permCheck.error }

  const { data: ugyirat } = await supabase
    .from("ugyirat")
    .select("statusz, iktatoszam, ugy(targy)")
    .eq("id", ugyiratId)
    .single()

  if (ugyirat && ["irattarban", "lezart", "selejtezheto", "selejtezett"].includes(ugyirat.statusz)) {
    return { error: `A kiválasztott ügyirat (${ugyirat.iktatoszam}) lezárt, ezért nem hozható létre új kimenő irat!` }
  }

  const targy = (formData.get("targy") as string)?.trim()
  const tartalom = (formData.get("tartalom") as string)?.trim() || ""
  const cimzett = (formData.get("cimzett") as string)?.trim()
  const sablonTipus = (formData.get("sablon_tipus") as string)?.trim() || "egyedi"
  const hivatkozas = (formData.get("hivatkozas") as string)?.trim() || ugyirat?.iktatoszam || ""

  // Opcionális csatolt külső PDF fájl (melléklet)
  const attachedFile = (formData.get("attachment") as File | null) || (formData.get("file") as File | null)
  const hasAttachedFile = !!(attachedFile && attachedFile.size > 0)

  if (!targy) {
    return { error: "A levél tárgyának megadása kötelező!" }
  }

  if (!tartalom && !hasAttachedFile) {
    return { error: "Kérjük, adja meg a levél szövegét vagy csatoljon egy PDF dokumentumot!" }
  }

  // Felhasználó profil
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("nev")
    .eq("id", user.id)
    .single()

  // Expedíciós adatok
  const expediteMode = (formData.get("expediteMode") as string) || "none"
  const recipientEmail = (formData.get("recipientEmail") as string)?.trim()
  const emailSubject = (formData.get("emailSubject") as string)?.trim() || targy
  const emailMessage = (formData.get("emailMessage") as string)?.trim()
  const saveToPartnerId = (formData.get("saveToPartnerId") as string)?.trim()
  const partnerId = (formData.get("partnerId") as string)?.trim() || saveToPartnerId || null
  const postalTracking = (formData.get("postalTracking") as string)?.trim()
  const postalDate = (formData.get("postalDate") as string)?.trim()
  const postalAddress = (formData.get("postalAddress") as string)?.trim()
  const postalRecipient = (formData.get("postalRecipient") as string)?.trim() || cimzett
  const postalNote = (formData.get("postalNote") as string)?.trim()

  const emailAttachments: Array<{
    filename: string
    content: Buffer
    contentType: string
  }> = []

  // 1. Ha van megadott szöveg (vagy nincs csatolt fájl), készítsünk hivatalos A4 levél PDF-et
  let generatedPdfBuffer: Buffer | null = null
  let generatedFileName: string | null = null
  let generatedStoragePath: string | null = null
  let generatedHash: string | null = null

  if (tartalom) {
    const { generateLetterPdfBuffer } = await import("@/utils/pdf-letter-generator")
    generatedPdfBuffer = await generateLetterPdfBuffer({
      targy,
      cimzett,
      iktatoszam: ugyirat?.iktatoszam || undefined,
      ugyTargy: (ugyirat?.ugy as any)?.targy || undefined,
      hivatkozas,
      tartalom,
      authorNev: profile?.nev || "eaisyDocs"
    })

    generatedStoragePath = `${crypto.randomUUID()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from("irat_files")
      .upload(generatedStoragePath, generatedPdfBuffer, {
        contentType: "application/pdf",
        upsert: false
      })

    if (uploadError) return { error: "Hiba a generált PDF feltöltésekor: " + uploadError.message }

    generatedHash = crypto.createHash("sha256").update(generatedPdfBuffer).digest("hex")
    const dateStr = new Date().toLocaleDateString("hu-HU").replace(/\./g, "").replace(/ /g, "_")
    generatedFileName = `kimenő_${targy.toLowerCase().replace(/[^a-z0-9]/gi, "_").substring(0, 30)}_${dateStr}.pdf`

    emailAttachments.push({
      filename: generatedFileName,
      content: generatedPdfBuffer,
      contentType: "application/pdf"
    })
  }

  // 2. Ha csatoltak külön PDF fájlt, töltsük fel és készítsük elő az e-mail csatolmányt
  let attachedBuffer: Buffer | null = null
  let attachedStoragePath: string | null = null
  let attachedHash: string | null = null
  let attachedOcrText: string | null = null

  if (hasAttachedFile && attachedFile) {
    attachedBuffer = Buffer.from(await attachedFile.arrayBuffer())
    attachedHash = crypto.createHash("sha256").update(attachedBuffer).digest("hex")
    attachedStoragePath = `${crypto.randomUUID()}-${attachedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`

    const { error: attachedUploadErr } = await supabase.storage
      .from("irat_files")
      .upload(attachedStoragePath, attachedBuffer, {
        contentType: attachedFile.type || "application/pdf",
        upsert: false
      })

    if (attachedUploadErr) {
      return { error: "Hiba a csatolt PDF feltöltésekor: " + attachedUploadErr.message }
    }

    if (attachedFile.type === "application/pdf" || attachedFile.name.toLowerCase().endsWith(".pdf")) {
      try {
        const { extractPdfText } = await import("@/utils/pdf-extractor")
        attachedOcrText = await extractPdfText(attachedBuffer)
      } catch (e) {
        console.warn("Nem sikerült kinyerni a szöveget a csatolt PDF-ből:", e)
      }
    }

    emailAttachments.push({
      filename: attachedFile.name,
      content: attachedBuffer,
      contentType: attachedFile.type || "application/pdf"
    })
  }

  // 3. Alszám számítás
  const { data: iratok } = await supabase
    .from("irat")
    .select("alszam")
    .eq("ugyirat_id", ugyiratId)

  const maxAlszam = iratok?.reduce((max, i) => Math.max(max, i.alszam || 0), 0) || 0
  const alszam = maxAlszam + 1

  // 4. Irat rekord létrehozása
  const initialKezbesitesStatusz = "expedialasra_var"
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
      kuldo_partner_id: partnerId || null,
      kezbesites_statusz: initialKezbesitesStatusz,
      kezbesites_modja: expediteMode === "posta" ? "posta" : (expediteMode === "email" ? "email" : null)
    })
    .select("id")
    .single()

  if (iratError || !iratData) return { error: "Hiba az irat rekord létrehozásakor." }

  // 5. Irat fájl rekordok mentése
  const createdFajlIds: string[] = []

  // 5a. Generált levél fájl mentése
  if (generatedPdfBuffer && generatedStoragePath && generatedFileName && generatedHash) {
    const { data: genFajl } = await supabase
      .from("irat_fajl")
      .insert({
        irat_id: iratData.id,
        storage_path: generatedStoragePath,
        eredeti_fajlnev: generatedFileName,
        mime_type: "application/pdf",
        meret_byte: generatedPdfBuffer.length,
        sha256: generatedHash,
        verzio: 1,
        ocr_szoveg: tartalom
      })
      .select("id")
      .single()

    if (genFajl?.id) createdFajlIds.push(genFajl.id)
  }

  // 5b. Csatolt külső PDF fájl mentése (ha volt feltöltve)
  if (hasAttachedFile && attachedFile && attachedStoragePath && attachedBuffer && attachedHash) {
    const { data: attFajl } = await supabase
      .from("irat_fajl")
      .insert({
        irat_id: iratData.id,
        storage_path: attachedStoragePath,
        eredeti_fajlnev: attachedFile.name,
        mime_type: attachedFile.type || "application/pdf",
        meret_byte: attachedFile.size,
        sha256: attachedHash,
        verzio: generatedPdfBuffer ? 2 : 1,
        ocr_szoveg: attachedOcrText
      })
      .select("id")
      .single()

    if (attFajl?.id) createdFajlIds.push(attFajl.id)
  }

  // 6. Eseménynapló rögzítése
  const auditDetails = hasAttachedFile && generatedPdfBuffer
    ? `Kimenő válaszlevél generálva (${sablonTipus}) és PDF csatolva (${attachedFile!.name}): ${targy}`
    : hasAttachedFile
    ? `Kimenő irat PDF feltöltve (${attachedFile!.name}): ${targy}`
    : `Kimenő irat generálva (${sablonTipus}): ${targy}`

  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
    esemeny_tipus: "modositva",
    user_id: user.id,
    indoklas: auditDetails,
  })

  // 7. Expedíció végrehajtása
  let expediteError: string | undefined = undefined
  let dispatched = false

  if (expediteMode === "email") {
    if (!recipientEmail) {
      expediteError = "A kért e-mail kiküldéshez hiányzik a címzett e-mail címe!"
    } else {
      const { sendEmailWithAttachment } = await import("@/utils/mailer")
      const fallbackBody = tartalom || `Tisztelt Partnerünk!\n\nMellékelten továbbítjuk a(z) ${ugyirat?.iktatoszam || ""} ügyirathoz tartozó "${targy}" kimenő iratunkat.\n\nÜdvözlettel,\n${profile?.nev || "eaisyDocs"}`

      const mailRes = await sendEmailWithAttachment({
        to: recipientEmail,
        subject: emailSubject || targy,
        text: emailMessage || fallbackBody,
        attachments: emailAttachments,
        iratId: iratData.id,
        ugyiratId,
        userId: user.id,
        saveToPartnerId: saveToPartnerId || undefined
      })

      if (!mailRes.success) {
        expediteError = `A kimenő irat létrejött, de az e-mail kiküldés meghiúsult: ${mailRes.error}`
      } else {
        dispatched = true
      }
    }
  } else if (expediteMode === "posta") {
    const { recordPostalDispatch } = await import("@/utils/mailer")
    const postalRes = await recordPostalDispatch({
      iratId: iratData.id,
      ugyiratId,
      userId: user.id,
      recipientName: postalRecipient || cimzett || "Partner",
      recipientAddress: postalAddress,
      trackingNumber: postalTracking,
      dispatchDate: postalDate,
      note: postalNote
    })

    if (!postalRes.success) {
      expediteError = `A kimenő irat létrejött, de a postai feladás mentése hibát adott: ${postalRes.error}`
    } else {
      dispatched = true
    }
  }

  // 8. PDF/A normalizálás sorba állítása minden létrehozott fájlra
  for (const fajlId of createdFajlIds) {
    try {
      const { enqueuePdfaConversion } = await import("@/utils/ai-worker-service")
      await enqueuePdfaConversion(iratData.id, fajlId, supabase)
    } catch (err) {
      console.warn("PDF/A sorba állítás figyelmeztetés:", err)
    }
  }

  revalidatePath(`/dossiers/${ugyiratId}`)
  return {
    success: true,
    iratId: iratData.id,
    dispatched,
    expediteError
  }
}

/**
 * Már meglévő, expediálásra váró kimenő irat kiküldése (e-mailben csatolt PDF-fel vagy postai rögzítéssel).
 */
export async function expediteExistingDocument(ugyiratId: string, iratId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  const permCheck = await checkDossierWritePermission(supabase, user, ugyiratId)
  if (permCheck.error) return { error: permCheck.error }

  const expediteMode = (formData.get("expediteMode") as string) || "email"
  const recipientEmail = (formData.get("recipientEmail") as string)?.trim()
  const emailSubject = (formData.get("emailSubject") as string)?.trim()
  const emailMessage = (formData.get("emailMessage") as string)?.trim()
  const saveToPartnerId = (formData.get("saveToPartnerId") as string)?.trim()
  const postalTracking = (formData.get("postalTracking") as string)?.trim()
  const postalDate = (formData.get("postalDate") as string)?.trim()
  const postalAddress = (formData.get("postalAddress") as string)?.trim()
  const postalRecipient = (formData.get("postalRecipient") as string)?.trim()
  const postalNote = (formData.get("postalNote") as string)?.trim()

  if (expediteMode === "email") {
    if (!recipientEmail) return { error: "Címzett e-mail cím megadása kötelező!" }
    const { sendEmailWithAttachment } = await import("@/utils/mailer")
    const res = await sendEmailWithAttachment({
      to: recipientEmail,
      subject: emailSubject || "Hivatalos kimenő irat",
      text: emailMessage || "Tisztelt Partnerünk!\n\nMellékelten továbbítjuk hivatalos levelünket.\n\nÜdvözlettel,\neaisyDocs",
      iratId,
      ugyiratId,
      userId: user.id,
      saveToPartnerId: saveToPartnerId || undefined
    })

    if (!res.success) return { error: res.error || "Hiba az e-mail kiküldésekor." }
  } else if (expediteMode === "posta") {
    const { recordPostalDispatch } = await import("@/utils/mailer")
    const res = await recordPostalDispatch({
      iratId,
      ugyiratId,
      userId: user.id,
      recipientName: postalRecipient || "Címzett",
      recipientAddress: postalAddress,
      trackingNumber: postalTracking,
      dispatchDate: postalDate,
      note: postalNote
    })

    if (!res.success) return { error: res.error || "Hiba a postai feladás rögzítésekor." }
  }

  revalidatePath(`/dossiers/${ugyiratId}`)
  return { success: true }
}

/**
 * Partner központi e-mail címének frissítése
 */
export async function savePartnerCentralEmail(partnerId: string, email: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  const trimmed = email.trim()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) {
    return { error: "Érvénytelen e-mail formátum!" }
  }

  const { error } = await supabase
    .from("partner")
    .update({ email: trimmed })
    .eq("id", partnerId)

  if (error) return { error: error.message }

  // Naplózás
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "partner",
    entitas_id: partnerId,
    user_id: user.id,
    esemeny_tipus: "modositva",
    indoklas: `Központi partner e-mail cím frissítve az expedíciós felületről: ${trimmed}`
  })

  return { success: true }
}

export async function addPolymorphicLink(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  const ugyirat_id = formData.get("ugyirat_id") as string

  const permCheck = await checkDossierWritePermission(supabase, user, ugyirat_id)
  if (permCheck.error) return { error: permCheck.error }

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

  const permCheck = await checkDossierWritePermission(supabase, user, ugyirat_id)
  if (permCheck.error) return { error: permCheck.error }

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

export async function deleteOutgoingDocument(ugyiratId: string, iratId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve." }
  }

  const permCheck = await checkDossierWritePermission(supabase, user, ugyiratId)
  if (permCheck.error) return { error: permCheck.error }

  // Lekérjük az irat adatait ellenőrzéshez
  const { data: irat } = await supabase
    .from("irat")
    .select("id, ugyirat_id, targy, irany, alszam, kezbesites_statusz")
    .eq("id", iratId)
    .eq("ugyirat_id", ugyiratId)
    .single()

  if (!irat) {
    return { error: "A törölni kívánt irat nem található." }
  }

  if (irat.irany !== "kimeno") {
    return { error: "Kizárólag kimenő válaszirat törölhető ebből a panelből." }
  }

  if (irat.kezbesites_statusz === "expedialva") {
    return {
      error: "A már sikeresen kiküldött (expediált) kimenő irat nem törölhető a hatósági naplózási és irattári integritási szabályok miatt.",
    }
  }

  // Kapcsolt fájlok lekérése és törlése a tárolóból
  const { data: fajlok } = await supabase
    .from("irat_fajl")
    .select("id, storage_path, pdfa_path")
    .eq("irat_id", iratId)

  if (fajlok && fajlok.length > 0) {
    const pathsToRemove: string[] = []
    for (const f of fajlok) {
      if (f.storage_path) pathsToRemove.push(f.storage_path)
      if (f.pdfa_path) pathsToRemove.push(f.pdfa_path)
    }

    if (pathsToRemove.length > 0) {
      await supabase.storage.from("irat_files").remove(pathsToRemove)
      await supabase.storage.from("iratok").remove(pathsToRemove)
    }

    // Törlés az irat_fajl táblából
    await supabase.from("irat_fajl").delete().eq("irat_id", iratId)
  }

  // Kapcsolódó irat_kapcsolat rekordok törlése
  await supabase.from("irat_kapcsolat").delete().eq("irat_id", iratId)

  // Maga az irat törlése
  const { error: iratDeleteError } = await supabase
    .from("irat")
    .delete()
    .eq("id", iratId)

  if (iratDeleteError) {
    return { error: `Hiba történt az irat törlésekor: ${iratDeleteError.message}` }
  }

  const { ip, userAgent } = await getClientInfo()

  // Szigorú append-only eseménynapló bejegyzés
  await supabase.from("esemeny_naplo").insert({
    entitas_tipus: "ugyirat",
    entitas_id: ugyiratId,
    esemeny_tipus: "modositva",
    user_id: user.id,
    indoklas: `Még ki nem küldött kimenő irat vázlat törölve az ügyiratból: "${irat.targy}" (${irat.alszam ? `${irat.alszam}. alszám` : ""})`,
    ip_cim: ip,
    user_agent: userAgent,
  })

  revalidatePath(`/dossiers/${ugyiratId}`)
  revalidatePath(`/dossiers`)
  return { success: true }
}

