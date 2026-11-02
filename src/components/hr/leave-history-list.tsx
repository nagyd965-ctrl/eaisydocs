"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Clock, CheckCircle2, XCircle, Eye, Download, Loader2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { withdrawSelfServiceRequest } from "@/app/hr/self-service/actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
import { calculateWorkingDays } from "@/utils/hr/leave-calculator"
import { TableToolbar, FilterGroup } from "@/components/table-toolbar/table-toolbar"

const tipusLabel: Record<string, string> = {
  szabadsag: "Szabadság",
  fizetett_szabadsag: "Fizetett szabadság",
  beteg: "Betegszabadság",
  betegszabadsag: "Betegszabadság",
  home_office: "Home Office",
  rendkivuli: "Rendkívüli",
  fizetett: "Fizetett",
  fizetetlen: "Fizetés nélküli",
  apasan: "Apasági szabadság",
  tanulmanyi: "Tanulmányi szabadság",
  csusztatas: "Csúsztatás (Túlóra)",
}

export interface LeaveHistoryItem {
  id: string
  kezdete?: string
  vege?: string
  kezdet_datuma?: string
  veg_datuma?: string
  tipus: string
  statusz: string
  munkanapok_szama?: number
  indoklas?: string | null
  elutasitas_oka?: string | null
  elutasitas_indoklas?: string | null
  created_at?: string
  [key: string]: any
}

export interface AttendanceCorrectionItem {
  id: string
  datum: string
  eredeti_becsekkolas?: string | null
  eredeti_kicsekkolas?: string | null
  uj_becsekkolas: string
  uj_kicsekkolas: string
  indoklas: string
  statusz: string
  created_at?: string
  elutasitas_oka?: string | null
  elutasitas_indoklas?: string | null
  [key: string]: any
}

export interface OvertimeRequestItem {
  id: string
  datum?: string
  tipus: string
  perc: number
  megjegyzes?: string | null
  statusz: string
  created_at?: string
  elutasitas_oka?: string | null
  [key: string]: any
}

export interface LeaveHistoryListProps {
  leaves?: LeaveHistoryItem[]
  corrections?: AttendanceCorrectionItem[]
  overtimes?: OvertimeRequestItem[]
  holidays?: string[]
  transferredWorkdays?: string[]
}

function formatLocalDate(dateStr?: string | null): string {
  if (!dateStr) return "–"
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-")
    return `${y}. ${m}. ${d}.`
  }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString("hu-HU")
}

function formatTimeOnly(isoString?: string | null): string {
  if (!isoString) return "–"
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) {
      return isoString.length >= 5 ? isoString.substring(0, 5) : isoString
    }
    return d.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })
  } catch {
    return "–"
  }
}

interface UnifiedSelfServiceItem {
  id: string
  category: "tavollet" | "korrekcio" | "tulora"
  title: string
  categoryBadge: string
  dateText: string
  isoDateStart: string
  isoDateEnd: string
  detailText?: string
  indoklas?: string | null
  rejectionReason?: string | null
  statusz: string
  sortDate: number
  rawLeave?: LeaveHistoryItem
}

