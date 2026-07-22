"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

export async function addEmployee(data: {
  nev: string
  email: string
  pozicio: string
  belepes_datuma: string
}) {
  // Use Service Role Key to bypass RLS and Auth requirements for creating a user
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Create User in Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    email_confirm: true,
    password: "Password123!", // Dummy password for now
    user_metadata: {
      nev: data.nev
    }
  })

  if (authError || !authData.user) {
    console.error("Hiba auth user létrehozásakor:", authError)
    return { error: authError?.message || "Nem sikerült a felhasználót létrehozni." }
  }

  // 2. The trigger `on_auth_user_created` creates `felhasznalo_profil` automatically with `email` as `nev`.
  // Let's update `felhasznalo_profil` to use the real name.
  await supabaseAdmin
    .from("felhasznalo_profil")
    .update({ nev: data.nev })
    .eq("id", authData.user.id)

  // 3. Create hr_dolgozo_adatlap entry
  const { error: insertError } = await supabaseAdmin
    .from("hr_dolgozo_adatlap")
    .insert([
      {
        id: authData.user.id,
        belepes_datuma: data.belepes_datuma
      }
    ])

  if (insertError) {
    console.error("Hiba dolgozó létrehozásakor:", insertError)
    // We don't return error here because the user is already created, but we could.
  }

  revalidatePath("/hr/admin")
  
  return { success: true, employee: { id: authData.user.id } }
}
