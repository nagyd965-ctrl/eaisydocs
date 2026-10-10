"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/utils/supabase/client"
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
  Building2
} from "lucide-react"
import { format } from "date-fns"
import { hu } from "date-fns/locale"
import { toast } from "sonner"

// ── Entitás szótár és kategóriák ──
export const HR_ENTITY_CONFIG: Record<string, { label: string; category: string }> = {
  "hr_dolgozo_titkos_adat": { label: "Érzékeny Adatok (TAJ, Adó, Bér)", category: "Bizalmas adatok" },
  "hr_dolgozo_adatlap": { label: "Dolgozói Személyes Adatok", category: "Személyes adatok" },
  "hr_dokumentum": { label: "Hivatalos HR Irat", category: "Iratok & Szerződések" },
  "hr_munkaszerzodes": { label: "Munkaszerződés", category: "Iratok & Szerződések" },
  "hr_tanulmanyi_szerzodes": { label: "Tanulmányi Szerződés", category: "Iratok & Szerződések" },
  "hr_munkavedelmi_oktatas": { label: "Munkavédelmi Oktatás", category: "Munkavédelem & Egészségügy" },
  "hr_orvosi_vizsgalat": { label: "Orvosi Alkalmassági", category: "Munkavédelem & Egészségügy" },
  "hr_cafeteria_keret": { label: "Cafeteria Keret", category: "Cafeteria" },
  "hr_cafeteria_valasztas": { label: "Cafeteria Nyilatkozat", category: "Cafeteria" },
  "hr_tavollet": { label: "Távollét / Szabadság", category: "Munkaidő & Jelenlét" },
  "hr_jelenlet": { label: "Jelenléti Ív", category: "Munkaidő & Jelenlét" },
  "hr_jelenlet_korrekcio": { label: "Jelenléti Korrekció", category: "Munkaidő & Jelenlét" },
  "hr_muszak_beosztas": { label: "Műszakbeosztás", category: "Munkaidő & Jelenlét" },
  "hr_onboarding_feladat": { label: "Beléptetési Feladat (Onboarding)", category: "Beléptetés & Kiléptetés" },
  "hr_offboarding": { label: "Kiléptetési Ügy (Offboarding)", category: "Beléptetés & Kiléptetés" },
  "hr_berpapir": { label: "Havi Bérpapír", category: "Bérszámfejtés" },
  "hr_teljesitmeny": { label: "Teljesítményértékelés (KPI)", category: "Teljesítmény" },
  "hr_fegyelmi": { label: "Fegyelmi Határozat", category: "Fegyelmi ügyek" },
  "hr_ceges_dokumentum": { label: "Céges Szabályzat", category: "Szabályzatok" },
  "system": { label: "Rendszer", category: "Rendszer" }
}

export type ActionCategory = "read" | "create" | "update" | "delete" | "approval" | "system"

