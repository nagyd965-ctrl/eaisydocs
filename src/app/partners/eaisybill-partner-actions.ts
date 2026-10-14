"use server"

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createEaisyBillClient } from "@/utils/supabase/eaisybill"
import { getActiveCompanyIdServer, getActiveCompanyServer } from "@/utils/company-server"
import { revalidatePath } from "next/cache"
import crypto from "crypto"

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

    // 7. Számlák automatikus szinkronizálása az importált partnerekhez
    try {
      const insertedPartnerIds = insertedData.map((p: any) => p.id)
      await syncEaisyBillPartnerInvoicesAction({
        targetCompanyId: activeCompany.id,
        partnerIds: insertedPartnerIds
      })
    } catch (syncErr) {
      console.warn("Automatikus számlaszinkronizálási figyelmeztetés partner importálás után:", syncErr)
    }

    // 8. Oldal gyorsítótár ürítése
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

export interface SyncPartnerInvoicesInput {
  partnerId?: string
  partnerIds?: string[]
  targetCompanyId?: string
  skipRevalidate?: boolean
}

export interface SyncPartnerInvoicesResult {
  success: boolean
  syncedCount: number
  error?: string
}

/**
 * Szinkronizálja az eaisyBill-ben lévő (PDF melléklettel rendelkező) számlákat az eaisyDocs iratforgalomba.
 * Támogatja egyetlen partner felzárkóztatását, listát vagy a teljes cég szinkronizálását.
 */
