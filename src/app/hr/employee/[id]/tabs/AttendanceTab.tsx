"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, CalendarDays, Loader2, Edit2, Trash2, CheckCircle2, Eye, FileCheck, FilePlus, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { 
  getMonthlyTimesheet, 
  saveAttendanceRecord, 
  deleteAttendanceRecord, 
  getMonthlyClosingStatus, 
  submitMonthlyTimesheet, 
  approveMonthlyTimesheet, 
  getMonthlyTimesheetDocument,
  fileMonthlyTimesheet,
  type TimesheetEntry 
} from "@/app/hr/attendance-actions"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
import { toast } from "sonner"
import { calculateMonthlyTimesheet } from "@/utils/hr/timesheet-calculator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const typeColors: Record<string, string> = {
  munka: "bg-background text-foreground",
  szabadsag: "bg-info/10 text-info dark:bg-info/10 dark:text-info",
  betegseg: "bg-destructive/10 text-destructive dark:bg-destructive/10 dark:text-destructive",
  csusztatas: "bg-warning/10 text-warning dark:bg-warning/10 dark:text-warning",
  hetvege: "bg-muted/50 text-muted-foreground",
  unnep: "bg-primary/10 text-primary dark:bg-primary/10 dark:text-primary"
}

const typeLabels: Record<string, string> = {
  munka: "Munkanap",
  szabadsag: "Szabadság",
  betegseg: "Betegség",
  csusztatas: "Csúsztatás (Túlóra)",
  hetvege: "Hétvége",
  unnep: "Ünnepnap"
}

