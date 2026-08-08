"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShieldCheck, Loader2, AlertTriangle } from "lucide-react"
import { verifyMfaLogin } from "@/app/settings/mfa-actions"
import { useRouter } from "next/navigation"

interface MfaVerifyFormProps {
  factorId: string
  redirectTo?: string
}

export function MfaVerifyForm({ factorId, redirectTo = "/" }: MfaVerifyFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleVerify = () => {
    if (code.length !== 6) return
    setError(null)
    startTransition(async () => {
      const result = await verifyMfaLogin(factorId, code)
      if (result.error) {
        setError(result.error)
        setCode("")
        return
      }
      router.push(redirectTo)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <Card className="mx-auto max-w-sm w-full border border-border/50 shadow-none">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl font-semibold">Kétlépcsős azonosítás</CardTitle>
          <CardDescription>
            Add meg a hitelesítő alkalmazásban megjelenő 6 jegyű kódot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              id="mfa-verify-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123 456"
              className="text-center tracking-[0.5em] font-mono text-2xl h-14"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleVerify()
              }}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleVerify}
            disabled={isPending || code.length !== 6}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ShieldCheck className="h-4 w-4 mr-2" />
            )}
            Azonosítás
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Nyisd meg a Google Authenticator, Authy vagy hasonló alkalmazást a kódhoz.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
