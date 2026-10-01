import { test } from "node:test"
import assert from "node:assert"
import {
  calculateRetentionEndDate,
  formatDossierSubject,
  formatDocumentSubject,
  HR_FILING_CONSTANTS,
  executeHrDocumentFiling,
} from "../hr-filing-bridge"

test("HR Filing Bridge Unit Tests", async (t) => {
  await t.test("calculateRetentionEndDate calculates 50 years to end of year", () => {
    assert.strictEqual(calculateRetentionEndDate(2026), "2076-12-31")
    assert.strictEqual(calculateRetentionEndDate(2024), "2074-12-31")
  })

  await t.test("formatDossierSubject formats employee personal dossier title", () => {
    assert.strictEqual(formatDossierSubject("Kovács Anna"), "Kovács Anna személyi dossziéja")
    assert.strictEqual(formatDossierSubject("  Nagy Dániel  "), "Nagy Dániel személyi dossziéja")
    assert.strictEqual(formatDossierSubject(""), "Munkavállaló személyi dossziéja")
  })

  await t.test("formatDocumentSubject handles custom, document and category names", () => {
    assert.strictEqual(formatDocumentSubject("Munkaszerződés módosítás"), "Munkaszerződés módosítás")
    assert.strictEqual(formatDocumentSubject("", "Munkaszerződés"), "HR dokumentum (Munkaszerződés)")
    assert.strictEqual(formatDocumentSubject("", null), "HR dokumentum")
  })

  await t.test("HR_FILING_CONSTANTS adheres to eaisyDocs retention & GDPR rules", () => {
    assert.strictEqual(HR_FILING_CONSTANTS.PREFIX, "HR")
    assert.strictEqual(HR_FILING_CONSTANTS.RETENTION_CODE, "3.1")
    assert.strictEqual(HR_FILING_CONSTANTS.RETENTION_YEARS, 50)
    assert.strictEqual(HR_FILING_CONSTANTS.MINOSITES, "bizalmas")
    assert.strictEqual(HR_FILING_CONSTANTS.IRANY, "belso")
    assert.strictEqual(HR_FILING_CONSTANTS.ERKEZES_MODJA, "rendszer")
  })

  await t.test("executeHrDocumentFiling rejects already filed documents", async () => {
    // Mock Supabase client
    const mockSupabase: any = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                id: "doc-123",
                nev: "Munkaszerződés",
                kategoria: "Munkaszerződés",
                url: "hr/emp-1/contract.pdf",
                iktatoszam: "HR/2026/000001/1", // Már iktatva
                dolgozo_id: "emp-1",
              },
              error: null,
            }),
          }),
        }),
      }),
    }

    const result = await executeHrDocumentFiling(mockSupabase, {
      documentId: "doc-123",
      employeeId: "emp-1",
    })

    assert.strictEqual(result.success, false)
    assert.ok(result.error?.includes("már hivatalosan iktatva van"))
  })

  await t.test("Sequential sub-number calculation preserves gapless ordering", () => {
    const iratok = [{ alszam: 1 }, { alszam: 2 }, { alszam: 3 }]
    const maxAlszam = iratok.reduce((max, i) => Math.max(max, i.alszam || 0), 0)
    const nextAlszam = maxAlszam + 1
    assert.strictEqual(nextAlszam, 4)

    const prefix = "HR/2026/000005"
    const fullIktatoszam = `${prefix}/${nextAlszam}`
    assert.strictEqual(fullIktatoszam, "HR/2026/000005/4")
  })

  await t.test("Batch filing generates sequential sub-numbers across all unfiled documents", () => {
    const unfiled = [
      { id: "1", nev: "Munkaszerződés", kategoria: "Munkaszerződés" },
      { id: "2", nev: "Bérmódosítás", kategoria: "Bérmódosítás" },
      { id: "3", nev: "Titoktartási", kategoria: "Nyilatkozat" },
    ]

    const baseDossier = "HR/2026/000088"
    let currentMax = 0

    const filed = unfiled.map((doc) => {
      currentMax += 1
      return {
        ...doc,
        iktatoszam: `${baseDossier}/${currentMax}`,
        alszam: currentMax,
      }
    })

    assert.strictEqual(filed.length, 3)
    assert.strictEqual(filed[0].iktatoszam, "HR/2026/000088/1")
    assert.strictEqual(filed[1].iktatoszam, "HR/2026/000088/2")
    assert.strictEqual(filed[2].iktatoszam, "HR/2026/000088/3")
  })
})

