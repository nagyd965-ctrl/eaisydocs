"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { KpiCard } from "@/components/kpi-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TableToolbar,
  type FilterGroup,
  type TableColumnOption,
} from "@/components/table-toolbar/table-toolbar"
import { DocumentViewer } from "@/components/document-viewer"
import { ManagePostingDialog } from "@/components/hr/manage-posting-dialog"
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  Edit,
  ExternalLink,
  Lock,
  MapPin,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  updateCandidateStatus,
  updateJobPostingFlagsAction,
} from "@/app/hr/recruitment/actions"
import {
  WORK_MODE_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  SENIORITY_LABELS,
  SOURCE_LABELS,
  formatSalaryBand,
} from "@/utils/hr/career-constants"

const STATUS_OPTIONS = [
  { value: "uj", label: "Új jelentkező" },
  { value: "eloszurt", label: "Előszűrt" },
  { value: "interju", label: "Interjú" },
  { value: "ajanlat", label: "Ajánlat" },
  { value: "elfogadva", label: "Elfogadva" },
  { value: "elutasitva", label: "Elutasítva" },
]

interface PostingDetailClientProps {
  initialPosting: any
  jobs: any[]
  candidates: any[]
  isReadOnly: boolean
}

export function PostingDetailClient({
  initialPosting,
  jobs,
  candidates,
  isReadOnly,
}: PostingDetailClientProps) {
  const router = useRouter()
  const [posting, setPosting] = useState<any>(initialPosting)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [localStatusMap, setLocalStatusMap] = useState<Record<string, string>>(
    {}
  )
  const [previewCv, setPreviewCv] = useState<{
    url: string
    name: string
  } | null>(null)

  const [columns, setColumns] = useState<TableColumnOption[]>([
    { id: "jelolt", label: "Jelölt neve és elérhetősége", isVisible: true },
    { id: "forras", label: "Forrás", isVisible: true },
    { id: "ai", label: "AI relevancia és készségek", isVisible: true },
    { id: "berigeny", label: "Bérigény vs. bérsáv", isVisible: true },
    { id: "datum", label: "Jelentkezés dátuma", isVisible: true },
    { id: "szakasz", label: "Toborzási szakasz", isVisible: true },
    { id: "muveletek", label: "Műveletek", isVisible: true },
  ])

  const isColVisible = (colId: string) =>
    columns.find((c) => c.id === colId)?.isVisible ?? true

  const handleToggleColumn = (colId: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, isVisible: !c.isVisible } : c))
    )
  }

  // E-mail szerinti deduplikálás az adott álláshirdetésen belül (legfrissebb rekord megtartása)
  const deduplicatedApplicants = useMemo(() => {
    const sorted = [...candidates].sort((a, b) => {
      const dA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dB = b.created_at ? new Date(b.created_at).getTime() : 0
      return dB - dA
    })

    const grouped = new Map<string, any>()
    for (const c of sorted) {
      const key =
        (c.email || "").toLowerCase().trim() ||
        (c.nev || "").toLowerCase().trim() ||
        c.id
      if (!grouped.has(key)) {
        grouped.set(key, {
          ...c,
          statusz: localStatusMap[c.id] || c.statusz || "uj",
          applicationCountForPosting: 1,
        })
      } else {
        const existing = grouped.get(key)!
        existing.applicationCountForPosting += 1
        if (Array.isArray(c.ai_skills) && c.ai_skills.length > 0) {
          existing.ai_skills = Array.from(
            new Set([...(existing.ai_skills || []), ...c.ai_skills])
          )
        }
        if (!existing.signedCvUrl && c.signedCvUrl) {
          existing.signedCvUrl = c.signedCvUrl
        }
      }
    }

    return Array.from(grouped.values())
  }, [candidates, localStatusMap])

  const filteredApplicants = useMemo(() => {
    const q = searchTerm.toLowerCase().trim()
    return deduplicatedApplicants.filter((c) => {
      const normStatus =
        c.statusz === "szures" ? "eloszurt" : c.statusz || "uj"
      if (
        selectedStatuses.length > 0 &&
        !selectedStatuses.includes(normStatus)
      ) {
        return false
      }
      if (q) {
        const matchName = (c.nev || "").toLowerCase().includes(q)
        const matchEmail = (c.email || "").toLowerCase().includes(q)
        const matchPhone = (c.telefonszam || c.telefon || "")
          .toLowerCase()
          .includes(q)
        const matchSkills = Array.isArray(c.ai_skills)
          ? c.ai_skills.some((s: string) => s.toLowerCase().includes(q))
          : false
        if (!matchName && !matchEmail && !matchPhone && !matchSkills) {
          return false
        }
      }
      return true
    })
  }, [deduplicatedApplicants, searchTerm, selectedStatuses])

  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        id: "statusz",
        title: "Toborzási szakasz",
        options: STATUS_OPTIONS.map((st) => {
          const count = deduplicatedApplicants.filter((c) => {
            const norm =
              c.statusz === "szures" ? "eloszurt" : c.statusz || "uj"
            return norm === st.value
          }).length
          return {
            id: st.value,
            label: `${st.label} (${count})`,
            checked: selectedStatuses.includes(st.value),
          }
        }),
        onToggle: (val) => {
          setSelectedStatuses((prev) =>
            prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
          )
        },
      },
    ],
    [deduplicatedApplicants, selectedStatuses]
  )

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedStatuses([])
  }

  // Pozíció KPI számítások
  const totalCount = deduplicatedApplicants.length
  const inProgressCount = deduplicatedApplicants.filter((c) =>
    ["uj", "eloszurt", "szures", "interju", "ajanlat"].includes(
      c.statusz || "uj"
    )
  ).length
  const acceptedCount = deduplicatedApplicants.filter(
    (c) => c.statusz === "elfogadva"
  ).length
  const avgMatchScore = useMemo(() => {
    const scored = deduplicatedApplicants.filter(
      (c) =>
        typeof c.ai_relevance_score === "number" ||
        typeof c.ai_match_score === "number"
    )
    if (scored.length === 0) return null
    const sum = scored.reduce(
      (acc, c) => acc + (c.ai_relevance_score ?? c.ai_match_score ?? 0),
      0
    )
    return Math.round(sum / scored.length)
  }, [deduplicatedApplicants])

  const salaryLabel = formatSalaryBand(posting.bersav_min, posting.bersav_max)
  const publishedDateStr =
    posting.nyitva_tol || posting.created_at
      ? new Date(posting.nyitva_tol || posting.created_at).toLocaleDateString(
          "hu-HU",
          {
            year: "numeric",
            month: "short",
            day: "numeric",
          }
        )
      : "–"

  async function handleToggleFlag(
    field: "aktiv" | "publikus" | "is_internal",
    current: boolean
  ) {
    if (isReadOnly) return
    const next = !current
    const prev = { ...posting }

    let updates: {
      aktiv?: boolean
      publikus?: boolean
      is_internal?: boolean
    } = {}
    if (field === "aktiv") {
      updates = { aktiv: next }
    } else if (field === "publikus") {
      updates = next
        ? { publikus: true, is_internal: false }
        : { publikus: false }
    } else if (field === "is_internal") {
      updates = next
        ? { is_internal: true, publikus: false }
        : { is_internal: false }
    }

    setPosting((p: any) => ({ ...p, ...updates }))
    const res = await updateJobPostingFlagsAction(posting.id, updates)
    if (res.error) {
      toast.error("Hiba a mentés során")
      setPosting(prev)
    } else {
      toast.success("Hirdetés beállításai frissítve")
      router.refresh()
    }
  }

  async function handleStatusChange(candidateId: string, newStatus: string) {
    if (isReadOnly) return
    setUpdatingId(candidateId)
    setLocalStatusMap((prev) => ({ ...prev, [candidateId]: newStatus }))
    try {
      const res = await updateCandidateStatus(candidateId, newStatus)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success("Jelölt státusza frissítve.")
        router.refresh()
      }
    } catch {
      toast.error("Hiba történt a státusz módosításakor.")
    } finally {
      setUpdatingId(null)
    }
  }

  function renderSalaryComparison(berigeny?: number | null) {
    if (!berigeny || berigeny <= 0) {
      return <span className="text-xs text-muted-foreground">–</span>
    }

    const formatted = `${new Intl.NumberFormat("hu-HU").format(berigeny)} Ft`
    const min = posting?.bersav_min
    const max = posting?.bersav_max

    if (!min && !max) {
      return (
        <span className="text-xs font-medium tabular-nums text-foreground">
          {formatted}
        </span>
      )
    }

    let badgeLabel = "Sávon belül"
    let badgeClass = "bg-success/10 text-success border-success/30"

    if (max && berigeny > max) {
      badgeLabel = "Sáv felett"
      badgeClass = "bg-warning/10 text-warning border-warning/30"
    } else if (min && berigeny < min) {
      badgeLabel = "Sáv alatt"
      badgeClass = "bg-info/10 text-info border-info/30"
    }

    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium tabular-nums text-foreground">
          {formatted}
        </span>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-1.5 py-0 font-normal",
            badgeClass
          )}
        >
          {badgeLabel}
        </Badge>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full pb-10">
      {/* Felső navigáció és pozíció fejléc */}
      <div className="flex flex-col gap-4 border-b border-border pb-5">
        <div>
          <Link
            href="/hr/recruitment?tab=postings"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Vissza az álláshirdetésekhez</span>
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {posting.cim}
              </h1>
              {!posting.aktiv ? (
                <Badge variant="outline" className="text-xs">
                  Inaktív
                </Badge>
              ) : posting.is_internal ? (
                <Badge
                  variant="outline"
                  className="text-xs bg-primary/10 text-primary border-primary/20 gap-1"
                >
                  <Lock className="w-3 h-3" />
                  Belső hirdetés
                </Badge>
              ) : posting.publikus ? (
                <Badge
                  variant="outline"
                  className="text-xs bg-success/10 text-success border-success/30"
                >
                  Publikus
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  Piszkozat
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              {posting.reszleg_nev && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span>{posting.reszleg_nev}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                <span>
                  {posting.hr_munkakor?.megnevezes || "Általános munkakör"}
                </span>
              </span>
              {posting.munkavegzes_modja && (
                <span>
                  {WORK_MODE_LABELS[posting.munkavegzes_modja] ||
                    posting.munkavegzes_modja}
                </span>
              )}
              {posting.foglalkoztatas_tipusa && (
                <span>
                  •{" "}
                  {EMPLOYMENT_TYPE_LABELS[posting.foglalkoztatas_tipusa] ||
                    posting.foglalkoztatas_tipusa}
                </span>
              )}
              {posting.tapasztalati_szint && (
                <span>
                  •{" "}
                  {SENIORITY_LABELS[posting.tapasztalati_szint] ||
                    posting.tapasztalati_szint}
                </span>
              )}
              {posting.helyszin && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{posting.helyszin}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Calendar className="w-3.5 h-3.5" />
                <span>Közzétéve: {publishedDateStr}</span>
              </span>
            </div>

            {salaryLabel && (
              <div className="text-xs font-semibold text-primary tabular-nums">
                Bérsáv: {salaryLabel}
                {!posting.bersav_publikus ? " (belső tájékoztató sáv)" : ""}
              </div>
            )}
          </div>

          {/* Jobb oldali műveletek és láthatóság kapcsolók */}
          <div className="flex flex-wrap items-center gap-3">
            {!isReadOnly && (
              <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-md border border-border bg-card">
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={!!posting.aktiv}
                    onCheckedChange={() =>
                      handleToggleFlag("aktiv", !!posting.aktiv)
                    }
                  />
                  <span className="text-xs text-muted-foreground">Aktív</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={!!posting.publikus && !posting.is_internal}
                    onCheckedChange={() =>
                      handleToggleFlag(
                        "publikus",
                        !!posting.publikus && !posting.is_internal
                      )
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    Publikus
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={!!posting.is_internal}
                    onCheckedChange={() =>
                      handleToggleFlag("is_internal", !!posting.is_internal)
                    }
                  />
                  <span className="text-xs text-muted-foreground">Belső</span>
                </div>
              </div>
            )}

            {!isReadOnly && (
              <ManagePostingDialog
                jobs={jobs}
                existingData={posting}
                onSaved={(updated) => {
                  const matchedJob = jobs.find(
                    (j) => j.id === updated.munkakor_id
                  )
                  setPosting({
                    ...updated,
                    hr_munkakor: updated.hr_munkakor || {
                      megnevezes: matchedJob?.megnevezes,
                    },
                  })
                  router.refresh()
                }}
              >
                <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
                  <Edit className="w-3.5 h-3.5" />
                  <span>Hirdetés szerkesztése</span>
                </Button>
              </ManagePostingDialog>
            )}

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
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Megtekintés karrieroldalon</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 4 db teljes szélességű Kanonikus KPI kártya */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Összes jelentkező"
          value={`${totalCount} fő`}
          sub="Egyedi pályázók erre a hirdetésre"
        />
        <KpiCard
          label="Folyamatban lévő"
          value={`${inProgressCount} fő`}
          sub="Aktív kiválasztási szakaszban"
          highlight={inProgressCount > 0}
        />
        <KpiCard
          label="Elfogadva / Felvéve"
          value={`${acceptedCount} fő`}
          sub="Sikeresen lezárt pályázók"
          highlight={acceptedCount > 0}
        />
        <KpiCard
          label="Átlagos AI Relevancia"
          value={avgMatchScore !== null ? `${avgMatchScore}%` : "–"}
          sub="AI alapú szakmai illeszkedés"
        />
      </div>

      {/* Kanonikus TableToolbar + Jelentkezők táblázata */}
      <div className="space-y-4">
        <TableToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Keresés a jelentkezők között név, e-mail, telefon vagy AI készség alapján..."
          columns={columns}
          onToggleColumn={handleToggleColumn}
          filterGroups={filterGroups}
          activeFiltersCount={selectedStatuses.length}
          onClearFilters={handleClearFilters}
        />

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                {isColVisible("jelolt") && (
                  <TableHead className="text-xs font-semibold">
                    Jelölt neve és elérhetősége
                  </TableHead>
                )}
                {isColVisible("forras") && (
                  <TableHead className="text-xs font-semibold">
                    Forrás
                  </TableHead>
                )}
                {isColVisible("ai") && (
                  <TableHead className="text-xs font-semibold">
                    AI relevancia és készségek
                  </TableHead>
                )}
                {isColVisible("berigeny") && (
                  <TableHead className="text-xs font-semibold">
                    Bérigény vs. bérsáv
                  </TableHead>
                )}
                {isColVisible("datum") && (
                  <TableHead className="text-xs font-semibold">
                    Jelentkezés dátuma
                  </TableHead>
                )}
                {isColVisible("szakasz") && (
                  <TableHead className="text-xs font-semibold">
                    Toborzási szakasz
                  </TableHead>
                )}
                {isColVisible("muveletek") && (
                  <TableHead className="text-xs font-semibold text-right">
                    Műveletek
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplicants.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.filter((c) => c.isVisible).length || 7}
                    className="h-32 text-center"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {totalCount === 0
                          ? "Még nem érkezett jelentkezés erre az álláshirdetésre."
                          : "Nincs a szűrésnek megfelelő jelentkező."}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {totalCount === 0
                          ? "A publikus vagy belső karrieroldalon beküldött pályázatok automatikusan megjelennek itt."
                          : "Próbáld meg módosítani a keresőszót vagy töröld a szűrőket."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredApplicants.map((c) => {
                  const currentStatus =
                    c.statusz === "szures" ? "eloszurt" : c.statusz || "uj"
                  const dateStr = c.created_at
                    ? new Date(c.created_at).toLocaleDateString("hu-HU", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "–"

                  return (
                    <TableRow
                      key={c.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() =>
                        router.push(`/hr/recruitment/candidate/${c.id}`)
                      }
                    >
                      {isColVisible("jelolt") && (
                        <TableCell className="py-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/hr/recruitment/candidate/${c.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                              >
                                {c.nev}
                              </Link>
                              {c.palyazati_kod && (
                                <span className="text-[11px] font-mono text-muted-foreground">
                                  {c.palyazati_kod}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground tabular-nums">
                              {c.email || "–"}
                              {c.telefonszam || c.telefon
                                ? ` • ${c.telefonszam || c.telefon}`
                                : ""}
                            </div>
                          </div>
                        </TableCell>
                      )}

                      {isColVisible("forras") && (
                        <TableCell className="py-3">
                          <Badge
                            variant="outline"
                            className="text-xs font-normal text-muted-foreground"
                          >
                            {SOURCE_LABELS[c.forras] || c.forras || "Karrieroldal"}
                          </Badge>
                        </TableCell>
                      )}

                      {isColVisible("ai") && (
                        <TableCell className="py-3">
                          <div className="space-y-1">
                            {typeof (c.ai_relevance_score ?? c.ai_match_score) ===
                            "number" ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[11px] font-semibold tabular-nums",
                                  (c.ai_relevance_score ?? c.ai_match_score) >= 75
                                    ? "bg-success/10 text-success border-success/30"
                                    : (c.ai_relevance_score ?? c.ai_match_score) >= 50
                                    ? "bg-warning/10 text-warning border-warning/30"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {c.ai_relevance_score ?? c.ai_match_score}% illeszkedés
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Nincs AI pontszám
                              </span>
                            )}

                            {Array.isArray(c.ai_skills) &&
                              c.ai_skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 max-w-[240px]">
                                  {c.ai_skills
                                    .slice(0, 3)
                                    .map((skill: string, idx: number) => (
                                      <Badge
                                        key={idx}
                                        variant="secondary"
                                        className="text-[10px] px-1.5 py-0 font-normal"
                                      >
                                        {skill}
                                      </Badge>
                                    ))}
                                  {c.ai_skills.length > 3 && (
                                    <span className="text-[10px] text-muted-foreground tabular-nums">
                                      +{c.ai_skills.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                          </div>
                        </TableCell>
                      )}

                      {isColVisible("berigeny") && (
                        <TableCell className="py-3">
                          {renderSalaryComparison(c.berigeny)}
                        </TableCell>
                      )}

                      {isColVisible("datum") && (
                        <TableCell className="py-3 text-xs text-muted-foreground tabular-nums">
                          {dateStr}
                        </TableCell>
                      )}

                      {isColVisible("szakasz") && (
                        <TableCell
                          className="py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Select
                            value={currentStatus}
                            disabled={isReadOnly || updatingId === c.id}
                            onValueChange={(val) =>
                              handleStatusChange(c.id, val)
                            }
                          >
                            <SelectTrigger className="h-8 w-[150px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((opt) => (
                                <SelectItem
                                  key={opt.value}
                                  value={opt.value}
                                  className="text-xs"
                                >
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      )}

                      {isColVisible("muveletek") && (
                        <TableCell
                          className="py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {c.signedCvUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2.5"
                                onClick={() =>
                                  setPreviewCv({
                                    url: c.signedCvUrl,
                                    name: `${c.nev} – Önéletrajz`,
                                  })
                                }
                              >
                                CV megtekintése
                              </Button>
                            )}
                            <Link href={`/hr/recruitment/candidate/${c.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2.5"
                              >
                                Profil megnyitása
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Álláshirdetés szöveges tartalma */}
      {(posting.rovid_leiras || posting.reszletes_leiras) && (
        <Card className="border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Álláshirdetés tartalma és leírása
            </CardTitle>
            <CardDescription className="text-xs">
              A pozícióhoz megadott rövid összefoglaló és részletes hirdetésszöveg
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {posting.rovid_leiras && (
              <div className="rounded-md bg-muted/30 border border-border/60 p-3.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Rövid összefoglaló
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {posting.rovid_leiras}
                </p>
              </div>
            )}
            {posting.reszletes_leiras && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Részletes leírás
                </p>
                <div className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed rounded-md border border-border/60 p-4 bg-background">
                  {posting.reszletes_leiras}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {previewCv && (
        <DocumentViewer
          open={!!previewCv}
          setOpen={(isOpen) => {
            if (!isOpen) setPreviewCv(null)
          }}
          fajl={{
            fajlnev: previewCv.name,
            SignedUrl: previewCv.url,
          }}
        />
      )}
    </div>
  )
}
