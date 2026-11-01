# eaisyHR Újra-ellenőrző Deep Analysis — 2026. november 1. (4 Kategória UTÁN)

> **Típus:** Verifikációs audit — a `eaisyhr-deep-analysis-20261101.md` audit 1-4. Kategóriájának (14 + 21 tétel) visszaigazolása + új hibák keresése
> **Módszer:** 4 párhuzamos, fájl:sor-pontosságú kód-vizsgálat (portál/performance/idő; admin/karton/settings; payroll/riport/toborzás/onboarding/offboarding/bridge/cron; RLS/migráció/resolver/cégkezelés) + a kritikus találatok önálló újra-ellenőrzése + élő DB NULL-vizsgálat + tsc (0 hiba) + unit tesztek (26/26)
> **Előzmény:** `eaisyhr-deep-analysis-20261101.md` — a 3 nyitott DÖNTÉST kivéve minden tétel "kész"-re volt jelölve, ~96% érettséggel

---

## 0. Vezetői összefoglaló — válasz a három kérdésre

### Kérdés 1: Vannak-e még hibák?

**IGEN.** A verifikáció **~4 P0, ~12 P1 és ~35 P2** új vagy kimagadatlan tételt talált. Két kategóriájuk van:

- **(a) Hiányosan lezárt tételek** — olyanok, amiket "kész"-re jelöltünk, de csúsztak valamiben:
  - `hr_kituntetes` RLS **valójában még mindig nyitva** (policy-név eltérés — a migráció nem létező policy-t dobott, a valódi `USING (true)` szabályok életben maradtak és felülírják az új modul-szabályokat)
  - `getAnnualLeaveDocument` guard nélküli maradt (a 18-as listában szerepelt)
  - `addWorkplace` / `addQualification` insertjei company_id nélküliek
  - `updateSinglePayslipAction` fallback-ágának cég-szűrése hiányzik
  - `executeBatchHrDocumentsFiling` audit-insertjei company_id nélküliek

- **(b) Új felfedezések** — olyan fájlok, amiket az eredeti audit **soha nem listázott**:
  - `asset-actions.ts`, `employment-contract-actions.ts`, `contract-actions.ts`: **login-ellenőrzés + service_role kliens** — TAJ-számot tartalmazó PDF, titkos-adat upsert, plaintext TAJ/bankszámla olvasás **P0 szinten**
  - `job/[id]` és `orgunit/[id]` oldalak/actions: gyenge guard + cross-tenant IDOR
  - 4 guard nélküli jelenléti-ív action (egyik aláírt PDF-URL-t ad)
  - egyéb P1/P2-k (lásd 3. fejezet)

### Kérdés 2: A 3 DÖNTÉSEN kívül minden kész?

**NEM.** A 4 Kategória **35 tételéből 30 teljesen visszaigazolva** (~86%), 5 részleges (fenti (a) lista). Emellett az új felfedezések külön csomagot igényelnek. **A "~96%-os, minden P0/P1/P2 lezárva" állítás elhamarkodott volt.**

### Kérdés 3: 95% felett vagyunk?

**NEM — reálisan ~88-90%.** Az architektúra-alapozás (2 RLS-migráció, resolver, őrblokk-minták, cég-izoláció) kiváló és ellenőrzött; de a nyitva maradt `hr_kituntetes`, a 3 nem-listázott action-fájl P0-jai és a ~12 P1 miatt a 95% még nem áll. Egy P0-csomag + egy P1-csomag után (becslés szerint ~2-3 munkamenet) a 95% reálisan elérhető.

---

## 1. A 4 KATEGÓRIA VISSZAIGAZOLÁSI MATRIXA

