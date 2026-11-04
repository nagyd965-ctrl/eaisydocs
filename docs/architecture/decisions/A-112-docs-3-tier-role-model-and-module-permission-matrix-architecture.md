# A-112: eaisyDocs 3-Szintű Alapszerepkör Modell (`munkavallalo` | `vezeto` | `admin`), Olvasás / Írás Modul-Hozzáférési Mátrix (`docs_modulok`, `docs_iras_modulok`, `hr_iras_modulok`), Céges Csapat-Izoláció és `docs_szerepkor_enum` Típus-Szűkítés (`20261104000001`–`20261104000005`)

**Status:** Decided  
**Date:** 2026-11-04  
**Scope:** `[Közös]` `[Docs]` `[HR]`  
**Author:** Antigravity Agent  
**Kapcsolódó PRD:** [P-141](../../product/decisions/P-141-management-docs-module-permissions-matrix-and-3-tier-role-selectors-ux.md)  
**Kapcsolódó Kód:** `supabase/migrations/20261104000001_docs_3_tier_roles_and_modules_matrix.sql`, `supabase/migrations/20261104000002_docs_role_defaults_and_triggers_fix.sql`, `supabase/migrations/20261104000003_narrow_docs_szerepkor_enum_cleanup.sql`, `supabase/migrations/20261104000004_fix_docs_hr_team_and_department_isolation.sql`, `supabase/migrations/20261104000005_docs_and_hr_read_write_permissions_matrix.sql`, `src/utils/hr/company-role-resolver.ts`, `src/utils/company-server.ts`, `src/utils/docs-auth-guard.ts`, `src/utils/hr/hr-auth-guard.ts`, `src/utils/permissions.ts`, `src/app/management/actions.ts`, `src/app/management/management-client.tsx`, `src/app/hr/organization/page.tsx`, `src/app/hr/permissions/actions.ts`, `src/components/hr/permissions-matrix-view.tsx`, `src/app/settings/settings-actions.ts`, `src/app/layout.tsx`, `src/components/layout-wrapper.tsx`, `src/components/app-sidebar.tsx`, `src/app/dossiers/[id]/actions.ts`, `src/app/dossiers/[id]/template-actions.ts`, `src/app/dossiers/[id]/version-actions.ts`, `src/app/dossiers/[id]/access-actions.ts`, `src/components/assign-dossier-dialog.tsx`, `src/components/archive-client.tsx`, `src/app/api/pdf/[id]/route.ts`, `src/utils/saved-search-alerts.ts`, `src/utils/imap-service.ts`, `src/app/api/cron/nightly/route.ts`

---

## 1. Context (Kontextus)

Az `eaisyDocs` korábban 7 különálló szerepkört használt (`admin`, `rendszergazda`, `vezeto`, `iktato`, `ugyintezo`, `betekinto`, `auditor`), miközben az `eaisyHR` már átállt a letisztult **3-szintű alapszerepkör + cégenkénti modul-hozzáférési mátrix** architektúrára ([A-087](./A-087-hr-simplified-roles-module-permission-matrix-and-p0-calculation-hardening.md)).

A két rendszer közötti eltérés több problémát okozott:
1. A felhasználói szerepkör-választókban (meghívás, szerkesztés, csapatkezelés) feleslegesen sok, nehezen átlátható szerepkör szerepelt.
2. A `/management` Control Center *Jogosultságok* fülén az `eaisyHR` már interaktív modul-hozzáférési mátrixszal rendelkezett, míg az `eaisyDocs` csak statikus szöveges összesítőt mutatott.
3. Az adatbázisban (`docs_szerepkor_enum`) és a TypeScript kódbázisban lévő keményen kódolt `'ugyintezo'` / `'iktato'` ellenőrzések (pl. `assign-dossier-dialog.tsx`, `dossiers/[id]/actions.ts`, `archive-client.tsx`) megakadályozták, hogy a `'munkavallalo'` szerepkörrel rendelkező felhasználókra ügyiratot lehessen szignálni vagy ők ügyiratot szerkeszthessenek.

---

## 2. Decision (A Meghozott Döntés)

