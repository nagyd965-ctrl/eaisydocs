"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  User, 
  Lock, 
  Award, 
  CalendarCheck, 
  History, 
  Check, 
  X, 
  ArrowRight, 
  Calendar, 
  Layers, 
  Scale, 
  Flag, 
  Sparkles, 
  Clock, 
  Edit3
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { addKpiSelfEvaluation, addKpiActivity, updateKpiProgress } from "@/app/hr/performance/actions"
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
        <Badge variant="outline" className="text-xs py-1 px-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-semibold flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          2. Vezetői értékelésre vár
        </Badge>
      )
    case "vezetoi_ertekeles":
      return (
        <Badge variant="outline" className="text-xs py-1 px-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5" />
          3. Vezető értékelt (Megbeszélés következik)
        </Badge>
      )
    case "megbeszeles":
      return (
        <Badge variant="outline" className="text-xs py-1 px-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-semibold flex items-center gap-1.5">
          <CalendarCheck className="w-3.5 h-3.5" />
          4. 1-on-1 Megbeszélés megtörtént
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
  const percent = kpi.pontszam || 0
  const title = kpi.celkituzes || kpi.megnevezes || kpi.ertekeles_szovege || "Névtelen Célkitűzés"
  const phase = deriveWorkflowPhase(kpi as any)
  const [isEditingSelfEval, setIsEditingSelfEval] = useState(false)
  const [binaryVal, setBinaryVal] = useState<"0" | "1">((kpi.aktualis_ertek && kpi.aktualis_ertek > 0) ? "1" : "0")
  const [isSavingProgress, setIsSavingProgress] = useState(false)
  const [isSubmittingEval, setIsSubmittingEval] = useState(false)

  const meroszamTypeFullLabel = 
    kpi.meroszam_tipusa === "szazalek" ? "Százalék (%)" :
    kpi.meroszam_tipusa === "osszeg" ? "Pénzügyi (Ft)" :
    kpi.meroszam_tipusa === "skala" ? "Skála (1–5)" :
    kpi.meroszam_tipusa === "igen_nem" ? "Igen / Nem (Bináris)" : "Darabszám"

  const meroszamUnit = 
    kpi.meroszam_tipusa === "szazalek" ? "%" :
    kpi.meroszam_tipusa === "osszeg" ? "Ft" :
    kpi.meroszam_tipusa === "skala" ? "Pont" :
    kpi.meroszam_tipusa === "igen_nem" ? "" : "db"

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

  // Szűrt naplóbejegyzések ehhez a KPI-hoz
  const relevantLogs = logs.filter(l => l.entitas_id === kpi.id || l.kpi_id === kpi.id)

  return (
    <Card className="border border-border/80 rounded-2xl bg-card shadow-xs overflow-hidden transition-all">
      {/* 1. FEJLÉC SÁV */}
      <div className="p-6 bg-muted/15 border-b border-border/60">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          {/* Bal oldal: Ikon + Cím + Pill-ek */}
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                {title}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs py-0.5 px-2.5 bg-background/80 text-foreground border-border">
                  <Calendar className="w-3 h-3 mr-1 text-muted-foreground" />
                  {kpi.hr_teljesitmeny_ciklus?.megnevezes || activeCycleName || "Aktuális Ciklus"}
                </Badge>
                <Badge variant="outline" className="text-xs py-0.5 px-2.5 bg-background/80 text-foreground border-border">
                  <Layers className="w-3 h-3 mr-1 text-muted-foreground" />
                  {meroszamTypeFullLabel}
                </Badge>
                {kpi.sulyozas && (
                  <Badge variant="outline" className="text-xs py-0.5 px-2.5 bg-background/80 text-foreground border-border tabular-nums">
                    <Scale className="w-3 h-3 mr-1 text-muted-foreground" />
                    Súlyozás: {kpi.sulyozas}x
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs py-0.5 px-2.5 bg-background/80 text-foreground border-border">
                  <Flag className="w-3 h-3 mr-1 text-muted-foreground" />
                  Célérték: {kpi.meroszam_tipusa === "igen_nem" ? "Igen (Kész)" : `${kpi.cel_ertek || 100} ${meroszamUnit}`}
                </Badge>
              </div>
            </div>
          </div>

          {/* Jobb oldal: Fázis jelvény + Nagy Százalék kijelző */}
          <div className="flex flex-wrap items-center sm:items-end justify-between xl:justify-end gap-5 shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-border/40">
            {getPhaseBadge(phase)}

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-baseline justify-end gap-1">
                  <span className={`text-3xl sm:text-4xl font-semibold tabular-nums tracking-tight ${textClass}`}>
                    {percent}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5 tabular-nums">
                  {kpi.meroszam_tipusa === "igen_nem" 
                    ? (kpi.aktualis_ertek && kpi.aktualis_ertek > 0 ? "✓ Teljesítve" : "✕ Folyamatban")
                    : `${kpi.aktualis_ertek ?? 0} / ${kpi.cel_ertek ?? 100} ${meroszamUnit}`}
                </div>
              </div>
              <div className="w-28 sm:w-36">
                <Progress value={percent} className={`h-2.5 ${bgClass} [&>div]:${colorClass}`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MÉRLEGFOLYAMAT (Linear Workflow Stepper) */}
      <div className="p-5 sm:p-6 border-b border-border/60 bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Értékelési Folyamat Mérföldkövei
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {phase === "celkituzes" && "1/5 Lépés: Célkitűzés aktív — Töltsd ki a jobb oldali önértékelést!"}
            {phase === "onertekeles" && "2/5 Lépés: Önértékelés leadva — A vezetői visszajelzésre várunk"}
            {phase === "vezetoi_ertekeles" && "3/5 Lépés: Vezetői értékelés kész — Személyes 1-on-1 megbeszélés következik"}
            {phase === "megbeszeles" && "4/5 Lépés: Megbeszélés lezajlott — Végleges lezárás folyamatban"}
            {phase === "lezart" && "5/5 Lépés: Hitelesítve és lezárva a bónuszelszámoláshoz"}
          </span>
        </div>
        <div className="pt-2 pb-1">
          <KpiWorkflowStepper currentPhase={phase} />
        </div>
      </div>

      {/* 3. TÁGAS KÉTOSZLOPOS MUNKATERÜLET */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-card">
        
        {/* BAL OSZLOP (7 oszlop): Haladás & Teljesülés Követése + Tevékenység Előzmények */}
        <div className="lg:col-span-7 space-y-6">

          {/* Haladási Állapot Kártya */}
          <div className="p-5 rounded-xl border border-border/80 bg-muted/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-primary" />
                Haladási Állapot és Teljesülés
              </span>
              <Badge variant="outline" className="text-xs tabular-nums text-muted-foreground font-normal">
                Súly: {kpi.sulyozas || "1.0"}x
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pt-1">
              <div className="flex items-baseline gap-2.5">
                <span className={`text-3xl font-semibold tabular-nums ${textClass}`}>{percent}%</span>
                <span className="text-xs text-muted-foreground font-medium">
                  {kpi.meroszam_tipusa === "igen_nem" ? (
                    kpi.aktualis_ertek && kpi.aktualis_ertek > 0 ? "✓ Teljesített feladat" : "✕ Folyamatban lévő feladat"
                  ) : (
                    `Jelenlegi állás: ${kpi.aktualis_ertek ?? 0} / ${kpi.cel_ertek ?? 100} ${meroszamUnit}`
                  )}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Elvárt célérték: <strong className="text-foreground">{kpi.meroszam_tipusa === "igen_nem" ? "Igen" : `${kpi.cel_ertek} ${meroszamUnit}`}</strong>
              </div>
            </div>

            <Progress value={percent} className={`h-2.5 ${bgClass} [&>div]:${colorClass}`} />

            {/* Dolgozói Haladás Frissítése (ha nincs lezárva) */}
            {phase !== "lezart" && (
              <div className="pt-4 border-t border-border/60">
                <form
                  action={async (formData) => {
                    setIsSavingProgress(true)
                    try {
                      let newValStr = formData.get("percent") as string
                      if (kpi.meroszam_tipusa === "igen_nem") {
                        newValStr = binaryVal
                      }
                      const newVal = parseFloat(newValStr)
                      const res = await updateKpiProgress(kpi.id, newVal)
                      if (res?.error) toast.error(res.error)
                      else toast.success("Haladásod sikeresen frissítve!")
                    } catch (e: any) {
                      toast.error("Hiba történt a mentéskor.")
                    } finally {
                      setIsSavingProgress(false)
                    }
                  }}
                  className="space-y-3"
                >
                  <label className="text-xs font-semibold text-foreground block">
                    Saját haladásod beállítása és mentése:
                  </label>

                  {kpi.meroszam_tipusa === "igen_nem" ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2.5 p-1 bg-muted/40 border border-input rounded-xl items-center">
                        <button
                          type="button"
                          onClick={() => setBinaryVal("0")}
                          className={cn(
                            "h-11 px-4 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                            binaryVal === "0"
                              ? "bg-background text-foreground shadow-xs border border-border"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          <X className="w-4 h-4 text-destructive" />
                          Nem (Folyamatban)
                        </button>
                        <button
                          type="button"
                          onClick={() => setBinaryVal("1")}
                          className={cn(
                            "h-11 px-4 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                            binaryVal === "1"
                              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          <Check className="w-4 h-4" />
                          Igen (Teljesítve)
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground">
                          {binaryVal === "1" ? "A feladat elkészültnek lesz jelölve (100%)." : "A feladat folyamatban marad (0%)."}
                        </p>
                        <Button 
                          type="submit" 
                          size="sm" 
                          disabled={isSavingProgress}
                          className="h-9 px-4 text-xs font-medium cursor-pointer"
                        >
                          {isSavingProgress ? "Mentés..." : "Haladás Mentése"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="any"
                          name="percent"
                          defaultValue={kpi.aktualis_ertek || 0}
                          min={0}
                          className="w-32 h-9 text-sm tabular-nums bg-background"
                        />
                        <span className="text-xs text-muted-foreground font-medium">
                          / {kpi.cel_ertek || 100} {meroszamUnit}
                        </span>
                      </div>
                      <Button 
                        type="submit" 
                        size="sm" 
                        disabled={isSavingProgress}
                        className="h-9 px-4 text-xs font-medium ml-auto cursor-pointer"
                      >
                        {isSavingProgress ? "Mentés..." : "Haladás Mentése"}
                      </Button>
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>

          {/* Események, Megjegyzések & Idővonal Kártya */}
          <div className="p-5 rounded-xl border border-border/80 bg-card space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 pb-2 border-b border-border/50">
              <History className="w-4 h-4 text-primary" />
              Célkitűzés Életútja és Előzményei
            </span>

            <div className="space-y-3 text-xs">
              {/* 1. Létrehozás esemény */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/20 border border-muted/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Target className="w-4 h-4" />
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
                      ? "Mérőszám típusa: Igen/Nem (Bináris) • Elvárt eredmény: Igen"
                      : `Célérték: ${kpi.cel_ertek} ${meroszamUnit} • Súlyozás: ${kpi.sulyozas || 1}x`}
                  </p>
                </div>
              </div>

              {/* 2. Saját önértékelés esemény (ha leadva) */}
              {kpi.onertekeles_szovege && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">Önértékelésed Beküldve</span>
                      <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                        Leadva
                      </Badge>
                    </div>
                    <p className="text-foreground mt-1.5 bg-background/80 p-3 rounded-lg border border-blue-500/15 leading-relaxed italic">
                      „{kpi.onertekeles_szovege}”
                    </p>
                  </div>
                </div>
              )}

              {/* 3. Vezetői visszajelzés (ha megérkezett) */}
              {kpi.ertekeles_szovege && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-primary">Vezetői Visszajelzés</span>
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                        Értékelve
                      </Badge>
                    </div>
                    <p className="text-foreground mt-1.5 bg-background/80 p-3 rounded-lg border border-primary/15 leading-relaxed">
                      „{kpi.ertekeles_szovege}”
                    </p>
                  </div>
                </div>
              )}

              {/* 4. Megbeszélés (ha rögzítették) */}
              {kpi.megbeszeles_datum && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-purple-600 dark:text-purple-400">1-on-1 Megbeszélés Megtörtént</span>
                      <span className="text-[11px] text-muted-foreground">{new Date(kpi.megbeszeles_datum).toLocaleDateString("hu-HU")}</span>
                    </div>
                    {kpi.megbeszeles_megjegyzes && (
                      <p className="text-muted-foreground mt-1.5 bg-background/80 p-3 rounded-lg border border-purple-500/15 leading-relaxed">
                        {kpi.megbeszeles_megjegyzes}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* További eseménynaplók */}
              {relevantLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/10 border border-border/40">
                  <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5 text-muted-foreground">
                    <History className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{log.felhasznalo_profil?.nev || "Rendszer"}</span>
                      <span className="text-[10px] text-muted-foreground">{log.created_at ? new Date(log.created_at).toLocaleString("hu-HU") : ""}</span>
                    </div>
                    <p className="text-muted-foreground mt-0.5">{log.megjegyzes || log.leiras}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Új bejegyzés / megjegyzés hozzáfűzése */}
            {phase !== "lezart" && (
              <form
                className="flex items-center gap-2 pt-3 border-t border-border/60"
                action={async (formData) => {
                  const msg = formData.get("megjegyzes") as string
                  if (!msg) return
                  const res = await addKpiActivity(kpi.id, msg)
                  if (res?.error) toast.error(res.error)
                  else toast.success("Bejegyzés rögzítve!")
                }}
              >
                <Input
                  type="text"
                  name="megjegyzes"
                  placeholder="Új bejegyzés vagy megjegyzés hozzáfűzése a haladáshoz..."
                  required
                  className="h-9 text-xs flex-1 bg-background"
                />
                <Button type="submit" size="sm" variant="secondary" className="h-9 text-xs shrink-0 cursor-pointer">
                  Hozzáadás
                </Button>
              </form>
            )}
          </div>

        </div>

        {/* JOBB OSZLOP (5 oszlop): Kiemelt Önértékelési Munkaterület */}
        <div className="lg:col-span-5 space-y-6">

          <div className="p-5 rounded-xl border border-border/80 bg-card space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="w-4 h-4 text-primary" />
                Dolgozói Önértékelés
              </span>
              <Badge variant="outline" className="text-xs font-normal">
                {phase === "celkituzes" && "Kitöltendő"}
                {phase === "onertekeles" && "Vezetői értékelésre vár"}
                {phase === "vezetoi_ertekeles" && "Megbeszélés előtt"}
                {phase === "megbeszeles" && "Lezárás előtt"}
                {phase === "lezart" && "Lezárva"}
              </Badge>
            </div>

            {/* 1. ESET: Még nincs leadva az önértékelés VAGY a felhasználó szerkeszti */}
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
                className="space-y-4 p-4 rounded-xl border bg-primary/5 border-primary/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <User className="w-4 h-4" />
                    {isEditingSelfEval ? "Önértékelés Módosítása" : "Saját Önértékelés Leadása"}
                  </div>
                  <Badge className="bg-primary text-primary-foreground border-0 text-[10px] font-semibold">
                    Te jössz!
                  </Badge>
                </div>

                <div className="p-3 rounded-lg bg-background/60 border border-primary/10 text-[11px] text-muted-foreground space-y-1">
                  <span className="font-semibold text-foreground block">Tippek a hatékony önértékeléshez:</span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Milyen konkrét funkciókat, mérföldköveket vagy eredményeket értél el?</li>
                    <li>Milyen nehézségek adódtak a megvalósítás során és hogyan küzdötted le őket?</li>
                    <li>Miben fejlődtél a feladat elvégzése által?</li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground block">
                    Önértékelésed részletes leírása:
                  </label>
                  <Textarea
                    name="ertekelesSzovege"
                    defaultValue={kpi.onertekeles_szovege || ""}
                    placeholder="Pl. A megadott funkciót határidőre és a specifikációnak megfelelő minőségben szállítottam. A folyamat során az alábbi mérföldköveket teljesítettem..."
                    required
                    className="min-h-[160px] text-xs bg-background leading-relaxed"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {isEditingSelfEval && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditingSelfEval(false)}
                      className="text-xs flex-1 cursor-pointer"
                    >
                      Mégse
                    </Button>
                  )}
                  <Button 
                    type="submit" 
                    size="sm" 
                    disabled={isSubmittingEval}
                    className="w-full text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmittingEval ? "Küldés folyamatban..." : "Önértékelés Beküldése a Vezetőnek"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </form>
            )}

            {/* 2. ESET: Önértékelés leadva és nincs szerkesztési módban */}
            {kpi.onertekeles_szovege && !isEditingSelfEval && (
              <div className="p-4 rounded-xl border border-border/80 bg-muted/15 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="text-xs font-semibold text-foreground">Önértékelésed Rögzítve</span>
                  </div>
                  {phase === "onertekeles" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingSelfEval(true)}
                      className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      Módosítás
                    </Button>
                  )}
                </div>

                <div className="p-3.5 rounded-lg bg-background border border-border/60 text-xs leading-relaxed italic text-foreground">
                  „{kpi.onertekeles_szovege}”
                </div>

                {phase === "onertekeles" && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Vezetői elbírálásra vár
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      A vezetőd értesítést kapott a beküldésről. Amint elkészül az értékeléssel és a pontszámmal, az eredmény itt azonnal megjelenik.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 3. ESET: Vezetői visszajelzés elkészült */}
            {phase === "vezetoi_ertekeles" && kpi.ertekeles_szovege && (
              <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Award className="w-4 h-4" />
                  Vezetői Értékelés Beérkezett
                </div>
                <div className="p-3.5 rounded-lg bg-background border border-primary/20 text-xs leading-relaxed text-foreground">
                  „{kpi.ertekeles_szovege}”
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  A vezetőd értékelte a teljesítményedet. A következő lépés a személyes 1-on-1 kiértékelő megbeszélés megtartása.
                </p>
              </div>
            )}

            {/* 4. ESET: 1-on-1 Megbeszélés lezajlott */}
            {phase === "megbeszeles" && (
              <div className="p-4 rounded-xl border bg-purple-500/5 border-purple-500/20 space-y-2 text-center">
                <div className="w-9 h-9 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-purple-600 dark:text-purple-400">1-on-1 Megbeszélés Megtörtént</h4>
                <p className="text-[11px] text-muted-foreground">
                  A vezető hamarosan véglegesíti a cél lezárását és a bónuszelszámolást.
                </p>
              </div>
            )}

            {/* 5. ESET: Lezárva */}
            {phase === "lezart" && (
              <div className="p-5 rounded-xl border bg-success/5 border-success/20 space-y-2 text-center">
                <div className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-semibold text-success">Célkitűzés Hitelesítve és Lezárva</h4>
                <p className="text-[11px] text-muted-foreground">
                  Végleges elért eredmény: <strong className="text-foreground">{percent}%</strong>
                </p>
              </div>
            )}

          </div>

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
              <span className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-semibold tabular-nums",
                isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {kpi.pontszam || 0}%
              </span>
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
          Összes cél egyben ({kpis.length})
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
