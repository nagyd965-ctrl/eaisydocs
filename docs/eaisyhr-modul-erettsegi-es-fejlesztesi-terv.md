# [HR] eaisyHR Modul-Érettségi Audit és Kritikus Fejlesztési Feladatlista

> **Dokumentum státusz:** Aktív modul-audit és fejlesztési terv (7 / 30 feladat elvégezve, 23 nyitott)
> **Létrehozva:** 2026. október 28.
> **Hatókör:** `[HR]` és `[Közös]` (5 főcsoport, 20 almodul + 16 füles 360°-os dolgozói karton)
> **Átlagos rendszer-érettség:** **79%** (európai enterprise HRIS benchmark: Personio, HiBob, BambooHR, Lattice, Nexon)
> **Módszertan:** Pontról pontra történő javítás és modulfejlesztés. Amint egy feladat elkészül és típusellenőrzéssel (`npx tsc --noEmit`) igazolt, a nyitott listából átkerül az **Elkészült és Lezárt Feladatok** blokkba `[x]` jelöléssel és áthúzással (`~~...~~`).

---

## ELKÉSZÜLT ÉS LEZÁRT FELADATOK (7 / 30)

- [x] ~~**1. Szerveroldali RBAC és Multi-Tenant (`company_id`) védelem pótlása a HR Server Action-ökben**~~
  - **Érintett fájlok:** [`src/app/hr/reports/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/reports/actions.ts), [`src/app/hr/payroll/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/payroll/actions.ts), [`src/app/hr/offboarding/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/offboarding/actions.ts), [`src/app/hr/admin/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/admin/actions.ts), [`src/app/hr/orgunit/[id]/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/orgunit/%5Bid%5D/actions.ts), [`src/app/hr/actions/idp-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/actions/idp-actions.ts), [`src/app/hr/onboarding/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/onboarding/actions.ts)
  - **Megvalósítás:** Minden `SUPABASE_SERVICE_ROLE_KEY`-t használó admin/HR végpontra bekerült a központi `requireHrAuthServer` szerepkör- és cégkontextus-ellenőrzés (`admin/actions.ts`, `orgunit/[id]/actions.ts`, `idp-actions.ts`, `payroll/actions.ts`, `reports/actions.ts`, `offboarding/actions.ts`), az `onboarding/actions.ts`-ben pedig javításra került a `getActiveCompanyMemberRolesServer()` paraméterezése, továbbá a `reopenOnboarding` és `deleteOnboarding` is szerepkör-védelmet kapott.

- [x] ~~**3. Ebédszünet adatbázis-perzisztencia és „Munkaidő folytatása” óraszámítás javítása (`/hr`)**~~
  - **Érintett fájlok:** [`supabase/migrations/20261028000001_add_break_tracking_to_hr_jelenlet.sql`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/supabase/migrations/20261028000001_add_break_tracking_to_hr_jelenlet.sql), [`src/app/hr/self-service/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/actions.ts), [`src/components/hr/time-tracking-card.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/time-tracking-card.tsx), [`src/app/hr/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/page.tsx), [`src/app/hr/attendance-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/attendance-actions.ts), [`src/components/hr/employee-timesheet.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-timesheet.tsx), [`src/utils/hr/timesheet-calculator.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/timesheet-calculator.ts), [`src/utils/hr/timesheet-pdf-generator.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/timesheet-pdf-generator.ts), [`src/app/hr/payroll/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/payroll/actions.ts), [`src/app/hr/reports/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/reports/actions.ts)
  - **Megvalósítás:** A `hr_jelenlet` tábla bővült a `szunet_perc`, `szunet_ms` és `szunet_kezdete` oszlopokkal. Az ebédszünet indítása és lezárása (`toggleBreak`) közvetlenül az adatbázisba mentődik, kicsekkolás utáni „Munka folytatása” esetén a kieső köztes idő (`checkoutGapMs`) automatikusan szünetként rögzül, és a jelenléti ív, a havi jelenléti PDF, a bérszámfejtés, valamint a KSH riport egyaránt levonja a szünetidőt a ledolgozott órákból.

- [x] ~~**Architektúra Modernizáció: 3 Alapszerepkör (`Munkavállaló`, `Vezető`, `Admin`) + Vállalati Modul-hozzáférési Mátrix a Szervezeti Felépítés 4. füleként (`/hr/organization?tab=permissions`)**~~
  - **Érintett fájlok:** [`supabase/migrations/20261028000002_hr_simplified_roles_and_module_permissions.sql`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/supabase/migrations/20261028000002_hr_simplified_roles_and_module_permissions.sql), [`src/utils/hr/company-role-resolver.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/company-role-resolver.ts), [`src/utils/company-server.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/company-server.ts), [`src/utils/hr/hr-auth-guard.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/hr-auth-guard.ts), [`src/components/hr-sidebar.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr-sidebar.tsx), [`src/app/hr/organization/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/organization/page.tsx), [`src/components/hr/organization-tabs-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/organization-tabs-view.tsx), [`src/components/hr/permissions-matrix-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/permissions-matrix-view.tsx), [`src/app/hr/permissions/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/permissions/actions.ts), [`src/app/hr/permissions/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/permissions/page.tsx), [`src/components/hr/add-employee-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/add-employee-dialog.tsx), [`src/components/hr/employee-edit-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-edit-dialog.tsx), [`src/components/hr/employee-table.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-table.tsx)
  - **Megvalósítás:** A korábbi 10 szerepkörös lista helyett 3 tiszta alapszerepkör (`munkavallalo`, `vezeto`, `admin`) maradt a dolgozó felvételi és szerkesztési űrlapokon, kiegészítve a **Szervezeti Felépítés** (`/hr/organization`) 4. füleként (`Jogosultságkezelő` — `/hr/organization?tab=permissions`) megjelenő, **kizárólag `admin` szerepkörrel látható és szerkeszthető** Jogosultságkezelő Mátrixszal, ahol dolgozónként 1 kattintással ki-be kapcsolható a 10 szakmai HR modul (`admin`, `organization`, `time`, `payroll`, `compliance`, `reports`, `recruitment`, `onboarding`, `offboarding`, `audit`).

