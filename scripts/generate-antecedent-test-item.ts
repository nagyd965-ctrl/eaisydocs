import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import { createHash } from "crypto"
import { findAntecedentSuggestion } from "../src/utils/antecedent-matcher"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function createSimplePdf(title: string, invoiceNum: string, partner: string, amount: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Header background
  page.drawRectangle({
    x: 0,
    y: 750,
    width: 595,
    height: 92,
    color: rgb(0.08, 0.5, 0.45), // Teal
  })

  page.drawText(title, {
    x: 40,
    y: 785,
    size: 22,
    font: fontBold,
    color: rgb(1, 1, 1),
  })

  page.drawText(`Számlaszám: ${invoiceNum}`, {
    x: 350,
    y: 785,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  })

  // Details
  page.drawText(`Kibocsato: ${partner}`, {
    x: 40,
    y: 700,
    size: 13,
    font: fontBold,
    color: rgb(0.15, 0.2, 0.25),
  })
  page.drawText(`Adoszam / EU VAT: FR95952418325`, {
    x: 40,
    y: 680,
    size: 11,
    font,
    color: rgb(0.3, 0.35, 0.4),
  })
  page.drawText(`Cim: 15 Rue des Halles, 75001 Paris, France`, {
    x: 40,
    y: 665,
    size: 11,
    font,
    color: rgb(0.3, 0.35, 0.4),
  })

  page.drawText(`Vevo: Think AI Kft.`, {
    x: 350,
    y: 700,
    size: 13,
    font: fontBold,
    color: rgb(0.15, 0.2, 0.25),
  })
  page.drawText(`Adoszam: 12345678-2-41`, {
    x: 350,
    y: 680,
    size: 11,
    font,
    color: rgb(0.3, 0.35, 0.4),
  })
  page.drawText(`Cim: 1054 Budapest, Szabadsag ter 7.`, {
    x: 350,
    y: 665,
    size: 11,
    font,
    color: rgb(0.3, 0.35, 0.4),
  })

  // Table items
  page.drawRectangle({
    x: 40,
    y: 590,
    width: 515,
    height: 25,
    color: rgb(0.94, 0.96, 0.97),
  })
  page.drawText("TETEL MEGNEVEZESE", { x: 50, y: 598, size: 10, font: fontBold, color: rgb(0.3, 0.35, 0.4) })
  page.drawText("MENNY.", { x: 330, y: 598, size: 10, font: fontBold, color: rgb(0.3, 0.35, 0.4) })
  page.drawText("AR", { x: 420, y: 598, size: 10, font: fontBold, color: rgb(0.3, 0.35, 0.4) })
  page.drawText("OSSZESEN", { x: 480, y: 598, size: 10, font: fontBold, color: rgb(0.3, 0.35, 0.4) })

  page.drawText("Mistral Large 2 API Credit Token Pool (Havi elszamolas)", { x: 50, y: 565, size: 10, font, color: rgb(0.1, 0.1, 0.1) })
  page.drawText("1 ho", { x: 330, y: 565, size: 10, font, color: rgb(0.1, 0.1, 0.1) })
  page.drawText(amount, { x: 420, y: 565, size: 10, font, color: rgb(0.1, 0.1, 0.1) })
  page.drawText(amount, { x: 480, y: 565, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) })

  // Total
  page.drawRectangle({
    x: 320,
    y: 500,
    width: 235,
    height: 35,
    color: rgb(0.9, 0.96, 0.94),
  })
  page.drawText("Fizetendo osszeg:", { x: 330, y: 512, size: 12, font: fontBold, color: rgb(0.08, 0.45, 0.4) })
  page.drawText(amount, { x: 460, y: 512, size: 14, font: fontBold, color: rgb(0.08, 0.45, 0.4) })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

