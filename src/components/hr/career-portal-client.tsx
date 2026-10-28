"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  WORK_MODE_LABELS,
  WORK_MODE_SHORT_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  SENIORITY_LABELS,
  CANDIDATE_STAGE_PUBLIC_LABELS,
  formatSalaryBand,
} from "@/utils/hr/career-constants"
import { checkApplicationStatusAction } from "@/app/karrier/[id]/actions"
import { ApplicationForm } from "@/app/karrier/[id]/application-form"
import { CompanyPresentationViewer } from "@/components/hr/company-presentation-viewer"
import {
  CompanyCareerPresentation,
  buildDefaultCompanyPresentation,
} from "@/utils/hr/career-presentation-types"
import {
  Search,
  MapPin,
  Building2,
  ArrowRight,
  ArrowLeft,
  X,
  LayoutList,
  LayoutGrid,
  Loader2,
  Calendar,
  Briefcase,
  Presentation,
  Lock,
} from "lucide-react"
import { toast } from "sonner"

export interface CareerCompanyItem {
  id: string
  name: string
  address?: string | null
  logo_url?: string | null
  career_presentation?: CompanyCareerPresentation | null
}

export interface CareerPostingItem {
  id: string
  cim: string
  munkakor_id: string
  rovid_leiras?: string | null
  nyitva_tol?: string | null
  jelentkezesi_hatarido?: string | null
  company_id: string | null
  company_name: string
  company_address?: string | null
  department: string
  munkakor_nev: string
  munkavegzes_modja: string
  helyszin: string
  foglalkoztatas_tipusa: string
  tapasztalati_szint: string
  bersav_min?: number | null
  bersav_max?: number | null
  bersav_publikus?: boolean
  is_internal?: boolean
  publikus?: boolean
}

interface CareerPortalClientProps {
  postings: CareerPostingItem[]
  companies: CareerCompanyItem[]
  initialCompanyId?: string | null
  initialScope?: "internal" | "public"
  employeeCompanyIds?: string[]
  employeeData?: {
    nev: string
    email: string
    telefon?: string
    munkakor?: string
  } | null
}

