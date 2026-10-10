"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import crypto from "crypto"
import { 
  generateSafetyTrainingPdf,
  DEFAULT_SAFETY_TOPICS,
  type SafetyTrainingPdfData 
} from "@/utils/hr/safety-training-pdf-generator"
import { executeHrDocumentFiling } from "@/utils/hr-filing-bridge"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Lekéri a munkavállalóhoz vagy onboarding folyamathoz tartozó munkavédelmi oktatási jegyzőkönyvet
 */
export async function getSafetyTrainingRecord(options: {
  dolgozoId?: string | null
  onboardingId?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve", data: null, existingDocument: null }

  const adminClient = getAdminClient()

  let query = adminClient
    .from("hr_munkavedelmi_oktatas")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)

  if (options.dolgozoId && options.onboardingId) {
    query = query.or(`dolgozo_id.eq.${options.dolgozoId},onboarding_id.eq.${options.onboardingId}`)
  } else if (options.dolgozoId) {
    query = query.eq("dolgozo_id", options.dolgozoId)
  } else if (options.onboardingId) {
    query = query.eq("onboarding_id", options.onboardingId)
  } else {
    return { data: null, existingDocument: null }
  }

  const { data, error } = await query
  if (error) {
    console.error("Hiba a munkavédelmi oktatás lekérésekor:", error)
    return { error: error.message, data: null, existingDocument: null }
  }

  const record = data?.[0] || null
  let existingDocument: any = null

  if (record?.dokumentum_id) {
    const { data: doc } = await adminClient
      .from("hr_dokumentum")
      .select("*")
      .eq("id", record.dokumentum_id)
      .single()

    if (doc) {
      let viewUrl = doc.url
      if (doc.url && !doc.url.startsWith("http")) {
        const { data: signed } = await adminClient.storage
          .from("irat_files")
          .createSignedUrl(doc.url, 3600)
        if (signed?.signedUrl) viewUrl = signed.signedUrl
      }
      existingDocument = { ...doc, url: viewUrl }
    }
  }

  return { data: record, existingDocument }
}

/**
 * Munkavédelmi és Tűzvédelmi Oktatási Jegyzőkönyv generálása és iktatása
 */
