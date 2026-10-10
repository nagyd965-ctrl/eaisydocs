import assert from "node:assert"
import test from "node:test"
import {
  resolveUserCompanyRoles,
  validateEmployeeCompanyAccess,
  isUserAuthorizedForHrView,
  type CompanyMembershipRoleInput,
  type UserProfileRoleInput,
} from "../hr/company-role-resolver"

test("eaisyHR Multi-Tenancy & Scoped Role Resolver Engine", async (t) => {
  // --- TEST 1: Cég-specifikus HR szerepkör felülbírálás ---
  await t.test("TEST 1: Cég-specifikus HR szerepkör felülbírálás a tagságból", () => {
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
    assert.strictEqual(resolved.hrRole, "hr_munkatars", "A tagságban lévő hr_szerepkor felül kell bírálja a globális profilt")
    assert.strictEqual(resolved.docsRole, "iktato", "A tagságban lévő docs_szerepkor felül kell bírálja a globális profilt")
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
    assert.strictEqual(resolved.hrRole, "hr_vezeto", "Explicit hiány esetén a globális profil HR szerepköre lép érvénybe")
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
    assert.strictEqual(rolesCompanyA.hrRole, "hr_vezeto")
    assert.strictEqual(isUserAuthorizedForHrView(rolesCompanyA.hrRole, ["hr_vezeto", "admin"]), true)

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
    assert.strictEqual(isUserAuthorizedForHrView(rolesCompanyB.hrRole, ["hr_vezeto", "admin"]), false)
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
})
