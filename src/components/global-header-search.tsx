"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  quickSearch,
  searchDocuments,
  saveSearch,
  getSavedSearches,
  deleteSavedSearch,
  toggleSavedSearchAlert,
} from "@/app/search/actions"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  Search,
  FolderOpen,
  FileText,
  Users,
  ArrowRight,
  Loader2,
  SlidersHorizontal,
  X,
  Bookmark,
  History,
  RotateCcw,
  Trash2,
  ChevronRight,
  FileSearch,
  Bell,
  BellOff,
  Sparkles,
  Calendar,
  Building2,
  Hash,
  Check,
  Filter,
  Lock,
  Inbox,
} from "lucide-react"
import { toast } from "sonner"

// ─── Filter Types & Constants ──────────────────────────────────────────────────

export interface SearchFilters {
  minosites: string
  irany: string
  iktatoszam: string
  erkeztetoszam: string
  dateFrom: string
  dateTo: string
  partner: string
}

const defaultFilters: SearchFilters = {
  minosites: "all",
  irany: "all",
  iktatoszam: "",
  erkeztetoszam: "",
  dateFrom: "",
  dateTo: "",
  partner: "",
}

const iranyOptions = [
  { value: "all", label: "Minden irány" },
  { value: "bejovo", label: "Bejövő" },
  { value: "kimeno", label: "Kimenő" },
  { value: "belso", label: "Belső" },
]

const minositesOptions = [
  { value: "all", label: "Minden minősítés" },
  { value: "nyilt", label: "Nyílt" },
  { value: "belso", label: "Belső használatra" },
  { value: "bizalmas", label: "Bizalmas" },
  { value: "szigoruan_bizalmas", label: "Szigorúan bizalmas" },
]

