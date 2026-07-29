import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { BarChart3, TrendingUp, Users, Target } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" /> Vezetői Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Vállalati szintű teljesítménymutatók és statisztikák
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aktív Célkitűzések (Nyitott)</CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeKpis.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Összesen: {allKpis.length} KPI rögzítve</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Átlagos Teljesítmény (Aktív)</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{avgActivePercent}%</div>
            <p className="text-xs text-muted-foreground mt-1">Várható átlagos teljesülés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Értékelt Dolgozók</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground mt-1">Akik rendelkezhetnek céllal</p>
          </CardContent>
        </Card>
      </div>

      <DashboardCharts kpis={allKpis} cycles={cycles || []} />

      <div className="pt-6">
        <h2 className="text-xl font-semibold mb-4">Bérszámfejtési Összesítő (Lezárt értékek)</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Dolgozó ID</th>
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
                        <td className="px-4 py-3">{empKpis.length} db</td>
                        <td className="px-4 py-3 font-bold">{empAvg}%</td>
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