export function CareerPortalClient({
  postings,
  companies,
  initialCompanyId = null,
  initialScope = "public",
  employeeCompanyIds = [],
  employeeData = null,
}: CareerPortalClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const urlCompany = searchParams.get("company")
  const urlView = searchParams.get("view")
  const urlScope = searchParams.get("scope")

  const isEmployeeOfAnyCompany = employeeCompanyIds.length > 0

  // Ha csak 1 vállalat létezik az adatbázisban, vagy belső hirdetésekre érkezik a dolgozó, automatikusan kiválasztjuk
  const resolvedInitialCompany =
    urlCompany && companies.some((c) => c.id === urlCompany)
      ? urlCompany
      : initialCompanyId && companies.some((c) => c.id === initialCompanyId)
      ? initialCompanyId
      : urlScope === "internal" &&
        employeeCompanyIds[0] &&
        companies.some((c) => c.id === employeeCompanyIds[0])
      ? employeeCompanyIds[0]
      : companies.length === 1
      ? companies[0].id
      : null

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    resolvedInitialCompany
  )

  const [portalSection, setPortalSection] = useState<"positions" | "about">(
    urlView === "about" ? "about" : "positions"
  )

  const [postingScope, setPostingScope] = useState<"public" | "internal">(
    (urlScope === "internal" || initialScope === "internal") &&
      isEmployeeOfAnyCompany
      ? "internal"
      : "public"
  )

  // Szigorú jogosultság-ellenőrzés: a kiválasztott cégnél valóban dolgozik-e a látogató
  const isEmployeeOfSelectedCompany = useMemo(
    () =>
      Boolean(
        selectedCompanyId && employeeCompanyIds.includes(selectedCompanyId)
      ),
    [selectedCompanyId, employeeCompanyIds]
  )

  // Külső látogató ("sima ember") SOHA nem láthatja a belső hirdetések fület
  const effectivePostingScope: "public" | "internal" =
    isEmployeeOfSelectedCompany ? postingScope : "public"

  const [search, setSearch] = useState("")
  const [selectedDept, setSelectedDept] = useState<string>("all")
  const [selectedWorkMode, setSelectedWorkMode] = useState<string>("all")
  const [selectedSeniority, setSelectedSeniority] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")

  // Pályázatstátusz lekérdező modál állapota
  const [trackerOpen, setTrackerOpen] = useState(false)
  const [trackerEmail, setTrackerEmail] = useState("")
  const [trackerCode, setTrackerCode] = useState("")
  const [trackerLoading, setTrackerLoading] = useState(false)
  const [trackerResults, setTrackerResults] = useState<any[] | null>(null)

  // Nyitott jelentkezés (Talent Pool) modál állapota
  const [talentPoolOpen, setTalentPoolOpen] = useState(false)

  const activeCompanyObj = useMemo(
    () =>
      selectedCompanyId
        ? companies.find((c) => c.id === selectedCompanyId) || null
        : null,
    [companies, selectedCompanyId]
  )

  const activePresentation = useMemo(() => {
    if (!activeCompanyObj) return null
    if (
      activeCompanyObj.career_presentation &&
      activeCompanyObj.career_presentation.heroSlide
    ) {
      return activeCompanyObj.career_presentation
    }
    return buildDefaultCompanyPresentation(
      activeCompanyObj.name,
      activeCompanyObj.address,
      "tech_ai"
    )
  }, [activeCompanyObj])

  function handleSelectCompany(
    companyId: string | null,
    targetSection: "positions" | "about" = "positions"
  ) {
    setSelectedCompanyId(companyId)
    setPortalSection(targetSection)
    setSelectedDept("all")
    setSearch("")

    const params = new URLSearchParams()
    if (companyId) {
      params.set("company", companyId)
      if (targetSection === "about") {
        params.set("view", "about")
      }
    }
    const qs = params.toString()
    router.replace(qs ? `/karrier?${qs}` : "/karrier", { scroll: false })
  }

  function handleSwitchSection(section: "positions" | "about") {
    setPortalSection(section)
    const params = new URLSearchParams(searchParams.toString())
    if (selectedCompanyId) {
      params.set("company", selectedCompanyId)
    }
    if (section === "about") {
      params.set("view", "about")
    } else {
      params.delete("view")
    }
    const qs = params.toString()
    router.replace(qs ? `/karrier?${qs}` : "/karrier", { scroll: false })
  }

  function handleSwitchPostingScope(nextScope: "public" | "internal") {
    if (nextScope === "internal" && !isEmployeeOfSelectedCompany) return
    setPortalSection("positions")
    setPostingScope(nextScope)
    setSelectedDept("all")
    setSearch("")

    const params = new URLSearchParams(searchParams.toString())
    if (selectedCompanyId) {
      params.set("company", selectedCompanyId)
    }
    params.delete("view")
    if (nextScope === "internal") {
      params.set("scope", "internal")
    } else {
      params.delete("scope")
    }
    const qs = params.toString()
    router.replace(qs ? `/karrier?${qs}` : "/karrier", { scroll: false })
  }

  // Cégekhez tartozó nyitott pozíciószámok a belépő cégválasztó képernyőhöz
  const countByCompany = useMemo(() => {
    const map = new Map<string, number>()
    postings.forEach((p) => {
      if (p.company_id && !p.is_internal) {
        map.set(p.company_id, (map.get(p.company_id) || 0) + 1)
      }
    })
    return map
  }, [postings])

  // Kiválasztott cég összes elérhető álláshirdetése
  const allCompanyPostings = useMemo(() => {
    if (!selectedCompanyId) return []
    return postings.filter((p) => p.company_id === selectedCompanyId)
  }, [postings, selectedCompanyId])

  const internalCompanyPostings = useMemo(
    () => allCompanyPostings.filter((p) => Boolean(p.is_internal)),
    [allCompanyPostings]
  )

  const publicCompanyPostings = useMemo(
    () => allCompanyPostings.filter((p) => !p.is_internal),
    [allCompanyPostings]
  )

  // Kiválasztott fül szerinti álláshirdetések:
  // Belső fülön KIZÁRÓLAG a belső hirdetések, publikus fülön KIZÁRÓLAG a publikus hirdetések látszanak!
  const companyScopedPostings = useMemo(() => {
    if (effectivePostingScope === "internal") {
      return internalCompanyPostings
    }
    return publicCompanyPostings
  }, [effectivePostingScope, internalCompanyPostings, publicCompanyPostings])

  // Elérhető részlegek a kiválasztott cégnél
  const departments = useMemo(() => {
    const set = new Set<string>()
    companyScopedPostings.forEach((p) => {
      if (p.department) set.add(p.department)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, "hu"))
  }, [companyScopedPostings])

  // Szűrt lista a kiválasztott cégen belül
  const filteredPostings = useMemo(() => {
    return companyScopedPostings.filter((p) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matchTitle = p.cim.toLowerCase().includes(q)
        const matchJob = p.munkakor_nev.toLowerCase().includes(q)
        const matchDept = p.department.toLowerCase().includes(q)
        const matchLoc = p.helyszin.toLowerCase().includes(q)
        const matchDesc = (p.rovid_leiras || "").toLowerCase().includes(q)
        if (!matchTitle && !matchJob && !matchDept && !matchLoc && !matchDesc) {
          return false
        }
      }

      if (selectedDept !== "all" && p.department !== selectedDept) return false
      if (selectedWorkMode !== "all" && p.munkavegzes_modja !== selectedWorkMode)
        return false
      if (
        selectedSeniority !== "all" &&
        p.tapasztalati_szint !== selectedSeniority
      )
        return false

      return true
    })
  }, [
    companyScopedPostings,
    search,
    selectedDept,
    selectedWorkMode,
    selectedSeniority,
  ])

  // Csoportosítás részlegek szerint
  const groupedByDepartment = useMemo(() => {
    const groups = new Map<string, CareerPostingItem[]>()
    for (const p of filteredPostings) {
      const dept = p.department || "Általános"
      if (!groups.has(dept)) groups.set(dept, [])
      groups.get(dept)!.push(p)
    }
    return Array.from(groups.entries()).sort(([a], [b]) =>
      a.localeCompare(b, "hu")
    )
  }, [filteredPostings])

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedDept !== "all" ||
    selectedWorkMode !== "all" ||
    selectedSeniority !== "all"

  function clearFilters() {
    setSearch("")
    setSelectedDept("all")
    setSelectedWorkMode("all")
    setSelectedSeniority("all")
  }

  async function handleCheckStatus(e: React.FormEvent) {
    e.preventDefault()
    if (!trackerEmail.trim()) {
      toast.error("Kérjük, adja meg az e-mail címét!")
      return
    }
    setTrackerLoading(true)
    try {
      const res = await checkApplicationStatusAction(trackerEmail, trackerCode)
      if (res.error) {
        toast.error(res.error)
        setTrackerResults(null)
      } else {
        setTrackerResults(res.applications || [])
      }
    } catch {
      toast.error("Hiba történt a lekérdezés során.")
    } finally {
      setTrackerLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── 1. FELSŐ NAVIGÁCIÓS SÁV (TOP BAR) ── */}
      <div className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() =>
                activeCompanyObj
                  ? handleSwitchSection("positions")
                  : handleSelectCompany(null)
              }
              className="flex items-center gap-2.5 text-left text-foreground hover:opacity-90 transition-opacity"
            >
              <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm shrink-0">
                eH
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight leading-none">
                  {activeCompanyObj ? activeCompanyObj.name : "eaisyHR Karrierportál"}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">
                  {activeCompanyObj
                    ? "Hivatalos vállalati karrieroldal"
                    : "Válassz vállalatot a belépéshez"}
                </span>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isEmployeeOfAnyCompany && (
              <Link
                href="/hr/self-service/career"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-8 text-xs font-medium gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                )}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Vissza a belső HR portálra</span>
              </Link>
            )}

            {activeCompanyObj && companies.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSelectCompany(null)}
                className="h-8 text-xs font-medium"
              >
                Másik vállalat választása
              </Button>
            )}

            {/* Pályázatstátusz lekérdezése modál */}
            <Dialog open={trackerOpen} onOpenChange={setTrackerOpen}>
              <DialogTrigger
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-8 text-xs font-medium"
                )}
              >
                Pályázatstátusz lekérdezése
              </DialogTrigger>
              <DialogContent className="sm:max-w-[560px] max-h-[88vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-base font-semibold">
                    Jelentkezés státuszának lekérdezése
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Add meg a jelentkezéskor használt e-mail címedet és (opcionálisan) a visszaigazoló üzenetben kapott KAR-2026-... pályázati azonosítódat.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCheckStatus} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="tracker_email" className="text-xs font-medium">
                        E-mail cím <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="tracker_email"
                        type="email"
                        required
                        value={trackerEmail}
                        onChange={(e) => setTrackerEmail(e.target.value)}
                        placeholder="kovacs.janos@example.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tracker_code" className="text-xs font-medium">
                        Pályázati azonosító (opcionális)
                      </Label>
                      <Input
                        id="tracker_code"
                        value={trackerCode}
                        onChange={(e) => setTrackerCode(e.target.value)}
                        placeholder="pl. KAR-2026-..."
                        className="font-mono uppercase"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={trackerLoading}
                    className="w-full gap-2"
                    size="sm"
                  >
                    {trackerLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Státusz lekérdezése</span>
                  </Button>
                </form>

                {trackerResults && (
                  <div className="space-y-3 pt-3 border-t border-border/60">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Talált pályázatok ({trackerResults.length} db)
                    </p>
                    {trackerResults.map((app) => {
                      const stage =
                        CANDIDATE_STAGE_PUBLIC_LABELS[app.statusz] ||
                        CANDIDATE_STAGE_PUBLIC_LABELS.uj
                      return (
                        <div
                          key={app.id}
                          className="rounded-lg border border-border/70 bg-muted/20 p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {app.positionTitle}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {app.companyName} • Beküldve:{" "}
                                {new Date(app.createdAt).toLocaleDateString("hu-HU")}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="font-mono text-[11px] border-primary/30 text-primary bg-primary/5"
                            >
                              {app.palyazatiKod}
                            </Badge>
                          </div>

                          {app.statusz !== "elutasitva" && (
                            <div className="grid grid-cols-4 gap-1.5 pt-1">
                              {[
                                "1. Előszűrés",
                                "2. Interjú",
                                "3. Ajánlat",
                                "4. Felvétel",
                              ].map((stepLabel, idx) => {
                                const stepNum = idx + 1
                                const active = stage.stepIndex >= stepNum
                                return (
                                  <div key={stepLabel} className="space-y-1">
                                    <div
                                      className={cn(
                                        "h-1.5 rounded-full transition-colors",
                                        active ? "bg-primary" : "bg-border"
                                      )}
                                    />
                                    <p
                                      className={cn(
                                        "text-[10px] font-medium truncate",
                                        active
                                          ? "text-primary"
                                          : "text-muted-foreground"
                                      )}
                                    >
                                      {stepLabel}
                                    </p>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          <div className="rounded-md bg-background p-3 border border-border/60 space-y-1">
                            <p className="text-xs font-semibold text-foreground">
                              Aktuális állapot: {stage.label}
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {stage.description}
                            </p>
                            {app.interjuIdopont && (
                              <p className="text-xs font-medium text-primary pt-1 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>
                                  Kitűzött interjú:{" "}
                                  {new Date(app.interjuIdopont).toLocaleString(
                                    "hu-HU"
                                  )}
                                  {app.interjuHelyszin
                                    ? ` (${app.interjuHelyszin})`
                                    : ""}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Nyitott jelentkezés (Talent Pool) gomb */}
            {activeCompanyObj && (
              <Dialog open={talentPoolOpen} onOpenChange={setTalentPoolOpen}>
                <DialogTrigger
                  className={cn(
                    buttonVariants({ variant: "default", size: "sm" }),
                    "h-8 text-xs font-medium"
                  )}
                >
                  Nyitott jelentkezés
                </DialogTrigger>
                <DialogContent className="sm:max-w-[640px] max-h-[92vh] overflow-y-auto p-0 border-none bg-transparent">
                  <ApplicationForm
                    isSpontaneous
                    companyId={activeCompanyObj.id}
                    companyName={activeCompanyObj.name}
                    companies={companies.map((c) => ({ id: c.id, name: c.name }))}
                    initialEmployeeData={
                      isEmployeeOfSelectedCompany ? employeeData : null
                    }
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          A) HA MÉG NINCS KIVÁLASZTVA VÁLLALAT -> BELÉPŐ VÁLLALATVÁLASZTÓ KÉPERNYŐ
         ══════════════════════════════════════════════════════════════════════════ */}
      {!activeCompanyObj ? (
        <main className="flex-1 w-full">
          <section className="border-b border-border/60 bg-primary text-primary-foreground py-12 sm:py-16 px-4">
            <div className="max-w-6xl mx-auto space-y-3">
              <Badge
                variant="outline"
                className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground text-xs font-medium px-2.5 py-0.5"
              >
                eaisyHR Karrierközpont
              </Badge>
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                Válaszd ki a vállalatot a karrieroldal megnyitásához
              </h1>
              <p className="text-sm sm:text-base text-primary-foreground/85 max-w-2xl leading-relaxed">
                Kattints arra a vállalatra, amelynek a nyitott pozícióit vagy a „Cégünkről” bemutatkozó prezentációját szeretnéd megtekinteni.
              </p>
            </div>
          </section>

          <section className="max-w-6xl mx-auto py-12 px-4 sm:px-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {companies.map((comp) => {
                const count = countByCompany.get(comp.id) || 0
                const pres =
                  comp.career_presentation && comp.career_presentation.heroSlide
                    ? comp.career_presentation
                    : buildDefaultCompanyPresentation(
                        comp.name,
                        comp.address,
                        "tech_ai"
                      )

                return (
                  <div
                    key={comp.id}
                    className="group rounded-lg border border-border/70 bg-card overflow-hidden flex flex-col justify-between hover:border-primary/50 transition-colors"
                  >
                    <div>
                      <div className="h-44 bg-muted relative overflow-hidden border-b border-border/60">
                        <img
                          src={pres.heroSlide.coverImageUrl}
                          alt={comp.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-4 text-white">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-white/80">
                              {pres.briefing?.industry || "Vállalati Karrier"}
                            </span>
                            <Badge className="bg-primary text-primary-foreground text-[11px] tabular-nums">
                              {count} nyitott pozíció
                            </Badge>
                          </div>
                          <h2 className="text-lg font-semibold mt-0.5">
                            {comp.name}
                          </h2>
                        </div>
                      </div>

                      <div className="p-5 space-y-3">
                        {comp.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                            <span>{comp.address}</span>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {pres.heroSlide.subheadline}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 pt-0 space-y-2">
                      <Button
                        type="button"
                        onClick={() => handleSelectCompany(comp.id, "positions")}
                        className="w-full justify-between"
                        size="sm"
                      >
                        <span>Nyitott pozíciók megtekintése</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSelectCompany(comp.id, "about")}
                        className="w-full justify-between text-xs"
                        size="sm"
                      >
                        <span>„Cégünkről” prezentáció</span>
                        <Presentation className="w-3.5 h-3.5 text-primary" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </main>
      ) : (
        /* ══════════════════════════════════════════════════════════════════════════
            B) KIVÁLASZTOTT VÁLLALAT SAJÁT KARRIEROLDALA (POZÍCIÓK ÉS CÉGÜNKRŐL)
           ══════════════════════════════════════════════════════════════════════════ */
        <>
          {/* ── 2. VÁLLALATI HERO SZEKCIÓ ── */}
          <section className="border-b border-border/60 bg-primary text-primary-foreground py-12 sm:py-14 px-4">
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge
                  variant="outline"
                  className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground text-xs font-medium px-2.5 py-0.5 gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{activeCompanyObj.name} — Karrier</span>
                </Badge>
                {activeCompanyObj.address && (
                  <span className="text-xs text-primary-foreground/85 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {activeCompanyObj.address}
                  </span>
                )}
              </div>

              <div className="max-w-3xl space-y-2.5">
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
                  Építsd velünk a jövőt a(z) {activeCompanyObj.name} csapatában
                </h1>
                <p className="text-sm sm:text-base text-primary-foreground/85 leading-relaxed">
                  Ismerd meg a(z) {activeCompanyObj.name} nyitott pozícióit, átlátható bérsávjainkat és modern munkakörnyezetünket, vagy tekintsd meg az 5 fejezetes „Cégünkről” bemutatkozó prezentációnkat.
                </p>
              </div>
            </div>
          </section>

          {/* ── 3. KULCSMUTATÓK SÁV (LINEAR FLAT KPI GRID) ── */}
          <section className="border-b border-border/60 bg-card/50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-lg border border-border/60 bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Nyitott pozíciók
                </p>
                <p className="text-2xl font-semibold tabular-nums text-foreground mt-1">
                  {companyScopedPostings.length} db
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {activeCompanyObj.name}
                </p>
              </div>

              <div className="rounded-lg border border-border/60 bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Meghirdető részlegek
                </p>
                <p className="text-2xl font-semibold tabular-nums text-foreground mt-1">
                  {departments.length} terület
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Aktív szakmai területek és csapatok
                </p>
              </div>

              <div className="rounded-lg border border-border/60 bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Munkavégzési modell
                </p>
                <p className="text-2xl font-semibold text-foreground mt-1">
                  Hibrid & Remote
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Rugalmas munkarend és modern eszközpark
                </p>
              </div>

              <div className="rounded-lg border border-border/60 bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Átlagos visszajelzés
                </p>
                <p className="text-2xl font-semibold tabular-nums text-foreground mt-1">
                  2–3 munkanap
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Egyedi pályázatkövető azonosítóval
                </p>
              </div>
            </div>
          </section>

          {/* ── 4. FŐ TARTALOM: NÉZETVÁLTÓ (NYITOTT POZÍCIÓK VS CÉGÜNKRŐL) ── */}
          <main
            id="positions"
            className="flex-1 w-full max-w-6xl mx-auto py-10 px-4 sm:px-6 space-y-8"
          >
            {/* Fő szekcióváltó sáv (dupla cégválasztók nélkül, tisztán az adott cégre) */}
            <div className="rounded-lg border border-border/70 bg-card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                {isEmployeeOfSelectedCompany ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSwitchPostingScope("internal")}
                      className={cn(
                        "px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 border cursor-pointer",
                        portalSection === "positions" &&
                          effectivePostingScope === "internal"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/30 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      <Lock className="w-4 h-4" />
                      <span>Belső hirdetések</span>
                      <span
                        className={cn(
                          "tabular-nums text-xs px-1.5 py-0.5 rounded",
                          portalSection === "positions" &&
                            effectivePostingScope === "internal"
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {internalCompanyPostings.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSwitchPostingScope("public")}
                      className={cn(
                        "px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 border cursor-pointer",
                        portalSection === "positions" &&
                          effectivePostingScope === "public"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/30 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      <Briefcase className="w-4 h-4" />
                      <span>Publikus hirdetések</span>
                      <span
                        className={cn(
                          "tabular-nums text-xs px-1.5 py-0.5 rounded",
                          portalSection === "positions" &&
                            effectivePostingScope === "public"
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {publicCompanyPostings.length}
                      </span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSwitchSection("positions")}
                    className={cn(
                      "px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 border",
                      portalSection === "positions"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Nyitott pozíciók</span>
                    <span
                      className={cn(
                        "tabular-nums text-xs px-1.5 py-0.5 rounded",
                        portalSection === "positions"
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {companyScopedPostings.length}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSwitchSection("about")}
                  className={cn(
                    "px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 border cursor-pointer",
                    portalSection === "about"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <Presentation className="w-4 h-4" />
                  <span>Cégünkről — Vállalati Prezentáció</span>
                </button>
              </div>

              {isEmployeeOfSelectedCompany && employeeData && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge
                    variant="outline"
                    className="gap-1.5 text-[11px] font-medium border-primary/30 bg-primary/5 text-primary"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Belső munkatársi hozzáférés ({employeeData.nev})</span>
                  </Badge>
                </div>
              )}
            </div>

            {portalSection === "about" && activePresentation ? (
              <CompanyPresentationViewer
                key={activeCompanyObj.id}
                companyName={activeCompanyObj.name}
                presentation={activePresentation}
                openPositionsCount={companyScopedPostings.length}
                onViewPositions={() => handleSwitchSection("positions")}
                onOpenTalentPool={() => setTalentPoolOpen(true)}
              />
            ) : (
              <>
                {/* Kereső és szűrősáv */}
                <div className="rounded-lg border border-border/70 bg-card p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-5 relative">
                      <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Keresés pozícióra, munkakörre, részlegre vagy városra..."
                        className="pl-9 pr-8 h-9 text-xs"
                      />
                      {search && (
                        <button
                          type="button"
                          onClick={() => setSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <Select
                        value={selectedDept}
                        onValueChange={(val) => val && setSelectedDept(val)}
                      >
                        <SelectTrigger className="h-9 text-xs w-full">
                          <SelectValue placeholder="Részleg">
                            {selectedDept === "all"
                              ? "Összes részleg"
                              : selectedDept}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Összes részleg</SelectItem>
                          {departments.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2">
                      <Select
                        value={selectedWorkMode}
                        onValueChange={(val) => val && setSelectedWorkMode(val)}
                      >
                        <SelectTrigger className="h-9 text-xs w-full">
                          <SelectValue placeholder="Munkarend">
                            {selectedWorkMode === "all"
                              ? "Összes munkarend"
                              : WORK_MODE_SHORT_LABELS[selectedWorkMode] ||
                                selectedWorkMode}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Összes munkarend</SelectItem>
                          <SelectItem value="hibrid">
                            {WORK_MODE_LABELS.hibrid}
                          </SelectItem>
                          <SelectItem value="remote">
                            {WORK_MODE_LABELS.remote}
                          </SelectItem>
                          <SelectItem value="irodai">
                            {WORK_MODE_LABELS.irodai}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2">
                      <Select
                        value={selectedSeniority}
                        onValueChange={(val) => val && setSelectedSeniority(val)}
                      >
                        <SelectTrigger className="h-9 text-xs w-full">
                          <SelectValue placeholder="Szint">
                            {selectedSeniority === "all"
                              ? "Összes szint"
                              : SENIORITY_LABELS[selectedSeniority] ||
                                selectedSeniority}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Összes szint</SelectItem>
                          <SelectItem value="junior">
                            {SENIORITY_LABELS.junior}
                          </SelectItem>
                          <SelectItem value="medior">
                            {SENIORITY_LABELS.medior}
                          </SelectItem>
                          <SelectItem value="senior">
                            {SENIORITY_LABELS.senior}
                          </SelectItem>
                          <SelectItem value="lead">
                            {SENIORITY_LABELS.lead}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-1 flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant={viewMode === "list" ? "default" : "outline"}
                        size="icon-sm"
                        onClick={() => setViewMode("list")}
                        title="Részlegek szerint csoportosított listanézet"
                        className="h-9 w-9"
                      >
                        <LayoutList className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant={viewMode === "grid" ? "default" : "outline"}
                        size="icon-sm"
                        onClick={() => setViewMode("grid")}
                        title="Kártyás rácsnézet"
                        className="h-9 w-9"
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <span>
                      Megjelenítve:{" "}
                      <strong className="text-foreground tabular-nums">
                        {filteredPostings.length}
                      </strong>{" "}
                      nyitott pozíció ({activeCompanyObj.name})
                    </span>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-primary hover:underline font-medium"
                      >
                        Szűrők alaphelyzetbe állítása
                      </button>
                    )}
                  </div>
                </div>

                {/* POZÍCIÓK LISTÁJA VAGY ÜRES ÁLLAPOT */}
                {filteredPostings.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-12 text-center bg-card space-y-3">
                    <h2 className="text-lg font-semibold text-foreground">
                      Jelenleg nincs a szűrésnek megfelelő nyitott pozíció a(z){" "}
                      {activeCompanyObj.name} vállalatnál
                    </h2>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                      Tekintsd meg a vállalat bemutatkozó prezentációját a „Cégünkről” fülön, vagy küldd el az önéletrajzodat nyitott jelentkezésként a vállalat Talent Pooljába!
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearFilters}
                        >
                          Szűrők törlése
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSwitchSection("about")}
                      >
                        „Cégünkről” prezentáció megtekintése
                      </Button>
                      <Button size="sm" onClick={() => setTalentPoolOpen(true)}>
                        Nyitott jelentkezés beküldése
                      </Button>
                    </div>
                  </div>
                ) : viewMode === "list" ? (
                  <div className="space-y-8">
                    {groupedByDepartment.map(([deptName, items]) => (
                      <div key={deptName} className="space-y-3">
                        <div className="flex items-center justify-between border-b border-border/70 pb-2">
                          <div className="flex items-center gap-2.5">
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                              {deptName}
                            </h2>
                            <Badge
                              variant="secondary"
                              className="text-[11px] tabular-nums px-2 py-0"
                            >
                              {items.length} pozíció
                            </Badge>
                          </div>
                        </div>

                        <div className="divide-y divide-border/60 rounded-lg border border-border/70 bg-card overflow-hidden">
                          {items.map((job) => {
                            const salaryBand = job.bersav_publikus
                              ? formatSalaryBand(job.bersav_min, job.bersav_max)
                              : null

                            const jobHref =
                              job.is_internal ||
                              effectivePostingScope === "internal"
                                ? `/karrier/${job.id}?scope=internal`
                                : `/karrier/${job.id}`

                            return (
                              <Link
                                key={job.id}
                                href={jobHref}
                                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-muted/30 transition-colors"
                              >
                                <div className="space-y-1.5 min-w-0 flex-1">
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                                      {job.cim}
                                    </h3>
                                    {job.is_internal && (
                                      <Badge
                                        variant="outline"
                                        className="text-[11px] font-medium gap-1 border-primary/30 bg-primary/10 text-primary"
                                      >
                                        <Lock className="w-3 h-3" />
                                        <span>Belső hirdetés</span>
                                      </Badge>
                                    )}
                                    {salaryBand && (
                                      <Badge
                                        variant="secondary"
                                        className="text-[11px] font-medium tabular-nums bg-success/10 text-success border border-success/30"
                                      >
                                        {salaryBand}
                                      </Badge>
                                    )}
                                  </div>

                                  {job.rovid_leiras && (
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {job.rovid_leiras}
                                    </p>
                                  )}

                                  <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground pt-0.5">
                                    <span className="inline-flex items-center gap-1">
                                      <Briefcase className="w-3.5 h-3.5 text-muted-foreground/70" />
                                      {job.munkakor_nev}
                                    </span>
                                    <span>•</span>
                                    <span className="font-medium text-foreground/80">
                                      {WORK_MODE_LABELS[job.munkavegzes_modja] ||
                                        job.munkavegzes_modja}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {SENIORITY_LABELS[job.tapasztalati_szint] ||
                                        job.tapasztalati_szint}{" "}
                                      szint
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {EMPLOYMENT_TYPE_LABELS[
                                        job.foglalkoztatas_tipusa
                                      ] || job.foglalkoztatas_tipusa}
                                    </span>
                                    {job.helyszin && (
                                      <>
                                        <span>•</span>
                                        <span className="inline-flex items-center gap-1">
                                          <MapPin className="w-3.5 h-3.5 text-muted-foreground/70" />
                                          {job.helyszin}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                  <span className="text-xs font-medium text-primary group-hover:underline">
                                    Részletek és jelentkezés
                                  </span>
                                  <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {filteredPostings.map((job) => {
                      const salaryBand = job.bersav_publikus
                        ? formatSalaryBand(job.bersav_min, job.bersav_max)
                        : null
                      const jobHref =
                        job.is_internal || effectivePostingScope === "internal"
                          ? `/karrier/${job.id}?scope=internal`
                          : `/karrier/${job.id}`

                      return (
                        <div
                          key={job.id}
                          className="flex flex-col justify-between rounded-lg border border-border/70 bg-card p-5 hover:border-primary/40 transition-colors space-y-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-[11px]">
                                {job.department}
                              </Badge>
                              {job.is_internal && (
                                <Badge
                                  variant="outline"
                                  className="text-[11px] font-medium gap-1 border-primary/30 bg-primary/10 text-primary"
                                >
                                  <Lock className="w-3 h-3" />
                                  <span>Belső hirdetés</span>
                                </Badge>
                              )}
                            </div>

                            <div>
                              <h3 className="text-lg font-semibold text-foreground leading-snug">
                                {job.cim}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {job.munkakor_nev}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium border border-border bg-muted/40 text-foreground">
                                {WORK_MODE_SHORT_LABELS[job.munkavegzes_modja] ||
                                  job.munkavegzes_modja}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium border border-border bg-muted/40 text-foreground">
                                {SENIORITY_LABELS[job.tapasztalati_szint] ||
                                  job.tapasztalati_szint}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[11px] text-muted-foreground border border-border/60">
                                {EMPLOYMENT_TYPE_LABELS[
                                  job.foglalkoztatas_tipusa
                                ] || job.foglalkoztatas_tipusa}
                              </span>
                            </div>

                            {salaryBand && (
                              <div className="rounded-md bg-success/10 border border-success/30 px-2.5 py-1.5 text-xs font-medium text-success tabular-nums">
                                {salaryBand}
                              </div>
                            )}

                            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                              {job.rovid_leiras ||
                                "Tekintsd meg a pozíció részletes feladatait, az elvárásokat és a kínált juttatási csomagot."}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-border/60 space-y-3">
                            {job.helyszin && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{job.helyszin}</span>
                              </div>
                            )}
                            <Link
                              href={jobHref}
                              className={cn(
                                buttonVariants({
                                  variant: "default",
                                  size: "sm",
                                }),
                                "w-full group"
                              )}
                            >
                              <span>Részletek és jelentkezés</span>
                              <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* ── 5. ÁTLÁTHATÓ KIVÁLASZTÁSI FOLYAMAT (HIRING PROCESS STEPPER) ── */}
            <section
              id="process"
              className="pt-8 border-t border-border/60 space-y-5"
            >
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Kiválasztási folyamat
                </p>
                <h2 className="text-xl font-semibold text-foreground">
                  Így zajlik a felvételi folyamat a(z) {activeCompanyObj.name} csapatánál
                </h2>
                <p className="text-xs text-muted-foreground">
                  Gyors, transzparens és tiszteletteljes kiválasztás — minden lépésről valós időben tájékozódhatsz a pályázati azonosítóddal.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    step: "01",
                    title: "Jelentkezés & CV áttekintés",
                    time: "2–3 munkanapon belül",
                    desc: "Pályázatod beküldésekor azonnal kapsz egy egyedi KAR-2026 azonosítót, HR csapatunk pedig áttekinti a szakmai tapasztalataidat.",
                  },
                  {
                    step: "02",
                    title: "Rövid HR & Karrier egyeztetés",
                    time: "20–30 perc (Online / Telefon)",
                    desc: "Átbeszéljük a kölcsönös elvárásokat, a munkavégzés módját, a bérigényt és a lehetséges kezdési időpontot.",
                  },
                  {
                    step: "03",
                    title: "Szakmai interjú a csapattal",
                    time: "45–60 perc",
                    desc: "Megismerkedhetsz a közvetlen szakmai vezetőddel és a csapattal; valós szakmai helyzetekről és projektekről beszélgetünk.",
                  },
                  {
                    step: "04",
                    title: "Ajánlattétel & Digitális Onboarding",
                    time: "Azonnali visszajelzés",
                    desc: "Sikeres interjú után írásos ajánlatot küldünk, majd az eaisyHR digitális beléptető rendszerén keresztül zökkenőmentesen csatlakozol.",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="rounded-lg border border-border/70 bg-card p-5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold tabular-nums text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                        {item.step}. lépés
                      </span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {item.time}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── 6. NYITOTT JELENTKEZÉS / TALENT POOL SÁV ── */}
            <section
              id="talent-pool"
              className="rounded-lg border border-primary/30 bg-primary/5 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              <div className="space-y-2 max-w-2xl">
                <Badge
                  variant="outline"
                  className="border-primary/30 text-primary bg-background text-xs"
                >
                  Általános Tehetségbázis (Talent Pool)
                </Badge>
                <h2 className="text-xl font-semibold text-foreground">
                  Nem találtad meg a pontos pozíciódat a listában?
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Küldd el az önéletrajzodat nyitott jelentkezésként közvetlenül a(z){" "}
                  <strong>{activeCompanyObj.name}</strong> HR csapatának! Amint megnyílik a profilodhoz illeszkedő szerepkör, elsőként veled vesszük fel a kapcsolatot.
                </p>
              </div>

              <Button
                size="lg"
                onClick={() => setTalentPoolOpen(true)}
                className="shrink-0 gap-2"
              >
                <span>Jelentkezés a Talent Poolba</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </section>
          </main>
        </>
      )}

      {/* ── 7. LÁBLÉC (FOOTER) ── */}
      <footer className="border-t border-border/60 bg-card py-8 px-4 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              {activeCompanyObj ? activeCompanyObj.name : "eaisyHR Karrierportál"}
            </span>
            <span>•</span>
            <span>
              &copy; {new Date().getFullYear()} Minden jog fenntartva.
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setTrackerOpen(true)}
              className="hover:text-foreground transition-colors"
            >
              Pályázatstátusz lekérdezése
            </button>
            {activeCompanyObj && (
              <>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setTalentPoolOpen(true)}
                  className="hover:text-foreground transition-colors"
                >
                  Nyitott jelentkezés
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
