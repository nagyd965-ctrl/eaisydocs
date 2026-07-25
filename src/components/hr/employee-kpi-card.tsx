"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Target, TrendingUp, CheckCircle2, History, User, MessageSquare } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { addKpiSelfEvaluation } from "@/app/hr/performance/actions"

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
              <span className="font-bold text-sm text-primary">{avgScore}%</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4 max-h-[500px] overflow-y-auto">
        <Accordion className="w-full">
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
            <AccordionItem key={kpi.id} value={kpi.id} className="border rounded-md bg-card shadow-sm px-3 mb-3">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-start justify-between gap-4 w-full pr-4 text-left">
                  <div>
                    <h4 className="font-medium text-sm">{text}</h4>
                    <p className="text-xs text-muted-foreground mt-1">Ciklus: {kpi.hr_teljesitmeny_ciklus?.megnevezes || kpi.ertekelt_idoszak || "-"}</p>
                  </div>
                  <div className="flex items-center justify-center bg-muted w-10 h-10 rounded-full shrink-0">
                    {percent >= 100 ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="space-y-4 pt-2 pb-4">
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

                <div className="pl-4 space-y-4 pt-4 border-t">
                  <div className="relative pl-4 border-l-2 border-muted space-y-6">
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary/20 border-2 border-primary ring-4 ring-background" />
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">Célkitűzés rögzítve</span>
                        <span className="text-xs text-muted-foreground">{new Date(kpi.created_at).toLocaleDateString("hu-HU")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Kezdeti érték rögzítve.</p>
                    </div>

                    {logs?.filter(log => log.entitas_id === kpi.id).map(log => (
                      <div key={log.id} className="relative">
                        <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-muted border-2 border-muted-foreground ring-4 ring-background" />
                        <div className="flex items-center gap-2 mb-1">
                          {log.esemeny_tipus === "kpi_onertekeles" ? (
                            <User className="w-3 h-3 text-primary" />
                          ) : (
                            <History className="w-3 h-3 text-muted-foreground" />
                          )}
                          <span className="font-medium text-sm">
                            {log.esemeny_tipus === "kpi_frissites" && "Állapot frissítés"}
                            {log.esemeny_tipus === "kpi_onertekeles" && "Dolgozói önértékelés"}
                            {log.esemeny_tipus === "kpi_hozzaadas" && "Rendszer bejegyzés"}
                            {!["kpi_frissites", "kpi_onertekeles", "kpi_hozzaadas"].includes(log.esemeny_tipus) && log.esemeny_tipus}
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

                    {kpi.ertekeles_szovege && (
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-muted border-2 border-muted-foreground ring-4 ring-background" />
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="w-3 h-3 text-muted-foreground" />
                          <span className="font-medium text-sm">Vezetői végleges értékelés</span>
                        </div>
                        <p className="text-sm bg-muted/30 p-3 rounded-md border border-muted mt-2">
                          {kpi.ertekeles_szovege}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {(!kpi.onertekeles_szovege && !kpi.ertekeles_szovege) && (
                    <form 
                      className="mt-4 pt-4 border-t space-y-3"
                      action={async (formData) => {
                        const evalText = formData.get("ertekelesSzovege") as string;
                        if (!evalText) return;
                        const res = await addKpiSelfEvaluation(kpi.id, evalText);
                        if (res?.error) {
                          toast.error(res.error);
                        } else {
                          toast.success("Önértékelés sikeresen elküldve!");
                        }
                      }}
                    >
                      <h5 className="font-medium text-sm flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" /> Önértékelés leadása
                      </h5>
                      <Textarea 
                        name="ertekelesSzovege" 
                        placeholder="Írd le a célkitűzéssel kapcsolatos tapasztalataidat..." 
                        required 
                        className="min-h-[80px]"
                      />
                      <Button type="submit" size="sm" className="w-full">Értékelés elküldése</Button>
                    </form>
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
