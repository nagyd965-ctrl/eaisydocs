import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { OffboardingTabs } from "@/components/hr/offboarding-tabs"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function OffboardingPage() {
  const supabase = await createClient()
  
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('hr_szerepkor')
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor)) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Nincs jogosultságod a Kiléptetés (Offboarding) modul megtekintéséhez.
      </div>
    )
  }

  // Offboarding folyamatok (feladatokkal és profilokkal)
  const { data: offboardings, error: offError } = await supabaseAdmin
    .from("hr_offboarding")
    .select(`
      *,
      hr_offboarding_feladat (*),
      felhasznalo_profil (nev),
      hr_kilepes_interju (*)
    `)
    .order("created_at", { ascending: false })

  if (offError) {
    console.error("Hiba offboarding adatok lekérésekor:", offError)
  }

  // Dolgozók a legördülő listához
  const { data: employees, error: empError } = await supabaseAdmin
    .from("felhasznalo_profil")
    .select("id, nev, hr_dolgozo_adatlap!inner(id)")
    .contains("elerheto_modulok", ["hr"])
    .order("nev", { ascending: true })

  if (empError) {
    console.error("Hiba dolgozók lekérésekor:", empError)
  }

  // Kilépési interjúk az összesítő tabhoz
  const { data: exitInterviews, error: interviewError } = await supabaseAdmin
    .from("hr_kilepes_interju")
    .select(`
      *,
      hr_offboarding (
        kilepes_datuma,
        felhasznalo_profil (nev)
      )
    `)
    .order("created_at", { ascending: false })

  if (interviewError) {
    console.error("Hiba exit interjúk lekérésekor:", interviewError)
  }

  // Flatten: az employee nevet és kilépési dátumot emeljük fel a főszintre
  const flatInterviews = (exitInterviews || []).map((i: any) => ({
    ...i,
    felhasznalo_profil: i.hr_offboarding?.felhasznalo_profil,
    kilepes_datuma:     i.hr_offboarding?.kilepes_datuma,
  }))

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Kiléptetés (Offboarding)</h1>
        <p className="text-muted-foreground mt-1">
          Eszközvisszavételek, jogosultságmegvonások, kilépési feladatok és interjúk nyomon követése.
        </p>
      </div>

      <OffboardingTabs
        offboardings={offboardings || []}
        employees={employees || []}
        exitInterviews={flatInterviews}
      />
    </div>
  )
}
