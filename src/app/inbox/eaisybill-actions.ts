"use server"

import { createClient } from "@/utils/supabase/server"
import { createEaisyBillClient } from "@/utils/supabase/eaisybill"
import { getActiveCompanyIdServer, getActiveCompanyServer } from "@/utils/company-server"
import { revalidatePath } from "next/cache"
import crypto from "crypto"

export type EaisyBillInvoice = {
  id: string
  bizonylatsorszam: string
  kibocsatas_datuma: string
  fizetesi_hatarido: string | null
  elado_nev: string
  elado_vat_id: string | null
  vevo_nev: string
  brutto_vegosszeg: string
  penznem: string
  statusz: string
  melleklet_url: string | null
  invoice_direction: "INBOUND" | "OUTBOUND"
  fizetve: boolean
}


/**
 * Lekéri az eaisyBill-ből az importálható számlákat.
 * Csak a bejelentkezett user cégéhez tartozó számlákat adja vissza.
 * Kiszűri azokat, amelyek az adott cégnél már be lettek hozva eaisyDocs-ba.
 */
export async function getImportableEaisyBillInvoices(): Promise<{
  invoices: EaisyBillInvoice[]
  error?: string
}> {
  try {
    const billClient = createEaisyBillClient()
    const docsClient = await createClient()

    // 0. Bejelentkezett user és aktív cég azonosítása
    const { data: { user } } = await docsClient.auth.getUser()
    if (!user?.email) return { invoices: [], error: "Nincs bejelentkezve." }

    const activeCompany = await getActiveCompanyServer()
    const activeCompanyId = activeCompany?.id || (await getActiveCompanyIdServer())

    // 1. eaisyBill Company ID meghatározása
    let companyId: string | null = null

    // Elsődleges és közvetlen forrás: a cég explicit eaisybill_company_id mezője
    if (activeCompany?.eaisybill_company_id) {
      companyId = activeCompany.eaisybill_company_id
    }

    // Másodlagos: ha a mező még üres, megpróbáljuk adószám vagy név alapján megtalálni és automatikusan elmenteni
    if (!companyId && activeCompany) {
      try {
        const cleanTax = activeCompany.tax_number?.replace(/[-\s]/g, "")
        if (cleanTax && cleanTax.length >= 8) {
          const { data: matchedComp } = await billClient
            .from("companies")
            .select("id")
            .ilike("tax_number", `%${cleanTax.slice(0, 8)}%`)
            .maybeSingle()
          if (matchedComp?.id) {
            companyId = matchedComp.id
          }
        }

        if (!companyId && activeCompany.name) {
          const { data: matchedComp } = await billClient
            .from("companies")
            .select("id")
            .ilike("name", `%${activeCompany.name.trim()}%`)
            .maybeSingle()
          if (matchedComp?.id) {
            companyId = matchedComp.id
          }
        }

        // Ha találtunk megbízható egyezést, automatikusan rögzítjük az eaisybill_company_id-t
        if (companyId) {
          await docsClient
            .from("companies")
            .update({ eaisybill_company_id: companyId })
            .eq("id", activeCompany.id)
        }
      } catch (matchErr) {
        console.warn("[eaisyBill] Cég párosítási figyelmeztetés:", matchErr)
      }
    }

    if (!companyId) {
      return {
        invoices: [],
        error: `A(z) „${activeCompany?.name || "Kiválasztott cég"}” nincs eaisyBill fiókhoz társítva. Importáld vagy válaszd ki a megfelelő eaisyBill céget a bal felső cégválasztóban!`
      }
    }

    // 2. Számlák lekérése – CSAK a megcélzott cég számláit
    const { data: billInvoices, error: billError } = await billClient
      .from("invoices")
      .select(`
        id, bizonylatsorszam, kibocsatas_datuma, fizetesi_hatarido,
        elado_nev, elado_vat_id, vevo_nev,
        brutto_vegosszeg, penznem, statusz,
        melleklet_url, invoice_direction, fizetve
      `)
      .eq("company_id", companyId)
      .not("melleklet_url", "is", null)
      .order("letrehozva", { ascending: false })
      .limit(100)

    if (billError) {
      return { invoices: [], error: "Hiba az eaisyBill lekérésekor: " + billError.message }
    }

    // 3. Lekérjük a már importált eaisyBill számla ID-kat eaisyDocs-ból az AKTUÁLIS céghez
    let alreadyImportedQuery = docsClient
      .from("irat")
      .select("kulso_hivatkozas_id")
      .eq("kulso_forras", "eaisybill")
      .not("kulso_hivatkozas_id", "is", null)

    if (activeCompanyId) {
      alreadyImportedQuery = alreadyImportedQuery.eq("company_id", activeCompanyId)
    }

    const { data: alreadyImported } = await alreadyImportedQuery

    const importedIds = new Set((alreadyImported || []).map(r => r.kulso_hivatkozas_id))

    // 4. Kiszűrjük a már importáltakat
    const importable = (billInvoices || []).filter(inv => !importedIds.has(inv.id))

    return { invoices: importable as EaisyBillInvoice[] }
  } catch (err: any) {
    return { invoices: [], error: err.message }
  }
}

