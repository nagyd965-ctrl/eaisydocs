"use client"

import { useState, useMemo, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { KpiCard } from "@/components/kpi-card"
import {
  TableToolbar,
  FilterGroup,
  TableColumnOption,
} from "@/components/table-toolbar/table-toolbar"
import {
  ExternalLink,
  Edit,
  Trash2,
  Briefcase,
  Building2,
  Users,
  Calendar,
  Plus,
  MapPin,
  LayoutGrid,
  List,
  Lock,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ManagePostingDialog } from "./manage-posting-dialog"
import { updateJobPostingFlagsAction } from "@/app/hr/recruitment/actions"
import {
  WORK_MODE_LABELS,
  WORK_MODE_SHORT_LABELS,
  SENIORITY_LABELS,
  formatSalaryBand,
} from "@/utils/hr/career-constants"

export interface JobPostingItem {
  id: string
  cim?: string
  munkakor_id?: string
  rovid_leiras?: string | null
  reszletes_leiras?: string | null
  aktiv?: boolean
  publikus?: boolean
  is_internal?: boolean
  created_at?: string
  nyitva_tol?: string | null
  munkavegzes_modja?: string | null
  helyszin?: string | null
  foglalkoztatas_tipusa?: string | null
  tapasztalati_szint?: string | null
  reszleg_nev?: string | null
  bersav_min?: number | null
  bersav_max?: number | null
  bersav_publikus?: boolean
  hr_munkakor?: { megnevezes?: string } | null
  [key: string]: any
}

export interface JobItem {
  id: string
  megnevezes: string
  [key: string]: any
}

export interface CandidateItem {
  id: string
  allashirdetes_id?: string | null
  megpalyazott_munkakor_id?: string | null
  [key: string]: any
}

interface JobPostingsListProps {
  postings?: JobPostingItem[]
  initialPostings?: JobPostingItem[]
  jobs: JobItem[]
  candidates: CandidateItem[]
}

export function JobPostingsList({
  postings: propPostings,
  initialPostings,
  jobs,
  candidates = [],
}: JobPostingsListProps) {
  const [postings, setPostings] = useState<JobPostingItem[]>(
    initialPostings || propPostings || []
  )
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedJobNames, setSelectedJobNames] = useState<string[]>([])
  const [selectedWorkModes, setSelectedWorkModes] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards")

  const [columns, setColumns] = useState<TableColumnOption[]>([
    { id: "cim", label: "Pozíció megnevezése", isVisible: true },
    { id: "munkakor", label: "Munkakör és részleg", isVisible: true },
    { id: "munkavegzes", label: "Munkavégzés és szint", isVisible: true },
    { id: "jelentkezok", label: "Jelentkezők", isVisible: true },
    { id: "kozzeteve", label: "Közzétéve", isVisible: true },
    { id: "lathatosag", label: "Állapot és láthatóság", isVisible: true },
  ])

  const supabase = createClient()

  useEffect(() => {
    setPostings(initialPostings || propPostings || [])
  }, [initialPostings, propPostings])

  const isColVisible = (colId: string) =>
    columns.find((c) => c.id === colId)?.isVisible ?? true

  const handleToggleColumn = (colId: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, isVisible: !c.isVisible } : c))
    )
  }

  /* ───── Stats ───── */
  const activePublicCount = postings.filter(
    (p) => p.aktiv && p.publikus && !p.is_internal
  ).length
  const activeInternalCount = postings.filter(
    (p) => p.aktiv && p.is_internal
  ).length
  const inactiveCount = postings.filter((p) => !p.aktiv).length

  /* ───── Munkakörök szűrőhöz ───── */
  const jobNamesWithCounts = useMemo(() => {
    const counts = new Map<string, number>()
    postings.forEach((p) => {
      const name = p.hr_munkakor?.megnevezes || "Általános"
      counts.set(name, (counts.get(name) || 0) + 1)
    })
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "hu"))
  }, [postings])

  /* ───── Filter ───── */
  const filtered = useMemo(() => {
    return postings.filter((p) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchesTitle = p.cim?.toLowerCase().includes(q)
        const matchesJob = p.hr_munkakor?.megnevezes?.toLowerCase().includes(q)
        const matchesDept = p.reszleg_nev?.toLowerCase().includes(q)
        const matchesLoc = p.helyszin?.toLowerCase().includes(q)
        if (!matchesTitle && !matchesJob && !matchesDept && !matchesLoc) {
          return false
        }
      }

      if (selectedStatuses.length > 0) {
        const statusMatches = selectedStatuses.some((st) => {
          if (st === "publikus") return Boolean(p.aktiv && p.publikus && !p.is_internal)
          if (st === "belso") return Boolean(p.aktiv && p.is_internal)
          if (st === "aktiv") return Boolean(p.aktiv)
          if (st === "inaktiv") return !p.aktiv
          return false
        })
        if (!statusMatches) return false
      }

      if (selectedJobNames.length > 0) {
        const jobName = p.hr_munkakor?.megnevezes || "Általános"
        if (!selectedJobNames.includes(jobName)) return false
      }

      if (selectedWorkModes.length > 0) {
        const wm = p.munkavegzes_modja || "hibrid"
        if (!selectedWorkModes.includes(wm)) return false
      }

      return true
    })
  }, [postings, searchTerm, selectedStatuses, selectedJobNames, selectedWorkModes])

  const filterGroups: FilterGroup[] = [
    {
      id: "status",
      title: "Hirdetés állapota és láthatósága",
      options: [
        {
          id: "publikus",
          label: `Publikus hirdetés (${activePublicCount})`,
          checked: selectedStatuses.includes("publikus"),
        },
        {
          id: "belso",
          label: `Belső hirdetés (${activeInternalCount})`,
          checked: selectedStatuses.includes("belso"),
        },
        {
          id: "aktiv",
          label: `Összes aktív (${postings.filter((p) => p.aktiv).length})`,
          checked: selectedStatuses.includes("aktiv"),
        },
        {
          id: "inaktiv",
          label: `Inaktív (${inactiveCount})`,
          checked: selectedStatuses.includes("inaktiv"),
        },
      ],
      onToggle: (stId) => {
        setSelectedStatuses((prev) =>
          prev.includes(stId) ? prev.filter((s) => s !== stId) : [...prev, stId]
        )
      },
    },
    {
      id: "job_names",
      title: "Belső munkakör",
      options: jobNamesWithCounts.map((j) => ({
        id: j.name,
        label: `${j.name} (${j.count})`,
        checked: selectedJobNames.includes(j.name),
      })),
      onToggle: (jobName) => {
        setSelectedJobNames((prev) =>
          prev.includes(jobName)
            ? prev.filter((n) => n !== jobName)
            : [...prev, jobName]
        )
      },
    },
    {
      id: "work_mode",
      title: "Munkavégzés módja",
      options: Object.entries(WORK_MODE_LABELS).map(([key, label]) => ({
        id: key,
        label,
        checked: selectedWorkModes.includes(key),
      })),
      onToggle: (wmKey) => {
        setSelectedWorkModes((prev) =>
          prev.includes(wmKey) ? prev.filter((k) => k !== wmKey) : [...prev, wmKey]
        )
      },
    },
  ]

  const activeFiltersCount =
    selectedStatuses.length + selectedJobNames.length + selectedWorkModes.length

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedStatuses([])
    setSelectedJobNames([])
    setSelectedWorkModes([])
  }

  /* ───── Helpers ───── */
  function getApplicantCount(posting: JobPostingItem): number {
    const matching = candidates.filter(
      (c) =>
        c.allashirdetes_id === posting.id ||
        (!c.allashirdetes_id && c.megpalyazott_munkakor_id === posting.munkakor_id)
    )
    const uniqueKeys = new Set<string>()
    for (const c of matching) {
      const key =
        (c.email || "").toLowerCase().trim() ||
        (c.nev || "").toLowerCase().trim() ||
        c.id
      uniqueKeys.add(key)
    }
    return uniqueKeys.size
  }

  function addOrUpdate(savedPosting: any) {
    const job = jobs.find((j) => j.id === savedPosting.munkakor_id)
    const full: JobPostingItem = {
      ...savedPosting,
      hr_munkakor: savedPosting.hr_munkakor || { megnevezes: job?.megnevezes },
    }
    setPostings((prev) => {
      const exists = prev.find((p) => p.id === savedPosting.id)
      return exists
        ? prev.map((p) => (p.id === savedPosting.id ? full : p))
        : [full, ...prev]
    })
  }

  async function toggleStatus(
    id: string,
    field: "aktiv" | "publikus" | "is_internal",
    current: boolean
  ) {
    const next = !current
    const prevPosting = postings.find((p) => p.id === id)
    if (!prevPosting) return

    let updates: { aktiv?: boolean; publikus?: boolean; is_internal?: boolean } = {}
    if (field === "aktiv") {
      updates = { aktiv: next }
    } else if (field === "publikus") {
      updates = next ? { publikus: true, is_internal: false } : { publikus: false }
    } else if (field === "is_internal") {
      updates = next ? { is_internal: true, publikus: false } : { is_internal: false }
    }

    setPostings((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    )

    const res = await updateJobPostingFlagsAction(id, updates)
    if (res.error) {
      toast.error("Hiba a mentés során")
      setPostings((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                aktiv: prevPosting.aktiv,
                publikus: prevPosting.publikus,
                is_internal: prevPosting.is_internal,
              }
            : p
        )
      )
    } else {
      if (field === "is_internal") {
        toast.success(
          next
            ? "Csak belső hirdetésként beállítva"
            : "Belső hirdetés megjelölés kikapcsolva"
        )
      } else if (field === "publikus") {
        toast.success(
          next
            ? "Hirdetés publikálva"
            : "Hirdetés levéve a publikus karrieroldalról"
        )
      } else {
        toast.success(next ? "Hirdetés aktiválva" : "Hirdetés inaktiválva")
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Biztosan törlöd a hirdetést? Ezt nem lehet visszavonni.")) return
    setPostings((prev) => prev.filter((p) => p.id !== id))
    const { error } = await supabase.from("hr_allashirdetes").delete().eq("id", id)
    if (error) toast.error("Hiba a törlés során")
    else toast.success("Hirdetés törölve")
  }

  function renderStatusBadge(posting: JobPostingItem) {
    if (!posting.aktiv) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
          Inaktív
        </span>
      )
    }
    if (posting.is_internal) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
          <Lock className="w-3 h-3" />
          Belső
        </span>
      )
    }
    if (posting.publikus) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success/10 text-success border border-success/20">
          Publikus
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
        Piszkozat
      </span>
    )
  }

  /* ───── Render ───── */
  return (
    <div className="space-y-6">
      {/* KPI Kártyák (Linear Flat Grid – ADR A-029) */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Összes Hirdetés"
          value={`${postings.length} állás`}
          sub="Rögzített álláshirdetések"
        />
        <KpiCard
          label="Publikus Hirdetések"
          value={`${activePublicCount} állás`}
          sub="Külső karrieroldalon látható"
          highlight={activePublicCount > 0}
        />
        <KpiCard
          label="Belső Hirdetések"
          value={`${activeInternalCount} állás`}
          sub="Kizárólag munkatársaknak"
          highlight={activeInternalCount > 0}
        />
        <KpiCard
          label="Összes Jelentkező"
          value={`${candidates.length} fő`}
          sub="Beérkezett pályázatok"
        />
      </div>

      {/* Kanonikus TableToolbar + Kártyák/Lista nézetváltó + Új hirdetés gomb */}
      <TableToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Keresés pozíció, munkakör, részleg vagy helyszín alapján..."
        columns={viewMode === "list" ? columns : undefined}
        onToggleColumn={viewMode === "list" ? handleToggleColumn : undefined}
        filterGroups={filterGroups}
        activeFiltersCount={activeFiltersCount}
        onClearFilters={handleClearFilters}
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-md border border-border bg-muted/30 p-0.5 h-9">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-sm text-xs font-medium transition-colors",
                  viewMode === "cards"
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Kártyás nézet"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kártyák</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 h-7 rounded-sm text-xs font-medium transition-colors",
                  viewMode === "list"
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Lista nézet"
              >
                <List className="w-3.5 h-3.5" />
                <span>Lista</span>
              </button>
            </div>

            <ManagePostingDialog jobs={jobs} onSaved={addOrUpdate}>
              <Button size="sm" className="h-9 text-xs gap-1.5">
                <Plus className="h-4 w-4" />
                <span>Új hirdetés feladása</span>
              </Button>
            </ManagePostingDialog>
          </div>
        }
      />

      {/* Pozíciók megjelenítése: Kártyás vagy Lista nézet */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed rounded-lg bg-muted/10 space-y-2">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {searchTerm || activeFiltersCount > 0
                ? "Nincs a szűrésnek megfelelő álláshirdetés."
                : "Még nincsenek álláshirdetések."}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {searchTerm || activeFiltersCount > 0
                ? "Próbáld meg módosítani a keresőszót, vagy töröld a beállított szűrőket."
                : "Hozd létre az első pozíciót a toborzás megkezdéséhez."}
            </p>
          </div>
          {searchTerm || activeFiltersCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="mt-2 text-xs"
            >
              Szűrők visszaállítása
            </Button>
          ) : (
            <ManagePostingDialog jobs={jobs} onSaved={addOrUpdate}>
              <Button size="sm" className="mt-2 text-xs gap-1.5">
                <Plus className="h-4 w-4" />
                <span>Új hirdetés feladása</span>
              </Button>
            </ManagePostingDialog>
          )}
        </div>
      ) : viewMode === "cards" ? (
        /* KÁRTYÁS NÉZET */
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((posting) => {
            const applicantCount = getApplicantCount(posting)
            const dateStr =
              posting.nyitva_tol || posting.created_at
                ? new Date(
                    posting.nyitva_tol || posting.created_at!
                  ).toLocaleDateString("hu-HU", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "–"
            const salaryLabel = formatSalaryBand(
              posting.bersav_min,
              posting.bersav_max
            )

            return (
              <Card
                key={posting.id}
                className="flex flex-col border border-border hover:border-primary/40 transition-colors shadow-none bg-card"
              >
                <CardHeader className="space-y-3 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/hr/recruitment/posting/${posting.id}`}
                      className="text-lg font-semibold tracking-tight text-foreground hover:text-primary transition-colors line-clamp-1"
                      title="Kattints a jelentkezők és a pozíció részleteinek megtekintéséhez"
                    >
                      {posting.cim}
                    </Link>
                    {renderStatusBadge(posting)}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {posting.reszleg_nev && (
                      <Badge
                        variant="outline"
                        className="font-normal gap-1 text-muted-foreground border-border/70"
                      >
                        <Building2 className="w-3 h-3 text-primary" />
                        {posting.reszleg_nev}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Briefcase className="w-3 h-3 text-muted-foreground/80" />
                      <span className="truncate max-w-[180px]">
                        {posting.hr_munkakor?.megnevezes || "–"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {posting.munkavegzes_modja && (
                      <Badge variant="outline" className="font-normal text-[11px]">
                        {WORK_MODE_SHORT_LABELS[posting.munkavegzes_modja] ||
                          posting.munkavegzes_modja}
                      </Badge>
                    )}
                    {posting.tapasztalati_szint && (
                      <Badge variant="outline" className="font-normal text-[11px]">
                        {SENIORITY_LABELS[posting.tapasztalati_szint] ||
                          posting.tapasztalati_szint}
                      </Badge>
                    )}
                    {posting.helyszin && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground truncate max-w-[160px]">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {posting.helyszin.split(",")[0]}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-foreground/70" />
                      <span>Közzétéve: {dateStr}</span>
                    </div>
                    <Link
                      href={`/hr/recruitment/posting/${posting.id}`}
                      className="inline-flex items-center gap-1 text-foreground hover:text-primary font-medium tabular-nums px-2 py-0.5 rounded-md bg-muted/50 hover:bg-primary/10 border border-border/60 transition-colors"
                      title="Jelentkezők megtekintése"
                    >
                      <Users className="w-3 h-3 text-primary" />
                      {applicantCount} jelentkező
                    </Link>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 pb-3 space-y-2">
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {posting.rovid_leiras ||
                      "Nincs rövid összefoglaló megadva ehhez a pozícióhoz."}
                  </p>
                  {salaryLabel && (
                    <p className="text-[11px] font-medium text-primary tabular-nums">
                      {salaryLabel}
                      {!posting.bersav_publikus ? " (belső sáv)" : ""}
                    </p>
                  )}
                </CardContent>

                <div className="px-4 py-3 mt-auto border-t border-border/40 flex items-center justify-between gap-2">
                  {/* Láthatóság kapcsolók */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={!!posting.aktiv}
                        onCheckedChange={() =>
                          toggleStatus(posting.id, "aktiv", !!posting.aktiv)
                        }
                      />
                      <span className="text-[11px] text-muted-foreground">Aktív</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={!!posting.publikus && !posting.is_internal}
                        onCheckedChange={() =>
                          toggleStatus(
                            posting.id,
                            "publikus",
                            !!posting.publikus && !posting.is_internal
                          )
                        }
                      />
                      <span className="text-[11px] text-muted-foreground">Publikus</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={!!posting.is_internal}
                        onCheckedChange={() =>
                          toggleStatus(
                            posting.id,
                            "is_internal",
                            !!posting.is_internal
                          )
                        }
                      />
                      <span className="text-[11px] text-muted-foreground">Belső</span>
                    </div>
                  </div>

                  {/* Műveletek */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <ManagePostingDialog
                      jobs={jobs}
                      existingData={posting as any}
                      onSaved={addOrUpdate}
                    >
                      <Button variant="ghost" size="icon-xs" title="Szerkesztés">
                        <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </ManagePostingDialog>

                    {(posting.publikus || posting.is_internal) && (
                      <Link
                        href={
                          posting.is_internal
                            ? `/karrier/${posting.id}?scope=internal`
                            : `/karrier/${posting.id}`
                        }
                        target="_blank"
                      >
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          title="Megtekintés karrieroldalon"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      </Link>
                    )}

                    <Button
                      variant="ghost"
                      size="icon-xs"
                      title="Törlés"
                      onClick={() => handleDelete(posting.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        /* LISTA NÉZET (TÁBLÁZAT) */
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                {isColVisible("cim") && (
                  <TableHead className="text-xs font-semibold">
                    Pozíció megnevezése
                  </TableHead>
                )}
                {isColVisible("munkakor") && (
                  <TableHead className="text-xs font-semibold">
                    Munkakör és részleg
                  </TableHead>
                )}
                {isColVisible("munkavegzes") && (
                  <TableHead className="text-xs font-semibold">
                    Munkavégzés és szint
                  </TableHead>
                )}
                {isColVisible("jelentkezok") && (
                  <TableHead className="text-xs font-semibold">
                    Jelentkezők
                  </TableHead>
                )}
                {isColVisible("kozzeteve") && (
                  <TableHead className="text-xs font-semibold">
                    Közzétéve
                  </TableHead>
                )}
                {isColVisible("lathatosag") && (
                  <TableHead className="text-xs font-semibold">
                    Állapot és láthatóság
                  </TableHead>
                )}
                <TableHead className="text-xs font-semibold text-right">
                  Műveletek
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((posting) => {
                const applicantCount = getApplicantCount(posting)
                const dateStr =
                  posting.nyitva_tol || posting.created_at
                    ? new Date(
                        posting.nyitva_tol || posting.created_at!
                      ).toLocaleDateString("hu-HU", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "–"
                const salaryLabel = formatSalaryBand(
                  posting.bersav_min,
                  posting.bersav_max
                )

                return (
                  <TableRow
                    key={posting.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {isColVisible("cim") && (
                      <TableCell className="py-3 max-w-[260px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/hr/recruitment/posting/${posting.id}`}
                              className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate"
                              title="Jelentkezők és pozíció áttekintése"
                            >
                              {posting.cim}
                            </Link>
                            {renderStatusBadge(posting)}
                          </div>
                          {salaryLabel && (
                            <p className="text-[11px] text-primary font-medium tabular-nums">
                              {salaryLabel}
                              {!posting.bersav_publikus ? " (belső)" : ""}
                            </p>
                          )}
                        </div>
                      </TableCell>
                    )}

                    {isColVisible("munkakor") && (
                      <TableCell className="py-3 text-xs">
                        <div className="font-medium text-foreground">
                          {posting.hr_munkakor?.megnevezes || "–"}
                        </div>
                        {posting.reszleg_nev && (
                          <div className="text-[11px] text-muted-foreground">
                            {posting.reszleg_nev}
                          </div>
                        )}
                      </TableCell>
                    )}

                    {isColVisible("munkavegzes") && (
                      <TableCell className="py-3 text-xs text-muted-foreground">
                        <div>
                          {WORK_MODE_LABELS[posting.munkavegzes_modja || "hibrid"] ||
                            "Hibrid munkavégzés"}{" "}
                          •{" "}
                          {SENIORITY_LABELS[posting.tapasztalati_szint || "medior"] ||
                            "Medior"}
                        </div>
                        {posting.helyszin && (
                          <div className="text-[11px] text-muted-foreground/80 truncate max-w-[180px]">
                            {posting.helyszin}
                          </div>
                        )}
                      </TableCell>
                    )}

                    {isColVisible("jelentkezok") && (
                      <TableCell className="py-3 text-xs tabular-nums">
                        <Link
                          href={`/hr/recruitment/posting/${posting.id}`}
                          className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary px-2 py-0.5 rounded-md bg-muted/50 hover:bg-primary/10 border border-border/60 transition-colors"
                          title="Jelentkezők megtekintése"
                        >
                          <Users className="w-3.5 h-3.5 text-primary" />
                          {applicantCount} fő
                        </Link>
                      </TableCell>
                    )}

                    {isColVisible("kozzeteve") && (
                      <TableCell className="py-3 text-xs text-muted-foreground tabular-nums">
                        {dateStr}
                      </TableCell>
                    )}

                    {isColVisible("lathatosag") && (
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={!!posting.aktiv}
                              onCheckedChange={() =>
                                toggleStatus(posting.id, "aktiv", !!posting.aktiv)
                              }
                            />
                            <span className="text-[11px] text-muted-foreground">
                              Aktív
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={!!posting.publikus && !posting.is_internal}
                              onCheckedChange={() =>
                                toggleStatus(
                                  posting.id,
                                  "publikus",
                                  !!posting.publikus && !posting.is_internal
                                )
                              }
                            />
                            <span className="text-[11px] text-muted-foreground">
                              Publikus
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={!!posting.is_internal}
                              onCheckedChange={() =>
                                toggleStatus(
                                  posting.id,
                                  "is_internal",
                                  !!posting.is_internal
                                )
                              }
                            />
                            <span className="text-[11px] text-muted-foreground">
                              Belső
                            </span>
                          </div>
                        </div>
                      </TableCell>
                    )}

                    <TableCell className="py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <ManagePostingDialog
                          jobs={jobs}
                          existingData={posting as any}
                          onSaved={addOrUpdate}
                        >
                          <Button variant="ghost" size="icon-xs" title="Szerkesztés">
                            <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </ManagePostingDialog>

                        {(posting.publikus || posting.is_internal) && (
                          <Link
                            href={
                              posting.is_internal
                                ? `/karrier/${posting.id}?scope=internal`
                                : `/karrier/${posting.id}`
                            }
                            target="_blank"
                          >
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              title="Megtekintés karrieroldalon"
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-primary" />
                            </Button>
                          </Link>
                        )}

                        <Button
                          variant="ghost"
                          size="icon-xs"
                          title="Törlés"
                          onClick={() => handleDelete(posting.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
