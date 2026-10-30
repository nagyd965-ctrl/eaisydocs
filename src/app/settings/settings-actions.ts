"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

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

  const telefon = formData.get("telefon")
  if (telefon !== null) {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { error: telefonError } = await supabaseAdmin
      .from("felhasznalo_profil")
      .update({ telefon: telefon as string })
      .eq("id", user.id)
    if (telefonError) {
      return { error: telefonError.message }
    }
  }

  if (Object.keys(rpcData).length > 0) {
    const { error } = await supabase.rpc('update_own_profile', rpcData)

    if (error) {
      return { error: error.message }
    }
  }

  revalidatePath("/", "layout")
  return { success: true }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Nem vagy bejelentkezve" }

  const file = formData.get("avatar") as File
  if (!file || file.size === 0) return { error: "Nincs fájl kiválasztva" }

  if (file.size > 5 * 1024 * 1024) return { error: "A fájl maximum 5MB lehet" }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { error: "Csak JPG, PNG vagy WebP formátum engedélyezett" }
  }

  const fileExt = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"
  const filePath = `${user.id}/avatar.${fileExt}`

  const arrayBuffer = await file.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, uint8Array, { contentType: file.type, upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath)

  // Frissítés a profil táblában (admin klienssel, mivel az RPC nem tartalmazza)
  const { createClient: createAdminClient } = await import("@supabase/supabase-js")
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error: updateError } = await supabaseAdmin
    .from("felhasznalo_profil")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id)

  if (updateError) return { error: updateError.message }

  revalidatePath("/", "layout")
  return { success: true, avatarUrl: publicUrl }
}

export async function getTeamMembers(targetCompanyId?: string | null) {
  const supabase = await createClient()
  const { getActiveCompanyIdServer } = await import("@/utils/company-server")
  const activeCompanyId = targetCompanyId !== undefined ? targetCompanyId : (await getActiveCompanyIdServer())

  let memberUserIds: string[] = []
  const memberDocsRolesMap = new Map<string, string>()

  if (activeCompanyId) {
    const { data: cm } = await supabase
      .from("company_members")
      .select("user_id, docs_szerepkor")
      .eq("company_id", activeCompanyId)

    if (cm) {
      memberUserIds = cm.map(m => m.user_id)
      cm.forEach(m => {
        if (m.docs_szerepkor) memberDocsRolesMap.set(m.user_id, m.docs_szerepkor)
      })
    }
  }

  let query = supabase
    .from("felhasznalo_profil")
    .select("*")
    .contains("elerheto_modulok", ["docs"])
    .order("nev")

  if (activeCompanyId) {
    query = query.in(
      "id",
      memberUserIds.length > 0 ? memberUserIds : ["00000000-0000-0000-0000-000000000000"]
    )
  }

  const { data: profiles, error } = await query

  if (error) {
    return { error: error.message }
  }

  const scopedProfiles = (profiles || []).map(p => ({
    ...p,
    docs_szerepkor: memberDocsRolesMap.get(p.id) || p.docs_szerepkor || "ugyintezo"
  }))

  return { profiles: scopedProfiles }
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

  // ── ŐRBLOKK (A-097): csak bejelentkezett, aktív céghez tartozó admin hozhat létre felhasználót ──
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Nincs bejelentkezve." }
  }

  const { getActiveCompanyIdServer } = await import("@/utils/company-server")
  const activeCompanyId = await getActiveCompanyIdServer()
  if (!activeCompanyId) {
    return { error: "Nincs kiválasztott aktív cég." }
  }

  const { data: callerMembership } = await supabase
    .from("company_members")
    .select("role, docs_szerepkor")
    .eq("company_id", activeCompanyId)
    .eq("user_id", user.id)
    .maybeSingle()

  const isCompanyAdmin =
    callerMembership?.role === "owner" ||
    callerMembership?.role === "admin" ||
    callerMembership?.docs_szerepkor === "admin"
  if (!isCompanyAdmin) {
    return { error: "Csak a cég adminja hozhat létre új felhasználót." }
  }

  // ── Szerepkör és minősítés validáció: csak az űrlap által kínált értékek fogadhatók el ──
  const ALLOWED_ROLES = ["admin", "rendszergazda", "iktato", "vezeto", "ugyintezo", "betekinto", "auditor"]
  const ALLOWED_CLEARANCES = ["nyilt", "belso", "bizalmas", "szigoruan_bizalmas"]
  if (!ALLOWED_ROLES.includes(role)) {
    return { error: "Érvénytelen szerepkör." }
  }
  if (!ALLOWED_CLEARANCES.includes(clearance)) {
    return { error: "Érvénytelen biztonsági minősítés." }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { error: "Hiányzik a SUPABASE_SERVICE_ROLE_KEY a .env.local fájlból! Kérlek, add hozzá a kulcsot a háttérben történő felhasználó létrehozásához." }
  }

  // Create admin client using the service role key to bypass RLS and avoid sending emails
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

  // ── CÉG-TAGSÁG: az új felhasználó az aktív cég tagja lesz (company_members),
  //    ellenkező esetben árva fiók keletkezne — se láthatóság, se hozzáférés nélkül ──
  const { error: memberError } = await supabaseAdmin
    .from("company_members")
    .insert({
      company_id: activeCompanyId,
      user_id: newUserId,
      role: "member",
      docs_szerepkor: role,
    })

  if (memberError) {
    return { error: "Felhasználó létrejött, de a céghez rendelés sikertelen: " + memberError.message }
  }

  // Use the logged in admin's client to call the RPC and set roles
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
  const { data: { user } } = await supabase.auth.getUser()

  if (user && user.id === userId && !['admin', 'rendszergazda'].includes(newRole)) {
    return { error: "Saját adminisztrátori szerepkörödet nem vonhatod vissza, hogy elkerüld a rendszerből való kizáródást!" }
  }

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
  const { getActiveCompanyIdServer } = await import("@/utils/company-server")
  const activeCompanyId = await getActiveCompanyIdServer()

  let query = supabase
    .from("szervezeti_egyseg")
    .select("*, vezeto:felhasznalo_profil!vezeto_id(id, nev, avatar_url, docs_szerepkor, max_minosites)")
    .order("nev")

  if (activeCompanyId) {
    query = query.or(`company_id.eq.${activeCompanyId},company_id.is.null`)
  }

  const { data, error } = await query

  if (error) {
    console.error("[getDepartments] Error:", error)
    return []
  }
  return data || []
}

