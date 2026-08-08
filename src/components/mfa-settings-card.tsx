"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  KeyRound,
  Copy,
  Check,
} from "lucide-react"
import { enrollMfa, verifyMfaEnrollment, unenrollMfa } from "@/app/settings/mfa-actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface MfaSettingsCardProps {
  totpFactor: { id: string; status: string } | null
}

type DialogStep = "intro" | "qr" | "verify" | "success"

const STEPS = [
  { key: "intro", label: "Kezdés" },
  { key: "qr", label: "QR kód" },
  { key: "verify", label: "Megerősítés" },
] as const

function StepIndicator({ currentStep }: { currentStep: DialogStep }) {
  const stepIndex = { intro: 0, qr: 1, verify: 2, success: 3 }[currentStep]
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {STEPS.map((step, idx) => {
        const isComplete = idx < stepIndex
        const isCurrent = idx === stepIndex
        return (
          <div key={step.key} className="flex items-center">
            <div className={cn(
              "flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all duration-300",
              isComplete && "bg-primary text-primary-foreground",
              isCurrent && "bg-primary/15 text-primary border border-primary/40",
              !isComplete && !isCurrent && "bg-muted text-muted-foreground",
            )}>
              {isComplete ? <Check className="w-3.5 h-3.5" /> : idx + 1}
            </div>
            {idx < STEPS.length - 1 && (
              <div className={cn(
                "w-12 h-px mx-1 transition-all duration-500",
                isComplete ? "bg-primary" : "bg-border"
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function MfaSettingsCard({ totpFactor: initialFactor }: MfaSettingsCardProps) {
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogStep, setDialogStep] = useState<DialogStep>("intro")
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isEnabled, setIsEnabled] = useState(!!initialFactor)
  const [currentFactorId, setCurrentFactorId] = useState<string | null>(initialFactor?.id ?? null)

  const openEnrollDialog = () => {
    setDialogStep("intro")
    setCode("")
    setError(null)
    setQrCode(null)
    setSecret(null)
    setDialogOpen(true)
  }

  const handleStartEnroll = () => {
    setError(null)
    startTransition(async () => {
      const result = await enrollMfa()
      if ("error" in result) {
        setError(result.error ?? "Ismeretlen hiba")
        return
      }
      setFactorId(result.factorId)
      setQrCode(result.qrCode)
      setSecret(result.secret)
      setDialogStep("qr")
    })
  }

  const handleVerify = () => {
    if (!factorId || code.length !== 6) return
    setError(null)
    startTransition(async () => {
      const result = await verifyMfaEnrollment(factorId, code)
      if (result.error) {
        setError(result.error)
        return
      }
      setDialogStep("success")
      setIsEnabled(true)
      setCurrentFactorId(factorId)
    })
  }

  const handleUnenroll = () => {
    if (!currentFactorId) return
    startTransition(async () => {
      const result = await unenrollMfa(currentFactorId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Kétlépcsős azonosítás kikapcsolva.")
      setIsEnabled(false)
      setCurrentFactorId(null)
    })
  }

  const handleCopySecret = () => {
    if (!secret) return
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDialogClose = (open: boolean) => {
    if (!open && dialogStep === "success") {
      toast.success("Kétlépcsős azonosítás sikeresen bekapcsolva!")
    }
    if (!open) {
      // Ha bezárás enrolling közben, töröljük a félkész faktort
      if (factorId && dialogStep !== "success") {
        unenrollMfa(factorId).catch(() => {})
        setFactorId(null)
      }
      setCode("")
      setError(null)
    }
    setDialogOpen(open)
  }

  return (
    <>
      <Card className="border-border/50 shadow-none">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-5">
            {/* Bal oldal: ikon + szöveg */}
            <div className="flex items-start gap-4">
              <div className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                isEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {isEnabled ? <ShieldCheck className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Kétlépcsős azonosítás (2FA)</p>
                  <Badge className={cn(
                    "text-[10px] px-1.5 py-0 h-4 border-0",
                    isEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {isEnabled ? "Aktív" : "Inaktív"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isEnabled
                    ? "Bejelentkezéskor 6 jegyű kódot kér a rendszer a hitelesítő appodból."
                    : "Adj hozzá egy extra biztonsági réteget a fiókodhoz."}
                </p>
              </div>
            </div>

            {/* Jobb oldal: gomb */}
            {isEnabled ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/5 hover:border-destructive/60"
                    disabled={isPending}
                  >
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                    Kikapcsolás
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-border/50 shadow-none">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Kikapcsolod a 2FA-t?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ez csökkenti a fiókod biztonságát. Bejelentkezéskor nem kér majd kódot a rendszer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Mégse</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      onClick={handleUnenroll}
                    >
                      Igen, kikapcsolom
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button size="sm" className="shrink-0" onClick={openEnrollDialog} disabled={isPending}>
                Bekapcsolás
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─────────── ENROLLMENT DIALOG ─────────── */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md border-border/50 shadow-none p-0 gap-0 overflow-hidden">

          {/* Fejléc — teal sáv */}
          <div className="bg-primary/5 border-b border-border/50 px-6 pt-6 pb-5">
            {dialogStep !== "success" && <StepIndicator currentStep={dialogStep} />}
            <DialogHeader>
              {dialogStep === "intro" && (
                <>
                  <DialogTitle className="text-center">Kétlépcsős azonosítás beállítása</DialogTitle>
                  <DialogDescription className="text-center text-xs">
                    Védd meg a fiókodat egy extra biztonsági réteggel.
                    A bejelentkezéshez szükség lesz a hitelesítő appodra is.
                  </DialogDescription>
                </>
              )}
              {dialogStep === "qr" && (
                <>
                  <DialogTitle className="text-center">Olvasd be a QR kódot</DialogTitle>
                  <DialogDescription className="text-center text-xs">
                    Nyisd meg a Google Authenticator vagy Authy appot, majd olvasd be az alábbi kódot.
                  </DialogDescription>
                </>
              )}
              {dialogStep === "verify" && (
                <>
                  <DialogTitle className="text-center">Megerősítés</DialogTitle>
                  <DialogDescription className="text-center text-xs">
                    Add meg a hitelesítő appban megjelenő 6 jegyű kódot a beállítás véglegesítéséhez.
                  </DialogDescription>
                </>
              )}
              {dialogStep === "success" && (
                <>
                  <DialogTitle className="text-center text-lg">Sikeresen bekapcsolva!</DialogTitle>
                  <DialogDescription className="text-center text-xs">
                    A kétlépcsős azonosítás aktív. A következő bejelentkezéstől a rendszer kérni fogja a 6 jegyű kódot.
                  </DialogDescription>
                </>
              )}
            </DialogHeader>
          </div>

          {/* Tartalom */}
          <div className="px-6 py-5 space-y-4">

            {/* ── 1. lépés: Intro ── */}
            {dialogStep === "intro" && (
              <>
                <div className="space-y-3">
                  {[
                    { icon: Smartphone, text: "Töltsd le a Google Authenticator vagy Authy appot" },
                    { icon: QrCode, text: "Olvasd be a megjelenő QR kódot az appban" },
                    { icon: KeyRound, text: "A 6 jegyű kód megadásával fejezd be a beállítást" },
                  ].map(({ icon: Icon, text }, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                      <div className="h-7 w-7 shrink-0 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-sm text-muted-foreground leading-snug pt-0.5">{text}</p>
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-destructive text-xs p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </div>
                )}

                <Button className="w-full" onClick={handleStartEnroll} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Kezdjük el
                </Button>
              </>
            )}

            {/* ── 2. lépés: QR kód ── */}
            {dialogStep === "qr" && qrCode && (
              <>
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCode}
                    alt="QR kód a hitelesítő apphoz"
                    className="border border-border/50 rounded-xl p-3 bg-white w-44 h-44"
                  />
                </div>

                {secret && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground text-center">
                      Nem tudod beolvasni? Add meg ezt a kódot manuálisan:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-muted/50 border border-border/50 rounded-lg px-3 py-2 font-mono tracking-[0.2em] text-center select-all overflow-hidden text-ellipsis">
                        {secret}
                      </code>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 shrink-0 border-border/50"
                        onClick={handleCopySecret}
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                )}

                <Button className="w-full" onClick={() => setDialogStep("verify")}>
                  Beolvastam, folytasom →
                </Button>
              </>
            )}

            {/* ── 3. lépés: Kód megerősítése ── */}
            {dialogStep === "verify" && (
              <>
                <div className="space-y-3">
                  <Input
                    id="mfa-verify-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="_ _ _ _ _ _"
                    className="text-center tracking-[0.6em] font-mono text-2xl h-14 border-border/50 focus-visible:ring-primary/30"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleVerify() }}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    A kód 30 másodpercenként változik — mindig a legfrissebbet add meg.
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-destructive text-xs p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 border-border/50" onClick={() => setDialogStep("qr")} disabled={isPending}>
                    ← Vissza
                  </Button>
                  <Button className="flex-1" onClick={handleVerify} disabled={isPending || code.length !== 6}>
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Megerősítés
                  </Button>
                </div>
              </>
            )}

            {/* ── Siker ── */}
            {dialogStep === "success" && (
              <>
                <div className="py-2 space-y-2">
                  {[
                    "A következő bejelentkezésnél a rendszer 6 jegyű kódot fog kérni.",
                    "Ha elveszíted a hozzáférést az apphoz, lépj kapcsolatba a rendszergazdával.",
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
                      {text}
                    </div>
                  ))}
                </div>
                <Button className="w-full" onClick={() => setDialogOpen(false)}>
                  Kész, bezárom
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
