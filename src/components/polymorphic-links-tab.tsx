"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Link as LinkIcon, Trash2, Plus, Loader2 } from "lucide-react"
import { deletePolymorphicLink, addPolymorphicLink } from "@/app/dossiers/[id]/actions"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
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

export function PolymorphicLinksTab({ 
  links, 
  ugyiratId,
  iratok
}: { 
  links: any[], 
  ugyiratId: string,
  iratok: any[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  const [iratId, setIratId] = useState<string>("")
  const [entitasTipus, setEntitasTipus] = useState<string>("")
  const [entitasForras, setEntitasForras] = useState<string>("")
  const [kapcsolatTipus, setKapcsolatTipus] = useState<string>("")

  const entitasTipusMap: Record<string, string> = {
    partner: "Partner",
    tranzakcio: "Tranzakció",
    folyamat: "Folyamat",
    projekt: "Projekt",
    szerzodes: "Szerződés",
    szamla: "Számla"
  }

  const entitasForrasMap: Record<string, string> = {
    belso: "Belső (Saját)",
    erp: "ERP",
    crm: "CRM"
  }

  const kapcsolatTipusMap: Record<string, string> = {
    targya: "Tárgya",
    melleklete: "Melléklete",
    hivatkozas: "Hivatkozás",
    elozmeny: "Előzmény"
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const res = await deletePolymorphicLink(id, ugyiratId)
    if (res.error) {
      toast.error("Hiba", { description: res.error })
    } else {
      toast.success("Sikeres", { description: "Kapcsolat törölve." })
    }
    setDeletingId(null)
    router.refresh()
  }

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.append("ugyirat_id", ugyiratId)
    formData.append("entitas_tipus", entitasTipus)
    formData.append("entitas_forras", entitasForras)
    formData.append("kapcsolat_tipusa", kapcsolatTipus)
    
    const res = await addPolymorphicLink(formData)
    setLoading(false)
    
    if (res.error) {
      toast.error("Hiba", { description: res.error })
    } else {
      toast.success("Sikeres", { description: "Kapcsolat hozzáadva." })
      setOpen(false)
      // reset form state
      // reset form state
      setIratId("")
      setEntitasTipus("")
      setEntitasForras("")
      setKapcsolatTipus("")
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Külső Rendszerek és Kapcsolatok</h3>
          <p className="text-sm text-muted-foreground">Más szoftverek (ERP, CRM, stb.) objektumainak hivatkozásai.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            <Plus className="mr-2 h-4 w-4" /> Új Kapcsolat
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Új polimorf kapcsolat felvétele</DialogTitle>
              <DialogDescription>
                Kösd össze ezt az ügyiratot vagy dokumentumát egy külső rendszerrel.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Kapcsolódó Irat (Opcionális)</Label>
                <Select name="irat_id" value={iratId} onValueChange={(val) => setIratId(val || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Egész ügyiratra vonatkozik">
                      {iratId ? (() => {
                        const i = iratok.find(i => i.id === iratId);
                        return i ? `${i.erkeztetoszam} - ${i.targy}` : iratId;
                      })() : "Egész ügyiratra vonatkozik"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Egész ügyiratra vonatkozik</SelectItem>
                    {iratok.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.erkeztetoszam} - {i.targy}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Entitás Típusa</Label>
                  <Select value={entitasTipus} onValueChange={(val) => setEntitasTipus(val || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Válassz...">{entitasTipusMap[entitasTipus]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="tranzakcio">Tranzakció</SelectItem>
                      <SelectItem value="folyamat">Folyamat</SelectItem>
                      <SelectItem value="projekt">Projekt</SelectItem>
                      <SelectItem value="szerzodes">Szerződés</SelectItem>
                      <SelectItem value="szamla">Számla</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Forrás Rendszer</Label>
                  <Select value={entitasForras} onValueChange={(val) => setEntitasForras(val || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Válassz...">{entitasForrasMap[entitasForras]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="belso">Belső (Saját)</SelectItem>
                      <SelectItem value="erp">ERP</SelectItem>
                      <SelectItem value="crm">CRM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Azonosító Kód (ID)</Label>
                <Input name="entitas_id" required placeholder="pl. INV-2026-001" />
              </div>

              <div className="space-y-2">
                <Label>Kapcsolat Jellege</Label>
                <Select value={kapcsolatTipus} onValueChange={(val) => setKapcsolatTipus(val || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Válassz...">{kapcsolatTipusMap[kapcsolatTipus]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="targya">Tárgya</SelectItem>
                    <SelectItem value="melleklete">Melléklete</SelectItem>
                    <SelectItem value="hivatkozas">Hivatkozás</SelectItem>
                    <SelectItem value="elozmeny">Előzmény</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="button" variant="outline" className="mr-2" onClick={() => setOpen(false)}>Mégsem</Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Mentés
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Érintett Irat</TableHead>
              <TableHead>Forrás</TableHead>
              <TableHead>Típus</TableHead>
              <TableHead>Azonosító</TableHead>
              <TableHead>Jelleg</TableHead>
              <TableHead className="text-right">Művelet</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links && links.length > 0 ? (
              links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="text-muted-foreground">
                    {link.irat ? (
                      <span className="flex items-center" title={link.irat.targy}>
                        <LinkIcon className="h-3 w-3 mr-1" />
                        {link.irat.erkeztetoszam}
                      </span>
                    ) : (
                      "Egész ügyirat"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase font-mono text-xs">{link.entitas_forras}</Badge>
                  </TableCell>
                  <TableCell className="capitalize">{link.entitas_tipus}</TableCell>
                  <TableCell className="font-semibold text-primary">{link.entitas_id}</TableCell>
                  <TableCell className="capitalize">{link.kapcsolat_tipusa}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger 
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon" }),
                          "text-destructive hover:text-destructive hover:bg-destructive/10"
                        )}
                        disabled={deletingId === link.id}
                      >
                        {deletingId === link.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Kapcsolat törlése</AlertDialogTitle>
                          <AlertDialogDescription>
                            Biztosan törlöd ezt a külső rendszerhez fűzött kapcsolatot? A művelet nem vonható vissza.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Mégsem</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(link.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Törlés</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  Nincs még külső rendszerhez kapcsolva.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
