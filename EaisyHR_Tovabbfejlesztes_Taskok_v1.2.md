# eaisyHR – Továbbfejlesztési Feladatlista és Munkaterv (v1.2)

> **Fókusz:** Kizárólag a humánerőforrás-kezelő (**eaisyHR**) modul feladatai és folyamatai.  
> **Forrásdokumentum:** `EaisyDOCS és EaisyHR továbbfejlesztés v 1.2.md` és `docs/eaisyHR_tobbcég_koncepcio_es_dontesi_pontok.md`  
> **Létrehozva:** 2026. október 9.  
> **Állapot:** Tervezet / Végrehajtásra kész  
> **Jogszabályi háttér:** Munka Törvénykönyve (2012. évi I. törvény – Mt.), Munkavédelmi törvény (Mvt.), GDPR

---

## 📊 eaisyHR Feladat Mátrix és Áttekintő

| Azonosító | Terület / Modul | Feladat megnevezése | Eredeti Hivatkozás | Prioritás | Becsült Ráfordítás | Státusz |
|---|---|---|---|---|---|---|
| **HR-TASK-01** | `Munkaidő & Jelenlét` | Előzetes Műszaktervező modul és heti/havi naptár (`/hr/time`) | HR-01 | 🔴 Magas | Nagy (4-6 óra) | ✅ Kész (A-037, P-056) |
| **HR-TASK-02** | `Megfelelőség & Szabályok` | Munkaidőkorlátok (48h) és éves túlórakeret számláló | HR-02 | 🟡 Közepes | Közepes (2-3 óra) | ✅ Kész (A-043, P-062) |
| **HR-TASK-03** | `Szabadságkezelés` | Szabadságkiadási megfelelőség (14 nap egybefüggő + novemberi riasztás) | HR-03 | 🟡 Közepes | Közepes (2-3 óra) | ✅ Kész (A-038, P-057) |
| **HR-TASK-04** | `Megfelelőség & Munkavédelem` | Munkavédelmi és tűzvédelmi oktatások központi lejárati mátrixa (`/hr/compliance`) | HR-04 | 🔴 Magas | Kisebb (1-2 óra) | ✅ Kész (A-039, P-058) |
| **HR-TASK-05** | `Biztonság & Kontroll` | Orvosi alkalmassági és beosztási blokkolás összehangolása | HR-05 | 🟢 Kisebb | Kisebb (1 óra) | ✅ Kész (A-040, P-059) |
| **HR-TASK-06** | `Kiléptetés (Offboarding)` | Kötelező hatósági kilépőigazolások és eaisyDocs személyi dosszié iktatás | HR-06 | 🟡 Közepes | Közepes (2-3 óra) | ✅ Kész (A-041, P-060) |
| **HR-TASK-07** | `Bérszámfejtés & ESS` | Ütemezett bérpapír előállítás és dolgozói digitális átvételi nyugtázás | HR-07 | 🟡 Közepes | Közepes (2-3 óra) | ✅ Kész (A-042, P-061) |
| **HR-TASK-08** | `Alaprendszer & Multi-Tenancy` | eaisyHR többcég-kezelés és szigorú GDPR/béradat izoláció | DOC-05 | 🔴 Magas | Nagy (3-4 óra) | ✅ Kész (A-044, P-063) |

---

## 📋 Részletes Feladatleírások (Specifikáció)

### HR-TASK-01: Előzetes Műszaktervező modul és heti/havi naptár
- **Eredeti hivatkozás:** HR-01
- **Üzleti cél:** A jelenlegi rendszerben csak utólagosan, megkezdett munkavégzéskor vagy check-in során lehet jelenlétet rögzíteni. A vezetőknek szüksége van előzetes műszaktervezésre, hogy lássák a következő hetek létszámellátottságát és a tervezett munkaidőt.
- **Megvalósítási terv:**
  1. **Új aloldal és útvonal:** `src/app/hr/time/shifts/page.tsx`
  2. **Műszaksablonok kezelése:**
     - Délelőttös (pl. 06:00 – 14:00, 8 óra)
     - Délutános (pl. 14:00 – 22:00, 8 óra)
     - Éjszakás (pl. 22:00 – 06:00, 8 óra)
     - Egyedi / Törzsidős munkarend (pl. 08:00 – 16:30)
  3. **Heti és havi beosztási naptár (Gantt / Grid nézet):**
     - Sorok: Dolgozók (csoportosítva szervezeti egység / osztály szerint).
     - Oszlopok: Hét napjai (Hétfő – Vasárnap).
     - Kattintással vagy drag-and-drop módon műszak hozzárendelése a dolgozóhoz.
  4. **Terv vs. Tény összevetés:** A jelenléti íven (`/hr/time`) vizuálisan láthatóvá válik, ha valaki a tervezett műszakához képest késett, túlórát teljesített vagy hiányzott.
