"use client"

import { useEffect, useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Clock, TrendingUp, TrendingDown, Minus, Coins, Calendar } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

interface OvertimeRequest {
  id: string
  tipus: "kiveszi_szabinak" | "kifizetteti"
  perc: number
  statusz: string
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

  useEffect(() => {
    const load = async () => {
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
    load()
  }, [employeeId])

  const handleRequest = (tipus: "kiveszi_szabinak" | "kifizetteti") => {
    if (!balance || balance <= 0) {
      toast.error("Nincs felhasználható túlóra egyenleged")
      return
    }
    startTransition(async () => {
      const { error } = await supabase.from("hr_tulora_felhasznalás").insert({
        dolgozo_id: employeeId,
        tipus,
        perc: balance,
        statusz: "jovahagyasra_var"
      })
      if (error) {
        toast.error("Hiba a kérelem benyújtásakor", { description: error.message })
      } else {
        toast.success("Kérelem elküldve", { description: "A vezető jóváhagyására vár." })
        setRequests(prev => [{
          id: Math.random().toString(),
          tipus,
          perc: balance!,
          statusz: "jovahagyasra_var",
          created_at: new Date().toISOString()
        }, ...prev])
      }
    })
  }

  if (loading) return null

  const balanceSign = balance !== null && balance > 0 ? "+" : ""
  const isPositive = (balance ?? 0) > 0
  const isNegative = (balance ?? 0) < 0

  return (
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
        <div className={`flex items-center justify-between p-4 rounded-lg border ${
          isPositive ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
          : isNegative ? "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800"
          : "bg-muted/30 border-border"
        }`}>
          <div className="flex items-center gap-3">
            {isPositive ? <TrendingUp className="w-5 h-5 text-emerald-600" />
              : isNegative ? <TrendingDown className="w-5 h-5 text-rose-600" />
              : <Minus className="w-5 h-5 text-muted-foreground" />}
            <div>
              <p className="text-xs text-muted-foreground">Jelenlegi egyenleg</p>
              <p className={`text-2xl font-bold tabular-nums ${
                isPositive ? "text-emerald-700 dark:text-emerald-400"
                : isNegative ? "text-rose-700 dark:text-rose-400"
                : "text-foreground"
              }`}>
                {balanceSign}{formatMinutes(balance ?? 0)}
              </p>
            </div>
          </div>
          {isPositive && (
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => handleRequest("kiveszi_szabinak")}
                disabled={isPending}
              >
                <Calendar className="w-3.5 h-3.5" />
                Szabiként kiveszem
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={() => handleRequest("kifizetteti")}
                disabled={isPending}
              >
                <Coins className="w-3.5 h-3.5" />
                Kifizetést kérek
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
                  <div key={req.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {req.tipus === "kiveszi_szabinak"
                        ? <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        : <Coins className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className="text-muted-foreground">
                        {req.tipus === "kiveszi_szabinak" ? "Szabadnapként" : "Kifizetés"} – {formatMinutes(req.perc)}
                      </span>
                    </div>
                    <Badge
                      variant={req.statusz === "jovahagyva" ? "default" : req.statusz === "elutasitva" ? "destructive" : "secondary"}
                      className="text-[10px] h-5"
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
  )
}
