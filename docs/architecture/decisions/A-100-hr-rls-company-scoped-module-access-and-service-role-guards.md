# A-100: [Közös] Cégre Szűkített `has_hr_module_access(p_modules, p_company_id)` RLS Architektúra, Nyitott HR Táblák Lezárása és `service_role` Server Action Védelem

**Status:** Decided  
**Date:** 2026-11-01  
**Scope:** `[Közös]` (`[HR]` + `[Docs]`)  
**Author:** Agent  
**Kapcsolódó ADR:** [A-066](./A-066-multi-tenant-company-members-colleague-visibility-and-hr-workforce-isolation.md), [A-087](./A-087-hr-simplified-roles-module-permission-matrix-and-p0-calculation-hardening.md), [A-090](./A-090-hr-rls-module-permissions-and-performance-team-scoping.md), [A-097](./A-097-use-server-exports-as-endpoints-deletion-and-guard-policy.md), [A-099](./A-099-hr-filing-bridge-company-isolation-and-pdf-clearance-alignment.md)  
**Kapcsolódó Kód:** `supabase/migrations/20261101000001_hr_rls_hardening_and_company_scoped_module_access.sql`, `src/app/hr/employee/[id]/page.tsx`, `src/app/actions/company-actions.ts`, `src/app/hr/settings/actions.ts`, `src/app/hr/permissions/actions.ts`, `src/utils/hr/company-role-resolver.ts`, `src/app/hr/actions/idp-actions.ts`, `src/app/hr/actions/t1041-actions.ts`, `src/app/hr/actions/onboarding-job-actions.ts`, `src/app/hr/recruitment/actions.ts`, `src/app/hr/onboarding/actions.ts`, `src/app/hr/reports/actions.ts`

---

## 1. Context (Kontextus)

A 2026-11-01-es rendszerszintű mélyelemzés (2. kategória) négy kritikus jogosultsági és cég-izolációs kockázatot tárt fel:

1. **Globális `has_hr_module_access(p_modules)` SQL függvény (2.1 P0):** Az 1-paraméteres `has_hr_module_access(p_modules text[])` `EXISTS (SELECT 1 FROM company_members WHERE user_id = auth.uid() ...)` lekérdezése nem szűrt az adott adatsor `company_id` értékére. Így egy olyan felhasználó, aki az A cégben admin vagy HR-modulos, de a B cégben csak sima munkavállaló, az adatbázis RLS szintjén a B cég tábláiban is megkapta a moduljogot (mivel a `company_isolation_restrictive` policy csak a cégtagságot ellenőrzi, a szerepkört nem).
2. **Három nyitott (`USING (true)`) HR tábla `company_id` nélkül (2.2 / 3.4 P0):** A `hr_kituntetes`, `hr_berpapir` és `hr_elozo_munkahely` táblák nem rendelkeztek `company_id` oszloppal és `company_isolation_restrictive` szabályokkal, a `hr_kituntetes` táblán pedig `FOR ALL USING (true)` policy élt.
3. **Többcéges szerepkör-szivárgás a `felhasznalo_profil` táblán keresztül (2.4 / 2.5 P1):** Egy cégben végzett szerepkör-módosítás (`updateCompanyMemberRoleAction`, `updateEmployeePermissionsAction`, `updateEmployeeInfo`, `removeEmployeeFromHR`) felülírta a globális `felhasznalo_profil.hr_szerepkor` / `docs_szerepkor` mezőket, ami más cégekben is megváltoztatta a felhasználó fallback jogosultságát.
4. **Szerveroldali `service_role` Server Action-ök hiányzó cég- és jogosultság-ellenőrzése (3.2 / 3.3 P0-P1):** Az `idp-actions.ts`, `t1041-actions.ts`, `onboarding-job-actions.ts`, `recruitment/actions.ts`, `onboarding/actions.ts` és `reports/actions.ts` egyes függvényei `service_role` klienssel futottak anélkül, hogy ellenőrizték volna a hívó moduljogát vagy a célrekord `company_id` egyezését.

