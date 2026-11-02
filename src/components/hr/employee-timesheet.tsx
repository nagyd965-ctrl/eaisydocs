"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { KpiCard } from "@/components/kpi-card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Loader2, Pencil } from "lucide-react"
import {
  getMonthlyTimesheet,
  type TimesheetEntry,
} from "@/app/hr/attendance-actions"
import { OvertimeActionDialog } from "@/components/hr/overtime-action-dialog"
import { AttendanceCorrectionDialog } from "@/components/hr/attendance-correction-dialog"
import { LeaveRequestDialog } from "@/components/hr/leave-request-dialog"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

const typeColors = {
  munka: "bg-background text-foreground",
  szabadsag: "bg-info/10 text-info",
  betegseg: "bg-destructive/10 text-destructive",
  csusztatas: "bg-warning/10 text-warning",
  hetvege: "bg-muted/40 text-muted-foreground",
  unnep: "bg-primary/10 text-primary",
}

const typeLabels: Record<string, string> = {
  munka: "Munkanap",
  szabadsag: "Szabadság",
  betegseg: "Betegség",
  csusztatas: "Csúsztatás (Túlóra)",
  hetvege: "Hétvége",
  unnep: "Ünnepnap",
}

const weekdayHeaders = [
  "Hétfő",
  "Kedd",
  "Szerda",
  "Csütörtök",
  "Péntek",
  "Szombat",
  "Vasárnap",
]

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
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar")
  const [overtimeBalance, setOvertimeBalance] = useState<number | null>(null)
  const [overtimeDialogOpen, setOvertimeDialogOpen] = useState(false)

  // Naptári dátumkijelölés (1 nap vagy tartomány) szabadságkéréshez
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [rangeEnd, setRangeEnd] = useState<string | null>(null)
  const [leaveModalOpen, setLeaveModalOpen] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  const todayStr = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Budapest",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date())
    } catch {
      return new Date().toISOString().split("T")[0]
    }
  }, [])

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

  const prevMonth = () => {
    setRangeStart(null)
    setRangeEnd(null)
    setCurrentDate(new Date(year, month - 2, 1))
  }
  const nextMonth = () => {
    setRangeStart(null)
    setRangeEnd(null)
    setCurrentDate(new Date(year, month, 1))
  }
  const goToToday = () => {
    setRangeStart(null)
    setRangeEnd(null)
    setCurrentDate(new Date())
  }

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "-"
    return new Date(isoString).toLocaleTimeString("hu-HU", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const calculateHours = (
    start: string | null,
    end: string | null,
    szunetMs?: number,
    szunetPerc?: number
  ) => {
    if (!start || !end) return 0
    const rawDiffMs = new Date(end).getTime() - new Date(start).getTime()
    const breakMs =
      Number(szunetMs || 0) || Number(szunetPerc || 0) * 60000
    const netMs = Math.max(0, rawDiffMs - breakMs)
    return netMs / (1000 * 60 * 60)
  }

  const formatHours = (hours: number) => {
    if (hours === 0) return "-"
    return `${hours.toFixed(1)} h`
  }

  const totalHours = timesheet.reduce((sum, entry) => {
    if (entry.type === "munka")
      return (
        sum +
        calculateHours(
          entry.becsekkolas_ideje,
          entry.kicsekkolas_ideje,
          entry.szunet_ms,
          entry.szunet_perc
        )
      )
    return sum
  }, 0)

  const totalDaysWorked = timesheet.filter(
    (t) => t.type === "munka" && t.becsekkolas_ideje
  ).length
  const totalLeaveDays = timesheet.filter(
    (t) =>
      t.type === "szabadsag" ||
      t.type === "betegseg" ||
      t.type === "csusztatas"
  ).length
  const totalScheduledShifts = timesheet.filter((t) => Boolean(t.shiftCode)).length

  const monthLabel = `${year}. ${new Date(year, month - 1).toLocaleString(
    "hu-HU",
    { month: "long" }
  )}`

  // Havi naptárrács felépítése (Hétfő = 0 ... Vasárnap = 6)
  const calendarCells = useMemo(() => {
    if (timesheet.length === 0) return []
    const firstDateObj = new Date(Date.UTC(year, month - 1, 1))
    // getUTCDay(): 0 = Vasárnap, 1 = Hétfő ... 6 = Szombat
    const firstDayUtc = firstDateObj.getUTCDay()
    const leadingEmptyCount = firstDayUtc === 0 ? 6 : firstDayUtc - 1

    const cells: Array<TimesheetEntry | null> = []
    for (let i = 0; i < leadingEmptyCount; i++) {
      cells.push(null)
    }
    for (const entry of timesheet) {
      cells.push(entry)
    }
    while (cells.length % 7 !== 0) {
      cells.push(null)
    }
    return cells
  }, [timesheet, year, month])

  // Dátumra kattintás kezelése (1. kattintás: kezdőnap, 2. kattintás: zárónap)
  const handleDayClick = (dateStr: string) => {
    if (!rangeStart || (rangeStart && rangeEnd && rangeStart !== rangeEnd)) {
      setRangeStart(dateStr)
      setRangeEnd(dateStr)
    } else {
      if (dateStr < rangeStart) {
        setRangeEnd(rangeStart)
        setRangeStart(dateStr)
      } else {
        setRangeEnd(dateStr)
      }
    }
  }

  const isDateInSelectedRange = (dateStr: string) => {
    if (!rangeStart) return false
    const end = rangeEnd || rangeStart
    return dateStr >= rangeStart && dateStr <= end
  }

  const openLeaveModalForDate = (start: string, end?: string) => {
    setRangeStart(start)
    setRangeEnd(end || start)
    setLeaveModalOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Stat kártyák – 4 oszlopos Linear-flat sáv */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Ledolgozott Órák"
          value={loading ? "..." : `${totalHours.toFixed(1)} h`}
          sub="Ebben a hónapban"
        />
        <KpiCard
          label="Munkanapok / Beosztás"
          value={loading ? "..." : `${totalDaysWorked} nap`}
          sub={
            totalScheduledShifts > 0
              ? `${totalScheduledShifts} beosztott műszak a hónapban`
              : "Ebben a hónapban"
          }
        />
        <KpiCard
          label="Távollét"
          value={loading ? "..." : `${totalLeaveDays} nap`}
          sub="Jóváhagyott távollét a hónapban"
        />
        <div
          onClick={() => setOvertimeDialogOpen(true)}
          className="cursor-pointer"
        >
          <KpiCard
            label="Túlóra Egyenleg"
            value={formatOvertime(overtimeBalance)}
            sub={
              overtimeBalance && overtimeBalance > 0
                ? "Kattints a csúsztatáshoz"
                : "Kattints a részletekhez"
            }
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

      {/* Előre kitöltött Szabadság / Távollét igénylő modál (a naptárból nyitva) */}
      <LeaveRequestDialog
        controlledOpen={leaveModalOpen}
        onControlledOpenChange={setLeaveModalOpen}
        initialStartDate={rangeStart || undefined}
        initialEndDate={rangeEnd || rangeStart || undefined}
        hideTrigger={true}
        onSuccess={() => {
          setRangeStart(null)
          setRangeEnd(null)
          loadData()
        }}
      />

      {/* Fő Naptár és Jelenléti Ív Kártya */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Beosztás és Jelenléti Naptár
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Havi műszakbeosztás, ledolgozott munkaidő és távollétek. Kattints egy napra (vagy jelölj ki egy időszakot) szabadság igényléséhez!
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Nézetváltó: Naptár vs Táblázatos ív */}
              <div className="flex items-center bg-muted p-0.5 rounded-md border border-border">
                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    viewMode === "calendar"
                      ? "bg-card text-foreground border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Naptár nézet
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    viewMode === "table"
                      ? "bg-card text-foreground border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Táblázatos ív
                </button>
              </div>

              <AttendanceCorrectionDialog onSuccess={loadData} />

              {/* Hónap léptető */}
              <div className="flex items-center border border-border rounded-md bg-card">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevMonth}
                  className="h-8 w-8 rounded-none"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <button
                  type="button"
                  onClick={goToToday}
                  title="Ugrás az aktuális hónapra"
                  className="text-xs font-semibold px-3 text-center min-w-[130px] capitalize hover:text-primary transition-colors"
                >
                  {monthLabel}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextMonth}
                  className="h-8 w-8 rounded-none"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Kijelölt időszak gyorsműveleti sáv (ha a felhasználó rákattintott 1 vagy több napra a naptárban) */}
          {viewMode === "calendar" && rangeStart && (
            <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 bg-primary/5 px-3 py-2 rounded-md border border-primary/20">
              <div className="text-xs text-foreground">
                <span className="font-semibold text-primary">
                  Kijelölt időszak:
                </span>{" "}
                <span className="font-mono tabular-nums font-medium">
                  {rangeStart}
                  {rangeEnd && rangeEnd !== rangeStart
                    ? ` – ${rangeEnd}`
                    : ""}
                </span>
                <span className="text-muted-foreground ml-2">
                  (Kattints egy másik napra a tartomány kijelöléséhez)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs font-medium"
                  onClick={() => setLeaveModalOpen(true)}
                >
                  Szabadság / Távollét igénylése erre az időszakra
                </Button>
                {(!rangeEnd || rangeEnd === rangeStart) && (
                  <AttendanceCorrectionDialog
                    initialDate={rangeStart}
                    onSuccess={loadData}
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs font-medium"
                      >
                        Időkorrekció erre a napra
                      </Button>
                    }
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setRangeStart(null)
                    setRangeEnd(null)
                  }}
                >
                  Kijelölés törlése
                </Button>
              </div>
            </div>
          )}

          {/* Jelmagyarázat (Naptár nézethez) */}
          {viewMode === "calendar" && (
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-primary/20 border border-primary/40" />
                <span>Beosztott műszak</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20 border border-emerald-500/40" />
                <span>Ledolgozott munkaidő</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500/20 border border-sky-500/40" />
                <span>Jóváhagyott szabadság / távollét</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/20 border border-amber-500/40" />
                <span>Jóváhagyásra váró kérelem</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500/20 border border-purple-500/40" />
                <span>Munkaszüneti nap / Ünnepnap</span>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : viewMode === "calendar" ? (
            /* =============================================================== */
            /* 1. HAVI INTERAKTÍV NAPTÁR NÉZET (7 OSZLOP: HÉTFŐ – VASÁRNAP)   */
            /* =============================================================== */
            <div className="p-4">
              <div className="grid grid-cols-7 border-t border-l border-border rounded-lg overflow-hidden">
                {/* Hét napjai fejléc */}
                {weekdayHeaders.map((dayName, idx) => (
                  <div
                    key={dayName}
                    className={`py-2 px-2.5 text-xs font-semibold uppercase tracking-wider border-r border-b border-border text-center ${
                      idx >= 5
                        ? "bg-muted/60 text-muted-foreground"
                        : "bg-muted/30 text-foreground"
                    }`}
                  >
                    {dayName}
                  </div>
                ))}

                {/* Naptár napok cellái */}
                {calendarCells.map((entry, idx) => {
                  if (!entry) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="min-h-[116px] bg-muted/15 border-r border-b border-border p-2"
                      />
                    )
                  }

                  const dayNum = Number(entry.datum.slice(8, 10))
                  const isTodayCell = entry.datum === todayStr
                  const isSelected = isDateInSelectedRange(entry.datum)
                  const isWeekendCell = entry.type === "hetvege"
                  const workedHours =
                    entry.type === "munka"
                      ? calculateHours(
                          entry.becsekkolas_ideje,
                          entry.kicsekkolas_ideje,
                          entry.szunet_ms,
                          entry.szunet_perc
                        )
                      : 0

                  return (
                    <div
                      key={entry.id}
                      onClick={() => handleDayClick(entry.datum)}
                      className={`min-h-[116px] border-r border-b border-border p-2 flex flex-col justify-between cursor-pointer transition-colors group ${
                        isSelected
                          ? "bg-primary/10 ring-1 ring-inset ring-primary"
                          : isTodayCell
                          ? "bg-primary/[0.04]"
                          : isWeekendCell
                          ? "bg-muted/25 hover:bg-muted/40"
                          : "bg-card hover:bg-muted/20"
                      }`}
                    >
                      {/* Felső sor: Napszám + Gyors Szabadságkérés gomb hoverre */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-semibold tabular-nums inline-flex items-center justify-center rounded ${
                              isTodayCell
                                ? "bg-primary text-primary-foreground px-1.5 py-0.5"
                                : isWeekendCell
                                ? "text-muted-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {dayNum}.
                          </span>
                          {isTodayCell && (
                            <span className="text-xs font-medium text-primary">
                              Ma
                            </span>
                          )}
                          {entry.isTransferredWorkday && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 font-medium">
                              Ledolgozandó
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openLeaveModalForDate(entry.datum, entry.datum)
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium px-1.5 py-0.5 rounded bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground"
                          title="Szabadság / Távollét igénylése erre a napra"
                        >
                          + Szabadság
                        </button>
                      </div>

                      {/* Középső tartalom: Beosztott műszak, Jelenlét, Szabadság, Ünnepnap */}
                      <div className="space-y-1 my-1.5">
                        {/* 1. Beosztott műszak (ha van a hr_muszak_beosztas táblában) */}
                        {entry.shiftCode && (
                          <div className="px-2 py-1 rounded bg-primary/10 border border-primary/25 text-primary text-xs">
                            <div className="font-semibold flex items-center justify-between gap-1">
                              <span>
                                {entry.isWeekendShift
                                  ? `Hétvégi: ${entry.shiftCode}`
                                  : `Beosztás: ${entry.shiftCode}`}
                              </span>
                              {entry.shiftPlannedHours && (
                                <span className="tabular-nums">
                                  {entry.shiftPlannedHours}ó
                                </span>
                              )}
                            </div>
                            {(entry.shiftStartTime || entry.shiftName) && (
                              <div className="text-xs opacity-85 tabular-nums truncate">
                                {entry.shiftStartTime && entry.shiftEndTime
                                  ? `${entry.shiftStartTime} – ${entry.shiftEndTime}`
                                  : entry.shiftName}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 2. Ünnepnap */}
                        {entry.type === "unnep" && (
                          <div className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/25 text-purple-700 dark:text-purple-300 text-xs font-medium">
                            <div>Ünnepnap</div>
                            {entry.note && (
                              <div className="text-xs opacity-80 truncate">
                                {entry.note}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 3. Jóváhagyott Szabadság / Betegszabadság / Csúsztatás */}
                        {entry.type === "szabadsag" && (
                          <div className="px-2 py-1 rounded bg-sky-500/10 border border-sky-500/25 text-sky-700 dark:text-sky-300 text-xs font-medium">
                            Szabadság
                          </div>
                        )}
                        {entry.type === "betegseg" && (
                          <div className="px-2 py-1 rounded bg-destructive/10 border border-destructive/25 text-destructive text-xs font-medium">
                            Betegszabadság
                          </div>
                        )}
                        {entry.type === "csusztatas" && (
                          <div className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-medium">
                            Csúsztatás
                          </div>
                        )}

                        {/* 4. Jóváhagyásra váró (függő) távollét kérelem */}
                        {entry.pendingLeave && (
                          <div className="px-2 py-1 rounded bg-amber-500/10 border border-dashed border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-medium">
                            Igényelt távollét (Függőben)
                          </div>
                        )}

                        {/* 5. Ténylegesen rögzített munkaidő (ha volt becsekkolás) */}
                        {entry.becsekkolas_ideje && (
                          <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs">
                            <div className="font-semibold tabular-nums flex items-center justify-between">
                              <span>
                                {formatTime(entry.becsekkolas_ideje)} –{" "}
                                {entry.kicsekkolas_ideje
                                  ? formatTime(entry.kicsekkolas_ideje)
                                  : "aktív"}
                              </span>
                              {workedHours > 0 && (
                                <span>{workedHours.toFixed(1)}ó</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 6. Függő jelenlétkorrekció */}
                        {entry.pendingCorrection && (
                          <div className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-medium truncate">
                            Korrekció bírálat alatt
                          </div>
                        )}
                      </div>

                      {/* Alsó sor: Ha sima munkanap és nincs még semmi rajta */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                        {!entry.shiftCode &&
                        !entry.becsekkolas_ideje &&
                        entry.type === "munka" &&
                        !entry.pendingLeave ? (
                          <span>Általános munkanap</span>
                        ) : (
                          <span />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* =============================================================== */
            /* 2. KLASSZIKUS TÁBLÁZATOS JELENLÉTI ÍV NÉZET                     */
            /* =============================================================== */
            <div className="overflow-x-auto">
              <table className="compact-table w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="h-9 px-4 text-left font-medium text-muted-foreground w-28">
                      Dátum
                    </th>
                    <th className="h-9 px-4 text-left font-medium text-muted-foreground">
                      Típus / Beosztás
                    </th>
                    <th className="h-9 px-4 text-center font-medium text-muted-foreground">
                      Becsekkolás
                    </th>
                    <th className="h-9 px-4 text-center font-medium text-muted-foreground">
                      Kicsekkolás
                    </th>
                    <th className="h-9 px-4 text-right font-medium text-muted-foreground">
                      Ledolgozott
                    </th>
                    <th className="h-9 px-3 text-center font-medium text-muted-foreground w-12">
                      Művelet
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {timesheet.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="h-20 text-center text-muted-foreground text-sm"
                      >
                        Nincs elérhető adat erre a hónapra.
                      </td>
                    </tr>
                  ) : (
                    timesheet.map((entry) => {
                      const hours =
                        entry.type === "munka"
                          ? calculateHours(
                              entry.becsekkolas_ideje,
                              entry.kicsekkolas_ideje,
                              entry.szunet_ms,
                              entry.szunet_perc
                            )
                          : 0

                      return (
                        <tr
                          key={entry.id}
                          className={`${
                            entry.isWeekendShift
                              ? "bg-amber-500/[0.04] dark:bg-amber-500/[0.08]"
                              : typeColors[
                                  entry.type as keyof typeof typeColors
                                ] ?? ""
                          }`}
                        >
                          <td className="px-4 py-2.5 font-medium whitespace-nowrap tabular-nums">
                            {entry.datum.substring(8, 10)}.{" "}
                            {
                              ["V", "H", "K", "Sze", "Cs", "P", "Szo"][
                                new Date(entry.datum).getDay()
                              ]
                            }
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {entry.isWeekendShift ? (
                                <span className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/30 px-2 py-0.5 rounded">
                                  Hétvégi műszak ({entry.shiftCode || "Túlóra"})
                                </span>
                              ) : (
                                <>
                                  <span>
                                    {typeLabels[entry.type] ?? entry.type}
                                  </span>
                                  {entry.shiftCode && (
                                    <span className="text-xs bg-primary/10 text-primary border border-primary/20 font-medium px-1.5 py-0.5 rounded">
                                      {entry.shiftCode}
                                      {entry.shiftStartTime &&
                                      entry.shiftEndTime
                                        ? ` (${entry.shiftStartTime}–${entry.shiftEndTime})`
                                        : ""}
                                    </span>
                                  )}
                                </>
                              )}
                              {entry.pendingLeave && (
                                <span className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-medium px-1.5 py-0.5 rounded">
                                  Igényelt távollét (Függőben)
                                </span>
                              )}
                              {entry.pendingCorrection && (
                                <span className="text-xs bg-warning/15 text-warning border border-warning/30 font-medium px-1.5 py-0.5 rounded">
                                  Korrekció bírálat alatt
                                </span>
                              )}
                            </div>
                            {entry.note && (
                              <span className="text-xs block opacity-70">
                                {entry.note}
                              </span>
                            )}
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
                                initialCheckIn={
                                  entry.becsekkolas_ideje || undefined
                                }
                                initialCheckOut={
                                  entry.kicsekkolas_ideje || undefined
                                }
                                onSuccess={loadData}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-6 w-6 ${
                                      entry.pendingCorrection
                                        ? "text-warning hover:text-warning"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                    title={
                                      entry.pendingCorrection
                                        ? "Folyamatban lévő korrekciós kérelem"
                                        : "Időkorrekció kérése"
                                    }
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
