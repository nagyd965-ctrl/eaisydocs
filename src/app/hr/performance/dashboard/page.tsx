import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { BarChart3, ClipboardCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { KpiCard } from "@/components/kpi-card"
import { DashboardCharts } from "./components/dashboard-charts"

export default async function DashboardPage() {
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
          <p className="text-muted-foreground">Csak HR munkatársak férhetnek hozzá a riportokhoz.</p>
        </div>
      </div>
    )
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: kpis } = await supabaseAdmin
    .from("hr_teljesitmeny")
    .select("*, hr_teljesitmeny_ciklus(megnevezes, statusz)")

  const { data: cycles } = await supabaseAdmin
    .from("hr_teljesitmeny_ciklus")
    .select("*")

  const { data: employees } = await supabaseAdmin
    .from("hr_dolgozo_adatlap")
    .select("id, felhasznalo_profil(nev)")

  // Számítások
  const totalEmployees = employees?.length || 0
  const activeKpis = kpis?.filter(k => k.hr_teljesitmeny_ciklus?.statusz === "nyitott") || []
  const allKpis = kpis || []
  
  const calculatePercent = (k: any) => {
    if (k.meroszam_tipusa === "szazalek") return k.aktualis_ertek
    if (k.meroszam_tipusa === "igen_nem") return k.aktualis_ertek === 1 ? 100 : 0
    if (k.cel_ertek === 0) return 0
    const pct = (k.aktualis_ertek / k.cel_ertek) * 100
    return Math.min(Math.round(pct), 100)
  }

  let totalActivePercent = 0
  activeKpis.forEach(k => {
    totalActivePercent += calculatePercent(k)
  })
  const avgActivePercent = activeKpis.length > 0 ? Math.round(totalActivePercent / activeKpis.length) : 0

  // Workflow fázis összegés
  const phaseCount = { celkituzes: 0, onertekeles: 0, vezetoi_ertekeles: 0, megbeszeles: 0, lezart: 0 }
  allKpis.forEach(k => {
    const phase = k.workflow_fazis || 'celkituzes'
    if (phase in phaseCount) phaseCount[phase as keyof typeof phaseCount]++
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-primary" /> Vezetői Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Vállalati szintű teljesítménymutatók és statisztikák
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Aktív Célkitűzések (Nyitott)"
          value={`${activeKpis.length}`}
          sub={`Összesen: ${allKpis.length} KPI rögzítve`}
        />
        <KpiCard
          label="Átlagos Teljesítmény (Aktív)"
          value={`${avgActivePercent}%`}
          sub="Várható átlagos teljesülés"
        />
        <KpiCard
          label="Értékelt Dolgozók"
          value={`${totalEmployees}`}
          sub="Akik rendelkezhetnek céllal"
        />
      </div>

      {/* Workflow Előrehaladás */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-primary" /> Workflow Előrehaladás
          </CardTitle>
          <CardDescription>Az összes célkitűzés aktuális fázisa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/50 border">
              <div className="text-2xl font-semibold tabular-nums">{phaseCount.celkituzes}</div>
              <p className="text-xs text-muted-foreground mt-1">Célkitűzés</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-info/10 border border-info/20">
              <div className="text-2xl font-semibold tabular-nums text-info">{phaseCount.onertekeles}</div>
              <p className="text-xs text-muted-foreground mt-1">Önértékelés</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="text-2xl font-semibold tabular-nums text-primary">{phaseCount.vezetoi_ertekeles}</div>
              <p className="text-xs text-muted-foreground mt-1">Vez. értékelés</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="text-2xl font-semibold tabular-nums text-primary">{phaseCount.megbeszeles}</div>
              <p className="text-xs text-muted-foreground mt-1">Megbeszélés</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20">
              <div className="text-2xl font-semibold tabular-nums text-success">{phaseCount.lezart}</div>
              <p className="text-xs text-muted-foreground mt-1">Lezárt</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <DashboardCharts kpis={allKpis} cycles={cycles || []} />

      <div className="pt-6">
        <h2 className="text-xl font-semibold mb-4">Bérszámfejtési Összesítő (Lezárt értékek)</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left compact-table">
                <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Dolgozó</th>
                    <th className="px-4 py-3 font-medium">Aktív Célok Száma</th>
                    <th className="px-4 py-3 font-medium">Teljesítmény Index</th>
                    <th className="px-4 py-3 font-medium">Javasolt Prémium Sáv</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {employees?.map(emp => {
                    const empKpis = activeKpis.filter(k => k.dolgozo_id === emp.id)
                    if (empKpis.length === 0) return null
                    
                    let empTotal = 0
                    empKpis.forEach(k => empTotal += calculatePercent(k))
                    const empAvg = Math.round(empTotal / empKpis.length)
                    
                    let bonusLabel = "Fejlesztendő (Nincs)"
                    let bonusColor = "text-destructive"
                    if (empAvg >= 85) { bonusLabel = "Kiváló Prémium"; bonusColor = "text-success" }
                    else if (empAvg >= 60) { bonusLabel = "Normál Bónusz"; bonusColor = "text-warning" }

                    return (
                      <tr key={emp.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-medium">{(emp.felhasznalo_profil as any)?.nev || "Ismeretlen"}</td>
                        <td className="px-4 py-3 tabular-nums">{empKpis.length} db</td>
                        <td className="px-4 py-3 font-semibold tabular-nums">{empAvg}%</td>
                        <td className={`px-4 py-3 font-medium ${bonusColor}`}>{bonusLabel}</td>
                      </tr>
                    )
                  })}
                  {employees?.filter(emp => activeKpis.filter(k => k.dolgozo_id === emp.id).length > 0).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        Nincs értékelhető adat az aktív ciklusban.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
