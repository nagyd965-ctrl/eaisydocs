import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CalendarDays, ArrowRight, Coffee, FileSignature } from "lucide-react"
import { createClient } from "@/utils/supabase/server"
import { TimeTrackingCard } from "@/components/hr/time-tracking-card"
import { CafeteriaDeclaration } from "@/components/hr/cafeteria-declaration"
import { EmployeeKpiCard } from "@/components/hr/employee-kpi-card"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function SelfServicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [adatlapRes, jogviszonyRes] = await Promise.all([
    supabase
      .from("hr_dolgozo_adatlap")
      .select("*, felhasznalo_profil(nev)")
      .eq("id", user.id)
      .single(),
    supabase
      .from("hr_jogviszony")
      .select("belepes_datuma, hr_beosztas(hr_munkakor(megnevezes))")
      .eq("dolgozo_id", user.id)
      .is("kilepes_datuma", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const adatlap = adatlapRes.data
  const jogviszony = jogviszonyRes.data
  const munkakorMegnevezes = (jogviszony?.hr_beosztas as any)?.[0]?.hr_munkakor?.megnevezes || null
  const belepesDatuma = jogviszony?.belepes_datuma || null

  // 1. Szabadság egyenleg számítása
  const { data: tavolletek } = await supabase
    .from("hr_tavollet")
    .select("*")
    .eq("dolgozo_id", user.id)
    .order("created_at", { ascending: false })

  const totalLeave = 25
  const usedLeave = tavolletek?.filter(t => t.tipus === "szabadsag" && t.statusz === "jovahagyva").length || 0
  const plannedLeave = tavolletek?.filter(t => t.tipus === "szabadsag" && t.statusz === "jovahagyasra_var").length || 0
  const pendingLeavesCount = tavolletek?.filter(t => t.statusz === "jovahagyasra_var").length || 0
  const remainingLeave = totalLeave - usedLeave

  // Legutóbbi 3 távollét kérelem
  const recentLeaves = tavolletek?.slice(0, 3) || []

  // 2. Időrögzítés státusz
  const { data: jelenlet } = await supabase
    .from("hr_jelenlet")
    .select("becsekkolas_ideje, kicsekkolas_ideje")
    .eq("dolgozo_id", user.id)
    .eq("datum", new Date().toISOString().split('T')[0])
    .single()
  
  let timeStatus: "none" | "checked_in" | "checked_out" = "none"
  if (jelenlet) {
    if (jelenlet.kicsekkolas_ideje) timeStatus = "checked_out"
    else timeStatus = "checked_in"
  }

  // 3. Céges dokumentumok ellenőrzése
  const { data: cegesDokumentumok } = await supabase
    .from("hr_ceges_dokumentum")
    .select(`id, hr_ceges_dokumentum_nyugtazas(id)`)
    .eq("aktiv", true)
    .eq("kotelezo_mindenkinek", true)
    .eq("hr_ceges_dokumentum_nyugtazas.dolgozo_id", user.id)

  const pendingDocsCount = cegesDokumentumok?.filter(d => !d.hr_ceges_dokumentum_nyugtazas || d.hr_ceges_dokumentum_nyugtazas.length === 0).length || 0

  const currentYear = new Date().getFullYear()
  const { data: cafeteriaKeret } = await supabase
    .from("hr_cafeteria_keret")
    .select("ev, osszeg, nyilatkozat_lezarva")
    .eq("dolgozo_id", user.id)
    .eq("ev", currentYear)
    .maybeSingle()

  const { data: cafeteriaKatalogus } = await supabase
    .from("hr_cafeteria_katalogus")
    .select("*")
    .eq("aktiv", true)
    .order("nev")

  const { data: cafeteriaValasztasok } = await supabase
    .from("hr_cafeteria_valasztas")
    .select("*")
    .eq("dolgozo_id", user.id)
    .eq("ev", currentYear)

  const { createClient: createAdminClient } = await import("@supabase/supabase-js")
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: kpis } = await supabaseAdmin
    .from("hr_teljesitmeny")
    .select("*, hr_teljesitmeny_ciklus(megnevezes)")
    .eq("dolgozo_id", user.id)
    .order("created_at", { ascending: false })

  const { data: kpiLogs } = await supabaseAdmin
    .from("hr_esemeny_naplo")
    .select("*, felhasznalo_profil(nev)")
    .eq("entitas_tipus", "hr_teljesitmeny")
    .order("created_at", { ascending: true })

  const nev = adatlap?.felhasznalo_profil?.nev || "Dolgozó"

  const statuszLabel: Record<string, string> = {
    jovahagyva: "Jóváhagyva",
    jovahagyasra_var: "Jóváhagyásra vár",
    elutasitva: "Elutasítva",
  }

  return (
    <div className="space-y-6 pb-10">

      {/* Fejléc: cím + akciógombok */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Áttekintés</h1>
          <p className="text-muted-foreground mt-1">
            Üdvözlünk, {nev}! Ez a személyes irányítópultod.
          </p>
        </div>
        <Link href="/hr/self-service/dokumentumok">
          <Button variant="outline" className="relative">
            <FileSignature className="w-4 h-4 mr-2 text-primary" />
            Céges Szabályzatok
            {pendingDocsCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse">
                {pendingDocsCount}
              </span>
            )}
          </Button>
        </Link>
      </div>

      {/* Hero üdvözlő banner */}
      <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 p-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-primary-foreground">
            Üdvözlünk, {nev}!
          </h2>
          <p className="text-primary-foreground/80 mt-1 text-sm">
            {munkakorMegnevezes && (
              <span>{munkakorMegnevezes}</span>
            )}
            {munkakorMegnevezes && belepesDatuma && <span> · </span>}
            {belepesDatuma && (
              <span>Belépés: {new Date(belepesDatuma).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" })}</span>
            )}
            {!munkakorMegnevezes && !belepesDatuma && (
              <span>Jó munkát kívánunk a mai napra!</span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
            timeStatus === "checked_in"
              ? "bg-emerald-500/20 text-emerald-100 border-emerald-400/40"
              : timeStatus === "checked_out"
              ? "bg-white/10 text-white/70 border-white/20"
              : "bg-white/10 text-white/70 border-white/20"
          }`}>
            {timeStatus === "checked_in" ? "🟢 Becsekkolva" : timeStatus === "checked_out" ? "✅ Mai nap lezárva" : "⚪ Még nincs becsekkolva"}
          </span>
          <p className="text-primary-foreground/60 text-xs">
            {new Date().toLocaleDateString("hu-HU", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stat kártyák sora */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Szabadság marad */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-5 pb-4">
            <p className="text-2xl font-semibold tabular-nums text-primary">{remainingLeave}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Szabadság marad</p>
          </CardContent>
        </Card>
        {/* Felhasznált */}
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-5 pb-4">
            <p className="text-2xl font-semibold tabular-nums text-amber-600">{usedLeave}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Felhasznált nap</p>
          </CardContent>
        </Card>
        {/* Függőben lévő kérelem */}
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="pt-5 pb-4">
            <p className="text-2xl font-semibold tabular-nums text-destructive">{pendingLeavesCount}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Függőben lévő kérelem</p>
          </CardContent>
        </Card>
        {/* Cafeteria */}
        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="pt-5 pb-4">
            <p className="text-2xl font-semibold tabular-nums text-violet-600">{cafeteriaKeret ? currentYear : "–"}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Cafeteria aktív</p>
          </CardContent>
        </Card>
      </div>

      {/* Főrács: Időrögzítés + Szabadság + Kérelmek */}
      <div className="grid gap-6 md:grid-cols-3">

        {/* Időadat Rögzítés */}
        <TimeTrackingCard
          initialStatus={timeStatus}
          checkInTime={jelenlet?.becsekkolas_ideje || null}
          checkOutTime={jelenlet?.kicsekkolas_ideje || null}
        />

        {/* Szabadság egyenleg */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">Szabadság ({new Date().getFullYear()})</CardTitle>
              <p className="text-xs text-muted-foreground">Éves alapszabadság + pótszabadságok</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-semibold tabular-nums">{remainingLeave}</span>
                <span className="text-muted-foreground text-sm">nap maradt</span>
              </div>
              <span className="text-sm text-muted-foreground">Összesen: {totalLeave} nap</span>
            </div>
            <Progress value={(usedLeave / totalLeave) * 100} className="mt-4 h-2" />
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Felhasznált: {usedLeave} nap</span>
              <span>Tervezett: {plannedLeave} nap</span>
            </div>
            <Link href="/hr/self-service/time" className="mt-4 flex items-center text-sm text-primary hover:underline font-medium">
              Részletek megtekintése <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </CardContent>
        </Card>

        {/* Legutóbbi Kérelmek */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Legutóbbi Kérelmek</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLeaves.length > 0 ? (
                recentLeaves.map((leave: any) => (
                  <div key={leave.id} className="flex justify-between items-center text-sm border-b border-border pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">
                        {leave.tipus === "szabadsag" ? "Szabadság" : leave.tipus}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {leave.kezdo_datum && !isNaN(new Date(leave.kezdo_datum).getTime())
                          ? new Date(leave.kezdo_datum).toLocaleDateString("hu-HU")
                          : "–"}
                        {" – "}
                        {leave.veg_datum && !isNaN(new Date(leave.veg_datum).getTime())
                          ? new Date(leave.veg_datum).toLocaleDateString("hu-HU")
                          : "–"}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                      leave.statusz === "jovahagyva"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : leave.statusz === "elutasitva"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}>
                      {statuszLabel[leave.statusz] ?? leave.statusz}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nincsenek kérelmek.</p>
              )}
            </div>
            <Link href="/hr/self-service/time" className="mt-4 flex items-center text-sm text-primary hover:underline font-medium">
              Összes megtekintése <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Juttatások + Céljaim – valós komponensek, közvetlenül betöltve */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">

        {cafeteriaKeret ? (
          <CafeteriaDeclaration
            employeeId={user.id}
            year={currentYear}
            budget={cafeteriaKeret.osszeg}
            isClosed={cafeteriaKeret.nyilatkozat_lezarva}
            catalog={cafeteriaKatalogus || []}
            existingChoices={cafeteriaValasztasok || []}
          />
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Coffee className="w-4 h-4 text-primary" /> Juttatások
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Nincs beállítva cafeteria keret erre az évre.</p>
            </CardContent>
          </Card>
        )}

        <EmployeeKpiCard kpis={kpis || []} logs={kpiLogs || []} />

      </div>

    </div>
  )
}

