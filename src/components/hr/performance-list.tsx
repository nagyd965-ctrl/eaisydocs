"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { History, Target, TrendingUp, MessageSquare, Plus } from "lucide-react"

export function PerformanceList({ employees, kpis }: { employees: any[], kpis: any[] }) {
  // Csoportosítás dolgozók szerint
  const employeesWithKpis = employees.map(emp => ({
    ...emp,
    kpis: kpis.filter(k => k.dolgozo_id === emp.id)
  })).filter(emp => emp.kpis.length > 0) // Csak azokat mutatjuk, akinek van célja

  if (employeesWithKpis.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <Target className="w-12 h-12 mb-4 opacity-20" />
          <p>Nincsenek rögzített célkitűzések a rendszerben.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {employeesWithKpis.map((emp) => {
        const nev = emp.felhasznalo_profil?.nev || "Ismeretlen"
        const initials = nev.substring(0, 2).toUpperCase()
        const avgScore = Math.round(emp.kpis.reduce((acc: number, curr: any) => acc + (curr.pontszam || 0), 0) / emp.kpis.length)
        
        return (
          <Card key={emp.id} className="overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{nev}</CardTitle>
                    <p className="text-sm text-muted-foreground">{emp.hr_munkakor?.megnevezes || "Nincs megadva"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Átlagos Teljesülés</p>
                  <div className="flex items-center gap-2">
                    <Progress value={avgScore} className="w-24 h-2" />
                    <span className="font-bold">{avgScore}%</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Accordion type="multiple" className="w-full">
                {emp.kpis.map((kpi: any) => {
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
                    <AccordionItem key={kpi.id} value={kpi.id} className="border-b last:border-0">
                      <AccordionTrigger className="hover:no-underline hover:bg-muted/10 px-2 rounded-md transition-colors">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3 text-left">
                            <Target className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{text}</span>
                            <Badge variant="outline" className="ml-2 font-normal text-[10px] uppercase">
                              {kpi.ertekelt_idoszak || "Ciklus"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`font-semibold ${textClass}`}>{percent}%</span>
                            <Progress value={percent} className={`w-32 h-2 ${bgClass} [&>div]:${colorClass}`} />
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-2 pt-4 pb-6">
                        <div className="pl-7 space-y-6">
                          {/* Idővonal szimuláció a brief alapján */}
                          <div className="relative pl-4 border-l-2 border-muted space-y-6">
                            
                            <div className="relative">
                              <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary/20 border-2 border-primary ring-4 ring-background" />
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">Célkitűzés rögzítve</span>
                                <span className="text-xs text-muted-foreground">{new Date(kpi.created_at).toLocaleDateString("hu-HU")}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">Kezdeti érték: 0%</p>
                            </div>

                            {kpi.megjegyzes && (
                              <div className="relative">
                                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-muted border-2 border-muted-foreground ring-4 ring-background" />
                                <div className="flex items-center gap-2 mb-1">
                                  <MessageSquare className="w-3 h-3 text-muted-foreground" />
                                  <span className="font-medium text-sm">Vezetői értékelés / Megjegyzés</span>
                                </div>
                                <p className="text-sm bg-muted/30 p-3 rounded-md border border-muted mt-2">
                                  {kpi.megjegyzes}
                                </p>
                              </div>
                            )}

                          <div className="relative">
                              <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-muted border-2 border-muted-foreground ring-4 ring-background" />
                              <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="w-3 h-3 text-muted-foreground" />
                                <span className="font-medium text-sm">Jelenlegi Állapot frissítése</span>
                              </div>
                              <form 
                                className="flex items-center gap-3 mt-2" 
                                action={async (formData) => {
                                  const newVal = parseInt(formData.get("percent") as string);
                                  const { updateKpiProgress } = await import("@/app/hr/performance/actions");
                                  const res = await updateKpiProgress(kpi.id, newVal);
                                  if (res?.error) {
                                    toast.error(res.error);
                                  } else {
                                    toast.success("Állapot sikeresen frissítve!");
                                  }
                                }}
                              >
                                <Input type="number" name="percent" defaultValue={percent} min={0} max={100} className="w-24 h-8 text-sm" />
                                <span className="text-sm font-medium">%</span>
                                <Button type="submit" size="sm" variant="secondary" className="h-8">Frissítés</Button>
                              </form>
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
        )
      })}
    </div>
  )
}
