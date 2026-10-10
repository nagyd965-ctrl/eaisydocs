"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Briefcase, 
  Search, 
  Lock, 
  UserCheck, 
  UserX, 
  Users, 
  Building2 
} from "lucide-react"
import { EmployeeEditDialog } from "@/components/hr/employee-edit-dialog"
import { EmployeeDeleteDialog } from "@/components/hr/employee-delete-dialog"
import { cn } from "@/lib/utils"

export interface SettingsEmployeeTableProps {
  employees: any[]
  jobs: any[]
  orgUnits: any[]
}

export function SettingsEmployeeTable({
  employees,
  jobs,
  orgUnits
}: SettingsEmployeeTableProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"aktiv" | "kilepett" | "all">("aktiv")

  // Szerepkör és státusz meghatározása egy-egy munkavállalónál
  const enrichedEmployees = useMemo(() => {
    return (employees || []).map((emp) => {
      const nev = emp.felhasznalo_profil?.nev || "Ismeretlen"
      const initials = nev.substring(0, 2).toUpperCase()
      const activeJogviszony = emp.hr_jogviszony?.find((j: any) => !j.kilepes_datuma) || emp.hr_jogviszony?.[0]
      const activeBeosztas = activeJogviszony?.hr_beosztas?.find((b: any) => !b.ervenyes_ig) || activeJogviszony?.hr_beosztas?.[0]
      const munkakor = activeBeosztas?.hr_munkakor?.megnevezes || "Nincs beállítva"
      const egysegId = (emp.felhasznalo_profil as any)?.hr_szervezeti_egyseg_id
      const egyseg = (egysegId && orgUnits.find((u: any) => u.id === egysegId)?.nev) || (emp.felhasznalo_profil as any)?.hr_szervezeti_egyseg?.nev || "Nincs besorolva"
      const hr_szerepkor = emp.felhasznalo_profil?.hr_szerepkor || "Ismeretlen"
      const belepes = activeJogviszony?.belepes_datuma ? new Date(activeJogviszony.belepes_datuma).toLocaleDateString("hu-HU") : "-"
      const managerId = (emp.felhasznalo_profil as any)?.kozvetlen_vezeto_id
      const manager = managerId ? employees.find(m => m.id === managerId) : null
      const managerName = manager?.felhasznalo_profil?.nev || "Nincs beállítva"

      // Kilépett státusz: ha inaktív/kilépett a szerepköre, vagy lejárt határozott idejű munkaviszonya van (kivéve admin / hr_vezető)
      const isPastEndDate = emp.munkaviszony_vege 
        ? new Date(emp.munkaviszony_vege).getTime() < new Date().setHours(0, 0, 0, 0)
        : false

      const isExited = Boolean(
        hr_szerepkor === "inaktiv" || 
        hr_szerepkor === "kilepett" ||
        (isPastEndDate && hr_szerepkor !== "admin" && hr_szerepkor !== "hr_vezeto")
      )

      const kilepesDatuma = emp.munkaviszony_vege 
        ? new Date(emp.munkaviszony_vege).toLocaleDateString("hu-HU") 
        : null

      return {
        ...emp,
        nev,
        initials,
        munkakor,
        egyseg,
        hr_szerepkor,
        belepes,
        kilepesDatuma,
        managerName,
        isExited
      }
    })
  }, [employees, orgUnits])

  // Számosságok
  const activeCount = useMemo(() => enrichedEmployees.filter(e => !e.isExited).length, [enrichedEmployees])
  const exitedCount = useMemo(() => enrichedEmployees.filter(e => e.isExited).length, [enrichedEmployees])

  // Szűrt lista
  const filteredEmployees = useMemo(() => {
    return enrichedEmployees.filter((emp) => {
      // 1. Státusz szerinti szűrés
      if (statusFilter === "aktiv" && emp.isExited) return false
      if (statusFilter === "kilepett" && !emp.isExited) return false

      // 2. Kereső szerinti szűrés
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchesName = emp.nev.toLowerCase().includes(query)
        const matchesJob = emp.munkakor.toLowerCase().includes(query)
        const matchesOrg = emp.egyseg.toLowerCase().includes(query)
        if (!matchesName && !matchesJob && !matchesOrg) return false
      }

      return true
    })
  }, [enrichedEmployees, statusFilter, search])

  const getRoleBadge = (hr_szerepkor: string, isExited: boolean) => {
    if (isExited) {
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-border font-medium gap-1 text-[11px]">
          <Lock className="w-3 h-3 text-muted-foreground" /> Kilépett (Fiók letiltva)
        </Badge>
      )
    }

    let roleColor = "bg-secondary text-secondary-foreground"
    let roleName = "Ismeretlen"

    if (hr_szerepkor === "admin") { roleColor = "bg-destructive/10 text-destructive border-destructive/20 border"; roleName = "Admin" }
    else if (hr_szerepkor === "rendszergazda") { roleColor = "bg-destructive/10 text-destructive border-destructive/20 border"; roleName = "Rendszergazda (IT)" }
    else if (hr_szerepkor === "hr_vezeto") { roleColor = "bg-primary/10 text-primary border-primary/20 border"; roleName = "HR Vezető (Igazgató)" }
    else if (hr_szerepkor === "hr_munkatars") { roleColor = "bg-primary/10 text-primary border-primary/20 border"; roleName = "HR Munkatárs" }
    else if (hr_szerepkor === "vezeto") { roleColor = "bg-success/10 text-success border-success/20 border"; roleName = "Vezető (Közvetlen)" }
    else if (hr_szerepkor === "munkavallalo") { roleName = "Munkavállaló (Alap)" }
    else if (hr_szerepkor === "berugyi") { roleColor = "bg-info/10 text-info border-info/20 border"; roleName = "Bérügyi / Bérszámfejtő" }
    else if (hr_szerepkor === "toborzo") { roleColor = "bg-warning/10 text-warning border-warning/20 border"; roleName = "Toborzó (ATS)" }
    else if (hr_szerepkor === "munkavedelmi") { roleColor = "bg-warning/10 text-warning border-warning/20 border"; roleName = "Munkavédelmi Felelős" }
    else if (hr_szerepkor === "auditor") { roleColor = "bg-primary/10 text-primary border-primary/20 border"; roleName = "Auditor (Könyvvizsgáló)" }

    return (
      <Badge variant="secondary" className={`font-normal ${roleColor}`}>
        {roleName}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Szűrősáv és Kereső */}
      <div className="px-6 pt-4 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b bg-card">
        {/* Státusz fül / szűrő chippek */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            type="button"
            variant={statusFilter === "aktiv" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs px-3 rounded-full gap-1.5 cursor-pointer font-medium"
            onClick={() => setStatusFilter("aktiv")}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Aktív munkatársak
            <span className={cn(
              "ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold tabular-nums",
              statusFilter === "aktiv" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            )}>
              {activeCount}
            </span>
          </Button>

          <Button
            type="button"
            variant={statusFilter === "kilepett" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 text-xs px-3 rounded-full gap-1.5 cursor-pointer font-medium",
              statusFilter === "kilepett" ? "bg-zinc-800 text-white dark:bg-zinc-700" : "text-muted-foreground"
            )}
            onClick={() => setStatusFilter("kilepett")}
          >
            <UserX className="w-3.5 h-3.5" />
            Kilépett / Archivált
            <span className={cn(
              "ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold tabular-nums",
              statusFilter === "kilepett" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            )}>
              {exitedCount}
            </span>
          </Button>

          <Button
            type="button"
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs px-2.5 rounded-full text-muted-foreground cursor-pointer"
            onClick={() => setStatusFilter("all")}
          >
            Összes ({enrichedEmployees.length})
          </Button>
        </div>

        {/* Keresőmező */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Keresés név, munkakör szerint..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-muted/20 border-border/60"
          />
        </div>
      </div>

      {/* Táblázat */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left compact-table">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
            <tr>
              <th className="px-6 py-3.5 font-semibold">Név</th>
              <th className="px-6 py-3.5 font-semibold">Munkakör</th>
              <th className="px-6 py-3.5 font-semibold">Szervezeti Egység</th>
              <th className="px-6 py-3.5 font-semibold">Szerepkör & Állapot</th>
              <th className="px-6 py-3.5 font-semibold">Közvetlen vezető</th>
              <th className="px-6 py-3.5 font-semibold">
                {statusFilter === "kilepett" ? "Kilépés napja" : "Belépés"}
              </th>
              <th className="px-6 py-3.5 text-right font-semibold">Műveletek</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredEmployees.map((emp) => {
              return (
                <tr 
                  key={emp.id} 
                  className={cn(
                    "transition-colors",
                    emp.isExited 
                      ? "bg-muted/15 hover:bg-muted/25 opacity-75 hover:opacity-100" 
                      : "bg-card hover:bg-muted/30"
                  )}
                >
                  {/* Név & Avatar */}
                  <td className="px-6 py-3.5 font-medium whitespace-nowrap flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className={cn(
                        "text-xs font-semibold",
                        emp.isExited 
                          ? "bg-muted text-muted-foreground" 
                          : "bg-primary/10 text-primary"
                      )}>
                        {emp.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "font-semibold",
                          emp.isExited ? "text-muted-foreground line-through decoration-muted-foreground/50" : "text-foreground"
                        )}>
                          {emp.nev}
                        </span>
                        {emp.isExited && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-muted/50 text-muted-foreground border-border">
                            Inaktív
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground/80 block">
                        {emp.isExited ? "Munkaviszony lezárva" : emp.belepes ? `Belépett: ${emp.belepes}` : ""}
                      </span>
                    </div>
                  </td>

                  {/* Munkakör */}
                  <td className="px-6 py-3.5 text-muted-foreground">
                    {emp.munkakor}
                  </td>

                  {/* Szervezeti Egység */}
                  <td className="px-6 py-3.5">
                    <Badge variant="outline" className="font-normal text-xs">
                      {emp.egyseg}
                    </Badge>
                  </td>

                  {/* Szerepkör & Állapot */}
                  <td className="px-6 py-3.5">
                    {getRoleBadge(emp.hr_szerepkor, emp.isExited)}
                  </td>

                  {/* Közvetlen vezető */}
                  <td className="px-6 py-3.5 text-muted-foreground text-xs">
                    {emp.managerName}
                  </td>

                  {/* Időpont */}
                  <td className="px-6 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                    {emp.isExited ? (
                      <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                        {emp.kilepesDatuma ? `Kilépett: ${emp.kilepesDatuma}` : "Megszűnt"}
                      </span>
                    ) : (
                      emp.belepes
                    )}
                  </td>

                  {/* Műveletek */}
                  <td className="px-6 py-3.5 text-right flex items-center justify-end gap-1">
                    <EmployeeEditDialog 
                      employee={emp} 
                      jobs={jobs || []} 
                      orgUnits={orgUnits || []} 
                      managers={employees || []} 
                    />
                    <EmployeeDeleteDialog 
                      employeeId={emp.id} 
                      employeeName={emp.nev} 
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filteredEmployees.length === 0 && (
        <div className="p-12 text-center text-sm text-muted-foreground bg-muted/5 rounded-b-xl">
          {statusFilter === "kilepett" ? (
            <div className="space-y-1">
              <UserCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="font-medium text-foreground">Nincsenek kilépett munkatársak.</p>
              <p className="text-xs text-muted-foreground">Minden rögzített munkatárs aktív jogviszonnyal rendelkezik.</p>
            </div>
          ) : (
            <div className="space-y-1">
              <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="font-medium text-foreground">Nincsenek megjeleníthető dolgozók a megadott szűrési feltételekkel.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
