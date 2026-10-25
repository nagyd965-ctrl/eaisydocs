"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import {
  Link2,
  Plus,
  Sparkles,
  MoreVertical,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Eye,
  Building2,
  User,
  FileText,
  FileSignature,
  Receipt,
  ArrowLeftRight,
  FolderKanban,
  Workflow,
  Search,
  Check,
  ArrowLeft,
  ArrowRight,
  Lock,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TableToolbar, TableColumnOption } from "@/components/table-toolbar/table-toolbar"
import { UserAvatar } from "@/components/user-avatar"
import { DocumentViewer } from "@/components/document-viewer"
import { deletePolymorphicLink, addPolymorphicLink, searchLinkPartners } from "@/app/dossiers/[id]/actions"
import type { ResolvedLinkEntity } from "@/utils/resolve-link-entities"

export interface IratOption {
  id: string
  targy: string
  erkeztetoszam?: string | null
  alszam?: number | null
  irat_fajl?: any[] | null
}

export interface PolymorphicLink {
  id: string
  irat_id?: string | null
  entitas_tipus: string
  entitas_id: string
  entitas_forras: string
  kapcsolat_tipusa?: string | null
  kapcsolat_tipus?: string | null
  irat?: IratOption | IratOption[] | null
}

interface PolymorphicLinksTabProps {
  links: PolymorphicLink[]
  ugyiratId: string
  iktatoszam?: string
  iratok: IratOption[]
  /** Szerver oldalon feloldott, olvasható entitások (kulcs: `${tipus}:${id}`). */
  entities?: Record<string, ResolvedLinkEntity>
  canEdit?: boolean
}

// ── Megjelenítési segédek: adatbázis-értékek → emberi nyelv ─────────────────────────────

const TYPE_META: Record<string, { label: string; icon: LucideIcon }> = {
  munkavallalo: { label: "Munkavállaló", icon: User },
  hr_dokumentum: { label: "HR dokumentum", icon: FileText },
  partner: { label: "Partner", icon: Building2 },
  szerzodes: { label: "Szerződés", icon: FileSignature },
  szamla: { label: "Számla", icon: Receipt },
  tranzakcio: { label: "Tranzakció", icon: ArrowLeftRight },
  projekt: { label: "Projekt", icon: FolderKanban },
  folyamat: { label: "Folyamat", icon: Workflow },
}

/** Az eaisyHR integráció által automatikusan létrehozott kapcsolatok – kézzel nem törölhetők. */
const SYSTEM_LINK_TYPES = ["munkavallalo", "hr_dokumentum"]

/** Kézzel felvehető típusok az „Új kapcsolat” varázslóban. */
const MANUAL_TYPES: Array<{ id: string; description: string; placeholder: string; idLabel: string }> = [
  { id: "partner", description: "Ügyfél vagy szállító a partnertörzsből.", placeholder: "", idLabel: "" },
  { id: "szerzodes", description: "Szerződés egy kapcsolt üzleti rendszerből.", placeholder: "pl. SZ-2026-014", idLabel: "Szerződésszám" },
  { id: "szamla", description: "Bejövő vagy kimenő számla.", placeholder: "pl. INV-2026-001", idLabel: "Számlaszám" },
  { id: "tranzakcio", description: "Banki vagy pénzügyi tranzakció.", placeholder: "pl. TR-2026-0042", idLabel: "Tranzakció azonosítója" },
  { id: "projekt", description: "Projekt vagy megbízás.", placeholder: "pl. PRJ-117", idLabel: "Projekt azonosítója" },
  { id: "folyamat", description: "Üzleti folyamat vagy workflow.", placeholder: "pl. WF-2026-008", idLabel: "Folyamat azonosítója" },
]

const SOURCE_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "erp", label: "ERP" },
  { id: "crm", label: "CRM" },
  { id: "belso", label: "Belső rendszer" },
]

const RELATION_OPTIONS: Array<{ id: string; label: string; description: string }> = [
  { id: "hivatkozas", label: "Hivatkozás", description: "Az ügyirat hivatkozik erre az elemre." },
  { id: "targya", label: "Az ügyirat tárgya", description: "Az ügyirat erről az elemről szól." },
  { id: "melleklete", label: "Csatolt dokumentum", description: "Az elem az ügyirat mellékleteként kapcsolódik." },
  { id: "elozmeny", label: "Előzmény", description: "Korábbi ügy vagy esemény, amelyből az ügyirat ered." },
]

