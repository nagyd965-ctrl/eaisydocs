"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2, Sparkles, BookOpen, User, Calendar, Target, Scale } from "lucide-react"
import { toast } from "sonner"
import { addKpi } from "@/app/hr/performance/actions"
import { type PerformanceKpi, type PerformanceCycle, type KpiCatalogueItem } from "@/types/hr"

export interface AddKpiEmployeeItem {
  id: string
  felhasznalo_profil?: any
  hr_jogviszony?: any
  nev?: string
  [key: string]: any
}


export function AddKpiDialog({ 
  employees, 
  cycles, 
  allKpis,
  catalogue = []
}: { 
  employees: AddKpiEmployeeItem[]
  cycles?: PerformanceCycle[]
  allKpis?: PerformanceKpi[]
  catalogue?: KpiCatalogueItem[]
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dolgozoId, setDolgozoId] = useState<string>("")
  const [ciklusId, setCiklusId] = useState<string>("")
  const [celMegnevezes, setCelMegnevezes] = useState<string>("")
  const [meroszamTipusa, setMeroszamTipusa] = useState<string>("szazalek")
  const [celErtek, setCelErtek] = useState<string>("100")
  const [aktualisErtek, setAktualisErtek] = useState<string>("0")
  const [sulyozas, setSulyozas] = useState<string>("1.0")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [templateDesc, setTemplateDesc] = useState<string | null>(null)

  // Find default open cycle if any
  const defaultCycle = cycles?.find(c => c.statusz === "nyitott" || c.statusz === "aktiv")?.id || cycles?.[0]?.id || ""

  const onOpenChangeWrapper = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      if (!ciklusId && defaultCycle) setCiklusId(defaultCycle)
      if (!dolgozoId && employees.length > 0) setDolgozoId(employees[0].id)
    } else {
      setSelectedTemplateId(null)
      setTemplateDesc(null)
    }
  }

  const handleSelectTemplate = (template: KpiCatalogueItem) => {
    setSelectedTemplateId(template.id)
    setCelMegnevezes(template.megnevezes)
    setMeroszamTipusa(template.meroszam_tipusa || "szazalek")
    setTemplateDesc(template.leiras || null)

    // Intelligens alapértelmezett célérték típus alapján
    switch (template.meroszam_tipusa) {
      case "skala":
        setCelErtek("5")
        setAktualisErtek("1")
        break
      case "osszeg":
        setCelErtek("5000000")
        setAktualisErtek("0")
        break
      case "igen_nem":
        setCelErtek("1")
        setAktualisErtek("0")
        break
      case "szam":
        setCelErtek("10")
        setAktualisErtek("0")
        break
      case "szazalek":
      default:
        setCelErtek("100")
        setAktualisErtek("0")
        break
    }
  }

  const handleMeroszamChange = (type: string) => {
    setMeroszamTipusa(type)
    if (type === "skala" && celErtek === "100") setCelErtek("5")
    else if (type === "igen_nem") setCelErtek("1")
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!dolgozoId) {
      toast.error("Kérlek válassz ki egy dolgozót!")
      return
    }
    if (!celMegnevezes.trim()) {
      toast.error("A cél megnevezése kötelező!")
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.append("dolgozoId", dolgozoId)
    formData.append("ertekelesSzovege", celMegnevezes.trim())
    formData.append("ciklusId", ciklusId || defaultCycle)
    formData.append("meroszamTipusa", meroszamTipusa)
    formData.append("celErtek", celErtek)
    formData.append("aktualisErtek", aktualisErtek)
    formData.append("sulyozas", sulyozas)

    try {
      const res = await addKpi(formData)
      if (res?.error) {
        toast.error("Hiba: " + res.error)
      } else {
        toast.success("Célkitűzés sikeresen rögzítve!")
        setOpen(false)
        setCelMegnevezes("")
        setSelectedTemplateId(null)
      }
    } catch {
      toast.error("Váratlan hiba történt a célkitűzés rögzítésekor.")
    } finally {
      setLoading(false)
    }
  }

  const getUnitSuffix = () => {
    switch (meroszamTipusa) {
      case "szazalek": return "%"
      case "osszeg": return "Ft"
      case "szam": return "db"
      case "skala": return "pont (1–5)"
      case "igen_nem": return "(0 = Nem, 1 = Igen)"
      default: return ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChangeWrapper}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="w-4 h-4" />
        Új KPI Hozzáadása
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Target className="w-5 h-5 text-primary" />
            Új Célkitűzés (KPI) Rögzítése
          </DialogTitle>
        </DialogHeader>

        {/* Vállalati Sablonok Gyorsválasztó */}
        {catalogue.length > 0 && (
          <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-primary">
                <Sparkles className="w-3.5 h-3.5" />
                Vállalati KPI Sablonok (1-kattintásos kitöltés)
              </span>
              {selectedTemplateId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplateId(null)
                    setTemplateDesc(null)
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline"
                >
                  Sablon feloldása
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {catalogue.map((cat) => {
                const isSelected = selectedTemplateId === cat.id
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectTemplate(cat)}
                    className={`inline-flex items-center text-xs px-2.5 py-1 rounded-md border transition-all text-left ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary font-medium shadow-xs"
                        : "bg-background hover:bg-muted/70 text-foreground border-input"
                    }`}
                  >
                    <BookOpen className="w-3 h-3 mr-1.5 opacity-70 shrink-0" />
                    <span>{cat.megnevezes}</span>
                  </button>
                )
              })}
            </div>
            {templateDesc && (
              <p className="text-xs text-muted-foreground italic pt-1 pl-1">
                ℹ️ {templateDesc}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          
          {/* Dolgozó kiválasztása */}
          <div className="space-y-1.5">
            <Label htmlFor="dolgozoId" className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              Érintett Dolgozó
            </Label>
            <div className="relative">
              <select
                id="dolgozoId"
                name="dolgozoId"
                value={dolgozoId}
                onChange={(e) => setDolgozoId(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>Válassz dolgozót...</option>
                {employees.map((emp) => {
                  const profil = Array.isArray(emp.felhasznalo_profil) ? emp.felhasznalo_profil[0] : emp.felhasznalo_profil
                  const nev = profil?.nev || emp.nev || "Ismeretlen"
                  const activeJogviszony = Array.isArray(emp.hr_jogviszony) ? emp.hr_jogviszony[0] : emp.hr_jogviszony
                  const allBeosztas = activeJogviszony?.hr_beosztas
                  const activeBeosztas = Array.isArray(allBeosztas)
                    ? allBeosztas.find((b: any) => b.ervenyes_ig === null) || allBeosztas[0]
                    : allBeosztas
                  const munkakor = activeBeosztas?.hr_munkakor?.megnevezes || ""
                  return (
                    <option key={emp.id} value={emp.id}>
                      {nev} {munkakor ? `(${munkakor})` : ""}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          {/* Cél megnevezése */}
          <div className="space-y-1.5">
            <Label htmlFor="celMegnevezes">Célkitűzés megnevezése</Label>
            <Input
              id="celMegnevezes"
              value={celMegnevezes}
              onChange={(e) => setCelMegnevezes(e.target.value)}
              required
              placeholder="Pl. Éves fluktuáció 10% alatt tartása vagy CSAT index"
              className="font-medium"
            />
          </div>

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
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {cycles?.length === 0 ? (
                <option value="">Nincs rögzített ciklus</option>
              ) : (
                cycles?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.megnevezes} {c.statusz === "nyitott" ? "(Aktív, nyitott)" : `(${c.statusz})`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Mérőszám Típusa és Súlyozás */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="meroszamTipusa">Mérőszám Típusa</Label>
              <select
                id="meroszamTipusa"
                value={meroszamTipusa}
                onChange={(e) => handleMeroszamChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="szazalek">Százalék (%)</option>
                <option value="szam">Darabszám (db)</option>
                <option value="osszeg">Összeg (HUF)</option>
                <option value="skala">Skála (1-5 pont)</option>
                <option value="igen_nem">Igen / Nem (Bináris)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sulyozas" className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-muted-foreground" />
                  Súlyozás (Szorzó)
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums">{sulyozas}x</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="sulyozas"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5.0"
                  value={sulyozas}
                  onChange={(e) => setSulyozas(e.target.value)}
                  required
                  className="tabular-nums"
                />
                <div className="flex gap-1">
                  {["1.0", "1.5", "2.0"].map((w) => (
                    <Button
                      key={w}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSulyozas(w)}
                      className={`h-10 px-2 text-xs tabular-nums ${sulyozas === w ? "border-primary text-primary font-semibold" : ""}`}
                    >
                      {w}x
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Célérték és Kezdeti Állapot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="celErtek" className="flex items-center justify-between">
                <span>Elvárt Célérték</span>
                <span className="text-xs text-muted-foreground">{getUnitSuffix()}</span>
              </Label>
              <Input
                id="celErtek"
                type="number"
                step="any"
                value={celErtek}
                onChange={(e) => setCelErtek(e.target.value)}
                required
                className="tabular-nums font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="aktualisErtek" className="flex items-center justify-between">
                <span>Kezdeti Állapot</span>
                <span className="text-xs text-muted-foreground">{getUnitSuffix()}</span>
              </Label>
              <Input
                id="aktualisErtek"
                type="number"
                step="any"
                value={aktualisErtek}
                onChange={(e) => setAktualisErtek(e.target.value)}
                required
                className="tabular-nums"
              />
            </div>
          </div>

          {/* Gombok */}
          <div className="pt-4 flex justify-end gap-2 border-t mt-4">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={loading}>
              Mégse
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Célkitűzés Mentése
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
