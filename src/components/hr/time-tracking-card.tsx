"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Coffee, Play, CheckCircle2, RotateCcw, Edit3 } from "lucide-react"
import { toggleCheckIn } from "@/app/hr/self-service/actions"
import { AttendanceCorrectionDialog } from "@/components/hr/attendance-correction-dialog"
import { toast } from "sonner"

export function TimeTrackingCard({ 
  initialStatus, 
  checkInTime, 
  checkOutTime 
}: { 
  initialStatus: "none" | "checked_in" | "checked_out",
  checkInTime: string | null,
  checkOutTime: string | null
}) {
  const [status, setStatus] = useState(initialStatus)
  const [loading, setLoading] = useState(false)
  const [elapsedTime, setElapsedTime] = useState("-- : --")
  const [breakElapsedTime, setBreakElapsedTime] = useState("")

  // Break / ebéd state (naphoz kötött localStorage)
  const [onBreak, setOnBreak] = useState(false)
  const [breakStart, setBreakStart] = useState<number | null>(null)
  const [accumulatedBreakMs, setAccumulatedBreakMs] = useState(0)
  
  // Update internal timestamps in case they check in/out without refresh
  const [internalCheckIn, setInternalCheckIn] = useState(checkInTime)
  const [internalCheckOut, setInternalCheckOut] = useState(checkOutTime)

  // LocalStorage szünet adatok betöltése
  useEffect(() => {
    try {
      const todayStr = new Date().toISOString().split("T")[0]
      const saved = localStorage.getItem(`hr_break_${todayStr}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        setOnBreak(Boolean(parsed.onBreak))
        setBreakStart(parsed.breakStart ? Number(parsed.breakStart) : null)
        setAccumulatedBreakMs(Number(parsed.accumulatedBreakMs) || 0)
      }
    } catch {
      // Hiba esetén alapértelmezett állapot
    }
  }, [])

  // Szünet állapot mentése
  const saveBreakState = (isOnBreak: boolean, start: number | null, accum: number) => {
    setOnBreak(isOnBreak)
    setBreakStart(start)
    setAccumulatedBreakMs(accum)
    try {
      const todayStr = new Date().toISOString().split("T")[0]
      localStorage.setItem(`hr_break_${todayStr}`, JSON.stringify({
        onBreak: isOnBreak,
        breakStart: start,
        accumulatedBreakMs: accum
      }))
    } catch {
      // Ignore storage errors
    }
  }

  // Szünet indítása / befejezése
  const handleToggleBreak = () => {
    const now = Date.now()
    if (!onBreak) {
      // Szünet kezdése
      saveBreakState(true, now, accumulatedBreakMs)
      toast.info("Ebédszünet elindítva. A munkaidő számláló szünetel.")
    } else {
      // Szünet befejezése
      const duration = breakStart ? now - breakStart : 0
      const newAccum = accumulatedBreakMs + duration
      saveBreakState(false, null, newAccum)
      toast.success("Szünet lezárva. Munkaidő számlálás folytatódik!")
    }
  }

  // Fő munkaidő számláló effekt
  useEffect(() => {
    let interval: NodeJS.Timeout

    const formatDiff = (ms: number) => {
      const positiveMs = Math.max(0, ms)
      const hours = Math.floor(positiveMs / (1000 * 60 * 60))
      const minutes = Math.floor((positiveMs % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((positiveMs % (1000 * 60)) / 1000)
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }

    const updateTimer = () => {
      if (status === "none") {
        setElapsedTime("-- : --")
        setBreakElapsedTime("")
        return
      }

      const start = internalCheckIn ? new Date(internalCheckIn).getTime() : 0
      if (!start) return

      let end = Date.now()
      if (status === "checked_out" && internalCheckOut) {
        end = new Date(internalCheckOut).getTime()
      }

      // Ha szünet van folyamatban
      if (onBreak && breakStart) {
        const currentBreakDuration = Date.now() - breakStart
        setBreakElapsedTime(formatDiff(currentBreakDuration))
        // Munkaidő rögzítve a szünet kezdetének pillanatára
        const effectiveEnd = breakStart
        const netWorkMs = effectiveEnd - start - accumulatedBreakMs
        setElapsedTime(formatDiff(netWorkMs))
        return
      }

      setBreakElapsedTime("")
      const netWorkMs = end - start - accumulatedBreakMs
      setElapsedTime(formatDiff(netWorkMs))
    }

    updateTimer()
    if (status === "checked_in") {
      interval = setInterval(updateTimer, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [status, internalCheckIn, internalCheckOut, onBreak, breakStart, accumulatedBreakMs])

  const handleToggle = async () => {
    setLoading(true)
    const result = await toggleCheckIn()
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else if (result.status) {
      const newStatus = result.status as "checked_in" | "checked_out"
      setStatus(newStatus)
      if (newStatus === "checked_in") {
        if (!internalCheckIn) {
          setInternalCheckIn(new Date().toISOString())
        }
        setInternalCheckOut(null)
        if (result.resumed) {
          toast.success("Munka sikeresen folytatva!")
        } else {
          toast.success("Sikeres becsekkolás! Jó munkát!")
        }
      } else {
        setInternalCheckOut(new Date().toISOString())
        // Ha szünet közben csekkol ki, zárjuk le a szünetet
        if (onBreak && breakStart) {
          saveBreakState(false, null, accumulatedBreakMs + (Date.now() - breakStart))
        }
        toast.success("Sikeres kicsekkolás! Jó pihenést!")
      }
    }
  }

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">Időadat Rögzítés</CardTitle>
          <div className="text-xs text-muted-foreground">Munkaidő nyilvántartás</div>
        </div>
        <AttendanceCorrectionDialog
          initialDate={new Date().toISOString().split("T")[0]}
          initialCheckIn={internalCheckIn || undefined}
          initialCheckOut={internalCheckOut || undefined}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
              title="Munkaidő korrekciós kérelem benyújtása a vezetőnek"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Korrekció kérése</span>
            </Button>
          }
        />
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {/* Stopper Kijelző */}
        <div className="flex flex-col items-center justify-center py-2 space-y-2">
          <div
            className={`text-4xl font-semibold font-mono tabular-nums tracking-wider ${
              onBreak
                ? "text-amber-500 animate-pulse"
                : status === "checked_out"
                ? "text-muted-foreground"
                : status === "checked_in"
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            {elapsedTime}
          </div>

          {/* Státusz Badge */}
          <div className="flex items-center gap-1.5">
            {status === "none" && (
              <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">
                Nincs rögzített adat
              </Badge>
            )}
            {status === "checked_in" && !onBreak && (
              <Badge variant="outline" className="text-[11px] font-normal border-primary/40 text-primary bg-primary/5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                Munkaidő folyamatban
              </Badge>
            )}
            {status === "checked_in" && onBreak && (
              <Badge variant="outline" className="text-[11px] font-normal border-amber-500/40 text-amber-500 bg-amber-500/10 flex items-center gap-1">
                <Coffee className="w-3 h-3" />
                Ebédszünet ({breakElapsedTime})
              </Badge>
            )}
            {status === "checked_out" && (
              <Badge variant="outline" className="text-[11px] font-normal border-muted-foreground/30 text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                Mai nap befejezve
              </Badge>
            )}
          </div>
        </div>

        {/* Akció Gombok */}
        <div className="space-y-2">
          {status === "none" && (
            <Button
              className="w-full gap-2"
              onClick={handleToggle}
              disabled={loading}
            >
              <Play className="w-4 h-4" />
              {loading ? "Rögzítés..." : "Becsekkolás"}
            </Button>
          )}

          {status === "checked_in" && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={onBreak ? "default" : "outline"}
                size="sm"
                className="gap-1.5 text-xs h-9"
                onClick={handleToggleBreak}
                disabled={loading}
              >
                {onBreak ? (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Folytatás</span>
                  </>
                ) : (
                  <>
                    <Coffee className="w-3.5 h-3.5" />
                    <span>Ebédszünet</span>
                  </>
                )}
              </Button>

              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5 text-xs h-9"
                onClick={handleToggle}
                disabled={loading}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{loading ? "Töltés..." : "Kicsekkolás"}</span>
              </Button>
            </div>
          )}

          {status === "checked_out" && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-9"
                onClick={handleToggle}
                disabled={loading}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{loading ? "Folytatás..." : "Munka folytatása"}</span>
              </Button>

              <AttendanceCorrectionDialog
                initialDate={new Date().toISOString().split("T")[0]}
                initialCheckIn={internalCheckIn || undefined}
                initialCheckOut={internalCheckOut || undefined}
                trigger={
                  <Button variant="secondary" size="sm" className="gap-1.5 text-xs h-9">
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Korrekció kérése</span>
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
