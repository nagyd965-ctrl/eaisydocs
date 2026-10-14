# eaisyDocs – Fejlesztési Feladatlista és Backlog (Task List)

Ez a nyilvántartás az [`eaisydocs_fejlesztesi_javaslatok.md`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/docs/tasklist.md) javaslatcsomag alapján készült.
A listát **minden elvégzett feladat után frissítjük**, követve az állapotokat (`[x]` Kész, `[/]` Folyamatban, `[ ]` Várakozik).

---

## 🚀 1. Már Elvégzett Feladatok (Done)

- [x] **HR-TASK-06: Foglalkoztatottak Importálása eaisyBooks Bérszámfejtésből az eaisyHR-be**
  - Adatbázis: `public.felhasznalo_profil` és `public.hr_dolgozo_adatlap` bővítve `eaisybill_employee_id UUID` mezővel és indexekkel a duplikációmentes átvételhez.
  - Szerver akciók: `getEaisyBooksPayrollEmployeesAction(companyId)` és `importEaisyBooksPayrollEmployeesAction(input)` az aktív cég bérszámfejtési dolgozóinak (`accounty_employees` és `accounty_employments`) átemeléséhez. Automatikus munkakör (`hr_munkakor`) feloldás/létrehozás FEOR kóddal, jogviszony (`hr_jogviszony`) és beosztás (`hr_beosztas`) nyitás, titkosított `BYTEA` adatmentés (`hr_dolgozo_titkos_adat`: TAJ, adójel, bankszámla, alapbér) és Brevo aktivációs e-mail küldés jelszóbeállító linkkel.
  - UI: HR Munkaasztalon (`/hr/admin`) az „Új Dolgozó Felvétele” mellett letisztult „Importálás eaisyBooks-ból” gomb, interaktív varázsló párbeszédablak (`EaisyBooksEmployeeImportDialog`) gyorskeresővel, szerkeszthető e-mail beviteli lehetőséggel és meghívó küldési jelölőnégyzettel.
  - Dokumentáció: [ADR A-063](architecture/decisions/A-063-eaisybooks-payroll-employee-import-architecture.md), [PRD P-082](product/decisions/P-082-eaisybooks-payroll-employee-import-ux.md).
- [x] **DOC-TASK-04: eaisyBill Cégalapú Tagok és Munkatársak Szelektív Importja és Meghívása**
  - Adatbázis: `public.felhasznalo_profil` bővítve `email`, `eaisybill_user_id`, `sync_source`, `last_synced_at` mezőkkel, automatikus e-mail szinkron triggerrel.
  - Szerver akciók: `getEaisyBillCompanyMembersAction(companyId)`, `importEaisyBillCompanyMembersAction(companyId, selectedMembers)` kizárólag a bepipált tételek átvételével, meghívó link generálással (`generateLink`) és Brevo e-mail küldéssel.
  - UI: Beállítások (`/settings`) Cég fül Tagok kártyán új „Importálás eaisyBill-ből” gomb, szelektív varázsló modál (`EaisyBillMemberImportDialog`) állapotjelvényekkel és iratkezelési szerepkör választóval.
  - Dokumentáció: [ADR A-060](architecture/decisions/A-060-eaisybill-company-member-sync-and-invite.md), [PRD P-079](product/decisions/P-079-eaisybill-company-member-sync-and-invite-ux.md).
- [x] **Cég Törlése és Jogosultság-biztonsági Megerősítő Dialógus**
  - Jogosultság: szigorúan csak a cég tulajdonosa (`owner`) vagy globális rendszergazda törölhet vállalatot.
  - Szerver akció: `deleteCompanyAction(companyId)` RLS ellenőrzéssel, PostgreSQL kaszkádolt törléssel (`ON DELETE CASCADE`), aktív cég törlése esetén intelligens kontextus- és cookie-váltással a következő elérhető cégre.
  - UI: Beállítások (`/settings`) Cég fülén „Cég törlése” gomb az aktív szerkesztőkártyán, valamint diszkrét törlés ikon az „Összes elérhető cégem” táblázatban, kanonikus `AlertDialog` figyelmeztetéssel.
  - Dokumentáció: [ADR A-059](architecture/decisions/A-059-company-deletion-and-cascade-lifecycle.md), [PRD P-078](product/decisions/P-078-company-deletion-and-management-ux.md).
