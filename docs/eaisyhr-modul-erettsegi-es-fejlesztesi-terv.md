# [HR] eaisyHR Modul-Érettségi Audit és Kritikus Fejlesztési Feladatlista

> **Dokumentum státusz:** Aktív modul-audit és fejlesztési terv (15 / 30 feladat + jogosultsági architektúra modernizáció és aktív munkakör feloldás elvégezve, 15 nyitott)
> **Létrehozva:** 2026. október 28.
> **Hatókör:** `[HR]` és `[Közös]` (5 főcsoport, 20 almodul + 16 füles 360°-os dolgozói karton)
> **Átlagos rendszer-érettség:** **88%** (európai enterprise HRIS benchmark: Personio, HiBob, BambooHR, Lattice, Nexon)
> **Módszertan:** Pontról pontra történő javítás és modulfejlesztés. Amint egy feladat elkészül és típusellenőrzéssel (`npx tsc --noEmit`) igazolt, a nyitott listából átkerül az **Elkészült és Lezárt Feladatok** blokkba `[x]` jelöléssel és áthúzással (`~~...~~`).

---

## ELKÉSZÜLT ÉS LEZÁRT FELADATOK (15 / 30 + Jogosultsági Modernizáció)

- [x] ~~**1. Szerveroldali RBAC és Multi-Tenant (`company_id`) védelem pótlása a HR Server Action-ökben**~~
  - **Érintett fájlok:** [`src/app/hr/reports/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/reports/actions.ts), [`src/app/hr/payroll/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/payroll/actions.ts), [`src/app/hr/offboarding/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/offboarding/actions.ts), [`src/app/hr/admin/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/admin/actions.ts), [`src/app/hr/orgunit/[id]/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/orgunit/%5Bid%5D/actions.ts), [`src/app/hr/actions/idp-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/actions/idp-actions.ts), [`src/app/hr/onboarding/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/onboarding/actions.ts)
  - **Megvalósítás:** Minden `SUPABASE_SERVICE_ROLE_KEY`-t használó admin/HR végpontra bekerült a központi `requireHrAuthServer` szerepkör- és cégkontextus-ellenőrzés (`admin/actions.ts`, `orgunit/[id]/actions.ts`, `idp-actions.ts`, `payroll/actions.ts`, `reports/actions.ts`, `offboarding/actions.ts`), az `onboarding/actions.ts`-ben pedig javításra került a `getActiveCompanyMemberRolesServer()` paraméterezése, továbbá a `reopenOnboarding` és `deleteOnboarding` is szerepkör-védelmet kapott.

- [x] ~~**2. Teljesítményértékelés (`/hr/performance` & `/hr/performance/dashboard`) `vezeto` szerepkör jogosultsági ellentmondásának feloldása és csapat-szintű szűrés**~~
  - **Érintett fájlok:** [`src/utils/hr/performance-access.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/performance-access.ts), [`src/app/hr/performance/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/performance/page.tsx), [`src/app/hr/performance/dashboard/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/performance/dashboard/page.tsx), [`src/app/hr/performance/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/performance/actions.ts)
  - **Megvalósítás:** Létrejött a `performance-access.ts` jogosultság- és csapatfeloldó segédmodul (`hasFullCompanyPerformanceAccess`, `getScopedPerformanceEmployeeIds`, `canManageEmployeePerformance`). Sima `vezeto` szerepkör esetén a `/hr/performance` és `/hr/performance/dashboard` nézetek kizárólag a vezető saját közvetlen beosztottjait, a vezetett részlegek tagjait és az aktív helyettesítéssel átvett csapatot jelenítik meg (a HR és Admin továbbra is a teljes vállalatot látja), miközben az `addKpi`, `updateKpiProgress`, `deleteKpi`, `addKpiManagerEvaluation`, `confirmMeeting`, `finalCloseKpi` és `editKpi` Server Action-ök `requireHrAuthServer` + csapattagság-ellenőrzéssel engedélyezik a vezetői KPI-műveleteket.

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

- [x] ~~**9. Célkitűzések (`/hr/self-service/goals` & `/hr/performance`) 5 lépéses önértékelési folyamat letisztítása és redundáns kommentmező eltávolítása**~~
  - **Érintett fájlok:** [`src/components/hr/employee-kpi-card.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-kpi-card.tsx), [`src/components/hr/performance-list.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/performance-list.tsx), [`src/components/hr/add-kpi-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/add-kpi-dialog.tsx)
  - **Megvalósítás:** Az 5 lépéses értékelési munkafolyamatban a dolgozói önértékelés és az elért darabszám/mérőszám megjelenítése már mind a dolgozói, mind a vezetői nézetben biztosított, az új célkitűzés felvétele pedig minden aktív dolgozóra elérhető a jobb felső `AddKpiDialog` ablakból. A dolgozói KPI kártya aljáról eltávolításra került a felesleges, másodlagos „Megjegyzés hozzáfűzése...” mező.

