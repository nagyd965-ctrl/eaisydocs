"use client"

import { useState } from "react"
import { Paperclip, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface Fajl {
  id: string
  eredeti_fajlnev: string
  meret_byte: number
}

interface AttachmentViewerProps {
  iratId: string
  fajlok: Fajl[]
}

export function AttachmentViewerClient({ iratId, fajlok }: AttachmentViewerProps) {
  const [selectedFile, setSelectedFile] = useState<Fajl | null>(null)

  // Jelenleg a backend az iratId alapján azonosít, de most már átadjuk a konkrét fileId-t is
  const getPdfUrl = (fajl: Fajl) => `/api/pdf/${iratId}?fileId=${fajl.id}`

  return (
    <div className="space-y-6">
      {/* Csatolmányok listája */}
      <div className="border rounded-lg bg-card text-card-foreground shadow-sm p-4">
        <h3 className="font-medium flex items-center gap-2 mb-4 text-sm">
          <Paperclip className="h-4 w-4" />
          Csatolmányok ({fajlok?.length || 0})
        </h3>
        
        {fajlok && fajlok.length > 0 ? (
          <div className="space-y-3">
            {fajlok.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/10 hover:bg-muted/30 transition-colors">
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate" title={f.eredeti_fajlnev}>
                    {f.eredeti_fajlnev}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(f.meret_byte / 1024).toFixed(1)} KB
                  </span>
                </div>
                <Button 
                  variant={selectedFile?.id === f.id ? "default" : "secondary"} 
                  size="sm" 
                  onClick={() => setSelectedFile(selectedFile?.id === f.id ? null : f)}
                >
                  {selectedFile?.id === f.id ? "Bezárás" : "Megtekintés"}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Nincsenek csatolmányok.</p>
        )}
      </div>

      {/* PDF Megjelenítő (Ha van kiválasztva) - Pop-up (Dialog) ként */}
      <Dialog open={!!selectedFile} onOpenChange={(open) => !open && setSelectedFile(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[85vw] w-full h-[90vh] p-0 flex flex-col overflow-hidden gap-0">
          <DialogHeader className="p-4 border-b bg-muted/20 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedFile?.eredeti_fajlnev}
            </DialogTitle>
            <DialogDescription className="sr-only">
              PDF Dokumentum előnézete
            </DialogDescription>
          </DialogHeader>
          {selectedFile && (
            <div className="flex-1 w-full relative overflow-hidden bg-muted">
              <iframe 
                src={getPdfUrl(selectedFile)}
                className="absolute inset-0 w-full h-full border-0 block"
                title="PDF Előnézet"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