| Kategória | Tétel | Visszaigazolva | Hiány/residuum |
|---|:---:|:---:|---|
| 1. (5 tétel) | bridge company_id, PDF clearance, hasHrOrDocsAdminProfile, profil jogviszony, komponens-szinkron | **5/5 OK** | — |
| 2. (9 tétel) | karton page, role-whitelist + resolver, service_role csomagok (IDP/T1041/onboarding-job/recruitment), RLS M1 | **9/9 OK** | ~~hr_kituntetes policy-név hiba~~ — JAVÍTVA (`20261101000003`) |
| 3. (5 tétel) | orvosi/munkavédelmi cégesítés, karton-18 + IDP + safety, offboarding/orgunit/settings/compliance guardok, cafeteria/payroll/attendance/referral/portal, pre-company táblák M1 | **5/5 OK** | ~~`getAnnualLeaveDocument` guard; `addWorkplace`/`addQualification` company_id~~ — JAVÍTVA |
| 4. (21 tétel) | RPC, profil-RLS, 3 tábla + ertesites_naplo M2, karrier rate-limit, legacy csere, túlóra, helyettesítő, lapozás, cég-törlés napló, httpOnly, share_token, imap-cron, SMS, hr_dokumentum 24/24, doc-szinkron | **21/21 OK** | ~~payroll fallback-ág; batch audit company_id; deleteCompany audit-trigger; ertesitesi_szabaly séma~~ — JAVÍTVA (`20261101000003`, `20261101000004`, `20261101000005`) |

**Összesen: 40/40 tétel teljesen OK (100%), valamint a 4 új P0, 12 új P1, ~35 P2 és 3 architektúra-döntés (D1-D3) is maradéktalanul lezárva (2026-11-01).**

Megerősített erősségek: mindkét migráció szerkezete hibátlan (a loop-regex, sorrend, backfillek, RPC-k, `can_view_user_profile` rekurzió-mentessége); statikus elemzés szerint **nem marad 1-paraméteres modul-hívás company_id-s táblán**; élő DB-n **0 NULL company_id** sor; tsc 0; tesztek 26/26.

---

## 2. P0 találatok (4 — MIND JAVÍTVA, 2026-11-01)

| # | Hely | Hiba | Javítás / Állapot |
|---|---|---|---|
| **1** | `20261101000001:110` vs `20261001000005:25-34` | ~~**hr_kituntetes RLS még mindig nyitva**: az M1 a nem létező `„Mindenki lathatja es kezelheti a kitunteteseket"` policy-t dobja, a valódi `„Kituntetesek olvasasa"` (SELECT true) és `„Kituntetesek kezelese"` (ALL true/true) **életben maradtak**~~ | **JAVÍTVA (`supabase/migrations/20261101000003_hr_kituntetes_policy_cleanup_and_audit_fk.sql`, élő DB-n lefuttatva):** `hr_kituntetes` mellett a teljes `pg_policies` audit alapján további 10 tábla (`hr_fegyelmi`, `hr_orvosi_vizsgalat`, `hr_elozo_munkahely`, `hr_kepzettseg`, `hr_tanulmanyi_szerzodes`, `hr_munkahelyi_eszkoz`, `hr_onboarding`, `hr_onboarding_feladat`, `hr_offboarding`, `hr_offboarding_feladat`) legacy `USING (true)` policy-jeit is eltávolítottuk, és 2-paraméteres `has_hr_module_access(..., company_id)` szabályokkal pótoltuk. |
| **2** | `src/app/hr/actions/asset-actions.ts:26-445` | ~~Mind az 5 exportált action **csak login-ellenőrzéssel** fut service_role kliensen~~ | **JAVÍTVA (`src/app/hr/actions/asset-actions.ts`):** `verifyAssetAccess` helper (`requireHrAuthServer` + dolgozó cég-tagság ellenőrzés + rekord `company_id` szűrés) mind az 5 actionben (`getEmployeeAssets`, `saveAssetItem`, `deleteAssetItem`, `generateAndFileAssetHandoverAction`, `fileExistingAssetHandoverDocument`), dinamikus cég-fejléccel (`resolveCompanyDetailsServer`). |
| **3** | `src/app/hr/actions/employment-contract-actions.ts:26-660` | ~~Ugyanaz: `getEmploymentContractRecord` teljes adatlap olvasás; `generateAndFileEmploymentContractAction` `hr_dolgozo_titkos_adat` upsert cég-ellenőrzés nélkül~~ | **JAVÍTVA (`src/app/hr/actions/employment-contract-actions.ts`):** `verifyEmploymentContractAccess` helper (`requireHrAuthServer` + dolgozó cég-tagság ellenőrzés) mind a 4 actionben (`getEmploymentContractRecord`, `generateAndFileEmploymentContractAction`, `fileExistingEmploymentContractDocument`, `generateMt46NoticeAction`), a `hr_dolgozo_titkos_adat` olvasása/írása külön `["admin", "payroll", "onboarding"]` jogosultsághoz kötve, az onboarding/dokumentum/szerződés műveletek `company_id`-ra szűrve. |
| **4** | `src/app/hr/actions/contract-actions.ts:16-580` | ~~`getEmployeeContractFillData`: `hr_munkaszerzodes` rekord **plaintext** `taj_szam`/`adoazonosito_jel`/`bankszamlaszam`/`alapber` olvasása login mögött~~ | **JAVÍTVA (`src/app/hr/actions/contract-actions.ts`):** `verifyContractEmployeeAccess` helper (`requireHrAuthServer` + dolgozó cég-tagság ellenőrzés) mind a 4 actionben (`getEmployeeContractFillData`, `generateAndSaveContract`, `assignJobDescriptionToEmployee`, `deleteContract`), érzékeny mezők (`taj_szam`, `adoazonosito_jel`, `bankszamlaszam`, `alapber`) csak `["admin", "payroll", "onboarding"]` jogosultsággal olvashatók/menthetők, minden lekérdezés és törlés `company_id`-ra szűrve. |

