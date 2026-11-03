import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

test("4. koros audit — 3. CSOMAG (11-15. pont) + TEENDO 1-2 verifikacios tesztek", async (t) => {
  await t.test("TEENDO 1: J-27a / J-28 dokumentacio pontossaga (log_audit_event es append-only historikus sorok)", () => {
    const changelog = fs.readFileSync(
      path.join(root, "docs/worklog/changelog.md"),
      "utf8"
    )
    const adrIndex = fs.readFileSync(
      path.join(root, "docs/architecture/decisions/index.md"),
      "utf8"
    )
    assert.ok(
      !changelog.includes("log_hr_entity_changes_to_audit") &&
        !adrIndex.includes("log_hr_entity_changes_to_audit"),
      "A dokumentacioban nem szerepelhet a nem letezo log_hr_entity_changes_to_audit fuggvenynev"
    )
    assert.ok(
      changelog.includes("public.log_audit_event()") &&
        changelog.includes("append-only"),
      "A changelog pontosan irja le a public.log_audit_event() triggert es az append-only historikus sorok app-szintu szureset"
    )
  })

  await t.test("11. pont (J-33 + Megjegyzes 3): minosites whitelist, .or() sanitizalas (% bemenet teszttel) es koteg-PDF korlat", () => {
    const batchActions = fs.readFileSync(
      path.join(root, "src/app/inbox/batch-actions.ts"),
      "utf8"
    )
    const inboxActions = fs.readFileSync(
      path.join(root, "src/app/inbox/actions.ts"),
      "utf8"
    )
    const batchScanner = fs.readFileSync(
      path.join(root, "src/utils/batch-scanner.ts"),
      "utf8"
    )
    const filingActions = fs.readFileSync(
      path.join(root, "src/app/inbox/filing-actions.ts"),
      "utf8"
    )
    const inboxPage = fs.readFileSync(
      path.join(root, "src/app/inbox/page.tsx"),
      "utf8"
    )

    assert.ok(
      batchActions.includes("ALLOWED_MINOSITES") &&
        batchActions.includes("validateUploadedDocument"),
      "A batch-actions.ts-nek tartalmaznia kell a minosites whitelistet es a validateUploadedDocument ellenorzest"
    )
    assert.ok(
      inboxActions.includes("ALLOWED_MINOSITES"),
      "Az inbox/actions.ts-nek tartalmaznia kell a minosites whitelistet"
    )
    assert.ok(
      batchScanner.includes("MAX_BATCH_PAGES") &&
        batchScanner.includes("300"),
      "A batch-scanner.ts-nek tartalmaznia kell a 300 oldalas koteg-PDF korlatot"
    )
    assert.ok(
      filingActions.includes("replace(/[,().%\\\\]/g") &&
        inboxPage.includes("replace(/[,().%\\\\]/g"),
      "A filing-actions.ts es inbox/page.tsx .or() lekerdezeseinek sanitizalniuk kell a [,().%\\] karaktereket"
    )

    // Funkcionalis teszt "%"-jelet es PostgREST operatorokat tartalmazó keresokifejezesre (Megjegyzes 3)
    const sanitizePostgrestOrTerm = (raw: string) =>
      raw.replace(/[,().%\\]/g, " ").replace(/\s+/g, " ").trim()

    assert.strictEqual(
      sanitizePostgrestOrTerm("100% kedvezmény (2026, Q1)"),
      "100 kedvezmény 2026 Q1"
    )
    assert.strictEqual(sanitizePostgrestOrTerm("%%%"), "")
  })

  await t.test("12. pont (J-1): importEaisyBillPartnersAction szerveroldali company_id szures", () => {
    const partnerActions = fs.readFileSync(
      path.join(root, "src/app/partners/eaisybill-partner-actions.ts"),
      "utf8"
    )
    const importSection = partnerActions.slice(
      partnerActions.indexOf("export async function importEaisyBillPartnersAction"),
      partnerActions.indexOf("// 3. Lekérjük a már létező partnereket")
    )
    assert.ok(
      importSection.includes('.eq("company_id", eaisybillCompanyId)') &&
        importSection.includes("requireDocsAuthServer"),
      "Az importEaisyBillPartnersAction fuggvenynek szurnie kell .eq('company_id', eaisybillCompanyId) feltetellel es ellenoriznie kell a Docs jogosultsagot"
    )
  })

  await t.test("13. pont (J-2 + J-191 + Megjegyzes 1): eaisyBill szamla-import szigoru ceg-kotes es teljes adoszam egyezes", () => {
    const billActions = fs.readFileSync(
      path.join(root, "src/app/inbox/eaisybill-actions.ts"),
      "utf8"
    )
    const getInvoicesSection = billActions.slice(
      billActions.indexOf("export async function getImportableEaisyBillInvoices"),
      billActions.indexOf("export async function importInvoiceFromEaisyBill")
    )
    const importInvoiceSection = billActions.slice(
      billActions.indexOf("export async function importInvoiceFromEaisyBill")
    )

    assert.ok(
      !getInvoicesSection.includes('.ilike("name"'),
      "A getImportableEaisyBillInvoices nem hasznalhat laza nev-alapu (.ilike('name', ...)) automatikus ceg-parositast"
    )
    assert.ok(
      getInvoicesSection.includes("cleanTax.length >= 10") &&
        getInvoicesSection.includes("billCleanTax === cleanTax"),
      "Teljes (>=10 jegyu) adoszam eseten kotelezo a teljes adoszam-egyezest megkovetelni"
    )
    assert.ok(
      !importInvoiceSection.includes("verifiedInvoice || invoice") &&
        importInvoiceSection.includes("if (!eaisybillCompanyId)") &&
        importInvoiceSection.includes("if (!verifiedInvoice)"),
      "Az importInvoiceFromEaisyBill nem eshet vissza a kliens altal kuldott invoice objektumra es meg kell kovetelnie az eaisybillCompanyId-t"
    )
  })

  await t.test("14. pont (J-7): deleteUser tobbceges vedelem es esemeny_naplo rogzites", () => {
    const settingsActions = fs.readFileSync(
      path.join(root, "src/app/settings/settings-actions.ts"),
      "utf8"
    )
    const deleteUserSection = settingsActions.slice(
      settingsActions.indexOf("export async function deleteUser"),
      settingsActions.indexOf("export async function toggleNotificationRule")
    )
    assert.ok(
      deleteUserSection.includes("requireDocsAuthServer") &&
        deleteUserSection.includes('from("company_members")') &&
        deleteUserSection.includes("otherMemberships") &&
        deleteUserSection.includes('from("esemeny_naplo")'),
      "A deleteUser fuggvenynek ellenoriznie kell a ceg-admin jogosultsagot, mas cegbeli tagsag eseten csak az aktiv cegbol szabad eltavolitania, es naploznia kell az esemeny_naplo-ba"
    )
  })

  await t.test("15. pont (J-4 + Megjegyzes 2): REST API v1 env-first company_id feloldas, UUID validacio es limit(200)", () => {
    const listRoute = fs.readFileSync(
      path.join(root, "src/app/api/v1/ugyiratok/route.ts"),
      "utf8"
    )
    const lifecycleRoute = fs.readFileSync(
      path.join(root, "src/app/api/v1/ugyiratok/[id]/eletciklus/route.ts"),
      "utf8"
    )

    // Env-first order check: REST_API_V1_COMPANY_ID must come before x-company-id / company_id query param
    const envIdx = listRoute.indexOf("process.env.REST_API_V1_COMPANY_ID")
    const headerIdx = listRoute.indexOf('request.headers.get("x-company-id")')
    assert.ok(
      envIdx !== -1 && headerIdx !== -1 && envIdx < headerIdx,
      "A REST_API_V1_COMPANY_ID kornyezeti valtozonak felul kell irnia a kliens altal kuldott x-company-id / company_id parametert (env-first sorrend)"
    )
    assert.ok(
      listRoute.includes(".limit(200)") &&
        listRoute.includes("uuidRegex.test(partner_id)") &&
        listRoute.includes('.eq("company_id", effectiveCompanyId)'),
      "Az /api/v1/ugyiratok vegpontnak tartalmaznia kell a .limit(200), partner_id UUID validacio es kotelezo .eq('company_id', effectiveCompanyId) szurest"
    )
    assert.ok(
      lifecycleRoute.includes("process.env.REST_API_V1_COMPANY_ID") &&
        lifecycleRoute.includes('.eq("company_id", effectiveCompanyId)'),
      "Az /api/v1/ugyiratok/[id]/eletciklus vegpontnak is kotelezoen ellenoriznie kell az effectiveCompanyId-t (env-first sorrendben)"
    )
  })
})
