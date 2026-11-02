import { createClient } from "@/utils/supabase/server"
import { TimeTrackingCard, WeeklyDaySummary } from "@/components/hr/time-tracking-card"
import { EmployeeKpiWidget } from "@/components/hr/employee-kpi-widget"
import { CafeteriaDeclarationModal } from "@/components/hr/cafeteria-declaration-modal"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  calculateAnnualLeave,
  calculateWorkingDays,
  resolveEffectiveHolidays,
} from "@/utils/hr/leave-calculator"

function getWeekMondayAndFriday(todayStr: string): {
  mondayStr: string
  fridayStr: string
  days: Array<{ label: string; dateStr: string }>
} {
  const [y, m, d] = todayStr.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  const dayOfWeek = dt.getUTCDay() // 0 = Sun, 1 = Mon, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(dt.getTime() + diffToMonday * 86400000)

  const labels = ["H", "K", "Sze", "Cs", "P"]
  const days = labels.map((label, idx) => {
    const cur = new Date(monday.getTime() + idx * 86400000)
    const iso = cur.toISOString().split("T")[0]
    return {
      label: iso === todayStr ? `${label} (Ma)` : label,
      dateStr: iso,
    }
  })

  return {
    mondayStr: days[0].dateStr,
    fridayStr: days[4].dateStr,
    days,
  }
}

