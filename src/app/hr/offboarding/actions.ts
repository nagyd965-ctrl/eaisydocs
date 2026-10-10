"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { generateTerminationPdfBuffer } from "@/utils/hr/termination-pdf-generator"
import { type TerminationPdfData, type TerminationType, DEFAULT_COMPANY_DETAILS, TERMINATION_TYPE_LABELS } from "@/utils/hr/termination-constants"
import { generateAssetReturnPdfBuffer, type AssetReturnItem, type AssetReturnPdfData } from "@/utils/hr/asset-return-pdf-generator"
import { generateExitCertificatePdfBuffer } from "@/utils/hr/exit-certificate-pdf-generator"
import { type ExitCertificatePdfData, DEFAULT_EXIT_DOCUMENTS } from "@/utils/hr/exit-certificate-constants"
import { executeHrDocumentFiling } from "@/utils/hr-filing-bridge"

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ---------------------------------------------------------------------------
// 1. Feladatok kezelése
// ---------------------------------------------------------------------------

export async function toggleOffboardingTaskStatus(taskId: string, currentStatus: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const newStatus = currentStatus === 'pending' ? 'done' : 'pending'

  const { data: taskData } = await supabase
    .from("hr_offboarding_feladat")
    .select(`cim, offboarding_id, hr_offboarding(dolgozo_id)`)
    .eq("id", taskId)
    .single()

  const { error } = await supabase
    .from("hr_offboarding_feladat")
    .update({ statusz: newStatus })
    .eq("id", taskId)

  if (error) {
    console.error("Hiba feladat módosításakor:", error)
    return { error: error.message }
  }

  if (taskData) {
    const statusText = newStatus === 'done' ? 'Elvégezve' : 'Folyamatban'
    await supabase.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      esemeny_tipus: "adat_megtekintes", 
      entitas_tipus: "hr_offboarding_feladat",
      entitas_id: taskId,
      megjegyzes: `Offboarding feladat (${taskData.cim}) státusza átállítva: ${statusText}`
    })
  }

  revalidatePath("/hr/offboarding")
  return { success: true }
}

export async function updateOffboardingDate(offboardingId: string, newDate: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("hr_offboarding")
    .update({ kilepes_datuma: newDate, utolso_munkaban_toltott_nap: newDate })
    .eq("id", offboardingId)

  if (error) {
    console.error("Hiba a dátum mentésekor:", error)
    return { error: error.message }
  }

  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_modositas", 
    entitas_tipus: "hr_offboarding",
    entitas_id: offboardingId,
    megjegyzes: `Kilépési dátum frissítve erre: ${newDate}`
  })

  revalidatePath("/hr/offboarding")
  return { success: true }
}

export async function addOffboardingTask(offboardingId: string, cim: string, felelos_reszleg: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("hr_offboarding_feladat")
    .insert([{
      offboarding_id: offboardingId,
      cim,
      felelos_reszleg,
      statusz: 'pending'
    }])

  if (error) {
    console.error("Hiba a feladat hozzáadásakor:", error)
    return { error: error.message }
  }

  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_modositas", 
    entitas_tipus: "hr_offboarding",
    entitas_id: offboardingId,
    megjegyzes: `Új offboarding feladat rögzítve: ${cim} (${felelos_reszleg})`
  })

  revalidatePath("/hr/offboarding")
  return { success: true }
}

export async function deleteOffboardingTask(taskId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("hr_offboarding_feladat")
    .delete()
    .eq("id", taskId)

  if (error) {
    console.error("Hiba a feladat törlésekor:", error)
    return { error: error.message }
  }

  revalidatePath("/hr/offboarding")
  return { success: true }
}

// ---------------------------------------------------------------------------
// 2. Offboarding folyamat létrehozása és kezelése
// ---------------------------------------------------------------------------

export interface CreateOffboardingParams {
  dolgozoId: string
  kilepesDatuma: string
  megszunesModja?: string
  utolsoMunkanap?: string
  reszleg?: string
  munkakor?: string
  indoklas?: string
}

