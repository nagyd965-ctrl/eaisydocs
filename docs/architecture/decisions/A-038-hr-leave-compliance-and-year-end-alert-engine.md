# ADR: A-038 - eaisyHR Szabadságkiadási Megfelelőség és Év Végi Riasztási Architektúra

## Státusz
**Decided** (2026-10-10)

## Hatókör
`[HR]`

## Kontextus
A Munka Törvénykönyve (Mt.) szigorú előírásokat tartalmaz a szabadság kiadására vonatkozóan:
1. **Mt. 122. § (3) bekezdés:** A szabadságot - eltérő megállapodás hiányában - úgy kell kiadni, hogy a munkavállaló naptári évenként legalább tizennégy összefüggő napra mentesüljön a munkavégzési és rendelkezésre állási kötelezettsége alól. Ebbe a 14 napos időszakba a szabadság napjai mellett a heti pihenőnapok (hétvégék), munkaszüneti napok, valamint egyenlőtlen munkaidő-beosztás esetén a beosztás szerinti pihenőnapok is beleszámítanak. Ugyanakkor a törvény kifejezetten lehetőséget ad a feleknek eltérő megállapodásra (mentesítés a 14 napos egybefüggő kiadás alól).
2. **Mt. 123. § (1) bekezdés:** A szabadságot - kivételes törvényi esetektől eltekintve - az esedékesség évében kell kiadni. Ha az év utolsó negyedévében (különösen november 1-től) a munkavállalónak jelentős számú kiadatlan szabadsága van, fennáll a veszélye annak, hogy a hátralévő munkanapok száma már nem teszi lehetővé a szabadság törvényes kiadását.

Korábban a rendszer nem rendelkezett automatizált megfelelőségi kalkulátorral, sem vállalati szintű felügyeleti felülettel az Mt. 122. § és 123. § betartásának ellenőrzésére.

## Döntés
1. **Szabadság- és Pihenőidő Kalkulációs Motor (`leave-compliance-calculator.ts`):**
   - Létrehoztunk egy determinisztikus motort, amely naptárilag végigpásztázza a tárgyév összes napját (január 1. – december 31.).
   - Minden napnál ellenőrzi:
     - Jóváhagyott fizetett szabadság-e (`hr_tavollet.tipus = 'szabadsag' AND statusz = 'jovahagyva'`).
     - Hétvége (szombat/vasárnap) vagy magyar hivatalos állami ünnepnap-e.
     - Műszakbeosztás felülbírálat: ha egy hétvégi napra a menedzsment aktív műszakot osztott be (`tervezett_ora > 0`), az megszakítja a pihenőláncot (`hasWork`), így az nem számít pihenőnapnak.
   - Kiszámítja a leghosszabb egybefüggő pihenőtartamot naptári napokban, megjelölve a blokk kezdetét és végét.
   - Vizsgálja az `eltero_megallapodas_14_nap` mezőt a munkavállaló adatlapján (`public.hr_dolgozo_adatlap`).

2. **Év Végi Maradványszabadság Kockázati Motor (`calculateYearEndLeaveRisk`):**
   - Kiszámítja a hátralévő munkanapok számát a tárgyévből az aktuális dátumtól (`asOfDate`).
   - Kiszámítja a fennmaradó szabadságnapok számát (`totalLeave - usedLeave`).
   - Riasztási szinteket határoz meg:
     - `critical` (Kritikus): A fennmaradó szabadságnapok száma szigorúan meghaladja a még hátralévő munkanapokat (`remainingDays > remainingWorkingDaysInYear`).
     - `warning` (Novemberi / Q4 riasztás): November 1-je után a fennmaradó szabadság > 0, vagy a hátralévő munkanapok több mint 50%-át szabadságként kellene kiadni.
     - `normal` (Rendben): A szabadságok arányosan kiadhatók.

3. **Adatbázis Séma Bővítés:**
   - Hozzáadva `public.hr_dolgozo_adatlap.eltero_megallapodas_14_nap BOOLEAN NOT NULL DEFAULT false`.
   - Ez auditálhatóan tárolja, hogy a dolgozóval született-e írásbeli megállapodás az Mt. 122. § (3) alóli eltérésről.

4. **Központi Megfelelőségi Hub és Server Actionök (`/hr/compliance`):**
   - A korábbi átirányító csonk helyére egy teljes értékű Compliance Hub került (`src/app/hr/compliance/page.tsx`).
   - Multi-tenant cégszintű aggregáció (`getActiveCompanyIdServer()`).
   - Server action: `getCompanyLeaveComplianceData` (összes aktív dolgozó megfelelőségi metrikája), és `toggle14DayWaiverAction` (eltérő megállapodás kapcsolása auditálással).
   - Kanonikus `KpiCard` rács (4 kártya: Megfelelőségi ráta %, 14 napos hiány, Q4 maradvány riasztás, Eltérő megállapodások).
   - Kanonikus `TableToolbar` szűrőkkel (Keresés, Szűrés popover: 14 nap hiányzik, Q4 riasztás, Eltérő megállapodás; Oszlopválasztó; CSV export).

5. **Dolgozói Adatlap Integráció (`LeaveTab.tsx`):**
   - A dolgozói profil Szabadság fülén közvetlenül megjelenik az Mt. megfelelőségi állapot, a leghosszabb pihenőtartam intervalluma, valamint HR/admin jogosultsággal az Eltérő megállapodás kapcsoló (`Switch`).

## Következmények

### Pozitív
- **Teljes jogi megfelelőség:** A vállalat azonnal látja a munkaügyi ellenőrzések szempontjából kritikus 14 napos és év végi megfelelőségi mutatókat.
- **Valósághű jogalkalmazás:** Támogatja a törvényes eltérő megállapodást, így a dolgozók akaratával megegyező rugalmas szabadságkivétel nem jelenik meg tévesen mulasztásként.
- **Megelőző év végi riasztás:** Novemberben automatikusan figyelmezteti a HR-t és vezetőket a kiadatlan szabadságok torlódására.
- **Konzisztens UI:** A kanonikus komponensrendszer (`TableToolbar`, `KpiCard`, standard HSL színek) szerves része.

### Negatív / Kockázatok
- Az eltérő megállapodáshoz papíralapú vagy elektronikus kétoldalú aláírás szükséges a valóságban, amit a HR-nek archiválnia kell (ezt a személyi dossziéba iktatható dokumentumként célszerű csatolni).
