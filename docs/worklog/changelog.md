# eaisyDocs & eaisyHR – Rendszer Változásnapló (Changelog)

Minden jelentős fejlesztési mérföldkő, release és sprint időrendi naplója.

## [Unreleased] – Fejlesztés alatt (2026-10-24)

### eaisyHR: Helyettesítési Rendszer Korszerűsítése, Automatikus Reconciliáció és Fejléc Modál (ADR A-084, PRD P-114)
- **Fejléc Integrált Helyettesítés Modál (`src/components/hr/substitute-dialog.tsx`, `src/app/hr/self-service/time/page.tsx`):**
  - Eltávolításra került a lap alján elterülő széles kártya (`SubstituteSettingsCard`), letisztítva a dolgozói Jelenlét és Szabadság oldalt.
  - Létrejött az új `SubstituteDialog` komponens, amely közvetlenül az „Új Távollét Kérelem” akciógomb mellé került a fejlécben.
  - Inaktív állapotban tiszta körvonalas gombként jelenik meg, aktív helyettesítéskor elegáns zöld/teal státusz jelvénnyel mutatja a kijelölt helyettes nevét (pl. `Helyettesítés [Kovács Anna]`).
  - Kattintásra kompakt felugró ablak nyílik meg, ahol beállítható az új helyettes és az időszak, illetve aktív helyettesítésnél azonnal megszüntethető a megbízás.
- **Közvetlen, Időtartam-alapú Útvonalválasztás (`src/app/hr/self-service/actions.ts`):**
  - A `submitLeaveRequest` és `submitTimeCorrection` új kérelmeknél elsődlegesen a `hr_helyettesites` tábla aktív dátumablakát (`kezdet_datuma <= ma <= veg_datuma`) ellenőrzi.
  - Megszűnt az a hibás korlátozás, hogy a helyettesítés csak akkor élt, ha a vezetőnek már volt előzetesen jóváhagyott saját szabadsága rögzítve.
- **Automatikus Kérelem-átszignálás és Munkaidő Korrekció Támogatás (`actions.ts`):**
  - Helyettesítés mentésekor (`saveSubstitute`) a vezetőnél lévő összes függőben lévő kérelem (`hr_tavollet` és `hr_jelenlet_korrekcio`) automatikusan átkerül a helyetteshez.
  - Kézi törléskor (`deleteSubstitute`) a függő kérelmek azonnal visszaszállnak az eredeti vezetőre.
- **Automatikus Lejárati Reconciliáció (`src/utils/hr/substitute-sync.ts`):**
  - Létrejött a `syncExpiredSubstitutions()` központi ellenőrző mechanizmus, amely a vezetői felület (`/hr/manager`) és a dolgozói jelenléti ív (`/hr/self-service/time`) betöltésekor automatikusan lefut.
  - Ha a helyettesítés végdátuma lejárt (`veg_datuma < ma`), a rendszer lezárja a helyettesítést (`aktiv: false`), és a helyettesnél el nem bírált összes függő kérelmet automatikusan visszaszignálja az eredeti vezető asztalára.
- **Felesleges Teszt Gomb Kivezetése (`src/components/hr/hr-tasks-and-alerts-table.tsx`):**
  - Véglegesen törlésre került a felesleges és zavaró „Függő Kérelmek Átszignálása” (`ReassignLeavesButton`) gomb.
- **Jelenléti Ív Havi Kontextus Tisztázás (`src/components/hr/employee-timesheet.tsx`, `src/app/hr/attendance-actions.ts`):**
  - A havi statisztikai sávban a kártyák (`Ledolgozott Órák`, `Munkanapok`, `Távollét`) megkapták a `sub="Ebben a hónapban"` jelölést, egyértelművé téve, hogy az értékek a kiválasztott naptári hónap adatait mutatják.
  - Javítva a havi távollétek lekérdezése `getMonthlyTimesheet`-ben valós intervallum-átfedésre (`lte(kezdet_datuma, endDate)` és `gte(veg_datuma, startDate)`).

## [Unreleased] – Fejlesztés alatt (2026-10-23)

### eaisyHR & eaisyDocs: Dolgozói Portál Hivatalos Dokumentum Előnézet és Jogosultság Javítás
- **Fájlfeloldási és Routing Robusztusítás (`src/app/api/pdf/[id]/route.ts`):**
  - Megszűnt a 404-es „Fájl nem található az irathoz” hiba, amikor a dolgozói felület az `hr_dokumentum` azonosítóját adta át az `irat_fajl` azonosítója helyett.
  - A route mostantól prioritási láncot használ: (1) konkrét `irat_fajl` id egyezés, (2) legfrissebb csatolt fájl az adott `irat_id`-hoz, (3) közvetlen `hr_dokumentum` tárolási útvonal feloldása.
  - A szervezeti egység és biztonsági minősítés ellenőrzése kibővült a dolgozói tulajdonjog vizsgálatával (`isEmployeeOwner`), így a munkavállaló minden esetben biztonságosan megtekintheti a saját iktatott iratait.
- **Kliensoldali Előnézet és Letöltés Megerősítés (`employee-documents-view.tsx`, `recent-documents-card.tsx`, `DocumentViewer`):**
  - A `DocumentViewer` a hibás id helyett az irat közvetlen azonosítóját és storage/signed URL-jét használja, hiba esetén azonnali direct signed URL fallback-kel.
  - A dolgozói dokumentumok szerveroldali lekérésekor (`self-service/documents/page.tsx`) generálásra kerülnek az érvényes aláírt URL-ek, biztosítva a megbízható közvetlen letöltést és gyorsmegtekintést.

### eaisyHR: Párhuzamossági (Concurrency), Biztonsági és Adatintegritási Megerősítés (ADR A-083)
- **Letöltési API Végpont Javítása (`src/app/api/hr/download-document/route.ts`):**
  - Javítva a hibás táblanév hivatkozás: `hr_munkakor_verzio` helyett a létező `hr_munkakor_leiras_verzio` táblát kérdezi le a route, megszüntetve a normál munkavállalók 403 Forbidden hibáját a hivatalos munkaköri leírások letöltésekor.
- **Szabadságkérelmek Vállalati Kötése és Átfedés-szűrés (`src/app/hr/self-service/actions.ts`):**
  - A `submitLeaveRequest` és `submitOvertimeRequest` során a `hr_tavollet` táblába bekerül az aktív `company_id`, így a havi bérszámfejtési motor (`payroll/actions.ts`) pontosan figyelembe veszi a szabadságokat.
  - Beépítésre került a meglévő, nem elutasított távollétekkel való átfedés-ellenőrzés.
- **Atomi Jelenlét (Munkaidő) Rögzítés (`src/app/hr/attendance-actions.ts`):**
  - A `saveAttendanceRecord` select-then-insert versenyhelyzete helyett atomi PostgreSQL `upsert` (`onConflict: "dolgozo_id,datum"`) került bevezetésre, kizárva a duplikált kérésekből fakadó `23505 unique_violation` és PGRST116 hibákat.
- **Szerveroldali Jogosultsági Megerősítés (`manager/actions.ts`, `cafeteria-actions.ts`):**
  - A távollét jóváhagyása és elutasítása szerver oldalon ellenőrzi az aktuális jóváhagyó kilétét, a vezetői hierarchiát (`get_hr_subordinates`), illetve a HR/admin szerepkört, megakadályozva a jogosulatlan és ön-jóváhagyásokat.
  - A `submitCafeteriaDeclaration` ellenőrzi az éves keretösszeg túllépését, a `setCafeteriaBudget` és `reopenCafeteriaDeclaration` műveleteket pedig kizárólag HR és admin szerepkörű felhasználók hajthatják végre.
- **Adatbázis RLS Megerősítés (`supabase/migrations/20261023000004_fix_hr_audit_security_and_rls.sql`):**
  - A `hr_tavollet` UPDATE szabály felkészítésre került a kijelölt helyettes (`aktualis_jovahagyo_id`) jóváhagyására és a `hr_szerepkor` mező vizsgálatára.
  - Megszűntek a nyílt RLS szabályok az `hr_orvosi_vizsgalat`, `hr_fegyelmi` és `hr_elozo_munkahely` táblákon (GDPR megfelelőség: dolgozó csak a sajátját látja, módosítani csak HR jogosult).
- **eaisyDocs Függetlenség Garancia:**
  - A módosítások kizárólag a `hr_` táblákat és eaisyHR szerver akciókat érintik, az eaisyDocs iratkezelő rendszer adatmodellje és működése teljes mértékben változatlan és védett maradt.

### eaisyHR: Munkakör Adatlap Fejléc Tisztítás, Dolgozói Kereső/Szűrő és Valós Avatar Betöltés (P-113 Kiegészítés)
- **Fejléc Tisztítás & Zero-Emoji Megfelelőség (`src/app/hr/job/[id]/page.tsx`):**
  - Eltávolításra került a munkakör címe melletti dekoratív `Briefcase` ikondoboz, elegáns, tiszta szöveges elrendezést adva a fejlécnek.
  - A „Dolgozó hozzárendelése” gombokból eltávolításra került a dekoratív `UserPlus` ikon (`AssignEmployeeDialog`).
- **Kanonikus Keresés és Szűrés a Hozzárendelt Dolgozóknál (`src/components/hr/job-assigned-employees-table.tsx`):**
  - A Dolgozók fül táblázata felé beépítésre került a kanonikus `TableToolbar`, instant név és szerepkör szerinti kereséssel, szerepkör szerinti dinamikus szűrővel és találati számlálóval.
- **Valós Dolgozói Avatar Betöltés (`AvatarImage`):**
  - A beosztások lekérdezése kiegészítésre került a `felhasznalo_profil.avatar_url` mezővel, a táblázat pedig `<AvatarImage src={emp.avatarUrl} alt={emp.nev} className="object-cover" />` segítségével jeleníti meg a valódi profilképet, megbízható monogramos tartalékkal.

### eaisyHR: Hivatalos Munkaköri Leírás Generátor és Automatikus Verziószám-növelés (v1 -> v2) (P-113 Kiegészítés)
- **Dinamikus A4 PDF Generáló Motor (`generateJobDescriptionVersionAction` in `src/app/hr/job/[id]/actions.ts`):**
  - A munkakör aktuálisan rögzített adataiból (megnevezés, FEOR-08 kód, szervezeti egység, feladatok, elvárt kompetenciák, orvosi vizsgálatok, egyéni védőeszközök) és az aktív cég profiljából (`getActiveCompanyServer`) a Puppeteer segítségével szabványos, Munka Törvénykönyve (Mt. 45. § (4)) szerinti hivatalos munkaköri leírást generál.
  - Automatikus sorszámozás: meglévő verziók alapján kiszámítja a következő sorszámot (`v{nextVersion}`). Amennyiben a felhasználó bármilyen adatot módosít (pl. inline feladat vagy FEOR kód) és újra generál, a fájl és a nyilvántartás automatikusan a következő verziót kapja (`_v1` helyett `_v2`, majd `_v3`, stb.).
  - Szabványos, ékezetmentes fájlnév: `Munkakori_Leiras_{cleanName}_v{nextVersion}.pdf` (pl. `Munkakori_Leiras_Junior_Fejleszto_v2.pdf`).
  - Feltöltés és bejegyzés: a PDF automatikusan felkerül az `irat_files` tárolóba (`munkakor-leirasok/{jobId}/v{nextVersion}_{timestamp}.pdf`), és bekerül a `hr_munkakor_leiras_verzio` táblába.
- **Generátor Dialógus és UI Integráció (`src/components/hr/job-description-upload.tsx`, `src/app/hr/job/[id]/page.tsx`):**
  - A „Hivatalos Munkaköri Leírás” fülön közvetlen elsődleges gombként elérhető a „Munkaköri leírás generálása (v{nextVersion})”.
  - Generálás előtt előnézeti dialógus jeleníti meg a következő verziószámot, a generált fájlnevet, az összes dokumentumba kerülő adatot (feladatok száma, kompetenciák, munkavédelem), valamint opcionális verzió megjegyzést enged rögzíteni.
  - A verziólistában a legfrissebb hatályos verzió külön kiemelt „Legfrissebb hatályos” jelvényt kap.
  - A korábbi verziók megtekintése böngészőben (`PdfViewerDialog`), letöltése és szükség esetén törlése változatlanul biztosított.

### eaisyHR: Munkakör Adatlap UI/UX Átdolgozás és Szervezeti Egység Nézettel Való Harmonizáció (P-113)
- **Teljes Szélességű Layout és Morzsamenü (`src/app/hr/job/[id]/page.tsx`):**
  - A szűk `max-w-5xl` konténer helyett a Szervezeti Egység (`/hr/orgunit/[id]`) oldalhoz hasonló, teljes szélességű `space-y-6 pb-10` elrendezés került bevezetésre.
  - Kanonikus morzsamenü: `Szervezeti felépítés > Munkakör-katalógus > [Munkakör neve]`.
- **Harmonizált Fejléc és Műveletek:**
  - Kerekített vissza navigációs gomb, elegáns kártyaikon doboz (`Briefcase`, `bg-primary/10 border-primary/20`), kiemelt munkakörnév és besorolási szint, közvetlen hivatkozás a hozzárendelt szervezeti egységre és FEOR-08 azonosító.
  - A fejléc jobb szélére költöztek a műveleti gombok: „Munkakör szerkesztése” (`JobEditDialog`) és a zöld „Dolgozó Hozzárendelése” (`AssignEmployeeDialog`).
- **Linear Flat KPI Grid (`KpiCard`):**
  - 4 oszlopos statisztikai kártyasor: **Hozzárendelt dolgozó**, **Szervezeti egység**, **FEOR-08 Foglalkozás**, **Besorolási szint**.
- **Strukturált Négyfülös Tab Rendszer:**
  - **Dolgozók (X):** Teljes értékű táblázat monogramos Avatarokkal, dolgozói profillinkkel, kanonikus `roleLabel` szerepkör jelvénnyel, formázott belépési dátummal és megerősítést kérő piros `X` eltávolítási művelettel (`RemoveEmployeeButton`).
  - **Munkaköri Profil & Feladatok:** Kiegyensúlyozott 2 oszlopos kártyarács a feladatok/hatáskörök felsorolásával és az elvárt kompetenciák jelvényeivel.
  - **Munkavédelem & Egészségügy:** 2 oszlopos kártyák a bejelentett munkavédelmi kockázatokkal, egyéni védőeszközökkel és a kötelező foglalkozás-egészségügyi vizsgálatokkal/gyakorisággal.
  - **Hivatalos Munkaköri Leírás (Y):** Önálló fül a verzionált hivatalos dokumentumokhoz és feltöltéshez (`JobDescriptionUpload`).
- **Közvetlen Kártyaszintű és Soron Belüli (Inline) Mezőkitöltés:**
  - **Dolgozó hozzárendelése helyben:** A Dolgozók kártyafejlécében közvetlenül elérhető az `AssignEmployeeDialog`, valamint üres állomány esetén közvetlen hozzárendelési gomb jelenik meg a táblázatban.
  - **Kattintható KPI kártyák:** A felső KPI sáv kártyáira kattintva a hozzárendelt dolgozó dialógus, illetve az Alapadatok fül azonnal megnyílik.
  - **Azonnali inline feladat- és kompetenciarögzítés (`JobProfileTasksSection`):** Közvetlenül a kártyákon található beviteli mező Enter leütéssel vagy hozzáadás gombbal aszinkron szerver akcióval (`addJobTaskAction`, `addJobCompetencyAction`) azonnal elmenti az új elemet, a törlés pedig tételenként azonnal végrehajtható.
  - **Dedikált kártyafejléc szerkesztőgombok:** A Munkavédelem, Foglalkozás-egészségügy és Alapadatok kártyák mind rendelkeznek önálló „Szerkesztés” gombbal, amelyek a `JobEditDialog` megfelelő fülét nyitják meg célzottan (`initialTab="safety"` / `"general"` / `"tasks"`).
- **Zero-Emoji és No-Decorative-Icons Megfelelőség:**
  - Nincsenek emojik és dekoratív buborékok; letisztult szövegközpontú üres állapotok.

### eaisyHR: Szervezeti Felépítés Fül- és Gombszintű Ikoneltávolítás (Zero-Emoji & No-Decorative-Icons)
- **Tiszta Szöveges Tabok (`src/components/hr/organization-tabs-view.tsx`):**
  - Eltávolításra kerültek a tabok feliratai elől a felesleges dekoratív ikonok (`Network`, `Building2`, `Briefcase`). A fülek tiszta szöveges címkékkel és darabszám jelvénnyel jelennek meg: **Szervezeti Ábra**, **Szervezeti Egységek (X)**, **Munkakör-katalógus (Y)**.
- **Táblázati Fejlécek és Jelvények Tisztítása:**
  - A szervezeti egységek és munkakörök táblázatában a betöltött létszám jelvényből (`Badge`) eltávolításra került a dekoratív `Users` ikon, kizárólag a letisztult `X fő` szöveges érték jelenik meg.
- **Műveleti Gombok Letisztítása (`src/components/hr/job-action-menu.tsx`, `src/components/hr/org-unit-action-menu.tsx`):**
  - Az „Adatlap” navigációs gombok elől eltávolításra került a dekoratív `FileText` ikon, illeszkedve a tiszta szöveges műveleti gombok irányelvéhez.
- **Fanapló és Üres Állapotok Tisztítása (`src/components/hr/org-chart-tree.tsx`):**
  - Az üres állapotból és a fanapló kártyafejlécekből eltávolításra kerültek a dekoratív `Building2`, `Users` és `UserCircle2` ikonok, szövegközpontú, professzionális elrendezést biztosítva.

### eaisyHR: Titoktartási Nyilatkozat Tanúk és Nyomtatási Nézet Hibajavítás (P-112 Kiegészítés)
- **Tanúk és Alsó Blokk Elérhetősége és Megjelenése (`src/components/hr/contract-generator-dialog.tsx`):**
  - Megszüntettük az előnézeti modál alsó levágási hibáját: a dokumentum-konténert egy bőséges (`pb-20 pt-1`) görgetési térközzel rendelkező burkolóelembe helyeztük, így a modál aljára görgetve a teljes lap és az összes tanúmező teljesen, kényelmes margóval láthatóvá válik.
  - A Titoktartási Nyilatkozat tipográfiáját és sorközeit arányosítottuk (`space-y-3.5`, `leading-normal`), így a teljes nyilatkozat a fejléccel, jogi szakaszokkal és a két tanú blokkjával együtt tökéletesen ráfér egy szabványos A4-es lapra.
  - A tanúzási blokk struktúráját professzionálisá tettük: külön 1. és 2. Tanú felirat, dedikált aláírási vonal „Aláírás” felirattal, valamint pontozott mezők a Név, Lakcím és Személyi igazolvány szám számára.
- **Izolált, Tiszta Nyomtatás Iframe Segítségével (`handlePrint`):**
  - A `window.print()` direkt hívását leváltottuk egy rejtett `<iframe>` alapú nyomtatási motorra, amely kizárólag a dokumentum tartalmát és nyomtatási stíluslapjait tölti be.
  - Ezzel elhárultak a korábbi nyomtatási hibák: nem jelenik meg a modál fekete háttere (`DialogOverlay`), nem vágja le a tartalom végét a `max-h-[90vh]` és nem látszik a háttérben lévő dolgozói adatlap sem.
- **Globális Dialógus Nyomtatási Szabályok (`src/app/globals.css`):**
  - A billentyűzetről indított natív `Ctrl+P` nyomtatás esetére is hozzáadtuk a szabályokat: `body:has([data-slot="dialog-content"]) main { display: none !important; }`, a dialógus sötét háttere és bezárás gombja elrejtésre kerül, maga a tartalom pedig statikus, görgetősáv nélküli nyomtatási konténerré alakul.

### eaisyHR: Munkaügyi Sablonok Teljes Körű Átdolgozása és Automatikus Adat-előtöltés UX (P-112)
- **100%-os Automatikus Adat-előtöltés Minden Sablonban:**
  - `hr_dolgozo_adatlap` kibővítve `szuletesi_hely` oszloppal (SQL migráció `20261023000003_add_szuletesi_hely_to_hr_dolgozo_adatlap.sql`), és integrálva a személyes adatok szerkesztésébe.
  - Létrejött a `getEmployeeContractFillData` szerver akció, amely automatikusan feloldja a dolgozó összes személyes, titkosított (TAJ, adójel, bankszámla, alapbér) és munkaköri adatát.
  - Az `EmploymentContractPanel` ezt azonnal kezdeti állapotként (`initialPersonalData`) betölti, így a szerződéskészítő mezői automatikusan kitöltve jelennek meg.
- **Bérmódosítás (Mt. 58. §) Interaktív Vezérléssel és Hivatalos Fejléccel:**
  - Interaktív vezérlősávval ellátva: az új bruttó havi alapbér és a hatálybalépés dátuma valós időben beépül a dokumentum szövegébe.
  - Jogilag precíz Mt. 58. § szerinti kétoldalú megállapodás céges fejléccel és felek azonosítóival.
- **Titoktartási és Adatvédelmi Nyilatkozat (NDA):**
  - Kibővítve a 2018. évi LIV. törvény, az Mt. 8. § és a Btk. 418. § szerinti jogkövetkezményekkel és hivatalos tanúzási záradékkal.
- **Kanonikus Szerződésgenerátor Integrálása (`src/components/hr/contract-generator-dialog.tsx`):**
  - Az elavult, hiányos pontozott vonalakat tartalmazó „Alap Munkaszerződés” mockup sablon teljesen lecserélésre került a hivatalos, onboardingban már alkalmazott `EmploymentContractPanel` és `employment-contract-pdf-generator.ts` motorra.
  - A sablonválasztóban a tétel megnevezése: **`Hivatalos Munkaszerződés (Mt. 42–45. §)`**, amely alapértelmezett választásként azonnal megjelenik.
- **Teljes Munkaügyi Életciklus a Dolgozói Adatlapról:**
  - A dolgozó adatai (személyes adatok, munkakör, bér, szervezeti egység) automatikusan előtöltődnek.
  - Generáláskor pontosan ugyanaz a prémium, 8 fejezetes A4-es jogi PDF munkaszerződés jön létre, mint az onboardingban.
  - Támogatott az in-place PDF megtekintés (`PdfViewerDialog`), közvetlen letöltés, eaisyDocs iktatás, aláírt példány kezelés, valamint a kötelező **Mt. 46. § Írásbeli Munkáltatói Tájékoztató** kiállítása.
- **Egyéb Sablonok Megtartása:**
  - A Hivatalos Munkaköri Leírás, Bérmódosítási Tájékoztató és Titoktartási Nyilatkozat (NDA) továbbra is elérhető a sablonválasztóból.

### eaisyHR: 360° Dolgozói Profil Hivatalos Dokumentumok Kereső és Szűrősáv UX (P-110)
- **Önálló `OfficialDocumentsTab` Kliens Komponens (`src/app/hr/employee/[id]/tabs/OfficialDocumentsTab.tsx`):**
  - A korábban `page.tsx`-ben inline renderelt hivatalos iratlista kiváltásra került egy tiszta, típusbiztos kliens tab komponensbe, illeszkedve a tabkönyvtár struktúrájához.
- **Kanonikus `TableToolbar` Integrálása (ADR A-029 & PRD P-043):**
  - **Élő keresőmező:** Azonnali szűrés a dokumentum neve (`nev`), iktatószáma (`iktatoszam`) és kategóriája (`kategoria`) alapján, egykattintásos `X` törlő gombbal.
  - **Szűrés Popover (Tematikus szűrőcsoportok):**
    - *Iktatási státusz:* Iktatva (eaisyDocs) / Belső HR vázlat.
    - *Aláírási állapot:* Aláírt példány / Tervezet (nem aláírt).
    - *Dokumentum kategória:* Dinamikusan előállított kategórialista az adatlapon lévő iratokból.
  - **Találati információ:** Számláló jelvény a toolbar jobb szélén (`Találatok: X / Y` vagy `Összesen: Y dokumentum`).
  - **Szűrők egykattintásos törlése:** Teljes szűrési és keresési állapot azonnali visszaállítása.
- **Szövegközpontú Üres Állapotok:**
  - Keresési eredmény hiánya esetén tiszta, professzionális üres állapot közvetlen szűrőtörlési gombbal (Zero-Emoji és No-Decorative-Icons szabályzat).
- **Munkaköri Leírás Felső Sáv Redundanciájának Megszüntetése (`JobDescriptionBadgeAction`):**
  - Ha a munkaköri leírás már hozzá van rendelve a dolgozóhoz (vagy le van iktatva), a felső különálló fix sáv elrejtésre kerül, mivel az irat a dokumentumlistában a többi irathoz hasonlóan már jelen van.
  - A sáv kizárólag akkor bukkan fel HR-es felhasználók számára, ha a központi katalógusból újabb verzió érhető el átvételre. Eltávolításra került a dekoratív kerekített ikonbox is.
- **`src/app/hr/employee/[id]/page.tsx` Karcsúsítása:**
  - Az inline JSX blokk és a felesleges dialógus importok eltávolítva, átadva a helyét a szabványos `<OfficialDocumentsTab ... />` meghívásnak.

### eaisyHR: 360° Dolgozói Profil Munkaviszony Fül Letisztítása és Munkavédelmi Oktatások Áthelyezése (P-109)
- **Munkavédelmi és Tűzvédelmi Oktatások Áthelyezése a Bizalmas Fülre (`src/app/hr/employee/[id]/page.tsx`):**
  - A `SafetyTrainingEmployeeCard` komponens átkerült a `Munkaviszony` fülről a **`Bizalmas HR adatok`** (`bizalmas`) fülre, közvetlenül a foglalkozás-egészségügyi Orvosi Alkalmassági Vizsgálatok (`MedicalTab`) alá.
  - Így az összes munkavédelmi & egészségügyi megfelelőségi adat (EHS compliance) egyetlen dedikált, biztonságosan auditált helyen érhető el.
  - A `munkavedelmi` szerepkörű felhasználók jogosultak az oktatások és vizsgálatok megtekintésére és új jegyzőkönyv rögzítésére ezen a fülön.
- **Munkaviszony Fül Letisztítása:**
  - A Munkaviszony fül fókusza kizárólag a szerződéses és beosztási jogviszonyra korlátozódik:
    - *Jogviszony és Munkarend* (`EmploymentTab`): beosztás, munkakör, munkaidő (FTE), munkarend, vezető, bérkategória, és beosztás-idővonal (Timeline).
    - *Tanulmányi Szerződések* (`StudyContractTab`) változatlanul megtartva.
- **Zero-Emoji és No-Decorative-Icons Megfelelőség (`src/components/hr/safety-training-employee-card.tsx`):**
  - Eltávolításra került a dekoratív `HardHat` védősisak ikon a kártya címsorából és az üres állapotból (empty state).
  - Tisztított, professzionális szekciócímek (`border-b pb-2`) piros `text-destructive` színezés nélkül.

### eaisyHR: Munkavédelmi Oktatás Kiemelése a Dolgozói Profilban és Főoldali Cafeteria Integráció (P-108)
- **Munkavédelmi Oktatás Kiemelése a Dolgozói Profilban (`src/app/hr/self-service/profile/page.tsx`):**
  - A profil Hero fejlécében az Orvosi vizsgálat mellett kiemelt chipként megjelenik a `Munkavédelem` érvényessége és figyelmeztető állapota (zöld érvényes a hátralévő napokkal, sárga 30 napon belül lejáró, piros lejárt vagy hiányzó).
  - Az Alapadatok kártya kiegészült a Munkavédelmi Oktatás sorral, feltüntetve az oktatás típusát (Munkavédelmi / Tűzvédelmi), érvényességi idejét, az oktató nevét és a megtartás napját.
  - A számítás a központi `@/utils/hr/safety-compliance-calculator` modulra épül.
- **Dolgozói Főoldali Cafeteria Közvetlen Kezelés (`src/app/hr/page.tsx`):**
  - A cafeteria doboz közvetlenül a dolgozói irányítópulton helyezkedik el, biztosítva a gyors és egykattintásos nyilatkozattételt.
  - A szerveroldali adatelőkészítés párhuzamosított `Promise.all` hívásokkal fut, felkészítve a hitelesített `iktatoszam` megjelenítésére.
  - Eltávolításra került a korábbi dekoratív `Coffee` ikon a Zero-Emoji & No-Decorative-Icons irányelvnek megfelelően.
- **Oldalsáv Letisztultság (`src/components/hr-sidebar.tsx`):**
  - Nem került be feleslegesen különálló Juttatások aloldal link az oldalsávba, megőrizve a 8 pontos kompakt Dolgozói Portál struktúrát.
- **Zero-Emoji & No-Decorative-Icons:** 100%-os megfelelőség betartva.

### eaisyHR: Egyéni Fejlesztési Terv (IDP) Teljes Átdolgozása és Tanúsítvány-igazolási Munkamenet (A-082 / P-106)
- **Adatbázis séma bővítés (`hr_fejlesztesi_cel`):**
  - Hozzáadva: `mentor_id`, `intezmeny`, `koltseg`, `finanszirozas`, `tanusitvany_url`, `tanusitvany_nev`, `tanusitvany_feltoltve_at`, `elutasitas_indoklas`.
- **Dinamikus mentor és szerződés-választás (`src/components/hr/idp/idp-dialog.tsx`):**
  - Céges munkatársak dinamikus legördülő kiválasztása (`getCompanyMentorsAction`).
  - Képző intézmény, finanszírozási típus és képzési díj rögzítése.
  - Mt. 229. § tanulmányi szerződések dinamikus hozzákapcsolása (`getEmployeeStudyContractsAction`).
- **Munkavállalói önkiszolgáló életciklus (`src/components/hr/idp/employee-idp-view.tsx` & `src/app/hr/self-service/idp/page.tsx`):**
  - Linear-flat KPI statisztikai sáv: Összes cél, Folyamatban, Jóváhagyásra vár, Sikeresen teljesítve.
  - "Elkezdtem a felkészülést" gomb nyitott céloknál.
  - "Tanúsítvány feltöltése és leadás" folyamatban lévő céloknál (`IdpCertificateUploadDialog`, PDF/kép, max 10MB).
  - Feltöltött tanúsítvány biztonságos időkorlátos megtekintése (`IdpCertificateViewerDialog`).
  - Vezetői visszajelzés és javításkérés kezelése azonnali javítási lehetőséggel.
  - Kör alakú dekoratív ikondobozok eltávolítása az üres állapotból (Zero-Emoji és No-Decorative-Icons megfelelőség).
- **Vezetői jóváhagyási panel és automatizmusok (`src/components/hr/idp/idp-list-card.tsx` & `src/app/hr/actions/idp-actions.ts`):**
  - In-place tanúsítvány előnézet, egykattintásos jóváhagyás és kötelező indoklásos visszaküldés (`IdpRejectionDialog`).
  - Jóváhagyáskor automatikus beemelés a munkavállaló képzettségei közé (`hr_kepzettseg`) és a dokumentumtárba (`hr_dokumentum`).
  - Részletes dolgozói adatlapi KPI fejléc (`src/app/hr/employee/[id]/tabs/IDPTab.tsx`).

### eaisyHR: HR Teendők és Figyelmeztetések Dolgozói Csoportosítás, Valódi Avatarok és Kanonikus TableToolbar (P-107)
- **Dolgozónként csoportosított lista nézet (`src/components/hr/hr-tasks-and-alerts-table.tsx`):**
  - Accordion-szerű dolgozói kártyák a vezetői jóváhagyási mintához hasonlóan.
  - Alapértelmezett állapot: minden kártya összecsukva (bezárva) nyílik meg (`expandedEmployees = new Set()`), célzott egyedi lenyitási lehetőséggel.
  - Sürgősségi rendezés: a lista élén a kritikus határidejű vagy feladatú dolgozók foglalnak helyet.
  - Fejléc információk: Munkavállaló neve, munkaköre, feladatok száma (`X teendő`), legmagasabb súlyosságú jelvény (`kritikus`, `figyelmeztetés`), és közvetlen „Adatlap” link a dolgozó profiljára.
- **Valódi Profilkép / Avatar Integráció (`src/app/hr/admin/page.tsx`):**
  - A szerveroldali teendő-lekérdezések kiegészültek a `felhasznalo_profil ( id, nev, avatar_url )` kiválasztásával.
  - Az `employeeAvatarMap` és `employeeNameAvatarMap` feloldásnak köszönhetően a dolgozói kártyákon a munkavállaló valódi profilképe jelenik meg, monogramos fallbackkel.
- **Kanonikus TableToolbar Integráció és Letisztult Vezérlősáv:**
  - Eltávolításra került a korábbi felesleges „Mind kinyitása · Mind összecsukása” gomppár és a redundáns `X teendő • Y érintett dolgozó` felirat.
  - A kétállású nézetváltó (`Dolgozói nézet` és `Táblázat`) közvetlenül a `TableToolbar` `actions` blokkjába integrálódott a függő kérelmek átszignálása gomb mellé.
  - A kártyafejléc alsó térköze (`pb-2`, `pt-0`) optimalizálásra került, így a keresősáv szorosan és kompakt módon a főcím alá került.
  - A kártya címe egyszerűsítve: „Teendők és figyelmeztetések”.
- **Zero-Emoji és No-Decorative-Icons Irányelv:** 100%-os megfelelőség, nincsenek emojik és nincsenek díszítő buborékok.

## [Unreleased] – Fejlesztés alatt (2026-10-21)

### ⏱️ eaisyHR: Saját Kérelmek Egységesítése a Jelenlét és Szabadság Oldalon
- **Teljes körű Saját Kérelmek Lista (`src/app/hr/self-service/time/page.tsx` & `src/components/hr/leave-history-list.tsx`):**
  - Korábban a „Saját kérelmeim” kártyán kizárólag a szabadságkérelmek (`hr_tavollet`) kerültek lekérdezésre, így az időkorrekciós kérelmek (`hr_jelenlet_korrekcio`) és a túlóra felhasználási igények (`hr_tulora_felhasznalás`) nem jelentek meg a listában.
  - A szerveroldali lekérdezés kiegészült a felhasználó saját `hr_jelenlet_korrekcio` és `hr_tulora_felhasznalás` rekordjaival.
  - A `LeaveHistoryList` egységesített struktúrában, időrendben (legújabb elöl) jeleníti meg az összes kérelmet:
    - **Szabadság / Távollét:** Típus (pl. `SZABADSÁG`), dátumtartomány, munkanapok száma, jóváhagyott esetben igazolás megtekintése/letöltése.
    - **Munkaidő korrekció:** `MUNKAIDŐ KORREKCIÓ` felirat és `IDŐKORREKCIÓ` jelvény, érintett dátum, kért idősáv (valamint az eredeti idő, ha volt korábban csekkolás), megadott indoklás és esetleges elutasítási indoklás.
    - **Túlóra igény:** Típus (`Csúsztatás` vagy `Kifizetés`), időtartam órában/percben, indoklás.
  - **Zero-Emoji és No-Decorative-Icons szabályzat teljesítése:** Megszűnt a felesleges kerekített dekoratív ikondoboz (`rounded-full bg-primary/10`), a megjelenítés letisztult, tipográfiailag strukturált Linear-flat stílust követ.
  - **Státusz fülválasztó a Saját Kérelmeknél (`src/components/hr/leave-history-list.tsx`):**
    - A vezetői felülethez hasonlóan a dolgozói oldalon is beépítésre került a szegmentált státusz szűrő: **`Összes`**, **`Folyamatban`**, **`Jóváhagyott`** és **`Elutasított`** állapotgombok dinamikus számláló jelvényekkel.
    - Ha egy adott státuszban nincsenek elemek, tiszta és informatív szöveges állapotüzenet tájékoztatja a felhasználót az üresség okáról.
  - **Azonnali szinkronizáció (`src/components/hr/attendance-correction-dialog.tsx`):** Időkorrekciós kérelem beküldésekor a felület a `router.refresh()` segítségével azonnal frissíti a szerveroldali adatokat és a Saját kérelmeim listát.

### 🎯 eaisyHR: Dolgozói Célkitűzések Lista Nézet és Összesített KPI Sáv Refaktorálás (A-080 / P-104)
- **Kanonikus Lista Nézet és In-Place Kibontás (`src/components/hr/employee-kpi-card.tsx`):**
  - Megszűnt a vízszintes tab/pill gombos célkiválasztó, amely rossz élményt nyújtott több cél esetén.
  - Helyette az áttekintő és vezetői nézethez hasonló **tisztán strukturált lista nézet** (`GoalListItem` kártyák):
    - Cél címe, értékelési ciklus neve, célérték jelvény (pl. `200 000 Ft` vagy `Minőségi mérföldkő`), prioritás súlyozás (`1.5x`).
    - Önértékelési állapot jelvény: kiemelt `Te jössz! (Önértékelésre vár)` pulzáló jelvény, ha az adott célhoz a dolgozónak még értékelést kell leadnia.
    - Fázis jelvény és in-place kibontó/becsukó gomb (`Részletek` / `Becsukás` + animált chevron).
    - Alapértelmezetten minden cél bezárva (összecsukva) jelenik meg a felhasználói kérésnek megfelelően.
- **Párosított Cél és Elért Eredmény Munkasáv (`src/components/hr/employee-kpi-card.tsx` & `performance-list.tsx`):**
  - Megszűnt az értelmetlen és zavaró `Elért eredményed (darabszám/összeg/százalék):` felirat.
  - Helyette a cél és az elért eredmény közvetlenül egymás mellé került egy 2-oszlopos, szimmetrikus kártyában:
    - Bal oldal: a kitűzött célérték lezárt, formázott dobozban (pl. `KITŰZÖTT ÖSSZEG:` `200 000 Ft`, vagy `KITŰZÖTT DARABSZÁM:` `10 db`).
    - Jobb oldal: a dolgozó vagy vezető által rögzítendő elért eredmény beviteli mezője közvetlenül mellette, kizárólag a releváns mértékegységgel (pl. `ELÉRT ÖSSZEG:` `[ 200 000 ] Ft`).
    - A `getMetricFieldLabels()` segédfüggvény dinamikusan a céltípusnak megfelelő, pontos feliratokat biztosítja (`osszeg` esetén `Kitűzött összeg` / `Elért összeg`, `szam` esetén `Kitűzött darabszám` / `Elért darabszám`, `szazalek` esetén `Kitűzött célérték` / `Elért százalék`, `skala` esetén `Kitűzött pontszám` / `Elért pontszám`).
  - Eltávolításra került a felesleges `Összes kibontása` gomb a felső sávból a felhasználói kérésnek megfelelően.
- **Közvetlen Vezetői Műveletek (`src/components/hr/performance-list.tsx`):**
  - A korábbi hibát dobó 3-pöttyös menü helyett közvetlen, azonnal elérhető `Szerkesztés` és `Törlés` gombok találhatók a KPI sorok végén.
- **Kontextus-érzékeny Üres Állapotok a Teljesítményértékelésben (`src/components/hr/performance-list.tsx`):**
  - Megszűnt a megtévesztő, hibás üres állapot („Nincs találat a megadott szűrésre / állítsd alaphelyzetbe a szűrőket”), amely akkor is megjelent, amikor a rendszerben egyszerűen még nem voltak célok felvéve.
  - Helyette 4-szintű, pontos és intelligens állapotkezelés:
    1. **Még nincsenek rögzített célok:** Tiszta tájékoztató üzenet + beágyazott `+ Új KPI Hozzáadása` gomb azonnali célkitűzéshez.
    2. **Valódi szűrési/keresési feltétel miatti üresség:** Csak akkor jelenik meg a „Nincs találat a megadott szűrésre” és a „Szűrők törlése” gomb, ha a felhasználó ténylegesen gépelt a keresőbe vagy bepipált egy szűrőt.
    3. **Lezárt fül üressége:** „Még nincsenek lezárt célkitűzések” + közvetlen gomb az „Ugrás az aktuális célkitűzésekhez”.
    4. **Aktuális fül üressége (minden lezárva):** „Nincsenek folyamatban lévő célkitűzések” + gomb a „Lezárt célkitűzések megtekintése” nézetre.
- **Vezetői Nézet (Csapat áttekintés) Teljes Refaktorálása és KPI-mentesítése (`src/app/hr/manager/page.tsx`, `manager-team-tabs.tsx`):**
  - Megszűnt az aszimmetrikus, zsúfolt 2-hasábos rács (`2/3` bal oszlop kérelmekkel és naptárral, `1/3` jobb oszlop beosztottakkal és üres fehér térrel).
  - Törlésre kerültek a felesleges, helypazarló statisztikai chipek a fejlécből; helyette tiszta, azonnal átlátható fejléc és diszkrét függő kérelem számláló jelvény került kialakításra.
  - Új, kanonikus **`ManagerTeamTabs`** komponens bevezetése 3 teljes képernyőszélességű, fókuszált munkaterülettel:
    1. **`Jóváhagyások`:** Teljes szélességű kérelmi kezelőfelület (szabadság, munkaidő korrekció, túlóra), kényelmes jóváhagyási és elutasítási gombokkal, dekoratív ikonoktól mentes, tiszta szöveges üres állapottal.
    2. **`Csapatnaptár`:** A korábbi összenyomott állapot helyett teljes képernyőszélességet kapott, így a havi/heti nézet cellái tágasak, jól olvashatók.
    3. **`Közvetlen beosztottak`:** Letisztult lista és kártyás csapatnézet azonnali keresővel, kanonikus `TableToolbar`-ral, jelenléti státusz szűrővel és közvetlen elérhetőséggel.
  - **Valós idejű `hr_jelenlet` becsekkolás integráció:**
    - Megszűnt a korábbi mesterséges „Irodában” feltételezés. A rendszer a `hr_jelenlet` táblát ellenőrzi a mai napra:
    - Ha a munkatárs ma becsekkolt (és még nem csekkolt ki), a státusza dinamikusan **`Becsekkolva`** (zöld jelvénnyel és az időponttal: pl. `Becsekkolva (08:42)`).
    - Ha még nem csekkolt be, diszkrét semleges **`Nincs becsekkolva`** felirat jelenik meg.
    - Ha kicsekkolt, **`Kicsekkolt`** állapotot lát a vezető.
    - Jóváhagyott szabadság esetén **`Távol`**, függő kérelem esetén **`Függő kérelem`** jelenik meg.
  - **Dolgozói Szintű Csoportosítás és Keresés a Kérelmeknél (`src/components/hr/unified-approvals-panel.tsx`):**
    - Megszűnt az ömlesztett, időrendi lista, amelyben a különböző munkatársak kérelmei összekeveredve jelentek meg.
    - Helyette a kérelmek **dolgozói szinten csoportosítva** jelennek meg: minden kolléga egy dedikált dobozt kap fejléccel (Avatar, név, kérelmek darabszáma), és az ő kérelmei szépen, strukturáltan egymás alatt sorakoznak.
    - **Azonnali dolgozói kereső:** Új magas kontrasztú keresőmező (`Search`), amellyel a vezető azonnal rászűrhet egy adott kolléga (pl. Kelemen Roberta vagy HR vezető) kérelmeire.
    - **Tömeges jóváhagyás dolgozónként:** Ha egy munkatársnak több függő kérelme is van, a fejlécben megjelenik az `Összes jóváhagyása (db)` gyorsgomb, miközben az egyedi elbírálás lehetősége is megmarad.
    - **Átfogó Státusz Fülválasztó (Elbírálásra váró / Jóváhagyott / Elutasított):**
      - A felhasználói igény alapján a vezető nemcsak a függőben lévő kérelmeket, hanem a korábbi döntések előzményeit is áttekintheti.
      - A `UnifiedApprovalsPanel` fejlett belső szegmentált fülválasztót kapott (`Elbírálásra váró [X]`, `Jóváhagyott [Y]`, `Elutasított [Z]`), dinamikus számláló jelvényekkel.
      - A szerveroldali lekérdezések (`src/app/hr/manager/page.tsx`) kibővültek mindhárom státusz (`jovahagyasra_var`, `jovahagyva`, `elutasitva`) betöltésére, miközben a fejléc számlálója pontosan a függő teendőket jelzi.
      - Az elbírálásra váró fülön a funkcionális `Elutasít` és `Jóváhagy` akciógombok jelennek meg; a jóváhagyott kérelmeknél zöld `Jóváhagyva` jelvény, az elutasítottaknál piros `Elutasítva` jelvény és az elutasítás rögzített indoklása látható.
      - Jóváhagyás vagy elutasítás esetén a tétel állapota helyben frissül, így azonnal átkerül a megfelelő fül alá és visszakereshető marad.
    - **Jóváhagyott Kérelmek Megtekintése és Letöltése (PDF Generálás & In-Place Megtekintő):**
      - **Új Munkaidő Korrekciós PDF Végpont (`src/app/api/hr/attendance-correction-pdf/route.ts`):** A szabadságokhoz hasonlóan mostantól a jóváhagyott jelenléti/munkaidő korrekciós kérelmekhez is hivatalos, A4 formátumú, professzionális PDF igazolás készül (dolgozó adatai, érintett nap, eredeti és kért idősáv, indoklás, jóváhagyó vezető neve, dátum és digitális aláírási blokkok).
      - **Jogosultság kiterjesztés a vezetők számára (`src/app/api/hr/leave-pdf/route.ts` & `attendance-correction-pdf`):** A saját jog és a HR/Admin szerepkör mellett a közvetlen vezetők (`kozvetlen_vezeto_id` vagy `jovahagyo_id`) is jogosultak a jóváhagyott igazolások letöltésére és megtekintésére.
      - **Megtekintés és Letöltés a Saját Kérelmekben (`src/components/hr/leave-history-list.tsx`):** A dolgozó a „Jelenlét és szabadság” lapon a jóváhagyott szabadságai mellett mostantól a jóváhagyott munkaidő korrekcióit is azonnal megtekintheti beépített modálban (`PdfViewerDialog`), illetve egyetlen kattintással letöltheti PDF-ként.
      - **Megtekintés és Letöltés a Vezetői Nézetben (`src/components/hr/unified-approvals-panel.tsx`):** A vezető a „Jóváhagyott” fül alatt a beosztottak szabadságaihoz és munkaidő korrekcióihoz is közvetlenül eléri a `Megtekintés` (`Eye`) és `Letöltés` (`Download`) műveleteket.
  - Intelligens alapértelmezés: ha van elbírálásra váró kérelem, a nézet automatikusan a `Jóváhagyások` füllel nyílik meg a gyors elintézés érdekében, egyébként közvetlenül a `Csapatnaptár` jelenik meg.
- **Rendszerszintű Zero-Emoji és No-Decorative-Icons Szabály Rögzítése (`.agents/AGENTS.md` & `AGENTS.md`):**
  - Eltávolításra került az üres állapot kártyák felesleges kör alakú dekoratív célkereszt ikonbuborékja (`performance-list.tsx`, `employee-kpi-card.tsx`).
  - Eltávolításra kerültek az indokolatlan ikonok a felső gombokról: „Riportok” (`BarChart3` ikon törölve) és „Ciklusok kezelése” (`Settings` ikon törölve).
  - A projekt vezérelvei közé (`.agents/AGENTS.md`) és a gyökér `AGENTS.md`-be szigorú szabályként rögzítésre került a felesleges dekoratív ikonok és az emojik teljes tiltása a felületeken és a kódban.
- **Értékelési Ciklusok Életciklusának Radikális Egyszerűsítése (`src/components/hr/manage-cycles-dialog.tsx`, `actions.ts`):**
  - Megszűnt a mesterséges, bürokratikus 4-státuszos ciklusállapot-gép (`tervezes` → `nyitott` → `ertekeles` → `lezart`), ami felesleges gombnyomogatásokra kényszerítette a felhasználót.
  - Helyette a tiszta **2-állapotú modell** lépett életbe: **Felvétel (azonnal Aktív) → Lezárás ha vége** (opcionális újranyitási lehetőséggel).
  - Új ciklus rögzítésekor a ciklus azonnal `nyitott` (Aktív) státuszba kerül, nincs szükség külön „Megnyitás” gombra.
  - Aktív ciklus esetén egyetlen tiszta művelet érhető el: **„Ciklus lezárása”** (`Lock` ikonnal), lezárt ciklusnál pedig az **„Újranyitás”** gomb.
  - A modál fejléce elől eltávolításra került a felesleges naptár ikon, és a pop-up szélessége kényelmes, görgetésmentes `sm:max-w-4xl` méretre növekedett.
- **Számszerű Célok és Minőségi Mérföldkövek Támogatása (`src/components/hr/add-kpi-dialog.tsx`, `edit-kpi-dialog.tsx`, `actions.ts`):**
  - Rugalmas választó a célérték típusára (`Minőségi mérföldkő` vs `Számszerű metrika`), mértékegységekkel (`db`, `Ft`, `%`, `1-10 pont`), dinamikus pontszám újraszámítással.

### 🎯 eaisyHR: 5-Lépéses Emberközpontú Teljesítményértékelési Workflow és Dolgozói Célok Portál (A-079 / P-103)
- **Százalékmentes, Emberi Munkafolyamat Modell (`src/components/hr/kpi-workflow-stepper.tsx`):**
  - Mesterséges matematikai százalékok (`0%`, `75%`), csúszkák és bináris `[Nem] / [Igen]` kapcsolók teljes megszüntetése.
  - A rendszer kizárólag a **5 mérföldköves emberi folyamatra** épül: *1. Célkitűzés (rögzítve)* → *2. Önértékelés (dolgozói portálról)* → *3. Vezetői értékelés (visszajelzés)* → *4. 1-on-1 Megbeszélés (személyes egyeztetés)* → *5. Lezárva (hitelesített lezárás)*.
  - Kanonikus `KpiWorkflowStepper` komponens számozott csomópontokkal és tiszta állapotjelzéssel.
- **Egyetlen, Seamless `divide-y` Vezetői Munkaterület (`src/components/hr/performance-list.tsx`):**
  - Megszűnt a korábbi 3 külön keretezett doboz egymásra halmozása.
  - Helyette 3 letisztult elválasztott szakasz: Felső folyamatsáv az 5 mérföldkővel; Középső fókuszált munkaterület, amely csak az adott lépés teendőjét mutatja (pl. önértékelésre várás és közvetlen `Értékelés azonnal` gomb, szöveges vezetői értékelés, vagy 1-on-1 megbeszélés jóváhagyó form); Alsó diszkrét előzménysor kényelmes, széles megjegyzésmezővel (`Megjegyzés hozzáfűzése...`).
  - Dolgozói fejlécben százalékok helyett: `0/1 cél lezárva • Összesen 1 kitűzött KPI`, valamint folyamatjelvény.
- **Dedikált Dolgozói Önkiszolgáló Célkezelő Oldal (`src/app/hr/self-service/goals/page.tsx` & `src/components/hr/employee-kpi-card.tsx`):**
  - A célok interaktív kezelésének leválasztása a személyes profilról külön dedikált oldalra a felhasználói kérésnek megfelelően.
  - Kanonikus `KpiCard` összegzők: *Aktív Értékelési Ciklus*, *Kitűzött Céljaim*, *Folyamat Állapota* és *Önértékelés Teendő*.
  - `SingleGoalWorkspace` kártya: cél címe, ciklusa, prioritás súlyozása, folyamatsáv, önértékelés űrlap gondolatébresztő kérdésekkel és szerkesztési lehetőséggel.
- **Célkitűzés Modálok Radikális Egyszerűsítése (`add-kpi-dialog.tsx` & `edit-kpi-dialog.tsx`):**
  - Törlésre kerültek a felesleges mértékegység-választók, cél- és kezdeti érték mezők.
  - Egy új cél rögzítése mindössze: Munkatárs + Megnevezés + Ciklus + Prioritás súlyozás (`Normál 1x`, `Kiemelt 1.5x`, `Stratégiai 2x`).

### 🎯 eaisyHR: Vezetői Teljesítményértékelés Modul Teljes Megújítása (A-078 / P-102)
- **Kanonikus KPI Mérőszámcsík (`src/app/hr/performance/page.tsx`):**
  - 4 db Linear-flat `KpiCard` a fejléc alatt: *Aktív Ciklus*, *Érintett Dolgozók* (részvételi arány), *Kitűzött Célok (KPI)* (átlag/fő) és *Vezetői Értékelésre Vár* (önértékelés után pontozandó célok).
  - Törlésre került a felesleges, fejlesztői jellegű kék `Alert` információs doboz.
- **Kanonikus `TableToolbar` és Intelligens Szűrés (`src/components/hr/performance-list.tsx`):**
  - Instant gépelési kereső: kolléga neve, beosztása és célkitűzés címe alapján.
  - Tematikus `Szűrés` Popover: Értékelési Ciklusok, Workflow Fázisok (1–5) és Teljesítmény Sávok (`Kiváló`, `Normál`, `Fejlesztendő`).
  - Újracsiszolt, cselekvőképes Empty State közvetlen célrögzítési és cikluskezelési gombokkal.
  - Linear-flat dolgozói kártyák profilképpel, beosztással, haladási mutatóval és prémium kategória badge-dzsel.
- **Vállalati KPI Sablontár (`hr_kpi_katalogus`) Bekötése (`src/components/hr/add-kpi-dialog.tsx`):**
  - 1-kattintásos gyorsválasztó gombok a vállalati sablonokhoz (*Ügyfél-elégedettség CSAT*, *Projektátadási arány*, *Árbevétel elvárás*, *Tréning elvégzése*, *Új ügyfelek*).
  - Automatikus kitöltés: cél neve, mérőszám típusa, javasolt célérték, leírás.
  - Munkatárs kiválasztó avatarral és munkakörrel, mértékegység-tudatos beviteli mezők (`%`, `Ft`, `db`, `skala`, `igen_nem`), valamint súlyozás gyorsgombok (`1.0x`, `1.5x`, `2.0x`).
- **Modern Cikluskezelés (`src/components/hr/manage-cycles-dialog.tsx`):**
  - Lenyitható új ciklus rögzítési blokk, formázott dátumok és szöveges, egyértelmű állapotváltó gombok (`Megnyitás`, `Értékelés indítása`, `Ciklus lezárása`).
- **Linear-Flat Vezetői Dashboard és Bérszámfejtési Összesítő (`src/app/hr/performance/dashboard/page.tsx`):**
  - Visszalépési navigáció a főoldalra.
  - A pasztell dobozok helyett egységes Linear-flat 5-lépcsős folyamat rács.
  - Esztétikus diagram empty state-ek feliratokkal az üres diagram helyett.
  - Dolgozói bérszámfejtési és prémium javaslati táblázat avatarokkal, progress barral és prémium kategória jelvénnyel.


### 📂 eaisyDocs: Kereshető Ügyirat-Kiválasztó és Intelligens Iktatási Csatolás (A-077 / P-101)
- **Kanonikus `DossierSearchSelector` Komponens (`src/components/dossier-search-selector.tsx`):**
  - A cégválasztóhoz (`company-selector.tsx`) hasonló, beágyazott popover keresősávval (`Search` ikon, instant gépelési szűrés, ékezetfüggetlen normalizálás).
  - **Tematikus kategória szűrőchipek:** *Mind*, *Számlák & Pénzügy*, *Szerződések*, *HR*, *Egyéb* élő darabszám jelvénnyel a releváns ügyiratok azonnali szűréséhez.
  - **Intelligens Partner-Ajánló Sáv (`✨ Javasolt ügyiratok a küldő partnerhez`):** Automatikusan a lista elejére sorolja az irat küldő partneréhez tartozó nyitott ügyiratokat.
  - **Gazdag ügyirat kártyák a listában:** Iktatószám, státusz, csatolt iratok száma, ügy tárgya, kapcsolódó számla- és hivatkozási számok, létrehozás dátuma és kiválasztási zöld pipa.
  - **Megerősítő kártya és validáció:** Egyértelmű visszajelzés a leendő alszámról (`/2`), valamint kliensoldali blokkolás üresen maradt kiválasztás esetén.
- **Relációs Adatgazdagítás és Többcéges Védelem (`src/app/inbox/[id]/page.tsx`):**
  - Az ügyiratok mellett lekérésre kerülnek a bennük lévő korábbi iratok és partnerek adatai is, lehetővé téve a korábbi számlaszámokra és partnerekre történő közvetlen keresést.
  - Szigorú multi-tenant cég szerinti szűrés az aktív cég azonosítójával.
- **Iktatási dialógus harmonizáció (`src/components/filing-dialog.tsx`):**
  - A modál alapú iktatási ablak szintén megkapta az új kereshető komponenst a teljes platform egységesség jegyében.
- **Helyesbítő és Stornó Számlák Intelligens Összerendelése (`src/app/inbox/filing-actions.ts` & `src/utils/antecedent-matcher.ts`):**
  - **Kifejezett felismerés:** A Gemini prompt és heurisztikus regex felismeri a helyesbítő mintákat (pl. *„THINK-2026-51 HELYESBÍTŐ SZÁMLÁJA”*, *„Módosító számla”*, *„Stornó számla”*).
  - **Hivatkozott eredeti számla kiolvasása:** Nem a módosító számla saját számát, hanem az eredeti sorszámot (`THINK-2026-51`) olvassa ki `hivatkozott_szam`-ként.
  - **Relációs irat-keresés:** A rendszer nemcsak az ügyiratok iktatószámában keres, hanem az `irat` táblában megkeresi az eredeti számlát, és annak gyűjtőügyiratát (`ugyirat_id`) 99%-os biztonsággal azonnal felajánlja előzményként.
  - **Lezártsági védelem feloldása:** Helyesbítő és stornó számláknál számviteli megfontolásból a lezárt ügyirathoz való alszámos csatolást is engedélyezi és javasolja a motor.

### 🤖 eaisyHR: AI Álláshirdetés Varázsló és Karrier Oldali HTML/Markdown Renderelés
- **HTML & Markdown Biztonságos Renderelő (`src/components/rich-text-content.tsx` & `src/lib/sanitize-html.ts`):**
  - A publikus karrieroldalon (`/karrier/[id]`) megadott részletes leírások mostantól formázott HTML-ként és Markdownként jelennek meg tiszta `@tailwindcss/typography` stílusokkal, kliensoldali XSS szűréssel és biztonsági tisztítással.
- **AI Álláshirdetés Generáló Varázsló (`src/app/hr/recruitment/ai-posting-actions.ts` & `src/components/hr/manage-posting-dialog.tsx`):**
  - Google Gemini 2.5 Flash integráció az álláshirdetések automatikus megfogalmazásához.
  - Tiszta, fókuszált felugró modál (`isAiModalOpen`), elkerülve a fő űrlap zsúfoltságát.
  - **Cég- és helyszíntudatos generálás:** Az AI automatikusan megkapja az aktívan kiválasztott cég nevét (`selectedCompany.name`) és székhelyét (`selectedCompany.address`), beépítve a cégnevet a bemutatásba és létrehozva a „Munkavégzés helye” blokkot.
  - Intelligens offline sablon fallback és egyedi szempontok megadási lehetősége.
- **Csak Belső Hirdetés Kapcsoló Redesign:**
  - Letisztult, aszimmetrikus keretektől és középre igazítási hibáktól mentes settings-kártya elrendezés a toborzási űrlapon.

### 🤝 eaisyHR: Dolgozói Ajánlási Rendszer (Referral) és Beállítható Bónusz („A” Opció - A-075 / P-099 / BRD-011)
- **Kétfülös Karrier Oldal („A” Opció - `/hr/self-service/career` & `src/components/hr/internal-career-view.tsx`):**
  - **Fülek elrendezése:** A fejléc alatt közvetlenül elérhető az **Álláshirdetések** és a **Saját ajánlásaim** fül, valós idejű darabszám jelvényekkel (`postings.length` és `referrals.length`), dekoratív ikonoktól mentes, tiszta szöveges formában az ADR A-029 szabvány szerint.
  - **Közvetlen ajánlásindítás:**
    - A fejlécből elérhető a platform szinten egyetlen kanonikus `[+ Ismerős ajánlása]` gomb (`UserPlus` ikon).
    - Minden nyitott álláshirdetés kártyáján helyben megtalálható az `[Ajánlás]` gomb, amely automatikusan előválasztja a pozíciót az űrlapon.
    - Minden álláskártyán megjelenik a fix sikerdíj jelvény (`🎯 X Ft bónusz`).
- **Saját Ajánlásaim Kezelőfelület (`src/components/hr/my-referrals-view.tsx`):**
  - **4 Linear Flat KPI Kártya (ADR A-029):** *Összes Ajánlásom*, *Folyamatban*, *Sikeres Felvétel*, *Jóváhagyott Bónusz* – letisztult struktúra, kiemelt tabular-nums összegekkel, ikonmentesen.
  - **Kanonikus TableToolbar:** Instant kereső jelölt nevére, e-mailjére vagy pozíciójára, valamint bónusz státusz szűrő (*Kiválasztás zajlik*, *Próbaidő alatt*, *Jóváhagyva/Kifizethető*, *Kifizetve*, *Elutasítva*).
  - **Ajánlások részletes listája:** Jelölt elérhetőségei, pozíció, ajánlás dátuma, toborzási pipeline fázis jelvény (`hr_toborzas.statusz`), bónusz státusz jelvény, sikerdíj összege, LinkedIn hivatkozás és feltöltött önéletrajz letöltési lehetőség.
  - **Ajánlás visszavonása & Kanonikus `AlertDialog` modál:** Függőben lévő ajánlásoknál közvetlen törlési lehetőség (`Trash2` ikon), amely a rendszer szabványos shadcn `AlertDialog` megerősítő párbeszédpanelével nyílik meg (natív `confirm()` nélkül), törölve a toborzási rekordot és a storage-ban lévő CV fájlt is.
  - **Redundancia-mentesítés:** Eltávolítva a programkártyában és az üres állapotban korábban duplikált zöld gombok, valamint a dekoratív emoji és ikonbox elemek.
- **Ismerős Ajánlása Modál (`src/components/hr/referral-dialog.tsx`):**
  - Választó nyitott állásokra és *"🎯 Általános ajánlás (Talent pool)"* opcióra.
  - Jelölt teljes neve, e-mail címe (regex ellenőrzéssel), telefonszáma, LinkedIn profil linkje.
  - Önéletrajz feltöltés (PDF, DOC, DOCX, max 10MB) kliens- és szerveroldali biztonsági ellenőrzéssel.
  - Szöveges indoklás a jelölt erősségeiről.
  - GDPR hozzájárulási megerősítő nyilatkozat.
  - Flat bónusz kiemelő sáv a fix sikerdíj összegével és a próbaidőhöz kötött kifizetési szabállyal.
- **Cégszintű Bónusz Konfiguráció (`src/components/settings/company-settings-tab.tsx` & `src/app/actions/company-actions.ts`):**
  - A `/hr/settings` oldalon a "Cég" fülön új beviteli mező: **Dolgozói ajánlási bónusz (Ft)**.
  - A cégtulajdonos/admin testreszabhatja a fix sikerdíj mértékét, amely a `companies.referral_bonus_amount` oszlopban perzisztálódik (alapértelmezett: 150 000 Ft).
- **Adatbázis Séma és Szigorú Multi-Tenant RLS (`supabase/migrations/20261019000001_create_hr_dolgozoi_ajanlas.sql`):**
  - Létrejött a `hr_dolgozoi_ajanlas` tábla (`company_id`, `ajanlo_dolgozo_id`, `allashirdetes_id`, `toborzas_id`, `jelolt_nev`, `jelolt_email`, `cv_storage_path`, `bonusz_osszeg`, `bonusz_statusz`, stb.).
  - Restrictive `tenant_isolation_restrictive` házirend a cégközi elszigeteléshez.
  - Permissive RLS: A munkatárs kizárólag a saját ajánlásait láthatja (`ajanlo_dolgozo_id = auth.uid()`), a HR/Adminisztrátorok a teljes céges állományt felügyelhetik.
  - Kétirányú toborzási híd: Az ajánlás automatikusan létrehozza a jelöltet a `hr_toborzas` pipeline-ban is, összekapcsolva az ATS-szel.
  - 5 db automatizált egység- és integrációs teszt (`src/utils/__tests__/employee-referral.test.ts`).
- **Kapcsolódó döntések:** [ADR A-075](../architecture/decisions/A-075-employee-referral-system-and-configurable-bonus-architecture.md), [PRD P-099](../product/decisions/P-099-employee-referral-system-and-configurable-bonus-ux.md), [BRD-011](../business/decisions/011-employee-referral-system-and-bonus-governance.md).

### 📄 eaisyHR: Dolgozói Önkiszolgáló Dokumentumaim Oldal, Univerzális DocumentViewer és Portál Audit Javítások (A-074 / P-098)
- **Szabadságtörténet Mt. szerinti Munkanap Kalkuláció (`src/components/hr/leave-history-list.tsx` & `src/utils/hr/leave-calculator.ts`):**
  - **Valós munkanapok kijelzése:** A korábbi naiv naptári különbség (`durationDays`) helyett, amely pl. egy hétfőtől péntekig tartó távollétre 9 napot írt ki a hétvégékkel, a felület a valós Mt. szerinti munkanapokat veszi figyelembe (`(X munkanap)` formátumban).
  - **Munkaszüneti napok integrációja:** A `calculateWorkingDays` algoritmus kezeli a hétvégéket és a `hr_munkaszuneti_nap` táblából lekérdezett hivatalos nemzeti munkaszüneti napokat, illetve elsődlegesen a mentett `leave.munkanapok_szama` értéket alkalmazza.
  - **Időzóna-eltolódási hiba javítása:** Megszűnt az ISO UTC konverziós bug a dátumléptetőben (`cur.setHours(0,0,0,0)` utáni UTC-1 napos visszacsúszás), 11 db automatizált egységteszttel igazolva.
- **Helyettesítő Kiválasztó Multi-Tenant Cégszintű Elszigetelés (`src/app/hr/self-service/time/page.tsx` & `actions.ts`):**
  - **Cégre szűrt dolgozói lista:** Az `availableUsers` lekérdezés szigorúan az aktív céghez tartozó személyeket (`company_id`, `company_members`) gyűjti össze, kizárva, hogy többcéges környezetben idegen cég alkalmazottai megjelenjenek a helyettesítő kiválasztó legördülőben.
  - **Szerveroldali védelem:** A `saveSubstitute` akció rögzíti az aktív `company_id`-t a `hr_helyettesites` táblában, szerveroldalon ellenőrzi, hogy a megadott helyettes az aktív céghez tartozik-e, és revalidálja a `/hr/self-service/time` útvonalat.
  - **Aktív helyettes céges izolációja:** A `currentSubstitute` lekérdezés szintén cég-specifikus szűrést kapott, és a figyelmeztető banner közvetlenül a `#helyettesites` horgonyra irányít.
- **Belső Állások Kereső és Részleg Szűrő Sáv (`/hr/self-service/career` & `src/components/hr/internal-career-view.tsx`):**
  - **Kanonikus TableToolbar & KpiCard:** Az egyszerű kártyalista elé bekerült a 4 db Linear Flat KPI kártya (Nyitott Pozíciók, Belső Pályázatok, Érintett Területek, Legfrissebb Kiírás).
  - **Instant Keresés és Részlegválasztó Popover:** A `TableToolbar` segítségével azonnal szűrhető a pozíció címe, leírása, munkaköre vagy szervezeti egysége (`hr_szervezeti_egyseg`), valamint a Popoverben részleg szerinti jelölőnégyzetek találhatók pontos darabszámokkal (pl. `Fejlesztés (2)`), kiegészítve belső/publikus kapcsolókkal.
  - **Belső állások megtekinthetősége:** A `/karrier/[id]` oldalon elhárításra került a korábbi 404-es hiba: az aktív belső állások mostantól bejelentkezve közvetlenül megtekinthetők és megpályázhatók.
- **Önálló „Dokumentumaim” Oldal a Dolgozói Portálban (`/hr/self-service/documents` & `hr-sidebar.tsx`):**
  - **Közvetlen navigáció:** A `Dolgozói Portál` oldalsáv menüjébe bekerült az új `Dokumentumaim` menüpont (`FileText` ikon), amely minden jogosultsággal rendelkező dolgozó számára azonnal elérhető.
  - **4 db Linear Flat KPI Kártya (ADR A-029):** Összes Irat, Hivatalosan Iktatva, Aláírt Példányok, Legutóbbi Irat – díszítő ikonok és szegélyek nélkül, letisztult felső kisbetűs címkékkel és tabular-nums kiemelt számértékekkel.
  - **Teljeskörű iratállomány:** Megszűnt az 5 tételes korlátozás; a nézet a munkavállalóhoz tartozó összes iratot lekérdezi a `hr_dokumentum` táblából (szerződések, havi jelenléti ívek, szabadság-nyilvántartás, orvosi alkalmassági, cafeteria nyilatkozat, tanulmányi szerződés, NAV T1041 hatósági bejelentők, kitüntetések).
  - **Idővonalas kártyalista:** Dátumok, kategóriák, zöld iktatószám címkék (`Iktatva: HR/2026/...`), aláírási jelvények és közvetlen dosszié ugrás.
- **Kanonikus `TableToolbar` és Szűrés Popover Integráció (ADR A-029 & P-043):**
  - Eltávolításra kerültek az ad-hoc vízszintes kategóriagombok (pill-sor), helyüket a rendszerkanonikus `TableToolbar` vette át:
    - **Bal oldal:** Instant gépelési keresőmező (`Search` ikon, keresés iratnévre, iktatószámra és kategóriára, gyors törlő `X` gombbal).
    - **Jobb oldal:** Oszlopválasztó Popover (`Columns3`) és kiemelt zöld/teal **`Szűrés` Popover Gomb** aktív szűrőszámláló jelvénnyel.
    - **Szűrés Popover:** Naptári dátumtartomány szűrő, kategória-jelölőnégyzetek élő darabszámlálóval (Munkaszerződés, Jelenléti ív, Orvosi alkalmassági, Cafeteria, Munkavédelem, Hatósági, Kitüntetések) és állapotkapcsolók (*Csak iktatott*, *Csak aláírt*).
- **Univerzális In-Place `DocumentViewer` Megoldás (`src/components/document-viewer.tsx`):**
  - A korábbi korlát feloldásával a `DocumentViewer` mostantól univerzálisan működik:
    - **Iktatott iratoknál (`irat_id`):** Átfut az `/api/pdf/[id]` végponton, érvényesíti a minősítési szintet, ráilleszti a dinamikus betekintői vízjelet és append-only audit eseményt generál az `esemeny_naplo` táblába.
    - **Még nem iktatott HR fájloknál (`url`, `alairt_fajl_url`):** A `getSignedFileUrl` szerveroldali akcióval rövid élettartamú (60s) aláírt Supabase Storage URL-t kér le, és a beágyazott PDF/kép nézegetőben jeleníti meg a fájlt letöltési kényszer nélkül.
  - Minden dokumentum mellett két egyenrangú művelet érhető el: **`Megtekintés`** (in-place `DocumentViewer`) és **`Letöltés`** (közvetlen fájlmentés).
- **Letöltési Végpont Biztonsági Javítás (`/api/hr/download-document/route.ts`):**
  - Az engedélyezési ellenőrzés pontosítva lett a `hr_dokumentum.url` és `alairt_fajl_url` mezőkre a korábbi nem létező `fajl_path` helyett, megakadályozva a jogosulatlan 404/403-as hibákat a valós tárolási útvonalaknál.
- **Saját Profil Felület Letisztítása (`/hr/self-service/profile`):**
  - A profiloldal aljáról kivezetésre került a redundáns és korlátozott 5 elemes `RecentDocumentsCard` szekció.
  - A profiloldal így a tiszta törzsadatokra és kötelező munkavédelmi/egészségügyi érvényességekre koncentrál.
  - A munkaviszony lekérdezés `.single()` metódusa `.maybeSingle()`-re lett javítva, elkerülve a PostgREST hibákat frissen beléptetett munkatársaknál.
- **Portál Kezdőlap KPI Kártya Korrekció (`/hr/page.tsx`):**
  - Megszűnt a megtévesztő 4. kártya, amely a cafeteria keret helyett az évszámot ("2026") mutatta.
  - A kártya feladata átalakult a sokkal relevánsabb **Munkaidő Egyenleg** (`hr_tulora_egyenleg.perc`) kijelzésére.
  - Kiemelt formázott óra:perc értékkel (`formatOvertime`), dinamikus felirattal és közvetlen hivatkozással a munkaidő-nyilvántartásra (`/hr/self-service/time`).
- **Kapcsolódó döntések:** [ADR A-074](../architecture/decisions/A-074-universal-document-viewer-and-employee-documents-architecture.md), [PRD P-098](../product/decisions/P-098-employee-self-service-documents-page-and-profile-declutter-ux.md).

### 🎯 eaisyHR: Teljesítményértékelés és Dolgozói Életút (Offboarding) Hardening és Integráció (P-097)
- **Teljesítményértékelés Multi-Tenant Cégszintű Izoláció (`/hr/performance` & `/hr/performance/dashboard`):**
  - Javításra került a korábbi auditban feltárt hiányosság: az `addKpi` és `addCycle` szerver akciók immár beégetik az aktív cég azonosítóját (`company_id: activeCompanyId`).
  - A `/hr/performance` értékelési főoldal a céges tagságok (`company_members`) alapján szűri le a látható dolgozók körét (`safeMemberIds`), és a `hr_teljesitmeny`, `hr_teljesitmeny_ciklus`, `hr_dolgozo_adatlap` valamint a kapcsolódó audit napló szigorúan ezekre a cégtagokra korlátozódik.
  - A vezetői dashboard (`/hr/performance/dashboard`) jogosultság-ellenőrzést kapott (`requireHrAuthServer`), valamint az aggregált KPI-k, értékelési ciklusok és munkatársak kizárólag az aktív cég adatai alapján töltődnek be.
- **Dolgozói Életút: Offboarding Folyamat Javítás és Dolgozói 360° Integráció (`/hr/offboarding` & `/hr/employee/[id]`):**
  - **Cégszintű rögzítés és revalidáció:** A `createOffboarding` szerver akció mostantól automatikusan rögzíti a `company_id: activeCompanyId` értéket a `hr_offboarding` és a keletkező `hr_offboarding_feladat` sorokban is, megakadályozva, hogy a szigorú cégválasztó szűrő elől eltűnjenek a frissen létrehozott folyamatok. A folyamat indítása, lezárása és újranyitása automatikusan revalidálja az érintett munkavállaló adatlapját is (`/hr/employee/[dolgozoId]`).
  - **Közvetlen Kiléptetés Indítási Dialógus (`AddOffboardingDialog`):** Kiegészült `preselectedEmployeeId` és `preselectedEmployeeName` támogatással. Ha a dolgozó saját adatlapjáról indítják, a legördülő menü helyett egy letisztult, közvetlen dolgozói névkártyát jelenít meg, elkerülve a felesleges keresgélést, és mentés után azonnal frissíti a nézetet (`router.refresh()`).
  - **Munkavállalói 360° Adatlap Fejléc Integráció (`/hr/employee/[id]`):**
    - Folyamatban lévő offboarding esetén: Figyelemfelkeltő, de letisztult sárga státuszjelvény (`Kiléptetés folyamatban (Kilépés: YYYY.MM.DD)`) és közvetlen gyorsnavigációs gomb (`Offboarding feladatok kezelése`).
    - Lezárt / korábban kilépett munkatárs esetén: Neutrális szürke `Kilépett` jelvény a pontos dátummal.
    - Aktív munkatárs esetén: Zöld `Aktív` jelvény, mellette pedig a HR / Adminisztrátor számára egykattintásos **`Kiléptetés indítása`** gomb (`UserMinus` ikon), amely helyben megnyitja az előre kitöltött kiléptetési modált.
- **Központi HR Teendők & Figyelmeztetések Rendszerintegráció (`/hr/admin`):**
  - Az adminisztrátori munkaasztal teendő és figyelmeztető táblázata (`HrTasksAndAlertsTable`) mostantól közvetlenül figyeli és valós időben beemeli az aktív **Onboarding** és **Offboarding** folyamatokat.
  - Törvényi és határidős súlyozás: kritikus riasztást kap a lejáró vagy már elérkezett belépés (T1041 NAV bejelentés és munkaszerződés ellenőrzése) és a kilépés (az Mt. 80. § szerinti szigorú 5 munkanapos elszámolási és igazolás-kiadási határidő kiemelésével).
  - Közvetlen gyorsműveleti gombokkal (`Onboarding`, `Kiléptetés`) és a `TableToolbar` szűrőfelületébe integrált tematikus szűréssel.
- **Kiléptetési Folyamat Lezárási Integritás és Feladat-védelem (`/hr/offboarding` & `OffboardingProfileModal`):**
  - **Hamis készrejelölés megszüntetése:** Megszűnt az a súlyos adatintegritási hiba, amely a folyamat lezárásakor a még nyitott teendőket automatikusan `done` (100%) státuszra állította át. A rendszer a feladatokat soha többé nem hamisítja elvégzettre.
  - **Szerveroldali lezárási korlát:** A `closeOffboarding` megtagadja a lezárást, ha befejezetlen feladatok vannak folyamatban, kivéve ha kifejezett kivételes lezárást kérnek (`force: true`), de a feladatok ebben az esetben is nyitottak maradnak.
  - **Kliensoldali figyelmeztetés és jóváhagyás:** Befejezetlen feladatok esetén a lezárás gomb borostyán figyelmeztető színre vált, a dialógus pontosan kiírja az elvégzetlen feladatok számát és kötelező megerősítő nyilatkozatot kér.
  - **Újranyitás és feladat-reset:** Az újranyitás dialógusban választható a feladatok automatikus visszaállítása nyitott (`pending`) állapotra, a teendők fejlécében pedig megjelent az „Összes újranyitása” gyorsművelet.
- **Belső Karrieroldal Cégszintű Szűrése (`/hr/self-service/career`):**
  - A nyitott álláshirdetések (`hr_allashirdetes`) lekérdezése céges szűrőt kapott (`company_id.eq.${activeCompanyId},company_id.is.null`), megakadályozva az idegen cégek belső állásainak megjelenítését.
- **Beléptetési és Kiléptetési Listasáv Tisztítás és Eszköztár Ergonómia (`/hr/onboarding` & `/hr/offboarding`):**
  - Eltávolításra kerültek a felesleges és zavaró beágyazott szűrőgombok mindkét modulból (`Megállapodás` és `Fiók állapot` pill-sorok).
  - A `[Kártyák] [Táblázat]` nézetváltó gombok átkerültek a fehér eszköztár jobb oldalára, egységes egységet képezve a keresőmezővel.
  - A nagy függőleges holttér megszüntetésre került: a fülek és a fehér eszköztár közötti távolság jelentősen csökkent (`space-y-2.5`), a felesleges elválasztó vonalak és alsó paddingok kivezetésével a keresősáv közvetlenül a fülek alá simul.
- **Dátumok Szinkronizációja és Letisztult Megjelenítése (Onboarding & Offboarding):**
  - Feloldásra került az adatbázis oszlopnév eltérés: a `hr_offboarding` tábla `utolso_munkaban_toltott_nap` és `kilepes_datuma` oszlopai mostantól automatikusan hozzá vannak rendelve a kliens által várt `utolso_munkanap` mezőhöz.
  - Az `OffboardingProfileModal` dátummezője vezérelt `value={currentDate}` állapotot kapott, amely azonnal felveszi az aszinkron adatokat és szerkesztéskor menti az adatbázisba.
  - Mind a beléptetésnél (`OnboardingCard`, `OnboardingList`), mind a kiléptetésnél (`OffboardingCard`, `OffboardingList`) kivezetésre került a relatív napkiírás (`(X nap múlva)`, `(X napja)`), helyette egységesen a tiszta hivatalos dátumformátum (pl. `2026. 10. 20.`) jelenik meg semleges keretes jelvényben.
- **Kapcsolódó döntések:** [PRD P-097](../product/decisions/P-097-performance-and-offboarding-hardening.md).

### 📄 eaisyHR: Munkavállalói Hivatalos Dokumentumok Dedikált Fülre Helyezése és Munkaviszony Tisztítás (P-096)
- **Új „Hivatalos dokumentumok” fül a Dolgozói 360° Adatlapon (`/hr/employee/[id]`):**
  - A korábbi elrendezésben a `Munkaviszony & Szerződések` fül alá volt zsúfolva a teljes hivatalos iratidővonal (munkaszerződések, NAV bejelentők, jegyzőkönyvek, határozatok, kitüntetések), ami óriási vertikális helyet foglalt el.
  - A dokumentumkezelés átkerült egy önálló fülre a *Bizalmas HR adatok* után, letisztult `Hivatalos dokumentumok` felirattal (zavaró zárójeles számlálók nélkül, a `Bérpapírok` fülről szintén lekerült a zárójeles számkijelzés).
  - A dedikált fülön kapott helyet a teljes iratkezelési eszköztár: tömeges eaisyDocs iktatás (`BatchFileHrDocumentsDialog`), kézi fájlfeltöltés (`ManualUploadDialog`), dinamikus szerződés/irat generáló (`ContractGeneratorDialog`), a munkaköri leírás átvételi akciókártya, valamint a teljes dokumentum-idővonal az aláírt példány kezeléssel, betekintéssel és letöltéssel.
- **„Munkaviszony” fül letisztítása és ergonomikus elrendezése:**
  - A fül neve tiszta `Munkaviszony`-ra módosult, kizárólag a jogviszonyra és beosztásra (`EmploymentTab`), a munkavédelmi és tűzvédelmi oktatásokra (`SafetyTrainingEmployeeCard`), valamint a tanulmányi szerződésekre (`StudyContractTab`) fókuszálva.
  - Megszűnt a végtelen vertikális görgetés, a munkaköri és beosztási alapadatok azonnal áttekinthetővé váltak.
- **„Fejlesztési tervek” megnevezés egységesítése:**
  - A korábbi `Fejlődés (IDP)` fül és az `Egyéni Fejlesztési Tervek (IDP)` kártyafőcím egységesen és letisztultan a **`Fejlesztési tervek`** megnevezést kapta mind a felső fülsorban, mind a belső főcímben (`IDPTab.tsx`).
- **Bérszámfejtési műszerfal és bérpapírok szinkronizáció javítása (`getPayrollDashboardData`):**
  - Javításra került a korábbi eltérés, ami miatt a meglévő, már átvett bérpapíroknál a HR bérszámfejtési munkaasztal „Generálásra vár” státuszt mutatott: a korábbi bérpapír rekordoknál hiányzó `company_id` miatt a céges szűrő nem találta meg őket, így a felület a nyers jelenléti ívből generált helyszíni szimulációt mutatott. A `company_id` mezők vissza lettek töltve, és a lekérdezés a cégtagok azonosítóira (`memberUserIds`) lett robusztussá téve.
- **Kapcsolódó döntések:** [PRD P-096](../product/decisions/P-096-employee-official-documents-dedicated-tab-ux.md).

### 💬 eaisyDocs: Belső Megjegyzések Bővítése – Többsoros Író, Szerkesztés/Törlés, Csatolmányok, Olvasatlan Jelzés (P-095)
- **Többsoros író mező:** önnövő `textarea`, `Enter` küld, `Shift+Enter` új sor, az @említés-választó változatlanul működik.
- **Szerkesztés és törlés:** saját megjegyzésen `⋮` menü; helyben szerkesztés („· szerkesztve” jelzéssel), törlés megerősítéssel. Az előző / törölt szöveg az append-only eseménynaplóban megmarad.
- **Csatolmányok:** képek és dokumentumok (max. 5 fájl, 10 MB / fájl) gemkapoccsal, húzással vagy vágólapról beillesztve; privát `megjegyzes_csatolmanyok` tároló, 60 mp-es aláírt URL, naplózott megtekintés és letöltés.
- **Olvasatlan jelzés:** számjelvény a „Megjegyzések” gombon, „Olvasatlan üzenetek” elválasztó a panelben, megnyitáskor olvasottnak jelölés.
- **Adatbázis:** új migráció (`20261018000003_ugyirat_megjegyzes_extensions.sql`) – alkalmazása szükséges a működéshez.
- **Kapcsolódó döntések:** [PRD P-095](../product/decisions/P-095-dossier-notes-edit-attachments-unread-ux.md).

### 🔗 eaisyDocs: Ügyirati „Kapcsolódások” Fül – Emberi Nyelvű Megjelenítés és Háromlépéses Varázsló (P-094)
- **Átnevezés és egységes kártya:** a „Külső kapcsolatok” fül neve „Kapcsolódások”, egyetlen fejléccel, `+ Új kapcsolat` gombbal és szaggatott keretes üres állapottal.
- **Olvasható elemek UUID helyett:** a munkavállaló profilképpel és névvel, a partner névvel és adószámmal, a HR dokumentum névvel és kategóriával jelenik meg (`resolveLinkEntities`); az eaisyHR adatok csak HR modullal kerülnek lekérdezésre.
- **Egy elem = egy sor:** az ismétlődő kapcsolatok összevonása, lenyitható részletekkel; magyar feliratok (eaisyHR / eaisyDocs / ERP / CRM, „Az ügyirat tárgya”, „Csatolt dokumentum”), teljes iktatószám az érintett iratnál.
- **Kanonikus `TableToolbar`** (keresés, oszlopok, típus- és forrásszűrő) és sorműveletek: Megnyitás, Dokumentum megtekintése, Azonosító másolása, Törlés. A rendszer által létrehozott HR kapcsolatok törlése tiltott.
- **Háromlépéses „Új kapcsolat” varázsló:** típuskártyák → partnernél élő partnerkereső / külső elemnél rendszer + azonosító → kapcsolat jellege, érintett irat, összegzés. Duplikáció-védelem a szerver oldalon.
- **Kapcsolódó döntések:** [PRD P-094](../product/decisions/P-094-dossier-links-tab-human-friendly-ux.md).

### 🗂️ eaisyDocs: Ügyirati Feladatok Táblázatos Nézet, Részletező Panel és Megjegyzések Slide-over (P-093)
- **Feladatok fül átalakítása:** teljes szélességű kártya (a Válaszlevelek mintájára), 4 `KpiCard`, kanonikus `TableToolbar` (kereső, oszlopválasztó, állapot/prioritás/határidő szűrés) és feladat táblázat gyors „kész” kapcsolóval és `Kezelés` menüvel.
- **Feladat részletező Sheet:** sorra kattintva tényadatok, leírás, elutasítás indoka és állapotműveletek.
- **24 órás archívum:** az elvégzett feladatok 24 óra után az összecsukható „Elvégzett feladatok” szekcióba kerülnek, `Újranyitás` lehetőséggel.
- **Belső megjegyzések:** a kétoszlopos chat helyett jobb oldali slide-over (`DossierNotesSheet`), az ügyirat fejlécéből bármely fülről megnyitható; nap szerinti csoportosítás, avatarok, @említés kiemelés. Az említés-értesítések linkje `?notes=1`.
- **Fülcímke:** `Feladatok (N)` a nyitott feladatok számával.
- **Kapcsolódó döntések:** [PRD P-093](../product/decisions/P-093-dossier-tasks-table-and-notes-sheet-ux.md).

### 🪄 eaisyDocs: Ügyirati Feladatok 3-Lépcsős Varázsló (Wizard Modal) és Sablonkezelés (A-073 / P-092)
- **Főoldali Letisztítás és Beágyazott Composer Megszüntetése:**
  - A felhasználói visszajelzés alapján az ügyirat részletes adatlapján a feladatok fülről teljesen kivezetésre került a korábbi nagy helyet foglaló és a képernyőt lefelé toló beágyazott űrlap, valamint a kinyitható sablonkatalógus.
  - Az „Ügyirati Feladatok” kártya fejlécébe egyetlen tiszta, figyelemfelkeltő `+ Új feladat kiadása` gomb került.
  - A kártyatest így közvetlenül a feladatlistára és az állapotokra koncentrál.
- **Kanonikus 3-Lépcsős Feladatvarázsló Modál (`TasksTab`):**
  - A rendszer más moduljaiban (pl. Válaszlevelek) már bizonyított lépésindikátoros dialógus mintájára épült fel az új feladatkiosztó:
    - **1. Lépés – Sablon kiválasztása vagy egyedi feladat:** Azonnali szöveges kereső, kategóriaszűrő chipek, „Egyedi feladat (Sablon nélkül)” indítókártya, sablonkártyák rácsa egykattintásos továbbhaladással, valamint inline `+ Új sablon rögzítése` űrlap közvetlenül a modálban.
    - **2. Lépés – Feladat alapadatai és felelős:** Megnevezés, felelős munkatárs választó, határidő gyorsgombokkal (`+1 nap`, `+2 nap`, `+1 hét`, `+2 hét`), prioritás és kategória beállítása.
    - **3. Lépés – Részletes instrukciók és összegzés:** Részletes munkautasítás vagy megjegyzés, paraméter-összegző kártya, „Mentés új feladatsablonként” jelölőnégyzet, és zöld „Feladat kiadása” gomb audit naplózással.
- **Kapcsolódó döntések:** [ADR A-073](../architecture/decisions/A-073-dossier-tasks-wizard-modal-workflow.md), [PRD P-092](../product/decisions/P-092-dossier-tasks-wizard-modal-ux.md).

### 🧹 eaisyDocs: Tasks Kanban 24-órás Auto-archiválás és Elvégzett Feladatok Lista Nézet (A-072 / P-091)
- **Fejléc Tisztítása és Személyes Fókusz:**
  - A felhasználói visszajelzés alapján a fejlécben korábban szereplő „Összes feladat” vezetői kapcsoló teljes mértékben eltávolításra került. A felület kizárólag a bejelentkezett felhasználó saját és helyettesítés útján ráruházott teendőire fókuszál.
- **Kanban Tábla 24-órás Gördülő Ablaka a „Kész” Oszlopban:**
  - A Kanban tábla „Kész” oszlopában mostantól kizárólag a frissen, az elmúlt 24 órában elvégzett feladatok és ügyiratok (`completed_at >= now() - 24 hours`) jelennek meg.
  - Ezzel megelőzhető, hogy 100-200 elvégzett feladat felhalmozódásával a Kanban tábla áttekinthetetlenné váljon vagy a böngésző memóriáját terhelje.
  - A Kanban táblán az oszlop alján diszkrét információs sáv jelzi a korábban elvégzett feladatok darabszámát (`+{archivedCount} régebben elvégzett feladat`), felhívva a figyelmet, hogy a teljes archívum a Lista nézetben böngészhető.
  - Kártyák áthúzásakor optimistán azonnal beáll a lezárási időbélyeg, így a frissen elvégzett feladat 24 órán át a táblán marad, és szükség esetén visszahúzható.
- **Lista Nézet Szegmentált Fülei (`TaskList`):**
  - A Lista nézet táblázata felett modern, Linear-stílusú fülválasztó jelent meg:
    - **Aktív feladatok ({activeCount}):** A nyitott és folyamatban lévő teendők.
    - **Elvégzett feladatok ({completedCount}):** Minden korábbi lezárt ügyirat és befejezett feladat a lezárás pontos dátumával.
    - **Összes ({allCount}):** Teljes együttes lista.
  - A `TableToolbar` keresője, időszakszűrője és oszlopválasztója mindkét fülön azonnal működik.
- **Kapcsolódó döntések:** [ADR A-072](../architecture/decisions/A-072-tasks-kanban-auto-archive-and-completed-list-view.md), [PRD P-091](../product/decisions/P-091-tasks-kanban-auto-archive-and-completed-list-view-ux.md).

### 📋 eaisyDocs: Rám szignált ügyiratok és hozzáadott al-feladatok egységesítése a Saját feladatok felületen (A-071 / P-090)
- **Problémafeltárás és Alapvető Integrációs Hiányosság Javítása:**
  - A korábbi működésben a `/tasks` („Saját feladataim”) oldal kizárólag a `feladat` táblából kérdezte le a rekordokat (amely mindössze 2 db tesztfeladatot tartalmazott), teljesen figyelmen kívül hagyva az Iktatókönyvben nyilvántartott és a felhasználóra szignált ügyiratokat.
  - A felhasználó az Iktatókönyvben 13 szignált ügyirattal rendelkezett, amelyekből egyetlen egy sem jelent meg a feladatkezelőben.
- **Párhuzamos Lekérdezés és Teljeskörű Összekapcsolás (`tasks/page.tsx`):**
  - A feladatok oldal mostantól párhuzamosan lekérdezi mind a felhasználóra (és helyettesítettjeire) szignált ügyiratokat (`ugyirat` + `ugy!inner` ahol `felelos_user_id IN felelosIds`), mind pedig a hozzárendelt al-feladatokat (`feladat` tábla).
  - Determinisztikus típus-egyesítés: mindkét forrás a központi `Task` interfészre képződik le (`tipus: "ugyirat"` vs `tipus: "al_feladat"`, `ugyirat_${id}` kulcsokkal).
  - Alapértelmezés szerint a felhasználó saját teendői jelennek meg („Saját feladataim”), míg vezetői jogkör esetén a fejlécben elérhető a diszkrét nézetváltó az „Összes szervezeti feladat” áttekintéséhez.
- **Státusz Leképezés és Kanban Életciklus Szinkronizáció (`tasks/task-actions.ts`):**
  - Az ügyiratok státusza automatikusan a feladat-életciklusnak megfelelően jelenik meg:
    - `iktatva`, `szignalt` -> `Nyitott`
    - `ugyintezes_alatt`, `folyamatban` -> `Folyamatban`
    - `elintezett`, `lezart`, `irattarban`, `selejtezheto`, `selejtezett` -> `Kész`
    - `elutasitott` -> `Elutasított`
  - A Kanban táblán kártyamozgatáskor az `updateTaskStatus` kezeli az ügyirat státuszok és szülő ügyek szinkronizálását, valamint az eseménynapló (`esemeny_naplo`) audit bejegyzéseit.
  - Szigorú lezárási védelem: az ügyirat nem állítható `Kész` állapotba, amennyiben folyamatban lévő vagy elutasított al-feladat található benne.
  - Elutasítás kezelése: a Kanban kártya `Elutasított` oszlopba húzásakor megnyílik a `TaskRejectDialog`, kötelező szöveges indoklást kérve a művelet naplózásához.
- **Biztonságos Dátumkezelés és NULL-védelem:**
  - Megszűnt az érvénytelen dátumok és 1970-es fallback dátumok hibája: minden felületen (Kanban, Lista, Naptár) null-guard és `isNaN` ellenőrzés védi a határidő nélküli ügyiratokat, egységes és diszkrét „Nincs határidő” feliratot megjelenítve.
- **Vizuális Jelölések és Típus szerinti Szűrés (`TaskList`):**
  - Az ügyiratok `Ügyirat` badge-et (kiemelt teal háttérrel), az al-feladatok `Al-feladat` badge-et kapnak a gyors beazonosíthatóság érdekében.
  - A Lista nézet szabványos `TableToolbar` szűrősávjában új „Feladat típusa” szűrőcsoport érhető el, amellyel egy kattintással szűrhetőek a szignált ügyiratok és a hozzáadott al-feladatok.
- **Kapcsolódó döntések:** [ADR A-071](../architecture/decisions/A-071-assigned-dossiers-and-subtasks-unified-tasks-view.md), [PRD P-090](../product/decisions/P-090-assigned-dossiers-and-subtasks-unified-tasks-view-ux.md).

### 👥 eaisyDocs: Távolléti Feladat-Delegálás és Helyettesítés Újraszervezése („A” Opció) (A-070 / P-089)
- **Koncepció és Tisztázás (eaisyDocs vs eaisyHR határvonal):**
  - Tisztázásra került, hogy az eaisyDocs nem kezel szabadságokat és távollét-kérelmeket (az az eaisyHR hatásköre).
  - Az eaisyDocs szoftverterv 6.5 fejezete alapján a helyettesítés funkciója kizárólag a **folyamatos ügyintézés és iratkezelési feladat-delegálás** biztosítása, auditált formában.
- **Beállítások Fül Tisztítása:**
  - A korábbi önálló, üres "Helyettesítés" fül kivezetésre került a Beállítások (`/settings`) oldalról.
  - Helyette a Beállítások `Profil & Biztonság` lapjának alján kapott helyet a modern `DelegationSettingsCard` komponens.
- **Közvetlen Munkafolyamat Integráció a Feladatok Oldalon (`/tasks`):**
  - **Fejléc Akció Gomb & Modál (`TaskDelegationDialog`):** Közvetlenül a Saját feladataim lap fejlécéből elérhető a `Távolléti feladat-delegálás` gomb, ahol a felhasználó azonnal beállíthatja, kit bíz meg feladatai elvégzésével (mettől - meddig tartomány, helyettesítő kolléga, megjegyzés).
  - **Aktív Delegálási Információs Sáv (`ActiveDelegationBanner`):** Ha a felhasználónak aktív helyettesítése van (akár őt helyettesítik, akár ő helyettesít más munkatársat), a táblázat felett diszkrét, figyelemfelhívó banner jelenik meg a megbízás részleteivel.
- **Kanonikus Komponens és Kétoldalú Áttekintés (`DelegationManager`):**
  - `src/components/delegation-manager.tsx`: Egyetlen újrafelhasználható, egységes komponens, amely listázza:
    - **Általam leadott delegálások:** kik és milyen időszakban látják el a feladataimat, azonnali visszavonási lehetőséggel.
    - **Rám bízott feladatok (helyettesítések):** kiknek a feladataiban működök közre, a megbízó nevével, időszakával és megjegyzésével.
- **Szerveroldali Multi-Tenant és Jogosultság Javítások:**
  - **Szigorú Cégszintű és Moduláris Kolléga Szűrés (`tasks/page.tsx`, `settings-actions.ts`):** A helyettesítő kiválasztó lista mostantól kizárólag a jelenleg aktív céghez hozzáadott munkatársakat listázza (`company_members.company_id = activeCompanyId`), és szigorúan szűri azokat, akik rendelkeznek `eaisyDocs` modul hozzáféréssel (`elerheto_modulok @> ['docs']`). A kizárólag eaisyHR felhasználók nem keveredhetnek be a dokumentum-delegálásba.
  - `substitution-actions.ts`: A helyettesítések rögzítése mostantól cégszinten szeparált (`company_id` mentése az aktív cég alapján), szerveroldali cégtagsági és eaisyDocs modul validációval megerősítve.
  - Dátumvalidáció: beépítve a `meddig >= mettol` ellenőrzés és az ön-helyettesítés tiltása.
  - Revalidáció: `/tasks`, `/settings`, `/` útvonalak azonnali frissítése.
  - `task-actions.ts`: A feladat lezárási és státuszfrissítési jogosultság kiterjesztve a kijelölt aktív helyettesítő kollégákra is, így a helyettes valós időben elvégezheti és lezárhatja a megbízója feladatait.
- **Kapcsolódó döntések:** [ADR A-070](../architecture/decisions/A-070-task-delegation-and-substitution-architecture.md), [PRD P-089](../product/decisions/P-089-task-delegation-and-substitution-ux.md).

### 🏢 eaisyDocs: Szervezeti Egységek Megújítása és Kétfülös Fanézet („B” Koncepció) (A-069 / P-088)
- **Modern Kétfülös Szervezeti Egység Kezelő (`DepartmentsTab`):**
  - A Beállítások (`/settings`) „Szervezeti Egységek” tabján lévő korábbi szűkös, egydimenziós harmonika (`Accordion`) leváltásra került egy modern, kétfülös vezérlőközpontra:
    - **1. Szervezeti Egységek (Táblázat & Kezelés):**
      - Kliensoldali instant keresősáv (`Search` ikon, azonnali szűrés névre és iktató prefixre).
      - Részletes táblázat: Megnevezés, Iktató prefix (`iktato_prefix` monospace badge), Szülő egység (`Building2`), Osztályvezető (`Crown` aranyszínű jelvény, avatár és név), Hozzárendelt munkatársak számláló gomb, Műveleti gombok (Tagok hozzáadása `UserPlus`, Szerkesztés `Edit`, Törlés `Trash2`).
      - Teljes szélességű szaggatott keretes egység létrehozási gomb az egyszerű navigációhoz.
    - **2. Szervezeti Ábra (`DocsOrgChartTree` fanézet):**
      - Rekurzív fanézet a `szulo_id` hierarchia alapján, szintenként eltérő élénk szegélyszínekkel (`primary`, `info`, `purple`, stb.).
      - Hierarchikus csomópontok: Iktató prefix címke, Osztályvezető kártya, valamint az egységhez beosztott munkatársak névjegy-chipjei (avatár, iratkezelési szerepkör `docs_szerepkor` badge, biztonsági minősítési szint `max_minosites` lakat ikonnal).
- **Iratkezelési Fókusz (HR Munkakörök Tudatos Kihagyása):**
  - Az eaisyHR-rel ellentétben az eaisyDocs-ban nincs szükség FEOR munkaköri katalógusra. A jogosultságokat és az iratokhoz való hozzáférést a 7 szintű iratkezelési szerepkör (`docs_szerepkor`) és a 4 biztonsági minősítési szint (`max_minosites`) garantálja.
- **Teljeskörű Modális Interakciók és Szerver Műveletek (`settings-actions.ts`):**
  - Új szervezeti egység létrehozása és szerkesztése szülő egység, iktató prefix és vezető választóval.
  - Tagok hozzárendelése többes kijelöléses (`Checkbox`) modállal.
  - Tagok megtekintése és egykattintásos eltávolítása (`UserMinus`).
  - Biztonságos törlés (`deleteDepartment`): gyermek egységek `szulo_id`-jának és a tagok `szervezeti_egyseg_id`-jának automatikus nullázása az integritás védelmében.
- **Kapcsolódó döntések:** [ADR A-069](../architecture/decisions/A-069-docs-organizational-units-revamp.md), [PRD P-088](../product/decisions/P-088-docs-organizational-units-revamp-ux.md).

### 🎨 eaisyHR & eaisyDocs: Beállítások Lapok Konszolidációja, Automata Munkamenet Mentés és Vizuális Egységesítés (A-068 / P-087)
- **Profil és Biztonság Fülek Integrációja (`/settings` és `/hr/settings`):**
  - A korábban széttagolt, alig használt "Felhasználói profil" és a különálló "Biztonság" fül egyetlen logikus, letisztult `Profil & Biztonság` lapba olvadt össze mindkét modulban.
  - A felhasználó egyetlen képernyőn kezeli a személyes adatait, profilképét, valamint a jelszómódosítást, munkamenet időtúllépést és a kétlépcsős azonosítást.
- **Azonnali Automata Mentés és Interakciós Egyszerűsítés:**
  - A `munkamenet_idotullepes` választólista mostantól azonnal, az érték kiválasztásakor automatikusan mentésre kerül az adatbázisba, finom folyamatjelző spinnerrel (`Loader2`).
  - A különálló, felesleges "Mentés" gomb és a kártya lábléc kivezetésre került a munkamenet kártyáról.
  - A kétlépcsős azonosítás címéből a felesleges `(2FA)` technikai jelölés törlésre került.
- **Redundáns Rendszer Fül Kivezetése:**
  - Mivel a világos/sötét téma kapcsoló a bal alsó oldalsáv láblécében globálisan, bármelyik oldalról azonnal elérhető, a Beállításokban lévő felesleges `Rendszer` fül mindkét modulban megszüntetésre került.
- **Kanonikus Témaszínek és Stílusharmónia:**
  - A "Profil mentése" és a "Jelszó mentése" gombok átálltak az eaisyHR-rel és a platformmal megegyező kanonikus `bg-primary hover:bg-primary/90 text-primary-foreground` stílusra, megszüntetve a korábbi elütő ciánkék színeket.
  - Az összes dekoratív emoji kivezetésre került a beállítási kártyák és fülek fejléceiből.
- **Kapcsolódó döntések:** [ADR A-068](../architecture/decisions/A-068-settings-tabs-consolidation-and-visual-harmony.md), [PRD P-087](../product/decisions/P-087-settings-tabs-consolidation-and-visual-harmony-ux.md).

### 🔐 eaisyHR & eaisyDocs: Átfogó HR Szerepkör Scoping, RPC és Route Guard Összehangolás (A-067 / P-086)
- **Adatbázis RPC és RLS Szabályok Kiterjesztése (`20261018000002_fix_hr_roles_permissions_and_rpc.sql`):**
  - A `get_decrypted_hr_data` és `update_decrypted_hr_data` tárolt eljárásokban felvételre került a `berugyi` és `rendszergazda` szerepkör, valamint a cégtagsági (`company_members`) cég-specifikus (scoped) szerepkörök ellenőrzése. A bérszámfejtő mostantól hiba nélkül feloldhatja a dolgozók bankszámlaszámát, adóazonosítóját és bérét.
  - A `hr_dolgozo_adatlap` SELECT RLS szabály kibővítve a `berugyi` és `munkavedelmi` szerepkörökkel, valamint a közvetlen vezetői (`kozvetlen_vezeto_id`) relációval.
  - A `hr_dolgozo_titkos_adat` SELECT szabály kibővítve a `berugyi` szerepkörrel.
- **Intelligens, Szerepkör-specifikus Oldalsáv (`src/components/hr-sidebar.tsx`):**
  - **Bérügyi munkatárs (`berugyi`):** A Dolgozói Portál mellett a HR Munkaasztal dedikált elemei jelennek meg: *Állomány áttekintés, Bérszámfejtés & Bérpapírok, Naptár & Távollét, Riportok, Szervezeti Felépítés*.
  - **Munkavédelmi felelős (`munkavedelmi`):** Megkapta a *Munkaügyi Megfelelőség* (`/hr/compliance`) és az *Állomány áttekintés* elérését.
  - **Közvetlen vezető (`vezeto`):** Dolgozói Portál + *Vezetői nézet* (Csapat áttekintés, Teljesítményértékelés).
  - **Toborzó (`toborzo`):** A *Dolgozói Életút* csoportban kizárólag a jogosult *Toborzás* almenü jelenik meg, megszüntetve a 403-as kizárásos Onboarding/Offboarding zsákutcákat.
- **Szerveroldali Route Guardok és Adatlap Jogosultságok:**
  - `/hr/performance`: a `vezeto` és `auditor` szerepkör felvétele az engedélyezettek közé a hibás kizárás megszüntetésére.
  - `/hr/reports`: `konyvelo` javítva `berugyi`-ra, `hr_munkatars` hozzáadva.
  - `/hr/compliance`: dedikált `requireHrAuthServer(["hr_munkatars", "hr_vezeto", "admin", "munkavedelmi", "auditor"])` beépítve.
  - `/hr/time`: `berugyi`, `rendszergazda`, `auditor` hozzáadva a központi naptárhoz.
  - `/hr/employee/[id]`: a `berugyi` felvétele az adatlap és a béradatok (`canViewSalary`) kezelői közé; `PersonalDataTab` és `PayslipsTab` bérügyi kezelési joggal felruházva.
  - `/hr/admin`: az állomány megtekintése engedélyezve `berugyi` és `munkavedelmi` számára, az adminisztratív import/új dolgozó gombok a törzsadatbázis szerkesztőire (`canEdit`) korlátozva.
  - `/hr/manager`: `requireHrAuthServer(["hr_munkatars", "hr_vezeto", "admin", "vezeto"])` guard hozzáadva.
- **Kapcsolódó döntések:** [ADR A-067](../architecture/decisions/A-067-comprehensive-hr-roles-scoping-rpc-and-route-guard-alignment.md), [PRD P-086](../product/decisions/P-086-comprehensive-hr-roles-scoping-and-ux-alignment.md).

### 👥 eaisyHR & eaisyDocs: Multi-tenant Cégtagsági Láthatóság és Moduláris HR Állomány Elszigetelés (A-066 / P-085)
- **`company_members` RLS Házirend Javítása (`20261018000001_fix_company_members_select_policy.sql`):**
  - Megszüntetve a korábbi korlátozást, amely a nem-tulajdonos/nem-admin tagok (`role = 'member'`) elől elrejtette a cég többi tagját.
  - A cég bármely tagja láthatja a cég többi tagját a `public.user_has_company_access(company_id)` segítségével. A cégek közötti szigorú izoláció 100%-ban fennmaradt.
  - A tagok felvétele, módosítása és törlése továbbra is kizárólag a cégtulajdonosoknak és cégadminoknak engedélyezett.
- **eaisyHR Munkaasztal Állomány Tisztítása (`/hr/admin`):**
  - A HR vezető (`hr_vezeto`) és HR munkatárs belépve mostantól azonnal látja a teljes céges HR állományt (Think AI Kft. esetén pontosan 8 fő, benne a `betekinto`-vel és a többi kollégával).
  - Az `activeEmployees` lekérdezés szigorúan a céghez tartozó (`adatlap.company_id === companyScope`), érvényes `hr_dolgozo_adatlap`-pal rendelkező dolgozókra szűkítve.
  - A 15 tisztán eaisyDocs felhasználó automatikusan kívül marad az eaisyHR Dolgozói Törzsadatbázisán.
  - Az elérhető Docs profilok listája (`docsProfiles`) az aktív cég tagjaira lett korlátozva az új dolgozó felvétele / importálás dialógusban.
- **Szervezeti Felépítés és Fa Nézet Hardening (`/hr/organization`):**
  - A fa és a létszám-számláló kizárólag a valódi, aktív HR munkatársakat veszi figyelembe, megakadályozva a tisztán Docs felhasználók téves megjelenését az eaisyHR szervezeti egységeiben.
- **Kapcsolódó döntések:** [ADR A-066](../architecture/decisions/A-066-multi-tenant-company-members-colleague-visibility-and-hr-workforce-isolation.md), [PRD P-085](../product/decisions/P-085-multi-tenant-company-members-colleague-visibility-and-hr-workforce-isolation-ux.md).

## 2026-10-16

### 📨 eaisyDocs & eaisyHR: Értesítési Kiküldési Napló Központosítása és Rendszerbeállítások Letisztítása (A-064 / P-083)
- **Központi Eseménynapló Kétfülös Bővítése (`/audit`):**
  - **Fülek struktúrája:** Ikonmentes, tiszta `Rendszernapló (Audit)` és `Kiküldési Napló` fülek, kétirányú URL query-sync támogatással (`?tab=kikuldesi_naplo`).
  - **Kanonikus Linear Flat KPI Kártyák:** 4 db díszítésmentes `KpiCard` (Összes kiküldés, Sikeres kézbesítési arány %, Kézbesítési hiba darabszám, Kézbesített címzettek száma) szigorúan ikonok és színes szegélyek nélkül (ADR A-029).
  - **Szabványos `TableToolbar`:**
    - Instant gépelési keresőmező címzett e-mail/telefonszám, tárgy, iktatószám és üzenettartalom alapján.
    - Strukturált szűrőcsoportok popoverben: Csatorna (`email` / `sms`), Kézbesítési státusz (`sikeres` / `hibas` / `folyamatban`), Tematikus kategória (`docs` / `hr` / `system`).
    - Dátumtartomány szűrő gyorsgombokkal (`Mind`, `Ma`, `7 nap`, `30 nap`).
    - Oszlopok testreszabása és megjelenítés-választó popover.
  - **Kézbesítési Táblázat:**
    - Státuszjelvények, csatorna címkék, kattintható iktatószám hivatkozás, kiváltó ügyintéző/automatizmus feloldása.
    - Kiterjesztett szélességű (`max-w-4xl`–`xl:max-w-6xl`) modális üzenetbetekintő dialógus (`Dialog`) levágásmentes magassággal, ahol az e-mail alsó gombjai és lábléce is természetesen görgethető, a forráskód-váltó felesleges vizuális zaja nélkül.
    - Kliensoldali UTF-8 BOM CSV export és reszponzív lapozó.
- **Rendszerbeállítások Tehermentesítése és Letisztítása (`/settings` és `/hr/settings`):**
  - A korábbi elrejtett és szűretlen statikus táblázat, valamint az átvezető kártyák teljesen kivezetve az *Értesítések* fülről mind az eaisyDocs, mind az eaisyHR Beállítások oldalán.
  - A beállítások oldalak mostantól tisztán és kizárólag a riasztási és értesítési szabályok konfigurálására fókuszálnak.
  - A kiküldési napló kizárólag a logikus, dedikált helyén, a bal oldali oldalsávból elérhető Központi Eseménynaplóban (`/audit?tab=kikuldesi_naplo` és `/hr/audit?tab=kikuldesi_naplo`) érhető el.
  - A szerveroldali felesleges `ertesites_naplo` lekérdezés megszűnt a `settings/page.tsx`-ben, javítva a beállítások betöltési idejét.
- **Kapcsolódó döntések:** [ADR A-064](../architecture/decisions/A-064-notification-dispatch-audit-centralization-architecture.md), [PRD P-083](../product/decisions/P-083-notification-dispatch-audit-centralization-ux.md).

### 🛡️ eaisyDocs & eaisyHR: Értesítési Kiküldési Napló Moduláris Szétválasztása és eaisyHR Audit Integráció (A-065 / P-084)
- **Adatbázis Séma Bővítés & Multi-Tenancy (`public.ertesites_naplo`):**
  - Hozzáadva a `modul TEXT NOT NULL DEFAULT 'docs' CHECK (modul IN ('docs', 'hr'))` és a `company_id UUID REFERENCES public.companies(id)` oszlop.
  - Létrehozva a `idx_ertesites_naplo_modul`, `idx_ertesites_naplo_company_id` és az összetett `(modul, company_id, mikor DESC)` indexek.
  - Adatmigráció: a meglévő 66 rekordból pontosan 11 db HR-specifikus rekord (beleértve Kelemen Roberta 4 db toborzási, interjúmeghívó és belépési e-mailjét) `hr` modulba sorolva, az 55 iratkezelési értesítő pedig `docs` modulban hagyva.
- **Kiküldő Motorok Kiterjesztése (`mailer.ts` és `twilio.ts`):**
  - A `sendNotificationEmail` és `sendSmsNotification` modul és bérlő azonosítókat fogad (`modul?: 'docs' | 'hr'`, `companyId?: string`), fallback intelligens kulcsszó-detektálással.
  - Automatikus perzisztencia a modul és bérlő adatokkal.
- **eaisyDocs Központi Audit Napló Hardening (`/audit?tab=kikuldesi_naplo`):**
  - Kizárólag a `modul = 'docs'` iratkezelési értesítések lekérdezése (55 db), a HR adatok teljes elzárásával.
- **eaisyHR Központi Kiküldési Napló Megvalósítás (`/hr/audit?tab=kikuldesi_naplo`):**
  - A `/hr/audit` felület kétfülös struktúrára bővítve (`HR Eseménynapló (Audit)` és `Kiküldési Napló`), ikonok nélküli tiszta fülfejléccel és URL szinkronizációval.
  - Dedikált szerver akció (`getHrNotificationAuditLogs`) szigorú szerepkör-ellenőrzéssel és `modul = 'hr'` szűréssel.
  - 4 db Linear Flat `KpiCard` (Összes HR Értesítés, Sikeres Kézbesítés %, Hibás, Érintett Címzettek).
  - Szabványos `TableToolbar` HR kategória szűrőkkel (`recruitment`, `leave`, `health`, `contract`, `system`), dátumtartomány gyorsgombokkal és oszlopválasztóval.
  - Részletes, szélesített üzenetbetekintő dialógus levágásmentes levéltartalommal és CSV exportálással.
  - Az eaisyHR beállításokból (`/hr/settings`) a felesleges átvezető kártya szintén kivezetésre került a felület maximális letisztítása érdekében.
- **Kapcsolódó döntések:** [ADR A-065](../architecture/decisions/A-065-notification-dispatch-audit-module-separation-architecture.md), [PRD P-084](../product/decisions/P-084-notification-dispatch-audit-module-separation-ux.md).

## [2026-10-15]

### 🧹 eaisyHR: Séma-biztos PDF Adatlekérések, T1041 / Kiléptetési Adatintegritás és Globális Flat UI Letisztítás
- **PostgREST Séma Lekérdezési Javítások és Null-Safety:**
  - **Fegyelmi és Tanulmányi PDF-ek:** A `fetchDisciplinaryPdfData` és `fetchStudyContractPdfData` segédfüggvényekben megszűnt a `hr_dolgozo_adatlap` nem létező mezőinek (`taj_szam`, `adoazonosito_jel`, `szuletesi_hely`) közvetlen lekérdezése; a személyes azonosítókat mostantól biztonságos fallbackkel a legutóbbi `hr_munkaszerzodes` rekordból tölti be a rendszer, kiküszöbölve a 400 Bad Request futásidejű hibákat.
  - **Orvosi Alkalmassági Lap:** A `fetchMedicalExaminationData`-ban a `szukseges_kepzettseg` mező kikerült a munkaköri join lekérdezésből, megelőzve a generálási hibát.
  - **T1041 és Kiléptetési Tanúsítvány (`getT1041Data`, `generateExitCertificateAction`, `createOffboarding`):** A személyes azonosítók (TAJ, adóazonosító, születési hely/idő, anyja neve, lakcím) feloldása biztonságosan támaszkodik a munkaszerződésre és az adatlapi adatokra, így a hatósági bejelentőlapok és záró dokumentumok mindig hiánytalan adatokkal készülnek el.
  - **Eszköz- és Oktatási Jegyzőkönyvek:** Az `asset-actions.ts` és `safety-training-actions.ts` jegyzőkönyv-generátorai is felkészültek a szerződésből történő adatharmonizációra.
- **Rendszerszintű UI Letisztítás és Linear Flat Design Harmónia (.agents/AGENTS.md):**
  - **HR Munkaasztal (`/hr/admin`):** Eltávolításra kerültek a `Users` és `Clock` dekoratív ikonok a *„Dolgozói Törzsadatbázis”* és *„HR Teendők & Figyelmeztetések”* kártyafejlécekből.
  - **Compliance Hub (`/hr/compliance`):** Tisztított fülnevek és dekoratív naptár/óra/sisak ikonok eltávolítása a fülekről (*„Szabadságkiadás”*, *„Munkaidő és túlórakeret”*, *„Munkavédelem és Tűzvédelem”*).
  - **Dolgozói Részletes Adatlap (`/hr/employee/[id]`):** Valamennyi al-fül (`Alapadatok`, `Orvosi vizsgálatok`, `Fegyelmi ügyek`, `Bérpapírok`, `Változáskövetés`, `Cafeteria`, `Jelenlét`, `Kitüntetések`, `Bizalmas adatok`, `Tanulmányi szerződések`, `Szabadság`, `Munkaviszony`) kártyáiból kivezetésre kerültek a felesleges ikonok, színezett lekerekített dobozok és emojik a tiszta, professzionális megjelenés érdekében.
  - **Vezetői és Beosztás Kezelés (`/hr/manager`, `components/hr`):** Letisztult fejléc a beosztotti listában, a csapatnaptárban, a jóváhagyási panelen és a munkaidő-beosztás navigációs sávjában.
- **Kódminőség és Stabilitás:**
  - Javított `useEffect` dependency array-ek a naplózási és audit felületeken (`audit/page.tsx`, `hr/audit/page.tsx`).
  - SSR-biztos dátumformázás a szabálymotor kliensen (`rules-client.tsx`).

### 👥 eaisyHR: eaisyBooks Bérszámfejtési Dolgozók Importálása, Jogviszony Létrehozás és Törzsadatbázis Integráció (A-063 / P-082 / HR-TASK-06)
- **Közvetlen Bérszámfejtési Import Gomb a HR Munkaasztalon (`/hr/admin`):** Az Állomány áttekintés sávjában, közvetlenül az *„Új Munkatárs Rögzítése”* mellett megjelent a zöld-kiemelt *„Importálás eaisyBooks-ból”* gomb (`EaisyBooksEmployeeImportDialog`).
- **Linear-Flat Import Dialógus és Reszponzív Táblázat:**
  - Modern, szélesített modális ablak (`w-[95vw] sm:max-w-4xl lg:max-w-5xl`), fejléci bezáró gomb ütközésvédelemmel (`pr-12`).
  - Vízszintesen görgethető (`min-w-[760px]`), 6-oszlopos dolgozói táblázat (Kijelölés, Dolgozó neve & státusza, Munkakör & FEOR & heti óraszám, Szerkeszthető E-mail cím, Maszkolt TAJ & Adóazonosító, Belépési dátum).
  - Élő keresőmező azonnali szűréssel név, munkakör, e-mail vagy FEOR kód alapján.
- **Szelektív és Tömeges Kijelölés:**
  - Fejléci *„Összes kijelölése”* jelölőnégyzet az importálható dolgozókhoz.
  - Dinamikus számláló és állapotjelvények (*„Már állományban van”* inaktív sorral vs. zöld *„Importálható”*).
- **Egyedi E-mail Cím Kitöltési Lehetőség:**
  - Amennyiben az eaisyBooks bérszámfejtésben a dolgozóhoz nem tartozik e-mail cím, a HR-es közvetlenül az adott sor beviteli mezőjében megadhatja azt az importálás előtt.
  - Valós e-mail hiányában a rendszer belső placeholder címet generál (`nev.id@internal.eaisyhr.hu`), így a fióklétrehozás sosem akad el.
- **Opcionális Aktivációs és Meghívó E-mail:**
  - Láblécbe integrált kapcsoló: *„Meghívó e-mail küldése a munkatársaknak (jelszóbeállító linkkel)”*.
  - Bekapcsolt állapotban a Brevo rendszeren keresztül kiküldésre kerül az eaisyHR márkázott értesítés a Supabase Auth által generált biztonságos jelszóbeállító linkkel (`generateLink`).
- **Biztonságos Különleges Adattárolás és Titkosítás:**
  - A bérszámfejtésből áthozott TAJ szám, adóazonosító jel, bankszámlaszám, valamint bruttó és nettó bér szigorúan titkosított `BYTEA` formátumban (`toByteaHex`) perzisztálódik a `public.hr_dolgozo_titkos_adat` táblában.
- **Automatikus Törzsadat- és Jogviszony Létrehozás:**
  - Automatikus munkakör (`hr_munkakor`) feloldás és hiány esetén automatikus létrehozás az eaisyBooks megnevezéssel és FEOR kóddal.
  - Teljes munkavállalói adatlap (`public.hr_dolgozo_adatlap`) születési adatokkal, lakcímmel, anyja nevével, telefonszámmal és szerződéstípussal.
  - Jogviszony (`public.hr_jogviszony`) és beosztás (`public.hr_beosztas`) nyitás pontos belépési dátummal és számított munkaidő FTE értékkel.
  - Cégtagság (`public.company_members`) és felhasználói profil (`public.felhasznalo_profil`) `hr` modul hozzáféréssel.
  - Ennek köszönhetően az importált dolgozók azonnal megjelennek a Dolgozói Törzsadatbázisban.
- **Audit Naplózás:** Minden dolgozó importálása bekerül a `public.hr_esemeny_naplo` táblába `dolgozo_letrehozva` eseménytípussal.
- **Dokumentáció:** [ADR A-063](../architecture/decisions/A-063-eaisybooks-payroll-employee-import-architecture.md), [PRD P-082](../product/decisions/P-082-eaisybooks-payroll-employee-import-ux.md).

### 🤝 eaisyDocs: eaisyBill Partnertörzs Importálása, Számlaszinkron és Iratforgalmi Integráció (A-062 / P-081)
- **Közvetlen Import Gomb a Partnerek Felületén:** A Partnerek (`/partners`) főoldalán a szabványos `TableToolbar` akció sávjában, közvetlenül a `+ Új Partner` gomb mellett megjelent az „Importálás eaisyBill-ből” gomb (`EaisyBillPartnerImportDialog`).
- **Linear-Flat Importáló Modál:** Felugró ablak jeleníti meg az aktív céghez (pl. `SANDBOX`) tartozó összes eaisyBill partnert, összesítő statisztikákkal (összes partner, importálható új, már importálva, kijelöltek száma).
- **Azonnali Keresés és Típus Szűrők:** Valós idejű gépelési keresőmező (név, adószám, székhely, e-mail) és gyors szűrő pill-ek (`Mind`, `Csak új`, `Vevők`, `Szállítók`).
- **Szelektív és Tömeges Import:** Egyenkénti jelölőnégyzetek és fejléc szintű "Összes új partner kijelölése" funkció.
- **Négylépcsős Partner Duplikáció-védelem:** Az összevetés ellenőrzi az `eaisybill_partner_id`-t, az adószám első 8 számjegyét, a külföldi/EU adószámot és a nevet. A már meglévő partnerek sora letiltott és zöld *„Már importálva”* jelvénnyel védett.
- **Intelligens Jogi Forma és Szerepkör Detektálás:** Automatikus konverzió a céges rövidítésekből (`Kft.`, `Zrt.`, `Bt.`, `GmbH` -> `ceg`; `E.V.` -> `egyeni_vallalkozo`; hivatalok -> `intezmeny`), illetve a szerepköröknél (`customer` -> `vevo`, `supplier` -> `szallito`, `both` -> `mindketto`).
- **Partner Számlák és Iratforgalom Szinkronizációja (`syncEaisyBillPartnerInvoicesAction`):**
  - **Kizárólag PDF-fel rendelkező számlák áthozatala:** Szigorú szűrés `melleklet_url IS NOT NULL` feltételre, kizárva az üres iratokat.
  - **Irány és Azonosító Különválasztása:** Bejövő számláknál hivatalos érkeztetőszám (`E/2026/...`), kimenőknél a saját bizonylatszám (pl. `NAV-2026-OUT01`), amely azonosítóként azonnal megjelenik a táblázatban.
  - **Zéró-tárhely Fájlkapcsolat:** Az `irat_fajl.kulso_fajl_url` közvetlenül az eaisyBill csatolmányra mutat, így a belső `/api/pdf/[id]` és a `DocumentViewer` azonnal, vízjellel streameli a fájlt dupla tárolási költség nélkül.
- **Adatbázis Szintű Duplikációvédelem és SSR Render Biztonság:**
  - Létrehoztuk a `idx_irat_company_kulso_hivatkozas` egyedi parciális indexet a `(company_id, kulso_forras, kulso_hivatkozas_id)` mezőkre (`20261014000004_unique_external_invoice_sync.sql`), hardverszinten kiküszöbölve a számladuplikációt.
  - Megszüntettük a szerver komponens render-fázisában futó mutációt; a szinkron a partner legelső importálásakor, illetve a partner adatlapi `PartnerInvoiceSyncButton` gombbal fut le.
  - A számlák felmérését adminisztrátori kliens (`adminClient`) végzi, függetlenül a felhasználói RLS szűrőktől.
- **Partner Adatlap UI Tisztítás és Elrendezés:**
  - A részletes adatlap fülei (`Iratforgalom`, `Kapcsolattartók`, `Csatolt Ügyek`) letisztult, ikonok és számláló zárójelek nélküli tipográfiát kaptak.
  - A fejléc akciógombjai egységesen jobbra zártak (`justify-end sm:ml-auto shrink-0`), a redundáns `Új Irat érkeztetése` gomb kivezetésre került.
- **Audit Naplózás:** Minden importálás és számlaszinkronizáció append-only bejegyzést kap az `esemeny_naplo` táblába.
- **Dokumentáció:** [ADR A-062](../architecture/decisions/A-062-eaisybill-partner-master-import-architecture.md), [PRD P-081](../product/decisions/P-081-eaisybill-partner-master-import-ux.md).

### 🚀 eaisyDocs & eaisyHR: Vercel Serverless Felkészítés, E-mail Branding és Dolgozói Profil UX (A-061 / P-080)
- **Vercel Serverless Chromium Pack Támogatás:** A `src/utils/pdf-browser.ts`-ben az `@sparticuz/chromium-min` argumentum nélküli hívását lecseréltük a hivatalos v149.0.0 tar pack letöltési URL-re, megelőzve a Vercel Serverless környezetben fellépő `The input directory does not exist` hibát a PDF generáláskor.
- **Kánonikus Dinamikus URL-ek és Hotfolder Kezelés:** A `src/app/inbox/actions.ts` és `src/utils/batch-scanner.ts` korábbi hardkódolt `http://localhost:3000` hivatkozásait a központi `getBaseUrl()` segédfüggvényre cseréltük. A hotfolder elérési út Vercel környezetben automatikusan az `os.tmpdir()` írható mappát használja.
- **Azonnali E-mail Szinkronizáció (`/inbox`):** Új `InboxSyncButton` komponens és az `/inbox` felületre integrált gyorsgomb toast visszajelzéssel az élő demók és tesztelés során történő valós idejű e-mail lehíváshoz.
- **Moduláris eaisyHR E-mail Arculat:** A `src/utils/mailer.ts` `buildHtmlEmail` függvénye dinamikus `systemName: "eaisyDocs" | "eaisyHR"` paramétert kapott. A toborzási interjúmeghívók (`updateCandidateStatus`, `scheduleInterview`), az önkiszolgáló távolléti jóváhagyások és az éjszakai HR értesítők mostantól tisztán `eaisyHR Toborzás` / `eaisyHR Rendszer` feladóval és zöld eaisyHR fejléccel mennek ki.
- **Onboarding Különleges Adatszinkronizáció:** Kijavítottuk a fiókaktiválás (`activateEmployeeAccount`) adatlap frissítési hibáját (`szuletesi_datum` adatlapon, `belepes_datuma` a jogviszonyon). A munkaszerződésben megadott különleges adatok (TAJ szám, adóazonosító jel, bankszámlaszám, bruttó alapbér és nettó bér) mostantól automatikusan titkosítva, BYTEA hex formátumban perzisztálódnak a `hr_dolgozo_titkos_adat` táblában.
- **Dolgozói Profil Fülek Törésmentesítése és Nyílgomb-eltávolítás:** A `TabsList` a `src/app/hr/employee/[id]/page.tsx`-ben `flex-nowrap overflow-x-auto overflow-y-hidden [scrollbar-width:none]` stílust kapott, így az *„Előzmények”* fül soha nem törik le a második sorba, és a Windows natív görgetőnyilai is rejtve maradnak.
- **Dokumentáció:** [ADR A-061](../architecture/decisions/A-061-vercel-serverless-readiness-and-modular-hr-data-sync.md), [PRD P-080](../product/decisions/P-080-modular-hr-branding-and-profile-tabs-ux.md).

### 👥 eaisyDocs: eaisyBill Cégalapú Munkatárs-szinkronizáció és Szelektív Meghívó Rendszer (A-060 / P-079 / DOC-TASK-04)
- **Cégalapú Tagkezelés:** Az eaisyBill-ben minden vállalkozáshoz más-más felhasználók tartoznak (`company_members`). Az új funkció az aktív cég `eaisybill_company_id`-ja alapján párhuzamosan lekéri a céghez rendelt összes felhasználót, neveiket és e-mail címeiket.
- **Szelektív Import és Meghívás:** A Beállítások Cég fül Tagok kártyáján megjelent az „Importálás eaisyBill-ből” gomb, amely a kanonikus `EaisyBillMemberImportDialog` felugró modált nyitja meg. **Kizárólag a bepipált felhasználók kapnak hozzáférést és meghívó e-mailt**, megelőzve a kéretlen leveleket és a felesleges fióklétrehozást.
- **Állapotjelvények és Szerepkör Lefedés:** A modál vizuálisan megkülönbözteti a már meglévő cégtagokat (letiltott checkbox), a már regisztrált fiókokat (új cégtagság hozzárendelése) és az új munkatársakat (regisztráció és meghívó). Az eaisyBill pénzügyi szerepköreit intelligensen megfelelteti az iratkezelési jogosultságoknak (`admin`, `vezeto`, `iktato`, `ugyintezo`, `betekinto`), amely a sorban közvetlenül módosítható.
- **Biztonságos Jelszó-iniciálás:** Az új tagoknak a Brevo értesítő motoron keresztül márkázott meghívó e-mailt küldünk a Supabase Auth által generált biztonságos, egyszer használatos jelszóbeállító linkkel (`generateLink({ type: 'invite' })`).
- **Adatbázis Bővítés:** A `public.felhasznalo_profil` tábla bővült `email`, `eaisybill_user_id`, `sync_source` és `last_synced_at` mezőkkel, valamint egy automatikus e-mail szinkronizációs triggerrel (`trg_sync_felhasznalo_profil_email`).
- **Dokumentáció:** [ADR A-060](../architecture/decisions/A-060-eaisybill-company-member-sync-and-invite.md), [PRD P-079](../product/decisions/P-079-eaisybill-company-member-sync-and-invite-ux.md).

### 🏢 eaisyDocs & eaisyHR: Cég Törlése Funkció és Biztonsági Megerősítő Dialógus (A-059 / P-078)
- **Cégtörlés Jogosultság és Biztonság:** Kizárólag a vállalat tulajdonosa (`owner_id` vagy `company_members.role = 'owner'`), illetve a globális rendszergazda (`rendszergazda`) törölhet céget.
- **Biztonsági Megerősítő Dialógus (`AlertDialog`):** A törlés gomb megnyomásakor kanonikus felugró modál jelenik meg, amely figyelmezteti a felhasználót, hogy a törlés végleges és visszavonhatatlan, valamint minden kapcsolódó adatot (iratok, ügyiratok, szabályok, jogosultságok) töröl.
- **Intelligens Kontextus- és Cookie-kezelés:** Amennyiben az éppen aktív vállalat kerül törlésre, a szerveroldali művelet zökkenőmentesen átváltja a munkamenetet egy másik elérhető cégre (vagy törli a sütit), megelőzve az üres vagy hibás állapotokat.
- **Kaszkádolt Adatbázis Törlés és RLS:** A PostgreSQL táblák idegen kulcsai `ON DELETE CASCADE` szabállyal gondoskodnak a relációk tiszta törléséről, a cégtáblához pedig dedikált RLS törlési házirend (`companies_delete_policy`) került bevezetésre.
- **UI Integráció (`/settings`):** A Beállítások Cég fülén mind az aktív cég szerkesztőkártyáján („Cég törlése” gomb), mind az „Összes elérhető cégem” listában (diszkrét piros törlés ikon gomb minden tulajdonolt sorban) elérhető a művelet.
- **Dokumentáció:** [ADR A-059](../architecture/decisions/A-059-company-deletion-and-cascade-lifecycle.md), [PRD P-078](../product/decisions/P-078-company-deletion-and-management-ux.md).

### 🏢 eaisyDocs: eaisyBill Vállalat-import és Dinamikus Cégalapú Számlaszinkronizáció (A-058 / P-077)
- **Cégimport eaisyBill-ből:** A cégválasztó modál (`CompanySelector`) új, alapértelmezett **„eaisyBill import”** füllel és a lenyílóban közvetlen menüponttal bővült. Az elérhető vállalatok (90+ cég) valós időben kereshetők cégnévre, adószámra vagy címre.
- **Egykattintásos importálás és váltás:** A még nem importált vállalatok a „Cég importálása” gombbal átemelhetők, automatikusan megkapva a tulajdonosi tagságot, a megfelelő iktatási prefixet és RLS jogosultságot. A már áthozott cégeknél diszkrét „Már importálva – Váltás” gombbal lehet közvetlenül kontextust váltani.
- **Dinamikus bejövő számlaszinkronizáció (`/inbox`):** Megszűnt az egyetlen cégre (Think AI Kft.) korlátozott hardkódolt környezeti változó fallback. Az „Importálás eaisyBillből” gomb mindig a kiválasztott vállalat `eaisybill_company_id`-jához tartozó számlákat kérdezi le. A lekérdezési keretet 100-ról **1000 darabra** emeltük, a már importáltak szűrését 5000-re bővítettük.
- **Biztonság és Adatbázis:** Új `eaisybill_company_id UUID NULL` mező és egyedi parciális index a `public.companies` táblán. A meglévő Think AI Kft. rekord automatikusan össze lett kapcsolva az eaisyBill megfelelő azonosítójával.
- **Dokumentáció:** [ADR A-058](../architecture/decisions/A-058-eaisybill-company-import-and-sync.md), [PRD P-077](../product/decisions/P-077-company-selector-eaisybill-import-tab.md).

### 🛟 eaisyDocs: Egységes Hiba-, „Nem található” Oldalak és Betöltési Skeleton-ek (A-057 / P-076)
- **Hibakezelés:** új `error.tsx`, `not-found.tsx` és `global-error.tsx` magyar nyelvű, ikon nélküli felülettel; megjeleníti a hibakódot (`digest`), „Újrapróbálás” gombbal (`unstable_retry`) és visszalépéssel. eaisyHR útvonalakon a visszalépés az eaisyHR főoldalra mutat (`getErrorBackTarget`, teszttel).
- **Skeleton-ek:** új `DashboardSkeleton`, `DetailSkeleton`, `SplitViewSkeleton`; `loading.tsx` a Vezérlőpulthoz, az ügyirat-, partner- és bejövő-adatlapokhoz, a Szabályokhoz; a Beállítások skeleton-je újraírva. A `ContentSkeleton` új `padded` propot kapott, a külön térközű oldalak layout-ugrás nélkül töltenek.
- **Szerkezet:** a `src/app/page.tsx` a `(dashboard)` route group-ba került (URL változatlan), hogy a Vezérlőpult skeleton-je ne jelenjen meg a `/login`, `/karrier`, `/embed` és `/hr/*` útvonalakon. Az `/audit` oldal kliens oldali betöltési állapota miatt kimaradt.
- **Biztonsági mentés a változtatás előtt:** git tag `backup/pre-a1-a2-a8-2026-10-14` és csak olvasási adatbázis-pillanatkép (85 tábla, sorszámokkal ellenőrizve; nem tartalmazza a tárolt fájlokat és a jelszavakat).
- **Dokumentáció:** [ADR A-057](../architecture/decisions/A-057-route-error-boundaries-and-loading-skeleton-conventions.md), [PRD P-076](../product/decisions/P-076-error-not-found-and-loading-states-ux.md).

### 📦 eaisyDocs: Fizikai Irattári Helymeghatározás Kereshető Combobox Menü, Megjegyzés Perzisztencia és Kölcsönzési Gombok Harmonizációja (A-055 / P-074)
- **Kereshető Combobox Menü (`LocationCombobox` a `PhysicalLocationDialog`-ban):**
  - Megszüntettük a beviteli mezők alatti zavaró és helypazarló statikus chipeket (`Meglévő: ...`), valamint a felesleges `Gyorsválasztó` feliratot.
  - A mező jobb oldalán diszkrét számlálóval és `ChevronDown` nyíllal ellátott lenyíló Popover menü jött létre.
  - A menün belül azonnal fókuszba kerülő keresősáv szűri a meglévő helyeket (polc/doboz) valós időben.
  - A kiválasztott tétel vizuális kiemelést (`Kiválasztva`) és pipát (`Check`) kap.
  - Új érték beírásakor a menü alján megjelenő gyorsgombbal (vagy az `Enter` leütésével) egyetlen mozdulattal felvehető az új koordináta anélkül, hogy manuálisan újra kellene gépelni.
  - Egykattintásos törlés a beviteli mezőben (`X` gomb) és a menü láblécében.
- **Tárolási Megjegyzés Adatperzisztencia és Megjelenítés:**
  - Kijavítottuk a szerveroldali Supabase lekérdezést az ügyirat adatlapon (`src/app/dossiers/[id]/page.tsx`): a lekérdezés mostantól a `megjegyzes` mezőt is lekéri (`irat_fizikai_hely ( doboz, polc, megjegyzes )`).
  - A rögzített megjegyzés a táblázat soraiban a hely alatt dőlt betűs második sorként és teljes tooltipként is megjelenik.
  - A modál újranyitásakor az elmentett megjegyzés automatikusan visszatöltődik a beviteli mezőbe.
  - A `setPhysicalLocation` Server Action-ben kiegészítettük az `isClearing` vizsgálatot és az audit eseménynaplózást.
- **Fizikai Hely & Kölcsönzés Gombok Frontend Harmonizációja (`iratok-lista.tsx`, `borrow-dialog.tsx`):**
  - A táblázat soraiban a korábbi függőleges egymás alá halmozást (`flex-col`) vízszintes, elegáns egymás melletti elrendezésre (`flex items-center gap-1.5 flex-wrap`) cseréltük.
  - A `+ Hely rögzítése` és `Kölcsönzés rögzítése` gombok 100%-ban azonos geometriát, magasságot (`h-7`), margót (`px-2.5 rounded-md text-[11px] font-medium`) és szaggatott keretet (`border-dashed border-border/80 hover:border-primary/50 hover:bg-primary/5`) kaptak.
  - A `BorrowDialog`-ban feloldottuk a mesterséges jogosultsági szűkítést, így a szervezet bármely aktív munkatársa kiválasztható kölcsönvevőként.
- **Iktatókönyv és Irattár Betekintő Egységesítés (`dossiers-table-client.tsx`, `document-viewer.tsx`):**
  - Az iktatókönyvben lévő megtekintés (szem ikon) működését harmonizáltuk a bejövő sorral a központi `DocumentViewer` meghívásával.
- **Irattár és Selejtezés UX Tisztítás (`archive-client.tsx`):**
  - Eltávolítottuk a fülekről (`Javaslatok`, `Jóváhagyandó`, `Irattárban`) a redundáns számláló jelvényeket, mivel a felette lévő KPI kártyák már egyértelműen mutatják a pontos darabszámokat.
  - A Javaslatok és a Jóváhagyandó fül feletti felesleges figyelmeztető bannereket (pl. a sárga háromszöges "Jóváhagyandó Selejtezések (Szigorú Négy-szem elve)" dobozt) megszüntettük, és egyetlen kompakt, egységes eszköztárrá alakítottuk az elemszámmal és a műveleti gombokkal.
  - A „Selejtezett & Jegyzőkönyvek” fülön lévő táblázatok fejléceit letisztítottuk: eltávolítottuk az ikonokat/emojikat és az alcímeket, így kizárólag a tiszta főcím maradt meg.
- **Vezérlőpult (Dashboard) Lejáró Határidők és Saját Feladatok Tisztítás (`dashboard-overview.tsx`):**
  - Eltávolítottuk a fejlécből a felesleges "Határidők / Feladatok" gombokat, és optimalizáltuk a saját szignált feladatok szűrését.
- **Ügyirat Adatlap Fül- és Fejléc Címek Egyszerűsítése (`/dossiers/[id]`):**
  - A „Feladatok & Megjegyzések” fül címét rövidebbre és közvetlenebbre („Feladatok”) cseréltük.
  - A „Válaszlevelek & Expediálás” fület és a kimenő iratok fejlécét a letisztultabb „Válaszlevelek” megnevezésre frissítettük.
- **Modál és Varázsló Bezáró Gomb (X) Megjelenítési Javítás (`dialog.tsx`, `sheet.tsx`, `outgoing-documents-tab.tsx`):**
  - Javítottuk a Base UI `DialogPrimitive.Close` és `SheetPrimitive.Close` renderelési hibáját, ahol a `render={<Button ... />}` prop miatt az `XIcon` törlődött és csak hover hatására jelent meg egy üres háttérnégyzet. Az ikont közvetlenül a gomb belsejébe helyeztük, így a bezáró `X` ikon mindig tisztán látható.
  - A válaszlevél varázsló fejlécében jobboldali margót (`pr-8`) adtunk a felső sornak, így az ügyiratszám és a bezáró gomb többé nem ütközik vagy takarja ki egymást.
- **Dokumentáció:** [ADR A-055](../architecture/decisions/A-055-physical-location-combobox-and-storage-note-persistence.md), [ADR A-056](../architecture/decisions/A-056-base-ui-dialog-close-composition-and-render-prop-pattern.md), [PRD P-074](../product/decisions/P-074-physical-storage-searchable-combobox-and-custody-action-harmonization.md), [PRD P-075](../product/decisions/P-075-archive-and-dossier-ux-simplification-and-dialog-header-harmony.md).

### 📎 eaisyDocs: Többcsatolmányos E-mailek Kezelése, Irat-szétválasztás és Iktatási UX Egyszerűsítés (A-054 / P-073)
- **Közvetlen Iktatófelület Elérés (`/inbox` -> `/inbox/[id]`):**
  - Megszüntettük a redundáns és elavult 3 kártyás köztes oldalt (`/inbox/view/[id]`), amely a táblázat kattintásakor feleslegesen nyílt meg és téves előzményvizsgálattal terhelte a felhasználót.
  - A bejövő sorban az érkeztetőszám és a tárgy mostantól közvetlenül a modern osztott képernyős iktatófelületre (`/inbox/[id]`) visz.
  - Az `/inbox/view/[id]` útvonal biztonsági automatikus átirányítást (`redirect`) kapott az iktató felületre.
- **Többcsatolmányos Előnézet és Fülválasztó (`FilingPanelClient`):**
  - Ha egy levélben több melléklet (pl. 2 külön PDF számla) érkezik, az előnézeti terület felett egy diszkrét csatolmánysáv (`Csatolmányok (N)`) jelenik meg fájlmérettel és fájlnévvel.
  - A fülekre kattintva a beépített PDF előnézet azonnal a kiválasztott fájlra vált át anélkül, hogy az űrlap adatai törlődnének.
- **„Szétválasztás önálló irattá” (Tranzakcionális Document Split):**
  - Új Server Action (`splitAttachmentToNewIncoming`): egyetlen kattintással leválasztható az éppen nézett csatolmány, ha az egy külön számlát képvisel.
  - A rendszer új hivatalos érkeztetőszámot generál (`generate_erkeztetoszam` RPC), létrehoz egy új érkeztetett bejövő iratot, átmozgatja a csatolmányt, mindkét irathoz append-only audit naplót jegyez be, és elindítja az aszinkron AI OCR feladatot az új iratra.
  - Az eredeti iratban a megmaradt csatolmány azonnal folytatható és iktatható.
- **Egysoros, Integrált Előnézeti Fejléc (UX Letisztítás):**
  - Eltávolításra kerültek a redundáns gombok (`Válasz`, `Nem iktatandó`, külső link); a bal oldali sáv egyetlen tiszta `h-11`-es toolbar lett: `[← Vissza]` | `[Csatolmányfülek]` | `[Szétválasztás önálló irattá]`.
  - A PDF előnézeti munkaterület maximális vertikális helyet kapott, minimális vizuális zajjal.
- **Felhasználóbarát, Tömör Előzmény Javaslat Kártya:**
  - Kivezetésre kerültek a belső algoritmus pontszámok (`+32%`, `+25%`) és a nehezen olvasható token listák.
  - A meglévő ügyirathoz kapcsolódó javaslat egy mindössze 2 soros, emberi nyelven megfogalmazott magyarázatot kapott:
    - Felső sor: `🔗 Javasolt előzmény: <iktatószám> [<egyezés>%] | ✓ Csatolva` (vagy `[Csatolás ehhez]` ha új ügy módban áll).
    - Alsó sor: 1 rövid, természetes mondat a döntés hátteréről (azonos partner és téma egy nyitott ügyiratban).
- **Többcsatolmányos Gyorsbetekintő a Főoldali Táblázatban (`DocumentViewer`):**
  - A bejövő táblázat megtekintés (szem ikon) modálja több melléklet esetén interaktív füleket kapott a csatolt fájlok közötti kényelmes átváltáshoz.
- **eaisyBill Számla Gyorsbetekintő az Import Panelben (`EaisyBillImportPanel`):**
  - A bejövő sor tetején lévő "Importálás eaisyBill-ből" táblázat Műveletek oszlopában az `[Átvesz]` gomb mellé bekerült a kanonikus megtekintés (szem ikon) gomb.
  - A gombra vagy a bizonylatsorszámra kattintva egy in-place `Dialog` modál nyílik meg (`DocumentPreviewFrame`), ahol a felhasználó a számla importálása előtt ellenőrizheti az eredeti számla PDF-et és metaadatait.
  - A modál fejlécéből közvetlenül kezdeményezhető az átvétel (`[Átvesz a bejövő sorba]`), amely azonnal dinamikus "Átvéve" jelvénnyel nyugtázódik a táblázatban és a modálban is.
- **Dokumentáció:** [ADR A-054](../architecture/decisions/A-054-multi-attachment-handling-and-document-splitting-architecture.md), [PRD P-073](../product/decisions/P-073-multi-attachment-switcher-and-document-split-ux.md).
- **Munkaköri Profil Kártya (`EmploymentTab` & `self-service/profile`):**
  - Eltávolítva a fejlécből a redundáns "Munkaköri Leírás Megtekintése" és letöltés gomb; helyét a dolgozói nézetben a tiszta "Munkakör törzslap" közvetlen link vette át.
  - Az alsó "Hivatalos Munkaköri Leírás" dokumentumsávban a `Betekintés` (`PdfViewerDialog`) gomb mellé közvetlenül elhelyezésre került a `Letöltés` akciógomb.
- **Munkakör-katalógus Táblázat (`/hr/organization?tab=jobs`):**
  - A `JobEditDialog` refaktorálásra került: kizárólag akkor renderel triggert, ha azt explicite átadják (`trigger ? ... : null`), megszűntetve a vezérelt `JobActionMenu` alatti duplikált második "Munkakör szerkesztése" gombot.
  - A műveleti oszlopban a kompakt `Adatlap` gomb, szerkesztés ceruza ikon és törlés kuka ikon jelenik meg egységesen.
- **Munkaköri Részletes Adatlap (`/hr/job/[id]`):**
  - Megszűntek a kártyafejlécekbe zsúfolt ismétlődő szerkesztőgombok ("Adatok módosítása", 2x "Szerkesztés"); az entitás módosítása kizárólag a lap tetején lévő központi "Munkakör szerkesztése" gombról érhető el.
  - Linear-flat design szabályozás betartása: eltávolításra került az összes nem funkcionális Lucide piktogram (épület, táska, sztetoszkóp, vágólap, sapka, pajzs, sisak, dokumentum) a fejlécekből, fülekből, kártyacímekből, adatmezőkből és az üres állapot dobozból.
- **Dokumentáció:** [ADR A-053](../architecture/decisions/A-053-hr-job-profile-and-catalog-action-deduplication.md), [PRD P-072](../product/decisions/P-072-hr-job-profile-and-catalog-ux-declutter-and-deduplication.md).

### 📋 eaisyHR: Nyilvántartott Munkakörök Törzsadatai, Korszerű Szerkesztő és Rendszerszintű Integráció (A-052 / P-071)
- **Központi, Tágas Munkakör Szerkesztő Komponens (`JobEditDialog`):**
  - Elkészült az új kanonikus `JobEditDialog` (`src/components/hr/job-edit-dialog.tsx`), amely 720px széles, kényelmes felületen 3 külön fülön teszi elérhetővé a teljes munkaköri specifikációt:
    1. *Alapadatok & Besorolás:* Megnevezés, KSH FEOR-08 kód segédlettel, besorolási szintek és szervezeti egység választó.
    2. *Feladatok & Kompetenciák Dinamikus Kezelő:* A korábbi szűk, nyers `textarea` mezőket kiváltotta az interaktív elemlistás feladatkezelő (sorszámozott tételek, Enterrel rögzítés, több soros másolás felismerése, tétel törlés) és a dinamikus kompetencia chip/badge kezelő.
    3. *Munkavédelem & Orvosi:* Kockázati kategória, kötelező egyéni védőeszköz (EVE) igény, valamint kötelező foglalkozás-egészségügyi vizsgálat típusa és esedékességi gyakorisága (hónapban).
- **Munkaköri Részletes Adatlap (`/hr/job/[id]`) Korszerűsítése:**
  - A fejléc jobb szélére bekerült a kiemelt "Munkakör szerkesztése" gomb, valamint a feloldott szervezeti egység outline badge és a FEOR kód.
  - Az "Alapadatok & Leírás" fül elején megjelent egy új "Munkaköri Törzs- és Minősítési Adatok" összegző sáv közvetlen "Adatok módosítása" gyorsgombbal, valamint a feladatok és kompetenciák kártyák fejléceiben is közvetlen szerkesztési trigger érhető el.
  - A szerkesztés mentése (`updateMunkakor`) automatikusan revalidálja a munkaköri adatlapot és a szervezeti nézeteket.
- **Katalógus Listanézet Egységesítése (`JobActionMenu`):**
  - A `/hr/organization?tab=jobs` munkaköri táblázatában a szerkesztés gomb mostantól szintén a modern `JobEditDialog`-ot nyitja meg, megszüntetve a korábbi apró, kényelmetlen dialógust.
- **Munkaköri Adatok Rendszerszintű Integrációja a Dolgozói Adatlapon (`EmploymentTab`):**
  - A "Munkaviszony és Munkarend" nézetben a "Jelenlegi Beosztás" kártya legfelső tételeként mostantól azonnal látható a betöltött munkakör és FEOR kódja.
  - Új reprezentatív **"Munkaköri Profil és Követelmények"** kártya jött létre:
    - Részletesen listázza a dolgozó munkaköréhez rendelt összes hivatalos feladatot és felelősségi kört.
    - Feltünteti az elvárt kompetenciákat és a kötelezően előírt egyéni védőeszközöket (EVE).
    - Megjeleníti az üzemorvosi alkalmassági vizsgálat típusát és gyakoriságát.
    - Ha van feltöltve hivatalos verzionált Munkaköri Leírás PDF, közvetlen betekintési (`PdfViewerDialog`) és letöltési gombot biztosít.
    - Közvetlen ugróhivatkozást nyújt a munkakör központi adatlapjára (`/hr/job/[id]`).
- **Önkiszolgáló Portál Integráció (`SelfServiceProfilePage`):**
  - A dolgozók a saját profiljukon (`/hr/self-service/profile`) új, informatív kártyán tekinthetik át a rájuk vonatkozó hivatalos feladatkört és a munkavégzésükhöz kötelező védőeszközöket.
  - A `JobDescriptionAcknowledgment` figyelmeztető doboz kibővült egy "Átolvasás (PDF)" gombbal, amellyel a munkavállaló egyetlen kattintással ellenőrizheti a verzionált munkaköri leírást még a digitális nyugtázás előtt.
- **Dokumentáció:** [ADR A-052](../architecture/decisions/A-052-hr-job-catalog-specification-and-omnipresent-integration.md), [PRD P-071](../product/decisions/P-071-hr-job-catalog-specification-and-omnipresent-integration.md).

### 🏢 eaisyHR: Szervezeti Felépítés és Beállítások Teljes Építészeti Szétválasztása (A-051 / P-070)
- **A "Munkatársak" Fül Eltávolítása a Beállításokból (`/hr/settings`):**
  - A dolgozók adminisztrációja, felvétele (`+ Új Dolgozó`) és szerkesztése mostantól 100%-ban az Állomány Áttekintés (`/hr/admin`) és a Dolgozói Adatlap (`/hr/employee/[id]`) feladata.
  - A `/hr/settings` oldalról eltávolításra került a teljes nehéz, 7-8 táblás szerveroldali dolgozói lekérdezéscsomag és a redundáns `SettingsEmployeeTable`.
- **Gyorsmódosító és Törlési Műveletek az Állomány Áttekintésben (`/hr/admin`):**
  - Az adminisztrátorok és HR vezetők számára az állománytáblázat "Műveletek" oszlopában közvetlenül megjelent a Módosítás (`EmployeeEditDialog`) és a Törlés (`EmployeeDeleteDialog`) funkció, miközben a munkavállalók továbbra is csak a megtekintést (`Adatlap →`) érik el.
  - A szervezeti egység oszlopban mostantól a dolgozó valós, dinamikusan feloldott szervezeti egysége jelenik meg outline badge formátumban, instant szűrési lehetőséggel a táblázat fejlécében.
- **Önálló "Szervezeti Felépítés" Képernyő (`/hr/organization`):**
  - Új dedikált modul és útvonal jött létre `src/app/hr/organization/page.tsx` és `src/components/hr/organization-tabs-view.tsx` formájában.
  - A bal oldali főmenüben a `HR Munkaasztal` alatt kapott közvetlen menüpontot ("Szervezeti Felépítés").
  - Három áttekinthető fül:
    1. **Szervezeti Ábra (`OrgChartTree`):** Vállalati fanézet a hierarchiáról és a beosztottakról.
    2. **Szervezeti Egységek:** Kereshető részleg- és osztálylista dolgozói létszámmal és szerkesztési műveletekkel.
    3. **Munkakör-katalógus:** Munkaköri leírások, FEOR kódok és betöltöttségi státuszok kezelése.
  - Kanonikus `KpiCard` összegző sáv a legfontosabb szervezeti egység és munkakör mutatókkal.
- **A Beállítások Megtisztítása:**
  - A `/hr/settings` felület kizárólag a valódi konfigurációkat tartalmazza: Profil, Cég, Rendszer (téma, nyelv, formátumok), Biztonság és Értesítések.
  - Frissítve a részletes szervezeti egység (`/hr/orgunit/[id]`) és munkakör (`/hr/job/[id]`) oldalak breadcrumbjai és visszanavigációs gombjai, hogy a `/hr/organization`-re mutassanak.
- **A Redundáns "Központi Áttekintés" (`/hr/admin/overview`) Kivezetése:**
  - Mivel a feladatok, teendők (`hr-tasks-and-alerts-table.tsx`), a dolgozói létszámok és az operatív funkciók már mind az **Állomány áttekintés** (`/hr/admin`) alá kerültek, a korábbi "Központi Áttekintés" menüpont törlésre került a bal oldali menüből.
  - A `/hr/admin/overview` útvonal automatikus átirányítást kapott a `/hr/admin`-ra az esetleges elavult könyvjelzők vagy megnyitott tabok zökkenőmentes kezeléséhez.
- **Dokumentáció:** [ADR A-051](../architecture/decisions/A-051-hr-organization-structural-separation-from-settings.md), [PRD P-070](../product/decisions/P-070-hr-organization-structural-separation-from-settings.md).

## [Unreleased] – Fejlesztés alatt (2026-10-10)

### 🔗 eaisyDocs & EaisyBILL: Felhasználókezelés és Adatforrás Integrációs Kutatás (DOC-04)
- **Átfogó Kódbázis és Adatmodell Felmérés:**
  - Teljes mélységű kutatás a VisiBILL / EaisyBILL kódbázis felépítéséről, profilkezeléséről (`profiles` tábla), szervezeti egységeiről (`departments`) és szerepköreiről (`app_role`).
  - Létrejött az átfogó integrációs és architektúra dokumentum: [`docs/integrations/eaisybill-user-sync-research-and-architecture.md`](../integrations/eaisybill-user-sync-research-and-architecture.md).
- **Négyfázisú Megvalósítási Terv:**
  - *Fázis 1:* Adatbázis sémakiterjesztés (`external_id`, `sync_source`, `last_synced_at`, `eaisybill_config` tábla).
  - *Fázis 2:* Biztonságos EaisyBILL API és szinkronizációs kliens (`src/utils/integrations/eaisybill-client.ts`).
  - *Fázis 3:* Szinkronizációs varázsló UI a Beállítások oldalon (`/settings?tab=integrations`).
  - *Fázis 4:* Automatizált inkrementális háttérszinkronizáció (CRON és Webhook támogatás).

### 🎨 Rendszerszintű UI/UX Tisztítás és Ikon-Minimalizálás (Linear Flat Design Standard – A-029 / P-043)
- **Címekből és Kártyafejlécekből a Dekoratív Ikonok Eltávolítása:**
  - A projekt szabályzat (`.agents/AGENTS.md`) és az [A-029](../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md) szellemében felszámolásra kerültek az ad-hoc, redundáns dekoratív ikonok és kerekített ikondobozok.
  - **Iktatási Szabályok (`/rules`):** Eltávolítva a címsor (`Sliders`), fülek (`Sliders`, `Brain`), kártyafejlécek (`CardTitle`), modál címek és üres állapotok dekoratív ikonjai.
  - **Rendszerbeállítások (`/settings`):** Eltávolítva az összes kártyacím-ikon a profil, cég, szervezeti egység, irattári terv és adminisztrációs blokkokból.
  - **Jelenlét és Szabadság (`/hr/self-service/time`):** Eltávolítva a `CalendarDays` ikon a „Jelenléti Ív” kártya kibontható fejlécéből, és a `CalendarClock` ikon a „Helyettesítés” kártyacímből. Tisztítva a kapcsolódó munkaidő-korrekciós és túlóra modálok címei is.
  - **HR Főoldalak:** Megtisztítva a Bérszámfejtés (`/hr/payroll`, `/hr/self-service/payroll`) és Teljesítményértékelés (`/hr/performance/dashboard`) fejléc-ikonjai.

### 🛡️ eaisyDocs: Központi Eseménynapló Teljes Újragondolása és Dedikált Modul (A-050 / P-069)
- **Dedikált Főútvonal és Oldalsáv Navigáció (`/audit`):**
  - A korábbi, nehezen hozzáférhető és kezdetleges „Globális Audit Napló” átkerült a Beállítások felület legaljáról egy dedikált, kiemelt felületre (`/audit`).
  - Az oldalsáv navigációba (`app-sidebar.tsx`) bekerült az **„Eseménynapló”** menüpont (`ShieldAlert` ikonnal), amely a jogosult szerepkörök (`admin`, `rendszergazda`, `auditor`, `vezeto`) számára azonnal elérhető.
  - A beállítások oldalról (`/settings`) a felesleges redundáns kód és a szerveroldali naplólekérés maradéktalanul kivezetésre került.
- **Központi Képernyő Teljes Megújítása az eaisyHR Mintájára:**
  - Modern, kifejező felület a legfrissebb Linear flat design irányelvek szerint.
  - Új szemantikus műveleti motor (`DOCS_EVENT_CONFIG`): 6 logikai kategóriára bontott műveletek (Betekintés/Megnyitás, Iktatás/Létrehozás, Módosítás, Szignálás, Selejtezés, Lezárás/Archiválás), színkódolt szemantikus HSL jelvényekkel és ikonokkal.
  - Központi `formatAuditLogEvent` motor integráció ([A-046](../architecture/decisions/A-046-canonical-audit-log-formatting-engine.md)): Emberileg azonnal érthető magyar leírások, iktatószámok és részletek.
- **Kanonikus KPI Statisztikai Kártyák (Linear Flat Grid - A-029):**
  - Négy dedikált `KpiCard` kártya a fejléc alatt: *Összes Audit Esemény*, *Irat Betekintés & Letöltés*, *Iktatások & Módosítások*, valamint *Közreműködő Felhasználók*.
- **Kanonikus TableToolbar és Többdimenziós Szűrés:**
  - Integrálásra került a központi `TableToolbar` komponens:
    - **Felhasználói szűrés:** Dinamikusan generált választólista az eseményekben szereplő kollégákból és adminokból.
    - **Műveletkategória szűrés:** Megtekintés, Létrehozás/Iktatás, Módosítás, Szignálás, Selejtezés, Lezárás.
    - **Entitástípus szűrés:** Irat, Ügyirat, Irattári tétel, Helyettesítés, Rendszer.
    - **Dátumtartomány:** Kezdő és záró dátum mezők, valamint instant gyorsgombok (*Mind*, *Ma*, *Elmúlt 7 nap*, *Elmúlt 30 nap*).
    - **Azonnali Keresőmező:** `Search` ikonnal, valós idejű gépelési szűréssel és törlőgombbal.
    - **Oszlopválasztó (`Columns3`):** Testreszabható látható oszlopok.
    - **CSV Export:** Microsoft Excel-kompatibilis UTF-8 BOM (`\uFEFF`) kódolású export, a kiválasztott cég nevével a fájlnévben.
- **Részletes Audit Esemény Betekintő Modal (`Dialog`):**
  - Bármely bejegyzésre kattintva megnyitható a részletes adatlap:
    - Közreműködő adatai: név, szerepkör, IP cím és böngésző User-Agent.
    - Esemény adatai: pontos időbélyeg, cégazonosító, entitás típus és ID.
    - Értékváltozás (Diff) összehasonlító táblázat: korábbi érték piros áthúzással, új érték zöld kiemeléssel a JSON módosításokhoz.
- **Többcég-kezelés (Multi-Tenancy) és GDPR Védelem:**
  - A felület szorosan együttműködik a `useCompany()` hookkal: a felső sávban cégváltáskor az audit napló azonnal az aktív vállalathoz tartozó eseményekre frissül.
  - A fejléc a kanonikus `Building2` cégjelvénnyel egyértelműen mutatja az aktív szervezetet.
- **Dokumentáció:** [ADR A-050](../architecture/decisions/A-050-eaisydocs-central-audit-log-overhaul.md), [PRD P-069](../product/decisions/P-069-eaisydocs-central-audit-log-overhaul-ux.md).


### 🏢 eaisyHR: Központi Áttekintés Többcég-kezelés és Pontos KPI Metrikák (A-049 / P-068)
- **Cég szerinti szigorú adatizoláció (`/hr/admin/overview`):**
  - Megszűnt a cégcsoportos áttekintőben tapasztalt adatszivárgás: a statisztikák korábban globálisan, cégfüggetlenül mutatták az aktív dolgozókat, a nyitott pozíciókat, a távolléteket és az onboarding folyamatokat.
  - A szerveroldali lekérdezések mostantól a sütiből feloldott `activeCompanyId` / `companyScope` hatókörben futnak:
    - **Aktív Dolgozók:** Csak a `company_members` alapján az aktív céghez rendelt dolgozók száma jelenik meg (pl. Teszt Kft.-nél pontosan 2 fő, Think AI Kft.-nél 6 fő).
    - **Nyitott Pozíciók & Toborzás:** Csak az adott céghez tartozó álláshirdetések és pályázati fázisok (`hr_toborzas.company_id`).
    - **Aktív Onboarding:** Szigorúan az aktív céghez tartozó folyamatban lévő beillesztések (`hr_onboarding.company_id`).
    - **Mai Hiányzók & Szabadságkérelmek:** Céghez kötött távolléti adatok (`hr_tavollet.company_id`).
    - **Lejárati Figyelmeztetések:** Orvosi alkalmasságiak, próbaidők és határozott idejű szerződések szűrése az aktív cég tagjaira (`safeMemberIds`).
- **Céghez kötött adminisztratív akciók:**
  - A `reassignPendingLeaves` szerver akció mostantól a `getActiveCompanyIdServer()` segítségével kizárólag a kiválasztott cég függő szabadságkérelmeit szignálja át.
- **Vizuális Visszajelzés:**
  - A fejléc a kanonikus Linear flat stílusú `Building2` cégjelvénnyel (`Badge`) azonnal és egyértelműen mutatja a munkakörnyezetül szolgáló aktív vállalat nevét.
- **Dokumentáció:** [ADR A-049](../architecture/decisions/A-049-hr-central-overview-multi-tenant-scoping-and-kpi-accuracy.md), [PRD P-068](../product/decisions/P-068-hr-central-overview-multi-tenant-scoping-and-kpi-accuracy-ux.md).

### 📊 eaisyHR: Központi Eseménynapló Teljes Újragondolása, Kanonikus TableToolbar és Többdimenziós Szűrés (A-048 / P-067)
- **Központi Képernyő Teljes Megújítása (`/hr/audit`):**
  - Felszámolásra került az eddigi nyers prototípus felület, ahol a bejegyzések 95%-a semmitmondó „Ismeretlen” jelvénnyel és belső SQL táblanevekkel (`hr_dolgozo_titkos_adat`, `hr_munkavedelmi_oktatas`, `hr_offboarding`, `hr_onboarding_feladat`) jelent meg.
  - Új szemantikus leképező motor: `HR_ENTITY_CONFIG` és `HR_EVENT_CONFIG` magyar modulnevekkel, kategóriákkal és színkódolt HSL badge-ekkel (kék `info` olvasáshoz, zöld `success` létrehozáshoz, sárga `warning` módosításhoz, piros `destructive` törléshez).
  - A megjegyzésekből automatikusan kitisztításra kerültek a belső UUID azonosítók.
- **Kanonikus KPI Statisztikai Kártyák (Linear Flat Grid - A-029):**
  - Négy dedikált `KpiCard` kártya a lap tetején: *Összes Audit Esemény*, *Érzékeny Adat Betekintés* (kiemelt kerettel), *Módosítások & Törlések*, valamint *Közreműködő Felhasználók*.
- **Kanonikus TableToolbar és Többdimenziós Szűrés:**
  - Integrálásra került a központi `TableToolbar` komponens:
    - **Felhasználói szűrés:** Dinamikusan generált választólista a naplóban szereplő összes HR munkatársból és adminisztrátorból.
    - **Művelettípus szűrés:** Megtekintés / Olvasás, Létrehozás / Iktatás, Módosítás, Jóváhagyás / Nyugtázás, Törlés, Rendszeresemény.
    - **Modul / Szakterület szűrés:** Bizalmas adatok, Személyes adatok, Iratok & Szerződések, Munkavédelem & Egészségügy, Munkaidő & Jelenlét, Beléptetés & Kiléptetés, Cafeteria, Bérszámfejtés stb.
    - **Dátumtartomány:** `Kezdő dátum` és `Záró dátum` mezők, valamint instant gyorsgombok: *Mind*, *Ma*, *Elmúlt 7 nap*, *Elmúlt 30 nap*.
    - **Azonnali Keresőmező:** `Search` ikonnal, valós idejű gépelési szűréssel és `X` törlőgombbal.
    - **Oszlopválasztó (`Columns3`):** Testreszabható oszlopnézet.
    - **CSV Export:** Teljes szűrt napló exportálása Microsoft Excel-kompatibilis UTF-8 BOM karakterkódolással.
- **Részletes Esemény Betekintő Modal (`Dialog`):**
  - Részletes adatlap felugró modálban a kiválasztott bejegyzéshez:
    - Végrehajtó neve, munkaköri pozíciója és HR szerepköre.
    - Érintett modul, entitástípus és rekordazonosító.
    - Teljes tisztított indoklás / megjegyzés.
    - Mezőszintű változáskövetés (korábbi áthúzott és új érték összehasonlító diff tábla magyar mezőnevekkel).
    - Technikai metaadatok: IP cím és böngésző User Agent.
- **Reszponzív Lapozás:**
  - Választható lapméret (15, 25, 50, 100 elem / oldal) tiszta oldalnavigációval.
- **Többcég-kezelés (Multi-Tenancy) és GDPR Hatókör Izoláció:**
  - Az Eseménynapló összekapcsolásra került a `useCompany()` kontextussal: a fejléc menüjében kiválasztott cég váltásakor (`selectedCompany.id`) a napló azonnal újratöltődik az adott vállalkozás eseményeire szűrve.
  - A fejlécben és az esemény részletező modálban kiemelt jelvény mutatja az aktív céget.
  - A CSV exportálás fájlneve és minden adatsora tartalmazza az adott vállalat nevét.
  - Új adatbázis trigger (`trg_hr_esemeny_naplo_company_id`): gondoskodik róla, hogy minden bejövő audit esemény automatikusan megkapja a végrehajtóhoz tartozó vállalat azonosítóját, ha az nem került explicit átadásra.
- **Dokumentáció:** [ADR A-048](../architecture/decisions/A-048-eaisyhr-central-audit-log-overhaul-and-query-hardening.md), [PRD P-067](../product/decisions/P-067-eaisyhr-central-audit-log-overhaul-and-unified-filtering-ux.md).
- **Félrevezető eseményelnevezés megszüntetése:**
  - Megszűnt az `Érzékeny Adatok (TAJ, Adó) - irat_megtekintes` nyers, megtévesztő kiírás. A felhasználók azt hihették, hogy nem létező iratot tekintettek meg, holott a háttérben az `esemeny_tipus: "irat_megtekintes"` volt hibásan hardkódolva a titkosított személyes adatok feloldására (`revealEmployeeSecretData`).
  - Új, tiszta magyar megnevezések: `Érzékeny adatok (TAJ, Adó, Bér) feloldása` és `Érzékeny adatok (TAJ, Adó, Bér) módosítása`.
  - A megjegyzésekből automatikusan kitisztításra kerültek a belső technikai UUID azonosítók.
- **Duplikáció- és Ghost-Trigger védelem:**
  - Kijavításra került a `PersonalDataTab` és `PersonalDataCard` mentési logikája: korábban a mentés sikere után egy `handleReveal()` + `setTimeout(handleReveal, 100)` duplikált hívás feleslegesen újabb megtekintési naplóbejegyzést szült az adatbázisban. A komponensek most közvetlenül a helyi React állapotot frissítik.
  - Új szerveroldali védelem: 15 másodperces időablakos throttling a `revealEmployeeSecretData` és `revealSecretData` függvényekben (ugyanazon felhasználó gyors ki-be kapcsolása vagy dupla kattintása nem többszörözi meg a naplót).
  - Kliensoldali intelligens tömörítés az `AuditLogTab`-ban: az 1 percen belüli egymást követő azonos feloldások egyetlen bejegyzésként jelennek meg (`(2×) feloldva 1 percen belül`).
- **Dolgozói Életút és Iratkezelési Események Integrációja:**
  - A `getEmployeeAuditLogs` mostantól lekéri a dolgozóhoz tartozó `hr_dokumentum` rekordok azonosítóit is, így a munkaszerződések, orvosi alkalmassági igazolások, tanulmányi szerződések és fegyelmi határozatok iktatási/törlési előzményei is azonnal láthatóvá válnak a dolgozó „Előzmények” lapján.
- **UI és UX Fejlesztések:**
  - Keresőmező és kategória szűrő gombok (`Összes`, `Érzékeny adatok`, `Módosítások`, `Iratok & Szerződések`).
  - Szemantikus eseményjelvények (`Megtekintés`, `Módosítás`, `Létrehozás`, `Törlés`), ikonok és tiszta magyar mezőcímkék a módosult értékek összehasonlító nézetében.
  - Dokumentáció: [ADR A-047](../architecture/decisions/A-047-eaisyhr-audit-log-deduplication-and-semantic-event-resolution.md), [PRD P-066](../product/decisions/P-066-eaisyhr-audit-log-deduplication-and-semantic-event-resolution.md).

### 📋 eaisyDocs: Kanonikus Eseménynapló Formázó Motor és Szemantikus Naplófeloldás (A-046 / P-065)
- **Tervezési és UX háttér:**
  - Megszüntetésre került a semmitmondó „Ügyirat módosítva” generikus címdömping az eseménynaplóban és az irattörténetben.
  - Új központi eseményfeldolgozó motor: `src/utils/audit-log-formatter.ts`, amely minden művelethez (iktatás, feladatkiírás, feladat lezárás, kimenő válaszlevél előállítás, kiküldés, piszkozat törlés, belső megjegyzések, státuszváltozások, explicit jogosultságok, kölcsönzés) pontos, magyar nyelvű címet, leírást és szemantikus ikont rendel.
  - Megszűnt a megjegyzéseknél korábban látott „Megjegyzés hozzáadva / Megjegyzés hozzáadva” redundáns címduplikáció: a rendszer a konkrét megjegyzésszöveget jeleníti meg.
  - A szerveroldali megjegyzésmentés (`src/app/dossiers/[id]/actions.ts`) kiegészült a beírt szöveg előnézetével és structured JSON mezővel.
  - Kibővült a `TimelineIconName` ikonkészlet: `send`, `message-square`, `list-todo`, `sparkles`, `link`, `upload`, `archive`, `shield`, `download`, `refresh-cw`, `clock`.
  - Az ügyiratlapon (`src/app/dossiers/[id]/page.tsx`), a bejövő irat nézetben (`src/app/inbox/view/[id]/page.tsx`) és a hivatalos PDF életciklus exportban (`src/app/dossiers/[id]/lifecycle-export.ts`) is a kanonikus formázó motor működik.
  - Új egységteszt csomag: `src/utils/__tests__/audit-log-formatter.test.ts` (9/9 sikeres teszteset).
  - Dokumentáció: [ADR A-046](../architecture/decisions/A-046-canonical-audit-log-formatting-engine.md), [PRD P-065](../product/decisions/P-065-canonical-audit-log-formatting-ux.md).

### 🔒 eaisyDocs: Iktatott és Expediált Kimenő Iratok Törlésvédelme (A-006 / A-008)
- A jogszabályi előírásoknak (335/2005. Korm. rend., Levéltári tv.) megfelelően a már hivatalosan beiktatott (alszámmal ellátott) vagy expediált (kiküldött) kimenő iratok mellett nem jelenik meg kuka gomb a felületen, megvédve az iktatási sorszámfolytonosságot (gap-mentesség).
- Kijavításra került a paramétersorrend a kimenő iratok törlési függvényhívásában.

### 📁 eaisyDocs: Beágyazott Feladatkészítő, Modálmentesítés és Háromlépcsős AI Válaszlevél Varázsló (DOC-TASK-01 / DOC-01)
- **Tervezési és UX háttér (Linear Flat & Zero-Nested-Modal elv):**
  - Felszámolásra került a többszörösen egymásba nyíló felugró ablakok (modál a modálban) zavaró működése: korábban az „Új feladat” egy modált nyitott, a sablonok egy 2. modált, az új sablon pedig egy 3. modált.
  - A feladatok és belső megjegyzések felülete tágas, kétoszlopos munkatérré alakult: bal oldalon (65%) a feladatlista és a közvetlen feladatkészítő, jobb oldalon (35%) a teljes magasságú belső megjegyzések és üzenőfal (@ említés támogatással).
  - A feladatkészítő kártya (`TasksTab`) tetején **Gyors Sablonszalag** kapott helyet 1-kattintásos gyorsgombokkal (`Jóváhagyás`, `Könyvelés`, `Jogi felülvizsgálat`, `Válaszlevél készítése`, `Árajánlat kérése`, `Irat feldolgozása`) és lenyitható teljes sablonkatalógussal.
- **Dedikált Válaszlevelek & Expediálás Lap (`OutgoingDocumentsTab`):**
  - A kimenő válaszlevelek és expediálás új dedikált lapra (`TabsTrigger value="outgoing"`) került az ügyirat adatlapon (`/dossiers/[id]`).
  - Háromlépcsős lineáris varázsló:
    - **1. lépés: Címzett & Kézbesítési csatorna:** Partner adatok betöltése, csatorna választó kártyák (`E-MAIL`, `POSTA`, `CSAK IKTATÁS`).
    - **2. lépés: Levél megfogalmazása (0 Modál!):** Beágyazott fülváltó három szerkesztési móddal:
      - `[ ✏️ Saját szöveg ]`: Tárgy és levéltörzs közvetlen megadása.
      - `[ ✨ AI varázsló ]`: Gemini AI integráció 4 hivatalos hangvétellel (`hivatalos`, `baratsagos`, `tajekoztato`, `felszolito`), kérések és instrukciók megadásával, azonnali vázlatgenerálással és finomhangolással.
      - `[ 📄 Sablonok ]`: Hivatalos ügyviteli sablonok beillesztése 1 kattintással (hiánypótlási felhívás, elfogadó nyilatkozat, megkeresés megválaszolása, számlareklamáció).
    - **3. lépés: Véglegesítés & Kiküldés:** PDF melléklet csatolása, partner e-mail címének mentése partnertörzsbe, kimenő iratként való azonnali iktatás és expediálás.
  - Generált/elküldött kimenő iratok listája kézbesítési státusz jelvénnyel, in-place PDF megtekintéssel (`DocumentViewer`) és törléssel.
- **Szerveroldali Műveletek és AI Integráció (`src/app/dossiers/[id]/ai-reply-actions.ts`):**
  - `generateAiReplyAction`: Google Gemini 2.5 Flash API integráció determinisztikus, hivatali stílusú magyar válaszlevelek generálására, fallback tartalék motorral hálózati kimaradás esetére.
  - Safe cookies/request-store védelem unit tesztek és CI környezetek számára.
- **Tesztek és Minőségbiztosítás:**
  - Új tesztcsomag: `src/utils/__tests__/ai-reply-wizard.test.ts` (6/6 sikeres egységteszt: 4 hangvétel generálás, hibakezelés hiányzó instrukcióra, fallback működés offline módban, sablonok beillesztése).
  - Teljes projekt tesztfutás: 122/122 egységteszt sikeres (16 tesztcsomag, 0 hiba).
  - TypeScript fordítás: 0 hiba (`npx tsc --noEmit`).
- **Dokumentáció:** [ADR A-045](../architecture/decisions/A-045-embedded-task-composer-and-ai-reply-wizard-architecture.md), [PRD P-064](../product/decisions/P-064-embedded-task-composer-and-ai-reply-wizard-ux.md).
- **Törvényi és adatvédelmi háttér (GDPR 5. cikk, 32. cikk):**
  - Többvállalatos holding struktúrában kritikus követelmény az adatelkülönítés (multi-tenancy isolation). Egy munkavállaló személyes, bér- és távolléti adatai szigorúan csak ahhoz a jogi személyhez tartozhatnak, amellyel munkaviszonyban áll.
  - Feloldásra került a cégcsoportos HR dilemma: a modern architektúra natívan támogatja mind a központi/holding HR-es modellt, mind az önálló leányvállalati dedikált HR-es modellt a `company_members` táblához kötött `hr_szerepkor` és `docs_szerepkor` feloldással.
  - Megszűnt a Kettős Szerepkör (Dual-Role) biztonsági rése: ha egy felhasználó az "A" cégben HR vezető, de a "B" cégben egyszerű munkavállaló, a rendszer cégváltáskor azonnal a célcégbeli jogosultságaira állítja a felhasználót, megelőzve az illetéktelen béradat-betekintést.
- **Dinamikus Szerepkör-feloldó és Védelmi Motor (`src/utils/hr/`):**
  - `company-role-resolver.ts`: Tiszta függvénykönyvtár (`resolveUserCompanyRoles`, `validateEmployeeCompanyAccess`, `isUserAuthorizedForHrView`). Elsőbbséget ad a `company_members` tagsági szerepkörnek a globális profillal szemben, automatikusan érvényesíti az admin/owner jogosultságokat, és nem tagság esetén azonnali elutasítást ad (`none`).
  - `company-server.ts`: Kiegészítve az `getActiveCompanyMemberRolesServer` szerveroldali segédfüggvénnyel, amely Next.js Server Components és Server Actions környezetben feloldja az aktív céghez tartozó scoped szerepköröket.
  - `hr-auth-guard.ts`: `requireHrAuthServer(allowedRoles, fallbackRedirect)` egységes védelmi kapu átirányítási és inline hiba-kezelési támogatással.
- **Alkalmazásszintű Scoping és Átfogó Képernyővédelem:**
  - `src/app/layout.tsx`: A globális profil helyett a cég-specifikus feloldott szerepköröket adja át az oldalsávoknak (`HrSidebar`, `AppSidebar`), garantálva a dinamikus menümegjelenést.
  - **Bérszámfejtés (`/hr/payroll`):** Cégre szűrt dolgozók, céghez kapcsolt új bérpapír előállítás, `companies` táblából dinamikusan feloldott hivatalos munkáltatói név, cím és adószám a generált bérpapír PDF-eken (`downloadPayslipPdfAction`).
  - **Toborzás (`/hr/recruitment`):** `verifyRecruitmentAccess` védelem, csak az aktív cég álláshirdetéseinek és pályázóinak listázása és mentése.
  - **Vezetői Műszerfal (`/hr/manager`):** Cégre szűrt csapattagok, távollétek, jelenléti korrekciók és túlóra-felhasználások.
  - **Riportok (`/hr/reports`):** `loadHrMasterData` cégre szűrt dolgozói, jogviszony, szervezeti egység és munkakör adatokkal (NAV T1041, KSH, Bérriport).
  - **Beléptetés & Kiléptetés (`/hr/onboarding`, `/hr/offboarding`):** Cégre szűrt folyamatok és sablonok.
  - **HR Beállítások (`/hr/settings`):** Cégre szűrt szervezeti struktúra, munkakörök és munkatársak kezelése.
  - **Re-render és Állapot-szivárgás védelem:** Minden érintett oldalon gyökér szintű `key={companyScope}` / `key={activeCompanyId}` biztosítja a React komponensek tiszta unmount/remount folyamatát cégváltáskor.
- **Tesztek és Minőségbiztosítás:**
  - Új dedikált tesztcsomag: `src/utils/__tests__/company-role-resolver.test.ts` (7/7 sikeres teszt: tagsági felülbírálás, fallback, owner/admin feloldás, kettős szerepkör izoláció, nem-tag elutasítás, dolgozói kereszt-cég hozzáférés-ellenőrzés).
  - Teljes projekt tesztfutás: 116/116 egységteszt sikeres (16 tesztcsomag, 0 hiba).
  - TypeScript típusellenőrzés: 0 hiba (`npx tsc --noEmit`).
- **Dokumentáció:** [ADR A-044](../architecture/decisions/A-044-hr-multi-tenancy-and-strict-gdpr-isolation.md), [PRD P-063](../product/decisions/P-063-hr-multi-tenancy-and-strict-gdpr-isolation-ux.md).

### ⏱️ eaisyHR: Munkaidőkorlátok (Mt. 99. § 48h) és Éves Túlórakeret (Mt. 135. §) Számláló (HR-TASK-02)
- **Törvényi háttér és üzleti cél:**
  - A Munka Törvénykönyve (Mt. 99. § (2) bek.) előírja, hogy a heti munkaidő a rendes és rendkívüli munkaidővel együtt sem haladhatja meg a **48 órát**.
  - Az Mt. 135. § (1)-(2) bek. alapján naptári évenként legfeljebb **250 óra** rendkívüli munkaidő (túlóra) rendelhető el egyoldalúan, míg írásbeli megállapodással („önként vállalt túlmunka”) a keret legfeljebb **400 óra**.
  - A munkaügyi bírságok megelőzése érdekében mind a tervezési, mind az elszámolási fázisban valós idejű felügyelet épült ki.
- **Új Adatbázis Mezők (`hr_dolgozo_adatlap`):**
  - Migráció: `supabase/migrations/20261010000004_add_overtime_compliance_fields.sql`.
  - `onkent_vallalt_tulora_400h BOOLEAN DEFAULT false`: Az Mt. 135. § szerinti írásbeli megállapodás jelölője.
  - `onkent_vallalt_tulora_datum DATE`: A megállapodás keltének / hatálybalépésének dátuma.
- **Tiszta Számító Motor (`src/utils/hr/overtime-engine.ts`):**
  - `determineAnnualOvertimeLimit`: 250 vagy 400 órás keret megállapítása.
  - `calculateOvertimeQuotaStatus`: 0-79% zöld (normál), 80-99% sárga küszöb (figyelmeztetés), 100%+ piros riasztás (keret kimerült).
  - `checkWeeklyHoursCompliance`: heti 40h rendes, 40-48h túlóra, >48h törvénysértés szintek.
  - `calculateDailyOvertimeFromAttendance`: jelenléti ívek tény túlóráinak és pihenőnapi munkavégzésének pontos számítása.
  - `validateShiftAssignmentOvertimeRisk`: műszaktervező előzetes kockázatelemzés.
- **Központi Megfelelőségi Hub (`/hr/compliance` – 3. Fül):**
  - Új fül: `Munkaidő & Túlórakeret (Mt. 99. §, 135. §)`.
  - 4 kanonikus `KpiCard`: Heti 48h limit túllépés (kiemelt piros), Éves keret 80% felett (küszöb), Éves keret kimerült (100%+), Önként vállalt megállapodás (400h).
  - Interaktív `OvertimeComplianceTable`: instant gépelési kereső, oszlopválasztó, tematikus szűrők (heti megfelelőség, éves szint, megállapodás, részleg), Linear Flat progress bar, in-place 400h megállapodás kapcsoló.
- **Dolgozói Profil & Túlóra Egyenleg Kártya (`OvertimeBalanceCard`):**
  - Kiegészült az éves Mt. 135. § progress barral, 250h/400h jelvénnyel és a hátralévő órák számával.
- **Műszaktervező Integráció (`ShiftPlannerWeeklyGrid` & `shift-actions.ts`):**
  - A `saveShiftAssignmentAction` műszak mentése előtt ellenőrzi a heti összóraszámot, és >48h esetén figyelmeztetést ad.
  - A műszak-hozzárendelő és módosító popoverekben automatikus figyelmeztető banner jelenik meg a 48h-t elérő vagy meghaladó dolgozóknál.
- **Tesztek és Minőség:**
  - `src/utils/__tests__/overtime-engine.test.ts` (5/5 sikeres egységteszt).
  - TypeScript típusellenőrzés: 0 hiba (`npx tsc --noEmit`).
- **Dokumentáció:** [ADR A-043](../architecture/decisions/A-043-hr-working-hours-and-annual-overtime-compliance-architecture.md), [PRD P-062](../product/decisions/P-062-hr-working-hours-and-annual-overtime-compliance-ux.md).

### 💰 eaisyHR: Ütemezett Bérpapír Előállítás és Dolgozói Digitális Átvételi Nyugtázás (HR-TASK-07)
- **Törvényi háttér és megfelelőség:**
  - A Munka Törvénykönyve (Mt. 155. §) alapján a munkáltató köteles a tárgyhónapot követő hónap 10-ig írásbeli tájékoztatást (bérjegyzéket) átadni a munkavállalónak a munkabér elszámolásáról és a levonásokról. Az elektronikus közlés joghatásos (Mt. 22. §), amennyiben a munkavállaló megismerheti és az átvétel auditálhatóan bizonyított.
- **Új Adatbázis Tábla (`public.hr_berpapir`):**
  - Migráció: `supabase/migrations/20261010000003_add_hr_berpapir.sql`.
  - 43 mezőből álló, szigorú RLS védelemmel ellátott reláció: a munkavállaló kizárólag a saját bérpapírjait láthatja és nyugtázhatja (`dolgozo_id = auth.uid()`), a HR pedig a teljes céges állományt kezeli.
  - Tételes mezők: alapbér, ledolgozott napok/órák, fizetett szabadság, betegszabadság (Mt. 146. § 70%), túlóra pótlék (150%), bónusz, cafeteria bruttó, bruttó összesen.
  - Opcionális adókedvezmények: 25 év alattiak SZJA mentessége (576.601 Ft keretig), családi adó- és járulékkedvezmény, személyi kedvezmény.
  - Törvényes levonások: SZJA 15%, TB járulék 18,5%, bírósági letiltások.
  - Nettó kifizetés, munkáltatói SZOCHO (13%), bankszámlaszám, digitális átvételi időbélyeg (`atvetel_datuma`, `atvetel_ip`).
- **Kalkulációs és PDF Generáló Motor (`src/utils/hr/`):**
  - `payslip-calculator.ts`: Determinisztikus bér- és járulékkalkulátor levonásfelosztással és digitális átvételi nyugtázó segéddel.
  - `payslip-pdf-generator.ts`: Hivatalos, formázott A4-es magyar Bérjegyzék PDF sablon (Puppeteer / `launchPdfBrowser`), digitális átvételi záradékkal és 50 éves irattári hivatkozással.
- **HR Munkaasztal Kezelőfelület (`/hr/payroll`):**
  - Önálló menüpont az oldalsávban (`Bérszámfejtés & Bérpapírok`).
  - Havi időszakválasztó léptetővel.
  - 5 Linear Flat `KpiCard`: Összes dolgozó, Előállított bérpapír, Átvéve és nyugtázva (zöld), Átvételre vár (sárga), Havi nettó kifizetés.
  - Központi `TableToolbar`: azonnali keresés név, adójel, TAJ, beosztás, részleg szerint; státusz és részleg szűrők.
  - Egy kattintásos kötegelt előállítás és közzététel: *„Havi Bérpapírok Előállítása & Közzététele (Mt. 155. §)”*.
  - Soronkénti in-place PDF megtekintés (`PdfViewerDialog`), letöltés és egyedi korrekciós modál (bónusz, 25 év alatti, családi kedvezmény, letiltás).
- **Dolgozói Önkiszolgáló Portál (`/hr/self-service/payroll`):**
  - Új menüpont az Önkiszolgáló pultban: **`Bérpapírjaim`**.
  - Havi lista időrendben, kiemelt nettó kifizetési doboz bankszámlaszámmal, tételes jövedelem- és levonásbontás.
  - **„Átvételt igazolom (Mt. 155. §)”** gomb: megerősítő modállal rögzíti az átvétel időbélyegét és IP címét, naplózza az `esemeny_naplo`-ba, és zöld hitelesített bélyegzőt kap.
- **Tesztek és Minőség:**
  - `src/utils/__tests__/payslip-calculator.test.ts` (7/7 sikeres teszteset).
  - `src/utils/__tests__/payslip-pdf.test.ts` (4/4 sikeres teszteset).
  - TypeScript típusellenőrzés: 0 hiba (`npx tsc --noEmit`).
- **Dokumentáció:** [ADR A-042](../architecture/decisions/A-042-hr-scheduled-payroll-generation-and-digital-receipt-architecture.md), [PRD P-061](../product/decisions/P-061-hr-scheduled-payroll-generation-and-digital-receipt-ux.md).

### 📋 eaisyHR: Offboarding Kötelező Hatósági Kilépőigazolások és eaisyDocs Iktatás (HR-TASK-06)
- **Törvényi háttér és audit megállapítás:**
  - A Munka Törvénykönyve (Mt. 80. § (2) bek.), a foglalkoztatási törvény (Flt. 36/A. §) és a hatósági szabályok alapján a munkaviszony megszűnésekor a munkáltató köteles kiadni az igazolásokat (munkaviszony igazolás, álláskeresési járadék adatlap, letiltási nyilatkozat, betegszabadság elszámolás, NAV adóadatlap és TB kiskönyv bejegyzés).
  - Az audit megerősítette, hogy az offboardingban a P-041 döntés során elkészült a hatósági PDF generátor (`exit-certificate-pdf-generator.ts`) és az `ExitCertificatePanel`.
  - A mostani fejlesztés felszámolta a feltárt kockázatokat és automatizálta a folyamatot.
- **Lezáráskori automatikus védőháló (Fail-Safe Filing):**
  - A `closeOffboarding` folyamatzáró akcióba beépült egy automatikus ellenőrzés: amennyiben a folyamathoz még nem készült el a kilépő igazolás, a motor automatikusan előállítja azt a dolgozó személyi kartonja, a kiléptetés paraméterei és a valós távolléti adatok alapján.
  - A generált igazolást a rendszer kötegelten beiktatja a munkavállaló eaisyDocs személyi dossziéjába (`3.1` tétel, 50 év megőrzési idővel, gap-mentes alszámmal és PDF/A-2b archiválási példánnyal).
- **Tárgyévi betegszabadság automatikus összesítése (Mt. 126. §):**
  - A `getOffboardingDetailData` és a `generateExitCertificateAction` automatikusan összesíti a dolgozó tárgyévi, jóváhagyott betegszabadság napjait a `hr_tavollet` táblából, és előtölti az űrlapon.
- **Azonnali egyedi beiktatási lehetőség (`ExitCertificatePanel`):**
  - Új „Beiktatás a személyi dossziéba most” akciógomb jelent meg a panelen a még le nem zárt offboardingokhoz (pl. ha a munkavállaló az utolsó munkanapon bent írja alá a dokumentumot, de az IT vagy bérszámfejtési folyamat még 1-2 napig nyitott marad).
- **Tesztek és Minőség:**
  - `src/utils/__tests__/exit-certificate-pdf.test.ts` (6/6 sikeres teszt: PDF struktúra, Puppeteer buffer, letiltások, végkielégítés, 5 kötelező igazolás).
  - `src/utils/__tests__/offboarding-compliance.test.ts` (5/5 sikeres teszt: 5 hatósági okirat, betegszabadság aggregáció, fail-safe lista, adatlap fallback).
  - TypeScript fordítás: 0 hiba (`npx tsc --noEmit`).
- **Kapcsolódó dokumentáció:** [ADR A-041](../architecture/decisions/A-041-hr-offboarding-statutory-exit-certificates-and-filing-safety-net.md), [PRD P-060](../product/decisions/P-060-hr-offboarding-statutory-exit-certificates-and-filing-ux.md).

### 🩺 eaisyHR: Orvosi Alkalmassági és Beosztási Blokkolás Összehangolása (HR-TASK-05)
- **Törvényi háttér és audit megállapítás:**
  - Az 1993. évi XCIII. tv. (Mvt.) 49. § (1) bek. és a 33/1998. (VI. 24.) NM rendelet alapján a munkavállaló csak olyan munkára és akkor alkalmazható, amelyre orvosilag alkalmasnak bizonyult.
  - Az alapos kód- és folyamataudit feltárta, hogy a rendszerben korábban **nem létezett aktív orvosi blokkolás**: a dolgozói jelenlét rögzítésekor (`toggleCheckIn`) semmilyen orvosi vizsgálat nem történt, az előzetes műszaktervezőben pedig a lejárat csupán egy nem gátló sárga felkiáltójelet mutatott, de a mentést teljes mértékben engedélyezte.
- **Központi érvényesség-ellenőrző motor (`medical-compliance-checker.ts`):**
  - Elkészült a `checkMedicalValidityForDate(supabase, dolgozoId, targetDateStr)` típusbiztos segédfüggvény.
  - Lekérdezi a dolgozó legfrissebb orvosi vizsgálatát (`hr_orvosi_vizsgalat`), és szigorúan ellenőrzi az érvényességi intervallumot (`vizsgalat_idopontja` – `ervenyesseg_vege`), valamint a minősítést (`nem_alkalmas`).
  - Standard hibakódokat és magyarázatokat ad vissza: `missing`, `not_yet_valid`, `expired`, `nem_alkalmas`.
- **Valós idejű jelenléti kemény blokkolás (`self-service/actions.ts`):**
  - Munkakezdés (`check_in`) és szünetről visszatérés (`work`) esetén a rendszer ellenőrzi a mai napra vonatkozó orvosi érvényességet.
  - Ha az orvosi lejárt vagy hiányzik, a művelet azonnal sikertelen (`success: false`), és törvényi hivatkozású hibaüzenetet kap a dolgozó.
  - **Munkavállalói védelem:** A műszakzárás / távozás (`checkout`) sosem blokkolt, így az érvénytelen alkalmasságú dolgozó szabályosan be tudja fejezni a jelenlétét.
- **Műszakbeosztás és csoportos másolás védelem (`shift-actions.ts`):**
  - `saveShiftAssignmentAction`: Új műszak rögzítésekor vagy módosításakor szigorúan a műszak konkrét céldátumára vizsgálja a vizsgálat érvényességét. Érvénytelenség esetén azonnali elutasítás (`error` objektum). A műszak törlése engedélyezett marad a hibás beosztások javításához.
  - `copyPreviousWeekRosterAction`: Csoportos heti másoláskor a motor kiszűri és automatikusan átugorja azon napokat, amikor a célhéten a dolgozó orvosija már nem érvényes, és `skippedMedicalCount` számlálóval értesíti a vezetőt.
- **Műszaktervező vizuális kapu (`ShiftPlannerWeeklyGrid`):**
  - Piros orvosi ikon (`Stethoscope`) és finom színezés jelzi a cellában az érvénytelen napokat.
  - A cella Popoverjében kiemelt figyelmeztető banner jelenik meg a lejárati dátummal, közvetlen navigációs linkkel a dolgozói profilra új vizsgálat rögzítéséhez.
  - A sablonválasztó gombok inaktívvá válnak (`disabled`), megakadályozva a hibás beosztás kísérletét.
- **Tesztek és Minőség:**
  - `src/utils/__tests__/medical-compliance.test.ts` (5/5 sikeres teszteset).
  - TypeScript fordítás: 0 hiba (`npx tsc --noEmit`).
- **Kapcsolódó dokumentáció:** [ADR A-040](../architecture/decisions/A-040-hr-medical-compliance-and-roster-blocking-architecture.md), [PRD P-059](../product/decisions/P-059-hr-medical-compliance-and-roster-blocking-ux.md).

### 🦺 eaisyHR: Munkavédelmi és Tűzvédelmi Oktatások Központi Lejárati Mátrixa (HR-TASK-04)
- **Törvényi háttér és megvalósítás:**
  - Az 1993. évi XCIII. tv. (Mvt. 55. §) és az 1996. évi XXXI. tv. (Ttv. 22. §) alapján minden aktív munkavállaló köteles érvényes munkavédelmi és tűzvédelmi oktatással rendelkezni (évente kötelező ismétlő oktatással).
  - Létrejött az automatikus lejáratszámító motor (`safety-compliance-calculator.ts`), amely 4 állapotot különböztet meg:
    - 🟢 `Érvényes`: > 30 nap van hátra a lejárati határidőig.
    - 🟡 `Hamarosan lejár`: 30 napon belül lejár (teendő: éves ismétlő oktatás szervezése).
    - 🔴 `Lejárt`: Múltbeli lejárati dátum (bírságveszély!).
    - 🔴 `Hiányzik`: A munkavállalóhoz még nincs egyetlen rögzített oktatási jegyzőkönyv sem.
- **Adatbázis módosítás:**
  - Migráció: `supabase/migrations/20261010000002_add_safety_training_validity.sql`.
  - Hozzáadva `public.hr_munkavedelmi_oktatas.ervenyesseg_vege DATE` oszlop és index, automatikus 1 éves kitöltéssel.
  - A jegyzőkönyv generálás (`generateAndFileSafetyTrainingAction`) automatikusan beállítja a lejárati dátumot (`oktatasDatuma + 1 év`).
- **Központi Megfelelőség Hub Bővítés (`/hr/compliance`):**
  - Kétfüles `Tabs` navigáció: *Szabadságkiadás (Mt. 122. §)* és *Munkavédelem & Tűzvédelem (Mvt. / Ttv.)*.
  - 4 db új kanonikus `KpiCard`: Munkavédelmi érvényesség arány, Érvényes oktatások száma, 30 napon belül lejárók száma, Lejárt vagy hiányzó dolgozók száma.
  - Új táblázatkomponens: `SafetyTrainingTable` kanonikus `TableToolbar`-ral (azonnali keresés, oszlopválasztó, státusz-, típus- és részlegszűrő popover, CSV export).
  - In-place gyors elérés: a csatolt eaisyDocs jegyzőkönyvek azonnali megnyitása (`PdfViewerDialog`), illetve új/pótlólagos oktatás rögzítése 1 kattintással (`SafetyTrainingDialog`) a dolgozó adataival előtöltve.
- **Tesztek és Minőség:**
  - `src/utils/__tests__/safety-compliance.test.ts` (6/6 sikeres unit teszt: érvényes, 30 napon belüli, ma lejáró, lejárt, hiányzó oktatás detektálás, és cégszintű statisztikai aggregáció).
  - `npx tsc --noEmit` hibátlan (0 error).
- **Kapcsolódó dokumentáció:** [ADR A-039](../architecture/decisions/A-039-hr-occupational-safety-compliance-matrix-architecture.md), [PRD P-058](../product/decisions/P-058-hr-occupational-safety-compliance-matrix-ux.md).

### 🏖️ eaisyHR: Szabadságkiadási Megfelelőség és Év Végi Riasztás (HR-TASK-03)
- **Törvényi háttér és megvalósítás:**
  1. **Mt. 122. § (3) – 14 nap összefüggő mentesülés:**
     - Determinisztikus kalkulátor (`leave-compliance-calculator.ts`), amely a tárgyév összes napját ellenőrzi: jóváhagyott fizetett szabadság (`hr_tavollet`), szombat/vasárnap pihenőnapok és hivatalos magyar munkaszüneti napok láncolatában.
     - **Műszakfelülbírálat:** Ha a vezető egy hétvégi napra aktív műszakot osztott be (`tervezett_ora > 0`), az szabályosan megszakítja a pihenőláncot.
     - **Törvényes eltérő megállapodás:** Az Mt. kifejezett felhatalmazása alapján ("eltérő megállapodás hiányában") a munkavállalóval kötött írásos megállapodás esetén a rendszer nem jelzi mulasztásként a 14 nap elmaradását, hanem jogszerűen mentesítettként kezeli.
  2. **Mt. 123. § – Év végi maradványszabadság riasztás (November / Q4):**
     - Kiszámítja a hátralévő szabadságnapok és a hátralévő munkanapok arányát az év végéig.
     - Sárga figyelmeztetés lép életbe Q4-ben (különösen november 1-től), és piros kritikus riasztás, ha a hátralévő szabadságok száma meghaladja az évből még hátralévő összes munkanapot.
- **Adatbázis módosítás:**
  - Migráció: `supabase/migrations/20261010000001_add_leave_compliance_fields.sql`.
  - Hozzáadva `public.hr_dolgozo_adatlap.eltero_megallapodas_14_nap BOOLEAN NOT NULL DEFAULT false`.
- **Központi Megfelelőségi Hub (`/hr/compliance`):**
  - Korábbi átirányítás helyett teljes értékű felügyeleti központ jött létre.
  - Multi-tenant cégszintű aggregáció (`getActiveCompanyIdServer()`).
  - 4 kanonikus `KpiCard`: Megfelelőségi ráta (%), 14 napos hiány, Év végi kockázat, Eltérő megállapodások.
  - Kanonikus `TableToolbar`: azonnali keresés, oszlopválasztó, szűrő popover (14 napos státusz, év végi kockázat, szervezeti egység), CSV export.
  - Gyors műveletek: Eltérő megállapodás jóváhagyási kapcsoló (`Checkbox`), adatlap gyorslink.
- **Dolgozói Profil Integráció (`src/app/hr/employee/[id]?tab=leaves`):**
  - A Szabadság fülön megjelent az Mt. Megfelelőségi kártya: pontos dátumintervallummal és leghosszabb összefüggő nappal.
  - HR/admin jogosultsággal közvetlen kapcsoló (`Switch`) az Eltérő megállapodás rögzítéséhez/visszavonásához toast értesítéssel.
- **Tesztek és Minőség:**
  - `src/utils/__tests__/leave-compliance.test.ts` (8/8 sikeres unit teszt: 10 munkanap + hétvégék 16 napos pihenő, 5 munkanap 9 nap nem elég, hétvégi műszak megszakítás, betervezett státusz, eltérő megállapodás, novemberi riasztás, kritikus munkanaphiány, naptárgenerálás).
  - `npx tsc --noEmit` hibátlan (0 error).
- **Kapcsolódó dokumentáció:** [ADR A-038](../architecture/decisions/A-038-hr-leave-compliance-and-year-end-alert-engine.md), [PRD P-057](../product/decisions/P-057-hr-leave-compliance-and-year-end-alert-ux.md).

### 📅 eaisyHR: Előzetes Műszaktervező és Heti Rács (HR-TASK-01)
- **Felhasználói igény és megvalósítás:** A meglévő `/hr/time` (Munkaidő & Távollét) oldalon létrehoztunk egy 3 füles egyesített felületet (`TimeTabsView`):
  1. **Műszakbeosztás Tervező (Heti rács):** Interaktív táblázat dolgozónkénti és részlegenkénti bontásban, 1-kattintásos sablonhozzárendeléssel (`D`, `DU`, `É`, `N`), heti óraszám-összesítővel, valamint napi létszám- és műszaklefedettségi lábléccel.
  2. **Távollétek & Csapatnaptár:** A meglévő havi és éves szabadság/táppénz naptár (`TeamCalendar`) teljes megtartása.
  3. **Műszaksablonok:** Céges munkarendek és műszakok kezelése (kezdés, befejezés, munkaóra, szünet, színkód választó élő előnézettel).
- **Adatbázis és Multi-Tenancy:**
  - Migráció: `supabase/migrations/20261009000004_create_hr_shift_planning.sql`.
  - Új táblák: `public.hr_muszak_sablon` és `public.hr_muszak_beosztas`.
  - Szigorú multi-tenant elszigetelés (`company_id` és RESTRICTIVE RLS a `user_has_company_access(company_id)` szabállyal).
  - 4 alapsablon automatikus generálása minden céghez: `D` (06:00-14:00), `DU` (14:00-22:00), `É` (22:00-06:00), `N` (08:00-16:30).
- **Intelligens Másolás és Távollét Védelem:**
  - "Előző hét másolása" funkció (`copyPreviousWeekRosterAction` és `filterShiftsForCopy`), amely automatikusan kihagyja azokat a napokat, ahol a munkatársnak már jóváhagyott szabadsága vagy táppénze van a cél héten (`hr_tavollet` integráció).
- **Havi Jelenléti Ív és Műszak Összekötés (Timesheet Integration):**
  - Alapértelmezett munkanapokon (hétfőtől péntekig), ha nincs beosztva egyedi műszak, a jelenléti ív automatikusan az alapértelmezett 8 órával (FTE arányosan) számol.
  - Hétvégi napokon alapértelmezetten a tervezett munkaidő 0 óra (pihenőnap).
  - Ha a Műszaktervezőben hétvégi napra (pl. szombatra vagy vasárnapra) műszak kerül beosztásra (pl. `D: Délelőttös` 8h):
    - A jelenléti ív automatikusan érzékeli és `Terv: 8h`-val, valamint borostyánsárga `Hétvégi műszak (D)` jelvénnyel jelöli a napot.
    - A havi tervezett munkaórák és a túlóra egyenleg automatikusan hozzáadja ezt a 8 órát.
    - Ha a dolgozó becsekkol a hétvégén, a tényleges ledolgozott órák és a túlóramegállapítás automatikusan összevetődik a tervezett műszakórával.
    - A havi PDF generátor (`timesheet-pdf-generator.ts`) és a Dolgozói Önkiszolgáló (`employee-timesheet.tsx`) felület is azonnal megjeleníti a hétvégi műszakokat.
- **Megfelelőség és Ellenőrzések:**
  - Heti 48 órás Mt. korlát túllépés figyelmeztetés (`checkWeeklyHoursLimit` - `HR-TASK-02`).
  - Orvosi alkalmasság lejárati jelzés és figyelmeztetés mentéskor (`determineMedicalStatus` - `HR-TASK-05`).
- **Tesztek és Minőség:**
  - `src/utils/__tests__/shift-planner.test.ts` (5/5 sikeres unit teszt: heti óraszámítás, 48h Mt. korlát, orvosi lejárati státusz, távollét-védett hétmásolás, havi jelenléti ív és műszak összekötés).
  - `npx tsc --noEmit` hibátlan (0 error).
- **Kapcsolódó dokumentáció:** [ADR A-037](../architecture/decisions/A-037-hr-shift-planning-roster-architecture.md), [PRD P-056](../product/decisions/P-056-hr-shift-planning-and-roster-management-ux.md).

### ⚙️ Céges Iktatási és AI Szabálymotor (Multi-Tenancy 2-Tier Rules Engine)
- **Felhasználói igény és koncepció:** A Visibill kétfüles mintájára kialakított, az eaisyDocs iktatási adatlapjához igazított céges szabályrendszer. Megszüntettük a felesleges könyvelési kategóriákat (pl. kontírozási szám, pénzügyi megjegyzés), és két tiszta, valódi célú fülre bontottuk a rendszert:
  1. **Iktatási Szabályok (Determinisztikus fül):** Pontos szövegminta, partnernév vagy adószám alapján 100%-os biztonsággal, tokenfogyasztás nélkül automatikusan kitölti a Cél Szervezeti Egységet (Osztály), Irattári tételszámot (megőrzési idő), Dokumentumtípust és Tárgy előtagot.
  2. **AI Prompt Könyvtár (Természetes nyelvű fül):** Gemini 2.5 Flash-nek átadott magas prioritású direktívák (pl. felelősök, összetett irattípusok, határozatok kezelése).
- **Adatbázis és RLS:**
  - Létrejött a `public.company_filing_rules` tábla a determinisztikus szabályokhoz (`id`, `company_id`, `rule_name`, `search_pattern`, `partner_name`, `partner_tax_number`, `match_type`, `target_department_id`, `target_irattari_tetel_id`, `target_document_type`, `target_subject_prefix`, `scope`, `is_active`).
  - Létrejött a `public.company_prompt_rules` tábla az AI utasításokhoz (`id`, `company_id`, `rule_name`, `rule_prompt`, `category`, `is_active`).
  - Mindkét táblán Restrictive RLS házirend védi az adatokat a `public.user_has_company_access(company_id)` ellenőrzéssel és támogatja a globális (`scope = 'all'`) szabályokat.
- **Iktatási és AI Integráció (Kétlépcsős Feldolgozás):**
  - Az `executeAiMetadataExtraction` (`src/app/inbox/filing-actions.ts`) folyamatában:
    1. **1. szint:** A `matchFilingRules` (`src/utils/filing-rules-engine.ts`) azonnal lefut az irat szövegére és felismert partnerére. Ha talál egyezést, felülbírálja és kőbe vési a szervezeti egységet, irattári tételt, típust és tárgyat.
    2. **2. szint:** A Gemini 2.5 Flash a céges `company_prompt_rules` direktívák figyelembevételével kitölti az esetlegesen még üresen maradt mezőket (pl. hivatkozott szám, határidő, pontosabb megnevezés).
- **Kezelőfelület és Navigáció (`/rules`):**
  - **Kétfüles navigáció:** „Iktatási szabályok (Automatikus)” és „AI Prompt könyvtár (Természetes nyelvű)” fülek.
  - Linear Flat design, azonnali aktív/inaktív kapcsolók, törlés és szerkesztés modálok, beépített KKV sablonkártyák.
  - Navigációs sáv (`Sliders` ikon) és Cégbeállítások (`/settings`) gyorslink integráció.
  - Dinamikus cégváltás (`key={companyScope}`).
- **Tesztek és Minőség:**
  - `src/utils/__tests__/filing-rules-engine.test.ts` (4/4 sikeres unit teszt)
  - `src/utils/__tests__/company-prompt-rules.test.ts` (5/5 sikeres unit teszt)
- **Kapcsolódó dokumentáció:** [ADR A-036](../architecture/decisions/A-036-company-prompt-rules-accounting-engine.md), [PRD P-055](../product/decisions/P-055-company-prompt-rules-accounting-engine-ux.md).

---

## [2026-10-08]

### 🔄 Dinamikus Cégváltási Frissítés (Partnerek és Iktatókönyv Táblázatok)
- **Probléma:** Amikor a felhasználó a felső cégválasztóban céget váltott (pl. `Teszt Kft.` és `Think AI Kft.` között) a Partnerek (`/partners`) vagy az Iktatókönyv (`/dossiers`) oldalon, a felület nem frissült azonnal az új cég adataival, hanem kézi F5 böngészőfrissítésre volt szükség, bár F5 után az adatok helyesen jelentek meg.
- **Kiváltó ok:** A `PartnersTableClient` és a `DossiersTableClient` a szerverről kapott `initialPartners` és `initialDossiers` propokat a komponens inicializálásakor egyetlen egyszer mentette el belső `useState`-be (`useState(initialPartners)`, `useState(initialDossiers)`). Amikor a cégválasztó meghívta a `router.refresh()`-t, a Next.js szerveroldalon sikeresen újra lekérte az új cég adatait, de a kliens oldali táblázatkomponensek figyelmen kívül hagyták a friss propokat a belső merev állapot miatt, ráadásul nem rendelkeztek cégváltási kulccsal (`key`).
- **Megoldás és Módosítások:**
  - **`src/app/partners/partners-table-client.tsx`:** A felesleges `useState(initialPartners)` állapot megszűnt, a komponens közvetlenül az `initialPartners` propot használja fel a statisztikák és a szűrések számításához (`const partners = initialPartners`).
  - **`src/app/partners/page.tsx`:** A `<PartnersTableClient key={companyScope} ... />` megkapta a `companyScope` egyedi kulcsot, így cégváltáskor a kliens komponens és a szűrősáv automatikusan tiszta lappal, azonnal újrarenderelődik az új cég adataival.
  - **`src/app/dossiers/dossiers-table-client.tsx`:** Hasonlóan javítva: `const dossiers = initialDossiers`.
  - **`src/app/dossiers/page.tsx`:** Hozzáadva a `key={companyScope}` a `<DossiersTableClient key={companyScope} ... />`-hez.
  - **További érintett oldalak prevenciója:** `src/app/archive/page.tsx`, `src/app/inbox/page.tsx`, `src/app/tasks/page.tsx`, `src/app/page.tsx` mind megkapták a `key={companyScope}` cégizolációs kulcsot az azonnali, zökkenőmentes dinamikus átváltáshoz.

### 🗄️ Irattár és Selejtezés (`/archive`) Többcég Szűrés és Akció Izoláció
- **Probléma:** Az Irattár és Selejtezés felületen (`/archive`) a felhasználó a felső sávban kiválasztott másodlagos cég (pl. `Teszt Kft.`) esetén is az alapértelmezett cég (`Think AI Kft.`) irattári ügyiratait, selejtezési javaslatait és jóváhagyandó tételeit látta, mivel a szerverkomponens és a selejtezési akciók nem szűrték a lekérdezéseket az aktív cégre (`company_id`).
- **Megoldás és Módosítások:**
  - **`src/app/archive/page.tsx`:**
    - Beépítve a szerveroldali aktív cég azonosítása (`getActiveCompanyIdServer()`).
    - Az `ugyirat` lekérdezés explicit `.eq("company_id", companyScope)` szűrést kapott, így kizárólag a kiválasztott vállalkozás lezárt és megőrzés alatt álló dossziéi jelennek meg a KPI kártyákon és a táblázatokban.
    - A `selejtezes_csomag` lekérdezés szűrve lett az aktív vállalatra (`.eq("company_id", activeCompanyId)`).
  - **`src/app/archive/actions.ts` (`forceExpireAllDossiers`):**
    - A tesztelési célú lejárat-generálás ezentúl kizárólag az aktív cég ügyiratait állítja lejártra.
  - **`src/app/archive/disposal-actions.ts` (`proposeDisposal`, `approveDisposal`):**
    - Új selejtezési csomag (`selejtezes_csomag`) létrehozásakor és a selejtezési / levéltári eseménynapló bejegyzések beszúrásakor a `company_id` értéke kötelezően rögzítésre kerül az aktív cég azonosítójával.

### 📥 eaisyBill Számlaimport és Kötegelt Szkenner Többcég Cég-hozzárendelés Javítás
- **Probléma:** Amikor a felhasználó a fejlécben aktív cégként egy újonnan felvett vagy másodlagos céget választott (pl. `Teszt Kft.`), az eaisyBill bejövő számlák importálásakor a beérkeztetett irat (`irat`) nem a kiválasztott céghez, hanem a rendszer alapértelmezett cégéhez (`Think AI Kft.`) került, mert a beszúráskor nem adódott át a dinamikus `company_id`, így a PostgreSQL tábladefault lépett érvénybe.
- **Megoldás és Módosítások:**
  - **`eaisybill-actions.ts`:**
    - `getImportableEaisyBillInvoices`: Dinamikusan lekéri a munkamenethez tartozó aktív cég azonosítóját (`getActiveCompanyIdServer()`). Az eaisyBill számlák lekérésekor intelligensen párosítja az aktív cég adószámát vagy nevét az eaisyBill cégtárral (nem létező külső cég esetén stabil fallbackkel a felhasználó fiókjára).
    - A már importált számlák szűrése (`alreadyImported`) ezentúl vállalatonként (`company_id = activeCompanyId`) izoláltan vizsgálja a duplikációkat, így ugyanaz a partner számla több független céghez is beérkeztethető.
    - `importInvoiceFromEaisyBill`: A létrehozott `irat` rekordba, a partnert létrehozó/feloldó `findOrCreatePartner` hívásba és a duplikáció-ellenőrzésbe expliciten bekerült a `company_id: activeCompanyId`.
  - **`batch-scanner.ts` és `batch-actions.ts`:**
    - Az `IngestBatchMetadata` interfész és az `ingestSplitDocuments` függvény fel lett készítve a `companyId` mező fogadására és bejegyzésére az `irat` táblába.
    - Az `uploadAndSplitBatch` szerverakció automatikusan átadja az aktív cégazonosítót mind a feltöltött kötegelt iratok, mind az elválasztólapos automata felbontás során felismert partnerek részére.
  - **Adatkorrekció:** A korábban tévesen `Think AI Kft.` alá érkeztetett `Mistral AI SAS – MSTRL-API-930968-001` (E/2026/00103) számla és annak partnere sikeresen átmozgatásra került a `Teszt Kft.` céghez.

### 🎨 Céglogó Kezelés, Testreszabható Iktató Prefix és Tag Szerepkör Módosítás
- **Céglogó Feltöltése és Megjelenítése (`logo_url`):**
  - **Adatbázis séma:** `ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo_url TEXT;` (Supabase migráció `20261008000004_company_logo_and_filing_prefix.sql`).
  - **Tárolás:** Supabase Storage `avatars` bucket alá mentve egyedi időbélyeges elérési úttal (`companies/${companyId}/logo_${Date.now()}.${ext}`).
  - **Jogosultság:** Kizárólag a cég tulajdonosa tölthet fel (PNG, JPG, WebP, SVG, max. 2 MB) vagy távolíthat el céglogót (`uploadCompanyLogoAction`, `removeCompanyLogoAction`).
  - **Megjelenítés:** A `CompanySelector` oldalsáv fejlécében és lenyíló listájában a generikus épületikon helyett automatikusan a vállalat arculati logója jelenik meg miniatűrként.
  - **Cégbeállítások:** A `CompanySettingsTab` dedikált arculati blokkot kapott előnézettel, feltöltő gombbal és logótörlési lehetőséggel.
- **Cég-specifikus Iktatókönyv Előtag (`filing_prefix`):**
  - **Adatbázis séma:** `ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS filing_prefix TEXT DEFAULT 'DOCS';`.
  - **Konfiguráció:** A cég adatai között a tulajdonos szabadon megadhatja a cég iktató előtagját (pl. `THINK`, `TESZT`, `HOLDING`, `DOCS`, max. 10 karakter, nagybetűsítve).
  - **Dinamikus iktatás:** A `fileIncomingDocument` szerverakció automatikusan lekéri az aktív cég `filing_prefix` értékét, és azzal hívja a gapless `generate_iktatoszam` és `generate_ugyszam` PostgreSQL funkciókat, így az iktatószámok vállalatonként teljesen szeparáltan és az egyedi előtaggal képződnek (`${prefix}/${ev}/${sorszam}`).
  - **Gyors szerkesztés:** A `CompanySelector` ceruza ikonjával elérhető gyors szerkesztő modálban is közvetlenül módosítható az előtag.
- **Tagok Szerepkörének Helyben Történő Módosítása (`EditMemberRoleDialog`):**
  - **Probléma:** Korábban ha egy cégtag szerepkörét (pl. munkavállalóból céges adminná vagy iktatóvá) szerették volna módosítani, törölni kellett a tagot és új meghívót kellett küldeni.
  - **Megoldás:** A `CompanySettingsTab` taglistájában a tulajdonos számára minden tag mellett megjelent egy ceruza (Szerkesztés) gomb.
  - **Modál és akció (`updateCompanyMemberRoleAction`):**
    - `EditMemberRoleDialog` komponens: kiválasztható a cég szintű szerepkör (`admin` / `member`), az eaisyDocs szerepkör (`ugyintezo`, `iktato`, `vezeto`, `betekinto`, `auditor`, `admin`, `rendszergazda`) és az eaisyHR szerepkör (`munkavallalo`, `hr_munkatars`, `hr_vezeto`, stb.).
    - Védelmi logika: A tulajdonos szerepköre nem módosítható; kizárólag a tulajdonos módosíthatja mások jogait; a mentés mind a `company_members` rekordot, mind a `felhasznalo_profil` táblát szinkronizálja.


### 🏢 Többcég-kezelés (Multi-Tenancy) és Adatelkülönítés (Visibill Minta Alapján)
- **Központi Többcég Architektúra és Cégkezelés:**
  - **Probléma:** Az eaisyDocs és eaisyHR rendszerek korábban single-tenant módon működtek, így könyvelőirodák, holdingok és cégcsoportok nem tudtak több önálló vállalkozást egyetlen fiókból biztonságosan kezelni.
  - **Megoldás:** A `visibill-ea0dbcac` bevált multi-tenancy architektúráját teljes körűen adaptáltuk az eaisyDocs és eaisyHR rendszerekbe.
- **Adatbázis Séma és Triggerek (`20261008000001_...`, `20261008000002_...`, `20261008000003_...`):**
  - **`companies` törzstábla:** Cégnév, adószám, székhely cím, képviselő neve, telefonszám, tulajdonos (`owner_id`), megosztási meghívókód (`share_token`).
  - **`company_members` kapcsolótábla:** Felhasználók és cégek összerendelése egyedi `(user_id, company_id)` párral és vállalatonkénti szerepkörökkel (`role`: owner/admin/member, `docs_szerepkor`, `hr_szerepkor`).
  - **`user_company_access_cache` gyorsítótár:** Denormalizált tábla az RLS rekurziók megelőzésére, automatikus triggeres szinkronizációval (`sync_company_member_cache`).
  - **`company_id` oszlop és indexek:** Hozzáadva mind a 37 eaisyDocs és eaisyHR üzleti táblához (`irat`, `ugyirat`, `ugy`, `partner`, `szervezeti_egyseg`, `feladat`, `irattari_terv`, `selejtezes_csomag`, `hr_dolgozo_adatlap`, `hr_jogviszony`, `hr_jelenlet`, stb.).
  - **100% Adatbiztonság és Null-vesztés:** Minden meglévő rekord és mind a 22 meglévő felhasználó automatikusan a `Think AI Kft.` alapértelmezett céghez lett rendelve.
  - **Visszaállíthatósági garancia:** Teljes JSON adatbázis snapshot (`backup_pre_multitenancy_latest.json`) és párhuzamosan megírt, tesztelt rollback scriptek.
- **PostgreSQL RESTRICTIVE RLS Házirendek:**
  - Bevezetve a `public.user_has_company_access(company_id)` STABLE biztonsági függvény.
  - Minden többcég-hatókörű táblán érvénybe lépett a `tenant_isolation_restrictive` házirend `AS RESTRICTIVE` kulcsszóval. Adatbázis motor szinten lehetetlen más cég adataihoz hozzáférni vagy abba beszúrni.
- **Oldalsáv Cégválasztó (`CompanySelector`):**
  - Linear flat dizájnú dropdown közvetlenül a modulválasztó alatt az `AppSidebar`-ban és `HrSidebar`-ban.
  - Élő gépelési szűrés a cégek között, ABC-rendezés, aktív cég zöld pipa jelölése.
  - `+ Új cég hozzáadása` modál magyar adószám formátum-ellenőrzéssel és automatikus tulajdonosi beállítással.
  - `Csatlakozás kóddal` modál tokenes meghívók beváltásához (`join_company_by_token` RPC).
- **Szerveroldali Cookie Perzisztencia és Reaktív Kliens Környezet:**
  - `eaisydocs_selected_company_id` cookie alapú aktív cég azonosítás (`getActiveCompanyIdServer()`).
  - `CompanyProvider` és `useCompany()` kontextus gondoskodik a kliensoldali azonnali állapotfrissülésről.
  - Minden fő oldal (`page.tsx`, `inbox`, `dossiers`, `partners`, `tasks`, `hr/admin`, `hr/time`) és szerverakció (érkeztetés, iktatás, partnermentés, feladatfelvétel, jelenlét rögzítés, dolgozói onboarding) automatikusan az aktív céghez kapcsolja az új és lekérdezett rekordokat.
- **E2E Teszteléssel és Böngésző Verifikációval Igazolva:**
  - `scripts/test-multitenancy-e2e.ts` automatizált teszt sikeresen igazolta a cégalapítást, a tagsági triggereket, az adatelkülönítést és a takarítást.
  - Böngészőben rögzítve a popover és az új cég dialógus vizuális megjelenése.

### 🛡️ Cégbeállítások Tulajdonosi Jogosultságkezelés és Tagvédelem (`CompanySettingsTab` & `company-actions.ts`)
- **Probléma:**
  - Sima munkavállalóként vagy tagként bejelentkezve korábban a Cég beállítások fülön elérhető és szerkeszthető volt a cég adatlapja (mentés gombbal), látható volt a vállalat teljes taglistája a törlés (kuka) ikonnal, és a megosztási meghívókód generálása is hozzáférhető volt. Így egy munkavállaló véletlenül módosíthatta a cég adatait vagy eltávolíthatta a saját fiókját a cégből.
- **Megoldás és Jogosultsági Szigorítás:**
  - **Tagok kártya elrejtése:** A *Tagok* kártya kizárólag a cég tulajdonosa (`isOwner === true`) számára renderelődik. Sima munkatársak számára a kártya teljesen rejtve van, a `getCompanyMembersAction` pedig szerveroldalon is blokkolja az illetéktelen lekérést.
  - **Cégadatok zárolása (Csak megtekintés):** Nem-tulajdonos esetén az űrlapmezők (cégnév, adószám, székhely, ország, képviselő, telefon) inaktívak (`disabled`), a mentés gomb helyén diszkrét infóbadge jelenik meg: *„Csak megtekintés • A cég adatait kizárólag a tulajdonos szerkesztheti.”*. A fejlécben külön szerepkörjelző badge (*Tulajdonos* / *Munkavállaló / Tag*) látható.
  - **Cég hozzáférési kód (Meghívó generálás) védelme:** A 6 karakteres, 10 perces csatlakozási kód generálása és másolása kizárólag a cég tulajdonosa számára érhető el.
  - **Kanonikus megerősítő törlő modál (`AlertDialog`):** A tagtörlés natív böngészős `confirm()` helyett a rendszer egységes `<AlertDialog>` komponensét használja a tag nevének, emailjének és cégének feltüntetésével, figyelmeztető leírással és töltésjelzővel. A tulajdonos nem távolítható el.
  - **Szerveroldali Védelmi Kapuk:** `updateCompanyAction`, `generateCompanyShareTokenAction`, `getCompanyMembersAction`, `removeCompanyMemberAction`, és `inviteCompanyMemberAction` mind szigorú szerveroldali tulajdonosi ellenőrzést kaptak.
  - **Globális Admin felületek védelme:** A `/settings` oldalon a *Csapat* és *Szervezeti Egységek* fülek, valamint a `deleteUser` akció kizárólag rendszeradminisztrátorok (`isAdmin`) számára érhető el.


---

## Korábbi Verziók (2026-10-07)

### 👑 Egységes Vezetői Jóváhagyási Központ (Unified Approvals Hub) és Jelenléti Korrekció Vizuális Visszajelzés
- **Egységes Jóváhagyási Panel a Vezetői Nézetben (`UnifiedApprovalsPanel`, `/hr/manager`):**
  - **Probléma:** Korábban a jóváhagyásra váró kérelmek darabokra voltak tördelve: a rendes szabadságok a képernyő tetején, míg az újonnan bevezetett munkaidő korrekciók és a túlóra jóváhagyások a hatalmas havi csapatnaptár alá voltak szórva különálló kis dobozokban. Ez szétverte a frontend oldalszerkezetét és a vezetői élményt.
  - **Megoldás:** Minden függő vezetői feladat (Szabadság & Távollét, Munkaidő korrekció, Túlóra felhasználás & Csúsztatás) egyetlen, központi **Linear-flat jóváhagyási hubba** került a csapatnaptár fölött.
  - **Kategória Szűrőfülek:** `Összes (N)`, `Távollét (N)`, `Munkaidő (N)`, `Túlóra (N)` azonnali szűrés számláló jelvényekkel.
  - **Egységes Kártyák & Akciógombok:** Minden kérelemnél egységes avatar, dolgozó neve, beküldési időpont, szemantikus típusjelvény, kért részletek (pl. *2026. 10. 07. • Hiányzó jelenlét ➔ Kért: 08:00 – 15:30*), indoklás és egységes `[ ✕ Elutasít ]` / `[ ✓ Jóváhagy ]` gombok azonnali frissítéssel.
  - **Elutasítási Indoklás Modál:** Opcionális elutasítási magyarázat megadása, amelyet a dolgozó automatikus in-app értesítésben is megkap.
  - **Központi Fejléc Statisztika:** A vezetői nézet fejlécében lévő „függő kérelem” számláló mindhárom kérelmi típus összegét (`totalPendingCount`) mutatja.
- **Jelenléti Ív Dolgozói és Profil Vizuális Jelzése (`AttendanceTab.tsx`):**
  - **Probléma:** A dolgozói profilon a *Jelenlét* fülön (`/hr/employee/[id]`) nem látszott, ha az adott munkanapra korrekciós kérelem volt folyamatban, így a 08:00 – 15:30-as kért idő hiába szerepelt az adatbázisban, az íven sima üres munkanapként jelent meg.
  - **Megoldás:**
    - A nap sorában sárga `Korrekció bírálat alatt` jelvény és alatta a kért idősáv kiemelése: `Kért idő: 08:00 – 15:30 („indoklás”)`.
    - A *Becsekkolás* és *Kicsekkolás* oszlopokban diszkrét, meleg tónusú jelzés mutatja a kért időpontot: `(08:00)` és `(15:30)` (vagy meglévő adat felülírásakor `09:00 → 08:00`).
    - A sor enyhe meleg háttérszínt (`bg-amber-500/[0.04]`) kap a könnyű észrevehetőség érdekében.

- **Dolgozói Főoldali Szabadságnap Számítás Pontosítása (`src/app/hr/page.tsx`):**
  - **Hiba oka:** A dolgozói kezdőlapon a felhasznált szabadságot korábban a jóváhagyott kérelmek darabszáma (`tavolletek.filter(...).length`) alapján jelenítette meg a rendszer a ténylegesen kivett munkanapok összege helyett. Így egy 10 munkanapos szabadság csak 1 napként jelent meg a kártyán és a progress barban.
  - **Javítás:** Bevezetve a `calculateWorkingDays` kalkulátor a magyar munkaszüneti napok (`hr_munkaszuneti_nap`) figyelembevételével és a `munkanapok_szama` összegzésével.
  - Hozzáadva a nullával való osztás elleni védelem (`totalLeave > 0 ? ... : 0`).
- **Globális Csapatnaptár Szűrőrendszer (`TeamCalendar`, `src/app/hr/time/page.tsx`):**
  - Bővítve a csapatszintű naptárfelületet teljes körű szűrési és keresési eszköztárral:
    - **Élő keresőmező:** Azonnali szűrés munkatárs neve és munkaköre szerint gyors törlés gombbal.
    - **Részleg / Szervezeti Egység Szűrő:** Dinamikusan betöltött szervezeti egységek (`hr_szervezeti_egyseg`) szerinti csoportosítás.
    - **Típus Választó:** Szabadság, Betegszabadság, Csúsztatás (Túlóra), Fizetetlen, Tanulmányi szűrés.
    - **"Csak távollévők" kapcsoló:** A teljes céges állományból egy kattintással csak az éppen távol lévő kollégák megjelenítése.
    - Aktív szűrők darabszám-jelvénye és "Szűrők törlése" reset gomb, üres állapotok kulturált kezelése.
- **Időrögzítés Megújítása, Ebédszünet és Munkaidő Korrekciós Jóváhagyási Rendszer:**
  - **Szigorú Vezetői Jóváhagyási Workflow:** A dolgozó közvetlenül nem írhatja felül a jelenléti ívet. Az utólagos módosítások (elfelejtett be-/kicsekkolás, eltérő időpont) **korrekciós kérelemként** kerülnek benyújtásra a közvetlen vezető felé.
  - **Új Adatbázis Tábla (`hr_jelenlet_korrekcio`):** Dedikált migráció (`20261007000002_hr_jelenlet_korrekcio.sql`) tárolja a kérelmeket (eredeti és kért időpontok, indoklás, `jovahagyasra_var`, `jovahagyva`, `elutasitva` státuszok, audit időbélyegek) RLS jogosultságokkal.
  - **Vezetői Bíráló Felület (`AttendanceCorrectionRequestsPanel`, `/hr/manager`):** A vezetők a Vezetői Nézetben látják a beosztottak korrekciós kérelmeit (dolgozó neve, dátum, eredeti ➔ kért idősáv, indoklás), amelyeket egyetlen kattintással jóváhagyhatnak vagy elutasíthatnak.
  - **Automatikus Érvényesítés Jóváhagyáskor (`handleAttendanceCorrectionApproval`):** Csak jóváhagyás után frissül a `hr_jelenlet` tábla, a rendszer automatikus in-app értesítést küld a dolgozónak és hitelesített bejegyzést rögzít a `hr_esemeny_naplo` audit táblában.
  - **Jelenléti Ív Állapotjelző (`EmployeeTimesheet`):** A havi jelenléti ív a bírálat alatt lévő napoknál sárga `Bírálat alatt` jelvénnyel tájékoztatja a munkavállalót a folyamatban lévő korrekcióról.
  - **Ebédszünet / Szünetkezelés:** A `TimeTrackingCard` egykattintásos ebédszünet indítást és lezárást kapott, amely szünetelteti a számlálót és levonja a szünetet a nettó munkaidőből.
  - **Munka Folytatása (Resumption):** Kicsekkolás után nem tiltja le a gombot, hanem engedélyezi a munka folytatását (`toggleCheckIn` újranyitással).
- **Kétcsatornás Csúsztatási Igénylés:**
  - **Távollét Űrlap (`LeaveRequestDialog`):** Új `Csúsztatás (Túlóra terhére)` opció, automatikus munkanapszámítással (8h/nap) és valós idejű egyenlegellenőrzéssel. Hiány esetén informatív hibaüzenet és beküldési tiltás.
  - **Túlóra Egyenleg Kártya (`OvertimeBalanceCard`):** Új interaktív csúsztatási modál naptárral, gyors gombokkal (`Egész nap (8h)`, `Fél nap (4h)`, `Egyedi óra`) és élő egyenlegkalkulációval (aktuális, levonandó, jóváhagyás utáni).
- **Túlóra Kifizetés Igénylése:**
  - Új pénzbeli kifizetés igénylő modál óraszám-megadással vagy `Teljes egyenleg kifizetése` gyorsgombbal, maximális egyenlegkorláttal és vezetői megjegyzéssel.
- **Jelenlét és Szabadság Oldali Integráció (`/hr/self-service/time`):**
  - A felső statisztikai sáv 4 kártyás Linear-flat rácsra bővült (`grid-cols-2 lg:grid-cols-4`), ahol a 4. kártya közvetlenül a *Túlóra Egyenleg* (`KpiCard`).
  - A kártyára kattintva azonnal megnyílik az `OvertimeActionDialog` csúsztatási és kifizetési modál, míg lent a `Saját kérelmeim` lista teljes szélességében, tisztán és zavartalanul jelenik meg.
  - **Felesleges duplikáció megszüntetése:** A fő Dolgozói Áttekintés (`/hr`) irányítópult aljáról eltávolításra került a redundáns `OvertimeBalanceCard`, mivel a túlóra kezelése fókuszáltan és tisztán a *Jelenlét & Szabadság* oldalon érhető el.
- **Adatbázis-szintű Kétirányú Szinkronizáció és Levonás:**
  - Bővítve a `hr_tavollet_tipus` enum a `'csusztatas'` értékkel, új `datum` és `tavollet_id` mezők a `hr_tulora_felhasznalás` táblán.
  - Kétirányú, nem-rekurzív PostgreSQL triggerek: `trg_tulora_felhasznalas_approval` automatikusan levonja a perceket jóváhagyáskor a `hr_tulora_egyenleg` táblából és szinkronizálja a kapcsolt `hr_tavollet` rekordot; `trg_tavollet_csusztatas_sync` garantálja, hogy ha a vezető a rendes távolléti listából hagyja jóvá a csúsztatást, a túlóra felhasználás is automatikusan jóváhagyódik és levonódik.
- **Vezetői Felület és Értesítések (`OvertimeRequestsPanel`, `attendance-actions.ts`):**
  - A beosztotti kérelmek megjelenítik a csúsztatás pontos dátumát és indoklását. A jóváhagyás a `handleOvertimeApproval` szerverakción keresztül történik azonnali dolgozói in-app értesítéssel.
- **Timesheet & Riport Kompatibilitás:**
  - A `calculateMonthlyTimesheet` kalkulátorban és a havi zárási PDF generátorban a csúsztatás fizetett távollétként jelenik meg, nem generálva munkaidő-hiányt.

### 🧹 Dolgozói Portál Tisztítása: Redundáns „Céges Szabályzatok” Kivezetése
- **Megszüntetve:** Eltávolítva a dolgozói irányítópult (`/hr`) fejlécéből a zavaró, pulzáló számlálóval ellátott „Céges Szabályzatok” gomb és a mögötte lévő felesleges adatbázis-lekérdezés (`hr_ceges_dokumentum`).
- **Indoklás:** Az Onboarding folyamat (P-034 – P-039) során a munkavállaló minden jogszabályilag előírt hivatalos dokumentumot (munkaszerződés, munkaköri leírás, Mt. 46. § tájékoztató, tűz- és munkavédelmi oktatási jegyzőkönyv, eszközfelelősségi jegyzőkönyv) kötelezően megkap, cégszerűen aláír és beiktatásra kerül az eaisyDocs személyi dossziéjába. A portálon lévő korábbi „Elfogadom” gombos, üres sablonos funkció redundáns és jogilag nem hiteles volt.
- **Átirányítás & Kódtisztítás:** A korábbi `/hr/self-service/dokumentumok` útvonal biztonságos szerveroldali átirányítást kapott a dolgozó valódi személyi profiljára (`/hr/self-service/profile`), a felesleges mock sablonkomponensek (`DocumentList`) és műveletek törölve lettek.

### 🐛 Hibajavítás: Windows Chromium PDF Generálás Elhárítása (`src/utils/pdf-browser.ts`)
- **Hiba:** Helyi Windows környezetben a Cafeteria nyilatkozat (és egyéb HR dokumentumok) in-browser megtekintésekor és generálásakor a böngésző azonnal összeomlott: `Failed to launch the browser process: Code: 2147483651` (STATUS_BREAKPOINT / 0x80000003).
- **Kiváltó ok:** A `CHROMIUM_ARGS` tömbben szereplő `--single-process` és `--no-zygote` kapcsolók a modern asztali Chrome és Edge architektúrában nem engedélyezettek és azonnali process crash-t idéztek elő.
- **Megoldás:**
  - Szétválasztva a helyi asztali (`LOCAL_CHROMIUM_ARGS`) és a Vercel/serverless (`SERVERLESS_CHROMIUM_ARGS`) Chromium argumentumokat.
  - Továbbfejlesztve a Windows Chrome és Edge útvonalkeresőt (`process.env.ProgramFiles`, `process.env['ProgramFiles(x86)']`, `process.env.LOCALAPPDATA`).
  - Helyi böngésző indítási hiba esetén intelligens automatikus fallback a beépített `puppeteer` csomagra.

### 📊 HR Riportok Modul Teljes Megújítása ([P-050](../product/decisions/P-050-hr-reports-t1041-ksh-payroll-overhaul.md), [A-031](../architecture/decisions/A-031-hr-reports-data-aggregation-and-export-architecture.md))
- **Teljes körű Funkcionális és Vizuális Refaktorálás (Global UI Consistency - P-043 / A-029):**
  - Megszüntetve a korábbi kezdetleges állapotot és a hibás, egyetlen oszlopba tömörülő, sérült ékezetes CSV fájlokat (pl. `BelĂ©pĂ©s`).
  - Új, 4 füles interaktív adatközpont: *NAV T1041*, *KSH Riport*, *Bérszámfejtés* és *Bevallás Archívum*.
- **Multi-Engine Export Pipeline (`src/utils/hr/reports-export.ts`):**
  - **Formázott SheetJS `.xlsx` Munkafüzetek:** Automatikus oszlopszélességek, formázott fejlécek és numerikus típuskezelés (munkaórák, munkanapok, Ft összegek).
  - **Magyar Excel Kompatibilis CSV Engine:** UTF-8 BOM (`\uFEFF`) és pontosvessző (`;`) határoló, garantálva a hibátlan megjelenést a hazai Microsoft Excel táblázatkezelőkben.
  - **ÁNYK / ONYA Vágólap Szinkronizáció:** Egykattintásos tabulátoros másolás a hatósági ÁNYK és ONYA nyomtatványkitöltőkhöz.
  - **Két Munkalapos KSH Riport:** Különálló *KSH_Fomutatok* és *Reszleg_Bontas* munkalapok egyetlen Excel munkafüzetben.
  - **19 Oszlopos Bérszámfejtési Csomag:** Részletes bérprogram-előkészítő állomány (jelenlétek, túlórák, szabadság, betegszabadság, táppénz, cafeteria és havi zárási státusz).
  - **Cafeteria Részletező Export:** Munkavállalónkénti juttatási kategória bontás (.xlsx).
- **Intelligens Server Action Adatgyűjtés (`src/app/hr/reports/actions.ts`):**
  - `getT1041ReportData`: meglévő bejelentések feldolgozása, automatikus gap-detektálás a havi belépő/kilépő munkavállalóknál (`Bejelentésre vár`), titkosított érzékeny adatok (TAJ, adójel) feloldása, aláírt URL generálás az A4 adatlaphoz és NAV nyugtához.
  - `getKshReportData`: szétválasztott Terv (törvényes havi norma munkaidő-alap: naptári munkanapok × 8 óra × FTE) és Tény (valós becsekkolások a `hr_jelenlet` táblából), teljesülési arány (%), fluktuáció és részlegenkénti norma/tény bontás.
  - `getPayrollReportData`: dolgozónkénti Terv munkanap és munkaóra vs. Tény jelenléti adatok, túlóra, távolléti jogcímek, cafeteria és vezetői jóváhagyási státuszok (`hr_havi_jelenlet_zaras`).
  - `uploadT1041ReceiptFromReport`: közvetlen NAV befogadási nyugta feltöltése a táblázat soraiból, Supabase tárolás, iratkezelői iktatás (`executeHrDocumentFiling`), és azonnali `Igazolva` státuszfrissítés audit naplózással.
- **Elavult Compliance Modul Kivezetése és Konszolidációja a Riportokba:**
  - Eltávolítva a redundáns és elavult `Compliance` menüpont az oldalsávból (`src/components/hr-sidebar.tsx`).
  - A `/hr/compliance` útvonal tiszta Next.js szerver átirányítást (`redirect("/hr/reports")`) kapott a könyvjelzők és külső linkek védelmére.
  - Törölve a korábbi kezdetleges segédkomponensek (`nav-t1041-generator.tsx`, `ksh-report-generator.tsx`).
- **Egyéni Dolgozói Riport és Hatósági Adatlap Készítés:**
  - **Bérszámfejtés:** Beépítve a munkavállaló szerinti szűrő a `TableToolbar`-ba, valamint minden sorban közvetlen **„Egyéni export (.xlsx)”** letöltés (`exportSingleEmployeePayrollToXlsx`), amely két munkalapon (dolgozói adatlap és bérprogram sor) bontja ki az adott személy havi adatait. Emellett beépítve a közvetlen munkavállalói jelenlét/dosszié hivatkozás is.
  - **NAV T1041:** Új, közvetlen **„+ Egyéni T1041 Készítése”** modál, ahol a vállalat bármely aktív dolgozójára azonnal generálható ÁNYK vágólapos szöveg, illetve hivatalos A4-es T1041 PDF adatlap előnézet, amely automatikusan beiktatásra kerül a személyi dossziéba.
- **Kanonikus UI / UX Elemek és Globális Elrendezés-Finomítás (`src/components/hr/reports-tabs.tsx`, `src/components/table-toolbar/table-toolbar.tsx`):**
  - **Felső Statisztikai Sáv:** Megszüntetve a korábbi különálló, helypazarló felső időszakválasztó kártyát; a Linear Flat `KpiCard` sáv mostantól – a szoftver többi oldalához hasonlóan – közvetlenül a `Riportok` cím és alcím alatt helyezkedik el mint elsődleges összefoglaló, és fülváltáskor dinamikusan frissül az aktív riport adataira.
  - **Beépített Időszakválasztó a `TableToolbar`-ban:** A központi [TableToolbar](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/table-toolbar/table-toolbar.tsx) kapott egy beépített `periodPicker` propot, így a havi naptárválasztó és az azonnali adatfrissítő gomb közvetlenül a zöld **Szűrés** gomb mellé épült be a hatósági riportok és a bérszámfejtés eszköztárába.
  - Linear Flat `KpiCard` sáv mind a 4 fülön díszítő ikonok és vastag bal oldali szegélyek nélkül.
  - Szabványos `TableToolbar` valós idejű gépelési kereséssel és tematikus szűrőcsoportokkal.
  - In-place dokumentum és hatósági nyugta betekintés (`DocumentPreviewFrame`) közvetlen felugró modálban; külső Supabase Storage Signed URL-eknél a cross-origin CORS és hitelesítő adatok (`credentials: "omit"`) optimalizálásával garantálva a hibátlan böngészős PDF betöltést.
  - Kereshető Bevallás Archívum új feltöltési felülettel és törlési megerősítő párbeszédablakkal.

---

## [Release v1.6.0] – (2026-10-05)

### 📜 AI Alapú Üzleti Szerződés- és Megállapodásgenerátor ([P-049](../product/decisions/P-049-ai-business-contract-and-agreement-generator-ux.md))
- **Természetes Nyelvű AI Szerződéskészítés (Gemini 2.5 Flash + Determinisztikus Tartalék):**
  - Bevezetve az általános B2B/B2C szerződésgenerátor motor (`src/utils/contract-templates.ts`, `src/app/partners/contract-actions.ts`), amely a partner törzsadatait (név, székhely, adószám, képviselő) és a felhasználó szabadszöveges instrukcióit (pl. díjazás, óradíj, határidők, kötbér, SLA) hatályos magyar polgári jogi (Ptk.) fejezetekre és számozott bekezdésekre bontott szerződéssé formálja.
  - Hálózati vagy API korlátok esetén az intelligens determinisztikus jogi mintamotor azonnal és zökkenőmentesen átveszi a munkát, így a felhasználó sosem akad el.
- **Kiterjedt Üzleti Sablonkatalógus:**
  - 5 előre definiált, egykattintásos mintapromptokkal és záradékokkal ellátott szerződéstípus:
    1. *Megbízási Szerződés* (fejlesztési, tanácsadói és alvállalkozói megbízásokhoz)
    2. *Titoktartási Megállapodás (NDA)* (kétoldalú és egyoldalú üzleti/műszaki védelem kötbérrel)
    3. *Szolgáltatási Keretszerződés* (egyedi lehívásos megrendelésekhez és SLA feltételekhez)
    4. *Teljesítésigazolási Jegyzőkönyv* (mérföldkövek átvételéhez és számlázás engedélyezéséhez)
    5. *Egyedi Üzleti Megállapodás* (szabadon konfigurálható együttműködési konstrukciókhoz)
- **Hivatalos Kétoldalú A4 PDF Generátor (`src/utils/contract-pdf-generator.ts`):**
  - Formális fejléc és lapszámozás, WinAnsi kódolásbiztos karakterkezelés (ő/ű -> ö/ü).
  - Számozott fejezetek és automatikus szövegtördelés több oldalra.
  - Kétoszlopos cégszerű aláírási blokk (Megbízó vs Megbízott/Partner képviselői aláírási vonalakkal).
- **Zökkenőmentes Iktatási & Expedíciós Híd:**
  - Választási lehetőség: új dedikált ügyirat nyitása vagy meglévő folyamatban lévő ügyirathoz csatolás.
  - Kimenő irat (`irany = 'kimeno'`) rögzítése a partnerhez polimorf `irat_kapcsolat`-tal, SHA-256 hash kalkulációval és append-only `esemeny_naplo` audit bejegyzéssel.
  - Opcionális azonnali expediálás: a partner e-mail címére közvetlen PDF csatolmánnyal kiküldhető az elkészült szerződés.
- **Modern Linear Flat UI Modál (`ContractGeneratorDialog`):**
  - Integrálva a Partner Részletes Lapján (`src/app/partners/[id]/page.tsx`) és a Partnertáblázat soraiban (`src/app/partners/partners-table-client.tsx`).
- **Pénzügyi Adatok és Promptek Szétválasztása (Single Source of Truth):**
  - Megszüntetve a díjösszegek és időtartamok duplikációját a felső strukturált beviteli mezők (`feeAmount`, `currency`, `validityMonths`) és a mintapromptok között.
  - A felső numerikus beviteli mező az elsődleges mérvadó pénzügyi adat (megbízási díj, igazolt összeg vagy kötbér), alapértelmezetten tiszta / üres indítással és dinamikus kétirányú promptszinkronnal.
- **Dinamikus Sablonváltás Prompt-frissítéssel:**
  - Sablonváltáskor a prompt azonnal és automatikusan átveszi az újonnan kiválasztott sablon mintapromptját, megszűnt a korábbi sablon promptjának beragadása.
- **Valós Idejű A4-es PDF Előnézet és Betekintő (`generateContractPdfPreviewAction`):**
  - A 2. lépés fejlécében diszkrét `[ 👁️ PDF Előnézet ]` gombbal egyetlen kattintással előhívható az aktuálisan szerkesztett szövegből a memóriában generált, valós A4-es PDF előnézeti modál (`DocumentPreviewFrame`), lapozással, nagyítással és közvetlen `[ ⬇ PDF Letöltése ]` opcióval.
- **Kanonikus `AlertDialog` Sablontörlési Megerősítés:**
  - A natív böngészős `window.confirm()` popup helyett a rendszerszintű, Linear-flat `AlertDialog` komponens gondoskodik az egyedi sablonok biztonságos és stílusos törléséről.
- **Base UI `nativeButton` Figyelmeztetés Megszüntetése:**
  - A sikeres iktatást követő eredménykártyán az ügyirat megnyitása gomb a kanonikus `<Link className={buttonVariants(...)}>` formátumra módosult, megszüntetve a Base UI natív gomb inkompatibilitási figyelmeztetését.
- **Storage Bucket Hiba Elhárítása (`irat_files`):**
  - Javítva a szerződés véglegesítésekor fellépő `Bucket not found` hiba: a nem létező `iratok` helyett a rendszerben kanonikus `irat_files` storage bucket és admin fallback került beállításra.
- **Jövőbeli Továbbfejlesztési Backlog Rögzítése:**
  - Lejárati feladat-emlékeztetők, kétnyelvű (HU-EN) generálás, digitális aláírási lánc (AVDH/e-Szignó) és Partner 360° aktív szerződés widget rögzítve a P-049 PRD-ben és a központi specifikációban (`EaisyDOCS_funkciok_es_backlog_v2.md`).

### ✉️ Kimenő Irat, Válaszlevél és Expediálási Architektúra UX ([P-048](../product/decisions/P-048-outgoing-document-and-dispatch-architecture-ux.md))
- **Teljes Mező-Duplikáció Felszámolása (Zero Redundancy):**
  - Megszüntetve a közvetlen levélírás korábbi hibáját, ahol egymás alatt duplán kellett megadni a tárgyat és az üzenetet („Kimenő levél tárgya” + „Válaszlevél szövege” és „E-mail tárgya” + „Kísérőszöveg a partnernek”).
  - Az új, letisztult modellben kizárólag **1 címzett e-mail cím, 1 tárgy és 1 válaszlevél szövege** szerepel.
  - A megadott szövegből a rendszer automatikusan formális fejlécű A4-es PDF dokumentumot generál az irattár és az iktatókönyv számára, és azonos tartalommal azonnal kiküldi e-mailben a partnernek a csatolt PDF-fel együtt.
- **Tökéletesen Kiegyensúlyozott, Szimmetrikus Grid Elrendezés (`h-[500px]`):**
  - Megszüntetve a bal oldali kártya korábbi 900+ pixeles monolitikus túlzsúfoltságát.
  - A bal oldali *„Válaszlevelek és Expediálás”* panel és a jobb oldali *„Belső Megjegyzések”* kártya immár szigorúan **azonos magasságú (`h-[500px]`)**, azonos fejléc vizuális súlyú és tökéletesen illeszkedik a Linear Flat dizájnrendszerbe.
- **Letisztult Modális Munkafolyamatok (Focused Action Dialogs):**
  - A 3 iratkészítési művelethez fókuszált modális dialógusok tartoznak:
    - `[ ✉️ Válaszlevél írása ]` (Kiemelt zöld gomb): közvetlen válasz megfogalmazása és azonnali expediálása.
    - `[ 📁 PDF feltöltése ]`: meglévő PDF dokumentum csatolása és kézbesítése (e-mailben, postai feladással vagy későbbi iktatással).
    - `[ 📝 Sablon használata ]`: hivatalos iratsablonok (hiánypótlás, számlabefogadási igazolás, tájékoztató levél) kiválasztása, szerkesztése és PDF generálása.
- **Kimenő Iratok Listája, Gyors Megtekintő és Utólagos Expediálás:**
  - A panel görgethető listájában megjelennek az ügyirathoz tartozó kimenő iratok (`outgoingDocs`) alszámmal és címzettel.
  - Szemantikus státuszjelvények: `Kiküldve e-mailben (dátum)`, `Postázva (dátum)` és `Expediálásra vár`.
  - Beépített `DocumentViewer` előnézet szem ikonnal a csatolt és generált PDF-ekhez.
  - Utólagos expediálás (`ExpediteDialog`) a korábban még ki nem küldött iratokhoz.
- **Válaszlevél és Feladat Sablon Katalógus & Teljes CRUD Kezelés (`ReplyTemplatePicker`, `TaskTemplatePicker`):**
  - Mindegyik sablonnál (beépített alapértelmezett és egyéni sablonoknál is) elérhetővé téve a 3 pontos műveleti menü (`Sablon módosítása`, `Sablon törlése`), így a szervezeti igényeknek megfelelően bármelyik sablon átírható vagy törölhető a `rendszer_beallitas` táblából.
  - Dedikált keresés név, tárgy és szöveg alapján, kategória szerinti szűrés és azonnali alkalmazás mind a közvetlen válaszlevélnél, mind a sablonos generálásnál.
  - **Interaktív Lebegő Előnézet (Hover Card):** Az egér sablonkártyára húzásakor (`HoverCard`) azonnal megjelenik egy elegáns lebegő panel a teljes levélszöveggel, pontos irattárggyal, karakterszámmal és közvetlen „Alkalmazás” gombbal.
- **Kiküldetlen Kimenő Iratok Törlése (`deleteOutgoingDocument`):**
  - Megvalósítva a még expedícióra váró kimenő irat vázlatok végleges törlése megerősítő modállal, a csatolt storage fájlok biztonságos felszabadításával és append-only audit naplózással (`esemeny_naplo`).
- **Válaszlevél, Sablon és PDF Melléklet feltöltésének Egységesítése (Unified Reply & Attachment Workflow):**
  - Megszüntetve a válaszlevél írása, a sablon használata és a PDF feltöltése közötti mesterséges szétválasztást.
  - A korábbi 3 különálló dialógus helyett **egyetlen egységes kimenő irat modál** jött létre, ahol a felhasználó:
    1. Kiválaszthatja a sablont a legördülőből (vagy az élő lebegő előnézetes Katalógusból), illetve írhat egyedi szöveget.
    2. Ugyanabban az ablakban a beépített drag-and-drop és kattintható PDF csatolómezőben **külső PDF mellékletet csatolhat** (pl. számla, szerződéstervezet, igazolás, nyilatkozat).
    3. Kiválaszthatja a kézbesítési módot (`email`, `posta`, `none`), és egyetlen gombnyomással (`Válaszlevél elküldése és iktatása`) kiküldheti mindkettőt.
  - A szerver akció (`generateAndExpediteReply`) automatikusan legenerálja a fejlécadatokkal ellátott A4-es hivatalos válaszlevél PDF-et, feltölti a csatolt külső PDF-et, összekapcsolja mindkettőt az irattal (`irat_fajl`), és e-mailben **mindkét PDF dokumentumot csatolmányként azonnal kiküldi a partnernek**.
  - A kimenő iratok listájában a többcsatolmányos iratoknál minden csatolt fájl külön gombbal (`Eye` és `Paperclip`) megjelenik és a `DocumentViewer`-ben megtekinthető.
  - A panel tetején az akciógombok 2 kiegyensúlyozott gombra egyszerűsödtek: `[ ✉️ Válaszlevél készítése és küldése ]` és `[ ✨ Sablonok katalógusa ]`.
- **Modális Elrendezés és Vízszintes Elcsúszás Javítása (Zero Horizontal Scroll):**
  - Megszüntetve a textarea `field-sizing-content` böngésző-szintű konténertágulása és a `DialogFooter` negatív margója miatti vízszintes scrollbar és gomb-levágódási hiba a válaszlevél és sablongeneráló modálokban.

### 📁 Ügyirat Életciklus, Szakmai Elintézés és Lezárási Architektúra UX ([P-047](../product/decisions/P-047-dossier-lifecycle-and-settlement-architecture-ux.md))
- **Kétfázisú Életciklus Szétválasztása (Elintézés vs Irattározás):**
  - **Szakmai Elintézés („Ügyirat elintézése” / `elintezett`):** Bevezetve az ügyintézők és vezetők számára a szakmai munka befejezésének formális aktusa, amely igazolja, hogy a számlaigazolás, feladatok és válaszlevelek mind teljesültek.
  - **Hivatalos Lezárás és Irattározás (`irattarban`):** A folyamat végleges, archív fázisa, amely a megőrzési idő számítását indítja el, kizárólag a jogosult vezetők és irattárosok számára.
  - **Visszahelyezés Ügyintézésbe:** Ha egy szakmailag elintézett ügyiratban mégis további érdemi teendő merülne fel, egyetlen kattintással visszaállítható `ugyintezes_alatt` státuszba.
- **Kritikus Logikai Hiba Javítása a Feladatok Lezárásánál:**
  - Megszüntetve a hibás formulát (`completedTasks + rejectedTasks === totalTasks`), amely elutasított feladat esetén is késznek minősítette az ügyiratot.
  - Az új, szigorú feltételrendszer: **Kizárólag akkor engedélyezett az elintézés, ha az összes feladat kész (`completedTasks === totalTasks`) és EGYETLEN elutasított feladat sincs (`rejectedTasks === 0`)**.
- **Kanonikus Fejléc Életciklus Kezelő (`DossierLifecycleActions`):**
  - Az ügyirat részletes lapján (`src/app/dossiers/[id]/page.tsx`) a korábbi magányos és ügyintézőknek tiltott gomb helyett intelligens, állapotfüggő műveleti sáv működik:
    - `ugyintezes_alatt`: „Ügyirat elintézése” modál állapot-diagnosztikával (elutasított vagy nyitott feladatok esetén részletes figyelmeztetés és blokkolás).
    - `elintezett`: Zöld jelvény, „Lezárás és Irattározás” (irattárosoknak/vezetőknek) és „Visszahelyezés ügyintézésbe” gombok.
    - `irattarban`: Véglegesített, biztonságos archív állapot.
- **Feladatok Tab Megtisztítása (`src/components/tasks-tab.tsx`):**
  - Kivezetve az oda nem illő, félrevezető gombot az ügyirati feladatok kártya fejlécéből.
  - Elutasított feladat esetén egyértelmű figyelmeztető banner tájékoztat a teendők rendezésének szükségességéről.
  - Ha minden feladat sikeresen lezárult, elegáns sikerbanner és közvetlen elintézési gomb segíti a munkafolyamatot.
- **Szerver Oldali Védelem (`src/app/dossiers/[id]/actions.ts`):**
  - Az `updateDossierStatus` és a `closeDossier` szerver actionök közvetlenül adatbázis szinten ellenőrzik a kapcsolódó feladatok státuszát, kizárva a felület megkerülésének lehetőségét.
  - Az eseménynaplóban (`esemeny_naplo`) rögzítésre kerül az `elintezve` eseménytípus, amely a timeline-on zöld pipával és pontos indoklással jelenik meg.

### 👥 eaisyHR Modul Teljes Rendszerszintű UI/UX & Design Tisztítás ([A-029](../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [P-043](../product/decisions/P-043-global-ui-consistency-and-unified-components.md))
- **Linear Flat Design & Szemantikus HSL Színrendszer 100%-os Kiterjesztése az Egész eaisyHR-re:**
  - **Zero Árnyék Garancia:** Kigyomlálva az összes dobozárnyék (`shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xs`, `shadow-2xs`) a kártyákról, modálokról, tabokról és gombokról (`src/app/hr/*`, `src/components/hr/*`).
  - **Szemantikus Színleképezés (0 Nyers Szín):** Eltávolítva az összes közvetlen színosztály (`emerald-*`, `amber-*`, `blue-*`, `purple-*`, `green-*`, `rose-*`, `indigo-*`, `teal-*`, `sky-*`, `orange-*`, `red-*`), kizárólag a platformszintű szemantikus tokeneket használva: `primary`, `success`, `warning`, `info`, `destructive`, `muted`.
  - **Hardcoded Hex Színek Eltávolítása:** Megszüntetve az összes `#02b8cc` és `#029db0` egyedi hex szín a gombokról és űrlapokról, átállítva a standard `Button` komponensekre és `primary` tokenekre.
- **Tipográfiai és Táblázat Egységesítés:**
  - **Címek és Modál Fejlécek:** Mindenhol `font-semibold` címkézés az elavult vagy túl vastag `font-bold` helyett.
  - **Numerikus Adatok:** Számok, összegek, dátumok és százalékos értékek egységesen `tabular-nums` formázást kaptak.
  - **Kompakt Táblázatok (`.compact-table`):** Minden HR táblázat (jelenlét, orvosi alkalmasság, KSH jelentés, értékelési ciklusok, munkakörök, dolgozók) megkapta a `.compact-table` osztályt és a kötelező `<div className="overflow-x-auto">` burkolót.
- **Kanonikus KPI Kártyák & Komponens Tisztítás:**
  - A szervezeti egység (`orgunit/[id]`), munkaügyi és munkaköri oldalak ad-hoc ikondobozos kártyái átállítva a kanonikus `<KpiCard>` komponensre (aszimmetrikus vastag keretek és dekoratív ikonok nélkül).
  - A toborzási jelöltkezelő lista (`talent-pool-list.tsx`) átállítva a kanonikus `TableToolbar` komponensre (`FilterGroup`, `activeFiltersCount`).
- **Kódminőség & Fordítási Stabilitás:**
  - A teljes projekt `npx tsc --noEmit` típusellenőrzése **0 hibával** fut le.
- **Linear Flat Design & Szemantikus HSL Színrendszer Teljes Rendszeresítése:**
  - Kivezetve az összes közvetlen Tailwind színosztály (`amber-500`, `emerald-500`, `blue-500`, `rose-500`, `purple-500`).
  - Helyettük kizárólag a platformszintű HSL tokenek érvényesülnek: `warning`, `success`, `info`, `destructive`, `primary`.
  - Eltávolítva a tiltott `shadow-sm` és `shadow-lg` árnyékok a kártyákról és a vezérlőelemekről (`src/components/dashboard-overview.tsx`, `src/app/settings/notification-settings.tsx`).
- **Kompakt Táblázat Magasság (`.compact-table` - 45px) Minden eaisyDocs Táblázaton:**
  - `src/components/inbox-table-client.tsx` (Bejövő iratok)
  - `src/app/dossiers/dossiers-table-client.tsx` (Iktatókönyv)
  - `src/app/tasks/task-list.tsx` (Saját feladataim lista nézet)
  - `src/app/partners/partners-table-client.tsx` (Partnerek törzsadat)
  - `src/components/archive-client.tsx` (Irattár & Selejtezés mind az 5 belső táblázata)
  - `src/components/iratok-lista.tsx` (Ügyirat részletes adatlap iratlistája)
  - `src/app/settings/notification-settings.tsx` (Kiküldési audit napló)
  - `src/components/irattari-terv-manager.tsx` (Nyers HTML `<table>` átalakítva szabványos shadcn `<Table className="compact-table">`-re).
  - Minden táblázat tárolója elláttatott a kötelező `overflow-x-auto` vízszintes görgetési védelemmel.
- **Központi Eszköztár (`TableToolbar`) és Gyors Betekintő (Quick View):**
  - **Iktatókönyv (`/dossiers`):** Beépítve a dedikált *Műveletek* oszlop a szabványos `Eye` gyors betekintő gombbal és egy felugró modállal (`Dialog`), amely azonnal mutatja az iktatószámot, tárgyat, felelőst, határidőt és irattári helyet anélkül, hogy el kellene hagyni a listát.
  - **Bejövő sor (`/inbox`):** Integrálva a csatolt fájlok in-place `DocumentViewer` előnézete, javított `irat_fajl` lekérdezéssel.
  - **Feladatok (`/tasks`):** Kiegészítve a hiányzó `TableToolbar`-ral (kereső, oszlopválasztó, határidő szűrő, állapotcsoportos szűrés).
  - **Partnerek (`/partners`):** Egyedi ad-hoc KPI sáv lecserélve a kanonikus `<KpiCard>` komponensre (dekoratív ikonok és vastag bal szegélyek nélkül).
  - **Irattár (`/archive`):** Bevezetve a 4 oszlopos kanonikus `KpiCard` összegző sáv (Irattárban lévő, Selejtezési javaslat, Jóváhagyandó, Selejtezett iratok).
- **Feladat Elutasítás Vizuális Újratervezése (Kamu Input Mezők & Aránytalan Dobozok Megszüntetése):**
  - **Kanban tábla (`src/app/tasks/kanban-board.tsx`):** Megszüntetve a túlméretezett piros dobozt és a szöveges beviteli mezőre hasonlító kamu keretet. A kártya megtartja az elegáns és kompakt Linear-flat méretét, az indoklás diszkrét, finom kurzív idézetként jelenik meg egy kis piros `Ban` ikonnal (`„teszt”`).
  - **Ügyirat Feladatok fül (`src/components/tasks-tab.tsx`):** Eltávolítva a kétszeresen beágyazott, input-szerű indoklás mezőt, a felesleges magyarázkodó segédszöveget és a tiltott `shadow-xs` árnyékokat. Helyette egy letisztult, egyrétegű, diszkrét `bg-destructive/5 border-destructive/20` indoklás doboz működik.
  - **Feladatlista nézet (`src/app/tasks/task-list.tsx`):** Kompakt és finom indoklás chip a táblázatsorban.
  - **Állapotok és Gombok:** Teljes HSL szemantikus átállás (`text-info`, `text-success`, `text-warning`, `text-destructive`).
- **Kódminőség & Fordítási Stabilitás:**
  - A teljes projekt `npx tsc --noEmit` típusellenőrzése 0 hibával fut le, böngészőben validálva.

---

## [Unreleased] – Fejlesztés alatt (2026-10-02)

### 👥 Egységesített Munkatársi Beléptetés & eaisyDocs Integrációs Modál ([P-045](../product/decisions/P-045-unified-employee-intake-and-docs-integration-ux.md), [A-005](../architecture/decisions/A-005-hr-modular-independence-architecture.md), [A-029](../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md))
- **Teljes Felületi Egységesség a HR Munkaasztalon és a HR Beállításokban:**
  - A HR Munkaasztalon (`src/app/hr/admin/page.tsx`) és a HR Beállításokban (`src/app/hr/settings/page.tsx`) azonos kanonikus `AddEmployeeDialog` (`src/components/hr/add-employee-dialog.tsx`) működik.
  - Mindkét felület a központi `availableDocsUsers` lekérdezést használja, amely szűri az eaisyDocs-hoz rendelt fiókokat és feloldja a szerepköröket.
- **Letisztult Vizuális Kommunikáció & Kétfülös Működés:**
  - **Meglévő eaisyDocs fiók fül:**
    - Finom teal/zöldes háttérszínű doboz (`border-teal-500/30 bg-teal-500/5 dark:bg-teal-500/10`) felesleges ikonok nélkül:
      > *"Ha a meglévő eaisyDocs fiókok közül választasz munkatársat, a felhasználó hozzáférést kap az eaisyHR modulhoz is."*
    - Dinamikus címke és kereshető legördülő lista eaisyDocs szerepkörökkel és *"Már HR dolgozó"* indikátorral.
  - **Új fiók (Csak eaisyHR) fül:**
    - Diszkrét tájékoztató sáv a moduláris szeparációról:
      > *"Ez a fiók kizárólag az eaisyHR rendszerhez kap hozzáférést, az eaisyDocs iratkezelőt nem éri el."*

### 🎨 Linear Flat Design Tisztítás & ESLint 0-Hiba Kódminőség
- **Tiltott Hover Árnyékok Teljes Kivezetése (Design Drift Fix):**
  - Eltávolítva az összes `hover:shadow-md`, `hover:shadow-xs` és `shadow-sm` lebegtetés:
    - `src/components/portal/document-list.tsx`
    - `src/components/hr/candidate-profile-sheet.tsx`
    - `src/components/hr/exit-interview-summary.tsx`
    - `src/app/karrier/page.tsx`
    - `src/app/hr/self-service/career/page.tsx`
  - Helyette a kanonikus Linear flat stílus (`border hover:border-primary/40 transition-colors`) érvényesül.
- **Tiltott Bal Oldali Vastag Szegély (`border-l-4`) Kivezetése:**
  - `src/components/hr/leave-history-list.tsx`: Letisztított, egységes `hover:bg-muted/40` sorstílus státusz-border nélkül.
- **Kanonikus KPI Kártya Komponens & Kezdő Képernyők Teljes Egységesítése (`src/components/kpi-card.tsx`):**
  - Elkészült a központi, kanonikus `KpiCard` komponens az ADR [A-029](../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md) és a design szabályzat alapján.
  - **eaisyDocs kezdőképernyő (`src/components/dashboard-overview.tsx`):** Megszüntetve az aszimmetrikus bal oldali vastag szegély (`borderLeftWidth: 3`), a színezett nagyméretű szám és az alsó "Megnyitás" link. Helyette a kanonikus Linear flat grid működik jobb oldali kerekített, színezett ikondobozzal (`w-10 h-10 rounded-lg`), uppercase felirattal és `text-2xl font-semibold tabular-nums` számokkal.
  - **eaisyHR kezdőképernyő (`src/app/hr/page.tsx` és `src/app/hr/admin/overview/page.tsx`):** A kézi kártyák átállítva a központi `KpiCard` komponensre, `font-bold` helyett `font-semibold tabular-nums` tipográfiával és egységes interaktivitással.
- **KPI Tipográfia és Tabular Nums Egységesítés:**
  - `src/components/hr/onboarding-list.tsx` és `src/components/hr/offboarding-list.tsx`: A KPI számoknál `font-bold` helyett a szabványos `font-semibold tabular-nums` formázás bevezetése.
- **Kritikus ESLint & React Hook Hibák Megszüntetése (25 hiba ➔ 0 hiba):**
  - `src/components/hr/batch-file-hr-documents-dialog.tsx`: React Rules of Hooks hiba javítva (a feltételes kilépés elé helyezve az `useEffect`).
  - `src/components/global-header-search.tsx`: `performDeepSearch` deklaráció előtti hívásának megszüntetése az `useEffect` átrendezésével.
  - `src/components/document-preview-frame.tsx`: Rekurzív önhívás ref-be csomagolása és render közbeni ref-módosítás megszüntetése.
  - `src/utils/pdf-extractor.ts`: `@ts-ignore` cseréje szigorúbb `@ts-expect-error`-ra.
  - `src/app/api/hr/download-document/route.ts` és PDF generátorok: `prefer-const` és nem használt változók automatikus rendezése.
  - **Eredmény:** Az ESLint hibák száma 0 (`npx eslint --quiet src/` hibátlanul lefut), a TypeScript fordítás (`npx tsc --noEmit`) 0 hibás.

### 🛡️ ThinkAI Biztonsági Audit & Alkalmazásszintű Keményítés ([A-030](../architecture/decisions/A-030-code-level-security-hardening.md), [P-044](../product/decisions/P-044-code-level-security-hardening.md))
- **Nyílt E-mail Relé Lezárása (`src/app/api/send-email/route.ts`):**
  - Autentikációs kapu (`supabase.auth.getUser()`) bevezetése.
  - Szigorú regex validáció a címzettre és feladóra, belső hibaüzenetek maszkolása.
- **HR Dokumentum Letöltési Jogosultság & IDOR Védelem (`src/app/api/hr/download-document/route.ts`):**
  - Jogosultságellenőrzés a `hr-documents` vödörből való letöltéseknél:
    - Belső munkaköri leírások megtekinthetők munkatársak számára.
    - Személyi és munkajogi iratok kizárólag a dokumentum tulajdonosa (dolgozó) vagy HR/Rendszergazda számára tölthetők le.
- **Időzített Cron Végpontok Keményítése (`src/app/api/cron/*`):**
  - Eltávolítva a beégetett teszt fallback kulcs (`teszt-cron-kulcs-123`) a `nightly` és `morning` végpontokról.
  - Szigorú `CRON_SECRET` kötelezettség a `src/app/api/cron/imap/route.ts` végponton.
- **PDF Konverziós Végpont Védelem (`src/app/api/pdf/convert/route.ts`):**
  - Autentikált munkamenet VAGY belső `x-internal-secret` (`CRON_SECRET`) fejléc megkövetelése.
  - Belső hívások (`inbox/actions.ts`, `batch-scanner.ts`) felkészítve a belső secret átadására.
- **AI CV Feldolgozás Védelem (`src/app/api/hr/parse-cv/route.ts`):**
  - Munkamenet-hitelesítés és `hr_admin` / `admin` szerepkör ellenőrzés a Gemini AI modell hívása előtt.
- **Karrier Portál Fájlfeltöltési Validáció & XSS Megelőzés (`src/app/karrier/[id]/*`):**
  - Kiterjesztés- és MIME típus fehérlista (`.pdf`, `.docx`, `.doc`), magic bytes ellenőrzés (`%PDF-`), 10 MB méretlimit.
  - Kivezetve a `dangerouslySetInnerHTML` a pozícióleírásoknál (`whitespace-pre-wrap` biztonságos szövegformázás).
- **IMAP Csatolmány Path Traversal Védelem (`src/utils/imap-service.ts`):**
  - Csatolmány fájlnevek tisztítása (`replace(/[^a-zA-Z0-9._-]/g, '_')` és `..` szekvenciák tiltása).
- **Middleware Védett Útvonalak Bővítése (`src/utils/supabase/middleware.ts` & `src/app/partners/page.tsx`):**
  - Bővítve a védett útvonalak köre: `/partners`, `/tasks`, `/settings`, `/security-policy`, `/documents`, `/hr`.
- **OAuth Callback Handler (`src/app/auth/callback/route.ts`):**
  - Megvalósítva a PKCE kódcsere (`exchangeCodeForSession`), nyílt átirányítás (Open Redirect) elleni védelemmel.
- **HTTP Biztonsági Fejlécek (`next.config.ts`):**
  - `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
- **Teljes Git Reverzibilitás:**
  - Valamennyi biztonsági javítás kizárólag a kód/alkalmazás rétegben valósult meg, távoli Supabase adatbázis mutáció nélkül.
- **Szabványos Jobb Oldali `TableToolbar` Integráció:**
  - Teljes vizuális és funkcionális összhang az eaisyDocs többi felületével (pl. Partnerek lista, Bejövő sor).
  - Bal oldalon: Valós idejű keresőmező (`Search` és gyors `X` törlő gombbal).
  - Jobb oldalon:
    - **Oszlopválasztó Popover (`Columns3` ikon):** Irány, Azonosító, Tárgy, Ügyirat, Dátum és Műveletek oszlopok dinamikus ki/bekapcsolása.
    - **Jobb oldali `Szűrés` Popover Gomb (aktív számláló badge-dzsel):**
      - Dátum tartomány szűrés (`Dátum tól` / `Dátum ig`).
      - Irat iránya szűrőcsoport (`Bejövő iratok`, `Kimenő iratok`).
      - Iktatási állapot szűrőcsoport (`Iktatott iratok`, `Iktatlan iratok`).
      - Biztonsági minősítés szűrőcsoport (`Nyílt`, `Belső`, `Bizalmas`, `Szigorúan bizalmas`).
      - "Szűrők törlése" gomb.
- **Gyors Megtekintés (Quick View):**
  - **Irat / Fájl Gyors Megtekintés:** Minden irat sorában dedikált Megtekintés (`Eye`) gomb:
    - Csatolt fájl esetén azonnal megnyitja a beépített `DocumentViewer`-t (biztonságos jogosultságellenőrzéssel és auditnaplózással).
    - Fájl nélküli irat esetén megnyit egy részletes Irat Adatlap gyorsbetekintő dialógust közvetlen iktatói navigációval.
  - **Ügyirat Gyors Betekintő:** Az iktatott iratoknál az "Ügyirat" oszlopban megjelenő diszkrét "Betekintés" gombra kattintva felugró modál mutatja az ügyirat iktatószámát, státuszát (`StatusBadge`), tárgyát, ügyszámát, iktatási dátumát, határidejét és irattári helyét, egykattintásos ugrással az iktatókönyvi nézetre (`/dossiers/[id]`).

### 🐛 Partner Adatlap Iratforgalom Hibajavítás (`src/app/partners/[id]/page.tsx`)
- **Hiba oka:** A partner részletes adatlapon az iratok lekérdezésében közvetlenül szerepelt az `irat.iktatoszam` oszlop (`.select("... iktatoszam ...")`). Mivel a relációs sémában az `iktatoszam` kizárólag az `ugyirat` táblán létezik (az `irat` táblán `erkeztetoszam`, `alszam` és `ugyirat_id` van), a PostgREST/Postgres `42703: column irat.iktatoszam does not exist` hibát dobott, emiatt a lekérdezés `null`-lal tért vissza.
- **Tünet:** A partner adatlapon 0 db iratforgalmat és üres listát mutatott a rendszer, miközben a partnerek listázásánál látszott a forgalom.
- **Megoldás és Továbbfejlesztés:**
  - A lekérdezés relációs összekapcsolással (`ugyirat:ugyirat_id (id, iktatoszam, ugy:ugy_id (targy))`) és az `alszam` bevonásával kéri le az iktatási adatokat.
  - A felületen a dokumentum azonosítója iktatott irat esetén automatikusan feloldja a teljes iktatószámot (`iktatoszam/alszam`), iktatlan irat esetén az `erkeztetoszam`-ot jeleníti meg.
  - Az "Ügyirat" oszlopban megjelenik az ügyirat valós iktatószáma (vagy "Iktatlan" badge), amely közvetlen hivatkozásként szolgál a dossier nézetre.
  - A "Csatolt Ügyek" fülön a kapcsolt iratok esetén is feloldásra került az `iktatoszam` és a közvetlen `/inbox/[id]` link.

### ⚖️ Konfigurálható Négyszem-elv (B10) & Rendszerbeállítások Tábla
- **Új `rendszer_beallitas` Adatbázis Tábla & Migráció (`supabase/migrations/20261002000001_configurable_four_eyes.sql`):**
  - Generikus kulcs-érték tábla JSONB struktúrával (`kulcs TEXT PK`, `ertek JSONB NOT NULL`, `leiras TEXT`).
  - Beültetett kulcs: `'negy_szem_elve_selejtezesnel'` (`{"kotelezo": true}` alapértelmezett értékkel).
  - PostgreSQL segédfüggvény: `is_negy_szem_elve_kotelezo()` SECURITY DEFINER jogosultsággal.
  - Frissített `selejtezes_csomag` UPDATE RLS szabály: `NOT public.is_negy_szem_elve_kotelezo() OR auth.uid() != javaslattevo_user_id`.
- **Rendszerbeállítás Segédmodul (`src/utils/system-settings.ts`):**
  - `getSystemSetting<T>()` és `isFourEyesDisposalRequired()` típusbiztos szerveroldali segédfüggvények.
- **Rendszergazda Beállítások Kezelőfelület (`settings-client.tsx`, `admin-actions.ts`):**
  - Új dedikált kártya a Rendszergazda fülön: **Selejtezési Szabályzat & Négyszem-elv (B10)**.
  - Váltókapcsoló (Switch) Sonner toast visszajelzéssel:
    - *Bekapcsolva (alapértelmezett / szigorú audit mód):* A felterjesztő munkatárs semmilyen szerepkörben nem hagyhatja jóvá a saját javaslatát.
    - *Kikapcsolva (egyfelhasználós / KKV / tesztelési mód):* A vezető vagy adminisztrátor saját felterjesztését is jóváhagyhatja egyetlen lépésben.
- **Irattár Kliensoldali Dinamikus Viselkedés (`archive-client.tsx`, `src/app/archive/page.tsx`):**
  - Ha a négyszem-elv fel van oldva (KKV mód), a rendszer **nem tiltja le a jelölőnégyzetet**, hanem smaragdzöld kísérő badge-dzsel jelzi: `Saját felterjesztés (Jóváhagyható)`.
  - A fejléc banner és a megerősítő modál dinamikusan adaptálódik a beállításhoz.
- **Audit Naplózás & Hivatalos Jegyzőkönyv Integritás (`disposal-actions.ts`, `disposal-protocol-pdf.ts`):**
  - Egyfelhasználós jóváhagyáskor az `esemeny_naplo`-ba bekerül a záradék: `(Egyfelhasználós jóváhagyás - a négyszem-elv feloldva a rendszerbeállítások alapján)`.
  - A PDF Selejtezési Jegyzőkönyv jogi nyilatkozata és aláírási sávja tanúsítja az egyfelhasználós eljárásrendet.
- **Kapcsolódó döntések:** ADR [A-028](../../architecture/decisions/A-028-configurable-four-eyes-disposal.md), PRD [P-042](../../product/decisions/P-042-configurable-four-eyes-disposal-ux.md), BRD [BRD-008](../../business/decisions/008-configurable-four-eyes-disposal-and-sme-mode.md).

### 🚪 Megújított Offboarding (Kiléptetés) Folyamat, Mt. Jogi Dokumentumgenerálás & Prémium HR Analytics UX
- **Globális KPI Stat Kártya Harmonizáció (Linear Flat Design) (`job-postings-list.tsx`, `hr/page.tsx`, `admin/page.tsx`, `admin/overview/page.tsx`, `employee-timesheet.tsx`):**
  - A korábbi elavult `border-l-4` vastag színes szegélyes kártyastílus teljes kivezetése a design rendszer elveinek megfelelően.
  - Egységesített, prémium Linear flat Onboarding / Offboarding kártyamodell bevezetése minden felületen:
    - Bal oldal: kisméretű uppercase felirat (`text-xs font-medium text-muted-foreground uppercase tracking-wider`) és nagy, tabular-nums érték (`text-2xl font-bold tracking-tight mt-1`).
    - Jobb oldal: kerekített finom ikon-konténer (`w-10 h-10 rounded-lg bg-... flex items-center justify-center shrink-0`).
    - Figyelmeztetések és teendők esetén finom átlátszó háttérszínezés (`bg-amber-500/5 border-amber-500/20`).
  - Átalakított nézetek: **Toborzás (Álláshirdetések)**, **Főoldal (Dolgozói önkiszolgáló)**, **HR Munkaasztal**, **Admin Áttekintés** és **Munkaidő-nyilvántartás (Timesheet)**.
- **Automatikus Supabase Auth Fiókletiltás & Jogosultságmegvonás (`actions.ts`):**
  - A kiléptetési folyamat lezárásakor (`closeOffboarding`) a rendszer a Supabase Admin API-n keresztül azonnal és automatikusan letiltja a távozó munkatárs Auth felhasználói fiókját (`ban_duration: '876000h'`), megelőzve az illetéktelen belépést vagy adatletöltést.
  - Azonnali szerepkör-megvonás az adatbázisban: `felhasznalo_profil.hr_szerepkor = 'inaktiv'`, valamint `hr_dolgozo_adatlap.munkaviszony_vege` rögzítése a jogszabályi kilépési dátummal.
  - Kiléptetés téves lezárása esetén az újranyitáskor (`reopenOffboarding`) a rendszer automatikusan feloldja a fióktiltást (`ban_duration: 'none'`), visszaállítja a `munkavallalo` szerepkört és törli a jogviszony vége záradékot.
- **Szervezet és Munkatársak Intelligens Állapotszűrés (`settings-employee-table.tsx`, `settings/page.tsx`):**
  - Munkajogi és nyugdíjtörvényi előírás (Mt. 80. §, 1997. évi LXXXI. tv.) miatt a volt dolgozók fizikai törlése (SQL DELETE) szigorúan tilos az 50 éves megőrzési idő alatt.
  - A Beállítások felületen új 3-állású szűrősáv: `Aktív munkatársak (X)` (alapértelmezett, letisztult nézet), `Kilépett / Archivált (Y)` és `Összes (Z)`.
  - A kártya fejléce kizárólag a valós aktív létszámot mutatja (`Munkatársak (X aktív fő)`).
  - Az archivált munkatársak sorában áthúzott név, lakat ikonnal ellátott `Kilépett (Fiók letiltva)` badge és a kilépés dátuma jelenik meg, az aktív munkatársak névsorát nem zavarva.
- **HR Vezetői Műszerfal Létszámszinkron (`admin/page.tsx`):**
  - Az aktív dolgozói létszám és bérköltség statisztikák kalkulációja automatikusan kiszűri a már kilépett vagy inaktivált munkavállalókat.
- **Teljes Modál Átalakítás (`OffboardingProfileModal.tsx`, `OffboardingCard.tsx`):**
  - Beágyazott, egymásra nyíló popoverek nélküli 5 paneles navigáció: `Teendők (Checklist)`, `Megszüntetés`, `Eszközök`, `T1041 Kijelentés`, `Kilépési Interjú`.
  - Szervezeti egység / felelős szerinti szűrőchipek: `HR`, `IT`, `Bérszámfejtés`, `Üzemeltetés`, `Vezető`.
  - Kontextuális funkciógombok a checklist feladatok mellett (`[ Megszüntetés előkészítése ]`, `[ Eszköz visszavétel & Jkv ]`, `[ NAV T1041 kijelentés ]`, `[ Kilépési interjú ]`), amelyek közvetlenül a megfelelő szakaszra navigálnak.
  - Fejléc avatarral, munkakörrel, részleggel (`Building2`), kilépési jogcímmel, élő előrehaladási sávval és biztonsági megerősítéses archiváló lezárással.
- **Munkaviszony Megszüntetési Megállapodás Generátor & eaisyDocs Iktatás (`termination-pdf-generator.ts`, `termination-panel.tsx`, `actions.ts`):**
  - Mt. 64–85. § szerinti jogszabályi megfelelőség valamennyi kilépési jogcímre: Közös megegyezés, Munkáltatói felmondás (30 napos Mt. 287. § keresetlevél jogorvoslati tájékoztatással), Munkavállalói felmondás, Azonnali hatályú felmondás próbaidő alatt, Rendkívüli felmondás.
  - Pénzügyi paraméterezés: felmentési idő munkanapokban, megváltandó szabadság napok száma, végkielégítés összege forintban, utolsó munkában töltött nap.
  - Puppeteerrel generált, céges pecséttel ellátott hivatalos A4 PDF.
  - Automatikus iktatás az eaisyDocs Személyi Dossziéba az `1.2 - Munkaviszony megszüntetés` tétel alá (**50 év megőrzési idővel**).
  - Automatikusan készre pipálja a megszüntetési checklist feladatot.
- **Eszköz Visszavételi és Vagyoni Leszámoló Lap & Leltári Mentesség (`asset-return-pdf-generator.ts`, `asset-return-panel.tsx`):**
  - Mt. 179. § és Mt. 80. § szerinti munkaügyi vagyoni elszámolás: tételes eszközlista a dolgozónak kiadott munkahelyi eszközökből (`hr_munkahelyi_eszkoz`) állapotminősítéssel (*Ép / Hibátlan*, *Rendeltetésszerűen kopott*, *Sérült / Hibás*, *Hiányzik*).
  - Sérülés vagy hiány esetén kártérítési összeg meghatározása és levonási záradék (Mt. 161. §).
  - Teljes vagyoni és eszközbeli tartozásmentességi záradék: végérvényesen megszünteti a munkavállaló leltári felelősségét.
  - Automatikus iktatás az eaisyDocs Személyi Dossziéba az `1.4 - Eszköz átadás-átvételi jegyzőkönyvek` tétel alá (**5 év megőrzési idővel**).
  - Automatikusan teljesítettnek jelöli az eszközök és belépőkártyák leadása feladatokat.
- **NAV T1041 Kijelentés & Nyugta Csatolás (`t1041-panel.tsx`, `t1041-actions.ts`):**
  - T1041 kijelentési mód támogatása (`initialType = "T"`) az offboarding folyamatban.
  - ÁNYK / ONYA egykattintásos másoló chipek, hatósági PDF adatlap és NAV befogadási nyugta feltöltési híd, amely teljesíti a hatósági kijelentési teendőt.
- **Új Prémium Kilépési HR Analytics & Fluktuációs Műszerfal (`exit-interview-summary.tsx`):**
  - A korábbi egyszerű lista helyett egy átfogó HCM műszerfal készült.
  - 4 Felső KPI Kártya: Összes lefolytatott interjú, Átlagos össz-elégedettség (1-5 csillag), eNPS ajánlási arány, Top távozási főok.
  - 4 Dimenziós Értékelési sávok: Vezetés és Menedzsment, Munkakörülmények, Előrelépési lehetőségek, Kompenzáció és juttatások.
  - Távozási mozgatórugók és új célállomások (karrier elágazások) százalékos megoszlása.
  - Kereshető és szűrhető szöveges idézetkártyák és részletes interjú-megtekintő modál.
- **Gazdagabb Kilépő Dolgozó Hozzáadási Dialógus (`AddOffboardingDialog.tsx`):**
  - Munkavállaló kiválasztása, távozás jogcíme, utolsó munkanap és jogviszony vége dátumok, valamint munkakör és részleg automatikus átemelése.
- **Adatbázis Migráció (`supabase/migrations/20261001000014_hr_offboarding_enhancements.sql`):**
  - `hr_offboarding` mezők: `megszunes_modja`, `indoklas`, `utolso_munkaban_toltott_nap`, `felmentesi_ido_nap`, `megvaltott_szabadsag_nap`, `vegkielegites_osszeg`, `reszleg`, `munkakor`, `szerzodes_pdf_url`, `eszkoz_elszamolas_pdf_url`, `t1041_nyugta_url`.
  - `hr_munkahelyi_eszkoz` és `hr_t1041_bejelentes` kapcsolata `offboarding_id`-val.
- **Törvényes Kilépő Igazolás & Átadás-Átvételi Nyugta Generátor (`exit-certificate-pdf-generator.ts`, `exit-certificate-panel.tsx`, `actions.ts`):**
  - Mt. 80. § (2) bek., Flt. 36/A. §, és az adózási-TB jogszabályok szerinti törvényes munkáltatói kilépő igazolás és átadás-átvételi nyugta generálása Puppeteerrel.
  - Tartalmazza a munkaviszony időtartamát, munkakört, FEOR-08 kódot, megszűnés jogcímét, adó- és TB azonosítókat, igénybe vett betegszabadság napokat (Mt. 126. §), kifizetett végkielégítést és a munkabérből történő letiltások/levonások jogszabályi nyilatkozatát.
  - Választható átadási mód (személyes átvétel munkavállalói aláírással vs. postai tértivevényes feladás ragszámmal és feladási dátummal).
  - Közvetlen in-browser PDF előnézet (`PdfViewerDialog`) és letöltés.
  - A generálás befejeztével a rendszer automatikusan készre jelöli a *"Törvényes kilépő igazolások kiadása (Mt. 80. §)"* feladatot, és a folyamat lezárásakor beiktatja a dokumentumot az eaisyDocs személyi dossziéba (`1.2 Munkaviszony`, 50 év megőrzés).
- **Döntési háttér:** [PRD P-040](../product/decisions/P-040-hr-offboarding-analytics-and-filing-revamp.md), [PRD P-041](../product/decisions/P-041-statutory-exit-certificate-and-handover-ux.md).

## [Unreleased] – Fejlesztés alatt (2026-10-01)

### 📑 Pre-Onboarding Munkaköri Leírás, NAV T1041 Hatósági Bejelentés & Mt. 46. § Tájékoztató UX
- **Hivatalos NAV T1041 Bejelentési Adatlap & ÁNYK / ONYA Segédlet (`t1041-pdf-generator.ts`, `t1041-actions.ts`, `t1041-panel.tsx`):**
  - Art. 22. § és Tbj. 40. § szerinti hivatalos A4 PDF bejelentő adatlap generálása Puppeteerrel (Új bejelentés `U`, Változás `V`, Törlés `T`).
  - ÁNYK 13-as pótlap és ONYA másoló segédlet: egykattintásos vágólapra másolási chipek (Adószám, Adóazonosító, TAJ, Jogviszony kód `1101`, Kezdete, FEOR kód `4121`, Heti óraszám).
  - Visszaigazoló NAV nyugta / igazolás PDF feltöltése közvetlenül az onboarding felületen, amely azonnal elvégzettnek jelöli a hatósági bejelentési feladatot.
  - Fiókaktiváláskor automatikus iktatás az eaisyDocs Személyi Dossziéba (`1.3 - Hatósági bejelentések`, 50 év megőrzési idő).
- **Hivatalos Munkaköri Leírás a Pre-Onboarding Szakaszban (`job-description-pdf-generator.ts`, `onboarding-job-actions.ts`, `job-description-panel.tsx`):**
  - Munkavállalói profil előtti (pre-onboarding) munkaköri leírás kezelés 3 rugalmas opcióval:
    1. *Központi Katalógus Verzió kiválasztása* a jóváhagyott munkaköri leírás sablonokból.
    2. *Dinamikus A4 PDF generálás* Mt. 45. § (4) szerinti kötelező feladatokkal, felelősségekkel, kompetenciákkal, FEOR számmal és iktatási pecséttel.
    3. *Aláírt / Egyedi PDF feltöltése*.
  - Fiókaktiváláskor automatikus iktatás az eaisyDocs Személyi Dossziéba (`1.1 - Munkaköri leírások`, 50 év megőrzési idő) és átkötés a létrejövő munkatársi profilra.
- **Mt. 46. § Munkáltatói Írásbeli Tájékoztató Generátor (`mt46-notice-generator.ts`, `employment-contract-panel.tsx`):**
  - Törvényi előírásoknak megfelelő kétoldalas A4 PDF írásbeli tájékoztató generálása az Mt. 46. § (1) bekezdés mind a 9 kötelező pontjával (munkaidő-beosztás, pihenőnapok, pótlékok, bérfizetés napja, felmondási idők, kollektív szerződés hiánya, NAV bejelentés helye).
  - Egykattintásos generálás és letöltés közvetlenül a munkaszerződés panelből.
- **Onboarding Felület Megújítása & Tiszta Fül Navigáció (`OnboardingProfileModal.tsx`):**
  - Töröltük a zavaró vízszintes oldalsávot/gombhúzót: helyette tiszta, áttekinthető beágyazott füles rendszer készült (`Teendők`, `Munkaszerződés`, `Munkaköri leírás`, `NAV T1041`, `Munkahelyi eszközök`, `Munkavédelmi oktatás`).
  - Fejlécben közvetlen navigációs gombok és állapotjelvények (Munkaszerződés, Munkaköri leírás, T1041), a teendőlistában pedig kontextuális ugrógombok találhatók a megfelelő fülre.
- **Adatbázis Migrációk:**
  - `supabase/migrations/20261001000012_hr_t1041_bejelentes.sql`: `hr_t1041_bejelentes` tábla, RLS házirendek és storage bucket házirendek.
  - `supabase/migrations/20261001000013_hr_onboarding_munkakor.sql`: `onboarding_id` oszlop a `hr_munkakori_leiras_dokumentum` és `hr_munkakor_leiras_verzio` táblákban, valamint RLS jogosultságok.
- **Döntési háttér:** [ADR A-027](../architecture/decisions/A-027-pre-onboarding-filing-and-t1041-bridge.md), [PRD P-039](../product/decisions/P-039-onboarding-t1041-job-description-and-mt46-ux.md).

### 🏢 Dinamikus Szervezeti Egység és Munkakör Katalógus Választó UX
- **eaisyHR Nyilvántartott Munkakörök és Szervezeti Egységek Integrációja (`job-org-actions.ts`, `job-org-selector.tsx`):**
  - Központi szerver action (`getJobsAndOrgUnitsAction`) a jóváhagyott `hr_szervezeti_egyseg` és `hr_munkakor` katalógustételek lekérdezésére.
  - Új univerzális, kétirányúan szinkronizált komponens (`JobOrgSelector`):
    - **Egység szerinti szűrés (Unit First):** Szervezeti egység (pl. `IT`, `HR`, `FCM`) kiválasztásakor a munkakör legördülő lista dinamikusan szűkül a részleghez kapcsolt munkakörökre.
    - **Munkakör alapú automatikus kitöltés (Job First / ATS):** Munkakör (pl. `Flottakezelő`) kiválasztásakor a rendszer azonnal és automatikusan beállítja a kapcsolódó szervezeti egységet (`FCM`).
    - **Fallback egyéni mód:** Megmaradt a szabad szöveges bevitel lehetősége ad-hoc munkakörök és egységek rögzítésére.
- **Toborzási (ATS) Pipeline Átadás (`recruitment/actions.ts`):**
  - Amikor egy jelölt felvételt nyer (`elfogadva` státusz), a munkakörhöz tartozó szervezeti egység (`hr_munkakor -> hr_szervezeti_egyseg.nev`) automatikusan lekeresésre kerül és elmentődik az újonnan induló `hr_onboarding` rekord `reszleg` mezőjébe.
- **Onboarding és Szerződéskötési Felületek Frissítése:**
  - `AddOnboardingDialog`: Közvetlen manuális felvételnél kötelezően a katalógusból választandó ki az egység és a munkakör.
  - `EmploymentContractPanel`: A munkaszerződés előkészítésekor a részleg és a munkakör dinamikusan választható és szinkronizálódik a szerződés és az onboarding rekordok között.
  - `OnboardingCard`, `OnboardingList`, `OnboardingProfileModal`: A munkatárs szervezeti egysége (`Building2` ikonnal) közvetlenül megjelenik a munkakör mellett (pl. `Flottakezelő • FCM`).
- **Adatbázis Migráció (`20261001000011_hr_munkaszerzodes_reszleg.sql`):**
  - `reszleg TEXT` oszlop hozzáadása a `hr_munkaszerzodes` táblához.
  - Létező Onboarding adatok retroaktív korrigálása (`Nagy Dániel` - `Flottakezelő` -> `FCM`).
- **Döntési háttér:** [PRD P-038](../product/decisions/P-038-onboarding-dynamic-job-and-org-unit-catalog-selector-ux.md).

### 📜 Onboarding Munkaszerződés Előkészítés, Generálás (Mt. 42–45. §) & Személyi Dosszié Iktatás UX
- **Hivatalos Mt. 42–45. § Munkaszerződés Generátor (`employment-contract-pdf-generator.ts`, `employment-contract-actions.ts`):**
  - Törvényi előírásoknak megfelelő, kétoldalú A4 PDF munkaszerződés előállítása Puppeteerrel.
  - Tartalmazza a kötelező tartalmi elemeket: munkakör, kezdőnap, szerződés jellege (határozatlan / határozott lejárattal), munkaidő (teljes 8 óra / részmunkaidő napi órákkal), bruttó havi alapbér (számmal és betűvel kiírva), próbaidő (max 3 hónap), munkavégzés helye és távmunka megállapodás.
  - Munkavállaló személyi és azonosító adatai: születési hely és idő, anyja neve, lakcím, adóazonosító jel, TAJ szám, bankszámlaszám.
  - Fejlécben vállalati adatok és eaisyDocs iktatási pecsét (`1.2 - Munkaviszony létesítése iratok`, kötelező 50 éves megőrzési idő az 1997. évi LXXXI. tv. alapján).
- **Kétlépcsős Pre-onboarding és Fiókaktiválási Életciklus:**
  - Amíg a belépő munkavállaló még nem rendelkezik éles felhasználói fiókkal, a szerződés PDF tervezetként előkészíthető és letárolható a folyamatban (letölthető, kinyomtatható a belépéskori fizikai aláíráshoz).
  - A kapcsolódó onboarding feladat (*„Munkaszerződés előkészítése & aláírása”*) a tervezet előállításakor **automatikusan készre (done) pipálódik**.
  - Amint a HR aktiválja a fiókot az Onboarding modálban, a rendszer a szerződésben szereplő adatokat (belépés dátuma, lakcím, születési adatok, anyja neve) szinkronizálja a dolgozói adatlapra, és a munkaszerződést **automatikusan beiktatja az újonnan megnyíló eaisyDocs Személyi Dossziéba** (`1.2` irattári tétel, 50 év megőrzés).
- **Beágyazott Fül az Onboarding Modálban (`OnboardingProfileModal.tsx`, `EmploymentContractPanel.tsx`):**
  - **Megszüntetett „popup a popupban”:** Negyedik egyenrangú fülként (`Munkaszerződés (Mt. 42. §)`) került integrálásra az Onboarding modálba.
  - Az onboarding teendőlistában a szerződéskötési feladat mellett elhelyezett **`[Szerződés előkészítése]`** gomb közvetlenül a beágyazott fülre vált át, visszagombbal a teendőkhöz.
  - Egységes akciókártya az eszközökhöz és munkavédelemhez hasonlóan: *Megtekintés*, *Letöltés*, *Aláírt példány feltöltése* (`UploadSignedDocumentDialog`), valamint aktív profil esetén *Iktatás*.
- **Adatbázis Migráció (`20261001000010_hr_munkaszerzodes.sql`):**
  - Dedikált tábla a munkaszerződés rekordok nyilvántartására, RLS szabályok HR és Admin hozzáféréssel.
- **Döntési háttér:** [PRD P-037](../product/decisions/P-037-onboarding-employment-contract-generator-and-filing-ux.md).

### 🦺 Munkavédelmi és Tűzvédelmi Oktatási Jegyzőkönyv (Mvt. 55. §, Ttv. 22. §) & Onboarding Iktatás UX
- **Hivatalos Oktatási Jegyzőkönyv Generátor (`safety-training-pdf-generator.ts`, `safety-training-actions.ts`):**
  - Puppeteer PDF generálás a munkavédelemről szóló 1993. évi XCIII. tv. (Mvt.) 55. § és a tűzvédelemről szóló 1996. évi XXXI. tv. (Ttv.) 22. § alapján.
  - Fejlécben vállalati adatok és eaisyDocs iktatási pecsét (`3.4 - Munkavédelmi iratok`, 10 év megőrzési idő).
  - 7 pontos szabványosított oktatási tematika (munkahelyi kockázatok, ergonómia 50/1999. EüM, baleset-elhárítás, tűzriadó és menekülés, kézi tűzoltó készülékek használata, villamos biztonság).
  - Munkavállalói kifejezett elismerő és felelősségvállalási nyilatkozat, oktatói és dolgozói aláírási blokk.
- **Kétlépcsős Pre-onboarding és Fiókaktiválási Életciklus:**
  - Amíg a belépő munkatárs fiókja nincs aktiválva, a jegyzőkönyv „Generálás (PDF)” gombbal előkészíthető és letárolható az onboarding folyamatban (letölthető, kinyomtatható a munkába állás napján történő aláíráshoz).
  - A kapcsolódó onboarding feladat (`Munkavédelmi és tűzvédelmi oktatás`) a jegyzőkönyv elkészültekor **automatikusan készre (done) pipálódik**.
  - Amint a HR aktiválja a fiókot, a rendszer az előkészített jegyzőkönyvet automatikusan beiktatja az újonnan megnyíló eaisyDocs Személyi Dossziéba.
- **Közvetlen UI Integráció és Beágyazott Fül Architektúra (`SafetyTrainingPanel.tsx`, `SafetyTrainingDialog.tsx`, `OnboardingProfileModal.tsx`, `MedicalTab.tsx`):**
  - **Megszüntetett modál a modálban ("popup a popupban"):** Az eszközátadási fülhöz hasonlóan a munkavédelmi oktatás közvetlen beágyazott fülként (`munkavedelem`) él az Onboarding profil modálban, tiszta füles navigációval (`Onboarding Teendők`, `Munkahelyi Eszközök`, `Munkavédelmi Oktatás`).
  - Az Onboarding profil modál fejlécében a `Munkavédelmi Jkv` gomb és a teendőlistában lévő `Oktatási jkv.` gomb közvetlenül a beágyazott fülre vált át, vissza gombbal a teendőkhöz.
  - A Munkavállalói adatlapon a *Megfelelőség & Egészségügy* (`MedicalTab`) fülön a `SafetyTrainingDialog` önálló párbeszédablakként nyitható meg, amely a közös `SafetyTrainingPanel` komponenst használja.
- **Adatbázis Migráció (`20261001000009_hr_munkavedelmi_oktatas.sql`):**
  - Dedikált tábla a munkavédelmi oktatások nyilvántartására, RLS szabályok Munkavédelmi felelős (`munkavedelmi`), HR és Admin hozzáféréssel.
- **Döntési háttér:** [PRD P-036](../product/decisions/P-036-occupational-safety-and-fire-training-protocol-ux.md).

### 💻 Munkahelyi Eszközök és Átadás-Átvételi Jegyzőkönyv (Mt. 179. §) & Beépített Onboarding Fül UX
- **Integrált Modál Fül Nézet (`OnboardingProfileModal.tsx`, `AssetHandoverPanel.tsx`):**
  - A korábbi zavaró, egymásba ágyazódó felugró ablakok ("popup a popupban") helyett az Onboarding profil modálban natív füles navigáció készült: `Onboarding Teendők` és `Munkahelyi Eszközök & Jkv (Mt. 179. §)`.
  - Tételes eszközkezelés (IT laptop/PC, telekommunikáció mobil/SIM, irodai kulcs/belépőkártya, gépkocsi, egyéb munkaeszköz) gyári számmal/IMEI-vel, tartozékokkal és fizikai állapottal.
  - Gyors sablon gombok: `+ Laptop`, `+ Telefon`, `+ Belépőkártya` azonnali 1-kattintásos felvitelhez.
- **Hivatalos Átadás-Átvételi Jegyzőkönyv és Iktatás (`asset-actions.ts`, `asset-handover-pdf-generator.ts`):**
  - Puppeteer PDF generálás az Mt. 179. § szerinti vétkességre tekintet nélküli leltár- és megőrzési felelősségvállalási záradékkal, felek adataival és visszaszolgáltatási kötelezettséggel.
  - **Pre-onboarding és Fiókaktiválási Iktatási Életciklus:** Amíg a belépő munkavállaló még nem rendelkezik éles fiókkal (`dolgozo_id` nincs aktiválva), a rendszer „Jegyzőkönyv generálása (PDF)” műveletként előkészíti és letárolja az iratot az onboarding folyamaton belül (letölthető, kinyomtatható a belépéskori fizikai aláíráshoz).
  - **Automatikus és Utólagos Iktatás:** Amint a HR rákattint a „Fiók aktiválása” gombra, a létrehozott dolgozói profilhoz és az újonnan megnyíló eaisyDocs Személyi Dossziéba az előkészített jegyzőkönyv automatikusan beiktatásra kerül (vagy az Eszközök fülön közvetlenül beiktatható). Ha a fiók eleve aktív, a generálás egy lépésben azonnal be is iktat.
  - Az onboarding folyamatban lévő eszközátadási feladat **automatikus készre pipálása** a jegyzőkönyv kiállításakor.
- **Döntési háttér:** [PRD P-035](../product/decisions/P-035-onboarding-manual-intake-and-asset-handover-ux.md).

### 🚀 Megújított Onboarding Folyamat, Kétlépcsős Fiókaktiválás és Közvetlen Beléptetés UX
- **Kétlépcsős Fiókaktiválás és Duplikációvédelem (`onboarding-list.tsx`, `onboarding-card.tsx`, `onboarding-profile-modal.tsx`):**
  - A toborzási kanbanból való átmozgatás szétválasztásra került: az azonnali auth fiók és e-mail helyett előkészületi onboarding rekord jön létre, megelőzve a duplikációkat.
  - A tényleges eaisyHR fiókaktiválást és üdvözlő e-mail kiküldést a HR indítja el az Onboarding profil modálból, amikor a belépés esedékessé válik.
  - Kétfülös navigáció: *Folyamatban lévő beléptetések* és *Lezárt beléptetések* különválasztása, beléptetés lezárása és újranyitása opciókkal.
  - Felső statisztikai KPI kártyák (aktív belépők, aktiválásra várók, hamarosan kezdők, átlagos haladás).
- **Közvetlen Manuális Beléptetés Sablonokkal (`add-onboarding-dialog.tsx`, `actions.ts`):**
  - `[+ Új beléptetés indítása]` gomb a fejlécben, amely toborzási hirdetés nélkül teszi lehetővé új munkatárs indítását (pl. belső kinevezések, vezetők, ajánlások).
  - Szerepkör-specifikus feladatsablonok: Általános irodai munkatárs, IT & Szoftverfejlesztő, Vezetői / C-Level, Fizikai / Operatív munkatárs.
- **Döntési háttér:** [PRD P-034](../product/decisions/P-034-onboarding-lifecycle-redesign-and-activation-ux.md).

### ✍️ Hivatalos HR Dokumentumok Aláírt Példányának Csatolása és Verziókezelése UX
- **Központi Aláírt Példány Kezelés a Hivatalos Dokumentumok Idővonalon (`page.tsx`, `UploadSignedDocumentDialog.tsx`):**
  - A *Munkaviszony & Szerződések* fül központi irat-idővonalán minden munkavállalói dokumentum közvetlen gombot kapott a beszkennelt, aláírt példány rögzítésére (`[Aláírt példány feltöltése]` ill. `[Aláírt példány cseréje]`).
  - Átlátható állapotjelzés: `Tervezet` (szürke) vs. `✓ Aláírt példány` (zöldesszürke / teal kiemelt jelvény), feltöltési dátumbélyegzővel.
  - Tágas, modern modális ablak drag & drop PDF/kép feltöltővel és fájlméret-ellenőrzéssel.
- **Automatikus eaisyDocs Verziókövetés és Archiválás (`uploadSignedDocumentAction`):**
  - Ha az irat már be volt iktatva, az aláírt példány új verzióként (`verzio: 2`, `[ALÁÍRT]` előtaggal és SHA-256 hash-sel) csatolódik a meglévő iktatószám alá az `irat_fajl` táblába.
  - Automatikus eseménynaplózás az eaisyDocs `esemeny_naplo` és `hr_esemeny_naplo` táblákban.
  - A megtekintés (`PdfViewerDialog`) és a közvetlen letöltés prioritásként azonnal a feltöltött aláírt változatot nyitja meg.
  - Szinkronizáció a kapcsolódó domain rekordokkal (`hr_tanulmanyi_szerzodes`, `hr_fegyelmi`, `hr_kituntetes`, `hr_orvosi_vizsgalat`).
- **Adatbázis Migráció (`20261001000006_hr_dokumentum_signed_copy.sql`):**
  - `hr_dokumentum` tábla bővítése: `alairt_fajl_url`, `alairva_ekor`, `alairas_statusz`, `alairo_neve` oszlopokkal és indexszel.
- **Döntési háttér:** [PRD P-033](../product/decisions/P-033-signed-document-copy-upload-and-versioning-ux.md).

### 🏆 Munkavállalói Kitüntetések, Szakmai Elismerések és Elismerő Oklevél UX
- **Önálló Elismerési Modul a Szakmai Háttér Fülön (`AwardsTab.tsx`):**
  - A korábbi gyakorlattal szakítva a kitüntetések és szakmai elismerések teljesen elválasztásra kerültek a fegyelmi ügyektől, és kiemelt, pozitív helyre kerültek a dolgozó *Szakmai Háttér* szekciójában.
  - 7 dedikált elismerési kategória (Vállalati Kiválósági Díj, Szakmai és Technológiai Innováció, Kiemelkedő Projekt Teljesítmény, Törzsgárda és Jubileum, Kiemelkedő Csapatmunka, Vezérigazgatói Dicséret, Egyéb Szakmai Elismerés).
  - Tágas modal (`sm:max-w-[700px]`) díj megnevezéssel, adományozó testülettel, opcionális pénzjutalom összeggel (Ft) és részletes hivatalos méltatással.
  - Opcionális: Már átadott / papíron aláírt díszoklevél szkennelt példányának feltöltése.
- **Reprezentatív Elismerő Oklevél PDF Generátor (`award-certificate-pdf-generator.ts`):**
  - Fekvő A4 formátumú, díszes arany és teal keretes oklevél a 'Cinzel' és 'Montserrat' betűcsaládokkal.
  - Fejlécben vállalati arculat és eaisyDocs iktatási pecsét (`Iktatószám: ...`, `Irattári tétel: 3.1 • eaisyDocs Személyi Dosszié`).
  - Központi méltatás, díjazott neve és munkaköre, adományozó aláírási és pecsétmezője.
- **In-Browser Megtekintés, Letöltés és eaisyDocs Iktatás (`/api/hr/award-pdf`, `fileKituntetesAction`):**
  - 👁️ **Megtekintés:** `PdfViewerDialog` segítségével közvetlen felugró megtekintő a böngészőben.
  - 📥 **Letöltés:** Közvetlen PDF letöltés.
  - 📁 **Iktatás:** Egykattintásos hivatalos iktatás a dolgozó eaisyDocs személyi dossziéjába (`3.1 - HR iratok`, 50 év megőrzési idő).
  - 🗑️ **Törlésvédelem:** Az iktatott elismerések törlése védett a levéltári szabályok szerint.
- **Adatbázis Migráció (`20261001000005_hr_kituntetes_modul.sql`):**
  - Új `public.hr_kituntetes` tábla RLS szabályokkal és idegen kulcsokkal (`hr_dolgozo_adatlap`, `hr_dokumentum`, `ugyirat`, `irat`).
- **Döntési háttér:** [PRD P-032](../product/decisions/P-032-awards-and-honors-lifecycle-ux.md).

### ⚖️ Munkáltatói Fegyelmi és Károkozási Határozatok (Mt. 56. §, 179. §) és eaisyDocs Iktatás UX
- **Letisztított Fegyelmi és Károkozási Modul (`DisciplinaryTab.tsx`):**
  - A *Bizalmas HR adatok* fülön kizárólag a jogi szankciók és kártérítési kötelezések maradtak meg, szigorúan HR-vezetőkre és auditorokra korlátozott jogosultsággal.
  - Kategóriák: Írásbeli Figyelmeztetés (Mt. 56. §), Írásbeli Megrovás (Mt. 56. §), Kártérítési Kötelezés (Mt. 179. §), Egyéb munkáltatói intézkedés.
  - Károkozás esetén a megfizetendő kárösszeg és munkabérből történő részletfizetési ütemezés rögzítése.
- **Törvényes Munkáltatói Határozat PDF Generátor (`disciplinary-pdf-generator.ts`):**
  - Alaki és tartalmi megfelelőség az Mt. szabályai szerint: I. Rendelkező rész, II. Tényállás és indoklás, III. Kötelező 30 napos bírósági jogorvoslati kioktatás (Mt. 285. § (1) bek.) a keresetindítás kártérítésre vonatkozó halasztó hatályának megjelölésével.
  - eaisyDocs iktatási fejléc és személyi dosszié besorolás (`3.1 - HR iratok`, megőrzési idő: 5 év az Mt. 286. § szerinti 3 éves általános elévülés figyelembevételével, szigorúan `bizalmas`).
- **In-Browser Megtekintés, Letöltés és eaisyDocs Iktatás (`/api/hr/disciplinary-pdf`, `fileDisciplinaryAction`):**
  - 👁️ Megtekintés inline `PdfViewerDialog` ablakban.
  - 📥 Letöltés PDF fájlként.
  - 📁 Iktatás a személyi dossziéba iktatószámmal és dosszié linkkel.
  - 🗑️ Törlésvédelem a hivatalosan beiktatott munkáltatói határozatokra.
- **Adatbázis Migráció (`20261001000004_hr_fegyelmi_filing.sql`):**
  - `hr_fegyelmi` tábla bővítése: `hatarozat_szam`, `kar_osszeg`, `reszletfizetes_leiras`, `jogorvoslat_hatarido`, `atvetel_datuma`, `dokumentum_id`, `fajl_url`, `iktatoszam`, `ugyirat_id`, `irat_id`.
- **Döntési háttér:** [PRD P-031](../product/decisions/P-031-disciplinary-and-damage-liability-lifecycle-ux.md).

### 🎓 Tanulmányi Szerződések Életciklusa, Mt. 229. § Megfelelőség és eaisyDocs Iktatás UX
- **Megújított Tanulmányi Szerződés Rögzítő Dialógus (`StudyContractTab.tsx`):**
  - Tágas, áttekinthető modális felület (`sm:max-w-[720px]`) logikailag csoportosított mezőkkel:
    - Képzés és intézmény adatai: képzés megnevezése, képző intézmény/egyetem megnevezése, képzés jellege/szintje.
    - Anyagi és munkajogi feltételek: támogatás összege (Ft), vállalt munkaviszony (hónapban, Mt. szerinti max 36 hónap), tanulmányok befejezése / szerződés lejárata.
    - Tanulmányi munkaidő-kedvezmény szöveges leírása (vizsganapok, mentesülés távolléti díjjal).
    - Mt. 229. § (5) bek. szerinti időarányos visszafizetési záradék jelölőnégyzete.
    - Opcionális: Mindkét fél által papíron aláírt és beszkennelt tanulmányi szerződés PDF csatolása.
- **Hivatalos Mt. 229. § Tanulmányi Szerződés PDF Generátor (`study-contract-pdf-generator.ts`):**
  - A4-es, nyomdai minőségű kétoldalú szerződés a Munkáltató és Munkavállaló adataival, Mt. 229. § preambulummal.
  - Részletezi a képzés adatait, a munkáltató anyagi támogatását és munkaidő-kedvezményét, a munkavállaló eredményes tanulmányi és munkaviszony-fenntartási kötelezettségét.
  - Szigorúan törvényi, időarányos visszafizetési és elszámolási záradék, cégszerű és munkavállalói aláírási blokk.
  - Megjeleníti a hivatalos eaisyDocs iktatási fejlécet és a `3.1 - HR iratok` irattári tételt.
- **In-Browser Megtekintés és Közvetlen Letöltés (`/api/hr/study-contract-pdf`):**
  - 👁️ **Megtekintés:** `PdfViewerDialog` komponens a szerződés azonnali felugró megtekintéséhez inline módban.
  - 📥 **Letöltés:** Közvetlen PDF letöltés.
- **eaisyDocs Személyi Dosszié Iktatás (`fileStudyContractAction`):**
  - Egykattintásos hivatalos iktatás az eaisyDocs munkavállalói személyi dossziéba (`HR/ÉÉÉÉ/SORSZÁM/ALSZÁM`).
  - `3.1 - HR iratok` kategória, 50 év megőrzési idő, szigorúan `bizalmas` minősítés.
  - Iktatás után zöld státuszjelvény (`Iktatva: HR/...`) közvetlen hivatkozással a személyi dossziéra.
  - 🗑️ **Törlésvédelem:** Az iktatott tanulmányi szerződés adatbázis és UI szinten védett, nem törölhető a munkaügyi rendszerből.
- **Adatbázis Migráció (`20261001000003_hr_tanulmanyi_szerzodes_filing.sql`):**
  - `hr_tanulmanyi_szerzodes` tábla bővítve: `intezmeny_neve`, `kepzes_szintje`, `munkaido_kedvezmeny`, `szerzodes_szam`, `dokumentum_id`, `fajl_url`, `iktatoszam`, `ugyirat_id`, `irat_id` oszlopokkal és indexekkel.
- **Döntési háttér:** [PRD P-030](../product/decisions/P-030-study-contract-lifecycle-and-filing-ux.md).

### ☕ Cafeteria Nyilatkozat In-Browser Megtekintés, Letöltés és eaisyDocs Iktatás UX
- **Közvetlen In-Browser Megtekintés (`PdfViewerDialog`):**
  - Mind a HR dolgozói adatlapon (`CafeteriaTab.tsx`), mind a dolgozói önkiszolgáló portálon (`CafeteriaDeclaration.tsx`) bevezetésre került a felugró, böngészőn belüli hivatalos PDF megtekintő (Eye ikon).
  - Az `/api/hr/cafeteria-pdf` végpont immár támogatja a `preview=true` (inline) és `download=true` (attachment) paramétereket.
- **Hivatalos Szja tv. 71. § szerinti Cafeteria Nyilatkozat Generátor (`cafeteria-pdf-generator.ts`):**
  - A4-es, nyomdai minőségű hivatalos dokumentum munkavállalói és céges adatokkal, keretgazdálkodási metrikákkal (300.000 Ft éves keret, felhasznált keret, kihasználtság %).
  - Részletes választási táblázat elemenként (SZÉP Kártya, Egészségpénztár, Helyi bérlet stb.), alkalmazott adó/költségszorzókkal és bruttó levonásokkal.
  - Törvényi munkavállalói jognyilatkozat és kétoldalú munkavállaló/munkáltató aláírási zóna.
- **eaisyDocs Személyi Dosszié Iktatás (`fileCafeteriaDeclarationAction`):**
  - Egykattintásos hivatalos iktatás a dolgozó eaisyDocs személyi dossziéjába (`HR/ÉÉÉÉ/SORSZÁM/ALSZÁM`).
  - `3.1 - HR és Munkaügyi iratok` besorolás 50 év megőrzési idővel, szigorúan `bizalmas` minősítéssel.
  - Iktatás után zöld státuszjelvény (`Iktatva: HR/...`) közvetlen hivatkozással a személyi dossziéra.
- **Levéltári Védelemmel Ellátott Újranyitás:**
  - Év közbeni módosítás esetén az újranyitási modál figyelmezteti a HR-est, hogy a korábban beiktatott példány megőrzött jogi archívum marad, és az új leadás új iktatási alszámot kap.
- **Adatbázis Migráció (`20261001000002_hr_cafeteria_filing.sql`):**
  - `hr_cafeteria_keret` kibővítése `dokumentum_id`, `fajl_url`, `iktatoszam`, `ugyirat_id`, `irat_id`, `lezaras_datuma` oszlopokkal és indexekkel.
- **Döntési háttér:** [PRD P-029](../product/decisions/P-029-cafeteria-declaration-filing-and-preview-ux.md).

### 🩺 Foglalkozás-egészségügyi Alkalmassági Vizsgálatok Dokumentumkezelése és Érvényesség UX
- **Érvényesség Számítási Hiba Javítása (`/hr/self-service/profile`):**
  - Kijavítva a korábbi anomália, ahol a múltbeli lejárati dátumok (pl. `2025. október 10.`) hibásan „Hamarosan lejár” figyelmeztetésként jelentek meg.
  - A rendszer immár szigorúan különválasztja a **Lejárt** (`diff < 0`, piros `text-destructive`, `bg-destructive/10`), **Hamarosan lejár** (`0 <= diff < 30 nap`, borostyán sárga), valamint **Érvényes** (`diff >= 30 nap`, zöld/diszkrét) státuszokat a profil fejléc chipjében és az alapadatok kártyán.
- **Hivatalos Lelet / Igazolás Csatolás (`MedicalTab.tsx`):**
  - Az új vizsgálat rögzítése modál kiegészült opcionális fájlfeltöltéssel (PDF vagy kép), kiadó orvos nevével és foglalkozás-egészségügyi szolgálat megnevezésével.
  - A feltöltött fájlok biztonságosan az `irat_files` Supabase storage vödörbe kerülnek, automatikus `hr_dokumentum` tétel kapcsolással.
- **33/1998. (VI. 24.) NM rendelet szerinti Hivatalos Alkalmassági Vélemény Generátor (`medical-sheet-pdf-generator.ts`):**
  - Amennyiben nincs feltöltött szakorvosi igazolás, a rendszer automatikusan kiállítja az A4-es, hivatalos „Elsőfokú Munkaköri Alkalmassági Vélemény” PDF-et a dolgozó személyes adataival, munkakörével, kockázati tényezőivel, orvosi döntésével és 15 napos jogorvoslati záradékával.
- **Közvetlen Megtekintés, Letöltés és eaisyDocs Személyi Dosszié Iktatás:**
  - 👁️ **Megtekintés:** In-browser PDF előnézet `PdfViewerDialog` komponenssel az `/api/hr/medical-pdf` végponton keresztül (mind a feltöltött leletekre, mind a generált véleményekre).
  - 📥 **Letöltés:** Közvetlen PDF letöltés.
  - 📁 **Iktatás eaisyDocs-ba (`fileMedicalExaminationAction`):** Hivatalos személyi dosszié iktatás `HR/...` gap-mentes iktatószámmal, `3.1 - HR és Munkaügyi iratok` (50 év megőrzés, Mt. 134. §), szigorúan `bizalmas` minősítéssel (GDPR 9. cikk).
  - 🗑️ **Törlésvédelem:** Az iktatott orvosi iratok levéltári védelem alatt állnak, a törlés inaktívvá válik magyarázó tooltip-pel.
- **Adatbázis Migráció (`20261001000001_hr_orvosi_vizsgalat_filing.sql`):** `hr_orvosi_vizsgalat` bővítése `dokumentum_id`, `fajl_url`, `iktatoszam`, `ugyirat_id`, `irat_id`, `orvos_neve`, `szakrendeles` mezőkkel és indexekkel.
- **Döntési háttér:** [PRD P-028](../product/decisions/P-028-occupational-health-examination-filing-and-validity-ux.md).

### 🏖️ Hivatalos Éves Szabadság Nyilvántartó Lap (Mt. 134. §) és Távolléti Igazolások
- **Dolgozói Portál Megtekintés & Letöltés (`LeaveHistoryList`):** A korábbi letöltő `Igazolás` gomb helyett külön **Megtekintés** (`PdfViewerDialog` beágyazott PDF előnézettel) és **Letöltés** gomb került bevezetésre.
- **Központi HR Távollét Fül (`LeaveTab.tsx`):**
  - A korábbi puszta táblázat kibővült soronkénti **Megtekintés** és **Letöltés** gombokkal minden jóváhagyott távollétnél.
  - **Hivatalos Éves Szabadság-nyilvántartó Lap (Mt. 134. §):** Gomb a tárgyévi nyomtatvány megnyitására, letöltésére és közvetlen beiktatására a dolgozó eaisyDocs személyi dossziéjába (`HR/ÉÉÉÉ/SORSZÁM/ALSZÁM`).
- **Mt. szerinti Törvényes Keretlevezetés (`leave-calculator.ts`):** `getAnnualLeaveBreakdown` és `calculateAnnualLeave` a születési év (életkori pótszabadság Mt. 117. §), gyermekek száma (Mt. 118. §) és megváltozott munkaképesség (Mt. 120. §) alapján automatikusan részletezi a törvényes keretet az A4-es hivatalos nyomtatványban.
- **Tárgyévi Távolléti Napló & Egyenlegzárás:** Kronologikus táblázat munkanap-számítással és aláírási záradékkal.
- **Döntési háttér:** [PRD P-027](../product/decisions/P-027-annual-leave-sheet-and-leave-certificates-ux.md).

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

