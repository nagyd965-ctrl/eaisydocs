"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Settings, Plus, Play, Lock, FileEdit, Trash2, Calendar, CheckCircle2 } from "lucide-react"
import { addCycle, updateCycleStatus, deleteCycle } from "@/app/hr/performance/actions"
import { Badge } from "@/components/ui/badge"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type PerformanceCycle } from "@/types/hr"

export function ManageCyclesDialog({ cycles }: { cycles: PerformanceCycle[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showNewCycleForm, setShowNewCycleForm] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    try {
      const res = await addCycle(formData)
      if (res?.error) {
        toast.error("Hiba: " + res.error)
      } else {
        toast.success("Ciklus sikeresen létrehozva!")
        ;(e.target as HTMLFormElement).reset()
        setShowNewCycleForm(false)
      }
    } catch {
      toast.error("Váratlan hiba történt.")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (id: string, newStatus: string, label: string) => {
    try {
      const res = await updateCycleStatus(id, newStatus)
      if (res?.error) {
        toast.error("Hiba: " + res.error)
      } else {
        toast.success(`Ciklus állapota módosítva: ${label}`)
      }
    } catch {
      toast.error("Váratlan hiba történt.")
    }
  }

  const handleDeleteCycle = async (id: string) => {
    try {
      const res = await deleteCycle(id)
      if (res?.error) {
        toast.error("Hiba: " + res.error)
      } else {
        toast.success("Ciklus törölve!")
      }
    } catch {
      toast.error("Váratlan hiba történt.")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "tervezes":
        return <Badge variant="outline" className="bg-muted/50 text-muted-foreground">Tervezés alatt</Badge>
      case "nyitott":
      case "aktiv":
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30 font-medium">Aktív (Nyitott)</Badge>
      case "ertekeles":
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 font-medium">Értékelési szakasz</Badge>
      case "lezart":
      case "lezarva":
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Lezárt</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="gap-2" />}>
        <Settings className="w-4 h-4" />
        Ciklusok kezelése
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
              <Calendar className="w-5 h-5 text-primary" />
              Értékelési Ciklusok Menedzsmentje
            </DialogTitle>
            <Button
              size="sm"
              variant={showNewCycleForm ? "secondary" : "default"}
              onClick={() => setShowNewCycleForm(!showNewCycleForm)}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {showNewCycleForm ? "Űrlap bezárása" : "Új ciklus indítása"}
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 mt-2">
          
          {/* Új ciklus űrlap */}
          {showNewCycleForm && (
            <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-muted/20 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" /> Új Értékelési Ciklus Rögzítése
                </h3>
                <span className="text-xs text-muted-foreground">Létrehozáskor Tervezés állapotba kerül</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="megnevezes">Ciklus Megnevezése</Label>
                  <Input id="megnevezes" name="megnevezes" placeholder="Pl. 2026. H2 Éves értékelés" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="kezdoDatum">Kezdő dátum</Label>
                  <Input id="kezdoDatum" name="kezdoDatum" type="date" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="befejezoDatum">Befejező dátum</Label>
                  <Input id="befejezoDatum" name="befejezoDatum" type="date" required />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNewCycleForm(false)}>
                  Mégse
                </Button>
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? "Létrehozás..." : "Ciklus Mentése"}
                </Button>
              </div>
            </form>
          )}

          {/* Ciklusok táblázata */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Ciklus Megnevezése</TableHead>
                  <TableHead>Értékelési Időszak</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead className="text-right">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nincsenek rögzített értékelési ciklusok a rendszerben.
                    </TableCell>
                  </TableRow>
                ) : (
                  cycles?.map((cycle) => {
                    const isNyitott = cycle.statusz === "nyitott" || cycle.statusz === "aktiv"
                    return (
                      <TableRow key={cycle.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{cycle.megnevezes}</span>
                            {isNyitott && (
                              <Badge className="bg-primary/10 text-primary border-0 text-[10px] uppercase font-medium">
                                Aktív
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm tabular-nums">
                          {cycle.kezdo_datum} – {cycle.befejezo_datum}
                        </TableCell>
                        <TableCell>{getStatusBadge(cycle.statusz)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {cycle.statusz === "tervezes" && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-xs gap-1.5 border-success/40 text-success hover:bg-success/10"
                                onClick={() => handleStatusUpdate(cycle.id, "nyitott", "Nyitott")}
                              >
                                <Play className="w-3.5 h-3.5" /> Megnyitás
                              </Button>
                            )}
                            {isNyitott && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8 text-xs gap-1.5 border-warning/40 text-warning hover:bg-warning/10"
                                onClick={() => handleStatusUpdate(cycle.id, "ertekeles", "Értékelés")}
                              >
                                <FileEdit className="w-3.5 h-3.5" /> Értékelés Indítása
                              </Button>
                            )}
                            {cycle.statusz === "ertekeles" && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                                onClick={() => handleStatusUpdate(cycle.id, "lezart", "Lezárt")}
                              >
                                <Lock className="w-3.5 h-3.5" /> Ciklus Lezárása
                              </Button>
                            )}
                            {cycle.statusz === "lezart" && (
                              <Badge variant="outline" className="text-xs text-muted-foreground border-muted">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Véglegesítve
                              </Badge>
                            )}

                            {/* Törlés modál */}
                            <AlertDialog>
                              <AlertDialogTrigger render={
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  title="Törlés" 
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                />
                              }>
                                <Trash2 className="w-4 h-4" />
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Biztosan törlöd ezt az értékelési ciklust?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    A ciklus törlése csak akkor lehetséges, ha még nem tartoznak hozzá rögzített KPI-ok vagy értékelések.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Mégse</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteCycle(cycle.id)} 
                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                  >
                                    Törlés
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
