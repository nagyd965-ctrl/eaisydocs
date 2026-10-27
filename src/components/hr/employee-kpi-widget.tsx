"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Target, ArrowRight, CheckCircle2, Lock, Clock, User, CalendarCheck } from "lucide-react"
import { deriveWorkflowPhase, formatKpiTargetBadge } from "@/components/hr/kpi-workflow-stepper"
import { cn } from "@/lib/utils"

export interface EmployeeKpiWidgetProps {
  kpis: any[]
}

function getWidgetStepBadge(phase: string, hasSelfEval?: boolean) {
  switch (phase) {
    case "celkituzes":
      return (
        <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-primary/20 font-medium shrink-0">
          1. Célkitűzés
        </Badge>
      )
    case "onertekeles":
      return (
        <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold shrink-0">
          {hasSelfEval ? "2. Önértékelés leadva" : "2. Te jössz!"}
        </Badge>
      )
    case "vezetoi_ertekeles":
      return (
        <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-medium shrink-0">
          3. Vezető értékeli
        </Badge>
      )
    case "megbeszeles":
      return (
        <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-primary/30 font-medium shrink-0">
          4. Megbeszélés
        </Badge>
      )
    case "lezart":
      return (
        <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-success/15 text-success border-success/30 font-semibold shrink-0">
          <Lock className="w-2.5 h-2.5 mr-0.5" /> 5. Lezárva
        </Badge>
      )
    default:
      return null
  }
}

export function EmployeeKpiWidget({ kpis = [] }: EmployeeKpiWidgetProps) {
  const pendingCount = kpis.filter(k => {
    const p = deriveWorkflowPhase(k)
    return p === "celkituzes" || (p === "onertekeles" && !k.onertekeles_szovege)
  }).length

  return (
    <Card className="border shadow-xs overflow-hidden flex flex-col justify-between">
      <div>
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Aktuális Célkitűzéseim
            </CardTitle>
            {kpis.length > 0 && (
              <Badge variant="outline" className="text-[11px] font-medium bg-background">
                {pendingCount > 0 ? `${pendingCount} önértékelésre vár` : `${kpis.length} rögzítve`}
              </Badge>
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
                const phase = deriveWorkflowPhase(kpi)
                const title = kpi.celkituzes || kpi.megnevezes || "Célkitűzés"
                const cycle = kpi.hr_teljesitmeny_ciklus?.megnevezes || kpi.ertekelt_idoszak || "Aktuális ciklus"
                const targetBadge = formatKpiTargetBadge(kpi)

                return (
                  <div key={kpi.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-xs text-foreground truncate block">
                          {title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="truncate">{cycle}</span>
                        {targetBadge && (
                          <>
                            <span>•</span>
                            <span className="text-primary font-medium tabular-nums">{targetBadge}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {getWidgetStepBadge(phase, Boolean(kpi.onertekeles_szovege))}
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
          {kpis.length} kitűzött cél
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
