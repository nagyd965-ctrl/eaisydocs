# [Közös] [HR] [Docs] A-066: Multi-tenant Cégtagsági Láthatóság és Moduláris HR Állomány Elszigetelés Architektúra

## Státusz
`Decided` (2026-10-18)

## Kontextus és Problémafelvetés
Az eaisyDocs és eaisyHR rendszerekben a holding/többcég-kezelés (`companies`, `company_members` táblák, ADR [A-034](./A-034-multi-tenancy-architecture.md), ADR [A-044](./A-044-hr-multi-tenancy-and-strict-gdpr-isolation.md)) bevezetése után súlyos láthatósági és izolációs probléma lépett fel a köztes szerepköröknél:
1. **Rejtett RLS hiba a `company_members` táblán:** A korábbi SELECT házirend (`Members can view their own memberships`) a céges tagok lekérdezését a `user_id = auth.uid() OR role IN ('owner', 'admin')` feltételhez kötötte. Emiatt a cég nem-tulajdonos tagjai (`role = 'member'`), köztük a HR vezető (`hr_vezeto`), HR munkatárs (`hr_munkatars`), részlegvezetők és iratkezelők, amikor a céges tagokat kérdezték le, az adatbázis RLS elrejtette előlük a cég többi tagját (kollégáit).
2. **HR Munkaasztal vakság:** Amikor a HR vezető belépett a `/hr/admin` oldalra, a rendszer az aktív cég (pl. Think AI Kft.) 23 tagja helyett kizárólag a saját fiókját adta vissza, így a HR munkaasztalon a teljes állomány 1 főre zuhant, és a HR vezető még a közvetlen HR-es kollégáját (`betekinto`) sem látta.
3. **Moduláris szétválasztás szükségessége (eaisyDocs vs. eaisyHR):** A két rendszer két független termék közös adatbázison (ADR [A-005](./A-005-hr-modular-independence-architecture.md)). Egy cég összes tagja (pl. 23 fő) a cégbeállításoknál látható, viszont az eaisyHR Dolgozói Törzsadatbázisában (`/hr/admin`) és szervezeti felépítésében (`/hr/organization`) szigorúan **csak a cég tényleges HR munkavállalói** (a 8 fős állomány, akik rendelkeznek `hr_dolgozo_adatlap`-pal) szerepelhetnek. A tisztán eaisyDocs felhasználók nem keveredhetnek a munkaügyi állományba.

## Döntés

### 1. `company_members` SELECT Házirend Javítása (Migráció: `20261018000001_fix_company_members_select_policy.sql`)
A `company_members` SELECT RLS szabályát úgy módosítottuk, hogy a cég bármely autentikált tagja láthassa a saját cégéhez tartozó tagokat:
```sql
DROP POLICY IF EXISTS "Members can view their own memberships" ON public.company_members;
DROP POLICY IF EXISTS "Members can view members of their own companies" ON public.company_members;

CREATE POLICY "Members can view members of their own companies"
  ON public.company_members FOR SELECT
  TO authenticated
  USING (
    public.user_has_company_access(company_id)
  );
```
- **Tenant Izoláció:** A `public.user_has_company_access(company_id)` függvény garantálja, hogy egy felhasználó idegen cég tagjait soha ne láthassa.
- **Adminisztrációs védelem:** A tagok meghívása, szerkesztése és törlése továbbra is kizárólag a cégtulajdonosoknak és cégadminoknak engedélyezett (`role IN ('owner', 'admin')`).

### 2. Szigorú HR Állomány Szűrés a HR Munkaasztalon (`src/app/hr/admin/page.tsx`)
- Az aktív dolgozók szűrésénél (`activeEmployees`) kötelezővé tettük a `company_id` egyezést:
  ```typescript
  if (!emp.hr_dolgozo_adatlap) return false
  const adatlap = Array.isArray(emp.hr_dolgozo_adatlap) ? emp.hr_dolgozo_adatlap[0] : emp.hr_dolgozo_adatlap
  if (!adatlap) return false
  if (adatlap.company_id && adatlap.company_id !== companyScope) return false
  ```
- A tisztán Docs felhasználók (akiknek nincs `hr_dolgozo_adatlap`-juk az adott cégnél) automatikusan és maradéktalanul kívül maradnak az eaisyHR Dolgozói Törzsadatbázisán.
- Az elérhető Docs felhasználók listáját (`docsProfiles`) a céghez tartozó tagokra korlátoztuk (`.in("id", safeMemberIds)`), megelőzve az idegen cégekből történő téves importálást.

### 3. Szervezeti Felépítés és Fa Szűrés (`src/app/hr/organization/page.tsx`)
- A szervezeti ábra (`OrgChartTree`) és az egységek létszám-számlálója kizárólag azokat a munkatársakat (`hrEmployees`) veszi figyelembe, akik érvényes céges `hr_dolgozo_adatlap`-pal rendelkeznek.

## Következmények

### Pozitív
- A HR vezető (`hr_vezeto`) és a HR munkatárs belépve azonnal a pontos 8 fős céges HR állományt látja a munkaasztalon és a szervezeti fán.
- A 15 tisztán eaisyDocs felhasználó nem szennyezi be a HR munkaügyi állományt, de szükség esetén az *„Új Dolgozó Felvétele”* / *„Importálás eaisyDocs-ból”* funkcióval beemelhető az eaisyHR-be.
- A cégbeállítások `Cég` fülén továbbra is a teljes 23 fős céges névsor látható modul-besorolással.
- A cégek közötti szigorú GDPR és multi-tenant izoláció 100%-osan érintetlen és biztonságos maradt.

## Kapcsolódó Dokumentumok
- PRD: [P-085](../../product/decisions/P-085-multi-tenant-company-members-colleague-visibility-and-hr-workforce-isolation-ux.md)
- Korábbi döntések: [A-005](./A-005-hr-modular-independence-architecture.md), [A-034](./A-034-multi-tenancy-architecture.md), [A-044](./A-044-hr-multi-tenancy-and-strict-gdpr-isolation.md)
