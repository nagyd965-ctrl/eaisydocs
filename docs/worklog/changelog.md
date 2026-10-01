# eaisyDocs & eaisyHR – Rendszer Változásnapló (Changelog)

Minden jelentős fejlesztési mérföldkő, release és sprint időrendi naplója.

---

## [Unreleased] – Fejlesztés alatt (2026-10-01)

### ⏱️ Havi Jelenléti Ív PDF Generálás & eaisyDocs Személyi Dosszié Iktatási Híd
- **Hiteles Mt. 99–106. § szerinti Munkaidő-nyilvántartás:** Elkészült a hivatalos havi jelenléti ív PDF generáló motor ([src/utils/hr/timesheet-pdf-generator.ts](../../src/utils/hr/timesheet-pdf-generator.ts)), amely a havi rögzített jelenléti napok, jóváhagyott távollétek (szabadság, betegség) és munkaszüneti napok alapján állít elő nyomdai minőségű A4-es hivatalos elszámolást.
- **Naponkénti Részletező & Összesítő:** Naponkénti érkezési/távozási időpontok, ledolgozott munkaórák, jogcímek, valamint havi összesített munkaóra, elvárt norma (FTE alapján) és időszaki egyenleg / túlóra kimutatás.
- **Közvetlen Böngészőn Belüli Megtekintés (`PdfViewerDialog`):** Az új `/api/hr/timesheet-pdf` API végponton keresztül a dolgozó vagy a HR felelős letöltés nélkül, közvetlenül a felugró PDF-olvasóban tekintheti meg az ívet bármelyik hónapra.
- **Egykattintásos Hivatalos Iktatás (`fileMonthlyTimesheet`):**
  - A hónap jóváhagyása után a HR-es egyetlen gombnyomással beiktathatja a havi jelenléti ívet a dolgozó eaisyDocs személyi dossziéjába (`HR/ÉÉÉÉ/SORSZÁM/ALSZÁM`).
  - Automatikusan feltölti a hiteles PDF-et a Supabase Storage-be (`timesheets/{employeeId}/...`).
  - Létrehozza a `hr_dokumentum` rekordot `Havi jelenléti ív` kategóriával.
  - A `3.2 - Munkaidő nyilvántartások` irattári tételhez rendeli 5 éves megőrzési idővel és bizalmas minősítéssel.
  - Audit bejegyzést készít a `hr_esemeny_naplo` táblába.
- **Megújult Jelenléti Fejléc (`AttendanceTab.tsx`):**
  - „Megtekintés” gomb a PDF előnézethez.
  - „Iktatás dossziéba” gomb lezárt hónapoknál.
  - Zöld `Iktatva: HR/...` státuszjelző badge és közvetlen hivatkozás az eaisyDocs személyi dosszié nézetre.
- **TDD Tesztek:** Kibővített tesztkészlet (`src/utils/__tests__/hr-filing-bridge.test.ts`), 12/12 zöld teszt.
- **Döntési háttér:** [PRD P-026](../product/decisions/P-026-hr-document-templates-and-lifecycle-filing-roadmap.md), [ADR A-026](../architecture/decisions/A-026-employee-personal-dossier-and-hr-filing-bridge.md).

### 📄 eaisyHR Munkakör Katalógus ↔ Dolgozói Munkaköri Leírás Integráció és Dinamikus Generálás
- **Munkakör Katalógus Verzió Átvétele (`hr_munkakor_leiras_verzio`):** A dolgozó profiloldalán (`/hr/employee/[id]`) feloldásra kerül az aktív beosztáshoz tartozó `hr_munkakor` és a hozzá feltöltött legfrissebb hivatalos verzió a katalógusból.
- **Linear-Stílusú Átvételi Kártya (`JobDescriptionBadgeAction`):**
  - Jelzi az aktív munkakört, a katalógusbeli verziószámot (`v1`), a feltöltött fájl nevét és kiadásának dátumát.
  - Egykattintásos biztonságos fájlletöltés és megtekintés.
  - Egykattintásos hozzárendelés a dolgozóhoz (`assignJobDescriptionToEmployee`), amely `Munkaköri leírás` kategóriájú `hr_dokumentum` tételt képez és bejegyzi a `hr_esemeny_naplo`-ba.
  - Intelligens státuszjelző: zöld pipa ha már iktatva van vagy hozzá van rendelve; figyelmeztető badge, ha új verzió érhető el a katalógusból.
