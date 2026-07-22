"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function submitLeaveRequest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const startDate = formData.get("startDate") as string
  const endDate = formData.get("endDate") as string
  const type = formData.get("type") as string

  if (!startDate || !endDate || !type) {
    return { error: "Minden mező kötelező" }
  }

  const { error } = await supabase
    .from("hr_tavollet")
    .insert({
      dolgozo_id: user.id,
      kezdet_datuma: startDate,
      veg_datuma: endDate,
      tipus: type,
      statusz: "jovahagyasra_var" // Azonnal jóváhagyásra vár
    })

  if (error) {
    console.error("Leave request error:", error)
    return { error: "Hiba történt az igénylés során." }
  }

  revalidatePath("/hr/self-service")
  return { success: true }
}

export async function revealSecretData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  // Hívjuk meg az RPC-t, ami automatikusan naplózza a megtekintést!
  const { data, error } = await supabase.rpc("get_decrypted_hr_data", {
    p_dolgozo_id: user.id
  })

  if (error) {
    console.error("RPC error:", error)
    return { error: "Hozzáférés megtagadva vagy nincs rögzített adat." }
  }

  // Explicit logolás az új hr_esemeny_naplo táblába is (a régi eaisyDocs esemeny_naplo mellett)
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "adat_megtekintes",
    entitas_tipus: "hr_dolgozo_titkos_adat",
    entitas_id: user.id,
    megjegyzes: "Szigorúan bizalmas dolgozói adatok feloldása és megtekintése"
  })

  return { data }
}

export async function updateSecretData(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const taj_szam = formData.get("taj_szam") as string
  const adoazonosito = formData.get("adoazonosito") as string
  const bankszamla = formData.get("bankszamla") as string

  const { error } = await supabase.rpc("update_decrypted_hr_data", {
    p_dolgozo_id: user.id,
    p_taj_szam: taj_szam || "",
    p_adoazonosito: adoazonosito || "",
    p_bankszamla: bankszamla || ""
  })

  if (error) {
    console.error("Update RPC error:", error)
    return { error: `Hiba: ${error.message}` }
  }

  // Explicit logolás az új hr_esemeny_naplo táblába
  await supabase.from("hr_esemeny_naplo").insert({
    felhasznalo_id: user.id,
    esemeny_tipus: "munkatars_felvetel", // modification
    entitas_tipus: "hr_dolgozo_titkos_adat",
    entitas_id: user.id,
    megjegyzes: "Szigorúan bizalmas dolgozói adatok módosítása"
  })

  return { success: true }
}

export async function toggleCheckIn() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  // Get current date's record
  const { data: todayRecord, error: fetchError } = await supabase
    .from("hr_jelenlet")
    .select("*")
    .eq("dolgozo_id", user.id)
    .eq("datum", new Date().toISOString().split('T')[0])
    .single()

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("Jelenlét lekérdezési hiba:", fetchError)
    return { error: "Nem sikerült lekérdezni a jelenlétet." }
  }

  if (!todayRecord) {
    // Check-in (Create record)
    const { error: insertError } = await supabase
      .from("hr_jelenlet")
      .insert({
        dolgozo_id: user.id,
        becsekkolas_ideje: new Date().toISOString()
      })
    
    if (insertError) return { error: "Sikertelen becsekkolás." }
    return { success: true, status: "checked_in" }
  } else if (!todayRecord.kicsekkolas_ideje) {
    // Check-out (Update record)
    const { error: updateError } = await supabase
      .from("hr_jelenlet")
      .update({ kicsekkolas_ideje: new Date().toISOString() })
      .eq("id", todayRecord.id)
    
    if (updateError) return { error: "Sikertelen kicsekkolás." }
    return { success: true, status: "checked_out" }
  } else {
    // Already checked out today
    return { error: "Ma már becsekkoltál és kicsekkoltál. Napi limit elérve." }
  }
}
