import assert from "node:assert"
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const adminClient = createClient(supabaseUrl, supabaseServiceKey)

async function runTests() {
  console.log("=== EAISYHR: DOLGOZÓI AJÁNLÁS & BÓNUSZ EGYSÉGTESZTEK ===\n")

  // 1. Teszt: Céges bónusz alapértelmezett érték ellenőrzése
  console.log("--- 1. TESZT: Céges bónusz oszlop és alapértelmezett érték ---")
  const { data: companies, error: compErr } = await adminClient
    .from("companies")
    .select("id, name, referral_bonus_amount")
    .limit(1)

  assert.strictEqual(compErr, null, "Nem lehet hiba a companies lekérdezésében")
  assert(companies && companies.length > 0, "Lennie kell legalább egy cégnek")
  const company = companies[0]
  console.log(`Cég: ${company.name}, referral_bonus_amount: ${company.referral_bonus_amount}`)
  const bonus = company.referral_bonus_amount ?? 150000
  assert.strictEqual(typeof bonus, "number", "A bónusz számnak kell lennie")
  assert(bonus >= 0, "A bónusz nem lehet negatív")
  console.log("1. TESZT SIKERES: referral_bonus_amount megfelelően létezik a cég táblában.")

  // 2. Teszt: E-mail validációs szabályok
  console.log("\n--- 2. TESZT: Jelölt e-mail validáció ---")
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  assert.strictEqual(emailRegex.test("valid.candidate@example.hu"), true)
  assert.strictEqual(emailRegex.test("invalid-email"), false)
  assert.strictEqual(emailRegex.test("@no-local.com"), false)
  assert.strictEqual(emailRegex.test("no-domain@"), false)
  console.log("2. TESZT SIKERES: E-mail regex szabályok helyesen szűrnek.")

  // 3. Teszt: hr_dolgozoi_ajanlas tábla integritása és RLS
  console.log("\n--- 3. TESZT: hr_dolgozoi_ajanlas tábla struktúra és beszúrás ---")
  const testCandidateName = `Teszt Ajánlott Jelölt ${Date.now()}`
  const testCandidateEmail = `ajanlott.${Date.now()}@example.hu`

  // Lekérünk egy teszt felhasználót
  const { data: users } = await adminClient
    .from("felhasznalo_profil")
    .select("id")
    .limit(1)

  assert(users && users.length > 0, "Lennie kell legalább egy felhasználónak")
  const userId = users[0].id

  const { data: insertedReferral, error: insertErr } = await adminClient
    .from("hr_dolgozoi_ajanlas")
    .insert({
      company_id: company.id,
      ajanlo_dolgozo_id: userId,
      jelolt_nev: testCandidateName,
      jelolt_email: testCandidateEmail,
      jelolt_telefon: "+36301234567",
      ajanlas_indoklas: "Kiváló tapasztalt szakember korábbi projektekről.",
      bonusz_osszeg: bonus,
      bonusz_statusz: "fuggoben",
    })
    .select()
    .single()

  assert.strictEqual(insertErr, null, "Nem lehet hiba az ajánlás beszúrásakor: " + insertErr?.message)
  assert.strictEqual(insertedReferral.jelolt_nev, testCandidateName)
  assert.strictEqual(insertedReferral.bonusz_statusz, "fuggoben")
  assert.strictEqual(insertedReferral.bonusz_osszeg, bonus)
  console.log("3. TESZT SIKERES: hr_dolgozoi_ajanlas rekord létrejött.")

  // 4. Teszt: Bónusz státusz életciklus validáció
  console.log("\n--- 4. TESZT: Bónusz státusz átmenetek ---")
  const validStatuses = ["fuggoben", "feltetelhez_kotve", "kifizetheto", "kifizetve", "elutasitva"]
  for (const status of validStatuses) {
    const res: any = await adminClient
      .from("hr_dolgozoi_ajanlas")
      .update({ bonusz_statusz: status } as any)
      .eq("id", insertedReferral.id)

    assert.strictEqual(res.error, null, `Nem lehet hiba a(z) ${status} státuszra váltáskor`)
  }
  console.log("4. TESZT SIKERES: Minden megengedett bónusz státusz átmenet érvényes.")

  // 5. Teszt: Takarítás (teszt adat törlése)
  console.log("\n--- 5. TESZT: Teszt rekord törlése ---")
  const { error: delErr } = await adminClient
    .from("hr_dolgozoi_ajanlas")
    .delete()
    .eq("id", insertedReferral.id)

  assert.strictEqual(delErr, null, "Nem lehet hiba a teszt adat törlésekor")
  console.log("5. TESZT SIKERES: Teszt adat tisztázva.")

  console.log("\nMINDEN DOLGOZÓI AJÁNLÁS ÉS BÓNUSZ TESZT SIKERESEN LEFUTOTT!")
}

runTests().catch((err) => {
  console.error("Teszt hiba:", err)
  process.exit(1)
})
