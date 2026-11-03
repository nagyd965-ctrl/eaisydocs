# A-111: [Közös] Management Dashboard architektúra, céges/felhasználói modul-izoláció és érkeztetőszám allokáció PK javítás

- **Dátum:** 2026-11-03
- **Státusz:** Elfogadva
- **Hatókör:** `[Közös]` (eaisyDocs & eaisyHR)
- **Kapcsolódó döntések:** [A-029](./A-029-global-ui-consistency-and-unified-components.md), [A-109](./A-109-complete-system-audit-and-security-hardening.md), [A-110](./A-110-direct-company-member-addition-and-bidirectional-module-isolation.md), [P-140](../../product/decisions/P-140-management-dashboard-and-control-center-ux.md)

## Kontextus

1. **Központi Management Dashboard (`/management`):** Szükség volt egy központi, több-bérlős (multi-tenant) szuperadminisztrátori felügyeleti vezérlőpultra (`eaisyDocs` és `eaisyHR` közös adatbázisán), amely dedikált e-mail + jelszó bejelentkezéssel védett, és lehetővé teszi:
   - a regisztrált cégek moduljainak (`eaisyDocs` / `eaisyHR` / mindkettő) nyilvántartását és szerkesztését,
   - a felhasználók közvetlen felvételét és szerkesztését, beleértve az elérhető modulok (`elerheto_modulok`: `docs`, `hr`) és a cégenkénti eltérő szerepkörök (`company_members.docs_szerepkor`, `company_members.hr_szerepkor`, `company_members.role`) konfigurálását,
   - a központi hibanapló (`public.app_error_logs`), AI/LLM és infrastruktúra költségek, valamint a háttérfolyamatok (IMAP worker, AI worker, ütemezett cronok) valós idejű monitorozását.
2. **Érkeztetőszám allokáció (`public.erkeztetoszam_allokacio`) kompozit kulcs hiba:** Újonnan importált cégeknél (pl. `MAURONI MARCO ROMANO`) az eaisyBill számlaátvétel `there is no unique or exclusion constraint matching the ON CONFLICT specification` hibát dobott, mert a `20261102000002` migráció `CREATE TABLE IF NOT EXISTS` utasítása miatt az élő táblán az egysoros `PRIMARY KEY (ev)` maradt meg a `PRIMARY KEY (company_id, ev)` helyett.

## Döntés

1. **Adatbázis séma bővítés (`20261103000004_management_dashboard_schema.sql`):**
   - A `public.companies` tábla bővült az `elerheto_modulok text[] NOT NULL DEFAULT ARRAY['docs', 'hr']::text[]`, `is_active boolean NOT NULL DEFAULT true` és `plan text NOT NULL DEFAULT 'PRO'` oszlopokkal.
   - Létrejött a `public.app_error_logs` tábla RLS védelemmel és teljesítmény-indexekkel (`created_at DESC`, `company_id`, `error_type`, `severity`), amelybe a `RouteError` (`src/components/route-error.tsx`) automatikusan rögzíti az elkapott futásidejű hibákat.
