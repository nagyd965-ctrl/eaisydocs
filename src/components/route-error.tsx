"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button, buttonVariants } from "@/components/ui/button"
import { getErrorBackTarget } from "@/utils/error-navigation"

interface RouteErrorProps {
  error: Error & { digest?: string }
  onRetry: () => void
}

/**
 * Közös hibaállapot-nézet az `error.tsx` szegmenshatárokhoz.
 * Production módban a szerveroldali hibaüzenet általános, ezért a felhasználónak
 * csak a hibakódot (digest) mutatjuk, amellyel a szerver naplóval párosítható.
 */
export function RouteError({ error, onRetry }: RouteErrorProps) {
  const pathname = usePathname()
  const back = getErrorBackTarget(pathname)

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">Váratlan hiba történt</h1>
        <p className="text-sm text-muted-foreground">
          Az oldal betöltése közben hiba lépett fel. Próbáld újra, és ha a hiba ismétlődik, add meg az alábbi hibakódot a rendszergazdának.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground">
            Hibakód:{" "}
            <code className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-foreground select-all">
              {error.digest}
            </code>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button onClick={onRetry}>Újrapróbálás</Button>
          <Link href={back.href} className={buttonVariants({ variant: "outline" })}>
            {back.label}
          </Link>
        </div>
      </div>
    </div>
  )
}
