"use client"

import { useState } from "react"
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
  startOfWeek,
  endOfWeek,
} from "date-fns"
import { hu } from "date-fns/locale"
import { ChevronLeft, ChevronRight, CalendarDays, ExternalLink, Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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

interface TaskCalendarProps {
  tasks: Task[]
}

const ALLAPOT_COLORS: Record<string, string> = {
  nyitott: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  folyamatban: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  kesz: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  elutasitott: "bg-destructive/10 text-destructive border-destructive/20",
}

const ALLAPOT_LABELS: Record<string, string> = {
  nyitott: "Nyitott",
  folyamatban: "Folyamatban",
  kesz: "Kész",
  elutasitott: "Elutasított",
}

export function TaskCalendar({ tasks }: TaskCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const handleToday = () => setCurrentMonth(new Date())

  // Naptár rács számítása (Hétfőtől Vasárnapig)
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Hétfővel kezdünk
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = eachDayOfInterval({ start: startDate, end: endDate })

  // Hét napjai rövidítve magyarul
  const weekDays = ["Hé", "Ke", "Sze", "Csü", "Pé", "Szo", "Vas"]

  const getTasksForDay = (day: Date) => {
    return tasks.filter((task) => {
      const taskDate = new Date(task.hatarido)
      return isSameDay(taskDate, day)
    })
  }

  return (
    <div className="space-y-4">
      {/* Naptár Fejléc */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border rounded-lg bg-card">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold capitalize">
            {format(currentMonth, "yyyy. MMMM", { locale: hu })}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Ma
          </Button>
          <div className="flex items-center border rounded-md">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none border-r" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Naptár Rács */}
      <div className="border rounded-lg bg-card overflow-hidden">
        {/* Hét napjai fejléc */}
        <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-xs font-semibold text-muted-foreground py-2">
          {weekDays.map((wd) => (
            <div key={wd}>{wd}</div>
          ))}
        </div>

        {/* Napok rácsa */}
        <div className="grid grid-cols-7 auto-rows-[120px] divide-x divide-y">
          {days.map((day) => {
            const dayTasks = getTasksForDay(day)
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
            const isTodayDay = isToday(day)

            return (
              <div
                key={day.toString()}
                className={`p-2 flex flex-col gap-1 transition-colors ${
                  isCurrentMonth ? "bg-card" : "bg-muted/10 text-muted-foreground"
                } ${isTodayDay ? "bg-primary/5 font-semibold" : ""}`}
              >
                {/* Nap száma */}
                <div className="flex justify-between items-center">
                  <span
                    className={`text-xs p-1 rounded-full w-6 h-6 flex items-center justify-center ${
                      isTodayDay
                        ? "bg-primary text-primary-foreground font-bold"
                        : ""
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {dayTasks.length} feladat
                    </span>
                  )}
                </div>

                {/* Feladatok listája a napon */}
                <div className="flex-1 overflow-y-auto space-y-1 scrollbar-none">
                  {dayTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border truncate cursor-pointer transition-colors hover:brightness-95 active:brightness-90 ${
                        ALLAPOT_COLORS[task.allapot] || "bg-muted text-foreground"
                      }`}
                    >
                      {task.ugyirat ? `[${task.ugyirat.iktatoszam.split("/").pop()}] ` : ""}
                      {task.leiras}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Feladat részletező Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-md">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between mt-2">
                  <Badge className={ALLAPOT_COLORS[selectedTask.allapot]}>
                    {ALLAPOT_LABELS[selectedTask.allapot] || selectedTask.allapot}
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
                        className="text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        {selectedTask.ugyirat.iktatoszam}
                        <ExternalLink className="h-3 w-3" />
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
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setSelectedTask(null)}>
                  Bezárás
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