### 2.1. 3 Kanonikus Alapszerepkör és 7 Szakmai Modul (`company-role-resolver.ts`)
- **3 kanonikus alapszerepkör (`DocsCoreRole`):**
  - `'munkavallalo'` (*Munkavállaló* — alapértelmezett modulok: `['inbox', 'dossiers', 'archive', 'partners']`)
  - `'vezeto'` (*Vezető* — alapértelmezett modulok: `['inbox', 'dossiers', 'archive', 'partners', 'audit']`)
  - `'admin'` (*Admin* — minden modul: `['inbox', 'dossiers', 'tasks', 'archive', 'partners', 'audit', 'rules', 'settings']`)
- **7 kapcsolható szakmai modul (`DOCS_PERMISSION_MODULES`):**
  - **Iratkezelési munkaasztal:** `inbox` (*Bejövő sor & Érkeztetés*), `dossiers` (*Iktatókönyv & Ügyiratok*), `archive` (*Irattár & Selejtezés*), `partners` (*Partnerek & Szerződések*).
  - **Vezérlés és megfelelőség:** `audit` (*Eseménynapló & Audit*), `rules` (*Iktatási és Értesítési Szabályok*), `settings` (*Céges Beállítások & Csapat*).
  - A `tasks` (*Feladatok*) alapmodul minden `eaisyDocs` felhasználó számára elérhető.
- A `normalizeDocsRoleAndModules(rawRole, explicitModules)` és az `isUserAuthorizedForDocsView(currentDocsRole, allowedRolesOrModules, docsModules)` visszafelé kompatibilisen leképezi a korábbi szerepkör-hívásokat (`'iktato'` -> `inbox` vagy `dossiers` modul, `'auditor'` -> `audit` modul, `'ugyintezo'` / `'betekinto'` -> `'munkavallalo'` / `'vezeto'`).

### 2.2. Háromlépcsős Adatbázis-Migráció (`20261104000001` – `20261104000003`)
1. **`20261104000001_docs_3_tier_roles_and_modules_matrix.sql`:**
   - Hozzáadja a `docs_modulok text[]` oszlopot a `company_members` és `felhasznalo_profil` táblákhoz.
   - Normalizálja az összes meglévő felhasználó és cégtagság `docs_szerepkor` és `docs_modulok` értékeit a 3 kanonikus szerepkörre (`admin`, `vezeto`, `munkavallalo`) adatvesztés nélkül.
   - Létrehozza a `public.has_docs_module_access(p_required_modules text[], p_company_id uuid, p_user_id uuid)` SQL függvényt, és frissíti a `get_effective_docs_role`, `check_irat_fajl_access`, `attach_irat_to_dossier_atomic` függvényeket, valamint a Docs RLS szabályokat (`irat`, `ugy`, `ugyirat`, `partner`, `esemeny_naplo`, `irattari_terv`, `szervezeti_egyseg`).
2. **`20261104000002_docs_role_defaults_and_triggers_fix.sql`:**
   - A `felhasznalo_profil.docs_szerepkor` és `felhasznalo_profil.szerepkor` oszlopok `DEFAULT` értékét `'munkavallalo'`-ra állítja.
   - Frissíti a `public.handle_new_user()`, `public.join_company_by_token(text)` és `public.admin_update_user_profile(...)` függvényeket, hogy új regisztrációkor és meghívókódos csatlakozáskor automatikusan `'munkavallalo'` szerepkör és `ARRAY['inbox', 'dossiers', 'archive', 'partners']` modul-lista kerüljön mentésre.
3. **`20261104000003_narrow_docs_szerepkor_enum_cleanup.sql`:**
   - Atomi tranzakcióban (`BEGIN ... COMMIT`) ideiglenesen eltávolítja a `felhasznalo_profil.docs_szerepkor` oszloptól függő 5 RLS policy-t (`app_error_logs_select_superadmin`, `app_error_logs_delete_superadmin`, `Irat fajl megtekintes szigoru ABAC`, `Csak admin szerkesztheti a rendszerbeallitasokat`, `irat_files_insert_write_roles`), szűkíti a `public.docs_szerepkor_enum` típust a tiszta `('munkavallalo', 'vezeto', 'admin')` értékekre, újrafordítja a függvényeket az új enum OID-ra, törli a régi típust, majd visszaállítja az 5 RLS policy-t.
