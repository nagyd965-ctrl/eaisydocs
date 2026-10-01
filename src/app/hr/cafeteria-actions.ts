"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

// 1. Get the catalog
export async function getCafeteriaCatalog() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("hr_cafeteria_katalogus")
    .select("*")
    .eq("aktiv", true)
    .order("nev")
    
  if (error) {
    console.error("Error fetching catalog:", error)
    return { data: [], error: error.message }
  }
  return { data, error: null }
}

// 2. Submit declaration
export async function submitCafeteriaDeclaration(
  employeeId: string, 
  year: number, 
  choices: { katalogus_elem_id: string, kert_osszeg: number, levont_keret_osszeg: number }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  // Check if they already closed it
  const { data: keretData } = await supabase
    .from("hr_cafeteria_keret")
    .select("nyilatkozat_lezarva")
    .eq("dolgozo_id", employeeId)
    .eq("ev", year)
    .single()

  if (keretData?.nyilatkozat_lezarva) {
    return { error: "A nyilatkozat már le van zárva, nem módosítható!" }
  }

  // Delete previous choices for this year
  await supabase
    .from("hr_cafeteria_valasztas")
    .delete()
    .eq("dolgozo_id", employeeId)
    .eq("ev", year)

  // Insert new choices
  if (choices.length > 0) {
    const records = choices.map(c => ({
      dolgozo_id: employeeId,
      ev: year,
      katalogus_elem_id: c.katalogus_elem_id,
      kert_osszeg: c.kert_osszeg,
      levont_keret_osszeg: c.levont_keret_osszeg
    }))

    const { error: insertError } = await supabase
      .from("hr_cafeteria_valasztas")
      .insert(records)

    if (insertError) {
      console.error("Error saving choices:", insertError)
      return { error: "Hiba történt a mentés során." }
    }
  }

  // Close the declaration and record timestamp
  const { error: updateError } = await supabase
    .from("hr_cafeteria_keret")
    .update({ 
      nyilatkozat_lezarva: true,
      lezaras_datuma: new Date().toISOString()
    })
    .eq("dolgozo_id", employeeId)
    .eq("ev", year)

  if (updateError) {
    console.error("Error closing declaration:", updateError)
    return { error: "Hiba történt a nyilatkozat lezárása során." }
  }

  // Audit naplózás
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "adat_letrehozas",
    entitas_tipus: "hr_cafeteria_keret",
    megjegyzes: `Cafeteria nyilatkozat (${year}) sikeresen leadva és lezárva a dolgozó által.`
  })

  revalidatePath("/hr/self-service")
  revalidatePath("/hr/self-service/benefits")
  revalidatePath(`/hr/employee/${employeeId}`)
  
  return { success: true }
}

// 3. For HR: Set budget
export async function setCafeteriaBudget(employeeId: string, year: number, amount: number) {
  const supabase = await createClient()
  
  // Upsert the budget
  const { error } = await supabase
    .from("hr_cafeteria_keret")
    .upsert({
      dolgozo_id: employeeId,
      ev: year,
      osszeg: amount,
      nyilatkozat_lezarva: false // Re-open if they change the budget
    }, { onConflict: 'dolgozo_id, ev' })

  if (error) {
    console.error("Error setting budget:", error)
    return { error: "Hiba történt a keret beállítása során." }
  }

  revalidatePath(`/hr/employee/${employeeId}`)
  revalidatePath("/hr/self-service/benefits")
  return { success: true }
}

// 4. Reopen declaration (mid-year modification)
export async function reopenCafeteriaDeclaration(employeeId: string, year: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve" }

  // Ellenőrizzük a korábbi iktatási állapotot
  const { data: keret } = await supabase
    .from("hr_cafeteria_keret")
    .select("iktatoszam, dokumentum_id")
    .eq("dolgozo_id", employeeId)
    .eq("ev", year)
    .maybeSingle()
  
  const { error } = await supabase
    .from("hr_cafeteria_keret")
    .update({ 
      nyilatkozat_lezarva: false,
      iktatoszam: null,
      fajl_url: null,
      dokumentum_id: null,
      ugyirat_id: null,
      irat_id: null
    })
    .eq("dolgozo_id", employeeId)
    .eq("ev", year)

  if (error) {
    console.error("Error reopening declaration:", error)
    return { error: "Hiba történt az újranyitás során." }
  }

  // Audit naplózás a levéltári előzményről
  if (keret?.iktatoszam) {
    await supabase.from("hr_esemeny_naplo").insert({
      felhasznalo_id: user.id,
      esemeny_tipus: "adat_modositas",
      entitas_tipus: "hr_cafeteria_keret",
      megjegyzes: `Cafeteria nyilatkozat (${year}) újranyitva év közbeni módosításra. Korábbi iktatott iratszám a személyi dossziéban: ${keret.iktatoszam}.`
    })
  }

  revalidatePath(`/hr/employee/${employeeId}`)
  revalidatePath("/hr/self-service/benefits")
  return { success: true }
}

