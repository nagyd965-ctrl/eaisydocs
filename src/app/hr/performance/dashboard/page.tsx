import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ClipboardCheck, ArrowRight, UserCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { KpiCard } from "@/components/kpi-card"
import { DashboardCharts } from "./components/dashboard-charts"
import { requireHrAuthServer } from "@/utils/hr/hr-auth-guard"

export default async function DashboardPage() {
  const auth = await requireHrAuthServer(["hr_munkatars", "hr_vezeto", "admin", "auditor"])
  if (!auth.authorized || !auth.activeCompanyId) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-center">
        <div>
          <h2 className="text-2xl font-bold text-destructive mb-2">Hozzáférés Megtagadva</h2>
          <p className="text-muted-foreground">Csak HR munkatársak férhetnek hozzá a riportokhoz.</p>
        </div>
      </div>
    )
  }

  const { activeCompanyId } = auth
  const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"

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

  const [kpisRes, cyclesRes, employeesRes] = await Promise.all([
    supabaseAdmin
      .from("hr_teljesitmeny")
      .select("*, hr_teljesitmeny_ciklus(megnevezes, statusz)")
      .in("dolgozo_id", safeMemberIds)
      .or(`company_id.eq.${companyScope},company_id.is.null`),

    supabaseAdmin
      .from("hr_teljesitmeny_ciklus")
      .select("*")
      .or(`company_id.eq.${companyScope},company_id.is.null`),

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
      .in("id", safeMemberIds)
  ])

  const kpis = kpisRes.data || []
  const cycles = cyclesRes.data || []
  const employees = employeesRes.data || []

  // Számítások
  const totalEmployees = employees?.length || 0
  const activeKpis = kpis?.filter(k => k.hr_teljesitmeny_ciklus?.statusz === "nyitott" || k.hr_teljesitmeny_ciklus?.statusz === "aktiv") || []
  const allKpis = kpis || []
  
  const calculatePercent = (k: any) => {
    if (k.meroszam_tipusa === "szazalek") return k.aktualis_ertek || 0
    if (k.meroszam_tipusa === "igen_nem") return k.aktualis_ertek === 1 ? 100 : 0
    if (!k.cel_ertek || k.cel_ertek === 0) return 0
    const pct = ((k.aktualis_ertek || 0) / k.cel_ertek) * 100
    return Math.min(Math.round(pct), 100)
  }

  let totalActivePercent = 0
  activeKpis.forEach(k => {
    totalActivePercent += calculatePercent(k)
  })
  const avgActivePercent = activeKpis.length > 0 ? Math.round(totalActivePercent / activeKpis.length) : 0

  // Bónuszra jogosult dolgozók száma (≥60%)
  const evaluatedEmployeesWithAvg = employees.map(emp => {
    const empKpis = (activeKpis.length > 0 ? activeKpis : allKpis).filter(k => k.dolgozo_id === emp.id)
    if (empKpis.length === 0) return null
    let empTotal = 0
    empKpis.forEach(k => empTotal += calculatePercent(k))
    const empAvg = Math.round(empTotal / empKpis.length)
    return { ...emp, empKpis, empAvg }
  }).filter(Boolean) as any[]

  const bonusEligibleCount = evaluatedEmployeesWithAvg.filter(e => e.empAvg >= 60).length

  // Workflow fázis összegzés
  const phaseCount = { celkituzes: 0, onertekeles: 0, vezetoi_ertekeles: 0, megbeszeles: 0, lezart: 0 }
  allKpis.forEach(k => {
    const phase = k.workflow_fazis || (k.ertekeles_lezarva_datum ? "lezart" : k.ertekeles_szovege ? "vezetoi_ertekeles" : k.onertekeles_szovege ? "onertekeles" : "celkituzes")
    if (phase in phaseCount) phaseCount[phase as keyof typeof phaseCount]++
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      
      {/* Vissza gomb és fejléc */}
      <div>
        <Link href="/hr/performance" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Vissza a Teljesítményértékeléshez
        </Link>
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-2">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Vezetői Teljesítmény Riportok
            </h1>
            <p className="text-muted-foreground mt-1">
              Vállalati szintű teljesítménymutatók, ciklusösszegzők és prémiumjavaslatok.
            </p>
          </div>
        </div>
      </div>

      {/* Kanonikus Linear-flat KPI kártyák */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Aktív Célkitűzések"
          value={`${activeKpis.length} db`}
          sub={`Összesen ${allKpis.length} KPI rögzítve`}
        />
        <KpiCard
          label="Átlagos Teljesülés"
          value={`${avgActivePercent}%`}
          sub="Aktív ciklusban mért átlag"
        />
        <KpiCard
          label="Érintett Dolgozók"
          value={`${evaluatedEmployeesWithAvg.length} / ${totalEmployees} fő`}
          sub="Akik rendelkeznek kitűzött céllal"
        />
        <KpiCard
          label="Bónuszra Jogosult"
          value={`${bonusEligibleCount} fő`}
          sub="Legalább 60%-os teljesítéssel"
        />
      </div>

      {/* Workflow Előrehaladás Pipeline (Linear-flat) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-primary" /> Értékelési Workflow Előrehaladás
          </CardTitle>
          <CardDescription>A célkitűzések megoszlása a folyamat lépései szerint</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            
            <div className="p-3.5 rounded-lg border bg-card transition-colors hover:border-primary/40">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                1. Fázis
              </span>
              <div className="text-2xl font-semibold tabular-nums text-foreground">{phaseCount.celkituzes}</div>
              <p className="text-xs font-medium text-muted-foreground mt-1">Célkitűzés</p>
              <span className="text-[11px] text-muted-foreground block mt-0.5">Rögzítve</span>
            </div>

            <div className="p-3.5 rounded-lg border bg-card transition-colors hover:border-info/40">
              <span className="text-[10px] font-medium text-info uppercase tracking-wider block mb-1">
                2. Fázis
              </span>
              <div className="text-2xl font-semibold tabular-nums text-info">{phaseCount.onertekeles}</div>
              <p className="text-xs font-medium text-foreground mt-1">Önértékelés</p>
              <span className="text-[11px] text-muted-foreground block mt-0.5">Dolgozó értékel</span>
            </div>

            <div className="p-3.5 rounded-lg border bg-card transition-colors hover:border-primary/40">
              <span className="text-[10px] font-medium text-primary uppercase tracking-wider block mb-1">
                3. Fázis
              </span>
              <div className="text-2xl font-semibold tabular-nums text-primary">{phaseCount.vezetoi_ertekeles}</div>
              <p className="text-xs font-medium text-foreground mt-1">Vezetői értékelés</p>
              <span className="text-[11px] text-muted-foreground block mt-0.5">Pontozás és szöveg</span>
            </div>

            <div className="p-3.5 rounded-lg border bg-card transition-colors hover:border-primary/40">
              <span className="text-[10px] font-medium text-primary uppercase tracking-wider block mb-1">
                4. Fázis
              </span>
              <div className="text-2xl font-semibold tabular-nums text-primary">{phaseCount.megbeszeles}</div>
              <p className="text-xs font-medium text-foreground mt-1">Megbeszélés</p>
              <span className="text-[11px] text-muted-foreground block mt-0.5">1-on-1 lezajlott</span>
            </div>

            <div className="p-3.5 rounded-lg border bg-card transition-colors hover:border-success/40">
              <span className="text-[10px] font-medium text-success uppercase tracking-wider block mb-1">
                5. Fázis
              </span>
              <div className="text-2xl font-semibold tabular-nums text-success">{phaseCount.lezart}</div>
              <p className="text-xs font-medium text-foreground mt-1">Lezárt</p>
              <span className="text-[11px] text-muted-foreground block mt-0.5">Bérszámfejtésre kész</span>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Diagramok */}
      <DashboardCharts kpis={allKpis} cycles={cycles || []} />

      {/* Bérszámfejtési / Bónusz Összesítő */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Bérszámfejtési & Prémium Összesítő</h2>
            <p className="text-xs text-muted-foreground">
              A kollégák aktuális teljesítményindexe és a javasolt prémiumsávok
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/40 uppercase tracking-wider border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Dolgozó</th>
                    <th className="px-4 py-3 font-medium">Célok Száma</th>
                    <th className="px-4 py-3 font-medium">Teljesítmény Index</th>
                    <th className="px-4 py-3 font-medium">Javasolt Prémium Sáv</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {evaluatedEmployeesWithAvg.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                        Nincs értékelhető célkitűzés vagy adat az aktuális időszakban.
                      </td>
                    </tr>
                  ) : (
                    evaluatedEmployeesWithAvg.map(item => {
                      const nev = item.felhasznalo_profil?.nev || "Ismeretlen"
                      const initials = nev.substring(0, 2).toUpperCase()
                      const activeJogviszony = Array.isArray(item.hr_jogviszony) ? item.hr_jogviszony[0] : item.hr_jogviszony
                      const allBeosztas = activeJogviszony?.hr_beosztas
                      const activeBeosztas = Array.isArray(allBeosztas)
                        ? allBeosztas.find((b: any) => b.ervenyes_ig === null) || allBeosztas[0]
                        : allBeosztas
                      const munkakor = activeBeosztas?.hr_munkakor?.megnevezes || ""

                      let bonusLabel = "Fejlesztendő (0%)"
                      let badgeVariant = "bg-destructive/10 text-destructive border-destructive/20"
                      if (item.empAvg >= 85) {
                        bonusLabel = "Kiváló Prémium (100%)"
                        badgeVariant = "bg-success/10 text-success border-success/30 font-medium"
                      } else if (item.empAvg >= 60) {
                        bonusLabel = "Normál Bónusz (50-80%)"
                        badgeVariant = "bg-warning/10 text-warning border-warning/30 font-medium"
                      }

                      return (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={item.felhasznalo_profil?.avatar_url || ""} alt={nev} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-medium text-foreground block">{nev}</span>
                                {munkakor && (
                                  <span className="text-xs text-muted-foreground block">{munkakor}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 tabular-nums text-muted-foreground">
                            {item.empKpis.length} db KPI
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Progress value={item.empAvg} className="w-24 h-2" />
                              <span className="font-semibold tabular-nums">{item.empAvg}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={`text-xs ${badgeVariant}`}>
                              {bonusLabel}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })
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
