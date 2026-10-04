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
import { 
  Building2, User, Briefcase, Landmark, Users, 
  CheckCircle2, ArrowRight, FileText, Mail, Phone,
  TrendingUp, ShieldAlert, FolderOpen
} from "lucide-react"
import { PartnerDialog } from "@/components/partner-dialog"
import { DeletePartnerButton } from "@/components/delete-partner-button"
import { Badge } from "@/components/ui/badge"
import { TableToolbar, TableColumnOption, FilterGroup } from "@/components/table-toolbar/table-toolbar"
import { KpiCard } from "@/components/kpi-card"
import { cn } from "@/lib/utils"

export interface PartnerItem {
  id: string
  nev: string
  tipus?: string | null
  szerepkor?: string | null
  statusz?: string | null
  email?: string | null
  telefonszam?: string | null
  adoszam?: string | null
  kulfoldi_adoszam?: string | null
  cegjegyzekszam?: string | null
  cim?: string | null
  bankszamlaszam?: string | null
  created_at?: string
  irat_darabszam?: number
  elsodleges_kapcsolattarto?: {
    nev: string
    email?: string | null
    telefonszam?: string | null
  } | null
}

function getPartnerTypeInfo(tipus?: string | null) {
  switch (tipus) {
    case "maganszemely":
      return { label: "Magánszemély", icon: User }
    case "egyeni_vallalkozo":
      return { label: "Egyéni vállalkozó", icon: Briefcase }
    case "intezmeny":
      return { label: "Hivatal / Intézmény", icon: Landmark }
    case "ceg":
    default:
      return { label: "Cég", icon: Building2 }
  }
}

function getBusinessRoleInfo(szerepkor?: string | null) {
  switch (szerepkor) {
    case "szallito":
      return { label: "Szállító", color: "bg-info/10 text-info border-info/20" }
    case "mindketto":
      return { label: "Vevő & Szállító", color: "bg-success/10 text-success border-success/20" }
    case "hatosag":
      return { label: "Hatóság", color: "bg-warning/10 text-warning border-warning/20" }
    case "bank":
      return { label: "Bank", color: "bg-primary/10 text-primary border-primary/20" }
    case "egyeb":
      return { label: "Egyéb", color: "bg-muted text-muted-foreground border-border" }
    case "vevo":
    default:
      return { label: "Vevő", color: "bg-primary/10 text-primary border-primary/20" }
  }
}

