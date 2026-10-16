"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
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
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Download, 
  FileText, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Send,
  Eye
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { getNotificationAuditLogs, type NotificationAuditLogItem } from "./actions"

interface NotificationAuditTabProps {
  companyId?: string
  companyName?: string
}

export function NotificationAuditTab({ companyId, companyName }: NotificationAuditTabProps) {
  const [logs, setLogs] = useState<NotificationAuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<NotificationAuditLogItem | null>(null)
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
    { id: "ugyirat", label: "Kapcsolódó Ügyirat", isVisible: true },
    { id: "kivato", label: "Kiváltó", isVisible: true },
    { id: "statusz", label: "Státusz", isVisible: true },
    { id: "muvelet", label: "Részletek", isVisible: true }
  ])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getNotificationAuditLogs(companyId)
      if (res.error) {
        toast.error(res.error)
      } else {
        setLogs(res.logs || [])
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Nem sikerült betölteni a kiküldési naplót."
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

    return { total, successful, failed, uniqueRecipients }
  }, [logs])

  // ── Szűrt lista ──
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Kereső
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchCimzett = log.cimzett_email?.toLowerCase().includes(q)
        const matchTargy = log.targy?.toLowerCase().includes(q)
        const matchUzenet = log.uzenet?.toLowerCase().includes(q)
        const matchUgyirat = log.ugyirat_szam?.toLowerCase().includes(q)
        const matchHiba = log.hiba_oka?.toLowerCase().includes(q)
        const matchKivato = log.kivato_nev?.toLowerCase().includes(q)

        if (!matchCimzett && !matchTargy && !matchUzenet && !matchUgyirat && !matchHiba && !matchKivato) {
          return false
        }
      }

      // 2. Csatorna szűrő
      if (selectedChannels.length > 0) {
        if (!selectedChannels.includes(log.csatorna)) return false
      }

      // 3. Státusz szűrő
      if (selectedStatuses.length > 0) {
        if (!selectedStatuses.includes(log.statusz)) return false
      }

      // 4. Kategória szűrő
      if (selectedCategories.length > 0) {
        if (!selectedCategories.includes(log.kategoria)) return false
      }

      // 5. Dátum szűrő
      if (dateFrom) {
        const logDate = log.mikor ? log.mikor.slice(0, 10) : ""
        if (logDate < dateFrom) return false
      }
      if (dateTo) {
        const logDate = log.mikor ? log.mikor.slice(0, 10) : ""
        if (logDate > dateTo) return false
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

  // ── Szűrőcsoportok a TableToolbar-hoz ──
  const filterGroups: FilterGroup[] = useMemo(() => [
    {
      id: "csatorna",
      title: "Csatorna",
      options: [
        { id: "email", label: `E-mail (${logs.filter(l => l.csatorna === "email").length})`, checked: selectedChannels.includes("email") },
        { id: "sms", label: `SMS (${logs.filter(l => l.csatorna === "sms").length})`, checked: selectedChannels.includes("sms") }
      ],
      onToggle: (id: string) => {
        setSelectedChannels(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
        setCurrentPage(1)
      }
    },
    {
      id: "statusz",
      title: "Kézbesítési Státusz",
      options: [
        { id: "sikeres", label: `Sikeres (${logs.filter(l => l.statusz === "sikeres").length})`, checked: selectedStatuses.includes("sikeres") },
        { id: "hibas", label: `Hibás / Meghiúsult (${logs.filter(l => l.statusz === "hibas").length})`, checked: selectedStatuses.includes("hibas") },
        { id: "folyamatban", label: `Folyamatban (${logs.filter(l => l.statusz === "folyamatban").length})`, checked: selectedStatuses.includes("folyamatban") }
      ],
      onToggle: (id: string) => {
        setSelectedStatuses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
        setCurrentPage(1)
      }
    },
    {
      id: "kategoria",
      title: "Téma / Kategória",
      options: [
        { id: "docs", label: `Iratkezelés (Docs) (${logs.filter(l => l.kategoria === "docs").length})`, checked: selectedCategories.includes("docs") },
        { id: "hr", label: `HR & Toborzás (${logs.filter(l => l.kategoria === "hr").length})`, checked: selectedCategories.includes("hr") },
        { id: "system", label: `Rendszer & Fiók (${logs.filter(l => l.kategoria === "system").length})`, checked: selectedCategories.includes("system") }
      ],
      onToggle: (id: string) => {
        setSelectedCategories(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
        setCurrentPage(1)
      }
    }
  ], [logs, selectedChannels, selectedStatuses, selectedCategories])

  const dateRange: DateRangeFilter = {
    from: dateFrom,
    to: dateTo,
    onFromChange: val => {
      setDateFrom(val)
      setActivePreset(null)
      setCurrentPage(1)
    },
    onToChange: val => {
      setDateTo(val)
      setActivePreset(null)
      setCurrentPage(1)
    }
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

  const handleToggleColumn = (colId: string) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, isVisible: !c.isVisible } : c))
  }

  const isColVisible = (colId: string) => {
    const c = columns.find(col => col.id === colId)
    return c ? c.isVisible : true
  }

  // ── CSV Export ──
  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      toast.warning("Nincs exportálható adat a megadott szűrőkkel.")
      return
    }

    const headers = [
      "Dátum és Időpont",
      "Csatorna",
      "Címzett",
      "Tárgy",
      "Kapcsolódó Ügyirat",
      "Kiváltó Felhasználó",
      "Státusz",
      "Hiba Oka"
    ]

    const rows = filteredLogs.map(log => {
      return [
        log.mikor ? format(new Date(log.mikor), "yyyy-MM-dd HH:mm:ss") : "",
        log.csatorna === "sms" ? "SMS" : "E-mail",
        log.cimzett_email || "",
        log.targy || "",
        log.ugyirat_szam || "",
        log.kivato_nev || "",
        log.statusz || "",
        log.hiba_oka || ""
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(";")
    })

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const compName = companyName ? companyName.replace(/[^a-zA-Z0-9]/g, "_") : "ceg"
    link.setAttribute("href", url)
    link.setAttribute("download", `eaisydocs_kikuldesi_naplo_${compName}_${format(new Date(), "yyyyMMdd_HHmm")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success("Kiküldési napló sikeresen exportálva CSV formátumban.")
  }

  const handleOpenDetails = (log: NotificationAuditLogItem) => {
    setSelectedLog(log)
    setDetailModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* ── KPI Kártyák (Linear Flat Grid - ADR A-029) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Összes Kiküldött Értesítés"
          value={stats.total}
          sub="Rendszer által elküldött e-mailek és SMS-ek"
        />
        <KpiCard
          label="Sikeres Kézbesítés"
          value={stats.successful}
          highlight={stats.successful > 0}
          sub="Sikeresen célba ért küldemények"
        />
        <KpiCard
          label="Meghiúsult / Hibás"
          value={stats.failed}
          highlight={stats.failed > 0}
          sub="SMTP vagy szolgáltatói hiba"
        />
        <KpiCard
          label="Címzettek Száma"
          value={stats.uniqueRecipients}
          sub="Egyedi munkatárs vagy partner"
        />
      </div>

      {/* ── Toolbar & Szűrősáv ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1">
            <TableToolbar
              searchPlaceholder="Keresés címzett, tárgy, iktatószám vagy hiba alapján..."
              searchValue={searchQuery}
              onSearchChange={val => {
                setSearchQuery(val)
                setCurrentPage(1)
              }}
              dateRange={dateRange}
              filterGroups={filterGroups}
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
              className="gap-2 h-9"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
              Frissítés
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={loading || filteredLogs.length === 0}
              className="gap-2 h-9"
            >
              <Download className="w-4 h-4" />
              CSV Export
            </Button>
          </div>
        </div>

        {/* Gyors időszaki szűrőpillék */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium mr-1">
            <Calendar className="w-3 h-3" /> Időszak:
          </span>
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); setActivePreset(null); setCurrentPage(1) }}
            className={`text-xs px-2.5 py-0.5 rounded-md transition-colors ${
              !dateFrom && !dateTo
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Mind
          </button>
          <button
            onClick={() => {
              const today = new Date().toISOString().slice(0, 10)
              setDateFrom(today)
              setDateTo(today)
              setActivePreset(null)
              setCurrentPage(1)
            }}
            className={`text-xs px-2.5 py-0.5 rounded-md transition-colors ${
              dateFrom === new Date().toISOString().slice(0, 10) && dateTo === new Date().toISOString().slice(0, 10)
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Ma
          </button>
          <button
            onClick={() => {
              const end = new Date().toISOString().slice(0, 10)
              const start = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
              setDateFrom(start)
              setDateTo(end)
              setActivePreset("7")
              setCurrentPage(1)
            }}
            className={`text-xs px-2.5 py-0.5 rounded-md transition-colors ${
              activePreset === "7"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Elmúlt 7 nap
          </button>
          <button
            onClick={() => {
              const end = new Date().toISOString().slice(0, 10)
              const start = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
              setDateFrom(start)
              setDateTo(end)
              setActivePreset("30")
              setCurrentPage(1)
            }}
            className={`text-xs px-2.5 py-0.5 rounded-md transition-colors ${
              activePreset === "30"
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Elmúlt 30 nap
          </button>
        </div>
      </div>

      {/* ── Kiküldési Napló Táblázat ── */}
      <div className="rounded-md border border-border/60 overflow-hidden bg-card">
        <Table className="compact-table">
          <TableHeader>
            <TableRow>
              {isColVisible("mikor") && <TableHead className="w-[170px]">Dátum és Időpont</TableHead>}
              {isColVisible("csatorna") && <TableHead className="w-[100px]">Csatorna</TableHead>}
              {isColVisible("cimzett") && <TableHead className="min-w-[200px]">Címzett</TableHead>}
              {isColVisible("targy") && <TableHead className="min-w-[260px]">Tárgy / Értesítés</TableHead>}
              {isColVisible("ugyirat") && <TableHead className="w-[180px]">Kapcsolódó Ügyirat</TableHead>}
              {isColVisible("kivato") && <TableHead className="w-[150px]">Kiváltó</TableHead>}
              {isColVisible("statusz") && <TableHead className="w-[120px]">Státusz</TableHead>}
              {isColVisible("muvelet") && <TableHead className="w-[90px] text-right">Művelet</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                  Kiküldési napló betöltése folyamatban...
                </TableCell>
              </TableRow>
            ) : paginatedLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  Nem található a megadott szűrési feltételeknek megfelelő értesítés.
                </TableCell>
              </TableRow>
            ) : (
              paginatedLogs.map(log => (
                <TableRow key={log.id} className="hover:bg-muted/40 transition-colors">
                  {isColVisible("mikor") && (
                    <TableCell className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                      {log.mikor ? format(new Date(log.mikor), "yyyy. MM. dd. HH:mm:ss") : "—"}
                    </TableCell>
                  )}
                  {isColVisible("csatorna") && (
                    <TableCell>
                      {log.csatorna === "sms" ? (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1 text-[11px] font-normal">
                          <MessageSquare className="h-3 w-3" /> SMS
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1 text-[11px] font-normal">
                          <Mail className="h-3 w-3" /> E-mail
                        </Badge>
                      )}
                    </TableCell>
                  )}
                  {isColVisible("cimzett") && (
                    <TableCell className="font-mono text-xs text-foreground truncate max-w-[220px]" title={log.cimzett_email}>
                      {log.cimzett_email}
                    </TableCell>
                  )}
                  {isColVisible("targy") && (
                    <TableCell className="text-sm font-medium max-w-[280px] truncate" title={log.targy}>
                      {log.targy}
                    </TableCell>
                  )}
                  {isColVisible("ugyirat") && (
                    <TableCell>
                      {log.ugyirat_szam ? (
                        <Link 
                          href={`/dossiers/${log.ugyirat_id}`} 
                          className="inline-flex items-center gap-1 text-xs font-mono font-medium text-primary hover:underline"
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          {log.ugyirat_szam}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground/60 text-xs">—</span>
                      )}
                    </TableCell>
                  )}
                  {isColVisible("kivato") && (
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]" title={log.kivato_nev || "Rendszer"}>
                      {log.kivato_nev || "Rendszer"}
                    </TableCell>
                  )}
                  {isColVisible("statusz") && (
                    <TableCell>
                      {log.statusz === "sikeres" && (
                        <Badge variant="outline" className="border-success/30 bg-success/10 text-success gap-1 text-[11px] font-normal">
                          <CheckCircle2 className="h-3 w-3" /> Sikeres
                        </Badge>
                      )}
                      {log.statusz === "hibas" && (
                        <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive gap-1 text-[11px] font-normal" title={log.hiba_oka || "Ismeretlen hiba"}>
                          <AlertCircle className="h-3 w-3" /> Hibás
                        </Badge>
                      )}
                      {log.statusz === "folyamatban" && (
                        <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning gap-1 text-[11px] font-normal">
                          <Clock className="h-3 w-3" /> Folyamatban
                        </Badge>
                      )}
                    </TableCell>
                  )}
                  {isColVisible("muvelet") && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDetails(log)}
                        className="h-7 px-2 text-xs gap-1 hover:text-primary"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Megnyitás
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Lapozó Sáv ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground pt-1">
        <div className="flex items-center gap-2">
          <span>Sorok oldalanként:</span>
          <select
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value))
              setCurrentPage(1)
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="ml-2">
            Összesen: <span className="font-semibold text-foreground tabular-nums">{filteredLogs.length}</span> értesítés
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>
            Oldal: <span className="font-semibold text-foreground tabular-nums">{currentPage}</span> / <span className="tabular-nums">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Értesítés Részletező Modál ── */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-4xl lg:max-w-5xl xl:max-w-6xl w-[96vw] max-h-[94vh] flex flex-col p-6 overflow-hidden">
          {selectedLog && (
            <>
              <DialogHeader className="pb-3 border-b border-border/50 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 pr-6">
                    <Send className="w-4 h-4 text-primary shrink-0" />
                    <DialogTitle className="text-base font-semibold truncate" title={selectedLog.targy || "Értesítés Részletei"}>
                      {selectedLog.targy || "Értesítés Részletei"}
                    </DialogTitle>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedLog.csatorna === "sms" ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1 text-xs">
                        <MessageSquare className="h-3.5 w-3.5" /> SMS
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground border-border gap-1 text-xs">
                        <Mail className="h-3.5 w-3.5" /> E-mail
                      </Badge>
                    )}
                    {selectedLog.statusz === "sikeres" && (
                      <Badge variant="outline" className="border-success/30 bg-success/10 text-success gap-1 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Sikeres
                      </Badge>
                    )}
                    {selectedLog.statusz === "hibas" && (
                      <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive gap-1 text-xs" title={selectedLog.hiba_oka || ""}>
                        <AlertCircle className="h-3.5 w-3.5" /> Hibás
                      </Badge>
                    )}
                    {selectedLog.statusz === "folyamatban" && (
                      <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning gap-1 text-xs">
                        <Clock className="h-3.5 w-3.5" /> Folyamatban
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Kompakt egy-soros metaadat sáv */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-muted-foreground pt-1.5">
                  <div>
                    <span>Kiküldve: </span>
                    <span className="font-mono text-foreground font-medium">
                      {selectedLog.mikor ? format(new Date(selectedLog.mikor), "yyyy. MM. dd. HH:mm:ss") : "—"}
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
                      {selectedLog.kivato_nev || "Rendszer automatizmus"}
                    </span>
                  </div>
                  {selectedLog.ugyirat_szam && (
                    <div className="flex items-center gap-1">
                      <span>Ügyirat: </span>
                      <Link
                        href={`/dossiers/${selectedLog.ugyirat_id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 font-mono text-primary hover:underline font-medium"
                      >
                        <FileText className="w-3 h-3" />
                        {selectedLog.ugyirat_szam}
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </Link>
                    </div>
                  )}
                </div>

                <DialogDescription className="sr-only">
                  A rendszer által kiküldött üzenet adatai és üzenettörzse.
                </DialogDescription>
              </DialogHeader>

              {/* Hiba oka (ha hibás a küldés) */}
              {selectedLog.statusz === "hibas" && selectedLog.hiba_oka && (
                <div className="mt-3 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs shrink-0 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
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
                        <span>Üzenet Szövege</span>
                      </div>
                      {selectedLog.uzenet}
                    </div>
                  )
                ) : (
                  <div className="p-12 text-sm text-muted-foreground text-center italic">
                    Nincs rögzített üzenettörzs ehhez az értesítéshez.
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
