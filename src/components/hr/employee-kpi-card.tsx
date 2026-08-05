"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Target, TrendingUp, CheckCircle2, User, Lock, Award, CalendarCheck } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { addKpiSelfEvaluation, addKpiActivity } from "@/app/hr/performance/actions"
import { KpiWorkflowStepper, deriveWorkflowPhase } from "@/components/hr/kpi-workflow-stepper"

export function EmployeeKpiCard({ kpis, logs = [] }: { kpis: any[], logs?: any[] }) {
  if (!kpis || kpis.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="w-4 h-4" /> Aktuális Célkitűzések
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 text-center space-y-3">
            <Target className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nincs aktív teljesítményértékelési ciklus.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const avgScore = Math.round(kpis.reduce((acc: number, curr: any) => acc + (curr.pontszam || 0), 0) / kpis.length)

  return (
    <Card>
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" /> Aktuális Célkitűzések
          </CardTitle>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Átlagos Teljesülés</p>
            <div className="flex items-center gap-2">
              <Progress value={avgScore} className="w-20 h-2 bg-primary/20" />
              <span className="font-semibold text-sm text-primary tabular-nums">{avgScore}%</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4 max-h-[500px] overflow-y-auto">
        <Accordion className="w-full">
        {kpis.map((kpi) => {
          const percent = kpi.pontszam || 0
          const text = kpi.celkituzes || kpi.ertekeles_szovege || "Nincs megadva"
          const phase = deriveWorkflowPhase(kpi)

          let colorClass = "bg-primary"
          let bgClass = "bg-primary/20"
          let textClass = "text-primary"

          if (percent >= 80) {
            colorClass = "bg-green-600"; bgClass = "bg-green-100 dark:bg-green-950"; textClass = "text-green-600"
          } else if (percent <= 30) {
            colorClass = "bg-orange-500"; bgClass = "bg-orange-100 dark:bg-orange-950"; textClass = "text-orange-500"
          }

          const isMyTurn = phase === "celkituzes"

          return (
            <AccordionItem key={kpi.id} value={kpi.id} className="border rounded-md bg-card shadow-sm px-3 mb-3">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-start justify-between gap-4 w-full pr-4 text-left">
                  <div>
                    <h4 className="font-medium text-sm">{text}</h4>
                    <p className="text-xs text-muted-foreground mt-1">Ciklus: {kpi.hr_teljesitmeny_ciklus?.megnevezes || kpi.ertekelt_idoszak || "-"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isMyTurn && (
                      <Badge className="bg-primary/10 text-primary border-0 text-[10px] animate-pulse">Te jössz!</Badge>
                    )}
                    {phase === "lezart" ? (
                      <div className="flex items-center justify-center bg-success/10 w-10 h-10 rounded-full">
                        <Lock className="w-5 h-5 text-success" />
                      </div>
                    ) : percent >= 100 ? (
                      <div className="flex items-center justify-center bg-green-100 dark:bg-green-950 w-10 h-10 rounded-full">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center bg-muted w-10 h-10 rounded-full">
                        <TrendingUp className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="space-y-4 pt-2 pb-4">
                {/* Workflow Stepper — teljes címkékkel */}
                <div className="pb-3 border-b">
                  <KpiWorkflowStepper currentPhase={phase} />
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Folyamat:</span>
                    <span className={`font-semibold ${textClass}`}>
                      {kpi.meroszam_tipusa === "igen_nem"
                        ? (kpi.aktualis_ertek > 0 ? "Teljesítve" : "Nincs teljesítve")
                        : `${kpi.aktualis_ertek || 0} / ${kpi.cel_ertek || 100} ${kpi.meroszam_tipusa === "szazalek" ? "%" : kpi.meroszam_tipusa === "osszeg" ? "HUF" : kpi.meroszam_tipusa === "skala" ? "Pont" : "Db"}`
                      }
                      {" "}({percent}%)
                    </span>
                  </div>
                  <Progress value={percent} className={`h-1.5 ${bgClass} [&>div]:${colorClass}`} />
                </div>

                {/* ---- Egyszerűsített dolgozói nézet (nincs részletes napló) ---- */}
                <div className="space-y-4 pt-3 border-t">

                  {/* Állapot frissítése — ha nincs lezárva */}
                  {phase !== "lezart" && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" /> Állapot frissítése
                      </h5>
                      <form
                        className="flex items-center gap-3"
                        action={async (formData) => {
                          let newValStr = formData.get("percent") as string;
                          if (kpi.meroszam_tipusa === "igen_nem") {
                            newValStr = formData.get("igen_nem_val") === "on" ? "1" : "0";
                          }
                          const newVal = parseFloat(newValStr);
                          const { updateKpiProgress } = await import("@/app/hr/performance/actions");
                          const res = await updateKpiProgress(kpi.id, newVal);
                          if (res?.error) toast.error(res.error);
                          else toast.success("Állapot sikeresen frissítve!");
                        }}
                      >
                        {kpi.meroszam_tipusa === "igen_nem" ? (
                          <div className="flex items-center gap-2">
                            <input type="checkbox" name="igen_nem_val" defaultChecked={kpi.aktualis_ertek > 0} className="h-4 w-4 rounded border-gray-300" />
                            <span className="text-sm">Teljesítve</span>
                          </div>
                        ) : (
                          <>
                            <Input key={`input-${kpi.id}-${kpi.aktualis_ertek}`} type="number" step="0.01" name="percent" defaultValue={kpi.aktualis_ertek || 0} min={0} className="w-32 h-8 text-sm" />
                            <span className="text-sm font-medium">
                              / {kpi.cel_ertek || 100} {kpi.meroszam_tipusa === "szazalek" ? "%" : kpi.meroszam_tipusa === "osszeg" ? "HUF" : kpi.meroszam_tipusa === "skala" ? "Pont" : "Db"}
                            </span>
                          </>
                        )}
                        <Button type="submit" size="sm" variant="secondary" className="h-8">Frissítés</Button>
                      </form>
                    </div>
                  )}

                  {/* Aktivitás rögzítése — ha nincs lezárva */}
                  {phase !== "lezart" && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                        Megjegyzés hozzáfűzése
                      </h5>
                      <form
                        className="flex items-center gap-3"
                        action={async (formData) => {
                          const msg = formData.get("megjegyzes") as string;
                          if (!msg) return;
                          const res = await addKpiActivity(kpi.id, msg);
                          if (res?.error) toast.error(res.error);
                          else toast.success("Megjegyzés sikeresen rögzítve!");
                        }}
                      >
                        <Input type="text" name="megjegyzes" placeholder="Pl: Elvégeztem a feladatot..." required className="flex-1 h-8 text-sm" />
                        <Button type="submit" size="sm" variant="outline" className="h-8">Hozzáadás</Button>
                      </form>
                    </div>
                  )}

                  {/* Önértékelés leadása — ha még nem adta le */}
                  {(!kpi.onertekeles_szovege && phase === "celkituzes") && (
                    <form
                      className="pt-3 border-t space-y-3"
                      action={async (formData) => {
                        const evalText = formData.get("ertekelesSzovege") as string;
                        if (!evalText) return;
                        const res = await addKpiSelfEvaluation(kpi.id, evalText);
                        if (res?.error) toast.error(res.error);
                        else toast.success("Önértékelés sikeresen elküldve!");
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-sm flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" /> Önértékelés leadása
                        </h5>
                        <Badge className="bg-primary/10 text-primary border-0 text-[10px]">Te jössz!</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Értékeld a saját teljesítményedet, majd küld el a vezetődnek.</p>
                      <Textarea
                        name="ertekelesSzovege"
                        placeholder="Írd le, hogyan értékeled a teljesítményedet ennél a célnál..."
                        required
                        className="min-h-[80px]"
                      />
                      <Button type="submit" size="sm" className="w-full">Önértékelés elküldése</Button>
                    </form>
                  )}

                  {/* Önértékelés elküldve jelzés */}
                  {kpi.onertekeles_szovege && (
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-sm">Önértékelésedet leadtad</span>
                        <Badge className="bg-success/10 text-success border-0 text-[10px]">✓ Elküldve</Badge>
                      </div>
                      <p className="text-sm bg-blue-500/5 p-3 rounded-md border border-blue-500/20">
                        {kpi.onertekeles_szovege}
                      </p>
                    </div>
                  )}

                  {/* Vezetői értékelés — ha már megérkezett */}
                  {kpi.ertekeles_szovege && (
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">Vezetői értékelés</span>
                      </div>
                      <p className="text-sm bg-primary/5 p-3 rounded-md border border-primary/20">
                        {kpi.ertekeles_szovege}
                      </p>
                    </div>
                  )}

                  {/* Megbeszélés jelzés */}
                  {kpi.megbeszeles_datum && (
                    <div className="pt-3 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarCheck className="w-4 h-4 text-purple-500" />
                        <span className="font-medium">Értékelő megbeszélés megtörtént</span>
                        <span className="text-xs text-muted-foreground">{new Date(kpi.megbeszeles_datum).toLocaleDateString("hu-HU")}</span>
                      </div>
                    </div>
                  )}

                  {/* Státusz jelzések */}
                  {phase === "onertekeles" && (
                    <div className="flex items-center gap-2 justify-center py-3 rounded-md bg-muted text-muted-foreground text-sm">
                      <Award className="w-4 h-4" /> Várakozás a vezetői értékelésre...
                    </div>
                  )}
                  {phase === "vezetoi_ertekeles" && (
                    <div className="flex items-center gap-2 justify-center py-3 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-sm">
                      <CalendarCheck className="w-4 h-4" /> Várakozás az értékelő megbeszélésre...
                    </div>
                  )}
                  {phase === "megbeszeles" && (
                    <div className="flex items-center gap-2 justify-center py-3 rounded-md bg-muted text-muted-foreground text-sm">
                      <Lock className="w-4 h-4" /> A vezető véglegesíti a lezárást...
                    </div>
                  )}
                  {phase === "lezart" && (
                    <div className="flex items-center gap-2 justify-center py-3 rounded-md bg-success/10 text-success text-sm font-medium">
                      <Lock className="w-4 h-4" /> Ez a célkitűzés véglegesen le van zárva.
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
        </Accordion>
      </CardContent>
    </Card>
  )
}
