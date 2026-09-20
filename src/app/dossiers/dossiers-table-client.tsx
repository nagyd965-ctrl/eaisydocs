"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Lock } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import { AssignDossierDialog } from "@/components/assign-dossier-dialog"
import { ExportDossiersDropdown } from "@/components/export-dossiers-dropdown"
import { TableToolbar, TableColumnOption, FilterGroup } from "@/components/table-toolbar/table-toolbar"

export interface DossierItem {
  id: string
  iktatoszam: string
  statusz: string
  iktatas_datuma: string
  megorzesi_ido_vege?: string | null
  szervezeti_egyseg_id: string
  szervezeti_egyseg?: {
    nev?: string | null
  } | null
  ugy?: {
    id?: string
    targy?: string
    hatarido?: string
    statusz?: string
    felelos_user_id?: string
    felelos_user?: {
      id?: string
      full_name?: string
    }
  } | null
  irat?: Array<{
    id: string
    minosites?: string
  }>
}

const DEFAULT_COLUMNS: TableColumnOption[] = [
  { id: "iktatoszam", label: "Iktatószám", isVisible: true },
  { id: "targy", label: "Tárgy", isVisible: true },
  { id: "statusz", label: "Állapot", isVisible: true },
  { id: "felelos", label: "Felelős", isVisible: true },
  { id: "hatarido", label: "Határidő", isVisible: true },
]

