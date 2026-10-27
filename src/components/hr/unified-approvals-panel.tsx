"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Search,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
} from "lucide-react"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
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
  statusz?: "jovahagyasra_var" | "jovahagyva" | "elutasitva" | string
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
  
  // Közös indoklás és bírálati adatok
  indoklas?: string | null
  elutasitasOka?: string | null
  jovahagyvaEkkor?: string | null
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

interface EmployeeApprovalGroup {
  dolgozoId: string
  dolgozoNev: string
  initials: string
  items: UnifiedApprovalItem[]
}

export function UnifiedApprovalsPanel({ initialItems }: UnifiedApprovalsPanelProps) {
  const router = useRouter()
  const [items, setItems] = useState<UnifiedApprovalItem[]>(initialItems)
  const [statusTab, setStatusTab] = useState<"jovahagyasra_var" | "jovahagyva" | "elutasitva">("jovahagyasra_var")
  const [employeeSearch, setEmployeeSearch] = useState("")
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null)
  const [isApprovingAllId, setIsApprovingAllId] = useState<string | null>(null)

  // Rejection dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectingItem, setRejectingItem] = useState<UnifiedApprovalItem | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const countPending = useMemo(
    () => items.filter((i) => (i.statusz || "jovahagyasra_var") === "jovahagyasra_var").length,
    [items]
  )
  const countApproved = useMemo(
    () => items.filter((i) => i.statusz === "jovahagyva").length,
    [items]
  )
  const countRejected = useMemo(
    () => items.filter((i) => i.statusz === "elutasitva").length,
    [items]
  )

  // Aktuális fül elemei
  const currentTabItems = useMemo(() => {
    return items.filter((i) => (i.statusz || "jovahagyasra_var") === statusTab)
  }, [items, statusTab])

  // Szűrt lista (dolgozó keresés)
  const filteredItems = useMemo(() => {
    if (!employeeSearch.trim()) return currentTabItems
    const q = employeeSearch.trim().toLowerCase()
    return currentTabItems.filter((item) => item.dolgozoNev.toLowerCase().includes(q))
  }, [currentTabItems, employeeSearch])

  // Dolgozói szintű csoportosítás
  const groupedByEmployee = useMemo(() => {
    const map = new Map<string, EmployeeApprovalGroup>()

    for (const item of filteredItems) {
      const key = item.dolgozoId || item.dolgozoNev
      if (!map.has(key)) {
        const initials = item.dolgozoNev
          .split(" ")
          .map((w: string) => w[0])
          .join("")
          .substring(0, 2)
          .toUpperCase()

        map.set(key, {
          dolgozoId: item.dolgozoId,
          dolgozoNev: item.dolgozoNev,
          initials,
          items: [],
        })
      }
      map.get(key)!.items.push(item)
    }

    return Array.from(map.values())
  }, [filteredItems])

  // Egyedi jóváhagyás
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

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, statusz: "jovahagyva" } : i))
      )
      router.refresh()
    } catch (err: any) {
      toast.error("Váratlan hiba történt: " + err.message)
    } finally {
      setLoadingItemId(null)
    }
  }

  // Dolgozó összes kérelmének jóváhagyása egyszerre
  const handleApproveAllForEmployee = async (group: EmployeeApprovalGroup) => {
    setIsApprovingAllId(group.dolgozoId)
    let successCount = 0

    for (const item of group.items) {
      try {
        if (item.category === "tavollet") {
          const res = await approveLeaveRequest(item.id)
          if (!res.error) successCount++
        } else if (item.category === "korrekcio") {
          const res = await handleAttendanceCorrectionApproval(item.id, "jovahagyva")
          if (!res.error) successCount++
        } else if (item.category === "tulora") {
          const res = await handleOvertimeApproval(item.id, "jovahagyva")
          if (!res.error) successCount++
        }
      } catch {
        // continue
      }
    }

    const approvedIds = new Set(group.items.map((i) => i.id))
    setItems((prev) =>
      prev.map((i) => (approvedIds.has(i.id) ? { ...i, statusz: "jovahagyva" } : i))
    )
    setIsApprovingAllId(null)
    toast.success(`${group.dolgozoNev}: ${successCount} kérelem jóváhagyva.`)
    router.refresh()
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
        const res = await rejectLeaveRequest(item.id, rejectReason.trim() || undefined)
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
        const res = await handleOvertimeApproval(item.id, "elutasitva", rejectReason.trim() || undefined)
        if (res.error) {
          toast.error("Hiba az elutasítás során: " + res.error)
          return
        }
        toast.info(`Túlóra elutasítva: ${item.dolgozoNev}`)
      }

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, statusz: "elutasitva", elutasitasOka: rejectReason.trim() || null }
            : i
        )
      )
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
        <CardHeader className="pb-3 border-b bg-card/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">
              {statusTab === "jovahagyasra_var"
                ? "Jóváhagyásra váró kérelmek"
                : statusTab === "jovahagyva"
                ? "Jóváhagyott kérelmek"
                : "Elutasított kérelmek"}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {statusTab === "jovahagyasra_var"
                ? "Távolléti, munkaidő korrekciós és túlóra elbírálások dolgozónként csoportosítva."
                : statusTab === "jovahagyva"
                ? "Korábban jóváhagyott és érvényesített kérelmek előzményei."
                : "Korábban elutasított kérelmek és rögzített indoklásaik."}
            </CardDescription>
          </div>

          {/* Státusz fülválasztó a jobb oldalon (egységesen a dolgozói nézettel) */}
          <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg border border-border/60 w-fit flex-wrap">
            <button
              type="button"
              onClick={() => setStatusTab("jovahagyasra_var")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                statusTab === "jovahagyasra_var"
                  ? "bg-card text-foreground shadow-2xs font-semibold border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Elbírálásra váró</span>
              {countPending > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-warning/20 text-warning">
                  {countPending}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setStatusTab("jovahagyva")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                statusTab === "jovahagyva"
                  ? "bg-card text-foreground shadow-2xs font-semibold border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Jóváhagyott</span>
              {countApproved > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-success/20 text-success">
                  {countApproved}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setStatusTab("elutasitva")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                statusTab === "elutasitva"
                  ? "bg-card text-foreground shadow-2xs font-semibold border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Elutasított</span>
              {countRejected > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/15 text-destructive">
                  {countRejected}
                </span>
              )}
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Felső vezérlősáv: Kereső és statisztikai összegzés */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Dolgozó Kereső Mező */}
            {(currentTabItems.length > 0 || employeeSearch) ? (
              <div className="relative max-w-sm flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder="Keresés dolgozó neve alapján..."
                  className="pl-9 pr-8 h-9 text-xs bg-background border-border shadow-2xs"
                />
                {employeeSearch && (
                  <button
                    type="button"
                    onClick={() => setEmployeeSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : <div />}

            {/* Statisztikai összegzés */}
            {groupedByEmployee.length > 0 && (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                <span>
                  <strong className="font-semibold text-foreground">{groupedByEmployee.length}</strong> dolgozó •{" "}
                  <strong className="font-semibold text-foreground">{filteredItems.length}</strong> kérelem
                </span>
              </div>
            )}
          </div>

          {/* Állapotok: üres, szűrés utáni üres, vagy csoportosított lista */}
          {currentTabItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border/60 bg-muted/15 space-y-1.5">
              <p className="text-sm font-semibold text-foreground">
                {statusTab === "jovahagyasra_var"
                  ? "Nincs függőben lévő kérelem"
                  : statusTab === "jovahagyva"
                  ? "Nincsenek korábban jóváhagyott kérelmek"
                  : "Nincsenek elutasított kérelmek"}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                {statusTab === "jovahagyasra_var"
                  ? "A beosztottaid nem nyújtottak be új szabadság, munkaidő korrekciós vagy túlóra kérelmet."
                  : statusTab === "jovahagyva"
                  ? "Még nem hagytál jóvá kérelmet a beosztottaid részére."
                  : "Egyetlen kérelem sem került elutasításra."}
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-2 rounded-xl border border-dashed border-border/60">
              <p className="text-sm font-semibold text-foreground">Nincs találat</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                A megadott névre ebben a kategóriában nincs egyetlen kérelem sem.
              </p>
              {employeeSearch && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEmployeeSearch("")}
                  className="text-xs text-primary mt-2 cursor-pointer"
                >
                  Keresés törlése
                </Button>
              )}
            </div>
          ) : (
            /* Dolgozói szinten csoportosított kérelmek */
            <div className="space-y-4">
              {groupedByEmployee.map((group) => {
                const isGroupLoading = isApprovingAllId === group.dolgozoId

                return (
                  <div
                    key={group.dolgozoId || group.dolgozoNev}
                    className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs"
                  >
                    {/* Dolgozói csoport fejléce */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-3 bg-muted/20 border-b border-border/70">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-border shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">
                            {group.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">
                            {group.dolgozoNev}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {group.items.length}{" "}
                            {statusTab === "jovahagyasra_var"
                              ? "elbírálásra váró kérelem"
                              : statusTab === "jovahagyva"
                              ? "jóváhagyott kérelem"
                              : "elutasított kérelem"}
                          </span>
                        </div>
                      </div>

                      {/* "Összes jóváhagyása" gomb csak az elbírálásra váró fülön, ha több mint 1 kérelem van */}
                      {statusTab === "jovahagyasra_var" && group.items.length > 1 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApproveAllForEmployee(group)}
                          disabled={isGroupLoading || loadingItemId !== null}
                          className="h-7 text-xs font-medium border-success/40 text-success hover:bg-success/10 cursor-pointer"
                        >
                          {isGroupLoading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                          Összes jóváhagyása ({group.items.length})
                        </Button>
                      )}
                    </div>

                    {/* Dolgozó kérelmei egymás alatt */}
                    <div className="divide-y divide-border/60">
                      {group.items.map((item) => {
                        const isCurrentLoading = loadingItemId === item.id || isGroupLoading

                        return (
                          <div
                            key={item.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 hover:bg-muted/10 transition-colors"
                          >
                            {/* Kérelem adatok */}
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
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

                                <span className="text-[11px] text-muted-foreground tabular-nums">
                                  Beküldve: {new Date(item.createdAt).toLocaleDateString("hu-HU")}
                                </span>
                              </div>

                              {/* Kérelem részletei */}
                              <div className="text-xs text-muted-foreground">
                                {item.category === "tavollet" && (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-foreground tabular-nums">
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
                                    <span className="font-semibold text-foreground">
                                      {item.korrekcioDatum}:
                                    </span>
                                    {item.eredetiBecsekkolas || item.eredetiKicsekkolas ? (
                                      <span className="line-through text-muted-foreground/80 tabular-nums">
                                        {formatIsoTime(item.eredetiBecsekkolas)} – {formatIsoTime(item.eredetiKicsekkolas)}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground/80 italic">Hiányzó jelenlét</span>
                                    )}
                                    <span className="text-muted-foreground">→</span>
                                    <span className="font-semibold text-warning-foreground dark:text-warning tabular-nums">
                                      Kért: {formatIsoTime(item.ujBecsekkolas)} – {formatIsoTime(item.ujKicsekkolas)}
                                    </span>
                                  </div>
                                )}

                                {item.category === "tulora" && (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-foreground tabular-nums">
                                      {formatMinutes(item.tuloraPerc)}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {item.tuloraTipus === "kifizetteti" ? "(Pénzbeli kifizetésként kéri)" : "(Szabadidőként kéri lecsúsztatni)"}
                                    </span>
                                  </div>
                                )}

                                {/* Indoklás idézet */}
                                {item.indoklas && (
                                  <div className="mt-1 text-[11px] text-muted-foreground italic">
                                    „{item.indoklas}”
                                  </div>
                                )}

                                {/* Elutasítás oka (ha elutasított kérelemről van szó) */}
                                {item.statusz === "elutasitva" && item.elutasitasOka && (
                                  <div className="mt-1 text-[11px] text-destructive font-medium">
                                    Elutasítás indoklása: {item.elutasitasOka}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Műveleti gombok vagy státusz jelvény */}
                            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                              {statusTab === "jovahagyasra_var" ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
                                    onClick={() => openRejectDialog(item)}
                                    disabled={isCurrentLoading}
                                  >
                                    Elutasít
                                  </Button>

                                  <Button
                                    size="sm"
                                    className="h-8 text-xs bg-success text-success-foreground hover:bg-success/90 cursor-pointer"
                                    onClick={() => handleApprove(item)}
                                    disabled={isCurrentLoading}
                                  >
                                    {loadingItemId === item.id && (
                                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                    )}
                                    Jóváhagy
                                  </Button>
                                </>
                              ) : statusTab === "jovahagyva" ? (
                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                  {item.category === "tavollet" && (
                                    <div className="flex items-center gap-1">
                                      <PdfViewerDialog
                                        url={`/api/hr/leave-pdf?tavolletId=${item.id}&preview=true`}
                                        title={`Távolléti Igazolás - ${item.dolgozoNev} (${TIPUS_LABELS[item.tavolletTipus || ""] || item.tavolletTipus || "Szabadság"})`}
                                        trigger={
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2 cursor-pointer"
                                            title="Igazolás megtekintése böngészőben"
                                          >
                                            <Eye className="w-3.5 h-3.5 text-primary" />
                                            <span>Megtekintés</span>
                                          </Button>
                                        }
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2 cursor-pointer"
                                        onClick={() =>
                                          window.open(`/api/hr/leave-pdf?tavolletId=${item.id}&download=true`, "_blank")
                                        }
                                        title="Igazolás letöltése (PDF)"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Letöltés</span>
                                      </Button>
                                    </div>
                                  )}
                                  {item.category === "korrekcio" && (
                                    <div className="flex items-center gap-1">
                                      <PdfViewerDialog
                                        url={`/api/hr/attendance-correction-pdf?korrekcioId=${item.id}&preview=true`}
                                        title={`Munkaidő Korrekciós Igazolás - ${item.dolgozoNev} (${item.korrekcioDatum})`}
                                        trigger={
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2 cursor-pointer"
                                            title="Igazolás megtekintése böngészőben"
                                          >
                                            <Eye className="w-3.5 h-3.5 text-primary" />
                                            <span>Megtekintés</span>
                                          </Button>
                                        }
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2 cursor-pointer"
                                        onClick={() =>
                                          window.open(`/api/hr/attendance-correction-pdf?korrekcioId=${item.id}&download=true`, "_blank")
                                        }
                                        title="Igazolás letöltése (PDF)"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Letöltés</span>
                                      </Button>
                                    </div>
                                  )}
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Jóváhagyva
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                                  <XCircle className="w-3.5 h-3.5" /> Elutasítva
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
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
