"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, CalendarDays, Loader2, Clock, CalendarCheck, Umbrella, ChevronDown, ChevronUp } from "lucide-react"
import { getMonthlyTimesheet, type TimesheetEntry } from "@/app/hr/attendance-actions"
import { toast } from "sonner"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const typeColors = {
  munka: "bg-background text-foreground",
  szabadsag: "bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  betegseg: "bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  hetvege: "bg-muted/50 text-muted-foreground",
  unnep: "bg-purple-50 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
}

const typeLabels: Record<string, string> = {
  munka: "Munkanap",
  szabadsag: "Szabadság",
  betegseg: "Betegség",
  hetvege: "Hétvége",
  unnep: "Ünnepnap"
}

export function EmployeeTimesheet({ employeeId }: { employeeId: string }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [timesheet, setTimesheet] = useState<TimesheetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

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

  useEffect(() => {
    loadData()
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
  const totalLeaveDays = timesheet.filter(t => t.type === "szabadsag" || t.type === "betegseg").length

  const monthLabel = `${year}. ${new Date(year, month - 1).toLocaleString("hu-HU", { month: "long" })}`

  return (
    <div className="space-y-4">
      {/* Stat kártyák – frissülnek a hónapváltással */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              {loading
                ? <div className="h-7 w-16 bg-muted animate-pulse rounded" />
                : <p className="text-2xl font-semibold tabular-nums text-primary">{totalHours.toFixed(1)} h</p>
              }
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Ledolgozott Órák</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              {loading
                ? <div className="h-7 w-16 bg-muted animate-pulse rounded" />
                : <p className="text-2xl font-semibold tabular-nums text-amber-600">{totalDaysWorked} nap</p>
              }
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Munkanapok</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <div className="h-9 w-9 rounded-lg bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
              <Umbrella className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              {loading
                ? <div className="h-7 w-16 bg-muted animate-pulse rounded" />
                : <p className="text-2xl font-semibold tabular-nums text-violet-600">{totalLeaveDays} nap</p>
              }
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Távollét</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jelenléti ív kártya – nyitható/csukható */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-3 hover:opacity-70 transition-opacity text-left">
                  <CalendarDays className="w-5 h-5 text-primary shrink-0" />
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
                <Button variant="ghost" size="icon" onClick={prevMonth} className="h-7 w-7">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-semibold w-36 text-center">{monthLabel}</span>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="h-7 w-7">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="p-0">
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-y border-border">
                <tr>
                  <th className="h-9 px-4 text-left font-medium text-muted-foreground w-28">Dátum</th>
                  <th className="h-9 px-4 text-left font-medium text-muted-foreground">Típus</th>
                  <th className="h-9 px-4 text-center font-medium text-muted-foreground">Becsekkolás</th>
                  <th className="h-9 px-4 text-center font-medium text-muted-foreground">Kicsekkolás</th>
                  <th className="h-9 px-4 text-right font-medium text-muted-foreground">Ledolgozott</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="h-32 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : timesheet.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="h-20 text-center text-muted-foreground text-sm">
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
                        className={`${typeColors[entry.type as keyof typeof typeColors] ?? ""}`}
                      >
                        <td className="px-4 py-2.5 font-medium whitespace-nowrap tabular-nums">
                          {entry.datum.substring(8, 10)}. {["V", "H", "K", "Sze", "Cs", "P", "Szo"][new Date(entry.datum).getDay()]}
                        </td>
                        <td className="px-4 py-2.5">
                          {typeLabels[entry.type] ?? entry.type}
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
