import assert from "node:assert"
import { classifyIncomingEmail, EmailClassificationInput } from "../email-spam-filter"

async function runTests() {
  console.log("Starting Email Spam & Relevance Filter Unit Tests...")

  // Test 1: Real Business Invoice with PDF attachment
  console.log("\n--- TEST 1: Legitimate Invoice with PDF ---")
  const invoiceEmail: EmailClassificationInput = {
    from: "szamlazas@telekom.hu",
    senderName: "Magyar Telekom Nyrt.",
    subject: "Havi távközlési számla - 2026/09",
    bodyText: "Tisztelt Ügyfelünk! Csatoltan küldjük a 2026. szeptemberi elektronikus számlát.",
    attachmentNames: ["szamla_2026_09_telekom.pdf"]
  }

  const res1 = await classifyIncomingEmail(invoiceEmail)
  console.log("Result 1:", res1)
  assert.strictEqual(res1.isRelevant, true, "Invoice email should be marked as relevant")
  assert.strictEqual(res1.category, "official_document", "Invoice category should be official_document")
  assert.strictEqual(res1.suggestedAction, "intake", "Suggested action should be intake")
  console.log("TEST 1 PASSED: Valid invoice accepted.")

  // Test 2: Marketing Newsletter / Promotion
  console.log("\n--- TEST 2: Marketing Newsletter ---")
  const promoEmail: EmailClassificationInput = {
    from: "hirlevel@akcioswebaruhaz.hu",
    senderName: "Akciós Webáruház",
    subject: "CSAK MA! 50% kedvezmény minden termékre!",
    bodyText: "Ne maradj le az őszi akciókról! Kattints ide a vásárláshoz. Leiratkozás: kattints ide a hírlevélről való leiratkozáshoz.",
    attachmentNames: []
  }

  const res2 = await classifyIncomingEmail(promoEmail)
  console.log("Result 2:", res2)
  assert.strictEqual(res2.isRelevant, false, "Marketing newsletter must be filtered out")
  assert.strictEqual(res2.category, "marketing_newsletter", "Category should be marketing_newsletter")
  assert.strictEqual(res2.suggestedAction, "ignore", "Suggested action should be ignore")
  console.log("TEST 2 PASSED: Marketing newsletter rejected.")

  // Test 3: System Bounce / MAILER-DAEMON
  console.log("\n--- TEST 3: System Bounce Notification ---")
  const bounceEmail: EmailClassificationInput = {
    from: "MAILER-DAEMON@mail.server.hu",
    senderName: "Mail Delivery Subsystem",
    subject: "Undelivered Mail Returned to Sender",
    bodyText: "This is the mail system at host mail.server.hu. I'm sorry to have to inform you that your message could not be delivered.",
    attachmentNames: []
  }

  const res3 = await classifyIncomingEmail(bounceEmail)
  console.log("Result 3:", res3)
  assert.strictEqual(res3.isRelevant, false, "Bounce message must be filtered out")
  assert.strictEqual(res3.category, "automated_notification", "Category should be automated_notification")
  console.log("TEST 3 PASSED: Bounce message rejected.")

  // Test 4: Phishing / Casino Spam
  console.log("\n--- TEST 4: Casino / Phishing Spam ---")
  const spamEmail: EmailClassificationInput = {
    from: "winner@crypto-casino-bonus.xyz",
    senderName: "Crypto Rewards",
    subject: "You won 5000 USDT! Claim your reward now",
    bodyText: "Congratulations! Your wallet was selected. Deposit now to unlock your free spins and Bitcoin jackpot.",
    attachmentNames: []
  }

  const res4 = await classifyIncomingEmail(spamEmail)
  console.log("Result 4:", res4)
  assert.strictEqual(res4.isRelevant, false, "Casino spam must be filtered out")
  assert.strictEqual(res4.category, "spam", "Category should be spam")
  console.log("TEST 4 PASSED: Spam rejected.")

  // Test 5: Fallback Safety (Fail-Open)
  console.log("\n--- TEST 5: Fallback Safety Rule ---")
  const ambiguousEmail: EmailClassificationInput = {
    from: "partner@ceg.hu",
    senderName: "Kovács Gábor",
    subject: "Egyeztetés a jövő heti szállításról",
    bodyText: "Kedves Dani, a jövő heti szállítás ütemezéséről szeretnék egyeztetni.",
    attachmentNames: []
  }

  const res5 = await classifyIncomingEmail(ambiguousEmail)
  console.log("Result 5:", res5)
  assert.strictEqual(res5.isRelevant, true, "Legitimate business inquiry must be preserved (fail-open)")
  console.log("TEST 5 PASSED: Business inquiry accepted.")

  console.log("\nALL EMAIL SPAM & RELEVANCE FILTER TESTS COMPLETED SUCCESSFULLY!")
}

runTests().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
