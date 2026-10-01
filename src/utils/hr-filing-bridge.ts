import { SupabaseClient } from "@supabase/supabase-js"
import crypto from "crypto"
import { convertToPdfA } from "./pdfa-converter"

export interface FilingResult {
  success: boolean
  error?: string
  iktatoszam?: string
  ugyirat_id?: string
  irat_id?: string
  alszam?: number
  isNewDossier?: boolean
}

export const HR_FILING_CONSTANTS = {
  PREFIX: "HR",
  RETENTION_CODE: "3.1",
  RETENTION_YEARS: 50,
  MINOSITES: "bizalmas" as const,
  IRANY: "belso" as const,
  ERKEZES_MODJA: "rendszer" as const,
  ADATHORDOZO: "elektronikus_eredeti" as const,
}

/**
 * Számítja a megőrzési idő végét a tárgyévhez képest (50 év, év vége december 31.)
 */
export function calculateRetentionEndDate(currentYear: number = new Date().getFullYear()): string {
  return `${currentYear + HR_FILING_CONSTANTS.RETENTION_YEARS}-12-31`
}

/**
 * Generálja a munkavállalói személyi dosszié tárgyát
 */
export function formatDossierSubject(employeeName: string): string {
  const safeName = (employeeName || "").trim() || "Munkavállaló"
  return `${safeName} személyi dossziéja`
}

/**
 * Generálja az irat hivatalos tárgyát, ha nincs egyedi megadva
 */
export function formatDocumentSubject(docName: string, category?: string | null): string {
  const trimmed = (docName || "").trim()
  if (trimmed) return trimmed
  return category ? `HR dokumentum (${category})` : "HR dokumentum"
}

/**
 * Megkeresi a dolgozó meglévő személyi dossziéját az irat_kapcsolat tábla alapján.
 */
