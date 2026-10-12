"use client"

import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle2, Eye, Download } from "lucide-react"
import { toast } from "sonner"
import { acknowledgeJobDescription } from "@/app/hr/self-service/actions"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"

export interface MunkakorAckItem {
  id: string
  megnevezes: string
  [key: string]: unknown
}

export interface JobVersionAckItem {
  id: string
  verzio_szam: number
  fajl_nev: string
  signedUrl?: string
  [key: string]: any
}

interface JobDescriptionAcknowledgmentProps {
  munkakor: MunkakorAckItem
  latestJobVersion?: JobVersionAckItem | null
}

export function JobDescriptionAcknowledgment({ munkakor, latestJobVersion }: JobDescriptionAcknowledgmentProps) {
  const [loading, setLoading] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  const handleAcknowledge = async () => {
    setLoading(true)
    const result = await acknowledgeJobDescription(munkakor.id)
    setLoading(false)

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Munkaköri leírás sikeresen nyugtázva!")
      setAcknowledged(true)
    }
  }

  if (acknowledged) return null

  return (
    <Alert className="border-warning/40 bg-warning/10 mb-6">
      <AlertCircle className="h-4 w-4 text-warning shrink-0" />
      <div className="flex-1">
        <AlertTitle className="text-warning font-semibold text-sm">
          Új munkaköri leírás elektronikus megismerése és elfogadása szükséges
        </AlertTitle>
        <AlertDescription className="text-foreground/90 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
          <span className="text-xs sm:text-sm">
            A jelenlegi pozíciódhoz (<strong>{munkakor.megnevezes}</strong>) tartozó hivatalos munkaköri leírást még nem nyugtáztad. Kérjük, tekintsd át a feladatkörödet és erősítsd meg a megismerését!
          </span>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {latestJobVersion?.signedUrl && (
              <>
                <PdfViewerDialog
                  url={latestJobVersion.signedUrl}
                  title={`${latestJobVersion.fajl_nev || munkakor.megnevezes} (v${latestJobVersion.verzio_szam})`}
                  trigger={
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs bg-background hover:bg-background/90 text-foreground">
                      <Eye className="w-3.5 h-3.5 text-primary" /> Átolvasás (PDF)
                    </Button>
                  }
                />
                <a
                  href={latestJobVersion.signedUrl}
                  download={latestJobVersion.fajl_nev || "munkakori_leiras.pdf"}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-background hover:bg-background/90" title="Letöltés">
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </a>
              </>
            )}
            <Button
              size="sm"
              onClick={handleAcknowledge}
              disabled={loading}
              className="h-8 whitespace-nowrap bg-warning hover:bg-warning/90 text-warning-foreground font-semibold text-xs gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {loading ? "Nyugtázás..." : "Megismertem és elfogadom"}
            </Button>
          </div>
        </AlertDescription>
      </div>
    </Alert>
  )
}
