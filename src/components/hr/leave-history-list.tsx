"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CalendarDays, Clock, CheckCircle2, XCircle, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"

const tipusLabel: Record<string, string> = {
  szabadsag: "Szabadság",
  beteg: "Betegszabadság",
  home_office: "Home Office",
  rendkivuli: "Rendkívüli",
  fizetett: "Fizetett",
}

export function LeaveHistoryList({ leaves }: { leaves: any[] }) {
  if (!leaves || leaves.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Saját kérelmeim</CardTitle>
          <CardDescription>Még nem adtál le távolléti kérelmet.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "jovahagyasra_var":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="w-3 h-3" /> Folyamatban
          </span>
        )
      case "jovahagyva":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> Jóváhagyva
          </span>
        )
      case "elutasitva":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-destructive/10 text-destructive">
            <XCircle className="w-3 h-3" /> Elutasítva
          </span>
        )
      case "tervezet":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border text-muted-foreground">
            Tervezett
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border text-muted-foreground">
            {status}
          </span>
        )
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Saját kérelmeim</CardTitle>
        <CardDescription>Távollét és szabadság igénylések előzményei</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {leaves.map((leave) => {
            const startDate = leave.kezdet_datuma ? new Date(leave.kezdet_datuma) : null
            const endDate = leave.veg_datuma ? new Date(leave.veg_datuma) : null
            const durationDays =
              startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())
                ? Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                : null

            const statusBg =
              leave.statusz === "jovahagyva"
                ? "hover:border-l-emerald-400"
                : leave.statusz === "jovahagyasra_var"
                ? "hover:border-l-amber-400"
                : leave.statusz === "elutasitva"
                ? "hover:border-l-destructive"
                : "hover:border-l-primary"

            return (
              <div
                key={leave.id}
                className={`flex items-center justify-between px-6 py-4 border-l-4 border-l-transparent transition-colors hover:bg-muted/30 ${statusBg}`}
              >
                <div className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      {tipusLabel[leave.tipus] ?? String(leave.tipus).toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {startDate && !isNaN(startDate.getTime())
                        ? startDate.toLocaleDateString("hu-HU")
                        : "–"}
                      {" – "}
                      {endDate && !isNaN(endDate.getTime())
                        ? endDate.toLocaleDateString("hu-HU")
                        : "–"}
                      {durationDays !== null && (
                        <span className="ml-2 text-muted-foreground/60">({durationDays} nap)</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {leave.statusz === "jovahagyva" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                      onClick={() => window.open(`/api/hr/leave-pdf?tavolletId=${leave.id}`, "_blank")}
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      Igazolás
                    </Button>
                  )}
                  {getStatusDisplay(leave.statusz)}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
