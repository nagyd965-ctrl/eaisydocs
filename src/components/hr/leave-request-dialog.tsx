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
import { calculateAnnualLeave, calculateWorkingDays } from "@/utils/hr/leave-calculator"
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
  const [leaveType, setLeaveType] = useState<string>("szabadsag")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [balance, setBalance] = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [holidays, setHolidays] = useState<string[]>([])
  const [transferredWorkdays, setTransferredWorkdays] = useState<string[]>([])
  const [remainingAnnualLeave, setRemainingAnnualLeave] = useState<number | null>(null)
  const [totalAnnualLeave, setTotalAnnualLeave] = useState<number | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (open) {
      setBalanceLoading(true)
      const supabase = createClient()
      const currentYear = new Date().getFullYear()
      const yearStart = `${currentYear}-01-01`
      const yearEnd = `${currentYear}-12-31`

      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) {
          setBalanceLoading(false)
          return
        }

        const [tuloraRes, holidaysRes, adatlapRes, leavesRes] = await Promise.all([
          supabase
            .from("hr_tulora_egyenleg")
            .select("perc")
            .eq("dolgozo_id", user.id)
            .maybeSingle(),
          supabase
            .from("hr_munkaszuneti_nap")
            .select("datum, athelye_munkanap")
            .gte("datum", `${currentYear - 1}-01-01`)
            .lte("datum", `${currentYear + 1}-12-31`),
          supabase
            .from("hr_dolgozo_adatlap")
            .select("szuletesi_datum, szuletesi_ido, gyermekek_szama, megvaltozott_munkakepessegu")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("hr_tavollet")
            .select("kezdet_datuma, veg_datuma, tipus, statusz")
            .eq("dolgozo_id", user.id)
            .in("statusz", ["jovahagyva", "jovahagyasra_var"])
            .lte("kezdet_datuma", yearEnd)
            .gte("veg_datuma", yearStart),
        ])

        setBalance(tuloraRes.data?.perc ?? 0)

        const hols = (holidaysRes.data || [])
          .filter((h: any) => !h.athelye_munkanap)
          .map((h: any) => h.datum as string)
        const trans = (holidaysRes.data || [])
          .filter((h: any) => Boolean(h.athelye_munkanap))
          .map((h: any) => h.datum as string)

        setHolidays(hols)
        setTransferredWorkdays(trans)

        const adatlap = adatlapRes.data as any
        const totalQuota = calculateAnnualLeave(
          adatlap?.szuletesi_datum || adatlap?.szuletesi_ido,
          adatlap?.gyermekek_szama ?? 0,
          Boolean(adatlap?.megvaltozott_munkakepessegu),
          currentYear
        )
        const usedOrPending = (leavesRes.data || [])
          .filter((t: any) => ["szabadsag", "alapszabadsag", "fizetett"].includes((t.tipus || "").toLowerCase()))
          .reduce((sum: number, t: any) => {
            const s = t.kezdet_datuma > yearStart ? t.kezdet_datuma : yearStart
            const e = t.veg_datuma < yearEnd ? t.veg_datuma : yearEnd
            return sum + calculateWorkingDays(s, e, hols, trans)
          }, 0)

        setTotalAnnualLeave(totalQuota)
        setRemainingAnnualLeave(Math.max(0, totalQuota - usedOrPending))
        setBalanceLoading(false)
      })
    }
  }, [open])

  // Számoljuk a munkanapokat ünnepnapok és áthelyezett munkanapok figyelembevételével
  const workDays = (() => {
    if (!startDate || !endDate) return 0
    return calculateWorkingDays(startDate, endDate, holidays, transferredWorkdays)
  })()

  const effectiveWorkDays = startDate && endDate ? workDays : 1
  const requiredMinutes = effectiveWorkDays * 480
  const isInsufficientOvertime = leaveType === "csusztatas" && (balance === null || balance < requiredMinutes)
  const isInsufficientLeaveQuota =
    leaveType === "szabadsag" &&
    startDate !== "" &&
    endDate !== "" &&
    remainingAnnualLeave !== null &&
    workDays > remainingAnnualLeave
  const isZeroWorkdays = startDate !== "" && endDate !== "" && workDays <= 0

  const handleSubmit = async (formData: FormData) => {
    if (isZeroWorkdays) {
      toast.error("A kiválasztott időszakban nincs egyetlen munkanap sem (hétvége vagy munkaszüneti nap).")
      return
    }
    if (isInsufficientLeaveQuota) {
      toast.error("Az igényelt napok száma meghaladja a rendelkezésre álló éves szabadságkeretedet.")
      return
    }
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
      setLeaveType("szabadsag")
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

            {/* Rendes szabadság keret tájékoztató panel */}
            {leaveType === "szabadsag" && (
              <div className={`p-3 rounded-lg border text-xs space-y-1.5 transition-colors ${
                !isInsufficientLeaveQuota && !isZeroWorkdays
                  ? "bg-muted/40 border-border text-foreground"
                  : "bg-destructive/10 border-destructive/30 text-destructive"
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Elérhető éves szabadságkeret:</span>
                  <span className="font-semibold tabular-nums">
                    {balanceLoading
                      ? "Betöltés..."
                      : `${remainingAnnualLeave ?? 0} / ${totalAnnualLeave ?? 0} munkanap`}
                  </span>
                </div>
                {startDate && endDate && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Igényelt munkanapok (ünnepnapok nélkül):</span>
                    <span className="tabular-nums font-semibold text-foreground">{workDays} munkanap</span>
                  </div>
                )}
                {isZeroWorkdays && (
                  <div className="flex items-center gap-1.5 pt-1 text-destructive font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>A kijelölt időszakban nincs munkanap (hétvége vagy ünnepnap).</span>
                  </div>
                )}
                {isInsufficientLeaveQuota && !balanceLoading && (
                  <div className="flex items-center gap-1.5 pt-1 text-destructive font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Az igényelt napok száma meghaladja a maradék szabadságkeretedet.</span>
                  </div>
                )}
              </div>
            )}

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
                  <span>Szükséges levonás ({effectiveWorkDays} munkanap):</span>
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
            <Button type="submit" disabled={loading || isInsufficientOvertime || isInsufficientLeaveQuota || isZeroWorkdays}>
              {loading ? "Küldés..." : "Kérelem Beküldése"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
