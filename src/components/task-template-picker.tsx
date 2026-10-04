"use client"

import { useState, useEffect } from "react"
import { TaskTemplate, TaskCategory, TaskPriority } from "@/types/tasks"
import { TASK_CATEGORIES, TASK_PRIORITIES } from "@/utils/task-templates"
import {
  getTaskTemplates,
  deleteCustomTaskTemplate,
  updateCustomTaskTemplate,
  createCustomTaskTemplate,
} from "@/app/tasks/task-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Clock, MoreVertical, Pencil, Plus, Search, Sparkles, Tag, Trash2, X } from "lucide-react"
import { toast } from "sonner"

interface TaskTemplatePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTemplate: (template: TaskTemplate) => void
}

export function TaskTemplatePicker({
  open,
  onOpenChange,
  onSelectTemplate,
}: TaskTemplatePickerProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)

  // Műveletek state-jei: törlés és szerkesztés/létrehozás
  const [templateToDelete, setTemplateToDelete] = useState<TaskTemplate | null>(null)
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form mezők a sablon szerkesztéséhez / új felvételéhez
  const [formCim, setFormCim] = useState("")
  const [formKategoria, setFormKategoria] = useState<TaskCategory>("egyeb")
  const [formPrioritas, setFormPrioritas] = useState<TaskPriority>("normal")
  const [formHataridoNap, setFormHataridoNap] = useState(3)
  const [formLeiras, setFormLeiras] = useState("")

  const loadTemplates = () => {
    setIsLoading(true)
    getTaskTemplates()
      .then((res) => {
        if (res.success && res.templates) {
          setTemplates(res.templates)
        }
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  const filteredTemplates = templates.filter((tpl) => {
    const matchesSearch =
      tpl.cim.toLowerCase().includes(search.toLowerCase()) ||
      (tpl.leiras && tpl.leiras.toLowerCase().includes(search.toLowerCase()))
    const matchesCat =
      selectedCategory === "all" || tpl.kategoria === selectedCategory
    return matchesSearch && matchesCat
  })

  // Új sablon form megnyitása
  const handleOpenCreate = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditingTemplate(null)
    setFormCim("")
    setFormKategoria("egyeb")
    setFormPrioritas("normal")
    setFormHataridoNap(3)
    setFormLeiras("")
    setIsFormDialogOpen(true)
  }

  // Meglévő sablon szerkesztésének megnyitása
  const handleOpenEdit = (tpl: TaskTemplate, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingTemplate(tpl)
    setFormCim(tpl.cim)
    setFormKategoria(tpl.kategoria)
    setFormPrioritas(tpl.prioritas)
    setFormHataridoNap(tpl.alapertelmezett_hatarido_nap || 3)
    setFormLeiras(tpl.leiras || "")
    setIsFormDialogOpen(true)
  }

  // Sablon mentése (Létrehozás vagy Frissítés)
  const handleSaveTemplate = async () => {
    if (!formCim.trim()) {
      toast.error("A feladatsablon megnevezése kötelező!")
      return
    }

    setIsSubmitting(true)
    try {
      if (editingTemplate) {
        // Módosítás
        const res = await updateCustomTaskTemplate(editingTemplate.id, {
          cim: formCim.trim(),
          kategoria: formKategoria,
          prioritas: formPrioritas,
          alapertelmezett_hatarido_nap: Math.max(1, formHataridoNap),
          leiras: formLeiras.trim() || undefined,
        })

        if (res.success) {
          toast.success("Sablon sikeresen módosítva!")
          setTemplates((prev) =>
            prev.map((t) =>
              t.id === editingTemplate.id
                ? {
                    ...t,
                    cim: formCim.trim(),
                    kategoria: formKategoria,
                    prioritas: formPrioritas,
                    alapertelmezett_hatarido_nap: Math.max(1, formHataridoNap),
                    leiras: formLeiras.trim() || undefined,
                  }
                : t
            )
          )
          setIsFormDialogOpen(false)
          setEditingTemplate(null)
        } else {
          toast.error(res.error || "Hiba történt a sablon módosításakor.")
        }
      } else {
        // Új sablon létrehozása
        const res = await createCustomTaskTemplate({
          cim: formCim.trim(),
          kategoria: formKategoria,
          prioritas: formPrioritas,
          alapertelmezett_hatarido_nap: Math.max(1, formHataridoNap),
          leiras: formLeiras.trim() || undefined,
          isCustom: true,
        })

        if (res.success && res.template) {
          toast.success("Új feladatsablon sikeresen létrehozva!")
          setTemplates((prev) => [res.template!, ...prev])
          setIsFormDialogOpen(false)
        } else {
          toast.error(res.error || "Hiba történt a sablon mentésekor.")
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba történt.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Sablon törlésének megerősítése
  const handleConfirmDelete = async () => {
    if (!templateToDelete) return

    setIsSubmitting(true)
    try {
      const res = await deleteCustomTaskTemplate(templateToDelete.id)
      if (res.success) {
        toast.success(`A(z) "${templateToDelete.cim}" sablon törölve lett.`)
        setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete.id))
        setTemplateToDelete(null)
      } else {
        toast.error(res.error || "Hiba a sablon törlése során.")
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba a sablon törlése során.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[920px] w-[95vw] max-h-[88vh] h-[720px] p-0 overflow-hidden flex flex-col border shadow-xl">
          {/* Fejléc - fix */}
          <DialogHeader className="px-6 py-4 border-b shrink-0 bg-background">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold tracking-tight">
                    Feladatsablonok katalógusa
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Válassz a beépített standard és egyéni munkafolyamat-sablonok közül a gyors kiíráshoz.
                  </DialogDescription>
                </div>
              </div>

              {/* Új sablon rögzítése gomb közvetlenül a katalógusból (mr-8 a bezáró X gombtól való távolságért) */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenCreate}
                className="h-8 text-xs gap-1.5 border-dashed border-primary/40 hover:bg-primary/10 hover:text-primary shrink-0 mr-8"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Új sablon</span>
              </Button>
            </div>
          </DialogHeader>

          {/* Keresés & Kategória szűrők - fix */}
          <div className="px-6 py-3 border-b shrink-0 bg-muted/20 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Keresés sablon neve vagy leírása alapján..."
                className="pl-9 pr-9 h-9 text-xs bg-background"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Kategóriák: flex-wrap, tiszta pill-ek, NICS ormótlan görgetősáv */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-background border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Összes ({templates.length})
              </button>
              {TASK_CATEGORIES.map((cat) => {
                const count = templates.filter((t) => t.kategoria === cat.id).length
                if (count === 0) return null
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      selectedCategory === cat.id
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-background border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span>{cat.nev}</span>
                    <span className="opacity-75 text-[10px]">({count})</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Görgethető tartalom terület - min-h-0 és overflow-y-auto megakadályozza a kilógást */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            {isLoading ? (
              <div className="py-20 text-center text-xs text-muted-foreground">
                Sablonok betöltése...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="py-20 text-center text-xs text-muted-foreground">
                Nem található a keresési feltételnek megfelelő feladatsablon.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pb-2">
                {filteredTemplates.map((template) => {
                  const catDef = TASK_CATEGORIES.find((c) => c.id === template.kategoria)
                  const prioDef = TASK_PRIORITIES.find((p) => p.id === template.prioritas)
                  return (
                    <div
                      key={template.id}
                      onClick={() => {
                        onSelectTemplate(template)
                        onOpenChange(false)
                      }}
                      className="group relative flex flex-col justify-between rounded-lg border border-border/70 bg-card p-4 hover:border-primary/50 hover:bg-muted/20 cursor-pointer transition-all text-left shadow-none"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                              {template.cim}
                            </span>
                            {template.isCustom && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-dashed shrink-0">
                                Egyéni
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation()
                                onSelectTemplate(template)
                                onOpenChange(false)
                              }}
                              className="text-xs h-7 px-2.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                            >
                              Alkalmaz
                            </Button>

                            {/* Egyéni sablonoknál: Szerkesztés & Törlés menü */}
                            {template.isCustom && (
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                  title="Sablon műveletek"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="text-xs">
                                  <DropdownMenuItem onClick={(e) => handleOpenEdit(template, e)}>
                                    <Pencil className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                                    <span>Sablon módosítása</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setTemplateToDelete(template)
                                    }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    <span>Sablon törlése</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>

                        {template.leiras && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                            {template.leiras}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-border/50 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Tag className="h-3 w-3 text-muted-foreground/70" />
                          <span className="font-medium">{catDef?.nev || template.kategoria}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block w-2 h-2 rounded-full ${prioDef?.dotClass || "bg-muted"}`} />
                          <span>{prioDef?.nev || template.prioritas} prioritás</span>
                        </div>
                        <div className="flex items-center gap-1 ml-auto font-mono text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3 text-muted-foreground/70" />
                          <span>+{template.alapertelmezett_hatarido_nap} munkanap</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Lábléc - fix */}
          <div className="px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-between text-xs text-muted-foreground">
            <span>Elérhető sablonok: {filteredTemplates.length} db</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-7 text-xs"
            >
              Mégse
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sablon Szerkesztése / Új sablon felvétele Modál */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-6">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-base font-semibold">
              {editingTemplate ? "Feladatsablon módosítása" : "Új feladatsablon rögzítése"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {editingTemplate
                ? "Frissítsd a kiválasztott munkafolyamat-sablon adatait."
                : "Hozz létre egy új, újrahasznosítható vállalati feladatsablont."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-3">
            {/* Megnevezés */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">
                Sablon megnevezése <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formCim}
                onChange={(e) => setFormCim(e.target.value)}
                placeholder="Pl. Szerződéstervezet jogi jóváhagyása"
                className="h-9 text-xs"
                autoFocus
              />
            </div>

            {/* Kategória és Prioritás */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Kategória</Label>
                <Select
                  value={formKategoria}
                  onValueChange={(val) => val && setFormKategoria(val as TaskCategory)}
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
                  value={formPrioritas}
                  onValueChange={(val) => val && setFormPrioritas(val as TaskPriority)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${p.dotClass}`} />
                          <span>{p.nev}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Határidő munkanapban */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">
                Alapértelmezett határidő (munkanapban)
              </Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={formHataridoNap}
                onChange={(e) => setFormHataridoNap(parseInt(e.target.value) || 1)}
                className="h-9 text-xs"
              />
              <span className="text-[11px] text-muted-foreground">
                A feladat kiírásakor ennyi munkanap adódik hozzá a mai dátumhoz.
              </span>
            </div>

            {/* Leírás / Instrukció */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">
                Munkafolyamat leírása / Instrukció
              </Label>
              <Textarea
                value={formLeiras}
                onChange={(e) => setFormLeiras(e.target.value)}
                placeholder="Részletes leírás, amit a felelős látni fog a feladat megnyitásakor..."
                className="text-xs min-h-[70px]"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFormDialogOpen(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Mégse
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveTemplate}
              disabled={isSubmitting}
              className="text-xs"
            >
              {isSubmitting
                ? "Mentés..."
                : editingTemplate
                ? "Módosítások mentése"
                : "Sablon mentése"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sablon törlésének megerősítése (AlertDialog) */}
      <AlertDialog
        open={Boolean(templateToDelete)}
        onOpenChange={(open) => !open && setTemplateToDelete(null)}
      >
        <AlertDialogContent className="sm:max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              Biztosan törölni szeretnéd a sablont?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              A(z) <span className="font-semibold text-foreground">„{templateToDelete?.cim}”</span> egyéni
              munkafolyamat-sablon véglegesen törlődik a katalógusból. A korábban kiírt feladatok nem fognak
              módosulni.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel
              disabled={isSubmitting}
              onClick={() => setTemplateToDelete(null)}
              className="text-xs"
            >
              Mégse
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={handleConfirmDelete}
              className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Törlés..." : "Sablon törlése"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
