# A-055 [Docs] Fizikai Irattári Helymeghatározás Kereshető Combobox Architektúra, Megjegyzés Perzisztencia és Jogosultsági Feloldás

- **Dátum:** 2026-10-14
- **Státusz:** Decided
- **Hatókör:** [Docs]
- **Kapcsolódó döntések:** [A-008](A-008-append-only-audit-event-log-integrity.md), [A-029](A-029-global-ui-consistency-and-unified-components.md), [BRD-005](../../business/decisions/005-physical-borrowing-and-chain-of-custody.md), [P-007](../../product/decisions/P-007-physical-storage-and-borrowing-management-ux.md), [P-074](../../product/decisions/P-074-physical-storage-searchable-combobox-and-custody-action-harmonization.md)

## 1. Kontextus és Problémafelvetés
A papíralapú iratok eredeti példányainak kezelésekor (`irat_fizikai_hely`) három technikai és funkcionális hiányosság mutatkozott:
1. **Beviteli UX korlátok:** A korábbi megvalósítás az űrlapmezők alatt statikus gombokként/chipekként listázta a már rögzített polcokat és dobozokat. Több tucat vagy száz tárolási koordináta esetén ez áttekinthetetlen volt, és hiányzott az in-place szöveges szűrési képesség.
2. **Adatvesztés a lekérdezési rétegben:** A tárolási megjegyzés (`megjegyzes`) az adatbázisban létezett, és a Server Action el is mentette az `irat_fizikai_hely` táblába, azonban a `src/app/dossiers/[id]/page.tsx` szerveroldali Supabase lekérdezése kizárólag a `(doboz, polc)` mezőket kérte le. Emiatt az adatlap újratöltésekor a megjegyzés nem jutott el a frontendhez, a modál nem töltötte vissza, és a táblázatban sem jelent meg.
3. **Kölcsönzési célcsoport szűkítés:** A `BorrowDialog` kliens komponensben a választható munkatársak listája mesterségesen le volt szűrve kizárólag `['iktato', 'admin', 'rendszergazda']` szerepkörökre, megakadályozva, hogy a valóságban legtöbbet kölcsönző ügyintézők vagy vezetők kiválaszthatók legyenek.

## 2. Architektúra Döntés

### 2.1 Kereshető Combobox Dropdown Komponens (`LocationCombobox`)
- A [src/components/physical-location-dialog.tsx](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/physical-location-dialog.tsx) fájlban bevezetésre került a moduláris, enkapszulált `LocationCombobox` komponens:
  - **Saját állapotkezelés:** Mezőnként izolált Popover nyitási (`open`) és szűrési (`search`) állapot.
  - **In-place szűrés:** `useMemo` segítségével a beírt kifejezésre szűri a meglévő koordinátákat (kis- és nagybetű függetlenül).
  - **Hibrid beviteli modell:** A felhasználó közvetlenül is gépelhet a fő beviteli mezőbe (új érték megadása), vagy megnyithatja a Popover menüt, ahol a keresősávban azonnal szűrhet. Ha a keresett érték nem szerepel a listában, a menüből 1 kattintással (vagy az `Enter` billentyű leütésével) új értékként elfogadtatható.
  - **Egykattintásos mezőürítés:** Mind a fő mezőben (`X` ikon), mind a menü láblécében elérhető a törlés.

### 2.2 Megjegyzés Perzisztencia és Eseménynapló Szinkronizáció
- **Szerveroldali lekérdezés javítása:** A [src/app/dossiers/[id]/page.tsx](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/dossiers/%5Bid%5D/page.tsx) GraphQL-szerű Supabase lekérdezése kiegészült a `megjegyzes` mezővel:
  ```ts
  irat_fizikai_hely ( doboz, polc, megjegyzes )
  ```
- **Törlési feltétel pontosítása:** A [src/app/dossiers/borrow-actions.ts](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/dossiers/borrow-actions.ts) `setPhysicalLocation` függvényében az `isClearing` vizsgálat kiegészült a `megjegyzes` mezővel (`!trimmedDoboz && !trimmedPolc && !trimmedMegjegyzes`), megakadályozva a rekord téves törlését, ha csak megjegyzést adnak meg.
- **Audit napló:** Az `esemeny_naplo` bejegyzés `uj_ertek` objektuma mostantól rögzíti a megjegyzést is a fizikai helyzet változásakor.

### 2.3 Táblázatos Frontend Gombok Harmonizációja
- A [src/components/iratok-lista.tsx](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/iratok-lista.tsx) és [src/components/borrow-dialog.tsx](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/borrow-dialog.tsx) komponensekben a korábbi vertikális egymásra halmozás helyett vízszintes elrendezést alkalmazunk:
  - `flex items-center gap-1.5 flex-wrap`
  - Mindkét mikrogomb egységes `h-7 px-2.5 rounded-md text-[11px] font-medium border-dashed border-border/80` stílust kapott.
  - A `PhysicalLocationDialog` kiadási triggerében a rögzített megjegyzés dőlt betűs második sorként és teljes tooltipként is megjelenik.
- A `BorrowDialog`-ban feloldásra került a felesleges jogosultsági szűrés: a szervezet bármely dolgozója (`users`) kiválasztható kölcsönvevőként.

## 3. Minőségi és Karbantarthatósági Hatások
- Zéró regresszió: a TypeScript fordítás (`tsc --noEmit`) hibátlan (0 hiba).
- Teljes adatintegritás a fizikai irattár koordináták és az audit napló között.
- Megfelelés a Linear-flat és rendszerszintű UI egységességi irányelveknek ([A-029](A-029-global-ui-consistency-and-unified-components.md)).
