# P-128: Munkakör-adatlap és HR Munkaasztal Duplikált Szerkesztőgomb-takarítás UX

**Status:** Decided  
**Date:** 2026-10-29  
**Scope:** `[HR]`  
**Category:** HR / Job Catalog, Employee 360 & Global Shell UX  
**Author:** OpenCode  
**Kapcsolódó ADR:** [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [A-053](../../architecture/decisions/A-053-hr-job-profile-and-catalog-action-deduplication.md)  
**Kapcsolódó Kód:** `src/app/hr/job/[id]/page.tsx`, `src/app/hr/job/[id]/job-profile-tasks-section.tsx`, `src/app/hr/admin/page.tsx`

---

## 1. Question / Problémafelvetés

A `/hr/job/[id]` munkakör-adatlapon a szerkesztés **hét különböző triggerből** nyílt meg, amelyek többsége ugyanazt a `JobEditDialog` modált ugyanarra a belső fülre nyitotta: a fejléc `Munkakör szerkesztése` gombja, **mind a négy KPI kártya rejtett kattinthatóként** (hover-afordancia nélkül), az `Alapadatok szerkesztése` gomb a Profil fülön, a két `Összes kezelése` gomb a Feladatok/Kompetenciák kártyákon, valamint a Munkavédelem fülön négy, páronként duplikált szerkesztő- és „+ …” gomb. A felhasználó nem tudta, mi kattintható és hova visz, a statisztikakártyák pedig szerkesztő űrlapot nyitottak tartalom helyett. Hasonlóan: a HR Munkaasztal (`/hr/admin`) fejlécében lévő `Jogosultságkezelő` gyorsgomb redundáns volt a Szervezeti Felépítés 4. fülével.

## 2. Decision (A Meghozott Döntés)

### Munkakör-adatlap (`/hr/job/[id]`)
- **A 4 KPI kártya passzív statisztika lett** (nincs `AssignEmployeeDialog` / `JobEditDialog` trigger-csomagolás, nincs cursor-pointer és hover-border).
- **Eltávolított duplikált gombok:**
  - `Alapadatok szerkesztése` (Profil fül törzsadatok kártyája) — a fejléc `Munkakör szerkesztése` gombjával azonosat nyitott;
  - 2× `Összes kezelése` (Feladatok és Kompetenciák kártyafejlécek) — szintén a fejlécgomb fedezi; a kártyák **gyors hozzáadó mezői (Enter) és kuka-törlései változatlanul működnek**;
  - `+ Kockázat és védőeszköz megadása` és `+ Orvosi vizsgálat beállítása` feltételes gombok — a megfelelő kártyafejléci `Munkavédelem szerkesztése` / `Orvosi előírás szerkesztése` gombok azonos modált nyitnak.
- **Megmaradt belépési pontok (7 → 3 + 1):** fejléc `Munkakör szerkesztése` (a modál belső fülei lefednek mindent), a Munkavédelem fül két kártyafejléci gombja, valamint a fejléc `Dolgozó hozzárendelése` párbeszédablak.
- A `JobProfileTasksSection` `orgUnits` propja és `JobEditDialog` importja elhagyatottá vált és törlésre került.

### HR Munkaasztal (`/hr/admin`)
- A fejléc `Jogosultságkezelő` gyorsgomb eltávolításra került; a Jogosultságkezelő Mátrix továbbra is elérhető a **Szervezeti Felépítés → 4. fül** (`/hr/organization?tab=permissions`) útvonalon, admin szerepkörrel.

## 3. Rationale (Indoklás)

- **Egy funkció — egy jól látható belépési pont:** a modálos szerkesztési modell megtartása mellett a duplikált triggerek megszüntetése kiküszöböli a „hova kerültem?” érzést anélkül, hogy a működés vagy a mentési logika változna (folytonosság a P-072 / P-113 elvekkel).
- A KPI kártyák a rendszer más pontjain passzív összesítők; a rejtett kattinthatóság megszüntetése a kártyák viselkedését a globális konvencióhoz igazítja (A-029 / P-043).
- A kártyafejléken maradt gombok kontextusban helyezkednek el (a szekció mezőit szerkesztik), míg a fejlécgomb a teljes modált nyitja — ez a kettős szint szándékos, nem redundancia.
