"use client"

import { useState, useEffect } from "react"
import { ExternalLink, Download, Loader2, AlertCircle } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getSignedCertificateUrl } from "@/app/hr/actions/idp-actions"

interface IdpCertificateViewerDialogProps {
  tanusitvanyUrl: string
  tanusitvanyNev?: string | null
  celMegnevezes: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IdpCertificateViewerDialog({
  tanusitvanyUrl,
  tanusitvanyNev,
  celMegnevezes,
  open,
  onOpenChange
}: IdpCertificateViewerDialogProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && tanusitvanyUrl) {
      setLoading(true)
      setError(null)
      getSignedCertificateUrl(tanusitvanyUrl)
        .then((url) => {
          if (url) {
            setSignedUrl(url)
          } else {
            setError("Nem sikerült betölteni a tanúsítvány biztonságos előnézetét.")
          }
          setLoading(false)
        })
        .catch((err) => {
          console.error("Hiba a tanúsítvány URL generálásakor:", err)
          setError("Hiba a letöltési hivatkozás létrehozásakor.")
          setLoading(false)
        })
    } else {
      setSignedUrl(null)
    }
  }, [open, tanusitvanyUrl])

  const isPdf = tanusitvanyNev?.toLowerCase().endsWith(".pdf") || tanusitvanyUrl.toLowerCase().endsWith(".pdf")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] max-h-[92vh] flex flex-col p-4">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center justify-between pr-6">
            <div>
              <DialogTitle className="text-base font-semibold">
                Képzési Tanúsítvány Betekintő
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {celMegnevezes} {tanusitvanyNev ? `• ${tanusitvanyNev}` : ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-[460px] max-h-[65vh] flex items-center justify-center bg-muted/20 rounded-md overflow-hidden my-2 border">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground text-xs py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span>Tanúsítvány biztonságos betöltése...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 text-destructive text-xs py-12 text-center p-4">
              <AlertCircle className="w-6 h-6" />
              <span>{error}</span>
            </div>
          ) : signedUrl ? (
            isPdf ? (
              <iframe
                src={`${signedUrl}#toolbar=0`}
                className="w-full h-full min-h-[500px] border-none"
                title="Tanúsítvány PDF"
              />
            ) : (
              <div className="p-4 flex items-center justify-center max-h-full overflow-auto">
                <img
                  src={signedUrl}
                  alt="Tanúsítvány igazolás"
                  className="max-h-[500px] object-contain rounded shadow-sm"
                />
              </div>
            )
          ) : null}
        </div>

        <DialogFooter className="pt-2 gap-2 border-t">
          {signedUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(signedUrl, "_blank")}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Megnyitás új lapon
            </Button>
          )}
          {signedUrl && (
            <a href={signedUrl} download={tanusitvanyNev || "tanusitvany"} target="_blank" rel="noopener noreferrer">
              <Button type="button" size="sm">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Letöltés
              </Button>
            </a>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Bezárás
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
