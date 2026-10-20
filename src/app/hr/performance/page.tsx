import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { BarChart3 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AddKpiDialog } from "@/components/hr/add-kpi-dialog"
import { ManageCyclesDialog } from "@/components/hr/manage-cycles-dialog"
import { PerformanceList } from "@/components/hr/performance-list"
import { KpiCard } from "@/components/kpi-card"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"
import { type KpiCatalogueItem } from "@/types/hr"

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

  const [kpisRes, employeesRes, cyclesRes, logsRes, catalogueRes] = await Promise.all([
    supabaseAdmin
      .from("hr_teljesitmeny")
      .select("*, hr_teljesitmeny_ciklus(megnevezes, statusz), hr_dolgozo_adatlap(felhasznalo_profil(nev))")
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
      .order("created_at", { ascending: true }),

    supabaseAdmin
      .from("hr_kpi_katalogus")
      .select("*")
      .eq("aktiv", true)
      .order("megnevezes")
  ])

  const kpis = kpisRes.data || []
  const employees = employeesRes.data || []
  const cycles = cyclesRes.data || []
  const logs = logsRes.data || []
  const catalogue: KpiCatalogueItem[] = catalogueRes.data || []

  // Számított mérőszámok a kanonikus KpiCard-okhoz
  const activeCycle = cycles.find((c: any) => c.statusz === "nyitott" || c.statusz === "aktiv")
  const totalEmployees = employees.length

  const scopedKpis = activeCycle
    ? kpis.filter((k: any) => k.ciklus_id === activeCycle.id)
    : kpis

  const evaluatedEmployeeIds = new Set(scopedKpis.map((k: any) => k.dolgozo_id))
  const evaluatedEmployeeCount = evaluatedEmployeeIds.size

  // Vezetői értékelésre várók száma (ahol önértékelés leadva vagy fázisban van)
  const waitingForManagerCount = scopedKpis.filter((k: any) => {
    const phase = k.workflow_fazis || (k.ertekeles_lezarva_datum ? "lezart" : k.ertekeles_szovege ? "vezetoi_ertekeles" : k.onertekeles_szovege ? "onertekeles" : "celkituzes")
    return phase === "onertekeles" || (phase === "vezetoi_ertekeles" && !k.ertekeles_szovege)
  }).length

  return (
    <div key={companyScope} className="space-y-6 pb-10">
      
      {/* Fejléc */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Teljesítményértékelés
          </h1>
          <p className="text-muted-foreground mt-1">
            Vállalati és egyéni KPI-ok, célok nyomon követése és kiértékelése.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/hr/performance/dashboard">
            <Button variant="outline" className="gap-2">
              <BarChart3 className="w-4 h-4" /> Riportok
            </Button>
          </Link>
          <ManageCyclesDialog cycles={cycles || []} />
          <AddKpiDialog 
            employees={employees || []} 
            cycles={cycles || []} 
            allKpis={kpis || []} 
            catalogue={catalogue}
          />
        </div>
      </div>

      {/* Kanonikus Linear-flat KPI sáv (ADR A-029) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Aktív Ciklus"
          value={activeCycle ? activeCycle.megnevezes : "Nincs nyitott"}
          sub={activeCycle ? `${activeCycle.kezdo_datum} – ${activeCycle.befejezo_datum}` : "Indíts új ciklust a kezelőben"}
        />
        <KpiCard
          label="Érintett Dolgozók"
          value={`${evaluatedEmployeeCount} / ${totalEmployees} fő`}
          sub={totalEmployees > 0 ? `${Math.round((evaluatedEmployeeCount / totalEmployees) * 100)}% rendelkezik céllal` : "Nincsenek dolgozók"}
        />
        <KpiCard
          label="Kitűzött Célok (KPI)"
          value={`${scopedKpis.length} db`}
          sub={evaluatedEmployeeCount > 0 ? `Átlagosan ${(scopedKpis.length / evaluatedEmployeeCount).toFixed(1)} cél / kolléga` : "Nincs rögzített cél"}
        />
        <KpiCard
          label="Vezetői Értékelésre Vár"
          value={`${waitingForManagerCount} cél`}
          sub={waitingForManagerCount === 0 ? "Minden cél kiértékelve" : "Önértékelés után pontozandó"}
        />
      </div>

      {/* Teljesítmény lista TableToolbar-ral és szűréssel */}
      <PerformanceList 
        employees={employees || []} 
        kpis={kpis || []} 
        logs={logs || []} 
        cycles={cycles || []} 
        allKpis={kpis || []} 
        catalogue={catalogue}
      />

    </div>
  )
}

