"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import crypto from "crypto"
import {
  generateAssetHandoverHtml,
  generateAssetHandoverPdf,
  type AssetItemData,
  type AssetHandoverPdfData,
} from "@/utils/hr/asset-handover-pdf-generator"
import { executeHrDocumentFiling, HR_FILING_CONSTANTS } from "@/utils/hr-filing-bridge"
import { getActiveCompanyIdServer, resolveCompanyDetailsServer } from "@/utils/company-server"
import { checkHrWriteAccess, requireHrAuthServer } from "@/utils/hr/hr-auth-guard"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verifyAssetAccess(
  adminClient: ReturnType<typeof getAdminClient>,
  target: {
    dolgozoId?: string | null
    onboardingId?: string | null
    assetId?: string | null
    documentId?: string | null
  },
  options: { allowSelfRead?: boolean; requireWrite?: boolean } = {}
): Promise<{
  ok: boolean
  error?: string
  user?: any
  activeCompanyId: string | null
}> {
  const auth = await requireHrAuthServer(
    ["onboarding", "employees", "offboarding", "organization", "admin"],
    null
  )
  if (!auth.user) {
    return { ok: false, error: "Nincs bejelentkezve", activeCompanyId: null }
  }

  const activeCompanyId = auth.activeCompanyId || (await getActiveCompanyIdServer())
  const isSelfRead =
    Boolean(options.allowSelfRead) &&
    Boolean(target.dolgozoId) &&
    target.dolgozoId === auth.user.id &&
    !target.onboardingId &&
    !target.assetId &&
    !target.documentId

  if (!auth.authorized && !isSelfRead) {
    return {
      ok: false,
      error: "Nincs jogosultságod a munkahelyi eszközök kezeléséhez.",
      activeCompanyId,
    }
  }

  if (!options.allowSelfRead && options.requireWrite !== false) {
    if (!checkHrWriteAccess(auth, ["admin", "onboarding", "offboarding"])) {
      return {
        ok: false,
        error: "Csak olvasási jogosultságod van, a munkahelyi eszközök módosítása nem engedélyezett.",
        activeCompanyId,
      }
    }
  }

  if (activeCompanyId) {
    if (target.dolgozoId && target.dolgozoId !== auth.user.id) {
      const [{ data: member }, { data: adatlap }] = await Promise.all([
        adminClient
          .from("company_members")
          .select("user_id")
          .eq("company_id", activeCompanyId)
          .eq("user_id", target.dolgozoId)
          .maybeSingle(),
        adminClient
          .from("hr_dolgozo_adatlap")
          .select("company_id")
          .eq("id", target.dolgozoId)
          .maybeSingle(),
      ])
      if (!member && adatlap?.company_id !== activeCompanyId) {
        return {
          ok: false,
          error: "A megadott munkavállaló nem tartozik az aktív vállalathoz.",
          activeCompanyId,
        }
      }
    }

    if (target.onboardingId) {
      const { data: ob } = await adminClient
        .from("hr_onboarding")
        .select("company_id")
        .eq("id", target.onboardingId)
        .maybeSingle()
      if (!ob || (ob.company_id && ob.company_id !== activeCompanyId)) {
        return {
          ok: false,
          error: "A beléptetési folyamat nem tartozik az aktív vállalathoz.",
          activeCompanyId,
        }
      }
    }

    if (target.assetId) {
      const { data: asset } = await adminClient
        .from("hr_munkahelyi_eszkoz")
        .select("company_id")
        .eq("id", target.assetId)
        .maybeSingle()
      if (!asset || (asset.company_id && asset.company_id !== activeCompanyId)) {
        return {
          ok: false,
          error: "A kiválasztott eszköz nem tartozik az aktív vállalathoz.",
          activeCompanyId,
        }
      }
    }

    if (target.documentId) {
      const { data: doc } = await adminClient
        .from("hr_dokumentum")
        .select("company_id")
        .eq("id", target.documentId)
        .maybeSingle()
      if (!doc || (doc.company_id && doc.company_id !== activeCompanyId)) {
        return {
          ok: false,
          error: "A dokumentum nem tartozik az aktív vállalathoz.",
          activeCompanyId,
        }
      }
    }
  }

  return { ok: true, user: auth.user, activeCompanyId }
}

/**
 * Lekéri a dolgozóhoz vagy onboarding folyamathoz tartozó kiadott eszközöket
 */
