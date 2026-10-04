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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Send, Mail, Package, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { expediteExistingDocument, savePartnerCentralEmail } from "@/app/dossiers/[id]/actions"

interface ExpediteDialogProps {
  ugyiratId: string
  iratId: string
  iratTargy: string
  dossierIktatoszam?: string
  partnerInfo?: {
    id?: string | null
    nev?: string | null
    email?: string | null
    source?: string | null
  } | null
}

export function ExpediteDialog({
  ugyiratId,
  iratId,
  iratTargy,
  dossierIktatoszam,
  partnerInfo,
}: ExpediteDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<"email" | "posta">("email")

  // E-mail mezők
  const [emailTo, setEmailTo] = useState(partnerInfo?.email || "")
  const [emailSubject, setEmailSubject] = useState(
    dossierIktatoszam
      ? `Hivatalos kimenő irat - ${dossierIktatoszam} (${iratTargy})`
      : `Hivatalos kimenő irat: ${iratTargy}`
  )
  const [emailMessage, setEmailMessage] = useState(
    `Tisztelt ${partnerInfo?.nev || "Partnerünk"}!\n\nMellékelten továbbítjuk a(z) ${dossierIktatoszam || "hivatkozott"} ügyirathoz tartozó "${iratTargy}" hivatalos iratot.\n\nÜdvözlettel,\neaisyDocs Iratkezelő Rendszer`
  )
  const [saveToPartner, setSaveToPartner] = useState(!partnerInfo?.email && !!partnerInfo?.id)

  // Postai mezők
  const [postalTracking, setPostalTracking] = useState("")
  const [postalDate, setPostalDate] = useState(new Date().toISOString().split("T")[0])
  const [postalRecipient, setPostalRecipient] = useState(partnerInfo?.nev || "")
  const [postalAddress, setPostalAddress] = useState("")
  const [postalNote, setPostalNote] = useState("Tértivevényes ajánlott küldeményként feladva")

  const handleOpen = (val: boolean) => {
    setOpen(val)
    if (val) {
      if (partnerInfo?.email && !emailTo) {
        setEmailTo(partnerInfo.email)
      }
      if (partnerInfo?.nev && !postalRecipient) {
        setPostalRecipient(partnerInfo.nev)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData()
      formData.set("expediteMode", mode)

      if (mode === "email") {
        if (!emailTo.trim()) {
          toast.error("Kérjük, adja meg a címzett e-mail címét!")
          setLoading(false)
          return
        }
        formData.set("recipientEmail", emailTo.trim())
        formData.set("emailSubject", emailSubject.trim())
        formData.set("emailMessage", emailMessage.trim())
        if (saveToPartner && partnerInfo?.id) {
          formData.set("saveToPartnerId", partnerInfo.id)
        }
      } else {
        formData.set("postalTracking", postalTracking.trim())
        formData.set("postalDate", postalDate)
        formData.set("postalRecipient", postalRecipient.trim())
        formData.set("postalAddress", postalAddress.trim())
        formData.set("postalNote", postalNote.trim())
      }

      const res = await expediteExistingDocument(ugyiratId, iratId, formData)

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(
          mode === "email"
            ? `Válaszlevél sikeresen kiküldve e-mailben a csatolt PDF-fel! (${emailTo.trim()})`
            : "Postai feladás sikeresen rögzítve az irathoz!"
        )
        setOpen(false)
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "Váratlan hiba történt a kiküldés során.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-medium border-primary/40 text-primary hover:bg-primary/10 flex items-center gap-1.5 transition-colors"
            title="Kimenő irat azonnali kiküldése a partnernek"
          />
        }
      >
        <Send className="h-3.5 w-3.5" />
        Kiküldés / Expediálás
      </DialogTrigger>

      <DialogContent className="sm:max-w-[620px] w-full p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-primary/10 text-primary border border-primary/20">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Kimenő irat kiküldése (Expediálás)</DialogTitle>
              <DialogDescription className="text-xs">
                Irat: <span className="font-medium text-foreground">{iratTargy}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Partner badge, ha ismert */}
        {partnerInfo?.nev && (
          <div className="p-3 bg-muted/60 border border-border/60 rounded-md text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                Címzett partner: {partnerInfo.nev}
              </span>
              {partnerInfo.source && (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                  {partnerInfo.source}
                </Badge>
              )}
            </div>
            {!partnerInfo.email && (
              <p className="text-[11px] text-amber-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                A partnerhez még nincs központi e-mail cím mentve a törzsadatban.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Módválasztó gombok */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setMode("email")}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md font-medium transition-all ${
                mode === "email"
                  ? "bg-background text-foreground shadow-sm border border-border/80 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="h-3.5 w-3.5 text-primary" />
              E-mail kiküldés (Csatolt PDF-fel)
            </button>
            <button
              type="button"
              onClick={() => setMode("posta")}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md font-medium transition-all ${
                mode === "posta"
                  ? "bg-background text-foreground shadow-sm border border-border/80 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Package className="h-3.5 w-3.5 text-warning" />
              Postai feladás rögzítése
            </button>
          </div>

          {mode === "email" ? (
            <div className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="exp-email-to" className="text-xs font-medium">
                  Címzett e-mail címe <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="exp-email-to"
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="pl. ugyvezeto@partner.hu"
                  required
                  disabled={loading}
                />
                {partnerInfo?.id && !partnerInfo.email && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="save-partner-email"
                      checked={saveToPartner}
                      onChange={(e) => setSaveToPartner(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <label htmlFor="save-partner-email" className="text-[11px] text-muted-foreground cursor-pointer select-none">
                      E-mail cím mentése a partnerhez központi e-mailként ({partnerInfo.nev})
                    </label>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-email-sub" className="text-xs font-medium">
                  E-mail tárgya
                </Label>
                <Input
                  id="exp-email-sub"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-email-msg" className="text-xs font-medium">
                  Kísérőszöveg a partnernek
                </Label>
                <Textarea
                  id="exp-email-msg"
                  rows={4}
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Adjon meg kísérőszöveget..."
                  className="font-sans text-xs resize-none"
                  disabled={loading}
                />
                <p className="text-[11px] text-muted-foreground">
                  A rendszer automatikusan csatolja a kiválasztott dokumentum PDF fájlját az elküldött levélhez.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="exp-post-rec" className="text-xs font-medium">
                    Címzett neve <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="exp-post-rec"
                    value={postalRecipient}
                    onChange={(e) => setPostalRecipient(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exp-post-date" className="text-xs font-medium">
                    Feladás dátuma
                  </Label>
                  <Input
                    id="exp-post-date"
                    type="date"
                    value={postalDate}
                    onChange={(e) => setPostalDate(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-post-track" className="text-xs font-medium">
                  Postai azonosító / Követési ragszám (opcionális)
                </Label>
                <Input
                  id="exp-post-track"
                  value={postalTracking}
                  onChange={(e) => setPostalTracking(e.target.value)}
                  placeholder="Pl. RL123456789HU"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-post-addr" className="text-xs font-medium">
                  Postacím (opcionális)
                </Label>
                <Input
                  id="exp-post-addr"
                  value={postalAddress}
                  onChange={(e) => setPostalAddress(e.target.value)}
                  placeholder="Pl. 1117 Budapest, Október huszonharmadika u. 8."
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-post-note" className="text-xs font-medium">
                  Megjegyzés / Kézbesítés módja
                </Label>
                <Input
                  id="exp-post-note"
                  value={postalNote}
                  onChange={(e) => setPostalNote(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Mégse
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-primary text-primary-foreground flex items-center gap-1.5"
              disabled={loading}
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {mode === "email" ? "E-mail elküldése PDF-fel" : "Feladás rögzítése"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
