"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, ExternalLink, Download, AlertTriangle } from "lucide-react"
import { CandidateProfileSheet } from "./candidate-profile-sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { differenceInDays } from "date-fns"

export function TalentPoolList({ candidates }: { candidates: any[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  
  const filteredCandidates = candidates.filter(c => {
    const term = searchTerm.toLowerCase()
    return (
      c.nev.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      (c.hr_allashirdetes?.cim || "").toLowerCase().includes(term) ||
      (c.ai_skills && c.ai_skills.some((s: string) => s.toLowerCase().includes(term)))
    )
  })

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between bg-white p-4 rounded-md border">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Keresés név, email vagy készségek alapján..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Összesen {filteredCandidates.length} jelentkező
        </div>
      </div>

      <div className="border rounded-md bg-white flex-1 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
              <TableRow>
                <TableHead>Név</TableHead>
                <TableHead>Jelentkezés Dátuma</TableHead>
                <TableHead>E-mail / Telefon</TableHead>
                <TableHead>Pozíció</TableHead>
                <TableHead>Állapot</TableHead>
                <TableHead>Készségek (AI)</TableHead>
                <TableHead className="text-right">Műveletek</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                    Nem található a keresésnek megfelelő jelölt a Talent Pool-ban.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCandidates.map((candidate) => {
                  const daysSinceApplied = differenceInDays(new Date(), new Date(candidate.created_at))
                  const isGdprWarning = daysSinceApplied >= 150 && daysSinceApplied < 180
                  const isGdprExpired = daysSinceApplied >= 180

                  return (
                  <TableRow key={candidate.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedCandidate(candidate)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {candidate.nev}
                        {isGdprWarning && (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20" title="1 hónapon belül törölni kell (GDPR)">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            GDPR
                          </Badge>
                        )}
                        {isGdprExpired && (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20" title="Azonnal törölni kell (GDPR lejárata túllépve)">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            GDPR Lejárt
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(candidate.created_at).toLocaleDateString("hu-HU", {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{candidate.email}</span>
                        <span className="text-xs text-muted-foreground">{candidate.telefon || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{candidate.hr_allashirdetes?.cim || "Általános jelentkezés"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {candidate.statusz}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {candidate.ai_skills?.slice(0, 3).map((skill: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0">{skill}</Badge>
                        ))}
                        {candidate.ai_skills?.length > 3 && (
                          <span className="text-xs text-muted-foreground ml-1">+{candidate.ai_skills.length - 3}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCandidate(candidate);
                      }}>
                        Megtekintés
                      </Button>
                    </TableCell>
                  </TableRow>
                )})
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {selectedCandidate && (
        <CandidateProfileSheet
          candidate={selectedCandidate}
          isOpen={!!selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onUpdated={() => {}}
        />
      )}
    </div>
  )
}