- **Mt. szerinti Dinamikus Munkaköri Leírás Generátor (`ContractGeneratorDialog`):**
  - Új sablon: "Hivatalos Munkaköri Leírás".
  - Automatikusan beemeli a dolgozó személyes adatait, belépési idejét, munkarendjét és közvetlen vezetőjének nevét.
  - Dinamikusan integrálja a munkakör FEOR kódját, besorolási szintjét, célját/küldetését (`leiras`), feladatait és hatásköreit (`feladatok_es_hataskorok`), elvárt kompetenciáit (`elvart_kompetenciak`), valamint munkavédelmi előírásait.
  - Generálás és mentés után azonnal iktatható a dolgozó eaisyDocs személyi dossziéjába.
- **Biztonságos Letöltési API (`src/app/api/hr/download-document/route.ts`):** Hitelesített, RLS-védett végpont a Supabase Storage-ben tárolt HR és munkaköri leírás dokumentumok közvetlen letöltéséhez és előnézetéhez admin fallbackkel.
- **TDD Tesztek:** Kibővített tesztkészlet (`src/utils/__tests__/hr-filing-bridge.test.ts`), 10/10 sikeres teszt.
- **Döntési háttér:** [PRD P-026](../product/decisions/P-026-hr-document-templates-and-lifecycle-filing-roadmap.md), [ADR A-026](../architecture/decisions/A-026-employee-personal-dossier-and-hr-filing-bridge.md).

### 📁 eaisyHR ↔ eaisyDocs Munkavállalói Személyi Dosszié & Hivatalos Iktatási Híd (B9)
- **Munkavállalói Személyi Dosszié Modell:** A vak, tömeges dokumentum-áttöltés helyett megvalósítottuk a munkajogi és irattári törvényeknek megfelelő központi személyi dosszié struktúrát ([ADR A-026](../architecture/decisions/A-026-employee-personal-dossier-and-hr-filing-bridge.md)).
- **Automatikus Dosszié Megnyitás & Alszám Képzés:** A dolgozó első dokumentumának iktatásakor a rendszer automatikusan megnyitja a központi személyi dossziét (`HR/ÉV/SORSZÁM - [Dolgozó Neve] személyi dossziéja`), majd a későbbi dokumentumok ebbe a dossziéba kerülnek gap-mentes alszámként (`.../1`, `.../2`, stb.).
- **50 Éves Megőrzési Szabályzat & Irattári Tétel:** A dokumentumok automatikusan a `3.1 - HR és Munkaügyi dokumentumok` irattári tételhez rendelődnek, 50 éves lejárati idővel és selejtezési tilalommal.
- **GDPR & Bizalmas Minősítés:** Minden iktatott HR irat alapértelmezetten `bizalmas` minősítést kap, garantálva, hogy illetéktelenek nem láthatják az eaisyDocs-ban a dolgozói munkabér, egészségügyi vagy személyes adatokat.
- **Kétirányú Polimorf Integritás (`irat_kapcsolat`):** Az irat és az ügyirat közvetlenül összekapcsolódik a `munkavallalo` és a `hr_dokumentum` entitásokkal `belso` forrással.
- **Iktatott Iratok Törlés Elleni Védelme:** Az iktatást követően a dokumentum nem törölhető a HR felületről sem véletlenül, sem szándékosan; a törlés gomb helyét lakat ikon veszi át a jogszabályi integritás biztosítására.
- **Felhasználói Felület (`FileHrDocumentDialog`):** Linear-stílusú iktatási ablak, szerkeszthető irattárggyal, dosszié-előnézettel, státusz badge-ekkel (zöld iktatott iktatószámmal vs. szürke belső HR vázlat), és közvetlen hivatkozással az eaisyDocs dosszié nézetre ([PRD P-025](../product/decisions/P-025-employee-document-filing-and-dossier-ux.md)).
- **Teszteltség:** Tiszta TDD tesztkészlet ([src/utils/__tests__/hr-filing-bridge.test.ts](../../src/utils/__tests__/hr-filing-bridge.test.ts)) és valós adatbázison sikeresen lefutott E2E verifikáció.

