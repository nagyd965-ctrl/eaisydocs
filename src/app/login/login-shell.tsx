/**
 * Közös "login" héj: középre zárt elrendezés a dekoratív teal ragyogással
 * és vonalmintával (design: docs/design/login-redesign V2b).
 * A login, az elfelejtett-jelszó és a jelszó-beállító oldalak közös kerete.
 */
export function LoginShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-12">

      {/* Dekoratív háttér: teal ragyogás */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-220px] h-[480px] w-[900px] max-w-none -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(13,148,136,0.10)_0%,rgba(13,148,136,0.035)_45%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(20,212,184,0.16)_0%,rgba(20,212,184,0.06)_45%,transparent_70%)]"
      />
      {/* Dekoratív háttér: vízszintes vonalminta */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_55px,rgba(0,0,0,0.02)_56px)] dark:bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_55px,rgba(255,255,255,0.03)_56px)]"
      />

      <div className="relative z-10 w-full max-w-[400px]">{children}</div>
    </div>
  )
}

/**
 * Platform logó a design-rendszer konvenciója szerint:
 * e (halvány) + ai (teal, kiemelt) + sy (halvány)
 */
export function EaisyLogo() {
  return (
    <div className="mb-2.5 text-center text-[26px] leading-none tracking-tight">
      <span className="font-medium text-foreground/80">e</span>
      <span className="font-bold text-primary">ai</span>
      <span className="font-medium text-foreground/80">sy</span>
    </div>
  )
}
