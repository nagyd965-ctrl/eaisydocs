# A-114: [Közös] / [Docs] / [HR] Teljes Rendszerű 5-Szintű Biztonsági, Jogosultsági (`Olvasás` vs `Írás`), Több-Vállalatos (`company_id`) és Adatbázis RLS Audit Zárás (`20261104000006`)

**Status:** Decided  
**Date:** 2026-11-04  
**Scope:** `[Közös]` `[Docs]` `[HR]`  
**Author:** Antigravity  
**Kapcsolódó PRD:** [P-143](../../product/decisions/P-143-unified-5-level-audit-remediation-and-permission-ux-sync.md)  
**Kapcsolódó BRD:** [BRD-013](../../business/decisions/013-unified-5-level-audit-payroll-holiday-and-policy-rules.md)  
**Kapcsolódó Audit Terv:** [`docs/egyesitett-audit-es-javitasi-terv-20261104.md`](../../egyesitett-audit-es-javitasi-terv-20261104.md)  
**Kapcsolódó Kód:** `supabase/migrations/20261104000006_complete_rls_and_cross_module_hardening.sql`, `src/utils/hr/company-role-resolver.ts`, `src/utils/company-server.ts`, `src/utils/docs-auth-guard.ts`, `src/utils/hr/performance-access.ts`, `src/utils/hr/substitute-sync.ts`, `src/app/actions/company-actions.ts`, `src/app/management/actions.ts`, `src/app/hr/employee/[id]/actions.ts`, `src/app/hr/employee/[id]/page.tsx`, `src/app/hr/employee/[id]/tabs/PersonalDataTab.tsx`, `src/app/hr/payroll/actions.ts`, `src/app/hr/offboarding/actions.ts`, `src/app/hr/actions/t1041-actions.ts`, `src/app/hr/actions/onboarding-job-actions.ts`, `src/app/hr/self-service/actions.ts`, `src/app/hr/performance/actions.ts`, `src/app/hr/compliance/compliance-actions.ts`, `src/app/hr/reports/actions.ts`, `src/app/api/hr/download-document/route.ts`, `src/app/api/hr/parse-cv/route.ts`, `src/app/dossiers/[id]/actions.ts`, `src/app/dossiers/[id]/template-actions.ts`, `src/app/dossiers/[id]/version-actions.ts`, `src/app/partners/*`, `src/app/rules/filing-rules-actions.ts`, `src/app/tasks/task-actions.ts`, `src/app/settings/substitution-actions.ts`, `src/app/inbox/[id]/page.tsx`, `src/app/inbox/filing-actions.ts`, `src/app/archive/disposal-actions.ts`, `src/app/audit/actions.ts`, `src/app/audit/notification-audit-tab.tsx`, `src/lib/sanitize-html.ts`, `supabase/functions/anonymize-candidates/index.ts`

---

## 1. Context (Kontextus)

Az `eaisyDocs` és `eaisyHR` platformok teljes körű 3-ügynökös mélyauditja (`docs/egyesitett-audit-es-javitasi-terv-20261104.md`) 5 szintbe rendezve tárta fel a fennmaradó jogosultsági, több-vállalatos (`company_id`), üzleti logikai és adatbázis RLS kockázatokat:
1. **Szint 1 (Gyors & magas értékű javítások):** XSS védelem az `audit/notification-audit-tab.tsx`-ben (`sanitizeRichTextHtml`), nyitott `anonymize-candidates` Edge Function védelem (`CRON_SECRET`), éles migrációk melletti `rollback_*.sql` fájlok archiválása, `substitute-sync.ts` `hr_szervezeti_egyseg` tábla/mező hivatkozás javítása.
2. **Szint 2 (Közepes & célzott javítások):** eaisyDocs oldal-betöltő `canEdit` / `hasWrite` átadások (`/inbox/[id]`, `/rules`, `/settings`), `filing-actions.ts` és `disposal-actions.ts` írási őrblokkjai, valamint az eaisyHR Teljesítményértékelés és Önkiszolgáló modulok jogosultság- és cégizolációs szigorítása.
3. **Szint 3 (Üzleti logika & számítási javítások):** Bérszámfejtési szabadságkeret cég-szűrése és dinamikus munkanap-osztó használata a fix `/ 22` helyett, `hr_munkaszuneti_nap` ünnepnapi munkavégzés ellenőrzése jelenlét-rögzítéskor, valamint a `/api/hr/download-document` végpontban a `hr_ceges_dokumentum` (vállalati szabályzat) letöltés támogatása és a `docsRole === "admin"` keresztszivárgás kizárása.
4. **Szint 4 (Multi-tenancy & jogosultsági őrblokk szigorítások):** `employee/[id]/actions.ts`, `payroll/actions.ts`, `t1041-actions.ts`, `offboarding/actions.ts`, `dossiers/[id]/actions.ts`, `version-actions.ts`, `partners/*`, `filing-rules-actions.ts`, `task-actions.ts` és `substitution-actions.ts` cég-scoped (`company_id`) és modul-szintű írási (`requireWrite: true`) védelme.
5. **Szint 5 (Közös jogosultság-feloldó motor és adatbázis RLS szinkronizáció):** A `resolveUserCompanyRoles` moduláris függetlensége (`!hasDocsModule` -> `docsRole: "none"`, `!hasHrModule` -> `hrRole: "none"`), a `company-actions.ts` és `management/actions.ts` szerepkör-szinkronizációja, valamint a `20261104000006_complete_rls_and_cross_module_hardening.sql` migrációval a 49 db HR `FOR ALL`/write RLS policy szétválasztása `SELECT` (`has_hr_module_access`) és írási (`has_hr_write_access`) szabályokra.