### 🏷️ Globális Legördülő Menü Címke-Feloldás (Base UI Select Auto-Labeling)
- **Hiba oka:** A `@base-ui/react/select` nem vizsgálta meg a zárt állapotban lévő elemek belső DOM-ját, és ha a `Select.Root` nem kapott explicit `items` szótárat, a kiválasztott érték nyers kulcsát (pl. `ceg`, `vevo`, `atutalas`, `aktiv`, UUID) jelenítette meg az emberi felirat helyett.
- **Globális Megoldás (`src/components/ui/select.tsx`):** A `Select` komponens rendereléskor automatikusan rekurzívan végigpásztázza a gyermekelemeket (`collectSelectItems`, `extractText`), kinyeri az összes `SelectItem` szöveges feliratát vagy explicit `label` attribútumát, és automatikusan átadja a Base UI store-nak a feloldó `items` szótárat.
- **Alkalmazott Javítás:** Az alkalmazás összes (37+) Select mezője (Partner adatok, iktatási ablak, HR modulok, keresők) mostantól megbízhatóan és automatikusan a felhasználóbarát magyar feliratot jeleníti meg a nyers kódok helyett.

### 🏢 Partnertörzs Bővítése & Kapcsolattartó Kezelés (B7 / MAN-05)
- **Kettős Besorolási Rendszer:** Jogi forma (`tipus`: Cég, Magánszemély, EV, Hivatal) és Üzleti szerepkör (`szerepkor`: Vevő, Szállító, Mindkettő, Hatóság, Bank, Egyéb) szétválasztása.
- **Pénzügyi & Szerződéses Feltételek:** `bankszamlaszam`, `fizetesi_hatarido_nap`, `fizetesi_mod` (Banki átutalás, Készpénz, Bankkártya, Egyéb) kezelése.
- **Kapcsolattartók Alrendszer:** `partner_kapcsolattarto` relációs tábla, elsődleges kapcsolattartó kijelölés, CRUD műveletek és dialógus.
- **Partner Státusz:** `aktiv` / `inaktiv` státuszkezelés, közvetlen gyorsváltó kapcsoló.

### 📊 Dashboard Statisztikai Bővítés & Dinamikus Időszakszűrő (MAN-04)
- **Dinamikus Iratforgalom Trend:** Az AreaChart nem fix 7 napos, hanem a felső szűrő (`Ma`, `7 nap`, `Hónap`, `Év`, `Összes`) alapján dinamikusan számolja az adatpontokat és igazítja a felbontást (órás, napi, havi), a fejlécet és a magyarázó szövegeket.
- **Bizonylattípus-megoszlás (Recharts Vízszintes BarChart):** A kiválasztott időszak iratainak és ügyiratainak kategorizált kimutatása (Számlák és pénzügyi bizonylatok, Szerződések, HR & munkaügy, Igazolások & jegyzőkönyvek, Kereskedelmi és általános iratok) darabszámmal, százalékos aránnyal és egyedi színkódokkal.
- **Top Partnerek kimutatás:** A legaktívabb küldők és címzettek rangsora, bejövő és kimenő darabszámokkal, valamint relatív forgalmi aránymutatókkal.
- **Linear-Inspirált 2 Soros Prémium Elrendezés:**
  - 1. sor: Iratforgalom (2 oszlop) + Érkezési csatornák fánkdiagram (1 oszlop)
  - 2. sor: Bizonylattípus-megoszlás (2 oszlop) + Top partnerek (1 oszlop)
  - 3. sor: Lejáró határidők & Saját feladataim

