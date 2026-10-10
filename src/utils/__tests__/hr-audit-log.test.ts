import { test, describe } from "node:test"
import assert from "node:assert/strict"

// We test the logic used by AuditLogTab to guarantee robust translations and deduplication
const ENTITY_LABELS: Record<string, string> = {
  "hr_dolgozo_adatlap": "Személyes Adatok",
  "hr_dolgozo_titkos_adat": "Érzékeny Adatok (TAJ, Adó, Bér)",
  "hr_munkaszerzodes": "Munkaszerződés",
  "hr_dokumentum": "Hivatalos HR Irat",
}

const EVENT_LABELS: Record<string, string> = {
  "letrehozas": "Létrehozás",
  "modositas": "Módosítás",
  "adat_modositas": "Módosítás",
  "megtekintes": "Megtekintés (Felfedés)",
  "adat_megtekintes": "Megtekintés (Felfedés)",
  "irat_megtekintes": "Megtekintés",
  "iktatva": "Iktatás",
}

function cleanNote(note?: string) {
  if (!note) return null
  return note
    .replace(/\([0-9a-fA-F-]{36}\)/g, "")
    .replace(/\s\s+/g, " ")
    .trim()
}

function getEventTitle(log: { entitas_tipus: string; esemeny_tipus: string }) {
  if (log.entitas_tipus === "hr_dolgozo_titkos_adat") {
    if (["megtekintes", "adat_megtekintes", "irat_megtekintes"].includes(log.esemeny_tipus)) {
      return "Érzékeny adatok (TAJ, Adó, Bér) feloldása"
    }
    if (["modositas", "adat_modositas", "munkatars_modositas", "munkatars_felvetel"].includes(log.esemeny_tipus)) {
      return "Érzékeny adatok (TAJ, Adó, Bér) módosítása"
    }
  }

  if (log.entitas_tipus === "hr_dokumentum" || log.entitas_tipus === "hr_munkaszerzodes") {
    if (log.esemeny_tipus === "iktatva" || log.esemeny_tipus === "adat_letrehozas") {
      return "Hivatalos dokumentum / Szerződés iktatása"
    }
  }

  const entity = ENTITY_LABELS[log.entitas_tipus] || log.entitas_tipus
  const event = EVENT_LABELS[log.esemeny_tipus] || log.esemeny_tipus?.replace(/_/g, " ")
  return `${entity} - ${event}`
}

function consolidateLogs(rawLogs: any[]) {
  const result: any[] = []
  for (let i = 0; i < rawLogs.length; i++) {
    const current = rawLogs[i]
    const isViewEvent = ["megtekintes", "adat_megtekintes", "irat_megtekintes"].includes(current.esemeny_tipus)

    if (isViewEvent && result.length > 0) {
      const prev = result[result.length - 1]
      const prevIsView = ["megtekintes", "adat_megtekintes", "irat_megtekintes"].includes(prev.esemeny_tipus)

      if (
        prevIsView &&
        prev.entitas_tipus === current.entitas_tipus &&
        prev.felhasznalo_id === current.felhasznalo_id
      ) {
        const timeDiff = Math.abs(new Date(prev.created_at).getTime() - new Date(current.created_at).getTime())
        if (timeDiff <= 60000) {
          prev.repeatCount = (prev.repeatCount || 1) + 1
          continue
        }
      }
    }

    result.push({ ...current, repeatCount: 1 })
  }
  return result
}

describe("eaisyHR Audit Log Engine Unit Tests", () => {
  test("TEST 1: Legacy 'irat_megtekintes' is resolved to 'Érzékeny adatok (TAJ, Adó, Bér) feloldása'", () => {
    const title = getEventTitle({
      entitas_tipus: "hr_dolgozo_titkos_adat",
      esemeny_tipus: "irat_megtekintes"
    })
    assert.equal(title, "Érzékeny adatok (TAJ, Adó, Bér) feloldása")
    assert.ok(!title.includes("irat_megtekintes"))
  })

  test("TEST 2: 'adat_megtekintes' is resolved to 'Érzékeny adatok (TAJ, Adó, Bér) feloldása'", () => {
    const title = getEventTitle({
      entitas_tipus: "hr_dolgozo_titkos_adat",
      esemeny_tipus: "adat_megtekintes"
    })
    assert.equal(title, "Érzékeny adatok (TAJ, Adó, Bér) feloldása")
  })

  test("TEST 3: Secret data edit is resolved to 'Érzékeny adatok (TAJ, Adó, Bér) módosítása'", () => {
    const title = getEventTitle({
      entitas_tipus: "hr_dolgozo_titkos_adat",
      esemeny_tipus: "modositas"
    })
    assert.equal(title, "Érzékeny adatok (TAJ, Adó, Bér) módosítása")
  })

  test("TEST 4: Raw UUID in note is cleaned up cleanly", () => {
    const rawNote = "HR/Admin betekintett a dolgozó (033c707d-5430-44bb-a2b0-30a27b34db45) bizalmas adataiba."
    const cleaned = cleanNote(rawNote)
    assert.equal(cleaned, "HR/Admin betekintett a dolgozó bizalmas adataiba.")
  })

  test("TEST 5: Consecutive view events within 60s from the same user are consolidated", () => {
    const logs = [
      {
        id: "1",
        entitas_tipus: "hr_dolgozo_titkos_adat",
        esemeny_tipus: "irat_megtekintes",
        felhasznalo_id: "user-1",
        created_at: "2026-10-10T01:33:00.000Z"
      },
      {
        id: "2",
        entitas_tipus: "hr_dolgozo_titkos_adat",
        esemeny_tipus: "adat_megtekintes",
        felhasznalo_id: "user-1",
        created_at: "2026-10-10T01:33:05.000Z"
      },
      {
        id: "3",
        entitas_tipus: "hr_dolgozo_adatlap",
        esemeny_tipus: "modositas",
        felhasznalo_id: "user-1",
        created_at: "2026-10-10T01:35:00.000Z"
      }
    ]

    const consolidated = consolidateLogs(logs)
    assert.equal(consolidated.length, 2)
    assert.equal(consolidated[0].repeatCount, 2)
    assert.equal(consolidated[1].esemeny_tipus, "modositas")
  })
})
