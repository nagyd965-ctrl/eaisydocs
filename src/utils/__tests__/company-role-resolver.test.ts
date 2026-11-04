import assert from "node:assert"
import test from "node:test"
import {
  resolveUserCompanyRoles,
  validateEmployeeCompanyAccess,
  isUserAuthorizedForHrView,
  isUserAuthorizedForDocsView,
  normalizeDocsRoleAndModules,
  normalizeHrRoleAndModules,
  hasDocsModuleAccess,
  hasDocsWriteAccess,
  hasHrWriteAccess,
  type CompanyMembershipRoleInput,
  type UserProfileRoleInput,
} from "../hr/company-role-resolver"

test("eaisyHR Multi-Tenancy & Scoped Role Resolver Engine", async (t) => {
  // --- TEST 1: Cég-specifikus HR szerepkör felülbírálás ---
  await t.test("TEST 1: Cég-specifikus HR és Docs szerepkör felülbírálás és kanonikus normalizálás", () => {
    const membership: CompanyMembershipRoleInput = {
      companyId: "comp-1111",
      role: "member",
      docs_szerepkor: "iktato",
      hr_szerepkor: "hr_munkatars",
    }
    const profile: UserProfileRoleInput = {
      id: "user-1",
      docs_szerepkor: "ugyintezo",
      hr_szerepkor: "munkavallalo",
    }

    const resolved = resolveUserCompanyRoles(membership, profile)
    assert.strictEqual(resolved.hrRole, "munkavallalo", "A legacy hr_munkatars a kanonikus munkavallalo alapszerepkörre normalizálódik")
    assert.strictEqual(resolved.hrModules.includes("admin"), true, "A legacy hr_munkatars megkapja a HR modulokat")
    assert.strictEqual(resolved.docsRole, "munkavallalo", "A legacy iktato a kanonikus munkavallalo Docs alapszerepkörre normalizálódik")
    assert.deepStrictEqual(resolved.docsModules, ["inbox", "dossiers", "archive", "partners"])
    assert.strictEqual(resolved.isMember, true)
  })

  // --- TEST 2: Fallback globális profilra, ha a tagságban nincs külön beállítva ---
  await t.test("TEST 2: Fallback globális profilra ha nincs explicit cég-szerepkör", () => {
    const membership: CompanyMembershipRoleInput = {
      companyId: "comp-1111",
      role: "member",
      docs_szerepkor: null,
      hr_szerepkor: null,
    }
    const profile: UserProfileRoleInput = {
      id: "user-1",
      docs_szerepkor: "vezeto",
      hr_szerepkor: "hr_vezeto",
    }

    const resolved = resolveUserCompanyRoles(membership, profile)
    assert.strictEqual(resolved.hrRole, "vezeto", "Explicit hiány esetén a globális profil HR szerepköre normalizálva lép érvénybe")
    assert.strictEqual(resolved.hrModules.includes("admin"), true, "A legacy hr_vezeto megkapja az összes HR modult")
    assert.strictEqual(resolved.docsRole, "vezeto", "Explicit hiány esetén a globális profil Docs szerepköre lép érvénybe")
  })

  // --- TEST 3: Cég tulajdonos (owner) vagy cég admin feloldás ---
  await t.test("TEST 3: Cég admin / owner szerepkör helyes kezelése", () => {
    const membership: CompanyMembershipRoleInput = {
      companyId: "comp-1111",
      role: "admin",
      docs_szerepkor: null,
      hr_szerepkor: null,
    }
    const profile: UserProfileRoleInput = {
      id: "user-admin",
      docs_szerepkor: "ugyintezo",
      hr_szerepkor: "munkavallalo",
    }

    const resolved = resolveUserCompanyRoles(membership, profile)
    // Ha a céges role 'admin', de nincs explicit hr_szerepkor, alapértelmezetten admin jogot kap a cégben
    assert.strictEqual(resolved.isCompanyAdmin, true)
    assert.strictEqual(resolved.hrRole, "admin")
  })

  // --- TEST 4: Kettős szerep izoláció (Dual-Role Isolation - GDPR védelem) ---
  await t.test("TEST 4: Kettős szerep izoláció (Cég A: HR Vezető vs Cég B: egyszerű munkavállaló)", () => {
    const profile: UserProfileRoleInput = {
      id: "user-peter",
      docs_szerepkor: "ugyintezo",
      hr_szerepkor: "munkavallalo",
    }

    // Kiss Péter Think AI Kft-nél HR vezető
    const membershipCompanyA: CompanyMembershipRoleInput = {
      companyId: "comp-think-ai",
      role: "member",
      docs_szerepkor: "ugyintezo",
      hr_szerepkor: "hr_vezeto",
    }
    const rolesCompanyA = resolveUserCompanyRoles(membershipCompanyA, profile)
    assert.strictEqual(rolesCompanyA.hrRole, "vezeto")
    assert.strictEqual(isUserAuthorizedForHrView(rolesCompanyA.hrRole, ["hr_vezeto", "admin"], rolesCompanyA.hrModules), true)

    // Kiss Péter Teszt Kft-nél csak egyszerű munkavállaló
    const membershipCompanyB: CompanyMembershipRoleInput = {
      companyId: "comp-teszt-kft",
      role: "member",
      docs_szerepkor: "ugyintezo",
      hr_szerepkor: "munkavallalo",
    }
    const rolesCompanyB = resolveUserCompanyRoles(membershipCompanyB, profile)
    assert.strictEqual(rolesCompanyB.hrRole, "munkavallalo")
    // A Teszt Kft-nél NEM nyithatja meg a HR vezetői nézetet vagy a bérszámfejtést!
    assert.strictEqual(isUserAuthorizedForHrView(rolesCompanyB.hrRole, ["hr_vezeto", "admin"], rolesCompanyB.hrModules), false)
  })

  // --- TEST 5: Nem tag a kiválasztott cégben ---
  await t.test("TEST 5: Nem tag a cégben -> Hozzáférés azonnal megtagadva", () => {
    const profile: UserProfileRoleInput = {
      id: "user-intruder",
      docs_szerepkor: "admin",
      hr_szerepkor: "hr_vezeto",
    }

    const resolved = resolveUserCompanyRoles(null, profile)
    assert.strictEqual(resolved.isMember, false)
    assert.strictEqual(resolved.hrRole, "none")
    assert.strictEqual(resolved.docsRole, "none")
    assert.strictEqual(isUserAuthorizedForHrView(resolved.hrRole, ["hr_vezeto", "munkavallalo"]), false)
  })

  // --- TEST 6: Béradat és Dolgozói Cégizoláció vizsgálat ---
  await t.test("TEST 6: Béradat és dolgozó céghez tartozásának ellenőrzése", () => {
    const activeCompanyId = "comp-think-ai"

    // 1. Saját cég dolgozója -> engedélyezett
    assert.strictEqual(
      validateEmployeeCompanyAccess("comp-think-ai", activeCompanyId),
      true,
      "Az aktív cég dolgozójához való hozzáférés engedélyezett"
    )

    // 2. Más cég dolgozója -> szigorúan tiltott!
    assert.strictEqual(
      validateEmployeeCompanyAccess("comp-teszt-kft", activeCompanyId),
      false,
      "Másik cég dolgozójának adataihoz való hozzáférés azonnal megtagadandó"
    )

    // 3. Hiányzó céges azonosító -> tiltott
    assert.strictEqual(
      validateEmployeeCompanyAccess(null, activeCompanyId),
      false,
      "Cég nélküli vagy ismeretlen dolgozóhoz nincs hozzáférés"
    )
    assert.strictEqual(
      validateEmployeeCompanyAccess("comp-think-ai", null),
      false,
      "Aktív cég kontextus nélkül nincs hozzáférés"
    )
  })

  // --- TEST 7: eaisyDocs 3-szintű alapszerepkör és Vállalati Modul-hozzáférési Mátrix ---
  await t.test("TEST 7: eaisyDocs 3-szintű alapszerepkör és modul-hozzáférési mátrix", () => {
    const normWorker = normalizeDocsRoleAndModules("munkavallalo", ["inbox", "dossiers", "audit"])
    assert.strictEqual(normWorker.role, "munkavallalo")
    assert.deepStrictEqual(normWorker.modules, ["inbox", "dossiers", "audit"])
    assert.strictEqual(hasDocsModuleAccess(normWorker.role, normWorker.modules, "audit"), true)
    assert.strictEqual(hasDocsModuleAccess(normWorker.role, normWorker.modules, "settings"), false)
    assert.strictEqual(isUserAuthorizedForDocsView(normWorker.role, ["auditor"], normWorker.modules), true)
    assert.strictEqual(isUserAuthorizedForDocsView(normWorker.role, ["admin", "rendszergazda"], normWorker.modules), false)

    const normAdmin = normalizeDocsRoleAndModules("admin", [])
    assert.strictEqual(normAdmin.role, "admin")
    assert.strictEqual(hasDocsModuleAccess(normAdmin.role, normAdmin.modules, "settings"), true)
    assert.strictEqual(hasDocsModuleAccess(normAdmin.role, normAdmin.modules, "audit"), true)
    assert.strictEqual(isUserAuthorizedForDocsView(normAdmin.role, ["admin", "rendszergazda"], normAdmin.modules), true)
  })

  // --- TEST 8: Olvasás (Read) vs. Írás (Write) mátrix (Auditor / Betekintő támogatás) ---
  await t.test("TEST 8: Olvasás (Read) vs. Írás (Write) mátrix eaisyDocs és eaisyHR modulokban", () => {
    // 1. Auditor / Betekintő konfiguráció: Olvasás aktív, Írás üres tömb []
    const auditorDocs = normalizeDocsRoleAndModules(
      "munkavallalo",
      ["inbox", "dossiers", "archive", "partners", "audit"],
      []
    )
    assert.deepStrictEqual(auditorDocs.modules, ["inbox", "dossiers", "archive", "partners", "audit"])
    assert.deepStrictEqual(auditorDocs.writeModules, [])
    assert.strictEqual(hasDocsModuleAccess(auditorDocs.role, auditorDocs.modules, "dossiers"), true)
    assert.strictEqual(
      hasDocsWriteAccess(auditorDocs.role, auditorDocs.modules, auditorDocs.writeModules, "dossiers"),
      false,
      "Read-only auditor nem írhat az Iktatókönyvbe"
    )

    // 2. Vegyes jogosultság: Iktatókönyv írható, Irattár csak olvasható
    const mixedDocs = normalizeDocsRoleAndModules(
      "munkavallalo",
      ["dossiers", "archive"],
      ["dossiers", "inbox"] // 'inbox' nincs az olvasási modulokban -> automatikusan kiszűrődik!
    )
    assert.deepStrictEqual(mixedDocs.writeModules, ["dossiers"], "Az írási jog kizárólag az olvasási jog részhalmaza lehet")
    assert.strictEqual(hasDocsWriteAccess(mixedDocs.role, mixedDocs.modules, mixedDocs.writeModules, "dossiers"), true)
    assert.strictEqual(hasDocsWriteAccess(mixedDocs.role, mixedDocs.modules, mixedDocs.writeModules, "archive"), false)

    // 3. eaisyHR Olvasás vs Írás
    const hrReadOnly = normalizeHrRoleAndModules("munkavallalo", ["admin", "reports", "audit"], ["reports"])
    assert.deepStrictEqual(hrReadOnly.modules, ["admin", "reports", "audit"])
    assert.deepStrictEqual(hrReadOnly.writeModules, ["reports"])
    assert.strictEqual(hasHrWriteAccess(hrReadOnly.role, hrReadOnly.modules, hrReadOnly.writeModules, "admin"), false)
    assert.strictEqual(hasHrWriteAccess(hrReadOnly.role, hrReadOnly.modules, hrReadOnly.writeModules, "reports"), true)
  })

  // --- TEST 9: Moduláris függetlenség (HR-only vs Docs-only) és globális HR admin szivárgás elleni védelem ---
  await t.test("TEST 9: Moduláris függetlenség (HR-only vs Docs-only) és globális HR admin szivárgás védelem", () => {
    const hrOnlyOwner = resolveUserCompanyRoles(
      {
        companyId: "comp-1",
        role: "owner",
        hr_szerepkor: "admin",
        docs_szerepkor: "admin",
      },
      {
        id: "user-hr-only",
        hr_szerepkor: "admin",
        docs_szerepkor: "admin",
        elerheto_modulok: ["hr"],
      }
    )
    assert.strictEqual(hrOnlyOwner.docsRole, "none", "HR-only felhasználó nem kaphat Docs szerepkört még ownerként sem")
    assert.deepStrictEqual(hrOnlyOwner.docsModules, [])
    assert.deepStrictEqual(hrOnlyOwner.docsWriteModules, [])
    assert.strictEqual(hrOnlyOwner.hrRole, "admin")

    const docsOnlyOwner = resolveUserCompanyRoles(
      {
        companyId: "comp-1",
        role: "owner",
        hr_szerepkor: "admin",
        docs_szerepkor: "admin",
      },
      {
        id: "user-docs-only",
        hr_szerepkor: "admin",
        docs_szerepkor: "admin",
        elerheto_modulok: ["docs"],
      }
    )
    assert.strictEqual(docsOnlyOwner.hrRole, "none", "Docs-only felhasználó nem kaphat HR szerepkört még ownerként sem")
    assert.deepStrictEqual(docsOnlyOwner.hrModules, [])
    assert.deepStrictEqual(docsOnlyOwner.hrWriteModules, [])
    assert.strictEqual(docsOnlyOwner.docsRole, "admin")

    const globalHrAdminInSecondCompany = resolveUserCompanyRoles(
      {
        companyId: "comp-2",
        role: "member",
        hr_szerepkor: null,
        docs_szerepkor: "munkavallalo",
      },
      {
        id: "user-global-hr-admin",
        hr_szerepkor: "admin",
        docs_szerepkor: "munkavallalo",
        elerheto_modulok: ["docs", "hr"],
      }
    )
    assert.strictEqual(
      globalHrAdminInSecondCompany.hrRole,
      "munkavallalo",
      "Globális hr_szerepkor='admin' nem szivároghat át olyan cégbe, ahol csak sima member (hr_szerepkor=null)"
    )
  })
})