### ⚡ Globális Gyorskereső és Parancsközpont (`Ctrl + K`) [MAN-03]
- **Dedikált Keresőoldal Kivezetése:** A bal oldali menüből eltávolításra került a külön `/search` navigációs gomb; közvetlen URL látogatás esetén szerveroldali átirányítás történik a főoldalra a paraméterek átadásával.
- **Egyesített Command Palette (`Ctrl + K` / `⌘K`):** A jobb felső fejlécben lévő keresősávból vagy a globális `Ctrl+K` gyorsbillentyűvel bármelyik képernyőről megnyitható a felugró parancsközpont és intelligens kereső.
- **Megőrzött és Teljes Funkcionalitású Keresőmotor:**
  - Valós idejű gépelés közbeni gyorskeresés (Ügyiratok, Partnerek, Dokumentumok).
  - Postgres Magyar FTS (`kereso_vektor`) és hibrid szemantikus keresés (`search_iratok_hybrid` RPC) teljes szöveges szövegrészlet-kiemeléssel (`snippet`), pontszámokkal és találati jelölőkkel (`Szemantikus`, `Hibrid`).
- **Beépített Részletes Szűrőpanel:** Partner neve, iktatószám, érkeztetőszám, irat iránya, minősítés, valamint dátumintervallum szerinti szűrés aktív szűrőcímkékkel és számlálóval.
- **Mentett Keresések és Értesítési Alertek:**
  - Keresési feltételek mentése egyedi névvel és profilkezeléssel.
  - Egykattintásos értesítési alert ki/bekapcsolás (`Bell` / `BellOff`) új, feltételeknek megfelelő bejövő iratok esetén.
  - Mentett profilok azonnali betöltése és törlése közvetlenül a felugró ablakból.
- **Keresési Előzmények és Gyorsparancsok:** Legutóbbi keresések tárolása (`localStorage`), egykattintásos újrafuttatás és törlés, valamint üres keresőnél gyors navigációs parancsok (Új érkeztetés, Iktatókönyv, Saját feladataim, Partnerek).

### 🏢 Magyar Adószám és Külföldi / EU Adóazonosító Szétválasztása (MAN-02)
- **Különválasztott Adatstruktúra:** `partner.kulfoldi_adoszam` új oszlop és index (`idx_partner_clean_kulfoldi_adoszam`) a migrációban (`20260930000001_add_partner_kulfoldi_adoszam.sql`).
- **Determinisztikus Szétválasztó Motor:** [`src/utils/tax-number.ts`](../../src/utils/tax-number.ts) a magyar 8/11 jegyű adószámok és az EU közösségi / külföldi azonosítók (PIB, TIN, stb.) pontos formázására és egybefűzött számlasorok szétválasztására.
- **AI Kinyerési Pontosítás:** Frissített Gemini 2.5 Flash prompt és fallback logika a belföldi kötőjeles formátum (`partner_adoszam`) és a közösségi EU VAT / külföldi azonosító (`partner_kulfoldi_adoszam`) elkülönített kinyerésére.
- **Megújult Iktatási Panel & Partner Dialógus:** A felhasználó az iktatásnál (`filing-panel-client.tsx`) és a partnertáblázatban (`partner-dialog.tsx`, `partners-table-client.tsx`) egymás mellett, külön beviteli mezőben látja és szerkesztheti mindkét azonosítót.
- **TDD Tesztkészlet:** 8/8 zöld teszt ([src/utils/__tests__/tax-number.test.ts](../../src/utils/__tests__/tax-number.test.ts)).
- **Döntési dokumentáció:** [ADR A-023](../architecture/decisions/A-023-tax-number-foreign-vat-separation.md).

