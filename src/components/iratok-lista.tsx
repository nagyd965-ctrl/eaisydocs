"use client"

import { useState } from "react"
import { DocumentViewer } from "./document-viewer"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Eye, FileText, Download, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { BorrowDialog } from "./borrow-dialog"
import { PhysicalLocationDialog } from "./physical-location-dialog"
import { toast } from "sonner"
import { getDocumentSignedUrl } from "@/app/dossiers/[id]/viewer-actions"

export interface IratFajlItem {
  id: string
  irat_id?: string
  storage_path: string
  eredeti_fajlnev: string
  meret_byte?: number
  mime_type?: string
  verzio?: number
  pdfa_path?: string | null
}

export interface IratFizikaiHely {
  polc?: string | null
  doboz?: string | null
}

export interface IratTableItem {
  id: string
  targy: string
  erkeztetoszam?: string | null
  irany?: string
  irat_fajl?: IratFajlItem[]
  irat_fizikai_hely?: any
  irat_kolcsonzes_naplo?: {
    id?: string
    statusz?: string
    kolcsonvevo_user_id?: string
    kolcsonvevo_nev?: string | null
  }[]
  [key: string]: any
}

interface IratokListaProps {
  iratok: IratTableItem[];
  canEdit?: boolean;
  users?: { id: string, nev: string }[];
}

export function IratokLista({ iratok, canEdit = true, users = [] }: IratokListaProps) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedFajl, setSelectedFajl] = useState<IratFajlItem | null>(null)
  const [selectedIratId, setSelectedIratId] = useState<string>("")
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const openViewer = (fajl: IratFajlItem, iratId: string) => {
    setSelectedFajl(fajl)
    setSelectedIratId(iratId)
    setViewerOpen(true)
  }

  const handleDownload = async (irat: IratTableItem) => {
    // Az első fájlt töltjük le (legújabb verzió)
    const fajl = irat.irat_fajl?.sort((a, b) => (b.verzio || 1) - (a.verzio || 1))?.[0]
    if (!fajl) {
      toast.error("Nincs letölthető fájl ehhez az irathoz.")
      return
    }

    setDownloadingId(irat.id)
    try {
      const result = await getDocumentSignedUrl(fajl.storage_path, irat.id, fajl.id)
      if (result.error) {
        toast.error(result.error)
        return
      }

      // Fetch the PDF blob from our secure API
      const response = await fetch(result.signedUrl!)
      if (!response.ok) {
        toast.error("Hiba a fájl letöltésekor.")
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fajl.eredeti_fajlnev || "letoltes.pdf"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Fájl letöltve!")
    } catch {
      toast.error("Hiba a fájl letöltésekor.")
    } finally {
      setDownloadingId(null)
    }
  }

  if (!iratok || iratok.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground border rounded-md bg-card">
        Nincs irat csatolva ehhez az ügyirathoz.
      </div>
    )
  }

  return (
    <div className="border rounded-md bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Érkeztetőszám</TableHead>
            <TableHead>Tárgy</TableHead>
            <TableHead>Irány</TableHead>
            <TableHead>Fájlok</TableHead>
            <TableHead>Fizikai hely</TableHead>
            <TableHead className="text-right">Műveletek</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {iratok.map((irat) => (
            <TableRow key={irat.id}>
              <TableCell className="font-medium text-muted-foreground">
                {irat.erkeztetoszam}
              </TableCell>
              <TableCell>{irat.targy}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {{ bejovo: 'Bejövő', kimeno: 'Kimenő', belso: 'Belső' }[irat.irany as string] || irat.irany}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1.5">
                  {irat.irat_fajl && irat.irat_fajl.length > 0 ? (
                    irat.irat_fajl.map((fajl: IratFajlItem) => (
                      <div key={fajl.id} className="flex items-center text-sm text-muted-foreground gap-2 group">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate max-w-[200px]" title={fajl.eredeti_fajlnev}>
                          {fajl.eredeti_fajlnev}
                        </span>
                        {fajl.verzio && fajl.verzio > 1 ? (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 shrink-0">
                            v{fajl.verzio}
                          </Badge>
                        ) : null}
                        {fajl.pdfa_path && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0" title="PDF/A archív példány elérhető">
                            PDF/A ✓
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => openViewer(fajl, irat.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted shrink-0"
                          title="Megtekintés"
                        >
                          <Eye className="h-3.5 w-3.5 text-primary" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Nincs fájl csatolva</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center">
                    {(() => {
                      const fizikai = Array.isArray(irat.irat_fizikai_hely) ? irat.irat_fizikai_hely[0] : irat.irat_fizikai_hely
                      return fizikai ? (
                        <div className="text-xs text-muted-foreground mb-1 flex items-center">
                          <span>Polc: <span className="font-semibold">{fizikai.polc || '-'}</span>, Doboz: <span className="font-semibold">{fizikai.doboz || '-'}</span></span>
                          {canEdit && <PhysicalLocationDialog iratId={irat.id} currentPolc={fizikai.polc || undefined} currentDoboz={fizikai.doboz || undefined} />}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground italic mb-1 flex items-center">
                          Nincs rögzítve
                          {canEdit && <PhysicalLocationDialog iratId={irat.id} />}
                        </div>
                      )
                    })()}
                  </div>
                  {canEdit && (
                    <BorrowDialog 
                      iratId={irat.id} 
                      users={users} 
                      activeBorrowLog={
                        irat.irat_kolcsonzes_naplo?.find((log) => log.statusz === "kikolcsonozve") as any
                      } 
                    />
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {irat.irat_fajl && irat.irat_fajl.length > 0 && (
                  <Button 
                    onClick={() => handleDownload(irat)} 
                    variant="outline" 
                    size="sm"
                    disabled={downloadingId === irat.id}
                  >
                    {downloadingId === irat.id 
                      ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      : <Download className="mr-2 h-3.5 w-3.5" />
                    }
                    Fájl
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <DocumentViewer 
        open={viewerOpen} 
        setOpen={setViewerOpen} 
        fajl={selectedFajl} 
        iratId={selectedIratId} 
      />
    </div>
  )
}