export async function createOffboarding(
  dolgozoId: string, 
  kilepesDatuma: string, 
  extraParams?: Partial<CreateOffboardingParams>
) {
  const supabase = await createClient()
  const adminClient = getAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  // Check if active offboarding already exists
  const { data: existing } = await adminClient
    .from("hr_offboarding")
    .select("id, statusz")
    .eq("dolgozo_id", dolgozoId)
    .eq("statusz", "folyamatban")
    .maybeSingle()

  if (existing) {
    return { error: "Ennek a dolgozónak már van folyamatban lévő kiléptetési folyamata." }
  }

  const { data: closedExisting } = await adminClient
    .from("hr_offboarding")
    .select("id, statusz")
    .eq("dolgozo_id", dolgozoId)
    .eq("statusz", "lezart")
    .maybeSingle()

  if (closedExisting) {
    return { error: "Ennek a dolgozónak a kiléptetése már korábban lezárult." }
  }

  // Megpróbáljuk lekérni a dolgozó munkakörét és részlegét több forrásból
  let resolvedReszleg = extraParams?.reszleg || null
  let resolvedMunkakor = extraParams?.munkakor || null

  // 1. hr_dolgozo_adatlap
  const { data: adatlap } = await adminClient
    .from("hr_dolgozo_adatlap")
    .select("munkakor, reszleg, szervezeti_egyseg:szervezeti_egyseg_id(nev)")
    .or(`felhasznalo_id.eq.${dolgozoId},id.eq.${dolgozoId}`)
    .maybeSingle()

  if (adatlap) {
    if (!resolvedMunkakor) resolvedMunkakor = adatlap.munkakor || null
    if (!resolvedReszleg) resolvedReszleg = (adatlap.szervezeti_egyseg as any)?.nev || adatlap.reszleg || null
  }

  // 2. hr_jogviszony -> hr_beosztas -> hr_munkakor
  if (!resolvedMunkakor || !resolvedReszleg) {
    const { data: jogviszony } = await adminClient
      .from("hr_jogviszony")
      .select("hr_beosztas(hr_munkakor(megnevezes, szervezeti_egyseg:szervezeti_egyseg_id(nev)))")
      .eq("dolgozo_id", dolgozoId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const beosztas: any = Array.isArray(jogviszony?.hr_beosztas) ? jogviszony?.hr_beosztas[0] : jogviszony?.hr_beosztas
    const munkakorData: any = Array.isArray(beosztas?.hr_munkakor) ? beosztas?.hr_munkakor[0] : beosztas?.hr_munkakor
    if (munkakorData?.megnevezes && !resolvedMunkakor) {
      resolvedMunkakor = munkakorData.megnevezes
    }
    const szEgyseg: any = Array.isArray(munkakorData?.szervezeti_egyseg) ? munkakorData?.szervezeti_egyseg[0] : munkakorData?.szervezeti_egyseg
    if (szEgyseg?.nev && !resolvedReszleg) {
      resolvedReszleg = szEgyseg.nev
    }
  }

  // 3. felhasznalo_profil (szervezeti egység és pozíció)
  if (!resolvedReszleg || !resolvedMunkakor) {
    const { data: prof } = await adminClient
      .from("felhasznalo_profil")
      .select("hr_szervezeti_egyseg:hr_szervezeti_egyseg_id(nev), pozicio")
      .eq("id", dolgozoId)
      .maybeSingle()

    const profObj: any = prof
    const egysegData: any = Array.isArray(profObj?.hr_szervezeti_egyseg) ? profObj?.hr_szervezeti_egyseg[0] : profObj?.hr_szervezeti_egyseg
    if (egysegData?.nev && !resolvedReszleg) {
      resolvedReszleg = egysegData.nev
    }
    if (profObj?.pozicio && !resolvedMunkakor) {
      resolvedMunkakor = profObj.pozicio
    }
  }

  // 4. hr_munkaszerzodes (legutóbbi munkaszerződés)
  if (!resolvedMunkakor) {
    const { data: contract } = await adminClient
      .from("hr_munkaszerzodes")
      .select("munkakor")
      .eq("dolgozo_id", dolgozoId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (contract?.munkakor) {
      resolvedMunkakor = contract.munkakor
    }
  }

  const { data: newOffboarding, error: createError } = await adminClient
    .from("hr_offboarding")
    .insert([{
      dolgozo_id: dolgozoId,
      kilepes_datuma: kilepesDatuma,
      utolso_munkaban_toltott_nap: extraParams?.utolsoMunkanap || kilepesDatuma,
      megszunes_modja: extraParams?.megszunesModja || "kozos_megegyezes",
      reszleg: resolvedReszleg,
      munkakor: resolvedMunkakor,
      indoklas: extraParams?.indoklas || null,
      statusz: 'folyamatban'
    }])
    .select()
    .single()

  if (createError) {
    return { error: createError.message }
  }

  // Intelligens alapértelmezett kiléptetési feladatok
  const defaultTasks = [
    { offboarding_id: newOffboarding.id, cim: "Munkaviszony megszüntetési megállapodás előkészítése & aláírása", felelos_reszleg: "HR" },
    { offboarding_id: newOffboarding.id, cim: "Céges munkaeszközök és irodai kulcsok/belépők leadása (Mt. 179. §)", felelos_reszleg: "IT / Üzemeltetés" },
    { offboarding_id: newOffboarding.id, cim: "E-mail fiók, VPN és jogosultságok visszavonása", felelos_reszleg: "IT" },
    { offboarding_id: newOffboarding.id, cim: "T1041 NAV kijelentés és nyugta rögzítése", felelos_reszleg: "Bérszámfejtés" },
    { offboarding_id: newOffboarding.id, cim: "Kilépési interjú lefolytatása", felelos_reszleg: "HR" },
    { offboarding_id: newOffboarding.id, cim: "Törvényes kilépő igazolások kiadása (Mt. 80. §)", felelos_reszleg: "Bérszámfejtés" },
  ]

  await adminClient.from("hr_offboarding_feladat").insert(defaultTasks)

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_modositas",
    entitas_tipus: "hr_offboarding",
    entitas_id: newOffboarding.id,
    megjegyzes: `Kiléptetési folyamat indítva (${resolvedMunkakor || "Dolgozó"} - ${kilepesDatuma})`
  })

  revalidatePath("/hr/offboarding")
  return { success: true, id: newOffboarding.id }
}