export const HR_EVENT_CONFIG: Record<string, { label: string; category: ActionCategory; badgeClass: string }> = {
  // Megtekintés / Olvasás
  "adat_megtekintes": { label: "Megtekintés", category: "read", badgeClass: "border-info/30 bg-info/10 text-info" },
  "megtekintes": { label: "Megtekintés", category: "read", badgeClass: "border-info/30 bg-info/10 text-info" },
  "irat_megtekintes": { label: "Megtekintés", category: "read", badgeClass: "border-info/30 bg-info/10 text-info" },
  "hr_megtekintve": { label: "Megtekintés", category: "read", badgeClass: "border-info/30 bg-info/10 text-info" },
  "lekerdezes": { label: "Adatlekérés", category: "read", badgeClass: "border-info/30 bg-info/10 text-info" },
  "irat_letoltes": { label: "Letöltés", category: "read", badgeClass: "border-info/30 bg-info/10 text-info" },

  // Létrehozás / Iktatás
  "letrehozas": { label: "Létrehozás", category: "create", badgeClass: "border-success/30 bg-success/10 text-success" },
  "adat_letrehozas": { label: "Létrehozás", category: "create", badgeClass: "border-success/30 bg-success/10 text-success" },
  "irat_letrehozas": { label: "Iratkészítés", category: "create", badgeClass: "border-success/30 bg-success/10 text-success" },
  "munkatars_felvetel": { label: "Rögzítés", category: "create", badgeClass: "border-success/30 bg-success/10 text-success" },
  "kpi_hozzaadas": { label: "KPI rögzítés", category: "create", badgeClass: "border-success/30 bg-success/10 text-success" },
  "iktatva": { label: "Iktatás", category: "create", badgeClass: "border-success/30 bg-success/10 text-success" },
  "irat_alairas": { label: "Aláírás", category: "create", badgeClass: "border-success/30 bg-success/10 text-success" },
  "tavollet_igenyles": { label: "Szabadság kérelem", category: "create", badgeClass: "border-success/30 bg-success/10 text-success" },

  // Módosítás
  "modositas": { label: "Módosítás", category: "update", badgeClass: "border-warning/30 bg-warning/10 text-warning" },
  "adat_modositas": { label: "Módosítás", category: "update", badgeClass: "border-warning/30 bg-warning/10 text-warning" },
  "munkatars_modositas": { label: "Módosítás", category: "update", badgeClass: "border-warning/30 bg-warning/10 text-warning" },
  "hr_modositva": { label: "Módosítás", category: "update", badgeClass: "border-warning/30 bg-warning/10 text-warning" },
  "kpi_frissites": { label: "KPI módosítás", category: "update", badgeClass: "border-warning/30 bg-warning/10 text-warning" },
  "jelenlet_korrekcio_keres": { label: "Korrekció kérés", category: "update", badgeClass: "border-warning/30 bg-warning/10 text-warning" },

  // Törlés
  "torles": { label: "Törlés", category: "delete", badgeClass: "border-destructive/30 bg-destructive/10 text-destructive" },
  "adat_torles": { label: "Törlés", category: "delete", badgeClass: "border-destructive/30 bg-destructive/10 text-destructive" },
  "irat_torles": { label: "Irat törlése", category: "delete", badgeClass: "border-destructive/30 bg-destructive/10 text-destructive" },
  "kpi_torles": { label: "KPI törlés", category: "delete", badgeClass: "border-destructive/30 bg-destructive/10 text-destructive" },

  // Jóváhagyás / Nyugtázás
  "jovahagyas": { label: "Jóváhagyás", category: "approval", badgeClass: "border-primary/30 bg-primary/10 text-primary" },
  "tavollet_jovahagyas": { label: "Jóváhagyás", category: "approval", badgeClass: "border-primary/30 bg-primary/10 text-primary" },
  "elutasitas": { label: "Elutasítás", category: "approval", badgeClass: "border-destructive/30 bg-destructive/10 text-destructive" },
  "tavollet_elutasitas": { label: "Elutasítás", category: "approval", badgeClass: "border-destructive/30 bg-destructive/10 text-destructive" },
  "dokumentum_nyugtazas": { label: "Nyugtázás", category: "approval", badgeClass: "border-primary/30 bg-primary/10 text-primary" },

  // Rendszer
  "rendszer_inditas": { label: "Rendszer", category: "system", badgeClass: "border-muted-foreground/30 bg-muted/40 text-muted-foreground" },
  "system": { label: "Rendszer", category: "system", badgeClass: "border-muted-foreground/30 bg-muted/40 text-muted-foreground" }
}

const FIELD_LABELS: Record<string, string> = {
  szuletesi_datum: "Születési dátum",
  anyja_neve: "Anyja neve",
  lakcim: "Lakcím",
  telefonszam: "Telefonszám",
  gyermekek_szama: "Gyermekek száma",
  megvaltozott_munkakepessegu: "Megváltozott munkaképességű",
  taj_szam: "TAJ szám",
  adoazonosito: "Adóazonosító jel",
  bankszamla: "Bankszámlaszám",
  brutto_ber: "Bruttó bér",
  netto_ber: "Nettó bér",
  munkakor_id: "Munkakör",
  munkarend: "Munkarend",
  munkaido_fte: "Munkaidő (FTE)",
  berkategoria: "Bérkategória",
  statusz: "Státusz",
  ervenyes_tol: "Érvényesség kezdete",
  ervenyes_ig: "Érvényesség vége",
  belepes_datuma: "Belépés dátuma",
  kilepes_datuma: "Kilépés dátuma"
}

