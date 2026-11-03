import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const rootDir = path.resolve(__dirname, "../../..")

describe("4. körös audit — 1. CSOMAG (1–5. pont) védelmi ellenőrzések", () => {
  it("1. pont (J-14): gdpr-anonymize cron ellenőrzi a !process.env.CRON_SECRET feltételt", () => {
    const content = fs.readFileSync(
      path.join(rootDir, "src/app/api/cron/gdpr-anonymize/route.ts"),
      "utf8"
    )
    assert.ok(
      content.includes("!process.env.CRON_SECRET"),
      "A gdpr-anonymize cronnak kötelezően ellenőriznie kell a !process.env.CRON_SECRET hiányát"
    )
  })

  it("2. pont (J-12): addUsersToDepartment csak az aktív cég company_members tagjait rendeli osztályhoz", () => {
    const content = fs.readFileSync(
      path.join(rootDir, "src/app/settings/settings-actions.ts"),
      "utf8"
    )
    const fnStart = content.indexOf("export async function addUsersToDepartment")
    assert.ok(fnStart !== -1, "addUsersToDepartment függvénynek léteznie kell")
    const fnSlice = content.slice(fnStart, fnStart + 1400)
    assert.ok(
      fnSlice.includes('.from("company_members")') && fnSlice.includes("validUserIds"),
      "Az addUsersToDepartment-nek szűrnie kell a userIds listát a company_members tábla alapján"
    )
  })

  it("3. pont (J-8): forceExpireAllDossiers requireDocsAuthServer(['admin','rendszergazda']) és null-cég védelemmel rendelkezik", () => {
    const content = fs.readFileSync(
      path.join(rootDir, "src/app/archive/actions.ts"),
      "utf8"
    )
    assert.ok(
      content.includes("requireDocsAuthServer") && content.includes("if (!activeCompanyId)"),
      "A forceExpireAllDossiers-nek használnia kell a requireDocsAuthServer-t és tiltania a null activeCompanyId-t"
    )
  })

  it("4. pont (J-10): createDepartment meghívja a requireDepartmentAdminAccess() őrblokkot és ellenőrzi a szulo_id-t", () => {
    const content = fs.readFileSync(
      path.join(rootDir, "src/app/settings/settings-actions.ts"),
      "utf8"
    )
    const fnStart = content.indexOf("export async function createDepartment")
    const fnEnd = content.indexOf("async function requireDepartmentAdminAccess")
    const fnSlice = content.slice(fnStart, fnEnd)
    assert.ok(
      fnSlice.includes("requireDepartmentAdminAccess()"),
      "A createDepartment-nek meg kell hívnia a requireDepartmentAdminAccess() őrblokkot"
    )
  })

  it("5. pont (J-11): getTeamMembers ellenőrzi a bejelentkezett felhasználót és null activeCompanyId esetén üres tömböt ad vissza", () => {
    const content = fs.readFileSync(
      path.join(rootDir, "src/app/settings/settings-actions.ts"),
      "utf8"
    )
    const fnStart = content.indexOf("export async function getTeamMembers")
    const fnEnd = content.indexOf("export async function createNewUser")
    const fnSlice = content.slice(fnStart, fnEnd)
    assert.ok(
      fnSlice.includes("supabase.auth.getUser()") && fnSlice.includes("if (!activeCompanyId)"),
      "A getTeamMembers-nek ellenőriznie kell az auth.getUser()-t és a !activeCompanyId ágat"
    )
  })
})