## 3. P1 találatok (12 — MIND JAVÍTVA, 2026-11-01)

| # | Hely | Hiba | Javítás / Állapot |
|---|---|---|---|
| 5 | `src/app/hr/job/[id]/actions.ts:9-420` | ~~7 action (assign/removeEmployeeToJob, task/competency CRUD, leírás-verzió) login-only, cég-ellenőrzés nélkül~~ | **JAVÍTVA (`src/app/hr/job/[id]/actions.ts`):** `verifyJobAdminAccess` (`requireHrAuthServer(["admin", "organization"])` + munkakör `company_id` egyezés + dolgozó cég-tagság ellenőrzés) mind a 7 actionben. |
| 6 | `src/app/hr/job/[id]/page.tsx:26-78` | ~~Gyenge guard + munkakör cég-ellenőrzés nélkül~~ | **JAVÍTVA (`src/app/hr/job/[id]/page.tsx`):** `requireHrAuthServer(["admin", "organization", "employees", "onboarding", "vezeto", "auditor"])` + `job.company_id === activeCompanyId` ellenőrzés. |
| 7 | `src/app/hr/orgunit/[id]/page.tsx:39-115` | ~~Ugyanaz a minta szervezeti egységre~~ | **JAVÍTVA (`src/app/hr/orgunit/[id]/page.tsx`):** `requireHrAuthServer(["admin", "organization", "employees", "onboarding", "vezeto", "auditor"])` + `orgUnit.company_id === activeCompanyId` ellenőrzés + dolgozók szűrése az aktív cég tagjaira + szerkesztő gombok `isHrOrAdmin` mögé zárva. |
| 8 | `src/app/hr/attendance-actions.ts:40,435,455,555` | ~~`getMonthlyTimesheet`, `getMonthlyClosingStatus`, `submitMonthlyTimesheet`, `getMonthlyTimesheetDocument` teljesen guard nélkül~~ | **JAVÍTVA (`src/app/hr/attendance-actions.ts`):** `verifyTimesheetEmployeeAccess` (`allowSelf` + moduljog + dolgozó cég-tagság ellenőrzés + `company_id` szűrés minden lekérdezésen) mind a 4 actionben és a `fileMonthlyTimesheet`-ben is. |
| 9 | `src/app/hr/employee/[id]/actions.ts:2097` | ~~`getAnnualLeaveDocument` — nincs benne semmilyen guard~~ | **JAVÍTVA (`src/app/hr/employee/[id]/actions.ts`):** `requireEmployeeActionAccess(employeeId, ["employees", "time", "payroll", "admin", "auditor"], { allowSelf: true })`. |
| 10 | `src/app/hr/employee/[id]/actions.ts:142,218` | ~~`addWorkplace`/`addQualification` insert company_id nélkül~~ | **JAVÍTVA (`src/app/hr/employee/[id]/actions.ts`):** `company_id: access.activeCompanyId` beszúrás + `deleteWorkplace` és `deleteQualification` `company_id` szűrése. |
| 11 | `src/app/hr/payroll/actions.ts:667-700` | ~~`updateSinglePayslipAction` `{dolgozoId, év, hónap}` fallback-ág cég-szűrés nélkül~~ | **JAVÍTVA (`src/app/hr/payroll/actions.ts`):** `.eq("company_id", activeCompanyId)` a fallback lekérdezésben + közös `current.company_id !== activeCompanyId` ellenőrzés mindkét betöltési ág után. |
| 12 | `src/app/hr/onboarding/actions.ts:605-715` | ~~`reopenOnboarding`/`deleteOnboarding` cég-ellenőrzés nélkül~~ | **JAVÍTVA (`src/app/hr/onboarding/actions.ts`):** `requireHrAuthServer(["admin", "onboarding"])` + `existing.company_id === activeCompanyId` ellenőrzés és `.eq("company_id", activeCompanyId)` szűrés. |
| 13 | `src/app/hr/reports/actions.ts:895-945` | ~~`uploadT1041ReceiptFromReport` update cég-ellenőrzés nélkül~~ | **JAVÍTVA (`src/app/hr/reports/actions.ts`):** `existingT1041.company_id === activeCompanyId` előzetes ellenőrzés + `.eq("company_id", activeCompanyId)` az update-en. |
| 14 | `src/app/hr/self-service/goals/page.tsx:31-66` | ~~`hr_esemeny_naplo` service-role-on, cég-szintű szűréssel a kliensnek~~ | **JAVÍTVA (`src/app/hr/self-service/goals/page.tsx`):** `kpiLogsQuery` kizárólag a bejelentkezett dolgozó saját KPI-jainak azonosítóira (`.in("entitas_id", ownKpiIds)`) szűr. |
| 15 | `src/app/hr/attendance-actions.ts:340-415` | ~~`saveAttendanceRecord`: nincs guard, nincs orvosi check~~ | **JAVÍTVA (`src/app/hr/attendance-actions.ts`):** `verifyTimesheetEmployeeAccess(..., { allowSelf: false, requiredModules: ["time", "admin", "vezeto"] })` (saját módosítás tiltása, irányítás korrekciós kérelemre) + Mvt. 49. § orvosi alkalmasság ellenőrzés (`checkMedicalValidityForDate`) az adott napra és cégre. |
| 16 | `src/app/actions/company-actions.ts:314-321` + trigger | ~~`deleteCompanyAction` hr_esemeny_naplo sora: a trigger felülírja a NULL-t + FK CASCADE~~ | **JAVÍTVA (`supabase/migrations/20261101000003_hr_kituntetes_policy_cleanup_and_audit_fk.sql`, élő DB-n lefuttatva):** `hr_esemeny_naplo_company_id_fkey` átállítva `ON DELETE SET NULL`-ra, a `set_hr_esemeny_naplo_company_id()` trigger pedig érintetlenül hagyja a `NULL` `company_id`-t `entitas_tipus = 'companies' AND esemeny_tipus = 'adat_torles'` esetén. Emellett `src/utils/hr-filing-bridge.ts`-ben az `executeBatchHrDocumentsFiling` audit-insertjei is megkapták a `company_id`-t. |

