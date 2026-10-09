"use client"

import { useState, useTransition } from "react"
import { Plus, Edit2, Trash2, Clock, Check, Coffee } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { ShiftTemplate } from "@/types/shifts"
import {
  saveShiftTemplateAction,
  deleteShiftTemplateAction,
  getCompanyShiftTemplates,
} from "@/app/hr/time/shift-actions"
import { toast } from "sonner"

interface ShiftTemplatesManagerProps {
  initialTemplates: ShiftTemplate[]
}

const PRESET_COLORS = [
  "#0d9488", // Teal
  "#d97706", // Amber
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#f43f5e", // Rose
  "#0284c7", // Sky
  "#8b5cf6", // Purple
  "#64748b", // Slate
]

export function ShiftTemplatesManager({
  initialTemplates,
}: ShiftTemplatesManagerProps) {
  const [templates, setTemplates] = useState<ShiftTemplate[]>(initialTemplates)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form állapotok
  const [kod, setKod] = useState("")
  const [megnevezes, setMegnevezes] = useState("")
  const [kezdesIdo, setKezdesIdo] = useState("08:00")
  const [befejezesIdo, setBefejezesIdo] = useState("16:30")
  const [munkaora, setMunkaora] = useState<number>(8)
  const [szunetPerc, setSzunetPerc] = useState<number>(30)
  const [szinKod, setSzinKod] = useState("#0d9488")

  const handleOpenCreate = () => {
    setEditingTemplate(null)
    setKod("")
    setMegnevezes("")
    setKezdesIdo("08:00")
    setBefejezesIdo("16:30")
    setMunkaora(8)
    setSzunetPerc(30)
    setSzinKod("#0d9488")
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (tmpl: ShiftTemplate) => {
    setEditingTemplate(tmpl)
    setKod(tmpl.kod)
    setMegnevezes(tmpl.megnevezes)
    setKezdesIdo(tmpl.kezdes_ido.substring(0, 5))
    setBefejezesIdo(tmpl.befejezes_ido.substring(0, 5))
    setMunkaora(tmpl.munkaora)
    setSzunetPerc(tmpl.szunet_perc)
    setSzinKod(tmpl.szin_kod)
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!kod.trim() || !megnevezes.trim()) {
      toast.error("A kód és megnevezés megadása kötelező!")
      return
    }

    startTransition(async () => {
      const res = await saveShiftTemplateAction({
        id: editingTemplate?.id,
        kod: kod.trim(),
        megnevezes: megnevezes.trim(),
        kezdes_ido: kezdesIdo.length === 5 ? `${kezdesIdo}:00` : kezdesIdo,
        befejezes_ido: befejezesIdo.length === 5 ? `${befejezesIdo}:00` : befejezesIdo,
        munkaora: Number(munkaora),
        szunet_perc: Number(szunetPerc),
        szin_kod: szinKod,
      })

      if (res.success) {
        toast.success(
          editingTemplate ? "Műszaksablon frissítve" : "Új műszaksablon létrehozva"
        )
        setIsDialogOpen(false)
        const updated = await getCompanyShiftTemplates()
        setTemplates(updated)
      } else {
        toast.error(res.error || "Hiba történt a sablon mentésekor")
      }
    })
  }

  const handleDelete = (tmpl: ShiftTemplate) => {
    if (!confirm(`Biztosan törölni / inaktiválni szeretnéd a(z) "${tmpl.megnevezes}" sablont?`)) {
      return
    }

    startTransition(async () => {
      const res = await deleteShiftTemplateAction(tmpl.id)
      if (res.success) {
        toast.success("Műszaksablon inaktiválva")
        const updated = await getCompanyShiftTemplates()
        setTemplates(updated)
      } else {
        toast.error(res.error || "Hiba történt a törléskor")
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Fejléc */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Műszaksablonok és munkarendek
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Állítsd be a cégben alkalmazott standard műszakokat (Délelőtt, Délután, Éjszaka, Irodai normál).
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium"
          onClick={handleOpenCreate}
        >
          <Plus className="h-3.5 w-3.5" />
          Új sablon létrehozása
        </Button>
      </div>

      {/* Sablon Kártyák Rácsa */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {templates.map((tmpl) => (
          <div
            key={tmpl.id}
            className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between hover:border-primary/40 transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                    style={{ backgroundColor: tmpl.szin_kod }}
                  >
                    {tmpl.kod}
                  </span>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">
                      {tmpl.megnevezes}
                    </h3>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Kód: {tmpl.kod}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 py-2 border-y border-border/60 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Időtartam:
                  </span>
                  <span className="font-medium text-foreground tabular-nums">
                    {tmpl.kezdes_ido.substring(0, 5)} – {tmpl.befejezes_ido.substring(0, 5)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Tervezett munkaóra:</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {tmpl.munkaora} óra
                  </span>
                </div>

                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Coffee className="h-3.5 w-3.5" />
                    Munkaközi szünet:
                  </span>
                  <span className="font-medium text-foreground tabular-nums">
                    {tmpl.szunet_perc} perc
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-3 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => handleOpenEdit(tmpl)}
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Szerkesztés
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                onClick={() => handleDelete(tmpl)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Létrehozás / Szerkesztés Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Műszaksablon szerkesztése" : "Új műszaksablon"}
            </DialogTitle>
            <DialogDescription>
              Add meg a műszak paramétereit és megkülönböztető színét.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="kod" className="text-xs">
                  Rövid kód *
                </Label>
                <Input
                  id="kod"
                  placeholder="pl. D, DU, É, N"
                  value={kod}
                  onChange={(e) => setKod(e.target.value.toUpperCase())}
                  maxLength={5}
                  required
                  className="h-8 text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="megnevezes" className="text-xs">
                  Műszak neve *
                </Label>
                <Input
                  id="megnevezes"
                  placeholder="pl. Délelőttös műszak"
                  value={megnevezes}
                  onChange={(e) => setMegnevezes(e.target.value)}
                  required
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="kezdesIdo" className="text-xs">
                  Kezdési idő *
                </Label>
                <Input
                  id="kezdesIdo"
                  type="time"
                  value={kezdesIdo}
                  onChange={(e) => setKezdesIdo(e.target.value)}
                  required
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="befejezesIdo" className="text-xs">
                  Befejezési idő *
                </Label>
                <Input
                  id="befejezesIdo"
                  type="time"
                  value={befejezesIdo}
                  onChange={(e) => setBefejezesIdo(e.target.value)}
                  required
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="munkaora" className="text-xs">
                  Tervezett munkaóra *
                </Label>
                <Input
                  id="munkaora"
                  type="number"
                  step="0.5"
                  min="1"
                  max="24"
                  value={munkaora}
                  onChange={(e) => setMunkaora(parseFloat(e.target.value) || 8)}
                  required
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="szunetPerc" className="text-xs">
                  Munkaközi szünet (perc)
                </Label>
                <Input
                  id="szunetPerc"
                  type="number"
                  step="5"
                  min="0"
                  max="120"
                  value={szunetPerc}
                  onChange={(e) => setSzunetPerc(parseInt(e.target.value) || 0)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* Színválasztó */}
            <div className="space-y-1.5">
              <Label className="text-xs">Megjelenítési szín</Label>
              <div className="flex items-center gap-2 pt-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSzinKod(c)}
                    className="h-7 w-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 border border-white/20"
                    style={{ backgroundColor: c }}
                  >
                    {szinKod === c && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Előnézet */}
            <div className="p-3 rounded-lg bg-muted/40 border border-border/80 text-xs">
              <span className="text-[11px] text-muted-foreground block mb-1">
                Előnézet a műszaktervezőben:
              </span>
              <div
                style={{
                  borderColor: `${szinKod}40`,
                  backgroundColor: `${szinKod}15`,
                }}
                className="w-48 px-2 py-1.5 rounded-md border text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs" style={{ color: szinKod }}>
                    {kod || "KÓD"}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {munkaora}h
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {kezdesIdo} - {befejezesIdo}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
              >
                Mégse
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {editingTemplate ? "Módosítások mentése" : "Sablon mentése"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
