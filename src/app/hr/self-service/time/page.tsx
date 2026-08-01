import { createClient } from "@/utils/supabase/server"
import { LeaveHistoryList } from "@/components/hr/leave-history-list"
import { EmployeeTimesheet } from "@/components/hr/employee-timesheet"
import { SubstituteSettingsCard } from "@/components/hr/substitute-settings-card"
import { LeaveRequestDialog } from "@/components/hr/leave-request-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { redirect } from "next/navigation"
import { Clock, CalendarDays, Umbrella } from "lucide-react"

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

  // Stat számítás
  const totalTavollet = tavolletek?.filter(t => t.statusz === "jovahagyva").length || 0
  const pendingCount = tavolletek?.filter(t => t.statusz === "jovahagyasra_var").length || 0

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
  
  let availableUsers: any[] = []
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
    <div className="space-y-6 pb-10">

      {/* Fejléc */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Jelenlét és Szabadság</h1>
          <p className="text-muted-foreground mt-1">
            Munkaidő nyilvántartás, szabadságok és helyettesítések.
          </p>
        </div>
        <LeaveRequestDialog />
      </div>

      {/* Jelenléti Ív + Stat kártyák (a komponensen belül, szinkronban a hónapváltással) */}
      <EmployeeTimesheet employeeId={user.id} />

      {/* Saját Kérelmeim */}
      <LeaveHistoryList leaves={tavolletek || []} />

      {/* Helyettesítés – csak vezető/admin szerepkörnek */}
      {isManagerOrAdmin && (
        <SubstituteSettingsCard
          availableUsers={availableUsers}
          currentSubstitute={currentSubstitute}
        />
      )}

    </div>
  )
}
