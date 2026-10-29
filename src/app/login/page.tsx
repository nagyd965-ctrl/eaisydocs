import Link from "next/link"
import { login } from "./actions"
import { LoginShell, EaisyLogo } from "./login-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default async function LoginPage(props: {
  searchParams: Promise<{ message?: string }>
}) {
  const searchParams = await props.searchParams

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

          <form action={login} className="space-y-4">
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
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>

            {searchParams?.message && (
              <p
                role="alert"
                className="pt-1 text-center text-sm font-medium text-destructive"
              >
                {searchParams.message}
              </p>
            )}

            <Button type="submit" className="mt-1.5 h-11 w-full">
              Bejelentkezés
            </Button>
          </form>
        </div>

        {/* Lábléc */}
        <p className="mt-7 text-center text-[11px] leading-relaxed text-muted-foreground/80">
          © 2026 eaisy · Adatvédelmi tájékoztató · ÁSZF · Kapcsolat
        </p>
    </LoginShell>
  )
}
