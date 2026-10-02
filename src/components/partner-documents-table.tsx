"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Eye,
  ArrowDownLeft,
  ArrowUpRight,
  FolderOpen,
  FileText,
  ExternalLink,
  Folder,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { DocumentViewer } from "@/components/document-viewer"
import { StatusBadge } from "@/components/status-badge"
import {
  TableToolbar,
  TableColumnOption,
  FilterGroup,
  DateRangeFilter,
} from "@/components/table-toolbar/table-toolbar"

export interface PartnerDocItem {
  id: string
  targy: string
  erkeztetoszam?: string | null
  alszam?: number | null
  erkezes_datuma?: string | null
  erkezes_modja?: string | null
  ugyirat_id?: string | null
  irany?: "bejovo" | "kimeno" | string | null
  minosites?: string | null
  leiras?: string | null
  statusz?: string | null
  irat_fajl?: Array<{
    id: string
    storage_path: string
    eredeti_fajlnev: string
    meret_byte?: number
    mime_type?: string
    sha256?: string
    pdfa_path?: string | null
  }>
  ugyirat?: {
    id: string
    iktatoszam: string
    iktatas_datuma?: string | null
    statusz?: string | null
    helye?: string | null
    ugy?: {
      id?: string
      ugyszam?: string | null
      targy?: string | null
      hatarido?: string | null
      statusz?: string | null
    } | null
  } | Array<{
    id: string
    iktatoszam: string
    iktatas_datuma?: string | null
    statusz?: string | null
    helye?: string | null
    ugy?: {
      id?: string
      ugyszam?: string | null
      targy?: string | null
      hatarido?: string | null
      statusz?: string | null
    } | null
  }> | null
}

const DEFAULT_COLUMNS: TableColumnOption[] = [
  { id: "irany", label: "Irány", isVisible: true },
  { id: "azonosito", label: "Azonosító", isVisible: true },
  { id: "targy", label: "Tárgy", isVisible: true },
  { id: "ugyirat", label: "Ügyirat", isVisible: true },
  { id: "datum", label: "Dátum", isVisible: true },
  { id: "muveletek", label: "Műveletek", isVisible: true },
]

interface PartnerDocumentsTableProps {
  documents: PartnerDocItem[]
  partnerName: string
  currentUserClearance?: string
  isAdmin?: boolean
}

