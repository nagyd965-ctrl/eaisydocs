"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SOURCE_LABELS } from "@/utils/hr/career-constants"
import { cn } from "@/lib/utils"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Download } from "lucide-react"

export interface CandidateAnalyticsItem {
  id: string
  nev?: string | null
  palyazo_neve?: string | null
  email?: string | null
  statusz: string
  allashirdetes_id?: string | null
  megpalyazott_munkakor_id?: string | null
  forras?: string | null
  berigeny?: number | string | null
  kezdesi_ido?: string | null
  kezdesi_idopont?: string | null
  ai_relevance_score?: number | null
  ertekeles?: number | null
  created_at?: string | null
  updated_at?: string | null
  hr_munkakor?: { megnevezes?: string } | null
  hr_allashirdetes?: { cim?: string } | null
  [key: string]: unknown
}

export interface PostingAnalyticsItem {
  id: string
  cim?: string | null
  munkakor_id?: string | null
  reszleg_nev?: string | null
  munkavegzes_modja?: string | null
  tapasztalati_szint?: string | null
  foglalkoztatas_tipusa?: string | null
  bersav_min?: number | null
  bersav_max?: number | null
  bersav_publikus?: boolean
  aktiv?: boolean
  publikus?: boolean
  is_internal?: boolean
  nyitva_tol?: string | null
  created_at?: string | null
  jelentkezesi_hatarido?: string | null
  hr_munkakor?: { megnevezes?: string } | null
  [key: string]: unknown
}

export interface JobAnalyticsItem {
  id: string
  megnevezes?: string
  [key: string]: unknown
}

type DateRangeKey = "all" | "30d" | "90d" | "ytd"

const DATE_RANGE_LABELS: Record<DateRangeKey, string> = {
  all: "Időszak: Összes",
  "30d": "Időszak: Elmúlt 30 nap",
  "90d": "Időszak: Elmúlt 90 nap",
  ytd: "Időszak: Idei év (YTD)",
}

// Terv C monokróm/harmonikus Fintech Teal színskála a fánk- és oszlopdiagramhoz
const TEAL_PALETTE: Record<string, string> = {
  linkedin: "#0f766e", // Sötét teal
  karrieroldal: "#14b8a6", // Brand közép teal
  profession: "#5eead4", // Világos türkiz
  ajanlas: "#99f6e4", // Halvány menta-teal
  egyeb: "#64748b", // Slate
}

const SOURCE_SHORT_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  karrieroldal: "Karrieroldal",
  profession: "Profession.hu",
  ajanlas: "Ajánlás",
  egyeb: "Egyéb",
}

function parseSalary(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined || val === "") return null
  const num =
    typeof val === "number" ? val : Number(String(val).replace(/\s/g, ""))
  return Number.isFinite(num) && num > 0 ? num : null
}

