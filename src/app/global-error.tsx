"use client"

import "./globals.css"

/**
 * Végső tartalék hibaoldal: akkor jelenik meg, ha magában a gyökér layoutban van hiba.
 * Ilyenkor a téma-, cég- és sidebar-szolgáltatók nem elérhetők, ezért ez a nézet
 * szándékosan függőségmentes: natív elemek és a globális stílus tokenjei.
 * Teljes oldalbetöltést használ (<a>), mert a kliensoldali router ilyenkor megbízhatatlan lehet.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <html lang="hu">
      <body className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <title>Váratlan hiba - eaisyDocs</title>
        <div className="w-full max-w-md space-y-4">
          <h1 className="text-xl font-semibold tracking-tight">Váratlan hiba történt</h1>
          <p className="text-sm text-muted-foreground">
            Az alkalmazás nem tudott betöltődni. Próbáld újra, és ha a hiba ismétlődik, add meg az alábbi hibakódot a rendszergazdának.
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
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
            >
              Újrapróbálás
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- szándékos teljes oldalbetöltés: a gyökér layout hibás, a kliensoldali router nem megbízható */}
            <a
              href="/"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Vissza az áttekintéshez
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
