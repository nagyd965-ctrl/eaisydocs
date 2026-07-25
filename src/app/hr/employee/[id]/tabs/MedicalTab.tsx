"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Stethoscope } from "lucide-react"
import { addOrvosiVizsgalat, deleteOrvosiVizsgalat } from "../actions"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"

export function MedicalTab({ 
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
  const [tipus, setTipus] = useState("idoszakos")
  const [eredmeny, setEredmeny] = useState("alkalmas")
  
  const today = new Date().toISOString().split("T")[0]

  const tipusLabels: Record<string, string> = {
    elozetes: "Előzetes",
    idoszakos: "Időszakos",
    soron_kivuli: "Soron Kívüli",
    zaro: "Záró"
  }

  const eredmenyLabels: Record<string, string> = {
    alkalmas: "Alkalmas",
    fetelekkel_alkalmas: "Feltételekkel alkalmas",
    nem_alkalmas: "Nem alkalmas"
  }

  async function handleAdd(formData: FormData) {
    setLoading(true)
    const res = await addOrvosiVizsgalat(employeeId, formData)
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Orvosi vizsgálat rögzítve!")
      setOpen(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteOrvosiVizsgalat(id, employeeId)
    if (res.error) toast.error(res.error)
    else toast.success("Orvosi vizsgálat törölve!")
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary"/> Orvosi Alkalmassági Vizsgálatok
        </CardTitle>
        {isHrOrAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-2`}>
              <Plus className="w-4 h-4" /> Hozzáadás
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Új orvosi vizsgálat rögzítése</DialogTitle>
              </DialogHeader>
              <form action={handleAdd} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vizsgálat típusa</Label>
                    <Select name="tipus" value={tipus} onValueChange={(val) => val && setTipus(val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Válassz típust">{tipusLabels[tipus]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="elozetes">Előzetes</SelectItem>
                        <SelectItem value="idoszakos">Időszakos</SelectItem>
                        <SelectItem value="soron_kivuli">Soron Kívüli</SelectItem>
                        <SelectItem value="zaro">Záró</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Eredmény</Label>
                    <Select name="eredmeny" value={eredmeny} onValueChange={(val) => val && setEredmeny(val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Válassz eredményt">{eredmenyLabels[eredmeny]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alkalmas">Alkalmas</SelectItem>
                        <SelectItem value="fetelekkel_alkalmas">Feltételekkel alkalmas</SelectItem>
                        <SelectItem value="nem_alkalmas">Nem alkalmas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vizsgálat dátuma</Label>
                    <Input name="vizsgalat_datuma" type="date" max={today} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Érvényesség dátuma</Label>
                    <Input name="ervenyesseg_datuma" type="date" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Megjegyzés (Opcionális)</Label>
                  <Input name="megjegyzes" placeholder="Pl. Szemüveg viselése kötelező..." />
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
            Még nincsenek felrögzítve orvosi vizsgálatok.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Típus</TableHead>
                <TableHead>Vizsgálat Dátuma</TableHead>
                <TableHead>Érvényes Eddig</TableHead>
                <TableHead>Eredmény</TableHead>
                <TableHead>Megjegyzés</TableHead>
                {isHrOrAdmin && <TableHead className="text-right">Művelet</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.map((item) => {
                const isExpired = new Date(item.ervenyesseg_datuma) < new Date()
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{tipusLabels[item.tipus] || item.tipus}</TableCell>
                    <TableCell>{new Date(item.vizsgalat_datuma).toLocaleDateString("hu-HU")}</TableCell>
                    <TableCell className={isExpired ? "text-destructive font-medium" : ""}>
                      {new Date(item.ervenyesseg_datuma).toLocaleDateString("hu-HU")}
                      {isExpired && " (Lejárt!)"}
                    </TableCell>
                    <TableCell>
                      {item.eredmeny === "alkalmas" ? <Badge variant="default" className="bg-green-600 hover:bg-green-700">Alkalmas</Badge> : 
                       item.eredmeny === "fetelekkel_alkalmas" ? <Badge variant="secondary">Feltételes</Badge> : 
                       <Badge variant="destructive">Nem alkalmas</Badge>}
                    </TableCell>
                    <TableCell>{item.megjegyzes || "-"}</TableCell>
                    {isHrOrAdmin && (
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger className={`${buttonVariants({ variant: "ghost", size: "icon" })} text-destructive hover:text-destructive transition-colors`} title="Törlés">
                            <Trash2 className="w-4 h-4" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Biztosan törlöd?</AlertDialogTitle>
                              <AlertDialogDescription>Ezzel véglegesen törlöd ezt az orvosi feljegyzést.</AlertDialogDescription>
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