2. **Dedikált Management munkamenet, szerepkör-szinkronizáció, előzetes cookie-mentes modul-ellenőrzés (`loginClientAction`) és eaisyBill tömeges cégimport (`src/app/management/actions.ts`, `src/app/login/actions.ts`, `src/app/login/login-form.tsx`):**
   - A `/management` útvonal dedikált `eaisydocs_mgmt_session` HttpOnly sütit használ (`loginToManagementAction`), és ha a felhasználó már bejelentkezett a `/login` oldalon a `management@thinkai.hu` szuperadmin fiókkal, a `loginClientAction` / `login` (`src/app/login/actions.ts`) automatikusan beállítja a sütit és közvetlenül a `/management` felületre irányítja.
   - Normál felhasználói bejelentkezésnél a `loginClientAction` először egy állapotmentes (`persistSession: false`) Supabase klienssel ellenőrzi a hitelesítő adatokat és a `felhasznalo_profil.elerheto_modulok` tömböt, mielőtt bármilyen SSR auth sütit írna. Ha a felhasználó olyan modulba próbál belépni, amelyhez nincs jogosultsága (pl. kizárólag `hr` jogosultságú fiókkal az `eaisyDocs` fülön), a szerver süti-módosítás és `NEXT_REDIRECT` kivétel nélkül `{ ok: false, message, suggestedModule }` JSON választ ad vissza (kiküszöbölve a `signInWithPassword` + `signOut` + `redirect` Set-Cookie ütközést), normál belépéskor pedig törli az esetlegesen beragadt `eaisydocs_mgmt_session` sütit és figyelmen kívül hagyja a `next=/management` átirányítást.
   - A `LayoutWrapper` (`src/components/layout-wrapper.tsx`) a `/management` útvonalat önálló, teljes képernyős nézetként kezeli.
   - A `getManagementEaisyBillCompaniesAction`, `importManagementEaisyBillCompanyAction` és `importManagementEaisyBillCompaniesBulkAction` szerverakciók lehetővé teszik az `eaisyBill` adatbázisban szereplő cégek egyedi és tömeges (multi-select) importálását közvetlenül a Management Dashboardról és a felhasználó-szerkesztő modálból.
   - A `saveUserPermissionsFromManagementAction` kétirányú szinkronban frissíti a `felhasznalo_profil.elerheto_modulok` tömböt és a `company_members` tábla `docs_szerepkor`, `hr_szerepkor` és `hr_modulok` mezőit, audit-naplózással a `hr_esemeny_naplo` táblába.
3. **Stealth Superadmin (`ThinkAI Management` / `management@thinkai.hu`) ügyféloldali elrejtése (`src/utils/stealth-superadmin.ts`):**
   - A `management@thinkai.hu` (`f1eb20c2-2897-4183-a96a-d9226dfd19e3`) technikai szinten minden céghez hozzá van rendelve a `company_members` táblában a belépéshez, azonban az `isStealthSuperadmin` szűrő elrejti az összes ügyféloldali tag- és csapatlistából (`getCompanyMembersAction`, `getTeamMembers`, `getAllUsersForAdmin`, ügyirat/feladat felelős választók, `eaisyHR` szervezeti/admin/jogosultsági listák és a `/management` céges taglétszám-számlálói).
4. **Hibaközpont életciklus-kezelés és Élő Kódbázis + Gemini 2.5 AI Analízis (`src/app/management/actions.ts`):**
   - A `deleteErrorLogsAction(ids, permanent)`, `restoreErrorLogsAction(ids)` és `clearAllErrorLogsAction(permanent)` az `app_error_logs.context` JSONB mezőben (`_mgmt_status: "resolved"`, `_mgmt_resolved_at`) tárolja a megoldott/törölt állapotot sémamódosítás nélkül, támogatva a visszaállítást és a végleges törlést is.
   - Az `analyzeErrorLogsWithAiAction(ids)` egyedi és tömeges kijelölésnél is élőben ellenőrzi az érintett `src/` forrásfájlokat (`buildDiagnosticForErrorRow`) és a Gemini 2.5 Flash modellt, majd a strukturált diagnózist (`fix_status`, `summary`, `root_cause`, `resolution_status_text`, `solution_steps`, `affected_file`) elmenti az `app_error_logs.context._mgmt_ai_analysis` mezőbe.
5. **Érkeztetőszám allokáció PK javítás (`20261103000003_fix_erkeztetoszam_allokacio_pkey_and_sync_counters.sql`):**
   - A `public.erkeztetoszam_allokacio` tábla elsődleges kulcsát `PRIMARY KEY (company_id, ev)` kompozit kulcsra alakítottuk át, és a meglévő `irat` rekordok alapján szinkronizáltuk az összes cég számlálóját.

## Következmények

- Minden meglévő és jövőbeli cég érkeztetőszám-allokációja (`generate_erkeztetoszam`) ütközésmentesen, cégenként izoláltan működik.
- A `/management` felületen a szuperadminisztrátor egyetlen helyről kezelheti a cégek (beleértve az `eaisyBill`-ből tömegesen importált cégeket), a felhasználók és a 10 HR modul jogosultságait, miközben a `ThinkAI Management` technikai fiók láthatatlan marad az ügyfelek számára.
- A Hibaközpontban minden hiba egyenként vagy tömegesen elemezhető AI-val (élő kódbázis-ellenőrzéssel), megoldottnak jelölhető, visszaállítható vagy véglegesen törölhető.
