# P-073 [Docs] Többcsatolmányos Előnézet és Irat-szétválasztási UX

- **Dátum:** 2026-10-12
- **Státusz:** Decided
- **Hatókör:** [Docs]
- **Kapcsolódó döntések:** [P-004](P-004-inbox-filing-split-view-ai-ux.md), [P-043](P-043-global-ui-consistency-and-unified-components.md), [A-054](../../architecture/decisions/A-054-multi-attachment-handling-and-document-splitting-architecture.md)

## 1. Felhasználói Igény és Problémafelvetés
- A beérkező iratok feldolgozásakor a felhasználónak gyakran több melléklettel kell dolgoznia (pl. egyetlen levélben érkező két külön számla vagy egy számla és annak igazolása).
- A korábbi felületen a bejövő sorból egy 3 kártyás, statikus oldalra (`/inbox/view/[id]`) jutott a felhasználó, ahol nem volt érdemi dokumentumkezelési funkció:
  - Feleslegesen lefutott egy előzményvizsgálat, ami alacsony egyezésnél is megtévesztő volt.
  - A csatolmányok csak egy felugró ablakban nyíltak meg.
  - Nem volt lehetőség a számlák szétválasztására, ha azok két külön ügyirathoz tartoztak.

## 2. Termék- és UX Döntések

### 2.1 Közvetlen Belépés az Iktatóképernyőre
- A bejövő sor táblázatában (`/inbox`) az érkeztetőszámra és a tárgyra kattintva a felhasználó közvetlenül az érdemi iktató felületre (`/inbox/[id]`) érkezik.
- A felesleges köztes `/inbox/view/[id]` oldal automatikusan továbbirányít ide.

### 2.2 Csatolmányválasztó Sáv (Attachment Tabs)
- Ha a küldemény 2 vagy több fájlt tartalmaz, a bal oldali PDF nézőke felett megjelenik egy elegáns csatolmánysáv:
  - Minden fülön látható a fájl neve és mérete (pl. `Számla_01.pdf (1.2 MB)`).
  - Az aktív fül kiemelten jelenik meg, rákattintva az előnézeti terület azonnal az adott fájlt mutatja be.

### 2.3 „Szétválasztás önálló irattá” Gomb és Megerősítő Modál
- Ha az e-mailben két külön számla érkezett, az aktív melléklet mellett megjelenik a **„Szétválasztás önálló irattá”** gomb (`Split` ikon).
- A gombra kattintva egy megerősítő párbeszédablak jelenik meg, amely összefoglalja a művelet hatását:
  - Tájékoztatja a felhasználót, hogy a leválasztott fájl egy **új érkeztetőszámot** kap.
  - Bekerül a bejövő sorba új feladatként.
  - A háttérben automatikusan elindul rá az AI adatkinyerés.
- A jóváhagyás után az aktuális iratból a fájl eltűnik, a megmaradt irat pedig zavartalanul eliktatható.

### 2.4 Egysoros, Integrált Toolbar a Fejlécben
- A bal oldali előnézeti panel tetején korábban szereplő redundáns gombok (`Válasz`, `Nem iktatandó`, külső ablak) kivezetésre kerültek.
- Egyetlen, rendezett `h-11`-es eszköztár jött létre:
  - `[← Vissza]` gomb a bejövő sorba való azonnali visszalépéshez.
  - Elválasztó vonal után a csatolmányválasztó fülek.
  - A jobb szélen a `Szétválasztás önálló irattá` akciógomb.
- Ezáltal a PDF nézőke maximális függőleges teret kapott, minimálisra csökkentve a felületi zajt.

### 2.5 Felhasználóbarát, Tömör Előzmény Javaslat Kártya
- A meglévő ügyirathoz kapcsolódó javaslat (amikor a rendszer detektálja az előzményt) korábban túlságosan technikai jellegű volt (számított pontszámok, regex kulcsszó-listák).
- A felület most egy tömör, mindössze 2 soros barátságos információs kártyát jelenít meg:
  - Felső sor: `🔗 Javasolt előzmény: <iktatószám> [<egyezés>%] | ✓ Csatolva / [Csatolás ehhez]`
  - Alsó sor: 1 rövid, természetes mondat a döntés hátteréről (azonos partner és megegyező tárgy nyitott ügyiratban).

### 2.6 Multi-melléklet Gyorsbetekintő a Listában (`DocumentViewer`)
- A `/inbox` táblázatban a szem ikonra kattintva megnyíló modálban is elérhető a csatolmányok közötti váltás, így a felhasználó még az iktatás megnyitása előtt ellenőrizheti mindkét dokumentumot.

### 2.7 eaisyBill Számla Gyorsbetekintő az Import Panelben (`EaisyBillImportPanel`)
- A bejövő sor tetején lévő "Importálás eaisyBill-ből" táblázat Műveletek oszlopában az `[Átvesz]` gomb mellé bekerült a kanonikus megtekintés (szem ikon) gomb.
- A gombra (vagy a bizonylatsorszámra) kattintva egy in-place `Dialog` modál nyílik meg (`DocumentPreviewFrame`), ahol a felhasználó még az importálás előtt ellenőrizheti a számla PDF képét, kiállítóját, fizetési határidejét és összegét.
- A modál fejlécéből a számla egyetlen kattintással átvehető a bejövő sorba (`[Átvesz a bejövő sorba]`), az átvételt követően pedig dinamikusan "Átvéve" jelvénnyel nyugtázza az állapotot.

## 3. Minőségi és Üzleti Eredmények
- Jelentősen gyorsult az adminisztráció: nincs felesleges kattintgatás üres kártyák között.
- Megbízhatóan kezelhetők a multi-invoice e-mailek a számviteli követelményeknek megfelelően.
- Az ügyintézők azonnal, emberi nyelven értik a rendszer előzmény-javaslatait.
