"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, Eye, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { uploadJobDescription, deleteJobDescriptionVersion } from "@/app/hr/settings/actions"
import { generateJobDescriptionVersionAction } from "@/app/hr/job/[id]/actions"
import { PdfViewerDialog } from "@/components/hr/pdf-viewer-dialog"

interface Version {
  id: string
  verzio_szam: number
  kiadas_datum: string
  fajl_nev: string
  fajl_path: string
  feltolto_id: string
  megjegyzes: string | null
  created_at: string
  felhasznalo_profil?: { nev: string } | null
}

interface JobDescriptionUploadProps {
  munkakorId: string
  versions: Version[]
  isHrOrAdmin?: boolean
  job?: any
  orgUnitNev?: string | null
}

export function JobDescriptionUpload({
  munkakorId,
  versions = [],
  isHrOrAdmin = false,
  job,
  orgUnitNev,
}: JobDescriptionUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateMegjegyzes, setGenerateMegjegyzes] = useState("")

  const highestVersion = versions.length > 0 ? Math.max(...versions.map((v) => v.verzio_szam || 0)) : 0
  const nextVersion = highestVersion + 1

  // Tisztított fájlnév előkép
  const cleanName = (job?.megnevezes || "Munkakor")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
  const proposedFileName = `Munkakori_Leiras_${cleanName}_v${nextVersion}.pdf`

  // Feladatok és kompetenciák száma
  let tasksCount = 0
  if (Array.isArray(job?.feladatok_es_hataskorok)) {
    tasksCount = job.feladatok_es_hataskorok.length
  } else if (typeof job?.feladatok_es_hataskorok === "string") {
    try {
      const p = JSON.parse(job.feladatok_es_hataskorok)
      if (Array.isArray(p)) tasksCount = p.length
    } catch {
      tasksCount = job.feladatok_es_hataskorok.split("\n").filter(Boolean).length
    }
  }

  let compCount = 0
  if (Array.isArray(job?.elvart_kompetenciak)) {
    compCount = job.elvart_kompetenciak.length
  } else if (typeof job?.elvart_kompetenciak === "string") {
    try {
      const p = JSON.parse(job.elvart_kompetenciak)
      if (Array.isArray(p)) compCount = p.length
    } catch {
      compCount = job.elvart_kompetenciak.split("\n").filter(Boolean).length
    }
  }

  const handleUpload = async (formData: FormData) => {
    setUploading(true)
    const result = await uploadJobDescription(munkakorId, formData)
    setUploading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Munkaköri leírás v${result.verzio} sikeresen feltöltve!`)
      setShowUpload(false)
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const result = await generateJobDescriptionVersionAction(munkakorId, {
        megjegyzes: generateMegjegyzes.trim() || undefined,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Hivatalos munkaköri leírás (v${result.verzio}) sikeresen legenerálva!`)
        setShowGenerateDialog(false)
        setGenerateMegjegyzes("")
      }
    } catch (err: any) {
      toast.error("Váratlan hiba történt a generálás során: " + (err.message || ""))
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async (versionId: string) => {
    if (!confirm("Biztosan törölni szeretnéd ezt a verziót?")) return
    const result = await deleteJobDescriptionVersion(versionId, munkakorId)
    if (result.error) toast.error(result.error)
    else toast.success("Verzió sikeresen törölve!")
  }

  const handleDownload = async (fajlPath: string, fajlNev: string) => {
    try {
      const response = await fetch(`/api/hr/download-document?path=${encodeURIComponent(fajlPath)}&bucket=irat_files`)
      if (!response.ok) throw new Error("Letöltés sikertelen")
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fajlNev
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Letöltés sikertelen")
    }
  }

  return (
    <div className="space-y-4">
      {/* Verzió lista */}
      {versions.length > 0 ? (
        <div className="space-y-2.5">
          {versions.map((v) => {
            const isLatest = v.verzio_szam === highestVersion
            return (
              <div
                key={v.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{v.fajl_nev}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      v{v.verzio_szam}
                    </Badge>
                    {isLatest && (
                      <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                        Legfrissebb hatályos
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    <span>Kiadva: {new Date(v.kiadas_datum).toLocaleDateString("hu-HU")}</span>
                    {v.megjegyzes && <span> • {v.megjegyzes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <PdfViewerDialog
                    url={`/api/hr/download-document?path=${encodeURIComponent(v.fajl_path)}&bucket=irat_files`}
                    title={`${v.fajl_nev} (v${v.verzio_szam})`}
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                        title="Megtekintés a böngészőben"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDownload(v.fajl_path, v.fajl_nev)}
                    title="Letöltés"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {isHrOrAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(v.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed rounded-lg bg-muted/10">
          <p className="text-sm font-medium text-foreground">Még nincs rögzített munkaköri leírás.</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Generálja le a munkakör aktuális adataiból a hivatalos dokumentumot (v1), vagy töltsön fel egy meglévő PDF fájlt.
          </p>
        </div>
      )}

      {/* Műveleti gombok HR / Admin számára */}
      {isHrOrAdmin && !showUpload && (
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          <Button
            variant="default"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => setShowGenerateDialog(true)}
          >
            Munkaköri leírás generálása (v{nextVersion})
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => setShowUpload(true)}
          >
            Kézi verzió feltöltése
          </Button>
        </div>
      )}

      {/* Kézi feltöltés form */}
      {showUpload && (
        <form action={handleUpload} className="space-y-3 p-4 border rounded-lg bg-muted/10">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Új munkaköri leírás verzió feltöltése</h4>
            <p className="text-xs text-muted-foreground">
              A feltöltött fájl automatikusan a következő (v{nextVersion}) verziószámmal lesz nyilvántartva.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">Dokumentum fájl (PDF, DOCX)</Label>
            <Input id="file" name="file" type="file" accept=".pdf,.docx,.doc" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="megjegyzes">Megjegyzés (opcionális)</Label>
            <Input id="megjegyzes" name="megjegyzes" placeholder="pl. Módosított munkaidő keret és felelősségek" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowUpload(false)}
              disabled={uploading}
            >
              Mégse
            </Button>
            <Button type="submit" size="sm" disabled={uploading} className="gap-2">
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              Feltöltés (v{nextVersion})
            </Button>
          </div>
        </form>
      )}

      {/* Generátor Dialógus */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Hivatalos Munkaköri Leírás Generálása</DialogTitle>
            <DialogDescription className="text-xs">
              A rendszer a munkakör aktuális adataiból azonnal előállítja a Munka Törvénykönyve (Mt. 45. § (4)) szerinti,
              hivatalos A4 PDF munkaköri leírást.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            {/* Verzió és fájlnév infópanel */}
            <div className="p-3 rounded-lg border bg-muted/20 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Következő verziószám:</span>
                <Badge variant="default" className="text-xs px-2 py-0.5">
                  v{nextVersion}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Generált fájlnév:</span>
                <span className="font-mono text-[11px] text-foreground font-medium truncate max-w-[260px]">
                  {proposedFileName}
                </span>
              </div>
            </div>

            {/* Tartalmi összefoglaló */}
            <div className="border rounded-lg p-3 space-y-2 text-xs">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Dokumentumba kerülő aktuális adatok
              </div>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>
                  <span className="block text-[10px] uppercase">Munkakör</span>
                  <span className="text-foreground font-medium">{job?.megnevezes || "—"}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase">FEOR-08 Foglalkozás</span>
                  <span className="text-foreground font-medium">{job?.feor_kod || "Nincs rögzítve"}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase">Szervezeti egység</span>
                  <span className="text-foreground font-medium">{orgUnitNev || "Központi állomány"}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase">Besorolási szint</span>
                  <span className="text-foreground font-medium">{job?.besorolasi_szint || "Általános"}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase">Rögzített feladatok</span>
                  <span className="text-foreground font-medium">
                    {tasksCount > 0 ? `${tasksCount} feladat` : "Alapértelmezett feladatlista"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase">Elvárt kompetenciák</span>
                  <span className="text-foreground font-medium">
                    {compCount > 0 ? `${compCount} elvárás` : "Alapértelmezett lista"}
                  </span>
                </div>
              </div>
            </div>

            {/* Megjegyzés mező */}
            <div className="space-y-1.5">
              <Label htmlFor="generate-megjegyzes" className="text-xs">
                Verzió megjegyzése (opcionális)
              </Label>
              <Input
                id="generate-megjegyzes"
                value={generateMegjegyzes}
                onChange={(e) => setGenerateMegjegyzes(e.target.value)}
                placeholder={`pl. v${nextVersion}: Feladatok és munkavédelmi előírások aktualizálása`}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowGenerateDialog(false)}
              disabled={generating}
            >
              Mégse
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
              className="gap-2"
            >
              {generating && <Loader2 className="w-4 h-4 animate-spin" />}
              {generating ? "Generálás és mentés..." : `Generálás és közzététel (v${nextVersion})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
