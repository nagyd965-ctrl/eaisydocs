# A-087: [HR] [Közös] 3 Alapszerepkörös HR Jogosultsági Modell, Modul-hozzáférési Mátrix és P0 Szabálymotor Megerősítés

**Status:** Decided  
**Date:** 2026-10-28  
**Scope:** `[HR]` `[Közös]`  
**Author:** Antigravity  
**Kapcsolódó PRD:** [P-120](../../product/decisions/P-120-hr-permissions-matrix-tab-and-p0-module-hardening-ux.md)  
**Kapcsolódó Kód:** `supabase/migrations/20261028000001_add_break_tracking_to_hr_jelenlet.sql`, `supabase/migrations/20261028000002_hr_simplified_roles_and_module_permissions.sql`, `supabase/migrations/20261028000003_add_munkanapok_szama_to_hr_tavollet.sql`, `src/utils/hr/company-role-resolver.ts`, `src/utils/company-server.ts`, `src/utils/hr/hr-auth-guard.ts`, `src/app/hr/permissions/actions.ts`, `src/utils/hr/leave-calculator.ts`, `src/utils/hr/payslip-calculator.ts`, `src/app/hr/payroll/actions.ts`, `src/app/hr/reports/actions.ts`, `src/app/hr/actions/t1041-actions.ts`, `src/app/hr/offboarding/actions.ts`

---

## 1. Context (Kontextus)

Az eaisyHR modul-érettségi auditja (`docs/eaisyhr-modul-erettsegi-es-fejlesztesi-terv.md`) során két fő építészeti terület igényelt rendszerszintű beavatkozást:

1. **Túlbonyolított, merev 10 szerepkörös HR modell:**
   - Korábban a dolgozó felvételekor és szerkesztésekor 10 különálló szerepkör (`munkavallalo`, `vezeto`, `hr_munkatars`, `hr_vezeto`, `berszamfejto`, `toborzo`, `munkavedelmi_felelos`, `auditor`, `admin`, `rendszergazda`) közül kellett egyet választani.
   - Ez a gyakorlatban rugalmatlan volt: egy HR szervezeti egységbe tartozó munkatársnál nem lehetett egyedileg szabályozni, hogy például csak a *Toborzás* és *Beléptetés* modulokhoz férjen hozzá, a *Bérszámfejtéshez* viszont ne, vagy hogy egy pénzügyes kolléga megkapja a *Bérszámfejtés* és *Riportok* hozzáférést anélkül, hogy teljes HR szerepkört kapna.
2. **P0 Kritikus Szerveroldali RBAC, Munkaidő-, Szabadság-, Bér- és Cégadat-feloldási Pontatlanságok:**
   - Több `SUPABASE_SERVICE_ROLE_KEY`-t használó Server Action (`admin/actions.ts`, `orgunit/[id]/actions.ts`, `idp-actions.ts`, `payroll/actions.ts`, `reports/actions.ts`, `offboarding/actions.ts`) nem védett központi szerepkör- és modul-ellenőrzéssel.
   - A napi ebédszünet (`toggleBreak`) csak kliensoldali `localStorage`-ban élt, és a kicsekkolás utáni „Munka folytatása” gombbal újranyitott műszaknál a köztes kieső idő is ledolgozott munkaidőnek számított.
   - A szabadságigénylés (`submitLeaveRequest`) nem vonta le a magyar munkaszüneti napokat / nem számolta bele az áthelyezett szombati munkanapokat, és nem ellenőrizte az éves szabadságkeretet.
   - A bérszámfejtési motor (`payslip-calculator.ts`, `payroll/actions.ts`) nem vette figyelembe a `munkaido_fte` részmunkaidő-szorzót, a SZÉP-kártyát egyéni TB/SZJA levonással terhelte a 28%-os munkáltatói közteher helyett, és duplán számolta a szabadságos napokat a ledolgozott napok mellett.
   - A KSH riport (`getKshReportData`) a részleg-órákat FTE-arányosított becsléssel számolta a tényleges `hr_jelenlet` és `hr_tavollet` adatok helyett.
   - A T1041, Offboarding és Munkaszerződés PDF generátorok a hardcoded `DEFAULT_COMPANY_DETAILS` konstansokat használták az aktív vállalat (`companies` tábla) valós adatai helyett.

---

## 2. Decision (A Meghozott Döntés)

