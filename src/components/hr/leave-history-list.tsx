"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Clock } from "lucide-react"

export function LeaveHistoryList({ leaves }: { leaves: any[] }) {
  if (!leaves || leaves.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Korábbi kérelmek</CardTitle>
          <CardDescription>Még nem adtál le távolléti kérelmet.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "jovahagyasra_var":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100"><Clock className="w-3 h-3 mr-1" /> Folyamatban</Badge>
      case "jovahagyva":
        return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Jóváhagyva</Badge>
      case "elutasitva":
        return <Badge variant="destructive">Elutasítva</Badge>
      case "tervezet":
        return <Badge variant="outline">Tervezet</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saját kérelmeim</CardTitle>
        <CardDescription>Távollét és szabadság igénylések előzményei</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leaves.map((leave) => {
            const startDate = new Date(leave.kezdet_datuma)
            const endDate = new Date(leave.veg_datuma)
            const durationMs = endDate.getTime() - startDate.getTime()
            const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24)) + 1

            return (
              <div key={leave.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg hover:bg-muted/50 transition-colors shadow-sm">
                <div className="flex gap-4">
                  <div className="bg-primary/10 p-3 rounded-full h-fit border border-primary/20">
                    <CalendarDays className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{String(leave.tipus).toUpperCase()}</p>
                    <p className="text-sm text-muted-foreground">
                      {startDate.toLocaleDateString('hu-HU')} - {endDate.toLocaleDateString('hu-HU')} ({durationDays} nap)
                    </p>
                  </div>
                </div>
                <div className="mt-4 sm:mt-0">
                  {getStatusBadge(leave.statusz)}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
