"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { getActiveCompanyIdServer } from "@/utils/company-server"
import { revalidatePath } from "next/cache"
import type { EmployeeReferral } from "@/types/hr"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Aktuális cég bónusz összegének lekérése (alapértelmezett: 150 000 Ft).
 */
export async function getReferralBonusAmountAction(): Promise<number> {
  const supabase = await createClient()
  const activeCompanyId = await getActiveCompanyIdServer()

  if (!activeCompanyId) return 150000

  const { data: company } = await supabase
    .from("companies")
    .select("referral_bonus_amount")
    .eq("id", activeCompanyId)
    .maybeSingle()

  return company?.referral_bonus_amount ?? 150000
}

/**
 * Dolgozói ajánlás beküldése
 */
export async function submitReferralAction(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Nincs bejelentkezett felhasználó." }
    }

    const activeCompanyId = await getActiveCompanyIdServer()
    if (!activeCompanyId) {
      return { success: false, error: "Nincs aktív cég kiválasztva." }
    }

    const jeloltNev = (formData.get("jeloltNev") as string)?.trim()
    const jeloltEmail = (formData.get("jeloltEmail") as string)?.trim()
    const jeloltTelefon = (formData.get("jeloltTelefon") as string)?.trim() || null
    const linkedinUrl = (formData.get("linkedinUrl") as string)?.trim() || null
    const allashirdetesId = (formData.get("allashirdetesId") as string)?.trim() || null
    const ajanlasIndoklas = (formData.get("ajanlasIndoklas") as string)?.trim() || null
    const cvFile = formData.get("cv") as File | null

    if (!jeloltNev) {
      return { success: false, error: "A jelölt nevének megadása kötelező!" }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!jeloltEmail || !emailRegex.test(jeloltEmail)) {
      return { success: false, error: "Kérjük, érvényes e-mail címet adj meg a jelölthöz!" }
    }

    // 1. Önéletrajz feltöltése, ha csatolva van
    let cvStoragePath: string | null = null
    const adminClient = getAdminClient()

    if (cvFile && cvFile.size > 0) {
      const MAX_FILE_SIZE = 10 * 1024 * 1024
      if (cvFile.size > MAX_FILE_SIZE) {
        return { success: false, error: "A feltöltött önéletrajz mérete nem haladhatja meg a 10 MB-ot!" }
      }

      const allowedExtensions = ["pdf", "docx", "doc"]
      const fileExt = cvFile.name.split(".").pop()?.toLowerCase() || ""
      if (!allowedExtensions.includes(fileExt)) {
        return { success: false, error: "Kizárólag PDF vagy Word (.doc, .docx) formátumú önéletrajz tölthető fel!" }
      }

      const fileBuffer = Buffer.from(await cvFile.arrayBuffer())
      if (fileExt === "pdf") {
        if (fileBuffer.length < 32 || !fileBuffer.subarray(0, 5).toString("utf-8").startsWith("%PDF-")) {
          return { success: false, error: "A feltöltött fájl nem valódi PDF állomány!" }
        }
      }

      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const storagePath = `referral/${fileName}`

      const { data: uploadData, error: uploadError } = await adminClient
        .storage
        .from("hr_dokumentumok")
        .upload(storagePath, fileBuffer, {
          contentType: cvFile.type || (fileExt === "pdf" ? "application/pdf" : "application/octet-stream"),
          upsert: false,
        })

      if (uploadError) {
        console.error("Storage hiba ajánlás feltöltésekor:", uploadError)
        return { success: false, error: "Nem sikerült feltölteni az önéletrajzot." }
      }

      cvStoragePath = uploadData.path
    }

    // 2. Aktuális cég bónusz összegének lekérése
    const { data: company } = await supabase
      .from("companies")
      .select("referral_bonus_amount")
      .eq("id", activeCompanyId)
      .maybeSingle()

    const bonusAmount = company?.referral_bonus_amount ?? 150000

    // 3. Ajánló nevének lekérése profilból
    const { data: profile } = await supabase
      .from("felhasznalo_profil")
      .select("nev")
      .eq("id", user.id)
      .maybeSingle()

    const referrerName = profile?.nev || user.email || "Munkatárs"

    // 4. Ha konkrét álláshirdetésre történik az ajánlás, lekérjük a munkakörét
    let munkakorId: string | null = null
    if (allashirdetesId) {
      const { data: hirdetes } = await adminClient
        .from("hr_allashirdetes")
        .select("megpalyazott_munkakor_id, munkakor_id")
        .eq("id", allashirdetesId)
        .maybeSingle()

      munkakorId = (hirdetes as any)?.megpalyazott_munkakor_id || (hirdetes as any)?.munkakor_id || null
    }

    // 5. Beillesztés a toborzási pipeline-ba (hr_toborzas) admin klienssel
    let toborzasId: string | null = null
    const { data: toborzasData, error: toborzasError } = await adminClient
      .from("hr_toborzas")
      .insert({
        company_id: activeCompanyId,
        allashirdetes_id: allashirdetesId,
        megpalyazott_munkakor_id: munkakorId,
        nev: jeloltNev,
        email: jeloltEmail,
        telefon: jeloltTelefon,
        uzenet: `[Dolgozói ajánlás - Ajánlotta: ${referrerName}]: ${ajanlasIndoklas || "Nincs külön indoklás megadva."}${linkedinUrl ? ` | LinkedIn: ${linkedinUrl}` : ""}`,
        cv_storage_path: cvStoragePath,
        statusz: "uj",
      })
      .select("id")
      .single()

    if (!toborzasError && toborzasData) {
      toborzasId = toborzasData.id
    } else {
      console.warn("Nem sikerült közvetlenül beszúrni a hr_toborzas táblába:", toborzasError)
    }

    // 6. Beillesztés a hr_dolgozoi_ajanlas táblába
    const { error: insertError } = await supabase
      .from("hr_dolgozoi_ajanlas")
      .insert({
        company_id: activeCompanyId,
        ajanlo_dolgozo_id: user.id,
        allashirdetes_id: allashirdetesId,
        toborzas_id: toborzasId,
        jelolt_nev: jeloltNev,
        jelolt_email: jeloltEmail,
        jelolt_telefon: jeloltTelefon,
        linkedin_url: linkedinUrl,
        cv_storage_path: cvStoragePath,
        ajanlas_indoklas: ajanlasIndoklas,
        bonusz_osszeg: bonusAmount,
        bonusz_statusz: "fuggoben",
      })

    if (insertError) {
      console.error("Hiba az ajánlás rögzítésekor:", insertError)
      return { success: false, error: "Nem sikerült elmenteni az ajánlást: " + insertError.message }
    }

    // 7. Eseménynapló audit
    await adminClient.from("hr_esemeny_naplo").insert({
      company_id: activeCompanyId,
      modul: "toborzas",
      esemeny_tipus: "dolgozoi_ajanlas",
      leiras: `Új ismerős ajánlása: ${jeloltNev} (Ajánló: ${referrerName})`,
      celpont_id: toborzasId,
      entitas_tipus: "hr_dolgozoi_ajanlas",
      felhasznalo_id: user.id,
    })

    revalidatePath("/hr/self-service/career")
    return {
      success: true,
      message: "Köszönjük az ajánlást! A jelölt bekerült a toborzási folyamatba.",
    }
  } catch (err: any) {
    console.error("Váratlan hiba az ajánlás beküldésekor:", err)
    return { success: false, error: err?.message || "Váratlan hiba történt." }
  }
}

