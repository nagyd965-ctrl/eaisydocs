"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Settings, Plus, Play, Square, FileEdit, CheckCircle2, Trash2 } from "lucide-react"
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
      }
    } catch (error) {
      toast.error("Váratlan hiba történt.")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const res = await updateCycleStatus(id, newStatus)
      if (res?.error) {
        toast.error("Hiba: " + res.error)
      } else {
        toast.success("Státusz frissítve!")
      }
    } catch (error) {
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
    } catch (error) {
      toast.error("Váratlan hiba történt.")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "tervezes": return <Badge variant="outline" className="bg-slate-100 text-slate-700">Tervezés</Badge>
      case "nyitott": return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Nyitott</Badge>
      case "ertekeles": return <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">Értékelés</Badge>
      case "lezart": return <Badge variant="outline" className="bg-muted text-muted-foreground">Lezárt</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={<Button variant="outline" className="gap-2" />}
      >
        <Settings className="w-4 h-4" />
        Ciklusok kezelése
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] md:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Értékelési Ciklusok Menedzsmentje</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          
          <form onSubmit={handleSubmit} className="p-4 border rounded-md bg-muted/20 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Új ciklus indítása
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="megnevezes">Megnevezés</Label>
                <Input id="megnevezes" name="megnevezes" placeholder="Pl. 2026. H2 Éves értékelés" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kezdoDatum">Kezdő dátum</Label>
                <Input id="kezdoDatum" name="kezdoDatum" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="befejezoDatum">Befejező dátum</Label>
                <Input id="befejezoDatum" name="befejezoDatum" type="date" required />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>Létrehozás</Button>
            </div>
          </form>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Megnevezés</TableHead>
                  <TableHead>Időszak</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead className="text-right">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      Nincsenek rögzített ciklusok.
                    </TableCell>
                  </TableRow>
                ) : (
                  cycles?.map((cycle) => (
                    <TableRow key={cycle.id}>
                      <TableCell className="font-medium">{cycle.megnevezes}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {cycle.kezdo_datum} - {cycle.befejezo_datum}
                      </TableCell>
                      <TableCell>{getStatusBadge(cycle.statusz)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {cycle.statusz === "tervezes" && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              title="Megnyitás"
                              onClick={() => handleStatusUpdate(cycle.id, "nyitott")}
                            >
                              <Play className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          {cycle.statusz === "nyitott" && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              title="Értékelés (Zárás közeleg)" 
                              onClick={() => handleStatusUpdate(cycle.id, "ertekeles")}
                            >
                              <FileEdit className="w-4 h-4 text-orange-600" />
                            </Button>
                          )}
                          {(cycle.statusz === "nyitott" || cycle.statusz === "ertekeles") && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              title="Lezárás"
                              onClick={() => handleStatusUpdate(cycle.id, "lezart")}
                            >
                              <Square className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                          {cycle.statusz === "lezart" && (
                            <Button size="sm" variant="ghost" disabled>
                              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger 
                              render={
                                <Button size="sm" variant="outline" title="Törlés" className="text-destructive hover:bg-destructive hover:text-white" />
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Biztosan törlöd a ciklust?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Ezt a műveletet nem lehet visszavonni. Ha a ciklushoz már tartoznak rögzített célkitűzések, a törlés nem fog sikerülni.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Mégse</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteCycle(cycle.id)} className="bg-destructive hover:bg-destructive/90">
                                  Törlés
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
