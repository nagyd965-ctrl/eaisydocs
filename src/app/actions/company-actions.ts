"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createEaisyBillClient } from "@/utils/supabase/eaisybill"
import { SELECTED_COMPANY_COOKIE, getUserCompaniesServer } from "@/utils/company-server"
import type { Company } from "@/types/company"

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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
    httpOnly: true,
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
    httpOnly: true,
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
    // Ha meghívókóddal csatlakozott sima tagként (member), explicit alapértelmezett
    // szerepkört rögzítünk a cégtagságon, hogy egy másik cégbeli globális admin profil ne szivárogjon át.
    const admin = getAdminClient()
    await admin
      .from("company_members")
      .update({
        docs_szerepkor: "ugyintezo",
        hr_szerepkor: "munkavallalo",
        hr_modulok: [],
      })
      .eq("company_id", result.company_id)
      .eq("user_id", user.id)
      .eq("role", "member")
      .is("hr_szerepkor", null)

    const cookieStore = await cookies()
    cookieStore.set(SELECTED_COMPANY_COOKIE, result.company_id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
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
  data: Partial<Pick<Company, "name" | "tax_number" | "address" | "representative_name" | "phone" | "country_code" | "filing_prefix" | "logo_url" | "referral_bonus_amount">>
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
    .select("role, hr_szerepkor")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle()

  const isOwner = company?.owner_id === user.id || member?.role === "owner" || member?.role === "admin" || member?.hr_szerepkor === "admin"

  if (!isOwner) {
    return { success: false, error: "Kizárólag a cég tulajdonosa vagy adminisztrátora módosíthatja a cég adatait." }
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
  if (data.referral_bonus_amount !== undefined) {
    updatePayload.referral_bonus_amount = typeof data.referral_bonus_amount === "number" ? data.referral_bonus_amount : 150000
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
 * Cég végleges törlése szerverakció.
 * Csak a cég tulajdonosa (owner) vagy rendszergazda jogosult törölni.
 * A törlés ON DELETE CASCADE-del törli a céghez kapcsolódó összes rekordot.
 * Ha az aktív cég lett törölve, automatikusan egy másik elérhető cégre vált a cookie-ban.
 */
export async function deleteCompanyAction(companyId: string): Promise<{
  success: boolean
  error?: string
  remainingCompanyId?: string | null
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Nincs bejelentkezve." }

    const admin = getAdminClient()

    // 1. Cég adatainak lekérése
    const { data: company, error: compErr } = await admin
      .from("companies")
      .select("id, name, owner_id")
      .eq("id", companyId)
      .maybeSingle()

    if (compErr || !company) {
      return { success: false, error: "A cég nem található." }
    }

    // 2. Felhasználó profiljának ellenőrzése (rendszergazda-e)
    const { data: profile } = await supabase
      .from("felhasznalo_profil")
      .select("docs_szerepkor")
      .eq("id", user.id)
      .maybeSingle()

    const isSysAdmin = profile?.docs_szerepkor === "rendszergazda"

    // 3. Cégbeli tagság és szerepkör ellenőrzése
    const { data: member } = await admin
      .from("company_members")
      .select("role")
      .eq("company_id", companyId)
      .eq("user_id", user.id)
      .maybeSingle()

    const isOwner = company.owner_id === user.id || member?.role === "owner"
    const isMemberSysAdmin = isSysAdmin && Boolean(member)

    if (!isOwner && !isMemberSysAdmin) {
      return {
        success: false,
        error: "Csak a cég tulajdonosa vagy a céghez tartozó rendszergazda jogosult a vállalat törlésére."
      }
    }

    // 4. Audit napló rögzítése a törlés ELŐTT (company_id: null, hogy a CASCADE törlés ne törölje a naplóbejegyzést!)
    try {
      await admin.from("esemeny_naplo").insert({
        entitas_tipus: "company",
        entitas_id: companyId,
        esemeny_tipus: "adat_modositas",
        user_id: user.id,
        company_id: null,
        indoklas: `Vállalat véglegesen törölve: "${company.name}" (ID: ${companyId})`,
      })

      await admin.from("hr_esemeny_naplo").insert({
        felhasznalo_id: user.id,
        entitas_tipus: "companies",
        entitas_id: companyId,
        esemeny_tipus: "adat_modositas",
        company_id: null,
        megjegyzes: `Vállalat véglegesen törölve: "${company.name}" (ID: ${companyId})`,
      })
    } catch (auditErr) {
      console.warn("Cégtörlési audit napló rögzítési figyelmeztetés:", auditErr)
    }

    // 5. Végleges törlés a companies táblából (minden kapcsolódó adat kaszkádolva törlődik)
    const { error: deleteErr } = await admin
      .from("companies")
      .delete()
      .eq("id", companyId)

    if (deleteErr) {
      return { success: false, error: "Hiba a cég törlésekor: " + deleteErr.message }
    }

    // 6. Ha a törölt cég volt az aktív cég, átváltunk egy megmaradt cégre
    const cookieStore = await cookies()
    const currentActiveId = cookieStore.get(SELECTED_COMPANY_COOKIE)?.value
    let nextCompanyId: string | null = null

    if (currentActiveId === companyId) {
      const { data: otherMemberships } = await admin
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .neq("company_id", companyId)
        .limit(1)

      if (otherMemberships && otherMemberships.length > 0) {
        const nextId = otherMemberships[0].company_id
        nextCompanyId = nextId
        cookieStore.set(SELECTED_COMPANY_COOKIE, nextId, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        })
      } else {
        cookieStore.delete(SELECTED_COMPANY_COOKIE)
      }
    }

    revalidatePath("/", "layout")
    return { success: true, remainingCompanyId: nextCompanyId }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Váratlan hiba történt a törlés során."
    return { success: false, error: errorMsg }
  }
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

  // Kriptográfiailag biztonságos, 10 karakteres kód (Crockford-stílus, nem félreérthető betűkkel)
  const TOKEN_LENGTH = 10
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const bytes = new Uint8Array(TOKEN_LENGTH)
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < TOKEN_LENGTH; i++) bytes[i] = Math.floor(Math.random() * 256)
  }

  let token = ""
  for (let i = 0; i < TOKEN_LENGTH; i++) {
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
  const profileMap: Record<string, { nev?: string; email?: string; docs_szerepkor?: string | null; hr_szerepkor?: string | null }> = {}

  if (userIds.length > 0) {
    // Profilok lekérdezése admin klienssel az RLS kikerüléséhez
    const { data: profiles } = await adminClient
      .from("felhasznalo_profil")
      .select("id, nev, docs_szerepkor, hr_szerepkor, szerepkor, elerheto_modulok")
      .in("id", userIds)

    // Auth userek email címeinek és metaadatainak lekérdezése (lapozva)
    const emailMap = new Map<string, string>()
    const authNameMap = new Map<string, string>()
    if (serviceRoleKey) {
      try {
        const { listAllAuthUsers } = await import("@/utils/supabase/admin-users")
        const allAuthUsers = await listAllAuthUsers(adminClient)
        for (const u of allAuthUsers) {
          if (u.email) emailMap.set(u.id, u.email)
          const metaName = (u.user_metadata?.name || u.user_metadata?.nev) as string | undefined
          if (metaName) authNameMap.set(u.id, metaName)
        }
      } catch (err) {
        console.error("Hiba auth userek listázásakor:", err)
      }
    }

    if (profiles) {
      for (const p of profiles) {
        const mods: string[] = Array.isArray((p as any).elerheto_modulok) ? (p as any).elerheto_modulok : []
        const hasDocs = mods.includes("docs")
        const hasHr = mods.includes("hr")
        profileMap[p.id] = {
          nev: p.nev || authNameMap.get(p.id) || "",
          email: emailMap.get(p.id) || "",
          docs_szerepkor: hasDocs ? (p.docs_szerepkor || p.szerepkor || null) : null,
          hr_szerepkor: hasHr ? (p.hr_szerepkor || null) : null,
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

  if (data.role !== "admin" && data.role !== "member") {
    return { success: false, error: "Érvénytelen szerepkör (csak admin vagy member engedélyezett)." }
  }

  const VALID_DOCS_ROLES = new Set([
    "ugyintezo",
    "iktato",
    "vezeto",
    "betekinto",
    "auditor",
    "admin",
    "rendszergazda",
    "irattaros",
  ])
  const VALID_HR_ROLES = new Set([
    "munkavallalo",
    "hr_munkatars",
    "hr_vezeto",
    "vezeto",
    "berugyi",
    "toborzo",
    "munkavedelmi",
    "auditor",
    "admin",
    "rendszergazda",
  ])

  if (data.docs_szerepkor && !VALID_DOCS_ROLES.has(data.docs_szerepkor)) {
    return { success: false, error: "Érvénytelen eaisyDocs szerepkör." }
  }
  if (data.hr_szerepkor && !VALID_HR_ROLES.has(data.hr_szerepkor)) {
    return { success: false, error: "Érvénytelen eaisyHR szerepkör." }
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

  // 2. Globális profil szinkronizálása kizárólag akkor, ha a felhasználó csak ennek az egy cégnek a tagja
  const { count: membershipCount } = await adminClient
    .from("company_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", targetMember.user_id)

  if ((membershipCount || 0) <= 1) {
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

  const VALID_DOCS_ROLES = new Set([
    "ugyintezo",
    "iktato",
    "vezeto",
    "betekinto",
    "auditor",
    "admin",
    "rendszergazda",
    "irattaros",
  ])
  const VALID_HR_ROLES = new Set([
    "munkavallalo",
    "hr_munkatars",
    "hr_vezeto",
    "vezeto",
    "berugyi",
    "toborzo",
    "munkavedelmi",
    "auditor",
    "admin",
    "rendszergazda",
  ])

  if (data.module === "docs" && !VALID_DOCS_ROLES.has(data.role)) {
    return { success: false, error: "Érvénytelen eaisyDocs szerepkör." }
  }
  if (data.module === "hr" && !VALID_HR_ROLES.has(data.role)) {
    return { success: false, error: "Érvénytelen eaisyHR szerepkör." }
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

    // Modulok bővítése ha szükséges (meglévő globális szerepkört nem írjuk felül más cégből)
    const currentModules: string[] = Array.isArray(existingProfile.elerheto_modulok)
      ? existingProfile.elerheto_modulok
      : []
    if (!currentModules.includes(data.module)) {
      const profileUpdate: Record<string, any> = {
        elerheto_modulok: [...currentModules, data.module],
      }
      const safeGlobalRole = data.role === "rendszergazda" ? "admin" : data.role
      if (data.module === "docs" && !existingProfile.docs_szerepkor) {
        profileUpdate.docs_szerepkor = safeGlobalRole
      }
      if (data.module === "hr" && !existingProfile.hr_szerepkor) {
        profileUpdate.hr_szerepkor = safeGlobalRole
      }
      await supabaseAdmin
        .from("felhasznalo_profil")
        .update(profileUpdate)
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
    const safeGlobalRole = data.role === "rendszergazda" ? "admin" : data.role

    const profilePayload: Record<string, any> = {
      id: targetUserId,
      nev,
      email,
      elerheto_modulok: [data.module],
    }

    if (data.module === "docs") {
      profilePayload.docs_szerepkor = safeGlobalRole
      profilePayload.szerepkor = data.role === "admin" || data.role === "rendszergazda" ? "admin" : "ugyintezo"
    } else {
      profilePayload.hr_szerepkor = safeGlobalRole
      profilePayload.szerepkor = "munkavallalo"
    }

    const { error: profileUpsertErr } = await supabaseAdmin
      .from("felhasznalo_profil")
      .upsert(profilePayload)
    if (profileUpsertErr) {
      return { success: false, error: "Hiba a felhasználói profil mentésekor: " + profileUpsertErr.message }
    }
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

    const { error: memberUpsertErr } = await supabaseAdmin
      .from("company_members")
      .upsert(memberPayload, { onConflict: "user_id, company_id" })
    if (memberUpsertErr) {
      return { success: false, error: "Hiba a cégtagság mentésekor: " + memberUpsertErr.message }
    }
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
    .select("role, hr_szerepkor")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle()

  const isOwner = company?.owner_id === user.id || member?.role === "owner" || member?.role === "admin" || (member as any)?.hr_szerepkor === "admin"

  return {
    success: true,
    isOwner: Boolean(isOwner),
    role: member?.role || null,
    userId: user.id,
  }
}

export interface EaisyBillCompanyItem {
  id: string
  name: string
  tax_number: string | null
  address: string | null
  country_code: string
  isImported: boolean
  localCompanyId?: string
}

/**
 * Lekéri az eaisyBill-ben nyilvántartott cégek listáját és összeveti a helyi eaisyDocs cégekkel.
 */
export async function getEaisyBillCompaniesAction(): Promise<{
  success: boolean
  companies: EaisyBillCompanyItem[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, companies: [], error: "Nincs bejelentkezett felhasználó." }
    }

    const [{ data: callerProfile }, { data: adminMemberships }] = await Promise.all([
      supabase
        .from("felhasznalo_profil")
        .select("szerepkor, docs_szerepkor, eaisybill_user_id")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("company_members")
        .select("id")
        .eq("user_id", user.id)
        .in("role", ["owner", "admin"])
        .limit(1),
    ])

    const isGlobalSysadmin =
      callerProfile?.szerepkor === "rendszergazda" ||
      callerProfile?.docs_szerepkor === "rendszergazda"
    const isAnyCompanyAdmin = Boolean(adminMemberships && adminMemberships.length > 0)

    if (!isGlobalSysadmin && !isAnyCompanyAdmin) {
      return { success: false, companies: [], error: "Nincs jogosultsága az eaisyBill vállalatok lekérdezéséhez." }
    }

    const billClient = createEaisyBillClient()

    let allowedBillCompanyIds: Set<string> | null = null
    if (!isGlobalSysadmin) {
      const billUserId = callerProfile?.eaisybill_user_id || user.id
      const { data: billMemberships } = await billClient
        .from("company_members")
        .select("company_id")
        .eq("user_id", billUserId)
      if (billMemberships && billMemberships.length > 0) {
        allowedBillCompanyIds = new Set(billMemberships.map((m: any) => m.company_id))
      }
    }

    // 1. Lekérjük az eaisyBill cégeket
    const { data: billCompanies, error: billError } = await billClient
      .from("companies")
      .select("id, name, tax_number, address, country_code")
      .order("name", { ascending: true })

    if (billError) {
      return { success: false, companies: [], error: "Hiba az eaisyBill cégek lekérésekor: " + billError.message }
    }

    const filteredBillCompanies = allowedBillCompanyIds
      ? (billCompanies || []).filter((bc) => allowedBillCompanyIds!.has(bc.id))
      : billCompanies || []

    // 2. Lekérjük a helyi cégeket, amik már rendelkeznek eaisybill_company_id-val
    const { data: existingLocal } = await supabase
      .from("companies")
      .select("id, eaisybill_company_id")
      .not("eaisybill_company_id", "is", null)

    const importedMap = new Map<string, string>()
    for (const c of existingLocal || []) {
      if (c.eaisybill_company_id) {
        importedMap.set(c.eaisybill_company_id, c.id)
      }
    }

    const list: EaisyBillCompanyItem[] = filteredBillCompanies.map(bc => ({
      id: bc.id,
      name: bc.name,
      tax_number: bc.tax_number || null,
      address: bc.address || null,
      country_code: bc.country_code || "HU",
      isImported: importedMap.has(bc.id),
      localCompanyId: importedMap.get(bc.id),
    }))

    return { success: true, companies: list }
  } catch (err: any) {
    return { success: false, companies: [], error: err.message || "Ismeretlen hiba történt." }
  }
}

/**
 * Átvesz egy céget az eaisyBill-ből az eaisyDocs-ba, és azonnal aktívvá teszi.
 */
export async function importEaisyBillCompanyAction(eaisybillCompanyId: string): Promise<{
  success: boolean
  company?: Company
  alreadyExisted?: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "Nincs bejelentkezett felhasználó." }
    }

    const [{ data: callerProfile }, { data: adminMemberships }] = await Promise.all([
      supabase
        .from("felhasznalo_profil")
        .select("szerepkor, docs_szerepkor, eaisybill_user_id")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("company_members")
        .select("id")
        .eq("user_id", user.id)
        .in("role", ["owner", "admin"])
        .limit(1),
    ])

    const isGlobalSysadmin =
      callerProfile?.szerepkor === "rendszergazda" ||
      callerProfile?.docs_szerepkor === "rendszergazda"
    const isAnyCompanyAdmin = Boolean(adminMemberships && adminMemberships.length > 0)

    if (!isGlobalSysadmin && !isAnyCompanyAdmin) {
      return { success: false, error: "Nincs jogosultsága vállalat importálásához." }
    }

    const billClient = createEaisyBillClient()

    if (!isGlobalSysadmin) {
      const billUserId = callerProfile?.eaisybill_user_id || user.id
      const { data: userBillMemberships } = await billClient
        .from("company_members")
        .select("company_id")
        .eq("user_id", billUserId)
      if (userBillMemberships && userBillMemberships.length > 0) {
        const hasTargetAccess = userBillMemberships.some((m: any) => m.company_id === eaisybillCompanyId)
        if (!hasTargetAccess) {
          return {
            success: false,
            error: "Nincs jogosultsága ehhez az eaisyBill vállalathoz.",
          }
        }
      }
    }

    // 1. Lekérjük a céget az eaisyBill-ből
    const { data: billCompany, error: billError } = await billClient
      .from("companies")
      .select("id, name, tax_number, address, country_code, representative_name, phone")
      .eq("id", eaisybillCompanyId)
      .maybeSingle()

    if (billError || !billCompany) {
      return { success: false, error: "Nem található a cég az eaisyBill rendszerben." }
    }

    // 2. Ellenőrizzük, hogy létezik-e már az eaisyDocs-ban ez az eaisybill_company_id
    const { data: existing } = await supabase
      .from("companies")
      .select("id, name, tax_number, address, representative_name, phone, owner_id, share_token, share_token_created_at, country_code, logo_url, filing_prefix, eaisybill_company_id, created_at, updated_at")
      .eq("eaisybill_company_id", eaisybillCompanyId)
      .maybeSingle()

    let targetCompany: Company
    let alreadyExisted = false

    if (existing) {
      alreadyExisted = true
      // Már létezik a cég, ellenőrizzük a tagságot
      const { data: membership } = await supabase
        .from("company_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("company_id", existing.id)
        .maybeSingle()

      if (!membership) {
        if (!isGlobalSysadmin) {
          return {
            success: false,
            error: "Ez a vállalat már importálva lett a rendszerbe. Kérj meghívót a vállalat adminisztrátorától!",
          }
        }
        await supabase
          .from("company_members")
          .insert({
            company_id: existing.id,
            user_id: user.id,
            role: "owner",
            docs_szerepkor: "admin",
            hr_szerepkor: "admin",
          })
      }
      targetCompany = existing as Company
    } else {
      // Iktatási prefix képzése a cégnévből (kezdőbetűk, max 4 karakter)
      const cleanName = billCompany.name.trim().replace(/["'„”]/g, "")
      const words = cleanName.split(/\s+/).filter(Boolean)
      let prefix = "DOCS"
      if (words.length >= 2) {
        prefix = words.slice(0, 4).map((w: string) => w[0].toUpperCase()).join("")
      } else if (words.length === 1 && words[0].length >= 3) {
        prefix = words[0].slice(0, 4).toUpperCase()
      }

      const { data: newCompany, error: insertError } = await supabase
        .from("companies")
        .insert({
          name: billCompany.name.trim(),
          tax_number: billCompany.tax_number?.trim() || null,
          address: billCompany.address?.trim() || null,
          representative_name: billCompany.representative_name?.trim() || null,
          phone: billCompany.phone?.trim() || null,
          country_code: billCompany.country_code || "HU",
          filing_prefix: prefix,
          owner_id: user.id,
          eaisybill_company_id: billCompany.id,
        })
        .select("id, name, tax_number, address, representative_name, phone, owner_id, share_token, share_token_created_at, country_code, logo_url, filing_prefix, eaisybill_company_id, created_at, updated_at")
        .single()

      if (insertError || !newCompany) {
        return { success: false, error: "Hiba az eaisyDocs cég létrehozásakor: " + insertError?.message }
      }

      targetCompany = newCompany as Company
    }

    // 3. Automatikusan beállítjuk aktív cégnek a cookie-ban
    const cookieStore = await cookies()
    cookieStore.set(SELECTED_COMPANY_COOKIE, targetCompany.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })

    revalidatePath("/", "layout")
    return { success: true, company: targetCompany, alreadyExisted }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Nem sikerült az eaisyBill cég importálása."
    return { success: false, error: errorMsg }
  }
}



