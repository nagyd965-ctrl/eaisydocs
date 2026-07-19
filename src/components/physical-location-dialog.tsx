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
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { setPhysicalLocation } from "@/app/dossiers/borrow-actions"
import { toast } from "sonner"
import { Pencil } from "lucide-react"

interface PhysicalLocationDialogProps {
  iratId: string
  currentPolc?: string
  currentDoboz?: string
}

export function PhysicalLocationDialog({ iratId, currentPolc, currentDoboz }: PhysicalLocationDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [polc, setPolc] = useState(currentPolc || "")
  const [doboz, setDoboz] = useState(currentDoboz || "")

  const handleSave = async () => {
    setIsLoading(true)
    const res = await setPhysicalLocation(iratId, doboz, polc)
    setIsLoading(false)

    if (res.success) {
      toast.success("Fizikai helyzet mentve!")
      setOpen(false)
    } else {
      toast.error(res.error || "Hiba történt")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button 
        size="icon" 
        variant="ghost" 
        className="h-5 w-5 text-muted-foreground hover:text-primary ml-1" 
        onClick={() => setOpen(true)}
      >
        <Pencil className="h-3 w-3" />
      </Button>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Fizikai helyzet rögzítése</DialogTitle>
          <DialogDescription>
            Add meg, hogy az irattáron belül melyik polcon és dobozban található az eredeti papír.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Polc (vagy Szekrény)</Label>
            <Input 
              value={polc}
              onChange={(e) => setPolc(e.target.value)}
              placeholder="Pl. A/3 polc"
            />
          </div>
          <div className="grid gap-2">
            <Label>Doboz (vagy Mappa)</Label>
            <Input 
              value={doboz}
              onChange={(e) => setDoboz(e.target.value)}
              placeholder="Pl. 2026-os bejövő"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Mégse</Button>
          <Button onClick={handleSave} disabled={isLoading}>Mentés</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
