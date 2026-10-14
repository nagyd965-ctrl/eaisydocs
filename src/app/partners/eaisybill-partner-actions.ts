"use server"

import { createClient } from "@/utils/supabase/server"
import { createEaisyBillClient } from "@/utils/supabase/eaisybill"
import { getActiveCompanyIdServer, getActiveCompanyServer } from "@/utils/company-server"
import { revalidatePath } from "next/cache"

export interface EaisyBillPartnerItem {
  id: string
  name: string
  taxNumber: string | null
  euTaxNumber: string | null
  partnerType: "customer" | "supplier" | "both" | string
  address: string | null
  email: string | null
  bankAccountNumber: string | null
  countryCode: string | null
  status: "already_imported" | "ready_to_import"
  existingPartnerId?: string
}

export interface GetEaisyBillPartnersResult {
  success: boolean
  companyName?: string
  eaisybillCompanyId?: string
  partners?: EaisyBillPartnerItem[]
  totalCount?: number
  readyCount?: number
  alreadyImportedCount?: number
  error?: string
}

export interface ImportEaisyBillPartnersInput {
  partnerIds: string[]
  targetCompanyId?: string
}

export interface ImportEaisyBillPartnersResult {
  success: boolean
  importedCount?: number
  error?: string
}

/**
 * Automatikus jogi forma detektálás a partner nevéből
 */
function detectPartnerType(name: string): "ceg" | "maganszemely" | "egyeni_vallalkozo" | "intezmeny" | "egyeb" {
  if (!name) return "ceg"
  const upper = name.toUpperCase()
  
  if (
    upper.includes("KFT") || 
    upper.includes("ZRT") || 
    upper.includes("NYRT") || 
    upper.includes(" BT.") || 
    upper.includes(" BT ") || 
    upper.endsWith(" BT") ||
    upper.includes("KKT") ||
    upper.includes("GMBH") ||
    upper.includes("LTD") ||
    upper.includes("INC") ||
    upper.includes("S.R.O.") ||
    upper.includes("S.A.S.") ||
    upper.includes("SP. Z O.O.")
  ) {
    return "ceg"
  }

  if (
    upper.includes("E.V.") || 
    upper.includes("E. V.") || 
    upper.includes("EGYÉNI VÁLLALKOZÓ") ||
    upper.includes("EGYENI VALLALKOZO")
  ) {
    return "egyeni_vallalkozo"
  }

  if (
    upper.includes("MINISZTÉRIUM") ||
    upper.includes("HIVATAL") ||
    upper.includes("ÖNKORMÁNYZAT") ||
    upper.includes("RENDŐRSÉG") ||
    upper.includes("BÍRÓSÁG") ||
    upper.includes("NAV")
  ) {
    return "intezmeny"
  }

  return "ceg"
}

/**
 * Szerepkör megfeleltetés: eaisyBill partner_type -> eaisyDocs szerepkör
 */
function mapPartnerRole(partnerType: string): "vevo" | "szallito" | "mindketto" {
  switch (partnerType?.toLowerCase()) {
    case "customer":
      return "vevo"
    case "supplier":
      return "szallito"
    case "both":
      return "mindketto"
    default:
      return "vevo"
  }
}

/**
 * Lekéri az eaisyBill partnereket az aktív céghez, és összeveti a helyi partnertörzzsel
 */
