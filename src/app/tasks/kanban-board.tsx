"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, useDroppable, useDraggable, DragStartEvent, DragEndEvent } from "@dnd-kit/core"
import { format } from "date-fns"
import { hu } from "date-fns/locale"
import { Calendar, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { updateTaskStatus } from "./task-actions"
import { toast } from "sonner"
import Link from "next/link"

interface Task {
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

// --- Kártya tartalom (újrahasználható az overlay-ben is) ---
function TaskCardContent({ task, isOverdue }: { task: Task, isOverdue: boolean }) {
  return (
    <CardContent className="p-4 space-y-2">
      <div className="font-medium text-sm">
        {task.ugyirat ? (
          <span className="text-foreground">{task.ugyirat.iktatoszam || "Nincs Iktatószám"}</span>
        ) : "Általános feladat"}
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
        {task.leiras}
      </p>
      <div className="flex items-center pt-2">
        <span className={`text-[10px] font-medium tabular-nums flex items-center gap-1 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
          {isOverdue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
          {format(new Date(task.hatarido), 'yyyy. MM. dd.', { locale: hu })}
        </span>
      </div>
    </CardContent>
  )
}

// --- Draggable kártya ---
function DraggableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.allapot }
  })

  const isOverdue = new Date(task.hatarido) < new Date() && task.allapot !== 'kesz'

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing transition-colors ${isDragging ? 'opacity-30 border-primary' : 'hover:border-primary/50'}`}
    >
      <TaskCardContent task={task} isOverdue={isOverdue} />
    </Card>
  )
}

// --- Droppable oszlop ---
function DroppableColumn({ id, title, tasks: columnTasks }: { id: string, title: string, tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{title}</h3>
        <Badge variant="secondary" className="tabular-nums">{columnTasks.length}</Badge>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-3 bg-muted/30 rounded-lg p-2 min-h-[500px] border transition-colors ${
          isOver ? "border-primary/40 bg-primary/5" : "border-transparent"
        }`}
      >
        {columnTasks.map(task => (
          <DraggableTaskCard key={task.id} task={task} />
        ))}

        {columnTasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-lg pointer-events-none">
            <span className="text-sm text-muted-foreground">Üres</span>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Fő Kanban Board ---
export function KanbanBoard({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])
  useEffect(() => { setTasks(initialTasks) }, [initialTasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const activeTaskId = active.id as string
    const newStatus = over.id as string

    const activeTask = tasks.find(t => t.id === activeTaskId)
    if (!activeTask) return
    if (activeTask.allapot === newStatus) return

    const originalTasks = [...tasks]
    setTasks(prev => prev.map(t => t.id === activeTaskId ? { ...t, allapot: newStatus } : t))

    const response = await updateTaskStatus(activeTaskId, newStatus as any)
    if (!response.success) {
      toast.error("Nem sikerült elmenteni az állapotot!")
      setTasks(originalTasks)
    } else {
      toast.success("Feladat állapota frissítve!")
    }
  }

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null

  if (!isMounted) {
    return <div className="h-[400px] w-full animate-pulse bg-muted/20 rounded-md"></div>
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        {COLUMNS.map(column => (
          <DroppableColumn
            key={column.id}
            id={column.id}
            title={column.title}
            tasks={tasks.filter(t => t.allapot === column.id)}
          />
        ))}
      </div>

      {/* DragOverlay PORTÁLLAL a document.body-ba — így a sidebar offset nem okoz ugrást */}
      {typeof document !== "undefined" && createPortal(
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <Card className="cursor-grabbing border-primary rotate-[2deg] w-[250px]">
              <TaskCardContent task={activeTask} isOverdue={new Date(activeTask.hatarido) < new Date() && activeTask.allapot !== 'kesz'} />
            </Card>
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  )
}
