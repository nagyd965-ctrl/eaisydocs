"use client"

import { useState, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  RefreshCw,
  Calendar,
  Download,
  Trash2,
  Clock,
  Building2,
} from "lucide-react"
import { forceExpireAllDossiers } from "@/app/archive/actions"
import { proposeDisposal, approveDisposal, getDisposalProtocolDownloadUrl } from "@/app/archive/disposal-actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { TableToolbar, TableColumnOption, FilterGroup } from "@/components/table-toolbar/table-toolbar"

const DEFAULT_ARCHIVE_COLUMNS: TableColumnOption[] = [
  { id: "iktatoszam", label: "Iktatószám", isVisible: true },
  { id: "tetel", label: "Irattári Tétel", isVisible: true },
  { id: "targy", label: "Ügy Tárgya", isVisible: true },
  { id: "felterjeszto", label: "Felterjesztő", isVisible: true },
  { id: "iratok", label: "Iratok száma", isVisible: true },
  { id: "megorzes", label: "Megőrzés Vége", isVisible: true },
  { id: "intezkedes", label: "Intézkedés Módja / Státusz", isVisible: true },
]

export function ArchiveClient({
  archivedDossiers,
  scrappingSuggestions,
  pendingApprovals,
  scrappedDossiers,
  disposalBatches = [],
  cutoffDate,
  todayStr,
  currentUserRole = "ugyintezo",
  currentUserId = "",
  fourEyesRequired = true,
}: {
  archivedDossiers: any[]
  scrappingSuggestions: any[]
  pendingApprovals: any[]
  scrappedDossiers: any[]
  disposalBatches?: any[]
  cutoffDate: string
  todayStr: string
  currentUserRole?: string
  currentUserId?: string
  fourEyesRequired?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [downloadingBatchId, setDownloadingBatchId] = useState<string | null>(null)
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([])
  const [selectedApprovals, setSelectedApprovals] = useState<string[]>([])

  // Fordulónap input state
  const [targetCutoff, setTargetCutoff] = useState(cutoffDate)

  // Protocol Dialog State
  const [protocolOpen, setProtocolOpen] = useState(false)
  const [protocolData, setProtocolData] = useState<any>(null)

  // Prompt Dialog State
  const [approvePromptOpen, setApprovePromptOpen] = useState(false)
  const [approverName, setApproverName] = useState("")

  // Eszköztár szűrési állapotok
  const [search, setSearch] = useState("")
  const [columns, setColumns] = useState<TableColumnOption[]>(DEFAULT_ARCHIVE_COLUMNS)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [selectedActions, setSelectedActions] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

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
    setSelectedActions([])
    setSelectedStatuses([])
  }

  const filterGroups: FilterGroup[] = [
    {
      id: "intezkedes",
      title: "Intézkedés módja",
      options: [
        { id: "selejtezheto", label: "Selejtezhető", checked: selectedActions.includes("selejtezheto") },
        { id: "leveltari", label: "Levéltári átadás", checked: selectedActions.includes("leveltari") },
      ],
      onToggle: (optId) => {
        setSelectedActions((prev) =>
          prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
        )
      },
    },
    {
      id: "statusz",
      title: "Státusz",
      options: [
        { id: "irattarban", label: "Irattárban", checked: selectedStatuses.includes("irattarban") },
        { id: "lezart", label: "Lezárva", checked: selectedStatuses.includes("lezart") },
        { id: "selejtezheto", label: "Vezetői jóváhagyásra vár", checked: selectedStatuses.includes("selejtezheto") },
        { id: "selejtezett", label: "Selejtezett", checked: selectedStatuses.includes("selejtezett") },
      ],
      onToggle: (optId) => {
        setSelectedStatuses((prev) =>
          prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
        )
      },
    },
  ]

  const activeFiltersCount = selectedActions.length + selectedStatuses.length

  // Univerzális szűrőfüggvény
  const filterDossierItem = (item: any) => {
    // 1. Kereső
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchNumber = item.iktatoszam?.toLowerCase().includes(q)
      const matchSubject = item.ugy?.targy?.toLowerCase().includes(q)
      const terv = Array.isArray(item.irattari_terv) ? item.irattari_terv[0] : item.irattari_terv
      const matchTerv =
        terv?.tetelszam?.toLowerCase().includes(q) || terv?.megnevezes?.toLowerCase().includes(q)
      if (!matchNumber && !matchSubject && !matchTerv) return false
    }

    // 2. Dátum tól / ig (megorzesi_ido_vege alapján)
    if (fromDate) {
      const mDate = item.megorzesi_ido_vege ? new Date(item.megorzesi_ido_vege).toISOString().split("T")[0] : ""
      if (mDate && mDate < fromDate) return false
    }
    if (toDate) {
      const mDate = item.megorzesi_ido_vege ? new Date(item.megorzesi_ido_vege).toISOString().split("T")[0] : ""
      if (mDate && mDate > toDate) return false
    }

    // 3. Intézkedés módja
    if (selectedActions.length > 0) {
      const terv = Array.isArray(item.irattari_terv) ? item.irattari_terv[0] : item.irattari_terv
      const isSelejt = terv?.selejtezheto !== false
      const matchSelejt = selectedActions.includes("selejtezheto") && isSelejt
      const matchLeveltar = selectedActions.includes("leveltari") && !isSelejt
      if (!matchSelejt && !matchLeveltar) return false
    }

    // 4. Státusz
    if (selectedStatuses.length > 0) {
      if (!selectedStatuses.includes(item.statusz)) return false
    }

    return true
  }

  // Szűrt listák az egyes fülekhez
  const filteredSuggestions = useMemo(
    () => scrappingSuggestions.filter(filterDossierItem),
    [scrappingSuggestions, search, fromDate, toDate, selectedActions, selectedStatuses]
  )

  const filteredApprovals = useMemo(
    () => pendingApprovals.filter(filterDossierItem),
    [pendingApprovals, search, fromDate, toDate, selectedActions, selectedStatuses]
  )

  const filteredArchived = useMemo(
    () => archivedDossiers.filter(filterDossierItem),
    [archivedDossiers, search, fromDate, toDate, selectedActions, selectedStatuses]
  )

  const filteredScrapped = useMemo(
    () => scrappedDossiers.filter(filterDossierItem),
    [scrappedDossiers, search, fromDate, toDate, selectedActions, selectedStatuses]
  )

  const filteredBatches = useMemo(() => {
    if (!search.trim()) return disposalBatches
    const q = search.toLowerCase()
    return disposalBatches.filter(
      (b) =>
        b.javaslattevo_nev?.toLowerCase().includes(q) ||
        b.jovahagyo_nev?.toLowerCase().includes(q) ||
        b.id?.toLowerCase().includes(q) ||
        b.selejtezes_tetel?.some((t: any) => {
          const u = t.ugyirat
          const terv = Array.isArray(u?.irattari_terv) ? u.irattari_terv[0] : u?.irattari_terv
          return (
            u?.iktatoszam?.toLowerCase().includes(q) ||
            terv?.tetelszam?.toLowerCase().includes(q) ||
            terv?.megnevezes?.toLowerCase().includes(q) ||
            u?.ugy?.targy?.toLowerCase().includes(q)
          )
        })
    )
  }, [disposalBatches, search])

  const handleCutoffApply = (dateValue: string) => {
    setTargetCutoff(dateValue)
    router.push(`/archive?cutoffDate=${dateValue}`)
  }

  const handlePropose = async () => {
    if (selectedSuggestions.length === 0) return
    setLoading(true)
    const result = await proposeDisposal(selectedSuggestions)
    if (result.error) {
      toast.error("Hiba", { description: result.error })
    } else {
      toast.success("Sikeres felterjesztés", {
        description: `${selectedSuggestions.length} db ügyirat felterjesztve jóváhagyásra (Négy szem elve).`,
      })
      setSelectedSuggestions([])
    }
    setLoading(false)
    router.refresh()
  }

  const handleApprove = async () => {
    if (selectedApprovals.length === 0) return
    if (!approverName || approverName.trim() === "") {
      toast.error("Hiba", { description: "Kérlek, add meg a jóváhagyó teljes nevét!" })
      return
    }

    // Négy szem elve előzetes kliens oldali ellenőrzés (csak ha a szigorú négyszem-elv aktív)
    if (fourEyesRequired) {
      const selfProposedItem = pendingApprovals.find(
        (p) => selectedApprovals.includes(p.id) && currentUserId && p.javaslattevo_user_id === currentUserId
      )
      if (selfProposedItem) {
        toast.error("Négy szem elve korlátozás", {
          description: `A(z) ${selfProposedItem.iktatoszam} ügyiratot te terjesztetted fel! A szigorú négyszem-elv szerint saját javaslatodat nem hagyhatod jóvá.`,
        })
        setApprovePromptOpen(false)
        return
      }
    }

    setLoading(true)

    try {
      const result = await approveDisposal(selectedApprovals, approverName.trim())
      if (result.error) {
        toast.error("Hiba a jóváhagyás során", { description: result.error })
        setApprovePromptOpen(false)
      } else {
        toast.success("Selejtezés sikeresen jóváhagyva!", {
          description: "A hivatalos Selejtezési Jegyzőkönyv elkészült és archiválásra került.",
        })
        setSelectedApprovals([])
        setApprovePromptOpen(false)

        if (result.pdfBase64) {
          try {
            const byteCharacters = atob(result.pdfBase64)
            const byteNumbers = new Array(byteCharacters.length)
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i)
            }
            const byteArray = new Uint8Array(byteNumbers)
            const blob = new Blob([byteArray], { type: "application/pdf" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `Selejtezesi_Jegyzokonyv_${(result.protocolNumber || "SELEJT").replace(/\//g, "-")}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          } catch (downloadErr) {
            console.error("Automatikus letöltési hiba:", downloadErr)
          }
        }

        setProtocolData({
          protocolNumber: result.protocolNumber,
          date: new Date().toLocaleDateString("hu-HU"),
          approver: approverName.trim(),
          proposer: result.proposer && result.proposer.trim() !== "" ? result.proposer : "Iratkezelő",
          items: result.disposedItems,
          pdfBase64: result.pdfBase64,
          storagePath: result.storagePath,
        })
        setProtocolOpen(true)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadSavedBatch = async (batch: any) => {
    if (!batch.jegyzokonyv_path) {
      toast.error("Ehhez a selejtezéshez nem található elmentett PDF jegyzőkönyv.")
      return
    }

    setDownloadingBatchId(batch.id)
    const res = await getDisposalProtocolDownloadUrl(batch.jegyzokonyv_path)
    if (res.error || !res.signedUrl) {
      toast.error("Nem sikerült letölteni a jegyzőkönyvet", { description: res.error })
    } else {
      window.open(res.signedUrl, "_blank")
    }
    setDownloadingBatchId(null)
  }

  const toggleSuggestion = (id: string) => {
    setSelectedSuggestions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleAllSuggestions = () => {
    if (selectedSuggestions.length === filteredSuggestions.length) {
      setSelectedSuggestions([])
    } else {
      setSelectedSuggestions(filteredSuggestions.map((s) => s.id))
    }
  }

  const toggleApproval = (id: string) => {
    const item = pendingApprovals.find((p) => p.id === id)
    if (fourEyesRequired && currentUserId && item?.javaslattevo_user_id === currentUserId) {
      toast.error("Négy szem elve korlátozás", {
        description: "A szigorú négyszem-elv alapján a saját magad által felterjesztett ügyiratot nem hagyhatod jóvá! A beállításokban engedélyezhető az egyfelhasználós jóváhagyás.",
      })
      return
    }
    setSelectedApprovals((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleAllApprovals = () => {
    // Négy szem elve: ha kötelező, csak azokat jelöljük ki, amelyeket nem az aktuális felhasználó terjesztett fel
    const approvable = fourEyesRequired
      ? filteredApprovals.filter((p) => !currentUserId || p.javaslattevo_user_id !== currentUserId)
      : filteredApprovals

    if (selectedApprovals.length === approvable.length && approvable.length > 0) {
      setSelectedApprovals([])
    } else {
      setSelectedApprovals(approvable.map((p) => p.id))
    }
  }

  const visibleColumnsCount = columns.filter((c) => c.isVisible).length

  return (
    <div className="space-y-4">
      {/* Egységes Táblázat Eszköztár */}
      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Keresés iktatószám, tárgy vagy irattári tétel szerint..."
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
      />

      <Tabs defaultValue="suggestions" className="w-full">
        <TabsList className="h-9 inline-flex w-fit items-center gap-1 p-1 bg-muted/80 rounded-lg">
          <TabsTrigger value="suggestions" className="flex items-center gap-1.5 px-3 h-7 text-xs sm:text-sm font-medium">
            <span>Javaslatok</span>
            {filteredSuggestions.length > 0 && (
              <span className="inline-flex h-4 min-w-4 px-1.5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {filteredSuggestions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-1.5 px-3 h-7 text-xs sm:text-sm font-medium">
            <span>Jóváhagyandó</span>
            {filteredApprovals.length > 0 && (
              <span className="inline-flex h-4 min-w-4 px-1.5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {filteredApprovals.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived" className="px-3 h-7 text-xs sm:text-sm font-medium">
            <span>Irattárban</span>
            <span className="text-muted-foreground ml-1 tabular-nums">({filteredArchived.length})</span>
          </TabsTrigger>
          <TabsTrigger value="scrapped" className="px-3 h-7 text-xs sm:text-sm font-medium">
            <span>Selejtezett & Jegyzőkönyvek</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. JAVASLATOK FÜL */}
        <TabsContent value="suggestions" className="mt-4">
          <div className="border border-border/50 rounded-md bg-card mb-4 overflow-hidden">
            <div className="p-4 bg-muted/30 border-b border-border/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold mb-0.5">Selejtezési & Átadási Javaslatok</p>
                    <p className="text-muted-foreground text-xs">
                      Az irattári terv szerinti megőrzési időt elért ügyiratok listája a megadott fordulónapig.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await forceExpireAllDossiers()
                      router.refresh()
                    }}
                    title="Minden lezárt ügyirat megőrzési idejének lejárttá tétele teszteléshez"
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Lejárt generálás
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={selectedSuggestions.length === 0 || loading}
                    onClick={handlePropose}
                  >
                    Felterjesztés Selejtezésre ({selectedSuggestions.length})
                  </Button>
                </div>
              </div>

              {/* Fordulónap sáv */}
              <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">Fordulónap (eddig lejárt ügyiratok):</span>
                  <Input
                    type="date"
                    value={targetCutoff}
                    onChange={(e) => handleCutoffApply(e.target.value)}
                    className="h-8 w-36 text-xs bg-background"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleCutoffApply(todayStr)}
                  >
                    Mai nap
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      const prevYear = new Date().getFullYear() - 1
                      handleCutoffApply(`${prevYear}-12-31`)
                    }}
                  >
                    Előző év vége
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground tabular-nums">
                  Megjelenítve: <strong className="text-foreground">{filteredSuggestions.length}</strong> / {scrappingSuggestions.length} db ügyirat
                </div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredSuggestions.length > 0 &&
                        selectedSuggestions.length === filteredSuggestions.length
                      }
                      onCheckedChange={toggleAllSuggestions}
                      aria-label="Összes kijelölése"
                    />
                  </TableHead>
                  {isColVisible("iktatoszam") && <TableHead>Iktatószám</TableHead>}
                  {isColVisible("tetel") && <TableHead>Irattári Tétel</TableHead>}
                  {isColVisible("targy") && <TableHead>Ügy Tárgya</TableHead>}
                  {isColVisible("iratok") && <TableHead className="text-center">Iratok</TableHead>}
                  {isColVisible("megorzes") && <TableHead>Megőrzés Vége</TableHead>}
                  {isColVisible("intezkedes") && <TableHead>Intézkedés Módja</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuggestions.length > 0 ? (
                  filteredSuggestions.map((item) => {
                    const terv = Array.isArray(item.irattari_terv) ? item.irattari_terv[0] : item.irattari_terv
                    const isSelejtezheto = terv?.selejtezheto !== false
                    const isSelected = selectedSuggestions.includes(item.id)

                    return (
                      <TableRow
                        key={item.id}
                        className={`hover:bg-muted/50 transition-colors ${isSelected ? "bg-muted/40" : ""}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSuggestion(item.id)}
                          />
                        </TableCell>
                        {isColVisible("iktatoszam") && (
                          <TableCell className="font-medium">
                            <Link href={`/dossiers/${item.id}`} className="text-primary hover:underline font-mono">
                              {item.iktatoszam}
                            </Link>
                          </TableCell>
                        )}
                        {isColVisible("tetel") && (
                          <TableCell className="text-xs text-muted-foreground">
                            {terv?.tetelszam ? (
                              <span className="font-mono text-foreground font-medium mr-1.5">{terv.tetelszam}</span>
                            ) : null}
                            {terv?.megnevezes || "Általános"}
                          </TableCell>
                        )}
                        {isColVisible("targy") && (
                          <TableCell className="text-sm font-normal text-foreground max-w-xs truncate">
                            {item.ugy?.targy || "Nincs megadva"}
                          </TableCell>
                        )}
                        {isColVisible("iratok") && (
                          <TableCell className="text-center text-xs font-mono">
                            {item.irat?.[0]?.count ?? 1} db
                          </TableCell>
                        )}
                        {isColVisible("megorzes") && (
                          <TableCell className="text-xs font-mono">
                            {item.megorzesi_ido_vege ? new Date(item.megorzesi_ido_vege).toLocaleDateString("hu-HU") : "Ismeretlen"}
                          </TableCell>
                        )}
                        {isColVisible("intezkedes") && (
                          <TableCell>
                            {isSelejtezheto ? (
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[11px] gap-1">
                                <Trash2 className="w-3 h-3" />
                                Selejtezhető
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[11px] gap-1">
                                <Building2 className="w-3 h-3" />
                                Levéltári átadás
                              </Badge>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={visibleColumnsCount + 1} className="text-center py-12 text-muted-foreground">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Nincs a megadott szűrési feltételeknek megfelelő lejáró ügyirat.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 2. JÓVÁHAGYANDÓ FÜL */}
        <TabsContent value="approvals" className="mt-4">
          <div className="border border-border/50 rounded-md bg-card mb-4 overflow-hidden">
            <div className="p-4 bg-muted/30 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${fourEyesRequired ? "text-amber-500" : "text-emerald-500"}`} />
                <div className="text-sm">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="font-semibold">
                      Jóváhagyandó Selejtezések {fourEyesRequired ? "(Szigorú Négy-szem elve)" : "(Egyfelhasználós / KKV Mód)"}
                    </p>
                    {fourEyesRequired ? (
                      <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                        Szigorú audit mód aktív
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                        Négyszem-elv feloldva (Egyfelhasználós mód)
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {fourEyesRequired
                      ? "Az iratkezelő által felterjesztett ügyiratok. A felterjesztő a szigorú audit szabályok szerint nem hagyhatja jóvá a saját javaslatát."
                      : "A négyszem-elv feloldva: Vezetőként vagy rendszergazdaként a saját felterjesztéseidet is jóváhagyhatod egyetlen lépésben."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentUserRole === "ugyintezo" ? (
                  <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-500 border-rose-500/30 py-1 px-2.5">
                    Ügyintézőként nem hagyhatsz jóvá (kizárólag Vezető vagy Admin)
                  </Badge>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    disabled={selectedApprovals.length === 0 || loading}
                    onClick={() => setApprovePromptOpen(true)}
                  >
                    Selejtezés Jóváhagyása ({selectedApprovals.length})
                  </Button>
                )}
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredApprovals.length > 0 &&
                        selectedApprovals.length ===
                          (fourEyesRequired
                            ? filteredApprovals.filter(p => !currentUserId || p.javaslattevo_user_id !== currentUserId).length
                            : filteredApprovals.length) &&
                        selectedApprovals.length > 0
                      }
                      onCheckedChange={toggleAllApprovals}
                      aria-label="Összes jóváhagyandó kijelölése"
                    />
                  </TableHead>
                  {isColVisible("iktatoszam") && <TableHead>Iktatószám</TableHead>}
                  {isColVisible("targy") && <TableHead>Ügy Tárgya</TableHead>}
                  {isColVisible("felterjeszto") && <TableHead>Felterjesztő</TableHead>}
                  {isColVisible("iratok") && <TableHead className="text-center">Iratok</TableHead>}
                  {isColVisible("megorzes") && <TableHead>Megőrzés Vége</TableHead>}
                  {isColVisible("intezkedes") && <TableHead>Státusz</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApprovals.length > 0 ? (
                  filteredApprovals.map((item) => {
                    const isSelected = selectedApprovals.includes(item.id)
                    const isSelfProposed = Boolean(currentUserId && item.javaslattevo_user_id === currentUserId)

                    return (
                      <TableRow
                        key={item.id}
                        className={`hover:bg-muted/50 transition-colors ${isSelected ? "bg-muted/40" : ""} ${
                          isSelfProposed
                            ? fourEyesRequired
                              ? "bg-amber-500/5 opacity-80"
                              : "bg-emerald-500/5"
                            : ""
                        }`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            disabled={fourEyesRequired && isSelfProposed}
                            title={
                              isSelfProposed
                                ? fourEyesRequired
                                  ? "A szigorú négy szem elve alapján a saját felterjesztésedet nem hagyhatod jóvá!"
                                  : "Saját felterjesztés - Egyfelhasználós módban kijelölhető és jóváhagyható"
                                : "Kijelölés jóváhagyásra"
                            }
                            onCheckedChange={() => toggleApproval(item.id)}
                          />
                        </TableCell>
                        {isColVisible("iktatoszam") && (
                          <TableCell className="font-medium">
                            <Link href={`/dossiers/${item.id}`} className="text-primary hover:underline font-mono">
                              {item.iktatoszam}
                            </Link>
                          </TableCell>
                        )}
                        {isColVisible("targy") && <TableCell className="text-sm">{item.ugy?.targy}</TableCell>}
                        {isColVisible("felterjeszto") && (
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-foreground">{item.javaslattevo_nev || "Iratkezelő"}</span>
                              {isSelfProposed && (
                                fourEyesRequired ? (
                                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] py-0 px-1.5 font-normal">
                                    Saját felterjesztés (Zárolva)
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] py-0 px-1.5 font-normal">
                                    Saját felterjesztés (Jóváhagyható)
                                  </Badge>
                                )
                              )}
                            </div>
                          </TableCell>
                        )}
                        {isColVisible("iratok") && (
                          <TableCell className="text-center text-xs font-mono">
                            {item.irat?.[0]?.count ?? 1} db
                          </TableCell>
                        )}
                        {isColVisible("megorzes") && (
                          <TableCell className="text-xs font-mono">
                            {item.megorzesi_ido_vege ? new Date(item.megorzesi_ido_vege).toLocaleDateString("hu-HU") : "-"}
                          </TableCell>
                        )}
                        {isColVisible("intezkedes") && (
                          <TableCell>
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[11px]">
                              Vezetői jóváhagyásra vár
                            </Badge>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={visibleColumnsCount + 1} className="text-center py-12 text-muted-foreground">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                      Nincsenek a feltételeknek megfelelő jóváhagyásra váró selejtezési javaslatok.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 3. IRATTÁRBAN FÜL */}
        <TabsContent value="archived" className="mt-4">
          <div className="border border-border/50 rounded-md bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {isColVisible("iktatoszam") && <TableHead>Iktatószám</TableHead>}
                  {isColVisible("targy") && <TableHead>Ügy Tárgya</TableHead>}
                  {isColVisible("intezkedes") && <TableHead>Státusz</TableHead>}
                  {isColVisible("iratok") && <TableHead className="text-center">Iratok</TableHead>}
                  {isColVisible("megorzes") && <TableHead>Megőrzés Vége</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArchived.length > 0 ? (
                  filteredArchived.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                      {isColVisible("iktatoszam") && (
                        <TableCell className="font-medium">
                          <Link href={`/dossiers/${item.id}`} className="text-primary hover:underline font-mono">
                            {item.iktatoszam}
                          </Link>
                        </TableCell>
                      )}
                      {isColVisible("targy") && <TableCell className="text-sm">{item.ugy?.targy}</TableCell>}
                      {isColVisible("intezkedes") && (
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {item.statusz === "irattarban" ? "Irattározva" : "Lezárva"}
                          </Badge>
                        </TableCell>
                      )}
                      {isColVisible("iratok") && (
                        <TableCell className="text-center text-xs font-mono">
                          {item.irat?.[0]?.count ?? 1} db
                        </TableCell>
                      )}
                      {isColVisible("megorzes") && (
                        <TableCell className="text-xs font-mono">
                          {item.megorzesi_ido_vege ? new Date(item.megorzesi_ido_vege).toLocaleDateString("hu-HU") : "Folyamatos"}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={visibleColumnsCount} className="text-center py-12 text-muted-foreground">
                      Nincsenek a feltételeknek megfelelő lezárt ügyiratok.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 4. SELEJTEZETT & JEGYZŐKÖNYVEK FÜL */}
        <TabsContent value="scrapped" className="mt-4 space-y-6">
          {/* Csomagok és Hivatalos Jegyzőkönyvek */}
          <div className="border border-border/50 rounded-md bg-card overflow-hidden">
            <div className="p-4 bg-muted/30 border-b border-border/50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold">Hivatalos Selejtezési Jegyzőkönyvek Archívuma</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                A négy-szem elve alapján jóváhagyott, hitelesített és letölthető jegyzőkönyvek.
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Dátum</TableHead>
                  <TableHead className="w-36">Státusz</TableHead>
                  <TableHead className="w-36">Javaslattevő</TableHead>
                  <TableHead className="w-36">Jóváhagyó Vezető</TableHead>
                  <TableHead>Ügyiratszám</TableHead>
                  <TableHead className="w-28 text-center">Érintett Iratok</TableHead>
                  <TableHead className="w-36 text-right">Jegyzőkönyv</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.length > 0 ? (
                  filteredBatches.map((batch) => {
                    const itemCount = batch.selejtezes_tetel?.length || 0
                    const isApproved = batch.statusz === "jovahagyva"

                    // Csak az ügyiratszámokat (iktatószámokat) és iratszámokat gyűjtjük ki
                    const items = batch.selejtezes_tetel || []
                    const iktatoszamok: string[] = []
                    let totalIratokCount = 0

                    items.forEach((t: any) => {
                      if (t.ugyirat?.iktatoszam) {
                        iktatoszamok.push(t.ugyirat.iktatoszam)
                      }
                      const count = t.ugyirat?.irat?.[0]?.count ?? 1
                      totalIratokCount += count
                    })

                    return (
                      <TableRow key={batch.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {new Date(batch.created_at).toLocaleDateString("hu-HU")}
                        </TableCell>
                        <TableCell>
                          {isApproved ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-normal">
                              Jóváhagyva & Archív
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-normal">
                              Jóváhagyásra vár
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-foreground">{batch.javaslattevo_nev}</TableCell>
                        <TableCell className="text-xs font-medium text-muted-foreground">{batch.jovahagyo_nev || "—"}</TableCell>
                        <TableCell className="py-2">
                          {iktatoszamok.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          ) : iktatoszamok.length === 1 ? (
                            <span className="font-mono text-xs font-medium text-foreground">
                              {iktatoszamok[0]}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {iktatoszamok.map((szam) => (
                                <Badge
                                  key={szam}
                                  variant="outline"
                                  className="font-mono text-xs font-medium px-2 py-0.5 bg-muted/50 border-border text-foreground"
                                >
                                  {szam}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {totalIratokCount > 0 ? (
                            <Popover>
                              <PopoverTrigger className="inline-block text-xs font-mono font-medium text-foreground bg-muted/50 hover:bg-muted px-2 py-0.5 rounded cursor-pointer transition-colors border border-border/40">
                                {totalIratokCount} db
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-3 space-y-2 text-left" align="center">
                                <div className="flex items-center justify-between border-b pb-1.5">
                                  <span className="text-xs font-semibold text-foreground">Érintett ügyiratok</span>
                                  <span className="text-[11px] font-mono text-muted-foreground">{items.length} ügyirat ({totalIratokCount} irat)</span>
                                </div>
                                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                  {items.map((t: any, idx: number) => {
                                    const u = t.ugyirat
                                    const iratCount = u?.irat?.[0]?.count ?? 1
                                    return (
                                      <div key={u?.id || idx} className="text-xs flex items-center justify-between gap-2 py-1 px-1.5 rounded hover:bg-muted/40">
                                        <div className="min-w-0">
                                          <span className="font-mono font-medium text-foreground block truncate">{u?.iktatoszam || "—"}</span>
                                          <span className="text-muted-foreground text-[11px] block truncate">{u?.ugy?.targy || "Nincs tárgy"}</span>
                                        </div>
                                        <span className="text-[11px] font-mono text-muted-foreground shrink-0">{iratCount} irat</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <span className="text-xs font-mono text-muted-foreground">0 db</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {batch.jegyzokonyv_path ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1.5"
                              disabled={downloadingBatchId === batch.id}
                              onClick={() => handleDownloadSavedBatch(batch)}
                            >
                              <Download className="w-3.5 h-3.5" />
                              {downloadingBatchId === batch.id ? "Letöltés..." : "Jegyzőkönyv (PDF)"}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Nincs PDF</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                      Nem található selejtezési jegyzőkönyv a keresési feltételekkel.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Megsemmisített ügyiratok táblázata */}
          <div className="border border-border/50 rounded-md bg-card overflow-hidden">
            <div className="p-4 bg-muted/30 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-destructive" />
                <h2 className="text-sm font-semibold">Megsemmisített Ügyiratok Nyilvántartása</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Az alábbi ügyiratok digitális fizikai állományai véglegesen törölve lettek, az eseménynapló rögzítve van.
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  {isColVisible("iktatoszam") && <TableHead className="w-48">Iktatószám</TableHead>}
                  {isColVisible("targy") && <TableHead>Ügy Tárgya</TableHead>}
                  {isColVisible("intezkedes") && <TableHead className="w-44">Státusz</TableHead>}
                  <TableHead className="w-44">Fizikai Állományok</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScrapped.length > 0 ? (
                  filteredScrapped.map((item) => (
                    <TableRow key={item.id} className="opacity-75 hover:opacity-100 transition-opacity">
                      {isColVisible("iktatoszam") && (
                        <TableCell className="font-mono font-medium line-through text-muted-foreground text-xs">
                          {item.iktatoszam}
                        </TableCell>
                      )}
                      {isColVisible("targy") && (
                        <TableCell className="text-muted-foreground text-xs truncate max-w-sm">{item.ugy?.targy || "Nincs tárgy"}</TableCell>
                      )}
                      {isColVisible("intezkedes") && (
                        <TableCell>
                          <Badge variant="destructive" className="text-xs font-normal">Véglegesen selejtezve</Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-muted-foreground text-xs font-mono">Fájlok megsemmisítve</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={visibleColumnsCount + 1} className="text-center py-8 text-muted-foreground text-xs">
                      Nem található megsemmisített ügyirat.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* SIKERES SELEJTEZÉS & JEGYZŐKÖNYV MODAL */}
      <Dialog open={protocolOpen} onOpenChange={setProtocolOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              Sikeres Selejtezés és Hitelesítés
            </DialogTitle>
            <DialogDescription>
              A hivatalos selejtezési folyamat befejeződött, a jegyzőkönyv kiállítva.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3 text-sm">
            <div className="p-3 bg-muted/40 rounded border border-border/50 space-y-1 font-mono text-xs">
              <p><span className="text-muted-foreground">Jegyzőkönyv száma:</span> <span className="font-bold text-foreground">{protocolData?.protocolNumber}</span></p>
              <p><span className="text-muted-foreground">Dátum:</span> {protocolData?.date}</p>
              <p><span className="text-muted-foreground">Javaslattevő:</span> {protocolData?.proposer}</p>
              <p><span className="text-muted-foreground">Jóváhagyó vezető:</span> {protocolData?.approver}</p>
              <p><span className="text-muted-foreground">Érintett ügyiratok:</span> {protocolData?.items?.length || 0} db</p>
            </div>
            <p className="text-xs text-muted-foreground">
              A generált hivatalos PDF jegyzőkönyv automatikusan letöltésre került és elmentődött a rendszer belső archívumában. Bármikor újraletölthető a "Selejtezett & Jegyzőkönyvek" fülről.
            </p>
          </div>

          <DialogFooter className="pt-2 border-t flex sm:justify-between">
            <Button variant="outline" onClick={() => setProtocolOpen(false)}>
              Bezárás
            </Button>
            {protocolData?.pdfBase64 && (
              <Button
                onClick={() => {
                  const byteCharacters = atob(protocolData.pdfBase64)
                  const byteNumbers = new Array(byteCharacters.length)
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i)
                  }
                  const byteArray = new Uint8Array(byteNumbers)
                  const blob = new Blob([byteArray], { type: "application/pdf" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `Selejtezesi_Jegyzokonyv_${(protocolData.protocolNumber || "SELEJT").replace(/\//g, "-")}.pdf`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                }}
                className="gap-2 bg-primary"
              >
                <Download className="w-4 h-4" />
                PDF Újraletöltése
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* JÓVÁHAGYÁSI MEGERŐSÍTŐ MODAL */}
      <Dialog open={approvePromptOpen} onOpenChange={setApprovePromptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {fourEyesRequired
                ? "Selejtezés Jóváhagyása (Szigorú Négy-szem elve)"
                : "Selejtezés Jóváhagyása (Egyfelhasználós eljárás)"}
            </DialogTitle>
            <DialogDescription>
              {fourEyesRequired
                ? "Kérlek, add meg az intézményvezető vagy a selejtezési bizottság elnökének nevét a jegyzőkönyv hitelesítéséhez."
                : "A négyszem-elv fel van oldva. Vezetői jóváhagyásként a felterjesztő saját jóváhagyása is engedélyezett egyetlen lépésben."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approver-name">Jóváhagyó Vezető Neve</Label>
              <Input
                id="approver-name"
                placeholder="pl. Dr. Kiss László"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                {fourEyesRequired
                  ? "Figyelem: A szigorú négy-szem elve értelmében a jóváhagyó nem egyezhet meg az ügyiratot felterjesztő munkatárssal."
                  : "Infó: A rendszer egyfelhasználós / KKV módban fut, a felterjesztő és jóváhagyó azonossága a hivatalos jegyzőkönyvben és az eseménynaplóban rögzítésre kerül."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovePromptOpen(false)} disabled={loading}>
              Mégsem
            </Button>
            <Button onClick={handleApprove} disabled={loading || !approverName.trim()}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Jegyzőkönyvezés...
                </div>
              ) : (
                "Jóváhagyás és PDF Kiállítás"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
