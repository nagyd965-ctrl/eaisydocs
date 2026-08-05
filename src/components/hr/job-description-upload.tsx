"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, Download, Trash2, Loader2, Calendar } from "lucide-react"
import { toast } from "sonner"
import { uploadJobDescription, deleteJobDescriptionVersion } from "@/app/hr/settings/actions"

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

export function JobDescriptionUpload({ munkakorId, versions = [], isHrOrAdmin = false }: { 
  munkakorId: string
  versions: Version[]
  isHrOrAdmin?: boolean
}) {
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

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
        <div className="space-y-3">
          {versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{v.fajl_nev}</span>
                    <Badge variant="secondary" className="text-[10px]">v{v.verzio_szam}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {new Date(v.kiadas_datum).toLocaleDateString("hu-HU")}
                    {v.megjegyzes && <span>• {v.megjegyzes}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleDownload(v.fajl_path, v.fajl_nev)}
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
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <FileText className="w-8 h-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Még nincs feltöltött munkaköri leírás.</p>
        </div>
      )}

      {/* Feltöltés gomb / form */}
      {isHrOrAdmin && !showUpload && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => setShowUpload(true)}
        >
          <Upload className="w-4 h-4" />
          Új verzió feltöltése
        </Button>
      )}

      {showUpload && (
        <form action={handleUpload} className="space-y-3 p-4 border rounded-lg bg-muted/10">
          <div className="space-y-2">
            <Label htmlFor="file">Dokumentum (PDF, DOCX)</Label>
            <Input id="file" name="file" type="file" accept=".pdf,.docx,.doc" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="megjegyzes">Megjegyzés (opcionális)</Label>
            <Input id="megjegyzes" name="megjegyzes" placeholder="pl. Módosított munkaidő keret" />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowUpload(false)} disabled={uploading}>
              Mégse
            </Button>
            <Button type="submit" size="sm" disabled={uploading} className="gap-2">
              {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
              Feltöltés
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
