"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { SELECTED_COMPANY_COOKIE, getUserCompaniesServer } from "@/utils/company-server"
import type { Company } from "@/types/company"

/**
 * Cégváltás szerverakció.
 * Beállítja az aktív cég azonosítóját a cookie-ban, és újrahívja a teljes layout cache-t.
 */
export async function switchCompanyAction(companyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Nincs bejelentkezett felhasználó." }
  }

  // Ellenőrizzük, hogy a felhasználó valóban tagja-e ennek a cégnek
  const { data: access } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .maybeSingle()

  if (!access) {
    return { success: false, error: "Nincs jogosultságod ehhez a céghez." }
  }

  const cookieStore = await cookies()
  cookieStore.set(SELECTED_COMPANY_COOKIE, companyId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 év
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })

  revalidatePath("/", "layout")
  return { success: true, companyId }
}

/**
 * Új cég létrehozása.
 * A DB trigger automatikusan beállítja a felhasználót tulajdonosként (owner).
 */
export async function createCompanyAction(data: {
  name: string
  taxNumber?: string
  address?: string
  representativeName?: string
  phone?: string
  countryCode?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Nincs bejelentkezett felhasználó." }
  }

  if (!data.name || data.name.trim().length === 0) {
    return { success: false, error: "A cégnév megadása kötelező." }
  }

  const cleanTax = data.taxNumber?.trim() || null

  const { data: newCompany, error } = await supabase
    .from("companies")
    .insert({
      name: data.name.trim(),
      tax_number: cleanTax,
      address: data.address?.trim() || null,
      representative_name: data.representativeName?.trim() || null,
      phone: data.phone?.trim() || null,
      country_code: data.countryCode || "HU",
      owner_id: user.id,
    })
    .select()
    .single()

  if (error || !newCompany) {
    console.error("Hiba cég létrehozásakor:", error)
    return { success: false, error: error?.message || "Nem sikerült létrehozni a céget." }
  }

  // Automatikusan az új céget tesszük aktívvá
  const cookieStore = await cookies()
  cookieStore.set(SELECTED_COMPANY_COOKIE, newCompany.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })

  revalidatePath("/", "layout")
  return { success: true, company: newCompany as Company }
}

/**
 * Csatlakozás céghez megosztási kód (share token) alapján.
 */
export async function joinCompanyByTokenAction(shareToken: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Nincs bejelentkezett felhasználó." }
  }

  if (!shareToken || shareToken.trim().length === 0) {
    return { success: false, error: "Kérjük, add meg a cég meghívó kódját." }
  }

  const { data, error } = await supabase.rpc("join_company_by_token", {
    p_share_token: shareToken.trim(),
  })

  if (error || !data) {
    console.error("Hiba céghez csatlakozáskor:", error)
    return { success: false, error: error?.message || "Nem sikerült csatlakozni a céghez." }
  }

  const result = data as { success: boolean; company_id?: string; company_name?: string; error?: string }

  if (!result.success) {
    return { success: false, error: result.error || "Érvénytelen meghívókód." }
  }

  if (result.company_id) {
    const cookieStore = await cookies()
    cookieStore.set(SELECTED_COMPANY_COOKIE, result.company_id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
  }

  revalidatePath("/", "layout")
  return {
    success: true,
    companyId: result.company_id,
    companyName: result.company_name,
  }
}

/**
 * Cég adatainak frissítése (tulajdonos / admin jogosultsággal).
 */