export function LeaveHistoryList({
  leaves = [],
  corrections = [],
  overtimes = [],
  holidays = [],
  transferredWorkdays = [],
}: LeaveHistoryListProps) {
  // 1. Egységes lista összeállítása
  const unifiedItems: UnifiedSelfServiceItem[] = [
    // Távollétek
    ...leaves.map((leave): UnifiedSelfServiceItem => {
      const startDateStr = leave.kezdet_datuma || leave.kezdete
      const endDateStr = leave.veg_datuma || leave.vege
      const startFormatted = formatLocalDate(startDateStr)
      const endFormatted = formatLocalDate(endDateStr)

      const workingDays =
        typeof leave.munkanapok_szama === "number" && leave.munkanapok_szama > 0
          ? leave.munkanapok_szama
          : startDateStr && endDateStr
            ? calculateWorkingDays(startDateStr, endDateStr, holidays, transferredWorkdays)
            : null

      return {
        id: leave.id,
        category: "tavollet",
        title: tipusLabel[leave.tipus] ?? String(leave.tipus).toUpperCase(),
        categoryBadge: "Távollét",
        dateText: `${startFormatted} – ${endFormatted}`,
        isoDateStart: (startDateStr || "").slice(0, 10),
        isoDateEnd: (endDateStr || startDateStr || "").slice(0, 10),
        detailText: workingDays !== null ? `${workingDays} munkanap` : undefined,
        indoklas: leave.indoklas,
        rejectionReason: leave.elutasitas_oka || leave.elutasitas_indoklas,
        statusz: leave.statusz,
        sortDate: new Date(leave.created_at || startDateStr || 0).getTime(),
        rawLeave: leave,
      }
    }),

    // Munkaidő korrekciók
    ...corrections.map((c): UnifiedSelfServiceItem => {
      const origIn = formatTimeOnly(c.eredeti_becsekkolas)
      const origOut = formatTimeOnly(c.eredeti_kicsekkolas)
      const newIn = formatTimeOnly(c.uj_becsekkolas)
      const newOut = formatTimeOnly(c.uj_kicsekkolas)
      const hasOriginal = c.eredeti_becsekkolas || c.eredeti_kicsekkolas

      const detailText = hasOriginal
        ? `Eredeti: ${origIn} – ${origOut} -> Kért idő: ${newIn} – ${newOut}`
        : `Kért idő: ${newIn} – ${newOut}`

      const iso = (c.datum || "").slice(0, 10)
      return {
        id: c.id,
        category: "korrekcio",
        title: "Munkaidő korrekció",
        categoryBadge: "Időkorrekció",
        dateText: formatLocalDate(c.datum),
        isoDateStart: iso,
        isoDateEnd: iso,
        detailText,
        indoklas: c.indoklas,
        rejectionReason: c.elutasitas_oka || c.elutasitas_indoklas,
        statusz: c.statusz,
        sortDate: new Date(c.created_at || c.datum || 0).getTime(),
      }
    }),

    // Túlóra kérelmek
    ...overtimes.map((o): UnifiedSelfServiceItem => {
      const actionLabel = o.tipus === "kiveszi_szabinak" ? "Csúsztatás (szabadságként)" : "Kifizetés"
      const hours = Math.floor((o.perc || 0) / 60)
      const mins = (o.perc || 0) % 60
      const duration = mins > 0 ? `${hours} óra ${mins} perc` : `${hours} óra`
      const iso = (o.datum || o.created_at || "").slice(0, 10)

      return {
        id: o.id,
        category: "tulora",
        title: "Túlóra kérelem",
        categoryBadge: "Túlóra",
        dateText: formatLocalDate(o.datum || o.created_at),
        isoDateStart: iso,
        isoDateEnd: iso,
        detailText: `${actionLabel} (${duration})`,
        indoklas: o.megjegyzes,
        rejectionReason: o.elutasitas_oka,
        statusz: o.statusz,
        sortDate: new Date(o.created_at || o.datum || 0).getTime(),
      }
    }),
  ].sort((a, b) => b.sortDate - a.sortDate)

  const router = useRouter()
  const [searchValue, setSearchValue] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    )
  }

  const toggleStatus = (statId: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(statId) ? prev.filter((id) => id !== statId) : [...prev, statId]
    )
  }

  const clearAllFilters = () => {
    setSelectedCategories([])
    setSelectedStatuses([])
    setDateFrom("")
    setDateTo("")
  }

  const filterGroups: FilterGroup[] = [
    {
      id: "category",
      title: "Kérelem típusa",
      options: [
        {
          id: "tavollet",
          label: "Távollét / Szabadság",
          checked: selectedCategories.includes("tavollet"),
        },
        {
          id: "korrekcio",
          label: "Időkorrekció",
          checked: selectedCategories.includes("korrekcio"),
        },
        {
          id: "tulora",
          label: "Túlóra / Csúsztatás",
          checked: selectedCategories.includes("tulora"),
        },
      ],
      onToggle: toggleCategory,
    },
    {
      id: "status",
      title: "Státusz",
      options: [
        {
          id: "jovahagyasra_var",
          label: "Folyamatban (Jóváhagyásra vár)",
          checked: selectedStatuses.includes("jovahagyasra_var"),
        },
        {
          id: "jovahagyva",
          label: "Jóváhagyott",
          checked: selectedStatuses.includes("jovahagyva"),
        },
        {
          id: "elutasitva",
          label: "Elutasított",
          checked: selectedStatuses.includes("elutasitva"),
        },
      ],
      onToggle: toggleStatus,
    },
  ]

  const activeFiltersCount = selectedCategories.length + selectedStatuses.length

  const handleWithdraw = async (item: UnifiedSelfServiceItem) => {
    const key = `${item.category}-${item.id}`
    setWithdrawingId(key)
    try {
      const res = await withdrawSelfServiceRequest(item.category, item.id)
      if (res?.error) {
        toast.error(res.error)
      } else {
        setRemovedIds((prev) => new Set(prev).add(key))
        toast.success("Kérelem sikeresen visszavonva.")
        router.refresh()
      }
    } catch {
      toast.error("Hiba történt a kérelem visszavonása során.")
    } finally {
      setWithdrawingId(null)
    }
  }

  const filteredItems = useMemo(() => {
    const q = searchValue.trim().toLowerCase()
    return unifiedItems.filter((item) => {
      if (removedIds.has(`${item.category}-${item.id}`)) return false

      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(item.category)
      ) {
        return false
      }

      if (
        selectedStatuses.length > 0 &&
        !selectedStatuses.includes(item.statusz)
      ) {
        return false
      }

      if (dateFrom && item.isoDateEnd && item.isoDateEnd < dateFrom) {
        return false
      }
      if (dateTo && item.isoDateStart && item.isoDateStart > dateTo) {
        return false
      }

      if (q) {
        const haystack = [
          item.title,
          item.categoryBadge,
          item.dateText,
          item.detailText,
          item.indoklas,
          item.rejectionReason,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [
    unifiedItems,
    removedIds,
    selectedCategories,
    selectedStatuses,
    dateFrom,
    dateTo,
    searchValue,
  ])

  if (unifiedItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Saját kérelmeim</CardTitle>
          <CardDescription>Még nem nyújtottál be kérelmet.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "jovahagyasra_var":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-warning/10 text-warning border border-warning/20">
            <Clock className="w-3 h-3" /> Folyamatban
          </span>
        )
      case "jovahagyva":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-success/10 text-success border border-success/20">
            <CheckCircle2 className="w-3 h-3" /> Jóváhagyva
          </span>
        )
      case "elutasitva":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-destructive/10 text-destructive border border-destructive/20">
            <XCircle className="w-3 h-3" /> Elutasítva
          </span>
        )
      case "tervezet":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border text-muted-foreground">
            Tervezett
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border text-muted-foreground">
            {status}
          </span>
        )
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3 border-b space-y-3">
        <div>
          <CardTitle className="text-base font-semibold">Saját kérelmeim</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Távolléti, munkaidő korrekciós és túlóra kérelmek előzményei ({filteredItems.length} / {unifiedItems.length} tétel)
          </CardDescription>
        </div>

        <TableToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Keresés típus, dátum vagy indoklás alapján..."
          dateRange={{
            from: dateFrom,
            to: dateTo,
            onFromChange: setDateFrom,
            onToChange: setDateTo,
          }}
          filterGroups={filterGroups}
          activeFiltersCount={activeFiltersCount}
          onClearFilters={clearAllFilters}
        />
      </CardHeader>
      <CardContent className="p-0">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <p className="text-sm font-semibold text-foreground">
              Nincs a szűrésnek megfelelő kérelem
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Módosítsd a keresési kifejezést vagy töröld az aktív szűrőfeltételeket.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map((item) => (
            <div
              key={`${item.category}-${item.id}`}
              className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex flex-col gap-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    {item.title}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium bg-muted text-muted-foreground border">
                    {item.categoryBadge}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-medium text-foreground/90 tabular-nums">
                    {item.dateText}
                  </span>
                  {item.detailText && (
                    <span className="text-muted-foreground font-normal">
                      • {item.detailText}
                    </span>
                  )}
                </div>

                {item.indoklas && (
                  <p className="text-[11px] text-muted-foreground/85 italic mt-0.5">
                    Indoklás: {item.indoklas}
                  </p>
                )}

                {item.rejectionReason && (
                  <p className="text-[11px] text-destructive font-medium mt-0.5">
                    Elutasítás indoklása: {item.rejectionReason}
                  </p>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {item.statusz === "jovahagyasra_var" && !removedIds.has(`${item.category}-${item.id}`) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={withdrawingId === `${item.category}-${item.id}`}
                    onClick={() => handleWithdraw(item)}
                    className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5 px-2.5 cursor-pointer"
                  >
                    {withdrawingId === `${item.category}-${item.id}` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Visszavonás</span>
                  </Button>
                )}
                {item.category === "tavollet" && item.statusz === "jovahagyva" && item.rawLeave && (
                  <div className="flex items-center gap-1">
                    <PdfViewerDialog
                      url={`/api/hr/leave-pdf?tavolletId=${item.rawLeave.id}&preview=true`}
                      title={`Távolléti Igazolás - ${item.title}`}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5 px-2 cursor-pointer"
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
                      className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5 px-2 cursor-pointer"
                      onClick={() =>
                        window.open(`/api/hr/leave-pdf?tavolletId=${item.rawLeave?.id}&download=true`, "_blank")
                      }
                      title="Igazolás letöltése (PDF)"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Letöltés</span>
                    </Button>
                  </div>
                )}
                {item.category === "korrekcio" && item.statusz === "jovahagyva" && (
                  <div className="flex items-center gap-1">
                    <PdfViewerDialog
                      url={`/api/hr/attendance-correction-pdf?korrekcioId=${item.id}&preview=true`}
                      title={`Munkaidő Korrekciós Igazolás - ${item.dateText}`}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5 px-2 cursor-pointer"
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
                      className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5 px-2 cursor-pointer"
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
                {getStatusDisplay(item.statusz)}
              </div>
            </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
