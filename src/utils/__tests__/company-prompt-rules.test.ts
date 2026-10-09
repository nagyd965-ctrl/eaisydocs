import assert from "node:assert"
import {
  formatRulesForAiPrompt,
  validateRuleInput,
  RULE_TEMPLATES_HU,
  RULE_CATEGORY_LABELS,
  type PromptRuleItem,
} from "../prompt-rules-helper"

async function runTests() {
  console.log("Starting Company Prompt Rules Unit Tests (TDD)...\n")

  // Test 1: Empty rules returns empty string
  console.log("--- TEST 1: Empty rules array returns empty prompt block ---")
  assert.strictEqual(formatRulesForAiPrompt([]), "")
  assert.strictEqual(formatRulesForAiPrompt(null as any), "")
  console.log("TEST 1 PASSED: Empty array safely produces empty string.")

  // Test 2: Active rules are formatted with high-priority directives
  console.log("\n--- TEST 2: Active rules formatted for Gemini injection ---")
  const activeRules: PromptRuleItem[] = [
    {
      id: "1",
      rule_name: "Telekom számlák",
      rule_prompt: "Minden Telekom és Yettel számlát az IT részleghez és a Távközlési irattári tételhez sorolj.",
      category: "felelos",
      is_active: true,
    },
    {
      id: "2",
      rule_name: "Hatósági NAV levelek",
      rule_prompt: "A NAV leveleket sürgősen iktasd.",
      category: "iktatas",
      is_active: true,
    },
  ]
  const formatted = formatRulesForAiPrompt(activeRules)
  assert.ok(formatted.includes("CÉG-SPECIFIKUS EGYEDI IKTATÁSI ÉS KÖNYVELÉSI SZABÁLYOK"))
  assert.ok(formatted.includes("Telekom számlák"))
  assert.ok(formatted.includes("Hatósági NAV levelek"))
  assert.ok(formatted.includes("KÖTELEZŐ PRIORITÁS"))
  console.log("TEST 2 PASSED: Active rules correctly formatted into Gemini prompt block.")

  // Test 3: Inactive rules are filtered out
  console.log("\n--- TEST 3: Inactive rules are ignored during AI prompt formatting ---")
  const mixedRules: PromptRuleItem[] = [
    {
      id: "1",
      rule_name: "Aktív szabály",
      rule_prompt: "Szerződéseket 10 évig őrizd meg.",
      category: "iktatas",
      is_active: true,
    },
    {
      id: "2",
      rule_name: "Kikapcsolt szabály",
      rule_prompt: "Ezt tilos figyelembe venni.",
      category: "iktatas",
      is_active: false,
    },
  ]
  const mixedFormatted = formatRulesForAiPrompt(mixedRules)
  assert.ok(mixedFormatted.includes("Aktív szabály"))
  assert.strictEqual(mixedFormatted.includes("Kikapcsolt szabály"), false)
  console.log("TEST 3 PASSED: Inactive rules are properly excluded from AI prompt.")

  // Test 4: Validation of rule input
  console.log("\n--- TEST 4: Input validation ---")
  const valid = validateRuleInput("Telekom", "Könyveld az 525-re")
  assert.strictEqual(valid.isValid, true)

  const emptyName = validateRuleInput("", "Valami prompt")
  assert.strictEqual(emptyName.isValid, false)
  assert.ok(emptyName.error?.toLowerCase().includes("nev"))

  const emptyPrompt = validateRuleInput("Szabály neve", "   ")
  assert.strictEqual(emptyPrompt.isValid, false)
  assert.ok(emptyPrompt.error?.includes("instrukció"))
  console.log("TEST 4 PASSED: Rule input validation checks enforced.")

  // Test 5: Standard Hungarian Templates Catalog contains core document scenarios
  console.log("\n--- TEST 5: Hungarian Rule Templates Catalog (3 Clean Groups) ---")
  assert.ok(RULE_TEMPLATES_HU.length === 6)
  
  const iktatasTemplates = RULE_TEMPLATES_HU.filter(t => t.category === "iktatas")
  assert.strictEqual(iktatasTemplates.length, 2)

  const felelosTemplates = RULE_TEMPLATES_HU.filter(t => t.category === "felelos")
  assert.strictEqual(felelosTemplates.length, 2)

  const penzugyTemplates = RULE_TEMPLATES_HU.filter(t => t.category === "penzugy")
  assert.strictEqual(penzugyTemplates.length, 2)

  assert.ok(RULE_CATEGORY_LABELS.iktatas)
  assert.ok(RULE_CATEGORY_LABELS.felelos)
  assert.ok(RULE_CATEGORY_LABELS.penzugy)
  console.log("TEST 5 PASSED: Templates catalog correctly covers the 3 clean document management categories.")

  console.log("\nALL COMPANY PROMPT RULES TESTS COMPLETED SUCCESSFULLY!")
}

runTests().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
