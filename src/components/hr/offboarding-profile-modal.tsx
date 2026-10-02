"use client"

import { useState, useEffect } from "react"
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
  Archive, 
  RotateCcw,
  ShieldCheck,
  FileText,
  Laptop,
  Building2,
  ArrowLeft,
  MessageSquare,
  FileCheck
} from "lucide-react"
import { 
  addOffboardingTask, 
  deleteOffboardingTask, 
  toggleOffboardingTaskStatus,
  closeOffboardingProcess,
  reopenOffboardingProcess,
  deleteOffboardingProcess,
  getOffboardingDetailData
} from "@/app/hr/offboarding/actions"
import { TerminationPanel } from "@/components/hr/termination-panel"
import { AssetReturnPanel } from "@/components/hr/asset-return-panel"
import { T1041Panel } from "@/components/hr/t1041-panel"
import { ExitInterviewPanel } from "@/components/hr/exit-interview-panel"
import { ExitCertificatePanel } from "@/components/hr/exit-certificate-panel"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { type OffboardingListItem, type OffboardingTask } from "./offboarding-list"
import { TERMINATION_SHORT_LABELS, type TerminationType } from "@/utils/hr/termination-constants"

export interface OffboardingProfileModalProps {
  offboarding: OffboardingListItem
  onDateChange?: (newDate: string) => void
  onCloseDialog?: () => void
}

