# A-102: [Közös] [HR] Teljes Körű Többcéges Izoláció Lezárása (4. Kategória + Verifikációs Audit), Hibrid/Cégesített Törzstáblák (D1–D3) és Önellenőrző RLS Policy Migrációs Architektúra

**Status:** Decided  
**Date:** 2026-11-01  
**Scope:** `[Közös]` `[HR]`  
**Author:** Agent  
**Kapcsolódó ADR:** [A-034](./A-034-multi-tenancy-architecture.md), [A-044](./A-044-hr-multi-tenancy-and-strict-gdpr-isolation.md), [A-099](./A-099-hr-filing-bridge-company-isolation-and-pdf-clearance-alignment.md), [A-100](./A-100-hr-rls-company-scoped-module-access-and-service-role-guards.md), [A-101](./A-101-hr-company-scoped-medical-safety-and-remaining-action-guards.md)  
**Kapcsolódó Kód:** `supabase/migrations/20261101000002_hr_remaining_tables_company_isolation_and_profile_rls.sql`, `supabase/migrations/20261101000003_hr_kituntetes_policy_cleanup_and_audit_fk.sql`, `supabase/migrations/20261101000004_d1_d3_and_p2_db_fixes.sql`, `supabase/migrations/20261101000005_drop_surviving_d1_d3_policies.sql`, `supabase/migrations/20261101000006_replace_remaining_global_profile_rls_policies.sql`, `src/utils/supabase/admin-users.ts`, `src/utils/hr/leave-calculator.ts`, `src/utils/hr/performance-access.ts`, `src/utils/company-server.ts`, `src/utils/hr-filing-bridge.ts`, `src/app/hr/actions/asset-actions.ts`, `src/app/hr/actions/employment-contract-actions.ts`, `src/app/hr/actions/contract-actions.ts`, `src/app/hr/actions/eaisybooks-employee-actions.ts`, `src/app/hr/actions/job-org-actions.ts`, `src/app/hr/actions/idp-actions.ts`, `src/app/hr/actions/t1041-actions.ts`, `src/app/hr/actions/onboarding-job-actions.ts`, `src/app/hr/actions/safety-training-actions.ts`, `src/app/hr/job/[id]/actions.ts`, `src/app/hr/job/[id]/page.tsx`, `src/app/hr/orgunit/[id]/page.tsx`, `src/app/hr/attendance-actions.ts`, `src/app/hr/employee/[id]/actions.ts`, `src/app/hr/employee/[id]/page.tsx`, `src/app/hr/payroll/actions.ts`, `src/app/hr/cafeteria-actions.ts`, `src/app/hr/onboarding/actions.ts`, `src/app/hr/offboarding/actions.ts`, `src/app/hr/recruitment/actions.ts`, `src/app/hr/reports/actions.ts`, `src/app/hr/performance/actions.ts`, `src/app/api/hr/download-document/route.ts`, `src/app/api/hr/parse-cv/route.ts`, `src/app/api/hr/*-pdf/route.ts`, `src/app/actions/company-actions.ts`, `docs/eaisyhr-deep-analysis-20261101-ellenorzes.md`

---

## 1. Context (Kontextus)

1. **Hátralévő 4. kategóriás tételek és verifikációs audit találatok (`docs/eaisyhr-deep-analysis-20261101-ellenorzes.md`):**
   - Az 1–3. kategóriák lezárása után még nyitva maradt a `public.admin_update_user_profile` RPC cég-korlátozása, a `felhasznalo_profil` globális `USING (true)` olvasási szabálya, 4 további tábla (`hr_onboarding_munkakor`, `hr_munkakor_leiras_verzio`, `hr_cafeteria_katalogus`, `ertesites_naplo`) cégesítése, valamint az eredeti auditból kimaradt 3 `service_role` action-fájl (`asset-actions.ts`, `employment-contract-actions.ts`, `contract-actions.ts`) és a `job/[id]` / `orgunit/[id]` / `attendance-actions.ts` végpontok jogosultság- és cég-ellenőrzése.
2. **Három rendszerszintű architektúra-döntés (D1, D2, D3):**
   - **D1 (`hr_munkaszuneti_nap`):** A magyar munkaszüneti napok és kormányrendeleti munkanap-áthelyezések országos szintűek, de a vállalatoknak szükségük van saját pihenőnapok (pl. leállás) és egyedi munkanap-áthelyezések rögzítésére más cégek érintése nélkül.
   - **D2 (`ertesitesi_szabaly`):** A `settings-actions.ts` már `.eq("company_id", activeCompanyId)` szűréssel próbálta írni a táblát, de az adatbázisban a tábla globális volt (`company_id` oszlop nélkül), így egyik cég módosítása kihatott a többire, illetve oszlophiány-hibát okozott.
   - **D3 (`hr_kpi_katalogus`):** A központi KPI sablonok mellett a vállalatoknak saját, cégre szűrt KPI-katalógus elemekre van szükségük.
