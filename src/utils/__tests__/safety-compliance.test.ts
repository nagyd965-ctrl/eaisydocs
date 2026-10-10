import {
  calculateSafetyTrainingStatus,
  calculateCompanySafetyOverview,
  EmployeeSafetyRecord
} from "../hr/safety-compliance-calculator"

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

async function runTests() {
  console.log("Starting Safety Training Compliance Unit Tests...\n")
  const baseDate = "2026-10-10"

  // --- TEST 1: Érvényes oktatás (>30 nap hátra) ---
  console.log("--- TEST 1: Érvényes oktatás (>30 nap hátra) ---")
  const resValid = calculateSafetyTrainingStatus("2027-05-15", baseDate)
  assert(resValid.status === "ervenyess", `Expected 'ervenyess', got ${resValid.status}`)
  assert(resValid.daysRemaining !== null && resValid.daysRemaining > 30, `Expected >30 days remaining, got ${resValid.daysRemaining}`)
  console.log("TEST 1 PASSED: Érvényes státusz helyes.\n")

  // --- TEST 2: 30 napon belül lejáró oktatás (15 nap hátra) ---
  console.log("--- TEST 2: 30 napon belül lejáró oktatás (15 nap hátra) ---")
  const resExpiring = calculateSafetyTrainingStatus("2026-10-25", baseDate)
  assert(resExpiring.status === "hamarosan_lejar", `Expected 'hamarosan_lejar', got ${resExpiring.status}`)
  assert(resExpiring.daysRemaining === 15, `Expected exactly 15 days remaining, got ${resExpiring.daysRemaining}`)
  console.log("TEST 2 PASSED: Hamarosan lejáró státusz pontos.\n")

  // --- TEST 3: Ma lejáró oktatás (0 nap) ---
  console.log("--- TEST 3: Ma lejáró oktatás (0 nap) ---")
  const resToday = calculateSafetyTrainingStatus("2026-10-10", baseDate)
  assert(resToday.status === "hamarosan_lejar", `Expected 'hamarosan_lejar' on expiration day, got ${resToday.status}`)
  assert(resToday.daysRemaining === 0, `Expected 0 days remaining, got ${resToday.daysRemaining}`)
  console.log("TEST 3 PASSED: Mai lejárati határnap kezelése pontos.\n")

  // --- TEST 4: Lejárt oktatás (-5 nap) ---
  console.log("--- TEST 4: Lejárt oktatás (-5 nap) ---")
  const resExpired = calculateSafetyTrainingStatus("2026-10-05", baseDate)
  assert(resExpired.status === "lejart", `Expected 'lejart', got ${resExpired.status}`)
  assert(resExpired.daysRemaining === -5, `Expected -5 days remaining, got ${resExpired.daysRemaining}`)
  console.log("TEST 4 PASSED: Lejárt oktatás detektálása helyes.\n")

  // --- TEST 5: Hiányzó oktatás (nincs rekord) ---
  console.log("--- TEST 5: Hiányzó oktatás (nincs rekord) ---")
  const resMissing = calculateSafetyTrainingStatus(null, baseDate)
  assert(resMissing.status === "hianyzik", `Expected 'hianyzik', got ${resMissing.status}`)
  assert(resMissing.daysRemaining === null, `Expected null days remaining, got ${resMissing.daysRemaining}`)
  console.log("TEST 5 PASSED: Hiányzó oktatás helyesen jelölve.\n")

  // --- TEST 6: Cégszintű összesítés és arányszámítás ---
  console.log("--- TEST 6: Cégszintű összesítés és arányszámítás ---")
  const mockEmployees: EmployeeSafetyRecord[] = [
    { dolgozoId: "1", nev: "Teszt Elek", ervenyessegVege: "2027-01-01" }, // ervenyess
    { dolgozoId: "2", nev: "Teszt Béla", ervenyessegVege: "2027-03-01" }, // ervenyess
    { dolgozoId: "3", nev: "Teszt Géza", ervenyessegVege: "2026-10-20" }, // hamarosan_lejar (10 nap)
    { dolgozoId: "4", nev: "Teszt Kata", ervenyessegVege: "2026-09-01" }, // lejart
    { dolgozoId: "5", nev: "Teszt Anna", ervenyessegVege: null },         // hianyzik
  ]

  const overview = calculateCompanySafetyOverview(mockEmployees, baseDate)
  assert(overview.totalEmployees === 5, `Expected 5 employees, got ${overview.totalEmployees}`)
  assert(overview.validCount === 2, `Expected 2 valid, got ${overview.validCount}`)
  assert(overview.expiringSoonCount === 1, `Expected 1 expiring soon, got ${overview.expiringSoonCount}`)
  assert(overview.expiredCount === 1, `Expected 1 expired, got ${overview.expiredCount}`)
  assert(overview.missingCount === 1, `Expected 1 missing, got ${overview.missingCount}`)
  assert(overview.expiredOrMissingCount === 2, `Expected 2 expired or missing, got ${overview.expiredOrMissingCount}`)
  assert(overview.compliancePercent === 40, `Expected 40% compliance (2/5), got ${overview.compliancePercent}`)
  console.log("TEST 6 PASSED: Cégszintű statisztikai összegzés és arányszámítás hibátlan.\n")

  console.log("ALL SAFETY TRAINING COMPLIANCE UNIT TESTS PASSED!")
}

runTests().catch((e) => {
  console.error("Test failed:", e)
  process.exit(1)
})
