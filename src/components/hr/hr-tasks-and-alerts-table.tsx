"use client"

import { useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Users,
  List,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import {
  TableToolbar,
  type TableColumnOption,
  type FilterGroup,
} from "@/components/table-toolbar/table-toolbar"
import { ReassignLeavesButton } from "@/components/hr/reassign-leaves-button"
import { cn } from "@/lib/utils"

export type HrTaskCategory =
  | "medical"
  | "leave"
  | "correction"
  | "probation"
  | "contract"
  | "onboarding"
  | "offboarding"

export type HrTaskSeverity = "critical" | "warning" | "info"

export interface HrTaskItem {
  id: string
  category: HrTaskCategory
  severity: HrTaskSeverity
  title: string
  description?: string
  employeeName: string
  employeeId?: string
  avatarUrl?: string | null
  position?: string | null
  dateInfo?: string | null
  daysRemaining?: number | null
  href: string
  actionLabel: string
}

const CATEGORY_LABELS: Record<HrTaskCategory, string> = {
  medical: "Orvosi vizsgálat",
  leave: "Szabadság jóváhagyás",
  correction: "Munkaidő korrekció",
  probation: "Próbaidő lejárata",
  contract: "Munkaszerződés",
  onboarding: "Beléptetés (Onboarding)",
  offboarding: "Kiléptetés (Offboarding)",
}

const SEVERITY_CONFIG: Record<
  HrTaskSeverity,
  { label: string; badgeClass: string; icon: typeof AlertCircle }
> = {
  critical: {
    label: "Kritikus",
    badgeClass: "bg-destructive/15 text-destructive border-destructive/30",
    icon: AlertCircle,
  },
  warning: {
    label: "Figyelmeztetés",
    badgeClass: "bg-warning/15 text-warning border-warning/30",
    icon: Clock,
  },
  info: {
    label: "Tájékoztató",
    badgeClass: "bg-info/15 text-info border-info/30",
    icon: CheckCircle2,
  },
}

function getInitials(name: string): string {
  if (!name) return "??"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface EmployeeTaskGroup {
  key: string
  employeeId?: string
  employeeName: string
  avatarUrl?: string | null
  position?: string | null
  initials: string
  tasks: HrTaskItem[]
  criticalCount: number
  warningCount: number
  infoCount: number
}

export function HrTasksAndAlertsTable({ tasks }: { tasks: HrTaskItem[] }) {
  const [search, setSearch] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"grouped" | "table">("grouped")

  // Kinyitott dolgozói csoportok (alapértelmezetten mindegyik bezárva a felhasználó kérése szerint)
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(() => new Set())

  const [columns, setColumns] = useState<TableColumnOption[]>([
    { id: "surgosseg", label: "Sürgősség", isVisible: true },
    { id: "kategoria", label: "Kategória", isVisible: true },
    { id: "feladat", label: "Feladat & Határidő", isVisible: true },
    { id: "dolgozo", label: "Érintett Dolgozó", isVisible: true },
    { id: "muvelet", label: "Művelet", isVisible: true },
  ])

  const handleToggleColumn = (colId: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, isVisible: !c.isVisible } : c))
    )
  }

  const isColVisible = (colId: string) =>
    columns.find((c) => c.id === colId)?.isVisible ?? true

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const toggleSeverity = (sev: string) => {
    setSelectedSeverities((prev) =>
      prev.includes(sev) ? prev.filter((s) => s !== sev) : [...prev, sev]
    )
  }

  const clearAllFilters = () => {
    setSelectedCategories([])
    setSelectedSeverities([])
    setSearch("")
  }

  const totalActiveFilters =
    selectedCategories.length + selectedSeverities.length

  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        id: "surgosseg",
        title: "Sürgősség / Prioritás",
        options: (["critical", "warning", "info"] as HrTaskSeverity[]).map(
          (sev) => ({
            id: sev,
            label: SEVERITY_CONFIG[sev].label,
            checked: selectedSeverities.includes(sev),
          })
        ),
        onToggle: toggleSeverity,
      },
      {
        id: "kategoria",
        title: "Feladat Típusa",
        options: (Object.keys(CATEGORY_LABELS) as HrTaskCategory[]).map(
          (cat) => ({
            id: cat,
            label: CATEGORY_LABELS[cat],
            checked: selectedCategories.includes(cat),
          })
        ),
        onToggle: toggleCategory,
      },
    ],
    [selectedSeverities, selectedCategories]
  )

  // Szűrés logika
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const q = search.toLowerCase()
      const searchMatch =
        !search ||
        task.title.toLowerCase().includes(q) ||
        task.employeeName.toLowerCase().includes(q) ||
        (task.position && task.position.toLowerCase().includes(q)) ||
        (task.description && task.description.toLowerCase().includes(q)) ||
        (task.dateInfo && task.dateInfo.toLowerCase().includes(q))

      const categoryMatch =
        selectedCategories.length === 0 ||
        selectedCategories.includes(task.category)

      const severityMatch =
        selectedSeverities.length === 0 ||
        selectedSeverities.includes(task.severity)

      return searchMatch && categoryMatch && severityMatch
    })
  }, [tasks, search, selectedCategories, selectedSeverities])

  // Dolgozói szintű csoportosítás
  const groupedByEmployee = useMemo(() => {
    const map = new Map<string, EmployeeTaskGroup>()

    for (const task of filteredTasks) {
      const key = task.employeeId || task.employeeName
      if (!map.has(key)) {
        map.set(key, {
          key,
          employeeId: task.employeeId,
          employeeName: task.employeeName,
          avatarUrl: task.avatarUrl || null,
          position: task.position,
          initials: getInitials(task.employeeName),
          tasks: [],
          criticalCount: 0,
          warningCount: 0,
          infoCount: 0,
        })
      }
      const group = map.get(key)!
      group.tasks.push(task)
      if (!group.avatarUrl && task.avatarUrl) {
        group.avatarUrl = task.avatarUrl
      }
      if (!group.position && task.position) {
        group.position = task.position
      }
      if (task.severity === "critical") group.criticalCount++
      else if (task.severity === "warning") group.warningCount++
      else group.infoCount++
    }

    // Sorrend: kritikus feladattal rendelkezők elöl, majd figyelmeztetések, majd összfeladat
    return Array.from(map.values()).sort((a, b) => {
      if (b.criticalCount !== a.criticalCount) return b.criticalCount - a.criticalCount
      if (b.warningCount !== a.warningCount) return b.warningCount - a.warningCount
      return b.tasks.length - a.tasks.length
    })
  }, [filteredTasks])

  const toggleEmployee = (key: string) => {
    setExpandedEmployees((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-3 pb-6">
      {/* ── TableToolbar (Kereső + Oszlopok + Szűrés + Függő Kérelmek Átszignálása + Nézetváltó) ── */}
      <div className="px-6 pt-0">
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Keresés teendő, dolgozó neve vagy munkaköre alapján..."
          columns={columns}
          onToggleColumn={handleToggleColumn}
          filterGroups={filterGroups}
          activeFiltersCount={totalActiveFilters}
          onClearFilters={clearAllFilters}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <ReassignLeavesButton />
              {/* Nézetváltó gombok */}
              <div className="flex items-center p-0.5 bg-muted/40 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setViewMode("grouped")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
                    viewMode === "grouped"
                      ? "bg-card text-foreground shadow-2xs font-semibold border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Dolgozónként csoportosított lista nézet"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Dolgozói nézet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
                    viewMode === "table"
                      ? "bg-card text-foreground shadow-2xs font-semibold border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Kompakt táblázatos nézet"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Táblázat</span>
                </button>
              </div>
            </div>
          }
        />
      </div>

      {/* ── Üres állapotok ── */}
      {tasks.length === 0 ? (
        <div className="mx-6 my-4 py-12 text-center rounded-xl border border-dashed border-border/70 bg-card/30 space-y-1.5">
          <p className="font-semibold text-sm text-foreground">
            Nincsenek aktuális, figyelmet igénylő HR teendők
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Minden munkaügyi folyamat, határidő és orvosi vizsgálat naprakész.
          </p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="mx-6 my-4 py-12 text-center rounded-xl border border-dashed border-border/70 bg-card/30 space-y-2">
          <p className="font-semibold text-sm text-foreground">Nincs találat</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            A megadott szűrési feltételeknek egyetlen feladat vagy figyelmeztetés sem felel meg.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs text-primary hover:text-primary/80 mt-1 cursor-pointer"
          >
            Szűrők és keresés törlése
          </Button>
        </div>
      ) : viewMode === "grouped" ? (
        /* ── Dolgozónként Csoportosított Kártyás / Akkordion Nézet ── */
        <div className="px-6 pb-6 space-y-3">
          {groupedByEmployee.map((group) => {
            const isExpanded = expandedEmployees.has(group.key)

            return (
              <div
                key={group.key}
                className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs transition-all hover:border-border"
              >
                {/* Dolgozói Kártya Fejléc (Kattintásra nyílik / csukódik) */}
                <div
                  onClick={() => toggleEmployee(group.key)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border/60 select-none"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-wrap">
                    {/* Kinyitó nyíl */}
                    <div className="text-muted-foreground shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-foreground/80" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Dolgozó Avatár Monogrammal vagy Képpel */}
                    <Avatar className="h-8 w-8 border border-border/70 shrink-0">
                      {group.avatarUrl && (
                        <AvatarImage src={group.avatarUrl} alt={group.employeeName} className="object-cover" />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {group.initials}
                      </AvatarFallback>
                    </Avatar>

                    {/* Dolgozó Neve és Munkaköre */}
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-semibold text-sm text-foreground">
                        {group.employeeName}
                      </span>
                      {group.position && (
                        <span className="text-xs text-muted-foreground truncate">
                          ({group.position})
                        </span>
                      )}
                    </div>

                    {/* Teendők száma jelvény (pl. 2-es jelvény és sürgősségi indikátorok) */}
                    <div className="flex items-center gap-1.5 flex-wrap ml-1">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground border border-border/60 tabular-nums">
                        {group.tasks.length} {group.tasks.length === 1 ? "teendő" : "teendő"}
                      </span>

                      {group.criticalCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold py-0 px-1.5 bg-destructive/15 text-destructive border-destructive/30"
                        >
                          {group.criticalCount} kritikus
                        </Badge>
                      )}
                      {group.warningCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold py-0 px-1.5 bg-warning/15 text-warning border-warning/30"
                        >
                          {group.warningCount} figyelmeztetés
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Jobb oldali művelet: Dolgozói adatlap közvetlen link */}
                  {group.employeeId && (
                    <div className="shrink-0 self-end sm:self-auto flex items-center gap-2">
                      <Link
                        href={`/hr/employee/${group.employeeId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-background border border-transparent hover:border-border/60"
                      >
                        <span>Adatlap</span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Dolgozóhoz tartozó teendők listája */}
                {isExpanded && (
                  <div className="divide-y divide-border/50 bg-card">
                    {group.tasks.map((task) => {
                      const sevConfig = SEVERITY_CONFIG[task.severity]
                      const IconComponent = sevConfig.icon

                      return (
                        <div
                          key={task.id}
                          className="p-3.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/15 transition-colors"
                        >
                          {/* Bal oldal: Sürgősség, Kategória, Cím és Leírás */}
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-semibold gap-1 py-0.2 px-1.5",
                                  sevConfig.badgeClass
                                )}
                              >
                                <IconComponent className="w-3 h-3 shrink-0" />
                                {sevConfig.label}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="text-[10px] text-muted-foreground bg-muted/30"
                              >
                                {CATEGORY_LABELS[task.category] || task.category}
                              </Badge>
                              {task.dateInfo && (
                                <span className="text-[11px] font-semibold text-foreground/80 tabular-nums">
                                  {task.dateInfo}
                                </span>
                              )}
                            </div>

                            <div>
                              <p className="text-xs sm:text-sm font-medium text-foreground">
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Jobb oldal: Művelet gomb */}
                          <div className="shrink-0 self-end sm:self-center">
                            <Link href={task.href}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2.5 gap-1 hover:border-primary/50 transition-colors cursor-pointer"
                              >
                                <span>{task.actionLabel}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* ── Eredeti Kompakt Táblázatos Nézet ── */
        <div className="overflow-x-auto pb-6">
          <Table className="compact-table">
            <TableHeader>
              <TableRow>
                {isColVisible("surgosseg") && (
                  <TableHead className="pl-6 text-xs uppercase tracking-wider text-muted-foreground font-medium w-[130px]">
                    Sürgősség
                  </TableHead>
                )}
                {isColVisible("kategoria") && (
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium w-[170px]">
                    Kategória
                  </TableHead>
                )}
                {isColVisible("feladat") && (
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                    Feladat & Részletek
                  </TableHead>
                )}
                {isColVisible("dolgozo") && (
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium w-[220px]">
                    Érintett Dolgozó
                  </TableHead>
                )}
                {isColVisible("muvelet") && (
                  <TableHead className="pr-6 text-xs uppercase tracking-wider text-muted-foreground font-medium text-right w-[130px]">
                    Művelet
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => {
                const sevConfig = SEVERITY_CONFIG[task.severity]
                const IconComponent = sevConfig.icon

                return (
                  <TableRow
                    key={task.id}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    {isColVisible("surgosseg") && (
                      <TableCell className="pl-6 py-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] font-semibold gap-1 py-0.5 px-2",
                            sevConfig.badgeClass
                          )}
                        >
                          <IconComponent className="w-3 h-3 shrink-0" />
                          {sevConfig.label}
                        </Badge>
                      </TableCell>
                    )}

                    {isColVisible("kategoria") && (
                      <TableCell className="py-2.5 text-xs font-medium text-muted-foreground">
                        {CATEGORY_LABELS[task.category] || task.category}
                      </TableCell>
                    )}

                    {isColVisible("feladat") && (
                      <TableCell className="py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {task.title}
                          </p>
                          {(task.description || task.dateInfo) && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {task.dateInfo && (
                                <span className="font-semibold text-foreground/80 tabular-nums">
                                  {task.dateInfo}
                                </span>
                              )}
                              {task.dateInfo && task.description && (
                                <span> · </span>
                              )}
                              {task.description && (
                                <span>{task.description}</span>
                              )}
                            </p>
                          )}
                        </div>
                      </TableCell>
                    )}

                    {isColVisible("dolgozo") && (
                      <TableCell className="py-2.5">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {task.employeeName}
                          </p>
                          {task.position && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {task.position}
                            </p>
                          )}
                        </div>
                      </TableCell>
                    )}

                    {isColVisible("muvelet") && (
                      <TableCell className="pr-6 py-2.5 text-right">
                        <Link href={task.href}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2.5 gap-1 hover:border-primary/50 transition-colors"
                          >
                            {task.actionLabel}
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        </Link>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
