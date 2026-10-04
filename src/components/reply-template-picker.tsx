"use client"

import { useState, useEffect } from "react"
import { ReplyTemplate, ReplyTemplateCategory } from "@/types/reply-templates"
import { REPLY_CATEGORIES, DEFAULT_REPLY_TEMPLATES } from "@/utils/reply-templates"
import {
  getReplyTemplates,
  createCustomReplyTemplate,
  updateCustomReplyTemplate,
  deleteCustomReplyTemplate,
} from "@/app/dossiers/[id]/template-actions"
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
import { FileText, Mail, MoreVertical, Pencil, Plus, Search, Sparkles, Tag, Trash2, X, Loader2, Eye } from "lucide-react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { toast } from "sonner"

interface ReplyTemplatePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTemplate: (template: ReplyTemplate) => void
}

export function ReplyTemplatePicker({
  open,
  onOpenChange,
  onSelectTemplate,
}: ReplyTemplatePickerProps) {
  const [templates, setTemplates] = useState<ReplyTemplate[]>(DEFAULT_REPLY_TEMPLATES)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)

  // Műveletek state-jei: törlés és szerkesztés/létrehozás
  const [templateToDelete, setTemplateToDelete] = useState<ReplyTemplate | null>(null)
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ReplyTemplate | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form mezők a sablon szerkesztéséhez / új felvételéhez
  const [formNev, setFormNev] = useState("")
  const [formKategoria, setFormKategoria] = useState<ReplyTemplateCategory>("hivatalos")
  const [formTargy, setFormTargy] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formTartalom, setFormTartalom] = useState("")

  const loadTemplates = () => {
    setIsLoading(true)
    getReplyTemplates()
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
      tpl.nev.toLowerCase().includes(search.toLowerCase()) ||
      tpl.targy.toLowerCase().includes(search.toLowerCase()) ||
      (tpl.description && tpl.description.toLowerCase().includes(search.toLowerCase())) ||
      (tpl.tartalom && tpl.tartalom.toLowerCase().includes(search.toLowerCase()))
    const matchesCat =
      selectedCategory === "all" || tpl.kategoria === selectedCategory
    return matchesSearch && matchesCat
  })

  // Új sablon form megnyitása
  const handleOpenCreate = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditingTemplate(null)
    setFormNev("")
    setFormKategoria("hivatalos")
    setFormTargy("")
    setFormDescription("")
    setFormTartalom("")
    setIsFormDialogOpen(true)
  }

  // Meglévő sablon szerkesztésének megnyitása
  const handleOpenEdit = (tpl: ReplyTemplate, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingTemplate(tpl)
    setFormNev(tpl.nev)
    setFormKategoria(tpl.kategoria)
    setFormTargy(tpl.targy)
    setFormDescription(tpl.description || "")
    setFormTartalom(tpl.tartalom)
    setIsFormDialogOpen(true)
  }

  // Sablon mentése (Létrehozás vagy Frissítés)
  const handleSaveTemplate = async () => {
    if (!formNev.trim()) {
      toast.error("A sablon megnevezése kötelező!")
      return
    }
    if (!formTartalom.trim()) {
      toast.error("A válaszlevél szövegezésének megadása kötelező!")
      return
    }

    setIsSubmitting(true)
    try {
      if (editingTemplate) {
        // Módosítás
        const res = await updateCustomReplyTemplate(editingTemplate.id, {
          nev: formNev.trim(),
          kategoria: formKategoria,
          targy: formTargy.trim() || formNev.trim(),
          description: formDescription.trim() || undefined,
          tartalom: formTartalom.trim(),
        })

        if (res.success && res.template) {
          toast.success("Sablon sikeresen módosítva!")
          setTemplates((prev) =>
            prev.map((t) => (t.id === editingTemplate.id ? res.template! : t))
          )
          setIsFormDialogOpen(false)
          setEditingTemplate(null)
        } else {
          toast.error(res.error || "Hiba történt a sablon módosításakor.")
        }
      } else {
        // Új sablon létrehozása
        const res = await createCustomReplyTemplate({
          nev: formNev.trim(),
          kategoria: formKategoria,
          targy: formTargy.trim() || formNev.trim(),
          description: formDescription.trim() || undefined,
          tartalom: formTartalom.trim(),
        })

        if (res.success && res.template) {
          toast.success("Új válaszlevél sablon sikeresen létrehozva!")
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
      const res = await deleteCustomReplyTemplate(templateToDelete.id)
      if (res.success) {
        toast.success(`A(z) "${templateToDelete.nev}" sablon sikeresen törölve lett.`)
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
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold tracking-tight">
                    Válaszlevél- és iratsablonok katalógusa
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Válassz a beépített standard és egyéni válaszlevél sablonok közül a gyors levélíráshoz.
                  </DialogDescription>
                </div>
              </div>

              {/* Új sablon rögzítése gomb (mr-8 a bezáró X gombtól való távolságért) */}
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
                placeholder="Keresés sablon neve, leírása vagy szövegezése alapján..."
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

            {/* Kategóriák: flex-wrap, tiszta pill-ek */}
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
              {REPLY_CATEGORIES.map((cat) => {
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

          {/* Görgethető tartalom terület */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            {isLoading ? (
              <div className="py-20 text-center text-xs text-muted-foreground">
                Sablonok betöltése...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="py-20 text-center text-xs text-muted-foreground">
                Nem található a keresési feltételnek megfelelő válaszlevél sablon.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pb-2">
                {filteredTemplates.map((template) => {
                  const catDef = REPLY_CATEGORIES.find((c) => c.id === template.kategoria)
                  return (
                    <HoverCard key={template.id}>
                      <HoverCardTrigger
                        delay={180}
                        render={
                          <div
                            onClick={() => {
                              onSelectTemplate(template)
                              onOpenChange(false)
                            }}
                            className="group relative flex flex-col justify-between rounded-lg border border-border/70 bg-card p-4 hover:border-primary/60 hover:bg-muted/20 cursor-pointer transition-all text-left shadow-none"
                          />
                        }
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                {template.nev}
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

                              {/* Sablon műveletek: Szerkesztés & Törlés menü MINDEN sablonhoz */}
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                  title="Sablon műveletek"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="text-xs z-[80]">
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
                            </div>
                          </div>

                          {template.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {template.description}
                            </p>
                          )}

                          {/* Szöveg előnézet a kártyán vizuális hover jelzéssel */}
                          {template.tartalom && (
                            <div className="relative rounded-md bg-muted/40 border border-border/50 p-2.5 transition-colors group-hover:border-primary/40 group-hover:bg-muted/60">
                              <div className="text-[11px] text-muted-foreground font-mono line-clamp-2 leading-snug whitespace-pre-line">
                                {template.tartalom}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-primary font-medium mt-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                                <Eye className="h-3 w-3" />
                                <span>Részletes lebegő előnézet ráhúzással</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-border/50 text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Tag className="h-3 w-3 text-muted-foreground/70" />
                            <span className="font-medium">{catDef?.nev || template.kategoria}</span>
                          </div>
                          {template.targy && (
                            <div className="ml-auto truncate max-w-[200px] text-[10px] text-muted-foreground/80 italic">
                              Tárgy: {template.targy}
                            </div>
                          )}
                        </div>
                      </HoverCardTrigger>

                      {/* Lebegő Előnézeti Kártya (Hover Card / Popover) */}
                      <HoverCardContent
                        side="right"
                        align="start"
                        sideOffset={14}
                        collisionPadding={16}
                        className="w-[460px] max-w-[92vw] p-0 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl overflow-hidden ring-1 ring-border/80"
                      >
                        {/* Előnézet fejléc */}
                        <div className="p-3.5 bg-muted/40 border-b border-border flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1.5">
                                <span className="truncate">{template.nev}</span>
                                {template.isCustom && (
                                  <Badge variant="outline" className="text-[9px] py-0 px-1 border-dashed">
                                    Egyéni
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {catDef?.nev || template.kategoria}
                              </span>
                            </div>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectTemplate(template)
                              onOpenChange(false)
                            }}
                            className="h-7 text-xs px-2.5 bg-primary text-primary-foreground hover:bg-primary/90 gap-1 shrink-0 font-medium"
                          >
                            <span>Alkalmazás</span>
                          </Button>
                        </div>

                        {/* Tárgy mező */}
                        {template.targy && (
                          <div className="px-3.5 py-2 bg-background border-b border-border/60 text-xs">
                            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                              Irat tárgya:
                            </div>
                            <div className="font-medium text-foreground text-xs leading-snug">
                              {template.targy}
                            </div>
                          </div>
                        )}

                        {/* Levél tartalma (teljes formázott papírlap nézet) */}
                        <div className="p-3.5 bg-muted/15 space-y-2">
                          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                            <span>Válaszlevél pontos szövegezése:</span>
                            <span className="font-normal lowercase font-mono">
                              {template.tartalom.length} karakter
                            </span>
                          </div>
                          <div className="p-3 bg-card border border-border/80 rounded-lg font-sans text-xs text-foreground leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto select-text shadow-2xs">
                            {template.tartalom}
                          </div>
                        </div>

                        {/* Lábléc tipp */}
                        <div className="px-3.5 py-2 bg-muted/40 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-between">
                          <span>Kattintson az Alkalmazás gombra a beillesztéshez</span>
                          <span className="text-primary font-medium">eaisyDocs sablon</span>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
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
        <DialogContent className="sm:max-w-[560px] p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-base font-semibold">
              {editingTemplate ? "Válaszlevél sablon módosítása" : "Új válaszlevél sablon rögzítése"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {editingTemplate
                ? "Frissítsd a kiválasztott válaszlevél sablon adatait."
                : "Hozz létre egy új, újrahasznosítható vállalati válaszlevél sablont."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-3 text-xs">
            {/* Megnevezés */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Sablon megnevezése <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formNev}
                onChange={(e) => setFormNev(e.target.value)}
                placeholder="Pl. Számlareklamáció és egyeztetés"
                className="h-9 text-xs"
                disabled={isSubmitting}
              />
            </div>

            {/* Kategória és Tárgy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Kategória</Label>
                <Select
                  value={formKategoria}
                  onValueChange={(val) => setFormKategoria(val as ReplyTemplateCategory)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Válassz kategóriát..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REPLY_CATEGORIES.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.nev}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Alapértelmezett tárgy</Label>
                <Input
                  value={formTargy}
                  onChange={(e) => setFormTargy(e.target.value)}
                  placeholder="Pl. Hivatalos válaszlevél"
                  className="h-9 text-xs"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Rövid leírás */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Rövid ismertető (opcionális)</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Mikor és milyen helyzetben javasolt használni ezt a sablont..."
                className="h-9 text-xs"
                disabled={isSubmitting}
              />
            </div>

            {/* Levél tartalma */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Válaszlevél szövegezése / Sablon tartalma <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={8}
                value={formTartalom}
                onChange={(e) => setFormTartalom(e.target.value)}
                placeholder={`Tisztelt Partnerünk!\n\nEzúton tájékoztatjuk...\n\nÜdvözlettel,\neaisyDocs`}
                className="font-sans text-xs resize-y"
                disabled={isSubmitting}
              />
              <p className="text-[11px] text-muted-foreground">
                Ez a szöveg töltődik be a levélíró mezőbe a sablon kiválasztásakor.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFormDialogOpen(false)}
              disabled={isSubmitting}
              className="text-xs h-8"
            >
              Mégse
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveTemplate}
              disabled={isSubmitting}
              className="text-xs h-8 bg-primary text-primary-foreground gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Mentés...</span>
                </>
              ) : (
                <span>Sablon mentése</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sablon Törlése Megerősítő Dialógus */}
      <AlertDialog
        open={!!templateToDelete}
        onOpenChange={(open) => !open && setTemplateToDelete(null)}
      >
        <AlertDialogContent className="sm:max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              Sablon törlésének megerősítése
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground space-y-2">
              <p>
                Biztosan törölni szeretnéd a(z){" "}
                <span className="font-semibold text-foreground">
                  &quot;{templateToDelete?.nev}&quot;
                </span>{" "}
                sablont a katalógusból?
              </p>
              <p className="text-[11px] text-destructive">
                A művelet visszavonhatatlan. A korábban ezzel generált iratokat a törlés nem érinti.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting} className="text-xs h-8">
              Mégse
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
              className="text-xs h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Sablon törlése"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
