"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { createDevelopmentGoal, updateDevelopmentGoal, IDPGoalType, IDPPriority, FejlesztesiCel } from "@/app/hr/actions/idp-actions"
import { toast } from "sonner"

interface IdpDialogProps {
  tervId: string
  dolgozoId: string
  buttonVariant?: "default" | "outline" | "ghost"
  /** Ha meg van adva, szerkesztés módban nyílik meg */
  existingGoal?: FejlesztesiCel
  /** Ha meg van adva, ez jelenik meg a trigger helyett (csak szerkesztés módban) */
  customTrigger?: React.ReactNode
}

const TIPUS_LABELS: Record<string, string> = {
  kompetencia: "Kompetencia",
  kepzes:      "Képzés (Tanfolyam)",
  nyelv:       "Nyelvvizsga",
  egyeb:       "Egyéb",
}

const PRIORITAS_LABELS: Record<string, string> = {
  magas:   "🔴 Magas",
  kozepes: "🟡 Közepes",
  alacsony:"🟢 Alacsony",
}

export function IdpDialog({ tervId, dolgozoId, buttonVariant = "outline", existingGoal, customTrigger }: IdpDialogProps) {
  const isEdit = !!existingGoal
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [tipus,    setTipus]    = useState<string>(existingGoal?.tipus    ?? "kompetencia")
  const [prioritas,setPrioritas]= useState<string>(existingGoal?.prioritas ?? "kozepes")
  const [megnevezes,setMegnevezes] = useState(existingGoal?.megnevezes ?? "")
  const [leiras,   setLeiras]   = useState(existingGoal?.leiras ?? "")
  const [hatarido, setHatarido] = useState(existingGoal?.hatarido ?? "")
  const [mentor,   setMentor]   = useState(existingGoal?.mentor ?? "")

  const router = useRouter()

  function resetForm() {
    if (!isEdit) {
      setTipus("kompetencia")
      setPrioritas("kozepes")
      setMegnevezes("")
      setLeiras("")
      setHatarido("")
      setMentor("")
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!megnevezes) return

    setIsSubmitting(true)

    let result
    if (isEdit && existingGoal) {
      result = await updateDevelopmentGoal(existingGoal.id, {
        tipus:     tipus as IDPGoalType,
        prioritas: prioritas as IDPPriority,
        megnevezes,
        leiras,
        hatarido:  hatarido || undefined,
        mentor:    mentor || undefined,
      })
    } else {
      result = await createDevelopmentGoal({
        terv_id:   tervId,
        dolgozo_id: dolgozoId,
        tipus:     tipus as IDPGoalType,
        prioritas: prioritas as IDPPriority,
        megnevezes,
        leiras,
        hatarido:  hatarido || undefined,
        mentor:    mentor || undefined,
      })
    }

    setIsSubmitting(false)

    if (result.success) {
      toast.success(isEdit ? "Célkitűzés frissítve" : "Célkitűzés hozzáadva")
      setOpen(false)
      resetForm()
      router.refresh()
    } else {
      toast.error("Hiba történt", { description: result.error })
    }
  }

  return (
    <>
      {/* Trigger – egyszerű onClick, DialogTrigger nélkül */}
      {customTrigger ? (
        <span onClick={() => setOpen(true)} className="cursor-pointer contents">
          {customTrigger}
        </span>
      ) : (
        <Button variant={buttonVariant as any} size="sm" onClick={() => setOpen(true)}>
          {isEdit
            ? <><Pencil className="w-3.5 h-3.5 mr-1.5" /> Szerkesztés</>
            : <><Plus   className="w-4 h-4 mr-2" /> Új Célkitűzés</>
          }
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Célkitűzés Szerkesztése" : "Új Fejlesztési Célkitűzés"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Módosítsa a célkitűzés adatait."
              : "Rögzítsen egy új célt a fejlesztési tervhez."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipus">Cél Típusa</Label>
              <Select value={tipus} onValueChange={(v) => setTipus(v || "kompetencia")}>
                <SelectTrigger id="tipus">
                  {TIPUS_LABELS[tipus] ?? "Válasszon..."}
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPUS_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prioritas">Prioritás</Label>
              <Select value={prioritas} onValueChange={(v) => setPrioritas(v || "kozepes")}>
                <SelectTrigger id="prioritas">
                  {PRIORITAS_LABELS[prioritas] ?? "Válasszon..."}
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITAS_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="megnevezes">Megnevezés *</Label>
            <Input
              id="megnevezes"
              placeholder="pl. Haladó Excel tanfolyam"
              value={megnevezes}
              onChange={(e) => setMegnevezes(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hatarido">Határidő</Label>
              <Input
                id="hatarido"
                type="date"
                value={hatarido}
                onChange={(e) => setHatarido(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mentor">Mentor / Felelős</Label>
              <Input
                id="mentor"
                placeholder="pl. Kovács Péter"
                value={mentor}
                onChange={(e) => setMentor(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="leiras">Leírás (opcionális)</Label>
            <Textarea
              id="leiras"
              placeholder="Célkitűzés részletei, elvárások, stb."
              className="resize-none"
              rows={3}
              value={leiras}
              onChange={(e) => setLeiras(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Mégse
            </Button>
            <Button type="submit" disabled={isSubmitting || !megnevezes}>
              {isSubmitting ? "Mentés..." : "Mentés"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
