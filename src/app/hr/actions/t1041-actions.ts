"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { generateT1041PdfBuffer } from "@/utils/hr/t1041-pdf-generator"
import { type T1041PdfData } from "@/utils/hr/t1041-constants"
import { DEFAULT_COMPANY_DETAILS } from "@/utils/hr/employment-contract-constants"
import { executeHrDocumentFiling } from "@/utils/hr-filing-bridge"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface GetT1041Result {
  record: any | null
  prefilled: {
    bejelentesTipus: "U" | "V" | "T"
    employeeName: string
    tajSzam: string
    adoazonositoJel: string
    munkakor: string
    feorKod: string
    reszleg: string
    jogviszonyKezdete: string
    jogviszonyVege?: string
    valtozasDatuma?: string
    valtozasJellege?: string
    hetiMunkaidoOra: number
    szuletesiHely: string
    szuletesiDatum: string
    anyjaNeve: string
    lakcim: string
    bekuldesDatuma: string
  }
  adatlapDoc?: any | null
  nyugtaDoc?: any | null
}

/**
 * Lekéri a T1041 bejelentési rekordot, vagy előkészíti a meglévő Onboarding és Szerződés adatokból
 */
export async function getT1041Data(params: {
  onboardingId?: string | null
  dolgozoId?: string | null
  offboardingId?: string | null
}): Promise<GetT1041Result> {
  const adminClient = getAdminClient()
  const { onboardingId, dolgozoId, offboardingId } = params

  let query = adminClient.from("hr_t1041_bejelentes").select("*")
  if (offboardingId) {
    query = query.eq("offboarding_id", offboardingId)
  } else if (onboardingId) {
    query = query.eq("onboarding_id", onboardingId)
  } else if (dolgozoId) {
    query = query.eq("dolgozo_id", dolgozoId)
  }

  const { data: existingRecords } = await query.order("created_at", { ascending: false }).limit(1)
  const existingRecord = existingRecords?.[0] || null

  let adatlapDoc = null
  let nyugtaDoc = null

  if (existingRecord?.adatlap_dokumentum_id) {
    const { data } = await adminClient
      .from("hr_dokumentum")
      .select("*")
      .eq("id", existingRecord.adatlap_dokumentum_id)
      .single()
    if (data) {
      let viewUrl = data.url
      if (data.url && !data.url.startsWith("http")) {
        const { data: signed } = await adminClient.storage
          .from("irat_files")
          .createSignedUrl(data.url, 3600)
        if (signed?.signedUrl) viewUrl = signed.signedUrl
      }
      adatlapDoc = { ...data, displayUrl: viewUrl, url: viewUrl }
    }
  }

  if (existingRecord?.nyugta_dokumentum_id) {
    const { data } = await adminClient
      .from("hr_dokumentum")
      .select("*")
      .eq("id", existingRecord.nyugta_dokumentum_id)
      .single()
    if (data) {
      let viewUrl = data.url
      if (data.url && !data.url.startsWith("http")) {
        const { data: signed } = await adminClient.storage
          .from("irat_files")
          .createSignedUrl(data.url, 3600)
        if (signed?.signedUrl) viewUrl = signed.signedUrl
      }
      nyugtaDoc = { ...data, displayUrl: viewUrl, url: viewUrl }
    }
  }

  // Ha van már rögzített adat
  if (existingRecord) {
    return {
      record: existingRecord,
      prefilled: {
        bejelentesTipus: existingRecord.bejelentes_tipus as any,
        employeeName: existingRecord.biztositott_neve,
        tajSzam: existingRecord.taj_szam || "",
        adoazonositoJel: existingRecord.adoazonosito_jel || "",
        munkakor: existingRecord.munkakor || "",
        feorKod: existingRecord.feor_kod || "",
        reszleg: "",
        jogviszonyKezdete: existingRecord.jogviszony_kezdete || "",
        jogviszonyVege: existingRecord.jogviszony_vege || "",
        valtozasDatuma: existingRecord.valtozas_datuma || "",
        valtozasJellege: existingRecord.valtozas_jellege || "",
        hetiMunkaidoOra: Number(existingRecord.heti_munkaido_ora || 40),
        szuletesiHely: "",
        szuletesiDatum: "",
        anyjaNeve: "",
        lakcim: "",
        bekuldesDatuma: existingRecord.bekuldes_datuma || new Date().toISOString().split("T")[0]
      },
      adatlapDoc,
      nyugtaDoc
    }
  }

  let empName = "Munkavállaló"
  let munkakor = ""
  let reszleg = ""
  let kezdes = ""
  let vege = ""
  let feorKod = ""
  let taj = ""
  let adoazonosito = ""
  let hetiOra = 40
  let szulHely = ""
  let szulDatum = ""
  let anyja = ""
  let lakcim = ""

  if (offboardingId) {
    const { data: offb } = await adminClient
      .from("hr_offboarding")
      .select("*, felhasznalo_profil(id, nev, munkakor, reszleg)")
      .eq("id", offboardingId)
      .single()
    if (offb) {
      empName = offb.felhasznalo_profil?.nev || empName
      munkakor = offb.munkakor || offb.felhasznalo_profil?.munkakor || munkakor
      reszleg = offb.reszleg || offb.felhasznalo_profil?.reszleg || reszleg
      vege = offb.utolso_munkanap || offb.kilepes_datuma || ""
      const offbDolgozoId = offb.dolgozo_id || offb.felhasznalo_profil?.id
      if (offbDolgozoId) {
        const { data: dAdatlap } = await adminClient
          .from("hr_dolgozo_adatlap")
          .select("taj_szam, adoazonosito_jel, szuletesi_hely, szuletesi_ido, anyja_neve, lakcim")
          .or(`felhasznalo_id.eq.${offbDolgozoId},id.eq.${offbDolgozoId}`)
          .maybeSingle()
        if (dAdatlap) {
          taj = dAdatlap.taj_szam || taj
          adoazonosito = dAdatlap.adoazonosito_jel || adoazonosito
          szulHely = dAdatlap.szuletesi_hely || szulHely
          szulDatum = dAdatlap.szuletesi_ido || szulDatum
          anyja = dAdatlap.anyja_neve || anyja
          lakcim = dAdatlap.lakcim || lakcim
        }
        const { data: cData } = await adminClient
          .from("hr_munkaszerzodes")
          .select("kezdes_datuma")
          .eq("dolgozo_id", offbDolgozoId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        if (cData?.kezdes_datuma) {
          kezdes = cData.kezdes_datuma
        }
      }
    }
  } else if (onboardingId) {
    const { data: onb } = await adminClient
      .from("hr_onboarding")
      .select("nev, munkakor, reszleg, belepes_datuma")
      .eq("id", onboardingId)
      .single()
    if (onb) {
      empName = onb.nev || empName
      munkakor = onb.munkakor || munkakor
      reszleg = onb.reszleg || reszleg
      kezdes = onb.belepes_datuma && onb.belepes_datuma !== "Hamarosan" ? onb.belepes_datuma : ""
    }

    // Szerződésből
    const { data: contract } = await adminClient
      .from("hr_munkaszerzodes")
      .select("*")
      .eq("onboarding_id", onboardingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (contract) {
      taj = contract.taj_szam || taj
      adoazonosito = contract.adoazonosito_jel || adoazonosito
      szulHely = contract.szuletesi_hely || szulHely
      szulDatum = contract.szuletesi_datum || szulDatum
      anyja = contract.anyja_neve || anyja
      lakcim = contract.lakcim || lakcim
      if (contract.napi_munkaido_ora) {
        hetiOra = Number(contract.napi_munkaido_ora) * 5
      }
      if (contract.kezdes_datuma) {
        kezdes = contract.kezdes_datuma
      }
    }

    // FEOR kód keresése a munkakörből
    if (munkakor) {
      const { data: job } = await adminClient
        .from("hr_munkakor")
        .select("feor_kod")
        .eq("megnevezes", munkakor)
        .limit(1)
        .single()
      if (job?.feor_kod) {
        feorKod = job.feor_kod
      }
    }
  } else if (dolgozoId) {
    const { data: prof } = await adminClient
      .from("felhasznalo_profil")
      .select("nev, munkakor, reszleg")
      .eq("id", dolgozoId)
      .single()
    if (prof) {
      empName = prof.nev || empName
      munkakor = prof.munkakor || munkakor
      reszleg = prof.reszleg || reszleg
    }
    const { data: dAdatlap } = await adminClient
      .from("hr_dolgozo_adatlap")
      .select("taj_szam, adoazonosito_jel, szuletesi_hely, szuletesi_ido, anyja_neve, lakcim")
      .eq("id", dolgozoId)
      .single()
    if (dAdatlap) {
      taj = dAdatlap.taj_szam || taj
      adoazonosito = dAdatlap.adoazonosito_jel || adoazonosito
      szulHely = dAdatlap.szuletesi_hely || szulHely
      szulDatum = dAdatlap.szuletesi_ido || szulDatum
      anyja = dAdatlap.anyja_neve || anyja
      lakcim = dAdatlap.lakcim || lakcim
    }
  }

  return {
    record: null,
    prefilled: {
      bejelentesTipus: offboardingId ? "T" : "U",
      employeeName: empName,
      tajSzam: taj,
      adoazonositoJel: adoazonosito,
      munkakor: munkakor,
      feorKod: feorKod,
      reszleg: reszleg,
      jogviszonyKezdete: kezdes,
      jogviszonyVege: vege,
      valtozasDatuma: new Date().toISOString().split("T")[0],
      valtozasJellege: "Heti munkaidő változása",
      hetiMunkaidoOra: hetiOra,
      szuletesiHely: szulHely,
      szuletesiDatum: szulDatum,
      anyjaNeve: anyja,
      lakcim: lakcim,
      bekuldesDatuma: new Date().toISOString().split("T")[0]
    },
    adatlapDoc: null,
    nyugtaDoc: null
  }
}

/**
 * T1041 adatok mentése és szinkronizálása
 */
export async function saveT1041Record(data: {
  onboardingId?: string | null
  offboardingId?: string | null
  dolgozoId?: string | null
  bejelentesTipus: "U" | "V" | "T"
  biztositottNeve: string
  tajSzam?: string
  adoazonositoJel?: string
  munkakor?: string
  feorKod?: string
  jogviszonyKezdete?: string
  jogviszonyVege?: string
  valtozasDatuma?: string
  valtozasJellege?: string
  hetiMunkaidoOra?: number
  bekuldesDatuma?: string
  megjegyzes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const adminClient = getAdminClient()

  // Meglévő rekord keresése
  let query = adminClient.from("hr_t1041_bejelentes").select("id")
  if (data.offboardingId) {
    query = query.eq("offboarding_id", data.offboardingId)
  } else if (data.onboardingId) {
    query = query.eq("onboarding_id", data.onboardingId)
  } else if (data.dolgozoId) {
    query = query.eq("dolgozo_id", data.dolgozoId)
  }

  const { data: existing } = await query.limit(1)
  const existingId = existing?.[0]?.id

  const payload: any = {
    onboarding_id: data.onboardingId || null,
    offboarding_id: data.offboardingId || null,
    dolgozo_id: data.dolgozoId || null,
    bejelentes_tipus: data.bejelentesTipus,
    biztositott_neve: data.biztositottNeve,
    taj_szam: data.tajSzam || null,
    adoazonosito_jel: data.adoazonositoJel || null,
    munkakor: data.munkakor || null,
    feor_kod: data.feorKod || null,
    jogviszony_kezdete: data.jogviszonyKezdete || null,
    jogviszony_vege: data.jogviszonyVege || null,
    valtozas_datuma: data.valtozasDatuma || null,
    valtozas_jellege: data.valtozasJellege || null,
    heti_munkaido_ora: data.hetiMunkaidoOra || 40.0,
    bekuldes_datuma: data.bekuldesDatuma || null,
    megjegyzes: data.megjegyzes || null,
    updated_at: new Date().toISOString()
  }

  let recordId = existingId

  if (existingId) {
    const { error } = await adminClient
      .from("hr_t1041_bejelentes")
      .update(payload)
      .eq("id", existingId)
    if (error) return { error: error.message }
  } else {
    const { data: inserted, error } = await adminClient
      .from("hr_t1041_bejelentes")
      .insert(payload)
      .select()
      .single()
    if (error) return { error: error.message }
    recordId = inserted.id
  }

  return { success: true, recordId }
}

/**
 * T1041 A4 Hivatalos Adatlap PDF generálása és tárolása
 */
export async function generateT1041PdfAction(params: {
  onboardingId?: string | null
  offboardingId?: string | null
  dolgozoId?: string | null
  data: T1041PdfData
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Nincs bejelentkezve" }

    const adminClient = getAdminClient()
    const { onboardingId, offboardingId, dolgozoId, data } = params

    // 1. Cégadatok kiegészítése alapértelmezésekkel
    const effectiveData: T1041PdfData = {
      ...data,
      cegNev: data.cegNev || DEFAULT_COMPANY_DETAILS.nev,
      cegAdoszam: data.cegAdoszam || DEFAULT_COMPANY_DETAILS.adoszam,
      cegCim: data.cegCim || DEFAULT_COMPANY_DETAILS.szekhely,
    }

    // 2. PDF Buffer előállítása
    const pdfBuffer = await generateT1041PdfBuffer(effectiveData)

    // 2. Feltöltés Storage-be
    const idKey = offboardingId || onboardingId || dolgozoId || "t1041"
    const timestamp = Date.now()
    const storagePath = `hr/t1041/${idKey}/t1041_adatlap_${timestamp}.pdf`

    const { error: uploadErr } = await adminClient.storage
      .from("irat_files")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true
      })

    if (uploadErr) {
      console.error("Storage upload error (T1041):", uploadErr)
      return { error: "Nem sikerült a PDF fájlt feltölteni a tárolóba." }
    }

    const docName = `${data.employeeName} - NAV T1041 Adatlap (${data.bejelentesTipus})`

    // 3. Rekord létrehozása a hr_dokumentum táblában
    const { data: newDoc, error: docErr } = await adminClient
      .from("hr_dokumentum")
      .insert({
        dolgozo_id: dolgozoId || null,
        nev: docName,
        kategoria: "Hatósági bejelentés",
        url: storagePath
      })
      .select()
      .single()

    if (docErr || !newDoc) {
      return { error: "Nem sikerült menteni a dokumentumot az adatbázisba." }
    }

    // 4. Frissítjük a hr_t1041_bejelentes rekordot
    await saveT1041Record({
      onboardingId,
      offboardingId,
      dolgozoId,
      bejelentesTipus: data.bejelentesTipus,
      biztositottNeve: data.employeeName,
      tajSzam: data.tajSzam || undefined,
      adoazonositoJel: data.adoazonositoJel || undefined,
      munkakor: data.munkakor || undefined,
      feorKod: data.feorKod || undefined,
      jogviszonyKezdete: data.jogviszonyKezdete || undefined,
      jogviszonyVege: data.jogviszonyVege || undefined,
      valtozasDatuma: data.valtozasDatuma || undefined,
      valtozasJellege: data.valtozasJellege || undefined,
      hetiMunkaidoOra: data.hetiMunkaidoOra || 40,
      bekuldesDatuma: data.bekuldesDatuma || undefined
    })

    let query = adminClient.from("hr_t1041_bejelentes").update({
      adatlap_dokumentum_id: newDoc.id,
      adatlap_url: storagePath
    })

    if (offboardingId) {
      query = query.eq("offboarding_id", offboardingId)
    } else if (onboardingId) {
      query = query.eq("onboarding_id", onboardingId)
    } else if (dolgozoId) {
      query = query.eq("dolgozo_id", dolgozoId)
    }
    await query

    // 5. Ha a dolgozó már aktív, azonnal beiktatjuk a személyi dossziéba (kivéve onboarding és offboarding alatt)
    let iktatoszam = null
    if (dolgozoId && !onboardingId && !offboardingId) {
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
    console.error("generateT1041PdfAction error:", err)
    return { error: err.message || "Hiba történt a T1041 PDF generálása során." }
  }
}

/**
 * Hivatalos NAV befogadási nyugta / igazolás PDF feltöltése
 * Amikor ezt feltöltik, a T1041 feladat 'done' státuszba vált!
 */
export async function uploadT1041ReceiptAction(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Nincs bejelentkezve" }

    const adminClient = getAdminClient()

    const file = formData.get("file") as File
    const onboardingId = formData.get("onboardingId") as string | null
    const offboardingId = formData.get("offboardingId") as string | null
    const dolgozoId = formData.get("dolgozoId") as string | null
    const employeeName = formData.get("employeeName") as string || "Munkavállaló"

    if (!file) {
      return { error: "Nincs kiválasztva feltöltendő fájl." }
    }

    const idKey = offboardingId || onboardingId || dolgozoId || "t1041"
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const storagePath = `hr/t1041/${idKey}/nyugta_${timestamp}_${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadErr } = await adminClient.storage
      .from("irat_files")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/pdf",
        upsert: true
      })

    if (uploadErr) {
      console.error("Receipt upload error:", uploadErr)
      return { error: "Nem sikerült feltölteni a NAV nyugta fájlt." }
    }

    const docName = `${employeeName} - Hivatalos NAV T1041 Befogadási Nyugta`

    const { data: newDoc, error: docErr } = await adminClient
      .from("hr_dokumentum")
      .insert({
        dolgozo_id: dolgozoId || null,
        nev: docName,
        kategoria: "Hatósági bejelentés",
        url: storagePath
      })
      .select()
      .single()

    if (docErr || !newDoc) {
      return { error: "Nem sikerült menteni a nyugtát az adatbázisba." }
    }

    // Frissítjük a T1041 rekordot 'igazolva' állapotra
    let tQuery = adminClient.from("hr_t1041_bejelentes").update({
      nyugta_dokumentum_id: newDoc.id,
      nyugta_url: storagePath,
      allapot: "igazolva",
      updated_at: new Date().toISOString()
    })

    if (offboardingId) {
      tQuery = tQuery.eq("offboarding_id", offboardingId)
    } else if (onboardingId) {
      tQuery = tQuery.eq("onboarding_id", onboardingId)
    } else if (dolgozoId) {
      tQuery = tQuery.eq("dolgozo_id", dolgozoId)
    }
    await tQuery

    // Ha az onboardingban volt feladat, automatikusan készre pipáljuk a T1041 feladatot!
    if (onboardingId) {
      const { data: tasks } = await adminClient
        .from("hr_onboarding_feladat")
        .select("id, cim, statusz")
        .eq("onboarding_id", onboardingId)

      const t1041Task = (tasks || []).find((t: any) =>
        (t.cim || "").toLowerCase().includes("t1041") ||
        (t.cim || "").toLowerCase().includes("nav")
      )

      if (t1041Task && t1041Task.statusz !== "done") {
        await adminClient
          .from("hr_onboarding_feladat")
          .update({ statusz: "done" })
          .eq("id", t1041Task.id)
      }
    }

    // Ha az offboardingban volt feladat, automatikusan készre pipáljuk a T1041 feladatot!
    if (offboardingId) {
      const { data: tasks } = await adminClient
        .from("hr_offboarding_feladat")
        .select("id, cim, statusz")
        .eq("offboarding_id", offboardingId)

      const t1041Task = (tasks || []).find((t: any) =>
        (t.cim || "").toLowerCase().includes("t1041") ||
        (t.cim || "").toLowerCase().includes("nav")
      )

      if (t1041Task && t1041Task.statusz !== "done") {
        await adminClient
          .from("hr_offboarding_feladat")
          .update({ statusz: "done" })
          .eq("id", t1041Task.id)
      }

      await adminClient
        .from("hr_offboarding")
        .update({ t1041_nyugta_url: storagePath })
        .eq("id", offboardingId)
    }

    // Ha a dolgozó már aktív, azonnal beiktatjuk a személyi dossziéba (kivéve onboarding és offboarding alatt)
    let iktatoszam = null
    if (dolgozoId && !onboardingId && !offboardingId) {
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

    // Audit napló
    await adminClient.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      esemeny_tipus: "adat_letrehozas",
      entitas_tipus: "hr_t1041_bejelentes",
      entitas_id: newDoc.id,
      megjegyzes: `Hivatalos NAV T1041 befogadási nyugta feltöltve: ${employeeName}`
    })

    revalidatePath("/hr/onboarding")
    if (offboardingId) revalidatePath("/hr/offboarding")
    if (dolgozoId) revalidatePath(`/hr/employee/${dolgozoId}`)

    return {
      success: true,
      document: newDoc,
      iktatoszam,
      isFiled: Boolean(iktatoszam)
    }
  } catch (err: any) {
    console.error("uploadT1041ReceiptAction error:", err)
    return { error: err.message || "Hiba történt a nyugta feltöltése során." }
  }
}

/**
 * Meglévő T1041 dokumentum iktatása
 */
export async function fileExistingT1041Document(params: {
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
    customTargy: docData?.nev || "NAV T1041 Bejelentési Dokumentum",
    currentUserId: user.id
  })

  revalidatePath("/hr/onboarding")
  revalidatePath(`/hr/employee/${dolgozoId}`)
  return filingRes
}
