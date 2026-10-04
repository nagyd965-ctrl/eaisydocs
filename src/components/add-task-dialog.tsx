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
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createTask, saveTaskTemplate } from "@/app/tasks/task-actions"
import { TaskTemplatePicker } from "@/components/task-template-picker"
import { TaskCategory, TaskPriority, TaskTemplate } from "@/types/tasks"
import { TASK_CATEGORIES, TASK_PRIORITIES } from "@/utils/task-templates"
import { toast } from "sonner"
import { BookmarkPlus, Calendar, Clock, Loader2, Plus, Sparkles, Tag } from "lucide-react"

interface AddTaskDialogProps {
  ugyiratId: string
  users: Array<{ id: string; nev?: string; email?: string; [key: string]: any }>
  onTaskCreated?: () => void
  triggerButton?: React.ReactNode
}

export function AddTaskDialog({
  ugyiratId,
  users,
  onTaskCreated,
  triggerButton,
}: AddTaskDialogProps) {
  const [open, setOpen] = useState(false)
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Mezők
  const [leiras, setLeiras] = useState("")
  const [jegyzet, setJegyzet] = useState("")
  const [felelos, setFelelos] = useState("")
  const [hatarido, setHatarido] = useState("")
  const [prioritas, setPrioritas] = useState<TaskPriority>("normal")
  const [kategoria, setKategoria] = useState<TaskCategory>("egyeb")
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)

  // Kiválasztott felhasználó neve
  const selectedUserName = users.find((u) => u.id === felelos)?.nev || ""

  // Gyors határidő kalkulátor
  const setQuickDeadline = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    const formatted = d.toISOString().split("T")[0]
    setHatarido(formatted)
  }

  // Sablon alkalmazása
  const handleSelectTemplate = (template: TaskTemplate) => {
    setLeiras(template.cim)
    if (template.leiras) setJegyzet(template.leiras)
    setKategoria(template.kategoria)
    setPrioritas(template.prioritas)
    setQuickDeadline(template.alapertelmezett_hatarido_nap)
    toast.success(`„${template.cim}” sablon adatai sikeresen betöltve.`)
  }

  const handleSave = async () => {
    if (!leiras.trim()) {
      toast.error("A feladat leírása kötelező!")
      return
    }
    if (!felelos) {
      toast.error("Válassz ki egy felelőst a feladathoz!")
      return
    }
    if (!hatarido) {
      toast.error("Adj meg határidőt a feladathoz!")
      return
    }

    setIsLoading(true)
    try {
      const res = await createTask({
        ugyiratId,
        leiras: leiras.trim(),
        hatarido: new Date(hatarido).toISOString(),
        felelos,
        prioritas,
        kategoria,
        jegyzet: jegyzet.trim() || undefined,
      })

      if (res.success) {
        // Ha kérték a mentést mint új egyéni sablont:
        if (saveAsTemplate) {
          await saveTaskTemplate({
            cim: leiras.trim(),
            leiras: jegyzet.trim() || undefined,
            kategoria,
            prioritas,
            alapertelmezett_hatarido_nap: 3,
            isCustom: true,
          })
        }

        toast.success("Feladat sikeresen létrehozva!")
        setOpen(false)
        setLeiras("")
        setJegyzet("")
        setFelelos("")
        setHatarido("")
        setPrioritas("normal")
        setKategoria("egyeb")
        setSaveAsTemplate(false)

        if (onTaskCreated) onTaskCreated()
      } else {
        toast.error(res.error || "Hiba történt a feladat mentése során.")
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba történt.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {triggerButton ? (
        <div onClick={() => setOpen(true)} className="inline-block">
          {triggerButton}
        </div>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)} className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          <span>Új Feladat</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col p-6">
          <DialogHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-semibold">
                  Új Ügyirati Feladat Rögzítése
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Rendelj ki egy új határidős teendőt a felelős munkatársnak.
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTemplatePickerOpen(true)}
                className="text-xs h-7 gap-1 text-primary border-primary/30 hover:bg-primary/10"
              >
                <Sparkles className="h-3 w-3" />
                Sablonok
              </Button>
            </div>
          </DialogHeader>

          <div className="grid gap-3.5 py-3 overflow-y-auto pr-1">
            {/* Cím / Leírás */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">
                Feladat megnevezése <span className="text-destructive">*</span>
              </Label>
              <Input
                value={leiras}
                onChange={(e) => setLeiras(e.target.value)}
                placeholder="Pl. Számla jóváhagyása és leigazolása..."
                className="h-9 text-xs"
                autoFocus
              />
            </div>

            {/* Kategória és Prioritás */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Kategória</Label>
                <Select
                  value={kategoria}
                  onValueChange={(val) => val && setKategoria(val as TaskCategory)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-xs">
                        {cat.nev}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Prioritás</Label>
                <Select
                  value={prioritas}
                  onValueChange={(val) => val && setPrioritas(val as TaskPriority)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${p.badgeClass.split(" ")[0]}`}
                          />
                          <span>{p.nev}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Felelős és Határidő */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">
                  Felelős <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={felelos}
                  onValueChange={(val) => val && setFelelos(val)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Válassz felelőst...">
                      {selectedUserName || undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id} className="text-xs">
                        {user.nev || user.email || user.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">
                    Határidő <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQuickDeadline(2)}
                      className="text-[10px] text-primary hover:underline"
                    >
                      +2 nap
                    </button>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <button
                      type="button"
                      onClick={() => setQuickDeadline(7)}
                      className="text-[10px] text-primary hover:underline"
                    >
                      +1 hét
                    </button>
                  </div>
                </div>
                <Input
                  type="date"
                  value={hatarido}
                  onChange={(e) => setHatarido(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Részletes leírás / munkautasítás */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">
                Részletes útmutató vagy munkautasítás (opcionális)
              </Label>
              <Textarea
                value={jegyzet}
                onChange={(e) => setJegyzet(e.target.value)}
                placeholder="Pl. További instrukciók a felelős számára, csatolmányok megjelölése..."
                className="resize-none min-h-[70px] text-xs"
              />
            </div>

            {/* Opció: mentés új sablonként */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="save-template"
                checked={saveAsTemplate}
                onChange={(e) => setSaveAsTemplate(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label
                htmlFor="save-template"
                className="text-xs text-muted-foreground cursor-pointer select-none"
              >
                Mentés új sablonként a későbbi gyors használathoz
              </label>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Mégse
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isLoading || !leiras.trim() || !felelos || !hatarido}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Mentés...
                </>
              ) : (
                "Feladat rögzítése"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskTemplatePicker
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        onSelectTemplate={handleSelectTemplate}
      />
    </>
  )
}
