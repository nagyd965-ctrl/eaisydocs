"use server"

import { createClient } from "@/utils/supabase/server"

/** MFA faktorok lekérése az adott userhez */
export async function getMfaFactors() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) return { factors: [], totpFactor: null }
  const totpFactor = data.totp.find((f: any) => f.status === "verified") ?? null
  return { factors: data.totp, totpFactor }
}

/** MFA TOTP regisztráció indítása — visszaad egy QR kód URI-t és factor ID-t */
export async function enrollMfa() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "eaisyDocs" })
  if (error) return { error: error.message }
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  }
}

/** MFA TOTP megerősítése az első kóddal (enrollment befejezése) */
export async function verifyMfaEnrollment(factorId: string, code: string) {
  const supabase = await createClient()

  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
  if (challengeError) return { error: challengeError.message }

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  })
  if (error) return { error: "Hibás kód. Próbáld újra." }
  return { success: true }
}

/** MFA kikapcsolása (factor törlése) */
export async function unenrollMfa(factorId: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) return { error: error.message }
  return { success: true }
}

/** MFA challenge + verify a bejelentkezés utáni ellenőrzéshez */
export async function verifyMfaLogin(factorId: string, code: string) {
  const supabase = await createClient()

  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
  if (challengeError) return { error: challengeError.message }

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  })
  if (error) return { error: "Hibás kód. Ellenőrizd a hitelesítő alkalmazást." }
  return { success: true }
}
