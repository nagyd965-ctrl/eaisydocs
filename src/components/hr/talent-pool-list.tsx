"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle } from "lucide-react"
import { CandidateProfileSheet } from "./candidate-profile-sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { differenceInDays } from "date-fns"
import { type Candidate } from "@/types/hr"
import { TableToolbar, type TableColumnOption, type FilterGroup } from "@/components/table-toolbar/table-toolbar"

export function TalentPoolList({ candidates }: { candidates: Candidate[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  const [columns, setColumns] = useState<TableColumnOption[]>([
    { id: "nev", label: "Név", isVisible: true },
    { id: "datum", label: "Jelentkezés Dátuma", isVisible: true },
    { id: "kapcsolat", label: "E-mail / Telefon", isVisible: true },
    { id: "pozicio", label: "Pozíció", isVisible: true },
    { id: "allapot", label: "Állapot", isVisible: true },
    { id: "keszsegek", label: "Készségek (AI)", isVisible: true },
    { id: "muveletek", label: "Műveletek", isVisible: true },
  ])

  const handleToggleColumn = (colId: string) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, isVisible: !c.isVisible } : c))
  }

  const isColVisible = (colId: string) => columns.find(c => c.id === colId)?.isVisible ?? true

  const toggleStatus = (val: string) => {
    setSelectedStatuses(prev => prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val])
  }

  const clearAllFilters = () => {
    setSelectedStatuses([])
  }

  const filterGroups: FilterGroup[] = useMemo(() => [
    {
      id: "statusz",
      title: "Állapot",
      options: [
        { id: "uj", label: "Új Jelentkező", checked: selectedStatuses.includes("uj") },
        { id: "eloszurt", label: "Előszűrt", checked: selectedStatuses.includes("eloszurt") },
        { id: "interju", label: "Interjú", checked: selectedStatuses.includes("interju") },
        { id: "ajanlat", label: "Ajánlat", checked: selectedStatuses.includes("ajanlat") },
        { id: "elfogadva", label: "Elfogadva", checked: selectedStatuses.includes("elfogadva") },
        { id: "elutasitva", label: "Elutasítva", checked: selectedStatuses.includes("elutasitva") },
      ],
      onToggle: toggleStatus,
    }
  ], [selectedStatuses])

  const filteredCandidates = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    return candidates.filter(c => {
      const matchesSearch = !term || (
        c.nev.toLowerCase().includes(term) ||
        (c.email || "").toLowerCase().includes(term) ||
        (c.hr_allashirdetes?.cim || "").toLowerCase().includes(term) ||
        (c.ai_skills && c.ai_skills.some((s: string) => s.toLowerCase().includes(term)))
      )

      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(c.statusz)

      return matchesSearch && matchesStatus
    })
  }, [candidates, searchTerm, selectedStatuses])

  return (
    <div className="space-y-4 h-full flex flex-col">
      <TableToolbar
        searchPlaceholder="Keresés név, email vagy készségek alapján..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        columns={columns}
        onToggleColumn={handleToggleColumn}
        filterGroups={filterGroups}
        activeFiltersCount={selectedStatuses.length}
        onClearFilters={clearAllFilters}
      />

      <div className="border rounded-md bg-card flex-1 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1">
          <div className="overflow-x-auto">
            <Table className="compact-table">
              <TableHeader className="sticky top-0 bg-card z-10 border-b">
                <TableRow>
                  {isColVisible("nev") && <TableHead>Név</TableHead>}
                  {isColVisible("datum") && <TableHead>Jelentkezés Dátuma</TableHead>}
                  {isColVisible("kapcsolat") && <TableHead>E-mail / Telefon</TableHead>}
                  {isColVisible("pozicio") && <TableHead>Pozíció</TableHead>}
                  {isColVisible("allapot") && <TableHead>Állapot</TableHead>}
                  {isColVisible("keszsegek") && <TableHead>Készségek (AI)</TableHead>}
                  {isColVisible("muveletek") && <TableHead className="text-right">Műveletek</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.filter(c => c.isVisible).length || 7} className="text-center h-32 text-muted-foreground">
                      Nem található a keresésnek megfelelő jelölt a Talent Pool-ban.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCandidates.map((candidate) => {
                    const daysSinceApplied = candidate.created_at ? differenceInDays(new Date(), new Date(candidate.created_at)) : 0
                    const isGdprWarning = daysSinceApplied >= 150 && daysSinceApplied < 180
                    const isGdprExpired = daysSinceApplied >= 180

                    return (
                      <TableRow 
                        key={candidate.id} 
                        className="hover:bg-muted/40 cursor-pointer transition-colors" 
                        onClick={() => setSelectedCandidate(candidate)}
                      >
                        {isColVisible("nev") && (
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {candidate.nev}
                              {isGdprWarning && (
                                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px]" title="1 hónapon belül törölni kell (GDPR)">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  GDPR
                                </Badge>
                              )}
                              {isGdprExpired && (
                                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]" title="Azonnal törölni kell (GDPR lejárata túllépve)">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  GDPR Lejárt
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        )}
                        {isColVisible("datum") && (
                          <TableCell className="text-muted-foreground tabular-nums">
                            {candidate.created_at ? new Date(candidate.created_at).toLocaleDateString("hu-HU", {
                              year: "numeric",
                              month: "short",
                              day: "numeric"
                            }) : "-"}
                          </TableCell>
                        )}
                        {isColVisible("kapcsolat") && (
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">{candidate.email}</span>
                              <span className="text-xs text-muted-foreground tabular-nums">{candidate.telefonszam || (candidate as any).telefon || "-"}</span>
                            </div>
                          </TableCell>
                        )}
                        {isColVisible("pozicio") && (
                          <TableCell>{candidate.hr_allashirdetes?.cim || "Általános jelentkezés"}</TableCell>
                        )}
                        {isColVisible("allapot") && (
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">
                              {candidate.statusz}
                            </Badge>
                          </TableCell>
                        )}
                        {isColVisible("keszsegek") && (
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {candidate.ai_skills?.slice(0, 3).map((skill: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0">{skill}</Badge>
                              ))}
                              {(candidate.ai_skills?.length ?? 0) > 3 && (
                                <span className="text-xs text-muted-foreground ml-1 tabular-nums">+{candidate.ai_skills!.length - 3}</span>
                              )}
                            </div>
                          </TableCell>
                        )}
                        {isColVisible("muveletek") && (
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCandidate(candidate);
                              }}
                            >
                              Megtekintés
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
        </ScrollArea>
      </div>

      {selectedCandidate && (
        <CandidateProfileSheet
          candidate={selectedCandidate}
          isOpen={!!selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onUpdate={() => {}}
        />
      )}
    </div>
  )
}