export function AttendanceTab({ employeeId }: { employeeId: string }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [timesheet, setTimesheet] = useState<TimesheetEntry[]>([])
  const [closingStatus, setClosingStatus] = useState<string>("nyitott")
  const [employeeFte, setEmployeeFte] = useState<number>(1.0)
  const [monthlyDoc, setMonthlyDoc] = useState<any>(null)
  const [filingLoading, setFilingLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  const [editOpen, setEditOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null)
  
  const [checkInStr, setCheckInStr] = useState("")
  const [checkOutStr, setCheckOutStr] = useState("")
  const [saving, setSaving] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  const loadData = async () => {
    setLoading(true)
    const { data, fte, error } = await getMonthlyTimesheet(employeeId, year, month)
    const { data: closingData } = await getMonthlyClosingStatus(employeeId, year, month)
    const { doc } = await getMonthlyTimesheetDocument(employeeId, year, month)
    
    if (error) {
      toast.error("Hiba történt a jelenléti ív betöltésekor: " + error)
    } else if (data) {
      setTimesheet(data)
      if (fte !== undefined) setEmployeeFte(fte)
    }
    
    if (closingData) {
      setClosingStatus(closingData.statusz)
    }

    setMonthlyDoc(doc || null)
    
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [year, month, employeeId])

  const prevMonth = () => setCurrentDate(new Date(year, month - 2, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month, 1))

  const formatIsoTime = (iso?: string | null): string => {
    if (!iso) return "-"
    if (iso.includes("T")) {
      try {
        const d = new Date(iso)
        if (!isNaN(d.getTime())) {
          const h = String(d.getHours()).padStart(2, "0")
          const m = String(d.getMinutes()).padStart(2, "0")
          return `${h}:${m}`
        }
      } catch {}
    }
    return iso.substring(0, 5)
  }

  const formatTime = (isoString: string | null) => {
    return formatIsoTime(isoString)
  }

  const parseToIso = (timeStr: string, dateIso: string) => {
    if (!timeStr) return null
    const [hours, minutes] = timeStr.split(':')
    const date = new Date(dateIso)
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    return date.toISOString()
  }

  const handleEditClick = (entry: TimesheetEntry) => {
    if (entry.type !== "munka") return // Csak a munkanapok szerkeszthetők közvetlenül
    
    setSelectedEntry(entry)
    
    if (entry.becsekkolas_ideje) {
      const d = new Date(entry.becsekkolas_ideje)
      setCheckInStr(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`)
    } else {
      setCheckInStr("")
    }

    if (entry.kicsekkolas_ideje) {
      const d = new Date(entry.kicsekkolas_ideje)
      setCheckOutStr(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`)
    } else {
      setCheckOutStr("")
    }

    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!selectedEntry) return
    setSaving(true)

    const checkInIso = parseToIso(checkInStr, selectedEntry.datum)
    const checkOutIso = parseToIso(checkOutStr, selectedEntry.datum)

    const result = await saveAttendanceRecord(
      employeeId,
      selectedEntry.datum,
      checkInIso,
      checkOutIso
    )

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Jelenlét sikeresen módosítva!")
      setEditOpen(false)
      loadData()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string, datum: string) => {
    if (!id || id.startsWith("missing") || id.startsWith("weekend")) return
    
    const result = await deleteAttendanceRecord(id, employeeId, datum)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Bejegyzés törölve!")
      loadData()
    }
  }

  const handleSubmitMonth = async () => {
    const result = await submitMonthlyTimesheet(employeeId, year, month)
    if (result.error) toast.error(result.error)
    else {
      toast.success("Hónap sikeresen beküldve lezárásra!")
      loadData()
    }
  }

  const handleApproveMonth = async () => {
    const result = await approveMonthlyTimesheet(employeeId, year, month)
    if (result.error) toast.error(result.error)
    else {
      toast.success("Hónap sikeresen jóváhagyva!")
      loadData()
    }
  }

  const handleFileTimesheet = async () => {
    setFilingLoading(true)
    try {
      const result = await fileMonthlyTimesheet(employeeId, year, month)
      if (result.success) {
        toast.success(`A havi jelenléti ív sikeresen beiktatva a személyi dossziéba! (${result.iktatoszam})`)
        await loadData()
      } else {
        toast.error(result.error || "Hiba történt az iktatás során.")
      }
    } catch (err: any) {
      toast.error("Váratlan hiba: " + err.message)
    } finally {
      setFilingLoading(false)
    }
  }

  const timesheetInput = timesheet.map(t => ({
    date: t.datum,
    type: t.type,
    checkIn: t.becsekkolas_ideje,
    checkOut: t.kicsekkolas_ideje
  }))

  const { calculatedDays, totalActual, totalBalance } = calculateMonthlyTimesheet(timesheetInput, 8.0, employeeFte)

  const totalDaysWorked = timesheet.filter(t => t.type === "munka" && t.becsekkolas_ideje).length
  const totalLeaveDays = timesheet.filter(t => t.type === "szabadsag" || t.type === "betegseg" || t.type === "csusztatas").length

  const timesheetPdfUrl = `/api/hr/timesheet-pdf?employeeId=${employeeId}&year=${year}&month=${month}`

  return (
    <div className="space-y-6">
      <Card className="border border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" /> Havi Jelenléti Ív
              </CardTitle>
              <CardDescription>
                A dolgozó munkaidejének és távolléteinek kezelése
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end w-full lg:w-auto">
              {/* Megtekintés PDF-ben */}
              <PdfViewerDialog
                url={monthlyDoc?.signedUrl || timesheetPdfUrl}
                title={`Havi Jelenléti Ív - ${year}. ${new Date(year, month - 1).toLocaleString('hu-HU', { month: 'long' })}`}
                trigger={
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                    <Eye className="w-3.5 h-3.5 text-primary" /> Megtekintés
                  </Button>
                }
              />

              {/* Ha már be van iktatva */}
              {monthlyDoc?.iktatoszam ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs font-mono gap-1 h-8 px-2.5">
                    <FileCheck className="w-3.5 h-3.5" />
                    Iktatva: {monthlyDoc.iktatoszam}
                  </Badge>
                  {monthlyDoc.ugyirat_id && (
                    <Link
                      href={`/dossiers/${monthlyDoc.ugyirat_id}`}
                      target="_blank"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      <ExternalLink className="w-3 h-3" /> Dosszié
                    </Link>
                  )}
                </div>
              ) : closingStatus === "jovahagyva" ? (
                /* Ha le van zárva, de még nincs iktatva */
                <Button
                  size="sm"
                  className="gap-1.5 text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleFileTimesheet}
                  disabled={filingLoading}
                >
                  {filingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FilePlus className="w-3.5 h-3.5" />}
                  Iktatás dossziéba
                </Button>
              ) : null}

              {closingStatus === "nyitott" && (
                <Button variant="outline" size="sm" onClick={handleSubmitMonth} className="h-8 text-xs">
                  Beküldés lezárásra
                </Button>
              )}
              {closingStatus === "jovahagyasra_var" && (
                <Button size="sm" onClick={handleApproveMonth} className="h-8 text-xs bg-success hover:bg-success/90 text-success-foreground border-transparent">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Jóváhagyás
                </Button>
              )}
              {closingStatus === "jovahagyva" && !monthlyDoc?.iktatoszam && (
                <Badge className="bg-success/10 text-success border border-success/30 text-xs h-8 px-2.5">Lezárva</Badge>
              )}
              
              <div className="flex items-center gap-1 ml-1">
                <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="font-semibold text-xs sm:text-sm w-28 sm:w-32 text-center select-none">
                  {year}. {new Date(year, month - 1).toLocaleString('hu-HU', { month: 'long' })}
                </div>
                <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-muted/30 p-3 rounded-md border text-center">
              <div className="text-xs text-muted-foreground uppercase mb-1">Ledolgozott órák</div>
              <div className="text-lg font-bold">{totalActual.toFixed(1)} h</div>
            </div>
            <div className="bg-muted/30 p-3 rounded-md border text-center">
              <div className="text-xs text-muted-foreground uppercase mb-1">Munkaidő Egyenleg</div>
              <div className={`text-lg font-semibold ${totalBalance > 0 ? "text-success" : totalBalance < 0 ? "text-destructive" : ""}`}>
                {totalBalance > 0 ? "+" : ""}{totalBalance.toFixed(1)} h
              </div>
            </div>
            <div className="bg-muted/30 p-3 rounded-md border text-center">
              <div className="text-xs text-muted-foreground uppercase mb-1">Munkanapok</div>
              <div className="text-lg font-bold">{totalDaysWorked} nap</div>
            </div>
            <div className="bg-muted/30 p-3 rounded-md border text-center">
              <div className="text-xs text-muted-foreground uppercase mb-1">Távollét</div>
              <div className="text-lg font-semibold tabular-nums">{totalLeaveDays} nap</div>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm compact-table">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground w-32">Dátum</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Típus</th>
                  <th className="h-10 px-4 text-center font-medium text-muted-foreground">Terv</th>
                  <th className="h-10 px-4 text-center font-medium text-muted-foreground">Becsekkolás</th>
                  <th className="h-10 px-4 text-center font-medium text-muted-foreground">Kicsekkolás</th>
                  <th className="h-10 px-4 text-center font-medium text-muted-foreground">Tény</th>
                  <th className="h-10 px-4 text-center font-medium text-muted-foreground">Egyenleg</th>
                  <th className="h-10 px-4 text-right font-medium text-muted-foreground">Műveletek</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="h-32 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : timesheet.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="h-20 text-center text-muted-foreground">
                      Nincs elérhető adat erre a hónapra.
                    </td>
                  </tr>
                ) : (
                  timesheet.map((entry) => {
                    const isEditable = entry.type === "munka" && closingStatus === "nyitott"
                    const calc = calculatedDays.find(c => c.date === entry.datum)
                    
                    return (
                      <tr 
                        key={entry.id} 
                        className={`border-b last:border-0 ${entry.pendingCorrection ? "bg-amber-500/[0.04] dark:bg-amber-500/[0.08]" : typeColors[entry.type]}`}
                      >
                        <td className="p-3 font-medium whitespace-nowrap">
                          {entry.datum.substring(8, 10)}. {["V", "H", "K", "Sze", "Cs", "P", "Szo"][new Date(entry.datum).getDay()]}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{typeLabels[entry.type]}</span>
                            {entry.pendingCorrection && (
                              <Badge variant="outline" className="text-[10px] bg-warning/15 text-warning font-semibold border-warning/30 px-1.5 py-0.5">
                                Korrekció bírálat alatt
                              </Badge>
                            )}
                          </div>
                          {entry.pendingCorrection ? (
                            <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1.5 font-normal">
                              <span className="font-medium">Kért idő:</span>
                              <span className="tabular-nums font-semibold">
                                {formatIsoTime(entry.pendingCorrection.uj_becsekkolas)} – {formatIsoTime(entry.pendingCorrection.uj_kicsekkolas)}
                              </span>
                              {entry.pendingCorrection.indoklas && (
                                <span className="italic text-muted-foreground truncate max-w-[220px]" title={entry.pendingCorrection.indoklas}>
                                  („{entry.pendingCorrection.indoklas}”)
                                </span>
                              )}
                            </div>
                          ) : entry.note ? (
                            <span className="text-xs block opacity-70 mt-0.5">{entry.note}</span>
                          ) : null}
                        </td>
                        <td className="p-3 text-center opacity-70">
                          {calc?.plannedHours ? `${calc.plannedHours} h` : "-"}
                        </td>
                        <td className="p-3 text-center">
                          {entry.pendingCorrection ? (
                            <div className="flex flex-col items-center leading-tight">
                              {entry.becsekkolas_ideje ? (
                                <span className="text-[11px] line-through text-muted-foreground tabular-nums">
                                  {formatTime(entry.becsekkolas_ideje)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                                {entry.becsekkolas_ideje ? "→ " : ""}{formatIsoTime(entry.pendingCorrection.uj_becsekkolas)}
                              </span>
                            </div>
                          ) : entry.becsekkolas_ideje ? (
                            <span className="tabular-nums">{formatTime(entry.becsekkolas_ideje)}</span>
                          ) : (
                            <span className="opacity-70">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {entry.pendingCorrection ? (
                            <div className="flex flex-col items-center leading-tight">
                              {entry.kicsekkolas_ideje ? (
                                <span className="text-[11px] line-through text-muted-foreground tabular-nums">
                                  {formatTime(entry.kicsekkolas_ideje)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                                {entry.kicsekkolas_ideje ? "→ " : ""}{formatIsoTime(entry.pendingCorrection.uj_kicsekkolas)}
                              </span>
                            </div>
                          ) : entry.kicsekkolas_ideje ? (
                            <span className="tabular-nums">{formatTime(entry.kicsekkolas_ideje)}</span>
                          ) : (
                            <span className="opacity-70">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-medium tabular-nums">
                          {calc?.actualHours ? `${calc.actualHours} h` : "-"}
                        </td>
                        <td className={`p-3 text-center font-semibold tabular-nums ${calc && calc.balance > 0 ? "text-success" : calc && calc.balance < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          {calc?.balance ? (calc.balance > 0 ? `+${calc.balance} h` : `${calc.balance} h`) : "-"}
                        </td>
                        <td className="p-3 text-right">
                          {isEditable && (
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => handleEditClick(entry)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              {!entry.id.startsWith("missing") && !entry.id.startsWith("weekend") && entry.record_id && (
                                <AlertDialog>
                                  <AlertDialogTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-destructive/10 hover:text-destructive h-8 w-8 text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Törlöd ezt a bejegyzést?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Ezzel törlöd a dolgozó becsekkolási és kicsekkolási adatait erről a napról ({entry.datum}). Ezt nem lehet visszavonni.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Mégse</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => entry.record_id && handleDelete(entry.record_id, entry.datum)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Törlés
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jelenlét módosítása</DialogTitle>
            <DialogDescription>
              {selectedEntry?.datum} napi munkaidő adatainak megadása. (Óó:Pp formátumban)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="checkin" className="text-right">Becsekkolás</Label>
              <Input
                id="checkin"
                type="time"
                className="col-span-3"
                value={checkInStr}
                onChange={(e) => setCheckInStr(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="checkout" className="text-right">Kicsekkolás</Label>
              <Input
                id="checkout"
                type="time"
                className="col-span-3"
                value={checkOutStr}
                onChange={(e) => setCheckOutStr(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Mégse</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
