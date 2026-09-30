# [Közös] P-008: Rendszerbeállítások, Szervezeti Fa, Helyettesítés és Audit UX

**Status:** Decided  
**Date:** 2026-07-28 (Rögzítve: 2026-09-30)  
**Scope:** [Közös]
**Category:** Admin & Settings UX  
**Author:** Dani & ThinkAI  
**Kapcsolódó ADR:** [A-007](../../architecture/decisions/A-007-four-dimensional-rbac-rls-security.md), [A-008](../../architecture/decisions/A-008-append-only-audit-event-log-integrity.md), [A-015](../../architecture/decisions/A-015-totp-two-factor-auth-and-session-timeout-governance.md), [A-019](../../architecture/decisions/A-019-substitution-delegation-permission-engine.md)  
**Kapcsolódó Kód:** `src/app/settings/page.tsx`, `src/app/settings/substitution-actions.ts`, `src/app/settings/admin-actions.ts`

---

## 1. Question / Felhasználói Igény
A rendszergazdáknak és vezetőknek egyetlen központi felületen kell tudniuk kezelni a cég szervezeti hierarchiáját (osztályok, vezetők), a felhasználói fiókokat és szerepköröket, az aktív helyettesítéseket, a 2FA biztonsági beállításokat, valamint az eseménynapló audit megtekintőjét.

---

## 2. Decision (A Meghozott Döntés)
A `/settings` oldalon tabos struktúrájú adminisztrációs felületet valósítottunk meg:

1. **Szervezeti Egységek (Org Tree):**
   - Osztályok létrehozása, szülő-osztály kapcsolatok, osztályvezetők (`department_leader`) kijelölése.
2. **Felhasználók és Jogosultságok:**
   - Felhasználók meghívása, szerepkörök kiosztása (`superadmin`, `iktato`, `ugyintezo`, `vezeto` stb.), inaktiválás.
   - Önfokozás / önlefokozás elleni védelem (`prevent_admin_self_demotion.sql`).
3. **Helyettesítések Kezelése (`SubstitutionDialog`):**
   - Helyettes kiválasztása, időintervallum megadása, aktív és lejárt helyettesítések táblázata.
4. **Biztonság és 2FA:**
   - TOTP kétlépcsős azonosítás bekapcsolása QR-kóddal, session timeout beállítása (15, 30, 60 perc).
5. **Audit Napló Megtekintő:**
   - Eseménynapló szűrése felhasználó, entitástípus, művelet és dátum szerint, exportálási lehetőséggel.

---

## 3. Rationale (Indoklás)
Egységes, áttekinthető kezelőfelület a vállalat adminisztrációs és biztonsági vezérléséhez, megelőzve az illetéktelen beállítás-módosításokat.