export function DossiersTableClient({
  initialDossiers,
  users,
  currentUserProfile,
  canAssign,
}: {
  initialDossiers: DossierItem[]
  users: any[]
  currentUserProfile: any
  canAssign: boolean
}) {
  const [dossiers] = useState<DossierItem[]>(initialDossiers)

  // Szűrési állapotok
  const [search, setSearch] = useState("")
  const [columns, setColumns] = useState<TableColumnOption[]>(DEFAULT_COLUMNS)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedSecurity, setSelectedSecurity] = useState<string[]>([])
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([])

  const handleToggleColumn = (id: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isVisible: !c.isVisible } : c))
    )
  }

  const isColVisible = (id: string) => {
    return columns.find((c) => c.id === id)?.isVisible ?? true
  }

  const handleClearFilters = () => {
    setSearch("")
    setFromDate("")
    setToDate("")
    setSelectedStatuses([])
    setSelectedSecurity([])
    setSelectedAssignments([])
  }

  const filterGroups: FilterGroup[] = [
    {
      id: "statusz",
      title: "Ügyirat állapota",
      options: [
        { id: "folyamatban", label: "Folyamatban", checked: selectedStatuses.includes("folyamatban") },
        { id: "lezart", label: "Lezárt", checked: selectedStatuses.includes("lezart") },
        { id: "irattarban", label: "Irattárban", checked: selectedStatuses.includes("irattarban") },
        { id: "selejtezheto", label: "Selejtezhető", checked: selectedStatuses.includes("selejtezheto") },
        { id: "selejtezett", label: "Selejtezett", checked: selectedStatuses.includes("selejtezett") },
      ],
      onToggle: (optId) => {
        setSelectedStatuses((prev) =>
          prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
        )
      },
    },
    {
      id: "minosites",
      title: "Minősítés / Bizalmasság",
      options: [
        { id: "nyilt", label: "Nyílt irat", checked: selectedSecurity.includes("nyilt") },
        { id: "bizalmas", label: "Bizalmas / Titkos", checked: selectedSecurity.includes("bizalmas") },
      ],
      onToggle: (optId) => {
        setSelectedSecurity((prev) =>
          prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
        )
      },
    },
    {
      id: "kiosztottsag",
      title: "Kiosztottság",
      options: [
        { id: "assigned", label: "Felelőshöz rendelve", checked: selectedAssignments.includes("assigned") },
        { id: "unassigned", label: "Kiosztatlan", checked: selectedAssignments.includes("unassigned") },
      ],
      onToggle: (optId) => {
        setSelectedAssignments((prev) =>
          prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
        )
      },
    },
  ]

  const activeFiltersCount =
    selectedStatuses.length + selectedSecurity.length + selectedAssignments.length

  const filteredDossiers = useMemo(() => {
    return dossiers.filter((dossier) => {
      const ugy = dossier.ugy as any
      const iratList = Array.isArray(dossier.irat) ? dossier.irat : []
      const isConfidential = iratList.some(
        (i: any) => i.minosites === "bizalmas" || i.minosites === "szigoruan_bizalmas"
      )
      const hasAssignee = !!ugy?.felelos_user_id

      // 1. Kereső (iktatószám, tárgy, felelős)
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchNumber = dossier.iktatoszam?.toLowerCase().includes(q)
        const matchSubject = ugy?.targy?.toLowerCase().includes(q)
        const matchAssignee = ugy?.felelos_user?.full_name?.toLowerCase().includes(q)
        if (!matchNumber && !matchSubject && !matchAssignee) {
          return false
        }
      }

      // 2. Dátum tól / ig (iktatás dátuma alapján)
      if (fromDate) {
        const dDate = dossier.iktatas_datuma ? new Date(dossier.iktatas_datuma).toISOString().split("T")[0] : ""
        if (dDate && dDate < fromDate) return false
      }
      if (toDate) {
        const dDate = dossier.iktatas_datuma ? new Date(dossier.iktatas_datuma).toISOString().split("T")[0] : ""
        if (dDate && dDate > toDate) return false
      }

      // 3. Státusz szűrő
      if (selectedStatuses.length > 0) {
        if (!selectedStatuses.includes(dossier.statusz)) return false
      }

      // 4. Minősítés szűrő
      if (selectedSecurity.length > 0) {
        const matchBizalmas = selectedSecurity.includes("bizalmas") && isConfidential
        const matchNyilt = selectedSecurity.includes("nyilt") && !isConfidential
        if (!matchBizalmas && !matchNyilt) return false
      }

      // 5. Kiosztottság szűrő
      if (selectedAssignments.length > 0) {
        const matchAssigned = selectedAssignments.includes("assigned") && hasAssignee
        const matchUnassigned = selectedAssignments.includes("unassigned") && !hasAssignee
        if (!matchAssigned && !matchUnassigned) return false
      }

      return true
    })
  }, [
    dossiers,
    search,
    fromDate,
    toDate,
    selectedStatuses,
    selectedSecurity,
    selectedAssignments,
  ])

  const visibleColumnsCount = columns.filter((c) => c.isVisible).length

  return (
    <div className="space-y-3">
      {/* Eszköztár: Kereső + Oszlopválasztó + Szűrés + CSV Export */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Keresés iktatószám, tárgy, felelős alapján..."
        columns={columns}
        onToggleColumn={handleToggleColumn}
        dateRange={{
          from: fromDate,
          to: toDate,
          onFromChange: setFromDate,
          onToChange: setToDate,
        }}
        filterGroups={filterGroups}
        activeFiltersCount={activeFiltersCount}
        onClearFilters={handleClearFilters}
        actions={<ExportDossiersDropdown data={filteredDossiers as any} />}
      />

      {/* Táblázat */}
      <div className="border border-border/50 rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {isColVisible("iktatoszam") && <TableHead>Iktatószám</TableHead>}
              {isColVisible("targy") && <TableHead>Tárgy</TableHead>}
              {isColVisible("statusz") && <TableHead>Állapot</TableHead>}
              {isColVisible("felelos") && <TableHead>Felelős</TableHead>}
              {isColVisible("hatarido") && <TableHead>Határidő</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDossiers.length > 0 ? (
              filteredDossiers.map((dossier) => {
                const iratList = Array.isArray(dossier.irat) ? dossier.irat : []
                const isConfidential = iratList.some(
                  (i: any) => i.minosites === "bizalmas" || i.minosites === "szigoruan_bizalmas"
                )

                const isVezeto = currentUserProfile?.docs_szerepkor === "vezeto"
                const userCanAssign = isVezeto
                  ? dossier.szervezeti_egyseg_id === currentUserProfile?.szervezeti_egyseg_id
                  : canAssign

                return (
                  <TableRow key={dossier.id} className="hover:bg-muted/50 transition-colors">
                    {isColVisible("iktatoszam") && (
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Link href={`/dossiers/${dossier.id}`} className="text-primary hover:underline">
                            {dossier.iktatoszam}
                          </Link>
                          {isConfidential && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 border-rose-500/30 text-rose-400 bg-rose-500/10 flex items-center gap-1 font-normal"
                            >
                              <Lock className="w-2.5 h-2.5" /> Bizalmas
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {isColVisible("targy") && (
                      <TableCell className="max-w-md">{(dossier.ugy as any)?.targy || "-"}</TableCell>
                    )}
                    {isColVisible("statusz") && (
                      <TableCell>
                        <StatusBadge status={dossier.statusz} />
                      </TableCell>
                    )}
                    {isColVisible("felelos") && (
                      <TableCell>
                        <AssignDossierDialog
                          ugyirat_id={dossier.id}
                          ugy_id={(dossier.ugy as any)?.id}
                          szervezeti_egyseg_id={dossier.szervezeti_egyseg_id}
                          users={users || []}
                          currentFelelosId={(dossier.ugy as any)?.felelos_user_id}
                          currentHatarido={(dossier.ugy as any)?.hatarido}
                          canAssign={userCanAssign}
                        >
                          <span className={userCanAssign ? "cursor-pointer hover:underline text-primary/90" : ""}>
                            {((dossier.ugy as any)?.felelos_user as any)?.full_name || (
                              <span className="italic text-muted-foreground">Kiosztatlan</span>
                            )}
                          </span>
                        </AssignDossierDialog>
                      </TableCell>
                    )}
                    {isColVisible("hatarido") && (
                      <TableCell className="tabular-nums text-muted-foreground">
                        {(dossier.ugy as any)?.hatarido
                          ? new Date((dossier.ugy as any).hatarido).toLocaleDateString("hu-HU")
                          : "-"}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnsCount || 5}
                  className="text-center py-8 text-muted-foreground"
                >
                  {dossiers.length === 0
                    ? "Nincs még iktatott ügyirat az adatbázisban."
                    : "Nincs a megadott szűrési feltételeknek megfelelő ügyirat."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
