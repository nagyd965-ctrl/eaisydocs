import test from "node:test"
import assert from "node:assert"
import { generateAiReplyAction, ReplyStyle } from "@/app/dossiers/[id]/ai-reply-actions"

test("▶ eaisyDocs AI Reply Letter Wizard & Generator", async (t) => {
  await t.test("TEST 1: Üres instrukció elutasítása hibaüzenettel", async () => {
    const res = await generateAiReplyAction({
      ugyiratId: "test-ugyirat-123",
      style: "hivatalos",
      userInstructions: "",
    })

    assert.strictEqual(res.success, false)
    assert.match(res.error || "", /legalább egy rövid instrukciót/i)
  })

  await t.test("TEST 2: Hivatalos stílusú fallback levélgenerálás", async () => {
    const res = await generateAiReplyAction({
      ugyiratId: "test-ugyirat-123",
      style: "hivatalos",
      userInstructions: "A számlát alaki és tartalmi szempontból jóváhagytuk, az átutalás megtörtént.",
      partnerName: "AIONHILL INC",
      incomingTargy: "2026/001 számla",
      iktatoszam: "SZERZ/2026/00004",
    })

    assert.strictEqual(res.success, true)
    assert.ok(res.targy?.includes("2026/001 számla"))
    assert.ok(res.targy?.includes("SZERZ/2026/00004"))
    assert.ok(res.tartalom?.includes("Tisztelt AIONHILL INC!"))
    assert.ok(res.tartalom?.includes("Tisztelettel"))
    assert.ok(res.tartalom?.includes("A számlát alaki és tartalmi szempontból jóváhagytuk"))
  })

  await t.test("TEST 3: Partneri / Barátságos stílusú levélgenerálás", async () => {
    const res = await generateAiReplyAction({
      ugyiratId: "test-ugyirat-123",
      style: "baratsagos",
      userInstructions: "Örömmel fogadjuk az együttműködést a megújított feltételekkel.",
      partnerName: "Kovács & Társa Bt.",
      incomingTargy: "Együttműködési megkeresés",
      iktatoszam: "NYILV/2026/00012",
    })

    assert.strictEqual(res.success, true)
    assert.ok(res.tartalom?.includes("Tisztelt Kovács & Társa Bt.!"))
    assert.ok(res.tartalom?.includes("Szívélyes üdvözlettel"))
    assert.ok(res.tartalom?.includes("Örömmel fogadjuk az együttműködést"))
  })

  await t.test("TEST 4: Felszólító / Határidős stílusú levélgenerálás hiánypótlással", async () => {
    const res = await generateAiReplyAction({
      ugyiratId: "test-ugyirat-123",
      style: "felszolito",
      userInstructions: "Hiányzik az aláírt szerződés 2. számú melléklete, kérjük 8 napon belül pótolni.",
      partnerName: "Partner Kft.",
      incomingTargy: "Szerződéstervezet",
      iktatoszam: "SZERZ/2026/00099",
    })

    assert.strictEqual(res.success, true)
    assert.ok(res.tartalom?.includes("felhívjuk szíves figyelmüket"))
    assert.ok(res.tartalom?.includes("8 munkanapon belül"))
    assert.ok(res.tartalom?.includes("Hiányzik az aláírt szerződés 2. számú melléklete"))
  })

  await t.test("TEST 5: Tájékoztató / Tömör stílusú levélgenerálás", async () => {
    const res = await generateAiReplyAction({
      ugyiratId: "test-ugyirat-123",
      style: "tajekoztato",
      userInstructions: "Az ügyintézés folyamatban van, várható befejezés jövő hét kedd.",
      incomingTargy: "Státusz lekérdezés",
      iktatoszam: "UGY/2026/00045",
    })

    assert.strictEqual(res.success, true)
    assert.ok(res.tartalom?.includes("Tisztelt Címzett!"))
    assert.ok(res.tartalom?.includes("UGY/2026/00045"))
    assert.ok(res.tartalom?.includes("Az ügyintézés folyamatban van"))
  })
})