export async function closeOffboarding(offboardingId: string) {
  const supabase = await createClient()
  const adminClient = getAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: offboarding, error: fetchErr } = await adminClient
    .from("hr_offboarding")
    .select("*, felhasznalo_profil(id, nev)")
    .eq("id", offboardingId)
    .single()

  if (fetchErr || !offboarding) {
    return { error: "Nem található az offboarding folyamat." }
  }

  const employeeName = offboarding.felhasznalo_profil?.nev || "Munkatárs"

  // 0. Fail-Safe: Ha a törvényes kilépő igazolás még nem készült el, automatikusan előállítjuk a meglévő adatokkal (Mt. 80. §)
  let kilepoPdfUrl = offboarding.kilepo_igazolas_pdf_url
  if (!kilepoPdfUrl) {
    try {
      const autoCertRes = await generateExitCertificateAction(offboardingId, {})
      if (autoCertRes.success && autoCertRes.storagePath) {
        kilepoPdfUrl = autoCertRes.storagePath
      }
    } catch (certErr) {
      console.error("Hiba az automatikus kilépő igazolás generálásakor lezáráskor:", certErr)
    }
  }

  // 1. Összegyűjtjük az offboarding során keletkezett, még be nem iktatott dokumentumokat
  const docMap = new Map<string, { id: string; nev: string; kategoria: string; url: string }>()

  // a) Direkt tárolt PDF-ek az offboarding táblából (szerzodes_pdf_url, eszkoz_elszamolas_pdf_url, t1041_nyugta_url, kilepo_igazolas_pdf_url)
  const urlsToCheck = [
    offboarding.szerzodes_pdf_url,
    offboarding.eszkoz_elszamolas_pdf_url,
    offboarding.t1041_nyugta_url,
    kilepoPdfUrl
  ].filter(Boolean)

  if (urlsToCheck.length > 0) {
    const { data: matchedDocs } = await adminClient
      .from("hr_dokumentum")
      .select("id, nev, kategoria, url, iktatoszam")
      .in("url", urlsToCheck)

    for (const d of matchedDocs || []) {
      if (!d.iktatoszam) {
        docMap.set(d.id, d)
      }
    }
  }

  // b) Dolgozóhoz tartozó, még nem iktatott offboarding kategóriájú dokumentumok
  const { data: unfiledOffboardingDocs } = await adminClient
    .from("hr_dokumentum")
    .select("id, nev, kategoria, url, iktatoszam")
    .eq("dolgozo_id", offboarding.dolgozo_id)
    .in("kategoria", ["Munkaviszony megszüntetés", "Eszköz átadás-átvétel", "Hatósági bejelentések", "Kilépő igazolások"])
    .is("iktatoszam", null)

  for (const d of unfiledOffboardingDocs || []) {
    if (!d.iktatoszam) {
      docMap.set(d.id, d)
    }
  }

  // c) T1041 rekordok dokumentumai (ha léteznek)
  const { data: t1041Records } = await adminClient
    .from("hr_t1041_bejelentes")
    .select("adatlap_dokumentum_id, nyugta_dokumentum_id")
    .or(`offboarding_id.eq.${offboardingId},dolgozo_id.eq.${offboarding.dolgozo_id}`)

  const tDocIds = Array.from(new Set(
    (t1041Records || []).flatMap(r => [r.adatlap_dokumentum_id, r.nyugta_dokumentum_id]).filter(Boolean)
  ))

  if (tDocIds.length > 0) {
    const { data: tDocs } = await adminClient
      .from("hr_dokumentum")
      .select("id, nev, kategoria, url, iktatoszam")
      .in("id", tDocIds)

    for (const d of tDocs || []) {
      if (!d.iktatoszam) {
        docMap.set(d.id, d)
      }
    }
  }

  // 2. Csoportos iktatás az eaisyDocs személyi dossziéba gap-mentesen
  const unfiledDocs = Array.from(docMap.values())
  const filedResults: { id: string; iktatoszam: string; nev: string }[] = []

  for (const doc of unfiledDocs) {
    try {
      const filingRes = await executeHrDocumentFiling(adminClient, {
        documentId: doc.id,
        employeeId: offboarding.dolgozo_id,
        customTargy: doc.nev,
        currentUserId: user.id
      })
      if (filingRes.success && filingRes.iktatoszam) {
        filedResults.push({ id: doc.id, iktatoszam: filingRes.iktatoszam, nev: doc.nev })
      }
    } catch (fErr) {
      console.error(`Iktatási hiba a dokumentumnál (${doc.id}, ${doc.nev}):`, fErr)
    }
  }

  // 3. Automatikusan elvégzettre állítjuk a még nyitott offboarding feladatokat
  await adminClient
    .from("hr_offboarding_feladat")
    .update({ statusz: 'done' })
    .eq("offboarding_id", offboardingId)
    .eq("statusz", "pending")

  // 4. Státusz lezárása
  const { error: updateErr } = await adminClient
    .from("hr_offboarding")
    .update({ statusz: 'lezart' })
    .eq("id", offboardingId)

  if (updateErr) {
    console.error("Hiba a kiléptetés lezárásakor:", updateErr)
    return { error: updateErr.message }
  }

  // 4b. Dolgozó adatlapján a munkaviszony végének beállítása
  const exitDate = offboarding.kilepes_datuma || offboarding.utolso_munkanap || new Date().toISOString().split("T")[0]
  if (offboarding.dolgozo_id) {
    await adminClient
      .from("hr_dolgozo_adatlap")
      .update({ munkaviszony_vege: exitDate })
      .eq("id", offboarding.dolgozo_id)

    // 4c. Jogosultságok azonnali megvonása (eaisyHR szerepkör inaktiválása)
    await adminClient
      .from("felhasznalo_profil")
      .update({ hr_szerepkor: "inaktiv" })
      .eq("id", offboarding.dolgozo_id)

    // 4d. Automatikus Supabase Auth fiókletiltás (100 év ban)
    try {
      await adminClient.auth.admin.updateUserById(offboarding.dolgozo_id, {
        ban_duration: '876000h'
      })
    } catch (authBanErr) {
      console.error("Nem sikerült letiltani az auth fiókot:", authBanErr)
    }
  }

  // 5. Személyi dosszié archivált állapotba helyezése (irattarban)
  const { data: existingDossier } = await adminClient
    .from("ugyirat")
    .select("id, statusz")
    .eq("munkavallalo_id", offboarding.dolgozo_id)
    .maybeSingle()

  if (existingDossier && existingDossier.statusz !== "irattarban") {
    await adminClient
      .from("ugyirat")
      .update({ statusz: "irattarban" })
      .eq("id", existingDossier.id)
  }

  // 6. Audit naplózás
  const filingNote = filedResults.length > 0 
    ? `${filedResults.length} kilépő irat beiktatva a személyi dossziéba (${filedResults.map(f => f.iktatoszam).join(", ")}).` 
    : "Nincsenek új iktatandó dokumentumok."

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_modositas", 
    entitas_tipus: "hr_offboarding",
    entitas_id: offboardingId,
    megjegyzes: `Kiléptetés hivatalosan lezárva (${employeeName}). Fiók letiltva (Auth ban) és jogosultságok visszavonva. ${filingNote}`
  })

  revalidatePath("/hr/offboarding")
  revalidatePath("/hr/settings")
  revalidatePath("/hr/admin")
  revalidatePath("/hr")
  return { 
    success: true, 
    filedCount: filedResults.length,
    filedDocs: filedResults
  }
}

export async function reopenOffboarding(offboardingId: string) {
  const supabase = await createClient()
  const adminClient = getAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: offboarding } = await adminClient
    .from("hr_offboarding")
    .select("dolgozo_id")
    .eq("id", offboardingId)
    .single()

  const { error } = await adminClient
    .from("hr_offboarding")
    .update({ statusz: 'folyamatban' })
    .eq("id", offboardingId)

  if (error) {
    console.error("Hiba a kiléptetés újranyitásakor:", error)
    return { error: error.message }
  }

  // Személyi dosszié újranyitása iktatva státuszra, hogy lehessen módosítani / új iratot felvenni
  if (offboarding?.dolgozo_id) {
    const { data: existingDossier } = await adminClient
      .from("ugyirat")
      .select("id, statusz")
      .eq("munkavallalo_id", offboarding.dolgozo_id)
      .maybeSingle()

    if (existingDossier && existingDossier.statusz === "irattarban") {
      await adminClient
        .from("ugyirat")
        .update({ statusz: "iktatva" })
        .eq("id", existingDossier.id)
    }

    // Auth fiók tiltásának feloldása (unban)
    try {
      await adminClient.auth.admin.updateUserById(offboarding.dolgozo_id, {
        ban_duration: 'none'
      })
    } catch (unbanErr) {
      console.error("Nem sikerült feloldani a ban-t:", unbanErr)
    }

    // HR jogosultság visszaállítása
    await adminClient
      .from("felhasznalo_profil")
      .update({ hr_szerepkor: "munkavallalo" })
      .eq("id", offboarding.dolgozo_id)

    // Munkaviszony vége törlése
    await adminClient
      .from("hr_dolgozo_adatlap")
      .update({ munkaviszony_vege: null })
      .eq("id", offboarding.dolgozo_id)
  }

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_modositas", 
    entitas_tipus: "hr_offboarding",
    entitas_id: offboardingId,
    megjegyzes: `Kiléptetés újranyitva. Auth fiók és jogosultságok visszaállítva.`
  })

  revalidatePath("/hr/offboarding")
  revalidatePath("/hr/settings")
  revalidatePath("/hr/admin")
  revalidatePath("/hr")
  return { success: true }
}

