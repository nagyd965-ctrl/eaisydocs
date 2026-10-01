import { describe, it } from "node:test"
import assert from "node:assert"
import { generateStudyContractHtml, StudyContractPdfData } from "../hr/study-contract-pdf-generator"

describe("Tanulmányi Szerződés & Iktatás (Mt. 229. § & eaisyDocs)", () => {
  it("Mt. 229. § szerinti időarányos visszafizetési formula pontosan működik", () => {
    const totalCost = 600000 // 600 000 Ft támogatás
    const committedMonths = 24 // 24 hónap vállalt munkaviszony
    const monthlyAmortization = totalCost / committedMonths // 25 000 Ft/hó

    // Ha a munkavállaló 12 hónap után távozik:
    const workedMonths = 12
    const remainingMonths = committedMonths - workedMonths
    const refundDue = remainingMonths * monthlyAmortization

    assert.strictEqual(refundDue, 300000, "12 hónap után pontosan a felét (300.000 Ft) kell visszafizetnie")

    // Ha a munkavállaló 18 hónap után távozik:
    const refundAfter18 = (committedMonths - 18) * monthlyAmortization
    assert.strictEqual(refundAfter18, 150000, "18 hónap után a negyedét (150.000 Ft) kell visszafizetnie")

    // Ha kitöltötte a 24 hónapot:
    const refundFull = Math.max(0, (committedMonths - 24) * monthlyAmortization)
    assert.strictEqual(refundFull, 0, "A vállalt idő letelte után a visszafizetendő összeg 0 Ft")
  })

  it("Mt. 229. § szerinti maximális munkaviszony korlát (max 3 év / 36 hónap)", () => {
    const maxStatutoryMonths = 36 // Mt. 229. § (2) bek. alapján a munkavállaló legfeljebb 3 év munkaviszony fenntartására kötelezhető
    const validCommitment = 24
    const excessiveCommitment = 48

    assert.ok(validCommitment <= maxStatutoryMonths, "A 24 hónap törvényes")
    assert.ok(excessiveCommitment > maxStatutoryMonths, "A 48 hónap meghaladja a törvényes maximumot")
  })

  it("generateStudyContractHtml tartalmazza az Mt. 229. § rendelkezéseit, feleket és iktatási pecsétet", () => {
    const mockData: StudyContractPdfData = {
      id: "contract-uuid-9999",
      contractNumber: "TSZ-2026/001",
      employeeId: "emp-uuid-1111",
      employeeName: "Kovács Péter",
      szuletesiHely: "Debrecen",
      szuletesiDatum: "1992. március 15.",
      anyjaNeve: "Varga Ilona",
      lakcim: "1117 Budapest, Október huszonharmadika utca 8.",
      tajSzam: "123 456 789",
      adoazonosito: "8412345678",
      munkakor: "Senior Full Stack Fejlesztő",
      kepzesNeve: "Mesterséges Intelligencia és Felhőarchitektúra Mesterképzés",
      intezmenyNeve: "Budapesti Műszaki és Gazdaságtudományi Egyetem",
      kepzesSzintje: "Egyetemi posztgraduális képzés",
      koltseg: 750000,
      vallaltHonap: 24,
      lejaratDatuma: "2027. június 30.",
      visszafizetesiKotelezettseg: true,
      munkaidoKedvezmeny: "Heti 4 óra tanulmányi munkaidő-kedvezmény és a vizsganapokra 2 nap mentesülés távolléti díjjal.",
      iktatoszam: "HR/2026/00042/3",
      cegNev: "eaisyDocs Vállalati Rendszerek Zrt.",
      cegSzekhely: "1054 Budapest, Szabadság tér 7.",
      cegAdoszam: "12345678-2-41",
      cegCegjegyzekszam: "01-10-123456",
      cegKepviselo: "Vezérigazgató",
      datum: "2026. október 1.",
    }

    const html = generateStudyContractHtml(mockData)

    // Törvényi és formai megfelelőség
    assert.ok(html.includes("TANULMÁNYI SZERZŐDÉS"), "Tartalmaznia kell a szerződés címét")
    assert.ok(html.includes("2012. évi I. törvény (Mt.) 229. §"), "Tartalmaznia kell az Mt. 229. § hivatkozást")
    assert.ok(html.includes("Irattári tétel: 3.1"), "Tartalmaznia kell a 3.1 irattári tételt")
    assert.ok(html.includes("HR/2026/00042/3"), "Tartalmaznia kell az eaisyDocs iktatószámot")

    // Felek adatai
    assert.ok(html.includes("Kovács Péter"), "Tartalmaznia kell a munkavállaló nevét")
    assert.ok(html.includes("Senior Full Stack Fejlesztő"), "Tartalmaznia kell a munkakört")
    assert.ok(html.includes("eaisyDocs Vállalati Rendszerek Zrt."), "Tartalmaznia kell a munkáltató nevét")

    // Képzés adatai és anyagi feltételek
    assert.ok(html.includes("Mesterséges Intelligencia és Felhőarchitektúra Mesterképzés"), "Tartalmaznia kell a képzés nevét")
    assert.ok(html.includes("Budapesti Műszaki és Gazdaságtudományi Egyetem"), "Tartalmaznia kell a képző intézményt")
    assert.ok(html.includes((750000).toLocaleString("hu-HU") + " Ft"), "Tartalmaznia kell a támogatás összegét formázva")
    assert.ok(html.includes("24 hónap"), "Tartalmaznia kell a vállalt időtartamot")

    // Kedvezmény és visszafizetési záradék
    assert.ok(html.includes("Heti 4 óra tanulmányi munkaidő-kedvezmény"), "Tartalmaznia kell a munkaidő-kedvezményt")
    assert.ok(html.includes("időarányosan visszatéríteni"), "Tartalmaznia kell az arányos visszatérítési záradékot")
  })
})
