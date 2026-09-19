"use client"

import { useState, useEffect } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { format } from "date-fns"
import { hu } from "date-fns/locale"
import { Calendar, AlertCircle, ExternalLink, Calendar as CalendarIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { updateTaskStatus } from "./task-actions"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export interface Task {
  id: string
  leiras: string
  hatarido: string
  allapot: string
  felelos_user_id: string
  ugyirat: {
    id: string
    iktatoszam: string
  } | null
}

const COLUMNS = [
  { id: "nyitott", title: "Nyitott" },
  { id: "folyamatban", title: "Folyamatban" },
  { id: "kesz", title: "Kész" },
  { id: "elutasitott", title: "Elutasított" },
]

const STATUS_LABELS: Record<string, string> = {
  nyitott: "Nyitott",
  folyamatban: "Folyamatban",
  kesz: "Kész",
  elutasitott: "Elutasított",
}

// --- Kártya belső tartalma ---
function TaskCardContent({ task, isOverdue }: { task: Task; isOverdue: boolean }) {
  return (
    <CardContent className="p-4 space-y-2">
      <div className="font-medium text-sm flex items-center justify-between gap-2">
        <span className="truncate">
          {task.ugyirat ? (
            <span className="text-foreground">{task.ugyirat.iktatoszam || "Nincs Iktatószám"}</span>
          ) : (
            <span className="text-muted-foreground italic">Általános feladat</span>
          )}
        </span>
        {task.ugyirat && (
          <span className="text-[10px] text-primary/70 shrink-0 flex items-center gap-0.5">
            <ExternalLink className="h-3 w-3" />
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
        {task.leiras}
      </p>
      <div className="flex items-center justify-between pt-2">
        <span
          className={`text-[10px] font-medium tabular-nums flex items-center gap-1 ${
            isOverdue ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {isOverdue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
          {format(new Date(task.hatarido), "yyyy. MM. dd.", { locale: hu })}
        </span>
        <span className="text-[10px] text-muted-foreground opacity-60">2x kattintás: megnyitás</span>
      </div>
    </CardContent>
  )
}

// --- Sortable Kártya komponens (eaisyhr modell) ---
function SortableTaskCard({
  task,
  onDoubleClick,
}: {
  task: Task
  onDoubleClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const isOverdue = new Date(task.hatarido) < new Date() && task.allapot !== "kesz"

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onDoubleClick()
      }}
      className={cn(
        "cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors select-none",
        isDragging ? "z-50 shadow-lg border-primary" : ""
      )}
    >
      <TaskCardContent task={task} isOverdue={isOverdue} />
    </Card>
  )
}

// --- Droppable Oszlop komponens (eaisyhr modell) ---
function DroppableColumn({
  id,
  title,
  tasks,
  onTaskDoubleClick,
}: {
  id: string
  title: string
  tasks: Task[]
  onTaskDoubleClick: (task: Task) => void
}) {
  const { setNodeRef } = useSortable({
    id,
    data: { type: "Column", columnId: id },
  })

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{title}</h3>
        <Badge variant="secondary" className="tabular-nums">
          {tasks.length}
        </Badge>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 bg-muted/30 rounded-lg p-2 flex flex-col gap-3 min-h-[500px] border border-transparent transition-colors"
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onDoubleClick={() => onTaskDoubleClick(task)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-lg pointer-events-none">
            <span className="text-sm text-muted-foreground">Üres</span>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Fő Kanban Tábla ---
export function KanbanBoard({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  // Szenzorok eaisyhr beállítás alapján (5px activation constraint)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeTask = tasks.find((t) => t.id === activeId)
    if (!activeTask) return

    // Meghatározzuk az új állapotot (oszlop vagy kártya)
    const overTask = tasks.find((t) => t.id === overId)
    const newStatus = overTask ? overTask.allapot : overId

    // Ha nem ismert oszlopba húztuk, kilépünk
    if (!COLUMNS.some((col) => col.id === newStatus)) return

    // Ha ugyanabban az oszlopban mozgattuk (sorrend rendezés)
    if (activeTask.allapot === newStatus) {
      const activeIndex = tasks.findIndex((t) => t.id === activeId)
      const overIndex = tasks.findIndex((t) => t.id === overId)
      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        setTasks(arrayMove(tasks, activeIndex, overIndex))
      }
      return
    }

    // Oszlopok közötti mozgatás
    const originalStatus = activeTask.allapot as any

    // Optimista frissítés
    setTasks((prev) =>
      prev.map((t) => (t.id === activeId ? { ...t, allapot: newStatus } : t))
    )

    const response = await updateTaskStatus(activeId, newStatus as any, originalStatus)
    if (!response.success) {
      toast.error(response.error || "Nem sikerült elmenteni az állapotot!")
      setTasks((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, allapot: originalStatus } : t))
      )
    } else {
      toast.success("Feladat állapota frissítve!")
    }
  }

  // Dupla kattintás kezelő
  const handleTaskDoubleClick = (task: Task) => {
    if (task.ugyirat?.id) {
      router.push(`/dossiers/${task.ugyirat.id}`)
    } else {
      setSelectedTask(task)
    }
  }

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null

  if (!isMounted) {
    return <div className="h-[400px] w-full animate-pulse bg-muted/20 rounded-md"></div>
  }

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start pb-4">
          {COLUMNS.map((column) => (
            <DroppableColumn
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={tasks.filter((t) => t.allapot === column.id)}
              onTaskDoubleClick={handleTaskDoubleClick}
            />
          ))}
        </div>

        {/* DragOverlay közvetlenül a DndContext-ben az eaisyhr szerint */}
        <DragOverlay>
          {activeTask ? (
            <Card className="cursor-grabbing shadow-2xl scale-105 border-primary opacity-80">
              <TaskCardContent
                task={activeTask}
                isOverdue={
                  new Date(activeTask.hatarido) < new Date() && activeTask.allapot !== "kesz"
                }
              />
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Részletező Dialog általános feladathoz */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-md">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="outline">
                    {STATUS_LABELS[selectedTask.allapot] || selectedTask.allapot}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {format(new Date(selectedTask.hatarido), "yyyy. MM. dd.", { locale: hu })}
                  </span>
                </div>
                <DialogTitle className="text-base font-semibold pt-2 leading-relaxed">
                  {selectedTask.ugyirat ? (
                    <div className="flex items-center gap-1 text-muted-foreground text-sm font-normal">
                      Ügyirat:{" "}
                      <Link
                        href={`/dossiers/${selectedTask.ugyirat.id}`}
                        className="text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        {selectedTask.ugyirat.iktatoszam}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ) : (
                    "Általános feladat"
                  )}
                </DialogTitle>
                <DialogDescription className="text-sm text-foreground pt-3 whitespace-pre-wrap leading-relaxed">
                  {selectedTask.leiras}
                </DialogDescription>
              </DialogHeader>

              <DialogFooter className="pt-4 flex items-center sm:justify-between gap-2">
                <Button variant="outline" onClick={() => setSelectedTask(null)}>
                  Bezárás
                </Button>
                {selectedTask.ugyirat && (
                  <Button
                    onClick={() => router.push(`/dossiers/${selectedTask.ugyirat!.id}`)}
                    className="gap-1.5"
                  >
                    Ügyirat megtekintése
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