/**
 * Átvesz egy eaisyBill számlát az eaisyDocs bejövő sorába.
 * A fájl NEM kerül eaisyDocs storage-ba – csak referencia jön létre.
 */
export async function importInvoiceFromEaisyBill(invoice: EaisyBillInvoice): Promise<{
  success: boolean
  error?: string
  erkeztetoszam?: string
}> {
  const docsClient = await createClient()

  const { data: { user } } = await docsClient.auth.getUser()
  if (!user) return { success: false, error: "Nincs bejelentkezve." }

  const activeCompanyId = await getActiveCompanyIdServer()

  // Jogosultság ellenőrzés
  const { data: profile } = await docsClient
    .from("felhasznalo_profil")
    .select("docs_szerepkor")
    .eq("id", user.id)
    .single()

  const isAllowed = ["admin", "rendszergazda", "iktato"].includes(profile?.docs_szerepkor || "")
  if (!isAllowed) return { success: false, error: "Nincs jogosultságod az érkeztetéshez." }

  // Duplikáció ellenőrzés az aktív céghez
  let existingQuery = docsClient
    .from("irat")
    .select("id, erkeztetoszam")
    .eq("kulso_forras", "eaisybill")
    .eq("kulso_hivatkozas_id", invoice.id)

  if (activeCompanyId) {
    existingQuery = existingQuery.eq("company_id", activeCompanyId)
  }

  const { data: existing } = await existingQuery.maybeSingle()

  if (existing) {
    return { success: false, error: `Már importálva (${existing.erkeztetoszam})` }
  }

  // Partner keresés / létrehozás az aktív céghez
  let partner_id: string | null = null
  if (invoice.elado_nev) {
    const { findOrCreatePartner } = await import("@/utils/partner-matcher")
    try {
      const partnerResult = await findOrCreatePartner(docsClient, {
        company_id: activeCompanyId,
        nev: invoice.elado_nev,
        tipus: "ceg",
        adoszam: invoice.elado_vat_id
      })
      partner_id = partnerResult.id
    } catch (err) {
      console.warn("eaisyBill partner match error:", err)
    }
  }

  // Érkeztetőszám generálás
  const currentYear = new Date().getFullYear()
  const { data: erkezId } = await docsClient.rpc("generate_erkeztetoszam", { p_ev: currentYear })
  const erkeztetoszam = erkezId || `E/${currentYear}/${Math.floor(10000 + Math.random() * 90000)}`

  // Tárgy összeállítás
  const targy = `${invoice.elado_nev} – ${invoice.bizonylatsorszam} sz. számla (${invoice.brutto_vegosszeg} ${invoice.penznem})`

  // Irat rekord létrehozása az aktív céghez
  const insertPayload: Record<string, any> = {
    targy,
    erkezes_modja:      "eaisybill",
    adathordozo_tipus:  "elektronikus_eredeti",
    minosites:          "nyilt",
    irany:              "bejovo",
    kuldo_partner_id:   partner_id,
    erkeztetoszam,
    kulso_forras:       "eaisybill",
    kulso_hivatkozas_id: invoice.id,
  }
  if (activeCompanyId) {
    insertPayload.company_id = activeCompanyId
  }

  const { data: iratData, error: iratError } = await docsClient
    .from("irat")
    .insert(insertPayload)
    .select("id")
    .single()

  if (iratError || !iratData) {
    return { success: false, error: "Irat létrehozási hiba: " + iratError?.message }
  }

  // irat_fajl rekord – a fájl a külső URL-en van, nem töltjük fel
  const fajlnev = invoice.melleklet_url?.split("/").pop() ?? `${invoice.bizonylatsorszam}.pdf`
  const placeholderHash = crypto
    .createHash("sha256")
    .update(invoice.id)
    .digest("hex")

  const { data: fajlResult, error: fajlError } = await docsClient
    .from("irat_fajl")
    .insert({
      irat_id:          iratData.id,
      storage_path:     `eaisybill:${invoice.id}`,  // placeholder – a valódi fájl kulso_fajl_url-ben van
      kulso_fajl_url:   invoice.melleklet_url,
      eredeti_fajlnev:  fajlnev,
      mime_type:        "application/pdf",
      meret_byte:       0,
      sha256:           placeholderHash,
    })
    .select("id")
    .single()

  if (fajlError) {
    return { success: false, error: "Fájl rekord hiba: " + fajlError.message }
  }

  // Háttér PDF/A konverzió sorba állítása
  try {
    const { enqueuePdfaConversion } = await import("@/utils/ai-worker-service")
    await enqueuePdfaConversion(iratData.id, fajlResult?.id, docsClient)
  } catch (pdfaErr) {
    console.warn("[eaisyBill Import] PDF/A enqueue error:", pdfaErr)
  }

  // Mentett keresések értesítése
  try {
    const { checkSavedSearchesForNewIrat } = await import("@/utils/saved-search-alerts")
    await checkSavedSearchesForNewIrat(iratData.id, docsClient)
  } catch (bgErr) {
    console.error("[eaisyBill Import] Error in background alert processing:", bgErr)
  }

  revalidatePath("/inbox")
  return { success: true, erkeztetoszam }
}
