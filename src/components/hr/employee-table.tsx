"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ChevronRight, SlidersHorizontal, X, Check } from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const szerepkorLabel: Record<string, string> = {
  hr_munkatars:   "HR Munkatárs",
  hr_vezeto:      "HR Vezető",
  vezeto:         "Vezető",
  admin:          "Admin",
  munkavallalo:   "Munkavállaló",
  rendszergazda:  "Rendszergazda",
  auditor:        "Auditor",
  toborzo:        "Toborzó",
}

const SZEREPKOR_OPTIONS = Object.entries(szerepkorLabel).map(([v, l]) => ({ value: v, label: l }))

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

interface Employee {
  id: string
  nev: string
  hr_szerepkor: string | null
  avatar_url: string | null
  hr_dolgozo_adatlap: any
}

interface Props {
  employees: Employee[]
}

export function EmployeeTable({ employees }: Props) {
  const [search, setSearch]           = useState("")
  const [selectedRoles, setRoles]     = useState<string[]>([])

  const toggleRole = (role: string) =>
    setRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])

  const filtered = employees.filter(emp => {
    const nameMatch = !search || emp.nev?.toLowerCase().includes(search.toLowerCase())
    const roleMatch = selectedRoles.length === 0 || selectedRoles.includes(emp.hr_szerepkor ?? "")
    return nameMatch && roleMatch
  })

  const hasFilter = selectedRoles.length > 0

  return (
    <div>
      {/* Toolbar sor */}
      <div className="flex items-center justify-between px-6 py-3 border-b">
        {/* Bal: darabszám */}
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{filtered.length}</span>
          {" "}/ {employees.length} dolgozó
        </p>

        {/* Jobb: kereső + szűrő */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Keresés a táblázatban..."
              className="pl-8 h-8 text-sm w-[220px] bg-muted/40"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button
                variant="outline"
                size="sm"
                className={`h-8 gap-1.5 text-sm ${hasFilter ? "border-primary text-primary" : ""}`}
              />
            }>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Szűrés
              {hasFilter && (
                <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground rounded-full">
                  {selectedRoles.length}
                </Badge>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Szerepkör szerint</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {SZEREPKOR_OPTIONS.map(opt => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => toggleRole(opt.value)}
                    className="flex items-center justify-between gap-2"
                  >
                    {opt.label}
                    {selectedRoles.includes(opt.value) && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              {hasFilter && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setRoles([])}
                    className="text-muted-foreground text-xs"
                  >
                    Szűrők törlése
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Táblázat */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6 text-xs uppercase tracking-wider text-muted-foreground font-medium w-[110px]">
              Azonosító
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Dolgozó
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Munkakör
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Szervezeti Egység
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Szerepkör
            </TableHead>
            <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Státusz
            </TableHead>
            <TableHead className="text-right pr-6 text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Műveletek
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((emp, index) => {
            const activeJogviszony = emp.hr_dolgozo_adatlap?.hr_jogviszony?.[0]
            const activeBeosztas = activeJogviszony?.hr_beosztas?.[0]
            const munkakor = activeBeosztas?.hr_munkakor?.megnevezes || "Nincs beállítva"
            const initials = getInitials(emp.nev || "?")
            const empId = `EMP-${String(index + 1).padStart(3, "0")}`

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
  )
}
