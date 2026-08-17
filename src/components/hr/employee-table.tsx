"use client"

import { useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ChevronRight, SlidersHorizontal, X, Check } from "lucide-react"
import Link from "next/link"
import { Menu } from "@base-ui/react/menu"

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

interface Employee {
  id: string
  nev: string
  hr_szerepkor: string | null
  avatar_url: string | null
  hr_dolgozo_adatlap: any
}

/* ─── Filter chip ─── */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-md border border-primary/30 bg-primary/5 text-primary text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-foreground transition-colors ml-0.5">
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

/* ─── Main component ─── */
export function EmployeeTable({ employees }: { employees: Employee[] }) {
  const [search, setSearch]         = useState("")
  const [selectedRoles, setRoles]   = useState<string[]>([])
  const [selectedJobs, setJobs]     = useState<string[]>([])

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

  const filtered = employees.filter(emp => {
    const munkakor = emp.hr_dolgozo_adatlap?.hr_jogviszony?.[0]
      ?.hr_beosztas?.[0]?.hr_munkakor?.megnevezes ?? ""
    const nameMatch = !search || emp.nev?.toLowerCase().includes(search.toLowerCase())
    const roleMatch = selectedRoles.length === 0 || selectedRoles.includes(emp.hr_szerepkor ?? "")
    const jobMatch  = selectedJobs.length  === 0 || selectedJobs.includes(munkakor)
    return nameMatch && roleMatch && jobMatch
  })

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-6 py-3 border-b">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{filtered.length}</span>
          {" "}/ {employees.length} dolgozó
        </p>

        <div className="flex items-center gap-2">
          {/* Keresés */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Keresés a táblázatban..."
              className="pl-8 h-8 text-sm w-[220px] bg-muted/40"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Szűrő – Base UI Menu primitívekkel, avoidCollisions=false */}
          <Menu.Root>
            <Menu.Trigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-8 gap-1.5 text-sm ${hasFilter ? "border-primary text-primary" : ""}`}
                />
              }
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Szűrés
              {hasFilter && (
                <Badge className="ml-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] bg-primary text-primary-foreground rounded-full">
                  {totalFilters}
                </Badge>
              )}
            </Menu.Trigger>

            <Menu.Portal>
              <Menu.Positioner
                side="bottom"
                align="end"
                sideOffset={4}
                positionMethod="fixed"
                disableAnchorTracking={true}
                collisionAvoidance={{ side: "none", align: "none" }}
                className="isolate z-50"
              >
                <Menu.Popup className="min-w-52 rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-sm outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">

                  {/* Szerepkör */}
                  <p className="px-2 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Szerepkör
                  </p>
                  {SZEREPKOR_OPTIONS.map(opt => {
                    const active = selectedRoles.includes(opt.value)
                    return (
                      <Menu.Item
                        key={opt.value}
                        closeOnClick={false}
                        onClick={() => toggleRole(opt.value)}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded text-sm cursor-default outline-none select-none
                          text-muted-foreground focus:text-foreground focus:bg-muted/50 data-highlighted:text-foreground data-highlighted:bg-muted/50"
                      >
                        <span className={`h-3.5 w-3.5 rounded shrink-0 flex items-center justify-center border transition-colors
                          ${active ? "bg-primary border-primary" : "border-border"}`}>
                          {active && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                        </span>
                        <span className={active ? "text-foreground font-medium" : ""}>{opt.label}</span>
                      </Menu.Item>
                    )
                  })}

                  {/* Munkakör */}
                  {munkakorOptions.length > 0 && (
                    <>
                      <div className="my-1.5 border-t border-border" />
                      <p className="px-2 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Munkakör
                      </p>
                      {munkakorOptions.map(opt => {
                        const active = selectedJobs.includes(opt.value)
                        return (
                          <Menu.Item
                            key={opt.value}
                            closeOnClick={false}
                            onClick={() => toggleJob(opt.value)}
                            className="flex items-center gap-2.5 px-2 py-1.5 rounded text-sm cursor-default outline-none select-none
                              text-muted-foreground focus:text-foreground focus:bg-muted/50 data-highlighted:text-foreground data-highlighted:bg-muted/50"
                          >
                            <span className={`h-3.5 w-3.5 rounded shrink-0 flex items-center justify-center border transition-colors
                              ${active ? "bg-primary border-primary" : "border-border"}`}>
                              {active && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                            </span>
                            <span className={active ? "text-foreground font-medium" : ""}>{opt.label}</span>
                          </Menu.Item>
                        )
                      })}
                    </>
                  )}

                  {/* Törlés */}
                  {hasFilter && (
                    <>
                      <div className="my-1.5 border-t border-border" />
                      <Menu.Item
                        closeOnClick={false}
                        onClick={clearAll}
                        className="px-2 py-1.5 rounded text-xs text-muted-foreground cursor-default outline-none select-none
                          hover:text-destructive focus:text-destructive data-highlighted:text-destructive"
                      >
                        Összes szűrő törlése
                      </Menu.Item>
                    </>
                  )}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>
      </div>

      {/* ── Aktív filter chip-ek ── */}
      {hasFilter && (
        <div className="flex flex-wrap items-center gap-1.5 px-6 py-2 border-b bg-muted/10">
          <span className="text-xs text-muted-foreground mr-1">Szűrők:</span>
          {selectedRoles.map(r => (
            <FilterChip key={r} label={szerepkorLabel[r] ?? r} onRemove={() => toggleRole(r)} />
          ))}
          {selectedJobs.map(j => (
            <FilterChip key={j} label={j} onRemove={() => toggleJob(j)} />
          ))}
          <button onClick={clearAll} className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
            Összes törlése
          </button>
        </div>
      )}

      {/* ── Táblázat – min-height hogy scroll ne reset-eljen szűréskor ── */}
      <div style={{ minHeight: `${employees.length * 57}px` }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6 text-xs uppercase tracking-wider text-muted-foreground font-medium w-[110px]">Azonosító</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Dolgozó</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Munkakör</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Szervezeti Egység</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Szerepkör</TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Státusz</TableHead>
            <TableHead className="text-right pr-6 text-xs uppercase tracking-wider text-muted-foreground font-medium">Műveletek</TableHead>
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
                <TableCell className="pl-6">
                  <span className="font-mono text-xs text-muted-foreground">{empId}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {emp.avatar_url
                        ? <img src={emp.avatar_url} alt={emp.nev} className="h-full w-full object-cover" />
                        : <span className="text-xs font-semibold text-primary">{initials}</span>
                      }
                    </div>
                    <span className="font-medium text-sm">{emp.nev}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{munkakor}</TableCell>
                <TableCell className="text-sm text-muted-foreground">Központ</TableCell>
                <TableCell>
                  {emp.hr_szerepkor && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border border-primary/40 text-primary">
                      {szerepkorLabel[emp.hr_szerepkor] ?? emp.hr_szerepkor}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600">
                    Aktív
                  </span>
                </TableCell>
                <TableCell className="text-right pr-6">
                  <Link href={`/hr/employee/${emp.id}`}>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary gap-1">
                      Adatlap <ChevronRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            )
          })}

          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
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
