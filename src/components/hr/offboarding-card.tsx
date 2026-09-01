import { toggleOffboardingTaskStatus, updateOffboardingDate, deleteOffboardingProcess } from "@/app/hr/offboarding/actions"
import { OffboardingProfileModal } from "./offboarding-profile-modal"
import { Progress } from "@/components/ui/progress"
import { Calendar, Trash2, MessageSquare } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { useState } from "react"

import { type OffboardingListItem, type OffboardingTask } from "./offboarding-list"

interface OffboardingCardProps {
  offboarding: OffboardingListItem
}

export function OffboardingCard({ offboarding }: OffboardingCardProps) {
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const tasks: OffboardingTask[] = offboarding.hr_offboarding_feladat || []
  const doneTasks = tasks.filter((t) => t.statusz === 'done').length
  const progress = tasks.length > 0 ? (doneTasks / tasks.length) * 100 : 0
  
  const initials = offboarding.felhasznalo_profil?.nev
    ? offboarding.felhasznalo_profil.nev.split(' ').map((n: string) => n[0]).join('').substring(0, 2)
    : "U"

  return (
    <Card className="hover:shadow-md transition-shadow group relative overflow-hidden bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border-muted/50 hover:border-border cursor-pointer">
      <OffboardingProfileModal 
        offboarding={offboarding} 
        onDateChange={async (newDate) => {
          await updateOffboardingDate(offboarding.id, newDate)
        }} 
      />
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3 relative z-20">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm uppercase">
              {initials}
            </div>
            <div>
              <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
                {offboarding.felhasznalo_profil?.nev || "Ismeretlen"}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                {offboarding.kilepes_datuma || "Ismeretlen"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 relative z-50">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsAlertOpen(true)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground font-medium px-1">
            <span>Állapot</span>
            <div className="flex items-center gap-2">
              {offboarding.hr_kilepes_interju?.[0]?.kilepes_kategoria && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  <MessageSquare className="w-2.5 h-2.5" /> Interjú kitöltve
                </span>
              )}
              <span>{doneTasks} / {tasks.length} feladat</span>
            </div>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </CardContent>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>Kiléptetés törlése</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan törlöd ezt a kiléptetési folyamatot? Ez a művelet nem vonható vissza, és az összes hozzá tartozó feladat is törlődik.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Mégse</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async (e) => {
                e.stopPropagation()
                await deleteOffboardingProcess(offboarding.id)
                setIsAlertOpen(false)
              }} 
              className="bg-destructive hover:bg-destructive/90"
            >
              Törlés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
