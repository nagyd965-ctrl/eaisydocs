"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { KpiCard } from "@/components/kpi-card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2, Clock, CalendarCheck, Umbrella, ChevronDown, ChevronUp, Pencil } from "lucide-react"
import { getMonthlyTimesheet, type TimesheetEntry } from "@/app/hr/attendance-actions"
import { OvertimeActionDialog } from "@/components/hr/overtime-action-dialog"
import { AttendanceCorrectionDialog } from "@/components/hr/attendance-correction-dialog"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const typeColors = {
  munka: "bg-background text-foreground",
  szabadsag: "bg-info/10 text-info",
  betegseg: "bg-destructive/10 text-destructive",
  csusztatas: "bg-warning/10 text-warning",
  hetvege: "bg-muted/40 text-muted-foreground",
  unnep: "bg-primary/10 text-primary"
}

const typeLabels: Record<string, string> = {
  munka: "Munkanap",
  szabadsag: "Szabadság",
  betegseg: "Betegség",
  csusztatas: "Csúsztatás (Túlóra)",
  hetvege: "Hétvége",
  unnep: "Ünnepnap"
}

function formatOvertime(perc: number | null): string {
  if (perc === null) return "..."
  const abs = Math.abs(perc)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  const sign = perc > 0 ? "+" : perc < 0 ? "-" : ""
  if (h === 0 && m === 0) return "0 perc"
  if (m === 0) return `${sign}${h} óra`
  return `${sign}${h} ó ${m} p`
}

