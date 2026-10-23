"use client"

import { useState, useMemo, useEffect } from "react"
import { format, differenceInDays, isPast } from "date-fns"
import { hu } from "date-fns/locale"
import {
  CheckCircle2, Circle, Clock, Trash2, Calendar,
  ChevronDown, ChevronRight, Plus, Lock, Unlock, AlertTriangle,
  Pencil, MessageSquare, Loader2, FileText, Check, RotateCcw,
  GraduationCap, Building2, Wallet, UserCheck, Eye
} from "lucide-react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  updateDevelopmentGoalStatus,
  deleteDevelopmentGoal,
  closeDevelopmentPlan,
  reopenDevelopmentPlan,
  deleteDevelopmentPlan,
  addIDPNote,
  approveDevelopmentGoal,
  FejlesztesiTerv,
  FejlesztesiCel,
  IDPMegjegyzes,
  IDPStatus,
} from "@/app/hr/actions/idp-actions"
import { IdpDialog } from "./idp-dialog"
import { IdpCertificateViewerDialog } from "./idp-certificate-viewer-dialog"
import { IdpRejectionDialog } from "./idp-rejection-dialog"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface IdpListCardProps {
  tervek: (FejlesztesiTerv & { celok: (FejlesztesiCel & { megjegyzesek?: IDPMegjegyzes[] })[] })[]
  dolgozoId: string
  isManagerView?: boolean
}

// ---------------------------------------------------------------------------
// Segédfüggvények
// ---------------------------------------------------------------------------

function getDeadlineInfo(hatarido: string | null, statusz: IDPStatus) {
  if (!hatarido || statusz === "teljesitve") return null
  const deadline = new Date(hatarido)
  const today = new Date()
  const daysLeft = differenceInDays(deadline, today)

  if (isPast(deadline)) {
    return {
      label: `${Math.abs(daysLeft)} napja lejárt!`,
      color: "text-destructive",
      icon: AlertTriangle,
    }
  }
  if (daysLeft <= 30) {
    return {
      label: `${daysLeft} nap van hátra`,
      color: "text-warning",
      icon: Clock,
    }
  }
  return {
    label: `${daysLeft} nap múlva`,
    color: "text-muted-foreground",
    icon: Calendar,
  }
}


function StatusBadge({ statusz }: { statusz: IDPStatus }) {
  const map: Record<IDPStatus, { label: string; cls: string }> = {
    nyitott:          { label: "Tervezett",          cls: "bg-muted text-muted-foreground" },
    folyamatban:      { label: "Tanulás alatt",      cls: "bg-info/10 text-info border-info/20" },
    jovahagyasra_var: { label: "Elbírálásra vár",    cls: "bg-warning/10 text-warning border-warning/30 animate-pulse" },
    teljesitve:       { label: "Megszerezve",        cls: "bg-success/10 text-success border-success/20 font-medium" },
    elmaradt:         { label: "Meghiúsult",         cls: "bg-destructive/10 text-destructive border-destructive/20" },
  }
  const { label, cls } = map[statusz] ?? map.nyitott
  return <Badge variant="outline" className={cn("text-[10px]", cls)}>{label}</Badge>
}