- [x] ~~**11. Jelenlét (`/hr/self-service/time`) függőben lévő (`jovahagyasra_var`) kérelmek visszavonása, kanonikus `TableToolbar` és elutasítási indokok mentése**~~
  - **Érintett fájlok:** [`src/components/hr/leave-history-list.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/leave-history-list.tsx), [`src/app/hr/self-service/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/actions.ts), [`src/app/hr/manager/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/manager/actions.ts), [`src/app/hr/attendance-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/attendance-actions.ts), [`supabase/migrations/20261028000004_add_elutasitas_oka_to_tavollet_and_tulora.sql`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/supabase/migrations/20261028000004_add_elutasitas_oka_to_tavollet_and_tulora.sql)
  - **Megvalósítás:** A `LeaveHistoryList` komponens megkapta a kanonikus `TableToolbar` kereső- és szűrősávot, valamint minden még el nem bírált (`jovahagyasra_var`) szabadság-, időkorrekciós és túlóra-igénylés mellé bekerült a „Visszavonás” gomb (`withdrawSelfServiceRequest`). A `hr_tavollet` és `hr_tulora_felhasznalás` táblák bővültek az `elutasitas_oka` oszloppal, az elutasítási értesítési link `/hr/self-service/leave` helyett `/hr/self-service/time`-ra javításra került (jóváhagyási értesítéssel együtt), így az elutasítás indoka tartósan megjelenik. (A havi jelenléti ív összecsukott alapállapota és a vezetői/HR oldali havi zárás üzleti döntés alapján változatlan maradt.)