export async function findEmployeeDossier(
  supabase: SupabaseClient,
  employeeId: string
): Promise<{ id: string; iktatoszam: string; statusz: string; ugy_id?: string } | null> {
  // 1. Keresés az irat_kapcsolat táblában (ahol entitas_tipus = 'munkavallalo' és ugyirat_id ki van töltve)
  const { data: relations, error } = await supabase
    .from("irat_kapcsolat")
    .select(`
      ugyirat_id,
      ugyirat:ugyirat_id (
        id,
        iktatoszam,
        statusz,
        ugy_id
      )
    `)
    .eq("entitas_tipus", "munkavallalo")
    .eq("entitas_id", employeeId)
    .not("ugyirat_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)

  if (error || !relations || relations.length === 0) {
    return null
  }

  const dossier = (relations[0] as any).ugyirat
  if (!dossier || !dossier.id) {
    return null
  }

  return {
    id: dossier.id,
    iktatoszam: dossier.iktatoszam,
    statusz: dossier.statusz,
    ugy_id: dossier.ugy_id,
  }
}

/**
 * Megkeresi vagy létrehozza a munkavállaló hivatalos személyi dossziéját.
 */
export async function getOrCreateEmployeeDossier(
  supabase: SupabaseClient,
  employeeId: string,
  employeeName: string,
  currentUserId?: string | null
): Promise<{ id: string; iktatoszam: string; isNew: boolean }> {
  // 1. Ellenőrizzük, hogy létezik-e már dosszié
  const existing = await findEmployeeDossier(supabase, employeeId)
  if (existing) {
    const CLOSED_STATUSES = ["irattarban", "lezart", "selejtezheto", "selejtezett"]
    if (existing.statusz && CLOSED_STATUSES.includes(existing.statusz)) {
      throw new Error(
        `A dolgozó személyi dossziéja (${existing.iktatoszam}) lezárt/archivált státuszú! Újranyitás szükséges az iktatáshoz.`
      )
    }
    return { id: existing.id, iktatoszam: existing.iktatoszam, isNew: false }
  }

  // 2. Ha nincs, létrehozzuk az új személyi dossziét
  const currentYear = new Date().getFullYear()

  // 2a. Lekérjük a 3.1 irattári tételt
  const { data: tetel } = await supabase
    .from("irattari_terv")
    .select("id, tetelszam")
    .eq("tetelszam", HR_FILING_CONSTANTS.RETENTION_CODE)
    .maybeSingle()

  const irattariTetelId = tetel?.id || null

  // 2b. Lekérjük a HR szervezeti egységet (ha létezik)
  const { data: hrDept } = await supabase
    .from("szervezeti_egyseg")
    .select("id")
    .ilike("nev", "%HR%")
    .limit(1)
    .maybeSingle()

  const hrDeptId = hrDept?.id || null

  // 2c. Ügyszám allokáció
  const { data: ugyszam, error: ugyszamErr } = await supabase.rpc("generate_ugyszam", {
    p_ev: currentYear,
    p_prefix: HR_FILING_CONSTANTS.PREFIX,
  })

  if (ugyszamErr || !ugyszam) {
    throw new Error(`Nem sikerült ügyszámot generálni a HR dossziéhoz: ${ugyszamErr?.message || "Ismeretlen hiba"}`)
  }

  // 2d. Ügy beszúrása
  const dossierTargy = formatDossierSubject(employeeName)
  const { data: ugyData, error: ugyErr } = await supabase
    .from("ugy")
    .insert({
      ugyszam,
      targy: dossierTargy,
      ugytipus_id: irattariTetelId,
      statusz: "folyamatban",
      felelos_user_id: currentUserId || null,
    })
    .select("id")
    .single()

  if (ugyErr || !ugyData) {
    throw new Error(`Hiba az ügy (dosszié fejléc) létrehozásakor: ${ugyErr?.message || "Ismeretlen hiba"}`)
  }

  // 2e. Iktatószám allokáció
  const { data: iktatoszam, error: iktatoszamErr } = await supabase.rpc("generate_iktatoszam", {
    p_ev: currentYear,
    p_prefix: HR_FILING_CONSTANTS.PREFIX,
  })

  if (iktatoszamErr || !iktatoszam) {
    throw new Error(`Nem sikerült iktatószámot generálni a HR dossziéhoz: ${iktatoszamErr?.message || "Ismeretlen hiba"}`)
  }

  // 2f. Ügyirat beszúrása (50 év megőrzési idővel)
  const retentionEnd = calculateRetentionEndDate(currentYear)
  const { data: ugyiratData, error: ugyiratErr } = await supabase
    .from("ugyirat")
    .insert({
      ugy_id: ugyData.id,
      iktatoszam,
      irattari_tetel_id: irattariTetelId,
      megorzesi_ido_vege: retentionEnd,
      statusz: "iktatva",
      szervezeti_egyseg_id: hrDeptId,
      iktato_user_id: currentUserId || null,
    })
    .select("id")
    .single()

  if (ugyiratErr || !ugyiratData) {
    throw new Error(`Hiba a személyi dosszié (ügyirat) létrehozásakor: ${ugyiratErr?.message || "Ismeretlen hiba"}`)
  }

  // 2g. Polimorf dosszié-kapcsolat rögzítése
  await supabase.from("irat_kapcsolat").insert({
    ugyirat_id: ugyiratData.id,
    entitas_tipus: "munkavallalo",
    entitas_id: employeeId,
    entitas_forras: "belso",
    kapcsolat_tipusa: "targya",
  })

  return {
    id: ugyiratData.id,
    iktatoszam,
    isNew: true,
  }
}

/**
 * Végrehajtja egy HR dokumentum hivatalos iktatását az eaisyDocs rendszerbe.
 */
export async function executeHrDocumentFiling(
  supabase: SupabaseClient,
  params: {
    documentId: string
    employeeId: string
    customTargy?: string
    currentUserId?: string | null
    clientInfo?: { ip?: string; userAgent?: string }
  }
): Promise<FilingResult> {
  const { documentId, employeeId, customTargy, currentUserId, clientInfo } = params

  // 1. Lekérjük a HR dokumentum rekordot
  const { data: doc, error: docErr } = await supabase
    .from("hr_dokumentum")
    .select("id, nev, kategoria, url, iktatoszam, dolgozo_id")
    .eq("id", documentId)
    .single()

  if (docErr || !doc) {
    return { success: false, error: "A megadott HR dokumentum nem található." }
  }

  // 2. Integritás ellenőrzés: ha már iktatva van, nem iktatható újra
  if (doc.iktatoszam) {
    return {
      success: false,
      error: `Ez a dokumentum már hivatalosan iktatva van (${doc.iktatoszam})!`,
    }
  }

  // 3. Lekérjük a dolgozó profil nevét
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("id, nev")
    .eq("id", employeeId)
    .single()

  const employeeName = profile?.nev || "Ismeretlen munkavállaló"

  // 4. Megkeressük vagy létrehozzuk a munkavállalói személyi dossziét
  let dossier: { id: string; iktatoszam: string; isNew: boolean }
  try {
    dossier = await getOrCreateEmployeeDossier(supabase, employeeId, employeeName, currentUserId)
  } catch (err: any) {
    return { success: false, error: err.message || "Nem sikerült a személyi dossziét megnyitni." }
  }

  // 5. Kiszámítjuk a következő alszámot az adott ügyiraton belül
  const { data: existingIratok, error: iratokErr } = await supabase
    .from("irat")
    .select("alszam")
    .eq("ugyirat_id", dossier.id)

  if (iratokErr) {
    return { success: false, error: "Hiba az irat alszám meghatározásakor." }
  }

  const maxAlszam = (existingIratok || []).reduce((max, i) => Math.max(max, i.alszam || 0), 0)
  const nextAlszam = maxAlszam + 1
  const fullIktatoszam = `${dossier.iktatoszam}/${nextAlszam}`

  // 6. Irat fejléc előkészítése
  const iratTargy = formatDocumentSubject(customTargy || doc.nev, doc.kategoria)
  const iratLeiras = `[HR Dokumentum] Kategória: ${doc.kategoria || "Egyéb"} | Munkavállaló: ${employeeName}`

  // 7. Beszúrjuk az új iratot
  const { data: iratData, error: iratErr } = await supabase
    .from("irat")
    .insert({
      ugyirat_id: dossier.id,
      alszam: nextAlszam,
      irany: HR_FILING_CONSTANTS.IRANY,
      erkezes_modja: HR_FILING_CONSTANTS.ERKEZES_MODJA,
      targy: iratTargy,
      leiras: iratLeiras,
      adathordozo_tipus: HR_FILING_CONSTANTS.ADATHORDOZO,
      minosites: HR_FILING_CONSTANTS.MINOSITES,
    })
    .select("id")
    .single()

  if (iratErr || !iratData) {
    return { success: false, error: `Hiba az irat létrehozásakor: ${iratErr?.message || "Ismeretlen hiba"}` }
  }

  const iratId = iratData.id

  // 8. Fájl csatolása az irat_fajl táblába (ha van storage path)
  if (doc.url) {
    let fileSize = 1024
    let fileSha256 = crypto.createHash("sha256").update(doc.url + doc.id).digest("hex")
    let pdfaPath: string | null = null

    try {
      const { data: fileBlob, error: downloadErr } = await supabase.storage
        .from("irat_files")
        .download(doc.url)

      if (!downloadErr && fileBlob) {
        const arrayBuf = await fileBlob.arrayBuffer()
        const buf = Buffer.from(arrayBuf)
        fileSize = buf.length
        fileSha256 = crypto.createHash("sha256").update(buf).digest("hex")

        // PDF/A-2b archiválási példány generálása
        try {
          const { buffer: pdfaBuffer } = await convertToPdfA(buf)
          const dotIndex = doc.url.lastIndexOf(".")
          const newPdfaStoragePath = dotIndex !== -1 ? doc.url.slice(0, dotIndex) + "_pdfa.pdf" : `${doc.url}_pdfa.pdf`
          const { error: uploadPdfaErr } = await supabase.storage
            .from("irat_files")
            .upload(newPdfaStoragePath, pdfaBuffer, {
              contentType: "application/pdf",
              upsert: true,
            })
          if (!uploadPdfaErr) {
            pdfaPath = newPdfaStoragePath
          }
        } catch (pErr) {
          console.warn("[HrFiling] PDF/A konverziós hiba:", pErr)
        }
      }
    } catch (fErr) {
      console.warn("[HrFiling] Fájl méret/SHA256 lekérdezési figyelmeztetés:", fErr)
    }

    const safeFilename = doc.nev.endsWith(".pdf") ? doc.nev : `${doc.nev}.pdf`

    await supabase.from("irat_fajl").insert({
      irat_id: iratId,
      storage_path: doc.url,
      pdfa_path: pdfaPath,
      eredeti_fajlnev: safeFilename,
      mime_type: "application/pdf",
      meret_byte: fileSize,
      sha256: fileSha256,
      verzio: 1,
    })
  }

  // 9. Kétirányú polimorf kapcsolatok rögzítése
  // 9a. Irat -> Munkavállaló kapcsolat
  await supabase.from("irat_kapcsolat").insert({
    irat_id: iratId,
    ugyirat_id: dossier.id,
    entitas_tipus: "munkavallalo",
    entitas_id: employeeId,
    entitas_forras: "belso",
    kapcsolat_tipusa: "targya",
  })

  // 9b. Irat -> HR Dokumentum kapcsolat
  await supabase.from("irat_kapcsolat").insert({
    irat_id: iratId,
    ugyirat_id: dossier.id,
    entitas_tipus: "hr_dokumentum",
    entitas_id: documentId,
    entitas_forras: "belso",
    kapcsolat_tipusa: "melleklete",
  })

  // 10. Frissítjük a hr_dokumentum rekordot
  const { error: updateDocErr } = await supabase
    .from("hr_dokumentum")
    .update({
      irat_id: iratId,
      ugyirat_id: dossier.id,
      iktatoszam: fullIktatoszam,
      iktatva_ekor: new Date().toISOString(),
    })
    .eq("id", documentId)

  if (updateDocErr) {
    console.error("[HrFiling] hr_dokumentum update hiba:", updateDocErr)
  }

  // 11. Audit naplózás mindkét rendszerben
  try {
    // 11a. eaisyDocs esemény napló (append-only)
    await supabase.from("esemeny_naplo").insert({
      entitas_tipus: "irat",
      entitas_id: iratId,
      esemeny_tipus: "iktatva",
      user_id: currentUserId || null,
      ip_cim: clientInfo?.ip || null,
      user_agent: clientInfo?.userAgent || null,
      indoklas: `eaisyHR dokumentum hivatalosan iktatva: ${fullIktatoszam} (${iratTargy})`,
    })

    // 11b. eaisyHR esemény napló
    await supabase.from("hr_esemeny_naplo").insert({
      entitas_tipus: "hr_dokumentum",
      entitas_id: documentId,
      esemeny_tipus: "iktatva",
      felhasznalo_id: currentUserId || null,
      megjegyzes: `Hivatalosan iktatva az eaisyDocs rendszerbe: ${fullIktatoszam}`,
    })
  } catch (auditErr) {
    console.warn("[HrFiling] Audit naplózási hiba:", auditErr)
  }

  // 12. AI feladatsorba ütemezés
  try {
    await supabase.from("ai_feladat_sor").upsert(
      {
        irat_id: iratId,
        feladat_tipus: "embedding",
        statusz: "fuggoben",
        kovetkezo_futtatas: new Date().toISOString(),
      },
      { onConflict: "irat_id, feladat_tipus" }
    )
  } catch (aiErr) {
    console.warn("[HrFiling] AI feladatsor figyelmeztetés:", aiErr)
  }

  return {
    success: true,
    iktatoszam: fullIktatoszam,
    ugyirat_id: dossier.id,
    irat_id: iratId,
    alszam: nextAlszam,
    isNewDossier: dossier.isNew,
  }
}

export interface BatchFilingResult {
  success: boolean
  error?: string
  filedCount: number
  ugyirat_id?: string
  iktatoszam?: string
  isNewDossier?: boolean
  items?: Array<{
    documentId: string
    documentName: string
    iktatoszam: string
    alszam: number
  }>
}

/**
 * Az adott dolgozó összes még nem iktatott dokumentumának kötegelt beiktatása a személyi dossziéba.
 */
export async function executeBatchHrDocumentsFiling(
  supabase: SupabaseClient,
  params: {
    employeeId: string
    currentUserId?: string | null
    clientInfo?: { ip?: string; userAgent?: string }
  }
): Promise<BatchFilingResult> {
  const { employeeId, currentUserId, clientInfo } = params

  // 1. Lekérjük a dolgozó összes még nem iktatott dokumentumát időrendben
  const { data: unfiledDocs, error: fetchErr } = await supabase
    .from("hr_dokumentum")
    .select("id, nev, kategoria, url, created_at")
    .eq("dolgozo_id", employeeId)
    .is("iktatoszam", null)
    .order("created_at", { ascending: true })

  if (fetchErr) {
    return { success: false, error: "Hiba a dokumentumok lekérésekor: " + fetchErr.message, filedCount: 0 }
  }

  if (!unfiledDocs || unfiledDocs.length === 0) {
    return { success: false, error: "Nincs iktatásra váró vázlat dokumentum ehhez a munkavállalóhoz.", filedCount: 0 }
  }

  // 2. Lekérjük a dolgozó profil nevét
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("id, nev")
    .eq("id", employeeId)
    .single()

  const employeeName = profile?.nev || "Ismeretlen munkavállaló"

  // 3. Megkeressük vagy megnyitjuk a munkavállalói személyi dossziét
  let dossier: { id: string; iktatoszam: string; isNew: boolean }
  try {
    dossier = await getOrCreateEmployeeDossier(supabase, employeeId, employeeName, currentUserId)
  } catch (err: any) {
    return { success: false, error: err.message || "Nem sikerült a személyi dossziét megnyitni.", filedCount: 0 }
  }

  // 4. Alszám bázis meghatározása
  const { data: existingIratok, error: iratokErr } = await supabase
    .from("irat")
    .select("alszam")
    .eq("ugyirat_id", dossier.id)

  if (iratokErr) {
    return { success: false, error: "Hiba az irat alszámok lekérdezésekor.", filedCount: 0 }
  }

  let currentMaxAlszam = (existingIratok || []).reduce((max, i) => Math.max(max, i.alszam || 0), 0)
  const filedItems: Array<{ documentId: string; documentName: string; iktatoszam: string; alszam: number }> = []

  // 5. Ciklusban iktatjuk az összes vázlatot szekvenciális alszámmal
  for (const doc of unfiledDocs) {
    currentMaxAlszam += 1
    const nextAlszam = currentMaxAlszam
    const fullIktatoszam = `${dossier.iktatoszam}/${nextAlszam}`

    const iratTargy = formatDocumentSubject(doc.nev, doc.kategoria)
    const iratLeiras = `[HR Dokumentum] Kategória: ${doc.kategoria || "Egyéb"} | Munkavállaló: ${employeeName}`

    // 5a. Irat beszúrás
    const { data: iratData, error: iratErr } = await supabase
      .from("irat")
      .insert({
        ugyirat_id: dossier.id,
        alszam: nextAlszam,
        irany: HR_FILING_CONSTANTS.IRANY,
        erkezes_modja: HR_FILING_CONSTANTS.ERKEZES_MODJA,
        targy: iratTargy,
        leiras: iratLeiras,
        adathordozo_tipus: HR_FILING_CONSTANTS.ADATHORDOZO,
        minosites: HR_FILING_CONSTANTS.MINOSITES,
      })
      .select("id")
      .single()

    if (iratErr || !iratData) {
      console.error("[BatchHrFiling] Hiba az irat létrehozásakor:", iratErr)
      continue
    }

    const iratId = iratData.id

    // 5b. Fájl csatolása (ha van)
    if (doc.url) {
      let fileSize = 1024
      let fileSha256 = crypto.createHash("sha256").update(doc.url + doc.id).digest("hex")

      try {
        const { data: fileBlob, error: downloadErr } = await supabase.storage
          .from("irat_files")
          .download(doc.url)

        if (!downloadErr && fileBlob) {
          const arrayBuf = await fileBlob.arrayBuffer()
          const buf = Buffer.from(arrayBuf)
          fileSize = buf.length
          fileSha256 = crypto.createHash("sha256").update(buf).digest("hex")

          // PDF/A-2b archiválási példány generálása
          let pdfaPath: string | null = null
          try {
            const { buffer: pdfaBuffer } = await convertToPdfA(buf)
            const dotIndex = doc.url.lastIndexOf(".")
            const newPdfaStoragePath = dotIndex !== -1 ? doc.url.slice(0, dotIndex) + "_pdfa.pdf" : `${doc.url}_pdfa.pdf`
            const { error: uploadPdfaErr } = await supabase.storage
              .from("irat_files")
              .upload(newPdfaStoragePath, pdfaBuffer, {
                contentType: "application/pdf",
                upsert: true,
              })
            if (!uploadPdfaErr) {
              pdfaPath = newPdfaStoragePath
            }
          } catch (pErr) {
            console.warn("[BatchHrFiling] PDF/A konverziós hiba:", pErr)
          }

          const safeFilename = doc.nev.endsWith(".pdf") ? doc.nev : `${doc.nev}.pdf`

          await supabase.from("irat_fajl").insert({
            irat_id: iratId,
            storage_path: doc.url,
            pdfa_path: pdfaPath,
            eredeti_fajlnev: safeFilename,
            mime_type: "application/pdf",
            meret_byte: fileSize,
            sha256: fileSha256,
            verzio: 1,
          })
        }
      } catch (fErr) {
        console.warn("[BatchHrFiling] Fájl hash lekérdezési figyelmeztetés:", fErr)
      }
    }

    // 5c. Polimorf kapcsolatok
    await supabase.from("irat_kapcsolat").insert([
      {
        irat_id: iratId,
        ugyirat_id: dossier.id,
        entitas_tipus: "munkavallalo",
        entitas_id: employeeId,
        entitas_forras: "belso",
        kapcsolat_tipusa: "targya",
      },
      {
        irat_id: iratId,
        ugyirat_id: dossier.id,
        entitas_tipus: "hr_dokumentum",
        entitas_id: doc.id,
        entitas_forras: "belso",
        kapcsolat_tipusa: "melleklete",
      },
    ])

    // 5d. hr_dokumentum frissítése
    await supabase
      .from("hr_dokumentum")
      .update({
        irat_id: iratId,
        ugyirat_id: dossier.id,
        iktatoszam: fullIktatoszam,
        iktatva_ekor: new Date().toISOString(),
      })
      .eq("id", doc.id)

    // 5e. Audit naplók
    try {
      await supabase.from("esemeny_naplo").insert({
        entitas_tipus: "irat",
        entitas_id: iratId,
        esemeny_tipus: "iktatva",
        user_id: currentUserId || null,
        ip_cim: clientInfo?.ip || null,
        user_agent: clientInfo?.userAgent || null,
        indoklas: `Kötegelt eaisyHR iktatás: ${fullIktatoszam} (${iratTargy})`,
      })

      await supabase.from("hr_esemeny_naplo").insert({
        entitas_tipus: "hr_dokumentum",
        entitas_id: doc.id,
        esemeny_tipus: "iktatva",
        felhasznalo_id: currentUserId || null,
        megjegyzes: `Kötegelt iktatás az eaisyDocs rendszerbe: ${fullIktatoszam}`,
      })
    } catch (auditErr) {
      console.warn("[BatchHrFiling] Audit napló hiba:", auditErr)
    }

    // 5f. AI queue
    try {
      await supabase.from("ai_feladat_sor").upsert(
        {
          irat_id: iratId,
          feladat_tipus: "embedding",
          statusz: "fuggoben",
          kovetkezo_futtatas: new Date().toISOString(),
        },
        { onConflict: "irat_id, feladat_tipus" }
      )
    } catch (aiErr) {
      // ignore
    }

    filedItems.push({
      documentId: doc.id,
      documentName: doc.nev,
      iktatoszam: fullIktatoszam,
      alszam: nextAlszam,
    })
  }

  return {
    success: true,
    filedCount: filedItems.length,
    ugyirat_id: dossier.id,
    iktatoszam: dossier.iktatoszam,
    isNewDossier: dossier.isNew,
    items: filedItems,
  }
}
