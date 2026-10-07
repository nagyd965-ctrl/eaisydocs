"use client"

import { useEffect, useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Clock, TrendingUp, TrendingDown, Minus, Coins, Calendar, AlertCircle } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { submitOvertimeRequest } from "@/app/hr/self-service/actions"
import { toast } from "sonner"

interface OvertimeRequest {
  id: string
  tipus: "kiveszi_szabinak" | "kifizetteti"
  perc: number
  statusz: string
  datum?: string | null
  megjegyzes?: string | null
  created_at: string
}

function formatMinutes(perc: number): string {
  const absPerc = Math.abs(perc)
  const h = Math.floor(absPerc / 60)
  const m = absPerc % 60
  if (h === 0) return `${m} perc`
  if (m === 0) return `${h} óra`
  return `${h} ó ${m} p`
}

interface OvertimeActionDialogProps {
  employeeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onBalanceUpdated?: () => void
}

export function OvertimeActionDialog({
  employeeId,
  open,
  onOpenChange,
  onBalanceUpdated,
}: OvertimeActionDialogProps) {
  const [balance, setBalance] = useState<number | null>(null)
  const [requests, setRequests] = useState<OvertimeRequest[]>([])
  const [activeTab, setActiveTab] = useState<"overview" | "comp" | "payout">("overview")
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  // Csúsztatás űrlap
  const [compDate, setCompDate] = useState("")
  const [compMode, setCompMode] = useState<"full" | "half" | "custom">("full")
  const [compCustomHours, setCompCustomHours] = useState(1)
  const [compNote, setCompNote] = useState("")

  // Kifizetés űrlap
  const [payoutHours, setPayoutHours] = useState(0)
  const [payoutNote, setPayoutNote] = useState("")

  const loadData = async () => {
    setLoading(true)
    const [{ data: balanceData }, { data: reqData }] = await Promise.all([
      supabase
        .from("hr_tulora_egyenleg")
        .select("perc")
        .eq("dolgozo_id", employeeId)
        .maybeSingle(),
      supabase
        .from("hr_tulora_felhasznalás")
        .select("*")
        .eq("dolgozo_id", employeeId)
        .order("created_at", { ascending: false })
        .limit(5)
    ])
    setBalance(balanceData?.perc ?? 0)
    setRequests(reqData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (open) {
      loadData()
      setActiveTab("overview")
    }
  }, [open, employeeId])

  // Csúsztatási percek
  const compMinutes = compMode === "full" ? 480 : compMode === "half" ? 240 : Math.round(compCustomHours * 60)
  const compRemaining = (balance ?? 0) - compMinutes
  const isCompDisabled = (balance ?? 0) < compMinutes || !compDate || compMinutes <= 0

  // Kifizetési percek
  const payoutMinutes = Math.round(payoutHours * 60)
  const payoutRemaining = (balance ?? 0) - payoutMinutes
  const isPayoutDisabled = (balance ?? 0) < payoutMinutes || payoutMinutes <= 0

  const handleCompSubmit = () => {
    if (isCompDisabled) return

    startTransition(async () => {
      const res = await submitOvertimeRequest({
        tipus: "kiveszi_szabinak",
        perc: compMinutes,
        datum: compDate,
        megjegyzes: compNote || "Csúsztatás (Túlóra terhére)"
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Csúsztatási kérelem sikeresen elküldve a vezetődnek!")
        setActiveTab("overview")
        setCompDate("")
        setCompNote("")
        setCompMode("full")
        loadData()
        onBalanceUpdated?.()
      }
    })
  }

  const handlePayoutSubmit = () => {
    if (isPayoutDisabled) return

    startTransition(async () => {
      const res = await submitOvertimeRequest({
        tipus: "kifizetteti",
        perc: payoutMinutes,
        megjegyzes: payoutNote || "Túlóra kifizetési igény"
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Kifizetési igény sikeresen elküldve a vezetődnek!")
        setActiveTab("overview")
        setPayoutHours(0)
        setPayoutNote("")
        loadData()
        onBalanceUpdated?.()
      }
    })
  }

  const balanceSign = balance !== null && balance > 0 ? "+" : ""
  const isPositive = (balance ?? 0) > 0
  const isNegative = (balance ?? 0) < 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Túlóra Egyenleg és Igénylés
          </DialogTitle>
          <DialogDescription>
            Kezeld a felhalmozott pluszóráidat csúsztatás (szabadnap) vagy kifizetés formájában.
          </DialogDescription>
        </DialogHeader>

        {/* Egyenleg kártya */}
        <div className={`p-4 rounded-lg border flex items-center justify-between ${
          isPositive ? "bg-success/10 border-success/30"
          : isNegative ? "bg-destructive/10 border-destructive/30"
          : "bg-muted/30 border-border"
        }`}>
          <div className="flex items-center gap-3">
            {isPositive ? <TrendingUp className="w-5 h-5 text-success shrink-0" />
              : isNegative ? <TrendingDown className="w-5 h-5 text-destructive shrink-0" />
              : <Minus className="w-5 h-5 text-muted-foreground shrink-0" />}
            <div>
              <p className="text-xs text-muted-foreground font-medium">Jelenlegi egyenleg</p>
              <p className={`text-2xl font-semibold tabular-nums ${
                isPositive ? "text-success"
                : isNegative ? "text-destructive"
                : "text-foreground"
              }`}>
                {loading ? "..." : `${balanceSign}${formatMinutes(balance ?? 0)}`}
              </p>
            </div>
          </div>
          {isPositive && activeTab === "overview" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  setCompDate("")
                  setCompMode((balance ?? 0) >= 480 ? "full" : "half")
                  setActiveTab("comp")
                }}
              >
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Csúsztatás
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  const maxH = Math.floor((balance ?? 0) / 60)
                  setPayoutHours(maxH > 0 ? maxH : (balance ?? 0) / 60)
                  setActiveTab("payout")
                }}
              >
                <Coins className="w-3.5 h-3.5 text-warning" />
                Kifizetés
              </Button>
            </div>
          )}
        </div>

        {/* 1. CSÚSZTATÁS ŰRLAP */}
        {activeTab === "comp" && (
          <div className="space-y-4 py-2 border rounded-lg p-3 bg-muted/20">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Csúsztatási kérelem
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => setActiveTab("overview")}
              >
                Vissza
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dlg-comp-date" className="text-xs font-medium">Csúsztatás napja</Label>
              <Input
                id="dlg-comp-date"
                type="date"
                value={compDate}
                onChange={(e) => setCompDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Időtartam</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={compMode === "full" ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setCompMode("full")}
                  disabled={(balance ?? 0) < 480}
                >
                  Egész nap (8h)
                </Button>
                <Button
                  type="button"
                  variant={compMode === "half" ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setCompMode("half")}
                  disabled={(balance ?? 0) < 240}
                >
                  Fél nap (4h)
                </Button>
                <Button
                  type="button"
                  variant={compMode === "custom" ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setCompMode("custom")}
                >
                  Egyedi óra
                </Button>
              </div>

              {compMode === "custom" && (
                <div className="pt-2 flex items-center gap-3">
                  <Input
                    type="number"
                    min={0.5}
                    max={Math.min(24, Math.floor((balance ?? 0) / 60))}
                    step={0.5}
                    value={compCustomHours}
                    onChange={(e) => setCompCustomHours(parseFloat(e.target.value) || 0)}
                    className="w-24 text-right tabular-nums h-8"
                  />
                  <span className="text-xs text-muted-foreground">óra lecsúsztatása</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dlg-comp-note" className="text-xs font-medium">Megjegyzés a vezetőnek</Label>
              <Textarea
                id="dlg-comp-note"
                placeholder="(Opcionális) Indoklás vagy megjegyzés..."
                rows={2}
                value={compNote}
                onChange={(e) => setCompNote(e.target.value)}
                className="resize-none text-xs"
              />
            </div>

            <div className="flex justify-between items-center text-xs text-muted-foreground pt-1 border-t border-border">
              <span>Várható fennmaradó egyenleg:</span>
              <span className={`font-semibold tabular-nums ${compRemaining >= 0 ? "text-success" : "text-destructive"}`}>
                {compRemaining >= 0 ? `+${formatMinutes(compRemaining)}` : `-${formatMinutes(Math.abs(compRemaining))}`}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab("overview")} disabled={isPending}>
                Mégse
              </Button>
              <Button size="sm" onClick={handleCompSubmit} disabled={isCompDisabled || isPending}>
                {isPending ? "Küldés..." : "Kérelem Beküldése"}
              </Button>
            </div>
          </div>
        )}

        {/* 2. KIFIZETÉS ŰRLAP */}
        {activeTab === "payout" && (
          <div className="space-y-4 py-2 border rounded-lg p-3 bg-muted/20">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-warning flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" /> Kifizetési igény
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => setActiveTab("overview")}
              >
                Vissza
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="dlg-payout-hours" className="text-xs font-medium">Kifizetendő órák</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] text-primary px-1 hover:underline"
                  onClick={() => setPayoutHours(Number(((balance ?? 0) / 60).toFixed(1)))}
                >
                  Teljes egyenleg kifizetése
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  id="dlg-payout-hours"
                  type="number"
                  min={0.5}
                  max={Number(((balance ?? 0) / 60).toFixed(1))}
                  step={0.5}
                  value={payoutHours || ""}
                  onChange={(e) => setPayoutHours(parseFloat(e.target.value) || 0)}
                  className="w-28 text-right tabular-nums"
                  placeholder="pl. 8"
                />
                <span className="text-xs text-muted-foreground">óra ({formatMinutes(payoutMinutes)})</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dlg-payout-note" className="text-xs font-medium">Megjegyzés a vezetőnek</Label>
              <Textarea
                id="dlg-payout-note"
                placeholder="(Opcionális) Megjegyzés a kifizetési igényhez..."
                rows={2}
                value={payoutNote}
                onChange={(e) => setPayoutNote(e.target.value)}
                className="resize-none text-xs"
              />
            </div>

            <div className="flex justify-between items-center text-xs text-muted-foreground pt-1 border-t border-border">
              <span>Fennmaradó egyenleg:</span>
              <span className={`font-semibold tabular-nums ${payoutRemaining >= 0 ? "text-success" : "text-destructive"}`}>
                {payoutRemaining >= 0 ? `+${formatMinutes(payoutRemaining)}` : `-${formatMinutes(Math.abs(payoutRemaining))}`}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab("overview")} disabled={isPending}>
                Mégse
              </Button>
              <Button size="sm" onClick={handlePayoutSubmit} disabled={isPayoutDisabled || isPending}>
                {isPending ? "Küldés..." : "Kifizetés Igénylése"}
              </Button>
            </div>
          </div>
        )}

        {/* 3. KORÁBBI KÉRELMEK */}
        {activeTab === "overview" && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Legutóbbi Kérelmek
            </p>
            {requests.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">
                Még nem nyújtottál be túlóra felhasználási vagy kifizetési kérelmet.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {requests.map(req => (
                  <div key={req.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {req.tipus === "kiveszi_szabinak"
                        ? <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                        : <Coins className="w-3.5 h-3.5 text-warning shrink-0" />}
                      <div className="truncate">
                        <p className="font-medium text-foreground truncate">
                          {req.tipus === "kiveszi_szabinak" ? "Csúsztatás" : "Kifizetés"} – {formatMinutes(req.perc)}
                        </p>
                        {req.datum && (
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            Dátum: {new Date(req.datum).toLocaleDateString("hu-HU")}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={req.statusz === "jovahagyva" ? "default" : req.statusz === "elutasitva" ? "destructive" : "secondary"}
                      className="text-[10px] h-5 shrink-0"
                    >
                      {req.statusz === "jovahagyva" ? "Jóváhagyva"
                        : req.statusz === "elutasitva" ? "Elutasítva"
                        : "Folyamatban"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="sm:justify-between pt-2">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Automatikus triggeres egyenlegszámítás
          </p>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Bezárás
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
