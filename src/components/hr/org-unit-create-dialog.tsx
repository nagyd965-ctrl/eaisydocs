"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { createHrDepartment } from "@/app/hr/settings/actions"

import { ReactElement } from "react"

export function HrOrgUnitCreateDialog({ customTrigger }: { customTrigger?: ReactElement }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(formData: FormData) {
    setLoading(true)
    const result = await createHrDepartment(formData)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Sikeres mentés", {
        description: "Az új HR szervezeti egység létrejött.",
      })
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {customTrigger ? (
        <DialogTrigger render={customTrigger} />
      ) : (
        <DialogTrigger render={<Button size="sm" className="bg-[#02b8cc] hover:bg-[#029db0] text-white" />}>
          <Plus className="w-4 h-4 mr-2" />
          Új Szervezeti Egység
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <form action={onSubmit}>
          <DialogHeader>
            <DialogTitle>Új Szervezeti Egység Létrehozása (HR)</DialogTitle>
            <DialogDescription>
              A létrehozott szervezeti egység csak a HR modulban fog megjelenni.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nev">Megnevezés</Label>
              <Input id="nev" name="nev" placeholder="pl. Értékesítés" required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Mégse</Button>
            <Button type="submit" disabled={loading}>Létrehozás</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