export async function fileSingleOffboardingDocument({
  documentId,
  dolgozoId,
  customTargy
}: {
  documentId: string
  dolgozoId: string
  customTargy?: string
}) {
  const supabase = await createClient()
  const adminClient = getAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const filingResult = await executeHrDocumentFiling(adminClient, {
    documentId,
    employeeId: dolgozoId,
    customTargy,
    currentUserId: user.id
  })

  if (!filingResult.success) {
    return { error: filingResult.error || "Nem sikerült beiktatni a dokumentumot." }
  }

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "irat_letrehozas",
    entitas_tipus: "hr_dokumentum",
    entitas_id: documentId,
    megjegyzes: `Kilépő dokumentum egyedileg beiktatva a személyi dossziéba (${filingResult.iktatoszam})`
  })

  revalidatePath("/hr/offboarding")
  return { 
    success: true, 
    iktatoszam: filingResult.iktatoszam, 
    ugyiratId: filingResult.ugyirat_id,
    iratId: filingResult.irat_id 
  }
}

export const closeOffboardingProcess = closeOffboarding
export const reopenOffboardingProcess = reopenOffboarding

export async function deleteOffboardingProcess(offboardingId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await supabase
    .from("hr_offboarding")
    .delete()
    .eq("id", offboardingId)

  if (error) {
    console.error("Hiba a kiléptetés törlésekor:", error)
    return { error: error.message }
  }

  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "adat_torles", 
    entitas_tipus: "hr_offboarding",
    entitas_id: offboardingId,
    megjegyzes: `Kiléptetési folyamat véglegesen törölve`
  })

  revalidatePath("/hr/offboarding")
  return { success: true }
}

// ---------------------------------------------------------------------------
// 3. Részletes Offboarding Adatok Lekérése (Modál és Panelek számára)
// ---------------------------------------------------------------------------