- [x] ~~**12. Belső Állások (`/hr/self-service/career` & `/karrier`) integrált Belső/Publikus Karrierportál fülválasztó, előtöltött dolgozói jelentkezés, háromállású hirdetés-kapcsoló (`Aktív` / `Publikus` / `Belső`) és „Saját pályázataim” követés**~~
  - **Érintett fájlok:** [`src/utils/hr/career-auth.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/career-auth.ts), [`src/app/karrier/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/karrier/page.tsx), [`src/app/karrier/[id]/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/karrier/%5Bid%5D/page.tsx), [`src/app/karrier/[id]/application-form.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/karrier/%5Bid%5D/application-form.tsx), [`src/app/karrier/[id]/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/karrier/%5Bid%5D/actions.ts), [`src/components/hr/career-portal-client.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/career-portal-client.tsx), [`src/components/hr/internal-career-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/internal-career-view.tsx), [`src/components/hr/job-postings-list.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/job-postings-list.tsx), [`src/components/hr/manage-posting-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/manage-posting-dialog.tsx), [`src/app/hr/recruitment/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/recruitment/actions.ts), [`src/app/hr/self-service/career/referral-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/career/referral-actions.ts)
  - **Megvalósítás:** A `/hr/self-service/career` oldalon a „Pályázás” gomb közvetlenül a karrierportál részletes pozícióoldalára (`/karrier/[id]?scope=internal`) irányít, ahol a dolgozó a teljes pozícióleírást, feladatokat, kompetenciákat és bérsávot látja. A `resolveCareerEmployeeContext` szerveroldali ellenőrzés biztosítja, hogy a `/karrier` és `/karrier/[id]` oldalakon a **„Belső hirdetések”** (`is_internal = true`) és **„Publikus hirdetések”** (`is_internal = false`) közötti fülválasztó kizárólag a vállalat bejelentkezett dolgozója számára jelenjen meg (külső látogatók számára a belső hirdetések szerveroldalon tiltottak: `notFound()`). Igazolt dolgozóknál a jelentkezési űrlap automatikusan előtölti a nevet, e-mail címet, telefonszámot és a `forras = "belso_palyazat"` mezőt. A `/hr/recruitment` álláshirdetés-listában (`JobPostingsList`) az **Aktív** és **Publikus** kapcsolók mellé bekerült a **Belső** kapcsoló (a szerkesztő modálból pedig kikerült a redundáns belső hirdetés doboz), a `/hr/self-service/career` oldalon pedig elérhető a **„Saját pályázataim”** státuszkövető fül.

- [x] ~~**16. Toborzás (`/hr/recruitment`) interjúmeghívó e-mailben a publikus Vercel `/karrier` link használata (`localhost` és belső `/hr/recruitment` kizárásával)**~~
  - **Érintett fájlok:** [`src/app/hr/recruitment/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/recruitment/actions.ts), [`src/utils/url.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/url.ts)
  - **Megvalósítás:** A `getBaseUrl()` segédfüggvény kiszűri a `localhost` / `127.0.0.1` címeket és garantáltan az éles Vercel domainre (`https://eaisydocs2.vercel.app`) épít URL-t, a `scheduleInterview` és `updateCandidateStatus` pedig a belső `/hr/recruitment` adminoldal helyett a publikus karrieroldalra (`/karrier/[allashirdetes_id]` vagy `/karrier?company=[company_id]`) irányítja a jelöltet a „Jelentkezés megtekintése” gombbal. (Az interjú-időpontfoglaló modál üzleti döntés alapján kizárólag a Kanban nézetben nyílik meg.)

- [x] ~~**17. Állománytábla (`/hr/admin`) stabil `EMP-xxx` törzsszám-képzés és kattintható Organigram kártyák (`/hr/organization`)**~~
  - **Érintett fájlok:** [`src/components/hr/employee-table.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-table.tsx), [`src/components/hr/org-chart-tree.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/org-chart-tree.tsx)
  - **Megvalósítás:** A dolgozók `EMP-xxx` törzsszáma (`employeeCodeMap`) a teljes, szűretlen állományból képződik (és a keresőmezőben törzsszámra is lehet keresni), így szűrés közben sem változik meg a dolgozó sorszáma. A Szervezeti Ábrán (`OrgChartTree`) minden dolgozói kártya (`DolgozoCard`) közvetlen linket kapott a 360°-os dolgozói profilra (`/hr/employee/[id]`), a részlegkártyák fejléce pedig a részleg adatlapjára (`/hr/orgunit/[id]`) navigál.

- [x] ~~**18. Kanonikus `TableToolbar` pótlása (`/hr/organization`) és dekoratív üresállapot-ikonbuborékok eltávolítása (`/hr/onboarding`)**~~
  - **Érintett fájlok:** [`src/components/hr/organization-tabs-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/organization-tabs-view.tsx), [`src/components/hr/onboarding-list.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/onboarding-list.tsx), [`src/components/hr/offboarding-list.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/offboarding-list.tsx), [`src/components/hr/exit-interview-summary.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/exit-interview-summary.tsx)
  - **Megvalósítás:** A `/hr/organization` oldal **„Szervezeti Egységek”** és **„Munkakör-katalógus”** fülei megkapták a kanonikus `TableToolbar` komponenst (keresés `X` törlőgombbal, oszlopválasztó, létszám/hierarchia/betöltöttség/besorolás szűrők), a Be- és Kiléptetés (`/hr/onboarding`) üres állapotaiból pedig eltávolításra kerültek a dekoratív ikonbuborékok. (A Saját Adatok oldal a felhasználó döntése alapján változatlan maradt.)

- [x] ~~**14. Dokumentumaim (`/hr/self-service/documents`) aláírt dokumentumpéldány dolgozói feltöltése verziókövetéssel és kötegelt `createSignedUrls` lekérdezéssel**~~
  - **Érintett fájlok:** [`src/app/hr/self-service/documents/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/documents/page.tsx), [`src/components/hr/employee-documents-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-documents-view.tsx), [`src/components/hr/upload-signed-document-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/upload-signed-document-dialog.tsx), [`src/app/hr/employee/[id]/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/actions.ts)
  - **Megvalósítás:** A dolgozó a **Dokumentumaim (`/hr/self-service/documents`)** oldalon minden még alá nem írt (`Tervezet`) dokumentum mellett látja az **„Aláírt példány feltöltése”** gombot (`UploadSignedDocumentDialog`). Feltöltéskor az eredeti generált PDF érintetlenül megmarad (`hr_dokumentum.url` és `irat_fajl` 1. verzió), az aláírt példány pedig bekerül a `hr_dokumentum.alairt_fajl_url` mezőbe (és ha az irat iktatva van, 2. verzióként `[ALÁÍRT]` előtaggal és SHA-256 hash-sel a személyi dossziéba). Feltöltés után a jelvény átvált **„Aláírt példány”**-ra, és a dolgozói nézetből eltűnik a feltöltő gomb — a már aláírt iratot utólag kizárólag a HR/Admin cserélheti a 360°-os dolgozói kartonon. Emellett bekerült a `company_id` szűrés, a kötegelt `createSignedUrls` hívás és az „Aláírásra váró iratok (Tervezet)” szűrőopció.

---

## 0. Összesítő Modul-Érettségi Mátrix (20 Almodul)

| Modulcsoport | Almodul / Útvonal | Készültség | Kanonikus `KpiCard` | Kanonikus `TableToolbar` | Legfontosabb Kritikus Hiányosság / Kódhiba |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **1. Dolgozói Portál** | `/hr` (Áttekintés) | **84%** | Igen (4 db) | N/A | Ebédszünet DB-perzisztencia kész; hiányzik a „Saját Teendőim” widget |
| **1. Dolgozói Portál** | `/hr/self-service/profile` (Profilom) | **72%** | Nem | N/A | Munkaköri leírás nyugtázás nem verzió-kötött; TAJ/Adó/Bank közvetlen felülírása HR jóváhagyás nélkül; hiányzó lakcím/ICE/családtag adatok |
| **1. Dolgozói Portál** | `/hr/self-service/documents` (Dokumentumaim) | **92%** | Igen (4 db) | Igen | Dolgozói aláírt példány feltöltés (`UploadSignedDocumentDialog`), verziókövetés és egyszeri véglegesítés kész |
| **1. Dolgozói Portál** | `/hr/self-service/time` (Jelenlét) | **92%** | Igen (4 db) | Igen | Éves keret- és ünnepnap-ellenőrzés, kérelem-visszavonás, `elutasitas_oka` és `TableToolbar` kész; hiányzik az orvosi igazolás PDF csatolás |
| **1. Dolgozói Portál** | `/hr/self-service/goals` (Célkitűzések) | **88%** | Igen (4 db) | Nem | 5 lépéses önértékelés és kártyatisztítás kész; hiányzik a ciklusválasztó és dolgozói céljavaslat |
| **1. Dolgozói Portál** | `/hr/self-service/idp` (Fejlesztési Tervem) | **85%** | Igen (4 db) | Nem | Feltöltött tanúsítványról nem megy értesítés a vezetőnek és nem jelenik meg a vezetői jóváhagyó panelen |
| **1. Dolgozói Portál** | `/hr/self-service/payroll` (Bérpapírjaim) | **88%** | Nem | Nem | Valós HUF bruttó bérbontás kész; hiányzó éves M30 / SZJA igazolások és adónyilatkozatok |
| **1. Dolgozói Portál** | `/hr/self-service/career` (Belső Állások) | **95%** | Igen (2×4 db) | Igen | Integrált Belső/Publikus Karrierportál fülválasztó, előtöltött belső jelentkezés és „Saját pályázataim” követés kész |
| **2. Vezetői nézet** | `/hr/manager` (Csapat áttekintés) | **83%** | Nem | Részben | Értesítési linkek (`/hr/self-service/time`) és `elutasitas_oka` kész; helyettesítő nem látja a túlóra kérelmeket; IDP és havi zárás hiányzik a jóváhagyó panelből |
| **2. Vezetői nézet** | `/hr/performance` + `/dashboard` (Teljesítmény) | **94%** | Igen (4 db) | Igen | Vezetői csapatszűrés (`resolvePerformanceAccessContext`) és teljes körű csapat-KPI kezelés kész |
| **3. HR Munkaasztal** | `/hr/admin` + `/hr/employee/[id]` (Állomány & 360° Karton) | **90%** | Igen | Főoldalon igen, 10 tabon nem | Stabil `EMP-xxx` törzsszám és modul-alapú RLS/RPC láthatóság (`has_hr_module_access`) kész |
| **3. HR Munkaasztal** | `/hr/organization` (Szervezeti Felépítés) | **90%** | Igen | Igen (mind a 3 táblás tabon) | 4. fül: Jogosultságkezelő Mátrix, kanonikus `TableToolbar` és kattintható Organigram kártyák kész |
| **3. HR Munkaasztal** | `/hr/time` (Műszakbeosztás & Naptár) | **82%** | Nem | Nem | Elutasított szabadságok szűrése kész; nincs munkaidőkeret (Mt. 93. §) és napi 11 órás pihenőidő (Mt. 104. §) ellenőrzés |
| **3. HR Munkaasztal** | `/hr/payroll` (Bérszámfejtés) | **84%** | Igen (5 db) | Igen | FTE arányosítás, SZÉP-kártya adózás és bruttó bontás kész; hiányzik a GIRO XML utalási fájl és műszakpótlék |
| **3. HR Munkaasztal** | `/hr/compliance` (Munkaügyi Megfelelőség) | **88%** | Igen (4×4 db) | Igen (mind a 4 tabon) | Kilépett dolgozók szűrése kész; évközi belépők időarányos szabadsága nincs arányosítva |
| **3. HR Munkaasztal** | `/hr/reports` (Riportok) | **84%** | Igen (4×4 db) | Részben | Valós jelenléti részleg-órák és KSH keresőtisztítás kész; hiányzik a valódi NAV ÁNYK `.xml` (`26T1041`, `2608`) export |
| **4. Dolgozói Életút** | `/hr/recruitment` + `/karrier` (Toborzás & ATS) | **90%** | Igen | Lista nézetben nem | `Aktív`/`Publikus`/`Belső` kapcsolók és belső/publikus karrierportál kész; Lista/Sheet nézetből interjúra váltáskor kimarad az időpontfoglaló modál |
| **4. Dolgozói Életút** | `/hr/onboarding` (Onboarding) | **86%** | Igen (4 db) | Nem | Valós cégadatok (`resolveCompanyDetailsServer`) kész; hiányzik a Pre-boarding link és a próbaidő-értékelés |
| **4. Dolgozói Életút** | `/hr/offboarding` (Offboarding) | **87%** | Igen (4 db) | Nem | Valós cégadatok kész; hiányzik az automatikus Mt. 69. § felmondási idő és Mt. 77. § végkielégítés kalkulátor |
| **5. Eseménynapló** | `/hr/audit` (Eseménynapló) | **88%** | Igen (2×4 db) | Igen (mindkét tabon) | `company_id IS NULL` naplók cégek között átlátszanak; kliensoldali `limit(500)` korlát szerveroldali lapozás helyett |

---

## 1. Modulcsoportok Részletes Kritikus Értékelése

### 1.1. Dolgozói Portál (Employee Self-Service — ESS)

#### A) Áttekintés (`/hr` — [`src/app/hr/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/page.tsx)) — **84%**
- **Meglévő funkciók:** 4 kanonikus `KpiCard` (`Szabadság Marad`, `Felhasznált Nap`, `Függőben Lévő`, `Munkaidő Egyenleg`), adatbázis-perzisztens élő munkaidő- és ebédszünet-számláló ([`time-tracking-card.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/time-tracking-card.tsx)), Cafeteria nyilatkozat-tervező ([`cafeteria-declaration.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/cafeteria-declaration.tsx)), egyéni KPI előrehaladás widget ([`employee-kpi-widget.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-kpi-widget.tsx)).
- **Hátralévő kódhibák és hiányosságok:**
  - Felesleges teljes táblás `hr_esemeny_naplo` lekérdezés (`169-173.` sor).
  - **„Saját Teendőim & Figyelmeztetések” sáv:** Nyugtázásra váró bérjegyzék, aláírásra váró munkaköri leírás / dokumentum, önértékelésre váró KPI, lejáró orvosi alkalmassági.
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

#### D) Jelenlét (`/hr/self-service/time` — [`src/app/hr/self-service/time/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/time/page.tsx)) — **92%**
- **Meglévő funkciók:** Havi jelenléti ív ([`employee-timesheet.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-timesheet.tsx)), éves szabadságkeret- és ünnepnap-ellenőrzött szabadságigénylés ([`leave-request-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/leave-request-dialog.tsx)), jelenlét-korrekció ([`attendance-correction-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/attendance-correction-dialog.tsx)), túlóra-elszámolás ([`overtime-action-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/overtime-action-dialog.tsx)), helyettesítő-beállítás ([`substitute-dialog.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/substitute-dialog.tsx)), kanonikus `TableToolbar`, elutasítási indokok (`elutasitas_oka`), függőben lévő kérelmek visszavonása ([`leave-history-list.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/leave-history-list.tsx)) és PDF igazolások.
- **Ami HIÁNYZIK:**
  - **Orvosi igazolás / táppénzes papír PDF csatolása** betegszabadság igénylésekor.

#### E) Célkitűzések (`/hr/self-service/goals` — [`src/app/hr/self-service/goals/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/goals/page.tsx)) — **88%**
- **Meglévő funkciók:** 4 kanonikus `KpiCard`, 5 fázisú `KpiWorkflowStepper`, strukturált önértékelési űrlap és letisztított kártyafelület ([`employee-kpi-card.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-kpi-card.tsx)).
- **Ami HIÁNYZIK:**
  - **Ciklusválasztó** és **Dolgozói céljavaslat (Bottom-up Goal Proposal)**.

#### F) Fejlődési Tervem — IDP (`/hr/self-service/idp` — [`src/app/hr/self-service/idp/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/idp/page.tsx)) — **85%**
- **Meglévő funkciók:** Kanonikus `KpiCard` sor, tanúsítvány-feltöltés és előnézet, fejlődési napló ([`employee-idp-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/idp/employee-idp-view.tsx)).
- **Hátralévő hiányosságok:**
  - Amikor a dolgozó feltölti a tanúsítványt (`jovahagyasra_var`), nem megy értesítés a vezetőnek, és a tétel nem jelenik meg a `/hr/manager` jóváhagyó paneljén.
  - **Dolgozói képzési igény / tanulmányi szerződés kezdeményezése** és integráció a Vezetői Jóváhagyási Központtal.

#### G) Bérpapírjaim (`/hr/self-service/payroll` — [`src/app/hr/self-service/payroll/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/payroll/page.tsx)) — **88%**
- **Meglévő funkciók:** Havi bérjegyzék-lista pontos HUF bruttó bérbontással (`alapberReszlet`, `szabadsagDij`, `betegszabadsagDij`, `tuloraPotlek`), Mt. 155. § szerinti elektronikus átvételi nyugtázás, PDF előnézet ([`my-payslips-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/my-payslips-view.tsx)).
- **Ami HIÁNYZIK:**
  - **Éves adóigazolások (M30 / SZJA igazolás) letöltése** és **Online Adóelőleg-nyilatkozatok** beküldése.

#### H) Belső Állások (`/hr/self-service/career` — [`src/app/hr/self-service/career/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/career/page.tsx) & `/karrier`) — **95%**
- **Meglévő funkciók:** Belső álláshirdetések, dolgozói ajánlási program és **„Saját pályázataim”** státuszkövető fül, kanonikus `KpiCard` és `TableToolbar` ([`internal-career-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/internal-career-view.tsx), [`my-referrals-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/my-referrals-view.tsx)). A „Pályázás” gomb a `/karrier/[id]?scope=internal` részletoldalra visz előtöltött dolgozói adatokkal és szerveroldali jogosultság-ellenőrzéssel (`resolveCareerEmployeeContext`).

---

### 1.2. Vezetői Nézet (Manager Portal — MSS)

#### A) Csapat Áttekintés (`/hr/manager` — [`src/app/hr/manager/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/manager/page.tsx)) — **83%**
- **Hátralévő kódhibák és hiányosságok:**
  - A helyettesítő vezető nem látja a helyettesített csapat túlóra-igényléseit ([`manager/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/manager/page.tsx#L93-L102)).
  - Hiányzik a felső 4 oszlopos kanonikus `KpiCard` sáv és a `Közvetlen beosztottak` táblázatból a `TableToolbar`.
  - **Egységes Jóváhagyási Központ bővítése** a jóváhagyásra váró **IDP tanúsítványokkal** és **havi jelenlét-zárásokkal**, **Ütközés-figyelmeztetés (Leave Conflict Badge)** és **Beosztotti Gyorsnézet (Quick-View Drawer)**.

#### B) Teljesítményértékelés és Riportok (`/hr/performance` & `/hr/performance/dashboard`) — **86%**
- **Kritikus kódhiba:**
  - A `vezeto` szerepkör a [`performance/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/performance/page.tsx#L14) fájlban látja a cég **összes** dolgozóját, miközben a [`performance/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/performance/actions.ts#L21) blokkolja a `vezeto` szerepkört a KPI-műveletekből (`addKpi`, `editKpi`, `confirmMeeting`, `finalCloseKpi`).

---

### 1.3. HR Munkaasztal, Dolgozói Életút és Eseménynapló

- **Állomány és 360° Karton (`/hr/admin`, `/hr/employee/[id]`) — 84%:** A [`employee-table.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/employee-table.tsx#L226) a szűrt tömb indexéből képezi az `EMP-xxx` törzsszámot; hiányzik a TAJ/Adó/IBAN CDV-validáció és az Eltartottak/Gyermekek nyilvántartása.
- **Szervezeti Felépítés (`/hr/organization`) — 80%:** Elkészült a 4. fül: **Jogosultságkezelő Mátrix** (`/hr/organization?tab=permissions`); kettős igazságforrás a szervezeti egységre (`szervezeti_egyseg_id` vs. `hr_szervezeti_egyseg_id`); az organigram kártyák nem kattinthatók; hiányzik a költséghely kód és a létszámterv (Planned vs. Actual FTE).
- **Műszakbeosztás és Naptár (`/hr/time`) — 82%:** Az elutasított szabadságok és kilépett dolgozók szűrése elkészült; hiányzik a napi 11 órás pihenőidő (Mt. 104. §) ellenőrzése és a munkaidőkeret (Mt. 93. §) kezelése.
- **Bérszámfejtés (`/hr/payroll`) — 84%:** FTE arányosítás, SZÉP-kártya adózás és bruttó bontás javítva; hiányzik a GIRO / SEPA XML banki utalási fájl export és a műszakpótlékok számítása.
- **Munkaügyi Megfelelőség (`/hr/compliance`) — 88%:** Kilépett dolgozók szűrése kész; évközi belépők szabadsága nincs időarányosítva (Mt. 121. §).
- **Riportok (`/hr/reports`) — 84%:** A KSH riportban a részleg-órák valós jelenlétből és távollétből számolódnak; hiányzik a hivatalos NAV ÁNYK `.xml` (`26T1041`, `2608`) export.
- **Toborzás (`/hr/recruitment` & `/karrier`) — 90%:** Háromállású `Aktív`/`Publikus`/`Belső` kapcsolósor és belső/publikus karrierportál fülválasztó kész; Lista nézetből vagy Jelölt Adatlapról „Interjú” státuszra váltva kimarad az időpontfoglaló modál és hibás `/hr/recruitment` link megy ki e-mailben ([`recruitment/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/recruitment/actions.ts#L154)).
- **Onboarding (`/hr/onboarding`) — 86% & Offboarding (`/hr/offboarding`) — 87%:** Valós cégadatok (`resolveCompanyDetailsServer`) bekötve a PDF generátorokba; hiányzik az automatikus Mt. 69. § felmondási idő és Mt. 77. § végkielégítés kalkulátor.
- **Eseménynapló (`/hr/audit`) — 88%:** A `company_id.is.null` szűrő miatt a cégazonosító nélkül rögzített naplók átlátszanak a cégek között ([`audit/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/audit/page.tsx#L392)).

---

## 2. NYITOTT JAVÍTÁSI ÉS FEJLESZTÉSI FELADATLISTA (15 NYITOTT FELADAT)

### P0 — Kritikus Kód-, Jogosultsági és Számítási Hibák
*(Mind a 8 P0 kritikus feladat elvégezve és lezárva!)*

---

### P1 — Félbehagyott Munkafolyamatok Bekötése és UI/UX Konzisztencia

- [ ] **10. Vezetői Központ (`/hr/manager`) túlóra-helyettesítés, „Ki van ma távol a csapatomból?” áttekintő és Egységes Jóváhagyási Panel bővítése**
  - **Érintett fájlok:** [`src/app/hr/manager/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/manager/page.tsx), [`src/components/hr/unified-approvals-panel.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/unified-approvals-panel.tsx)
  - **Feladat:** *(Az elutasítási link `/hr/self-service/time`-ra javítása, a jóváhagyási értesítés és az `elutasitas_oka` mentése már elkészült a `manager/actions.ts`-ben.)* Hátralévő: helyettesítő vezető számára a túlóra-kérelmek megjelenítése; a jóváhagyásra váró **IDP tanúsítványok** és **havi jelenlét-zárások** megjelenítése az Egységes Jóváhagyási Panelen; 4 kanonikus `KpiCard` a `/hr/manager` tetejére, valamint a „Ki van ma távol a csapatomból?” csapatszintű jelenlét/távollét áttekintés.

- [ ] **13. Profilom (`/hr/self-service/profile`) verziókötött munkaköri nyugtázás, TAJ/Adó/IBAN CDV-validáció és törzsadat-bővítés**
  - **Érintett fájlok:** [`src/app/hr/self-service/profile/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/profile/page.tsx), [`src/components/hr/personal-data-card.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/personal-data-card.tsx), [`src/app/hr/self-service/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/actions.ts)
  - **Feladat:** A munkaköri leírás nyugtázásának hozzákötése az aktív `verzio_id`-hoz; magyar TAJ, adóazonosító jel és bankszámlaszám algoritmikus ellenőrzése; a duplikált „Alapadatok” kártya kiváltása valós személyes törzsadatokkal (lakcím, születési adatok, birtokolt eszközök).

- [ ] **15. Dolgozói Portál Áttekintés (`/hr`) „Saját Teendőim” widget (a fejléc és a zöld hero banner érintetlenül hagyásával)**
  - **Érintett fájl:** [`src/app/hr/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/page.tsx)
  - **Feladat:** Az eredeti fejléc és zöld hero banner megtartása mellett `company_id` szűrés pótlása, valamint kizárólag a dolgozó saját függő teendőinek (nyugtázatlan bérjegyzék, munkaköri leírás, KPI önértékelés) megjelenítése.

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