export async function setDepartmentLeader(departmentId: string, leaderId: string | null) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return { error: "Hiányzik a SUPABASE_SERVICE_ROLE_KEY." }

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await supabaseAdmin
    .from("szervezeti_egyseg")
    .update({ vezeto_id: leaderId })
    .eq("id", departmentId)

  if (error) return { error: "Hiba a vezető beállításakor: " + error.message }

  // Ha új vezetőt jelölünk ki, győződjünk meg róla, hogy be van osztva és a szerepköre legalább vezeto
  if (leaderId) {
    const { data: userProf } = await supabaseAdmin
      .from("felhasznalo_profil")
      .select("docs_szerepkor, szervezeti_egyseg_id")
      .eq("id", leaderId)
      .single()

    if (userProf) {
      const updates: any = {}
      if (!userProf.szervezeti_egyseg_id) {
        updates.szervezeti_egyseg_id = departmentId
      }
      if (userProf.docs_szerepkor === 'ugyintezo') {
        updates.docs_szerepkor = 'vezeto'
      }
      if (Object.keys(updates).length > 0) {
        await supabaseAdmin
          .from("felhasznalo_profil")
          .update(updates)
          .eq("id", leaderId)
      }
    }
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function createDepartment(formData: FormData) {
  const nev = (formData.get("nev") as string)?.trim()
  if (!nev) return { error: "Név megadása kötelező!" }

  const szuloIdRaw = formData.get("szulo_id") as string
  const szulo_id = !szuloIdRaw || szuloIdRaw === "__none__" || szuloIdRaw === "none" ? null : szuloIdRaw
  const prefixRaw = (formData.get("iktato_prefix") as string)?.trim().toUpperCase()
  const iktato_prefix = prefixRaw ? prefixRaw : null
  const vezetoIdRaw = formData.get("vezeto_id") as string
  const vezeto_id = !vezetoIdRaw || vezetoIdRaw === "__none__" || vezetoIdRaw === "none" ? null : vezetoIdRaw

  const supabase = await createClient()
  const { getActiveCompanyIdServer } = await import("@/utils/company-server")
  const activeCompanyId = await getActiveCompanyIdServer()

  const { data: newDept, error } = await supabase
    .from("szervezeti_egyseg")
    .insert({
      nev,
      szulo_id,
      iktato_prefix,
      vezeto_id,
      company_id: activeCompanyId || null
    })
    .select("id")
    .single()

  if (error) {
    return { error: error.message }
  }

  // Ha adtunk meg vezetőt, szinkronizáljuk a vezetői státuszt
  if (vezeto_id && newDept?.id) {
    await setDepartmentLeader(newDept.id, vezeto_id)
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function updateDepartment(id: string, formData: FormData) {
  const nev = (formData.get("nev") as string)?.trim()
  if (!nev) return { error: "Név megadása kötelező!" }

  const szuloIdRaw = formData.get("szulo_id") as string
  const szulo_id = !szuloIdRaw || szuloIdRaw === "__none__" || szuloIdRaw === "none" || szuloIdRaw === id ? null : szuloIdRaw
  const prefixRaw = (formData.get("iktato_prefix") as string)?.trim().toUpperCase()
  const iktato_prefix = prefixRaw ? prefixRaw : null
  const vezetoIdRaw = formData.get("vezeto_id") as string
  const vezeto_id = !vezetoIdRaw || vezetoIdRaw === "__none__" || vezetoIdRaw === "none" ? null : vezetoIdRaw

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return { error: "Hiányzik a konfiguráció." }

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await supabaseAdmin
    .from("szervezeti_egyseg")
    .update({
      nev,
      szulo_id,
      iktato_prefix,
      vezeto_id
    })
    .eq("id", id)

  if (error) {
    return { error: error.message }
  }

  if (vezeto_id) {
    await setDepartmentLeader(id, vezeto_id)
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function deleteDepartment(id: string) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return { error: "Hiányzik a konfiguráció." }

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Gyermek egységek szülőjét nullázzuk a szétesés elkerülésére
  await supabaseAdmin
    .from("szervezeti_egyseg")
    .update({ szulo_id: null })
    .eq("szulo_id", id)

  // 2. Felhasználók szervezeti_egyseg_id-ját nullázzuk
  await supabaseAdmin
    .from("felhasznalo_profil")
    .update({ szervezeti_egyseg_id: null })
    .eq("szervezeti_egyseg_id", id)

  // 3. Törlés
  const { error } = await supabaseAdmin
    .from("szervezeti_egyseg")
    .delete()
    .eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function removeUserFromDepartment(userId: string, departmentId: string) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return { error: "Hiányzik a konfiguráció." }

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await supabaseAdmin
    .from("felhasznalo_profil")
    .update({ szervezeti_egyseg_id: null })
    .eq("id", userId)
    .eq("szervezeti_egyseg_id", departmentId)

  if (error) return { error: "Hiba a felhasználó eltávolításakor: " + error.message }

  // Ha ő volt a kijelölt vezető, nullázzuk a vezeto_id-t is
  await supabaseAdmin
    .from("szervezeti_egyseg")
    .update({ vezeto_id: null })
    .eq("id", departmentId)
    .eq("vezeto_id", userId)

  revalidatePath("/settings")
  return { success: true }
}

export async function deleteUser(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Nincs bejelentkezett felhasználó." }
  }

  // Ellenőrizzük, hogy a hívó valóban adminisztrátor vagy rendszergazda-e
  const { data: callerProfile } = await supabase
    .from("felhasznalo_profil")
    .select("szerepkor, docs_szerepkor")
    .eq("id", user.id)
    .single()

  const isAdmin =
    callerProfile?.szerepkor === "admin" ||
    callerProfile?.docs_szerepkor === "admin" ||
    callerProfile?.szerepkor === "rendszergazda" ||
    callerProfile?.docs_szerepkor === "rendszergazda"

  if (!isAdmin) {
    return { error: "Kizárólag rendszergazda vagy adminisztrátor törölhet felhasználót." }
  }

  // Saját magát nem törölheti
  if (user.id === userId) {
    return { error: "Saját fiókodat nem törölheted ezen a felületen." }
  }

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

export async function toggleNotificationRule(id: string, active: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: "Nem vagy bejelentkezve" }

  const { error } = await supabase
    .from("ertesitesi_szabaly")
    .update({ aktiv: active })
    .eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: true }
}

export async function addUsersToDepartment(departmentId: string, userIds: string[]) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return { error: "Hiányzik a SUPABASE_SERVICE_ROLE_KEY." }

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await supabaseAdmin
    .from("felhasznalo_profil")
    .update({ szervezeti_egyseg_id: departmentId })
    .in("id", userIds)

  if (error) return { error: "Hiba történt a felhasználók hozzáadásakor: " + error.message }

  revalidatePath("/settings")
  return { success: true }
}

export const assignUsersToDepartment = addUsersToDepartment

export async function updateRuleChannels(id: string, channels: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: "Nem vagy bejelentkezve" }

  // Jogosultság ellenőrzése
  const { data: profile } = await supabase.from("felhasznalo_profil").select("szerepkor, docs_szerepkor").eq("id", user.id).single()
  if (!profile || (profile.szerepkor !== 'admin' && profile.docs_szerepkor !== 'admin' && profile.szerepkor !== 'rendszergazda' && profile.docs_szerepkor !== 'rendszergazda')) {
    return { error: "Nincs adminisztrátor jogosultságod a művelethez." }
  }

  // Szervíz kulcs használata RLS megkerüléséhez (mivel az RLS jelenleg rosszul van beállítva a DB-ben)
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await supabaseAdmin
    .from("ertesitesi_szabaly")
    .update({ csatorna: channels })
    .eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: true }
}

