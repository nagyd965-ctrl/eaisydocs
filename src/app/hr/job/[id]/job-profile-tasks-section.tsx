"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { addJobTaskAction, removeJobTaskAction, addJobCompetencyAction, removeJobCompetencyAction } from "./actions"
import { JobEditDialog, JobEditData, OrgUnitOption } from "@/components/hr/job-edit-dialog"

interface JobProfileTasksSectionProps {
  job: JobEditData
  orgUnits: OrgUnitOption[]
  isHrOrAdmin: boolean
  initialTasks: string[]
  initialCompetencies: string[]
}

export function JobProfileTasksSection({
  job,
  orgUnits,
  isHrOrAdmin,
  initialTasks,
  initialCompetencies,
}: JobProfileTasksSectionProps) {
  const [tasks, setTasks] = useState<string[]>(initialTasks)
  const [newTaskInput, setNewTaskInput] = useState("")
  const [taskLoading, setTaskLoading] = useState(false)

  const [competencies, setCompetencies] = useState<string[]>(initialCompetencies)
  const [newCompInput, setNewCompInput] = useState("")
  const [compLoading, setCompLoading] = useState(false)

  // 1. Task handlers
  const handleAddTask = async () => {
    const trimmed = newTaskInput.trim()
    if (!trimmed) return

    setTaskLoading(true)
    const result = await addJobTaskAction(job.id, trimmed)
    setTaskLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      setTasks((prev) => [...prev, trimmed])
      setNewTaskInput("")
      toast.success("Új feladat hozzáadva!")
    }
  }

  const handleRemoveTask = async (index: number) => {
    setTaskLoading(true)
    const result = await removeJobTaskAction(job.id, index)
    setTaskLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      setTasks((prev) => prev.filter((_, i) => i !== index))
      toast.success("Feladat eltávolítva.")
    }
  }

  // 2. Competency handlers
  const handleAddCompetency = async () => {
    const trimmed = newCompInput.trim()
    if (!trimmed) return

    setCompLoading(true)
    const result = await addJobCompetencyAction(job.id, trimmed)
    setCompLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      if (!competencies.includes(trimmed)) {
        setCompetencies((prev) => [...prev, trimmed])
      }
      setNewCompInput("")
      toast.success("Kompetencia hozzáadva!")
    }
  }

  const handleRemoveCompetency = async (index: number) => {
    setCompLoading(true)
    const result = await removeJobCompetencyAction(job.id, index)
    setCompLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      setCompetencies((prev) => prev.filter((_, i) => i !== index))
      toast.success("Kompetencia eltávolítva.")
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* ── Feladatok és Hatáskörök Kártya ── */}
      <Card className="border-border flex flex-col justify-between">
        <div>
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">Feladatok és Hatáskörök</CardTitle>
                <Badge variant="secondary" className="text-xs font-normal">{tasks.length}</Badge>
              </div>
              <CardDescription className="text-xs mt-0.5">
                A munkakörhöz tartozó felelősségek és napi feladatok.
              </CardDescription>
            </div>
            {isHrOrAdmin && (
              <JobEditDialog
                job={job}
                orgUnits={orgUnits}
                initialTab="tasks"
                trigger={
                  <Button variant="outline" size="sm" className="h-8 text-xs shrink-0">
                    Összes kezelése
                  </Button>
                }
              />
            )}
          </CardHeader>

          <CardContent className="pt-4 space-y-3">
            {/* Gyors hozzáadás mező */}
            {isHrOrAdmin && (
              <div className="flex items-center gap-2">
                <Input
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddTask()
                    }
                  }}
                  placeholder="Új feladat beírása (Enter a mentéshez)..."
                  className="text-xs h-8"
                  disabled={taskLoading}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddTask}
                  disabled={taskLoading || !newTaskInput.trim()}
                  className="h-8 text-xs gap-1 shrink-0"
                >
                  {taskLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Hozzáadás
                </Button>
              </div>
            )}

            {/* Feladatok listája */}
            {tasks.length > 0 ? (
              <ul className="space-y-2 pt-1">
                {tasks.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-2.5 p-2 rounded-md hover:bg-muted/40 transition-colors text-sm leading-relaxed group"
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      <span className="text-foreground/90 break-words">{f}</span>
                    </div>
                    {isHrOrAdmin && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTask(i)}
                        disabled={taskLoading}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        title="Törlés"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nincs rögzített feladat vagy hatáskör.
              </div>
            )}
          </CardContent>
        </div>
      </Card>

      {/* ── Elvárt Kompetenciák és Végzettség Kártya ── */}
      <Card className="border-border flex flex-col justify-between">
        <div>
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">Elvárt Kompetenciák és Végzettség</CardTitle>
                <Badge variant="secondary" className="text-xs font-normal">{competencies.length}</Badge>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Szükséges képesítések, készségek és szakmai elvárások.
              </CardDescription>
            </div>
            {isHrOrAdmin && (
              <JobEditDialog
                job={job}
                orgUnits={orgUnits}
                initialTab="tasks"
                trigger={
                  <Button variant="outline" size="sm" className="h-8 text-xs shrink-0">
                    Összes kezelése
                  </Button>
                }
              />
            )}
          </CardHeader>

          <CardContent className="pt-4 space-y-3">
            {/* Gyors hozzáadás mező */}
            {isHrOrAdmin && (
              <div className="flex items-center gap-2">
                <Input
                  value={newCompInput}
                  onChange={(e) => setNewCompInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddCompetency()
                    }
                  }}
                  placeholder="Új kompetencia (pl. B kategóriás jogsi)..."
                  className="text-xs h-8"
                  disabled={compLoading}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddCompetency}
                  disabled={compLoading || !newCompInput.trim()}
                  className="h-8 text-xs gap-1 shrink-0"
                >
                  {compLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Hozzáadás
                </Button>
              </div>
            )}

            {/* Kompetenciák jelvényei */}
            {competencies.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {competencies.map((k, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="font-normal text-xs pl-2.5 pr-1.5 py-1 flex items-center gap-1.5 bg-muted hover:bg-muted/80"
                  >
                    <span>{k}</span>
                    {isHrOrAdmin && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCompetency(i)}
                        disabled={compLoading}
                        className="text-muted-foreground hover:text-destructive rounded-full p-0.5 hover:bg-muted-foreground/10"
                        title="Törlés"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nincs rögzített kompetencia vagy végzettségi elvárás.
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </div>
  )
}
