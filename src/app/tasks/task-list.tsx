"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { hu } from "date-fns/locale"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Calendar as CalendarIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

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

const STATUS_LABELS: Record<string, string> = {
  nyitott: "Nyitott",
  folyamatban: "Folyamatban",
  kesz: "Kész",
  elutasitott: "Elutasított",
}

export function TaskList({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const router = useRouter()

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border rounded-xl border-dashed bg-muted/20">
        <p className="text-muted-foreground text-center">Jelenleg nincs egyetlen feladatod sem!</p>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "nyitott":
        return (
          <Badge variant="outline" className="text-slate-500 border-slate-200">
            Nyitott
          </Badge>
        )
      case "folyamatban":
        return (
          <Badge
            variant="outline"
            className="text-blue-500 border-blue-200 bg-blue-50/50 dark:bg-blue-900/10"
          >
            Folyamatban
          </Badge>
        )
      case "kesz":
        return (
          <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
            Kész
          </Badge>
        )
      case "elutasitott":
        return (
          <Badge
            variant="outline"
            className="text-destructive border-destructive/30 bg-destructive/5"
          >
            Elutasított
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleRowClick = (task: Task) => {
    if (task.ugyirat?.id) {
      router.push(`/dossiers/${task.ugyirat.id}`)
    } else {
      setSelectedTask(task)
    }
  }

  return (
    <div className="border border-border/50 bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/30 text-muted-foreground text-xs uppercase font-medium border-b border-border/50">
            <tr>
              <th className="px-4 py-3 font-medium">Ügyirat / Tárgy</th>
              <th className="px-4 py-3 font-medium">Feladat leírása</th>
              <th className="px-4 py-3 font-medium">Határidő</th>
              <th className="px-4 py-3 text-right font-medium">Állapot</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {tasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => handleRowClick(task)}
                className="hover:bg-muted/20 transition-colors group cursor-pointer"
              >
                <td className="px-4 py-3">
                  {task.ugyirat ? (
                    <div className="flex flex-col">
                      <Link
                        href={`/dossiers/${task.ugyirat.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold text-primary hover:underline text-xs inline-flex items-center gap-1"
                      >
                        {task.ugyirat.iktatoszam}
                        <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                      </Link>
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic text-xs">Nincs csatolva</span>
                  )}
                </td>
                <td className="px-4 py-3 text-foreground/90 max-w-md truncate text-sm">
                  {task.leiras}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`font-medium tabular-nums text-xs ${
                      new Date(task.hatarido) < new Date() && task.allapot !== "kesz"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {format(new Date(task.hatarido), "yyyy. MM. dd.", { locale: hu })}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">{getStatusBadge(task.allapot)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
