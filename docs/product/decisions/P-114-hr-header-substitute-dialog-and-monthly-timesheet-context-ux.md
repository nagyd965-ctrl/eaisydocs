# [HR] PRD P-114: Helyettesítés Felugró Modál (SubstituteDialog) a Fejlécben és Jelenléti Ív Havi Kontextus UX

## Státusz
Elfogadva

## Dátum
2026-10-24

## Döntéshozók
eaisyHR Termékfejlesztési Csapat, UI/UX Lead

## Kontextus és Felhasználói Igény
1. **Elavult Helyettesítés Kártya:** A Dolgozói Portál Jelenlét & Szabadság (`/hr/self-service/time`) oldalán a helyettesítés beállítása egy a lap legalsó részén elnyúló, teljes szélességű statikus kártyaként szerepelt. Ez vizuálisan megtörte az oldal elrendezését a táblázat után, és nehezen volt felfedezhető.
2. **Kényelmesebb Fejléc Integráció:** A felhasználói visszajelzés alapján a funkció sokkal ergonomikusabb és prémiumabb közvetlenül az oldal tetején, az „Új Távollét Kérelem” gomb mellett elhelyezve, egy diszkrét modálban.
3. **Félreérthető Havi KPI Összegző Kártyák:** A fejléc alatti statisztikai sávban a „Távollét” kártya `0 nap`-ot mutatott, míg a lenti kérelmi listában több zöld „Jóváhagyva” jelvényű tétel is látható volt. Mivel hiányzott az egyértelmű kontextus felirat, a felhasználó joggal hitte úgy, hogy a rendszer nem számolja a jóváhagyott szabadságait – miközben a kártyák a kiválasztott naptári hónap (október) értékeit mutatták, a jóváhagyott kérelmek pedig más hónapokra (július, augusztus, november) szóltak.

## Termék- és UX Döntések

### 1. `SubstituteDialog` Fejléc Integráció
- Az alsó széles kártyát (`SubstituteSettingsCard`) kivezettük a felületről.
- Létrejött az új `src/components/hr/substitute-dialog.tsx` komponens, amely közvetlenül az „Új Távollét Kérelem” akciógomb mellé került a fejlécben:
  - **Inaktív állapotban:** Diszkrét körvonalas gomb (`Helyettesítés`). Kattintásra kompakt modál ablak nyílik meg, ahol kiválasztható a helyettes munkatárs és a kezdő/végdátum.
  - **Aktív helyettesítés esetén:** A gombon azonnal megjelenik egy elegáns másodlagos jelvény a kijelölt helyettes nevével (pl. `Helyettesítés [Kovács Anna]`). Kattintásra a modálban áttekinthető az aktív időszak, és egy kattintással elérhető a `Helyettesítés megszüntetése` művelet.
- Mentéskor és törléskor a modál azonnal bezáródik, és értesítést küld a sikeres módosításról.

### 2. Jelenléti Ív Havi Kontextus Tisztázása
- Az `EmployeeTimesheet` komponens KPI kártyái megkapták a diszkrét `sub="Ebben a hónapban"` feliratot (`Ledolgozott Órák`, `Munkanapok`, `Távollét`).
- Ez azonnal nyilvánvalóvá teszi a dolgozó számára, hogy a statisztikák a kiválasztott naptári hónap adatait összesítik, és a hónapléptetővel szinkronban dinamikusan frissülnek.
- A szerveroldali `getMonthlyTimesheet` akcióban pontosítottuk a hónapra eső szabadságok szűrését (`lte(kezdet_datuma, endDate)` és `gte(veg_datuma, startDate)`), garantálva a hibátlan havi kalkulációt.

### 3. Zero-Emoji és No-Decorative-Icons Megfelelés
- A felugró ablak és a fejléc gombja tiszta, szöveges elrendezést követ, indokolatlan dekoratív ikonok és emojik nélkül.
- Letisztult Linear-flat felépítés, standard HSL szemantikus tokenekkel.

## Kapcsolódó Dokumentumok
- [A-084](../../architecture/decisions/A-084-hr-substitution-routing-and-automatic-expiration-reconciliation.md): eaisyHR Helyettesítési Útvonalválasztás és Automatikus Lejárati Reconciliáció
- [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md): Rendszerszintű UI/UX Egységesség
- [P-043](./P-043-global-ui-consistency-and-unified-components.md): Kanonikus UI Minták és KpiCard
