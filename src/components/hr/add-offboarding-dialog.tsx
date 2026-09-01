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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { UserMinus, Loader2 } from "lucide-react"
import { createOffboarding } from "@/app/hr/offboarding/actions"
import { toast } from "sonner"

import { type Employee } from "@/types/hr"

interface AddOffboardingDialogProps {
  employees: Employee[]
}

export function AddOffboardingDialog({ employees }: AddOffboardingDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState("")
  const [date, setDate] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId) return

    setIsLoading(true)
    try {
      const res = await createOffboarding(selectedId, date || "Hamarosan")
      if (res.error) {
        toast.error("Hiba a mentés során", { description: res.error })
      } else {
        toast.success("Kiléptetés sikeresen indítva")
        setOpen(false)
        setSelectedId("")
        setDate("")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <UserMinus className="h-4 w-4" />
        Új kilépő hozzáadása
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Új kilépő felvétele</DialogTitle>
            <DialogDescription>
              Válaszd ki a kilépő dolgozót. A rendszer automatikusan legenerálja az alapértelmezett kiléptetési feladatokat.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="employee">Dolgozó kiválasztása</Label>
              <Select value={selectedId} onValueChange={(val) => setSelectedId(val || "")} required>
                <SelectTrigger id="employee">
                  {selectedId
                    ? <span>{employees.find(e => e.id === selectedId)?.nev || "Ismeretlen dolgozó"}</span>
                    : <span className="text-muted-foreground">Válassz dolgozót...</span>
                  }
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nev || "Ismeretlen dolgozó"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Utolsó munkanap</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Mégse
            </Button>
            <Button type="submit" disabled={isLoading || !selectedId}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hozzáadás
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
