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

### 4. Kategória (2026-11-01): Hátralévő 21 tétel (P0/P1/P2) lezárása, RLS migráció (`20261101000002`), legacy guard-sweep és `hr_dokumentum` `company_id` audit

- [x] ~~**15. [2.4 / 3.4 P0 & P1] `admin_update_user_profile` RPC lezárása, `felhasznalo_profil` SELECT RLS szűkítése, valamint `hr_onboarding_munkakor`, `hr_munkakor_leiras_verzio`, `hr_cafeteria_katalogus` és `ertesites_naplo` cég-izolációs migrációja**~~
  - **Érintett fájlok:** [`supabase/migrations/20261101000002_hr_remaining_tables_company_isolation_and_profile_rls.sql`](../supabase/migrations/20261101000002_hr_remaining_tables_company_isolation_and_profile_rls.sql), [`src/app/settings/settings-actions.ts`](../src/app/settings/settings-actions.ts), [`src/app/hr/actions/onboarding-job-actions.ts`](../src/app/hr/actions/onboarding-job-actions.ts), [`src/app/hr/job/[id]/actions.ts`](../src/app/hr/job/%5Bid%5D/actions.ts), [`src/app/hr/cafeteria-actions.ts`](../src/app/hr/cafeteria-actions.ts), [`src/app/hr/page.tsx`](../src/app/hr/page.tsx), [`src/app/hr/self-service/benefits/page.tsx`](../src/app/hr/self-service/benefits/page.tsx), [`src/app/hr/employee/[id]/page.tsx`](../src/app/hr/employee/%5Bid%5D/page.tsx)
  - **Megvalósítás:**
    - `admin_update_user_profile` RPC és `updateUserRole`: Az RPC ellenőrzi a közös cégtagságot, az admin/owner/docs-admin jogosultságot, a szerepkör-whitelistet (`olvaso`, `ugyintezo`, `iktato`, `osztalyvezeto`, `vezeto`, `auditor`, `admin`), és többcéges célfelhasználó esetén a `company_members.docs_szerepkor` mezőt írja a globális profil helyett.
    - `felhasznalo_profil` SELECT RLS: A korlátlan `USING (true)` kiváltva a `public.can_view_user_profile(id)` függvényre (saját profil, közös cégtagság vagy aktív cégadmin).
    - `hr_onboarding_munkakor`, `hr_munkakor_leiras_verzio`, `hr_cafeteria_katalogus`: Megkapták a `company_id` oszlopot, a backfillt és a `company_isolation_restrictive` (`public.user_has_company_access(company_id)`) szabályt a dinamikus 2 paraméteres `has_hr_module_access(..., company_id)` átíró ciklus ELŐTT, továbbá minden kódbeli lekérdezés és beszúrás cégre szűr.
    - `ertesites_naplo`: Megkapta az `ertesites_naplo_company_isolation` (`AS RESTRICTIVE`) szabályt és a cég-szűrt `ertesites_naplo_select_admin` policy-t.

- [x] ~~**16. [3.3 / 3.4 P1] Karrierportál GDPR e-mail-enumeráció védelem (`checkApplicationStatusAction`) és hátralévő legacy szerepkör-listák teljes cseréje (`src/app/hr/**`)**~~
  - **Érintett fájlok:** [`src/app/karrier/[id]/actions.ts`](../src/app/karrier/%5Bid%5D/actions.ts), [`src/components/hr/career-portal-client.tsx`](../src/components/hr/career-portal-client.tsx), [`src/app/hr/dashboard-actions.ts`](../src/app/hr/dashboard-actions.ts), [`src/app/hr/employee/[id]/page.tsx`](../src/app/hr/employee/%5Bid%5D/page.tsx), [`src/app/hr/employee/[id]/tabs/EmploymentTab.tsx`](../src/app/hr/employee/%5Bid%5D/tabs/EmploymentTab.tsx), [`src/app/hr/job/[id]/page.tsx`](../src/app/hr/job/%5Bid%5D/page.tsx), [`src/app/hr/manager/actions.ts`](../src/app/hr/manager/actions.ts), [`src/app/hr/manager/page.tsx`](../src/app/hr/manager/page.tsx), [`src/app/hr/onboarding/actions.ts`](../src/app/hr/onboarding/actions.ts), [`src/app/hr/performance/dashboard/page.tsx`](../src/app/hr/performance/dashboard/page.tsx), [`src/app/hr/performance/page.tsx`](../src/app/hr/performance/page.tsx), [`src/app/hr/self-service/actions.ts`](../src/app/hr/self-service/actions.ts), [`src/app/hr/self-service/time/page.tsx`](../src/app/hr/self-service/time/page.tsx), [`src/app/hr/settings/page.tsx`](../src/app/hr/settings/page.tsx), [`src/app/hr/admin/actions.ts`](../src/app/hr/admin/actions.ts)
  - **Megvalósítás:** A `checkApplicationStatusAction` kötelezővé teszi a pályázati azonosító (`KAR-2026-XXXX`) megadását az e-mail cím mellett, 5 kérés / 60 mp rate-limitet és egységes, nem-enumerálható hibaüzenetet alkalmaz. A `src/app/hr/**` alatt található összes maradék (13 db) legacy szerepkör-lista (`["hr_vezeto", "hr_munkatars", "berugyi", ...]`) lecserélve `isUserAuthorizedForHrView` / `requireHrAuthServer` modulkulcsos ellenőrzésre.