4. **`20261104000004_fix_docs_hr_team_and_department_isolation.sql` és `settings-actions.ts`:**
   - A `getTeamMembers` (`src/app/settings/settings-actions.ts`) szigorúan kiszűri azokat a felhasználókat, akiknek az `elerheto_modulok` tömbjében nem szerepel a `'docs'` modul, és kizárólag az aktív céghez tartozó `szervezeti_egyseg` sorokat jeleníti meg (megakadályozva a más céghez tartozó osztályok átszivárgását).
   - A `createManagementUserAction` és `updateManagementUserAction` (`src/app/management/actions.ts`) a `docs_szerepkor` / `docs_modulok` és `hr_szerepkor` / `hr_modulok` oszlopokat modul-függően (`hasDocsAccess` / `hasHrAccess`) menti, és tisztítja a tisztán HR-es dolgozók `docs_*` mezőit.
5. **`20261104000005_docs_and_hr_read_write_permissions_matrix.sql` (Olvasás / Írás Mátrix — Auditor / Betekintő Támogatás):**
   - Bevezeti a `docs_iras_modulok text[]` és `hr_iras_modulok text[]` oszlopokat a `company_members` és `felhasznalo_profil` táblákban.
   - Létrehozza a `public.has_docs_write_access(p_required_modules text[], p_company_id uuid, p_user_id uuid)` és `public.has_hr_write_access(...)` SQL függvényeket, és az összes módosító (`INSERT`/`UPDATE`/`DELETE`/`FOR ALL`) `eaisyDocs` RLS szabályt és RPC-t (`attach_irat_to_dossier_atomic`, `ugyirat`, `irat`, `irat_fajl`, `partner_kapcsolattarto`, `ugyirat_hozzaferes`, `ugyirat_megjegyzes`, `irat_kapcsolat`, `irat_kolcsonzes_naplo`, `irat_fizikai_hely`, `selejtezes_tetel`, `company_filing_rules`, `irattari_terv`, `szervezeti_egyseg`, `rendszer_beallitas`, `storage.objects`) `has_docs_write_access` védelemre állítja át, miközben a `SELECT` szabályok továbbra is a `has_docs_module_access` (Olvasás) függvényt használják.
   - A `requireDocsAuthServer`, `getPermissions`, `hasDocsWriteAccess` és `hasHrWriteAccess` függvények modulonként ellenőrzik az írási jogosultságot, lehetővé téve tisztán olvasási jogú (Auditor / Betekintő) felhasználók beengedését mind az `eaisyDocs`, mind az `eaisyHR` moduljaiba.

### 2.3. Kód-Szintű Gomb-, Dialógus- és Server Action Harmonizáció
- **Szignálási dialógus (`src/components/assign-dossier-dialog.tsx`):** A felelős-választó szűrője (`eligibleUsers`) mostantól engedélyezi a `'munkavallalo'` szerepkört.
- **Ügyirat-módosító szerver műveletek (`src/app/dossiers/[id]/actions.ts`, `template-actions.ts`, `version-actions.ts`, `task-actions.ts`):** A `checkDossierWritePermission` és a társ-actionök kezelik a `'munkavallalo'` szerepkört (osztály-azonosság, felelősi kijelölés vagy explicit hozzáférés alapján), miközben a végleges irattározást (`closeDossier`) továbbra is csak `'vezeto'` és `'admin'` végezheti.
- **Irattári jóváhagyás (`src/components/archive-client.tsx`):** A „Selejtezés Jóváhagyása" gomb elrejtése `'munkavallalo'` és `'ugyintezo'` szerepkörnél egyaránt érvényesül.
- **Oldal-betöltők (`inbox`, `dossiers`, `archive`, `partners`, `dashboard`, `tasks`):** Minden oldal a cég-hatókörű `getActiveCompanyMemberRolesServer()` (`scopedRoles.docsRole` + `scopedRoles.docsModules`) eredményét adja át a `getPermissions(role, docsModules)` függvénynek.

---

## 3. Consequences (Következmények)

- **Pozitív:** Az `eaisyDocs` és az `eaisyHR` jogosultsági modellje teljesen egységes (3 alapszerepkör + cégenkénti modul-hozzáférési mátrix), az adatbázis `docs_szerepkor_enum` típusa tiszta (`munkavallalo`, `vezeto`, `admin`), és minden UI gomb és szerver-action zökkenőmentesen működik `'munkavallalo'` szerepkörrel is.
- **Kompromisszum:** A kód-szintű visszafelé kompatibilitási leképezések (`normalizeDocsRoleAndModules`) megmaradtak a védelmi rétegben, hogy külső vagy historikus hívások se okozhassanak futásidejű hibát.
