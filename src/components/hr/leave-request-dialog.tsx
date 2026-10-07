"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { CalendarDays, Clock, AlertCircle } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { submitLeaveRequest } from "@/app/hr/self-service/actions"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

const leaveTypeMap: Record<string, string> = {
  szabadsag: "Rendes szabadság",
  csusztatas: "Csúsztatás (Túlóra terhére)",
  beteg: "Betegszabadság (Táppénz)",
  fizetetlen: "Fizetés nélküli szabadság",
  tanulmanyi: "Tanulmányi szabadság"
}

function formatMins(perc: number): string {
  const abs = Math.abs(perc)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  if (h === 0) return `${m} perc`
  if (m === 0) return `${h} óra`
  return `${h} óra ${m} perc`
}

export function LeaveRequestDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [leaveType, setLeaveType] = useState<string>("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [balance, setBalance] = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (open) {
      setBalanceLoading(true)
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase
            .from("hr_tulora_egyenleg")
            .select("perc")
            .eq("dolgozo_id", user.id)
            .maybeSingle()
            .then(({ data }) => {
              setBalance(data?.perc ?? 0)
              setBalanceLoading(false)
            })
        } else {
          setBalanceLoading(false)
        }
      })
    }
  }, [open])

  // Számoljuk a munkanapokat
  const workDays = (() => {
    if (!startDate || !endDate) return 1
    let count = 0
    const cur = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(cur.getTime()) || isNaN(end.getTime()) || cur > end) return 1
    while (cur <= end) {
      const d = cur.getDay()
      if (d !== 0 && d !== 6) count++
      cur.setDate(cur.getDate() + 1)
    }
    return Math.max(1, count)
  })()

  const requiredMinutes = workDays * 480
  const isInsufficientOvertime = leaveType === "csusztatas" && (balance === null || balance < requiredMinutes)

  const handleSubmit = async (formData: FormData) => {
    if (isInsufficientOvertime) {
      toast.error("Nincs elegendő túlóra egyenleged a csúsztatáshoz.")
      return
    }

    setLoading(true)
    const result = await submitLeaveRequest(formData)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(
        leaveType === "csusztatas"
          ? "Csúsztatási kérelem sikeresen elküldve a vezetődnek!"
          : "Távollét igénylés sikeresen elküldve a vezetődnek!"
      )
      setOpen(false)
      formRef.current?.reset()
      setLeaveType("")
      setStartDate("")
      setEndDate("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "default", className: "gap-2" })}>
        <CalendarDays className="w-4 h-4" />
        Új Távollét Kérelem
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Távollét Rögzítése</DialogTitle>
          <DialogDescription>
            Add meg a távollét típusát és az időtartamot. A vezetőd automatikus értesítést kap a jóváhagyáshoz.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right text-xs font-medium">Típus</Label>
              <div className="col-span-3 space-y-2">
                <input type="hidden" name="type" value={leaveType} />
                <Select items={leaveTypeMap} value={leaveType} onValueChange={(val) => val && setLeaveType(val)}>
                  <SelectTrigger>
                    <span>{leaveType ? leaveTypeMap[leaveType] : "Válassz típust..."}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="szabadsag" label="Rendes szabadság">Rendes szabadság</SelectItem>
                    <SelectItem value="csusztatas" label="Csúsztatás (Túlóra terhére)">Csúsztatás (Túlóra terhére)</SelectItem>
                    <SelectItem value="beteg" label="Betegszabadság (Táppénz)">Betegszabadság (Táppénz)</SelectItem>
                    <SelectItem value="fizetetlen" label="Fizetés nélküli szabadság">Fizetés nélküli szabadság</SelectItem>
                    <SelectItem value="tanulmanyi" label="Tanulmányi szabadság">Tanulmányi szabadság</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Csúsztatás tájékoztató panel */}
            {leaveType === "csusztatas" && (
              <div className={`p-3 rounded-lg border text-xs space-y-1.5 transition-colors ${
                !isInsufficientOvertime
                  ? "bg-warning/10 border-warning/30 text-foreground"
                  : "bg-destructive/10 border-destructive/30 text-destructive"
              }`}>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-warning" />
                    Elérhető túlóra egyenleg:
                  </span>
                  <span className="font-semibold tabular-nums">
                    {balanceLoading ? "Betöltés..." : (balance !== null && balance > 0 ? `+${formatMins(balance)}` : `${formatMins(balance ?? 0)}`)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Szükséges levonás ({workDays} munkanap):</span>
                  <span className="tabular-nums font-semibold text-foreground">{formatMins(requiredMinutes)}</span>
                </div>
                {isInsufficientOvertime && !balanceLoading && (
                  <div className="flex items-center gap-1.5 pt-1 text-destructive font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {(balance ?? 0) <= 0
                        ? "Nincs pozitív túlóra egyenleged csúsztatáshoz."
                        : "A kiválasztott időtartam meghaladja a rendelkezésre álló túlórádat."}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right text-xs font-medium">Kezdete</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                className="col-span-3"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (!endDate || endDate < e.target.value) {
                    setEndDate(e.target.value)
                  }
                }}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right text-xs font-medium">Vége</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                className="col-span-3"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="note" className="text-right text-xs font-medium mt-2">Megjegyzés</Label>
              <Textarea
                id="note"
                name="note"
                placeholder="(Opcionális) Megjegyzés a vezetőnek..."
                className="col-span-3 resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Mégse</Button>
            <Button type="submit" disabled={loading || isInsufficientOvertime}>
              {loading ? "Küldés..." : "Kérelem Beküldése"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