export async function getOffboardingDetailData(offboardingId: string) {
  const adminClient = getAdminClient()

  try {
    const { data: offboarding, error } = await adminClient
      .from("hr_offboarding")
      .select(`
        *,
        felhasznalo_profil (
          id, nev, szerepkor, hr_szerepkor
        ),
        hr_offboarding_feladat (*),
        hr_kilepes_interju (*)
      `)
      .eq("id", offboardingId)
      .single()

    if (error || !offboarding) {
      return { error: error?.message || "Nem található offboarding folyamat." }
    }

    // Dolgozó adatlap lekérése (személyi és azonosító adatok)
    const { data: adatlap } = await adminClient
      .from("hr_dolgozo_adatlap")
      .select("*")
      .eq("felhasznalo_id", offboarding.dolgozo_id)
      .maybeSingle()

    // Céges eszközök lekérése
    const { data: assets } = await adminClient
      .from("hr_munkahelyi_eszkoz")
      .select("*")
      .eq("dolgozo_id", offboarding.dolgozo_id)
      .order("created_at", { ascending: true })

    // T1041 rekord lekérése
    const { data: t1041Records } = await adminClient
      .from("hr_t1041_bejelentes")
      .select("*")
      .or(`offboarding_id.eq.${offboardingId},dolgozo_id.eq.${offboarding.dolgozo_id}`)
      .order("created_at", { ascending: false })

    // Tárgyévi jóváhagyott betegszabadság napok lekérése (Mt. 126. §)
    const currentYear = new Date().getFullYear()
    const { data: sickLeaves } = await adminClient
      .from("hr_tavollet")
      .select("napok_szama")
      .eq("dolgozo_id", offboarding.dolgozo_id)
      .eq("tipus", "betegszabadsag")
      .eq("statusz", "jovahagyva")
      .gte("kezdet", `${currentYear}-01-01`)

    const targyeviBetegszabadsagNapok = (sickLeaves || []).reduce((acc: number, curr: any) => acc + (Number(curr.napok_szama) || 0), 0)

    // Kapcsolódó dokumentumok lekérése a hr_dokumentum táblából (iktatási metaadatokkal)
    const { data: hrDocs } = await adminClient
      .from("hr_dokumentum")
      .select("id, nev, kategoria, url, iktatoszam, iktatva_ekor, ugyirat_id, irat_id")
      .eq("dolgozo_id", offboarding.dolgozo_id)
      .order("created_at", { ascending: false })

    const termHrDoc = hrDocs?.find(d => d.kategoria === "Munkaviszony megszüntetés" || (offboarding.szerzodes_pdf_url && d.url === offboarding.szerzodes_pdf_url))
    const assetHrDoc = hrDocs?.find(d => d.kategoria === "Eszköz átadás-átvétel" || (offboarding.eszkoz_elszamolas_pdf_url && d.url === offboarding.eszkoz_elszamolas_pdf_url))
    const kilepoHrDoc = hrDocs?.find(d => d.kategoria === "Kilépő igazolások" || (offboarding.kilepo_igazolas_pdf_url && d.url === offboarding.kilepo_igazolas_pdf_url))

    // Kapcsolódó dokumentumok aláírt/megtekinthető URL-jei
    let terminationDoc = null
    let assetReturnDoc = null
    let kilepoIgazolasDoc = null

    if (offboarding.szerzodes_pdf_url) {
      let tUrl = offboarding.szerzodes_pdf_url
      if (!tUrl.startsWith("http")) {
        const { data: s } = await adminClient.storage.from("irat_files").createSignedUrl(tUrl, 3600)
        if (s?.signedUrl) tUrl = s.signedUrl
      }
      terminationDoc = { 
        url: tUrl, 
        storagePath: offboarding.szerzodes_pdf_url,
        iktatoszam: termHrDoc?.iktatoszam || null,
        iktatvaEkor: termHrDoc?.iktatva_ekor || null,
        documentId: termHrDoc?.id || null,
        ugyiratId: termHrDoc?.ugyirat_id || null,
        iratId: termHrDoc?.irat_id || null
      }
    }

    if (offboarding.eszkoz_elszamolas_pdf_url) {
      let aUrl = offboarding.eszkoz_elszamolas_pdf_url
      if (!aUrl.startsWith("http")) {
        const { data: s } = await adminClient.storage.from("irat_files").createSignedUrl(aUrl, 3600)
        if (s?.signedUrl) aUrl = s.signedUrl
      }
      assetReturnDoc = { 
        url: aUrl, 
        storagePath: offboarding.eszkoz_elszamolas_pdf_url,
        iktatoszam: assetHrDoc?.iktatoszam || null,
        iktatvaEkor: assetHrDoc?.iktatva_ekor || null,
        documentId: assetHrDoc?.id || null,
        ugyiratId: assetHrDoc?.ugyirat_id || null,
        iratId: assetHrDoc?.irat_id || null
      }
    }

    if (offboarding.kilepo_igazolas_pdf_url) {
      let kUrl = offboarding.kilepo_igazolas_pdf_url
      if (!kUrl.startsWith("http")) {
        const { data: s } = await adminClient.storage.from("irat_files").createSignedUrl(kUrl, 3600)
        if (s?.signedUrl) kUrl = s.signedUrl
      }
      kilepoIgazolasDoc = { 
        url: kUrl, 
        storagePath: offboarding.kilepo_igazolas_pdf_url,
        iktatoszam: kilepoHrDoc?.iktatoszam || null,
        iktatvaEkor: kilepoHrDoc?.iktatva_ekor || null,
        documentId: kilepoHrDoc?.id || null,
        ugyiratId: kilepoHrDoc?.ugyirat_id || null,
        iratId: kilepoHrDoc?.irat_id || null
      }
    }

    // Dolgozó munkakör és részleg feloldása ha hiányozna
    let resolvedMunkakor = offboarding.munkakor
    let resolvedReszleg = offboarding.reszleg

    if (!resolvedMunkakor || !resolvedReszleg) {
      if (adatlap) {
        if (!resolvedMunkakor) resolvedMunkakor = adatlap.munkakor || null
        if (!resolvedReszleg) resolvedReszleg = (adatlap.szervezeti_egyseg as any)?.nev || adatlap.reszleg || null
      }

      if (!resolvedMunkakor || !resolvedReszleg) {
        const { data: jogviszony } = await adminClient
          .from("hr_jogviszony")
          .select("hr_beosztas(hr_munkakor(megnevezes, szervezeti_egyseg:szervezeti_egyseg_id(nev)))")
          .eq("dolgozo_id", offboarding.dolgozo_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        const beosztas: any = Array.isArray(jogviszony?.hr_beosztas) ? jogviszony?.hr_beosztas[0] : jogviszony?.hr_beosztas
        const munkakorData: any = Array.isArray(beosztas?.hr_munkakor) ? beosztas?.hr_munkakor[0] : beosztas?.hr_munkakor
        if (munkakorData?.megnevezes && !resolvedMunkakor) {
          resolvedMunkakor = munkakorData.megnevezes
        }
        const szEgyseg: any = Array.isArray(munkakorData?.szervezeti_egyseg) ? munkakorData?.szervezeti_egyseg[0] : munkakorData?.szervezeti_egyseg
        if (szEgyseg?.nev && !resolvedReszleg) {
          resolvedReszleg = szEgyseg.nev
        }
      }

      if (!resolvedReszleg || !resolvedMunkakor) {
        const { data: prof } = await adminClient
          .from("felhasznalo_profil")
          .select("hr_szervezeti_egyseg:hr_szervezeti_egyseg_id(nev), pozicio")
          .eq("id", offboarding.dolgozo_id)
          .maybeSingle()

        const profObj: any = prof
        const egysegData: any = Array.isArray(profObj?.hr_szervezeti_egyseg) ? profObj?.hr_szervezeti_egyseg[0] : profObj?.hr_szervezeti_egyseg
        if (egysegData?.nev && !resolvedReszleg) {
          resolvedReszleg = egysegData.nev
        }
        if (profObj?.pozicio && !resolvedMunkakor) {
          resolvedMunkakor = profObj.pozicio
        }
      }

      // Adatbázis szinkronizáció ha hiányzott
      if ((resolvedMunkakor && !offboarding.munkakor) || (resolvedReszleg && !offboarding.reszleg)) {
        await adminClient
          .from("hr_offboarding")
          .update({
            munkakor: resolvedMunkakor || offboarding.munkakor,
            reszleg: resolvedReszleg || offboarding.reszleg
          })
          .eq("id", offboardingId)
      }
    }

    const payload = {
      ...offboarding,
      munkakor: resolvedMunkakor || offboarding.munkakor,
      reszleg: resolvedReszleg || offboarding.reszleg,
      adatlap: adatlap || null,
      assets: assets || [],
      t1041: t1041Records?.[0] || null,
      terminationDoc,
      assetReturnDoc,
      kilepoIgazolasDoc,
      targyeviBetegszabadsagNapok
    }

    return {
      ...payload,
      data: payload
    }
  } catch (err: any) {
    console.error("getOffboardingDetailData exception:", err)
    return { error: err.message }
  }
}

// ---------------------------------------------------------------------------
// 4. Munkaviszony Megszüntetés Generálás & Iktatás (Mt. 64–85. §)
// ---------------------------------------------------------------------------

export async function generateTerminationAgreementAction(
  offboardingId: string, 
  payload: Partial<TerminationPdfData>
) {
  const supabase = await createClient()
  const adminClient = getAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: offboarding, error: offErr } = await adminClient
    .from("hr_offboarding")
    .select("*, felhasznalo_profil(id, nev)")
    .eq("id", offboardingId)
    .single()

  if (offErr || !offboarding) {
    return { error: "Nem található az offboarding folyamat." }
  }

  const employeeName = payload.employeeName || offboarding.felhasznalo_profil?.nev || "Munkavállaló"
  const terminationType = (payload.megszunesModja || offboarding.megszunes_modja || "kozos_megegyezes") as TerminationType

  // 1. Frissítjük az offboarding rekordot a megadott adatokkal
  await adminClient
    .from("hr_offboarding")
    .update({
      megszunes_modja: terminationType,
      indoklas: payload.indoklas ?? offboarding.indoklas,
      utolso_munkaban_toltott_nap: payload.utolsoMunkanap || offboarding.utolso_munkaban_toltott_nap || offboarding.kilepes_datuma,
      kilepes_datuma: payload.megszunesDatuma || offboarding.kilepes_datuma,
      felmentesi_ido_nap: payload.felmentesiIdoNap ?? offboarding.felmentesi_ido_nap ?? 0,
      megvaltott_szabadsag_nap: payload.megvaltottSzabadsagNap ?? offboarding.megvaltott_szabadsag_nap ?? 0,
      vegkielegites_osszeg: payload.vegkielegitesOsszeg ?? offboarding.vegkielegites_osszeg ?? 0,
      reszleg: payload.reszleg ?? offboarding.reszleg,
      munkakor: payload.munkakor ?? offboarding.munkakor,
    })
    .eq("id", offboardingId)

  // 2. PDF Generálás
  const pdfData: TerminationPdfData = {
    employeeName,
    employeeId: offboarding.dolgozo_id,
    offboardingId,
    munkakor: payload.munkakor || offboarding.munkakor || "Munkavállaló",
    reszleg: payload.reszleg || offboarding.reszleg,
    szuletesiHely: payload.szuletesiHely,
    szuletesiDatum: payload.szuletesiDatum,
    anyjaNeve: payload.anyjaNeve,
    lakcim: payload.lakcim,
    adoazonosito: payload.adoazonosito,
    tajSzam: payload.tajSzam,
    megszunesModja: terminationType,
    utolsoMunkanap: payload.utolsoMunkanap || offboarding.kilepes_datuma,
    megszunesDatuma: payload.megszunesDatuma || offboarding.kilepes_datuma,
    felmentesiIdoNap: Number(payload.felmentesiIdoNap || 0),
    megvaltottSzabadsagNap: Number(payload.megvaltottSzabadsagNap || 0),
    vegkielegitesOsszeg: Number(payload.vegkielegitesOsszeg || 0),
    indoklas: payload.indoklas,
    egyediZaradek: payload.egyediZaradek,
    cegAdatok: DEFAULT_COMPANY_DETAILS,
    kelt: new Date().toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateTerminationPdfBuffer(pdfData)
  } catch (pdfErr: any) {
    console.error("Hiba a Megszüntetési PDF generálásakor:", pdfErr)
    return { error: `PDF generálási hiba: ${pdfErr.message}` }
  }

  // 3. Feltöltés Storage-ba
  const timestamp = Date.now()
  const storagePath = `hr/offboarding/${offboarding.dolgozo_id}/${timestamp}_megszuntetes_${terminationType}.pdf`

  const { error: uploadErr } = await adminClient.storage
    .from("irat_files")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true
    })

  if (uploadErr) {
    console.error("Storage upload error:", uploadErr)
    return { error: `Feltöltési hiba: ${uploadErr.message}` }
  }

  // 4. Mentés a hr_dokumentum táblába
  const docName = `Munkaviszony megszüntetés - ${employeeName} (${pdfData.megszunesDatuma})`
  const { data: newDoc, error: docErr } = await adminClient
    .from("hr_dokumentum")
    .insert({
      dolgozo_id: offboarding.dolgozo_id,
      nev: docName,
      kategoria: "Munkaviszony megszüntetés",
      url: storagePath,
      alairas_statusz: "vazlat"
    })
    .select()
    .single()

  if (docErr || !newDoc) {
    return { error: `Dokumentum bejegyzési hiba: ${docErr?.message}` }
  }

  // 5. Iktatás halasztva a kiléptetés lezárásáig (vagy manuális iktatás gombra)
  // A dokumentum mentve van a hr_dokumentum-ban alairas_statusz: 'vazlat'-ként.
  // 6. Elmentjük az offboarding rekordba a PDF elérési útját
  await adminClient
    .from("hr_offboarding")
    .update({ szerzodes_pdf_url: storagePath })
    .eq("id", offboardingId)

  // 7. Automatikus feladat készrepipálás
  const { data: terminationTasks } = await adminClient
    .from("hr_offboarding_feladat")
    .select("id, cim, statusz")
    .eq("offboarding_id", offboardingId)

  const matchTask = terminationTasks?.find(t => 
    t.cim.toLowerCase().includes("megszüntet") || 
    t.cim.toLowerCase().includes("kilépő papír") ||
    t.cim.toLowerCase().includes("szerződés")
  )

  if (matchTask && matchTask.statusz !== "done") {
    await adminClient
      .from("hr_offboarding_feladat")
      .update({ statusz: "done" })
      .eq("id", matchTask.id)
  }

  // Naplózás
  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "irat_letoltes",
    entitas_tipus: "hr_offboarding",
    entitas_id: offboardingId,
    megjegyzes: `Munkaviszony megszüntetési megállapodás legenerálva és mentve (${docName}). Iktatás a kiléptetés lezárásakor.`
  })

  revalidatePath("/hr/offboarding")
  const { data: sData } = await adminClient.storage.from("irat_files").createSignedUrl(storagePath, 3600)

  return { 
    success: true, 
    storagePath,
    pdfUrl: sData?.signedUrl || null,
    documentId: newDoc.id,
    isDraft: true,
    iktatoszam: null
  }
}