3. **Többvállalatos egyediségi ütközések és túlélt `PERMISSIVE` RLS policy-k:**
   - Ugyanazon munkavállaló két vállalatban való foglalkoztatásakor a `hr_cafeteria_keret (dolgozo_id, ev)` és a `hr_berpapir (dolgozo_id, ev, honap)` egyedi megszorítások felülírták a másik vállalat adatait.
   - PostgreSQL-ben a `PERMISSIVE` RLS policy-k `OR` kapcsolattal értékelődnek ki: ha egy migráció eltérő policy-név miatt nem dobja el a korábbi `USING (true)` vagy globális profil-alapú szabályt, az új 2-paraméteres szabály hatástalanná válik.

---

## 2. Decision (A Meghozott Döntés)

1. **4. Kategória és `felhasznalo_profil` / RPC / Cron / Auth-lapozás lezárása (`20261101000002`):**
   - `public.admin_update_user_profile`: Kizárólag olyan felhasználó hívhatja, aki a célfelhasználóval közös cégben cég-admin vagy HR-admin (`v_has_shared_admin_company`), vagy globális rendszergazda; többcéges célfelhasználó esetén a globális `felhasznalo_profil.szerepkor` nem íródik felül, csak a közös cégbeli `company_members.docs_szerepkor`.
   - `public.can_view_user_profile(target_user_id uuid)`: `SECURITY DEFINER` függvényre épülő `felhasznalo_profil` `SELECT` RLS, amely kizárólag saját profilt, közös cégbeli munkatársat (`company_members`) vagy globális adminisztrátort enged olvasni.
   - `hr_onboarding_munkakor`, `hr_munkakor_leiras_verzio`, `hr_cafeteria_katalogus` és `ertesites_naplo`: `company_id` oszlop, backfill és `RESTRICTIVE` cég-izoláció (`public.user_has_company_access(company_id)`).
   - `src/utils/supabase/admin-users.ts`: Lapozott `listAllAuthUsers(adminClient)` segédfüggvény (`perPage = 1000`), amely minden oldalt betölt.
   - `SELECTED_COMPANY_COOKIE`: `httpOnly: true` beállítás (`src/utils/company-server.ts`); `share_token` kiszűrése nem-admin tagok elől (`src/app/actions/company-actions.ts`); `/api/cron/imap` ütemezés (`vercel.json`).
2. **Verifikációs audit P0 és P1 javításai (`20261101000003` + Server Action-ök):**
   - `src/app/hr/actions/asset-actions.ts`, `employment-contract-actions.ts`, `contract-actions.ts`: `requireHrAuthServer` modul-guard + dolgozó cég-tagság ellenőrzés + rekord `company_id` szűrés minden olvasó/író műveleten; a titkos PII (`taj_szam`, `adoazonosito_jel`, `bankszamlaszam`, `alapber`) olvasása és írása külön `["admin", "payroll", "onboarding"]` jogosultsághoz kötve.
   - `src/app/hr/job/[id]/actions.ts`, `job/[id]/page.tsx`, `orgunit/[id]/page.tsx`, `attendance-actions.ts` (`verifyTimesheetEmployeeAccess` + `saveAttendanceRecord` Mvt. 49. § orvosi alkalmasság-ellenőrzéssel): teljes modul- és cég-ellenőrzés.
   - `deleteCompanyAction` audit-megőrzés (`20261101000003`): a `hr_esemeny_naplo_company_id_fkey` külső kulcs `ON DELETE SET NULL`-ra állítva, a `set_hr_esemeny_naplo_company_id()` trigger pedig megőrzi a `NULL` `company_id`-t `entitas_tipus = 'companies' AND esemeny_tipus = 'adat_torles'` esetén.
