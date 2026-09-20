"use client"

import { useState } from "react"
import { Reply, Send, Loader2, Mail } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ReplyDialogProps {
  toEmail: string
  originalSubject: string
  iratId: string
  partnerNev?: string
}

const MAX_CHARS = 4000

function buildTemplate(partnerNev?: string): string {
  const salutation = partnerNev ? `Tisztelt ${partnerNev}!` : "Tisztelt Hölgyem / Uram!"
  return `${salutation}\n\nKöszönjük megkeresését. \n\n\nÜdvözlettel,\n`
}

export function ReplyDialogClient({ toEmail, originalSubject, iratId, partnerNev }: ReplyDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState(buildTemplate(partnerNev))
  const [recipient, setRecipient] = useState(toEmail || "")
  const [subject, setSubject] = useState(
    originalSubject.startsWith("Re:") ? originalSubject : `Re: ${originalSubject}`
  )
  const router = useRouter()

  const charCount = text.length
  const isOverLimit = charCount > MAX_CHARS

  const handleOpen = (val: boolean) => {
    setOpen(val)
    if (val) {
      // Reset to template whenever dialog opens
      setText(buildTemplate(partnerNev))
      setRecipient(toEmail || "")
      setSubject(originalSubject.startsWith("Re:") ? originalSubject : `Re: ${originalSubject}`)
    }
  }

  const handleSend = async () => {
    if (!text.trim()) {
      toast.error("Kérlek írj valami szöveget a válaszba!")
      return
    }
    if (isOverLimit) {
      toast.error(`Az üzenet túl hosszú (max. ${MAX_CHARS} karakter)!`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient,
          subject,
          text,
          iratId,
        }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || "Sikertelen levélküldés")
      }

      toast.success("Válaszlevél sikeresen elküldve!")
      setOpen(false)
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Hiba történt a levélküldés során."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger className={buttonVariants({ variant: "default" })}>
        Válasz
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle>Válasz küldése</DialogTitle>
              <DialogDescription className="text-xs">
                A válaszlevél a hivatos rendszer e-mail címéről kerül kiküldésre.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Címzett */}
          <div className="space-y-1.5">
            <Label htmlFor="reply-to" className="text-xs font-medium">Címzett</Label>
            <Input
              id="reply-to"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={loading}
              placeholder="cimzett@pelda.hu"
              className="font-mono text-sm"
            />
          </div>

          {/* Tárgy – szerkeszthető */}
          <div className="space-y-1.5">
            <Label htmlFor="reply-subject" className="text-xs font-medium">Tárgy</Label>
            <Input
              id="reply-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={loading}
              className="text-sm"
            />
          </div>

          {/* Üzenet */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="reply-message" className="text-xs font-medium">Üzenet</Label>
              <span className={`text-xs tabular-nums ${isOverLimit ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                {charCount.toLocaleString("hu-HU")} / {MAX_CHARS.toLocaleString("hu-HU")}
              </span>
            </div>
            <Textarea
              id="reply-message"
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
              className={`resize-y text-sm leading-relaxed font-[inherit] ${isOverLimit ? "border-destructive focus-visible:ring-destructive" : ""}`}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Mégse
          </Button>
          <Button
            onClick={handleSend}
            disabled={loading || !text.trim() || !recipient.trim() || isOverLimit}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Küldés folyamatban...
              </>
            ) : (
              "Küldés"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
