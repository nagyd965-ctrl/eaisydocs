"use client"

import { useState, useEffect } from "react"
import { searchDocuments } from "./actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, FileText } from "lucide-react"

export function SearchClientPage() {
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState({ minosites: "all", irany: "all" })
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

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
      {/* Kereső panel (Facetták + Keresőmező) */}
      <div className="flex flex-col md:flex-row gap-4 p-4 border rounded-md bg-card">
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
            <SelectValue placeholder="Irány" />
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
            <SelectValue placeholder="Minősítés" />
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
