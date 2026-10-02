"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { generateJobDescriptionPdfBuffer } from "@/utils/hr/job-description-pdf-generator"
import { type JobDescriptionPdfData } from "@/utils/hr/job-description-constants"
import { executeHrDocumentFiling } from "@/utils/hr-filing-bridge"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface OnboardingJobDataResult {
  candidateName: string
  munkakorMegnevezes: string
  reszleg: string
  belepesDatuma: string
  jobCatalog: any | null
  catalogVersions: any[]
  existingAssignment: any | null
  existingDoc: any | null
}

/**
 * Lekéri az onboarding folyamathoz tartozó munkaköri leírás adatokat, központi sablonokat és rögzített dokumentumot.
 */
export async function getOnboardingJobData(params: {
  onboardingId?: string | null
  dolgozoId?: string | null
}): Promise<OnboardingJobDataResult> {
  const adminClient = getAdminClient()
  const { onboardingId, dolgozoId } = params

  let candidateName = "Munkavállaló"
  let munkakorMegnevezes = ""
  let reszleg = ""
  let belepesDatuma = ""

  if (onboardingId) {
    const { data: onb } = await adminClient
      .from("hr_onboarding")
      .select("nev, munkakor, reszleg, belepes_datuma")
      .eq("id", onboardingId)
      .single()
    if (onb) {
      candidateName = onb.nev || candidateName
      munkakorMegnevezes = onb.munkakor || munkakorMegnevezes
      reszleg = onb.reszleg || reszleg
      belepesDatuma = onb.belepes_datuma && onb.belepes_datuma !== "Hamarosan" ? onb.belepes_datuma : ""
    }
  } else if (dolgozoId) {
    const { data: prof } = await adminClient
      .from("felhasznalo_profil")
      .select("nev, munkakor, reszleg")
      .eq("id", dolgozoId)
      .single()
    if (prof) {
      candidateName = prof.nev || candidateName
      munkakorMegnevezes = prof.munkakor || munkakorMegnevezes
      reszleg = prof.reszleg || reszleg
    }
  }

  // 1. Meglévő hozzárendelés keresése
  let existingAssignment: any = null
  let query = adminClient.from("hr_onboarding_munkakor").select("*")
  if (onboardingId) {
    query = query.eq("onboarding_id", onboardingId)
  } else if (dolgozoId) {
    query = query.eq("dolgozo_id", dolgozoId)
  }
  const { data: assignData } = await query.order("created_at", { ascending: false }).limit(1)
  existingAssignment = assignData?.[0] || null

  // 2. Dokumentum feloldása (ha van hozzárendelt dokumentum)
  let existingDoc: any = null
  if (existingAssignment?.dokumentum_id) {
    const { data: doc } = await adminClient
      .from("hr_dokumentum")
      .select("*")
      .eq("id", existingAssignment.dokumentum_id)
      .single()
    if (doc) {
      let viewUrl = doc.url
      if (doc.url && !doc.url.startsWith("http")) {
        const { data: signed } = await adminClient.storage
          .from("irat_files")
          .createSignedUrl(doc.url, 3600)
        if (signed?.signedUrl) viewUrl = signed.signedUrl
      }
      existingDoc = { ...doc, displayUrl: viewUrl, url: viewUrl }
    }
  }

  // 3. Munkakör katalógus rekord feloldása
  let jobCatalog: any = null
  let catalogVersions: any[] = []

  if (munkakorMegnevezes) {
    const { data: job } = await adminClient
      .from("hr_munkakor")
      .select("*")
      .eq("megnevezes", munkakorMegnevezes)
      .limit(1)
      .maybeSingle()
    jobCatalog = job || null

    if (job?.id) {
      const { data: versions } = await adminClient
        .from("hr_munkakor_leiras_verzio")
        .select("*")
        .eq("munkakor_id", job.id)
        .order("verzio_szam", { ascending: false })

      if (versions && versions.length > 0) {
        catalogVersions = await Promise.all(
          versions.map(async (v) => {
            let signedUrl = null
            if (v.fajl_path) {
              const { data: s } = await adminClient.storage
                .from("irat_files")
                .createSignedUrl(v.fajl_path, 3600)
              signedUrl = s?.signedUrl || null
            }
            return { ...v, signedUrl }
          })
        )
      }
    }
  }

  return {
    candidateName,
    munkakorMegnevezes,
    reszleg,
    belepesDatuma,
    jobCatalog,
    catalogVersions,
    existingAssignment,
    existingDoc
  }
}

