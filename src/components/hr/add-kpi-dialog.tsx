"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { addKpi } from "@/app/hr/performance/actions"

import { type PerformanceKpi, type PerformanceCycle } from "@/types/hr"

export interface AddKpiEmployeeItem {
  id: string
  felhasznalo_profil?: any
  nev?: string
  [key: string]: any
}

export function AddKpiDialog({ 
  employees, 
  cycles, 
  allKpis 
}: { 
  employees: AddKpiEmployeeItem[]
  cycles?: PerformanceCycle[]
  allKpis?: PerformanceKpi[] 
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dolgozoId, setDolgozoId] = useState<string>("")
  const [ciklusId, setCiklusId] = useState<string>("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    if (dolgozoId && !formData.has("dolgozoId")) {
      formData.append("dolgozoId", dolgozoId)
    }
    if (ciklusId && !formData.has("ciklusId")) {
      formData.append("ciklusId", ciklusId)
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

  // Find default open cycle if any
  const defaultCycle = cycles?.find(c => c.statusz === "nyitott")?.id || "";
  
  // Set default when opening
  const onOpenChangeWrapper = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen && !ciklusId && defaultCycle) {
      setCiklusId(defaultCycle)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChangeWrapper}>
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
            <Label htmlFor="ciklusId">Értékelési Ciklus</Label>
            <select 
              id="ciklusId"
              name="ciklusId" 
              value={ciklusId} 
              onChange={(e) => setCiklusId(e.target.value)} 
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>Válassz ciklust...</option>
              {cycles?.map(c => (
                <option key={c.id} value={c.id}>{c.megnevezes} ({c.statusz})</option>
              ))}
            </select>
          </div>



          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meroszamTipusa">Mérőszám Típusa</Label>
              <select 
                id="meroszamTipusa"
                name="meroszamTipusa" 
                defaultValue="szazalek"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="szazalek">Százalék (%)</option>
                <option value="szam">Darabszám</option>
                <option value="osszeg">Összeg (HUF)</option>
                <option value="igen_nem">Igen/Nem</option>
                <option value="skala">Skála (1-5)</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sulyozas">Súlyozás</Label>
              <Input id="sulyozas" name="sulyozas" type="number" step="0.1" min="0" max="10" defaultValue="1.0" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="celErtek">Célérték</Label>
              <Input id="celErtek" name="celErtek" type="number" step="0.01" min="0" defaultValue="100" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aktualisErtek">Kezdeti Állapot</Label>
              <Input id="aktualisErtek" name="aktualisErtek" type="number" step="0.01" min="0" defaultValue="0" required />
            </div>
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
