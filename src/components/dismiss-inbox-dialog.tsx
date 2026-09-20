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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { dismissInboxItem } from "@/app/inbox/inbox-dismiss-actions"
import { toast } from "sonner"
import { Ban, Loader2 } from "lucide-react"

interface DismissInboxDialogProps {
  iratId: string
  erkeztetoszam: string
  targy: string
  onDismissed?: () => void
}

export function DismissInboxDialog({
  iratId,
  erkeztetoszam,
  targy,
  onDismissed,
}: DismissInboxDialogProps) {
  const [open, setOpen] = useState(false)
  const [indoklas, setIndoklas] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!indoklas.trim()) {
      toast.error("Kérlek, adj meg egy indoklást a döntéshez!")
      return
    }

    setIsSubmitting(true)
    const res = await dismissInboxItem(iratId, indoklas)
    setIsSubmitting(false)

    if (res.error) {
      toast.error("Hiba történt", { description: res.error })
    } else {
      toast.success("Küldemény elintézve", {
        description: `${erkeztetoszam} megjelölve mint 'Nem iktatandó'. Iktatószám nem lett felhasználva.`,
      })
      setOpen(false)
      setIndoklas("")
      onDismissed?.()
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
        title="Nem iktatandó (pl. kéretlen reklám, hírlevél, tájékoztató)"
        onClick={() => setOpen(true)}
      >
        <Ban className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
        Nem iktatandó
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-amber-500" />
                Iktatás mellőzése (Nem iktatandó)
              </DialogTitle>
              <DialogDescription>
                A jogszabályi előírásoknak megfelelően a nem ügyintézési célú küldeményekből (pl. kéretlen reklám, meghívó, sajtóanyag) nem képezünk ügyiratot, de az érkeztetés naplózott marad.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="rounded-md bg-muted/40 p-3 text-xs flex flex-col gap-1 border border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Érkeztetőszám:</span>
                  <span className="font-mono font-medium text-foreground">{erkeztetoszam}</span>
                </div>
                <div className="flex items-start justify-between gap-2 mt-1">
                  <span className="text-muted-foreground shrink-0">Tárgy:</span>
                  <span className="font-semibold text-foreground text-right line-clamp-2">{targy}</span>
                </div>
              </div>

            <div className="grid gap-1.5">
              <Label htmlFor="dismiss-reason">
                Iktatás mellőzésének indoka <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="dismiss-reason"
                placeholder="Pl. Kéretlen reklám / spam, rendszerértesítő, tájékoztató hírlevél, téves címzés..."
                value={indoklas}
                onChange={(e) => setIndoklas(e.target.value)}
                disabled={isSubmitting}
                required
                rows={3}
              />
            </div>
          </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Mégse
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting || !indoklas.trim()}
                className="gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mentés...
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4" />
                    Mellőzés rögzítése
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
