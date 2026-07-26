"use client"

import { useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { UserPlus } from "lucide-react"
import { assignEmployeeToOrgUnit } from "@/app/hr/orgunit/[id]/actions"
import { toast } from "sonner"

interface Employee {
  id: string
  nev: string
}

interface AssignEmployeeOrgDialogProps {
  orgUnitId: string
  availableEmployees: Employee[]
}

export function AssignEmployeeOrgDialog({ orgUnitId, availableEmployees }: AssignEmployeeOrgDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("")

  const handleAssign = async () => {
    if (!selectedEmployeeId) {
      toast.error("Kérlek válassz ki egy dolgozót!")
      return
    }

    setLoading(true)
    const result = await assignEmployeeToOrgUnit(orgUnitId, selectedEmployeeId)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Dolgozó sikeresen hozzárendelve a szervezeti egységhez!")
      setOpen(false)
      setSelectedEmployeeId("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ className: "gap-2 bg-[#02b8cc] hover:bg-[#029db0] text-white" })}>
        <UserPlus className="w-4 h-4" />
        Dolgozó Hozzárendelése
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Dolgozó Hozzárendelése</DialogTitle>
          <DialogDescription>
            Válaszd ki azt a dolgozót, akit be szeretnél osztani ebbe a szervezeti egységbe.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Válassz dolgozót</Label>
            <Select value={selectedEmployeeId} onValueChange={(val) => val && setSelectedEmployeeId(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Kattints a választáshoz...">
                  {selectedEmployeeId ? availableEmployees.find(e => e.id === selectedEmployeeId)?.nev : "Kattints a választáshoz..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id} label={emp.nev}>
                    {emp.nev}
                  </SelectItem>
                ))}
                {availableEmployees.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground text-center">Nincs elérhető dolgozó.</div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <button type="button" className={buttonVariants({ variant: "outline" })} onClick={() => setOpen(false)} disabled={loading}>
            Mégse
          </button>
          <button type="button" className={buttonVariants({ className: "bg-[#02b8cc] hover:bg-[#029db0] text-white" })} onClick={handleAssign} disabled={loading || !selectedEmployeeId}>
            {loading ? "Hozzárendelés..." : "Hozzárendelés"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
