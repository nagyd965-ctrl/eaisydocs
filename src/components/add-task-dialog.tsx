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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createTask } from "@/app/tasks/task-actions"
import { toast } from "sonner"
import { Plus } from "lucide-react"

interface AddTaskDialogProps {
  ugyiratId: string
  users: any[]
}

export function AddTaskDialog({ ugyiratId, users }: AddTaskDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [leiras, setLeiras] = useState("")
  const [felelos, setFelelos] = useState("")
  const [hatarido, setHatarido] = useState("")

  const handleSave = async () => {
    if (!leiras || !felelos || !hatarido) {
      toast.error("Minden mezőt ki kell tölteni!")
      return
    }

    setIsLoading(true)
    const res = await createTask(ugyiratId, leiras, new Date(hatarido).toISOString(), felelos)
    setIsLoading(false)

    if (res.success) {
      toast.success("Feladat sikeresen létrehozva!")
      setOpen(false)
      setLeiras("")
      setFelelos("")
      setHatarido("")
    } else {
      toast.error(res.error || "Hiba történt")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" /> Új Feladat
      </Button>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Új Feladat Rögzítése</DialogTitle>
          <DialogDescription>
            Rendelj ki egy új feladatot az ügyirathoz.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Feladat leírása</Label>
            <Input 
              value={leiras}
              onChange={(e) => setLeiras(e.target.value)}
              placeholder="Pl. Hiánypótlás bekérése"
            />
          </div>
          <div className="grid gap-2">
            <Label>Felelős</Label>
            <Select value={felelos} onValueChange={(val) => val && setFelelos(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Válassz felelőst..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.nev}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Határidő</Label>
            <Input 
              type="date"
              value={hatarido}
              onChange={(e) => setHatarido(e.target.value)}
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
