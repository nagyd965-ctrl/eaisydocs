# [A-051] eaisyHR Szervezeti Felépítés és Beállítások Építészeti Szétválasztása

- **Dátum:** 2026-10-12
- **Hatókör:** `[HR]`
- **Státusz:** `Decided`
- **Kapcsolódó döntések:** [P-070](../../product/decisions/P-070-hr-organization-structural-separation-from-settings.md), [A-029](./A-029-global-ui-consistency-and-unified-components.md)

---

## 1. Kontextus és Problémafelvetés
Korábban az eaisyHR rendszerben a dolgozók kezelése és a szervezeti struktúra (szervezeti egységek, munkakör-katalógus, szervezeti fa ábra) a Beállítások (`/hr/settings`) modul "Szervezet és munkatársak" fülében kapott helyet.
Ez komoly redundanciát és teljesítményproblémát okozott:
1. **Redundancia:** A dolgozók kezelése, szűrése és adatlapjainak elérése már teljes mértékben megoldott volt az Állomány Áttekintés (`/hr/admin`) felületen.
2. **Keveredő felelősségi körök:** A szervezeti ábra és a munkakörök nem technikai beállítások, hanem operatív HR üzleti funkciók.
3. **Erőforrás-pazarlás:** A `/hr/settings` oldal minden egyes megnyitásakor 7-8 nehéz adatbázis-lekérdezést futtatott le (beleértve a teljes dolgozói adatlap hierarchiát, ATS jelölteket, docs profilokat), még akkor is, ha a felhasználó csak a jelszavát vagy témáját akarta módosítani.

## 2. Döntés
1. **A "Munkatársak" fület eltávolítottuk a Beállításokból (`/hr/settings`):**
   - A dolgozók adminisztrációja, felvétele (`AddEmployeeDialog`), szerkesztése (`EmployeeEditDialog`) és törlése (`EmployeeDeleteDialog`) 100%-ban az Állomány Áttekintés (`/hr/admin`) és a Dolgozói Adatlap (`/hr/employee/[id]`) feladata.
   - Az adminok közvetlenül az Állomány Áttekintés táblázatból 1 kattintással megnyithatják a gyorsmódosító vagy törlő modált.
2. **Dedikált Szervezeti Felépítés nézet (`/hr/organization`):**
   - Létrehoztuk a `/hr/organization` önálló útvonalat és a hozzá tartozó `OrganizationTabsView` klienst.
   - Tartalmazza a Szervezeti Ábrát (`OrgChartTree`), a Szervezeti Egységeket és a Munkakör-katalógust, instant kereséssel és kanonikus `KpiCard` összegzőkkel.
   - A bal oldali főmenüben a `HR Munkaasztal` alatt kapott dedikált menüpontot ("Szervezeti Felépítés").
3. **Beállítások megtisztítása (`/hr/settings`):**
   - A `/hr/settings` mostantól kizárólag a valódi konfigurációs elemeket tartalmazza: Profil, Cég, Rendszer, Biztonság és Értesítések.
4. **Redundáns Központi Áttekintés (`/hr/admin/overview`) kivezetése:**
   - Mivel a feladatok, teendők (`HrTasksAndAlertsTable`), valamint a dolgozói statisztikák mind az Állomány Áttekintés (`/hr/admin`) felületre kerültek, a különálló `/hr/admin/overview` menüpont törlésre került, és az útvonal átirányítást kapott a `/hr/admin`-ra.
5. **Műveleti gombok egységesítése a táblázatokban:**
   - A `OrgUnitActionMenu` és `JobActionMenu` komponensekben a 3 pontos legördülő menü helyett közvetlen gombok (Adatlap, Szerkesztés ceruza, Törlés kuka) kerültek kihelyezésre, igazodva az állománytáblázat egységes stílusához.

## 3. Érintett Komponensek
- `src/app/hr/organization/page.tsx`
- `src/components/hr/organization-tabs-view.tsx`
- `src/components/hr-sidebar.tsx`
- `src/app/hr/settings/page.tsx`
- `src/app/hr/admin/page.tsx`
- `src/components/hr/employee-table.tsx`
- `src/app/hr/orgunit/[id]/page.tsx`
- `src/app/hr/job/[id]/page.tsx`
- `src/app/hr/settings/actions.ts`

## 4. Következmények és Előnyök
- **Drasztikusan gyorsabb beállítások:** A `/hr/settings` azonnal betölt felesleges kapcsolótábla-lekérdezések nélkül.
- **Tiszta architektúra:** Nincs funkciókettőzés; minden üzleti folyamatnak egyetlen, egyértelmű helye van a rendszerben.
- **Megfelelőség az eaisyDocs/eaisyHR elveknek:** Teljes kanonikus komponenshasználat és letisztult szerepkör-kezelés.
