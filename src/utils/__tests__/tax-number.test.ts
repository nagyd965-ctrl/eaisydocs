import assert from "node:assert"
import { 
  isHungarianTaxNumber, 
  isEuOrForeignTaxNumber, 
  formatHungarianTaxNumber, 
  separateTaxNumbers 
} from "../tax-number"

async function runTests() {
  console.log("Starting Tax Number Separation & Classification Unit Tests...\n")

  // Test 1: Hungarian Domestic 11-digit tax number
  console.log("--- TEST 1: Hungarian Domestic Tax Number (11 digits with dashes) ---")
  assert.strictEqual(isHungarianTaxNumber("32478520-2-41"), true)
  assert.strictEqual(formatHungarianTaxNumber("32478520-2-41"), "32478520-2-41")
  console.log("TEST 1 PASSED: 32478520-2-41 correctly recognized and formatted.")

  // Test 2: Hungarian Domestic 11-digit tax number without dashes
  console.log("\n--- TEST 2: Hungarian Domestic Tax Number (11 digits without dashes) ---")
  assert.strictEqual(isHungarianTaxNumber("32478520241"), true)
  assert.strictEqual(formatHungarianTaxNumber("32478520241"), "32478520-2-41")
  console.log("TEST 2 PASSED: 32478520241 formatted to 32478520-2-41.")

  // Test 3: Hungarian 8-digit core tax number (törzsszám)
  console.log("\n--- TEST 3: Hungarian 8-digit Core Tax Number ---")
  assert.strictEqual(isHungarianTaxNumber("32478520"), true)
  assert.strictEqual(formatHungarianTaxNumber("32478520"), "32478520")
  console.log("TEST 3 PASSED: 8-digit core accepted.")

  // Test 4: EU Community Tax Number with HU prefix
  console.log("\n--- TEST 4: Hungarian EU Community Tax Number (HU prefix) ---")
  assert.strictEqual(isEuOrForeignTaxNumber("HU32478520"), true)
  assert.strictEqual(isHungarianTaxNumber("HU32478520"), false)
  console.log("TEST 4 PASSED: HU32478520 recognized as EU VAT.")

  // Test 5: Foreign EU Tax Numbers (German, Austrian, etc.)
  console.log("\n--- TEST 5: Foreign EU Tax Numbers (DE, AT) ---")
  assert.strictEqual(isEuOrForeignTaxNumber("DE123456789"), true)
  assert.strictEqual(isEuOrForeignTaxNumber("ATU12345678"), true)
  assert.strictEqual(isHungarianTaxNumber("DE123456789"), false)
  console.log("TEST 5 PASSED: DE and AT tax numbers recognized as foreign.")

  // Test 6: Non-EU Foreign Tax ID (e.g. Serbian PIB 101092577 as in user's invoice)
  console.log("\n--- TEST 6: Serbian PIB (Non-EU 9-digit tax ID) ---")
  assert.strictEqual(isEuOrForeignTaxNumber("101092577"), true)
  assert.strictEqual(isHungarianTaxNumber("101092577"), false)
  console.log("TEST 6 PASSED: Serbian 9-digit PIB categorized as foreign.")

  // Test 7: Combined invoice line with domestic and EU VAT numbers
  console.log("\n--- TEST 7: Combined Invoice String (Domestic + EU) ---")
  const separated = separateTaxNumbers("32478520-2-41, HU32478520", null)
  assert.strictEqual(separated.magyarAdoszam, "32478520-2-41")
  assert.strictEqual(separated.kulfoldiAdoszam, "HU32478520")
  console.log("TEST 7 PASSED: Cleanly separated domestic and EU tax numbers from combined string.")

  // Test 8: Foreign partner with Serbian PIB in rawAdoszam
  console.log("\n--- TEST 8: Foreign partner single field input ---")
  const separatedForeign = separateTaxNumbers("101092577", null)
  assert.strictEqual(separatedForeign.kulfoldiAdoszam, "101092577")
  console.log("TEST 8 PASSED: Foreign ID auto-routed to kulfoldiAdoszam.")

  // Test 9: US EIN (e.g. Celonis Inc. US EIN 61-1797223)
  console.log("\n--- TEST 9: US EIN Identification ---")
  assert.strictEqual(isEuOrForeignTaxNumber("US EIN 61-1797223"), true)
  assert.strictEqual(isEuOrForeignTaxNumber("61-1797223"), true)
  const separatedEin = separateTaxNumbers("US EIN 61-1797223", null)
  assert.strictEqual(separatedEin.kulfoldiAdoszam, "61-1797223")
  console.log("TEST 9 PASSED: US EIN successfully identified and routed as clean 61-1797223.")

  // Test 10: Cached HU tax number separation
  console.log("\n--- TEST 10: HU tax number in single adoszam field ---")
  const separatedHu = separateTaxNumbers("HU32478620", null)
  assert.strictEqual(separatedHu.kulfoldiAdoszam, "HU32478620")
  console.log("TEST 10 PASSED: HU prefix correctly populated kulfoldiAdoszam.")

  console.log("\nALL TAX NUMBER TESTS COMPLETED SUCCESSFULLY!")
}

runTests().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
