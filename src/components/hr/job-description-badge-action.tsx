"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Eye, FilePlus, CheckCircle2, Loader2, Info } from "lucide-react"
import { toast } from "sonner"
import { assignJobDescriptionToEmployee } from "@/app/hr/actions/contract-actions"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"

interface JobDescriptionBadgeActionProps {
  employeeId: string
  employeeName: string
  munkakor: {
    id: string
    megnevezes: string
    feor_kod?: string | null
    besorolasi_szint?: string | null
  } | null
  latestJobVersion: {
    id: string
    verzio_szam: number
    fajl_nev: string
    fajl_path: string
    kiadas_datum: string
    signedUrl?: string | null
  } | null
  existingDoc: {
    id: string
    nev: string
    iktatoszam?: string | null
  } | null
  isHrOrAdmin?: boolean
}

export function JobDescriptionBadgeAction({
  employeeId,
  employeeName,
  munkakor,
  latestJobVersion,
  existingDoc,
  isHrOrAdmin = false
}: JobDescriptionBadgeActionProps) {
  const [loading, setLoading] = useState(false)

  if (!munkakor) {
    return null
  }

  const handleAssign = async () => {
    if (!latestJobVersion) return
    setLoading(true)
    try {
      const result = await assignJobDescriptionToEmployee(
        employeeId,
        munkakor.id,
        employeeName,
        latestJobVersion.id
      )
      if (result.success) {
        toast.success(`A(z) ${munkakor.megnevezes} hivatalos munkaköri leírás (v${latestJobVersion.verzio_szam}) sikeresen hozzárendelve a dolgozóhoz!`)
      } else {
        toast.error(result.error || "Hiba történt a munkaköri leírás hozzárendelésekor.")
      }
    } catch (err: any) {
      toast.error("Váratlan hiba történt: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const previewUrl = latestJobVersion?.signedUrl || (latestJobVersion ? `/api/hr/download-document?path=${encodeURIComponent(latestJobVersion.fajl_path)}&bucket=irat_files` : "")

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-primary/20 bg-primary/5 transition-all">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">
              Munkaköri leírás: {munkakor.megnevezes}
            </span>
            {latestJobVersion && (
              <Badge variant="secondary" className="text-xs font-mono">
                v{latestJobVersion.verzio_szam}
              </Badge>
            )}
            {existingDoc ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {existingDoc.iktatoszam ? `Iktatva: ${existingDoc.iktatoszam}` : "Hozzáadva a vázlatokhoz"}
              </Badge>
            ) : latestJobVersion ? (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30 bg-amber-500/10">
                Új verzió elérhető a katalógusból
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {latestJobVersion ? (
              <>Központi fájl: <span className="font-medium text-foreground">{latestJobVersion.fajl_nev}</span> (Kiadva: {new Date(latestJobVersion.kiadas_datum).toLocaleDateString("hu-HU")})</>
            ) : (
              <>A munkakör katalógusban még nincs feltöltött sablon — használhatod a dinamikus generátort.</>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        {latestJobVersion && (
          <PdfViewerDialog
            url={previewUrl}
            title={`Munkaköri leírás - ${munkakor.megnevezes} (v${latestJobVersion.verzio_szam})`}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 text-foreground hover:text-primary hover:bg-primary/10"
              >
                <Eye className="w-3.5 h-3.5 text-primary" /> Megtekintés
              </Button>
            }
          />
        )}

        {isHrOrAdmin && latestJobVersion && !existingDoc && (
          <Button
            size="sm"
            className="gap-1.5 text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={loading}
            onClick={handleAssign}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FilePlus className="w-3.5 h-3.5" />}
            Hozzáadás a Dolgozóhoz
          </Button>
        )}
      </div>
    </div>
  )
}
