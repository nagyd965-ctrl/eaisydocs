import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { Target, Info, BarChart3 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AddKpiDialog } from "@/components/hr/add-kpi-dialog"
import { ManageCyclesDialog } from "@/components/hr/manage-cycles-dialog"
import { PerformanceList } from "@/components/hr/performance-list"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default async function PerformancePage() {
  const supabase = await createClient()

  // Biztonsági ellenőrzés
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select('hr_szerepkor')
    .eq("id", user.id)
    .single()

  if (!profile || !["hr_munkatars", "hr_vezeto", "admin"].includes(profile.hr_szerepkor)) {
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
    .select("*, hr_teljesitmeny_ciklus(megnevezes), hr_dolgozo_adatlap(felhasznalo_profil(nev))")
    .order("created_at", { ascending: false })

  const { data: employees } = await supabaseAdmin
    .from("hr_dolgozo_adatlap")
    .select(`
      id,
      felhasznalo_profil ( nev, avatar_url ),
      hr_jogviszony (
        hr_beosztas (
          ervenyes_ig,
          hr_munkakor ( megnevezes )
        )
      )
    `)

  const { data: cycles } = await supabaseAdmin
    .from("hr_teljesitmeny_ciklus")
    .select("*")
    .order("kezdo_datum", { ascending: false })

  const { data: logs } = await supabaseAdmin
    .from("hr_esemeny_naplo")
    .select("*, felhasznalo_profil(nev)")
    .eq("entitas_tipus", "hr_teljesitmeny")
    .order("created_at", { ascending: true })

  return (
    <div className="space-y-6 pb-10">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Teljesítményértékelés
          </h1>
          <p className="text-muted-foreground mt-1">
            Vállalati és egyéni KPI-ok, célok nyomon követése és kiértékelése.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/hr/performance/dashboard">
            <Button variant="outline" className="gap-2">
              <BarChart3 className="w-4 h-4" /> Riportok
            </Button>
          </Link>
          <ManageCyclesDialog cycles={cycles || []} />
          <AddKpiDialog employees={employees || []} cycles={cycles || []} allKpis={kpis || []} />
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          A célkitűzéseket (KPI-okat) a rendszer dolgozónként csoportosítva jeleníti meg. Egy célra kattintva lenyílik a hozzá tartozó értékelési idővonal és az aktivitások.
        </AlertDescription>
      </Alert>

      <PerformanceList employees={employees || []} kpis={kpis || []} logs={logs || []} cycles={cycles || []} allKpis={kpis || []} />

    </div>
  )
}
