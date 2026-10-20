# ADR A-078: Teljesítményértékelés Modul Modernizáció, Sablontár és Linear-Flat Architektúra

- **Dátum:** 2026-10-21
- **Státusz:** `Decided`
- **Hatókör:** `[HR]`
- **Kapcsolódó döntések:** [ADR A-029](./A-029-global-ui-consistency-and-unified-components.md), [PRD P-043](../product/decisions/P-043-global-ui-consistency-and-unified-components.md), [PRD P-102](../product/decisions/P-102-performance-management-module-overhaul-and-kpi-catalogue-ux.md)

---

## 1. Kontextus és Problémafelvetés

Az eaisyHR Vezetői Teljesítményértékelés modulja (`/hr/performance` és `/hr/performance/dashboard`) a rendszer többi érett moduljához képest (Iratkezelés, Távollét/Szabadságkezelés, Dolgozói Munkaasztal) funkcionálisan és vizuálisan is elmaradott volt:
1. **Központi UI szabályok megsértése (ADR A-029):** Nem rendelkezett a fejléc alatt a kanonikus `KpiCard` összegző sávval; a lista felett nem volt kereső és szűrőfelület (`TableToolbar`), és az üres állapot egy halott, cselekvésre képtelen szürke kártya volt.
2. **Kihasználatlan Sablon Adatbázis (`hr_kpi_katalogus`):** Bár az adatbázisban létezett a sablon katalógus, az `AddKpiDialog` nem használta: a vezetőknek mindent kézzel, manuálisan kellett begépelniük fapados natív böngésző mezőkbe.
3. **Cikluskezelési Ergonómiai Nehézségek:** A ciklusmenedzsment modálban zsúfolt vízszintes űrlap és félreérthető apró piktogramok szerepeltek szöveges státuszváltó akciók helyett.
4. **Vezetői Dashboard:** Pasztell színű "legókocka" dobozok reprezentálták az 5 fázisú folyamatot, és a diagramok üres állapotban torz koordinátatengelyeket rendereltek.

## 2. Döntés

1. **Kanonikus KPI Mérőszámcsík:**
   - A `/hr/performance` oldal fejlécébe 4 darab szabványos, Linear-flat `KpiCard` komponenst építünk be:
     - `Aktív Ciklus` (Periódus és státusz)
     - `Érintett Dolgozók` (Célkitűzéssel rendelkezők aránya a teljes céges állományhoz képest)
     - `Kitűzött Célok (KPI)` (Aktív periódus KPI száma és átlaga / dolgozó)
     - `Vezetői Értékelésre Vár` (Önértékelés után vezetői pontozásra és szövegezésre váró célok)
   - Töröljük a felesleges, fejlesztői hatású kék tájékoztató infoboxot.

2. **Kanonikus TableToolbar Integráció:**
   - A `PerformanceList` konténer tetejére a központi `TableToolbar` kerül.
   - Élő keresés: dolgozó neve, beosztása és célkitűzés címe alapján.
   - Popover szűrőcsoportok: Értékelési ciklus (ciklusok listája), Értékelési fázis (`celkituzes`, `onertekeles`, `vezetoi_ertekeles`, `megbeszeles`, `lezart`), valamint Teljesítmény sáv (`Kiváló`, `Normál`, `Fejlesztendő`).
   - Cselekvőképes Empty State (aktív hozzáadási gombbal, ha nincs még rögzített adat).

3. **Vállalati Sablontár (`hr_kpi_katalogus`) Bekötése:**
   - Az `AddKpiDialog` lekéri az aktív katalógus elemeket, és egykattintásos gyorsválasztó gombokkal teszi lehetővé a célok feltöltését (megnevezés, típus, mértékegység, alapértelmezett célérték).
   - Dolgozóválasztó avatarral és munkaköri adatokkal támogatva.
   - Mértékegység-tudatos beviteli mezők (`%`, `Ft`, `db`, `skala`, `igen_nem`).

4. **Ciklus Menedzsment Modernizáció:**
   - A `ManageCyclesDialog` lenyitható formmal és egyértelmű, szöveges állapotváltó gombokkal bővül (`Megnyitás`, `Értékelés indítása`, `Ciklus lezárása`).

5. **Dashboard és Bérszámfejtési Integráció:**
   - A workflow 5 fázisa egységes Linear-flat, letisztult kártyarácsként jelenik meg.
   - A bérszámfejtési összesítő táblázat dolgozói profilokkal, progress barral és prémium sáv badge-ekkel egészül ki.

## 3. Érintett Komponensek és Fájlok

- `src/types/hr.ts` (Bővített `KpiItem` és `KpiCatalogueItem` típusok)
- `src/app/hr/performance/page.tsx` (KpiCard-ok, adatlekérés, alert törlés)
- `src/components/hr/performance-list.tsx` (TableToolbar, szűrés, Linear-flat dolgozói kártyák)
- `src/components/hr/add-kpi-dialog.tsx` (Sablontár, dolgozóválasztás, mértékegység-kezelés)
- `src/components/hr/manage-cycles-dialog.tsx` (Tiszta űrlap és műveletek)
- `src/app/hr/performance/dashboard/page.tsx` (Linear-flat pipeline és prémium tábla)
- `src/app/hr/performance/dashboard/components/dashboard-charts.tsx` (Üres állapotok kezelése)

## 4. Következmények

- A modul teljes mértékben felzárkózik az eaisyHR prémium szabványához.
- A vezetők és a HRadminok másodpercek alatt tudnak sablonból KPI-t kiosztani és átlátni a lezárási fázisokat.
- Nincsenek öncélú pasztell színek vagy hover árnyékok; szigorú Linear-flat dark mode kompatibilitás garantált.
