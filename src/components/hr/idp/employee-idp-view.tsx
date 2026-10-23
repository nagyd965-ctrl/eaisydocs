"use client"

import { useState, useMemo, useEffect } from "react"
import { format, differenceInDays, isPast } from "date-fns"
import { hu } from "date-fns/locale"
import {
  CheckCircle2, Circle, Clock, Calendar, ChevronDown, ChevronRight,
  Plus, AlertTriangle, User2, MessageSquare, Loader2, Flag, FileText,
  Upload, Eye, School, Building2, Banknote
} from "lucide-react"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { updateDevelopmentGoalStatus, addIDPNote } from "@/app/hr/actions/idp-actions"
import { IdpCertificateUploadDialog } from "@/components/hr/idp/idp-certificate-upload-dialog"
import { IdpCertificateViewerDialog } from "@/components/hr/idp/idp-certificate-viewer-dialog"
import { KpiCard } from "@/components/kpi-card"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Szótárak és segédek
// ---------------------------------------------------------------------------
const FINANSZIROZAS_MAP: Record<string, string> = {
  ceg: "Céges finanszírozás",
  dolgozo: "Dolgozói önrész",
  ingyenes: "Ingyenes / Belső mentorálás",
  vegyes: "Megosztott finanszírozás",
}

const TIPUS_MAP: Record<string, string> = {
  kompetencia: "Kompetencia",
  kepzes: "Képzés / Tanfolyam",
  nyelv: "Nyelvtanulás",
  egyeb: "Egyéb cél",
}