- **Érintett fájlok:**
  - `src/app/hr/time/shifts/page.tsx`
  - `src/components/hr/shift-planner-calendar.tsx`
  - `src/app/hr/time/shift-actions.ts`
  - Adatbázis: `hr_muszak_sablon`, `hr_muszak_beosztas` táblák.
- **Elfogadási feltétel (DoD):** A részlegvezető beoszthatja a munkatársait a következő hétre, a naptár összesíti a tervezett heti órákat dolgozónként, és a munkavállaló a saját felületén (Self-Service) látja a beosztását.
- **Megvalósítás:** ✅ **Kész (2026-10-09)**. Létrehozva a `TimeTabsView` fülrendszer a `/hr/time` oldalon (`Műszakbeosztás Tervező`, `Távollétek & Csapatnaptár`, `Műszaksablonok`). Adatbázis migráció lefutva (`hr_muszak_sablon`, `hr_muszak_beosztas`), 4 alapsablon beszúrva (`D`, `DU`, `É`, `N`), heti rács, 1-kattintásos gyorsbeosztás, távollét-védelem, előző hét másolása és 48h limit indikátor implementálva. Havi jelenléti ív (`getMonthlyTimesheet`, `AttendanceTab`, `employee-timesheet`, `timesheet-pdf-generator`) összekötve: munkanapokon alapértelmezett 8h, beosztott hétvégi műszaknál `Terv: 8h` + borostyán badge és túlóra egyenleg kalkuláció. ADR: [A-037](docs/architecture/decisions/A-037-hr-shift-planning-roster-architecture.md), PRD: [P-056](docs/product/decisions/P-056-hr-shift-planning-and-roster-management-ux.md). Unit tesztek: `src/utils/__tests__/shift-planner.test.ts` (5/5 sikeres).

---

### HR-TASK-02: Munkaidőkorlátok (48h) és éves túlórakeret számláló ✅
- **Eredeti hivatkozás:** HR-02
- **Törvényi háttér:** Munka Törvénykönyve (2012. évi I. tv. – Mt.) 99. § (1)–(3) bek. (heti 48 órás maximális munkaidő rendes és rendkívüli munkaidővel együtt), Mt. 135. § (1)–(2) bek. (évi 250 óra alapkeret vs. 400 óra írásbeli megállapodással önként vállalt túlmunka).
- **Megvalósítás:** ✅ **Kész (2026-10-10)**.
  1. **Adatbázis Modell:**
     - Migráció lefutva: `public.hr_dolgozo_adatlap.onkent_vallalt_tulora_400h BOOLEAN DEFAULT false`, `onkent_vallalt_tulora_datum DATE` (`20261010000004_add_overtime_compliance_fields.sql`).
  2. **Determinisztikus Kalkulációs Motor (`src/utils/hr/overtime-engine.ts`):**
     - `determineAnnualOvertimeLimit`: 250h alapkeret vs. 400h megállapodás esetén.
     - `calculateOvertimeQuotaStatus`: Felhasznált órák, hátralévő keret, százalék, és 3 szintű állapot: normál (0–79%), sárga küszöb figyelmeztetés (80–99%), kimerült riasztás (100%+).
     - `checkWeeklyHoursCompliance`: Tervezett heti órák és tény órák vizsgálata, heti 48h limit túllépés és riasztási szintek (`compliant`, `warning_approaching` 44-48h, `exceeded` >48h).
     - `calculateDailyOvertimeFromAttendance`: Napi túlóra számítása műszakterv és tényleges check-in/out alapján.
     - `validateShiftAssignmentOvertimeRisk`: Műszaktervezőbeli kockázatelemzés beosztás mentése előtt.
  3. **Központi Megfelelőségi Hub (`/hr/compliance`):**
     - 3-fülű architektúra: `Szabadságkiadás`, `Munkavédelem & Tűzvédelem`, és `Munkaidő & Túlórakeret (Mt. 99. §, 135. §)`.
     - 4 kanonikus `KpiCard`: Heti 48h limit túllépés, Éves keret 80% felett (küszöb), Éves keret kimerült (100%+), Önként vállalt megállapodás (400h).
     - `OvertimeComplianceTable` táblázat: `TableToolbar` azonnali keresővel, oszlopválasztóval, heti/éves/megállapodás/szervezeti egység szűrő popoverrel, in-place megállapodás váltó kapcsolóval és CSV exporttal.
  4. **Dolgozói Profil & Műszaktervező Integráció:**
     - `OvertimeBalanceCard`: Túlórakeret vizuális folyamatjelző (progress bar), 250h/400h jelvény, hátralévő órák száma.
     - `ShiftPlannerWeeklyGrid` és `saveShiftAssignmentAction`: Heti 48h munkaidőkorlát ellenőrzése mentéskor és diszkrét figyelmeztető banner a beosztási ablakban.
  5. **Tesztek és Minőség:**
     - `src/utils/__tests__/overtime-engine.test.ts` (5/5 sikeres teszteset).
     - TypeScript típusellenőrzés: 0 hiba (`npx tsc --noEmit`).
     - ADR: [A-043](docs/architecture/decisions/A-043-hr-working-hours-and-annual-overtime-compliance-architecture.md), PRD: [P-062](docs/product/decisions/P-062-hr-working-hours-and-annual-overtime-compliance-ux.md).