- [x] **eaisyBill Vállalat-import és Cégalapú Dinamikus Számlaszinkronizáció**
  - Adatbázis: `public.companies.eaisybill_company_id` oszlop és egyedi parciális index.
  - Szerver akciók: `getEaisyBillCompaniesAction()`, `importEaisyBillCompanyAction(eaisybillCompanyId)` RLS tagság és automatikus cégváltás támogatással.
  - UI: Cégválasztó modál 3. füle („eaisyBill import”) instant keresővel, kártyás listával, „Cég importálása” vagy „Már importálva – Váltás” gombokkal, plusz közvetlen menüpont a lenyílóban.
  - Bejövő sor (`/inbox`): szigorúan az aktív cég `eaisybill_company_id`-jához tartozó számlák lekérése, hardkódolt környezeti változó nélkül, intelligens automatikus összerendeléssel.
  - Dokumentáció: [ADR A-058](architecture/decisions/A-058-eaisybill-company-import-and-sync.md), [PRD P-077](product/decisions/P-077-company-selector-eaisybill-import-tab.md).
- [x] **A1: Route-szintű Hiba- és „Nem található” oldalak**
  - `error.tsx`, `not-found.tsx`, `global-error.tsx` magyarul, hibakóddal (`digest`), „Újrapróbálás” (`unstable_retry`) gombbal.
  - Moduláris szétválasztás: eaisyHR alatt a visszalépés az eaisyHR főoldalra mutat (`error-navigation.ts`).
  - Dokumentáció: [ADR A-057](architecture/decisions/A-057-route-error-boundaries-and-loading-skeleton-conventions.md), [PRD P-076](product/decisions/P-076-error-not-found-and-loading-states-ux.md).
- [x] **A2: Betöltési Állapotok és Skeleton-ek**
  - Új skeletonok: `DashboardSkeleton`, `DetailSkeleton`, `SplitViewSkeleton`.
  - Hiányzó `loading.tsx`-ek pótlása (`/` Vezérlőpult a `(dashboard)` route group-ban, `/dossiers/[id]`, `/partners/[id]`, `/inbox/[id]`, `/rules`, `/settings`).
  - Layout-ugrás nélküli `ContentSkeleton padded` támogatás.
- [x] **Biztonság: Beégetett Adatbázis Jelszavak Teljes Kigyomlálása**
  - 8 scriptből eltávolítva a kódolt jelszó (`backup-db.ts`, `verify-multitenancy.ts`, `check-columns.ts`, `check-policies.ts`, `ensure-share-token-column.ts`, `run-migration.mjs`, `test_db.js`, `apply_rpc.js`).
  - Mostantól minden script szigorúan a `.env.local` fájlból veszi a `process.env.DATABASE_URL`-t.

---

## 🟢 2. Könnyen és Gyorsan Megvalósítható Feladatok (Quick Wins – 1-2 nap / feladat)

Ezek a funkciók minimális kockázattal járnak, nem igénylik a meglévő adatbázis felforgatását, de azonnal látványos minőségbeli ugrást adnak a napi használatban:

- [ ] **A3: Oldalsáv (Sidebar) dinamikus számláló jelvények (Badges)**
  - *Mit csinál:* A bal oldali menüben megjelenik a releváns teendők darabszáma kis diszkrét számként:
    - **Bejövő:** iktatásra váró iratok száma (pl. `3`)
    - **Feladatok:** saját lejáró / mai határidős feladatok száma (pl. `2`)
    - **Irattár:** jóváhagyásra váró selejtezések száma (csak archivátor / vezető szerepkörben)
  - *Miért könnyű:* A lekérdezések a Dashboardon már léteznek, csak át kell adni a `SidebarNav` komponensnek.
