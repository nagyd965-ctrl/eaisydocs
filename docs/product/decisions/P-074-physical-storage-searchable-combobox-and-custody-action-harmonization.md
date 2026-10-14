# P-074 [Docs] Fizikai Irattári Helymeghatározás Kereshető Combobox Menü és Kölcsönzési Akciógombok Harmonizációja

- **Dátum:** 2026-10-14
- **Státusz:** Decided
- **Hatókör:** [Docs]
- **Kapcsolódó döntések:** [P-007](P-007-physical-storage-and-borrowing-management-ux.md), [P-043](P-043-global-ui-consistency-and-unified-components.md), [A-055](../../architecture/decisions/A-055-physical-location-combobox-and-storage-note-persistence.md)

## 1. Felhasználói Igény és Problémafelvetés
- A fizikai irattári helymeghatározó ablakban (`PhysicalLocationDialog`) korábban a beviteli mezők alatt merev, vízszintesen görgethető gombok/chipek (`Meglévő: [teszt]`) jelentek meg a korábbi helyek kiválasztásához. Ez a kialakítás helypazarló volt, vizuális zajt keltett, és több tíz polc vagy doboz esetén nem tette lehetővé a gyors keresést.
- A részletes tárolási megjegyzés (pl. *„Piros fűzőmappa, 3. rekesz”*) elmentése után az adat nem jelent meg a táblázatban, és a modál újranyitásakor sem töltődött vissza az űrlapba.
- Az ügyirat adatlap irattáblázatában (`iratok-lista.tsx`) a fizikai elhelyezés (`+ Hely rögzítése`) és a kölcsönzés (`Kölcsönzés rögzítése`) gombok egymás alatt helyezkedtek el eltérő magassággal, paddinggal és stílussal, ami vizuálisan aszimmetrikus volt.
- A kölcsönzés rögzítésekor a munkatárs választó csak az admin és iktató jogosultságú felhasználókat engedte kiválasztani, kizárva az ügyintézőket és vezetőket.

## 2. Termék- és UX Döntések

### 2.1 Kereshető Combobox Dropdown Menü (`LocationCombobox`)
- Eltávolításra kerültek a beviteli mezők alatti statikus chipek és a félrevezető `Gyorsválasztó` felirat.
- Helyüket a beviteli mezőbe integrált elegáns `LocationCombobox` vette át:
  - **Beépített lenyíló trigger:** A mező jobb oldalán egy diszkrét számláló (meglévő mentett helyek száma) és egy `ChevronDown` nyíl jelzi a választási lehetőséget.
  - **Belső szűrősáv:** A menü megnyitásakor azonnal fókuszba kerül a keresőmező (`Search` ikon, instant szűrés, `X` törlés gomb), amellyel tetszőleges számú polc vagy doboz között lehet másodpercek alatt szűrni.
  - **Vizuális státusz és kiválasztás:** A meglévő tételek listájában az éppen kijelölt érték kiemelt hátteret és zöld/teal pipát (`Kiválasztva`) kap. Kattintásra automatikusan beíródik a mezőbe és bezáródik a menü.
  - **Új érték gyors rögzítése (`Enter` billentyű támogatás):** Ha a felhasználó egy olyan polcot/dobozt keres, ami még nem létezik az adatbázisban, a menü alján megjelenik a `Használat új értékként: „...”` gomb (vagy az `Enter` lenyomásával azonnal elfogadható), így semmilyen törést nem szenved a munkafolyamat.
  - **Szabad gépelés és mezőürítés:** A fő input mezőben a felhasználó közvetlenül is gépelhet tetszőleges szöveget, valamint a jobb oldali `X` gombbal egyetlen kattintással kiürítheti a mezőt.

### 2.2 Tárolási Megjegyzés Megjelenítése és Visszatöltése
- A tárolási megjegyzés mező tartalma a táblázatban a rögzített hely koordinátái alatt egy diszkrét, dőlt betűs második sorként jelenik meg (pl. *„Piros fűzőmappa, 3. rekesz”*), a kurzort ráfuttatva pedig teljes tooltipként is olvasható.
- A modál újranyitásakor az elmentett megjegyzés automatikusan visszatöltődik a beviteli mezőbe.

### 2.3 Fizikai Hely és Kölcsönzés Gombok Vízszintes Harmonizációja
- Az iratlistában a két gomb egymás mellé került (`flex items-center gap-1.5 flex-wrap`).
- Mindkét gomb azonos geometriát és mikro-stílust kapott:
  - Magasság: egységesen `h-7` (28px).
  - Térköz és belső margó: `px-2.5 rounded-md text-[11px] font-medium`.
  - Szegély és hover: egységes finom szaggatott keret (`border-dashed border-border/80 hover:border-primary/50 hover:bg-primary/5`).
  - Ikonméret: egységes `h-3 w-3`.

### 2.4 Kölcsönzési Célcsoport Feloldása
- A kölcsönzés modálban a munkatárs választó feloldásra került, így a szervezet valamennyi aktív dolgozója kiválasztható a papíralapú irat kikölcsönzésekor.

## 3. Minőségi és Üzleti Eredmények
- Letisztult, Linear-flat esztétikájú tárolóhely-választás, amely nagy iratmennyiség és több száz polc/doboz mellett is gyors és áttekinthető marad.
- Megbízható fizikai tárolási információk (megjegyzés perzisztencia).
- Harmonikus, kiegyensúlyozott táblázatos megjelenés vizuális hierarchiatörés nélkül.
