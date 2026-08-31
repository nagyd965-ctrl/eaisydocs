"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { quickSearch } from "@/app/search/actions"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  FolderOpen, 
  FileText, 
  Users, 
  ArrowRight, 
  Loader2, 
  SlidersHorizontal,
  CornerDownLeft
} from "lucide-react"

export function GlobalHeaderSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [results, setResults] = useState<{
    dossiers: any[]
    documents: any[]
    partners: any[]
  }>({ dossiers: [], documents: [], partners: [] })

  const inputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Auto-focus on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery("")
      setResults({ dossiers: [], documents: [], partners: [] })
      setSelectedIndex(0)
    }
  }, [open])

  // Flattened items for keyboard arrow navigation
  const allItems = [
    ...results.dossiers.map(d => ({ type: "dossier", id: d.id, url: `/dossiers/${d.id}`, title: d.iktatoszam, sub: d.ugy?.targy || "Ügyirat" })),
    ...results.documents.map(doc => ({ type: "doc", id: doc.id, url: doc.ugyirat_id ? `/dossiers/${doc.ugyirat_id}` : `/inbox/${doc.id}`, title: doc.targy, sub: `${doc.erkeztetoszam || ""} ${doc.partner?.nev ? "• " + doc.partner.nev : ""}`.trim() })),
    ...results.partners.map(p => ({ type: "partner", id: p.id, url: `/partners/${p.id}`, title: p.nev, sub: p.email || p.tipus === "maganszemely" ? "Magánszemély" : "Cég" }))
  ]

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults({ dossiers: [], documents: [], partners: [] })
      setLoading(false)
      setSelectedIndex(0)
      return
    }

    setLoading(true)
    const timeout = setTimeout(async () => {
      try {
        const res = await quickSearch(query)
        setResults(res)
        setSelectedIndex(0)
      } catch (err) {
        console.error("Quick search error:", err)
      } finally {
        setLoading(false)
      }
    }, 180)

    return () => clearTimeout(timeout)
  }, [query])

  const handleNavigate = (url: string) => {
    setOpen(false)
    router.push(url)
  }

  const handleFullSearch = () => {
    if (query.trim()) {
      setOpen(false)
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1 < allItems.length ? prev + 1 : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : allItems.length - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (allItems.length > 0 && allItems[selectedIndex]) {
        handleNavigate(allItems[selectedIndex].url)
      } else {
        handleFullSearch()
      }
    }
  }

  const hasResults = allItems.length > 0

  return (
    <>
      {/* Header Compact Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-8 px-2.5 sm:px-3 text-xs bg-muted/40 hover:bg-muted/70 border border-border/60 hover:border-border rounded-md text-muted-foreground flex items-center gap-2 transition-all cursor-pointer w-auto sm:w-56 md:w-64 justify-between group"
        title="Gyorskereső (Ctrl+K)"
      >
        <div className="flex items-center gap-2 truncate">
          <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="hidden sm:inline truncate">Keresés...</span>
        </div>

      </button>

      {/* Spotlight Overlay Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden gap-0 border shadow-2xl rounded-xl">
          <DialogTitle className="sr-only">Globális kereső</DialogTitle>
          
          {/* Search Header Input */}
          <div className="flex items-center px-4 border-b bg-background h-12">
            <Search className="h-4 w-4 text-muted-foreground shrink-0 mr-3" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Dokumentumok, partnerek vagy iktatószám keresése..."
              className="border-0 shadow-none focus-visible:ring-0 text-sm h-full px-0 bg-transparent placeholder:text-muted-foreground"
            />
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0 ml-2" />
            ) : query.trim() ? (
              <button 
                type="button" 
                onClick={handleFullSearch}
                className="text-[11px] font-medium text-muted-foreground hover:text-primary flex items-center gap-1 shrink-0 ml-2 transition-colors"
                title="Teljes keresés az oldalon"
              >
                <span>Enter</span>
                <CornerDownLeft className="h-3 w-3" />
              </button>
            ) : null}
          </div>

          {/* Results List */}
          <div className="max-h-[360px] overflow-y-auto p-2 space-y-3">
            {query.trim().length < 2 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <Search className="h-7 w-7 mx-auto mb-2 opacity-25" />
                <p>Kezdj el gépelni a gyorskereséshez...</p>
                <p className="text-[11px] text-muted-foreground/75 mt-1">
                  Kereshetsz iktatószámra, irattárgyra vagy partner nevére.
                </p>
              </div>
            )}

            {query.trim().length >= 2 && !loading && !hasResults && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <p>Nincs közvetlen találat a következőre: <strong>"{query}"</strong></p>
                <button
                  type="button"
                  onClick={handleFullSearch}
                  className="mt-2 text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  <span>Keresés a teljes archívumban és szövegekben</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Dossiers Group */}
            {results.dossiers.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <FolderOpen className="h-3 w-3 text-primary" />
                  <span>Ügyiratok ({results.dossiers.length})</span>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {results.dossiers.map((dossier) => {
                    const idx = allItems.findIndex(i => i.id === dossier.id)
                    const isSelected = idx === selectedIndex
                    return (
                      <button
                        key={dossier.id}
                        onClick={() => handleNavigate(`/dossiers/${dossier.id}`)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-left transition-colors cursor-pointer group ${
                          isSelected ? "bg-muted text-foreground" : "hover:bg-muted/70 text-foreground/90"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                          <div className="truncate">
                            <span className="font-semibold text-xs text-primary mr-2">
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

            {/* Documents Group */}
            {results.documents.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <FileText className="h-3 w-3 text-primary" />
                  <span>Dokumentumok ({results.documents.length})</span>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {results.documents.map((doc) => {
                    const target = doc.ugyirat_id ? `/dossiers/${doc.ugyirat_id}` : `/inbox/${doc.id}`
                    const idx = allItems.findIndex(i => i.id === doc.id)
                    const isSelected = idx === selectedIndex
                    return (
                      <button
                        key={doc.id}
                        onClick={() => handleNavigate(target)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-left transition-colors cursor-pointer group ${
                          isSelected ? "bg-muted text-foreground" : "hover:bg-muted/70 text-foreground/90"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                          <div className="truncate">
                            <span className="text-xs font-medium text-foreground block truncate">
                              {doc.targy}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                              {doc.erkeztetoszam && <span>{doc.erkeztetoszam}</span>}
                              {doc.partner?.nev && <span>• {doc.partner.nev}</span>}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 shrink-0 transition-opacity ml-2" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Partners Group */}
            {results.partners.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <Users className="h-3 w-3 text-primary" />
                  <span>Partnerek ({results.partners.length})</span>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {results.partners.map((partner) => {
                    const idx = allItems.findIndex(i => i.id === partner.id)
                    const isSelected = idx === selectedIndex
                    return (
                      <button
                        key={partner.id}
                        onClick={() => handleNavigate(`/partners/${partner.id}`)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-left transition-colors cursor-pointer group ${
                          isSelected ? "bg-muted text-foreground" : "hover:bg-muted/70 text-foreground/90"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                          <div className="truncate">
                            <span className="text-xs font-semibold text-foreground mr-2">
                              {partner.nev}
                            </span>
                            {partner.email && (
                              <span className="text-[11px] text-muted-foreground">{partner.email}</span>
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
          </div>

          {/* Footer Bar with direct deep search link */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-t text-[11px] text-muted-foreground">
            <span className="hidden sm:inline">Navigáció a fel/le nyilakkal, megnyitás Enterrel</span>
            <button
              type="button"
              onClick={handleFullSearch}
              className="flex items-center gap-1 text-primary hover:underline font-medium cursor-pointer ml-auto"
            >
              <SlidersHorizontal className="h-3 w-3" />
              <span>Részletes kereső oldal megnyitása →</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
