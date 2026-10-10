import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { formatAuditLogEvent } from "../audit-log-formatter"

describe("eaisyDocs Audit Log Formatter Unit Tests", () => {
  test("TEST 1: Ügyirat iktatva esemény formázása", () => {
    const log = {
      id: "log-1",
      tortent: "2026-10-07T18:20:58Z",
      esemeny_tipus: "iktatva",
      entitas_tipus: "ugyirat",
      uj_ertek: { iktatoszam: "SZERZ/2026/00004" },
    }
    const res = formatAuditLogEvent(log)
    assert.equal(res.title, "Ügyirat iktatva")
    assert.equal(res.description, "Iktatószám kiosztva: SZERZ/2026/00004")
    assert.equal(res.icon, "folder-plus")
    assert.equal(res.color, "text-primary")
  })

  test("TEST 2: Új feladat kiírása nem általános 'Ügyirat módosítva', hanem 'Új feladat kiírva'", () => {
    const log = {
      id: "log-2",
      tortent: "2026-10-08T03:13:11Z",
      esemeny_tipus: "modositva",
      entitas_tipus: "ugyirat",
      indoklas: "Új feladat kiírva: teszt (Prioritás: normal, Kategória: egyéb)",
    }
    const res = formatAuditLogEvent(log)
    assert.equal(res.title, "Új feladat kiírva")
    assert.equal(res.description, "teszt (Prioritás: normal, Kategória: egyéb)")
    assert.equal(res.icon, "list-todo")
    assert.equal(res.color, "text-amber-500")
  })

  test("TEST 3: Feladat törlése", () => {
    const log = {
      id: "log-3",
      tortent: "2026-10-08T03:13:26Z",
      esemeny_tipus: "modositva",
      entitas_tipus: "ugyirat",
      indoklas: "Feladat törölve: teszt",
    }
    const res = formatAuditLogEvent(log)
    assert.equal(res.title, "Feladat törölve")
    assert.equal(res.description, "teszt")
    assert.equal(res.icon, "trash-2")
  })

  test("TEST 4: Kimenő piszkozat vázlat törlése az ügyiratból", () => {
    const log = {
      id: "log-4",
      tortent: "2026-10-08T03:23:29Z",
      esemeny_tipus: "modositva",
      entitas_tipus: "ugyirat",
      indoklas: 'Még ki nem küldött kimenő irat vázlat törölve az ügyiratból: "Titoktartási Megállapodás (NDA)" (1. alszám)',
    }
    const res = formatAuditLogEvent(log)
    assert.equal(res.title, "Kimenő piszkozat törölve")
    assert.equal(res.description, '"Titoktartási Megállapodás (NDA)" (1. alszám)')
    assert.equal(res.icon, "trash-2")
  })

  test("TEST 5: Megjegyzés hozzáadása - korreláció meglévő megjegyzéssel (szöveg megjelenítése)", () => {
    const log = {
      id: "log-5",
      tortent: "2026-10-08T03:54:58Z",
      esemeny_tipus: "modositva",
      entitas_tipus: "ugyirat",
      user_id: "user-1",
      indoklas: "Megjegyzés hozzáadva",
    }
    const comments = [
      {
        id: "c-1",
        szoveg: "A partner jelezte a fizetési szándékát.",
        created_at: "2026-10-08T03:54:58Z",
        user_id: "user-1",
      },
    ]
    const res = formatAuditLogEvent(log, { comments })
    assert.equal(res.title, "Belső megjegyzés rögzítve")
    assert.equal(res.description, "„A partner jelezte a fizetési szándékát.”")
    assert.equal(res.icon, "message-square")
    assert.equal(res.color, "text-info")
  })

  test("TEST 6: Kimenő válaszlevél generálása és PDF csatolása", () => {
    const log = {
      id: "log-6",
      tortent: "2026-10-10T21:57:10Z",
      esemeny_tipus: "modositva",
      entitas_tipus: "ugyirat",
      indoklas: "Kimenő válaszlevél generálva (custom) és PDF csatolva (teszt.pdf): Válasz: Megkeresésükre az 5000 Ft kifizetésével kapcsolatban — Hiv: SZERZ/2026/00004",
    }
    const res = formatAuditLogEvent(log)
    assert.equal(res.title, "Kimenő válaszlevél előállítva")
    assert.equal(res.icon, "file-text")
    assert.equal(res.color, "text-primary")
  })

  test("TEST 7: Válaszlevél kiküldése e-mailben", () => {
    const log = {
      id: "log-7",
      tortent: "2026-10-10T21:57:11Z",
      esemeny_tipus: "modositva",
      entitas_tipus: "ugyirat",
      indoklas: "Válaszlevél elküldve e-mailben a partnernek (nagy098@gmail.com). Csatolt irat: kimenő_v_lasz__megkeres_s_kre_az_5000_2026_10_10.pdf, teszt.pdf",
    }
    const res = formatAuditLogEvent(log)
    assert.equal(res.title, "Válaszlevél kiküldve (E-mail)")
    assert.equal(res.icon, "mail")
    assert.equal(res.color, "text-primary")
  })

  test("TEST 8: Trigger vagy automatikus metaadat frissítés üres indoklással", () => {
    const log = {
      id: "log-8",
      tortent: "2026-10-08T15:23:31Z",
      esemeny_tipus: "modositva",
      entitas_tipus: "ugyirat",
      elozo_ertek: { statusz: "iktatva" },
      uj_ertek: { statusz: "ugyintezes_alatt" },
    }
    const res = formatAuditLogEvent(log)
    assert.equal(res.title, "Státusz frissítve")
    assert.equal(res.description, "Állapot változás: iktatva ➔ ugyintezes_alatt")
  })

  test("TEST 9: Explicit jogosultság megadása és visszavonása", () => {
    const logGrant = {
      id: "log-9a",
      tortent: "2026-10-09T10:00:00Z",
      esemeny_tipus: "hozzaferes_modositas",
      indoklas: "Explicit hozzáférés engedélyezve (Kovács János): Vezetői ellenőrzés",
    }
    const resGrant = formatAuditLogEvent(logGrant)
    assert.equal(resGrant.title, "Hozzáférés engedélyezve")
    assert.equal(resGrant.icon, "shield")

    const logRevoke = {
      id: "log-9b",
      tortent: "2026-10-09T11:00:00Z",
      esemeny_tipus: "hozzaferes_modositas",
      indoklas: "Explicit hozzáférés visszavonva (Kovács János)",
    }
    const resRevoke = formatAuditLogEvent(logRevoke)
    assert.equal(resRevoke.title, "Hozzáférés visszavonva")
    assert.equal(resRevoke.icon, "shield")
  })
})
