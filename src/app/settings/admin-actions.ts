"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

// ─────────────────────────────────────────────
// IRATTÁRI TERV CRUD (A-097 őrblokk + company_id)
// ─────────────────────────────────────────────

/**
 * A-097 ŐRBLOKK az irattári terv műveletekhez:
 * bejelentkezett cég-admin + aktív cég kontextus.
 */
async function requireIrattariTervAccess(): Promise<{ error?: string; activeCompanyId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve." }

  const { getActiveCompanyIdServer } = await import("@/utils/company-server")
  const activeCompanyId = await getActiveCompanyIdServer()
  if (!activeCompanyId) return { error: "Nincs kiválasztott aktív cég." }

  const { data: callerMembership } = await supabase
    .from("company_members")
    .select("role, docs_szerepkor")
    .eq("company_id", activeCompanyId)
    .eq("user_id", user.id)
    .maybeSingle()

  const isCompanyAdmin =
    callerMembership?.role === "owner" ||
    callerMembership?.role === "admin" ||
    callerMembership?.docs_szerepkor === "admin"
  if (!isCompanyAdmin) return { error: "Csak a cég adminja kezelheti az irattári tervet." }

  return { activeCompanyId }
}

export async function getIrattariTervek() {
  const guard = await requireIrattariTervAccess()
  if (guard.error) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("irattari_terv")
    .select("*")
    .eq("company_id", guard.activeCompanyId!)
    .order("tetelszam", { ascending: true })
  if (error) return []
  return data ?? []
}

export async function createIrattariTetel(formData: FormData) {
  const guard = await requireIrattariTervAccess()
  if (guard.error) return { error: guard.error }

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
    company_id: guard.activeCompanyId!,
  })

  if (error) {
    if (error.code === "23505") return { error: "Ez a tételszám már létezik." }
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function updateIrattariTetel(id: string, formData: FormData) {
  const guard = await requireIrattariTervAccess()
  if (guard.error) return { error: guard.error }

  const supabase = await createClient()

  const tetelszam = (formData.get("tetelszam") as string)?.trim()
  const megnevezes = (formData.get("megnevezes") as string)?.trim()
  const megorzesi_ido_ev = parseInt(formData.get("megorzesi_ido_ev") as string, 10)
  const selejtezheto = formData.get("selejtezheto") === "true"

  if (!tetelszam || !megnevezes || isNaN(megorzesi_ido_ev)) {
    return { error: "Minden mező kitöltése kötelező." }
  }

  // Cég-szűrés: csak a saját cég tételét módosíthatja
  const { error } = await supabase
    .from("irattari_terv")
    .update({ tetelszam, megnevezes, megorzesi_ido_ev, selejtezheto })
    .eq("id", id)
    .eq("company_id", guard.activeCompanyId!)

  if (error) {
    if (error.code === "23505") return { error: "Ez a tételszám már létezik." }
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function deleteIrattariTetel(id: string) {
  const guard = await requireIrattariTervAccess()
  if (guard.error) return { error: guard.error }

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

  // Cég-szűrés: csak a saját cég tételét törölheti
  const { error } = await supabase
    .from("irattari_terv")
    .delete()
    .eq("id", id)
    .eq("company_id", guard.activeCompanyId!)
  if (error) return { error: error.message }

  revalidatePath("/settings")
  return { success: true }
}

// ─────────────────────────────────────────────
// GLOBÁLIS AUDIT NAPLÓ
// ─────────────────────────────────────────────
// MEGSZÜNTETVE (2026-10-30, docs deep-analysis P0): a getGlobalisAuditNaplo
// és az AuditFilters itt állt. A függvény NEM volt sehol behívva (a központi
// /audit oldal a cég-szűrt src/app/audit/actions.ts-t használja), ugyanakkor
// "use server" exportként hitelesítés nélkül, SERVICE ROLE kulccsal hívható
// volt — az összes cég audit-eseményét adta vissza (IP, User-Agent, nevek).
// Visszaállítás: git revert az ezt törlő commitra.

// ─────────────────────────────────────────────
// RENDSZERBEÁLLÍTÁSOK (B10 - NÉGYSZEM-ELV)
// ─────────────────────────────────────────────

export async function getFourEyesSetting(): Promise<boolean> {
  const supabase = await createClient()

  // Cég-specifikus kulcs (A-098 minta): a négyszem-elv cégfüggő beállítás
  const { getActiveCompanyIdServer } = await import("@/utils/company-server")
  const activeCompanyId = await getActiveCompanyIdServer()
  const kulcs = activeCompanyId
    ? `negy_szem_elve_selejtezesnel:${activeCompanyId}`
    : "negy_szem_elve_selejtezesnel"

  const { data, error } = await supabase
    .from("rendszer_beallitas")
    .select("ertek")
    .eq("kulcs", kulcs)
    .maybeSingle()

  // Nincs cégspecifikus sor → a régi globális kulcs az átmeneti forrás
  if ((error || !data) && activeCompanyId) {
    const { data: legacy } = await supabase
      .from("rendszer_beallitas")
      .select("ertek")
      .eq("kulcs", "negy_szem_elve_selejtezesnel")
      .maybeSingle()
    return (legacy?.ertek as any)?.kotelezo !== false
  }

  if (error || !data) return true
  return (data.ertek as any)?.kotelezo !== false
}

export async function setFourEyesSetting(kotelezo: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nincs bejelentkezve." }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("docs_szerepkor, szerepkor")
    .eq("id", user.id)
    .single()

  const isAdmin =
    profile?.docs_szerepkor === "admin" ||
    profile?.docs_szerepkor === "rendszergazda" ||
    profile?.szerepkor === "admin" ||
    profile?.szerepkor === "rendszergazda"

  if (!isAdmin) {
    return { error: "Csak adminisztrátor vagy rendszergazda módosíthatja a selejtezési szabályzatot." }
  }

  // Cég-specifikus kulcs (A-098 minta): minden cég saját selejtezési szabályzatot kap
  const { getActiveCompanyIdServer } = await import("@/utils/company-server")
  const activeCompanyId = await getActiveCompanyIdServer()
  if (!activeCompanyId) {
    return { error: "Nincs kiválasztott aktív cég." }
  }

  const { error } = await supabase
    .from("rendszer_beallitas")
    .upsert({
      kulcs: `negy_szem_elve_selejtezesnel:${activeCompanyId}`,
      ertek: { kotelezo },
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  revalidatePath("/archive")
  return { success: true, kotelezo }
}

