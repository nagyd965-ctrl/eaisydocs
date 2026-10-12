"use client"

import { useState, useEffect } from "react"
import { getDocumentSignedUrl } from "@/app/dossiers/[id]/viewer-actions"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2, FileText, ArrowRight } from "lucide-react"
import { DocumentPreviewFrame } from "@/components/document-preview-frame"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentViewer({ 
  open, 
  setOpen, 
  fajl,
  iratId,
  fajlok = []
}: { 
  open: boolean, 
  setOpen: (o: boolean) => void, 
  fajl: any,
  iratId: string,
  fajlok?: any[]
}) {
  const [selectedFile, setSelectedFile] = useState<any>(fajl)
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (fajl) {
      setSelectedFile(fajl)
    }
  }, [fajl])

  useEffect(() => {
    if (open && selectedFile) {
      let isMounted = true;
      
      // Késleltetjük a state beállítást a következő tick-re a React warning elkerülése miatt
      setTimeout(() => {
        if (!isMounted) return
        setLoading(true);
        setError(null);
        setUrl(null);
      }, 0)
      
      getDocumentSignedUrl(selectedFile.storage_path, iratId, selectedFile.id)
        .then(res => {
          if (!isMounted) return;
          if (res.error) setError(res.error)
          else setUrl(res.signedUrl || null)
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        })
        
      return () => {
        isMounted = false;
      }
    }
  }, [open, selectedFile, iratId]);

  const activeFilesList = fajlok && fajlok.length > 0 ? fajlok : (fajl ? [fajl] : [])

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o)
      if (!o) {
        setUrl(null)
        setError(null)
      }
    }}>
      <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl w-full h-[90vh] flex flex-col p-4 sm:p-6 gap-3">
        <DialogHeader className="space-y-2 pb-2 border-b">
          <div className="flex items-center justify-between gap-4 mr-6">
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-semibold truncate flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{selectedFile?.eredeti_fajlnev || "Dokumentum előnézet"}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {selectedFile && [
                  typeof selectedFile.meret_byte === "number" && selectedFile.meret_byte > 0 ? formatFileSize(selectedFile.meret_byte) : null,
                  selectedFile.sha256 ? `SHA256: ${selectedFile.sha256.substring(0, 16)}...` : null
                ].filter(Boolean).join(" • ")}
              </DialogDescription>
            </div>

            {iratId && (
              <Link
                href={`/inbox/${iratId}`}
                onClick={() => setOpen(false)}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-7 text-xs gap-1.5 shrink-0 border-primary/30 text-primary hover:bg-primary/5")}
                title="Megnyitás az osztott képernyős iktatóban"
              >
                <span>Iktatás megnyitása</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {/* Csatolmány-választó fülcsík, ha több csatolmány van */}
          {activeFilesList.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
                Csatolmányok ({activeFilesList.length}):
              </span>
              {activeFilesList.map((f: any) => {
                const isActive = (selectedFile?.id || fajl?.id) === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFile(f)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors shrink-0 max-w-[220px] border cursor-pointer",
                      isActive
                        ? "bg-background text-foreground border-primary/50 font-medium shadow-xs"
                        : "bg-muted/40 text-muted-foreground border-transparent hover:bg-background/60 hover:text-foreground"
                    )}
                    title={f.eredeti_fajlnev}
                  >
                    <FileText className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                    <span className="truncate">{f.eredeti_fajlnev}</span>
                    {f.meret_byte && (
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                        ({formatFileSize(f.meret_byte)})
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </DialogHeader>
        
        <div className="flex-1 w-full bg-muted/20 border rounded-md overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground animate-pulse">Biztonságos kapcsolat felépítése...</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-destructive p-4 text-center z-10">
              {error}
            </div>
          )}
          {url && (
            <DocumentPreviewFrame 
              src={url} 
              title={selectedFile?.eredeti_fajlnev || "Dokumentum előnézet"}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
