"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit, Trash2, FileText } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateHrDepartment, deleteHrDepartment } from "@/app/hr/settings/actions"
import { toast } from "sonner"
import Link from "next/link"

export interface OrgUnitItem {
  id: string
  nev: string
  szulo_id?: string | null
  kod?: string | null
  leiras?: string | null
  [key: string]: unknown
}

interface OrgUnitActionMenuProps {
  unit: OrgUnitItem
  allUnits: OrgUnitItem[]
}

export function OrgUnitActionMenu({ unit, allUnits }: OrgUnitActionMenuProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  // Szülő egység helyi state – Select-hez kell mert controlled
  const [selectedParent, setSelectedParent] = useState<string>(unit.szulo_id || "__none__")

  // Kizárjuk az aktuális egységet és annak leszármazottait a szülő-listából
  // (egyszerű verzió: csak magát zárjuk ki, körkörös referencia elkerüléséhez)
  const parentOptions = allUnits.filter(u => u.id !== unit.id)

  // A SelectValue nem veszi fel automatikusan a SelectItem szöveges tartolmát
  // ha a value már elő van töltve – ezért kézzel számítjuk ki a megjelenítést
  const displayValue =
    selectedParent === "__none__"
      ? "— Nincs (Főszint) —"
      : (parentOptions.find(u => u.id === selectedParent)?.nev ?? selectedParent)

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    // A Select értékét manuálisan adjuk hozzá, mert controlled
    formData.set("szulo_id", selectedParent === "__none__" ? "" : selectedParent)

    const result = await updateHrDepartment(unit.id, formData)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Szervezeti egység sikeresen frissítve!")
      setEditOpen(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    const result = await deleteHrDepartment(unit.id)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Szervezeti egység sikeresen törölve!")
      setDeleteOpen(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Link href={`/hr/orgunit/${unit.id}`}>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-primary hover:text-primary gap-1 px-2.5">
            <FileText className="w-3.5 h-3.5" />
            Adatlap
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
          title="Szerkesztés"
          onClick={() => setEditOpen(true)}
        >
          <Edit className="h-4 w-4" />
          <span className="sr-only">Szerkesztés</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          title="Törlés"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Törlés</span>
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => {
        setEditOpen(open)
        if (open) setSelectedParent(unit.szulo_id || "__none__")
      }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Szervezeti Egység Szerkesztése</DialogTitle>
            <DialogDescription>
              Módosítsd a szervezeti egység nevét és hierarchiai helyét.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-5 py-4">
              {/* Megnevezés */}
              <div className="space-y-2">
                <Label htmlFor="nev">Megnevezés <span className="text-destructive">*</span></Label>
                <Input id="nev" name="nev" defaultValue={unit.nev} required />
              </div>

              {/* Szülő egység */}
              <div className="space-y-2">
                <Label htmlFor="szulo_id">Szülő Egység</Label>
                <Select
                  value={selectedParent}
                  onValueChange={(v) => setSelectedParent(v ?? "__none__")}
                >
                  <SelectTrigger id="szulo_id" className="w-full">
                    <SelectValue placeholder="Nincs (Főszint)">{displayValue}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nincs (Főszint) —</SelectItem>
                    {parentOptions.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nev}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Ha nincs szülő egység, ez az egység főszinten jelenik meg a szervezeti ábrán.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Mégse</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Mentés..." : "Mentés"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Szervezeti Egység Törlése</DialogTitle>
            <DialogDescription>
              Biztosan törölni szeretnéd a(z) <strong>{unit.nev}</strong> szervezeti egységet?
              Ez a művelet nem vonható vissza.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Mégse</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              Igen, Törlés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
