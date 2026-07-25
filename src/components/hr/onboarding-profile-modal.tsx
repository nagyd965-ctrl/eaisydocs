import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { UserCircle, Mail, CalendarDays, Briefcase, CheckCircle2, Clock, Trash2, Plus, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useState } from "react"
import { addOnboardingTask, deleteOnboardingTask } from "@/app/hr/onboarding/actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface OnboardingProfileModalProps {
  onboarding: any
  onDateChange: (newDate: string) => void
}

export function OnboardingProfileModal({ onboarding, onDateChange }: OnboardingProfileModalProps) {
  const [newTaskName, setNewTaskName] = useState("")
  const [newTaskResp, setNewTaskResp] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  
  const initials = onboarding.nev
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  const tasks = onboarding.hr_onboarding_feladat || []
  const doneCount = tasks.filter((t: any) => t.statusz === 'done').length
  const progress = tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0
  const isDone = progress === 100

  const handleAddTask = async () => {
    if (!newTaskName.trim() || !newTaskResp.trim()) return
    setIsAdding(true)
    const res = await addOnboardingTask(onboarding.id, newTaskName, newTaskResp)
    setIsAdding(false)
    if (res.error) toast.error(res.error)
    else {
      toast.success("Feladat hozzáadva")
      setNewTaskName("")
      setNewTaskResp("")
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Biztosan törlöd ezt a feladatot?")) return
    const res = await deleteOnboardingTask(taskId)
    if (res.error) toast.error(res.error)
    else toast.success("Feladat törölve")
  }

  return (
    <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-0 shadow-2xl">
      {/* Fejléc - Gradient háttérrel és Avatarral */}
      <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 pt-8 pb-6 border-b border-border/50">
        <div className="absolute top-4 right-4">
          <Badge variant={isDone ? "default" : "secondary"} className="shadow-sm">
            {isDone ? "Kész" : "Folyamatban"}
          </Badge>
        </div>
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-sm">
            <span className="text-xl font-bold text-primary">{initials}</span>
          </div>
          <div>
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              {onboarding.nev}
            </DialogTitle>
            <p className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" /> {onboarding.munkakor}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-8 max-h-[80vh] overflow-y-auto">
        {/* Adatok Grid */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">E-mail cím</label>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="w-4 h-4 text-primary" />
              {onboarding.hr_toborzas?.email || <span className="text-muted-foreground italic">Nincs megadva</span>}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Belépés Dátuma</label>
            <div className="relative">
              <CalendarDays className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="date" 
                className="pl-9 h-9 text-sm font-medium bg-muted/20 border-border/50 focus:bg-background transition-colors"
                defaultValue={onboarding.belepes_datuma === "Hamarosan" ? "" : onboarding.belepes_datuma} 
                onChange={(e) => onDateChange(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Feladatok Állapota */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Onboarding Feladatok</h3>
            <span className="text-sm font-bold text-primary">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 shadow-inner" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {tasks.map((task: any) => (
              <div 
                key={task.id} 
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  task.statusz === 'done' 
                    ? 'bg-primary/5 border-primary/20 text-muted-foreground' 
                    : 'bg-card border-border/50 shadow-sm'
                }`}
              >
                {task.statusz === 'done' ? (
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                ) : (
                  <Clock className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium leading-tight ${task.statusz === 'done' ? 'line-through' : ''}`}>
                    {task.cim}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">
                    {task.felelos_reszleg}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTask(task.id)}>
                   <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
             <Input placeholder="Új feladat neve..." value={newTaskName} onChange={e => setNewTaskName(e.target.value)} className="h-9 text-sm" />
             <Input placeholder="Felelős (pl. IT)" value={newTaskResp} onChange={e => setNewTaskResp(e.target.value)} className="w-32 h-9 text-sm" />
             <Button onClick={handleAddTask} disabled={isAdding || !newTaskName.trim() || !newTaskResp.trim()} className="h-9 px-3" size="sm">
               {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
             </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  )
}
