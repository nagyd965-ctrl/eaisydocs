"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import {
  executeHrDocumentFiling,
  executeBatchHrDocumentsFiling,
  findEmployeeDossier,
  formatDossierSubject,
} from "@/utils/hr-filing-bridge"
import { getClientInfo } from "@/utils/client-info"
import { generateAnnualLeavePdfBuffer } from "@/utils/hr/annual-leave-pdf-generator"

// -----------------------------------------------------------------------------
// Előző munkahelyek
// -----------------------------------------------------------------------------

export async function addWorkplace(employeeId: string, formData: FormData) {
  const supabase = await createClient()

  const munkaltato_neve = formData.get("munkaltato_neve") as string
  const pozicio = formData.get("pozicio") as string
  const jogviszony_tipusa = formData.get("jogviszony_tipusa") as string
  const kezdet_datuma = formData.get("kezdet_datuma") as string
  const veg_datuma = formData.get("veg_datuma") as string

  if (!munkaltato_neve || !pozicio || !kezdet_datuma || !veg_datuma) {
    return { error: "Minden kötelező mezőt ki kell tölteni!" }
  }

  const today = new Date().toISOString().split("T")[0]
  if (kezdet_datuma > today || veg_datuma > today) {
    return { error: "A dátumok nem lehetnek a jövőben!" }
  }
  if (kezdet_datuma > veg_datuma) {
    return { error: "A kezdet dátuma nem lehet később, mint a vég dátuma!" }
  }

  const { error } = await supabase.from("hr_elozo_munkahely").insert({
    dolgozo_id: employeeId,
    munkaltato_neve,
    pozicio,
    jogviszony_tipusa,
    kezdet_datuma,
    veg_datuma,
  })

  if (error) return { error: error.message }

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function deleteWorkplace(id: string, employeeId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("hr_elozo_munkahely").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

// -----------------------------------------------------------------------------
// Képzettségek
// -----------------------------------------------------------------------------

export async function addQualification(employeeId: string, formData: FormData) {
  const supabase = await createClient()

  const tipus = formData.get("tipus") as string
  const megnevezes = formData.get("megnevezes") as string
  const intezmeny = formData.get("intezmeny") as string
  const bizonyitvany_szam = formData.get("bizonyitvany_szam") as string
  const megszerzes_datuma = formData.get("megszerzes_datuma") as string
  const fokozat = formData.get("fokozat") as string

  const file = formData.get("file") as File | null

  if (!tipus || !megnevezes) {
    return { error: "A típus és a megnevezés kitöltése kötelező!" }
  }

  if (megszerzes_datuma) {
    const today = new Date().toISOString().split("T")[0]
    if (megszerzes_datuma > today) {
      return { error: "A megszerzés dátuma nem lehet a jövőben!" }
    }
  }

  let fileUrl = null
  if (file && file.size > 0) {
    const fileExt = file.name.split('.').pop()
    const fileName = `kepzettseg_${Date.now()}.${fileExt}`
    const filePath = `dolgozo_${employeeId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from("irat_files")
      .upload(filePath, file)

    if (uploadError) {
      console.error("Fájl feltöltési hiba:", uploadError)
      return { error: "Hiba történt a fájl feltöltésekor." }
    }
    fileUrl = filePath
  }

  const { error } = await supabase.from("hr_kepzettseg").insert({
    dolgozo_id: employeeId,
    tipus,
    megnevezes,
    intezmeny,
    bizonyitvany_szam,
    megszerzes_datuma: megszerzes_datuma || null,
    fokozat,
    dokumentum_url: fileUrl
  })

  if (error) return { error: error.message }

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function getQualificationFileUrl(filePath: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from("irat_files").createSignedUrl(filePath, 3600)
  if (error || !data) return { error: "Nem sikerült legenerálni a linket." }
  return { url: data.signedUrl }
}

export async function deleteQualification(id: string, employeeId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("hr_kepzettseg").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

// -----------------------------------------------------------------------------
// Tanulmányi szerződések (Mt. 229. §)
// -----------------------------------------------------------------------------

export async function addStudyContract(employeeId: string, formData: FormData) {
  const supabase = await createClient()

  const kepzes_neve = (formData.get("kepzes_neve") as string)?.trim()
  const intezmeny_neve = (formData.get("intezmeny_neve") as string)?.trim()
  const kepzes_szintje = (formData.get("kepzes_szintje") as string)?.trim()
  const koltseg = formData.get("koltseg") as string
  const vallalt_munkaviszony_honap = formData.get("vallalt_munkaviszony_honap") as string
  const lejarat_datuma = formData.get("lejarat_datuma") as string
  const visszafizetesi_kotelezettseg = formData.get("visszafizetesi_kotelezettseg") === "on"
  const munkaido_kedvezmeny = (formData.get("munkaido_kedvezmeny") as string)?.trim()
  const file = formData.get("file") as File | null

  if (!kepzes_neve) {
    return { error: "A képzés nevének kitöltése kötelező!" }
  }

  let storagePath: string | null = null
  let docId: string | null = null

  // Szkennelt / aláírt PDF dokumentum feltöltése ha mellékelve van
  if (file && file.size > 0 && typeof file.arrayBuffer === "function") {
    try {
      const arrayBuf = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuf)
      const cleanFileName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
      storagePath = `study-contracts/${employeeId}/${Date.now()}_${cleanFileName}`

      const { error: uploadError } = await supabase.storage
        .from("irat_files")
        .upload(storagePath, buffer, {
          contentType: file.type || "application/pdf",
          upsert: true,
        })

      if (uploadError) {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceRoleKey) {
          const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
          const adminClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
          )
          const { error: adminUploadError } = await adminClient.storage
            .from("irat_files")
            .upload(storagePath, buffer, {
              contentType: file.type || "application/pdf",
              upsert: true,
            })
          if (adminUploadError) {
            console.error("Storage upload hiba:", adminUploadError)
          }
        }
      }

      // HR dokumentum rekord létrehozása ha van feltöltött fájl
      const { data: newDoc } = await supabase
        .from("hr_dokumentum")
        .insert({
          dolgozo_id: employeeId,
          nev: `Tanulmányi szerződés - ${kepzes_neve}`,
          kategoria: "Tanulmányi szerződés",
          url: storagePath
        })
        .select("id")
        .single()

      if (newDoc) {
        docId = newDoc.id
      }
    } catch (e: any) {
      console.warn("Fájlfeltöltési hiba a tanulmányi szerződésnél:", e)
    }
  }

  const { error } = await supabase.from("hr_tanulmanyi_szerzodes").insert({
    dolgozo_id: employeeId,
    kepzes_neve,
    intezmeny_neve: intezmeny_neve || null,
    kepzes_szintje: kepzes_szintje || null,
    koltseg: koltseg ? parseFloat(koltseg) : null,
    vallalt_munkaviszony_honap: vallalt_munkaviszony_honap ? parseInt(vallalt_munkaviszony_honap, 10) : null,
    lejarat_datuma: lejarat_datuma || null,
    visszafizetesi_kotelezettseg,
    munkaido_kedvezmeny: munkaido_kedvezmeny || null,
    fajl_url: storagePath,
    dokumentum_url: storagePath,
    dokumentum_id: docId,
  })

  if (error) return { error: error.message }

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function deleteStudyContract(id: string, employeeId: string) {
  const supabase = await createClient()

  // Ellenőrizzük, hogy iktatva van-e már
  const { data: existing } = await supabase
    .from("hr_tanulmanyi_szerzodes")
    .select("iktatoszam")
    .eq("id", id)
    .single()

  if (existing?.iktatoszam) {
    return { error: `A hivatalosan beiktatott tanulmányi szerződés (${existing.iktatoszam}) nem törölhető a rendszerből!` }
  }

  const { error } = await supabase.from("hr_tanulmanyi_szerzodes").delete().eq("id", id).eq("dolgozo_id", employeeId)
  if (error) return { error: error.message }
  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function fileStudyContractAction(contractId: string, employeeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const { data: userProfile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor, docs_szerepkor")
    .eq("id", user.id)
    .single()

  const isHrOrAdmin =
    ["hr_munkatars", "hr_vezeto", "admin"].includes(userProfile?.hr_szerepkor || "") ||
    userProfile?.docs_szerepkor === "admin"

  if (!isHrOrAdmin) {
    return { success: false, error: "Nincs jogosultsága tanulmányi szerződést iktatni!" }
  }

  // 1. Rekord lekérése
  const { data: contract, error: contractErr } = await supabase
    .from("hr_tanulmanyi_szerzodes")
    .select("*")
    .eq("id", contractId)
    .single()

  if (contractErr || !contract) {
    return { success: false, error: "Tanulmányi szerződés nem található!" }
  }

  if (contract.iktatoszam) {
    return { success: false, error: `Ez a tanulmányi szerződés már hivatalosan iktatva van (${contract.iktatoszam})!` }
  }

  // 2. Dolgozó neve
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("nev")
    .eq("id", employeeId)
    .single()
  const employeeName = profile?.nev || "Munkavállaló"
  const docSubject = `${employeeName} - Tanulmányi Szerződés (${contract.kepzes_neve})`

  let storagePath = contract.fajl_url
  let docId = contract.dokumentum_id

  // 3. Ha nincs feltöltött fájl, generáljuk le most a hivatalos Mt. 229. § PDF-et
  if (!storagePath) {
    const { generateStudyContractPdfBuffer } = await import("@/utils/hr/study-contract-pdf-generator")
    const { buffer, fileName } = await generateStudyContractPdfBuffer(supabase, contractId)

    const cleanFileName = fileName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
    storagePath = `study-contracts/${employeeId}/${Date.now()}_${cleanFileName}`

    const { error: uploadError } = await supabase.storage
      .from("irat_files")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceRoleKey) {
        const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
        const adminClient = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
        const { error: adminUploadError } = await adminClient.storage
          .from("irat_files")
          .upload(storagePath, buffer, {
            contentType: "application/pdf",
            upsert: true,
          })
        if (adminUploadError) {
          return { success: false, error: "Storage feltöltési hiba: " + adminUploadError.message }
        }
      } else {
        return { success: false, error: "Storage feltöltési hiba: " + uploadError.message }
      }
    }
  }

  // 4. Ha még nincs hr_dokumentum bejegyzés, hozzunk létre egyet
  if (!docId) {
    const { data: newDoc, error: docError } = await supabase
      .from("hr_dokumentum")
      .insert({
        dolgozo_id: employeeId,
        nev: docSubject,
        kategoria: "Tanulmányi szerződés",
        url: storagePath
      })
      .select("id")
      .single()

    if (docError || !newDoc) {
      return { success: false, error: "Nem sikerült a dokumentum rekordot rögzíteni: " + (docError?.message || "") }
    }
    docId = newDoc.id
  }

  // 5. Iktatás végrehajtása az eaisyDocs személyi dossziéba
  const filingResult = await executeHrDocumentFiling(supabase, {
    documentId: docId,
    employeeId,
    customTargy: docSubject,
    currentUserId: user.id
  })

  if (!filingResult.success) {
    return { success: false, error: filingResult.error }
  }

  // 6. Frissítjük a hr_tanulmanyi_szerzodes rekordot
  await supabase
    .from("hr_tanulmanyi_szerzodes")
    .update({
      dokumentum_id: docId,
      fajl_url: storagePath,
      iktatoszam: filingResult.iktatoszam,
      ugyirat_id: filingResult.ugyirat_id,
      irat_id: filingResult.irat_id
    })
    .eq("id", contractId)

  // 7. Audit naplózás
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "adat_letrehozas",
    entitas_tipus: "hr_dokumentum",
    entitas_id: docId,
    megjegyzes: `Tanulmányi szerződés hivatalosan beiktatva a dolgozó személyi dossziéjába (${filingResult.iktatoszam}).`
  })

  revalidatePath(`/hr/employee/${employeeId}`)
  revalidatePath("/hr")
  revalidatePath("/dossiers")

  return {
    success: true,
    iktatoszam: filingResult.iktatoszam,
    ugyirat_id: filingResult.ugyirat_id,
    docId,
  }
}

export async function addOrvosiVizsgalat(employeeId: string, formData: FormData) {
  const supabase = await createClient()

  const tipus = formData.get("tipus") as string
  const vizsgalat_datuma = formData.get("vizsgalat_datuma") as string
  const ervenyesseg_datuma = formData.get("ervenyesseg_datuma") as string
  const eredmeny = formData.get("eredmeny") as string
  const megjegyzes = formData.get("megjegyzes") as string
  const orvos_neve = formData.get("orvos_neve") as string
  const szakrendeles = formData.get("szakrendeles") as string
  const file = formData.get("file") as File | null

  if (!tipus || !vizsgalat_datuma || !ervenyesseg_datuma || !eredmeny) {
    return { error: "Minden kötelező mezőt ki kell tölteni!" }
  }

  const today = new Date().toISOString().split("T")[0]
  if (vizsgalat_datuma > today) {
    return { error: "A vizsgálat dátuma nem lehet a jövőben!" }
  }
  if (vizsgalat_datuma > ervenyesseg_datuma) {
    return { error: "A vizsgálat dátuma nem lehet később, mint az érvényesség dátuma!" }
  }

  // 1. Dolgozó neve az elnevezéshez
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("nev")
    .eq("id", employeeId)
    .single()
  const employeeName = profile?.nev || "Munkavállaló"

  const tipusLabels: Record<string, string> = {
    elozetes: "Előzetes",
    idoszakos: "Időszakos",
    soron_kivuli: "Soron Kívüli",
    zaro: "Záró"
  }
  const tipusLabel = tipusLabels[tipus] || "Időszakos"

  let storagePath: string | null = null
  let docId: string | null = null

  // 2. Fájl feltöltés ha van
  if (file && file.size > 0 && typeof file.arrayBuffer === "function") {
    try {
      const arrayBuf = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuf)
      const cleanFileName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
      storagePath = `medical/${employeeId}/${Date.now()}_${cleanFileName}`

      const { error: uploadError } = await supabase.storage
        .from("irat_files")
        .upload(storagePath, buffer, {
          contentType: file.type || "application/pdf",
          upsert: true,
        })

      if (uploadError) {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceRoleKey) {
          const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
          const adminClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
          )
          const { error: adminUploadError } = await adminClient.storage
            .from("irat_files")
            .upload(storagePath, buffer, {
              contentType: file.type || "application/pdf",
              upsert: true,
            })
          if (adminUploadError) {
            return { error: "Fájl feltöltési hiba: " + adminUploadError.message }
          }
        } else {
          return { error: "Fájl feltöltési hiba: " + uploadError.message }
        }
      }

      // Hozzunk létre egy hr_dokumentum bejegyzést is
      const docName = `${employeeName} - Orvosi Alkalmassági Igazolás (${tipusLabel} - ${vizsgalat_datuma})`
      const { data: newDoc, error: docError } = await supabase
        .from("hr_dokumentum")
        .insert({
          dolgozo_id: employeeId,
          nev: docName,
          kategoria: "Orvosi alkalmassági igazolás",
          url: storagePath
        })
        .select("id")
        .single()

      if (!docError && newDoc) {
        docId = newDoc.id
      }
    } catch (e: any) {
      console.error("Hiba az orvosi fájl mentésekor:", e)
      return { error: "Fájl feldolgozási hiba: " + (e?.message || "") }
    }
  }

  // 3. Mentés az adatbázisba
  const { data: insertedOrvosi, error } = await supabase
    .from("hr_orvosi_vizsgalat")
    .insert({
      dolgozo_id: employeeId,
      tipus,
      vizsgalat_datuma,
      ervenyesseg_datuma,
      eredmeny,
      megjegyzes: megjegyzes || null,
      orvos_neve: orvos_neve || null,
      szakrendeles: szakrendeles || null,
      fajl_url: storagePath,
      dokumentum_id: docId
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  // 4. Szinkronizáljuk a hr_dolgozo_adatlap orvosi_alkalmassag_ervenyesseg mezőjét
  try {
    const { data: adatlap } = await supabase
      .from("hr_dolgozo_adatlap")
      .select("orvosi_alkalmassag_ervenyesseg")
      .eq("id", employeeId)
      .maybeSingle()

    if (!adatlap?.orvosi_alkalmassag_ervenyesseg || ervenyesseg_datuma >= adatlap.orvosi_alkalmassag_ervenyesseg) {
      await supabase
        .from("hr_dolgozo_adatlap")
        .update({ orvosi_alkalmassag_ervenyesseg: ervenyesseg_datuma })
        .eq("id", employeeId)
    }
  } catch (e) {
    console.warn("Nem sikerült szinkronizálni a dolgozó adatlap orvosi érvényességét:", e)
  }

  revalidatePath(`/hr/employee/${employeeId}`)
  revalidatePath("/hr/self-service/profile")
  revalidatePath("/hr")
  return { success: true, id: insertedOrvosi.id }
}

export async function deleteOrvosiVizsgalat(id: string, employeeId: string) {
  const supabase = await createClient()

  // 1. Integritási védelem: iktatott irat nem törölhető!
  const { data: orvosi } = await supabase
    .from("hr_orvosi_vizsgalat")
    .select("iktatoszam")
    .eq("id", id)
    .single()

  if (orvosi?.iktatoszam) {
    return { error: `Iktatott orvosi alkalmassági irat (${orvosi.iktatoszam}) a levéltári szabályozás értelmében nem törölhető!` }
  }

  const { error } = await supabase.from("hr_orvosi_vizsgalat").delete().eq("id", id).eq("dolgozo_id", employeeId)
  if (error) return { error: error.message }

  // Frissítjük a dolgozó adatlap orvosi érvényességét a legújabb érvényes vizsgálatra
  try {
    const { data: latest } = await supabase
      .from("hr_orvosi_vizsgalat")
      .select("ervenyesseg_datuma")
      .eq("dolgozo_id", employeeId)
      .order("ervenyesseg_datuma", { ascending: false })
      .limit(1)
      .maybeSingle()

    await supabase
      .from("hr_dolgozo_adatlap")
      .update({ orvosi_alkalmassag_ervenyesseg: latest?.ervenyesseg_datuma || null })
      .eq("id", employeeId)
  } catch (e) {
    console.warn("Hiba az orvosi érvényesség újraszámításakor törlés után:", e)
  }

  revalidatePath(`/hr/employee/${employeeId}`)
  revalidatePath("/hr/self-service/profile")
  revalidatePath("/hr")
  return { success: true }
}

export async function fileMedicalExaminationAction(orvosiId: string, employeeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const { data: userProfile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor, docs_szerepkor")
    .eq("id", user.id)
    .single()

  const isHrOrAdmin =
    ["hr_munkatars", "hr_vezeto", "admin"].includes(userProfile?.hr_szerepkor || "") ||
    userProfile?.docs_szerepkor === "admin"

  if (!isHrOrAdmin) {
    return { success: false, error: "Nincs jogosultsága orvosi alkalmassági dokumentumot iktatni!" }
  }

  // 1. Lekérjük a vizsgálat rekordot
  const { data: orvosi, error: orvosiErr } = await supabase
    .from("hr_orvosi_vizsgalat")
    .select("*")
    .eq("id", orvosiId)
    .single()

  if (orvosiErr || !orvosi) {
    return { success: false, error: "Orvosi vizsgálat nem található!" }
  }

  if (orvosi.iktatoszam) {
    return { success: false, error: `Ez a vizsgálat már hivatalosan iktatva van (${orvosi.iktatoszam})!` }
  }

  // 2. Dolgozó neve
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("nev")
    .eq("id", employeeId)
    .single()
  const employeeName = profile?.nev || "Munkavállaló"

  const tipusNames: Record<string, string> = {
    elozetes: "Előzetes",
    idoszakos: "Időszakos",
    soron_kivuli: "Soron Kívüli",
    zaro: "Záró"
  }
  const tipusLabel = tipusNames[orvosi.tipus] || "Időszakos"
  const docSubject = `${employeeName} - Orvosi Alkalmassági Vélemény (${tipusLabel} - ${orvosi.vizsgalat_datuma})`

  let storagePath = orvosi.fajl_url
  let docId = orvosi.dokumentum_id

  // 3. Ha nincs feltöltött fájl, generáljuk le most a hivatalos PDF-et
  if (!storagePath) {
    const { generateMedicalPdfBuffer } = await import("@/utils/hr/medical-sheet-pdf-generator")
    const { buffer, fileName } = await generateMedicalPdfBuffer(supabase, orvosiId)

    const cleanFileName = fileName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
    storagePath = `medical/${employeeId}/${Date.now()}_${cleanFileName}`

    const { error: uploadError } = await supabase.storage
      .from("irat_files")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceRoleKey) {
        const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
        const adminClient = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
        const { error: adminUploadError } = await adminClient.storage
          .from("irat_files")
          .upload(storagePath, buffer, {
            contentType: "application/pdf",
            upsert: true,
          })
        if (adminUploadError) {
          return { success: false, error: "Storage feltöltési hiba: " + adminUploadError.message }
        }
      } else {
        return { success: false, error: "Storage feltöltési hiba: " + uploadError.message }
      }
    }
  }

  // 4. Ha még nincs hr_dokumentum bejegyzés, hozzunk létre egyet
  if (!docId) {
    const { data: newDoc, error: docError } = await supabase
      .from("hr_dokumentum")
      .insert({
        dolgozo_id: employeeId,
        nev: docSubject,
        kategoria: "Orvosi alkalmassági igazolás",
        url: storagePath
      })
      .select("id")
      .single()

    if (docError || !newDoc) {
      return { success: false, error: "Nem sikerült a dokumentum rekordot rögzíteni: " + (docError?.message || "") }
    }
    docId = newDoc.id
  }

  // 5. Iktatás végrehajtása az eaisyDocs személyi dossziéba
  const filingResult = await executeHrDocumentFiling(supabase, {
    documentId: docId,
    employeeId,
    customTargy: docSubject,
    currentUserId: user.id
  })

  if (!filingResult.success) {
    return { success: false, error: filingResult.error }
  }

  // 6. Frissítjük a hr_orvosi_vizsgalat rekordot
  await supabase
    .from("hr_orvosi_vizsgalat")
    .update({
      dokumentum_id: docId,
      fajl_url: storagePath,
      iktatoszam: filingResult.iktatoszam,
      ugyirat_id: filingResult.ugyirat_id,
      irat_id: filingResult.irat_id
    })
    .eq("id", orvosiId)

  // 7. Audit naplózás
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "adat_letrehozas",
    entitas_tipus: "hr_dokumentum",
    entitas_id: docId,
    megjegyzes: `Orvosi alkalmassági vélemény hivatalosan beiktatva a dolgozó személyi dossziéjába (${filingResult.iktatoszam}).`
  })

  revalidatePath(`/hr/employee/${employeeId}`)
  revalidatePath("/hr")
  revalidatePath("/dossiers")

  return {
    success: true,
    iktatoszam: filingResult.iktatoszam,
    ugyirat_id: filingResult.ugyirat_id,
    docId
  }
}

export async function addFegyelmi(employeeId: string, formData: FormData) {
  const supabase = await createClient()

  const tipus = formData.get("tipus") as string
  const datum = formData.get("datum") as string
  const indoklas = (formData.get("indoklas") as string)?.trim()
  const hatarozat_szam = (formData.get("hatarozat_szam") as string)?.trim()
  const kar_osszeg = formData.get("kar_osszeg") as string
  const reszletfizetes_leiras = (formData.get("reszletfizetes_leiras") as string)?.trim()
  const atvetel_datuma = formData.get("atvetel_datuma") as string
  const file = formData.get("file") as File | null

  if (!tipus || !datum || !indoklas) {
    return { error: "A típus, az esemény dátuma és az indoklás megadása kötelező!" }
  }

  const today = new Date().toISOString().split("T")[0]
  if (datum > today) {
    return { error: "Az esemény dátuma nem lehet a jövőben!" }
  }

  // Számoljuk ki a 30 napos Mt. 285. § szerinti jogorvoslati határidőt az átvétel vagy az intézkedés napjától
  const baseDateStr = atvetel_datuma || datum
  const baseDate = new Date(baseDateStr)
  baseDate.setDate(baseDate.getDate() + 30)
  const jogorvoslat_hatarido = baseDate.toISOString().split("T")[0]

  let storagePath: string | null = null
  let docId: string | null = null

  // Szkennelt / aláírt PDF dokumentum feltöltése ha mellékelve van
  if (file && file.size > 0 && typeof file.arrayBuffer === "function") {
    try {
      const arrayBuf = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuf)
      const cleanFileName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
      storagePath = `disciplinary/${employeeId}/${Date.now()}_${cleanFileName}`

      const { error: uploadError } = await supabase.storage
        .from("irat_files")
        .upload(storagePath, buffer, {
          contentType: file.type || "application/pdf",
          upsert: true,
        })

      if (uploadError) {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceRoleKey) {
          const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
          const adminClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
          )
          const { error: adminUploadError } = await adminClient.storage
            .from("irat_files")
            .upload(storagePath, buffer, {
              contentType: file.type || "application/pdf",
              upsert: true,
            })
          if (adminUploadError) {
            console.error("Storage upload hiba:", adminUploadError)
          }
        }
      }

      // HR dokumentum rekord létrehozása ha van feltöltött fájl
      const tipusLabels: Record<string, string> = {
        figyelmeztetes: "Írásbeli figyelmeztetés",
        megrovas: "Írásbeli megrovás",
        karterites: "Kártérítési felszólítás",
        kituntetes: "Kitüntetés",
        egyeb: "Munkáltatói határozat"
      }
      const label = tipusLabels[tipus] || "Fegyelmi határozat"

      const { data: newDoc } = await supabase
        .from("hr_dokumentum")
        .insert({
          dolgozo_id: employeeId,
          nev: `${label} - ${datum}`,
          kategoria: "Fegyelmi és kártérítési ügyek",
          url: storagePath
        })
        .select("id")
        .single()

      if (newDoc) {
        docId = newDoc.id
      }
    } catch (e: any) {
      console.warn("Fájlfeltöltési hiba a fegyelmi határozatnál:", e)
    }
  }

  const { error } = await supabase.from("hr_fegyelmi").insert({
    dolgozo_id: employeeId,
    tipus,
    datum,
    indoklas,
    hatarozat_szam: hatarozat_szam || null,
    kar_osszeg: kar_osszeg ? parseFloat(kar_osszeg) : null,
    reszletfizetes_leiras: reszletfizetes_leiras || null,
    atvetel_datuma: atvetel_datuma || null,
    jogorvoslat_hatarido,
    fajl_url: storagePath,
    dokumentum_url: storagePath,
    dokumentum_id: docId,
  })

  if (error) return { error: error.message }

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function deleteFegyelmi(id: string, employeeId: string) {
  const supabase = await createClient()

  // Ellenőrizzük, hogy iktatva van-e már
  const { data: existing } = await supabase
    .from("hr_fegyelmi")
    .select("iktatoszam")
    .eq("id", id)
    .single()

  if (existing?.iktatoszam) {
    return { error: `A hivatalosan beiktatott fegyelmi határozat (${existing.iktatoszam}) a levéltári szabályok szerint nem törölhető!` }
  }

  const { error } = await supabase.from("hr_fegyelmi").delete().eq("id", id).eq("dolgozo_id", employeeId)
  if (error) return { error: error.message }
  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function fileDisciplinaryAction(disciplinaryId: string, employeeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const { data: userProfile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor, docs_szerepkor")
    .eq("id", user.id)
    .single()

  const isHrOrAdmin =
    ["hr_munkatars", "hr_vezeto", "admin"].includes(userProfile?.hr_szerepkor || "") ||
    userProfile?.docs_szerepkor === "admin"

  if (!isHrOrAdmin) {
    return { success: false, error: "Nincs jogosultsága fegyelmi határozatot iktatni!" }
  }

  // 1. Rekord lekérése
  const { data: item, error: itemErr } = await supabase
    .from("hr_fegyelmi")
    .select("*")
    .eq("id", disciplinaryId)
    .single()

  if (itemErr || !item) {
    return { success: false, error: "Fegyelmi határozat nem található!" }
  }

  if (item.iktatoszam) {
    return { success: false, error: `Ez a határozat már hivatalosan iktatva van (${item.iktatoszam})!` }
  }

  // 2. Dolgozó neve
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("nev")
    .eq("id", employeeId)
    .single()
  const employeeName = profile?.nev || "Munkavállaló"

  const tipusLabels: Record<string, string> = {
    figyelmeztetes: "Írásbeli figyelmeztetés",
    megrovas: "Írásbeli megrovás",
    karterites: "Kártérítési határozat",
    kituntetes: "Kitüntetés",
    egyeb: "Munkáltatói határozat"
  }
  const label = tipusLabels[item.tipus] || "Fegyelmi határozat"
  const docSubject = `${employeeName} - ${label} (${item.datum})`

  let storagePath = item.fajl_url
  let docId = item.dokumentum_id

  // 3. Ha nincs feltöltött fájl, generáljuk le most a hivatalos PDF-et
  if (!storagePath) {
    const { generateDisciplinaryPdfBuffer } = await import("@/utils/hr/disciplinary-pdf-generator")
    const { buffer, fileName } = await generateDisciplinaryPdfBuffer(supabase, disciplinaryId)

    const cleanFileName = fileName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
    storagePath = `disciplinary/${employeeId}/${Date.now()}_${cleanFileName}`

    const { error: uploadError } = await supabase.storage
      .from("irat_files")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceRoleKey) {
        const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
        const adminClient = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
        const { error: adminUploadError } = await adminClient.storage
          .from("irat_files")
          .upload(storagePath, buffer, {
            contentType: "application/pdf",
            upsert: true,
          })
        if (adminUploadError) {
          return { success: false, error: "Storage feltöltési hiba: " + adminUploadError.message }
        }
      } else {
        return { success: false, error: "Storage feltöltési hiba: " + uploadError.message }
      }
    }
  }

  // 4. Ha még nincs hr_dokumentum bejegyzés, hozzunk létre egyet
  if (!docId) {
    const { data: newDoc, error: docError } = await supabase
      .from("hr_dokumentum")
      .insert({
        dolgozo_id: employeeId,
        nev: docSubject,
        kategoria: "Fegyelmi és kártérítési ügyek",
        url: storagePath
      })
      .select("id")
      .single()

    if (docError || !newDoc) {
      return { success: false, error: "Nem sikerült a dokumentum rekordot rögzíteni: " + (docError?.message || "") }
    }
    docId = newDoc.id
  }

  // 5. Iktatás végrehajtása az eaisyDocs személyi dossziéba (szigorúan bizalmas, 5 év)
  const filingResult = await executeHrDocumentFiling(supabase, {
    documentId: docId,
    employeeId,
    customTargy: docSubject,
    currentUserId: user.id
  })

  if (!filingResult.success) {
    return { success: false, error: filingResult.error }
  }

  // 6. Frissítjük a hr_fegyelmi rekordot
  await supabase
    .from("hr_fegyelmi")
    .update({
      dokumentum_id: docId,
      fajl_url: storagePath,
      iktatoszam: filingResult.iktatoszam,
      ugyirat_id: filingResult.ugyirat_id,
      irat_id: filingResult.irat_id
    })
    .eq("id", disciplinaryId)

  // 7. Audit naplózás
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "adat_letrehozas",
    entitas_tipus: "hr_dokumentum",
    entitas_id: docId,
    megjegyzes: `Munkáltatói fegyelmi határozat hivatalosan beiktatva a dolgozó személyi dossziéjába (${filingResult.iktatoszam}).`
  })

  revalidatePath(`/hr/employee/${employeeId}`)
  revalidatePath("/hr")
  revalidatePath("/dossiers")

  return {
    success: true,
    iktatoszam: filingResult.iktatoszam,
    ugyirat_id: filingResult.ugyirat_id,
    docId,
  }
}

// -----------------------------------------------------------------------------
// Kitüntetések és Szakmai Elismerések
// -----------------------------------------------------------------------------

export async function addKituntetes(employeeId: string, formData: FormData) {
  const supabase = await createClient()

  const megnevezes = (formData.get("megnevezes") as string)?.trim()
  const kategoria = (formData.get("kategoria") as string) || "vallalati_dij"
  const datum = formData.get("datum") as string
  const adomanyozo = (formData.get("adomanyozo") as string)?.trim()
  const indoklas = (formData.get("indoklas") as string)?.trim()
  const jutalom_osszeg = formData.get("jutalom_osszeg") as string
  const file = formData.get("file") as File | null

  if (!megnevezes || !datum || !indoklas) {
    return { error: "A megnevezés, az adományozás dátuma és a méltatás kitöltése kötelező!" }
  }

  const today = new Date().toISOString().split("T")[0]
  if (datum > today) {
    return { error: "Az adományozás dátuma nem lehet a jövőben!" }
  }

  let storagePath: string | null = null
  let docId: string | null = null

  if (file && file.size > 0 && typeof file.arrayBuffer === "function") {
    try {
      const arrayBuf = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuf)
      const cleanFileName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
      storagePath = `awards/${employeeId}/${Date.now()}_${cleanFileName}`

      const { error: uploadError } = await supabase.storage
        .from("irat_files")
        .upload(storagePath, buffer, {
          contentType: file.type || "application/pdf",
          upsert: true,
        })

      if (uploadError) {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceRoleKey) {
          const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
          const adminClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
          )
          const { error: adminUploadError } = await adminClient.storage
            .from("irat_files")
            .upload(storagePath, buffer, {
              contentType: file.type || "application/pdf",
              upsert: true,
            })
          if (adminUploadError) {
            console.error("Storage upload hiba:", adminUploadError)
          }
        }
      }

      const { data: newDoc } = await supabase
        .from("hr_dokumentum")
        .insert({
          dolgozo_id: employeeId,
          nev: `Elismerő Oklevél - ${megnevezes}`,
          kategoria: "Kitüntetések és elismerések",
          url: storagePath
        })
        .select("id")
        .single()

      if (newDoc) {
        docId = newDoc.id
      }
    } catch (e: any) {
      console.warn("Fájlfeltöltési hiba az elismerésnél:", e)
    }
  }

  const { error } = await supabase.from("hr_kituntetes").insert({
    dolgozo_id: employeeId,
    megnevezes,
    kategoria,
    datum,
    adomanyozo: adomanyozo || null,
    indoklas,
    jutalom_osszeg: jutalom_osszeg ? parseFloat(jutalom_osszeg) : null,
    fajl_url: storagePath,
    dokumentum_id: docId,
  })

  if (error) return { error: error.message }

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function deleteKituntetes(id: string, employeeId: string) {
  const supabase = await createClient()

  // Ellenőrizzük, hogy iktatva van-e már
  const { data: existing } = await supabase
    .from("hr_kituntetes")
    .select("iktatoszam")
    .eq("id", id)
    .single()

  if (existing?.iktatoszam) {
    return { error: `A hivatalosan beiktatott elismerés (${existing.iktatoszam}) a levéltári szabályzat szerint nem törölhető!` }
  }

  const { error } = await supabase.from("hr_kituntetes").delete().eq("id", id).eq("dolgozo_id", employeeId)
  if (error) return { error: error.message }
  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function fileKituntetesAction(awardId: string, employeeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const { data: userProfile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor, docs_szerepkor")
    .eq("id", user.id)
    .single()

  const isHrOrAdmin =
    ["hr_munkatars", "hr_vezeto", "admin"].includes(userProfile?.hr_szerepkor || "") ||
    userProfile?.docs_szerepkor === "admin"

  if (!isHrOrAdmin) {
    return { success: false, error: "Nincs jogosultsága elismerést iktatni!" }
  }

  // 1. Rekord lekérése
  const { data: item, error: itemErr } = await supabase
    .from("hr_kituntetes")
    .select("*")
    .eq("id", awardId)
    .single()

  if (itemErr || !item) {
    return { success: false, error: "Elismerés rekord nem található!" }
  }

  if (item.iktatoszam) {
    return { success: false, error: `Ez az elismerés már hivatalosan iktatva van (${item.iktatoszam})!` }
  }

  // 2. Dolgozó neve
  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("nev")
    .eq("id", employeeId)
    .single()
  const employeeName = profile?.nev || "Munkavállaló"
  const docSubject = `${employeeName} - Elismerő Oklevél (${item.megnevezes})`

  let storagePath = item.fajl_url
  let docId = item.dokumentum_id

  // 3. Ha nincs feltöltött fájl, generáljuk le az oklevelet
  if (!storagePath) {
    const { generateAwardCertificatePdfBuffer } = await import("@/utils/hr/award-certificate-pdf-generator")
    const { buffer, fileName } = await generateAwardCertificatePdfBuffer(supabase, awardId)

    const cleanFileName = fileName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
    storagePath = `awards/${employeeId}/${Date.now()}_${cleanFileName}`

    const { error: uploadError } = await supabase.storage
      .from("irat_files")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceRoleKey) {
        const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
        const adminClient = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
        const { error: adminUploadError } = await adminClient.storage
          .from("irat_files")
          .upload(storagePath, buffer, {
            contentType: "application/pdf",
            upsert: true,
          })
        if (adminUploadError) {
          return { success: false, error: "Storage feltöltési hiba: " + adminUploadError.message }
        }
      } else {
        return { success: false, error: "Storage feltöltési hiba: " + uploadError.message }
      }
    }
  }

  // 4. Ha még nincs hr_dokumentum bejegyzés, hozzunk létre egyet
  if (!docId) {
    const { data: newDoc, error: docError } = await supabase
      .from("hr_dokumentum")
      .insert({
        dolgozo_id: employeeId,
        nev: docSubject,
        kategoria: "Kitüntetések és elismerések",
        url: storagePath
      })
      .select("id")
      .single()

    if (docError || !newDoc) {
      return { success: false, error: "Nem sikerült a dokumentum rekordot rögzíteni: " + (docError?.message || "") }
    }
    docId = newDoc.id
  }

  // 5. Iktatás az eaisyDocs személyi dossziéba (3.1 - HR iratok, 50 év)
  const filingResult = await executeHrDocumentFiling(supabase, {
    documentId: docId,
    employeeId,
    customTargy: docSubject,
    currentUserId: user.id
  })

  if (!filingResult.success) {
    return { success: false, error: filingResult.error }
  }

  // 6. Frissítjük a hr_kituntetes rekordot
  await supabase
    .from("hr_kituntetes")
    .update({
      dokumentum_id: docId,
      fajl_url: storagePath,
      iktatoszam: filingResult.iktatoszam,
      ugyirat_id: filingResult.ugyirat_id,
      irat_id: filingResult.irat_id
    })
    .eq("id", awardId)

  // 7. Audit naplózás
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "adat_letrehozas",
    entitas_tipus: "hr_dokumentum",
    entitas_id: docId,
    megjegyzes: `Szakmai elismerés (oklevél) hivatalosan beiktatva a dolgozó személyi dossziéjába (${filingResult.iktatoszam}).`
  })

  revalidatePath(`/hr/employee/${employeeId}`)
  revalidatePath("/hr")
  revalidatePath("/dossiers")

  return {
    success: true,
    iktatoszam: filingResult.iktatoszam,
    ugyirat_id: filingResult.ugyirat_id,
    docId,
  }
}

export async function revealEmployeeSecretData(employeeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data, error } = await supabase.rpc("get_decrypted_hr_data", {
    p_dolgozo_id: employeeId
  })

  if (error) {
    console.error("RPC error:", error)
    return { error: "Hozzáférés megtagadva vagy nincs rögzített adat." }
  }

  // 15 másodperces időablak a duplikált naplózás megelőzésére (pl. dupla kattintás vagy gyors ki-be kapcsolás)
  const fifteenSecondsAgo = new Date(Date.now() - 15000).toISOString()
  const { data: recentLog } = await supabase
    .from("hr_esemeny_naplo")
    .select("id")
    .eq("felhasznalo_id", user.id)
    .eq("entitas_tipus", "hr_dolgozo_titkos_adat")
    .eq("entitas_id", employeeId)
    .in("esemeny_tipus", ["megtekintes", "adat_megtekintes", "irat_megtekintes"])
    .gte("created_at", fifteenSecondsAgo)
    .limit(1)
    .maybeSingle()

  if (!recentLog) {
    await supabase.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      esemeny_tipus: "adat_megtekintes",
      entitas_tipus: "hr_dolgozo_titkos_adat",
      entitas_id: employeeId,
      megjegyzes: "Szigorúan bizalmas dolgozói adatok (TAJ, Adó, Bér) feloldása és megtekintése"
    })
  }

  return { data: data as { taj_szam?: string; adoazonosito?: string; bankszamla?: string; brutto_ber?: string; netto_ber?: string } }
}

export async function updateEmployeeSecretData(employeeId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const taj_szam     = formData.get("taj_szam")     as string | null
  const adoazonosito = formData.get("adoazonosito") as string | null
  const bankszamla   = formData.get("bankszamla")   as string | null
  const brutto_ber   = formData.get("brutto_ber")   as string | null
  const netto_ber    = formData.get("netto_ber")    as string | null

  const { error } = await supabase.rpc("update_decrypted_hr_data", {
    p_dolgozo_id:   employeeId,
    p_taj_szam:     taj_szam     ?? "",
    p_adoazonosito: adoazonosito ?? "",
    p_bankszamla:   bankszamla   ?? "",
    p_brutto_ber:   brutto_ber   ?? "",
    p_netto_ber:    netto_ber    ?? "",
  })

  if (error) {
    console.error("Update RPC error:", error)
    return { error: `Hiba: ${error.message}` }
  }

  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "modositas",
    entitas_tipus: "hr_dolgozo_titkos_adat",
    entitas_id: employeeId,
    megjegyzes: "Szigorúan bizalmas dolgozói adatok (TAJ, Adó, Bér) módosítása"
  })

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function updateGeneralPersonalInfo(employeeId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const szuletesi_datum = formData.get("szuletesi_datum") as string
  const anyja_neve = formData.get("anyja_neve") as string
  const lakcim = formData.get("lakcim") as string
  const telefonszam = formData.get("telefonszam") as string
  const gyermekek_szama = formData.get("gyermekek_szama") as string
  const megvaltozott_munkakepessegu = formData.get("megvaltozott_munkakepessegu") === "on"

  // 1. Régi adatok lekérése a naplózáshoz
  const { data: oldData } = await supabase
    .from("hr_dolgozo_adatlap")
    .select("szuletesi_datum, anyja_neve, lakcim, telefonszam, gyermekek_szama, megvaltozott_munkakepessegu")
    .eq("id", employeeId)
    .single()

  const uj_adatok = {
    szuletesi_datum: szuletesi_datum || null,
    anyja_neve: anyja_neve || null,
    lakcim: lakcim || null,
    telefonszam: telefonszam || null,
    gyermekek_szama: parseInt(gyermekek_szama) || 0,
    megvaltozott_munkakepessegu: megvaltozott_munkakepessegu
  }

  // 2. Frissítés
  const { error } = await supabase
    .from("hr_dolgozo_adatlap")
    .update(uj_adatok)
    .eq("id", employeeId)

  if (error) {
    return { error: error.message }
  }

  // 3. Esemény naplózása
  if (oldData) {
    await supabase.from("hr_esemeny_naplo").insert({
      entitas_tipus: "hr_dolgozo_adatlap",
      entitas_id: employeeId,
      esemeny_tipus: "modositas",
      felhasznalo_id: user.id,
      regi_adat: oldData,
      uj_adat: uj_adatok,
      megjegyzes: "Alapadatok szerkesztése a HR felületről"
    })
  }

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function updateJogviszonyData(employeeId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const ervenyes_tol = formData.get("ervenyes_tol") as string
  const belepes_datuma = formData.get("belepes_datuma") as string
  const munkaviszony_tipusa = formData.get("munkaviszony_tipusa") as string
  const munkaido_fte = formData.get("munkaido_fte") as string
  const munkarend = formData.get("munkarend") as string
  const berkategoria = formData.get("berkategoria") as string
  let munkakor_id = formData.get("munkakor_id") as string | null

  if (!ervenyes_tol) {
    return { error: "Az érvényesség kezdete (Érvényes-től) mező megadása kötelező!" }
  }

  // Jelenlegi munkakör lekérése, ha nem küldtek újat
  if (!munkakor_id) {
    const { data: currProfile } = await supabase
      .from("hr_dolgozo_adatlap")
      .select(`hr_jogviszony ( hr_beosztas ( munkakor_id ) )`)
      .eq("id", employeeId)
      .single()

    const jogviszonyok = (currProfile as any)?.hr_jogviszony
    if (jogviszonyok && jogviszonyok.length > 0) {
      const beosztasok = jogviszonyok[0].hr_beosztas
      if (beosztasok && beosztasok.length > 0) {
        munkakor_id = beosztasok[0].munkakor_id
      }
    }
  }

  const { error } = await supabase.rpc('update_hr_beosztas_history', {
    p_dolgozo_id: employeeId,
    p_ervenyes_tol: ervenyes_tol,
    p_munkakor_id: munkakor_id,
    p_munkaviszony_tipusa: munkaviszony_tipusa || null,
    p_munkaido_fte: munkaido_fte ? parseFloat(munkaido_fte) : null,
    p_munkarend: munkarend || null,
    p_berkategoria: berkategoria || null,
    p_kozvetlen_vezeto: null,
    p_belepes_datuma: belepes_datuma || null,
    p_probaido_vege: formData.get("probaido_vege") as string || null
  })

  if (error) {
    return { error: error.message }
  }

  // UPDATE hr_dolgozo_adatlap
  const szerzodes_tipusa = formData.get("szerzodes_tipusa") as string
  let munkaviszony_vege = formData.get("munkaviszony_vege") as string | null
  
  if (szerzodes_tipusa === "határozatlan") {
    munkaviszony_vege = null
  }

  await supabase.from("hr_dolgozo_adatlap")
    .update({ 
      szerzodes_tipusa: szerzodes_tipusa || "határozatlan",
      munkaviszony_vege: munkaviszony_vege || null
    })
    .eq("id", employeeId)

  // Update active hr_jogviszony kilepes_datuma
  const { data: jogviszonyData } = await supabase
    .from("hr_jogviszony")
    .select("id")
    .eq("dolgozo_id", employeeId)
    .order("belepes_datuma", { ascending: false })
    .limit(1)
    
  if (jogviszonyData && jogviszonyData.length > 0) {
    await supabase.from("hr_jogviszony")
      .update({ kilepes_datuma: munkaviszony_vege || null })
      .eq("id", jogviszonyData[0].id)
  }

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function uploadHrDocument(employeeId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const file = formData.get("file") as File
  const nev = formData.get("nev") as string
  const kategoria = formData.get("kategoria") as string

  if (!file || file.size === 0) {
    return { error: "Nem választottál ki fájlt a feltöltéshez!" }
  }

  if (!nev) {
    return { error: "A dokumentum neve kötelező!" }
  }

  const timestamp = Date.now()
  const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")
  const filePath = `hr/${employeeId}/${timestamp}_${safeFilename}`

  // Fájl feltöltése a Supabase Storage-ba
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("irat_files")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false
    })

  if (uploadError) {
    console.error("Storage upload error:", uploadError)
    return { error: "Hiba történt a fájl feltöltése során: " + uploadError.message }
  }

  // Rekord létrehozása a hr_dokumentum táblában
  const { error: insertError } = await supabase
    .from("hr_dokumentum")
    .insert([
      {
        dolgozo_id: employeeId,
        nev: nev,
        kategoria: kategoria || "Egyéb",
        url: filePath
      }
    ])

  if (insertError) {
    console.error("DB insert error:", insertError)
    // Ha az adatbázis mentés sikertelen, megpróbáljuk törölni a feltöltött fájlt
    await supabase.storage.from("irat_files").remove([filePath])
    return { error: "Hiba történt a dokumentum mentése során: " + insertError.message }
  }

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function hrSubmitLeaveRequest(employeeId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const type = formData.get("type") as string
  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string
  
  if (!type || !startDate || !endDate) {
    return { error: "Minden kötelező mezőt ki kell tölteni!" }
  }

  if (startDate > endDate) {
    return { error: "A kezdet dátuma nem lehet később, mint a vég dátuma!" }
  }

  const { error } = await supabase
    .from("hr_tavollet")
    .insert({
      dolgozo_id: employeeId,
      tipus: type,
      kezdet_datuma: startDate,
      veg_datuma: endDate,
      statusz: "jovahagyva", // HR automatikusan jóváhagyottan hozza létre
      jovahagyo_id: user.id
    })

  if (error) {
    console.error("HR submit leave error:", error)
    return { error: "Hiba történt a távollét rögzítésekor." }
  }

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

export async function getEmployeeAuditLogs(employeeId: string) {
  const supabase = await createClient()

  // 1. Dolgozóhoz kapcsolódó dokumentumok azonosítóinak lekérése
  const { data: employeeDocs } = await supabase
    .from("hr_dokumentum")
    .select("id")
    .eq("dolgozo_id", employeeId)

  const docIds = (employeeDocs || []).map(d => d.id).filter(Boolean)

  // 2. Audit napló lekérdezése (a dolgozó közvetlen rekordjai + hozzá tartozó iratok)
  let query = supabase
    .from("hr_esemeny_naplo")
    .select(`
      id,
      created_at,
      entitas_tipus,
      esemeny_tipus,
      felhasznalo_id,
      entitas_id,
      regi_adat,
      uj_adat,
      megjegyzes,
      felhasznalo_profil(nev)
    `)
    .order("created_at", { ascending: false })

  if (docIds.length > 0) {
    query = query.or(`entitas_id.eq.${employeeId},entitas_id.in.(${docIds.join(",")})`)
  } else {
    query = query.eq("entitas_id", employeeId)
  }

  const { data: logs, error } = await query

  if (error) {
    console.error("Error fetching audit logs:", error)
    return { data: [], error: error.message }
  }

  // Format the returned data to include user name directly
  const formattedLogs = (logs || []).map(log => ({
    ...log,
    user_nev: (log.felhasznalo_profil as any)?.nev || "Rendszer"
  }))

  return { data: formattedLogs, error: null }
}

// -----------------------------------------------------------------------------
// eaisyHR ↔ eaisyDocs Iratkezelési Híd (Munkavállalói Személyi Dosszié & Iktatás)
// -----------------------------------------------------------------------------

export async function getEmployeeDossierInfo(employeeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const existing = await findEmployeeDossier(supabase, employeeId)
  if (existing) {
    const { count } = await supabase
      .from("irat")
      .select("id", { count: "exact", head: true })
      .eq("ugyirat_id", existing.id)

    return {
      hasDossier: true,
      dossierId: existing.id,
      iktatoszam: existing.iktatoszam,
      statusz: existing.statusz,
      iratCount: count || 0,
    }
  }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("nev")
    .eq("id", employeeId)
    .single()

  return {
    hasDossier: false,
    dossierId: null,
    iktatoszam: null,
    proposedSubject: formatDossierSubject(profile?.nev || ""),
    iratCount: 0,
  }
}

export async function fileHrDocumentAction(
  documentId: string,
  employeeId: string,
  customTargy?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  const { data: userProfile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor, docs_szerepkor")
    .eq("id", user.id)
    .single()

  const isHrOrAdmin =
    ["hr_munkatars", "hr_vezeto", "admin"].includes(userProfile?.hr_szerepkor || "") ||
    userProfile?.docs_szerepkor === "admin"

  if (!isHrOrAdmin) {
    return { error: "Nincs jogosultságod HR dokumentumot iktatni az eaisyDocs rendszerbe!" }
  }

  let clientInfo = undefined
  try {
    const { ip, userAgent } = await getClientInfo()
    clientInfo = { ip, userAgent }
  } catch (err) {
    // kliens infó opcionális
  }

  const result = await executeHrDocumentFiling(supabase, {
    documentId,
    employeeId,
    customTargy,
    currentUserId: user.id,
    clientInfo,
  })

  if (!result.success) {
    return { error: result.error }
  }

  revalidatePath(`/hr/employee/${employeeId}`)
  revalidatePath("/dossiers")
  if (result.ugyirat_id) {
    revalidatePath(`/dossiers/${result.ugyirat_id}`)
  }

  return {
    success: true,
    iktatoszam: result.iktatoszam,
    ugyirat_id: result.ugyirat_id,
    irat_id: result.irat_id,
    alszam: result.alszam,
    isNewDossier: result.isNewDossier,
  }
}

export async function fileAllHrDocumentsAction(employeeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve", filedCount: 0 }

  const { data: userProfile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor, docs_szerepkor")
    .eq("id", user.id)
    .single()

  const isHrOrAdmin =
    ["hr_munkatars", "hr_vezeto", "admin"].includes(userProfile?.hr_szerepkor || "") ||
    userProfile?.docs_szerepkor === "admin"

  if (!isHrOrAdmin) {
    return { error: "Nincs jogosultságod HR dokumentumokat kötegelten iktatni az eaisyDocs rendszerbe!", filedCount: 0 }
  }

  let clientInfo = undefined
  try {
    const { ip, userAgent } = await getClientInfo()
    clientInfo = { ip, userAgent }
  } catch (err) {
    // kliens infó opcionális
  }

  const result = await executeBatchHrDocumentsFiling(supabase, {
    employeeId,
    currentUserId: user.id,
    clientInfo,
  })

  if (!result.success) {
    return { error: result.error, filedCount: 0 }
  }

  revalidatePath(`/hr/employee/${employeeId}`)
  revalidatePath("/dossiers")
  if (result.ugyirat_id) {
    revalidatePath(`/dossiers/${result.ugyirat_id}`)
  }

  return {
    success: true,
    filedCount: result.filedCount,
    iktatoszam: result.iktatoszam,
    ugyirat_id: result.ugyirat_id,
    isNewDossier: result.isNewDossier,
    items: result.items,
  }
}

export async function getAnnualLeaveDocument(employeeId: string, year: number) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("hr_dokumentum")
    .select("id, nev, iktatoszam, created_at, url")
    .eq("dolgozo_id", employeeId)
    .eq("kategoria", "Éves szabadság nyilvántartás")
    .ilike("nev", `%${year}%`)
    .maybeSingle()

  if (!data) return null

  let dossierId: string | null = null
  if (data.iktatoszam) {
    const { data: irat } = await supabase
      .from("irat")
      .select("ugyirat_id")
      .eq("iktatoszam", data.iktatoszam)
      .maybeSingle()
    dossierId = irat?.ugyirat_id || null
  }

  return {
    ...data,
    dossierId,
  }
}

export async function fileAnnualLeaveSheet(employeeId: string, year: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const { data: userProfile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor, docs_szerepkor")
    .eq("id", user.id)
    .single()

  const isHrOrAdmin =
    ["hr_munkatars", "hr_vezeto", "admin"].includes(userProfile?.hr_szerepkor || "") ||
    userProfile?.docs_szerepkor === "admin"

  if (!isHrOrAdmin) {
    return { success: false, error: "Nincs jogosultsága éves szabadság-nyilvántartást iktatni!" }
  }

  try {
    // 1. PDF generálás
    const { buffer, employeeName } = await generateAnnualLeavePdfBuffer(supabase, employeeId, year)

    // 2. Storage feltöltés
    const fileName = `eves_szabadsag_nyilvantartas_${year}_${Date.now()}.pdf`
    const storagePath = `annual_leaves/${employeeId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from("irat_files")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceRoleKey) {
        const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
        const supabaseAdmin = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
        const { error: adminUploadError } = await supabaseAdmin.storage
          .from("irat_files")
          .upload(storagePath, buffer, {
            contentType: "application/pdf",
            upsert: true,
          })
        if (adminUploadError) {
          throw new Error("Storage feltöltési hiba: " + adminUploadError.message)
        }
      } else {
        throw new Error("Storage feltöltési hiba: " + uploadError.message)
      }
    }

    // 3. Dokumentum rekord létrehozása / keresése
    const docName = `${employeeName} - Éves Szabadság Nyilvántartás (${year})`
    const { data: existingDoc } = await supabase
      .from("hr_dokumentum")
      .select("id, iktatoszam")
      .eq("dolgozo_id", employeeId)
      .eq("kategoria", "Éves szabadság nyilvántartás")
      .ilike("nev", `%${year}%`)
      .maybeSingle()

    let docId = existingDoc?.id

    if (!docId) {
      const { data: newDoc, error: insertError } = await supabase
        .from("hr_dokumentum")
        .insert({
          dolgozo_id: employeeId,
          nev: docName,
          kategoria: "Éves szabadság nyilvántartás",
          url: storagePath
        })
        .select("id")
        .single()

      if (insertError) throw new Error("Dokumentum mentési hiba: " + insertError.message)
      docId = newDoc.id
    }

    // 4. Hivatalos iktatás végrehajtása az eaisyDocs személyi dossziéba
    const filingResult = await executeHrDocumentFiling(supabase, {
      documentId: docId,
      employeeId,
      customTargy: docName,
      currentUserId: user.id
    })

    if (!filingResult.success) {
      return { success: false, error: filingResult.error }
    }

    // 5. Naplózás
    await supabase.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      esemeny_tipus: "adat_letrehozas",
      entitas_tipus: "hr_dokumentum",
      entitas_id: docId,
      megjegyzes: `Éves szabadság- és távollét nyilvántartás (${year}) hivatalosan beiktatva a dolgozó személyi dossziéjába (${filingResult.iktatoszam}).`
    })

    revalidatePath(`/hr/employee/${employeeId}`)
    revalidatePath("/hr")
    revalidatePath("/dossiers")

    return {
      success: true,
      iktatoszam: filingResult.iktatoszam,
      ugyirat_id: filingResult.ugyirat_id,
      docId,
    }
  } catch (error: any) {
    console.error("Hiba az éves szabadság-nyilvántartás iktatása során:", error)
    return { success: false, error: error.message || "Váratlan hiba történt az iktatás során." }
  }
}

