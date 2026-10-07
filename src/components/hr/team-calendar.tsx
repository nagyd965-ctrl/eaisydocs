"use client"

import { useState, useMemo } from "react"
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addYears,
  subYears,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  startOfYear,
  endOfYear,
  isWithinInterval,
  parseISO,
} from "date-fns"
import { hu } from "date-fns/locale"
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  User2,
  Search,
  Building2,
  Filter,
  X,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { type TeamMember, type LeaveRecord } from "@/types/hr"

type ViewMode = "heti" | "havi" | "eves"

function isLeaveActive(l: LeaveRecord, day: Date): boolean {
  const startStr = l.kezdet_datuma || l.kezdete
  const endStr = l.veg_datuma || l.vege
  if (!startStr || !endStr) return false
  try {
    return isWithinInterval(day, { start: parseISO(startStr), end: parseISO(endStr) })
  } catch {
    return false
  }
}

export function TeamCalendar({
  teamMembers,
  leaves,
  orgUnits = [],
}: {
  teamMembers: TeamMember[]
  leaves: LeaveRecord[]
  orgUnits?: { id: string; nev: string }[]
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("havi")
  const [currentDate, setCurrentDate] = useState(new Date())

  // Szűrők állapota
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedOrgUnit, setSelectedOrgUnit] = useState("all")
  const [selectedType, setSelectedType] = useState("all")
  const [onlyAbsent, setOnlyAbsent] = useState(false)

  // Deduplikáljuk a munkavállalókat dolgozo_id / id alapján
  const uniqueTeamMembers = useMemo(() => {
    const seen = new Set<string>()
    return (teamMembers || []).filter((m) => {
      const id = m.id || (m as any).dolgozo_id || (m as any).user_id
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
  }, [teamMembers])

  // Elérhető szervezeti egységek listája
  const availableOrgUnits = useMemo(() => {
    if (orgUnits && orgUnits.length > 0) {
      return orgUnits
    }
    const map = new Map<string, string>()
    uniqueTeamMembers.forEach((m) => {
      const id = m.szervezeti_egyseg_id || (m.szervezeti_egyseg as any)?.id
      const nev = m.szervezeti_egyseg_nev || (m.szervezeti_egyseg as any)?.nev || (m.szervezeti_egyseg as any)?.megnevezes
      if (id && nev && !map.has(id)) {
        map.set(id, nev)
      }
    })
    return Array.from(map.entries()).map(([id, nev]) => ({ id, nev }))
  }, [orgUnits, uniqueTeamMembers])

  // Színek definiálása típusok alapján
  const typeColors: Record<string, string> = {
    szabadsag: "bg-primary/10 text-primary border-primary/20",
    beteg: "bg-destructive/10 text-destructive border-destructive/20",
    betegszabadsag: "bg-destructive/10 text-destructive border-destructive/20",
    fizetetlen: "bg-muted text-muted-foreground border-border",
    tanulmanyi: "bg-info/10 text-info border-info/20",
    csusztatas: "bg-warning/10 text-warning border-warning/20",
    apasan: "bg-info/10 text-info border-info/20",
    home_office: "bg-secondary text-secondary-foreground border-secondary/40",
    egyeb: "bg-muted text-muted-foreground border-border",
  }

  // Típus alapján szűrt távollétek
  const filteredLeaves = useMemo(() => {
    if (selectedType === "all") return leaves
    return leaves.filter((l) => {
      if (selectedType === "beteg") {
        return l.tipus === "beteg" || l.tipus === "betegszabadsag" || l.tipus === "tappenz"
      }
      return l.tipus === selectedType
    })
  }, [leaves, selectedType])

  // Szűrt munkavállalók
  const displayTeamMembers = useMemo(() => {
    return uniqueTeamMembers.filter((member) => {
      const nev = member.felhasznalo_profil?.nev || member.nev || ""
      const munkakor = member.hr_munkakor?.megnevezes || member.beosztas || ""

      // 1. Kereső szűrés (név vagy munkakör)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesName = nev.toLowerCase().includes(q)
        const matchesJob = munkakor.toLowerCase().includes(q)
        if (!matchesName && !matchesJob) return false
      }

      // 2. Szervezeti egység szűrés
      if (selectedOrgUnit !== "all") {
        const memberOrgId = member.szervezeti_egyseg_id || (member.szervezeti_egyseg as any)?.id
        const memberOrgNev = member.szervezeti_egyseg_nev || (member.szervezeti_egyseg as any)?.nev
        if (memberOrgId !== selectedOrgUnit && memberOrgNev !== selectedOrgUnit) {
          return false
        }
      }

      // 3. Csak távollévők szűrő
      if (onlyAbsent) {
        const hasLeave = filteredLeaves.some((l) => (l.dolgozo_id || l.user_id) === member.id)
        if (!hasLeave) return false
      }

      return true
    })
  }, [uniqueTeamMembers, searchQuery, selectedOrgUnit, onlyAbsent, filteredLeaves])

  const hasActiveFilter = searchQuery.trim() !== "" || selectedOrgUnit !== "all" || selectedType !== "all" || onlyAbsent

  const resetFilters = () => {
    setSearchQuery("")
    setSelectedOrgUnit("all")
    setSelectedType("all")
    setOnlyAbsent(false)
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

    if (displayTeamMembers.length === 0) {
      return (
        <div className="py-12 text-center text-muted-foreground text-sm border border-dashed rounded-lg">
          Nincs a megadott szűrőknek megfelelő munkatárs.
        </div>
      )
    }

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="col-span-1 p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Csapattag</div>
            {days.map(day => (
              <div key={day.toISOString()} className={`col-span-1 p-2 text-center border-b ${isSameDay(day, new Date()) ? 'border-primary' : ''}`}>
                <div className="text-xs font-semibold uppercase">{format(day, "EEEE", { locale: hu })}</div>
                <div className={`text-lg tabular-nums ${isSameDay(day, new Date()) ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>

          {/* Sorok */}
          <div className="space-y-2">
            {displayTeamMembers.map(member => {
              const nev = member.felhasznalo_profil?.nev || member.nev || "Ismeretlen"
              const initials = nev.substring(0, 2).toUpperCase()
              const orgNev = member.szervezeti_egyseg_nev || (member.szervezeti_egyseg as any)?.nev
              const memberLeaves = filteredLeaves.filter(l => (l.dolgozo_id || l.user_id) === member.id)

              return (
                <div key={member.id} className="grid grid-cols-8 gap-1 items-center border rounded-md p-1 bg-card">
                  <div className="col-span-1 flex items-center gap-2 p-1 overflow-hidden">
                     <Avatar className="w-8 h-8 rounded-md shrink-0">
                       <AvatarFallback className="text-[10px] rounded-md bg-muted text-muted-foreground">{initials}</AvatarFallback>
                     </Avatar>
                     <div className="min-w-0">
                       <span className="text-xs font-medium truncate block" title={nev}>{nev}</span>
                       {orgNev && (
                         <span className="text-[10px] text-muted-foreground truncate block">{orgNev}</span>
                       )}
                     </div>
                  </div>
                  
                  {/* Napok */}
                  {days.map(day => {
                    const activeLeave = memberLeaves.find(l => isLeaveActive(l, day))

                    return (
                      <div key={day.toISOString()} className={`col-span-1 h-10 rounded-sm flex items-center justify-center p-1 ${activeLeave ? (typeColors[activeLeave.tipus] || 'bg-primary/10 text-primary border-primary/20') + ' border' : 'bg-muted/30'}`}>
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
          
          // Ezen a napon távollévők keresése a szűrt munkavállalókból
          const absentMembers = displayTeamMembers.filter(member => {
             return filteredLeaves.some(l => (l.dolgozo_id || l.user_id) === member.id && isLeaveActive(l, day))
          })

          return (
            <div key={day.toISOString()} className={`min-h-[120px] bg-card p-2 flex flex-col transition-colors hover:bg-muted/20 border-border/50 ${!isCurrentMonth ? 'opacity-40 bg-muted/10' : ''} ${isToday ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/20 rounded-md z-10' : ''}`}>
              <div className={`text-right tabular-nums text-xs font-semibold mb-2 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                {format(day, "d")}
              </div>
              <div className="flex-1 flex flex-col gap-1">
                {absentMembers.length > 0 && (
                  <Popover>
                    <PopoverTrigger className="text-xs w-full bg-primary/10 hover:bg-primary/20 text-primary font-semibold py-1.5 px-2 rounded-md transition-colors text-left flex items-center justify-between border border-primary/20">
                        <span>{absentMembers.length} távollét</span>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 border-muted" align="start">
                      <div className="bg-muted/50 p-3 border-b flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-primary" />
                        <h4 className="font-semibold text-sm">
                          {format(day, "yyyy. MMMM d.", { locale: hu })}
                        </h4>
                      </div>
                      <div className="p-2 max-h-[300px] overflow-y-auto space-y-1">
                        {absentMembers.map(member => {
                          const nev = member.felhasznalo_profil?.nev || member.nev || "Ismeretlen"
                          const munkakor = member.hr_munkakor?.megnevezes || member.beosztas || "Nincs beosztás"
                          const orgNev = member.szervezeti_egyseg_nev || (member.szervezeti_egyseg as any)?.nev
                          const initials = nev.substring(0, 2).toUpperCase()
                          const leave = filteredLeaves.find(l => (l.dolgozo_id || l.user_id) === member.id && isLeaveActive(l, day))
                          if (!leave) return null
                          
                          return (
                            <div key={member.id} className="flex flex-col gap-1 p-2 hover:bg-muted/50 rounded-md transition-colors">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-9 h-9 rounded-full border shrink-0">
                                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold truncate leading-tight">{nev}</p>
                                  <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                                    <User2 className="w-3 h-3 shrink-0" /> {munkakor}
                                    {orgNev && <span className="opacity-75">· {orgNev}</span>}
                                  </p>
                                </div>
                                <Badge variant="outline" className={`text-[10px] uppercase font-semibold shrink-0 ${typeColors[leave.tipus] || ""}`}>
                                  {leave.tipus}
                                </Badge>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
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

    if (displayTeamMembers.length === 0) {
      return (
        <div className="py-12 text-center text-muted-foreground text-sm border border-dashed rounded-lg">
          Nincs a megadott szűrőknek megfelelő munkatárs.
        </div>
      )
    }

    return (
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="p-3 font-semibold text-muted-foreground text-xs uppercase w-52">Csapattag</th>
              {months.map(month => (
                <th key={month.toISOString()} className="p-3 text-center font-semibold text-muted-foreground text-xs uppercase w-16">
                  {format(month, "MMM", { locale: hu })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {displayTeamMembers.map(member => {
               const nev = member.felhasznalo_profil?.nev || member.nev || "Ismeretlen"
               const orgNev = member.szervezeti_egyseg_nev || (member.szervezeti_egyseg as any)?.nev
               const memberLeaves = filteredLeaves.filter(l => (l.dolgozo_id || l.user_id) === member.id)

               return (
                 <tr key={member.id} className="bg-card hover:bg-muted/30 transition-colors">
                   <td className="p-3 font-medium truncate max-w-[220px]">
                     <div className="truncate">{nev}</div>
                     {orgNev && (
                       <div className="text-[11px] text-muted-foreground truncate">{orgNev}</div>
                     )}
                   </td>
                   {months.map(month => {
                      // Kiszámoljuk, hány napot volt távol az adott hónapban
                      const daysInMonth = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
                      let daysOff = 0
                      
                      daysInMonth.forEach(day => {
                        if (memberLeaves.some(l => isLeaveActive(l, day))) {
                          // Csak a munkanapokat (hétfő-péntek) számoljuk
                          if (day.getDay() !== 0 && day.getDay() !== 6) daysOff++
                        }
                      })

                      let bgClass = "bg-transparent"
                      if (daysOff > 0 && daysOff <= 3) bgClass = "bg-primary/20 text-primary-foreground dark:bg-primary/30"
                      else if (daysOff > 3 && daysOff <= 10) bgClass = "bg-primary/50 text-primary-foreground dark:bg-primary/50"
                      else if (daysOff > 10) bgClass = "bg-primary text-primary-foreground dark:bg-primary"

                      return (
                        <td key={month.toISOString()} className="p-1">
                          <div className={`h-8 w-full rounded-sm flex items-center justify-center text-xs tabular-nums font-semibold ${bgClass} transition-colors hover:ring-2 hover:ring-primary/50 cursor-pointer`} title={`${daysOff} nap távollét`}>
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
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${viewMode === "heti" ? 'bg-background' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Heti
            </button>
            <button 
              onClick={() => setViewMode("havi")} 
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${viewMode === "havi" ? 'bg-background' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Havi
            </button>
            <button 
              onClick={() => setViewMode("eves")} 
              className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${viewMode === "eves" ? 'bg-background' : 'text-muted-foreground hover:text-foreground'}`}
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

      {/* Szűrősáv: Kereső, Szervezeti Egység, Távollét Típus, Csak távollévők és Törlés */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b bg-muted/5">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          {/* Név / munkakör kereső */}
          <div className="relative w-56 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Keresés névre vagy munkakörre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Szervezeti Egység / Részleg szűrő */}
          {availableOrgUnits.length > 0 && (
            <div className="w-48 sm:w-56">
              <Select value={selectedOrgUnit} onValueChange={(val) => setSelectedOrgUnit(val || "all")}>
                <SelectTrigger className="h-9 text-xs">
                  <Building2 className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Minden részleg" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Minden részleg</SelectItem>
                  {availableOrgUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.nev}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Távollét Típus szűrő */}
          <div className="w-40 sm:w-44">
            <Select value={selectedType} onValueChange={(val) => setSelectedType(val || "all")}>
              <SelectTrigger className="h-9 text-xs">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Minden típus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Minden típus</SelectItem>
                <SelectItem value="szabadsag" className="text-xs">Szabadság</SelectItem>
                <SelectItem value="beteg" className="text-xs">Betegszabadság</SelectItem>
                <SelectItem value="csusztatas" className="text-xs">Csúsztatás</SelectItem>
                <SelectItem value="fizetetlen" className="text-xs">Fizetetlen</SelectItem>
                <SelectItem value="tanulmanyi" className="text-xs">Tanulmányi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Csak távollévők toggle gomb */}
          <Button
            variant={onlyAbsent ? "secondary" : "outline"}
            size="sm"
            onClick={() => setOnlyAbsent(!onlyAbsent)}
            className="h-9 text-xs gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Csak távollévők</span>
          </Button>

          {/* Szűrők törlése gomb */}
          {hasActiveFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="w-3.5 h-3.5" /> Szűrők törlése
            </Button>
          )}
        </div>

        {/* Eredmény számláló */}
        <div className="text-xs text-muted-foreground font-medium tabular-nums shrink-0">
          {displayTeamMembers.length} / {uniqueTeamMembers.length} munkatárs
        </div>
      </div>
      
      <CardContent className="p-4 sm:p-6">
        {viewMode === "heti" && renderWeeklyView()}
        {viewMode === "havi" && renderMonthlyView()}
        {viewMode === "eves" && renderYearlyView()}
      </CardContent>
    </Card>
  )
}
