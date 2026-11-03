import crypto from "crypto"

/**
 * Egységes, kriptográfiailag időzítés-biztos (timingSafeEqual) Cron-hitelesítés.
 * Kizárólag az Authorization fejlécet fogadja el (Bearer <CRON_SECRET> vagy <CRON_SECRET>),
 * URL query paraméterből (?secret=...) SOHA nem fogad el titkos kulcsot, hogy a titok
 * ne kerülhessen szerver- vagy proxy-naplókba.
 */
export function verifyCronAuth(request: Request): boolean {
  const expectedSecret = process.env.CRON_SECRET?.trim()
  if (!expectedSecret) {
    return false
  }

  const authHeader = request.headers.get("authorization")?.trim()
  if (!authHeader) {
    return false
  }

  const providedSecret = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader

  if (!providedSecret) {
    return false
  }

  const expectedBuf = Buffer.from(expectedSecret, "utf8")
  const providedBuf = Buffer.from(providedSecret, "utf8")

  if (expectedBuf.length !== providedBuf.length) {
    return false
  }

  return crypto.timingSafeEqual(expectedBuf, providedBuf)
}