/**
 * Saját ajánlások lekérése az aktuális felhasználóhoz és aktív céghez
 */
export async function getMyReferralsAction(): Promise<EmployeeReferral[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const activeCompanyId = await getActiveCompanyIdServer()

  let query = supabase
    .from("hr_dolgozoi_ajanlas")
    .select(`
      id,
      company_id,
      ajanlo_dolgozo_id,
      allashirdetes_id,
      toborzas_id,
      jelolt_nev,
      jelolt_email,
      jelolt_telefon,
      linkedin_url,
      cv_storage_path,
      ajanlas_indoklas,
      bonusz_osszeg,
      bonusz_statusz,
      kifizetes_datuma,
      megjegyzes,
      created_at,
      updated_at,
      hr_allashirdetes (
        id,
        cim,
        hr_munkakor (
          megnevezes
        )
      ),
      hr_toborzas (
        id,
        statusz
      )
    `)
    .eq("ajanlo_dolgozo_id", user.id)

  if (activeCompanyId) {
    query = query.eq("company_id", activeCompanyId)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) {
    console.error("Hiba a saját ajánlások lekérésekor:", error)
    return []
  }

  return (data as unknown as EmployeeReferral[]) || []
}

/**
 * Aláírt letöltési URL generálása a feltöltött önéletrajzhoz
 */
export async function getReferralCvSignedUrlAction(storagePath: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { url: null, error: "Nincs bejelentkezett felhasználó." }

  const adminClient = getAdminClient()
  const { data, error } = await adminClient.storage
    .from("hr_dokumentumok")
    .createSignedUrl(storagePath, 300)

  if (error || !data?.signedUrl) {
    return { url: null, error: "Nem sikerült legenerálni a letöltési hivatkozást." }
  }

  return { url: data.signedUrl, error: null }
}

/**
 * Ajánlás visszavonása / törlése (csak amíg kiválasztás alatt / függőben van)
 */
export async function deleteReferralAction(referralId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Nincs bejelentkezett felhasználó." }
    }

    const adminClient = getAdminClient()
    const { data: referral, error: fetchErr } = await adminClient
      .from("hr_dolgozoi_ajanlas")
      .select("id, ajanlo_dolgozo_id, bonusz_statusz, cv_storage_path, toborzas_id, jelolt_nev")
      .eq("id", referralId)
      .maybeSingle()

    if (fetchErr || !referral) {
      return { success: false, error: "Az ajánlás nem található." }
    }

    if (referral.ajanlo_dolgozo_id !== user.id) {
      return { success: false, error: "Csak a saját ajánlásodat vonhatod vissza." }
    }

    if (referral.bonusz_statusz !== "fuggoben") {
      return { success: false, error: "Már elbírált vagy kifizetett ajánlás nem vonható vissza." }
    }

    // Storage fájl törlése
    if (referral.cv_storage_path) {
      await adminClient.storage.from("hr_dokumentumok").remove([referral.cv_storage_path])
    }

    // hr_toborzas rekord törlése
    if (referral.toborzas_id) {
      await adminClient.from("hr_toborzas").delete().eq("id", referral.toborzas_id)
    }

    // hr_dolgozoi_ajanlas törlése
    const { error: deleteErr } = await adminClient
      .from("hr_dolgozoi_ajanlas")
      .delete()
      .eq("id", referralId)

    if (deleteErr) {
      return { success: false, error: deleteErr.message }
    }

    revalidatePath("/hr/self-service/career")
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Hiba történt a törlés során." }
  }
}