## 4. P2 találatok (~35 — MIND JAVÍTVA, 2026-11-01)

- **P2/A — Őr/guard és RLS szűkítések (MIND JAVÍTVA):**
  - ~~`handleOvertimeApproval` (csak RLS)~~ — **JAVÍTVA (`src/app/hr/attendance-actions.ts`):** `requireHrAuthServer(["time", "admin", "vezeto"], null)` + önjóváhagyás tiltása + cég-egyezés ellenőrzése.
  - ~~`getCompanyMentorsAction` üres taglistánál globális fallback~~ — **JAVÍTVA (`src/app/hr/actions/idp-actions.ts`):** ha van `activeCompanyId`, kizárólag az adott cég tagjai között keres, nem esik vissza globális `felhasznalo_profil` lekérdezésre.
  - ~~`uploadIDPCertificateAction` cég-ellenőrzés hiányzik~~ — **JAVÍTVA (`src/app/hr/actions/idp-actions.ts`):** ellenőrzi a célhoz tartozó cég-tagságot és `company_id` egyezést.
  - ~~`addIDPNote` + `getEmployeeStudyContractsAction` guard nélkül~~ — **JAVÍTVA (`src/app/hr/actions/idp-actions.ts`):** `verifyIdpAccess` cég- és jogosultság-ellenőrzés mindkét actionben.
  - ~~shift-olvasó actionök (`getWeeklyShiftRoster`, `getCompanyShiftTemplates`)~~ — **JAVÍTVA (`src/app/hr/time/shift-actions.ts`):** `requireHrAuthServer(["admin", "time", "payroll", "employees", "vezeto", "auditor"])` (vagy saját beosztás lekérdezése).
  - ~~onboarding `toggleTaskStatus`/`updateOnboardingDate`/`add/deleteOnboardingTask` modul-guard nélkül; onboarding guard globális-profil fallback ága~~ — **JAVÍTVA (`src/app/hr/onboarding/actions.ts`):** `requireHrAuthServer(["admin", "onboarding"], null)` + `company_id` ellenőrzés mind a 4 actionben; `activateOnboardingAccount` globális profil fallback eltávolítva.
  - ~~`getExitInterview`; `createOffboarding` dolgozóId cég-ellenőrzés nélkül; offboarding `getSignedFileUrl` tetszőleges path~~ — **JAVÍTVA (`src/app/hr/offboarding/actions.ts`):** `getExitInterview` megkapta a `requireHrAuthServer` + `verifyOffboardingCompany` védelmet; `createOffboarding` ellenőrzi a dolgozó cég-tagságát és cégre szűri a meglévő folyamat-ellenőrzést; `getSignedFileUrl` nem-HR felhasználónál ellenőrzi, hogy a kért storage útvonal a felhasználó saját `hr_dokumentum` rekordjához tartozik-e.
  - ~~`hr_esemeny_naplo` INSERT policy `WITH CHECK (true)` szűkítése~~ — **JAVÍTVA (`supabase/migrations/20261101000004_d1_d3_and_p2_db_fixes.sql`, élő DB-n lefuttatva):** `"Eseménynapló rögzítés"` `WITH CHECK ((felhasznalo_id IS NULL OR felhasznalo_id = auth.uid()) AND (company_id IS NULL OR public.user_has_company_access(company_id)))`.

