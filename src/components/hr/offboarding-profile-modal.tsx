"use client"

import { useState, useEffect } from "react"
import { addOffboardingTask, deleteOffboardingTask, toggleOffboardingTaskStatus, closeOffboarding, getExitInterview, saveExitInterview } from "@/app/hr/offboarding/actions"
import { Check, Plus, Trash2, Calendar, Edit2, Loader2, Save, X, Lock, ClipboardList, MessageSquare, Star, ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { type OffboardingListItem, type OffboardingTask } from "./offboarding-list"

interface OffboardingProfileModalProps {
  offboarding: OffboardingListItem
  onDateChange: (newDate: string) => Promise<void>
}

// Csillag értékelő komponens
function StarRating({ value, onChange, disabled }: { value: number | null, onChange: (v: number) => void, disabled?: boolean }) {
  const [hover, setHover] = useState<number | null>(null)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star === value ? 0 : star)}
          onMouseEnter={() => !disabled && setHover(star)}
          onMouseLeave={() => setHover(null)}
          className={cn(
            "transition-colors",
            disabled ? "cursor-default" : "cursor-pointer hover:scale-110"
          )}
        >
          <Star
            className={cn(
              "w-5 h-5",
              (hover ?? value ?? 0) >= star
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-muted-foreground/30"
            )}
          />
        </button>
      ))}
    </div>
  )
}

const KILEPES_KATEGORIA_OPTIONS = [
  { value: "", label: "Válassz kategóriát..." },
  { value: "jobb_ajanlat", label: "Jobb ajánlat / magasabb bér" },
  { value: "magnaleti", label: "Magánéleti okok" },
  { value: "elorelep", label: "Előrelépési lehetőség máshol" },
  { value: "vezeto", label: "Vezető / management" },
  { value: "munkakornyezet", label: "Munkahelyi légkör / csapat" },
  { value: "munkakor", label: "Munkakör / feladatok" },
  { value: "tavolsag", label: "Távolság / home office" },
  { value: "nyugdij", label: "Nyugdíjba vonulás" },
  { value: "egyeb", label: "Egyéb" },
]

const ALLOMASHELY_OPTIONS = [
  { value: "", label: "Válassz..." },
  { value: "versenyzo_ceg", label: "Versenytárs / hasonló iparág" },
  { value: "mas_ipar", label: "Más iparág" },
  { value: "tanulas", label: "Továbbtanulás" },
  { value: "nyugdij", label: "Nyugdíj" },
  { value: "vallalkozas", label: "Saját vállalkozás" },
  { value: "nem_mondja_meg", label: "Nem kívánja megmondani" },
]

