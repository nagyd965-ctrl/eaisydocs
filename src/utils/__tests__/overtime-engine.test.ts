import assert from "node:assert"
import test from "node:test"
import {
  determineAnnualOvertimeLimit,
  calculateOvertimeQuotaStatus,
  checkWeeklyHoursCompliance,
  calculateDailyOvertimeFromAttendance,
  validateShiftAssignmentOvertimeRisk,
} from "../hr/overtime-engine"

test("Overtime Engine (Mt. 99. § & 135. §)", async (t) => {
  await t.test("TEST 1: Éves túlórakeret (Mt. 135. §)", () => {
    const defaultLimit = determineAnnualOvertimeLimit(false)
    assert.strictEqual(defaultLimit, 250, "Alapesetben az éves keret 250 óra kell legyen")

    const voluntaryLimit = determineAnnualOvertimeLimit(true)
    assert.strictEqual(voluntaryLimit, 400, "Önként vállalt megállapodással 400 óra kell legyen")
  })

  await t.test("TEST 2: Éves túlóra riasztási sávok (Zöld, Sárga 80%, Piros 100%)", () => {
    // 250h alapeset: 100h -> 40% (normal / green)
    const status100 = calculateOvertimeQuotaStatus(100, 250)
    assert.strictEqual(status100.percentage, 40)
    assert.strictEqual(status100.remainingHours, 150)
    assert.strictEqual(status100.status, "normal")

    // 250h alapeset: 200h -> 80% (warning / yellow)
    const status200 = calculateOvertimeQuotaStatus(200, 250)
    assert.strictEqual(status200.percentage, 80)
    assert.strictEqual(status200.remainingHours, 50)
    assert.strictEqual(status200.status, "warning")

    // 250h alapeset: 249h -> 99.6% (warning / yellow)
    const status249 = calculateOvertimeQuotaStatus(249, 250)
    assert.strictEqual(status249.status, "warning")
    assert.strictEqual(status249.remainingHours, 1)

    // 250h alapeset: 250h -> 100% (exceeded / red)
    const status250 = calculateOvertimeQuotaStatus(250, 250)
    assert.strictEqual(status250.percentage, 100)
    assert.strictEqual(status250.remainingHours, 0)
    assert.strictEqual(status250.status, "exceeded")

    // 250h alapeset: 260h -> 104% (exceeded / red, hátralévő 0)
    const status260 = calculateOvertimeQuotaStatus(260, 250)
    assert.strictEqual(status260.percentage, 104)
    assert.strictEqual(status260.remainingHours, 0)
    assert.strictEqual(status260.status, "exceeded")

    // 400h megállapodásos eset: 250h esetén még zöld (62.5%)!
    const status400_at_250 = calculateOvertimeQuotaStatus(250, 400)
    assert.strictEqual(status400_at_250.percentage, 62.5)
    assert.strictEqual(status400_at_250.status, "normal")

    // 400h megállapodásos eset: 320h esetén sárga (80%)
    const status400_at_320 = calculateOvertimeQuotaStatus(320, 400)
    assert.strictEqual(status400_at_320.percentage, 80)
    assert.strictEqual(status400_at_320.status, "warning")

    // 400h megállapodásos eset: 400h esetén piros (100%)
    const status400_at_400 = calculateOvertimeQuotaStatus(400, 400)
    assert.strictEqual(status400_at_400.percentage, 100)
    assert.strictEqual(status400_at_400.status, "exceeded")
  })

  await t.test("TEST 3: Heti munkaidőkorlát (Mt. 99. § 48h limit)", () => {
    const normalWeek = checkWeeklyHoursCompliance(40)
    assert.strictEqual(normalWeek.isOver40, false)
    assert.strictEqual(normalWeek.isOver48, false)
    assert.strictEqual(normalWeek.level, "normal")

    const overtimeWeek = checkWeeklyHoursCompliance(44)
    assert.strictEqual(overtimeWeek.isOver40, true)
    assert.strictEqual(overtimeWeek.isOver48, false)
    assert.strictEqual(overtimeWeek.level, "overtime")
    assert.ok(overtimeWeek.message?.includes("4 óra túlórát"))

    const limit48Week = checkWeeklyHoursCompliance(48)
    assert.strictEqual(limit48Week.isOver40, true)
    assert.strictEqual(limit48Week.isOver48, false)
    assert.strictEqual(limit48Week.level, "limit")

    const illegalWeek = checkWeeklyHoursCompliance(52)
    assert.strictEqual(illegalWeek.isOver48, true)
    assert.strictEqual(illegalWeek.level, "illegal")
    assert.ok(illegalWeek.message?.includes("48 órás"))
  })

  await t.test("TEST 4: Napi túlóra kiszámítása jelenlétből és beosztásból", () => {
    // 1. Standard 8h munkanap, 9.5 órát dolgozott -> 1.5h túlóra
    const ot1 = calculateDailyOvertimeFromAttendance({
      checkIn: "2026-05-10T08:00:00Z",
      checkOut: "2026-05-10T17:30:00Z",
      scheduledHours: 8.0,
      isRestDay: false,
    })
    assert.strictEqual(ot1.workedHours, 9.5)
    assert.strictEqual(ot1.overtimeHours, 1.5)

    // 2. Műszakos munkanap: beosztás szerint 12 órás műszak, 12 órát dolgozott -> 0h túlóra (rendes műszakóra)
    const ot2 = calculateDailyOvertimeFromAttendance({
      checkIn: "2026-05-10T06:00:00Z",
      checkOut: "2026-05-10T18:00:00Z",
      scheduledHours: 12.0,
      isRestDay: false,
    })
    assert.strictEqual(ot2.workedHours, 12.0)
    assert.strictEqual(ot2.overtimeHours, 0)

    // 3. Pihenőnapi / hétvégi munka (beosztás nélkül): minden óra túlóra
    const ot3 = calculateDailyOvertimeFromAttendance({
      checkIn: "2026-05-16T08:00:00Z",
      checkOut: "2026-05-16T14:00:00Z",
      scheduledHours: 0,
      isRestDay: true,
    })
    assert.strictEqual(ot3.workedHours, 6.0)
    assert.strictEqual(ot3.overtimeHours, 6.0)
  })

  await t.test("TEST 5: Műszak hozzárendelés kockázatelemzés (Műszaktervező Popover)", () => {
    // Jelenleg 42 heti óra, új műszak 8 óra -> 50h heti óra -> wouldExceedWeekly48h = true
    const riskWeekly = validateShiftAssignmentOvertimeRisk({
      currentWeeklyPlannedHours: 42,
      additionalShiftHours: 8,
      annualOvertimeHours: 120,
      annualLimit: 250,
    })
    assert.strictEqual(riskWeekly.newWeeklyHours, 50)
    assert.strictEqual(riskWeekly.wouldExceedWeekly48h, true)
    assert.strictEqual(riskWeekly.isAnnualOvertimeExceeded, false)
    assert.ok(riskWeekly.warningMessage?.includes("48 órás"))

    // Éves keret kimerült: 250h éves túlóra 250-ből
    const riskAnnual = validateShiftAssignmentOvertimeRisk({
      currentWeeklyPlannedHours: 32,
      additionalShiftHours: 8,
      annualOvertimeHours: 252,
      annualLimit: 250,
    })
    assert.strictEqual(riskAnnual.wouldExceedWeekly48h, false)
    assert.strictEqual(riskAnnual.isAnnualOvertimeExceeded, true)
    assert.ok(riskAnnual.warningMessage?.includes("éves"))
  })
})