// ---------------------------------------------------------------------------
// 5. Eszköz Visszavételi & Leszámoló Lap Generálás & Iktatás (Mt. 179. §)
// ---------------------------------------------------------------------------

export async function generateAssetReturnSheetAction(
  offboardingId: string, 
  payload: {
    items: AssetReturnItem[]
    visszavetelDatuma: string
    fizetendoKarteritesOsszeg?: number
    vagyoniElszamolasNyilatkozat?: string | null
  }
) {
  const supabase = await createClient()
  const adminClient = getAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: offboarding, error: offErr } = await adminClient
    .from("hr_offboarding")
    .select("*, felhasznalo_profil(id, nev)")
    .eq("id", offboardingId)
    .single()

  if (offErr || !offboarding) {
    return { error: "Nem található az offboarding folyamat." }
  }

  const employeeName = offboarding.felhasznalo_profil?.nev || "Munkavállaló"

  // 1. Frissítjük a munkahelyi eszközök állapotát a DB-ben visszavettnek
  if (payload.items && payload.items.length > 0) {
    for (const item of payload.items) {
      if (item.gyari_szam) {
        await adminClient
          .from("hr_munkahelyi_eszkoz")
          .update({
            statusz: item.visszavetel_allapot === 'hianyzik' ? 'selejtezve' : 'visszaveve',
            visszavetel_datuma: payload.visszavetelDatuma,
            offboarding_id: offboardingId,
            megjegyzes: item.visszavetel_megjegyzes || undefined
          })
          .eq("dolgozo_id", offboarding.dolgozo_id)
          .eq("gyari_szam", item.gyari_szam)
      }
    }
  }

  // 2. PDF Generálás
  const pdfData: AssetReturnPdfData = {
    employeeName,
    employeeId: offboarding.dolgozo_id,
    offboardingId,
    munkakor: offboarding.munkakor || "Munkavállaló",
    reszleg: offboarding.reszleg,
    visszavetelDatuma: payload.visszavetelDatuma || new Date().toISOString().split("T")[0],
    cegAdatok: DEFAULT_COMPANY_DETAILS,
    items: payload.items || [],
    fizetendoKarteritesOsszeg: Number(payload.fizetendoKarteritesOsszeg || 0),
    vagyoniElszamolasNyilatkozat: payload.vagyoniElszamolasNyilatkozat,
    kelt: new Date().toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateAssetReturnPdfBuffer(pdfData)
  } catch (pdfErr: any) {
    console.error("Hiba az Eszköz Visszavételi PDF generálásakor:", pdfErr)
    return { error: `PDF generálási hiba: ${pdfErr.message}` }
  }

  // 3. Feltöltés Storage-ba
  const timestamp = Date.now()
  const storagePath = `hr/offboarding/${offboarding.dolgozo_id}/${timestamp}_eszkoz_visszavetel.pdf`

  const { error: uploadErr } = await adminClient.storage
    .from("irat_files")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true
    })

  if (uploadErr) {
    return { error: `Feltöltési hiba: ${uploadErr.message}` }
  }

  // 4. Mentés a hr_dokumentum táblába
  const docName = `Eszköz Visszavételi és Leszámoló Lap - ${employeeName} (${pdfData.visszavetelDatuma})`
  const { data: newDoc, error: docErr } = await adminClient
    .from("hr_dokumentum")
    .insert({
      dolgozo_id: offboarding.dolgozo_id,
      nev: docName,
      kategoria: "Eszköz átadás-átvétel",
      url: storagePath,
      alairas_statusz: "vazlat"
    })
    .select()
    .single()

  if (docErr || !newDoc) {
    return { error: `Dokumentum mentési hiba: ${docErr?.message}` }
  }

  // 5. Iktatás halasztva a kiléptetés lezárásáig (vagy manuális iktatás gombra)
  // A dokumentum mentve van a hr_dokumentum-ban alairas_statusz: 'vazlat'-ként.
  // 6. Elmentjük az offboarding rekordba
  await adminClient
    .from("hr_offboarding")
    .update({ eszkoz_elszamolas_pdf_url: storagePath })
    .eq("id", offboardingId)

  // 7. Automatikus feladat készrepipálás (IT eszköz és belépőkártya)
  const { data: tasks } = await adminClient
    .from("hr_offboarding_feladat")
    .select("id, cim, statusz")
    .eq("offboarding_id", offboardingId)

  const matchTasks = tasks?.filter(t => 
    t.cim.toLowerCase().includes("eszköz") || 
    t.cim.toLowerCase().includes("laptop") || 
    t.cim.toLowerCase().includes("telefon") ||
    t.cim.toLowerCase().includes("belépőkártya") ||
    t.cim.toLowerCase().includes("kulcs")
  )

  if (matchTasks && matchTasks.length > 0) {
    for (const t of matchTasks) {
      if (t.statusz !== "done") {
        await adminClient
          .from("hr_offboarding_feladat")
          .update({ statusz: "done" })
          .eq("id", t.id)
      }
    }
  }

  // Naplózás
  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "adat_letrehozas",
    entitas_tipus: "hr_offboarding",
    entitas_id: offboardingId,
    megjegyzes: `Eszköz visszavételi lap legenerálva és mentve (${docName}). Iktatás a kiléptetés lezárásakor.`
  })

  revalidatePath("/hr/offboarding")
  const { data: sData } = await adminClient.storage.from("irat_files").createSignedUrl(storagePath, 3600)

  return { 
    success: true, 
    storagePath,
    pdfUrl: sData?.signedUrl || null,
    documentId: newDoc.id,
    isDraft: true,
    iktatoszam: null
  }
}