export async function syncEaisyBillPartnerInvoicesAction(
  input?: SyncPartnerInvoicesInput
): Promise<SyncPartnerInvoicesResult> {
  try {
    const docsClient = await createClient()
    const { data: { user } } = await docsClient.auth.getUser()

    if (!user) {
      return { success: false, syncedCount: 0, error: "Nincs bejelentkezett felhasználó." }
    }

    // 1. Cég meghatározása
    let activeCompany = null
    if (input?.targetCompanyId) {
      const { data } = await docsClient.from("companies").select("*").eq("id", input.targetCompanyId).maybeSingle()
      activeCompany = data
    } else {
      activeCompany = await getActiveCompanyServer()
    }

    if (!activeCompany) {
      return { success: false, syncedCount: 0, error: "Nem található a kiválasztott cég." }
    }

    const billClient = createEaisyBillClient()

    // 2. eaisyBill Company ID meghatározása
    let eaisybillCompanyId = activeCompany.eaisybill_company_id

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

        if (eaisybillCompanyId) {
          await docsClient
            .from("companies")
            .update({ eaisybill_company_id: eaisybillCompanyId })
            .eq("id", activeCompany.id)
        }
      } catch (matchErr) {
        console.warn("[eaisyBill] Számla szinkron cég párosítási figyelmeztetés:", matchErr)
      }
    }

    if (!eaisybillCompanyId) {
      return { success: false, syncedCount: 0, error: "A cég nincs összekötve eaisyBill fiókkal." }
    }

    // 3. Lekérjük a cég partnereit az eaisyDocs-ból
    let partnersQuery = docsClient
      .from("partner")
      .select("id, nev, adoszam, kulfoldi_adoszam, eaisybill_partner_id, company_id")
      .eq("company_id", activeCompany.id)

    if (input?.partnerId) {
      partnersQuery = partnersQuery.eq("id", input.partnerId)
    } else if (input?.partnerIds && input.partnerIds.length > 0) {
      partnersQuery = partnersQuery.in("id", input.partnerIds)
    }

    const { data: docsPartners, error: partnersErr } = await partnersQuery

    if (partnersErr || !docsPartners || docsPartners.length === 0) {
      return { success: true, syncedCount: 0 }
    }

    // Indexelés a gyors partnerfeloldáshoz
    const partnerByBillId = new Map<string, any>()
    const partnerByTax = new Map<string, any>()
    const partnerByEuTax = new Map<string, any>()
    const partnerByName = new Map<string, any>()

    for (const p of docsPartners) {
      if (p.eaisybill_partner_id) {
        partnerByBillId.set(p.eaisybill_partner_id, p)
      }
      if (p.adoszam) {
        const clean = p.adoszam.replace(/[-\s]/g, "").slice(0, 8)
        if (clean) partnerByTax.set(clean, p)
      }
      if (p.kulfoldi_adoszam) {
        partnerByEuTax.set(p.kulfoldi_adoszam.trim().toLowerCase(), p)
      }
      if (p.nev) {
        partnerByName.set(p.nev.trim().toLowerCase(), p)
      }
    }

    // 4. Lekérjük a PDF-fel rendelkező számlákat az eaisyBill-ből
    const { data: billInvoices, error: billErr } = await billClient
      .from("invoices")
      .select(`
        id, bizonylatsorszam, kibocsatas_datuma, fizetesi_hatarido,
        elado_nev, elado_vat_id, vevo_nev, vevo_vat_id,
        brutto_vegosszeg, penznem, invoice_direction, melleklet_url
      `)
      .eq("company_id", eaisybillCompanyId)
      .not("melleklet_url", "is", null)
      .order("kibocsatas_datuma", { ascending: false })
      .limit(1000)

    if (billErr) {
      console.error("Hiba az eaisyBill számlák lekérésekor:", billErr)
      return { success: false, syncedCount: 0, error: `eaisyBill számlák lekérési hiba: ${billErr.message}` }
    }

    if (!billInvoices || billInvoices.length === 0) {
      return { success: true, syncedCount: 0 }
    }

    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      : docsClient

    // 5. Lekérjük a már létező eaisyDocs iratokat a duplikáció elkerülésére (adminClienttel az RLS kizárásával)
    const { data: existingIratok } = await adminClient
      .from("irat")
      .select("kulso_hivatkozas_id")
      .eq("company_id", activeCompany.id)
      .eq("kulso_forras", "eaisybill")
      .not("kulso_hivatkozas_id", "is", null)

    const alreadyImportedIds = new Set((existingIratok || []).map((i: any) => i.kulso_hivatkozas_id))

    let syncedCount = 0
    const currentYear = new Date().getFullYear()

    for (const inv of billInvoices) {
      if (alreadyImportedIds.has(inv.id)) continue

      const isIncoming = inv.invoice_direction === "INBOUND"
      const partnerName = isIncoming ? inv.elado_nev : inv.vevo_nev
      const partnerVat = isIncoming ? inv.elado_vat_id : inv.vevo_vat_id

      let matchedPartner = null

      // Adószám egyezés (első 8 számjegy)
      if (partnerVat) {
        const cleanVat = partnerVat.replace(/[-\s]/g, "").slice(0, 8)
        if (cleanVat && partnerByTax.has(cleanVat)) {
          matchedPartner = partnerByTax.get(cleanVat)
        }
        if (!matchedPartner) {
          const cleanEu = partnerVat.trim().toLowerCase()
          if (partnerByEuTax.has(cleanEu)) {
            matchedPartner = partnerByEuTax.get(cleanEu)
          }
        }
      }

      // Név egyezés
      if (!matchedPartner && partnerName) {
        const cleanName = partnerName.trim().toLowerCase()
        if (partnerByName.has(cleanName)) {
          matchedPartner = partnerByName.get(cleanName)
        }
      }

      if (!matchedPartner) continue

      // Ha egy adott partnerre hívtuk, és nem ő az, kihagyjuk
      if (input?.partnerId && matchedPartner.id !== input.partnerId) {
        continue
      }

      // Érkeztetőszám: bejövőnél generált érkeztetőszám, kimenőnél a bizonylatsorszám az azonosító
      let erkeztetoszam: string | null = null
      if (isIncoming) {
        try {
          const { data: genId } = await docsClient.rpc("generate_erkeztetoszam", { p_ev: currentYear })
          erkeztetoszam = genId || `E/${currentYear}/${Math.floor(10000 + Math.random() * 90000)}`
        } catch {
          erkeztetoszam = `E/${currentYear}/${Math.floor(10000 + Math.random() * 90000)}`
        }
      } else {
        erkeztetoszam = inv.bizonylatsorszam || `KIM-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`
      }

      const currency = inv.penznem || "HUF"
      const formattedAmount = Number(inv.brutto_vegosszeg || 0).toLocaleString("hu-HU")
      const targy = isIncoming
        ? `${inv.elado_nev || matchedPartner.nev} – ${inv.bizonylatsorszam} sz. számla (${formattedAmount} ${currency})`
        : `Számla: ${inv.bizonylatsorszam} – ${inv.vevo_nev || matchedPartner.nev} (${formattedAmount} ${currency})`

      const docDate = inv.kibocsatas_datuma ? new Date(inv.kibocsatas_datuma).toISOString() : new Date().toISOString()

      // Extra atomi biztonsági ellenőrzés a konkrét számlára párhuzamos futás ellen
      const { data: alreadySingle } = await adminClient
        .from("irat")
        .select("id")
        .eq("company_id", activeCompany.id)
        .eq("kulso_forras", "eaisybill")
        .eq("kulso_hivatkozas_id", inv.id)
        .maybeSingle()

      if (alreadySingle) {
        alreadyImportedIds.add(inv.id)
        continue
      }

      // 1. Beszúrás az irat táblába
      const { data: newIrat, error: iratErr } = await docsClient
        .from("irat")
        .insert({
          targy,
          erkezes_modja: "eaisybill",
          adathordozo_tipus: "elektronikus_eredeti",
          minosites: "nyilt",
          irany: isIncoming ? "bejovo" : "kimeno",
          kuldo_partner_id: matchedPartner.id,
          erkeztetoszam,
          kulso_forras: "eaisybill",
          kulso_hivatkozas_id: inv.id,
          company_id: activeCompany.id,
          erkezes_datuma: docDate,
          statusz: "erkeztetett"
        })
        .select("id")
        .single()

      if (iratErr || !newIrat) {
        console.error("Irat beszúrási hiba eaisyBill számla szinkronkor:", iratErr)
        continue
      }

      // 2. Beszúrás az irat_fajl táblába
      const fajlnev = inv.melleklet_url?.split("/").pop()?.split("?")[0] || `${inv.bizonylatsorszam}.pdf`
      const sha256Hash = crypto.createHash("sha256").update(inv.id).digest("hex")

      await docsClient.from("irat_fajl").insert({
        irat_id: newIrat.id,
        storage_path: `eaisybill:${inv.id}`,
        kulso_fajl_url: inv.melleklet_url,
        eredeti_fajlnev: fajlnev,
        mime_type: "application/pdf",
        meret_byte: 0,
        sha256: sha256Hash
      })

      // 3. Beszúrás az irat_kapcsolat táblába
      try {
        await docsClient.from("irat_kapcsolat").insert({
          irat_id: newIrat.id,
          entitas_tipus: "partner",
          entitas_id: matchedPartner.id,
          kapcsolat_tipusa: "alapirat"
        })
      } catch (linkErr) {
        console.warn("Irat kapcsolat figyelmeztetés:", linkErr)
      }

      alreadyImportedIds.add(inv.id)
      syncedCount++
    }

    if (syncedCount > 0) {
      try {
        await docsClient.from("esemeny_naplo").insert({
          entitas_tipus: "partner",
          entitas_id: input?.partnerId || null,
          esemeny_tipus: "modositas",
          user_id: user.id,
          indoklas: `${syncedCount} db eaisyBill számla automatikusan szinkronizálva az iratforgalomba (${activeCompany.name})`
        })
      } catch (logErr) {
        console.warn("Audit napló hiba számla szinkronkor:", logErr)
      }

      if (!input?.skipRevalidate) {
        try {
          revalidatePath("/partners")
          if (input?.partnerId) {
            revalidatePath(`/partners/${input.partnerId}`)
          }
        } catch (revalErr) {
          console.warn("revalidatePath kihagyva:", revalErr)
        }
      }
    }

    return {
      success: true,
      syncedCount
    }
  } catch (err: unknown) {
    console.error("Kivétel a syncEaisyBillPartnerInvoicesAction során:", err)
    const msg = err instanceof Error ? err.message : "Ismeretlen hiba történt."
    return { success: false, syncedCount: 0, error: msg }
  }
}