export async function generateAndFileSafetyTrainingAction(params: {
  onboardingId?: string | null
  dolgozoId?: string | null
  employeeName: string
  munkakor?: string | null
  reszleg?: string | null
  oktatoNeve: string
  oktatoBeosztasa?: string | null
  oktatasDatuma?: string | null
  oktatasTipusa?: string | null
  tematika?: string[] | null
  megjegyzes?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const adminClient = getAdminClient()

  // 1. Kiegészítő adatok (profil, munkakör, lakcím)
  let lakcim: string | null = null
  let szuletesiDatum: string | null = null
  let szuletesiHely: string | null = null
  let anyjaNeve: string | null = null
  let reszleg = params.reszleg || null

  if (params.dolgozoId) {
    const { data: profile } = await adminClient
      .from("felhasznalo_profil")
      .select("lakcim, szuletesi_datum, szuletesi_hely, anyja_neve, reszleg")
      .eq("id", params.dolgozoId)
      .single()

    if (profile) {
      lakcim = profile.lakcim || null
      szuletesiDatum = profile.szuletesi_datum || null
      szuletesiHely = profile.szuletesi_hely || null
      anyjaNeve = profile.anyja_neve || null
      if (!reszleg) reszleg = profile.reszleg || null
    }
  } else if (params.onboardingId) {
    const { data: onb } = await adminClient
      .from("hr_onboarding")
      .select("reszleg, munkakor")
      .eq("id", params.onboardingId)
      .single()

    if (onb) {
      if (!reszleg) reszleg = onb.reszleg || null
    }
  }

  // 2. Céginformációk lekérése
  const { data: orgSettings } = await adminClient
    .from("szervezeti_beallitasok")
    .select("cegnev, szekhely, adoszam, kepviselo_neve")
    .limit(1)
    .single()

  const cegNev = orgSettings?.cegnev || "ThinkAI Munkaügyi és Szolgáltató Kft."
  const cegSzekhely = orgSettings?.szekhely || "1138 Budapest, Váci út 140."
  const cegAdoszam = orgSettings?.adoszam || "27849120-2-41"
  const cegKepviselo = orgSettings?.kepviselo_neve || "Nagy Dániel Ügyvezető"

  const trainingTopics = params.tematika && params.tematika.length > 0 ? params.tematika : DEFAULT_SAFETY_TOPICS
  const oktatasDatuma = params.oktatasDatuma || new Date().toISOString().split("T")[0]

  try {
    // 3. PDF generálása Puppeteerrel
    const pdfData: SafetyTrainingPdfData = {
      employeeName: params.employeeName,
      employeeId: params.dolgozoId,
      onboardingId: params.onboardingId,
      munkakor: params.munkakor || "Munkatárs",
      reszleg,
      szuletesiDatum,
      szuletesiHely,
      anyjaNeve,
      lakcim,
      oktatasDatuma,
      oktatasTipusa: params.oktatasTipusa || "elozetes_munkaba_allasi",
      oktatoNeve: params.oktatoNeve,
      oktatoBeosztasa: params.oktatoBeosztasa || "Munkavédelmi és Tűzvédelmi Megbízott",
      cegNev,
      cegSzekhely,
      cegAdoszam,
      cegKepviselo,
      tematika: trainingTopics,
      megjegyzes: params.megjegyzes
    }

    const pdfBuffer = await generateSafetyTrainingPdf(pdfData)

    // 4. Feltöltés a Supabase Storage-ba (irat_files)
    const fileId = crypto.randomUUID()
    const storagePath = `hr/safety/munkavedelmi_oktatas_${fileId}.pdf`

    const { error: uploadError } = await adminClient.storage
      .from("irat_files")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true
      })

    if (uploadError) {
      console.error("Hiba a PDF tárolásakor:", uploadError)
      return { error: `Nem sikerült feltölteni a jegyzőkönyvet: ${uploadError.message}` }
    }

    const { data: signedUrlData } = await adminClient.storage
      .from("irat_files")
      .createSignedUrl(storagePath, 3600)

    // 5. Bejegyzés a hr_dokumentum táblába
    const docNev = `Munkavédelmi és Tűzvédelmi Oktatási Jegyzőkönyv - ${params.employeeName}`
    const { data: newDoc, error: docError } = await adminClient
      .from("hr_dokumentum")
      .insert({
        dolgozo_id: params.dolgozoId || null,
        nev: docNev,
        kategoria: "Munkavédelem",
        url: storagePath,
        alairas_statusz: "vazlat"
      })
      .select()
      .single()

    if (docError || !newDoc) {
      console.error("Hiba a hr_dokumentum beszúrásakor:", docError)
      return { error: docError?.message || "Nem sikerült rögzíteni a HR dokumentumot." }
    }

    // 6. Bejegyzés a hr_munkavedelmi_oktatas táblába
    const expDate = new Date(oktatasDatuma)
    expDate.setFullYear(expDate.getFullYear() + 1)
    const ervenyessegVege = expDate.toISOString().split("T")[0]

    const { data: trainingRecord, error: trainingErr } = await adminClient
      .from("hr_munkavedelmi_oktatas")
      .insert({
        dolgozo_id: params.dolgozoId || null,
        onboarding_id: params.onboardingId || null,
        oktatas_tipusa: params.oktatasTipusa || "elozetes_munkaba_allasi",
        oktatas_datuma: oktatasDatuma,
        ervenyesseg_vege: ervenyessegVege,
        oktato_neve: params.oktatoNeve,
        oktato_beosztasa: params.oktatoBeosztasa || "Munkavédelmi és Tűzvédelmi Megbízott",
        tematika: trainingTopics,
        megjegyzes: params.megjegyzes || null,
        dokumentum_id: newDoc.id
      })
      .select()
      .single()

    if (trainingErr) {
      console.error("Hiba a hr_munkavedelmi_oktatas beszúrásakor:", trainingErr)
    }

    // 7. Ha a dolgozónak már van fiókja, beiktatjuk a személyi dossziéba
    let filingResult = null
    if (params.dolgozoId) {
      try {
        filingResult = await executeHrDocumentFiling(adminClient, {
          documentId: newDoc.id,
          employeeId: params.dolgozoId,
          customTargy: docNev,
          currentUserId: user.id
        })
      } catch (err: any) {
        console.error("Hiba a munkavédelmi oktatás iktatásakor:", err)
      }
    }

    // 8. Ha Onboarding folyamatban történt, automatikusan készre pipáljuk a munkavédelmi feladatot
    if (params.onboardingId) {
      const { data: tasks } = await adminClient
        .from("hr_onboarding_feladat")
        .select("id, cim, statusz")
        .eq("onboarding_id", params.onboardingId)

      const safetyTask = (tasks || []).find((t: any) => 
        t.cim.toLowerCase().includes("munkavédel") || 
        t.cim.toLowerCase().includes("tűzvédel") || 
        t.cim.toLowerCase().includes("oktatás")
      )

      if (safetyTask && safetyTask.statusz !== "done") {
        await adminClient
          .from("hr_onboarding_feladat")
          .update({ statusz: "done" })
          .eq("id", safetyTask.id)
      }
    }

    // 9. Eseménynapló rögzítése
    await adminClient.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      esemeny_tipus: "adat_letrehozas",
      entitas_tipus: "hr_munkavedelmi_oktatas",
      entitas_id: trainingRecord?.id || newDoc.id,
      megjegyzes: `Munkavédelmi és Tűzvédelmi Oktatási Jegyzőkönyv kiállítva: ${params.employeeName}${
        filingResult?.iktatoszam ? ` (Iktatva: ${filingResult.iktatoszam})` : ""
      }`
    })

    revalidatePath("/hr/onboarding")
    if (params.dolgozoId) {
      revalidatePath(`/hr/employee/${params.dolgozoId}`)
      revalidatePath(`/hr/employee/${params.dolgozoId}/health`)
    }

    return {
      success: true,
      document: {
        id: newDoc.id,
        nev: newDoc.nev,
        url: signedUrlData?.signedUrl || storagePath,
        iktatoszam: filingResult?.iktatoszam || null
      },
      isFiled: !!filingResult?.iktatoszam
    }
  } catch (err: any) {
    console.error("Váratlan hiba a munkavédelmi jegyzőkönyv generálásakor:", err)
    return { error: err.message || "Váratlan hiba történt a generálás során." }
  }
}

/**
 * Már meglévő vázlat munkavédelmi jegyzőkönyv iktatása az eaisyDocs személyi dossziéba
 */
export async function fileExistingSafetyTrainingDocument(params: {
  documentId: string
  dolgozoId: string
  employeeName: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const adminClient = getAdminClient()
  const docNev = `Munkavédelmi és Tűzvédelmi Oktatási Jegyzőkönyv - ${params.employeeName}`

  try {
    const filingResult = await executeHrDocumentFiling(adminClient, {
      documentId: params.documentId,
      employeeId: params.dolgozoId,
      customTargy: docNev,
      currentUserId: user.id
    })

    revalidatePath("/hr/onboarding")
    revalidatePath(`/hr/employee/${params.dolgozoId}`)
    revalidatePath(`/hr/employee/${params.dolgozoId}/health`)

    return { 
      success: true, 
      iktatoszam: filingResult.iktatoszam 
    }
  } catch (err: any) {
    console.error("Hiba a munkavédelmi jegyzőkönyv iktatásakor:", err)
    return { error: err?.message || "Nem sikerült az iktatás a dossziéba." }
  }
}
