import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowRight } from "lucide-react"
import { createClient } from "@/utils/supabase/server"
import { TimeTrackingCard } from "@/components/hr/time-tracking-card"
import { EmployeeKpiWidget } from "@/components/hr/employee-kpi-widget"
import { CafeteriaDeclaration } from "@/components/hr/cafeteria-declaration"
import { redirect } from "next/navigation"
import Link from "next/link"
import { calculateAnnualLeave, calculateWorkingDays } from "@/utils/hr/leave-calculator"
import { KpiCard } from "@/components/kpi-card"

export default async function SelfServicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const currentYear = new Date().getFullYear()

  // Aktív cég feloldása (cégszűrés a több-bérlős elkülönítéshez)
  const { getActiveCompanyIdServer } = await import("@/utils/company-server")
  const activeCompanyId = await getActiveCompanyIdServer()

  // Cégszűrő feltétel (van company_id oszlop a táblán és van aktív cég)
  const cs = (q: any) => activeCompanyId ? q.eq("company_id", activeCompanyId) : q
  const todayBudapestStr = (() => {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Budapest",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date())
    } catch {
      return new Date().toISOString().split("T")[0]
    }
  })()

  // ── Párhuzamos adatbetöltés (P3-javítás 2026-11-01): minden DB-hívás egyszerre ──
  // P1-javítás (2026-11-01): minden céges táblára aktív-cég szűrés — korábban a
  // többcéges dolgozó MINDEN cég adatait látta mindkét nézetben
  const [
    adatlapRes,
    jogviszonyRes,
    tavolletekRes,
    holidaysRes,
    jelenletRes,
    tuloraEgyenlegRes,
    korrekcioCountRes,
    tuloraCountRes,
    korrekcioListRes,
    tuloraListRes,
    cafeteriaKeretRes,
    cafeteriaKatalogusRes,
    cafeteriaValasztasokRes,
    kpisRes,
  ] = await Promise.all([
    supabase
      .from("hr_dolgozo_adatlap")
      .select("*, felhasznalo_profil(nev)")
      .eq("id", user.id)
      .single(),
    cs(supabase
      .from("hr_jogviszony")
      .select("belepes_datuma, hr_beosztas(ervenyes_ig, hr_munkakor(megnevezes))")
      .eq("dolgozo_id", user.id)
      .is("kilepes_datuma", null)
      .order("created_at", { ascending: false }))
      .limit(1)
      .maybeSingle(),
    cs(supabase
      .from("hr_tavollet")
      .select("*")
      .eq("dolgozo_id", user.id))
      .order("created_at", { ascending: false }),
    supabase
      .from("hr_munkaszuneti_nap")
      .select("datum")
      .gte("datum", `${currentYear}-01-01`)
      .lte("datum", `${currentYear}-12-31`)
      .eq("athelye_munkanap", false),
    cs(supabase
      .from("hr_jelenlet")
      .select("becsekkolas_ideje, kicsekkolas_ideje, szunet_perc, szunet_ms, szunet_kezdete")
      .eq("dolgozo_id", user.id)
      .eq("datum", todayBudapestStr))
      .single(),
    cs(supabase
      .from("hr_tulora_egyenleg")
      .select("perc")
      .eq("dolgozo_id", user.id))
      .maybeSingle(),
    // Függő kérelmek száma (mind a 3 típus — a KPI-hoz)
    cs(supabase
      .from("hr_jelenlet_korrekcio")
      .select("id", { count: "exact", head: true })
      .eq("dolgozo_id", user.id)
      .eq("statusz", "jovahagyasra_var")),
    (async () => {
      const res = await cs(supabase
        .from("hr_tulora_felhasznalás")
        .select("id", { count: "exact", head: true })
        .eq("dolgozo_id", user.id)
        .eq("statusz", "jovahagyasra_var"))
      if (res.error && activeCompanyId) {
        return supabase
          .from("hr_tulora_felhasznalás")
          .select("id", { count: "exact", head: true })
          .eq("dolgozo_id", user.id)
          .eq("statusz", "jovahagyasra_var")
      }
      return res
    })(),
    // Kérések listája — korrekciók és túlórák is (P1-javítás 2026-11-01)
    cs(supabase
      .from("hr_jelenlet_korrekcio")
      .select("id, datum, uj_becsekkolas, uj_kicsekkolas, statusz, created_at")
      .eq("dolgozo_id", user.id))
      .order("created_at", { ascending: false })
      .limit(5),
    (async () => {
      const res = await cs(supabase
        .from("hr_tulora_felhasznalás")
        .select("id, tipus, orak, statusz, created_at")
        .eq("dolgozo_id", user.id))
        .order("created_at", { ascending: false })
        .limit(5)
      if (res.error && activeCompanyId) {
        return supabase
          .from("hr_tulora_felhasznalás")
          .select("id, tipus, orak, statusz, created_at")
          .eq("dolgozo_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5)
      }
      return res
    })(),
    cs(supabase
      .from("hr_cafeteria_keret")
      .select("ev, osszeg, nyilatkozat_lezarva, iktatoszam")
      .eq("dolgozo_id", user.id)
      .eq("ev", currentYear))
      .maybeSingle(),
    supabase
      .from("hr_cafeteria_katalogus")
      .select("id, nev, leiras, szorzo, kategoria")
      .eq("aktiv", true)
      .order("nev"),
    cs(supabase
      .from("hr_cafeteria_valasztas")
      .select("katalogus_elem_id, kert_osszeg, levont_keret_osszeg")
      .eq("dolgozo_id", user.id)
      .eq("ev", currentYear)),
    // KPI-k: session-kliensen az RLS blokkolja a sima dolgozó elől (a hr_teljesitmeny
    // tábla csak HR-modulos usernek nyitott) — service-role kell a saját KPI-k olvasásához
    // + cég-szűrés (P1-javítás: többcéges dolgozó csak az aktív cég KPI-jait látja)
    (async () => {
      const { createClient: createAdminClient } = await import("@supabase/supabase-js")
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      let q = adminClient
        .from("hr_teljesitmeny")
        .select("*, hr_teljesitmeny_ciklus(megnevezes)")
        .eq("dolgozo_id", user.id)
      if (activeCompanyId) {
        q = q.eq("company_id", activeCompanyId)
      }
      return q.order("created_at", { ascending: false })
    })(),
  ])

  const adatlap = adatlapRes.data
  const jogviszony = jogviszonyRes.data
  const tavolletek: any[] = tavolletekRes.data || []
  const holidaysData = holidaysRes.data
  const jelenlet = jelenletRes.data
  const kpis = kpisRes.data
  const beosztasList = Array.isArray(jogviszony?.hr_beosztas)
    ? jogviszony.hr_beosztas
    : jogviszony?.hr_beosztas
    ? [jogviszony.hr_beosztas]
    : []
  const activeBeosztas: any = beosztasList.find((b: any) => !b.ervenyes_ig)
  const activeMunkakor = Array.isArray(activeBeosztas?.hr_munkakor)
    ? activeBeosztas.hr_munkakor[0]
    : activeBeosztas?.hr_munkakor
  const munkakorMegnevezes = activeMunkakor?.megnevezes || null
  const belepesDatuma = jogviszony?.belepes_datuma || null

  // 1. Szabadság egyenleg számítás (a párhuzamos lekérdezés eredményeiből)
  const holidayDates = (holidaysData || []).map((h: any) => h.datum as string)

  const yearStart = `${currentYear}-01-01`
  const yearEnd = `${currentYear}-12-31`

  const getLeaveWorkingDays = (t: any) => {
    if (!t.kezdet_datuma || !t.veg_datuma) return 0
    if (t.veg_datuma < yearStart || t.kezdet_datuma > yearEnd) return 0
    if (typeof t.munkanapok_szama === "number" && t.munkanapok_szama > 0) {
      return t.munkanapok_szama
    }
    const startStr = t.kezdet_datuma > yearStart ? t.kezdet_datuma : yearStart
    const endStr = t.veg_datuma < yearEnd ? t.veg_datuma : yearEnd
    return calculateWorkingDays(startStr, endStr, holidayDates)
  }

  const isPaidLeaveType = (tipus: string | undefined) =>
    ["szabadsag", "alapszabadsag", "fizetett"].includes((tipus || "").toLowerCase())

  const totalLeave = calculateAnnualLeave(
    adatlap?.szuletesi_datum || adatlap?.szuletesi_ido,
    adatlap?.gyermekek_szama,
    adatlap?.megvaltozott_munkakepessegu,
    currentYear
  )

  const usedLeave = (tavolletek || [])
    .filter(t => isPaidLeaveType(t.tipus) && t.statusz === "jovahagyva")
    .reduce((sum, t) => sum + getLeaveWorkingDays(t), 0)

  const plannedLeave = (tavolletek || [])
    .filter(t => isPaidLeaveType(t.tipus) && t.statusz === "jovahagyasra_var")
    .reduce((sum, t) => sum + getLeaveWorkingDays(t), 0)

  const pendingLeavesCount = tavolletek?.filter(t => t.statusz === "jovahagyasra_var").length || 0
  const remainingLeave = Math.max(0, totalLeave - usedLeave)

  // P1-javítás (2026-11-01): a „Függőben Lévő" KPI mind a 3 típusból számol
  // (a párhuzamos lekérdezés eredményeiből)
  const pendingRequestsCount =
    pendingLeavesCount +
    (korrekcioCountRes.count || 0) +
    (tuloraCountRes.count || 0)

  // ── P1-javítás (2026-11-01): Kérések listája — mind a 3 típus (szabadság + korrekció + túlóra) ──
  type AllRequest = {
    id: string
    type: "szabadsag" | "korrekcio" | "tulora"
    title: string
    detail: string
    statusz: string
    createdAt: string
  }
  const allRequests: AllRequest[] = [
    ...(tavolletek || []).slice(0, 5).map((t: any) => ({
      id: t.id,
      type: "szabadsag" as const,
      title: t.tipus === "szabadsag" ? "Szabadság" : t.tipus === "beteg" ? "Betegszabadság" : t.tipus === "betegszabadsag" ? "Betegszabadság" : t.tipus,
      detail: `${t.kezdet_datuma?.slice(0, 10) || "–"} – ${t.veg_datuma?.slice(0, 10) || "–"}`,
      statusz: t.statusz,
      createdAt: t.created_at,
    })),
    ...(korrekcioListRes.data || []).map((k: any) => ({
      id: k.id,
      type: "korrekcio" as const,
      title: "Jelenlétkorrekció",
      detail: `${k.datum} · ${(k.uj_becsekkolas || "").slice(0, 5)} → ${(k.uj_kicsekkolas || "").slice(0, 5)}`,
      statusz: k.statusz,
      createdAt: k.created_at,
    })),
    ...(tuloraListRes.data || []).map((o: any) => ({
      id: o.id,
      type: "tulora" as const,
      title: o.tipus === "kifizetes" ? "Túlóra kifizetés" : "Túlóra lecsúsztatás",
      detail: `${o.orak || "?"} óra`,
      statusz: o.statusz,
      createdAt: o.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const recentRequests = allRequests.slice(0, 5)
  const requestTypeLabel: Record<string, string> = {
    szabadsag: "Szabadság",
    korrekcio: "Korrekció",
    tulora: "Túlóra",
  }
  const requestTypeColor: Record<string, string> = {
    szabadsag: "bg-primary/10 text-primary",
    korrekcio: "bg-info/10 text-info",
    tulora: "bg-warning/10 text-warning",
  }

  // 2. Időrögzítés státusz (párhuzamos eredményből)
  let timeStatus: "none" | "checked_in" | "checked_out" = "none"
  if (jelenlet) {
    if (jelenlet.kicsekkolas_ideje) timeStatus = "checked_out"
    else timeStatus = "checked_in"
  }

  // 3. Túlóra / Munkaidő egyenleg (párhuzamos eredményből)
  const overtimeMinutes = tuloraEgyenlegRes.data?.perc ?? 0

  const formatOvertime = (perc: number) => {
    const abs = Math.abs(perc)
    const h = Math.floor(abs / 60)
    const m = abs % 60
    const sign = perc > 0 ? "+" : perc < 0 ? "-" : ""
    if (h === 0 && m === 0) return "0 perc"
    if (m === 0) return `${sign}${h} óra`
    return `${sign}${h} ó ${m} p`
  }

  // Cafeteria (párhuzamos eredményekből)
  const cafeteriaKeret = cafeteriaKeretRes.data
  const cafeteriaKatalogus = cafeteriaKatalogusRes.data
  const cafeteriaValasztasok = cafeteriaValasztasokRes.data

  const nev = adatlap?.felhasznalo_profil?.nev || "Dolgozó"

  const statuszLabel: Record<string, string> = {
    jovahagyva: "Jóváhagyva",
    jovahagyasra_var: "Jóváhagyásra vár",
    elutasitva: "Elutasítva",
  }

  return (
    <div className="space-y-6 pb-10">

      {/* Fejléc: cím */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Áttekintés</h1>
      </div>

      {/* Hero üdvözlő banner */}
      <div className="rounded-lg bg-gradient-to-r from-primary to-primary/80 p-6 flex justify-between items-center">
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
              ? "bg-success/20 text-success-foreground border-success/40"
              : "bg-background/20 text-foreground/80 border-border/30"
          }`}>
            {timeStatus === "checked_in" ? "Becsekkolva" : timeStatus === "checked_out" ? "Mai nap lezárva" : "Még nincs becsekkolva"}
          </span>
          <p className="text-primary-foreground/60 text-xs">
            {new Date().toLocaleDateString("hu-HU", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stat kártyák sora */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Szabadság Marad"
          value={`${remainingLeave} nap`}
          href="/hr/self-service/time"
        />
        <KpiCard
          label="Felhasznált Nap"
          value={`${usedLeave} nap`}
          href="/hr/self-service/time"
        />
        <KpiCard
          label="Függőben Lévő"
          value={`${pendingRequestsCount} kérelem`}
          highlight={pendingRequestsCount > 0}
          href="/hr/self-service/time"
        />
        <KpiCard
          label="Munkaidő Egyenleg"
          value={formatOvertime(overtimeMinutes)}
          sub={
            overtimeMinutes > 0
              ? "Túlóra többlet"
              : overtimeMinutes < 0
              ? "Ledolgozandó idő"
              : "Egyensúlyban"
          }
          href="/hr/self-service/time"
        />
      </div>

      {/* Főrács: Időrögzítés + Szabadság + Kérelmek */}
      <div className="grid gap-6 md:grid-cols-3">

        {/* Időadat Rögzítés */}
        <TimeTrackingCard
          initialStatus={timeStatus}
          checkInTime={jelenlet?.becsekkolas_ideje || null}
          checkOutTime={jelenlet?.kicsekkolas_ideje || null}
          initialAccumulatedBreakMs={Number((jelenlet as any)?.szunet_ms || 0)}
          initialBreakStart={(jelenlet as any)?.szunet_kezdete || null}
        />

        {/* Szabadság egyenleg */}
        <Card>
          <CardHeader className="pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">Szabadság ({new Date().getFullYear()})</CardTitle>
              <p className="text-xs text-muted-foreground">Éves alapszabadság + pótszabadságok</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-semibold tabular-nums">{remainingLeave}</span>
                <span className="text-muted-foreground text-sm">nap maradt</span>
              </div>
              <span className="text-sm text-muted-foreground tabular-nums">Összesen: {totalLeave} nap</span>
            </div>
            <Progress value={totalLeave > 0 ? (usedLeave / totalLeave) * 100 : 0} className="mt-4 h-2" />
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground tabular-nums">
              <span>Felhasznált: {usedLeave} nap</span>
              <span>Tervezett: {plannedLeave} nap</span>
            </div>
            <Link href="/hr/self-service/time" className="mt-4 flex items-center text-sm text-primary hover:underline font-medium">
              Részletek megtekintése <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </CardContent>
        </Card>

        {/* Legutóbbi Kérelmek — mind a 3 típus */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Legutóbbi Kérelmek</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRequests.length > 0 ? (
                recentRequests.map((req) => (
                  <div key={req.id} className="flex justify-between items-center text-sm border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start gap-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide shrink-0 ${requestTypeColor[req.type] || "bg-muted text-muted-foreground"}`}>
                        {requestTypeLabel[req.type] || req.type}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{req.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{req.detail}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider shrink-0 ${
                      req.statusz === "jovahagyva"
                        ? "bg-success/10 text-success border border-success/20"
                        : req.statusz === "elutasitva"
                        ? "bg-destructive/10 text-destructive border border-destructive/20"
                        : "bg-warning/10 text-warning border border-warning/20"
                    }`}>
                      {statuszLabel[req.statusz] ?? req.statusz}
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

      {/* Juttatások + Céljaim */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
        {cafeteriaKeret ? (
          <CafeteriaDeclaration
            employeeId={user.id}
            year={currentYear}
            budget={cafeteriaKeret.osszeg}
            isClosed={cafeteriaKeret.nyilatkozat_lezarva}
            catalog={cafeteriaKatalogus || []}
            existingChoices={cafeteriaValasztasok || []}
            iktatoszam={cafeteriaKeret.iktatoszam}
          />
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Juttatások
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Nincs beállítva cafeteria keret erre az évre.</p>
            </CardContent>
          </Card>
        )}

        <EmployeeKpiWidget kpis={kpis || []} />
      </div>

    </div>
  )
}
