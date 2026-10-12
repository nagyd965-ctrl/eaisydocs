import { createClient } from "@supabase/supabase-js"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { config } from "dotenv"
import crypto from "crypto"

config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface InvoiceData {
  szamlaszam: string
  kiallitas: string
  teljesites: string
  esedekesseg: string
  szallito: {
    nev: string
    cim: string
    adoszam: string
    bankszamla: string
  }
  vevo: {
    nev: string
    cim: string
    adoszam: string
  }
  tetelek: Array<{
    megnevezes: string
    mennyiseg: number
    me: string
    egysegar: number
    netto: number
    afaKulcs: number
    afaErtek: number
    brutto: number
  }>
  fizetendo: number
}

function cleanText(text: string): string {
  if (!text) return ""
  return text
    .replace(/ő/g, "ö")
    .replace(/Ő/g, "Ö")
    .replace(/ű/g, "ü")
    .replace(/Ű/g, "Ü")
}

async function createInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Háttér fejléc sáv (Fintech Teal)
  page.drawRectangle({
    x: 40,
    y: height - 100,
    width: width - 80,
    height: 60,
    color: rgb(0.06, 0.46, 0.43), // #0f766e
  })

  // Fejléc cím
  page.drawText(cleanText("SZÁMLA"), {
    x: 60,
    y: height - 72,
    size: 20,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  })

  page.drawText(cleanText(`Számlaszám: ${data.szamlaszam}`), {
    x: width - 260,
    y: height - 70,
    size: 13,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  })

  // Dátumok sáv
  let y = height - 130
  page.drawText(cleanText(`Kelt: ${data.kiallitas}`), { x: 40, y, size: 9, font: helvetica, color: rgb(0.3, 0.3, 0.3) })
  page.drawText(cleanText(`Teljesítés: ${data.teljesites}`), { x: 180, y, size: 9, font: helvetica, color: rgb(0.3, 0.3, 0.3) })
  page.drawText(cleanText(`Fizetési határidő: ${data.esedekesseg}`), { x: 340, y, size: 9, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) })
  page.drawText(cleanText(`Fizetés módja: Átutalás`), { x: 480, y, size: 9, font: helvetica, color: rgb(0.3, 0.3, 0.3) })

  // Vonal
  y -= 15
  page.drawLine({
    start: { x: 40, y },
    end: { x: width - 40, y },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  })

  // Szállító és Vevő blokk
  y -= 25
  const col1X = 40
  const col2X = 320

  // Szállító
  page.drawText(cleanText("SZÁLLÍTÓ (KIBOCSÁTÓ)"), { x: col1X, y, size: 10, font: helveticaBold, color: rgb(0.06, 0.46, 0.43) })
  page.drawText(cleanText(data.szallito.nev), { x: col1X, y: y - 18, size: 11, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) })
  page.drawText(cleanText(data.szallito.cim), { x: col1X, y: y - 32, size: 9, font: helvetica, color: rgb(0.3, 0.3, 0.3) })
  page.drawText(cleanText(`Adószám: ${data.szallito.adoszam}`), { x: col1X, y: y - 46, size: 9, font: helvetica, color: rgb(0.3, 0.3, 0.3) })
  page.drawText(cleanText(`Bankszámla: ${data.szallito.bankszamla}`), { x: col1X, y: y - 60, size: 9, font: helvetica, color: rgb(0.3, 0.3, 0.3) })

  // Vevő
  page.drawText(cleanText("VEVŐ"), { x: col2X, y, size: 10, font: helveticaBold, color: rgb(0.06, 0.46, 0.43) })
  page.drawText(cleanText(data.vevo.nev), { x: col2X, y: y - 18, size: 11, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) })
  page.drawText(cleanText(data.vevo.cim), { x: col2X, y: y - 32, size: 9, font: helvetica, color: rgb(0.3, 0.3, 0.3) })
  page.drawText(cleanText(`Adószám: ${data.vevo.adoszam}`), { x: col2X, y: y - 46, size: 9, font: helvetica, color: rgb(0.3, 0.3, 0.3) })

  // Tételek táblázat
  y -= 90
  page.drawRectangle({
    x: 40,
    y: y - 5,
    width: width - 80,
    height: 20,
    color: rgb(0.94, 0.96, 0.98),
  })

  page.drawText(cleanText("TÉTEL MEGNEVEZÉSE"), { x: 45, y, size: 8, font: helveticaBold, color: rgb(0.3, 0.3, 0.3) })
  page.drawText(cleanText("MENNY."), { x: 260, y, size: 8, font: helveticaBold, color: rgb(0.3, 0.3, 0.3) })
  page.drawText(cleanText("EGYSÉGÁR"), { x: 320, y, size: 8, font: helveticaBold, color: rgb(0.3, 0.3, 0.3) })
  page.drawText(cleanText("ÁFA"), { x: 410, y, size: 8, font: helveticaBold, color: rgb(0.3, 0.3, 0.3) })
  page.drawText(cleanText("BRUTTÓ ÉRTÉK"), { x: 465, y, size: 8, font: helveticaBold, color: rgb(0.3, 0.3, 0.3) })

  let totalNetto = 0
  let totalAfa = 0
  let totalBrutto = 0

  for (const t of data.tetelek) {
    y -= 22
    page.drawText(cleanText(t.megnevezes), { x: 45, y, size: 9, font: helvetica, color: rgb(0.1, 0.1, 0.1) })
    page.drawText(cleanText(`${t.mennyiseg} ${t.me}`), { x: 260, y, size: 9, font: helvetica, color: rgb(0.2, 0.2, 0.2) })
    page.drawText(cleanText(`${t.egysegar.toLocaleString("hu-HU")} Ft`), { x: 320, y, size: 9, font: helvetica, color: rgb(0.2, 0.2, 0.2) })
    page.drawText(cleanText(`${t.afaKulcs}%`), { x: 410, y, size: 9, font: helvetica, color: rgb(0.2, 0.2, 0.2) })
    page.drawText(cleanText(`${t.brutto.toLocaleString("hu-HU")} Ft`), { x: 465, y, size: 9, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) })

    totalNetto += t.netto
    totalAfa += t.afaErtek
    totalBrutto += t.brutto

    page.drawLine({
      start: { x: 40, y: y - 5 },
      end: { x: width - 40, y: y - 5 },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.9),
    })
  }

  // Összesítés blokk
  y -= 40
  const sumBoxX = width - 240
  page.drawText(cleanText("Nettó összeg:"), { x: sumBoxX, y, size: 9, font: helvetica, color: rgb(0.4, 0.4, 0.4) })
  page.drawText(cleanText(`${totalNetto.toLocaleString("hu-HU")} Ft`), { x: sumBoxX + 110, y, size: 9, font: helvetica, color: rgb(0.1, 0.1, 0.1) })

  y -= 16
  page.drawText(cleanText("ÁFA összeg (27%):"), { x: sumBoxX, y, size: 9, font: helvetica, color: rgb(0.4, 0.4, 0.4) })
  page.drawText(cleanText(`${totalAfa.toLocaleString("hu-HU")} Ft`), { x: sumBoxX + 110, y, size: 9, font: helvetica, color: rgb(0.1, 0.1, 0.1) })

  y -= 22
  page.drawRectangle({
    x: sumBoxX - 10,
    y: y - 6,
    width: 210,
    height: 24,
    color: rgb(0.92, 0.97, 0.96),
  })
  page.drawText(cleanText("Fizetendő összeg:"), { x: sumBoxX, y, size: 10, font: helveticaBold, color: rgb(0.06, 0.46, 0.43) })
  page.drawText(cleanText(`${data.fizetendo.toLocaleString("hu-HU")} Ft`), { x: sumBoxX + 105, y, size: 11, font: helveticaBold, color: rgb(0.06, 0.46, 0.43) })

  // Lábléc
  page.drawText(cleanText("Köszönjük az együttműködést! A számla a hatályos magyar jogszabályoknak megfelelően készült."), {
    x: 40,
    y: 40,
    size: 8,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

async function main() {
  console.log("🚀 Többcsatolmányos teszt irat generálása...")

  // 1. Cég lekérése
  const { data: companies, error: compErr } = await supabase.from("companies").select("id, name, tax_number, address").limit(1)
  if (compErr || !companies || companies.length === 0) {
    console.error("Nem található cég a companies táblában!", compErr)
    process.exit(1)
  }
  const company = companies[0]
  console.log(`🏢 Cég: ${company.name} (${company.id})`)

  // 2. Partner (Beszállító) ellenőrzése / létrehozása
  const partnerName = "TechParts Hungária Kft."
  let { data: partner } = await supabase
    .from("partner")
    .select("id, nev, adoszam, email")
    .eq("nev", partnerName)
    .maybeSingle()

  if (!partner) {
    const { data: newPartner, error: partnerErr } = await supabase
      .from("partner")
      .insert({
        nev: partnerName,
        adoszam: "14829103-2-41",
        email: "szamlazas@techparts.hu",
        cim: "1134 Budapest, Váci út 45.",
        tipus: "ceg",
        company_id: company.id,
      })
      .select()
      .single()

    if (partnerErr || !newPartner) {
      console.error("Hiba a partner létrehozásakor:", partnerErr)
      process.exit(1)
    }
    partner = newPartner
    console.log(`✅ Új partner létrehozva: ${(partner as any).nev}`)
  } else {
    console.log(`📌 Létező partner megtalálva: ${partner.nev}`)
  }

  if (!partner) {
    throw new Error("Partner nem érhető el")
  }

  // 3. Két PDF generálása a memóriában
  console.log("📄 PDF 1 generálása: Számla #1 (Hardver beszerzés)...")
  const pdf1Buffer = await createInvoicePdf({
    szamlaszam: "TP-2026/00411",
    kiallitas: "2026.10.12",
    teljesites: "2026.10.11",
    esedekesseg: "2026.10.26",
    szallito: {
      nev: partner.nev,
      cim: "1134 Budapest, Váci út 45.",
      adoszam: "14829103-2-41",
      bankszamla: "11705008-20491823-00000000 (OTP Bank)",
    },
    vevo: {
      nev: company.name,
      cim: company.address || "1055 Budapest, Kossuth Lajos tér 1.",
      adoszam: company.tax_number || "12345678-2-41",
    },
    tetelek: [
      {
        megnevezes: 'Dell UltraSharp 27" 4K USB-C Hub Monitor (U2723QE)',
        mennyiseg: 2,
        me: "db",
        egysegar: 185000,
        netto: 370000,
        afaKulcs: 27,
        afaErtek: 99900,
        brutto: 469900,
      },
      {
        megnevezes: "Logitech MX Master 3S vezeték nélküli egér",
        mennyiseg: 3,
        me: "db",
        egysegar: 32000,
        netto: 96000,
        afaKulcs: 27,
        afaErtek: 25920,
        brutto: 121920,
      },
    ],
    fizetendo: 591820,
  })

  console.log("📄 PDF 2 generálása: Számla #2 (Szerver karbantartás)...")
  const pdf2Buffer = await createInvoicePdf({
    szamlaszam: "TP-2026/00412",
    kiallitas: "2026.10.12",
    teljesites: "2026.10.12",
    esedekesseg: "2026.11.05",
    szallito: {
      nev: partner.nev,
      cim: "1134 Budapest, Váci út 45.",
      adoszam: "14829103-2-41",
      bankszamla: "11705008-20491823-00000000 (OTP Bank)",
    },
    vevo: {
      nev: company.name,
      cim: company.address || "1055 Budapest, Kossuth Lajos tér 1.",
      adoszam: company.tax_number || "12345678-2-41",
    },
    tetelek: [
      {
        megnevezes: "Október havi szerverpark és hálózat üzemeltetés (SLA-99.9%)",
        mennyiseg: 1,
        me: "hó",
        egysegar: 180000,
        netto: 180000,
        afaKulcs: 27,
        afaErtek: 48600,
        brutto: 228600,
      },
    ],
    fizetendo: 228600,
  })

  // 4. Feltöltés Supabase Storage-ba
  const folder = `test-inbox-${Date.now()}`
  const file1Path = `${folder}/Szamla_2026_0411_Hardver_Beszerzes.pdf`
  const file2Path = `${folder}/Szamla_2026_0412_Szerver_Karbantartas.pdf`

  console.log("☁️  PDF 1 feltöltése Storage-ba...")
  const { error: up1Err } = await supabase.storage.from("irat_files").upload(file1Path, pdf1Buffer, {
    contentType: "application/pdf",
    upsert: true,
  })
  if (up1Err) {
    console.error("Hiba a PDF 1 feltöltésekor:", up1Err)
    process.exit(1)
  }

  console.log("☁️  PDF 2 feltöltése Storage-ba...")
  const { error: up2Err } = await supabase.storage.from("irat_files").upload(file2Path, pdf2Buffer, {
    contentType: "application/pdf",
    upsert: true,
  })
  if (up2Err) {
    console.error("Hiba a PDF 2 feltöltésekor:", up2Err)
    process.exit(1)
  }

  // 5. Érkeztetőszám kérése
  const currentYear = new Date().getFullYear()
  const { data: erkezId, error: erkezErr } = await supabase.rpc("generate_erkeztetoszam", { p_ev: currentYear })
  const erkeztetoszam = erkezId || `ERK-${currentYear}/${String(Math.floor(Math.random() * 9000) + 1000)}`
  console.log(`🏷️  Generált érkeztetőszám: ${erkeztetoszam}`)

  // 6. Irat rekord létrehozása a bejövő sorban
  const { data: irat, error: iratErr } = await supabase
    .from("irat")
    .insert({
      erkeztetoszam,
      targy: "TechParts Hungária Kft. - Kísérőlevél és 2 db számla (Hardver beszerzés és Szerver karbantartás)",
      erkezes_modja: "email",
      kulso_forras: "email",
      adathordozo_tipus: "elektronikus_eredeti",
      erkezes_datuma: new Date().toISOString(),
      statusz: "erkeztetve",
      irany: "bejovo",
      kuldo_partner_id: partner.id,
      company_id: company.id,
      leiras: "A szállító egyetlen e-mailben két külön megrendeléshez kapcsolódó számlát küldött meg.",
    })
    .select()
    .single()

  if (iratErr || !irat) {
    console.error("Hiba az irat rekord beszúrásakor:", iratErr)
    process.exit(1)
  }
  console.log(`✅ Beérkezett irat létrehozva: ID=${irat.id}`)

  // 7. Csatolmányok rögzítése az irat_fajl táblában
  const sha256_1 = crypto.createHash("sha256").update(pdf1Buffer).digest("hex")
  const sha256_2 = crypto.createHash("sha256").update(pdf2Buffer).digest("hex")

  const { data: f1, error: f1Err } = await supabase
    .from("irat_fajl")
    .insert({
      irat_id: irat.id,
      storage_path: file1Path,
      eredeti_fajlnev: "Szamla_2026_0411_Hardver_Beszerzes.pdf",
      mime_type: "application/pdf",
      meret_byte: pdf1Buffer.length,
      sha256: sha256_1,
      verzio: 1,
    })
    .select()
    .single()

  const { data: f2, error: f2Err } = await supabase
    .from("irat_fajl")
    .insert({
      irat_id: irat.id,
      storage_path: file2Path,
      eredeti_fajlnev: "Szamla_2026_0412_Szerver_Karbantartas.pdf",
      mime_type: "application/pdf",
      meret_byte: pdf2Buffer.length,
      sha256: sha256_2,
      verzio: 1,
    })
    .select()
    .single()

  if (f1Err || f2Err) {
    console.error("Hiba az irat_fajl rögzítésekor:", f1Err, f2Err)
    process.exit(1)
  } else {
    console.log(`📎 Csatolmány 1: ${f1.eredeti_fajlnev} (${f1.meret_byte} bájt, SHA: ${sha256_1.slice(0, 8)}...)`)
    console.log(`📎 Csatolmány 2: ${f2.eredeti_fajlnev} (${f2.meret_byte} bájt, SHA: ${sha256_2.slice(0, 8)}...)`)
  }

  // 8. Eseménynapló rögzítés
  await supabase.from("esemeny_naplo").insert({
    irat_id: irat.id,
    tipus: "erkeztetve",
    leiras: `E-mail beérkezett 2 db PDF számla csatolmánnyal (${partner.nev}). Érkeztetőszám: ${erkeztetoszam}`,
    metaadat: {
      partner_nev: partner.nev,
      erkezes_modja: "email",
      csatolmanyok_szama: 2,
      fajlok: ["Szamla_2026_0411_Hardver_Beszerzes.pdf", "Szamla_2026_0412_Szerver_Karbantartas.pdf"],
    },
  })

  console.log("\n=======================================================")
  console.log("🎉 SIKERES TESZTADAT GENERÁLÁS!")
  console.log(`📌 Érkeztetőszám: ${erkeztetoszam}`)
  console.log(`📄 Irat ID: ${irat.id}`)
  console.log(`🔗 Közvetlen link az iktatóhoz: http://localhost:3000/inbox/${irat.id}`)
  console.log("=======================================================\n")
}

main().catch((err) => {
  console.error("Váratlan hiba:", err)
  process.exit(1)
})
