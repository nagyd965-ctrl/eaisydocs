"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

// ─────────────────────────────────────────────
// IRATTÁRI TERV CRUD
// ─────────────────────────────────────────────

export async function getIrattariTervek() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("irattari_terv")
    .select("*")
    .order("tetelszam", { ascending: true })
  if (error) return []
  return data ?? []
}

export async function createIrattariTetel(formData: FormData) {
  const supabase = await createClient()

  const tetelszam = (formData.get("tetelszam") as string)?.trim()
  const megnevezes = (formData.get("megnevezes") as string)?.trim()
  const megorzesi_ido_ev = parseInt(formData.get("megorzesi_ido_ev") as string, 10)
  const selejtezheto = formData.get("selejtezheto") === "true"

  if (!tetelszam || !megnevezes || isNaN(megorzesi_ido_ev)) {
    return { error: "Minden mező kitöltése kötelező." }
  }

  const { error } = await supabase.from("irattari_terv").insert({
    tetelszam,
    megnevezes,
    megorzesi_ido_ev,
    selejtezheto,
  })

  if (error) {
    if (error.code === "23505") return { error: "Ez a tételszám már létezik." }
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function updateIrattariTetel(id: string, formData: FormData) {
  const supabase = await createClient()

  const tetelszam = (formData.get("tetelszam") as string)?.trim()
  const megnevezes = (formData.get("megnevezes") as string)?.trim()
  const megorzesi_ido_ev = parseInt(formData.get("megorzesi_ido_ev") as string, 10)
  const selejtezheto = formData.get("selejtezheto") === "true"

  if (!tetelszam || !megnevezes || isNaN(megorzesi_ido_ev)) {
    return { error: "Minden mező kitöltése kötelező." }
  }

  const { error } = await supabase
    .from("irattari_terv")
    .update({ tetelszam, megnevezes, megorzesi_ido_ev, selejtezheto })
    .eq("id", id)

  if (error) {
    if (error.code === "23505") return { error: "Ez a tételszám már létezik." }
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function deleteIrattariTetel(id: string) {
  const supabase = await createClient()

  // Safety check: van-e hivatkozott ügyirat vagy ügy?
  const [{ count: ugyiratCount }, { count: ugyCount }] = await Promise.all([
    supabase
      .from("ugyirat")
      .select("id", { count: "exact", head: true })
      .eq("irattari_tetel_id", id),
    supabase
      .from("ugy")
      .select("id", { count: "exact", head: true })
      .eq("ugytipus_id", id),
  ])

  if ((ugyiratCount ?? 0) > 0 || (ugyCount ?? 0) > 0) {
    return {
      error: `Nem törölhető: ${(ugyiratCount ?? 0) + (ugyCount ?? 0)} ügyirat hivatkozik erre a tételre.`,
    }
  }

  const { error } = await supabase.from("irattari_terv").delete().eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/settings")
  return { success: true }
}

// ─────────────────────────────────────────────
// GLOBÁLIS AUDIT NAPLÓ
// ─────────────────────────────────────────────

export interface AuditFilters {
  esemeny_tipus?: string
  user_id?: string
  dateFrom?: string
  dateTo?: string
}

export async function getGlobalisAuditNaplo(filters: AuditFilters = {}) {
  // Service role key szükséges, mert az audit napló RLS append-only
  const { createClient: createAdmin } = await import("@supabase/supabase-js")
  const supabase = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let query = supabase
    .from("esemeny_naplo")
    .select(`
      id,
      esemeny_tipus,
      entitas_tipus,
      entitas_id,
      tortent,
      ip_cim,
      user_agent,
      indoklas,
      user_id
    `)
    .order("tortent", { ascending: false })
    .limit(200)

  if (filters.esemeny_tipus) query = query.eq("esemeny_tipus", filters.esemeny_tipus)
  if (filters.user_id) query = query.eq("user_id", filters.user_id)
  if (filters.dateFrom) query = query.gte("tortent", filters.dateFrom)
  if (filters.dateTo) query = query.lte("tortent", filters.dateTo)

  const { data, error } = await query
  if (error) {
    console.error("Audit napló lekérési hiba:", error)
    return []
  }

  // Felhasználó nevek lekérése külön (nincs FK constraint az esemeny_naplo-n)
  const userIds = [...new Set((data ?? []).map((e: any) => e.user_id).filter(Boolean))]
  let userMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("felhasznalo_profil")
      .select("id, nev")
      .in("id", userIds)
    if (profiles) {
      userMap = Object.fromEntries(profiles.map((p: any) => [p.id, p.nev]))
    }
  }

  return (data ?? []).map((e: any) => ({
    ...e,
    letrehozva: e.tortent, // alias a UI számára
    felhasznalo_nev: userMap[e.user_id] || null,
  }))
}

