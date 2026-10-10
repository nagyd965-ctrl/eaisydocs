"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import Link from "next/link"
import {
  CompanyOvertimeComplianceOverview,
  EmployeeOvertimeComplianceRecord,
} from "@/utils/hr/overtime-engine"
import { toggleVoluntaryOvertimeAgreementAction } from "@/app/hr/compliance/compliance-actions"
import { TableToolbar, TableColumnOption, FilterGroup } from "@/components/table-toolbar/table-toolbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import {
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Loader2,
  Calendar,
} from "lucide-react"

interface OvertimeComplianceTableProps {
  initialData: CompanyOvertimeComplianceOverview
}

export function OvertimeComplianceTable({ initialData }: OvertimeComplianceTableProps) {
  const [data, setData] = useState<CompanyOvertimeComplianceOverview>(initialData)
  const [search, setSearch] = useState("")
  const [selectedWeeklyStatus, setSelectedWeeklyStatus] = useState<string>("all")
  const [selectedAnnualStatus, setSelectedAnnualStatus] = useState<string>("all")
  const [selectedAgreement, setSelectedAgreement] = useState<string>("all")
  const [selectedDept, setSelectedDept] = useState<string>("all")
  const [isPending, startTransition] = useTransition()
  const [loadingEmpId, setLoadingEmpId] = useState<string | null>(null)

  // Oszlopok definíciója a TableToolbar számára
  const [columns, setColumns] = useState<TableColumnOption[]>([
    { id: "dolgozo", label: "Munkatárs", isVisible: true },
    { id: "reszleg", label: "Szervezeti egység / Munkakör", isVisible: true },
    { id: "heti", label: "Heti munkaidő (Mt. 99. §)", isVisible: true },
    { id: "eves", label: "Éves túlórakeret (Mt. 135. §)", isVisible: true },
    { id: "statusz", label: "Éves státusz", isVisible: true },
    { id: "megallapodas", label: "400h megállapodás", isVisible: true },
    { id: "muveletek", label: "Műveletek", isVisible: true },
  ])

  const handleToggleColumn = (colId: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, isVisible: !c.isVisible } : c))
    )
  }

  const isColVisible = (colId: string) => {
    const col = columns.find((c) => c.id === colId)
    return col ? col.isVisible : true
  }

  // Egyedi részlegek kinyerése a szűrőhöz
  const departments = React.useMemo(() => {
    const set = new Set<string>()
    data.records.forEach((e) => {
      if (e.szervezetiEgysegNev) set.add(e.szervezetiEgysegNev)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, "hu"))
  }, [data.records])

  // Szűrőcsoportok a TableToolbar Popover számára
  const filterGroups: FilterGroup[] = [
    {
      id: "weekly",
      title: "Heti munkaidő (Mt. 99. §)",
      options: [
        { id: "all", label: "Összes heti státusz", checked: selectedWeeklyStatus === "all" },
        { id: "illegal", label: "🚨 >48h Mt. Törvénysértés", checked: selectedWeeklyStatus === "illegal" },
        { id: "overtime", label: "⚠️ 40–48h Túlóra", checked: selectedWeeklyStatus === "overtime" },
        { id: "normal", label: "✅ Normál (≤40h)", checked: selectedWeeklyStatus === "normal" },
      ],
      onToggle: (optId: string) => setSelectedWeeklyStatus(optId),
    },
    {
      id: "annual",
      title: "Éves túlórakeret (Mt. 135. §)",
      options: [
        { id: "all", label: "Összes éves szint", checked: selectedAnnualStatus === "all" },
        { id: "exceeded", label: "🔴 Kimerült keret (100%+)", checked: selectedAnnualStatus === "exceeded" },
        { id: "warning", label: "🟡 Küszöbön (80–99%)", checked: selectedAnnualStatus === "warning" },
        { id: "normal", label: "🟢 Normál zóna (0–79%)", checked: selectedAnnualStatus === "normal" },
      ],
      onToggle: (optId: string) => setSelectedAnnualStatus(optId),
    },
    {
      id: "agreement",
      title: "Önként vállalt túlmunka",
      options: [
        { id: "all", label: "Mindegyik", checked: selectedAgreement === "all" },
        { id: "with_agreement", label: "📄 400h megállapodással", checked: selectedAgreement === "with_agreement" },
        { id: "without_agreement", label: "🏢 Alap 250h keret", checked: selectedAgreement === "without_agreement" },
      ],
      onToggle: (optId: string) => setSelectedAgreement(optId),
    },
    ...(departments.length > 0
      ? [
          {
            id: "dept",
            title: "Szervezeti egység",
            options: [
              { id: "all", label: "Minden részleg", checked: selectedDept === "all" },
              ...departments.map((d) => ({
                id: d,
                label: d,
                checked: selectedDept === d,
              })),
            ],
            onToggle: (optId: string) => setSelectedDept(optId),
          },
        ]
      : []),
  ]

  // Aktív szűrők számlálója a gomb jelvényéhez
  const activeFiltersCount =
    (selectedWeeklyStatus !== "all" ? 1 : 0) +
    (selectedAnnualStatus !== "all" ? 1 : 0) +
    (selectedAgreement !== "all" ? 1 : 0) +
    (selectedDept !== "all" ? 1 : 0)

  const handleResetFilters = () => {
    setSelectedWeeklyStatus("all")
    setSelectedAnnualStatus("all")
    setSelectedAgreement("all")
    setSelectedDept("all")
    setSearch("")
  }

  // Szűrt lista előállítása
  const filteredRecords = React.useMemo(() => {
    return data.records.filter((rec) => {
      // Szöveges keresés
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchName = rec.nev.toLowerCase().includes(query)
        const matchDept = rec.szervezetiEgysegNev.toLowerCase().includes(query)
        const matchJob = rec.munkakorMegnevezes.toLowerCase().includes(query)
        if (!matchName && !matchDept && !matchJob) return false
      }

      // Heti munkaidő szűrés
      if (selectedWeeklyStatus !== "all") {
        if (selectedWeeklyStatus === "illegal" && !rec.weeklyCompliance.isOver48) return false
        if (selectedWeeklyStatus === "overtime" && (!rec.weeklyCompliance.isOver40 || rec.weeklyCompliance.isOver48)) return false
        if (selectedWeeklyStatus === "normal" && rec.weeklyCompliance.isOver40) return false
      }

      // Éves keret szűrés
      if (selectedAnnualStatus !== "all") {
        if (rec.quotaStatus !== selectedAnnualStatus) return false
      }

      // Megállapodás szűrés
      if (selectedAgreement !== "all") {
        if (selectedAgreement === "with_agreement" && !rec.hasVoluntaryAgreement) return false
        if (selectedAgreement === "without_agreement" && rec.hasVoluntaryAgreement) return false
      }

      // Részleg szűrés
      if (selectedDept !== "all") {
        if (rec.szervezetiEgysegNev !== selectedDept) return false
      }

      return true
    })
  }, [data.records, search, selectedWeeklyStatus, selectedAnnualStatus, selectedAgreement, selectedDept])

  // 400h megállapodás kapcsoló kezelő
  const handleToggleAgreement = (employeeId: string, currentStatus: boolean) => {
    setLoadingEmpId(employeeId)
    const newStatus = !currentStatus

    startTransition(async () => {
      const res = await toggleVoluntaryOvertimeAgreementAction(employeeId, newStatus)
      if (res.success) {
        toast.success(
          newStatus
            ? "Önként vállalt túlmunka megállapodás (400 óra) sikeresen rögzítve!"
            : "Megállapodás törölve. A törvényes alapkeret (250 óra) lépett érvénybe."
        )
        // Lokális állapot azonnali frissítése a sima UX érdekében
        setData((prev) => {
          const updatedRecords = prev.records.map((r) => {
            if (r.dolgozoId !== employeeId) return r
            const newLimit: 250 | 400 = newStatus ? 400 : 250
            const percentage = Number(((r.workedOvertimeHours / newLimit) * 100).toFixed(1))
            const remainingHours = Math.max(0, Number((newLimit - r.workedOvertimeHours).toFixed(1)))
            const quotaStatus: "normal" | "warning" | "exceeded" =
              percentage >= 100 ? "exceeded" : percentage >= 80 ? "warning" : "normal"

            return {
              ...r,
              annualLimit: newLimit,
              hasVoluntaryAgreement: newStatus,
              agreementDate: newStatus ? new Date().toISOString().split("T")[0] : null,
              percentage,
              remainingHours,
              quotaStatus,
            }
          })

          const voluntaryCount = updatedRecords.filter((r) => r.hasVoluntaryAgreement).length
          const exceededCount = updatedRecords.filter((r) => r.quotaStatus === "exceeded").length
          const nearCount = updatedRecords.filter((r) => r.quotaStatus === "warning").length

          return {
            ...prev,
            voluntaryAgreementCount: voluntaryCount,
            exceededOvertimeLimitCount: exceededCount,
            nearOvertimeLimitCount: nearCount,
            records: updatedRecords,
          }
        })
      } else {
        toast.error("Hiba történt a megállapodás frissítésekor: " + res.error)
      }
      setLoadingEmpId(null)
    })
  }

  return (
    <div className="space-y-4">
      {/* ── KANONIKUS TABLE TOOLBAR (Keresés, Oszlopválasztó, Szűrő Popover) ── */}
      <TableToolbar
        searchPlaceholder="Keresés munkatárs, részleg vagy munkakör alapján..."
        searchValue={search}
        onSearchChange={setSearch}
        columns={columns}
        onToggleColumn={handleToggleColumn}
        filterGroups={filterGroups}
        activeFiltersCount={activeFiltersCount}
        onClearFilters={handleResetFilters}
      />

      {/* ── TÁBLÁZAT ── */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {isColVisible("dolgozo") && (
                <TableHead className="w-[240px] text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Munkatárs
                </TableHead>
              )}
              {isColVisible("reszleg") && (
                <TableHead className="w-[200px] text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Részleg / Munkakör
                </TableHead>
              )}
              {isColVisible("heti") && (
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[180px]">
                  Heti munkaidő (Mt. 99. §)
                </TableHead>
              )}
              {isColVisible("eves") && (
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[240px]">
                  Éves Túlórakeret (Mt. 135. §)
                </TableHead>
              )}
              {isColVisible("statusz") && (
                <TableHead className="w-[130px] text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                  Státusz
                </TableHead>
              )}
              {isColVisible("megallapodas") && (
                <TableHead className="w-[160px] text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                  400h Megállapodás
                </TableHead>
              )}
              {isColVisible("muveletek") && (
                <TableHead className="w-[100px] text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                  Műveletek
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.filter((c) => c.isVisible).length}
                  className="h-32 text-center text-muted-foreground text-sm"
                >
                  Nincs a megadott szűrési feltételeknek megfelelő munkatárs.
                </TableCell>
              </TableRow>
            ) : (
              filteredRecords.map((rec) => {
                const isIllegal = rec.weeklyCompliance.isOver48
                const isOvertime = rec.weeklyCompliance.isOver40
                const isExceeded = rec.quotaStatus === "exceeded"
                const isWarning = rec.quotaStatus === "warning"

                return (
                  <TableRow
                    key={rec.dolgozoId}
                    className={cn(
                      "transition-colors hover:bg-muted/30",
                      isIllegal && "bg-destructive/5"
                    )}
                  >
                    {/* 1. Munkatárs */}
                    {isColVisible("dolgozo") && (
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-border">
                            {rec.avatarUrl && <AvatarImage src={rec.avatarUrl} alt={rec.nev} />}
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {rec.nev
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <Link
                              href={`/hr/employee/${rec.dolgozoId}`}
                              className="font-medium text-foreground hover:text-primary transition-colors truncate block text-sm"
                            >
                              {rec.nev}
                            </Link>
                            <span className="text-[11px] text-muted-foreground block truncate">
                              ID: {rec.dolgozoId.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {/* 2. Részleg / Munkakör */}
                    {isColVisible("reszleg") && (
                      <TableCell className="py-3">
                        <div className="text-xs font-medium text-foreground truncate">
                          {rec.szervezetiEgysegNev}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {rec.munkakorMegnevezes}
                        </div>
                      </TableCell>
                    )}

                    {/* 3. Heti munkaidő (Mt. 99. §) */}
                    {isColVisible("heti") && (
                      <TableCell className="py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold tabular-nums text-foreground">
                              {Math.max(rec.weeklyPlannedHours, rec.weeklyActualHours)} óra
                            </span>
                            {isIllegal ? (
                              <Badge
                                variant="destructive"
                                className="text-[10px] h-4.5 px-1.5 font-bold gap-1 animate-pulse"
                              >
                                <AlertTriangle className="h-2.5 w-2.5" />
                                &gt;48h Mt. Korlát!
                              </Badge>
                            ) : isOvertime ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-4.5 px-1.5 font-medium border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                              >
                                +{Math.max(rec.weeklyPlannedHours, rec.weeklyActualHours) - 40}h túlóra
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-4.5 px-1.5 font-medium border-success/30 text-success bg-success/10"
                              >
                                Normál heti
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground tabular-nums flex items-center gap-2">
                            <span>Tervezett: {rec.weeklyPlannedHours}h</span>
                            <span>•</span>
                            <span>Tény: {rec.weeklyActualHours}h</span>
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {/* 4. Éves túlórakeret (Mt. 135. §) */}
                    {isColVisible("eves") && (
                      <TableCell className="py-3">
                        <div className="space-y-1.5 max-w-[220px]">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold tabular-nums text-foreground">
                              {rec.workedOvertimeHours}h{" "}
                              <span className="font-normal text-muted-foreground">
                                / {rec.annualLimit}h
                              </span>
                            </span>
                            <span
                              className={cn(
                                "text-[11px] font-semibold tabular-nums",
                                isExceeded
                                  ? "text-destructive"
                                  : isWarning
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-muted-foreground"
                              )}
                            >
                              {rec.percentage}%
                            </span>
                          </div>

                          {/* Linear Flat Progress Bar */}
                          <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                isExceeded
                                  ? "bg-destructive"
                                  : isWarning
                                  ? "bg-amber-500"
                                  : "bg-success"
                              )}
                              style={{ width: `${Math.min(100, rec.percentage)}%` }}
                            />
                          </div>

                          <div className="text-[10px] text-muted-foreground tabular-nums flex items-center justify-between">
                            <span>
                              Hátralévő keret:{" "}
                              <strong className={cn(rec.remainingHours === 0 && "text-destructive font-bold")}>
                                {rec.remainingHours}h
                              </strong>
                            </span>
                            {rec.hasVoluntaryAgreement && (
                              <span className="text-primary font-medium text-[9px] uppercase tracking-wider">
                                400h
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {/* 5. Éves státusz */}
                    {isColVisible("statusz") && (
                      <TableCell className="py-3 text-center">
                        {isExceeded ? (
                          <Badge
                            variant="destructive"
                            className="text-[10px] h-5 px-2 font-bold gap-1 inline-flex"
                          >
                            <ShieldAlert className="h-3 w-3" />
                            Kimerült keret
                          </Badge>
                        ) : isWarning ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 px-2 font-medium border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 inline-flex gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            Küszöbön (80%+)
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-5 px-2 font-medium border-success/30 text-success bg-success/10 inline-flex gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Megfelelő
                          </Badge>
                        )}
                      </TableCell>
                    )}

                    {/* 6. 400h Megállapodás kapcsoló */}
                    {isColVisible("megallapodas") && (
                      <TableCell className="py-3 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <div className="flex items-center gap-1.5">
                            {loadingEmpId === rec.dolgozoId ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <Checkbox
                                id={`agreement-${rec.dolgozoId}`}
                                checked={rec.hasVoluntaryAgreement}
                                onCheckedChange={() =>
                                  handleToggleAgreement(rec.dolgozoId, rec.hasVoluntaryAgreement)
                                }
                                disabled={isPending}
                                className="h-4 w-4 data-[state=checked]:bg-primary"
                              />
                            )}
                            <label
                              htmlFor={`agreement-${rec.dolgozoId}`}
                              className="text-xs font-medium cursor-pointer select-none text-foreground"
                            >
                              {rec.hasVoluntaryAgreement ? "400 óra (aktív)" : "250 óra (alap)"}
                            </label>
                          </div>
                          {rec.agreementDate && (
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {rec.agreementDate}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )}

                    {/* 7. Műveletek */}
                    {isColVisible("muveletek") && (
                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/hr/employee/${rec.dolgozoId}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              title="Dolgozói profil megnyitása"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Link href="/hr/time">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              title="Műszaktervező naptár megnyitása"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