- **Elfogadási feltétel (DoD):** ✅ **Teljesítve**. A rendszer automatikusan felügyeli a heti 48 órás törvényi korlátot és az éves 250h/400h túlórakeretet, mind a központi HR tabellán, mind a műszaktervezőben, mind az egyéni profilokon.

---

### HR-TASK-03: Szabadságkiadási megfelelőség (14 nap egybefüggő + novemberi riasztás)
- **Eredeti hivatkozás:** HR-03
- **Üzleti cél:** Az Mt. 122. § (3) bekezdése előírja, hogy a szabadságot úgy kell kiadni, hogy a munkavállaló naptári évenként legalább **14 egybefüggő napra** mentesüljön a munkavégzés alól. Emellett a szabadságokat az esedékesség évében ki kell adni, aminek elmulasztása munkaügyi jogsértés.
- **Megvalósítási terv:**
  1. **14 napos egybefüggő távollét számláló és ellenőrző:**
     - Algoritmus vizsgálja a jóváhagyott szabadságokat és a heti pihenőnapokat (hétvégéket) egyben.
     - Ha van olyan időszak az évben, ahol a szabadság + hétvégék elérik a folyamatos 14 naptári napot, a státusz: *„Teljesítve (pipa)”*.
     - Ha nincs, sárga státuszjelzés a HR megfelelőségi listán: *„14 napos kötelezettség még nem teljesült”*.
  2. **Novemberi év végi maradványszabadság-riasztás:**
     - Ütemezett ellenőrzés (november 1.): Megvizsgálja az összes aktív dolgozó még hátralévő, bent ragadt szabadságnapjait.
     - Automatikus vezetői értesítő sáv és HR összesítő lista a még kiadandó szabadságok ütemezésére az év hátralévő 2 hónapjában.
- **Érintett fájlok:**
  - `src/utils/hr-leave-compliance.ts` (Új segédmotor)
  - `src/app/hr/time/page.tsx`
  - `src/app/hr/compliance/page.tsx`
  - `src/components/hr/leave-compliance-widget.tsx`
- **Elfogadási feltétel (DoD):** A HR-es és a vezető egyetlen gombnyomással kilistázhatja azokat a munkatársakat, akiknek még nincs 14 napos egybefüggő szabadságuk betervezve, illetve novemberben automatikus figyelmeztetést kapnak a fel nem használt napokról.
- **Megvalósítás:** ✅ **Kész (2026-10-10)**.
  - Adatbázis migráció lefutva: `public.hr_dolgozo_adatlap.eltero_megallapodas_14_nap` oszlop létrehozva (`20261010000001_add_leave_compliance_fields.sql`).
  - Determinisztikus kalkulációs motor (`src/utils/hr/leave-compliance-calculator.ts`):
    - `calculate14DayConsecutiveLeave`: 365 napos naptári elemzés, szabadság + hétvégék/ünnepnapok egybefüggő pihenőlánca, hétvégi aktív műszak általi láncmegszakítás, törvényes eltérő megállapodás (`eltero_megallapodas_14_nap`) kezelése.
    - `calculateYearEndLeaveRisk`: hátralévő munkanapok és szabadságnapok aránya, Q4 és novemberi sárga figyelmeztetés, valamint piros kritikus riasztás munkanaphiány esetén.
  - Központi Megfelelőségi Hub (`src/app/hr/compliance/page.tsx`): 4 kanonikus `KpiCard`, kanonikus `TableToolbar` (azonnali keresés, oszlopválasztó, szűrő popover, CSV export), in-place Eltérő megállapodás kapcsoló.
  - Dolgozói Profil integráció (`src/app/hr/employee/[id]/tabs/LeaveTab.tsx`): Mt. Megfelelőségi panel, leghosszabb egybefüggő pihenőtartam kiírása, HR/admin Eltérő megállapodás kapcsoló (`Switch`).
  - Unit tesztek: `src/utils/__tests__/leave-compliance.test.ts` (8/8 sikeres).
  - TypeScript típusellenőrzés: 0 hiba (`npx tsc --noEmit`).
  - ADR: [A-038](docs/architecture/decisions/A-038-hr-leave-compliance-and-year-end-alert-engine.md), PRD: [P-057](docs/product/decisions/P-057-hr-leave-compliance-and-year-end-alert-ux.md).

