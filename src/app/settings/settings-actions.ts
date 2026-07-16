"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function getUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Nem vagy bejelentkezve" }
  }

  const { data: profile, error } = await supabase
    .from("felhasznalo_profil")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error) {
    return { error: error.message }
  }

  return { profile, email: user.email }
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Nem vagy bejelentkezve" }
  }

  const rpcData: any = {}
  
  if (formData.has("nev")) rpcData.p_nev = formData.get("nev") as string
  if (formData.has("pozicio")) rpcData.p_pozicio = formData.get("pozicio") as string
  if (formData.has("ceg_neve")) rpcData.p_ceg_neve = formData.get("ceg_neve") as string
  
  const idotullepes = formData.get("munkamenet_idotullepes")
  if (idotullepes) {
    rpcData.p_munkamenet_idotullepes = parseInt(idotullepes as string, 10)
  }

  if (Object.keys(rpcData).length === 0) return { success: true }

  const { error } = await supabase.rpc('update_own_profile', rpcData)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function getTeamMembers() {
  const supabase = await createClient()
  
  const { data: profiles, error } = await supabase
    .from("felhasznalo_profil")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { profiles }
}

export async function createNewUser(formData: FormData) {
  const email = (formData.get("email") as string)?.trim()
  const nev = (formData.get("nev") as string)?.trim()
  const password = formData.get("password") as string
  const role = formData.get("role") as string
  const clearance = formData.get("clearance") as string

  if (!email || !password) {
    return { error: "Email és jelszó kötelező!" }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { error: "Hiányzik a SUPABASE_SERVICE_ROLE_KEY a .env.local fájlból! Kérlek, add hozzá a kulcsot a háttérben történő felhasználó létrehozásához." }
  }

  // Create admin client using the service role key to bypass RLS and avoid sending emails
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Use the Admin API to create the user silently (email_confirm: true bypasses the email sending)
  const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (signUpError) {
    return { error: signUpError.message }
  }

  const newUserId = signUpData.user?.id
  if (!newUserId) {
    return { error: "Nem sikerült létrehozni a felhasználót." }
  }

  // Update profile with the provided full name if it exists
  if (nev) {
    await supabaseAdmin
      .from("felhasznalo_profil")
      .update({ nev })
      .eq("id", newUserId)
  }

  // Use the logged in admin's client to call the RPC and set roles
  const supabase = await createClient()
  const { error: rpcError } = await supabase.rpc('admin_update_user_role', {
    target_user_id: newUserId,
    new_role: role,
    new_minosites: clearance
  })

  if (rpcError) {
    return { error: "Felhasználó létrejött, de a jogosultságok beállítása sikertelen: " + rpcError.message }
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function updateUserPassword(formData: FormData) {
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!password || !confirmPassword) {
    return { error: "Minden mező kitöltése kötelező!" }
  }

  if (password !== confirmPassword) {
    return { error: "A megadott jelszavak nem egyeznek!" }
  }

  if (password.length < 6) {
    return { error: "A jelszónak legalább 6 karakter hosszúnak kell lennie!" }
  }

  const supabase = await createClient()
  
  const { error } = await supabase.auth.updateUser({
    password: password
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function updateUserRole(userId: string, newRole: string, currentMinosites: string, departmentId: string | null) {
  const supabase = await createClient()
  const { error: rpcError } = await supabase.rpc('admin_update_user_profile', {
    target_user_id: userId,
    new_role: newRole,
    new_minosites: currentMinosites,
    new_department_id: departmentId
  })

  if (rpcError) {
    return { error: rpcError.message }
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function getDepartments() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("szervezeti_egyseg")
    .select("*")
    .order("nev")

  if (error) {
    return []
  }
  return data
}

export async function createDepartment(formData: FormData) {
  const nev = formData.get("nev") as string
  if (!nev) return { error: "Név megadása kötelező!" }

  const supabase = await createClient()
  const { error } = await supabase
    .from("szervezeti_egyseg")
    .insert({ nev })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function deleteDepartment(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("szervezeti_egyseg")
    .delete()
    .eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function deleteUser(userId: string) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { error: "Hiányzik a SUPABASE_SERVICE_ROLE_KEY a .env.local fájlból!" }
  }

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  )

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  
  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: true }
}
