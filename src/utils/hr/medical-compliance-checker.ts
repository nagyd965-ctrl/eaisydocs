/**
 * Munkavállaló orvosi alkalmassági megfelelőségi ellenőrző
 * Jogszabályi háttér: 1993. évi XCIII. tv. (Mvt. 49. § (1)), 33/1998. (VI. 24.) NM rendelet
 */

export type MedicalValidityStatus = "ervenyes" | "lejar_hamarosan" | "lejart" | "hianyzik"

export interface MedicalValidityResult {
  isValid: boolean
  status: MedicalValidityStatus
  daysRemaining: number | null
  statusLabel: string
  errorMessage?: string
}

/**
 * Megvizsgálja, hogy egy adott célnapon (targetDate) a dolgozó rendelkezik-e érvényes orvosi alkalmassággal.
 * Ha lejárt vagy nincs rögzítve, az isValid értéke false, és blokkoló hibaüzenetet ad vissza.
 */
export function checkMedicalValidityForDate(
  expiryDateStr?: string | null,
  targetDateInput?: string | Date
): MedicalValidityResult {
  const targetDateStr = targetDateInput
    ? typeof targetDateInput === "string"
      ? targetDateInput.split("T")[0]
      : targetDateInput.toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0]

  if (!expiryDateStr) {
    return {
      isValid: false,
      status: "hianyzik",
      daysRemaining: null,
      statusLabel: "Hiányzó orvosi vizsgálat",
      errorMessage: `A munkatársnak nincs rögzített orvosi alkalmassági vizsgálata! Az Mvt. 49. § (1) bekezdése alapján az alkalmassági vizsgálat elvégzéséig önálló munkavégzésre nem osztható be és műszakot nem nyithat.`,
    }
  }

  const expDateOnly = expiryDateStr.split("T")[0]

  const [tY, tM, tD] = targetDateStr.split("-").map(Number)
  const [eY, eM, eD] = expDateOnly.split("-").map(Number)

  const targetUtc = Date.UTC(tY, tM - 1, tD)
  const expUtc = Date.UTC(eY, eM - 1, eD)

  const diffMs = expUtc - targetUtc
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return {
      isValid: false,
      status: "lejart",
      daysRemaining: diffDays,
      statusLabel: `Lejárt (${Math.abs(diffDays)} napja)`,
      errorMessage: `A munkatárs orvosi alkalmassága ezen a napon (${targetDateStr}) már lejárt (${expDateOnly})! Az Mvt. 49. § (1) bekezdése alapján érvényes vizsgálat nélkül a munkavégzés és beosztás tiltott.`,
    }
  }

  if (diffDays <= 30) {
    return {
      isValid: true,
      status: "lejar_hamarosan",
      daysRemaining: diffDays,
      statusLabel: diffDays === 0 ? "Ma jár le!" : `Hamarosan lejár (${diffDays} nap)`,
    }
  }

  return {
    isValid: true,
    status: "ervenyes",
    daysRemaining: diffDays,
    statusLabel: "Érvényes",
  }
}
