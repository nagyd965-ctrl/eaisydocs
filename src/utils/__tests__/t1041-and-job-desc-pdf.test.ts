import { describe, it } from "node:test"
import assert from "node:assert"
import { generateT1041Html, generateT1041PdfBuffer } from "../hr/t1041-pdf-generator"
import { generateJobDescriptionHtml, generateJobDescriptionPdfBuffer } from "../hr/job-description-pdf-generator"
import { generateMt46NoticeHtml, generateMt46NoticePdfBuffer } from "../hr/mt46-notice-generator"
import { type T1041PdfData } from "../hr/t1041-constants"
import { type JobDescriptionPdfData } from "../hr/job-description-constants"
import { type EmploymentContractPdfData } from "../hr/employment-contract-constants"

describe("NAV T1041 Bejelentési Adatlap & PDF (Art. 22. § / Tbj. 40. §)", () => {
  const mockT1041: T1041PdfData = {
    bejelentesTipus: "U",
    employeeName: "Minta János",
    tajSzam: "123456789",
    adoazonositoJel: "8412345678",
    munkakor: "Flottakezelő",
    feorKod: "4121",
    reszleg: "FCM",
    jogviszonyKezdete: "2026-10-01",
    hetiMunkaidoOra: 40,
    szuletesiHely: "Budapest",
    szuletesiDatum: "1990-05-15",
    anyjaNeve: "Kovács Katalin",
    lakcim: "1111 Budapest, Fő utca 1.",
    bekuldesDatuma: "2026-10-01",
    cegNev: "eaisyDocs Zrt.",
    cegAdoszam: "12345678-2-41",
    iktatoszam: "HR-2026-0042/1"
  }

  it("generateT1041Html tartalmazza a hatósági adatlap adatait és az ÁNYK 13-as pótlap részeit", () => {
    const html = generateT1041Html(mockT1041)
    assert.ok(html.includes("NAV T1041"), "Tartalmaznia kell a címet")
    assert.ok(html.includes("BEJELENTŐ ADATLAP"), "Tartalmaznia kell a bejelentő adatlap szöveget")
    assert.ok(html.includes("Minta János"), "Tartalmaznia kell a biztosított nevét")
    assert.ok(html.includes("8412345678"), "Tartalmaznia kell az adóazonosító jelet")
    assert.ok(html.includes("123456789"), "Tartalmaznia kell a TAJ számot")
    assert.ok(html.includes("4121"), "Tartalmaznia kell a FEOR kódot")
    assert.ok(html.includes("HR-2026-0042/1"), "Tartalmaznia kell az iktatószámot")
    assert.ok(/13-as p[oó]tlap/i.test(html), "Tartalmaznia kell az ÁNYK 13-as pótlap hivatkozást")
  })

  it("generateT1041Html kezeli a V (Változás) bejelentést, hatálybalépési dátumot és 8 napos határidőt", () => {
    const valtozasMock: T1041PdfData = {
      ...mockT1041,
      bejelentesTipus: "V",
      valtozasDatuma: "2026-11-01",
      valtozasJellege: "Heti munkaidő változása",
      hetiMunkaidoOra: 30
    }
    const html = generateT1041Html(valtozasMock)
    assert.ok(html.includes("Változás bejelentése"), "Tartalmaznia kell a Változás címkét")
    assert.ok(html.includes("Változás időpontja (hatálya)"), "Tartalmaznia kell a változás időpontja mezőt")
    assert.ok(html.includes("2026-11-01"), "Tartalmaznia kell a hatálybalépés dátumát")
    assert.ok(html.includes("Heti munkaidő változása"), "Tartalmaznia kell a változás jellegét")
    assert.ok(html.includes("Rovat (7) Változás napja"), "Tartalmaznia kell az ÁNYK 7. rovatot")
    assert.ok(html.includes("8 napon belül"), "Tartalmaznia kell a 8 napos törvényi határidőt")
  })

  it("generateT1041Html kezeli a T (Megszűnés / Törlés) bejelentést és a jogviszony végét", () => {
    const torlesMock: T1041PdfData = {
      ...mockT1041,
      bejelentesTipus: "T",
      jogviszonyVege: "2026-10-31"
    }
    const html = generateT1041Html(torlesMock)
    assert.ok(html.includes("Jogviszony vége"), "Tartalmaznia kell a jogviszony vége mezőt")
    assert.ok(html.includes("2026-10-31"), "Tartalmaznia kell a megszűnés dátumát")
    assert.ok(html.includes("Rovat (4) Megszűnés"), "Tartalmaznia kell az ÁNYK 4. rovatot")
    assert.ok(html.includes("8 napon belül"), "Tartalmaznia kell a 8 napos törvényi határidőt")
  })

  it("generateT1041PdfBuffer érvényes PDF buffert állít elő Puppeteerrel", async () => {
    const buffer = await generateT1041PdfBuffer(mockT1041)
    assert.ok(Buffer.isBuffer(buffer), "Buffernek kell lennie")
    assert.ok(buffer.length > 1000, "Érvényes méretű PDF-nek kell lennie")
    const pdfMagic = buffer.subarray(0, 4).toString("ascii")
    assert.strictEqual(pdfMagic, "%PDF", "PDF fejléccel kell kezdődnie")
  })
})

