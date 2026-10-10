"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useCompany } from "@/contexts/company-context"
import { Card, CardContent } from "@/components/ui/card"
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
  ShieldAlert, 
  FileText, 
  User, 
  Eye, 
  FileEdit, 
  FileCheck, 
  Trash2, 
  RefreshCw, 
  Download, 
  ArrowRight, 
  CheckCircle2, 
  Info,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Building2,
  FolderOpen,
  Archive,
  Send,
  Lock
} from "lucide-react"
import { format } from "date-fns"
import { hu } from "date-fns/locale"
import { toast } from "sonner"
import { getDocsCentralAuditLogs, type DocsAuditLogItem } from "./actions"

// ── Entitás szótár és kategóriák ──
export const DOCS_ENTITY_CONFIG: Record<string, { label: string; category: string }> = {
  "irat": { label: "Hivatalos Irat", category: "Iratok" },
  "ugyirat": { label: "Ügyirat (Dosszié)", category: "Ügyiratok" },
  "ugy": { label: "Ügy", category: "Ügyek" },
  "partner": { label: "Partner", category: "Törzsadatok" },
  "irattari_terv": { label: "Irattári Terv Tétel", category: "Irattár & Megőrzés" },
  "feladat": { label: "Ügyirati Feladat", category: "Munkafolyamat" },
  "kimeno_irat": { label: "Kimenő Irat (Válaszlevél)", category: "Iratok" },
  "kimenoi_irat": { label: "Kimenő Irat", category: "Iratok" },
  "kolcsonzes": { label: "Iratkölcsönzés", category: "Irattár" },
  "selejtezes": { label: "Selejtezési Jegyzőkönyv", category: "Selejtezés" },
  "rendszer_beallitas": { label: "Rendszerbeállítás", category: "Rendszer" },
  "system": { label: "Rendszer", category: "Rendszer" }
}

export type ActionCategory = "read" | "create" | "update" | "delete" | "approval" | "system"

