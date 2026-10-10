"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import Link from "next/link"
import {
  CompanyComplianceOverview,
  EmployeeComplianceSummary,
} from "@/utils/hr/leave-compliance-calculator"
import { toggle14DayWaiverAction } from "@/app/hr/compliance/compliance-actions"
import { TableToolbar, TableColumnOption, FilterGroup } from "@/components/table-toolbar/table-toolbar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
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
  Download,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Clock,
  Calendar,
  X,
  Loader2,
} from "lucide-react"

interface LeaveComplianceTableProps {
  initialData: CompanyComplianceOverview
}

export function LeaveComplianceTable({ initialData }: LeaveComplianceTableProps) {
  const [data, setData] = useState<CompanyComplianceOverview>(initialData)
  const [search, setSearch] = useState("")
  const [selectedStatus14, setSelectedStatus14] = useState<string>("all")
  const [selectedRisk, setSelectedRisk] = useState<string>("all")
  const [selectedDept, setSelectedDept] = useState<string>("all")
  const [isPending, startTransition] = useTransition()
  const [loadingEmpId, setLoadingEmpId] = useState<string | null>(null)

  // Oszlopok definíciója a TableToolbar számára
  const [columns, setColumns] = useState<TableColumnOption[]>([
    { id: "dolgozo", label: "Munkatárs", isVisible: true },
    { id: "reszleg", label: "Szervezeti egység / Munkakör", isVisible: true },
    { id: "szabadsag", label: "Szabadság (Keret / Kivett / Betervezett / Maradvány)", isVisible: true },
    { id: "mentesules14", label: "14 napos egybefüggő pihenő", isVisible: true },
    { id: "kockazat", label: "Év végi maradvány kockázat", isVisible: true },
    { id: "megallapodas", label: "Eltérő megállapodás", isVisible: true },
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
    data.employees.forEach((e) => {
      if (e.szervezetiEgysegNev) set.add(e.szervezetiEgysegNev)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, "hu"))
  }, [data.employees])

  // Szűrőcsoportok a TableToolbar Popover számára
  const filterGroups: FilterGroup[] = [
    {
      id: "status14",
      title: "14 napos kötelezettség",
      options: [
        { id: "all", label: "Összes státusz", checked: selectedStatus14 === "all" },
        { id: "teljesitve", label: "✅ Teljesítve", checked: selectedStatus14 === "teljesitve" },
        { id: "betervezve", label: "⏳ Betervezve (Jóváhagyásra vár)", checked: selectedStatus14 === "betervezve" },
        { id: "megallapodas_alapjan_mentes", label: "📄 Megállapodással mentes", checked: selectedStatus14 === "megallapodas_alapjan_mentes" },
        { id: "nem_teljesult", label: "⚠️ Hiányzik (Nincs betervezve)", checked: selectedStatus14 === "nem_teljesult" },
      ],
      onToggle: (optId: string) => setSelectedStatus14(optId),
    },
    {
      id: "risk",
      title: "Év végi kiadhatósági kockázat",
      options: [
        { id: "all", label: "Összes szint", checked: selectedRisk === "all" },
        { id: "kritikus", label: "🔴 Kritikus (Több maradvány mint munkanap)", checked: selectedRisk === "kritikus" },
        { id: "figyelmeztetes", label: "🟡 Figyelmeztetés (Novemberi riasztás)", checked: selectedRisk === "figyelmeztetes" },
        { id: "rendben", label: "🟢 Rendben", checked: selectedRisk === "rendben" },
      ],
      onToggle: (optId: string) => setSelectedRisk(optId),
    },
    {
      id: "department",
      title: "Szervezeti egység (Részleg)",
      options: [
        { id: "all", label: "Összes részleg", checked: selectedDept === "all" },
        ...departments.map((d) => ({
          id: d,
          label: d,
          checked: selectedDept === d,
        })),
      ],
      onToggle: (optId: string) => setSelectedDept(optId),
    },
  ]

  // Aktív szűrők számlálása
  let activeFiltersCount = 0
  if (selectedStatus14 !== "all") activeFiltersCount++
  if (selectedRisk !== "all") activeFiltersCount++
  if (selectedDept !== "all") activeFiltersCount++

  const handleClearFilters = () => {
    setSearch("")
    setSelectedStatus14("all")
    setSelectedRisk("all")
    setSelectedDept("all")
  }

  // Szűrés végrehajtása
  const filteredEmployees = React.useMemo(() => {
    return data.employees.filter((emp) => {
      // 1. Keresőmező
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = emp.nev.toLowerCase().includes(q)
        const matchDept = emp.szervezetiEgysegNev?.toLowerCase().includes(q)
        const matchJob = emp.munkakorMegnevezes?.toLowerCase().includes(q)
        if (!matchName && !matchDept && !matchJob) return false
      }

      // 2. 14 napos státusz
      if (selectedStatus14 !== "all") {
        if (emp.consecutiveResult.status !== selectedStatus14) return false
      }

      // 3. Kockázati szint
      if (selectedRisk !== "all") {
        if (emp.riskResult.riskLevel !== selectedRisk) return false
      }

      // 4. Részleg
      if (selectedDept !== "all") {
        if (emp.szervezetiEgysegNev !== selectedDept) return false
      }

      return true
    })
  }, [data.employees, search, selectedStatus14, selectedRisk, selectedDept])

  // Eltérő megállapodás kapcsoló kezelése
  const handleToggleWaiver = (employeeId: string, currentWaiver: boolean) => {
    const nextVal = !currentWaiver
    setLoadingEmpId(employeeId)

    startTransition(async () => {
      const res = await toggle14DayWaiverAction(employeeId, nextVal)
      setLoadingEmpId(null)

      if (res.success) {
        toast.success(
          nextVal
            ? "Eltérő megállapodás rögzítve (14 napos pihenő alól mentesítve)!"
            : "Eltérő megállapodás visszavonva (14 napos kötelezettség ismét érvényes)!"
        )

        // Helyi állapot azonnali frissítése
        setData((prev) => {
          const updatedEmployees = prev.employees.map((e) => {
            if (e.dolgozoId === employeeId) {
              const newStatus = nextVal
                ? !e.consecutiveResult.isFulfilled
                  ? "megallapodas_alapjan_mentes"
                  : e.consecutiveResult.status
                : !e.consecutiveResult.isFulfilled
                ? "nem_teljesult"
                : e.consecutiveResult.status

              return {
                ...e,
                hasWaiver: nextVal,
                consecutiveResult: {
                  ...e.consecutiveResult,
                  hasWaiver: nextVal,
                  status: newStatus as any,
                },
              }
            }
            return e
          })

          const newWaiverCount = updatedEmployees.filter((e) => e.hasWaiver).length
          const newMissingCount = updatedEmployees.filter(
            (e) => e.consecutiveResult.status === "nem_teljesult"
          ).length

          return {
            ...prev,
            waiverCount: newWaiverCount,
            missing14DaysCount: newMissingCount,
            employees: updatedEmployees,
          }
        })
      } else {
        toast.error("Hiba történt a beállítás mentésekor: " + (res.error || ""))
      }
    })
  }

  // CSV Export
  const handleExportCsv = () => {
    const headers = [
      "Név",
      "Részleg",
      "Munkakör",
      "Éves keret (nap)",
      "Kivett (nap)",
      "Betervezett (nap)",
      "Maradvány (nap)",
      "14 napos kötelezettség státusz",
      "Leghosszabb összefüggő blokk (nap)",
      "Összefüggő blokk kezdete",
      "Összefüggő blokk vége",
      "Eltérő megállapodás",
      "Év végi kockázati szint",
      "Kiadhatósági leírás",
    ]

    const rows = filteredEmployees.map((e) => [
      `"${e.nev}"`,
      `"${e.szervezetiEgysegNev || ""}"`,
      `"${e.munkakorMegnevezes || ""}"`,
      e.totalLeave,
      e.usedLeave,
      e.plannedLeave,
      e.remainingLeave,
      `"${e.consecutiveResult.status}"`,
      e.consecutiveResult.maxConsecutiveDays,
      `"${e.consecutiveResult.longestBlock?.startDate || ""}"`,
      `"${e.consecutiveResult.longestBlock?.endDate || ""}"`,
      e.hasWaiver ? "Igen" : "Nem",
      `"${e.riskResult.riskLevel}"`,
      `"${e.riskResult.statusLabel.replace(/"/g, '""')}"`,
    ])

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `szabadsag_megfeleloseg_${data.year}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success("Megfelelőségi riport sikeresen letöltve CSV formátumban!")
  }

  return (
    <div className="space-y-4">
      {/* ── 1. KANONIKUS TableToolbar ── */}
      <TableToolbar
        searchPlaceholder="Keresés munkatárs neve, munkaköre vagy részlege szerint..."
        searchValue={search}
        onSearchChange={setSearch}
        columns={columns}
        onToggleColumn={handleToggleColumn}
        filterGroups={filterGroups}
        activeFiltersCount={activeFiltersCount}
        onClearFilters={handleClearFilters}
        actions={
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" />
                <span>Szűrők törlése</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-8 text-xs gap-1.5 border-border/70 hover:border-primary/40"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Exportálás (CSV)</span>
            </Button>
          </div>
        }
      />

      {/* ── 2. SZABVÁNYOS TÁBLÁZAT ── */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {isColVisible("dolgozo") && <TableHead className="w-[240px]">Munkatárs</TableHead>}
              {isColVisible("reszleg") && <TableHead className="w-[180px]">Szervezeti egység</TableHead>}
              {isColVisible("szabadsag") && (
                <TableHead className="w-[200px] text-center">
                  Szabadság (Kivett / Terv / Maradvány)
                </TableHead>
              )}
              {isColVisible("mentesules14") && (
                <TableHead className="w-[260px]">14 napos egybefüggő pihenő (Mt. 122. §)</TableHead>
              )}
              {isColVisible("kockazat") && (
                <TableHead className="w-[220px]">Év végi kiadhatóság (Mt. 123. §)</TableHead>
              )}
              {isColVisible("megallapodas") && (
                <TableHead className="w-[160px] text-center">Eltérő megállapodás</TableHead>
              )}
              {isColVisible("muveletek") && (
                <TableHead className="w-[100px] text-right">Művelet</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.filter((c) => c.isVisible).length}
                  className="h-32 text-center text-muted-foreground text-sm"
                >
                  Nincs a szűrésnek megfelelő munkavállaló.
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((emp) => {
                const isWaiverLoading = loadingEmpId === emp.dolgozoId

                return (
                  <TableRow key={emp.dolgozoId} className="hover:bg-muted/40 transition-colors">
                    {/* Munkatárs */}
                    {isColVisible("dolgozo") && (
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-full border border-border/60">
                            {emp.avatarUrl && <AvatarImage src={emp.avatarUrl} alt={emp.nev} />}
                            <AvatarFallback className="text-xs font-medium bg-muted">
                              {emp.nev
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <Link
                              href={`/hr/employee/${emp.dolgozoId}`}
                              className="font-medium text-foreground hover:text-primary transition-colors text-sm"
                            >
                              {emp.nev}
                            </Link>
                            <p className="text-[11px] text-muted-foreground">
                              {emp.munkakorMegnevezes}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {/* Részleg */}
                    {isColVisible("reszleg") && (
                      <TableCell className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          {emp.szervezetiEgysegNev}
                        </span>
                      </TableCell>
                    )}

                    {/* Szabadság keret és egyenleg */}
                    {isColVisible("szabadsag") && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5 text-xs tabular-nums">
                          <span className="text-muted-foreground" title="Kivett napok">
                            {emp.usedLeave}k
                          </span>
                          <span className="text-muted-foreground/40">/</span>
                          <span className="text-muted-foreground" title="Betervezett napok">
                            {emp.plannedLeave}t
                          </span>
                          <span className="text-muted-foreground/40">/</span>
                          <span
                            className={`font-semibold px-1.5 py-0.5 rounded text-xs ${
                              emp.remainingLeave > 15
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold"
                                : emp.remainingLeave > 5
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground"
                            }`}
                            title="Maradványszabadság"
                          >
                            {emp.remainingLeave} maradt
                          </span>
                          <span className="text-[10px] text-muted-foreground/70">
                            ({emp.totalLeave} keret)
                          </span>
                        </div>
                      </TableCell>
                    )}

                    {/* 14 napos egybefüggő kötelezettség */}
                    {isColVisible("mentesules14") && (
                      <TableCell>
                        <div className="space-y-1">
                          {emp.consecutiveResult.status === "teljesitve" && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant="outline"
                                className="bg-success/10 text-success border-success/30 text-xs gap-1 font-medium"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Teljesítve ({emp.consecutiveResult.maxConsecutiveDays} nap)
                              </Badge>
                              {emp.consecutiveResult.longestBlock && (
                                <span className="text-[11px] text-muted-foreground tabular-nums">
                                  {emp.consecutiveResult.longestBlock.startDate.slice(5)} –{" "}
                                  {emp.consecutiveResult.longestBlock.endDate.slice(5)}
                                </span>
                              )}
                            </div>
                          )}

                          {emp.consecutiveResult.status === "megallapodas_alapjan_mentes" && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant="outline"
                                className="bg-info/10 text-info border-info/30 text-xs gap-1 font-medium"
                              >
                                <FileCheck2 className="h-3.5 w-3.5" />
                                Megállapodással mentes
                              </Badge>
                              <span className="text-[11px] text-muted-foreground tabular-nums">
                                Max: {emp.consecutiveResult.maxConsecutiveDays} nap
                              </span>
                            </div>
                          )}

                          {emp.consecutiveResult.status === "betervezve" && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant="outline"
                                className="bg-warning/10 text-warning border-warning/30 text-xs gap-1 font-medium"
                              >
                                <Clock className="h-3.5 w-3.5" />
                                Betervezve ({emp.consecutiveResult.pendingMaxConsecutiveDays} nap)
                              </Badge>
                              <span className="text-[11px] text-muted-foreground">
                                Jóváhagyásra vár
                              </span>
                            </div>
                          )}

                          {emp.consecutiveResult.status === "nem_teljesult" && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant="outline"
                                className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs gap-1 font-medium"
                              >
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Hiányzik
                              </Badge>
                              <span className="text-[11px] text-muted-foreground tabular-nums">
                                Eddigi max: {emp.consecutiveResult.maxConsecutiveDays} nap
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    )}

                    {/* Év végi maradvány kockázat */}
                    {isColVisible("kockazat") && (
                      <TableCell>
                        <div className="space-y-1">
                          {emp.riskResult.riskLevel === "kritikus" && (
                            <Badge
                              variant="outline"
                              className="bg-destructive/10 text-destructive border-destructive/30 text-xs gap-1 font-semibold"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Kritikus
                            </Badge>
                          )}
                          {emp.riskResult.riskLevel === "figyelmeztetes" && (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs gap-1 font-medium"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {emp.riskResult.isNovemberAlertActive
                                ? "Novemberi riasztás"
                                : "Figyelmeztetés"}
                            </Badge>
                          )}
                          {emp.riskResult.riskLevel === "rendben" && (
                            <Badge
                              variant="outline"
                              className="bg-muted text-muted-foreground border-border text-xs gap-1"
                            >
                              Rendben
                            </Badge>
                          )}
                          <p className="text-[11px] text-muted-foreground leading-tight truncate max-w-[200px]" title={emp.riskResult.statusLabel}>
                            {emp.riskResult.statusLabel}
                          </p>
                        </div>
                      </TableCell>
                    )}

                    {/* Eltérő megállapodás kapcsoló */}
                    {isColVisible("megallapodas") && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isWaiverLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Checkbox
                              checked={emp.hasWaiver}
                              onCheckedChange={() => handleToggleWaiver(emp.dolgozoId, emp.hasWaiver)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              title="Eltérő megállapodás: Munkavállaló kéri, hogy a munkáltató tekintsen el a 14 napos egybefüggő kiadástól"
                            />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {emp.hasWaiver ? "Megkötve" : "Nincs"}
                          </span>
                        </div>
                      </TableCell>
                    )}

                    {/* Műveletek */}
                    {isColVisible("muveletek") && (
                      <TableCell className="text-right">
                        <Link
                          href={`/hr/employee/${emp.dolgozoId}`}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                            "h-7 px-2 text-xs gap-1 text-primary hover:text-primary/80"
                          )}
                        >
                          <span>Adatlap</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Lábléc információ */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Összesen {filteredEmployees.length} munkatárs listázva ({data.totalEmployees} munkavállalóból).
        </span>
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-success"></span> 14 nap teljesítve
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-info"></span> Megállapodással mentes
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span> Hiányzó / Figyelmeztetés
          </span>
        </span>
      </div>
    </div>
  )
}
