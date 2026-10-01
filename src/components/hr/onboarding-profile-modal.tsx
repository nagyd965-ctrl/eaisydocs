"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  DialogContent, 
  DialogTitle, 
  DialogHeader,
  DialogDescription,
  DialogFooter
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
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { 
  Mail, 
  CalendarDays, 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Plus, 
  Loader2, 
  UserPlus, 
  UserCheck, 
  ExternalLink, 
  Check, 
  Archive, 
  RotateCcw,
  ShieldCheck,
  FileText,
  Laptop,
  AlertTriangle
} from "lucide-react"
import { 
  addOnboardingTask, 
  deleteOnboardingTask, 
  toggleTaskStatus,
  activateOnboardingAccount,
  closeOnboarding,
  reopenOnboarding,
  deleteOnboarding
} from "@/app/hr/onboarding/actions"
import { AssetHandoverDialog } from "@/components/hr/asset-handover-dialog"
import { toast } from "sonner"
import { type OnboardingProfile, type OnboardingTask } from "@/types/hr"

interface OnboardingProfileModalProps {
  onboarding: OnboardingProfile
  onDateChange: (newDate: string) => void
  onCloseDialog?: () => void
}

export function OnboardingProfileModal({ onboarding, onDateChange, onCloseDialog }: OnboardingProfileModalProps) {
  const [newTaskName, setNewTaskName] = useState("")
  const [newTaskResp, setNewTaskResp] = useState("HR")
  const [isAdding, setIsAdding] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [activeDepartment, setActiveDepartment] = useState<string>("all")
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null)
  
  const initials = (onboarding.nev || "Új munkatárs")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  const tasks: OnboardingTask[] = onboarding.hr_onboarding_feladat || onboarding.tasks || []
  const doneCount = tasks.filter((t) => t.statusz === "done").length
  const totalCount = tasks.length
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0
  const isDone = progress === 100
  const isClosed = onboarding.statusz === "lezart"
  const isAccountActive = onboarding.fiok_allapot === "aktivalva" || Boolean(onboarding.dolgozo_id)

  const candidateEmail = onboarding.hr_toborzas?.email || onboarding.email || null
  const candidatePhone = onboarding.hr_toborzas?.telefon || onboarding.hr_toborzas?.telefonszam || onboarding.telefonszam || onboarding.telefon || null

  const filteredTasks = tasks.filter((t) => {
    if (activeDepartment === "all") return true
    return t.felelos_reszleg?.toLowerCase() === activeDepartment.toLowerCase()
  })

  // Feladat státusz váltása
  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    setLoadingTaskId(taskId)
    const res = await toggleTaskStatus(taskId, currentStatus)
    setLoadingTaskId(null)
    if (res.error) toast.error(res.error)
    else toast.success(currentStatus === "pending" ? "Feladat elvégezve!" : "Feladat visszanyitva.")
  }

  // Új feladat hozzáadása
  const handleAddTask = async () => {
    if (!newTaskName.trim() || !newTaskResp.trim()) return
    setIsAdding(true)
    const res = await addOnboardingTask(onboarding.id, newTaskName.trim(), newTaskResp.trim())
    setIsAdding(false)
    if (res.error) toast.error(res.error)
    else {
      toast.success("Feladat sikeresen hozzáadva!")
      setNewTaskName("")
    }
  }

  // Feladat törlése
  const handleDeleteTask = async (taskId: string) => {
    const res = await deleteOnboardingTask(taskId)
    if (res.error) toast.error(res.error)
    else toast.success("Feladat törölve.")
  }

  // Munkavállalói fiók aktiválása
  const handleActivateAccount = async () => {
    setIsActivating(true)
    const res = await activateOnboardingAccount(onboarding.id)
    setIsActivating(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Munkavállalói fiók sikeresen aktiválva és üdvözlő e-mail kiküldve!")
    }
  }

  // Beléptetés lezárása
  const handleCloseOnboarding = async () => {
    setIsClosing(true)
    const res = await closeOnboarding(onboarding.id)
    setIsClosing(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Beléptetés sikeresen lezárva és archiválva!")
      if (onCloseDialog) onCloseDialog()
    }
  }

  // Újranyitás
  const handleReopenOnboarding = async () => {
    const res = await reopenOnboarding(onboarding.id)
    if (res.error) toast.error(res.error)
    else toast.success("Beléptetés újranyitva!")
  }

  // Törlés
  const handleDeleteOnboarding = async () => {
    const res = await deleteOnboarding(onboarding.id)
    if (res.error) toast.error(res.error)
    else {
      toast.success("Onboarding folyamat törölve.")
      if (onCloseDialog) onCloseDialog()
    }
  }

  return (
    <DialogContent className="sm:max-w-[750px] w-[95vw] max-h-[90vh] p-0 overflow-hidden border shadow-2xl flex flex-col">
      {/* 1. Fejléc */}
      <div className="bg-muted/40 p-6 border-b shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary border-2 border-primary/20 flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl font-bold tracking-tight">
                  {onboarding.nev}
                </DialogTitle>
                {isClosed ? (
                  <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">
                    Lezárva
                  </Badge>
                ) : isDone ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> 100% Kész
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-medium">
                    Folyamatban
                  </Badge>
                )}
                {isAccountActive ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs gap-1 font-medium">
                    <UserCheck className="w-3 h-3" /> Fiók aktív
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs gap-1 font-medium">
                    <Clock className="w-3 h-3" /> Fiók aktiválásra vár
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5" />
                {onboarding.munkakor || "Pozíció nincs megadva"}
                {candidateEmail && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-xs">
                      <Mail className="w-3 h-3" />
                      {candidateEmail}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Műveleti gombok a fejlécben */}
          <div className="flex items-center gap-2 shrink-0">
            <AssetHandoverDialog
              employeeName={onboarding.nev}
              dolgozoId={onboarding.dolgozo_id}
              onboardingId={onboarding.id}
              munkakor={onboarding.munkakor}
              triggerButton={
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Laptop className="w-3.5 h-3.5" /> Eszközök & Jkv
                </Button>
              }
            />

            {isClosed ? (
              <Button variant="outline" size="sm" onClick={handleReopenOnboarding} className="gap-1.5 text-xs">
                <RotateCcw className="w-3.5 h-3.5" /> Újranyitás
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-1.5 text-xs border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600`}>
                  <Archive className="w-3.5 h-3.5" /> Beléptetés lezárása
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Onboarding folyamat lezárása</AlertDialogTitle>
                    <AlertDialogDescription>
                      Biztosan lezárod az onboarding folyamatot {onboarding.nev} számára? 
                      A rekord átkerül a „Lezárt beléptetések” fülre. A dolgozó kartonja továbbra is elérhető marad a HR rendszerben.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Mégse</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleCloseOnboarding} 
                      disabled={isClosing}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isClosing ? "Lezárás folyamatban..." : "Igen, lezárás és archiválás"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <AlertDialog>
              <AlertDialogTrigger className={`${buttonVariants({ variant: "ghost", size: "icon" })} h-8 w-8 text-destructive hover:bg-destructive/10`}>
                <Trash2 className="w-4 h-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Onboarding folyamat törlése</AlertDialogTitle>
                  <AlertDialogDescription>
                    Biztosan véglegesen törlöd ezt az onboarding folyamatot? Ez a művelet nem vonható vissza.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Mégse</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteOnboarding} className="bg-destructive hover:bg-destructive/90">
                    Végleges törlés
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* 2. Görgethető Tartalom */}
      <div className="p-6 space-y-6 overflow-y-auto flex-1">
        {/* A) Kétlépcsős Fiókaktiválási Kártya */}
        {!isAccountActive ? (
          <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Munkavállalói eaisyHR Fiók Létrehozása & Belépési E-mail
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    A munkavállaló még nem kapott éles felhasználói fiókot. Amikor a szerződés előkészült és közeleg a belépés napja, kattints az aktiválásra. 
                    A rendszer legenerálja a jogosultságot, és kiküldi az üdvözlő e-mailt a bejelentkezési adatokkal.
                  </p>
                  {candidateEmail && (
                    <p className="text-xs font-mono text-muted-foreground mt-2">
                      Címzett: <span className="font-semibold text-foreground">{candidateEmail}</span>
                    </p>
                  )}
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger className={`${buttonVariants({ variant: "default", size: "sm" })} shrink-0 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium`}>
                  <UserPlus className="w-4 h-4" /> Fiók aktiválása
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Munkavállalói fiók aktiválása</AlertDialogTitle>
                    <AlertDialogDescription>
                      Biztosan létrehozod a munkavállalói eaisyHR fiókot <strong>{onboarding.nev}</strong> számára?
                      <br /><br />
                      A rendszer létrehozza az auth felhasználót és kiküldi a bejelentkezési adatokat a(z) <strong>{candidateEmail || "regisztrált"}</strong> címre.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Mégse</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleActivateAccount} 
                      disabled={isActivating}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {isActivating ? "Aktiválás és küldés..." : "Igen, fiók aktiválása és e-mail küldése"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  eaisyHR Munkavállalói Fiók Aktív
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A fiók sikeresen aktiválva
                  {onboarding.fiok_aktivalva_ekor && ` (${new Date(onboarding.fiok_aktivalva_ekor).toLocaleString("hu-HU")})`}.
                  A dolgozói karton készen áll.
                </p>
              </div>
            </div>

            {onboarding.dolgozo_id && (
              <Link 
                href={`/hr/employee/${onboarding.dolgozo_id}`}
                className={`${buttonVariants({ variant: "outline", size: "sm" })} gap-1.5 shrink-0 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10`}
                target="_blank"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Megnyitás a Dolgozói Kartonon
              </Link>
            )}
          </div>
        )}

        {/* B) Alapadatok és Belépési Dátum Szerkesztése */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-xl p-4 bg-card">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Hivatalos Belépési Dátum
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="date" 
                className="pl-9 h-9 text-sm font-medium bg-muted/20 border-border/50 focus:bg-background"
                defaultValue={onboarding.belepes_datuma === "Hamarosan" ? "" : (onboarding.belepes_datuma || "")} 
                onChange={(e) => onDateChange(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Kapcsolattartási Telefon
            </label>
            <Input 
              disabled 
              readOnly 
              value={candidatePhone || "Nincs megadva"} 
              className="h-9 text-sm bg-muted/20 text-muted-foreground"
            />
          </div>
        </div>

        {/* C) Belépési Feladatlista (Checklist) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Onboarding Teendők ({doneCount} / {totalCount} kész)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Részlegek közötti feladatmegosztás és előkészület.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={progress} className="w-28 h-2" />
              <span className="text-xs font-bold text-primary tabular-nums">{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Részleg szűrő gombok */}
          <div className="flex gap-1.5 flex-wrap">
            {["all", "HR", "IT", "Bérszámfejtés", "EHS"].map((dept) => (
              <Button
                key={dept}
                type="button"
                variant={activeDepartment === dept ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2.5 rounded-full"
                onClick={() => setActiveDepartment(dept)}
              >
                {dept === "all" ? "Összes feladat" : dept}
              </Button>
            ))}
          </div>

          {/* Feladat kártyák */}
          <div className="space-y-2">
            {filteredTasks.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                Nincsenek feladatok a kiválasztott részleghez.
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isTaskDone = task.statusz === "done"
                const isLoading = loadingTaskId === task.id

                return (
                  <div 
                    key={task.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      isTaskDone 
                        ? "bg-muted/30 border-border/40 text-muted-foreground" 
                        : "bg-background border-border/70 shadow-xs hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={`h-6 w-6 rounded-full shrink-0 p-0 ${
                          isTaskDone 
                            ? "text-primary hover:text-primary/80" 
                            : "text-muted-foreground hover:text-foreground border"
                        }`}
                        disabled={isLoading}
                        onClick={() => handleToggleTask(task.id, task.statusz)}
                      >
                        {isTaskDone ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full" />
                        )}
                      </Button>

                      <div className="min-w-0">
                        <p className={`text-sm font-medium leading-snug truncate ${isTaskDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {task.cim}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                            {task.felelos_reszleg || "HR"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {((task.cim || "").toLowerCase().includes("eszköz") ||
                        (task.cim || "").toLowerCase().includes("laptop") ||
                        (task.cim || "").toLowerCase().includes("telefon") ||
                        (task.cim || "").toLowerCase().includes("periféri")) && (
                        <AssetHandoverDialog
                          employeeName={onboarding.nev}
                          dolgozoId={onboarding.dolgozo_id}
                          onboardingId={onboarding.id}
                          munkakor={onboarding.munkakor}
                          triggerButton={
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 gap-1 text-primary border-primary/30 hover:bg-primary/10 shadow-2xs"
                            >
                              <Laptop className="w-3 h-3" /> Eszközök & Jkv
                            </Button>
                          }
                          onSuccess={() => {
                            if (!isTaskDone) {
                              handleToggleTask(task.id, task.statusz)
                            }
                          }}
                        />
                      )}

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0" 
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Új feladat felvétele */}
          <div className="flex gap-2 pt-2">
            <Input 
              placeholder="Új feladat elnevezése..." 
              value={newTaskName} 
              onChange={(e) => setNewTaskName(e.target.value)} 
              className="h-9 text-sm" 
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTask()
              }}
            />
            <select
              value={newTaskResp}
              onChange={(e) => setNewTaskResp(e.target.value)}
              className="h-9 text-xs px-2 rounded-md border border-input bg-background font-medium"
            >
              <option value="HR">HR</option>
              <option value="IT">IT</option>
              <option value="Bérszámfejtés">Bérszámfejtés</option>
              <option value="EHS">EHS / Munkavédelem</option>
              <option value="Vezető">Vezető</option>
            </select>
            <Button 
              onClick={handleAddTask} 
              disabled={isAdding || !newTaskName.trim()} 
              className="h-9 px-3 gap-1 shrink-0" 
              size="sm"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Hozzáadás
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  )
}
