"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Target, ArrowRight, CheckCircle2, Lock, TrendingUp } from "lucide-react"
import { deriveWorkflowPhase } from "@/components/hr/kpi-workflow-stepper"
import { cn } from "@/lib/utils"

export interface EmployeeKpiWidgetProps {
  kpis: any[]
}

export function EmployeeKpiWidget({ kpis = [] }: EmployeeKpiWidgetProps) {
  const avgScore = kpis.length > 0 
    ? Math.round(kpis.reduce((acc, curr) => acc + (curr.pontszam || 0), 0) / kpis.length)
    : 0

  return (
    <Card className="border shadow-xs overflow-hidden flex flex-col justify-between">
      <div>
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <Target className="w-3.5 h-3.5" />
              </div>
              Aktuális Célkitűzéseim
            </CardTitle>
            {kpis.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider hidden sm:inline">Átlag:</span>
                <span className="font-semibold text-xs tabular-nums text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  {avgScore}%
                </span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {kpis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Target className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-foreground">Nincs aktív célkitűzésed</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                A jelenlegi értékelési ciklusban még nem rögzített a vezetőd célokat.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {kpis.slice(0, 4).map((kpi) => {
                const percent = kpi.pontszam || 0
                const phase = deriveWorkflowPhase(kpi)
                const title = kpi.celkituzes || kpi.megnevezes || "Célkitűzés"
                const cycle = kpi.hr_teljesitmeny_ciklus?.megnevezes || kpi.ertekelt_idoszak || "Aktuális ciklus"

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

                return (
                  <div key={kpi.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-xs text-foreground truncate block">
                          {title}
                        </span>
                        {phase === "onertekeles" && (
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] py-0 px-1 font-semibold animate-pulse shrink-0">
                            Te jössz!
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="truncate">{cycle}</span>
                        <span>•</span>
                        <span className="shrink-0">
                          {kpi.meroszam_tipusa === "igen_nem" 
                            ? (kpi.aktualis_ertek > 0 ? "Teljesítve" : "Folyamatban")
                            : `${kpi.aktualis_ertek ?? 0} / ${kpi.cel_ertek ?? 100} ${kpi.meroszam_tipusa === "szazalek" ? "%" : kpi.meroszam_tipusa === "osszeg" ? "Ft" : kpi.meroszam_tipusa === "skala" ? "Pont" : "db"}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <span className={cn("text-xs font-semibold tabular-nums", textClass)}>
                          {percent}%
                        </span>
                        <Progress value={percent} className={cn("w-14 sm:w-16 h-1.5 mt-0.5", bgClass, `[&>div]:${colorClass}`)} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </div>

      <CardFooter className="pt-2.5 pb-2.5 px-4 border-t bg-muted/10 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {kpis.length} cél rögzítve
        </span>
        <Link 
          href="/hr/self-service/goals" 
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          Céljaim & Önértékelés
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardFooter>
    </Card>
  )
}
