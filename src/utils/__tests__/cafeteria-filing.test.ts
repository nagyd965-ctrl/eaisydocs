import { describe, it } from "node:test"
import assert from "node:assert"
import { generateCafeteriaHtml, CafeteriaPdfData } from "../hr/cafeteria-pdf-generator"

describe("Cafeteria Declaration & Filing (Szja tv. 71. § & eaisyDocs)", () => {
  it("keretösszeg, felhasznált összeg és fennmaradó keret helyesen számolódik", () => {
    const budget = 300000
    const choices = [
      { id: "1", nev: "Egészségpénztár", kategoria: "Öngondoskodás", kertOsszeg: 30000, levontOsszeg: 39900, szorzo: 1.33 },
      { id: "2", nev: "Helyi közlekedési bérlet", kategoria: "Közlekedés", kertOsszeg: 260100, levontOsszeg: 260100, szorzo: 1.0 },
    ]

    const totalUsed = choices.reduce((sum, c) => sum + c.levontOsszeg, 0)
    const remaining = budget - totalUsed
    const utilization = Math.round((totalUsed / budget) * 100)

    assert.strictEqual(totalUsed, 300000, "A levont cafeteria összegnek pontosan 300.000 Ft-nak kell lennie")
    assert.strictEqual(remaining, 0, "A fennmaradó keretnek 0 Ft-nak kell lennie")
    assert.strictEqual(utilization, 100, "A kihasználtságnak 100%-nak kell lennie")
  })

  it("generateCafeteriaHtml tartalmazza a jogszabályi hivatkozásokat, elemeket és iktatási adatokat", () => {
    const mockData: CafeteriaPdfData = {
      employeeId: "emp-uuid-12345",
      employeeName: "Nagy Dániel",
      year: 2026,
      munkakor: "Rendszergazda",
      szervezetiEgyseg: "Informatika és Üzemeltetés",
      annualBudget: 300000,
      totalDeducted: 300000,
      remainingBudget: 0,
      isClosed: true,
      submissionDate: "2026. október 1.",
      iktatoszam: "HR/2026/00038/5",
      choices: [
        { id: "c1", nev: "Egészségpénztár", kategoria: "Öngondoskodás", kertOsszeg: 30000, levontOsszeg: 39900, szorzo: 1.33 },
        { id: "c2", nev: "Helyi közlekedési bérlet", kategoria: "Közlekedés", kertOsszeg: 260100, levontOsszeg: 260100, szorzo: 1.0 },
      ],
    }

    const html = generateCafeteriaHtml(mockData)

    // Jogszabályi hivatkozások
    assert.ok(html.includes("Szja tv.) 71. §"), "Tartalmaznia kell az Szja tv. 71. § hivatkozást")
    assert.ok(html.includes("Cafeteria Nyilatkozat – 2026"), "Tartalmaznia kell a tárgyéves címet")
    assert.ok(html.includes("Irattári tétel: 3.1"), "Tartalmaznia kell a 3.1 irattári tételt")

    // Munkavállaló és keret adatok
    assert.ok(html.includes("Nagy Dániel"), "Tartalmaznia kell a dolgozó nevét")
    assert.ok(html.includes("Rendszergazda"), "Tartalmaznia kell a munkakört")
    assert.ok(html.includes("Informatika és Üzemeltetés"), "Tartalmaznia kell a szervezeti egységet")
    assert.ok(html.includes("HR/2026/00038/5"), "Tartalmaznia kell a hivatalos iktatószámot")
    assert.ok(html.includes("IKTATÓSZÁM: HR/2026/00038/5"), "Tartalmaznia kell az iktató címkét")

    // Juttatási elemek táblázat
    assert.ok(html.includes("Egészségpénztár"), "Tartalmaznia kell az Egészségpénztár tételt")
    assert.ok(html.includes("Helyi közlekedési bérlet"), "Tartalmaznia kell a bérlet tételt")
    assert.ok(html.includes("Véglegesítve & Lezárva"), "Tartalmaznia kell a lezárt státuszt")

    // Jognyilatkozat és aláírási blokk
    assert.ok(html.includes("Munkavállalói Jognyilatkozat és Záradék"), "Tartalmaznia kell a jognyilatkozat szekciót")
    assert.ok(html.includes("Munkáltató Képviselője"), "Tartalmaznia kell a munkáltató aláírási dobozt")
    assert.ok(html.includes("Munkavállaló saját kezű aláírása"), "Tartalmaznia kell a munkavállaló aláírási dobozt")
  })

  it("tervezet állapotban iktatószám nélkül is helyesen jelenik meg", () => {
    const mockDraftData: CafeteriaPdfData = {
      employeeId: "emp-uuid-67890",
      employeeName: "Kovács Anna",
      year: 2026,
      munkakor: "HR Asszisztens",
      szervezetiEgyseg: "HR Osztály",
      annualBudget: 400000,
      totalDeducted: 150000,
      remainingBudget: 250000,
      isClosed: false,
      submissionDate: "2026. október 1.",
      iktatoszam: null,
      choices: [
        { id: "c1", nev: "SZÉP Kártya - Vendéglátás", kategoria: "Béren kívüli juttatás", kertOsszeg: 150000, levontOsszeg: 150000, szorzo: 1.0 },
      ],
    }

    const html = generateCafeteriaHtml(mockDraftData)
    assert.ok(!html.includes("IKTATÓSZÁM:"), "Tervezet állapotban nem szerepelhet iktatószám")
    assert.ok(html.includes("Tervezet / Nyitott"), "Tervezet státusz feliratnak kell megjelennie")
  })
})
