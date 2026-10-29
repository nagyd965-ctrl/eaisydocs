import { LoginShell, EaisyLogo } from "./login-shell"
import { LoginForm } from "./login-form"
import { getSafeRedirectPath } from "@/utils/url"

export default async function LoginPage(props: {
  searchParams: Promise<{ message?: string; next?: string }>
}) {
  const searchParams = await props.searchParams
  // Az eredeti cél (pl. e-mail link) — csak validált, belső útvonalat fogadunk el
  const nextPath = getSafeRedirectPath(searchParams.next) ?? undefined

  return (
    <LoginShell>

        {/* Márka: eai(sy) — a design-rendszer logó-konvenciója szerint */}
        <EaisyLogo />
        <p className="mb-9 text-center text-[13px] text-muted-foreground">
          Iratkezelő és munkaügyi platform
        </p>

        {/* Bejelentkezés kártya */}
        <div className="rounded-2xl border border-border bg-card px-7 pb-7 pt-8">
          <h1 className="text-[17px] font-semibold text-foreground">Bejelentkezés</h1>
          <p className="mb-6 mt-1 text-xs text-muted-foreground">
            Add meg az e-mail címedet és jelszavadat.
          </p>

          <LoginForm message={searchParams?.message} next={nextPath} />
        </div>

        {/* Lábléc */}
        <p className="mt-7 text-center text-[11px] leading-relaxed text-muted-foreground/80">
          © 2026 eaisy · Adatvédelmi tájékoztató · ÁSZF · Kapcsolat
        </p>
    </LoginShell>
  )
}
