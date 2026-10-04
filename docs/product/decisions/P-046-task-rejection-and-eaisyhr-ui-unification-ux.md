# [Közös] P-046: Feladat Elutasítás Vizuális Újratervezése és eaisyHR Teljes UI/UX Tisztítás

**Státusz:** Decided  
**Dátum:** 2026-10-04  
**Hatókör:** `[Közös]` (eaisyDocs & eaisyHR)  
**Kategória:** `UI/UX Standards / Task Management & HR Design System`  
**Kapcsolódó ADR:** [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md)  
**Kapcsolódó PRD:** [P-019](./P-019-task-management-kanban-and-calendar-ux.md), [P-043](./P-043-global-ui-consistency-and-unified-components.md)  
**Kapcsolódó Kód:** `src/app/tasks/kanban-board.tsx`, `src/components/tasks-tab.tsx`, `src/app/tasks/task-list.tsx`, `src/app/hr/*`, `src/components/hr/*`

---

## 1. Kontextus és Felhasználói Problémafelvetés

1. **Feladat Elutasítás Vizuális Anomáliák (eaisyDocs):**
   - A korábbi feladatkezelési fejlesztés során az elutasított feladatok indoklása aránytalanul nagy, szerkeszthető szövegbeviteli mezőre (input box) hasonlító harsány piros konténerben jelent meg mind a Kanban kártyákon, mind az Ügyirat feladatok fülén.
   - Ez megtörte a Linear-inspirált letisztult kártyafelépítést, és azt az érzetet keltette a felhasználóban, mintha a mezőbe még írni lehetne.
   - Emellett redundáns segédszövegek terhelték a felületet.

2. **eaisyHR Modul Design Eltérései (Design Drift):**
   - Bár az eaisyDocs törzsoldalai már átálltak az [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md) és [P-043](./P-043-global-ui-consistency-and-unified-components.md) szabályaira, az eaisyHR modulban (`src/app/hr/*` és `src/components/hr/*`) számos helyen megmaradtak a tiltott dobozárnyékok (`shadow-sm`, `shadow-xs`), nyers Tailwind színek (`emerald-*`, `amber-*`, `blue-*`, `teal-*`, `purple-*`, `orange-*`), valamint a beégetett `#02b8cc` hex kódok.

---

## 2. Termékszintű UX Döntések

### 2.1. Feladat Elutasítás Újragondolt Megjelenítése

1. **Kanban Kártya (`src/app/tasks/kanban-board.tsx`):**
   - Megszüntettük a kiugró, kamu input dobozokat.
   - A kártya mérete és szegélye standard Linear-flat marad.
   - Az elutasítási indoklás diszkrét, finom kurzív idézetként (`„... indoklás ...”`) jelenik meg egy kis méretű `Ban` ikon kíséretében, minimális vizuális zajjal (`text-xs text-destructive/90 bg-destructive/5 rounded px-2 py-1 border border-destructive/15`).
2. **Ügyirat Feladatok Fül (`src/components/tasks-tab.tsx`):**
   - Eltávolítottuk a kétszeresen beágyazott kereteket és a kamu `textarea` szerű stílust.
   - Helyette egyrétegű, diszkrét `bg-destructive/5 border-destructive/20` indoklási doboz jelenik meg, közvetlenül a feladat leírása alatt.
3. **Feladatlista Nézet (`src/app/tasks/task-list.tsx`):**
   - Kompakt státusz jelvény és a sormagassághoz igazodó inline indoklás.

### 2.2. eaisyHR Teljes Vizuális Tisztítás és Rendszerszintű Összehangolás

1. **Zero-Shadow Szabály (100% Flat Linear):**
   - Kivétel nélkül minden `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xs`, `shadow-2xs` eltávolításra került a teljes `src/app/hr/*` és `src/components/hr/*` könyvtárból.
   - A kártyák és panelek 1px-es finom borderrel és diszkrét hover border-átmenettel rendelkeznek (`hover:border-primary/40`).
2. **Kizárólag Szemantikus HSL Tokenek (Zero Raw Colors):**
   - Megszüntettük az összes közvetlen színosztályt (`emerald`, `amber`, `blue`, `purple`, `green`, `rose`, `indigo`, `teal`, `sky`, `orange`, `red`).
   - Minden állapotjelző kizárólag a platformszintű tokeneket alkalmazza:
     - Pozitív / jóváhagyott / kész: `success`
     - Folyamatban / várakozó / figyelmeztetés: `warning`
     - Rendszer / elsődleges akciók: `primary`
     - Információ: `info`
     - Elutasított / hiba / törlés: `destructive`
   - Kigyomláltuk a beégetett `#02b8cc` és `#029db0` színeket a nyomógombokról.
3. **Kompakt Táblázatok (`.compact-table` - 45px):**
   - Minden HR táblázat (Jelenléti ív, Orvosi vizsgálatok, KSH jelentéskészítő, Cikluskezelő, Munkakörök, Dolgozók) megkapta a `.compact-table` osztályt és a kötelező vízszintes görgetési védelmet (`<div className="overflow-x-auto">`).
4. **Tipográfiai Fegyelem:**
   - Címeknél és modál fejléceknél egységesen `font-semibold` (a túlhangsúlyos `font-bold` helyett).
   - Numerikus értékeknél, dátumoknál és pénzösszegeknél `tabular-nums` használata.
5. **Kanonikus Komponensek:**
   - A HR felületeken lévő egyedi statisztikai dobozokat a központi `<KpiCard>` komponensre cseréltük (dekoratív ikonok és vastag aszimmetrikus bal oldali sávok nélkül).
   - A toborzási jelöltlista (`talent-pool-list.tsx`) illeszkedik a kanonikus `TableToolbar` komponenshez.

---

## 3. Érintett Képernyők és Komponensek

- **eaisyDocs:**
  - `src/app/tasks/kanban-board.tsx`
  - `src/components/tasks-tab.tsx`
  - `src/app/tasks/task-list.tsx`
- **eaisyHR (84 módosított fájl):**
  - Munkavállalói adatlapok és fülek (`src/app/hr/employee/[id]/*`)
  - HR Admin és Szervezeti Egységek (`src/app/hr/admin/*`, `src/app/hr/orgunit/[id]/*`, `src/app/hr/job/[id]/*`)
  - Dolgozói Önkiszolgáló Portál (`src/app/hr/self-service/*`)
  - Toborzás és Onboarding/Offboarding (`src/app/hr/recruitment/*`, `src/components/hr/onboarding-*`, `src/components/hr/offboarding-*`)
  - HR Beállítások és Biztonsági Fül (`src/app/hr/settings/*`)

---

## 4. Eredmények és Hatások

- **Megszűnt a felhasználói zavar:** Az elutasított feladatok indoklása tiszta, nem téveszthető össze szerkeszthető beviteli mezővel.
- **Tökéletes vizuális harmónia:** Az eaisyHR most már 100%-ban ugyanazt a prémium, professzionális és flat vizuális nyelvezetet beszéli, mint az eaisyDocs iratkezelő magja.
- **Kódminőség:** A TypeScript fordítás (`tsc --noEmit`) 0 hibával fut le a teljes projekten.