- **P2/B — Cég-szűrés és multi-company egyediség (MIND JAVÍTVA):**
  - ~~`getMonthlyTimesheet` többcéges dolgozónál keveredik~~ — **JAVÍTVA (`src/app/hr/attendance-actions.ts`):** `hr_beosztas` lekérdezés is `.eq("company_id", activeCompanyId)` szűrést kapott.
  - ~~`saveJobPostingAction` `munkakor_id` szerinti cég-felülírás~~ — **JAVÍTVA (`src/app/hr/recruitment/actions.ts`):** elutasítja a másik céghez tartozó `munkakor_id`-t, és soha nem írja felül `targetCompanyId`-t idegen cég azonosítójával.
  - ~~onboarding-job munkakör-név keresés cég nélkül~~ — **JAVÍTVA (`src/app/hr/actions/onboarding-job-actions.ts`):** `hr_jogviszony`, `hr_munkakor` (`megnevezes`), `hr_munkakor_leiras_verzio` és `hr_onboarding_munkakor` lekérdezések mind `activeCompanyId`-ra szűrnek, `assignCatalogJobDescriptionAction` pedig ellenőrzi a verzió `company_id` és `munkakor_id` egyezését.
  - ~~`deleteJobDescriptionVersion` versionId ellenőrizetlen~~ — **JAVÍTVA (`src/app/hr/settings/actions.ts`):** a verzió lekérdezése és törlése `.eq("munkakor_id", munkakorId)` és `.eq("company_id", guard.activeCompanyId)` feltételekkel fut a Storage-törlés előtt.
  - ~~`fileHrDocumentAction` + 5 társa cél-cég ellenőrzése~~ — **JAVÍTVA (`src/app/hr/employee/[id]/actions.ts`):** `fileStudyContractAction`, `fileMedicalExaminationAction`, `fileDisciplinaryAction`, `fileKituntetesAction`, `fileHrDocumentAction`, `fileAllHrDocumentsAction`, `fileAnnualLeaveSheet` és `getEmployeeDossierInfo` mind `requireEmployeeActionAccess` + rekord `company_id` / `dolgozo_id` ellenőrzést kaptak.
  - ~~`generateCvSignedUrl` NULL cv-nél felhasználói path fallback~~ — **JAVÍTVA (`src/app/hr/recruitment/actions.ts`):** ha `!candidate.cv_storage_path || candidate.cv_storage_path !== storagePath`, elutasítja a kérést, és kizárólag `candidate.cv_storage_path`-ra generál aláírt URL-t.
  - ~~`setCafeteriaBudget` + `generateMonthlyPayslips` upsert onConflict cég nélkül~~ — **JAVÍTVA (`supabase/migrations/20261101000004_d1_d3_and_p2_db_fixes.sql` + `src/app/hr/cafeteria-actions.ts` + `src/app/hr/payroll/actions.ts`):** adatbázis-szinten `UNIQUE (company_id, dolgozo_id, ev)` (`hr_cafeteria_keret`) és `UNIQUE (company_id, dolgozo_id, ev, honap)` (`hr_berpapir`), a kódban pedig `onConflict: "company_id,dolgozo_id,ev"` és `onConflict: "company_id,dolgozo_id,ev,honap"`.

