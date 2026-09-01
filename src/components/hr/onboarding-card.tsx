"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { CheckCircle2 } from "lucide-react"
import { toggleTaskStatus, updateOnboardingDate } from "@/app/hr/onboarding/actions"
import { OnboardingProfileModal } from "./onboarding-profile-modal"
import { toast } from "sonner"

import { type OnboardingProfile, type OnboardingTask } from "@/types/hr"

interface OnboardingCardProps {
  onboarding: OnboardingProfile
}

export function OnboardingCard({ onboarding }: OnboardingCardProps) {
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null)

  const tasks: OnboardingTask[] = onboarding.hr_onboarding_feladat || onboarding.tasks || []
  const doneCount = tasks.filter((t) => t.statusz === 'done').length
  const progress = tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0

  const handleToggle = async (taskId: string, currentStatus: string) => {
    setLoadingTaskId(taskId)
    const result = await toggleTaskStatus(taskId, currentStatus)
    setLoadingTaskId(null)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(currentStatus === 'pending' ? 'Feladat elvégezve!' : 'Feladat visszanyitva.')
    }
  }

  const handleDateChange = async (newDate: string) => {
    if (!newDate) return
    const result = await updateOnboardingDate(onboarding.id, newDate)
    if (result.error) toast.error(result.error)
    else toast.success("Dátum sikeresen frissítve!")
  }

  return (
    <Card className="flex flex-col relative overflow-hidden h-full">
      <div 
        className="absolute top-0 left-0 h-1 transition-all duration-500 bg-primary" 
        style={{ width: `${progress}%` }} 
      />
      <Dialog>
        <DialogTrigger nativeButton={false} render={<CardHeader className="border-b pb-4 pt-5 cursor-pointer hover:bg-muted/30 transition-colors group" />}>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="group-hover:text-primary transition-colors">{onboarding.nev}</CardTitle>
                <CardDescription className="mt-1">
                  {onboarding.munkakor} • Belépés: <span className="font-semibold text-foreground">{onboarding.belepes_datuma}</span>
                </CardDescription>
              </div>
              <Badge variant={progress === 100 ? "default" : "secondary"}>
                {progress === 100 ? "Kész" : "Folyamatban"}
              </Badge>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Progress value={progress} className="h-2 flex-1" />
              <span className="text-xs font-semibold tabular-nums text-muted-foreground w-8 text-right">
                {Math.round(progress)}%
              </span>
            </div>
        </DialogTrigger>
        <OnboardingProfileModal onboarding={onboarding} onDateChange={handleDateChange} />
      </Dialog>
      <CardContent className="pt-4 flex-1 flex flex-col gap-3">
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nincsenek rögzített feladatok.</p>
        )}
        {tasks.map((task) => {
          const isDone = task.statusz === 'done'
          const isLoading = loadingTaskId === task.id
          
          return (
            <div 
              key={task.id} 
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                isDone ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-6 w-6 rounded-full shrink-0 p-0 ${isDone ? 'text-primary hover:text-primary/80' : 'text-muted-foreground hover:text-foreground'}`}
                  disabled={isLoading}
                  onClick={() => handleToggle(task.id, task.statusz)}
                >
                  {isDone ? <CheckCircle2 className="h-5 w-5" /> : <div className="h-4 w-4 rounded-full border-2" />}
                </Button>
                <div>
                  <p className={`text-sm font-medium ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                    {task.cim}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Felelős: <span className="font-semibold">{task.felelos_reszleg}</span>
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
