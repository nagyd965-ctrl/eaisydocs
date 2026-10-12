# A-054 [Docs] Többcsatolmányos E-mailek Kezelése és Irat-szétválasztási Architektúra

- **Dátum:** 2026-10-12
- **Státusz:** Decided
- **Hatókör:** [Docs]
- **Kapcsolódó döntések:** [A-006](A-006-gapless-filing-sequence-allocation.md), [A-008](A-008-append-only-audit-event-log-integrity.md), [A-009](A-009-imap-daemon-and-asynchronous-ai-queue.md), [A-029](A-029-global-ui-consistency-and-unified-components.md), [P-004](../../product/decisions/P-004-inbox-filing-split-view-ai-ux.md), [P-073](../../product/decisions/P-073-multi-attachment-switcher-and-document-split-ux.md)

## 1. Kontextus és Problémafelvetés
Az eaisyDocs rendszerben beérkező elektronikus küldemények (főként az automatikus IMAP e-mail integráción vagy többlapos szkennelésen keresztül érkező dokumentumok) gyakran több különálló fájlmellékletet tartalmaznak:
1. **Több önálló számla egy levélben:** Gyakori üzleti eset, hogy egy beszállító egyetlen kísérőlevélben 2 vagy több független PDF számlát (pl. anyagköltség + szolgáltatási díj) vagy számlát és teljesítésigazolást küld meg.
2. **Különálló jogi és irattári entitások:** A magyar számviteli és iratkezelési szabályok szerint két különálló számlát nem lehet egyetlen iktatószám alá összevonni, ha azokhoz eltérő számlaszám, fizetési határidő, összeg vagy irattári tétel kapcsolódik.
3. **Korábbi hiányosságok:**
   - A bejövő sorból (`/inbox`) a táblázat sora egy redundáns, 3 kártyás köztes nézetre (`/inbox/view/[id]`) navigált, ahol a csatolmányok csak egy felugró modálban voltak megtekinthetők, és feleslegesen lefutott egy irreleváns előzményvizsgálat is.
   - Az iktató képernyőn (`/inbox/[id]`) nem volt lehetőség a csatolmányok közötti gyors váltásra és előnézetre.
   - Nem létezett funkció egy melléklet önálló bejövő irattá való leválasztására (split), így a felhasználó kénytelen volt a fájlt manuálisan letölteni és újból feltölteni.

## 2. Architektúra Döntés

### 2.1 Csatolmányváltó és Dinamikus PDF Előnézet (`FilingPanelClient`)
- A felújított iktató felület bal oldali paneljén a csatolmányok listája (`fajlok: FilingFile[]`) alapján egy horizontális csatolmánysáv jelenik meg:
  - Több csatolmány esetén (`fajlok.length > 1`): Interaktív fülek mutatják a fájlok nevét, típusát és méretét (`formatFileSize`).
  - Az aktív fül kiválasztásakor a nézőke URL-je dinamikusan átvált az adott fájlra: `/api/pdf/[iratId]?fileId=[fileId]`.
  - A felhasználó egy kattintással válthat a számlák és mellékletek között anélkül, hogy az iktató űrlap kitöltött adatai elvesznének.

### 2.2 Tranzakcionális Irat-szétválasztás Server Action (`splitAttachmentToNewIncoming`)
A csatolmány önálló irattá alakításához egy biztonságos, tranzakcionális Server Action-t vezettünk be (`src/app/inbox/filing-actions.ts`):
1. **Jogosultság-ellenőrzés:** Szigorú szerepkör-ellenőrzés (`admin`, `iktato`, `szerkeszto`).
2. **Új Érkeztetőszám Allokáció:** Meghívja a dedikált `generate_erkeztetoszam` Postgres tárolt eljárást, garantálva a gap-mentes, hivatalos érkeztetőszámot.
3. **Új Beérkezett Irat Rekord:**
   - Létrehoz egy új `irat` sort: `irany = 'bejovo'`, `statusz = 'erkeztetve'`, megőrizve az eredeti küldemény `company_id`-ját, `kuldo_partner_id`-ját, `erkezes_modja`-ját és `erkezes_datuma`-ját.
   - Az új irat tárgya automatikusan a leválasztott fájl nevére és az eredeti érkeztetőszámra hivatkozik (pl. `Számla_123.pdf (leválasztva: ERK-2026/0010)`).
