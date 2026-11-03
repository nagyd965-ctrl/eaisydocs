# P-137: [Docs] / [Közös]: Központi Eseménynapló (`/audit`) Strukturált Magyar Változástáblázat, Csatorna-azonosítás és HR/Docs Modul-izoláció UX

**Status:** Decided  
**Date:** 2026-11-02  
**Scope:** `[Docs]` `[Közös]`  
**Category:** `Docs / Central Audit Trail & Module Isolation UX`  
**Author:** Antigravity  
**Kapcsolódó ADR:** [A-108](../../architecture/decisions/A-108-docs-hr-audit-separation-vector-noise-suppression-and-round4-pkg1-guards.md)  
**Kapcsolódó Kód:** `src/app/audit/page.tsx`, `src/app/audit/actions.ts`, `src/utils/audit-log-formatter.ts`, `src/app/dossiers/page.tsx`, `src/app/actions/company-actions.ts`

---

## 1. Question / Problémafelvetés

A Központi Eseménynapló (`/audit`) élő használata során három UX és áttekinthetőségi probléma jelentkezett:
1. A naplóban megjelentek olyan munkatársak és események (pl. `Kelemen Roberta — betekintő — Hr jelenlet`), akik kizárólag az `eaisyHR` modulban dolgoznak, és nincs `eaisyDocs` hozzáférésük.
2. A háttérben futó AI vektor (`embedding`) és keresőindex (`kereso_vektor`) frissítések, valamint az automatikus érkeztető csatornák minden esetben semmitmondó `Rendszer / Automatizmus` + `Nyilvántartási adatok frissítve` sorokat hoztak létre.
3. Egy naplóbejegyzésre kattintva a jobb oldali részletező panel (`Sheet`) nyers `JSON.stringify` formában öntötte ki az adatbázis-rekordot (benne az 1536 elemű számsorozattal és nyers UUID-kkal), ami egy irodai felhasználó vagy auditor számára olvashatatlan volt.

---

## 2. Decision (A Meghozott Döntés)

1. **Strukturált magyar változástáblázat a nyers JSON helyett (`src/app/audit/page.tsx`, `src/utils/audit-log-formatter.ts`):**
   - A részletező panelen eltávolítottuk a nyers JSON kiírást.
   - Helyére két áttekinthető szekció került:
     - **Módosult Adatmezők (3 oszlopos táblázat):** *Mező*, *Korábbi érték* (halvány/áthúzott), *Új érték* (kiemelt) magyar mezőnevekkel (*Tárgy*, *Iktatószám*, *Érkeztetőszám*, *Státusz*, *Felelős ügyintéző*, *Partner / Küldő*, *Biztonsági minősítés*, stb.) és formázott dátumokkal/státuszokkal.
     - **Érintett Dokumentum / Ügyirat Főbb Adatai (2 oszlopos kártyarács):** az érintett entitás legfontosabb azonosító adatai emberi nyelven, UUID-k helyett feloldott partner-, ügyirat-, osztály- és munkatársnevekkel.
2. **Valódi munkatárs és érkeztetési csatorna megjelenítése (`src/app/audit/actions.ts`):**
   - Ha a naplósorban a `user_id` üres, a rendszer feloldja a `user_email`, `rogzito_user_id` vagy `felelos_user_id` alapján a tényleges munkatársat; külső automatikus érkeztetésnél pedig a pontos csatornát írja ki: **`eaisyBill Szinkron`** (`integráció`), **`E-mail Érkeztető`** (`automatizmus`) vagy **`Batch Szkenner`** (`automatizmus`).
3. **HR és Docs modul-szétválasztás a felhasználói listákban és a naplóban:**
   - Az eaisyDocs `/audit` nézete kizárólag az iratkezelési eseményeket mutatja (a `hr_*` események a `/hr/audit` felületre kerülnek), a tisztán HR-es (`elerheto_modulok = ['hr']`) dolgozók pedig nem jelennek meg sem az eaisyDocs munkatárs-választóiban (`/dossiers`), sem eaisyDocs szerepkörrel a taglistában.

---

## 3. Rationale (Indoklás)

A 335/2005. Korm. rendelet szerinti iratkezelési eseménynaplónak egyszerre kell jogilag hitelesnek és emberi szemmel azonnal értelmezhetőnek lennie: a vezetőnek vagy auditornak egyetlen pillantással látnia kell, hogy *ki* (vagy melyik integrációs csatorna), *melyik iraton* és *milyen mezőt* módosított, technikai adatbázis-zaj és idegen modulbeli események nélkül.
