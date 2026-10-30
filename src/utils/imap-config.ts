import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { decryptSecret, encryptSecret } from "./credential-crypto"

/**
 * Cég-szintű e-mail hitelesítő adatok (IMAP + Brevo) közös betöltője.
 *
 * Tárolás: rendszer_beallitas tábla, cég-specifikus kulccsal:
 *   hitelesito_adatok:{companyId}
 * Ugyanaz a migráció-mentes minta, mint a feladat-/válaszlevél-sablonoknál.
 * A jelszó és a Brevo API kulcs AES-256-GCM titkosítással tárolódik
 * (l. credential-crypto.ts — a tábla minden autentikált felhasználó számára
 * olvasható, ezért a nyers titok soha nem kerül az adatbázisba).
 */

export const CREDENTIAL_KEY_PREFIX = "hitelesito_adatok:"

export interface CompanyImapConfig {
  companyId: string
  host: string
  port: number
  user: string
  pass: string
  enabled: boolean
  brevoApiKey?: string | null
}

export interface CompanyCredentialRow {
  companyId: string
  imapHost: string | null
  imapPort: number | null
  imapUser: string | null
  imapEnabled: boolean
  imapPasswordSet: boolean
  brevoKeySet: boolean
  brevoApiKey?: string | null
  imapPass?: string | null
}

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/** A rendszer_beallitas kulcsából kinyert cégazonosító. */
export function companyIdFromKey(kulcs: string): string | null {
  if (!kulcs.startsWith(CREDENTIAL_KEY_PREFIX)) return null
  const id = kulcs.slice(CREDENTIAL_KEY_PREFIX.length)
  return id || null
}

/**
 * Egy cég hitelesítő sorának olvasása (service role).
 * A jelszó/brevo kulcs csak ezen a szerveroldali úton kerül visszafejtésre.
 */
export async function loadCompanyCredentialRow(
  companyId: string,
  db = adminClient()
): Promise<CompanyCredentialRow | null> {
  const { data: row } = await db
    .from("rendszer_beallitas")
    .select("kulcs, ertek")
    .eq("kulcs", `${CREDENTIAL_KEY_PREFIX}${companyId}`)
    .maybeSingle()

  if (!row?.ertek || typeof row.ertek !== "object") return null
  const e = row.ertek as any

  return {
    companyId,
    imapHost: e.imap_host || null,
    imapPort: e.imap_port ? Number(e.imap_port) : null,
    imapUser: e.imap_user || null,
    imapEnabled: e.imap_enabled !== false,
    imapPasswordSet: !!e.imap_password_enc,
    brevoKeySet: !!e.brevo_api_key_enc,
    imapPass: decryptSecret(e.imap_password_enc),
    brevoApiKey: decryptSecret(e.brevo_api_key_enc),
  }
}

/**
 * ÖSSZES engedélyezett cég IMAP-konfigurációjának betöltése (service role).
 * A worker minden ciklusban ezt hívja, és cégenként dolgozza fel a
 * saját postafiókját — így minden levél automatikusan a postafiók
 * tulajdonos cégéhez kerül.
 */
export async function loadCompanyImapConfigs(): Promise<CompanyImapConfig[]> {
  const db = adminClient()

  const { data: rows } = await db
    .from("rendszer_beallitas")
    .select("kulcs, ertek")
    .like("kulcs", `${CREDENTIAL_KEY_PREFIX}%`)

  if (rows && rows.length > 0) {
    const configs: CompanyImapConfig[] = []
    for (const r of rows) {
      const companyId = companyIdFromKey(r.kulcs)
      const e = r.ertek as any
      const pass = decryptSecret(e?.imap_password_enc)
      if (!companyId || !e?.imap_host || !e?.imap_user || !pass) continue
      if (e.imap_enabled === false) continue
      configs.push({
        companyId,
        host: e.imap_host,
        port: Number(e.imap_port) || 993,
        user: e.imap_user,
        pass,
        enabled: true,
        brevoApiKey: decryptSecret(e.brevo_api_key_enc),
      })
    }
    return configs
  }

  // ── ÁTMENETI AUTO-IMPORT ──
  // Ha még egyetlen cégnek sincs DB-ben hitelesítő adata, de a környezeti
  // változókban van IMAP-konfiguráció (EMAIL_HOST/USER/PASSWORD), akkor azt
  // egyszeri alkalommal elmentjük az ELSŐ cég (created_at szerint) nevére.
  // Így a meglévő (pl. Think AI) postafiók üzemelése megszakítás nélkül
  // folytatódik, a többi cég pedig üres = e-mail csatorna kikapcsolva.
  const envHost = process.env.EMAIL_HOST
  const envUser = process.env.EMAIL_USER
  const envPass = process.env.EMAIL_PASSWORD
  if (!envHost || !envUser || !envPass) return []

  const { data: firstCompany } = await db
    .from("companies")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!firstCompany) return []

  const port = parseInt(process.env.EMAIL_IMAP_PORT || "993", 10)
  const ertek = {
    imap_host: envHost,
    imap_port: port,
    imap_user: envUser,
    imap_password_enc: encryptSecret(envPass),
    imap_enabled: true,
    brevo_api_key_enc: process.env.BREVO_API_KEY
      ? encryptSecret(process.env.BREVO_API_KEY)
      : null,
  }

  const { error: seedError } = await db.from("rendszer_beallitas").upsert({
    kulcs: `${CREDENTIAL_KEY_PREFIX}${firstCompany.id}`,
    ertek,
    leiras: "Cég-szintű e-mail hitelesítő adatok (auto-import a környezeti változókból)",
  })
  if (seedError) {
    console.error("[IMAP-config] Auto-import sikertelen:", seedError.message)
    return []
  }

  console.log(
    `[IMAP-config] A környezeti változókban lévő IMAP-adatok auto-importálva lettek az első céghez: ${firstCompany.name} (${firstCompany.id}).`
  )

  return [
    {
      companyId: firstCompany.id,
      host: envHost,
      port,
      user: envUser,
      pass: envPass,
      enabled: true,
      brevoApiKey: process.env.BREVO_API_KEY || null,
    },
  ]
}
