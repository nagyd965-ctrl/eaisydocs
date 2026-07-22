"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { addKpi } from "@/app/hr/performance/actions"

export function AddKpiDialog({ employees }: { employees: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dolgozoId, setDolgozoId] = useState<string>("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    if (dolgozoId && !formData.has("dolgozoId")) {
      formData.append("dolgozoId", dolgozoId)
    }
    
    try {
      const res = await addKpi(formData)
      if (res?.error) {
        toast.error("Hiba: " + res.error)
      } else {
        toast.success("Célkitűzés sikeresen rögzítve!")
        setOpen(false)
      }
    } catch (error) {
      toast.error("Váratlan hiba történt.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="w-4 h-4" />
        Új KPI Hozzáadása
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Új Célkitűzés (KPI) Rögzítése</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dolgozoId">Dolgozó</Label>
            <select 
              id="dolgozoId"
              name="dolgozoId" 
              value={dolgozoId} 
              onChange={(e) => setDolgozoId(e.target.value)} 
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>Válassz dolgozót...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.felhasznalo_profil?.nev || "Ismeretlen"}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="ertekelesSzovege">Cél megnevezése</Label>
            <Input id="ertekelesSzovege" name="ertekelesSzovege" required placeholder="Pl. Fluktuáció 10% alatt tartása" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ertekeltIdoszak">Értékelési Ciklus</Label>
            <Input id="ertekeltIdoszak" name="ertekeltIdoszak" defaultValue="2026. H2" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pontszam">Kezdeti Teljesülés (%)</Label>
            <Input id="pontszam" name="pontszam" type="number" min="0" max="100" defaultValue="0" required />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={loading}>
              Mégse
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mentés
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
