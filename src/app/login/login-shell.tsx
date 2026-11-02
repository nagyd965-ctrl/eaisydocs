/**
 * Közös "login" héj: középre zárt elrendezés a lágy gradiens-mosás háttérrel
 * (design: docs/design/login-redesign-v2 V16 — .login-shell-bg a globals.css-ben,
 * világos és sötét módban külön hangolva).
 * A login, az elfelejtett-jelszó és a jelszó-beállító oldalak közös kerete.
 */
export function LoginShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="login-shell-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
      <div className="relative z-10 w-full max-w-[430px]">{children}</div>
    </div>
  )
}

/**
 * Platform logó a design-rendszer konvenciója szerint:
 * e (halvány) + ai (teal, kiemelt) + sy (halvány) + opcionális modul utótag (Docs / HR)
 */
export function EaisyLogo({ module }: { module?: "docs" | "hr" }) {
  return (
    <div className="mb-2 text-center text-[28px] leading-none tracking-tight">
      <span className="font-medium text-foreground/80">e</span>
      <span className="font-semibold text-primary">ai</span>
      <span className="font-medium text-foreground/80">sy</span>
      {module === "docs" && (
        <span className="font-semibold text-foreground">Docs</span>
      )}
      {module === "hr" && (
        <span className="font-semibold text-foreground">HR</span>
      )}
    </div>
  )
}
