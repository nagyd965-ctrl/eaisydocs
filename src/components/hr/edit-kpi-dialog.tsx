"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Loader2, 
  Target, 
  Hash, 
  Coins, 
  Percent, 
  Sparkles,
  Calendar,
  Scale
} from "lucide-react"
import { toast } from "sonner"
import { editKpi } from "@/app/hr/performance/actions"
import { cn } from "@/lib/utils"
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

  const isInitiallyMetric = !!(
    kpi.meroszam_tipusa && 
    ["szam", "osszeg", "szazalek", "skala"].includes(kpi.meroszam_tipusa)
  )

  const [kpiType, setKpiType] = useState<"merfoldko" | "metrika">(
    isInitiallyMetric ? "metrika" : "merfoldko"
  )
  const [meroszamTipusa, setMeroszamTipusa] = useState<"szam" | "osszeg" | "szazalek" | "skala">(
    (isInitiallyMetric ? kpi.meroszam_tipusa : "szam") as any
  )
  const [celErtek, setCelErtek] = useState<string>(
    String(kpi.cel_ertek ?? (meroszamTipusa === "szazalek" ? 100 : 10))
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const isMetric = kpiType === "metrika"
    const parsedTarget = isMetric ? parseFloat(celErtek) : 1
    if (isMetric && (isNaN(parsedTarget) || parsedTarget <= 0)) {
      toast.error("Kérlek adj meg egy érvényes, pozitív célértéket!")
      return
    }

    setLoading(true)

    const formData = new FormData(e.currentTarget)
    if (ciklusId && !formData.has("ciklusId")) {
      formData.append("ciklusId", ciklusId)
    }

    formData.set("meroszamTipusa", isMetric ? meroszamTipusa : "igen_nem")
    formData.set("celErtek", isMetric ? String(parsedTarget) : "1")
    
    try {
      const res = await editKpi(kpi.id, formData)
      if (res?.error) {
        toast.error("Hiba: " + res.error)
      } else {
        toast.success("Célkitűzés sikeresen frissítve!")
        setOpen(false)
      }
    } catch {
      toast.error("Váratlan hiba történt.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Target className="w-5 h-5 text-primary" />
            Célkitűzés (KPI) Szerkesztése
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Cél megnevezése */}
          <div className="space-y-1.5">
            <Label htmlFor="ertekelesSzovege">Cél megnevezése</Label>
            <Input 
              id="ertekelesSzovege" 
              name="ertekelesSzovege" 
              required 
              defaultValue={String(kpi.celkituzes || kpi.megnevezes || "")} 
              placeholder="Pl. Fluktuáció 10% alatt tartása vagy Új ügyfelek száma" 
              className="font-medium"
            />
          </div>

          {/* Célkitűzés Típusa (Segmented Control) */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Célkitűzés Jellege
            </Label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setKpiType("merfoldko")}
                className={cn(
                  "py-2 px-3 rounded-md text-xs transition-all flex items-center justify-center cursor-pointer",
                  kpiType === "merfoldko"
                    ? "bg-background text-foreground shadow-2xs font-semibold border border-border/80"
                    : "text-muted-foreground hover:text-foreground font-medium"
                )}
              >
                Mérföldkő
              </button>
              <button
                type="button"
                onClick={() => setKpiType("metrika")}
                className={cn(
                  "py-2 px-3 rounded-md text-xs transition-all flex items-center justify-center cursor-pointer",
                  kpiType === "metrika"
                    ? "bg-background text-foreground shadow-2xs font-semibold border border-border/80"
                    : "text-muted-foreground hover:text-foreground font-medium"
                )}
              >
                Számszerű cél
              </button>
            </div>
          </div>

          {/* Számszerű Célkitűzés Paraméterei */}
          {kpiType === "metrika" && (
            <div className="p-3.5 rounded-xl border bg-muted/15 space-y-3">
              {/* Mértékegység kiválasztása */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Mértékegység típusa
                </Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: "szam", label: "Darab", suffix: "db", icon: Hash },
                    { id: "osszeg", label: "Összeg", suffix: "Ft", icon: Coins },
                    { id: "szazalek", label: "Arány", suffix: "%", icon: Percent },
                    { id: "skala", label: "Skála", suffix: "1-10", icon: Sparkles },
                  ].map((u) => {
                    const Icon = u.icon
                    const isSel = meroszamTipusa === u.id
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setMeroszamTipusa(u.id as any)
                          if (u.id === "szazalek" && (!celErtek || celErtek === "10")) setCelErtek("100")
                          if (u.id === "skala" && (!celErtek || Number(celErtek) > 10)) setCelErtek("9")
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center py-2 px-1.5 rounded-md border text-center transition-all cursor-pointer",
                          isSel
                            ? "border-primary bg-primary/10 text-primary font-semibold shadow-2xs"
                            : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 mb-1" />
                        <span className="text-xs">{u.label}</span>
                        <span className="text-[10px] text-muted-foreground">{u.suffix}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Célérték bevitele */}
              <div className="space-y-1.5">
                <Label htmlFor="celErtek" className="text-xs font-semibold text-foreground">
                  Kitűzött célérték
                </Label>
                <div className="relative">
                  <Input
                    id="celErtek"
                    type="number"
                    step={meroszamTipusa === "skala" ? "1" : "any"}
                    min={meroszamTipusa === "szazalek" ? "1" : "1"}
                    max={meroszamTipusa === "szazalek" ? "100" : meroszamTipusa === "skala" ? "10" : undefined}
                    value={celErtek}
                    onChange={(e) => setCelErtek(e.target.value)}
                    required={kpiType === "metrika"}
                    placeholder={
                      meroszamTipusa === "szam"
                        ? "pl. 15"
                        : meroszamTipusa === "osszeg"
                        ? "pl. 5000000"
                        : meroszamTipusa === "szazalek"
                        ? "pl. 95"
                        : "pl. 9"
                    }
                    className="pr-16 text-sm tabular-nums font-semibold bg-background"
                  />
                  <div className="absolute right-3 top-2.5 text-xs font-semibold text-muted-foreground pointer-events-none">
                    {meroszamTipusa === "szam" && "db"}
                    {meroszamTipusa === "osszeg" && "Ft"}
                    {meroszamTipusa === "szazalek" && "%"}
                    {meroszamTipusa === "skala" && "/ 10 pont"}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {meroszamTipusa === "szam" && "A teljesítendő darabszám (pl. új ügyfelek, lezárt feladatok száma)."}
                  {meroszamTipusa === "osszeg" && "A kitűzött forint összeg (pl. 25 000 000 Ft)."}
                  {meroszamTipusa === "szazalek" && "Elvárt százalékos arány (1-100%)."}
                  {meroszamTipusa === "skala" && "1-től 10-ig terjedő értékelő skálán kitűzött célérték."}
                </p>
              </div>
            </div>
          )}

          {/* Értékelési Ciklus */}
          <div className="space-y-1.5">
            <Label htmlFor="ciklusId" className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              Értékelési Ciklus
            </Label>
            <select 
              id="ciklusId"
              name="ciklusId" 
              value={ciklusId} 
              onChange={(e) => setCiklusId(e.target.value)} 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <option value="">Nincs ciklushoz kötve</option>
              {cycles?.map(c => (
                <option key={c.id} value={c.id}>{c.megnevezes} ({c.statusz})</option>
              ))}
            </select>
          </div>

          {/* Súlyozás */}
          <div className="space-y-1.5">
            <Label htmlFor="sulyozas" className="flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-muted-foreground" />
              Célkitűzés Súlyozása (Szorzó)
            </Label>
            <Input 
              id="sulyozas" 
              name="sulyozas" 
              type="number" 
              step="0.1" 
              min="0.1" 
              max="5" 
              defaultValue={Number(kpi.sulyozas ?? 1)} 
              required 
              className="tabular-nums" 
            />
          </div>

          {/* Gombok */}
          <div className="pt-4 flex justify-end gap-2 border-t mt-4">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={loading}>
              Mégse
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Mentés
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
