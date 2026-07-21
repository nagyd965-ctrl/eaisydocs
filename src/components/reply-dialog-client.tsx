"use client"

import { useState } from "react"
import { Reply, Send, Loader2 } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface ReplyDialogProps {
  toEmail: string
  originalSubject: string
  iratId: string
}

import { useRouter } from "next/navigation"

export function ReplyDialogClient({ toEmail, originalSubject, iratId }: ReplyDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState("")
  const [recipient, setRecipient] = useState(toEmail || "")
  const router = useRouter()

  const subject = originalSubject.startsWith("Re:") ? originalSubject : `Re: ${originalSubject}`

  const handleSend = async () => {
    if (!text.trim()) {
      toast.error("Kérlek írj valami szöveget a válaszba!")
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
        })
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || "Sikertelen levélküldés")
      }

      toast.success("Válaszlevél sikeresen elküldve!")
      setOpen(false)
      setText("") // reset
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Hiba történt a levélküldés során.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "default" })}>
        <Reply className="mr-2 h-4 w-4" />
        Válasz
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Válasz küldése</DialogTitle>
          <DialogDescription>
            A válaszlevél a hivatalos e-mail címedről kerül kiküldésre.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="to">Címzett</Label>
            <Input 
               id="to" 
               value={recipient} 
               onChange={(e) => setRecipient(e.target.value)}
               disabled={loading}
               placeholder="cimzett@pelda.hu" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Tárgy</Label>
            <Input id="subject" value={subject} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Üzenet</Label>
            <Textarea 
              id="message" 
              placeholder="Írd ide a válaszod..." 
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
              className="resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Mégse
          </Button>
          <Button onClick={handleSend} disabled={loading || !text.trim() || !recipient.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Küldés folyamatban...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Küldés
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
