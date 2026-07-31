import { createClient } from "@/utils/supabase/server"
import { EmployeeKpiCard } from "@/components/hr/employee-kpi-card"
import { redirect } from "next/navigation"

export default async function SelfServiceGoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { createClient: createAdminClient } = await import("@supabase/supabase-js")
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: kpis } = await supabaseAdmin
    .from("hr_teljesitmeny")
    .select("*, hr_teljesitmeny_ciklus(megnevezes)")
    .eq("dolgozo_id", user.id)
    .order("created_at", { ascending: false })

  const { data: kpiLogs } = await supabaseAdmin
    .from("hr_esemeny_naplo")
    .select("*, felhasznalo_profil(nev)")
    .eq("entitas_tipus", "hr_teljesitmeny")
    .order("created_at", { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Céljaim</h1>
          <p className="text-muted-foreground mt-1">
            Teljesítményértékelés, célkitűzések és eredmények.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1 max-w-4xl">
        <EmployeeKpiCard kpis={kpis || []} logs={kpiLogs || []} />
      </div>
    </div>
  )
}
