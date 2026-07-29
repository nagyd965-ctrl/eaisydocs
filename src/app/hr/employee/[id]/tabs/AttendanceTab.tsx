"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, ChevronRight, CalendarDays, Loader2, Edit2, Trash2 } from "lucide-react"
import { getMonthlyTimesheet, saveAttendanceRecord, deleteAttendanceRecord, type TimesheetEntry } from "@/app/hr/attendance-actions"
import { toast } from "sonner"
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

const typeColors = {
  munka: "bg-background text-foreground",
  szabadsag: "bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  betegseg: "bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  hetvege: "bg-muted/50 text-muted-foreground",
  unnep: "bg-purple-50 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
}

const typeLabels = {
  munka: "Munkanap",
  szabadsag: "Szabadság",
  betegseg: "Betegség",
  hetvege: "Hétvége",
  unnep: "Ünnepnap"
}

export function AttendanceTab({ employeeId }: { employeeId: string }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [timesheet, setTimesheet] = useState<TimesheetEntry[]>([])
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
    const { data, error } = await getMonthlyTimesheet(employeeId, year, month)
    if (error) {
      toast.error("Hiba történt a jelenléti ív betöltésekor: " + error)
    } else if (data) {
      setTimesheet(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [year, month, employeeId])

  const prevMonth = () => setCurrentDate(new Date(year, month - 2, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month, 1))

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "-"
    return new Date(isoString).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })
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

  const handleDelete = async (id: string) => {
    if (!id || id.startsWith("missing") || id.startsWith("weekend")) return
    
    const result = await deleteAttendanceRecord(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Bejegyzés törölve!")
      loadData()
    }
  }

  const calculateHours = (start: string | null, end: string | null) => {
    if (!start || !end) return 0
    const diff = new Date(end).getTime() - new Date(start).getTime()
    return diff / (1000 * 60 * 60)
  }

  const totalHours = timesheet.reduce((sum, entry) => {
    if (entry.type === "munka") {
      return sum + calculateHours(entry.becsekkolas_ideje, entry.kicsekkolas_ideje)
    }
    return sum
  }, 0)

  const totalDaysWorked = timesheet.filter(t => t.type === "munka" && t.becsekkolas_ideje).length
  const totalLeaveDays = timesheet.filter(t => t.type === "szabadsag" || t.type === "betegseg").length

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" /> Havi Jelenléti Ív
              </CardTitle>
              <CardDescription>
                A dolgozó munkaidejének és távolléteinek kezelése
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="font-semibold text-sm w-32 text-center">
                {year}. {new Date(year, month - 1).toLocaleString('hu-HU', { month: 'long' })}
              </div>
              <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-muted/30 p-3 rounded-md border text-center">
              <div className="text-xs text-muted-foreground uppercase mb-1">Ledolgozott órák</div>
              <div className="text-lg font-bold">{totalHours.toFixed(1)} h</div>
            </div>
            <div className="bg-muted/30 p-3 rounded-md border text-center">
              <div className="text-xs text-muted-foreground uppercase mb-1">Munkanapok</div>
              <div className="text-lg font-bold">{totalDaysWorked} nap</div>
            </div>
            <div className="bg-muted/30 p-3 rounded-md border text-center">
              <div className="text-xs text-muted-foreground uppercase mb-1">Távollét</div>
              <div className="text-lg font-bold">{totalLeaveDays} nap</div>
            </div>
          </div>

          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground w-32">Dátum</th>
                  <th className="h-10 px-4 text-left font-medium text-muted-foreground">Típus</th>
                  <th className="h-10 px-4 text-center font-medium text-muted-foreground">Becsekkolás</th>
                  <th className="h-10 px-4 text-center font-medium text-muted-foreground">Kicsekkolás</th>
                  <th className="h-10 px-4 text-right font-medium text-muted-foreground">Műveletek</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="h-32 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : timesheet.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="h-20 text-center text-muted-foreground">
                      Nincs elérhető adat erre a hónapra.
                    </td>
                  </tr>
                ) : (
                  timesheet.map((entry) => {
                    const isEditable = entry.type === "munka"
                    
                    return (
                      <tr 
                        key={entry.id} 
                        className={`border-b last:border-0 ${typeColors[entry.type]}`}
                      >
                        <td className="p-3 font-medium whitespace-nowrap">
                          {entry.datum.substring(8, 10)}. {["V", "H", "K", "Sze", "Cs", "P", "Szo"][new Date(entry.datum).getDay()]}
                        </td>
                        <td className="p-3">
                          {typeLabels[entry.type]}
                          {entry.note && <span className="text-xs block opacity-70">{entry.note}</span>}
                        </td>
                        <td className="p-3 text-center">
                          {formatTime(entry.becsekkolas_ideje)}
                        </td>
                        <td className="p-3 text-center">
                          {formatTime(entry.kicsekkolas_ideje)}
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
                                      <AlertDialogAction onClick={() => entry.record_id && handleDelete(entry.record_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
