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
  History
} from "lucide-react"
import { type KpiCatalogueItem, type PerformanceCycle, type PerformanceKpi } from "@/types/hr"


export interface PerformanceEmployee {
  id: string
  felhasznalo_profil?: any
  hr_jogviszony?: any
  kpis?: PerformanceKpi[]
  [key: string]: any
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

      {/* Üres állapot: ha egyáltalán nincs célkitűzés */}
      {totalKpisInSystem === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Target className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Nincsenek még rögzített célkitűzések</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Rögzíts új vállalati KPI-t vagy egyéni célkitűzést valamelyik munkatársnak a nyitott értékelési ciklushoz.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <AddKpiDialog 
                employees={employees} 
                cycles={cycles} 
                allKpis={allKpis} 
                catalogue={catalogue} 
              />
            </div>
          </CardContent>
        </Card>
      ) : filteredEmployees.length === 0 ? (
        /* Üres állapot szűrés után */
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Target className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-medium text-foreground">Nincs a szűrésnek megfelelő célkitűzés</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Próbáld meg módosítani a keresőszót vagy töröld az aktív szűrőket.
            </p>
            <Button variant="outline" size="sm" onClick={handleClearFilters} className="gap-2">
              <RotateCcw className="w-3.5 h-3.5" /> Szűrők visszaállítása
            </Button>
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
            <Card key={emp.id} className="overflow-hidden transition-all hover:border-primary/40">
              <CardHeader className="bg-muted/30 pb-4">
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
                        <CardTitle className="text-lg font-semibold">{nev}</CardTitle>
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

              <CardContent className="pt-4">
                <Accordion className="w-full">
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

                    return (
                      <AccordionItem key={kpi.id} value={kpi.id} className="border-b last:border-0 relative">
                        <div className="absolute top-4 right-12 pt-0 z-10" onClick={(e) => e.stopPropagation()}>
                          <AlertDialog>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted/50" />
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

                        <AccordionTrigger className="hover:no-underline hover:bg-muted/10 px-2 rounded-md transition-colors">
                          <div className="flex items-center justify-between w-full pr-6">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span className="font-semibold text-base truncate">{kpi.celkituzes}</span>
                                <Badge variant="outline" className="font-normal text-[10px] uppercase">
                                  {kpi.hr_teljesitmeny_ciklus?.megnevezes || kpi.ertekelt_idoszak || "Ciklus"}
                                </Badge>
                                <Badge variant="secondary" className="font-normal text-[10px] uppercase">
                                  {meroszamLabel}
                                </Badge>
                                {kpi.sulyozas && (
                                  <Badge variant="outline" className="font-normal text-[10px] tabular-nums text-muted-foreground">
                                    Súly: {kpi.sulyozas}x
                                  </Badge>
                                )}
                                {phase === "lezart" && (
                                  <Badge className="bg-success/10 text-success border-0 text-[10px] uppercase">
                                    <Lock className="w-3 h-3 mr-1" /> Lezárt
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <span className={`font-semibold tabular-nums text-sm ${textClass}`}>{percent}%</span>
                                <Progress value={percent} className={`w-32 h-2 ${bgClass} [&>div]:${colorClass}`} />
                                <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">
                                  {kpi.aktualis_ertek ?? 0} / {kpi.cel_ertek ?? 100} {meroszamLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="px-2 pt-4 pb-6">
                          <div className="pl-4 sm:pl-7 space-y-6">
                            {/* Workflow Stepper */}
                            <div className="pb-4 border-b">
                              <KpiWorkflowStepper currentPhase={phase} />
                            </div>

                            {/* Idővonal */}
                            <div className="relative pl-4 border-l-2 border-muted space-y-6">
                              <div className="relative">
                                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary/20 border-2 border-primary ring-4 ring-background" />
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">Célkitűzés rögzítve</span>
                                  <span className="text-xs text-muted-foreground">
                                    {kpi.created_at ? new Date(kpi.created_at).toLocaleDateString("hu-HU") : ""}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Célérték: {kpi.cel_ertek} {meroszamLabel} • Kezdeti állapot: {kpi.aktualis_ertek || 0}
                                </p>
                              </div>

                              {/* Önértékelés megjelenítése */}
                              {kpi.onertekeles_szovege && (
                                <div className="relative">
                                  <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-info/20 border-2 border-info ring-4 ring-background" />
                                  <div className="flex items-center gap-2 mb-1">
                                    <User className="w-3 h-3 text-info" />
                                    <span className="font-medium text-sm">Dolgozói önértékelés leadva</span>
                                  </div>
                                  <p className="text-sm bg-info/5 p-3 rounded-md border border-info/20 mt-2">
                                    {kpi.onertekeles_szovege}
                                  </p>
                                </div>
                              )}

                              {logs?.filter(log => log.entitas_id === kpi.id && !["kpi_onertekeles", "kpi_vezetoi_ertekeles", "kpi_megbeszeles", "kpi_lezaras"].includes(log.esemeny_tipus)).map(log => (
                                <div key={log.id} className="relative">
                                  <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-muted border-2 border-muted-foreground ring-4 ring-background" />
                                  <div className="flex items-center gap-2 mb-1">
                                    {log.esemeny_tipus === "kpi_bejegyzes" ? (
                                      <MessageSquare className="w-3 h-3 text-primary" />
                                    ) : (
                                      <History className="w-3 h-3 text-muted-foreground" />
                                    )}
                                    <span className="font-medium text-sm">
                                      {log.esemeny_tipus === "kpi_frissites" && "Állapot frissítés"}
                                      {log.esemeny_tipus === "kpi_hozzaadas" && "Rendszer bejegyzés"}
                                      {log.esemeny_tipus === "kpi_bejegyzes" && "Aktivitás / Bejegyzés"}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(log.created_at).toLocaleString("hu-HU", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      {log.felhasznalo_profil?.nev && ` - ${log.felhasznalo_profil.nev}`}
                                    </span>
                                  </div>
                                  <p className="text-sm bg-muted/30 p-3 rounded-md border border-muted mt-2">
                                    {log.megjegyzes}
                                  </p>
                                </div>
                              ))}

                              {/* Vezetői értékelés megjelenítése */}
                              {kpi.ertekeles_szovege && (
                                <div className="relative">
                                  <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary/20 border-2 border-primary ring-4 ring-background" />
                                  <div className="flex items-center gap-2 mb-1">
                                    <Award className="w-3 h-3 text-primary" />
                                    <span className="font-medium text-sm">Vezetői értékelés</span>
                                  </div>
                                  <p className="text-sm bg-primary/5 p-3 rounded-md border border-primary/20 mt-2">
                                    {kpi.ertekeles_szovege}
                                  </p>
                                </div>
                              )}

                              {/* Megbeszélés szekció */}
                              {kpi.megbeszeles_datum && (
                                <div className="relative">
                                  <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary/20 border-2 border-primary ring-4 ring-background" />
                                  <div className="flex items-center gap-2 mb-1">
                                    <CalendarCheck className="w-3 h-3 text-primary" />
                                    <span className="font-medium text-sm">Értékelő megbeszélés megtörtént</span>
                                    <span className="text-xs text-muted-foreground">{new Date(kpi.megbeszeles_datum).toLocaleDateString("hu-HU")}</span>
                                  </div>
                                  {kpi.megbeszeles_megjegyzes && (
                                    <p className="text-sm bg-primary/5 p-3 rounded-md border border-primary/20 mt-2">
                                      {kpi.megbeszeles_megjegyzes}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Vezetői bejegyzés rögzítése - ha nincs lezárva */}
                              {phase !== "lezart" && (
                                <div className="relative">
                                  <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-muted border-2 border-muted-foreground ring-4 ring-background" />
                                  <div className="flex items-center gap-2 mb-1">
                                    <MessageSquare className="w-3 h-3 text-muted-foreground" />
                                    <span className="font-medium text-sm">Vezetői bejegyzés rögzítése</span>
                                  </div>
                                  <form
                                    className="flex items-center gap-3 mt-2"
                                    action={async (formData) => {
                                      const msg = formData.get("megjegyzes") as string
                                      if (!msg) return
                                      const { addKpiActivity } = await import("@/app/hr/performance/actions")
                                      const res = await addKpiActivity(kpi.id, msg)
                                      if (res?.error) toast.error(res.error)
                                      else toast.success("Aktivitás sikeresen rögzítve!")
                                    }}
                                  >
                                    <Input type="text" name="megjegyzes" placeholder="Pl: Pozitív visszajelzés a haladásról..." required className="flex-1 h-8 text-sm" />
                                    <Button type="submit" size="sm" variant="outline" className="h-8">Hozzáadás</Button>
                                  </form>
                                </div>
                              )}

                              {/* Állapot frissítése - ha nincs lezárva */}
                              {phase !== "lezart" && (
                                <div className="relative">
                                  <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-muted border-2 border-muted-foreground ring-4 ring-background" />
                                  <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp className="w-3 h-3 text-muted-foreground" />
                                    <span className="font-medium text-sm">Jelenlegi Állapot frissítése</span>
                                  </div>
                                  <form
                                    className="flex items-center gap-3 mt-2"
                                    action={async (formData) => {
                                      let newValStr = formData.get("percent") as string
                                      if (kpi.meroszam_tipusa === "igen_nem") {
                                        newValStr = formData.get("igen_nem_val") === "on" ? "1" : "0"
                                      }
                                      const newVal = parseFloat(newValStr)
                                      const { updateKpiProgress } = await import("@/app/hr/performance/actions")
                                      const res = await updateKpiProgress(kpi.id, newVal)
                                      if (res?.error) toast.error(res.error)
                                      else toast.success("Állapot sikeresen frissítve!")
                                    }}
                                  >
                                    {kpi.meroszam_tipusa === "igen_nem" ? (
                                      <div className="flex items-center gap-2">
                                        <input type="checkbox" name="igen_nem_val" defaultChecked={kpi.aktualis_ertek > 0} className="h-4 w-4 rounded border-gray-300" />
                                        <span className="text-sm">Teljesítve</span>
                                      </div>
                                    ) : (
                                      <>
                                        <Input key={`input-${kpi.id}-${kpi.aktualis_ertek}`} type="number" step="any" name="percent" defaultValue={kpi.aktualis_ertek || 0} min={0} className="w-32 h-8 text-sm tabular-nums" />
                                        <span className="text-sm font-medium">
                                          / {kpi.cel_ertek || 100} {meroszamLabel}
                                        </span>
                                      </>
                                    )}
                                    <Button type="submit" size="sm" variant="secondary" className="h-8">Frissítés</Button>
                                  </form>
                                </div>
                              )}

                            </div>

                            {/* Akciók szekció - fázistól függően */}
                            <div className="space-y-3 pt-4 border-t">
                              {phase === "onertekeles" && (
                                <form
                                  action={async (formData) => {
                                    const evalText = formData.get("ertekelesSzovege") as string
                                    if (!evalText) return
                                    const { addKpiManagerEvaluation } = await import("@/app/hr/performance/actions")
                                    const res = await addKpiManagerEvaluation(kpi.id, evalText)
                                    if (res?.error) toast.error(res.error)
                                    else toast.success("Vezetői értékelés rögzítve!")
                                  }}
                                  className="space-y-2 p-3 rounded-lg border bg-primary/5 border-primary/20"
                                >
                                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                    <Award className="w-4 h-4" /> Vezetői Értékelés Beküldése
                                    <Badge className="bg-primary/10 text-primary border-0 text-[10px]">Vezetői lépés</Badge>
                                  </div>
                                  <Textarea
                                    name="ertekelesSzovege"
                                    placeholder="Írd le a részletes vezetői visszajelzést..."
                                    required
                                    className="min-h-[80px] text-sm bg-background"
                                  />
                                  <Button type="submit" size="sm" className="w-full">
                                    Értékelés beküldése
                                  </Button>
                                </form>
                              )}

                              {phase === "vezetoi_ertekeles" && (
                                <form
                                  action={async (formData) => {
                                    const megjegyzes = formData.get("megjegyzes") as string
                                    const { confirmMeeting } = await import("@/app/hr/performance/actions")
                                    const res = await confirmMeeting(kpi.id, megjegyzes || undefined)
                                    if (res?.error) toast.error(res.error)
                                    else toast.success("Megbeszélés rögzítve!")
                                  }}
                                  className="space-y-2 p-3 rounded-lg border bg-primary/5 border-primary/20"
                                >
                                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                    <CalendarCheck className="w-4 h-4" /> Értékelő Megbeszélés Rögzítése
                                    <Badge className="bg-primary/10 text-primary border-0 text-[10px]">Vezetői lépés</Badge>
                                  </div>
                                  <Textarea
                                    name="megjegyzes"
                                    placeholder="Megbeszélés jegyzőkönyve vagy összegző megjegyzések (opcionális)..."
                                    className="min-h-[60px] text-sm bg-background"
                                    rows={2}
                                  />
                                  <Button type="submit" size="sm" variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/10">
                                    <CalendarCheck className="w-4 h-4 mr-2" /> Megbeszélés megtörtént
                                  </Button>
                                </form>
                              )}

                              {phase === "megbeszeles" && (
                                <Button
                                  size="sm"
                                  className="w-full bg-success hover:bg-success/90 text-success-foreground font-semibold"
                                  onClick={async () => {
                                    const { finalCloseKpi } = await import("@/app/hr/performance/actions")
                                    const res = await finalCloseKpi(kpi.id)
                                    if (res?.error) toast.error(res.error)
                                    else toast.success("Célkitűzés véglegesen lezárva!")
                                  }}
                                >
                                  <Lock className="w-4 h-4 mr-2" /> Célkitűzés Végleges Lezárása
                                </Button>
                              )}

                              {phase === "lezart" && (
                                <div className="flex items-center gap-2 justify-center py-2.5 px-3 rounded-md bg-success/10 text-success text-xs font-semibold uppercase tracking-wider">
                                  <Lock className="w-3.5 h-3.5" /> Ez a célkitűzés véglegesen le van zárva.
                                </div>
                              )}

                              {phase === "celkituzes" && (
                                <div className="flex items-center gap-2 justify-center py-2 px-3 rounded-md bg-muted/60 text-muted-foreground text-xs">
                                  <User className="w-3.5 h-3.5" /> Várakozás a dolgozó önértékelésére a Dolgozói Portálon...
                                </div>
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
