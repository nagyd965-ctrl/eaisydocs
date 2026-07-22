"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, AlertTriangle, Award, Scale } from "lucide-react"
import { addFegyelmi, deleteFegyelmi } from "../actions"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

export function DisciplinaryTab({ 
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
  const [tipus, setTipus] = useState("figyelmeztetes")
  
  const today = new Date().toISOString().split("T")[0]

  const tipusLabels: Record<string, string> = {
    figyelmeztetes: "Figyelmeztetés",
    megrovas: "Megrovás",
    karterites: "Kártérítés",
    kituntetes: "Kitüntetés",
    egyeb: "Egyéb"
  }

  async function handleAdd(formData: FormData) {
    setLoading(true)
    const res = await addFegyelmi(employeeId, formData)
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Esemény sikeresen rögzítve!")
      setOpen(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteFegyelmi(id, employeeId)
    if (res.error) toast.error(res.error)
    else toast.success("Esemény törölve!")
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Scale className="w-5 h-5 text-primary"/> Fegyelmi és Kitüntetések
        </CardTitle>
        {isHrOrAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-2`}>
              <Plus className="w-4 h-4" /> Hozzáadás
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Új esemény rögzítése</DialogTitle>
              </DialogHeader>
              <form action={handleAdd} className="space-y-4 mt-4">
                
                <div className="space-y-2">
                  <Label>Esemény Típusa</Label>
                  <Select name="tipus" value={tipus} onValueChange={setTipus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Válassz típust">{tipusLabels[tipus]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="figyelmeztetes">Figyelmeztetés</SelectItem>
                      <SelectItem value="megrovas">Megrovás</SelectItem>
                      <SelectItem value="karterites">Kártérítés</SelectItem>
                      <SelectItem value="kituntetes">Kitüntetés</SelectItem>
                      <SelectItem value="egyeb">Egyéb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Dátum</Label>
                  <Input name="datum" type="date" max={today} required />
                </div>

                <div className="space-y-2">
                  <Label>Indoklás / Részletek</Label>
                  <Input name="indoklas" required placeholder="Kérjük, részletezd az eseményt..." />
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
            Még nincsenek felrögzítve fegyelmi vagy kitüntetési események.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Típus</TableHead>
                <TableHead>Dátum</TableHead>
                <TableHead>Indoklás</TableHead>
                {isHrOrAdmin && <TableHead className="text-right">Művelet</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.map((item) => {
                const isPositive = item.tipus === "kituntetes"
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      {isPositive ? <Award className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
                    </TableCell>
                    <TableCell className={isPositive ? "font-medium text-green-600" : "font-medium text-amber-600"}>
                      {tipusLabels[item.tipus] || item.tipus}
                    </TableCell>
                    <TableCell>{new Date(item.datum).toLocaleDateString("hu-HU")}</TableCell>
                    <TableCell>{item.indoklas}</TableCell>
                    {isHrOrAdmin && (
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger className={`${buttonVariants({ variant: "ghost", size: "icon" })} text-destructive hover:text-destructive transition-colors`} title="Törlés">
                            <Trash2 className="w-4 h-4" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Biztosan törlöd?</AlertDialogTitle>
                              <AlertDialogDescription>Ezzel véglegesen törlöd az eseményt a dolgozó aktájából.</AlertDialogDescription>
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
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