3. **D1, D2, D3 hibrid/cégesített törzstáblák és P2 adatbázis-javítások (`20261101000004`, `20261101000005`):**
   - **D1 (`hr_munkaszuneti_nap` — B opció):** Nullable `company_id` oszlop, parciális unique indexek (`hr_munkaszuneti_nap_global_datum_idx`, `hr_munkaszuneti_nap_company_datum_idx`), cég-scoped RLS (`hr_munkaszuneti_nap_select`, `hr_munkaszuneti_nap_write`), és központi `resolveEffectiveHolidays(rawRows, activeCompanyId)` feloldó függvény (`src/utils/hr/leave-calculator.ts`), amely az áthelyezett munkanapokat (`transferredWorkdays`) is átadja a `calculateWorkingDays`-nek.
   - **D2 (`ertesitesi_szabaly` — B opció):** Cégesített `company_id` oszlop, meglévő cégekre klónozott 13 alapértelmezett szabály, `UNIQUE (company_id, esemeny_tipus, kinek)`, `trg_seed_company_notification_rules` (`AFTER INSERT ON public.companies`) trigger új vállalatokhoz, és `RESTRICTIVE` + 2-paraméteres `PERMISSIVE` RLS.
   - **D3 (`hr_kpi_katalogus` — B opció):** Nullable `company_id` oszlop (`NULL` = központi sablon, `<uuid>` = vállalati saját KPI), `hr_kpi_katalogus_select` és `hr_kpi_katalogus_write` RLS, valamint `.or(\`company_id.eq.\${companyScope},company_id.is.null\`)` lekérdezés.
   - **Multi-company UNIQUE megszorítások és `hr_esemeny_naplo` INSERT RLS:** `hr_cafeteria_keret_company_dolgozo_ev_key UNIQUE (company_id, dolgozo_id, ev)` és `hr_berpapir_company_dolgozo_ev_honap_key UNIQUE (company_id, dolgozo_id, ev, honap)`; az `"Eseménynapló rögzítés"` `INSERT` policy ellenőrzi a `felhasznalo_id = auth.uid()` és `user_has_company_access(company_id)` feltételeket.
   - **Önellenőrző RLS migrációs minta (`20261101000005`, `20261101000006`):** Minden policy-lecserélő migráció végén kötelező egy `pg_policies` katalógust ellenőrző `DO $$ ... END $$;` blokk, amely `RAISE EXCEPTION`-nel megállítja a tranzakciót, ha a célzott táblákon a várt policy-készleten kívül bármilyen régi szabály fennmaradna.
4. **3. körös független mélyaudit és 2 további döntési pont (`20261101000006` + 17 P0/P1/P2 javítás, A opciók):**
   - **Adatbázis RLS teljes tisztítás (`20261101000006`):** 16 HR táblán (`hr_beosztas`, `hr_bevallas_archivum`, `hr_ceges_dokumentum`, `hr_ceges_dokumentum_nyugtazas`, `hr_fejlesztesi_cel`, `hr_fejlesztesi_terv`, `hr_idp_megjegyzes`, `hr_munkakor`, `hr_munkaszerzodes`, `hr_szervezeti_egyseg`, `hr_t1041_bejelentes`, `hr_tavollet`, `hr_teljesitmeny_ciklus`, `hr_helyettesites`, `hr_muszak_sablon`, `hr_munkavedelmi_oktatas`) az összes maradék, globális `felhasznalo_profil.hr_szerepkor` / `szerepkor` / `elerheto_modulok` vagy literál `USING (true)` alapú `PERMISSIVE` szabály lecserélve `public.has_hr_module_access(..., company_id)` és `public.user_has_company_access(company_id)` szabályokra (`0` legacy policy maradt).
   - **Döntés 1 (`hr_beosztas` — A opció):** A cégen belüli olvasási láthatóság (`SELECT USING (public.user_has_company_access(company_id))`) megmaradt, a literál `USING (true)` megszűnt.
   - **Döntés 2 (`deleteAttendanceRecord` — A opció):** A dolgozói közvetlen `service_role` ön-törlés letiltva (`allowSelf: false`, `requiredModules: ["time", "admin", "vezeto"]`), így nyitott hónapban is a jóváhagyáshoz kötött jelenlét-korrekciós kérelmet kell használni.
   - **Alkalmazáskód-szintű P0/P1/P2 lezárások:** `eaisybooks-employee-actions.ts`, `payroll/actions.ts` (`targetCompanyId` kényszerítés), `/api/hr/download-document` (bucket-whitelist + aktív céges HR-dokumentum ellenőrzés `isHrOrAdmin` esetén is), `/api/hr/parse-cv`, `company-actions.ts` (`importEaisyBillCompanyAction` védelem), mind a 9 `/api/hr/*-pdf` végpont, `performance-access.ts` + `performance/actions.ts`, `job-org-actions.ts`, `idp-actions.ts`, `offboarding/actions.ts`, `reports/actions.ts`, `t1041-actions.ts`, `hr/settings/actions.ts`, `hr/admin/actions.ts`, `onboarding-job-actions.ts` + `safety-training-actions.ts`, `referral-actions.ts`, `cafeteria-actions.ts` és 6 HR oldal másodlagos lekérdezései teljes körű cég-szűrést kaptak.

---

## 3. Consequences (Következmények)

- **Pozitív:** A `docs/eaisyhr-deep-analysis-20261101.md` (1–4. kategória, 40/40 tétel) és a `docs/eaisyhr-deep-analysis-20261101-ellenorzes.md` (4 P0, 12 P1, ~35 P2 és D1–D3 döntések) valamennyi nyitott pontja kód- és adatbázis-szinten igazoltan lezárult.
- **Kockázat / Kompromisszum:** Új HR tábla vagy RLS szabály bevezetésekor a migrációnak kötelezően követnie kell a `RESTRICTIVE user_has_company_access(company_id)` + 2-paraméteres `has_hr_module_access(..., company_id)` + önellenőrző `DO` blokk mintát.

