"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { createClient as createStatelessSupabaseClient } from "@supabase/supabase-js"

export interface LoginActionResult {
  ok: boolean
  redirectUrl?: string
  message?: string
  suggestedModule?: "docs" | "hr"
  module?: "docs" | "hr"
  email?: string
}

export async function loginClientAction(input: {
  email: string
  password: string
  targetModule: "docs" | "hr"
  next?: string
}): Promise<LoginActionResult> {
  const { getSafeRedirectPath } = await import("@/utils/url")
  const nextPath = getSafeRedirectPath(input.next || null)
  const targetModule: "docs" | "hr" = input.targetModule === "hr" ? "hr" : "docs"
  const cleanEmail = (input.email || "").trim()
  const password = input.password || ""

  // 1. Előellenőrzés cookie-írás nélkül (stateless klienssel), hogy rossz modul
  // vagy hibás jelszó esetén SOHA ne keletkezzen ütköző Set-Cookie fejléc (signIn + signOut).
  const statelessAuth = createStatelessSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )

  const { error: preAuthErr, data: preAuthData } = await statelessAuth.auth.signInWithPassword({
    email: cleanEmail,
    password,
  })

  if (preAuthErr || !preAuthData?.user) {
    return {
      ok: false,
      message: "Hibás e-mail vagy jelszó",
      module: targetModule,
      email: cleanEmail,
    }
  }

  const adminClient = createStatelessSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )

  const { data: profile } = await adminClient
    .from("felhasznalo_profil")
    .select("elerheto_modulok, hr_szerepkor, hr_modulok, email")
    .eq("id", preAuthData.user.id)
    .maybeSingle()

  const modulok = profile?.elerheto_modulok ?? ["docs"]
  const emailLower = (preAuthData.user.email || (profile as any)?.email || cleanEmail).trim().toLowerCase()
  const isDedicatedManagementUser =
    emailLower === "management@thinkai.hu" ||
    emailLower === "superadmin@thinkai.hu" ||
    modulok.includes("management")

  const hasDocs = modulok.includes("docs")
  const hasHr = modulok.includes("hr")

  // Szigorú munkaterület-ellenőrzés MÉG MIELŐTT bármilyen munkamenet-sütit írnánk:
  if (!isDedicatedManagementUser) {
    if (targetModule === "docs" && !hasDocs) {
      return {
        ok: false,
        message: hasHr
          ? "Ehhez a fiókhoz kizárólag az eaisyHR munkaterület érhető el."
          : "Ehhez a fiókhoz nincs engedélyezve az eaisyDocs munkaterület.",
        module: "docs",
        suggestedModule: hasHr ? "hr" : undefined,
        email: cleanEmail,
      }
    }

    if (targetModule === "hr" && !hasHr) {
      return {
        ok: false,
        message: hasDocs
          ? "Ehhez a fiókhoz kizárólag az eaisyDocs munkaterület érhető el."
          : "Ehhez a fiókhoz nincs engedélyezve az eaisyHR munkaterület.",
        module: "hr",
        suggestedModule: hasDocs ? "docs" : undefined,
        email: cleanEmail,
      }
    }
  }

  // 2. Jogosult munkaterület -> most állítjuk be a valódi SSR munkamenet sütiket
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  })

  if (error) {
    return {
      ok: false,
      message: "Hibás e-mail vagy jelszó",
      module: targetModule,
      email: cleanEmail,
    }
  }

  const { cookies } = await import("next/headers")
  const cookieStore = await cookies()

  if (isDedicatedManagementUser) {
    cookieStore.set("eaisydocs_mgmt_session", preAuthData.user.id, {
      path: "/",
      maxAge: 60 * 60 * 12,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
    revalidatePath("/", "layout")
    return {
      ok: true,
      redirectUrl: "/management",
    }
  } else {
    // Normál felhasználónál töröljük az esetleges korábbi management sütit
    cookieStore.delete("eaisydocs_mgmt_session")
  }

  const hrModules = Array.isArray((profile as any)?.hr_modulok)
    ? ((profile as any).hr_modulok as string[])
    : []
  const isHrStaff =
    [
      "hr_munkatars",
      "hr_vezeto",
      "admin",
      "rendszergazda",
      "auditor",
    ].includes(profile?.hr_szerepkor || "") || hrModules.includes("admin")
  const hrDefaultPath = isHrStaff ? "/hr/admin" : "/hr"

  let destinationPath = targetModule === "hr" ? hrDefaultPath : "/"

  if (nextPath && nextPath !== "/" && nextPath !== "/management") {
    const isNextHr = nextPath.startsWith("/hr")
    if (isNextHr && hasHr && targetModule === "hr") {
      destinationPath = nextPath
    } else if (!isNextHr && hasDocs && targetModule === "docs") {
      destinationPath = nextPath
    }
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
    return {
      ok: true,
      redirectUrl: `/login/mfa-verify?redirectTo=${encodeURIComponent(destinationPath)}`,
    }
  }

  revalidatePath("/", "layout")
  return {
    ok: true,
    redirectUrl: destinationPath,
  }
}

export async function login(formData: FormData) {
  const rawTargetModule = formData.get("targetModule") as string | null
  const targetModule: "docs" | "hr" = rawTargetModule === "hr" ? "hr" : "docs"
  const email = (formData.get("email") as string) || ""
  const password = (formData.get("password") as string) || ""
  const next = (formData.get("next") as string | null) || undefined

  const res = await loginClientAction({
    email,
    password,
    targetModule,
    next,
  })

  if (!res.ok) {
    const params = new URLSearchParams()
    if (res.message) params.set("message", res.message)
    params.set("module", res.module || targetModule)
    if (res.suggestedModule) params.set("suggestedModule", res.suggestedModule)
    if (res.email) params.set("email", res.email)
    if (next) params.set("next", next)
    redirect(`/login?${params.toString()}`)
  }

  redirect(res.redirectUrl || "/")
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
