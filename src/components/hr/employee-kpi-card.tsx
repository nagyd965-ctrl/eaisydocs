"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Target, TrendingUp, CheckCircle2 } from "lucide-react"

export function EmployeeKpiCard({ kpis }: { kpis: any[] }) {
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
              <span className="font-bold text-sm text-primary">{avgScore}%</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4 max-h-[300px] overflow-y-auto">
        {kpis.map((kpi) => {
          const percent = kpi.pontszam || 0
          const text = kpi.celkituzes || kpi.ertekeles_szovege || "Nincs megadva"
          
          let colorClass = "bg-primary"
          let bgClass = "bg-primary/20"
          let textClass = "text-primary"
          
          if (percent >= 80) {
            colorClass = "bg-green-600"
            bgClass = "bg-green-100"
            textClass = "text-green-600"
          } else if (percent <= 30) {
            colorClass = "bg-orange-500"
            bgClass = "bg-orange-100"
            textClass = "text-orange-500"
          }

          return (
            <div key={kpi.id} className="p-3 border rounded-md bg-card space-y-3 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-medium text-sm">{text}</h4>
                  <p className="text-xs text-muted-foreground mt-1">Ciklus: {kpi.ertekelt_idoszak || "-"}</p>
                </div>
                <div className="flex items-center justify-center bg-muted w-10 h-10 rounded-full shrink-0">
                  {percent >= 100 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingUp className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Folyamat:</span>
                  <span className={`font-semibold ${textClass}`}>{percent}%</span>
                </div>
                <Progress value={percent} className={`h-1.5 ${bgClass} [&>div]:${colorClass}`} />
              </div>

              {kpi.megjegyzes && (
                <div className="mt-2 pt-2 border-t text-xs">
                  <span className="font-medium text-muted-foreground block mb-1">Vezetői értékelés:</span>
                  {kpi.megjegyzes}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