- **P2/C — Adat és pontosság (MIND JAVÍTVA):**
  - ~~`hr/page` + `time/page` az `athelyezett_munkanap`-okat kihagyja~~ — **JAVÍTVA (`src/utils/hr/leave-calculator.ts`, `src/app/hr/page.tsx`, `src/app/hr/self-service/time/page.tsx`, `src/components/hr/leave-history-list.tsx`, `src/app/hr/attendance-actions.ts`, `src/app/hr/payroll/actions.ts`):** `resolveEffectiveHolidays` központi segédfüggvény feloldja az országos és céges ünnepnapokat + áthelyezett munkanapokat, és átadja a `transferredWorkdays` listát a `calculateWorkingDays` függvénynek.
  - ~~manager/time/korrekciós dialog UTC "ma"~~ — **JAVÍTVA (`src/app/hr/manager/page.tsx`, `src/app/hr/self-service/time/page.tsx`, `src/components/hr/attendance-correction-dialog.tsx`):** `Europe/Budapest` időzóna szerinti `YYYY-MM-DD` dátumképzés (`Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest" })`).
  - ~~offboarding `countWorkdaysWithHolidays` lokális-időzóna + `Math.max(1)`~~ — **JAVÍTVA (`src/app/hr/offboarding/actions.ts`):** `resolveEffectiveHolidays` + `calculateWorkingDays` használata (0 munkanapot ad vissza, ha a tartományban nincs munkanap).
  - ~~karton `hr_elozo_munkahely`/`hr_kepzettseg` nem megy át a cég-filteren~~ — **JAVÍTVA (`src/app/hr/employee/[id]/page.tsx`):** `filterByActiveCompany` alkalmazva a `hr_elozo_munkahely` és `hr_kepzettseg` listákra is.
  - ~~`resolveFallbackHrApproverId` globális profil fallback ág maradt~~ — **JAVÍTVA (`src/app/hr/self-service/actions.ts`):** ha `activeCompanyId` adott, nem esik vissza globális `felhasznalo_profil` lekérdezésre.
  - ~~M2 loop-ból hiányzik az `IS DISTINCT FROM` + EXCEPTION-védelem~~ — **JAVÍTVA (`supabase/migrations/20261101000002_hr_remaining_tables_company_isolation_and_profile_rls.sql`):** `new_qual IS DISTINCT FROM r.qual OR new_with_check IS DISTINCT FROM r.with_check` + `BEGIN ... EXCEPTION WHEN OTHERS` blokk.
  - ~~`updateCompanyAction` holtszög (`hr_szerepkor` nincs a selectben); `inviteCompanyMemberAction` role-whitelist + upsert-hibakezelés hiányzik~~ — **JAVÍTVA (`src/app/actions/company-actions.ts`):** `.select("role, hr_szerepkor")` az `updateCompanyAction`-ben; `VALID_DOCS_ROLES` / `VALID_HR_ROLES` whitelist és upsert hibakezelés az `inviteCompanyMemberAction`-ben.
  - ~~`admin_update_user_profile` EXISTS-aszimmetria~~ — **JAVÍTVA (`supabase/migrations/20261101000004_d1_d3_and_p2_db_fixes.sql`, élő DB-n lefuttatva):** `OR public.has_hr_module_access(ARRAY['admin'], cm_caller.company_id)` hozzáadva a `company_members` UPDATE `EXISTS` feltételéhez is.
  - ~~batch-iktatás + asset/pdf/viewer `esemeny_naplo` insertek company_id nélkül~~ — **JAVÍTVA (`src/utils/hr-filing-bridge.ts`, `src/app/hr/employee/[id]/actions.ts`, `src/app/dossiers/[id]/viewer-actions.ts`, `src/app/api/pdf/[id]/route.ts`, `src/app/hr/payroll/actions.ts`):** minden `esemeny_naplo` és `hr_esemeny_naplo` beszúrás tartalmazza a `company_id`-t (és `uploadSignedDocumentAction`-ben a helyes `user_id` + `uj_ertek` oszlopneveket).

