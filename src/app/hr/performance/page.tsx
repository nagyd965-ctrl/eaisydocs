import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { Target, Info } from "lucide-react"
import { AddKpiDialog } from "@/components/hr/add-kpi-dialog"
import { PerformanceList } from "@/components/hr/performance-list"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default async function PerformancePage() {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("szerepkor")
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.szerepkor)) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <h2 className="text-2xl font-bold text-destructive mb-2">Hozzáférés Megtagadva</h2>
          <p className="text-muted-foreground">Csak HR munkatársak férhetnek hozzá a teljesítményértékelésekhez.</p>
        </div>
      </div>
    )
  }

  // Admin kliens használata, mert az RLS policy-k még nincsenek teljeskörűen konfigurálva
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: kpis } = await supabaseAdmin
    .from("hr_teljesitmeny")
    .select("*")
    .order("created_at", { ascending: false })

  const { data: employees } = await supabaseAdmin
    .from("hr_dolgozo_adatlap")
    .select(`
      id,
      felhasznalo_profil ( nev ),
      hr_munkakor ( megnevezes )
    `)

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" /> Teljesítményértékelés
          </h1>
          <p className="text-muted-foreground mt-1">
            Vállalati és egyéni KPI-ok, célok nyomon követése és kiértékelése.
          </p>
        </div>
        <AddKpiDialog employees={employees || []} />
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          A célkitűzéseket (KPI-okat) a rendszer dolgozónként csoportosítva jeleníti meg. Egy célra kattintva lenyílik a hozzá tartozó értékelési idővonal és az aktivitások.
        </AlertDescription>
      </Alert>

      <PerformanceList employees={employees || []} kpis={kpis || []} />

    </div>
  )
}
