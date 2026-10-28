"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, X } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { KpiCard } from "@/components/kpi-card"
import { TableToolbar, type TableColumnOption, type FilterGroup } from "@/components/table-toolbar/table-toolbar"

export interface EnrichedEmployee {
  id: string
  nev: string
  avatar_url: string | null
  munkakor: string
  reszleg: string
}

export interface PerformanceCycleItem {
  id: string
  megnevezes: string
  kezdo_datum: string
  befejezo_datum: string
  statusz: string
}

export interface PerformanceKpiItem {
  id: string
  dolgozo_id: string
  ciklus_id: string | null
  celkituzes: string
  meroszam_tipusa: string | null
  cel_ertek: number | null
  aktualis_ertek: number | null
  sulyozas: number | null
  workflow_fazis: string | null
  ertekeles_lezarva_datum: string | null
  ertekeles_szovege: string | null
  onertekeles_szovege: string | null
  hatarido: string | null
}

interface CalibrationBucket {
  id: string
  rangeLabel: string
  name: string
  min: number
  max: number
  idealPct: number
  barColor: string
  bonusLabel: string
  badgeClass: string
}

const CALIBRATION_BUCKETS: CalibrationBucket[] = [
  {
    id: "alulteljesit",
    rangeLabel: "0–40%",
    name: "Alulteljesít",
    min: 0,
    max: 40,
    idealPct: 5,
    barColor: "#5eead4",
    bonusLabel: "Alulteljesít (0% prémium)",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/30",
  },
  {
    id: "fejlesztendo",
    rangeLabel: "41–59%",
    name: "Fejlesztendő",
    min: 41,
    max: 59,
    idealPct: 15,
    barColor: "#2dd4bf",
    bonusLabel: "Fejlesztendő (0% prémium)",
    badgeClass: "bg-warning/10 text-warning border-warning/30",
  },
  {
    id: "megfelelo",
    rangeLabel: "60–74%",
    name: "Megfelelő",
    min: 60,
    max: 74,
    idealPct: 45,
    barColor: "#14b8a6",
    bonusLabel: "Alap Bónusz Sáv (60%)",
    badgeClass: "bg-info/10 text-info border-info/30",
  },
  {
    id: "magas",
    rangeLabel: "75–89%",
    name: "Magas",
    min: 75,
    max: 89,
    idealPct: 25,
    barColor: "#0d9488",
    bonusLabel: "Magas Prémium Sáv (85%)",
    badgeClass: "bg-primary/10 text-primary border-primary/30",
  },
  {
    id: "kimagaslo",
    rangeLabel: "90–100%",
    name: "Kimagasló",
    min: 90,
    max: 100,
    idealPct: 10,
    barColor: "#0f766e",
    bonusLabel: "Kimagasló Prémium (100%)",
    badgeClass: "bg-success/10 text-success border-success/30",
  },
]

