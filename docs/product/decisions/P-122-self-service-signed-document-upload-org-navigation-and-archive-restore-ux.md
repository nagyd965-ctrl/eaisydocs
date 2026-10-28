# P-122: [HR] [Közös] Dolgozói Aláírt Dokumentum Feltöltés, Stabil EMP-Törzsszám, Kattintható Organigram és Irattári Visszaállítás UX

**Status:** Decided  
**Date:** 2026-10-28  
**Scope:** `[HR]` `[Közös]`  
**Category:** `HR / Self-Service Documents, Organization, Onboarding & Docs Archive UX`  
**Author:** Antigravity AI  
**Kapcsolódó ADR:** [A-089](../../architecture/decisions/A-089-self-service-signed-document-immutability-and-archive-dossier-filing.md), [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md)  
**Kapcsolódó Kód:** `src/components/hr/employee-documents-view.tsx`, `src/components/hr/upload-signed-document-dialog.tsx`, `src/app/hr/self-service/documents/page.tsx`, `src/components/hr/employee-table.tsx`, `src/components/hr/org-chart-tree.tsx`, `src/components/hr/organization-tabs-view.tsx`, `src/components/hr/onboarding-list.tsx`, `src/components/hr/offboarding-list.tsx`, `src/components/hr/exit-interview-summary.tsx`, `src/components/dossier-lifecycle-actions.tsx`  

---

## 1. Question / Problémafelvetés
1. **Dokumentumaim (`/hr/self-service/documents` — 14. P1):** A dolgozó nem tudta feltölteni a saját maga által aláírt PDF verziót a generált (`Tervezet` státuszú) dokumentumokhoz, és nem látszott külön az eredeti és az aláírt példány állapota.
2. **Állomány és Szervezet (`/hr/admin` & `/hr/organization` — 17. P1):** Az Állomány táblázatban a dolgozók `EMP-xxx` törzsszáma a szűrt sorindexből (`index + 1`) számolódott, így keresés közben megváltozott a dolgozó azonosítója; a szervezeti ábrán (organigramon) pedig a részlegkártyák nem voltak kattinthatók.
3. **UI/UX egységesítés (18. P1):** A Szervezeti egységek táblázatból hiányzott a kanonikus `TableToolbar`, a Be- és Kiléptetési üres állapotokban pedig tiltott dekoratív ikonbuborékok szerepeltek.
4. **Személyi dosszié visszaállítása selejtezésből (`/dossiers/[id]`):** Ha egy dosszié véletlenül `selejtezheto` státuszba került, a felületen nem volt közvetlen gomb az irattárba történő visszaállításra.

## 2. Decision (A Meghozott Döntés)
1. **Aláírt verzió feltöltése és eredeti PDF megőrzése (`/hr/self-service/documents`):**
   - A `Tervezet` (még alá nem írt) dokumentumok kártyáján a `Megtekintés` és `Letöltés` gombok mellett megjelenik az **„Aláírt verzió feltöltése”** gomb (`UploadSignedDocumentDialog` `isSelfService` módban).
   - A feltöltő dialógus egyértelműen tájékoztatja a dolgozót, hogy a feltöltött aláírt PDF véglegesítésre kerül, és utólagos cseréjére csak a HR / Admin jogosult.
   - Feltöltés után a dokumentum jelvénye zöld **„Aláírva”** státuszra vált, a fő `Megtekintés` és `Letöltés` gombok az aláírt példányt nyitják meg, mellette pedig elérhető marad az **„Eredeti PDF”** letöltő gomb is.
2. **Stabil `EMP-xxx` törzsszám és kattintható Organigram (`employee-table.tsx`, `org-chart-tree.tsx`):**
   - Az `EmployeeTable` a teljes `data` listából előre felépít egy stabil `empCodeMap` leképezést, így keresés és szűrés közben minden dolgozó megtartja a valódi `EMP-xxx` törzsszámát.
   - Az `OrgChartTree` szervezeti egység kártyái közvetlen linkként (`/hr/orgunit/[id]`) működnek hover-kiemeléssel, miközben a fa-ág nyitó/csukó gomb `e.stopPropagation()` védelemmel helyben nyitja/zárja az alegységeket.
3. **Kanonikus `TableToolbar` és tiszta szöveges Empty State-ek (`organization-tabs-view.tsx`, `onboarding-list.tsx`, `offboarding-list.tsx`, `exit-interview-summary.tsx`):**
   - A Szervezeti egységek táblázat felett bevezetésre került a kanonikus `TableToolbar` (azonnali keresés, oszlopválasztó, létszám-szűrő).
   - A be- és kiléptetési listák, valamint a kilépési interjú üres állapotaiból eltávolításra kerültek a dekoratív ikonbuborékok.
4. **„Visszaállítás az irattárba” gomb az ügyirat-adatlapon (`dossier-lifecycle-actions.tsx`):**
   - Ha egy ügyirat `selejtezheto` vagy `selejtezett` státuszban van, a fejlécben megjelenik a **„Visszaállítás az irattárba”** gomb (illetve `irattarban` / `lezart` állapotnál a **„Visszahelyezés ügyintézésbe”** gomb).

## 3. Rationale (Indoklás)
- A dolgozói aláírás-feltöltés megszünteti a manuális e-mailes dokumentumküldözgetést, miközben az egyszeri feltöltési korlát és a megőrzött eredeti PDF garantálja a munkajogi auditálhatóságot.
- A stabil törzsszám, a kattintható organigram és a kanonikus `TableToolbar` maradéktalanul érvényesíti az `A-029` / `P-043` globális UI/UX egységességi szabványt.
