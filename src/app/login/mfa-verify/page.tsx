import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { MfaVerifyForm } from "@/components/mfa-verify-form"

export default async function MfaVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>
}) {
  const { redirectTo } = await searchParams
  const supabase = await createClient()

  // Ha nincs bejelentkezve egyáltalán, visszük a login-ra
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Megnézzük, hogy az AAL szint valóban MFA-t igényel-e
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  
  // Ha már AAL2 szinten van (MFA teljesítve), nincs szükség erre az oldalra
  if (aal?.currentLevel === "aal2") {
    redirect(redirectTo ?? "/")
  }

  // Lekérjük a TOTP faktort a challengehez
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totpFactor = factors?.totp?.find((f: any) => f.status === "verified")

  // Ha nincs aktív TOTP faktor de mégis ide kerül, irányítsuk vissza
  if (!totpFactor) redirect(redirectTo ?? "/")

  return <MfaVerifyForm factorId={totpFactor.id} redirectTo={redirectTo ?? "/"} />
}