- [ ] **A4: Konzisztens Breadcrumb + Gyors Visszalépés az adatlapokon**
  - *Mit csinál:* A részletező oldalak tetején (`/dossiers/[id]`, `/partners/[id]`, `/inbox/[id]`) megjelenik az útvonal (pl. *Iktatókönyv / SZERZ-2026-00012*), így egyetlen kattintással visszajuthat a felhasználó a szűrt listához anélkül, hogy a böngésző „Vissza” gombjára kellene támaszkodnia.
  - *Miért könnyű:* A `src/components/ui/breadcrumb.tsx` már létezik a projektben, csak be kell kötni a fejlécekbe.
- [ ] **A6: Egységesített Üres Állapot komponens (`EmptyState`)**
  - *Mit csinál:* Ha egy táblázat vagy fül üres (pl. nincs találat a keresésre, nincsenek csatolt iratok, nincs még feladat), mindenhol ugyanaz a letisztult elrendezés jelenik meg (rövid cím, 1 mondatos magyarázat és egy elsődleges akciógomb pl. „Szűrők törlése” vagy „+ Új hozzáadása”).
  - *Miért könnyű:* Egyetlen 40 soros újrahasznosítható komponens, amit az összes táblázat `empty` ágába beillesztünk.
- [ ] **A7: Beépített Szószedet Tooltipek a szakmai kifejezésekhez**
  - *Mit csinál:* Diszkrét pontozott aláhúzás és magyarázó hover tooltip a nem egyértelmű iratkezelési kifejezések mellett (pl. *„Érkeztetés vs. Iktatás”*, *„Levéltári átadás”*, *„Minősítés”*, *„Selejtezési 4-szem jóváhagyás”*).
  - *Miért könnyű:* A shadcn `Tooltip` komponenssel lokálisan, adatbázis-módosítás nélkül megvalósítható.
- [ ] **B1: Duplikátum-figyelmeztetés a bejövő iktatáskor**
  - *Mit csinál:* Ha a beérkezett fájl SHA-256 hash-e vagy azonos partnertől érkező azonos tárgyú levél már iktatva van a rendszerben, az iktatási panel tetején diszkrét figyelmeztető sáv jelenik meg: *„Figyelem: Ezzel a tartalommal már létezik iktatott irat: [IKT-2026/00045]”*.
  - *Miért könnyű:* A fájl SHA-256 hash-ét a rendszer már most kiszámolja a feltöltéskor, csak egy létezést ellenőrző select lekérdezés kell.
- [ ] **B2: Jogi visszatartás (Legal Hold) kapcsoló az ügyirat adatlapon**
  - *Mit csinál:* Egy egykattintásos kapcsoló az ügyirat adatlapon: ha egy ügyirat per vagy vizsgálat tárgya, zárolható a selejtezés alól, így a megőrzési idő lejárta után sem kerülhet be a selejtezési javaslatba.
  - *Miért könnyű:* Egyetlen boolean oszlop (`legal_hold`) + kapcsoló a felületen.
- [ ] **B3: Aktív Szerződések áttekintő blokk a Partner 360° nézeten**
  - *Mit csinál:* A partner adatlapon egy külön összefoglaló kártya listázza a partnerhez kapcsolódó érvényes szerződéseket és azok lejárati idejét.
  - *Miért könnyű:* A partner iratai már most le vannak kérve az oldalon, csak egy szűrt nézetet kell nekik adni.

---

## 🟡 3. Közepes Összetettségű Feladatok (Medium – 3-7 nap / feladat)

- [ ] **A8: Szerveroldali lapozás, keresés és szűrés a fő listákon**
  - *Mit csinál:* Iktatókönyv (`/dossiers`), Bejövő sor (`/inbox`), Partnerek (`/partners`) és Irattár (`/archive`) átállítása `use-url-list-state` alapú szerveroldali lapozásra (25/50/100 elem), SQL szintű keresésre és szűrésre.
  - *Függőség:* Additív SQL migráció (`iktatokonyv_lista` és `partner_lista` biztonsági invoker nézetek).
