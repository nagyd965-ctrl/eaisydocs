import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Users, UserPlus, Calendar, Briefcase, AlertCircle, Clock, ChevronRight, PlusCircle, CheckCircle2 } from "lucide-react"
import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { ReassignLeavesButton } from "@/components/hr/reassign-leaves-button"

export default async function HrOverviewPage() {
  const supabase = await createClient()

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Fetch data in parallel
  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]
  
  const thirtyDaysFromNow = new Date(today)
  thirtyDaysFromNow.setDate(today.getDate() + 30)
  const thirtyDaysStr = thirtyDaysFromNow.toISOString().split("T")[0]

  const threeMonthsAgo = new Date(today)
  threeMonthsAgo.setMonth(today.getMonth() - 3)
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().split("T")[0]
  
  const threeMonthsAnd14DaysAgo = new Date(threeMonthsAgo)
  threeMonthsAnd14DaysAgo.setDate(threeMonthsAgo.getDate() + 14)
  const threeMonthsAnd14DaysAgoStr = threeMonthsAnd14DaysAgo.toISOString().split("T")[0]

  const [
    { count: activeEmployees },
    { count: openPositions },
    { count: activeOnboardings },
    { count: todayAbsences },
    { data: recruitingData },
    { data: pendingLeaves },
    { data: expiringMedicals },
    { data: expiringProbations },
    { data: expiringContracts }
  ] = await Promise.all([
    supabase.from("hr_dolgozo_adatlap").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("hr_toborzas").select("*", { count: "exact", head: true }).eq("statusz", "uj"),
    supabase.from("hr_onboarding").select("*", { count: "exact", head: true }).in("statusz", ["elokeszites", "folyamatban"]),
    supabase.from("hr_tavollet").select("*", { count: "exact", head: true })
      .lte("kezdet_datuma", todayStr)
      .gte("veg_datuma", todayStr),
    supabaseAdmin.from("hr_toborzas").select("statusz"),
    
    // INBOX QUERIES
    supabase.from("hr_tavollet")
      .select(`
        id, 
        kezdet_datuma, 
        veg_datuma, 
        hr_dolgozo_adatlap(id, felhasznalo_profil(nev))
      `)
      .eq("statusz", "jovahagyasra_var"),
      
    supabase.from("hr_dolgozo_adatlap")
      .select(`id, orvosi_alkalmassag_ervenyesseg, felhasznalo_profil(nev)`)
      .not("orvosi_alkalmassag_ervenyesseg", "is", null)
      .lte("orvosi_alkalmassag_ervenyesseg", thirtyDaysStr)
      .gte("orvosi_alkalmassag_ervenyesseg", todayStr),
      
    supabase.from("hr_dolgozo_adatlap")
      .select(`id, probaido_vege, felhasznalo_profil(nev)`)
      .not("probaido_vege", "is", null)
      .lte("probaido_vege", thirtyDaysStr)
      .gte("probaido_vege", todayStr),

    supabase.from("hr_dolgozo_adatlap")
      .select(`id, munkaviszony_vege, szerzodes_tipusa, felhasznalo_profil(nev)`)
      .eq("szerzodes_tipusa", "határozott")
      .not("munkaviszony_vege", "is", null)
      .lte("munkaviszony_vege", thirtyDaysStr)
      .gte("munkaviszony_vege", todayStr)
  ])

  const hasTasks = !!(
    (expiringMedicals && expiringMedicals.length > 0) || 
    (pendingLeaves && pendingLeaves.length > 0) || 
    (expiringProbations && expiringProbations.length > 0) ||
    (expiringContracts && expiringContracts.length > 0)
  )

  // Process Recruiting Data for ATS widget
  const recruitingStats = { uj: 0, interju: 0, ajanlat: 0 }
  let totalCandidates = 0
  if (recruitingData) {
    recruitingData.forEach(r => {
      totalCandidates++
      if (r.statusz === 'uj') recruitingStats.uj++
      if (r.statusz === 'interju') recruitingStats.interju++
      if (r.statusz === 'ajanlat') recruitingStats.ajanlat++
    })
  }

  return (
    <div className="space-y-8">
      {/* Fejléc */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Központi Áttekintés</h1>
          <p className="text-muted-foreground mt-2">
            Üdvözlünk az eaisyHR irányítópultján. Itt áttekintheted a szervezet aktuális HR folyamatait.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/hr/admin">
            <Button variant="outline" className="gap-2">
              <Users className="w-4 h-4" /> Dolgozók
            </Button>
          </Link>
          <Link href="/hr/recruitment">
            <Button className="gap-2 bg-primary">
              <PlusCircle className="w-4 h-4" /> Új Toborzás
            </Button>
          </Link>
        </div>
      </div>
      
      {/* 1. Napi / Heti Áttekintő Sáv (Hero Metrics) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktív Dolgozók</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmployees || 0} fő</div>
            <p className="text-xs text-muted-foreground mt-1 text-emerald-500 font-medium">
              +1 fő az elmúlt hónapban
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mai Hiányzók</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAbsences || 0} fő</div>
            <p className="text-xs text-muted-foreground mt-1">
              Engedélyezett és függőben lévő távollétek
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nyitott Pozíciók</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{openPositions || 0} db</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aktív toborzási folyamat
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktív Onboarding</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOnboardings || 0} fő</div>
            <p className="text-xs text-muted-foreground mt-1">
              Beléptetés folyamatban
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* 2. Teendők és Értesítések (Inbox) */}
        <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>HR Teendők & Figyelmeztetések</CardTitle>
              <CardDescription>Aktuális feladatok, amik figyelmet igényelnek.</CardDescription>
            </div>
            <ReassignLeavesButton />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!hasTasks && (
                <div className="text-center p-6 text-muted-foreground border rounded-lg border-dashed">
                  Nincsenek aktuális, figyelmet igénylő HR teendők.
                </div>
              )}

              {expiringMedicals?.map((doc) => (
                <div key={`med-${doc.id}`} className="flex items-start gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">Lejáró orvosi alkalmassági ({(doc.felhasznalo_profil as any)?.nev})</h4>
                    <p className="text-sm text-muted-foreground mt-1">Az orvosi igazolás érvényessége 30 napon belül lejár ({doc.orvosi_alkalmassag_ervenyesseg}).</p>
                  </div>
                  <Link href={`/hr/employee/${doc.id}`}>
                    <Button variant="ghost" size="sm">Megtekintés</Button>
                  </Link>
                </div>
              ))}

              {pendingLeaves?.map((leave) => (
                <div key={`leave-${leave.id}`} className="flex items-start gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <Clock className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">Jóváhagyásra váró szabadság</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {/* @ts-ignore - nested join type bypass */}
                      {leave.hr_dolgozo_adatlap?.felhasznalo_profil?.nev || "Ismeretlen"} szabadságkérelme: {leave.kezdet_datuma} - {leave.veg_datuma}.
                    </p>
                  </div>
                  <Link href="/hr/manager">
                    <Button variant="ghost" size="sm">Megtekintés</Button>
                  </Link>
                </div>
              ))}

              {expiringProbations?.map((prob) => (
                <div key={`prob-${prob.id}`} className="flex items-start gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">Próbaidő lejár ({(prob.felhasznalo_profil as any)?.nev})</h4>
                    <p className="text-sm text-muted-foreground mt-1">A dolgozó 3 hónapos próbaideje hamarosan lejár. Értékelés szükséges.</p>
                  </div>
                  <Link href={`/hr/employee/${prob.id}`}>
                    <Button variant="ghost" size="sm">Értékelés</Button>
                  </Link>
                </div>
              ))}

              {/* Lejáró határozott idejű szerződések */}
              {expiringContracts && expiringContracts.length > 0 &&
                expiringContracts.map((emp) => (
                  <div key={`contract-${emp.id}`} className="flex items-start gap-4 p-3 rounded-lg bg-orange-50/50 border border-orange-100">
                    <div className="mt-0.5 rounded-full p-1 bg-orange-100">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">Lejáró Munkaszerződés</p>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{(emp.felhasznalo_profil as any)?.nev}</span> határozott idejű szerződése hamarosan lejár ({new Date(emp.munkaviszony_vege).toLocaleDateString("hu-HU")}).
                      </p>
                    </div>
                    <Link href={`/hr/employee/${emp.id}`}>
                      <Button variant="outline" size="sm">Hosszabbítás</Button>
                    </Link>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* 3. Toborzási Tölcsér (Mini-ATS Widget) */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Toborzási Áttekintő</CardTitle>
            <CardDescription>A legfrissebb jelentkezők státusza.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Új jelentkezők</span>
                  <span className="text-muted-foreground">{recruitingStats.uj} fő</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${totalCandidates > 0 ? (recruitingStats.uj / totalCandidates) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Interjú fázisban</span>
                  <span className="text-muted-foreground">{recruitingStats.interju} fő</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${totalCandidates > 0 ? (recruitingStats.interju / totalCandidates) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Ajánlat kiküldve</span>
                  <span className="text-muted-foreground">{recruitingStats.ajanlat} fő</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${totalCandidates > 0 ? (recruitingStats.ajanlat / totalCandidates) * 100 : 0}%` }}></div>
                </div>
              </div>

              <Link href="/hr/recruitment" className="block mt-6">
                <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
                  Összes jelölt megtekintése <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