async function main() {
  console.log("=== Új bejövő irat generálása előzmény-ügyirat javaslat teszteléséhez ===")

  // 1. Érkeztetőszám allokáció
  const currentYear = 2026
  const { data: erkeztetoszamData, error: erkErr } = await supabase.rpc("generate_erkeztetoszam", {
    p_ev: currentYear
  })
  const erkeztetoszam = erkeztetoszamData || `E/${currentYear}/00999`
  console.log("Generált érkeztetőszám:", erkeztetoszam)

  // 2. Partner adatai
  const partnerId = "f2048761-2c82-46ff-856a-624ac2910437" // Mistral AI SAS
  const targetSubject = "Számla / Nyugta - Mistral AI SAS - MSTRL-API-930968-002 (50 EUR)"

  // 3. Irat beszúrása
  const { data: newIrat, error: iratErr } = await supabase
    .from("irat")
    .insert({
      erkeztetoszam,
      targy: targetSubject,
      leiras: "Mistral AI havi API fogyasztási számla és jóváírási bizonylat (MSTRL-API-930968-002)",
      irany: "bejovo",
      erkezes_modja: "email",
      statusz: "erkeztetve",
      adathordozo_tipus: "elektronikus_eredeti",
      erkezes_datuma: new Date().toISOString(),
      kuldo_partner_id: partnerId,
      kulso_hivatkozas_id: "MSTRL-API-930968-002",
      company_id: "333fa620-b67d-4b4e-bc61-524a40b5f351",
    })
    .select("id")
    .single()

  if (iratErr || !newIrat) {
    console.error("Hiba az irat létrehozásakor:", iratErr)
    return
  }

  const iratId = newIrat.id
  console.log("Létrehozott irat ID:", iratId)

  // 4. PDF generálás és feltöltés
  const pdfBuffer = await createSimplePdf(
    "SZÁMLA / NYUGTA",
    "MSTRL-API-930968-002",
    "Mistral AI SAS",
    "50.00 EUR"
  )

  const sha256 = createHash("sha256").update(pdfBuffer).digest("hex")
  const fileName = `Mistral_Invoice_MSTRL_API_930968_002.pdf`
  const storagePath = `incoming/${iratId}/${fileName}`

  const { error: uploadErr } = await supabase.storage
    .from("irat_files")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true
    })

  if (uploadErr) {
    console.error("Hiba a storage feltöltéskor:", uploadErr)
    return
  }
  console.log("PDF feltöltve a storage-ba:", storagePath)

  // 5. Csatolmány rekord beszúrása
  const { error: fileErr } = await supabase
    .from("irat_fajl")
    .insert({
      irat_id: iratId,
      eredeti_fajlnev: fileName,
      storage_path: storagePath,
      mime_type: "application/pdf",
      meret_byte: pdfBuffer.length,
      sha256,
      verzio: 1,
      ocr_szoveg: `Mistral AI SAS SZÁMLA MSTRL-API-930968-002 Összeg: 50.00 EUR Vevő: Think AI Kft.`
    })

  if (fileErr) {
    console.error("Hiba a csatolmány mentésekor:", fileErr)
    return
  }
  console.log("Csatolmány mentve az irat_fajl táblába.")

  // 6. Előzmény vizsgálat tesztelése
  const matchResult = await findAntecedentSuggestion(iratId, supabase)
  console.log("\n=== Előzmény-ügyirat detektálás eredménye ===")
  console.log(JSON.stringify(matchResult, null, 2))

  // 7. AI feladatsorba felvesszük és cache-eljük az előre kiszámolt eredményt
  await supabase
    .from("ai_feladat_sor")
    .upsert({
      irat_id: iratId,
      feladat_tipus: "ai_metadata_extraction",
      statusz: "kesz",
      eredmeny: {
        targy: targetSubject,
        dokumentum_tipus: "szamla",
        partner_nev: "Mistral AI SAS",
        partner_id: partnerId,
        partner_adoszam: "",
        partner_kulfoldi_adoszam: "FR95952418325",
        hivatkozott_szam: "MSTRL-API-930968-002",
        hatarido: "2026-10-31",
        irattari_tetel_id: "b76e55ab-f801-464d-ad12-55e551faff69", // Pénzügyi számlák
        department_id: "c7af605f-0cd3-435b-9512-a1802a9a2092", // Pénzügy
        elozmeny_ugyirat_id: matchResult.ugyirat_id,
        elozmeny_iktatoszam: matchResult.iktatoszam,
        elozmeny_confidence: matchResult.confidence_score,
        indoklas: matchResult.indoklas
      },
      kovetkezo_futtatas: new Date().toISOString()
    }, { onConflict: "irat_id,feladat_tipus" })

  console.log("\n>>> TESZTELHETŐ URL <<<")
  console.log(`http://localhost:3000/inbox/${iratId}`)
}

main()