### 🛡️ AI E-mail Spam és Relevancia Előszűrő (MAN-01)
- **Kétlépcsős (2-Tier) szűrőmotor:** Tier 1 mintaelemzés (számla/szerződés csatolmány prioritás, bounce/postmaster tiltás) + Tier 2 Gemini 2.5 Flash kétértelmű levelekre.
- **Fail-open biztonsági garancia:** Hiba vagy hiányzó API kulcs esetén egyetlen valós üzleti irat sem veszhet el.
- **IMAP Integráció:** Beépítve a háttér e-mail letöltőbe ([src/utils/imap-service.ts](../../src/utils/imap-service.ts)), a kiszűrt spam nem kap érkeztetőszámot, azonnal olvasottnak jelölve.
- **TDD Tesztkészlet:** 5/5 zöld teszt ([src/utils/__tests__/email-spam-filter.test.ts](../../src/utils/__tests__/email-spam-filter.test.ts)).
- **Döntési dokumentáció:** [ADR A-022](../architecture/decisions/A-022-email-spam-and-relevance-prefilter-architecture.md).

### 🔍 Teljes Kódbázis Mély-Audit és Dokumentáció-Szinkronizáció (Zero-Hallucination Revisions)
- **Központi Döntéstár Teljes Felülvizsgálata:**
  - 21 Építészeti Döntés ([ADR A-001 - A-021](../architecture/decisions/index.md)) ellenőrizve és szinkronizálva a valós forráskóddal (`A-020`: REST API v1, `A-021`: Időzített Cronok).
  - 23 Termék és UX Döntés ([PRD P-001 - P-023](../product/decisions/index.md)) auditálva valós komponensekkel (`P-019`: Tasks Kanban/Calendar, `P-020`: Beágyazható Widget, `P-021`: Elválasztólap Generátor, `P-022`: Dosszié Megosztás/Sablonok, `P-023`: Vezetői Jóváhagyási Műszerfal).
  - 7 Üzleti Szabályzat ([BRD 001 - 007](../business/decisions/index.md)) pontosítva a valós működési logika szerint (Mt. törvényi követelmények és jelenleg működő szoftverlogika szétválasztása, prefix-alapú gap-mentes iktatószámok).
- **Adatbázis Sémák Valós Kódhoz Igazítása (106 SQL migráció, 65 tábla):**
  - Fiktív táblák és oszlopok felszámolása: `fajl` → `irat_fajl` (`storage_path`, `pdfa_path`, `sha256`, `ocr_szoveg`).
  - Irattár: `fizikai_tarolas` → `irat_fizikai_hely` (`epulet`, `szoba`, `szekreny_polc`, `doboz`), `irat_kolcsonzes` → `irat_kolcsonzes_naplo`, `irattari_terv`.
  - Munkaügy (eaisyHR): `munkavallalo` → `hr_dolgozo_adatlap`, `munkavallalo_adatok` → `hr_dolgozo_titkos_adat` (BYTEA oszlopok és `get_decrypted_hr_data` RPC), `hr_allashirdetes`, `hr_toborzas`.
  - Integráció: `partner` (`nev`, `adoszam`, `cegjegyzekszam`), `irat_kapcsolat` (`entitas_tipus`, `entitas_id`, `entitas_forras`, `kapcsolat_tipusa`).
- **Útvonaltérkép és Információs Architektúra Frissítése:**
  - Az összes valós Next.js 15 App Router útvonal (köztük a korábban tévesen "tervezettnek" jelölt `/partners`, `/tasks`, `/hr/time`, `/hr/recruitment`, `/hr/onboarding`, `/hr/offboarding`, `/embed/partner-dossiers`, `/karrier/[id]`) felvétele éles/kész státusszal a [product/information-architecture.md](../product/information-architecture.md) nyilvántartásba.