---

## 2. Decision (A Meghozott Döntés)

1. **Cégre szűkített `has_hr_module_access(p_modules text[], p_company_id uuid)` és teljes RLS átkötés (`20261101000001` migráció):**
   - Létrehoztuk a 2-paraméteres `public.has_hr_module_access(p_modules text[], p_company_id uuid)` függvényt, amely `p_company_id IS NOT NULL` esetén kizárólag az adott cégbeli (`cm.company_id = p_company_id`) `company_members` tagságot vizsgálja, és a globális `felhasznalo_profil` fallbacket csak egycéges felhasználónál (`COUNT(*) <= 1`) veszi figyelembe.
   - Egy dinamikus `DO $$` `ALTER POLICY` blokk a `pg_policies` katalóguson végighaladva az összes (~35+) `company_id` oszloppal rendelkező tábla meglévő RLS szabályában átírta az 1-paraméteres `has_hr_module_access(...)` hívást a 2-paraméteres `has_hr_module_access(..., company_id)` változatra (`BEGIN ... EXCEPTION WHEN OTHERS` védelemmel).
   - A `get_decrypted_hr_data` és `update_decrypted_hr_data` `SECURITY DEFINER` RPC függvények is a dolgozó `company_id`-jával hívják a 2-paraméteres függvényt.
2. **A `hr_kituntetes`, `hr_berpapir` és `hr_elozo_munkahely` táblák cég-izolációja:**
   - Mindhárom tábla megkapta a `company_id UUID REFERENCES public.companies(id)` oszlopot, a meglévő sorok backfilljét a `hr_dolgozo_adatlap.company_id` alapján, a `company_isolation_restrictive` (`AS RESTRICTIVE`) szabályt és a 2-paraméteres `has_hr_module_access(..., company_id)` policy-kat.
3. **Többcéges szerepkör-szinkron korlátozása és enum-validáció:**
   - Az `updateCompanyMemberRoleAction` szigorú `"admin" | "member"` whitelistet, valamint `VALID_DOCS_ROLES` és `VALID_HR_ROLES` futásidejű halmaz-ellenőrzést kapott.
   - A globális `felhasznalo_profil` szerepkörét a céges jogosultság-kezelő műveletek kizárólag akkor módosítják, ha a felhasználó legfeljebb 1 cégnek a tagja (`membershipCount <= 1`).
   - Meghívókódos csatlakozásnál (`joinCompanyByTokenAction`) a `company_members` explicit `munkavallalo` / `ugyintezo` szerepkört kap, a `resolveUserCompanyRoles` pedig nem örökíti át más cégből a globális `hr_modulok` tömböt.
4. **Szerveroldali `service_role` Action-ök és 360° Karton védelme:**
   - A `hr/employee/[id]/page.tsx` munkakör-listája az aktív cégre szűr, az `isHrOrAdmin` az `isUserAuthorizedForHrView(..., ["admin", "employees"], ...)` függvényt használja, az `Előzmények` (`audit`) fül pedig csak `(isHrOrAdmin || isAudit)` jogosultsággal látható.
   - Az `idp-actions.ts`, `t1041-actions.ts`, `onboarding-job-actions.ts`, `recruitment/actions.ts`, `onboarding/actions.ts` és `reports/actions.ts` érintett műveletei `requireHrAuthServer` és `company_id` tulajdonjog-ellenőrzést kaptak.

---

## 3. Consequences (Következmények)

- **Pozitív:** A multi-tenant jogosultsági modell mind az alkalmazásrétegben (`service_role` action-ök), mind az adatbázis RLS és RPC rétegében cégre szűkítetten működik; egy A cégbeli adminisztrátor nem férhet hozzá a B cég HR adataihoz, ha a B cégben csak beosztott munkavállaló.
- **Kompatibilitás:** A `deleteCandidate` és más tulajdonjog-ellenőrzések a régi (`company_id IS NULL`) rekordok törlését és kezelését továbbra is lehetővé teszik az aktív cég jogosult HR-esei számára.