- [x] ~~**17. [3.1 / 3.2 / 3.4 / 4.2 P2] Túlóra-visszavonás, helyettesítő-választó, `listAllAuthUsers` lapozás, `deleteCompanyAction` audit, `httpOnly` cookie, `share_token` maszkolás, `/api/cron/imap` ütemezés, reggeli SMS és cron `company_id`, valamint `hr_dokumentum` `company_id` teljes körű pótlása**~~
  - **Érintett fájlok:** [`src/app/hr/self-service/actions.ts`](../src/app/hr/self-service/actions.ts), [`src/app/hr/self-service/time/page.tsx`](../src/app/hr/self-service/time/page.tsx), [`src/app/hr/page.tsx`](../src/app/hr/page.tsx), [`src/utils/supabase/admin-users.ts`](../src/utils/supabase/admin-users.ts), [`src/app/actions/company-actions.ts`](../src/app/actions/company-actions.ts), [`src/utils/company-server.ts`](../src/utils/company-server.ts), [`vercel.json`](../vercel.json), [`src/app/api/cron/morning/route.ts`](../src/app/api/cron/morning/route.ts), [`src/app/api/cron/gdpr-anonymize/route.ts`](../src/app/api/cron/gdpr-anonymize/route.ts), [`src/app/hr/actions/asset-actions.ts`](../src/app/hr/actions/asset-actions.ts), [`src/app/hr/actions/contract-actions.ts`](../src/app/hr/actions/contract-actions.ts), [`src/app/hr/actions/employment-contract-actions.ts`](../src/app/hr/actions/employment-contract-actions.ts), [`src/app/hr/attendance-actions.ts`](../src/app/hr/attendance-actions.ts), [`src/app/hr/employee/[id]/actions.ts`](../src/app/hr/employee/%5Bid%5D/actions.ts)
  - **Megvalósítás:**
    - Túlóra-visszavonás és lekérdezés (`withdrawSelfServiceRequest`, `hr/self-service/time/page.tsx`, `hr/page.tsx`): cégre szűrt `hr_tulora_felhasznalás` lekérdezés (`perc` oszloppal és `o.perc` alapú óra/perc formázással a nem létező `orak` helyett) és cég-ellenőrzött visszavonás.
    - Vezetői helyettesítő-választó (`hr/self-service/time/page.tsx`): eltávolítva a szűretlen `service_role` fallback, kizárólag az aktív cég tagjai jelennek meg.
    - `listAllAuthUsers` (`src/utils/supabase/admin-users.ts`): `perPage: 1000` lapozó segédfüggvény bekötve mind az 5 `auth.admin.listUsers` hívási pontra.
    - `deleteCompanyAction` (`company-actions.ts`): törlés előtt `company_id: null` értékkel rögzíti a cég törlését az `esemeny_naplo` és `hr_esemeny_naplo` táblákba, hogy az `ON DELETE CASCADE` ne törölje a naplóbejegyzést.
    - `SELECTED_COMPANY_COOKIE` (`company-actions.ts`): mind az 5 `cookieStore.set` hívás `httpOnly: true` beállítást kapott.
    - `share_token` (`company-server.ts`): nem-admin tagok számára a `share_token` és `share_token_created_at` `null`-ra maszkolva.
    - Cronok (`vercel.json`, `morning/route.ts`, `gdpr-anonymize/route.ts`): `/api/cron/imap` felvéve (`*/5 * * * *`), a reggeli SMS `Europe/Budapest` időzónát és dinamikus cégnevet használ, és minden cron `hr_esemeny_naplo` beszúrás átadja a `company_id`-t.
    - `hr_dokumentum` beszúrások: az összes (11 db) még hiányzó `.from("hr_dokumentum").insert(...)` hívás kiegészítve a `company_id` mezővel.

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

