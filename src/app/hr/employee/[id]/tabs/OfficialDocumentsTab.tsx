"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, FileCheck, Lock, CheckCircle2, Download } from "lucide-react"
import { TableToolbar, type FilterGroup } from "@/components/table-toolbar/table-toolbar"
import { BatchFileHrDocumentsDialog } from "@/components/hr/batch-file-hr-documents-dialog"
import { ManualUploadDialog } from "@/components/hr/manual-upload-dialog"
import { ContractGeneratorDialog } from "@/components/hr/contract-generator-dialog"
import { JobDescriptionBadgeAction } from "@/components/hr/job-description-badge-action"
import { UploadSignedDocumentDialog } from "@/components/hr/upload-signed-document-dialog"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"
import { FileHrDocumentDialog } from "@/components/hr/file-hr-document-dialog"
import { DeleteContractButton } from "@/components/hr/delete-contract-button"

export interface HrDocumentItem {
  id: string
  dolgozo_id?: string
  nev: string
  kategoria?: string | null
  url?: string | null
  alairt_fajl_url?: string | null
  alairas_statusz?: string | null
  iktatoszam?: string | null
  iktatva_ekor?: string | null
  alairva_ekor?: string | null
  ugyirat_id?: string | null
  created_at: string
  signedUrl?: string | null
  alairtSignedUrl?: string | null
  displayUrl?: string | null
  [key: string]: any
}

interface OfficialDocumentsTabProps {
  employee: any
  adatlap: any
  activeMunkakor: any
  vezetoNev: string
  isHrOrAdmin: boolean
  initialDocuments: HrDocumentItem[]
  latestJobVersion: any
  existingJobDoc: any
}

