"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileText, CheckCircle2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { uploadIDPCertificateAction } from "@/app/hr/actions/idp-actions"
import { toast } from "sonner"

interface IdpCertificateUploadDialogProps {
  celId: string
  celMegnevezes: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IdpCertificateUploadDialog({
  celId,
  celMegnevezes,
  open,
  onOpenChange
}: IdpCertificateUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [megjegyzes, setMegjegyzes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      toast.error("Kérjük, csatolja a megszerzett tanúsítványt vagy igazolást!")
      return
    }

    setIsSubmitting(true)

    const formData = new FormData()
    formData.append("celId", celId)
    formData.append("file", file)
    if (megjegyzes.trim()) {
      formData.append("megjegyzes", megjegyzes.trim())
    }

    const res = await uploadIDPCertificateAction(formData)
    setIsSubmitting(false)

    if (res.success) {
      toast.success("Tanúsítvány sikeresen feltöltve és továbbítva vezetői elbírálásra!")
      onOpenChange(false)
      setFile(null)
      setMegjegyzes("")
      router.refresh()
    } else {
      toast.error("Hiba történt a feltöltéskor", { description: res.error })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Képzés Befejezése és Tanúsítvány Leadása
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Csatolja a megszerzett oklevelet, vizsgaigazolást vagy tanúsítványt a vezetői jóváhagyáshoz.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="p-3 bg-muted/40 rounded-lg border">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">
              Érintett Fejlesztési Cél
            </span>
            <span className="text-sm font-medium text-foreground">
              {celMegnevezes}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="certificate-file" className="text-xs font-medium">
              Tanúsítvány / Oklevél Fájl (PDF, PNG, JPG, max 10MB) *
            </Label>
            <Input
              id="certificate-file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-xs cursor-pointer h-9"
              required
            />
            {file && (
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>Kiválasztva: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="upload-note" className="text-xs font-medium">
              Megjegyzés a Vezetőnek (opcionális)
            </Label>
            <Textarea
              id="upload-note"
              placeholder="pl. Sikeres B2 vizsga letéve 85%-os eredménnyel, mellékelve a hivatalos igazolás..."
              rows={2}
              className="resize-none text-xs"
              value={megjegyzes}
              onChange={(e) => setMegjegyzes(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Mégse
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !file}
            >
              {isSubmitting ? "Feltöltés és beküldés..." : "Leadás Jóváhagyásra"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
