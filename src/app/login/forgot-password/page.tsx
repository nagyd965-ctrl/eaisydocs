import Link from "next/link"
import { requestPasswordReset } from "../actions"
import { LoginShell, EaisyLogo } from "../login-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default async function ForgotPasswordPage(props: {
  searchParams: Promise<{ message?: string; sent?: string }>
}) {
  const searchParams = await props.searchParams
  const sent = searchParams.sent === "1"

  return (
    <LoginShell>
      <EaisyLogo />
      <p className="mb-9 text-center text-[13px] text-muted-foreground">
        Iratkezelő és munkaügyi platform
      </p>

      <div className="rounded-2xl border border-border bg-card px-7 pb-7 pt-8">
        {sent ? (
          <div className="text-center">
            <h1 className="text-[17px] font-semibold text-foreground">
              Elküldtük az e-mailt
            </h1>
            <p className="mb-6 mt-2 text-xs leading-relaxed text-muted-foreground">
              Ha a megadott e-mail cím szerepel a rendszerünkben, hamarosan
              megérkezik a jelszó-visszaállító link. Kérjük, nézd meg a
              beérkezett üzenetek mellett a levélszemét mappát is.
            </p>
            <p className="mb-6 text-[11px] leading-relaxed text-muted-foreground/80">
              A link egyszer használható és korlátozott ideig érvényes.
            </p>
            <Link href="/login">
              <Button variant="outline" className="h-11 w-full">
                Vissza a bejelentkezéshez
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-[17px] font-semibold text-foreground">
              Elfelejtett jelszó
            </h1>
            <p className="mb-6 mt-1 text-xs leading-relaxed text-muted-foreground">
              Add meg a fiókodhoz tartozó e-mail címet, és elküldjük a
              jelszó-visszaállító linket.
            </p>

            <form action={requestPasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail cím</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="te@ceged.hu"
                  autoComplete="username"
                  required
                  autoFocus
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
                Új jelszó kérése
              </Button>
            </form>

            <p className="mt-5 text-center">
              <Link
                href="/login"
                className="text-xs font-medium text-primary hover:underline"
              >
                Vissza a bejelentkezéshez
              </Link>
            </p>
          </>
        )}
      </div>

      <p className="mt-7 text-center text-[11px] leading-relaxed text-muted-foreground/80">
        © 2026 eaisy · Adatvédelmi tájékoztató · ÁSZF · Kapcsolat
      </p>
    </LoginShell>
  )
}
