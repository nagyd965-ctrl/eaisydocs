"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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
  TrendingUp, 
  MessageSquare, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  User, 
  CalendarCheck, 
  Lock, 
  Award, 
  Plus, 
  RotateCcw,
  Sparkles,
  History,
  Workflow,
  Check,
  X,
  Clock,
  CheckCircle2,
  Calendar
} from "lucide-react"
import { type KpiCatalogueItem, type PerformanceCycle, type PerformanceKpi } from "@/types/hr"

export interface PerformanceEmployee {
  id: string
  felhasznalo_profil?: any
  hr_jogviszony?: any
  kpis?: PerformanceKpi[]
  [key: string]: any
}

function KpiBinaryProgressControl({ initialValue }: { initialValue: string }) {
  const [val, setVal] = useState(initialValue)
  return (
    <div className="flex items-center gap-2">
      <input type="hidden" name="igen_nem_val" value={val} />
      <div className="grid grid-cols-2 gap-1 p-1 bg-muted/40 border border-input rounded-md h-9 items-center">
        <button
          type="button"
          onClick={() => setVal("0")}
          className={cn(
            "h-7 px-2.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 cursor-pointer",
            val === "0"
              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <X className="w-3 h-3" />
          Nem
        </button>
        <button
          type="button"
          onClick={() => setVal("1")}
          className={cn(
            "h-7 px-2.5 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 cursor-pointer",
            val === "1"
              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Check className="w-3 h-3" />
          Igen
        </button>
      </div>
      <span className="text-xs text-muted-foreground font-medium">
        {val === "1" ? "(Teljesítve)" : "(Folyamatban)"}
      </span>
    </div>
  )
}

function getPhaseBadge(phase: string) {
  switch (phase) {
    case "celkituzes":
      return (
        <Badge variant="outline" className="text-xs bg-muted/40 text-muted-foreground border-border font-medium">
          1. Célkitűzés aktív
        </Badge>
      )
    case "onertekeles":
      return (
        <Badge variant="outline" className="text-xs bg-info/10 text-info border-info/30 font-medium">
          2. Önértékelés leadva
        </Badge>
      )
    case "vezetoi_ertekeles":
      return (
        <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30 font-medium">
          3. Vezetői értékelésre vár
        </Badge>
      )
    case "megbeszeles":
      return (
        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 font-medium">
          4. Megbeszélésre vár
        </Badge>
      )
    case "lezart":
      return (
        <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30 font-medium">
          <Lock className="w-3 h-3 mr-1" /> 5. Lezárva
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
  const [selectedTiers, setSelectedTiers] = useState<string[]>([])
  const [editKpiId, setEditKpiId] = useState<string | null>(null)

  // Összerendelés dolgozó -> KPI-ok
  const employeesWithKpis = useMemo(() => {
    return employees.map(emp => ({
      ...emp,
      kpis: kpis.filter(k => k.dolgozo_id === emp.id)
    }))
  }, [employees, kpis])

  // Szűrés logika
  const filteredEmployees = useMemo(() => {
    const q = searchValue.trim().toLowerCase()

    return employeesWithKpis
      .map(emp => {
        const nev = (emp.felhasznalo_profil?.nev || "").toLowerCase()
        const activeJogviszony = Array.isArray(emp.hr_jogviszony) ? emp.hr_jogviszony[0] : emp.hr_jogviszony
        const allBeosztas = activeJogviszony?.hr_beosztas
        const activeBeosztas = Array.isArray(allBeosztas)
          ? allBeosztas.find((b: any) => b.ervenyes_ig === null) || allBeosztas[0]
          : allBeosztas
        const munkakor = (activeBeosztas?.hr_munkakor?.megnevezes || "").toLowerCase()

        // Szűrjük a dolgozó KPI-jait a ciklus és fázis alapján
        let matchedKpis = emp.kpis.filter(k => {
          // Ciklus szűrő
          if (selectedCycleIds.length > 0) {
            if (!k.ciklus_id || !selectedCycleIds.includes(k.ciklus_id)) return false
          }

          // Fázis szűrő
          if (selectedPhases.length > 0) {
            const phase = deriveWorkflowPhase(k)
            if (!selectedPhases.includes(phase)) return false
          }

          // Kereső szöveg a cél nevére
          if (q) {
            const celNev = (k.celkituzes || k.megnevezes || "").toLowerCase()
            const matchInGoal = celNev.includes(q)
            const matchInEmployee = nev.includes(q) || munkakor.includes(q)
            if (!matchInGoal && !matchInEmployee) return false
          }

          return true
        })

        // Teljesítmény sáv szűrő (dolgozó szintű átlag alapján)
        if (matchedKpis.length > 0 && selectedTiers.length > 0) {
          const avgScore = Math.round(
            matchedKpis.reduce((acc: number, curr: any) => acc + (curr.pontszam || 0), 0) / matchedKpis.length
          )
          const tier = avgScore >= 85 ? "kivalo" : avgScore >= 60 ? "normal" : "fejlesztendo"
          if (!selectedTiers.includes(tier)) {
            matchedKpis = []
          }
        }

        return {
          ...emp,
          kpis: matchedKpis,
          hasOriginalMatch: (nev.includes(q) || munkakor.includes(q))
        }
      })
      .filter(emp => emp.kpis.length > 0)
  }, [employeesWithKpis, searchValue, selectedCycleIds, selectedPhases, selectedTiers])

  // Szűrőcsoportok a TableToolbar-hoz
  const filterGroups: FilterGroup[] = [
    {
      id: "cycles",
      title: "Értékelési Ciklus",
      options: cycles.map(c => ({
        id: c.id,
        label: `${c.megnevezes} (${c.statusz})`,
        checked: selectedCycleIds.includes(c.id)
      })),
      onToggle: (id: string) => {
        setSelectedCycleIds(prev =>
          prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        )
      }
    },
    {
      id: "phases",
      title: "Értékelési Fázis",
      options: [
        { id: "celkituzes", label: "1. Célkitűzés (rögzítve)", checked: selectedPhases.includes("celkituzes") },
        { id: "onertekeles", label: "2. Önértékelés (leadva)", checked: selectedPhases.includes("onertekeles") },
        { id: "vezetoi_ertekeles", label: "3. Vezetői értékelés", checked: selectedPhases.includes("vezetoi_ertekeles") },
        { id: "megbeszeles", label: "4. Megbeszélés", checked: selectedPhases.includes("megbeszeles") },
        { id: "lezart", label: "5. Lezárt", checked: selectedPhases.includes("lezart") }
      ],
      onToggle: (id: string) => {
        setSelectedPhases(prev =>
          prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        )
      }
    },
    {
      id: "tiers",
      title: "Teljesítmény Sáv",
      options: [
        { id: "kivalo", label: "Kiváló Prémium (≥85%)", checked: selectedTiers.includes("kivalo") },
        { id: "normal", label: "Normál Bónusz (60–84%)", checked: selectedTiers.includes("normal") },
        { id: "fejlesztendo", label: "Fejlesztendő (<60%)", checked: selectedTiers.includes("fejlesztendo") }
      ],
      onToggle: (id: string) => {
        setSelectedTiers(prev =>
          prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        )
      }
    }
  ]

  const activeFiltersCount = selectedCycleIds.length + selectedPhases.length + selectedTiers.length

  const handleClearFilters = () => {
    setSelectedCycleIds([])
    setSelectedPhases([])
    setSelectedTiers([])
    setSearchValue("")
  }

  // Ha összesen 0 cél van az egész rendszerben
  const totalKpisInSystem = kpis.length

  return (
    <div className="space-y-4">
      {/* Kanonikus TableToolbar (ADR A-029) */}
      <div className="bg-card p-3 rounded-lg border">
        <TableToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Keresés dolgozó neve, beosztása vagy célkitűzés címe alapján..."
          filterGroups={filterGroups}
          activeFiltersCount={activeFiltersCount}
          onClearFilters={handleClearFilters}
        />
      </div>

      {filteredEmployees.length === 0 ? (
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <Target className="w-7 h-7 text-primary" />
            </div>

            {totalKpisInSystem === 0 ? (
              <div className="max-w-md space-y-2">
                <h3 className="font-semibold text-lg text-foreground">
                  Még nincsenek rögzített célkitűzések
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Kezdd el a teljesítményértékelést egy új célkitűzés (KPI) hozzáadásával vagy válassz az előre beállított katalógusból!
                </p>
                <div className="pt-4 flex items-center justify-center gap-3">
                  <AddKpiDialog 
                    employees={employees} 
                    cycles={cycles} 
                    allKpis={allKpis}
                    catalogue={catalogue}
                  />
                </div>
              </div>
            ) : (
              <div className="max-w-md space-y-2">
                <h3 className="font-semibold text-lg text-foreground">
                  Nincs találat a megadott szűrési feltételekre
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Próbáld meg módosítani a keresőszót vagy töröld az aktív szűrőket ({activeFiltersCount} aktív szűrő).
                </p>
                <div className="pt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleClearFilters}
                    className="gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Szűrők alaphelyzetbe állítása
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Dolgozói kártyák listája */
        filteredEmployees.map((emp) => {
          const nev = emp.felhasznalo_profil?.nev || "Ismeretlen"
          const initials = nev.substring(0, 2).toUpperCase()
          const avgScore = Math.round(
            emp.kpis.reduce((acc: number, curr: any) => acc + (curr.pontszam || 0), 0) / emp.kpis.length
          )
          const closedCount = emp.kpis.filter((k: any) => deriveWorkflowPhase(k) === "lezart").length

          let bonusProps = { label: "Fejlesztendő", color: "text-destructive", bg: "bg-destructive/10" }
          if (avgScore >= 85) bonusProps = { label: "Kiváló Prémium", color: "text-success", bg: "bg-success/10" }
          else if (avgScore >= 60) bonusProps = { label: "Normál Bónusz", color: "text-warning", bg: "bg-warning/10" }

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

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1 tracking-wider">
                        Átlagos Teljesülés
                      </p>
                      <div className="flex items-center gap-2">
                        <Progress value={avgScore} className="w-24 sm:w-28 h-2" />
                        <span className="font-semibold tabular-nums text-sm">{avgScore}%</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={`${bonusProps.color} ${bonusProps.bg} border-0 font-medium text-[11px] uppercase px-2.5 py-1`}>
                      {bonusProps.label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-3 sm:p-4 space-y-3">
                <Accordion type="multiple" className="w-full space-y-3">
                  {emp.kpis.map((kpi: any) => {
                    const percent = kpi.pontszam || 0
                    const phase = deriveWorkflowPhase(kpi)

                    let colorClass = "bg-primary"
                    let bgClass = "bg-primary/20"
                    let textClass = "text-primary"

                    if (percent >= 80) {
                      colorClass = "bg-success"
                      bgClass = "bg-success/20"
                      textClass = "text-success"
                    } else if (percent <= 30) {
                      colorClass = "bg-warning"
                      bgClass = "bg-warning/20"
                      textClass = "text-warning"
                    }

                    const meroszamLabel = 
                      kpi.meroszam_tipusa === "szazalek" ? "%" :
                      kpi.meroszam_tipusa === "osszeg" ? "Ft" :
                      kpi.meroszam_tipusa === "skala" ? "Pont" :
                      kpi.meroszam_tipusa === "igen_nem" ? "Bináris" : "Db"

                    const meroszamTypeFullLabel = 
                      kpi.meroszam_tipusa === "szazalek" ? "Százalék (%)" :
                      kpi.meroszam_tipusa === "osszeg" ? "Pénzügyi (HUF)" :
                      kpi.meroszam_tipusa === "skala" ? "Skála (1–5)" :
                      kpi.meroszam_tipusa === "igen_nem" ? "Igen / Nem" : "Darabszám"

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
                                    <span className="text-[11px] text-muted-foreground">•</span>
                                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal bg-muted/30">
                                      {meroszamTypeFullLabel}
                                    </Badge>
                                    {kpi.sulyozas && (
                                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal tabular-nums text-muted-foreground">
                                        Súly: {kpi.sulyozas}x
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Jobb oldal: Fázis jelvény + Progress sáv + Érték */}
                              <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
                                {getPhaseBadge(phase)}

                                <div className="flex items-center gap-2.5">
                                  <div className="text-right">
                                    <span className={`text-sm font-semibold tabular-nums ${textClass}`}>{percent}%</span>
                                    <div className="text-[10px] text-muted-foreground tabular-nums">
                                      {kpi.meroszam_tipusa === "igen_nem" 
                                        ? (kpi.aktualis_ertek > 0 ? "Teljesítve" : "Folyamatban")
                                        : `${kpi.aktualis_ertek ?? 0} / ${kpi.cel_ertek ?? 100} ${meroszamLabel}`}
                                    </div>
                                  </div>
                                  <Progress value={percent} className={`w-20 sm:w-28 h-2 ${bgClass} [&>div]:${colorClass}`} />
                                </div>
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
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditKpiId(kpi.id)}>
                                    <Edit className="h-4 w-4 mr-2" /> Szerkesztés
                                  </DropdownMenuItem>
                                  <AlertDialogTrigger
                                    nativeButton={false}
                                    render={
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10" />
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
                                  {phase === "celkituzes" && "1. Lépés: Célkitűzés aktív, várakozás a dolgozói önértékelésre"}
                                  {phase === "onertekeles" && "2. Lépés: Dolgozói önértékelés beérkezett, vezetői értékelés szükséges"}
                                  {phase === "vezetoi_ertekeles" && "3. Lépés: Vezetői értékelés rögzítve, 1-on-1 megbeszélés esedékes"}
                                  {phase === "megbeszeles" && "4. Lépés: Megbeszélés lezajlott, célkitűzés véglegesítésre kész"}
                                  {phase === "lezart" && "5. Lépés: Célkitűzés lezárva és hitelesítve a bónuszelszámoláshoz"}
                                </span>
                              </div>
                              <KpiWorkflowStepper currentPhase={phase} />
                            </div>

                            {/* 2 Oszlopos Rendszer: Balra Előrehaladás & Tevékenységek, Jobbra Vezetői Műveletek */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                              {/* BAL OLDAL (7 oszlop): Teljesülés & Aktivitási Napló */}
                              <div className="lg:col-span-7 space-y-5">
                                
                                {/* Haladás Kártya */}
                                <div className="p-4 rounded-xl border bg-card shadow-2xs space-y-4">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                      <TrendingUp className="w-4 h-4 text-primary" />
                                      Teljesülés & Haladás
                                    </span>
                                    <Badge variant="outline" className="text-xs tabular-nums text-muted-foreground font-normal">
                                      Súlyozás: {kpi.sulyozas || "1.0"}x
                                    </Badge>
                                  </div>

                                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                                    <div className="flex items-baseline gap-2">
                                      <span className={`text-3xl font-semibold tabular-nums ${textClass}`}>{percent}%</span>
                                      <span className="text-xs text-muted-foreground">
                                        {kpi.meroszam_tipusa === "igen_nem" ? (
                                          kpi.aktualis_ertek > 0 ? "✓ Teljesítve" : "✕ Folyamatban (Nincs teljesítve)"
                                        ) : (
                                          `(${kpi.aktualis_ertek ?? 0} / ${kpi.cel_ertek ?? 100} ${meroszamLabel})`
                                        )}
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {kpi.meroszam_tipusa === "igen_nem" ? (
                                        <span>Elvárt állapot: <strong className="text-foreground">Igen</strong></span>
                                      ) : (
                                        <span>Célérték: <strong className="text-foreground">{kpi.cel_ertek} {meroszamLabel}</strong></span>
                                      )}
                                    </div>
                                  </div>

                                  <Progress value={percent} className={`h-2.5 ${bgClass} [&>div]:${colorClass}`} />

                                  {/* Haladás Frissítése Űrlap (ha nincs lezárva) */}
                                  {phase !== "lezart" && (
                                    <div className="pt-3 border-t">
                                      <form
                                        action={async (formData) => {
                                          let newValStr = formData.get("percent") as string
                                          if (kpi.meroszam_tipusa === "igen_nem") {
                                            newValStr = formData.get("igen_nem_val") === "1" ? "1" : "0"
                                          }
                                          const newVal = parseFloat(newValStr)
                                          const { updateKpiProgress } = await import("@/app/hr/performance/actions")
                                          const res = await updateKpiProgress(kpi.id, newVal)
                                          if (res?.error) toast.error(res.error)
                                          else toast.success("Állapot sikeresen frissítve!")
                                        }}
                                        className="space-y-3"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-medium text-foreground">
                                            Jelenlegi állapot módosítása:
                                          </span>
                                        </div>

                                        {kpi.meroszam_tipusa === "igen_nem" ? (
                                          <div className="flex items-center gap-3">
                                            <KpiBinaryProgressControl initialValue={kpi.aktualis_ertek > 0 ? "1" : "0"} />
                                            <Button type="submit" size="sm" variant="secondary" className="h-9 text-xs shrink-0">
                                              Frissítés
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-3">
                                            <Input
                                              key={`input-${kpi.id}-${kpi.aktualis_ertek}`}
                                              type="number"
                                              step="any"
                                              name="percent"
                                              defaultValue={kpi.aktualis_ertek || 0}
                                              min={0}
                                              className="w-32 h-9 text-sm tabular-nums"
                                            />
                                            <span className="text-xs text-muted-foreground font-medium">
                                              / {kpi.cel_ertek || 100} {meroszamLabel}
                                            </span>
                                            <Button type="submit" size="sm" variant="secondary" className="h-9 text-xs ml-auto">
                                              Mentés
                                            </Button>
                                          </div>
                                        )}
                                      </form>
                                    </div>
                                  )}
                                </div>

                                {/* Tevékenységek & Előzmények Kártya */}
                                <div className="p-4 rounded-xl border bg-card shadow-2xs space-y-4">
                                  <div className="flex items-center justify-between pb-2 border-b">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                      <History className="w-4 h-4 text-primary" />
                                      Tevékenységek & Előzmények
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                      {kpi.created_at ? `Kitűzve: ${new Date(kpi.created_at).toLocaleDateString("hu-HU")}` : ""}
                                    </span>
                                  </div>

                                  {/* Eseményfolyam */}
                                  <div className="space-y-3">
                                    {/* 1. Létrehozás esemény */}
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-muted/50 text-xs">
                                      <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                        <Target className="w-3.5 h-3.5" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-semibold text-foreground">Célkitűzés Rögzítve</span>
                                          <span className="text-[11px] text-muted-foreground">
                                            {kpi.created_at ? new Date(kpi.created_at).toLocaleDateString("hu-HU") : ""}
                                          </span>
                                        </div>
                                        <p className="text-muted-foreground mt-0.5">
                                          {kpi.meroszam_tipusa === "igen_nem" 
                                            ? `Elvárt állapot: Igen • Kezdő állapot: ${kpi.aktualis_ertek > 0 ? "Igen" : "Nem"}`
                                            : `Célérték: ${kpi.cel_ertek} ${meroszamLabel} • Kezdő érték: ${kpi.aktualis_ertek || 0} ${meroszamLabel}`}
                                        </p>
                                      </div>
                                    </div>

                                    {/* 2. Dolgozói Önértékelés (ha leadva) */}
                                    {kpi.onertekeles_szovege && (
                                      <div className="flex items-start gap-3 p-3 rounded-lg bg-info/5 border border-info/20 text-xs">
                                        <div className="w-7 h-7 rounded-md bg-info/10 text-info flex items-center justify-center shrink-0 mt-0.5">
                                          <User className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-info">Dolgozói Önértékelés</span>
                                            <Badge variant="outline" className="text-[10px] bg-info/10 text-info border-info/30">Leadva</Badge>
                                          </div>
                                          <p className="text-foreground mt-1 bg-background p-2.5 rounded border border-info/10 leading-relaxed italic">
                                            „{kpi.onertekeles_szovege}”
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {/* 3. Vezetői Értékelés (ha rögzítve) */}
                                    {kpi.ertekeles_szovege && (
                                      <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                                        <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                          <Award className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-primary">Vezetői Értékelés</span>
                                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">Rögzítve</Badge>
                                          </div>
                                          <p className="text-foreground mt-1 bg-background p-2.5 rounded border border-primary/10 leading-relaxed">
                                            „{kpi.ertekeles_szovege}”
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {/* 4. Megbeszélés (ha rögzítve) */}
                                    {kpi.megbeszeles_datum && (
                                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-muted text-xs">
                                        <div className="w-7 h-7 rounded-md bg-foreground/10 text-foreground flex items-center justify-center shrink-0 mt-0.5">
                                          <CalendarCheck className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-foreground">Értékelő Megbeszélés Megtörtént</span>
                                            <span className="text-[11px] text-muted-foreground">{new Date(kpi.megbeszeles_datum).toLocaleDateString("hu-HU")}</span>
                                          </div>
                                          {kpi.megbeszeles_megjegyzes && (
                                            <p className="text-muted-foreground mt-1 bg-background p-2 rounded border border-border leading-relaxed">
                                              {kpi.megbeszeles_megjegyzes}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Egyéb naplóbejegyzések */}
                                    {logs?.filter(log => log.entitas_id === kpi.id && !["kpi_onertekeles", "kpi_vezetoi_ertekeles", "kpi_megbeszeles", "kpi_lezaras"].includes(log.esemeny_tipus)).map(log => (
                                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-muted/50 text-xs">
                                        <div className="w-7 h-7 rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                                          <MessageSquare className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="font-medium text-foreground">
                                              {log.esemeny_tipus === "kpi_frissites" && "Állapot Frissítés"}
                                              {log.esemeny_tipus === "kpi_hozzaadas" && "Rendszer Bejegyzés"}
                                              {log.esemeny_tipus === "kpi_bejegyzes" && "Vezetői Megjegyzés"}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground">
                                              {new Date(log.created_at).toLocaleString("hu-HU", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                              {log.felhasznalo_profil?.nev && ` • ${log.felhasznalo_profil.nev}`}
                                            </span>
                                          </div>
                                          <p className="text-muted-foreground mt-0.5">{log.megjegyzes}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Új bejegyzés űrlap */}
                                  {phase !== "lezart" && (
                                    <form
                                      className="flex items-center gap-2 pt-3 border-t"
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
                                        placeholder="Visszajelzés vagy megjegyzés hozzáadása..."
                                        required
                                        className="h-9 text-xs flex-1"
                                      />
                                      <Button type="submit" size="sm" variant="outline" className="h-9 text-xs shrink-0">
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
                                      {phase === "celkituzes" && "1 / 5 Fázis"}
                                      {phase === "onertekeles" && "2 / 5 Fázis"}
                                      {phase === "vezetoi_ertekeles" && "3 / 5 Fázis"}
                                      {phase === "megbeszeles" && "4 / 5 Fázis"}
                                      {phase === "lezart" && "5 / 5 Lezárva"}
                                    </Badge>
                                  </div>

                                  {/* 1. CELKITUZES FÁZIS: Dolgozóra várunk */}
                                  {phase === "celkituzes" && (
                                    <div className="p-4 rounded-lg border border-dashed border-border bg-muted/20 space-y-3 text-center">
                                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                                        <User className="w-5 h-5" />
                                      </div>
                                      <div className="space-y-1">
                                        <h4 className="text-xs font-semibold text-foreground">Várakozás a Dolgozói Önértékelésre</h4>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                          A célkitűzés aktív. A munkatárs a <strong>Dolgozói Portálon</strong> tudja leadni a saját önértékelését. Amint beküldte, itt azonnal megnyílik a vezetői értékelési űrlap.
                                        </p>
                                      </div>
                                      <Badge variant="outline" className="text-[10px] bg-background text-muted-foreground font-normal">
                                        Következő lépés: Dolgozói kitöltés
                                      </Badge>
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
                                        Minden értékelési fázis és az 1-on-1 egyeztetés sikeresen lezajlott. A zárással a pontszám véglegessé válik és átkerül a bérszámfejtési bónuszelszámoláshoz.
                                      </p>
                                      <Button
                                        size="sm"
                                        className="w-full bg-success hover:bg-success/90 text-success-foreground font-semibold text-xs"
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
                                          A cél adatai zárolva vannak. A pontszám ({percent}%) beépült a munkatárs ciklus-bónuszába.
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