function PlanStatusBadge({ statusz }: { statusz: string }) {
  if (statusz === "lezart") return <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">Lezárva</Badge>
  if (statusz === "folyamatban") return <Badge variant="outline" className="bg-info/10 text-info text-xs border-info/20">Folyamatban</Badge>
  return <Badge variant="outline" className="bg-primary/10 text-primary text-xs border-primary/20">Aktív Terv</Badge>
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
      toast.success("Megjegyzés sikeresen rögzítve")
    } else {
      toast.error("Hiba a mentéskor")
    }
  }

  return (
    <div className="mt-3 pt-2.5 border-t border-dashed">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <MessageSquare className="w-3.5 h-3.5" />
        Mentori jegyzetek és haladási napló {megjegyzesek.length > 0 && `(${megjegyzesek.length})`}
      </button>

      {expanded && (
        <div className="mt-2.5 space-y-2 pl-4 border-l-2 border-border/40">
          {megjegyzesek.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Még nincsenek mentori vagy haladási bejegyzések.</p>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {megjegyzesek.map(m => (
                <div key={m.id} className="text-xs bg-muted/40 rounded-md p-2.5 border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-foreground text-[11px]">{m.iro?.nev ?? "Munkatárs"}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(m.created_at), "yyyy. MM. dd. HH:mm", { locale: hu })}
                    </span>
                  </div>
                  <p className="text-foreground/90 leading-relaxed text-xs whitespace-pre-wrap">{m.szoveg}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Textarea
              placeholder="Új bejegyzés vagy mentori visszajelzés rögzítése..."
              className="text-xs resize-none h-16 flex-1 bg-background"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <Button
              size="sm"
              className="self-end h-8 px-3"
              onClick={handleAdd}
              disabled={saving || !newNote.trim()}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Küldés"}
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
export function IdpListCard({ tervek, dolgozoId, isManagerView = true }: IdpListCardProps) {
  const router = useRouter()
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null)
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null)

  // Tanúsítvány megtekintés és elutasítás állapota
  const [previewCert, setPreviewCert] = useState<{ url: string; nev?: string | null; title: string } | null>(null)
  const [rejectingGoal, setRejectingGoal] = useState<{ id: string; title: string } | null>(null)
  const [isApprovingId, setIsApprovingId] = useState<string | null>(null)

  const handleApprove = async (celId: string) => {
    setIsApprovingId(celId)
    const result = await approveDevelopmentGoal(celId)
    setIsApprovingId(null)
    if (result.success) {
      toast.success("Képzés jóváhagyva! A képesítés és tanúsítvány automatikusan rögzítve lett.")
      router.refresh()
    } else {
      toast.error("Hiba történt a jóváhagyáskor", { description: result.error })
    }
  }

  const handleDeletePlan = async () => {
    if (!deletePlanId) return
    const result = await deleteDevelopmentPlan(deletePlanId)
    setDeletePlanId(null)
    if (result.success) {
      toast.success("Fejlesztési terv törölve")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const handleDeleteGoal = async () => {
    if (!deleteGoalId) return
    const result = await deleteDevelopmentGoal(deleteGoalId)
    setDeleteGoalId(null)
    if (result.success) {
      toast.success("Célkitűzés törölve")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const handleClosePlan = async (tervId: string) => {
    const result = await closeDevelopmentPlan(tervId)
    if (result.success) {
      toast.success("Fejlesztési terv lezárva")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const handleReopenPlan = async (tervId: string) => {
    const result = await reopenDevelopmentPlan(tervId)
    if (result.success) {
      toast.success("Fejlesztési terv újranyitva")
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const activePlans = useMemo(() => (tervek || []).filter(t => t.statusz !== "lezart"), [tervek])
  const closedPlans = useMemo(() => (tervek || []).filter(t => t.statusz === "lezart"), [tervek])

  const [planTab, setPlanTab] = useState<"aktiv" | "lezart" | "mind">(() => {
    return activePlans.length > 0 ? "aktiv" : closedPlans.length > 0 ? "lezart" : "mind"
  })

  const displayedPlans = useMemo(() => {
    if (planTab === "aktiv") return activePlans
    if (planTab === "lezart") return closedPlans
    return tervek || []
  }, [planTab, activePlans, closedPlans, tervek])

  if (!tervek || tervek.length === 0) return null

  return (
    <div className="space-y-4">
      {/* Terv státusz szűrő fejléc */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
        <div>
          <span className="text-sm font-semibold text-foreground">
            {planTab === "aktiv" ? "Aktív fejlesztési tervek" : planTab === "lezart" ? "Lezárt fejlesztési tervek" : "Minden fejlesztési terv"}
          </span>
        </div>

        <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg border border-border/60 w-fit">
          <button
            type="button"
            onClick={() => setPlanTab("aktiv")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
              planTab === "aktiv"
                ? "bg-card text-foreground shadow-2xs font-semibold border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Aktív tervek</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-semibold",
              planTab === "aktiv" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {activePlans.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPlanTab("lezart")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
              planTab === "lezart"
                ? "bg-card text-foreground shadow-2xs font-semibold border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Lezárt tervek</span>
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-semibold",
              planTab === "lezart" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}>
              {closedPlans.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPlanTab("mind")}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
              planTab === "mind"
                ? "bg-card text-foreground shadow-2xs font-semibold border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span>Összes</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
              {tervek.length}
            </span>
          </button>
        </div>
      </div>

      {displayedPlans.length === 0 ? (
        <div className="text-center p-8 border rounded-lg border-dashed bg-card/40">
          <p className="text-sm font-medium text-foreground mb-1">
            {planTab === "aktiv" ? "Jelenleg nincs aktív fejlesztési terv" : "Nincs lezárt fejlesztési terv"}
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {planTab === "aktiv"
              ? "A munkavállalónak jelenleg nincs aktív fejlesztési terve."
              : "Ebben a nézetben jelenleg nincsenek rögzített tervek."}
          </p>
        </div>
      ) : (
        displayedPlans.map(terv => {
          const isLezart = terv.statusz === "lezart"
          const celok = terv.celok || []
          const completedCount = celok.filter(c => c.statusz === "teljesitve").length

          return (
            <div key={terv.id} className={cn("space-y-3", isLezart && "opacity-80")}>
              {/* Terv Fejléc sáv (Linear-flat) */}
              <div className="flex items-center justify-between p-3.5 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-semibold text-sm text-foreground">{terv.megnevezes}</span>
                <PlanStatusBadge statusz={terv.statusz} />
                <span className="text-xs text-muted-foreground">
                  • {celok.length} célkitűzés ({completedCount} elvégezve)
                </span>
                <span className="text-xs text-muted-foreground">
                  • Rögzítve: {format(new Date(terv.created_at), "yyyy. MM. dd.", { locale: hu })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isManagerView && !isLezart && (
                  <IdpDialog
                    tervId={terv.id}
                    dolgozoId={dolgozoId}
                    buttonVariant="default"
                    buttonText="Új Célkitűzés"
                  />
                )}
                {isManagerView && !isLezart && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => handleClosePlan(terv.id)}
                  >
                    <Lock className="w-3.5 h-3.5 mr-1.5" />
                    Terv Lezárása
                  </Button>
                )}
                {isManagerView && isLezart && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => handleReopenPlan(terv.id)}
                  >
                    <Unlock className="w-3.5 h-3.5 mr-1.5" />
                    Terv Újranyitása
                  </Button>
                )}
                {isManagerView && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeletePlanId(terv.id)}
                    title="Terv törlése"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Célok listája */}
            <div className="space-y-3">
              {celok.length === 0 ? (
                <div className="p-8 text-center border rounded-lg bg-card/50">
                  <p className="text-sm font-medium text-foreground mb-1">Még nincsenek célkitűzések ebben a tervben</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Rögzítsen egy képzést, nyelvvizsgát vagy szakmai kompetencia célt a fenti gombra kattintva.
                  </p>
                  {isManagerView && !isLezart && (
                    <IdpDialog tervId={terv.id} dolgozoId={dolgozoId} buttonVariant="default" buttonText="Célkitűzés Hozzáadása" />
                  )}
                </div>
              ) : (
                celok.map(cel => {
                  const deadlineInfo = getDeadlineInfo(cel.hatarido, cel.statusz)
                  const isDone = cel.statusz === "teljesitve"
                  const isPending = cel.statusz === "jovahagyasra_var"
                  const mentorNev = cel.mentor_profil?.nev || cel.mentor

                  return (
                    <div
                      key={cel.id}
                      className={cn(
                        "rounded-lg border p-4 transition-colors space-y-3",
                        isPending ? "border-warning/50 bg-warning/[0.02]" : isDone ? "bg-card/60" : "bg-card"
                      )}
                    >
                      {/* Fejléc sor */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={cn("font-semibold text-sm text-foreground", isDone && "line-through text-muted-foreground")}>
                              {cel.megnevezes}
                            </h4>
                            <StatusBadge statusz={cel.statusz} />

                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                              {cel.tipus === "kepzes" ? "Képzés" : cel.tipus === "nyelv" ? "Nyelvvizsga" : cel.tipus === "kompetencia" ? "Kompetencia" : "Egyéb"}
                            </Badge>

                            {cel.finanszirozas && cel.finanszirozas !== "ingyenes" && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1 border px-1.5 py-0.5 rounded">
                                <Wallet className="w-2.5 h-2.5" />
                                {cel.finanszirozas === "ceg" ? "Cég fizeti" : cel.finanszirozas === "dolgozo" ? "Önköltség" : "Vegyes"}
                                {cel.koltseg ? ` (${cel.koltseg.toLocaleString("hu-HU")} Ft)` : ""}
                              </span>
                            )}

                            {cel.tanulmanyi_szerzodes && (
                              <span className="text-[10px] text-primary flex items-center gap-1 border border-primary/20 bg-primary/5 px-1.5 py-0.5 rounded font-medium">
                                <FileText className="w-2.5 h-2.5" />
                                {cel.tanulmanyi_szerzodes.szerzodes_szam || "Tanulmányi Szerződés"}
                              </span>
                            )}
                          </div>

                          {cel.leiras && (
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                              {cel.leiras}
                            </p>
                          )}
                        </div>

                        {/* Műveletek (Szerkesztés / Törlés) */}
                        {!isLezart && isManagerView && (
                          <div className="flex items-center gap-1 shrink-0">
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive/50 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteGoalId(cel.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Meta sáv: Határidő, Intézmény, Mentor */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border/40">
                        {cel.hatarido && (
                          <div className={cn("flex items-center gap-1.5", deadlineInfo?.color)}>
                            {deadlineInfo?.icon ? <deadlineInfo.icon className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                            <span>Határidő: {format(new Date(cel.hatarido), "yyyy. MM. dd.", { locale: hu })}</span>
                            {deadlineInfo && <span className="font-medium">({deadlineInfo.label})</span>}
                          </div>
                        )}

                        {mentorNev && (
                          <div className="flex items-center gap-1.5 text-foreground">
                            <UserCheck className="w-3.5 h-3.5 text-primary" />
                            <span>Mentor: <strong>{mentorNev}</strong></span>
                          </div>
                        )}

                        {cel.intezmeny && (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>Intézmény: {cel.intezmeny}</span>
                          </div>
                        )}

                        {isDone && cel.teljesites_datuma && (
                          <div className="flex items-center gap-1.5 text-success font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Teljesítve: {format(new Date(cel.teljesites_datuma), "yyyy. MM. dd.", { locale: hu })}</span>
                          </div>
                        )}
                      </div>

                      {/* Visszaküldési figyelmeztetés, ha korábban elutasították */}
                      {cel.elutasitas_indoklas && cel.statusz === "folyamatban" && (
                        <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold block mb-0.5">Vezetői kiegészítési kérés:</span>
                            <span>{cel.elutasitas_indoklas}</span>
                          </div>
                        </div>
                      )}

                      {/* Vezetői Jóváhagyási Munkasáv (JÓVÁHAGYÁSRA VÁR) */}
                      {isPending && isManagerView && (
                        <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-center justify-between gap-4 flex-wrap">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-warning" />
                              <span className="text-xs font-semibold text-foreground">
                                A munkavállaló igazolást nyújtott be a teljesítésről
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {cel.tanusitvany_nev ? `Csatolt fájl: ${cel.tanusitvany_nev}` : "Tanúsítvány leadva elbírálásra"}
                              {cel.tanusitvany_feltoltve_at && ` • ${format(new Date(cel.tanusitvany_feltoltve_at), "yyyy. MM. dd. HH:mm", { locale: hu })}`}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {cel.tanusitvany_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs bg-background"
                                onClick={() => setPreviewCert({
                                  url: cel.tanusitvany_url!,
                                  nev: cel.tanusitvany_nev,
                                  title: cel.megnevezes
                                })}
                              >
                                <Eye className="w-3.5 h-3.5 mr-1.5" />
                                Tanúsítvány Megtekintése
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                              onClick={() => setRejectingGoal({ id: cel.id, title: cel.megnevezes })}
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                              Visszaküldés
                            </Button>

                            <Button
                              size="sm"
                              className="h-8 text-xs bg-success hover:bg-success/90 text-success-foreground"
                              disabled={isApprovingId === cel.id}
                              onClick={() => handleApprove(cel.id)}
                            >
                              {isApprovingId === cel.id ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              Jóváhagyás
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Tanúsítvány megnézése ha már teljesítve van */}
                      {isDone && cel.tanusitvany_url && (
                        <div className="flex items-center justify-between pt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 px-2"
                            onClick={() => setPreviewCert({
                              url: cel.tanusitvany_url!,
                              nev: cel.tanusitvany_nev,
                              title: cel.megnevezes
                            })}
                          >
                            <FileText className="w-3.5 h-3.5 mr-1.5" />
                            Megszerzett Tanúsítvány Megtekintése ({cel.tanusitvany_nev || "PDF"})
                          </Button>
                        </div>
                      )}

                      {/* Mentori megjegyzések és napló */}
                      <NotesPanel celId={cel.id} megjegyzesek={cel.megjegyzesek ?? []} />
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      }))}

      {/* Tanúsítvány megtekintő modál */}
      {previewCert && (
        <IdpCertificateViewerDialog
          open={!!previewCert}
          onOpenChange={(open) => !open && setPreviewCert(null)}
          tanusitvanyUrl={previewCert.url}
          tanusitvanyNev={previewCert.nev}
          celMegnevezes={previewCert.title}
        />
      )}

      {/* Visszaküldési dialógus */}
      {rejectingGoal && (
        <IdpRejectionDialog
          open={!!rejectingGoal}
          onOpenChange={(open) => !open && setRejectingGoal(null)}
          celId={rejectingGoal.id}
          celMegnevezes={rejectingGoal.title}
        />
      )}

      {/* Terv törlés megerősítése */}
      <AlertDialog open={!!deletePlanId} onOpenChange={() => setDeletePlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fejlesztési Terv Törlése</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan törölni kívánja ezt a fejlesztési tervet? Minden hozzárendelt célkitűzés és mentori jegyzet törlődik.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePlan} className="bg-destructive hover:bg-destructive/90">
              Terv Törlése
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cél törlés megerősítése */}
      <AlertDialog open={!!deleteGoalId} onOpenChange={() => setDeleteGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Célkitűzés Törlése</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan törölni kívánja ezt a szakmai célkitűzést? Minden kapcsolódó jegyzet törlődik.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGoal} className="bg-destructive hover:bg-destructive/90">
              Törlés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
