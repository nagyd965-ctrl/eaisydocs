"use server"

import { createClient } from "@/utils/supabase/server"
import { createEaisyBillClient } from "@/utils/supabase/eaisybill"
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
 * Megkeresi a felhasználó eaisyBill company_id-ját.
 * Elsődleges forrás: EAISYBILL_COMPANY_ID env var (megbízható, gyors).
 * Másodlagos: email → company_members dinamikus lookup.
 */
async function getCompanyIdForEmail(email: string): Promise<string | null> {
  // 1. Env var – ha be van állítva, ezt használjuk (legmegbízhatóbb)
  if (process.env.EAISYBILL_COMPANY_ID) {
    return process.env.EAISYBILL_COMPANY_ID
  }

  // 2. Dinamikus lookup: company_members-ben keresünk az eaisyBill user_id alapján
  //    (Ez csak akkor fut, ha nincs env var beállítva)
  try {
    const billClient = createEaisyBillClient()
    let page = 1
    const perPage = 50

    while (true) {
      const { data, error } = await billClient.auth.admin.listUsers({ page, perPage })
      if (error || !data?.users?.length) break

      const match = data.users.find(u => u.email === email)
      if (match) {
        const { data: membership } = await billClient
          .from("company_members")
          .select("company_id")
          .eq("user_id", match.id)
          .maybeSingle()
        return membership?.company_id ?? null
      }

      if (data.users.length < perPage) break
      page++
    }
  } catch {
    // Dinamikus lookup nem sikerült – null visszaadás
  }

  return null
}

/**
 * Lekéri az eaisyBill-ből az importálható számlákat.
 * Csak a bejelentkezett user cégéhez tartozó számlákat adja vissza.
 * Kiszűri azokat, amelyek már be lettek hozva eaisyDocs-ba.
 */
export async function getImportableEaisyBillInvoices(): Promise<{
  invoices: EaisyBillInvoice[]
  error?: string
}> {
  try {
    const billClient = createEaisyBillClient()
    const docsClient = await createClient()

    // 0. Bejelentkezett user emailje
    const { data: { user } } = await docsClient.auth.getUser()
    if (!user?.email) return { invoices: [], error: "Nincs bejelentkezve." }

    // 1. Company_id keresés az eaisyBill-ben email alapján
    const companyId = await getCompanyIdForEmail(user.email)
    if (!companyId) {
      return { invoices: [], error: `Nincs eaisyBill cég-hozzárendelés ehhez a fiókhoz (${user.email}). Ellenőrizd az eaisyBill company_members táblát.` }
    }

    // 2. Számlák lekérése – CSAK a saját cég számláit
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

    // 3. Lekérjük a már importált eaisyBill számla ID-kat eaisyDocs-ból
    const { data: alreadyImported } = await docsClient
      .from("irat")
      .select("kulso_hivatkozas_id")
      .eq("kulso_forras", "eaisybill")
      .not("kulso_hivatkozas_id", "is", null)

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

  // Jogosultság ellenőrzés
  const { data: profile } = await docsClient
    .from("felhasznalo_profil")
    .select("docs_szerepkor")
    .eq("id", user.id)
    .single()

  const isAllowed = ["admin", "rendszergazda", "iktato"].includes(profile?.docs_szerepkor || "")
  if (!isAllowed) return { success: false, error: "Nincs jogosultságod az érkeztetéshez." }

  // Duplikáció ellenőrzés
  const { data: existing } = await docsClient
    .from("irat")
    .select("id, erkeztetoszam")
    .eq("kulso_forras", "eaisybill")
    .eq("kulso_hivatkozas_id", invoice.id)
    .maybeSingle()

  if (existing) {
    return { success: false, error: `Már importálva (${existing.erkeztetoszam})` }
  }

  // Partner keresés / létrehozás
  let partner_id: string | null = null
  if (invoice.elado_nev) {
    const { findOrCreatePartner } = await import("@/utils/partner-matcher")
    try {
      const partnerResult = await findOrCreatePartner(docsClient, {
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
  const dateStr = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 8)
  const randNum = Math.floor(1000 + Math.random() * 9000)
  const erkeztetoszam = `E/${dateStr}-${randNum}`

  // Tárgy összeállítás
  const targy = `${invoice.elado_nev} – ${invoice.bizonylatsorszam} sz. számla (${invoice.brutto_vegosszeg} ${invoice.penznem})`

  // Irat rekord létrehozása
  const { data: iratData, error: iratError } = await docsClient
    .from("irat")
    .insert({
      targy,
      erkezes_modja:      "rendszer",
      adathordozo_tipus:  "elektronikus_eredeti",
      minosites:          "nyilt",
      irany:              "bejovo",
      kuldo_partner_id:   partner_id,
      erkeztetoszam,
      kulso_forras:       "eaisybill",
      kulso_hivatkozas_id: invoice.id,
    })
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

  const { error: fajlError } = await docsClient
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

  if (fajlError) {
    return { success: false, error: "Fájl rekord hiba: " + fajlError.message }
  }

  revalidatePath("/inbox")
  return { success: true, erkeztetoszam }
}
