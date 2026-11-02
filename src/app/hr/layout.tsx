import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"

export const metadata: Metadata = {
  title: "eaisyHR - Humánügyviteli rendszer",
  description: "Egységes vállalati humánügyviteli és munkaidő-nyilvántartó rendszer",
}

export default async function HRLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/login")
  }

  // Jogosultság (Modul) ellenőrzése az adatbázisból
  const { data } = await supabase
    .from("felhasznalo_profil")
    .select("elerheto_modulok")
    .eq("id", user.id)
    .single()

  if (!data?.elerheto_modulok?.includes("hr")) {
    // Ha nincs HR modulja, azonnal visszadobjuk a kezdőlapra (eaisyDocs)
    redirect("/")
  }

  // Ha minden rendben, jöhetnek az aloldalak
  return <>{children}</>
}
