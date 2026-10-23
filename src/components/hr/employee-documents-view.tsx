"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { KpiCard } from "@/components/kpi-card"
import { TableToolbar, FilterGroup } from "@/components/table-toolbar/table-toolbar"
import { DocumentViewer } from "@/components/document-viewer"
import { 
  FileText, 
  CheckCircle2, 
  Download, 
  Eye, 
  ExternalLink, 
  FolderArchive,
  Calendar
} from "lucide-react"
import Link from "next/link"

export type HrDocument = {
  id: string
  dolgozo_id: string
  nev: string
  kategoria?: string | null
  url?: string | null
  created_at: string
  irat_id?: string | null
  ugyirat_id?: string | null
  iktatoszam?: string | null
  iktatva_ekor?: string | null
  alairt_fajl_url?: string | null
  alairva_ekor?: string | null
  alairas_statusz?: string | null
  alairo_neve?: string | null
  company_id?: string | null
  displayUrl?: string | null
  signedUrl?: string | null
}

interface EmployeeDocumentsViewProps {
  documents: HrDocument[]
}

export function EmployeeDocumentsView({ documents }: EmployeeDocumentsViewProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [onlyFiled, setOnlyFiled] = useState(false)
  const [onlySigned, setOnlySigned] = useState(false)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // DocumentViewer modál állapota
  const [selectedDoc, setSelectedDoc] = useState<HrDocument | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)

  // Kategóriák gyűjtése a dokumentumokból
  const categories = useMemo(() => {
    const cats = new Set<string>()
    documents.forEach((d) => {
      if (d.kategoria) cats.add(d.kategoria)
    })
    return Array.from(cats).sort()
  }, [documents])

  // Szűrt dokumentumok listája
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // 1. Szöveges keresés (név, kategória, iktatószám)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchesName = doc.nev?.toLowerCase().includes(term)
        const matchesCategory = doc.kategoria?.toLowerCase().includes(term)
        const matchesIktatoszam = doc.iktatoszam?.toLowerCase().includes(term)
        if (!matchesName && !matchesCategory && !matchesIktatoszam) {
          return false
        }
      }

      // 2. Kategória többes kijelölés
      if (selectedCategories.length > 0 && (!doc.kategoria || !selectedCategories.includes(doc.kategoria))) {
        return false
      }

      // 3. Csak iktatott iratok
      if (onlyFiled && !doc.iktatoszam) {
        return false
      }

      // 4. Csak aláírt iratok
      if (onlySigned && !(doc.alairt_fajl_url || doc.alairas_statusz === "alairva")) {
        return false
      }

      // 5. Dátum tól / ig
      if (dateFrom && new Date(doc.created_at) < new Date(dateFrom)) {
        return false
      }
      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        if (new Date(doc.created_at) > toDate) {
          return false
        }
      }

      return true
    })
  }, [documents, searchTerm, selectedCategories, onlyFiled, onlySigned, dateFrom, dateTo])

  // KPI statisztikák
  const totalCount = documents.length
  const filedCount = documents.filter((d) => Boolean(d.iktatoszam)).length
  const signedCount = documents.filter((d) => Boolean(d.alairt_fajl_url || d.alairas_statusz === "alairva")).length
  const latestDocDate = documents[0]?.created_at
    ? new Date(documents[0].created_at).toLocaleDateString("hu-HU", { month: "short", day: "numeric" })
    : "–"

  const activeFiltersCount =
    selectedCategories.length +
    (onlyFiled ? 1 : 0) +
    (onlySigned ? 1 : 0)

  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedCategories([])
    setOnlyFiled(false)
    setOnlySigned(false)
    setDateFrom("")
    setDateTo("")
  }

  // Szűrőcsoportok a kanonikus TableToolbar Popoverhez
  const filterGroups: FilterGroup[] = useMemo(() => [
    {
      id: "statusz",
      title: "Irat státusza",
      options: [
        { id: "iktatott", label: "Csak iktatott iratok", checked: onlyFiled },
        { id: "alairt", label: "Csak aláírt példányok", checked: onlySigned },
      ],
      onToggle: (id) => {
        if (id === "iktatott") setOnlyFiled((prev) => !prev)
        if (id === "alairt") setOnlySigned((prev) => !prev)
      },
    },
    {
      id: "kategoriak",
      title: "Dokumentum kategória",
      options: categories.map((cat) => ({
        id: cat,
        label: `${cat} (${documents.filter((d) => d.kategoria === cat).length})`,
        checked: selectedCategories.includes(cat),
      })),
      onToggle: (catId) => {
        setSelectedCategories((prev) =>
          prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
        )
      },
    },
  ], [categories, documents, onlyFiled, onlySigned, selectedCategories])

  const getDownloadUrl = (doc: HrDocument) => {
    if (doc.displayUrl) return doc.displayUrl
    if (doc.signedUrl) return doc.signedUrl
    const rawPath = doc.alairt_fajl_url || doc.url
    if (!rawPath) return null
    if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
      return rawPath
    }
    return `/api/hr/download-document?path=${encodeURIComponent(rawPath)}&bucket=irat_files`
  }

  const handleOpenPreview = (doc: HrDocument) => {
    setSelectedDoc(doc)
    setViewerOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* 1. Statisztikai KPI sáv (ADR A-029 Linear-flat KpiCard) */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Összes Irat"
          value={`${totalCount} db`}
          sub="Személyi irattárban"
        />
        <KpiCard
          label="Hivatalosan Iktatva"
          value={`${filedCount} db`}
          sub="eaisyDocs iktatószámmal"
        />
        <KpiCard
          label="Aláírt Példányok"
          value={`${signedCount} db`}
          sub="Hitelesített másolat"
        />
        <KpiCard
          label="Legutóbbi Irat"
          value={latestDocDate}
          sub={documents[0]?.kategoria || "–"}
        />
      </div>

      {/* 2. Kanonikus TableToolbar: Keresés és Szűrés Popover (ADR A-029) */}
      <TableToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Keresés iratnév, kategória vagy iktatószám alapján..."
        dateRange={{
          from: dateFrom,
          to: dateTo,
          onFromChange: setDateFrom,
          onToChange: setDateTo,
        }}
        filterGroups={filterGroups}
        activeFiltersCount={activeFiltersCount}
        onClearFilters={handleClearFilters}
      />

      {/* 3. Dokumentumok Kártyás Listája (Idővonal stílusban) */}
      <div className="space-y-3">
        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FolderArchive className="w-10 h-10 mb-3 opacity-40" />
              <p className="font-medium text-base text-foreground">Nem található dokumentum</p>
              <p className="text-xs mt-1">Próbáld meg módosítani a keresési feltételeket vagy a szűrőket.</p>
              {activeFiltersCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="mt-4 text-xs"
                >
                  Szűrők törlése
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredDocuments.map((doc) => {
            const downloadUrl = getDownloadUrl(doc)
            const hasFile = Boolean(doc.url || doc.alairt_fajl_url)
            const isSigned = Boolean(doc.alairt_fajl_url || doc.alairas_statusz === "alairva")

            return (
              <Card key={doc.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Bal oldal: ikon + adatok */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-1.5 flex-1">
                      {/* Cím és jelvények sora */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                          {doc.nev}
                        </h3>
                        {doc.iktatoszam ? (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs font-medium">
                            Iktatva: {doc.iktatoszam}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground bg-muted/40 font-normal">
                            Belső HR vázlat
                          </Badge>
                        )}
                        {isSigned ? (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs gap-1 font-medium">
                            <CheckCircle2 className="w-3 h-3 text-primary" />
                            Aláírt példány
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground bg-muted/20 font-normal">
                            Tervezet
                          </Badge>
                        )}
                      </div>

                      {/* Kategória felirat */}
                      <p className="text-xs text-muted-foreground">
                        Kategória: <span className="font-medium text-foreground">{doc.kategoria || "Egyéb"}</span>
                      </p>

                      {/* Dátumok és dosszié link */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Létrehozva: {new Date(doc.created_at).toLocaleDateString("hu-HU")}
                        </span>
                        {doc.iktatva_ekor && (
                          <span>
                            • Iktatás ideje: {new Date(doc.iktatva_ekor).toLocaleDateString("hu-HU")}
                          </span>
                        )}
                        {doc.alairva_ekor && (
                          <span className="text-success font-medium">
                            • Aláírva: {new Date(doc.alairva_ekor).toLocaleDateString("hu-HU")}
                          </span>
                        )}
                        {doc.ugyirat_id && (
                          <Link
                            href={`/dossiers/${doc.ugyirat_id}`}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-medium ml-1"
                            target="_blank"
                          >
                            <ExternalLink className="w-3 h-3" /> Megtekintés dossziéban
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Jobb oldal: Műveleti gombok */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {/* 1. Beépített Gyors Megtekintés (DocumentViewer) */}
                    {hasFile ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenPreview(doc)}
                        className="h-8 text-xs gap-1.5 text-primary hover:text-primary hover:bg-primary/10 font-medium"
                        title="Gyors megtekintés a beépített nézegetőben"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Megtekintés</span>
                      </Button>
                    ) : null}

                    {/* 2. Közvetlen Letöltés */}
                    {downloadUrl ? (
                      <a
                        href={downloadUrl}
                        download={doc.nev || "dokumentum.pdf"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ variant: "ghost", size: "sm", className: "h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground" })}
                        title="Letöltés a saját eszközre"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Letöltés</span>
                      </a>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" disabled>
                        Nincs Fájl
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* 4. Kanonikus beépített DocumentViewer */}
      <DocumentViewer
        open={viewerOpen}
        setOpen={setViewerOpen}
        fajl={selectedDoc ? {
          id: undefined,
          eredeti_fajlnev: selectedDoc.nev,
          nev: selectedDoc.nev,
          kategoria: selectedDoc.kategoria,
          storage_path: selectedDoc.alairt_fajl_url || selectedDoc.url,
          url: selectedDoc.displayUrl || selectedDoc.alairt_fajl_url || selectedDoc.url,
          displayUrl: selectedDoc.displayUrl,
          irat_id: selectedDoc.irat_id,
          ugyirat_id: selectedDoc.ugyirat_id,
          iktatoszam: selectedDoc.iktatoszam
        } : null}
        iratId={selectedDoc?.irat_id || ""}
        dossierId={selectedDoc?.ugyirat_id || ""}
      />
    </div>
  )
}