describe("Hivatalos Munkaköri Leírás Generátor (Mt. 45. § (4) & eaisyDocs)", () => {
  const mockJob: JobDescriptionPdfData = {
    employeeName: "Minta János",
    munkakor: "Flottakezelő",
    feorKod: "4121",
    reszleg: "FCM",
    jogviszonyKezdete: "2026-10-01",
    hetiMunkaidoOra: 40,
    vezetoNev: "Nagy Dániel (Operatív Vezető)",
    feladatok: [
      "Gépjárművek átadás-átvételi jegyzőkönyveinek kezelése",
      "Karbantartási és szerviz ütemtervek felügyelete"
    ],
    kompetenciak: [
      "B kategóriás jogosítvány",
      "Műszaki érzék és precizitás"
    ],
    cegNev: "eaisyDocs Zrt.",
    iktatoszam: "HR-2026-0042/2"
  }

  it("generateJobDescriptionHtml tartalmazza a feladatokat, kompetenciákat és iktatási fejlécet", () => {
    const html = generateJobDescriptionHtml(mockJob)
    assert.ok(html.includes("MUNKAKÖRI LEÍRÁS"), "Tartalmaznia kell a címet")
    assert.ok(html.includes("Flottakezelő"), "Tartalmaznia kell a munkakört")
    assert.ok(html.includes("4121"), "Tartalmaznia kell a FEOR kódot")
    assert.ok(html.includes("Gépjárművek átadás-átvételi"), "Tartalmaznia kell az 1. feladatot")
    assert.ok(html.includes("B kategóriás jogosítvány"), "Tartalmaznia kell a kompetenciát")
    assert.ok(html.includes("HR-2026-0042/2"), "Tartalmaznia kell az iktatószámot")
  })

  it("generateJobDescriptionPdfBuffer érvényes PDF buffert állít elő Puppeteerrel", async () => {
    const buffer = await generateJobDescriptionPdfBuffer(mockJob)
    assert.ok(Buffer.isBuffer(buffer), "Buffernek kell lennie")
    assert.ok(buffer.length > 1000, "Érvényes méretű PDF-nek kell lennie")
    const pdfMagic = buffer.subarray(0, 4).toString("ascii")
    assert.strictEqual(pdfMagic, "%PDF", "PDF fejléccel kell kezdődnie")
  })
})

describe("Mt. 46. § Munkáltatói Írásbeli Tájékoztató Generátor", () => {
  const mockContractData: EmploymentContractPdfData = {
    contractNumber: "Mt. 46 Tájékoztató",
    employeeName: "Minta János",
    szuletesiHely: "Budapest",
    szuletesiDatum: "1990-05-15",
    anyjaNeve: "Kovács Katalin",
    lakcim: "1111 Budapest, Fő utca 1.",
    adoazonositoJel: "8412345678",
    tajSzam: "123456789",
    bankszamlaszam: "11773016-00000000-00000000",
    munkakor: "Flottakezelő",
    reszleg: "FCM",
    kezdesDatuma: "2026-10-01",
    szerzodesTipusa: "hatarozatlan",
    munkaidoTipus: "teljes",
    napiMunkaidoOra: 8,
    probaidoHonap: 3,
    alapber: 550000,
    munkavegzesHelye: "1111 Budapest, Példa utca 1.",
    tavmunkaMegallapodas: false,
    cegAdatok: {
      nev: "eaisyDocs Zrt.",
      szekhely: "1111 Budapest, Példa utca 1.",
      adoszam: "12345678-2-41",
      cegjegyzekszam: "01-10-123456",
      kepviselo: "Ügyvezető Igazgató"
    },
    isDraft: false,
    iktatoszam: "HR-2026-0042/3"
  }

  it("generateMt46NoticeHtml tartalmazza az Mt. 46. § (1) bekezdés kötelező pontjait", () => {
    const html = generateMt46NoticeHtml(mockContractData)
    assert.ok(html.includes("MUNKÁLTATÓI ÍRÁSBELI TÁJÉKOZTATÓ"), "Tartalmaznia kell a címet")
    assert.ok(html.includes("46. §"), "Tartalmaznia kell az Mt. 46. § hivatkozást")
    assert.ok(html.includes(Number(550000).toLocaleString("hu-HU")), "Tartalmaznia kell az alapbért")
    assert.ok(html.includes("10. napjáig"), "Tartalmaznia kell a bérfizetési napot")
    assert.ok(html.includes("Nemzeti Adó- és Vámhivatal"), "Tartalmaznia kell a NAV megnevezését")
    assert.ok(html.includes("HR-2026-0042/3"), "Tartalmaznia kell az iktatószámot")
  })

  it("generateMt46NoticePdfBuffer érvényes PDF buffert állít elő Puppeteerrel", async () => {
    const buffer = await generateMt46NoticePdfBuffer(mockContractData)
    assert.ok(Buffer.isBuffer(buffer), "Buffernek kell lennie")
    assert.ok(buffer.length > 1000, "Érvényes méretű PDF-nek kell lennie")
    const pdfMagic = buffer.subarray(0, 4).toString("ascii")
    assert.strictEqual(pdfMagic, "%PDF", "PDF fejléccel kell kezdődnie")
  })
})
