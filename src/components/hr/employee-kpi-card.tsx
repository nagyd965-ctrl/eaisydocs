"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Target, 
  CheckCircle2, 
  User, 
  Lock, 
  Award, 
  CalendarCheck, 
  History, 
  MessageSquare, 
  ArrowRight, 
  Calendar, 
  Scale, 
  Sparkles, 
  Clock, 
  Edit3
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { addKpiSelfEvaluation, addKpiActivity } from "@/app/hr/performance/actions"
import { KpiWorkflowStepper, deriveWorkflowPhase } from "@/components/hr/kpi-workflow-stepper"
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
        <Badge variant="outline" className="text-xs py-1 px-2.5 bg-primary/10 text-primary border-primary/20 font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          1. Célkitűzés (Önértékelésre vár)
        </Badge>
      )
    case "onertekeles":
      return (
        <Badge variant="outline" className="text-xs py-1 px-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          2. Önértékelés leadva (Vezetőre vár)
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
          4. Megbeszélés lezajlott (Zárás előtt)
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

function SingleGoalWorkspace({ 
  kpi, 
  logs = [], 
  activeCycleName 
}: { 
  kpi: CardKpiItem
  logs?: KpiLogItem[]
  activeCycleName?: string 
}) {
  const title = kpi.celkituzes || kpi.megnevezes || kpi.ertekeles_szovege || "Névtelen Célkitűzés"
  const phase = deriveWorkflowPhase(kpi as any)
  const [isEditingSelfEval, setIsEditingSelfEval] = useState(false)
  const [isSubmittingEval, setIsSubmittingEval] = useState(false)

  // Szűrt naplóbejegyzések
  const relevantLogs = logs.filter(l => l.entitas_id === kpi.id || l.kpi_id === kpi.id)

  return (
    <Card className="border border-border/80 rounded-2xl bg-card shadow-xs overflow-hidden transition-all">
      {/* 1. FEJLÉC SÁV (NINCS % és NINCS progress bar!) */}
      <div className="p-6 bg-muted/15 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Bal oldal: Ikon + Cím + Pill-ek */}
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Target className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                {title}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <Badge variant="outline" className="text-xs py-0.5 px-2.5 bg-background text-foreground border-border">
                  <Calendar className="w-3 h-3 mr-1 text-muted-foreground" />
                  {kpi.hr_teljesitmeny_ciklus?.megnevezes || activeCycleName || "Aktuális Ciklus"}
                </Badge>
                {kpi.sulyozas && (
                  <Badge variant="outline" className="text-xs py-0.5 px-2.5 bg-background text-foreground border-border tabular-nums">
                    <Scale className="w-3 h-3 mr-1 text-muted-foreground" />
                    Súlyozás: {kpi.sulyozas}x
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Jobb oldal: Fázis jelvény */}
          <div className="shrink-0">
            {getPhaseBadge(phase)}
          </div>
        </div>
      </div>

      {/* 2. MÉRLEGFOLYAMAT (Linear Workflow Stepper az 5 lépéssel) */}
      <div className="p-5 sm:p-6 border-b border-border/60 bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Értékelési Folyamat Lépései
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {phase === "celkituzes" && "1. Lépés: Célkitűzés aktív — Töltsd ki az önértékelést a jobb oldali munkalapon!"}
            {phase === "onertekeles" && "2. Lépés: Önértékelés leadva — A vezetői visszajelzésre várunk"}
            {phase === "vezetoi_ertekeles" && "3. Lépés: Vezetői értékelés kész — Személyes 1-on-1 megbeszélés következik"}
            {phase === "megbeszeles" && "4. Lépés: Megbeszélés lezajlott — Végleges lezárás folyamatban"}
            {phase === "lezart" && "5. Lépés: Hitelesítve és lezárva"}
          </span>
        </div>
        <div className="pt-2 pb-1">
          <KpiWorkflowStepper currentPhase={phase} />
        </div>
      </div>

      {/* 3. EGYSÉGES, TISZTA MUNKATERÜLET (Egyetlen fókuszált kártya!) */}
      <div className="p-6 space-y-5 bg-card">
        
        {/* 1. ESET: Kitöltendő önértékelés (vagy módosítás) */}
        {(!kpi.onertekeles_szovege || isEditingSelfEval) && phase !== "lezart" && (
          <form
            action={async (formData) => {
              setIsSubmittingEval(true)
              try {
                const evalText = formData.get("ertekelesSzovege") as string
                if (!evalText) return
                const res = await addKpiSelfEvaluation(kpi.id, evalText)
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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Önértékelésed szövege:
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
                  Vezetői értékelés elkészült — 1-on-1 Megbeszélés következik
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  A vezetőd értékelte a célkitűzésedet. A következő lépés a személyes egyeztetés az eredményekről.
                </p>
              </div>
            </div>

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

        {/* 4. ESET: 1-on-1 Megbeszélés megtörtént (4. Lépés) */}
        {phase === "megbeszeles" && (
          <div className="space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-foreground">
                  1-on-1 Személyes Megbeszélés Lezajlott ({new Date(kpi.megbeszeles_datum || "").toLocaleDateString("hu-HU")})
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

        {/* Diszkrét megjegyzés és előzmények sáv */}
        <div className="p-3.5 rounded-xl border bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <History className="w-3.5 h-3.5" />
            <span>Célkitűzés dátuma: {kpi.created_at ? new Date(kpi.created_at).toLocaleDateString("hu-HU") : "Kezdetkor"}</span>
          </div>
          {phase !== "lezart" && (
            <form
              className="flex items-center gap-2 w-full sm:w-auto"
              action={async (formData) => {
                const msg = formData.get("megjegyzes") as string
                if (!msg) return
                const res = await addKpiActivity(kpi.id, msg)
                if (res?.error) toast.error(res.error)
                else toast.success("Megjegyzés sikeresen rögzítve!")
              }}
            >
              <Input
                type="text"
                name="megjegyzes"
                placeholder="Megjegyzés hozzáfűzése..."
                required
                className="h-8 text-xs w-full sm:w-80 bg-background"
              />
              <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs shrink-0 cursor-pointer">
                Küldés
              </Button>
            </form>
          )}
        </div>

      </div>
    </Card>
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
  const [selectedGoalId, setSelectedGoalId] = useState<string>(kpis[0]?.id || "")

  if (!kpis || kpis.length === 0) {
    return (
      <Card className="border border-dashed border-border/80 shadow-xs rounded-2xl bg-card">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <Target className="w-7 h-7" />
          </div>
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

  // Ha csak 1 cél van, azt mutatjuk közvetlenül
  if (kpis.length === 1) {
    return (
      <div className="space-y-6">
        <SingleGoalWorkspace kpi={kpis[0]} logs={logs} activeCycleName={activeCycleName} />
      </div>
    )
  }

  // Ha több cél van, lapozható tab-sor vagy összes cél nézet
  const activeKpi = kpis.find(k => k.id === selectedGoalId) || kpis[0]

  return (
    <div className="space-y-6">
      {/* Cél választó sáv több cél esetén */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {kpis.map((kpi) => {
          const isActive = selectedGoalId === kpi.id
          const phase = deriveWorkflowPhase(kpi as any)
          const isPendingEval = !kpi.onertekeles_szovege && phase === "celkituzes"

          return (
            <button
              key={kpi.id}
              type="button"
              onClick={() => setSelectedGoalId(kpi.id)}
              className={cn(
                "flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all shrink-0 border cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                  : "bg-card text-foreground hover:bg-muted/40 border-border"
              )}
            >
              <Target className={cn("w-3.5 h-3.5", isActive ? "text-primary-foreground" : "text-primary")} />
              <span className="max-w-[220px] truncate">{kpi.celkituzes || kpi.megnevezes}</span>
              {isPendingEval && (
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  isActive ? "bg-primary-foreground" : "bg-primary animate-pulse"
                )} />
              )}
            </button>
          )
        })}

        <button
          type="button"
          onClick={() => setSelectedGoalId("all")}
          className={cn(
            "px-4 py-2.5 rounded-xl text-xs font-medium transition-all shrink-0 border cursor-pointer ml-auto",
            selectedGoalId === "all"
              ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
              : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40 border-border"
          )}
        >
          Összes cél ({kpis.length})
        </button>
      </div>

      {/* Megjelenítés */}
      {selectedGoalId === "all" ? (
        <div className="space-y-8">
          {kpis.map((kpi) => (
            <SingleGoalWorkspace key={kpi.id} kpi={kpi} logs={logs} activeCycleName={activeCycleName} />
          ))}
        </div>
      ) : (
        <SingleGoalWorkspace kpi={activeKpi} logs={logs} activeCycleName={activeCycleName} />
      )}
    </div>
  )
}
