import { SupabaseClient } from "@supabase/supabase-js"

export interface PartnerLookupParams {
  nev: string
  tipus?: string | null
  adoszam?: string | null
  email?: string | null
  telefonszam?: string | null
  cim?: string | null
}

/**
 * Normalizál egy nevet az összehasonlításhoz:
 * - Kisbetűssé alakít
 * - Levágja a felesleges szóközöket és írásjeleket
 * - Eltávolítja a pontokat (pl. "Kft." -> "kft")
 */
export function normalizePartnerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Magánszemélyeknél előállítja a fordított névformátumot (pl. "Nagy Dániel" -> "Dániel Nagy")
 */
export function getReversedPersonName(name: string): string | null {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 2) {
    return `${parts[1]} ${parts[0]}`
  }
  return null
}

/**
 * Intelligens partnerkeresés és duplikációmentes mentés:
 * 1. Keres adószám alapján (ha megadva)
 * 2. Keres pontos / kis-nagybetű független név alapján
 * 3. Magánszemélynél keres megfordított név alapján (pl. Dániel Nagy vs Nagy Dániel)
 * 4. Keres e-mail cím alapján (ha megadva)
 * 5. Ha talál meglévőt, frissíti az esetleges hiányzó adatokat és visszaadja az ID-t
 * 6. Ha nem talál, létrehoz egy új partnert és visszaadja az ID-t
 */
export async function findOrCreatePartner(
  supabase: SupabaseClient,
  params: PartnerLookupParams
): Promise<{ id: string; isNew: boolean }> {
  const trimmedName = params.nev?.trim()
  if (!trimmedName) {
    throw new Error("Partner név megadása kötelező!")
  }

  const tipus = params.tipus || "ceg"
  const normalizedSearch = normalizePartnerName(trimmedName)

  // 1. Lekérjük az összes partnert az intelligens összehasonlításhoz
  const { data: allPartners, error } = await supabase
    .from("partner")
    .select("id, nev, tipus, adoszam, email, telefonszam, cim")

  if (error) {
    console.error("Partner lekérdezési hiba:", error)
  }

  const matchedPartner = (allPartners || []).find(p => {
    // 1. Adószám egyezés
    if (params.adoszam && p.adoszam && p.adoszam.replace(/[-\s]/g, "") === params.adoszam.replace(/[-\s]/g, "")) {
      return true
    }

    // 2. E-mail egyezés
    if (params.email && p.email && p.email.toLowerCase().trim() === params.email.toLowerCase().trim()) {
      return true
    }

    // 3. Név egyezés (normalizált)
    const pNorm = normalizePartnerName(p.nev)
    if (pNorm === normalizedSearch) {
      return true
    }

    // 4. Magánszemély fordított név ellenőrzés (pl. Nagy Dániel == Dániel Nagy)
    const reversed = getReversedPersonName(trimmedName)
    if (reversed && normalizePartnerName(reversed) === pNorm) {
      return true
    }

    return false
  })

  if (matchedPartner) {
    // Frissítjük a meglévő partner hiányzó adatait ha most kaptunk újakat
    const updates: Record<string, string> = {}
    if (!matchedPartner.adoszam && params.adoszam) updates.adoszam = params.adoszam
    if (!matchedPartner.email && params.email) updates.email = params.email
    if (!matchedPartner.telefonszam && params.telefonszam) updates.telefonszam = params.telefonszam
    if (!matchedPartner.cim && params.cim) updates.cim = params.cim
    if (params.tipus && matchedPartner.tipus !== params.tipus && matchedPartner.tipus === "ceg" && params.tipus === "maganszemely") {
      updates.tipus = params.tipus
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from("partner").update(updates).eq("id", matchedPartner.id)
    }

    return { id: matchedPartner.id, isNew: false }
  }

  // Ha nem találtunk egyezést -> Új partner beszúrása
  const { data: newPartner, error: insertError } = await supabase
    .from("partner")
    .insert({
      nev: trimmedName,
      tipus: tipus,
      adoszam: params.adoszam || null,
      email: params.email || null,
      telefonszam: params.telefonszam || null,
      cim: params.cim || null
    })
    .select("id")
    .single()

  if (insertError || !newPartner) {
    throw new Error(`Nem sikerült a partnert létrehozni: ${insertError?.message}`)
  }

  return { id: newPartner.id, isNew: true }
}
