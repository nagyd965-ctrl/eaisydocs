"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  const { error, data: authData } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect("/login?message=Hibás e-mail vagy jelszó")
  }

  const { data: profile } = await supabase
    .from("felhasznalo_profil")
    .select("elerheto_modulok, hr_szerepkor")
    .eq("id", authData.user.id)
    .single()

  revalidatePath("/", "layout")

  if (profile?.elerheto_modulok) {
    if (profile.elerheto_modulok.includes("hr") && !profile.elerheto_modulok.includes("docs")) {
      return redirect("/hr/admin")
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
