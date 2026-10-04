"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { KpiCard } from "@/components/kpi-card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Dialog } from "@/components/ui/dialog"
import { 
  LayoutGrid, 
  List, 
  Search, 
  Calendar, 
  Users, 
  TrendingUp,
  FileText,
  Archive,
  ChevronRight,
  BarChart2,
  Clock,
  ShieldCheck,
  Briefcase
} from "lucide-react"
import { updateOffboardingDate } from "@/app/hr/offboarding/actions"
import { OffboardingCard } from "./offboarding-card"
import { OffboardingProfileModal } from "./offboarding-profile-modal"
import { ExitInterviewSummary } from "./exit-interview-summary"
import { toast } from "sonner"
import { type Employee, type OffboardingTask, type ExitInterview } from "@/types/hr"
import { TERMINATION_SHORT_LABELS, type TerminationType } from "@/utils/hr/termination-constants"

export { type OffboardingTask }

export interface OffboardingListItem {
  id: string
  dolgozo_id?: string
  felhasznalo_profil?: { 
    nev?: string | null
    munkakor?: string | null
    reszleg?: string | null
  } | null
  statusz: "folyamatban" | "lezart" | string
  utolso_munkanap?: string | null
  kilepes_datuma?: string | null
  megszunes_modja?: string | null
  reszleg?: string | null
  munkakor?: string | null
  szerzodes_pdf_url?: string | null
  eszkoz_elszamolas_pdf_url?: string | null
  t1041_nyugta_url?: string | null
  hr_offboarding_feladat?: OffboardingTask[]
  hr_kilepes_interju?: any[]
  [key: string]: any
}

interface OffboardingListProps {
  offboardings: OffboardingListItem[]
  employees: Employee[]
  exitInterviews?: ExitInterview[]
}