const WORKFLOW_PHASE_META: Record<string, { label: string; order: number; badgeClass: string }> = {
  celkituzes: {
    label: "1. Célkitűzés",
    order: 1,
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
  onertekeles: {
    label: "2. Önértékelés",
    order: 2,
    badgeClass: "bg-info/10 text-info border-info/30",
  },
  vezetoi_ertekeles: {
    label: "3. Vezetői értékelés",
    order: 3,
    badgeClass: "bg-warning/10 text-warning border-warning/30",
  },
  megbeszeles: {
    label: "4. Megbeszélés (1-on-1)",
    order: 4,
    badgeClass: "bg-primary/10 text-primary border-primary/30",
  },
  lezart: {
    label: "5. Lezárt",
    order: 5,
    badgeClass: "bg-success/10 text-success border-success/30",
  },
}

export function calculateKpiPercent(k: PerformanceKpiItem): number {
  if (k.meroszam_tipusa === "szazalek") {
    return Math.max(0, Math.min(100, Math.round(Number(k.aktualis_ertek || 0))))
  }
  if (k.meroszam_tipusa === "igen_nem") {
    return Number(k.aktualis_ertek) === 1 ? 100 : 0
  }
  const target = Number(k.cel_ertek || 0)
  if (target <= 0) return 0
  const actual = Number(k.aktualis_ertek || 0)
  return Math.max(0, Math.min(100, Math.round((actual / target) * 100)))
}

export function resolveWorkflowPhase(k: PerformanceKpiItem): string {
  if (k.workflow_fazis && k.workflow_fazis in WORKFLOW_PHASE_META) {
    return k.workflow_fazis
  }
  if (k.ertekeles_lezarva_datum) return "lezart"
  if (k.ertekeles_szovege) return "vezetoi_ertekeles"
  if (k.onertekeles_szovege) return "onertekeles"
  return "celkituzes"
}

export function getBucketForScore(score: number): CalibrationBucket {
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  return (
    CALIBRATION_BUCKETS.find((b) => clamped >= b.min && clamped <= b.max) ||
    CALIBRATION_BUCKETS[0]
  )
}

interface PerformanceCalibrationDashboardProps {
  employees: EnrichedEmployee[]
  cycles: PerformanceCycleItem[]
  kpis: PerformanceKpiItem[]
}

export function PerformanceCalibrationDashboard({
  employees,
  cycles,
  kpis,
}: PerformanceCalibrationDashboardProps) {
  // Alapértelmezetten az aktív/nyitott ciklust vagy az összeset mutatjuk
  const defaultCycleId = useMemo(() => {
    const active = cycles.find((c) => c.statusz === "nyitott" || c.statusz === "aktiv")
    return active ? active.id : "all"
  }, [cycles])

  const [selectedCycleId, setSelectedCycleId] = useState<string>(defaultCycleId)
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedPhaseFilters, setSelectedPhaseFilters] = useState<string[]>([])
  const [selectedTierFilters, setSelectedTierFilters] = useState<string[]>([])

  const [columns, setColumns] = useState<TableColumnOption[]>([
    { id: "dolgozo", label: "Dolgozó & Munkakör", isVisible: true },
    { id: "reszleg", label: "Részleg", isVisible: true },
    { id: "kpi", label: "Kitűzött KPI", isVisible: true },
    { id: "workflow", label: "Workflow Fázis", isVisible: true },
    { id: "index", label: "Teljesítmény Index", isVisible: true },
    { id: "premium", label: "Javasolt Prémium Sáv", isVisible: true },
  ])

  const isColVisible = (id: string) => columns.find((c) => c.id === id)?.isVisible ?? true

  const handleToggleColumn = (columnId: string) => {
    setColumns((prev) =>
      prev.map((col) => (col.id === columnId ? { ...col, isVisible: !col.isVisible } : col))
    )
  }

  // Elérhető részlegek listája
  const departments = useMemo(() => {
    const set = new Set<string>()
    employees.forEach((e) => {
      if (e.reszleg) set.add(e.reszleg)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, "hu"))
  }, [employees])

  // Szűrt dolgozók részleg szerint
  const departmentEmployees = useMemo(() => {
    if (selectedDepartment === "all") return employees
    return employees.filter((e) => e.reszleg === selectedDepartment)
  }, [employees, selectedDepartment])

  const departmentEmployeeIds = useMemo(
    () => new Set(departmentEmployees.map((e) => e.id)),
    [departmentEmployees]
  )

  // Szűrt KPI-ok ciklus és részleg szerint
  const scopedKpis = useMemo(() => {
    return kpis.filter((k) => {
      if (!departmentEmployeeIds.has(k.dolgozo_id)) return false
      if (selectedCycleId !== "all" && k.ciklus_id !== selectedCycleId) return false
      return true
    })
  }, [kpis, departmentEmployeeIds, selectedCycleId])

  // Dolgozói szintű súlyozott kalibrációs sorok
  const employeeCalibrationRows = useMemo(() => {
    return departmentEmployees
      .map((emp) => {
        const empKpis = scopedKpis.filter((k) => k.dolgozo_id === emp.id)
        if (empKpis.length === 0) return null

        let weightedSum = 0
        let totalWeight = 0
        empKpis.forEach((k) => {
          const w = Math.max(1, Number(k.sulyozas || 1))
          weightedSum += calculateKpiPercent(k) * w
          totalWeight += w
        })
        const avgScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0
        const bucket = getBucketForScore(avgScore)

        // Legkorábbi (vagy domináns) workflow fázis meghatározása
        const phases = empKpis.map(resolveWorkflowPhase)
        const allClosed = phases.every((p) => p === "lezart")
        const dominantPhase = allClosed
          ? "lezart"
          : phases.sort(
              (a, b) =>
                (WORKFLOW_PHASE_META[a]?.order || 1) - (WORKFLOW_PHASE_META[b]?.order || 1)
            )[0] || "celkituzes"

        const primaryKpiTitle = empKpis[0]?.celkituzes || "Célkitűzés"

        return {
          employee: emp,
          kpiCount: empKpis.length,
          primaryKpiTitle,
          allKpiTitles: empKpis.map((k) => k.celkituzes).join(" • "),
          avgScore,
          bucket,
          dominantPhase,
          phaseMeta: WORKFLOW_PHASE_META[dominantPhase] || WORKFLOW_PHASE_META.celkituzes,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.avgScore - a.avgScore)
  }, [departmentEmployees, scopedKpis])

  // 4 Kanonikus KPI kártya mutatói
  const totalScopedKpis = scopedKpis.length
  const evaluatedHeadcount = employeeCalibrationRows.length
  const totalHeadcount = departmentEmployees.length

  const avgAchievement = useMemo(() => {
    if (employeeCalibrationRows.length === 0) return 0
    const sum = employeeCalibrationRows.reduce((acc, r) => acc + r.avgScore, 0)
    return Math.round(sum / employeeCalibrationRows.length)
  }, [employeeCalibrationRows])

  const bonusEligibleCount = useMemo(
    () => employeeCalibrationRows.filter((r) => r.avgScore >= 60).length,
    [employeeCalibrationRows]
  )

  const closedKpiCount = useMemo(
    () => scopedKpis.filter((k) => resolveWorkflowPhase(k) === "lezart").length,
    [scopedKpis]
  )
  const closedRatePct =
    totalScopedKpis > 0 ? Math.round((closedKpiCount / totalScopedKpis) * 100) : 0

  // Kalibrációs Haranggörbe (5 sávos eloszlás)
  const bellCurveData = useMemo(() => {
    const total = employeeCalibrationRows.length
    return CALIBRATION_BUCKETS.map((bucket) => {
      const count = employeeCalibrationRows.filter((r) => r.bucket.id === bucket.id).length
      const actualPct = total > 0 ? Math.round((count / total) * 100) : 0
      return {
        ...bucket,
        count,
        actualPct,
      }
    })
  }, [employeeCalibrationRows])

  const maxBucketCount = useMemo(() => {
    return Math.max(1, ...bellCurveData.map((b) => b.count))
  }, [bellCurveData])

  // Ciklusonkénti Vállalati Teljesítmény Trend (AreaChart)
  const cycleTrendData = useMemo(() => {
    const sortedCycles = [...cycles].sort((a, b) =>
      (a.kezdo_datum || "").localeCompare(b.kezdo_datum || "")
    )
    return sortedCycles.map((c) => {
      const cKpis = kpis.filter(
        (k) => k.ciklus_id === c.id && departmentEmployeeIds.has(k.dolgozo_id)
      )
      if (cKpis.length === 0) {
        return {
          id: c.id,
          name: c.megnevezes,
          average: 0,
          kpiCount: 0,
          hasData: false,
        }
      }
      let weightedSum = 0
      let totalWeight = 0
      cKpis.forEach((k) => {
        const w = Math.max(1, Number(k.sulyozas || 1))
        weightedSum += calculateKpiPercent(k) * w
        totalWeight += w
      })
      return {
        id: c.id,
        name: c.megnevezes,
        average: totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0,
        kpiCount: cKpis.length,
        hasData: true,
      }
    })
  }, [cycles, kpis, departmentEmployeeIds])

  // Táblázat szűrőcsoportok (TableToolbar)
  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        id: "tier",
        title: "Javasolt Prémium Sáv",
        options: CALIBRATION_BUCKETS.map((b) => ({
          id: b.id,
          label: `${b.name} (${b.rangeLabel})`,
          checked: selectedTierFilters.includes(b.id),
        })),
        onToggle: (id: string) => {
          setSelectedTierFilters((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
          )
        },
      },
      {
        id: "phase",
        title: "Workflow Fázis",
        options: Object.entries(WORKFLOW_PHASE_META).map(([key, meta]) => ({
          id: key,
          label: meta.label,
          checked: selectedPhaseFilters.includes(key),
        })),
        onToggle: (id: string) => {
          setSelectedPhaseFilters((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
          )
        },
      },
    ],
    [selectedTierFilters, selectedPhaseFilters]
  )

  const filteredTableRows = useMemo(() => {
    return employeeCalibrationRows.filter((row) => {
      if (selectedBucketId && row.bucket.id !== selectedBucketId) return false
      if (selectedTierFilters.length > 0 && !selectedTierFilters.includes(row.bucket.id)) {
        return false
      }
      if (selectedPhaseFilters.length > 0 && !selectedPhaseFilters.includes(row.dominantPhase)) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = row.employee.nev.toLowerCase().includes(q)
        const matchRole = row.employee.munkakor.toLowerCase().includes(q)
        const matchDept = row.employee.reszleg.toLowerCase().includes(q)
        const matchKpi = row.allKpiTitles.toLowerCase().includes(q)
        if (!matchName && !matchRole && !matchDept && !matchKpi) return false
      }
      return true
    })
  }, [
    employeeCalibrationRows,
    selectedBucketId,
    selectedTierFilters,
    selectedPhaseFilters,
    searchQuery,
  ])

  const handleExportCsv = () => {
    const headers = [
      "Dolgozó",
      "Munkakör",
      "Részleg",
      "Kitűzött KPI db",
      "Fő KPI megnevezése",
      "Workflow Fázis",
      "Teljesítmény Index (%)",
      "Javasolt Prémium Sáv",
    ]
    const rows = filteredTableRows.map((r) => [
      r.employee.nev,
      r.employee.munkakor,
      r.employee.reszleg,
      String(r.kpiCount),
      `"${r.primaryKpiTitle.replace(/"/g, '""')}"`,
      r.phaseMeta.label,
      `${r.avgScore}%`,
      r.bucket.bonusLabel,
    ])
    const csvContent =
      "\uFEFF" + [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `teljesitmeny_kalibracio_riport.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="w-full space-y-6 pb-10">
      {/* Vissza link + Fejléc ciklus- és részlegszűrővel (Terv B) */}
      <div>
        <Link
          href="/hr/performance"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Vissza a Teljesítményértékeléshez
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Vezetői Teljesítmény Riportok
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Vállalati teljesítmény-kalibráció (haranggörbe), ciklusonkénti trendek és prémiumjavaslati mátrix.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Ciklus:</span>
              <select
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all">Összes ciklus</option>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.megnevezes} {c.statusz === "nyitott" || c.statusz === "aktiv" ? "(Aktív)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Részleg:</span>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all">Minden részleg</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-9 gap-1.5 text-xs font-medium cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Exportálás
            </Button>
          </div>
        </div>
      </div>

      {/* 4 Kanonikus Linear-flat KPI kártya (Terv B) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Aktív célkitűzések"
          value={`${totalScopedKpis} db`}
          sub={`${evaluatedHeadcount} / ${totalHeadcount} munkavállalónál rögzítve`}
        />
        <KpiCard
          label="Átlagos teljesülés"
          value={`${avgAchievement}%`}
          sub="Súlyozott vállalati teljesítményindex"
        />
        <KpiCard
          label="Bónuszra jogosult"
          value={`${bonusEligibleCount} / ${evaluatedHeadcount} fő`}
          sub="Legalább 60%-os teljesítési indexszel"
        />
        <KpiCard
          label="Lezárt értékelések"
          value={`${closedRatePct}%`}
          sub={`${closedKpiCount} / ${totalScopedKpis} KPI véglegesítve (5. fázis)`}
        />
      </div>

      {/* Középső sor: Kalibrációs Haranggörbe (Bal) + Ciklusonkénti Vállalati Teljesítmény Trend (Jobb) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BAL KÁRTYA: Teljesítmény Kalibrációs Eloszlás (Haranggörbe) */}
        <Card className="border-border flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold">
                  Teljesítmény Kalibrációs Eloszlás (Haranggörbe)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Munkavállalói teljesítményindexek megoszlása az 5 kalibrációs sávban (kattints egy oszlopra a szűréshez)
                </CardDescription>
              </div>
              {selectedBucketId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedBucketId(null)}
                  className="h-7 px-2 text-xs text-primary hover:text-primary/80 gap-1 shrink-0"
                >
                  Szűrés törlése
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-4 pb-5">
            <div className="h-64 flex items-end justify-between gap-3 sm:gap-5 px-2 sm:px-4 pt-8 border-b border-border/70 pb-3">
              {bellCurveData.map((bucket) => {
                const isSelected = selectedBucketId === bucket.id
                const isDimmed = selectedBucketId !== null && !isSelected
                // Magasság arányosítása (minimum 12%, hogy a 0-s sáv is látszódjon mint alapvonal)
                const heightPct =
                  bucket.count === 0
                    ? 8
                    : Math.max(18, Math.round((bucket.count / maxBucketCount) * 100))

                return (
                  <button
                    key={bucket.id}
                    type="button"
                    onClick={() =>
                      setSelectedBucketId((prev) => (prev === bucket.id ? null : bucket.id))
                    }
                    className={`group flex-1 h-full flex flex-col items-center justify-end focus:outline-none cursor-pointer transition-opacity ${
                      isDimmed ? "opacity-40 hover:opacity-75" : "opacity-100"
                    }`}
                  >
                    {/* Oszlop feletti értékek */}
                    <div className="mb-2 text-center">
                      <span className="text-xs font-semibold tabular-nums text-foreground block">
                        {bucket.count} fő
                      </span>
                      <span className="text-[10px] tabular-nums text-muted-foreground block">
                        {bucket.actualPct}% (Cél: {bucket.idealPct}%)
                      </span>
                    </div>

                    {/* Oszlop */}
                    <div className="w-full max-w-[78px] flex items-end justify-center h-[165px]">
                      <div
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: bucket.barColor,
                        }}
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          isSelected
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                            : "group-hover:brightness-110"
                        }`}
                      />
                    </div>
                  </button>
                )
              })}
            </div>

            {/* X tengely feliratok az oszlopok alatt */}
            <div className="grid grid-cols-5 gap-2 sm:gap-4 px-1 sm:px-3 pt-3 text-center">
              {bellCurveData.map((bucket) => {
                const isSelected = selectedBucketId === bucket.id
                return (
                  <div
                    key={bucket.id}
                    onClick={() =>
                      setSelectedBucketId((prev) => (prev === bucket.id ? null : bucket.id))
                    }
                    className="cursor-pointer select-none"
                  >
                    <span
                      className={`text-xs font-semibold tabular-nums block ${
                        isSelected ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {bucket.rangeLabel}
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                      {bucket.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* JOBB KÁRTYA: Ciklusonkénti Vállalati Teljesítmény Trend */}
        <Card className="border-border flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold">
                  Ciklusonkénti Vállalati Teljesítmény Trend
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Súlyozott vállalati teljesítményindex alakulása az egymást követő értékelési ciklusokban
                </CardDescription>
              </div>
              {cycleTrendData.filter((d) => d.hasData).length >= 2 && (
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/30 text-xs tabular-nums shrink-0"
                >
                  {(() => {
                    const valid = cycleTrendData.filter((d) => d.hasData)
                    const last = valid[valid.length - 1].average
                    const prev = valid[valid.length - 2].average
                    const diff = last - prev
                    return `${diff >= 0 ? "+" : ""}${diff}% az előző ciklushoz képest`
                  })()}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-4 pb-5">
            <div className="h-[268px] w-full">
              {cycleTrendData.some((d) => d.hasData) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={cycleTrendData}
                    margin={{ top: 16, right: 20, left: -12, bottom: 8 }}
                  >
                    <defs>
                      <linearGradient id="perfTrendTealGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.38} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="name"
                      fontSize={12}
                      tickMargin={10}
                      stroke="hsl(var(--muted-foreground))"
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(val) => `${val}%`}
                      fontSize={12}
                      stroke="hsl(var(--muted-foreground))"
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      formatter={(value: any, _name: any, props: any) => [
                        `${value}% (${props?.payload?.kpiCount || 0} db KPI)`,
                        "Vállalati átlag",
                      ]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="average"
                      stroke="#0d9488"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#perfTrendTealGrad)"
                      activeDot={{ r: 5, fill: "#0d9488", strokeWidth: 0 }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                  <p className="text-sm font-medium text-foreground">
                    Nincs megjeleníthető ciklus-trend adat
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    A ciklusonkénti teljesítmény-trend a célok rögzítése és értékelése után jelenik meg.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ALSÓ TELJES SZÉLESSÉGŰ KÁRTYA: Bérszámfejtési és Prémium Kalibrációs Táblázat (Terv B) */}
      <Card className="border-border">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Bérszámfejtési és Prémium Kalibrációs Táblázat
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                A munkavállalók súlyozott teljesítményindexe, workflow állapota és a javasolt prémiumsávok
              </CardDescription>
            </div>

            <div className="flex-1 max-w-2xl">
              <TableToolbar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Keresés dolgozó, munkakör, részleg vagy KPI alapján..."
                columns={columns}
                onToggleColumn={handleToggleColumn}
                filterGroups={filterGroups}
                activeFiltersCount={
                  selectedTierFilters.length +
                  selectedPhaseFilters.length +
                  (selectedBucketId ? 1 : 0)
                }
                onClearFilters={() => {
                  setSelectedTierFilters([])
                  setSelectedPhaseFilters([])
                  setSelectedBucketId(null)
                }}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/40 uppercase tracking-wider border-b border-border">
                <tr>
                  {isColVisible("dolgozo") && (
                    <th className="px-4 py-3 font-medium">Dolgozó &amp; Munkakör</th>
                  )}
                  {isColVisible("reszleg") && (
                    <th className="px-4 py-3 font-medium">Részleg</th>
                  )}
                  {isColVisible("kpi") && (
                    <th className="px-4 py-3 font-medium">Kitűzött KPI</th>
                  )}
                  {isColVisible("workflow") && (
                    <th className="px-4 py-3 font-medium">Workflow Fázis</th>
                  )}
                  {isColVisible("index") && (
                    <th className="px-4 py-3 font-medium">Teljesítmény Index</th>
                  )}
                  {isColVisible("premium") && (
                    <th className="px-4 py-3 font-medium">Javasolt Prémium Sáv</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTableRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.filter((c) => c.isVisible).length || 1}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      <p className="text-sm font-medium text-foreground">
                        Nincs a szűrési feltételeknek megfelelő értékelés
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Módosítsd a keresési kifejezést vagy a kiválasztott ciklus- és kalibrációs szűrőket.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTableRows.map((row) => {
                    const initials = row.employee.nev
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()

                    return (
                      <tr
                        key={row.employee.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        {isColVisible("dolgozo") && (
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border border-border/60">
                                <AvatarImage
                                  src={row.employee.avatar_url || ""}
                                  alt={row.employee.nev}
                                />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-medium text-foreground block">
                                  {row.employee.nev}
                                </span>
                                <span className="text-xs text-muted-foreground block">
                                  {row.employee.munkakor}
                                </span>
                              </div>
                            </div>
                          </td>
                        )}

                        {isColVisible("reszleg") && (
                          <td className="px-4 py-3.5 text-muted-foreground font-medium">
                            {row.employee.reszleg}
                          </td>
                        )}

                        {isColVisible("kpi") && (
                          <td className="px-4 py-3.5">
                            <div className="max-w-xs">
                              <span
                                className="text-foreground font-medium block truncate"
                                title={row.allKpiTitles}
                              >
                                {row.primaryKpiTitle}
                              </span>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                Összesen {row.kpiCount} db kitűzött KPI
                              </span>
                            </div>
                          </td>
                        )}

                        {isColVisible("workflow") && (
                          <td className="px-4 py-3.5">
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium ${row.phaseMeta.badgeClass}`}
                            >
                              {row.phaseMeta.label}
                            </Badge>
                          </td>
                        )}

                        {isColVisible("index") && (
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-28 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${row.avgScore}%`,
                                    backgroundColor: row.bucket.barColor,
                                  }}
                                />
                              </div>
                              <span className="font-semibold tabular-nums text-foreground w-10">
                                {row.avgScore}%
                              </span>
                            </div>
                          </td>
                        )}

                        {isColVisible("premium") && (
                          <td className="px-4 py-3.5">
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium ${row.bucket.badgeClass}`}
                            >
                              {row.bucket.bonusLabel}
                            </Badge>
                          </td>
                        )}
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
  )
}