export async function getEaisyBillPartnersAction(
  targetCompanyId?: string
): Promise<GetEaisyBillPartnersResult> {
  try {
    const docsClient = await createClient()
    const { data: { user } } = await docsClient.auth.getUser()

    if (!user) {
      return { success: false, error: "Nincs bejelentkezett felhasználó." }
    }

    // 1. Cég meghatározása
    let activeCompany = null
    if (targetCompanyId) {
      const { data } = await docsClient.from("companies").select("*").eq("id", targetCompanyId).maybeSingle()
      activeCompany = data
    } else {
      activeCompany = await getActiveCompanyServer()
    }

    if (!activeCompany) {
      return { success: false, error: "Nem található a kiválasztott cég." }
    }

    const billClient = createEaisyBillClient()

    // 2. eaisyBill Company ID meghatározása
    let eaisybillCompanyId = activeCompany.eaisybill_company_id

    // Ha még nincs összekötve, megpróbáljuk adószám vagy név alapján megkeresni
    if (!eaisybillCompanyId) {
      try {
        const cleanTax = activeCompany.tax_number?.replace(/[-\s]/g, "")
        if (cleanTax && cleanTax.length >= 8) {
          const { data: matchedComp } = await billClient
            .from("companies")
            .select("id")
            .ilike("tax_number", `%${cleanTax.slice(0, 8)}%`)
            .maybeSingle()
          if (matchedComp?.id) {
            eaisybillCompanyId = matchedComp.id
          }
        }

        if (!eaisybillCompanyId && activeCompany.name) {
          const { data: matchedComp } = await billClient
            .from("companies")
            .select("id")
            .ilike("name", `%${activeCompany.name.trim()}%`)
            .maybeSingle()
          if (matchedComp?.id) {
            eaisybillCompanyId = matchedComp.id
          }
        }

        // Ha találtunk egyezést, automatikusan rögzítjük
        if (eaisybillCompanyId) {
          await docsClient
            .from("companies")
            .update({ eaisybill_company_id: eaisybillCompanyId })
            .eq("id", activeCompany.id)
        }
      } catch (matchErr) {
        console.warn("[eaisyBill] Partner cég párosítási figyelmeztetés:", matchErr)
      }
    }

    if (!eaisybillCompanyId) {
      return {
        success: false,
        error: `A(z) „${activeCompany.name}” nincs eaisyBill céghez társítva. Importáld vagy válaszd ki a megfelelő eaisyBill céget a bal felső cégválasztóban!`
      }
    }

    // 3. Lekérjük az eaisyBill partnereket az adott céghez
    const { data: billPartners, error: billErr } = await billClient
      .from("partners")
      .select("id, name, tax_number, eu_tax_number, partner_type, address, email, bank_account_number, country_code")
      .eq("company_id", eaisybillCompanyId)
      .order("name")

    if (billErr) {
      console.error("Hiba az eaisyBill partnerek lekérésekor:", billErr)
      return { success: false, error: `eaisyBill hiba: ${billErr.message}` }
    }

    if (!billPartners || billPartners.length === 0) {
      return {
        success: true,
        companyName: activeCompany.name,
        eaisybillCompanyId,
        partners: [],
        totalCount: 0,
        readyCount: 0,
        alreadyImportedCount: 0
      }
    }

    // 4. Lekérjük az eaisyDocs helyi partnereit az aktív cégben
    const { data: docsPartners, error: docsErr } = await docsClient
      .from("partner")
      .select("id, nev, adoszam, kulfoldi_adoszam, email, eaisybill_partner_id")
      .eq("company_id", activeCompany.id)

    if (docsErr) {
      console.error("Hiba a helyi partnerek lekérésekor:", docsErr)
      return { success: false, error: `Helyi adatbázis hiba: ${docsErr.message}` }
    }

    // Indexeljük a helyi partnereket a gyors összevetéshez
    const byBillId = new Map<string, string>()
    const byTaxNumber = new Map<string, string>()
    const byName = new Map<string, string>()

    for (const p of docsPartners || []) {
      if (p.eaisybill_partner_id) {
        byBillId.set(p.eaisybill_partner_id, p.id)
      }
      if (p.adoszam) {
        const clean = p.adoszam.replace(/[-\s]/g, "").slice(0, 8)
        if (clean) byTaxNumber.set(clean, p.id)
      }
      if (p.kulfoldi_adoszam) {
        byTaxNumber.set(p.kulfoldi_adoszam.trim().toLowerCase(), p.id)
      }
      if (p.nev) {
        byName.set(p.nev.trim().toLowerCase(), p.id)
      }
    }

    // 5. Partnerek feldolgozása és státuszának meghatározása
    let readyCount = 0
    let alreadyImportedCount = 0

    const partners: EaisyBillPartnerItem[] = billPartners.map((bp: any) => {
      let isAlreadyImported = false
      let existingPartnerId: string | undefined = undefined

      // 1. eaisybill_partner_id egyezés
      if (byBillId.has(bp.id)) {
        isAlreadyImported = true
        existingPartnerId = byBillId.get(bp.id)
      }

      // 2. Adószám egyezés (első 8 jegy)
      if (!isAlreadyImported && bp.tax_number) {
        const cleanTax = bp.tax_number.replace(/[-\s]/g, "").slice(0, 8)
        if (cleanTax && byTaxNumber.has(cleanTax)) {
          isAlreadyImported = true
          existingPartnerId = byTaxNumber.get(cleanTax)
        }
      }

      // 3. Külföldi / EU adószám egyezés
      if (!isAlreadyImported && bp.eu_tax_number) {
        const cleanEu = bp.eu_tax_number.trim().toLowerCase()
        if (byTaxNumber.has(cleanEu)) {
          isAlreadyImported = true
          existingPartnerId = byTaxNumber.get(cleanEu)
        }
      }

      // 4. Név egyezés
      if (!isAlreadyImported && bp.name) {
        const cleanName = bp.name.trim().toLowerCase()
        if (byName.has(cleanName)) {
          isAlreadyImported = true
          existingPartnerId = byName.get(cleanName)
        }
      }

      if (isAlreadyImported) {
        alreadyImportedCount++
      } else {
        readyCount++
      }

      return {
        id: bp.id,
        name: bp.name || "Névtelen partner",
        taxNumber: bp.tax_number || null,
        euTaxNumber: bp.eu_tax_number || null,
        partnerType: bp.partner_type || "customer",
        address: bp.address || null,
        email: bp.email || null,
        bankAccountNumber: bp.bank_account_number || null,
        countryCode: bp.country_code || null,
        status: isAlreadyImported ? "already_imported" : "ready_to_import",
        existingPartnerId
      }
    })

    return {
      success: true,
      companyName: activeCompany.name,
      eaisybillCompanyId,
      partners,
      totalCount: partners.length,
      readyCount,
      alreadyImportedCount
    }
  } catch (err: unknown) {
    console.error("Kivétel a getEaisyBillPartnersAction során:", err)
    const msg = err instanceof Error ? err.message : "Ismeretlen hiba történt."
    return { success: false, error: msg }
  }
}

