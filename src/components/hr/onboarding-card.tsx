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
  UserCheck, 
  UserPlus, 
  ChevronRight, 
  Briefcase,
  Layers,
  Sparkles
} from "lucide-react"
import { updateOnboardingDate } from "@/app/hr/onboarding/actions"
import { OnboardingProfileModal } from "./onboarding-profile-modal"
import type { OrgUnitOption, JobOption } from "@/app/hr/actions/job-org-actions"
import { toast } from "sonner"
import { type OnboardingProfile, type OnboardingTask } from "@/types/hr"

interface OnboardingCardProps {
  onboarding: OnboardingProfile
  orgUnits?: OrgUnitOption[]
  jobs?: JobOption[]
}

export function OnboardingCard({ onboarding, orgUnits, jobs }: OnboardingCardProps) {
  const [open, setOpen] = useState(false)

  const tasks: OnboardingTask[] = onboarding.hr_onboarding_feladat || onboarding.tasks || []
  const doneCount = tasks.filter((t) => t.statusz === "done").length
  const totalCount = tasks.length
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0
  const isDone = progress === 100
  const isClosed = onboarding.statusz === "lezart"
  const isAccountActive = onboarding.fiok_allapot === "aktivalva" || Boolean(onboarding.dolgozo_id)

  const handleDateChange = async (newDate: string) => {
    if (!newDate) return
    const result = await updateOnboardingDate(onboarding.id, newDate)
    if (result.error) toast.error(result.error)
    else toast.success("Belépési dátum sikeresen frissítve!")
  }

  // Belépési dátum intelligens formázása
  const formatEntryDate = () => {
    if (!onboarding.belepes_datuma || onboarding.belepes_datuma === "Hamarosan") {
      return { text: "Hamarosan", badgeClass: "bg-muted text-muted-foreground" }
    }

    try {
      const entryDate = new Date(onboarding.belepes_datuma)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      entryDate.setHours(0, 0, 0, 0)

      const diffDays = Math.round((entryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const formatted = entryDate.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })

      if (diffDays === 0) {
        return { text: "Ma kezd!", badgeClass: "bg-success/10 text-success border-success/20 font-semibold animate-pulse" }
      } else if (diffDays === 1) {
        return { text: "Holnap kezd", badgeClass: "bg-primary/10 text-primary border-primary/20 font-medium" }
      } else if (diffDays > 1 && diffDays <= 14) {
        return { text: `${formatted} (${diffDays} nap múlva)`, badgeClass: "bg-primary/10 text-primary border-primary/20 font-medium" }
      } else if (diffDays > 14) {
        return { text: formatted, badgeClass: "bg-muted/50 text-muted-foreground border-border/50" }
      } else {
        return { text: `${formatted} (${Math.abs(diffDays)} napja)`, badgeClass: "bg-muted text-muted-foreground" }
      }
    } catch {
      return { text: onboarding.belepes_datuma, badgeClass: "bg-muted text-muted-foreground" }
    }
  }

  const dateInfo = formatEntryDate()

  // Initials for avatar
  const initials = (onboarding.nev || "Új munkatárs")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        nativeButton={false}
        render={
          <Card className="flex flex-col relative overflow-hidden h-full cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-all duration-200 group border" />
        }
      >
        {/* Felső vékony csík a haladásnak */}
        <div 
          className={`absolute top-0 left-0 h-1 transition-all duration-500 ${
            isClosed ? "bg-muted-foreground/40" : isDone ? "bg-success" : "bg-primary"
          }`}
          style={{ width: `${progress}%` }} 
        />

        <CardHeader className="p-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-semibold text-sm shrink-0 group-hover:scale-105 transition-transform">
                {initials}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors truncate">
                  {onboarding.nev}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span>{onboarding.munkakor || "Pozíció nincs megadva"}</span>
                  {onboarding.reszleg && (
                    <>
                      <span className="opacity-40">•</span>
                      <span className="font-medium text-foreground/80">{onboarding.reszleg}</span>
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
              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20 shrink-0 font-medium gap-1">
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
          {/* Információs sorok: Belépési dátum & Fiók állapot */}
          <div className="flex items-center justify-between gap-2 text-xs flex-wrap pt-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span>Belépés:</span>
              <Badge variant="outline" className={`text-[11px] px-2 py-0 h-5 ${dateInfo.badgeClass}`}>
                {dateInfo.text}
              </Badge>
            </div>

            {/* Fiókállapot jelző */}
            {isAccountActive ? (
              <Badge variant="outline" className="text-[11px] bg-success/10 text-success border-success/20 px-2 py-0 h-5 gap-1 font-medium">
                <UserCheck className="w-3 h-3" /> Fiók aktív
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[11px] bg-warning/10 text-warning border-warning/20 px-2 py-0 h-5 gap-1 font-medium">
                <Clock className="w-3 h-3 text-warning" /> Fiók aktiválásra vár
              </Badge>
            )}
          </div>

          {/* Haladási sáv és feladatszámláló */}
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Előrehaladás
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

      <OnboardingProfileModal 
        onboarding={onboarding} 
        orgUnits={orgUnits}
        jobs={jobs}
        onDateChange={handleDateChange} 
        onCloseDialog={() => setOpen(false)}
      />
    </Dialog>
  )
}
