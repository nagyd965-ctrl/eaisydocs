"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { FileText, FileArchive, Eye, Download, ShieldCheck } from "lucide-react"
import { DocumentViewer } from "@/components/document-viewer"

export type Document = {
  id: string
  nev: string
  kategoria?: string | null
  url?: string | null
  created_at: string
  irat_id?: string | null
  ugyirat_id?: string | null
  iktatoszam?: string | null
  alairt_fajl_url?: string | null
  alairas_statusz?: string | null
}

export function RecentDocumentsCard({ documents }: { documents: Document[] }) {
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)

  const getDownloadUrl = (doc: Document) => {
    const rawPath = doc.alairt_fajl_url || doc.url
    if (!rawPath) return null
    if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
      return rawPath
    }
    return `/api/hr/download-document?path=${encodeURIComponent(rawPath)}&bucket=irat_files`
  }

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> Legutóbbi Dokumentumaim
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border rounded-lg border-dashed mt-4 bg-muted/20">
            <FileArchive className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Még nem töltöttek fel számodra HR dokumentumot.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {documents.map((doc) => {
              const downloadUrl = getDownloadUrl(doc)
              const hasFile = Boolean(doc.url || doc.alairt_fajl_url)

              return (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 bg-primary/10 rounded-md flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate flex items-center gap-2">
                        <span className="truncate">{doc.nev}</span>
                        {doc.alairas_statusz === "alairva" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-success/15 text-success border border-success/30 shrink-0">
                            <ShieldCheck className="w-3 h-3" /> Aláírva
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{new Date(doc.created_at).toLocaleDateString("hu-HU")}</span>
                        <span>•</span>
                        <span>{doc.kategoria || "Dokumentum"}</span>
                        {doc.iktatoszam && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-primary font-medium">{doc.iktatoszam}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* 1. Beépített Gyors Megtekintés (DocumentViewer) */}
                    {hasFile ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedDoc(doc)
                          setViewerOpen(true)
                        }}
                        className="h-8 text-xs gap-1.5 text-primary hover:text-primary hover:bg-primary/10 font-medium"
                        title="Gyors megtekintés a beépített nézegetőben"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Megtekintés</span>
                      </Button>
                    ) : null}

                    {/* 2. Közvetlen Letöltés (Megőrizve) */}
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
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      {/* Kanonikus beépített DocumentViewer */}
      <DocumentViewer
        open={viewerOpen}
        setOpen={setViewerOpen}
        fajl={selectedDoc ? {
          id: selectedDoc.id,
          eredeti_fajlnev: selectedDoc.nev,
          nev: selectedDoc.nev,
          kategoria: selectedDoc.kategoria,
          storage_path: selectedDoc.alairt_fajl_url || selectedDoc.url,
          url: selectedDoc.alairt_fajl_url || selectedDoc.url,
          irat_id: selectedDoc.irat_id,
          ugyirat_id: selectedDoc.ugyirat_id,
          iktatoszam: selectedDoc.iktatoszam
        } : null}
        iratId={selectedDoc?.irat_id || ""}
        dossierId={selectedDoc?.ugyirat_id || ""}
      />
    </Card>
  )
}
