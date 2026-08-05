"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EditKpiDialog } from "@/components/hr/edit-kpi-dialog"
import { KpiWorkflowStepper, deriveWorkflowPhase } from "@/components/hr/kpi-workflow-stepper"
import { History, Target, TrendingUp, MessageSquare, MoreHorizontal, Edit, Trash2, User, Link as LinkIcon, CalendarCheck, Lock, Award } from "lucide-react"

export function PerformanceList({ employees, kpis, logs = [], cycles = [], allKpis = [] }: { employees: any[], kpis: any[], logs?: any[], cycles?: any[], allKpis?: any[] }) {
  const employeesWithKpis = employees.map(emp => ({
    ...emp,
    kpis: kpis.filter(k => k.dolgozo_id === emp.id)
  })).filter(emp => emp.kpis.length > 0)

  const [editKpiId, setEditKpiId] = useState<string | null>(null)

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
        const closedCount = emp.kpis.filter((k: any) => deriveWorkflowPhase(k) === "lezart").length
        
        let bonusProps = { label: "Fejlesztendő", color: "text-destructive", bg: "bg-destructive/10", icon: "⚠️" }
        if (avgScore >= 85) bonusProps = { label: "Kiváló Prémium", color: "text-success", bg: "bg-success/10", icon: "🏆" }
        else if (avgScore >= 60) bonusProps = { label: "Normál Bónusz", color: "text-warning", bg: "bg-warning/10", icon: "📊" }

        return (
          <Card key={emp.id} className="overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={emp.felhasznalo_profil?.avatar_url || ""} alt={nev} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{nev}</CardTitle>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-muted-foreground">
                        {(() => {
                          const activeJogviszony = Array.isArray(emp.hr_jogviszony) ? emp.hr_jogviszony[0] : emp.hr_jogviszony;
                          const allBeosztas = activeJogviszony?.hr_beosztas;
                          const activeBeosztas = Array.isArray(allBeosztas)
                            ? allBeosztas.find((b: any) => b.ervenyes_ig === null) || allBeosztas[0]
                            : allBeosztas;
                          return activeBeosztas?.hr_munkakor?.megnevezes || "Nincs megadva";
                        })()}
                      </p>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{closedCount}/{emp.kpis.length} lezárva</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Átlagos Teljesülés</p>
                    <div className="flex items-center gap-2">
                      <Progress value={avgScore} className="w-24 h-2" />
                      <span className="font-semibold tabular-nums">{avgScore}%</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={`${bonusProps.color} ${bonusProps.bg} border-0 font-medium text-[10px] uppercase px-2 py-1`}>
                    <span className="mr-1">{bonusProps.icon}</span>
                    {bonusProps.label}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Accordion className="w-full">
                {emp.kpis.map((kpi: any) => {
                  const percent = kpi.pontszam || 0
                  const phase = deriveWorkflowPhase(kpi)

                  let colorClass = "bg-primary"
                  let bgClass = "bg-primary/20"
                  let textClass = "text-primary"

                  if (percent >= 80) {
                    colorClass = "bg-green-600"; bgClass = "bg-green-100 dark:bg-green-950"; textClass = "text-green-600"
                  } else if (percent <= 30) {
                    colorClass = "bg-orange-500"; bgClass = "bg-orange-100 dark:bg-orange-950"; textClass = "text-orange-500"
                  }

                  return (
                    <AccordionItem key={kpi.id} value={kpi.id} className="border-b last:border-0 relative">
                      <div className="absolute top-4 right-12 pt-0 z-10" onClick={(e) => e.stopPropagation()}>
                        <AlertDialog>
                          <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted/50" />
                            }
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditKpiId(kpi.id)}>
                              <Edit className="h-4 w-4 mr-2" /> Szerkesztés
                            </DropdownMenuItem>
                              <AlertDialogTrigger
                                nativeButton={false}
                                render={
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10" />
                                }
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Törlés
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Biztosan törölni szeretnéd ezt a célkitűzést?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Ez a művelet nem vonható vissza. A KPI véglegesen törlődik a rendszerből.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Mégse</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={async () => {
                                  const { deleteKpi } = await import("@/app/hr/performance/actions");
                                  const res = await deleteKpi(kpi.id);
                                  if (res?.error) toast.error(res.error);
                                  else toast.success("Célkitűzés sikeresen törölve!");
                                }}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              >
                                Törlés
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <AccordionTrigger className="hover:no-underline hover:bg-muted/10 px-2 rounded-md transition-colors">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-lg truncate">{kpi.celkituzes}</span>
                            <Badge variant="outline" className="ml-2 font-normal text-[10px] uppercase">
                              {kpi.hr_teljesitmeny_ciklus?.megnevezes || kpi.ertekelt_idoszak || "Ciklus"}
                            </Badge>
                            {phase === "lezart" && (
                              <Badge className="bg-success/10 text-success border-0 text-[10px] uppercase">
                                <Lock className="w-3 h-3 mr-1" /> Lezárt
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`font-semibold ${textClass}`}>{percent}%</span>
                            <Progress value={percent} className={`w-32 h-2 ${bgClass} [&>div]:${colorClass}`} />
                          </div>
                        </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-2 pt-4 pb-6">
                        <div className="pl-7 space-y-6">
                          {/* Workflow Stepper */}
                          <div className="pb-4 border-b">
                            <KpiWorkflowStepper currentPhase={phase} />
                          </div>

                          {/* Idővonal */}
                          <div className="relative pl-4 border-l-2 border-muted space-y-6">

                            <div className="relative">
                              <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary/20 border-2 border-primary ring-4 ring-background" />
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">Célkitűzés rögzítve</span>
                                <span className="text-xs text-muted-foreground">{new Date(kpi.created_at).toLocaleDateString("hu-HU")}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">Kezdeti érték rögzítve.</p>
                            </div>

                            {/* Önértékelés megjelenítése */}
                            {kpi.onertekeles_szovege && (
                              <div className="relative">
                                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-blue-500/20 border-2 border-blue-500 ring-4 ring-background" />
                                <div className="flex items-center gap-2 mb-1">
                                  <User className="w-3 h-3 text-blue-500" />
                                  <span className="font-medium text-sm">Dolgozói önértékelés leadva</span>
                                </div>
                                <p className="text-sm bg-blue-500/5 p-3 rounded-md border border-blue-500/20 mt-2">
                                  {kpi.onertekeles_szovege}
                                </p>
                              </div>
                            )}

                            {logs?.filter(log => log.entitas_id === kpi.id && !["kpi_onertekeles", "kpi_vezetoi_ertekeles", "kpi_megbeszeles", "kpi_lezaras"].includes(log.esemeny_tipus)).map(log => (
                              <div key={log.id} className="relative">
                                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-muted border-2 border-muted-foreground ring-4 ring-background" />
                                <div className="flex items-center gap-2 mb-1">
                                  {log.esemeny_tipus === "kpi_bejegyzes" ? (
                                    <MessageSquare className="w-3 h-3 text-primary" />
                                  ) : log.esemeny_tipus === "kpi_onertekeles" ? (
                                    <User className="w-3 h-3 text-blue-500" />
                                  ) : log.esemeny_tipus === "kpi_megbeszeles" ? (
                                    <CalendarCheck className="w-3 h-3 text-purple-500" />
                                  ) : (
                                    <History className="w-3 h-3 text-muted-foreground" />
                                  )}
                                  <span className="font-medium text-sm">
                                    {log.esemeny_tipus === "kpi_frissites" && "Állapot frissítés"}
                                    {log.esemeny_tipus === "kpi_onertekeles" && "Dolgozói önértékelés"}
                                    {log.esemeny_tipus === "kpi_hozzaadas" && "Rendszer bejegyzés"}
                                    {log.esemeny_tipus === "kpi_bejegyzes" && "Aktivitás / Bejegyzés"}
                                    {log.esemeny_tipus === "kpi_vezetoi_ertekeles" && "Vezetői értékelés"}
                                    {log.esemeny_tipus === "kpi_megbeszeles" && "Értékelő megbeszélés"}
                                    {log.esemeny_tipus === "kpi_lezaras" && "Célkitűzés lezárva"}
                                    {!["kpi_frissites", "kpi_onertekeles", "kpi_hozzaadas", "kpi_bejegyzes", "kpi_vezetoi_ertekeles", "kpi_megbeszeles", "kpi_lezaras"].includes(log.esemeny_tipus) && log.esemeny_tipus}
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

                            {/* Vezetői értékelés megjelenítése */}
                            {kpi.ertekeles_szovege && (
                              <div className="relative">
                                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary/20 border-2 border-primary ring-4 ring-background" />
                                <div className="flex items-center gap-2 mb-1">
                                  <Award className="w-3 h-3 text-primary" />
                                  <span className="font-medium text-sm">Vezetői értékelés</span>
                                </div>
                                <p className="text-sm bg-primary/5 p-3 rounded-md border border-primary/20 mt-2">
                                  {kpi.ertekeles_szovege}
                                </p>
                              </div>
                            )}

                            {/* Megbeszélés szekció */}
                            {kpi.megbeszeles_datum && (
                              <div className="relative">
                                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-purple-500/20 border-2 border-purple-500 ring-4 ring-background" />
                                <div className="flex items-center gap-2 mb-1">
                                  <CalendarCheck className="w-3 h-3 text-purple-500" />
                                  <span className="font-medium text-sm">Értékelő megbeszélés megtörtént</span>
                                  <span className="text-xs text-muted-foreground">{new Date(kpi.megbeszeles_datum).toLocaleDateString("hu-HU")}</span>
                                </div>
                                {kpi.megbeszeles_megjegyzes && (
                                  <p className="text-sm bg-purple-500/5 p-3 rounded-md border border-purple-500/20 mt-2">
                                    {kpi.megbeszeles_megjegyzes}
                                  </p>
                                )}
                              </div>
                            )}

                          {/* Vezetői bejegyzés rögzítése - ha nincs lezárva */}
                          {phase !== "lezart" && (
                            <div className="relative">
                                <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-muted border-2 border-muted-foreground ring-4 ring-background" />
                                <div className="flex items-center gap-2 mb-1">
                                  <MessageSquare className="w-3 h-3 text-muted-foreground" />
                                  <span className="font-medium text-sm">Vezetői bejegyzés rögzítése</span>
                                </div>
                                <form
                                  className="flex items-center gap-3 mt-2"
                                  action={async (formData) => {
                                    const msg = formData.get("megjegyzes") as string;
                                    if (!msg) return;
                                    const { addKpiActivity } = await import("@/app/hr/performance/actions");
                                    const res = await addKpiActivity(kpi.id, msg);
                                    if (res?.error) toast.error(res.error);
                                    else toast.success("Aktivitás sikeresen rögzítve!");
                                  }}
                                >
                                  <Input type="text" name="megjegyzes" placeholder="Pl: Pozitív visszajelzés a haladásról..." required className="flex-1 h-8 text-sm" />
                                  <Button type="submit" size="sm" variant="outline" className="h-8">Hozzáadás</Button>
                                </form>
                            </div>
                          )}

                          {/* Állapot frissítése - ha nincs lezárva */}
                          {phase !== "lezart" && (
                          <div className="relative">
                              <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-muted border-2 border-muted-foreground ring-4 ring-background" />
                              <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="w-3 h-3 text-muted-foreground" />
                                <span className="font-medium text-sm">Jelenlegi Állapot frissítése</span>
                              </div>
                              <form
                                className="flex items-center gap-3 mt-2"
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

                          </div>

                          {/* Akciók szekció - a fázistól függően */}
                          <div className="space-y-3 pt-4 border-t">
                            {/* Vezetői értékelés beküldése (ha önértékelés megérkezett de nincs még vezetői) */}
                            {phase === "onertekeles" && (
                              <form
                                action={async (formData) => {
                                  const evalText = formData.get("ertekelesSzovege") as string;
                                  if (!evalText) return;
                                  const { addKpiManagerEvaluation } = await import("@/app/hr/performance/actions");
                                  const res = await addKpiManagerEvaluation(kpi.id, evalText);
                                  if (res?.error) toast.error(res.error);
                                  else toast.success("Vezetői értékelés rögzítve!");
                                }}
                                className="space-y-2"
                              >
                                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                  <Award className="w-4 h-4" /> Vezetői Értékelés Beküldése
                                  <Badge className="bg-primary/10 text-primary border-0 text-[10px]">Te jössz!</Badge>
                                </div>
                                <Textarea
                                  name="ertekelesSzovege"
                                  placeholder="Írd le a vezetői értékelésedet..."
                                  required
                                  className="min-h-[80px] text-sm"
                                />
                                <Button type="submit" size="sm" className="w-full">Értékelés beküldése</Button>
                              </form>
                            )}

                            {/* Megbeszélés gomb (ha vezetői értékelés megvan, de megbeszélés még nincs) */}
                            {phase === "vezetoi_ertekeles" && (
                              <form
                                action={async (formData) => {
                                  const megjegyzes = formData.get("megjegyzes") as string;
                                  const { confirmMeeting } = await import("@/app/hr/performance/actions");
                                  const res = await confirmMeeting(kpi.id, megjegyzes || undefined);
                                  if (res?.error) toast.error(res.error);
                                  else toast.success("Megbeszélés rögzítve!");
                                }}
                                className="space-y-2"
                              >
                                <div className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400">
                                  <CalendarCheck className="w-4 h-4" /> Értékelő Megbeszélés Rögzítése
                                  <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-0 text-[10px]">Te jössz!</Badge>
                                </div>
                                <Textarea
                                  name="megjegyzes"
                                  placeholder="Jegyzőkönyv / megjegyzés (opcionális)..."
                                  className="min-h-[60px] text-sm"
                                />
                                <Button type="submit" size="sm" variant="outline" className="w-full border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10">
                                  <CalendarCheck className="w-4 h-4 mr-2" /> Megbeszélés megtörtént
                                </Button>
                              </form>
                            )}

                            {/* Végleges lezárás gomb (megbeszélés után) */}
                            {phase === "megbeszeles" && (
                              <Button
                                size="sm"
                                className="w-full bg-success hover:bg-success/90 text-success-foreground"
                                onClick={async () => {
                                  const { finalCloseKpi } = await import("@/app/hr/performance/actions");
                                  const res = await finalCloseKpi(kpi.id);
                                  if (res?.error) toast.error(res.error);
                                  else toast.success("Célkitűzés véglegesen lezárva! 🎉");
                                }}
                              >
                                <Lock className="w-4 h-4 mr-2" /> Célkitűzés Végleges Lezárása
                              </Button>
                            )}

                            {/* Lezárt állapot jelzés */}
                            {phase === "lezart" && (
                              <div className="flex items-center gap-2 justify-center py-2 px-3 rounded-md bg-success/10 text-success text-sm font-medium">
                                <Lock className="w-4 h-4" /> Ez a célkitűzés véglegesen le van zárva.
                              </div>
                            )}

                            {/* Ha még nincs önértékelés - "Várakozás dolgozóra" jelzés */}
                            {phase === "celkituzes" && (
                              <div className="flex items-center gap-2 justify-center py-2 px-3 rounded-md bg-muted text-muted-foreground text-sm">
                                <User className="w-4 h-4" /> Várakozás a dolgozó önértékelésére...
                              </div>
                            )}
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

      {editKpiId && (
        <EditKpiDialog
          kpi={allKpis.find(k => k.id === editKpiId)}
          cycles={cycles}
          allKpis={allKpis}
          open={!!editKpiId}
          setOpen={(open) => !open && setEditKpiId(null)}
        />
      )}
    </div>
  )
}
