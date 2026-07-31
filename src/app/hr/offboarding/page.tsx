import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { OffboardingList } from "@/components/hr/offboarding-list"
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

  // Lekérjük a meglévő offboardingokat (feladatokkal és profilokkal)
  const { data: offboardings, error: offError } = await supabaseAdmin
    .from("hr_offboarding")
    .select(`
      *,
      hr_offboarding_feladat (*),
      felhasznalo_profil (nev)
    `)
    .order("created_at", { ascending: false })

  if (offError) {
    console.error("Hiba offboarding adatok lekérésekor:", offError)
  }

  // Lekérjük a dolgozókat a legördülő listához, akiknek még nincs offboardingja
  const { data: employees, error: empError } = await supabaseAdmin
    .from("felhasznalo_profil")
    .select("id, nev, hr_dolgozo_adatlap!inner(id)")
    .contains("elerheto_modulok", ["hr"])
    .order("nev", { ascending: true })

  if (empError) {
    console.error("Hiba dolgozók lekérésekor:", empError)
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Kiléptetés (Offboarding)</h1>
          <p className="text-muted-foreground mt-1">
            Eszközvisszavételek, jogosultságmegvonások és kilépési feladatok nyomon követése.
          </p>
        </div>
      </div>
      <OffboardingList 
        offboardings={offboardings || []} 
        employees={employees || []} 
      />
    </div>
  )
}