- [ ] **A9: Tömeges műveletek (Bulk Actions) a táblázatokban**
  - *Mit csinál:* Jelölőnégyzetes sor-kijelölés + alul felbukkanó lebegő akciósáv:
    - Tömeges felelős-hozzárendelés
    - Tömeges címkézés / kategóriaváltás
    - Tömeges irattárba helyezés
    - Kijelöltek exportálása Excel/CSV formátumban
- [ ] **A10: Mentett nézetek / szűrők a `TableToolbar`-ban**
  - *Mit csinál:* A felhasználó elmentheti a gyakran használt szűrőkombinációkat névvel (pl. *„Saját nyitott szerződéseim”*, *„Múlt heti bejövők”*), és egy kattintással előhívhatja.
- [ ] **A11: Ügyirat Életciklus-léptető (Stepper)**
  - *Mit csinál:* Vizuális, lineáris folyamatjelző sáv az ügyirat fejlécében:  
    `Érkeztetve` ➔ `Iktatva` ➔ `Ügyintézés alatt` ➔ `Lezárva` ➔ `Irattárban`
- [ ] **A12 & A13: Gyorsbillentyűk és Kibővített Parancspaletta (`Ctrl+K`)**
  - *Mit csinál:* Billentyűzetes gyorsnavigáció (`j`/`k` listában, `Enter` megnyitás) és parancsok a `Ctrl+K` menüben (*„Új ügyirat készítése”*, *„Új válaszlevél”*, *„Ugrás: Lejáró feladataim”*).
- [ ] **B4: Ügytípus-sablonok iktatáskor**
  - *Mit csinál:* Előre definiált sablonok kiválasztása iktatáskor (pl. *„Szállítói szerződés”*, *„Hatósági megkeresés”*), amely automatikusan kitölti a határidőt, irattári tételszámot és legenerálja az alapértelmezett feladatokat.
- [ ] **B5: Késedelmes fizikai iratkölcsönzés automatikus emlékeztető**
  - *Mit csinál:* Ha a kikölcsönzött fizikai irat határideje lejárt, automatikus feladat vagy értesítés generálódik a kölcsönvevőnek és az irattárosnak.

---

## 🔴 4. Nagyobb és Stratégiai Modulok (Strategic / New Modules)

- [ ] **C1: Teljes Szerződéskezelési Modul (CLM)**
  - Szerződésnyilvántartás, automatikus lejárati/felmondási értesítők, verziókövetés, kötelezettségek menedzsmentje.
- [ ] **C2: Jóváhagyási és Aláírási Munkafolyamat Lánc (Approval Workflows)**
  - Párhuzamos és sorrendi jóváhagyási lánc kimenő levelekre, szerződésekre és selejtezésekre.
- [ ] **C3: GDPR és Megfelelőségi Központ**
  - Érintetti joggyakorlási kérelmek (törlés/betekintés), automatizált határidő-számítás, PDF anonimizálás (redaction).
- [ ] **C4: Cégkapu / Hivatali Kapu Integráció**
  - Hivatalos állami küldemények automatikus fogadása és feladása hiteles tértivevénnyel.
- [ ] **C5: Minősített Időbélyegzés (RFC 3161) és Hiteles Archiválás**
  - PDF/A formátumú iratok minősített időbélyegző szolgáltatóhoz kötése a jogszabályi megfelelőséghez.
- [ ] **C6: Kimenő Webhook és REST API Integrációs Központ**
  - Külső rendszerek (ERP, CRM) valós idejű értesítése iratkezelési eseményekről (`irat.erkezetve`, `ugyirat.lezarva`).

---

## 📌 Hogyan frissítjük ezt a fájlt?
Amikor egy fejlesztési ciklusban egy feladat elkészül:
1. Az adott pont előtti `[ ]` jelölőt átírjuk `[x]`-re.
2. A feladatot átmozgatjuk vagy kiegészítjük az elkészült commit / ADR / PRD hivatkozásával.
3. Futtatjuk a dokumentáció-szinkronizálást (`npx tsx scripts/doc-sync.ts`).
