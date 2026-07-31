import { createClient } from "@/utils/supabase/server"
import { LeaveHistoryList } from "@/components/hr/leave-history-list"
import { EmployeeTimesheet } from "@/components/hr/employee-timesheet"
import { SubstituteSettingsCard } from "@/components/hr/substitute-settings-card"
import { redirect } from "next/navigation"

export default async function SelfServiceTimePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: tavolletek } = await supabase
    .from("hr_tavollet")
    .select("*")
    .eq("dolgozo_id", user.id)
    .order("created_at", { ascending: false })

  const { data: myProfile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor")
    .eq("id", user.id)
    .single()

  const isManagerOrAdmin = ['hr_vezeto', 'vezeto', 'admin'].includes(myProfile?.hr_szerepkor)

  // Helyettesítések lekérése
  const { data: currentSubstituteList } = await supabase
    .from("hr_helyettesites")
    .select("*, helyettes_profil:felhasznalo_profil!hr_helyettesites_helyettes_id_fkey(nev)")
    .eq("vezeto_id", user.id)
    .eq("aktiv", true)
    .gte("veg_datuma", new Date().toISOString().split('T')[0])
    .order("created_at", { ascending: false })
    .limit(1)

  const currentSubstitute = currentSubstituteList?.[0] || null
  
  let availableUsers = []
  if (isManagerOrAdmin) {
    const { createClient: createAdminClient } = await import("@supabase/supabase-js")
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: availableAdatlapUsers } = await supabaseAdmin
      .from("hr_dolgozo_adatlap")
      .select("id, felhasznalo_profil!inner(id, nev)")
      .neq("id", user.id)

    availableUsers = availableAdatlapUsers
      ?.map((a: any) => a.felhasznalo_profil)
      .sort((a: any, b: any) => a.nev.localeCompare(b.nev)) || []
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Jelenlét és Szabadság</h1>
          <p className="text-muted-foreground mt-1">
            Munkaidő nyilvántartás, szabadságok és helyettesítések.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        {isManagerOrAdmin && (
          <SubstituteSettingsCard availableUsers={availableUsers || []} currentSubstitute={currentSubstitute} />
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <EmployeeTimesheet employeeId={user.id} />
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <LeaveHistoryList leaves={tavolletek || []} />
      </div>
      
    </div>
  )
}
