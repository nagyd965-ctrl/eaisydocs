"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  ArchiveX,
  RotateCcw,
  Loader2,
  Ban,
  Clock
} from "lucide-react"
import { closeDossier, updateDossierStatus } from "@/app/dossiers/[id]/actions"
import { toast } from "sonner"
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

export interface DossierLifecycleTaskStats {
  total: number
  completed: number
  rejected: number
  open: number
}

interface DossierLifecycleActionsProps {
  ugyiratId: string
  ugyId: string
  status: string
  canEdit: boolean
  isUgyintezo: boolean
  isVezeto: boolean
  isAdmin: boolean
  taskStats: DossierLifecycleTaskStats
}

export function DossierLifecycleActions({
  ugyiratId,
  ugyId,
  status,
  canEdit,
  isUgyintezo,
  isVezeto,
  isAdmin,
  taskStats,
}: DossierLifecycleActionsProps) {
  const router = useRouter()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [settleDialogOpen, setSettleDialogOpen] = useState(false)
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)

  // Archival privileges: leaders, admins, registrars (not plain ügyintéző)
  const canArchive = canEdit && !isUgyintezo

  // Ellenőrizzük, hogy elintézhető-e az ügyirat
  const hasRejectedTasks = taskStats.rejected > 0
  const hasOpenTasks = taskStats.open > 0
  const canSettle = !hasRejectedTasks && !hasOpenTasks

  // 1. Ügyirat elintézése (Ügyintézés alatt -> Elintézett)
  const handleSettle = async () => {
    if (!canSettle) {
      toast.error("Nem intézhető el", {
        description: hasRejectedTasks
          ? "Az ügyiratban elutasított feladat található!"
          : "Még folyamatban lévő feladatok vannak!"
      })
      return
    }

    setLoadingAction("settle")
    const res = await updateDossierStatus(ugyiratId, ugyId, "elintezett")
    setLoadingAction(null)
    setSettleDialogOpen(false)

    if (res.error) {
      toast.error("Hiba", { description: res.error })
    } else {
      toast.success("Sikeres", { description: "Ügyirat sikeresen elintézett státuszba került." })
      router.refresh()
    }
  }

  // 2. Visszahelyezés ügyintézés alá (Elintézett -> Ügyintézés alatt)
  const handleReopen = async () => {
    setLoadingAction("reopen")
    const res = await updateDossierStatus(ugyiratId, ugyId, "ugyintezes_alatt")
    setLoadingAction(null)
    setReopenDialogOpen(false)

    if (res.error) {
      toast.error("Hiba", { description: res.error })
    } else {
      toast.success("Sikeres", { description: "Ügyirat visszahelyezve ügyintézés alá." })
      router.refresh()
    }
  }

  // 3. Végleges lezárás és irattározás (Elintézett / egyéb -> Irattárban)
  const handleArchive = async () => {
    setLoadingAction("archive")
    const res = await closeDossier(ugyiratId)
    setLoadingAction(null)
    setArchiveDialogOpen(false)

    if (res.error) {
      toast.error("Hiba", { description: res.error })
    } else {
      toast.success("Sikeres", { description: "Ügyirat lezárva és irattárba helyezve." })
      router.refresh()
    }
  }

  // Ha az ügyirat már véglegesen archiválva / lezárva van, nem jelennek meg lezáró gombok
  if (status === "irattarban" || status === "lezart" || status === "selejtezheto" || status === "selejtezett") {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      {/* ── FÁZIS 1: Folyamatban lévő ügyirat (iktatva / szignalt / ugyintezes_alatt) ── */}
      {status !== "elintezett" && canEdit && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettleDialogOpen(true)}
            className="h-8 gap-1.5 text-xs text-foreground border-border hover:border-primary/40 hover:bg-muted/50 cursor-pointer"
            disabled={loadingAction !== null}
          >
            {loadingAction === "settle" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            )}
            <span>Ügyirat elintézése</span>
          </Button>

          <AlertDialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Ügyirat elintézése
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Az ügyirat elintézettként történő megjelölése igazolja, hogy az érdemi szakmai munka és minden kapcsolódó teendő befejeződött.
                </AlertDialogDescription>
              </AlertDialogHeader>

              {/* Feladat státusz vizsgálat doboz */}
              <div className="space-y-2 text-xs">
                {taskStats.total > 0 && (
                  <>
                    {hasRejectedTasks && (
                      <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2.5">
                        <Ban className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="font-semibold block">
                            Elutasított feladat ({taskStats.rejected} db)
                          </span>
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            Az ügyiratban elutasított feladat van. Az elutasítás azt jelzi, hogy a feladatban hiányosság vagy probléma merült fel. Kérjük vizsgálja felül vagy ossza ki újra a feladatot a Feladatok fülön az elintézés előtt.
                          </p>
                        </div>
                      </div>
                    )}

                    {hasOpenTasks && !hasRejectedTasks && (
                      <div className="p-3 rounded-lg border border-warning/30 bg-warning/5 text-warning flex items-start gap-2.5">
                        <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="font-semibold block">
                            Még nyitott feladatok ({taskStats.open} db)
                          </span>
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            Összesen {taskStats.completed}/{taskStats.total} feladat kész. Az ügyirat csak az összes feladat befejezése után intézhető el.
                          </p>
                        </div>
                      </div>
                    )}

                    {canSettle && (
                      <div className="p-3 rounded-lg border border-success/30 bg-success/5 text-success flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold block">
                            Minden feladat kész ({taskStats.completed}/{taskStats.total})
                          </span>
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            Az összes feladat sikeresen lezárult, nincsenek nyitott vagy elutasított tételek.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {taskStats.total === 0 && (
                  <div className="p-3 rounded-lg border border-border/60 bg-muted/30 text-muted-foreground text-[11px]">
                    Az ügyiratban nincsenek rögzített feladatok. A megerősítéssel az ügyirat állapota „Elintézett”-re vált.
                  </div>
                )}
              </div>

              <AlertDialogFooter className="mt-2">
                <AlertDialogCancel disabled={loadingAction !== null}>Mégsem</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleSettle}
                  disabled={!canSettle || loadingAction !== null}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {loadingAction === "settle" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Elintézettként megerősítés
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* ── FÁZIS 2: Elintézett ügyirat (elintezett) ── */}
      {status === "elintezett" && (
        <>
          {/* Visszahelyezés ügyintézésbe */}
          {canEdit && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReopenDialogOpen(true)}
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                disabled={loadingAction !== null}
                title="Újranyitás ha további teendő merülne fel"
              >
                {loadingAction === "reopen" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                <span>Visszahelyezés ügyintézésbe</span>
              </Button>

              <AlertDialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-base flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-info" />
                      Visszahelyezés ügyintézésbe
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                      Biztosan visszaállítja az ügyirat státuszát „Ügyintézés alatt” állapotba? Ezt követően ismét új feladatokat oszthat ki vagy módosíthatja az ügyirat tartalmát.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={loadingAction !== null}>Mégsem</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleReopen}
                      disabled={loadingAction !== null}
                      className="bg-foreground text-background hover:bg-foreground/90"
                    >
                      Visszahelyezés megerősítése
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {/* Végleges Lezárás és Irattározás */}
          {canArchive && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setArchiveDialogOpen(true)}
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                disabled={loadingAction !== null}
              >
                {loadingAction === "archive" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArchiveX className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span>Lezárás és Irattározás</span>
              </Button>

              <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-base flex items-center gap-2">
                      <ArchiveX className="h-5 w-5 text-muted-foreground" />
                      Ügyirat lezárása és irattározása
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
                      Az ügyirat szakmailag elintézett. Biztosan véglegesen lezárja és irattárba helyezi? A megőrzési idő automatikusan kiszámításra kerül a hozzárendelt irattári tétel alapján. A lezárást követően az ügyirat tartalma már nem módosítható.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={loadingAction !== null}>Mégsem</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleArchive}
                      disabled={loadingAction !== null}
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    >
                      Lezárás és archiválás
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </>
      )}
    </div>
  )
}