- [x] ~~**4. Szabadságigénylés (`submitLeaveRequest`) éves keret-ellenőrzés és ünnepnap-levonás pótlása**~~
  - **Érintett fájlok:** [`src/utils/hr/leave-calculator.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/leave-calculator.ts), [`src/app/hr/self-service/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/actions.ts), [`src/components/hr/leave-request-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/leave-request-dialog.tsx), [`supabase/migrations/20261028000003_add_munkanapok_szama_to_hr_tavollet.sql`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/supabase/migrations/20261028000003_add_munkanapok_szama_to_hr_tavollet.sql)
  - **Megvalósítás:** A `calculateWorkingDays` kiegészült a magyar munkaszüneti napok (`athelye_munkanap = false`) és az áthelyezett szombati munkanapok (`athelye_munkanap = true`) kezelésével. A `submitLeaveRequest` és a `LeaveRequestDialog` ellenőrzi a maradék éves szabadságkeretet (`calculateAnnualLeave`), tiltja a 0 munkanapos vagy kerettúllépéses kérelmek beküldését, és rögzíti a `munkanapok_szama` értéket.

- [x] ~~**5. Csapatnaptár (`/hr/time`) elutasított szabadságok kiszűrése és Túlóra Compliance kilépett dolgozók szűrése**~~
  - **Érintett fájlok:** [`src/components/hr/team-calendar.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/team-calendar.tsx), [`src/app/hr/time/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/time/page.tsx), [`src/app/hr/compliance/compliance-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/compliance/compliance-actions.ts)
  - **Megvalósítás:** A `TeamCalendar` `isLeaveActive` függvénye és a `/hr/time/page.tsx` kiszűri az `elutasitva` és `visszavonva` státuszú távolléteket, valamint a `/hr/time` és a `getCompanyOvertimeComplianceData` egyaránt kiszűri a már kilépett (`kilepes_datuma < todayStr`) dolgozókat.

- [x] ~~**6. Bérszámfejtés (`/hr/payroll` & `/hr/self-service/payroll`) számítási hibák (FTE, SZÉP-kártya adózás, bruttó bontás) javítása**~~
  - **Érintett fájlok:** [`src/utils/hr/payslip-calculator.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/payslip-calculator.ts), [`src/app/hr/payroll/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/payroll/actions.ts), [`src/app/hr/self-service/payroll/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/payroll/actions.ts), [`src/components/hr/my-payslips-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/my-payslips-view.tsx)
  - **Megvalósítás:** A `calculatePayslipDetails` és a `getPayrollDashboardData` figyelembe veszi a `munkaido_fte` részmunkaidő-arányt, a SZÉP-kártya juttatást (`cafeteriaBrutto`) leválasztja az egyéni SZJA/TB levonásokról (28% munkáltatói közteherrel számolva), a szabadságos és betegszabadságos napokat munkanapként (`calculateWorkingDays`) vonja le a ledolgozott napokból (megszüntetve a duplázódást), a `MyPayslipsView` pedig a valós HUF részösszegeket (`alapberReszlet`, `szabadsagDij`, `betegszabadsagDij`, `tuloraPotlek`) jeleníti meg az `"Elszámolva"` szöveg helyett.

- [x] ~~**7. KSH riport részleg-órák valós jelenlétből történő számítása és duplikált keresőmező eltávolítása**~~
  - **Érintett fájlok:** [`src/app/hr/reports/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/reports/actions.ts), [`src/components/hr/reports-tabs.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/reports-tabs.tsx)
  - **Megvalósítás:** A `getKshReportData` a részlegenkénti ledolgozott és távolléti órákat közvetlenül az adott részleghez tartozó dolgozók tényleges `hr_jelenlet` és `hr_tavollet` adataiból összegzi az FTE-arányosított becslés helyett, a KSH fülről pedig eltávolításra került a másodlagos, duplikált keresőmező.

