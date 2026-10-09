import assert from "node:assert"
import {
  matchFilingRules,
  validateFilingRuleInput,
  type CompanyFilingRule,
} from "../filing-rules-engine"

async function runTests() {
  console.log("Starting Filing Rules Engine Unit Tests (TDD)...\n")

  const mockRules: CompanyFilingRule[] = [
    {
      id: "rule-1",
      company_id: "comp-1",
      rule_name: "Telekom számlák",
      search_pattern: "Telekom",
      partner_name: "Magyar Telekom Nyrt.",
      partner_tax_number: "10773381",
      match_type: "contains",
      target_department_id: "dept-it",
      target_irattari_tetel_id: "plan-tel",
      target_document_type: "szamla",
      target_subject_prefix: "[Távközlés]",
      scope: "company",
      is_active: true,
    },
    {
      id: "rule-2",
      company_id: "comp-1",
      rule_name: "NAV Hatósági levelek",
      search_pattern: "Adó- és Vámhivatal",
      partner_name: "NAV",
      match_type: "contains",
      target_department_id: "dept-legal",
      target_irattari_tetel_id: "plan-tax",
      target_document_type: "hatosagi",
      target_subject_prefix: "[Sürgős]",
      scope: "company",
      is_active: true,
    },
    {
      id: "rule-3",
      company_id: "comp-1",
      rule_name: "Inaktív MOL szabály",
      search_pattern: "MOL Nyrt",
      match_type: "contains",
      target_department_id: "dept-fleet",
      is_active: false,
    },
  ]

  // Test 1: Match by Partner Tax Number
  console.log("--- TEST 1: Match by partner tax number ---")
  const matchTax = matchFilingRules(mockRules, {
    partnerTax: "10773381-2-44",
  })
  assert.ok(matchTax)
  assert.strictEqual(matchTax.matchedRule.id, "rule-1")
  assert.strictEqual(matchTax.department_id, "dept-it")
  assert.strictEqual(matchTax.target_subject_prefix, "[Távközlés]")
  console.log("TEST 1 PASSED: Matched successfully by tax number substring.")

  // Test 2: Match by Document Text Pattern
  console.log("\n--- TEST 2: Match by document content pattern ---")
  const matchText = matchFilingRules(mockRules, {
    text: "Tájékoztatjuk, hogy a Nemzeti Adó- és Vámhivatal határozatot hozott...",
  })
  assert.ok(matchText)
  assert.strictEqual(matchText.matchedRule.id, "rule-2")
  assert.strictEqual(matchText.department_id, "dept-legal")
  assert.strictEqual(matchText.target_document_type, "hatosagi")
  console.log("TEST 2 PASSED: Matched successfully by document text.")

  // Test 3: Inactive rules are ignored
  console.log("\n--- TEST 3: Inactive rules are skipped ---")
  const matchInactive = matchFilingRules(mockRules, {
    text: "MOL Nyrt. üzemanyag számla",
  })
  assert.strictEqual(matchInactive, null)
  console.log("TEST 3 PASSED: Inactive rules were properly excluded from matching.")

  // Test 4: Validation of rule creation input
  console.log("\n--- TEST 4: Validation of filing rule input ---")
  const valid = validateFilingRuleInput({
    rule_name: "Érvényes szabály",
    search_pattern: "Minta",
  })
  assert.strictEqual(valid.isValid, true)

  const invalidName = validateFilingRuleInput({
    rule_name: "",
    search_pattern: "Minta",
  })
  assert.strictEqual(invalidName.isValid, false)
  assert.ok(invalidName.error?.includes("neve"))

  const noCondition = validateFilingRuleInput({
    rule_name: "Szabály",
    search_pattern: "",
    partner_name: "",
    partner_tax_number: "",
  })
  assert.strictEqual(noCondition.isValid, false)
  assert.ok(noCondition.error?.includes("feltétel"))
  console.log("TEST 4 PASSED: Validation constraints properly enforced.")

  // Test 5: Diacritic-insensitive matching (Bérleti szerződés vs Berleti Szerzodes)
  console.log("\n--- TEST 5: Diacritic-insensitive (accent-independent) matching ---")
  const accentRule: CompanyFilingRule[] = [
    {
      id: "rule-accent",
      company_id: "comp-1",
      rule_name: "Bérleti szerződés",
      search_pattern: "Bérleti szerződés",
      target_department_id: "dept-hr",
      target_irattari_tetel_id: "plan-hr",
      is_active: true,
    },
  ]
  const matchAccent = matchFilingRules(accentRule, {
    text: "KOVACS KFT. - BERLETI SZERZODES MELY LETREJOTT...",
  })
  assert.ok(matchAccent)
  assert.strictEqual(matchAccent.matchedRule.id, "rule-accent")
  assert.strictEqual(matchAccent.department_id, "dept-hr")
  assert.strictEqual(matchAccent.irattari_tetel_id, "plan-hr")
  console.log("TEST 5 PASSED: Accented pattern matched unaccented OCR text successfully.")

  console.log("\nALL FILING RULES ENGINE TESTS PASSED!")
}

runTests().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