---

### HR-TASK-04: Munkavédelmi és tűzvédelmi oktatások központi lejárati mátrixa
- **Eredeti hivatkozás:** HR-04
- **Üzleti cél:** Az oktatási jegyzőkönyvek (munkavédelem, tűzvédelem) és azok lejárati dátumai már jelen vannak a rendszerben, de csak egyenként, a dolgozók személyi kartonját megnyitva láthatók. Egyetlen központi tabellára van szükség a gyors hatósági ellenőrzésekhez.
- **Megvalósítási terv:**
  1. Új nézet a Munkaügyi Megfelelőség menüpontban: `/hr/compliance` -> **„Oktatási Nyilvántartás”** fül.
  2. **Linear Flat KPI Kártyák:**
     - *Összes nyilvántartott oktatás*
     - *Érvényes oktatások száma (zöld)*
     - *30 napon belül lejáró oktatások (sárga figyelmeztetés)*
     - *Lejárt oktatású munkatársak száma (piros riasztás)*
  3. **Szűrhető táblázat (`TableToolbar`):**
     - Oszlopok: Dolgozó neve, Munkakör, Szervezeti egység, Oktatás típusa (Munkavédelem / Tűzvédelem / Egyéb), Oktatás dátuma, Érvényesség lejárata, Státusz (Érvényes / Hamarosan lejár / Lejárt), Iktatott jegyzőkönyv linkje.
     - Szűrés: Csak lejárók, csak lejártak, szervezeti egység szerint.
     - CSV exportálás hatósági auditokhoz.
- **Érintett fájlok:**
  - `src/app/hr/compliance/page.tsx`
  - `src/components/hr/safety-training-table.tsx` (Új komponens)
  - `src/app/hr/compliance/actions.ts`
- **Elfogadási feltétel (DoD):** A HR-es 1 másodperc alatt átlátja az összes cégbeli munkavállaló oktatási érvényességét, és egy kattintással megnyithatja a kapcsolódó eaisyDocs-ba iktatott jegyzőkönyvet.
- **Megvalósítás:** ✅ **Kész (2026-10-10)**.
  - Adatbázis migráció lefutva: `public.hr_munkavedelmi_oktatas.ervenyesseg_vege DATE` oszlop és index létrehozva (`20261010000002_add_safety_training_validity.sql`).
  - Server Action javítás (`src/app/hr/actions/safety-training-actions.ts`): Új oktatás rögzítésekor automatikus 1 éves lejárati kalkuláció és mentés az `ervenyesseg_vege` mezőbe.
  - Determinisztikus kalkulációs motor (`src/utils/hr/safety-compliance-calculator.ts`):
    - `calculateSafetyTrainingStatus`: Lejárati dátum és 30 napos ablak vizsgálat (`ervenyes`, `hamarosan_lejar`, `lejart`, `hianyzo`), hátralévő napok számlálása, rendezési prioritás (kockázatos elöl).
    - `calculateCompanySafetyOverview`: Cégszintű összesítés és érvényességi ráta (`validityRate`) számítás.
  - Központi Megfelelőségi Hub (`/hr/compliance`):
    - 2-fülű architektúra: `Szabadságkiadás (Mt. 122. §)` és `Munkavédelem & Tűzvédelem (Mvt. / Ttv.)`.
    - 4 kanonikus `KpiCard`: Megfelelőségi arány (%), Érvényes oktatások száma, 30 napon belül lejárók (sárga), Lejárt vagy hiányzó oktatású munkavállalók (piros).
    - Kanonikus `TableToolbar` és Mátrix táblázat (`SafetyTrainingTable`): azonnali keresés, oszlopválasztó, típus / szervezeti egység / státusz szűrő popover, CSV export hatósági ellenőrzésekhez.
    - Beépített dokumentum betekintő (`PdfViewerDialog`) az iktatott jegyzőkönyvekhez, és azonnali pótlási/új oktatási modál (`SafetyTrainingDialog`) előtöltött dolgozói adatokkal.
  - Unit tesztek: `src/utils/__tests__/safety-compliance.test.ts` (6/6 sikeres).
  - TypeScript típusellenőrzés: 0 hiba (`npx tsc --noEmit`).
  - ADR: [A-039](docs/architecture/decisions/A-039-hr-occupational-safety-compliance-matrix-architecture.md), PRD: [P-058](docs/product/decisions/P-058-hr-occupational-safety-compliance-matrix-ux.md).

