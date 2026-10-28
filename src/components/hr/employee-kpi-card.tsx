"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Target, 
  CheckCircle2, 
  User, 
  Lock, 
  CalendarCheck, 
  History, 
  ArrowRight, 
  Calendar, 
  Scale, 
  Sparkles, 
  Clock, 
  Edit3,
  ChevronDown,
  Layers,
  Search,
  X
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { addKpiSelfEvaluation } from "@/app/hr/performance/actions"
import { 
  KpiWorkflowStepper, 
  deriveWorkflowPhase,
  formatKpiTargetBadge,
  formatKpiTargetOnly,
  getMetricUnitLabel,
  getMetricFieldLabels,
  formatMetricValue
} from "@/components/hr/kpi-workflow-stepper"
import { cn } from "@/lib/utils"

export interface KpiLogItem {
  id?: string
  kpi_id?: string
  letrehozva?: string
  leiras?: string
  esemeny_tipus?: string
  megjegyzes?: string
  felhasznalo_id?: string
  felhasznalo_profil?: { nev?: string } | null
  created_at?: string
  [key: string]: any
}

export interface CardKpiItem {
  id: string
  megnevezes?: string
  celkituzes?: string
  ertekeles_szovege?: string
  pontszam?: number | null
  meroszam_tipusa?: string | null
  aktualis_ertek?: number | null
  cel_ertek?: number | null
  onertekeles_szovege?: string | null
  megbeszeles_datum?: string | null
  megbeszeles_megjegyzes?: string | null
  hr_teljesitmeny_ciklus?: { megnevezes?: string; kezdo_datum?: string; befejezo_datum?: string } | null
  ertekelt_idoszak?: string | null
  created_at?: string
  sulyozas?: number | null
  workflow_fazis?: string | null
  [key: string]: any
}

function getPhaseBadge(phase: string) {
  switch (phase) {
    case "celkituzes":
      return (
        <Badge variant="outline" className="text-xs py-1 px-2.5 bg-primary/10 text-primary border-primary/20 font-semibold flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          1. Célkitűzés (Önértékelésre vár)
        </Badge>
      )
    case "onertekeles":
      return (
        <Badge variant="outline" className="text-xs py-1 px-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold flex items-center gap-1.5 shrink-0">
          <Clock className="w-3.5 h-3.5" />
          2. Önértékelés leadva (Vezetőre vár)
        </Badge>
      )
    case "vezetoi_ertekeles":
      return (
        <Badge variant="outline" className="text-xs py-1 px-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-semibold flex items-center gap-1.5 shrink-0">
          <CalendarCheck className="w-3.5 h-3.5" />
          3. Vezető értékelt (Megbeszélés előtt)
        </Badge>
      )
    case "megbeszeles":
      return (
        <Badge variant="outline" className="text-xs py-1 px-2.5 bg-primary/10 text-primary border-primary/30 font-semibold flex items-center gap-1.5 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
          4. Megbeszélés lezajlott
        </Badge>
      )
    case "lezart":
      return (
        <Badge variant="outline" className="text-xs py-1 px-2.5 bg-success/15 text-success border-success/30 font-semibold flex items-center gap-1.5 shrink-0">
          <Lock className="w-3.5 h-3.5" />
          5. Hitelesítve és Lezárva
        </Badge>
      )
    default:
      return null
  }
}

