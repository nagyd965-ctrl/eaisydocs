"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, GraduationCap } from "lucide-react"
import { addQualification, deleteQualification } from "../actions"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export function QualificationTab({ 
  employeeId, 
  isHrOrAdmin, 
  initialData 
}: { 
  employeeId: string, 
  isHrOrAdmin: boolean,
  initialData: any[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [kepzesTipus, setKepzesTipus] = useState("iskola")
  const today = new Date().toISOString().split("T")[0]

  const kepzesLabels: Record<string, string> = {
    iskola: "Iskolai végzettség",
    szakkepzettseg: "Szakképzettség",
    tanfolyam: "Tanfolyam",
    nyelvvizsga: "Nyelvvizsga",
    egyeb: "Egyéb"
  }

  async function handleAdd(formData: FormData) {
    setLoading(true)
    const res = await addQualification(employeeId, formData)
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Képzettség sikeresen rögzítve!")
      setOpen(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteQualification(id, employeeId)
    if (res.error) toast.error(res.error)
    else toast.success("Képzettség törölve!")
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary"/> Képzettségek és Nyelvvizsgák</CardTitle>
        {isHrOrAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-2`}>
              <Plus className="w-4 h-4" /> Hozzáadás
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Új képzettség / nyelvvizsga rögzítése</DialogTitle>
              </DialogHeader>
              <form action={handleAdd} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Típus</Label>
                    <Select name="tipus" value={kepzesTipus} onValueChange={setKepzesTipus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Válassz típust">{kepzesLabels[kepzesTipus]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="iskola">Iskolai végzettség</SelectItem>
                        <SelectItem value="szakkepzettseg">Szakképzettség</SelectItem>
                        <SelectItem value="tanfolyam">Tanfolyam</SelectItem>
                        <SelectItem value="nyelvvizsga">Nyelvvizsga</SelectItem>
                        <SelectItem value="egyeb">Egyéb</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fokozat (opcionális)</Label>
                    <Input name="fokozat" placeholder="Pl. BSc, B2 komplex" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Megnevezés</Label>
                  <Input name="megnevezes" required placeholder="Pl. Mérnökinformatikus" />
                </div>
                <div className="space-y-2">
                  <Label>Intézmény neve</Label>
                  <Input name="intezmeny" placeholder="Pl. Budapesti Műszaki Egyetem" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bizonyítvány / Oklevél száma</Label>
                    <Input name="bizonyitvany_szam" placeholder="Pl. 12345/2015" />
                  </div>
                  <div className="space-y-2">
                    <Label>Megszerzés dátuma</Label>
                    <Input name="megszerzes_datuma" type="date" max={today} />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Mégse</Button>
                  <Button type="submit" disabled={loading}>{loading ? "Mentés..." : "Mentés"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {initialData.length === 0 ? (
          <div className="text-center p-8 border rounded-lg border-dashed text-muted-foreground">
            Még nincsenek felrögzítve képzettségek.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Típus</TableHead>
                <TableHead>Megnevezés</TableHead>
                <TableHead>Intézmény</TableHead>
                <TableHead>Megszerzés Éve</TableHead>
                {isHrOrAdmin && <TableHead className="text-right">Művelet</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="capitalize font-medium text-muted-foreground">{item.tipus}</TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{item.megnevezes}</div>
                    {item.fokozat && <div className="text-xs text-muted-foreground">{item.fokozat}</div>}
                  </TableCell>
                  <TableCell>{item.intezmeny || "-"}</TableCell>
                  <TableCell>{item.megszerzes_datuma ? new Date(item.megszerzes_datuma).getFullYear() : "-"}</TableCell>
                  {isHrOrAdmin && (
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger className={`${buttonVariants({ variant: "ghost", size: "icon" })} text-destructive hover:text-destructive transition-colors`} title="Törlés">
                          <Trash2 className="w-4 h-4" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Biztosan törlöd?</AlertDialogTitle>
                            <AlertDialogDescription>Ezzel véglegesen törlöd a "{item.megnevezes}" képzettséget.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Mégse</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Törlés</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
