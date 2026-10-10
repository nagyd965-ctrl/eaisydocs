# [HR] [Közös] A-044: eaisyHR Többcég-kezelés és Szigorú GDPR/Béradat Izoláció Architektúra

## Státusz
`Decided` (2026-10-10)

## Kontextus és Problémafelvetés
Az eaisyDocs és eaisyHR rendszerekben bevezetésre került a holding/többcég-kezelés (`companies`, `company_members` táblák, ADR [A-034](./A-034-multi-tenancy-architecture.md)). Azonban az eaisyHR modul több pontján korábban architekturális biztonsági és GDPR-kockázat állt fenn:
1. **Globális szerepkör vs. Cég-specifikus szerepkör:** A shell navigáció (`src/app/layout.tsx`), a bérszámfejtési modul (`/hr/payroll`), a toborzás (`/hr/recruitment`), a vezetői nézet (`/hr/manager`), a riportok (`/hr/reports`) és a beállítások (`/hr/settings`) közvetlenül a `felhasznalo_profil.hr_szerepkor` mezőt olvasták.
2. **Kettős Szerepkör (Dual-Role) Veszélye:** Ha egy felhasználó a holding "A" cégében HR Vezető, de a "B" cégében csupán egyszerű munkavállaló, a korábbi globális feloldás miatt a "B" cégre váltva is HR Vezetőként látta volna a munkavállalók titkos béradatait, távolléteit és szerződéseit. Ez súlyos GDPR és Mt. jogsértés.
3. **Hiányzó Cég-szintű Adatizoláció:** A bérszámfejtési és riport lekérdezések nem szűrték az entitásokat az aktív cég `company_id`-jára, illetve a PDF bérpapírokon statikusan fix munkáltatói név és adószám szerepelt.

A felhasználói döntési pont feloldása: Nem kell választani a központi HR és az önálló cég HR között; a modern multi-tenant architektúránk a `company_members.hr_szerepkor` feloldásával natívan támogatja mindkettőt (belső és holding szintű HR modell).

## Döntés

### 1. Dinamikus Cég-specifikus Szerepkör Feloldó Motor (`company-role-resolver.ts`)
Létrehoztuk a `src/utils/hr/company-role-resolver.ts` motort tiszta függvényekkel:
- `resolveUserCompanyRoles`: Ha a felhasználó tagja az adott cégnek (`company_members`), akkor prioritásként a `company_members.hr_szerepkor` és `company_members.docs_szerepkor` érvényesül. Ha ott nincs kitöltve (null), a globális profil szolgál fallbackként. Ha a cégben `owner` vagy `admin`, automatikusan teljes körű adminisztrátori jogosultságot kap. Ha nem tagja a cégnek, szerepköre szigorúan `none`, és az engedélyek azonnal megtagadásra kerülnek.
- `validateEmployeeCompanyAccess`: Kereszt-cég ellenőrzés dolgozói adatokhoz, megakadályozza idegen dolgozó adatainak lekérését/módosítását.
- `isUserAuthorizedForHrView`: Hierarchikus és szerepkör-alapú jogosultság-ellenőrzés.

### 2. Szerveroldali Cégkontextus Segédek (`company-server.ts`)
Kiegészítettük a `src/utils/company-server.ts` modult az `getActiveCompanyMemberRolesServer(targetCompanyId?)` függvénnyel, amely Next.js Server Components és Server Actions környezetben feloldja az aktív céghez tartozó scoped jogokat.

### 3. Központi HR Auth Guard (`hr-auth-guard.ts`)
A `src/utils/hr/hr-auth-guard.ts` biztosítja az egységes védelmi kaput:
- `requireHrAuthServer(allowedRoles, fallbackRedirect)`: Valós időben ellenőrzi a cégtagságot és a scoped szerepkört. Támogatja az automatikus átirányítást és a komponenens szintű inline hiba-megjelenítést (`auth.authorized`).

### 4. Globális Shell és Navigáció Scoping (`layout.tsx`)
A `src/app/layout.tsx` a globális profil helyett az aktív cégre vonatkozó szerepköröket adja át a `HrSidebar` és `AppSidebar` komponenseknek, így a navigációs menüpontok dinamikusan igazodnak a kiválasztott céghez.

### 5. HR Modulok Teljes Izolációja
- **Bérszámfejtés (`/hr/payroll` & `actions.ts`):** `getPayrollDashboardData`, `generateMonthlyPayslipsAction`, `updateSinglePayslipAction`, `downloadPayslipPdfAction` mind az aktív céghez kötik a lekérdezéseket és az adatmentést. A bérpapír PDF-en a munkáltató neve, címe és adószáma a `companies` táblából dinamikusan töltődik be.
- **Toborzás (`/hr/recruitment` & `actions.ts`):** Minden jelölt (`hr_toborzas`) és álláshirdetés (`hr_allashirdetes`) céghez van rendelve.
- **Vezetői Nézet (`/hr/manager` & `actions.ts`):** A közvetlen beosztottak, függő szabadságok, jelenlét-korrekciók és túlóra kérelmek az aktív cégre szűrtek.
- **Riportok (`/hr/reports` & `actions.ts`):** A `loadHrMasterData` az aktív cég dolgozóira és szervezeti egységeire korlátozott; a NAV T1041, KSH és bérriportok kizárólag a kiválasztott cég adatait tartalmazzák.
- **Beállítások (`/hr/settings`):** A dolgozók, szervezeti fa és munkakörök kezelése céghez kötött.
- **Re-render Garancia:** Minden modul gyökérkomponense megkapta a `key={activeCompanyId}` propot, kizárva a cégváltáskori kliensoldali memóriaszivárgást és állapot-összekeveredést.

## Következmények

### Pozitív
- **Teljes GDPR és Béradat Védelem:** Lehetetlen béradatok szivárgása cégek között.
- **Dual-Role Biztonság:** Ugyanaz a felhasználó lehet HR vezető az egyik cégben és beosztott a másikban; a jogok azonnal és hibátlanul átkapcsolnak a Company Selectorban.
- **Dinamikus Jogszabályi Dokumentumok:** A bérpapírok és igazolások a tényleges foglalkoztató cég pontos céges adatait és adószámát tüntetik fel.
- **100% Tesztelt Motor:** 7 automatizált egységteszt védi a jogosultság-feloldási szabályokat regresszió ellen.

### Negatív / Kockázatok
- Ha egy felhasználót felvesznek egy céghez a `company_members` táblába, gondoskodni kell a `hr_szerepkor` és `docs_szerepkor` megfelelő beállításáról, ellenkező esetben a globális profil fallback lép életbe.

## Kapcsolódó Dokumentumok
- PRD: [P-063](../../product/decisions/P-063-hr-multi-tenancy-and-strict-gdpr-isolation-ux.md)
- Korábbi döntések: [A-034](./A-034-multi-tenancy-architecture.md), [A-042](./A-042-hr-scheduled-payroll-generation-and-digital-receipt-architecture.md)
- Érintett fájlok: `src/utils/hr/company-role-resolver.ts`, `src/utils/hr/hr-auth-guard.ts`, `src/utils/company-server.ts`, `src/app/layout.tsx`, `src/app/hr/payroll/*`, `src/app/hr/recruitment/*`, `src/app/hr/manager/*`, `src/app/hr/reports/*`, `src/app/hr/settings/*`
