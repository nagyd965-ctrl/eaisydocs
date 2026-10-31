import { createClient } from "@/utils/supabase/server"

/**
 * A-097 őrblokk a Szabályok modul ÍRÁSI műveleteihez.
 *
 * A megrendelő döntése (2026-10-31): a Szabályok rész kizárólag
 * adminisztrátori / rendszergazdai szerepkörrel érhető el — a
 * „Minden cég (Közös szabály)" hatókör miatt egy sima tag által felvett
 * szabály minden cég beérkező iratára hatással lehetne.
 */
export async function requireRulesAdminAccess(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return "Nincs bejelentkezve."

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
    return "A Szabályok kezelése csak rendszergazdai vagy adminisztrátori szerepkörrel érhető el."
  }

  return null
}
