# [HR] [Közös] P-063: eaisyHR Többcég-kezelés és Szigorú GDPR/Béradat Izoláció Felhasználói Élmény (UX)

## Státusz
`Decided` (2026-10-10)

## Kontextus és Célok
A holding struktúrában vagy több önálló leányvállalatban működő szervezeteknél a HR adminisztrátorok és munkavállalók több cégben is jelen lehetnek. Korábban a cégváltás során a felhasználó globális profiljában tárolt szerepkör maradt aktív, ami azt eredményezte, hogy ha a felhasználó valamelyik cégnél HR joggal bírt, a többi cégnél is láthatta a védett HR adatokat.

A cél a felhasználói élmény tökéletesítése:
1. **Zökkenőmentes Cégváltás:** A Company Selector (`company-selector.tsx`) használatával történő cégváltáskor a menüpontok (`hr-sidebar.tsx`) és műszerfalak azonnal és automatikusan az adott cégnél érvényes jogosultságoknak megfelelően renderelődnek újra.
2. **Kettős Szerepkör Tiszta Kezelése:** Ha a felhasználó az "Alpha Kft."-nél HR Vezető, a bal oldali sávban látja a Bérszámfejtés, Riportok, Toborzás és Beállítások menüket. Ha átvált a "Beta Zrt."-re, ahol sima fejlesztő/munkavállaló, a HR vezetői menüpontok azonnal eltűnnek, és csak a Self-Service felület (Saját profil, Bérpapírjaim, Szabadságigénylés) érhető el.
3. **Munkáltatói Céges Identitás a Bérpapírokon:** A generált bérpapír PDF fejlécében mindig a kiválasztott cég hivatalos neve, címe és adószáma jelenik meg.
4. **Biztonsági Védelmi Fal (Access Denied Screen):** Ha egy felhasználó közvetlen URL-lel kísérelne meg olyan HR oldalt megnyitni, amelyhez az aktív cégben nincs jogosultsága, egy diszkrét, kanonikus hozzáférés megtagadva képernyőt kap piros `Shield` ikonnal és tiszta tájékoztatással.

## Felhasználói Folyamat és Képernyők

### 1. Cégváltás a Fejlécben
- A felhasználó a Company Selectorban kiválaszt egy másik céget.
- A szerver cookie (`active_company_id`) frissül, és a Next.js App Router teljes revalidációt végez.
- A modulok gyökérelemei a `key={activeCompanyId}` hatására tiszta állapotból töltődnek be, megakadályozva korábbi cég adatainak átvillanását.

### 2. Bérszámfejtési Műszerfal (`/hr/payroll`)
- A táblázat kizárólag a kiválasztott cég tagjait listázza.
- A havi előállítás gombbal generált bérpapírok az adott céghez kötődnek.
- A PDF letöltésekor a munkáltató adatai a `companies` táblából kerülnek a PDF fejlécébe.

### 3. Toborzási és Jelöltkezelő Tabok (`/hr/recruitment`)
- A Kanban oszlopokban és a meghirdetett állások listájában csak a kiválasztott cég álláshirdetései és jelentkezői láthatók.
- Auditor szerepkör esetén a rendszer read-only módban jelenik meg (szerkesztési gombok rejtve).

### 4. Vezetői Jóváhagyási Központ (`/hr/manager`)
- A vezető a fejléc statisztikai chipjeiben és az `UnifiedApprovalsPanel`-en kizárólag az aktív céghez tartozó közvetlen beosztottainak kérelmeit látja.
- A csapatnaptár (`TeamCalendar`) csak az adott cég munkatársainak távolléteit jeleníti meg.

### 5. Riportok és Hatósági Exportok (`/hr/reports`)
- A NAV T1041, KSH munkaügyi jelentés és havi bérszámfejtési export kizárólag a kiválasztott cég adatait tartalmazza.
- Az archívumban a feltöltött igazolások és bevallások cég szerint szeparáltak.

## Tervezési Szabályok és Megfelelőség
- **Linear Flat Design:** Nincsenek árnyékok, dark módban 1px finom border.
- **Tipográfia & Ikonok:** Montserrat betűtípus, Lucide React ikonok `h-4 w-4` méretezéssel.
- **KPI Kártyák:** A kanonikus `KpiCard` komponenst használják, tiltott a bal oldali színes szegélycsík és dekoratív emoji.
- **Biztonsági Zóna Jelölés:** A szigorú adatvédelmi zónákban diszkrét sárga `ShieldAlert` badge figyelmeztet az Mt. és GDPR előírásokra.

## Kapcsolódó Dokumentumok
- ADR: [A-044](../../architecture/decisions/A-044-hr-multi-tenancy-and-strict-gdpr-isolation.md)
- Érintett UI komponensek: `src/components/layout/hr-sidebar.tsx`, `src/components/layout/app-sidebar.tsx`, `src/app/hr/payroll/payroll-table.tsx`, `src/components/hr/unified-approvals-panel.tsx`, `src/components/hr/reports-tabs.tsx`
