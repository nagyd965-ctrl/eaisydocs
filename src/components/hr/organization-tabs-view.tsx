"use client"

import { useState, useMemo } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus } from "lucide-react"
import Link from "next/link"
import { TableToolbar, type TableColumnOption, type FilterGroup } from "@/components/table-toolbar/table-toolbar"
import { OrgChartTree } from "@/components/hr/org-chart-tree"
import { type OrgUnitNode } from "@/lib/org-chart-utils"
import { JobActionMenu } from "@/components/hr/job-action-menu"
import { JobCreateDialog } from "@/components/hr/job-create-dialog"
import { OrgUnitActionMenu } from "@/components/hr/org-unit-action-menu"
import { HrOrgUnitCreateDialog } from "@/components/hr/org-unit-create-dialog"
import {
  PermissionsMatrixView,
  type PermissionMatrixEmployee,
} from "@/components/hr/permissions-matrix-view"

interface OrganizationTabsViewProps {
  rootOrgUnits: OrgUnitNode[]
  orgUnits: any[]
  dbJobs: any[]
  allUsers: any[]
  defaultTab?: string
  isAdmin?: boolean
  permissionEmployees?: PermissionMatrixEmployee[]
  companyName?: string
}

export function OrganizationTabsView({
  rootOrgUnits,
  orgUnits,
  dbJobs,
  allUsers,
  defaultTab = "orgchart",
  isAdmin = false,
  permissionEmployees = [],
  companyName = "Aktív Vállalat",
}: OrganizationTabsViewProps) {
  const safeDefaultTab = !isAdmin && defaultTab === "permissions" ? "orgchart" : defaultTab
  const [activeTab, setActiveTab] = useState(safeDefaultTab)
  const [orgSearch, setOrgSearch] = useState("")
  const [jobSearch, setJobSearch] = useState("")

  // ── Szervezeti Egységek TableToolbar állapotok ──
  const [orgColumns, setOrgColumns] = useState<TableColumnOption[]>([
    { id: "megnevezes", label: "Megnevezés", isVisible: true },
    { id: "szulo_egyseg", label: "Szülő egység", isVisible: true },
    { id: "dolgozok", label: "Hozzárendelt dolgozók", isVisible: true },
    { id: "muveletek", label: "Műveletek", isVisible: true },
  ])
  const [orgStatusFilters, setOrgStatusFilters] = useState<string[]>([])
  const [orgHierarchyFilters, setOrgHierarchyFilters] = useState<string[]>([])

  const toggleOrgCol = (colId: string) => {
    setOrgColumns(prev => prev.map(c => c.id === colId ? { ...c, isVisible: !c.isVisible } : c))
  }
  const isOrgColVisible = (colId: string) => orgColumns.find(c => c.id === colId)?.isVisible ?? true

  const orgFilterGroups: FilterGroup[] = useMemo(() => [
    {
      id: "letszam",
      title: "Létszám / Betöltöttség",
      options: [
        { id: "van_dolgozo", label: "Aktív létszámmal rendelkező", checked: orgStatusFilters.includes("van_dolgozo") },
        { id: "ures", label: "Üres (nincs hozzárendelt dolgozó)", checked: orgStatusFilters.includes("ures") },
      ],
      onToggle: (id) => setOrgStatusFilters(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]),
    },
    {
      id: "hierarchia",
      title: "Hierarchia szint",
      options: [
        { id: "foegyseg", label: "Főegység (nincs szülő)", checked: orgHierarchyFilters.includes("foegyseg") },
        { id: "alegyseg", label: "Alegység (van szülő egysége)", checked: orgHierarchyFilters.includes("alegyseg") },
      ],
      onToggle: (id) => setOrgHierarchyFilters(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]),
    },
  ], [orgStatusFilters, orgHierarchyFilters])

  const orgActiveFilterCount = orgStatusFilters.length + orgHierarchyFilters.length

  // Szűrt szervezeti egységek
  const filteredOrgUnits = useMemo(() => {
    const q = orgSearch.toLowerCase().trim()
    return orgUnits.filter(u => {
      const parentUnit = orgUnits.find(p => p.id === u.szulo_id)
      const employeeCount = (allUsers as any[])?.filter(
        (user: any) => user.hr_szervezeti_egyseg_id === u.id
      ).length || 0

      const matchesSearch = !q ||
        u.nev?.toLowerCase().includes(q) ||
        (parentUnit?.nev && parentUnit.nev.toLowerCase().includes(q))

      const matchesStatus = orgStatusFilters.length === 0 || (
        (orgStatusFilters.includes("van_dolgozo") && employeeCount > 0) ||
        (orgStatusFilters.includes("ures") && employeeCount === 0)
      )

      const matchesHierarchy = orgHierarchyFilters.length === 0 || (
        (orgHierarchyFilters.includes("foegyseg") && !u.szulo_id) ||
        (orgHierarchyFilters.includes("alegyseg") && Boolean(u.szulo_id))
      )

      return matchesSearch && matchesStatus && matchesHierarchy
    })
  }, [orgUnits, orgSearch, orgStatusFilters, orgHierarchyFilters, allUsers])

  // ── Munkakör-katalógus TableToolbar állapotok ──
  const [jobColumns, setJobColumns] = useState<TableColumnOption[]>([
    { id: "megnevezes", label: "Munkakör Megnevezése", isVisible: true },
    { id: "feor", label: "FEOR", isVisible: true },
    { id: "szervezeti_egyseg", label: "Szervezeti Egység", isVisible: true },
    { id: "besorolas", label: "Besorolás", isVisible: true },
    { id: "betoltott", label: "Betöltött", isVisible: true },
    { id: "muveletek", label: "Műveletek", isVisible: true },
  ])
  const [jobOccupancyFilters, setJobOccupancyFilters] = useState<string[]>([])
  const [jobLevelFilters, setJobLevelFilters] = useState<string[]>([])
  const [jobOrgFilters, setJobOrgFilters] = useState<string[]>([])

  const toggleJobCol = (colId: string) => {
    setJobColumns(prev => prev.map(c => c.id === colId ? { ...c, isVisible: !c.isVisible } : c))
  }
  const isJobColVisible = (colId: string) => jobColumns.find(c => c.id === colId)?.isVisible ?? true

  const jobLevelOptions = useMemo(() => {
    const levels = new Set<string>()
    for (const j of dbJobs) {
      if (j.besorolasi_szint) levels.add(j.besorolasi_szint)
    }
    return Array.from(levels).sort((a, b) => a.localeCompare(b, "hu"))
  }, [dbJobs])

  const jobFilterGroups: FilterGroup[] = useMemo(() => [
    {
      id: "betoltottseg",
      title: "Betöltöttség",
      options: [
        { id: "betoltott", label: "Betöltött munkakör", checked: jobOccupancyFilters.includes("betoltott") },
        { id: "betoltetlen", label: "Betöltetlen (üres pozíció)", checked: jobOccupancyFilters.includes("betoltetlen") },
      ],
      onToggle: (id) => setJobOccupancyFilters(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]),
    },
    ...(jobLevelOptions.length > 0 ? [{
      id: "besorolas",
      title: "Besorolási Szint",
      options: jobLevelOptions.map(lvl => ({
        id: lvl,
        label: lvl,
        checked: jobLevelFilters.includes(lvl),
      })),
      onToggle: (id: string) => setJobLevelFilters(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]),
    }] : []),
    ...(orgUnits.length > 0 ? [{
      id: "szervezeti_egyseg",
      title: "Szervezeti Egység",
      options: orgUnits.map((u: any) => ({
        id: u.id,
        label: u.nev,
        checked: jobOrgFilters.includes(u.id),
      })),
      onToggle: (id: string) => setJobOrgFilters(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]),
    }] : []),
  ], [jobOccupancyFilters, jobLevelFilters, jobOrgFilters, jobLevelOptions, orgUnits])

  const jobActiveFilterCount = jobOccupancyFilters.length + jobLevelFilters.length + jobOrgFilters.length

  // Szűrt munkakörök
  const filteredJobs = useMemo(() => {
    const q = jobSearch.toLowerCase().trim()
    return dbJobs.filter(j => {
      const employeeCount = j.hr_beosztas?.filter((b: any) => b.ervenyes_ig === null).length || 0
      const unitName = orgUnits.find((u: any) => u.id === j.szervezeti_egyseg_id)?.nev || ""

      const matchesSearch = !q ||
        j.megnevezes?.toLowerCase().includes(q) ||
        (j.feor_kod && j.feor_kod.toLowerCase().includes(q)) ||
        unitName.toLowerCase().includes(q)

      const matchesOccupancy = jobOccupancyFilters.length === 0 || (
        (jobOccupancyFilters.includes("betoltott") && employeeCount > 0) ||
        (jobOccupancyFilters.includes("betoltetlen") && employeeCount === 0)
      )

      const matchesLevel = jobLevelFilters.length === 0 || jobLevelFilters.includes(j.besorolasi_szint || "")
      const matchesOrg = jobOrgFilters.length === 0 || jobOrgFilters.includes(j.szervezeti_egyseg_id || "")

      return matchesSearch && matchesOccupancy && matchesLevel && matchesOrg
    })
  }, [dbJobs, jobSearch, jobOccupancyFilters, jobLevelFilters, jobOrgFilters, orgUnits])

  return (
    <div className="space-y-6 pb-12">
      {/* Fejléc */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Szervezeti Felépítés</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            A vállalat szervezeti egységei, hierarchikus ábrája és munkakör-katalógusa.
          </p>
        </div>
      </div>

      {/* Fülek */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 mb-6">
          <TabsTrigger
            value="orgchart"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3"
          >
            Szervezeti Ábra
          </TabsTrigger>
          <TabsTrigger
            value="orgunits"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3 gap-2"
          >
            Szervezeti Egységek
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground tabular-nums">
              {orgUnits.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="jobs"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3 gap-2"
          >
            Munkakör-katalógus
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground tabular-nums">
              {dbJobs.length}
            </span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="permissions"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3 gap-2"
            >
              Jogosultságkezelő
              <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full font-medium">
                Admin
              </span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* 1. TAB: SZERVEZETI ÁBRA */}
        <TabsContent value="orgchart" className="space-y-4 outline-none">
          <Card className="border-border">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg font-semibold">
                Vállalati Hierarchia
              </CardTitle>
              <CardDescription>
                Interaktív vizuális fanézet a vezetők, beosztottak és szervezeti egységek kapcsolatáról.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 overflow-x-auto min-h-[450px]">
              <OrgChartTree rootUnits={rootOrgUnits} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. TAB: SZERVEZETI EGYSÉGEK */}
        <TabsContent value="orgunits" className="space-y-4 outline-none">
          <Card className="border-border">
            <CardHeader className="pb-4 border-b">
              <div>
                <CardTitle className="text-lg font-semibold">
                  Szervezeti Egységek
                </CardTitle>
                <CardDescription>
                  A vállalat felépítését alkotó divíziók, osztályok és részlegek kezelése.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-6 pt-3 pb-2">
                <TableToolbar
                  searchValue={orgSearch}
                  onSearchChange={setOrgSearch}
                  searchPlaceholder="Keresés szervezeti egységre vagy szülő egységre..."
                  columns={orgColumns}
                  onToggleColumn={toggleOrgCol}
                  filterGroups={orgFilterGroups}
                  activeFiltersCount={orgActiveFilterCount}
                  onClearFilters={() => {
                    setOrgStatusFilters([])
                    setOrgHierarchyFilters([])
                  }}
                />
              </div>
              <div className="overflow-x-auto">
                <Table className="compact-table">
                  <TableHeader>
                    <TableRow>
                      {isOrgColVisible("megnevezes") && <TableHead className="pl-6">Megnevezés</TableHead>}
                      {isOrgColVisible("szulo_egyseg") && <TableHead>Szülő egység</TableHead>}
                      {isOrgColVisible("dolgozok") && <TableHead className="text-center">Hozzárendelt dolgozók</TableHead>}
                      {isOrgColVisible("muveletek") && <TableHead className="text-right pr-6">Műveletek</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrgUnits && filteredOrgUnits.length > 0 ? (
                      filteredOrgUnits.map((unit) => {
                        const parentUnit = orgUnits.find(u => u.id === unit.szulo_id)
                        const employeeCount = (allUsers as any[])?.filter(
                          (u: any) => u.hr_szervezeti_egyseg_id === unit.id
                        ).length || 0

                        return (
                          <TableRow key={unit.id} className="hover:bg-muted/50 transition-colors">
                            {isOrgColVisible("megnevezes") && (
                              <TableCell className="pl-6 font-medium">
                                <Link href={`/hr/orgunit/${unit.id}`} className="hover:underline text-primary font-semibold">
                                  {unit.nev}
                                </Link>
                              </TableCell>
                            )}
                            {isOrgColVisible("szulo_egyseg") && (
                              <TableCell className="text-muted-foreground text-sm">
                                {parentUnit ? parentUnit.nev : "-"}
                              </TableCell>
                            )}
                            {isOrgColVisible("dolgozok") && (
                              <TableCell className="text-center">
                                {employeeCount > 0 ? (
                                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                    <span className="tabular-nums font-semibold">{employeeCount} fő</span>
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-muted-foreground font-normal">
                                    Nincs dolgozó
                                  </Badge>
                                )}
                              </TableCell>
                            )}
                            {isOrgColVisible("muveletek") && (
                              <TableCell className="text-right pr-6">
                                <OrgUnitActionMenu unit={unit} allUnits={orgUnits || []} />
                              </TableCell>
                            )}
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={orgColumns.filter(c => c.isVisible).length} className="text-center py-10 text-muted-foreground text-sm">
                          {orgSearch || orgActiveFilterCount > 0 ? "Nem található a szűrésnek megfelelő szervezeti egység." : "Még nincsenek szervezeti egységek létrehozva."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <div className="p-4 border-t bg-muted/5">
              <HrOrgUnitCreateDialog
                customTrigger={
                  <Button variant="outline" className="w-full border-dashed border-2 py-5 text-muted-foreground hover:text-foreground gap-2">
                    <Plus className="h-4 w-4" />
                    Új szervezeti egység létrehozása
                  </Button>
                }
              />
            </div>
          </Card>
        </TabsContent>

        {/* 3. TAB: MUNKAKÖR-KATALÓGUS */}
        <TabsContent value="jobs" className="space-y-4 outline-none">
          <Card className="border-border">
            <CardHeader className="pb-4 border-b">
              <div>
                <CardTitle className="text-lg font-semibold">
                  Nyilvántartott Munkakörök
                </CardTitle>
                <CardDescription>
                  Munkaköri leírások, FEOR besorolások és kompetenciák kezelése.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-6 pt-3 pb-2">
                <TableToolbar
                  searchValue={jobSearch}
                  onSearchChange={setJobSearch}
                  searchPlaceholder="Keresés munkakörre, FEOR-ra vagy részlegre..."
                  columns={jobColumns}
                  onToggleColumn={toggleJobCol}
                  filterGroups={jobFilterGroups}
                  activeFiltersCount={jobActiveFilterCount}
                  onClearFilters={() => {
                    setJobOccupancyFilters([])
                    setJobLevelFilters([])
                    setJobOrgFilters([])
                  }}
                />
              </div>
              <div className="overflow-x-auto">
                <Table className="compact-table">
                  <TableHeader>
                    <TableRow>
                      {isJobColVisible("megnevezes") && <TableHead className="pl-6">Munkakör Megnevezése</TableHead>}
                      {isJobColVisible("feor") && <TableHead>FEOR</TableHead>}
                      {isJobColVisible("szervezeti_egyseg") && <TableHead>Szervezeti Egység</TableHead>}
                      {isJobColVisible("besorolas") && <TableHead>Besorolás</TableHead>}
                      {isJobColVisible("betoltott") && <TableHead className="text-center">Betöltött</TableHead>}
                      {isJobColVisible("muveletek") && <TableHead className="text-right pr-6">Műveletek</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs && filteredJobs.length > 0 ? (
                      filteredJobs.map((job) => {
                        const employeeCount = job.hr_beosztas?.filter((b: any) => b.ervenyes_ig === null).length || 0
                        return (
                          <TableRow key={job.id} className="hover:bg-muted/50 transition-colors">
                            {isJobColVisible("megnevezes") && (
                              <TableCell className="pl-6 font-medium">
                                <Link href={`/hr/job/${job.id}`} className="hover:underline text-primary font-semibold">
                                  {job.megnevezes}
                                </Link>
                              </TableCell>
                            )}
                            {isJobColVisible("feor") && (
                              <TableCell className="text-muted-foreground tabular-nums text-sm">
                                {job.feor_kod || "-"}
                              </TableCell>
                            )}
                            {isJobColVisible("szervezeti_egyseg") && (
                              <TableCell className="text-muted-foreground text-sm">
                                {orgUnits.find((u: any) => u.id === job.szervezeti_egyseg_id)?.nev || (
                                  <span className="text-muted-foreground/60 italic text-xs">Nincs besorolva</span>
                                )}
                              </TableCell>
                            )}
                            {isJobColVisible("besorolas") && (
                              <TableCell>
                                <Badge variant="outline" className="text-xs font-normal text-muted-foreground bg-background">
                                  {job.besorolasi_szint || "-"}
                                </Badge>
                              </TableCell>
                            )}
                            {isJobColVisible("betoltott") && (
                              <TableCell className="text-center">
                                {employeeCount > 0 ? (
                                  <Badge variant="outline" className="bg-success-subtle text-success border-success/30 font-semibold">
                                    <span className="tabular-nums">{employeeCount} fő</span>
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-muted-foreground font-normal">
                                    Betöltetlen
                                  </Badge>
                                )}
                              </TableCell>
                            )}
                            {isJobColVisible("muveletek") && (
                              <TableCell className="text-right pr-6">
                                <JobActionMenu job={job} orgUnits={orgUnits} />
                              </TableCell>
                            )}
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={jobColumns.filter(c => c.isVisible).length} className="text-center py-10 text-muted-foreground text-sm">
                          {jobSearch || jobActiveFilterCount > 0 ? "Nem található a szűrésnek megfelelő munkakör." : "Még nincsenek munkakörök létrehozva."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <div className="p-4 border-t bg-muted/5">
              <JobCreateDialog
                orgUnits={orgUnits}
                customTrigger={
                  <Button variant="outline" className="w-full border-dashed border-2 py-5 text-muted-foreground hover:text-foreground gap-2">
                    <Plus className="h-4 w-4" />
                    Új munkakör létrehozása
                  </Button>
                }
              />
            </div>
          </Card>
        </TabsContent>

        {/* 4. TAB: JOGOSULTSÁGKEZELŐ MÁTRIX (KIZÁRÓLAG ADMIN SZÁMÁRA) */}
        {isAdmin && (
          <TabsContent value="permissions" className="space-y-4 outline-none">
            <PermissionsMatrixView
              initialEmployees={permissionEmployees}
              companyName={companyName}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