/**
 * Kiválasztott eaisyBill partnerek importálása az eaisyDocs partnertörzsbe
 */
export async function importEaisyBillPartnersAction(
  input: ImportEaisyBillPartnersInput
): Promise<ImportEaisyBillPartnersResult> {
  try {
    const { partnerIds, targetCompanyId } = input

    if (!partnerIds || partnerIds.length === 0) {
      return { success: false, error: "Nincs kiválasztva importálandó partner." }
    }

    const docsClient = await createClient()
    const { data: { user } } = await docsClient.auth.getUser()

    if (!user) {
      return { success: false, error: "Nincs bejelentkezett felhasználó." }
    }

    // 1. Cég meghatározása
    let activeCompany = null
    if (targetCompanyId) {
      const { data } = await docsClient.from("companies").select("*").eq("id", targetCompanyId).maybeSingle()
      activeCompany = data
    } else {
      activeCompany = await getActiveCompanyServer()
    }

    if (!activeCompany) {
      return { success: false, error: "Nem található a kiválasztott cég." }
    }

    const billClient = createEaisyBillClient()

    // 2. Lekérjük a kijelölt partnereket az eaisyBill-ből
    const { data: billPartners, error: billErr } = await billClient
      .from("partners")
      .select("*")
      .in("id", partnerIds)

    if (billErr || !billPartners || billPartners.length === 0) {
      return { success: false, error: `Nem sikerült lekérni a partnereket az eaisyBill-ből: ${billErr?.message || "Üres lista"}` }
    }

    // 3. Lekérjük a már létező partnereket, hogy elkerüljük a duplikációt
    const { data: existingDocsPartners } = await docsClient
      .from("partner")
      .select("id, eaisybill_partner_id, adoszam, nev")
      .eq("company_id", activeCompany.id)

    const existingBillIds = new Set((existingDocsPartners || []).map((p: any) => p.eaisybill_partner_id).filter(Boolean))

    // 4. Partner rekordok összeállítása beszúrásra
    const newPartnersToInsert: any[] = []

    for (const bp of billPartners) {
      // Ha már bent van az adott eaisybill_partner_id-val ebben a cégben, kihagyjuk
      if (existingBillIds.has(bp.id)) continue

      const isForeignTax = bp.tax_number?.startsWith("FOREIGN:") || !bp.tax_number?.includes("-") && (bp.tax_number?.length || 0) < 8

      newPartnersToInsert.push({
        nev: bp.name?.trim() || "Névtelen partner",
        adoszam: isForeignTax ? null : (bp.tax_number || null),
        kulfoldi_adoszam: bp.eu_tax_number || (isForeignTax ? bp.tax_number : null),
        cim: bp.address?.trim() || null,
        email: bp.email?.trim() || null,
        bankszamlaszam: bp.bank_account_number?.trim() || null,
        szerepkor: mapPartnerRole(bp.partner_type),
        tipus: detectPartnerType(bp.name),
        statusz: "aktiv",
        fizetesi_hatarido_nap: 8,
        fizetesi_mod: "atutalas",
        company_id: activeCompany.id,
        eaisybill_partner_id: bp.id
      })
    }

    if (newPartnersToInsert.length === 0) {
      return { success: true, importedCount: 0 }
    }

    // 5. Beszúrás az eaisyDocs partner táblájába
    const { data: insertedData, error: insertErr } = await docsClient
      .from("partner")
      .insert(newPartnersToInsert)
      .select("id, nev")

    if (insertErr) {
      console.error("Hiba a partnerek beszúrásakor:", insertErr)
      return { success: false, error: `Hiba a partnerek mentésekor: ${insertErr.message}` }
    }

    const importedCount = insertedData?.length || 0

    // 6. Audit naplózás
    try {
      await docsClient.from("esemeny_naplo").insert({
        entitas_tipus: "partner",
        esemeny_tipus: "letrehozas",
        user_id: user.id,
        indoklas: `${importedCount} partner importálva eaisyBill partnertörzsből (${activeCompany.name})`
      })
    } catch (logErr) {
      console.warn("Audit napló figyelmeztetés partner importáláskor:", logErr)
    }

    // 7. Oldal gyorsítótár ürítése
    revalidatePath("/partners")

    return {
      success: true,
      importedCount
    }
  } catch (err: unknown) {
    console.error("Kivétel az importEaisyBillPartnersAction során:", err)
    const msg = err instanceof Error ? err.message : "Ismeretlen hiba történt."
    return { success: false, error: msg }
  }
}
