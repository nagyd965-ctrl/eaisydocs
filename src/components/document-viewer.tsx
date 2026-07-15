"use client"

import { useState, useEffect } from "react"
import { getDocumentSignedUrl } from "@/app/dossiers/[id]/viewer-actions"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

export function DocumentViewer({ 
  open, 
  setOpen, 
  fajl,
  iratId
}: { 
  open: boolean, 
  setOpen: (o: boolean) => void, 
  fajl: any,
  iratId: string
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && fajl) {
      let isMounted = true;
      
      // Késleltetjük a state beállítást a következő tick-re a React warning elkerülése miatt
      setTimeout(() => {
        if (!isMounted) return
        setLoading(true);
        setError(null);
        setUrl(null);
      }, 0)
      
      getDocumentSignedUrl(fajl.storage_path, iratId)
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
  }, [open, fajl, iratId]);

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o)
      if (!o) {
        setUrl(null)
        setError(null)
      }
    }}>
      <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl w-full h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl">{fajl?.eredeti_fajlnev}</DialogTitle>
          <DialogDescription>
            {fajl && `${(fajl.meret_byte / 1024).toFixed(1)} KB • SHA256: ${fajl.sha256.substring(0, 16)}...`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 w-full bg-muted/20 border rounded-md overflow-hidden relative mt-2">
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
            <iframe 
              src={url} 
              className="w-full h-full border-0"
              title="Document Viewer"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
