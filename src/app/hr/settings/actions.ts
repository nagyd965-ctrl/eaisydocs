"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function createMunkakor(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const megnevezes = formData.get("megnevezes") as string
  const feor_kod = formData.get("feor_kod") as string
  const besorolasi_szint = formData.get("besorolasi_szint") as string
  const kockazat_tipusa = formData.get("kockazat_tipusa") as string

  if (!megnevezes) {
    return { error: "A megnevezés megadása kötelező" }
  }

  const { data, error } = await supabase
    .from("hr_munkakor")
    .insert([
      {
        megnevezes,
        feor_kod: feor_kod || null,
        besorolasi_szint: besorolasi_szint || null,
        kockazat_tipusa: kockazat_tipusa || null,
      }
    ])
    .select()

  if (error) {
    console.error("Hiba a munkakör létrehozásánál:", error)
    return { error: error.message }
  }

  revalidatePath("/hr/settings")
  return { success: true }
}

export async function updateEmployeeInfo(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezve" }
  }

  const employeeId = formData.get("employeeId") as string
  const role = formData.get("role") as string
  const munkakorId = formData.get("munkakorId") as string
  const entryDate = formData.get("entryDate") as string

  if (!employeeId) return { error: "Hiányzó dolgozó azonosító" }

  const { error: profileError } = await supabase
    .from("felhasznalo_profil")
    .update({ szerepkor: role })
    .eq("id", employeeId)

  if (profileError) return { error: "Hiba a szerepkör frissítésekor: " + profileError.message }

  const { error: hrError } = await supabase
    .from("hr_dolgozo_adatlap")
    .update({
      munkakor_id: munkakorId === "none" ? null : munkakorId,
      belepes_datuma: entryDate || null
    })
    .eq("id", employeeId)

  if (hrError) return { error: "Hiba az adatok frissítésekor: " + hrError.message }

  revalidatePath("/hr/settings")
  return { success: true }
}
