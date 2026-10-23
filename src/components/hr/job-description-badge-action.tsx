"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
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
    kategoria?: string | null
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

  // Ha nincs munkakör vagy nincs hozzá központi verzió a katalógusban:
  if (!munkakor || !latestJobVersion) {
    return null
  }

  // Ha a munkaköri leírás már át van véve / hozzá van rendelve a dolgozóhoz (vagy le van iktatva),
  // akkor felül egyáltalán nem jelenítünk meg kártyát, mert a dokumentumlistában már pontosan úgy szerepel,
  // mint az összes többi hivatalos irat.
  // Csak akkor jelenik meg a sáv, ha a katalógusban újabb hivatalos verzió jött ki, amit még nem rendeltek hozzá.
  const hasCurrentVersion = Boolean(
    existingDoc && (
      !latestJobVersion.verzio_szam ||
      existingDoc.nev?.includes(`v${latestJobVersion.verzio_szam}`) ||
      (!existingDoc.nev?.includes(" v") && existingDoc.kategoria === "Munkaköri leírás")
    )
  )

  if (hasCurrentVersion) {
    return null
  }

  // Csak HR/Admin számára jelenítjük meg az átvételi akciót, ha még nincs hozzárendelve
  if (!isHrOrAdmin) {
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

  const previewUrl = latestJobVersion.signedUrl || `/api/hr/download-document?path=${encodeURIComponent(latestJobVersion.fajl_path)}&bucket=irat_files`
  const isUpgrade = Boolean(existingDoc && !hasCurrentVersion)

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-primary/20 bg-primary/5 transition-all">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-foreground">
            Munkaköri leírás: {munkakor.megnevezes}
          </span>
          <Badge variant="secondary" className="text-xs font-mono">
            v{latestJobVersion.verzio_szam}
          </Badge>
          <Badge variant="outline" className="text-xs text-warning border-warning/30 bg-warning/10">
            {isUpgrade ? "Újabb verzió elérhető a katalógusból" : "Még nincs hozzárendelve a dolgozóhoz"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Központi fájl: <span className="font-medium text-foreground">{latestJobVersion.fajl_nev}</span> (Kiadva: {new Date(latestJobVersion.kiadas_datum).toLocaleDateString("hu-HU")})
        </p>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        <PdfViewerDialog
          url={previewUrl}
          title={`Munkaköri leírás - ${munkakor.megnevezes} (v${latestJobVersion.verzio_szam})`}
          trigger={
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 text-foreground hover:text-primary hover:bg-primary/10"
            >
              Előnézet
            </Button>
          }
        />

        <Button
          size="sm"
          className="text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={loading}
          onClick={handleAssign}
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
          {isUpgrade ? "Új verzió átvétele" : "Hozzáadás a Dolgozóhoz"}
        </Button>
      </div>
    </div>
  )
}
