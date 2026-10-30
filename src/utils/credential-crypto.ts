import crypto from "crypto"

/**
 * Cég-szintű hitelesítő adatok titkosítása (AES-256-GCM).
 *
 * Miért kötelező a titkosítás? A rendszer_beallitas táblán az RLS-szabály
 * "Minden autentikált látja a rendszerbeállításokat" — vagyis a tábla sorai
 * minden bejelentkezett felhasználó számára olvashatók. A jelszavak / API
 * kulcsok ezért titkosítva kerülnek az adatbázisba; a titkosító kulcs
 * kizárólag a szerveroldali környezeti változókban él.
 *
 * Kulcs: CREDENTIAL_ENCRYPTION_KEY (ajánlott), ennek hiányában a
 * SUPABASE_SERVICE_ROLE_KEY-ből származtatunk stabil kulcsot.
 *
 * Formátum: enc:v1:<iv_b64>:<tag_b64>:<data_b64>
 */

const SALT = "eaisydocs-credential-crypto-v1"
const PREFIX = "enc:v1:"

function deriveKey(): Buffer {
  const secret =
    process.env.CREDENTIAL_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eaisydocs-local-development-fallback"
  return crypto.scryptSync(secret, SALT, 32)
}

/** Titkosít egy titkot (jelszó, API kulcs) adatbázisba tároláshoz. */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`
}

/** Visszafejt egy titkot; érvénytelen/hiányzó érték esetén null. */
export function decryptSecret(payload: string | null | undefined): string | null {
  if (!payload || !payload.startsWith(PREFIX)) return null
  const parts = payload.split(":")
  if (parts.length !== 5) return null
  try {
    const iv = Buffer.from(parts[2], "base64")
    const tag = Buffer.from(parts[3], "base64")
    const data = Buffer.from(parts[4], "base64")
    const decipher = crypto.createDecipheriv("aes-256-gcm", deriveKey(), iv)
    decipher.setAuthTag(tag)
    const dec = Buffer.concat([decipher.update(data), decipher.final()])
    return dec.toString("utf8")
  } catch {
    return null
  }
}
