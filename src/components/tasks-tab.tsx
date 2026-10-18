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
  ArrowLeft,
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
  Search,
  FileText,
  ClipboardList,
  Archive,
} from "lucide-react"
import { toast } from "sonner"
import { updateDossierStatus } from "@/app/dossiers/[id]/actions"
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
import { KpiCard } from "./kpi-card"
import { TableToolbar, TableColumnOption } from "./table-toolbar/table-toolbar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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

/** Ennyi idő után kerül egy „Kész” feladat automatikusan az „Elvégzett feladatok” szekcióba. */
const COMPLETED_ARCHIVE_AFTER_MS = 24 * 60 * 60 * 1000

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
  updated_at?: string
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
  tasks: UgyiratTaskItem[]
  users: UserSelectItem[]
  canEdit: boolean
  iktatoszam?: string
}

export function TasksTab({
  ugyiratId,
  ugyId,
  status,
  tasks,
  users,
  canEdit,
  iktatoszam,
}: TasksTabProps) {
  const router = useRouter()

  const [statusLoading, setStatusLoading] = useState<string | null>(null)
  const [taskLoading, setTaskLoading] = useState<string | null>(null)

  // Táblázat szűrők, oszlopok és részletpanel állapota
  const [taskSearch, setTaskSearch] = useState("")
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [priorityFilters, setPriorityFilters] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [showCompleted, setShowCompleted] = useState(false)
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null)
  const [taskColumns, setTaskColumns] = useState<TableColumnOption[]>([
    { id: "felelos", label: "Felelős", isVisible: true },
    { id: "hatarido", label: "Határidő", isVisible: true },
    { id: "prioritas", label: "Prioritás", isVisible: true },
    { id: "allapot", label: "Állapot", isVisible: true },
    { id: "kategoria", label: "Kategória", isVisible: false },
  ])

  // Helyi optimista feladatlista
  const [taskList, setTaskList] = useState<UgyiratTaskItem[]>(tasks)
  useEffect(() => {
    setTaskList(tasks)
  }, [tasks])

  // Törlés és elutasítás modálok állapota
  const [deletingTask, setDeletingTask] = useState<{ id: string; title: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [rejectingTask, setRejectingTask] = useState<{ id: string; title: string } | null>(null)

  // ── 3 LÉPÉSES FELADAT VARÁZSLÓ DIALÓGUS ÁLLAPOT (WIZARD) ──
  type WizardStep = 1 | 2 | 3
  const [wizardOpen, setWizardOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [templateSearch, setTemplateSearch] = useState("")
  const [selectedTemplateCat, setSelectedTemplateCat] = useState<string>("all")
  const [templates, setTemplates] = useState<TaskTemplate[]>(DEFAULT_TASK_TEMPLATES)
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

  // Varázsló állapot alaphelyzetbe állítása
  const resetWizard = () => {
    setCurrentStep(1)
    setSelectedTemplateId(null)
    setTemplateSearch("")
    setSelectedTemplateCat("all")
    setFormLeiras("")
    setFormFelelos("")
    setFormHatarido("")
    setFormPrioritas("normal")
    setFormKategoria("egyeb")
    setFormReszletek("")
    setFormSaveAsTemplate(false)
    setNewTplOpen(false)
  }

  // Sablon kiválasztása a varázsló 1. lépésében
  const handleSelectTemplate = (tpl: TaskTemplate) => {
    setSelectedTemplateId(tpl.id)
    setFormLeiras(tpl.cim)
    if (tpl.leiras) setFormReszletek(tpl.leiras)
    setFormKategoria(tpl.kategoria)
    setFormPrioritas(tpl.prioritas)
    setQuickDeadline(tpl.alapertelmezett_hatarido_nap || 3)
  }

  // Egyedi feladat (sablon nélkül) kiválasztása
  const handleSelectCustomTask = () => {
    setSelectedTemplateId(null)
    setFormLeiras("")
    setFormReszletek("")
    setFormKategoria("egyeb")
    setFormPrioritas("normal")
    setQuickDeadline(3)
  }

  // Új sablon in-place rögzítése a varázslóban
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
        handleSelectTemplate(res.template!)
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
        if (selectedTemplateId === deletingTemplate.id) {
          setSelectedTemplateId(null)
        }
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

  // Új feladat véglegesítése a varázslóból
  const handleSubmitWizardTask = async () => {
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
        resetWizard()
        setWizardOpen(false)
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
        t.id === taskId
          ? {
              ...t,
              allapot: newStatus,
              updated_at: new Date().toISOString(),
              indoklas: indoklas !== undefined ? indoklas : t.indoklas,
            }
          : t
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

  // Szűrt sablonok a feladat varázslóhoz
  const filteredTemplates = templates.filter((t) => {
    const matchesCat = selectedTemplateCat === "all" || t.kategoria === selectedTemplateCat
    const matchesSearch =
      !templateSearch.trim() ||
      t.cim.toLowerCase().includes(templateSearch.toLowerCase()) ||
      (t.leiras && t.leiras.toLowerCase().includes(templateSearch.toLowerCase()))
    return matchesCat && matchesSearch
  })

  // ── Feladattábla adatai: szűrés, rendezés, 24 órás automatikus archiválás ──
  const nowMs = Date.now()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const buildTaskView = (task: UgyiratTaskItem) => {
    const meta = parseTaskMetadata(task)
    const deadlineDate = task.hatarido ? new Date(task.hatarido) : null
    const isKesz = task.allapot === "kesz"
    const isElutasitott = task.allapot === "elutasitott"
    const isFolyamatban = task.allapot === "folyamatban"
    const isOverdue = !!deadlineDate && deadlineDate < todayStart && !isKesz && !isElutasitott
    const assignee = users.find((u) => u.id === task.felelos_user_id)
    const assigneeName = assignee?.nev || assignee?.email || "Nincs megadva"
    return {
      meta,
      deadlineDate,
      isKesz,
      isElutasitott,
      isFolyamatban,
      isOverdue,
      assigneeName,
      catConfig: CATEGORY_CONFIG[meta.kategoria],
      prioConfig: PRIORITY_CONFIG[meta.prioritas],
    }
  }

  const getInitials = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "?"

  const matchesTaskFilters = (task: UgyiratTaskItem) => {
    const v = buildTaskView(task)
    const q = taskSearch.trim().toLowerCase()
    if (q) {
      const assignee = users.find((u) => u.id === task.felelos_user_id)
      const haystack = [v.meta.displayTitle, v.meta.reszletek, assignee?.nev, assignee?.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!haystack.includes(q)) return false
    }
    if (statusFilters.length > 0 && !statusFilters.includes(task.allapot)) return false
    if (priorityFilters.length > 0 && !priorityFilters.includes(v.meta.prioritas)) return false
    if (dateFrom || dateTo) {
      const d = task.hatarido ? task.hatarido.slice(0, 10) : ""
      if (!d) return false
      if (dateFrom && d < dateFrom) return false
      if (dateTo && d > dateTo) return false
    }
    return true
  }

  // A „Kész” feladat 24 óra után automatikusan az „Elvégzett feladatok” szekcióba kerül
  const isArchivedTask = (task: UgyiratTaskItem) =>
    task.allapot === "kesz" &&
    !!task.updated_at &&
    nowMs - new Date(task.updated_at).getTime() > COMPLETED_ARCHIVE_AFTER_MS

  const statusRank: Record<string, number> = { elutasitott: 0, folyamatban: 1, nyitott: 2, kesz: 3 }
  const filteredTasks = taskList.filter(matchesTaskFilters)
  const activeTasks = filteredTasks
    .filter((t) => !isArchivedTask(t))
    .sort((a, b) => {
      const rankDiff = (statusRank[a.allapot] ?? 2) - (statusRank[b.allapot] ?? 2)
      if (rankDiff !== 0) return rankDiff
      return new Date(a.hatarido || 0).getTime() - new Date(b.hatarido || 0).getTime()
    })
  const archivedTasks = filteredTasks
    .filter(isArchivedTask)
    .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
  const totalArchived = taskList.filter(isArchivedTask).length

  // KPI értékek
  const openCount = taskList.filter((t) => t.allapot === "nyitott").length
  const overdueCount = taskList.filter((t) => buildTaskView(t).isOverdue).length

  // Oszlopok és szűrők a kanonikus TableToolbar-hoz
  const isColVisible = (id: string) => taskColumns.find((c) => c.id === id)?.isVisible ?? true
  const visibleOptionalCols = taskColumns.filter((c) => c.isVisible).length
  const toggleTaskColumn = (id: string) =>
    setTaskColumns((prev) => prev.map((c) => (c.id === id ? { ...c, isVisible: !c.isVisible } : c)))
  const toggleInList = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id]

  const taskFilterGroups = [
    {
      id: "allapot",
      title: "Állapot",
      options: [
        { id: "nyitott", label: "Nyitott", checked: statusFilters.includes("nyitott") },
        { id: "folyamatban", label: "Folyamatban", checked: statusFilters.includes("folyamatban") },
        { id: "kesz", label: "Kész", checked: statusFilters.includes("kesz") },
        { id: "elutasitott", label: "Elutasítva", checked: statusFilters.includes("elutasitott") },
      ],
      onToggle: (id: string) => setStatusFilters((prev) => toggleInList(prev, id)),
    },
    {
      id: "prioritas",
      title: "Prioritás",
      options: Object.entries(PRIORITY_CONFIG).map(([id, cfg]) => ({
        id,
        label: cfg.label,
        checked: priorityFilters.includes(id),
      })),
      onToggle: (id: string) => setPriorityFilters((prev) => toggleInList(prev, id)),
    },
  ]

  const openWizard = () => {
    resetWizard()
    setWizardOpen(true)
  }

  // Feladat kezelő menü (táblázat sorok)
  const renderTaskMenu = (task: UgyiratTaskItem, v: ReturnType<typeof buildTaskView>) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border/70 hover:border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        disabled={taskLoading === task.id}
        title="Kezelés"
      >
        {taskLoading === task.id ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MoreVertical className="h-4 w-4" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {!v.isFolyamatban && !v.isKesz && (
          <DropdownMenuItem
            onClick={() => handleTaskStatusChange(task.id, "folyamatban")}
            className="text-xs cursor-pointer"
          >
            <ArrowRight className="mr-2 h-3.5 w-3.5 text-info" />
            Folyamatban
          </DropdownMenuItem>
        )}

        {!v.isKesz && (
          <DropdownMenuItem
            onClick={() => handleTaskStatusChange(task.id, "kesz")}
            className="text-xs cursor-pointer"
          >
            <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-success" />
            Készre jelentés
          </DropdownMenuItem>
        )}

        {(v.isKesz || v.isElutasitott) && (
          <DropdownMenuItem
            onClick={() => handleTaskStatusChange(task.id, "nyitott")}
            className="text-xs cursor-pointer"
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            {v.isElutasitott ? "Újranyitás / Visszaállítás" : "Visszaállítás nyitottra"}
          </DropdownMenuItem>
        )}

        {!v.isElutasitott && (
          <DropdownMenuItem
            onClick={() => setRejectingTask({ id: task.id, title: v.meta.displayTitle })}
            className="text-xs text-warning cursor-pointer"
          >
            <Ban className="mr-2 h-3.5 w-3.5 text-warning" />
            Elutasítás indoklással...
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setDeletingTask({ id: task.id, title: v.meta.displayTitle })}
          className="text-xs text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-medium"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5 text-destructive" />
          Feladat törlése
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  // Részletpanelen megnyitott feladat (a helyi, optimista listából, hogy mindig friss legyen)
  const detailTask = detailTaskId ? taskList.find((t) => t.id === detailTaskId) || null : null
  const detailView = detailTask ? buildTaskView(detailTask) : null

  return (
    <div className="space-y-4">
      {/* ── ÜGYIRATI FELADATOK: teljes szélességű munkapad (a Válaszlevelek fül mintájára) ── */}
      <Card className="border border-border/60">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Ügyirati feladatok</CardTitle>
              {totalTasks > 0 && (
                <Badge variant="outline" className="text-xs font-normal tabular-nums">
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
              onClick={openWizard}
              className="h-8 gap-1.5 text-xs cursor-pointer self-start sm:self-center bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Új feladat kiadása</span>
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
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

          {totalTasks === 0 ? (
            /* ── ÜRES ÁLLAPOT (a Válaszlevelek fül mintájára) ── */
            <div className="py-12 text-center border border-dashed rounded-lg bg-muted/20 space-y-3">
              <ClipboardList className="h-6 w-6 text-muted-foreground/60 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-foreground">Még nincsenek feladatok rögzítve ebben az ügyiratban.</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
                  Kattintson az „Új feladat kiadása” gombra feladatsablon választásához vagy egyedi teendő felvételéhez.
                </p>
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={openWizard}
                  className="h-8 gap-1.5 text-xs cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Feladat kiadása most</span>
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* KPI sáv */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label="Nyitott" value={openCount} sub="Még nem megkezdett feladat" />
                <KpiCard label="Folyamatban" value={inProgressTasks} sub="Jelenleg dolgoznak rajta" />
                <KpiCard
                  label="Lejárt"
                  value={overdueCount}
                  sub="Határidő túllépve"
                  highlight={overdueCount > 0}
                />
                <KpiCard
                  label="Elvégzett"
                  value={completedTasks}
                  sub={`${completedTasks}/${totalTasks} feladat · ${progressPercent}%`}
                />
              </div>

              {/* Kanonikus TableToolbar */}
              <TableToolbar
                searchValue={taskSearch}
                onSearchChange={setTaskSearch}
                searchPlaceholder="Keresés a feladatok között..."
                columns={taskColumns}
                onToggleColumn={toggleTaskColumn}
                dateRange={{
                  from: dateFrom,
                  to: dateTo,
                  onFromChange: setDateFrom,
                  onToChange: setDateTo,
                }}
                filterGroups={taskFilterGroups}
                activeFiltersCount={statusFilters.length + priorityFilters.length}
                onClearFilters={() => {
                  setStatusFilters([])
                  setPriorityFilters([])
                }}
              />

              {/* Aktív feladatok táblázata */}
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/30">
                      <TableHead className="w-10 pl-3" />
                      <TableHead className="text-xs text-muted-foreground">Feladat</TableHead>
                      {isColVisible("kategoria") && (
                        <TableHead className="text-xs text-muted-foreground">Kategória</TableHead>
                      )}
                      {isColVisible("felelos") && (
                        <TableHead className="text-xs text-muted-foreground">Felelős</TableHead>
                      )}
                      {isColVisible("hatarido") && (
                        <TableHead className="text-xs text-muted-foreground">Határidő</TableHead>
                      )}
                      {isColVisible("prioritas") && (
                        <TableHead className="text-xs text-muted-foreground">Prioritás</TableHead>
                      )}
                      {isColVisible("allapot") && (
                        <TableHead className="text-xs text-muted-foreground">Állapot</TableHead>
                      )}
                      <TableHead className="text-xs text-muted-foreground text-right pr-3">Műveletek</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeTasks.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell
                          colSpan={3 + visibleOptionalCols}
                          className="py-8 text-center text-xs text-muted-foreground"
                        >
                          {filteredTasks.length === 0
                            ? "Nincs a szűrésnek megfelelő feladat."
                            : "Nincs aktív feladat – az elvégzett feladatok az alábbi szekcióban találhatók."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeTasks.map((task) => {
                        const v = buildTaskView(task)
                        return (
                          <TableRow
                            key={task.id}
                            onClick={() => setDetailTaskId(task.id)}
                            className={`cursor-pointer ${v.isKesz ? "opacity-75" : ""}`}
                          >
                            {/* Gyors állapot toggle */}
                            <TableCell className="w-10 pl-3 pr-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                disabled={!canEdit || taskLoading === task.id}
                                onClick={() =>
                                  handleTaskStatusChange(task.id, v.isKesz || v.isElutasitott ? "nyitott" : "kesz")
                                }
                                title={
                                  v.isKesz
                                    ? "Kész (kattints az újranyitáshoz)"
                                    : v.isElutasitott
                                    ? "Elutasított (kattints az újranyitáshoz)"
                                    : "Kattints a készre jelöléshez"
                                }
                                className={`h-5 w-5 rounded-md flex items-center justify-center border transition-colors cursor-pointer disabled:cursor-not-allowed ${
                                  v.isKesz
                                    ? "bg-success border-success text-success-foreground"
                                    : v.isElutasitott
                                    ? "border-destructive/60 text-destructive bg-destructive/10 hover:bg-destructive/20"
                                    : v.isFolyamatban
                                    ? "border-info text-info bg-info/10 hover:bg-success hover:border-success hover:text-success-foreground"
                                    : "border-muted-foreground/40 hover:border-primary hover:bg-primary/10 text-transparent hover:text-primary"
                                }`}
                              >
                                {taskLoading === task.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-current" />
                                ) : v.isKesz ? (
                                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                                ) : v.isElutasitott ? (
                                  <X className="h-3.5 w-3.5 stroke-[2.5]" />
                                ) : v.isFolyamatban ? (
                                  <span className="h-2 w-2 rounded-full bg-info" />
                                ) : (
                                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                                )}
                              </button>
                            </TableCell>

                            {/* Feladat címe + rövid kontextus */}
                            <TableCell className="whitespace-normal min-w-[220px] max-w-[420px]">
                              <p
                                className={`text-sm font-medium leading-snug ${
                                  v.isKesz || v.isElutasitott
                                    ? "line-through text-muted-foreground"
                                    : "text-foreground"
                                }`}
                              >
                                {v.meta.displayTitle}
                              </p>
                              {v.isElutasitott ? (
                                <p className="text-[11px] text-destructive mt-0.5 line-clamp-1">
                                  Indoklás: {task.indoklas || v.meta.indoklas || "Téves szignálás"}
                                </p>
                              ) : (
                                v.meta.reszletek && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                                    {v.meta.reszletek}
                                  </p>
                                )
                              )}
                            </TableCell>

                            {isColVisible("kategoria") && (
                              <TableCell>
                                {v.catConfig && (
                                  <span
                                    className={`text-[10px] font-medium px-2 py-0.5 rounded border ${v.catConfig.badgeClass}`}
                                  >
                                    {v.catConfig.shortLabel}
                                  </span>
                                )}
                              </TableCell>
                            )}

                            {isColVisible("felelos") && (
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center shrink-0">
                                    {getInitials(v.assigneeName)}
                                  </div>
                                  <span className="text-xs text-foreground">{v.assigneeName}</span>
                                </div>
                              </TableCell>
                            )}

                            {isColVisible("hatarido") && (
                              <TableCell>
                                <span
                                  className={`text-xs tabular-nums ${
                                    v.isOverdue ? "text-destructive font-medium" : "text-foreground"
                                  }`}
                                >
                                  {v.deadlineDate ? v.deadlineDate.toLocaleDateString("hu-HU") : "—"}
                                </span>
                                {v.isOverdue && (
                                  <span className="block text-[10px] text-destructive">Lejárt</span>
                                )}
                              </TableCell>
                            )}

                            {isColVisible("prioritas") && (
                              <TableCell>
                                {v.prioConfig && (
                                  <span
                                    className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded border ${v.prioConfig.badgeClass}`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${v.prioConfig.dotClass}`} />
                                    {v.prioConfig.label}
                                  </span>
                                )}
                              </TableCell>
                            )}

                            {isColVisible("allapot") && (
                              <TableCell>
                                <TaskStatusBadge allapot={task.allapot} />
                              </TableCell>
                            )}

                            {/* Műveletek */}
                            <TableCell className="text-right pr-3" onClick={(e) => e.stopPropagation()}>
                              {canEdit && (
                                <div className="flex items-center justify-end gap-2">
                                  {!v.isKesz && !v.isElutasitott && (
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
                                  {renderTaskMenu(task, v)}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* ── ELVÉGZETT FELADATOK: a kész feladatok 24 óra után automatikusan ide kerülnek ── */}
              {totalArchived > 0 && (
                <div className="rounded-lg border border-border/60 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowCompleted((prev) => !prev)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Archive className="h-4 w-4 text-muted-foreground" />
                      Elvégzett feladatok
                      <span className="text-muted-foreground font-normal tabular-nums">({totalArchived})</span>
                    </span>
                    <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="hidden sm:inline">A kész feladatok 24 óra után automatikusan ide kerülnek.</span>
                      {showCompleted ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                  </button>

                  {showCompleted && (
                    <div className="border-t border-border/60">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent bg-muted/30">
                            <TableHead className="text-xs text-muted-foreground pl-4">Feladat</TableHead>
                            <TableHead className="text-xs text-muted-foreground">Felelős</TableHead>
                            <TableHead className="text-xs text-muted-foreground">Lezárva</TableHead>
                            <TableHead className="text-xs text-muted-foreground text-right pr-3">Műveletek</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {archivedTasks.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                              <TableCell colSpan={4} className="py-6 text-center text-xs text-muted-foreground">
                                Nincs a szűrésnek megfelelő elvégzett feladat.
                              </TableCell>
                            </TableRow>
                          ) : (
                            archivedTasks.map((task) => {
                              const v = buildTaskView(task)
                              return (
                                <TableRow
                                  key={task.id}
                                  onClick={() => setDetailTaskId(task.id)}
                                  className="cursor-pointer"
                                >
                                  <TableCell className="pl-4 whitespace-normal min-w-[220px] max-w-[420px]">
                                    <p className="text-sm text-muted-foreground line-through leading-snug">
                                      {v.meta.displayTitle}
                                    </p>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center shrink-0">
                                        {getInitials(v.assigneeName)}
                                      </div>
                                      <span className="text-xs text-muted-foreground">{v.assigneeName}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                                    {task.updated_at
                                      ? new Date(task.updated_at).toLocaleDateString("hu-HU")
                                      : "—"}
                                  </TableCell>
                                  <TableCell className="text-right pr-3" onClick={(e) => e.stopPropagation()}>
                                    {canEdit && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleTaskStatusChange(task.id, "nyitott")}
                                        disabled={taskLoading === task.id}
                                        className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                                      >
                                        {taskLoading === task.id ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <RotateCcw className="h-3.5 w-3.5" />
                                        )}
                                        <span>Újranyitás</span>
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── FELADAT RÉSZLETEK PANEL (jobb oldali kihúzható) ── */}
      <Sheet open={!!detailTask} onOpenChange={(isOpen) => !isOpen && setDetailTaskId(null)}>
        <SheetContent
          side="right"
          className="data-[side=right]:w-full data-[side=right]:sm:max-w-[480px] p-0 gap-0 shadow-none border-border/70"
        >
          {detailTask && detailView && (
            <>
              <SheetHeader className="p-5 pr-14 border-b border-border/50 bg-muted/10 gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Feladat részletei · <span className="font-mono normal-case">{iktatoszam || "—"}</span>
                </span>
                <SheetTitle className="text-base font-semibold leading-snug">
                  {detailView.meta.displayTitle}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 flex-wrap">
                  <TaskStatusBadge allapot={detailTask.allapot} />
                  {detailView.isOverdue && (
                    <span className="text-[11px] font-medium text-destructive">Lejárt a határidő</span>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Felelős</dt>
                    <dd className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center shrink-0">
                        {getInitials(detailView.assigneeName)}
                      </div>
                      {detailView.assigneeName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Határidő</dt>
                    <dd
                      className={`text-sm font-medium tabular-nums ${
                        detailView.isOverdue ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      {detailView.deadlineDate ? detailView.deadlineDate.toLocaleDateString("hu-HU") : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Prioritás</dt>
                    <dd>
                      {detailView.prioConfig && (
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded border ${detailView.prioConfig.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${detailView.prioConfig.dotClass}`} />
                          {detailView.prioConfig.label}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Kategória</dt>
                    <dd>
                      {detailView.catConfig && (
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded border ${detailView.catConfig.badgeClass}`}
                        >
                          {detailView.catConfig.label}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Kiadva</dt>
                    <dd className="text-sm text-foreground tabular-nums">
                      {detailTask.created_at ? new Date(detailTask.created_at).toLocaleDateString("hu-HU") : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                      Utolsó módosítás
                    </dt>
                    <dd className="text-sm text-foreground tabular-nums">
                      {detailTask.updated_at
                        ? new Date(detailTask.updated_at).toLocaleString("hu-HU", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </dd>
                  </div>
                </dl>

                <div className="space-y-1.5">
                  <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Munkautasítás / leírás
                  </h4>
                  {detailView.meta.reszletek ? (
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/20 p-3">
                      {detailView.meta.reszletek}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border/60 p-3">
                      Ehhez a feladathoz nem tartozik részletes munkautasítás.
                    </p>
                  )}
                </div>

                {detailView.isElutasitott && (
                  <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2.5">
                    <Ban className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-semibold text-[11px] block">Elutasítás indoklása</span>
                      <p className="text-foreground italic leading-relaxed">
                        „{detailTask.indoklas || detailView.meta.indoklas || "Téves szignálás"}”
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {canEdit && (
                <SheetFooter className="flex-row flex-wrap items-center gap-2 p-4 border-t border-border/50 bg-muted/20">
                  {detailTask.allapot === "nyitott" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTaskStatusChange(detailTask.id, "folyamatban")}
                      disabled={taskLoading === detailTask.id}
                      className="h-8 text-xs gap-1 cursor-pointer"
                    >
                      <ArrowRight className="h-3.5 w-3.5 text-info" />
                      <span>Folyamatban</span>
                    </Button>
                  )}
                  {!detailView.isKesz && !detailView.isElutasitott && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTaskStatusChange(detailTask.id, "kesz")}
                      disabled={taskLoading === detailTask.id}
                      className="h-8 text-xs gap-1 text-success border-success/30 hover:bg-success/10 cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Készre jelentés</span>
                    </Button>
                  )}
                  {(detailView.isKesz || detailView.isElutasitott) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTaskStatusChange(detailTask.id, "nyitott")}
                      disabled={taskLoading === detailTask.id}
                      className="h-8 text-xs gap-1 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Újranyitás</span>
                    </Button>
                  )}
                  {!detailView.isElutasitott && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const target = { id: detailTask.id, title: detailView.meta.displayTitle }
                        setDetailTaskId(null)
                        setRejectingTask(target)
                      }}
                      className="h-8 text-xs gap-1 text-warning border-warning/30 hover:bg-warning/10 cursor-pointer"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>Elutasítás...</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const target = { id: detailTask.id, title: detailView.meta.displayTitle }
                      setDetailTaskId(null)
                      setDeletingTask(target)
                    }}
                    className="h-8 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer sm:ml-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Törlés</span>
                  </Button>
                </SheetFooter>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>


      {/* ── TÖBBLÉPÉSES ÜGYIRATI FELADAT VARÁZSLÓ DIALÓGUS (WIZARD) ── */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="sm:max-w-[1120px] w-[96vw] max-h-[90vh] flex flex-col p-0 gap-0 border border-border/70 overflow-hidden">
          {/* Varázsló Fejléc és Lépésindikátor – pontosan a válaszlevelek mintájára */}
          <div className="p-6 border-b border-border/50 bg-muted/10">
            <div className="flex items-center justify-between mb-4 pr-8">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                ÚJ ÜGYIRATI FELADAT KIADÁSA
              </span>
              <span className="text-xs text-muted-foreground">
                Ügyirat: <strong className="font-mono text-foreground">{iktatoszam || "—"}</strong>
              </span>
            </div>

            {/* Lépés Címsor */}
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center text-sm shrink-0">
                {currentStep}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {currentStep === 1 && "Sablon kiválasztása vagy egyedi feladat"}
                  {currentStep === 2 && "Feladat alapadatai és felelős"}
                  {currentStep === 3 && "Részletes instrukciók és összegzés"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {currentStep === 1 && "Válasszon egy előre konfigurált munkafolyamat-sablont, vagy kezdjen üres feladatlappal."}
                  {currentStep === 2 && "Határozza meg a feladat címét, a felelős munkatársat, határidőt és prioritást."}
                  {currentStep === 3 && "Adjon meg pontos munkautasítást, ellenőrizze az adatokat és véglegesítse a kiadást."}
                </p>
              </div>
            </div>

            {/* Lépés navigációs sáv – egységes 3 sávos folyamatjelző csík */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40">
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  currentStep >= 1 ? "bg-primary" : "bg-muted"
                }`}
              />
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  currentStep >= 2 ? "bg-primary" : "bg-muted"
                }`}
              />
              <div
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  currentStep >= 3 ? "bg-primary" : "bg-muted"
                }`}
              />
            </div>
          </div>

          {/* Varázsló Törzs (Lépések szerint) */}
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {/* ── 1. LÉPÉS: SABLON VÁLASZTÁS VAGY EGYEDI FELADAT ── */}
            {currentStep === 1 && (
              <div className="space-y-4">
                {/* Keresés és Új sablon gomb */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Keresés a sablonok megnevezése vagy instrukciója alapján..."
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                    {templateSearch && (
                      <button
                        type="button"
                        onClick={() => setTemplateSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={newTplOpen ? "secondary" : "outline"}
                    onClick={() => setNewTplOpen(!newTplOpen)}
                    className="h-9 text-xs gap-1.5 cursor-pointer shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{newTplOpen ? "Sablon űrlap bezárása" : "Új sablon rögzítése"}</span>
                  </Button>
                </div>

                {/* Új sablon in-place űrlap a varázslóban */}
                {newTplOpen && (
                  <form onSubmit={handleSaveInlineTemplate} className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary">Új feladatsablon hozzáadása a vállalati tárba</span>
                      <span className="text-[11px] text-muted-foreground">Mentés után azonnal kiválasztható lesz</span>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">
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

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium">Kategória</Label>
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
                        <Label className="text-xs font-medium">Prioritás</Label>
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
                        <Label className="text-xs font-medium">Határidő (munkanap)</Label>
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
                      <Label className="text-xs font-medium">Alapértelmezett instrukció (opcionális)</Label>
                      <Textarea
                        value={newTplLeiras}
                        onChange={(e) => setNewTplLeiras(e.target.value)}
                        placeholder="Feladat részletes teendői, elvárt eredmény..."
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

                {/* Kategória chipek – flex-wrap, tiszta tördeléssel (0 csúnya görgetősáv!) */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateCat("all")}
                    className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                      selectedTemplateCat === "all"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Összes ({templates.length})
                  </button>
                  {TASK_CATEGORIES.map((cat) => {
                    const count = templates.filter((t) => t.kategoria === cat.id).length
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedTemplateCat(cat.id)}
                        className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                          selectedTemplateCat === cat.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {cat.nev || cat.shortLabel} {count > 0 && `(${count})`}
                      </button>
                    )
                  })}
                </div>

                {/* Sablon kártyák tágas, 3-oszlopos rácsa */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[500px] overflow-y-auto pr-1.5 scrollbar-thin">
                  {/* Egyedi feladat (sablon nélkül) kártya */}
                  <div
                    onClick={handleSelectCustomTask}
                    onDoubleClick={() => {
                      handleSelectCustomTask()
                      setCurrentStep(2)
                    }}
                    className={`group p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 min-h-[136px] ${
                      selectedTemplateId === null
                        ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-none"
                        : "border-dashed border-border/80 hover:border-primary/50 bg-card hover:bg-muted/10"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="font-semibold text-xs text-foreground line-clamp-1">
                            Egyedi feladat
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-normal shrink-0">
                          Sablon nélkül
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        Üres feladatlap megnyitása és minden adat kézi megadása.
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
                      <span className="text-[10px] text-muted-foreground">Testreszabható</span>
                      <Button
                        type="button"
                        size="sm"
                        variant={selectedTemplateId === null ? "default" : "secondary"}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectCustomTask()
                          setCurrentStep(2)
                        }}
                        className={`h-6 text-[11px] px-2.5 gap-1 cursor-pointer shrink-0 ${
                          selectedTemplateId === null
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "hover:bg-primary hover:text-primary-foreground"
                        }`}
                      >
                        <span>{selectedTemplateId === null ? "Kiválasztva ✓" : "Használat"}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Szűrt sablonok */}
                  {filteredTemplates.map((t) => {
                    const isSelected = selectedTemplateId === t.id
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTemplate(t)}
                        onDoubleClick={() => {
                          handleSelectTemplate(t)
                          setCurrentStep(2)
                        }}
                        className={`group p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 min-h-[136px] relative ${
                          isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-none"
                            : "border-border/70 hover:border-primary/50 bg-card hover:bg-muted/10"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1.5 mb-1.5">
                            <span className="font-semibold text-xs text-foreground line-clamp-1">
                              {t.cim}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {t.alapertelmezett_hatarido_nap && (
                                <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0 h-4">
                                  +{t.alapertelmezett_hatarido_nap} nap
                                </Badge>
                              )}
                              {t.isCustom && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCustomTemplate(t, e)}
                                  title="Egyedi sablon törlése"
                                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {t.leiras || "Nincs megadva leírás a sablonhoz."}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
                          <Badge variant="outline" className="text-[10px] font-normal truncate max-w-[130px]">
                            {CATEGORY_CONFIG[t.kategoria]?.label || t.kategoria}
                          </Badge>
                          <Button
                            type="button"
                            size="sm"
                            variant={isSelected ? "default" : "secondary"}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectTemplate(t)
                              setCurrentStep(2)
                            }}
                            className={`h-6 text-[11px] px-2.5 gap-1 cursor-pointer shrink-0 ${
                              isSelected
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "hover:bg-primary hover:text-primary-foreground"
                            }`}
                          >
                            <span>{isSelected ? "Kiválasztva ✓" : "Használat"}</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {filteredTemplates.length === 0 && (
                  <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    Nincs a keresésnek megfelelő feladatsablon.
                  </div>
                )}
              </div>
            )}

            {/* ── 2. LÉPÉS: FELADAT ALAPADATAI ÉS FELELŐS ── */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {/* Kiválasztott sablon visszajelző csík */}
                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      Alap: <strong>{selectedTemplateId ? templates.find(t => t.id === selectedTemplateId)?.cim || "Kiválasztott sablon" : "Egyedi feladat (sablon nélkül)"}</strong>
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs text-primary hover:text-primary hover:bg-primary/10 h-7 gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Sablon módosítása</span>
                  </Button>
                </div>

                {/* Feladat megnevezése */}
                <div className="space-y-1.5">
                  <Label htmlFor="wizTaskLeiras" className="text-xs font-semibold">
                    Feladat megnevezése <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="wizTaskLeiras"
                    value={formLeiras}
                    onChange={(e) => setFormLeiras(e.target.value)}
                    placeholder="Pl. Számla alaki ellenőrzése és jóváhagyása..."
                    className="text-xs h-9 font-medium"
                    autoFocus
                  />
                </div>

                {/* 3 oszlopos rács: Felelős, Határidő, Prioritás */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Felelős munkatárs */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Felelős munkatárs <span className="text-destructive">*</span>
                    </Label>
                    <Select value={formFelelos} onValueChange={(val) => setFormFelelos(val || "")}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Válassz felelős munkatársat..." />
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
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        Határidő <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex items-center gap-1.5 text-[10px] text-primary">
                        <button
                          type="button"
                          onClick={() => setQuickDeadline(1)}
                          className="hover:underline cursor-pointer"
                        >
                          +1 nap
                        </button>
                        <span>•</span>
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
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setQuickDeadline(14)}
                          className="hover:underline cursor-pointer"
                        >
                          +2 hét
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
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Prioritás</Label>
                    <Select value={formPrioritas} onValueChange={(val: any) => setFormPrioritas(val)}>
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
                </div>

                {/* Második sor: Kategória + Információs sáv */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-end">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Kategória</Label>
                    <Select value={formKategoria} onValueChange={(val: any) => setFormKategoria(val)}>
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

                  <div className="md:col-span-2 p-2.5 rounded-lg border border-border/60 bg-muted/20 text-xs text-muted-foreground flex items-center gap-2.5 h-9">
                    <Info className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">
                      A kiosztáskor a megjelölt felelős belső értesítést kap a feladatlistájában és értesítési sávjában.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── 3. LÉPÉS: RÉSZLETES INSTRUKCIÓK ÉS ÖSSZEGZÉS ── */}
            {currentStep === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* Bal oldal (7 oszlop): Munkautasítás és opciók */}
                <div className="md:col-span-7 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="wizReszletek" className="text-xs font-semibold">
                      Részletes munkautasítás vagy megjegyzés (opcionális)
                    </Label>
                    <Textarea
                      id="wizReszletek"
                      value={formReszletek}
                      onChange={(e) => setFormReszletek(e.target.value)}
                      placeholder="Pl. Kérjük ellenőrizni a számla tételeit, az igazolást csatolni a dossziéhoz, majd jóváhagyni az utalást..."
                      rows={5}
                      className="text-xs"
                      autoFocus
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Itt adhatja meg a feladat pontos lépéseit vagy a szükséges ellenőrzési szempontokat.
                    </p>
                  </div>

                  {/* Mentés sablonként checkbox */}
                  <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border/60 bg-muted/10">
                    <input
                      type="checkbox"
                      id="wizSaveAsTpl"
                      checked={formSaveAsTemplate}
                      onChange={(e) => setFormSaveAsTemplate(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                    />
                    <Label htmlFor="wizSaveAsTpl" className="text-xs font-normal text-muted-foreground cursor-pointer">
                      Mentés új vállalati feladatsablonként a jövőbeni gyors használathoz
                    </Label>
                  </div>

                  <div className="p-3 rounded-lg border border-info/30 bg-info/5 text-info text-xs flex items-start gap-2">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      A jóváhagyás után a feladat azonnal megjelenik az ügyirat munkafolyamatában, és bekerül a felelős munkatárs teendői közé.
                    </span>
                  </div>
                </div>

                {/* Jobb oldal (5 oszlop): Áttekintő kártya */}
                <div className="md:col-span-5 p-4 rounded-xl border border-border/70 bg-muted/20 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Feladat összefoglaló
                    </span>
                    <Badge variant="outline" className="text-[10px] font-normal uppercase">
                      {PRIORITY_CONFIG[formPrioritas]?.label || formPrioritas}
                    </Badge>
                  </div>

                  <div className="space-y-1 pb-2 border-b border-border/40">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Feladat címe</span>
                    <strong className="text-foreground text-xs block leading-tight">{formLeiras}</strong>
                  </div>

                  <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
                    <span className="text-muted-foreground">Felelős:</span>
                    <span className="font-medium text-foreground">
                      {users.find((u) => u.id === formFelelos)?.nev || users.find((u) => u.id === formFelelos)?.email || "Nincs megadva"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
                    <span className="text-muted-foreground">Határidő:</span>
                    <span className="font-mono font-medium text-foreground">{formHatarido || "—"}</span>
                  </div>

                  <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
                    <span className="text-muted-foreground">Kategória:</span>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {CATEGORY_CONFIG[formKategoria]?.label || formKategoria}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Ügyirat iktatószám:</span>
                    <span className="font-mono text-muted-foreground">{iktatoszam || "—"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Varázsló Lábléc navigációs gombokkal */}
          <div className="p-4 border-t border-border/50 bg-muted/20 flex items-center justify-between">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep((prev) => (prev - 1) as WizardStep)}
                className="gap-1.5 cursor-pointer text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Előző lépés</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setWizardOpen(false)}
                className="text-xs text-muted-foreground"
              >
                Mégse
              </Button>
            )}

            {currentStep < 3 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (currentStep === 2) {
                    if (!formLeiras.trim()) {
                      toast.error("Kérjük, adja meg a feladat megnevezését!")
                      return
                    }
                    if (!formFelelos) {
                      toast.error("Kérjük, válasszon felelős munkatársat!")
                      return
                    }
                    if (!formHatarido) {
                      toast.error("Kérjük, adjon meg határidőt!")
                      return
                    }
                  }
                  setCurrentStep((prev) => (prev + 1) as WizardStep)
                }}
                className="gap-1.5 cursor-pointer text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <span>Következő lépés</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={createLoading || !formLeiras.trim() || !formFelelos || !formHatarido}
                onClick={handleSubmitWizardTask}
                className="gap-1.5 cursor-pointer text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {createLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Feladat rögzítése...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Feladat kiadása</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
