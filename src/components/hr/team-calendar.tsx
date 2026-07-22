"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { 
  addWeeks, subWeeks, addMonths, subMonths, addYears, subYears,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, 
  format, isSameDay, isWithinInterval, parseISO, isSameMonth, eachMonthOfInterval, startOfYear, endOfYear
} from "date-fns"
import { hu } from "date-fns/locale"

type ViewMode = "heti" | "havi" | "eves"

export function TeamCalendar({ teamMembers, leaves }: { teamMembers: any[], leaves: any[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>("heti")
  const [currentDate, setCurrentDate] = useState(new Date())

  // Színek definiálása típusok alapján
  const typeColors: Record<string, string> = {
    szabadsag: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    beteg: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    fizetetlen: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
    tanulmanyi: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800"
  }

  const navigate = (direction: "prev" | "next" | "today") => {
    if (direction === "today") {
      setCurrentDate(new Date())
      return
    }

    if (viewMode === "heti") setCurrentDate(direction === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1))
    else if (viewMode === "havi") setCurrentDate(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1))
    else setCurrentDate(direction === "prev" ? subYears(currentDate, 1) : addYears(currentDate, 1))
  }

  // --- Heti nézet ---
  const renderWeeklyView = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    const end = endOfWeek(currentDate, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start, end })

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="col-span-1 p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Csapattag</div>
            {days.map(day => (
              <div key={day.toISOString()} className={`col-span-1 p-2 text-center border-b ${isSameDay(day, new Date()) ? 'border-primary' : ''}`}>
                <div className="text-xs font-semibold uppercase">{format(day, "EEEE", { locale: hu })}</div>
                <div className={`text-lg ${isSameDay(day, new Date()) ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>

          {/* Sorok */}
          <div className="space-y-2">
            {teamMembers.map(member => {
              const nev = member.felhasznalo_profil?.nev || "Ismeretlen"
              const initials = nev.substring(0, 2).toUpperCase()
              const memberLeaves = leaves.filter(l => l.dolgozo_id === member.id)

              return (
                <div key={member.id} className="grid grid-cols-8 gap-1 items-center border rounded-md p-1 bg-card">
                  <div className="col-span-1 flex items-center gap-2 p-1 overflow-hidden">
                     <Avatar className="w-8 h-8 rounded-md shrink-0">
                       <AvatarFallback className="text-[10px] rounded-md bg-muted text-muted-foreground">{initials}</AvatarFallback>
                     </Avatar>
                     <span className="text-xs font-medium truncate" title={nev}>{nev}</span>
                  </div>
                  
                  {/* Napok */}
                  {days.map(day => {
                    const activeLeave = memberLeaves.find(l => 
                      isWithinInterval(day, { start: parseISO(l.kezdet_datuma), end: parseISO(l.veg_datuma) })
                    )

                    return (
                      <div key={day.toISOString()} className={`col-span-1 h-10 rounded-sm flex items-center justify-center p-1 ${activeLeave ? typeColors[activeLeave.tipus] + ' border' : 'bg-muted/30'}`}>
                        {activeLeave && (
                           <span className="text-[10px] uppercase font-bold truncate px-1">
                             {activeLeave.statusz === "jovahagyasra_var" ? "Folyamatban" : activeLeave.tipus}
                           </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // --- Havi nézet ---
  const renderMonthlyView = () => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start, end })

    return (
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
        {/* Névnapok / Hét napjai fejléc */}
        {["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"].map(day => (
           <div key={day} className="bg-muted p-2 text-center text-xs font-semibold uppercase text-muted-foreground">
             {day}
           </div>
        ))}

        {/* Naptár Rács */}
        {days.map(day => {
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isToday = isSameDay(day, new Date())
          
          // Ezen a napon távollévők keresése
          const absentMembers = teamMembers.filter(member => {
             return leaves.some(l => 
               l.dolgozo_id === member.id && 
               isWithinInterval(day, { start: parseISO(l.kezdet_datuma), end: parseISO(l.veg_datuma) })
             )
          })

          return (
            <div key={day.toISOString()} className={`min-h-[100px] bg-card p-2 flex flex-col ${!isCurrentMonth ? 'opacity-40' : ''} ${isToday ? 'bg-primary/5' : ''}`}>
              <div className={`text-right text-xs font-medium mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                {format(day, "d")}
              </div>
              <div className="flex-1 flex flex-col gap-1">
                {absentMembers.map(member => {
                  const nev = member.felhasznalo_profil?.nev || "Ismeretlen"
                  const leave = leaves.find(l => l.dolgozo_id === member.id && isWithinInterval(day, { start: parseISO(l.kezdet_datuma), end: parseISO(l.veg_datuma) }))
                  if (!leave) return null
                  
                  return (
                    <div key={member.id} className={`text-[9px] px-1.5 py-0.5 rounded-sm border truncate font-medium ${typeColors[leave.tipus]}`} title={`${nev} - ${leave.tipus}`}>
                      {nev}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // --- Éves nézet (Hőtérkép) ---
  const renderYearlyView = () => {
    const months = eachMonthOfInterval({
      start: startOfYear(currentDate),
      end: endOfYear(currentDate)
    })

    return (
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="p-3 font-semibold text-muted-foreground text-xs uppercase w-48">Csapattag</th>
              {months.map(month => (
                <th key={month.toISOString()} className="p-3 text-center font-semibold text-muted-foreground text-xs uppercase w-16">
                  {format(month, "MMM", { locale: hu })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {teamMembers.map(member => {
               const nev = member.felhasznalo_profil?.nev || "Ismeretlen"
               const memberLeaves = leaves.filter(l => l.dolgozo_id === member.id)

               return (
                 <tr key={member.id} className="bg-card hover:bg-muted/30 transition-colors">
                   <td className="p-3 font-medium truncate max-w-[200px]">{nev}</td>
                   {months.map(month => {
                      // Kiszámoljuk, hány napot volt távol az adott hónapban
                      const daysInMonth = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
                      let daysOff = 0
                      
                      daysInMonth.forEach(day => {
                        if (memberLeaves.some(l => isWithinInterval(day, { start: parseISO(l.kezdet_datuma), end: parseISO(l.veg_datuma) }))) {
                          // Csak a munkanapokat (hétfő-péntek) számoljuk
                          if (day.getDay() !== 0 && day.getDay() !== 6) daysOff++
                        }
                      })

                      // Hőtérkép szín: minél több nap, annál sötétebb (eaisyHR kékkel)
                      let bgClass = "bg-transparent"
                      if (daysOff > 0 && daysOff <= 3) bgClass = "bg-blue-100 dark:bg-blue-900/30"
                      else if (daysOff > 3 && daysOff <= 10) bgClass = "bg-blue-300 dark:bg-blue-700/50"
                      else if (daysOff > 10) bgClass = "bg-blue-500 text-white dark:bg-blue-600"

                      return (
                        <td key={month.toISOString()} className="p-1">
                          <div className={`h-8 w-full rounded-sm flex items-center justify-center text-xs font-semibold ${bgClass} transition-colors hover:ring-2 hover:ring-primary/50 cursor-pointer`} title={`${daysOff} nap távollét`}>
                             {daysOff > 0 ? daysOff : '-'}
                          </div>
                        </td>
                      )
                   })}
                 </tr>
               )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // --- Header Dátum formázása ---
  let headerTitle = ""
  if (viewMode === "heti") {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    const end = endOfWeek(currentDate, { weekStartsOn: 1 })
    headerTitle = `${format(start, "MMM d.", { locale: hu })} - ${format(end, "MMM d.", { locale: hu })}`
  } else if (viewMode === "havi") {
    headerTitle = format(currentDate, "yyyy. MMMM", { locale: hu })
  } else {
    headerTitle = format(currentDate, "yyyy")
  }

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b bg-muted/10 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" /> Csapatnaptár
          </CardTitle>
          <div className="flex bg-muted p-1 rounded-md">
            <button 
              onClick={() => setViewMode("heti")} 
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${viewMode === "heti" ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Heti
            </button>
            <button 
              onClick={() => setViewMode("havi")} 
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${viewMode === "havi" ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Havi
            </button>
            <button 
              onClick={() => setViewMode("eves")} 
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${viewMode === "eves" ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Éves
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("prev")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="w-40 text-center font-medium capitalize text-sm">
            {headerTitle}
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("next")}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate("today")} className="ml-2">
            Ma
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6">
        {viewMode === "heti" && renderWeeklyView()}
        {viewMode === "havi" && renderMonthlyView()}
        {viewMode === "eves" && renderYearlyView()}
      </CardContent>
    </Card>
  )
}
