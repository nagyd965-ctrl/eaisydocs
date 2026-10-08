# [Közös] A-034: Többcég-kezelés (Multi-Tenancy) és Adatelkülönítési Architektúra

## Státusz
Elfogadva (Implemented & Verified)

## Dátum
2026-10-08

## Kontextus és Problémafelvetés
Az eaisyDocs (iratkezelés) és eaisyHR (HR rendszer) eredetileg egyetlen vállalati környezetre (single-tenant modell) készült, ahol minden ügyirat, irat, partner, munkavállaló és jelenléti ív egyetlen közös szervezeti hatókörbe tartozott. A modern vállalatcsoportok, könyvelőirodák és holdingok működéséhez elengedhetetlen a többcég-kezelés (multi-tenancy):
1. Egy felhasználó több különböző céghez is hozzáférhet eltérő szerepkörökkel (pl. Cég A: admin, Cég B: munkavállaló).
2. Szigorú adatelkülönítés szükséges adatbázis szinten (RLS) anélkül, hogy a teljesítmény csökkenne.
3. A `visibill-ea0dbcac` (Visibill / eaisyBill) bevált többcég-kezelési mintájának adaptálása szükséges mind az adatbázis architektúrában, mind a felhasználói felületen.

## Döntések

### 1. Adatbázis Modell (Visibill minta)
- **`companies`**: Cégek törzstáblája (`id`, `name`, `tax_number`, `address`, `representative_name`, `phone`, `owner_id`, `share_token`, `country_code`, `created_at`, `updated_at`).
- **`company_members`**: Felhasználók és cégek kapcsolótáblája egyedi `(user_id, company_id)` párral és cég-specifikus szerepkörökkel (`role`: owner/admin/member, `docs_szerepkor`, `hr_szerepkor`).
- **`user_company_access_cache`**: Denormalizált, ultragyors jogosultsági gyorsítótár tábla, amelyet a `sync_company_member_cache` trigger tart azonnal szinkronban. Ez megakadályozza a rekurzív RLS al-lekérdezéseket és zárolásokat.

### 2. Kétszintű Adatelkülönítés
1. **Adatbázis szintű RESTRICTIVE RLS Házirendek**:
   - Létrehoztuk a `public.user_has_company_access(p_company_id uuid)` STABLE security definer függvényt.
   - Minden többcég-hatókörű üzleti táblára (irat, ügyirat, partner, feladat, jelenlét, dolgozói adatlap, stb. – összesen 37 tábla) felkerült a `tenant_isolation_restrictive` házirend `AS RESTRICTIVE` kulcsszóval.
   - Postgres szinten garantált, hogy még véletlen hibás alkalmazáskód esetén sem olvashat vagy módosíthat egy felhasználó más céghez tartozó rekordot.
2. **Alkalmazás szintű Konzisztens Szűrés (`getActiveCompanyIdServer()`)**:
   - A Server Components (`DashboardPage`, `InboxPage`, `DossiersPage`, `PartnersPage`, `TasksPage`, `HrAdminPage`, `TimePage`) az aktív cég azonosítóját (`activeCompanyId`) olvassák a cookie-ból, és explicite szűrik a lekérdezéseket (`.eq("company_id", activeCompanyId)`).
   - Új rekordok létrehozásakor (irat érkeztetés, ügyirat iktatás, partner mentés, feladat létrehozás, jelenlét becsekkolás) a `company_id` értéke automatikusan az aktív cég azonosítójára áll be.
   - **Külső integrációk és kötegelt csatornák**: Az eaisyBill számlaimport (`eaisybill-actions.ts`) és a kötegelt szkenner split mechanizmusa (`batch-scanner.ts`) szintén dinamikusan az aktív céghez (`company_id: activeCompanyId`) köti a beérkező iratokat és a felismert partnereket, megakadályozva a PostgreSQL default értékére (alapértelmezett cégre) történő téves visszaesést. A számlák duplikáció-ellenőrzése és a már importált elemek szűrése vállalatonként szeparált.

### 3. Hibrid Állapotkezelés (Next.js 16 App Router)
- **Szerveroldali Cookie Perzisztencia**: `eaisydocs_selected_company_id` HttpOnly/SameSite cookie, amelyet a `switchCompanyAction` frissít.
- **Kliensoldali React Context**: `CompanyProvider` és `useCompany()` hook gondoskodik a gyors, reaktív kliensoldali állapotról és szinkronizációról.

### 4. Biztonsági Mentés és Visszaállíthatóság
- A migráció előtt automatikus JSON adatbázis snapshot készült 77 nyilvános tábla összes soráról (`scratch/backup_pre_multitenancy_latest.json`).
- Minden migrációhoz párhuzamosan elkészült és tesztelt a fordított rollback script (`rollback_20261008000001_...`, `rollback_20261008000002_...`, `rollback_20261008000003_...`).

## Következmények és Előnyök
- **100% Adatbiztonság**: Postgres RESTRICTIVE RLS kizárja az illetéktelen hozzáférést a cégek között.
- **Nulla Adatvesztés**: Minden meglévő 2026-os rekord automatikusan a `Think AI Kft.` alapértelmezett céghez lett rendelve.
- **Azonnali Cégváltás**: A felhasználó egyetlen kattintással válthat a cégek között a fejlécben, az oldal automatikusan frissül a kiválasztott cég adataival.
