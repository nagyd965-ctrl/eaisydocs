# A-090: [HR] Modul-alapú RLS Jogosultság-szinkronizáció (`has_hr_module_access`), Titkosított RPC Frissítés és Vezetői Teljesítményértékelési Hatókör (`resolvePerformanceAccessContext`)

**Status:** Decided  
**Date:** 2026-10-28  
**Scope:** [HR]  
**Author:** Antigravity Agent  
**Kapcsolódó PRD:** [P-123](../../product/decisions/P-123-performance-manager-team-scope-and-hr-module-visibility.md)  
**Kapcsolódó Kód:**
- `supabase/migrations/20261028000005_sync_hr_rls_and_rpcs_with_module_permissions.sql`
- `src/utils/hr/performance-access.ts`
- `src/app/hr/performance/page.tsx`
- `src/app/hr/performance/dashboard/page.tsx`
- `src/app/hr/performance/actions.ts`
- `src/app/hr/admin/page.tsx`
- `src/app/hr/organization/page.tsx`
- `src/app/hr/job/[id]/page.tsx`
- `src/app/hr/orgunit/[id]/page.tsx`
- `src/app/hr/employee/[id]/page.tsx`
- `src/app/hr/employee/[id]/actions.ts`
- `src/app/hr/time/page.tsx`
- `src/app/hr/cafeteria-actions.ts`
- `src/app/hr/manager/actions.ts`
- `src/app/hr/onboarding/actions.ts`

---

## 1. Context (Kontextus)

1. **Vezetői jogosultság-inkonzisztencia a Teljesítményértékelés (`/hr/performance`) modulban (`2. P0`):**
   - A `vezeto` szerepkörrel rendelkező középvezetők a `/hr/performance` oldalon a teljes vállalat összes dolgozóját és KPI-ját látták, de amikor értékelni (`evaluateKpi`) vagy új célkitűzést felvenni (`assignEmployeeKpi`) próbáltak a saját beosztottjaiknak, a `src/app/hr/performance/actions.ts` `requirePerformanceAdmin()` függvénye elutasította őket, mert csak a `["hr_vezeto", "hr_munkatars", "admin"]` szerepköröket engedte át.
2. **Adatbázis RLS és titkosított RPC-k szinkronhiánya a 3 alapszerepkör + `hr_modulok` migráció után:**
   - A `20261028000002` migrációban a 10 régi HR szerepkört 3 alapszerepkörre (`munkavallalo`, `vezeto`, `admin`) és a `hr_modulok text[]` tömbre (`admin`, `organization`, `time`, `payroll`, `compliance`, `reports`, `recruitment`, `onboarding`, `offboarding`, `audit`) egyszerűsítettük.
   - A PostgreSQL RLS szabályok (`hr_dolgozo_adatlap`, `hr_jogviszony`, `hr_beosztas`, `hr_tavollet`, `hr_jelenlet`, `hr_orvosi_vizsgalat`, `hr_fegyelmi`, `hr_dokumentum`, `hr_berpapir`, `hr_cafeteria_*` stb.) és a titkosított PII RPC-k (`get_decrypted_hr_data`, `update_decrypted_hr_data`) azonban még kizárólag a `hr_szerepkor IN ('hr_vezeto', 'hr_munkatars', 'admin')` enumértékeket ellenőrizték.
   - Emiatt a `vezeto` alapszerepkörű, de minden HR modullal rendelkező HR vezető a `/hr/admin` Dolgozói Törzsadatbázisban 7 aktív dolgozó helyett csak 2 főt (saját magát és a közvetlen beosztottját) látott, valamint több szerveroldali művelet (`employee/[id]/actions.ts`, `cafeteria-actions.ts`, `manager/actions.ts`, `onboarding/actions.ts`) is elutasította a műveleteit.

---

## 2. Decision (A Meghozott Döntés)

