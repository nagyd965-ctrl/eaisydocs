"use client"

import * as React from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Upload, FileText, CheckCircle2, Gift, Sparkles, X, Globe } from "lucide-react"
import { toast } from "sonner"
import { submitReferralAction } from "@/app/hr/self-service/career/referral-actions"
import type { InternalJobPosting } from "@/components/hr/internal-career-view"

interface ReferralDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postings: InternalJobPosting[]
  defaultJobId?: string | null
  bonusAmount: number
  onSuccess?: () => void
}

export function ReferralDialog({
  open,
  onOpenChange,
  postings,
  defaultJobId,
  bonusAmount,
  onSuccess,
}: ReferralDialogProps) {
  const [selectedJobId, setSelectedJobId] = React.useState<string>(defaultJobId || "general")
  const [jeloltNev, setJeloltNev] = React.useState("")
  const [jeloltEmail, setJeloltEmail] = React.useState("")
  const [jeloltTelefon, setJeloltTelefon] = React.useState("")
  const [linkedinUrl, setLinkedinUrl] = React.useState("")
  const [ajanlasIndoklas, setAjanlasIndoklas] = React.useState("")
  const [gdprConsent, setGdprConsent] = React.useState(false)
  const [cvFile, setCvFile] = React.useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  // Amikor megnyílik vagy változik a defaultJobId, frissítjük
  React.useEffect(() => {
    if (open) {
      setSelectedJobId(defaultJobId || "general")
    }
  }, [open, defaultJobId])

  const resetForm = () => {
    setJeloltNev("")
    setJeloltEmail("")
    setJeloltTelefon("")
    setLinkedinUrl("")
    setAjanlasIndoklas("")
    setGdprConsent(false)
    setCvFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      toast.error("A fájl mérete nem haladhatja meg a 10 MB-ot.")
      return
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || ""
    if (!["pdf", "doc", "docx"].includes(ext)) {
      toast.error("Csak PDF vagy Word formátumú önéletrajz tölthető fel.")
      return
    }

    setCvFile(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!jeloltNev.trim()) {
      toast.error("Kérjük, add meg a jelölt nevét.")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!jeloltEmail.trim() || !emailRegex.test(jeloltEmail.trim())) {
      toast.error("Kérjük, érvényes e-mail címet adj meg.")
      return
    }

    if (!gdprConsent) {
      toast.error("Kérjük, erősítsd meg a jelölt hozzájárulását az adatai kezeléséhez.")
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("jeloltNev", jeloltNev.trim())
      formData.append("jeloltEmail", jeloltEmail.trim())
      if (jeloltTelefon.trim()) formData.append("jeloltTelefon", jeloltTelefon.trim())
      if (linkedinUrl.trim()) formData.append("linkedinUrl", linkedinUrl.trim())
      if (selectedJobId && selectedJobId !== "general") {
        formData.append("allashirdetesId", selectedJobId)
      }
      if (ajanlasIndoklas.trim()) formData.append("ajanlasIndoklas", ajanlasIndoklas.trim())
      if (cvFile) formData.append("cv", cvFile)

      const result = await submitReferralAction(formData)

      if (result.success) {
        toast.success(result.message || "Ajánlásod sikeresen rögzítve!")
        resetForm()
        onOpenChange(false)
        if (onSuccess) onSuccess()
      } else {
        toast.error(result.error || "Nem sikerült elmenteni az ajánlást.")
      }
    } catch {
      toast.error("Váratlan hiba történt a beküldés során.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formattedBonus = new Intl.NumberFormat("hu-HU").format(bonusAmount)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Gift className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-semibold">Ismerős vagy szakember ajánlása</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Segíts csapatunk bővítésében! Ha a jelölted felvételre kerül, sikerdíjban részesülsz.
          </DialogDescription>
        </DialogHeader>

        {/* Linear Flat Bónusz Banner (ADR A-029) */}
        <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-3 text-xs flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-foreground">
              Fix ajánlási bónusz: {formattedBonus} Ft
            </span>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              Sikeres felvétel és a próbaidő eredményes lezárása után a cég a bérszámfejtésed keretében automatikusan kifizeti számodra ezt a sikerdíjat.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Pozíció választó */}
          <div className="space-y-1.5">
            <Label htmlFor="referral-job" className="text-xs font-medium">
              Megpályázott pozíció
            </Label>
            <Select value={selectedJobId} onValueChange={(val) => setSelectedJobId(val || "general")}>
              <SelectTrigger id="referral-job" className="h-9 text-xs">
                <SelectValue placeholder="Válassz pozíciót..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general" className="text-xs font-medium">
                  🎯 Általános ajánlás (Talent pool / Nincs konkrét kiírás)
                </SelectItem>
                {postings.map((job) => (
                  <SelectItem key={job.id} value={job.id} className="text-xs">
                    {job.cim} {job.is_internal ? "(Belső)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Ha nem találsz pontosan illeszkedő nyitott állást, a jelölt a cég tehetségbázisába kerül.
            </p>
          </div>

          {/* Jelölt Alapadatok */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="jelolt-nev" className="text-xs font-medium">
                Jelölt teljes neve <span className="text-destructive">*</span>
              </Label>
              <Input
                id="jelolt-nev"
                value={jeloltNev}
                onChange={(e) => setJeloltNev(e.target.value)}
                placeholder="pl. Kis Veronika"
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="jelolt-email" className="text-xs font-medium">
                Jelölt e-mail címe <span className="text-destructive">*</span>
              </Label>
              <Input
                id="jelolt-email"
                type="email"
                value={jeloltEmail}
                onChange={(e) => setJeloltEmail(e.target.value)}
                placeholder="veronika.kis@example.com"
                required
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="jelolt-telefon" className="text-xs font-medium">
                Telefonszám (opcionális)
              </Label>
              <Input
                id="jelolt-telefon"
                value={jeloltTelefon}
                onChange={(e) => setJeloltTelefon(e.target.value)}
                placeholder="+36 30 123 4567"
                className="h-9 text-xs tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="linkedin-url" className="text-xs font-medium flex items-center gap-1">
                <Globe className="h-3 w-3 text-muted-foreground" />
                LinkedIn profil URL (opcionális)
              </Label>
              <Input
                id="linkedin-url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/profil"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Önéletrajz feltöltés */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Önéletrajz (CV) csatolása</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={handleFileChange}
            />

            {cvFile ? (
              <div className="flex items-center justify-between border rounded-md p-2.5 bg-muted/20 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium truncate">{cvFile.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    ({Math.round(cvFile.size / 1024)} KB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setCvFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed rounded-md p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/10 transition-colors flex flex-col items-center justify-center gap-1.5"
              >
                <div className="p-2 rounded-full bg-muted text-muted-foreground">
                  <Upload className="h-4 w-4" />
                </div>
                <p className="text-xs font-medium text-foreground">
                  Kattints a fájl kiválasztásához
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Támogatott formátumok: PDF, DOCX (max. 10 MB)
                </p>
              </div>
            )}
          </div>

          {/* Ajánlás szöveges indoklása */}
          <div className="space-y-1.5">
            <Label htmlFor="ajanlas-indoklas" className="text-xs font-medium">
              Miért ajánlod őt? (opcionális)
            </Label>
            <Textarea
              id="ajanlas-indoklas"
              value={ajanlasIndoklas}
              onChange={(e) => setAjanlasIndoklas(e.target.value)}
              placeholder="Korábbi közös munkatapasztalat, szakmai erősségek, miért illene a cég kultúrájába..."
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          {/* GDPR hozzájárulás checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={gdprConsent}
                onChange={(e) => setGdprConsent(e.target.checked)}
                className="mt-0.5 rounded border-muted-foreground/30 text-primary focus:ring-primary h-3.5 w-3.5"
                required
              />
              <span className="text-muted-foreground leading-tight text-[11px]">
                Megerősítem, hogy a jelölt kifejezetten hozzájárult személyes adatai és önéletrajza átadásához az álláspályázat céljából (GDPR megfelelőség).
              </span>
            </label>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Mégse
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Rögzítés folyamatban...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Ajánlás beküldése
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