Minden javítás a helyén van — l. a `eaisyhr-deep-analysis-20261029.md` JAVÍTOTT táblázatát (#1-#33). Kiemelt visszaigazolások:
- BUG-0 (toborzás + beléptetés): [OK] `["recruitment"]` / `["onboarding"]` modulkulcsok működnek
- Szepe-lezárás (47 lista): [OK] a 6 fájlban nincs legacy elem
- Önkiszolgáló cégesítés: [OK] goals, IDP, payslips, time, /hr főoldal mind `.eq("company_id")`
- Állomány modul modell: [OK] UI (canChangeRole/canDelete) + szerveroldali őrblokkok
- GDPR csomag: [OK] consent napló + tájékoztató + cron + CV-takarítás
- Mt. 126 §: [OK] `countWorkdaysWithHolidays` + csak `betegszabadsag`
- TAJ/adószám CDV: [OK] `updateSecretData` validáció

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
- ~~`admin_update_user_profile` RPC: **cég-korlát nélkül** átírja bármely user globális szerepkörét~~ [JAVÍTVA `20261101000002` + `settings-actions.ts`: cégtagság + admin-ellenőrzés + szerepkör-whitelist + többcéges tagnál `company_members.docs_szerepkor` frissítés]
- ~~A globális profil-fallback lánc miatt ezek a jogok **minden cégben** érvényesülnek~~ [JAVÍTVA]

### 2.5. ~~[P1] Globális profil-fallback a resolverben~~ (JAVÍTVA 2026-11-01)

~~`company-role-resolver.ts:267-274`: ha a `company_members` sorban nincs `hr_szerepkor`, a **globális** `felhasznalo_profil.hr_szerepkor` érvényesül → globálisan `admin` user minden cégnél, ahová sima tagként bekerült, teljes HR-admin lesz.~~ [JAVÍTVA: `joinCompanyByTokenAction` explicit `munkavallalo`/`ugyintezo` szerepkört ír a `company_members`-be, és a `resolveUserCompanyRoles` nem szivárogtatja át más cégből a globális `hr_modulok` listát.]

---

## 3. MODULONKÉNTI ÚJ TALÁLATOK (kivonat)

### 3.1. Dolgozói Portál + Performance + Műszak

**P1:** ~~Korrekció-insert company_id nélkül (`submitAttendanceCorrection`)~~ [JAVÍTVA]; ~~túlóra-visszavonás törött (`hr_tulora_felhasznalás`-on nincs company_id oszlop)~~ [JAVÍTVA]; ~~HR-eszkaláció cross-tenant (jóváhagyó-keresés cég nélkül)~~ [JAVÍTVA]; ~~referral CV-signed-URL kliens által diktált path-ra~~ [JAVÍTVA].

**P2:** ~~Cafeteria widget `useState(initial)` anti-pattern (cégváltásnál beragad)~~ [JAVÍTVA]; ~~TimeTrackingCard `internalCheckIn/Out` prop-szinkron hiányzik~~ [JAVÍTVA]; ~~UTC-dátum a becsekkolásnál (00:00-02:00 közötti becsekkolás előző napra ír)~~ [JAVÍTVA]; ~~profile page jogviszony/orvosi/oktatás cég-szűrés nélkül~~ [JAVÍTVA]; ~~jelenlét-törlés RLS-blokkolta (DELETE policy hiányzik)~~ [JAVÍTVA]; ~~hónapzárás-önjóváhagyás~~ [JAVÍTVA]; ~~műszak-actionök guard nélküliek~~ [JAVÍTVA]; ~~vezetői helyettesítő-választó cég-szűrés nélkül service-role-on~~ [JAVÍTVA].

### 3.2. Admin + Settings + Karton (360°)

**P0:** ~~`getSignedCertificateUrl` — auth nélkül, tetszőleges path-ra signed URL~~ [JAVÍTVA]; ~~`addWorkplace`/`deleteWorkplace`/`addQualification`/`addStudyContract` stb. — **egyetlen auth-hívás sincs**, mögöttes RLS `USING (true)`~~ [JAVÍTVA `20261101000001` + `requireEmployeeActionAccess`].

**P1:** ~~`createMunkakor`/`updateMunkakor`/`deleteMunkakor` guard nélküliek~~ [JAVÍTVA]; ~~`updateEmployeeInfo` cég-ellenőrzés nélkül a dolgozóra~~ [JAVÍTVA]; ~~`getCegesDokumentumokAdmin` guard + cég-szűrés nélkül~~ [JAVÍTVA]; ~~`updateEmployeePermissionsAction` cég-tagság-ellenőrzés nélkül~~ [JAVÍTVA]; ~~karton `isHrOrAdmin` globális legacy lista~~ [JAVÍTVA]; ~~`hasHrOrDocsAdminProfile` legacy lista (Docs↔HR iktatás)~~ [JAVÍTVA]; ~~cafeteria admin-access legacy~~ [JAVÍTVA]; ~~`getCafeteriaExportData` guard + cég-szűrés nélkül (bérérzékeny)~~ [JAVÍTVA]; ~~`assignEmployeeToOrgUnit` cég-ellenőrzés nélkül~~ [JAVÍTVA].

**P2:** ~~`getQualificationFileUrl` path-kliensdiktálta~~ [JAVÍTVA]; ~~orvosi/fegyelmi/kitüntetés CRUD guard nélküli~~ [JAVÍTVA]; ~~`updateGeneralPersonalInfo` (születési adat, anyja neve!) csak login~~ [JAVÍTVA]; ~~Jogviszony-fül munkakör-lista cég-szűrés nélkül~~ [JAVÍTVA]; ~~Audit-fül a dolgozónak is látszik~~ [JAVÍTVA]; ~~`uploadJobDescription` guard nélkül~~ [JAVÍTVA]; ~~IDP CRUD guard nélkül~~ [JAVÍTVA]; ~~`downloadPayslipPdfAction` owner-ágon státusz-ellenőrzés nélkül (tervezet letölthető)~~ [JAVÍTVA]; ~~`auth.admin.listUsers()` lapozás nélkül~~ [JAVÍTVA: `listAllAuthUsers`].

### 3.3. Payroll + Riportok + Compliance + Audit + Toborzás + Onboarding + Offboarding

**P0:** ~~`getOnboardingJobData` teljesen auth nélkül (dolgozói nevek, pozíciók, belépési dátumok)~~ [JAVÍTVA]; ~~`getT1041Data` cég/modul-ellenőrzés nélkül (TAJ, adójel, anyja neve)~~ [JAVÍTVA]; ~~T1041 riport guard-ellenőrzés nélkül fut le (sima dolgozó is lekérheti)~~ [JAVÍTVA].

**P1:** ~~`generateCvSignedUrl` kliens által adott path-ra~~ [JAVÍTVA]; ~~`deleteCandidate`/`updateCandidateNote`/`updateJobPostingFlagsAction`/`saveJobPostingAction`(update)/`assignCandidateToPostingAction` cég-ellenőrzés nélkül~~ [JAVÍTVA]; ~~`checkApplicationStatusAction` e-mail-enumeráció (GDPR)~~ [JAVÍTVA: kötelező pályázati kód + rate-limit + generikus hiba]; ~~4 compliance getter guard nélkül~~ [JAVÍTVA]; ~~`closeOffboarding`/`reopenOffboarding`/`createOffboarding`/`getOffboardingDetailData` cég-ellenőrzés nélkül~~ [JAVÍTVA]; ~~`resetOffboardingTasks`/`fileSingleOffboardingDocument` admin-kliens + csak login~~ [JAVÍTVA]; ~~onboarding (`activateOnboardingAccount`) cég-ellenőrzés nélkül~~ [JAVÍTVA]; ~~T1041 actionök (save/generate/upload/file) cég/modul-ellenőrzés nélkül~~ [JAVÍTVA]; ~~`/api/pdf/[id]` HR ág cég-szűrés nélkül + fileId fallback IDOR~~ [JAVÍTVA].

### 3.4. RLS + Szerepkör + Cégkezelés

**P0:** ~~3 nyitva lévő tábla (kitüntetés, bérpapír, előző munkahely)~~ [JAVÍTVA]; ~~`has_hr_module_access` nem cég-scoped~~ [JAVÍTVA]; ~~eszkalációs lánc (updateMemberRole + invite + `admin_update_user_profile`)~~ [JAVÍTVA].

**P1:** ~~`felhasznalo_profil` SELECT `USING (true)` (mindenki minden PII-ját látja)~~ [JAVÍTVA `20261101000002`: `can_view_user_profile`]; ~~5+ tábla company_id nélkül (tulora_felhasznalás, munkakor_leiras_verzio, onboarding_munkakor, elozo_munkahely, cafeteria_katalogus)~~ [JAVÍTVA `20261101000001` + `20261101000002`]; ~~`ertesites_naplo` cég-szűrés nélkül~~ [JAVÍTVA `20261101000002`]; ~~resolver globális fallback~~ [JAVÍTVA]; ~~**maradtak legacy guard-listák**~~ [JAVÍTVA: mind a 13 maradék lista lecserélve `src/app/hr/**` alatt].

**P2:** ~~deleteCompanyAction audit-napló nélkül (naplók is törölődnek!)~~ [JAVÍTVA]; ~~cookie nem httpOnly~~ [JAVÍTVA]; ~~`share_token` minden tagnak látszik~~ [JAVÍTVA]; ~~`/api/cron/imap` nincs ütemezve~~ [JAVÍTVA]; ~~reggeli SMS időzóna + hardcode~~ [JAVÍTVA]; ~~`hr_esemeny_naplo` insert `company_id` nélkül a cronokban~~ [JAVÍTVA]; KPI-katalógus globális **[DÖNTÉSRE VÁR]**; `ertesitesi_szabaly` globális **[DÖNTÉSRE VÁR]**; `hr_munkaszuneti_nap` globális **[DÖNTÉSRE VÁR]**.

---

## 4. Docs↔HR INTEGRÁCIÓS AUDIT

### 4.1. A híd állapotta

**A funkcionális híd működik**: iktatás, dosszié-életciklus, aláírt-példány verziózás, pre-onboarding lánc, duplikáció-védelem, modul-elkülönítés [OK].

### 4.2. Találatok

| # | Súly | Hiba |
|---|---|---|
| 1 | **P0** | ~~hr-filing-bridge: **egyetlen insert sem ír company_id-t** — minden HR-dosszié NULL céggel keletkezik~~ **[JAVÍTVA 2026-11-01]** |
| 2 | **P1** | ~~/api/pdf/[id] HR ág: cég-szűrés sehol; a híd globálisan feloldott „HR" szervezeti egységhez bármely cég iktatója/auditorja hozzáfér~~ **[JAVÍTVA 2026-11-01]** |
| 3 | **P1** | ~~/api/pdf/[id] fileId fallback: `.or(irat_id.eq.X, id.eq.Y)` — a fileId ág megkerüli az irat-kapcsolatot (IDOR)~~ **[JAVÍTVA 2026-11-01]** |
| 4 | **P1** | ~~T1041-bejelentés iktatásakor a hr_esemeny_naplo-ba company_id nélkül íródik~~ **[JAVÍTVA 2026-11-01]** |
| 5 | P2 | ~~Multi-company dolgozó: közös személyi dosszié (cég-dimenzió nélküli irat_kapcsolat)~~ **[JAVÍTVA 2026-11-01]** |
| 6 | P2 | ~~hr_dokumentum company_id: sok insert nem írja~~ **[JAVÍTVA 2026-11-01: mind a 24 `.insert(...)` hívás írja a `company_id`-t]** |

---

## 5. RLS / TÁBLASZINTŰ ÖSSZEFOGLALÓ

| Tábla csoport | Cég-védett? | Megjegyzés |
|---|:---:|---|
| 35+ fő hr_* tábla (adatlap, jogviszony, jelenlet, távollét, túlóra_egyenleg, onboarding, offboarding, toborzás, teljesítmény, cafeteria, orvosi, fegyelmi, T1041, eseménynapló, stb.) | [JAVÍTVA] | `company_isolation_restrictive` + 2 paraméteres `has_hr_module_access(..., company_id)` (`20261101000001`) |
| **hr_kituntetes** | [JAVÍTVA] | `company_id` + `company_isolation_restrictive` + modul-alapú RLS (`20261101000001`) |
| **hr_berpapir** | [JAVÍTVA] | `company_isolation_restrictive` + 2 paraméteres modul-policy (`20261101000001`) |
| **hr_elozo_munkahely** | [JAVÍTVA] | `company_id` + `company_isolation_restrictive` + 2 paraméteres modul-policy (`20261101000001`) |
| **hr_tulora_felhasznalás, hr_beosztas, hr_munkakor_nyugtazas** | [JAVÍTVA] | `company_id` + backfill + `company_isolation_restrictive` + 2 paraméteres modul-policy (`20261101000001`) |
| **hr_onboarding_munkakor, hr_munkakor_leiras_verzio, hr_cafeteria_katalogus** | [JAVÍTVA] | `company_id` + backfill + `company_isolation_restrictive` + 2 paraméteres modul-policy (`20261101000002`) |
| **felhasznalo_profil (SELECT), ertesites_naplo** | [JAVÍTVA] | `can_view_user_profile(id)` (saját + közös cég + cégadmin), ill. `ertesites_naplo_company_isolation` (`20261101000002`) |
| **hr_kpi_katalogus, ertesitesi_szabaly, hr_munkaszuneti_nap** | [DÖNTÉSRE VÁR] | Megrendelői döntésre vár (globális törzsadat vs. opcionális `company_id` felülbírálhatóság) |

---

## 6. ÖSSZESÍTŐ ÉRETTSÉGI MÁTRIX (2026.10.29 → 2026.11.01 audit → 4. Kategória UTÁN)

| Modul | 10.29 | 11.01 (audit) | **11.01 (4. kat. után)** | Változás oka |
|---|:---:|:---:|:---:|---|
| Dolgozói Portál (/hr) | 84% | 86% | **97%** | párhuzamos + cégesítve + kérések 3 típus (`perc` javítva); Budapest-időzóna |
| Profilom | 75% | 76% | **96%** | TAJ CDV; jogviszony + orvosi + munkavédelmi oktatás cég-szűrés |
| Jelenlét (ESS) | 87% | 88% | **97%** | cégesítve; korrekció-insert `company_id` + túlóra-visszavonás cég-szűrés |
| Célkitűzések | 82% | 88% | **95%** | cégesítve + tulajdonos-védelem |
| Fejlődési Tervem | 79% | 86% | **96%** | cégesítve + státuszváltó + IDP CRUD és tanúsítvány URL védve |
| Bérpapírjaim | 87% | 90% | **97%** | cégesítve + cégváltás-realtime + `hr_berpapir` restrictive RLS + tervezet-letöltés tiltás |
| Vezetői nézet | 74% | 78% | **96%** | cég-szűrés + `hr_tulora_felhasznalás` `company_id` + helyettesítő-választó cég-szűrés |
| Teljesítményértékelés | 85% | 87% | **95%** | legacy guardok cserélve + ciklus-cég + tulajdonos-védelem |
| HR Munkaasztal | 87% | 84% | **96%** | őrblokkok + `createMunkakor`/`updateMunkakor`/`deleteMunkakor` + `hr_munkakor_leiras_verzio` cég-izoláció |
| Szervezeti Felépítés | 86% | 84% | **96%** | Docs-osztály védelem + `orgunit` cég-ellenőrzés |
| Jogosultsági Mátrix | — | 80% | **97%** | admin-guard + cég-tagság ellenőrzés + többcéges profil-védelem |
| 360° Karton | 79% | 75% | **97%** | cég-ellenőrzés + mind a 18 fül-action `requireEmployeeActionAccess` + `hr_dokumentum` `company_id` |
| Műszakbeosztás | 80% | 80% | **96%** | action-guardok + cég-szűrt orvosi érvényesség-ellenőrzés |
| Bérszámfejtés | 82% | 85% | **96%** | `payroll`-modul + cég + `isUserAuthorizedForHrView` |
| Riportok | 80% | 78% | **96%** | őrblokkok + T1041 action-ök cég- és modul-védelme |
| Compliance | 84% | 78% | **96%** | toggle + mind a 4 getter `requireHrAuthServer` + cég-szűrés |
| Eseménynapló | 93% | 93% | **98%** | szűkítés + cron `company_id` + cég-törlés előtti naplózás |
| Toborzás | 89% | 85% | **97%** | modul + GDPR + 6 action cég-ellenőrzés + karrierportál e-mail-enumeráció védelem |
| Onboarding | 84% | 80% | **96%** | modul + cég-ellenőrzések + `hr_onboarding_munkakor` `company_id` |
| Offboarding | 84% | 78% | **96%** | modul + Mt.126 + multi-company + teljes `verifyOffboardingCompany` |
| Docs↔HR integráció | — | 65% | **97%** | `hr-filing-bridge` `company_id` + `/api/pdf/[id]` HR ág cég-szűrés + 24/24 `hr_dokumentum` insert `company_id` |
| RLS/Szerepkör/Cégkezelés | — | 45% | **97%** | összes HR tábla restrictive + 2 paraméteres `has_hr_module_access(..., company_id)` + eszkalációs lánc és `admin_update_user_profile` lezárva |

**Átfogó (4. Kategória után): ~96%** — **Minden P0, P1 és P2 tétel lezárva (kivéve a 3 megrendelői döntésre váró globális törzstáblát).**

---

## 7. JAVÍTÁSI PRIORITÁSI SORREND (állapot)

1. ~~**`has_hr_module_access()` cég-scoped újraírása** (MIGRÁCIÓ)~~ — **[KÉSZ: `20261101000001` + `20261101000002`]**
2. ~~**Eszkalációs lánc elvágása** (KÓD + MIGRÁCIÓ): updateMemberRole + invite + `admin_update_user_profile` RPC~~ — **[KÉSZ]**
3. ~~**Nyitott és pre-company táblák RLS-migrációja** (MIGRÁCIÓ): `hr_kituntetes`, `hr_berpapir`, `hr_elozo_munkahely`, `hr_tulora_felhasznalás`, `hr_beosztas`, `hr_munkakor_nyugtazas`, `hr_onboarding_munkakor`, `hr_munkakor_leiras_verzio`, `hr_cafeteria_katalogus`, `ertesites_naplo`, `felhasznalo_profil`~~ — **[KÉSZ]**
4. ~~**hr-filing-bridge és `hr_dokumentum` `company_id` propagálása** (KÓD)~~ — **[KÉSZ]**
5. ~~**Karton fül-actionök guard-csomagja** (KÓD)~~ — **[KÉSZ]**
6. ~~**T1041 action-csomag** (KÓD)~~ — **[KÉSZ]**
7. ~~**Offboarding cég-ellenőrzés-csomag** (KÓD)~~ — **[KÉSZ]**
8. ~~**Toborzás cég-ellenőrzés-csomag + GDPR e-mail-enumeráció védelem** (KÓD)~~ — **[KÉSZ]**
9. ~~**Resolver globális fallback szűkítése** (KÓD)~~ — **[KÉSZ]**
10. ~~**Compliance getterek + onboarding actionök guard-csomagja** (KÓD)~~ — **[KÉSZ]**
11. ~~**Maradék legacy guard-listák cseréje** (KÓD)~~ — **[KÉSZ]**
12. ~~**P2-csomag**: cafeteria widget szinkron, UTC-dátum, cookie httpOnly, `share_token` maszkolás, `listAllAuthUsers` lapozás, cron ütemezések és `company_id`~~ — **[KÉSZ]**

---

## 8. MEGJEGYZÉSEK

- Az elemzés nem módosított semmit a kódban.
- A megrendelő korábbi elvetéseit tiszteletben tartottuk: Lejárt generálás, sync gomb, realtime, belső-publikus, pótszabadság, túlóra-újrabirálat, orvosi/fegyelmi PDF-láthatóság, „admin" modulkulcs-ütközés (Roberta eset).
- A P0-jelölteket javítás előtt érdemes gyors manuális teszttel is megerősíteni.
- **A fő tanulság:** a cég-dimenzió (restrictive policy) és a moduljog (`has_hr_module_access`) **párhuzamosan él**, de utóbbi **globális** — a valódi cég-scoped jogosultságkezeléshez a DB-függvénynek is a sor cég-kontextusához kell kötődnie.
