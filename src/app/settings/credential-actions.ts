"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import {
  CREDENTIAL_KEY_PREFIX,
  loadCompanyCredentialRow,
} from "@/utils/imap-config"
import { encryptSecret } from "@/utils/credential-crypto"

// ─────────────────────────────────────────────
// HITELESÍTŐ ADATOK (eaisyDocs) — cég-szintű e-mail beállítások
// Őrblokk: A-097 minta (bejelentkezett CÉG-ADMIN + aktív cég kontextus)
// ─────────────────────────────────────────────

async function requireCredentialAdminAccess(): Promise<{
  error?: string
  companyId?: string
  userId?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Nincs bejelentkezve." }

  const { getActiveCompanyIdServer } = await import("@/utils/company-server")
  const activeCompanyId = await getActiveCompanyIdServer()
  if (!activeCompanyId) return { error: "Nincs kiválasztott aktív cég." }

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
    return { error: "Csak a cég adminja kezelheti a hitelesítő adatokat." }
  }

  return { companyId: activeCompanyId, userId: user.id }
}

/**
 * Az aktív cég hitelesítő adatainak ÁLLAPOTA a felületnek.
 * Titkokat (jelszó, API kulcs) SOHA nem ad vissza — csak azt, hogy be vannak-e állítva.
 */
export async function getCredentialStatus() {
  const guard = await requireCredentialAdminAccess()
  if (guard.error) return { error: guard.error }

  // Self-heal: ha még semmi sincs DB-ben, de az env-ben van IMAP-konfiguráció,
  // egyszeri auto-import az első céghez (ugyanaz a logika, mint a workerben)
  try {
    const { ensureCredentialSeed } = await import("@/utils/imap-config")
    await ensureCredentialSeed()
  } catch {
    // nem kritikus — a status olvasása ettől függetlenül működik
  }

  const supabase = await createClient()
  const { data: row } = await supabase
    .from("rendszer_beallitas")
    .select("ertek")
    .eq("kulcs", `${CREDENTIAL_KEY_PREFIX}${guard.companyId}`)
    .maybeSingle()

  const e = row?.ertek && typeof row.ertek === "object" ? (row.ertek as any) : null

  return {
    configured: !!(e?.imap_host && e?.imap_user && e?.imap_password_enc),
    imap: {
      host: e?.imap_host || "",
      port: e?.imap_port ? Number(e.imap_port) : 993,
      user: e?.imap_user || "",
      enabled: e?.imap_enabled !== false,
      passwordSet: !!e?.imap_password_enc,
    },
    brevoConfigured: !!e?.brevo_api_key_enc,
  }
}

/**
 * Az aktív cég hitelesítő adatainak mentése.
 * A jelszó és a Brevo API kulcs mező opcionális: üresen hagyva a korábbi
 * mentett érték megmarad (így a felület soha nem kell hogy lássa a titkot).
 */
export async function saveCredentialConfig(formData: FormData) {
  const guard = await requireCredentialAdminAccess()
  if (guard.error) return { error: guard.error }

  const imapHost = String(formData.get("imap_host") || "").trim()
  const imapPort = parseInt(String(formData.get("imap_port") || "993"), 10) || 993
  const imapUser = String(formData.get("imap_user") || "").trim()
  const imapPassword = String(formData.get("imap_password") || "")
  const imapEnabled = formData.get("imap_enabled") === "on" || formData.get("imap_enabled") === "true"
  const brevoApiKey = String(formData.get("brevo_api_key") || "")

  if (imapEnabled && (!imapHost || !imapUser)) {
    return { error: "Az IMAP-kiszolgáló és felhasználónév megadása kötelező a csatorna engedélyezéséhez." }
  }

  // Service-role kliens: az olvasásnál a régi titkot is csak így érjük el
  const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const existing = await loadCompanyCredentialRow(guard.companyId!, admin)
  const kulcs = `${CREDENTIAL_KEY_PREFIX}${guard.companyId}`

  // Új jelszó kulcsfontosságú: ha a mező üres, a régi marad.
  // Ha nincs régi sem és engedélyezve van a csatorna, hiba:
  const newPasswordEnc = imapPassword
    ? encryptSecret(imapPassword)
    : existing?.imapPasswordSet
      ? (await getExistingPasswordEnc(admin, kulcs))
      : null

  if (imapEnabled && !newPasswordEnc) {
    return { error: "Az IMAP-jelszó megadása kötelező (első mentéskor)." }
  }

  const newBrevoEnc = brevoApiKey
    ? encryptSecret(brevoApiKey)
    : existing?.brevoKeySet
      ? (await getExistingBrevoEnc(admin, kulcs))
      : null

  const { error } = await admin.from("rendszer_beallitas").upsert({
    kulcs,
    ertek: {
      imap_host: imapHost || existing?.imapHost || null,
      imap_port: imapPort,
      imap_user: imapUser || existing?.imapUser || null,
      imap_password_enc: newPasswordEnc,
      imap_enabled: imapEnabled,
      brevo_api_key_enc: newBrevoEnc,
    },
    leiras: "Cég-szintű e-mail hitelesítő adatok (eaisyDocs)",
    updated_at: new Date().toISOString(),
    updated_by: guard.userId,
  })

  if (error) return { error: "Mentés sikertelen: " + error.message }

  revalidatePath("/settings")
  return { success: true }
}

// A meglévő titkosított értékek visszaolvasása (titok marad titok — csak átmozgatás)
async function getExistingPasswordEnc(admin: any, kulcs: string): Promise<string | null> {
  const { data } = await admin
    .from("rendszer_beallitas")
    .select("ertek")
    .eq("kulcs", kulcs)
    .maybeSingle()
  return (data?.ertek as any)?.imap_password_enc || null
}

async function getExistingBrevoEnc(admin: any, kulcs: string): Promise<string | null> {
  const { data } = await admin
    .from("rendszer_beallitas")
    .select("ertek")
    .eq("kulcs", kulcs)
    .maybeSingle()
  return (data?.ertek as any)?.brevo_api_key_enc || null
}

/**
 * Kapcsolat-teszt: a MENTETT adatokkal próbál csatlakozni az IMAP-kiszolgálóhoz.
 * Nem küld titkot a kliensnek — csak az eredményt.
 */
export async function testImapConnection() {
  const guard = await requireCredentialAdminAccess()
  if (guard.error) return { error: guard.error }

  const { createClient: createSupabaseClient } = await import("@supabase/supabase-js")
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const cred = await loadCompanyCredentialRow(guard.companyId!, admin)
  if (!cred?.imapHost || !cred?.imapUser || !cred?.imapPass) {
    return { error: "Még nincs mentett, teljes IMAP-konfiguráció — először mentsd el a beállításokat." }
  }

  try {
    const { ImapFlow } = await import("imapflow")
    const client = new ImapFlow({
      host: cred.imapHost,
      port: cred.imapPort || 993,
      secure: (cred.imapPort || 993) === 993,
      auth: { user: cred.imapUser, pass: cred.imapPass },
      logger: false,
    })
    await client.connect()
    await client.logout()
    return { success: true, message: `Sikeres kapcsolat: ${cred.imapHost}:${cred.imapPort} (${cred.imapUser})` }
  } catch (err: any) {
    return { error: "Kapcsolódás sikertelen: " + (err?.message || "ismeretlen hiba") }
  }
}
