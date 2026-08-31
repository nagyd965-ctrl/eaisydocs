"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  searchDocuments,
  quickSearch,
  saveSearch,
  getSavedSearches,
  deleteSavedSearch,
} from "./actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  SlidersHorizontal,
  X,
  FolderOpen,
  FileText,
  Users,
  Bookmark,
  History,
  ArrowRight,
  Loader2,
  RotateCcw,
  Trash2,
  ChevronRight,
  FileSearch,
} from "lucide-react"
import { toast } from "sonner"

// ─── Types ───────────────────────────────────────────────────────────────────

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

const iranyLabel: Record<string, string> = {
  all: "Minden irány",
  bejovo: "Bejövő",
  kimeno: "Kimenő",
  belso: "Belső",
}

const minositesLabel: Record<string, string> = {
  all: "Minden minősítés",
  nyilt: "Nyílt",
  belso: "Belső használatra",
  bizalmas: "Bizalmas",
  szigoruan_bizalmas: "Szigorúan bizalmas",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  return iranyLabel[irany ?? ""] ?? irany ?? "—"
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SearchClientPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams.get("q") || "")
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters)
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(defaultFilters)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Instant autocomplete
  const [showDrop, setShowDrop] = useState(false)
  const [instantData, setInstantData] = useState<{
    dossiers: any[]
    documents: any[]
    partners: any[]
  }>({ dossiers: [], documents: [], partners: [] })
  const [instantLoading, setInstantLoading] = useState(false)

  // Recent searches
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  // Saved searches
  const [savedSearches, setSavedSearches] = useState<any[]>([])
  const [isSaveOpen, setIsSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState("")
  const [saving, setSaving] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const raw = localStorage.getItem("eaisydocs_recent_searches")
      if (raw) setRecentSearches(JSON.parse(raw))
    } catch {}
    getSavedSearches().then(setSavedSearches).catch(console.error)
  }, [])

  useEffect(() => {
    const qParam = searchParams.get("q")
    if (qParam?.trim()) {
      setQuery(qParam)
      performSearch(qParam, defaultFilters)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Close autocomplete on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDrop(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Debounced instant search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setInstantData({ dossiers: [], documents: [], partners: [] })
      return
    }
    setInstantLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await quickSearch(query)
        setInstantData(res)
      } catch {
        setInstantData({ dossiers: [], documents: [], partners: [] })
      } finally {
        setInstantLoading(false)
      }
    }, 220)
    return () => clearTimeout(t)
  }, [query])

  // ── Actions ───────────────────────────────────────────────────────────────

  const addRecent = (term: string) => {
    const clean = term.trim()
    if (!clean) return
    const updated = [clean, ...recentSearches.filter(s => s !== clean)].slice(0, 8)
    setRecentSearches(updated)
    try {
      localStorage.setItem("eaisydocs_recent_searches", JSON.stringify(updated))
    } catch {}
  }

  const clearRecent = () => {
    setRecentSearches([])
    try { localStorage.removeItem("eaisydocs_recent_searches") } catch {}
  }

  const performSearch = useCallback(
    async (q: string = query, f: SearchFilters = filters) => {
      setShowDrop(false)
      setLoading(true)
      setHasSearched(true)
      if (q.trim()) addRecent(q.trim())
      try {
        const res = await searchDocuments(q, f)
        if (res.error) {
          toast.error("Keresési hiba", { description: res.error })
          setResults([])
        } else {
          setResults(res.data || [])
        }
      } catch {
        toast.error("Nem sikerült végrehajtani a keresést")
        setResults([])
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, filters]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); performSearch(query, filters) }
    if (e.key === "Escape") setShowDrop(false)
  }

  const applyFilters = () => {
    setFilters(draftFilters)
    setIsFilterOpen(false)
    performSearch(query, draftFilters)
  }

  const resetFilters = () => {
    setDraftFilters(defaultFilters)
    setFilters(defaultFilters)
    setIsFilterOpen(false)
    performSearch(query, defaultFilters)
  }

  const removeFilter = (key: keyof SearchFilters) => {
    const updated = { ...filters, [key]: defaultFilters[key] }
    setFilters(updated)
    setDraftFilters(updated)
    performSearch(query, updated)
  }

  const removeDateFilter = () => {
    const updated = { ...filters, dateFrom: "", dateTo: "" }
    setFilters(updated)
    setDraftFilters(updated)
    performSearch(query, updated)
  }

  const handleSave = async () => {
    if (!saveName.trim()) { toast.error("Adj meg egy nevet!"); return }
    setSaving(true)
    const res = await saveSearch(saveName.trim(), query, filters)
    if (res.success) {
      toast.success("Keresés elmentve!")
      setIsSaveOpen(false)
      setSaveName("")
      getSavedSearches().then(setSavedSearches).catch(console.error)
    } else {
      toast.error("Mentés sikertelen", { description: res.error })
    }
    setSaving(false)
  }

  const loadSaved = (saved: any) => {
    const p = saved.kereso_parameterek || {}
    const q = p.query || ""
    const f = { ...defaultFilters, ...(p.filters || {}) }
    setQuery(q)
    setFilters(f)
    setDraftFilters(f)
    performSearch(q, f)
    toast.info(`"${saved.nev}" keresés betöltve`)
  }

  const deleteSaved = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const res = await deleteSavedSearch(id)
    if (res.success) {
      toast.success("Mentett keresés törölve")
      setSavedSearches(prev => prev.filter(s => s.id !== id))
    } else {
      toast.error("Törlés sikertelen")
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const activeFilterCount = Object.entries(filters).filter(([k, v]) =>
    k === "minosites" || k === "irany" ? v !== "all" : Boolean(v?.trim())
  ).length

  const hasInstant =
    instantData.dossiers.length > 0 ||
    instantData.documents.length > 0 ||
    instantData.partners.length > 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="page-animate flex flex-col gap-6">

      {/* ══════════════════════════════════════════════════════════════════
          HERO — Only visible before first search
      ══════════════════════════════════════════════════════════════════ */}
      {!hasSearched && (
        <div className="flex flex-col items-center text-center gap-3 pt-10 pb-4">
          {/* Icon background */}
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <FileSearch className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Dokumentumok keresése
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground leading-relaxed">
            Keress iktatószámra, tárgyra, partnerre vagy a dokumentumok
            kinyert tartalmára — egyetlen mezőből.
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SEARCH BAR
      ══════════════════════════════════════════════════════════════════ */}
      <div
        className={
          !hasSearched
            ? "mx-auto w-full max-w-2xl"
            : "w-full"
        }
      >
        {/* Input wrapper */}
        <div ref={containerRef} className="relative">
          {/* Input */}
          <div
            className={[
              "relative flex items-center rounded-lg border bg-card transition-all duration-150",
              "border-border focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20",
              hasSearched ? "shadow-[var(--shadow-sm)]" : "shadow-[var(--shadow)]",
            ].join(" ")}
          >
            <Search className="absolute left-3.5 h-4 w-4 shrink-0 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setShowDrop(true) }}
              onFocus={() => setShowDrop(true)}
              onKeyDown={handleKeyDown}
              placeholder="Keresés dokumentumok, iratok, partnerek között..."
              className="
                border-0 shadow-none focus-visible:ring-0 bg-transparent
                pl-10 pr-28 py-5 text-sm placeholder:text-muted-foreground/60
                rounded-lg
              "
            />
            <div className="absolute right-2 flex items-center gap-1">
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); inputRef.current?.focus() }}
                  className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <Button
                size="sm"
                onClick={() => performSearch(query, filters)}
                disabled={loading}
                className="h-8 px-3 text-xs font-medium"
              >
                {loading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : "Keresés"}
              </Button>
            </div>
          </div>

          {/* ── Instant autocomplete dropdown ── */}
          {showDrop && query.trim().length >= 2 && (
            <div className="
              absolute left-0 right-0 top-[calc(100%+6px)] z-50
              rounded-lg border border-border bg-popover text-popover-foreground
              shadow-[var(--shadow-lg)]
              p-1.5
              animate-in fade-in slide-in-from-top-1 duration-150
            ">
              {instantLoading && (
                <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Gyors találatok...
                </div>
              )}

              {!instantLoading && !hasInstant && (
                <div className="px-3 py-3 text-xs text-muted-foreground">
                  Nincs azonnali találat — nyomj{" "}
                  <kbd className="mx-0.5 rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                    Enter
                  </kbd>{" "}
                  a teljes kereséshez.
                </div>
              )}

              {!instantLoading && hasInstant && (
                <div className="max-h-80 overflow-y-auto divide-y divide-border/50">

                  {/* Ügyiratok */}
                  {instantData.dossiers.length > 0 && (
                    <div className="py-1">
                      <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <FolderOpen className="h-3 w-3" />
                        Ügyiratok
                      </div>
                      {instantData.dossiers.map(d => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => { setShowDrop(false); router.push(`/dossiers/${d.id}`) }}
                          className="group flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-sm hover:bg-accent/50 hover:text-accent-foreground transition-colors"
                        >
                          <div className="flex min-w-0 items-baseline gap-2">
                            <span className="shrink-0 text-xs font-semibold text-primary tabular-nums">
                              {d.iktatoszam}
                            </span>
                            <span className="truncate text-xs text-foreground">
                              {d.ugy?.targy || "Névtelen ügy"}
                            </span>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Iratok */}
                  {instantData.documents.length > 0 && (
                    <div className="py-1">
                      <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        Iratok
                      </div>
                      {instantData.documents.map(doc => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => {
                            setShowDrop(false)
                            router.push(doc.ugyirat_id ? `/dossiers/${doc.ugyirat_id}` : `/inbox/${doc.id}`)
                          }}
                          className="group flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left hover:bg-accent/50 hover:text-accent-foreground transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-foreground">{doc.targy}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {doc.erkeztetoszam}
                              {doc.partner?.nev ? ` · ${doc.partner.nev}` : ""}
                            </p>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Partnerek */}
                  {instantData.partners.length > 0 && (
                    <div className="py-1">
                      <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <Users className="h-3 w-3" />
                        Partnerek
                      </div>
                      {instantData.partners.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setShowDrop(false); router.push(`/partners/${p.id}`) }}
                          className="group flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left hover:bg-accent/50 hover:text-accent-foreground transition-colors"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="text-xs font-medium text-foreground">{p.nev}</span>
                            {p.email && (
                              <span className="truncate text-[11px] text-muted-foreground">{p.email}</span>
                            )}
                          </div>
                          <span className="shrink-0 rounded border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {p.tipus === "maganszemely" ? "Magánszemély" : "Szervezet"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border/50 px-2 pt-1.5 pb-1 text-[11px] text-muted-foreground">
                <span>Nyomj Entert az összes találathoz</span>
                <button
                  type="button"
                  onClick={() => performSearch(query, filters)}
                  className="flex items-center gap-1 font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Összes találat
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Toolbar: Filters + Saved ── */}
        <div className={[
          "mt-3 flex flex-wrap items-center gap-2",
          !hasSearched ? "justify-center" : "justify-between",
        ].join(" ")}>
          <div className="flex items-center gap-2">
            {/* Filter toggle */}
            <Button
              variant={isFilterOpen || activeFilterCount > 0 ? "secondary" : "outline"}
              size="sm"
              onClick={() => { setDraftFilters(filters); setIsFilterOpen(v => !v) }}
              className="h-8 gap-1.5 text-xs"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {isFilterOpen ? "Szűrők elrejtése" : "Szűrők"}
              {activeFilterCount > 0 && (
                <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* Saved searches dropdown */}
            {savedSearches.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      Mentett keresések
                    </Button>
                  }
                />
                <DropdownMenuContent align="start" className="w-60">
                  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Mentett keresések
                  </div>
                  <DropdownMenuSeparator />
                  {savedSearches.map(s => (
                    <div
                      key={s.id}
                      onClick={() => loadSaved(s)}
                      className="group flex cursor-pointer items-center justify-between rounded px-2 py-1.5 hover:bg-accent/50 hover:text-accent-foreground transition-colors"
                    >
                      <span className="text-xs font-medium truncate flex-1">{s.nev}</span>
                      <button
                        type="button"
                        onClick={e => deleteSaved(s.id, e)}
                        className="ml-2 rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Save current search */}
          {hasSearched && (query.trim() || activeFilterCount > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSaveName(query ? `Keresés: ${query}` : "Szűrt lista"); setIsSaveOpen(true) }}
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50"
            >
              <Bookmark className="h-3.5 w-3.5" />
              Mentés
            </Button>
          )}
        </div>

        {/* ── Filter panel (progressive disclosure) ── */}
        {isFilterOpen && (
          <div className="
            mt-3 rounded-lg border border-border bg-card p-4
            animate-in fade-in slide-in-from-top-2 duration-200
            shadow-[var(--shadow-sm)]
          ">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Részletes szűrők
              </span>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Partner */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Partner neve</label>
                <Input
                  value={draftFilters.partner}
                  onChange={e => setDraftFilters(p => ({ ...p, partner: e.target.value }))}
                  placeholder="Pl. Kovács Kft."
                  className="h-8 text-xs"
                />
              </div>
              {/* Iktatószám */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Iktatószám</label>
                <Input
                  value={draftFilters.iktatoszam}
                  onChange={e => setDraftFilters(p => ({ ...p, iktatoszam: e.target.value }))}
                  placeholder="Pl. HR/2026/..."
                  className="h-8 text-xs"
                />
              </div>
              {/* Érkeztetőszám */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Érkeztetőszám</label>
                <Input
                  value={draftFilters.erkeztetoszam}
                  onChange={e => setDraftFilters(p => ({ ...p, erkeztetoszam: e.target.value }))}
                  placeholder="Pl. E/2026..."
                  className="h-8 text-xs"
                />
              </div>
              {/* Irány */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Irat iránya</label>
                <Select
                  value={draftFilters.irany}
                  onValueChange={v => setDraftFilters(p => ({ ...p, irany: v || "all" }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue>{iranyLabel[draftFilters.irany]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Minden irány</SelectItem>
                    <SelectItem value="bejovo">Bejövő</SelectItem>
                    <SelectItem value="kimeno">Kimenő</SelectItem>
                    <SelectItem value="belso">Belső</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Minősítés */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Minősítés</label>
                <Select
                  value={draftFilters.minosites}
                  onValueChange={v => setDraftFilters(p => ({ ...p, minosites: v || "all" }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue>{minositesLabel[draftFilters.minosites]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Minden minősítés</SelectItem>
                    <SelectItem value="nyilt">Nyílt</SelectItem>
                    <SelectItem value="belso">Belső használatra</SelectItem>
                    <SelectItem value="bizalmas">Bizalmas</SelectItem>
                    <SelectItem value="szigoruan_bizalmas">Szigorúan bizalmas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Dátum */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Dátum (tól – ig)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={draftFilters.dateFrom}
                    onChange={e => setDraftFilters(p => ({ ...p, dateFrom: e.target.value }))}
                    className="h-8 px-2 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">–</span>
                  <Input
                    type="date"
                    value={draftFilters.dateTo}
                    onChange={e => setDraftFilters(p => ({ ...p, dateTo: e.target.value }))}
                    className="h-8 px-2 text-xs"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/50 pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50"
              >
                <RotateCcw className="h-3 w-3" />
                Visszaállítás
              </Button>
              <Button size="sm" onClick={applyFilters} className="h-8 text-xs">
                Szűrők alkalmazása
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          EMPTY STATE — recent searches
      ══════════════════════════════════════════════════════════════════ */}
      {!hasSearched && recentSearches.length > 0 && (
        <div className="mx-auto w-full max-w-2xl">
          <div className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-sm)]">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <History className="h-3.5 w-3.5" />
                Legutóbbi keresések
              </div>
              <button
                type="button"
                onClick={clearRecent}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Törlés
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map(term => (
                <button
                  key={term}
                  type="button"
                  onClick={() => { setQuery(term); performSearch(term, filters) }}
                  className="
                    group flex items-center gap-1.5 rounded-md border border-border
                    bg-background px-3 py-1.5 text-xs text-foreground
                    hover:border-primary/40 hover:bg-primary-subtle hover:text-primary
                    transition-colors
                  "
                >
                  <Search className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ACTIVE FILTER CHIPS
      ══════════════════════════════════════════════════════════════════ */}
      {hasSearched && activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Szűrők:</span>

          {filters.partner && (
            <FilterChip label={`Partner: ${filters.partner}`} onRemove={() => removeFilter("partner")} />
          )}
          {filters.iktatoszam && (
            <FilterChip label={`Iktatószám: ${filters.iktatoszam}`} onRemove={() => removeFilter("iktatoszam")} />
          )}
          {filters.erkeztetoszam && (
            <FilterChip label={`Érkeztetőszám: ${filters.erkeztetoszam}`} onRemove={() => removeFilter("erkeztetoszam")} />
          )}
          {filters.irany !== "all" && (
            <FilterChip label={`Irány: ${iranyLabel[filters.irany]}`} onRemove={() => removeFilter("irany")} />
          )}
          {filters.minosites !== "all" && (
            <FilterChip label={`Minősítés: ${minositesLabel[filters.minosites]}`} onRemove={() => removeFilter("minosites")} />
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
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Összes törlése
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          RESULTS AREA
      ══════════════════════════════════════════════════════════════════ */}
      {hasSearched && (
        <div className="flex flex-col gap-3">
          {/* Result count header */}
          <div className="flex items-center justify-between px-0.5">
            <p className="text-sm text-muted-foreground">
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Keresés...
                </span>
              ) : (
                <>
                  <span className="font-semibold text-foreground tabular-nums">{results.length}</span>
                  {" "}találat{query.trim() ? <> — <em className="not-italic text-foreground">„{query}"</em></> : ""}
                </>
              )}
            </p>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border/60 overflow-x-auto bg-card shadow-[var(--shadow-sm)]">
            <table className="compact-table min-w-max w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40">
                  <th className="w-44 px-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Azonosító
                  </th>
                  <th className="px-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tárgy
                  </th>
                  <th className="w-36 px-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Partner
                  </th>
                  <th className="w-24 px-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Irány
                  </th>
                  <th className="w-28 px-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Érkezés
                  </th>
                  <th className="w-8 px-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  /* Skeleton rows */
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/30 last:border-0">
                      <td className="px-3"><div className="h-3 w-28 animate-pulse rounded bg-muted" /></td>
                      <td className="px-3"><div className="h-3 w-48 animate-pulse rounded bg-muted" /></td>
                      <td className="px-3"><div className="h-3 w-24 animate-pulse rounded bg-muted" /></td>
                      <td className="px-3"><div className="h-4 w-14 animate-pulse rounded-full bg-muted" /></td>
                      <td className="px-3"><div className="h-3 w-20 animate-pulse rounded bg-muted" /></td>
                      <td className="px-3" />
                    </tr>
                  ))
                ) : results.length > 0 ? (
                  results.map(item => {
                    const target = item.ugyirat?.id
                      ? `/dossiers/${item.ugyirat.id}`
                      : `/inbox/${item.id}`

                    return (
                      <tr
                        key={item.id}
                        onClick={() => router.push(target)}
                        className="group border-b border-border/30 last:border-0 cursor-pointer hover:bg-accent/40 hover:text-accent-foreground transition-colors"
                      >
                        {/* Azonosító */}
                        <td className="px-3">
                          {item.ugyirat?.iktatoszam ? (
                            <span className="font-semibold text-xs text-primary tabular-nums whitespace-nowrap">
                              {item.ugyirat.iktatoszam}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground font-mono whitespace-nowrap">
                              {item.erkeztetoszam || "—"}
                            </span>
                          )}
                        </td>
                        {/* Tárgy */}
                        <td className="px-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-accent-foreground transition-colors" />
                            <span className="text-sm font-medium text-foreground truncate max-w-[280px] group-hover:text-accent-foreground transition-colors">
                              {item.targy}
                            </span>
                          </div>
                        </td>
                        {/* Partner */}
                        <td className="px-3">
                          <span className="text-xs text-muted-foreground whitespace-nowrap max-w-[130px] truncate block">
                            {(item.partner as any)?.nev || "—"}
                          </span>
                        </td>
                        {/* Irány badge */}
                        <td className="px-3">
                          <span
                            className={[
                              "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap",
                              iranyBadgeClass(item.irany),
                            ].join(" ")}
                          >
                            {iranyText(item.irany)}
                          </span>
                        </td>
                        {/* Dátum */}
                        <td className="px-3">
                          <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                            {formatDate(item.erkezes_datuma)}
                          </span>
                        </td>
                        {/* Arrow */}
                        <td className="px-3">
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-accent-foreground transition-all" />
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  /* Empty state */
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                          <FileSearch className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Nincs találat</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Próbálj más kulcsszóval vagy csökkentsd a szűrőket.
                          </p>
                        </div>
                        {activeFilterCount > 0 && (
                          <Button variant="outline" size="sm" onClick={resetFilters} className="mt-1 text-xs">
                            Szűrők törlése
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SAVE SEARCH DIALOG
      ══════════════════════════════════════════════════════════════════ */}
      <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Keresés mentése</DialogTitle>
            <DialogDescription>
              Mentsd el az aktuális keresési beállításokat egy névvel.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-2">
            <label className="text-xs font-medium text-foreground">Keresési profil neve</label>
            <Input
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="Pl. Havi szerződések"
              className="h-9 text-sm"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") handleSave() }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsSaveOpen(false)}>Mégse</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded p-0.5 text-muted-foreground hover:text-destructive hover:text-destructive transition-colors"
        aria-label="Szűrő eltávolítása"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
