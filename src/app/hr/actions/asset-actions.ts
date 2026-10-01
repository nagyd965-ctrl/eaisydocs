"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import crypto from "crypto"
import { 
  generateAssetHandoverHtml, 
  generateAssetHandoverPdf,
  type AssetItemData,
  type AssetHandoverPdfData 
} from "@/utils/hr/asset-handover-pdf-generator"
import { executeHrDocumentFiling, HR_FILING_CONSTANTS } from "@/utils/hr-filing-bridge"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Lekéri a dolgozóhoz vagy onboarding folyamathoz tartozó kiadott eszközöket
 */
export async function getEmployeeAssets(options: {
  dolgozoId?: string | null
  onboardingId?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve", data: [] }

  const adminClient = getAdminClient()

  let query = adminClient
    .from("hr_munkahelyi_eszkoz")
    .select("*")
    .order("created_at", { ascending: true })

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
    return { error: error.message, data: [] }
  }

  return { data: data || [] }
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const adminClient = getAdminClient()

  if (data.id) {
    const { error } = await adminClient
      .from("hr_munkahelyi_eszkoz")
      .update({
        eszkoz_kategoria: data.eszkoz_kategoria,
        megnevezes: data.megnevezes,
        gyari_szam: data.gyari_szam || null,
        tartozekok: data.tartozekok || null,
        allapot: data.allapot || "uj",
        megjegyzes: data.megjegyzes || null
      })
      .eq("id", data.id)

    if (error) return { error: error.message }
  } else {
    const { error } = await adminClient
      .from("hr_munkahelyi_eszkoz")
      .insert({
        dolgozo_id: data.dolgozoId || null,
        onboarding_id: data.onboardingId || null,
        eszkoz_kategoria: data.eszkoz_kategoria,
        megnevezes: data.megnevezes,
        gyari_szam: data.gyari_szam || null,
        tartozekok: data.tartozekok || null,
        allapot: data.allapot || "uj",
        megjegyzes: data.megjegyzes || null,
        statusz: "kiadva",
        atadas_datuma: new Date().toISOString().split("T")[0]
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const adminClient = getAdminClient()
  const { error } = await adminClient
    .from("hr_munkahelyi_eszkoz")
    .delete()
    .eq("id", assetId)

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const adminClient = getAdminClient()

  // 1. Lekérjük a kiadott eszközöket
  const { data: assets, error: assetErr } = await getEmployeeAssets({
    dolgozoId: params.dolgozoId,
    onboardingId: params.onboardingId
  })

  if (assetErr) return { error: assetErr }
  if (!assets || assets.length === 0) {
    return { error: "Nincsenek rögzített eszközök. Előbb adj hozzá legalább egy eszközt a jegyzőkönyvhöz!" }
  }

  // 2. Kiegészítő adatok (profil, munkakör, lakcím)
  let lakcim: string | null = null
  let tajSzam: string | null = null
  let adoazonosito: string | null = null
  let finalMunkakor = params.munkakor || "Munkatárs"

  if (params.dolgozoId) {
    const { data: adatlap } = await adminClient
      .from("hr_dolgozo_adatlap")
      .select("lakcim, taj_szam, adoazonosito_jel")
      .eq("id", params.dolgozoId)
      .maybeSingle()

    if (adatlap) {
      lakcim = adatlap.lakcim
      tajSzam = adatlap.taj_szam
      adoazonosito = adatlap.adoazonosito_jel
    }
  }

  const pdfData: AssetHandoverPdfData = {
    employeeName: params.employeeName,
    employeeId: params.dolgozoId,
    onboardingId: params.onboardingId,
    munkakor: finalMunkakor,
    lakcim,
    tajSzam,
    adoazonosito,
    atadasDatuma: new Date().toISOString().split("T")[0],
    cegNev: "eaisyDocs Zrt.",
    cegSzekhely: "1111 Budapest, Példa utca 1.",
    cegAdoszam: "12345678-2-41",
    cegKepviselo: "Ügyvezető Igazgató",
    items: assets.map((a: any) => ({
      megnevezes: a.megnevezes,
      eszkoz_kategoria: a.eszkoz_kategoria,
      gyari_szam: a.gyari_szam,
      tartozekok: a.tartozekok,
      allapot: a.allapot,
      megjegyzes: a.megjegyzes
    }))
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
        upsert: true
      })

    if (uploadError) {
      console.error("Hiba a PDF tárolásakor:", uploadError)
      return { error: `Fájl feltöltési hiba: ${uploadError.message}` }
    }

    const { data: signedUrlData } = await adminClient.storage
      .from("irat_files")
      .createSignedUrl(storagePath, 3600)

    // 5. Bejegyzés a hr_dokumentum táblába
    const docNev = `Munkahelyi Eszköz Átadás-Átvételi Jegyzőkönyv - ${params.employeeName}`
    const { data: newDoc, error: docError } = await adminClient
      .from("hr_dokumentum")
      .insert({
        dolgozo_id: params.dolgozoId || null,
        nev: docNev,
        kategoria: "Eszközfelelősség",
        url: storagePath,
        alairas_statusz: "vazlat",
        fajl_nev: `eszkoz_atadas_atvetel_${timestamp}.pdf`,
        meret_byte: pdfBuffer.length,
        sha256_hash: sha256
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
          currentUserId: user.id
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

      const assetTask = (tasks || []).find((t: any) => 
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
      megjegyzes: `Munkahelyi Eszköz Átadás-Átvételi Jegyzőkönyv legenerálva és elmentve: ${params.employeeName}${
        filingResult?.iktatoszam ? ` (Iktatva: ${filingResult.iktatoszam})` : ""
      }`
    })

    revalidatePath("/hr/onboarding")
    if (params.dolgozoId) revalidatePath(`/hr/employee/${params.dolgozoId}`)

    return { 
      success: true, 
      document: {
        id: newDoc.id,
        nev: newDoc.nev,
        url: signedUrlData?.signedUrl || storagePath,
        iktatoszam: filingResult?.iktatoszam || null
      }
    }
  } catch (err: any) {
    console.error("Váratlan hiba az eszközátadás generálásakor:", err)
    return { error: err.message || "Váratlan hiba történt a generálás során." }
  }
}