export async function uploadSignedDocumentAction(
  documentId: string,
  employeeId: string,
  formData: FormData
) {
  const supabase = await createClient()

  // 1. Jogosultság ellenőrzése
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve!" }

  const { data: userProfile } = await supabase
    .from("felhasznalo_profil")
    .select("nev, hr_szerepkor, docs_szerepkor")
    .eq("id", user.id)
    .single()

  const isHrOrAdmin =
    ["hr_munkatars", "hr_vezeto", "admin"].includes(userProfile?.hr_szerepkor || "") ||
    userProfile?.docs_szerepkor === "admin"

  if (!isHrOrAdmin) {
    return { success: false, error: "Nincs jogosultsága aláírt példányt feltölteni!" }
  }

  // 2. Fájl kinyerése
  const file = formData.get("file") as File
  if (!file || file.size === 0 || typeof file.arrayBuffer !== "function") {
    return { success: false, error: "Nem választott ki feltöltendő fájlt!" }
  }

  // 3. Fájl feldolgozása
  try {
    const arrayBuf = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)
    const cleanFileName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
    const storagePath = `signed_documents/${employeeId}/${Date.now()}_${cleanFileName}`

    // Feltöltés a Supabase Storage irat_files vödörbe
    const { error: uploadError } = await supabase.storage
      .from("irat_files")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (serviceRoleKey) {
        const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
        const adminClient = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          serviceRoleKey
        )
        const { error: adminUploadError } = await adminClient.storage
          .from("irat_files")
          .upload(storagePath, buffer, {
            contentType: file.type || "application/pdf",
            upsert: true,
          })
        if (adminUploadError) {
          return { success: false, error: "Fájl feltöltési hiba: " + adminUploadError.message }
        }
      } else {
        return { success: false, error: "Fájl feltöltési hiba: " + uploadError.message }
      }
    }

    // 4. Lekérjük a dokumentum adatait
    const { data: doc, error: docErr } = await supabase
      .from("hr_dokumentum")
      .select("*")
      .eq("id", documentId)
      .single()

    if (docErr || !doc) {
      return { success: false, error: "Dokumentum nem található!" }
    }

    const crypto = await import("crypto")
    const fileSha256 = crypto.createHash("sha256").update(buffer).digest("hex")

    // 5. Ha a dokumentum már be van iktatva az eaisyDocs-ba (irat_id létezik):
    if (doc.irat_id) {
      // Megkeressük a legmagasabb verziószámot
      const { data: maxVerzioItem } = await supabase
        .from("irat_fajl")
        .select("verzio")
        .eq("irat_id", doc.irat_id)
        .order("verzio", { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextVerzio = (maxVerzioItem?.verzio || 1) + 1

      // Új verzióként beszúrjuk az irat_fajl táblába
      await supabase.from("irat_fajl").insert({
        irat_id: doc.irat_id,
        storage_path: storagePath,
        eredeti_fajlnev: `[ALÁÍRT] ${file.name}`,
        mime_type: file.type || "application/pdf",
        meret_byte: buffer.length,
        sha256: fileSha256,
        verzio: nextVerzio,
      })

      // Audit naplózás az eaisyDocs esemeny_naplo táblába
      try {
        await supabase.from("esemeny_naplo").insert({
          felhasznalo_id: user.id,
          esemeny_tipus: "irat_modositas",
          entitas_tipus: "irat",
          entitas_id: doc.irat_id,
          reszletek: {
            muvelet: "alairt_peldany_csatolasa",
            iktatoszam: doc.iktatoszam,
            verzio: nextVerzio,
            fajlnev: file.name,
            tarolasi_ut: storagePath,
          }
        })
      } catch (e) {
        console.warn("Audit naplózási figyelmeztetés:", e)
      }
    }

    // 6. Frissítjük a hr_dokumentum rekordot
    const nowIso = new Date().toISOString()
    const { error: updateDocErr } = await supabase
      .from("hr_dokumentum")
      .update({
        alairt_fajl_url: storagePath,
        alairva_ekor: nowIso,
        alairas_statusz: "alairva",
        alairo_neve: userProfile?.nev || "HR Munkatárs"
      })
      .eq("id", documentId)

    if (updateDocErr) {
      return { success: false, error: "Hiba a dokumentum státuszának frissítésekor: " + updateDocErr.message }
    }

    // 7. Szinkronizáljuk a kapcsolódó domain rekordokat ha vannak (tanulmányi, fegyelmi, elismerés, orvosi)
    await Promise.all([
      supabase.from("hr_tanulmanyi_szerzodes").update({ fajl_url: storagePath }).eq("dokumentum_id", documentId),
      supabase.from("hr_fegyelmi").update({ fajl_url: storagePath }).eq("dokumentum_id", documentId),
      supabase.from("hr_kituntetes").update({ fajl_url: storagePath }).eq("dokumentum_id", documentId),
      supabase.from("hr_orvosi_vizsgalat").update({ fajl_url: storagePath }).eq("dokumentum_id", documentId),
    ])

    // 8. HR eseménynapló bejegyzés
    await supabase.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      esemeny_tipus: "adat_modositas",
      entitas_tipus: "hr_dokumentum",
      entitas_id: documentId,
      megjegyzes: `Aláírt példány csatolva a(z) "${doc.nev}" irathoz (${doc.iktatoszam || "nem iktatott"}).`
    })

    revalidatePath(`/hr/employee/${employeeId}`)
    revalidatePath("/hr")
    revalidatePath("/dossiers")

    return { 
      success: true, 
      storagePath, 
      alairva_ekor: nowIso,
      iktatoszam: doc.iktatoszam
    }
  } catch (error: any) {
    console.error("Hiba az aláírt példány feltöltése során:", error)
    return { success: false, error: error.message || "Váratlan hiba történt a feltöltés során." }
  }
}


