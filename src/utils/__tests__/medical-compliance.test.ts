/**
 * Unit Tesztek: Orvosi alkalmassági és beosztási blokkolás (HR-TASK-05)
 * Futtatás: npx tsx src/utils/__tests__/medical-compliance.test.ts
 */

import { checkMedicalValidityForDate } from "../hr/medical-compliance-checker"

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message)
    process.exit(1)
  }
}

console.log("Starting Medical Compliance & Blocking Unit Tests...\n")

// TEST 1: Érvényes orvosi vizsgálat (>30 nap hátra)
console.log("--- TEST 1: Érvényes orvosi vizsgálat (>30 nap hátra) ---")
{
  const res = checkMedicalValidityForDate("2026-12-31", "2026-10-10")
  assert(res.isValid === true, "Érvényes vizsgálatnak engednie kell a munkavégzést")
  assert(res.status === "ervenyes", "Státusznak 'ervenyes'-nek kell lennie")
  assert(res.daysRemaining === 82, `82 napnak kellene hátra lennie, de: ${res.daysRemaining}`)
  assert(res.errorMessage === undefined, "Nem szabad hibaüzenetnek lennie")
  console.log("TEST 1 PASSED: Érvényes orvosi vizsgálat helyesen engedélyezve.\n")
}

// TEST 2: 30 napon belül lejáró orvosi vizsgálat (még érvényes, de figyelmeztet)
console.log("--- TEST 2: 30 napon belül lejáró vizsgálat (15 nap hátra) ---")
{
  const res = checkMedicalValidityForDate("2026-10-25", "2026-10-10")
  assert(res.isValid === true, "A 15 nap múlva lejáró vizsgálat ma még érvényes munkavégzésre")
  assert(res.status === "lejar_hamarosan", "Státusznak 'lejar_hamarosan'-nak kell lennie")
  assert(res.daysRemaining === 15, `15 napnak kellene hátra lennie, de: ${res.daysRemaining}`)
  console.log("TEST 2 PASSED: 30 napon belüli lejáró vizsgálat engedélyezve, figyelmeztető státusszal.\n")
}

// TEST 3: Pont aznap lejáró vizsgálat (0 nap)
console.log("--- TEST 3: Ma lejáró vizsgálat (0 nap) ---")
{
  const res = checkMedicalValidityForDate("2026-10-10", "2026-10-10")
  assert(res.isValid === true, "A mai napon még érvényes")
  assert(res.daysRemaining === 0, "0 nap maradt")
  assert(res.statusLabel === "Ma jár le!", `Státusz címke: ${res.statusLabel}`)

  // Holnap viszont már érvénytelennek kell lennie!
  const resTomorrow = checkMedicalValidityForDate("2026-10-10", "2026-10-11")
  assert(resTomorrow.isValid === false, "Másnap már tiltani kell")
  assert(resTomorrow.status === "lejart", "Másnap státusza már 'lejart'")
  console.log("TEST 3 PASSED: Lejárati határnap kezelése pontos.\n")
}

// TEST 4: Lejárt orvosi vizsgálat (blokkolás kötelező!)
console.log("--- TEST 4: Lejárt vizsgálat (-5 nap) ---")
{
  const res = checkMedicalValidityForDate("2026-10-05", "2026-10-10")
  assert(res.isValid === false, "Lejárt orvosi vizsgálattal a munkavégzést TILTANI kell")
  assert(res.status === "lejart", "Státusznak 'lejart'-nak kell lennie")
  assert(res.daysRemaining === -5, `Diffnek -5-nek kell lennie, de: ${res.daysRemaining}`)
  assert(res.errorMessage !== undefined, "Kötelező blokkoló hibaüzenetet adni")
  assert(res.errorMessage!.includes("lejárt"), "A hibaüzenetnek hivatkoznia kell a lejárati dátumra")
  console.log("TEST 4 PASSED: Lejárt orvosi vizsgálat azonnal blokkolva hibaüzenettel.\n")
}

// TEST 5: Hiányzó orvosi vizsgálat (nincs felvéve vizsgálat)
console.log("--- TEST 5: Hiányzó orvosi vizsgálat (null / undefined) ---")
{
  const resNull = checkMedicalValidityForDate(null, "2026-10-10")
  assert(resNull.isValid === false, "Hiányzó orvosi vizsgálattal a munkavégzést TILTANI kell")
  assert(resNull.status === "hianyzik", "Státusznak 'hianyzik'-nak kell lennie")
  assert(resNull.errorMessage !== undefined, "Kötelező blokkoló hibaüzenetet adni")
  assert(resNull.errorMessage!.includes("Mvt. 49. §"), "A hibaüzenetnek hivatkoznia kell a törvényi háttérre")

  const resUndefined = checkMedicalValidityForDate(undefined, "2026-10-10")
  assert(resUndefined.isValid === false, "Undefined esetén is tiltani kell")
  console.log("TEST 5 PASSED: Hiányzó orvosi vizsgálat azonnal blokkolva hibaüzenettel.\n")
}

console.log("ALL MEDICAL COMPLIANCE UNIT TESTS PASSED!\n")
