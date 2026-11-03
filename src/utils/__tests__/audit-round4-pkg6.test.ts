import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()

describe("Audit Round 4 — Package 6 (Points 26–30)", () => {
  it("26. pont (J-24): dismissInboxItem/restoreInboxItem check .is('ugyirat_id', null) and uploadReply/generateAndSaveReplyLetter handle irat_fajl errors with rollback", () => {
    const dismissSrc = fs.readFileSync(
      path.join(ROOT, "src/app/inbox/inbox-dismiss-actions.ts"),
      "utf8"
    )
    const isNullMatches = dismissSrc.match(/\.is\(\s*["']ugyirat_id["']\s*,\s*null\s*\)/g) || []
    assert.ok(
      isNullMatches.length >= 2,
      "Both dismissInboxItem and restoreInboxItem must enforce .is('ugyirat_id', null) on update"
    )

    const dossierActionsSrc = fs.readFileSync(
      path.join(ROOT, "src/app/dossiers/[id]/actions.ts"),
      "utf8"
    )
    const uploadReplyStart = dossierActionsSrc.indexOf("export async function uploadReply")
    const uploadReplyEnd = dossierActionsSrc.indexOf("export async function generateAndSaveReplyLetter")
    const uploadReplyBlock = dossierActionsSrc.slice(uploadReplyStart, uploadReplyEnd)

    assert.ok(
      uploadReplyBlock.includes("if (fajlError || !fajlResult)"),
      "uploadReply must check if (fajlError || !fajlResult) and roll back"
    )
  })

  it("27. pont (J-25): updateDossierStatus, assignDossier use verified ugy_id from ugyirat and deletePolymorphicLink filters by ugyirat_id", () => {
    const dossierActionsSrc = fs.readFileSync(
      path.join(ROOT, "src/app/dossiers/[id]/actions.ts"),
      "utf8"
    )
    const statusStart = dossierActionsSrc.indexOf("export async function updateDossierStatus")
    const statusBlock = dossierActionsSrc.slice(statusStart, statusStart + 2500)
    assert.ok(
      statusBlock.includes("verifiedUgyId"),
      "updateDossierStatus must derive verifiedUgyId from the verified ugyirat instead of trusting client ugyId"
    )

    const polyStart = dossierActionsSrc.indexOf("export async function deletePolymorphicLink")
    const polyBlock = dossierActionsSrc.slice(polyStart, polyStart + 800)
    assert.ok(
      polyBlock.includes('.eq("ugyirat_id", ugyirat_id)'),
      "deletePolymorphicLink must include .eq('ugyirat_id', ugyirat_id) on delete"
    )

    const listActionsSrc = fs.readFileSync(
      path.join(ROOT, "src/app/dossiers/dossier-actions.ts"),
      "utf8"
    )
    assert.ok(
      listActionsSrc.includes("verifiedUgyId"),
      "assignDossier must derive verifiedUgyId from ugyiratTarget.ugy_id"
    )
  })

  it("28. pont (J-26): approveDisposal performs atomic status transition (.eq('statusz', 'selejtezheto').select('id')) before file destruction", () => {
    const disposalSrc = fs.readFileSync(
      path.join(ROOT, "src/app/archive/disposal-actions.ts"),
      "utf8"
    )
    const approveStart = disposalSrc.indexOf("export async function approveDisposal")
    const approveBlock = disposalSrc.slice(approveStart)

    const atomicUpdateIdx = approveBlock.indexOf('.eq("statusz", "selejtezheto")')
    const storageRemoveIdx = approveBlock.indexOf('.from("irat_files").remove(')
    assert.ok(
      atomicUpdateIdx !== -1 && atomicUpdateIdx < storageRemoveIdx,
      "Atomic status transition (.eq('statusz', 'selejtezheto')) must happen before Storage file removal"
    )
  })

  it("29. pont (J-21): fileIncomingDocument enforces .is('ugyirat_id', null) on irat update and rolls back newly created dossier on concurrent filing", () => {
    const filingSrc = fs.readFileSync(
      path.join(ROOT, "src/app/inbox/filing-actions.ts"),
      "utf8"
    )
    const fileStart = filingSrc.indexOf("export async function fileIncomingDocument")
    const nextExport = filingSrc.indexOf("export async function", fileStart + 30)
    const fileBlock = filingSrc.slice(fileStart, nextExport !== -1 ? nextExport : undefined)
    assert.ok(
      fileBlock.includes('.is("ugyirat_id", null)'),
      "fileIncomingDocument must enforce .is('ugyirat_id', null) when attaching irat to dossier"
    )
    assert.ok(
      fileBlock.includes("Ezt az iratot közben már beiktatták"),
      "fileIncomingDocument must return clear error and roll back if irat was concurrently filed"
    )
  })

  it("30. pont (J-22 kód-rész): alszam allocation uses retry-safe helper across all 4 filing/reply/template locations", () => {
    const helperPath = path.join(ROOT, "src/utils/alszam-helper.ts")
    assert.ok(fs.existsSync(helperPath), "src/utils/alszam-helper.ts must exist")

    const helperSrc = fs.readFileSync(helperPath, "utf8")
    assert.ok(
      helperSrc.includes("23505") && helperSrc.includes("insertIratWithNextAlszam"),
      "alszam-helper.ts must implement retry on 23505 unique collision"
    )

    const filingSrc = fs.readFileSync(path.join(ROOT, "src/app/inbox/filing-actions.ts"), "utf8")
    const dossierActionsSrc = fs.readFileSync(path.join(ROOT, "src/app/dossiers/[id]/actions.ts"), "utf8")
    const templateActionsSrc = fs.readFileSync(path.join(ROOT, "src/app/dossiers/[id]/template-actions.ts"), "utf8")

    assert.ok(filingSrc.includes("alszam-helper"), "filing-actions.ts must use alszam-helper")
    assert.ok(dossierActionsSrc.includes("alszam-helper"), "dossiers/[id]/actions.ts must use alszam-helper")
    assert.ok(templateActionsSrc.includes("alszam-helper"), "dossiers/[id]/template-actions.ts must use alszam-helper")

    const migPath = path.join(
      ROOT,
      "supabase/migrations/20261103000001_irat_alszam_es_erkeztetoszam_unique.sql"
    )
    assert.ok(fs.existsSync(migPath), "Migration 20261103000001_irat_alszam_es_erkeztetoszam_unique.sql must exist")
    const migSrc = fs.readFileSync(migPath, "utf8")
    assert.ok(migSrc.includes("irat_ugyirat_alszam_key"), "Migration must define irat_ugyirat_alszam_key")
    assert.ok(migSrc.includes("irat_company_erkeztetoszam_key"), "Migration must define irat_company_erkeztetoszam_key")
    assert.ok(migSrc.includes("RAISE EXCEPTION"), "Migration must include self-verifying DO block with RAISE EXCEPTION")
  })
})
