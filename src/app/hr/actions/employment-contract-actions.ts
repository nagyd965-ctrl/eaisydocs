"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { 
  type EmploymentContractPdfData, 
  DEFAULT_COMPANY_DETAILS 
} from "@/utils/hr/employment-contract-constants"
import { generateEmploymentContractPdfBuffer } from "@/utils/hr/employment-contract-pdf-generator"
import { executeHrDocumentFiling } from "@/utils/hr-filing-bridge"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface GetEmploymentContractParams {
  dolgozoId?: string | null
  onboardingId?: string | null
}

export async function getEmploymentContractRecord({ dolgozoId, onboardingId }: GetEmploymentContractParams) {
  try {
    const supabase = await createClient()

    let query = supabase.from("hr_munkaszerzodes").select("*")
    if (dolgozoId) {
      query = query.eq("dolgozo_id", dolgozoId)
    } else if (onboardingId) {
      query = query.eq("onboarding_id", onboardingId)
    } else {
      return { data: null, existingDocument: null }
    }

    const { data: record, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle()

    if (error) {
      console.error("Error fetching hr_munkaszerzodes:", error)
      return { data: null, existingDocument: null, error: error.message }
    }

    let existingDocument = null
    if (record?.dokumentum_id) {
      const { data: doc } = await supabase
        .from("hr_dokumentum")
        .select("*")
        .eq("id", record.dokumentum_id)
        .maybeSingle()

      if (doc?.url) {
        const { data: sData } = await supabase.storage.from("irat_files").createSignedUrl(doc.url, 3600)
        let alairtSignedUrl = null
        if (doc.alairt_fajl_url) {
          const { data: aData } = await supabase.storage.from("irat_files").createSignedUrl(doc.alairt_fajl_url, 3600)
          alairtSignedUrl = aData?.signedUrl || doc.alairt_fajl_url
        }

        existingDocument = {
          ...doc,
          url: sData?.signedUrl || doc.url,
          originalStoragePath: doc.url,
          alairt_fajl_url: alairtSignedUrl || doc.alairt_fajl_url,
          displayUrl: alairtSignedUrl || sData?.signedUrl || doc.url
        }
      }
    }

    return { data: record, existingDocument }
  } catch (err: any) {
    console.error("getEmploymentContractRecord exception:", err)
    return { data: null, existingDocument: null, error: err.message }
  }
}

export interface GenerateEmploymentContractActionParams {
  onboardingId?: string | null
  dolgozoId?: string | null
  employeeName: string
  munkakor: string
  reszleg?: string | null
  kezdesDatuma: string
  szerzodesTipusa?: "hatarozatlan" | "hatarozott"
  hatarozottLejarat?: string | null
  munkaidoTipus?: "teljes" | "reszmunkaido"
  napiMunkaidoOra?: number
  probaidoHonap?: number
  alapber: number
  munkavegzesHelye?: string
  tavmunkaMegallapodas?: boolean
  szuletesiHely?: string | null
  szuletesiDatum?: string | null
  anyjaNeve?: string | null
  lakcim?: string | null
  adoazonositoJel?: string | null
  tajSzam?: string | null
  bankszamlaszam?: string | null
}

export async function generateAndFileEmploymentContractAction(params: GenerateEmploymentContractActionParams) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return { error: "Nincs bejelentkezve!" }
    }

    const adminClient = getAdminClient()
    const now = new Date()
    const contractNumber = `MSZ-${now.getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`

    // 1. PDF Buffer előállítása
    const pdfData: EmploymentContractPdfData = {
      contractNumber,
      employeeName: params.employeeName,
      szuletesiHely: params.szuletesiHely,
      szuletesiDatum: params.szuletesiDatum,
      anyjaNeve: params.anyjaNeve,
      lakcim: params.lakcim,
      adoazonositoJel: params.adoazonositoJel,
      tajSzam: params.tajSzam,
      bankszamlaszam: params.bankszamlaszam,
      munkakor: params.munkakor,
      reszleg: params.reszleg || "Központi",
      kezdesDatuma: params.kezdesDatuma,
      szerzodesTipusa: params.szerzodesTipusa || "hatarozatlan",
      hatarozottLejarat: params.hatarozottLejarat,
      munkaidoTipus: params.munkaidoTipus || "teljes",
      napiMunkaidoOra: Number(params.napiMunkaidoOra || 8),
      probaidoHonap: Number(params.probaidoHonap ?? 3),
      alapber: Number(params.alapber || 500000),
      munkavegzesHelye: params.munkavegzesHelye || "A Munkáltató mindenkori székhelye és telephelyei",
      tavmunkaMegallapodas: Boolean(params.tavmunkaMegallapodas),
      cegAdatok: DEFAULT_COMPANY_DETAILS,
      isDraft: !params.dolgozoId
    }

    const { buffer, fileName } = await generateEmploymentContractPdfBuffer(pdfData)

    // 2. Feltöltés Supabase Storage-ba
    const storagePath = `hr/contracts/${params.dolgozoId || params.onboardingId || "onboarding"}/${fileName}`
    const { error: uploadErr } = await adminClient.storage
      .from("irat_files")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true
      })

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr)
      return { error: `Nem sikerült feltölteni a dokumentumot: ${uploadErr.message}` }
    }

    // 3. Mentés a hr_dokumentum táblába
    const docName = `Munkaszerződés - ${params.employeeName} (${params.kezdesDatuma})`
    const { data: newDoc, error: docErr } = await adminClient
      .from("hr_dokumentum")
      .insert({
        dolgozo_id: params.dolgozoId || null,
        nev: docName,
        kategoria: "Munkaszerződés",
        url: storagePath,
        alairas_statusz: "vazlat"
      })
      .select()
      .single()

    if (docErr || !newDoc) {
      console.error("hr_dokumentum insert error:", docErr)
      return { error: `Dokumentum mentési hiba: ${docErr?.message}` }
    }

    let filingResult = null
    let isFiled = false

    // 4. Ha a munkavállaló már aktív (van dolgozoId), azonnal beiktatjuk a személyi dossziéba
    if (params.dolgozoId) {
      try {
        filingResult = await executeHrDocumentFiling(adminClient, {
          documentId: newDoc.id,
          employeeId: params.dolgozoId,
          customTargy: docName,
          currentUserId: user.id
        })
        isFiled = Boolean(filingResult.success && filingResult.iktatoszam)
      } catch (fErr) {
        console.error("Azonnali iktatási hiba:", fErr)
      }
    }

    // 5. Mentés a hr_munkaszerzodes táblába
    const { data: contractRecord, error: contractErr } = await adminClient
      .from("hr_munkaszerzodes")
      .insert({
        dolgozo_id: params.dolgozoId || null,
        onboarding_id: params.onboardingId || null,
        szerzodes_szam: contractNumber,
        munkakor: params.munkakor,
        kezdes_datuma: params.kezdesDatuma,
        szerzodes_tipusa: params.szerzodesTipusa || "hatarozatlan",
        hatarozott_lejarat: params.hatarozottLejarat || null,
        munkaido_tipus: params.munkaidoTipus || "teljes",
        napi_munkaido_ora: Number(params.napiMunkaidoOra || 8),
        probaido_honap: Number(params.probaidoHonap ?? 3),
        alapber: Number(params.alapber || 500000),
        munkavegzes_helye: params.munkavegzesHelye || "A Munkáltató mindenkori székhelye és telephelyei",
        tavmunka_megallapodas: Boolean(params.tavmunkaMegallapodas),
        szuletesi_hely: params.szuletesiHely || null,
        szuletesi_datum: params.szuletesiDatum || null,
        anyja_neve: params.anyjaNeve || null,
        lakcim: params.lakcim || null,
        adoazonosito_jel: params.adoazonositoJel || null,
        taj_szam: params.tajSzam || null,
        bankszamlaszam: params.bankszamlaszam || null,
        reszleg: params.reszleg || null,
        dokumentum_id: newDoc.id
      })
      .select()
      .single()

    if (contractErr) {
      console.error("hr_munkaszerzodes insert error:", contractErr)
    }

    // 6. Ha van onboarding feladat a munkaszerződésre, automatikusan készre állítjuk és frissítjük az onboarding rekordot!
    if (params.onboardingId) {
      try {
        // Frissítjük a belépési adatokat az onboarding rekordon is
        await adminClient
          .from("hr_onboarding")
          .update({
            munkakor: params.munkakor,
            reszleg: params.reszleg || null,
            belepes_datuma: params.kezdesDatuma
          })
          .eq("id", params.onboardingId)

        const { data: tasks } = await adminClient
          .from("hr_onboarding_feladat")
          .select("id, cim, statusz")
          .eq("onboarding_id", params.onboardingId)

        const contractTask = (tasks || []).find((t: any) =>
          (t.cim || "").toLowerCase().includes("munkaszerződés") ||
          (t.cim || "").toLowerCase().includes("szerződés")
        )

        if (contractTask && contractTask.statusz !== "done") {
          await adminClient
            .from("hr_onboarding_feladat")
            .update({ statusz: "done" })
            .eq("id", contractTask.id)
        }
      } catch (tErr) {
        console.error("Hiba az onboarding feladat lezárásakor:", tErr)
      }
    }

    // 7. Audit naplózás
    await adminClient.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      esemeny_tipus: "szerzodes_generalas",
      leiras: `Munkaszerződés generálva: ${params.employeeName} (${params.munkakor})`,
      metadata: {
        dokumentum_id: newDoc.id,
        onboarding_id: params.onboardingId,
        dolgozo_id: params.dolgozoId,
        iktatoszam: filingResult?.iktatoszam || null
      }
    })

    const { data: sData } = await adminClient.storage.from("irat_files").createSignedUrl(storagePath, 3600)

    revalidatePath("/hr/onboarding")
    if (params.dolgozoId) {
      revalidatePath(`/hr/employee/${params.dolgozoId}`)
    }

    return {
      success: true,
      contract: contractRecord,
      document: {
        ...newDoc,
        url: sData?.signedUrl || storagePath,
        iktatoszam: filingResult?.iktatoszam || null
      },
      isFiled
    }
  } catch (err: any) {
    console.error("generateAndFileEmploymentContractAction error:", err)
    return { error: err.message || "Váratlan hiba történt a munkaszerződés készítésekor." }
  }
}

