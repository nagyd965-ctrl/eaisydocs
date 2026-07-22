"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2, FileText } from "lucide-react"
import { addStudyContract, deleteStudyContract } from "../actions"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"

export function StudyContractTab({ 
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

  async function handleAdd(formData: FormData) {
    setLoading(true)
    const res = await addStudyContract(employeeId, formData)
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Tanulmányi szerződés sikeresen rögzítve!")
      setOpen(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteStudyContract(id, employeeId)
    if (res.error) toast.error(res.error)
    else toast.success("Tanulmányi szerződés törölve!")
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-primary"/> Tanulmányi Szerződések</CardTitle>
        {isHrOrAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-2`}>
              <Plus className="w-4 h-4" /> Hozzáadás
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Új tanulmányi szerződés rögzítése</DialogTitle>
              </DialogHeader>
              <form action={handleAdd} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Képzés neve</Label>
                  <Input name="kepzes_neve" required placeholder="Pl. Vezetőképző tréning" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Költség (Ft)</Label>
                    <Input name="koltseg" type="number" placeholder="Pl. 250000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Vállalt munkaviszony (hónap)</Label>
                    <Input name="vallalt_munkaviszony_honap" type="number" placeholder="Pl. 24" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Szerződés lejárata (ha van)</Label>
                  <Input name="lejarat_datuma" type="date" />
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox id="visszafizetesi_kotelezettseg" name="visszafizetesi_kotelezettseg" defaultChecked />
                  <Label htmlFor="visszafizetesi_kotelezettseg" className="text-sm font-normal">
                    Van visszafizetési kötelezettség kilépés esetén
                  </Label>
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
            Még nincsenek felrögzítve tanulmányi szerződések.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Képzés Neve</TableHead>
                <TableHead>Költség</TableHead>
                <TableHead>Vállalt Időtartam</TableHead>
                <TableHead>Lejárat</TableHead>
                <TableHead>Visszafizetés</TableHead>
                {isHrOrAdmin && <TableHead className="text-right">Művelet</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.kepzes_neve}</TableCell>
                  <TableCell>{item.koltseg ? `${item.koltseg.toLocaleString('hu-HU')} Ft` : "-"}</TableCell>
                  <TableCell>{item.vallalt_munkaviszony_honap ? `${item.vallalt_munkaviszony_honap} hónap` : "-"}</TableCell>
                  <TableCell>{item.lejarat_datuma || "-"}</TableCell>
                  <TableCell>
                    {item.visszafizetesi_kotelezettseg ? <Badge variant="destructive">Igen</Badge> : <Badge variant="secondary">Nem</Badge>}
                  </TableCell>
                  {isHrOrAdmin && (
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger className={`${buttonVariants({ variant: "ghost", size: "icon" })} text-destructive hover:text-destructive transition-colors`} title="Törlés">
                          <Trash2 className="w-4 h-4" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Biztosan törlöd?</AlertDialogTitle>
                            <AlertDialogDescription>Ezzel véglegesen törlöd a "{item.kepzes_neve}" tanulmányi szerződést.</AlertDialogDescription>
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