---

### HR-TASK-05: Orvosi alkalmassági és beosztási blokkolás összehangolása
- **Eredeti hivatkozás:** HR-05
- **Törvényi háttér:** 1993. évi XCIII. tv. (Mvt.) 49. § (1) bek. – a munkavállaló csak olyan munkára és akkor alkalmazható, ha a munkavégzéshez szükséges egészségi alkalmassággal rendelkezik; 33/1998. (VI. 24.) NM rendelet.
- **Audit eredménye:** A rendszerben korábban NEM volt aktív blokkolás (a dolgozói check-in nem vizsgálta az orvosi érvényességet, a műszaktervező pedig csak puha figyelmeztetést jelenített meg, a mentést nem gátolta).
- **Megvalósítás:**
  1. **Központi orvosi érvényesség-ellenőrző modul (`medical-compliance-checker.ts`):**
     - `checkMedicalValidityForDate`: Adott céldátumra vizsgálja a legfrissebb orvosi vizsgálatot (`hr_orvosi_vizsgalat`).
     - Kezeli a hiányzó vizsgálatot (`missing`), a még be nem következett érvényességi kezdetet (`not_yet_valid`), a lejárt alkalmasságot (`expired`), valamint a nem alkalmas eredményt (`nem_alkalmas`).
  2. **Valós idejű jelenléti kemény blokkolás (`self-service/actions.ts` – `toggleCheckIn`):**
     - Becsekkoláskor és munkába visszatéréskor (ebédszünet után) szigorú ellenőrzés fut le a mai napra.
     - Lejárt vagy hiányzó orvosi esetén a rendszer megtagadja a munkakezdést (`Mvt. 49. § (1)` hibaüzenettel).
     - A kicsekkolás (műszakzárás) sosem blokkolt, így a dolgozó szabályosan be tudja fejezni a napját.
  3. **Műszakbeosztás mentés kemény blokkolás (`shift-actions.ts` – `saveShiftAssignmentAction`):**
     - Új vagy módosított műszak hozzárendelésekor a rendszer a műszak konkrét naptári napjára ellenőrzi az alkalmasságot.
     - Érvénytelen orvosi esetén a mentés azonnal elutasításra kerül (`error` válasszal). Műszak törlése továbbra is engedélyezett a beosztás tisztításához.
  4. **Előző heti beosztás másolása védelem (`copyPreviousWeekRosterAction`):**
     - Csoportos műszaktervezéskor a másolás automatikusan átugorja azokat a napokat, ahol a célhét adott napján a dolgozó orvosija már lejárt, és számlálja a kihagyott műszakokat (`skippedMedicalCount`).
  5. **Műszaktervező vizuális védelem (`ShiftPlannerWeeklyGrid`):**
     - Piros diszkrét jelölés a rács cellájában (`Stethoscope` ikon + `bg-destructive/[0.02]`).
     - A cella kattintásakor felugró Popoverben határozott figyelmeztető banner jelenik meg a lejárati dátummal, közvetlen kattintható profil linkkel az új vizsgálat rögzítéséhez, és a műszaksablon gombok inaktiválásra kerülnek (`disabled`).
- **Tesztek és Minőség:**
  - `src/utils/__tests__/medical-compliance.test.ts` (5/5 sikeres unit teszt: érvényes, lejárt, hiányzó, még nem hatályos, nem alkalmas minősítés).
  - TypeScript típusellenőrzés: 0 hiba (`npx tsc --noEmit`).
- **Dokumentáció:** [ADR A-040](docs/architecture/decisions/A-040-hr-medical-compliance-and-roster-blocking-architecture.md), [PRD P-059](docs/product/decisions/P-059-hr-medical-compliance-and-roster-blocking-ux.md).
- **Elfogadási feltétel (DoD):** ✅ Teljesítve. Lejárt vagy hiányzó orvosi vizsgálat esetén sem előre műszakra beosztani, sem a helyszínen becsekkolni nem lehetséges.

---

