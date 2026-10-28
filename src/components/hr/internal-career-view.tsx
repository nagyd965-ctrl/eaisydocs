"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { KpiCard } from "@/components/kpi-card"
import { TableToolbar, FilterGroup } from "@/components/table-toolbar/table-toolbar"
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
  const [onlyInternal, setOnlyInternal] = useState(false)
  const [onlyPublic, setOnlyPublic] = useState(false)

  // Bónusz formázó
  const formattedBonus = new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(bonusAmount)

  // Részleg kinyerése segédfüggvény
  const getJobDepartment = (job: InternalJobPosting): string => {
    const unit = job.hr_munkakor?.hr_szervezeti_egyseg
    if (Array.isArray(unit)) {
      return unit[0]?.nev || "Általános / Egyéb"
    }
    return unit?.nev || "Általános / Egyéb"
  }

  // Összes elérhető részleg és darabszámaik
  const departmentsWithCounts = useMemo(() => {
    const counts = new Map<string, number>()
    postings.forEach((job) => {
      const dept = getJobDepartment(job)
      counts.set(dept, (counts.get(dept) || 0) + 1)
    })
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "hu"))
  }, [postings])

  // Szűrt pozíciók
  const filteredPostings = useMemo(() => {
    return postings.filter((job) => {
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

      // 3. Kizárólag belső
      if (onlyInternal && !job.is_internal) {
        return false
      }

      // 4. Publikus
      if (onlyPublic && !job.publikus) {
        return false
      }

      return true
    })
  }, [postings, searchTerm, selectedDepartments, onlyInternal, onlyPublic])

  // KPI statisztikák az állásokhoz
  const totalCount = postings.length
  const internalCount = postings.filter((j) => j.is_internal).length
  const departmentsCount = departmentsWithCounts.length

  const latestJob = useMemo(() => {
    if (postings.length === 0) return null
    return [...postings].sort((a, b) => {
      const dateA = new Date(a.nyitva_tol || a.created_at || 0).getTime()
      const dateB = new Date(b.nyitva_tol || b.created_at || 0).getTime()
      return dateB - dateA
    })[0]
  }, [postings])

  const latestJobDateStr = latestJob?.nyitva_tol || latestJob?.created_at
    ? new Date(latestJob.nyitva_tol || latestJob.created_at!).toLocaleDateString("hu-HU", {
        month: "short",
        day: "numeric",
      })
    : "-"

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
      id: "scope",
      title: "Állás Jellege",
      options: [
        {
          id: "only_internal",
          label: `Kizárólag belső pályázat (${internalCount})`,
          checked: onlyInternal,
        },
        {
          id: "only_public",
          label: `Külsőleg is nyitott (${postings.filter((j) => j.publikus).length})`,
          checked: onlyPublic,
        },
      ],
      onToggle: (optId) => {
        if (optId === "only_internal") {
          setOnlyInternal((prev) => !prev)
        } else if (optId === "only_public") {
          setOnlyPublic((prev) => !prev)
        }
      },
    },
  ]

  const activeFiltersCount =
    selectedDepartments.length +
    (onlyInternal ? 1 : 0) +
    (onlyPublic ? 1 : 0)

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedDepartments([])
    setOnlyInternal(false)
    setOnlyPublic(false)
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

      {/* Fülek: Álláshirdetések vs Saját ajánlásaim (Option "A") */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-2">
          <TabsTrigger
            value="jobs"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2.5 text-xs font-medium gap-2"
          >
            <span>Álláshirdetések</span>
            <span className="inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {postings.length}
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

        {/* 1. FÜL: ÁLLÁSHIRDETÉSEK */}
        <TabsContent value="jobs" className="space-y-6 m-0 outline-none">
          {/* KPI Kártyák (Linear Flat Grid – ADR A-029) */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Nyitott Pozíciók"
              value={`${totalCount} állás`}
              sub="Jelenleg elérhető lehetőségek"
            />
            <KpiCard
              label="Belső Pályázatok"
              value={`${internalCount} pozíció`}
              sub="Kizárólag munkatársaknak"
              highlight={internalCount > 0}
            />
            <KpiCard
              label="Érintett Területek"
              value={`${departmentsCount} részleg`}
              sub="Különböző szervezeti egységek"
            />
            <KpiCard
              label="Ajánlási Sikerdíj"
              value={formattedBonus}
              sub="Fix bónusz / sikeres felvétel"
              highlight={true}
            />
          </div>

          {/* Kanonikus TableToolbar (ADR A-029 & PRD P-043) */}
          <TableToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Keresés pozíció, leírás vagy munkakör alapján..."
            filterGroups={filterGroups}
            activeFiltersCount={activeFiltersCount}
            onClearFilters={handleClearFilters}
          />

          {/* Pozíciók kártyarácsa */}
          {filteredPostings.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredPostings.map((hirdetes) => {
                const dept = getJobDepartment(hirdetes)
                const dateStr = hirdetes.nyitva_tol || hirdetes.created_at
                  ? new Date(hirdetes.nyitva_tol || hirdetes.created_at!).toLocaleDateString("hu-HU", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : null

                return (
                  <Card
                    key={hirdetes.id}
                    className={cn(
                      "flex flex-col border border-border hover:border-primary/40 transition-colors shadow-none",
                      hirdetes.is_internal ? "bg-primary/[0.02]" : "bg-card"
                    )}
                  >
                    <CardHeader className="space-y-3 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg font-semibold tracking-tight text-foreground line-clamp-1">
                          {hirdetes.cim}
                        </CardTitle>
                        {hirdetes.is_internal && (
                          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold bg-primary/10 text-primary border-primary/20 shrink-0">
                            <Lock className="w-3 h-3" />
                            Belső
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline" className="font-normal gap-1 text-muted-foreground border-border/70">
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
                        ) : <div />}

                        <span className="inline-flex items-center gap-1 text-primary font-medium text-[11px]">
                          <Gift className="w-3 h-3" />
                          {formattedBonus} bónusz
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 pb-4">
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {hirdetes.rovid_leiras || "Nincs részletes leírás megadva ehhez a pozícióhoz."}
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
                              variant: hirdetes.is_internal ? "default" : "secondary",
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
            /* Üres állapot (Empty State) */
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed rounded-lg bg-muted/10 space-y-2">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {postings.length === 0
                    ? "Jelenleg nincsenek nyitott belső pozíciók."
                    : "Nincs a szűrésnek megfelelő nyitott pozíció."}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  {postings.length === 0
                    ? "Kérjük, nézz vissza később, vagy ajánlj ismerőst a cég általános tehetségbázisába a fenti gombra kattintva!"
                    : "Próbáld meg módosítani a keresőszót, vagy töröld a beállított részleg/jelleg szűrőket."}
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
