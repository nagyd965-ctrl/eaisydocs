"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { getSafeRedirectPath } = await import("@/utils/url")
  // Explicit cél (pl. e-mail link): belépés után ide visszavezetni — csak
  // validált, belső útvonalat fogadunk el (open-redirect védelem).
  const nextPath = getSafeRedirectPath(formData.get("next") as string | null)

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  const { error, data: authData } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect("/login?message=Hibás e-mail vagy jelszó")
  }

  // MFA ellenőrzés — ha a user kétlépcsős azonosítást állított be,
  // az AAL szint aal1 → aal2 átmenetet igényel, átirányítjuk a kód bekérő oldalra
  // (az eredeti célt átvisszük, hogy a kód beadása után is oda jusson)
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
    redirect(
      nextPath
        ? `/login/mfa-verify?redirectTo=${encodeURIComponent(nextPath)}`
        : "/login/mfa-verify"
    )
  }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("elerheto_modulok, hr_szerepkor")
    .eq("id", authData.user.id)
    .single()

  revalidatePath("/", "layout")

  // Ha a felhasználó konkrét oldalra indult (pl. értesítési link), belépés után oda visszavezetni.
  // Jogosultsági esetén az oldal saját védelme továbbirányít — itt nem kell duplikálni.
  if (nextPath) {
    redirect(nextPath)
  }

  if (profile?.elerheto_modulok) {
    if (profile.elerheto_modulok.includes("hr") && !profile.elerheto_modulok.includes("docs")) {
      const isHrStaff = ["hr_munkatars", "hr_vezeto", "admin", "rendszergazda", "auditor"].includes(profile.hr_szerepkor || "")
      return redirect(isHrStaff ? "/hr/admin" : "/hr")
    }
  }

  // Alapértelmezett bejelentkezés (eaisyDocs)
  redirect("/")
}

export async function loginWithProvider(provider: "google" | "azure") {
  const { headers } = await import("next/headers")
  const supabase = await createClient()

  const headersList = await headers()
  const host = headersList.get("host") || "localhost:3000"
  const proto = headersList.get("x-forwarded-proto") || "http"
  const origin = `${proto}://${host}`

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
      // Az Azure AD-hoz Entra ID specifikus beállítások
      ...(provider === "azure" ? {
        scopes: "openid profile email"
      } : {})
    }
  })

  if (error) {
    console.error(`OAuth error for ${provider}:`, error.message)
    redirect(`/login?message=${encodeURIComponent(`Bejelentkezési hiba: ${error.message}`)}`)
  }

  if (data?.url) {
    redirect(data.url)
  }

  redirect("/login?message=Nem sikerült elindítani az SSO azonosítást.")
}

/**
 * Elfelejtett jelszó: jelszó-visszaállító link kérése.
 *
 * A Supabase beépített (angol) e-mail sablonját kerüljük: az admin API
 * `generateLink` hívása CSAK a recovery linket generálja e-mail küldése nélkül,
 * a magyar nyelvű levelet a saját Brevo-s mailerünk küldi ki
 * (`buildHtmlEmail` sablonnal, ertesites_naplo audit naplózással).
 *
 * Biztonsági megjegyzés: nem áruljuk el, hogy létezik-e a megadott fiók —
 * nem létező e-mail cím esetén is ugyanaz az általános sikerüzenet jelenik meg.
 */
export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/login/forgot-password?message=Kérjük, adj meg egy érvényes e-mail címet.")
  }

  // Az e-mailben szereplő link MINDIG az éles (Vercel) domainre mutasson —
  // a localhost link a címzett gépén kívül sehol nem nyílna meg.
  // A getBaseUrl() localhoston a production URL-re esik vissza (utils/url.ts),
  // éles környezetben pedig a saját domainjét adja vissza.
  const { getBaseUrl } = await import("@/utils/url")
  const redirectTo = `${getBaseUrl()}/auth/callback?next=/auth/set-password`

  // 1) Recovery link generálása service role kulccsal (e-mail küldése NINCS bekötve)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    console.error("[ForgotPassword] Hiányzó SUPABASE_SERVICE_ROLE_KEY")
    redirect("/login/forgot-password?message=Az e-mail kiküldése most nem lehetséges. Kérjük, próbáld újra később.")
  }

  const { createClient: createSupabaseAdmin } = await import("@supabase/supabase-js")
  const adminClient = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  })

  if (linkError || !linkData?.properties?.action_link) {
    // Nem létező fiók vagy egyéb hiba — enumeration-védelem miatt általános üzenet.
    console.error("[ForgotPassword] generateLink hiba:", linkError?.status, linkError?.message)
    redirect("/login/forgot-password?sent=1")
  }

  // 2) Saját magyar e-mail küldése a Brevo-s mailerrel
  const { sendNotificationEmail, buildHtmlEmail } = await import("@/utils/mailer")

  // FONTOS: a Supabase által adott `action_link` (a /auth/v1/verify végpontra mutat) PKCE
  // alapú projektben "otp_expired / Email link is invalid" hibával elutasításra kerül,
  // mert az admin-generálta linkhez nem tartozik code_challenge. Ezért a `hashed_token`-t
  // közvetlenül a SAJÁT callbackünknek adjuk át query paraméterben — a /auth/callback
  // ott hívja meg a verifyOtp({ type: 'recovery', token_hash }) függvényt, ami működik.
  const hashedToken = linkData.properties.hashed_token
  const actionLink = `${redirectTo}&token_hash=${encodeURIComponent(hashedToken)}&type=recovery`

  const html = buildHtmlEmail(
    "Jelszó visszaállítása",
    "Az e-mail címedhez tartozó fiókhoz jelszó-visszaállítást kezdeményeztek. " +
      "A lenti gombra kattintva nyithatod meg a jelszó beállítását. A link egyszer használható és korlátozott ideig érvényes.",
    [{ label: "Fiók e-mail címe", value: email }],
    "Új jelszó beállítása",
    actionLink,
    "eaisyDocs"
  )

  const result = await sendNotificationEmail({
    to: email,
    subject: "Jelszó visszaállítása — eaisy",
    html,
    senderName: "eaisy Rendszer",
    modul: "docs",
  })

  if (!result.success) {
    console.error("[ForgotPassword] Brevo küldési hiba:", result.error)
    redirect("/login/forgot-password?message=Az e-mail kiküldése sikertelen volt. Kérjük, próbáld újra pár perc múlva.")
  }

  redirect("/login/forgot-password?sent=1")
}
