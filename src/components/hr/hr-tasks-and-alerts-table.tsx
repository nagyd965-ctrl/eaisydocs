"use client"

import { useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  ClipboardList,
  Sparkles,
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

export function HrTasksAndAlertsTable({ tasks }: { tasks: HrTaskItem[] }) {
  const [search, setSearch] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([])

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

  return (
    <div className="space-y-3">
      {/* ── TableToolbar (Kereső + Szűrés Popover + Függő Kérelmek Átszignálása gomb) ── */}
      <div className="px-6 pt-3">
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Keresés teendő, dolgozó neve vagy munkaköre alapján..."
          columns={columns}
          onToggleColumn={handleToggleColumn}
          filterGroups={filterGroups}
          activeFiltersCount={totalActiveFilters}
          onClearFilters={clearAllFilters}
          actions={<ReassignLeavesButton />}
        />
      </div>

      {/* ── Táblázat ── */}
      <div className="overflow-x-auto">
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
            {filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.filter((c) => c.isVisible).length}
                  className="py-10 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500 opacity-80" />
                    <p className="font-medium text-sm text-foreground">
                      {tasks.length === 0
                        ? "Nincsenek aktuális, figyelmet igénylő HR teendők."
                        : "Nincs a szűrésnek megfelelő feladat vagy figyelmeztetés."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tasks.length === 0
                        ? "Minden munkaügyi folyamat, határidő és orvosi vizsgálat naprakész."
                        : "Próbáld meg törölni a szűrőket vagy módosítani a keresési kifejezést."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => {
                const sevConfig = SEVERITY_CONFIG[task.severity]
                const IconComponent = sevConfig.icon

                return (
                  <TableRow
                    key={task.id}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    {/* Sürgősség */}
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

                    {/* Kategória */}
                    {isColVisible("kategoria") && (
                      <TableCell className="py-2.5 text-xs font-medium text-muted-foreground">
                        {CATEGORY_LABELS[task.category] || task.category}
                      </TableCell>
                    )}

                    {/* Feladat & Részletek */}
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

                    {/* Érintett Dolgozó */}
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

                    {/* Művelet gomb */}
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
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
