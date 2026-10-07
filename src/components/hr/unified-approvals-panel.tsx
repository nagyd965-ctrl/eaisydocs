"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  CalendarDays, 
  ArrowRight, 
  Coins, 
  FileText, 
  Loader2,
  Check,
  X,
  MessageSquareQuote,
  Filter
} from "lucide-react"
import { approveLeaveRequest, rejectLeaveRequest } from "@/app/hr/manager/actions"
import { handleAttendanceCorrectionApproval, handleOvertimeApproval } from "@/app/hr/attendance-actions"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export type ApprovalCategory = "all" | "tavollet" | "korrekcio" | "tulora"

export interface UnifiedApprovalItem {
  id: string
  category: "tavollet" | "korrekcio" | "tulora"
  dolgozoId: string
  dolgozoNev: string
  createdAt: string
  
  // Távollét
  tavolletTipus?: string
  kezdetDatuma?: string
  vegDatuma?: string
  munkanapokSzama?: number
  
  // Korrekció
  korrekcioDatum?: string
  eredetiBecsekkolas?: string | null
  eredetiKicsekkolas?: string | null
  ujBecsekkolas?: string
  ujKicsekkolas?: string
  
  // Túlóra
  tuloraTipus?: "kiveszi_szabinak" | "kifizetteti"
  tuloraPerc?: number
  
  // Közös indoklás
  indoklas?: string | null
}

const TIPUS_LABELS: Record<string, string> = {
  szabadsag: "Szabadság",
  fizetett_szabadsag: "Fizetett szabadság",
  fizetetlen_szabadsag: "Fizetetlen szabadság",
  betegszabadsag: "Betegszabadság",
  betegseg: "Betegség",
  tappenz: "Táppénz",
  csusztatas: "Csúsztatás",
  egyeb: "Egyéb távollét",
}

function formatIsoTime(iso?: string | null): string {
  if (!iso) return "--:--"
  if (iso.includes("T")) {
    try {
      const d = new Date(iso)
      if (!isNaN(d.getTime())) {
        const h = String(d.getHours()).padStart(2, "0")
        const m = String(d.getMinutes()).padStart(2, "0")
        return `${h}:${m}`
      }
    } catch {}
  }
  return iso.substring(0, 5)
}

function formatMinutes(perc?: number): string {
  if (!perc) return "0 perc"
  const h = Math.floor(perc / 60)
  const m = perc % 60
  if (h === 0) return `${m} perc`
  if (m === 0) return `${h} óra`
  return `${h} óra ${m} perc`
}

interface UnifiedApprovalsPanelProps {
  initialItems: UnifiedApprovalItem[]
}

