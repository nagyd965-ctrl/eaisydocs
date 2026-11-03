import { describe, it } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

describe("4. koros audit — 4. CSOMAG (16-20. pont, 18. kihagyva, 16. forgatas nelkul) verifikacios tesztek", () => {
  it("16. pont (J-35, forgatas nelkul): pdf/convert lastIndexOf('.') es ai-worker-service isSafeExternalUrl vedelem", () => {
    const convertRoutePath = path.join(process.cwd(), "src/app/api/pdf/convert/route.ts")
    const convertSrc = fs.readFileSync(convertRoutePath, "utf8")

    assert.ok(
      convertSrc.includes('lastIndexOf(".")') || convertSrc.includes("lastIndexOf('.')"),
      "Az api/pdf/convert/route.ts fajlnak lastIndexOf('.') alapjan kell kepeznie a _pdfa.pdf utvonalat"
    )
    assert.ok(
      !convertSrc.includes("fajl.storage_path.replace(`.${ext}`, `_pdfa.pdf`)"),
      "Az api/pdf/convert/route.ts nem hasznalhatja a hibas .replace(`.${ext}`, '_pdfa.pdf') mintat"
    )

    const workerPath = path.join(process.cwd(), "src/utils/ai-worker-service.ts")
    const workerSrc = fs.readFileSync(workerPath, "utf8")
    assert.ok(
      workerSrc.includes("isSafeExternalUrl") &&
        workerSrc.includes('parsed.protocol === "https:"') &&
        workerSrc.includes("169.254.169.254"),
      "Az ai-worker-service.ts fajlnak kulso_fajl_url letoltese elott SSRF (isSafeExternalUrl) ellenorzest kell vegeznie"
    )
  })

  it("17. pont (J-6): executeAiMetadataExtraction es applyFilingRulesToSuggestions jogosultsag-vedelme", () => {
    const filingPath = path.join(process.cwd(), "src/app/inbox/filing-actions.ts")
    const src = fs.readFileSync(filingPath, "utf8")

    const execStart = src.indexOf("export async function executeAiMetadataExtraction")
    assert.ok(execStart !== -1, "executeAiMetadataExtraction megtalalhato")
    const execBlock = src.slice(execStart, execStart + 1400)
    assert.ok(
      execBlock.includes("if (!isInternalClient)") &&
        execBlock.includes("requireDocsAuthServer"),
      "Az executeAiMetadataExtraction fugvenynek !isInternalClient eseten requireDocsAuthServer ellenorzest kell futtatnia"
    )

    const rulesStart = src.indexOf("export async function applyFilingRulesToSuggestions")
    assert.ok(rulesStart !== -1, "applyFilingRulesToSuggestions megtalalhato")
    const rulesBlock = src.slice(rulesStart, rulesStart + 1400)
    assert.ok(
      rulesBlock.includes("requireDocsAuthServer"),
      "Az applyFilingRulesToSuggestions fugvenynek vedettnek kell lennie jogosulatlan kozvetlen hivas ellen"
    )
  })

  it("19. pont (J-36 / J-30): arva Storage fajlok / arva ugy visszagorgetese es lifecycle-export UTF-8 font + auth", () => {
    // 1. version-actions.ts
    const versionPath = path.join(process.cwd(), "src/app/dossiers/[id]/version-actions.ts")
    const versionSrc = fs.readFileSync(versionPath, "utf8")
    assert.ok(
      versionSrc.includes('.from("irat_files").remove([fileName])'),
      "A version-actions.ts-nek insertError eseten torolnie kell a mar feltoltott Storage fajlt"
    )

    // 2. filing-actions.ts (arva ugy torlese ugyirat hiba eseten)
    const filingPath = path.join(process.cwd(), "src/app/inbox/filing-actions.ts")
    const filingSrc = fs.readFileSync(filingPath, "utf8")
    const createCaseStart = filingSrc.indexOf('.from("ugy")')
    const createCaseBlock = filingSrc.slice(createCaseStart, createCaseStart + 2000)
    assert.ok(
      createCaseBlock.includes('.from("ugy").delete().eq("id", ugyData.id)'),
      "A filing-actions.ts-nek ugyirat letrehozasi hiba eseten vissza kell gorgetnie (torolnie) az arva ugy rekordot"
    )

    // 3. template-actions.ts
    const templatePath = path.join(process.cwd(), "src/app/dossiers/[id]/template-actions.ts")
    const templateSrc = fs.readFileSync(templatePath, "utf8")
    const uploadIdx = templateSrc.indexOf("const fileName = `${crypto.randomUUID()}.pdf`")
    const templateUploadBlock = templateSrc.slice(uploadIdx, uploadIdx + 1800)
    assert.ok(
      templateUploadBlock.includes('.from("irat_files").remove([fileName])'),
      "A template-actions.ts-nek adatbazis-hiba eseten torolnie kell a mar feltoltott Storage fajlt"
    )

    // 4. batch-scanner.ts
    const batchScannerPath = path.join(process.cwd(), "src/utils/batch-scanner.ts")
    const batchScannerSrc = fs.readFileSync(batchScannerPath, "utf8")
    assert.ok(
      batchScannerSrc.includes('.from("irat_files").remove([fileName])'),
      "A batch-scanner.ts-nek adatbazis-hiba eseten torolnie kell a mar feltoltott Storage fajlt"
    )

    // 5. lifecycle-export.ts
    const lifecyclePath = path.join(process.cwd(), "src/app/dossiers/[id]/lifecycle-export.ts")
    const lifecycleSrc = fs.readFileSync(lifecyclePath, "utf8")
    assert.ok(
      lifecycleSrc.includes("requireDocsAuthServer") &&
        lifecycleSrc.includes("LiberationSans-Regular.ttf") &&
        lifecycleSrc.includes("registerFontkit"),
      "A lifecycle-export.ts-nek requireDocsAuthServer ellenorzest es LiberationSans UTF-8 betutipust kell hasznalnia"
    )
  })

  it("20. pont (J-23 resz): veletlenszamos erkeztetoszam (Math.random / E/ERR-) fallbackek eltavolitasa", () => {
    const filesToCheck = [
      "src/app/inbox/actions.ts",
      "src/app/inbox/filing-actions.ts",
      "src/app/inbox/eaisybill-actions.ts",
      "src/utils/batch-scanner.ts",
      "src/utils/imap-service.ts",
    ]

    for (const relPath of filesToCheck) {
      const fullPath = path.join(process.cwd(), relPath)
      const src = fs.readFileSync(fullPath, "utf8")
      assert.ok(
        !src.includes("Math.floor(10000 + Math.random() * 90000)"),
        `A(z) ${relPath} nem tartalmazhat Math.random() alapu erkeztetoszam fallbacket`
      )
      assert.ok(
        !src.includes("E/ERR-"),
        `A(z) ${relPath} nem tartalmazhat E/ERR- alapu erkeztetoszam fallbacket`
      )
    }
  })
})
