"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { buttonVariants } from "@/components/ui/button"
import { getErrorBackTarget } from "@/utils/error-navigation"

/**
 * Közös "nem található" nézet a gyökér `not-found.tsx`-hez.
 * Kliens komponens, hogy a HR útvonalakon a HR főoldalra vezessen vissza.
 */
export function RouteNotFound() {
  const pathname = usePathname()
  const back = getErrorBackTarget(pathname)

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">Az oldal nem található</h1>
        <p className="text-sm text-muted-foreground">
          A keresett oldal nem létezik, áthelyezték, vagy nincs jogosultságod megtekinteni. Ellenőrizd a címet, vagy térj vissza a főoldalra.
        </p>
        <div className="pt-1">
          <Link href={back.href} className={buttonVariants({ variant: "default" })}>
            {back.label}
          </Link>
        </div>
      </div>
    </div>
  )
}
