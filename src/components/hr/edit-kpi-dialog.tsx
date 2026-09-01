"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { editKpi } from "@/app/hr/performance/actions"

import { type PerformanceKpi, type PerformanceCycle } from "@/types/hr"

export function EditKpiDialog({ 
  kpi, 
  cycles, 
  allKpis, 
  open, 
  setOpen 
}: { 
  kpi: PerformanceKpi
  cycles?: PerformanceCycle[]
  allKpis?: PerformanceKpi[]
  open: boolean
  setOpen: (open: boolean) => void 
}) {
  const [loading, setLoading] = useState(false)
  const [ciklusId, setCiklusId] = useState<string>(kpi.ciklus_id || "")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    if (ciklusId && !formData.has("ciklusId")) {
      formData.append("ciklusId", ciklusId)
    }
    
    try {
      const res = await editKpi(kpi.id, formData)
      if (res?.error) {
        toast.error("Hiba: " + res.error)
      } else {
        toast.success("Célkitűzés sikeresen frissítve!")
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Célkitűzés (KPI) Szerkesztése</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ertekelesSzovege">Cél megnevezése</Label>
            <Input id="ertekelesSzovege" name="ertekelesSzovege" required defaultValue={String(kpi.celkituzes || kpi.megnevezes || "")} placeholder="Pl. Fluktuáció 10% alatt tartása" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ciklusId">Értékelési Ciklus</Label>
            <select 
              id="ciklusId"
              name="ciklusId" 
              value={ciklusId} 
              onChange={(e) => setCiklusId(e.target.value)} 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Nincs ciklushoz kötve</option>
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
                defaultValue={String(kpi.meroszam_tipusa || kpi.mertekegyseg || "szazalek")}
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
              <Input id="sulyozas" name="sulyozas" type="number" step="0.1" min="0" max="10" defaultValue={Number(kpi.sulyozas ?? kpi.suly ?? 1)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="celErtek">Célérték</Label>
              <Input id="celErtek" name="celErtek" type="number" step="0.01" min="0" defaultValue={Number(kpi.cel_ertek ?? 100)} required />
            </div>
            
            {/* Az aktuális értéket a slider-en/űrlapon lehet frissíteni, de ide is be lehetne tenni */}
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
