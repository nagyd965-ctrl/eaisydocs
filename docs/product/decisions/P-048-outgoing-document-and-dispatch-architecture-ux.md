# PRD P-048: Kimenő Irat, Válaszlevél és Expediálási Architektúra UX

- **Dátum:** 2026-10-04
- **Státusz:** Elfogadva
- **Hatókör:** `[Docs]` (eaisyDocs Iratkezelési és Expediálási Rendszer)
- **Kapcsolódó ADR / Szabályzat:** [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [P-043](./P-043-global-ui-consistency-and-unified-components.md), [P-047](./P-047-dossier-lifecycle-and-settlement-architecture-ux.md), `eaisyDocs_szoftverterv.md`

---

## 1. Kontextus és Problémafelvetés

Az ügyintézés során beérkező dokumentumokra (pl. számlák, hivatalos megkeresések, panaszok) az ügyintézőknek hivatalos kimenő választ (válaszlevelet) kell készíteniük, azt iktatniuk kell az ügyiratba (alszámra), és kézbesíteniük (expediálniuk) kell a partner számára (e-mailben vagy postai úton).

A korábbi kísérleti megvalósítás két komoly ergonómiai és vizuális hibát tartalmazott:
1. **Drasztikus vizuális túlzsúfoltság és aszimmetria:**
   - A kimenő irat űrlap közvetlenül a Feladatok tab bal oldalára került beágyazásra. A 3 különféle iratkészítési mód és az alatta elhelyezett expediálási szekciók miatt a kártya magassága meghaladta a 900 pixelt.
   - Mellette a jobb oldali *„Belső Megjegyzések”* (chat) kártya fix 500 pixeles volt, ami széttörte az oldal elrendezését, hatalmas üres fehér foltot és diszharmóniát képezve.
2. **Értelmetlen mező-duplikáció a közvetlen levélírásnál:**
   - A felületen a felhasználónak felül meg kellett adnia a *„Kimenő levél tárgya”* és a *„Válaszlevél szövege”* mezőket, majd közvetlenül alatta az expediálásnál **újra meg kellett adnia** az *„E-mail tárgya”* és a *„Kísérőszöveg a partnernek”* mezőket!
   - Egy valós felhasználó számára ez teljes fogalmi zűrzavar: miért kellene két különböző tárgyat és két különböző szöveget megadni egyetlen közvetlen válasznál?

---

## 2. Termék és UX Döntések

### 2.1. Teljes Mező-Duplikáció Felszámolása (Zero Redundancy)
A közvetlen válaszlevél írásakor a felhasználónak kizárólag a lényegi információkat kell megadnia:
- **1 Címzett e-mail cím** (a partner törzsadatából automatikusan betöltve).
- **1 Tárgy** (pl. `Válasz: [Ügyirat tárgya]`).
- **1 Üzenet szövege** (az érdemi hivatalos válasz).

A rendszer a háttérben ebből a szövegből:
1. Automatikusan elkészíti a hivatalos fejlécű A4-es PDF válaszlevelet a hatósági iktatókönyv számára.
2. Iktatja az ügyiratba a következő alszámra (`irany = 'kimeno'`).
3. Azonnal kiküldi e-mailben a partnernek a csatolt PDF-fel együtt, a megadott tárggyal és üzenettel.

### 2.2. Letisztult Modális Munkafolyamatok (Focused Action Dialogs)
A fő képernyő nem egy 900 pixeles monolitikus űrlap, hanem egy elegáns, könnyen áttekinthető panel:
- **3 egyértelmű, letisztult műveleti gomb:**
  - `[ ✉️ Válaszlevél írása ]` (Kiemelt zöld gomb): közvetlen válasz megfogalmazása és azonnali kiküldése.
  - `[ 📁 PDF feltöltése ]`: meglévő, külsőleg előállított PDF csatolása és expediálása.
  - `[ 📝 Sablon használata ]`: hivatalos minták (hiánypótlás, befogadási igazolás, tájékoztatás) kitöltése és generálása.
- Mindhárom folyamat egyedi, fókuszált modálban (`Dialog`) zajlik, ahol csak az adott művelethez szükséges mezők jelennek meg.

### 2.3. Tökéletes Vizuális Harmónia és Egységes Magasság (`h-[500px]`)
- A bal oldali *„Válaszlevelek és Expediálás”* panel és a jobb oldali *„Belső Megjegyzések”* kártya **azonos méretű (`h-[500px]`)**, azonos fejléc struktúrájú (ikon, cím, darabszám jelvény, leírás).
- A két kártya `grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch` elrendezésben, Linear Flat dizájnnal jelenik meg.

### 2.4. Kimenő Iratok Listája és Utólagos Expediálás
A panel görgethető listájában azonnal látható az adott ügyirathoz tartozó összes kimenő dokumentum:
- Tárgy és alszám (`/2. alszám`).
- Szemantikus kézbesítési státusz badge:
  - `Kiküldve e-mailben (dátum)` (zöld)
  - `Postázva (dátum)` (zöld)
  - `Expediálásra vár` (borostyán)
- Gyors előnézet: a csatolt PDF egyetlen kattintással megtekinthető a beépített `DocumentViewer` komponenssel.
- Utólagos expediálás: ha egy dokumentum korábban „Csak mentés” móddal lett iktatva, az `Expediálás` gombra kattintva bármikor pótolható a postázás vagy e-mailes kiküldés.

### 2.5. Nem Kiküldött Kimenő Iratok Törlése
- A még ki nem küldött kimenő irat vázlatok (`kezbesites_statusz !== 'expedialva'`) mellett megjelenik egy diszkrét törlés (piros kuka) gomb.
- Törlés megerősítő modál figyelmezteti a felhasználót.
- A szerver akció (`deleteOutgoingDocument`):
  - Ellenőrzi a jogosultságot.
  - Véglegesen törli a kapcsolódó fizikai fájlt a Supabase Storage `iratok` tárolójából.
  - Törli az `irat_fajl`, `irat_kapcsolat` és `irat` rekordokat.
  - Szigorúan naplózza az eseményt az `esemeny_naplo` táblában.
- A már expediált (postázott vagy kiküldött) iratok integritási és jogszabályi okokból nem törölhetők.

### 2.6. Válaszlevél Sablonok Katalógusa, Élő Lebegő Előnézet és Teljes CRUD Kezelés (`ReplyTemplatePicker`)
- A feladatsablonoknál megismert mintára a válaszlevelekhez és kimenő iratokhoz is elérhető a teljes körű sablonkatalógus:
  - **Katalógus modál:** Keresőmezővel és tematikus szűrőfülekkel (*Hivatalos válasz, Pénzügy / Számla, Tájékoztatás, Hiánypótlás, Szerződés / Jogi, Egyedi*).
  - **`+ Új sablon` gomb:** Új sablon rögzítése dialógus (megnevezés, kategória, alapértelmezett tárgy, leírás, levélszöveg).
  - **Teljes körű sablonkezelés (Mindegyik sablon módosítható és törölhető):** Mindegyik sablonkártyán (a korábbi beépített alapértelmezetteken is) elérhető a hárompontos menü (`MoreVertical`), amellyel a sablonok bármikor átnevezhetők, szövegezésük frissíthető vagy véglegesen törölhetők.
  - **Interaktív Lebegő Előnézet (Hover Card):** Az egér sablonkártyára húzásakor azonnal felugrik egy elegáns, formázott lebegő panel (`HoverCard`), amely a teljes levélszöveget, a pontos irattárgyat, karakterszámlálót és közvetlen „Alkalmazás” gombot biztosít anélkül, hogy a felhasználónak be kellene töltenie a mintát a szerkesztőbe.
  - **Perzisztencia:** A sablonok a `rendszer_beallitas` táblában tárolódnak (`valaszlevel_sablonok` kulcs alatt).
  - **Kettős integráció:** A katalógus megnyitható a főpanel *„Sablon használata”* gombjára kattintva, valamint a közvetlen *„Válaszlevél írása”* ablak fejlécéből is egyetlen kattintással.

### 2.7. Modális Layout Stabilitás és Nulla Vízszintes Görgetés (Zero Horizontal Scroll)
- A válaszlevél és sablongeneráló modálok elrendezésének stabilizálása:
  - **Textarea Szélességvédelem:** Eltávolítva a Chromium `field-sizing-content` automatikus mezőtágító szabályát a `src/components/ui/textarea.tsx`-ből, megakadályozva, hogy a hosszú mondatokat tartalmazó sablonok szétnyomják a modál vízszintes konténerét.
  - **Lábléc Margó Korrekció:** Megszüntetve a `DialogFooter` korábbi negatív margóit (`-mx-4 -mb-4`), így az alsó akciógombok sem kilógnak, sem levágódnak.

### 2.8. Válaszlevél, Sablon és PDF Melléklet Egységesítése (Unified Reply & Attachment Workflow)
- **Probléma:** Korábban a válaszlevél írása, a sablon használata és a PDF feltöltése három különálló, egymástól elszigetelt folyamat volt. Ha a felhasználó egy válaszlevél mellé (pl. egy hiánypótló vagy tájékoztató sablonhoz) csatolni kívánt egy külső PDF iratot (pl. számlát, igazolást, szerződéstervezetet), akkor ezt csak két külön kiküldéssel tudta megtenni.
- **Megoldás és Egységesítés:**
  - A korábbi 3 különálló modál helyett egyetlen, letisztult, minden igényt kielégítő egységes dialógus (`unifiedModalOpen`) jött létre.
  - **Sablon kiválasztás és testreszabás:** A modál tetején a sablonválasztó legördülőből bármelyik sablon vagy az „Egyedi válasz” kiválasztható, illetve a `Katalógus` gombbal elérhető az élő lebegő előnézetes sablonböngésző.
  - **Közvetlen PDF csatolási zóna:** A szerkesztő alatt közvetlenül helyet kapott egy drag-and-drop és kattintható PDF csatolómező, amely mutatja a csatolt fájl nevét, méretét és azonnali törlési lehetőséget (`✕`) biztosít.
  - **Egyidejű generálás, feltöltés és expediálás:**
    - A szerver akció (`generateAndExpediteReply`) automatikusan legenerálja a fejlécadatokkal ellátott A4-es hivatalos levél PDF-et, valamint feltölti a csatolt külső PDF dokumentumot is a tárolóba.
    - Mindkét fájl bekerül az `irat_fajl` táblába az adott kimenő irat alá, és bekerül a PDF/A normalizálási sorba.
    - E-mail kézbesítés esetén a partner egyetlen e-mailt kap, amelynek a törzsében szerepel a levélszöveg, és csatolmányként **mindkét PDF (a generált hivatalos válaszlevél és a csatolt külső PDF)** szerepel.
  - **Több fájl támogatása az iratlistában:** Az iratlistában a kimenő irat sorában nemcsak egy fájl, hanem az összes kapcsolt melléklet megjelenik külön gombokkal (`Eye` és `Paperclip`), így a `DocumentViewer` bármelyiket azonnal megjeleníti.
  - **Letisztult panel akciógombok:** A panel tetején a 3 szétaprózott gomb helyett 2 tágas, jól olvasható akciógomb kapott helyet (`Válaszlevél készítése és küldése` és `Sablonok katalógusa`).

---

## 3. Érintett Komponensek és Fájlok

| Fájl | Szerep |
|---|---|
| `src/components/outgoing-documents-panel.tsx` | Egységesített kimenő válaszlevél panel, összevont modál sablonkezeléssel és PDF csatolmánnyal, több fájl előnézet |
| `src/components/reply-template-picker.tsx` | Válaszlevél sablonok katalógusa, kategória szűrők, lebegő előnézet (HoverCard), minden sablon szerkesztése és törlése |
| `src/components/task-template-picker.tsx` | Feladatsablonok katalógusa, minden sablon módosítása és törlése |
| `src/components/ui/hover-card.tsx` | Lebegő előnézeti komponens z-[70] rétegezéssel és ütközésvizsgálattal |
| `src/types/reply-templates.ts` | Válaszlevél sablon típusok és kategóriák definíciói |
| `src/utils/reply-templates.ts` | Alapértelmezett beépített iratsablonok és kategória metaadatok |
| `src/app/dossiers/[id]/template-actions.ts` | Válaszlevél sablonok CRUD szerver akciói (`rendszer_beallitas`) + sablon PDF generálás |
| `src/app/tasks/task-actions.ts` | Feladatsablonok CRUD szerver akciói (`rendszer_beallitas`) minden sablonhoz |
| `src/app/dossiers/[id]/actions.ts` | Egységesített `generateAndExpediteReply` levélgenerálással + PDF melléklet feltöltéssel + többcsatolmányos e-maillel, és `deleteOutgoingDocument` akció |
| `src/components/tasks-tab.tsx` | Harmonizált 500px-es rácselrendezés, Belső megjegyzések fejléc igazítás |
| `src/components/expedite-dialog.tsx` | Utólagos expediálási modál (e-mail küldés és ragszám rögzítés) |
| `supabase/migrations/20261004000002_valaszlevel_sablonok.sql` | Rendszerbeállítás adatbázis magvetés a válaszlevél sablonokhoz |
