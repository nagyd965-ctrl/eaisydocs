"use client"

import { useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { TableToolbar, type TableColumnOption, type FilterGroup } from "@/components/table-toolbar/table-toolbar"

/* ─── Szerepkör dictionary ─── */
const szerepkorLabel: Record<string, string> = {
  hr_munkatars:  "HR Munkatárs",
  hr_vezeto:     "HR Vezető",
  vezeto:        "Vezető",
  admin:         "Admin",
  munkavallalo:  "Munkavállaló",
  rendszergazda: "Rendszergazda",
  auditor:       "Auditor",
  toborzo:       "Toborzó",
}
const SZEREPKOR_OPTIONS = Object.entries(szerepkorLabel).map(([v, l]) => ({ value: v, label: l }))

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

export interface EmployeeAdatlap {
  adoazonosito_jel?: string | null
  taj_szam?: string | null
  alapber?: number | null
  telefonszam?: string | null
  [key: string]: any
}

interface Employee {
  id: string
  nev: string
  hr_szerepkor: string | null
  avatar_url: string | null
  hr_dolgozo_adatlap?: any
  [key: string]: any
}

/* ─── Main component ─── */
export function EmployeeTable({ employees }: { employees: Employee[] }) {
  const [search, setSearch]         = useState("")
  const [selectedRoles, setRoles]   = useState<string[]>([])
  const [selectedJobs, setJobs]     = useState<string[]>([])

  const [columns, setColumns] = useState<TableColumnOption[]>([
    { id: "azonosito", label: "Azonosító", isVisible: true },
    { id: "dolgozo", label: "Dolgozó", isVisible: true },
    { id: "munkakor", label: "Munkakör", isVisible: true },
    { id: "szervezeti_egyseg", label: "Szervezeti Egység", isVisible: true },
    { id: "szerepkor", label: "Szerepkör", isVisible: true },
    { id: "statusz", label: "Státusz", isVisible: true },
    { id: "muveletek", label: "Műveletek", isVisible: true },
  ])

  const handleToggleColumn = (colId: string) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, isVisible: !c.isVisible } : c))
  }

  const isColVisible = (colId: string) => columns.find(c => c.id === colId)?.isVisible ?? true

  const munkakorOptions = useMemo(() => {
    const seen = new Set<string>()
    const opts: { value: string; label: string }[] = []
    for (const emp of employees) {
      const name = emp.hr_dolgozo_adatlap?.hr_jogviszony?.[0]
        ?.hr_beosztas?.[0]?.hr_munkakor?.megnevezes
      if (name && !seen.has(name)) {
        seen.add(name)
        opts.push({ value: name, label: name })
      }
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label, "hu"))
  }, [employees])

  const toggleRole = (v: string) =>
    setRoles(p => p.includes(v) ? p.filter(r => r !== v) : [...p, v])
  const toggleJob  = (v: string) =>
    setJobs(p => p.includes(v) ? p.filter(j => j !== v) : [...p, v])
  const clearAll   = () => { setRoles([]); setJobs([]) }

  const totalFilters = selectedRoles.length + selectedJobs.length
  const hasFilter    = totalFilters > 0

  const filterGroups: FilterGroup[] = useMemo(() => [
    {
      id: "szerepkor",
      title: "Szerepkör",
      options: SZEREPKOR_OPTIONS.map(opt => ({
        id: opt.value,
        label: opt.label,
        checked: selectedRoles.includes(opt.value),
      })),
      onToggle: toggleRole,
    },
    ...(munkakorOptions.length > 0 ? [{
      id: "munkakor",
      title: "Munkakör",
      options: munkakorOptions.map(opt => ({
        id: opt.value,
        label: opt.label,
        checked: selectedJobs.includes(opt.value),
      })),
      onToggle: toggleJob,
    }] : []),
  ], [selectedRoles, selectedJobs, munkakorOptions])

  const filtered = employees.filter(emp => {
    const munkakor = emp.hr_dolgozo_adatlap?.hr_jogviszony?.[0]
      ?.hr_beosztas?.[0]?.hr_munkakor?.megnevezes ?? ""
    const nameMatch = !search || emp.nev?.toLowerCase().includes(search.toLowerCase())
    const roleMatch = selectedRoles.length === 0 || selectedRoles.includes(emp.hr_szerepkor ?? "")
    const jobMatch  = selectedJobs.length  === 0 || selectedJobs.includes(munkakor)
    return nameMatch && roleMatch && jobMatch
  })

  return (
    <div className="space-y-3">
      {/* ── Kanonikus TableToolbar ── */}
      <div className="px-6 pt-3">
        <TableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Keresés dolgozó neve vagy munkaköre alapján..."
          columns={columns}
          onToggleColumn={handleToggleColumn}
          filterGroups={filterGroups}
          activeFiltersCount={totalFilters}
          onClearFilters={clearAll}
        />
      </div>

      {/* ── Táblázat kompakt 45px sormagassággal és overflow védelemmel ── */}
      <div className="overflow-x-auto">
        <Table className="compact-table">
          <TableHeader>
            <TableRow>
              {isColVisible("azonosito") && (
                <TableHead className="pl-6 text-xs uppercase tracking-wider text-muted-foreground font-medium w-[110px]">Azonosító</TableHead>
              )}
              {isColVisible("dolgozo") && (
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Dolgozó</TableHead>
              )}
              {isColVisible("munkakor") && (
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Munkakör</TableHead>
              )}
              {isColVisible("szervezeti_egyseg") && (
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Szervezeti Egység</TableHead>
              )}
              {isColVisible("szerepkor") && (
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Szerepkör</TableHead>
              )}
              {isColVisible("statusz") && (
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Státusz</TableHead>
              )}
              {isColVisible("muveletek") && (
                <TableHead className="text-right pr-6 text-xs uppercase tracking-wider text-muted-foreground font-medium">Műveletek</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((emp, index) => {
              const activeJogviszony = emp.hr_dolgozo_adatlap?.hr_jogviszony?.[0]
              const activeBeosztas   = activeJogviszony?.hr_beosztas?.[0]
              const munkakor         = activeBeosztas?.hr_munkakor?.megnevezes || "Nincs beállítva"
              const initials         = getInitials(emp.nev || "?")
              const empId            = `EMP-${String(index + 1).padStart(3, "0")}`

              return (
                <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors">
                  {isColVisible("azonosito") && (
                    <TableCell className="pl-6">
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">{empId}</span>
                    </TableCell>
                  )}
                  {isColVisible("dolgozo") && (
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {emp.avatar_url
                            ? <img src={emp.avatar_url} alt={emp.nev} className="h-full w-full object-cover" />
                            : <span className="text-[11px] font-semibold text-primary">{initials}</span>
                          }
                        </div>
                        <span className="font-medium text-sm text-foreground">{emp.nev}</span>
                      </div>
                    </TableCell>
                  )}
                  {isColVisible("munkakor") && (
                    <TableCell className="text-sm text-muted-foreground">{munkakor}</TableCell>
                  )}
                  {isColVisible("szervezeti_egyseg") && (
                    <TableCell className="text-sm text-muted-foreground">Központ</TableCell>
                  )}
                  {isColVisible("szerepkor") && (
                    <TableCell>
                      {emp.hr_szerepkor && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold border border-primary/40 text-primary bg-primary/5">
                          {szerepkorLabel[emp.hr_szerepkor] ?? emp.hr_szerepkor}
                        </span>
                      )}
                    </TableCell>
                  )}
                  {isColVisible("statusz") && (
                    <TableCell>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-success/10 text-success border border-success/20">
                        Aktív
                      </span>
                    </TableCell>
                  )}
                  {isColVisible("muveletek") && (
                    <TableCell className="text-right pr-6">
                      <Link href={`/hr/employee/${emp.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary gap-1">
                          Adatlap <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.filter(c => c.isVisible).length} className="text-center py-10 text-muted-foreground text-sm">
                  {search || hasFilter
                    ? "Nem található dolgozó a megadott feltételekre."
                    : "Nincsenek dolgozók az adatbázisban."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
