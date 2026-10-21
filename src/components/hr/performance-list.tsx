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

                        {/* Részletes Munkaterület (Expanded State) - Egységesített, tiszta 5-lépéses folyamat */}
                        <AccordionContent className="p-0 border-t bg-muted/5">
                          <div className="p-4 sm:p-6 space-y-4">

                            {/* 1. FELSŐ FOLYAMATSÁV (Linear Stepper az 5 mérföldkővel) */}
                            <div className="p-4 sm:p-5 rounded-xl border bg-card shadow-2xs space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b">
                                <div className="flex items-center gap-2">
                                  <Workflow className="w-4 h-4 text-primary" />
                                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                                    Értékelési Folyamat Lépései
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground font-medium">
                                  {phase === "celkituzes" && "1 / 5 Lépés: Célkitűzés rögzítve — Várakozás a dolgozói önértékelésre"}
                                  {phase === "onertekeles" && "2 / 5 Lépés: Dolgozói önértékelés leadva — Vezetői értékelés szükséges"}
                                  {phase === "vezetoi_ertekeles" && "3 / 5 Lépés: Vezetői értékelés rögzítve — 1-on-1 megbeszélés következik"}
                                  {phase === "megbeszeles" && "4 / 5 Lépés: 1-on-1 megbeszélés megtörtént — Cél lezárásra kész"}
                                  {phase === "lezart" && "5 / 5 Lépés: Célkitűzés lezárva és hitelesítve"}
                                </span>
                              </div>
                              <div className="pt-2 pb-1">
                                <KpiWorkflowStepper currentPhase={phase} />
                              </div>
                            </div>

                            {/* 2. AKTUÁLIS TEENDŐ ÉS ÉRTÉKELÉSI MUNKATERÜLET (Egyetlen fókuszált kártya!) */}
                            <div className="p-5 sm:p-6 rounded-xl border bg-card shadow-2xs space-y-4">
                              
                              {/* 1. FÁZIS: CELKITUZES */}
                              {phase === "celkituzes" && (
                                <div className="space-y-4">
                                  <div className="p-5 rounded-xl border border-dashed border-border bg-muted/15 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                      <User className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                      <h4 className="text-sm font-semibold text-foreground">
                                        Várakozás a Dolgozói Önértékelésre
                                      </h4>
                                      <p className="text-xs text-muted-foreground leading-relaxed">
                                        A célkitűzés aktív. <strong>{nev}</strong> a saját Dolgozói Portálján tudja beküldeni az önértékelését a kitűzött időszakról. Amint beküldi, az értékelés itt automatikusan megnyílik a vezetői felülvizsgálatra.
                                      </p>
                                    </div>
                                    {manualEvalOpenId !== kpi.id && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setManualEvalOpenId(kpi.id)}
                                        className="text-xs shrink-0 cursor-pointer whitespace-nowrap"
                                      >
                                        Értékelés azonnal (dolgozó nélkül)
                                      </Button>
                                    )}
                                  </div>

                                  {manualEvalOpenId === kpi.id && (
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
                                      className="space-y-3 p-4 rounded-xl border bg-primary/5 border-primary/20"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                                          <Award className="w-4 h-4" />
                                          Közvetlen Vezetői Értékelés Írása
                                        </span>
                                        <Button 
                                          type="button" 
                                          variant="ghost" 
                                          size="sm" 
                                          onClick={() => setManualEvalOpenId(null)}
                                          className="h-6 px-2 text-xs"
                                        >
                                          Mégse
                                        </Button>
                                      </div>
                                      <Textarea
                                        name="ertekelesSzovege"
                                        placeholder="Írd le a vezetői visszajelzést..."
                                        required
                                        className="min-h-[110px] text-xs bg-background leading-relaxed"
                                      />
                                      <Button type="submit" size="sm" className="w-full text-xs cursor-pointer">
                                        Vezetői Értékelés Rögzítése → Tovább az 1-on-1 Megbeszélésre
                                      </Button>
                                    </form>
                                  )}
                                </div>
                              )}

                              {/* 2. FÁZIS: ONERTEKELES BEÉRKEZETT */}
                              {phase === "onertekeles" && (
                                <div className="space-y-4">
                                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                        <User className="w-4 h-4" />
                                        {nev} dolgozói önértékelése
                                      </span>
                                      <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                                        Leadva a Dolgozói Portálról
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-foreground bg-background p-3 rounded-lg border border-blue-500/15 leading-relaxed italic">
                                      „{kpi.onertekeles_szovege}”
                                    </p>
                                  </div>

                                  <form
                                    action={async (formData) => {
                                      const evalText = formData.get("ertekelesSzovege") as string
                                      if (!evalText) return
                                      const { addKpiManagerEvaluation } = await import("@/app/hr/performance/actions")
                                      const res = await addKpiManagerEvaluation(kpi.id, evalText)
                                      if (res?.error) toast.error(res.error)
                                      else toast.success("Vezetői értékelés sikeresen rögzítve!")
                                    }}
                                    className="space-y-3 pt-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                        <Award className="w-4 h-4 text-primary" />
                                        Vezetői Visszajelzés és Értékelés
                                      </div>
                                      <Badge className="bg-primary/10 text-primary border-0 text-[10px]">Aktív teendő</Badge>
                                    </div>
                                    <Textarea
                                      name="ertekelesSzovege"
                                      placeholder="Írd le a részletes vezetői visszajelzést, erősségeket és fejlesztendő területeket..."
                                      required
                                      className="min-h-[110px] text-xs bg-background leading-relaxed"
                                    />
                                    <Button type="submit" size="sm" className="w-full text-xs cursor-pointer">
                                      Vezetői Értékelés Mentése → Tovább az 1-on-1 Megbeszélésre
                                    </Button>
                                  </form>
                                </div>
                              )}

                              {/* 3. FÁZIS: VEZETOI_ERTEKELES KÉSZ -> 1-on-1 MEGBESZÉLÉS */}
                              {phase === "vezetoi_ertekeles" && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-1.5">
                                      <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                        <User className="w-3.5 h-3.5" /> {nev} önértékelése
                                      </span>
                                      <p className="text-xs text-foreground bg-background p-2.5 rounded-lg border border-blue-500/10 italic leading-relaxed">
                                        „{kpi.onertekeles_szovege || "Nem rögzített önértékelést."}”
                                      </p>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
                                      <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                                        <Award className="w-3.5 h-3.5" /> Rögzített vezetői értékelés
                                      </span>
                                      <p className="text-xs text-foreground bg-background p-2.5 rounded-lg border border-primary/10 leading-relaxed">
                                        „{kpi.ertekeles_szovege}”
                                      </p>
                                    </div>
                                  </div>

                                  <form
                                    action={async (formData) => {
                                      const megjegyzes = formData.get("megjegyzes") as string
                                      const { confirmMeeting } = await import("@/app/hr/performance/actions")
                                      const res = await confirmMeeting(kpi.id, megjegyzes || undefined)
                                      if (res?.error) toast.error(res.error)
                                      else toast.success("1-on-1 megbeszélés sikeresen rögzítve!")
                                    }}
                                    className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                                        <CalendarCheck className="w-4 h-4" />
                                        4. Lépés: 1-on-1 Személyes Megbeszélés Lebonyolítása
                                      </span>
                                      <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-0 text-[10px]">
                                        Aktív teendő
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Ülj le a munkatárssal, egyeztessétek az értékeléseket és a jövőbeli fejlesztési irányokat.
                                    </p>
                                    <Textarea
                                      name="megjegyzes"
                                      placeholder="Megbeszélés jegyzőkönyve, közös megállapodások (opcionális)..."
                                      className="min-h-[80px] text-xs bg-background leading-relaxed"
                                    />
                                    <Button type="submit" size="sm" className="w-full text-xs bg-purple-600 hover:bg-purple-700 text-white cursor-pointer">
                                      1-on-1 Megbeszélés Megtörténtének Rögzítése → Tovább a Lezárásra
                                    </Button>
                                  </form>
                                </div>
                              )}

                              {/* 4. FÁZIS: MEGBESZELES MEGTÖRTÉNT -> LEZÁRÁS */}
                              {phase === "megbeszeles" && (
                                <div className="space-y-4">
                                  <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                        <CalendarCheck className="w-5 h-5" />
                                      </div>
                                      <div>
                                        <h4 className="text-xs font-semibold text-foreground">
                                          1-on-1 Megbeszélés megtörtént ({new Date(kpi.megbeszeles_datum || "").toLocaleDateString("hu-HU")})
                                        </h4>
                                        {kpi.megbeszeles_megjegyzes && (
                                          <p className="text-xs text-muted-foreground mt-0.5">„{kpi.megbeszeles_megjegyzes}”</p>
                                        )}
                                      </div>
                                    </div>
                                    <Badge className="bg-success/10 text-success border-0 text-[10px] shrink-0">
                                      Zárásra kész
                                    </Badge>
                                  </div>

                                  <div className="p-5 rounded-xl border bg-muted/15 space-y-3 text-center">
                                    <p className="text-xs text-muted-foreground">
                                      Minden értékelési fázis és személyes egyeztetés sikeresen lezajlott. A célkitűzés készen áll a végleges hitelesítésre és lezárásra.
                                    </p>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={async () => {
                                        const { finalCloseKpi } = await import("@/app/hr/performance/actions")
                                        const res = await finalCloseKpi(kpi.id)
                                        if (res?.error) toast.error(res.error)
                                        else toast.success("Célkitűzés sikeresen hitelesítve és lezárva!")
                                      }}
                                      className="text-xs px-6 cursor-pointer bg-primary text-primary-foreground font-semibold"
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                      Célkitűzés Végleges Lezárása és Hitelesítése
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* 5. FÁZIS: LEZART */}
                              {phase === "lezart" && (
                                <div className="space-y-4">
                                  <div className="p-4 rounded-xl bg-success/10 border border-success/30 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-success/20 text-success flex items-center justify-center shrink-0">
                                      <Lock className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-semibold text-success">
                                        Célkitűzés Sikeresen Hitelesítve és Lezárva
                                      </h4>
                                      <p className="text-[11px] text-muted-foreground mt-0.5">
                                        A teljesítményértékelési ciklus mind az 5 mérföldköve lezárult. Minden visszajelzés véglegesen rögzítve a munkatárs kartonján.
                                      </p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                    {kpi.onertekeles_szovege && (
                                      <div className="p-3.5 rounded-xl border bg-muted/10 space-y-1">
                                        <span className="text-[11px] font-semibold text-muted-foreground">Dolgozói Önértékelés:</span>
                                        <p className="text-foreground italic leading-relaxed">„{kpi.onertekeles_szovege}”</p>
                                      </div>
                                    )}
                                    {kpi.ertekeles_szovege && (
                                      <div className="p-3.5 rounded-xl border bg-muted/10 space-y-1">
                                        <span className="text-[11px] font-semibold text-muted-foreground">Vezetői Értékelés:</span>
                                        <p className="text-foreground leading-relaxed">„{kpi.ertekeles_szovege}”</p>
                                      </div>
                                    )}
                                  </div>

                                  {kpi.megbeszeles_megjegyzes && (
                                    <div className="p-3.5 rounded-xl border bg-purple-500/5 border-purple-500/20 text-xs space-y-1">
                                      <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">1-on-1 Megbeszélés Jegyzete:</span>
                                      <p className="text-foreground leading-relaxed">„{kpi.megbeszeles_megjegyzes}”</p>
                                    </div>
                                  )}
                                </div>
                              )}

                            </div>

                            {/* 3. DISZKRÉT ELŐZMÉNYEK ÉS MEGJEGYZÉS SÁV */}
                            <div className="p-3.5 rounded-xl border bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <History className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Cél rögzítve: {kpi.created_at ? new Date(kpi.created_at).toLocaleDateString("hu-HU") : "Kezdetkor"}</span>
                              </div>

                              {phase !== "lezart" && (
                                <form
                                  className="flex items-center gap-2 w-full sm:w-auto"
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
                                    placeholder="Rövid megjegyzés fűzése a haladáshoz..."
                                    required
                                    className="h-8 text-xs w-full sm:w-72 bg-background"
                                  />
                                  <Button type="submit" size="sm" variant="outline" className="h-8 text-xs shrink-0 cursor-pointer">
                                    Küldés
                                  </Button>
                                </form>
                              )}
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
