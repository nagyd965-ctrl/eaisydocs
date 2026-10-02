"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  Briefcase,
  Layers,
  Building2
} from "lucide-react"
import { updateOffboardingDate } from "@/app/hr/offboarding/actions"
import { OffboardingProfileModal } from "./offboarding-profile-modal"
import { toast } from "sonner"
import { type OffboardingListItem, type OffboardingTask } from "./offboarding-list"
import { TERMINATION_SHORT_LABELS, type TerminationType } from "@/utils/hr/termination-constants"

interface OffboardingCardProps {
  offboarding: OffboardingListItem
}

export function OffboardingCard({ offboarding }: OffboardingCardProps) {
  const [open, setOpen] = useState(false)

  const tasks: OffboardingTask[] = offboarding.hr_offboarding_feladat || []
  const doneCount = tasks.filter((t) => t.statusz === "done").length
  const totalCount = tasks.length
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0
  const isDone = progress === 100
  const isClosed = offboarding.statusz === "lezart"

  const employeeName = offboarding.felhasznalo_profil?.nev || (offboarding as any).nev || "Kilépő munkatárs"
  const munkakor = offboarding.munkakor || offboarding.felhasznalo_profil?.munkakor || null
  const reszleg = offboarding.reszleg || offboarding.felhasznalo_profil?.reszleg || (offboarding.felhasznalo_profil as any)?.hr_szervezeti_egyseg?.nev || null

  const initials = employeeName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  const terminationLabel = (offboarding as any).megszunes_modja 
    ? (TERMINATION_SHORT_LABELS[(offboarding as any).megszunes_modja as TerminationType] || (offboarding as any).megszunes_modja)
    : "Közös megegyezés"

  const handleDateChange = async (newDate: string) => {
    if (!newDate) return
    const result = await updateOffboardingDate(offboarding.id, newDate)
    if (result.error) toast.error(result.error)
    else toast.success("Utolsó munkanap sikeresen frissítve!")
  }

  // Utolsó munkanap intelligens formázása (matching Onboarding)
  const formatDateInfo = () => {
    if (!offboarding.utolso_munkanap || offboarding.utolso_munkanap === "Hamarosan") {
      return { text: "Hamarosan", badgeClass: "bg-muted text-muted-foreground" }
    }

    try {
      const exitDate = new Date(offboarding.utolso_munkanap)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      exitDate.setHours(0, 0, 0, 0)

      const diffTime = exitDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      const formatted = exitDate.toLocaleDateString("hu-HU", {
        month: "short",
        day: "numeric",
      })

      if (diffDays === 0) {
        return { text: "Ma (utolsó nap)", badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold" }
      } else if (diffDays < 0) {
        return { text: `${formatted} (${Math.abs(diffDays)} napja kilépett)`, badgeClass: "bg-muted text-muted-foreground" }
      } else if (diffDays <= 7) {
        return { text: `${formatted} (${diffDays} nap múlva)`, badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" }
      } else {
        return { text: `${formatted} (${diffDays} nap múlva)`, badgeClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" }
      }
    } catch {
      return { text: offboarding.utolso_munkanap, badgeClass: "bg-muted text-muted-foreground" }
    }
  }

  const dateInfo = formatDateInfo()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        nativeButton={false}
        render={
          <Card className="flex flex-col relative overflow-hidden h-full cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-all duration-200 group border shadow-sm text-left" />
        }
      >
        {/* Felső vékony csík a haladásnak */}
        <div 
          className={`absolute top-0 left-0 h-1 transition-all duration-500 ${
            isClosed ? "bg-muted-foreground/40" : isDone ? "bg-emerald-500" : "bg-primary"
          }`}
          style={{ width: `${progress}%` }} 
        />

        <CardHeader className="p-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm uppercase shrink-0 border border-primary/20 group-hover:scale-105 transition-transform">
                {initials}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors truncate">
                  {employeeName}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                  <Briefcase className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{munkakor || "Munkakör nincs megadva"}</span>
                  {reszleg && (
                    <>
                      <span className="opacity-40">•</span>
                      <span className="font-medium text-foreground/80 shrink-0">{reszleg}</span>
                    </>
                  )}
                </CardDescription>
              </div>
            </div>

            {/* Fő Státusz Badge */}
            {isClosed ? (
              <Badge variant="outline" className="text-xs bg-muted text-muted-foreground shrink-0 font-normal">
                Lezárva
              </Badge>
            ) : isDone ? (
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shrink-0 font-medium gap-1">
                <CheckCircle2 className="w-3 h-3" /> Kész
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 shrink-0 font-medium">
                Folyamatban
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-2 flex-1 flex flex-col justify-between space-y-4">
          {/* Információs sorok: Utolsó munkanap & Megszűnés jogcíme */}
          <div className="flex items-center justify-between gap-2 text-xs flex-wrap pt-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span>Utolsó nap:</span>
              <Badge variant="outline" className={`text-[11px] px-2 py-0 h-5 ${dateInfo.badgeClass}`}>
                {dateInfo.text}
              </Badge>
            </div>

            <Badge variant="secondary" className="text-[11px] font-normal">
              {terminationLabel}
            </Badge>
          </div>

          {/* Haladási sáv és feladatszámláló */}
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Kiléptetési haladás
              </span>
              <span className="font-medium text-foreground tabular-nums">
                {doneCount} / {totalCount} feladat ({Math.round(progress)}%)
              </span>
            </div>
            <Progress value={progress} className="h-1.5 bg-muted" />
          </div>

          {/* Alsó megnyitási segédsáv */}
          <div className="flex items-center justify-between text-xs text-primary font-medium pt-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <span>Részletek és teendők megnyitása</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </CardContent>
      </DialogTrigger>

      <OffboardingProfileModal 
        offboarding={offboarding} 
        onDateChange={handleDateChange} 
        onCloseDialog={() => setOpen(false)} 
      />
    </Dialog>
  )
}
