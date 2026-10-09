"use client"

import { useState, useTransition, useMemo } from "react"
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  addDays,
  subWeeks,
  addWeeks,
  isSameDay,
  isToday,
} from "date-fns"
import { hu } from "date-fns/locale"
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  AlertTriangle,
  Clock,
  User2,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Palmtree,
  Stethoscope,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  WeeklyRosterData,
  ShiftTemplate,
  ShiftAssignment,
  ShiftPlannerEmployee,
  ShiftDayLeave,
} from "@/types/shifts"
import {
  saveShiftAssignmentAction,
  copyPreviousWeekRosterAction,
  getWeeklyShiftRoster,
} from "@/app/hr/time/shift-actions"
import { toast } from "sonner"

interface ShiftPlannerWeeklyGridProps {
  initialData: WeeklyRosterData
}

export function ShiftPlannerWeeklyGrid({ initialData }: ShiftPlannerWeeklyGridProps) {
  const [data, setData] = useState<WeeklyRosterData>(initialData)
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(initialData.weekStart)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedOrgUnit, setSelectedOrgUnit] = useState<string>("all")
  const [isPending, startTransition] = useTransition()

  // Napok generálása a hétfőtől vasárnapig (7 nap)
  const weekDays = useMemo(() => {
    const monday = parseISO(currentWeekStart)
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  }, [currentWeekStart])

  // Szervezeti egységek listája szűrőhöz
  const orgUnits = useMemo(() => {
    const map = new Map<string, string>()
    for (const emp of data.employees) {
      if (emp.szervezeti_egyseg_id && emp.szervezeti_egyseg_nev) {
        map.set(emp.szervezeti_egyseg_id, emp.szervezeti_egyseg_nev)
      }
    }
    return Array.from(map.entries()).map(([id, nev]) => ({ id, nev }))
  }, [data.employees])

  // Szűrt dolgozók
  const filteredEmployees = useMemo(() => {
    return data.employees.filter((emp) => {
      const matchSearch =
        !searchQuery ||
        emp.nev.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.munkakor.toLowerCase().includes(searchQuery.toLowerCase())

      const matchOrg =
        selectedOrgUnit === "all" ||
        emp.szervezeti_egyseg_id === selectedOrgUnit

      return matchSearch && matchOrg
    })
  }, [data.employees, searchQuery, selectedOrgUnit])

  // Navigáció hetek között
  const handleWeekChange = (offset: number) => {
    const current = parseISO(currentWeekStart)
    const nextDate = offset > 0 ? addWeeks(current, 1) : subWeeks(current, 1)
    const nextMondayStr = format(startOfWeek(nextDate, { weekStartsOn: 1 }), "yyyy-MM-dd")
    setCurrentWeekStart(nextMondayStr)

    startTransition(async () => {
      try {
        const freshData = await getWeeklyShiftRoster(nextMondayStr)
        setData(freshData)
      } catch (e: any) {
        toast.error("Nem sikerült betölteni a heti beosztást: " + e.message)
      }
    })
  }

  const handleTodayClick = () => {
    const todayMondayStr = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
    setCurrentWeekStart(todayMondayStr)
    startTransition(async () => {
      try {
        const freshData = await getWeeklyShiftRoster(todayMondayStr)
        setData(freshData)
      } catch (e: any) {
        toast.error("Hiba: " + e.message)
      }
    })
  }

  // Előző hét másolása
  const handleCopyPreviousWeek = () => {
    startTransition(async () => {
      const res = await copyPreviousWeekRosterAction(currentWeekStart)
      if (res.success) {
        toast.success(`Sikeresen átmásolva ${res.copiedCount ?? 0} db műszakbeosztás!`)
        const freshData = await getWeeklyShiftRoster(currentWeekStart)
        setData(freshData)
      } else {
        toast.error(res.error || "Nem sikerült a másolás")
      }
    })
  }

  // Műszak gyors hozzárendelése vagy módosítása
  const handleAssignShift = (
    dolgozoId: string,
    dayStr: string,
    sablonId: string | null
  ) => {
    startTransition(async () => {
      const res = await saveShiftAssignmentAction({
        dolgozo_id: dolgozoId,
        datum: dayStr,
        sablon_id: sablonId,
      })

      if (res.success) {
        if (res.warning) {
          toast.warning(res.warning)
        } else {
          toast.success(sablonId ? "Műszak mentve" : "Műszak törölve")
        }
        const freshData = await getWeeklyShiftRoster(currentWeekStart)
        setData(freshData)
      } else {
        toast.error(res.error || "Hiba történt a mentéskor")
      }
    })
  }

  // Segédfüggvény: dolgozó adott napi távolléte
  const getEmployeeDayLeave = (dolgozoId: string, dayStr: string): ShiftDayLeave | undefined => {
    return data.leaves.find(
      (l) => l.dolgozo_id === dolgozoId && l.kezdet_datuma <= dayStr && l.veg_datuma >= dayStr
    )
  }

  // Segédfüggvény: dolgozó adott napi műszakbeosztása
  const getEmployeeDayAssignment = (
    dolgozoId: string,
    dayStr: string
  ): ShiftAssignment | undefined => {
    return data.assignments.find(
      (a) => a.dolgozo_id === dolgozoId && a.datum === dayStr
    )
  }

  // Dolgozó heti tervezett óráinak összege
  const getEmployeeWeeklyHours = (dolgozoId: string): number => {
    const empAssignments = data.assignments.filter((a) => a.dolgozo_id === dolgozoId)
    return empAssignments.reduce((sum, a) => sum + (Number(a.tervezett_ora) || 0), 0)
  }

  // Napi összesítő műszaktípusonként (Fejléc vagy lábléc kártyákhoz)
  const getDayShiftCounts = (dayStr: string) => {
    const dayAssignments = data.assignments.filter((a) => a.datum === dayStr)
    const counts: Record<string, number> = {}
    for (const a of dayAssignments) {
      const code = a.sablon?.kod || "Egyedi"
      counts[code] = (counts[code] || 0) + 1
    }
    return {
      total: dayAssignments.length,
      counts,
    }
  }

  // Heti statisztikák
  const totalWeeklyHours = useMemo(() => {
    return data.assignments.reduce((sum, a) => sum + (Number(a.tervezett_ora) || 0), 0)
  }, [data.assignments])

  const totalAssignedShifts = data.assignments.length

  const weekEndStr = format(weekDays[6], "yyyy-MM-dd")
  const currentWeekFormatted = `${format(weekDays[0], "yyyy. MMMM d.", { locale: hu })} – ${format(
    weekDays[6],
    "MMMM d.",
    { locale: hu }
  )}`

  return (
    <div className="space-y-4">
      {/* 1. Fejléc vezérlősáv és heti statisztikák */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border">
        {/* Bal oldal: Időszak választó */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-background p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => handleWeekChange(-1)}
              disabled={isPending}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs font-medium"
              onClick={handleTodayClick}
              disabled={isPending}
            >
              Ma
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => handleWeekChange(1)}
              disabled={isPending}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <h2 className="text-base font-semibold capitalize tracking-tight text-foreground">
              {currentWeekFormatted}
            </h2>
            <p className="text-xs text-muted-foreground">
              {format(weekDays[0], "w.")} hét beosztása
            </p>
          </div>
        </div>

        {/* Közép: Heti statisztikai mutatók */}
        <div className="flex items-center gap-4 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border/60">
            <span className="text-muted-foreground">Beosztott műszak: </span>
            <span className="font-semibold tabular-nums text-foreground">
              {totalAssignedShifts} db
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-muted/50 border border-border/60">
            <span className="text-muted-foreground">Összes tervezett óra: </span>
            <span className="font-semibold tabular-nums text-foreground">
              {totalWeeklyHours} óra
            </span>
          </div>
        </div>

        {/* Jobb oldal: Akciók (Előző hét másolása) */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium border-primary/30 text-primary hover:bg-primary/10"
            onClick={handleCopyPreviousWeek}
            disabled={isPending}
          >
            <Copy className="h-3.5 w-3.5" />
            Előző hét másolása
          </Button>
        </div>
      </div>

      {/* 2. Szűrősáv (Kereső & Részlegválasztó) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Keresés névre vagy munkakörre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>

          <Select
            value={selectedOrgUnit}
            onValueChange={(val) => setSelectedOrgUnit(val || "all")}
          >
            <SelectTrigger className="h-8 text-xs w-48 bg-background">
              <SelectValue placeholder="Minden részleg" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Minden részleg ({data.employees.length})</SelectItem>
              {orgUnits.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nev}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-muted-foreground">
          Megjelenítve: <span className="font-medium text-foreground">{filteredEmployees.length}</span> /{" "}
          {data.employees.length} munkatárs
        </div>
      </div>

      {/* 3. Fő Műszak Tervező Rács (Table) */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            {/* Fejléc: Dolgozó + 7 nap + Heti összesítő */}
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="py-3 px-3 text-left font-semibold text-muted-foreground uppercase tracking-wider w-64 min-w-[240px]">
                  Munkatárs
                </th>
                {weekDays.map((day) => {
                  const dayStr = format(day, "yyyy-MM-dd")
                  const isCurrent = isToday(day)
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6

                  return (
                    <th
                      key={dayStr}
                      className={`py-2 px-2 text-center border-l border-border/40 min-w-[120px] ${
                        isCurrent
                          ? "bg-primary/10 text-primary font-semibold"
                          : isWeekend
                          ? "bg-muted/60 text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                        {format(day, "EEEE", { locale: hu })}
                      </div>
                      <div className="text-sm font-semibold tabular-nums mt-0.5">
                        {format(day, "d. MMM", { locale: hu })}
                      </div>
                    </th>
                  )
                })}
                <th className="py-3 px-3 text-center font-semibold text-muted-foreground uppercase tracking-wider w-28 border-l border-border/40">
                  Heti óra
                </th>
              </tr>
            </thead>

            {/* Dolgozók sorai */}
            <tbody className="divide-y divide-border/50">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-muted-foreground">
                    Nem található munkatárs a megadott szűrési feltételekkel.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const weeklyHours = getEmployeeWeeklyHours(emp.id)

                  // 48h heti törvényi korlát figyelmeztetés (HR-TASK-02)
                  const isOver48 = weeklyHours > 48
                  const isOver40 = weeklyHours > 40 && !isOver48

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-muted/20 transition-colors group"
                    >
                      {/* 1. Munkatárs adatlap oszlop */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 text-xs border border-border">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[11px]">
                              {emp.nev.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-foreground truncate block">
                                {emp.nev}
                              </span>
                              {/* Orvosi alkalmasság figyelmeztetés (HR-TASK-05) */}
                              {emp.orvosi_statusz === "lejart" && (
                                <span
                                  title={`Lejárt orvosi alkalmasság (${emp.orvosi_ervenyesseg})!`}
                                  className="inline-flex text-destructive"
                                >
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                </span>
                              )}
                              {emp.orvosi_statusz === "lejar_hamarosan" && (
                                <span
                                  title={`Hamarosan lejáró orvosi alkalmasság (${emp.orvosi_ervenyesseg})!`}
                                  className="inline-flex text-amber-500"
                                >
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {emp.munkakor}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. 7 Nap oszlopai */}
                      {weekDays.map((day) => {
                        const dayStr = format(day, "yyyy-MM-dd")
                        const leave = getEmployeeDayLeave(emp.id, dayStr)
                        const assignment = getEmployeeDayAssignment(emp.id, dayStr)
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6
                        const isCurrent = isToday(day)

                        return (
                          <td
                            key={dayStr}
                            className={`p-1.5 text-center border-l border-border/40 align-middle ${
                              isCurrent
                                ? "bg-primary/5"
                                : isWeekend
                                ? "bg-muted/20"
                                : ""
                            }`}
                          >
                            {/* Ha van távollét (szabadság, táppénz) ezen a napon */}
                            {leave ? (
                              <div
                                className="px-2 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-medium flex items-center justify-center gap-1"
                                title={`Távollét (${leave.tipus}): ${leave.statusz}`}
                              >
                                <Palmtree className="h-3 w-3 shrink-0" />
                                <span className="truncate capitalize">{leave.tipus}</span>
                              </div>
                            ) : assignment ? (
                              /* Ha van beosztott műszak */
                              <Popover>
                                <PopoverTrigger
                                  style={{
                                    borderColor: assignment.sablon?.szin_kod
                                      ? `${assignment.sablon.szin_kod}40`
                                      : undefined,
                                    backgroundColor: assignment.sablon?.szin_kod
                                      ? `${assignment.sablon.szin_kod}15`
                                      : undefined,
                                  }}
                                  className="w-full px-2 py-1.5 rounded-md border text-[11px] text-left transition-all hover:scale-[1.02] cursor-pointer"
                                >
                                  <div className="flex items-center justify-between">
                                    <span
                                      className="font-bold text-xs"
                                      style={{
                                        color: assignment.sablon?.szin_kod || "#0d9488",
                                      }}
                                    >
                                      {assignment.sablon?.kod || "Egyedi"}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                                      {assignment.tervezett_ora}h
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {assignment.sablon?.kezdes_ido?.substring(0, 5) ||
                                      assignment.egyedi_kezdes?.substring(0, 5)}{" "}
                                    -{" "}
                                    {assignment.sablon?.befejezes_ido?.substring(0, 5) ||
                                      assignment.egyedi_befejezes?.substring(0, 5)}
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-56 p-2 text-xs space-y-2 bg-popover border-border shadow-md"
                                  align="center"
                                >
                                  <div className="font-semibold text-foreground border-b border-border pb-1">
                                    Műszak módosítása
                                  </div>
                                  <div className="grid grid-cols-2 gap-1">
                                    {data.templates.map((tmpl) => (
                                      <Button
                                        key={tmpl.id}
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs justify-start gap-1.5 px-2"
                                        onClick={() =>
                                          handleAssignShift(emp.id, dayStr, tmpl.id)
                                        }
                                      >
                                        <span
                                          className="h-2 w-2 rounded-full"
                                          style={{ backgroundColor: tmpl.szin_kod }}
                                        />
                                        <span className="font-semibold">{tmpl.kod}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                          ({tmpl.munkaora}h)
                                        </span>
                                      </Button>
                                    ))}
                                  </div>
                                  <div className="pt-1 border-t border-border flex justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-destructive hover:bg-destructive/10 gap-1 w-full justify-center"
                                      onClick={() =>
                                        handleAssignShift(emp.id, dayStr, null)
                                      }
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Műszak törlése
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              /* Ha üres a nap: Kattintással választható sablon */
                              <Popover>
                                <PopoverTrigger
                                  className="w-full h-10 rounded-md border border-dashed border-border/40 hover:border-primary/50 hover:bg-primary/5 flex items-center justify-center text-muted-foreground/40 hover:text-primary transition-all cursor-pointer group-hover:border-border/80"
                                  title="Műszak hozzárendelése"
                                >
                                  <Plus className="h-3.5 w-3.5 opacity-50 hover:opacity-100" />
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-56 p-2 text-xs space-y-2 bg-popover border-border shadow-md"
                                  align="center"
                                >
                                  <div className="font-semibold text-foreground border-b border-border pb-1">
                                    Műszak hozzárendelése
                                  </div>
                                  <div className="grid grid-cols-2 gap-1">
                                    {data.templates.map((tmpl) => (
                                      <Button
                                        key={tmpl.id}
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs justify-start gap-1.5 px-2"
                                        onClick={() =>
                                          handleAssignShift(emp.id, dayStr, tmpl.id)
                                        }
                                      >
                                        <span
                                          className="h-2 w-2 rounded-full"
                                          style={{ backgroundColor: tmpl.szin_kod }}
                                        />
                                        <span className="font-semibold">{tmpl.kod}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                          ({tmpl.munkaora}h)
                                        </span>
                                      </Button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                          </td>
                        )
                      })}

                      {/* 3. Heti összesítő oszlop (48h szabály ellenőrzéssel) */}
                      <td className="py-2.5 px-3 text-center border-l border-border/40 align-middle">
                        <div className="flex flex-col items-center justify-center">
                          <span
                            className={`font-semibold tabular-nums text-xs px-2 py-0.5 rounded-full ${
                              isOver48
                                ? "bg-destructive/15 text-destructive font-bold"
                                : isOver40
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold"
                                : "text-foreground"
                            }`}
                          >
                            {weeklyHours} óra
                          </span>
                          {isOver48 && (
                            <span
                              className="text-[9px] text-destructive font-bold flex items-center gap-0.5 mt-0.5"
                              title="Túllépte a heti 48 órás Mt. törvényi maximumot!"
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />
                              &gt;48h Mt.!
                            </span>
                          )}
                          {isOver40 && (
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">
                              +{weeklyHours - 40}h túlóra
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>

            {/* Lábléc: Napi létszám / műszak lefedettség */}
            <tfoot>
              <tr className="border-t border-border bg-muted/40 font-medium text-muted-foreground">
                <td className="py-2.5 px-3 text-left">
                  <span className="font-semibold text-foreground text-xs">
                    Napi Létszám
                  </span>
                </td>
                {weekDays.map((day) => {
                  const dayStr = format(day, "yyyy-MM-dd")
                  const { total, counts } = getDayShiftCounts(dayStr)

                  return (
                    <td
                      key={dayStr}
                      className="py-2 px-1 text-center border-l border-border/40 text-[11px]"
                    >
                      <div className="font-semibold tabular-nums text-foreground">
                        {total} fő
                      </div>
                      <div className="text-[10px] text-muted-foreground flex flex-wrap justify-center gap-1 mt-0.5">
                        {Object.entries(counts).map(([code, cnt]) => (
                          <span key={code} className="inline-block">
                            {code}:{cnt}
                          </span>
                        ))}
                      </div>
                    </td>
                  )
                })}
                <td className="py-2.5 px-3 text-center border-l border-border/40 font-semibold text-foreground tabular-nums">
                  {totalWeeklyHours} óra
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