4. **Fájl Áthelyezése Adatvesztés Nélkül:**
   - Az `irat_fajl` rekord `irat_id` mutatója átkerül az új iratra. A fizikai fájl a Supabase Storage-ban érintetlen marad, nincs szükség felesleges újra-feltöltésre.
5. **Kétoldali Append-Only Audit Naplózás:**
   - Az eredeti iratnál naplózásra kerül a csatolmány leválasztása az új érkeztetőszám megjelölésével.
   - Az új iratnál naplózásra kerül az érkeztetés és a származási forrás.
6. **Aszinkron AI Feladatsor:**
   - Az új irat automatikusan bekerül az `ai_feladat_sor` táblába `ai_metadata_extraction` feladattípussal, így a háttérben azonnal lefut a szétválasztott dokumentum OCR és metaadat kinyerése.
7. **Kliensoldali Frissítés és Útvonal Újraérvényesítés:**
   - A Server Action újraérvényesíti az `/inbox` és az érintett iratok útvonalait (`revalidatePath`).
   - A kliens komponens lokális állapota azonnal eltávolítja a leválasztott fájlt, a felhasználó pedig közvetlen toast értesítést kap az új irat megnyitásának lehetőségével.

### 2.3 Közvetlen Navigáció és Redundáns Nézet Kivezetése
- Az `/inbox` táblázatban az érkeztetőszám és a tárgy közvetlenül az osztott képernyős iktatófelületre (`/inbox/[id]`) mutat.
- A korábbi `/inbox/view/[id]` oldal azonnali szerveroldali átirányítást végez (`redirect(/inbox/${id})`), így nem maradnak elavult, használhatatlan felületek a rendszerben.

### 2.4 Egysoros, Letisztult Fejléc Toolbar (UX Declutter)
- A bal oldali panelen a korábbi kétsoros fejrész (fenti gombok + lenti csatolmánysor) helyett egyetlen `h-11`-es toolbar került kialakításra:
  - **Bal szél:** `[← Vissza]` gomb (ikon + "Vissza" felirat).
  - **Közép:** Függőleges elválasztó után közvetlenül az aktív csatolmányfülek (fájlnév, méret, aktív állapot kiemelése).
  - **Jobb szél:** A **`Szétválasztás önálló irattá`** akciógomb (kizárólag akkor, ha `fajlok.length > 1`).
  - A felesleges műveleti gombok eltávolításával a PDF előnézet maximális függőleges munkateret kapott.

### 2.5 Felhasználóbarát, Tömör Előzmény-ügyirat Magyarázat
- Az előzmény-ügyirat javaslatoknál (`antecedent-matcher.ts`) kivezetésre kerültek a belső matematikai súlyozási pontszámok (`+32%`, `+25%`) és a nyers reguláris kifejezés token-listák.
- Helyettük egy letisztult, 2 soros, emberi nyelven megfogalmazott magyarázat született:
  - Egyetlen érthető mondat foglalja össze az egyezés okát (pl. *„A beérkező irat partnere és témája megegyezik ezzel a nyitott ügyirattal, ezért alszámként érdemes csatolni.”*).
  - A doboz jobb szélén egyetlen kattintással elérhető a csatolás (`Csatolás ehhez` / `✓ Csatolva`).

### 2.6 Többcsatolmányos Gyorsbetekintő a Főoldali Táblázatban (`DocumentViewer`)
- A bejövő sor táblázatában a megtekintés (szem ikon) modálja kibővült: amennyiben a küldemény több mellékletet tartalmaz, a gyorsnézőke felső sávjában lapozható csatolmányfülek jelennek meg, lehetővé téve bármelyik PDF megtekintését már a lista nézetben is.

## 3. Következmények és Előnyök
- **Szabályos Számviteli Iratkezelés:** Megoldódott az egy e-mailben érkező több számla jogtiszta, szeparált iktatása.
- **Nulla Adatduplikáció:** A storage objektum nem másolódik le feleslegesen; csak a relációs mutatók és a naplóbejegyzések frissülnek.
- **Konzisztens és Gyors UX:** A redundáns köztes oldal megszűnésével és az egysoros eszköztárral gyorsabb és tisztább lett a munkavégzés.
- **Emberi Nyelvű AI Transzparencia:** Az ügyintéző azonnal, szakzsargon és pontszámok nélkül érti, hogy a rendszer miért ajánlja a meglévő ügyiratot.