export async function getSignedFileUrl(storagePath: string): Promise<{ signedUrl: string | null; error?: string }> {
  if (!storagePath) return { signedUrl: null }
  if (storagePath.startsWith("http://") || storagePath.startsWith("https://") || storagePath.startsWith("blob:") || storagePath.startsWith("data:")) {
    return { signedUrl: storagePath }
  }
  try {
    const adminClient = getAdminClient()
    const { data, error } = await adminClient.storage.from("irat_files").createSignedUrl(storagePath, 3600)
    if (error || !data?.signedUrl) {
      return { error: error?.message || "Nem sikerült aláírt URL-t generálni", signedUrl: null }
    }
    return { signedUrl: data.signedUrl }
  } catch (err: any) {
    return { error: err.message, signedUrl: null }
  }
}

// ---------------------------------------------------------------------------
// 6. Kilépési Interjú Műveletek
// ---------------------------------------------------------------------------

export async function getExitInterview(offboardingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data, error } = await supabase
    .from("hr_kilepes_interju")
    .select("*")
    .eq("offboarding_id", offboardingId)
    .maybeSingle()

  if (error) {
    console.error("Hiba az exit interjú lekérésekor:", error)
    return { error: error.message }
  }

  return { data }
}

export async function saveExitInterview(offboardingId: string, formData: {
  kilepes_kategoria: string
  kilepes_oka: string
  altalanos_elegedettseg: number | null
  vezeto_kapcsolat: number | null
  munkakornyezet_ertekeles: number | null
  csapat_ertekeles: number | null
  mi_tetszett: string
  mit_valtoztatna: string
  ajanlana: boolean | null
  kovetkezo_allomashely: string
}) {
  const supabase = await createClient()
  const adminClient = getAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { error } = await adminClient
    .from("hr_kilepes_interju")
    .upsert({
      offboarding_id: offboardingId,
      ...formData,
      rogzito_id: user.id,
    }, { onConflict: "offboarding_id" })

  if (error) {
    console.error("Hiba az exit interjú mentésekor:", error)
    return { error: error.message }
  }

  // Automatikus feladat készrepipálás
  const { data: tasks } = await adminClient
    .from("hr_offboarding_feladat")
    .select("id, cim, statusz")
    .eq("offboarding_id", offboardingId)

  const interviewTask = tasks?.find(t => t.cim.toLowerCase().includes("interjú"))
  if (interviewTask && interviewTask.statusz !== "done") {
    await adminClient
      .from("hr_offboarding_feladat")
      .update({ statusz: "done" })
      .eq("id", interviewTask.id)
  }

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_modositas",
    entitas_tipus: "hr_kilepes_interju",
    entitas_id: offboardingId,
    megjegyzes: `Kilépési interjú rögzítve az offboarding folyamathoz`
  })

  revalidatePath("/hr/offboarding")
  return { success: true }
}

// ---------------------------------------------------------------------------
// 6. Törvényes Kilépő Igazolások Generálása (Mt. 80. §)
// ---------------------------------------------------------------------------

