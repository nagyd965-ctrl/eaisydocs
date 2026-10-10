import { createClient as createAdminClient } from "@supabase/supabase-js"
import { OnboardingList } from "@/components/hr/onboarding-list"
import { AddOnboardingDialog } from "@/components/hr/add-onboarding-dialog"
import { Shield } from "lucide-react"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"

export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
  const auth = await requireHrAuthServer(["hr_munkatars", "hr_vezeto", "admin"])
  if (!auth.authorized || !auth.activeCompanyId) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-destructive mb-2">Hozzáférés Megtagadva</h2>
          <p className="text-muted-foreground">Nincs jogosultságod az Onboarding modul megtekintéséhez a kiválasztott cégnél.</p>
        </div>
      </div>
    )
  }

  const { activeCompanyId } = auth

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Lekérjük az összes folyamatban lévő és lezárt onboardingot a hozzájuk tartozó feladatokkal az aktív céghez
  const { data: onboardings, error } = await supabaseAdmin
    .from("hr_onboarding")
    .select(`
      *,
      hr_onboarding_feladat (*),
      hr_toborzas (id, email, telefon, cv_storage_path),
      dolgozo:felhasznalo_profil!dolgozo_id (id, nev),
      lezarta:felhasznalo_profil!lezarta_id (id, nev)
    `)
    .eq("company_id", activeCompanyId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Hiba onboarding adatok lekérésekor:", error)
  }

  // Lekérjük a hivatalos szervezeti egységeket és munkaköröket a katalógusból az aktív céghez
  const [orgUnitsRes, jobsRes] = await Promise.all([
    supabaseAdmin.from("hr_szervezeti_egyseg").select("id, nev, szulo_id").eq("company_id", activeCompanyId).order("nev"),
    supabaseAdmin.from("hr_munkakor").select("id, megnevezes, feor_kod, szervezeti_egyseg_id").eq("company_id", activeCompanyId).order("megnevezes")
  ])

  const orgUnits = orgUnitsRes.data || []
  const orgMap = new Map(orgUnits.map((o) => [o.id, o.nev]))
  const jobs = (jobsRes.data || []).map((j) => ({
    ...j,
    szervezeti_egyseg_nev: j.szervezeti_egyseg_id ? orgMap.get(j.szervezeti_egyseg_id) || null : null
  }))

  return (
    <div key={activeCompanyId} className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Onboarding</h1>
          <p className="text-muted-foreground mt-1">
            Beléptetési folyamatok, digitális feladatkövetés és eszközfelelősség.
          </p>
        </div>
        <AddOnboardingDialog orgUnits={orgUnits} jobs={jobs} />
      </div>
      <OnboardingList onboardings={onboardings || []} orgUnits={orgUnits} jobs={jobs} />
    </div>
  )
}