## 2. Decision (A Meghozott Döntés)

1. **Központi jogosultság-feloldó (`resolveUserCompanyRoles`) és szerepkör-szinkronizáció:**
   - Ha a felhasználó `elerheto_modulok` tömbjében nem szerepel a `'docs'`, a `docsRole` értéke `"none"`, a `docsModules` és `docsWriteModules` pedig `[]` (még `owner`/`admin` céges szerepkör mellett is). Ugyanez érvényes a `'hr'` modul hiányakor (`hrRole: "none"`, `hrModules: []`, `hrWriteModules: []`).
   - Az `updateManagementUserAction` szerepkör-módosításkor (`prev.docs_szerepkor !== m.docs_szerepkor` vagy `prev.hr_szerepkor !== m.hr_szerepkor`) az új szerepkör tiszta alapértelmezett moduljait állítja be, megakadályozva a korábbi `admin` modulok beragadását visszaminősítéskor.
2. **Adatbázis RLS és SQL segédfüggvények teljes szinkronizációja (`20261104000006_complete_rls_and_cross_module_hardening.sql`):**
   - A `handle_new_user()` triggerben a `szerepkor` oszlop `'munkavallalo'::public.user_szerepkor` típuskonverziót kapott.
   - A `get_effective_docs_role`, `has_docs_module_access`, `has_docs_write_access`, `has_hr_module_access` és `has_hr_write_access` függvények legelső lépésként ellenőrzik az `elerheto_modulok` (`'docs'` / `'hr'`) tagságot, és modulonkénti `m = ANY(v_read) AND m = ANY(v_write)` metszetet számítanak.
   - A `hr_toborzas` és `hr_teljesitmeny` táblák megkapták a hiányzó `PERMISSIVE` `SELECT` és `ALL` (write) RLS szabályokat.
   - Mind a 49 db HR `FOR ALL` / write RLS szabály külön `SELECT` (`has_hr_module_access`) és módosító (`has_hr_write_access`) szabályra vált szét.
   - A `partner`, `feladat`, `ugy`, `selejtezes_csomag`, `ugyirat_megjegyzes_csatolmany`, `rendszer_beallitas` és `storage.objects` (`hr_reports`) táblák cég-scoped `has_docs_write_access` / `has_hr_write_access` védelmet kaptak.

## 3. Consequences (Következmények)

- **Pozitív:** Az `eaisyDocs` és `eaisyHR` modulok mind alkalmazásszinten (UI + Server Action), mind adatbázis RLS szinten 100%-osan érvényesítik a 3-szintű alapszerepkör modellt (`munkavallalo`, `vezeto`, `admin`), a modulonkénti `Olvasás` vs `Írás` mátrixot, a több-vállalatos (`company_id`) izolációt és a két termék közötti szigorú moduláris függetlenséget.
- **Kockázat / Kompromisszum:** Nincs; az összes meglévő és új egységteszt (`company-role-resolver.test.ts`, `audit-round4-pkg*.test.ts`) és a `tsc --noEmit` 0 hibával fut le.
