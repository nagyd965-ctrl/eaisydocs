import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * eaisyBill cross-project Supabase kliens.
 * CSAK szerver oldalon (Server Actions, Server Components) használható!
 * A service_role kulcs soha nem kerülhet a böngészőbe.
 */
export function createEaisyBillClient() {
  const url = process.env.EAISYBILL_SUPABASE_URL
  const key = process.env.EAISYBILL_SUPABASE_SERVICE_KEY

  if (!url || !key) {
    throw new Error("Hiányzó eaisyBill Supabase konfiguráció (EAISYBILL_SUPABASE_URL / EAISYBILL_SUPABASE_SERVICE_KEY)")
  }

  return createSupabaseClient(url, key)
}