export function OfficialDocumentsTab({
  employee,
  adatlap,
  activeMunkakor,
  vezetoNev,
  isHrOrAdmin,
  initialDocuments = [],
  latestJobVersion,
  existingJobDoc,
}: OfficialDocumentsTabProps) {
  const [documents, setDocuments] = useState<HrDocumentItem[]>(initialDocuments)
  const [searchValue, setSearchValue] = useState("")
  const [selectedFiling, setSelectedFiling] = useState<string[]>([])
  const [selectedSignature, setSelectedSignature] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  useEffect(() => {
    setDocuments(initialDocuments)
  }, [initialDocuments])

  // Unfiled documents for batch filing
  const unfiled = useMemo(() => {
    return documents.filter((d) => !d.iktatoszam)
  }, [documents])

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>()
    documents.forEach((d) => {
      if (d.kategoria && d.kategoria.trim()) {
        cats.add(d.kategoria.trim())
      }
    })
    return Array.from(cats).sort()
  }, [documents])

  // Filter groups for canonical TableToolbar Popover
  const filterGroups: FilterGroup[] = useMemo(() => {
    const groups: FilterGroup[] = [
      {
        id: "iktatas",
        title: "Iktatási státusz",
        options: [
          { id: "iktatva", label: "Iktatva (eaisyDocs)", checked: selectedFiling.includes("iktatva") },
          { id: "vazlat", label: "Belső HR vázlat", checked: selectedFiling.includes("vazlat") },
        ],
        onToggle: (optId) => {
          setSelectedFiling((prev) =>
            prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
          )
        },
      },
      {
        id: "alairas",
        title: "Aláírási állapot",
        options: [
          { id: "alairva", label: "Aláírt példány", checked: selectedSignature.includes("alairva") },
          { id: "tervezet", label: "Tervezet / Nem aláírt", checked: selectedSignature.includes("tervezet") },
        ],
        onToggle: (optId) => {
          setSelectedSignature((prev) =>
            prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
          )
        },
      },
    ]

    if (categories.length > 0) {
      groups.push({
        id: "kategoria",
        title: "Dokumentum kategória",
        options: categories.map((cat) => ({
          id: cat,
          label: cat,
          checked: selectedCategories.includes(cat),
        })),
        onToggle: (optId: string) => {
          setSelectedCategories((prev) =>
            prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]
          )
        },
      })
    }

    return groups
  }, [categories, selectedFiling, selectedSignature, selectedCategories])

  const activeFiltersCount =
    selectedFiling.length + selectedSignature.length + selectedCategories.length

  const handleClearFilters = () => {
    setSearchValue("")
    setSelectedFiling([])
    setSelectedSignature([])
    setSelectedCategories([])
  }

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // 1. Search text filter
      if (searchValue.trim()) {
        const q = searchValue.toLowerCase().trim()
        const matchName = doc.nev?.toLowerCase().includes(q)
        const matchIktato = doc.iktatoszam?.toLowerCase().includes(q)
        const matchKat = doc.kategoria?.toLowerCase().includes(q)
        if (!matchName && !matchIktato && !matchKat) {
          return false
        }
      }

      // 2. Filing status
      if (selectedFiling.length > 0) {
        const isFiled = !!doc.iktatoszam
        if (selectedFiling.includes("iktatva") && !isFiled) return false
        if (selectedFiling.includes("vazlat") && isFiled) return false
      }

      // 3. Signature status
      if (selectedSignature.length > 0) {
        const isSigned = !!(doc.alairt_fajl_url || doc.alairas_statusz === "alairva")
        if (selectedSignature.includes("alairva") && !isSigned) return false
        if (selectedSignature.includes("tervezet") && isSigned) return false
      }

      // 4. Category
      if (selectedCategories.length > 0) {
        const cat = doc.kategoria || "Egyéb"
        if (!selectedCategories.includes(cat)) return false
      }

      return true
    })
  }, [documents, searchValue, selectedFiling, selectedSignature, selectedCategories])

  return (
    <div className="space-y-6">
      {/* Fejléc és Műveleti gombok */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Hivatalos Dokumentumok</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Szerződések, nyilatkozatok és jogi iratok idővonala, keresése és generálása.
          </p>
        </div>
        {isHrOrAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            {unfiled.length > 0 && (
              <BatchFileHrDocumentsDialog
                employeeId={employee.id}
                employeeName={employee.nev}
                unfiledDocs={unfiled}
              />
            )}
            <ManualUploadDialog employeeId={employee.id} />
            <ContractGeneratorDialog
              employee={employee}
              adatlap={adatlap}
              munkakor={activeMunkakor}
              vezetoNev={vezetoNev}
            />
          </div>
        )}
      </div>

      {/* Munkaköri leírás verziójelző / átvételi akciókártya */}
      {activeMunkakor && (
        <JobDescriptionBadgeAction
          employeeId={employee.id}
          employeeName={employee.nev}
          munkakor={activeMunkakor}
          latestJobVersion={latestJobVersion}
          existingDoc={existingJobDoc}
          isHrOrAdmin={isHrOrAdmin}
        />
      )}

      {/* Kanonikus TableToolbar keresővel és szűréssel */}
      <div className="bg-card border rounded-lg p-2.5 shadow-2xs space-y-2">
        <TableToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Keresés iratnév, iktatószám vagy kategória alapján..."
          filterGroups={filterGroups}
          activeFiltersCount={activeFiltersCount}
          onClearFilters={handleClearFilters}
          actions={
            <div className="text-xs text-muted-foreground tabular-nums px-2 py-1">
              {searchValue || activeFiltersCount > 0 ? (
                <span>
                  Találatok: <strong className="text-foreground">{filteredDocuments.length}</strong> / {documents.length}
                </span>
              ) : (
                <span>
                  Összesen: <strong className="text-foreground">{documents.length}</strong> dokumentum
                </span>
              )}
            </div>
          }
        />
      </div>

      {/* Dokumentum Idővonal / Lista */}
      <div className="border rounded-lg relative overflow-hidden bg-card">
        {documents.length > 0 && (
          <div className="absolute left-8 top-0 bottom-0 w-px bg-border"></div>
        )}

        <div className="p-6">
          {documents.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-lg bg-muted/10 space-y-1.5">
              <h4 className="text-sm font-medium text-foreground">Még nincsenek hivatalos dokumentumok</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Ehhez a munkatárshoz még nem lett rögzítve, generálva vagy feltöltve hivatalos dokumentum.
              </p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-lg bg-muted/10 space-y-2">
              <h4 className="text-sm font-medium text-foreground">Nincs találat a keresési feltételeknek megfelelően</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                A megadott keresőszóra vagy a kiválasztott szűrőkre nem található dokumentum.
              </p>
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="text-xs h-8">
                Szűrők és keresés törlése
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="flex gap-6 relative">
                  <div
                    className={`w-4 h-4 rounded-full ${
                      doc.iktatoszam ? "bg-success" : "bg-primary"
                    } mt-1 relative z-10 outline outline-4 outline-background`}
                  ></div>
                  <div className="flex-1 border rounded-lg p-4 bg-background hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-foreground">{doc.nev}</h4>
                          {doc.iktatoszam ? (
                            <Badge
                              variant="outline"
                              className="bg-success/10 text-success border-success/20 text-xs font-mono gap-1"
                            >
                              <FileCheck className="w-3 h-3" />
                              Iktatva: {doc.iktatoszam}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground bg-muted/40">
                              Belső HR vázlat
                            </Badge>
                          )}
                          {doc.alairt_fajl_url || doc.alairas_statusz === "alairva" ? (
                            <Badge
                              variant="outline"
                              className="bg-primary/10 text-primary border-primary/20 text-xs gap-1 font-medium"
                            >
                              <CheckCircle2 className="w-3 h-3 text-primary" />
                              Aláírt példány
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground bg-muted/20 font-normal">
                              Tervezet
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">Kategória: {doc.kategoria || "Egyéb"}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span>Létrehozva: {new Date(doc.created_at).toLocaleString("hu-HU")}</span>
                          {doc.iktatva_ekor && (
                            <span>• Iktatás ideje: {new Date(doc.iktatva_ekor).toLocaleString("hu-HU")}</span>
                          )}
                          {doc.alairva_ekor && (
                            <span className="text-success font-medium tabular-nums">
                              • Aláírva: {new Date(doc.alairva_ekor).toLocaleString("hu-HU")}
                            </span>
                          )}
                          {doc.ugyirat_id && (
                            <Link
                              href={`/dossiers/${doc.ugyirat_id}`}
                              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                              target="_blank"
                            >
                              <ExternalLink className="w-3 h-3" /> Megtekintés dossziéban
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        {/* 1. Aláírt példány feltöltése / cseréje */}
                        {isHrOrAdmin && (
                          <UploadSignedDocumentDialog
                            document={doc}
                            employeeId={employee.id}
                            employeeName={employee.nev}
                          />
                        )}

                        {/* 2. In-browser Megtekintés */}
                        {(doc.displayUrl || doc.signedUrl || doc.url) && (
                          <PdfViewerDialog
                            url={doc.displayUrl || doc.signedUrl || doc.url!}
                            title={doc.alairt_fajl_url ? `${doc.nev} (Aláírt példány)` : doc.nev}
                          />
                        )}

                        {/* 3. Közvetlen Letöltés */}
                        {(doc.displayUrl || doc.signedUrl || doc.url) && (
                          <a
                            href={doc.displayUrl || doc.signedUrl || doc.url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors inline-flex items-center justify-center"
                            title="Letöltés"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}

                        {/* 4. Iktatás (ha még nincs iktatva) */}
                        {isHrOrAdmin && !doc.iktatoszam && (
                          <FileHrDocumentDialog
                            document={doc}
                            employeeId={employee.id}
                            employeeName={employee.nev}
                          />
                        )}
                        {isHrOrAdmin && !doc.iktatoszam ? (
                          <DeleteContractButton
                            documentId={doc.id}
                            fileUrl={doc.url || null}
                            dolgozoId={employee.id}
                          />
                        ) : isHrOrAdmin && (
                          <div
                            className="p-1 text-muted-foreground"
                            title="Hivatalosan iktatott irat az irattári szabályok szerint nem törölhető"
                          >
                            <Lock className="w-4 h-4 opacity-50" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
