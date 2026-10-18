"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { getActiveCompanyIdServer } from "@/utils/company-server"

export async function createSubstitution(helyettesitoUserId: string, mettol: string, meddig: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const activeCompanyId = await getActiveCompanyIdServer()

  if (!helyettesitoUserId || helyettesitoUserId === user.id) {
    return { success: false, error: "Önmagadat nem jelölheted ki helyettesítőnek." }
  }

  const fromDate = new Date(mettol)
  const toDate = new Date(meddig)
  if (toDate <= fromDate) {
    return { success: false, error: "A befejező dátumnak a kezdő dátum utáninak kell lennie." }
  }

  // 1. Cégtagsági ellenőrzés (ha van aktív cég)
  if (activeCompanyId) {
    const { data: member } = await supabase
      .from("company_members")
      .select("user_id")
      .eq("company_id", activeCompanyId)
      .eq("user_id", helyettesitoUserId)
      .maybeSingle()

    if (!member) {
      return { success: false, error: "A kiválasztott munkatárs nem tagja a jelenlegi cégnek." }
    }
  }

  // 2. eaisyDocs modul jogosultság ellenőrzése
  const { data: targetProfile } = await supabase
    .from("felhasznalo_profil")
    .select("elerheto_modulok")
    .eq("id", helyettesitoUserId)
    .single()

  if (!targetProfile?.elerheto_modulok?.includes("docs")) {
    return { success: false, error: "Kizárólag eaisyDocs jogosultsággal rendelkező munkatárs jelölhető ki helyettesítőnek." }
  }

  const { error } = await supabase.from("helyettesites").insert({
    kilepo_user_id: user.id,
    helyettesito_user_id: helyettesitoUserId,
    mettol: fromDate.toISOString(),
    meddig: toDate.toISOString(),
    aktiv: true,
    company_id: activeCompanyId || null
  })

  if (error) {
    console.error("Helyettesítés mentése hiba:", error)
    return { success: false, error: "Nem sikerült elmenteni a helyettesítést: " + error.message }
  }

  revalidatePath("/settings")
  revalidatePath("/tasks")
  revalidatePath("/")
  return { success: true }
}

export async function deleteSubstitution(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve" }

  const { error } = await supabase.from("helyettesites").delete().eq("id", id).eq("kilepo_user_id", user.id)

  if (error) {
    console.error("Helyettesítés törlése hiba:", error)
    return { success: false, error: "Nem sikerült törölni." }
  }

  revalidatePath("/settings")
  revalidatePath("/tasks")
  revalidatePath("/")
  return { success: true }
}

