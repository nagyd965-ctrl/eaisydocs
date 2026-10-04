"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  MessageSquare,
  CheckCircle2,
  Loader2,
  ArrowRight,
  X,
  MoreHorizontal,
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
} from "lucide-react"
import { toast } from "sonner"
import { addComment, updateDossierStatus } from "@/app/dossiers/[id]/actions"
import { updateTaskStatus, deleteTask } from "@/app/tasks/task-actions"
import { AddTaskDialog } from "./add-task-dialog"
import { TaskRejectDialog } from "./task-reject-dialog"
import { Badge } from "./ui/badge"
import { Progress } from "./ui/progress"
import { MentionInput, renderMentionText } from "./mention-input"
import {
  OutgoingDocumentsPanel,
  OutgoingDocItem,
  PartnerDetectionInfo,
  IncomingIratInfo,
} from "./outgoing-documents-panel"
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
import { parseTaskMetadata, CATEGORY_CONFIG, PRIORITY_CONFIG } from "@/utils/task-templates"

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
  partnerInfo?: PartnerDetectionInfo | null
  incomingIrat?: IncomingIratInfo | null
  outgoingDocs?: OutgoingDocItem[]
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
  partnerInfo,
  incomingIrat,
  outgoingDocs = [],
}: TasksTabProps) {
  const router = useRouter()
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

  return (
    <div className="space-y-6">
      {/* Ügyirati Feladatok + Munkafolyamat */}
      <Card className="border border-border/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
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
              Határidős feladatok és felelősök kezelése az ügyiratban.
            </CardDescription>
          </div>
          {canEdit && (
            <AddTaskDialog
              ugyiratId={ugyiratId}
              users={users}
              onTaskCreated={() => router.refresh()}
            />
          )}
        </CardHeader>
        <CardContent>
          {/* Progress bar – ha vannak feladatok */}
          {totalTasks > 0 && (
            <div className="mb-4 space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {completedTasks}/{totalTasks} feladat lezárva
                  {inProgressTasks > 0 && (
                    <span className="text-info font-medium">
                      {" "}• {inProgressTasks} folyamatban
                    </span>
                  )}
                  {rejectedTasks > 0 && (
                    <span className="text-destructive font-medium">
                      {" "}• {rejectedTasks} elutasítva
                    </span>
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
            <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2.5 text-xs">
              <Ban className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold block">
                  Elutasított feladat az ügyiratban ({rejectedTasks} db)
                </span>
                <p className="text-muted-foreground leading-relaxed">
                  Az ügyiratban elutasított feladat található, ami akadályozza az ügyirat elintézettként történő lezárását. Kérjük vizsgálja felül a feladatot (újra kiadás vagy egyeztetés a felelőssel).
                </p>
              </div>
            </div>
          )}

          {/* Siker banner: minden feladat kész */}
          {allTasksCompleted && status !== "elintezett" && status !== "lezart" && status !== "irattarban" && (
            <div className="mb-4 p-3 rounded-lg border border-success/30 bg-success/5 text-foreground flex items-center justify-between gap-3 text-xs">
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
                  className="h-7 text-xs border-success/40 text-success hover:bg-success/10 hover:text-success cursor-pointer"
                >
                  {statusLoading === "elintezett" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Ügyirat elintézése
                </Button>
              )}
            </div>
          )}

          {allTasksCompleted && status === "elintezett" && (
            <div className="mb-4 p-2.5 rounded-lg border border-border/40 bg-muted/30 flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              <span>Minden feladat lezárva. Az ügyirat szakmailag elintézett státuszban van.</span>
            </div>
          )}

          {taskList.length === 0 ? (
            <div className="py-8 text-center border border-dashed rounded-lg bg-muted/20">
              <Sparkles className="h-6 w-6 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-xs font-medium text-foreground">Még nincsenek feladatok rögzítve.</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Kattints az „Új Feladat” gombra sablonos vagy egyedi teendő kiírásához.
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
                const isOverdue =
                  !!deadlineDate && deadlineDate < now && !isKesz && !isElutasitott

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
                    {/* Bal oldali rész: Gyors állapot toggle + Strukturált tartalom */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* 1. Gyors állapot kapcsoló (Quick Toggle) */}
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

                      {/* 2. Feladat szöveges törzse */}
                      <div className="flex-1 min-w-0">
                        {/* Címsor: Cím + Kategória és Prioritás badge-ek */}
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

                          {/* Kategória jelvény */}
                          {catConfig && meta.kategoria !== "egyeb" && (
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded border ${catConfig.badgeClass}`}
                            >
                              {catConfig.shortLabel}
                            </span>
                          )}

                          {/* Prioritás jelvény */}
                          {prioConfig && (meta.prioritas === "surgos" || meta.prioritas === "magas") && (
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded border flex items-center gap-1.5 ${prioConfig.badgeClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${prioConfig.dotClass}`} />
                              {prioConfig.label}
                            </span>
                          )}
                        </div>

                        {/* Részletek / munkautasítás doboz (ha van) */}
                        {meta.reszletek && (
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed bg-muted/40 border border-border/50 rounded-md px-2.5 py-1.5 line-clamp-2">
                            {meta.reszletek}
                          </p>
                        )}

                        {/* Elutasítás indoklása (letisztult, diszkrét megjelenítés) */}
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

                        {/* Egyéb megjegyzés (ha nem elutasított, de van indoklás vagy megjegyzés) */}
                        {!isElutasitott && (meta.indoklas || task.indoklas) && (
                          <div className="mt-1.5 text-xs text-muted-foreground flex items-start gap-1.5 bg-muted/60 border border-border/50 rounded px-2.5 py-1 w-fit">
                            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                            <span>
                              <strong className="font-semibold">Megjegyzés:</strong>{" "}
                              {meta.indoklas || task.indoklas}
                            </span>
                          </div>
                        )}

                        {/* Meta adatok: Felelős & Határidő */}
                        <div className="flex items-center flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded border border-border/40 text-[11px]">
                            <User className="h-3 w-3 text-muted-foreground/70" />
                            <span>
                              Felelős: <span className="font-medium text-foreground">{assigneeName}</span>
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
                              {deadlineDate
                                ? deadlineDate.toLocaleDateString("hu-HU")
                                : "Nincs megadva"}
                              {isOverdue && " • Lejárt!"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Jobb oldali Állapotjelző & Műveletek (Igényes Kezelés gomb a pici három pont helyett) */}
                    <div className="flex items-center gap-2 shrink-0 self-start md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
                      <TaskStatusBadge allapot={task.allapot} />

                      {/* Gyors "Kész" gomb ha nyitott vagy folyamatban van */}
                      {!isKesz && !isElutasitott && canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTaskStatusChange(task.id, "kesz")}
                          disabled={taskLoading === task.id}
                          className="h-8 text-xs gap-1 text-success border-success/30 hover:bg-success/10 hover:border-success/50 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Kész</span>
                        </Button>
                      )}

                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-md border border-border/70 hover:border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors cursor-pointer disabled:opacity-50"
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
                            {/* Állapotváltások */}
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
                                onClick={() =>
                                  setRejectingTask({ id: task.id, title: meta.displayTitle })
                                }
                                className="text-xs text-warning cursor-pointer"
                              >
                                <Ban className="mr-2 h-3.5 w-3.5 text-warning" />
                                Elutasítás indoklással...
                              </DropdownMenuItem>
                            )}

                            {/* Törlés művelet */}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                setDeletingTask({ id: task.id, title: meta.displayTitle })
                              }
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
              A feladat véglegesen törlődik az ügyiratból, és a művelet rögzítésre kerül az audit naplóban.
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
                <>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Törlés megerősítése
                </>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Kimenő iratok és Válaszlevelek (Kanonikus panel, h-[500px]) */}
        <OutgoingDocumentsPanel
          ugyiratId={ugyiratId}
          iktatoszam={iktatoszam}
          canEdit={canEdit}
          partnerInfo={partnerInfo}
          incomingIrat={incomingIrat}
          outgoingDocs={outgoingDocs}
        />

        {/* Belső Megjegyzések (Chat, szintén h-[500px], tökéletesen illeszkedve) */}
        <Card className="flex flex-col h-[500px] border border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Belső Megjegyzések
              </CardTitle>
              {comments.length > 0 && (
                <Badge variant="outline" className="text-xs font-normal">
                  {comments.length} megjegyzés
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Belső egyeztetés az ügyiratról — @ megemlítéssel értesíthetők a kollégák.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
            {comments.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground mt-4">Nincsenek megjegyzések.</p>
            ) : (
              comments.map((comment) => {
                const isMine = comment.user_email === currentUserEmail
                const mentionParts = renderMentionText(comment.szoveg, users)
                return (
                  <div
                    key={comment.id}
                    className={`flex flex-col ${isMine ? "items-end" : "items-start"} gap-1`}
                  >
                    <span className="text-xs text-muted-foreground px-1">
                      {comment.user_name || comment.user_email} •{" "}
                      {new Date(comment.created_at).toLocaleString("hu-HU", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <div
                      className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted rounded-tl-sm"
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
                                  isMine ? "text-primary-foreground underline" : "text-primary"
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
          <div className="p-4 border-t">
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
                size="icon"
                variant="secondary"
              >
                {commentLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
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
        <Badge variant="outline" className="text-xs border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium">
          Kész
        </Badge>
      )
    case "elutasitott":
      return (
        <Badge variant="outline" className="text-xs border-destructive/30 bg-destructive/10 text-destructive font-medium">
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
