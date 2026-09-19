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
import { Building2, User, Briefcase, Landmark } from "lucide-react"
import { PartnerDialog } from "@/components/partner-dialog"
import { DeletePartnerButton } from "@/components/delete-partner-button"
import { Badge } from "@/components/ui/badge"
import { TableToolbar, TableColumnOption, FilterGroup } from "@/components/table-toolbar/table-toolbar"

export interface PartnerItem {
  id: string
  nev: string
  tipus?: string | null
  email?: string | null
  telefonszam?: string | null
  adoszam?: string | null
  cim?: string | null
  created_at?: string
}

function getPartnerTypeInfo(tipus?: string | null) {
  switch (tipus) {
    case "maganszemely":
      return { label: "Magánszemély", icon: User, variant: "secondary" as const }
    case "egyeni_vallalkozo":
      return { label: "Egyéni vállalkozó", icon: Briefcase, variant: "outline" as const }
    case "intezmeny":
      return { label: "Intézmény / Hivatal", icon: Landmark, variant: "outline" as const }
    case "ceg":
    default:
      return { label: "Cég", icon: Building2, variant: "default" as const }
  }
}

const DEFAULT_COLUMNS: TableColumnOption[] = [
  { id: "nev", label: "Név", isVisible: true },
  { id: "tipus", label: "Típus", isVisible: true },
  { id: "email", label: "E-mail", isVisible: true },
  { id: "telefonszam", label: "Telefonszám", isVisible: true },
  { id: "adoszam", label: "Adószám", isVisible: true },
  { id: "muveletek", label: "Műveletek", isVisible: true },
]

export function PartnersTableClient({
  initialPartners,
  canEdit = false,
}: {
  initialPartners: PartnerItem[]
  canEdit?: boolean
}) {
  const [partners] = useState<PartnerItem[]>(initialPartners)

  const [search, setSearch] = useState("")
  const [columns, setColumns] = useState<TableColumnOption[]>(DEFAULT_COLUMNS)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedCompleteness, setSelectedCompleteness] = useState<string[]>([])

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
    setSelectedTypes([])
    setSelectedCompleteness([])
  }

  const filterGroups: FilterGroup[] = [
    {
      id: "tipus",
      title: "Partner típusa",
      options: [
        { id: "ceg", label: "Cég", checked: selectedTypes.includes("ceg") },
        { id: "egyeni_vallalkozo", label: "Egyéni vállalkozó", checked: selectedTypes.includes("egyeni_vallalkozo") },
        { id: "intezmeny", label: "Intézmény / Hivatal", checked: selectedTypes.includes("intezmeny") },
        { id: "maganszemely", label: "Magánszemély", checked: selectedTypes.includes("maganszemely") },
      ],
      onToggle: (optId) => {
        setSelectedTypes((prev) =>
          prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
        )
      },
    },
    {
      id: "kitoltottseg",
      title: "Elérhetőség megléte",
      options: [
        { id: "has_email", label: "Van megadva e-mail", checked: selectedCompleteness.includes("has_email") },
        { id: "has_phone", label: "Van megadva telefonszám", checked: selectedCompleteness.includes("has_phone") },
        { id: "has_tax", label: "Van megadva adószám", checked: selectedCompleteness.includes("has_tax") },
      ],
      onToggle: (optId) => {
        setSelectedCompleteness((prev) =>
          prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
        )
      },
    },
  ]

  const activeFiltersCount = selectedTypes.length + selectedCompleteness.length

  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      // 1. Kereső
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchName = p.nev?.toLowerCase().includes(q)
        const matchEmail = p.email?.toLowerCase().includes(q)
        const matchPhone = p.telefonszam?.toLowerCase().includes(q)
        const matchTax = p.adoszam?.toLowerCase().includes(q)
        if (!matchName && !matchEmail && !matchPhone && !matchTax) {
          return false
        }
      }

      // 2. Partner típus szűrő
      if (selectedTypes.length > 0) {
        const pType = p.tipus || "ceg"
        if (!selectedTypes.includes(pType)) return false
      }

      // 3. Kitöltöttség szűrő
      if (selectedCompleteness.length > 0) {
        if (selectedCompleteness.includes("has_email") && !p.email) return false
        if (selectedCompleteness.includes("has_phone") && !p.telefonszam) return false
        if (selectedCompleteness.includes("has_tax") && !p.adoszam) return false
      }

      return true
    })
  }, [partners, search, selectedTypes, selectedCompleteness])

  const visibleColumnsCount = columns.filter((c) => c.isVisible).length + 1

  return (
    <div className="space-y-3">
      {/* Eszköztár: Kereső + Oszlopválasztó + Szűrés + Új partner gomb */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Keresés név, e-mail, telefonszám vagy adószám szerint..."
        columns={columns}
        onToggleColumn={handleToggleColumn}
        filterGroups={filterGroups}
        activeFiltersCount={activeFiltersCount}
        onClearFilters={handleClearFilters}
        actions={canEdit ? <PartnerDialog /> : undefined}
      />

      {/* Táblázat */}
      <div className="border border-border/50 rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              {isColVisible("nev") && <TableHead>Név</TableHead>}
              {isColVisible("tipus") && <TableHead>Típus</TableHead>}
              {isColVisible("email") && <TableHead>E-mail</TableHead>}
              {isColVisible("telefonszam") && <TableHead>Telefonszám</TableHead>}
              {isColVisible("adoszam") && <TableHead>Adószám</TableHead>}
              {canEdit && isColVisible("muveletek") && (
                <TableHead className="w-[90px] text-right">Műveletek</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPartners && filteredPartners.length > 0 ? (
              filteredPartners.map((p) => {
                const typeInfo = getPartnerTypeInfo(p.tipus)
                const Icon = typeInfo.icon
                return (
                  <TableRow key={p.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="w-[50px]">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    {isColVisible("nev") && (
                      <TableCell className="font-medium">
                        <Link href={`/partners/${p.id}`} className="hover:underline text-primary">
                          {p.nev}
                        </Link>
                      </TableCell>
                    )}
                    {isColVisible("tipus") && (
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                    )}
                    {isColVisible("email") && (
                      <TableCell className="text-sm text-muted-foreground">
                        {p.email || "—"}
                      </TableCell>
                    )}
                    {isColVisible("telefonszam") && (
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {p.telefonszam || "—"}
                      </TableCell>
                    )}
                    {isColVisible("adoszam") && (
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {p.adoszam || "—"}
                      </TableCell>
                    )}
                    {canEdit && isColVisible("muveletek") && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <PartnerDialog partner={{ ...p, tipus: p.tipus || undefined }} iconOnly />
                          <DeletePartnerButton partnerId={p.id} partnerNev={p.nev} />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnsCount || 7}
                  className="h-24 text-center text-muted-foreground"
                >
                  {partners.length === 0
                    ? "Nincs rögzített partner."
                    : "Nincs a megadott szűrési feltételeknek megfelelő partner."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
