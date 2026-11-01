# eaisyHR Rendszerszintű Mélyelemzés — 2026. november 1. (2. kör, 33 javítás UTÁN)

> **Típus:** Deep Analysis audit (csak olvasó kódelemzés — a 2026.10.29-i audit 33 javítása UTÁNI állapot + Docs↔HR integrációs réteg teljes vizsgálata)
> **Hatókör:** a teljes eaisyHR modul + a Docs↔HR integrációs pontok (hr-filing-bridge, /api/pdf HR ága, T1041 ↔ irat, cégkezelés, szerepkör-feloldás, RLS-migrációk)
> **Módszer:** 4 párhuzamos, fájl:sor-pontosságú kódbukta­tás (portál/performance/műszak; admin/settings/karton; payroll/riport/compliance/toborzás/onboarding/offboarding; RLS/szerepkör/cégkezelés). **Élő teszt nem történt** — a P0-jelölteket javítás előtt érdemes manuálisan megerősíteni. A megrendelő korábbi elvetéseit tiszteletben tartva (l. 9. fejezet).
> **Előzmény:** `eaisyhr-deep-analysis-20261029.md` — **33 javított + 4 elvetett** találat. Ez a dokumentum NEM helyettesíti, hanem kiegészíti.

---

## ELKÉSZÜLT ÉS LEZÁRT JAVÍTÁSOK EBBEN A DOKUMENTUMBAN (2026-11-01 — 1. Kategória: UI-on is reprodukálható hibák)

> Kapcsolódó architektúra döntések: [A-099](./architecture/decisions/A-099-hr-filing-bridge-company-isolation-and-pdf-clearance-alignment.md), [A-100](./architecture/decisions/A-100-hr-rls-company-scoped-module-access-and-service-role-guards.md), [A-101](./architecture/decisions/A-101-hr-company-scoped-medical-safety-and-remaining-action-guards.md)

