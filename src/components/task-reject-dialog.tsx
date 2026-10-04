"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertCircle, Ban, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { rejectTask } from "@/app/tasks/task-actions"

interface TaskRejectDialogProps {
  taskId: string | null
  taskTitle?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (savedReason: string) => void
}

const QUICK_REASONS = [
  "Már elintézve / Nem szükséges további lépés",
  "Téves szignálás / Nem az én hatásköröm",
  "Partner visszautasította / Tárgytalan",
  "Duplikált vagy elavult feladat",
]

export function TaskRejectDialog({
  taskId,
  taskTitle,
  open,
  onOpenChange,
  onSuccess,
}: TaskRejectDialogProps) {
  const [indoklas, setIndoklas] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleQuickReason = (reason: string) => {
    setIndoklas(reason)
  }

  const handleSubmit = async () => {
    if (!taskId) return
    if (!indoklas.trim()) {
      toast.error("Kérlek add meg az elutasítás vagy lezárás indokát!")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await rejectTask(taskId, indoklas.trim())
      if (res.success) {
        const savedReason = indoklas.trim()
        toast.success("A feladat állapota sikeresen 'Elutasított'-ra változott.")
        setIndoklas("")
        onOpenChange(false)
        if (onSuccess) onSuccess(savedReason)
      } else {
        toast.error(res.error || "Hiba történt az elutasítás során.")
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba történt.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive font-semibold">
            <Ban className="h-5 w-5" />
            <DialogTitle className="text-lg">Feladat elutasítása / lezárása</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {taskTitle ? (
              <span className="font-medium text-foreground block mb-1 truncate">
                „{taskTitle}”
              </span>
            ) : null}
            Kérlek indokold meg a feladat elutasítását. Az indoklás rögzítésre kerül az audit
            naplóban, és a feladat kiírója is látni fogja.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Gyors indoklás sablonok */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Gyakori indokok (kattints a beillesztéshez):
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => handleQuickReason(reason)}
                  className="text-[11px] px-2.5 py-1 rounded-md border border-border/60 bg-muted/40 hover:bg-muted text-foreground transition-colors text-left"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Szöveges indoklás mező */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="indoklas-input" className="text-xs font-semibold">
                Részletes indoklás <span className="text-destructive">*</span>
              </Label>
              <span className="text-[10px] text-muted-foreground">
                {indoklas.length} karakter
              </span>
            </div>
            <Textarea
              id="indoklas-input"
              value={indoklas}
              onChange={(e) => setIndoklas(e.target.value)}
              placeholder="Írd le, hogy miért kerül elutasításra vagy lezárásra ez a feladat..."
              className="resize-none min-h-[90px] text-sm"
              autoFocus
            />
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Az elutasított feladatok nem törlődnek, de kikerülnek az aktív teendők közül, és
              visszakövethetőek maradnak.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
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
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !indoklas.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Elutasítás...
              </>
            ) : (
              "Elutasítás megerősítése"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