const ALL_IRAT = "__all__"
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getTypeLabel(type: string) {
  return TYPE_META[type]?.label || type
}

function getSourceLabel(type: string, forras: string) {
  if (forras === "erp") return "ERP"
  if (forras === "crm") return "CRM"
  return SYSTEM_LINK_TYPES.includes(type) ? "eaisyHR" : "eaisyDocs"
}

function getRelationLabel(kind: string | null | undefined, hasIrat: boolean) {
  switch (kind) {
    case "targya":
      return hasIrat ? "Az irat tárgya" : "Az ügyirat tárgya"
    case "melleklete":
      return "Csatolt dokumentum"
    case "hivatkozas":
      return "Hivatkozás"
    case "elozmeny":
      return "Előzmény"
    default:
      return kind || "Kapcsolat"
  }
}

function pickIrat(link: PolymorphicLink): IratOption | null {
  const irat = Array.isArray(link.irat) ? link.irat[0] : link.irat
  return irat || null
}

interface LinkGroup {
  key: string
  type: string
  entityId: string
  forras: string
  links: PolymorphicLink[]
  entity?: ResolvedLinkEntity
  name: string
  subtitle: string | null
}

export function PolymorphicLinksTab({
  links,
  ugyiratId,
  iktatoszam,
  iratok,
  entities = {},
  canEdit = true,
}: PolymorphicLinksTabProps) {
  const router = useRouter()

  // ── Táblázat állapot ──
  const [search, setSearch] = useState("")
  const [typeFilters, setTypeFilters] = useState<string[]>([])
  const [sourceFilters, setSourceFilters] = useState<string[]>([])
  const [expanded, setExpanded] = useState<string[]>([])
  const [columns, setColumns] = useState<TableColumnOption[]>([
    { id: "tipus", label: "Típus", isVisible: true },
    { id: "forras", label: "Forrás", isVisible: true },
    { id: "kapcsolat", label: "Kapcsolat jellege", isVisible: true },
    { id: "irat", label: "Érintett irat", isVisible: true },
  ])
  const isColVisible = (id: string) => columns.find((c) => c.id === id)?.isVisible ?? true
  const toggleColumn = (id: string) =>
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, isVisible: !c.isVisible } : c)))

  // ── Törlés / megtekintés ──
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerFajl, setViewerFajl] = useState<any>(null)
  const [viewerIratId, setViewerIratId] = useState("")

  // ── Varázsló állapot ──
  const [wizardOpen, setWizardOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [tipus, setTipus] = useState("")
  const [forras, setForras] = useState("erp")
  const [extId, setExtId] = useState("")
  const [partnerQuery, setPartnerQuery] = useState("")
  const [partnerResults, setPartnerResults] = useState<Array<{ id: string; nev: string; adoszam?: string | null }>>([])
  const [partnerLoading, setPartnerLoading] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<{ id: string; nev: string } | null>(null)
  const [relation, setRelation] = useState("hivatkozas")
  const [iratId, setIratId] = useState(ALL_IRAT)
  const [submitting, setSubmitting] = useState(false)

  const iratLabel = (id?: string | null) => {
    if (!id) return "Egész ügyirat"
    const irat = iratok.find((i) => i.id === id)
    if (!irat) return "Irat"
    if (iktatoszam && irat.alszam) return `${iktatoszam}/${irat.alszam}`
    return irat.erkeztetoszam || irat.targy || "Irat"
  }

  // ── Kapcsolatok csoportosítása: egy entitás = egy sor ──
  const groups: LinkGroup[] = useMemo(() => {
    const map = new Map<string, LinkGroup>()
    for (const link of links) {
      const key = `${link.entitas_tipus}:${link.entitas_id}:${link.entitas_forras}`
      let g = map.get(key)
      if (!g) {
        const entity = entities[`${link.entitas_tipus}:${link.entitas_id}`]
        g = {
          key,
          type: link.entitas_tipus,
          entityId: link.entitas_id,
          forras: link.entitas_forras,
          links: [],
          entity,
          name: "",
          subtitle: entity?.subtitle || null,
        }
        map.set(key, g)
      }
      g.links.push(link)
    }
    const result = Array.from(map.values())
    for (const g of result) {
      let name = g.entity?.name
      // HR dokumentum tartalék név: a hozzá tartozó irat tárgya (nem függ az eaisyHR adataitól)
      if (!name && g.type === "hr_dokumentum") {
        name = g.links.map(pickIrat).find(Boolean)?.targy
      }
      if (!name) {
        const isHumanCode = !["munkavallalo", "hr_dokumentum", "partner"].includes(g.type)
        if (isHumanCode) {
          name = UUID_RE.test(g.entityId) ? `${g.entityId.slice(0, 8)}…` : g.entityId
        } else {
          name = `${getTypeLabel(g.type)} (nem elérhető)`
        }
      }
      g.name = name
    }
    return result.sort((a, b) => getTypeLabel(a.type).localeCompare(getTypeLabel(b.type), "hu") || a.name.localeCompare(b.name, "hu"))
  }, [links, entities])

  const toggleInList = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id]

  const presentTypes = Array.from(new Set(groups.map((g) => g.type)))
  const presentSources = Array.from(new Set(groups.map((g) => getSourceLabel(g.type, g.forras))))

  const filteredGroups = groups.filter((g) => {
    const sourceLabel = getSourceLabel(g.type, g.forras)
    if (typeFilters.length > 0 && !typeFilters.includes(g.type)) return false
    if (sourceFilters.length > 0 && !sourceFilters.includes(sourceLabel)) return false
    const q = search.trim().toLowerCase()
    if (q) {
      const haystack = [
        g.name,
        g.subtitle,
        g.entityId,
        getTypeLabel(g.type),
        sourceLabel,
        ...g.links.map((l) => iratLabel(l.irat_id)),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  const filterGroups = [
    {
      id: "tipus",
      title: "Típus",
      options: presentTypes.map((t) => ({ id: t, label: getTypeLabel(t), checked: typeFilters.includes(t) })),
      onToggle: (id: string) => setTypeFilters((prev) => toggleInList(prev, id)),
    },
    {
      id: "forras",
      title: "Forrás",
      options: presentSources.map((s) => ({ id: s, label: s, checked: sourceFilters.includes(s) })),
      onToggle: (id: string) => setSourceFilters((prev) => toggleInList(prev, id)),
    },
  ]

  const visibleColCount = 2 + columns.filter((c) => c.isVisible).length

  // ── Műveletek ──
  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      toast.success("Azonosító a vágólapra másolva.")
    } catch {
      toast.error("Az azonosító másolása nem sikerült.")
    }
  }

  const openViewer = (g: LinkGroup) => {
    for (const link of g.links) {
      if (!link.irat_id) continue
      const irat = iratok.find((i) => i.id === link.irat_id)
      const fajl = irat?.irat_fajl?.[0]
      if (fajl) {
        setViewerFajl(fajl)
        setViewerIratId(link.irat_id)
        setViewerOpen(true)
        return
      }
    }
    toast.info("Ehhez a kapcsolathoz nincs megtekinthető fájl.")
  }

  const hasViewableFile = (g: LinkGroup) =>
    g.links.some((l) => !!l.irat_id && !!iratok.find((i) => i.id === l.irat_id)?.irat_fajl?.length)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    let failed = false
    for (const id of deleteTarget.ids) {
      const res = await deletePolymorphicLink(id, ugyiratId)
      if (res.error) {
        toast.error("Hiba", { description: res.error })
        failed = true
        break
      }
    }
    setDeleting(false)
    if (!failed) toast.success("Kapcsolat törölve.")
    setDeleteTarget(null)
    router.refresh()
  }

  // ── Varázsló ──
  const resetWizard = () => {
    setStep(1)
    setTipus("")
    setForras("erp")
    setExtId("")
    setPartnerQuery("")
    setPartnerResults([])
    setSelectedPartner(null)
    setRelation("hivatkozas")
    setIratId(ALL_IRAT)
  }

  const openWizard = () => {
    resetWizard()
    setWizardOpen(true)
  }

  // Partnerkereső (késleltetett, élő találati lista)
  useEffect(() => {
    if (!wizardOpen || step !== 2 || tipus !== "partner") return
    let cancelled = false
    const timer = setTimeout(
      async () => {
        setPartnerLoading(true)
        const res = await searchLinkPartners(partnerQuery)
        if (cancelled) return
        setPartnerResults(res.results || [])
        setPartnerLoading(false)
      },
      partnerQuery ? 250 : 0
    )
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [wizardOpen, step, tipus, partnerQuery])

  const typeConfig = MANUAL_TYPES.find((t) => t.id === tipus)
  const effectiveForras = tipus === "partner" ? "belso" : forras
  const effectiveEntityId = tipus === "partner" ? selectedPartner?.id || "" : extId.trim()
  const effectiveEntityName = tipus === "partner" ? selectedPartner?.nev || "" : extId.trim()

  const canProceed =
    (step === 1 && !!tipus) ||
    (step === 2 && !!effectiveEntityId) ||
    (step === 3 && !!relation)

  const handleSubmit = async () => {
    if (!effectiveEntityId || !tipus || !relation) return
    setSubmitting(true)
    const formData = new FormData()
    formData.append("ugyirat_id", ugyiratId)
    if (iratId !== ALL_IRAT) formData.append("irat_id", iratId)
    formData.append("entitas_tipus", tipus)
    formData.append("entitas_forras", effectiveForras)
    formData.append("entitas_id", effectiveEntityId)
    formData.append("kapcsolat_tipusa", relation)

    const res = await addPolymorphicLink(formData)
    setSubmitting(false)

    if (res.error) {
      toast.error("Hiba", { description: res.error })
      return
    }
    toast.success("Kapcsolat rögzítve.")
    setWizardOpen(false)
    router.refresh()
  }

  const stepTitle =
    step === 1 ? "Mit szeretne kapcsolni?" : step === 2 ? (tipus === "partner" ? "Partner kiválasztása" : "Azonosítás a külső rendszerben") : "Mire vonatkozik a kapcsolat?"
  const stepDescription =
    step === 1
      ? "Válassza ki, milyen típusú elemhez kapcsolja az ügyiratot."
      : step === 2
        ? tipus === "partner"
          ? "Keressen a partnertörzsben név vagy adószám alapján."
          : "Adja meg, melyik rendszerben és milyen azonosítóval található az elem."
        : "Határozza meg a kapcsolat jellegét és azt, hogy az egész ügyiratra vagy egy konkrét iratra vonatkozik."

  const renderEntityCell = (g: LinkGroup) => {
    const meta = TYPE_META[g.type]
    const Icon = meta?.icon || Link2
    const content = (
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight truncate">{g.name}</p>
        {g.subtitle && <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">{g.subtitle}</p>}
      </div>
    )
    return (
      <div className="flex items-center gap-2.5 min-w-0">
        {g.type === "munkavallalo" ? (
          <UserAvatar name={g.name} src={g.entity?.avatarUrl || (g.entity as any)?.avatar_url} className="size-7" />
        ) : (
          <div className="h-7 w-7 rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4" />
          </div>
        )}
        {g.entity?.href ? (
          <Link href={g.entity.href} className="min-w-0 hover:underline underline-offset-2">
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
    )
  }

  const renderRelationSummary = (g: LinkGroup) => {
    const labels = Array.from(new Set(g.links.map((l) => getRelationLabel(l.kapcsolat_tipusa || l.kapcsolat_tipus, !!l.irat_id))))
    return labels.join(", ")
  }

  const renderIratSummary = (g: LinkGroup) => {
    const iratIds = Array.from(new Set(g.links.map((l) => l.irat_id).filter(Boolean))) as string[]
    const hasWhole = g.links.some((l) => !l.irat_id)
    if (iratIds.length === 0) return "Egész ügyirat"
    if (iratIds.length === 1 && !hasWhole) return iratLabel(iratIds[0])
    return `${hasWhole ? "Egész ügyirat + " : ""}${iratIds.length} irat`
  }

  return (
    <>
      <Card className="border border-border/60">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Kapcsolódások</CardTitle>
              {groups.length > 0 && (
                <Badge variant="outline" className="text-xs font-normal tabular-nums">
                  {groups.length} elem
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Partnerek, munkavállalók, dokumentumok és külső rendszerek elemei, amelyekhez az ügyirat tartozik.
            </CardDescription>
          </div>

          {canEdit && (
            <Button
              size="sm"
              onClick={openWizard}
              className="h-8 gap-1.5 text-xs cursor-pointer self-start sm:self-center bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Új kapcsolat</span>
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {groups.length === 0 ? (
            <div className="py-12 text-center border border-dashed rounded-lg bg-muted/20 space-y-3">
              <Link2 className="h-6 w-6 text-muted-foreground/60 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-foreground">Még nincs kapcsolódó elem ebben az ügyiratban.</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
                  Kösse az ügyiratot partnerhez, szerződéshez, számlához vagy más külső rendszerben tárolt elemhez, hogy
                  később egy helyen megtalálja őket.
                </p>
              </div>
              {canEdit && (
                <Button size="sm" variant="outline" onClick={openWizard} className="h-8 gap-1.5 text-xs cursor-pointer">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Kapcsolat felvétele most</span>
                </Button>
              )}
            </div>
          ) : (
            <>
              <TableToolbar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Keresés név, azonosító vagy irat alapján..."
                columns={columns}
                onToggleColumn={toggleColumn}
                filterGroups={filterGroups}
                activeFiltersCount={typeFilters.length + sourceFilters.length}
                onClearFilters={() => {
                  setTypeFilters([])
                  setSourceFilters([])
                }}
              />

              <div className="rounded-lg border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/30">
                      <TableHead className="text-xs text-muted-foreground">Elem</TableHead>
                      {isColVisible("tipus") && <TableHead className="text-xs text-muted-foreground">Típus</TableHead>}
                      {isColVisible("forras") && <TableHead className="text-xs text-muted-foreground">Forrás</TableHead>}
                      {isColVisible("kapcsolat") && (
                        <TableHead className="text-xs text-muted-foreground">Kapcsolat jellege</TableHead>
                      )}
                      {isColVisible("irat") && <TableHead className="text-xs text-muted-foreground">Érintett irat</TableHead>}
                      <TableHead className="w-12 text-right text-xs text-muted-foreground pr-3" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGroups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={visibleColCount} className="text-center py-8 text-xs text-muted-foreground">
                          Nincs a keresésnek vagy szűrésnek megfelelő kapcsolat.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredGroups.map((g) => {
                        const isSystem = SYSTEM_LINK_TYPES.includes(g.type)
                        const isOpen = expanded.includes(g.key)
                        const multi = g.links.length > 1
                        return (
                          <GroupRows
                            key={g.key}
                            multi={multi}
                            isOpen={isOpen}
                            colSpan={visibleColCount}
                            entityCell={
                              <div className="flex items-center gap-1.5">
                                {multi ? (
                                  <button
                                    type="button"
                                    onClick={() => setExpanded((prev) => toggleInList(prev, g.key))}
                                    className="h-6 w-6 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                    title={isOpen ? "Részletek elrejtése" : "Részletek megjelenítése"}
                                  >
                                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </button>
                                ) : (
                                  <span className="w-6 shrink-0" />
                                )}
                                {renderEntityCell(g)}
                              </div>
                            }
                            cells={
                              <>
                                {isColVisible("tipus") && (
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs font-normal">
                                      {getTypeLabel(g.type)}
                                    </Badge>
                                  </TableCell>
                                )}
                                {isColVisible("forras") && (
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                                      {getSourceLabel(g.type, g.forras)}
                                    </Badge>
                                  </TableCell>
                                )}
                                {isColVisible("kapcsolat") && (
                                  <TableCell className="text-xs text-foreground">{renderRelationSummary(g)}</TableCell>
                                )}
                                {isColVisible("irat") && (
                                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                                    {renderIratSummary(g)}
                                  </TableCell>
                                )}
                              </>
                            }
                            actions={
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border/70 hover:border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                                  title="Műveletek"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  {g.entity?.href && (
                                    <DropdownMenuItem
                                      onClick={() => router.push(g.entity!.href!)}
                                      className="text-xs cursor-pointer"
                                    >
                                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                      Megnyitás
                                    </DropdownMenuItem>
                                  )}
                                  {hasViewableFile(g) && (
                                    <DropdownMenuItem onClick={() => openViewer(g)} className="text-xs cursor-pointer">
                                      <Eye className="mr-2 h-3.5 w-3.5" />
                                      Dokumentum megtekintése
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handleCopyId(g.entityId)} className="text-xs cursor-pointer">
                                    <Copy className="mr-2 h-3.5 w-3.5" />
                                    Azonosító másolása
                                  </DropdownMenuItem>
                                  {canEdit && (
                                    <>
                                      <DropdownMenuSeparator />
                                      {isSystem ? (
                                        <DropdownMenuItem disabled className="text-xs">
                                          <Lock className="mr-2 h-3.5 w-3.5" />
                                          Rendszer által létrehozott
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            setDeleteTarget({ ids: g.links.map((l) => l.id), name: g.name })
                                          }
                                          className="text-xs text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-medium"
                                        >
                                          <Trash2 className="mr-2 h-3.5 w-3.5 text-destructive" />
                                          Kapcsolat törlése
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            }
                            details={
                              <div className="space-y-1.5 py-1 pl-9">
                                {g.links.map((l) => (
                                  <div key={l.id} className="flex items-center gap-3 text-xs">
                                    <span className="text-foreground">
                                      {getRelationLabel(l.kapcsolat_tipusa || l.kapcsolat_tipus, !!l.irat_id)}
                                    </span>
                                    <span className="text-muted-foreground tabular-nums">· {iratLabel(l.irat_id)}</span>
                                    {canEdit && !isSystem && (
                                      <button
                                        type="button"
                                        onClick={() => setDeleteTarget({ ids: [l.id], name: g.name })}
                                        className="ml-auto h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                        title="Kapcsolat törlése"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            }
                          />
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── ÚJ KAPCSOLAT VARÁZSLÓ ── */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="sm:max-w-[760px] w-[96vw] max-h-[90vh] flex flex-col p-0 gap-0 border border-border/70 overflow-hidden">
          <div className="p-6 border-b border-border/50 bg-muted/10">
            <div className="flex items-center justify-between mb-4 pr-8">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                ÚJ KAPCSOLAT FELVÉTELE
              </span>
              <span className="text-xs text-muted-foreground">
                Ügyirat: <strong className="font-mono text-foreground">{iktatoszam || "—"}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center text-sm shrink-0">
                {step}
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-foreground">{stepTitle}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">{stepDescription}</DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${step >= n ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {/* 1. LÉPÉS: típus */}
            {step === 1 && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {MANUAL_TYPES.map((t) => {
                    const meta = TYPE_META[t.id]
                    const Icon = meta?.icon || Link2
                    const selected = tipus === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTipus(t.id)
                          setForras(t.id === "partner" ? "belso" : "erp")
                          setExtId("")
                          setSelectedPartner(null)
                        }}
                        className={`text-left rounded-lg border p-4 transition-colors cursor-pointer space-y-2 ${
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border/60 bg-card hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className={`h-7 w-7 rounded-md flex items-center justify-center ${
                              selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          {selected && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{meta?.label || t.id}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  A munkavállalói és HR dokumentum kapcsolatok az eaisyHR-ből történő iktatáskor maguktól létrejönnek,
                  ezeket nem kell kézzel felvenni.
                </p>
              </div>
            )}

            {/* 2. LÉPÉS: azonosítás */}
            {step === 2 && tipus === "partner" && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    value={partnerQuery}
                    onChange={(e) => setPartnerQuery(e.target.value)}
                    placeholder="Partner neve vagy adószáma..."
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                <div className="rounded-lg border border-border/60 divide-y divide-border/50 max-h-[300px] overflow-y-auto">
                  {partnerLoading && partnerResults.length === 0 ? (
                    <div className="p-6 flex items-center justify-center text-xs text-muted-foreground gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Keresés...
                    </div>
                  ) : partnerResults.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">Nincs találat a partnertörzsben.</div>
                  ) : (
                    partnerResults.map((p) => {
                      const selected = selectedPartner?.id === p.id
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPartner({ id: p.id, nev: p.nev })}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                            selected ? "bg-primary/5" : "hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-7 w-7 rounded-md bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{p.nev}</p>
                              {p.adoszam && <p className="text-[11px] text-muted-foreground">Adószám: {p.adoszam}</p>}
                            </div>
                          </div>
                          {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {step === 2 && tipus !== "partner" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Melyik rendszerben található?</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {SOURCE_OPTIONS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setForras(s.id)}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                          forras === s.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border/60 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    {typeConfig?.idLabel || "Azonosító"} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    autoFocus
                    value={extId}
                    onChange={(e) => setExtId(e.target.value)}
                    placeholder={typeConfig?.placeholder}
                    className="h-9 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Az az azonosító, amellyel az elem a külső rendszerben szerepel.
                  </p>
                </div>
              </div>
            )}

            {/* 3. LÉPÉS: jelleg + irat + összegzés */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Kapcsolat jellege</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {RELATION_OPTIONS.map((r) => {
                      const selected = relation === r.id
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRelation(r.id)}
                          className={`text-left rounded-lg border p-3 transition-colors cursor-pointer ${
                            selected ? "border-primary bg-primary/5" : "border-border/60 bg-card hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-foreground">{r.label}</p>
                            {selected && <Check className="h-4 w-4 text-primary" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{r.description}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Mire vonatkozik?</Label>
                  <Select value={iratId} onValueChange={(v) => setIratId(v || ALL_IRAT)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue>
                        {iratId === ALL_IRAT
                          ? "Az egész ügyiratra"
                          : `${iratLabel(iratId)} – ${iratok.find((i) => i.id === iratId)?.targy || ""}`}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_IRAT}>Az egész ügyiratra</SelectItem>
                      {iratok.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {iratLabel(i.id)} – {i.targy}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Összegzés</p>
                  <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-xs">
                    <dt className="text-muted-foreground">Típus</dt>
                    <dd className="text-foreground font-medium">{getTypeLabel(tipus)}</dd>
                    <dt className="text-muted-foreground">Elem</dt>
                    <dd className="text-foreground font-medium">{effectiveEntityName}</dd>
                    <dt className="text-muted-foreground">Forrás</dt>
                    <dd className="text-foreground">{getSourceLabel(tipus, effectiveForras)}</dd>
                    <dt className="text-muted-foreground">Jelleg</dt>
                    <dd className="text-foreground">
                      {getRelationLabel(relation, iratId !== ALL_IRAT)}
                    </dd>
                    <dt className="text-muted-foreground">Érintett irat</dt>
                    <dd className="text-foreground">{iratId === ALL_IRAT ? "Egész ügyirat" : iratLabel(iratId)}</dd>
                  </dl>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/10">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => (step === 1 ? setWizardOpen(false) : setStep(step - 1))}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              {step > 1 && <ArrowLeft className="h-3.5 w-3.5" />}
              {step === 1 ? "Mégse" : "Vissza"}
            </Button>

            {step < 3 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                Következő lépés
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={!canProceed || submitting}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Kapcsolat rögzítése
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── TÖRLÉS MEGERŐSÍTÉSE ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kapcsolat törlése</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan törli a(z) <strong>{deleteTarget?.name}</strong> kapcsolatot
              {deleteTarget && deleteTarget.ids.length > 1 ? ` (${deleteTarget.ids.length} kapcsolódás)` : ""}? A
              művelet nem vonható vissza.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Mégse</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Törlés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DocumentViewer open={viewerOpen} setOpen={setViewerOpen} fajl={viewerFajl} iratId={viewerIratId} />
    </>
  )
}

/** Egy csoport sora + a lenyitható részletek sora. */
function GroupRows({
  multi,
  isOpen,
  colSpan,
  entityCell,
  cells,
  actions,
  details,
}: {
  multi: boolean
  isOpen: boolean
  colSpan: number
  entityCell: React.ReactNode
  cells: React.ReactNode
  actions: React.ReactNode
  details: React.ReactNode
}) {
  return (
    <>
      <TableRow className="hover:bg-muted/20">
        <TableCell className="py-2.5">{entityCell}</TableCell>
        {cells}
        <TableCell className="text-right pr-3 py-2.5">{actions}</TableCell>
      </TableRow>
      {multi && isOpen && (
        <TableRow className="hover:bg-transparent bg-muted/10">
          <TableCell colSpan={colSpan} className="py-2">
            {details}
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
