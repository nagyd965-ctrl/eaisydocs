"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { hu } from "date-fns/locale"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

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

export function TaskList({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [loadingTask, setLoadingTask] = useState<string | null>(null)

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
      case 'nyitott': return <Badge variant="outline" className="text-slate-500 border-slate-200">Nyitott</Badge>
      case 'folyamatban': return <Badge variant="outline" className="text-blue-500 border-blue-200 bg-blue-50/50 dark:bg-blue-900/10">Folyamatban</Badge>
      case 'kesz': return <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">Kész</Badge>
      case 'elutasitott': return <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5">Elutasított</Badge>
      default: return <Badge variant="outline">{status}</Badge>
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
            {initialTasks.map((task) => (
              <tr key={task.id} className="hover:bg-muted/20 transition-colors group">
                <td className="px-4 py-3">
                  {task.ugyirat ? (
                    <div className="flex flex-col">
                      <Link href={`/dossiers/${task.ugyirat.id}`} className="font-semibold text-primary hover:underline text-xs">
                        {task.ugyirat ? task.ugyirat.iktatoszam : "-"}
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
                  <span className={`font-medium tabular-nums text-xs ${new Date(task.hatarido) < new Date() && task.allapot !== 'kesz' ? "text-destructive" : "text-muted-foreground"}`}>
                    {format(new Date(task.hatarido), 'yyyy. MM. dd.', { locale: hu })}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {getStatusBadge(task.allapot)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
