import { createClient as createAdminClient } from "@supabase/supabase-js"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AddKpiDialog } from "@/components/hr/add-kpi-dialog"
import { ManageCyclesDialog } from "@/components/hr/manage-cycles-dialog"
import { PerformanceList } from "@/components/hr/performance-list"
import { KpiCard } from "@/components/kpi-card"
import { isStrictHrReadOnlyUser, requireHrAuthServer } from "@/utils/hr/hr-auth-guard"
import {
  getScopedPerformanceEmployeeIds,
  hasFullCompanyPerformanceAccess,
  hasFullCompanyPerformanceWriteAccess,
} from "@/utils/hr/performance-access"
import { type KpiCatalogueItem } from "@/types/hr"

export default async function PerformancePage() {
  const auth = await requireHrAuthServer(["admin", "performance", "audit", "vezeto"])
  if (!auth.authorized || !auth.activeCompanyId) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <h2 className="text-2xl font-semibold text-destructive mb-2">Hozzáférés Megtagadva</h2>
          <p className="text-muted-foreground">Csak vezetők és HR munkatársak férhetnek hozzá a teljesítményértékelésekhez.</p>
        </div>
      </div>
    )
  }

  const { activeCompanyId } = auth
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"
  const canViewFullCompany = hasFullCompanyPerformanceAccess(auth)
  const isFullCompanyManager = hasFullCompanyPerformanceWriteAccess(auth)
  const isReadOnlyUser = isStrictHrReadOnlyUser(auth)

  // Admin kliens használata az adatok biztonságos, céges szűréséhez
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Aktív cég tagjainak azonosítói (vezeto szerepkör esetén csak a saját közvetlen beosztottak)
  const { data: companyMembers } = await supabaseAdmin
    .from("company_members")
    .select("user_id")
    .eq("company_id", companyScope)
  const memberUserIds = (companyMembers || []).map((m: any) => m.user_id)
  const scopedEmployeeIds = await getScopedPerformanceEmployeeIds(
    supabaseAdmin,
    auth,
    memberUserIds
  )
  const managedTeamUserIds = isFullCompanyManager
    ? scopedEmployeeIds
    : canViewFullCompany
    ? isReadOnlyUser
      ? []
      : await getScopedPerformanceEmployeeIds(
          supabaseAdmin,
          { ...auth, isCompanyAdmin: false, hrRole: "vezeto", hrModules: [] },
          memberUserIds
        )
    : scopedEmployeeIds
  const canCreateKpi = isFullCompanyManager || (!isReadOnlyUser && managedTeamUserIds.length > 0)
  const safeMemberIds = scopedEmployeeIds.length > 0 ? scopedEmployeeIds : ["00000000-0000-0000-0000-000000000000"]

  const [kpisRes, employeesRes, cyclesRes, logsRes, catalogueRes] = await Promise.all([
    supabaseAdmin
      .from("hr_teljesitmeny")
      .select("*, hr_teljesitmeny_ciklus(megnevezes, statusz), hr_dolgozo_adatlap(felhasznalo_profil(nev))")
      .in("dolgozo_id", safeMemberIds)
      .eq("company_id", companyScope)
      .order("created_at", { ascending: false }),

    supabaseAdmin
      .from("hr_dolgozo_adatlap")
      .select(`
        id,
        felhasznalo_profil ( nev, avatar_url ),
        hr_jogviszony (
          company_id,
          hr_beosztas (
            company_id,
            ervenyes_ig,
            hr_munkakor ( megnevezes )
          )
        )
      `)
      .in("id", safeMemberIds),

    supabaseAdmin
      .from("hr_teljesitmeny_ciklus")
      .select("*")
      .eq("company_id", companyScope)
      .order("kezdo_datum", { ascending: false }),

    supabaseAdmin
      .from("hr_esemeny_naplo")
      .select("*, felhasznalo_profil(nev)")
      .eq("entitas_tipus", "hr_teljesitmeny")
      .eq("company_id", companyScope)
      .in("felhasznalo_id", safeMemberIds)
      .order("created_at", { ascending: true }),

    supabaseAdmin
      .from("hr_kpi_katalogus")
      .select("*")
      .eq("aktiv", true)
      .or(`company_id.eq.${companyScope},company_id.is.null`)
      .order("megnevezes")
  ])

  const kpis = kpisRes.data || []
  const employees = (employeesRes.data || []).map((emp: any) => ({
    ...emp,
    hr_jogviszony: Array.isArray(emp.hr_jogviszony)
      ? emp.hr_jogviszony
          .filter((jv: any) => !companyScope || jv?.company_id === companyScope)
          .map((jv: any) => ({
            ...jv,
            hr_beosztas: Array.isArray(jv?.hr_beosztas)
              ? jv.hr_beosztas.filter((b: any) => !companyScope || b?.company_id === companyScope)
              : jv?.hr_beosztas,
          }))
      : emp.hr_jogviszony,
  }))
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
            {canViewFullCompany
              ? "Vállalati és egyéni KPI-ok, célok nyomon követése és kiértékelése."
              : "Saját közvetlen csapatod KPI-jainak, céljainak nyomon követése és kiértékelése."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/hr/performance/dashboard">
            <Button variant="outline">
              Riportok
            </Button>
          </Link>
          {isFullCompanyManager && <ManageCyclesDialog cycles={cycles || []} />}
          {canCreateKpi && (
            <AddKpiDialog 
              employees={
                isFullCompanyManager
                  ? employees || []
                  : (employees || []).filter((e: any) => managedTeamUserIds.includes(e.id))
              } 
              cycles={cycles || []} 
              allKpis={kpis || []} 
              catalogue={catalogue}
            />
          )}
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
        canCreateKpi={canCreateKpi}
        isReadOnlyUser={isReadOnlyUser}
        currentUserId={auth.user?.id}
        manageableEmployeeIds={isFullCompanyManager ? scopedEmployeeIds : managedTeamUserIds}
      />

    </div>
  )
}
