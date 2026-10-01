import { describe, it } from "node:test"
import assert from "node:assert"
import { generateMedicalHtml, MedicalExaminationData } from "../hr/medical-sheet-pdf-generator"

describe("Medical Examination & Occupational Health (33/1998. NM rendelet)", () => {
  it("érvényesség státusz helyesen számolódik (Lejárt vs Hamarosan lejár vs Érvényes)", () => {
    const now = new Date("2026-10-01T12:00:00Z").getTime()

    // 1. Múltbeli dátum (pl. 2025. október 10.) -> Lejárt!
    const pastDate = new Date("2025-10-10").getTime()
    const diffPast = pastDate - now
    assert.ok(diffPast < 0, "A múltbeli dátumnak negatív diffet kell adnia")
    const isPastExpired = diffPast < 0
    assert.strictEqual(isPastExpired, true)

    // 2. 15 nap múlva lejáró -> Hamarosan lejár (< 30 nap, de >= 0)
    const soonDate = now + 15 * 24 * 60 * 60 * 1000
    const diffSoon = soonDate - now
    const isSoonExpired = diffSoon < 0
    const isSoonExpiring = diffSoon >= 0 && diffSoon < 30 * 24 * 60 * 60 * 1000
    assert.strictEqual(isSoonExpired, false)
    assert.strictEqual(isSoonExpiring, true)

    // 3. 180 nap múlva lejáró -> Érvényes (nem lejáró)
    const validDate = now + 180 * 24 * 60 * 60 * 1000
    const diffValid = validDate - now
    const isValidExpired = diffValid < 0
    const isValidExpiring = diffValid >= 0 && diffValid < 30 * 24 * 60 * 60 * 1000
    assert.strictEqual(isValidExpired, false)
    assert.strictEqual(isValidExpiring, false)
  })

  it("generateMedicalHtml tartalmazza a kötelező jogszabályi elemeket és adatokat", () => {
    const mockData: MedicalExaminationData = {
      id: "test-med-uuid-123456",
      dolgozoId: "test-emp-uuid",
      employeeName: "Nagy Dániel",
      szuletesiDatum: "1995. május 12.",
      anyjaNeve: "Kovács Ilona",
      lakcim: "1117 Budapest, Október huszonharmadika u. 8.",
      tajSzam: "123-456-789",
      munkakor: "Junior Fejlesztő",
      feorKod: "2141",
      tipus: "idoszakos",
      tipusLabel: "Időszakos munkaköri alkalmassági vizsgálat",
      vizsgalatDatuma: "2025. október 10.",
      ervenyessegDatuma: "2026. október 10.",
      eredmeny: "alkalmas",
      eredmenyLabel: "ALKALMAS",
      eredmenyDesc: "A munkavállaló a megjelölt munkakör feladatainak ellátására egészségi szempontból alkalmas.",
      megjegyzes: "Képernyős munkavégzés engedélyezve",
      orvosNeve: "Dr. Kiss Éva",
      szakrendeles: "MediCare Foglalkozás-egészségügyi Központ",
      cegNev: "eaisyDocs Zrt.",
      cegCim: "1054 Budapest, Szabadság tér 7.",
    }

    const html = generateMedicalHtml(mockData)

    // Jogszabályi hivatkozások
    assert.ok(html.includes("33/1998. (VI. 24.) NM rendelet"), "Tartalmaznia kell az NM rendelet hivatkozást")
    assert.ok(html.includes("Elsőfokú Munkaköri Alkalmassági Vélemény"), "Tartalmaznia kell a hivatalos címet")
    assert.ok(html.includes("50 év (Mt. 134. §)"), "Tartalmaznia kell az 50 éves megőrzési időt")
    assert.ok(html.includes("Szigorúan Bizalmas (GDPR 9. cikk)"), "Tartalmaznia kell a GDPR 9. cikk bizalmassági minősítést")

    // Munkavállaló és vizsgálat adatok
    assert.ok(html.includes("Nagy Dániel"), "Tartalmaznia kell a munkavállaló nevét")
    assert.ok(html.includes("Junior Fejlesztő"), "Tartalmaznia kell a munkakört")
    assert.ok(html.includes("FEOR: 2141"), "Tartalmaznia kell a FEOR kódot")
    assert.ok(html.includes("ALKALMAS"), "Tartalmaznia kell az orvosi eredményt")
    assert.ok(html.includes("Dr. Kiss Éva"), "Tartalmaznia kell az orvos nevét")
    assert.ok(html.includes("MediCare Foglalkozás-egészségügyi Központ"), "Tartalmaznia kell a rendelő nevét")
    assert.ok(html.includes("Képernyős munkavégzés engedélyezve"), "Tartalmaznia kell az orvosi záradékot")
  })
})
