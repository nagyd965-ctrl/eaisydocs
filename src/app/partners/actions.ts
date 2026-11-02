"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { requireDocsAuthServer } from "@/utils/docs-auth-guard"
import { getActiveCompanyIdServer } from "@/utils/company-server"

export async function savePartner(formData: FormData) {
  const auth = await requireDocsAuthServer(["admin", "rendszergazda", "iktato", "vezeto", "ugyintezo"])
  if (!auth.authorized || !auth.user) {
    return { error: auth.error || "Nincs jogosultságod partner mentéséhez." }
  }
  const supabase = await createClient()
  const activeCompanyId = auth.activeCompanyId || (await getActiveCompanyIdServer())

  const id = formData.get("id")?.toString()
  const nev = formData.get("nev")?.toString()?.trim()
  const tipus = formData.get("tipus")?.toString()?.trim() || "ceg"
  const szerepkor = formData.get("szerepkor")?.toString()?.trim() || "vevo"
  const statusz = formData.get("statusz")?.toString()?.trim() || "aktiv"
  const adoszam = formData.get("adoszam")?.toString()?.trim() || null
  const kulfoldi_adoszam = formData.get("kulfoldi_adoszam")?.toString()?.trim() || null
  const cegjegyzekszam = formData.get("cegjegyzekszam")?.toString()?.trim() || null
  const email = formData.get("email")?.toString()?.trim() || null
  const telefonszam = formData.get("telefonszam")?.toString()?.trim() || null
  const cim = formData.get("cim")?.toString()?.trim() || null
  const bankszamlaszam = formData.get("bankszamlaszam")?.toString()?.trim() || null
  const fizetesi_hatarido_nap_raw = formData.get("fizetesi_hatarido_nap")?.toString()?.trim()
  const fizetesi_hatarido_nap = fizetesi_hatarido_nap_raw ? parseInt(fizetesi_hatarido_nap_raw, 10) : 8
  const fizetesi_mod = formData.get("fizetesi_mod")?.toString()?.trim() || "atutalas"
  const weboldal = formData.get("weboldal")?.toString()?.trim() || null
  const megjegyzes = formData.get("megjegyzes")?.toString()?.trim() || null

  // Opcionális elsődleges kapcsolattartó adatok az űrlapról
  const kapcsolattarto_nev = formData.get("kapcsolattarto_nev")?.toString()?.trim()
  const kapcsolattarto_beosztas = formData.get("kapcsolattarto_beosztas")?.toString()?.trim() || null
  const kapcsolattarto_email = formData.get("kapcsolattarto_email")?.toString()?.trim() || null
  const kapcsolattarto_telefon = formData.get("kapcsolattarto_telefon")?.toString()?.trim() || null

  if (!nev) {
    return { error: "A név megadása kötelező." }
  }

  const payload = {
    nev,
    tipus,
    szerepkor,
    statusz,
    adoszam,
    kulfoldi_adoszam,
    cegjegyzekszam,
    email,
    telefonszam,
    cim,
    bankszamlaszam,
    fizetesi_hatarido_nap: isNaN(fizetesi_hatarido_nap) ? 8 : fizetesi_hatarido_nap,
    fizetesi_mod,
    weboldal,
    megjegyzes,
    ...(activeCompanyId ? { company_id: activeCompanyId } : {}),
  }

  let finalPartnerId = id

  if (id) {
    // Frissítés (kizárólag az aktív vállalaton belül)
    let updateQuery = supabase
      .from("partner")
      .update(payload)
      .eq("id", id)
    if (activeCompanyId) {
      updateQuery = updateQuery.eq("company_id", activeCompanyId)
    }
    const { error } = await updateQuery

    if (error) return { error: error.message }
  } else {
    // Új felvétel intelligens deduplikációval
    const { findOrCreatePartner } = await import("@/utils/partner-matcher")
    try {
      const res = await findOrCreatePartner(supabase, payload)
      finalPartnerId = res.id
      
      // Ha megadtak elsődleges kapcsolattartót új partnerhez, rögzítjük
      if (kapcsolattarto_nev && finalPartnerId) {
        await supabase.from("partner_kapcsolattarto").insert({
          partner_id: finalPartnerId,
          nev: kapcsolattarto_nev,
          beosztas: kapcsolattarto_beosztas,
          email: kapcsolattarto_email,
          telefonszam: kapcsolattarto_telefon,
          elsodleges: true,
        })
      }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  revalidatePath("/partners")
  if (finalPartnerId) {
    revalidatePath(`/partners/${finalPartnerId}`)
  }
  
  return { success: true, partnerId: finalPartnerId }
}

/**
 * Partner státuszának gyors átváltása (aktív <-> inaktív)
 */
export async function togglePartnerStatus(partnerId: string, currentStatus: string) {
  const auth = await requireDocsAuthServer(["admin", "rendszergazda", "iktato", "vezeto", "ugyintezo"])
  if (!auth.authorized || !auth.user) {
    return { error: auth.error || "Nincs jogosultságod partner státuszának módosításához." }
  }

  const supabase = await createClient()
  const nextStatus = currentStatus === "aktiv" ? "inaktiv" : "aktiv"

  let updateQuery = supabase
    .from("partner")
    .update({ statusz: nextStatus })
    .eq("id", partnerId)
  if (auth.activeCompanyId) {
    updateQuery = updateQuery.eq("company_id", auth.activeCompanyId)
  }
  const { error } = await updateQuery

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/partners")
  revalidatePath(`/partners/${partnerId}`)
  return { success: true, nextStatus }
}

/**
 * Partner kapcsolattartó mentése (hozzáadás vagy szerkesztés)
 */
export async function savePartnerContact(formData: FormData) {
  const auth = await requireDocsAuthServer(["admin", "rendszergazda", "iktato", "vezeto", "ugyintezo"])
  if (!auth.authorized || !auth.user) {
    return { error: auth.error || "Nincs jogosultságod kapcsolattartó mentéséhez." }
  }

  const supabase = await createClient()

  const id = formData.get("id")?.toString()?.trim()
  const partner_id = formData.get("partner_id")?.toString()?.trim()
  const nev = formData.get("nev")?.toString()?.trim()
  const beosztas = formData.get("beosztas")?.toString()?.trim() || null
  const email = formData.get("email")?.toString()?.trim() || null
  const telefonszam = formData.get("telefonszam")?.toString()?.trim() || null
  const elsodleges = formData.get("elsodleges") === "true" || formData.get("elsodleges") === "on"
  const megjegyzes = formData.get("megjegyzes")?.toString()?.trim() || null

  if (!partner_id) {
    return { error: "Hiányzó partner azonosító." }
  }
  if (!nev) {
    return { error: "A kapcsolattartó neve kötelező." }
  }

  // Ellenőrizzük, hogy a partner az aktív vállalathoz tartozik-e
  let partnerCheckQuery = supabase.from("partner").select("id").eq("id", partner_id)
  if (auth.activeCompanyId) {
    partnerCheckQuery = partnerCheckQuery.eq("company_id", auth.activeCompanyId)
  }
  const { data: targetPartner } = await partnerCheckQuery.maybeSingle()
  if (!targetPartner) {
    return { error: "A megadott partner nem található az aktív vállalatban." }
  }

  // Ha ez elsődleges, a többinél levehetjük az elsődleges jelölést
  if (elsodleges) {
    await supabase
      .from("partner_kapcsolattarto")
      .update({ elsodleges: false })
      .eq("partner_id", partner_id)
  }

  const payload = {
    partner_id,
    nev,
    beosztas,
    email,
    telefonszam,
    elsodleges,
    megjegyzes,
    updated_at: new Date().toISOString(),
  }

  if (id) {
    const { error } = await supabase
      .from("partner_kapcsolattarto")
      .update(payload)
      .eq("id", id)
      .eq("partner_id", partner_id)

    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from("partner_kapcsolattarto")
      .insert(payload)

    if (error) return { error: error.message }
  }

  revalidatePath(`/partners/${partner_id}`)
  revalidatePath("/partners")
  return { success: true }
}

/**
 * Partner kapcsolattartó törlése
 */
export async function deletePartnerContact(contactId: string, partnerId: string) {
  const auth = await requireDocsAuthServer(["admin", "rendszergazda", "iktato", "vezeto", "ugyintezo"])
  if (!auth.authorized || !auth.user) {
    return { error: auth.error || "Nincs jogosultságod kapcsolattartó törléséhez." }
  }

  const supabase = await createClient()

  let partnerCheckQuery = supabase.from("partner").select("id").eq("id", partnerId)
  if (auth.activeCompanyId) {
    partnerCheckQuery = partnerCheckQuery.eq("company_id", auth.activeCompanyId)
  }
  const { data: targetPartner } = await partnerCheckQuery.maybeSingle()
  if (!targetPartner) {
    return { error: "A megadott partner nem található az aktív vállalatban." }
  }

  const { error } = await supabase
    .from("partner_kapcsolattarto")
    .delete()
    .eq("id", contactId)
    .eq("partner_id", partnerId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/partners/${partnerId}`)
  revalidatePath("/partners")
  return { success: true }
}

/**
 * Valós idejű duplikáció-ellenőrzés
 */
export async function checkPartnerDuplicate(params: {
  nev?: string
  adoszam?: string
  kulfoldi_adoszam?: string
  currentId?: string
}) {
  const supabase = await createClient()
  const activeCompanyId = await getActiveCompanyIdServer()
  const clean = (val?: string | null) => (val ? val.replace(/[-\s.,/]/g, "").toUpperCase().trim() : "")

  let allQuery = supabase
    .from("partner")
    .select("id, nev, adoszam, kulfoldi_adoszam")
  if (activeCompanyId) {
    allQuery = allQuery.eq("company_id", activeCompanyId)
  }
  const { data: all } = await allQuery

  if (!all || all.length === 0) return { duplicate: null }

  const cleanAdoszam = clean(params.adoszam)
  const cleanKulfoldi = clean(params.kulfoldi_adoszam)
  const trimmedName = params.nev?.toLowerCase().trim()

  for (const p of all) {
    if (params.currentId && p.id === params.currentId) continue

    // 1. Adószám egyezés
    if (cleanAdoszam && p.adoszam && clean(p.adoszam) === cleanAdoszam) {
      return {
        duplicate: {
          id: p.id,
          nev: p.nev,
          reason: `Azonos belföldi adószám: ${p.adoszam}`,
        }
      }
    }

    // 2. Külföldi adószám egyezés
    if (cleanKulfoldi && p.kulfoldi_adoszam && clean(p.kulfoldi_adoszam) === cleanKulfoldi) {
      return {
        duplicate: {
          id: p.id,
          nev: p.nev,
          reason: `Azonos külföldi/EU adószám: ${p.kulfoldi_adoszam}`,
        }
      }
    }

    // 3. Pontos név egyezés
    if (trimmedName && p.nev.toLowerCase().trim() === trimmedName) {
      return {
        duplicate: {
          id: p.id,
          nev: p.nev,
          reason: `Már létezik partner pontosan ezzel a névvel`,
        }
      }
    }
  }

  return { duplicate: null }
}

export async function getPartnersLookup() {
  const supabase = await createClient()
  const activeCompanyId = await getActiveCompanyIdServer()
  let query = supabase
    .from("partner")
    .select("id, nev, tipus, szerepkor, statusz, email, adoszam")
    .order("nev")
  if (activeCompanyId) {
    query = query.eq("company_id", activeCompanyId)
  }
  const { data } = await query
  return data || []
}
