"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { RichTextContent } from "@/components/rich-text-content"
import { RichTextEditor } from "@/components/rich-text-editor"
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  ExternalLink,
  Lock,
  Check,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  updateCandidateStatus,
  updateJobPostingFlagsAction,
  saveJobPostingAction,
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
  const searchParams = useSearchParams()
  const [posting, setPosting] = useState<any>(initialPosting)
  const [activeTab, setActiveTab] = useState<string>("applicants")
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

  // Helyben történő hirdetés- és paraméter-szerkesztés állapota (létrehozó pop-up nélkül)
  const [isEditingPosting, setIsEditingPosting] = useState(false)
  const [savingPosting, setSavingPosting] = useState(false)
  const [draftCim, setDraftCim] = useState(initialPosting?.cim || "")
  const [draftMunkakorId, setDraftMunkakorId] = useState(
    initialPosting?.munkakor_id || jobs[0]?.id || ""
  )
  const [draftReszlegNev, setDraftReszlegNev] = useState(
    initialPosting?.reszleg_nev || ""
  )
  const [draftMunkavegzesModja, setDraftMunkavegzesModja] = useState(
    initialPosting?.munkavegzes_modja || "hibrid"
  )
  const [draftFoglalkoztatasTipusa, setDraftFoglalkoztatasTipusa] = useState(
    initialPosting?.foglalkoztatas_tipusa || "teljes_munkaido"
  )
  const [draftTapasztalatiSzint, setDraftTapasztalatiSzint] = useState(
    initialPosting?.tapasztalati_szint || "medior"
  )
  const [draftHelyszin, setDraftHelyszin] = useState(
    initialPosting?.helyszin || ""
  )
  const [draftBersavMin, setDraftBersavMin] = useState(
    initialPosting?.bersav_min ? String(initialPosting.bersav_min) : ""
  )
  const [draftBersavMax, setDraftBersavMax] = useState(
    initialPosting?.bersav_max ? String(initialPosting.bersav_max) : ""
  )
  const [draftBersavPublikus, setDraftBersavPublikus] = useState(
    Boolean(initialPosting?.bersav_publikus)
  )
  const [draftJelentkezesiHatarido, setDraftJelentkezesiHatarido] = useState(
    initialPosting?.jelentkezesi_hatarido
      ? String(initialPosting.jelentkezesi_hatarido).slice(0, 10)
      : ""
  )

  // Helyben történő formázott leírás-szerkesztés állapota
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [draftRovidLeiras, setDraftRovidLeiras] = useState(
    initialPosting?.rovid_leiras || ""
  )
  const [draftReszletesLeiras, setDraftReszletesLeiras] = useState(
    initialPosting?.reszletes_leiras || ""
  )
  const [savingDescription, setSavingDescription] = useState(false)

  useEffect(() => {
    if (!isReadOnly && searchParams.get("edit") === "true") {
      handleStartPostingEdit()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isReadOnly])

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

  const totalCount = deduplicatedApplicants.length
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

  const deadlineDateStr = posting.jelentkezesi_hatarido
    ? new Date(posting.jelentkezesi_hatarido).toLocaleDateString("hu-HU", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

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

  function handleStartPostingEdit() {
    setDraftCim(posting.cim || "")
    setDraftMunkakorId(posting.munkakor_id || jobs[0]?.id || "")
    setDraftReszlegNev(posting.reszleg_nev || "")
    setDraftMunkavegzesModja(posting.munkavegzes_modja || "hibrid")
    setDraftFoglalkoztatasTipusa(
      posting.foglalkoztatas_tipusa || "teljes_munkaido"
    )
    setDraftTapasztalatiSzint(posting.tapasztalati_szint || "medior")
    setDraftHelyszin(posting.helyszin || "")
    setDraftBersavMin(posting.bersav_min ? String(posting.bersav_min) : "")
    setDraftBersavMax(posting.bersav_max ? String(posting.bersav_max) : "")
    setDraftBersavPublikus(Boolean(posting.bersav_publikus))
    setDraftJelentkezesiHatarido(
      posting.jelentkezesi_hatarido
        ? String(posting.jelentkezesi_hatarido).slice(0, 10)
        : ""
    )
    setDraftRovidLeiras(posting.rovid_leiras || "")
    setDraftReszletesLeiras(posting.reszletes_leiras || "")
    setIsEditingPosting(true)
  }

  function handleCancelPostingEdit() {
    setIsEditingPosting(false)
    if (searchParams.get("edit") === "true") {
      router.replace(`/hr/recruitment/posting/${posting.id}`, { scroll: false })
    }
  }

  async function handleSavePostingEdit() {
    if (isReadOnly) return
    if (!draftCim.trim()) {
      toast.error("A hirdetés címe nem lehet üres!")
      return
    }
    if (!draftMunkakorId) {
      toast.error("Válassz belső munkakört!")
      return
    }

    const parsedMin = draftBersavMin ? parseInt(draftBersavMin, 10) : null
    const parsedMax = draftBersavMax ? parseInt(draftBersavMax, 10) : null
    if (parsedMin && parsedMax && parsedMin > parsedMax) {
      toast.error("A minimum bér nem lehet magasabb a maximum bérnél!")
      return
    }

    setSavingPosting(true)
    try {
      const res = await saveJobPostingAction({
        id: posting.id,
        cim: draftCim.trim(),
        munkakor_id: draftMunkakorId,
        rovid_leiras: draftRovidLeiras.trim(),
        reszletes_leiras: draftReszletesLeiras.trim(),
        is_internal: Boolean(posting.is_internal),
        munkavegzes_modja: draftMunkavegzesModja,
        helyszin: draftHelyszin.trim() || null,
        foglalkoztatas_tipusa: draftFoglalkoztatasTipusa,
        tapasztalati_szint: draftTapasztalatiSzint,
        reszleg_nev: draftReszlegNev.trim() || null,
        bersav_min: parsedMin,
        bersav_max: parsedMax,
        bersav_publikus: draftBersavPublikus,
        jelentkezesi_hatarido: draftJelentkezesiHatarido || null,
        company_id: posting.company_id || null,
      })

      if (res.error) {
        toast.error(res.error)
      } else if (res.data) {
        const matchedJob = jobs.find((j) => j.id === draftMunkakorId)
        setPosting((prev: any) => ({
          ...prev,
          ...res.data,
          hr_munkakor: res.data.hr_munkakor || {
            megnevezes: matchedJob?.megnevezes,
          },
        }))
        setIsEditingPosting(false)
        setIsEditingDescription(false)
        if (searchParams.get("edit") === "true") {
          router.replace(`/hr/recruitment/posting/${posting.id}`, {
            scroll: false,
          })
        }
        toast.success("Álláshirdetés adatai sikeresen mentve.")
        router.refresh()
      }
    } catch {
      toast.error("Hiba történt az álláshirdetés mentésekor.")
    } finally {
      setSavingPosting(false)
    }
  }

  function handleStartInlineDescriptionEdit() {
    setDraftRovidLeiras(posting.rovid_leiras || "")
    setDraftReszletesLeiras(posting.reszletes_leiras || "")
    setIsEditingDescription(true)
  }

  async function handleSaveInlineDescription() {
    if (isReadOnly) return
    setSavingDescription(true)
    try {
      const res = await saveJobPostingAction({
        id: posting.id,
        cim: posting.cim,
        munkakor_id: posting.munkakor_id,
        rovid_leiras: draftRovidLeiras.trim(),
        reszletes_leiras: draftReszletesLeiras.trim(),
        is_internal: Boolean(posting.is_internal),
        munkavegzes_modja: posting.munkavegzes_modja || "hibrid",
        helyszin: posting.helyszin || null,
        foglalkoztatas_tipusa:
          posting.foglalkoztatas_tipusa || "teljes_munkaido",
        tapasztalati_szint: posting.tapasztalati_szint || "medior",
        reszleg_nev: posting.reszleg_nev || null,
        bersav_min: posting.bersav_min ?? null,
        bersav_max: posting.bersav_max ?? null,
        bersav_publikus: Boolean(posting.bersav_publikus),
        jelentkezesi_hatarido: posting.jelentkezesi_hatarido || null,
        company_id: posting.company_id || null,
      })

      if (res.error) {
        toast.error(res.error)
      } else if (res.data) {
        setPosting((prev: any) => ({
          ...prev,
          rovid_leiras: draftRovidLeiras.trim(),
          reszletes_leiras: draftReszletesLeiras.trim(),
        }))
        setIsEditingDescription(false)
        toast.success("Hirdetésszöveg sikeresen mentve.")
        router.refresh()
      }
    } catch {
      toast.error("Hiba történt a hirdetésszöveg mentésekor.")
    } finally {
      setSavingDescription(false)
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
          className={cn("text-[10px] px-1.5 py-0 font-normal", badgeClass)}
        >
          {badgeLabel}
        </Badge>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full pb-10">
      {/* ── 1. Breadcrumb (Kanonikus P-113 minta) ── */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/hr/recruitment?tab=postings"
          className="hover:text-foreground transition-colors"
        >
          Toborzás
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link
          href="/hr/recruitment?tab=postings"
          className="hover:text-foreground transition-colors"
        >
          Álláshirdetések
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium truncate max-w-[360px]">
          {posting.cim}
        </span>
      </div>

      {/* ── 2. Letisztult Fejléc ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link href="/hr/recruitment?tab=postings">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-9 w-9 shrink-0"
              title="Vissza az álláshirdetésekhez"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              {isEditingPosting ? (
                <Input
                  value={draftCim}
                  onChange={(e) => setDraftCim(e.target.value)}
                  placeholder="Hirdetés nyilvános címe..."
                  className="h-9 max-w-[380px] text-base font-semibold"
                />
              ) : (
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {posting.cim}
                </h1>
              )}
              {!posting.aktiv ? (
                <Badge variant="outline" className="text-xs font-normal">
                  Inaktív
                </Badge>
              ) : posting.is_internal ? (
                <Badge
                  variant="outline"
                  className="text-xs font-medium bg-primary/10 text-primary border-primary/20 gap-1"
                >
                  <Lock className="w-3 h-3" />
                  Belső hirdetés
                </Badge>
              ) : posting.publikus ? (
                <Badge
                  variant="outline"
                  className="text-xs font-medium bg-success/10 text-success border-success/30"
                >
                  Publikus
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs font-normal">
                  Piszkozat
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground mt-0.5">
              {posting.hr_munkakor?.megnevezes ? (
                posting.munkakor_id ? (
                  <>
                    Belső munkakör:{" "}
                    <Link
                      href={`/hr/job/${posting.munkakor_id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {posting.hr_munkakor.megnevezes}
                    </Link>
                  </>
                ) : (
                  <>Belső munkakör: {posting.hr_munkakor.megnevezes}</>
                )
              ) : (
                "Általános munkakör"
              )}
              {` • Közzétéve: ${publishedDateStr}`}
            </p>
          </div>
        </div>

        {/* Jobb oldali műveletek és láthatóság kapcsolók */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {!isReadOnly && (
            <div className="inline-flex items-center gap-3 px-3 h-9 rounded-md border border-border bg-card">
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
                <span className="text-xs text-muted-foreground">Publikus</span>
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

          {!isReadOnly &&
            (isEditingPosting ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs gap-1.5"
                  disabled={savingPosting}
                  onClick={handleCancelPostingEdit}
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Mégsem</span>
                </Button>
                <Button
                  size="sm"
                  className="h-9 text-xs gap-1.5"
                  disabled={savingPosting}
                  onClick={handleSavePostingEdit}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {savingPosting ? "Mentés..." : "Módosítások mentése"}
                  </span>
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs gap-1.5"
                onClick={handleStartPostingEdit}
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Hirdetés szerkesztése</span>
              </Button>
            ))}

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

      {/* ── 3. Felső Pozíció Paraméterek Kártyarács (4x2 különálló kártya, szerkesztő módban inline űrlapmezőkkel) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Szakmai részleg */}
        <div
          className={cn(
            "rounded-lg border bg-card p-4 flex flex-col justify-between min-h-[88px] transition-colors",
            isEditingPosting ? "border-primary/40" : "border-border"
          )}
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Szakmai részleg
          </span>
          {isEditingPosting ? (
            <Input
              value={draftReszlegNev}
              onChange={(e) => setDraftReszlegNev(e.target.value)}
              placeholder="pl. Termék & Design"
              className="h-8 text-xs mt-2"
            />
          ) : (
            <span className="text-sm font-semibold text-foreground mt-2">
              {posting.reszleg_nev || "Általános"}
            </span>
          )}
        </div>

        {/* 2. Belső munkakör */}
        <div
          className={cn(
            "rounded-lg border bg-card p-4 flex flex-col justify-between min-h-[88px] transition-colors",
            isEditingPosting ? "border-primary/40" : "border-border"
          )}
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Belső munkakör
          </span>
          {isEditingPosting ? (
            <Select
              value={draftMunkakorId}
              onValueChange={(val) => setDraftMunkakorId(val)}
            >
              <SelectTrigger className="h-8 text-xs mt-2">
                <SelectValue placeholder="Válassz munkakört..." />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id} className="text-xs">
                    {j.megnevezes}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : posting.munkakor_id && posting.hr_munkakor?.megnevezes ? (
            <Link
              href={`/hr/job/${posting.munkakor_id}`}
              className="text-sm font-semibold text-primary hover:underline mt-2 truncate"
            >
              {posting.hr_munkakor.megnevezes}
            </Link>
          ) : (
            <span className="text-sm font-semibold text-foreground mt-2 truncate">
              {posting.hr_munkakor?.megnevezes || "–"}
            </span>
          )}
        </div>

        {/* 3. Munkavégzés módja */}
        <div
          className={cn(
            "rounded-lg border bg-card p-4 flex flex-col justify-between min-h-[88px] transition-colors",
            isEditingPosting ? "border-primary/40" : "border-border"
          )}
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Munkavégzés módja
          </span>
          {isEditingPosting ? (
            <Select
              value={draftMunkavegzesModja}
              onValueChange={(val) => setDraftMunkavegzesModja(val)}
            >
              <SelectTrigger className="h-8 text-xs mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hibrid" className="text-xs">
                  Hibrid munkavégzés
                </SelectItem>
                <SelectItem value="irodai" className="text-xs">
                  Irodai munkavégzés
                </SelectItem>
                <SelectItem value="tavmunka" className="text-xs">
                  Távmunka (Remote)
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm font-semibold text-foreground mt-2">
              {WORK_MODE_LABELS[posting.munkavegzes_modja || "hibrid"] ||
                posting.munkavegzes_modja ||
                "Hibrid munkavégzés"}
            </span>
          )}
        </div>

        {/* 4. Foglalkoztatás */}
        <div
          className={cn(
            "rounded-lg border bg-card p-4 flex flex-col justify-between min-h-[88px] transition-colors",
            isEditingPosting ? "border-primary/40" : "border-border"
          )}
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Foglalkoztatás
          </span>
          {isEditingPosting ? (
            <Select
              value={draftFoglalkoztatasTipusa}
              onValueChange={(val) => setDraftFoglalkoztatasTipusa(val)}
            >
              <SelectTrigger className="h-8 text-xs mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teljes_munkaido" className="text-xs">
                  Teljes munkaidő
                </SelectItem>
                <SelectItem value="reszmunkaido" className="text-xs">
                  Részmunkaidő
                </SelectItem>
                <SelectItem value="szerzodeses" className="text-xs">
                  Szerződéses / Projekt
                </SelectItem>
                <SelectItem value="gyakornok" className="text-xs">
                  Gyakornoki pozíció
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm font-semibold text-foreground mt-2">
              {EMPLOYMENT_TYPE_LABELS[
                posting.foglalkoztatas_tipusa || "teljes_munkaido"
              ] ||
                posting.foglalkoztatas_tipusa ||
                "Teljes munkaidő"}
            </span>
          )}
        </div>

        {/* 5. Tapasztalati szint */}
        <div
          className={cn(
            "rounded-lg border bg-card p-4 flex flex-col justify-between min-h-[88px] transition-colors",
            isEditingPosting ? "border-primary/40" : "border-border"
          )}
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Tapasztalati szint
          </span>
          {isEditingPosting ? (
            <Select
              value={draftTapasztalatiSzint}
              onValueChange={(val) => setDraftTapasztalatiSzint(val)}
            >
              <SelectTrigger className="h-8 text-xs mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gyakornok" className="text-xs">
                  Gyakornok
                </SelectItem>
                <SelectItem value="junior" className="text-xs">
                  Junior
                </SelectItem>
                <SelectItem value="medior" className="text-xs">
                  Medior
                </SelectItem>
                <SelectItem value="senior" className="text-xs">
                  Senior
                </SelectItem>
                <SelectItem value="lead" className="text-xs">
                  Lead / Vezető
                </SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm font-semibold text-foreground mt-2">
              {SENIORITY_LABELS[posting.tapasztalati_szint || "medior"] ||
                posting.tapasztalati_szint ||
                "Medior"}
            </span>
          )}
        </div>

        {/* 6. Munkavégzés helye */}
        <div
          className={cn(
            "rounded-lg border bg-card p-4 flex flex-col justify-between min-h-[88px] transition-colors",
            isEditingPosting ? "border-primary/40" : "border-border"
          )}
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Munkavégzés helye
          </span>
          {isEditingPosting ? (
            <Input
              value={draftHelyszin}
              onChange={(e) => setDraftHelyszin(e.target.value)}
              placeholder="pl. 1054 Budapest, Szabadság tér 7."
              className="h-8 text-xs mt-2"
            />
          ) : (
            <span className="text-sm font-semibold text-foreground mt-2">
              {posting.helyszin || "Nincs megadva"}
            </span>
          )}
        </div>

        {/* 7. Bruttó havi bérsáv */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col justify-between min-h-[88px]">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Bruttó havi bérsáv
          </span>
          {isEditingPosting ? (
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <Input
                  type="number"
                  step={10000}
                  min={0}
                  value={draftBersavMin}
                  onChange={(e) => setDraftBersavMin(e.target.value)}
                  placeholder="Min. (Ft)"
                  className="h-7 text-xs bg-background px-2 tabular-nums"
                />
                <Input
                  type="number"
                  step={10000}
                  min={0}
                  value={draftBersavMax}
                  onChange={(e) => setDraftBersavMax(e.target.value)}
                  placeholder="Max. (Ft)"
                  className="h-7 text-xs bg-background px-2 tabular-nums"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground">
                  Publikus a karrieroldalon
                </span>
                <Switch
                  checked={draftBersavPublikus}
                  onCheckedChange={setDraftBersavPublikus}
                />
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-sm font-semibold text-primary tabular-nums">
                {salaryLabel || "Nincs megadva"}
              </p>
              {salaryLabel && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {posting.bersav_publikus
                    ? "Publikus a karrieroldalon"
                    : "Belső referenciasáv"}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 8. Jelentkezési határidő */}
        <div
          className={cn(
            "rounded-lg border bg-card p-4 flex flex-col justify-between min-h-[88px] transition-colors",
            isEditingPosting ? "border-primary/40" : "border-border"
          )}
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Jelentkezési határidő
          </span>
          {isEditingPosting ? (
            <div className="mt-2 space-y-1">
              <Input
                type="date"
                value={draftJelentkezesiHatarido}
                onChange={(e) => setDraftJelentkezesiHatarido(e.target.value)}
                className="h-8 text-xs tabular-nums"
              />
              {draftJelentkezesiHatarido && (
                <button
                  type="button"
                  onClick={() => setDraftJelentkezesiHatarido("")}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline"
                >
                  Törlés (Folyamatos)
                </button>
              )}
            </div>
          ) : (
            <span className="text-sm font-semibold text-foreground tabular-nums mt-2">
              {deadlineDateStr || "Folyamatos"}
            </span>
          )}
        </div>
      </div>

      {/* ── 4. Kétfülű felépítés: 1) Jelentkezők | 2) Álláshirdetés tartalma és leírása ── */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-5"
      >
        <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0">
          <TabsTrigger
            value="applicants"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-5 py-3 gap-2 text-sm"
          >
            Jelentkezők
            <Badge
              variant="secondary"
              className="ml-1 font-normal text-xs tabular-nums"
            >
              {totalCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="description"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-5 py-3 gap-2 text-sm"
          >
            Álláshirdetés tartalma és leírása
          </TabsTrigger>
        </TabsList>

        {/* 1. FÜL: JELENTKEZŐK TÁBLÁZATA */}
        <TabsContent value="applicants" className="space-y-4 m-0">
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
                              {SOURCE_LABELS[c.forras] ||
                                c.forras ||
                                "Karrieroldal"}
                            </Badge>
                          </TableCell>
                        )}

                        {isColVisible("ai") && (
                          <TableCell className="py-3">
                            <div className="space-y-1">
                              {typeof (
                                c.ai_relevance_score ?? c.ai_match_score
                              ) === "number" ? (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[11px] font-semibold tabular-nums",
                                    (c.ai_relevance_score ?? c.ai_match_score) >=
                                      75
                                      ? "bg-success/10 text-success border-success/30"
                                      : (c.ai_relevance_score ??
                                          c.ai_match_score) >= 50
                                      ? "bg-warning/10 text-warning border-warning/30"
                                      : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {c.ai_relevance_score ?? c.ai_match_score}%
                                  illeszkedés
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
        </TabsContent>

        {/* 2. FÜL: ÁLLÁSHIRDETÉS TARTALMA ÉS LEÍRÁSA */}
        <TabsContent value="description" className="m-0">
          <Card className="border-border shadow-none">
            <CardHeader className="pb-4 border-b border-border/60 flex flex-row items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-base font-semibold">
                  Álláshirdetés tartalma és leírása
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  A karrieroldalon megjelenő, formázott pozícióleírás
                </CardDescription>
              </div>

              {!isReadOnly && (
                <div className="flex items-center gap-2">
                  {isEditingPosting ? (
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      disabled={savingPosting}
                      onClick={handleSavePostingEdit}
                    >
                      {savingPosting ? "Mentés..." : "Módosítások mentése"}
                    </Button>
                  ) : isEditingDescription ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        disabled={savingDescription}
                        onClick={() => setIsEditingDescription(false)}
                      >
                        Mégsem
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        disabled={savingDescription}
                        onClick={handleSaveInlineDescription}
                      >
                        {savingDescription ? "Mentés..." : "Leírás mentése"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={handleStartInlineDescriptionEdit}
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Szöveg szerkesztése</span>
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {isEditingDescription || isEditingPosting ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Rövid összefoglaló (kártyás előnézet és bevezető)
                    </Label>
                    <Textarea
                      value={draftRovidLeiras}
                      onChange={(e) => setDraftRovidLeiras(e.target.value)}
                      placeholder="1-2 mondatos lényegretörő összefoglaló a pozícióról..."
                      maxLength={240}
                      className="min-h-[64px] text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Részletes pozícióleírás (formázott szövegszerkesztő)
                    </Label>
                    <RichTextEditor
                      value={draftReszletesLeiras}
                      onChange={setDraftReszletesLeiras}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {posting.rovid_leiras && (
                    <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Rövid összefoglaló
                      </p>
                      <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                        {posting.rovid_leiras}
                      </p>
                    </div>
                  )}

                  <RichTextContent
                    content={posting.reszletes_leiras}
                    fallback={
                      <div className="py-8 text-center space-y-2">
                        <p className="text-sm font-semibold text-foreground">
                          Még nincs részletes hirdetésszöveg megadva ehhez a pozícióhoz.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Kattints a „Szöveg szerkesztése” gombra a pozícióleírás összeállításához.
                        </p>
                      </div>
                    }
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
