"use client"

import { useState } from "react"
import { DocumentViewer } from "./document-viewer"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Eye, FileText, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface IratokListaProps {
  iratok: any[];
  canEdit?: boolean;
}

export function IratokLista({ iratok, canEdit = true }: IratokListaProps) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedFajl, setSelectedFajl] = useState<any>(null)
  const [selectedIratId, setSelectedIratId] = useState<string>("")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

  const openViewer = (fajl: any, iratId: string) => {
    setSelectedFajl(fajl)
    setSelectedIratId(iratId)
    setViewerOpen(true)
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
                <div className="flex flex-col gap-1">
                  {irat.irat_fajl && irat.irat_fajl.length > 0 ? (
                    irat.irat_fajl.map((fajl: any) => (
                      <div key={fajl.id} className="flex items-center text-sm text-muted-foreground gap-2">
                        <FileText className="h-3 w-3" />
                        <span className="truncate max-w-[200px]" title={fajl.eredeti_fajlnev}>
                          {fajl.eredeti_fajlnev}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Nincs fájl csatolva</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {irat.irat_fajl && irat.irat_fajl.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => openViewer(irat.irat_fajl[0], irat.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Megtekintés
                  </Button>
                )}
                {canEdit && (
                  <Button onClick={() => setUploadDialogOpen(true)} className="ml-2" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
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
