"use client"

import { useState, useEffect } from "react"
import { searchDocuments } from "./actions"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, FileText, ChevronDown, ChevronUp, Save, Trash2, FolderSearch, Check } from "lucide-react"
import { saveSearch, getSavedSearches, deleteSavedSearch } from "./actions"
import { toast } from "sonner"

export function SearchClientPage() {
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState({ 
    minosites: "all", 
    irany: "all",
    iktatoszam: "",
    erkeztetoszam: "",
    dateFrom: "",
    dateTo: "",
    partner: ""
  })
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [savedSearches, setSavedSearches] = useState<any[]>([])
  const [saveName, setSaveName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null)
  const [activeSearchName, setActiveSearchName] = useState<string | null>(null)
  useEffect(() => {
    loadSavedSearches()
  }, [])

  const loadSavedSearches = async () => {
    const data = await getSavedSearches()
    setSavedSearches(data)
  }

  const handleSaveSearch = async () => {
    if (!saveName.trim()) {
      toast.error("Kérlek adj meg egy nevet a mentéshez!")
      return
    }
    setIsSaving(true)
    const res = await saveSearch(saveName, query, filters)
    setIsSaving(false)
    if (res.success) {
      toast.success("Keresés elmentve!")
      setSaveName("")
      loadSavedSearches()
    } else {
      toast.error(res.error || "Hiba a mentéskor")
    }
  }

  const handleLoadSearch = (savedSearch: any) => {
    const p = savedSearch.kereso_parameterek
    setQuery(p.query || "")
    setFilters(p.filters || {
      minosites: "all", 
      irany: "all",
      iktatoszam: "",
      erkeztetoszam: "",
      dateFrom: "",
      dateTo: "",
      partner: ""
    })
    setActiveSearchId(savedSearch.id)
    setActiveSearchName(savedSearch.nev)
    toast.success(`Betöltve: ${savedSearch.nev}`)
  }

  const handleDeleteSearch = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const res = await deleteSavedSearch(id)
    if (res.success) {
      toast.success("Mentett keresés törölve!")
      loadSavedSearches()
    }
  }

  const iranyMap: Record<string, string> = {
    all: "Minden irány",
    bejovo: "Bejövő",
    kimeno: "Kimenő",
    belso: "Belső"
  }

  const minositesMap: Record<string, string> = {
    all: "Minden minősítés",
    nyilt: "Nyílt",
    belso: "Belső",
    bizalmas: "Bizalmas",
    szigoruan_bizalmas: "Szigorúan bizalmas"
  }

  const handleSearch = async () => {
    setLoading(true)
    setHasSearched(true)
    
    const { data, error } = await searchDocuments(query, filters)
    if (!error && data) {
      setResults(data)
    }
    
    setLoading(false)
  }

  // Opcionálisan: keresés "Enter" lenyomására
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-9 w-[250px] items-center justify-start rounded-md border border-input bg-card px-3 py-2 text-sm font-normal text-muted-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
            <FolderSearch className="w-4 h-4 mr-2 shrink-0" />
            <span className="truncate">
              {activeSearchName 
                ? <span className="text-foreground font-medium">Mentett: {activeSearchName}</span> 
                : "Mentett Keresések..."}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[250px] p-1">
            {savedSearches.length === 0 && (
              <div className="p-2 text-sm text-muted-foreground text-center">Nincs mentett keresés</div>
            )}
            {savedSearches.map(s => (
              <DropdownMenuItem key={s.id} onSelect={(e) => {
                handleLoadSearch(s)
              }} onClick={() => handleLoadSearch(s)} className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center">
                  {activeSearchId === s.id ? (
                    <Check className="w-4 h-4 mr-2 text-primary" />
                  ) : (
                    <div className="w-4 h-4 mr-2" />
                  )}
                  <span className={activeSearchId === s.id ? "font-medium" : ""}>{s.nev}</span>
                </div>
                <div 
                  onClick={(e) => handleDeleteSearch(s.id, e)} 
                  className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Kereső panel (Facetták + Keresőmező) */}
      <div className="flex flex-col gap-4 p-4 border rounded-md bg-card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Keresés tárgyban, leírásban, partnernévben vagy a tartalom (OCR) szövegében..." 
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
        
        <Select value={filters.irany} onValueChange={(val) => setFilters(prev => ({ ...prev, irany: val || "all" }))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Irány">{iranyMap[filters.irany]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Minden irány</SelectItem>
            <SelectItem value="bejovo">Bejövő</SelectItem>
            <SelectItem value="kimeno">Kimenő</SelectItem>
            <SelectItem value="belso">Belső</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.minosites} onValueChange={(val) => setFilters(prev => ({ ...prev, minosites: val || "all" }))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Minősítés">{minositesMap[filters.minosites]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Minden minősítés</SelectItem>
            <SelectItem value="nyilt">Nyílt</SelectItem>
            <SelectItem value="belso">Belső</SelectItem>
            <SelectItem value="bizalmas">Bizalmas</SelectItem>
            <SelectItem value="szigoruan_bizalmas">Szigorúan bizalmas</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleSearch} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Keresés
        </Button>
        </div>
      </div>
      
      {/* Bővített Kereső Panel */}
      <div className="flex justify-between items-center px-1">
        <Button variant="ghost" size="sm" onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}>
          {isAdvancedOpen ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
          Speciális metaadat szűrők
        </Button>
      </div>

      {isAdvancedOpen && (
        <div className="p-4 border rounded-md bg-muted/20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Iktatószám</label>
            <Input 
              placeholder="pl. HR/2026/..." 
              value={filters.iktatoszam}
              onChange={(e) => setFilters(p => ({...p, iktatoszam: e.target.value}))}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Érkeztetőszám</label>
            <Input 
              placeholder="pl. ERK-..." 
              value={filters.erkeztetoszam}
              onChange={(e) => setFilters(p => ({...p, erkeztetoszam: e.target.value}))}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Partner Név</label>
            <Input 
              placeholder="pl. Kovács Kft." 
              value={filters.partner}
              onChange={(e) => setFilters(p => ({...p, partner: e.target.value}))}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Dátum (Tól)</label>
            <Input 
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(p => ({...p, dateFrom: e.target.value}))}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Dátum (Ig)</label>
            <Input 
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(p => ({...p, dateTo: e.target.value}))}
            />
          </div>
          <div className="flex items-end gap-2">
            <Input 
              placeholder="Mentés néven..." 
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
            />
            <Button variant="outline" onClick={handleSaveSearch} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Találati lista */}
      {hasSearched && (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Iktatószám (Érkeztető)</TableHead>
                <TableHead>Tárgy</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Irány</TableHead>
                <TableHead>Dátum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Keresés folyamatban...
                  </TableCell>
                </TableRow>
              ) : results.length > 0 ? (
                results.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.ugyirat?.iktatoszam ? (
                        <span className="text-primary">{item.ugyirat.iktatoszam}</span>
                      ) : (
                        <span className="text-muted-foreground italic">{item.erkeztetoszam || "Nincs"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {item.targy}
                      </div>
                    </TableCell>
                    <TableCell>{(item.partner as any)?.nev || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{item.irany}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {new Date(item.erkezes_datuma).toLocaleDateString("hu-HU")}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nem található a keresési feltételeknek megfelelő irat.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
