---
name: eaisydocs-doc-sync
description: Synchronize eaisyDocs and eaisyHR documentation (ADR, PRD, BRD, Database, Changelog) with code changes. Use when completing features, before commit/push, or when asked to "frissítsd a doksit", "docs sync", "dokumentáld le a mai fejlesztést", "dokumentáljuk", "session dokumentáció", "push előtt", "kész a fejlesztés". Triggers on eaisyDocs and eaisyHR tasks.
---

# eaisyDocs & eaisyHR Doc Sync — Automatikus Dokumentáció Szinkronizáció

Ez a skill biztosítja, hogy kódmódosítások után az érintett rendszerdokumentáció (ADR, PRD, BRD, Adatbázis sémák, Changelog) **azonnal és automatikusan frissüljön**.
A cél: a dokumentáció **SOHA** ne legyen elavult a kódbázishoz képest.

---

## ⚡ Mikor futtasd?
- **Feature vagy hibajavítás végén** (a fejlesztési task csak dokumentálva tekinthető késznek).
- **Commit / push előtt.**
- Ha a felhasználó kéri:
  - *"dokumentáld le a mai fejlesztést"*
  - *"docs sync"*
  - *"frissítsd a doksit"*
  - *"session dokumentáció"*
  - *"írj róla ADR-t / PRD-t"*

---

## 📋 A Szinkronizációs Munkafolyamat (Workflow)

### 1. Lépés: Módosított fájlok lekérdezése
Futtasd le a git parancsokat a sessionben történt módosítások azonosítására:
```powershell
git status -s
git diff --name-only HEAD~1
git diff --name-only
```

### 2. Lépés: Fájl → Dokumentáció Leképezés (Mapping)

| Módosított fájl minta | Érintett dokumentáció | Szükséges akció |
|---|---|---|
| `src/app/**/page.tsx` | `docs/product/information-architecture.md` | Útvonal / menü ellenőrzés |
| `src/components/*` (új UI / átalakítás) | `docs/product/decisions/P-XXX-*.md` | Új PRD vagy meglévő frissítése |
| `src/app/archive/*` | `docs/architecture/decisions/` & `docs/product/` | Selejtezési ADR / PRD |
| `src/app/inbox/*` | `docs/architecture/decisions/` & `docs/product/` | Érkeztetési / Iktatási ADR / PRD |
| `src/app/hr/*` | `docs/architecture/database/03-hr-ber.md` | `[HR]` hatókörű ADR / PRD |
| `supabase/migrations/*.sql` | `docs/architecture/database/*.md` | Adatbázis sémadoksi + ADR |
| `*.ts` (worker, action architektúra) | `docs/architecture/decisions/A-XXX-*.md` | Technikai ADR |

---

### 3. Lépés: Döntési Szűrő és Sorszámozás

1. **ADR szükséges?**
   - Ha a döntés nehezen visszafordítható, nem nyilvánvaló kontextus nélkül, vagy valódi kompromisszumot hordoz:
     - Olvasd be a `docs/architecture/decisions/index.md` fájlt.
     - Vedd a következő sorszámot (pl. `A-006`).
     - Hozd létre a `docs/architecture/decisions/A-XXX-<kebab-case-cim>.md` fájlt a sablon szerint.
     - Jelöld a hatókört: `[Docs]`, `[HR]` vagy `[Közös]`.
     - Jegyezd be a rekordot az `index.md`-be!

2. **PRD szükséges?**
   - Ha új UI felület, átalakított képernyő, új dialógus vagy workflow született:
     - Olvasd be a `docs/product/decisions/index.md` fájlt.
     - Vedd a következő sorszámot (pl. `P-004`).
     - Hozd létre a `docs/product/decisions/P-XXX-<kebab-case-cim>.md` fájlt.
     - Frissítsd a `docs/product/information-architecture.md` fájlt, ha új útvonal készült.
     - Jegyezd be a rekordot a PRD `index.md`-be!

3. **Adatbázis séma frissítés szükséges?**
   - Ha tábla vagy oszlop módosult, frissítsd a megfelelő `docs/architecture/database/*.md` fájlt.

4. **Changelog rögzítés:**
   - Nyisd meg a `docs/worklog/changelog.md` fájlt.
   - Írd be a legfrissebb fejlesztéseket a megfelelő kategória alá, linkelve az újonnan létrehozott ADR / PRD dokumentumokat!

---

## 📝 Sablonok

### ADR Sablon
```markdown
# A-XXX: [Döntés Megnevezése]

**Status:** Decided  
**Date:** [YYYY-MM-DD]  
**Scope:** [Docs / HR / Közös]  
**Author:** [Név / Agent]  
**Kapcsolódó PRD:** [P-XXX link]  
**Kapcsolódó Kód:** [fájlok listája]  

---

## 1. Context (Kontextus)
[Mi volt a probléma, hiányosság vagy kockázat?]

## 2. Decision (A Meghozott Döntés)
[Pontos technológiai megoldás, lépések, kódrészlet vagy diagram.]

## 3. Consequences (Következmények)
**Pozitív:** ...  
**Kockázat / Kompromisszum:** ...  
```

### PRD Sablon
```markdown
# P-XXX: [Képernyő / Feature Neve] UX

**Status:** Decided  
**Date:** [YYYY-MM-DD]  
**Scope:** [Docs / HR / Közös]  
**Category:** [Dashboard / Inbox / Archive / HR stb.]  
**Author:** [Név / Agent]  
**Kapcsolódó ADR:** [A-XXX link]  
**Kapcsolódó Kód:** [fájlok listája]  

---

## 1. Question / Problémafelvetés
[Milyen felhasználói igény vagy felületi kihívás merült fel?]

## 2. Decision (A Meghozott Döntés)
[A felület pontos elrendezése, viselkedése, állapotai és visszajelzései.]

## 3. Rationale (Indoklás)
[Miért így a legkényelmesebb és leggyorsabb a felhasználó számára?]
```