function DeadlineInfo({ hatarido, statusz }: { hatarido?: string | null; statusz?: string | null }) {
  if (!hatarido || statusz === "teljesitve") return null
  const deadline = new Date(hatarido)
  const daysLeft = differenceInDays(deadline, new Date())

  if (isPast(deadline)) {
    return (
      <span className="flex items-center gap-1 text-destructive font-medium">
        <AlertTriangle className="w-3.5 h-3.5" />
        {Math.abs(daysLeft)} napja lejárt!
      </span>
    )
  }
  if (daysLeft <= 30) {
    return (
      <span className="flex items-center gap-1 text-warning font-medium">
        <Clock className="w-3.5 h-3.5" />
        {daysLeft} nap múlva esedékes
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      <Calendar className="w-3.5 h-3.5" />
      {format(deadline, "yyyy. MM. dd.", { locale: hu })}
    </span>
  )
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
      toast.success("Megjegyzés rögzítve")
    } else {
      toast.error("Hiba a mentéskor")
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-dashed">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <MessageSquare className="w-3.5 h-3.5" />
        Haladási napló {megjegyzesek.length > 0 && `(${megjegyzesek.length} bejegyzés)`}
      </button>

      {expanded && (
        <div className="mt-2.5 space-y-3 pl-4 border-l">
          {megjegyzesek.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Még nincs rögzített haladási bejegyzés. Oszd meg a fejlődésed a mentoroddal!</p>
          ) : (
            <div className="space-y-2">
              {megjegyzesek.map((m: any) => (
                <div key={m.id} className="text-xs bg-muted/30 border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">{m.iro?.nev ?? "Rendszer"}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(m.created_at), "yyyy. MM. dd. HH:mm", { locale: hu })}
                    </span>
                  </div>
                  <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{m.szoveg}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Textarea
              placeholder="Rögzíts egy haladási lépést, elolvasott tananyagot, felmerült kérdést..."
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
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
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

  // Modál állapotok tanúsítványokhoz
  const [uploadGoal, setUploadGoal] = useState<{ id: string; megnevezes: string } | null>(null)
  const [viewerGoal, setViewerGoal] = useState<{ url: string; nev?: string | null; megnevezes: string } | null>(null)

  // Statisztikák számítása
  const allGoals = tervek.flatMap(t => t.celok || t.hr_fejlesztesi_cel || [])
  const totalGoals = allGoals.length
  const inProgressGoals = allGoals.filter(c => c.statusz === "folyamatban" || c.statusz === "nyitott").length
  const pendingApprovalGoals = allGoals.filter(c => c.statusz === "jovahagyasra_var").length
  const completedGoals = allGoals.filter(c => c.statusz === "teljesitve").length

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

  const handleMarkInProgress = async (celId: string) => {
    setLoadingId(celId)
    const res = await updateDevelopmentGoalStatus(celId, "folyamatban")
    setLoadingId(null)
    if (res.success) {
      toast.success("A célt folyamatban lévőre állítottad.")
      router.refresh()
    } else {
      toast.error("Hiba történt", { description: res.error })
    }
  }

  const handleDirectRequestDone = async (celId: string) => {
    setLoadingId(celId)
    const res = await updateDevelopmentGoalStatus(celId, "jovahagyasra_var")
    setLoadingId(null)
    if (res.success) {
      toast.success("Jelezted a cél teljesítését a vezetőd felé.")
      router.refresh()
    } else {
      toast.error("Hiba történt", { description: res.error })
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Linear-Flat KPI Statisztikai Sáv */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Összes fejlesztési cél"
          value={`${totalGoals} db`}
          sub={`${activePlans.length} aktív tervben`}
        />
        <KpiCard
          label="Folyamatban"
          value={`${inProgressGoals} db`}
          sub="Aktív képzés / célkitűzés"
        />
        <KpiCard
          label="Jóváhagyásra vár"
          value={`${pendingApprovalGoals} db`}
          sub={pendingApprovalGoals > 0 ? "Vezetői elbírálásra vár" : "Nincs függő tanúsítvány"}
          highlight={pendingApprovalGoals > 0}
        />
        <KpiCard
          label="Sikeresen teljesítve"
          value={`${completedGoals} db`}
          sub={totalGoals > 0 ? `${Math.round((completedGoals / totalGoals) * 100)}% teljesülési arány` : "0% teljesülés"}
        />
      </div>

      {/* 2. Tervek Fejléc és Státusz Szűrő */}
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
              ? "Jelenleg nincs folyamatban lévő fejlesztési terved."
              : "Ebben a nézetben jelenleg nincsenek rögzített tervek."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {displayedPlans.map(terv => {
          const celok = terv.celok || terv.hr_fejlesztesi_cel || []
          const planTotal = celok.length
          const planDone = celok.filter((c: any) => c.statusz === "teljesitve").length
          const progress = planTotal === 0 ? 0 : Math.round((planDone / planTotal) * 100)
          const isLezart = terv.statusz === "lezart"

          return (
            <Card key={terv.id} className={cn("overflow-hidden border border-border/70 shadow-xs", isLezart && "opacity-75")}>
              {/* Terv Fejléc */}
              <CardHeader className="bg-muted/20 pb-4 border-b">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-base tracking-tight">{terv.megnevezes}</h2>
                      {isLezart ? (
                        <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">Lezárva</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">Aktív terv</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Rögzítve: {format(new Date(terv.created_at), "yyyy. MMMM d.", { locale: hu })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{progress}%</p>
                    <p className="text-[11px] text-muted-foreground">{planDone}/{planTotal} cél teljesítve</p>
                    <Progress value={progress} className="w-[110px] h-1.5 mt-1" />
                  </div>
                </div>
              </CardHeader>

              {/* Terv Céljai */}
              <CardContent className="p-4 space-y-3">
                {celok.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center py-6">
                    Nincsenek célkitűzések hozzárendelve ehhez a tervhez.
                  </p>
                ) : (
                  celok.map((cel: any) => {
                    const isDone = cel.statusz === "teljesitve"
                    const isPending = cel.statusz === "jovahagyasra_var"
                    const isInProgress = cel.statusz === "folyamatban"
                    const isNyitott = cel.statusz === "nyitott"
                    const isLoading = loadingId === cel.id
                    const hasCertificate = !!cel.tanusitvany_url
                    const mentorNev = cel.mentor_profil?.nev || cel.mentor
                    const hasRejectedFeedback = !!cel.elutasitas_indoklas && cel.statusz === "folyamatban"

                    return (
                      <div
                        key={cel.id}
                        className={cn(
                          "rounded-lg border p-4 transition-colors",
                          isDone    ? "bg-success/5 border-success/20" :
                          isPending ? "bg-warning/5 border-warning/20" :
                          hasRejectedFeedback ? "bg-destructive/5 border-destructive/20" :
                                      "bg-card hover:border-primary/30"
                        )}
                      >
                        {/* Cél fejléce és jelvények */}
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 shrink-0">
                            {isDone    ? <CheckCircle2 className="w-5 h-5 text-success" /> :
                             isPending ? <Clock className="w-5 h-5 text-warning" /> :
                             isInProgress ? <Circle className="w-5 h-5 text-info fill-info/20" /> :
                                            <Circle className="w-5 h-5 text-muted-foreground/40" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <h3 className={cn(
                                "font-semibold text-sm",
                                isDone && "line-through text-muted-foreground"
                              )}>
                                {cel.megnevezes}
                              </h3>
                              <Badge variant="outline" className="text-[10px]">
                                {TIPUS_MAP[cel.tipus] || "Fejlesztés"}
                              </Badge>

                              {cel.tanulmanyi_szerzodes && (
                                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                                  <FileText className="w-2.5 h-2.5 mr-1" />
                                  Tanulmányi szerződés: {cel.tanulmanyi_szerzodes.szerzodes_szam || "Csatolva"}
                                </Badge>
                              )}
                            </div>

                            {cel.leiras && (
                              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                                {cel.leiras}
                              </p>
                            )}

                            {/* Információs mezők rács */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-md border border-border/50 mb-3">
                              <div>
                                <DeadlineInfo hatarido={cel.hatarido} statusz={cel.statusz} />
                              </div>

                              {mentorNev && (
                                <div className="flex items-center gap-1.5">
                                  <User2 className="w-3.5 h-3.5 text-foreground/70" />
                                  <span>Mentor: <strong className="text-foreground font-medium">{mentorNev}</strong></span>
                                </div>
                              )}

                              {cel.intezmeny && (
                                <div className="flex items-center gap-1.5">
                                  <School className="w-3.5 h-3.5 text-foreground/70" />
                                  <span className="truncate">{cel.intezmeny}</span>
                                </div>
                              )}

                              {cel.finanszirozas && (
                                <div className="flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-foreground/70" />
                                  <span>{FINANSZIROZAS_MAP[cel.finanszirozas] || cel.finanszirozas}</span>
                                </div>
                              )}

                              {cel.koltseg && (
                                <div className="flex items-center gap-1.5">
                                  <Banknote className="w-3.5 h-3.5 text-foreground/70" />
                                  <span>Költség: {Number(cel.koltseg).toLocaleString('hu-HU')} Ft</span>
                                </div>
                              )}

                              {isDone && cel.teljesites_datuma && (
                                <div className="flex items-center gap-1.5 text-success font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Teljesítve: {format(new Date(cel.teljesites_datuma), "yyyy. MM. dd.", { locale: hu })}</span>
                                </div>
                              )}
                            </div>

                            {/* Vezetői elutasítás / javításkérés indoklása */}
                            {hasRejectedFeedback && (
                              <div className="mb-3 text-xs bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-3">
                                <div className="flex items-center gap-1.5 font-semibold mb-1">
                                  <AlertTriangle className="w-4 h-4 shrink-0" />
                                  <span>Vezetői visszajelzés – Javítás szükséges:</span>
                                </div>
                                <p className="leading-relaxed whitespace-pre-wrap pl-5 text-foreground/90">
                                  {cel.elutasitas_indoklas}
                                </p>
                              </div>
                            )}

                            {/* Státusz tájékoztatók */}
                            {isPending && (
                              <div className="mb-3 text-xs text-warning bg-warning/10 border border-warning/20 rounded-md px-3 py-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 shrink-0" />
                                  <span>Jóváhagyásra vár – a vezetőd hamarosan ellenőrzi az elvégzést és a tanúsítványt.</span>
                                </div>
                                {hasCertificate && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs bg-background shrink-0"
                                    onClick={() => setViewerGoal({
                                      url: cel.tanusitvany_url,
                                      nev: cel.tanusitvany_nev,
                                      megnevezes: cel.megnevezes
                                    })}
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Feltöltött igazolás
                                  </Button>
                                )}
                              </div>
                            )}

                            {isDone && (
                              <div className="mb-3 text-xs text-success bg-success/10 border border-success/20 rounded-md px-3 py-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                                  <span>A cél sikeresen leigazolva! Bekerült a hivatalos képzettségeid és dokumentumaid közé.</span>
                                </div>
                                {hasCertificate && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs bg-background shrink-0"
                                    onClick={() => setViewerGoal({
                                      url: cel.tanusitvany_url,
                                      nev: cel.tanusitvany_nev,
                                      megnevezes: cel.megnevezes
                                    })}
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Tanúsítvány megtekintése
                                  </Button>
                                )}
                              </div>
                            )}

                            {/* Akciógombok munkavállaló számára */}
                            {!isDone && !isPending && !isLezart && (
                              <div className="flex items-center gap-2 flex-wrap pt-1">
                                {isNyitott && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    disabled={isLoading}
                                    onClick={() => handleMarkInProgress(cel.id)}
                                  >
                                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                                    Elkezdtem a felkészülést
                                  </Button>
                                )}

                                <Button
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => setUploadGoal({ id: cel.id, megnevezes: cel.megnevezes })}
                                >
                                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                                  {hasRejectedFeedback ? "Javított tanúsítvány feltöltése" : "Tanúsítvány feltöltése és leadás"}
                                </Button>

                                {isInProgress && !hasRejectedFeedback && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                                    disabled={isLoading}
                                    onClick={() => handleDirectRequestDone(cel.id)}
                                  >
                                    Elkészült (tanúsítvány nélkül)
                                  </Button>
                                )}
                              </div>
                            )}

                            {/* Haladási napló */}
                            <NotesPanel celId={cel.id} megjegyzesek={cel.megjegyzesek ?? []} />
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
      )}

      {/* Tanúsítvány Feltöltési Modál */}
      {uploadGoal && (
        <IdpCertificateUploadDialog
          celId={uploadGoal.id}
          celMegnevezes={uploadGoal.megnevezes}
          open={!!uploadGoal}
          onOpenChange={(open) => !open && setUploadGoal(null)}
        />
      )}

      {/* Tanúsítvány Előnézeti Modál */}
      {viewerGoal && (
        <IdpCertificateViewerDialog
          tanusitvanyUrl={viewerGoal.url}
          tanusitvanyNev={viewerGoal.nev}
          celMegnevezes={viewerGoal.megnevezes}
          open={!!viewerGoal}
          onOpenChange={(open) => !open && setViewerGoal(null)}
        />
      )}
    </div>
  )
}