### 📚 Dokumentációs Architektúra és Döntéstár (Teljes Visszamenőleges Rendszerezés)
- **Automatikus Szinkronizáció:** `scripts/doc-sync.ts` CLI és `.agents/skills/eaisydocs-doc-sync/` fejlesztési segédeszköz üzembe állítása.
- **Moduláris Függetlenségi Szerződés:** eaisyDocs és eaisyHR teljes adatbázis- és működésbeli szétválasztásának formális specifikálása ([A-005](../architecture/decisions/A-005-hr-modular-independence-architecture.md), [BRD-003](../business/decisions/003-hr-modular-independence-contract.md)).
- **Mester Tervezet Excel:** Folyamatosan frissített, asztali Excel tervfájl (`eaisyDocs_es_eaisyHR_Mester_Tervezet.xlsx`) 76 eaisyDocs és 53 eaisyHR tétellel, állapotkövetéssel és KPI összesítőkkel.

### 📊 Főoldal & Vezérlés
- **Új Vezetői és Operatív Dashboard:** Recharts forgalmi trenddel, csatorna-eloszlási donut diagrammal, lejáró határidők visszaszámlálójával és saját feladatok blokkjával ([P-001](../product/decisions/P-001-interactive-dashboard-analytics-ux.md)).
- **Időszak szűrés:** `Összes`, `Ma`, `7 nap`, `Hónap`, `Év` szerinti azonnali adatkalkuláció.

### 🔗 eaisyBill Integráció
- **Csatorna ENUM szétválasztás:** Az eaisyBill számlaimportok immár külön `'eaisybill'` érkezési móddal kerülnek rögzítésre ([A-003](../architecture/decisions/A-003-eaisybill-channel-enum-migration.md)).
- **Migráció:** Korábbi 'rendszer' típusú számlák visszamenőleges átírása.

---

## [Sprint 2026-09-29] – Commit `fb7e748`

### 🗄️ Irattár & Selejtezés
- **Szigorú 4-szem elv ellenőrzés:** A javaslattevő iratkezelő nem hagyhatja jóvá a saját selejtezését ([A-001](../architecture/decisions/A-001-four-eyes-disposal-validation.md), [BRD-002](../business/decisions/002-strict-four-eyes-disposal-governance.md)).
- **Dinamikus csomagkezelés:** Részleges selejtezéskor új lezárt csomag jön létre a jegyzőkönyvvel.
- **Hiteles PDF jegyzőkönyv:** A valós felterjesztő neve kerül az aláírási záradékba.
- **Jegyzőkönyv Popover:** Érintett ügyiratok és iratok tételes listája közvetlenül a táblázatból ([P-002](../product/decisions/P-002-archive-protocol-popover-ux.md)).

### 👁️ Előnézet & Iktatás
- **`DocumentPreviewFrame` bevezetése:** Memóriabeli Blob URL izoláció Next.js iframe hibák és HTML beágyazódás ellen ([A-002](../architecture/decisions/A-002-document-preview-blob-isolation.md)).
- **Iktatási ütközésvédelem javítása:** Saját mentés Realtime eseménye nem blokkolja a felületet, Toast sikerüzenet ([P-003](../product/decisions/P-003-filing-realtime-collision-guard-ux.md)).
- **Kötegelt szkenner:** PDF worker szerveroldali bundling és stream olvasás ([A-004](../architecture/decisions/A-004-batch-scanner-stream-fallback.md)).

---

## [Alaprendszer Mérföldkövek] – Visszamenőleges Implementációs Leltár (~100-100 óra)

### 📂 eaisyDocs – Teljes Digitális Iratkezelő Rendszer
1. **Érkeztetés & Bejövő Csatornák:**
   - Multi-channel érkeztető postaláda (manuális feltöltés, kötegelt szkenner OCR előkészítéssel, automatikus IMAP email figyelő háttérfolyamat).
   - Realtime érkeztetési számláló és azonnali PDF split-view.