export async function updateCompanyAction(
  companyId: string,
  data: Partial<Pick<Company, "name" | "tax_number" | "address" | "representative_name" | "phone" | "country_code" | "filing_prefix" | "logo_url">>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Nincs bejelentkezett felhasználó." }
  }

  // Ellenőrizzük, hogy a hívó a cég tulajdonosa-e
  const { data: company } = await supabase
    .from("companies")
    .select("owner_id")
    .eq("id", companyId)
    .maybeSingle()

  const { data: member } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle()

  const isOwner = company?.owner_id === user.id || member?.role === "owner"

  if (!isOwner) {
    return { success: false, error: "Kizárólag a cég tulajdonosa módosíthatja a cég adatait." }
  }

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (data.name !== undefined && data.name !== null) updatePayload.name = data.name.trim()
  if (data.tax_number !== undefined) updatePayload.tax_number = data.tax_number ? data.tax_number.trim() : null
  if (data.address !== undefined) updatePayload.address = data.address ? data.address.trim() : null
  if (data.representative_name !== undefined) updatePayload.representative_name = data.representative_name ? data.representative_name.trim() : null
  if (data.phone !== undefined) updatePayload.phone = data.phone ? data.phone.trim() : null
  if (data.country_code !== undefined) updatePayload.country_code = data.country_code
  if (data.filing_prefix !== undefined) {
    const cleanPrefix = data.filing_prefix
      ? data.filing_prefix.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 10)
      : "DOCS"
    updatePayload.filing_prefix = cleanPrefix || "DOCS"
  }
  if (data.logo_url !== undefined) {
    updatePayload.logo_url = data.logo_url
  }

  const { error } = await supabase
    .from("companies")
    .update(updatePayload)
    .eq("id", companyId)

  if (error) {
    console.error("Hiba cég módosításakor:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/", "layout")
  return { success: true }
}

/**
 * Cég törlése (kizárólag a cég tulajdonosa törölheti).
 */
export async function deleteCompanyAction(companyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Nincs bejelentkezett felhasználó." }
  }

  // Ellenőrizzük, hogy a felhasználó az owner-e
  const { data: company } = await supabase
    .from("companies")
    .select("owner_id, name")
    .eq("id", companyId)
    .single()

  if (!company || company.owner_id !== user.id) {
    return { success: false, error: "Csak a cég tulajdonosa törölheti a vállalatot." }
  }

  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", companyId)

  if (error) {
    console.error("Hiba cég törlésekor:", error)
    return { success: false, error: error.message }
  }

  // Ha a törölt cég volt az aktív, átváltunk a következőre
  const remaining = await getUserCompaniesServer()
  const nextCompanyId = remaining.length > 0 ? remaining[0].id : null

  const cookieStore = await cookies()
  if (nextCompanyId) {
    cookieStore.set(SELECTED_COMPANY_COOKIE, nextCompanyId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
  } else {
    cookieStore.delete(SELECTED_COMPANY_COOKIE)
  }

  revalidatePath("/", "layout")
  return { success: true, nextCompanyId }
}

/**
 * 6 karakteres egyedi megosztási kód (share token) generálása a céghez (Visibill mintára).
 */
export async function generateCompanyShareTokenAction(companyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Nincs bejelentkezett felhasználó." }
  }

  // Ellenőrizzük, hogy a felhasználó owner a cégnél
  const { data: company } = await supabase
    .from("companies")
    .select("owner_id")
    .eq("id", companyId)
    .maybeSingle()

  const { data: membership } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle()

  const isOwner = company?.owner_id === user.id || membership?.role === "owner"

  if (!isOwner) {
    return { success: false, error: "Kizárólag a cég tulajdonosa generálhat meghívókódot." }
  }

  // Kriptográfiailag biztonságos, 6 karakteres kód (Crockford-stílus, nem félreérthető betűkkel)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = new Uint8Array(6)
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256)
  }

  let token = ""
  for (let i = 0; i < 6; i++) {
    token += chars[bytes[i] % chars.length]
  }

  const now = new Date().toISOString()

  const { error } = await supabase
    .from("companies")
    .update({
      share_token: token,
      share_token_created_at: now,
    })
    .eq("id", companyId)

  if (error) {
    console.error("Hiba token mentésekor:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/", "layout")
  return { success: true, token, tokenCreatedAt: now }
}

