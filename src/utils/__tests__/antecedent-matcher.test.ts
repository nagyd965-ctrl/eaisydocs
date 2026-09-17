import { calculateAntecedentMatch, CandidateDossier, TargetIratInput } from "../antecedent-matcher"
import assert from "node:assert"

console.log("Starting Antecedent Matcher Unit Tests...")

// Sample Mock Dossiers
const mockDossiers: CandidateDossier[] = [
  {
    id: "dossier-telekom-1",
    iktatoszam: "NYILV/2026/00012",
    statusz: "ugyintezes_alatt",
    szervezeti_egyseg: { id: "dept-1", nev: "IT és Távközlés" },
    ugy: {
      id: "ugy-1",
      ugyszam: "U/2026/00012",
      targy: "Magyar Telekom internetszolgáltatási keretszerződés",
      statusz: "folyamatban"
    },
    irat: [
      {
        id: "irat-1",
        targy: "Keretszerződés tervezet 2026",
        alszam: 1,
        kuldo_partner_id: "partner-telekom",
        partner: { id: "partner-telekom", nev: "Magyar Telekom Nyrt." }
      },
      {
        id: "irat-2",
        targy: "Kiegészítő nyilatkozat",
        alszam: 2,
        kuldo_partner_id: "partner-telekom",
        partner: { id: "partner-telekom", nev: "Magyar Telekom Nyrt." }
      }
    ]
  },
  {
    id: "dossier-eon-closed",
    iktatoszam: "PENZ/2025/00088",
    statusz: "lezart",
    szervezeti_egyseg: { id: "dept-2", nev: "Pénzügyi osztály" },
    ugy: {
      id: "ugy-2",
      ugyszam: "U/2025/00088",
      targy: "E.ON Áramszolgáltatás elszámolás 2025",
      statusz: "lezart"
    },
    irat: [
      {
        id: "irat-3",
        targy: "Éves végszámla",
        alszam: 1,
        kuldo_partner_id: "partner-eon",
        partner: { id: "partner-eon", nev: "E.ON Energiamegoldások Kft." }
      }
    ]
  }
]

// TEST 1: High Match with Same Partner and Matching Subject Keywords
console.log("\n--- TEST 1: Same Partner + Similar Subject ---")
const incomingTelekom: TargetIratInput = {
  id: "incoming-1",
  targy: "Telekom internetszolgáltatás módosítási kérelem",
  kuldo_partner_id: "partner-telekom",
  partner_nev: "Magyar Telekom Nyrt."
}
const res1 = calculateAntecedentMatch(incomingTelekom, mockDossiers)
console.log("Res 1 Score:", res1.confidence_score)
console.log("Res 1 Recommendation:", res1.recommendation_type)
console.log("Res 1 Target Dossier:", res1.iktatoszam)
console.log("Res 1 Indoklas:", res1.indoklas)

assert.strictEqual(res1.recommendation_type, "alszam_csatolas")
assert.ok(res1.confidence_score >= 60, "Expected confidence >= 60%")
assert.strictEqual(res1.ugyirat_id, "dossier-telekom-1")
assert.strictEqual(res1.iktatoszam, "NYILV/2026/00012")

// TEST 2: Direct Reference Match (Iktatószám mentioned in text)
console.log("\n--- TEST 2: Direct Iktatószám Reference in Subject ---")
const incomingWithRef: TargetIratInput = {
  id: "incoming-2",
  targy: "Válasz a NYILV/2026/00012 ügyiratra",
  kuldo_partner_id: null,
  partner_nev: null
}
const res2 = calculateAntecedentMatch(incomingWithRef, mockDossiers)
console.log("Res 2 Score:", res2.confidence_score)
console.log("Res 2 Recommendation:", res2.recommendation_type)
console.log("Res 2 Iktatoszam:", res2.iktatoszam)

assert.strictEqual(res2.ugyirat_id, "dossier-telekom-1")
assert.ok(res2.confidence_score >= 40)
assert.ok(res2.reszletek.some(d => d.includes("NYILV/2026/00012")))

// TEST 3: Matching against a CLOSED dossier (e.g. late complaint or settlement)
console.log("\n--- TEST 3: Match with Closed Dossier ---")
const incomingEon: TargetIratInput = {
  id: "incoming-3",
  targy: "E.ON elszámolási korrekció",
  kuldo_partner_id: "partner-eon",
  partner_nev: "E.ON Energiamegoldások Kft."
}
const res3 = calculateAntecedentMatch(incomingEon, mockDossiers)
console.log("Res 3 Score:", res3.confidence_score)
console.log("Res 3 Recommendation:", res3.recommendation_type)
console.log("Res 3 Target Dossier:", res3.iktatoszam)
console.log("Res 3 Statusz:", res3.statusz)

assert.strictEqual(res3.ugyirat_id, "dossier-eon-closed")
assert.strictEqual(res3.statusz, "lezart")
assert.ok(res3.confidence_score >= 60)

// TEST 4: New Topic (Unknown partner, distinct subject)
console.log("\n--- TEST 4: New Topic / Low Similarity ---")
const incomingNewTopic: TargetIratInput = {
  id: "incoming-4",
  targy: "Irodai kávéfőző bérlés és karbantartás",
  kuldo_partner_id: "partner-coffeeco",
  partner_nev: "Coffee Masters Kft."
}
const res4 = calculateAntecedentMatch(incomingNewTopic, mockDossiers)
console.log("Res 4 Score:", res4.confidence_score)
console.log("Res 4 Recommendation:", res4.recommendation_type)
console.log("Res 4 Target Dossier:", res4.iktatoszam)
console.log("Res 4 Indoklas:", res4.indoklas)

assert.strictEqual(res4.recommendation_type, "uj_ugy_nyitasa")
assert.strictEqual(res4.ugyirat_id, null)
assert.ok(res4.confidence_score < 40)

console.log("\nALL 4 ANTECEDENT MATCHER TESTS PASSED SUCCESSFULLY! ✅")