const DEFAULT_COLUMNS: TableColumnOption[] = [
  { id: "nev", label: "Név & Székhely", isVisible: true },
  { id: "szerepkor", label: "Szerepkör", isVisible: true },
  { id: "tipus", label: "Típus", isVisible: true },
  { id: "statusz", label: "Státusz", isVisible: true },
  { id: "email", label: "E-mail", isVisible: true },
  { id: "telefonszam", label: "Telefonszám", isVisible: true },
  { id: "adoszam", label: "Adószám", isVisible: true },
  { id: "forgalom", label: "Iratok", isVisible: true },
  { id: "kapcsolattarto", label: "Kapcsolattartó", isVisible: false },
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
  const [activeQuickTab, setActiveQuickTab] = useState<string>("mind")
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
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
    setActiveQuickTab("mind")
    setSelectedRoles([])
    setSelectedTypes([])
    setSelectedStatuses([])
    setSelectedCompleteness([])
  }

  // Statisztikai összegzők
  const stats = useMemo(() => {
    const total = partners.length
    const active = partners.filter(p => p.statusz !== "inaktiv").length
    const vevok = partners.filter(p => p.szerepkor === "vevo" || p.szerepkor === "mindketto" || !p.szerepkor).length
    const szallitok = partners.filter(p => p.szerepkor === "szallito" || p.szerepkor === "mindketto").length
    const hatosagok = partners.filter(p => p.szerepkor === "hatosag" || p.tipus === "intezmeny").length
    const withDocs = partners.filter(p => (p.irat_darabszam || 0) > 0).length

    return { total, active, vevok, szallitok, hatosagok, withDocs }
  }, [partners])

  // Szűrőcsoportok a TableToolbarhoz
  const filterGroups: FilterGroup[] = [
    {
      id: "szerepkor",
      title: "Üzleti szerepkör",
      options: [
        { id: "vevo", label: "Vevő", checked: selectedRoles.includes("vevo") },
        { id: "szallito", label: "Szállító", checked: selectedRoles.includes("szallito") },
        { id: "mindketto", label: "Vevő & Szállító", checked: selectedRoles.includes("mindketto") },
        { id: "hatosag", label: "Hatóság", checked: selectedRoles.includes("hatosag") },
        { id: "bank", label: "Bank", checked: selectedRoles.includes("bank") },
      ],
      onToggle: (optId) => {
        setSelectedRoles((prev) =>
          prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
        )
      },
    },
    {
      id: "tipus",
      title: "Jogi forma",
      options: [
        { id: "ceg", label: "Cég", checked: selectedTypes.includes("ceg") },
        { id: "egyeni_vallalkozo", label: "Egyéni vállalkozó", checked: selectedTypes.includes("egyeni_vallalkozo") },
        { id: "intezmeny", label: "Hivatal / Intézmény", checked: selectedTypes.includes("intezmeny") },
        { id: "maganszemely", label: "Magánszemély", checked: selectedTypes.includes("maganszemely") },
      ],
      onToggle: (optId) => {
        setSelectedTypes((prev) =>
          prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
        )
      },
    },
    {
      id: "statusz",
      title: "Partner státusza",
      options: [
        { id: "aktiv", label: "Csak aktív partnerek", checked: selectedStatuses.includes("aktiv") },
        { id: "inaktiv", label: "Csak inaktív partnerek", checked: selectedStatuses.includes("inaktiv") },
      ],
      onToggle: (optId) => {
        setSelectedStatuses((prev) =>
          prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
        )
      },
    },
    {
      id: "kitoltottseg",
      title: "Elérhetőség & Forgalom",
      options: [
        { id: "has_docs", label: "Van kapcsolt irata", checked: selectedCompleteness.includes("has_docs") },
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

  const activeFiltersCount = selectedRoles.length + selectedTypes.length + selectedStatuses.length + selectedCompleteness.length

  // Szűrt lista
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      // 1. Gyorsfülek
      if (activeQuickTab === "vevok") {
        if (p.szerepkor !== "vevo" && p.szerepkor !== "mindketto") return false
      } else if (activeQuickTab === "szallitok") {
        if (p.szerepkor !== "szallito" && p.szerepkor !== "mindketto") return false
      } else if (activeQuickTab === "hatosagok") {
        if (p.szerepkor !== "hatosag" && p.tipus !== "intezmeny") return false
      } else if (activeQuickTab === "maganszemelyek") {
        if (p.tipus !== "maganszemely") return false
      } else if (activeQuickTab === "inaktivak") {
        if (p.statusz !== "inaktiv") return false
      }

      // 2. Kereső
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matchName = p.nev?.toLowerCase().includes(q)
        const matchEmail = p.email?.toLowerCase().includes(q)
        const matchPhone = p.telefonszam?.toLowerCase().includes(q)
        const matchTax = p.adoszam?.toLowerCase().includes(q) || p.kulfoldi_adoszam?.toLowerCase().includes(q)
        const matchAddress = p.cim?.toLowerCase().includes(q)
        const matchContact = p.elsodleges_kapcsolattarto?.nev?.toLowerCase().includes(q)

        if (!matchName && !matchEmail && !matchPhone && !matchTax && !matchAddress && !matchContact) {
          return false
        }
      }

      // 3. Részletes szűrők
      if (selectedRoles.length > 0) {
        const role = p.szerepkor || "vevo"
        if (!selectedRoles.includes(role)) return false
      }

      if (selectedTypes.length > 0) {
        const t = p.tipus || "ceg"
        if (!selectedTypes.includes(t)) return false
      }

      if (selectedStatuses.length > 0) {
        const s = p.statusz || "aktiv"
        if (!selectedStatuses.includes(s)) return false
      }

      if (selectedCompleteness.includes("has_docs") && (!p.irat_darabszam || p.irat_darabszam === 0)) {
        return false
      }
      if (selectedCompleteness.includes("has_email") && !p.email) return false
      if (selectedCompleteness.includes("has_phone") && !p.telefonszam) return false
      if (selectedCompleteness.includes("has_tax") && !p.adoszam && !p.kulfoldi_adoszam) return false

      return true
    })
  }, [partners, activeQuickTab, search, selectedRoles, selectedTypes, selectedStatuses, selectedCompleteness])

  const quickTabs = [
    { key: "mind", label: "Mind", count: partners.length },
    { key: "vevok", label: "Vevők", count: stats.vevok },
    { key: "szallitok", label: "Szállítók", count: stats.szallitok },
    { key: "hatosagok", label: "Hatóságok", count: stats.hatosagok },
    { key: "maganszemelyek", label: "Magánszemélyek", count: partners.filter(p => p.tipus === "maganszemely").length },
    { key: "inaktivak", label: "Inaktívak", count: partners.filter(p => p.statusz === "inaktiv").length },
  ]

  return (
    <div className="space-y-6">

      {/* ── 1. Felső Statisztikai Kártyák (Linear Flat KPI Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Összes partner"
          value={stats.total}
          sub="Rendszerben rögzített partnertörzs"
        />
        <KpiCard
          label="Aktív státuszú"
          value={stats.active}
          sub={stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% aktív kapcsolat` : "—"}
        />
        <KpiCard
          label="Vevők / Szállítók"
          value={stats.vevok}
          sub={`${stats.szallitok} szállító • ${stats.hatosagok} hatóság`}
        />
        <KpiCard
          label="Élő iratforgalom"
          value={stats.withDocs}
          sub="Iktatott dokumentummal"
        />
      </div>

      {/* ── 2. Gyors Szűrő Sáv (Quick Tabs) */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border/50">
        {quickTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveQuickTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0",
              activeQuickTab === tab.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <span>{tab.label}</span>
            <span className={cn(
              "text-[10px] tabular-nums px-1.5 py-0.2 rounded-full",
              activeQuickTab === tab.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── 3. Táblázat Eszköztár (Toolbar) */}
      <TableToolbar
        searchPlaceholder="Keresés név, székhely, e-mail, telefonszám vagy adószám szerint..."
        searchValue={search}
        onSearchChange={setSearch}
        columns={columns}
        onToggleColumn={handleToggleColumn}
        filterGroups={filterGroups}
        activeFiltersCount={activeFiltersCount}
        onClearFilters={handleClearFilters}
        actions={canEdit ? <PartnerDialog /> : undefined}
      />

      {/* ── 4. Partnerek Táblázat */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table className="compact-table">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {isColVisible("nev") && <TableHead>Név & Székhely</TableHead>}
              {isColVisible("szerepkor") && <TableHead>Szerepkör</TableHead>}
              {isColVisible("tipus") && <TableHead>Jogi forma</TableHead>}
              {isColVisible("statusz") && <TableHead>Státusz</TableHead>}
              {isColVisible("email") && <TableHead>E-mail</TableHead>}
              {isColVisible("telefonszam") && <TableHead>Telefonszám</TableHead>}
              {isColVisible("adoszam") && <TableHead>Adószám</TableHead>}
              {isColVisible("forgalom") && <TableHead>Forgalom</TableHead>}
              {isColVisible("kapcsolattarto") && <TableHead>Kapcsolattartó</TableHead>}
              {isColVisible("muveletek") && (
                <TableHead className="w-[90px] text-right">Műveletek</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPartners.length > 0 ? (
              filteredPartners.map((partner) => {
                const typeInfo = getPartnerTypeInfo(partner.tipus)
                const TypeIcon = typeInfo.icon
                const roleInfo = getBusinessRoleInfo(partner.szerepkor)
                const isAktiv = partner.statusz !== "inaktiv"
                const docCount = partner.irat_darabszam || 0

                return (
                  <TableRow key={partner.id} className="hover:bg-muted/40 transition-colors group">
                    
                    {/* Név & Székhely */}
                    {isColVisible("nev") && (
                      <TableCell className="py-3">
                        <div className="flex items-start gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-muted/60 border border-border/50 flex items-center justify-center shrink-0 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors">
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/partners/${partner.id}`}
                              className="font-semibold text-sm text-foreground hover:underline hover:text-primary transition-colors block truncate max-w-[260px]"
                              title={partner.nev}
                            >
                              {partner.nev}
                            </Link>
                            {partner.cim && (
                              <p className="text-[11px] text-muted-foreground truncate max-w-[260px] mt-0.5" title={partner.cim}>
                                {partner.cim}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {/* Szerepkör */}
                    {isColVisible("szerepkor") && (
                      <TableCell>
                        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border inline-block whitespace-nowrap", roleInfo.color)}>
                          {roleInfo.label}
                        </span>
                      </TableCell>
                    )}

                    {/* Jogi forma */}
                    {isColVisible("tipus") && (
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] font-normal gap-1 text-muted-foreground py-0.5 whitespace-nowrap">
                          {typeInfo.label}
                        </Badge>
                      </TableCell>
                    )}

                    {/* Státusz */}
                    {isColVisible("statusz") && (
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={cn("h-2 w-2 rounded-full", isAktiv ? "bg-success" : "bg-muted-foreground/40")} />
                          {isAktiv ? "Aktív" : "Inaktív"}
                        </span>
                      </TableCell>
                    )}

                    {/* E-mail */}
                    {isColVisible("email") && (
                      <TableCell className="text-xs">
                        {partner.email ? (
                          <a href={`mailto:${partner.email}`} className="text-primary hover:underline truncate max-w-[180px] block" title={partner.email}>
                            {partner.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                    )}

                    {/* Telefonszám */}
                    {isColVisible("telefonszam") && (
                      <TableCell className="text-xs font-mono tabular-nums whitespace-nowrap">
                        {partner.telefonszam ? (
                          <a href={`tel:${partner.telefonszam}`} className="hover:underline">
                            {partner.telefonszam}
                          </a>
                        ) : (
                          <span className="text-muted-foreground/60 font-sans">—</span>
                        )}
                      </TableCell>
                    )}

                    {/* Adószám */}
                    {isColVisible("adoszam") && (
                      <TableCell className="text-xs font-mono tabular-nums whitespace-nowrap">
                        {partner.adoszam ? (
                          <div>
                            <span>{partner.adoszam}</span>
                            {partner.kulfoldi_adoszam && (
                              <span className="block text-[10px] text-primary/80">
                                EU: {partner.kulfoldi_adoszam}
                              </span>
                            )}
                          </div>
                        ) : partner.kulfoldi_adoszam ? (
                          <span className="text-primary/90 font-medium">EU: {partner.kulfoldi_adoszam}</span>
                        ) : (
                          <span className="text-muted-foreground/60 font-sans">—</span>
                        )}
                      </TableCell>
                    )}

                    {/* Iratforgalom */}
                    {isColVisible("forgalom") && (
                      <TableCell>
                        {docCount > 0 ? (
                          <Link 
                            href={`/partners/${partner.id}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold font-mono bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            title={`${docCount} kapcsolt dokumentum megtekintése`}
                          >
                            <FileText className="h-3 w-3" />
                            {docCount} irat
                          </Link>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs">—</span>
                        )}
                      </TableCell>
                    )}

                    {/* Kapcsolattartó */}
                    {isColVisible("kapcsolattarto") && (
                      <TableCell className="text-xs">
                        {partner.elsodleges_kapcsolattarto ? (
                          <div>
                            <span className="font-medium text-foreground">{partner.elsodleges_kapcsolattarto.nev}</span>
                            {partner.elsodleges_kapcsolattarto.email && (
                              <span className="block text-[10px] text-muted-foreground">{partner.elsodleges_kapcsolattarto.email}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                    )}

                    {/* Műveletek */}
                    {isColVisible("muveletek") && (
                      <TableCell className="text-right py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/partners/${partner.id}`}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Adatlap megtekintése"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                          {canEdit && (
                            <>
                              <PartnerDialog partner={partner} iconOnly={true} />
                              <DeletePartnerButton partnerId={partner.id} partnerNev={partner.nev} />
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}

                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.filter((c) => c.isVisible).length}
                  className="h-32 text-center text-muted-foreground text-xs"
                >
                  <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Nincs találat a megadott keresési és szűrési feltételekre.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

    </div>
  )
}
