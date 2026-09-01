"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoreHorizontal, Edit, Trash2, FileText } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { updateHrDepartment, deleteHrDepartment } from "@/app/hr/settings/actions"
import { toast } from "sonner"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"

export interface OrgUnitItem {
  id: string
  nev: string
  kod?: string | null
  leiras?: string | null
  [key: string]: unknown
}

interface OrgUnitActionMenuProps {
  unit: OrgUnitItem
}

export function OrgUnitActionMenu({ unit }: OrgUnitActionMenuProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleEditSubmit = async (formData: FormData) => {
    setLoading(true)
    
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
      <div className="flex justify-end gap-2 items-center">
        <Link href={`/hr/orgunit/${unit.id}`}>
          <Button variant="ghost" size="sm" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            Adatlap
          </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "sm", className: "h-8 w-8 p-0" })}>
            <span className="sr-only">Műveletek</span>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)} className="cursor-pointer text-primary font-medium">
              <Edit className="mr-2 h-4 w-4" />
              <span>Szerkesztés</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="cursor-pointer text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Törlés</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Szervezeti Egység Szerkesztése</DialogTitle>
            <DialogDescription>
              Módosítsd a szervezeti egység nevét.
            </DialogDescription>
          </DialogHeader>
          <form action={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nev">Megnevezés <span className="text-destructive">*</span></Label>
                <Input id="nev" name="nev" defaultValue={unit.nev} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Mégse</Button>
              <Button type="submit" disabled={loading} className="bg-[#02b8cc] hover:bg-[#029db0] text-white">Mentés</Button>
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