export async function generateExitCertificateAction(
  offboardingId: string,
  payload: Partial<ExitCertificatePdfData>
) {
  const supabase = await createClient()
  const adminClient = getAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: offboarding, error: offErr } = await adminClient
    .from("hr_offboarding")
    .select("*, felhasznalo_profil(id, nev)")
    .eq("id", offboardingId)
    .single()

  if (offErr || !offboarding) {
    return { error: "Nem található az offboarding folyamat." }
  }

  const employeeName = payload.employeeName || offboarding.felhasznalo_profil?.nev || "Munkavállaló"

  // Dolgozó adatlap lekérése ha hiányoznak a személyes adatok
  const { data: adatlap } = await adminClient
    .from("hr_dolgozo_adatlap")
    .select("*")
    .eq("felhasznalo_id", offboarding.dolgozo_id)
    .maybeSingle()

  // Tárgyévi betegszabadság automatikus feloldása ha nem lett manuálisan megadva
  let resolvedBetegszabi = payload.betegszabadsagNapok
  if (resolvedBetegszabi === undefined || resolvedBetegszabi === null) {
    const currentYear = new Date().getFullYear()
    const { data: sickLeaves } = await adminClient
      .from("hr_tavollet")
      .select("napok_szama")
      .eq("dolgozo_id", offboarding.dolgozo_id)
      .eq("tipus", "betegszabadsag")
      .eq("statusz", "jovahagyva")
      .gte("kezdet", `${currentYear}-01-01`)

    resolvedBetegszabi = (sickLeaves || []).reduce((acc: number, curr: any) => acc + (Number(curr.napok_szama) || 0), 0)
  }

  // 1. PDF Adatok összeállítása
  const pdfData: ExitCertificatePdfData = {
    employeeName,
    employeeId: offboarding.dolgozo_id,
    offboardingId,
    munkakor: payload.munkakor || offboarding.munkakor || adatlap?.munkakor || "Munkavállaló",
    feorKod: payload.feorKod || adatlap?.feor_kod || adatlap?.feor || null,
    reszleg: payload.reszleg || offboarding.reszleg || null,
    szuletesiHely: payload.szuletesiHely || adatlap?.szuletesi_hely || null,
    szuletesiDatum: payload.szuletesiDatum || adatlap?.szuletesi_datum || null,
    anyjaNeve: payload.anyjaNeve || adatlap?.anyja_szuletesi_neve || adatlap?.anyja_neve || null,
    lakcim: payload.lakcim || adatlap?.allando_lakcim || adatlap?.lakcim || null,
    adoazonosito: payload.adoazonosito || adatlap?.adoazonosito_jel || adatlap?.adoazonosito || null,
    tajSzam: payload.tajSzam || adatlap?.taj_szam || null,
    jogviszonyKezdete: payload.jogviszonyKezdete || adatlap?.belepes_datuma || adatlap?.jogviszony_kezdete || null,
    jogviszonyVege: payload.jogviszonyVege || offboarding.kilepes_datuma || new Date().toISOString().split("T")[0],
    megszunesModja: offboarding.megszunes_modja || "kozos_megegyezes",
    megszunesModjaLabel: payload.megszunesModjaLabel || (TERMINATION_TYPE_LABELS[offboarding.megszunes_modja as TerminationType] || "Közös megegyezés (Mt. 64. § (1) bek. a) pont)"),
    levonasok: payload.levonasok || "A munkavállaló munkabérét végrehajtói vagy egyéb bírósági letiltás, gyermektartásdíj nem terheli.",
    vanLevonas: Boolean(payload.vanLevonas),
    levonasReszletek: payload.levonasReszletek || null,
    betegszabadsagNapok: Number(resolvedBetegszabi || 0),
    vegkielegitesOsszeg: Number(payload.vegkielegitesOsszeg ?? offboarding.vegkielegites_osszeg ?? 0),
    atvetelModja: payload.atvetelModja || "szemelyes",
    postaiAzonosito: payload.postaiAzonosito || null,
    kiadottIratok: payload.kiadottIratok && payload.kiadottIratok.length > 0 ? payload.kiadottIratok : DEFAULT_EXIT_DOCUMENTS,
    cegAdatok: DEFAULT_COMPANY_DETAILS,
    kelt: new Date().toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateExitCertificatePdfBuffer(pdfData)
  } catch (pdfErr: any) {
    console.error("Hiba a Kilépő Igazolás PDF generálásakor:", pdfErr)
    return { error: `PDF generálási hiba: ${pdfErr.message}` }
  }

  // 2. Feltöltés Storage-ba
  const timestamp = Date.now()
  const storagePath = `hr/offboarding/${offboarding.dolgozo_id}/${timestamp}_kilepo_igazolas.pdf`

  const { error: uploadErr } = await adminClient.storage
    .from("irat_files")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true
    })

  if (uploadErr) {
    return { error: `Feltöltési hiba: ${uploadErr.message}` }
  }

  // 3. Mentés a hr_dokumentum táblába
  const docName = `Törvényes Kilépő Igazolások & Átvételi Nyugta (Mt. 80. §) - ${employeeName}`
  const { data: newDoc, error: docErr } = await adminClient
    .from("hr_dokumentum")
    .insert({
      dolgozo_id: offboarding.dolgozo_id,
      nev: docName,
      kategoria: "Kilépő igazolások",
      url: storagePath,
      alairas_statusz: "vazlat"
    })
    .select()
    .single()

  if (docErr || !newDoc) {
    return { error: `Dokumentum nyilvántartási hiba: ${docErr?.message}` }
  }

  // 4. Frissítjük az offboarding rekordot
  await adminClient
    .from("hr_offboarding")
    .update({
      kilepo_igazolas_pdf_url: storagePath,
      kilepo_igazolas_adatok: {
        vanLevonas: pdfData.vanLevonas,
        levonasok: pdfData.levonasok,
        levonasReszletek: pdfData.levonasReszletek,
        betegszabadsagNapok: pdfData.betegszabadsagNapok,
        atvetelModja: pdfData.atvetelModja,
        postaiAzonosito: pdfData.postaiAzonosito,
        feorKod: pdfData.feorKod,
        jogviszonyKezdete: pdfData.jogviszonyKezdete
      }
    })
    .eq("id", offboardingId)

  // 5. Automatikus feladat pipa: Törvényes kilépő igazolások kiadása (Mt. 80. §)
  const { data: tasks } = await adminClient
    .from("hr_offboarding_feladat")
    .select("id, cim, statusz")
    .eq("offboarding_id", offboardingId)

  const certTask = tasks?.find(t => 
    t.cim.toLowerCase().includes("kilépő igazolás") || 
    t.cim.toLowerCase().includes("igazolások kiadása") || 
    t.cim.toLowerCase().includes("mt. 80")
  )
  if (certTask && certTask.statusz !== "done") {
    await adminClient
      .from("hr_offboarding_feladat")
      .update({ statusz: "done" })
      .eq("id", certTask.id)
  }

  // 6. Signed URL az azonnali megtekintéshez
  const { data: signedData } = await adminClient.storage
    .from("irat_files")
    .createSignedUrl(storagePath, 3600)

  await adminClient.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "irat_letrehozas",
    entitas_tipus: "hr_dokumentum",
    entitas_id: newDoc.id,
    megjegyzes: `Törvényes kilépő igazolások PDF legenerálva és mentve (Mt. 80. §)`
  })

  revalidatePath("/hr/offboarding")
  return { 
    success: true, 
    pdfUrl: signedData?.signedUrl || storagePath, 
    storagePath,
    documentId: newDoc.id
  }
}