// 5. Iktatás az eaisyDocs személyi dossziéba
export async function fileCafeteriaDeclarationAction(employeeId: string, year: number) {
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
    return { success: false, error: "Nincs jogosultsága cafeteria nyilatkozatot iktatni!" }
  }

  // 1. Keret ellenőrzése
  const { data: keret, error: keretErr } = await supabase
    .from("hr_cafeteria_keret")
    .select("*")
    .eq("dolgozo_id", employeeId)
    .eq("ev", year)
    .maybeSingle()

  if (keretErr || !keret) {
    return { success: false, error: "A megadott évhez nem található cafeteria keret!" }
  }

  if (!keret.nyilatkozat_lezarva) {
    return { success: false, error: "A nyilatkozat még nincs véglegesítve és lezárva!" }
  }

  if (keret.iktatoszam) {
    return { success: false, error: `Ez a cafeteria nyilatkozat már hivatalosan iktatva van (${keret.iktatoszam})!` }
  }

  // 2. Dolgozó neve
  const { data: empProfile } = await supabase
    .from("felhasznalo_profil")
    .select("nev")
    .eq("id", employeeId)
    .single()
  const employeeName = empProfile?.nev || "Munkavállaló"
  const docSubject = `${employeeName} - Cafeteria Nyilatkozat (${year})`

  // 3. Generáljuk le a PDF buffert
  const { generateCafeteriaPdfBuffer } = await import("@/utils/hr/cafeteria-pdf-generator")
  const { buffer, fileName } = await generateCafeteriaPdfBuffer(supabase, employeeId, year)

  const cleanFileName = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
  const storagePath = `cafeteria/${employeeId}/${Date.now()}_${cleanFileName}`

  let { error: uploadError } = await supabase.storage
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

  // 4. Létrehozzuk a hr_dokumentum bejegyzést
  const { data: newDoc, error: docError } = await supabase
    .from("hr_dokumentum")
    .insert({
      dolgozo_id: employeeId,
      nev: docSubject,
      kategoria: "Cafeteria / Béren kívüli juttatások",
      url: storagePath
    })
    .select("id")
    .single()

  if (docError || !newDoc) {
    return { success: false, error: "Nem sikerült a dokumentum rekordot rögzíteni: " + (docError?.message || "") }
  }
  const docId = newDoc.id

  // 5. Iktatás az eaisyDocs személyi dossziéba
  const { executeHrDocumentFiling } = await import("@/utils/hr-filing-bridge")
  const filingResult = await executeHrDocumentFiling(supabase, {
    documentId: docId,
    employeeId,
    customTargy: docSubject,
    currentUserId: user.id
  })

  if (!filingResult.success) {
    return { success: false, error: filingResult.error }
  }

  // 6. Frissítjük a hr_cafeteria_keret rekordot
  await supabase
    .from("hr_cafeteria_keret")
    .update({
      dokumentum_id: docId,
      fajl_url: storagePath,
      iktatoszam: filingResult.iktatoszam,
      ugyirat_id: filingResult.ugyirat_id,
      irat_id: filingResult.irat_id,
      lezaras_datuma: new Date().toISOString()
    })
    .eq("dolgozo_id", employeeId)
    .eq("ev", year)

  // 7. Audit naplózás
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "adat_letrehozas",
    entitas_tipus: "hr_dokumentum",
    entitas_id: docId,
    megjegyzes: `Cafeteria nyilatkozat (${year}) hivatalosan beiktatva a dolgozó személyi dossziéjába (${filingResult.iktatoszam}).`
  })

  revalidatePath(`/hr/employee/${employeeId}`)
  revalidatePath("/hr/self-service/benefits")
  revalidatePath("/hr")
  revalidatePath("/dossiers")

  return {
    success: true,
    iktatoszam: filingResult.iktatoszam,
    ugyirat_id: filingResult.ugyirat_id
  }
}

// 6. Get export data for Excel
export async function getCafeteriaExportData(year: number) {
  const supabase = await createClient()
  
  // We need to fetch employees and their choices
  const { data: employees, error: empError } = await supabase
    .from("felhasznalo_profil")
    .select("id, nev")

  if (empError) throw empError

  const { data: choices, error: choicesError } = await supabase
    .from("hr_cafeteria_valasztas")
    .select(`
      dolgozo_id,
      kert_osszeg,
      hr_cafeteria_katalogus(nev, kategoria)
    `)
    .eq("ev", year)

  if (choicesError) throw choicesError

  // Aggregate by employee
  const exportData = employees.map(emp => {
    const empChoices = choices.filter(c => c.dolgozo_id === emp.id)
    if (empChoices.length === 0) return null

    const row: any = {
      "Név": emp.nev,
      "Adóazonosító": "",
      "SZÉP Kártya - Szállás": 0,
      "SZÉP Kártya - Vendéglátás": 0,
      "SZÉP Kártya - Szabadidő": 0,
      "Egészségpénztár": 0,
      "Helyi bérlet": 0,
      "Egyéb": 0,
      "Összes Bruttó Kért": 0
    }

    empChoices.forEach(c => {
      const catName = (c.hr_cafeteria_katalogus as any)?.nev || ""
      const osszeg = c.kert_osszeg || 0

      if (catName.includes("Szállás")) row["SZÉP Kártya - Szállás"] += osszeg
      else if (catName.includes("Vendéglátás")) row["SZÉP Kártya - Vendéglátás"] += osszeg
      else if (catName.includes("Szabadidő")) row["SZÉP Kártya - Szabadidő"] += osszeg
      else if (catName.includes("Egészségpénztár")) row["Egészségpénztár"] += osszeg
      else if (catName.includes("bérlet")) row["Helyi bérlet"] += osszeg
      else row["Egyéb"] += osszeg

      row["Összes Bruttó Kért"] += osszeg
    })

    return row
  }).filter(row => row !== null)

  return exportData
}
