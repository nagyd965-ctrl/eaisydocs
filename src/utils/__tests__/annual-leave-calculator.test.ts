import { describe, it } from "node:test"
import assert from "node:assert"
import { getAnnualLeaveBreakdown, calculateAnnualLeave, calculateWorkingDays } from "../hr/leave-calculator"
import { generateAnnualLeaveHtml, AnnualLeaveData } from "../hr/annual-leave-pdf-generator"

describe("Annual Leave Breakdown & Calculator (Mt. 116-120. §)", () => {
  it("alapértelmezett szabadság fiatal, gyermektelen munkavállaló esetén", () => {
    // 2002-es születésű (24 éves 2026-ban) -> Alap: 20, Kor: 0, Gyerek: 0, Sérülékeny: 0 => Összesen 20
    const b = getAnnualLeaveBreakdown("2002-05-15", 0, false, 2026)
    assert.strictEqual(b.baseLeave, 20)
    assert.strictEqual(b.age, 24)
    assert.strictEqual(b.ageExtra, 0)
    assert.strictEqual(b.childrenExtra, 0)
    assert.strictEqual(b.vulnerableExtra, 0)
    assert.strictEqual(b.totalLeave, 20)
    assert.strictEqual(calculateAnnualLeave("2002-05-15", 0, false, 2026), 20)
  })

  it("életkor szerinti pótszabadság (Mt. 117. §) helyesen sávos", () => {
    // 1993-as születésű (33 éves 2026-ban) -> Kor pótszabadság: 4 nap
    const b = getAnnualLeaveBreakdown("1993-01-10", 0, false, 2026)
    assert.strictEqual(b.age, 33)
    assert.strictEqual(b.ageExtra, 4)
    assert.strictEqual(b.totalLeave, 24)
  })

  it("gyermekek utáni pótszabadság (Mt. 118. §) helyesen adódik hozzá", () => {
    // 1 gyermek = +2 nap, 2 gyermek = +4 nap, 3+ gyermek = +7 nap
    const b1 = getAnnualLeaveBreakdown("1998-05-01", 1, false, 2026) // 28 éves (2 nap) + 1 gyerek (2 nap) + 20 alap = 24
    assert.strictEqual(b1.ageExtra, 2)
    assert.strictEqual(b1.childrenExtra, 2)
    assert.strictEqual(b1.totalLeave, 24)

    const b2 = getAnnualLeaveBreakdown("1998-05-01", 2, false, 2026) // 20 + 2 + 4 = 26
    assert.strictEqual(b2.childrenExtra, 4)
    assert.strictEqual(b2.totalLeave, 26)

    const b3 = getAnnualLeaveBreakdown("1998-05-01", 3, false, 2026) // 20 + 2 + 7 = 29
    assert.strictEqual(b3.childrenExtra, 7)
    assert.strictEqual(b3.totalLeave, 29)
  })

  it("megváltozott munkaképesség (Mt. 120. §) +5 nap pótszabadság", () => {
    const b = getAnnualLeaveBreakdown("1990-01-01", 1, true, 2026) // 36 éves (5 nap) + 1 gyerek (2 nap) + 5 sérülékeny + 20 alap = 32
    assert.strictEqual(b.ageExtra, 5)
    assert.strictEqual(b.childrenExtra, 2)
    assert.strictEqual(b.vulnerableExtra, 5)
    assert.strictEqual(b.totalLeave, 32)
  })
})

describe("Annual Leave HTML Generator", () => {
  it("helyesen generálja az Mt. 134. § szerinti HTML struktúrát", () => {
    const mockData: AnnualLeaveData = {
      employeeId: "emp-123",
      employeeName: "Nagy Dániel",
      year: 2026,
      munkakor: "Junior Fejlesztő",
      feorKod: "FEOR: 2142",
      belepesDatuma: "2025. 01. 15.",
      vezetoNev: "Kovács Béla",
      breakdown: {
        baseLeave: 20,
        age: 28,
        ageExtra: 2,
        childrenCount: 1,
        childrenExtra: 2,
        isVulnerable: false,
        vulnerableExtra: 0,
        totalLeave: 24,
      },
      leaves: [
        {
          id: "leave-1",
          tipus: "Rendes szabadság",
          kezdet: "2026. 06. 10.",
          veg: "2026. 06. 12.",
          munkanapok: 3,
          jovahagyo: "Kovács Béla",
          statusz: "Jóváhagyva",
          egyenleg: 21,
        },
      ],
      summary: {
        totalLeave: 24,
        usedLeave: 3,
        remainingLeave: 21,
        plannedLeave: 0,
        otherDays: 0,
      },
    }

    const html = generateAnnualLeaveHtml(mockData)
    assert.ok(html.includes("Éves Szabadság- és Távollét Nyilvántartás"))
    assert.ok(html.includes("134. §"))
    assert.ok(html.includes("Nagy Dániel"))
    assert.ok(html.includes("Junior Fejlesztő"))
    assert.ok(html.includes("24 nap"))
    assert.ok(html.includes("21 nap"))
    assert.ok(html.includes("Rendes szabadság"))
    assert.ok(html.includes("Munkáltató képviselője"))
  })
})
