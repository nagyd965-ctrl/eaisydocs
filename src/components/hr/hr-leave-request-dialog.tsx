"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText } from "lucide-react"
import { hrSubmitLeaveRequest } from "@/app/hr/employee/[id]/actions"
import { toast } from "sonner"

export function HrLeaveRequestDialog({ employeeId }: { employeeId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [leaveType, setLeaveType] = useState<string>("")
  const formRef = useRef<HTMLFormElement>(null)

  const leaveTypeMap: Record<string, string> = {
    "szabadsag": "Rendes szabadság",
    "beteg": "Betegszabadság (Táppénz)",
    "fizetetlen": "Fizetés nélküli szabadság",
    "tanulmanyi": "Tanulmányi szabadság"
  }

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    const result = await hrSubmitLeaveRequest(employeeId, formData)
    setLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Távollét sikeresen rögzítve (Automatikusan jóváhagyva)!")
      setOpen(false)
      formRef.current?.reset()
      setLeaveType("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="w-full" />}>
        <FileText className="w-4 h-4 mr-2" /> Új távollét rögzítése
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Távollét Rögzítése (HR)</DialogTitle>
          <DialogDescription>
             Add meg a távollét típusát és az időtartamot a dolgozó nevében. Ez a távollét **automatikusan jóváhagyott** státuszba kerül.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">Típus</Label>
              <div className="col-span-3 space-y-2">
                <input type="hidden" name="type" value={leaveType} />
                <Select value={leaveType} onValueChange={(val) => val && setLeaveType(val)}>
                  <SelectTrigger>
                    <span>{leaveType ? leaveTypeMap[leaveType] : "Válassz típust..."}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="szabadsag">Rendes szabadság</SelectItem>
                    <SelectItem value="beteg">Betegszabadság (Táppénz)</SelectItem>
                    <SelectItem value="fizetetlen">Fizetés nélküli szabadság</SelectItem>
                    <SelectItem value="tanulmanyi">Tanulmányi szabadság</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">Kezdete</Label>
              <Input id="startDate" name="startDate" type="date" className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right">Vége</Label>
              <Input id="endDate" name="endDate" type="date" className="col-span-3" required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Mégse</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Rögzítés..." : "Távollét Mentése"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