### HR-TASK-06: Offboarding kötelező hatósági kilépőigazolások és eaisyDocs iktatás ✅
- **Eredeti hivatkozás:** HR-06
- **Törvényi háttér:** 2012. évi I. törvény (Mt.) 80. § (2) bek., 1991. évi IV. tv. (Flt.) 36/A. §, 1997. évi LXXX. tv. (Tbj.), 1995. évi LXVI. tv. (Lvt. 50 év megőrzési idő).
- **Megvalósítás:** ✅ **Kész (2026-10-10)**.
  1. **Törvényes kilépő igazoláscsomag (PDF generátor):**
     - `src/utils/hr/exit-certificate-pdf-generator.ts`: Hiteles A4 dokumentumcsomag, amely egyesíti a munkáltatói igazolást (Mt. 80. §), az álláskeresési járadék igazolólapot (Flt. 36/A. §), a munkabérből történő levonások és bírósági letiltások nyilatkozatát, a tárgyévi betegszabadság és végkielégítés elszámolását, a kiadott iratok tételes jegyzőkönyvét (NAV adóadatlap, TB kiskönyv átadás), valamint a kétoldalú aláírási záradékot (személyes átvétel vs tértivevényes postai ragszám).
  2. **Tárgyévi betegszabadság automatikus összesítése:**
     - `getOffboardingDetailData` és `generateExitCertificateAction` automatikusan összesíti a dolgozó tárgyévi jóváhagyott betegszabadságos munkanapjait a `hr_tavollet` táblából (Mt. 126. §), és előtölti az űrlapon.
  3. **Azonnali egyedi beiktatási lehetőség:**
     - Az `ExitCertificatePanel`-ben megjelenő *„Beiktatás a személyi dossziéba most”* gombbal a HR-es még a folyamat teljes lezárása előtt (pl. személyes átvételkor) azonnal beiktathatja az okiratot a munkavállaló digitális személyi dossziéjába (`fileSingleOffboardingDocument`).
  4. **Lezáráskori automatikus védőháló (Fail-Safe Filing):**
     - A `closeOffboarding` akcióban beépített védelmi kapu: ha a HR-es korábban nem nyitotta meg a panelt, a rendszer lezáráskor automatikusan legenerálja az igazolást a dolgozói karton és a jóváhagyott távollétek alapján, és beiktatja a személyi dossziéba.
     - A dokumentum megkapja a gap-mentes alszámot (`HR-YYYY/XXXXX/1.Y`), a PDF/A-2b archiválási példányt és az SHA-256 lenyomatot, a személyi dosszié pedig archivált (`irattarban`) státuszba kerül.
- **Tesztek és Minőség:**
  - `src/utils/__tests__/exit-certificate-pdf.test.ts` (6/6 sikeres teszteset).
  - `src/utils/__tests__/offboarding-compliance.test.ts` (5/5 sikeres teszteset: 5 hatósági irat jelenléte, betegszabadság aggregáció, fail-safe lista, adatlap fallback).
  - TypeScript típusellenőrzés: 0 hiba (`npx tsc --noEmit`).
- **Dokumentáció:** [ADR A-041](docs/architecture/decisions/A-041-hr-offboarding-statutory-exit-certificates-and-filing-safety-net.md), [PRD P-060](docs/product/decisions/P-060-hr-offboarding-statutory-exit-certificates-and-filing-ux.md).
- **Elfogadási feltétel (DoD):** ✅ Teljesítve. Az offboarding lezárásakor (vagy előzetesen egyedileg) az összes kötelező hatósági kilépő igazolás előáll, letölthető, és a dolgozó személyi dossziéjában és profilján hivatalosan iktatva megtalálható.

---