### 2.1. 3 Alapszerepkör + 10 Modulos Jogosultsági Mátrix (`hr_modulok text[]`)
- **3 tiszta alapszerepkör:** A dolgozók alapbeállítása három hierarchikus szintre egyszerűsödik: `munkavallalo` (`Munkavállaló`), `vezeto` (`Vezető`) és `admin` (`Admin`).
- **Granuláris modul-jogosultságok (`hr_modulok text[]`):** A `company_members` és `felhasznalo_profil` táblák `hr_modulok text[]` tömboszloppal bővültek (`20261028000002_hr_simplified_roles_and_module_permissions.sql`), amely a 10 szakmai HR munkaasztal modult tárolja:
  - `admin` (Állomány és HR teendők)
  - `organization` (Szervezeti felépítés)
  - `time` (Műszakbeosztás és naptár)
  - `payroll` (Bérszámfejtés)
  - `compliance` (Munkaügyi megfelelőség)
  - `reports` (Hatósági riportok)
  - `recruitment` (Toborzás és karrier)
  - `onboarding` (Beléptetés)
  - `offboarding` (Kiléptetés)
  - `audit` (Eseménynapló)
- **Visszafelé kompatibilis feloldás (`resolveUserCompanyRoles` és `requireHrAuthServer`):**
  - Ha a felhasználó `admin`, automatikusan mind a 10 modulhoz hozzáfér.
  - Ha a felhasználó rendelkezik explicit `hr_modulok` elemekkel (vagy örökölt szakmai szerepkörrel, amelyet a migráció és a resolver automatikusan átkonvertál a megfelelő modulokra), a `hasHrModuleAccess(hrRole, hrModules, moduleKey)` és a `requireHrAuthServer(allowedRoles, requiredModule)` engedélyezi számára az adott modul oldalainak és Server Action-jeinek elérését.
  - A Jogosultságkezelő Mátrix (`/hr/organization?tab=permissions`) megtekintése és módosítása (`updateMemberHrPermissions`) **kizárólag `admin` szerepkörrel** engedélyezett.

### 2.2. P0 Szabálymotor és Adatintegritási Javítások
- **Ebédszünet adatbázis-perzisztencia (`20261028000001_add_break_tracking_to_hr_jelenlet.sql`):** A `hr_jelenlet` tábla `szunet_perc`, `szunet_ms` és `szunet_kezdete` oszlopokat kapott. A `toggleBreak` és a `toggleCheckIn` („Munka folytatása” esetén a `checkoutGapMs` beszámításával) pontosan levonja a szünetidőt a ledolgozott órákból a jelenléti íven, a PDF-ben, a bérszámfejtésben és a KSH riportban.
- **Ünnepnap- és éves keret-tudatos szabadságigénylés (`20261028000003_add_munkanapok_szama_to_hr_tavollet.sql`):** A `calculateWorkingDays` külön kezeli a munkaszüneti napokat (`athelye_munkanap = false`) és az áthelyezett szombati munkanapokat (`athelye_munkanap = true`), a `submitLeaveRequest` pedig ellenőrzi a maradék éves szabadságkeretet (`calculateAnnualLeave`) és menti a `munkanapok_szama` értéket.
- **Bérszámfejtési és KSH motor pontosítása:** A `calculatePayslipDetails` kezeli a `munkaidoFte` szorzót, a SZÉP-kártya juttatást (`cafeteriaBrutto`) leválasztja az egyéni SZJA/TB alapról (28% munkáltatói közteherrel számolva), a `getPayrollDashboardData` pedig levonja a szabadságos/betegszabadságos munkanapokat a ledolgozott napokból. A `getKshReportData` valós részlegenkénti `hr_jelenlet` és `hr_tavollet` órákat aggregál.
- **Dinamikus vállalati adatok (`resolveCompanyDetailsServer`):** A `src/utils/company-server.ts` központi segédfüggvénye az aktív vállalat `companies` rekordjából (`name`, `address`, `tax_number`, `representative_name`) tölti be a hivatalos cégadatokat a T1041, Offboarding és Munkaszerződés PDF generátorokba.

---

## 3. Consequences (Következmények)

**Pozitív:**
- Teljesen átlátható 3 szintű alapszerepkör (`Munkavállaló`, `Vezető`, `Admin`) kombinálva a végtelenül rugalmas, személyre szabható 10 modulos jogosultsági mátrixszal.
- Jogszabály- és Mt.-konform munkaidő-, szabadság-, bérszámfejtési és KSH számítások, valós többcéges PDF cégadatokkal.

**Kockázat / Kompromisszum:**
- A korábbi szakmai szerepkörökkel (`hr_munkatars`, `berszamfejto`, `toborzo`, stb.) rendelkező teszt- vagy meglévő rekordokat a `resolveDefaultModulesForLegacyRole` transzparensen leképezi a megfelelő `hr_modulok` tömbre, így egyetlen meglévő jogosultság sem vész el.