2. **Iktatás & Ügyiratkezelés:**
   - Gap-mentes, biztonságos sorszámallokáció (`iktatoszam_allokacio`, prefixek: `NYILV`, `IKT`, `HR`, tranzakciós atomi léptetés).
   - Dinamikus ügyiratfa (ügyiratok összekapcsolása, szerelvényezés, alszámok és tételszámok).
   - Iktatókönyv és részletes kereső magyar ékezetmentes FTS indexeléssel és pgvector szemantikus kereséssel (`search_iratok_hybrid`).
3. **Fizikai Irattár & Kölcsönzés:**
   - Hierarchikus tárolóhely-nyilvántartás (`irat_fizikai_hely`: Épület / Szoba / Polc / Doboz).
   - Fizikai kölcsönzési modul (`irat_kolcsonzes_naplo`: kikérés, átadás-átvételi bizonylat, lejárati sürgetés, visszavétel).
4. **Megőrzés & Selejtezés:**
   - Megőrzési idők kalkulációja irattári terv (`irattari_terv`) alapján.
   - Selejtezési javaslatok generálása (`selejtezes_csomag`, `selejtezes_tetel`), szakértői bizottsági jóváhagyás, 4-szem elv RLS szinten, hiteles jegyzőkönyv generálás.
5. **Biztonság & Integritás:**
   - SHA-256 hash generálás minden feltöltött fájlra (`irat_fajl.sha256`).
   - Szigorúan append-only eseménynapló (`esemeny_naplo`).
   - 4 dimenziós ABAC/RBAC jogosultságkezelés RLS szinten (szerepkör, osztály, minősítés, hozzárendelés).

### 👥 eaisyHR – Komplex Vállalati Munkaügyi és HR Rendszer
1. **Dolgozói Törzs & Karton:**
   - 360 fokos digitális személyi karton 13 füllel (`hr_dolgozo_adatlap`).
   - Szenzitív adatok és béradatok oszlopszintű védelme (`hr_dolgozo_titkos_adat`, BYTEA mezők) a `get_decrypted_hr_data` Security Definer RPC rétegen keresztül.
2. **Munkaidő & Jelenlét (Timesheet):**
   - Napi munkaidő rögzítés (`hr_jelenlet`: Check-in/Check-out, ledolgozott órák).
   - Kicsekkoláskori automatikus túlóra delta kalkuláció (`calculate_tulora_on_checkout` trigger, `hr_tulora_egyenleg`).
   - Havi jelenléti ívek digitális lezárása (`hr_havi_jelenlet_zaras`).
   - Munkaszüneti napok nyilvántartása (`hr_munkaszuneti_nap`).
3. **Szabadságkezelés & Helyettesítés:**
   - Szabadságkeret számítás (`hr_szabadsag_egyenleg`, `hr_tavollet`).
   - Szabadságigénylési munkafolyamat és automatikus helyettesítési megbízás (`hr_helyettesites`).
4. **Onboarding & Offboarding:**
   - Automatizált beléptetési és kiléptetési feladatlisták (`hr_onboarding`, `hr_offboarding`).
   - Munkaszerződés és munkaköri leírás automatikus generálása (`hr_munkakor_leiras_verzio`).
   - Kilépési checklist, eszközelszámolás és strukturált exit interjú analitika (`hr_kilepes_interju`).
5. **Toborzás (ATS) & Publikus Karrieroldal:**
   - Nyitott pozíciók menedzsmentje (`hr_allashirdetes`), publikus álláshirdetés és CV feltöltő felület (`/karrier/[id]`).
   - Jelölt Kanban pipeline (`hr_toborzas`), automatikus Google GenAI CV elemzés (`/api/hr/parse-cv`), interjú Twilio SMS értesítések.
   - GDPR megfelelőség (önéletrajzok automatikus törlése / anonimizálása retenciós idő után).
