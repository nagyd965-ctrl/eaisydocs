/**
 * Magyar és Külföldi / EU Adószám Kezelő és Osztályozó Segédfüggvények
 * 
 * Szabályok:
 * - Magyar adószám: 8 számjegyű törzsszám vagy 11 számjegyű (XXXXXXXX-Y-ZZ formátum)
 *   ahol X: 8 jegyű törzsszám, Y: ÁFA kód (1-5), ZZ: megyekód (02-44, 51).
 * - Közösségi / EU adószám: 2 betűs országkóddal kezdődik (pl. HU12345678, DE123456789, ATU12345678).
 * - Külföldi adóazonosító: Egyéb nemzetközi cégazonosító (pl. szerb PIB 9 jegyű, román CUI, stb.).
 */

export interface TaxNumberClassification {
  type: "magyar" | "kulfoldi_eu" | "ismeretlen"
  clean: string
  formatted: string
}

export interface SeparatedTaxNumbers {
  magyarAdoszam: string | null
  kulfoldiAdoszam: string | null
}

/**
 * Eltávolítja a szóközöket és a felesleges karaktereket.
 */
export function cleanTaxNumber(tax?: string | null): string {
  if (!tax) return ""
  return tax.replace(/[-\s.,/]/g, "").trim()
}

/**
 * Megállapítja, hogy a szöveg érvényes magyar belföldi adószám-e (8 jegy vagy 11 jegy).
 */
export function isHungarianTaxNumber(tax?: string | null): boolean {
  if (!tax) return false
  const trimmed = tax.trim()
  
  // 11 karakteres kötőjeles: XXXXXXXX-Y-ZZ
  if (/^\d{8}-[1-5]-(?:0[2-9]|[1-3][0-9]|4[0-4]|51)$/.test(trimmed)) {
    return true
  }

  // Csak számjegyek
  const clean = cleanTaxNumber(trimmed)
  if (clean.length === 8 && /^\d{8}$/.test(clean)) {
    return true
  }
  if (clean.length === 11 && /^\d{11}$/.test(clean)) {
    const afa = clean.charAt(8)
    return ["1", "2", "3", "4", "5"].includes(afa)
  }

  return false
}

/**
 * Megállapítja, hogy a szöveg EU közösségi adószám vagy külföldi adóazonosító-e.
 */
export function isEuOrForeignTaxNumber(tax?: string | null): boolean {
  if (!tax) return false
  const trimmed = tax.trim().toUpperCase()
  const clean = trimmed.replace(/[-\s.,/]/g, "")

  // EU Országkódos formátum (pl. HU12345678, DE123456789, ATU12345678, SK1234567890, RO12345678, stb.)
  const euVatRegex = /^(?:AT[U0-9]|BE[01]|BG[0-9]|CY[0-9]|CZ[0-9]|DE[0-9]|DK[0-9]|EE[0-9]|EL[0-9]|ES[0-9A-Z]|FI[0-9]|FR[0-9A-Z]|HR[0-9]|HU[0-9]|IE[0-9A-Z]|IT[0-9]|LT[0-9]|LU[0-9]|LV[0-9]|MT[0-9]|NL[0-9A-Z]|PL[0-9]|PT[0-9]|RO[0-9]|SE[0-9]|SI[0-9]|SK[0-9])[A-Z0-9]{5,15}$/
  if (euVatRegex.test(clean)) {
    return true
  }

  // Általános 2 betűs országkódos adószám (pl. GB, CH, RS, US, stb.)
  if (/^[A-Z]{2}[0-9A-Z]{4,16}$/.test(clean)) {
    return true
  }

  // US EIN (pl. US EIN 61-1797223, EIN 61-1797223, vagy XX-XXXXXXX formátum)
  if (/(?:US\s*)?EIN\s*[:#]?\s*\d{2}-?\d{7}/i.test(trimmed) || /^\d{2}-\d{7}$/.test(trimmed)) {
    return true
  }

  // Nem magyar számformátumok (pl. szerb PIB: 9 számjegy, nem illeszkedik 8 vagy 11 magyar jegyhez)
  if (/^\d{9,10}$/.test(clean) && !isHungarianTaxNumber(tax)) {
    return true
  }

  return false
}

/**
 * Szabványos formára hozza a magyar adószámot (XXXXXXXX-Y-ZZ ha 11 jegyű, vagy XXXXXXXX ha 8 jegyű).
 */
export function formatHungarianTaxNumber(tax?: string | null): string | null {
  if (!tax) return null
  const trimmed = tax.trim()
  
  // Ha már kötőjeles formában van
  if (/^\d{8}-[1-5]-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  const clean = cleanTaxNumber(trimmed)
  if (clean.length === 11 && /^\d{11}$/.test(clean)) {
    return `${clean.slice(0, 8)}-${clean.charAt(8)}-${clean.slice(9, 11)}`
  }
  if (clean.length === 8 && /^\d{8}$/.test(clean)) {
    return clean
  }

  return trimmed || null
}

/**
 * Külföldi / EU adószám egységesítése (nagybetűsítés, felesleges szóközök eltávolítása).
 */
export function formatForeignTaxNumber(tax?: string | null): string | null {
  if (!tax) return null
  const trimmed = tax.trim().toUpperCase()
  return trimmed || null
}

/**
 * Szétválasztja és pontosan besorolja az esetlegesen egyben érkező vagy felcserélt adószámokat.
 * 
 * Példák:
 * - "32478520-2-41, HU32478520" -> magyar: "32478520-2-41", kulfoldi: "HU32478520"
 * - adoszam: "HU32478520", kulfoldi: null -> magyar: "32478520", kulfoldi: "HU32478520"
 * - adoszam: "101092577" (szerb PIB) -> magyar: null, kulfoldi: "101092577"
 */
export function separateTaxNumbers(
  rawAdoszam?: string | null,
  rawKulfoldi?: string | null
): SeparatedTaxNumbers {
  let magyar: string | null = null
  let kulfoldi: string | null = null

  // 1. Ha az adószám mező vesszővel vagy / jellel elválasztva több értéket tartalmaz
  const combined = [rawAdoszam, rawKulfoldi].filter(Boolean).join(" ")
  const tokens = combined
    .split(/[,;\s/]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 6)

  for (const token of tokens) {
    if (token.toUpperCase().startsWith("HU") && token.length >= 10) {
      // HU32478520 -> Közösségi adószám
      kulfoldi = formatForeignTaxNumber(token)
      if (!magyar) {
        // Ha nincs magyar belföldi megadva, a HU utáni 8 jegyű törzsszám magyar adószámként is funkcionálhat
        const core = token.slice(2).trim()
        if (/^\d{8}$/.test(core)) {
          magyar = core
        }
      }
    } else if (isHungarianTaxNumber(token)) {
      magyar = formatHungarianTaxNumber(token)
    } else if (isEuOrForeignTaxNumber(token)) {
      kulfoldi = formatForeignTaxNumber(token)
    } else if (/^\d{8}$/.test(token) && !magyar) {
      magyar = token
    } else if (!kulfoldi) {
      kulfoldi = token
    }
  }

  // Ha csak a rawAdoszam vagy rawKulfoldi volt megadva közvetlenül és nem sikerült a tokenizálás:
  if (!magyar && rawAdoszam && isHungarianTaxNumber(rawAdoszam)) {
    magyar = formatHungarianTaxNumber(rawAdoszam)
  }
  if (!kulfoldi && rawKulfoldi) {
    kulfoldi = formatForeignTaxNumber(rawKulfoldi)
  }

  return {
    magyarAdoszam: magyar,
    kulfoldiAdoszam: kulfoldi
  }
}
