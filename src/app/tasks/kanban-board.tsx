"use client"

import { useState, useEffect } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { format } from "date-fns"
import { hu } from "date-fns/locale"
import { Calendar, GripVertical, AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react"
import { updateTaskStatus } from "./task-actions"
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
  { id: "nyitott", title: "Nyitott", icon: Clock, color: "text-slate-500", border: "border-slate-500" },
  { id: "folyamatban", title: "Folyamatban", icon: Calendar, color: "text-blue-500", border: "border-blue-500" },
  { id: "kesz", title: "Kész", icon: CheckCircle2, color: "text-primary", border: "border-primary" },
  { id: "elutasitott", title: "Elutasított", icon: XCircle, color: "text-destructive", border: "border-destructive" },
]

export function KanbanBoard({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStatus = destination.droppableId as Task["allapot"]
    
    // Optimistic UI update
    const updatedTasks = tasks.map(t => t.id === draggableId ? { ...t, allapot: newStatus } : t)
    setTasks(updatedTasks)

    const response = await updateTaskStatus(draggableId, newStatus as any)
    if (!response.success) {
      console.error("Nem sikerült elmenteni az állapotot!")
      setTasks(tasks)
    }
  }

  if (!isMounted) {
    return <div className="h-[400px] w-full animate-pulse bg-muted/20 rounded-md"></div>
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        {COLUMNS.map(column => {
          const columnTasks = tasks.filter(t => t.allapot === column.id)
          const Icon = column.icon

          return (
            <div key={column.id} className="flex flex-col bg-muted/30 border rounded-md min-h-[500px]">
              <div className="flex items-center justify-between p-3 border-b bg-background/50">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${column.color}`} />
                  <h3 className="font-semibold text-sm tracking-tight">{column.title}</h3>
                </div>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-sm tabular-nums">
                  {columnTasks.length}
                </span>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 flex flex-col gap-2 p-2 transition-colors ${snapshot.isDraggingOver ? "bg-muted/50" : ""}`}
                  >
                    {columnTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => {
                          const isOverdue = new Date(task.hatarido) < new Date() && task.allapot !== 'kesz'
                          return (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`
                                flex flex-col bg-background border rounded-md p-3 relative group
                                ${snapshot.isDragging ? "ring-1 ring-primary z-50 opacity-90" : "hover:border-primary/40"}
                                transition-all
                              `}
                            >
                              <div className={`absolute top-0 left-0 w-full h-0.5 ${column.border} rounded-t-md opacity-50`} />
                              
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="text-xs font-semibold text-primary truncate max-w-[180px]">
                                  {task.ugyirat ? (
                                    <Link href={`/dossiers/${task.ugyirat.id}`} className="hover:underline">
                                      {task.ugyirat.iktatoszam || "Nincs Iktatószám"}
                                    </Link>
                                  ) : "Általános feladat"}
                                </div>
                                <div {...provided.dragHandleProps} className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing transition-colors">
                                  <GripVertical className="h-4 w-4" />
                                </div>
                              </div>
                              
                              <p className="text-sm text-foreground/90 mb-3 line-clamp-3 leading-snug">
                                {task.leiras}
                              </p>

                              <div className="mt-auto flex items-center justify-between">
                                <div className={`flex items-center text-xs font-medium tabular-nums ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                                  {isOverdue ? <AlertCircle className="h-3.5 w-3.5 mr-1" /> : <Calendar className="h-3.5 w-3.5 mr-1" />}
                                  {format(new Date(task.hatarido), 'MM.dd.', { locale: hu })}
                                </div>
                              </div>
                            </div>
                          )
                        }}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
