"use client"

import { useState } from "react"
import { format, differenceInDays, isPast } from "date-fns"
import { hu } from "date-fns/locale"
import {
  CheckCircle2, Circle, Clock, Calendar, ChevronDown, ChevronRight,
  Plus, AlertTriangle, User2, MessageSquare, Loader2, Flag, FileText
} from "lucide-react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { updateDevelopmentGoalStatus, addIDPNote, IDPStatus } from "@/app/hr/actions/idp-actions"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Segéd: határidő jelzés
// ---------------------------------------------------------------------------
function DeadlineInfo({ hatarido, statusz }: { hatarido: string | null; statusz: IDPStatus }) {
  if (!hatarido || statusz === "teljesitve") return null
  const deadline = new Date(hatarido)
  const daysLeft = differenceInDays(deadline, new Date())

  if (isPast(deadline)) {
    return (
      <span className="flex items-center gap-1 text-destructive">
        <AlertTriangle className="w-3 h-3" />
        {Math.abs(daysLeft)} napja lejárt!
      </span>
    )
  }
  if (daysLeft <= 30) {
    return (
      <span className="flex items-center gap-1 text-amber-600">
        <Clock className="w-3 h-3" />
        {daysLeft} nap múlva esedékes
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      <Calendar className="w-3 h-3" />
      {format(deadline, "yyyy. MM. dd.", { locale: hu })}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Prioritás badge
// ---------------------------------------------------------------------------
function PriorityBadge({ prioritas }: { prioritas: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    magas:    { label: "Magas",    cls: "bg-destructive/10 text-destructive border-destructive/20" },
    kozepes:  { label: "Közepes",  cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    alacsony: { label: "Alacsony", cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  }
  const p = prioritas ?? "kozepes"
  const { label, cls } = map[p] ?? map.kozepes
  return <Badge variant="outline" className={cn("text-[10px] font-semibold", cls)}><Flag className="w-2.5 h-2.5 mr-1" />{label}</Badge>
}

// ---------------------------------------------------------------------------
// Haladási napló panel
// ---------------------------------------------------------------------------
function NotesPanel({ celId, megjegyzesek }: { celId: string; megjegyzesek: any[] }) {
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
      toast.success("Megjegyzés mentve")
    } else {
      toast.error("Hiba a mentéskor")
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-dashed">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <MessageSquare className="w-3.5 h-3.5" />
        Haladási napló {megjegyzesek.length > 0 && `(${megjegyzesek.length} bejegyzés)`}
      </button>

      {expanded && (
        <div className="mt-2 space-y-3 pl-5">
          {megjegyzesek.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Még nincs bejegyzés. Rögzítsd az első haladásodat!</p>
          ) : (
            <div className="space-y-2">
              {megjegyzesek.map((m: any) => (
                <div key={m.id} className="text-xs bg-muted/40 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{m.iro?.nev ?? "Ismeretlen"}</span>
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
              placeholder="Írd le mi történt, miben haladtál..."
              className="text-xs resize-none h-16 flex-1"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <Button
              size="sm"
              className="self-end h-8"
              onClick={handleAdd}
              disabled={saving || !newNote.trim()}
            >
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
export function EmployeeIdpView({ tervek }: { tervek: any[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleMarkDone = async (celId: string) => {
    setLoadingId(celId)
    const res = await updateDevelopmentGoalStatus(celId, "jovahagyasra_var")
    setLoadingId(null)
    if (res.success) {
      toast.success("Jelezted, hogy elkészültél! A HR hamarosan jóváhagyja.")
      router.refresh()
    } else {
      toast.error("Hiba történt", { description: res.error })
    }
  }

  const handleMarkInProgress = async (celId: string) => {
    setLoadingId(celId)
    const res = await updateDevelopmentGoalStatus(celId, "folyamatban")
    setLoadingId(null)
    if (res.success) {
      router.refresh()
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {tervek.map(terv => {
        const totalGoals = terv.celok?.length ?? 0
        const completedGoals = terv.celok?.filter((c: any) => c.statusz === "teljesitve").length ?? 0
        const progress = totalGoals === 0 ? 0 : Math.round((completedGoals / totalGoals) * 100)
        const isLezart = terv.statusz === "lezart"

        return (
          <Card key={terv.id} className={cn("overflow-hidden", isLezart && "opacity-70")}>
            {/* Terv fejléc */}
            <CardHeader className="bg-muted/20 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-base">{terv.megnevezes}</h2>
                    {isLezart
                      ? <Badge className="bg-muted text-muted-foreground text-xs">Lezárva</Badge>
                      : <Badge className="bg-primary/10 text-primary text-xs border-primary/20">Aktív</Badge>
                    }
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(terv.created_at), "yyyy. MMMM d.", { locale: hu })} óta aktív
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{progress}%</p>
                  <p className="text-[11px] text-muted-foreground">{completedGoals}/{totalGoals} elvégezve</p>
                  <Progress value={progress} className="w-[100px] h-1.5 mt-1" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {terv.celok?.length === 0 && (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  Nincsenek célkitűzések ebben a tervben.
                </p>
              )}

              {terv.celok?.map((cel: any) => {
                const isDone = cel.statusz === "teljesitve"
                const isPending = cel.statusz === "jovahagyasra_var"
                const isInProgress = cel.statusz === "folyamatban"
                const isLoading = loadingId === cel.id

                return (
                  <div
                    key={cel.id}
                    className={cn(
                      "rounded-xl border p-4 transition-colors",
                      isDone    ? "bg-emerald-500/5 border-emerald-500/20 opacity-75" :
                      isPending ? "bg-amber-500/5 border-amber-500/20" :
                                  "bg-card hover:bg-accent/20"
                    )}
                  >
                    {/* Fejléc */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {isDone    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
                         isPending ? <Clock className="w-5 h-5 text-amber-500" /> :
                         isInProgress ? <Circle className="w-5 h-5 text-blue-500 fill-blue-500/20" /> :
                                        <Circle className="w-5 h-5 text-muted-foreground/40" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className={cn(
                            "font-medium",
                            isDone && "line-through text-muted-foreground"
                          )}>
                            {cel.megnevezes}
                          </p>
                          <PriorityBadge prioritas={cel.prioritas} />
                          {cel.tipus !== "kompetencia" && (
                            <Badge variant="outline" className="text-[10px]">
                              {cel.tipus === "kepzes" ? "Képzés" : cel.tipus === "nyelv" ? "Nyelvvizsga" : "Egyéb"}
                            </Badge>
                          )}
                          {cel.tanulmanyi_szerzodes_id && (
                            <span className="flex items-center gap-1 text-[10px] text-primary">
                              <FileText className="w-3 h-3" /> Szerződés csatolva
                            </span>
                          )}
                        </div>

                        {cel.leiras && (
                          <p className="text-sm text-muted-foreground leading-relaxed mb-2">{cel.leiras}</p>
                        )}

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                          <DeadlineInfo hatarido={cel.hatarido} statusz={cel.statusz} />
                          {cel.mentor && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <User2 className="w-3 h-3" /> Mentor: {cel.mentor}
                            </span>
                          )}
                          {isDone && cel.teljesites_datuma && (
                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              Teljesítve: {format(new Date(cel.teljesites_datuma), "yyyy. MM. dd.", { locale: hu })}
                            </span>
                          )}
                        </div>

                        {/* Státusz jelző szöveg */}
                        {isPending && (
                          <div className="mt-2 text-xs text-amber-600 bg-amber-500/10 rounded-md px-3 py-2 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            Jóváhagyásra vár – a HR hamarosan visszajelzést ad.
                          </div>
                        )}
                        {isDone && (
                          <div className="mt-2 text-xs text-emerald-600 bg-emerald-500/10 rounded-md px-3 py-2 flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            A HR jóváhagyta – sikeresen teljesítetted ezt a célt!
                          </div>
                        )}

                        {/* Akciógombok (csak ha nincs kész/jóváhagyásra vár) */}
                        {!isDone && !isPending && !isLezart && (
                          <div className="flex items-center gap-2 mt-3">
                            {!isInProgress && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                disabled={isLoading}
                                onClick={() => handleMarkInProgress(cel.id)}
                              >
                                {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                Elkezdtem
                              </Button>
                            )}
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                              disabled={isLoading}
                              onClick={() => handleMarkDone(cel.id)}
                            >
                              {isLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                              Elkészült – jóváhagyást kérek
                            </Button>
                          </div>
                        )}

                        {/* Haladási napló */}
                        <NotesPanel celId={cel.id} megjegyzesek={cel.megjegyzesek ?? []} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
