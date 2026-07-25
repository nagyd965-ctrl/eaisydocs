"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Clock, CalendarDays, Loader2, ChevronDown, ChevronUp } from "lucide-react"
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

const typeLabels = {
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

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1))
  }

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "-"
    return new Date(isoString).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })
  }

  const calculateHours = (start: string | null, end: string | null) => {
    if (!start || !end) return 0
    const diff = new Date(end).getTime() - new Date(start).getTime()
    return diff / (1000 * 60 * 60)
  }

  const formatHours = (hours: number) => {
    if (hours === 0) return "-"
    return `${hours.toFixed(1)} óra`
  }

  const totalHours = timesheet.reduce((sum, entry) => {
    if (entry.type === "munka") {
      return sum + calculateHours(entry.becsekkolas_ideje, entry.kicsekkolas_ideje)
    }
    return sum
  }, 0)

  const totalDaysWorked = timesheet.filter(t => t.type === "munka" && t.becsekkolas_ideje).length
  const totalLeaveDays = timesheet.filter(t => t.type === "szabadsag" || t.type === "betegseg").length

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent -ml-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">Jelenléti Ív</CardTitle>
                    {isExpanded ? <ChevronUp className="w-4 h-4 ml-2 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground" />}
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CardDescription className="hidden sm:block">
                A havi ledolgozott idő és a távollétek összesítése
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="font-semibold text-sm w-32 text-center">
                {year}. {new Date(year, month - 1).toLocaleString('hu-HU', { month: 'long' })}
              </div>
              <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent>
            {/* Összesítő statisztikák */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-muted/30 p-3 rounded-md border text-center">
                <div className="text-xs text-muted-foreground uppercase mb-1">Ledolgozott órák</div>
                <div className="text-lg font-bold">{totalHours.toFixed(1)} h</div>
              </div>
              <div className="bg-muted/30 p-3 rounded-md border text-center">
                <div className="text-xs text-muted-foreground uppercase mb-1">Munkanapok</div>
                <div className="text-lg font-bold">{totalDaysWorked} nap</div>
              </div>
              <div className="bg-muted/30 p-3 rounded-md border text-center">
                <div className="text-xs text-muted-foreground uppercase mb-1">Távollét</div>
                <div className="text-lg font-bold">{totalLeaveDays} nap</div>
              </div>
            </div>

            {/* Táblázat */}
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="h-10 px-4 text-left font-medium text-muted-foreground w-32">Dátum</th>
                    <th className="h-10 px-4 text-left font-medium text-muted-foreground">Típus</th>
                    <th className="h-10 px-4 text-center font-medium text-muted-foreground">Becsekkolás</th>
                    <th className="h-10 px-4 text-center font-medium text-muted-foreground">Kicsekkolás</th>
                    <th className="h-10 px-4 text-right font-medium text-muted-foreground">Ledolgozott</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="h-32 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                      </td>
                    </tr>
                  ) : timesheet.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="h-20 text-center text-muted-foreground">
                        Nincs elérhető adat erre a hónapra.
                      </td>
                    </tr>
                  ) : (
                    timesheet.map((entry) => {
                      const hours = entry.type === "munka" ? calculateHours(entry.becsekkolas_ideje, entry.kicsekkolas_ideje) : 0
                      
                      return (
                        <tr 
                          key={entry.id} 
                          className={`border-b last:border-0 ${typeColors[entry.type]}`}
                        >
                          <td className="p-3 font-medium whitespace-nowrap">
                            {entry.datum.substring(8, 10)}. {["V", "H", "K", "Sze", "Cs", "P", "Szo"][new Date(entry.datum).getDay()]}
                          </td>
                          <td className="p-3">
                            {typeLabels[entry.type]}
                            {entry.note && <span className="text-xs block opacity-70">{entry.note}</span>}
                          </td>
                          <td className="p-3 text-center">
                            {formatTime(entry.becsekkolas_ideje)}
                          </td>
                          <td className="p-3 text-center">
                            {formatTime(entry.kicsekkolas_ideje)}
                          </td>
                          <td className="p-3 text-right font-medium">
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
  )
}
