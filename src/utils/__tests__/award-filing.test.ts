import { describe, it } from "node:test"
import assert from "node:assert"
import { generateAwardCertificateHtml, AwardCertificatePdfData, KATEGORIA_LABELS } from "../hr/award-certificate-pdf-generator"

describe("Kitüntetések és Szakmai Elismerések (Awards & Honors & eaisyDocs)", () => {
  it("generateAwardCertificateHtml díszes fekvő oklevelet generál a díjazott és a méltatás adataival", () => {
    const mockData: AwardCertificatePdfData = {
      id: "award-uuid-001",
      employeeId: "emp-uuid-1111",
      employeeName: "Kovács Katalin",
      munkakor: "Vezető Rendszertervező",
      megnevezes: "Az Év Innovátora 2026 Díj",
      kategoria: "szakmai_innovacio",
      kategoriaLabel: KATEGORIA_LABELS.szakmai_innovacio,
      datum: "2026. október 1.",
      adomanyozo: "Vezérigazgató és Igazgatótanács",
      indoklas: "A felhőalapú mikroszolgáltatás architektúra példaértékű bevezetéséért és a fejlesztői csapat szakmai mentorálásáért.",
      jutalomOsszeg: 250000,
      iktatoszam: "HR/2026/00046/1",
      cegNev: "eaisyDocs Vállalati Rendszerek Zrt.",
      cegSzekhely: "1054 Budapest, Szabadság tér 7.",
      cegKepviselo: "Ügyvezető Igazgató",
    }

    const html = generateAwardCertificateHtml(mockData)

    // Formális oklevél fejlécek és azonosítók
    assert.ok(html.includes("ELISMERŐ OKLEVÉL"), "Tartalmaznia kell az oklevél főcímét")
    assert.ok(html.includes("Szakmai és Technológiai Innováció"), "Tartalmaznia kell a kategória megnevezését")
    assert.ok(html.includes("Az Év Innovátora 2026 Díj"), "Tartalmaznia kell a kitüntetés nevét")
    assert.ok(html.includes("HR/2026/00046/1"), "Tartalmaznia kell a beiktatott iktatószámot")
    assert.ok(html.includes("Irattári tétel: 3.1 • eaisyDocs Személyi Dosszié"), "Tartalmaznia kell a dosszié besorolást")

    // Díjazott adatai
    assert.ok(html.includes("Kovács Katalin"), "Tartalmaznia kell a díjazott nevét")
    assert.ok(html.includes("Vezető Rendszertervező"), "Tartalmaznia kell a munkakört")
    assert.ok(html.includes("felhőalapú mikroszolgáltatás"), "Tartalmaznia kell a hivatalos méltatást")

    // Pénzjutalom és adományozó
    assert.ok(html.includes((250000).toLocaleString("hu-HU") + " Ft"), "Tartalmaznia kell a helyesen formázott pénzjutalmat")
    assert.ok(html.includes("Vezérigazgató és Igazgatótanács"), "Tartalmaznia kell az adományozó szervezet nevét")
  })

  it("generateAwardCertificateHtml kezeli a nem pénzbeli (erkölcsi) elismerést és nem iktatott állapotot", () => {
    const mockData: AwardCertificatePdfData = {
      id: "award-uuid-002",
      employeeId: "emp-uuid-2222",
      employeeName: "Nagy Dániel",
      munkakor: "Senior Full-Stack Mérnök",
      megnevezes: "5 Éves Törzsgárda Elismerés",
      kategoria: "jubileum",
      kategoriaLabel: KATEGORIA_LABELS.jubileum,
      datum: "2026. október 1.",
      adomanyozo: "Vállalatvezetés",
      indoklas: "Öt éven át nyújtott hűséges, megbízható és elkötelezett munkájáért.",
      jutalomOsszeg: null,
      iktatoszam: null,
      cegNev: "eaisyDocs Vállalati Rendszerek Zrt.",
      cegSzekhely: "1054 Budapest, Szabadság tér 7.",
      cegKepviselo: "Ügyvezető Igazgató",
    }

    const html = generateAwardCertificateHtml(mockData)

    assert.ok(html.includes("Törzsgárda és Jubileumi Elismerés"), "Tartalmaznia kell a jubileumi kategóriát")
    assert.ok(html.includes("5 Éves Törzsgárda Elismerés"), "Tartalmaznia kell az elismerés nevét")
    assert.ok(html.includes("Azonosító: <b>OKL-AWARD-UU</b>"), "Tartalmaznia kell az ideiglenes azonosítót ha nincs még iktatva")
    assert.ok(!html.includes("Pénzjutalom:"), "Nem pénzbeli elismerésnél nem szerepelhet pénzjutalom sor")
  })
})
