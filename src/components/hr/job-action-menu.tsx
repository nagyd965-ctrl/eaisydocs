"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreHorizontal, Edit, Trash2, FileText } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { updateMunkakor, deleteMunkakor } from "@/app/hr/settings/actions"
import { toast } from "sonner"
import { buttonVariants } from "@/components/ui/button"

interface JobActionMenuProps {
  job: any
}

export function JobActionMenu({ job }: JobActionMenuProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [besorolas, setBesorolas] = useState(job.besorolasi_szint || "")

  const handleEditSubmit = async (formData: FormData) => {
    setLoading(true)
    formData.set("besorolasi_szint", besorolas)
    
    const result = await updateMunkakor(job.id, formData)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Munkakör sikeresen frissítve!")
      setEditOpen(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    const result = await deleteMunkakor(job.id)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Munkakör sikeresen törölve!")
      setDeleteOpen(false)
    }
  }

  return (
    <>
      <div className="flex justify-end gap-2 items-center">
        <Button variant="ghost" size="sm" className="text-xs">
          <FileText className="w-3 h-3 mr-1" />
          Leírás
        </Button>
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
            <DialogTitle>Munkakör Szerkesztése</DialogTitle>
            <DialogDescription>
              Módosítsd a munkakör alapadatsait.
            </DialogDescription>
          </DialogHeader>
          <form action={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="megnevezes">Munkakör Megnevezése <span className="text-destructive">*</span></Label>
                <Input id="megnevezes" name="megnevezes" defaultValue={job.megnevezes} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="feor_kod">FEOR Kód</Label>
                  <Input id="feor_kod" name="feor_kod" defaultValue={job.feor_kod || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="besorolas">Besorolási Szint</Label>
                  <Select value={besorolas} onValueChange={(val) => val && setBesorolas(val)}>
                    <SelectTrigger id="besorolas">
                      <SelectValue placeholder="Válassz..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Junior">Junior</SelectItem>
                      <SelectItem value="Medior">Medior</SelectItem>
                      <SelectItem value="Senior">Senior</SelectItem>
                      <SelectItem value="Vezető">Vezető (Manager)</SelectItem>
                      <SelectItem value="Igazgató">Igazgató (Director)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="kockazat_tipusa">Kockázat Típusa (Munkavédelem)</Label>
                <Input id="kockazat_tipusa" name="kockazat_tipusa" defaultValue={job.kockazat_tipusa || ""} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={loading}>
                Mégse
              </Button>
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
            <DialogTitle className="text-destructive">Munkakör Törlése</DialogTitle>
            <DialogDescription>
              Biztosan törölni szeretnéd a(z) <strong>{job.megnevezes}</strong> munkakört? Ez a művelet nem vonható vissza. Ha már vannak dolgozók hozzárendelve, a rendszer nem engedi törölni.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={loading}>
              Mégse
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Törlés..." : "Igen, törlöm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