export function EmployeeTimesheet({ employeeId }: { employeeId: string }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [timesheet, setTimesheet] = useState<TimesheetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [overtimeBalance, setOvertimeBalance] = useState<number | null>(null)
  const [overtimeDialogOpen, setOvertimeDialogOpen] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  const loadData = async () => {
    setLoading(true)
    const { data, error } = await getMonthlyTimesheet(employeeId, year, month)
    if (error) {
      toast.error("Hiba történt a jelenléti ív betöltésekor: " + error)
    } else if (data) {
      setTimesheet(data)
    }
    setLoading(false)
  }

  const loadOvertime = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("hr_tulora_egyenleg")
      .select("perc")
      .eq("dolgozo_id", employeeId)
      .maybeSingle()
    setOvertimeBalance(data?.perc ?? 0)
  }

  useEffect(() => {
    loadData()
    loadOvertime()
  }, [year, month, employeeId])

  const prevMonth = () => setCurrentDate(new Date(year, month - 2, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month, 1))

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "-"
    return new Date(isoString).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })
  }

  const calculateHours = (start: string | null, end: string | null) => {
    if (!start || !end) return 0
    return (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60)
  }

  const formatHours = (hours: number) => {
    if (hours === 0) return "-"
    return `${hours.toFixed(1)} h`
  }

  const totalHours = timesheet.reduce((sum, entry) => {
    if (entry.type === "munka") return sum + calculateHours(entry.becsekkolas_ideje, entry.kicsekkolas_ideje)
    return sum
  }, 0)

  const totalDaysWorked = timesheet.filter(t => t.type === "munka" && t.becsekkolas_ideje).length
  const totalLeaveDays = timesheet.filter(t => t.type === "szabadsag" || t.type === "betegseg" || t.type === "csusztatas").length

  const monthLabel = `${year}. ${new Date(year, month - 1).toLocaleString("hu-HU", { month: "long" })}`

  return (
    <div className="space-y-4">
      {/* Stat kártyák – 4 oszlopos Linear-flat sáv */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Ledolgozott Órák"
          value={loading ? "..." : `${totalHours.toFixed(1)} h`}
        />
        <KpiCard
          label="Munkanapok"
          value={loading ? "..." : `${totalDaysWorked} nap`}
        />
        <KpiCard
          label="Távollét"
          value={loading ? "..." : `${totalLeaveDays} nap`}
        />
        <div onClick={() => setOvertimeDialogOpen(true)} className="cursor-pointer">
          <KpiCard
            label="Túlóra Egyenleg"
            value={formatOvertime(overtimeBalance)}
            sub={overtimeBalance && overtimeBalance > 0 ? "Kattints a csúsztatáshoz" : "Kattints a részletekhez"}
            className="hover:border-primary/40 transition-colors"
          />
        </div>
      </div>

      {/* Túlóra kezelő modál */}
      <OvertimeActionDialog
        employeeId={employeeId}
        open={overtimeDialogOpen}
        onOpenChange={setOvertimeDialogOpen}
        onBalanceUpdated={() => {
          loadOvertime()
          loadData()
        }}
      />

      {/* Jelenléti ív kártya – nyitható/csukható */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <button className="flex items-center hover:opacity-70 transition-opacity text-left">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      Jelenléti Ív
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      A havi ledolgozott idő és a távollétek összesítése.
                    </CardDescription>
                  </div>
                </button>
              </CollapsibleTrigger>
              <div className="flex items-center gap-2">
                <AttendanceCorrectionDialog onSuccess={loadData} />
                <div className="flex items-center border rounded-md">
                  <Button variant="ghost" size="icon" onClick={prevMonth} className="h-7 w-7 rounded-none">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-semibold px-2 text-center min-w-[110px]">{monthLabel}</span>
                  <Button variant="ghost" size="icon" onClick={nextMonth} className="h-7 w-7 rounded-none">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="compact-table w-full text-sm">
              <thead className="bg-muted/40 border-y border-border">
                <tr>
                  <th className="h-9 px-4 text-left font-medium text-muted-foreground w-28">Dátum</th>
                  <th className="h-9 px-4 text-left font-medium text-muted-foreground">Típus</th>
                  <th className="h-9 px-4 text-center font-medium text-muted-foreground">Becsekkolás</th>
                  <th className="h-9 px-4 text-center font-medium text-muted-foreground">Kicsekkolás</th>
                  <th className="h-9 px-4 text-right font-medium text-muted-foreground">Ledolgozott</th>
                  <th className="h-9 px-3 text-center font-medium text-muted-foreground w-12">Művelet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="h-32 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : timesheet.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="h-20 text-center text-muted-foreground text-sm">
                      Nincs elérhető adat erre a hónapra.
                    </td>
                  </tr>
                ) : (
                  timesheet.map((entry) => {
                    const hours = entry.type === "munka"
                      ? calculateHours(entry.becsekkolas_ideje, entry.kicsekkolas_ideje)
                      : 0

                    return (
                      <tr
                        key={entry.id}
                        className={`${entry.isWeekendShift ? "bg-amber-500/[0.04] dark:bg-amber-500/[0.08]" : (typeColors[entry.type as keyof typeof typeColors] ?? "")}`}
                      >
                        <td className="px-4 py-2.5 font-medium whitespace-nowrap tabular-nums">
                          {entry.datum.substring(8, 10)}. {["V", "H", "K", "Sze", "Cs", "P", "Szo"][new Date(entry.datum).getDay()]}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {entry.isWeekendShift ? (
                              <span className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/30 px-2 py-0.5 rounded">
                                Hétvégi műszak ({entry.shiftCode || "Túlóra"})
                              </span>
                            ) : (
                              <>
                                <span>{typeLabels[entry.type] ?? entry.type}</span>
                                {entry.shiftCode && (
                                  <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 font-medium px-1.5 py-0.5 rounded">
                                    {entry.shiftCode}
                                  </span>
                                )}
                              </>
                            )}
                            {entry.pendingCorrection && (
                              <span className="text-[10px] bg-warning/15 text-warning border border-warning/30 font-medium px-1.5 py-0.5 rounded">
                                Bírálat alatt
                              </span>
                            )}
                          </div>
                          {entry.note && <span className="text-xs block opacity-70">{entry.note}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center tabular-nums">
                          {formatTime(entry.becsekkolas_ideje)}
                        </td>
                        <td className="px-4 py-2.5 text-center tabular-nums">
                          {formatTime(entry.kicsekkolas_ideje)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                          {entry.type === "munka" ? formatHours(hours) : "-"}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {entry.type === "munka" && (
                            <AttendanceCorrectionDialog
                              initialDate={entry.datum}
                              initialCheckIn={entry.becsekkolas_ideje || undefined}
                              initialCheckOut={entry.kicsekkolas_ideje || undefined}
                              onSuccess={loadData}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-6 w-6 ${entry.pendingCorrection ? "text-warning hover:text-warning" : "text-muted-foreground hover:text-foreground"}`}
                                  title={entry.pendingCorrection ? "Folyamatban lévő korrekciós kérelem" : "Időkorrekció kérése"}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                              }
                            />
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}
