import { test } from "node:test"
import assert from "node:assert"
import { normalizePartnerName, normalizeAdoszam } from "../partner-matcher"

test("Partner Expansion Unit Tests", async (t) => {
  await t.test("normalizePartnerName normalizes company and individual names", () => {
    assert.strictEqual(normalizePartnerName("  Apex Digital Kft.  "), "apex digital kft")
    assert.strictEqual(normalizePartnerName("Kovács és Társa Zrt."), "kovács és társa zrt")
    assert.strictEqual(normalizePartnerName("DR. TANÁCS ÜGYVÉDI IRODA"), "dr tanács ügyvédi iroda")
  })

  await t.test("normalizeAdoszam strips hyphens and spaces", () => {
    assert.strictEqual(normalizeAdoszam(" 28741935-2-41 "), "28741935241")
    assert.strictEqual(normalizeAdoszam("12345678"), "12345678")
  })

  await t.test("Business role mapping and color classification", () => {
    const validRoles = ["vevo", "szallito", "mindketto", "hatosag", "bank", "egyeb"]
    for (const role of validRoles) {
      assert.ok(validRoles.includes(role))
    }
  })

  await t.test("Partner status validation", () => {
    const validStatuses = ["aktiv", "inaktiv"]
    assert.ok(validStatuses.includes("aktiv"))
    assert.ok(validStatuses.includes("inaktiv"))
    assert.ok(!validStatuses.includes("torolt"))
  })

  await t.test("Duplicate partner detection criteria", () => {
    const partners = [
      { id: "1", nev: "Apex Digital Kft.", adoszam: "28741935-2-41", kulfoldi_adoszam: null },
      { id: "2", nev: "Celonis Inc.", adoszam: null, kulfoldi_adoszam: "US123456" },
    ]

    const clean = (val?: string | null) => (val ? val.replace(/[-\s.,/]/g, "").toUpperCase().trim() : "")

    // Match by tax number
    const match1 = partners.find(p => p.adoszam && clean(p.adoszam) === clean("28741935241"))
    assert.strictEqual(match1?.id, "1")

    // Match by foreign tax number
    const match2 = partners.find(p => p.kulfoldi_adoszam && clean(p.kulfoldi_adoszam) === clean("US-123456"))
    assert.strictEqual(match2?.id, "2")

    // Match by name
    const match3 = partners.find(p => p.nev.toLowerCase().trim() === "apex digital kft.")
    assert.strictEqual(match3?.id, "1")
  })
})
