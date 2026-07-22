"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { addWorkplace, deleteWorkplace } from "../actions"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export function WorkplaceTab({ 
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
  const [jogviszony, setJogviszony] = useState("munkaviszony")
  const today = new Date().toISOString().split("T")[0]

  const jogviszonyLabels: Record<string, string> = {
    munkaviszony: "Munkaviszony",
    megbizasi: "Megbízási jogviszony",
    vallalkozoi: "Vállalkozói jogviszony"
  }

  async function handleAdd(formData: FormData) {
    setLoading(true)
    const res = await addWorkplace(employeeId, formData)
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Munkahely sikeresen rögzítve!")
      setOpen(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteWorkplace(id, employeeId)
    if (res.error) toast.error(res.error)
    else toast.success("Munkahely törölve!")
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Előző munkahelyek</CardTitle>
        {isHrOrAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-2`}>
              <Plus className="w-4 h-4" /> Hozzáadás
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Új előző munkahely rögzítése</DialogTitle>
              </DialogHeader>
              <form action={handleAdd} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Munkáltató neve</Label>
                  <Input name="munkaltato_neve" required placeholder="Pl. KKV Zrt." />
                </div>
                <div className="space-y-2">
                  <Label>Pozíció</Label>
                  <Input name="pozicio" required placeholder="Pl. Értékesítő" />
                </div>
                <div className="space-y-2">
                  <Label>Jogviszony típusa</Label>
                  <Select name="jogviszony_tipusa" value={jogviszony} onValueChange={setJogviszony}>
                    <SelectTrigger>
                      {/* Bypassing SelectValue's internal buggy logic by passing our own text */}
                      <SelectValue placeholder="Válassz típust">{jogviszonyLabels[jogviszony]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="munkaviszony">Munkaviszony</SelectItem>
                      <SelectItem value="megbizasi">Megbízási jogviszony</SelectItem>
                      <SelectItem value="vallalkozoi">Vállalkozói jogviszony</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kezdet dátuma</Label>
                    <Input name="kezdet_datuma" type="date" max={today} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Vég dátuma</Label>
                    <Input name="veg_datuma" type="date" max={today} required />
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
            Még nincsenek felrögzítve előző munkahelyek.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Munkáltató</TableHead>
                <TableHead>Pozíció</TableHead>
                <TableHead>Időszak</TableHead>
                <TableHead>Típus</TableHead>
                {isHrOrAdmin && <TableHead className="text-right">Művelet</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.munkaltato_neve}</TableCell>
                  <TableCell>{item.pozicio}</TableCell>
                  <TableCell>{item.kezdet_datuma} - {item.veg_datuma}</TableCell>
                  <TableCell className="capitalize">{item.jogviszony_tipusa}</TableCell>
                  {isHrOrAdmin && (
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger className={`${buttonVariants({ variant: "ghost", size: "icon" })} text-destructive hover:text-destructive transition-colors`} title="Törlés">
                          <Trash2 className="w-4 h-4" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Biztosan törlöd?</AlertDialogTitle>
                            <AlertDialogDescription>Ezzel véglegesen törlöd az előző munkahelyet: {item.munkaltato_neve}.</AlertDialogDescription>
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