export function OffboardingProfileModal({ offboarding, onDateChange }: OffboardingProfileModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [isEditingDate, setIsEditingDate] = useState(false)
  const [tempDate, setTempDate] = useState(offboarding.kilepes_datuma || "")
  const [newTaskName, setNewTaskName] = useState("")
  const [newTaskResp, setNewTaskResp] = useState("HR")
  const [isAdding, setIsAdding] = useState(false)

  // Exit interview state – prefill from server-side loaded data (offboarding.hr_kilepes_interju)
  const existingInterview = offboarding.hr_kilepes_interju?.[0] ?? null

  const [interviewLoading, setInterviewLoading] = useState(false)
  const [interviewSaving, setInterviewSaving] = useState(false)
  const [interviewLoaded, setInterviewLoaded] = useState(!!existingInterview)
  const [interview, setInterview] = useState<{
    kilepes_kategoria: string
    kilepes_oka: string
    altalanos_elegedettseg: number | null
    vezeto_kapcsolat: number | null
    munkakornyezet_ertekeles: number | null
    csapat_ertekeles: number | null
    mi_tetszett: string
    mit_valtoztatna: string
    ajanlana: boolean | null
    kovetkezo_allomashely: string
  }>({
    kilepes_kategoria:       existingInterview?.kilepes_kategoria      ?? "",
    kilepes_oka:             existingInterview?.kilepes_oka             ?? "",
    altalanos_elegedettseg:  existingInterview?.altalanos_elegedettseg  ?? null,
    vezeto_kapcsolat:        existingInterview?.vezeto_kapcsolat        ?? null,
    munkakornyezet_ertekeles:existingInterview?.munkakornyezet_ertekeles?? null,
    csapat_ertekeles:        existingInterview?.csapat_ertekeles        ?? null,
    mi_tetszett:             existingInterview?.mi_tetszett             ?? "",
    mit_valtoztatna:         existingInterview?.mit_valtoztatna         ?? "",
    ajanlana:                existingInterview?.ajanlana                ?? null,
    kovetkezo_allomashely:   existingInterview?.kovetkezo_allomashely   ?? "",
  })

  const initials = offboarding.felhasznalo_profil?.nev
    ? offboarding.felhasznalo_profil.nev.split(' ').map((n: string) => n[0]).join('').substring(0, 2)
    : "U"

  const tasks: OffboardingTask[] = offboarding.hr_offboarding_feladat || []
  const doneTasks = tasks.filter((t) => t.statusz === 'done').length
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

  // Interjú adatok betöltése tab váltáskor
  const handleInterviewTabLoad = async () => {
    if (interviewLoaded) return
    setInterviewLoading(true)
    const result = await getExitInterview(offboarding.id)
    setInterviewLoading(false)
    setInterviewLoaded(true)
    if (result.data) {
      setInterview({
        kilepes_kategoria: result.data.kilepes_kategoria || "",
        kilepes_oka: result.data.kilepes_oka || "",
        altalanos_elegedettseg: result.data.altalanos_elegedettseg ?? null,
        vezeto_kapcsolat: result.data.vezeto_kapcsolat ?? null,
        munkakornyezet_ertekeles: result.data.munkakornyezet_ertekeles ?? null,
        csapat_ertekeles: result.data.csapat_ertekeles ?? null,
        mi_tetszett: result.data.mi_tetszett || "",
        mit_valtoztatna: result.data.mit_valtoztatna || "",
        ajanlana: result.data.ajanlana ?? null,
        kovetkezo_allomashely: result.data.kovetkezo_allomashely || "",
      })
    }
  }

  const handleSaveInterview = async () => {
    setInterviewSaving(true)
    const result = await saveExitInterview(offboarding.id, interview)
    setInterviewSaving(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Kilépési interjú mentve!")
    }
  }

  const interviewFilled = interviewLoaded && (
    interview.kilepes_kategoria || interview.kilepes_oka || interview.altalanos_elegedettseg
  )

  return (
    <>
      <div className="absolute inset-0 w-full h-full cursor-pointer z-10" onClick={(e) => { e.stopPropagation(); setIsOpen(true); }} />
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-background border-border/50">
          {/* Fejléc */}
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

          {/* Tabos tartalom */}
          <Tabs defaultValue="feladatok" onValueChange={(v) => v === "interju" && handleInterviewTabLoad()}>
            <div className="px-6 pt-4 border-b">
              <TabsList className="h-9">
                <TabsTrigger value="feladatok" className="gap-2 text-xs">
                  <ClipboardList className="w-3.5 h-3.5" />
                  Kiléptetési Feladatok
                  <Badge variant="outline" className="bg-background text-[10px] h-4 px-1.5">{doneTasks}/{tasks.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="interju" className="gap-2 text-xs" onClick={handleInterviewTabLoad}>
                  <MessageSquare className="w-3.5 h-3.5" />
                  Kilépési Interjú
                  {interviewFilled && (
                    <Badge className="bg-emerald-500/20 text-emerald-600 text-[10px] h-4 px-1.5 border-emerald-500/30">Kitöltve</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* === FELADATOK TAB === */}
            <TabsContent value="feladatok" className="p-6 pt-4 bg-muted/10 m-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Haladás
                </h3>
                <div className="flex-1 max-w-[200px] ml-4 flex items-center gap-4">
                  <Progress value={progress} className="h-2 flex-1" />
                  {progress === 100 && offboarding.statusz !== 'lezart' && (
                    interview.kilepes_kategoria ? (
                      <Button size="sm" variant="default" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 shrink-0" onClick={handleCloseOffboarding}>
                        <Lock className="w-3.5 h-3.5 mr-1" /> Lezárás
                      </Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground text-right leading-tight shrink-0">
                        Lezáráshoz töltsd ki<br/>a kilépési interjút
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="bg-background border rounded-xl shadow-sm divide-y">
                {tasks.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    Nincsenek még feladatok rögzítve.
                  </div>
                ) : (
                  tasks.map((task) => (
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
            </TabsContent>

            {/* === KILÉPÉSI INTERJÚ TAB === */}
            <TabsContent value="interju" className="m-0">
              {interviewLoading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Betöltés...</span>
                </div>
              ) : (
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">

                  {/* Kilépés oka */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kilépés Oka (Kategória)</Label>
                      <select
                        className="w-full h-9 text-sm bg-background border rounded-md px-3 outline-none focus:ring-1 focus:ring-ring"
                        value={interview.kilepes_kategoria}
                        onChange={(e) => setInterview(p => ({ ...p, kilepes_kategoria: e.target.value }))}
                      >
                        {KILEPES_KATEGORIA_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Következő Állomáshely</Label>
                      <select
                        className="w-full h-9 text-sm bg-background border rounded-md px-3 outline-none focus:ring-1 focus:ring-ring"
                        value={interview.kovetkezo_allomashely}
                        onChange={(e) => setInterview(p => ({ ...p, kovetkezo_allomashely: e.target.value }))}
                      >
                        {ALLOMASHELY_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kilépés Oka – Részletes Leírás</Label>
                    <Textarea
                      placeholder="A dolgozó szavaival leírva, miért döntött a kilépés mellett..."
                      className="resize-none text-sm"
                      rows={3}
                      value={interview.kilepes_oka}
                      onChange={(e) => setInterview(p => ({ ...p, kilepes_oka: e.target.value }))}
                    />
                  </div>

                  {/* Értékelések */}
                  <div className="border rounded-lg p-4 space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Elégedettségi Értékelések (1–5 csillag)</p>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: "altalanos_elegedettseg", label: "Általános Elégedettség" },
                        { key: "vezeto_kapcsolat", label: "Vezető Kapcsolata" },
                        { key: "munkakornyezet_ertekeles", label: "Munkahelyi Környezet" },
                        { key: "csapat_ertekeles", label: "Csapat / Kollégák" },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-1.5">
                          <p className="text-xs text-muted-foreground font-medium">{label}</p>
                          <StarRating
                            value={interview[key as keyof typeof interview] as number | null}
                            onChange={(v) => setInterview(p => ({ ...p, [key]: v === 0 ? null : v }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Szabad szöveges kérdések */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mi tetszett legjobban?</Label>
                      <Textarea
                        placeholder="Pozitívumok, amiket magával visz..."
                        className="resize-none text-sm"
                        rows={3}
                        value={interview.mi_tetszett}
                        onChange={(e) => setInterview(p => ({ ...p, mi_tetszett: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Min változtatna?</Label>
                      <Textarea
                        placeholder="Javaslatok, kritikák a cég számára..."
                        className="resize-none text-sm"
                        rows={3}
                        value={interview.mit_valtoztatna}
                        onChange={(e) => setInterview(p => ({ ...p, mit_valtoztatna: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Ajánlaná? */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ajánlaná-e a céget munkahelyként?</Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        size="sm"
                        variant={interview.ajanlana === true ? "default" : "outline"}
                        className={cn("gap-2", interview.ajanlana === true && "bg-emerald-600 hover:bg-emerald-700 border-emerald-600")}
                        onClick={() => setInterview(p => ({ ...p, ajanlana: p.ajanlana === true ? null : true }))}
                      >
                        <ThumbsUp className="w-4 h-4" /> Igen
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={interview.ajanlana === false ? "default" : "outline"}
                        className={cn("gap-2", interview.ajanlana === false && "bg-destructive hover:bg-destructive/90 border-destructive")}
                        onClick={() => setInterview(p => ({ ...p, ajanlana: p.ajanlana === false ? null : false }))}
                      >
                        <ThumbsDown className="w-4 h-4" /> Nem
                      </Button>
                    </div>
                  </div>

                  {/* Mentés */}
                  <div className="flex justify-end pt-2 border-t">
                    <Button onClick={handleSaveInterview} disabled={interviewSaving} className="gap-2">
                      {interviewSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Interjú Mentése
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
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