export default async function SelfServicePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const currentYear = new Date().getFullYear()

  const { getActiveCompanyIdServer } = await import("@/utils/company-server")
  const activeCompanyId = await getActiveCompanyIdServer()

  const cs = (q: any) =>
    activeCompanyId ? q.eq("company_id", activeCompanyId) : q

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

  const weekInfo = getWeekMondayAndFriday(todayBudapestStr)

  const [
    adatlapRes,
    jogviszonyRes,
    tavolletekRes,
    holidaysRes,
    jelenletRes,
    weekJelenletRes,
    unclosedPrevRes,
    orvosiRes,
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
      .select("*, felhasznalo_profil(nev, kozvetlen_vezeto_id)")
      .eq("id", user.id)
      .single(),
    cs(
      supabase
        .from("hr_jogviszony")
        .select("*, hr_beosztas(*, hr_munkakor(megnevezes))")
        .eq("dolgozo_id", user.id)
        .is("kilepes_datuma", null)
        .order("created_at", { ascending: false })
    )
      .limit(1)
      .maybeSingle(),
    cs(
      supabase.from("hr_tavollet").select("*").eq("dolgozo_id", user.id)
    ).order("created_at", { ascending: false }),
    activeCompanyId
      ? supabase
          .from("hr_munkaszuneti_nap")
          .select("datum, megnevezes, athelye_munkanap, company_id")
          .gte("datum", `${currentYear}-01-01`)
          .lte("datum", `${currentYear}-12-31`)
          .or(`company_id.is.null,company_id.eq.${activeCompanyId}`)
      : supabase
          .from("hr_munkaszuneti_nap")
          .select("datum, megnevezes, athelye_munkanap, company_id")
          .gte("datum", `${currentYear}-01-01`)
          .lte("datum", `${currentYear}-12-31`)
          .is("company_id", null),
    cs(
      supabase
        .from("hr_jelenlet")
        .select(
          "becsekkolas_ideje, kicsekkolas_ideje, szunet_perc, szunet_ms, szunet_kezdete"
        )
        .eq("dolgozo_id", user.id)
        .eq("datum", todayBudapestStr)
    ).maybeSingle(),
    cs(
      supabase
        .from("hr_jelenlet")
        .select("datum, becsekkolas_ideje, kicsekkolas_ideje, szunet_perc, szunet_ms")
        .eq("dolgozo_id", user.id)
        .gte("datum", weekInfo.mondayStr)
        .lte("datum", weekInfo.fridayStr)
    ),
    cs(
      supabase
        .from("hr_jelenlet")
        .select("datum, becsekkolas_ideje")
        .eq("dolgozo_id", user.id)
        .lt("datum", todayBudapestStr)
        .is("kicsekkolas_ideje", null)
        .order("datum", { ascending: false })
    )
      .limit(1)
      .maybeSingle(),
    cs(
      supabase
        .from("hr_orvosi_vizsgalat")
        .select("ervenyesseg_datuma")
        .eq("dolgozo_id", user.id)
        .order("ervenyesseg_datuma", { ascending: false })
    )
      .limit(1)
      .maybeSingle(),
    cs(
      supabase
        .from("hr_tulora_egyenleg")
        .select("perc")
        .eq("dolgozo_id", user.id)
    ).maybeSingle(),
    cs(
      supabase
        .from("hr_jelenlet_korrekcio")
        .select("id", { count: "exact", head: true })
        .eq("dolgozo_id", user.id)
        .eq("statusz", "jovahagyasra_var")
    ),
    (async () => {
      const res = await cs(
        supabase
          .from("hr_tulora_felhasznalás")
          .select("id", { count: "exact", head: true })
          .eq("dolgozo_id", user.id)
          .eq("statusz", "jovahagyasra_var")
      )
      if (res.error && activeCompanyId) {
        return supabase
          .from("hr_tulora_felhasznalás")
          .select("id", { count: "exact", head: true })
          .eq("dolgozo_id", user.id)
          .eq("statusz", "jovahagyasra_var")
      }
      return res
    })(),
    cs(
      supabase
        .from("hr_jelenlet_korrekcio")
        .select("id, datum, uj_becsekkolas, uj_kicsekkolas, statusz, created_at")
        .eq("dolgozo_id", user.id)
    )
      .order("created_at", { ascending: false })
      .limit(5),
    (async () => {
      const res = await cs(
        supabase
          .from("hr_tulora_felhasznalás")
          .select(
            "id, tipus, perc, datum, megjegyzes, statusz, elutasitas_oka, created_at"
          )
          .eq("dolgozo_id", user.id)
      )
        .order("created_at", { ascending: false })
        .limit(5)
      if (res.error && activeCompanyId) {
        return supabase
          .from("hr_tulora_felhasznalás")
          .select(
            "id, tipus, perc, datum, megjegyzes, statusz, elutasitas_oka, created_at"
          )
          .eq("dolgozo_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5)
      }
      return res
    })(),
    cs(
      supabase
        .from("hr_cafeteria_keret")
        .select("ev, osszeg, nyilatkozat_lezarva, iktatoszam")
        .eq("dolgozo_id", user.id)
        .eq("ev", currentYear)
    ).maybeSingle(),
    cs(
      supabase
        .from("hr_cafeteria_katalogus")
        .select("id, nev, leiras, szorzo, kategoria")
        .eq("aktiv", true)
    ).order("nev"),
    cs(
      supabase
        .from("hr_cafeteria_valasztas")
        .select("katalogus_elem_id, kert_osszeg, levont_keret_osszeg")
        .eq("dolgozo_id", user.id)
        .eq("ev", currentYear)
    ),
    (async () => {
      const { createClient: createAdminClient } = await import(
        "@supabase/supabase-js"
      )
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
  const holidaysData: any[] = holidaysRes.data || []
  const jelenlet = jelenletRes.data
  const kpis: any[] = kpisRes.data || []

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
  const weeklyHours =
    Number(jogviszony?.heti_oraszam || activeBeosztas?.heti_oraszam) || 40
  const dailyTargetMinutes = Math.round((weeklyHours / 5) * 60)

  // Heti 5 napos munkaidő összegzés összeállítása
  const weekRows: any[] = weekJelenletRes.data || []
  const weeklyRecords: WeeklyDaySummary[] = weekInfo.days.map((d) => {
    const row = weekRows.find((r) => r.datum === d.dateStr)
    let netMinutes: number | null = null
    if (row?.becsekkolas_ideje && row?.kicsekkolas_ideje) {
      const startMs = new Date(row.becsekkolas_ideje).getTime()
      const endMs = new Date(row.kicsekkolas_ideje).getTime()
      const breakMs =
        typeof row.szunet_ms === "number" && row.szunet_ms > 0
          ? row.szunet_ms
          : (Number(row.szunet_perc) || 0) * 60000
      netMinutes = Math.max(0, Math.round((endMs - startMs - breakMs) / 60000))
    }
    return {
      dayLabel: d.label,
      dateStr: d.dateStr,
      isToday: d.dateStr === todayBudapestStr,
      netMinutes,
    }
  })

  // Szabadság egyenleg számítás
  const { holidays: holidayDates, transferredWorkdays } =
    resolveEffectiveHolidays(holidaysData, activeCompanyId)

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
    return calculateWorkingDays(
      startStr,
      endStr,
      holidayDates,
      transferredWorkdays
    )
  }

  const isPaidLeaveType = (tipus: string | undefined) =>
    ["szabadsag", "alapszabadsag", "fizetett"].includes(
      (tipus || "").toLowerCase()
    )

  const totalLeave = calculateAnnualLeave(
    adatlap?.szuletesi_datum || adatlap?.szuletesi_ido,
    adatlap?.gyermekek_szama,
    adatlap?.megvaltozott_munkakepessegu,
    currentYear
  )

  const usedLeave = (tavolletek || [])
    .filter((t) => isPaidLeaveType(t.tipus) && t.statusz === "jovahagyva")
    .reduce((sum, t) => sum + getLeaveWorkingDays(t), 0)

  const plannedLeave = (tavolletek || [])
    .filter(
      (t) => isPaidLeaveType(t.tipus) && t.statusz === "jovahagyasra_var"
    )
    .reduce((sum, t) => sum + getLeaveWorkingDays(t), 0)

  const pendingLeavesCount =
    tavolletek?.filter((t) => t.statusz === "jovahagyasra_var").length || 0
  const remainingLeave = Math.max(0, totalLeave - usedLeave)

  const pendingRequestsCount =
    pendingLeavesCount +
    (korrekcioCountRes.count || 0) +
    (tuloraCountRes.count || 0)

  // Következő szabadság és következő munkaszüneti nap
  const nextUpcomingLeave = [...tavolletek]
    .filter(
      (t) =>
        t.statusz !== "elutasitva" &&
        t.veg_datuma &&
        t.veg_datuma >= todayBudapestStr
    )
    .sort((a, b) =>
      String(a.kezdet_datuma).localeCompare(String(b.kezdet_datuma))
    )[0]

  const nextPublicHoliday = [...holidaysData]
    .filter((h) => !h.athelye_munkanap && h.datum >= todayBudapestStr)
    .sort((a, b) => String(a.datum).localeCompare(String(b.datum)))[0]

  // Orvosi alkalmassági állapot
  const isAdatlapForCompany =
    !activeCompanyId ||
    !adatlap?.company_id ||
    adatlap.company_id === activeCompanyId
  const medicalExpiryStr: string | null =
    orvosiRes.data?.ervenyesseg_datuma ||
    (isAdatlapForCompany ? adatlap?.orvosi_alkalmassag_ervenyesseg : null) ||
    null

  const medicalDaysRemaining = (() => {
    if (!medicalExpiryStr) return null
    const diffMs =
      new Date(`${medicalExpiryStr}T23:59:59`).getTime() -
      new Date(`${todayBudapestStr}T00:00:00`).getTime()
    return Math.ceil(diffMs / 86400000)
  })()

  // Nyitott KPI önértékelések
  const openSelfEvalKpis = kpis.filter(
    (k) => k.statusz === "onertekelesre_var" || k.statusz === "folyamatban"
  )

  // Kérelmek egyesített listája
  type AllRequest = {
    id: string
    type: "szabadsag" | "korrekcio" | "tulora"
    title: string
    detail: string
    statusz: string
    createdAt: string
  }
  const allRequests: AllRequest[] = [
    ...(tavolletek || []).slice(0, 6).map((t: any) => ({
      id: t.id,
      type: "szabadsag" as const,
      title:
        t.tipus === "szabadsag"
          ? "Éves rendes szabadság"
          : t.tipus === "beteg" || t.tipus === "betegszabadsag"
          ? "Betegszabadság"
          : t.tipus === "fizetetlen"
          ? "Fizetés nélküli szabadság"
          : t.tipus === "csusztatas"
          ? "Csúsztatás"
          : t.tipus,
      detail: `${t.kezdet_datuma?.slice(0, 10) || "–"} – ${
        t.veg_datuma?.slice(0, 10) || "–"
      }`,
      statusz: t.statusz,
      createdAt: t.created_at,
    })),
    ...(korrekcioListRes.data || []).map((k: any) => ({
      id: k.id,
      type: "korrekcio" as const,
      title: "Jelenlétkorrekció",
      detail: `${k.datum} · ${(k.uj_becsekkolas || "").slice(0, 5)} → ${(
        k.uj_kicsekkolas || ""
      ).slice(0, 5)}`,
      statusz: k.statusz,
      createdAt: k.created_at,
    })),
    ...(tuloraListRes.data || []).map((o: any) => {
      const totalMins = Number(o.perc) || 0
      const hours = Math.floor(totalMins / 60)
      const mins = totalMins % 60
      const durationLabel =
        totalMins <= 0
          ? "0 perc"
          : hours > 0 && mins > 0
          ? `${hours} óra ${mins} perc`
          : hours > 0
          ? `${hours} óra`
          : `${mins} perc`
      return {
        id: o.id,
        type: "tulora" as const,
        title:
          o.tipus === "kifizetes" || o.tipus === "kifizetteti"
            ? "Túlóra kifizetés"
            : "Túlóra lecsúsztatás",
        detail: o.datum ? `${o.datum} · ${durationLabel}` : durationLabel,
        statusz: o.statusz,
        createdAt: o.created_at,
      }
    }),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const recentRequests = allRequests.slice(0, 5)
  const requestTypeLabel: Record<string, string> = {
    szabadsag: "SZABADSÁG",
    korrekcio: "KORREKCIÓ",
    tulora: "TÚLÓRA",
  }
  const requestTypeColor: Record<string, string> = {
    szabadsag: "bg-primary/10 text-primary border-primary/25",
    korrekcio: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25",
    tulora:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  }

  let timeStatus: "none" | "checked_in" | "checked_out" = "none"
  if (jelenlet) {
    if (jelenlet.kicsekkolas_ideje) timeStatus = "checked_out"
    else timeStatus = "checked_in"
  }

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

  const cafeteriaKeret = cafeteriaKeretRes.data
  const cafeteriaKatalogus = cafeteriaKatalogusRes.data
  const cafeteriaValasztasok = cafeteriaValasztasokRes.data
  const hasUnsubmittedCafeteria = Boolean(
    cafeteriaKeret && !cafeteriaKeret.nyilatkozat_lezarva
  )

  const nev = adatlap?.felhasznalo_profil?.nev || "Dolgozó"

  const statuszLabel: Record<string, string> = {
    jovahagyva: "JÓVÁHAGYVA",
    jovahagyasra_var: "JÓVÁHAGYÁSRA VÁR",
    elutasitva: "ELUTASÍTVA",
  }

  const usedPercent =
    totalLeave > 0 ? Math.min(100, Math.round((usedLeave / totalLeave) * 100)) : 0
  const plannedPercent =
    totalLeave > 0
      ? Math.min(
          100 - usedPercent,
          Math.round((plannedLeave / totalLeave) * 100)
        )
      : 0

  const actionItemsCount =
    (openSelfEvalKpis.length > 0 ? 1 : 0) +
    (pendingRequestsCount > 0 ? 1 : 0) +
    (hasUnsubmittedCafeteria ? 1 : 0) +
    (medicalDaysRemaining !== null && medicalDaysRemaining <= 30 ? 1 : 0)

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
            {munkakorMegnevezes && <span>{munkakorMegnevezes}</span>}
            {munkakorMegnevezes && belepesDatuma && <span> · </span>}
            {belepesDatuma && (
              <span>
                Belépés:{" "}
                {new Date(belepesDatuma).toLocaleDateString("hu-HU", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
            {!munkakorMegnevezes && !belepesDatuma && (
              <span>Jó munkát kívánunk a mai napra!</span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
              timeStatus === "checked_in"
                ? "bg-success/20 text-success-foreground border-success/40"
                : "bg-background/20 text-foreground/80 border-border/30"
            }`}
          >
            {timeStatus === "checked_in"
              ? "Becsekkolva"
              : timeStatus === "checked_out"
              ? "Mai nap lezárva"
              : "Még nincs becsekkolva"}
          </span>
          <p className="text-primary-foreground/60 text-xs">
            {new Date().toLocaleDateString("hu-HU", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* 2. HERO ROW: PRO MUNKAIDŐ TERMINÁL (7 cols) + SZABADSÁG & TEENDŐIM (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* BAL OLDAL (7 COL): PROFI MUNKAIDŐ TERMINÁL */}
        <div className="lg:col-span-7">
          <TimeTrackingCard
            initialStatus={timeStatus}
            checkInTime={jelenlet?.becsekkolas_ideje || null}
            checkOutTime={jelenlet?.kicsekkolas_ideje || null}
            initialAccumulatedBreakMs={
              typeof jelenlet?.szunet_ms === "number" && jelenlet.szunet_ms > 0
                ? jelenlet.szunet_ms
                : (jelenlet?.szunet_perc || 0) * 60 * 1000
            }
            initialBreakStart={jelenlet?.szunet_kezdete || null}
            dailyTargetMinutes={dailyTargetMinutes}
            weeklyRecords={weeklyRecords}
            unclosedPreviousRecord={unclosedPrevRes.data || null}
          />
        </div>

        {/* JOBB OLDAL (5 COL): SZABADSÁG & IDŐEGYENLEG + TEENDŐIM & HR MEGFELELŐSÉG */}
        <div className="lg:col-span-5 flex flex-col gap-5 justify-between">
          {/* CARD A: SZABADSÁG ÉS IDŐEGYENLEG */}
          <div className="bg-card border border-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Szabadság és Időegyenleg ({currentYear})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Éves keret, túlóra egyenleg és következő távollét
                </p>
              </div>
              <Link
                href="/hr/self-service/time"
                className="text-xs font-medium text-primary hover:underline"
              >
                Részletek →
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="border border-border rounded-md p-3 bg-muted/20">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Elérhető
                </div>
                <div className="text-xl font-semibold tabular-nums text-foreground mt-0.5">
                  {remainingLeave} nap
                </div>
                <div className="text-xs text-muted-foreground tabular-nums mt-0.5">
                  Összesen: {totalLeave} nap
                </div>
              </div>

              <div className="border border-border rounded-md p-3 bg-muted/20">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Felhasznált
                </div>
                <div className="text-xl font-semibold tabular-nums text-foreground mt-0.5">
                  {usedLeave} nap
                </div>
                <div className="text-xs text-muted-foreground tabular-nums mt-0.5">
                  + {plannedLeave} nap tervezett
                </div>
              </div>

              <div className="border border-border rounded-md p-3 bg-muted/20">
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Munkaidő mérleg
                </div>
                <div
                  className={`text-xl font-semibold tabular-nums mt-0.5 ${
                    overtimeMinutes > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : overtimeMinutes < 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-foreground"
                  }`}
                >
                  {formatOvertime(overtimeMinutes)}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Kumulált egyenleg
                </div>
              </div>
            </div>

            {/* Segmented Leave Bar */}
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex border border-border">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${usedPercent}%` }}
                />
                {plannedPercent > 0 && (
                  <div
                    className="bg-amber-400 h-full transition-all"
                    style={{ width: `${plannedPercent}%` }}
                  />
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
                <span>
                  Éves szabadságkeret: {totalLeave} munkanap
                </span>
                <span>{usedPercent}% kivéve</span>
              </div>
            </div>

            {/* Next Planned Leave & Next Public Holiday */}
            <div className="border-t border-border pt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  Következő szabadságod:
                </span>
                <span className="font-medium text-foreground tabular-nums text-right">
                  {nextUpcomingLeave
                    ? `${nextUpcomingLeave.kezdet_datuma?.slice(0, 10)} – ${nextUpcomingLeave.veg_datuma?.slice(0, 10)}`
                    : "Nincs kiírt közelgő távollét"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  Következő munkaszüneti nap:
                </span>
                <span className="font-medium text-foreground tabular-nums text-right">
                  {nextPublicHoliday
                    ? `${nextPublicHoliday.datum} (${
                        nextPublicHoliday.megnevezes || "Ünnepnap"
                      })`
                    : "Nincs hátralévő ünnepnap az évben"}
                </span>
              </div>
            </div>
          </div>

          {/* CARD B: TEENDŐIM ÉS HR MEGFELELŐSÉG */}
          <div className="bg-card border border-border rounded-lg p-5 space-y-3 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Teendőim és HR Megfelelőség
                </h2>
                <p className="text-xs text-muted-foreground">
                  Kötelező érvényességek és rád váró feladatok
                </p>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded border tabular-nums ${
                  actionItemsCount > 0
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                }`}
              >
                {actionItemsCount > 0
                  ? `${actionItemsCount} teendő`
                  : "Minden rendezett"}
              </span>
            </div>

            <div className="divide-y divide-border border border-border rounded-md">
              {/* Item 1: Orvosi alkalmassági */}
              <div className="p-2.5 px-3 flex items-center justify-between gap-2 bg-muted/20">
                <div>
                  <div className="text-xs font-medium text-foreground">
                    Munkaköri orvosi alkalmassági
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {medicalExpiryStr
                      ? `Érvényes: ${medicalExpiryStr}${
                          medicalDaysRemaining !== null
                            ? ` (${
                                medicalDaysRemaining >= 0
                                  ? `még ${medicalDaysRemaining} nap`
                                  : `lejárt ${Math.abs(medicalDaysRemaining)} napja`
                              })`
                            : ""
                        }`
                      : "Nincs rögzített lejárati dátum"}
                  </div>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded border shrink-0 ${
                    medicalDaysRemaining === null || medicalDaysRemaining < 0
                      ? "bg-destructive/10 text-destructive border-destructive/30"
                      : medicalDaysRemaining <= 30
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  }`}
                >
                  {medicalDaysRemaining === null
                    ? "Hiányzik"
                    : medicalDaysRemaining < 0
                    ? "Lejárt"
                    : medicalDaysRemaining <= 30
                    ? "Hamarosan lejár"
                    : "Érvényes"}
                </span>
              </div>

              {/* Item 2: Cafeteria nyilatkozat (ha még nincs leadva) */}
              {hasUnsubmittedCafeteria && cafeteriaKeret && (
                <div className="p-2.5 px-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-medium text-foreground">
                      Cafeteria nyilatkozat ({currentYear})
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Éves juttatási kereted még nincs véglegesítve
                    </div>
                  </div>
                  <CafeteriaDeclarationModal
                    employeeId={user.id}
                    year={currentYear}
                    budget={cafeteriaKeret.osszeg}
                    isClosed={cafeteriaKeret.nyilatkozat_lezarva}
                    catalog={cafeteriaKatalogus || []}
                    existingChoices={cafeteriaValasztasok || []}
                    iktatoszam={cafeteriaKeret.iktatoszam}
                    autoOpen={false}
                    showTrigger={true}
                    triggerLabel="Megnyitás"
                  />
                </div>
              )}

              {/* Item 3: KPI Önértékelés */}
              <div className="p-2.5 px-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-medium text-foreground">
                    Negyedéves KPI önértékelés
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {openSelfEvalKpis.length > 0
                      ? `${openSelfEvalKpis.length} db célkitűzés önértékelésre vár`
                      : "Nincs nyitott önértékelési feladat"}
                  </div>
                </div>
                <Link
                  href="/hr/self-service/performance"
                  className="text-xs font-medium text-primary hover:underline shrink-0"
                >
                  Megnyitás →
                </Link>
              </div>

              {/* Item 4: Elbírálásra váró kérelmek */}
              <div className="p-2.5 px-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-medium text-foreground">
                    Elbírálásra váró kérelmek
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {pendingRequestsCount > 0
                      ? `${pendingRequestsCount} db kérelem vezetői jóváhagyásra vár`
                      : "Nincs függőben lévő kérelmed"}
                  </div>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded border shrink-0 ${
                    pendingRequestsCount > 0
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {pendingRequestsCount > 0 ? "Függőben" : "Rendezett"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM ROW: LEGUTÓBBI KÉRELMEIM (7 cols) + AKTUÁLIS CÉLKITŰZÉSEIM (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* BAL OLDAL (7 COL): LEGUTÓBBI KÉRELMEIM TÁBLÁZAT */}
        <div className="lg:col-span-7 bg-card border border-border rounded-lg p-5 space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Legutóbbi Kérelmeim
                </h2>
                <p className="text-xs text-muted-foreground">
                  Szabadság, jelenlét-korrekció és túlóra igénylések állapota
                </p>
              </div>
              <Link
                href="/hr/self-service/time"
                className="text-xs font-medium text-primary hover:underline"
              >
                Összes megtekintése →
              </Link>
            </div>

            {recentRequests.length > 0 ? (
              <div className="overflow-x-auto border border-border rounded-md">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase tracking-wider">
                      <th className="py-2.5 px-3 font-medium">Típus</th>
                      <th className="py-2.5 px-3 font-medium">Megnevezés</th>
                      <th className="py-2.5 px-3 font-medium">
                        Időszak / Időpont
                      </th>
                      <th className="py-2.5 px-3 font-medium text-right">
                        Státusz
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentRequests.map((req) => (
                      <tr
                        key={`${req.type}-${req.id}`}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded border font-medium text-xs ${
                              requestTypeColor[req.type] ??
                              "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {requestTypeLabel[req.type] ?? req.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-foreground">
                          {req.title}
                        </td>
                        <td className="py-2.5 px-3 tabular-nums text-muted-foreground">
                          {req.detail}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded border font-medium text-xs ${
                              req.statusz === "jovahagyva"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : req.statusz === "jovahagyasra_var"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                : "bg-destructive/10 text-destructive border-destructive/30"
                            }`}
                          >
                            {statuszLabel[req.statusz] ?? req.statusz}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border border-border rounded-md p-6 text-center text-xs text-muted-foreground">
                Nincsenek rögzített kérelmek.
              </div>
            )}
          </div>
        </div>

        {/* JOBB OLDAL (5 COL): AKTUÁLIS CÉLKITŰZÉSEIM */}
        <div className="lg:col-span-5">
          <EmployeeKpiWidget kpis={kpis || []} />
        </div>
      </div>

      {/* Automatikus Cafeteria Nyilatkozat Pop-up (csak ha van keret és még nincs leadva) */}
      {hasUnsubmittedCafeteria && cafeteriaKeret && (
        <CafeteriaDeclarationModal
          employeeId={user.id}
          year={currentYear}
          budget={cafeteriaKeret.osszeg}
          isClosed={cafeteriaKeret.nyilatkozat_lezarva}
          catalog={cafeteriaKatalogus || []}
          existingChoices={cafeteriaValasztasok || []}
          iktatoszam={cafeteriaKeret.iktatoszam}
          autoOpen={true}
          showTrigger={false}
        />
      )}
    </div>
  )
}
