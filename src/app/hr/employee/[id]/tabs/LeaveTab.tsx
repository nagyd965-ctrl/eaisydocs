"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  CalendarDays, 
  Clock, 
  CheckCircle2, 
  Eye, 
  Download, 
  Archive, 
  FileText, 
  FileCheck, 
  Loader2,
  ShieldCheck,
  AlertTriangle,
  AlertCircle
} from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { HrLeaveRequestDialog } from "@/components/hr/hr-leave-request-dialog"
import { calculateAnnualLeave } from "@/utils/hr/leave-calculator"
import { calculate14DayConsecutiveLeave, calculateYearEndLeaveRisk } from "@/utils/hr/leave-compliance-calculator"
import { toggle14DayWaiverAction } from "@/app/hr/compliance/compliance-actions"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
import { getAnnualLeaveDocument, fileAnnualLeaveSheet } from "../actions"

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
  const currentYear = new Date().getFullYear()
  const [annualDoc, setAnnualDoc] = useState<{ id: string; iktatoszam?: string | null; dossierId?: string | null } | null>(null)
  const [filingLoading, setFilingLoading] = useState(false)

  useEffect(() => {
    if (employeeId) {
      getAnnualLeaveDocument(employeeId, currentYear).then((doc) => {
        if (doc) setAnnualDoc(doc)
      })
    }
  }, [employeeId, currentYear])

  const handleFileAnnualSheet = async () => {
    setFilingLoading(true)
    try {
      const res = await fileAnnualLeaveSheet(employeeId, currentYear)
      if (res.success) {
        toast.success(`Az éves szabadság nyilvántartás sikeresen beiktatva a személyi dossziéba! (${res.iktatoszam})`)
        setAnnualDoc({ id: res.docId || "", iktatoszam: res.iktatoszam, dossierId: res.ugyirat_id })
      } else {
        toast.error(res.error || "Hiba történt az iktatás során.")
      }
    } catch (err: any) {
      toast.error("Váratlan hiba történt: " + (err?.message || "Ismeretlen hiba"))
    } finally {
      setFilingLoading(false)
    }
  }

  const totalLeave = calculateAnnualLeave(
    adatlap?.szuletesi_datum,
    adatlap?.gyermekek_szama,
    adatlap?.megvaltozott_munkakepessegu,
    currentYear
  )
  const usedLeave = leaves?.filter(t => t.tipus === "szabadsag" && t.statusz === "jovahagyva").length || 0
  const plannedLeave = leaves?.filter(t => t.tipus === "szabadsag" && t.statusz === "jovahagyasra_var").length || 0
  const remainingLeave = totalLeave - usedLeave

  const [hasWaiver, setHasWaiver] = useState<boolean>(Boolean(adatlap?.eltero_megallapodas_14_nap))
  const [waiverLoading, setWaiverLoading] = useState<boolean>(false)

  useEffect(() => {
    setHasWaiver(Boolean(adatlap?.eltero_megallapodas_14_nap))
  }, [adatlap?.eltero_megallapodas_14_nap])

  const consecutiveLeaveData = useMemo(() => {
    return calculate14DayConsecutiveLeave(
      leaves || [],
      [],
      [],
      currentYear,
      hasWaiver
    )
  }, [leaves, currentYear, hasWaiver])

  const yearEndRisk = useMemo(() => {
    return calculateYearEndLeaveRisk(
      totalLeave,
      usedLeave,
      plannedLeave,
      [],
      currentYear,
      new Date()
    )
  }, [totalLeave, usedLeave, plannedLeave, currentYear])

  const handleToggleWaiver = async (checked: boolean) => {
    if (!isHrOrAdmin) return
    setWaiverLoading(true)
    try {
      const res = await toggle14DayWaiverAction(employeeId, checked)
      if (res.success) {
        setHasWaiver(checked)
        toast.success(
          checked
            ? "Eltérő megállapodás rögzítve (14 napos egybefüggő szabadság alóli felmentés)."
            : "Eltérő megállapodás visszavonva (14 napos kötelezettség érvényben)."
        )
      } else {
        toast.error(res.error || "Hiba történt a beállítás mentésekor.")
      }
    } catch (err: any) {
      toast.error("Váratlan hiba: " + (err?.message || "Ismeretlen hiba"))
    } finally {
      setWaiverLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "jovahagyasra_var":
        return <Badge variant="secondary" className="bg-warning/10 text-warning border border-warning/30"><Clock className="w-3 h-3 mr-1" /> Folyamatban</Badge>
      case "jovahagyva":
        return <Badge variant="secondary" className="bg-success/10 text-success border border-success/30">Jóváhagyva</Badge>
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
        <Card className="border border-border/50">
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
                <span className="text-4xl font-semibold tabular-nums">{remainingLeave}</span>
                <span className="text-muted-foreground text-sm font-medium">nap maradt</span>
              </div>
              <div className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md tabular-nums">Összesen: {totalLeave} nap</div>
            </div>
            <Progress value={totalLeave > 0 ? (usedLeave / totalLeave) * 100 : 0} className="mt-6 h-2.5" />
            <div className="mt-4 flex items-center justify-between text-sm font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-success" /> Felhasznált: <span className="tabular-nums">{usedLeave}</span> nap</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-warning" /> Tervezett: <span className="tabular-nums">{plannedLeave}</span> nap</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-muted/30">
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

      {/* Mt. Szabadságkiadási Megfelelőség és Riasztások */}
      <Card className="border border-border/50">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Mt. Szabadságkiadási Megfelelőség ({currentYear})
              </CardTitle>
              <CardDescription>
                Munka Törvénykönyve szerinti 14 napos egybefüggő pihenőidő és év végi szabadságkeret ellenőrzése
              </CardDescription>
            </div>
            <Link
              href="/hr/compliance"
              className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1 self-start sm:self-center"
            >
              Vállalati Megfelelőségi Hub &rarr;
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* 14 napos egybefüggő szabadság (Mt. 122. § (3)) */}
            <div className="rounded-lg border border-border/40 p-3.5 bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Mt. 122. § (3) – 14 nap egybefüggő
                </span>
                {consecutiveLeaveData.isFulfilled ? (
                  <Badge variant="secondary" className="bg-success/10 text-success border border-success/30 font-medium">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Teljesült ({consecutiveLeaveData.maxConsecutiveDays} nap)
                  </Badge>
                ) : hasWaiver ? (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/30 font-medium">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Eltérő megállapodás
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="font-medium">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Hiányzik ({consecutiveLeaveData.maxConsecutiveDays}/14 nap)
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {consecutiveLeaveData.isFulfilled ? (
                  <>
                    Leghosszabb egybefüggő pihenőtartam: <strong className="text-foreground tabular-nums">{consecutiveLeaveData.maxConsecutiveDays} naptári nap</strong>
                    {consecutiveLeaveData.longestBlock && (
                      <span className="block mt-0.5 tabular-nums">
                        ({consecutiveLeaveData.longestBlock.startDate} – {consecutiveLeaveData.longestBlock.endDate})
                      </span>
                    )}
                  </>
                ) : hasWaiver ? (
                  <>
                    A munkáltató és a munkavállaló írásban megállapodott a 14 naptári napos egybefüggő pihenőtartam mellőzéséről. 
                    Eddigi leghosszabb: <span className="tabular-nums font-medium text-foreground">{consecutiveLeaveData.maxConsecutiveDays} nap</span>.
                  </>
                ) : (
                  <>
                    A munkavállaló részére a naptári évben legalább 14 egybefüggő naptári nap munkavégzés alóli mentesülés még nincs kiadva vagy jóváhagyva.
                    Eddigi leghosszabb: <span className="tabular-nums font-medium text-foreground">{consecutiveLeaveData.maxConsecutiveDays} nap</span>.
                  </>
                )}
              </p>

              {isHrOrAdmin && (
                <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <label htmlFor="waiver-switch" className="text-xs font-medium cursor-pointer">
                      Eltérő megállapodás (Mt. 122. § (3))
                    </label>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Felmentés a 14 nap egybefüggő kiadás alól
                    </p>
                  </div>
                  <Switch
                    id="waiver-switch"
                    checked={hasWaiver}
                    disabled={waiverLoading}
                    onCheckedChange={handleToggleWaiver}
                  />
                </div>
              )}
            </div>

            {/* Év végi maradványszabadság kockázat (Mt. 123. §) */}
            <div className="rounded-lg border border-border/40 p-3.5 bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Mt. 123. § – Év végi maradvány
                </span>
                {yearEndRisk.riskLevel === "kritikus" ? (
                  <Badge variant="destructive" className="font-medium">
                    <AlertCircle className="w-3 h-3 mr-1" /> Kritikus kockázat
                  </Badge>
                ) : yearEndRisk.riskLevel === "figyelmeztetes" ? (
                  <Badge variant="secondary" className="bg-warning/10 text-warning border border-warning/30 font-medium">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Q4 Riasztás
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-success/10 text-success border border-success/30 font-medium">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Ütemezés rendben
                  </Badge>
                )}
              </div>

              <div className="text-xs space-y-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Fennmaradó szabadság:</span>
                  <span className="font-semibold text-foreground tabular-nums">{yearEndRisk.remainingDays} nap</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Évből hátralévő munkanapok:</span>
                  <span className="font-semibold text-foreground tabular-nums">{yearEndRisk.remainingWorkingDays} nap</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground pt-1 border-t border-border/40">
                {yearEndRisk.riskLevel === "kritikus" ? (
                  <span className="text-destructive font-medium">
                    Kritikus: A fennmaradó szabadságnapok száma ({yearEndRisk.remainingDays}) meghaladja a még hátralévő munkanapokat ({yearEndRisk.remainingWorkingDays})! A szabadságok teljes kiadása a tárgyévben nem lehetséges.
                  </span>
                ) : yearEndRisk.riskLevel === "figyelmeztetes" ? (
                  <span className="text-warning-foreground dark:text-warning font-medium">
                    Figyelem (Novemberi riasztás): {yearEndRisk.remainingDays} nap szabadság vár kiadásra az év végéig. Javasolt a kiadási terv azonnali elkészítése.
                  </span>
                ) : (
                  <span>
                    A szabadságkiadási ütemterv a naptári év végéig biztosított. A fennmaradó napok aránya nem haladja meg a hátralévő munkanapokat.
                  </span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Távollét Történet */}
      <Card className="border border-border/50">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-lg font-semibold">Távollétek és Kérelmek Története</CardTitle>
            <CardDescription>A dolgozó összes eddigi és tervezett távolléte a(z) {currentYear}. évben</CardDescription>
          </div>
          {isHrOrAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              {annualDoc?.iktatoszam && (
                <Link
                  href={annualDoc.dossierId ? `/dossiers/${annualDoc.dossierId}` : "#"}
                  className="inline-flex"
                >
                  <Badge
                    variant="outline"
                    className="h-8 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors gap-1.5 px-2.5 text-xs font-medium cursor-pointer"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    Iktatva: {annualDoc.iktatoszam}
                  </Badge>
                </Link>
              )}

              <PdfViewerDialog
                url={`/api/hr/annual-leave-pdf?employeeId=${employeeId}&year=${currentYear}&preview=true`}
                title={`Éves Szabadság- és Távollét Nyilvántartó Lap (${currentYear}) - Mt. 134. §`}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    title="Hivatalos éves szabadság-nyilvántartó lap megtekintése böngészőben"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span>Éves Nyilvántartó Lap (Mt. 134. §)</span>
                  </Button>
                }
              />

              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() =>
                  window.open(
                    `/api/hr/annual-leave-pdf?employeeId=${employeeId}&year=${currentYear}&download=true`,
                    "_blank"
                  )
                }
                title="Éves nyilvántartó lap letöltése (PDF)"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>

              {!annualDoc?.iktatoszam && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5 hover:border-primary transition-colors"
                  onClick={handleFileAnnualSheet}
                  disabled={filingLoading}
                  title="Éves szabadság nyilvántartás beiktatása az eaisyDocs személyi dossziéba"
                >
                  {filingLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Archive className="w-3.5 h-3.5" />
                  )}
                  <span>Iktatás eaisyDocs-ba</span>
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {leaves && leaves.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm compact-table">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="h-10 px-4 text-left font-medium text-muted-foreground">Típus</th>
                    <th className="h-10 px-4 text-left font-medium text-muted-foreground">Kezdete</th>
                    <th className="h-10 px-4 text-left font-medium text-muted-foreground">Vége</th>
                    <th className="h-10 px-4 text-left font-medium text-muted-foreground">Hossz</th>
                    <th className="h-10 px-4 text-left font-medium text-muted-foreground">Státusz</th>
                    <th className="h-10 px-4 text-right font-medium text-muted-foreground">Műveletek</th>
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
                        <td className="p-4 tabular-nums">{startDate.toLocaleDateString("hu-HU")}</td>
                        <td className="p-4 tabular-nums">{endDate.toLocaleDateString("hu-HU")}</td>
                        <td className="p-4 tabular-nums">{durationDays} nap</td>
                        <td className="p-4">{getStatusBadge(leave.statusz)}</td>
                        <td className="p-4 text-right">
                          {leave.statusz === "jovahagyva" ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <PdfViewerDialog
                                url={`/api/hr/leave-pdf?tavolletId=${leave.id}&preview=true`}
                                title={`Távolléti Igazolás - ${String(leave.tipus).toUpperCase()} (${startDate.toLocaleDateString("hu-HU")})`}
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
                                    title="Távolléti igazolás megtekintése böngészőben"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-primary" />
                                    <span>Megtekintés</span>
                                  </Button>
                                }
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
                                onClick={() => window.open(`/api/hr/leave-pdf?tavolletId=${leave.id}&download=true`, "_blank")}
                                title="Távolléti igazolás letöltése (PDF)"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Letöltés</span>
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </td>
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
