"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { KpiCard } from "@/components/kpi-card"
import { TableToolbar, type TableColumnOption, type FilterGroup } from "@/components/table-toolbar/table-toolbar"
import {
  ALL_HR_MODULES,
  HR_CORE_ROLES,
  HR_MODULE_DEFINITIONS,
  HR_ROLE_LABELS,
  type HrCoreRole,
  type HrModuleKey,
} from "@/utils/hr/company-role-resolver"
import { updateEmployeePermissionsAction } from "@/app/hr/permissions/actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export interface PermissionMatrixEmployee {
  id: string
  nev: string
  email?: string | null
  avatar_url?: string | null
  munkakor: string
  szervezeti_egyseg: string
  hrRole: HrCoreRole
  hrModules: HrModuleKey[]
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function PermissionsMatrixView({
  initialEmployees,
  companyName,
}: {
  initialEmployees: PermissionMatrixEmployee[]
  companyName: string
}) {
  const router = useRouter()
  const [employees, setEmployees] = useState<PermissionMatrixEmployee[]>(initialEmployees)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  // TableToolbar state
  const [search, setSearch] = useState("")
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([])

  const [columns, setColumns] = useState<TableColumnOption[]>([
    { id: "dolgozo", label: "Dolgozó", isVisible: true },
    { id: "szervezeti_egyseg", label: "Szervezeti Egység", isVisible: true },
    { id: "szerepkor", label: "Alapszerepkör", isVisible: true },
    ...HR_MODULE_DEFINITIONS.map((m) => ({
      id: `mod_${m.key}`,
      label: m.shortLabel,
      isVisible: true,
    })),
    { id: "gyorsmuvelet", label: "Gyorsművelet", isVisible: true },
  ])

  const handleToggleColumn = (colId: string) => {
    setColumns((prev) => prev.map((c) => (c.id === colId ? { ...c, isVisible: !c.isVisible } : c)))
  }

  const isColVisible = (colId: string) => columns.find((c) => c.id === colId)?.isVisible ?? true

  // Szervezeti egység opciók
  const orgOptions = useMemo(() => {
    const seen = new Set<string>()
    for (const emp of employees) {
      if (emp.szervezeti_egyseg) seen.add(emp.szervezeti_egyseg)
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b, "hu"))
  }, [employees])

  const toggleRoleFilter = (v: string) =>
    setSelectedRoles((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))
  const toggleOrgFilter = (v: string) =>
    setSelectedOrgs((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))
  const clearFilters = () => {
    setSelectedRoles([])
    setSelectedOrgs([])
  }

  const activeFiltersCount = selectedRoles.length + selectedOrgs.length

  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        id: "szerepkor",
        title: "Alapszerepkör",
        options: HR_CORE_ROLES.map((r) => ({
          id: r.value,
          label: r.label,
          checked: selectedRoles.includes(r.value),
        })),
        onToggle: toggleRoleFilter,
      },
      ...(orgOptions.length > 0
        ? [
            {
              id: "szervezeti_egyseg",
              title: "Szervezeti Egység",
              options: orgOptions.map((o) => ({
                id: o,
                label: o,
                checked: selectedOrgs.includes(o),
              })),
              onToggle: toggleOrgFilter,
            },
          ]
        : []),
    ],
    [selectedRoles, selectedOrgs, orgOptions]
  )

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        emp.nev.toLowerCase().includes(q) ||
        emp.munkakor.toLowerCase().includes(q) ||
        emp.szervezeti_egyseg.toLowerCase().includes(q)
      const matchRole = selectedRoles.length === 0 || selectedRoles.includes(emp.hrRole)
      const matchOrg = selectedOrgs.length === 0 || selectedOrgs.includes(emp.szervezeti_egyseg)
      return matchSearch && matchRole && matchOrg
    })
  }, [employees, search, selectedRoles, selectedOrgs])

  // KPI számítások
  const totalCount = employees.length
  const adminCount = employees.filter((e) => e.hrRole === "admin").length
  const managerCount = employees.filter((e) => e.hrRole === "vezeto").length
  const customModuleUsersCount = employees.filter(
    (e) => e.hrRole !== "admin" && e.hrModules.length > 0
  ).length

  // Mentés segédfüggvény (optimista UI + szerver szinkron)
  const persistChange = async (
    employeeId: string,
    nextRole: HrCoreRole,
    nextModules: HrModuleKey[]
  ) => {
    const previousState = employees
    const effectiveModules: HrModuleKey[] =
      nextRole === "admin" ? [...ALL_HR_MODULES] : nextModules

    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId
          ? { ...e, hrRole: nextRole, hrModules: effectiveModules }
          : e
      )
    )
    setSavingId(employeeId)

    const res = await updateEmployeePermissionsAction({
      employeeId,
      hrRole: nextRole,
      hrModules: effectiveModules,
    })

    setSavingId(null)

    if (res.error) {
      setEmployees(previousState)
      toast.error(res.error)
    } else {
      toast.success("Jogosultságok elmentve.")
      startTransition(() => {
        router.refresh()
      })
    }
  }

  const handleRoleChange = (emp: PermissionMatrixEmployee, newRole: HrCoreRole) => {
    if (newRole === emp.hrRole) return
    const nextModules: HrModuleKey[] =
      newRole === "admin"
        ? [...ALL_HR_MODULES]
        : emp.hrRole === "admin"
        ? []
        : emp.hrModules
    persistChange(emp.id, newRole, nextModules)
  }

  const handleToggleModule = (emp: PermissionMatrixEmployee, modKey: HrModuleKey) => {
    if (emp.hrRole === "admin") return // Adminnak minden modul fixen aktív
    const hasMod = emp.hrModules.includes(modKey)
    const nextModules = hasMod
      ? emp.hrModules.filter((m) => m !== modKey)
      : [...emp.hrModules, modKey]
    persistChange(emp.id, emp.hrRole, nextModules)
  }

  const handleSetAllModules = (emp: PermissionMatrixEmployee, enableAll: boolean) => {
    if (emp.hrRole === "admin") return
    const nextModules: HrModuleKey[] = enableAll ? [...ALL_HR_MODULES] : []
    persistChange(emp.id, emp.hrRole, nextModules)
  }

  return (
    <div className="space-y-6">
      {/* 4 Kanonikus KPI Kártya */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Összes Munkatárs"
          value={`${totalCount} fő`}
          sub={companyName}
        />
        <KpiCard
          label="Adminisztrátorok"
          value={`${adminCount} fő`}
          sub="Teljes körű hozzáférés"
        />
        <KpiCard
          label="Vezetők"
          value={`${managerCount} fő`}
          sub="Csapat- és teljesítménynézet"
        />
        <KpiCard
          label="Egyedi Modul-jogosultsággal"
          value={`${customModuleUsersCount} fő`}
          sub="Delegált HR / szakmai modulok"
        />
      </div>

      {/* Mátrix Kártya */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold">
                Vállalati Modul-hozzáférési Mátrix
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                A Dolgozói Portál minden munkatársnak alapértelmezetten jár. A Vezető szerepkör feloldja a Vezetői nézetet (saját csapatra), az alábbi kapcsolókkal pedig személyre szabottan engedélyezheted a szakmai HR modulokat.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="px-6 pt-4 pb-2">
            <TableToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Keresés név, munkakör vagy szervezeti egység alapján..."
              columns={columns}
              onToggleColumn={handleToggleColumn}
              filterGroups={filterGroups}
              activeFiltersCount={activeFiltersCount}
              onClearFilters={clearFilters}
            />
          </div>

          <div className="overflow-x-auto">
            <Table className="compact-table">
              <TableHeader>
                <TableRow className="bg-muted/30">
                  {isColVisible("dolgozo") && (
                    <TableHead className="pl-6 min-w-[210px] text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Dolgozó
                    </TableHead>
                  )}
                  {isColVisible("szervezeti_egyseg") && (
                    <TableHead className="min-w-[140px] text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Egység
                    </TableHead>
                  )}
                  {isColVisible("szerepkor") && (
                    <TableHead className="min-w-[155px] text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Alapszerepkör
                    </TableHead>
                  )}
                  {HR_MODULE_DEFINITIONS.map((mod) =>
                    isColVisible(`mod_${mod.key}`) ? (
                      <TableHead
                        key={mod.key}
                        className="text-center px-2 min-w-[88px] text-[11px] uppercase tracking-wider text-muted-foreground font-medium"
                        title={`${mod.label} — ${mod.description}`}
                      >
                        {mod.shortLabel}
                      </TableHead>
                    ) : null
                  )}
                  {isColVisible("gyorsmuvelet") && (
                    <TableHead className="text-right pr-6 min-w-[140px] text-xs uppercase tracking-wider text-muted-foreground font-medium">
                      Gyorsművelet
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredEmployees.map((emp) => {
                  const isAdmin = emp.hrRole === "admin"
                  const isSaving = savingId === emp.id
                  const initials = getInitials(emp.nev || "?")

                  return (
                    <TableRow
                      key={emp.id}
                      className={cn(
                        "hover:bg-muted/20 transition-colors",
                        isSaving && "opacity-70"
                      )}
                    >
                      {isColVisible("dolgozo") && (
                        <TableCell className="pl-6 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                              {emp.avatar_url ? (
                                <img
                                  src={emp.avatar_url}
                                  alt={emp.nev}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-[11px] font-semibold text-primary">
                                  {initials}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-sm text-foreground truncate">
                                {emp.nev}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {emp.munkakor}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      )}

                      {isColVisible("szervezeti_egyseg") && (
                        <TableCell className="py-2.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-normal text-xs",
                              emp.szervezeti_egyseg === "Nincs besorolva" &&
                                "text-muted-foreground"
                            )}
                          >
                            {emp.szervezeti_egyseg}
                          </Badge>
                        </TableCell>
                      )}

                      {isColVisible("szerepkor") && (
                        <TableCell className="py-2.5">
                          <Select
                            value={emp.hrRole}
                            onValueChange={(val) =>
                              handleRoleChange(emp, (val || "munkavallalo") as HrCoreRole)
                            }
                            disabled={isSaving}
                          >
                            <SelectTrigger className="h-8 w-[142px] text-xs font-medium">
                              <span>{HR_ROLE_LABELS[emp.hrRole] || emp.hrRole}</span>
                            </SelectTrigger>
                            <SelectContent>
                              {HR_CORE_ROLES.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}

                      {HR_MODULE_DEFINITIONS.map((mod) => {
                        if (!isColVisible(`mod_${mod.key}`)) return null
                        const isEnabled =
                          isAdmin || emp.hrModules.includes(mod.key)

                        return (
                          <TableCell key={mod.key} className="text-center px-2 py-2.5">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isEnabled}
                              aria-label={`${emp.nev} — ${mod.label}`}
                              disabled={isAdmin || isSaving}
                              onClick={() => handleToggleModule(emp, mod.key)}
                              title={
                                isAdmin
                                  ? "Adminisztrátornak minden modul automatikusan engedélyezett"
                                  : `${mod.label}: ${isEnabled ? "Bekapcsolva (kattints a kikapcsoláshoz)" : "Kikapcsolva (kattints a bekapcsoláshoz)"}`
                              }
                              className={cn(
                                "inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-none",
                                isEnabled
                                  ? "bg-primary border-primary"
                                  : "bg-muted border-border",
                                (isAdmin || isSaving) && "cursor-not-allowed opacity-65"
                              )}
                            >
                              <span
                                className={cn(
                                  "pointer-events-none block h-3.5 w-3.5 rounded-full bg-background transition-transform",
                                  isEnabled ? "translate-x-4" : "translate-x-0.5"
                                )}
                              />
                            </button>
                          </TableCell>
                        )
                      })}

                      {isColVisible("gyorsmuvelet") && (
                        <TableCell className="text-right pr-6 py-2.5">
                          {isAdmin ? (
                            <span className="text-[11px] font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                              Teljes hozzáférés
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                disabled={
                                  isSaving ||
                                  emp.hrModules.length === ALL_HR_MODULES.length
                                }
                                onClick={() => handleSetAllModules(emp, true)}
                              >
                                Mind be
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                                disabled={isSaving || emp.hrModules.length === 0}
                                onClick={() => handleSetAllModules(emp, false)}
                              >
                                Mind ki
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}

                {filteredEmployees.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={columns.filter((c) => c.isVisible).length}
                      className="text-center py-10 text-muted-foreground text-sm"
                    >
                      Nem található munkatárs a megadott szűrési feltételekre.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
