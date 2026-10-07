"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Clock, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { submitAttendanceCorrection } from "@/app/hr/self-service/actions"

interface AttendanceCorrectionDialogProps {
  initialDate?: string
  initialCheckIn?: string
  initialCheckOut?: string
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function AttendanceCorrectionDialog({
  initialDate,
  initialCheckIn,
  initialCheckOut,
  trigger,
  onSuccess,
}: AttendanceCorrectionDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const todayStr = new Date().toISOString().split("T")[0]
  const [date, setDate] = useState(initialDate || todayStr)

  // Ha van ISO string megadva, kinyerjük belőle a HH:MM formátumot
  const formatIsoToTime = (iso?: string) => {
    if (!iso) return ""
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return ""
      const h = String(d.getHours()).padStart(2, "0")
      const m = String(d.getMinutes()).padStart(2, "0")
      return `${h}:${m}`
    } catch {
      return ""
    }
  }

  const [checkIn, setCheckIn] = useState(formatIsoToTime(initialCheckIn) || "08:30")
  const [checkOut, setCheckOut] = useState(formatIsoToTime(initialCheckOut) || "17:00")
  const [reason, setReason] = useState("")

  // Szinkronizáljuk a props-okat megnyitáskor
  useEffect(() => {
    if (open) {
      if (initialDate) setDate(initialDate)
      if (initialCheckIn) setCheckIn(formatIsoToTime(initialCheckIn) || "08:30")
      if (initialCheckOut) setCheckOut(formatIsoToTime(initialCheckOut) || "17:00")
    }
  }, [open, initialDate, initialCheckIn, initialCheckOut])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!date) {
      toast.error("Kérjük válassz dátumot!")
      return
    }
    if (!checkIn || !checkOut) {
      toast.error("Kérjük add meg az érkezési és távozási időpontot!")
      return
    }
    if (!reason.trim()) {
      toast.error("Kérjük add meg a módosítás indoklását!")
      return
    }

    setLoading(true)
    const result = await submitAttendanceCorrection({
      datum: date,
      becsekkolas: checkIn,
      kicsekkolas: checkOut,
      indoklas: reason.trim(),
    })
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Korrekciós kérelem elküldve! A közvetlen vezetőd jóváhagyására vár.")
      setOpen(false)
      setReason("")
      if (onSuccess) onSuccess()
    }
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="inline-flex cursor-pointer">
          {trigger}
        </span>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setOpen(true)}
        >
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Időkorrekció kérése</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> Munkaidő Korrekciós Kérelem
            </DialogTitle>
            <DialogDescription>
              Ha a rögzített munkaidőd eltért a valóstól (pl. elfelejtett be- vagy kicsekkolás), itt nyújthatsz be jóváhagyási kérelmet a közvetlen vezetődnek.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Dátum */}
            <div className="grid gap-1.5">
              <Label htmlFor="corr-date" className="text-xs">
                Módosítandó nap
              </Label>
              <Input
                id="corr-date"
                type="date"
                value={date}
                max={todayStr}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-sm"
                required
              />
            </div>

            {/* Időpontok: Érkezés és Távozás */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="corr-checkin" className="text-xs">
                  Munka kezdete (Becsekkolás)
                </Label>
                <Input
                  id="corr-checkin"
                  type="time"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="h-9 text-sm tabular-nums"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="corr-checkout" className="text-xs">
                  Munka vége (Kicsekkolás)
                </Label>
                <Input
                  id="corr-checkout"
                  type="time"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="h-9 text-sm tabular-nums"
                  required
                />
              </div>
            </div>

            {/* Indoklás */}
            <div className="grid gap-1.5">
              <Label htmlFor="corr-reason" className="text-xs">
                Módosítás indoklása <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="corr-reason"
                placeholder="Pl. Külső ügyféltalálkozó / Késői érkezés / Mulasztott rögzítés pótlása / Rendkívüli munkavégzés..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="text-xs resize-none"
                required
              />
            </div>

            <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/50 border text-[11px] text-muted-foreground">
              <AlertCircle className="w-4 h-4 text-info shrink-0 mt-0.5" />
              <span>
                A beküldött kérelem jóváhagyásra megérkezik a közvetlen vezetőd felületére, és az elbírálás után lép érvénybe.
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Mégse
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Beküldés..." : "Kérelem benyújtása"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
