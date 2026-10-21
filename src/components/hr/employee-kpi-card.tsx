"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Target, TrendingUp, CheckCircle2, User, Lock, Award, CalendarCheck, MessageSquare, History, Check, X, ArrowRight } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
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
  hr_teljesitmeny_ciklus?: { megnevezes?: string } | null
  ertekelt_idoszak?: string | null
  created_at?: string
  sulyozas?: number | null
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
        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 font-semibold animate-pulse">
          2. Te jössz! (Önértékelés)
        </Badge>
      )
    case "vezetoi_ertekeles":
      return (
        <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30 font-medium">
          3. Vezetői értékelés alatt
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

export function EmployeeKpiCard({ 
  kpis, 
  logs = [] 
}: { 
  kpis: CardKpiItem[]
  logs?: KpiLogItem[] 
}) {
  if (!kpis || kpis.length === 0) {
    return (
      <Card className="border border-dashed shadow-xs">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">Nincsenek rögzített célkitűzések</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Jelenleg nincs aktív célkitűzésed az értékelési ciklusban. A vezetőd fogja hozzárendelni a célokat.
          </p>
        </CardContent>
      </Card>
    )
  }

  const avgScore = Math.round(kpis.reduce((acc, curr) => acc + (curr.pontszam || 0), 0) / kpis.length)

  return (
    <div className="space-y-4">
      {/* Célkitűzések összefoglaló sáv */}
      <Card className="border shadow-xs bg-card">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Célkitűzéseim és Értékelésem</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Összesen {kpis.length} db kitűzött cél az aktuális időszakban
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:justify-end">
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Átlagos Teljesülés</p>
                <div className="flex items-center gap-2">
                  <Progress value={avgScore} className="w-24 sm:w-28 h-2" />
                  <span className="font-semibold text-sm text-primary tabular-nums">{avgScore}%</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4 space-y-3">
          <Accordion type="multiple" className="w-full space-y-3">
            {kpis.map((kpi) => {
              const percent = kpi.pontszam || 0
              const text = kpi.celkituzes || kpi.megnevezes || kpi.ertekeles_szovege || "Nincs megadva"
              const phase = deriveWorkflowPhase(kpi as any)

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

              const isMyTurn = phase === "celkituzes" || phase === "onertekeles"

              return (
                <AccordionItem 
                  key={kpi.id} 
                  value={kpi.id} 
                  className="border rounded-xl bg-card overflow-hidden transition-all hover:border-primary/40 shadow-2xs"
                >
                  <AccordionTrigger className="hover:no-underline p-3.5 sm:p-4 hover:bg-muted/15 transition-colors cursor-pointer w-full text-left">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full pr-4">
                      {/* Bal oldal: Ikon + Cím + Ciklus */}
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                          <Target className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {text}
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
                                ? (kpi.aktualis_ertek && kpi.aktualis_ertek > 0 ? "Teljesítve" : "Folyamatban")
                                : `${kpi.aktualis_ertek ?? 0} / ${kpi.cel_ertek ?? 100} ${meroszamLabel}`}
                            </div>
                          </div>
                          <Progress value={percent} className={`w-20 sm:w-28 h-2 ${bgClass} [&>div]:${colorClass}`} />
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="p-0 border-t bg-muted/5">
                    <div className="p-4 sm:p-6 space-y-6">

                      {/* Felső Fáziskövető Kártya (Linear Stepper) */}
                      <div className="p-4 rounded-xl border bg-card shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b mb-3">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Munkafolyamat Állapota
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {phase === "celkituzes" && "1. Lépés: Célkitűzés aktív, készítsd elő az önértékelésed"}
                            {phase === "onertekeles" && "2. Lépés: Önértékelés leadva, a vezetőd értékeli az eredményt"}
                            {phase === "vezetoi_ertekeles" && "3. Lépés: Vezetői értékelés kész, személyes megbeszélés következik"}
                            {phase === "megbeszeles" && "4. Lépés: Megbeszélés lezajlott, lezárási folyamatban"}
                            {phase === "lezart" && "5. Lépés: Hitelesítve és lezárva a bónuszelszámoláshoz"}
                          </span>
                        </div>
                        <KpiWorkflowStepper currentPhase={phase} />
                      </div>

                      {/* 2 Oszlopos Munkaterület */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* BAL OLDAL (7 oszlop): Teljesülés & Saját frissítés & Előzmények */}
                        <div className="lg:col-span-7 space-y-5">
                          
                          {/* Haladás Kártya */}
                          <div className="p-4 rounded-xl border bg-card shadow-2xs space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                Jelenlegi Állás és Teljesülés
                              </span>
                              <Badge variant="outline" className="text-xs tabular-nums text-muted-foreground font-normal">
                                Súly: {kpi.sulyozas || "1.0"}x
                              </Badge>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                              <div className="flex items-baseline gap-2">
                                <span className={`text-3xl font-semibold tabular-nums ${textClass}`}>{percent}%</span>
                                <span className="text-xs text-muted-foreground">
                                  {kpi.meroszam_tipusa === "igen_nem" ? (
                                    kpi.aktualis_ertek && kpi.aktualis_ertek > 0 ? "✓ Teljesítve" : "✕ Folyamatban (Még nincs kész)"
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

                            {/* Dolgozói állapot frissítés (ha nincs lezárva) */}
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
                                    else toast.success("Haladásod sikeresen frissítve!")
                                  }}
                                  className="space-y-3"
                                >
                                  <span className="text-xs font-medium text-foreground block">
                                    Saját haladásod frissítése:
                                  </span>

                                  {kpi.meroszam_tipusa === "igen_nem" ? (
                                    <div className="flex items-center gap-3">
                                      <KpiBinaryProgressControl initialValue={(kpi.aktualis_ertek && kpi.aktualis_ertek > 0) ? "1" : "0"} />
                                      <Button type="submit" size="sm" variant="secondary" className="h-9 text-xs shrink-0">
                                        Mentés
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

                          {/* Tevékenység napló & Megjegyzések */}
                          <div className="p-4 rounded-xl border bg-card shadow-2xs space-y-4">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 pb-2 border-b">
                              <History className="w-4 h-4 text-primary" />
                              Tevékenységek & Előzmények
                            </span>

                            <div className="space-y-3 text-xs">
                              {/* Rögzítés */}
                              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-muted/50">
                                <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                  <Target className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-foreground">Célkitűzés Létrehozva</span>
                                    <span className="text-[11px] text-muted-foreground">
                                      {kpi.created_at ? new Date(kpi.created_at).toLocaleDateString("hu-HU") : ""}
                                    </span>
                                  </div>
                                  <p className="text-muted-foreground mt-0.5">
                                    {kpi.meroszam_tipusa === "igen_nem" 
                                      ? `Elvárt: Igen • Kezdő állapot: ${kpi.aktualis_ertek && kpi.aktualis_ertek > 0 ? "Igen" : "Nem"}`
                                      : `Célérték: ${kpi.cel_ertek} ${meroszamLabel} • Kezdő érték: ${kpi.aktualis_ertek || 0} ${meroszamLabel}`}
                                  </p>
                                </div>
                              </div>

                              {/* Saját önértékelés (ha leadva) */}
                              {kpi.onertekeles_szovege && (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-info/5 border border-info/20">
                                  <div className="w-7 h-7 rounded-md bg-info/10 text-info flex items-center justify-center shrink-0 mt-0.5">
                                    <User className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-semibold text-info">Saját Önértékelésed</span>
                                      <Badge variant="outline" className="text-[10px] bg-info/10 text-info border-info/30">Leadva</Badge>
                                    </div>
                                    <p className="text-foreground mt-1 bg-background p-2.5 rounded border border-info/10 leading-relaxed italic">
                                      „{kpi.onertekeles_szovege}”
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Vezetői értékelés (ha megérkezett) */}
                              {kpi.ertekeles_szovege && (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                                  <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                                    <Award className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-semibold text-primary">Vezetői Visszajelzés</span>
                                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">Rögzítve</Badge>
                                    </div>
                                    <p className="text-foreground mt-1 bg-background p-2.5 rounded border border-primary/10 leading-relaxed">
                                      „{kpi.ertekeles_szovege}”
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Megbeszélés */}
                              {kpi.megbeszeles_datum && (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-muted">
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
                            </div>

                            {/* Új bejegyzés űrlap */}
                            {phase !== "lezart" && (
                              <form
                                className="flex items-center gap-2 pt-3 border-t"
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
                                  placeholder="Megjegyzés hozzáfűzése a haladáshoz..."
                                  required
                                  className="h-9 text-xs flex-1"
                                />
                                <Button type="submit" size="sm" variant="outline" className="h-9 text-xs shrink-0">
                                  Küldés
                                </Button>
                              </form>
                            )}
                          </div>

                        </div>

                        {/* JOBB OLDAL (5 oszlop): Önértékelés Űrlap & Értékelési Státusz */}
                        <div className="lg:col-span-5 space-y-5">
                          
                          <div className="p-4 rounded-xl border bg-card shadow-2xs space-y-4">
                            <div className="flex items-center justify-between pb-2 border-b">
                              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <User className="w-4 h-4 text-primary" />
                                Dolgozói Önértékelés
                              </span>
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {phase === "celkituzes" && "Kitöltendő"}
                                {phase === "onertekeles" && "Vezetőre vár"}
                                {phase === "vezetoi_ertekeles" && "Megbeszélés"}
                                {phase === "megbeszeles" && "Zárás előtt"}
                                {phase === "lezart" && "Lezárva"}
                              </Badge>
                            </div>

                            {/* 1. FÁZIS: Még nem adta le az önértékelést */}
                            {!kpi.onertekeles_szovege && phase === "celkituzes" && (
                              <form
                                action={async (formData) => {
                                  const evalText = formData.get("ertekelesSzovege") as string
                                  if (!evalText) return
                                  const res = await addKpiSelfEvaluation(kpi.id, evalText)
                                  if (res?.error) toast.error(res.error)
                                  else toast.success("Önértékelésedet sikeresen elküldted a vezetődnek!")
                                }}
                                className="space-y-3 p-3.5 rounded-lg border bg-primary/5 border-primary/20"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                    <User className="w-3.5 h-3.5" />
                                    Önértékelés Leadása
                                  </div>
                                  <Badge className="bg-primary/10 text-primary border-0 text-[10px]">Te jössz!</Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                  Írd le részletesen az elért eredményeidet, sikereidet vagy a felmerült nehézségeket. A beküldés után a vezetőd megkapja az értékelést.
                                </p>
                                <Textarea
                                  name="ertekelesSzovege"
                                  placeholder="Pl. A feladatot határidőre elvégeztem, a specifikációnak megfelelő minőségben sikerült átadni..."
                                  required
                                  className="min-h-[120px] text-xs bg-background"
                                />
                                <Button type="submit" size="sm" className="w-full text-xs">
                                  Önértékelés Beküldése a Vezetőnek
                                </Button>
                              </form>
                            )}

                            {/* 2. FÁZIS: Önértékelés leadva, vezetőre várunk */}
                            {kpi.onertekeles_szovege && phase === "onertekeles" && (
                              <div className="p-4 rounded-lg border border-dashed border-border bg-muted/20 space-y-3 text-center">
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                                  <Award className="w-5 h-5 text-primary" />
                                </div>
                                <div className="space-y-1">
                                  <h4 className="text-xs font-semibold text-foreground">Önértékelésed elküldve!</h4>
                                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    A vezetőd értesítést kapott és hamarosan rögzíti a vezetői értékelést és a javasolt pontszámot.
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-[10px] bg-background text-muted-foreground font-normal">
                                  Következő lépés: Vezetői visszajelzés
                                </Badge>
                              </div>
                            )}

                            {/* 3. FÁZIS: Vezetői értékelés megvan, megbeszélésre vár */}
                            {phase === "vezetoi_ertekeles" && (
                              <div className="p-4 rounded-lg border bg-primary/5 border-primary/20 space-y-3 text-center">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                                  <CalendarCheck className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                  <h4 className="text-xs font-semibold text-primary">Vezetői értékelés beérkezett</h4>
                                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    A vezetőd kiértékelte a célodat. A következő lépés a személyes 1-on-1 kiértékelő megbeszélés.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* 4. FÁZIS: Megbeszélés lezajlott */}
                            {phase === "megbeszeles" && (
                              <div className="p-4 rounded-lg border bg-muted/30 space-y-2 text-center">
                                <h4 className="text-xs font-semibold text-foreground">Megbeszélés lezajlott</h4>
                                <p className="text-[11px] text-muted-foreground">
                                  A vezető hamarosan véglegesíti a cél lezárását és a bónuszelszámolást.
                                </p>
                              </div>
                            )}

                            {/* 5. FÁZIS: Lezárva */}
                            {phase === "lezart" && (
                              <div className="p-4 rounded-lg border bg-success/5 border-success/20 space-y-2 text-center">
                                <div className="w-9 h-9 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
                                  <Lock className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                  <h4 className="text-xs font-semibold text-success">Célkitűzés Hitelesítve és Lezárva</h4>
                                  <p className="text-[11px] text-muted-foreground">
                                    Végleges elért eredmény: <strong>{percent}%</strong>
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
    </div>
  )
}