export function OffboardingProfileModal({ 
  offboarding, 
  onDateChange,
  onCloseDialog 
}: OffboardingProfileModalProps) {
  const [activeModalTab, setActiveModalTab] = useState<"teendok" | "megszuntetes" | "eszkozok" | "t1041" | "interju" | "kilepo_igazolas">("teendok")
  const [newTaskName, setNewTaskName] = useState("")
  const [newTaskResp, setNewTaskResp] = useState("HR")
  const [isAdding, setIsAdding] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [activeDepartment, setActiveDepartment] = useState<string>("all")
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<any>(null)

  const employeeName = offboarding.felhasznalo_profil?.nev || (offboarding as any).nev || "Kilépő munkatárs"
  const munkakor = detailData?.munkakor || offboarding.munkakor || offboarding.felhasznalo_profil?.munkakor || null
  const reszleg = detailData?.reszleg || offboarding.reszleg || offboarding.felhasznalo_profil?.reszleg || (offboarding.felhasznalo_profil as any)?.hr_szervezeti_egyseg?.nev || null

  const initials = employeeName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  const loadFullDetails = async () => {
    try {
      const data = await getOffboardingDetailData(offboarding.id)
      if (data && !("error" in data)) {
        setDetailData(data)
      }
    } catch (err) {
      console.error("Hiba offboarding részletek betöltésekor:", err)
    }
  }

  useEffect(() => {
    loadFullDetails()
  }, [offboarding.id])

  const tasks: OffboardingTask[] = detailData?.feladatok || offboarding.hr_offboarding_feladat || []
  const doneCount = tasks.filter((t) => t.statusz === "done").length
  const totalCount = tasks.length
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0
  const isDone = progress === 100
  const isClosed = offboarding.statusz === "lezart"

  const filteredTasks = tasks.filter((t) => {
    if (activeDepartment === "all") return true
    return (t.felelos_reszleg || "HR").toLowerCase() === activeDepartment.toLowerCase()
  })

  // Feladat állapot váltása
  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    setLoadingTaskId(taskId)
    const res = await toggleOffboardingTaskStatus(taskId, currentStatus)
    setLoadingTaskId(null)
    if (res.error) toast.error(res.error)
    else {
      await loadFullDetails()
    }
  }

  // Új feladat hozzáadása
  const handleAddTask = async () => {
    if (!newTaskName.trim()) return
    setIsAdding(true)
    const res = await addOffboardingTask(offboarding.id, newTaskName.trim(), newTaskResp)
    setIsAdding(false)
    if (res.error) toast.error(res.error)
    else {
      toast.success("Feladat hozzáadva!")
      setNewTaskName("")
      await loadFullDetails()
    }
  }

  // Feladat törlése
  const handleDeleteTask = async (taskId: string) => {
    const res = await deleteOffboardingTask(taskId)
    if (res.error) toast.error(res.error)
    else {
      toast.success("Feladat törölve!")
      await loadFullDetails()
    }
  }

  // Lezárás
  const handleCloseOffboarding = async () => {
    setIsClosing(true)
    const res = await closeOffboardingProcess(offboarding.id)
    setIsClosing(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      const filedCount = (res as any).filedCount ?? 0
      if (filedCount > 0) {
        toast.success(`Kiléptetési folyamat lezárva! ${filedCount} dokumentum beiktatva a személyi dossziéba.`)
      } else {
        toast.success("Kiléptetési folyamat sikeresen lezárva és archiválva!")
      }
      if (onCloseDialog) onCloseDialog()
    }
  }

  // Újranyitás
  const handleReopenOffboarding = async () => {
    const res = await reopenOffboardingProcess(offboarding.id)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Kiléptetés újranyitva!")
      await loadFullDetails()
    }
  }

  // Törlés
  const handleDeleteOffboarding = async () => {
    const res = await deleteOffboardingProcess(offboarding.id)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success("Kiléptetési folyamat törölve.")
      if (onCloseDialog) onCloseDialog()
    }
  }

  const terminationLabel = detailData?.megszunes_modja 
    ? (TERMINATION_SHORT_LABELS[detailData.megszunes_modja as TerminationType] || detailData.megszunes_modja)
    : (offboarding as any).megszunes_modja
      ? (TERMINATION_SHORT_LABELS[(offboarding as any).megszunes_modja as TerminationType] || (offboarding as any).megszunes_modja)
      : "Közös megegyezés"

  const hasTerminationAgreement = Boolean(detailData?.szerzodes_pdf_url || (offboarding as any).szerzodes_pdf_url)
  const hasAssetReturn = Boolean(detailData?.eszkoz_elszamolas_pdf_url || (offboarding as any).eszkoz_elszamolas_pdf_url)
  const hasExitCertificate = Boolean(detailData?.kilepo_igazolas_pdf_url || (offboarding as any).kilepo_igazolas_pdf_url || detailData?.kilepoIgazolasDoc)

  return (
    <DialogContent className="sm:max-w-[960px] lg:max-w-[1000px] w-[95vw] max-h-[90vh] p-0 overflow-hidden border shadow-2xl flex flex-col bg-background">
      <DialogTitle className="sr-only">Kiléptetési Folyamat - {employeeName}</DialogTitle>
      <DialogDescription className="sr-only">Kiléptetési feladatok és iratok kezelése</DialogDescription>

      {/* 1. Fejléc (EXACT match to Onboarding) */}
      <div className="bg-muted/40 p-6 border-b shrink-0">
        {activeModalTab !== "teendok" && (
          <div className="flex items-center gap-2 mb-3.5 -mt-1 animate-in fade-in duration-150">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveModalTab("teendok")}
              className="h-7 -ml-2 px-2.5 gap-1.5 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Vissza a kiléptetési teendőkhöz
            </Button>
            <span className="text-muted-foreground/30">•</span>
            <Badge variant="outline" className="text-[11px] font-medium bg-background text-foreground/80 border-border">
              {activeModalTab === "megszuntetes" && "Munkaviszony Megszüntetés (Mt. 64–85. §)"}
              {activeModalTab === "eszkozok" && "Eszköz Visszavétel & Vagyoni Leszámolás (Mt. 179. §)"}
              {activeModalTab === "t1041" && "NAV T1041 Kijelentés & Nyugta (Art. 22. §)"}
              {activeModalTab === "interju" && "Kilépési Interjú & Visszajelzés"}
              {activeModalTab === "kilepo_igazolas" && "Törvényes Kilépő Igazolások (Mt. 80. §)"}
            </Badge>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary border-2 border-primary/20 flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-bold tracking-tight text-foreground">
                  {employeeName}
                </span>
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
                <Badge variant="secondary" className="text-[11px] font-medium">
                  {terminationLabel}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  {munkakor || "Munkakör nincs megadva"}
                </span>
                {reszleg && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1.5 text-foreground/80 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-teal-600" />
                      {reszleg}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Fejléc Műveleti gombok */}
          <div className="flex items-center gap-2 shrink-0">
            {isClosed ? (
              <Button variant="outline" size="sm" onClick={handleReopenOffboarding} className="gap-1.5 text-xs">
                <RotateCcw className="w-3.5 h-3.5" /> Újranyitás
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "gap-1.5 text-xs border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 cursor-pointer"
                )}>
                  <Archive className="w-3.5 h-3.5" /> Kiléptetés lezárása
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Kiléptetési folyamat lezárása</AlertDialogTitle>
                    <AlertDialogDescription>
                      Biztosan lezárod {employeeName} kiléptetési folyamatát?
                      A folyamat során előkészített kilépő iratok (megszüntetési megállapodás, eszközleszámolás, NAV igazolások) automatikusan beiktatásra kerülnek az eaisyDocs személyi dossziéba, és a folyamat archivált státuszba lép.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Mégse</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleCloseOffboarding} 
                      disabled={isClosing}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {isClosing ? "Lezárás folyamatban..." : "Igen, lezárás és archiválás"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <AlertDialog>
              <AlertDialogTrigger className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
              )}>
                <Trash2 className="w-4 h-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Kiléptetési folyamat törlése</AlertDialogTitle>
                  <AlertDialogDescription>
                    Biztosan véglegesen törlöd ezt a kiléptetési folyamatot? Ez a művelet nem vonható vissza.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Mégse</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteOffboarding} className="bg-destructive hover:bg-destructive/90 text-white">
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
        {activeModalTab === "megszuntetes" ? (
          <TerminationPanel
            offboardingId={offboarding.id}
            employeeName={employeeName}
            dolgozoId={offboarding.dolgozo_id}
            munkakor={munkakor}
            reszleg={reszleg}
            kilepesDatuma={offboarding.kilepes_datuma || offboarding.utolso_munkanap}
            initialData={detailData}
            adatlap={detailData?.adatlap}
            onSuccess={() => {
              loadFullDetails()
            }}
          />
        ) : activeModalTab === "eszkozok" ? (
          <AssetReturnPanel
            offboardingId={offboarding.id}
            employeeName={employeeName}
            dolgozoId={offboarding.dolgozo_id}
            munkakor={munkakor}
            reszleg={reszleg}
            initialAssets={detailData?.assets || []}
            initialData={detailData}
            onSuccess={() => {
              loadFullDetails()
            }}
          />
        ) : activeModalTab === "t1041" ? (
          <T1041Panel
            initialType="T"
            offboardingId={offboarding.id}
            dolgozoId={offboarding.dolgozo_id}
            employeeName={employeeName}
            munkakor={munkakor}
            reszleg={reszleg}
            onSuccess={() => {
              loadFullDetails()
            }}
          />
        ) : activeModalTab === "interju" ? (
          <ExitInterviewPanel
            offboardingId={offboarding.id}
            employeeName={employeeName}
            initialData={detailData?.interju}
            onSuccess={() => {
              loadFullDetails()
            }}
          />
        ) : activeModalTab === "kilepo_igazolas" ? (
          <ExitCertificatePanel
            offboardingId={offboarding.id}
            employeeName={employeeName}
            dolgozoId={offboarding.dolgozo_id}
            munkakor={munkakor}
            reszleg={reszleg}
            kilepesDatuma={offboarding.kilepes_datuma || offboarding.utolso_munkanap}
            initialData={detailData}
            adatlap={detailData?.adatlap}
            onSuccess={() => {
              loadFullDetails()
            }}
          />
        ) : (
          <>
            {/* A) Felső Kiemelt Műveleti Kártya (Matches Onboarding) */}
            {!hasTerminationAgreement ? (
              <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Munkaviszony Megszüntetési Megállapodás (Mt. 64–85. §)
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      A munkaviszony hivatalos megszüntetéséhez állítsd össze a felmondási vagy közös megegyezési okiratot. 
                      A rendszer generálja a hiteles PDF-et és automatikusan beiktatja az eaisyDocs személyi dossziéba (1.2 tétel, 50 év megőrzés).
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => setActiveModalTab("megszuntetes")}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-medium gap-1.5 shrink-0"
                  size="sm"
                >
                  <FileText className="w-4 h-4" /> Megszüntetés előkészítése
                </Button>
              </div>
            ) : (
              <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      Munkaviszony Megszüntetés Beiktatva
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      A hivatalos megszüntetési okirat elkészült és beiktatásra került az eaisyDocs személyi dossziéba (1.2 tétel, 50 év megőrzés).
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveModalTab("megszuntetes")}
                  className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 gap-1.5 shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" /> Megállapodás megtekintése
                </Button>
              </div>
            )}

            {/* B) Alapadatok és Utolsó Munkanap (Matches Onboarding Image 4) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-xl p-4 bg-card">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Hivatalos Utolsó Munkanap
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date" 
                    className="pl-9 h-9 text-sm font-medium bg-muted/20 border-border/50 focus:bg-background"
                    defaultValue={offboarding.utolso_munkanap || ""} 
                    onChange={(e) => onDateChange && onDateChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Megszűnés Módja & Jogcíme
                </label>
                <Input 
                  disabled 
                  readOnly 
                  value={terminationLabel} 
                  className="h-9 text-sm bg-muted/20 text-muted-foreground font-medium"
                />
              </div>
            </div>

            {/* C) Kiléptetési Feladatlista (Checklist - Matches Onboarding Image 4) */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Kiléptetési Teendők ({doneCount} / {totalCount} kész)
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
                {["all", "HR", "IT", "Bérszámfejtés", "Üzemeltetés", "Vezető"].map((dept) => (
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
                    const cimLower = (task.cim || "").toLowerCase()

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
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
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
                          {(cimLower.includes("megszüntet") || cimLower.includes("kilépő papír") || cimLower.includes("szerződés") || cimLower.includes("felmond")) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-7 text-xs px-2 gap-1 shadow-2xs",
                                hasTerminationAgreement 
                                  ? "text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10" 
                                  : "text-primary border-primary/30 hover:bg-primary/10"
                              )}
                              onClick={() => setActiveModalTab("megszuntetes")}
                            >
                              {hasTerminationAgreement ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <FileText className="w-3 h-3" />}
                              {hasTerminationAgreement ? "Megállapodás megtekintése" : "Megszüntetés előkészítése"}
                            </Button>
                          )}

                          {(cimLower.includes("eszköz") || cimLower.includes("laptop") || cimLower.includes("telefon") || cimLower.includes("visszavétel") || cimLower.includes("kulcs") || cimLower.includes("belépő")) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-7 text-xs px-2 gap-1 shadow-2xs",
                                hasAssetReturn 
                                  ? "text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10" 
                                  : "text-primary border-primary/30 hover:bg-primary/10"
                              )}
                              onClick={() => setActiveModalTab("eszkozok")}
                            >
                              {hasAssetReturn ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Laptop className="w-3 h-3" />}
                              {hasAssetReturn ? "Leszámoló lap megtekintése" : "Eszközök visszavétele"}
                            </Button>
                          )}

                          {(cimLower.includes("t1041") || cimLower.includes("nav") || cimLower.includes("kijelentés") || cimLower.includes("hatósági")) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 shadow-2xs"
                              onClick={() => setActiveModalTab("t1041")}
                            >
                              <Building2 className="w-3 h-3 text-emerald-600" /> T1041 bejelentés
                            </Button>
                          )}

                          {(cimLower.includes("interjú") || cimLower.includes("kérdőív") || cimLower.includes("visszajelzés")) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 gap-1 text-primary border-primary/30 hover:bg-primary/10 shadow-2xs"
                              onClick={() => setActiveModalTab("interju")}
                            >
                              <MessageSquare className="w-3 h-3" /> Kilépési interjú
                            </Button>
                          )}

                          {(cimLower.includes("igazolás") || cimLower.includes("mt. 80")) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-7 text-xs px-2 gap-1 shadow-2xs",
                                hasExitCertificate 
                                  ? "text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10" 
                                  : "text-primary border-primary/30 hover:bg-primary/10"
                              )}
                              onClick={() => setActiveModalTab("kilepo_igazolas")}
                            >
                              {hasExitCertificate ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <FileCheck className="w-3 h-3" />}
                              {hasExitCertificate ? "Igazolások megtekintése" : "Igazolások kiadása"}
                            </Button>
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
                  <option value="Üzemeltetés">Üzemeltetés</option>
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
          </>
        )}
      </div>
    </DialogContent>
  )
}
