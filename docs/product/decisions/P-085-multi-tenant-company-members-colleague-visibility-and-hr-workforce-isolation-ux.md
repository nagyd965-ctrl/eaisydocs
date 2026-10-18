# [Közös] [HR] [Docs] P-085: Multi-tenant Cégtagsági Láthatóság és Moduláris HR Állomány Elszigetelés UX

## Státusz
`Approved` (2026-10-18)

## Kontextus és Felhasználói Élethelyzet
A felhasználó jelezte, hogy a HR vezető (`hrvezeto@testing.com`) fiókjával belépve a HR Munkaasztalon (`/hr/admin`) a teljes állomány 1 főre zsugorodott, és nem látta a céges kollégákat (például a másik HR vezetőt, `betekinto`-t sem), miközben a cégtulajdonos admin fiókkal 8 fő jelent meg. Ezzel párhuzamosan hangsúlyozta, hogy az eaisyHR és eaisyDocs két külön moduláris termék közös adatbázison: a cégbeállításoknál látható teljes névsorból (23 fő) a munkaügyi állományban kizárólag a valódi HR dolgozóknak (8 fő) szabad megjelenniük.

## UX Döntések és Működés

### 1. HR Munkaasztal Állomány Nézet (`/hr/admin`)
- **HR Vezető és HR Munkatárs nézete:** Amikor a HR vezető vagy admin belép, a `Teljes Állomány` KPI kártyán a cég pontos és valós HR létszáma (Think AI Kft. esetén **8 fő**) jelenik meg.
- **Dolgozói Törzsadatbázis táblázat:** Kizárólag azok a személyek listázódnak ki, akik rendelkeznek érvényes munkaügyi adatlappal (`hr_dolgozo_adatlap`). A tisztán Docs-os felhasználók nem jelennek meg dolgozóként a táblázatban.
- **HR Teendők és Értesítések:** A jóváhagyásra váró szabadságkérelmek és jelenlét-korrekciók az összes céges HR munkatársra kiterjedően láthatók és jóváhagyhatók a HR vezető számára.

### 2. Szervezeti Felépítés és Fa Nézet (`/hr/organization`)
- A szervezeti fa dobozai és a szervezeti egységek táblázata a tényleges céges HR munkatársakat mutatja, kizárva a Docs felhasználókat a létszám-statisztikákból.

### 3. Moduláris Felhasználó-kezelés és Átvezetés
- **Cégbeállítások (`Cég` fül):** A cég összes tagja (23 fő) látható a céges névjegyzékben, egyértelmű jelöléssel, hogy melyik modulhoz van hozzáférésük (`[Docs]`, `[HR]`).
- **HR Felvétel és Importálás (`/hr/admin` jobb felső sarok):**
  - Az *„Importálás eaisyDocs-ból”* és *„Új Dolgozó Felvétele”* funkcióknál a rendszer kizárólag az aktív céghez tartozó Docs munkatársakat ajánlja fel, akik még nem rendelkeznek HR adatlappal.
  - Sikeres felvétel után az adott személy bekerül az eaisyHR törzsadatbázisába, és az állomány létszáma eggyel nő.

## Kapcsolódó Dokumentumok
- ADR: [A-066](../../architecture/decisions/A-066-multi-tenant-company-members-colleague-visibility-and-hr-workforce-isolation.md)
- Korábbi döntések: [P-043](./P-043-global-ui-consistency-and-unified-components.md), [P-063](./P-063-hr-multi-tenancy-and-strict-gdpr-isolation-ux.md)