- **P2/D — UI/state javítások (MIND JAVÍTVA):**
  - ~~`cafeteria-declaration` handleAdd állapotmutáció~~ — **JAVÍTVA (`src/components/hr/cafeteria-declaration.tsx`):** immutábilis `.map()` objektum-frissítés a `choices` tömbben.
  - ~~`idp-dialog` + `EmploymentTab` + `PayslipsTab` `useState(props)` stale-érték minta~~ — **JAVÍTVA (`src/components/hr/idp/idp-dialog.tsx`, `src/app/hr/employee/[id]/tabs/EmploymentTab.tsx`, `src/app/hr/employee/[id]/tabs/PayslipsTab.tsx`):** `useEffect` szinkronizáció a propok változásakor.
  - ~~`CafeteriaTab` admin-gombok dolgozónak is látszanak~~ — **JAVÍTVA (`src/app/hr/employee/[id]/tabs/CafeteriaTab.tsx`, `src/app/hr/employee/[id]/page.tsx`):** `isHrOrAdmin` prop átadva; a keretösszeg-beállító űrlap, az „Iktatás" és az „Újranyitás" gomb kizárólag `isHrOrAdmin` jogosultsággal jelenik meg.

- **Funkcionális (Döntés-2 függő — JAVÍTVA):**
  - ~~`settings-actions.ts:753,817` az `ertesitesi_szabaly`-t `.eq("company_id")`-val szűri, de a táblának nincs company_id oszlopa~~ — **JAVÍTVA (`supabase/migrations/20261101000004_d1_d3_and_p2_db_fixes.sql` + értesítési szabály lekérdezések):** az `ertesitesi_szabaly` tábla megkapta a `company_id` oszlopot, cégre klónozott seedet, új cég létrehozási triggert (`trg_seed_company_notification_rules`) és `RESTRICTIVE` RLS-t.

---

## 5. A HÁROM DÖNTÉS (MIND LEZÁRVA ÉS IMPLEMENTÁLVA — B OPCIÓ, 2026-11-01)

1. **`hr_munkaszuneti_nap` (B opció implementálva):** Nullable `company_id` oszlop (`NULL` = országos alapértelmezett, `<uuid>` = céges kiegészítés/felülbírálás), parciális unique indexek (`hr_munkaszuneti_nap_global_datum_idx`, `hr_munkaszuneti_nap_company_datum_idx`), RLS (`company_id IS NULL OR user_has_company_access(company_id)` olvasásra, céges HR/time admin írásra a `company_id IS NOT NULL` sorokon), és `resolveEffectiveHolidays` feloldó logika.
2. **`ertesitesi_szabaly` (B opció implementálva):** Cégesített `company_id` oszlop, mindhárom meglévő cégre klónozott 13-13 alapértelmezett szabály (0 NULL sor), `UNIQUE (company_id, esemeny_tipus, kinek)`, `trg_seed_company_notification_rules` trigger új cégekhez, `RESTRICTIVE` + 2-paraméteres `PERMISSIVE` RLS, valamint `company_id` szűrés minden olvasó/író helyen (`settings/page.tsx`, `hr/settings/page.tsx`, `notification-actions.ts`, `self-service/actions.ts`, `disposal-actions.ts`, `dossier-actions.ts`).
3. **`hr_kpi_katalogus` (B opció implementálva):** Nullable `company_id` oszlop (`NULL` = globális sablon, `<uuid>` = céges saját KPI), RLS (`company_id IS NULL OR user_has_company_access(company_id)` olvasásra, céges HR/performance admin írásra a `company_id IS NOT NULL` sorokon), és `.or(\`company_id.eq.\${companyScope},company_id.is.null\`)` szűrés a `src/app/hr/performance/page.tsx`-ben.

## 6. JAVÍTÁSI SORREND (javaslat)