function iranyBadgeClass(irany: string | null) {
  switch (irany) {
    case "bejovo":
      return "bg-info-subtle text-info border-info/20"
    case "kimeno":
      return "bg-success-subtle text-success border-success/20"
    case "belso":
      return "bg-warning-subtle text-warning border-warning/20"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

function iranyText(irany: string | null) {
  const opt = iranyOptions.find((o) => o.value === (irany ?? ""))
  return opt ? opt.label : irany ?? "—"
}

function minositesText(minosites: string | null) {
  const opt = minositesOptions.find((o) => o.value === (minosites ?? ""))
  return opt ? opt.label : minosites ?? "—"
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

// ─── Main Content Component ───────────────────────────────────────────────────

function GlobalHeaderSearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters)
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(defaultFilters)

  // Drawer / View toggles
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [isSaveInlineOpen, setIsSaveInlineOpen] = useState(false)

  // Save Search inputs
  const [saveName, setSaveName] = useState("")
  const [saveAlert, setSaveAlert] = useState(false)
  const [saving, setSaving] = useState(false)

  // Data states
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [deepResults, setDeepResults] = useState<any[]>([])
  const [quickResults, setQuickResults] = useState<{
    dossiers: any[]
    documents: any[]
    partners: any[]
  }>({ dossiers: [], documents: [], partners: [] })

  // History & saved
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [savedSearches, setSavedSearches] = useState<any[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)

  // ── Keyboard shortcut: Ctrl+K / Cmd+K ──────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    const handleCustomOpen = (e: any) => {
      setOpen(true)
      if (e.detail?.query) {
        setQuery(e.detail.query)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("eaisydocs:open-search", handleCustomOpen)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("eaisydocs:open-search", handleCustomOpen)
    }
  }, [])


  // ── Load recent searches and saved searches ────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("eaisydocs_recent_searches")
      if (raw) setRecentSearches(JSON.parse(raw))
    } catch {}
    getSavedSearches().then(setSavedSearches).catch(console.error)
  }, [])

  // ── Focus handling on open ─────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60)
    } else {
      setIsFilterPanelOpen(false)
      setIsSaveInlineOpen(false)
    }
  }, [open])

  // ── Recent search helpers ──────────────────────────────────────────────────
  const addRecent = (term: string) => {
    const clean = term.trim()
    if (!clean) return
    const updated = [clean, ...recentSearches.filter((s) => s !== clean)].slice(0, 8)
    setRecentSearches(updated)
    try {
      localStorage.setItem("eaisydocs_recent_searches", JSON.stringify(updated))
    } catch {}
  }

  const removeSingleRecent = (term: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = recentSearches.filter((s) => s !== term)
    setRecentSearches(updated)
    try {
      localStorage.setItem("eaisydocs_recent_searches", JSON.stringify(updated))
    } catch {}
  }

  const clearRecent = () => {
    setRecentSearches([])
    try {
      localStorage.removeItem("eaisydocs_recent_searches")
    } catch {}
  }

  // ── Deep Search ────────────────────────────────────────────────────────────
  const performDeepSearch = useCallback(
    async (q: string = query, f: SearchFilters = filters) => {
      setLoading(true)
      setHasSearched(true)
      if (q.trim()) addRecent(q.trim())

      try {
        const [deepRes, quickRes] = await Promise.all([
          searchDocuments(q, f),
          q.trim().length >= 2 ? quickSearch(q) : Promise.resolve({ dossiers: [], documents: [], partners: [] }),
        ])

        if (deepRes.error) {
          toast.error("Keresési hiba", { description: deepRes.error })
          setDeepResults([])
        } else {
          setDeepResults(deepRes.data || [])
        }
        setQuickResults(quickRes)
      } catch (err) {
        console.error("Deep search error:", err)
        toast.error("Nem sikerült végrehajtani a keresést")
        setDeepResults([])
      } finally {
        setLoading(false)
        setSelectedIndex(0)
      }
    },
    [query, filters, recentSearches]
  )

  // ── Read URL query parameter if present ────────────────────────────────────
  useEffect(() => {
    const qParam = searchParams.get("q")
    if (qParam?.trim()) {
      setQuery(qParam)
      setOpen(true)
      performDeepSearch(qParam, defaultFilters)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // ── Debounced Quick Search (while typing) ──────────────────────────────────
  useEffect(() => {
    if (!open) return
    const clean = query.trim()

    if (!clean && Object.values(filters).every((v) => !v || v === "all")) {
      setQuickResults({ dossiers: [], documents: [], partners: [] })
      setDeepResults([])
      setHasSearched(false)
      setLoading(false)
      return
    }

    if (clean.length < 2 && Object.values(filters).every((v) => !v || v === "all")) {
      return
    }

    setLoading(true)
    const timeout = setTimeout(async () => {
      try {
        const [quickRes, deepRes] = await Promise.all([
          clean.length >= 2 ? quickSearch(clean) : Promise.resolve({ dossiers: [], documents: [], partners: [] }),
          searchDocuments(clean, filters),
        ])
        setQuickResults(quickRes)
        setDeepResults(deepRes.data || [])
        setHasSearched(true)
      } catch (err) {
        console.error("Instant search error:", err)
      } finally {
        setLoading(false)
        setSelectedIndex(0)
      }
    }, 240)

    return () => clearTimeout(timeout)
  }, [query, filters, open])

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNavigate = (url: string) => {
    setOpen(false)
    router.push(url)
  }

  // ── Date Presets ───────────────────────────────────────────────────────────
  const applyDatePreset = (preset: "all" | "today" | "7days" | "month" | "year") => {
    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]

    if (preset === "all") {
      setDraftFilters((p) => ({ ...p, dateFrom: "", dateTo: "" }))
    } else if (preset === "today") {
      setDraftFilters((p) => ({ ...p, dateFrom: todayStr, dateTo: todayStr }))
    } else if (preset === "7days") {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      setDraftFilters((p) => ({ ...p, dateFrom: d.toISOString().split("T")[0], dateTo: todayStr }))
    } else if (preset === "month") {
      const d = new Date(today.getFullYear(), today.getMonth(), 1)
      setDraftFilters((p) => ({ ...p, dateFrom: d.toISOString().split("T")[0], dateTo: todayStr }))
    } else if (preset === "year") {
      const d = new Date(today.getFullYear(), 0, 1)
      setDraftFilters((p) => ({ ...p, dateFrom: d.toISOString().split("T")[0], dateTo: todayStr }))
    }
  }

  // ── Filter Actions ─────────────────────────────────────────────────────────
  const applyFilters = () => {
    setFilters(draftFilters)
    setIsFilterPanelOpen(false)
    performDeepSearch(query, draftFilters)
  }

  const resetFilters = () => {
    setDraftFilters(defaultFilters)
    setFilters(defaultFilters)
    setIsFilterPanelOpen(false)
    performDeepSearch(query, defaultFilters)
  }

  const removeFilter = (key: keyof SearchFilters) => {
    const updated = { ...filters, [key]: defaultFilters[key] }
    setFilters(updated)
    setDraftFilters(updated)
    performDeepSearch(query, updated)
  }

  const removeDateFilter = () => {
    const updated = { ...filters, dateFrom: "", dateTo: "" }
    setFilters(updated)
    setDraftFilters(updated)
    performDeepSearch(query, updated)
  }

  // ── Smart Workflow Shortcuts ───────────────────────────────────────────────
  const handleSmartPreset = (preset: "today_inbox" | "confidential" | "dossiers") => {
    if (preset === "today_inbox") {
      const todayStr = new Date().toISOString().split("T")[0]
      const next = { ...defaultFilters, irany: "bejovo", dateFrom: todayStr, dateTo: todayStr }
      setFilters(next)
      setDraftFilters(next)
      performDeepSearch(query, next)
      toast.info("Mai bejövő iratok szűrő alkalmazva")
    } else if (preset === "confidential") {
      const next = { ...defaultFilters, minosites: "bizalmas" }
      setFilters(next)
      setDraftFilters(next)
      performDeepSearch(query, next)
      toast.info("Bizalmas iratok szűrő alkalmazva")
    } else if (preset === "dossiers") {
      setOpen(false)
      router.push("/dossiers")
    }
  }

  // ── Saved Search & Alerts ──────────────────────────────────────────────────
  const handleSaveSearch = async () => {
    if (!saveName.trim()) {
      toast.error("Adj meg egy nevet a keresési profilnak!")
      return
    }
    setSaving(true)
    const res = await saveSearch(saveName.trim(), query, filters, saveAlert)
    if (res.success) {
      toast.success(saveAlert ? "Keresési profil és riasztás elmentve!" : "Keresési profil elmentve!")
      setIsSaveInlineOpen(false)
      setSaveName("")
      setSaveAlert(false)
      getSavedSearches().then(setSavedSearches).catch(console.error)
    } else {
      toast.error("Mentés sikertelen", { description: res.error })
    }
    setSaving(false)
  }

  const toggleAlert = async (id: string, current: boolean, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !current
    const res = await toggleSavedSearchAlert(id, next)
    if (res.success) {
      toast.success(next ? "Értesítési riasztás bekapcsolva" : "Értesítés kikapcsolva")
      setSavedSearches((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ertesites_bekapcsolva: next } : s))
      )
    } else {
      toast.error("Nem sikerült módosítani az értesítést")
    }
  }

  const loadSaved = (saved: any) => {
    const p = saved.kereso_parameterek || {}
    const q = p.query || ""
    const f = { ...defaultFilters, ...(p.filters || {}) }
    setQuery(q)
    setFilters(f)
    setDraftFilters(f)
    setIsFilterPanelOpen(false)
    performDeepSearch(q, f)
    toast.info(`„${saved.nev}” keresési profil betöltve`)
  }

  const deleteSaved = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const res = await deleteSavedSearch(id)
    if (res.success) {
      toast.success("Mentett keresési profil törölve")
      setSavedSearches((prev) => prev.filter((s) => s.id !== id))
    } else {
      toast.error("Törlés sikertelen")
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const activeFilterCount = Object.entries(filters).filter(([k, v]) =>
    k === "minosites" || k === "irany" ? v !== "all" : Boolean(v?.trim())
  ).length

  // Flattened items for keyboard navigation
  const flatDossiers = quickResults.dossiers.map((d) => ({
    id: `dossier-${d.id}`,
    url: `/dossiers/${d.id}`,
    title: d.iktatoszam || "Ügyirat",
    sub: d.ugy?.targy || "Névtelen ügyirat",
    type: "dossier",
  }))

  const flatPartners = quickResults.partners.map((p) => ({
    id: `partner-${p.id}`,
    url: `/partners/${p.id}`,
    title: p.nev,
    sub: p.email || (p.tipus === "maganszemely" ? "Magánszemély" : "Cég"),
    type: "partner",
  }))

  const flatDeepDocs = deepResults.map((item) => ({
    id: `doc-${item.id}`,
    url: item.ugyirat?.id ? `/dossiers/${item.ugyirat.id}` : `/inbox/${item.id}`,
    title: item.targy,
    sub: item.ugyirat?.iktatoszam || item.erkeztetoszam || "",
    type: "document",
    item,
  }))

  const allNavItems = [...flatDossiers, ...flatPartners, ...flatDeepDocs]

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1 < allNavItems.length ? prev + 1 : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : allNavItems.length - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (allNavItems.length > 0 && allNavItems[selectedIndex]) {
        handleNavigate(allNavItems[selectedIndex].url)
      } else {
        performDeepSearch(query, filters)
      }
    } else if (e.key === "Escape") {
      if (isFilterPanelOpen) setIsFilterPanelOpen(false)
      else if (isSaveInlineOpen) setIsSaveInlineOpen(false)
      else setOpen(false)
    }
  }

  return (
    <>
      {/* ── Top-Right Header Trigger Button ── */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-8 px-2.5 sm:px-3 text-xs bg-muted/40 hover:bg-muted/70 border border-border/60 hover:border-border rounded-lg text-muted-foreground flex items-center gap-2 transition-all cursor-pointer w-auto sm:w-56 md:w-64 justify-between group"
        title="Dokumentumkereső és Szűrőközpont (Ctrl + K)"
      >
        <div className="flex items-center gap-2 truncate">
          <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="hidden sm:inline truncate">Keresés...</span>
        </div>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/70 bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground group-hover:text-foreground">
          <span className="text-xs">Ctrl</span>K
        </kbd>
      </button>

      {/* ── Spotlight Command Palette Modal ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[780px] md:max-w-[840px] w-full p-0 overflow-hidden gap-0 border border-border/80 rounded-2xl bg-card min-h-[460px] max-h-[85vh] flex flex-col shadow-2xl dark:ring-1 dark:ring-white/10"
        >
          <DialogTitle className="sr-only">Dokumentum kereső és szűrőközpont</DialogTitle>

          {/* ══════════════════════════════════════════════════════════════════
              HEADER SEARCH INPUT BAR
          ══════════════════════════════════════════════════════════════════ */}
          <div className="flex items-center px-4 border-b border-border/70 bg-background h-14 shrink-0 gap-3">
            <Search className="h-4.5 w-4.5 text-muted-foreground/80 shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Keresés iratok, ügyiratok vagy partnerek között..."
              className="border-0 shadow-none focus-visible:ring-0 text-sm h-full px-1 bg-transparent placeholder:text-muted-foreground/60 flex-1 font-normal"
            />

            {/* Clear Query Button */}
            {query.trim() && (
              <button
                type="button"
                onClick={() => {
                  setQuery("")
                  inputRef.current?.focus()
                }}
                className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors cursor-pointer"
                title="Keresőszó törlése"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Loading Indicator */}
            {loading && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}

            {/* Filter Toggle Button */}
            <Button
              type="button"
              variant={isFilterPanelOpen || activeFilterCount > 0 ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setDraftFilters(filters)
                setIsFilterPanelOpen((v) => !v)
                setIsSaveInlineOpen(false)
              }}
              className={cn(
                "h-8 gap-1.5 text-xs font-medium px-2.5 rounded-lg transition-all cursor-pointer",
                activeFilterCount > 0 && "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Szűrők</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground tabular-nums">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-md transition-colors ml-1 cursor-pointer"
              title="Bezárás (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              ALWAYS-VISIBLE QUICK FILTER PILLS BAR
          ══════════════════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/60 bg-muted/20 text-xs overflow-x-auto shrink-0 select-none">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3 text-primary" />
              Gyors szűrés:
            </span>

            {/* Quick Pill: Irány (Click to cycle) */}
            <button
              type="button"
              onClick={() => {
                const order = ["all", "bejovo", "kimeno", "belso"]
                const nextIdx = (order.indexOf(filters.irany) + 1) % order.length
                const next = order[nextIdx]
                const updated = { ...filters, irany: next }
                setFilters(updated)
                setDraftFilters(updated)
                performDeepSearch(query, updated)
              }}
              title="Kattints az irány váltásához"
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer",
                filters.irany !== "all"
                  ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                  : "bg-background border-border/70 text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Irány: {iranyText(filters.irany)}</span>
            </button>

            {/* Quick Pill: Minősítés (Click to cycle) */}
            <button
              type="button"
              onClick={() => {
                const order = ["all", "nyilt", "belso", "bizalmas", "szigoruan_bizalmas"]
                const nextIdx = (order.indexOf(filters.minosites) + 1) % order.length
                const next = order[nextIdx]
                const updated = { ...filters, minosites: next }
                setFilters(updated)
                setDraftFilters(updated)
                performDeepSearch(query, updated)
              }}
              title="Kattints a minősítés váltásához"
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer",
                filters.minosites !== "all"
                  ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                  : "bg-background border-border/70 text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Minősítés: {minositesText(filters.minosites)}</span>
            </button>

            {/* Quick Pill: Időszak */}
            <button
              type="button"
              onClick={() => {
                setDraftFilters(filters)
                setIsFilterPanelOpen(true)
              }}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer",
                filters.dateFrom || filters.dateTo
                  ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                  : "bg-background border-border/70 text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="h-3 w-3" />
              <span>
                {filters.dateFrom || filters.dateTo
                  ? `${filters.dateFrom || "..."} – ${filters.dateTo || "..."}`
                  : "Időszak..."}
              </span>
            </button>

            {/* Quick reset if any filter active */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="ml-auto text-xs text-muted-foreground hover:text-destructive font-medium inline-flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                title="Minden szűrő visszaállítása"
              >
                <X className="h-3 w-3" />
                <span>Szűrők törlése</span>
              </button>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              LINEAR-GRADE EXPANDABLE DETAILED FILTER PANEL
          ══════════════════════════════════════════════════════════════════ */}
          {isFilterPanelOpen && (
            <div className="border-b border-border/70 bg-muted/15 p-4 sm:p-5 animate-in fade-in slide-in-from-top-2 duration-150 shrink-0 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-primary" />
                  Részletes Keresési Szűrők
                </span>
                <button
                  type="button"
                  onClick={() => setIsFilterPanelOpen(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Elrejtés
                </button>
              </div>

              {/* Segmented Controls Row (Irány + Minősítés) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Irány Segmented Controls */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Irat iránya
                  </label>
                  <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-background p-1">
                    {iranyOptions.map((opt) => {
                      const isSelected = draftFilters.irany === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setDraftFilters((p) => ({ ...p, irany: opt.value }))}
                          className={cn(
                            "flex-1 text-center py-1 px-2 rounded-md text-xs font-medium transition-all cursor-pointer",
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Minősítés Segmented Controls */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Minősítés
                  </label>
                  <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-background p-1">
                    {minositesOptions.map((opt) => {
                      const isSelected = draftFilters.minosites === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setDraftFilters((p) => ({ ...p, minosites: opt.value }))}
                          className={cn(
                            "py-1 px-2 rounded-md text-xs font-medium transition-all cursor-pointer",
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Inputs Grid (Partner, Iktatószám, Érkeztetőszám) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Partner neve */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-primary" />
                    Partner neve
                  </label>
                  <div className="relative">
                    <Input
                      value={draftFilters.partner}
                      onChange={(e) => setDraftFilters((p) => ({ ...p, partner: e.target.value }))}
                      placeholder="Pl. Kovács Kft."
                      className="h-8 text-xs bg-background rounded-lg border-border/70 focus-visible:ring-1 focus-visible:ring-primary"
                    />
                    {draftFilters.partner && (
                      <button
                        type="button"
                        onClick={() => setDraftFilters((p) => ({ ...p, partner: "" }))}
                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Iktatószám */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Hash className="h-3 w-3 text-primary" />
                    Iktatószám
                  </label>
                  <div className="relative">
                    <Input
                      value={draftFilters.iktatoszam}
                      onChange={(e) => setDraftFilters((p) => ({ ...p, iktatoszam: e.target.value }))}
                      placeholder="Pl. HR/2026/..."
                      className="h-8 text-xs bg-background rounded-lg border-border/70 focus-visible:ring-1 focus-visible:ring-primary font-mono"
                    />
                    {draftFilters.iktatoszam && (
                      <button
                        type="button"
                        onClick={() => setDraftFilters((p) => ({ ...p, iktatoszam: "" }))}
                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Érkeztetőszám */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <FileText className="h-3 w-3 text-primary" />
                    Érkeztetőszám
                  </label>
                  <div className="relative">
                    <Input
                      value={draftFilters.erkeztetoszam}
                      onChange={(e) => setDraftFilters((p) => ({ ...p, erkeztetoszam: e.target.value }))}
                      placeholder="Pl. E/2026/00042"
                      className="h-8 text-xs bg-background rounded-lg border-border/70 focus-visible:ring-1 focus-visible:ring-primary font-mono"
                    />
                    {draftFilters.erkeztetoszam && (
                      <button
                        type="button"
                        onClick={() => setDraftFilters((p) => ({ ...p, erkeztetoszam: "" }))}
                        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Dátum & Gyors gombok */}
              <div className="space-y-1.5 pt-1 border-t border-border/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-primary" />
                    Érkezési időszak
                  </label>

                  {/* Gyors időszak gombok */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => applyDatePreset("all")}
                      className="text-[10px] px-2 py-0.5 rounded border border-border/60 hover:bg-muted font-medium transition-colors text-muted-foreground cursor-pointer"
                    >
                      Összes
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset("today")}
                      className="text-[10px] px-2 py-0.5 rounded border border-border/60 hover:bg-muted font-medium transition-colors text-muted-foreground cursor-pointer"
                    >
                      Ma
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset("7days")}
                      className="text-[10px] px-2 py-0.5 rounded border border-border/60 hover:bg-muted font-medium transition-colors text-muted-foreground cursor-pointer"
                    >
                      7 nap
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset("month")}
                      className="text-[10px] px-2 py-0.5 rounded border border-border/60 hover:bg-muted font-medium transition-colors text-muted-foreground cursor-pointer"
                    >
                      Ez a hónap
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset("year")}
                      className="text-[10px] px-2 py-0.5 rounded border border-border/60 hover:bg-muted font-medium transition-colors text-muted-foreground cursor-pointer"
                    >
                      Idén
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 max-w-sm">
                  <Input
                    type="date"
                    value={draftFilters.dateFrom}
                    onChange={(e) => setDraftFilters((p) => ({ ...p, dateFrom: e.target.value }))}
                    className="h-8 text-xs bg-background rounded-lg border-border/70"
                  />
                  <span className="text-xs text-muted-foreground font-medium">–</span>
                  <Input
                    type="date"
                    value={draftFilters.dateTo}
                    onChange={(e) => setDraftFilters((p) => ({ ...p, dateTo: e.target.value }))}
                    className="h-8 text-xs bg-background rounded-lg border-border/70"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Alaphelyzet
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFilterPanelOpen(false)}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Mégse
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={applyFilters}
                    className="h-8 px-4 text-xs font-medium gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Szűrők alkalmazása
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              INLINE SAVE SEARCH CARD
          ══════════════════════════════════════════════════════════════════ */}
          {isSaveInlineOpen && (
            <div className="border-b border-border/70 bg-primary/5 p-4 sm:p-5 animate-in fade-in slide-in-from-top-2 duration-150 shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Bookmark className="h-3.5 w-3.5 text-primary" />
                  Keresési profil és automatikus értesítés mentése
                </span>
                <button
                  type="button"
                  onClick={() => setIsSaveInlineOpen(false)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Mégse
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Profil elnevezése
                  </label>
                  <Input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Pl. Havi szerződések — Kovács Kft."
                    className="h-8 text-xs bg-background rounded-lg"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveSearch()
                    }}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3">
                  <div className="space-y-0.5 pr-3">
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Bell className="h-3.5 w-3.5 text-primary" />
                      <span>Értesítés kérése új találat esetén</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      In-app értesítést kapsz a harang menüben, amikor új, a feltételeknek megfelelő irat érkezik.
                    </p>
                  </div>
                  <Switch checked={saveAlert} onCheckedChange={setSaveAlert} />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSaveInlineOpen(false)}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Mégse
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveSearch}
                    disabled={saving}
                    className="h-8 text-xs font-medium gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5" />}
                    Mentés
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ACTIVE FILTER CHIPS BAR
          ══════════════════════════════════════════════════════════════════ */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-border/50 bg-muted/10 shrink-0">
              <span className="text-[11px] font-medium text-muted-foreground mr-1">Aktív szűrők:</span>

              {filters.partner && (
                <FilterChip
                  label={`Partner: ${filters.partner}`}
                  onRemove={() => removeFilter("partner")}
                />
              )}
              {filters.iktatoszam && (
                <FilterChip
                  label={`Iktatószám: ${filters.iktatoszam}`}
                  onRemove={() => removeFilter("iktatoszam")}
                />
              )}
              {filters.erkeztetoszam && (
                <FilterChip
                  label={`Érkeztetőszám: ${filters.erkeztetoszam}`}
                  onRemove={() => removeFilter("erkeztetoszam")}
                />
              )}
              {filters.irany !== "all" && (
                <FilterChip
                  label={`Irány: ${iranyText(filters.irany)}`}
                  onRemove={() => removeFilter("irany")}
                />
              )}
              {filters.minosites !== "all" && (
                <FilterChip
                  label={`Minősítés: ${minositesText(filters.minosites)}`}
                  onRemove={() => removeFilter("minosites")}
                />
              )}
              {(filters.dateFrom || filters.dateTo) && (
                <FilterChip
                  label={`Dátum: ${filters.dateFrom || "..."} – ${filters.dateTo || "..."}`}
                  onRemove={removeDateFilter}
                />
              )}

              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1 cursor-pointer transition-colors"
              >
                Összes törlése
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              MAIN SCROLLABLE RESULTS BODY
          ══════════════════════════════════════════════════════════════════ */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">

            {/* ── State 1: Empty Query and No Active Filters ── */}
            {!query.trim() && activeFilterCount === 0 && (
              <div className="space-y-6 py-1">

                {/* 1. Legutóbbi keresések */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-0.5 mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <History className="h-3.5 w-3.5 text-primary" />
                        Legutóbbi kereséseid
                      </div>
                      <button
                        type="button"
                        onClick={clearRecent}
                        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        Összes törlése
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((term) => (
                        <div
                          key={term}
                          onClick={() => {
                            setQuery(term)
                            performDeepSearch(term, filters)
                          }}
                          className="group/chip inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all cursor-pointer"
                        >
                          <Search className="h-3 w-3 text-muted-foreground group-hover/chip:text-primary" />
                          <span>{term}</span>
                          <button
                            type="button"
                            onClick={(e) => removeSingleRecent(term, e)}
                            className="p-0.5 text-muted-foreground/60 hover:text-destructive opacity-0 group-hover/chip:opacity-100 transition-opacity ml-1"
                            title="Törlés az előzményekből"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Mentett keresések és Alertek — Prominensen a kezdőképernyőn */}
                {savedSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-0.5 mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Bookmark className="h-3.5 w-3.5 text-primary" />
                        Mentett kereséseid & Értesítési Alertek
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {savedSearches.length} profil
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {savedSearches.map((s) => {
                        const isAlertOn = Boolean(s.ertesites_bekapcsolva)
                        const p = s.kereso_parameterek || {}
                        return (
                          <div
                            key={s.id}
                            onClick={() => loadSaved(s)}
                            className="group flex flex-col justify-between p-3 rounded-xl bg-background border border-border/70 hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                  {s.nev}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                  {p.query ? `Keresőszó: „${p.query}”` : "Összetett szűrt lista"}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => deleteSaved(s.id, e)}
                                title="Mentett keresés törlése"
                                className="p-1 rounded text-muted-foreground/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>

                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                {p.filters?.irany && p.filters.irany !== "all" && (
                                  <Badge variant="outline" className="text-[9px] py-0 px-1">
                                    {iranyText(p.filters.irany)}
                                  </Badge>
                                )}
                                {p.filters?.minosites && p.filters.minosites !== "all" && (
                                  <Badge variant="outline" className="text-[9px] py-0 px-1">
                                    {minositesText(p.filters.minosites)}
                                  </Badge>
                                )}
                              </div>

                              {/* Alert pill toggle */}
                              <button
                                type="button"
                                onClick={(e) => toggleAlert(s.id, isAlertOn, e)}
                                title={isAlertOn ? "Értesítés bekapcsolva — kattints a leállításhoz" : "Értesítés kikapcsolva — kattints a bekapcsoláshoz"}
                                className={cn(
                                  "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all cursor-pointer",
                                  isAlertOn
                                    ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                                    : "bg-muted/50 border-border/80 text-muted-foreground hover:text-foreground"
                                )}
                              >
                                {isAlertOn ? (
                                  <>
                                    <span className="relative flex h-1.5 w-1.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                                    </span>
                                    <Bell className="h-2.5 w-2.5 text-primary" />
                                    <span>Alert aktív</span>
                                  </>
                                ) : (
                                  <>
                                    <BellOff className="h-2.5 w-2.5" />
                                    <span>Nincs alert</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Intelligens gyors-szűrők (1-click work flows) */}
                <div>
                  <div className="px-0.5 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Intelligens gyors-szűrők
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSmartPreset("today_inbox")}
                      className="flex items-start gap-3 p-3 rounded-xl border border-border/70 hover:border-primary/50 hover:bg-muted/30 text-left transition-all cursor-pointer group shadow-xs"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                        <Inbox className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          Mai bejövő iratok
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          A mai napon érkeztetett dokumentumok listája
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSmartPreset("confidential")}
                      className="flex items-start gap-3 p-3 rounded-xl border border-border/70 hover:border-primary/50 hover:bg-muted/30 text-left transition-all cursor-pointer group shadow-xs"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          Bizalmas iratok
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          Belső és bizalmas minősítésű iratok szűrése
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSmartPreset("dossiers")}
                      className="flex items-start gap-3 p-3 rounded-xl border border-border/70 hover:border-primary/50 hover:bg-muted/30 text-left transition-all cursor-pointer group shadow-xs"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <FolderOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          Iktatókönyv
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          Ügyiratok és iktatási napló megnyitása
                        </p>
                      </div>
                    </button>
                  </div>
                </div>



              </div>
            )}

            {/* ── State 2: Results Display ── */}
            {(query.trim().length >= 2 || activeFilterCount > 0) && (
              <>
                {/* 1. Instant Category Matches: Dossiers (Ügyiratok) */}
                {quickResults.dossiers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <FolderOpen className="h-3.5 w-3.5 text-primary" />
                      <span>Ügyiratok ({quickResults.dossiers.length})</span>
                    </div>
                    <div className="space-y-1.5 mt-1">
                      {quickResults.dossiers.map((dossier) => {
                        const targetUrl = `/dossiers/${dossier.id}`
                        return (
                          <button
                            key={dossier.id}
                            type="button"
                            onClick={() => handleNavigate(targetUrl)}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer border border-border/50 hover:border-primary/50 hover:bg-muted/40 group"
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                              <div className="truncate">
                                <span className="font-semibold text-xs text-primary mr-2 tabular-nums font-mono">
                                  {dossier.iktatoszam}
                                </span>
                                <span className="text-xs font-medium text-foreground truncate">
                                  {dossier.ugy?.targy || "Névtelen ügyirat"}
                                </span>
                              </div>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 shrink-0 transition-opacity ml-2" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Instant Category Matches: Partners (Partnerek) */}
                {quickResults.partners.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      <span>Partnerek ({quickResults.partners.length})</span>
                    </div>
                    <div className="space-y-1.5 mt-1">
                      {quickResults.partners.map((partner) => {
                        const targetUrl = `/partners/${partner.id}`
                        return (
                          <button
                            key={partner.id}
                            type="button"
                            onClick={() => handleNavigate(targetUrl)}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer border border-border/50 hover:border-primary/50 hover:bg-muted/40 group"
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                              <div className="truncate">
                                <span className="text-xs font-semibold text-foreground mr-2">
                                  {partner.nev}
                                </span>
                                {partner.adoszam && (
                                  <span className="text-[11px] text-muted-foreground mr-2 font-mono">
                                    {partner.adoszam}
                                  </span>
                                )}
                                {partner.email && (
                                  <span className="text-[11px] text-muted-foreground">
                                    {partner.email}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] capitalize shrink-0 ml-2">
                              {partner.tipus === "maganszemely" ? "Magánszemély" : "Cég"}
                            </Badge>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Deep FTS & Vector Document Results */}
                <div>
                  <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span>Iratok és dokumentumok ({deepResults.length})</span>
                    </div>
                    {query.trim() && (
                      <span className="text-[10px] font-normal normal-case text-muted-foreground">
                        Postgres FTS & Szemantikus kereső
                      </span>
                    )}
                  </div>

                  {deepResults.length > 0 ? (
                    <div className="space-y-2 mt-1">
                      {deepResults.map((item) => {
                        const targetUrl = item.ugyirat?.id
                          ? `/dossiers/${item.ugyirat.id}`
                          : `/inbox/${item.id}`

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleNavigate(targetUrl)}
                            className="w-full text-left p-3.5 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-muted/40 transition-all cursor-pointer group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                  {item.ugyirat?.iktatoszam ? (
                                    <span className="font-semibold text-xs text-primary tabular-nums font-mono">
                                      {item.ugyirat.iktatoszam}
                                    </span>
                                  ) : item.erkeztetoszam ? (
                                    <span className="text-xs font-mono text-muted-foreground">
                                      {item.erkeztetoszam}
                                    </span>
                                  ) : null}

                                  {item.match_type === "semantic" && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[9px] font-medium text-purple-600 dark:text-purple-400">
                                      <Sparkles className="h-2.5 w-2.5" />
                                      Szemantikus
                                    </span>
                                  )}
                                  {item.match_type === "hybrid" && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 text-[9px] font-medium text-teal-600 dark:text-teal-400">
                                      <Sparkles className="h-2.5 w-2.5" />
                                      Hibrid
                                    </span>
                                  )}

                                  <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.2 text-[9px] font-medium ${iranyBadgeClass(
                                      item.irany
                                    )}`}
                                  >
                                    {iranyText(item.irany)}
                                  </span>

                                  {item.partner?.nev && (
                                    <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                                      • {item.partner.nev}
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                  {item.targy}
                                </p>

                                {item.snippet && (
                                  <div
                                    className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed bg-muted/30 px-2.5 py-1.5 rounded-lg border border-border/40 font-normal [&>b]:text-primary [&>b]:font-semibold [&>b]:bg-primary/10 [&>b]:px-1 [&>b]:py-0.2 [&>b]:rounded"
                                    dangerouslySetInnerHTML={{ __html: item.snippet }}
                                  />
                                )}
                              </div>

                              <div className="flex flex-col items-end shrink-0 text-right ml-2">
                                <span className="text-[11px] tabular-nums text-muted-foreground">
                                  {formatDate(item.erkezes_datuma)}
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : !loading ? (
                    <div className="py-10 text-center text-xs text-muted-foreground">
                      <FileSearch className="h-8 w-8 mx-auto mb-2 opacity-25" />
                      <p className="font-medium text-foreground">Nincs találat a keresési feltételekre.</p>
                      <p className="text-[11px] text-muted-foreground/75 mt-1">
                        Próbálj másik kulcsszót vagy csökkentsd a megadott szűrőket!
                      </p>
                      {activeFilterCount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetFilters}
                          className="mt-3 text-xs cursor-pointer"
                        >
                          Szűrők törlése
                        </Button>
                      )}
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>

          {/* Modal bottom content ends cleanly without footer navigation hints */}
        </DialogContent>
      </Dialog>
    </>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-secondary/80 px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
        aria-label="Szűrő eltávolítása"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

export function GlobalHeaderSearch() {
  return (
    <Suspense
      fallback={
        <div className="h-8 w-24 sm:w-56 bg-muted/30 animate-pulse rounded-md border border-border/40" />
      }
    >
      <GlobalHeaderSearchContent />
    </Suspense>
  )
}
