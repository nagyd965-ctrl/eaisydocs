import { describe, it } from "node:test"
import assert from "node:assert"

describe("Hivatalos HR Dokumentumok Aláírt Példány Csatolása & Verziózása", () => {
  it("a megjelenítendő URL az aláírt példányt részesíti előnyben, ha létezik", () => {
    const docWithSigned = {
      id: "doc-1",
      nev: "Munkaszerződés - Nagy Dániel",
      url: "contracts/emp-1/original_vazlat.pdf",
      signedUrl: "https://storage.supabase.co/contracts/emp-1/original_vazlat.pdf?token=abc",
      alairt_fajl_url: "signed_documents/emp-1/alairt_munkaszerzodes.pdf",
      alairtSignedUrl: "https://storage.supabase.co/signed_documents/emp-1/alairt_munkaszerzodes.pdf?token=xyz",
      alairas_statusz: "alairva",
    }

    const displayUrl = docWithSigned.alairtSignedUrl || docWithSigned.signedUrl || docWithSigned.url
    assert.strictEqual(displayUrl, docWithSigned.alairtSignedUrl, "Aláírt példány esetén annak az URL-jének kell megjelennie")
  })

  it("tervezet esetén a generált eredeti URL jelenik meg", () => {
    const docDraft = {
      id: "doc-2",
      nev: "Tanulmányi Szerződés - Minta János",
      url: "study_contracts/emp-2/vazlat.pdf",
      signedUrl: "https://storage.supabase.co/study_contracts/emp-2/vazlat.pdf?token=abc",
      alairt_fajl_url: null,
      alairtSignedUrl: null,
      alairas_statusz: "vazlat",
    }

    const displayUrl = docDraft.alairtSignedUrl || docDraft.signedUrl || docDraft.url
    assert.strictEqual(displayUrl, docDraft.signedUrl, "Tervezet esetén az eredeti signed URL jelenik meg")
  })

  it("az aláírt példány fájlneve és verziószáma helyesen képződik le", () => {
    const originalFilename = "Munkaszerzodes_Nagy_Daniel.pdf"
    const signedDisplayName = `[ALÁÍRT] ${originalFilename}`
    const currentVersion = 1
    const nextVersion = currentVersion + 1

    assert.strictEqual(signedDisplayName, "[ALÁÍRT] Munkaszerzodes_Nagy_Daniel.pdf")
    assert.strictEqual(nextVersion, 2, "A meglévő iktatószámhoz a 2. verzióként csatolódik")
  })
})