export function PartnerDocumentsTable({
  documents = [],
  partnerName,
  currentUserClearance = "nyilt",
  isAdmin = false,
}: PartnerDocumentsTableProps) {
  // Szűrési állapotok a szabványos TableToolbarhoz
  const [search, setSearch] = useState("")
  const [columns, setColumns] = useState<TableColumnOption[]>(DEFAULT_COLUMNS)
  const [selectedDirections, setSelectedDirections] = useState<string[]>([])
  const [selectedFiling, setSelectedFiling] = useState<string[]>([])
  const [selectedMinosites, setSelectedMinosites] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // Gyors megtekintés modálok állapotai
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerFile, setViewerFile] = useState<any | null>(null)
  const [viewerIratId, setViewerIratId] = useState<string>("")

  const [dossierModalOpen, setDossierModalOpen] = useState(false)
  const [selectedDossier, setSelectedDossier] = useState<any | null>(null)

  const [docDetailsModalOpen, setDocDetailsModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<PartnerDocItem | null>(null)

  const minositesHierarchy: Record<string, number> = {
    nyilt: 1,
    belso: 2,
    bizalmas: 3,
    szigoruan_bizalmas: 4,
  }

  const checkClearance = (docMinosites?: string | null) => {
    if (isAdmin) return true
    const userLvl = minositesHierarchy[currentUserClearance] || 1
    const docLvl = minositesHierarchy[docMinosites || "nyilt"] || 1
    return userLvl >= docLvl
  }

  // Oszlop láthatóság
  const handleToggleColumn = (id: string) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isVisible: !c.isVisible } : c))
    )
  }

  const isColVisible = (id: string) => {
    return columns.find((c) => c.id === id)?.isVisible ?? true
  }

  // Szűrők törlése
  const handleClearFilters = () => {
    setSearch("")
    setSelectedDirections([])
    setSelectedFiling([])
    setSelectedMinosites([])
    setDateFrom("")
    setDateTo("")
  }

  // Szűrőcsoportok a TableToolbarhoz (jobb oldali Szűrés Popover)
  const filterGroups: FilterGroup[] = [
    {
      id: "irany",
      title: "Irat iránya",
      options: [
        { id: "bejovo", label: "Bejövő iratok", checked: selectedDirections.includes("bejovo") },
        { id: "kimeno", label: "Kimenő iratok", checked: selectedDirections.includes("kimeno") },
      ],
      onToggle: (optId) => {
        setSelectedDirections((prev) =>
          prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
        )
      },
    },
    {
      id: "iktatas",
      title: "Iktatási állapot",
      options: [
        { id: "iktatott", label: "Iktatott iratok", checked: selectedFiling.includes("iktatott") },
        { id: "iktatlan", label: "Iktatlan iratok", checked: selectedFiling.includes("iktatlan") },
      ],
      onToggle: (optId) => {
        setSelectedFiling((prev) =>
          prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
        )
      },
    },
    {
      id: "minosites",
      title: "Biztonsági minősítés",
      options: [
        { id: "nyilt", label: "Nyílt", checked: selectedMinosites.includes("nyilt") },
        { id: "belso", label: "Belső", checked: selectedMinosites.includes("belso") },
        { id: "bizalmas", label: "Bizalmas", checked: selectedMinosites.includes("bizalmas") },
        { id: "szigoruan_bizalmas", label: "Szigorúan bizalmas", checked: selectedMinosites.includes("szigoruan_bizalmas") },
      ],
      onToggle: (optId) => {
        setSelectedMinosites((prev) =>
          prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
        )
      },
    },
  ]

  const dateRange: DateRangeFilter = {
    from: dateFrom,
    to: dateTo,
    onFromChange: setDateFrom,
    onToChange: setDateTo,
  }

  const activeFiltersCount =
    selectedDirections.length +
    selectedFiling.length +
    selectedMinosites.length

  const hasActiveFilters =
    activeFiltersCount > 0 || !!dateFrom || !!dateTo || search.trim() !== ""

  // Szűrt iratok kiszámítása
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      // 1. Irány szűrés
      const isIncoming = doc.irany === "bejovo" || !doc.irany
      if (selectedDirections.length > 0) {
        const matchesDirection =
          (selectedDirections.includes("bejovo") && isIncoming) ||
          (selectedDirections.includes("kimeno") && !isIncoming)
        if (!matchesDirection) return false
      }

      // 2. Iktatási státusz szűrés
      const isFiled = !!doc.ugyirat_id
      if (selectedFiling.length > 0) {
        const matchesFiling =
          (selectedFiling.includes("iktatott") && isFiled) ||
          (selectedFiling.includes("iktatlan") && !isFiled)
        if (!matchesFiling) return false
      }

      // 3. Minősítés szűrés
      if (selectedMinosites.length > 0) {
        const docMin = doc.minosites || "nyilt"
        if (!selectedMinosites.includes(docMin)) return false
      }

      // 4. Dátum szűrés
      if (dateFrom && doc.erkezes_datuma) {
        if (new Date(doc.erkezes_datuma) < new Date(dateFrom)) return false
      }
      if (dateTo && doc.erkezes_datuma) {
        const endOfDay = new Date(dateTo)
        endOfDay.setHours(23, 59, 59, 999)
        if (new Date(doc.erkezes_datuma) > endOfDay) return false
      }

      // 5. Keresés
      if (search.trim()) {
        const query = search.toLowerCase().trim()
        const ugyiratObj = Array.isArray(doc.ugyirat) ? doc.ugyirat[0] : doc.ugyirat
        const iktatoszam = ugyiratObj?.iktatoszam || ""
        const erkeztetoszam = doc.erkeztetoszam || ""
        const targy = doc.targy || ""
        const ugyTargy = ugyiratObj?.ugy?.targy || ""

        const matches =
          targy.toLowerCase().includes(query) ||
          erkeztetoszam.toLowerCase().includes(query) ||
          iktatoszam.toLowerCase().includes(query) ||
          ugyTargy.toLowerCase().includes(query)

        if (!matches) return false
      }

      return true
    })
  }, [documents, search, selectedDirections, selectedFiling, selectedMinosites, dateFrom, dateTo])

  // Fájl / Irat gyors megtekintése
  const handleQuickViewDoc = (doc: PartnerDocItem) => {
    if (!checkClearance(doc.minosites)) {
      toast.error(
        `Hozzáférés megtagadva: A te biztonsági szinteddel (${currentUserClearance}) ez a bizalmas irat nem tekinthető meg.`
      )
      return
    }

    const files = doc.irat_fajl || []
    if (files.length > 0) {
      const pdfFile = files.find(
        (f) =>
          f.mime_type === "application/pdf" ||
          (f.eredeti_fajlnev && f.eredeti_fajlnev.toLowerCase().endsWith(".pdf"))
      )
      const selected = pdfFile || files[0]
      setViewerFile(selected)
      setViewerIratId(doc.id)
      setViewerOpen(true)
    } else {
      setSelectedDoc(doc)
      setDocDetailsModalOpen(true)
    }
  }

  // Ügyirat gyors betekintő megnyitása
  const handleQuickViewDossier = (ugyirat: any) => {
    setSelectedDossier(ugyirat)
    setDossierModalOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* ── 1. SZABVÁNYOS EAISYDOCS TÁBLÁZAT ESZKÖZTÁR (Kereső balra, Oszlopok + Szűrés gomb jobbra) ── */}
      <TableToolbar
        searchPlaceholder="Keresés tárgy, iktatószám vagy érkeztetőszám szerint..."
        searchValue={search}
        onSearchChange={setSearch}
        columns={columns}
        onToggleColumn={handleToggleColumn}
        filterGroups={filterGroups}
        dateRange={dateRange}
        activeFiltersCount={activeFiltersCount}
        onClearFilters={handleClearFilters}
        actions={
          hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X className="h-3.5 w-3.5" />
              <span>Szűrők törlése</span>
            </Button>
          ) : undefined
        }
      />

      {/* ── 2. TÁBLÁZAT ── */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {isColVisible("irany") && <TableHead className="w-[100px]">Irány</TableHead>}
              {isColVisible("azonosito") && <TableHead className="w-[180px]">Azonosító</TableHead>}
              {isColVisible("targy") && <TableHead>Tárgy</TableHead>}
              {isColVisible("ugyirat") && <TableHead className="w-[220px]">Ügyirat</TableHead>}
              {isColVisible("datum") && <TableHead className="text-right w-[110px]">Dátum</TableHead>}
              {isColVisible("muveletek") && (
                <TableHead className="text-right w-[120px]">Műveletek</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocs.length > 0 ? (
              filteredDocs.map((irat) => {
                const isIncoming = irat.irany === "bejovo" || !irat.irany
                const ugyirat = Array.isArray(irat.ugyirat) ? irat.ugyirat[0] : irat.ugyirat
                const iktatoszam = ugyirat?.iktatoszam
                  ? irat.alszam
                    ? `${ugyirat.iktatoszam}/${irat.alszam}`
                    : ugyirat.iktatoszam
                  : null
                const hasFile = (irat.irat_fajl || []).length > 0

                return (
                  <TableRow key={`irat-${irat.id}`} className="hover:bg-muted/40 transition-colors group">
                    {/* Irány */}
                    {isColVisible("irany") && (
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium",
                            isIncoming
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          )}
                        >
                          {isIncoming ? (
                            <>
                              <ArrowDownLeft className="h-3 w-3" /> Bejövő
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-3 w-3" /> Kimenő
                            </>
                          )}
                        </span>
                      </TableCell>
                    )}

                    {/* Azonosító */}
                    {isColVisible("azonosito") && (
                      <TableCell className="font-mono text-xs font-semibold">
                        {iktatoszam ? (
                          <Link href={`/inbox/${irat.id}`} className="hover:underline text-foreground">
                            {iktatoszam}
                          </Link>
                        ) : irat.erkeztetoszam ? (
                          <Link href={`/inbox/${irat.id}`} className="hover:underline text-primary">
                            {irat.erkeztetoszam}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}

                    {/* Tárgy */}
                    {isColVisible("targy") && (
                      <TableCell className="text-sm font-medium text-foreground">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{irat.targy}</span>
                          {hasFile && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 bg-muted text-muted-foreground rounded font-mono"
                              title={`${irat.irat_fajl?.length} csatolt fájl`}
                            >
                              <FileText className="h-2.5 w-2.5" />
                              {irat.irat_fajl?.[0]?.eredeti_fajlnev.split(".").pop()?.toUpperCase() || "FÁJL"}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )}

                    {/* Ügyirat (Gyors megtekintés gombbal az ügyiratokhoz) */}
                    {isColVisible("ugyirat") && (
                      <TableCell className="text-xs">
                        {irat.ugyirat_id && ugyirat ? (
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/dossiers/${irat.ugyirat_id}`}
                              className="text-primary hover:underline font-mono font-medium truncate max-w-[130px]"
                              title={`Ügyirat: ${ugyirat.iktatoszam}`}
                            >
                              {ugyirat.iktatoszam}
                            </Link>
                            {/* Ügyirat gyors betekintő gomb */}
                            <button
                              type="button"
                              onClick={() => handleQuickViewDossier(ugyirat)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/40 shrink-0"
                              title="Ügyirat gyors betekintő"
                            >
                              <Eye className="h-3 w-3 text-primary" />
                              <span>Betekintés</span>
                            </button>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                            Iktatlan
                          </Badge>
                        )}
                      </TableCell>
                    )}

                    {/* Dátum */}
                    {isColVisible("datum") && (
                      <TableCell className="text-right text-xs text-muted-foreground font-mono tabular-nums">
                        {irat.erkezes_datuma ? new Date(irat.erkezes_datuma).toLocaleDateString("hu-HU") : "—"}
                      </TableCell>
                    )}

                    {/* Műveletek (Gyors megtekintés + Megnyitás) */}
                    {isColVisible("muveletek") && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Gyors megtekintés gomb */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => handleQuickViewDoc(irat)}
                            title={hasFile ? "Dokumentum / Fájl gyors megtekintése" : "Irat adatlap gyors megtekintése"}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {/* Teljes irat megnyitása */}
                          <Button
                            variant="ghost"
                            size="icon"
                            render={<Link href={`/inbox/${irat.id}`} />}
                            nativeButton={false}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors"
                            title="Irat megnyitása az iktatóban"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.filter((c) => c.isVisible).length || 6}
                  className="h-32 text-center text-muted-foreground text-xs"
                >
                  <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {hasActiveFilters
                    ? "Nincs a megadott szűrési feltételeknek megfelelő irat."
                    : "Nem található a partnerhez rendelt irat."}
                  {hasActiveFilters && (
                    <div className="mt-2">
                      <Button variant="outline" size="sm" onClick={handleClearFilters} className="text-xs h-7">
                        Szűrők törlése
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── 1. FÁJL ELŐNÉZET MODÁL (DocumentViewer) ── */}
      {viewerFile && (
        <DocumentViewer
          open={viewerOpen}
          setOpen={setViewerOpen}
          fajl={viewerFile}
          iratId={viewerIratId}
        />
      )}

      {/* ── 2. ÜGYIRAT GYORS BETEKINTŐ MODÁL ── */}
      <Dialog open={dossierModalOpen} onOpenChange={setDossierModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Folder className="h-4 w-4 text-primary" />
              <DialogTitle className="text-base font-semibold font-mono">
                {selectedDossier?.iktatoszam || "Ügyirat részletei"}
              </DialogTitle>
              {selectedDossier?.statusz && <StatusBadge status={selectedDossier.statusz} />}
            </div>
            <DialogDescription className="text-xs">
              Az ügyirathoz tartozó legfontosabb iktatási és ügykezelési információk.
            </DialogDescription>
          </DialogHeader>

          {selectedDossier && (
            <div className="space-y-3.5 text-xs py-2">
              {/* Ügy tárgya */}
              <div className="p-3 bg-muted/40 border border-border/60 rounded-md">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Ügy Tárgya:
                </span>
                <p className="text-sm font-medium text-foreground">
                  {selectedDossier.ugy?.targy || "Nincs megadva tárgy"}
                </p>
                {selectedDossier.ugy?.ugyszam && (
                  <p className="text-[11px] font-mono text-muted-foreground mt-1">
                    Ügyszám: {selectedDossier.ugy.ugyszam}
                  </p>
                )}
              </div>

              {/* Részletek rács */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-muted/20 border border-border/40 rounded">
                  <span className="text-muted-foreground block mb-0.5">Iktatás dátuma:</span>
                  <span className="font-semibold tabular-nums">
                    {selectedDossier.iktatas_datuma
                      ? new Date(selectedDossier.iktatas_datuma).toLocaleDateString("hu-HU")
                      : "—"}
                  </span>
                </div>
                <div className="p-2.5 bg-muted/20 border border-border/40 rounded">
                  <span className="text-muted-foreground block mb-0.5">Határidő:</span>
                  <span className="font-semibold tabular-nums">
                    {selectedDossier.ugy?.hatarido
                      ? new Date(selectedDossier.ugy.hatarido).toLocaleDateString("hu-HU")
                      : "Nincs határidő"}
                  </span>
                </div>
                <div className="p-2.5 bg-muted/20 border border-border/40 rounded col-span-2">
                  <span className="text-muted-foreground block mb-0.5">Irattári őrzési hely / doboz:</span>
                  <span className="font-semibold">
                    {selectedDossier.helye || "Központi digitális irattár"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t border-border/40">
            <Button variant="ghost" size="sm" onClick={() => setDossierModalOpen(false)}>
              Bezárás
            </Button>
            {selectedDossier?.id && (
              <Button
                variant="default"
                size="sm"
                render={<Link href={`/dossiers/${selectedDossier.id}`} />}
                nativeButton={false}
                className="gap-1.5"
              >
                <span>Ügyirat teljes megnyitása</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 3. IRAT ADATLAP GYORS BETEKINTŐ MODÁL (fájl nélküli vagy részletes nézet) ── */}
      <Dialog open={docDetailsModalOpen} onOpenChange={setDocDetailsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-primary" />
              <DialogTitle className="text-base font-semibold">
                {selectedDoc?.erkeztetoszam || "Irat gyors adatlap"}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Az irat iktatási adatai és kapcsolatai.
            </DialogDescription>
          </DialogHeader>

          {selectedDoc && (
            <div className="space-y-3 text-xs py-2">
              <div className="p-3 bg-muted/40 border border-border/60 rounded-md">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Tárgy:
                </span>
                <p className="text-sm font-medium text-foreground">{selectedDoc.targy}</p>
                {selectedDoc.leiras && (
                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/40">
                    {selectedDoc.leiras}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-muted/20 border border-border/40 rounded">
                  <span className="text-muted-foreground block">Partner:</span>
                  <span className="font-semibold">{partnerName}</span>
                </div>
                <div className="p-2 bg-muted/20 border border-border/40 rounded">
                  <span className="text-muted-foreground block">Irány:</span>
                  <span className="font-semibold capitalize">
                    {selectedDoc.irany === "kimeno" ? "Kimenő" : "Bejövő"}
                  </span>
                </div>
                <div className="p-2 bg-muted/20 border border-border/40 rounded">
                  <span className="text-muted-foreground block">Érkezés dátuma:</span>
                  <span className="font-semibold tabular-nums">
                    {selectedDoc.erkezes_datuma
                      ? new Date(selectedDoc.erkezes_datuma).toLocaleDateString("hu-HU")
                      : "—"}
                  </span>
                </div>
                <div className="p-2 bg-muted/20 border border-border/40 rounded">
                  <span className="text-muted-foreground block">Minősítés:</span>
                  <span className="font-semibold capitalize">{selectedDoc.minosites || "Nyílt"}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t border-border/40">
            <Button variant="ghost" size="sm" onClick={() => setDocDetailsModalOpen(false)}>
              Bezárás
            </Button>
            {selectedDoc?.id && (
              <Button
                variant="default"
                size="sm"
                render={<Link href={`/inbox/${selectedDoc.id}`} />}
                nativeButton={false}
                className="gap-1.5"
              >
                <span>Megnyitás az iktatóban</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
