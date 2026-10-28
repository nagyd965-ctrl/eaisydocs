"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { differenceInDays } from "date-fns"
import { type Candidate } from "@/types/hr"
import { TableToolbar, type TableColumnOption, type FilterGroup } from "@/components/table-toolbar/table-toolbar"

const CANDIDATE_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  uj: { label: "Új jelentkező", className: "bg-info/10 text-info border-info/30" },
  eloszurt: { label: "Előszűrt", className: "bg-warning/10 text-warning border-warning/30" },
  szures: { label: "Előszűrt", className: "bg-warning/10 text-warning border-warning/30" },
  interju: { label: "Interjú", className: "bg-primary/10 text-primary border-primary/30" },
  ajanlat: { label: "Ajánlat", className: "bg-success/10 text-success border-success/30" },
  elfogadva: { label: "Elfogadva", className: "bg-success/15 text-success border-success/30" },
  elutasitva: { label: "Elutasítva", className: "bg-destructive/10 text-destructive border-destructive/30" },
  talent_pool: { label: "Tehetségbázis", className: "bg-muted text-muted-foreground border-border" },
}

interface DeduplicatedCandidate extends Candidate {
  uniquePositions: string[]
  applicationCount: number
}

export function TalentPoolList({ candidates }: { candidates: Candidate[] }) {
  const router = useRouter()
  const [candidatesList, setCandidatesList] = useState<Candidate[]>(candidates)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  useEffect(() => {
    setCandidatesList(candidates)
  }, [candidates])

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

  // Deduplikálás e-mail cím (vagy név + pozíció) alapján, hogy egy jelölt csak egyszer szerepeljen a Talent Pool-ban
  const deduplicatedCandidates = useMemo<DeduplicatedCandidate[]>(() => {
    const grouped = new Map<string, DeduplicatedCandidate>()

    // Időrendben csökkenő sorrend, hogy mindig a legfrissebb jelentkezés legyen az elsődleges rekord
    const sorted = [...candidatesList].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      return dateB - dateA
    })

    for (const c of sorted) {
      const emailKey = (c.email || "").toLowerCase().trim()
      const nameKey = (c.nev || "").toLowerCase().trim()
      const key = emailKey || nameKey || c.id

      const posTitle =
        c.hr_allashirdetes?.cim ||
        (c as any).hr_munkakor?.megnevezes ||
        (c as any).pozicio ||
        "Általános jelentkezés"

      const existing = grouped.get(key)
      if (!existing) {
        grouped.set(key, {
          ...c,
          ai_skills: c.ai_skills ? Array.from(new Set(c.ai_skills)) : [],
          uniquePositions: [posTitle],
          applicationCount: 1,
        })
      } else {
        existing.applicationCount += 1
        if (!existing.uniquePositions.includes(posTitle)) {
          existing.uniquePositions.push(posTitle)
        }
        if (c.ai_skills && c.ai_skills.length > 0) {
          const mergedSkills = new Set([
            ...(existing.ai_skills || []),
            ...c.ai_skills,
          ])
          existing.ai_skills = Array.from(mergedSkills)
        }
        if (!existing.telefonszam && !(existing as any).telefon) {
          const fallbackPhone = c.telefonszam || (c as any).telefon
          if (fallbackPhone) {
            existing.telefonszam = fallbackPhone
          }
        }
      }
    }

    return Array.from(grouped.values())
  }, [candidatesList])

  const filteredCandidates = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    return deduplicatedCandidates.filter((c) => {
      const allPositionsStr = c.uniquePositions.join(" ").toLowerCase()
      const matchesSearch =
        !term ||
        c.nev.toLowerCase().includes(term) ||
        (c.email || "").toLowerCase().includes(term) ||
        allPositionsStr.includes(term) ||
        (c.ai_skills &&
          c.ai_skills.some((s: string) => s.toLowerCase().includes(term)))

      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(c.statusz)

      return matchesSearch && matchesStatus
    })
  }, [deduplicatedCandidates, searchTerm, selectedStatuses])

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
                        onClick={() => router.push(`/hr/recruitment/candidate/${candidate.id}`)}
                      >
                        {isColVisible("nev") && (
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/hr/recruitment/candidate/${candidate.id}`}
                                className="hover:text-primary transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {candidate.nev}
                              </Link>
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
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span>{candidate.uniquePositions[0]}</span>
                              {candidate.uniquePositions.length > 1 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground"
                                  title={candidate.uniquePositions.join(", ")}
                                >
                                  +{candidate.uniquePositions.length - 1} pozíció
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        )}
                        {isColVisible("allapot") && (
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium ${
                                CANDIDATE_STATUS_LABELS[candidate.statusz]?.className || ""
                              }`}
                            >
                              {CANDIDATE_STATUS_LABELS[candidate.statusz]?.label ||
                                candidate.statusz}
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
                            <Link
                              href={`/hr/recruitment/candidate/${candidate.id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                              >
                                Profil megnyitása
                              </Button>
                            </Link>
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
    </div>
  )
}
