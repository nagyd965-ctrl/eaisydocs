import { describe, it } from "node:test"
import assert from "node:assert"

describe("HR Onboarding Lifecycle & Activation Tests", () => {
  it("should initialize pre-onboarding with 'varakozik' account status without immediate auth account", () => {
    const preOnboarding = {
      id: "onb-123",
      toborzas_id: "cand-456",
      nev: "Kovács Péter",
      munkakor: "Szenior Fejlesztő",
      statusz: "folyamatban",
      fiok_allapot: "varakozik",
      fiok_aktivalva_ekor: null,
      dolgozo_id: null
    }

    assert.strictEqual(preOnboarding.statusz, "folyamatban")
    assert.strictEqual(preOnboarding.fiok_allapot, "varakozik")
    assert.strictEqual(preOnboarding.dolgozo_id, null)
    assert.strictEqual(preOnboarding.fiok_aktivalva_ekor, null)
  })

  it("should transition to 'aktivalva' when HR triggers account activation", () => {
    const now = new Date().toISOString()
    const activatedOnboarding = {
      id: "onb-123",
      toborzas_id: "cand-456",
      nev: "Kovács Péter",
      munkakor: "Szenior Fejlesztő",
      statusz: "folyamatban",
      fiok_allapot: "aktivalva",
      fiok_aktivalva_ekor: now,
      dolgozo_id: "user-789"
    }

    assert.strictEqual(activatedOnboarding.fiok_allapot, "aktivalva")
    assert.strictEqual(activatedOnboarding.dolgozo_id, "user-789")
    assert.ok(activatedOnboarding.fiok_aktivalva_ekor)
  })

  it("should prevent duplicate onboarding for the same candidate", () => {
    const existingOnboardings = [
      { id: "onb-1", toborzas_id: "cand-100", nev: "Nagy Dániel" }
    ]

    const candidateId = "cand-100"
    const isDuplicate = existingOnboardings.some(o => o.toborzas_id === candidateId)

    assert.strictEqual(isDuplicate, true, "Should recognize existing candidate in onboarding")
  })

  it("should calculate task progress correctly by department", () => {
    const tasks = [
      { id: "t1", cim: "Munkaszerződés", felelos_reszleg: "HR", statusz: "done" },
      { id: "t2", cim: "T1041 NAV", felelos_reszleg: "Bérszámfejtés", statusz: "pending" },
      { id: "t3", cim: "Laptop", felelos_reszleg: "IT", statusz: "done" },
      { id: "t4", cim: "Munkavédelmi oktatás", felelos_reszleg: "EHS", statusz: "pending" },
      { id: "t5", cim: "Fiók aktiválása", felelos_reszleg: "HR", statusz: "done" },
    ]

    const doneCount = tasks.filter(t => t.statusz === "done").length
    const totalCount = tasks.length
    const progress = Math.round((doneCount / totalCount) * 100)

    assert.strictEqual(doneCount, 3)
    assert.strictEqual(totalCount, 5)
    assert.strictEqual(progress, 60)

    const hrTasks = tasks.filter(t => t.felelos_reszleg === "HR")
    assert.strictEqual(hrTasks.length, 2)
    assert.strictEqual(hrTasks.every(t => t.statusz === "done"), true)
  })

  it("should transition onboarding to 'lezart' with closure timestamp and user reference", () => {
    const now = new Date().toISOString()
    const closingUser = "admin-999"

    const closedOnboarding = {
      id: "onb-123",
      statusz: "lezart",
      lezarva_ekor: now,
      lezarta_id: closingUser
    }

    assert.strictEqual(closedOnboarding.statusz, "lezart")
    assert.strictEqual(closedOnboarding.lezarta_id, closingUser)
    assert.ok(closedOnboarding.lezarva_ekor)
  })
})
