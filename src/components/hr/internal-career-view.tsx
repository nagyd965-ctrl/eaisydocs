"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
  Briefcase,
  ArrowRight,
  Lock,
  Building2,
  Calendar,
  UserPlus,
  Gift,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Trash2,
  LayoutGrid,
  List,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { MyReferralsView } from "./my-referrals-view"
import { ReferralDialog } from "./referral-dialog"
import {
  getMyReferralsAction,
  withdrawInternalApplicationAction,
  type InternalJobApplication,
} from "@/app/hr/self-service/career/referral-actions"
import {
  WORK_MODE_LABELS,
  SENIORITY_LABELS,
} from "@/utils/hr/career-constants"
import type { EmployeeReferral } from "@/types/hr"

export interface InternalJobPosting {
  id: string
  cim: string
  rovid_leiras?: string | null
  reszletes_leiras?: string | null
  nyitva_tol?: string | null
  nyitva_ig?: string | null
  is_internal?: boolean | null
  publikus?: boolean | null
  munkavegzes_modja?: string | null
  foglalkoztatas_tipusa?: string | null
  tapasztalati_szint?: string | null
  helyszin?: string | null
  reszleg_nev?: string | null
  bersav_min?: number | null
  bersav_max?: number | null
  bersav_publikus?: boolean | null
  created_at?: string
  hr_munkakor?: {
    id?: string
    megnevezes?: string
    hr_szervezeti_egyseg?: {
      id?: string
      nev?: string
    } | { id?: string; nev?: string }[] | null
  } | null
}

interface InternalCareerViewProps {
  postings: InternalJobPosting[]
  initialReferrals?: EmployeeReferral[]
  initialApplications?: InternalJobApplication[]
  bonusAmount?: number
  currentEmployee?: {
    nev: string
    email: string
    munkakor: string
  }
}

const APPLICATION_STATUS_MAP: Record<string, { label: string; className: string }> = {
  uj: { label: "Beküldve (Elbírálásra vár)", className: "bg-info/10 text-info border-info/30" },
  szures: { label: "Előszűrés alatt", className: "bg-warning/10 text-warning border-warning/30" },
  interju: { label: "Interjú folyamatban", className: "bg-primary/10 text-primary border-primary/30" },
  ajanlat: { label: "Ajánlattétel", className: "bg-success/10 text-success border-success/30" },
  elfogadva: { label: "Elfogadva", className: "bg-success/15 text-success border-success/30" },
  elutasitva: { label: "Elutasítva", className: "bg-destructive/10 text-destructive border-destructive/30" },
  talent_pool: { label: "Tehetségbázisban", className: "bg-muted text-muted-foreground border-border" },
}