function GoalListItem({
  kpi,
  logs = [],
  activeCycleName,
  isOpen,
  onToggle
}: {
  kpi: CardKpiItem
  logs?: KpiLogItem[]
  activeCycleName?: string
  isOpen: boolean
  onToggle: () => void
}) {
  const title = kpi.celkituzes || kpi.megnevezes || kpi.ertekeles_szovege || "Névtelen Célkitűzés"
  const phase = deriveWorkflowPhase(kpi as any)
  const isPendingSelfEval = !kpi.onertekeles_szovege && (phase === "celkituzes" || phase === "onertekeles")
  const targetBadge = formatKpiTargetBadge(kpi)
  const cycleName = kpi.hr_teljesitmeny_ciklus?.megnevezes || activeCycleName || "Aktuális Ciklus"

  const [isEditingSelfEval, setIsEditingSelfEval] = useState(false)
  const [isSubmittingEval, setIsSubmittingEval] = useState(false)

  const metricLabels = getMetricFieldLabels(kpi.meroszam_tipusa)
  const isMetric = !!kpi.meroszam_tipusa && kpi.meroszam_tipusa !== "igen_nem" && kpi.cel_ertek !== null && kpi.cel_ertek !== undefined

  return (
    <div 
      className={cn(
        "border rounded-2xl bg-card transition-all overflow-hidden shadow-2xs",
        isOpen ? "border-primary/40" : "border-border/80 hover:border-primary/30"
      )}
    >
      {/* 1. FEJLÉC SÁV / LISTA ELEM — Kattintható kinyitáshoz/becsukáshoz */}
      <div 
        onClick={onToggle}
        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 cursor-pointer hover:bg-muted/15 transition-colors select-none"
      >
        {/* Bal oldal: Ikon + Cél megnevezése + Meta információk */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 transition-colors border",
            isPendingSelfEval
              ? "bg-primary/10 text-primary border-primary/30"
              : phase === "lezart"
                ? "bg-success/10 text-success border-success/30"
                : "bg-muted/30 text-foreground border-border"
          )}>
            <Target className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold text-sm sm:text-base text-foreground truncate hover:text-primary transition-colors">
              {title}
            </h3>

            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-xs text-muted-foreground font-medium">
                {cycleName}
              </span>
              {targetBadge && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <Badge variant="outline" className="text-[11px] py-0 px-2 font-medium tabular-nums bg-primary/10 text-primary border-primary/25">
                    {targetBadge}
                  </Badge>
                </>
              )}
              {kpi.sulyozas && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <Badge variant="outline" className="text-[11px] py-0 px-2 font-normal tabular-nums text-muted-foreground">
                    Súlyozás: {kpi.sulyozas}x
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Jobb oldal: Önértékelési teendő jelvény + Fázis jelvény + Nyitás/Csukás gomb */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          {isPendingSelfEval && (
            <Badge className="bg-primary text-primary-foreground border-0 text-[10px] font-semibold flex items-center gap-1.5 py-1 px-2.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
              Te jössz!
            </Badge>
          )}

          {getPhaseBadge(phase)}

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 ml-1 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
          >
            <span>{isOpen ? "Becsukás" : "Részletek"}</span>
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
          </Button>
        </div>
      </div>

      {/* 2. KINYITOTT TARTALOM (EXPANDED WORKSPACE) */}
      {isOpen && (
        <div className="border-t border-border/60 divide-y divide-border/60 bg-card">
          {/* FOLYAMATSÁV (Linear Stepper az 5 lépéssel) */}
          <div className="p-4 sm:p-6 bg-muted/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Értékelési Folyamat Lépései
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {phase === "celkituzes" && "1. Lépés: Célkitűzés aktív — Töltsd ki az önértékelést az alábbi munkalapon!"}
                {phase === "onertekeles" && "2. Lépés: Önértékelés leadva — A vezetői visszajelzésre várunk"}
                {phase === "vezetoi_ertekeles" && "3. Lépés: Vezetői értékelés kész — Személyes megbeszélés következik"}
                {phase === "megbeszeles" && "4. Lépés: Megbeszélés lezajlott — Végleges lezárás folyamatban"}
                {phase === "lezart" && "5. Lépés: Hitelesítve és lezárva"}
              </span>
            </div>
            <div className="pt-2 pb-1">
              <KpiWorkflowStepper currentPhase={phase} />
            </div>
          </div>

          {/* FÓKUSZÁLT MUNKATERÜLET */}
          <div className="p-5 sm:p-6 space-y-5 bg-card">
            
            {/* 1. ESET: Kitöltendő önértékelés (vagy módosítás) */}
            {(!kpi.onertekeles_szovege || isEditingSelfEval) && phase !== "lezart" && (
              <form
                action={async (formData) => {
                  setIsSubmittingEval(true)
                  try {
                    const evalText = formData.get("ertekelesSzovege") as string
                    const rawActual = formData.get("aktualisErtek") as string
                    const actualVal = rawActual !== null && rawActual !== "" ? parseFloat(rawActual) : undefined
                    if (!evalText) return
                    const res = await addKpiSelfEvaluation(kpi.id, evalText, actualVal)
                    if (res?.error) toast.error(res.error)
                    else {
                      toast.success("Önértékelésedet sikeresen elküldted a vezetődnek!")
                      setIsEditingSelfEval(false)
                    }
                  } catch (e) {
                    toast.error("Hiba történt a beküldéskor.")
                  } finally {
                    setIsSubmittingEval(false)
                  }
                }}
                className="space-y-4 p-5 sm:p-6 rounded-2xl border bg-primary/5 border-primary/20 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <User className="w-4 h-4" />
                    {isEditingSelfEval ? "Önértékelésed Módosítása" : "2. Lépés: Saját Dolgozói Önértékelés Leadása"}
                  </div>
                  <Badge className="bg-primary text-primary-foreground border-0 text-[10px] font-semibold">
                    Aktív feladatod
                  </Badge>
                </div>

                <div className="p-3.5 rounded-xl bg-background/80 border border-primary/10 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
                  <span className="font-semibold text-foreground block">Gondolatébresztő az önértékeléshez:</span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Milyen konkrét mérföldköveket, feladatokat teljesítettél az időszak során?</li>
                    <li>Milyen kihívásokkal szembesültél és milyen megoldásokat találtál?</li>
                    <li>Milyen szakmai vagy személyes fejlődést értél el?</li>
                  </ul>
                </div>

                {/* Cél és Elért Eredmény PÁROSÍTOTT Munkasáv */}
                {isMetric ? (
                  <div className="p-4 rounded-xl border bg-background border-primary/20 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      {/* Bal oldal: Kitűzött cél (pl. Kitűzött összeg) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                          {metricLabels.target}:
                        </label>
                        <div className="h-9 px-3.5 rounded-lg bg-muted/20 border border-border flex items-center font-semibold text-sm text-foreground tabular-nums">
                          {formatKpiTargetOnly(kpi)}
                        </div>
                      </div>

                      {/* Jobb oldal: Elért eredmény beírása közvetlenül a cél mellé */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                          {metricLabels.actual}:
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            name="aktualisErtek"
                            type="number"
                            step="any"
                            defaultValue={kpi.aktualis_ertek ?? ""}
                            placeholder={metricLabels.placeholder || `pl. ${kpi.cel_ertek}`}
                            className="h-9 text-sm tabular-nums bg-background"
                          />
                          <span className="text-xs font-medium text-muted-foreground shrink-0 min-w-8">
                            {metricLabels.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border bg-background border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-foreground uppercase text-[11px] tracking-wider block text-muted-foreground">
                        Kitűzött célkitűzés / elvárás:
                      </span>
                      <span className="text-sm font-medium text-foreground">{title}</span>
                    </div>
                    <Badge variant="outline" className="text-xs py-1 px-2.5 bg-muted/30 text-foreground font-medium shrink-0 self-start sm:self-center">
                      Minőségi mérföldkő
                    </Badge>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Önértékelésed szöveges kifejtése:
                  </label>
                  <Textarea
                    name="ertekelesSzovege"
                    defaultValue={kpi.onertekeles_szovege || ""}
                    placeholder="Írd le részletesen az elért eredményeidet, sikereidet és a feladat tapasztalatait..."
                    required
                    className="min-h-[140px] text-xs bg-background leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  {isEditingSelfEval && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditingSelfEval(false)}
                      className="text-xs cursor-pointer"
                    >
                      Mégse
                    </Button>
                  )}
                  <Button 
                    type="submit" 
                    size="sm" 
                    disabled={isSubmittingEval}
                    className="text-xs font-medium flex items-center gap-2 cursor-pointer px-5"
                  >
                    {isSubmittingEval ? "Küldés folyamatban..." : "Önértékelés Beküldése a Vezetőnek"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </form>
            )}

            {/* 2. ESET: Önértékelés elküldve, vezetői értékelésre vár */}
            {kpi.onertekeles_szovege && !isEditingSelfEval && phase === "onertekeles" && (
              <div className="space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">
                        Önértékelésed rögzítve — Vezetői visszajelzésre vár
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        A vezetőd értesítést kapott. Amint elkészül a szakmai értékeléssel, itt azonnal látni fogod.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingSelfEval(true)}
                    className="text-xs shrink-0 cursor-pointer h-8"
                  >
                    <Edit3 className="w-3 h-3 mr-1" />
                    Önértékelés módosítása
                  </Button>
                </div>

                {/* Rögzített eredmények párhuzamos megjelenítése */}
                {isMetric && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border bg-background">
                    <div>
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                        {metricLabels.target}:
                      </span>
                      <span className="text-sm font-semibold text-foreground tabular-nums mt-0.5 block">
                        {formatKpiTargetOnly(kpi)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                        {metricLabels.actual}:
                      </span>
                      <span className="text-sm font-semibold text-primary tabular-nums mt-0.5 block">
                        {formatMetricValue(kpi.aktualis_ertek, kpi.meroszam_tipusa)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-xl border bg-muted/10 space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">Beküldött önértékelésed:</span>
                  <p className="text-xs text-foreground bg-background p-3 rounded-lg border border-border/60 leading-relaxed italic">
                    „{kpi.onertekeles_szovege}”
                  </p>
                </div>
              </div>
            )}

            {/* 3. ESET: Vezetői visszajelzés megérkezett (3. Lépés) */}
            {phase === "vezetoi_ertekeles" && (
              <div className="space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">
                      Vezetői értékelés elkészült — Személyes megbeszélés következik
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      A vezetőd értékelte a célkitűzésedet. A következő lépés a személyes egyeztetés az eredményekről.
                    </p>
                  </div>
                </div>

                {isMetric && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border bg-background">
                    <div>
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                        {metricLabels.target}:
                      </span>
                      <span className="text-sm font-semibold text-foreground tabular-nums mt-0.5 block">
                        {formatKpiTargetOnly(kpi)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                        {metricLabels.actual}:
                      </span>
                      <span className="text-sm font-semibold text-primary tabular-nums mt-0.5 block">
                        {formatMetricValue(kpi.aktualis_ertek, kpi.meroszam_tipusa)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                        Számszerű teljesülés:
                      </span>
                      <span className="text-sm font-semibold text-foreground tabular-nums mt-0.5 block">
                        {kpi.pontszam !== null && kpi.pontszam !== undefined ? `${kpi.pontszam}%` : "—"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border bg-muted/10 space-y-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground">Saját önértékelésed:</span>
                    <p className="text-xs text-foreground bg-background p-3 rounded-lg border border-border/60 leading-relaxed italic">
                      „{kpi.onertekeles_szovege}”
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 space-y-1.5">
                    <span className="text-[11px] font-semibold text-primary">Vezetőd visszajelzése:</span>
                    <p className="text-xs text-foreground bg-background p-3 rounded-lg border border-primary/20 leading-relaxed">
                      „{kpi.ertekeles_szovege}”
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. ESET: Személyes megbeszélés megtörtént (4. Lépés) */}
            {phase === "megbeszeles" && (
              <div className="space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">
                      Személyes megbeszélés lezajlott ({new Date(kpi.megbeszeles_datum || "").toLocaleDateString("hu-HU")})
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      A célkitűzés hamarosan véglegesen hitelesítésre és lezárásra kerül.
                    </p>
                  </div>
                </div>

                {kpi.megbeszeles_megjegyzes && (
                  <div className="p-4 rounded-xl border bg-muted/10 space-y-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground">Megbeszélés jegyzete / megállapodások:</span>
                    <p className="text-xs text-foreground bg-background p-3 rounded-lg border border-border/60 leading-relaxed">
                      „{kpi.megbeszeles_megjegyzes}”
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 5. ESET: Lezárva (5. Lépés) */}
            {phase === "lezart" && (
              <div className="space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-success/10 border border-success/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/20 text-success flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-success">
                      Célkitűzés Sikeresen Lezárva és Hitelesítve
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Az 5 lépéses értékelési folyamat mindegyik pontja befejeződött. Az eredmények archiválva.
                    </p>
                  </div>
                </div>

                {isMetric && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border bg-background">
                    <div>
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                        {metricLabels.target}:
                      </span>
                      <span className="text-sm font-semibold text-foreground tabular-nums mt-0.5 block">
                        {formatKpiTargetOnly(kpi)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                        {metricLabels.actual}:
                      </span>
                      <span className="text-sm font-semibold text-success tabular-nums mt-0.5 block">
                        {formatMetricValue(kpi.aktualis_ertek, kpi.meroszam_tipusa)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                        Végső teljesülés:
                      </span>
                      <span className="text-sm font-semibold text-foreground tabular-nums mt-0.5 block">
                        {kpi.pontszam !== null && kpi.pontszam !== undefined ? `${kpi.pontszam}%` : "—"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {kpi.onertekeles_szovege && (
                    <div className="p-4 rounded-xl border bg-muted/10 space-y-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground">Saját önértékelésed:</span>
                      <p className="text-xs text-foreground bg-background p-3 rounded-lg border border-border/60 leading-relaxed italic">
                        „{kpi.onertekeles_szovege}”
                      </p>
                    </div>
                  )}
                  {kpi.ertekeles_szovege && (
                    <div className="p-4 rounded-xl border bg-muted/10 space-y-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground">Vezetői értékelés:</span>
                      <p className="text-xs text-foreground bg-background p-3 rounded-lg border border-border/60 leading-relaxed">
                        „{kpi.ertekeles_szovege}”
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Célkitűzés rögzítésének dátuma */}
            <div className="p-3.5 rounded-xl border bg-muted/10 flex items-center gap-2 text-xs text-muted-foreground">
              <History className="w-3.5 h-3.5" />
              <span>Célkitűzés dátuma: {kpi.created_at ? new Date(kpi.created_at).toLocaleDateString("hu-HU") : "Kezdetkor"}</span>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

export function EmployeeKpiCard({ 
  kpis, 
  logs = [],
  activeCycleName
}: { 
  kpis: CardKpiItem[]
  logs?: KpiLogItem[] 
  activeCycleName?: string
}) {
  // A felhasználó kérésére alapértelmezetten minden cél bezárva jelenik meg (nem nyílik ki az első cél)
  const [openIds, setOpenIds] = useState<string[]>([])
  const [tab, setTab] = useState<"aktualis" | "lezart">("aktualis")
  const [searchQuery, setSearchQuery] = useState("")

  const activeCount = useMemo(() => {
    return kpis.filter(k => deriveWorkflowPhase(k as any) !== "lezart").length
  }, [kpis])

  const closedCount = useMemo(() => {
    return kpis.filter(k => deriveWorkflowPhase(k as any) === "lezart").length
  }, [kpis])

  const filteredKpis = useMemo(() => {
    return kpis.filter((kpi) => {
      const phase = deriveWorkflowPhase(kpi as any)
      const isClosed = phase === "lezart"

      // 1. Fül szűrés
      if (tab === "aktualis" && isClosed) return false
      if (tab === "lezart" && !isClosed) return false

      // 2. Kereső szűrés
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const title = (kpi.celkituzes || kpi.megnevezes || kpi.ertekeles_szovege || "").toLowerCase()
        const cycle = (kpi.hr_teljesitmeny_ciklus?.megnevezes || activeCycleName || "").toLowerCase()
        const selfEval = (kpi.onertekeles_szovege || "").toLowerCase()
        const mgrEval = (kpi.ertekeles_szovege || "").toLowerCase()

        const matches = title.includes(q) || cycle.includes(q) || selfEval.includes(q) || mgrEval.includes(q)
        if (!matches) return false
      }

      return true
    })
  }, [kpis, tab, searchQuery, activeCycleName])

  if (!kpis || kpis.length === 0) {
    return (
      <Card className="border border-dashed border-border/80 shadow-xs rounded-2xl bg-card">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg text-foreground">Nincsenek aktív célkitűzések</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Jelenleg nincs hozzád rendelt célkitűzés az értékelési ciklusban. A vezetőd fogja hozzárendelni a célokat.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const toggleGoal = (id: string) => {
    setOpenIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-4">
      {/* Felső Szűrősáv: Bal oldalon Kereső, Jobb oldalon Aktuális / Lezárt célkitűzések fülek */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Bal oldal: Keresőmező (ugyanott, mint a vezetői nézetben) */}
        <div className="relative flex-1 min-w-[240px] max-w-lg">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Keresés a célkitűzések között..."
            className="pl-9 pr-8 h-9 text-xs bg-card border-border/80 focus-visible:ring-1"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Jobb oldal: Fülválasztó (ikon és darabszám nélkül!) */}
        <div className="flex items-center gap-1 p-1 bg-muted/30 border border-border/60 rounded-xl shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setTab("aktualis")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
              tab === "aktualis"
                ? "bg-card text-foreground font-semibold shadow-2xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Aktuális célkitűzések
          </button>

          <button
            type="button"
            onClick={() => setTab("lezart")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
              tab === "lezart"
                ? "bg-card text-foreground font-semibold shadow-2xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Lezárt célkitűzések
          </button>
        </div>
      </div>

      {/* Célkitűzések Lista */}
      {filteredKpis.length === 0 ? (
        <div className="p-8 border border-dashed rounded-2xl bg-card text-center space-y-2">
          <p className="text-xs font-medium text-foreground">
            {tab === "lezart" 
              ? "Nincs még lezárt célkitűzésed ebben a ciklusban." 
              : searchQuery 
                ? "Nincs a keresésnek megfelelő célkitűzés." 
                : "Nincs megjeleníthető aktív célkitűzésed."}
          </p>
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="text-xs text-primary h-7 cursor-pointer"
            >
              Keresés törlése
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredKpis.map((kpi) => (
            <GoalListItem
              key={kpi.id}
              kpi={kpi}
              logs={logs}
              activeCycleName={activeCycleName}
              isOpen={openIds.includes(kpi.id)}
              onToggle={() => toggleGoal(kpi.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
