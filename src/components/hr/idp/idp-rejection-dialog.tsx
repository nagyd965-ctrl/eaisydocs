"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { rejectDevelopmentGoal } from "@/app/hr/actions/idp-actions"
import { toast } from "sonner"

interface IdpRejectionDialogProps {
  celId: string
  celMegnevezes: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IdpRejectionDialog({
  celId,
  celMegnevezes,
  open,
  onOpenChange
}: IdpRejectionDialogProps) {
  const [indoklas, setIndoklas] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleReject(e: React.FormEvent) {
    e.preventDefault()
    if (!indoklas.trim()) {
      toast.error("Kérjük, adja meg a visszaküldés vagy elutasítás indoklását!")
      return
    }

    setIsSubmitting(true)
    const res = await rejectDevelopmentGoal(celId, indoklas.trim())
    setIsSubmitting(false)

    if (res.success) {
      toast.success("Célkitűzés visszaküldve kiegészítésre a munkavállalónak")
      onOpenChange(false)
      setIndoklas("")
      router.refresh()
    } else {
      toast.error("Hiba történt a visszaküldéskor", { description: res.error })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Képzés Visszaküldése Kiegészítésre
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            A célkitűzés visszakerül &apos;Folyamatban&apos; státuszba, a munkavállaló értesítést kap a szükséges javításról.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleReject} className="space-y-4 pt-1">
          <div className="p-3 bg-muted/40 rounded-lg border">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">
              Érintett Fejlesztési Cél
            </span>
            <span className="text-sm font-medium text-foreground">
              {celMegnevezes}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="indoklas" className="text-xs font-medium">
              Visszaküldés / Hiánypótlás Indoklása *
            </Label>
            <Textarea
              id="indoklas"
              placeholder="pl. A feltöltött tanúsítvány nem olvasható, vagy nem a B2 szakmai szintet igazolja. Kérjük, csatolja az akkreditált bizonyítványt..."
              rows={3}
              className="resize-none text-xs"
              value={indoklas}
              onChange={(e) => setIndoklas(e.target.value)}
              required
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
              variant="destructive"
              size="sm"
              disabled={isSubmitting || !indoklas.trim()}
            >
              {isSubmitting ? "Folyamatban..." : "Visszaküldés"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
