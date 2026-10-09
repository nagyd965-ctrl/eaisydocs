import assert from "node:assert"
import {
  calculateWeeklyPlannedHours,
  checkWeeklyHoursLimit,
  determineMedicalStatus,
  filterShiftsForCopy,
  ShiftForCopy,
  LeaveForCopy,
} from "../shift-planner-helper"

async function runTests() {
  console.log("Starting Shift Planner Helper Unit Tests...\n")

  // Test 1: Heti munkaórák kalkulációja
  console.log("--- TEST 1: Heti tervezett munkaórák kalkulációja ---")
  const standardWeek = [
    { tervezett_ora: 8 },
    { tervezett_ora: 8 },
    { tervezett_ora: 8 },
    { tervezett_ora: 8 },
    { tervezett_ora: 8 },
  ]
  assert.strictEqual(calculateWeeklyPlannedHours(standardWeek), 40)

  const emptyWeek: Array<{ tervezett_ora: number }> = []
  assert.strictEqual(calculateWeeklyPlannedHours(emptyWeek), 0)

  const overtimeWeek = [
    { tervezett_ora: 8 },
    { tervezett_ora: 8 },
    { tervezett_ora: 8 },
    { tervezett_ora: 8 },
    { tervezett_ora: 8 },
    { tervezett_ora: 8 },
    { tervezett_ora: 4 },
  ]
  assert.strictEqual(calculateWeeklyPlannedHours(overtimeWeek), 52)
  console.log("TEST 1 PASSED: Heti tervezett munkaórák pontosan kiszámolva.")

  // Test 2: Heti 48 órás törvényi korlát és túlóra vizsgálat (HR-TASK-02)
  console.log("\n--- TEST 2: 48 órás Mt. korlát és túlóra ellenőrzés ---")
  const limit40 = checkWeeklyHoursLimit(40)
  assert.strictEqual(limit40.isOver40, false)
  assert.strictEqual(limit40.isOver48, false)
  assert.strictEqual(limit40.warning, undefined)

  const limit44 = checkWeeklyHoursLimit(44)
  assert.strictEqual(limit44.isOver40, true)
  assert.strictEqual(limit44.isOver48, false)
  assert.ok(limit44.warning?.includes("4 óra túlórát"))

  const limit52 = checkWeeklyHoursLimit(52)
  assert.strictEqual(limit52.isOver48, true)
  assert.ok(limit52.warning?.includes("meghaladja a törvényes 48 órás"))
  console.log("TEST 2 PASSED: 48h limit és túlóra figyelmeztetések helyesen aktiválódnak.")

  // Test 3: Orvosi alkalmasság lejárati státuszának vizsgálata (HR-TASK-05)
  console.log("\n--- TEST 3: Orvosi alkalmassági érvényesség vizsgálata ---")
  const refDate = "2026-10-09"

  // Lejárt: 2026-09-01 < 2026-10-09
  const statusExpired = determineMedicalStatus("2026-09-01", refDate)
  assert.strictEqual(statusExpired, "lejart")

  // 30 napon belül lejár: 2026-10-25
  const statusExpiringSoon = determineMedicalStatus("2026-10-25", refDate)
  assert.strictEqual(statusExpiringSoon, "lejar_hamarosan")

  // Érvényes: 2027-05-15
  const statusValid = determineMedicalStatus("2027-05-15", refDate)
  assert.strictEqual(statusValid, "ervenyes")

  // Nincs adat
  const statusNoData = determineMedicalStatus(null, refDate)
  assert.strictEqual(statusNoData, "nincs_adat")
  console.log("TEST 3 PASSED: Orvosi alkalmassági állapotok pontosan meghatározva.")

  // Test 4: Előző hét másolása távollétek figyelembevételével
  console.log("\n--- TEST 4: Előző heti műszakok másolása (szabadság védelem) ---")
  const sourceShifts: ShiftForCopy[] = [
    {
      dolgozo_id: "emp-1",
      datum: "2026-10-05", // Hétfő
      sablon_id: "tmpl-d",
      tervezett_ora: 8,
    },
    {
      dolgozo_id: "emp-1",
      datum: "2026-10-06", // Kedd
      sablon_id: "tmpl-d",
      tervezett_ora: 8,
    },
    {
      dolgozo_id: "emp-1",
      datum: "2026-10-07", // Szerda
      sablon_id: "tmpl-d",
      tervezett_ora: 8,
    },
    {
      dolgozo_id: "emp-2",
      datum: "2026-10-05", // Hétfő
      sablon_id: "tmpl-du",
      tervezett_ora: 8,
    },
  ]

  // emp-1 jövő héten szerdán (2026-10-14) szabadságon van!
  const targetLeaves: LeaveForCopy[] = [
    {
      dolgozo_id: "emp-1",
      kezdet_datuma: "2026-10-14",
      veg_datuma: "2026-10-14",
    },
  ]

  const copiedShifts = filterShiftsForCopy(sourceShifts, targetLeaves, 7)

  // Összesen 4 shift volt, de 1 nap kiesik a szabadság miatt -> 3 másolt műszak marad
  assert.strictEqual(copiedShifts.length, 3)

  // Ellenőrizzük, hogy a dátumok +7 nappal eltolódtak
  const emp1Shifts = copiedShifts.filter((s) => s.dolgozo_id === "emp-1")
  assert.strictEqual(emp1Shifts.length, 2)
  assert.strictEqual(emp1Shifts[0].datum, "2026-10-12") // 10-05 + 7
  assert.strictEqual(emp1Shifts[1].datum, "2026-10-13") // 10-06 + 7

  // A 2026-10-14 szerdai nap NEM került bemásolásra
  assert.strictEqual(
    emp1Shifts.some((s) => s.datum === "2026-10-14"),
    false
  )

  // emp-2 hétfői műszakja sikeresen másolva
  const emp2Shifts = copiedShifts.filter((s) => s.dolgozo_id === "emp-2")
  assert.strictEqual(emp2Shifts.length, 1)
  assert.strictEqual(emp2Shifts[0].datum, "2026-10-12")
  console.log("TEST 4 PASSED: Előző hét másolásakor a jóváhagyott távollétek automatikusan védve vannak.")

  // Test 5: Havi jelenléti ív és műszak összekötés kalkulációja
  console.log("\n--- TEST 5: Havi jelenléti ív és műszak összekötés (alapértelmezett 8h vs beosztott műszak) ---")
  const { calculateMonthlyTimesheet } = await import("../hr/timesheet-calculator")

  const sampleDays = [
    // 1. Munkanap beosztott műszak NÉLKÜL -> Alapértelmezett 8h kell legyen!
    {
      date: "2026-10-05", // Hétfő
      type: "munka" as const,
      checkIn: "2026-10-05T08:00:00Z",
      checkOut: "2026-10-05T16:00:00Z",
      shiftPlannedHours: null,
      shiftCode: null,
      shiftName: null,
      isWeekendShift: false,
    },
    // 2. Munkanap beosztott egyedi 12 órás műszakkal -> Terv: 12h kell legyen!
    {
      date: "2026-10-06", // Kedd
      type: "munka" as const,
      checkIn: "2026-10-06T06:00:00Z",
      checkOut: "2026-10-06T18:00:00Z",
      shiftPlannedHours: 12,
      shiftCode: "12H",
      shiftName: "12 órás nappali műszak",
      isWeekendShift: false,
    },
    // 3. Hétvége beosztott műszak NÉLKÜL -> Terv: 0h kell legyen!
    {
      date: "2026-10-10", // Szombat
      type: "hetvege" as const,
      checkIn: null,
      checkOut: null,
      shiftPlannedHours: null,
      shiftCode: null,
      shiftName: null,
      isWeekendShift: false,
    },
    // 4. Hétvége beosztott 'D' műszakkal (8h) -> Terv: 8h, isWeekendShift: true!
    {
      date: "2026-10-11", // Vasárnap
      type: "munka" as const,
      checkIn: "2026-10-11T08:00:00Z",
      checkOut: "2026-10-11T16:30:00Z", // 8.5 óra tényleges munka
      shiftPlannedHours: 8,
      shiftCode: "D",
      shiftName: "Délelőttös műszak",
      isWeekendShift: true,
    },
  ]

  const calculation = calculateMonthlyTimesheet(sampleDays, 8.0, 1.0)

  // 1. nap: hétfő műszak nélkül -> terv: 8h, tény: 8h, egyenleg: 0h
  assert.strictEqual(calculation.calculatedDays[0].plannedHours, 8)
  assert.strictEqual(calculation.calculatedDays[0].actualHours, 8)
  assert.strictEqual(calculation.calculatedDays[0].balance, 0)

  // 2. nap: kedd 12h műszak -> terv: 12h, tény: 12h, egyenleg: 0h
  assert.strictEqual(calculation.calculatedDays[1].plannedHours, 12)
  assert.strictEqual(calculation.calculatedDays[1].actualHours, 12)
  assert.strictEqual(calculation.calculatedDays[1].balance, 0)

  // 3. nap: szombat műszak nélkül -> terv: 0h, tény: 0h, egyenleg: 0h
  assert.strictEqual(calculation.calculatedDays[2].plannedHours, 0)
  assert.strictEqual(calculation.calculatedDays[2].actualHours, 0)
  assert.strictEqual(calculation.calculatedDays[2].balance, 0)

  // 4. nap: vasárnap beosztott 'D' műszak (8h) -> terv: 8h, tény: 8.5h, egyenleg: +0.5h
  assert.strictEqual(calculation.calculatedDays[3].plannedHours, 8)
  assert.strictEqual(calculation.calculatedDays[3].actualHours, 8.5)
  assert.strictEqual(calculation.calculatedDays[3].balance, 0.5)
  assert.strictEqual(calculation.calculatedDays[3].isWeekendShift, true)

  // Összesítők: Tervezett: 8 + 12 + 0 + 8 = 28h, Tényleges: 8 + 12 + 0 + 8.5 = 28.5h, Egyenleg: +0.5h
  assert.strictEqual(calculation.totalPlanned, 28)
  assert.strictEqual(calculation.totalActual, 28.5)
  assert.strictEqual(calculation.totalBalance, 0.5)

  console.log("TEST 5 PASSED: Havi jelenléti ív helyesen veszi az alapértelmezett 8h-t és a beosztott hétvégi/hétköznapi műszakokat.")

  console.log("\nALL SHIFT PLANNER & TIMESHEET TESTS PASSED!")
}

runTests().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})

