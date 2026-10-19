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

import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"

export default async function PerformancePage() {
  const auth = await requireHrAuthServer(["hr_munkatars", "hr_vezeto", "admin", "vezeto", "auditor"])
  if (!auth.authorized || !auth.activeCompanyId) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <h2 className="text-2xl font-bold text-destructive mb-2">Hozzáférés Megtagadva</h2>
          <p className="text-muted-foreground">Csak vezetők és HR munkatársak férhetnek hozzá a teljesítményértékelésekhez.</p>
        </div>
      </div>
    )
  }

  const { activeCompanyId } = auth
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"

  // Admin kliens használata az adatok biztonságos, céges szűréséhez
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Aktív cég tagjainak azonosítói
  const { data: companyMembers } = await supabaseAdmin
    .from("company_members")
    .select("user_id")
    .eq("company_id", companyScope)
  const memberUserIds = (companyMembers || []).map((m: any) => m.user_id)
  const safeMemberIds = memberUserIds.length > 0 ? memberUserIds : ["00000000-0000-0000-0000-000000000000"]

  const [kpisRes, employeesRes, cyclesRes, logsRes] = await Promise.all([
    supabaseAdmin
      .from("hr_teljesitmeny")
      .select("*, hr_teljesitmeny_ciklus(megnevezes), hr_dolgozo_adatlap(felhasznalo_profil(nev))")
      .in("dolgozo_id", safeMemberIds)
      .or(`company_id.eq.${companyScope},company_id.is.null`)
      .order("created_at", { ascending: false }),

    supabaseAdmin
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
      .in("id", safeMemberIds),

    supabaseAdmin
      .from("hr_teljesitmeny_ciklus")
      .select("*")
      .or(`company_id.eq.${companyScope},company_id.is.null`)
      .order("kezdo_datum", { ascending: false }),

    supabaseAdmin
      .from("hr_esemeny_naplo")
      .select("*, felhasznalo_profil(nev)")
      .eq("entitas_tipus", "hr_teljesitmeny")
      .in("felhasznalo_id", safeMemberIds)
      .order("created_at", { ascending: true })
  ])

  const kpis = kpisRes.data || []
  const employees = employeesRes.data || []
  const cycles = cyclesRes.data || []
  const logs = logsRes.data || []

  return (
    <div key={companyScope} className="space-y-6 pb-10">
      
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