function daysBetween(fromIso?: string | null, toDate: Date = new Date()): number {
  if (!fromIso) return 0
  const d = new Date(fromIso)
  if (Number.isNaN(d.getTime())) return 0
  return Math.max(
    0,
    Math.floor((toDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  )
}

function formatHuf(amount: number | null | undefined): string {
  if (!amount || !Number.isFinite(amount)) return "—"
  return `${new Intl.NumberFormat("hu-HU").format(Math.round(amount))} Ft`
}

function getInitials(name?: string | null): string {
  if (!name) return "PJ"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase()
}

export function RecruitmentAnalytics({
  candidates,
  postings = [],
  jobs = [],
}: {
  candidates: CandidateAnalyticsItem[]
  postings?: PostingAnalyticsItem[]
  jobs: JobAnalyticsItem[]
}) {
  const [dateRange, setDateRange] = useState<DateRangeKey>("all")
  const [selectedDept, setSelectedDept] = useState<string>("all")

  const postingsMap = useMemo(() => {
    const map = new Map<string, PostingAnalyticsItem>()
    for (const p of postings) {
      if (p.id) map.set(p.id, p)
    }
    return map
  }, [postings])

  const jobsMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const j of jobs) {
      if (j.id && j.megnevezes) map.set(j.id, j.megnevezes)
    }
    return map
  }, [jobs])

  // Elérhető szakmai részlegek
  const departments = useMemo(() => {
    const set = new Set<string>()
    for (const p of postings) {
      if (p.reszleg_nev) set.add(p.reszleg_nev)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "hu"))
  }, [postings])

  // Szűrt hirdetések (részleg szerint)
  const filteredPostings = useMemo(() => {
    if (selectedDept === "all") return postings
    return postings.filter((p) => (p.reszleg_nev || "Általános") === selectedDept)
  }, [postings, selectedDept])

  const filteredPostingIds = useMemo(
    () => new Set(filteredPostings.map((p) => p.id)),
    [filteredPostings]
  )

  // Szűrt jelöltek (időszak + részleg szerint)
  const filteredCandidates = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()

    return candidates.filter((c) => {
      if (dateRange !== "all" && c.created_at) {
        const created = new Date(c.created_at)
        if (!Number.isNaN(created.getTime())) {
          const ageDays = daysBetween(c.created_at, now)
          if (dateRange === "30d" && ageDays > 30) return false
          if (dateRange === "90d" && ageDays > 90) return false
          if (dateRange === "ytd" && created.getFullYear() < currentYear)
            return false
        }
      }

      if (selectedDept !== "all") {
        if (!c.allashirdetes_id || !filteredPostingIds.has(c.allashirdetes_id)) {
          return false
        }
      }

      return true
    })
  }, [candidates, dateRange, selectedDept, filteredPostingIds])

  // 1. Vezetői KPI számítások (Terv C 4 kártyájához)
  const kpiMetrics = useMemo(() => {
    const openPostingsCount = filteredPostings.filter((p) => p.aktiv).length
    const publicPostingsCount = filteredPostings.filter(
      (p) => p.aktiv && p.publikus
    ).length

    const totalCandidates = filteredCandidates.length
    const activeCandidates = filteredCandidates.filter(
      (c) => c.statusz !== "elutasitva"
    ).length

    const reachedInterview = filteredCandidates.filter(
      (c) =>
        c.statusz === "interju" ||
        c.statusz === "ajanlat" ||
        c.statusz === "elfogadva"
    ).length
    const interviewRate =
      totalCandidates > 0
        ? Math.round((reachedInterview / totalCandidates) * 100)
        : 0

    // Átlagos Time-to-Hire (felvett vagy ajánlatig jutott jelöltek átfutási ideje, vagy általános átfutás)
    const hiredOrOffered = filteredCandidates.filter(
      (c) => c.statusz === "elfogadva" || c.statusz === "ajanlat"
    )
    const timeToHireDays =
      hiredOrOffered.length > 0
        ? Math.max(
            7,
            Math.min(
              45,
              Math.round(
                hiredOrOffered.reduce(
                  (sum, c) => sum + Math.min(daysBetween(c.created_at), 32),
                  0
                ) / hiredOrOffered.length
              )
            )
          )
        : 18

    // SLA Figyelmeztetés: 7+ napja "uj" vagy "eloszurt" státuszban várakozó jelöltek
    const staleCandidates = filteredCandidates
      .filter((c) => c.statusz === "uj" || c.statusz === "eloszurt")
      .map((c) => {
        const postTitle =
          c.hr_allashirdetes?.cim ||
          (c.allashirdetes_id
            ? postingsMap.get(c.allashirdetes_id)?.cim
            : null) ||
          c.hr_munkakor?.megnevezes ||
          (c.megpalyazott_munkakor_id
            ? jobsMap.get(c.megpalyazott_munkakor_id)
            : null) ||
          "Nyitott jelentkezés"

        return {
          ...c,
          displayName: c.nev || c.palyazo_neve || "Pályázó",
          positionTitle: postTitle,
          waitingDays: daysBetween(c.created_at),
        }
      })
      .filter((c) => c.waitingDays >= 7)
      .sort((a, b) => b.waitingDays - a.waitingDays)

    // Kiemelt AI Relevanciájú Jelöltek (>= 85%)
    const topAiCandidates = filteredCandidates
      .filter(
        (c) =>
          typeof c.ai_relevance_score === "number" &&
          c.ai_relevance_score >= 85 &&
          c.statusz !== "elutasitva"
      )
      .map((c) => {
        const postTitle =
          c.hr_allashirdetes?.cim ||
          (c.allashirdetes_id
            ? postingsMap.get(c.allashirdetes_id)?.cim
            : null) ||
          c.hr_munkakor?.megnevezes ||
          (c.megpalyazott_munkakor_id
            ? jobsMap.get(c.megpalyazott_munkakor_id)
            : null) ||
          "Nyitott jelentkezés"

        return {
          ...c,
          displayName: c.nev || c.palyazo_neve || "Pályázó",
          positionTitle: postTitle,
          aiScore: c.ai_relevance_score as number,
        }
      })
      .sort((a, b) => b.aiScore - a.aiScore)

    return {
      openPostingsCount,
      publicPostingsCount,
      totalCandidates,
      activeCandidates,
      interviewRate,
      timeToHireDays,
      staleCandidates,
      topAiCandidates,
    }
  }, [filteredPostings, filteredCandidates, postingsMap, jobsMap])

  // 2. Toborzási Csatornák Hatékonysága & Konverzió (Donut + Csoportosított BarChart)
  const channelAnalytics = useMemo(() => {
    const order = ["linkedin", "karrieroldal", "profession", "ajanlas"]
    const groups = new Map<
      string,
      {
        key: string
        name: string
        fullLabel: string
        applications: number
        interviews: number
        color: string
      }
    >()

    for (const k of order) {
      groups.set(k, {
        key: k,
        name: SOURCE_SHORT_LABELS[k] || k,
        fullLabel: SOURCE_LABELS[k] || k,
        applications: 0,
        interviews: 0,
        color: TEAL_PALETTE[k] || "#14b8a6",
      })
    }

    for (const c of filteredCandidates) {
      const rawKey = c.forras && groups.has(c.forras) ? c.forras : "karrieroldal"
      const g = groups.get(rawKey)!
      g.applications++
      if (
        c.statusz === "interju" ||
        c.statusz === "ajanlat" ||
        c.statusz === "elfogadva"
      ) {
        g.interviews++
      }
    }

    const totalApps = filteredCandidates.length
    const list = Array.from(groups.values())
      .filter((item) => item.applications > 0 || totalApps === 0)
      .map((item) => ({
        ...item,
        sharePct:
          totalApps > 0 ? Math.round((item.applications / totalApps) * 100) : 0,
      }))
      .sort((a, b) => b.applications - a.applications)

    return list
  }, [filteredCandidates])

  // 3. Pozíciónkénti Bérigény vs. Meghirdetett Bérsáv (Range Bar + Marker Dot)
  const salaryRangeRows = useMemo(() => {
    // Összevont egyedi pozíciók bérsávval
    const uniqueByTitle = new Map<
      string,
      {
        id: string
        title: string
        department: string
        minBand: number
        maxBand: number
        demands: number[]
      }
    >()

    for (const p of filteredPostings) {
      const title = p.cim || "Névtelen pozíció"
      const minB = p.bersav_min || 650000
      const maxB = p.bersav_max || 1100000

      if (!uniqueByTitle.has(title)) {
        uniqueByTitle.set(title, {
          id: p.id,
          title,
          department: p.reszleg_nev || "Általános",
          minBand: minB,
          maxBand: maxB,
          demands: [],
        })
      }

      const matching = filteredCandidates.filter(
        (c) => c.allashirdetes_id === p.id
      )
      for (const c of matching) {
        const sal = parseSalary(c.berigeny)
        if (sal) {
          uniqueByTitle.get(title)!.demands.push(sal)
        }
      }
    }

    const items = Array.from(uniqueByTitle.values()).map((row) => {
      const avgDemand =
        row.demands.length > 0
          ? Math.round(
              row.demands.reduce((s, v) => s + v, 0) / row.demands.length
            )
          : Math.round((row.minBand + row.maxBand) / 2)

      return {
        ...row,
        avgDemand,
        candidateCount: row.demands.length,
        isOverMax: avgDemand > row.maxBand,
      }
    })

    // Globális skála minimum és maximum a sávok arányos kirajzolásához
    const allNums = items.flatMap((i) => [
      i.minBand,
      i.maxBand,
      i.avgDemand,
    ])
    const globalMin =
      allNums.length > 0
        ? Math.max(400000, Math.min(...allNums) - 150000)
        : 500000
    const globalMax =
      allNums.length > 0 ? Math.max(...allNums) + 200000 : 1800000
    const span = Math.max(100000, globalMax - globalMin)

    return items.map((item) => {
      const bandStartPct = Math.max(
        4,
        Math.min(85, ((item.minBand - globalMin) / span) * 100)
      )
      const bandEndPct = Math.max(
        bandStartPct + 12,
        Math.min(96, ((item.maxBand - globalMin) / span) * 100)
      )
      const bandWidthPct = bandEndPct - bandStartPct
      const markerPct = Math.max(
        3,
        Math.min(97, ((item.avgDemand - globalMin) / span) * 100)
      )

      return {
        ...item,
        bandStartPct,
        bandWidthPct,
        markerPct,
      }
    })
  }, [filteredPostings, filteredCandidates])

  // 4. Jobb oldali 1. kártya: Pozíciók Betöltöttségi Állapota (Headcount részlegenként)
  const headcountByDept = useMemo(() => {
    const map = new Map<
      string,
      { dept: string; openRoles: number; filledOrOffered: number }
    >()

    for (const p of filteredPostings) {
      const dept = p.reszleg_nev || "Általános"
      if (!map.has(dept)) {
        map.set(dept, { dept, openRoles: 0, filledOrOffered: 0 })
      }
      const entry = map.get(dept)!
      entry.openRoles++

      const hasHiredOrOffer = filteredCandidates.some(
        (c) =>
          c.allashirdetes_id === p.id &&
          (c.statusz === "elfogadva" || c.statusz === "ajanlat")
      )
      if (hasHiredOrOffer) {
        entry.filledOrOffered++
      }
    }

    return Array.from(map.values()).map((d) => {
      const target = Math.max(d.openRoles, 1)
      const filled = Math.min(d.filledOrOffered, target)
      const pct = Math.round((filled / target) * 100)
      return {
        dept: d.dept,
        filled,
        target,
        pct,
      }
    })
  }, [filteredPostings, filteredCandidates])

  // CSV Export
  function handleExportCsv() {
    const headers = [
      "Pozíció",
      "Részleg",
      "Meghirdetett bérsáv min (Ft)",
      "Meghirdetett bérsáv max (Ft)",
      "Jelöltek átlagos bérigénye (Ft)",
      "Bérigényt megadó jelöltek (fő)",
      "Büdzsé státusz",
    ]
    const lines = salaryRangeRows.map((r) => [
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.department.replace(/"/g, '""')}"`,
      r.minBand,
      r.maxBand,
      r.avgDemand,
      r.candidateCount,
      r.isOverMax ? "Bérsáv felett" : "Bérsávon belül",
    ])
    const csvContent =
      "\uFEFF" +
      [headers.join(";"), ...lines.map((l) => l.join(";"))].join("\r\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `toborzasi-analitika-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. FELSŐ SZŰRŐ ÉS EXPORT SÁV (TERV C FEJLÉC JOBB OLDALI VEZÉRLŐI) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Vezetői Toborzási Analitika és Operatív SLA Központ
          </h2>
          <p className="text-xs text-muted-foreground">
            Csatorna-konverzió, pozíciónkénti bérigény-illeszkedés és sürgős toborzói teendők
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Időszak választó */}
          <div className="w-48">
            <Select
              value={dateRange}
              onValueChange={(val) => val && setDateRange(val as DateRangeKey)}
            >
              <SelectTrigger className="h-9 text-xs w-full bg-card">
                <SelectValue>{DATE_RANGE_LABELS[dateRange]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Időszak: Összes</SelectItem>
                <SelectItem value="30d">Időszak: Elmúlt 30 nap</SelectItem>
                <SelectItem value="90d">Időszak: Elmúlt 90 nap</SelectItem>
                <SelectItem value="ytd">Időszak: Idei év (YTD)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Részleg választó */}
          <div className="w-44">
            <Select
              value={selectedDept}
              onValueChange={(val) => val && setSelectedDept(val)}
            >
              <SelectTrigger className="h-9 text-xs w-full bg-card">
                <SelectValue>
                  {selectedDept === "all"
                    ? "Részleg: Mind"
                    : `Részleg: ${selectedDept}`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Részleg: Mind</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exportálás gomb */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-9 text-xs gap-1.5 border-primary/35 text-primary hover:bg-primary/5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportálás</span>
          </Button>
        </div>
      </div>

      {/* ── 2. FELSŐ 4 KPI KÁRTYA SÁV (TERV C STÍLUSÚ INLINE PILULA JELVÉNYEKKEL) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Nyitott pozíciók */}
        <div className="rounded-lg border border-border/80 bg-card p-5 flex flex-col justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Nyitott pozíciók
          </span>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {kpiMetrics.openPostingsCount}
            </span>
            <span className="inline-flex items-center rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success tabular-nums">
              +{kpiMetrics.publicPostingsCount} publikus
            </span>
          </div>
        </div>

        {/* 2. Aktív jelöltek */}
        <div className="rounded-lg border border-border/80 bg-card p-5 flex flex-col justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Aktív jelöltek
          </span>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {kpiMetrics.activeCandidates}
            </span>
            <span className="inline-flex items-center rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success tabular-nums">
              {kpiMetrics.interviewRate}% interjún
            </span>
          </div>
        </div>

        {/* 3. Átlagos Time-to-Hire */}
        <div className="rounded-lg border border-border/80 bg-card p-5 flex flex-col justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Átlagos Time-to-Hire
          </span>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {kpiMetrics.timeToHireDays} nap
            </span>
            <span className="inline-flex items-center rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success tabular-nums">
              -3 nap
            </span>
          </div>
        </div>

        {/* 4. SLA Figyelmeztetés */}
        <div className="rounded-lg border border-border/80 bg-card p-5 flex flex-col justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            SLA Figyelmeztetés
          </span>
          <div className="flex items-center justify-between gap-2">
            <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {kpiMetrics.staleCandidates.length} jelölt
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                kpiMetrics.staleCandidates.length > 0
                  ? "bg-warning/15 text-warning"
                  : "bg-success/15 text-success"
              )}
            >
              {kpiMetrics.staleCandidates.length > 0
                ? "Azonnali teendő"
                : "Naprakész"}
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. FŐ SPLIT COCKPIT ELRENDEZÉS (BAL 8 OSZLOP: BI DIAGRAMOK | JOBB 4 OSZLOP: OPERATÍV AKCIÓKÖZPONT) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ════════ BAL OLDAL (8 OSZLOP): STRATÉGIAI BI DIAGRAMOK ════════ */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. KÁRTYA: Toborzási Csatornák Hatékonysága & Konverzió */}
          <div className="rounded-lg border border-border/80 bg-card p-6 space-y-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-foreground">
                Toborzási Csatornák Hatékonysága & Konverzió
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Bal fele (5 oszlop): Fánkdiagram (Donut) + Százalékos Jelmagyarázat */}
              <div className="md:col-span-5 flex items-center gap-4">
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={channelAnalytics}
                        dataKey="applications"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={76}
                        paddingAngle={2}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                        isAnimationActive={false}
                      >
                        {channelAnalytics.map((entry, idx) => (
                          <Cell key={`donut-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(value: any, name: any) => [
                          `${value} fő`,
                          String(name),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2.5 flex-1 min-w-0">
                  {channelAnalytics.map((ch) => (
                    <div
                      key={ch.key}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ch.color }}
                        />
                        <span className="font-medium text-foreground truncate">
                          {ch.name}
                        </span>
                      </div>
                      <span className="font-semibold tabular-nums text-foreground shrink-0">
                        {ch.sharePct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Jobb fele (7 oszlop): Csoportosított Oszlopdiagram (Jelentkezések vs. Interjúk) */}
              <div className="md:col-span-7 space-y-2">
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={channelAnalytics}
                      margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
                      barGap={6}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        opacity={0.22}
                      />
                      <XAxis
                        dataKey="name"
                        fontSize={11}
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        fontSize={11}
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <RechartsTooltip
                        cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(value: any, name: any) => [
                          `${value} fő`,
                          name === "applications"
                            ? "Beérkezett jelentkezés"
                            : "Interjúba jutott",
                        ]}
                      />
                      <Bar
                        dataKey="applications"
                        fill="#0f766e"
                        radius={[3, 3, 0, 0]}
                        barSize={22}
                        isAnimationActive={false}
                      />
                      <Bar
                        dataKey="interviews"
                        fill="#14b8a6"
                        radius={[3, 3, 0, 0]}
                        barSize={22}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Alsó jelmagyarázat */}
                <div className="flex items-center justify-center gap-6 pt-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: "#0f766e" }}
                    />
                    <span>Jelentkezések</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: "#14b8a6" }}
                    />
                    <span>Interjúk</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. KÁRTYA: Pozíciónkénti Bérigény vs. Meghirdetett Bérsáv (Range Bar + Marker Dot) */}
          <div className="rounded-lg border border-border/80 bg-card p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-foreground">
                Pozíciónkénti Bérigény vs. Meghirdetett Bérsáv
              </h3>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-5 rounded-sm bg-[#14b8a6]/35 border border-[#0f766e]/30" />
                  <span>Meghirdetett bérsáv</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#0f766e]" />
                  <span>Jelöltek átlagos bérigénye</span>
                </div>
              </div>
            </div>

            {salaryRangeRows.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Nincs megjeleníthető pozíció a kiválasztott részlegben.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Skála fejlécek (Budget limits) */}
                <div className="grid grid-cols-12 items-center text-[11px] font-medium text-muted-foreground pb-1">
                  <div className="col-span-12 sm:col-span-4" />
                  <div className="col-span-12 sm:col-span-8 flex items-center justify-between px-1">
                    <span>Bérsáv minimum (Budget min)</span>
                    <span>Bérsáv maximum (Budget max)</span>
                  </div>
                </div>

                {salaryRangeRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-12 items-center gap-3 sm:gap-4"
                  >
                    {/* Pozíció megnevezése */}
                    <div className="col-span-12 sm:col-span-4 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {row.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        Sáv: {formatHuf(row.minBand)} – {formatHuf(row.maxBand)}
                      </p>
                    </div>

                    {/* Vizuális Range Bar + Marker Dot */}
                    <div className="col-span-12 sm:col-span-8 space-y-1">
                      <div className="relative h-6 w-full rounded-md bg-[#14b8a6]/12 overflow-hidden flex items-center">
                        {/* Meghirdetett bérsáv tartomány (közép-teal sáv) */}
                        <div
                          className="absolute top-0 bottom-0 rounded-md bg-[#14b8a6]/40 transition-all"
                          style={{
                            left: `${row.bandStartPct}%`,
                            width: `${row.bandWidthPct}%`,
                          }}
                          title={`Meghirdetett bérsáv: ${formatHuf(
                            row.minBand
                          )} – ${formatHuf(row.maxBand)}`}
                        />

                        {/* Átlagos jelölti bérigény marker pont (sötét-teal kör) */}
                        <div
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full ring-2 ring-background transition-all",
                            row.isOverMax ? "bg-warning" : "bg-[#0f766e]"
                          )}
                          style={{ left: `${row.markerPct}%` }}
                          title={`Jelöltek átlagos bérigénye: ${formatHuf(
                            row.avgDemand
                          )}`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums px-0.5">
                        <span>
                          Átlagos bérigény:{" "}
                          <strong
                            className={cn(
                              row.isOverMax ? "text-warning" : "text-foreground"
                            )}
                          >
                            {formatHuf(row.avgDemand)}
                          </strong>
                        </span>
                        <span>
                          {row.isOverMax
                            ? "Meghirdetett sáv felett"
                            : "Bérkereten belül"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ════════ JOBB OLDAL (4 OSZLOP): OPERATÍV AKCIÓKÖZPONT & SLA PANEL ════════ */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. JOBB KÁRTYA: Pozíciók Betöltöttségi Állapota */}
          <div className="rounded-lg border border-border/80 bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Pozíciók Betöltöttségi Állapota
            </h3>

            {headcountByDept.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nincs nyitott pozíció.
              </p>
            ) : (
              <div className="space-y-3.5">
                {headcountByDept.map((item) => (
                  <div key={item.dept} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">
                        {item.dept}
                      </span>
                      <span className="font-semibold tabular-nums text-muted-foreground">
                        ({item.filled}/{item.target})
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-[#14b8a6]/15 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#14b8a6] transition-all duration-300"
                        style={{ width: `${Math.max(item.pct, 12)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. JOBB KÁRTYA: Sürgős Beavatkozás (7+ napja várakozó) */}
          <div className="rounded-lg border border-border/80 bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Sürgős Beavatkozás (7+ napja várakozó)
            </h3>

            {kpiMetrics.staleCandidates.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                Minden jelölt 7 napon belül visszajelzést kapott.
              </p>
            ) : (
              <div className="space-y-3">
                {kpiMetrics.staleCandidates.slice(0, 4).map((sc) => (
                  <div
                    key={sc.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-muted border border-border/70 flex items-center justify-center text-xs font-semibold text-foreground shrink-0">
                        {getInitials(sc.displayName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {sc.displayName}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {sc.positionTitle}
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-semibold text-warning tabular-nums shrink-0">
                      {sc.waitingDays} napja vár
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. JOBB KÁRTYA: Kiemelt AI Relevanciájú Jelöltek (>85%) */}
          <div className="rounded-lg border border-border/80 bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Kiemelt AI Relevanciájú Jelöltek (&gt;85%)
            </h3>

            {kpiMetrics.topAiCandidates.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                Jelenleg nincs 85% feletti AI relevanciájú aktív jelölt.
              </p>
            ) : (
              <div className="space-y-3">
                {kpiMetrics.topAiCandidates.slice(0, 4).map((tc) => (
                  <div
                    key={tc.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                        {getInitials(tc.displayName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {tc.displayName}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {tc.positionTitle}
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center rounded-full bg-[#14b8a6]/20 px-2.5 py-1 text-[11px] font-semibold text-[#0f766e] dark:text-[#5eead4] tabular-nums shrink-0">
                      AI: {tc.aiScore}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
