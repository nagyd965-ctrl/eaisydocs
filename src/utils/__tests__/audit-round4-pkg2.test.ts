import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

test("4. koros audit — 2. CSOMAG (6-10. pont) verifikacios tesztek", async (t) => {
  await t.test("6. pont (J-192): getImportableEaisyBillInvoices requireDocsAuthServer szerepkor-ellenorzes", () => {
    const file = fs.readFileSync(
      path.join(root, "src/app/inbox/eaisybill-actions.ts"),
      "utf8"
    )
    const fnSection = file.slice(
      file.indexOf("export async function getImportableEaisyBillInvoices"),
      file.indexOf("export async function importInvoiceFromEaisyBill")
    )
    assert.ok(
      fnSection.includes("requireDocsAuthServer") &&
        fnSection.includes('"admin"') &&
        fnSection.includes('"iktato"'),
      "A getImportableEaisyBillInvoices fuggvenyben szerepelnie kell a requireDocsAuthServer(['admin', 'rendszergazda', 'iktato'], activeCompanyId) ellenorzesnek"
    )
  })

  await t.test("7. pont (J-29): grantDossierExplicitAccess, borrowDocument es proposeDisposal ceg- es modul-szurese", () => {
    const accessFile = fs.readFileSync(
      path.join(root, "src/app/dossiers/[id]/access-actions.ts"),
      "utf8"
    )
    const grantSection = accessFile.slice(
      accessFile.indexOf("export async function grantDossierExplicitAccess"),
      accessFile.indexOf("export async function revokeDossierExplicitAccess")
    )
    assert.ok(
      grantSection.includes('from("company_members")') &&
        grantSection.includes("elerheto_modulok"),
      "A grantDossierExplicitAccess fuggvenynek ellenoriznie kell a cel-felhasznalo company_members tagsagat es a docs modul-hozzafereset"
    )

    const borrowFile = fs.readFileSync(
      path.join(root, "src/app/dossiers/borrow-actions.ts"),
      "utf8"
    )
    const borrowSection = borrowFile.slice(
      borrowFile.indexOf("export async function borrowDocument"),
      borrowFile.indexOf("export async function returnDocument")
    )
    assert.ok(
      borrowSection.includes('from("company_members")') &&
        borrowSection.includes("elerheto_modulok"),
      "A borrowDocument fuggvenynek ellenoriznie kell a kolcsonzo felhasznalo company_members tagsagat es a docs modul-hozzafereset"
    )

    const disposalFile = fs.readFileSync(
      path.join(root, "src/app/archive/disposal-actions.ts"),
      "utf8"
    )
    const proposeSection = disposalFile.slice(
      disposalFile.indexOf("export async function proposeDisposal"),
      disposalFile.indexOf("export async function approveDisposal")
    )
    assert.ok(
      proposeSection.includes('from("company_members")'),
      "A proposeDisposal vezetoi ertesitesenek szurnie kell az aktiv ceg company_members tagjaira"
    )
  })

  await t.test("8. pont (J-32): Irattar, Ugyirat-adatlap es Dashboard lekerdezesek szukitese", () => {
    const archivePage = fs.readFileSync(
      path.join(root, "src/app/archive/page.tsx"),
      "utf8"
    )
    assert.ok(
      archivePage.includes('.in("id", batchUserIds)'),
      "Az archive/page.tsx-nek csak a selejtezesi csomagokban szereplo felhasznalok neveit szabad lekernie (.in('id', batchUserIds))"
    )

    const dossierPage = fs.readFileSync(
      path.join(root, "src/app/dossiers/[id]/page.tsx"),
      "utf8"
    )
    const deniedSection = dossierPage.slice(
      dossierPage.indexOf("if (!dossier)"),
      dossierPage.indexOf("Hozzáférés Megtagadva: Bizalmas Ügyirat") + 100
    )
    assert.ok(
      deniedSection.includes("company_id") && deniedSection.includes("dossierCompanyId"),
      "A dossiers/[id]/page.tsx Bizalmas Ugyirat kepernyojen ellenorizni kell, hogy az ugyirat az aktiv ceghez tartozik-e"
    )

    const dashboardPage = fs.readFileSync(
      path.join(root, "src/app/(dashboard)/page.tsx"),
      "utf8"
    )
    const limitMatches = dashboardPage.match(/\.limit\(2000\)/g) || []
    assert.ok(
      limitMatches.length >= 3,
      "A (dashboard)/page.tsx irat, ugyirat es feladat lekerdezesein szerepelnie kell a .limit(2000) korlatnak"
    )
  })

  await t.test("9. pont (J-34): markNotesRead, savePartnerCentralEmail, assignDossier, dismissInboxItem (deleteOutgoingDocument változatlan)", () => {
    const dossierActions = fs.readFileSync(
      path.join(root, "src/app/dossiers/[id]/actions.ts"),
      "utf8"
    )

    // 9.1 deleteOutgoingDocument marad a felhasznaloi dontes szerint (alszam vedett)
    const deleteSection = dossierActions.slice(
      dossierActions.indexOf("export async function deleteOutgoingDocument")
    )
    assert.ok(
      deleteSection.includes('if (irat.alszam || irat.kezbesites_statusz === "expedialva")'),
      "A deleteOutgoingDocument tovabbra is vedi az alszammal rendelkezo kimeno iratokat"
    )

    // 9.2 markNotesRead ellenorzi az ugyirat lathatosagat
    const markNotesSection = dossierActions.slice(
      dossierActions.indexOf("export async function markNotesRead"),
      dossierActions.indexOf("export async function updateDossierStatus")
    )
    assert.ok(
      markNotesSection.includes('from("ugyirat")'),
      "A markNotesRead fuggvenynek ellenoriznie kell, hogy a felhasznalo lathatja-e az ugyiratot"
    )

    // 9.3 savePartnerCentralEmail megkoveteli az activeCompanyId megletet
    const saveEmailSection = dossierActions.slice(
      dossierActions.indexOf("export async function savePartnerCentralEmail"),
      dossierActions.indexOf("export async function deleteOutgoingDocument")
    )
    assert.ok(
      saveEmailSection.includes("if (!auth.activeCompanyId)") &&
        saveEmailSection.includes("company_id: auth.activeCompanyId"),
      "A savePartnerCentralEmail fuggvenynek meg kell kovetelnie az activeCompanyId-t es naploznia kell a company_id-t"
    )

    // 9.4 assignDossier ellenorzi a felelos_user_id cegtagsagat es docs moduljat
    const assignFile = fs.readFileSync(
      path.join(root, "src/app/dossiers/dossier-actions.ts"),
      "utf8"
    )
    const assignSection = assignFile.slice(
      assignFile.indexOf("export async function assignDossier"),
      assignFile.indexOf("export async function updateDossierMetadata")
    )
    assert.ok(
      assignSection.includes('from("company_members")') &&
        assignSection.includes("elerheto_modulok"),
      "Az assignDossier fuggvenynek ellenoriznie kell a felelos_user_id cegtagsagat es docs modul-hozzafereset"
    )

    // 9.5 dismissInboxItem megorzi a korabbi leiras erteket es naplozza a company_id-t
    const dismissFile = fs.readFileSync(
      path.join(root, "src/app/inbox/inbox-dismiss-actions.ts"),
      "utf8"
    )
    const dismissSection = dismissFile.slice(
      dismissFile.indexOf("export async function dismissInboxItem"),
      dismissFile.indexOf("export async function restoreInboxItem")
    )
    assert.ok(
      dismissSection.includes("irat.leiras") &&
        dismissSection.includes("company_id:"),
      "A dismissInboxItem fuggvenynek meg kell oriznie a korabbi leirast es naploznia kell a company_id-t"
    )
  })

  await t.test("10. pont (J-31): requireDocsAuthServer / ceg-szintu jogosultsag-ellenorzes 5 fajlban", () => {
    const batchFile = fs.readFileSync(
      path.join(root, "src/app/inbox/batch-actions.ts"),
      "utf8"
    )
    assert.ok(
      batchFile.includes("requireDocsAuthServer"),
      "A batch-actions.ts-nek a requireDocsAuthServer ellenorzest kell hasznalnia"
    )

    const dismissFile = fs.readFileSync(
      path.join(root, "src/app/inbox/inbox-dismiss-actions.ts"),
      "utf8"
    )
    const authMatches = dismissFile.match(/requireDocsAuthServer/g) || []
    assert.ok(
      authMatches.length >= 2,
      "Az inbox-dismiss-actions.ts mindket fuggvenyenek (dismissInboxItem, restoreInboxItem) a requireDocsAuthServer-t kell hasznalnia"
    )

    const auditFile = fs.readFileSync(
      path.join(root, "src/app/audit/actions.ts"),
      "utf8"
    )
    const centralAuditSection = auditFile.slice(
      auditFile.indexOf("export async function getDocsCentralAuditLogs"),
      auditFile.indexOf("export async function getNotificationAuditLogs")
    )
    const notifAuditSection = auditFile.slice(
      auditFile.indexOf("export async function getNotificationAuditLogs")
    )
    assert.ok(
      centralAuditSection.includes("requireDocsAuthServer") &&
        notifAuditSection.includes("requireDocsAuthServer"),
      "Az audit/actions.ts mindket naplo-lekerdezo fuggvenyenek a requireDocsAuthServer-t kell hasznalnia"
    )

    const embedFile = fs.readFileSync(
      path.join(root, "src/app/embed/partner-dossiers/page.tsx"),
      "utf8"
    )
    assert.ok(
      embedFile.includes("requireDocsAuthServer") &&
        embedFile.includes('.eq("company_id"'),
      "Az embed/partner-dossiers/page.tsx oldalnak ellenoriznie kell a Docs jogosultsagot es a partner company_id-jat"
    )

    const viewerFile = fs.readFileSync(
      path.join(root, "src/app/dossiers/[id]/viewer-actions.ts"),
      "utf8"
    )
    assert.ok(
      viewerFile.includes("if (!irat)") &&
        viewerFile.includes("getActiveCompanyMemberRolesServer"),
      "A viewer-actions.ts-nek ellenoriznie kell az irat letezeset (if (!irat)) es a ceg-szintu szerepkort"
    )
  })
})
