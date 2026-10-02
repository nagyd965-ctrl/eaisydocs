"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { KpiCard } from "@/components/kpi-card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { 
  LayoutGrid, 
  List, 
  Search, 
  UserCheck, 
  UserPlus, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  Users, 
  TrendingUp,
  AlertCircle,
  Archive,
  ChevronRight
} from "lucide-react"
import { updateOnboardingDate } from "@/app/hr/onboarding/actions"
import { OnboardingCard } from "./onboarding-card"
import { OnboardingProfileModal } from "./onboarding-profile-modal"
import type { OrgUnitOption, JobOption } from "@/app/hr/actions/job-org-actions"
import { toast } from "sonner"
import { type OnboardingProfile, type OnboardingTask } from "@/types/hr"

interface OnboardingListProps {
  onboardings: OnboardingProfile[]
  orgUnits?: OrgUnitOption[]
  jobs?: JobOption[]
}

export function OnboardingList({ onboardings, orgUnits, jobs }: OnboardingListProps) {
  const [activeTab, setActiveTab] = useState<string>("folyamatban")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [search, setSearch] = useState("")
  const [accountFilter, setAccountFilter] = useState<"all" | "varakozik" | "aktivalva">("all")
  const [selectedOnboarding, setSelectedOnboarding] = useState<OnboardingProfile | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Csoportosítás státusz szerint
  const inProgressList = onboardings.filter((o) => o.statusz !== "lezart")
  const closedList = onboardings.filter((o) => o.statusz === "lezart")

  // Aktív lista kiválasztása a fül alapján
  const currentList = activeTab === "folyamatban" ? inProgressList : closedList

  // Szűrés kereső és fiókállapot alapján
  const filteredList = currentList.filter((o) => {
    const matchesSearch =
      o.nev.toLowerCase().includes(search.toLowerCase()) ||
      (o.munkakor?.toLowerCase() || "").includes(search.toLowerCase())

    if (!matchesSearch) return false

    if (accountFilter === "varakozik") {
      return o.fiok_allapot !== "aktivalva" && !o.dolgozo_id
    }
    if (accountFilter === "aktivalva") {
      return o.fiok_allapot === "aktivalva" || Boolean(o.dolgozo_id)
    }

    return true
  })

  // Statisztikai KPI-k számítása (a folyamatban lévőkből)
  const totalActive = inProgressList.length
  const waitingForAccount = inProgressList.filter((o) => o.fiok_allapot !== "aktivalva" && !o.dolgozo_id).length
  const activeAccounts = inProgressList.filter((o) => o.fiok_allapot === "aktivalva" || Boolean(o.dolgozo_id)).length

  // Közelgő belépések (30 napon belül)
  const upcomingCount = inProgressList.filter((o) => {
    if (!o.belepes_datuma || o.belepes_datuma === "Hamarosan") return false
    try {
      const entry = new Date(o.belepes_datuma)
      const now = new Date()
      const diffDays = Math.round((entry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 30
    } catch {
      return false
    }
  }).length

  // Átlagos előrehaladás
  const avgProgress = totalActive > 0
    ? Math.round(
        inProgressList.reduce((acc, curr) => {
          const tasks = curr.hr_onboarding_feladat || curr.tasks || []
          const done = tasks.filter((t: OnboardingTask) => t.statusz === "done").length
          return acc + (tasks.length > 0 ? (done / tasks.length) * 100 : 0)
        }, 0) / totalActive
      )
    : 0

  const handleDateChange = async (id: string, newDate: string) => {
    if (!newDate) return
    const result = await updateOnboardingDate(id, newDate)
    if (result.error) toast.error(result.error)
    else toast.success("Dátum sikeresen frissítve!")
  }

  return (
    <div className="space-y-6">
      {/* 1. Felső Statisztikai Sáv (KPI kártyák) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Aktív Belépők"
          value={`${totalActive} fő`}
        />
        <KpiCard
          label="Aktiválásra Vár"
          value={`${waitingForAccount} fő`}
          highlight={waitingForAccount > 0}
        />
        <KpiCard
          label="Hamarosan Kezd"
          value={`${upcomingCount} fő`}
        />
        <KpiCard
          label="Átlagos Haladás"
          value={`${avgProgress}%`}
        />
      </div>

      {/* 2. Füles Navigáció (Folyamatban lévő vs Lezárt) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-3">
          <TabsList className="h-9">
            <TabsTrigger value="folyamatban" className="gap-2 text-xs">
              Folyamatban lévő beléptetések
              {inProgressList.length > 0 && (
                <span className="ml-1 bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-primary/20">
                  {inProgressList.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="lezart" className="gap-2 text-xs">
              <Archive className="w-3.5 h-3.5" />
              Lezárt beléptetések
              {closedList.length > 0 && (
                <span className="ml-1 bg-muted text-muted-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-full border">
                  {closedList.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Nézetváltó és Gyors Szűrők */}
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
        </div>

        {/* 3. Keresősáv és Fiók Szűrő */}
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
            <span className="text-xs text-muted-foreground shrink-0 hidden md:inline">Fiók állapot:</span>
            <div className="flex gap-1 flex-wrap">
              <Button
                type="button"
                variant={accountFilter === "all" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs px-2.5 rounded-full"
                onClick={() => setAccountFilter("all")}
              >
                Mind
              </Button>
              <Button
                type="button"
                variant={accountFilter === "varakozik" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs px-2.5 rounded-full gap-1 text-amber-600 dark:text-amber-400"
                onClick={() => setAccountFilter("varakozik")}
              >
                <Clock className="w-3 h-3" /> Aktiválásra vár
              </Button>
              <Button
                type="button"
                variant={accountFilter === "aktivalva" ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs px-2.5 rounded-full gap-1 text-emerald-600"
                onClick={() => setAccountFilter("aktivalva")}
              >
                <UserCheck className="w-3 h-3" /> Fiók aktív
              </Button>
            </div>
          </div>
        </div>

        {/* 4. Tartalom (Folyamatban lévő vagy Lezárt) */}
        <TabsContent value={activeTab} className="mt-0 outline-none">
          {filteredList.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed p-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 opacity-40" />
              </div>
              <p className="font-medium text-foreground">
                {search || accountFilter !== "all" 
                  ? "Nincs a szűrésnek megfelelő beléptetési folyamat." 
                  : activeTab === "folyamatban" 
                    ? "Jelenleg nincsenek aktív beléptetési folyamatok." 
                    : "Még nincsenek lezárt beléptetési folyamatok."}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                {activeTab === "folyamatban" && (
                  "Amikor a toborzási kanban táblán elfogadtok egy jelöltet, automatikusan létrejön az előkészületi Onboarding profilja."
                )}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredList.map((person) => (
                <OnboardingCard key={person.id} onboarding={person} orgUnits={orgUnits} jobs={jobs} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border overflow-x-auto bg-card shadow-xs">
              <Table className="min-w-[850px]">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead>Munkavállaló</TableHead>
                    <TableHead>Belépés Dátuma</TableHead>
                    <TableHead>eaisyHR Fiók</TableHead>
                    <TableHead className="w-[260px]">Előrehaladás</TableHead>
                    <TableHead className="w-[120px] text-right">Művelet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.map((person) => {
                    const tasks = person.hr_onboarding_feladat || person.tasks || []
                    const doneCount = tasks.filter((t) => t.statusz === "done").length
                    const totalCount = tasks.length
                    const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0
                    const isAccountActive = person.fiok_allapot === "aktivalva" || Boolean(person.dolgozo_id)

                    return (
                      <TableRow key={person.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="font-semibold text-sm text-foreground">{person.nev}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span>{person.munkakor || "Nincs megadva"}</span>
                            {person.reszleg && (
                              <>
                                <span className="opacity-40">•</span>
                                <span className="font-medium text-foreground/80">{person.reszleg}</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{person.belepes_datuma || "Hamarosan"}</span>
                        </TableCell>
                        <TableCell>
                          {isAccountActive ? (
                            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 font-medium">
                              <UserCheck className="w-3 h-3" /> Fiók aktív
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 gap-1 font-medium">
                              <Clock className="w-3 h-3" /> Aktiválásra vár
                            </Badge>
                          )}
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
                            className="text-primary hover:text-primary/80 gap-1 text-xs font-medium"
                            onClick={() => {
                              setSelectedOnboarding(person)
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
      </Tabs>

      {/* Modál a táblázat nézetben történő megnyitáshoz */}
      {selectedOnboarding && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <OnboardingProfileModal
            onboarding={selectedOnboarding}
            orgUnits={orgUnits}
            jobs={jobs}
            onDateChange={(newDate) => handleDateChange(selectedOnboarding.id, newDate)}
            onCloseDialog={() => setModalOpen(false)}
          />
        </Dialog>
      )}
    </div>
  )
}
