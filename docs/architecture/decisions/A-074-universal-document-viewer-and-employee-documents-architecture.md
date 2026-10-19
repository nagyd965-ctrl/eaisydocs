# ADR A-074: [HR] [Közös] Univerzális In-Place Dokumentum Megtekintés (DocumentViewer) és Önkiszolgáló Iratkezelési Architektúra

## Státusz
Elfogadva (Decided) - 2026-10-19

## Hatókör
`[HR]` `[Közös]`

## Kapcsolódó Dokumentáció
- **PRD:** [P-098: Dolgozói Önkiszolgáló Dokumentumaim Oldal és Profil Tisztítás UX](../../product/decisions/P-098-employee-self-service-documents-page-and-profile-declutter-ux.md)
- **Kapcsolódó Kód:**
  - `src/components/document-viewer.tsx`
  - `src/app/hr/self-service/documents/page.tsx`
  - `src/components/hr/employee-documents-view.tsx`
  - `src/components/hr-sidebar.tsx`
  - `src/app/api/hr/download-document/route.ts`
  - `src/app/hr/self-service/profile/page.tsx`
  - `src/app/hr/page.tsx`

---

## 1. Kontextus és Problémafelvetés
A Dolgozói Portál (`/hr/self-service/*`) és a központi eaisyDocs iratkezelés közötti átjárhatóság több ponton hiányos volt:
1. **Adatvesztéses UX a profiloldalon:** A munkavállalóhoz tartozó hivatalos iratok kizárólag a `Profilom` (`/hr/self-service/profile`) alján elhelyezkedő `Legutóbbi Dokumentumaim` kártyán jelentek meg egy 5 elemes korláttal (`.limit(5)`). A havi jelenléti ívek és szabadságok miatt az alapvető dokumentumok (munkaszerződés, orvosi alkalmassági, munkaköri leírás) azonnal kiszorultak a listából.
2. **Szigetelt és Korlátozott Dokumentumnézegető:** A meglévő `DocumentViewer` komponens kizárólag olyan iratokat tudott megjeleníteni, amelyek már rendelkeztek eaisyDocs `irat_id`-val és az `/api/pdf/[id]` végponton keresztül érkeztek. Az önálló HR dokumentumok (`hr_dokumentum`), amelyeket még nem iktattak be az eaisyDocs-ba (pl. aláírásra váró vagy nemrég generált dokumentumok), nem voltak megtekinthetők helyben, hanem kényszerűen közvetlen letöltésre szorultak.
3. **UI Egységesség és Szűrési Szabványok Megsértése (ADR A-029):** A vízszintes kategóriás pill-gombok alkalmazása megtörte az alkalmazás kanonikus struktúráját, míg a Dolgozói Portál kezdőlapján a 4. KPI kártya redundáns cafeteria évet mutatott.

---

## 2. A Meghozott Döntések

### 2.1. Dedikált Dolgozói Dokumentumtár (`/hr/self-service/documents`)
- Létrehoztunk egy önálló, dedikált oldalt a Dolgozói Portál oldalsávjában (`Dokumentumaim`), amely a dolgozó valamennyi (korlátlan számú) dokumentumát betölti a `hr_dokumentum` táblából.
- A profiloldalról (`/hr/self-service/profile`) kivezettük a csonka 5 tételes kártyát, így az a tiszta törzsadatokra és érvényességekre koncentrál.
- A korábbi `/hr/self-service/dokumentumok` útvonalat visszamenőleges kompatibilitási átirányításként megőriztük a `/hr/self-service/documents`-re.

### 2.2. Univerzális `DocumentViewer` Komponens
A `DocumentViewer` komponenst kiterjesztettük úgy, hogy transzparensen kezelje mind az eaisyDocs által iktatott, mind a tisztán HR tárolóban (`hr-documents`) lévő fájlokat:
- **Iktatott irat esetén (`selectedFile.irat_id` létezik):**
  - A nézet a szigorú `/api/pdf/[id]` végpontot hívja meg.
  - Érvényesíti a minősítési szinteket és szerepköröket.
  - Vízjelezi a PDF-et a betekintő nevével, időbélyegével és IP címével.
  - Append-only audit bejegyzést ír az `esemeny_naplo` táblába.
- **Még nem iktatott HR fájl esetén (`selectedFile.url` vagy `alairt_fajl_url` létezik):**
  - A komponens a `getSignedFileUrl` szerveroldali akcióval generál egy rövid élettartamú (60 másodperces) biztonságos Supabase Storage aláírt URL-t.
  - A dokumentum azonos beágyazott PDF/kép nézegetőben, helyben jelenik meg a böngésző elhagyása vagy letöltési kényszer nélkül.
  - A modál fejlécéből közvetlenül elérhető a biztonságos letöltés gomb is.

### 2.3. Kanonikus `TableToolbar` és Szűrés Popover Integráció (ADR A-029)
- Elutasítottuk a vízszintes kategóriagombok sorát a felhasználói visszajelzés és a globális UI egységesség jegyében.
- A dokumentumok felett a szabványos `TableToolbar` (`src/components/table-toolbar/table-toolbar.tsx`) helyezkedik el:
  - Bal oldalon: Élő szöveges kereső (`Search` ikon, instant gépelés név, iktatószám vagy kategória alapján, törlés gomb).
  - Jobb oldalon: Oszlopválasztó Popover (`Columns3`) és a kiemelt teal **`Szűrés` Popover Gomb** aktív szűrő darabszám jelvénnyel.
  - A popover tartalmazza a dinamikus naptári időszakszűrőt, a kategória-jelölőnégyzeteket élő darabszámlálókkal, valamint a státuszkapcsolókat (*Csak iktatott*, *Csak aláírt*).

### 2.4. Jogosultsági és Letöltési Végpont Keményítés
- A `/api/hr/download-document/route.ts` végpontban javítottuk az elérési útvonal ellenőrzést: az adatbázisban tárolt valós `url` és `alairt_fajl_url` mezőkkel történik a pontos útvonal-egyeztetés a nem létező `fajl_path` helyett.
- A dolgozó kizárólag a saját munkavállalói azonosítójához tartozó fájlokat töltheti le, míg a HR adminisztrátorok a teljes állomány irataihoz hozzáférnek.

### 2.5. Portál Kezdőlap KPI Harmonizáció
- A `/hr` főoldalon a redundáns 4. KPI kártya (Cafeteria keret "2026") helyére a **Munkaidő Egyenleg** (`hr_tulora_egyenleg.perc`) került bevezetésre.
- A kártya óra:perc formátumban (`formatOvertime`) mutatja a dolgozó valós egyenlegét, közvetlen hivatkozással a jelenléti ívre (`/hr/self-service/time`).

---

## 3. Következmények és Előnyök
- **Teljes Transzparencia:** A munkavállaló a saját portálján bármikor egyetlen kattintással eléri és áttekinti a teljes munkaviszonyához kapcsolódó irattárat.
- **Nulla Vizuális Törés:** A rendszerben mindenhol ugyanaz a Linear Flat KPI grid és a `TableToolbar` popover szűrő működik.
- **Biztonság és Audit:** A fájlok nem publikusak, közvetlen linkek nem kerülnek a DOM-ba; minden megtekintés és letöltés rövid lejáratú tokenekkel és audit naplózással védett.
