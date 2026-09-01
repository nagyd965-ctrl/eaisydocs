"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MessageSquare, CheckCircle2, Loader2, FileUp, Circle, ArrowRight, X, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { addComment, updateDossierStatus, uploadReply } from "@/app/dossiers/[id]/actions"
import { updateTaskStatus } from "@/app/tasks/task-actions"
import { AddTaskDialog } from "./add-task-dialog"
import { Badge } from "./ui/badge"
import { TemplateDialog } from "./template-dialog"
import { Progress } from "./ui/progress"
import { MentionInput, renderMentionText } from "./mention-input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
}

export interface UserSelectItem {
  id: string
  nev: string
  email?: string
}

interface TasksTabProps {
  ugyiratId: string;
  ugyId: string;
  status: string;
  comments: TaskComment[];
  tasks: UgyiratTaskItem[];
  users: UserSelectItem[];
  canEdit: boolean;
  currentUserEmail: string;
  iktatoszam?: string;
}

export function TasksTab({ ugyiratId, ugyId, status, comments, tasks, users, canEdit, currentUserEmail, iktatoszam }: TasksTabProps) {
  const [commentText, setCommentText] = useState("")
  const [commentLoading, setCommentLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState<string | null>(null)
  const [taskLoading, setTaskLoading] = useState<string | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)

  // Feladat statisztikák
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.allapot === "kesz").length
  const inProgressTasks = tasks.filter(t => t.allapot === "folyamatban").length
  const allTasksDone = totalTasks > 0 && completedTasks === totalTasks
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

  const handleTaskStatusChange = async (taskId: string, newStatus: "nyitott" | "folyamatban" | "kesz" | "elutasitott") => {
    setTaskLoading(taskId)

    // Ha az ügyirat még "iktatva" státuszban van és egy feladatot elindítanak,
    // automatikusan átállítjuk "ügyintézés alatt"-ra
    if (status === "iktatva" && (newStatus === "folyamatban" || newStatus === "kesz")) {
      await updateDossierStatus(ugyiratId, ugyId, "ugyintezes_alatt")
    }

    const result = await updateTaskStatus(taskId, newStatus)
    setTaskLoading(null)

    if (result.success) {
      const statusLabels: Record<string, string> = {
        nyitott: "Nyitott",
        folyamatban: "Folyamatban",
        kesz: "Kész",
        elutasitott: "Elutasítva"
      }
      toast.success(`Feladat: ${statusLabels[newStatus]}`)
    } else {
      toast.error(result.error || "Hiba történt")
    }
  }

  const handleUploadReply = async (formData: FormData) => {
    setUploadLoading(true)
    const { error } = await uploadReply(ugyiratId, formData)
    setUploadLoading(false)

    if (error) {
      toast.error(error)
    } else {
      toast.success("Válaszlevél sikeresen feltöltve!")
      const form = document.getElementById("reply-form") as HTMLFormElement
      if (form) form.reset()
    }
  }

  return (
    <div className="space-y-6">
      {/* Ügyirati Feladatok + Munkafolyamat */}
      <Card className="border border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base font-semibold">Ügyirati Feladatok</CardTitle>
            <CardDescription>Konkrét tennivalók (al-feladatok) ehhez az aktához.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Elintézettnek jelölés – csak ha minden feladat kész (vagy nincs feladat) */}
            <Button 
              onClick={() => handleStatusChange("elintezett")}
              disabled={
                !canEdit || 
                status === "elintezett" || 
                status === "lezart" || 
                statusLoading !== null ||
                (totalTasks > 0 && !allTasksDone)
              }
              variant="outline"
              size="sm"
              title={totalTasks > 0 && !allTasksDone ? `Még ${totalTasks - completedTasks} feladat nincs kész` : undefined}
            >
              {statusLoading === "elintezett" ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-2 h-3.5 w-3.5" />}
              Elintézettnek jelölés
            </Button>

            {canEdit && <AddTaskDialog ugyiratId={ugyiratId} users={users} />}
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress bar – ha vannak feladatok */}
          {totalTasks > 0 && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {completedTasks}/{totalTasks} feladat kész
                  {inProgressTasks > 0 && <span className="text-info"> • {inProgressTasks} folyamatban</span>}
                </span>
                <span className={`font-medium tabular-nums ${allTasksDone ? 'text-success' : 'text-muted-foreground'}`}>
                  {progressPercent}%
                </span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          )}

          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Még nincsenek feladatok rögzítve.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => (
                <div 
                  key={task.id} 
                  className={`flex justify-between items-center p-3 border rounded-lg transition-colors ${
                    task.allapot === "kesz" 
                      ? "border-success/30 bg-success/5" 
                      : task.allapot === "elutasitott"
                      ? "border-destructive/30 bg-destructive/5 opacity-60"
                      : task.allapot === "folyamatban"
                      ? "border-info/30 bg-info/5"
                      : "border-border/50 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-sm ${task.allapot === "kesz" ? "line-through text-muted-foreground" : ""}`}>
                      {task.leiras}
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-4 mt-1">
                      <span>Felelős: {users.find(u => u.id === task.felelos_user_id)?.nev || 'Ismeretlen'}</span>
                      <span>Határidő: {new Date(task.hatarido).toLocaleDateString('hu-HU')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <TaskStatusBadge allapot={task.allapot} />

                    {/* Feladat műveletek – dropdown menü */}
                    {canEdit && task.allapot !== "kesz" && task.allapot !== "elutasitott" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                          disabled={taskLoading === task.id}
                        >
                          {taskLoading === task.id 
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> 
                            : <MoreHorizontal className="h-3.5 w-3.5" />
                          }
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {task.allapot === "nyitott" && (
                            <DropdownMenuItem onClick={() => handleTaskStatusChange(task.id, "folyamatban")}>
                              <ArrowRight className="mr-2 h-3.5 w-3.5 text-info" />
                              Elkezdtem
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleTaskStatusChange(task.id, "kesz")}>
                            <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-success" />
                            Kész
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTaskStatusChange(task.id, "elutasitott")}>
                            <X className="mr-2 h-3.5 w-3.5 text-destructive" />
                            Elutasítva / Nem releváns
                          </DropdownMenuItem>
                          {task.allapot === "folyamatban" && (
                            <DropdownMenuItem onClick={() => handleTaskStatusChange(task.id, "nyitott")}>
                              <Circle className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              Visszaállítás nyitottra
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {/* Visszaállítás gomb, ha kész vagy elutasított */}
                    {canEdit && (task.allapot === "kesz" || task.allapot === "elutasitott") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground"
                        disabled={taskLoading === task.id}
                        onClick={() => handleTaskStatusChange(task.id, "nyitott")}
                      >
                        {taskLoading === task.id 
                          ? <Loader2 className="h-3 w-3 animate-spin" /> 
                          : "Visszanyitás"
                        }
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Válaszlevél feltöltése */}
        <Card className="border border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Válaszlevél feltöltése</CardTitle>
            <CardDescription>Kimenő irat csatolása az ügyirathoz</CardDescription>
          </CardHeader>
          <CardContent>
            <form id="reply-form" action={handleUploadReply} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targy">Levél tárgya</Label>
                <Input id="targy" name="targy" required placeholder="Pl. Válasz a bérleti szerződésre" disabled={!canEdit || uploadLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">PDF Fájl</Label>
                <Input id="file" name="file" type="file" accept="application/pdf" required disabled={!canEdit || uploadLoading} />
              </div>
              <Button type="submit" disabled={!canEdit || uploadLoading} variant="outline" className="w-full">
                {uploadLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                Feltöltés és csatolás
              </Button>
            </form>
            {/* Sablonos generálás */}
            <div className="mt-3 pt-3 border-t border-border/50">
              <TemplateDialog ugyiratId={ugyiratId} iktatoszam={iktatoszam} />
            </div>
          </CardContent>
        </Card>

        {/* Belső Megjegyzések (Chat) */}
        <Card className="flex flex-col h-[500px] border border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Belső Megjegyzések</CardTitle>
            <CardDescription>Kommunikáció a kollégákkal — használd az @-ot kollégák megemlítéséhez</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
            {comments.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground mt-4">Nincsenek megjegyzések.</p>
            ) : (
              comments.map((comment) => {
                const isMine = comment.user_email === currentUserEmail;
                const mentionParts = renderMentionText(comment.szoveg, users);
                return (
                  <div key={comment.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} gap-1`}>
                    <span className="text-xs text-muted-foreground px-1">{comment.user_name || comment.user_email} • {new Date(comment.created_at).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${isMine ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                      {Array.isArray(mentionParts) ? (
                        mentionParts.map((part, i) =>
                          typeof part === 'string' ? (
                            <span key={i}>{part}</span>
                          ) : (
                            <span key={i} className={`font-semibold ${isMine ? 'text-primary-foreground underline' : 'text-primary'}`}>
                              @{part.name}
                            </span>
                          )
                        )
                      ) : (
                        mentionParts
                      )}
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
                {commentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
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
    case 'nyitott': return <Badge variant="outline" className="text-muted-foreground border-muted-foreground">Nyitott</Badge>
    case 'folyamatban': return <Badge variant="default" className="bg-info text-info-foreground">Folyamatban</Badge>
    case 'kesz': return <Badge variant="default" className="bg-success text-success-foreground">Kész</Badge>
    case 'elutasitott': return <Badge variant="destructive">Elutasítva</Badge>
    default: return <Badge variant="outline">{allapot}</Badge>
  }
}
