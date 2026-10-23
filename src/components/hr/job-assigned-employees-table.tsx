"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TableToolbar, type FilterGroup } from "@/components/table-toolbar/table-toolbar"
import { AssignEmployeeDialog } from "@/components/hr/assign-employee-dialog"
import { RemoveEmployeeButton } from "@/app/hr/job/[id]/remove-employee-button"

export interface JobAssignedEmployee {
  id: string
  profilId: string
  nev: string
  avatarUrl?: string | null
  hr_szerepkor?: string | null
  belepes_datuma?: string | null
}

interface JobAssignedEmployeesTableProps {
  jobId: string
  employees: JobAssignedEmployee[]
  isHrOrAdmin: boolean
  availableEmployees: {
    id: string
    felhasznalo_profil: {
      nev: string
    }
  }[]
}

export function roleLabel(role: string | null | undefined): { label: string; className: string } {
  switch (role) {
    case "admin":          return { label: "Admin",                className: "bg-destructive/10 text-destructive border-destructive/20 border" }
    case "rendszergazda":  return { label: "Rendszergazda (IT)",   className: "bg-destructive/10 text-destructive border-destructive/20 border" }
    case "hr_vezeto":      return { label: "HR Vezető",            className: "bg-primary/10 text-primary border-primary/20 border" }
    case "hr_munkatars":   return { label: "HR Munkatárs",         className: "bg-primary/10 text-primary border-primary/20 border" }
    case "vezeto":         return { label: "Vezető",               className: "bg-success/10 text-success border-success/20 border" }
    case "berugyi":        return { label: "Bérügyi",              className: "bg-info/10 text-info border-info/20 border" }
    case "toborzo":        return { label: "Toborzó (ATS)",        className: "bg-warning/10 text-warning border-warning/20 border" }
    case "munkavedelmi":   return { label: "Munkavédelmi",         className: "bg-warning/10 text-warning border-warning/20 border" }
    case "auditor":        return { label: "Auditor",              className: "bg-primary/10 text-primary border-primary/20 border" }
    default:               return { label: "Munkavállaló",         className: "bg-secondary text-secondary-foreground" }
  }
}

export function JobAssignedEmployeesTable({
  jobId,
  employees,
  isHrOrAdmin,
  availableEmployees,
}: JobAssignedEmployeesTableProps) {
  const [searchValue, setSearchValue] = useState("")
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])

  // Egyedi szerepkörök összegyűjtése a szűrőhöz
  const roleOptions = useMemo(() => {
    const rolesMap = new Map<string, string>()
    employees.forEach((e) => {
      const roleKey = e.hr_szerepkor || "munkavallalo"
      if (!rolesMap.has(roleKey)) {
        rolesMap.set(roleKey, roleLabel(roleKey).label)
      }
    })
    return Array.from(rolesMap.entries()).map(([key, label]) => ({
      id: key,
      label,
      checked: selectedRoles.includes(key),
    }))
  }, [employees, selectedRoles])

  const filterGroups: FilterGroup[] = useMemo(() => {
    if (roleOptions.length === 0) return []
    return [
      {
        id: "szerepkor",
        title: "Szerepkör",
        options: roleOptions,
        onToggle: (roleId: string) => {
          setSelectedRoles((prev) =>
            prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
          )
        },
      },
    ]
  }, [roleOptions])

  const handleClearFilters = () => {
    setSearchValue("")
    setSelectedRoles([])
  }

  // Szűrt lista
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (searchValue.trim()) {
        const q = searchValue.toLowerCase().trim()
        const nameMatch = (emp.nev || "").toLowerCase().includes(q)
        const roleText = roleLabel(emp.hr_szerepkor).label.toLowerCase()
        const roleMatch = roleText.includes(q)
        if (!nameMatch && !roleMatch) return false
      }
      if (selectedRoles.length > 0) {
        const role = emp.hr_szerepkor || "munkavallalo"
        if (!selectedRoles.includes(role)) return false
      }
      return true
    })
  }, [employees, searchValue, selectedRoles])

  const activeFiltersCount = selectedRoles.length

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
        <div>
          <CardTitle className="text-base font-semibold">Hozzárendelt Dolgozók</CardTitle>
          <CardDescription className="text-xs">
            A munkakörben jelenleg dolgozó munkatársak és szerepköreik.
          </CardDescription>
        </div>
        {isHrOrAdmin && (
          <AssignEmployeeDialog
            jobId={jobId}
            availableEmployees={availableEmployees}
            trigger={
              <Button size="sm">
                Dolgozó hozzárendelése
              </Button>
            }
          />
        )}
      </CardHeader>

      {/* Kanonikus TableToolbar keresővel és szűréssel */}
      <div className="p-3 border-b bg-card">
        <TableToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Keresés név vagy szerepkör alapján..."
          filterGroups={filterGroups}
          activeFiltersCount={activeFiltersCount}
          onClearFilters={handleClearFilters}
          actions={
            <div className="text-xs text-muted-foreground tabular-nums px-2 py-1">
              {searchValue || activeFiltersCount > 0 ? (
                <span>
                  Találatok: <strong className="text-foreground">{filteredEmployees.length}</strong> / {employees.length}
                </span>
              ) : (
                <span>
                  Összesen: <strong className="text-foreground">{employees.length}</strong> dolgozó
                </span>
              )}
            </div>
          }
        />
      </div>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-6">Neve</TableHead>
                <TableHead>Szerepkör</TableHead>
                <TableHead>Belépés Dátuma</TableHead>
                {isHrOrAdmin && <TableHead className="text-right pr-6">Műveletek</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => {
                  const role = roleLabel(emp.hr_szerepkor)
                  const initials = (emp.nev || "?").substring(0, 2).toUpperCase()
                  return (
                    <TableRow key={emp.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 shrink-0">
                            {emp.avatarUrl ? (
                              <AvatarImage
                                src={emp.avatarUrl}
                                alt={emp.nev}
                                className="object-cover"
                              />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <Link
                            href={`/hr/employee/${emp.id}`}
                            className="font-medium hover:underline text-primary leading-tight"
                          >
                            {emp.nev}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`font-normal text-xs ${role.className}`}>
                          {role.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm tabular-nums">
                        {emp.belepes_datuma ? new Date(emp.belepes_datuma).toLocaleDateString("hu-HU") : "—"}
                      </TableCell>
                      {isHrOrAdmin && (
                        <TableCell className="text-right pr-6">
                          <RemoveEmployeeButton jobId={jobId} employeeId={emp.id} employeeName={emp.nev} />
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isHrOrAdmin ? 4 : 3} className="text-center py-12 text-muted-foreground">
                    <p>Jelenleg nincs dolgozó hozzárendelve ehhez a munkakörhöz.</p>
                    {isHrOrAdmin && (
                      <div className="mt-3">
                        <AssignEmployeeDialog
                          jobId={jobId}
                          availableEmployees={availableEmployees}
                          trigger={
                            <Button variant="outline" size="sm">
                              Dolgozó hozzárendelése
                            </Button>
                          }
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={isHrOrAdmin ? 4 : 3} className="text-center py-10 text-muted-foreground">
                    <p className="text-sm">Nincs a keresésnek vagy a beállított szűrőknek megfelelő dolgozó.</p>
                    <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-3">
                      Szűrők törlése
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
