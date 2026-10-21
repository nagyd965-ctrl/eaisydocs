import { createClient } from "@/utils/supabase/server"
import { EmployeeKpiCard } from "@/components/hr/employee-kpi-card"
import { KpiCard } from "@/components/kpi-card"
import { deriveWorkflowPhase } from "@/lib/kpi-helpers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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

  const [kpisRes, cyclesRes, kpiLogsRes] = await Promise.all([
    supabaseAdmin
      .from("hr_teljesitmeny")
      .select("*, hr_teljesitmeny_ciklus(megnevezes, kezdo_datum, befejezo_datum, statusz)")
      .eq("dolgozo_id", user.id)
      .order("created_at", { ascending: false }),

    supabaseAdmin
      .from("hr_teljesitmeny_ciklus")
      .select("*")
      .order("kezdo_datum", { ascending: false }),

    supabaseAdmin
      .from("hr_esemeny_naplo")
      .select("*, felhasznalo_profil(nev)")
      .eq("entitas_tipus", "hr_teljesitmeny")
      .order("created_at", { ascending: true })
  ])

  const kpis = kpisRes.data || []
  const cycles = cyclesRes.data || []
  const kpiLogs = kpiLogsRes.data || []

  // Aktív ciklus keresése
  const activeCycle = cycles.find((c: any) => c.statusz === "nyitott" || c.statusz === "aktiv") 
    || (kpis[0]?.hr_teljesitmeny_ciklus ? {
        megnevezes: kpis[0].hr_teljesitmeny_ciklus.megnevezes,
        kezdo_datum: kpis[0].hr_teljesitmeny_ciklus.kezdo_datum,
        befejezo_datum: kpis[0].hr_teljesitmeny_ciklus.befejezo_datum,
      } : null)

  const totalGoals = kpis.length
  const totalWeight = kpis.reduce((acc: number, curr: any) => acc + (Number(curr.sulyozas) || 1), 0)

  // Önértékelésre vár: ahol még a dolgozónak kell kitöltenie az űrlapot
  const pendingSelfEvalCount = kpis.filter((k: any) => {
    const phase = deriveWorkflowPhase(k)
    return phase === "celkituzes" || (phase === "onertekeles" && !k.onertekeles_szovege)
  }).length

  // Lezárt célok száma
  const closedCount = kpis.filter((k: any) => {
    return deriveWorkflowPhase(k) === "lezart"
  }).length

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* Fejléc */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground font-heading">
            Céljaim & Értékelésem
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Személyes célkitűzések követése és dolgozói önértékelés leadása a vezető felé.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/hr">
            <Button variant="outline" size="sm" className="gap-2 text-xs cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" /> Vissza az áttekintéshez
            </Button>
          </Link>
          {activeCycle && (
            <Badge variant="outline" className="text-xs py-1.5 px-3 bg-muted/30 border-primary/20 text-foreground font-medium">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-primary" />
              {activeCycle.megnevezes}
            </Badge>
          )}
        </div>
      </div>

      {/* Kanonikus Linear-flat KPI sáv (ADR A-029) - Valós összesített mutatók */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Aktív Értékelési Ciklus"
          value={activeCycle ? activeCycle.megnevezes : "2026. H2 - Éves Értékelés"}
          sub={activeCycle?.kezdo_datum && activeCycle?.befejezo_datum ? `${activeCycle.kezdo_datum} – ${activeCycle.befejezo_datum}` : "Nyitott értékelési időszak"}
        />
        <KpiCard
          label="Kitűzött Céljaim"
          value={`${totalGoals} db cél`}
          sub={totalGoals > 0 ? `Összesített súlyozás: ${totalWeight.toFixed(1)}x` : "Nincs még rögzített cél"}
        />
        <KpiCard
          label="Önértékelési Teendő"
          value={pendingSelfEvalCount > 0 ? `${pendingSelfEvalCount} kitöltendő` : "Minden leadva"}
          sub={pendingSelfEvalCount > 0 ? "Önértékelésedre vár a vezetőd" : "Nincs elmaradt önértékelésed"}
        />
        <KpiCard
          label="Lezárt Célkitűzések"
          value={`${closedCount} / ${totalGoals} lezárva`}
          sub={
            closedCount === totalGoals && totalGoals > 0
              ? "Minden cél sikeresen lezárult"
              : `${totalGoals - closedCount} db cél folyamatban van`
          }
        />
      </div>

      {/* Célkitűzések Munkaterület */}
      <EmployeeKpiCard kpis={kpis} logs={kpiLogs} activeCycleName={activeCycle?.megnevezes} />
    </div>
  )
}