export const DOCS_EVENT_CONFIG: Record<string, { label: string; category: ActionCategory; badgeClass: string }> = {
  "megtekintve": { label: "Megtekintés", category: "read", badgeClass: "border-info/30 bg-info/10 text-info" },
  "letoltve": { label: "Letöltés", category: "read", badgeClass: "border-info/30 bg-info/10 text-info" },
  "iktatva": { label: "Iktatás", category: "create", badgeClass: "border-primary/30 bg-primary/10 text-primary" },
  "erkeztetve": { label: "Érkeztetés", category: "create", badgeClass: "border-success/30 bg-success/10 text-success" },
  "letrehozva": { label: "Létrehozás", category: "create", badgeClass: "border-success/30 bg-success/10 text-success" },
  "modositva": { label: "Módosítás", category: "update", badgeClass: "border-warning/30 bg-warning/10 text-warning" },
  "szignalva": { label: "Szignálás", category: "update", badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  "tovabbitva": { label: "Továbbítás", category: "update", badgeClass: "border-primary/30 bg-primary/10 text-primary" },
  "elintezve": { label: "Elintézés", category: "approval", badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  "lezarva": { label: "Lezárás", category: "system", badgeClass: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  "irattarozva": { label: "Irattárazás", category: "system", badgeClass: "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  "selejtezve": { label: "Selejtezés", category: "delete", badgeClass: "border-destructive/30 bg-destructive/10 text-destructive" },
  "torolve": { label: "Törlés", category: "delete", badgeClass: "border-destructive/30 bg-destructive/10 text-destructive" },
  "hozzaferes_modositas": { label: "Jogosultság", category: "update", badgeClass: "border-orange-500/30 bg-orange-500/10 text-orange-600" },
  "kolcsonozve": { label: "Kölcsönzés", category: "update", badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-600" },
  "visszahozva": { label: "Visszavétel", category: "approval", badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" }
}

export default function CentralAuditPage() {
  const [logs, setLogs] = useState<DocsAuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<DocsAuditLogItem | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // ── Szűrési állapotok ──
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedActionTypes, setSelectedActionTypes] = useState<ActionCategory[]>([])
  const [selectedEntityCategories, setSelectedEntityCategories] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // ── Lapozás ──
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // ── Oszlopválasztó állapota ──
  const [columns, setColumns] = useState<TableColumnOption[]>([
    { id: "datum", label: "Dátum és Időpont", isVisible: true },
    { id: "felhasznalo", label: "Közreműködő Felhasználó", isVisible: true },
    { id: "tipus", label: "Művelet Típusa", isVisible: true },
    { id: "entitas", label: "Modul / Entitás", isVisible: true },
    { id: "reszletek", label: "Esemény Részletei", isVisible: true },
    { id: "muveletek", label: "Részletek", isVisible: true }
  ])

  const { selectedCompany } = useCompany()

  const fetchLogs = useCallback(async () => {
    if (!selectedCompany?.id) {
      setLogs([])
      setLoading(false)
      return
    }

    setLoading(true)
    const result = await getDocsCentralAuditLogs(selectedCompany.id)

    if (result.error) {
      console.error("Hiba a napló lekérésekor:", result.error)
      toast.error("Nem sikerült betölteni az eseménynaplót: " + result.error)
    } else {
      setLogs(result.logs || [])
    }
    setLoading(false)
  }, [selectedCompany?.id])

  useEffect(() => {
    setCurrentPage(1)
    fetchLogs()
  }, [fetchLogs])

  // ── Segédfüggvények ──
  const getEventInfo = (type: string) => {
    if (DOCS_EVENT_CONFIG[type]) return DOCS_EVENT_CONFIG[type]

    if (type.includes("torol") || type.includes("selejt")) {
      return { label: "Törlés / Selejtezés", category: "delete" as ActionCategory, badgeClass: "border-destructive/30 bg-destructive/10 text-destructive" }
    }
    if (type.includes("megtekint") || type.includes("letolt") || type.includes("olvas")) {
      return { label: "Megtekintés", category: "read" as ActionCategory, badgeClass: "border-info/30 bg-info/10 text-info" }
    }
    if (type.includes("modosit") || type.includes("frissit") || type.includes("szignal")) {
      return { label: "Módosítás", category: "update" as ActionCategory, badgeClass: "border-warning/30 bg-warning/10 text-warning" }
    }
    if (type.includes("iktat") || type.includes("erkeztet") || type.includes("letrehoz")) {
      return { label: "Létrehozás / Iktatás", category: "create" as ActionCategory, badgeClass: "border-success/30 bg-success/10 text-success" }
    }
    if (type.includes("elintez") || type.includes("jovahagy")) {
      return { label: "Jóváhagyás", category: "approval" as ActionCategory, badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" }
    }

    return { 
      label: type.replace(/_/g, " "), 
      category: "system" as ActionCategory, 
      badgeClass: "border-muted-foreground/30 bg-muted/40 text-muted-foreground" 
    }
  }

  const getEntityInfo = (type?: string) => {
    if (!type) return { label: "Általános Iratügy", category: "Iratok" }
    if (DOCS_ENTITY_CONFIG[type]) return DOCS_ENTITY_CONFIG[type]
    const clean = type.replace(/_/g, " ")
    return {
      label: clean.charAt(0).toUpperCase() + clean.slice(1),
      category: "Egyéb"
    }
  }

  // ── Statisztikák (Linear Flat KpiCard Grid) ──
  const stats = useMemo(() => {
    const total = logs.length
    let viewCount = 0
    let filingAndUpdateCount = 0
    const userSet = new Set<string>()

    logs.forEach(log => {
      if (log.user_id) userSet.add(log.user_id)
      const ev = getEventInfo(log.esemeny_tipus)
      if (ev.category === "read") viewCount++
      if (ev.category === "create" || ev.category === "update") filingAndUpdateCount++
    })

    return {
      total,
      viewCount,
      filingAndUpdateCount,
      uniqueUsers: userSet.size
    }
  }, [logs])

  // ── Szűrési logika ──
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Kereső kifejezés
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const eventInfo = getEventInfo(log.esemeny_tipus)
        const entityInfo = getEntityInfo(log.entitas_tipus)
        
        const matchTitle = (log.formatted_title || "").toLowerCase().includes(q)
        const matchDesc = (log.formatted_description || "").toLowerCase().includes(q)
        const matchIndoklas = (log.indoklas || "").toLowerCase().includes(q)
        const matchReszletek = (log.reszletek || "").toLowerCase().includes(q)
        const matchUser = (log.felhasznalo_nev || "").toLowerCase().includes(q)
        const matchType = eventInfo.label.toLowerCase().includes(q)
        const matchEntity = entityInfo.label.toLowerCase().includes(q)
        const matchIp = (log.ip_cim || "").toLowerCase().includes(q)
        
        if (!matchTitle && !matchDesc && !matchIndoklas && !matchReszletek && !matchUser && !matchType && !matchEntity && !matchIp) {
          return false
        }
      }

      // 2. Felhasználó szűrés
      if (selectedUsers.length > 0) {
        if (!log.user_id || !selectedUsers.includes(log.user_id)) {
          return false
        }
      }

      // 3. Művelettípus szűrés
      if (selectedActionTypes.length > 0) {
        const ev = getEventInfo(log.esemeny_tipus)
        if (!selectedActionTypes.includes(ev.category)) {
          return false
        }
      }

      // 4. Modul / Entitás kategória szűrés
      if (selectedEntityCategories.length > 0) {
        const ent = getEntityInfo(log.entitas_tipus)
        if (!selectedEntityCategories.includes(ent.category)) {
          return false
        }
      }

      // 5. Dátumtartomány szűrés
      if (dateFrom) {
        const logDate = new Date(log.tortent).toISOString().split("T")[0]
        if (logDate < dateFrom) return false
      }
      if (dateTo) {
        const logDate = new Date(log.tortent).toISOString().split("T")[0]
        if (logDate > dateTo) return false
      }

      return true
    })
  }, [logs, searchQuery, selectedUsers, selectedActionTypes, selectedEntityCategories, dateFrom, dateTo])

  // ── Pagináció ──
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredLogs.slice(start, start + pageSize)
  }, [filteredLogs, currentPage, pageSize])

  // ── Felhasználó opciók dinamikusan a naplóból ──
  const userOptions = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    logs.forEach(l => {
      if (l.user_id && l.felhasznalo_nev) {
        const cur = map.get(l.user_id) || { name: l.felhasznalo_nev, count: 0 }
        cur.count++
        map.set(l.user_id, cur)
      }
    })
    return Array.from(map.entries()).map(([id, data]) => ({
      id,
      label: `${data.name} (${data.count})`,
      checked: selectedUsers.includes(id)
    }))
  }, [logs, selectedUsers])

  // ── Művelettípus opciók ──
  const actionTypeOptions = useMemo(() => {
    const counts: Record<ActionCategory, number> = {
      read: 0,
      create: 0,
      update: 0,
      approval: 0,
      delete: 0,
      system: 0
    }
    logs.forEach(l => {
      const ev = getEventInfo(l.esemeny_tipus)
      counts[ev.category] = (counts[ev.category] || 0) + 1
    })

    return [
      { id: "read", label: `Megtekintés & Letöltés (${counts.read})`, checked: selectedActionTypes.includes("read") },
      { id: "create", label: `Iktatás & Érkeztetés (${counts.create})`, checked: selectedActionTypes.includes("create") },
      { id: "update", label: `Módosítás & Szignálás (${counts.update})`, checked: selectedActionTypes.includes("update") },
      { id: "approval", label: `Elintézés & Jóváhagyás (${counts.approval})`, checked: selectedActionTypes.includes("approval") },
      { id: "system", label: `Lezárás & Irattárazás (${counts.system})`, checked: selectedActionTypes.includes("system") },
      { id: "delete", label: `Selejtezés & Törlés (${counts.delete})`, checked: selectedActionTypes.includes("delete") },
    ]
  }, [logs, selectedActionTypes])

  // ── Entitás kategória opciók ──
  const entityCategoryOptions = useMemo(() => {
    const counts: Record<string, number> = {}
    logs.forEach(l => {
      const ent = getEntityInfo(l.entitas_tipus)
      counts[ent.category] = (counts[ent.category] || 0) + 1
    })

    const categories = ["Iratok", "Ügyiratok", "Ügyek", "Törzsadatok", "Irattár & Megőrzés", "Munkafolyamat", "Selejtezés", "Rendszer"]
    return categories
      .filter(cat => (counts[cat] || 0) > 0)
      .map(cat => ({
        id: cat,
        label: `${cat} (${counts[cat] || 0})`,
        checked: selectedEntityCategories.includes(cat)
      }))
  }, [logs, selectedEntityCategories])

  // ── TableToolbar FilterGroups ──
  const filterGroups: FilterGroup[] = useMemo(() => {
    return [
      {
        id: "users",
        title: "Közreműködő Munkatárs",
        options: userOptions,
        onToggle: (id: string) => {
          setSelectedUsers(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
          )
          setCurrentPage(1)
        }
      },
      {
        id: "actions",
        title: "Művelet Típusa",
        options: actionTypeOptions,
        onToggle: (id: string) => {
          const cat = id as ActionCategory
          setSelectedActionTypes(prev => 
            prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]
          )
          setCurrentPage(1)
        }
      },
      {
        id: "categories",
        title: "Modul / Kategória",
        options: entityCategoryOptions,
        onToggle: (id: string) => {
          setSelectedEntityCategories(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
          )
          setCurrentPage(1)
        }
      }
    ]
  }, [userOptions, actionTypeOptions, entityCategoryOptions])

  const activeFiltersCount = 
    selectedUsers.length + 
    selectedActionTypes.length + 
    selectedEntityCategories.length + 
    (dateFrom ? 1 : 0) + 
    (dateTo ? 1 : 0)

  const dateRange: DateRangeFilter = {
    from: dateFrom,
    to: dateTo,
    onFromChange: (val: string) => {
      setDateFrom(val)
      setCurrentPage(1)
    },
    onToChange: (val: string) => {
      setDateTo(val)
      setCurrentPage(1)
    }
  }

  const handleToggleColumn = (colId: string) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, isVisible: !c.isVisible } : c))
  }

  const handleResetFilters = () => {
    setSearchQuery("")
    setSelectedUsers([])
    setSelectedActionTypes([])
    setSelectedEntityCategories([])
    setDateFrom("")
    setDateTo("")
    setCurrentPage(1)
  }

  // ── CSV Export ──
  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      toast.warning("Nincs exportálható adat a megadott szűrőkkel.")
      return
    }

    const headers = [
      "Dátum és Időpont",
      "Cég",
      "Felhasználó",
      "Szerepkör",
      "Művelet",
      "Entitás",
      "Kategória",
      "Esemény Címe",
      "Esemény Részletei",
      "Indoklás",
      "IP Cím"
    ]

    const rows = filteredLogs.map(log => {
      const ev = getEventInfo(log.esemeny_tipus)
      const ent = getEntityInfo(log.entitas_tipus)
      return [
        log.tortent ? format(new Date(log.tortent), "yyyy-MM-dd HH:mm:ss") : "",
        selectedCompany?.name || "",
        log.felhasznalo_nev || "",
        log.docs_szerepkor || "",
        ev.label,
        ent.label,
        ent.category,
        log.formatted_title || "",
        log.formatted_description || "",
        log.indoklas || "",
        log.ip_cim || ""
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(";")
    })

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const compName = selectedCompany?.name ? selectedCompany.name.replace(/[^a-zA-Z0-9]/g, "_") : "ceg"
    link.setAttribute("href", url)
    link.setAttribute("download", `eaisydocs_esemenynaplo_${compName}_${format(new Date(), "yyyyMMdd_HHmm")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success("Eseménynapló sikeresen exportálva CSV formátumban.")
  }

  const isColVisible = (colId: string) => {
    const c = columns.find(col => col.id === colId)
    return c ? c.isVisible : true
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── Fejléc ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-3xl font-semibold tracking-tight">Központi Eseménynapló</h1>
            {selectedCompany && (
              <Badge 
                variant="outline" 
                className="text-xs gap-1.5 py-0.5 px-2.5 bg-muted/40 border-border text-foreground font-medium"
              >
                <Building2 className="w-3.5 h-3.5 text-primary" />
                {selectedCompany.name}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Minden kritikus rendszeresemény, iratiktatás, megtekintés és adatváltozás visszakövethető, append-only naplója (335/2005. Korm. rendelet és GDPR megfelelőség).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
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

      {/* ── Kanonikus KPI Statisztikai Kártyák (Linear Flat Grid - ADR A-029) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Összes Audit Esemény"
          value={stats.total}
          sub="Visszavonhatatlan bejegyzések száma"
        />
        <KpiCard
          label="Irat Betekintés & Letöltés"
          value={stats.viewCount}
          highlight={stats.viewCount > 0}
          sub="Bizalmas dokumentum megtekintések"
        />
        <KpiCard
          label="Iktatások & Módosítások"
          value={stats.filingAndUpdateCount}
          sub="Ügyirat- és iratmozgások száma"
        />
        <KpiCard
          label="Közreműködő Felhasználók"
          value={stats.uniqueUsers}
          sub="Munkatársak, iktatók és rendszergazdák"
        />
      </div>

      {/* ── Kanonikus TableToolbar és Szűrő Sáv ── */}
      <div className="space-y-3">
        <TableToolbar
          searchPlaceholder="Keresés esemény, felhasználó, modul, indoklás vagy iktatószám alapján..."
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

        {/* Gyors időszaki szűrőpillék */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium mr-1">
            <Calendar className="w-3 h-3" /> Időszak:
          </span>
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); setCurrentPage(1) }}
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
              setCurrentPage(1)
            }}
            className={`text-xs px-2.5 py-0.5 rounded-md transition-colors ${
              dateFrom === new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10) && dateTo === new Date().toISOString().slice(0, 10)
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
              setCurrentPage(1)
            }}
            className={`text-xs px-2.5 py-0.5 rounded-md transition-colors ${
              dateFrom === new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10) && dateTo === new Date().toISOString().slice(0, 10)
                ? "bg-primary text-primary-foreground font-medium"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Elmúlt 30 nap
          </button>
        </div>
      </div>

        {/* ── Eseménynapló Táblázat ── */}
        <Card className="border border-border/80 shadow-none rounded-lg overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  {isColVisible("datum") && (
                    <TableHead className="w-[170px] text-xs font-semibold uppercase tracking-wider">
                      Dátum és Időpont
                    </TableHead>
                  )}
                  {isColVisible("felhasznalo") && (
                    <TableHead className="w-[180px] text-xs font-semibold uppercase tracking-wider">
                      Felhasználó
                    </TableHead>
                  )}
                  {isColVisible("tipus") && (
                    <TableHead className="w-[130px] text-xs font-semibold uppercase tracking-wider">
                      Művelet
                    </TableHead>
                  )}
                  {isColVisible("entitas") && (
                    <TableHead className="w-[180px] text-xs font-semibold uppercase tracking-wider">
                      Modul / Entitás
                    </TableHead>
                  )}
                  {isColVisible("reszletek") && (
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">
                      Esemény Részletei
                    </TableHead>
                  )}
                  {isColVisible("muveletek") && (
                    <TableHead className="w-[90px] text-right text-xs font-semibold uppercase tracking-wider">
                      Részletek
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-44 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Eseménynapló betöltése...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShieldAlert className="w-8 h-8 text-muted-foreground/60" />
                        <span className="text-sm font-medium text-foreground">Nincsenek események a kiválasztott szűrőkkel</span>
                        <span className="text-xs text-muted-foreground max-w-sm">
                          Próbáld meg törölni a szűrőket vagy válassz másik dátumtartományt az események megjelenítéséhez.
                        </span>
                        {(searchQuery || selectedUsers.length > 0 || selectedActionTypes.length > 0 || selectedEntityCategories.length > 0 || dateFrom || dateTo) && (
                          <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2 text-xs h-7">
                            Szűrők visszaállítása
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => {
                    const eventInfo = getEventInfo(log.esemeny_tipus)
                    const entityInfo = getEntityInfo(log.entitas_tipus)

                    return (
                      <TableRow 
                        key={log.id} 
                        className="hover:bg-muted/40 transition-colors cursor-pointer group"
                        onClick={() => {
                          setSelectedLog(log)
                          setDetailModalOpen(true)
                        }}
                      >
                        {/* 1. Dátum */}
                        {isColVisible("datum") && (
                          <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {log.tortent ? format(new Date(log.tortent), "yyyy. MM. dd. HH:mm:ss", { locale: hu }) : "–"}
                          </TableCell>
                        )}

                        {/* 2. Felhasználó */}
                        {isColVisible("felhasznalo") && (
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0 border border-border">
                                {log.felhasznalo_nev ? log.felhasznalo_nev.slice(0, 2).toUpperCase() : "RD"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground truncate leading-tight">
                                  {log.felhasznalo_nev}
                                </p>
                                <span className="text-[10px] text-muted-foreground/80 leading-none">
                                  {log.docs_szerepkor}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                        )}

                        {/* 3. Művelet Badge */}
                        {isColVisible("tipus") && (
                          <TableCell className="py-2.5 whitespace-nowrap">
                            <Badge 
                              variant="outline" 
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${eventInfo.badgeClass}`}
                            >
                              {eventInfo.label}
                            </Badge>
                          </TableCell>
                        )}

                        {/* 4. Modul / Entitás */}
                        {isColVisible("entitas") && (
                          <TableCell className="py-2.5">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">
                                {entityInfo.label}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {entityInfo.category}
                              </p>
                            </div>
                          </TableCell>
                        )}

                        {/* 5. Esemény részletei */}
                        {isColVisible("reszletek") && (
                          <TableCell className="py-2.5">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">
                                {log.formatted_title || log.indoklas || "Rendszerművelet rögzítve"}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {log.formatted_description || log.reszletek || log.indoklas || "Részletek megtekintéséhez kattints a sorra."}
                              </p>
                            </div>
                          </TableCell>
                        )}

                        {/* 6. Részletek Gomb */}
                        {isColVisible("muveletek") && (
                          <TableCell className="py-2.5 text-right whitespace-nowrap">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground group-hover:bg-background"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedLog(log)
                                setDetailModalOpen(true)
                              }}
                            >
                              Megnyitás
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>

          {/* ── Lapozás és Eredmény Összesítő ── */}
          {!loading && filteredLogs.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/60 bg-muted/10 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Sorok száma oldalanként:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="h-7 rounded border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="ml-2 font-mono">
                  Összesen {filteredLogs.length} audit rekord
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono">
                  {currentPage} / {totalPages} oldal
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

      {/* ── Részletes Esemény Betekintő Modal (Dialog) ── */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedLog && (
            <div className="space-y-5">
              <DialogHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-2.5 py-0.5 rounded-full ${getEventInfo(selectedLog.esemeny_tipus).badgeClass}`}
                  >
                    {getEventInfo(selectedLog.esemeny_tipus).label}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">
                    {selectedLog.tortent ? format(new Date(selectedLog.tortent), "yyyy. MMMM d. HH:mm:ss", { locale: hu }) : "–"}
                  </span>
                </div>
                <DialogTitle className="text-lg font-semibold">
                  {selectedLog.formatted_title || "Audit Esemény Részletei"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  A rendszer által rögzített hivatalos, megváltoztathatatlan audit naplóbejegyzés.
                </DialogDescription>
              </DialogHeader>

              {/* Részletek rács */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Közreműködő adatai */}
                <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <User className="w-3.5 h-3.5 text-primary" />
                    Közreműködő Munkatárs
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {selectedLog.felhasznalo_nev || "Rendszer / Automatizmus"}
                  </p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {selectedLog.docs_szerepkor || "–"}
                    </Badge>
                    {selectedLog.pozicio && (
                      <span className="text-xs text-muted-foreground">{selectedLog.pozicio}</span>
                    )}
                  </div>
                  {selectedLog.user_id && (
                    <p className="text-[10px] font-mono text-muted-foreground truncate pt-1">
                      ID: {selectedLog.user_id}
                    </p>
                  )}
                </div>

                {/* Érintett entitás adatai */}
                <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    Érintett Iratügyi Entitás
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {getEntityInfo(selectedLog.entitas_tipus).label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Kategória: {getEntityInfo(selectedLog.entitas_tipus).category}
                  </p>
                  {selectedLog.entitas_id && (
                    <p className="text-[10px] font-mono text-muted-foreground truncate pt-1">
                      Rekord ID: {selectedLog.entitas_id}
                    </p>
                  )}
                </div>
              </div>

              {/* Részletes leírás & indoklás */}
              <div className="p-3.5 rounded-lg border border-border/80 bg-muted/10 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Esemény Leírása és Indoklás
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedLog.formatted_description || selectedLog.indoklas || "Nincs további szöveges indoklás rögzítve."}
                </p>
                {selectedLog.reszletek && selectedLog.reszletek !== selectedLog.formatted_description && (
                  <p className="text-xs text-muted-foreground pt-1 border-t border-border/40 mt-2">
                    {selectedLog.reszletek}
                  </p>
                )}
              </div>

              {/* Értékváltozás diff (ha van előző vagy új érték) */}
              {(selectedLog.elozo_ertek || selectedLog.uj_ertek) && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Értékváltozás & Mezők
                  </p>
                  <div className="rounded-lg border border-border overflow-hidden text-xs">
                    <div className="grid grid-cols-2 bg-muted/40 font-semibold p-2 border-b border-border">
                      <div>Korábbi Érték</div>
                      <div>Új Érték</div>
                    </div>
                    <div className="grid grid-cols-2 p-3 font-mono text-[11px] gap-3 bg-card overflow-x-auto">
                      <div className="text-muted-foreground break-all whitespace-pre-wrap">
                        {selectedLog.elozo_ertek ? JSON.stringify(selectedLog.elozo_ertek, null, 2) : "– (Nincs előző érték)"}
                      </div>
                      <div className="text-foreground break-all whitespace-pre-wrap">
                        {selectedLog.uj_ertek ? JSON.stringify(selectedLog.uj_ertek, null, 2) : "–"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Biztonsági & Hálózati Metaadatok */}
              <div className="p-3 rounded-lg border border-border/50 bg-muted/20 text-xs space-y-1 font-mono text-muted-foreground">
                <div className="flex justify-between items-center">
                  <span>Hálózati IP cím:</span>
                  <span className="text-foreground font-semibold">{selectedLog.ip_cim || "Ismeretlen / Belső"}</span>
                </div>
                {selectedLog.company_id && (
                  <div className="flex justify-between items-center">
                    <span>Cég azonosító:</span>
                    <span className="truncate max-w-[280px]">{selectedLog.company_id}</span>
                  </div>
                )}
                {selectedLog.user_agent && (
                  <div className="pt-1 border-t border-border/40 text-[10px] leading-tight break-all">
                    Böngésző (User Agent): {selectedLog.user_agent}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
