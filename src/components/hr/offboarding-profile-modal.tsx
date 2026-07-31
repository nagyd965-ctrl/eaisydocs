"use client"

import { useState } from "react"
import { addOffboardingTask, deleteOffboardingTask, toggleOffboardingTaskStatus, closeOffboarding } from "@/app/hr/offboarding/actions"
import { Check, Clock, Plus, Trash2, Calendar, Edit2, Loader2, Save, X, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface OffboardingProfileModalProps {
  offboarding: any
  onDateChange: (newDate: string) => Promise<void>
}

export function OffboardingProfileModal({ offboarding, onDateChange }: OffboardingProfileModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [isEditingDate, setIsEditingDate] = useState(false)
  const [tempDate, setTempDate] = useState(offboarding.kilepes_datuma || "")
  
  const [newTaskName, setNewTaskName] = useState("")
  const [newTaskResp, setNewTaskResp] = useState("HR")
  const [isAdding, setIsAdding] = useState(false)

  const initials = offboarding.felhasznalo_profil?.nev
    ? offboarding.felhasznalo_profil.nev.split(' ').map((n: string) => n[0]).join('').substring(0, 2)
    : "U"

  const tasks = offboarding.hr_offboarding_feladat || []
  const doneTasks = tasks.filter((t: any) => t.statusz === 'done').length
  const progress = tasks.length > 0 ? (doneTasks / tasks.length) * 100 : 0

  const handleDateSave = async () => {
    await onDateChange(tempDate)
    setIsEditingDate(false)
  }

  const handleAddTask = async () => {
    if (!newTaskName.trim()) return
    setIsAdding(true)
    await addOffboardingTask(offboarding.id, newTaskName, newTaskResp)
    setNewTaskName("")
    setIsAdding(false)
  }

  const handleDeleteTask = async (taskId: string) => {
    if (confirm("Biztosan törlöd ezt a feladatot?")) {
      await deleteOffboardingTask(taskId)
    }
  }

  const handleToggleStatus = async (taskId: string, currentStatus: string) => {
    await toggleOffboardingTaskStatus(taskId, currentStatus)
  }

  const handleCloseOffboarding = async () => {
    setIsAlertOpen(true)
  }

  const confirmCloseOffboarding = async () => {
    await closeOffboarding(offboarding.id)
    setIsAlertOpen(false)
    setIsOpen(false)
  }

  return (
    <>
      <div className="absolute inset-0 w-full h-full cursor-pointer z-10" onClick={(e) => { e.stopPropagation(); setIsOpen(true); }} />
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-background border-border/50">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 border-b">
          <div className="flex gap-5 items-start">
            <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xl uppercase shadow-sm border border-primary/10">
              {initials}
            </div>
            
            <div className="flex-1 pt-1">
              <h2 className="text-2xl font-bold tracking-tight">
                {offboarding.felhasznalo_profil?.nev || "Ismeretlen"}
              </h2>
              
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground bg-background/50 px-2.5 py-1 rounded-md border">
                  <Calendar className="w-4 h-4 text-primary/70" />
                  {isEditingDate ? (
                    <div className="flex items-center gap-2">
                      <Input 
                        type="date" 
                        className="h-7 w-[140px] text-xs px-2"
                        value={tempDate} 
                        onChange={(e) => setTempDate(e.target.value)} 
                      />
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50" onClick={handleDateSave}>
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setIsEditingDate(false)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span>Utolsó munkanap: <strong className="text-foreground font-medium">{offboarding.kilepes_datuma || "Nincs megadva"}</strong></span>
                      <Button size="icon" variant="ghost" className="h-5 w-5 ml-1 opacity-50 hover:opacity-100" onClick={() => setIsEditingDate(true)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 pt-4 bg-muted/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              Kiléptetési Feladatok
              <Badge variant="outline" className="bg-background">{doneTasks}/{tasks.length}</Badge>
            </h3>
            <div className="flex-1 max-w-[200px] ml-4 flex items-center gap-4">
              <Progress value={progress} className="h-2 flex-1" />
              {progress === 100 && offboarding.statusz !== 'lezart' && (
                <Button size="sm" variant="default" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={handleCloseOffboarding}>
                  <Lock className="w-3.5 h-3.5 mr-1" /> Lezárás
                </Button>
              )}
            </div>
          </div>

          <div className="bg-background border rounded-xl shadow-sm divide-y">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                Nincsenek még feladatok rögzítve ehhez a kiléptetéshez.
              </div>
            ) : (
              tasks.map((task: any) => (
                <div 
                  key={task.id} 
                  className={`flex items-center gap-4 p-3 hover:bg-muted/30 transition-colors ${task.statusz === 'done' ? 'opacity-60 bg-muted/10' : ''}`}
                >
                  <button
                    onClick={() => handleToggleStatus(task.id, task.statusz)}
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                      ${task.statusz === 'done' 
                        ? 'bg-emerald-500 border-emerald-600 text-white' 
                        : 'border-muted-foreground/30 hover:border-primary text-transparent hover:text-primary/20'}`}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${task.statusz === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.cim}
                    </p>
                  </div>
                  
                  <Badge variant="secondary" className="text-[10px] font-medium bg-muted">
                    {task.felelos_reszleg}
                  </Badge>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-destructive/40 hover:text-destructive hover:bg-destructive/10 -mr-1"
                    onClick={() => handleDeleteTask(task.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
            
            <div className="p-3 bg-muted/10 flex items-center gap-2">
              <Input 
                placeholder="Új feladat hozzáadása..." 
                className="h-8 text-sm flex-1 bg-background"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              />
              <select 
                className="h-8 text-sm bg-background border rounded-md px-2 text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
                value={newTaskResp}
                onChange={(e) => setNewTaskResp(e.target.value)}
              >
                <option value="HR">HR</option>
                <option value="IT">IT</option>
                <option value="Bérszámfejtés">Bérszámfejtés</option>
                <option value="Üzemeltetés">Üzemeltetés</option>
                <option value="Vezető">Vezető</option>
              </select>
              <Button size="sm" className="h-8" onClick={handleAddTask} disabled={isAdding || !newTaskName.trim()}>
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Mentés
              </Button>
            </div>
          </div>
        </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kiléptetés lezárása</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan lezárod ezt a kiléptetést? A művelet nem vonható vissza, és a dolgozó átkerül a lezárt kiléptetések közé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCloseOffboarding} className="bg-emerald-600 hover:bg-emerald-700">
              Lezárás
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