/**
 * Központi munkaköri sablon hozzárendelése az onboardinghoz
 */
export async function assignCatalogJobDescriptionAction(params: {
  onboardingId?: string | null
  dolgozoId?: string | null
  munkakorId: string
  versionId: string
  employeeName: string
  munkakorNev: string
  feorKod?: string | null
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Nincs bejelentkezve" }

    const adminClient = getAdminClient()
    const { onboardingId, dolgozoId, munkakorId, versionId, employeeName, munkakorNev, feorKod } = params

    // 1. Lekérjük a kiválasztott verziót
    const { data: version, error: vErr } = await adminClient
      .from("hr_munkakor_leiras_verzio")
      .select("*")
      .eq("id", versionId)
      .single()

    if (vErr || !version) {
      return { error: "Nem található a kiválasztott munkaköri leírás verzió." }
    }

    const docName = `${employeeName} - Munkaköri Leírás (${munkakorNev} v${version.verzio_szam})`

    // 2. Beillesztjük a hr_dokumentum táblába
    const { data: newDoc, error: docErr } = await adminClient
      .from("hr_dokumentum")
      .insert({
        dolgozo_id: dolgozoId || null,
        nev: docName,
        kategoria: "Munkaköri leírás",
        url: version.fajl_path
      })
      .select()
      .single()

    if (docErr || !newDoc) {
      return { error: "Nem sikerült menteni a dokumentumot az adatbázisba." }
    }

    // 3. Rögzítjük a hr_onboarding_munkakor táblában
    const payload = {
      onboarding_id: onboardingId || null,
      dolgozo_id: dolgozoId || null,
      munkakor_id: munkakorId,
      munkakor_megnevezes: munkakorNev,
      feor_kod: feorKod || null,
      verzio_id: versionId,
      dokumentum_id: newDoc.id,
      forras_tipus: "katalogus",
      statusz: "atadva",
      updated_at: new Date().toISOString()
    }

    // Megnézzük létezik-e már hozzárendelés
    let existingQuery = adminClient.from("hr_onboarding_munkakor").select("id")
    if (onboardingId) existingQuery = existingQuery.eq("onboarding_id", onboardingId)
    else if (dolgozoId) existingQuery = existingQuery.eq("dolgozo_id", dolgozoId)
    const { data: existing } = await existingQuery.limit(1)

    if (existing && existing.length > 0) {
      await adminClient.from("hr_onboarding_munkakor").update(payload).eq("id", existing[0].id)
    } else {
      await adminClient.from("hr_onboarding_munkakor").insert(payload)
    }

    // 4. Ha az onboardingban volt munkaköri feladat, készre állítjuk!
    if (onboardingId) {
      const { data: tasks } = await adminClient
        .from("hr_onboarding_feladat")
        .select("id, cim, statusz")
        .eq("onboarding_id", onboardingId)

      const jobTask = (tasks || []).find((t: any) =>
        (t.cim || "").toLowerCase().includes("munkakör") ||
        (t.cim || "").toLowerCase().includes("munkaköri")
      )

      if (jobTask && jobTask.statusz !== "done") {
        await adminClient
          .from("hr_onboarding_feladat")
          .update({ statusz: "done" })
          .eq("id", jobTask.id)
      }
    }

    // 5. Ha a dolgozó már aktív, azonnal iktatjuk
    let iktatoszam = null
    if (dolgozoId) {
      const filingRes = await executeHrDocumentFiling(adminClient, {
        documentId: newDoc.id,
        employeeId: dolgozoId,
        customTargy: docName,
        currentUserId: user.id
      })
      if (filingRes.success && filingRes.iktatoszam) {
        iktatoszam = filingRes.iktatoszam
      }
    }

    revalidatePath("/hr/onboarding")
    if (dolgozoId) revalidatePath(`/hr/employee/${dolgozoId}`)

    return {
      success: true,
      document: newDoc,
      iktatoszam,
      isFiled: Boolean(iktatoszam)
    }
  } catch (err: any) {
    console.error("assignCatalogJobDescriptionAction error:", err)
    return { error: err.message || "Hiba történt a központi munkaköri sablon hozzárendelése során." }
  }
}

/**
 * Hivatalos Munkaköri Leírás dinamikus A4 PDF generálása Puppeteerrel
 */
