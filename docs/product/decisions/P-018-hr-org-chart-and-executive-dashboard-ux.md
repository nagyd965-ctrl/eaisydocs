# [HR] P-018: Szervezeti Fa és Vezetői HR Dashboard UX

## 1. Kontextus és Célkitűzés
A vállalat felépítésének, hierarchikus osztályainak és jelentési vonalainak interaktív áttekintésére szolgál az eaisyHR szervezeti fa és vezetői műszerfal nézete. A cél a transzparens szervezeti struktúra biztosítása, a vezetői pozíciók és helyettesítések átlátása, valamint a legfontosabb HR KPI-k (létszám, hiányzások, bérköltségek, toborzási tölcsér) egyetlen felületen való prezentálása.

## 2. Érintett Képernyők és Komponensek
- **Szervezeti struktúra nézet:** `/hr/szervezet`
- **HR Vezetői Főoldal:** `/hr`
- **Főbb komponensek:**
  - `src/components/hr/org-chart-tree.tsx`: Interaktív, kinyitható-összecsukható szervezeti fa (csomópontonként osztályvezetővel, beosztottak számával és státuszokkal).
  - `src/components/hr/org-unit-create-dialog.tsx` & `org-unit-action-menu.tsx`: Új szervezeti egység (osztály, divízió, csoport) létrehozása, átnevezése, felettes egység módosítása.
  - `src/components/hr/assign-employee-org-dialog.tsx`: Dolgozó hozzárendelése vagy áthelyezése szervezeti egységhez.
  - `src/components/hr/reports-tabs.tsx`: Vezetői összefoglaló diagramok (nemek aránya, életkori fa, átlagos munkaviszony, fluktuáció).

## 3. Felhasználói Interakciók és Folyamatok
1. **Szervezeti Egység Kezelése:**
   - A fa csomópontjaira kattintva az adott osztály részletei nyílnak meg (dolgozók listája, megüresedett álláshelyek).
   - Drag-and-drop vagy menü segítségével átszervezés hajtható végre, amely automatikusan frissíti a beosztottak jóváhagyási láncait.
2. **Vezetői Döntéstámogatás:**
   - A `/hr` dashboard widgetjei valós idejű figyelmeztetéseket adnak: engedélyezésre váró szabadságkérelmek, közelgő próbaidő lejárati határidők, orvosi alkalmassági hiányok.

## 4. UI Állapotok és Reszponzivitás
- **Nagy szervezetek kezelése:** Nagy hierarchia esetén a fa virtuális görgetéssel és méretezhető nézettel (zoom in/out) rendelkezik.
- **Jogosultsági izoláció:** Míg az egyszerű dolgozó csak az általános szervezeti felépítést látja, az osztályvezető látja a beosztottai státuszát, a HR vezető pedig a teljes mélységű adatokat.
