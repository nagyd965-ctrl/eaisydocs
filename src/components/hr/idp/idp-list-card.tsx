"use client"

import { useState } from "react"
import { format, differenceInDays, isPast, isWithinInterval, addDays } from "date-fns"
import { hu } from "date-fns/locale"
import {
  CheckCircle2, Circle, Clock, MoreHorizontal, FileText, Trash2,
  Calendar, ChevronDown, ChevronRight, Plus, Lock,
  AlertTriangle, Flag, User2, Pencil, MessageSquare, Loader2
} from "lucide-react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  updateDevelopmentGoalStatus, deleteDevelopmentGoal, closeDevelopmentPlan,
  deleteDevelopmentPlan, addIDPNote,
  FejlesztesiTerv, FejlesztesiCel, IDPMegjegyzes, IDPStatus,
} from "@/app/hr/actions/idp-actions"
import { IdpDialog } from "./idp-dialog"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface IdpListCardProps {
  tervek: (FejlesztesiTerv & { celok: (FejlesztesiCel & { megjegyzesek: IDPMegjegyzes[] })[] })[]
  dolgozoId: string
  isManagerView?: boolean
}

// ---------------------------------------------------------------------------
// Segéd függvények
// ---------------------------------------------------------------------------

function getDeadlineInfo(hatarido: string | null, statusz: IDPStatus) {
  if (!hatarido || statusz === 'teljesitve') return null
  const deadline = new Date(hatarido)
  const today = new Date()
  const daysLeft = differenceInDays(deadline, today)

  if (isPast(deadline)) {
    return { label: `${Math.abs(daysLeft)} napja lejárt`, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", icon: AlertTriangle }
  }
  if (daysLeft <= 30) {
    return { label: `${daysLeft} nap múlva`, color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/20", icon: Clock }
  }
  return { label: `${daysLeft} nap múlva`, color: "text-muted-foreground", bg: "", icon: Calendar }
}

function PriorityBadge({ prioritas }: { prioritas: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    magas:   { label: "Magas",   cls: "bg-destructive/10 text-destructive border-destructive/20" },
    kozepes: { label: "Közepes", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    alacsony:{ label: "Alacsony",cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  }
  const p = prioritas ?? "kozepes"
  const { label, cls } = map[p] ?? map.kozepes
  return <Badge variant="outline" className={cn("text-[10px] font-semibold", cls)}>{label}</Badge>
}

function StatusBadge({ statusz }: { statusz: IDPStatus }) {
  const map: Record<IDPStatus, { label: string; cls: string }> = {
    nyitott:          { label: "Nyitott",          cls: "bg-muted text-muted-foreground" },
    folyamatban:      { label: "Folyamatban",      cls: "bg-blue-500/10 text-blue-600" },
    jovahagyasra_var: { label: "Jóváhagyásra vár", cls: "bg-amber-500/10 text-amber-600" },
    teljesitve:       { label: "Teljesítve",       cls: "bg-emerald-500/10 text-emerald-600" },
    elmaradt:         { label: "Elmaradt",         cls: "bg-destructive/10 text-destructive" },
  }
  const { label, cls } = map[statusz] ?? map.nyitott
  return <Badge variant="outline" className={cn("text-[10px]", cls)}>{label}</Badge>
}

function PlanStatusBadge({ statusz }: { statusz: string }) {
  if (statusz === 'lezart') return <Badge className="bg-muted text-muted-foreground text-xs">Lezárva</Badge>
  if (statusz === 'folyamatban') return <Badge className="bg-blue-500/10 text-blue-600 text-xs border-blue-500/20">Folyamatban</Badge>
  return <Badge className="bg-primary/10 text-primary text-xs border-primary/20">Aktív</Badge>
}

// ---------------------------------------------------------------------------
// Haladási megjegyzések panel
// ---------------------------------------------------------------------------
function NotesPanel({ celId, megjegyzesek }: { celId: string; megjegyzesek: IDPMegjegyzes[] }) {
  const router = useRouter()
  const [newNote, setNewNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleAdd = async () => {
    if (!newNote.trim()) return
    setSaving(true)
    const res = await addIDPNote(celId, newNote.trim())
    setSaving(false)
    if (res.success) {
      setNewNote("")
      router.refresh()
    } else {
      toast.error("Hiba a megjegyzés mentésekor")
    }
  }

  return (
    <div className="mt-2 border-t pt-2">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <MessageSquare className="w-3.5 h-3.5" />
        Haladási napló {megjegyzesek.length > 0 && `(${megjegyzesek.length})`}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 pl-5">
          {megjegyzesek.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nincs még bejegyzés.</p>
          ) : (
            <div className="space-y-1.5">
              {megjegyzesek.map(m => (
                <div key={m.id} className="text-xs bg-muted/40 rounded-md p-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-foreground">{m.iro?.nev ?? "Ismeretlen"}</span>
                    <span className="text-muted-foreground">
                      {format(new Date(m.created_at), "yyyy. MM. dd. HH:mm", { locale: hu })}
                    </span>
                  </div>
                  <p className="text-foreground/80 leading-relaxed">{m.szoveg}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Textarea
              placeholder="Haladás rögzítése..."
              className="text-xs resize-none h-16 flex-1"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <Button size="sm" className="self-end h-8" onClick={handleAdd} disabled={saving || !newNote.trim()}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fő komponens
// ---------------------------------------------------------------------------
export function IdpListCard({ tervek, dolgozoId, isManagerView = false }: IdpListCardProps) {
  const router = useRouter()
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null)
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null)

  const handleStatusChange = async (celId: string, statusz: IDPStatus) => {
    const result = await updateDevelopmentGoalStatus(celId, statusz)
    if (result.success) router.refresh()
    else toast.error(result.error)
  }

  const handleDeletePlan = async () => {
    if (!deletePlanId) return
    const result = await deleteDevelopmentPlan(deletePlanId)
    setDeletePlanId(null)
    if (result.success) router.refresh()
    else toast.error(result.error)
  }

  const handleDeleteGoal = async () => {
    if (!deleteGoalId) return
    const result = await deleteDevelopmentGoal(deleteGoalId)
    setDeleteGoalId(null)
    if (result.success) router.refresh()
    else toast.error(result.error)
  }

  const handleClosePlan = async (tervId: string) => {
    const result = await closeDevelopmentPlan(tervId)
    if (result.success) router.refresh()
    else toast.error(result.error)
  }

  if (!tervek || tervek.length === 0) return null

  return (
    <div className="space-y-4">
      {tervek.map(terv => {
        const totalGoals = terv.celok.length
        const completedGoals = terv.celok.filter(c => c.statusz === "teljesitve").length
        const progress = totalGoals === 0 ? 0 : Math.round((completedGoals / totalGoals) * 100)
        const isLezart = terv.statusz === 'lezart'

        return (
          <Card key={terv.id} className={cn("overflow-hidden", isLezart && "opacity-75")}>
            {/* Terv fejléc */}
            <CardHeader className="pb-3 bg-muted/20">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base">{terv.megnevezes}</h3>
                    <PlanStatusBadge statusz={terv.statusz} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Létrehozva: {format(new Date(terv.created_at), "yyyy. MM. dd.", { locale: hu })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold">{progress}%</p>
                    <p className="text-[10px] text-muted-foreground">{completedGoals}/{totalGoals} cél</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Progress value={progress} className="w-[80px] h-2" />
                    <div className="flex items-center gap-1">
                      {isManagerView && progress === 100 && !isLezart && (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-6 text-[11px] px-2 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleClosePlan(terv.id)}
                        >
                          <Lock className="w-3 h-3 mr-1" /> Lezárás
                        </Button>
                      )}
                      {isManagerView && (
                        <Button
                          variant="ghost" size="icon"
                          className="h-6 w-6 text-destructive/50 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeletePlanId(terv.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-2">
              {terv.celok.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 italic">
                  Nincsenek célkitűzések. Adj hozzá egyet!
                </p>
              ) : (
                terv.celok.map(cel => {
                  const deadlineInfo = getDeadlineInfo(cel.hatarido, cel.statusz)
                  const isDone = cel.statusz === 'teljesitve'

                  return (
                    <div
                      key={cel.id}
                      className={cn(
                        "rounded-lg border p-3 transition-colors",
                        isDone ? "bg-muted/20 opacity-75" : "bg-card hover:bg-accent/20"
                      )}
                    >
                      {/* Cél fejléce */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <div className="mt-0.5 shrink-0">
                            {isDone
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              : cel.statusz === 'jovahagyasra_var'
                                ? <Clock className="w-4 h-4 text-amber-500" />
                                : cel.statusz === 'folyamatban'
                                  ? <Circle className="w-4 h-4 text-blue-500 fill-blue-500/20" />
                                  : <Circle className="w-4 h-4 text-muted-foreground" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <p className={cn("font-medium text-sm", isDone && "line-through text-muted-foreground")}>
                                {cel.megnevezes}
                              </p>
                              <StatusBadge statusz={cel.statusz} />
                              <PriorityBadge prioritas={cel.prioritas} />
                              {cel.tipus !== 'kompetencia' && (
                                <Badge variant="outline" className="text-[10px]">
                                  {cel.tipus === 'kepzes' ? 'Képzés' : cel.tipus === 'nyelv' ? 'Nyelv' : 'Egyéb'}
                                </Badge>
                              )}
                              {cel.tanulmanyi_szerzodes_id && (
                                <span className="flex items-center gap-1 text-[10px] text-primary">
                                  <FileText className="w-3 h-3" /> Szerződés
                                </span>
                              )}
                            </div>

                            {cel.leiras && (
                              <p className="text-xs text-muted-foreground mb-1.5 leading-relaxed">{cel.leiras}</p>
                            )}

                            {/* Meta sor */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                              {cel.hatarido && (
                                <span className={cn("flex items-center gap-1", deadlineInfo?.color ?? "text-muted-foreground")}>
                                  {deadlineInfo?.icon
                                    ? <deadlineInfo.icon className="w-3 h-3" />
                                    : <Calendar className="w-3 h-3" />}
                                  {format(new Date(cel.hatarido), "yyyy. MM. dd.", { locale: hu })}
                                  {deadlineInfo && <span className="ml-0.5">({deadlineInfo.label})</span>}
                                </span>
                              )}
                              {cel.mentor && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <User2 className="w-3 h-3" /> {cel.mentor}
                                </span>
                              )}
                              {isDone && cel.teljesites_datuma && (
                                <span className="flex items-center gap-1 text-emerald-600">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Teljesítve: {format(new Date(cel.teljesites_datuma), "yyyy. MM. dd.", { locale: hu })}
                                </span>
                              )}
                            </div>

                            {/* Haladási napló */}
                            <NotesPanel celId={cel.id} megjegyzesek={cel.megjegyzesek ?? []} />
                          </div>
                        </div>

                        {/* Akciók */}
                        {!isLezart && (
                          <div className="flex items-center gap-1 shrink-0">
                            {isManagerView && (
                              <IdpDialog
                                tervId={terv.id}
                                dolgozoId={dolgozoId}
                                existingGoal={cel as any}
                                customTrigger={
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                }
                              />
                            )}
                            {isManagerView && (
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-destructive/40 hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteGoalId(cel.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" />}>
                                <MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel>Státusz módosítása</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {!isManagerView && cel.statusz !== 'teljesitve' && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleStatusChange(cel.id, 'folyamatban')}>
                                        Folyamatban
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleStatusChange(cel.id, 'jovahagyasra_var')}>
                                        Kész (Jóváhagyásra vár)
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {isManagerView && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleStatusChange(cel.id, 'teljesitve')} className="text-emerald-600">
                                        Jóváhagyás (Teljesítve)
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleStatusChange(cel.id, 'elmaradt')} className="text-destructive">
                                        Elmaradt
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}

              {isManagerView && !isLezart && (
                <div className="pt-1">
                  <IdpDialog tervId={terv.id} dolgozoId={dolgozoId} buttonVariant="outline" />
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Terv törlés megerősítése */}
      <AlertDialog open={!!deletePlanId} onOpenChange={() => setDeletePlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terv törlése</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan törlöd ezt a fejlesztési tervet? Minden hozzá tartozó célkitűzés és megjegyzés is törlődik.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlan} className="bg-destructive hover:bg-destructive/90">Törlés</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cél törlés megerősítése */}
      <AlertDialog open={!!deleteGoalId} onOpenChange={() => setDeleteGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Célkitűzés törlése</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan törlöd ezt a célkitűzést? Minden megjegyzés is törlődik.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGoal} className="bg-destructive hover:bg-destructive/90">Törlés</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