export async function generateJobDescriptionPdfAction(params: {
  onboardingId?: string | null
  dolgozoId?: string | null
  data: JobDescriptionPdfData
  munkakorId?: string | null
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Nincs bejelentkezve" }

    const adminClient = getAdminClient()
    const { onboardingId, dolgozoId, data, munkakorId } = params

    // 1. PDF Buffer előállítása
    const pdfBuffer = await generateJobDescriptionPdfBuffer(data)

    // 2. Feltöltés Storage-be
    const idKey = onboardingId || dolgozoId || "munkakor"
    const timestamp = Date.now()
    const storagePath = `hr/munkakor/${idKey}/munkakori_leiras_${timestamp}.pdf`

    const { error: uploadErr } = await adminClient.storage
      .from("irat_files")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true
      })

    if (uploadErr) {
      console.error("Storage upload error (Munkaköri leírás):", uploadErr)
      return { error: "Nem sikerült a PDF fájlt feltölteni a tárolóba." }
    }

    const docName = `${data.employeeName} - Hivatalos Munkaköri Leírás (${data.munkakor})`

    // 3. Rekord létrehozása a hr_dokumentum táblában
    const { data: newDoc, error: docErr } = await adminClient
      .from("hr_dokumentum")
      .insert({
        dolgozo_id: dolgozoId || null,
        nev: docName,
        kategoria: "Munkaköri leírás",
        url: storagePath
      })
      .select()
      .single()

    if (docErr || !newDoc) {
      return { error: "Nem sikerült menteni a dokumentumot az adatbázisba." }
    }

    // 4. Frissítjük vagy beszúrjuk a hr_onboarding_munkakor rekordot
    const payload = {
      onboarding_id: onboardingId || null,
      dolgozo_id: dolgozoId || null,
      munkakor_id: munkakorId || null,
      munkakor_megnevezes: data.munkakor,
      feor_kod: data.feorKod || null,
      dokumentum_id: newDoc.id,
      forras_tipus: "generator",
      statusz: "atadva",
      updated_at: new Date().toISOString()
    }

    let existingQuery = adminClient.from("hr_onboarding_munkakor").select("id")
    if (onboardingId) existingQuery = existingQuery.eq("onboarding_id", onboardingId)
    else if (dolgozoId) existingQuery = existingQuery.eq("dolgozo_id", dolgozoId)
    const { data: existing } = await existingQuery.limit(1)

    if (existing && existing.length > 0) {
      await adminClient.from("hr_onboarding_munkakor").update(payload).eq("id", existing[0].id)
    } else {
      await adminClient.from("hr_onboarding_munkakor").insert(payload)
    }

    // 5. Feladat készre állítása
    if (onboardingId) {
      const { data: tasks } = await adminClient
        .from("hr_onboarding_feladat")
        .select("id, cim, statusz")
        .eq("onboarding_id", onboardingId)

      const jobTask = (tasks || []).find((t: any) =>
        (t.cim || "").toLowerCase().includes("munkakör") ||
        (t.cim || "").toLowerCase().includes("munkaköri")
      )

      if (jobTask && jobTask.statusz !== "done") {
        await adminClient
          .from("hr_onboarding_feladat")
          .update({ statusz: "done" })
          .eq("id", jobTask.id)
      }
    }

    // 6. Ha a dolgozó már aktív, azonnal beiktatjuk
    let iktatoszam = null
    if (dolgozoId) {
      const filingRes = await executeHrDocumentFiling(adminClient, {
        documentId: newDoc.id,
        employeeId: dolgozoId,
        customTargy: docName,
        currentUserId: user.id
      })
      if (filingRes.success && filingRes.iktatoszam) {
        iktatoszam = filingRes.iktatoszam
      }
    }

    revalidatePath("/hr/onboarding")
    if (dolgozoId) revalidatePath(`/hr/employee/${dolgozoId}`)

    return {
      success: true,
      document: newDoc,
      iktatoszam,
      isFiled: Boolean(iktatoszam)
    }
  } catch (err: any) {
    console.error("generateJobDescriptionPdfAction error:", err)
    return { error: err.message || "Hiba történt a munkaköri leírás PDF generálása során." }
  }
}

/**
 * Egyedi munkaköri leírás PDF feltöltése
 */
