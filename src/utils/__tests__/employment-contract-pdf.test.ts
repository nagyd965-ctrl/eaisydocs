import { describe, it } from "node:test"
import assert from "node:assert"
import { 
  generateEmploymentContractHtml, 
  generateEmploymentContractPdfBuffer 
} from "../hr/employment-contract-pdf-generator"
import { 
  type EmploymentContractPdfData, 
  DEFAULT_COMPANY_DETAILS 
} from "../hr/employment-contract-constants"

describe("Munkaszerződés Generátor és Iktatás (Mt. 42–45. § & eaisyDocs)", () => {
  const mockData: EmploymentContractPdfData = {
    contractNumber: "MSZ-2026/001",
    employeeName: "Nagy Dániel",
    szuletesiHely: "Budapest",
    szuletesiDatum: "1992-05-14",
    anyjaNeve: "Kovács Katalin",
    lakcim: "1117 Budapest, Infopark sétány 1.",
    adoazonositoJel: "8419201928",
    tajSzam: "123 456 789",
    bankszamlaszam: "11773016-00000000-00000000",
    munkakor: "Flottakezelő",
    reszleg: "Központi",
    kezdesDatuma: "2026-10-01",
    szerzodesTipusa: "hatarozatlan",
    munkaidoTipus: "teljes",
    napiMunkaidoOra: 8,
    probaidoHonap: 3,
    alapber: 650000,
    munkavegzesHelye: "A Munkáltató mindenkori székhelye és telephelyei",
    tavmunkaMegallapodas: true,
    cegAdatok: DEFAULT_COMPANY_DETAILS,
    isDraft: true
  }

  it("generateEmploymentContractHtml tartalmazza a kötelező Mt. 42-45. § elemeket és adatokat", () => {
    const html = generateEmploymentContractHtml(mockData)

    assert.ok(html.includes("Munkaszerződés"), "Tartalmaznia kell a címet")
    assert.ok(html.includes("Nagy Dániel"), "Tartalmaznia kell a munkavállaló nevét")
    assert.ok(html.includes("Flottakezelő"), "Tartalmaznia kell a munkakört")
    assert.ok(html.includes("650"), "Tartalmaznia kell a bruttó alapbért")
    assert.ok(html.includes("3 hónap próbaidőt"), "Tartalmaznia kell a 3 hónapos próbaidőt")
    assert.ok(html.includes("határozatlan időre jön létre"), "Tartalmaznia kell a határozatlan idejű munkaviszonyt")
    assert.ok(html.includes("teljes munkaidőben"), "Tartalmaznia kell a teljes munkaidőt")
    assert.ok(html.includes("eaisyDocs Szolgáltató Zrt."), "Tartalmaznia kell a munkáltató nevét")
    assert.ok(html.includes("TERVEZET"), "Tervezet állapotban meg kell jelennie a pecsétnek")
  })

  it("iktatott állapotban hivatalos eaisyDocs iktatószámot és 1.2 tételt jelenít meg", () => {
    const filedData: EmploymentContractPdfData = {
      ...mockData,
      iktatoszam: "HR/2026/000018/1",
      isDraft: false
    }

    const html = generateEmploymentContractHtml(filedData)
    assert.ok(html.includes("HR/2026/000018/1"), "Meg kell jelennie a hivatalos iktatószámnak")
    assert.ok(html.includes("Irattári tétel: 1.2 (50 év megőrzés)"), "Meg kell jelennie az 1.2-es irattári tételnek")
    assert.ok(!html.includes("TERVEZET"), "Nem szerepelhet a tervezet felirat iktatott állapotban")
  })

  it("határozott idejű és részmunkaidős szerződés helyes jogi záradékot kap", () => {
    const fixedPartTimeData: EmploymentContractPdfData = {
      ...mockData,
      szerzodesTipusa: "hatarozott",
      hatarozottLejarat: "2027-10-01",
      munkaidoTipus: "reszmunkaido",
      napiMunkaidoOra: 4,
      probaidoHonap: 0
    }

    const html = generateEmploymentContractHtml(fixedPartTimeData)
    assert.ok(html.includes("határozott időre jön létre"), "Határozott idő megjelölése")
    assert.ok(html.includes("2027-10-01"), "Lejárat napja")
    assert.ok(html.includes("részmunkaidőben (napi 4 óra"), "Részmunkaidő óraszáma")
    assert.ok(html.includes("próbaidőt nem kötnek ki"), "Próbaidő mellőzése")
  })

  it("generateEmploymentContractPdfBuffer érvényes PDF buffert állít elő Puppeteerrel", async () => {
    const { buffer, fileName } = await generateEmploymentContractPdfBuffer(mockData)

    assert.ok(buffer instanceof Buffer, "Buffer példány kell legyen")
    assert.ok(buffer.length > 2000, "A generált PDF mérete legyen reális")
    assert.ok(fileName.startsWith("munkaszerzodes_"), "A fájlnév konvenció helyes")
    assert.strictEqual(buffer.subarray(0, 4).toString(), "%PDF", "A PDF fejléc %PDF-fel kezdődik")
  })
})
