# PRD P-107: HR Teendők és Figyelmeztetések Dolgozói Csoportosítás, Avatarok és Kanonikus TableToolbar UX

- **Dátum:** 2026-10-23
- **Státusz:** `Approved`
- **Hatókör:** `[HR]`
- **Kapcsolódó döntések:** [ADR A-029](../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [ADR A-051](../architecture/decisions/A-051-hr-organization-structural-separation-from-settings.md), [PRD P-043](./P-043-global-ui-consistency-and-unified-components.md), [PRD P-104](./P-104-manager-workspace-revamp-and-comprehensive-self-service-requests-ux.md)

---

## 1. Felhasználói Igény és Probléma

1. **Ömlesztett Táblázatos Megjelenítés:**
   - A korábbi felületen a `/hr/admin` oldalon található teendők és figyelmeztetések egyetlen lapos táblázatban jelentek meg, így a HR szakembernek nehéz volt gyorsan áttekinteni, hogy melyik kollégával kapcsolatban hány elintézetlen feladat (orvosi vizsgálat, lejáró próbaidő, tanulmányi szerződés, szabadság vagy munkaidő-korrekciós kérelem, onboarding/offboarding) halmozódott fel.
2. **Emberközpontú Felépítés és Avatarok Hiánya:**
   - A vezetői jóváhagyási felülettel ellentétben a HR adminisztrátori teendőknél hiányzott a munkatársi profilképek és az aggregált feladatszámok vizuális kiemelése.
3. **Kétszintes, Zavaró Vezérlősáv és Redundáns Elemek:**
   - A keresősáv alatt egy különálló alsó sávban kapott helyet a darabszám (`X teendő • Y érintett dolgozó`) és a „Mind kinyitása · Mind összecsukása” gombok, ami indokolatlanul megnövelte a címsor és a kártyák közötti függőleges távolságot.
4. **Alapértelmezett Nyitottság Problémája:**
   - A csoportosított lista korábban kibontva nyílt meg, ami sok teendő esetén hosszú, görgetést igénylő és nehezen scannálható oldalt eredményezett.

---

## 2. Termék és UX Döntések

1. **Dolgozónként Csoportosított Lista Nézet (Dolgozói Nézet):**
   - **Munkatársi Accordion Kártyák:** A teendők dolgozónként csoportosítva jelennek meg.
   - **Valódi Profilkép / Avatar Támogatás:** A `felhasznalo_profil` táblából az alkalmazottak valódi fotói töltődnek be (`AvatarImage`), monogramos `AvatarFallback`-kel.
   - **Aggregált Teendő és Sürgősségi Jelvények:** A fejlécben azonnal látszik a feladatok száma (pl. `2 teendő`), valamint a legmagasabb súlyosságú jelvény (pl. `1 kritikus`, `1 figyelmeztetés`).
   - **Sorrendiség:** A lista elején automatikusan a kritikus határidős feladattal rendelkező kollégák szerepelnek.
   - **Közvetlen Adatlap Hivatkozás:** Minden dolgozói kártya fejlécében elérhető az „Adatlap” link, ami egyből a munkavállaló profiljára navigál.

2. **Alapértelmezetten Összecsukott Állapot:**
   - A kártyák alapértelmezetten összecsukva (`Set()`) nyílnak meg, így a HR szakember azonnal átlátja az összes érintett munkatársat, és célzottan bonthatja ki azt, akivel éppen foglalkozni szeretne.

3. **Kanonikus TableToolbar Integráció:**
   - **Egyszintes Vezérlősáv:** A nézetváltó kapcsoló (`Dolgozói nézet` és `Táblázat`) bekerült a kanonikus `TableToolbar` jobb oldali `actions` blokkjába, a „Függő Kérelmek Átszignálása” gomb mellé.
   - **Redundanciák Megszüntetése:** A „Mind kinyitása · Mind összecsukása” gombok és a különálló `X teendő • Y érintett dolgozó` felirat eltávolításra került.
   - **Kompakt Térköz:** A `CardHeader` alsó térköze (`pb-2`) és a toolbar felső paddingje minimalizálásra került, így a keresősáv közvetlenül a „Teendők és figyelmeztetések” főcím alatt foglal helyet.

4. **Kompakt Táblázatos Nézet Megtartása:**
   - A korábbi oszlopos táblázat (Sürgősség, Kategória, Feladat, Dolgozó, Művelet) a nézetváltó gombbal bármikor aktiválható maradt azok számára, akik globális szűrést vagy exportot végeznek.

5. **Zero-Emoji és No-Decorative-Icons Megfelelőség:**
   - Nincsenek emojik vagy felesleges dekoratív körkörös ikondobozok, tiszta szöveges és szemantikus HSL színekkel ellátott felület.

---

## 3. Érintett Képernyők és Komponensek

| Komponens / Fájl | Típus | Leírás |
|---|---|---|
| `src/components/hr/hr-tasks-and-alerts-table.tsx` | Kliens Komponens | Dolgozói nézet, valós avatar betöltés, TableToolbar actions integráció |
| `src/app/hr/admin/page.tsx` | Next.js Page | Avatar mapping profil lekérdezésekből, fejléc térköz kompaktálás |

---

## 4. Elfogadási Kritériumok (Acceptance Criteria)

- [x] A felületen a kártya címe tisztán „Teendők és figyelmeztetések”.
- [x] A dolgozói nézetben megjelenik a munkatárs profilképe (avatar), neve, munkaköre és a hozzá tartozó teendők száma.
- [x] A dolgozói kártyák alapjáraton összecsukva nyílnak meg.
- [x] A keresőmező és a vezérlőgombok (Nézetváltó, Átszignálás, Szűrés, Oszlopok) egyetlen egységes sorban foglalnak helyet a `TableToolbar`-ban.
- [x] A felesleges „Mind kinyitása · Mind összecsukása” gomppár és az alsó számlálósáv el van távolítva.
- [x] A vizuális térköz a cím és a keresősáv között kompakt.