export function OffboardingList({ offboardings, employees, exitInterviews = [] }: OffboardingListProps) {
  const [activeTab, setActiveTab] = useState<string>("folyamatban")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [search, setSearch] = useState("")
  const [agreementFilter, setAgreementFilter] = useState<"all" | "missing" | "ready">("all")
  const [selectedOffboarding, setSelectedOffboarding] = useState<OffboardingListItem | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Csoportosítás státusz szerint
  const inProgressList = offboardings.filter((o) => o.statusz !== "lezart")
  const closedList = offboardings.filter((o) => o.statusz === "lezart")

  // Aktív lista a kiléptetésekhez
  const currentList = activeTab === "folyamatban" ? inProgressList : closedList

  // Szűrés kereső és megállapodás állapota alapján
  const filteredList = currentList.filter((o) => {
    const nev = o.felhasznalo_profil?.nev || (o as any).nev || ""
    const munkakor = o.munkakor || o.felhasznalo_profil?.munkakor || ""
    const matchesSearch =
      nev.toLowerCase().includes(search.toLowerCase()) ||
      munkakor.toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false

    const hasAgreement = Boolean(o.szerzodes_pdf_url)
    if (agreementFilter === "missing") return !hasAgreement
    if (agreementFilter === "ready") return hasAgreement

    return true
  })

  // Statisztikai KPI-k számítása (a folyamatban lévőkből)
  const totalActive = inProgressList.length
  const waitingTermination = inProgressList.filter((o) => !o.szerzodes_pdf_url).length

  // Közelgő kilépések (30 napon belül)
  const upcomingDepartures = inProgressList.filter((o) => {
    const exitDateStr = o.utolso_munkanap || o.kilepes_datuma
    if (!exitDateStr || exitDateStr === "Hamarosan") return false
    try {
      const exit = new Date(exitDateStr)
      const now = new Date()
      const diffDays = Math.round((exit.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 30
    } catch {
      return false
    }
  }).length

  // Átlagos előrehaladás
  const avgProgress = totalActive > 0
    ? Math.round(
        inProgressList.reduce((acc, curr) => {
          const tasks = curr.hr_offboarding_feladat || []
          const done = tasks.filter((t: OffboardingTask) => t.statusz === "done").length
          return acc + (tasks.length > 0 ? (done / tasks.length) * 100 : 0)
        }, 0) / totalActive
      )
    : 0

  const handleDateChange = async (id: string, newDate: string) => {
    if (!newDate) return
    const result = await updateOffboardingDate(id, newDate)
    if (result.error) toast.error(result.error)
    else toast.success("Utolsó munkanap sikeresen frissítve!")
  }

  return (
    <div className="space-y-6">
      {/* 1. Felső Statisztikai Sáv (KPI kártyák - EXACT match to Onboarding Image 1) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Aktív Kilépők"
          value={`${totalActive} fő`}
        />
        <KpiCard
          label="Megszüntetésre Vár"
          value={`${waitingTermination} fő`}
          highlight={waitingTermination > 0}
        />
        <KpiCard
          label="Hamarosan Távozik"
          value={`${upcomingDepartures} fő`}
        />
        <KpiCard
          label="Átlagos Haladás"
          value={`${avgProgress}%`}
        />
      </div>

      {/* 2. Füles Navigáció (Folyamatban lévő vs Lezárt vs Interjúk) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-3">
          <TabsList className="h-9">
            <TabsTrigger value="folyamatban" className="gap-2 text-xs">
              Folyamatban lévő kiléptetések
              {inProgressList.length > 0 && (
                <span className="ml-1 bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-primary/20">
                  {inProgressList.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="lezart" className="gap-2 text-xs">
              <Archive className="w-3.5 h-3.5" />
              Lezárt kiléptetések
              {closedList.length > 0 && (
                <span className="ml-1 bg-muted text-muted-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-full border">
                  {closedList.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="interju-osszesito" className="gap-2 text-xs">
              <BarChart2 className="w-3.5 h-3.5" />
              Kilépési Interjúk & HR Analytics
              {exitInterviews.length > 0 && (
                <span className="ml-1 bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-primary/20">
                  {exitInterviews.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Nézetváltó (csak kiléptetés taboknál) */}
          {activeTab !== "interju-osszesito" && (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="flex rounded-lg border bg-muted/40 p-0.5">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-7 px-2.5 text-xs gap-1.5"
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Kártyák
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-7 px-2.5 text-xs gap-1.5"
                >
                  <List className="w-3.5 h-3.5" /> Táblázat
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 3. Keresősáv és Szűrők (folyamatban / lezárt nézetnél) */}
        {activeTab !== "interju-osszesito" && (
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-card p-3 rounded-lg border">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Keresés név vagy munkakör alapján..."
                className="pl-8 h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-muted-foreground shrink-0 hidden md:inline">Megállapodás:</span>
              <div className="flex gap-1 flex-wrap">
                <Button
                  type="button"
                  variant={agreementFilter === "all" ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs px-2.5 rounded-full"
                  onClick={() => setAgreementFilter("all")}
                >
                  Mind
                </Button>
                <Button
                  type="button"
                  variant={agreementFilter === "missing" ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs px-2.5 rounded-full gap-1 text-warning"
                  onClick={() => setAgreementFilter("missing")}
                >
                  <Clock className="w-3 h-3" /> Megszüntetés hiányzik
                </Button>
                <Button
                  type="button"
                  variant={agreementFilter === "ready" ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs px-2.5 rounded-full gap-1 text-success"
                  onClick={() => setAgreementFilter("ready")}
                >
                  <ShieldCheck className="w-3 h-3" /> Beiktatva
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 4. Folyamatban lévő kiléptetések fül */}
        <TabsContent value="folyamatban" className="mt-0 outline-none">
          {filteredList.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed p-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 opacity-40" />
              </div>
              <p className="font-medium text-foreground">
                {search || agreementFilter !== "all" 
                  ? "Nincs a szűrésnek megfelelő kiléptetési folyamat." 
                  : "Jelenleg nincsenek aktív kiléptetési folyamatok."}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Új folyamat indításához kattints a jobb felső „Új kilépő hozzáadása” gombra.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredList.map((offboarding) => (
                <OffboardingCard key={offboarding.id} offboarding={offboarding} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-card overflow-x-auto">
              <Table className="compact-table">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Munkavállaló</TableHead>
                    <TableHead>Utolsó Munkanap</TableHead>
                    <TableHead>Megszűnés Módja</TableHead>
                    <TableHead className="w-[260px]">Előrehaladás</TableHead>
                    <TableHead className="w-[120px] text-right">Művelet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.map((person) => {
                    const tasks = person.hr_offboarding_feladat || []
                    const doneCount = tasks.filter((t) => t.statusz === "done").length
                    const totalCount = tasks.length
                    const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0
                    const employeeName = person.felhasznalo_profil?.nev || (person as any).nev || "Kilépő"
                    const munkakor = person.munkakor || person.felhasznalo_profil?.munkakor
                    const reszleg = person.reszleg || person.felhasznalo_profil?.reszleg

                    const termLabel = (person as any).megszunes_modja 
                       ? (TERMINATION_SHORT_LABELS[(person as any).megszunes_modja as TerminationType] || (person as any).megszunes_modja)
                      : "Közös megegyezés"

                    return (
                      <TableRow key={person.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="font-semibold text-sm text-foreground">{employeeName}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span>{munkakor || "Nincs megadva"}</span>
                            {reszleg && (
                              <>
                                <span className="opacity-40">•</span>
                                <span className="font-medium text-foreground/80">{reszleg}</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium tabular-nums">{person.utolso_munkanap || "Hamarosan"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-normal">
                            {termLabel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Progress value={progress} className="h-1.5 flex-1" />
                            <span className="text-xs font-semibold tabular-nums text-muted-foreground w-12 text-right">
                              {doneCount}/{totalCount}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-primary hover:text-primary/80 gap-1 text-xs font-medium cursor-pointer"
                            onClick={() => {
                              setSelectedOffboarding(person)
                              setModalOpen(true)
                            }}
                          >
                            Részletek <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* 5. Lezárt kiléptetések fül */}
        <TabsContent value="lezart" className="mt-0 outline-none">
          {filteredList.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed p-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Archive className="w-6 h-6 opacity-40" />
              </div>
              <p className="font-medium text-foreground">
                Még nincsenek lezárt és archivált kiléptetési folyamatok.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredList.map((offboarding) => (
                <OffboardingCard key={offboarding.id} offboarding={offboarding} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-card overflow-x-auto">
              <Table className="compact-table">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Munkavállaló</TableHead>
                    <TableHead>Utolsó Munkanap</TableHead>
                    <TableHead>Megszűnés Módja</TableHead>
                    <TableHead className="w-[260px]">Előrehaladás</TableHead>
                    <TableHead className="w-[120px] text-right">Művelet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.map((person) => {
                    const tasks = person.hr_offboarding_feladat || []
                    const doneCount = tasks.filter((t) => t.statusz === "done").length
                    const totalCount = tasks.length
                    const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0
                    const employeeName = person.felhasznalo_profil?.nev || (person as any).nev || "Kilépő"
                    const munkakor = person.munkakor || person.felhasznalo_profil?.munkakor
                    const reszleg = person.reszleg || person.felhasznalo_profil?.reszleg

                    const termLabel = (person as any).megszunes_modja 
                       ? (TERMINATION_SHORT_LABELS[(person as any).megszunes_modja as TerminationType] || (person as any).megszunes_modja)
                      : "Közös megegyezés"

                    return (
                      <TableRow key={person.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="font-semibold text-sm text-foreground">{employeeName}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span>{munkakor || "Nincs megadva"}</span>
                            {reszleg && (
                              <>
                                <span className="opacity-40">•</span>
                                <span className="font-medium text-foreground/80">{reszleg}</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium tabular-nums">{person.utolso_munkanap || "Hamarosan"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-normal">
                            {termLabel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Progress value={progress} className="h-1.5 flex-1" />
                            <span className="text-xs font-semibold tabular-nums text-muted-foreground w-12 text-right">
                              {doneCount}/{totalCount}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-primary hover:text-primary/80 gap-1 text-xs font-medium cursor-pointer"
                            onClick={() => {
                              setSelectedOffboarding(person)
                              setModalOpen(true)
                            }}
                          >
                            Részletek <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* 6. Kilépési Interjúk és HR Analytics fül */}
        <TabsContent value="interju-osszesito" className="mt-0 outline-none">
          <ExitInterviewSummary interviews={exitInterviews} />
        </TabsContent>
      </Tabs>

      {/* Modál a táblázat nézetben történő megnyitáshoz */}
      {selectedOffboarding && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <OffboardingProfileModal
            offboarding={selectedOffboarding}
            onDateChange={(newDate) => handleDateChange(selectedOffboarding.id, newDate)}
            onCloseDialog={() => setModalOpen(false)}
          />
        </Dialog>
      )}
    </div>
  )
}
