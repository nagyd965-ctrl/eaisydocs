import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // Safe redirect path validation (prevent open redirect vulnerabilities)
  const rawNext = searchParams.get("next") ?? "/"
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host")
      const isLocalEnv = process.env.NODE_ENV === "development"
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
    console.error("[AuthCallback] Error exchanging code for session:", error.message)
  }

  // Ha a kód hiányzik vagy érvénytelen, hibaüzenettel a bejelentkezőre irányítjuk
  return NextResponse.redirect(`${origin}/login?message=Nem%20sikerült%20az%20egyszeri%20bejelentkezés`)
}
