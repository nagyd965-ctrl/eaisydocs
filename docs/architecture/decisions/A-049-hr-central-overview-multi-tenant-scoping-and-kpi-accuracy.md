# A-049 [HR] eaisyHR Központi Áttekintés Többcég-kezelés és Pontos KPI Metrikák

- **Dátum:** 2026-10-10
- **Státusz:** Decided
- **Hatókör:** [HR]
- **Kapcsolódó döntések:** [A-029](A-029-global-ui-consistency-and-unified-components.md), [A-044](A-044-hr-multi-tenancy-and-strict-gdpr-isolation.md), [P-068](../../product/decisions/P-068-hr-central-overview-multi-tenant-scoping-and-kpi-accuracy-ux.md)

## 1. Kontextus és Problémafelvetés
Az eaisyHR központi áttekintő irányítópultja (`src/app/hr/admin/overview/page.tsx`) korábban cégfüggetlenül vagy részlegesen szűrt lekérdezéseket futtatott. Ennek következtében amikor a felhasználó a felső fejlécben lévő globális cégválasztóval átváltott (pl. `Think AI Kft.`-ről `Teszt Kft.`-re):
1. **Adatszivárgás a statisztikákban:** A toborzási számok (nyitott pozíciók), az onboarding folyamatok és a távolléti kérelmek nem vették figyelembe az aktív cég azonosítóját (`companyScope`), így a másik cég aktív jelöltjei és adatai jelentek meg a KPI kártyákon és a figyelmeztetésekben.
2. **Globális dolgozói létszám:** Az aktív dolgozók KPI kártya a teljes adatbázis dolgozói állományát mutatta a kiválasztott cég tényleges tagjai (`company_members`) helyett.
3. **Függő kérelmek átszignálása:** A `reassignPendingLeaves` szerver akció globálisan dolgozta fel az összes függő szabadságkérelmet az adott cégre való korlátozás nélkül.

## 2. Architektúra Döntés

### 2.1 Szerveroldali Cégkontextus Érvényesítés (`companyScope`)
Az áttekintő oldal a `getActiveCompanyIdServer()` és `getActiveCompanyServer()` segítségével feloldja a sütiben tárolt aktív céget:
```typescript
const activeCompanyId = await getActiveCompanyIdServer()
const activeCompany = await getActiveCompanyServer()
const companyScope = activeCompanyId || "00000000-0000-0000-0000-000000000000"
```

### 2.2 Dolgozói Állomány Kétszintű Szűrése
Mivel a dolgozói adatlap (`hr_dolgozo_adatlap`) a felhasználói profilhoz kapcsolódik, és a céges tagságot a `company_members` kapcsolótábla tartalmazza:
1. Első lépésben lekérjük az aktív céghez tartozó felhasználói azonosítókat:
   ```typescript
   const { data: companyMembers } = await supabase
     .from("company_members")
     .select("user_id")
     .eq("company_id", companyScope)
   const memberUserIds = (companyMembers || []).map(m => m.user_id)
   const safeMemberIds = memberUserIds.length > 0 ? memberUserIds : ["00000000-0000-0000-0000-000000000000"]
   ```
2. Az aktív dolgozók létszámát szigorúan ezen azonosítók alapján, a jogviszony állapotát (aktív munkaviszony, nincs kilépve) ellenőrizve számoljuk ki (`activeEmployeesCount`).
3. Az orvosi vizsgálatok, próbaidők és határozott idejű szerződések lejárati figyelmeztetéseit is az `.in("id", safeMemberIds)` halmazra szűkítjük.

### 2.3 Közvetlen Cégazonosító Szűrés a HR Modulokban
Minden közvetlen tábla (`hr_toborzas`, `hr_onboarding`, `hr_tavollet`) rendelkezik `company_id` oszloppal:
- **Toborzás:** `.eq("company_id", companyScope)`
- **Onboarding:** `.eq("company_id", companyScope)`
- **Távollét & mai hiányzók:** `.eq("company_id", companyScope)`

### 2.4 Céghez Kötött Szerver Akciók
A `reassignPendingLeaves` szerver akció a `getActiveCompanyIdServer()` kontextust beolvasva kizárólag az aktív céghez tartozó kérelmeket szignálja át (`.eq("company_id", activeCompanyId)`), megvédve más cégek folyamatait az akaratlan módosulástól.

### 2.5 Vizuális Cégjelvény
A fejlécben a kanonikus stílushoz illeszkedve diszkrét, de egyértelmű `Badge` jelzi az éppen aktív céget (`Building2` ikon kíséretében).

## 3. Következmények és Eredmények
- **Tökéletes Adatszeparáció:** A `Teszt Kft.` és a `Think AI Kft.` felületein kizárólag a hozzájuk tartozó adatok jelennek meg (pl. Teszt Kft.-nél 2 aktív dolgozó, 0 nyitott pozíció, 0 onboarding; Think AI Kft.-nél 6 dolgozó, 3 nyitott pozíció, 1 onboarding).
- **Megfelelőség:** Megszűnt a cégek közötti adat- és feladat-átfedés, biztosítva a GDPR és multi-tenant architektúra szigorú követelményeit.
