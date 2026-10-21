"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EditKpiDialog } from "@/components/hr/edit-kpi-dialog"
import { AddKpiDialog } from "@/components/hr/add-kpi-dialog"
import { KpiWorkflowStepper, deriveWorkflowPhase } from "@/components/hr/kpi-workflow-stepper"
import { TableToolbar, type FilterGroup } from "@/components/table-toolbar/table-toolbar"
import { cn } from "@/lib/utils"
import { 
  Target, 
  MessageSquare, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  User, 
  CalendarCheck, 
  Lock, 
  Award, 
  Plus, 
  History, 
  Workflow, 
  CheckCircle2, 
  Clock,
  Sparkles
} from "lucide-react"
import { type KpiCatalogueItem, type PerformanceCycle, type PerformanceKpi } from "@/types/hr"

export interface PerformanceEmployee {
  id: string
  felhasznalo_profil?: any
  hr_jogviszony?: any
  kpis?: PerformanceKpi[]
  [key: string]: any
}

function getEmployeeWorkflowStatusBadge(kpis: any[]) {
  if (!kpis || kpis.length === 0) {
    return (
      <Badge variant="outline" className="text-xs bg-muted/40 text-muted-foreground border-border font-medium">
        Nincs célkitűzés
      </Badge>
    )
  }

  const allClosed = kpis.every(k => deriveWorkflowPhase(k) === "lezart")
  if (allClosed) {
    return (
      <Badge variant="outline" className="text-xs bg-success/15 text-success border-success/30 font-semibold flex items-center gap-1.5 px-3 py-1.5">
        <CheckCircle2 className="w-3.5 h-3.5" /> 5. Minden cél lezárva
      </Badge>
    )
  }

  const hasNeedsManagerEval = kpis.some(k => deriveWorkflowPhase(k) === "onertekeles")
  if (hasNeedsManagerEval) {
    return (
      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold flex items-center gap-1.5 px-3 py-1.5 animate-pulse">
        <Clock className="w-3.5 h-3.5" /> 3. Vezetői értékelésre vár
      </Badge>
    )
  }

  const hasPendingSelfEval = kpis.some(k => deriveWorkflowPhase(k) === "celkituzes")
  if (hasPendingSelfEval) {
    return (
      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-medium flex items-center gap-1.5 px-3 py-1.5">
        <User className="w-3.5 h-3.5" /> 2. Önértékelésre vár
      </Badge>
    )
  }

  const hasMeeting = kpis.some(k => deriveWorkflowPhase(k) === "vezetoi_ertekeles")
  if (hasMeeting) {
    return (
      <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-medium flex items-center gap-1.5 px-3 py-1.5">
        <CalendarCheck className="w-3.5 h-3.5" /> 4. 1-on-1 Megbeszélésre vár
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="text-xs bg-muted/50 text-muted-foreground border-border font-medium px-3 py-1.5">
      1. Célkitűzés aktív
    </Badge>
  )
}

function getPhaseBadge(phase: string) {
  switch (phase) {
    case "celkituzes":
      return (
        <Badge variant="outline" className="text-xs py-1 px-2.5 bg-muted/40 text-muted-foreground border-border font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          1. Célkitűzés (Önértékelésre vár)
        </Badge>
      )
    case "onertekeles":
      return (
        <Badge variant="outline" className="text-xs py-1 px-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          2. Önértékelés leadva (Vezetői értékelésre vár)
        </Badge>
      )
    case "vezetoi_ertekeles":
      return (
        <Badge variant="outline" className="text-xs py-1 px-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-semibold flex items-center gap-1.5">
          <CalendarCheck className="w-3.5 h-3.5" />
          3. Vezető értékelt (1-on-1 Megbeszélés előtt)
        </Badge>
      )
    case "megbeszeles":
      return (
        <Badge variant="outline" className="text-xs py-1 px-2.5 bg-primary/10 text-primary border-primary/30 font-semibold flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          4. Megbeszélés megtörtént (Zárásra kész)
        </Badge>
      )
    case "lezart":
      return (
        <Badge variant="outline" className="text-xs py-1 px-2.5 bg-success/15 text-success border-success/30 font-semibold flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          5. Hitelesítve és Lezárva
        </Badge>
      )
    default:
      return null
  }
}

export function PerformanceList({ 
  employees, 
  kpis, 
  logs = [], 
  cycles = [], 
  allKpis = [],
  catalogue = []
}: { 
  employees: PerformanceEmployee[]
  kpis: PerformanceKpi[]
  logs?: any[]
  cycles?: PerformanceCycle[]
  allKpis?: PerformanceKpi[]
  catalogue?: KpiCatalogueItem[]
}) {
  const [searchValue, setSearchValue] = useState("")
  const [selectedCycleIds, setSelectedCycleIds] = useState<string[]>([])
  const [selectedPhases, setSelectedPhases] = useState<string[]>([])
  const [editKpiId, setEditKpiId] = useState<string | null>(null)
  const [manualEvalOpenId, setManualEvalOpenId] = useState<string | null>(null)

  // Szűrőcsoportok a TableToolbar-hoz
  const filterGroups: FilterGroup[] = useMemo(() => {
    return [
      {
        id: "cycles",
        title: "Értékelési Ciklus",
        options: cycles.map(c => ({
          id: c.id,
          label: `${c.megnevezes} (${c.statusz})`,
          checked: selectedCycleIds.includes(c.id)
        })),
        onToggle: (optionId: string) => {
          setSelectedCycleIds(prev => 
            prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
          )
        }
      },
      {
        id: "phases",
        title: "Folyamat Lépése",
        options: [
          { id: "celkituzes", label: "1. Célkitűzés (Önértékelésre vár)", checked: selectedPhases.includes("celkituzes") },
          { id: "onertekeles", label: "2. Önértékelés leadva", checked: selectedPhases.includes("onertekeles") },
          { id: "vezetoi_ertekeles", label: "3. Vezetői értékelésre vár", checked: selectedPhases.includes("vezetoi_ertekeles") },
          { id: "megbeszeles", label: "4. 1-on-1 Megbeszélés", checked: selectedPhases.includes("megbeszeles") },
          { id: "lezart", label: "5. Lezárva", checked: selectedPhases.includes("lezart") }
        ],
        onToggle: (optionId: string) => {
          setSelectedPhases(prev => 
            prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
          )
        }
      }
    ]
  }, [cycles, selectedCycleIds, selectedPhases])

  const activeFiltersCount = selectedCycleIds.length + selectedPhases.length

  const handleResetFilters = () => {
    setSelectedCycleIds([])
    setSelectedPhases([])
    setSearchValue("")
  }

  // Szűrés a dolgozókra és célokra
  const filteredEmployees = useMemo(() => {
    return employees
      .map(emp => {
        const empKpis = kpis.filter(k => k.dolgozo_id === emp.id)
        const profil = Array.isArray(emp.felhasznalo_profil) ? emp.felhasznalo_profil[0] : emp.felhasznalo_profil
        const nev = profil?.nev || emp.nev || "Névtelen dolgozó"

        const activeJogviszony = Array.isArray(emp.hr_jogviszony) ? emp.hr_jogviszony[0] : emp.hr_jogviszony
        const allBeosztas = activeJogviszony?.hr_beosztas
        const activeBeosztas = Array.isArray(allBeosztas) 
          ? allBeosztas.find((b: any) => b.ervenyes_ig === null) || allBeosztas[0]
          : allBeosztas
        const munkakor = activeBeosztas?.hr_munkakor?.megnevezes || ""

        // Szűrés a KPI-okra ciklus és fázis alapján
        const matchingKpis = empKpis.filter(k => {
          if (selectedCycleIds.length > 0 && (!k.ciklus_id || !selectedCycleIds.includes(k.ciklus_id))) {
            return false
          }
          if (selectedPhases.length > 0) {
            const phase = deriveWorkflowPhase(k)
            if (!selectedPhases.includes(phase)) return false
          }
          return true
        })

        // Kereső szűrés (név, beosztás vagy KPI cím)
        if (searchValue.trim()) {
          const q = searchValue.toLowerCase()
          const nameMatch = nev.toLowerCase().includes(q)
          const roleMatch = munkakor.toLowerCase().includes(q)
          const kpiMatch = matchingKpis.some(k => (k.celkituzes || k.megnevezes || "").toLowerCase().includes(q))
          if (!nameMatch && !roleMatch && !kpiMatch) {
            return null
          }
        }

        return {
          ...emp,
          kpis: matchingKpis
        }
      })
      .filter((emp): emp is PerformanceEmployee & { kpis: PerformanceKpi[] } => emp !== null && emp.kpis.length > 0)
  }, [employees, kpis, searchValue, selectedCycleIds, selectedPhases])

  return (
    <div className="space-y-6">
      {/* Kanonikus TableToolbar keresővel és szűréssel */}
      <TableToolbar
        searchPlaceholder="Keresés dolgozó neve, beosztása vagy célkitűzés címe alapján..."
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        filterGroups={filterGroups}
        activeFiltersCount={activeFiltersCount}
        onClearFilters={handleResetFilters}
      />

      {filteredEmployees.length === 0 ? (
        <Card className="border border-dashed shadow-xs">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">Nincs találat a megadott szűrésre</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Próbálj meg módosítani a keresési feltételeken, vagy állítsd alaphelyzetbe a szűrőket.
            </p>
            <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2">
              Szűrők törlése
            </Button>
          </CardContent>
        </Card>
      ) : (
        filteredEmployees.map((emp) => {
          const profil = Array.isArray(emp.felhasznalo_profil) ? emp.felhasznalo_profil[0] : emp.felhasznalo_profil
          const nev = profil?.nev || emp.nev || "Névtelen dolgozó"
          const initials = nev.substring(0, 2).toUpperCase()
          const closedCount = emp.kpis.filter(k => deriveWorkflowPhase(k) === "lezart").length

          const activeJogviszony = Array.isArray(emp.hr_jogviszony) ? emp.hr_jogviszony[0] : emp.hr_jogviszony
          const allBeosztas = activeJogviszony?.hr_beosztas
          const activeBeosztas = Array.isArray(allBeosztas)
            ? allBeosztas.find((b: any) => b.ervenyes_ig === null) || allBeosztas[0]
            : allBeosztas
          const munkakor = activeBeosztas?.hr_munkakor?.megnevezes || "Nincs munkakör"

          return (
            <Card key={emp.id} className="overflow-hidden transition-all hover:border-primary/40 border shadow-xs">
              <CardHeader className="bg-muted/20 border-b pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border border-border">
                      <AvatarImage src={emp.felhasznalo_profil?.avatar_url || ""} alt={nev} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-semibold">{nev}</CardTitle>
                        <Badge variant="outline" className="text-xs font-normal">
                          {munkakor}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {closedCount}/{emp.kpis.length} cél lezárva
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          Összesen {emp.kpis.length} kitűzött KPI
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Jobb oldal: Emberi státusz jelvény (NINCS % és progress bar!) */}
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-muted-foreground uppercase mb-0.5 tracking-wider">
                        Értékelési Folyamat
                      </p>
                      <p className="text-xs font-semibold text-foreground">
                        {closedCount === emp.kpis.length && emp.kpis.length > 0
                          ? "Minden cél lezárva"
                          : `${closedCount}/${emp.kpis.length} lezárva`}
                      </p>
                    </div>
                    {getEmployeeWorkflowStatusBadge(emp.kpis)}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-3 sm:p-4 space-y-3">
                <Accordion type="multiple" className="w-full space-y-3">
                  {emp.kpis.map((kpi: any) => {
                    const phase = deriveWorkflowPhase(kpi)

                    return (
                      <AccordionItem 
                        key={kpi.id} 
                        value={kpi.id} 
                        className="border rounded-xl bg-card overflow-hidden transition-all hover:border-primary/40 relative shadow-2xs"
                      >
                        <div className="flex items-center">
                          <AccordionTrigger className="hover:no-underline p-3.5 sm:p-4 hover:bg-muted/15 transition-colors cursor-pointer w-full text-left">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full pr-12">
                              {/* Bal oldal: Ikon + Cél címe + Meta Tag-ek */}
                              <div className="flex items-start sm:items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                                  <Target className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                    {kpi.celkituzes}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                    <span className="text-[11px] text-muted-foreground font-medium">
                                      {kpi.hr_teljesitmeny_ciklus?.megnevezes || kpi.ertekelt_idoszak || "Ciklus"}
                                    </span>
                                    {kpi.sulyozas && (
                                      <>
                                        <span className="text-[11px] text-muted-foreground">•</span>
                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal tabular-nums text-muted-foreground">
                                          Súly: {kpi.sulyozas}x
                                        </Badge>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Jobb oldal: Csak a tiszta Lépés Jelvény (NINCS % és progress bar!) */}
                              <div className="flex items-center gap-3 shrink-0">
                                {getPhaseBadge(phase)}
                              </div>
                            </div>
                          </AccordionTrigger>

                          {/* Külön lebegő gomb jobb oldalon a 3-dots műveletekhez */}
                          <div className="absolute right-3 top-3 sm:top-3.5 z-10" onClick={(e) => e.stopPropagation()}>
                            <AlertDialog>
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60" />
                                  }
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={() => setEditKpiId(kpi.id)}>
                                    <Edit className="h-4 w-4 mr-2" /> Szerkesztés
                                  </DropdownMenuItem>
                                  <AlertDialogTrigger
                                    render={
                                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                                        <Trash2 className="h-4 w-4 mr-2" /> Törlés
                                      </DropdownMenuItem>
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Törlés
                                  </AlertDialogTrigger>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Biztosan törölni szeretnéd ezt a célkitűzést?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Ez a művelet nem vonható vissza. A KPI véglegesen törlődik a rendszerből.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Mégse</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={async () => {
                                      const { deleteKpi } = await import("@/app/hr/performance/actions")
                                      const res = await deleteKpi(kpi.id)
                                      if (res?.error) toast.error(res.error)
                                      else toast.success("Célkitűzés sikeresen törölve!")
                                    }}
                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                  >
                                    Törlés
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>

                        {/* Részletes Munkaterület (Expanded State) */}
                        <AccordionContent className="p-0 border-t bg-muted/5">
                          <div className="p-4 sm:p-6 space-y-6">

                            {/* Felső Fáziskövető Kártya (Linear Stepper) */}
                            <div className="p-4 rounded-xl border bg-card shadow-2xs">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b mb-3">
                                <div className="flex items-center gap-2">
                                  <Workflow className="w-4 h-4 text-primary" />
                                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Értékelési Folyamat Lépései
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {phase === "celkituzes" && "1. Lépés: Célkitűzés aktív — várakozás a dolgozói önértékelésre"}
                                  {phase === "onertekeles" && "2. Lépés: Dolgozói önértékelés beérkezett — vezetői értékelés szükséges"}
                                  {phase === "vezetoi_ertekeles" && "3. Lépés: Vezetői értékelés rögzítve — 1-on-1 megbeszélés következik"}
                                  {phase === "megbeszeles" && "4. Lépés: Megbeszélés megtörtént — cél lezárásra kész"}
                                  {phase === "lezart" && "5. Lépés: Célkitűzés lezárva és hitelesítve a bónuszelszámoláshoz"}
                                </span>
                              </div>
                              <KpiWorkflowStepper currentPhase={phase} />
                            </div>

                            {/* 2 Oszlopos Rendszer: Balra A Folyamat Mérföldkövei & Eseményei, Jobbra Aktuális Vezetői Műveletek */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                              {/* BAL OLDAL (7 oszlop): Célkitűzés állapota, önértékelés, vezetői értékelés és előzmények */}
                              <div className="lg:col-span-7 space-y-5">
                                
                                {/* Folyamat Mérföldkövei Kártya (NEM %-os, hanem tiszta lépéskártyák!) */}
                                <div className="p-4 rounded-xl border bg-card shadow-2xs space-y-3.5">
                                  <div className="flex items-center justify-between pb-2 border-b">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                      <Target className="w-4 h-4 text-primary" />
                                      Célkitűzés és Mérföldkövek
                                    </span>
                                    {kpi.sulyozas && (
                                      <Badge variant="outline" className="text-xs tabular-nums text-muted-foreground font-normal">
                                        Súlyozás: {kpi.sulyozas}x
                                      </Badge>
                                    )}
                                  </div>

                                  {/* 1. Lépés: Rögzítés */}
                                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-muted/50 text-xs">
                                    <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                      <Target className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-semibold text-foreground">1. Célkitűzés Rögzítve</span>
                                        <span className="text-[11px] text-muted-foreground">
                                          {kpi.created_at ? new Date(kpi.created_at).toLocaleDateString("hu-HU") : ""}
                                        </span>
                                      </div>
                                      <p className="text-muted-foreground mt-0.5">
                                        Ciklus: {kpi.hr_teljesitmeny_ciklus?.megnevezes || "Aktív időszak"}
                                      </p>
                                    </div>
                                  </div>

                                  {/* 2. Lépés: Dolgozói Önértékelés */}
                                  {kpi.onertekeles_szovege ? (
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs">
                                      <div className="w-7 h-7 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                                        <User className="w-3.5 h-3.5" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-semibold text-blue-600 dark:text-blue-400">2. Dolgozói Önértékelés</span>
                                          <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                                            Leadva
                                          </Badge>
                                        </div>
                                        <p className="text-foreground mt-1.5 bg-background p-2.5 rounded border border-blue-500/10 leading-relaxed italic">
                                          „{kpi.onertekeles_szovege}”
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 border border-dashed border-border text-xs text-muted-foreground">
                                      <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                                        <User className="w-3.5 h-3.5" />
                                      </div>
                                      <div className="flex-1">
                                        <span className="font-medium text-foreground">2. Dolgozói Önértékelés:</span> Várakozás a munkatárs visszajelzésére a Dolgozói Portálról.
                                      </div>
                                    </div>
                                  )}

                                  {/* 3. Lépés: Vezetői Értékelés */}
                                  {kpi.ertekeles_szovege ? (
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                                      <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                        <Award className="w-3.5 h-3.5" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-semibold text-primary">3. Vezetői Értékelés</span>
                                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                                            Rögzítve
                                          </Badge>
                                        </div>
                                        <p className="text-foreground mt-1.5 bg-background p-2.5 rounded border border-primary/10 leading-relaxed">
                                          „{kpi.ertekeles_szovege}”
                                        </p>
                                      </div>
                                    </div>
                                  ) : phase !== "celkituzes" && (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 border border-dashed border-border text-xs text-muted-foreground">
                                      <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                                        <Award className="w-3.5 h-3.5" />
                                      </div>
                                      <div className="flex-1">
                                        <span className="font-medium text-foreground">3. Vezetői Értékelés:</span> Még nincs rögzítve.
                                      </div>
                                    </div>
                                  )}

                                  {/* 4. Lépés: 1-on-1 Megbeszélés */}
                                  {kpi.megbeszeles_datum && (
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 text-xs">
                                      <div className="w-7 h-7 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                                        <CalendarCheck className="w-3.5 h-3.5" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-semibold text-purple-600 dark:text-purple-400">4. 1-on-1 Megbeszélés Megtörtént</span>
                                          <span className="text-[11px] text-muted-foreground">{new Date(kpi.megbeszeles_datum).toLocaleDateString("hu-HU")}</span>
                                        </div>
                                        {kpi.megbeszeles_megjegyzes && (
                                          <p className="text-muted-foreground mt-1.5 bg-background p-2 rounded border border-border leading-relaxed">
                                            {kpi.megbeszeles_megjegyzes}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Tevékenységek & Előzmények Kártya */}
                                <div className="p-4 rounded-xl border bg-card shadow-2xs space-y-3">
                                  <div className="flex items-center justify-between pb-2 border-b">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                      <History className="w-4 h-4 text-primary" />
                                      Aktivitási Napló & Megjegyzések
                                    </span>
                                  </div>

                                  <div className="space-y-2.5">
                                    {logs?.filter(log => log.entitas_id === kpi.id && !["kpi_onertekeles", "kpi_vezetoi_ertekeles", "kpi_megbeszeles", "kpi_lezaras"].includes(log.esemeny_tipus)).map(log => (
                                      <div key={log.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/15 border border-muted/40 text-xs">
                                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="font-medium text-foreground">{log.felhasznalo_profil?.nev || "Rendszer"}</span>
                                            <span className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString("hu-HU")}</span>
                                          </div>
                                          <p className="text-muted-foreground mt-0.5">{log.megjegyzes}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {phase !== "lezart" && (
                                    <form
                                      className="flex items-center gap-2 pt-2 border-t"
                                      action={async (formData) => {
                                        const msg = formData.get("megjegyzes") as string
                                        if (!msg) return
                                        const { addKpiActivity } = await import("@/app/hr/performance/actions")
                                        const res = await addKpiActivity(kpi.id, msg)
                                        if (res?.error) toast.error(res.error)
                                        else toast.success("Megjegyzés sikeresen rögzítve!")
                                      }}
                                    >
                                      <Input
                                        type="text"
                                        name="megjegyzes"
                                        placeholder="Rövid megjegyzés hozzáfűzése a haladáshoz..."
                                        required
                                        className="h-8 text-xs flex-1 bg-background"
                                      />
                                      <Button type="submit" size="sm" variant="outline" className="h-8 text-xs shrink-0 cursor-pointer">
                                        Hozzáadás
                                      </Button>
                                    </form>
                                  )}
                                </div>

                              </div>

                              {/* JOBB OLDAL (5 oszlop): Vezetői Kiértékelés & Munkafolyamat Teendők */}
                              <div className="lg:col-span-5 space-y-5">
                                
                                <div className="p-4 rounded-xl border bg-card shadow-2xs space-y-4">
                                  <div className="flex items-center justify-between pb-2 border-b">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                      <Award className="w-4 h-4 text-primary" />
                                      Vezetői Műveletek
                                    </span>
                                    <Badge variant="outline" className="text-[10px] font-normal">
                                      {phase === "celkituzes" && "1 / 5 Lépés"}
                                      {phase === "onertekeles" && "2 / 5 Lépés"}
                                      {phase === "vezetoi_ertekeles" && "3 / 5 Lépés"}
                                      {phase === "megbeszeles" && "4 / 5 Lépés"}
                                      {phase === "lezart" && "5 / 5 Lezárva"}
                                    </Badge>
                                  </div>

                                  {/* 1. CELKITUZES FÁZIS: Dolgozóra várunk, vagy közvetlen értékelés nyitható */}
                                  {phase === "celkituzes" && (
                                    <div className="space-y-3">
                                      <div className="p-4 rounded-lg border border-dashed border-border bg-muted/20 space-y-3 text-center">
                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                                          <User className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="space-y-1">
                                          <h4 className="text-xs font-semibold text-foreground">Várakozás a Dolgozói Önértékelésre</h4>
                                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            A célkitűzés aktív. A munkatárs a <strong>Dolgozói Portálon</strong> tudja leadni a saját önértékelését. Amint beküldte, itt azonnal megnyílik a vezetői értékelési űrlap.
                                          </p>
                                        </div>
                                      </div>

                                      {manualEvalOpenId !== kpi.id ? (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setManualEvalOpenId(kpi.id)}
                                          className="text-xs w-full cursor-pointer"
                                        >
                                          Értékelés megnyitása önértékelés nélkül
                                        </Button>
                                      ) : (
                                        <form
                                          action={async (formData) => {
                                            const evalText = formData.get("ertekelesSzovege") as string
                                            if (!evalText) return
                                            const { addKpiManagerEvaluation } = await import("@/app/hr/performance/actions")
                                            const res = await addKpiManagerEvaluation(kpi.id, evalText)
                                            if (res?.error) toast.error(res.error)
                                            else {
                                              toast.success("Vezetői értékelés sikeresen mentve!")
                                              setManualEvalOpenId(null)
                                            }
                                          }}
                                          className="space-y-3 p-3.5 rounded-lg border bg-primary/5 border-primary/20"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                              <Award className="w-3.5 h-3.5" />
                                              Közvetlen Vezetői Értékelés
                                            </div>
                                            <Button 
                                              type="button" 
                                              variant="ghost" 
                                              size="sm" 
                                              onClick={() => setManualEvalOpenId(null)}
                                              className="h-6 px-1.5 text-[10px]"
                                            >
                                              Mégse
                                            </Button>
                                          </div>
                                          <Textarea
                                            name="ertekelesSzovege"
                                            placeholder="Írd le a vezetői visszajelzést..."
                                            required
                                            className="min-h-[100px] text-xs bg-background"
                                          />
                                          <Button type="submit" size="sm" className="w-full text-xs">
                                            Értékelés Rögzítése
                                          </Button>
                                        </form>
                                      )}
                                    </div>
                                  )}

                                  {/* 2. ONERTEKELES FÁZIS: Vezetőnek kell értékelnie */}
                                  {phase === "onertekeles" && (
                                    <form
                                      action={async (formData) => {
                                        const evalText = formData.get("ertekelesSzovege") as string
                                        if (!evalText) return
                                        const { addKpiManagerEvaluation } = await import("@/app/hr/performance/actions")
                                        const res = await addKpiManagerEvaluation(kpi.id, evalText)
                                        if (res?.error) toast.error(res.error)
                                        else toast.success("Vezetői értékelés sikeresen mentve!")
                                      }}
                                      className="space-y-3 p-3.5 rounded-lg border bg-primary/5 border-primary/20"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                          <Award className="w-3.5 h-3.5" />
                                          Vezetői Értékelés Leadása
                                        </div>
                                        <Badge className="bg-primary/10 text-primary border-0 text-[10px]">Aktív teendő</Badge>
                                      </div>
                                      <p className="text-[11px] text-muted-foreground">
                                        A munkatárs önértékelése beérkezett. Kérlek, rögzítsd a vezetői visszajelzést:
                                      </p>
                                      <Textarea
                                        name="ertekelesSzovege"
                                        placeholder="Írd le a részletes vezetői visszajelzést, erősségeket és fejlődési pontokat..."
                                        required
                                        className="min-h-[100px] text-xs bg-background"
                                      />
                                      <Button type="submit" size="sm" className="w-full text-xs">
                                        Vezetői Értékelés Beküldése
                                      </Button>
                                    </form>
                                  )}

                                  {/* 3. VEZETOI_ERTEKELES FÁZIS: 1-on-1 Megbeszélés rögzítése */}
                                  {phase === "vezetoi_ertekeles" && (
                                    <form
                                      action={async (formData) => {
                                        const megjegyzes = formData.get("megjegyzes") as string
                                        const { confirmMeeting } = await import("@/app/hr/performance/actions")
                                        const res = await confirmMeeting(kpi.id, megjegyzes || undefined)
                                        if (res?.error) toast.error(res.error)
                                        else toast.success("Értékelő megbeszélés rögzítve!")
                                      }}
                                      className="space-y-3 p-3.5 rounded-lg border bg-primary/5 border-primary/20"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                          <CalendarCheck className="w-3.5 h-3.5" />
                                          1-on-1 Megbeszélés Igazolása
                                        </div>
                                        <Badge className="bg-primary/10 text-primary border-0 text-[10px]">Személyes egyeztetés</Badge>
                                      </div>
                                      <p className="text-[11px] text-muted-foreground">
                                        Ülj le a munkatárssal, és vitassátok meg a teljesítményt. A megbeszélés után itt rögzítheted a jegyzőkönyvet:
                                      </p>
                                      <Textarea
                                        name="megjegyzes"
                                        placeholder="Megbeszélés jegyzőkönyve, közös megállapodások (opcionális)..."
                                        className="min-h-[80px] text-xs bg-background"
                                        rows={3}
                                      />
                                      <Button type="submit" size="sm" variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/10 text-xs">
                                        <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
                                        Megbeszélés Megtörténtének Igazolása
                                      </Button>
                                    </form>
                                  )}

                                  {/* 4. MEGBESZELES FÁZIS: Végleges Lezárás */}
                                  {phase === "megbeszeles" && (
                                    <div className="p-4 rounded-lg border bg-success/5 border-success/20 space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-success flex items-center gap-1.5">
                                          <Lock className="w-3.5 h-3.5" />
                                          Zárásra Kész
                                        </span>
                                        <Badge className="bg-success/10 text-success border-0 text-[10px]">Utolsó lépés</Badge>
                                      </div>
                                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Minden értékelési fázis és az 1-on-1 egyeztetés sikeresen lezajlott. A zárással az értékelés hivatalosan lezárásra kerül.
                                      </p>
                                      <Button
                                        size="sm"
                                        className="w-full bg-success hover:bg-success/90 text-success-foreground font-semibold text-xs cursor-pointer"
                                        onClick={async () => {
                                          const { finalCloseKpi } = await import("@/app/hr/performance/actions")
                                          const res = await finalCloseKpi(kpi.id)
                                          if (res?.error) toast.error(res.error)
                                          else toast.success("Célkitűzés véglegesen lezárva!")
                                        }}
                                      >
                                        <Lock className="w-3.5 h-3.5 mr-1.5" />
                                        Célkitűzés Végleges Lezárása
                                      </Button>
                                    </div>
                                  )}

                                  {/* 5. LEZART FÁZIS: Zárolt, hitelesített állapot */}
                                  {phase === "lezart" && (
                                    <div className="p-4 rounded-lg border bg-success/5 border-success/20 space-y-2 text-center">
                                      <div className="w-9 h-9 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
                                        <Lock className="w-4 h-4" />
                                      </div>
                                      <div className="space-y-0.5">
                                        <h4 className="text-xs font-semibold text-success">Célkitűzés Hitelesítve és Lezárva</h4>
                                        <p className="text-[11px] text-muted-foreground">
                                          Az értékelési folyamat mind az 5 mérföldköve sikeresen lezárult.
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                </div>

                              </div>

                            </div>

                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              </CardContent>
            </Card>
          )
        })
      )}

      {editKpiId && allKpis.find(k => k.id === editKpiId) && (
        <EditKpiDialog
          kpi={allKpis.find(k => k.id === editKpiId)!}
          cycles={cycles}
          allKpis={allKpis}
          open={!!editKpiId}
          setOpen={(open) => !open && setEditKpiId(null)}
        />
      )}
    </div>
  )
}
