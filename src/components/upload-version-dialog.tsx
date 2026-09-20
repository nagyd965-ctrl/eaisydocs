"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { uploadDocumentNewVersion } from "@/app/dossiers/[id]/version-actions"
import { toast } from "sonner"
import { Upload, Loader2, FileUp } from "lucide-react"

interface UploadVersionDialogProps {
  iratId: string
  ugyiratId: string
  iratTargy: string
  currentVersion?: number
}

export function UploadVersionDialog({
  iratId,
  ugyiratId,
  iratTargy,
  currentVersion = 1,
}: UploadVersionDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [indoklas, setIndoklas] = useState("")
  const [isUploading, setIsUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error("Kérlek, válassz ki egy fájlt!")
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("indoklas", indoklas)

    const res = await uploadDocumentNewVersion(iratId, ugyiratId, formData)
    setIsUploading(false)

    if (res.error) {
      toast.error("Hiba", { description: res.error })
    } else {
      toast.success("Új verzió sikeresen feltöltve!", {
        description: `Az irat frissült a v${res.verzio} verzióra. A korábbi verziók megmaradtak a történetben.`,
      })
      setOpen(false)
      setFile(null)
      setIndoklas("")
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-[11px] font-normal text-muted-foreground hover:text-primary flex items-center gap-1 cursor-pointer"
        title={`Új verzió feltöltése (jelenlegi: v${currentVersion})`}
        onClick={() => setOpen(true)}
      >
        <span>Új verzió</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Új fájlverzió feltöltése</DialogTitle>
              <DialogDescription>
                A módosítás nem írja felül a korábbi fájlt. A rendszer új verziószámot (v{currentVersion + 1}) rendel hozzá, és naplózza az eseményt.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="rounded-md bg-muted/40 p-3 text-xs flex flex-col gap-1 border border-border/60">
                <span className="text-muted-foreground">Érintett irat:</span>
                <span className="font-semibold text-foreground truncate">{iratTargy}</span>
                <span className="text-muted-foreground mt-1">
                  Jelenlegi verzió: <span className="font-mono text-primary font-medium">v{currentVersion}</span> → Következő: <span className="font-mono text-emerald-500 font-medium">v{currentVersion + 1}</span>
                </span>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="version-file">Új fájl (PDF, Word, kép, scan) *</Label>
                <Input
                  id="version-file"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={isUploading}
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="version-reason">Módosítás indoklása / megjegyzés</Label>
                <Textarea
                  id="version-reason"
                  placeholder="Pl. Javított szerződésszöveg, aláírt példány, melléklettel kiegészítve..."
                  value={indoklas}
                  onChange={(e) => setIndoklas(e.target.value)}
                  disabled={isUploading}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isUploading}
              >
                Mégse
              </Button>
              <Button type="submit" disabled={isUploading || !file} className="gap-1.5">
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Feltöltés...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Verzió mentése (v{currentVersion + 1})
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