- [x] ~~**1. [2.3 / 4.2 #1, #4, #5] `hr-filing-bridge` — `company_id` nélküli insertek és többcéges `.maybeSingle()` hiba javítása**~~
  - **Érintett fájlok:** [`src/utils/hr-filing-bridge.ts`](../src/utils/hr-filing-bridge.ts), [`src/utils/__tests__/hr-filing-bridge.test.ts`](../src/utils/__tests__/hr-filing-bridge.test.ts)
  - **Megvalósítás:** Bevezetve a `resolveFilingCompanyId` segédfüggvény. A `findEmployeeDossier`, az `irattari_terv` (`3.1`) és a `szervezeti_egyseg` (`%HR%`) lekérdezések mostantól cégre szűrnek (`.limit(1).maybeSingle()`), és minden létrehozott `ugy`, `ugyirat`, `irat`, `esemeny_naplo` és `hr_esemeny_naplo` rekord megkapja a feloldott `company_id`-t mind az egyedi (`executeHrDocumentFiling`), mind a kötegelt (`executeBatchHrDocumentsFiling`) iktatásnál.

- [x] ~~**2. [3.3 P1 / 4.2 #2, #3] `/api/pdf/[id]` és `viewer-actions.ts` — Iktatott `bizalmas` HR dokumentumok `403 Forbidden` hiba és `fileId` fallback javítása**~~
  - **Érintett fájlok:** [`src/app/dossiers/[id]/viewer-actions.ts`](../src/app/dossiers/[id]/viewer-actions.ts), [`src/app/api/pdf/[id]/route.ts`](../src/app/api/pdf/[id]/route.ts)
  - **Megvalósítás:** Az eaisyDocs Ügyiratok (`/dossiers/[id]`) oldalon megnyitott `bizalmas` HR dokumentumoknál a `getDocumentSignedUrl` és a `GET /api/pdf/[id]` mostantól ellenőrzi a dokumentum cégében érvényes HR szerepkört és moduljogokat (`getActiveCompanyMemberRolesServer` + `isUserAuthorizedForHrView`), így a nem-Docs-admin HR-vezetők és HR-munkatársak is megtekinthetik az előnézetet. A `/api/pdf/[id]` fallback lekérdezéséből eltávolítva a hibás `id.eq.${fileId}` ág, kizárólag `.eq("irat_id", iratId)` szűrés maradt.

- [x] ~~**3. [3.2 P1] `hasHrOrDocsAdminProfile` (`hr/employee/[id]/actions.ts`) — Jogosultsági Mátrix (`company_members`) támogatása a 360° karton iktatási műveleteinél**~~
  - **Érintett fájl:** [`src/app/hr/employee/[id]/actions.ts`](../src/app/hr/employee/[id]/actions.ts)
  - **Megvalósítás:** A dolgozói karton 7 iktató művelete és az aláírt példány feltöltése (`hasHrOrDocsAdminProfile`) mostantól aszinkron módon ellenőrzi a `getActiveCompanyMemberRolesServer()` és `isUserAuthorizedForHrView` eredményét is (beleértve az `employees` modulkulcsot), nem csak a globális `felhasznalo_profil` táblát.

- [x] ~~**4. [3.1 P2] Saját profil (`/hr/self-service/profile`) — Többcéges `hr_jogviszony` lekérdezés (`PGRST116`) javítása**~~
  - **Érintett fájl:** [`src/app/hr/self-service/profile/page.tsx`](../src/app/hr/self-service/profile/page.tsx)
  - **Megvalósítás:** A `hr/self-service/profile/page.tsx` lekéri az `activeCompanyId`-t, és `.eq("company_id", activeCompanyId)` valamint `.order("belepes_datuma", { ascending: false }).limit(1).maybeSingle()` szűréssel kérdezi le az aktív jogviszonyt, így többcéges dolgozónál nem dob hibát és nem ír „Munkakör nincs beállítva" szöveget.

- [x] ~~**5. [3.1 P1 / P2] Cégváltáskori kliens state beragadás (`CafeteriaDeclaration`, `TimeTrackingCard`) és jelenlét-korrekció `company_id` mentés (`submitAttendanceCorrection`) javítása**~~
  - **Érintett fájlok:** [`src/components/hr/cafeteria-declaration.tsx`](../src/components/hr/cafeteria-declaration.tsx), [`src/components/hr/time-tracking-card.tsx`](../src/components/hr/time-tracking-card.tsx), [`src/app/hr/self-service/actions.ts`](../src/app/hr/self-service/actions.ts)
  - **Megvalósítás:** `useEffect` prop-szinkron hozzáadva a `CafeteriaDeclaration` és `TimeTrackingCard` komponensekhez cégváltáshoz; a `submitAttendanceCorrection` pedig átadja a `company_id: activeCompanyId` mezőt a `hr_jelenlet_korrekcio` beszúrásakor.

### 2. Kategória (2026-11-01): UI-on és szerveroldalon (`service_role` + RLS) javított jogosultsági és cég-izolációs hibák

- [x] ~~**6. [3.2 P1 / P2] 360° Dolgozói Karton (`/hr/employee/[id]/page.tsx`) — Munkakör-választó cég-szűrés, `isHrOrAdmin` `employees` modul támogatás, és `Előzmények` (Audit) fül védelme**~~
  - **Érintett fájl:** [`src/app/hr/employee/[id]/page.tsx`](../src/app/hr/employee/[id]/page.tsx)
  - **Megvalósítás:** A választható munkakörök (`hr_munkakor`) lekérdezése mostantól `.eq("company_id", activeCompanyId)` szűréssel fut; az `isHrOrAdmin` az `isUserAuthorizedForHrView(currentHrRole, ["admin", "employees"], currentHrModules)` ellenőrzést használja a legacy globális lista helyett; az `Előzmények` (`audit`) fül pedig kizárólag `(isHrOrAdmin || isAudit)` jogosultsággal jelenik meg.

- [x] ~~**7. [2.4 / 2.5 / 3.2 P1] Többcéges szerepkör-felülírás megakadályozása és `role` / `docs_szerepkor` / `hr_szerepkor` whitelist (`company-actions.ts`, `hr/settings/actions.ts`, `hr/permissions/actions.ts`, `company-role-resolver.ts`)**~~
  - **Érintett fájlok:** [`src/app/actions/company-actions.ts`](../src/app/actions/company-actions.ts), [`src/app/hr/settings/actions.ts`](../src/app/hr/settings/actions.ts), [`src/app/hr/permissions/actions.ts`](../src/app/hr/permissions/actions.ts), [`src/utils/hr/company-role-resolver.ts`](../src/utils/hr/company-role-resolver.ts)
  - **Megvalósítás:** Az `updateCompanyMemberRoleAction` szigorú `"admin" | "member"` whitelistet, valamint a `docs_szerepkor` és `hr_szerepkor` értékekre futásidejű enum-validációt kapott; a globális `felhasznalo_profil.hr_szerepkor` / `docs_szerepkor` mezőt az `updateCompanyMemberRoleAction`, `updateEmployeePermissionsAction`, `updateEmployeeInfo` és `removeEmployeeFromHR` kizárólag akkor írja át, ha a felhasználó legfeljebb 1 cégnek tagja (`membershipCount <= 1`); meghívókódos csatlakozásnál (`joinCompanyByTokenAction`) a `company_members` explicit `munkavallalo` / `ugyintezo` szerepkört kap; a `resolveUserCompanyRoles` pedig nem szivárogtatja át más cégből a globális `hr_modulok` listát, ha a cégben explicit szerepkör van megadva.

- [x] ~~**8. [3.2 P0 / 3.3 P0, P1] `service_role` Server Action-ök jogosultság- és cég-ellenőrzése (`idp-actions.ts`, `t1041-actions.ts`, `onboarding-job-actions.ts`, `recruitment/actions.ts`, `onboarding/actions.ts`, `reports/actions.ts`)**~~
  - **Érintett fájlok:** [`src/app/hr/actions/idp-actions.ts`](../src/app/hr/actions/idp-actions.ts), [`src/app/hr/actions/t1041-actions.ts`](../src/app/hr/actions/t1041-actions.ts), [`src/app/hr/actions/onboarding-job-actions.ts`](../src/app/hr/actions/onboarding-job-actions.ts), [`src/app/hr/recruitment/actions.ts`](../src/app/hr/recruitment/actions.ts), [`src/app/hr/onboarding/actions.ts`](../src/app/hr/onboarding/actions.ts), [`src/app/hr/reports/actions.ts`](../src/app/hr/reports/actions.ts)
  - **Megvalósítás:**
    - `idp-actions.ts`: `getSignedCertificateUrl` (ellenőrzi a `hr_fejlesztesi_cel`, `hr_kepzettseg` és `hr_dokumentum` rekordokat is cég-szűréssel, és blokkolja az idegen `irat_files` útvonalakat), `approveDevelopmentGoal` és `rejectDevelopmentGoal` auth- és cég-ellenőrzéssel ellátva.
    - `t1041-actions.ts`: `verifyT1041Access` (`requireHrAuthServer` + cég-ellenőrzés) bekötve mind az 5 függvénybe (`getT1041Data`, `saveT1041Record`, `generateT1041PdfAction`, `uploadT1041ReceiptAction`, `fileExistingT1041Document`).
    - `onboarding-job-actions.ts`: `verifyOnboardingJobAccess` (`requireHrAuthServer` + cég-ellenőrzés) bekötve mind az 5 függvénybe (`getOnboardingJobData`, `assignCatalogJobDescriptionAction`, `generateJobDescriptionPdfAction`, `uploadCustomJobDescriptionAction`, `fileExistingJobDescriptionDocument`).
    - `recruitment/actions.ts`: Cég-tulajdonjog (`company_id === auth.activeCompanyId`) ellenőrzés hozzáadva a `deleteCandidate` (`.or("company_id.eq.X,company_id.is.null")` törléssel a régi `NULL` céges rekordok támogatására), `generateCvSignedUrl` (path-egyezés ellenőrzéssel), `updateCandidateNote`, `saveJobPostingAction` (update ág), `updateJobPostingFlagsAction` és `assignCandidateToPostingAction` műveletekhez.
    - `onboarding/actions.ts` (`activateOnboardingAccount`) és `settings/actions.ts` (`updateEmployeeInfo`): Cég-egyezés ellenőrzés hozzáadva.
    - `reports/actions.ts` (`getT1041ReportData` és `loadHrMasterData`): `requireHrAuthServer(["reports", "payroll", "admin", "auditor"])` és azonnali üres visszatérés, ha `!auth.authorized`.

- [x] ~~**9. [2.1 / 2.2 / 3.4 P0] Adatbázis RLS migráció: `has_hr_module_access(p_modules, p_company_id)` cég-szűkítés az ÖSSZES (~35+) HR táblán és RPC-ben, valamint a 3 nyitott tábla (`hr_kituntetes`, `hr_berpapir`, `hr_elozo_munkahely`) lezárása**~~
  - **Érintett fájl:** [`supabase/migrations/20261101000001_hr_rls_hardening_and_company_scoped_module_access.sql`](../supabase/migrations/20261101000001_hr_rls_hardening_and_company_scoped_module_access.sql)
  - **Megvalósítás:** Létrehozva a 2 paraméteres `public.has_hr_module_access(p_modules text[], p_company_id uuid)` függvény; a `hr_kituntetes`, `hr_berpapir` és `hr_elozo_munkahely` táblák megkapták a `company_id` oszlopot (backfillel és indexszel) valamint a `company_isolation_restrictive` (`AS RESTRICTIVE`) és modul-alapú RLS szabályokat; továbbá egy dinamikus `DO $$` `ALTER POLICY` blokk a `pg_policies` katalóguson végighaladva az **összes (~35+) `company_id` oszloppal rendelkező tábla** meglévő RLS szabályában átírta az 1 paraméteres `has_hr_module_access(ARRAY[...])` hívást a 2 paraméteres `has_hr_module_access(ARRAY[...], company_id)` változatra, és a `get_decrypted_hr_data` / `update_decrypted_hr_data` RPC-k is cég-szűrt `has_hr_module_access(..., v_company_id)` ellenőrzést kaptak.

### 3. Kategória (2026-11-01): Összes hátralévő P1/P2 Server Action őrblokk, cégszintű Orvosi & Munkavédelmi oktatás szűrés, üzleti logika és pre-company táblák lezárása

- [x] ~~**10. [3.1 / 3.2 / 3.3 P1] Orvosi alkalmassági vizsgálat (Mvt. 49. §) és Munkavédelmi oktatás (Mvt. 55. §) szigorú cégszintű (munkáltatónkénti) elkülönítése minden nézetben és műveletben**~~
  - **Érintett fájlok:** [`src/app/hr/self-service/profile/page.tsx`](../src/app/hr/self-service/profile/page.tsx), [`src/app/hr/employee/[id]/page.tsx`](../src/app/hr/employee/[id]/page.tsx), [`src/app/hr/compliance/compliance-actions.ts`](../src/app/hr/compliance/compliance-actions.ts), [`src/app/hr/time/shift-actions.ts`](../src/app/hr/time/shift-actions.ts), [`src/app/hr/self-service/actions.ts`](../src/app/hr/self-service/actions.ts), [`src/app/hr/actions/safety-training-actions.ts`](../src/app/hr/actions/safety-training-actions.ts)
  - **Megvalósítás:** Mind a munkaköri orvosi alkalmasság, mind a munkavédelmi oktatás munkáltatóhoz és munkakörhöz kötött (a `hr_orvosi_vizsgalat` és `hr_munkavedelmi_oktatas` táblákon eddig is szerepelt a `company_id`, pl. Nagy Dánielnél a ThinkAI Kft. `e5bfda61-81f9-475a-9bd9-ccee7bc8aba8` azonosítója). Mostantól a Dolgozói Portál (`Profilom`), a 360° Dolgozói Karton, a Compliance Dashboard, a Műszaktervező (`getWeeklyShiftRoster`, `saveShiftAssignmentAction`, `copyPreviousWeekRosterAction`) és a Becsekkolás (`toggleCheckIn`) is `.eq("company_id", activeCompanyId)` szűréssel olvassa a `hr_orvosi_vizsgalat` és `hr_munkavedelmi_oktatas` rekordokat, és a `hr_dolgozo_adatlap.orvosi_alkalmassag_ervenyesseg` fallback mezőt kizárólag akkor használja, ha `adatlap.company_id === activeCompanyId`.

- [x] ~~**11. [3.2 P1 / P2] 360° Dolgozói Karton (`hr/employee/[id]/actions.ts` és `page.tsx`), IDP (`idp-actions.ts`) és Munkavédelmi oktatás (`safety-training-actions.ts`) teljes auth-guard és `company_id` védelem**~~
  - **Érintett fájlok:** [`src/app/hr/employee/[id]/actions.ts`](../src/app/hr/employee/[id]/actions.ts), [`src/app/hr/employee/[id]/page.tsx`](../src/app/hr/employee/[id]/page.tsx), [`src/app/hr/actions/idp-actions.ts`](../src/app/hr/actions/idp-actions.ts), [`src/app/hr/actions/safety-training-actions.ts`](../src/app/hr/actions/safety-training-actions.ts)
  - **Megvalósítás:**
    - `hr/employee/[id]/actions.ts`: `requireEmployeeActionAccess` őrblokk + cég-tulajdonjog ellenőrzés és `company_id` mentés bekötve mind a 18 karton-műveletbe (`addWorkplace`, `deleteWorkplace`, `addQualification`, `getQualificationFileUrl`, `deleteQualification`, `addStudyContract`, `deleteStudyContract`, `addOrvosiVizsgalat`, `deleteOrvosiVizsgalat`, `addFegyelmi`, `deleteFegyelmi`, `addKituntetes`, `deleteKituntetes`, `updateGeneralPersonalInfo`, `updateJogviszonyData`, `uploadHrDocument`, `getEmployeeAuditLogs`, `getAnnualLeaveDocument`, `uploadSignedDocumentAction`).
    - `hr/employee/[id]/page.tsx`: Minden beágyazott és párhuzamos lekérdezés (`hr_dokumentum`, `hr_munkavedelmi_oktatas`, `hr_cafeteria_keret`, `hr_cafeteria_valasztas`, `hr_berpapir`, `hr_offboarding`, `hr_tavollet`, `hr_orvosi_vizsgalat`, `hr_fegyelmi`, `hr_kituntetes`, `hr_jogviszony`, `hr_tanulmanyi_szerzodes`) az aktív cégre szűr.
    - `idp-actions.ts`: `requireIdpManagerAuth()` + `company_id` szűrés bekötve a `createDevelopmentPlan`, `deleteDevelopmentPlan`, `closeDevelopmentPlan`, `reopenDevelopmentPlan`, `createDevelopmentGoal`, `updateDevelopmentGoal` és `deleteDevelopmentGoal` műveletekbe.
    - `safety-training-actions.ts`: `requireHrAuthServer` + `company_id` szűrés és mentés bekötve a `getSafetyTrainingRecord`, `generateAndFileSafetyTrainingAction` és `fileExistingSafetyTrainingDocument` műveletekbe.

- [x] ~~**12. [3.2 P1 / 3.3 P1] Offboarding (`hr/offboarding/actions.ts`), Szervezeti egység (`hr/orgunit/[id]/actions.ts`), HR Beállítások (`hr/settings/actions.ts`) és Compliance (`compliance-actions.ts`) őrblokkok**~~
  - **Érintett fájlok:** [`src/app/hr/offboarding/actions.ts`](../src/app/hr/offboarding/actions.ts), [`src/app/hr/orgunit/[id]/actions.ts`](../src/app/hr/orgunit/[id]/actions.ts), [`src/app/hr/settings/actions.ts`](../src/app/hr/settings/actions.ts), [`src/app/hr/compliance/compliance-actions.ts`](../src/app/hr/compliance/compliance-actions.ts)
  - **Megvalósítás:**
    - `offboarding/actions.ts`: `requireHrAuthServer(["offboarding"], null)` és `verifyOffboardingCompany` bekötve az összes feladat-, státusz-, interjú- és PDF-generáló műveletbe (`toggleOffboardingTaskStatus`, `updateOffboardingDate`, `addOffboardingTask`, `deleteOffboardingTask`, `createOffboarding` cégre szűrt meglét-ellenőrzéssel, `closeOffboarding`, `reopenOffboarding`, `resetOffboardingTasks`, `fileSingleOffboardingDocument`, `deleteOffboardingProcess`, `getOffboardingDetailData`, `generateTerminationAgreementAction`, `generateAssetReturnSheetAction`, `saveExitInterview`, `generateExitCertificateAction`).
    - `orgunit/[id]/actions.ts`: `assignEmployeeToOrgUnit` és `removeEmployeeFromOrgUnit` ellenőrzi, hogy a szervezeti egység és a dolgozó is az aktív céghez tartozik.
    - `settings/actions.ts`: `requireHrSettingsAccess()` + `company_id` szűrés bekötve a munkakör-katalógus (`createMunkakor`, `updateMunkakor`, `deleteMunkakor`, `uploadJobDescription`, `deleteJobDescriptionVersion`) és a céges szabályzatok (`getCegesDokumentumokAdmin`, `createCegesDokumentum`, `deleteCegesDokumentum`, `sendAcknowledgmentReminder`) műveleteibe.
    - `compliance-actions.ts`: `requireHrAuthServer(["compliance", "admin", "auditor"], null)` + `.eq("company_id", companyScope)` bekötve mind a 4 compliance lekérdezésbe.

- [x] ~~**13. [3.1 / 3.3 P1 / P2] Cafeteria (`cafeteria-actions.ts`), Bérjegyzék letöltés (`payroll/actions.ts`), Műszakbeosztás (`shift-actions.ts`), Jelenléti ív (`attendance-actions.ts`), Karrier CV (`referral-actions.ts`) és Dolgozói Portál időzóna / eszkaláció (`self-service/actions.ts`, `hr/page.tsx`)**~~
  - **Érintett fájlok:** [`src/app/hr/cafeteria-actions.ts`](../src/app/hr/cafeteria-actions.ts), [`src/app/hr/payroll/actions.ts`](../src/app/hr/payroll/actions.ts), [`src/app/hr/time/shift-actions.ts`](../src/app/hr/time/shift-actions.ts), [`src/app/hr/attendance-actions.ts`](../src/app/hr/attendance-actions.ts), [`src/app/hr/self-service/career/referral-actions.ts`](../src/app/hr/self-service/career/referral-actions.ts), [`src/app/hr/self-service/actions.ts`](../src/app/hr/self-service/actions.ts), [`src/app/hr/page.tsx`](../src/app/hr/page.tsx)
  - **Megvalósítás:**
    - `cafeteria-actions.ts`: Legacy `hasCafeteriaAdminAccess` lecserélve `getActiveCompanyMemberRolesServer` + `isUserAuthorizedForHrView(["admin", "payroll", "employees"])` ellenőrzésre; `company_id` szűrés és beszúrás minden cafeteria táblán; `getCafeteriaExportData` védve.
    - `payroll/actions.ts`: A `downloadPayslipPdfAction` megakadályozza, hogy a dolgozó (`isOwner && !isHr`) `tervezet` státuszú vagy még nem mentett bérjegyzéket töltsön le, és a legacy szerepkörlistát `isUserAuthorizedForHrView` váltotta fel.
    - `shift-actions.ts`: `requireHrAuthServer(["time", "admin", "vezeto"], null)` őrblokk bekötve a `saveShiftAssignmentAction`, `copyPreviousWeekRosterAction`, `saveShiftTemplateAction` és `deleteShiftTemplateAction` műveletekbe.
    - `attendance-actions.ts`: A `deleteAttendanceRecord` jogosultság-ellenőrzést és `service_role` + `hr_jelenlet_hr_delete` RLS támogatást kapott; az `approveMonthlyTimesheet` pedig tiltja a saját havi jelenléti ív önjóváhagyását (kivéve cégadmin).
    - `referral-actions.ts`: A `getReferralCvSignedUrlAction` ellenőrzi, hogy a kért `storagePath` a bejelentkezett felhasználó saját ajánlásához/pályázatához vagy az aktív cég `recruitment`/`admin` jogosultsági körébe tartozik-e.
    - `self-service/actions.ts` és `hr/page.tsx`: Budapest időzónás (`Europe/Budapest`) mai dátum (`getBudapestDateStr`) használata a `toggleCheckIn`, `toggleBreak` és `/hr` főoldalon; cégszintű (`company_members`) HR/Admin fallback jóváhagyó-keresés (`resolveFallbackHrApproverId`).

- [x] ~~**14. [2.4 / 3.4 P2] Pre-company táblák (`hr_tulora_felhasznalás`, `hr_munkakor_nyugtazas`, `hr_beosztas`) `company_id` oszlop + backfill + RESTRICTIVE RLS és `hr_jelenlet` DELETE policy**~~
  - **Érintett fájl:** [`supabase/migrations/20261101000001_hr_rls_hardening_and_company_scoped_module_access.sql`](../supabase/migrations/20261101000001_hr_rls_hardening_and_company_scoped_module_access.sql) (5–6. szekció)
  - **Megvalósítás:** A `hr_tulora_felhasznalás`, `hr_munkakor_nyugtazas` és `hr_beosztas` táblák megkapták a `company_id` oszlopot, az automatikus backfillt (`hr_tavollet`/`hr_dolgozo_adatlap`, `hr_munkakor`, illetve `hr_jogviszony` alapján) és a `company_isolation_restrictive` (`public.user_has_company_access(company_id)`) cég-izolációs RLS szabályokat. Az oszlopok létrehozása a dinamikus 2 paraméteres `ALTER POLICY` ciklus (6. szekció) ELÉ került, így a `hr_munkakor_nyugtazas` és `hr_beosztas` meglévő permissive modul-policy-jei is automatikusan átfordulnak `has_hr_module_access(..., company_id)` hívásra, a `hr_tulora_felhasznalás` `"HR és vezető látja és kezelheti"` szabálya pedig `DROP + CREATE` utasítással frissül. A `hr_jelenlet` megkapta a `hr_jelenlet_hr_delete` (`DELETE`) szabályt.

---

## 0. Vezetői összefoglaló — hol állunk most?

A 2026.10.29-i audit óta **33 javítás landott** — a settings-guard-sweep, a BUG-0 (toborzás/beléptetés szerepkör-törés), a teljes „szepe" bezárása (47 legacy lista), a multi-tenant adatbeszúrások javítása (önkiszolgáló oldalak cégesítése), a GDPR-csomag, az Mt. 126 § pontosság, a TAJ/adószám CDV-validáció és a Docs↔HR integrációs cég-ellenőrzések. Mindez visszaigazolva a kódban.

Ennek eredményeként:
- A **funkcionális törések** (BUG-0) megszűntek; a Jogosultsági Mátrix moduljai **valóban a saját modulra korlátoznak** a fő action-rétegben.
- Az **önkiszolgáló oldalak** cégesítve; a cégváltás valódi idejű; az Áttekintés oldal párhuzamosan tölt.
- A **GDPR toborzási lánc** (consent + tájékoztató + anonimizáló cron + CV-takarítás) kiépült.

Ugyanakkor a mélyebb 2. kör **új, korábban nem látott rétegeket** tárt fel:

1. **A `has_hr_module_access()` SQL-függvény NEM cég-scoped** — a moduljog bármelyik cégben szerzett tagságból/auth-ból globálisan érvényesül. Ez az összes RLS-védett tábla tényleges kockázatát meghatározza (a restrictive policy csak a tagságot szűri, a **jogot nem**).
2. **~30-40 „use server" action fut guard nélkül vagy csak login-checkkel** service-role klienssel — főleg a 360° karton fül-műveletei (orvosi, fegyelmi, kitüntetések, tanulmányi szerződések, IDP), a T1041-actionök, az onboarding-feladatok és az offboarding PDF-generátorok.
3. **A hr-filing-bridge egyetlen insertje sem ír company_id-t** — a HR-dossziék, iratok, iktatások NULL company_id-val keletkeznek (a Docs saját iktatása viszont írja).
4. **3 db tábla RLS-e `USING (true)`** — `hr_kituntetes` (mindenki ír!), `hr_berpapir` (kereszt-céges béradat!), `hr_elozo_munkahely` — a cég-dimenzió ezekről teljesen hiányzik.
5. **A globális profil-fallback lánc** (`felhasznalo_profil.hr_szerepkor`) miatt a globálisan admin/HR-es user minden cégnél, ahová csak tagként bekerült, teljes jogokat kap.

**Mért össz-érettség: ~72%** (a 2026.10.29-i ~84%-ról csökkent a mélyebb rétegek feltárása miatt). **Új találatok: ~8 P0, ~35 P1, ~30 P2.**

---

## 1. A 2026.10.29 ÓTA JAVÍTOTT 33 TALÁLAT VISSZAIGAZOLÁSA

Minden javítás a helyén van — l. a `eaisyhr-deep-analysis-20261029.md` ⭐ JAVÍTOTT táblázatát (#1-#33). Kiemelt visszaigazolások:
- BUG-0 (toborzás + beléptetés): ✔ `["recruitment"]` / `["onboarding"]` modulkulcsok működnek
- Szepe-lezárás (47 lista): ✔ a 6 fájlban nincs legacy elem
- Önkiszolgáló cégesítés: ✔ goals, IDP, payslips, time, /hr főoldal mind `.eq("company_id")`
- Állomány modul modell: ✔ UI (canChangeRole/canDelete) + szerveroldali őrblokkok
- GDPR csomag: ✔ consent napló + tájékoztató + cron + CV-takarítás
- Mt. 126 §: ✔ `countWorkdaysWithHolidays` + csak `betegszabadsag`
- TAJ/adószám CDV: ✔ `updateSecretData` validáció

---

## 2. ÚJ RENDSZERSZINTŰ GYÖKÉROKOK

### 2.1. ~~[P0] `has_hr_module_access()` SQL — NEM cég-scoped~~ (JAVÍTVA 2026-11-01)

**Hol:** `20261028000005_sync_hr_rls_and_rpcs_with_module_permissions.sql:8-36` -> `20261101000001_hr_rls_hardening_and_company_scoped_module_access.sql`

~~A függvény **bármelyik cégben** szerzett tagságot/jogot elfogadja:~~
- ~~`company_members` **bármely** cégben `role IN ('admin','owner')` → minden cég module-táblájához jog~~
- ~~Globális `felhasznalo_profil.hr_modulok && p_modules` → cég-függő modulok globálisan érvényesülnek~~
- ~~**Nincs korreláció a sor `company_id`-jával** — a restrictive policy AND- kapcsolatban csak a tagságot szűri, nem a jogot~~

(Javítva: 2 paraméteres `has_hr_module_access(p_modules text[], p_company_id uuid)` bevezetve.)

### 2.2. ~~[P0] 3 db tábla RLS-e nyitva~~ (JAVÍTVA 2026-11-01)

| Tábla | Policy | Következmény |
|---|---|---|
| `hr_kituntetes` | ~~`USING (true)` FOR ALL~~ **[JAVÍTVA]** | `company_isolation_restrictive` + modul-alapú RLS (`20261101000001`) |
| `hr_berpapir` | ~~Van company_id, de NINCS restrictive~~ **[JAVÍTVA]** | `company_isolation_restrictive` pótolva (`20261101000001`) |
| `hr_elozo_munkahely` | ~~Globális hr-szerepkör~~ **[JAVÍTVA]** | `company_id` oszlop + `company_isolation_restrictive` pótolva (`20261101000001`) |

### 2.3. ~~[P0] hr-filing-bridge — company_id nélküli insertek~~ (JAVÍTVA 2026-11-01)

**Hol:** `src/utils/hr-filing-bridge.ts` — ~~**egyetlen insert sem ír company_id-t**~~

~~Az `ugy`, `ugyirat`, `irat`, `irat_kapcsolat`, `irat_fajl`, `esemeny_naplo`, `ai_feladat_sor` insertek NULL company_id-val keletkeznek → a HR-dossziék rossz RLS-hatókörbe kerülnek, a cég-listákban **elvesznek**, a Docs-oldali iktatások company_id-ja pedig nem egyezik a HR-oldalival.~~ (Javítva: `resolveFilingCompanyId` + cég-szűrt dosszié-, irattári tétel- és szervezeti egység lekérdezés + `company_id` átadása minden beszúrásnál.)

### 2.4. ~~[P0] Eszkalációs lánc: cégkezelés + globális profil-írás~~ (JAVÍTVA 2026-11-01)

- ~~`updateCompanyMemberRoleAction`: `role` **futásidőben nem whitelist-elt** (`"owner"` is beírható), és a **globális** `felhasznalo_profil`-t is felülírja~~ [JAVÍTVA: `"admin" | "member"` whitelist + többcéges tagnál nem írja felül a globális profilt]
- ~~`inviteCompanyMemberAction`: meglévő más-céges user globális `hr_szerepkor`-át `'admin'`-ra írhatja~~ [JAVÍTVA: meglévő globális szerepkört nem írja felül]
- `admin_update_user_profile` RPC: **cég-korlát nélkül** átírja bármely user globális szerepkörét
- ~~A globális profil-fallback lánc miatt ezek a jogok **minden cégben** érvényesülnek~~ [JAVÍTVA]

### 2.5. ~~[P1] Globális profil-fallback a resolverben~~ (JAVÍTVA 2026-11-01)

~~`company-role-resolver.ts:267-274`: ha a `company_members` sorban nincs `hr_szerepkor`, a **globális** `felhasznalo_profil.hr_szerepkor` érvényesül → globálisan `admin` user minden cégnél, ahová sima tagként bekerült, teljes HR-admin lesz.~~ [JAVÍTVA: `joinCompanyByTokenAction` explicit `munkavallalo`/`ugyintezo` szerepkört ír a `company_members`-be, és a `resolveUserCompanyRoles` nem szivárogtatja át más cégből a globális `hr_modulok` listát.]

---

## 3. MODULONKÉNTI ÚJ TALÁLATOK (kivonat)

### 3.1. Dolgozói Portál + Performance + Műszak

**P1:** ~~Korrekció-insert company_id nélkül (`submitAttendanceCorrection`)~~ [JAVÍTVA]; túlóra-visszavonás törött (`hr_tulora_felhasznalás`-on nincs company_id oszlop); HR-eszkaláció cross-tenant (jóváhagyó-keresés cég nélkül); referral CV-signed-URL kliens által diktált path-ra.

**P2:** ~~Cafeteria widget `useState(initial)` anti-pattern (cégváltásnál beragad)~~ [JAVÍTVA]; ~~TimeTrackingCard `internalCheckIn/Out` prop-szinkron hiányzik~~ [JAVÍTVA]; UTC-dátum a becsekkolásnál (00:00-02:00 közötti becsekkolás előző napra ír); ~~profile page jogviszony~~ [JAVÍTVA]/orvosi/oktatás cég-szűrés nélkül; jelenlét-törlés RLS-blokkolta (DELETE policy hiányzik); hónapzárás-önjóváhagyás; műszak-actionök guard nélküliek; vezetői helyettesítő-választó cég-szűrés nélkül service-role-on.

### 3.2. Admin + Settings + Karton (360°)

**P0:** ~~`getSignedCertificateUrl` — auth nélkül, tetszőleges path-ra signed URL~~ [JAVÍTVA]; `addWorkplace`/`deleteWorkplace`/`addQualification`/`addStudyContract` stb. — **egyetlen auth-hívás sincs**, ~~mögöttes RLS `USING (true)`~~ [JAVÍTVA `20261101000001`].

**P1:** `createMunkakor`/`updateMunkakor`/`deleteMunkakor` guard nélküliek (session kliens + RLS védi); ~~`updateEmployeeInfo` cég-ellenőrzés nélkül a dolgozóra~~ [JAVÍTVA]; `getCegesDokumentumokAdmin` guard + cég-szűrés nélkül (session kliens + RLS védi); ~~`updateEmployeePermissionsAction` cég-tagság-ellenőrzés nélkül~~ [JAVÍTVA]; ~~karton `isHrOrAdmin` globális legacy lista~~ [JAVÍTVA]; ~~`hasHrOrDocsAdminProfile` legacy lista (Docs↔HR iktatás)~~ [JAVÍTVA]; cafeteria admin-access legacy; `getCafeteriaExportData` guard + cég-szűrés nélkül (bérérzékeny); `assignEmployeeToOrgUnit` cég-ellenőrzés nélkül.

**P2:** `getQualificationFileUrl` path-kliensdiktálta; orvosi/fegyelmi/kitüntetés CRUD guard nélküli; `updateGeneralPersonalInfo` (születési adat, anyja neve!) csak login; ~~Jogviszony-fül munkakör-lista cég-szűrés nélkül~~ [JAVÍTVA]; ~~Audit-fül a dolgozónak is látszik~~ [JAVÍTVA]; `uploadJobDescription` guard nélkül; IDP CRUD guard nélkül; `downloadPayslipPdfAction` owner-ágon státusz-ellenőrzés nélkül (tervezet letölthető); `auth.admin.listUsers()` lapozás nélkül.

### 3.3. Payroll + Riportok + Compliance + Audit + Toborzás + Onboarding + Offboarding

**P0:** ~~`getOnboardingJobData` teljesen auth nélkül (dolgozói nevek, pozíciók, belépési dátumok)~~ [JAVÍTVA]; ~~`getT1041Data` cég/modul-ellenőrzés nélkül (TAJ, adójel, anyja neve)~~ [JAVÍTVA]; ~~T1041 riport guard-ellenőrzés nélkül fut le (sima dolgozó is lekérheti)~~ [JAVÍTVA].

**P1:** ~~`generateCvSignedUrl` kliens által adott path-ra~~ [JAVÍTVA]; ~~`deleteCandidate`/`updateCandidateNote`/`updateJobPostingFlagsAction`/`saveJobPostingAction`(update)/`assignCandidateToPostingAction` cég-ellenőrzés nélkül~~ [JAVÍTVA]; `checkApplicationStatusAction` e-mail-enumeráció (GDPR); 4 compliance getter guard nélkül (session kliens + RLS védi); `closeOffboarding`/`reopenOffboarding`/`createOffboarding`/`getOffboardingDetailData` cég-ellenőrzés nélkül; `resetOffboardingTasks`/`fileSingleOffboardingDocument` admin-kliens + csak login; ~~onboarding (`activateOnboardingAccount`) cég-ellenőrzés nélkül~~ [JAVÍTVA]; ~~T1041 actionök (save/generate/upload/file) cég/modul-ellenőrzés nélkül~~ [JAVÍTVA]; ~~`/api/pdf/[id]` HR ág cég-szűrés nélkül + fileId fallback IDOR~~ [JAVÍTVA].

### 3.4. RLS + Szerepkör + Cégkezelés

**P0:** ~~3 nyitva lévő tábla (kitüntetés, bérpapír, előző munkahely)~~ [JAVÍTVA]; ~~`has_hr_module_access` nem cég-scoped~~ [JAVÍTVA]; ~~eszkalációs lánc (updateMemberRole + invite)~~ [JAVÍTVA].

**P1:** `felhasznalo_profil` SELECT `USING (true)` (mindenki minden PII-ját látja); 5+ tábla company_id nélkül (tulora_felhasznalás, munkakor_leiras_verzio, onboarding_munkakor, elozo_munkahely, cafeteria_katalogus); `ertesites_naplo` cég-szűrés nélkül; resolver globális fallback; **maradtak legacy guard-listák** (a „minden cserélve" állítás nem teljes — l. P1-7).

**P2:** deleteCompanyAction audit-napló nélkül (naplók is törölődnek!); cookie nem httpOnly; `share_token` minden tagnak látszik; `/api/cron/imap` nincs ütemezve; reggeli SMS időzóna + hardcode; `hr_esemeny_naplo` insert `company_id` nélkül a cronokban; KPI-katalógus globális; `ertesitesi_szabaly` globális.

---

## 4. Docs↔HR INTEGRÁCIÓS AUDIT

### 4.1. A híd állapotta

**A funkcionális híd működik**: iktatás, dosszié-életciklus, aláírt-példány verziózás, pre-onboarding lánc, duplikáció-védelem, modul-elkülönítés ✔.

### 4.2. Találatok

| # | Súly | Hiba |
|---|---|---|
| 1 | **P0** | ~~hr-filing-bridge: **egyetlen insert sem ír company_id-t** — minden HR-dosszié NULL céggel keletkezik~~ **[JAVÍTVA 2026-11-01]** |
| 2 | **P1** | ~~/api/pdf/[id] HR ág: cég-szűrés sehol; a híd globálisan feloldott „HR" szervezeti egységhez bármely cég iktatója/auditorja hozzáfér~~ **[JAVÍTVA 2026-11-01]** |
| 3 | **P1** | ~~/api/pdf/[id] fileId fallback: `.or(irat_id.eq.X, id.eq.Y)` — a fileId ág megkerüli az irat-kapcsolatot (IDOR)~~ **[JAVÍTVA 2026-11-01]** |
| 4 | **P1** | ~~T1041-bejelentés iktatásakor a hr_esemeny_naplo-ba company_id nélkül íródik~~ **[JAVÍTVA 2026-11-01]** |
| 5 | P2 | ~~Multi-company dolgozó: közös személyi dosszié (cég-dimenzió nélküli irat_kapcsolat)~~ **[JAVÍTVA 2026-11-01]** |
| 6 | P2 | hr_dokumentum company_id: sok insert nem írja |

---

## 5. RLS / TÁBLASZINTŰ ÖSSZEFOGLALÓ

| Tábla csoport | Cég-védett? | Megjegyzés |
|---|:---:|---|
| 35+ fő hr_* tábla (adatlap, jogviszony, jelenlet, távollét, túlóra_egyenleg, onboarding, offboarding, toborzás, teljesítmény, cafeteria, orvosi, fegyelmi, T1041, eseménynapló, stb.) | ✅ | restrictive + modul-policy — de a moduljog **nem cég-scoped** (2.1) |
| **hr_kituntetes** | ❌ | `USING (true)` — mindenki mindent |
| **hr_berpapir** | ❌ | Van company_id, de nincs restrictive |
| **hr_elozo_munkahely** | ❌ | Globális hr-szerepkör |
| hr_tulora_felhasznalás, hr_onboarding_munkakor, hr_munkakor_leiras_verzio, hr_munkakor_nyugtazas, hr_cafeteria_katalogus, hr_munkaszuneti_nap | ❌ | Nincs company_id oszlop |
| felhasznalo_profil (SELECT), ertesites_naplo, ertesitesi_szabaly, hr_kpi_katalogus | ❌ | Globális / cég-dimenzió nélkül |

---

## 6. ÖSSZESÍTŐ ÉRETTSÉGI MÁTRIX (2026.10.29 → 2026.11.01)

| Modul | 10.29 | **11.01** | Változás oka |
|---|:---:|:---:|---|
| Dolgozói Portál (/hr) | 84% | **86%** | párhuzamos + cégesítve + kérések 3 típus ✔; korrekció-időzóna ✔ |
| Profilom | 75% | **76%** | TAJ CDV ✔; jogviszony cég-szűrés hiányzik |
| Jelenlét (ESS) | 87% | **88%** | cégesítve ✔; korrekció-insert company_id hiányzik |
| Célkitűzések | 82% | **88%** | cégesítve ✔ + tulajdonos-védelem ✔ |
| Fejlődési Tervem | 79% | **86%** | cégesítve ✔ + státuszváltó védve ✔ |
| Bérpapírjaim | 87% | **90%** | cégesítve ✔ + cégváltás-realtime ✔ |
| Vezetői nézet | 74% | **78%** | cég-szűrés ✔; túlóra-tábla company_id nélkül |
| Teljesítményértékelés | 85% | **87%** | szepe-csere ✔ + ciklus-cég ✔ + tulajdonos ✔ |
| HR Munkaasztal | 87% | **84%** | őrblokkok ✔; createMunkakor/updateMunkakor guard nélkül |
| Szervezeti Felépítés | 86% | **84%** | Docs-osztály védelem ✔; orgunit cég-ellenőrzés hiányzik |
| Jogosultsági Mátrix | — | **80%** | admin-guard ✔; cég-tagság ellenőrzés hiányzik |
| 360° Karton | 79% | **75%** | cég-ellenőrzés ✔; 10+ fül-action guard nélkül |
| Műszakbeosztás | 80% | **80%** | action-guardok hiányoznak |
| Bérszámfejtés | 82% | **85%** | payroll-modul ✔ + cég ✔; on-the-fly ág legacy |
| Riportok | 80% | **78%** | őrblokkok ✔; T1041 action-ök nyitva |
| Compliance | 84% | **78%** | toggle ✔; 4 getter teljesen nyitva |
| Eseménynapló | 93% | **93%** | szűkítés ✔ |
| Toborzás | 89% | **85%** | modul ✔ + GDPR ✔; 6 action cég-ellenőrzés nélkül |
| Onboarding | 84% | **80%** | modul ✔; cég-ellenőrzések hiányoznak |
| Offboarding | 84% | **78%** | modul ✔ + Mt.126 ✔ + multi-company ✔; cég-ellenőrzések hiányoznak |
| Docs↔HR integráció | — | **65%** | bridge company_id nélkül; pdf-route HR ág nyitva |
| RLS/Szerepkör/Cégkezelés | — | **45%** | 3 nyitott tábla; has_hr_module_access nem cég-scoped; eszkalációs lánc |

**Átfogó: ~72%** — **Új találatok: ~8 P0, ~35 P1, ~30 P2.**

---

## 7. JAVÍTÁSI PRIORITÁSI SORREND (javaslat)

1. **`has_hr_module_access()` cég-scoped újraírása** (MIGRÁCIÓ) — ez a legnagyobb hozamú egyetlen lépés: az összes RLS-védett tábla tényleges cég-izolációját adja.
2. **Eszkalációs lánc elvágása** (KÓD): updateMemberRole + invite + RPC → whitelist + globális profil-írás tiltása.
3. **3 nyitott tábla RLS-migrációja** (MIGRÁCIÓ): hr_kituntetes, hr_berpapir, hr_elozo_munkahely.
4. **hr-filing-bridge company_id propagálása** (KÓD): minden insert kapja meg a hívó cégét.
5. **Karton fül-actionök guard-csomagja** (KÓD): ~15 action-re requireHrAuthServer.
6. **T1041 action-csomag** (KÓD): guard + cég-ellenőrzés.
7. **Offboarding cég-ellenőrzés-csomag** (KÓD): minden action-re company_id vs aktív cég.
8. **Toborzás cég-ellenőrzés-csomag** (KÓD): 6 action.
9. **Resolver globális fallback szűkítése** (KÓD).
10. **Compliance getterek + onboarding actionök guard-csomagja** (KÓD).
11. **Maradék legacy guard-listák cseréje** (KÓD).
12. **P2-csomag**: cafeteria widget szinkron, UTC-dátum, cookie httpOnly, cron ütemezések.

---

## 8. MEGJEGYZÉSEK

- Az elemzés nem módosított semmit a kódban.
- A megrendelő korábbi elvetéseit tiszteletben tartottuk: Lejárt generálás, sync gomb, realtime, belső-publikus, pótszabadság, túlóra-újrabirálat, orvosi/fegyelmi PDF-láthatóság, „admin" modulkulcs-ütközés (Roberta eset).
- A P0-jelölteket javítás előtt érdemes gyors manuális teszttel is megerősíteni.
- **A fő tanulság:** a cég-dimenzió (restrictive policy) és a moduljog (`has_hr_module_access`) **párhuzamosan él**, de utóbbi **globális** — a valódi cég-scoped jogosultságkezeléshez a DB-függvénynek is a sor cég-kontextusához kell kötődnie.
