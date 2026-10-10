import assert from "node:assert"
import {
  calculate14DayConsecutiveLeave,
  calculateYearEndLeaveRisk,
  getDaysOfYear,
} from "../hr/leave-compliance-calculator"

async function runTests() {
  console.log("Starting Leave Compliance Unit Tests...\n")

  // Test 1: 10 munkanapos szabadság (hétfőtől a következő hét péntekig) = 16 naptári nap
  console.log("--- TEST 1: 10 munkanapos szabadság két hétvégével (16 nap) ---")
  const leaves1 = [
    {
      kezdet_datuma: "2026-07-06", // Hétfő
      veg_datuma: "2026-07-17", // Következő péntek (10 munkanap)
      tipus: "szabadsag",
      statusz: "jovahagyva",
    },
  ]
  const res1 = calculate14DayConsecutiveLeave(leaves1, [], [], 2026)
  assert.strictEqual(res1.isFulfilled, true)
  assert.strictEqual(res1.status, "teljesitve")
  assert.strictEqual(res1.maxConsecutiveDays, 16)
  assert.strictEqual(res1.longestBlock?.startDate, "2026-07-04") // Szombat
  assert.strictEqual(res1.longestBlock?.endDate, "2026-07-19") // Vasárnap
  console.log("TEST 1 PASSED: 10 munkanapos szabadság pontosan 16 egybefüggő naptári napot ad (teljesítve).")

  // Test 2: Csak 5 munkanap szabadság (1 hét) = 9 naptári nap
  console.log("\n--- TEST 2: Csak 5 munkanap szabadság (9 nap - nem elegendő) ---")
  const leaves2 = [
    {
      kezdet_datuma: "2026-08-03", // Hétfő
      veg_datuma: "2026-08-07", // Péntek (5 munkanap)
      tipus: "szabadsag",
      statusz: "jovahagyva",
    },
  ]
  const res2 = calculate14DayConsecutiveLeave(leaves2, [], [], 2026)
  assert.strictEqual(res2.isFulfilled, false)
  assert.strictEqual(res2.status, "nem_teljesult")
  assert.strictEqual(res2.maxConsecutiveDays, 9)
  assert.strictEqual(res2.longestBlock?.startDate, "2026-08-01") // Szombat
  assert.strictEqual(res2.longestBlock?.endDate, "2026-08-09") // Vasárnap
  console.log("TEST 2 PASSED: 5 munkanap szabi nem éri el a 14 napot (9 nap, nem teljesült).")

  // Test 3: 10 munkanap szabadság, DE a köztes szombaton beosztott műszak van!
  console.log("\n--- TEST 3: Köztes hétvégi műszak megtöri az összefüggő pihenőt ---")
  const shiftsWithSaturdayWork = [
    {
      datum: "2026-07-11", // Szombat a 2 hét szabi között
      tervezett_ora: 8,
    },
  ]
  const res3 = calculate14DayConsecutiveLeave(leaves1, shiftsWithSaturdayWork, [], 2026)
  assert.strictEqual(res3.isFulfilled, false)
  // A szombat megtöri a láncot: Első blokk 7 nap (07-04..07-10), második blokk 8 nap (07-12..07-19)
  assert.ok(res3.maxConsecutiveDays < 14)
  assert.strictEqual(res3.status, "nem_teljesult")
  console.log("TEST 3 PASSED: A köztes hétvégi műszak szabályosan megtöri az összefüggő mentesülést.")

  // Test 4: Folyamatban lévő (betervezett) szabadság eléri a 14 napot
  console.log("\n--- TEST 4: Folyamatban lévő kérelmek (betervezve státusz) ---")
  const leavesPending = [
    {
      kezdet_datuma: "2026-07-06",
      veg_datuma: "2026-07-10",
      tipus: "szabadsag",
      statusz: "jovahagyva",
    },
    {
      kezdet_datuma: "2026-07-13",
      veg_datuma: "2026-07-17",
      tipus: "szabadsag",
      statusz: "jovahagyasra_var", // Még bírálat alatt
    },
  ]
  const res4 = calculate14DayConsecutiveLeave(leavesPending, [], [], 2026)
  assert.strictEqual(res4.isFulfilled, false)
  assert.strictEqual(res4.status, "betervezve")
  assert.strictEqual(res4.pendingMaxConsecutiveDays, 16)
  console.log("TEST 4 PASSED: Jóváhagyásra váró kérelemmel a státusz helyesen 'betervezve'.")

  // Test 5: Eltérő megállapodás megléte (hasWaiver = true)
  console.log("\n--- TEST 5: Eltérő megállapodás (mentesülés a 14 nap alól) ---")
  const res5 = calculate14DayConsecutiveLeave(leaves2, [], [], 2026, true)
  assert.strictEqual(res5.isFulfilled, false)
  assert.strictEqual(res5.status, "megallapodas_alapjan_mentes")
  console.log("TEST 5 PASSED: Eltérő megállapodás esetén nem hibát, hanem jogszerű mentesülést kap.")

  // Test 6: Év végi maradványszabadság kockázat – Novemberi riasztás
  console.log("\n--- TEST 6: Novemberi maradványszabadság-riasztás (Q4) ---")
  // 2026-11-01 bázisdátum, 25 éves keret, 10 kivett, 2 betervezett -> 13 nap maradvány
  const riskNov = calculateYearEndLeaveRisk(25, 10, 2, [], 2026, "2026-11-01")
  assert.strictEqual(riskNov.remainingDays, 13)
  assert.strictEqual(riskNov.riskLevel, "figyelmeztetes")
  assert.strictEqual(riskNov.isNovemberAlertActive, true)
  assert.ok(riskNov.statusLabel.includes("Novemberi riasztás"))
  console.log("TEST 6 PASSED: November 1-jén a 13 napos maradvány helyesen aktiválja a novemberi riasztást.")

  // Test 7: Év végi maradványszabadság kockázat – Kritikus ellehetetlenülés
  console.log("\n--- TEST 7: Kritikus kockázat (több maradvány mint hátralévő munkanap) ---")
  // 2026-12-15 bázisdátum (kb. 12 munkanap van hátra), 16 nap maradvány
  const riskCritical = calculateYearEndLeaveRisk(25, 5, 4, [], 2026, "2026-12-15")
  assert.strictEqual(riskCritical.remainingDays, 16)
  assert.strictEqual(riskCritical.riskLevel, "kritikus")
  assert.ok(riskCritical.statusLabel.includes("Kritikus: Nem adható ki"))
  console.log("TEST 7 PASSED: Amikor a szabadság több, mint a hátralévő munkanapok, 'kritikus' riasztás lép életbe.")

  // Test 8: Naptári év napjai
  console.log("\n--- TEST 8: getDaysOfYear integritás ---")
  const days2026 = getDaysOfYear(2026)
  assert.strictEqual(days2026.length, 365)
  assert.strictEqual(days2026[0], "2026-01-01")
  assert.strictEqual(days2026[364], "2026-12-31")
  console.log("TEST 8 PASSED: Éves napok generálása pontos.")

  console.log("\nALL LEAVE COMPLIANCE UNIT TESTS PASSED!")
}

runTests().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
