"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog"
import { 
  TableToolbar, 
  TableColumnOption, 
  FilterGroup, 
  DateRangeFilter 
} from "@/components/table-toolbar/table-toolbar"
import { KpiCard } from "@/components/kpi-card"
import { 
  Mail, 
  MessageSquare, 
  RefreshCw, 
  Download, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle2, 
  Clock
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { getHrNotificationAuditLogs, type HrNotificationAuditLogItem } from "./actions"

function renderStatusBadge(status: string, hibaOka?: string | null) {
  if (status === "sikeres") {
    return (
      <Badge variant="outline" className="border-success/30 bg-success/10 text-success gap-1 text-[11px] font-normal">
        <CheckCircle2 className="h-3 w-3" /> Sikeres
      </Badge>
    )
  }
  if (status === "hibas") {
    return (
      <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive gap-1 text-[11px] font-normal" title={hibaOka || "Ismeretlen hiba"}>
        <AlertCircle className="h-3 w-3" /> Hibás
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning gap-1 text-[11px] font-normal">
      <Clock className="h-3 w-3" /> Folyamatban
    </Badge>
  )
}

interface HrNotificationAuditTabProps {
  companyId?: string
  companyName?: string
}

const HR_CATEGORY_LABELS: Record<string, { label: string; badgeClass: string }> = {
  recruitment: { label: "Toborzás & Interjú", badgeClass: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  leave: { label: "Szabadság & Távollét", badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  health: { label: "Egészségügy & Orvosi", badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  contract: { label: "Munkaviszony & Szerződés", badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  system: { label: "Rendszer", badgeClass: "border-muted-foreground/30 bg-muted/40 text-muted-foreground" }
}

export function HrNotificationAuditTab({ companyId, companyName }: HrNotificationAuditTabProps) {
  const [logs, setLogs] = useState<HrNotificationAuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<HrNotificationAuditLogItem | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // ── Szűrési állapotok ──
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [activePreset, setActivePreset] = useState<"7" | "30" | null>(null)

  // ── Lapozás ──
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // ── Oszlopválasztó ──
  const [columns, setColumns] = useState<TableColumnOption[]>([
    { id: "mikor", label: "Dátum és Időpont", isVisible: true },
    { id: "csatorna", label: "Csatorna", isVisible: true },
    { id: "cimzett", label: "Címzett", isVisible: true },
    { id: "targy", label: "Tárgy", isVisible: true },
    { id: "kategoria", label: "HR Kategória", isVisible: true },
    { id: "kivato", label: "Kiváltó", isVisible: true },
    { id: "statusz", label: "Státusz", isVisible: true },
    { id: "muvelet", label: "Művelet", isVisible: true }
  ])

  // ── Adatok betöltése ──
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getHrNotificationAuditLogs(companyId)
      if (res.error) {
        toast.error(res.error)
      } else {
        setLogs(res.logs || [])
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Nem sikerült betölteni a HR kiküldési naplót."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // ── KPI Statisztikák ──
  const stats = useMemo(() => {
    const total = logs.length
    const successful = logs.filter(l => l.statusz === "sikeres").length
    const failed = logs.filter(l => l.statusz === "hibas").length
    const uniqueRecipients = new Set(logs.map(l => l.cimzett_email).filter(Boolean)).size
    const successRate = total > 0 ? Math.round((successful / total) * 100) : 0

    return {
      total,
      successful,
      failed,
      uniqueRecipients,
      successRate
    }
  }, [logs])

  // ── Szűrt lista ──
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Keresés
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchEmail = (log.cimzett_email || "").toLowerCase().includes(q)
        const matchSubject = (log.targy || "").toLowerCase().includes(q)
        const matchError = (log.hiba_oka || "").toLowerCase().includes(q)
        const matchUser = (log.kivato_nev || "").toLowerCase().includes(q)
        const matchContent = (log.uzenet || "").toLowerCase().includes(q)

        if (!matchEmail && !matchSubject && !matchError && !matchUser && !matchContent) {
          return false
        }
      }

      // 2. Csatorna
      if (selectedChannels.length > 0) {
        if (!selectedChannels.includes(log.csatorna)) return false
      }

      // 3. Státusz
      if (selectedStatuses.length > 0) {
        if (!selectedStatuses.includes(log.statusz)) return false
      }

      // 4. Kategória
      if (selectedCategories.length > 0) {
        if (!selectedCategories.includes(log.kategoria)) return false
      }

      // 5. Dátumtól
      if (dateFrom) {
        const fromDate = new Date(dateFrom)
        fromDate.setHours(0, 0, 0, 0)
        const logDate = new Date(log.mikor)
        if (logDate < fromDate) return false
      }

      // 6. Dátumig
      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        const logDate = new Date(log.mikor)
        if (logDate > toDate) return false
      }

      return true
    })
  }, [logs, searchQuery, selectedChannels, selectedStatuses, selectedCategories, dateFrom, dateTo])

  // ── Lapozás számítás ──
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize))
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredLogs.slice(start, start + pageSize)
  }, [filteredLogs, currentPage, pageSize])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  // ── Szűrő csoportok a Popoverhez ──
  const filterGroups: FilterGroup[] = useMemo(() => [
    {
      id: "csatorna",
      title: "Kiküldési Csatorna",
      options: [
        { id: "email", label: "E-mail értesítés", checked: selectedChannels.includes("email") },
        { id: "sms", label: "SMS üzenet", checked: selectedChannels.includes("sms") }
      ],
      onToggle: (id: string) => {
        setSelectedChannels(prev => 
          prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        )
        setCurrentPage(1)
      }
    },
    {
      id: "statusz",
      title: "Kézbesítési Státusz",
      options: [
        { id: "sikeres", label: "Sikeres kézbesítés", checked: selectedStatuses.includes("sikeres") },
        { id: "hibas", label: "Meghiúsult / Hiba", checked: selectedStatuses.includes("hibas") },
        { id: "folyamatban", label: "Folyamatban", checked: selectedStatuses.includes("folyamatban") }
      ],
      onToggle: (id: string) => {
        setSelectedStatuses(prev => 
          prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        )
        setCurrentPage(1)
      }
    },
    {
      id: "kategoria",
      title: "HR Kategória",
      options: [
        { id: "recruitment", label: "Toborzás & Interjú", checked: selectedCategories.includes("recruitment") },
        { id: "leave", label: "Szabadság & Távollét", checked: selectedCategories.includes("leave") },
        { id: "health", label: "Egészségügy & Orvosi", checked: selectedCategories.includes("health") },
        { id: "contract", label: "Munkaviszony & Szerződés", checked: selectedCategories.includes("contract") },
        { id: "system", label: "Rendszer", checked: selectedCategories.includes("system") }
      ],
      onToggle: (id: string) => {
        setSelectedCategories(prev => 
          prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
        )
        setCurrentPage(1)
      }
    }
  ], [selectedChannels, selectedStatuses, selectedCategories])

  // ── Dátumtartomány szűrő a Toolbarhoz ──
  const dateRangeFilter: DateRangeFilter = useMemo(() => ({
    from: dateFrom,
    to: dateTo,
    onFromChange: (val: string) => {
      setDateFrom(val)
      setActivePreset(null)
      setCurrentPage(1)
    },
    onToChange: (val: string) => {
      setDateTo(val)
      setActivePreset(null)
      setCurrentPage(1)
    },
    onClear: () => {
      setDateFrom("")
      setDateTo("")
      setActivePreset(null)
      setCurrentPage(1)
    }
  }), [dateFrom, dateTo])

  const handlePresetSelect = (preset: "all" | "today" | "7" | "30") => {
    const now = new Date()
    if (preset === "all") {
      setDateFrom("")
      setDateTo("")
      setActivePreset(null)
    } else if (preset === "today") {
      const todayStr = format(now, "yyyy-MM-dd")
      setDateFrom(todayStr)
      setDateTo(todayStr)
      setActivePreset(null)
    } else if (preset === "7") {
      const past = new Date()
      past.setDate(now.getDate() - 7)
      setDateFrom(format(past, "yyyy-MM-dd"))
      setDateTo(format(now, "yyyy-MM-dd"))
      setActivePreset("7")
    } else if (preset === "30") {
      const past = new Date()
      past.setDate(now.getDate() - 30)
      setDateFrom(format(past, "yyyy-MM-dd"))
      setDateTo(format(now, "yyyy-MM-dd"))
      setActivePreset("30")
    }
    setCurrentPage(1)
  }

  const handleToggleColumn = (id: string) => {
    setColumns(prev => prev.map(c => (c.id === id ? { ...c, isVisible: !c.isVisible } : c)))
  }

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (selectedChannels.length > 0) count++
    if (selectedStatuses.length > 0) count++
    if (selectedCategories.length > 0) count++
    if (dateFrom || dateTo) count++
    return count
  }, [selectedChannels, selectedStatuses, selectedCategories, dateFrom, dateTo])

  const handleResetFilters = () => {
    setSearchQuery("")
    setSelectedChannels([])
    setSelectedStatuses([])
    setSelectedCategories([])
    setDateFrom("")
    setDateTo("")
    setActivePreset(null)
    setCurrentPage(1)
  }

  // ── CSV Exportálás ──
  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      toast.error("Nincs exportálható adat a megadott szűrési feltételekkel.")
      return
    }

    try {
      const headers = [
        "Időpont",
        "Csatorna",
        "Címzett",
        "Tárgy",
        "Kategória",
        "Kiváltó munkatárs",
        "Kézbesítési Státusz",
        "Hiba oka"
      ]

      const rows = filteredLogs.map(log => [
        `"${format(new Date(log.mikor), "yyyy.MM.dd. HH:mm:ss")}"`,
        `"${log.csatorna === "email" ? "E-mail" : "SMS"}"`,
        `"${log.cimzett_email || ""}"`,
        `"${(log.targy || "").replace(/"/g, '""')}"`,
        `"${HR_CATEGORY_LABELS[log.kategoria]?.label || log.kategoria}"`,
        `"${(log.kivato_nev || "").replace(/"/g, '""')}"`,
        `"${log.statusz}"`,
        `"${(log.hiba_oka || "").replace(/"/g, '""')}"`
      ])

      const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `hr_kikuldesi_naplo_${format(new Date(), "yyyyMMdd_HHmm")}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("CSV export sikeresen letöltve", {
        description: `${filteredLogs.length} sor exportálva.`
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ismeretlen hiba"
      toast.error("Hiba a CSV exportálás során: " + msg)
    }
  }

  const isColVisible = (id: string) => columns.find(c => c.id === id)?.isVisible ?? true

  return (
    <div className="space-y-6">
      {/* ── Kanonikus KPI Statisztikai Kártyák (Linear Flat Grid - ADR A-029) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Összes HR Értesítés"
          value={stats.total}
          sub={companyName ? `${companyName} HR értesítései` : "Rendszer által kiküldött HR e-mailek és SMS-ek"}
        />
        <KpiCard
          label="Sikeres Kézbesítés"
          value={stats.successful}
          highlight={stats.successful > 0}
          sub={`${stats.successRate}% kézbesítési arány`}
        />
        <KpiCard
          label="Meghiúsult / Hibás"
          value={stats.failed}
          highlight={stats.failed > 0}
          sub="SMTP vagy szolgáltatói hiba"
        />
        <KpiCard
          label="Érintett Címzettek"
          value={stats.uniqueRecipients}
          sub="Jelöltek, munkavállalók és vezetők"
        />
      </div>

      {/* ── Kanonikus TableToolbar és Szűrő Sáv ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1">
            <TableToolbar
              searchPlaceholder="Keresés címzett, tárgy vagy hiba alapján..."
              searchValue={searchQuery}
              onSearchChange={val => {
                setSearchQuery(val)
                setCurrentPage(1)
              }}
              filterGroups={filterGroups}
              dateRange={dateRangeFilter}
              activeFiltersCount={activeFiltersCount}
              onClearFilters={handleResetFilters}
              columns={columns}
              onToggleColumn={handleToggleColumn}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={loading}
              className="gap-2 h-9 border-border/80"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
              Frissítés
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={loading || filteredLogs.length === 0}
              className="gap-2 h-9 border-border/80"
            >
              <Download className="w-3.5 h-3.5" />
              CSV Export
            </Button>
          </div>
        </div>

        {/* Gyors dátumszűrő gombok */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <Calendar className="w-3.5 h-3.5 mr-1" />
          <span>Időszak:</span>
          <button
            type="button"
            onClick={() => handlePresetSelect("all")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              !dateFrom && !dateTo ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-foreground"
            }`}
          >
            Mind
          </button>
          <button
            type="button"
            onClick={() => handlePresetSelect("today")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              dateFrom && dateFrom === dateTo && dateFrom === format(new Date(), "yyyy-MM-dd")
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-foreground"
            }`}
          >
            Ma
          </button>
          <button
            type="button"
            onClick={() => handlePresetSelect("7")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activePreset === "7" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-foreground"
            }`}
          >
            Elmúlt 7 nap
          </button>
          <button
            type="button"
            onClick={() => handlePresetSelect("30")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activePreset === "30" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-foreground"
            }`}
          >
            Elmúlt 30 nap
          </button>
        </div>
      </div>

      {/* ── Táblázat ── */}
      <Card className="border border-border shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                {isColVisible("mikor") && <TableHead className="w-[170px] text-xs font-semibold">Dátum és Időpont</TableHead>}
                {isColVisible("csatorna") && <TableHead className="w-[100px] text-xs font-semibold">Csatorna</TableHead>}
                {isColVisible("cimzett") && <TableHead className="w-[200px] text-xs font-semibold">Címzett</TableHead>}
                {isColVisible("targy") && <TableHead className="text-xs font-semibold">Tárgy / Értesítés</TableHead>}
                {isColVisible("kategoria") && <TableHead className="w-[180px] text-xs font-semibold">HR Kategória</TableHead>}
                {isColVisible("kivato") && <TableHead className="w-[160px] text-xs font-semibold">Kiváltó</TableHead>}
                {isColVisible("statusz") && <TableHead className="w-[120px] text-xs font-semibold">Státusz</TableHead>}
                {isColVisible("muvelet") && <TableHead className="w-[90px] text-right text-xs font-semibold">Művelet</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell colSpan={8} className="py-4">
                      <div className="h-5 bg-muted rounded w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                    Nem található a megadott szűrési feltételeknek megfelelő HR értesítés.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map(log => {
                  const catInfo = HR_CATEGORY_LABELS[log.kategoria] || HR_CATEGORY_LABELS.system
                  return (
                    <TableRow 
                      key={log.id} 
                      className="group cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setSelectedLog(log)
                        setDetailModalOpen(true)
                      }}
                    >
                      {isColVisible("mikor") && (
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.mikor), "yyyy.MM.dd. HH:mm:ss")}
                        </TableCell>
                      )}
                      {isColVisible("csatorna") && (
                        <TableCell>
                          <Badge variant="outline" className="gap-1 font-normal text-xs py-0.5 border-border">
                            {log.csatorna === "email" ? (
                              <>
                                <Mail className="h-3 w-3 text-blue-500" />
                                <span>E-mail</span>
                              </>
                            ) : (
                              <>
                                <MessageSquare className="h-3 w-3 text-emerald-500" />
                                <span>SMS</span>
                              </>
                            )}
                          </Badge>
                        </TableCell>
                      )}
                      {isColVisible("cimzett") && (
                        <TableCell className="text-xs font-medium text-foreground truncate max-w-[200px]" title={log.cimzett_email}>
                          {log.cimzett_email}
                        </TableCell>
                      )}
                      {isColVisible("targy") && (
                        <TableCell className="text-xs">
                          <span className="font-semibold text-foreground block truncate max-w-[340px]" title={log.targy}>
                            {log.targy}
                          </span>
                        </TableCell>
                      )}
                      {isColVisible("kategoria") && (
                        <TableCell>
                          <Badge variant="outline" className={`text-[11px] font-normal py-0.5 ${catInfo.badgeClass}`}>
                            {catInfo.label}
                          </Badge>
                        </TableCell>
                      )}
                      {isColVisible("kivato") && (
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[160px]" title={log.kivato_nev || ""}>
                          {log.kivato_nev || "Rendszer"}
                        </TableCell>
                      )}
                      {isColVisible("statusz") && (
                        <TableCell>
                          {renderStatusBadge(log.statusz, log.hiba_oka)}
                        </TableCell>
                      )}
                      {isColVisible("muvelet") && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs opacity-80 group-hover:opacity-100 hover:bg-accent"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedLog(log)
                              setDetailModalOpen(true)
                            }}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Részletek
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Lapozó sáv ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border text-xs text-muted-foreground bg-muted/20">
          <div className="flex items-center gap-2">
            <span>Sorok oldalanként:</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="h-8 px-2 rounded-md border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="ml-2">
              Összesen <b>{filteredLogs.length}</b> HR értesítés
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span>
              Oldal <b>{currentPage}</b> / <b>{totalPages}</b>
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Részletes Üzenet Betekintő Modal (Dialog) ── */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-4xl lg:max-w-5xl xl:max-w-6xl w-[96vw] max-h-[94vh] flex flex-col p-6 overflow-hidden">
          {selectedLog && (
            <>
              <DialogHeader className="pb-3 border-b border-border shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <DialogTitle className="text-base font-semibold truncate pr-6" title={selectedLog.targy || "Értesítés Részletei"}>
                    {selectedLog.targy || "Értesítés Részletei"}
                  </DialogTitle>
                  <div className="flex items-center gap-2 shrink-0">
                    {renderStatusBadge(selectedLog.statusz, selectedLog.hiba_oka)}
                  </div>
                </div>

                {/* Kompakt egy-soros metaadat sáv */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-muted-foreground pt-1.5">
                  <div>
                    <span>Kiküldve: </span>
                    <span className="font-mono text-foreground font-medium">
                      {format(new Date(selectedLog.mikor), "yyyy.MM.dd. HH:mm:ss")}
                    </span>
                  </div>
                  <div>
                    <span>Csatorna: </span>
                    <span className="font-medium text-foreground uppercase">
                      {selectedLog.csatorna}
                    </span>
                  </div>
                  <div>
                    <span>Címzett: </span>
                    <span className="font-mono text-foreground font-medium">
                      {selectedLog.cimzett_email}
                    </span>
                  </div>
                  <div>
                    <span>Kiváltó: </span>
                    <span className="text-foreground font-medium">
                      {selectedLog.kivato_nev || "Rendszer"}
                    </span>
                  </div>
                  <div>
                    <span>HR Kategória: </span>
                    <span className="text-foreground font-medium">
                      {HR_CATEGORY_LABELS[selectedLog.kategoria]?.label || selectedLog.kategoria}
                    </span>
                  </div>
                </div>

                <DialogDescription className="sr-only">
                  Kiküldött HR értesítés technikai adatai és üzenettartalma
                </DialogDescription>
              </DialogHeader>

              {/* Hiba figyelmeztető doboz (ha hibás) */}
              {selectedLog.statusz === "hibas" && selectedLog.hiba_oka && (
                <div className="mt-3 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs shrink-0 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Kézbesítési Hiba Oka:</span>
                    <p className="font-mono text-[11px] whitespace-pre-wrap mt-0.5">
                      {selectedLog.hiba_oka}
                    </p>
                  </div>
                </div>
              )}

              {/* Teljes üzenettörzs – természetes magasság, egyetlen tiszta görgetősáv */}
              <div className="flex-1 overflow-y-auto mt-3 p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-900/60 rounded-lg border border-border/50 flex justify-center">
                {selectedLog.uzenet ? (
                  selectedLog.uzenet.includes("<") ? (
                    <div 
                      className="w-full max-w-[640px] shadow-sm rounded-xl overflow-hidden bg-white text-slate-800 [&_*]:box-border"
                      dangerouslySetInnerHTML={{ __html: selectedLog.uzenet }}
                    />
                  ) : (
                    <div className="max-w-xl w-full bg-background p-5 rounded-lg border border-border/80 shadow-xs font-mono text-sm whitespace-pre-wrap text-foreground">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3 pb-2 border-b border-border/50">
                        <MessageSquare className="w-3.5 h-3.5 text-primary" />
                        <span>SMS Üzenet Szövege</span>
                      </div>
                      {selectedLog.uzenet}
                    </div>
                  )
                ) : (
                  <div className="p-12 text-sm text-muted-foreground text-center italic">
                    Nincs rögzített üzenettörzs ehhez a HR értesítéshez.
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