export default function HrAuditPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLog, setSelectedLog] = useState<any | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // ── Szűrők állapota ──
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
    { id: "reszletek", label: "Esemény Leírása / Részletek", isVisible: true },
    { id: "muveletek", label: "Műveletek", isVisible: true }
  ])

  const { selectedCompany, isSwitching } = useCompany()
  const supabase = createClient()

  const fetchLogs = useCallback(async () => {
    if (!selectedCompany?.id) {
      setLogs([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from("hr_esemeny_naplo")
      .select(`
        *,
        felhasznalo_profil:felhasznalo_id ( nev, hr_szerepkor, pozicio )
      `)
      .eq("company_id", selectedCompany.id)
      .order("created_at", { ascending: false })
      .limit(500)

    if (error) {
      console.error("Hiba a napló lekérésekor:", error.message || error)
      toast.error("Nem sikerült betölteni az audit naplót: " + (error.message || "Ismeretlen hiba"))
    } else {
      setLogs(data || [])
    }
    setLoading(false)
  }, [selectedCompany?.id, supabase])

  useEffect(() => {
    setCurrentPage(1)
    fetchLogs()
  }, [fetchLogs])

  // ── Segédfüggvények ──
  const cleanNote = (note?: string) => {
    if (!note) return null
    return note
      .replace(/\([0-9a-fA-F-]{36}\)/g, "")
      .replace(/\s\s+/g, " ")
      .trim()
  }

  const getEventInfo = (type: string, entity?: string) => {
    // Érzékeny adat speciális kezelése
    if (entity === "hr_dolgozo_titkos_adat" && ["irat_megtekintes", "adat_megtekintes", "megtekintes"].includes(type)) {
      return { 
        label: "Adatfeloldás", 
        category: "read" as ActionCategory, 
        badgeClass: "border-info/30 bg-info/10 text-info" 
      }
    }

    if (HR_EVENT_CONFIG[type]) return HR_EVENT_CONFIG[type]

    if (type.includes("torles")) {
      return { label: "Törlés", category: "delete" as ActionCategory, badgeClass: "border-destructive/30 bg-destructive/10 text-destructive" }
    }
    if (type.includes("megtekint") || type.includes("olvas") || type.includes("letolt")) {
      return { label: "Megtekintés", category: "read" as ActionCategory, badgeClass: "border-info/30 bg-info/10 text-info" }
    }
    if (type.includes("modosit") || type.includes("frissit") || type.includes("korrekcio")) {
      return { label: "Módosítás", category: "update" as ActionCategory, badgeClass: "border-warning/30 bg-warning/10 text-warning" }
    }
    if (type.includes("letrehoz") || type.includes("iktat") || type.includes("alair") || type.includes("felvetel")) {
      return { label: "Létrehozás", category: "create" as ActionCategory, badgeClass: "border-success/30 bg-success/10 text-success" }
    }
    if (type.includes("jovahagy") || type.includes("nyugtaz")) {
      return { label: "Jóváhagyás", category: "approval" as ActionCategory, badgeClass: "border-primary/30 bg-primary/10 text-primary" }
    }

    return { 
      label: type.replace(/_/g, " "), 
      category: "system" as ActionCategory, 
      badgeClass: "border-muted-foreground/30 bg-muted/40 text-muted-foreground" 
    }
  }

  const getEntityInfo = (type: string) => {
    if (HR_ENTITY_CONFIG[type]) return HR_ENTITY_CONFIG[type]
    const clean = type.replace(/^hr_/, "").replace(/_/g, " ")
    return {
      label: clean.charAt(0).toUpperCase() + clean.slice(1),
      category: "Egyéb"
    }
  }

  const getActionIcon = (category: ActionCategory) => {
    switch (category) {
      case "read": return <Eye className="w-3.5 h-3.5 text-info shrink-0" />
      case "create": return <FileCheck className="w-3.5 h-3.5 text-success shrink-0" />
      case "update": return <FileEdit className="w-3.5 h-3.5 text-warning shrink-0" />
      case "delete": return <Trash2 className="w-3.5 h-3.5 text-destructive shrink-0" />
      case "approval": return <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
      case "system": default: return <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    }
  }

  // ── Egyedi felhasználók kinyerése a naplóból a szűrőhöz ──
  const availableUsers = useMemo(() => {
    const map = new Map<string, string>()
    logs.forEach(log => {
      const id = log.felhasznalo_id || "system"
      const name = log.felhasznalo_profil?.nev || (id === "system" ? "Rendszer" : "Ismeretlen")
      map.set(id, name)
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [logs])

  // ── Egyedi modul kategóriák ──
  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    logs.forEach(log => {
      const cat = getEntityInfo(log.entitas_tipus).category
      if (cat) set.add(cat)
    })
    return Array.from(set).sort()
  }, [logs])

  // ── Szűrési logika ──
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const note = (log.megjegyzes || "").toLowerCase()
      const userName = (log.felhasznalo_profil?.nev || "rendszer").toLowerCase()
      const entityLabel = getEntityInfo(log.entitas_tipus).label.toLowerCase()
      const eventLabel = getEventInfo(log.esemeny_tipus, log.entitas_tipus).label.toLowerCase()
      const search = searchTerm.toLowerCase().trim()

      // 1. Szöveges keresés
      if (search) {
        const matches = 
          note.includes(search) || 
          userName.includes(search) || 
          entityLabel.includes(search) || 
          eventLabel.includes(search) ||
          log.entitas_tipus.toLowerCase().includes(search) ||
          log.esemeny_tipus.toLowerCase().includes(search)
        if (!matches) return false
      }

      // 2. Felhasználó szűrő
      if (selectedUsers.length > 0) {
        const userId = log.felhasznalo_id || "system"
        if (!selectedUsers.includes(userId)) return false
      }

      // 3. Művelettípus szűrő
      if (selectedActionTypes.length > 0) {
        const actionCat = getEventInfo(log.esemeny_tipus, log.entitas_tipus).category
        if (!selectedActionTypes.includes(actionCat)) return false
      }

      // 4. Modul / Entitás kategória szűrő
      if (selectedEntityCategories.length > 0) {
        const entityCat = getEntityInfo(log.entitas_tipus).category
        if (!selectedEntityCategories.includes(entityCat)) return false
      }

      // 5. Dátum szűrő
      if (dateFrom) {
        const logDate = new Date(log.created_at).toISOString().slice(0, 10)
        if (logDate < dateFrom) return false
      }
      if (dateTo) {
        const logDate = new Date(log.created_at).toISOString().slice(0, 10)
        if (logDate > dateTo) return false
      }

      return true
    })
  }, [logs, searchTerm, selectedUsers, selectedActionTypes, selectedEntityCategories, dateFrom, dateTo])

  // ── Pagináció számítás ──
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredLogs.slice(start, start + pageSize)
  }, [filteredLogs, currentPage, pageSize])

  // Ha a szűrés miatt kevesebb oldal lett
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  // ── KPI számítások ──
  const kpiStats = useMemo(() => {
    const total = logs.length
    const secretAccessCount = logs.filter(l => l.entitas_tipus === "hr_dolgozo_titkos_adat").length
    const modificationsCount = logs.filter(l => {
      const cat = getEventInfo(l.esemeny_tipus, l.entitas_tipus).category
      return cat === "update" || cat === "delete"
    }).length
    const uniqueUsersCount = new Set(logs.map(l => l.felhasznalo_id).filter(Boolean)).size

    return { total, secretAccessCount, modificationsCount, uniqueUsersCount }
  }, [logs])

  // ── TableToolbar konfiguráció ──
  const filterGroups: FilterGroup[] = useMemo(() => [
    {
      id: "users",
      title: "Közreműködő Felhasználók",
      options: availableUsers.map(u => ({
        id: u.id,
        label: u.name,
        checked: selectedUsers.includes(u.id)
      })),
      onToggle: (id: string) => {
        setSelectedUsers(prev => 
          prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
      }
    },
    {
      id: "action_types",
      title: "Művelet Típusa",
      options: [
        { id: "read", label: "Megtekintés / Olvasás", checked: selectedActionTypes.includes("read") },
        { id: "create", label: "Létrehozás / Iktatás", checked: selectedActionTypes.includes("create") },
        { id: "update", label: "Módosítás", checked: selectedActionTypes.includes("update") },
        { id: "approval", label: "Jóváhagyás / Nyugtázás", checked: selectedActionTypes.includes("approval") },
        { id: "delete", label: "Törlés", checked: selectedActionTypes.includes("delete") },
        { id: "system", label: "Rendszeresemény", checked: selectedActionTypes.includes("system") }
      ],
      onToggle: (id: string) => {
        const cat = id as ActionCategory
        setSelectedActionTypes(prev => 
          prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]
        )
      }
    },
    {
      id: "modules",
      title: "Modul / Szakterület",
      options: availableCategories.map(cat => ({
        id: cat,
        label: cat,
        checked: selectedEntityCategories.includes(cat)
      })),
      onToggle: (cat: string) => {
        setSelectedEntityCategories(prev => 
          prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]
        )
      }
    }
  ], [availableUsers, selectedUsers, selectedActionTypes, availableCategories, selectedEntityCategories])

  const activeFiltersCount = 
    selectedUsers.length + 
    selectedActionTypes.length + 
    selectedEntityCategories.length + 
    (dateFrom ? 1 : 0) + 
    (dateTo ? 1 : 0)

  const clearAllFilters = () => {
    setSelectedUsers([])
    setSelectedActionTypes([])
    setSelectedEntityCategories([])
    setDateFrom("")
    setDateTo("")
    setSearchTerm("")
  }

  const dateRange: DateRangeFilter = {
    from: dateFrom,
    to: dateTo,
    onFromChange: setDateFrom,
    onToChange: setDateTo
  }

  const handleToggleColumn = (colId: string) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, isVisible: !c.isVisible } : c))
  }

  const isColVisible = (id: string) => {
    const col = columns.find(c => c.id === id)
    return col ? col.isVisible : true
  }

  // ── CSV Exportálás ──
  const handleExportCsv = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      toast.error("Nincs exportálható adat a jelenlegi szűréssel!")
      return
    }

    const companyName = selectedCompany?.name || "Kiválasztott cég"
    const headers = [
      "Cég",
      "Dátum",
      "Felhasználó",
      "HR Szerepkör",
      "Művelet Kategória",
      "Művelet Típusa",
      "Modul",
      "Entitás",
      "Részletek",
      "IP Cím"
    ]

    const rows = filteredLogs.map(log => {
      const dateStr = format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")
      const user = log.felhasznalo_profil?.nev || "Rendszer"
      const role = log.felhasznalo_profil?.hr_szerepkor || "-"
      const action = getEventInfo(log.esemeny_tipus, log.entitas_tipus)
      const entity = getEntityInfo(log.entitas_tipus)
      const note = cleanNote(log.megjegyzes) || ""
      const ip = log.ip_cim || ""

      return [
        companyName,
        dateStr,
        user,
        role,
        action.category,
        action.label,
        entity.category,
        entity.label,
        note,
        ip
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(";")
    })

    const csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const now = format(new Date(), "yyyyMMdd_HHmm")
    const safeCompanyName = companyName.toLowerCase().replace(/[^a-z0-9]/g, "_")
    link.setAttribute("href", url)
    link.setAttribute("download", `eaisyhr_audit_${safeCompanyName}_${now}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Audit napló sikeresen exportálva CSV formátumban!")
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── Fejléc ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
            Minden kritikus rendszeresemény, adatmódosítás és személyes adatfeloldás visszakövethető, append-only naplója (GDPR megfelelőség).
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchLogs} 
            disabled={loading || isSwitching}
            className="gap-1.5 h-8 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || isSwitching ? "animate-spin" : ""}`} />
            Frissítés
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCsv}
            disabled={loading || isSwitching || filteredLogs.length === 0}
            className="gap-1.5 h-8 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            CSV Export
          </Button>
        </div>
      </div>

      {/* ── KPI Statisztikai Kártyák (Linear Flat Grid) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Összes Audit Esemény"
          value={kpiStats.total}
          sub="Visszavonhatatlan bejegyzések száma"
        />
        <KpiCard
          label="Érzékeny Adat Betekintés"
          value={kpiStats.secretAccessCount}
          sub="TAJ, adó, bankszámla, bér feloldások"
          highlight={kpiStats.secretAccessCount > 0}
        />
        <KpiCard
          label="Módosítások & Törlések"
          value={kpiStats.modificationsCount}
          sub="Mezőszintű változáskövetés"
        />
        <KpiCard
          label="Közreműködő Felhasználók"
          value={kpiStats.uniqueUsersCount}
          sub="HR munkatársak és adminisztrátorok"
        />
      </div>

      {/* ── Fő Táblázat Kártya ── */}
      <Card className="border border-border/80 shadow-none overflow-hidden">
        <div className="p-4 border-b bg-muted/10 space-y-3">
          {/* Kanonikus TableToolbar keresővel, oszlopválasztóval, dátumtartománnyal és szűrőcsoportokkal */}
          <TableToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Keresés esemény, felhasználó, modul vagy indoklás alapján..."
            columns={columns}
            onToggleColumn={handleToggleColumn}
            filterGroups={filterGroups}
            activeFiltersCount={activeFiltersCount}
            onClearFilters={clearAllFilters}
            dateRange={dateRange}
          />

          {/* Gyors időszaki szűrőpillék */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium mr-1">
              <Calendar className="w-3 h-3" /> Időszak:
            </span>
            <button
              onClick={() => { setDateFrom(""); setDateTo("") }}
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
                const d = new Date()
                d.setDate(d.getDate() - 7)
                setDateFrom(d.toISOString().slice(0, 10))
                setDateTo(new Date().toISOString().slice(0, 10))
              }}
              className="text-xs px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              Elmúlt 7 nap
            </button>
            <button
              onClick={() => {
                const d = new Date()
                d.setDate(d.getDate() - 30)
                setDateFrom(d.toISOString().slice(0, 10))
                setDateTo(new Date().toISOString().slice(0, 10))
              }}
              className="text-xs px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              Elmúlt 30 nap
            </button>
          </div>
        </div>

        {/* ── Eseménynapló Táblázat ── */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  {isColVisible("datum") && (
                    <TableHead className="w-[170px] text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Dátum és Időpont
                    </TableHead>
                  )}
                  {isColVisible("felhasznalo") && (
                    <TableHead className="w-[200px] text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Felhasználó
                    </TableHead>
                  )}
                  {isColVisible("tipus") && (
                    <TableHead className="w-[140px] text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Művelet
                    </TableHead>
                  )}
                  {isColVisible("entitas") && (
                    <TableHead className="w-[200px] text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Modul / Entitás
                    </TableHead>
                  )}
                  {isColVisible("reszletek") && (
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Esemény részletei
                    </TableHead>
                  )}
                  {isColVisible("muveletek") && (
                    <TableHead className="w-[90px] text-right text-xs font-medium uppercase tracking-wider text-muted-foreground pr-4">
                      Részletek
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading || isSwitching ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 opacity-50" />
                      Audit napló betöltése folyamatban...
                    </TableCell>
                  </TableRow>
                ) : !selectedCompany ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Building2 className="w-5 h-5 mx-auto mb-2 opacity-50" />
                      Válassz ki egy céget a felső menüben az eseménynapló megtekintéséhez.
                    </TableCell>
                  </TableRow>
                ) : paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      {activeFiltersCount > 0 || searchTerm ? (
                        <div className="space-y-2">
                          <p className="font-medium text-foreground">
                            Nincs a szűrésnek megfelelő audit esemény a(z) {selectedCompany.name} cégben.
                          </p>
                          <p className="text-xs">Próbáld meg törölni a szűrőket vagy módosítani a keresőszót.</p>
                          <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-2 text-xs h-7">
                            Szűrők törlése
                          </Button>
                        </div>
                      ) : (
                        `Nincs rögzített audit esemény a(z) ${selectedCompany.name} cég naplójában.`
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => {
                    const action = getEventInfo(log.esemeny_tipus, log.entitas_tipus)
                    const entity = getEntityInfo(log.entitas_tipus)
                    const note = cleanNote(log.megjegyzes)
                    const isSecret = log.entitas_tipus === "hr_dolgozo_titkos_adat"

                    return (
                      <TableRow 
                        key={log.id} 
                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                        onClick={() => {
                          setSelectedLog(log)
                          setIsDetailOpen(true)
                        }}
                      >
                        {/* Dátum */}
                        {isColVisible("datum") && (
                          <TableCell className="text-xs tabular-nums font-mono whitespace-nowrap text-muted-foreground">
                            {format(new Date(log.created_at), "yyyy. MM. dd. HH:mm:ss", { locale: hu })}
                          </TableCell>
                        )}

                        {/* Felhasználó */}
                        {isColVisible("felhasznalo") && (
                          <TableCell>
                            {log.felhasznalo_profil ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-xs text-foreground flex items-center gap-1">
                                  <User className="w-3 h-3 text-muted-foreground shrink-0" />
                                  {log.felhasznalo_profil.nev}
                                </span>
                                <span className="text-[11px] text-muted-foreground pl-4">
                                  {log.felhasznalo_profil.hr_szerepkor || "Munkatárs"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3" /> Rendszer
                              </span>
                            )}
                          </TableCell>
                        )}

                        {/* Művelet / Típus */}
                        {isColVisible("tipus") && (
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`text-xs gap-1 font-medium ${action.badgeClass}`}
                            >
                              {getActionIcon(action.category)}
                              {action.label}
                            </Badge>
                          </TableCell>
                        )}

                        {/* Modul / Entitás */}
                        {isColVisible("entitas") && (
                          <TableCell>
                            <div className="flex flex-col">
                              <span className={`text-xs font-medium ${isSecret ? "text-info font-semibold" : "text-foreground"}`}>
                                {entity.label}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {entity.category}
                              </span>
                            </div>
                          </TableCell>
                        )}

                        {/* Esemény részletei */}
                        {isColVisible("reszletek") && (
                          <TableCell>
                            <div className="flex items-start gap-1.5 text-xs text-foreground/90 max-w-md truncate">
                              <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                              <span className="truncate" title={note || ""}>
                                {note || "Nincs további megjegyzés rögzítve"}
                              </span>
                            </div>
                          </TableCell>
                        )}

                        {/* Műveletek */}
                        {isColVisible("muveletek") && (
                          <TableCell className="text-right pr-4">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 px-2 text-xs text-muted-foreground group-hover:text-primary transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedLog(log)
                                setIsDetailOpen(true)
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
          </div>

          {/* ── Lapozó sáv ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t bg-muted/10 gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>
                Megjelenítve: {filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} –{" "}
                {Math.min(currentPage * pageSize, filteredLogs.length)} / {filteredLogs.length} bejegyzés
              </span>
              <span className="text-border">|</span>
              <div className="flex items-center gap-1.5">
                <span>Sor / oldal:</span>
                <select 
                  value={pageSize} 
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="h-7 text-xs rounded border border-border bg-background px-1.5 focus:outline-hidden"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> Előző
              </Button>
              <span className="px-2 font-medium text-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Következő <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Részletek Dialógus (Audit Esemény Részletei) ── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
          {selectedLog && (() => {
            const action = getEventInfo(selectedLog.esemeny_tipus, selectedLog.entitas_tipus)
            const entity = getEntityInfo(selectedLog.entitas_tipus)
            const note = cleanNote(selectedLog.megjegyzes)
            const hasDiff = selectedLog.esemeny_tipus === "modositas" && selectedLog.regi_adat && selectedLog.uj_adat

            return (
              <>
                <DialogHeader className="border-b pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-xs gap-1 font-medium ${action.badgeClass}`}>
                      {getActionIcon(action.category)}
                      {action.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {selectedLog.esemeny_tipus}
                    </span>
                  </div>
                  <DialogTitle className="text-base font-semibold">
                    {entity.label}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Rögzítve: {format(new Date(selectedLog.created_at), "yyyy. MMMM d., HH:mm:ss", { locale: hu })}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-3 text-xs">
                  {/* Felhasználó és Entitás adatok */}
                  <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                    <div>
                      <span className="text-muted-foreground font-medium block mb-0.5">Végrehajtó felhasználó:</span>
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        {selectedLog.felhasznalo_profil?.nev || "Rendszer"}
                      </p>
                      {selectedLog.felhasznalo_profil?.pozicio && (
                        <p className="text-muted-foreground text-[11px] mt-0.5">
                          Pozíció: {selectedLog.felhasznalo_profil.pozicio}
                        </p>
                      )}
                      <p className="text-muted-foreground text-[11px]">
                        Szerepkör: {selectedLog.felhasznalo_profil?.hr_szerepkor || "Munkatárs"}
                      </p>
                    </div>

                    <div>
                      <span className="text-muted-foreground font-medium block mb-0.5">Érintett Cég & Modul:</span>
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                        {entity.label}
                      </p>
                      {selectedCompany && (
                        <p className="text-muted-foreground text-[11px] flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-primary shrink-0" />
                          {selectedCompany.name}
                        </p>
                      )}
                      <p className="text-muted-foreground text-[11px] font-mono mt-0.5">
                        Tábla: {selectedLog.entitas_tipus}
                      </p>
                      {selectedLog.entitas_id && (
                        <p className="text-muted-foreground text-[11px] font-mono truncate" title={selectedLog.entitas_id}>
                          ID: {selectedLog.entitas_id}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Indoklás / Megjegyzés */}
                  {note && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium block">Részletes leírás / Indoklás:</span>
                      <div className="p-3 bg-muted/20 border rounded-md text-foreground">
                        {note}
                      </div>
                    </div>
                  )}

                  {/* Mezőszintű változáskövetés (diff tábla) */}
                  {hasDiff && (
                    <div className="space-y-2">
                      <span className="text-muted-foreground font-medium block">Módosult adatmezők:</span>
                      <div className="border rounded-md overflow-hidden bg-background">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/40 border-b text-muted-foreground">
                            <tr>
                              <th className="text-left p-2 font-medium">Mező</th>
                              <th className="text-left p-2 font-medium">Korábbi érték</th>
                              <th className="text-left p-2 font-medium">Új érték</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {Object.keys(selectedLog.uj_adat).map(key => {
                              const oldVal = selectedLog.regi_adat[key]
                              const newVal = selectedLog.uj_adat[key]
                              if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                                const label = FIELD_LABELS[key] || key
                                return (
                                  <tr key={key} className="hover:bg-muted/10">
                                    <td className="p-2 font-medium text-foreground">{label}</td>
                                    <td className="p-2 text-destructive line-through decoration-destructive/50 break-all font-mono">
                                      {typeof oldVal === "object" ? JSON.stringify(oldVal) : String(oldVal || "-")}
                                    </td>
                                    <td className="p-2 text-success font-semibold break-all font-mono">
                                      {typeof newVal === "object" ? JSON.stringify(newVal) : String(newVal || "-")}
                                    </td>
                                  </tr>
                                )
                              }
                              return null
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Technikai Metaadatok (IP, Böngésző) */}
                  {(selectedLog.ip_cim || selectedLog.bongeszo_info) && (
                    <div className="pt-2 border-t text-[11px] text-muted-foreground space-y-1">
                      {selectedLog.ip_cim && (
                        <p><span className="font-medium">IP Cím:</span> {selectedLog.ip_cim}</p>
                      )}
                      {selectedLog.bongeszo_info && (
                        <p className="truncate" title={selectedLog.bongeszo_info}>
                          <span className="font-medium">Böngésző kliens:</span> {selectedLog.bongeszo_info}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
