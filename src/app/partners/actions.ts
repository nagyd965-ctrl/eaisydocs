"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

export async function savePartner(formData: FormData) {
  const supabase = await createClient()
  
  const id = formData.get("id")?.toString()
  const nev = formData.get("nev")?.toString()?.trim()
  const tipus = formData.get("tipus")?.toString()?.trim() || "ceg"
  const adoszam = formData.get("adoszam")?.toString()?.trim() || null
  const cegjegyzekszam = formData.get("cegjegyzekszam")?.toString()?.trim() || null
  const email = formData.get("email")?.toString()?.trim() || null
  const telefonszam = formData.get("telefonszam")?.toString()?.trim() || null
  const cim = formData.get("cim")?.toString()?.trim() || null

  if (!nev) {
    return { error: "A név megadása kötelező." }
  }

  const payload = {
    nev,
    tipus,
    adoszam,
    cegjegyzekszam,
    email,
    telefonszam,
    cim,
  }

  if (id) {
    // Update
    const { error } = await supabase
      .from("partner")
      .update(payload)
      .eq("id", id)
      
    if (error) return { error: error.message }
  } else {
    // Insert with intelligent deduplication
    const { findOrCreatePartner } = await import("@/utils/partner-matcher")
    try {
      await findOrCreatePartner(supabase, payload)
    } catch (err: any) {
      return { error: err.message }
    }
  }

  revalidatePath("/partners")
  if (id) {
    revalidatePath(`/partners/${id}`)
  }
  
  return { success: true }
}

export async function getPartnersLookup() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("partner")
    .select("id, nev, tipus, email, adoszam")
    .order("nev")
  return data || []
}
