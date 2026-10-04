"use client"

import { useState, useEffect, useMemo } from "react"
import { format } from "date-fns"
import { hu } from "date-fns/locale"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Calendar as CalendarIcon, Ban, CheckSquare } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { TableToolbar, TableColumnOption, FilterGroup } from "@/components/table-toolbar/table-toolbar"

interface Task {
  id: string
  leiras: string
  hatarido: string
  allapot: string
  felelos_user_id: string
  kategoria?: string | null
  prioritas?: string | null
  indoklas?: string | null
  reszletek?: string | null
  ugyirat: {
    id: string
    iktatoszam: string
  } | null
}

const STATUS_LABELS: Record<string, string> = {
  nyitott: "Nyitott",
  folyamatban: "Folyamatban",
  kesz: "Kész",
  elutasitott: "Elutasított",
}

const DEFAULT_TASK_COLUMNS: TableColumnOption[] = [
  { id: "ugyirat", label: "Ügyirat / Tárgy", isVisible: true },
  { id: "leiras", label: "Feladat leírása", isVisible: true },
  { id: "hatarido", label: "Határidő", isVisible: true },
  { id: "allapot", label: "Állapot", isVisible: true },
]

export function TaskList({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const router = useRouter()

  // Szűrési állapotok a szabványos TableToolbar-hoz
  const [search, setSearch] = useState("")
  const [columns, setColumns] = useState<TableColumnOption[]>(DEFAULT_TASK_COLUMNS)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  const handleToggleColumn = (id: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isVisible: !c.isVisible } : c))
    )
  }

  const isColVisible = (id: string) => {
    return columns.find((c) => c.id === id)?.isVisible ?? true
  }

  const handleClearFilters = () => {
    setSearch("")
    setFromDate("")
    setToDate("")
    setSelectedStatuses([])
  }

  const filterGroups: FilterGroup[] = [
    {
      id: "allapot",
      title: "Feladat állapota",
      options: [
        { id: "nyitott", label: "Nyitott", checked: selectedStatuses.includes("nyitott") },
        { id: "folyamatban", label: "Folyamatban", checked: selectedStatuses.includes("folyamatban") },
        { id: "kesz", label: "Kész", checked: selectedStatuses.includes("kesz") },
        { id: "elutasitott", label: "Elutasított", checked: selectedStatuses.includes("elutasitott") },
      ],
      onToggle: (optId) => {
        setSelectedStatuses((prev) =>
          prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
        )
      },
    },
  ]

  const activeFiltersCount = selectedStatuses.length

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchDesc = task.leiras?.toLowerCase().includes(q)
        const matchDetails = task.reszletek?.toLowerCase().includes(q)
        const matchNumber = task.ugyirat?.iktatoszam?.toLowerCase().includes(q)
        const matchReason = task.indoklas?.toLowerCase().includes(q)
        if (!matchDesc && !matchDetails && !matchNumber && !matchReason) return false
      }

      if (fromDate) {
        const tDate = task.hatarido ? new Date(task.hatarido).toISOString().split("T")[0] : ""
        if (tDate && tDate < fromDate) return false
      }
      if (toDate) {
        const tDate = task.hatarido ? new Date(task.hatarido).toISOString().split("T")[0] : ""
        if (tDate && tDate > toDate) return false
      }

      if (selectedStatuses.length > 0) {
        if (!selectedStatuses.includes(task.allapot)) return false
      }

      return true
    })
  }, [tasks, search, fromDate, toDate, selectedStatuses])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "nyitott":
        return (
          <Badge variant="outline" className="text-muted-foreground border-border">
            Nyitott
          </Badge>
        )
      case "folyamatban":
        return (
          <Badge variant="outline" className="text-info border-info/30 bg-info/5">
            Folyamatban
          </Badge>
        )
      case "kesz":
        return (
          <Badge variant="outline" className="text-success border-success/30 bg-success/5">
            Kész
          </Badge>
        )
      case "elutasitott":
        return (
          <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5">
            Elutasított
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleRowClick = (task: Task) => {
    if (task.ugyirat?.id) {
      router.push(`/dossiers/${task.ugyirat.id}`)
    } else {
      setSelectedTask(task)
    }
  }

  const visibleColumnsCount = columns.filter((c) => c.isVisible).length

  return (
    <div className="space-y-3">
      {/* Szabványos TableToolbar */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Keresés feladat leírása, ügyiratszám vagy indoklás szerint..."
        columns={columns}
        onToggleColumn={handleToggleColumn}
        dateRange={{
          from: fromDate,
          to: toDate,
          onFromChange: setFromDate,
          onToChange: setToDate,
        }}
        filterGroups={filterGroups}
        activeFiltersCount={activeFiltersCount}
        onClearFilters={handleClearFilters}
      />

      <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
        <Table className="compact-table">
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {isColVisible("ugyirat") && <TableHead className="font-medium">Ügyirat / Tárgy</TableHead>}
              {isColVisible("leiras") && <TableHead className="font-medium">Feladat leírása</TableHead>}
              {isColVisible("hatarido") && <TableHead className="font-medium">Határidő</TableHead>}
              {isColVisible("allapot") && <TableHead className="font-medium text-right">Állapot</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <TableRow
                  key={task.id}
                  onClick={() => handleRowClick(task)}
                  className="cursor-pointer group hover:bg-muted/40 transition-colors"
                >
                  {isColVisible("ugyirat") && (
                    <TableCell>
                      {task.ugyirat ? (
                        <Link
                          href={`/dossiers/${task.ugyirat.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-primary hover:underline text-xs inline-flex items-center gap-1 font-mono"
                        >
                          {task.ugyirat.iktatoszam}
                          <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                        </Link>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">Nincs csatolva</span>
                      )}
                    </TableCell>
                  )}
                  {isColVisible("leiras") && (
                    <TableCell className="text-foreground/90 max-w-md">
                      <div className="font-medium text-xs text-foreground truncate">{task.leiras}</div>
                      {task.reszletek && (
                        <div className="text-[11px] text-muted-foreground truncate mt-0.5">{task.reszletek}</div>
                      )}
                      {task.allapot === "elutasitott" && (
                        <div className="text-[11px] text-destructive flex items-center gap-1.5 mt-1 font-normal truncate bg-destructive/5 px-2 py-0.5 rounded border border-destructive/20 w-fit">
                          <Ban className="h-3 w-3 shrink-0" />
                          <span className="italic text-foreground/80">„{task.indoklas || "Téves szignálás"}”</span>
                        </div>
                      )}
                    </TableCell>
                  )}
                  {isColVisible("hatarido") && (
                    <TableCell>
                      <span
                        className={`font-medium tabular-nums text-xs ${
                          new Date(task.hatarido) < new Date() && task.allapot !== "kesz"
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {format(new Date(task.hatarido), "yyyy. MM. dd.", { locale: hu })}
                      </span>
                    </TableCell>
                  )}
                  {isColVisible("allapot") && (
                    <TableCell className="text-right">{getStatusBadge(task.allapot)}</TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnsCount || 4}
                  className="text-center py-10 text-muted-foreground"
                >
                  <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  {tasks.length === 0
                    ? "Jelenleg nincs egyetlen rögzített feladat sem."
                    : "Nincs a megadott szűrési feltételeknek megfelelő feladat."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Részletező Dialog általános feladathoz */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-md">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="outline">
                    {STATUS_LABELS[selectedTask.allapot] || selectedTask.allapot}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {format(new Date(selectedTask.hatarido), "yyyy. MM. dd.", { locale: hu })}
                  </span>
                </div>
                <DialogTitle className="text-base font-semibold pt-2 leading-relaxed">
                  {selectedTask.ugyirat ? (
                    <div className="flex items-center gap-1 text-muted-foreground text-sm font-normal">
                      Ügyirat:{" "}
                      <Link
                        href={`/dossiers/${selectedTask.ugyirat.id}`}
                        className="text-primary hover:underline inline-flex items-center gap-1 font-semibold font-mono"
                      >
                        {selectedTask.ugyirat.iktatoszam}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ) : (
                    "Általános feladat"
                  )}
                </DialogTitle>
                <DialogDescription className="text-sm text-foreground pt-3 whitespace-pre-wrap leading-relaxed">
                  {selectedTask.leiras}
                </DialogDescription>
                {selectedTask.reszletek && (
                  <p className="text-xs text-muted-foreground mt-2 bg-muted/40 p-2.5 rounded border border-border/50">
                    {selectedTask.reszletek}
                  </p>
                )}
                {selectedTask.allapot === "elutasitott" && (
                  <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive space-y-1.5">
                    <div className="font-semibold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                      <Ban className="h-4 w-4 shrink-0" />
                      Elutasítás oka / Vezetői indoklás:
                    </div>
                    <div className="font-medium text-foreground bg-background/80 dark:bg-background/40 rounded px-2.5 py-1.5 border border-destructive/20 text-xs leading-relaxed">
                      {selectedTask.indoklas || "Téves szignálás / Nem az én hatásköröm"}
                    </div>
                  </div>
                )}
              </DialogHeader>

              <DialogFooter className="pt-4 flex items-center sm:justify-between gap-2">
                <Button variant="outline" onClick={() => setSelectedTask(null)}>
                  Bezárás
                </Button>
                {selectedTask.ugyirat && (
                  <Button
                    onClick={() => router.push(`/dossiers/${selectedTask.ugyirat!.id}`)}
                    className="gap-1.5"
                  >
                    Ügyirat megtekintése
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