### 2.1. `resolvePerformanceAccessContext` és Vezetői Csapatszűrés (`src/utils/hr/performance-access.ts`)
- Létrehoztuk a központi `resolvePerformanceAccessContext()` szerveroldali segédfüggvényt:
  - **`isCompanyWideAdmin = true`:** Ha a felhasználó `admin` szerepkörű, vagy rendelkezik az `admin` (HR Munkaasztal) modul-jogosultsággal, a teljes vállalat dolgozóit, KPI-katalógusát és értékelési ciklusait kezelheti.
  - **`isManagerOnly = true`:** Ha a felhasználó `vezeto` szerepkörű (vagy van közvetlen beosztottja a `kozvetlen_vezeto_id = user.id` / `get_hr_subordinates` alapján), de nem rendelkezik teljes körű HR Admin modullal, a `/hr/performance` és `/hr/performance/dashboard` oldalakon **kizárólag a saját közvetlen beosztottjait** látja (`allowedEmployeeIds = subordinateIds`), viszont a saját csapata számára teljes körűen tud:
    - egyéni KPI célkitűzést kitűzni (`assignEmployeeKpi`),
    - előrehaladást és eredményt frissíteni (`updateKpiProgress`),
    - vezetői értékelést és visszajelzést rögzíteni (`evaluateKpi`),
    - lezáratlan KPI-t törölni (`deleteEmployeeKpi`).
  - A globális cikluskezelés (`createPerformanceCycle`, `updateCycleStatus`) és a vállalati KPI-katalógus szerkesztése (`createKpiCatalogItem`, `deleteKpiCatalogItem`) továbbra is HR Admin jogosultsághoz kötött.

### 2.2. Adatbázis szintű `public.has_hr_module_access(p_modules text[])` és RLS / RPC szinkronizáció (`20261028000005`)
- Létrehoztuk a `public.has_hr_module_access(p_modules text[])` `SECURITY DEFINER` PostgreSQL függvényt, amely ellenőrzi:
  1. a globális admin szerepköröket (`admin`, `rendszergazda`, `hr_vezeto`, `hr_munkatars`),
  2. a `felhasznalo_profil.hr_modulok && p_modules` átfedést,
  3. a cégspecifikus `company_members.hr_modulok && p_modules` átfedést.
- Frissítettük a `get_decrypted_hr_data` és `update_decrypted_hr_data` titkosított RPC-ket, valamint az összes `hr_*` tábla RLS szabályát, hogy a `public.has_hr_module_access(...)` függvényen keresztül a modul-alapú jogosultságokat is érvényesítsék.
- Az érintett HR oldalakon (`/hr/admin`, `/hr/organization`, `/hr/job/[id]`, `/hr/orgunit/[id]`, `/hr/employee/[id]`, `/hr/time`) és Server Actionökben (`employee/[id]/actions.ts`, `cafeteria-actions.ts`, `manager/actions.ts`, `onboarding/actions.ts`) egységesítettük a `hr_modulok` ellenőrzést és a cég-hatókörrel (`companyScope`) szűrt `supabaseAdmin` lekérdezéseket.

### 2.3. Aktív Beosztás (`hr_beosztas` — `ervenyes_ig IS NULL`) Egységes Feloldása és Cache Invalidáció
- A `hr_beosztas` tábla történeti soraiban a lezárt munkakörök `ervenyes_ig` dátummal rendelkeznek, míg az aktuálisan betöltött munkakör `ervenyes_ig IS NULL`.
- Minden dolgozói és adminisztratív nézetben (`/hr/admin`, `/hr/organization`, `/hr/employee/[id]`, `/hr/self-service/profile`, `/hr`, `/hr/manager`, `employee-table.tsx`, `employee-edit-dialog.tsx`) a `hr_beosztas[0]` helyett kizárólag a lezáratlan (`!b.ervenyes_ig`) beosztást oldjuk fel aktív munkakörként, így a „Nincs munkakör beállítva” állapot vagy a munkakörváltás azonnal, beragadt régi munkakör nélkül érvényesül.
- A munkakör-módosító Server Actionök (`src/app/hr/settings/actions.ts`, `src/app/hr/job/[id]/actions.ts`) a `/hr/self-service/profile` és `/hr` útvonalakat is invalidálják (`revalidatePath`).

---

## 3. Consequences (Következmények)

- **Pozitív:**
  - A `hr vezeto` és minden `admin` / szakmai modullal felruházott felhasználó a `/hr/admin` Dolgozói Törzsadatbázisban és a részletoldalakon hiánytalanul látja a vállalat összes aktív dolgozóját (7/7 fő).
  - A középvezetők (`vezeto` szerepkör HR Admin modul nélkül) a `/hr/performance` és `/hr/performance/dashboard` felületeken csak a saját csapatukat látják, és a saját beosztottjaik célkitűzéseit hiba nélkül tudják értékelni és menedzselni.
- **Kockázat / Kompromisszum:**
  - A `supabaseAdmin` használatakor a szerveroldali kódnak mindig explicit módon szűrnie kell a `companyScope` / `safeMemberIds` halmazra (ezt minden érintett oldalon érvényesítettük).
