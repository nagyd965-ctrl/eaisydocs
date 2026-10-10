"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  MessageSquare,
  CheckCircle2,
  Loader2,
  ArrowRight,
  X,
  Trash2,
  Ban,
  RotateCcw,
  Calendar,
  User,
  Check,
  Clock,
  Sparkles,
  AlertCircle,
  MoreVertical,
  Info,
  Send,
  Plus,
  ChevronDown,
  ChevronUp,
  Tag,
  BookmarkPlus,
  Layers,
} from "lucide-react"
import { toast } from "sonner"
import { addComment, updateDossierStatus } from "@/app/dossiers/[id]/actions"
import {
  updateTaskStatus,
  deleteTask,
  createTask,
  saveTaskTemplate,
  deleteCustomTaskTemplate,
  getTaskTemplates,
} from "@/app/tasks/task-actions"
import { TaskRejectDialog } from "./task-reject-dialog"
import { Badge } from "./ui/badge"
import { Progress } from "./ui/progress"
import { MentionInput, renderMentionText } from "./mention-input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  parseTaskMetadata,
  CATEGORY_CONFIG,
  PRIORITY_CONFIG,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  DEFAULT_TASK_TEMPLATES,
} from "@/utils/task-templates"
import { TaskTemplate, TaskCategory, TaskPriority } from "@/types/tasks"

export interface TaskComment {
  id: string
  szoveg: string
  created_at: string
  user_name?: string | null
  user_email?: string | null
  felhasznalo?: { nev?: string | null }
  felhasznalo_id?: string
}

export interface UgyiratTaskItem {
  id: string
  leiras: string
  allapot: "nyitott" | "folyamatban" | "kesz" | "elutasitott" | string
  felelos_user_id?: string
  hatarido: string
  kategoria?: string | null
  prioritas?: string | null
  indoklas?: string | null
  reszletek?: string | null
  created_at?: string
}

export interface UserSelectItem {
  id: string
  nev: string
  email?: string
}

interface TasksTabProps {
  ugyiratId: string
  ugyId: string
  status: string
  comments: TaskComment[]
  tasks: UgyiratTaskItem[]
  users: UserSelectItem[]
  canEdit: boolean
  currentUserEmail: string
  iktatoszam?: string
}