- [x] ~~**8. Valós vállalati adatok (`companies` tábla) bekötése a `DEFAULT_COMPANY_DETAILS` helyére a T1041 és Offboarding PDF-ekben**~~
  - **Érintett fájlok:** [`src/utils/company-server.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/company-server.ts), [`src/app/hr/actions/t1041-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/actions/t1041-actions.ts), [`src/components/hr/t1041-panel.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/t1041-panel.tsx), [`src/app/hr/offboarding/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/offboarding/actions.ts), [`src/app/hr/actions/employment-contract-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/actions/employment-contract-actions.ts)
  - **Megvalósítás:** A központi `resolveCompanyDetailsServer` segédfüggvény az aktív vállalat `companies` rekordjából (`name`, `address`, `tax_number`, `representative_name`) oldja fel a hivatalos cégadatokat, és bekötésre került a NAV T1041 adatlap és vágólap-másoló (`t1041-actions.ts`, `t1041-panel.tsx`), a 3 kilépési PDF (`offboarding/actions.ts`), valamint a munkaszerződés és Mt. 46. § tájékoztató PDF generátoraiba (`employment-contract-actions.ts`).

---

## 0. Összesítő Modul-Érettségi Mátrix (20 Almodul)

| Modulcsoport | Almodul / Útvonal | Készültség | Kanonikus `KpiCard` | Kanonikus `TableToolbar` | Legfontosabb Kritikus Hiányosság / Kódhiba |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **1. Dolgozói Portál** | `/hr` (Áttekintés) | **76%** | Igen (4 db) | N/A | Ebédszünet csak `localStorage`-ban (DB-be nem kerül); nincs „Ki van ma távol” és teendő-widget |
| **1. Dolgozói Portál** | `/hr/self-service/profile` (Profilom) | **72%** | Nem | N/A | Munkaköri leírás nyugtázás nem verzió-kötött; TAJ/Adó/Bank közvetlen felülírása HR jóváhagyás nélkül; hiányzó lakcím/ICE/családtag adatok |
| **1. Dolgozói Portál** | `/hr/self-service/documents` (Dokumentumaim) | **82%** | Igen (4 db) | Igen | Csak olvasható: nincs dolgozói dokumentum-feltöltés és nincs in-app e-aláírás / szabályzat-nyugtázás |
| **1. Dolgozói Portál** | `/hr/self-service/time` (Jelenlét) | **83%** | Igen (4 db) | Nem | Szabadságigénylésnél nincs éves keret-ellenőrzés és ünnepnap-levonás; függő kérelem nem vonható vissza; Havi Zárás gomb hiányzik a UI-ból |
| **1. Dolgozói Portál** | `/hr/self-service/goals` (Célkitűzések) | **78%** | Igen (4 db) | Nem | Beküldött kommentek (`logs`) sosem renderelődnek a kártyán; nincs ciklusválasztó és dolgozói céljavaslat |
| **1. Dolgozói Portál** | `/hr/self-service/idp` (Fejlesztési Tervem) | **85%** | Igen (4 db) | Nem | Feltöltött tanúsítványról nem megy értesítés a vezetőnek és nem jelenik meg a vezetői jóváhagyó panelen |
| **1. Dolgozói Portál** | `/hr/self-service/payroll` (Bérpapírjaim) | **82%** | Nem | Nem | Bruttó bontásban összeg helyett `"Elszámolva"` szöveg; alapbér duplikáció; hiányzó éves M30 / SZJA igazolások és adónyilatkozatok |
| **1. Dolgozói Portál** | `/hr/self-service/career` (Belső Állások) | **88%** | Igen (2×4 db) | Igen | Belső `"Pályázás"` gomb a külső publikus `/karrier/[id]` oldalra dob (belső hirdetésnél 404); nincs „Saját belső pályázataim” követés |
| **2. Vezetői nézet** | `/hr/manager` (Csapat áttekintés) | **80%** | Nem | Részben | Helyettesítő nem látja a túlóra kérelmeket; elutasítás linkje 404 (`/hr/self-service/leave`); IDP és havi zárás hiányzik a jóváhagyó panelből |
| **2. Vezetői nézet** | `/hr/performance` + `/dashboard` (Teljesítmény) | **84%** | Igen (4 db) | Igen | `vezeto` szerepkör látja az egész cég KPI-jait, de az `actions.ts` blokkolja a műveleteit; 0 KPI-os dolgozók eltűnnek; KPI katalógus nincs bekötve |
| **3. HR Munkaasztal** | `/hr/admin` + `/hr/employee/[id]` (Állomány & 360° Karton) | **82%** | Igen | Főoldalon igen, 10 tabon nem | `EMP-xxx` törzsszám szűréskor megváltozik; nincs TAJ/Adó/IBAN CDV validáció; hiányzó eltartottak/gyermekek és ICE nyilvántartás |
| **3. HR Munkaasztal** | `/hr/organization` (Szervezeti Felépítés) | **72%** | Igen | Nem | Kettős igazságforrás a részlegre; organigram kártyák nem kattinthatók; hiányzik a költséghely kód, létszámterv (Vacancies) és bérsáv |
| **3. HR Munkaasztal** | `/hr/time` (Műszakbeosztás & Naptár) | **75%** | Nem | Nem | Elutasított szabadságok benne maradnak a Csapatnaptárban; nincs munkaidőkeret (Mt. 93. §) és napi 11 órás pihenőidő (Mt. 104. §) ellenőrzés |
| **3. HR Munkaasztal** | `/hr/payroll` (Bérszámfejtés) | **70%** | Igen (5 db) | Igen | 500 000 Ft-os néma fallback bér; részmunkaidő (`munkaido_fte`) figyelmen kívül hagyása; SZÉP-kártya hibás egyéni TB-adóztatása; nincs GIRO XML utalási fájl |
| **3. HR Munkaasztal** | `/hr/compliance` (Munkaügyi Megfelelőség) | **84%** | Igen (4×4 db) | Igen (mind a 4 tabon) | Évközi belépők időarányos szabadsága nincs arányosítva; kilépett dolgozók a túlóra listában maradnak; 14 napos lemondás nem kér aláírt PDF-et |
| **3. HR Munkaasztal** | `/hr/reports` (Riportok) | **74%** | Igen (4×4 db) | Részben | KSH riportban a részleg-órák FTE-arányosított becslések valós jelenlét helyett; hiányzik a valódi NAV ÁNYK `.xml` (`26T1041`, `2608`) export |
| **4. Dolgozói Életút** | `/hr/recruitment` + `/karrier` (Toborzás & ATS) | **85%** | Igen | Lista nézetben nem | Lista/Sheet nézetből interjúra váltáskor kimarad az időpontfoglaló modál; hiányzik a strukturált Interview Scorecard és az Offer Letter PDF |
| **4. Dolgozói Életút** | `/hr/onboarding` (Onboarding) | **81%** | Igen (4 db) | Nem | `T1041Panel` hardcoded cégadatokat használ; hiányzik a belépés előtti önkiszolgáló adatbekérő (Pre-boarding link) és a próbaidő-értékelés |
| **4. Dolgozói Életút** | `/hr/offboarding` (Offboarding) | **83%** | Igen (4 db) | Nem | Kilépő PDF-ek hardcoded cégadatokat használnak; hiányzik az automatikus Mt. 69. § felmondási idő és Mt. 77. § végkielégítés kalkulátor |
| **5. Eseménynapló** | `/hr/audit` (Eseménynapló) | **88%** | Igen (2×4 db) | Igen (mindkét tabon) | `company_id IS NULL` naplók cégek között átlátszanak; kliensoldali `limit(500)` korlát szerveroldali lapozás helyett |

---

## 1. Modulcsoportok Részletes Kritikus Értékelése

### 1.1. Dolgozói Portál (Employee Self-Service — ESS)

#### A) Áttekintés (`/hr` — [`src/app/hr/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/page.tsx)) — **76%**
- **Meglévő funkciók:** 4 kanonikus `KpiCard` (`Szabadság Marad`, `Felhasznált Nap`, `Függőben Lévő`, `Munkaidő Egyenleg`), élő munkaidő-számláló ([`time-tracking-card.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/time-tracking-card.tsx)), Cafeteria nyilatkozat-tervező ([`cafeteria-declaration.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/cafeteria-declaration.tsx)), egyéni KPI előrehaladás widget ([`employee-kpi-widget.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-kpi-widget.tsx)).
- **Kritikus kódhibák:**
  - Az ebédszünet (`Szünet`) kizárólag a böngésző `localStorage`-ába mentődik ([`time-tracking-card.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/time-tracking-card.tsx#L38-L66)), az adatbázisba (`hr_jelenlet`) nem kerül be, így a jelenléti ív ([`employee-timesheet.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-timesheet.tsx#L86-L93)) az ebédszünetet is ledolgozott munkaidőnek és túlórának számolja el.
  - A „Munkaidő folytatása” gomb ([`self-service/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/actions.ts#L592-L602)) egyszerűen kitörli a `kicsekkolas_ideje` mezőt (`null`), így a kieső köztes órák is munkaidőnek számítanak.
  - Duplikált `"Üdvözlünk, {nev}!"` fejléc ([`src/app/hr/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/page.tsx#L188-L225)) és felesleges teljes táblás `hr_esemeny_naplo` lekérdezés (`169-173.` sor).
- **Ami HIÁNYZIK:**
  - **„Saját Teendőim & Figyelmeztetések” sáv:** Nyugtázásra váró bérjegyzék, aláírásra váró munkaköri leírás / dokumentum, önértékelésre váró KPI, lejáró orvosi alkalmassági.
  - **„Ki van ma távol a csapatomból?” (Who's Out Today) widget.**
  - **Cafeteria időarányosítás (pro-rata)** évközi belépőknél és SZÉP-kártya adósáv-határ kezelés.

#### B) Profilom (`/hr/self-service/profile` — [`src/app/hr/self-service/profile/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/profile/page.tsx)) — **72%**
- **Meglévő funkciók:** PGP-titkosított személyes adatok (TAJ, adóazonosító, bankszámlaszám) maszkolt megjelenítése és GDPR-naplózott visszafejtése ([`personal-data-card.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/personal-data-card.tsx)), munkaköri leírás PDF előnézet és elektronikus tudomásulvétel ([`job-description-acknowledgment.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/job-description-acknowledgment.tsx)).
- **Kritikus kódhibák:**
  - A munkaköri leírás nyugtázása nem verzióhoz kötött ([`profile/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/profile/page.tsx#L90-L99)): új verzió feltöltésekor a rendszer továbbra is nyugtázottnak mutatja a régit.
  - A dolgozó bármilyen ellenőrzés (CDV-számítás) és HR-jóváhagyás nélkül közvetlenül felülírhatja az éles TAJ-, adó- és bankszámlaszámát ([`self-service/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/actions.ts#L486-L523)).
  - Az „Alapadatok” kártya (`298-397.` sor) duplikálja a profilfejléc 4 jelvényét, a [`personal-data-card.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/personal-data-card.tsx#L79) pedig tiltott bal oldali színes szegélyt (`w-1 bg-destructive/50`) használ.
- **Ami HIÁNYZIK:**
  - **Adatmódosítási kérelem (Change Request Workflow)** igazoló dokumentum csatolásával és HR jóváhagyással.
  - **Alapvető személyes törzsadatok megjelenítése:** Lakcím, telefonszám, születési hely/idő, anyja neve, **Vészhelyzeti kapcsolattartó (ICE)**, **Eltartottak / Gyermekek**, valamint a **Birtokolt céges eszközök (Asset Inventory)** listája.

#### C) Dokumentumaim (`/hr/self-service/documents` — [`src/app/hr/self-service/documents/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/documents/page.tsx)) — **82%**
- **Meglévő funkciók:** Kanonikus `KpiCard` sor és `TableToolbar` ([`employee-documents-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-documents-view.tsx)), beépített `DocumentViewer` előnézettel.
- **Kritikus kódhibák:**
  - Hiányzó `company_id` szűrés ([`documents/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/documents/page.tsx#L14-L18)) és N+1 szekvenciális `createSignedUrl` hívás oldalbetöltéskor (`25-47.` sor).
- **Ami HIÁNYZIK:**
  - **In-app elektronikus dokumentum-nyugtázás / e-aláírás workflow** („Elolvastam és elfogadom” gomb időbélyeggel és auditnaplóval).
  - **Dolgozói dokumentum-feltöltés** (pl. lakcímkártya, nyelvvizsga, orvosi igazolás beküldése).

#### D) Jelenlét (`/hr/self-service/time` — [`src/app/hr/self-service/time/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/time/page.tsx)) — **83%**
- **Meglévő funkciók:** Havi jelenléti ív ([`employee-timesheet.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-timesheet.tsx)), szabadságigénylés ([`leave-request-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/leave-request-dialog.tsx)), jelenlét-korrekció ([`attendance-correction-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/attendance-correction-dialog.tsx)), túlóra-elszámolás ([`overtime-action-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/overtime-action-dialog.tsx)), helyettesítő-beállítás ([`substitute-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/substitute-dialog.tsx)) és PDF igazolások.
- **Kritikus kódhibák:**
  - Szabadságigényléskor (`submitLeaveRequest` a [`self-service/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/actions.ts#L15-L210) fájlban) **nincs éves szabadságkeret-ellenőrzés**, és a munkanapok számítása **nem vonja le a `hr_munkaszuneti_nap` ünnepnapokat**.
  - A havi zárás beküldése (`submitMonthlyTimesheet` az [`attendance-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/attendance-actions.ts#L493-L569) fájlban) meg van írva a backendben, de **nincs hozzá gomb a UI-on**.
  - A `LeaveHistoryList` ([`leave-history-list.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/leave-history-list.tsx#L275-L338)) nem használja a kanonikus `TableToolbar` komponenst, és a függőben lévő (`jovahagyasra_var`) kérelmek nem vonhatók vissza.
- **Ami HIÁNYZIK:**
  - **Függőben lévő kérelmek visszavonása (Withdraw / Cancel gomb).**
  - **„Havi jelenléti ív lezárása és beküldése” gomb** bekötése az `EmployeeTimesheet`-be.
  - **Orvosi igazolás / táppénzes papír PDF csatolása** betegszabadság igénylésekor.

#### E) Célkitűzések (`/hr/self-service/goals` — [`src/app/hr/self-service/goals/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/goals/page.tsx)) — **78%**
- **Meglévő funkciók:** 4 kanonikus `KpiCard`, 5 fázisú `KpiWorkflowStepper`, strukturált önértékelési űrlap ([`employee-kpi-card.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-kpi-card.tsx)).
- **Kritikus kódhibák:**
  - A beküldött hozzászólások (`logs`) lekérésre kerülnek, de a [`employee-kpi-card.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-kpi-card.tsx#L117) (és a vezetői [`performance-list.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/performance-list.tsx#L924-L954)) **soha nem rendereli ki őket**.
  - A `goals/page.tsx` (`29-33.` sor) `company_id` szűrés nélkül kérdezi le a ciklusokat, és nincs ciklusválasztó.
- **Ami HIÁNYZIK:**
  - **Látható komment- és aktivitásfolyam (Check-in Thread)** a KPI kártyán, **Ciklusválasztó**, valamint **Dolgozói céljavaslat (Bottom-up Goal Proposal)**.

#### F) Fejlődési Tervem — IDP (`/hr/self-service/idp` — [`src/app/hr/self-service/idp/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/idp/page.tsx)) — **85%**
- **Meglévő funkciók:** Kanonikus `KpiCard` sor, tanúsítvány-feltöltés és előnézet, fejlődési napló ([`employee-idp-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/idp/employee-idp-view.tsx)).
- **Kritikus kódhibák:**
  - Hiányzó jogosultság-ellenőrzés az [`idp-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/actions/idp-actions.ts#L419-L558) fájlban (`approveDevelopmentGoal`, `rejectDevelopmentGoal`).
  - Amikor a dolgozó feltölti a tanúsítványt (`jovahagyasra_var`), nem megy értesítés a vezetőnek, és a tétel nem jelenik meg a `/hr/manager` jóváhagyó paneljén.
- **Ami HIÁNYZIK:**
  - **Dolgozói képzési igény / tanulmányi szerződés kezdeményezése** és integráció a Vezetői Jóváhagyási Központtal.

#### G) Bérpapírjaim (`/hr/self-service/payroll` — [`src/app/hr/self-service/payroll/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/payroll/page.tsx)) — **82%**
- **Meglévő funkciók:** Havi bérjegyzék-lista, Mt. 155. § szerinti elektronikus átvételi nyugtázás, PDF előnézet ([`my-payslips-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/my-payslips-view.tsx)).
- **Kritikus kódhibák:**
  - A bruttó bérbontásban ([`my-payslips-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/my-payslips-view.tsx#L280-L304)) a szabadságdíj, betegszabadság és túlórapótlék mellett összegek helyett csak az `"Elszámolva"` szöveg szerepel, a ledolgozott napokhoz pedig duplikálva a teljes havi alapbért írja ki. Hiányzik a felső 4 oszlopos `KpiCard` sáv.
- **Ami HIÁNYZIK:**
  - **Éves adóigazolások (M30 / SZJA igazolás) letöltése** és **Online Adóelőleg-nyilatkozatok** beküldése.

#### H) Belső Állások (`/hr/self-service/career` — [`src/app/hr/self-service/career/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/career/page.tsx)) — **88%**
- **Meglévő funkciók:** Belső álláshirdetések és dolgozói ajánlási program, kanonikus `KpiCard` és `TableToolbar` mindkét fülön ([`internal-career-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/internal-career-view.tsx), [`my-referrals-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/my-referrals-view.tsx)).
- **Kritikus kódhibák:**
  - A belső `"Pályázás"` gomb ([`internal-career-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/internal-career-view.tsx#L391)) a külső publikus `/karrier/[id]` oldalra dob (ami csak belső hirdetésnél 404-es hibára fut).
- **Ami HIÁNYZIK:**
  - **Dedikált Belső Pályázási Modál (1 kattintásos belső mobilitási jelentkezés)** + **„Saját belső pályázataim”** követőfül.

---

### 1.2. Vezetői Nézet (Manager Portal — MSS)

#### A) Csapat Áttekintés (`/hr/manager` — [`src/app/hr/manager/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/manager/page.tsx)) — **80%**
- **Kritikus kódhibák:**
  - A helyettesítő vezető nem látja a helyettesített csapat túlóra-igényléseit ([`manager/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/manager/page.tsx#L93-L102)).
  - Elutasításkor az értesítés 404-es linkre (`/hr/self-service/leave`) mutat ([`manager/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/manager/actions.ts#L148)), jóváhagyáskor pedig nem küld in-app értesítést.
  - Hiányzik a felső 4 oszlopos kanonikus `KpiCard` sáv és a `Közvetlen beosztottak` táblázatból a `TableToolbar`.
- **Ami HIÁNYZIK:**
  - **Egységes Jóváhagyási Központ bővítése** a jóváhagyásra váró **IDP tanúsítványokkal** és **havi jelenlét-zárásokkal**, **Ütközés-figyelmeztetés (Leave Conflict Badge)** és **Beosztotti Gyorsnézet (Quick-View Drawer)**.

#### B) Teljesítményértékelés és Riportok (`/hr/performance` & `/hr/performance/dashboard`) — **84%**
- **Kritikus kódhibák:**
  - A `vezeto` szerepkör a [`performance/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/performance/page.tsx#L14) fájlban látja a cég **összes** dolgozóját, miközben a [`performance/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/performance/actions.ts#L21) blokkolja a `vezeto` szerepkört a KPI-műveletekből (`addKpi`, `editKpi`, `confirmMeeting`, `finalCloseKpi`).
  - A 0 KPI-jal rendelkező dolgozók eltűnnek a [`performance-list.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/performance-list.tsx#L261) listából, a `hr_kpi_katalogus` pedig nincs bekötve az [`add-kpi-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/add-kpi-dialog.tsx#L60) modálba.

---

### 1.3. HR Munkaasztal, Dolgozói Életút és Eseménynapló

- **Állomány és 360° Karton (`/hr/admin`, `/hr/employee/[id]`) — 82%:** A [`employee-table.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-table.tsx#L226) a szűrt tömb indexéből képezi az `EMP-xxx` törzsszámot; az [`admin/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/admin/actions.ts#L43) hardcoded `"Welcome2026!"` jelszót használ; hiányzik a TAJ/Adó/IBAN CDV-validáció és az Eltartottak/Gyermekek nyilvántartása.
- **Szervezeti Felépítés (`/hr/organization`) — 72%:** Kettős igazságforrás a szervezeti egységre (`szervezeti_egyseg_id` vs. `hr_szervezeti_egyseg_id`); az organigram kártyák nem kattinthatók; hiányzik a `TableToolbar`, a költséghely kód és a létszámterv (Planned vs. Actual FTE).
- **Műszakbeosztás és Naptár (`/hr/time`) — 75%:** Az elutasított szabadságok is megjelennek a Csapatnaptárban ([`hr/time/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/time/page.tsx#L42)); hiányzik a napi 11 órás pihenőidő (Mt. 104. §) ellenőrzése és a munkaidőkeret (Mt. 93. §) kezelése.
- **Bérszámfejtés (`/hr/payroll`) — 70%:** Néma `500 000 Ft` alapbér-fallback ([`payroll/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/payroll/actions.ts#L330)); részmunkaidő (`munkaido_fte`) figyelmen kívül hagyása; SZÉP-kártya hibás egyéni TB-adóztatása ([`payslip-calculator.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/payslip-calculator.ts#L106-L112)); hiányzik a GIRO / SEPA XML banki utalási fájl export.
- **Munkaügyi Megfelelőség (`/hr/compliance`) — 84%:** Kilépett dolgozók benne maradnak a Túlóra Compliance listában ([`compliance-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/compliance/compliance-actions.ts#L544)); évközi belépők szabadsága nincs időarányosítva (Mt. 121. §).
- **Riportok (`/hr/reports`) — 74%:** A KSH riportban a részleg-órák FTE-arányosított becslések a valós jelenlét helyett ([`reports/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/reports/actions.ts#L530-L541)); duplikált keresőmező a KSH fülön ([`reports-tabs.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/reports-tabs.tsx#L990-L1113)).
- **Toborzás (`/hr/recruitment`) — 85%:** Lista nézetből vagy Jelölt Adatlapról „Interjú” státuszra váltva kimarad az időpontfoglaló modál és hibás `/hr/recruitment` link megy ki e-mailben ([`recruitment/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/recruitment/actions.ts#L154)).
- **Onboarding (`/hr/onboarding`) — 81% & Offboarding (`/hr/offboarding`) — 83%:** A `T1041Panel` és a kilépő PDF-ek hardcoded `DEFAULT_COMPANY_DETAILS` cégadatokat használnak az aktív cég valós adatai helyett; hiányzik az automatikus Mt. 69. § felmondási idő és Mt. 77. § végkielégítés kalkulátor.
- **Eseménynapló (`/hr/audit`) — 88%:** A `company_id.is.null` szűrő miatt a cégazonosító nélkül rögzített naplók átlátszanak a cégek között ([`audit/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/audit/page.tsx#L392)).

---

## 2. NYITOTT JAVÍTÁSI ÉS FEJLESZTÉSI FELADATLISTA (30 FELADAT)

### P0 — Kritikus Kód-, Jogosultsági és Számítási Hibák (Azonnali Javítások)

- [ ] **2. Teljesítményértékelés (`/hr/performance`) `vezeto` szerepkör jogosultsági ellentmondásának feloldása**
  - **Érintett fájlok:** [`src/app/hr/performance/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/performance/page.tsx), [`src/app/hr/performance/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/performance/actions.ts)
  - **Feladat:** A `"vezeto"` szerepkör felvétele az `addKpi`, `updateKpiProgress`, `deleteKpi`, `confirmMeeting`, `finalCloseKpi`, `editKpi` és `addKpiManagerEvaluation` engedélyezett szerepkörei közé, miközben sima `vezeto` esetén a lekérdezés a saját közvetlen beosztottjaira szűkít (a HR és Admin továbbra is a teljes céget látja).

---

### P1 — Félbehagyott Munkafolyamatok Bekötése és UI/UX Konzisztencia

- [ ] **9. Célkitűzések (`/hr/self-service/goals` & `/hr/performance`) komment-folyam (`logs`) megjelenítése és 0 KPI-os dolgozók listázása**
  - **Érintett fájlok:** [`src/components/hr/employee-kpi-card.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-kpi-card.tsx), [`src/components/hr/performance-list.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/performance-list.tsx), [`src/components/hr/add-kpi-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/add-kpi-dialog.tsx)
  - **Feladat:** A beküldött hozzászólások (`logs`) megjelenítése a KPI kártyákon, a 0 KPI-jal rendelkező dolgozók megjelenítése a vezetői listában, és a `hr_kpi_katalogus` sablonválasztó bekötése az `AddKpiDialog`-ba.

- [ ] **10. Vezetői Központ (`/hr/manager`) túlóra-helyettesítés, értesítési linkek és Egységes Jóváhagyási Panel bővítése**
  - **Érintett fájlok:** [`src/app/hr/manager/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/manager/page.tsx), [`src/app/hr/manager/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/manager/actions.ts), [`src/components/hr/unified-approvals-panel.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/unified-approvals-panel.tsx)
  - **Feladat:** Helyettesítő vezető számára a túlóra-kérelmek megjelenítése; a `/hr/self-service/leave` 404-es link javítása `/hr/self-service/time`-ra + jóváhagyási értesítés küldése; a jóváhagyásra váró **IDP tanúsítványok** és **havi jelenlét-zárások** megjelenítése az Egységes Jóváhagyási Panelen; 4 kanonikus `KpiCard` a `/hr/manager` tetejére.

- [ ] **11. Jelenlét (`/hr/self-service/time`) „Havi jelenléti ív lezárása” gomb és függőben lévő kérelem visszavonása**
  - **Érintett fájlok:** [`src/components/hr/employee-timesheet.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-timesheet.tsx), [`src/components/hr/leave-history-list.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/leave-history-list.tsx), [`src/app/hr/self-service/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/actions.ts)
  - **Feladat:** A már megírt `submitMonthlyTimesheet` bekötése a UI-ra, a jelenléti ív alapértelmezett kinyitása, a `jovahagyasra_var` státuszú kérelmek visszavonási lehetősége és kanonikus `TableToolbar` a `LeaveHistoryList`-be.

- [ ] **12. Belső Állások (`/hr/self-service/career`) dedikált Belső Pályázási Modál és „Saját belső pályázataim” követés**
  - **Érintett fájlok:** [`src/components/hr/internal-career-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/internal-career-view.tsx), [`src/app/hr/self-service/career/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/career/page.tsx)
  - **Feladat:** A külső `/karrier/[id]` átirányítás helyett 1 kattintásos belső pályázási modál (`forras: "belso_palyazat"`) és saját belső jelentkezések státuszkövetése.

- [ ] **13. Profilom (`/hr/self-service/profile`) verziókötött munkaköri nyugtázás, TAJ/Adó/IBAN CDV-validáció és törzsadat-bővítés**
  - **Érintett fájlok:** [`src/app/hr/self-service/profile/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/profile/page.tsx), [`src/components/hr/personal-data-card.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/personal-data-card.tsx), [`src/app/hr/self-service/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/actions.ts)
  - **Feladat:** A munkaköri leírás nyugtázásának hozzákötése az aktív `verzio_id`-hoz; magyar TAJ, adóazonosító jel és bankszámlaszám algoritmikus ellenőrzése; a duplikált „Alapadatok” kártya kiváltása valós személyes törzsadatokkal (lakcím, születési adatok, birtokolt eszközök).

- [ ] **14. Dokumentumaim (`/hr/self-service/documents`) in-app elektronikus dokumentum-nyugtázás és dolgozói dokumentum-feltöltés**
  - **Érintett fájlok:** [`src/app/hr/self-service/documents/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/documents/page.tsx), [`src/components/hr/employee-documents-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-documents-view.tsx)
  - **Feladat:** `company_id` szűrés pótlása, kötegelt `createSignedUrls` használata, valamint dokumentum-tudomásulvétel („Elolvastam és elfogadom”) és dolgozói igazolás-feltöltés.

- [ ] **15. Dolgozói Portál Áttekintés (`/hr`) „Saját Teendőim” és „Ki van ma távol a csapatomból?” widgetek + duplikált fejléc törlése**
  - **Érintett fájl:** [`src/app/hr/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/page.tsx)
  - **Feladat:** A duplikált üdvözlő fejléc eltávolítása, `company_id` szűrés pótlása, valamint a függő teendők (nyugtázatlan bérjegyzék, munkaköri leírás, KPI önértékelés) és a mai csapattávollétek megjelenítése.

- [ ] **16. Toborzás (`/hr/recruitment`) Lista és Jelölt Adatlap „Interjú” státuszváltás modál-egységesítése és e-mail link javítása**
  - **Érintett fájlok:** [`src/components/hr/candidate-profile-sheet.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/candidate-profile-sheet.tsx), [`src/components/hr/kanban-board.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/kanban-board.tsx), [`src/app/hr/recruitment/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/recruitment/actions.ts)
  - **Feladat:** Lista nézetben és a Jelölt Adatlapban is az interjú-időpontfoglaló modál megnyitása „Interjú” státusz választásakor, valamint a pályázói e-mailben a publikus `/karrier` követőlink használata a belső `/hr/recruitment` helyett.

- [ ] **17. Állománytábla (`/hr/admin`) stabil `EMP-xxx` törzsszám-képzés és Szervezeti Egység (`/hr/organization`) szinkronizáció**
  - **Érintett fájlok:** [`src/components/hr/employee-table.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-table.tsx), [`src/components/hr/org-chart-tree.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/org-chart-tree.tsx), [`src/app/hr/job/[id]/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/job/%5Bid%5D/actions.ts)
  - **Feladat:** A dolgozói törzsszám képzése a teljes (szűretlen) névsor vagy belépési sorrend alapján (hogy kereséskor ne változzon meg), az organigram kártyák kattinthatóvá tétele, és a `szervezeti_egyseg_id` / `hr_szervezeti_egyseg_id` szinkronban tartása.

- [ ] **18. Kanonikus `TableToolbar`, `KpiCard` és Zero-Decorative-Icons szabályok (ADR A-029) maradéktalan érvényesítése**
  - **Érintett fájlok:** [`src/components/hr/personal-data-card.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/personal-data-card.tsx), [`src/components/hr/employee-tabs/PersonalDataTab.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-tabs/PersonalDataTab.tsx), [`src/components/hr/offboarding-list.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/offboarding-list.tsx), [`src/components/hr/onboarding-list.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/onboarding-list.tsx), [`src/components/hr/organization-tabs-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/organization-tabs-view.tsx)
  - **Feladat:** A tiltott bal oldali színes szegélyek (`w-1 bg-destructive/50`) és az üres állapotokban lévő kerekített dekoratív ikonbuborékok eltávolítása, valamint a hiányzó `TableToolbar` komponensek pótlása.

---

### P2 — Stratégiai / Enterprise HRIS Funkciók (Magyar Mt. és Európai Benchmark Bővítések)

- [ ] **19. Automatikus Mt. 69–70. § Felmondási idő, Mt. 77. § Végkielégítés és időarányos szabadságmegváltás kalkulátor (`/hr/offboarding`)**
  - A szolgálati idő (3, 5, 8, 10, 15, 20 év) és az időarányos szabadságegyenleg alapján automatikus javaslat a `TerminationPanel`-en.
- [ ] **20. Évközi belépők és kilépők időarányos (pro-rata) szabadság- és Cafeteria-keret számítása (Mt. 121. §)**
  - A belépés és kilépés dátuma alapján a naptári napokkal arányosított éves szabadság- és Cafeteria-keret minden nézetben.
- [ ] **21. Műszakbeosztás (`/hr/time`) napi 11 órás pihenőidő (Mt. 104. §) validáció és 7 napos beosztás-közzététel (Mt. 97. §)**
  - Figyelmeztetés, ha két műszak között nincs meg a 11 óra pihenőidő, valamint a heti beosztás közzététele/zárolása.
- [ ] **22. Munkaidőkeret (Mt. 93–94. §) nyilvántartás és keretóra-egyenleg követés (`/hr/time`)**
  - 1–4 havi munkaidőkeret nyitása és a ledolgozott vs. keretórák gördülő elszámolása.
- [ ] **23. Bérszámfejtés (`/hr/payroll`) műszakpótlékok (Mt. 139–145. §), valódi távolléti díj és GIRO / SEPA XML banki utalási fájl export**
  - Éjszakai (15%), műszak- (30%) és vasárnapi (50%) pótlékok számítása, valamint csoportos átutalási fájl generálása.
- [ ] **24. Hatósági Riportok (`/hr/reports`) hivatalos NAV ÁNYK `.xml` (`26T1041` és `2608`) export generátor**
  - XSD-kompatibilis XML generálás közvetlen ÁNYK / ONYA betöltéshez.
- [ ] **25. Pre-boarding Önkiszolgáló Adatbekérő Link és Próbaidő-értékelési folyamat (`/hr/onboarding`)**
  - Tokenizált link az új belépőnek a személyes adatok (TAJ, adó, bank, lakcím) 1. nap előtti beküldésére + automatikus próbaidő-lejárati vezetői értékelés.
- [ ] **26. Strukturált Interjú Értékelőlap (Interview Scorecard) és Hivatalos Ajánlatlevél (Offer Letter) PDF (`/hr/recruitment`)**
  - Kompetencia-alapú interjúpontozó lap és digitálisan elfogadható ajánlatlevél PDF generálás a szerződéskötés előtt.
- [ ] **27. Eltartottak / Gyermekek és Vészhelyzeti Kapcsolattartó (ICE) nyilvántartás (`/hr/employee/[id]` & `/hr/self-service/profile`)**
  - Gyermekek születési dátuma és adó/TAJ adatai az Mt. 118. § szerinti gyermekek után járó pótszabadság (1 gyermek: 2 nap, 2 gyermek: 4 nap, 3+ gyermek: 7 nap) és a családi adókedvezmény automatikus számításához.
- [ ] **28. Éves Adóigazolások (M30) és Online Adóelőleg-nyilatkozatok a Dolgozói Portálon (`/hr/self-service/payroll`)**
  - Családi kedvezmény és első házasok kedvezménye nyilatkozatok digitális leadása és éves M30 igazolás letöltése.
- [ ] **29. 9-Box Talent Matrix (Teljesítmény × Potenciál) és 1-kattintásos IDP indítás a Teljesítményértékelésből (`/hr/performance`)**
  - Utánpótlás-tervezési mátrix és közvetlen fejlesztési terv létrehozás az értékelő megbeszélésből.
- [ ] **30. Eseménynapló (`/hr/audit`) szerveroldali lapozás és szigorú `company_id` izoláció**
  - A `limit(500)` kliensoldali korlát kiváltása szerveroldali kurzoros/oldalas lekérdezéssel és minden naplóbejegyzés kötelező `company_id` címkézésével.
