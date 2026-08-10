import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Users, UserPlus, CalendarX, Briefcase, AlertCircle, Clock, ChevronRight, PlusCircle, CheckCircle2 } from "lucide-react"
import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { ReassignLeavesButton } from "@/components/hr/reassign-leaves-button"
import { redirect } from "next/navigation"

export default async function HrOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("hr_szerepkor")
    .eq("id", user.id)
    .single()

  const isHrOrAdmin = ["hr_munkatars", "hr_vezeto", "admin", "rendszergazda", "auditor"].includes(profile?.hr_szerepkor || "")
  if (!isHrOrAdmin) {
    redirect("/hr/self-service/profile")
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]

  const thirtyDaysFromNow = new Date(today)
  thirtyDaysFromNow.setDate(today.getDate() + 30)
  const thirtyDaysStr = thirtyDaysFromNow.toISOString().split("T")[0]

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

    supabase.from("hr_tavollet")
      .select(`id, kezdet_datuma, veg_datuma, hr_dolgozo_adatlap(id, felhasznalo_profil(nev))`)
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

  const recruitingStats = { uj: 0, interju: 0, ajanlat: 0 }
  let totalCandidates = 0
  if (recruitingData) {
    recruitingData.forEach(r => {
      totalCandidates++
      if (r.statusz === "uj") recruitingStats.uj++
      if (r.statusz === "interju") recruitingStats.interju++
      if (r.statusz === "ajanlat") recruitingStats.ajanlat++
    })
  }

  const pct = (n: number) =>
    totalCandidates > 0 ? Math.round((n / totalCandidates) * 100) : 0

  return (
    <div className="space-y-8 pb-10">

      {/* Fejléc */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Központi Áttekintés</h1>
          <p className="text-muted-foreground mt-1">
            Üdvözlünk az eaisyHR irányítópultján. Itt áttekintheted a szervezet aktuális HR folyamatait.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/hr/admin">
            <Button variant="outline" className="gap-2">
              <Users className="w-4 h-4" /> Dolgozók
            </Button>
          </Link>
          <Link href="/hr/recruitment">
            <Button className="gap-2">
              <PlusCircle className="w-4 h-4" /> Új Toborzás
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat kártyák */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-primary">{activeEmployees ?? 0} fő</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Aktív Dolgozók</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="h-9 w-9 rounded-lg bg-warning-subtle flex items-center justify-center shrink-0">
              <CalendarX className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-warning">{todayAbsences ?? 0} fő</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Mai Hiányzók</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-info">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="h-9 w-9 rounded-lg bg-info-subtle flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4 text-info" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-info">{openPositions ?? 0} db</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Nyitott Pozíciók</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-violet-600">{activeOnboardings ?? 0} fő</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Aktív Onboarding</p>
            </div>
          </CardContent>
        </Card>

      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">

        {/* HR Teendők */}
        <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base font-semibold">HR Teendők & Figyelmeztetések</CardTitle>
              <CardDescription className="mt-0.5">Aktuális feladatok, amik figyelmet igényelnek.</CardDescription>
            </div>
            <ReassignLeavesButton />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {!hasTasks && (
                <div className="text-center p-6 text-sm text-muted-foreground border border-dashed rounded-lg">
                  Nincsenek aktuális, figyelmet igénylő HR teendők.
                </div>
              )}

              {/* Lejáró orvosi */}
              {expiringMedicals?.map((doc) => (
                <div key={`med-${doc.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-l-4 border-l-destructive hover:bg-muted/40 transition-colors">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Lejáró orvosi alkalmassági</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {(doc.felhasznalo_profil as any)?.nev} – érvényes: {doc.orvosi_alkalmassag_ervenyesseg}
                    </p>
                  </div>
                  <Link href={`/hr/employee/${doc.id}`}>
                    <Button variant="ghost" size="sm" className="shrink-0 h-7 text-xs">Megtekintés</Button>
                  </Link>
                </div>
              ))}

              {/* Jóváhagyásra váró szabadság */}
              {pendingLeaves?.map((leave) => (
                <div key={`leave-${leave.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-l-4 border-l-warning hover:bg-muted/40 transition-colors">
                  <Clock className="w-4 h-4 text-warning shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Jóváhagyásra váró szabadság</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {/* @ts-ignore */}
                      {leave.hr_dolgozo_adatlap?.felhasznalo_profil?.nev || "Ismeretlen"} szabadságkérelme: {leave.kezdet_datuma} – {leave.veg_datuma}
                    </p>
                  </div>
                  <Link href="/hr/manager">
                    <Button variant="ghost" size="sm" className="shrink-0 h-7 text-xs">Megtekintés</Button>
                  </Link>
                </div>
              ))}

              {/* Lejáró próbaidő */}
              {expiringProbations?.map((prob) => (
                <div key={`prob-${prob.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-l-4 border-l-success hover:bg-muted/40 transition-colors">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Próbaidő lejár – {(prob.felhasznalo_profil as any)?.nev}</p>
                    <p className="text-xs text-muted-foreground">Értékelés szükséges. Lejár: {prob.probaido_vege}</p>
                  </div>
                  <Link href={`/hr/employee/${prob.id}`}>
                    <Button variant="ghost" size="sm" className="shrink-0 h-7 text-xs">Értékelés</Button>
                  </Link>
                </div>
              ))}

              {/* Lejáró határozott idejű szerződések */}
              {expiringContracts?.map((emp) => (
                <div key={`contract-${emp.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-l-4 border-l-orange-400 hover:bg-muted/40 transition-colors">
                  <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Lejáró Munkaszerződés</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {(emp.felhasznalo_profil as any)?.nev} – lejár: {new Date(emp.munkaviszony_vege).toLocaleDateString("hu-HU")}
                    </p>
                  </div>
                  <Link href={`/hr/employee/${emp.id}`}>
                    <Button variant="outline" size="sm" className="shrink-0 h-7 text-xs">Hosszabbítás</Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Toborzási Áttekintő */}
        <Card className="col-span-3">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Toborzási Áttekintő</CardTitle>
            <CardDescription className="mt-0.5">A legfrissebb jelentkezők státusza.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">

              {/* Új jelentkezők */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <div className="w-2 h-2 rounded-full bg-info shrink-0" />
                    Új jelentkezők
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-info-subtle text-info text-[11px] font-semibold tabular-nums">
                    {recruitingStats.uj} fő
                  </span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-info rounded-full transition-all" style={{ width: `${pct(recruitingStats.uj)}%` }} />
                </div>
              </div>

              {/* Interjú fázisban */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <div className="w-2 h-2 rounded-full bg-warning shrink-0" />
                    Interjú fázisban
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-warning-subtle text-warning text-[11px] font-semibold tabular-nums">
                    {recruitingStats.interju} fő
                  </span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-warning rounded-full transition-all" style={{ width: `${pct(recruitingStats.interju)}%` }} />
                </div>
              </div>

              {/* Ajánlat kiküldve */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <div className="w-2 h-2 rounded-full bg-success shrink-0" />
                    Ajánlat kiküldve
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-success-subtle text-success text-[11px] font-semibold tabular-nums">
                    {recruitingStats.ajanlat} fő
                  </span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full transition-all" style={{ width: `${pct(recruitingStats.ajanlat)}%` }} />
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <Link href="/hr/recruitment">
                  <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground h-8 text-sm">
                    Összes jelölt megtekintése <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
