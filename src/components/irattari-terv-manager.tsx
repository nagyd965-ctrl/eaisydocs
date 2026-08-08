"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { Plus, Pencil, Trash2, Loader2, AlertTriangle, Archive, Clock } from "lucide-react"
import { createIrattariTetel, updateIrattariTetel, deleteIrattariTetel } from "@/app/settings/admin-actions"
import { toast } from "sonner"

interface IrattariTetel {
  id: string
  tetelszam: string
  megnevezes: string
  megorzesi_ido_ev: number
  selejtezheto: boolean
}

interface IrattariTervManagerProps {
  initialTervek: IrattariTetel[]
}

const EMPTY_FORM = {
  tetelszam: "",
  megnevezes: "",
  megorzesi_ido_ev: 5,
  selejtezheto: true,
}

export function IrattariTervManager({ initialTervek }: IrattariTervManagerProps) {
  const [isPending, startTransition] = useTransition()
  const [tervek, setTervek] = useState(initialTervek)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
    setDialogOpen(true)
  }

  const openEdit = (tetel: IrattariTetel) => {
    setEditingId(tetel.id)
    setForm({
      tetelszam: tetel.tetelszam,
      megnevezes: tetel.megnevezes,
      megorzesi_ido_ev: tetel.megorzesi_ido_ev,
      selejtezheto: tetel.selejtezheto,
    })
    setError(null)
    setDialogOpen(true)
  }

  const openDelete = (id: string) => {
    setDeletingId(id)
    setDeleteDialogOpen(true)
  }

  const handleSubmit = () => {
    setError(null)
    const formData = new FormData()
    formData.set("tetelszam", form.tetelszam)
    formData.set("megnevezes", form.megnevezes)
    formData.set("megorzesi_ido_ev", String(form.megorzesi_ido_ev))
    formData.set("selejtezheto", String(form.selejtezheto))

    startTransition(async () => {
      const result = editingId
        ? await updateIrattariTetel(editingId, formData)
        : await createIrattariTetel(formData)

      if (result.error) {
        setError(result.error)
        return
      }

      toast.success(editingId ? "Tétel sikeresen módosítva." : "Tétel sikeresen létrehozva.")
      setDialogOpen(false)

      // Optimistic UI update
      if (editingId) {
        setTervek(prev =>
          prev.map(t =>
            t.id === editingId
              ? { ...t, ...form }
              : t
          ).sort((a, b) => a.tetelszam.localeCompare(b.tetelszam))
        )
      } else {
        // Refetch kellene, de optimistic placeholder
        setTervek(prev =>
          [...prev, { id: crypto.randomUUID(), ...form }]
            .sort((a, b) => a.tetelszam.localeCompare(b.tetelszam))
        )
      }
    })
  }

  const handleDelete = () => {
    if (!deletingId) return
    startTransition(async () => {
      const result = await deleteIrattariTetel(deletingId)
      if (result.error) {
        toast.error(result.error)
        setDeleteDialogOpen(false)
        return
      }
      toast.success("Tétel törölve.")
      setTervek(prev => prev.filter(t => t.id !== deletingId))
      setDeleteDialogOpen(false)
    })
  }

  const deletingTetel = tervek.find(t => t.id === deletingId)

  return (
    <div className="space-y-4">
      {/* Fejléc */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Archive className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {tervek.length} tétel az irattári tervben
          </span>
        </div>
        <Button size="sm" onClick={openCreate} disabled={isPending}>
          <Plus className="h-4 w-4 mr-1.5" />
          Új tétel
        </Button>
      </div>

      {/* Táblázat */}
      {tervek.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-xl">
          <Archive className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Még nincs irattári tétel</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Hozd létre az első tételt a gombbal.</p>
        </div>
      ) : (
        <div className="border border-border/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Tételszám</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Megnevezés</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Megőrzés</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Selejtezés</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {tervek.map((tetel, idx) => (
                <tr
                  key={tetel.id}
                  className={`border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                >
                  <td className="px-4 py-3">
                    <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded font-mono">
                      {tetel.tetelszam}
                    </code>
                  </td>
                  <td className="px-4 py-3 font-medium">{tetel.megnevezes}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs">{tetel.megorzesi_ido_ev} év</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`text-[10px] px-1.5 py-0 h-4 border-0 ${tetel.selejtezheto ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {tetel.selejtezheto ? "Igen" : "Nem"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(tetel)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => openDelete(tetel.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm border-border/50 shadow-none">
          <DialogHeader>
            <DialogTitle>{editingId ? "Tétel szerkesztése" : "Új irattári tétel"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Módosítsd az irattári tétel adatait."
                : "Add meg az új tétel adatait. A tételszámnak egyedinek kell lennie."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tetelszam" className="text-xs">Tételszám *</Label>
                <Input
                  id="tetelszam"
                  value={form.tetelszam}
                  onChange={e => setForm(f => ({ ...f, tetelszam: e.target.value }))}
                  placeholder="pl. 1.1"
                  className="h-9 font-mono text-sm border-border/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="megorzesi_ido" className="text-xs">Megőrzési idő (év) *</Label>
                <Input
                  id="megorzesi_ido"
                  type="number"
                  min={1}
                  max={100}
                  value={form.megorzesi_ido_ev}
                  onChange={e => setForm(f => ({ ...f, megorzesi_ido_ev: parseInt(e.target.value) || 1 }))}
                  className="h-9 border-border/50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="megnevezes" className="text-xs">Megnevezés *</Label>
              <Input
                id="megnevezes"
                value={form.megnevezes}
                onChange={e => setForm(f => ({ ...f, megnevezes: e.target.value }))}
                placeholder="pl. Pénzügyi és számviteli iratok"
                className="h-9 border-border/50"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
              <div>
                <p className="text-sm font-medium">Selejtezés engedélyezett</p>
                <p className="text-xs text-muted-foreground">Lejárat után selejtezési javaslat készül</p>
              </div>
              <Switch
                checked={form.selejtezheto}
                onCheckedChange={v => setForm(f => ({ ...f, selejtezheto: v }))}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-xs p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="border-border/50" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Mégse
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !form.tetelszam || !form.megnevezes}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? "Mentés" : "Létrehozás"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="border-border/50 shadow-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Törlöd ezt a tételt?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deletingTetel?.tetelszam} — {deletingTetel?.megnevezes}</strong>
              <br />
              Ha ügyiratok hivatkoznak rá, a törlés megtagadásra kerül.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleDelete}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Igen, törlöm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