export async function uploadCustomJobDescriptionAction(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Nincs bejelentkezve" }

    const adminClient = getAdminClient()

    const file = formData.get("file") as File
    const onboardingId = formData.get("onboardingId") as string | null
    const dolgozoId = formData.get("dolgozoId") as string | null
    const employeeName = (formData.get("employeeName") as string) || "Munkavállaló"
    const munkakorNev = (formData.get("munkakorNev") as string) || "Munkakör"
    const munkakorId = formData.get("munkakorId") as string | null
    const feorKod = formData.get("feorKod") as string | null

    if (!file) {
      return { error: "Nincs kiválasztva fájl." }
    }

    const idKey = onboardingId || dolgozoId || "munkakor"
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const storagePath = `hr/munkakor/${idKey}/egyedi_${timestamp}_${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadErr } = await adminClient.storage
      .from("irat_files")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/pdf",
        upsert: true
      })

    if (uploadErr) {
      console.error("Upload error:", uploadErr)
      return { error: "Nem sikerült feltölteni a munkaköri leírás fájlt." }
    }

    const docName = `${employeeName} - Munkaköri Leírás (${munkakorNev})`

    const { data: newDoc, error: docErr } = await adminClient
      .from("hr_dokumentum")
      .insert({
        dolgozo_id: dolgozoId || null,
        nev: docName,
        kategoria: "Munkaköri leírás",
        url: storagePath
      })
      .select()
      .single()

    if (docErr || !newDoc) {
      return { error: "Nem sikerült menteni a dokumentumot az adatbázisba." }
    }

    // hr_onboarding_munkakor mentése
    const payload = {
      onboarding_id: onboardingId || null,
      dolgozo_id: dolgozoId || null,
      munkakor_id: munkakorId || null,
      munkakor_megnevezes: munkakorNev,
      feor_kod: feorKod || null,
      dokumentum_id: newDoc.id,
      forras_tipus: "feltoltes",
      statusz: "atadva",
      updated_at: new Date().toISOString()
    }

    let existingQuery = adminClient.from("hr_onboarding_munkakor").select("id")
    if (onboardingId) existingQuery = existingQuery.eq("onboarding_id", onboardingId)
    else if (dolgozoId) existingQuery = existingQuery.eq("dolgozo_id", dolgozoId)
    const { data: existing } = await existingQuery.limit(1)

    if (existing && existing.length > 0) {
      await adminClient.from("hr_onboarding_munkakor").update(payload).eq("id", existing[0].id)
    } else {
      await adminClient.from("hr_onboarding_munkakor").insert(payload)
    }

    // Feladat készre állítása
    if (onboardingId) {
      const { data: tasks } = await adminClient
        .from("hr_onboarding_feladat")
        .select("id, cim, statusz")
        .eq("onboarding_id", onboardingId)

      const jobTask = (tasks || []).find((t: any) =>
        (t.cim || "").toLowerCase().includes("munkakör") ||
        (t.cim || "").toLowerCase().includes("munkaköri")
      )

      if (jobTask && jobTask.statusz !== "done") {
        await adminClient
          .from("hr_onboarding_feladat")
          .update({ statusz: "done" })
          .eq("id", jobTask.id)
      }
    }

    // Ha van dolgozoId, azonnal iktatjuk
    let iktatoszam = null
    if (dolgozoId) {
      const filingRes = await executeHrDocumentFiling(adminClient, {
        documentId: newDoc.id,
        employeeId: dolgozoId,
        customTargy: docName,
        currentUserId: user.id
      })
      if (filingRes.success && filingRes.iktatoszam) {
        iktatoszam = filingRes.iktatoszam
      }
    }

    revalidatePath("/hr/onboarding")
    if (dolgozoId) revalidatePath(`/hr/employee/${dolgozoId}`)

    return {
      success: true,
      document: newDoc,
      iktatoszam,
      isFiled: Boolean(iktatoszam)
    }
  } catch (err: any) {
    console.error("uploadCustomJobDescriptionAction error:", err)
    return { error: err.message || "Hiba történt a fájl feltöltése során." }
  }
}

/**
 * Meglévő munkaköri leírás iktatása az 1.1 dossziéba
 */
export async function fileExistingJobDescriptionDocument(params: {
  documentId: string
  dolgozoId: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const adminClient = getAdminClient()
  const { documentId, dolgozoId } = params

  const { data: docData } = await adminClient
    .from("hr_dokumentum")
    .select("nev, iktatoszam")
    .eq("id", documentId)
    .single()

  if (docData?.iktatoszam) {
    return { success: true, iktatoszam: docData.iktatoszam }
  }

  const filingRes = await executeHrDocumentFiling(adminClient, {
    documentId,
    employeeId: dolgozoId,
    customTargy: docData?.nev || "Munkaköri Leírás",
    currentUserId: user.id
  })

  revalidatePath("/hr/onboarding")
  revalidatePath(`/hr/employee/${dolgozoId}`)
  return filingRes
}
