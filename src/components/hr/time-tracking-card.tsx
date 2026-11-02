"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { toggleCheckIn, toggleBreak } from "@/app/hr/self-service/actions"
import { toast } from "sonner"

export type WeeklyDaySummary = {
  dayLabel: string
  dateStr: string
  isToday: boolean
  netMinutes: number | null
}

export function TimeTrackingCard({
  initialStatus,
  checkInTime,
  checkOutTime,
  initialAccumulatedBreakMs = 0,
  initialBreakStart = null,
  dailyTargetMinutes = 480,
  weeklyRecords = [],
  unclosedPreviousRecord = null,
}: {
  initialStatus: "none" | "checked_in" | "checked_out"
  checkInTime: string | null
  checkOutTime: string | null
  initialAccumulatedBreakMs?: number
  initialBreakStart?: string | null
  dailyTargetMinutes?: number
  weeklyRecords?: WeeklyDaySummary[]
  unclosedPreviousRecord?: { datum: string; becsekkolas_ideje: string } | null
}) {
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState(false)
  const [netWorkMs, setNetWorkMs] = useState(0)
  const [activeBreakMs, setActiveBreakMs] = useState(0)

  useEffect(() => {
    setStatus(initialStatus)
  }, [initialStatus])

  const [onBreak, setOnBreak] = useState(Boolean(initialBreakStart))
  const [breakStart, setBreakStart] = useState<number | null>(
    initialBreakStart ? new Date(initialBreakStart).getTime() : null
  )
  const [accumulatedBreakMs, setAccumulatedBreakMs] = useState(
    Number(initialAccumulatedBreakMs || 0)
  )

  const [internalCheckIn, setInternalCheckIn] = useState(checkInTime)
  const [internalCheckOut, setInternalCheckOut] = useState(checkOutTime)

  useEffect(() => {
    setInternalCheckIn(checkInTime)
    setInternalCheckOut(checkOutTime)
  }, [checkInTime, checkOutTime])

  // LocalStorage szünet adatok összevetése az adatbázissal
  useEffect(() => {
    try {
      const todayStr = new Date().toISOString().split("T")[0]
      const dbAccum = Number(initialAccumulatedBreakMs || 0)
      const dbStart = initialBreakStart
        ? new Date(initialBreakStart).getTime()
        : null

      const saved = localStorage.getItem(`hr_break_${todayStr}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        const localAccum = Number(parsed.accumulatedBreakMs) || 0
        const mergedAccum = Math.max(dbAccum, localAccum)
        const isCurrentlyOnBreak =
          dbStart !== null
            ? true
            : Boolean(parsed.onBreak) && status === "checked_in"
        const effectiveStart =
          dbStart ??
          (isCurrentlyOnBreak && parsed.breakStart
            ? Number(parsed.breakStart)
            : null)

        setOnBreak(Boolean(effectiveStart))
        setBreakStart(effectiveStart)
        setAccumulatedBreakMs(mergedAccum)
      } else {
        setOnBreak(Boolean(dbStart))
        setBreakStart(dbStart)
        setAccumulatedBreakMs(dbAccum)
      }
    } catch {
      // Hiba esetén alapértelmezett adatbázis állapot
    }
  }, [initialAccumulatedBreakMs, initialBreakStart, status])

  const saveBreakState = (
    isOnBreak: boolean,
    start: number | null,
    accum: number
  ) => {
    setOnBreak(isOnBreak)
    setBreakStart(start)
    setAccumulatedBreakMs(accum)
    try {
      const todayStr = new Date().toISOString().split("T")[0]
      localStorage.setItem(
        `hr_break_${todayStr}`,
        JSON.stringify({
          onBreak: isOnBreak,
          breakStart: start,
          accumulatedBreakMs: accum,
        })
      )
    } catch {
      // Ignore storage errors
    }
  }

  const handleToggleBreak = async () => {
    const now = Date.now()
    if (!onBreak) {
      saveBreakState(true, now, accumulatedBreakMs)
      const res = await toggleBreak()
      if (res.error) {
        toast.error(res.error)
      } else {
        const serverStart = res.breakStart
          ? new Date(res.breakStart).getTime()
          : now
        saveBreakState(
          true,
          serverStart,
          res.accumulatedBreakMs ?? accumulatedBreakMs
        )
        toast.info("Ebédszünet elindítva. A munkaidő számláló szünetel.")
      }
    } else {
      const duration = breakStart ? Math.max(0, now - breakStart) : 0
      const optimisticAccum = accumulatedBreakMs + duration
      saveBreakState(false, null, optimisticAccum)
      const res = await toggleBreak()
      if (res.error) {
        toast.error(res.error)
      } else {
        saveBreakState(
          false,
          null,
          res.accumulatedBreakMs ?? optimisticAccum
        )
        toast.success("Szünet lezárva. Munkaidő számlálás folytatódik!")
      }
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout

    const updateTimer = () => {
      if (status === "none" || !internalCheckIn) {
        setNetWorkMs(0)
        setActiveBreakMs(0)
        return
      }

      const start = new Date(internalCheckIn).getTime()
      if (!start) return

      let end = Date.now()
      if (status === "checked_out" && internalCheckOut) {
        end = new Date(internalCheckOut).getTime()
      }

      if (onBreak && breakStart) {
        const currentBreak = Math.max(0, Date.now() - breakStart)
        setActiveBreakMs(currentBreak)
        const effectiveNet = Math.max(0, breakStart - start - accumulatedBreakMs)
        setNetWorkMs(effectiveNet)
        return
      }

      setActiveBreakMs(0)
      const effectiveNet = Math.max(0, end - start - accumulatedBreakMs)
      setNetWorkMs(effectiveNet)
    }

    updateTimer()
    if (status === "checked_in") {
      interval = setInterval(updateTimer, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [
    status,
    internalCheckIn,
    internalCheckOut,
    onBreak,
    breakStart,
    accumulatedBreakMs,
  ])

  const handleToggle = async () => {
    setLoading(true)
    const result = await toggleCheckIn(accumulatedBreakMs)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else if (result.status) {
      const newStatus = result.status as "checked_in" | "checked_out"
      setStatus(newStatus)
      if (newStatus === "checked_in") {
        if (!internalCheckIn) {
          setInternalCheckIn(
            (result as any).checkInTime || new Date().toISOString()
          )
        }
        setInternalCheckOut(null)
        if (typeof (result as any).accumulatedBreakMs === "number") {
          saveBreakState(false, null, (result as any).accumulatedBreakMs)
        }
        if ((result as any).resumed) {
          toast.success("Munka sikeresen folytatva!")
        } else {
          toast.success("Sikeres becsekkolás! Jó munkát!")
        }
      } else {
        setInternalCheckOut(
          (result as any).checkOutTime || new Date().toISOString()
        )
        const nextAccum =
          typeof (result as any).accumulatedBreakMs === "number"
            ? (result as any).accumulatedBreakMs
            : onBreak && breakStart
            ? accumulatedBreakMs + (Date.now() - breakStart)
            : accumulatedBreakMs
        saveBreakState(false, null, nextAccum)
        toast.success("Sikeres kicsekkolás! Jó pihenést!")
      }
    }
  }

  // Formatters
  const formatHms = (ms: number) => {
    const positiveMs = Math.max(0, ms)
    const hours = Math.floor(positiveMs / (1000 * 60 * 60))
    const minutes = Math.floor((positiveMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((positiveMs % (1000 * 60)) / 1000)
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const formatShortHm = (mins: number) => {
    const abs = Math.max(0, Math.round(mins))
    const h = Math.floor(abs / 60)
    const m = abs % 60
    return `${h}:${m.toString().padStart(2, "0")}`
  }

  const formatVerboseHm = (ms: number, signPrefix = "") => {
    const totalMins = Math.round(Math.abs(ms) / 60000)
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    return `${signPrefix}${h.toString().padStart(2, "0")} ó ${m
      .toString()
      .padStart(2, "0")} p`
  }

  const formatTimeBudapest = (iso: string | null | undefined, withSeconds = false) => {
    if (!iso) return "-- : --"
    try {
      return new Intl.DateTimeFormat("hu-HU", {
        timeZone: "Europe/Budapest",
        hour: "2-digit",
        minute: "2-digit",
        ...(withSeconds ? { second: "2-digit" } : {}),
        hour12: false,
      }).format(new Date(iso))
    } catch {
      return "-- : --"
    }
  }

  const targetMs = Math.max(60, dailyTargetMinutes) * 60 * 1000
  const totalBreakMs = accumulatedBreakMs + activeBreakMs
  const totalBreakMins = Math.round(totalBreakMs / 60000)
  const remainingMs = Math.max(0, targetMs - netWorkMs)
  const overtimeMs = Math.max(0, netWorkMs - targetMs)
  const isOvertime = netWorkMs > targetMs && status !== "none"

  const rawPercent = targetMs > 0 ? Math.round((netWorkMs / targetMs) * 100) : 0
  const baseFillPercent = Math.min(100, rawPercent)
  const overtimeFillPercent = isOvertime
    ? Math.min(20, Math.round((overtimeMs / targetMs) * 100))
    : 0

  // Várható vagy tényleges munkabefejezés
  const targetOutDisplay = (() => {
    if (status === "checked_out" && internalCheckOut) {
      return {
        time: formatTimeBudapest(internalCheckOut),
        sub: "Tényleges kicsekkolás",
      }
    }
    if (internalCheckIn) {
      const startMs = new Date(internalCheckIn).getTime()
      const expectedEndIso = new Date(
        startMs + targetMs + totalBreakMs
      ).toISOString()
      return {
        time: formatTimeBudapest(expectedEndIso),
        sub:
          totalBreakMins > 0
            ? `+${totalBreakMins}p szünet beszámítva`
            : "Alap műszakrend szerint",
      }
    }
    const defaultEndHour = 8 + Math.floor(dailyTargetMinutes / 60)
    const defaultEndMin = 30 + (dailyTargetMinutes % 60)
    const adjH = defaultEndHour + Math.floor(defaultEndMin / 60)
    const adjM = defaultEndMin % 60
    return {
      time: `~${adjH.toString().padStart(2, "0")}:${adjM
        .toString()
        .padStart(2, "0")}`,
      sub: "08:30 kezdés esetén",
    }
  })()

  // Heti 5 napos összesítés (a mai napot élőben frissítve)
  const todayLiveMins = Math.round(netWorkMs / 60000)
  const effectiveWeekly = weeklyRecords.map((d) =>
    d.isToday
      ? {
          ...d,
          netMinutes:
            status === "none" && !internalCheckIn ? d.netMinutes : todayLiveMins,
        }
      : d
  )
  const weeklyTotalMins = effectiveWeekly.reduce(
    (sum, d) => sum + (d.netMinutes || 0),
    0
  )
  const weeklyTargetHours = Math.round((dailyTargetMinutes * 5) / 60)
  const weeklyWorkedHours = (weeklyTotalMins / 60).toFixed(1)

  return (
    <div className="bg-card border border-border rounded-lg flex flex-col justify-between overflow-hidden h-full">
      {/* Top Status Bar inside Terminal */}
      <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2 h-2 rounded-full ${
              onBreak
                ? "bg-amber-500 animate-ping"
                : status === "checked_in"
                ? "bg-primary animate-ping"
                : status === "checked_out"
                ? "bg-emerald-500"
                : "bg-muted-foreground/50"
            }`}
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Munkaidő Terminál
          </span>
          {status === "none" && (
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
              Munkakezdésre vár
            </span>
          )}
          {status === "checked_in" && !onBreak && !isOvertime && (
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/25">
              Munkavégzés folyamatban
            </span>
          )}
          {status === "checked_in" && !onBreak && isOvertime && (
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              Napi norma teljesítve · Túlóra sávban
            </span>
          )}
          {status === "checked_in" && onBreak && (
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              Ebédszünet folyamatban ({formatHms(activeBreakMs)})
            </span>
          )}
          {status === "checked_out" && (
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-foreground border border-border">
              Mai munkanap lezárva
            </span>
          )}
        </div>
      </div>

      {/* Main Terminal Body */}
      <div className="p-5 space-y-5 flex-1 flex flex-col justify-between">
        {/* Clock Display + 4 Shift Telemetry Mini-Cells */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          {/* Left: Big Precision Timer */}
          <div className="md:col-span-6 bg-muted/30 border border-border rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Mai nettó munkaidő
              </span>
              <span
                className={`text-xs font-medium tabular-nums ${
                  onBreak
                    ? "text-amber-600 dark:text-amber-400"
                    : status === "checked_in"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {onBreak
                  ? "Szünetel"
                  : status === "checked_in"
                  ? "Élő mérés"
                  : status === "checked_out"
                  ? "Lezárt munkanap"
                  : "Nem indított"}
              </span>
            </div>

            <div
              className={`font-mono text-4xl font-semibold tabular-nums tracking-tight my-2 ${
                onBreak
                  ? "text-amber-600 dark:text-amber-400"
                  : isOvertime
                  ? "text-emerald-600 dark:text-emerald-400"
                  : status === "none"
                  ? "text-muted-foreground/60"
                  : "text-foreground"
              }`}
            >
              {formatHms(netWorkMs)}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2 mt-1 tabular-nums">
              <span>
                Napi előírás:{" "}
                <strong className="text-foreground">
                  {formatHms(targetMs)}
                </strong>
              </span>
              {status === "checked_out" && internalCheckOut ? (
                <span>
                  Kicsekkolás:{" "}
                  <strong className="text-foreground">
                    {formatTimeBudapest(internalCheckOut)}
                  </strong>
                </span>
              ) : isOvertime ? (
                <span>
                  Többlet:{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    +{formatHms(overtimeMs)}
                  </strong>
                </span>
              ) : (
                <span>
                  Hátra van:{" "}
                  <strong className="text-foreground">
                    {formatHms(remainingMs)}
                  </strong>
                </span>
              )}
            </div>
          </div>

          {/* Right: 4 Shift Telemetry Mini-Cells */}
          <div className="md:col-span-6 grid grid-cols-2 gap-2.5">
            <div className="border border-border rounded-lg p-3 bg-card flex flex-col justify-between">
              <div className="text-xs text-muted-foreground font-medium">
                Munkakezdés (Be)
              </div>
              <div className="text-base font-semibold tabular-nums text-foreground mt-0.5">
                {formatTimeBudapest(internalCheckIn)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {internalCheckIn ? "Rögzítve ma" : "Nincs mai becsekkolás"}
              </div>
            </div>

            <div className="border border-border rounded-lg p-3 bg-card flex flex-col justify-between">
              <div className="text-xs text-muted-foreground font-medium">
                {status === "checked_out"
                  ? "Munkabefejezés (Ki)"
                  : "Tervezett befejezés"}
              </div>
              <div className="text-base font-semibold tabular-nums text-foreground mt-0.5">
                {targetOutDisplay.time}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {targetOutDisplay.sub}
              </div>
            </div>

            <div className="border border-border rounded-lg p-3 bg-card flex flex-col justify-between">
              <div className="text-xs text-muted-foreground font-medium">
                Mai szünetidő
              </div>
              <div className="text-base font-semibold tabular-nums text-foreground mt-0.5">
                {totalBreakMins} perc
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {onBreak
                  ? "Jelenleg is szüneten"
                  : totalBreakMins > 0
                  ? "Rögzített szünet"
                  : "Ajánlott: 30 perc"}
              </div>
            </div>

            <div className="border border-border rounded-lg p-3 bg-card flex flex-col justify-between">
              <div className="text-xs text-muted-foreground font-medium">
                Napi egyenleg
              </div>
              <div
                className={`text-base font-semibold tabular-nums mt-0.5 ${
                  isOvertime
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-foreground"
                }`}
              >
                {status === "none"
                  ? "00 ó 00 p"
                  : onBreak
                  ? "Szünetel"
                  : isOvertime
                  ? formatVerboseHm(overtimeMs, "+")
                  : formatVerboseHm(remainingMs, "-")}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {status === "none"
                  ? "Még nem indult el"
                  : onBreak
                  ? "Munkaidő megállítva"
                  : isOvertime
                  ? "Mai pozitív többlet"
                  : "Napi norma eléréséig"}
              </div>
            </div>
          </div>
        </div>

        {/* Shift Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">
              Műszak előrehaladás
            </span>
            <span className="font-semibold tabular-nums text-primary">
              {rawPercent}% ({formatVerboseHm(netWorkMs)} /{" "}
              {formatVerboseHm(targetMs)})
            </span>
          </div>
          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden border border-border flex">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${baseFillPercent}%` }}
            />
            {overtimeFillPercent > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${overtimeFillPercent}%` }}
              />
            )}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>0 óra</span>
            <span>{Math.round(dailyTargetMinutes / 120)} óra (Félidő)</span>
            <span>{Math.round(dailyTargetMinutes / 60)} óra (Napi norma)</span>
          </div>
        </div>

        {/* Primary Action Controls */}
        <div className="pt-1">
          {status === "none" && (
            <Button
              className="w-full h-11 font-semibold text-sm"
              onClick={handleToggle}
              disabled={loading}
            >
              {loading
                ? "Rögzítés folyamatban..."
                : "Munkakezdés rögzítése (Becsekkolás)"}
            </Button>
          )}

          {status === "checked_in" && !onBreak && (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <Button
                variant="outline"
                className="sm:col-span-6 h-10 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold text-xs"
                onClick={handleToggleBreak}
                disabled={loading}
              >
                Ebédszünet / Szünet indítása
              </Button>
              <Button
                variant="destructive"
                className="sm:col-span-6 h-10 font-semibold text-xs"
                onClick={handleToggle}
                disabled={loading}
              >
                {loading
                  ? "Lezárás..."
                  : "Munkanap befejezése (Kicsekkolás)"}
              </Button>
            </div>
          )}

          {status === "checked_in" && onBreak && (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <Button
                variant="default"
                className="sm:col-span-8 h-10 font-semibold text-xs"
                onClick={handleToggleBreak}
                disabled={loading}
              >
                Szünet befejezése és Munka folytatása
              </Button>
              <Button
                variant="destructive"
                className="sm:col-span-4 h-10 font-semibold text-xs"
                onClick={handleToggle}
                disabled={loading}
              >
                {loading ? "Töltés..." : "Kicsekkolás most"}
              </Button>
            </div>
          )}

          {status === "checked_out" && (
            <Button
              variant="outline"
              className="w-full h-10 font-semibold text-xs hover:border-primary/40 transition-colors"
              onClick={handleToggle}
              disabled={loading}
            >
              {loading
                ? "Újranyitás..."
                : "Munka újranyitása / Folytatás ma"}
            </Button>
          )}
        </div>

        {/* Today's Audit Timeline + Weekly 5-Day Mini Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border">
          {/* Today's Punch Log */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Mai időbélyegzések (Napló)
            </div>
            {!internalCheckIn ? (
              <div className="text-xs text-muted-foreground py-2">
                A mai napon még nem történt munkaidő-bélyegzés.
              </div>
            ) : (
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/60">
                  <span className="font-medium text-foreground">
                    Becsekkolás
                  </span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {formatTimeBudapest(internalCheckIn, true)}
                  </span>
                </div>
                {totalBreakMins > 0 && (
                  <div className="flex items-center justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">
                      Rögzített szünetidő
                    </span>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {totalBreakMins} perc
                    </span>
                  </div>
                )}
                {onBreak && breakStart && (
                  <div className="flex items-center justify-between py-1">
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      Aktív ebédszünet
                    </span>
                    <span className="font-mono tabular-nums text-amber-600 dark:text-amber-400">
                      {formatTimeBudapest(new Date(breakStart).toISOString())} – jelenleg
                    </span>
                  </div>
                )}
                {status === "checked_in" && !onBreak && (
                  <div className="flex items-center justify-between py-1">
                    <span className="font-medium text-primary">
                      Aktív munkavégzés
                    </span>
                    <span className="font-mono tabular-nums text-primary">
                      folyamatban
                    </span>
                  </div>
                )}
                {status === "checked_out" && internalCheckOut && (
                  <div className="flex items-center justify-between py-1">
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      Kicsekkolás (Lezárva)
                    </span>
                    <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatTimeBudapest(internalCheckOut, true)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* This Week's 5-day Mini Summary */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Heti munkaidő (H–P)
              </span>
              <span className="text-xs font-semibold tabular-nums text-foreground">
                {weeklyWorkedHours} / {weeklyTargetHours}.0 óra
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {effectiveWeekly.map((day) => {
                const hasWorked =
                  typeof day.netMinutes === "number" && day.netMinutes > 0
                return (
                  <div
                    key={day.dateStr}
                    className={`border rounded p-1.5 ${
                      day.isToday
                        ? "border-primary/50 bg-primary/5"
                        : hasWorked
                        ? "border-border bg-muted/30"
                        : "border-border bg-card"
                    }`}
                  >
                    <div
                      className={`text-xs font-medium ${
                        day.isToday
                          ? "text-primary font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {day.dayLabel}
                    </div>
                    <div
                      className={`text-xs font-semibold tabular-nums mt-0.5 ${
                        day.isToday
                          ? "text-primary"
                          : hasWorked
                          ? "text-foreground"
                          : "text-muted-foreground/50"
                      }`}
                    >
                      {hasWorked ? formatShortHm(day.netMinutes!) : "--:--"}
                    </div>
                    <div
                      className={`h-1 rounded mt-1 ${
                        day.isToday
                          ? "bg-primary"
                          : hasWorked
                          ? "bg-primary/70"
                          : "bg-muted"
                      }`}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