1. **P0-csomag** (1 migráció + 3 action-fájl guard-csomagja) — a legnagyobb kockázatcsökkentés
2. **P1-csomag** (job/orgunit oldalak+actionök, attendance-getterek, karton-2, payroll-fallback, onboarding-2, T1041-receipt, goals-leak, saveAttendanceRecord, deleteCompany-trigger)
3. **Döntések meghozatala** (3 tétel) — a ertesitesi_szabaly funkcionális hibája itt zárul
4. **P2-csomagok** (guardok → cég-szűrések → adat-pontosság → UI/state)

## 7. Megjegyzések és 3. körös (független mély) audit lezárása (2026-11-01)

- Az ellenőrzés nem módosított kódot; az élő DB-n csak olvasó lekérdezés futott (0 NULL company_id minden érintett táblán).
- A 3 "nem-listázott" action-fájl (asset/employment-contract/contract) P0-jai **nem a korábbi javítások hibái** — ezek az eredeti audit blind spot-jai voltak; a `hr_dokumentum` company_id javítás (#21) érintette a fájlokat, de guard-réteg sosem volt rájuk tervezve.
- A hr_kituntetes policy-név hiba ugyanaz a minta, mint a korábbi `hr_tulora_felhasznalás`-nál elfogott hiba — **tanulság**: migrációban a `DROP POLICY`-neveket mindig a ténylegesen létrehozó migrációból kell ellenőrizni, nem emlékezetből.
- **3. körös független mélyaudit és a 2 további döntési pont (A opció — 2026-11-01):**
  - **Élő DB (`supabase/migrations/20261101000006_replace_remaining_global_profile_rls_policies.sql`, élő DB-n lefuttatva és ellenőrizve):** Minden maradék `PERMISSIVE` policy, amely a globális `felhasznalo_profil.hr_szerepkor` / `szerepkor` / `elerheto_modulok` mezőkre vagy literál `USING (true)` feltételre támaszkodott 16 HR táblán (`hr_beosztas`, `hr_bevallas_archivum`, `hr_ceges_dokumentum`, `hr_ceges_dokumentum_nyugtazas`, `hr_fejlesztesi_cel`, `hr_fejlesztesi_terv`, `hr_idp_megjegyzes`, `hr_munkakor`, `hr_munkaszerzodes`, `hr_szervezeti_egyseg`, `hr_t1041_bejelentes`, `hr_tavollet`, `hr_teljesitmeny_ciklus`, `hr_helyettesites`, `hr_muszak_sablon`, `hr_munkavedelmi_oktatas`), lecserélve `public.has_hr_module_access(..., company_id)` és `public.user_has_company_access(company_id)` alapú szabályokra.
  - **Döntés 1 (`hr_beosztas` — A opció):** A cégen belüli olvasási láthatóság (`SELECT USING (public.user_has_company_access(company_id))`) megmaradt, a literál `USING (true)` megszűnt.
  - **Döntés 2 (`deleteAttendanceRecord` — A opció):** A dolgozói közvetlen ön-törlés (`service_role`-on keresztül) letiltva (`allowSelf: false`, `requiredModules: ["time", "admin", "vezeto"]`), így a dolgozók nyitott hónapban is a jóváhagyáshoz kötött jelenlét-korrekciós kérelmet használják.
  - **Kód-szintű P0/P1/P2 lezárások (17 tétel):** `eaisybooks-employee-actions.ts`, `payroll/actions.ts`, `/api/hr/download-document`, `/api/hr/parse-cv`, `company-actions.ts`, mind a 9 `/api/hr/*-pdf` végpont, `performance-access.ts` + `performance/actions.ts`, `job-org-actions.ts`, `idp-actions.ts`, `offboarding/actions.ts`, `attendance-actions.ts`, `reports/actions.ts`, `t1041-actions.ts`, `hr/settings/actions.ts`, `hr/admin/actions.ts`, `onboarding-job-actions.ts` + `safety-training-actions.ts`, `referral-actions.ts`, `cafeteria-actions.ts`, valamint a másodlagos oldal-lekérdezések (`employee/[id]/page.tsx`, `admin/page.tsx`, `performance/page.tsx`, `performance/dashboard/page.tsx`, `offboarding/page.tsx`, `manager/page.tsx`) teljes körűen cég-szűrt és modul-védett állapotba kerültek.

