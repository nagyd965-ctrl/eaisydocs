# ADR A-069: eaisyDocs Szervezeti Egységek Megújítása és Kétfülös Fanézet Architektúra [Docs]

## Státusz
Elfogadva

## Kontextus
Az eaisyDocs rendszerben a Beállítások menüpont alatt található „Szervezeti Egységek” (`/settings` -> `osztalyok` tab) kezelése elavult, szűkös és nehezen átlátható volt:
1. Egy szimpla vertikális harmonika (`Accordion`) listázta az osztályokat, hiányzott a hierarchikus kapcsolatok (szülő-gyermek szervezeti egység) vizuális ábrázolása.
2. A szervezeti egységek nem rendelkeztek gyorskeresővel, hiányoztak az iratkezelési specifikumok (pl. iktató prefix jelvény, vezetői korona és automatikus eszkalációs státusz, hozzárendelt tagok iratkezelési szerepkörei és minősítési szintjei).
3. Az eaisyHR-rel ellentétben az eaisyDocs-ban **nincs szükség munkaköri katalógusra (FEOR)**, mivel az iratkezelő jogosultságokat a dokumentum-kezelési szerepkörök (`docs_szerepkor`: Szuper Admin, Rendszergazda, Iratkezelő, Vezető, Ügyintéző, Betekintő, Auditor) és a minősítési szintek (`max_minosites`) határozzák meg.
4. Szükség volt a beállítások fülön belüli modernizálásra („B” koncepció), amely átveszi az eaisyHR áttekinthetőségét és vizuális fanézetét, de szigorúan az eaisyDocs iratkezelési modelljéhez illeszkedik.

## Döntés
1. **Dedikált komponens architektúra (`DepartmentsTab`):**
   - Létrehoztuk a `src/components/settings/departments-tab.tsx` önálló, modularizált komponenst, amely leváltja a `settings-client.tsx`-ben lévő korábbi monolitikus harmonika kódot.
2. **Kétfülös belső nézetstruktúra:**
   - **1. Szervezeti Egységek (Táblázatos és kezelő nézet):**
     - Instant kliensoldali kereső (`Search` input, azonnali szűrés név és prefix alapján).
     - Részletes táblázat: Megnevezés, Iktató prefix (`iktato_prefix` monospace badge), Szülő egység (`Building2` ikonnal), Osztályvezető (`Crown` jelvénnyel és avatárral), Hozzárendelt munkatársak interaktív számláló gomb (`Users`), valamint műveleti gombok (Tag hozzárendelés `UserPlus`, Szerkesztés `Edit`, Törlés `Trash2`).
     - Teljes szélességű dashed hozzáadás gomb az egyszerű bővíthetőséghez.
   - **2. Szervezeti Ábra (`DocsOrgChartTree` fanézet):**
     - Rekurzív fa hierarchia építése `szulo_id` alapján.
     - Vizuális fa-csomópontok szint szerinti színes szegéllyel, vezetői kártyával, valamint a tagok névjegy-chipjeivel (avatar, `docs_szerepkor` badge, `max_minosites` biztonsági lakat badge).
3. **Biztonságos szerver oldali műveletek (`settings-actions.ts`):**
   - `getDepartments()`: Aktív vállalatra (`company_id`) szűrt, vezetői profillal és iratkezelési szerepkörökkel kiegészített lekérdezés.
   - `createDepartment()` & `updateDepartment()`: Név, szülő egység, iktató prefix és osztályvezető kezelése automatikus vezetői szerepkör szinkronizációval.
   - `deleteDepartment()`: Kaszkádolt védelem; törlés előtt a gyermek egységek `szulo_id`-ját és a tagok `szervezeti_egyseg_id`-ját nullázza az adatbázis kényszerhibák elkerülésére.
   - `removeUserFromDepartment()` & `addUsersToDepartment()`: Tagok szervezeti egységhez rendelése és eltávolítása, vezetői státusz szinkronizációval.

## Következmények
- Az eaisyDocs szervezeti egység kezelése vizuálisan és ergonómiailag felzárkózott az eaisyHR prémium szintjére, felesleges munkaköri túlbonyolítás nélkül.
- Tiszta kód, megszüntetett monolitikus állapotváltozók a `settings-client.tsx`-ben.
- A hierarchikus szervezeti struktúra azonnal átlátható a fanézetben az iratkezelési és minősítési jogosultságokkal együtt.
