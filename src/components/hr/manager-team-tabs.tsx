"use client"

import { useState, useMemo } from "react"
import { UnifiedApprovalsPanel, type UnifiedApprovalItem } from "@/components/hr/unified-approvals-panel"
import { TeamCalendar } from "@/components/hr/team-calendar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TableToolbar, type FilterGroup } from "@/components/table-toolbar/table-toolbar"
import Link from "next/link"
import { cn } from "@/lib/utils"

export type DailyAttendanceStatus =
  | "becsekkolva"
  | "kicsekkolt"
  | "tavol"
  | "fuggoben"
  | "nincs_becsekkolva"

export interface ManagerTeamMember {
  id: string
  nev: string
  avatar_url?: string | null
  email?: string
  munkakor: string
  isAbsent: boolean
  hasPending: boolean
  attendanceStatus?: DailyAttendanceStatus
  checkInTime?: string | null
  checkOutTime?: string | null
  felhasznalo_profil?: { nev?: string | null; avatar_url?: string | null } | null
}

interface ManagerTeamTabsProps {
  unifiedItems: UnifiedApprovalItem[]
  teamMembers: ManagerTeamMember[]
  allLeaves: any[]
  todayAbsentCount: number
}

export function ManagerTeamTabs({
  unifiedItems,
  teamMembers,
  allLeaves,
  todayAbsentCount,
}: ManagerTeamTabsProps) {
  // Ha van függő kérelem, automatikusan a jóváhagyásokra fókuszálunk, egyébként a naptárra
  const [activeTab, setActiveTab] = useState<"jovahagyasok" | "naptar" | "csapat">(() => {
    return unifiedItems.length > 0 ? "jovahagyasok" : "naptar"
  })

  // Közvetlen beosztottak nézetmódja: alapértelmezetten lista nézet
  const [displayMode, setDisplayMode] = useState<"lista" | "kartya">("lista")
  const [memberSearch, setMemberSearch] = useState("")
  const [selectedStatuses, setSelectedStatuses] = useState<DailyAttendanceStatus[]>([])

  const checkedInCount = useMemo(() => {
    return teamMembers.filter((m) => m.attendanceStatus === "becsekkolva").length
  }, [teamMembers])

  const toggleStatusFilter = (status: DailyAttendanceStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  const filterGroups: FilterGroup[] = [
    {
      id: "statusz",
      title: "Mai státusz",
      options: [
        { id: "becsekkolva", label: "Becsekkolva", checked: selectedStatuses.includes("becsekkolva") },
        { id: "nincs_becsekkolva", label: "Nincs becsekkolva", checked: selectedStatuses.includes("nincs_becsekkolva") },
        { id: "tavol", label: "Távol (szabadság)", checked: selectedStatuses.includes("tavol") },
        { id: "fuggoben", label: "Függő kérelem", checked: selectedStatuses.includes("fuggoben") },
        { id: "kicsekkolt", label: "Kicsekkolt", checked: selectedStatuses.includes("kicsekkolt") },
      ],
      onToggle: (optionId) => toggleStatusFilter(optionId as DailyAttendanceStatus),
    },
  ]

  const filteredMembers = useMemo(() => {
    return teamMembers.filter((m) => {
      // 1. Szöveges keresés
      const q = memberSearch.trim().toLowerCase()
      if (q) {
        const matchName = m.nev.toLowerCase().includes(q)
        const matchMunkakor = m.munkakor.toLowerCase().includes(q)
        const matchEmail = (m.email || "").toLowerCase().includes(q)
        if (!matchName && !matchMunkakor && !matchEmail) return false
      }

      // 2. Státusz szűrés
      if (selectedStatuses.length > 0) {
        const status = m.attendanceStatus || (m.isAbsent ? "tavol" : m.hasPending ? "fuggoben" : "nincs_becsekkolva")
        if (!selectedStatuses.includes(status)) return false
      }

      return true
    })
  }, [teamMembers, memberSearch, selectedStatuses])

  const clearAllFilters = () => {
    setMemberSearch("")
    setSelectedStatuses([])
  }

  return (
    <div className="space-y-6">
      {/* Vízszintes navigációs fülválasztó (tisztán szöveges gombok, számkijelzés nélkül) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
        {/* Bal oldal: Lapfülek */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/30 border border-border/60 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("jovahagyasok")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
              activeTab === "jovahagyasok"
                ? "bg-card text-foreground font-semibold shadow-2xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Jóváhagyások
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("naptar")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
              activeTab === "naptar"
                ? "bg-card text-foreground font-semibold shadow-2xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Csapatnaptár
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("csapat")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
              activeTab === "csapat"
                ? "bg-card text-foreground font-semibold shadow-2xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Közvetlen beosztottak
          </button>
        </div>

        {/* Jobb oldal: Diszkrét jelenléti állapot jelzés */}
        <div className="flex items-center gap-3 text-xs">
          {todayAbsentCount > 0 && (
            <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/25 font-normal">
              {todayAbsentCount} beosztott ma távol
            </Badge>
          )}
          {checkedInCount > 0 ? (
            <span className="text-muted-foreground text-xs font-medium">
              {checkedInCount} beosztott becsekkolva ma
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">
              Még senki nem csekkolt be ma
            </span>
          )}
        </div>
      </div>

      {/* 1. FÜL: JÓVÁHAGYÁSOK (Teljes szélességben) */}
      {activeTab === "jovahagyasok" && (
        <div className="space-y-4">
          <UnifiedApprovalsPanel initialItems={unifiedItems} />
        </div>
      )}

      {/* 2. FÜL: CSAPATNAPTÁR (Teljes szélességben) */}
      {activeTab === "naptar" && (
        <div className="space-y-4">
          <TeamCalendar teamMembers={teamMembers} leaves={allLeaves} />
        </div>
      )}

      {/* 3. FÜL: KÖZVETLEN BEOSZTOTTAK (Lista és Kártya nézet) */}
      {activeTab === "csapat" && (
        <div className="space-y-4">
          {/* Felső vezérlősáv: Szabványos TableToolbar keresővel, Státusz szűrővel és Lista/Kártya váltóval */}
          <TableToolbar
            searchValue={memberSearch}
            onSearchChange={setMemberSearch}
            searchPlaceholder="Keresés beosztott neve vagy munkaköre alapján..."
            filterGroups={filterGroups}
            activeFiltersCount={selectedStatuses.length}
            onClearFilters={() => setSelectedStatuses([])}
            actions={
              <div className="flex items-center gap-1 p-1 bg-muted/40 border border-border/70 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDisplayMode("lista")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                    displayMode === "lista"
                      ? "bg-card text-foreground font-semibold shadow-2xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Lista
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode("kartya")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                    displayMode === "kartya"
                      ? "bg-card text-foreground font-semibold shadow-2xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Kártya
                </button>
              </div>
            }
          />

          {/* Üres állapot, ha a keresés vagy szűrés nem ad találatot */}
          {filteredMembers.length === 0 ? (
            <Card className="border border-dashed shadow-xs">
              <CardContent className="py-12 text-center space-y-2">
                <h3 className="font-semibold text-base text-foreground">
                  {memberSearch || selectedStatuses.length > 0
                    ? "Nincs a keresésnek vagy szűrésnek megfelelő beosztott"
                    : "Nincsenek közvetlen beosztottak"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {memberSearch || selectedStatuses.length > 0
                    ? "Próbáld meg módosítani a keresési feltételeket vagy törölni a szűrőket."
                    : "Jelenleg nem tartozik közvetlen beosztott a felhasználói profilodhoz ebben a szervezetben."}
                </p>
                {(memberSearch || selectedStatuses.length > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-xs text-primary mt-2 cursor-pointer"
                  >
                    Szűrők és keresés törlése
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : displayMode === "lista" ? (
            /* 1. LISTA NÉZET: Letisztult, átlátható táblázat */
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20 border-b border-border/70">
                    <TableHead className="w-[280px] text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3">
                      Munkatárs
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3">
                      Munkakör / Beosztás
                    </TableHead>
                    <TableHead className="w-[180px] text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3">
                      Mai státusz
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3">
                      Elérhetőség
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {filteredMembers.map((member) => {
                    const initials = member.nev
                      .split(" ")
                      .map((w: string) => w[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()

                    return (
                      <TableRow key={member.id} className="hover:bg-muted/15 transition-colors">
                        <TableCell className="py-3 font-medium text-xs">
                          <Link
                            href={`/hr/employee/${member.id}`}
                            className="flex items-center gap-3 group w-fit"
                          >
                            <Avatar className="h-8 w-8 border border-border shrink-0 group-hover:border-primary/50 transition-colors">
                              {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.nev} />}
                              <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors underline-offset-4 group-hover:underline">
                              {member.nev}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="py-3 text-xs text-muted-foreground font-medium">
                          {member.munkakor}
                        </TableCell>
                        <TableCell className="py-3">
                          {member.attendanceStatus === "becsekkolva" ? (
                            <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/30 font-semibold gap-1">
                              Becsekkolva {member.checkInTime ? `(${member.checkInTime})` : ""}
                            </Badge>
                          ) : member.attendanceStatus === "kicsekkolt" ? (
                            <span className="text-xs text-muted-foreground">
                              Kicsekkolt {member.checkOutTime ? `(${member.checkOutTime})` : ""}
                            </span>
                          ) : member.attendanceStatus === "tavol" || member.isAbsent ? (
                            <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/25 font-semibold">
                              Távol
                            </Badge>
                          ) : member.attendanceStatus === "fuggoben" || member.hasPending ? (
                            <Badge variant="outline" className="text-[10px] bg-warning/15 text-warning border-warning/30 font-semibold">
                              Függő kérelem
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Nincs becsekkolva
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-xs">
                          {member.email ? (
                            <a
                              href={`mailto:${member.email}`}
                              className="text-muted-foreground hover:text-foreground hover:underline transition-colors"
                            >
                              {member.email}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">Nincs megadva</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* 2. KÁRTYA NÉZET: Letisztult kártyás rács */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((member) => {
                const initials = member.nev
                  .split(" ")
                  .map((w: string) => w[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase()

                return (
                  <Card key={member.id} className="border shadow-2xs hover:border-primary/40 transition-colors">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/hr/employee/${member.id}`}
                          className="flex items-center gap-3 min-w-0 group"
                        >
                          <Avatar className="h-10 w-10 border border-border shrink-0 group-hover:border-primary/50 transition-colors">
                            {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.nev} />}
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {member.nev}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.munkakor}
                            </p>
                          </div>
                        </Link>

                        {/* Státusz badge vagy felirat */}
                        <div>
                          {member.attendanceStatus === "becsekkolva" ? (
                            <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/30 font-semibold gap-1">
                              Becsekkolva {member.checkInTime ? `(${member.checkInTime})` : ""}
                            </Badge>
                          ) : member.attendanceStatus === "kicsekkolt" ? (
                            <span className="text-xs text-muted-foreground">
                              Kicsekkolt {member.checkOutTime ? `(${member.checkOutTime})` : ""}
                            </span>
                          ) : member.attendanceStatus === "tavol" || member.isAbsent ? (
                            <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/25 font-semibold">
                              Távol
                            </Badge>
                          ) : member.attendanceStatus === "fuggoben" || member.hasPending ? (
                            <Badge variant="outline" className="text-[10px] bg-warning/15 text-warning border-warning/30 font-semibold">
                              Függő kérelem
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Nincs becsekkolva
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Alsó infósáv */}
                      <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground">
                        {member.email ? (
                          <a
                            href={`mailto:${member.email}`}
                            className="hover:text-foreground hover:underline transition-colors truncate block"
                          >
                            {member.email}
                          </a>
                        ) : (
                          <span>Nincs megadva e-mail</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
