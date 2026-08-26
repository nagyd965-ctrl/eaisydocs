"use client"

import { useEffect, useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CheckCircle2, XCircle, Clock, Coins, Calendar } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

interface OvertimeRequest {
  id: string
  dolgozo_id: string
  tipus: "kiveszi_szabinak" | "kifizetteti"
  perc: number
  statusz: string
  created_at: string
  felhasznalo_profil?: { nev: string } | null
}

function formatMinutes(perc: number): string {
  const h = Math.floor(perc / 60)
  const m = perc % 60
  if (h === 0) return `${m} perc`
  if (m === 0) return `${h} óra`
  return `${h} ó ${m} p`
}

export function OvertimeRequestsPanel({ managerId }: { managerId: string }) {
  const [requests, setRequests] = useState<OvertimeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const load = async () => {
    // Lekéri a beosztottak függő túlóra kérelmeit
    const { data: teamIds } = await supabase
      .from("felhasznalo_profil")
      .select("id")
      .eq("kozvetlen_vezeto_id", managerId)

    if (!teamIds || teamIds.length === 0) {
      setLoading(false)
      return
    }

    const ids = teamIds.map(t => t.id)

    const { data } = await supabase
      .from("hr_tulora_felhasznalás")
      .select(`
        *,
        felhasznalo_profil:dolgozo_id ( nev )
      `)
      .in("dolgozo_id", ids)
      .eq("statusz", "jovahagyasra_var")
      .order("created_at", { ascending: false })

    setRequests(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [managerId])

  const handleAction = (id: string, action: "jovahagyva" | "elutasitva") => {
    startTransition(async () => {
      const { error } = await supabase
        .from("hr_tulora_felhasznalás")
        .update({
          statusz: action,
          jovahagyo_id: managerId,
          jovahagyva_at: new Date().toISOString()
        })
        .eq("id", id)

      if (error) {
        toast.error("Hiba a kérelem kezelésekor", { description: error.message })
      } else {
        toast.success(action === "jovahagyva" ? "Kérelem jóváhagyva" : "Kérelem elutasítva")
        setRequests(prev => prev.filter(r => r.id !== id))
      }
    })
  }

  if (loading || requests.length === 0) return null

  return (
    <Card className="border-l-4 border-l-warning">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-warning" />
          <CardTitle className="text-base font-semibold">Túlóra felhasználási kérelmek</CardTitle>
        </div>
        <CardDescription>Beosztottak jóváhagyásra váró kérelmei</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {requests.map(req => {
            const nev = (req.felhasznalo_profil as any)?.nev ?? "Ismeretlen"
            const initials = nev.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase()

            return (
              <div
                key={req.id}
                className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{nev}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {req.tipus === "kiveszi_szabinak"
                      ? <Calendar className="w-3 h-3 text-muted-foreground" />
                      : <Coins className="w-3 h-3 text-muted-foreground" />}
                    <p className="text-xs text-muted-foreground">
                      {req.tipus === "kiveszi_szabinak" ? "Szabadnapként" : "Kifizetési igény"} – {formatMinutes(req.perc)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleAction(req.id, "elutasitva")}
                    disabled={isPending}
                    title="Elutasítás"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    onClick={() => handleAction(req.id, "jovahagyva")}
                    disabled={isPending}
                    title="Jóváhagyás"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