export async function getEmployeeAssets(options: {
  dolgozoId?: string | null
  onboardingId?: string | null
}) {
  const adminClient = getAdminClient()
  const access = await verifyAssetAccess(
    adminClient,
    { dolgozoId: options.dolgozoId, onboardingId: options.onboardingId },
    { allowSelfRead: true }
  )
  if (!access.ok) {
    return { error: access.error, data: [] }
  }

  let query = adminClient
    .from("hr_munkahelyi_eszkoz")
    .select("*")
    .order("created_at", { ascending: true })

  if (access.activeCompanyId) {
    query = query.eq("company_id", access.activeCompanyId)
  }

  if (options.dolgozoId && options.onboardingId) {
    query = query.or(`dolgozo_id.eq.${options.dolgozoId},onboarding_id.eq.${options.onboardingId}`)
  } else if (options.dolgozoId) {
    query = query.eq("dolgozo_id", options.dolgozoId)
  } else if (options.onboardingId) {
    query = query.eq("onboarding_id", options.onboardingId)
  } else {
    return { data: [] }
  }

  const { data, error } = await query
  if (error) {
    console.error("Hiba az eszközök lekérésekor:", error)
    return { error: error.message, data: [], existingDocument: null }
  }

  // Lekérjük a kapcsolt jegyzőkönyvet (ha már készült)
  let existingDocument: any = null
  const docId = data?.find((item) => item.dokumentum_id)?.dokumentum_id
  if (docId) {
    let docQuery = adminClient.from("hr_dokumentum").select("*").eq("id", docId)
    if (access.activeCompanyId) {
      docQuery = docQuery.eq("company_id", access.activeCompanyId)
    }
    const { data: doc } = await docQuery.maybeSingle()

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

  return { data: data || [], existingDocument }
}

/**
 * Egyedi eszköz rögzítése vagy módosítása
 */
export async function saveAssetItem(data: {
  id?: string
  dolgozoId?: string | null
  onboardingId?: string | null
  eszkoz_kategoria: string
  megnevezes: string
  gyari_szam?: string | null
  tartozekok?: string | null
  allapot?: string | null
  megjegyzes?: string | null
}) {
  const adminClient = getAdminClient()
  const access = await verifyAssetAccess(adminClient, {
    dolgozoId: data.dolgozoId,
    onboardingId: data.onboardingId,
    assetId: data.id || null,
  })
  if (!access.ok) return { error: access.error }

  if (data.id) {
    let updQuery = adminClient
      .from("hr_munkahelyi_eszkoz")
      .update({
        eszkoz_kategoria: data.eszkoz_kategoria,
        megnevezes: data.megnevezes,
        gyari_szam: data.gyari_szam || null,
        tartozekok: data.tartozekok || null,
        allapot: data.allapot || "uj",
        megjegyzes: data.megjegyzes || null,
      })
      .eq("id", data.id)

    if (access.activeCompanyId) {
      updQuery = updQuery.eq("company_id", access.activeCompanyId)
    }

    const { error } = await updQuery
    if (error) return { error: error.message }
  } else {
    const { error } = await adminClient.from("hr_munkahelyi_eszkoz").insert({
      dolgozo_id: data.dolgozoId || null,
      onboarding_id: data.onboardingId || null,
      eszkoz_kategoria: data.eszkoz_kategoria,
      megnevezes: data.megnevezes,
      gyari_szam: data.gyari_szam || null,
      tartozekok: data.tartozekok || null,
      allapot: data.allapot || "uj",
      megjegyzes: data.megjegyzes || null,
      statusz: "kiadva",
      atadas_datuma: new Date().toISOString().split("T")[0],
      company_id: access.activeCompanyId,
    })

    if (error) return { error: error.message }
  }

  revalidatePath("/hr/onboarding")
  if (data.dolgozoId) revalidatePath(`/hr/employee/${data.dolgozoId}`)

  return { success: true }
}

/**
 * Eszköz törlése a listából
 */
export async function deleteAssetItem(assetId: string) {
  const adminClient = getAdminClient()
  const access = await verifyAssetAccess(adminClient, { assetId })
  if (!access.ok) return { error: access.error }

  let delQuery = adminClient.from("hr_munkahelyi_eszkoz").delete().eq("id", assetId)
  if (access.activeCompanyId) {
    delQuery = delQuery.eq("company_id", access.activeCompanyId)
  }

  const { error } = await delQuery
  if (error) return { error: error.message }

  revalidatePath("/hr/onboarding")
  return { success: true }
}

/**
 * Munkahelyi Eszköz Átadás-Átvételi Jegyzőkönyv generálása és iktatása az eaisyDocs-ba
 */
export async function generateAndFileAssetHandoverAction(params: {
  onboardingId?: string | null
  dolgozoId?: string | null
  employeeName: string
  munkakor?: string | null
  notes?: string | null
}) {
  const adminClient = getAdminClient()
  const access = await verifyAssetAccess(adminClient, {
    dolgozoId: params.dolgozoId,
    onboardingId: params.onboardingId,
  })
  if (!access.ok || !access.user) return { error: access.error || "Nincs jogosultságod." }
  const user = access.user

  // 1. Lekérjük a kiadott eszközöket
  const { data: assets, error: assetErr } = await getEmployeeAssets({
    dolgozoId: params.dolgozoId,
    onboardingId: params.onboardingId,
  })

  if (assetErr) return { error: assetErr }
  if (!assets || assets.length === 0) {
    return { error: "Nincsenek rögzített eszközök. Előbb adj hozzá legalább egy eszközt a jegyzőkönyvhöz!" }
  }

  // 2. Kiegészítő adatok (profil, munkakör, lakcím)
  let lakcim: string | null = null
  let tajSzam: string | null = null
  let adoazonosito: string | null = null
  const finalMunkakor = params.munkakor || "Munkatárs"

  if (params.dolgozoId) {
    const { data: adatlap } = await adminClient
      .from("hr_dolgozo_adatlap")
      .select("lakcim")
      .eq("id", params.dolgozoId)
      .maybeSingle()

    let contractQuery = adminClient
      .from("hr_munkaszerzodes")
      .select("lakcim, taj_szam, adoazonosito_jel")
      .eq("dolgozo_id", params.dolgozoId)
    if (access.activeCompanyId) {
      contractQuery = contractQuery.eq("company_id", access.activeCompanyId)
    }
    const { data: munkaszerzodes } = await contractQuery
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    lakcim = adatlap?.lakcim || munkaszerzodes?.lakcim || null
    tajSzam = munkaszerzodes?.taj_szam || null
    adoazonosito = munkaszerzodes?.adoazonosito_jel || null
  }

  const cegAdatok = await resolveCompanyDetailsServer(access.activeCompanyId, adminClient)

  const pdfData: AssetHandoverPdfData = {
    employeeName: params.employeeName,
    employeeId: params.dolgozoId,
    onboardingId: params.onboardingId,
    munkakor: finalMunkakor,
    lakcim,
    tajSzam,
    adoazonosito,
    atadasDatuma: new Date().toISOString().split("T")[0],
    cegNev: cegAdatok.nev,
    cegSzekhely: cegAdatok.szekhely,
    cegAdoszam: cegAdatok.adoszam,
    cegKepviselo: cegAdatok.kepviselo,
    items: assets.map((a: any) => ({
      megnevezes: a.megnevezes,
      eszkoz_kategoria: a.eszkoz_kategoria,
      gyari_szam: a.gyari_szam,
      tartozekok: a.tartozekok,
      allapot: a.allapot,
      megjegyzes: a.megjegyzes,
    })),
  }

  try {
    // 3. Generáljuk a PDF-et Puppeteer-rel
    const pdfBuffer = await generateAssetHandoverPdf(pdfData)
    const sha256 = crypto.createHash("sha256").update(pdfBuffer).digest("hex")

    // 4. Feltöltés a Supabase Storage 'irat_files' vödörbe
    const idTag = params.dolgozoId || params.onboardingId || "general"
    const timestamp = Date.now()
    const storagePath = `eszkoz_atadas/${idTag}/eszkoz_atadas_atvetel_${timestamp}.pdf`

    const { error: uploadError } = await adminClient.storage
      .from("irat_files")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      console.error("Hiba a PDF tárolásakor:", uploadError)
      return { error: `Fájl feltöltési hiba: ${uploadError.message}` }
    }

    const { data: signedUrlData } = await adminClient.storage
      .from("irat_files")
      .createSignedUrl(storagePath, 3600)

    // 5. Bejegyzés a hr_dokumentum táblába
    const activeCompanyId = (assets[0] as any)?.company_id || access.activeCompanyId
    const docNev = `Munkahelyi Eszköz Átadás-Átvételi Jegyzőkönyv - ${params.employeeName}`
    const { data: newDoc, error: docError } = await adminClient
      .from("hr_dokumentum")
      .insert({
        dolgozo_id: params.dolgozoId || null,
        nev: docNev,
        kategoria: "Eszközfelelősség",
        url: storagePath,
        alairas_statusz: "vazlat",
        company_id: activeCompanyId,
      })
      .select()
      .single()

    if (docError || !newDoc) {
      console.error("Hiba a hr_dokumentum beszúrásakor:", docError)
      return { error: docError?.message || "Nem sikerült rögzíteni a HR dokumentumot." }
    }

    // 6. Az eszközökhöz hozzárendeljük a dokumentum id-t
    await adminClient
      .from("hr_munkahelyi_eszkoz")
      .update({ dokumentum_id: newDoc.id })
      .in("id", assets.map((a: any) => a.id))

    // 7. Ha a dolgozónak már van fiókja (vagy aktív dolgozó), beiktatjuk a személyi dossziéba
    let filingResult = null
    if (params.dolgozoId) {
      try {
        filingResult = await executeHrDocumentFiling(adminClient, {
          documentId: newDoc.id,
          employeeId: params.dolgozoId,
          customTargy: docNev,
          currentUserId: user.id,
        })
      } catch (err: any) {
        console.error("Hiba az eszközátadás iktatásakor:", err)
      }
    }

    // 8. Ha Onboarding folyamatban történt, automatikusan készre pipáljuk az eszközös feladatot
    if (params.onboardingId) {
      const { data: tasks } = await adminClient
        .from("hr_onboarding_feladat")
        .select("id, cim, statusz")
        .eq("onboarding_id", params.onboardingId)

      const assetTask = (tasks || []).find(
        (t: any) =>
          t.cim.toLowerCase().includes("eszköz") ||
          t.cim.toLowerCase().includes("laptop") ||
          t.cim.toLowerCase().includes("telefon")
      )

      if (assetTask && assetTask.statusz !== "done") {
        await adminClient
          .from("hr_onboarding_feladat")
          .update({ statusz: "done" })
          .eq("id", assetTask.id)
      }
    }

    // 9. Eseménynapló rögzítése
    await adminClient.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      esemeny_tipus: "adat_letrehozas",
      entitas_tipus: "hr_dokumentum",
      entitas_id: newDoc.id,
      company_id: activeCompanyId,
      megjegyzes: `Munkahelyi Eszköz Átadás-Átvételi Jegyzőkönyv legenerálva és elmentve: ${params.employeeName}${
        filingResult?.iktatoszam ? ` (Iktatva: ${filingResult.iktatoszam})` : ""
      }`,
    })

    revalidatePath("/hr/onboarding")
    if (params.dolgozoId) revalidatePath(`/hr/employee/${params.dolgozoId}`)

    return {
      success: true,
      document: {
        id: newDoc.id,
        nev: newDoc.nev,
        url: signedUrlData?.signedUrl || storagePath,
        iktatoszam: filingResult?.iktatoszam || null,
      },
      isFiled: !!filingResult?.iktatoszam,
    }
  } catch (err: any) {
    console.error("Váratlan hiba az eszközátadás generálásakor:", err)
    return { error: err.message || "Váratlan hiba történt a generálás során." }
  }
}

