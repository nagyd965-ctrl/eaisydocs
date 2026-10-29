"use client"

import { useState } from "react"
import Link from "next/link"
import { useFormStatus } from "react-dom"
import { login } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2 } from "lucide-react"

/**
 * Bejelentkezés gomb betöltés-állapottal: a kattintás pillanatától pörgettyű +
 * „Bejelentkezés…" felirat, és a gomb letiltásával a dupla beküldés is kizárva.
 */
function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="mt-1.5 h-11 w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Bejelentkezés…
        </>
      ) : (
        "Bejelentkezés"
      )}
    </Button>
  )
}

export function LoginForm({
  message,
  next,
}: {
  message?: string
  next?: string
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)

  // Caps Lock állapot követése gépelés közben (a böngésző beépített jelzése alapján)
  const detectCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") {
      setCapsLockOn(e.getModifierState("CapsLock"))
    }
  }

  return (
    <form action={login} className="space-y-4">
      {/* Az eredeti cél (pl. e-mail link) továbbítása a belépés utánra */}
      <input type="hidden" name="next" value={next ?? ""} />

      <div className="space-y-2">
        <Label htmlFor="email">E-mail cím</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="te@ceged.hu"
          autoComplete="username"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Jelszó</Label>
          <Link
            href="/login/forgot-password"
            className="text-xs font-medium text-primary hover:underline"
          >
            Elfelejtett jelszó?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-10"
            onKeyDown={detectCapsLock}
            onKeyUp={detectCapsLock}
            onBlur={() => setCapsLockOn(false)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
            tabIndex={-1}
            aria-label={showPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {capsLockOn && (
          <p role="status" className="text-[11px] font-medium text-warning">
            A Caps Lock bekapcsolva
          </p>
        )}
      </div>

      {message && (
        <p
          role="alert"
          className="pt-1 text-center text-sm font-medium text-destructive"
        >
          {message}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}
