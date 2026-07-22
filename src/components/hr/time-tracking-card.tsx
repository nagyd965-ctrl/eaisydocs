"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock } from "lucide-react"
import { toggleCheckIn } from "@/app/hr/self-service/actions"
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
  
  // Update internal timestamps in case they check in/out without refresh
  const [internalCheckIn, setInternalCheckIn] = useState(checkInTime)
  const [internalCheckOut, setInternalCheckOut] = useState(checkOutTime)

  useEffect(() => {
    let interval: NodeJS.Timeout

    const updateTimer = () => {
      if (status === "none") {
        setElapsedTime("-- : --")
        return
      }

      const start = internalCheckIn ? new Date(internalCheckIn).getTime() : 0
      if (!start) return

      let end = new Date().getTime()
      if (status === "checked_out" && internalCheckOut) {
        end = new Date(internalCheckOut).getTime()
      }

      const diff = end - start
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }

    updateTimer()
    if (status === "checked_in") {
      interval = setInterval(updateTimer, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [status, internalCheckIn, internalCheckOut])

  const handleToggle = async () => {
    setLoading(true)
    const result = await toggleCheckIn()
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else if (result.status) {
      setStatus(result.status as any)
      if (result.status === "checked_in") {
        setInternalCheckIn(new Date().toISOString())
        toast.success("Sikeres becsekkolás!")
      } else {
        setInternalCheckOut(new Date().toISOString())
        toast.success("Sikeres kicsekkolás! Jó pihenést!")
      }
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">Időadat Rögzítés</CardTitle>
          <div className="text-sm text-muted-foreground">Mai státusz</div>
        </div>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Clock className="w-4 h-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mt-4 flex flex-col items-center justify-center py-4 space-y-4">
          <div className={`text-4xl font-bold font-mono tracking-wider ${status === "checked_out" ? "text-muted-foreground" : "text-primary"}`}>
            {elapsedTime}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-2">
            {status === "none" && "Nincs rögzített adat"}
            {status === "checked_in" && "Folyamatban..."}
            {status === "checked_out" && "Befejezve"}
          </div>
          <Button 
            className="w-full gap-2" 
            onClick={handleToggle}
            disabled={loading || status === "checked_out"}
            variant={status === "checked_in" ? "destructive" : "default"}
          >
            <Clock className="w-4 h-4" />
            {loading ? "Töltés..." : status === "checked_in" ? "Kicsekkolás" : status === "checked_out" ? "Mai nap lezárva" : "Becsekkolás"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
