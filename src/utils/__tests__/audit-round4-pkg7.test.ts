import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

describe("Audit Round 4 — Package 7 (Points 31–35)", () => {
  const mig2Path = path.join(
    ROOT,
    "supabase/migrations/20261103000002_final_audit_closures.sql"
  )

  it("31. pont (J-27b): get_effective_docs_role checks elerheto_modulok for 'docs' in SQL migration", () => {
    assert.ok(fs.existsSync(mig2Path), "20261103000002_final_audit_closures.sql must exist")
    const migSrc = fs.readFileSync(mig2Path, "utf8")
    assert.ok(
      migSrc.includes("get_effective_docs_role") && migSrc.includes("elerheto_modulok"),
      "get_effective_docs_role must check elerheto_modulok in 20261103000002_final_audit_closures.sql"
    )
  })

  it("32. pont (J-9): setFourEyesSetting uses requireDocsAuthServer with activeCompanyId and rendszer_beallitas RLS checks company-suffixed keys", () => {
    const adminActionsSrc = fs.readFileSync(
      path.join(ROOT, "src/app/settings/admin-actions.ts"),
      "utf8"
    )
    const fnStart = adminActionsSrc.indexOf("export async function setFourEyesSetting")
    const fnBlock = adminActionsSrc.slice(fnStart)
    assert.ok(
      fnBlock.includes("requireDocsAuthServer") && fnBlock.includes("activeCompanyId"),
      "setFourEyesSetting must enforce requireDocsAuthServer(['admin', 'rendszergazda'], activeCompanyId)"
    )

    assert.ok(fs.existsSync(mig2Path), "20261103000002_final_audit_closures.sql must exist")
    const migSrc = fs.readFileSync(mig2Path, "utf8")
    assert.ok(
      migSrc.includes("rendszer_beallitas") && migSrc.includes("substring(kulcs"),
      "rendszer_beallitas RLS policy must enforce company-level admin check on :<company_id> suffixed keys"
    )
  })

  it("33. pont (J-22 DB + J-23 DB): 20261103000001_irat_alszam_es_erkeztetoszam_unique.sql defines both unique constraints and self-check", () => {
    const mig1Path = path.join(
      ROOT,
      "supabase/migrations/20261103000001_irat_alszam_es_erkeztetoszam_unique.sql"
    )
    assert.ok(fs.existsSync(mig1Path), "20261103000001_irat_alszam_es_erkeztetoszam_unique.sql must exist")
    const mig1Src = fs.readFileSync(mig1Path, "utf8")
    assert.ok(
      mig1Src.includes("irat_ugyirat_alszam_key") &&
        mig1Src.includes("irat_company_erkeztetoszam_key"),
      "Migration 20261103000001 must define irat_ugyirat_alszam_key and irat_company_erkeztetoszam_key"
    )
  })

  it("34. pont (J-13): generateCompanyShareTokenAction generates 10-character token and join_company_by_token enforces 7-day TTL", () => {
    const companyActionsSrc = fs.readFileSync(
      path.join(ROOT, "src/app/actions/company-actions.ts"),
      "utf8"
    )
    const genStart = companyActionsSrc.indexOf("export async function generateCompanyShareTokenAction")
    const genBlock = companyActionsSrc.slice(genStart, genStart + 1200)
    assert.ok(
      genBlock.includes("Uint8Array(10)") || genBlock.includes("TOKEN_LENGTH = 10"),
      "generateCompanyShareTokenAction must generate a 10-character token"
    )

    assert.ok(fs.existsSync(mig2Path), "20261103000002_final_audit_closures.sql must exist")
    const migSrc = fs.readFileSync(mig2Path, "utf8")
    assert.ok(
      migSrc.includes("join_company_by_token") && migSrc.includes("7 days"),
      "join_company_by_token RPC must enforce 7-day expiration check"
    )
  })

  it("35. pont (J-37): alkalmazas_ertesites has company_id and modul columns and NotificationBell filters by modul and active company", () => {
    assert.ok(fs.existsSync(mig2Path), "20261103000002_final_audit_closures.sql must exist")
    const migSrc = fs.readFileSync(mig2Path, "utf8")
    assert.ok(
      migSrc.includes("alkalmazas_ertesites") &&
        migSrc.includes("ADD COLUMN IF NOT EXISTS company_id") &&
        migSrc.includes("ADD COLUMN IF NOT EXISTS modul"),
      "Migration must add company_id and modul columns to alkalmazas_ertesites"
    )

    const bellSrc = fs.readFileSync(
      path.join(ROOT, "src/components/notification-bell.tsx"),
      "utf8"
    )
    assert.ok(
      bellSrc.includes('.eq("modul",') && bellSrc.includes("company_id"),
      "NotificationBell must filter notifications by modul and company_id"
    )
  })

  it("Bonus (P1-6 + Search hardening): saved-search-alerts checks company_members & elerheto_modulok and search/actions uses requireDocsAuthServer + sanitizeOrTerm", () => {
    const alertsSrc = fs.readFileSync(
      path.join(ROOT, "src/utils/saved-search-alerts.ts"),
      "utf8"
    )
    assert.ok(
      alertsSrc.includes('.from("company_members")') &&
        alertsSrc.includes("elerheto_modulok") &&
        alertsSrc.includes("resolveUserCompanyRoles"),
      "saved-search-alerts.ts must verify company_members membership, elerheto_modulok, and company-scoped docsRole"
    )

    const searchActionsSrc = fs.readFileSync(
      path.join(ROOT, "src/app/search/actions.ts"),
      "utf8"
    )
    assert.ok(
      searchActionsSrc.includes("requireDocsAuthServer") &&
        searchActionsSrc.includes("sanitizeOrTerm"),
      "search/actions.ts must enforce requireDocsAuthServer and sanitizeOrTerm"
    )
  })
})
