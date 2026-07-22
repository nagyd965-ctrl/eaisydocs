import { createClient } from "@/utils/supabase/server"
import { OnboardingList } from "@/components/hr/onboarding-list"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("szerepkor")
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.szerepkor)) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Nincs jogosultságod az Onboarding modul megtekintéséhez.
      </div>
    )
  }

  // Lekérjük az összes folyamatban lévő és lezárt onboardingot a hozzájuk tartozó feladatokkal
  const { data: onboardings, error } = await supabase
    .from("hr_onboarding")
    .select(`
      *,
      hr_onboarding_feladat (*),
      hr_toborzas (email, cv_storage_path)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Hiba onboarding adatok lekérésekor:", error)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Onboarding</h1>
          <p className="text-muted-foreground mt-1">
            Automatikus beléptetési folyamatok és feladatkövetés.
          </p>
        </div>
      </div>
      <OnboardingList onboardings={onboardings || []} />
    </div>
  )
}