### HR-TASK-07: Ütemezett bérpapír előállítás és dolgozói digitális átvételi nyugtázás ✅
- **Eredeti hivatkozás:** HR-07
- **Törvényi háttér:** Munka Törvénykönyve (2012. évi I. tv. – Mt.) 155. § (1)–(3) bek. (havi írásbeli elszámolás átadása tárgyhót követő 10-ig), Mt. 22. § (2) bek., 1997. évi LXXX. tv. (Tbj.), 1995. évi LXVI. tv. (Lvt. 50 év megőrzési idő).
- **Megvalósítás:** ✅ **Kész (2026-10-10)**.
  1. **Adatbázis Modell (`public.hr_berpapir`):**
     - Migráció lefutva: `20261010000003_add_hr_berpapir.sql`.
     - 43 oszlopos tábla szigorú RLS védelemmel: `dolgozo_id`, `company_id`, `ev`, `honap`, `UNIQUE (dolgozo_id, ev, honap)`.
     - Bérelemek (alapbér, ledolgozott napok/órák, szabadság, betegszabadság 70%, túlóra, bónusz, cafeteria).
     - Opcionális adókedvezmények: 25 év alattiak SZJA mentessége (576.601 Ft keretig), családi kedvezmény, személyi kedvezmény.
     - Törvényes levonások: SZJA 15%, TB járulék 18,5%, bírósági letiltások.
     - Nettó kifizetés, munkáltatói SZOCHO (13%), bankszámlaszám, digitális átvételi időbélyeg (`atvetel_datuma`, `atvetel_ip`).
  2. **Bérkalkulátor és PDF Generátor Motor (`src/utils/hr/`):**
     - `payslip-calculator.ts`: Determinisztikus kalkulációs motor törvényi levonásokkal, kedvezményfelosztással, és átvételi nyugtázás feldolgozóval.
     - `payslip-pdf-generator.ts`: Hivatalos, formázott A4-es magyar Bérjegyzék PDF sablon (Puppeteer / `launchPdfBrowser`), digitális átvételi záradékkal és 50 éves irattári hivatkozással.
  3. **HR Munkaasztal Kezelőfelület (`/hr/payroll`):**
     - Önálló dedikált menüpont a HR oldalsávban (`Bérszámfejtés & Bérpapírok`).
     - Havi időszakválasztó léptetővel.
     - 5 Linear Flat `KpiCard`: Összes dolgozó, Előállított bérpapír, Átvéve és nyugtázva (zöld), Átvételre vár (sárga), Havi nettó kifizetés (Ft).
     - Központi `TableToolbar`: azonnali keresés név, adójel, TAJ, munkakör, részleg szerint; státusz és szervezeti egység szűrők.
     - Egy kattintásos kötegelt előállítás: *„Havi Bérpapírok Előállítása & Közzététele (Mt. 155. §)”*.
     - Soronkénti in-place PDF megtekintés (`PdfViewerDialog`), letöltés és egyedi korrekciós modál (bónusz, 25 év alatti, családi kedvezmény, letiltás).
  4. **Dolgozói Önkiszolgáló Portál (`/hr/self-service/payroll`):**
     - Új menüpont az Önkiszolgáló pultban: **`Bérpapírjaim`**.
     - Havi lista időrendben, kiemelt nettó kifizetési doboz bankszámlaszámmal, tételes jövedelem- és levonásbontás.
     - **„Átvételt igazolom (Mt. 155. §)”** cselekvésre ösztönző gomb: megerősítő modállal rögzíti az átvétel időbélyegét és IP címét, naplózza az `esemeny_naplo`-ba, és zöld hitelesített bélyegzőt kap.
  5. **Tesztek és Minőség:**
     - `src/utils/__tests__/payslip-calculator.test.ts` (7/7 sikeres teszteset).
     - `src/utils/__tests__/payslip-pdf.test.ts` (4/4 sikeres teszteset).
     - ADR: [A-042](docs/architecture/decisions/A-042-hr-scheduled-payroll-generation-and-digital-receipt-architecture.md), PRD: [P-061](docs/product/decisions/P-061-hr-scheduled-payroll-generation-and-digital-receipt-ux.md).
- **Elfogadási feltétel (DoD):** ✅ **Teljesítve**. A HR egyetlen gombnyomással legenerálhatja a havi bérpapírokat a meglévő jelenlétek és béradatok alapján, a dolgozó az önkiszolgáló portálján megnézheti és digitálisan igazolhatja az átvételt (Mt. 155. §), a munkáltató pedig rendelkezik a törvényes átvételi bizonyítékkal.

---