/**
 * Már meglévő vázlat jegyzőkönyv iktatása az eaisyDocs személyi dossziéba
 * (pl. miután a munkavállaló fiókja aktiválásra került)
 */
export async function fileExistingAssetHandoverDocument(params: {
  documentId: string
  dolgozoId: string
  employeeName: string
}) {
  const adminClient = getAdminClient()
  const access = await verifyAssetAccess(adminClient, {
    documentId: params.documentId,
    dolgozoId: params.dolgozoId,
  })
  if (!access.ok || !access.user) return { error: access.error || "Nincs jogosultságod." }

  const docNev = `Munkahelyi Eszköz Átadás-Átvételi Jegyzőkönyv - ${params.employeeName}`

  try {
    const filingResult = await executeHrDocumentFiling(adminClient, {
      documentId: params.documentId,
      employeeId: params.dolgozoId,
      customTargy: docNev,
      currentUserId: access.user.id,
    })

    revalidatePath("/hr/onboarding")
    revalidatePath(`/hr/employee/${params.dolgozoId}`)

    return {
      success: true,
      iktatoszam: filingResult.iktatoszam,
    }
  } catch (err: any) {
    console.error("Hiba a jegyzőkönyv iktatásakor:", err)
    return { error: err?.message || "Nem sikerült az iktatás a dossziéba." }
  }
}