export function TasksTab({
  ugyiratId,
  ugyId,
  status,
  comments,
  tasks,
  users,
  canEdit,
  currentUserEmail,
  iktatoszam,
}: TasksTabProps) {
  const router = useRouter()

  // Megjegyzések állapota
  const [commentText, setCommentText] = useState("")
  const [commentLoading, setCommentLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState<string | null>(null)
  const [taskLoading, setTaskLoading] = useState<string | null>(null)

  // Helyi optimista feladatlista
  const [taskList, setTaskList] = useState<UgyiratTaskItem[]>(tasks)
  useEffect(() => {
    setTaskList(tasks)
  }, [tasks])

  // Törlés és elutasítás modálok állapota
  const [deletingTask, setDeletingTask] = useState<{ id: string; title: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [rejectingTask, setRejectingTask] = useState<{ id: string; title: string } | null>(null)

  // ── IN-PLACE FELADATKÉSZÍTŐ ÉS SABLONÁLLAPOT (DOC-TASK-01: 0 POPUP!) ──
  const [composerOpen, setComposerOpen] = useState(true)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [templates, setTemplates] = useState<TaskTemplate[]>(DEFAULT_TASK_TEMPLATES)
  const [selectedTemplateCat, setSelectedTemplateCat] = useState<string>("all")
  const [createLoading, setCreateLoading] = useState(false)

  // Új feladat mezői
  const [formLeiras, setFormLeiras] = useState("")
  const [formFelelos, setFormFelelos] = useState("")
  const [formHatarido, setFormHatarido] = useState("")
  const [formPrioritas, setFormPrioritas] = useState<TaskPriority>("normal")
  const [formKategoria, setFormKategoria] = useState<TaskCategory>("egyeb")
  const [formReszletek, setFormReszletek] = useState("")
  const [formSaveAsTemplate, setFormSaveAsTemplate] = useState(false)

  // Sablonok betöltése a háttérből
  useEffect(() => {
    getTaskTemplates().then((res) => {
      if (res.success && res.templates && res.templates.length > 0) {
        setTemplates(res.templates)
      }
    })
  }, [])

  // Gyors határidő kalkulátor
  const setQuickDeadline = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    setFormHatarido(d.toISOString().split("T")[0])
  }

  // Új sablon in-place rögzítése a katalógusban
  const [newTplOpen, setNewTplOpen] = useState(false)
  const [newTplCim, setNewTplCim] = useState("")
  const [newTplKategoria, setNewTplKategoria] = useState<TaskCategory>("egyeb")
  const [newTplPrioritas, setNewTplPrioritas] = useState<TaskPriority>("normal")
  const [newTplHataridoNap, setNewTplHataridoNap] = useState(3)
  const [newTplLeiras, setNewTplLeiras] = useState("")
  const [newTplSaving, setNewTplSaving] = useState(false)

  const handleSaveInlineTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTplCim.trim()) {
      toast.error("Kérlek add meg a sablon megnevezését!")
      return
    }
    setNewTplSaving(true)
    try {
      const res = await saveTaskTemplate({
        cim: newTplCim.trim(),
        leiras: newTplLeiras.trim() || undefined,
        kategoria: newTplKategoria,
        prioritas: newTplPrioritas,
        alapertelmezett_hatarido_nap: Math.max(1, newTplHataridoNap || 1),
        isCustom: true,
      })
      if (res.success && res.template) {
        toast.success("Új feladatsablon sikeresen elmentve!")
        setTemplates((prev) => [res.template!, ...prev])
        setNewTplCim("")
        setNewTplLeiras("")
        setNewTplHataridoNap(3)
        setNewTplPrioritas("normal")
        setNewTplKategoria("egyeb")
        setNewTplOpen(false)
      } else {
        toast.error(res.error || "Hiba történt a sablon mentésekor.")
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba történt.")
    } finally {
      setNewTplSaving(false)
    }
  }

  // Törlés modal feladatsablonhoz
  const [deletingTemplate, setDeletingTemplate] = useState<{ id: string; title: string } | null>(null)
  const [deleteTemplateLoading, setDeleteTemplateLoading] = useState(false)

  const handleDeleteCustomTemplate = (tpl: TaskTemplate, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingTemplate({ id: tpl.id, title: tpl.cim })
  }

  const handleConfirmDeleteTemplate = async () => {
    if (!deletingTemplate) return
    setDeleteTemplateLoading(true)
    try {
      const res = await deleteCustomTaskTemplate(deletingTemplate.id)
      if (res.success) {
        toast.success("Feladatsablon sikeresen törölve.")
        setTemplates((prev) => prev.filter((t) => t.id !== deletingTemplate.id))
        setDeletingTemplate(null)
      } else {
        toast.error(res.error || "Nem sikerült törölni a sablont.")
      }
    } catch (err: any) {
      toast.error(err.message || "Hiba történt a sablon törlésekor.")
    } finally {
      setDeleteTemplateLoading(false)
    }
  }

  // Sablon alkalmazása az in-place űrlapba (0 felugró ablak!)
  const handleApplyTemplate = (tpl: TaskTemplate) => {
    setFormLeiras(tpl.cim)
    if (tpl.leiras) setFormReszletek(tpl.leiras)
    setFormKategoria(tpl.kategoria)
    setFormPrioritas(tpl.prioritas)
    setQuickDeadline(tpl.alapertelmezett_hatarido_nap || 3)
    setComposerOpen(true)
    toast.success(`„${tpl.cim}” sablon adatai sikeresen betöltve az űrlapba.`)
  }

  // Új feladat mentése
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formLeiras.trim()) {
      toast.error("A feladat megnevezése kötelező!")
      return
    }
    if (!formFelelos) {
      toast.error("Válasszon ki egy felelős munkatársat!")
      return
    }
    if (!formHatarido) {
      toast.error("Adjon meg határidőt a feladathoz!")
      return
    }

    setCreateLoading(true)
    try {
      const res = await createTask({
        ugyiratId,
        leiras: formLeiras.trim(),
        hatarido: new Date(formHatarido).toISOString(),
        felelos: formFelelos,
        prioritas: formPrioritas,
        kategoria: formKategoria,
        jegyzet: formReszletek.trim() || undefined,
      })

      if (res.success) {
        if (formSaveAsTemplate) {
          await saveTaskTemplate({
            cim: formLeiras.trim(),
            leiras: formReszletek.trim() || undefined,
            kategoria: formKategoria,
            prioritas: formPrioritas,
            alapertelmezett_hatarido_nap: 3,
            isCustom: true,
          })
        }

        toast.success("Feladat sikeresen rögzítve az ügyirathoz!")
        setFormLeiras("")
        setFormReszletek("")
        setFormHatarido("")
        setFormPrioritas("normal")
        setFormKategoria("egyeb")
        setFormSaveAsTemplate(false)
        router.refresh()
      } else {
        toast.error(res.error || "Hiba történt a feladat mentésekor.")
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba.")
    } finally {
      setCreateLoading(false)
    }
  }

  // Feladat statisztikák
  const totalTasks = taskList.length
  const completedTasks = taskList.filter((t) => t.allapot === "kesz").length
  const inProgressTasks = taskList.filter((t) => t.allapot === "folyamatban").length
  const rejectedTasks = taskList.filter((t) => t.allapot === "elutasitott").length
  const allTasksCompleted = totalTasks > 0 && completedTasks === totalTasks && rejectedTasks === 0
  const hasRejectedTasks = rejectedTasks > 0
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const handleAddComment = async () => {
    if (!commentText.trim()) return

    setCommentLoading(true)
    const { error } = await addComment(ugyiratId, commentText)
    setCommentLoading(false)

    if (error) {
      toast.error(error)
    } else {
      toast.success("Megjegyzés hozzáadva!")
      setCommentText("")
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setStatusLoading(newStatus)
    const { error } = await updateDossierStatus(ugyiratId, ugyId, newStatus)
    setStatusLoading(null)

    if (error) {
      toast.error(error)
    } else {
      toast.success("Állapot sikeresen módosítva!")
    }
  }

  const handleTaskStatusChange = async (
    taskId: string,
    newStatus: "nyitott" | "folyamatban" | "kesz" | "elutasitott",
    indoklas?: string
  ) => {
    setTaskLoading(taskId)

    // Optimista frissítés
    setTaskList((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, allapot: newStatus, indoklas: indoklas !== undefined ? indoklas : t.indoklas } : t
      )
    )

    if (status === "iktatva" && (newStatus === "folyamatban" || newStatus === "kesz")) {
      await updateDossierStatus(ugyiratId, ugyId, "ugyintezes_alatt")
    }

    const currentTask = taskList.find((t) => t.id === taskId)
    const result = await updateTaskStatus(taskId, newStatus, currentTask?.allapot as any, indoklas)
    setTaskLoading(null)

    if (result.success) {
      const statusLabels: Record<string, string> = {
        nyitott: "Nyitott",
        folyamatban: "Folyamatban",
        kesz: "Kész",
        elutasitott: "Elutasítva",
      }
      toast.success(`Feladat: ${statusLabels[newStatus]}`)
      router.refresh()
    } else {
      toast.error(result.error || "Hiba történt")
      setTaskList(tasks)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingTask) return

    setDeleteLoading(true)
    const res = await deleteTask(deletingTask.id)
    setDeleteLoading(false)

    if (res.success) {
      toast.success("Feladat sikeresen törölve!")
      setTaskList((prev) => prev.filter((t) => t.id !== deletingTask.id))
      setDeletingTask(null)
      router.refresh()
    } else {
      toast.error(res.error || "Hiba történt a feladat törlésekor.")
    }
  }

  // Népszerű sablonok a gyorsszalaghoz (Quick Ribbon)
  const quickRibbonTemplates = templates.slice(0, 5)

  // Szűrt sablonok a lenyitható katalógushoz
  const filteredCatalogTemplates = templates.filter(
    (t) => selectedTemplateCat === "all" || t.kategoria === selectedTemplateCat
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* ── BAL OSZLOP (65%): ÜGYIRATI FELADATOK MUNKAPAD ── */}
      <div className="lg:col-span-8 space-y-6">
        <Card className="border border-border/60">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">Ügyirati Feladatok</CardTitle>
                {totalTasks > 0 && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {completedTasks}/{totalTasks} kész
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Határidős munkafolyamat és feladatkiosztás az ügyiratban.
              </CardDescription>
            </div>

            {canEdit && (
              <Button
                size="sm"
                variant={composerOpen ? "secondary" : "outline"}
                onClick={() => setComposerOpen((prev) => !prev)}
                className="h-8 gap-1.5 text-xs cursor-pointer self-start sm:self-center"
              >
                {composerOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                <span>{composerOpen ? "Űrlap bezárása" : "Új feladat rögzítése"}</span>
              </Button>
            )}
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Progress bar – ha vannak feladatok */}
            {totalTasks > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {completedTasks}/{totalTasks} feladat lezárva
                    {inProgressTasks > 0 && (
                      <span className="text-info font-medium"> • {inProgressTasks} folyamatban</span>
                    )}
                    {rejectedTasks > 0 && (
                      <span className="text-destructive font-medium"> • {rejectedTasks} elutasítva</span>
                    )}
                  </span>
                  <span
                    className={`font-semibold tabular-nums text-xs ${
                      allTasksCompleted ? "text-success" : "text-muted-foreground"
                    }`}
                  >
                    {progressPercent}%
                  </span>
                </div>
                <Progress value={progressPercent} className="h-1.5" />
              </div>
            )}

            {/* Elutasított feladat figyelmeztető banner */}
            {hasRejectedTasks && (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2.5 text-xs">
                <Ban className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold block">
                    Elutasított feladat az ügyiratban ({rejectedTasks} db)
                  </span>
                  <p className="text-muted-foreground leading-relaxed">
                    Az ügyiratban elutasított feladat található, ami akadályozza a lezárást. Kérjük vizsgálja felül a feladatot!
                  </p>
                </div>
              </div>
            )}

            {/* Siker banner: minden feladat kész */}
            {allTasksCompleted && status !== "elintezett" && status !== "lezart" && status !== "irattarban" && (
              <div className="p-3 rounded-lg border border-success/30 bg-success/5 text-foreground flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  <span>
                    <strong>Minden feladat sikeresen lezárult ({completedTasks}/{totalTasks}).</strong> Az ügyirat elintézhető.
                  </span>
                </div>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange("elintezett")}
                    disabled={statusLoading !== null}
                    className="h-7 text-xs border-success/40 text-success hover:bg-success/10 cursor-pointer"
                  >
                    {statusLoading === "elintezett" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    Ügyirat elintézése
                  </Button>
                )}
              </div>
            )}

            {/* ── KÖZVETLEN BEÁGYAZOTT FELADATFELVÉTEL ÉS SABLONSZALAG (DOC-TASK-01) ── */}
            {canEdit && composerOpen && (
              <div className="p-4 rounded-xl border border-primary/20 bg-muted/20 space-y-4 transition-all">
                {/* 1. Gyors Sablonszalag (Quick Ribbon) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-primary" />
                      Gyors sablonok (1-kattintásos kitöltés)
                    </Label>
                    <button
                      type="button"
                      onClick={() => setCatalogOpen((prev) => !prev)}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Layers className="h-3 w-3" />
                      <span>{catalogOpen ? "Katalógus elrejtése" : `Összes sablon (${templates.length})`}</span>
                    </button>
                  </div>

                  {/* Vízszintes sablon chipek */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {quickRibbonTemplates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleApplyTemplate(t)}
                        className="px-2.5 py-1 rounded-md text-xs border border-border/80 bg-background hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
                        title={t.leiras || t.cim}
                      >
                        <span className="font-medium">{t.cim}</span>
                      </button>
                    ))}
                  </div>

                  {/* Lenyitható Sablonkatalógus Panel (ha a felhasználó kéri) */}
                  {catalogOpen && (
                    <div className="mt-3 p-3.5 rounded-lg border border-border/80 bg-card space-y-3.5">
                      {/* Fejléc: Cím és Új sablon gomb */}
                      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-semibold text-foreground">Vállalati Feladatsablonok</span>
                          <span className="text-[10px] text-muted-foreground">({templates.length} elérhető)</span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={newTplOpen ? "secondary" : "outline"}
                          onClick={() => setNewTplOpen(!newTplOpen)}
                          className="h-7 text-xs gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          <span>{newTplOpen ? "Űrlap bezárása" : "Új sablon rögzítése"}</span>
                        </Button>
                      </div>

                      {/* Új Sablon In-Place Űrlap (0 Popup!) */}
                      {newTplOpen && (
                        <form onSubmit={handleSaveInlineTemplate} className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-primary">Új feladatsablon létrehozása</span>
                            <span className="text-[10px] text-muted-foreground">Mentés után azonnal elérhető a gyors szalagban</span>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium">
                              Sablon megnevezése <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              value={newTplCim}
                              onChange={(e) => setNewTplCim(e.target.value)}
                              placeholder="Pl. Szerződéstervezet jogi ellenjegyzése"
                              className="h-8 text-xs bg-background"
                              autoFocus
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[11px] font-medium">Kategória</Label>
                              <Select value={newTplKategoria} onValueChange={(val: any) => setNewTplKategoria(val)}>
                                <SelectTrigger className="h-8 text-xs bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TASK_CATEGORIES.map((c) => (
                                    <SelectItem key={c.id} value={c.id} className="text-xs">
                                      {c.nev || c.shortLabel}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-medium">Prioritás</Label>
                              <Select value={newTplPrioritas} onValueChange={(val: any) => setNewTplPrioritas(val)}>
                                <SelectTrigger className="h-8 text-xs bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TASK_PRIORITIES.map((p) => (
                                    <SelectItem key={p.id} value={p.id} className="text-xs">
                                      {p.nev}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] font-medium">Határidő (munkanap)</Label>
                              <Input
                                type="number"
                                min={1}
                                max={90}
                                value={newTplHataridoNap}
                                onChange={(e) => setNewTplHataridoNap(parseInt(e.target.value) || 1)}
                                className="h-8 text-xs bg-background"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium">Alapértelmezett leírás / instrukció (opcionális)</Label>
                            <Textarea
                              value={newTplLeiras}
                              onChange={(e) => setNewTplLeiras(e.target.value)}
                              placeholder="Feladat részletes teendői, szükséges dokumentumok listája..."
                              rows={2}
                              className="text-xs bg-background"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setNewTplOpen(false)}
                              className="h-7 text-xs cursor-pointer"
                            >
                              Mégse
                            </Button>
                            <Button
                              type="submit"
                              size="sm"
                              disabled={newTplSaving || !newTplCim.trim()}
                              className="h-7 text-xs bg-primary text-primary-foreground gap-1 cursor-pointer"
                            >
                              {newTplSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              <span>Sablon mentése</span>
                            </Button>
                          </div>
                        </form>
                      )}

                      {/* Kategória szűrő gombok */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                        <button
                          type="button"
                          onClick={() => setSelectedTemplateCat("all")}
                          className={`px-2 py-0.5 rounded border text-[11px] font-medium transition-colors cursor-pointer ${
                            selectedTemplateCat === "all"
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border/70 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          Összes
                        </button>
                        {TASK_CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedTemplateCat(cat.id)}
                            className={`px-2 py-0.5 rounded border text-[11px] font-medium transition-colors cursor-pointer ${
                              selectedTemplateCat === cat.id
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border/70 text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {cat.nev || cat.shortLabel}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                        {filteredCatalogTemplates.map((tpl) => (
                          <div
                            key={tpl.id}
                            onClick={() => handleApplyTemplate(tpl)}
                            className="group p-2.5 rounded-md border border-border/60 hover:border-primary/50 bg-background hover:bg-primary/5 transition-colors cursor-pointer flex flex-col justify-between gap-1 relative"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-foreground line-clamp-1">
                                {tpl.cim}
                              </span>
                              {tpl.isCustom && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCustomTemplate(tpl, e)}
                                  title="Egyedi sablon törlése"
                                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity cursor-pointer shrink-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground line-clamp-2">
                              {tpl.leiras || "Nincs részletes leírás."}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Beágyazott Űrlap */}
                <form onSubmit={handleCreateTask} className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <Label htmlFor="taskLeiras" className="text-xs font-semibold">
                      Feladat megnevezése <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="taskLeiras"
                      value={formLeiras}
                      onChange={(e) => setFormLeiras(e.target.value)}
                      placeholder="Pl. Számla alaki ellenőrzése és jóváhagyása..."
                      className="text-xs h-9 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    {/* Felelős */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">
                        Felelős <span className="text-destructive">*</span>
                      </Label>
                      <Select value={formFelelos} onValueChange={(val) => setFormFelelos(val || "")}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Válassz felelőst..." />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id} className="text-xs">
                              {u.nev || u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Határidő */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">
                          Határidő <span className="text-destructive">*</span>
                        </Label>
                        <div className="flex items-center gap-1 text-[10px] text-primary">
                          <button
                            type="button"
                            onClick={() => setQuickDeadline(2)}
                            className="hover:underline cursor-pointer"
                          >
                            +2 nap
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => setQuickDeadline(7)}
                            className="hover:underline cursor-pointer"
                          >
                            +1 hét
                          </button>
                        </div>
                      </div>
                      <Input
                        type="date"
                        value={formHatarido}
                        onChange={(e) => setFormHatarido(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>

                    {/* Prioritás */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Prioritás</Label>
                      <Select
                        value={formPrioritas}
                        onValueChange={(val: any) => setFormPrioritas(val)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_PRIORITIES.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs">
                              {p.nev}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Kategória */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Kategória</Label>
                      <Select
                        value={formKategoria}
                        onValueChange={(val: any) => setFormKategoria(val)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_CATEGORIES.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.nev || c.shortLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Részletes munkautasítás */}
                  <div className="space-y-1">
                    <Label htmlFor="taskReszletek" className="text-xs font-medium text-muted-foreground">
                      Részletes munkautasítás vagy megjegyzés (opcionális)
                    </Label>
                    <Textarea
                      id="taskReszletek"
                      value={formReszletek}
                      onChange={(e) => setFormReszletek(e.target.value)}
                      placeholder="Pl. Kérjük ellenőrizni az adószámot és a teljesítésigazolást..."
                      rows={2}
                      className="text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="saveAsTpl"
                        checked={formSaveAsTemplate}
                        onChange={(e) => setFormSaveAsTemplate(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                      />
                      <Label htmlFor="saveAsTpl" className="text-xs font-normal text-muted-foreground cursor-pointer">
                        Mentés új feladatsablonként a jövőbeni gyors használathoz
                      </Label>
                    </div>

                    <Button
                      type="submit"
                      size="sm"
                      disabled={createLoading || !formLeiras.trim()}
                      className="h-8 gap-1.5 text-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {createLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Rögzítés...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>Feladat rögzítése</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* ── FELADATOK LISTÁJA ── */}
            {taskList.length === 0 ? (
              <div className="py-8 text-center border border-dashed rounded-lg bg-muted/20">
                <Sparkles className="h-6 w-6 text-muted-foreground/60 mx-auto mb-2" />
                <p className="text-xs font-medium text-foreground">Még nincsenek feladatok rögzítve.</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Válassz egy sablont a fenti szalagból vagy írj be egy egyedi teendőt!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {taskList.map((task) => {
                  const meta = parseTaskMetadata(task)
                  const isKesz = task.allapot === "kesz"
                  const isElutasitott = task.allapot === "elutasitott"
                  const isFolyamatban = task.allapot === "folyamatban"

                  const catConfig = CATEGORY_CONFIG[meta.kategoria]
                  const prioConfig = PRIORITY_CONFIG[meta.prioritas]

                  const deadlineDate = task.hatarido ? new Date(task.hatarido) : null
                  const now = new Date()
                  now.setHours(0, 0, 0, 0)
                  const isOverdue = !!deadlineDate && deadlineDate < now && !isKesz && !isElutasitott

                  const assignee = users.find((u) => u.id === task.felelos_user_id)
                  const assigneeName = assignee?.nev || assignee?.email || "Nincs megadva"

                  return (
                    <div
                      key={task.id}
                      className={`group relative flex flex-col md:flex-row md:items-start justify-between gap-3 p-3.5 rounded-lg border transition-all ${
                        isKesz
                          ? "border-border/40 bg-muted/20 opacity-80"
                          : isElutasitott
                          ? "border-destructive/30 bg-destructive/[0.02]"
                          : isFolyamatban
                          ? "border-info/30 bg-info/[0.02]"
                          : "border-border/70 hover:border-primary/40 bg-card hover:bg-muted/10"
                      }`}
                    >
                      {/* Bal oldali rész: Gyors állapot toggle + Tartalom */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          disabled={!canEdit || taskLoading === task.id}
                          onClick={() => {
                            if (isKesz) {
                              handleTaskStatusChange(task.id, "nyitott")
                            } else if (isElutasitott) {
                              handleTaskStatusChange(task.id, "nyitott")
                            } else {
                              handleTaskStatusChange(task.id, "kesz")
                            }
                          }}
                          title={
                            isKesz
                              ? "Kész (kattints az újranyitáshoz)"
                              : isElutasitott
                              ? "Elutasított (kattints az újranyitáshoz)"
                              : "Kattints a készre jelöléshez"
                          }
                          className={`mt-0.5 shrink-0 h-5 w-5 rounded-md flex items-center justify-center border transition-all cursor-pointer ${
                            isKesz
                              ? "bg-success border-success text-success-foreground"
                              : isElutasitott
                              ? "border-destructive/60 text-destructive bg-destructive/10 hover:bg-destructive/20"
                              : isFolyamatban
                              ? "border-info text-info bg-info/10 hover:bg-success hover:border-success hover:text-success-foreground"
                              : "border-muted-foreground/40 hover:border-primary hover:bg-primary/10 text-transparent hover:text-primary"
                          }`}
                        >
                          {taskLoading === task.id ? (
                            <Loader2 className="h-3 w-3 animate-spin text-current" />
                          ) : isKesz ? (
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          ) : isElutasitott ? (
                            <X className="h-3.5 w-3.5 stroke-[2.5]" />
                          ) : isFolyamatban ? (
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                          ) : (
                            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`font-semibold text-sm leading-snug ${
                                isKesz
                                  ? "line-through text-muted-foreground"
                                  : isElutasitott
                                  ? "text-muted-foreground/80 line-through"
                                  : "text-foreground"
                              }`}
                            >
                              {meta.displayTitle}
                            </span>

                            {catConfig && meta.kategoria !== "egyeb" && (
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${catConfig.badgeClass}`}>
                                {catConfig.shortLabel}
                              </span>
                            )}

                            {prioConfig && (meta.prioritas === "surgos" || meta.prioritas === "magas") && (
                              <span
                                className={`text-[10px] font-medium px-2 py-0.5 rounded border flex items-center gap-1.5 ${prioConfig.badgeClass}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${prioConfig.dotClass}`} />
                                {prioConfig.label}
                              </span>
                            )}
                          </div>

                          {meta.reszletek && (
                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed bg-muted/40 border border-border/50 rounded-md px-2.5 py-1.5 line-clamp-2">
                              {meta.reszletek}
                            </p>
                          )}

                          {isElutasitott && (
                            <div className="mt-2 flex items-start gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
                              <Ban className="h-3.5 w-3.5 shrink-0 mt-0.5 text-destructive" />
                              <div className="space-y-0.5">
                                <span className="font-semibold text-[11px] block">Elutasítás indoklása:</span>
                                <p className="text-foreground italic text-xs leading-relaxed">
                                  „{task.indoklas || meta.indoklas || "Téves szignálás"}”
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded border border-border/40 text-[11px]">
                              <User className="h-3 w-3 text-muted-foreground/70" />
                              <span>
                                Felelős: <strong className="text-foreground">{assigneeName}</strong>
                              </span>
                            </div>

                            <div
                              className={`flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded border border-border/40 text-[11px] ${
                                isOverdue ? "border-destructive/40 text-destructive font-medium bg-destructive/5" : ""
                              }`}
                            >
                              <Calendar className="h-3 w-3 text-muted-foreground/70" />
                              <span>
                                Határidő:{" "}
                                {deadlineDate ? deadlineDate.toLocaleDateString("hu-HU") : "Nincs megadva"}
                                {isOverdue && " • Lejárt!"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Jobb oldali Műveletek */}
                      <div className="flex items-center gap-2 shrink-0 self-start md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
                        <TaskStatusBadge allapot={task.allapot} />

                        {!isKesz && !isElutasitott && canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTaskStatusChange(task.id, "kesz")}
                            disabled={taskLoading === task.id}
                            className="h-8 text-xs gap-1 text-success border-success/30 hover:bg-success/10 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Kész</span>
                          </Button>
                        )}

                        {canEdit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className="inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-md border border-border/70 hover:border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors cursor-pointer"
                              disabled={taskLoading === task.id}
                              title="Műveletek"
                            >
                              {taskLoading === task.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <span>Kezelés</span>
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </>
                              )}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              {!isFolyamatban && !isKesz && (
                                <DropdownMenuItem
                                  onClick={() => handleTaskStatusChange(task.id, "folyamatban")}
                                  className="text-xs cursor-pointer"
                                >
                                  <ArrowRight className="mr-2 h-3.5 w-3.5 text-info" />
                                  Folyamatban
                                </DropdownMenuItem>
                              )}

                              {!isKesz && (
                                <DropdownMenuItem
                                  onClick={() => handleTaskStatusChange(task.id, "kesz")}
                                  className="text-xs cursor-pointer"
                                >
                                  <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-success" />
                                  Készre jelentés
                                </DropdownMenuItem>
                              )}

                              {(isKesz || isElutasitott) && (
                                <DropdownMenuItem
                                  onClick={() => handleTaskStatusChange(task.id, "nyitott")}
                                  className="text-xs cursor-pointer"
                                >
                                  <RotateCcw className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                  {isElutasitott ? "Újranyitás / Visszaállítás" : "Visszaállítás nyitottra"}
                                </DropdownMenuItem>
                              )}

                              {!isElutasitott && (
                                <DropdownMenuItem
                                  onClick={() => setRejectingTask({ id: task.id, title: meta.displayTitle })}
                                  className="text-xs text-warning cursor-pointer"
                                >
                                  <Ban className="mr-2 h-3.5 w-3.5 text-warning" />
                                  Elutasítás indoklással...
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeletingTask({ id: task.id, title: meta.displayTitle })}
                                className="text-xs text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-medium"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5 text-destructive" />
                                Feladat törlése
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── JOBB OSZLOP (35%): BELSŐ MEGJEGYZÉSEK (TEAM CHAT) ── */}
      <div className="lg:col-span-4 sticky top-6">
        <Card className="flex flex-col h-[650px] border border-border/60">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Belső Megjegyzések
              </CardTitle>
              {comments.length > 0 && (
                <Badge variant="outline" className="text-xs font-normal">
                  {comments.length}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Csapatmegjegyzések és @említések az ügyirathoz.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto space-y-3.5 p-4">
            {comments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-xs font-medium">Még nincsenek belső megjegyzések.</p>
                <p className="text-[11px] mt-0.5">Írj egy észrevételt vagy említs meg egy kollégát a @ jellel!</p>
              </div>
            ) : (
              comments.map((comment) => {
                const isMine = comment.user_email === currentUserEmail
                const mentionParts = renderMentionText(comment.szoveg, users)
                return (
                  <div
                    key={comment.id}
                    className={`flex flex-col ${isMine ? "items-end" : "items-start"} gap-1`}
                  >
                    <span className="text-[10px] text-muted-foreground px-1">
                      {comment.user_name || comment.user_email} •{" "}
                      {new Date(comment.created_at).toLocaleString("hu-HU", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <div
                      className={`px-3.5 py-2 rounded-2xl max-w-[90%] text-xs leading-relaxed ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted text-foreground border border-border/50 rounded-tl-sm"
                      }`}
                    >
                      {Array.isArray(mentionParts)
                        ? mentionParts.map((part, i) =>
                            typeof part === "string" ? (
                              <span key={i}>{part}</span>
                            ) : (
                              <span
                                key={i}
                                className={`font-semibold ${
                                  isMine ? "text-primary-foreground underline" : "text-primary font-bold"
                                }`}
                              >
                                @{part.name}
                              </span>
                            )
                          )
                        : mentionParts}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>

          <div className="p-3 border-t border-border/40 bg-muted/20">
            <div className="flex gap-2">
              <MentionInput
                users={users}
                value={commentText}
                onChange={setCommentText}
                onSubmit={handleAddComment}
                placeholder="Írj egy megjegyzést... (@-tal említhetsz)"
                disabled={!canEdit || commentLoading}
              />
              <Button
                type="button"
                onClick={handleAddComment}
                disabled={!commentText.trim() || !canEdit || commentLoading}
                className="gap-1.5 cursor-pointer shrink-0 h-9 px-3"
              >
                {commentLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Küldés</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Törlés megerősítő párbeszédablak */}
      <Dialog open={!!deletingTask} onOpenChange={(open) => !open && setDeletingTask(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive font-semibold">
              <Trash2 className="h-5 w-5" />
              <DialogTitle className="text-base font-semibold">Feladat törlése</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-2">
              Biztosan törölni szeretnéd a következő ügyirati feladatot?
              {deletingTask && (
                <span className="block font-medium text-foreground mt-1.5 p-2 rounded-md bg-muted/50 border text-xs">
                  „{deletingTask.title}”
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-3 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingTask(null)}
              disabled={deleteLoading}
            >
              Mégse
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Törlés...
                </>
              ) : (
                "Törlés megerősítése"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feladatsablon törlése megerősítő modál (0 window.confirm!) */}
      <Dialog open={!!deletingTemplate} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <DialogTitle className="text-base font-semibold">Feladatsablon törlése</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-2">
              Biztosan törölni szeretnéd a következő egyedi feladatsablont a vállalati sablontárból?
              {deletingTemplate && (
                <span className="block font-medium text-foreground mt-1.5 p-2 rounded-md bg-muted/50 border text-xs">
                  „{deletingTemplate.title}”
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-3 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingTemplate(null)}
              disabled={deleteTemplateLoading}
            >
              Mégse
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDeleteTemplate}
              disabled={deleteTemplateLoading}
            >
              {deleteTemplateLoading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Törlés...
                </>
              ) : (
                "Törlés megerősítése"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Elutasítás indoklással modál */}
      <TaskRejectDialog
        open={!!rejectingTask}
        taskId={rejectingTask?.id || null}
        taskTitle={rejectingTask?.title}
        onOpenChange={(isOpen) => !isOpen && setRejectingTask(null)}
        onSuccess={(savedReason) => {
          if (rejectingTask) {
            setTaskList((prev) =>
              prev.map((t) =>
                t.id === rejectingTask.id
                  ? {
                      ...t,
                      allapot: "elutasitott",
                      indoklas: savedReason || t.indoklas,
                    }
                  : t
              )
            )
            setRejectingTask(null)
            router.refresh()
          }
        }}
      />
    </div>
  )
}

function TaskStatusBadge({ allapot }: { allapot: string }) {
  switch (allapot) {
    case "nyitott":
      return (
        <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground font-normal">
          Nyitott
        </Badge>
      )
    case "folyamatban":
      return (
        <Badge variant="outline" className="text-xs border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium">
          Folyamatban
        </Badge>
      )
    case "kesz":
      return (
        <Badge variant="outline" className="text-xs border-success/40 bg-success/10 text-success font-medium">
          Kész
        </Badge>
      )
    case "elutasitott":
      return (
        <Badge variant="outline" className="text-xs border-destructive/40 bg-destructive/10 text-destructive font-medium">
          Elutasítva
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {allapot}
        </Badge>
      )
  }
}