/**
 * Cég tagjainak lekérdezése profillal és szerepkörrel.
 */
export async function getCompanyMembersAction(companyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Nincs bejelentkezett felhasználó.", members: [] }
  }

  // Ellenőrizzük, hogy a hívó a cég tulajdonosa-e
  const { data: company } = await supabase
    .from("companies")
    .select("owner_id")
    .eq("id", companyId)
    .maybeSingle()

  const { data: userAccess } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle()

  const isOwner = company?.owner_id === user.id || userAccess?.role === "owner"

  if (!isOwner) {
    return { success: false, error: "Kizárólag a cég tulajdonosa tekintheti meg a tagok listáját.", members: [] }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const { createClient: createAdminClient } = await import("@supabase/supabase-js")
  const adminClient = serviceRoleKey
    ? createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : supabase

  const { data: members, error } = await adminClient
    .from("company_members")
    .select("id, company_id, user_id, role, docs_szerepkor, hr_szerepkor, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true })

  if (error || !members) {
    return { success: false, error: error?.message || "Nem sikerült lekérni a tagokat.", members: [] }
  }

  const userIds = members.map((m) => m.user_id)
  let profileMap: Record<string, { nev?: string; email?: string; docs_szerepkor?: string | null; hr_szerepkor?: string | null }> = {}

  if (userIds.length > 0) {
    // Profilok lekérdezése admin klienssel az RLS kikerüléséhez
    const { data: profiles } = await adminClient
      .from("felhasznalo_profil")
      .select("id, nev, docs_szerepkor, hr_szerepkor, szerepkor")
      .in("id", userIds)

    // Auth userek email címeinek és metaadatainak lekérdezése
    let emailMap = new Map<string, string>()
    let authNameMap = new Map<string, string>()
    if (serviceRoleKey) {
      try {
        const { data: authData } = await adminClient.auth.admin.listUsers()
        if (authData?.users) {
          for (const u of authData.users) {
            if (u.email) emailMap.set(u.id, u.email)
            const metaName = (u.user_metadata?.name || u.user_metadata?.nev) as string | undefined
            if (metaName) authNameMap.set(u.id, metaName)
          }
        }
      } catch (err) {
        console.error("Hiba auth userek listázásakor:", err)
      }
    }

    if (profiles) {
      for (const p of profiles) {
        profileMap[p.id] = {
          nev: p.nev || authNameMap.get(p.id) || "",
          email: emailMap.get(p.id) || "",
          docs_szerepkor: p.docs_szerepkor || p.szerepkor || null,
          hr_szerepkor: p.hr_szerepkor || null,
        }
      }
    }
  }

  const enrichedMembers = members.map((m) => ({
    ...m,
    docs_szerepkor: m.docs_szerepkor || profileMap[m.user_id]?.docs_szerepkor || null,
    hr_szerepkor: m.hr_szerepkor || profileMap[m.user_id]?.hr_szerepkor || null,
    user_nev: profileMap[m.user_id]?.nev || "Névtelen felhasználó",
    user_email: profileMap[m.user_id]?.email || "",
  }))

  return { success: true, members: enrichedMembers }
}

/**
 * Tag eltávolítása a cégből.
 */
export async function removeCompanyMemberAction(companyId: string, memberId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Nincs bejelentkezett felhasználó." }
  }

  // Ellenőrizzük, hogy a törölni kívánt tag nem owner-e
  const { data: targetMember } = await supabase
    .from("company_members")
    .select("role, user_id")
    .eq("id", memberId)
    .eq("company_id", companyId)
    .single()

  if (!targetMember) {
    return { success: false, error: "A tag nem található." }
  }

  if (targetMember.role === "owner") {
    return { success: false, error: "A cég tulajdonosát nem lehet eltávolítani." }
  }

  // Ellenőrizzük, hogy a hívó fél a cég tulajdonosa-e
  const { data: company } = await supabase
    .from("companies")
    .select("owner_id")
    .eq("id", companyId)
    .maybeSingle()

  const { data: callerMember } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle()

  const isCallerOwner = company?.owner_id === user.id || callerMember?.role === "owner"

  if (!isCallerOwner) {
    return { success: false, error: "Kizárólag a cég tulajdonosa távolíthat el tagot a cégből." }
  }

  const { error } = await supabase
    .from("company_members")
    .delete()
    .eq("id", memberId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/", "layout")
  return { success: true }
}

/**
 * Tag szerepköreinek módosítása a cégen belül.
 */
export async function updateCompanyMemberRoleAction(data: {
  companyId: string
  memberId: string
  role: "admin" | "member"
  docs_szerepkor?: string | null
  hr_szerepkor?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Nincs bejelentkezett felhasználó." }
  }

  // Ellenőrizzük, hogy a hívó a cég tulajdonosa-e
  const { data: company } = await supabase
    .from("companies")
    .select("owner_id")
    .eq("id", data.companyId)
    .maybeSingle()

  const { data: callerMember } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", data.companyId)
    .eq("user_id", user.id)
    .maybeSingle()

  const isCallerOwner = company?.owner_id === user.id || callerMember?.role === "owner"

  if (!isCallerOwner) {
    return { success: false, error: "Kizárólag a cég tulajdonosa módosíthatja a tagok szerepkörét." }
  }

  // Ellenőrizzük a céltagot
  const { data: targetMember } = await supabase
    .from("company_members")
    .select("id, role, user_id")
    .eq("id", data.memberId)
    .eq("company_id", data.companyId)
    .single()

  if (!targetMember) {
    return { success: false, error: "A tag nem található a cégben." }
  }

  if (targetMember.role === "owner") {
    return { success: false, error: "A cég tulajdonosának szerepköre nem módosítható." }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const { createClient: createAdminClient } = await import("@supabase/supabase-js")
  const adminClient = serviceRoleKey
    ? createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : supabase

  // 1. Frissítjük a company_members rekordot
  const updatePayload: Record<string, any> = {
    role: data.role,
  }
  if (data.docs_szerepkor !== undefined) {
    updatePayload.docs_szerepkor = data.docs_szerepkor
  }
  if (data.hr_szerepkor !== undefined) {
    updatePayload.hr_szerepkor = data.hr_szerepkor
  }

  const { error: memberError } = await adminClient
    .from("company_members")
    .update(updatePayload)
    .eq("id", data.memberId)

  if (memberError) {
    return { success: false, error: memberError.message }
  }

  // 2. Frissítjük a célfelhasználó profilját is a szinkronitásért
  const profileUpdates: Record<string, any> = {}
  if (data.docs_szerepkor) {
    profileUpdates.docs_szerepkor = data.docs_szerepkor
    if (data.docs_szerepkor === "admin" || data.docs_szerepkor === "rendszergazda") {
      profileUpdates.szerepkor = "admin"
    } else {
      profileUpdates.szerepkor = "ugyintezo"
    }
  }
  if (data.hr_szerepkor) {
    profileUpdates.hr_szerepkor = data.hr_szerepkor
  }

  if (Object.keys(profileUpdates).length > 0) {
    await adminClient
      .from("felhasznalo_profil")
      .update(profileUpdates)
      .eq("id", targetMember.user_id)
  }

  revalidatePath("/", "layout")
  return { success: true }
}

/**
 * Céglogó feltöltése az avatars tárhelyre.
 */
export async function uploadCompanyLogoAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Nincs bejelentkezett felhasználó." }
  }

  const companyId = formData.get("companyId") as string
  const file = formData.get("logo") as File

  if (!companyId || !file) {
    return { success: false, error: "Hiányzó adatok (cégazonosító vagy fájl)." }
  }

  // Ellenőrizzük, hogy a hívó a cég tulajdonosa-e
  const { data: company } = await supabase
    .from("companies")
    .select("owner_id")
    .eq("id", companyId)
    .maybeSingle()

  const { data: member } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle()

  const isOwner = company?.owner_id === user.id || member?.role === "owner"

  if (!isOwner) {
    return { success: false, error: "Kizárólag a cég tulajdonosa tölthet fel logót." }
  }

  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: "A céglogó mérete maximum 2 MB lehet." }
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "Csak PNG, JPG, WebP vagy SVG kép tölthető fel." }
  }

  const fileExt = file.type === "image/png"
    ? "png"
    : file.type === "image/webp"
    ? "webp"
    : file.type === "image/svg+xml"
    ? "svg"
    : "jpg"

  const filePath = `companies/${companyId}/logo_${Date.now()}.${fileExt}`
  const arrayBuffer = await file.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const { createClient: createAdminClient } = await import("@supabase/supabase-js")
  const adminClient = serviceRoleKey
    ? createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : supabase

  const { error: uploadError } = await adminClient.storage
    .from("avatars")
    .upload(filePath, uint8Array, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error("Hiba céglogó feltöltésekor:", uploadError)
    return { success: false, error: "Nem sikerült feltölteni a logót: " + uploadError.message }
  }

  const { data: { publicUrl } } = adminClient.storage
    .from("avatars")
    .getPublicUrl(filePath)

  const { error: updateError } = await adminClient
    .from("companies")
    .update({
      logo_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  revalidatePath("/", "layout")
  return { success: true, logoUrl: publicUrl }
}

/**
 * Céglogó eltávolítása.
 */
export async function removeCompanyLogoAction(companyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Nincs bejelentkezett felhasználó." }
  }

  const { data: company } = await supabase
    .from("companies")
    .select("owner_id")
    .eq("id", companyId)
    .maybeSingle()

  const { data: member } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle()

  const isOwner = company?.owner_id === user.id || member?.role === "owner"

  if (!isOwner) {
    return { success: false, error: "Kizárólag a cég tulajdonosa távolíthatja el a logót." }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const { createClient: createAdminClient } = await import("@supabase/supabase-js")
  const adminClient = serviceRoleKey
    ? createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : supabase

  const { error } = await adminClient
    .from("companies")
    .update({
      logo_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/", "layout")
  return { success: true }
}

/**
 * Felhasználó összes cégtagságának lekérdezése (statisztikához / áttekintő kártyához).
 */
export async function getUserCompanyMembershipsAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Nincs bejelentkezett felhasználó.", list: [] }
  }

  const { data: memberships, error } = await supabase
    .from("company_members")
    .select(`
      id,
      role,
      created_at,
      company:companies (
        id,
        name,
        tax_number,
        address,
        country_code,
        owner_id,
        logo_url,
        filing_prefix,
        created_at
      )
    `)
    .eq("user_id", user.id)

  if (error || !memberships) {
    return { success: false, error: error?.message, list: [] }
  }

  const list = memberships.map((m: any) => ({
    membershipId: m.id,
    role: m.role,
    joinedAt: m.created_at,
    isOwner: m.company?.owner_id === user.id,
    company: m.company as Company,
  }))

  return { success: true, list }
}

/**
 * Új felhasználó meghívása és cég(ek)hez rendelése (Visibill mintára).
 */
export async function inviteCompanyMemberAction(data: {
  nev: string
  email: string
  password: string
  companyIds: string[]
  role: string
  module: "docs" | "hr"
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Nincs bejelentkezett felhasználó." }
  }

  const email = data.email.trim().toLowerCase()
  const nev = data.nev.trim()
  const password = data.password

  if (!email || !nev || !password) {
    return { success: false, error: "A név, email és jelszó kitöltése kötelező!" }
  }

  if (!data.companyIds || data.companyIds.length === 0) {
    return { success: false, error: "Legalább egy céget ki kell választani!" }
  }

  // Ellenőrizzük, hogy a hívó fél tulajdonos-e az összes kijelölt cégnél
  for (const compId of data.companyIds) {
    const { data: company } = await supabase
      .from("companies")
      .select("owner_id")
      .eq("id", compId)
      .maybeSingle()

    const { data: callerMember } = await supabase
      .from("company_members")
      .select("role")
      .eq("company_id", compId)
      .eq("user_id", user.id)
      .maybeSingle()

    const isCallerOwner = company?.owner_id === user.id || callerMember?.role === "owner"
    if (!isCallerOwner) {
      return { success: false, error: "Kizárólag a cég tulajdonosa hívhat meg új tagokat ehhez a céghez." }
    }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { success: false, error: "Hiányzik a SUPABASE_SERVICE_ROLE_KEY a konfigurációból!" }
  }

  const { createClient: createAdminClient } = await import("@supabase/supabase-js")
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Megnézzük, létezik-e már a felhasználó
  let targetUserId: string | null = null

  const { data: existingProfile } = await supabaseAdmin
    .from("felhasznalo_profil")
    .select("id, elerheto_modulok, docs_szerepkor, hr_szerepkor")
    .eq("email", email)
    .single()

  if (existingProfile) {
    targetUserId = existingProfile.id

    // Modulok bővítése ha szükséges
    const currentModules: string[] = Array.isArray(existingProfile.elerheto_modulok)
      ? existingProfile.elerheto_modulok
      : []
    if (!currentModules.includes(data.module)) {
      await supabaseAdmin
        .from("felhasznalo_profil")
        .update({
          elerheto_modulok: [...currentModules, data.module],
          ...(data.module === "docs" ? { docs_szerepkor: data.role } : { hr_szerepkor: data.role }),
        })
        .eq("id", targetUserId)
    }
  } else {
    // Új felhasználó létrehozása Supabase Auth-ban
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: nev },
    })

    if (createError || !createData.user) {
      return { success: false, error: createError?.message || "Nem sikerült létrehozni a felhasználót." }
    }

    targetUserId = createData.user.id

    const profilePayload: Record<string, any> = {
      id: targetUserId,
      nev,
      email,
      elerheto_modulok: [data.module],
    }

    if (data.module === "docs") {
      profilePayload.docs_szerepkor = data.role
      profilePayload.szerepkor = data.role === "admin" || data.role === "rendszergazda" ? "admin" : "ugyintezo"
    } else {
      profilePayload.hr_szerepkor = data.role
      profilePayload.szerepkor = "munkavallalo"
    }

    await supabaseAdmin
      .from("felhasznalo_profil")
      .upsert(profilePayload)
  }

  // 2. Hozzárendelés a kijelölt cégekhez
  for (const compId of data.companyIds) {
    const memberRole = data.role === "admin" || data.role === "rendszergazda" ? "admin" : "member"
    const memberPayload: Record<string, any> = {
      company_id: compId,
      user_id: targetUserId,
      role: memberRole,
    }
    if (data.module === "docs") {
      memberPayload.docs_szerepkor = data.role
    } else {
      memberPayload.hr_szerepkor = data.role
    }

    await supabaseAdmin
      .from("company_members")
      .upsert(memberPayload, { onConflict: "user_id, company_id" })
  }

  revalidatePath("/", "layout")
  return { success: true, userId: targetUserId }
}

/**
 * Aktuális bejelentkezett felhasználó hozzáférésének és tulajdonosi (owner) státuszának lekérdezése egy céghez.
 */
export async function getCompanyAccessAction(companyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, isOwner: false, role: null, userId: null }
  }

  const { data: company } = await supabase
    .from("companies")
    .select("owner_id")
    .eq("id", companyId)
    .maybeSingle()

  const { data: member } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle()

  const isOwner = company?.owner_id === user.id || member?.role === "owner"

  return {
    success: true,
    isOwner: Boolean(isOwner),
    role: member?.role || null,
    userId: user.id,
  }
}

