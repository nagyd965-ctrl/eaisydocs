# ADR [A-043] [HR] Munkaidőkorlátok (Mt. 99. § 48h heti maximum) és Éves Túlórakeret (Mt. 135. §) Architektúra

## Státusz
Elfogadva

## Kontextus és Problémafelvetés
A magyar Munka Törvénykönyve (Mt.) szigorú büntetést helyez kilátásba a törvényes munkaidő-maximumok és a rendkívüli munkaidő (túlóra) keretek túllépése esetén:
1. **Mt. 99. § (2) bek.:** A munkavállaló heti munkaideje a rendes és rendkívüli munkaidővel együtt sem haladhatja meg a heti **48 órát**.
2. **Mt. 135. § (1)-(2) bek.:** A munkáltató naptári évenként alapesetben legfeljebb **250 óra** rendkívüli munkaidőt rendelhet el. Kétoldalú írásbeli megállapodás („önként vállalt túlmunka”) esetén a keret legfeljebb **400 óra** lehet.

Korábban a rendszerben nem létezett központi motor ezen korlátok automatikus és megbízható ellenőrzésére. Sem a műszaktervező, sem a jelenléti ívek, sem a vezetői felületek nem figyelmeztettek, ha egy munkatárs heti munkaideje átlépte a 48 órát, vagy ha az éves túlórakerete elérte a 80%-os küszöböt vagy a 100%-os törvényi plafont.

## Döntési Megfontolások
- **Determinisztikus, tiszta számítási motor:** Az Mt. 99. § és 135. § számításait egy független, 100%-ban lefedett motorban kell megvalósítani (`src/utils/hr/overtime-engine.ts`), nem ad-hoc UI komponensekben.
- **Tervezett vs. Tény dimenziók szétválasztása:** A heti 48 órás limitet a tervezett műszakoknál (műszaktervező) és a tény jelenléteknél (becsekkolások) is folyamatosan monitorozni kell.
- **Központi Compliance Hub integráció:** A `/hr/compliance` oldalon egy dedikált, 3. fülként kell biztosítani a cégszintű felügyeletet, egységes `TableToolbar` szűréssel és kanonikus `KpiCard`-okkal.

## Technikai Architektúra és Döntések

### 1. Adatbázis sémabővítés (`20261010000004_add_overtime_compliance_fields.sql`)
A `public.hr_dolgozo_adatlap` tábla kiegészült az alábbi mezőkkel:
- `onkent_vallalt_tulora_400h BOOLEAN DEFAULT false`: Az Mt. 135. § szerinti írásbeli megállapodás meglétét jelző flag.
- `onkent_vallalt_tulora_datum DATE`: A megállapodás keltének dátuma.

### 2. Tiszta Számítási Motor (`src/utils/hr/overtime-engine.ts`)
- `determineAnnualOvertimeLimit(hasVoluntaryAgreement)`: 250 vagy 400 óra megállapítása.
- `calculateOvertimeQuotaStatus(workedHours, annualLimit)`:
  - 0% – 79%: `normal` (zöld)
  - 80% – 99%: `warning` (sárga küszöb)
  - 100%+: `exceeded` (piros törvényi riasztás)
- `checkWeeklyHoursCompliance(weeklyHours)`:
  - `<= 40h`: `normal`
  - `40.1h – 47.9h`: `overtime`
  - `48h`: `limit`
  - `> 48h`: `illegal` (Mt. 99. § jogszabálysértés)
- `calculateDailyOvertimeFromAttendance(input)`: Jelenlét és elvárt napi óraszám alapján napi túlóra kalkuláció.
- `validateShiftAssignmentOvertimeRisk(params)`: Műszakbeosztás előtti kockázatelemzés.

### 3. Server Actions (`src/app/hr/compliance/compliance-actions.ts`)
- `getCompanyOvertimeComplianceData(targetYear)`: Cég összes munkavállalójára összesíti a heti tervezett/tény munkaidőt és az éves túlóra órákat.
- `toggleVoluntaryOvertimeAgreementAction(employeeId, hasAgreement)`: Munkavállalói 400h megállapodás azonnali rögzítése és cache invalidáció.

### 4. Műszaktervező Műveleti Validáció (`shift-actions.ts` & `shift-planner-weekly-grid.tsx`)
- A `saveShiftAssignmentAction` műszak mentése előtt kiszámítja az új heti összóraszámot, és >48h esetén figyelmeztető visszajelzést ad.
- A műszaktervező popoverben automatikus figyelmeztető banner jelenik meg azoknál a dolgozóknál, akiknél a heti munkaidő már elérte vagy meghaladta a 48 órát.

## Következmények
- **Előnyök:**
  - Teljes törvényi megfelelőség (Mt. 99. § és 135. §).
  - Munkaügyi bírságok megelőzése mind a tervezési, mind az elszámolási fázisban.
  - Szigorúan TDD alapon fejlesztve, 100%-os tesztlefedettséggel.
- **Kockázatok és mitigáció:**
  - Jelenléti adatok hiánya vagy késedelmes rögzítése esetén az elvárt munkaidő (8h * FTE) és a beosztott műszakok szolgálnak referenciaként.
