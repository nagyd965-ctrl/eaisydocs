# ADR A-067: Átfogó HR Szerepkör Scoping, RPC és Route Guard Összehangolás [HR]

## Státusz
Elfogadva

## Kontextus
Az eaisyHR és eaisyDocs rendszerek jogosultsági modelljének átfogó auditja során kritikus funkcionális és navigációs anomáliák kerültek felszínre:
1. **Bérügyi / Bérszámfejtő (`berugyi`):** Teljesen kimaradt a `src/components/hr-sidebar.tsx` szűrőjéből, így a bérszámfejtő kizárólag a Dolgozói Portált látta. A `/hr/employee/[id]` adatlap kizárta (redirect), a `/hr/reports` oldalon nem létező `"konyvelo"` szerepkörre hivatkozott a guard, a PostgreSQL RPC-k (`get_decrypted_hr_data`, `update_decrypted_hr_data`) és az RLS szabályok pedig `'Access Denied'` kivételt dobtak bér-, adóazonosító- és bankszámla adatok lekérésekor vagy mentésekor.
2. **Munkavédelmi Felelős (`munkavedelmi`):** A sidebarban a munkavállalóval volt összevonva, így nem érte el a Munkaügyi és Munkavédelmi Megfelelőség (`/hr/compliance`) központot.
3. **Közvetlen Vezető (`vezeto`):** A sidebarban megjelent a Teljesítményértékelés (`/hr/performance`), de az oldal guardja kizárta a vezetőket ("Hozzáférés Megtagadva").
4. **Toborzó (`toborzo`):** A sidebarban megjelent az Onboarding és Kiléptetés is, de a route guardok 403-as hibával elutasították a toborzókat.

## Döntés
1. **Adatbázis RPC és RLS feloldás (`20261018000002_fix_hr_roles_permissions_and_rpc.sql`):**
   - A `get_decrypted_hr_data` és `update_decrypted_hr_data` függvényekben felvételre került a `berugyi` és `rendszergazda` szerepkör, valamint a cégtagsági (`company_members`) céghez kötött (scoped) szerepkörök ellenőrzése.
   - A `hr_dolgozo_adatlap` SELECT RLS szabálya kibővült a `berugyi` és `munkavedelmi` szerepkörökkel, valamint a közvetlen vezetői (`kozvetlen_vezeto_id`) kapcsolattal.
   - A `hr_dolgozo_titkos_adat` SELECT szabálya kibővült a `berugyi` szerepkörrel.
2. **Oldalsáv (`HrSidebar`) szerepkör- és almenü-szűrés:**
   - `berugyi`: Dolgozói Portál + HR Munkaasztal (Állomány, Bérszámfejtés, Naptár, Riportok, Szervezet).
   - `munkavedelmi`: Dolgozói Portál + HR Munkaasztal (Állomány, Munkaügyi Megfelelőség).
   - `toborzo`: Dolgozói Portál + Dolgozói Életút (kizárólag a jogosult Toborzás almenüvel).
   - `vezeto`: Dolgozói Portál + Vezetői nézet (Csapat, Teljesítményértékelés).
3. **Szerveroldali Route Guardok szinkronizálása:**
   - `/hr/reports`: `konyvelo` javítva `berugyi`-ra, `hr_munkatars` hozzáadva.
   - `/hr/performance`: `vezeto` szerepkör engedélyezve.
   - `/hr/compliance`: dedikált `requireHrAuthServer` hozzáadva `munkavedelmi` és `auditor` szerepkörökkel.
   - `/hr/time`: `berugyi`, `rendszergazda`, `auditor` hozzáadva.
   - `/hr/employee/[id]`: `berugyi` felvétele az adatlap és béradatok (`canViewSalary`) megtekintői közé.
   - `/hr/manager`: `requireHrAuthServer` guard beépítve.

## Következmények
- Minden munkatárs pontosan és kizárólag a hatáskörébe tartozó modulokat és almenüket látja.
- Megszűntek a 403-as "zsákutca" menüpontok és az indokolatlan kizárások.
- A bérszámfejtési és munkavédelmi folyamatok azonnal és biztonságosan elláthatók a rendszerben.
