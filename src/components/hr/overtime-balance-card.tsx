"use client"

import { useEffect, useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

export function OvertimeBalanceCard({ employeeId }: { employeeId: string }) {
  const [balance, setBalance] = useState<number | null>(null)
  const [requests, setRequests] = useState<OvertimeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  // Modálok állapota
  const [compDialogOpen, setCompDialogOpen] = useState(false)
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false)

  // Csúsztatás űrlap állapot
  const [compDate, setCompDate] = useState("")
  const [compMode, setCompMode] = useState<"full" | "half" | "custom">("full")
  const [compCustomHours, setCompCustomHours] = useState(1)
  const [compNote, setCompNote] = useState("")

  // Kifizetés űrlap állapot
  const [payoutHours, setPayoutHours] = useState(0)
  const [payoutNote, setPayoutNote] = useState("")

  const loadData = async () => {
    const [{ data: balanceData }, { data: reqData }] = await Promise.all([
      supabase
        .from("hr_tulora_egyenleg")
        .select("perc")
        .eq("dolgozo_id", employeeId)
        .single(),
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
    loadData()
  }, [employeeId])

  // Csúsztatási percek számítása
  const compMinutes = compMode === "full" ? 480 : compMode === "half" ? 240 : Math.round(compCustomHours * 60)
  const compRemaining = (balance ?? 0) - compMinutes
  const isCompDisabled = (balance ?? 0) < compMinutes || !compDate || compMinutes <= 0

  // Kifizetési percek számítása
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
        toast.success("Csúsztatási kérelem elküldve a vezetődnek!")
        setCompDialogOpen(false)
        setCompDate("")
        setCompNote("")
        setCompMode("full")
        loadData()
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
        toast.success("Kifizetési igény elküldve a vezetődnek!")
        setPayoutDialogOpen(false)
        setPayoutHours(0)
        setPayoutNote("")
        loadData()
      }
    })
  }

  if (loading) return null

  const balanceSign = balance !== null && balance > 0 ? "+" : ""
  const isPositive = (balance ?? 0) > 0
  const isNegative = (balance ?? 0) < 0

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Túlóra egyenleg</CardTitle>
          </div>
          <CardDescription>Ledolgozott pluszórák és felhasználási kérelmek</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Egyenleg kijelző */}
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border ${
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
                  {balanceSign}{formatMinutes(balance ?? 0)}
                </p>
              </div>
            </div>
            {isPositive && (
              <div className="flex sm:flex-col gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 flex-1 sm:flex-initial"
                  onClick={() => {
                    setCompDate("")
                    setCompMode((balance ?? 0) >= 480 ? "full" : "half")
                    setCompDialogOpen(true)
                  }}
                  disabled={isPending}
                >
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  Csúsztatás
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 flex-1 sm:flex-initial"
                  onClick={() => {
                    const maxH = Math.floor((balance ?? 0) / 60)
                    setPayoutHours(maxH > 0 ? maxH : (balance ?? 0) / 60)
                    setPayoutDialogOpen(true)
                  }}
                  disabled={isPending}
                >
                  <Coins className="w-3.5 h-3.5 text-warning" />
                  Kifizetés
                </Button>
              </div>
            )}
          </div>

          {/* Korábbi kérelmek */}
          {requests.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Kérelmek</p>
                <div className="space-y-2">
                  {requests.map(req => (
                    <div key={req.id} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        {req.tipus === "kiveszi_szabinak"
                          ? <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                          : <Coins className="w-3.5 h-3.5 text-warning shrink-0" />}
                        <div className="truncate">
                          <p className="text-xs font-medium text-foreground truncate">
                            {req.tipus === "kiveszi_szabinak" ? "Csúsztatás" : "Kifizetés"} – {formatMinutes(req.perc)}
                          </p>
                          {req.datum && (
                            <p className="text-[11px] text-muted-foreground tabular-nums">
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
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 1. CSÚSZTATÁS MODÁL */}
      <Dialog open={compDialogOpen} onOpenChange={setCompDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Csúsztatás igénylése
            </DialogTitle>
            <DialogDescription>
              Válassz egy szabadnapot, amelyet a felgyülemlett túlórád terhére szeretnél kivenni.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Egyenleg összefoglaló */}
            <div className="p-3 rounded-lg border bg-muted/30 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Rendelkezésre álló túlóra:</span>
                <span className="font-semibold text-foreground tabular-nums">+{formatMinutes(balance ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Igényelt levonás:</span>
                <span className="font-semibold text-primary tabular-nums">-{formatMinutes(compMinutes)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center font-medium">
                <span>Várható fennmaradó egyenleg:</span>
                <span className={`tabular-nums ${compRemaining >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}`}>
                  {compRemaining >= 0 ? `+${formatMinutes(compRemaining)}` : `-${formatMinutes(Math.abs(compRemaining))}`}
                </span>
              </div>
            </div>

            {/* Dátum kiválasztása */}
            <div className="space-y-1.5">
              <Label htmlFor="comp-date" className="text-xs font-medium">Csúsztatás napja</Label>
              <Input
                id="comp-date"
                type="date"
                value={compDate}
                onChange={(e) => setCompDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            {/* Időtartam kiválasztása */}
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

            {/* Megjegyzés */}
            <div className="space-y-1.5">
              <Label htmlFor="comp-note" className="text-xs font-medium">Megjegyzés a vezetőnek</Label>
              <Textarea
                id="comp-note"
                placeholder="(Opcionális) Indoklás vagy megjegyzés..."
                rows={2}
                value={compNote}
                onChange={(e) => setCompNote(e.target.value)}
                className="resize-none text-xs"
              />
            </div>

            {compRemaining < 0 && (
              <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Nincs elegendő túlóra egyenleged ehhez az igényléshez.</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCompDialogOpen(false)} disabled={isPending}>
              Mégse
            </Button>
            <Button size="sm" onClick={handleCompSubmit} disabled={isCompDisabled || isPending}>
              {isPending ? "Küldés..." : "Csúsztatás Igénylése"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. KIFIZETÉS MODÁL */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-warning" />
              Túlóra kifizetés igénylése
            </DialogTitle>
            <DialogDescription>
              Igényeld a felhalmozott túlórád pénzbeli kifizetését a bérszámfejtés felé.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Egyenleg összefoglaló */}
            <div className="p-3 rounded-lg border bg-muted/30 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Rendelkezésre álló túlóra:</span>
                <span className="font-semibold text-foreground tabular-nums">+{formatMinutes(balance ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Kifizetésre kért idő:</span>
                <span className="font-semibold text-warning tabular-nums">-{formatMinutes(payoutMinutes)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center font-medium">
                <span>Fennmaradó egyenleg:</span>
                <span className={`tabular-nums ${payoutRemaining >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}`}>
                  {payoutRemaining >= 0 ? `+${formatMinutes(payoutRemaining)}` : `-${formatMinutes(Math.abs(payoutRemaining))}`}
                </span>
              </div>
            </div>

            {/* Mennyiség megadása */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="payout-hours" className="text-xs font-medium">Kifizetendő órák</Label>
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
                  id="payout-hours"
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

            {/* Megjegyzés */}
            <div className="space-y-1.5">
              <Label htmlFor="payout-note" className="text-xs font-medium">Megjegyzés a vezetőnek</Label>
              <Textarea
                id="payout-note"
                placeholder="(Opcionális) Megjegyzés a kifizetési igényhez..."
                rows={2}
                value={payoutNote}
                onChange={(e) => setPayoutNote(e.target.value)}
                className="resize-none text-xs"
              />
            </div>

            {payoutRemaining < 0 && (
              <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>A megadott óraszám meghaladja a rendelkezésre álló túlórádat.</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPayoutDialogOpen(false)} disabled={isPending}>
              Mégse
            </Button>
            <Button size="sm" onClick={handlePayoutSubmit} disabled={isPayoutDisabled || isPending}>
              {isPending ? "Küldés..." : "Kifizetés Igénylése"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
