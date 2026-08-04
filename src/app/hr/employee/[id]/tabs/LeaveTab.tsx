"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CalendarDays, Clock, CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { HrLeaveRequestDialog } from "@/components/hr/hr-leave-request-dialog"
import { calculateAnnualLeave } from "@/utils/hr/leave-calculator"

export function LeaveTab({ 
  employeeId, 
  isHrOrAdmin, 
  leaves,
  adatlap
}: { 
  employeeId: string, 
  isHrOrAdmin: boolean,
  leaves: any[],
  adatlap?: any
}) {
  const [loading, setLoading] = useState(false)
  const currentYear = new Date().getFullYear()

  const totalLeave = calculateAnnualLeave(
    adatlap?.szuletesi_datum,
    adatlap?.gyermekek_szama,
    adatlap?.megvaltozott_munkakepessegu,
    currentYear
  )
  const usedLeave = leaves?.filter(t => t.tipus === "szabadsag" && t.statusz === "jovahagyva").length || 0
  const plannedLeave = leaves?.filter(t => t.tipus === "szabadsag" && t.statusz === "jovahagyasra_var").length || 0
  const remainingLeave = totalLeave - usedLeave

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "jovahagyasra_var":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800"><Clock className="w-3 h-3 mr-1" /> Folyamatban</Badge>
      case "jovahagyva":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Jóváhagyva</Badge>
      case "elutasitva":
        return <Badge variant="destructive">Elutasítva</Badge>
      case "tervezet":
        return <Badge variant="outline">Tervezet</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Szabadság Egyenleg */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold">Szabadság ({currentYear})</CardTitle>
              <CardDescription>Éves alapszabadság és pótszabadságok összege</CardDescription>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="mt-4 flex items-end justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{remainingLeave}</span>
                <span className="text-muted-foreground text-sm font-medium">nap maradt</span>
              </div>
              <div className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">Összesen: {totalLeave} nap</div>
            </div>
            <Progress value={(usedLeave / totalLeave) * 100} className="mt-6 h-2.5" />
            <div className="mt-4 flex items-center justify-between text-sm font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Felhasznált: {usedLeave} nap</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-500" /> Tervezett: {plannedLeave} nap</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-muted/30">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">HR Műveletek</CardTitle>
            <CardDescription>Távollétek adminisztrációja</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Itt a HR kézzel is rögzíthet távollétet (pl. tartós táppénz, fizetés nélküli szabadság) a dolgozó nevében, amit a dolgozó nem tud magának rögzíteni.
            </p>
            <HrLeaveRequestDialog employeeId={employeeId} />
          </CardContent>
        </Card>
      </div>

      {/* Távollét Történet */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Távollétek és Kérelmek Története</CardTitle>
          <CardDescription>A dolgozó összes eddigi és tervezett távolléte</CardDescription>
        </CardHeader>
        <CardContent>
          {leaves && leaves.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="h-10 px-4 text-left font-medium text-muted-foreground">Típus</th>
                    <th className="h-10 px-4 text-left font-medium text-muted-foreground">Kezdete</th>
                    <th className="h-10 px-4 text-left font-medium text-muted-foreground">Vége</th>
                    <th className="h-10 px-4 text-left font-medium text-muted-foreground">Hossz</th>
                    <th className="h-10 px-4 text-left font-medium text-muted-foreground">Státusz</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => {
                    const startDate = new Date(leave.kezdet_datuma)
                    const endDate = new Date(leave.veg_datuma)
                    const durationMs = endDate.getTime() - startDate.getTime()
                    const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24)) + 1
                    
                    return (
                      <tr key={leave.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-medium">{String(leave.tipus).toUpperCase()}</td>
                        <td className="p-4">{startDate.toLocaleDateString("hu-HU")}</td>
                        <td className="p-4">{endDate.toLocaleDateString("hu-HU")}</td>
                        <td className="p-4">{durationDays} nap</td>
                        <td className="p-4">{getStatusBadge(leave.statusz)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-lg border border-dashed">
              <CalendarDays className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-medium">Nincs még rögzített távollét</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
