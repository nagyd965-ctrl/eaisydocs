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
export async function submitCafeteriaDeclaration(employeeId: string, year: number, choices: { katalogus_elem_id: string, kert_osszeg: number, levont_keret_osszeg: number }[]) {
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

  // Close the declaration
  const { error: updateError } = await supabase
    .from("hr_cafeteria_keret")
    .update({ nyilatkozat_lezarva: true })
    .eq("dolgozo_id", employeeId)
    .eq("ev", year)

  if (updateError) {
    console.error("Error closing declaration:", updateError)
    return { error: "Hiba történt a nyilatkozat lezárása során." }
  }

  revalidatePath("/hr/self-service")
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
  return { success: true }
}

// 4. Reopen declaration (mid-year modification)
export async function reopenCafeteriaDeclaration(employeeId: string, year: number) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from("hr_cafeteria_keret")
    .update({ nyilatkozat_lezarva: false })
    .eq("dolgozo_id", employeeId)
    .eq("ev", year)

  if (error) {
    console.error("Error reopening declaration:", error)
    return { error: "Hiba történt az újranyitás során." }
  }

  // Also delete existing choices? Often in mid-year changes you want to keep them so the employee can just modify them,
  // or maybe not. We will keep them, so the employee sees what they had and modifies it.

  revalidatePath(`/hr/employee/${employeeId}`)
  return { success: true }
}

// 5. Get export data for Excel
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
      "Adóazonosító": "", // Adóazonosító titkosítva van a hr_dolgozo_titkos_adat táblában
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