### HR-TASK-08: eaisyHR többcég-kezelés és szigorú GDPR/béradat izoláció
- **Eredeti hivatkozás:** DOC-05 & HR Koncepció (`docs/eaisyHR_tobbcég_koncepcio_es_dontesi_pontok.md`)
- **Üzleti cél:** A többcéges működés (Multi-Tenancy) kiterjesztése a HR modulra, garantálva, hogy egyetlen cég dolgozójának személyes és béradatai se szivároghassanak át másik céghez, feloldva a kettős szerepkör (Dual-Role) és a holding vs. in-house HR dilemmát.
- **Megvalósítás:** ✅ **Kész (2026-10-10)**.
  1. **Szerepkör-feloldó motor és biztonsági kapuk (`src/utils/hr/`):**
     - `company-role-resolver.ts`: Tiszta függvények (`resolveUserCompanyRoles`, `validateEmployeeCompanyAccess`, `isUserAuthorizedForHrView`). Elsőbbséget ad a `company_members.hr_szerepkor` és `docs_szerepkor` tagsági szerepkörnek a globális profil felett; automatikus adminisztrátori jogok `owner`/`admin` tagság esetén; nem-tagoknál szigorú `none` elutasítás.
     - `company-server.ts`: `getActiveCompanyMemberRolesServer` segédfüggvény szerveroldali szerepkör-feloldáshoz.
     - `hr-auth-guard.ts`: `requireHrAuthServer` védelmi kapu átirányítással és jogosultság-ellenőrzéssel.
  2. **Globális shell és navigáció dinamikus scoping (`src/app/layout.tsx`):**
     - A shell a kiválasztott céghez tartozó szerepkört adja át a `HrSidebar` és `AppSidebar` komponenseknek. Cégváltáskor a menüpontok dinamikusan igazodnak az adott cégnél meglévő jogosultsághoz (pl. Alpha Kft. -> HR vezető menük; Beta Zrt. -> kizárólag Self-Service menük).
  3. **Bérszámfejtési és Bérpapír Izoláció (`/hr/payroll` & `actions.ts`):**
     - A dolgozók listázása szigorúan az aktív cég tagjaira van szűrve.
     - Az új bérpapírok generálása céghez kötötten történik (`company_id: activeCompanyId`).
     - A bérpapír PDF-en a munkáltatói fejléc dinamikusan a `companies` táblából olvassa fel a cég nevét, címét és adószámát.
  4. **Toborzási, Vezetői, Riport, Beállítások és Onboarding/Offboarding Izoláció:**
     - `/hr/recruitment`: Cégre szűrt álláshirdetések és pályázók, `verifyRecruitmentAccess` szerveroldali védelem.
     - `/hr/manager`: Cégre szűrt beosztottak, távollétek és túlóra-jóváhagyások.
     - `/hr/reports`: `loadHrMasterData` cégre szűrt törzsadatokkal (NAV T1041, KSH, Bérriport).
     - `/hr/onboarding`, `/hr/offboarding`: Cégre szűrt folyamatok és interjúk.
     - `/hr/settings`: Cégre szűrt szervezeti egység, munkakör és munkatárs kezelés.
     - Minden HR oldalon gyökér szintű `key={companyScope}` / `key={activeCompanyId}` gondoskodik a komponensek tiszta unmount/remount folyamatáról.
  5. **Tesztek és Minőség:**
     - Új egységtesztek: `src/utils/__tests__/company-role-resolver.test.ts` (7/7 sikeres teszteset).
     - Teljes tesztcsomag: 116/116 sikeres teszt (16 tesztcsomag, 0 hiba).
     - TypeScript típusellenőrzés: 0 hiba (`npx tsc --noEmit`).
     - ADR: [A-044](docs/architecture/decisions/A-044-hr-multi-tenancy-and-strict-gdpr-isolation.md), PRD: [P-063](docs/product/decisions/P-063-hr-multi-tenancy-and-strict-gdpr-isolation-ux.md).
- **Elfogadási feltétel (DoD):** ✅ **Teljesítve**. A felső cégválasztóban váltva a HR felület azonnal az adott cég adataira és az adott cégnél érvényes jogosultsági szintre vált át, kizárva bármiféle kereszt-céges adatszivárgást.

---

## 🚀 Javasolt Végrehajtási Terv a Mai Sessionben

Mivel ma **kizárólag az eaisyHR-re** fókuszálunk, az alábbi sorrendet javaslom:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. LÉPÉS: HR-TASK-04 (Oktatási Lejárati Mátrix)                       │
│    -> Azonnal látható, meglévő adatokra épülő UI a /hr/compliance alatt│
├────────────────────────────────────────────────────────────────────────┤
│ 2. LÉPÉS: HR-TASK-08 (eaisyHR Többcég-kezelés és Izoláció)             │
│    -> Az alapvető adatvédelmi és cégválasztási stabilitás biztosítása  │
├────────────────────────────────────────────────────────────────────────┤
│ 3. LÉPÉS: HR-TASK-03 (Szabadság 14 napos megfelelőség + November)     │
│    -> Intelligens szabálymotor és vezetői figyelmeztető sáv            │
├────────────────────────────────────────────────────────────────────────┤
│ 4. LÉPÉS: HR-TASK-01 + HR-TASK-02 (Műszaktervező és Korlátok)          │
│    -> A heti beosztástervező naptár és a 48h / túlóra ellenőrzések    │
└────────────────────────────────────────────────────────────────────────┘
```

---

*Dokumentum rögzítve az eaisyHR modul fejlesztéséhez a 2026-10-09-i megbeszélés alapján.*