export function UnifiedApprovalsPanel({ initialItems }: UnifiedApprovalsPanelProps) {
  const router = useRouter()
  const [items, setItems] = useState<UnifiedApprovalItem[]>(initialItems)
  const [activeCategory, setActiveCategory] = useState<ApprovalCategory>("all")
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null)

  // Rejection dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectingItem, setRejectingItem] = useState<UnifiedApprovalItem | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const countLeaves = items.filter(i => i.category === "tavollet").length
  const countCorrections = items.filter(i => i.category === "korrekcio").length
  const countOvertimes = items.filter(i => i.category === "tulora").length
  const countTotal = items.length

  const filteredItems = items.filter(item => {
    if (activeCategory === "all") return true
    return item.category === activeCategory
  })

  // Jóváhagyás kezelése
  const handleApprove = async (item: UnifiedApprovalItem) => {
    setLoadingItemId(item.id)
    try {
      if (item.category === "tavollet") {
        const res = await approveLeaveRequest(item.id)
        if (res.error) {
          toast.error("Hiba a távollét jóváhagyásakor: " + res.error)
          return
        }
        toast.success(`Szabadság jóváhagyva: ${item.dolgozoNev}`)
      } else if (item.category === "korrekcio") {
        const res = await handleAttendanceCorrectionApproval(item.id, "jovahagyva")
        if (res.error) {
          toast.error("Hiba a korrekció jóváhagyásakor: " + res.error)
          return
        }
        toast.success(`Munkaidő korrekció jóváhagyva: ${item.dolgozoNev}`)
      } else if (item.category === "tulora") {
        const res = await handleOvertimeApproval(item.id, "jovahagyva")
        if (res.error) {
          toast.error("Hiba a túlóra jóváhagyásakor: " + res.error)
          return
        }
        toast.success(`Túlóra jóváhagyva: ${item.dolgozoNev}`)
      }

      setItems(prev => prev.filter(i => i.id !== item.id))
      router.refresh()
    } catch (err: any) {
      toast.error("Váratlan hiba történt: " + err.message)
    } finally {
      setLoadingItemId(null)
    }
  }

  // Elutasítás kezdeményezése
  const openRejectDialog = (item: UnifiedApprovalItem) => {
    setRejectingItem(item)
    setRejectReason("")
    setRejectDialogOpen(true)
  }

  // Elutasítás megerősítése
  const handleConfirmReject = async () => {
    if (!rejectingItem) return
    const item = rejectingItem
    setLoadingItemId(item.id)
    setRejectDialogOpen(false)

    try {
      if (item.category === "tavollet") {
        const res = await rejectLeaveRequest(item.id)
        if (res.error) {
          toast.error("Hiba az elutasítás során: " + res.error)
          return
        }
        toast.info(`Szabadság elutasítva: ${item.dolgozoNev}`)
      } else if (item.category === "korrekcio") {
        const res = await handleAttendanceCorrectionApproval(item.id, "elutasitva", rejectReason.trim() || undefined)
        if (res.error) {
          toast.error("Hiba az elutasítás során: " + res.error)
          return
        }
        toast.info(`Munkaidő korrekció elutasítva: ${item.dolgozoNev}`)
      } else if (item.category === "tulora") {
        const res = await handleOvertimeApproval(item.id, "elutasitva")
        if (res.error) {
          toast.error("Hiba az elutasítás során: " + res.error)
          return
        }
        toast.info(`Túlóra elutasítva: ${item.dolgozoNev}`)
      }

      setItems(prev => prev.filter(i => i.id !== item.id))
      router.refresh()
    } catch (err: any) {
      toast.error("Váratlan hiba történt: " + err.message)
    } finally {
      setLoadingItemId(null)
      setRejectingItem(null)
    }
  }

  return (
    <>
      <Card className="border border-border">
        <CardHeader className="pb-3 border-b bg-card/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {countTotal > 0 ? (
                <div className="h-8 w-8 rounded-lg bg-warning/15 text-warning flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-lg bg-success/15 text-success flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">
                    Jóváhagyásra váró kérelmek
                  </CardTitle>
                  {countTotal > 0 && (
                    <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-warning text-warning-foreground text-[11px] font-bold tabular-nums">
                      {countTotal}
                    </span>
                  )}
                </div>
                <CardDescription className="text-xs mt-0.5">
                  {countTotal > 0 
                    ? "Távolléti, munkaidő korrekciós és túlóra elbírálások egyetlen helyen."
                    : "A csapatod összes kérelmét elintézted."}
                </CardDescription>
              </div>
            </div>

            {/* Szűrő gombok */}
            {countTotal > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant={activeCategory === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory("all")}
                  className="h-7 text-xs px-2.5"
                >
                  Összes
                  <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold tabular-nums ${
                    activeCategory === "all" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {countTotal}
                  </span>
                </Button>

                {countLeaves > 0 && (
                  <Button
                    variant={activeCategory === "tavollet" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory("tavollet")}
                    className="h-7 text-xs px-2.5"
                  >
                    Távollét
                    <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold tabular-nums ${
                      activeCategory === "tavollet" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {countLeaves}
                    </span>
                  </Button>
                )}

                {countCorrections > 0 && (
                  <Button
                    variant={activeCategory === "korrekcio" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory("korrekcio")}
                    className="h-7 text-xs px-2.5"
                  >
                    Munkaidő
                    <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold tabular-nums ${
                      activeCategory === "korrekcio" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {countCorrections}
                    </span>
                  </Button>
                )}

                {countOvertimes > 0 && (
                  <Button
                    variant={activeCategory === "tulora" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory("tulora")}
                    className="h-7 text-xs px-2.5"
                  >
                    Túlóra
                    <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold tabular-nums ${
                      activeCategory === "tulora" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {countOvertimes}
                    </span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {countTotal === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center rounded-lg border border-dashed border-border/60 bg-muted/20">
              <CheckCircle2 className="w-10 h-10 text-success mb-2 opacity-90" />
              <p className="text-sm font-semibold text-foreground">Nincs függőben lévő kérelem</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                A beosztottaid nem nyújtottak be új szabadság, munkaidő korrekciós vagy túlóra kérelmet.
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Ebben a kategóriában jelenleg nincs függő kérelem.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map(item => {
                const initials = item.dolgozoNev
                  .split(" ")
                  .map((w: string) => w[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase()

                const isCurrentLoading = loadingItemId === item.id

                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-border/80 bg-card hover:border-primary/30 transition-colors"
                  >
                    {/* Bal oldal: Avatar + Információk */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">
                            {item.dolgozoNev}
                          </span>

                          {/* Kategória és Típus Badge */}
                          {item.category === "tavollet" && (
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 ${
                                item.tavolletTipus === "betegszabadsag" || item.tavolletTipus === "betegseg"
                                  ? "bg-destructive/10 text-destructive border-destructive/30"
                                  : item.tavolletTipus === "csusztatas"
                                  ? "bg-warning/10 text-warning border-warning/30"
                                  : "bg-info/10 text-info border-info/30"
                              }`}
                            >
                              {TIPUS_LABELS[item.tavolletTipus || ""] || item.tavolletTipus || "Szabadság"}
                            </Badge>
                          )}

                          {item.category === "korrekcio" && (
                            <Badge 
                              variant="outline" 
                              className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 bg-warning/15 text-warning-foreground dark:text-warning border-warning/30"
                            >
                              Munkaidő korrekció
                            </Badge>
                          )}

                          {item.category === "tulora" && (
                            <Badge 
                              variant="outline" 
                              className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 bg-primary/10 text-primary border-primary/30"
                            >
                              {item.tuloraTipus === "kifizetteti" ? "Túlóra • Kifizetés" : "Túlóra • Csúsztatás"}
                            </Badge>
                          )}

                          <span className="text-[11px] text-muted-foreground ml-auto sm:ml-0 tabular-nums">
                            {new Date(item.createdAt).toLocaleDateString("hu-HU")}
                          </span>
                        </div>

                        {/* Részletek sáv */}
                        <div className="mt-1 text-xs text-muted-foreground">
                          {item.category === "tavollet" && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
                              <span className="font-medium text-foreground tabular-nums">
                                {new Date(item.kezdetDatuma || "").toLocaleDateString("hu-HU")} – {new Date(item.vegDatuma || "").toLocaleDateString("hu-HU")}
                              </span>
                              {item.munkanapokSzama && (
                                <span className="text-muted-foreground font-normal">
                                  ({item.munkanapokSzama} munkanap)
                                </span>
                              )}
                            </div>
                          )}

                          {item.category === "korrekcio" && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Clock className="w-3.5 h-3.5 text-warning shrink-0" />
                              <span className="font-medium text-foreground">
                                {item.korrekcioDatum}
                              </span>
                              <span className="text-muted-foreground/60">•</span>
                              {item.eredetiBecsekkolas || item.eredetiKicsekkolas ? (
                                <span className="line-through text-muted-foreground/80 tabular-nums">
                                  {formatIsoTime(item.eredetiBecsekkolas)} – {formatIsoTime(item.eredetiKicsekkolas)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/80 italic">Hiányzó jelenlét</span>
                              )}
                              <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="font-semibold text-warning-foreground dark:text-warning tabular-nums">
                                Kért: {formatIsoTime(item.ujBecsekkolas)} – {formatIsoTime(item.ujKicsekkolas)}
                              </span>
                            </div>
                          )}

                          {item.category === "tulora" && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Coins className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="font-medium text-foreground tabular-nums">
                                {formatMinutes(item.tuloraPerc)}
                              </span>
                              <span className="text-muted-foreground">
                                {item.tuloraTipus === "kifizetteti" ? "(Pénzbeli kifizetésként kéri)" : "(Szabadidőként kéri lecsúsztatni)"}
                              </span>
                            </div>
                          )}

                          {/* Indoklás idézet */}
                          {item.indoklas && (
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground italic">
                              <MessageSquareQuote className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                              <span className="truncate max-w-[450px]" title={item.indoklas}>
                                „{item.indoklas}”
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Jobb oldal: Műveleti Gombok */}
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => openRejectDialog(item)}
                        disabled={isCurrentLoading}
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Elutasít
                      </Button>

                      <Button
                        size="sm"
                        className="h-8 text-xs bg-success text-success-foreground hover:bg-success/90"
                        onClick={() => handleApprove(item)}
                        disabled={isCurrentLoading}
                      >
                        {isCurrentLoading ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        )}
                        Jóváhagy
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Elutasítási dialógus opcionális indoklással */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Kérelem elutasítása</DialogTitle>
            <DialogDescription>
              Biztosan elutasítod {rejectingItem?.dolgozoNev} kérelmét?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="rejectReason" className="text-xs font-medium">
              Elutasítás indoklása (opcionális, a dolgozó értesítést kap róla)
            </Label>
            <Input
              id="rejectReason"
              placeholder="pl. Nincs elegendő kapacitás az adott napon..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="text-sm"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectDialogOpen(false)}>
              Mégse
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleConfirmReject}
              disabled={loadingItemId !== null}
            >
              Elutasítás megerősítése
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