export async function fileExistingEmploymentContractDocument({
  documentId,
  dolgozoId,
  employeeName
}: {
  documentId: string
  dolgozoId: string
  employeeName: string
}) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { error: "Nincs bejelentkezve!" }

    const adminClient = getAdminClient()
    const { data: doc, error: docErr } = await adminClient
      .from("hr_dokumentum")
      .select("id, nev, iktatoszam")
      .eq("id", documentId)
      .single()

    if (docErr || !doc) return { error: "Dokumentum nem található!" }
    if (doc.iktatoszam) return { error: "A dokumentum már be van iktatva!", iktatoszam: doc.iktatoszam }

    await adminClient
      .from("hr_dokumentum")
      .update({ dolgozo_id: dolgozoId })
      .eq("id", documentId)

    const result = await executeHrDocumentFiling(adminClient, {
      documentId,
      employeeId: dolgozoId,
      customTargy: doc.nev || `Munkaszerződés - ${employeeName}`,
      currentUserId: user.id
    })

    if (!result.success) {
      return { error: result.error || "Hiba az iktatás során." }
    }

    await adminClient
      .from("hr_munkaszerzodes")
      .update({ dolgozo_id: dolgozoId })
      .eq("dokumentum_id", documentId)

    revalidatePath("/hr/onboarding")
    revalidatePath(`/hr/employee/${dolgozoId}`)

    return { success: true, iktatoszam: result.iktatoszam }
  } catch (err: any) {
    console.error("fileExistingEmploymentContractDocument error:", err)
    return { error: err.message }
  }
}