6. **Teljesítményértékelés (KPI) & Egyéni Fejlesztési Terv (IDP):**
   - Vállalati és egyéni KPI célkitűzések (`hr_kpi_katalogus`), értékelési ciklusokkal (`hr_teljesitmeny_ciklus`, `hr_teljesitmeny`).
   - Egyéni fejlesztési terv (`hr_fejlesztesi_terv`, `hr_fejlesztesi_cel`, `hr_idp_megjegyzes`).
7. **Cafeteria & Dolgozói Önkiszolgálás (ESS):**
   - Éves cafeteria keretösszeg felosztása SZÉP Kártya és egyéb elemek között (`hr_cafeteria_nyilatkozat`).
   - Céges szabályzatok és munkaköri leírások elektronikus nyugtázása.
8. **Hatósági Riportok:**
   - NAV 'T1041 elektronikus bejelentő fájl generálása ÁNYK importra (`/hr/reports`).
   - KSH létszám és statisztikai adatszolgáltatás export.

## [2026-09-30] - Dashboard Letisztítás & Gombok Eltávolítása
- **Scope:** [Docs]
- **Komponens:** [`src/components/dashboard-overview.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/dashboard-overview.tsx)
- **Változások:**
  - Eltávolításra került az „Új Érkeztetés” és a „Szkenner” gyorsműveleti gomb az időszakszűrő sáv jobb oldaláról.
  - Az időszakszűrő fülek (`Összes`, `Ma`, `7 nap`, `Hónap`, `Év`) zavartalanul működnek tovább a bal oldalon.
  - Felesleges importok (`PlusCircle`, `ScanLine`, `buttonVariants`) törölve.

## [2026-09-30] - Partnertörzs Bővítés & Kapcsolattartói Rendszer (B7 - 5.1)
- **Scope:** [Docs] / [Közös]
- **Komponensek & Migráció:**
  - [`supabase/migrations/20260930000002_partner_expansion.sql`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/supabase/migrations/20260930000002_partner_expansion.sql)
  - [`src/app/partners/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/partners/page.tsx)
  - [`src/app/partners/partners-table-client.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/partners/partners-table-client.tsx)
  - [`src/app/partners/[id]/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/partners/%5Bid%5D/page.tsx)
  - [`src/components/partner-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/partner-dialog.tsx)
  - [`src/components/partner-contact-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/partner-contact-dialog.tsx)
  - [`src/components/partner-status-toggle.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/partner-status-toggle.tsx)
  - [`src/app/partners/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/partners/actions.ts)
  - [`src/utils/partner-matcher.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/partner-matcher.ts)
- **Változások:**
  - **Kettős besorolás:** Jogi forma (`ceg`, `maganszemely`, `egyeni_vallalkozo`, `intezmeny`) mellé bevezetve az Üzleti szerepkör (`vevo`, `szallito`, `mindketto`, `hatosag`, `bank`, `egyeb`).
  - **Új tábla:** `partner_kapcsolattarto` kapcsolattartó személyek nyilvántartására (név, beosztás, email, telefon, elsődleges jelölés) RLS védelemmel.
  - **Partner lista (`/partners`):** 4 KPI kártya, 6 gyors szűrőfül, iratszámláló pill badge, székhely és szerepkör megjelenítés, aktív/inaktív szűrés.
  - **Partner adatlap (`/partners/[id]`):** Kimenő iratok bekötése az iratforgalomba, Kapcsolattartók menedzselése fül, pénzügyi és bankszámla kártya, aktív/inaktív státusz toggle gomb, belső ügyintézői megjegyzés kártya, gyors érkeztetési link előkitöltéssel.
  - **Partner dialógus (`PartnerDialog`):** 3 füles űrlap, élő duplikáció-figyelmeztető sáv adószámra és névre, elsődleges kapcsolattartó gyorsfelvétel.
  - **Döntések:** [A-024](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/docs/architecture/decisions/A-024-partner-dual-classification-and-contacts-architecture.md), [P-024](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/docs/product/decisions/P-024-partner-directory-and-contact-management-ux.md).