export function InternalCareerView({
  postings,
  initialReferrals = [],
  initialApplications = [],
  bonusAmount = 150000,
}: InternalCareerViewProps) {
  const [activeTab, setActiveTab] = useState<string>("jobs")
  const [referrals, setReferrals] = useState<EmployeeReferral[]>(initialReferrals)
  const [applications, setApplications] = useState<InternalJobApplication[]>(initialApplications)
  const [referralDialogOpen, setReferralDialogOpen] = useState(false)
  const [selectedJobForReferral, setSelectedJobForReferral] = useState<string | null>(null)
  const [withdrawingAppId, setWithdrawingAppId] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [selectedWorkModes, setSelectedWorkModes] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards")

  const [columns, setColumns] = useState<TableColumnOption[]>([
    { id: "cim", label: "Pozíció megnevezése", isVisible: true },
    { id: "reszleg", label: "Részleg", isVisible: true },
    { id: "munkakor", label: "Munkakör és szint", isVisible: true },
    { id: "munkavegzes", label: "Munkavégzés módja", isVisible: true },
    { id: "kozzeteve", label: "Közzétéve", isVisible: true },
    { id: "bonusz", label: "Ajánlási sikerdíj", isVisible: true },
  ])

  const isColVisible = (colId: string) =>
    columns.find((c) => c.id === colId)?.isVisible ?? true

  const handleToggleColumn = (colId: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === colId ? { ...c, isVisible: !c.isVisible } : c))
    )
  }

  // A Belső Állások nézetben kizárólag a valóban belsőnek meghirdetett (is_internal = true) állásokat listázzuk
  const internalPostings = useMemo(
    () => postings.filter((job) => Boolean(job.is_internal)),
    [postings]
  )

  // Bónusz formázó
  const formattedBonus = new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(bonusAmount)

  // Részleg kinyerése segédfüggvény
  const getJobDepartment = (job: InternalJobPosting): string => {
    if (job.reszleg_nev?.trim()) return job.reszleg_nev.trim()
    const unit = job.hr_munkakor?.hr_szervezeti_egyseg
    if (Array.isArray(unit)) {
      return unit[0]?.nev || "Általános / Egyéb"
    }
    return unit?.nev || "Általános / Egyéb"
  }

  // Összes elérhető részleg és darabszámaik (belső állásokra)
  const departmentsWithCounts = useMemo(() => {
    const counts = new Map<string, number>()
    internalPostings.forEach((job) => {
      const dept = getJobDepartment(job)
      counts.set(dept, (counts.get(dept) || 0) + 1)
    })
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "hu"))
  }, [internalPostings])

  // Szűrt belső pozíciók
  const filteredPostings = useMemo(() => {
    return internalPostings.filter((job) => {
      // 1. Szöveges keresés (cím, leírás, munkakör, részleg)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchesTitle = job.cim?.toLowerCase().includes(term)
        const matchesDesc = job.rovid_leiras?.toLowerCase().includes(term)
        const matchesJobTitle = job.hr_munkakor?.megnevezes?.toLowerCase().includes(term)
        const matchesDept = getJobDepartment(job).toLowerCase().includes(term)

        if (!matchesTitle && !matchesDesc && !matchesJobTitle && !matchesDept) {
          return false
        }
      }

      // 2. Részleg szűrő
      if (selectedDepartments.length > 0) {
        const dept = getJobDepartment(job)
        if (!selectedDepartments.includes(dept)) {
          return false
        }
      }

      // 3. Munkavégzés módja szűrő
      if (selectedWorkModes.length > 0) {
        const wm = job.munkavegzes_modja || "hibrid"
        if (!selectedWorkModes.includes(wm)) {
          return false
        }
      }

      return true
    })
  }, [internalPostings, searchTerm, selectedDepartments, selectedWorkModes])

  // KPI statisztikák a belső állásokhoz
  const internalCount = internalPostings.length
  const departmentsCount = departmentsWithCounts.length

  // Szűrőcsoportok a TableToolbar-hoz
  const filterGroups: FilterGroup[] = [
    {
      id: "departments",
      title: "Részleg / Szervezeti Egység",
      options: departmentsWithCounts.map((d) => ({
        id: d.name,
        label: `${d.name} (${d.count})`,
        checked: selectedDepartments.includes(d.name),
      })),
      onToggle: (deptName) => {
        setSelectedDepartments((prev) =>
          prev.includes(deptName) ? prev.filter((d) => d !== deptName) : [...prev, deptName]
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
    selectedDepartments.length + selectedWorkModes.length

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedDepartments([])
    setSelectedWorkModes([])
  }

  // Ajánlás frissítése sikeres beküldés után
  const handleReferralSuccess = async () => {
    const updated = await getMyReferralsAction()
    setReferrals(updated)
    setActiveTab("referrals")
  }

  const handleOpenReferralForJob = (jobId: string) => {
    setSelectedJobForReferral(jobId)
    setReferralDialogOpen(true)
  }

  const handleOpenGeneralReferral = () => {
    setSelectedJobForReferral(null)
    setReferralDialogOpen(true)
  }

  const appliedJobIds = useMemo(() => {
    const ids = new Set<string>()
    applications.forEach((app) => {
      if (app.allashirdetes_id && app.statusz !== "elutasitva") {
        ids.add(app.allashirdetes_id)
      }
    })
    return ids
  }, [applications])

  const handleWithdrawApplication = async (appId: string) => {
    setWithdrawingAppId(appId)
    try {
      const res = await withdrawInternalApplicationAction(appId)
      if (!res.success) {
        toast.error(res.error || "Nem sikerült visszavonni a pályázatot.")
      } else {
        setApplications((prev) => prev.filter((a) => a.id !== appId))
        toast.success("Belső pályázat sikeresen visszavonva.")
      }
    } catch {
      toast.error("Hiba történt a visszavonás során.")
    } finally {
      setWithdrawingAppId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Fejléc: Cím és globális Ajánlás gomb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Karrier és Ajánlások</h1>
          <p className="text-muted-foreground mt-1">
            Böngéssz belső nyitott pozícióink között, pályázz közvetlenül, vagy ajánlj tehetséges ismerőst fix sikerdíjért!
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Link
            href="/karrier?scope=internal"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "text-xs shrink-0 gap-1.5"
            )}
          >
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span>Karrieroldal (Belső hirdetések)</span>
          </Link>
          <Button
            onClick={handleOpenGeneralReferral}
            size="sm"
            className="text-xs shrink-0 gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Ismerős ajánlása</span>
          </Button>
        </div>
      </div>

      {/* Fülek: Belső álláshirdetések, Saját pályázataim, Saját ajánlásaim */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-2">
          <TabsTrigger
            value="jobs"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2.5 text-xs font-medium gap-2 cursor-pointer"
          >
            <span>Belső álláshirdetések</span>
            <span className="inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {internalCount}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="applications"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2.5 text-xs font-medium gap-2 cursor-pointer"
          >
            <span>Saját pályázataim</span>
            {applications.length > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {applications.length}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="referrals"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2.5 text-xs font-medium gap-2 cursor-pointer"
          >
            <span>Saját ajánlásaim</span>
            {referrals.length > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {referrals.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 1. FÜL: BELSŐ ÁLLÁSHIRDETÉSEK */}
        <TabsContent value="jobs" className="space-y-6 m-0 outline-none">
          {/* KPI Kártyák (Linear Flat Grid – ADR A-029) */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Nyitott Belső Pozíciók"
              value={`${internalCount} állás`}
              sub="Kizárólag munkatársaknak meghirdetve"
              highlight={internalCount > 0}
            />
            <KpiCard
              label="Érintett Területek"
              value={`${departmentsCount} részleg`}
              sub="Különböző szervezeti egységek"
            />
            <KpiCard
              label="Saját Pályázataim"
              value={`${applications.length} pályázat`}
              sub="Eddig benyújtott belső jelentkezéseid"
            />
            <KpiCard
              label="Ajánlási Sikerdíj"
              value={formattedBonus}
              sub="Fix bónusz / sikeres felvétel"
              highlight={true}
            />
          </div>

          {/* Kanonikus TableToolbar (ADR A-029 & PRD P-043) + Kártya/Lista nézetváltó */}
          <TableToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Keresés belső pozíció, leírás vagy munkakör alapján..."
            columns={viewMode === "list" ? columns : undefined}
            onToggleColumn={viewMode === "list" ? handleToggleColumn : undefined}
            filterGroups={filterGroups}
            activeFiltersCount={activeFiltersCount}
            onClearFilters={handleClearFilters}
            actions={
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
            }
          />

          {/* Pozíciók megjelenítése: Kártyás vagy Lista nézet */}
          {filteredPostings.length > 0 ? (
            viewMode === "cards" ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredPostings.map((hirdetes) => {
                  const dept = getJobDepartment(hirdetes)
                  const dateStr =
                    hirdetes.nyitva_tol || hirdetes.created_at
                      ? new Date(
                          hirdetes.nyitva_tol || hirdetes.created_at!
                        ).toLocaleDateString("hu-HU", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : null

                  return (
                    <Card
                      key={hirdetes.id}
                      className="flex flex-col border border-border hover:border-primary/40 transition-colors shadow-none bg-card"
                    >
                      <CardHeader className="space-y-3 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg font-semibold tracking-tight text-foreground line-clamp-1">
                            {hirdetes.cim}
                          </CardTitle>
                          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold bg-primary/10 text-primary border-primary/20 shrink-0">
                            <Lock className="w-3 h-3" />
                            Belső
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge
                            variant="outline"
                            className="font-normal gap-1 text-muted-foreground border-border/70"
                          >
                            <Building2 className="w-3 h-3 text-primary" />
                            {dept}
                          </Badge>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Briefcase className="w-3 h-3 text-muted-foreground/80" />
                            <span className="truncate max-w-[160px]">
                              {hirdetes.hr_munkakor?.megnevezes || hirdetes.cim}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                          {dateStr ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-muted-foreground/70" />
                              <span>Közzétéve: {dateStr}</span>
                            </div>
                          ) : (
                            <div />
                          )}

                          <span className="inline-flex items-center gap-1 text-primary font-medium text-[11px] tabular-nums">
                            <Gift className="w-3 h-3" />
                            {formattedBonus} bónusz
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="flex-1 pb-4">
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {hirdetes.rovid_leiras ||
                            "Nincs részletes leírás megadva ehhez a pozícióhoz."}
                        </p>
                      </CardContent>

                      <div className="p-4 pt-0 mt-auto border-t border-border/40 pt-4 grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReferralForJob(hirdetes.id)}
                          className="text-xs font-medium gap-1.5"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-primary" />
                          <span>Ajánlás</span>
                        </Button>

                        {appliedJobIds.has(hirdetes.id) ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setActiveTab("applications")}
                            className="text-xs font-medium gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                            <span>Már pályáztál</span>
                          </Button>
                        ) : (
                          <Link
                            href={`/karrier/${hirdetes.id}?scope=internal`}
                            className={cn(
                              buttonVariants({
                                variant: "default",
                                size: "sm",
                              }),
                              "text-xs font-medium gap-1.5"
                            )}
                          >
                            <span>Pályázás</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
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
                      {isColVisible("reszleg") && (
                        <TableHead className="text-xs font-semibold">
                          Részleg
                        </TableHead>
                      )}
                      {isColVisible("munkakor") && (
                        <TableHead className="text-xs font-semibold">
                          Munkakör és szint
                        </TableHead>
                      )}
                      {isColVisible("munkavegzes") && (
                        <TableHead className="text-xs font-semibold">
                          Munkavégzés módja
                        </TableHead>
                      )}
                      {isColVisible("kozzeteve") && (
                        <TableHead className="text-xs font-semibold">
                          Közzétéve
                        </TableHead>
                      )}
                      {isColVisible("bonusz") && (
                        <TableHead className="text-xs font-semibold text-right">
                          Ajánlási sikerdíj
                        </TableHead>
                      )}
                      <TableHead className="text-xs font-semibold text-right">
                        Műveletek
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPostings.map((hirdetes) => {
                      const dept = getJobDepartment(hirdetes)
                      const dateStr =
                        hirdetes.nyitva_tol || hirdetes.created_at
                          ? new Date(
                              hirdetes.nyitva_tol || hirdetes.created_at!
                            ).toLocaleDateString("hu-HU", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "–"
                      const workModeLabel =
                        WORK_MODE_LABELS[hirdetes.munkavegzes_modja || "hibrid"] ||
                        "Hibrid munkavégzés"
                      const seniorityLabel =
                        SENIORITY_LABELS[hirdetes.tapasztalati_szint || "medior"] ||
                        "Medior"

                      return (
                        <TableRow
                          key={hirdetes.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          {isColVisible("cim") && (
                            <TableCell className="py-3 max-w-[280px]">
                              <div className="space-y-0.5">
                                <Link
                                  href={`/karrier/${hirdetes.id}?scope=internal`}
                                  className="text-sm font-semibold text-foreground hover:text-primary transition-colors block truncate"
                                >
                                  {hirdetes.cim}
                                </Link>
                                {hirdetes.rovid_leiras && (
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {hirdetes.rovid_leiras}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          )}
                          {isColVisible("reszleg") && (
                            <TableCell className="py-3">
                              <Badge
                                variant="outline"
                                className="font-normal text-xs text-muted-foreground"
                              >
                                {dept}
                              </Badge>
                            </TableCell>
                          )}
                          {isColVisible("munkakor") && (
                            <TableCell className="py-3 text-xs">
                              <div className="font-medium text-foreground">
                                {hirdetes.hr_munkakor?.megnevezes || hirdetes.cim}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {seniorityLabel} szint
                              </div>
                            </TableCell>
                          )}
                          {isColVisible("munkavegzes") && (
                            <TableCell className="py-3 text-xs text-muted-foreground">
                              <div>{workModeLabel}</div>
                              {hirdetes.helyszin && (
                                <div className="text-[11px] text-muted-foreground/80 truncate max-w-[180px]">
                                  {hirdetes.helyszin}
                                </div>
                              )}
                            </TableCell>
                          )}
                          {isColVisible("kozzeteve") && (
                            <TableCell className="py-3 text-xs text-muted-foreground tabular-nums">
                              {dateStr}
                            </TableCell>
                          )}
                          {isColVisible("bonusz") && (
                            <TableCell className="py-3 text-xs font-medium text-primary text-right tabular-nums">
                              {formattedBonus}
                            </TableCell>
                          )}
                          <TableCell className="py-3 text-right">
                            <div className="inline-flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenReferralForJob(hirdetes.id)}
                                className="h-7 px-2.5 text-xs font-medium gap-1"
                              >
                                <UserPlus className="w-3 h-3 text-primary" />
                                <span>Ajánlás</span>
                              </Button>

                              {appliedJobIds.has(hirdetes.id) ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setActiveTab("applications")}
                                  className="h-7 w-[116px] justify-center px-2.5 text-xs font-medium gap-1 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-success shrink-0" />
                                  <span>Már pályáztál</span>
                                </Button>
                              ) : (
                                <Link
                                  href={`/karrier/${hirdetes.id}?scope=internal`}
                                  className={cn(
                                    buttonVariants({
                                      variant: "default",
                                      size: "sm",
                                    }),
                                    "h-7 w-[116px] justify-center px-2.5 text-xs font-medium gap-1"
                                  )}
                                >
                                  <span>Pályázás</span>
                                  <ArrowRight className="w-3 h-3 shrink-0" />
                                </Link>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )
          ) : (
            /* Üres állapot (Empty State) */
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed rounded-lg bg-muted/10 space-y-2">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {internalPostings.length === 0
                    ? "Jelenleg nincsenek nyitott belső pozíciók."
                    : "Nincs a szűrésnek megfelelő nyitott belső pozíció."}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  {internalPostings.length === 0
                    ? "Kérjük, nézz vissza később, vagy ajánlj ismerőst a cég általános tehetségbázisába a fenti gombra kattintva!"
                    : "Próbáld meg módosítani a keresőszót, vagy töröld a beállított szűrőket."}
                </p>
              </div>
              {activeFiltersCount > 0 || searchTerm ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="mt-2 text-xs"
                >
                  Szűrők visszaállítása
                </Button>
              ) : null}
            </div>
          )}
        </TabsContent>

        {/* 2. FÜL: SAJÁT BELSŐ PÁLYÁZATAIM */}
        <TabsContent value="applications" className="space-y-6 m-0 outline-none">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Saját belső pályázataim</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                A cégen belül megpályázott pozícióid és azok aktuális kiválasztási státusza
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {applications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 px-4 text-center space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    Még nem nyújtottál be belső álláspályázatot
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Válassz egy nyitott pozíciót az Álláshirdetések fülön, és jelentkezz egyetlen kattintással belső munkatársként.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("jobs")}
                    className="mt-2 text-xs cursor-pointer"
                  >
                    Nyitott pozíciók megtekintése
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {applications.map((app) => {
                    const posTitle =
                      app.hr_allashirdetes?.cim ||
                      app.hr_munkakor?.megnevezes ||
                      app.hr_allashirdetes?.hr_munkakor?.megnevezes ||
                      "Belső pozíció"
                    const statusInfo = APPLICATION_STATUS_MAP[app.statusz] || {
                      label: app.statusz,
                      className: "bg-muted text-muted-foreground border-border",
                    }
                    const canWithdraw = app.statusz === "uj" || app.statusz === "szures"
                    const cleanNote = (app.uzenet || "").replace(/^\[Belső pályázat[^\]]*\]:\s*/, "")

                    return (
                      <div
                        key={app.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">
                              {posTitle}
                            </span>
                            {app.palyazati_kod && (
                              <Badge variant="outline" className="text-[10px] font-mono tabular-nums">
                                {app.palyazati_kod}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span>
                              Beküldve: {new Date(app.created_at).toLocaleDateString("hu-HU")}
                            </span>
                            {app.interju_idopont && (
                              <span className="text-primary font-medium">
                                • Interjú időpontja: {new Date(app.interju_idopont).toLocaleString("hu-HU")}
                                {app.interju_helyszin ? ` (${app.interju_helyszin})` : ""}
                              </span>
                            )}
                          </div>
                          {cleanNote && (
                            <p className="text-xs text-muted-foreground italic line-clamp-2 pt-0.5">
                              „{cleanNote}”
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          {canWithdraw && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={withdrawingAppId === app.id}
                              onClick={() => handleWithdrawApplication(app.id)}
                              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5 px-2.5 cursor-pointer"
                            >
                              {withdrawingAppId === app.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              <span>Visszavonás</span>
                            </Button>
                          )}
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border",
                              statusInfo.className
                            )}
                          >
                            {app.statusz === "elfogadva" ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : app.statusz === "elutasitva" ? (
                              <XCircle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. FÜL: SAJÁT AJÁNLÁSAIM */}
        <TabsContent value="referrals" className="space-y-6 m-0 outline-none">
          <MyReferralsView
            referrals={referrals}
            bonusAmount={bonusAmount}
            onOpenReferralModal={handleOpenGeneralReferral}
            onDeleteReferral={(deletedId) => {
              setReferrals((prev) => prev.filter((r) => r.id !== deletedId))
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Ajánlás Modál */}
      <ReferralDialog
        open={referralDialogOpen}
        onOpenChange={setReferralDialogOpen}
        postings={postings}
        defaultJobId={selectedJobForReferral}
        bonusAmount={bonusAmount}
        onSuccess={handleReferralSuccess}
      />
    </div>
  )
}
