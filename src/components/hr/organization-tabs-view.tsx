"use client"

import { useState, useMemo } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Network, Building2, Briefcase, Search, Plus, Users } from "lucide-react"
import Link from "next/link"
import { OrgChartTree } from "@/components/hr/org-chart-tree"
import { type OrgUnitNode } from "@/lib/org-chart-utils"
import { JobActionMenu } from "@/components/hr/job-action-menu"
import { JobCreateDialog } from "@/components/hr/job-create-dialog"
import { OrgUnitActionMenu } from "@/components/hr/org-unit-action-menu"
import { HrOrgUnitCreateDialog } from "@/components/hr/org-unit-create-dialog"

interface OrganizationTabsViewProps {
  rootOrgUnits: OrgUnitNode[]
  orgUnits: any[]
  dbJobs: any[]
  allUsers: any[]
  defaultTab?: string
}

export function OrganizationTabsView({
  rootOrgUnits,
  orgUnits,
  dbJobs,
  allUsers,
  defaultTab = "orgchart"
}: OrganizationTabsViewProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [orgSearch, setOrgSearch] = useState("")
  const [jobSearch, setJobSearch] = useState("")

  // Szűrt szervezeti egységek
  const filteredOrgUnits = useMemo(() => {
    if (!orgSearch.trim()) return orgUnits
    const q = orgSearch.toLowerCase().trim()
    return orgUnits.filter(u => u.nev?.toLowerCase().includes(q))
  }, [orgUnits, orgSearch])

  // Szűrt munkakörök
  const filteredJobs = useMemo(() => {
    if (!jobSearch.trim()) return dbJobs
    const q = jobSearch.toLowerCase().trim()
    return dbJobs.filter(j => 
      j.megnevezes?.toLowerCase().includes(q) || 
      (j.feor_kod && j.feor_kod.toLowerCase().includes(q))
    )
  }, [dbJobs, jobSearch])

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
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3 gap-2"
          >
            <Network className="w-4 h-4" />
            Szervezeti Ábra
          </TabsTrigger>
          <TabsTrigger
            value="orgunits"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3 gap-2"
          >
            <Building2 className="w-4 h-4" />
            Szervezeti Egységek
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground tabular-nums">
              {orgUnits.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="jobs"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-6 py-3 gap-2"
          >
            <Briefcase className="w-4 h-4" />
            Munkakör-katalógus
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground tabular-nums">
              {dbJobs.length}
            </span>
          </TabsTrigger>
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
            <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">
                  Szervezeti Egységek
                </CardTitle>
                <CardDescription>
                  A vállalat felépítését alkotó divíziók, osztályok és részlegek kezelése.
                </CardDescription>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Keresés szervezeti egységre..."
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="compact-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Megnevezés</TableHead>
                      <TableHead>Szülő egység</TableHead>
                      <TableHead className="text-center">Hozzárendelt dolgozók</TableHead>
                      <TableHead className="text-right pr-6">Műveletek</TableHead>
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
                            <TableCell className="pl-6 font-medium">
                              <Link href={`/hr/orgunit/${unit.id}`} className="hover:underline text-primary font-semibold">
                                {unit.nev}
                              </Link>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {parentUnit ? parentUnit.nev : "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              {employeeCount > 0 ? (
                                <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/20">
                                  <Users className="w-3 h-3" /> <span className="tabular-nums font-semibold">{employeeCount} fő</span>
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1 text-muted-foreground font-normal">
                                  Nincs dolgozó
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <OrgUnitActionMenu unit={unit} allUnits={orgUnits || []} />
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-sm">
                          {orgSearch ? "Nem található a keresésnek megfelelő szervezeti egység." : "Még nincsenek szervezeti egységek létrehozva."}
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
            <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">
                  Nyilvántartott Munkakörök
                </CardTitle>
                <CardDescription>
                  Munkaköri leírások, FEOR besorolások és kompetenciák kezelése.
                </CardDescription>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Keresés munkakörre vagy FEOR-ra..."
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="compact-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Munkakör Megnevezése</TableHead>
                      <TableHead>FEOR</TableHead>
                      <TableHead>Szervezeti Egység</TableHead>
                      <TableHead>Besorolás</TableHead>
                      <TableHead className="text-center">Betöltött</TableHead>
                      <TableHead className="text-right pr-6">Műveletek</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs && filteredJobs.length > 0 ? (
                      filteredJobs.map((job) => {
                        const employeeCount = job.hr_beosztas?.filter((b: any) => b.ervenyes_ig === null).length || 0
                        return (
                          <TableRow key={job.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="pl-6 font-medium">
                              <Link href={`/hr/job/${job.id}`} className="hover:underline text-primary font-semibold">
                                {job.megnevezes}
                              </Link>
                            </TableCell>
                            <TableCell className="text-muted-foreground tabular-nums text-sm">
                              {job.feor_kod || "-"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {orgUnits.find((u: any) => u.id === job.szervezeti_egyseg_id)?.nev || (
                                <span className="text-muted-foreground/60 italic text-xs">Nincs besorolva</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs font-normal text-muted-foreground bg-background">
                                {job.besorolasi_szint || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {employeeCount > 0 ? (
                                <Badge variant="outline" className="gap-1 bg-success-subtle text-success border-success/30 font-semibold">
                                  <Users className="w-3 h-3" /> <span className="tabular-nums">{employeeCount} fő</span>
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1 text-muted-foreground font-normal">
                                  Betöltetlen
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <JobActionMenu job={job} orgUnits={orgUnits} />
                            </TableCell>
                          </TableRow>
                        )
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                          {jobSearch ? "Nem található a keresésnek megfelelő munkakör." : "Még nincsenek munkakörök létrehozva."}
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
      </Tabs>
    </div>
  )
}
