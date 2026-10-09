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
| **HR-TASK-02** | `Megfelelőség & Szabályok` | Munkaidőkorlátok (48h) és éves túlórakeret számláló | HR-02 | 🟡 Közepes | Közepes (2-3 óra) | ⏳ Tervezett |
| **HR-TASK-03** | `Szabadságkezelés` | Szabadságkiadási megfelelőség (14 nap egybefüggő + novemberi riasztás) | HR-03 | 🟡 Közepes | Közepes (2-3 óra) | ⏳ Tervezett |
| **HR-TASK-04** | `Megfelelőség & Munkavédelem` | Munkavédelmi és tűzvédelmi oktatások központi lejárati mátrixa (`/hr/compliance`) | HR-04 | 🔴 Magas | Kisebb (1-2 óra) | ⏳ Tervezett |
| **HR-TASK-05** | `Biztonság & Kontroll` | Orvosi alkalmassági és beosztási blokkolás összehangolása | HR-05 | 🟢 Kisebb | Kisebb (1 óra) | ⏳ Tervezett |
| **HR-TASK-06** | `Kiléptetés (Offboarding)` | Kötelező hatósági kilépőigazolások és eaisyDocs személyi dosszié iktatás | HR-06 | 🟡 Közepes | Közepes (2-3 óra) | ⏳ Tervezett |
| **HR-TASK-07** | `Bérszámfejtés & ESS` | Ütemezett bérpapír előállítás és dolgozói digitális átvételi nyugtázás | HR-07 | 🟡 Közepes | Közepes (2-3 óra) | ⏳ Tervezett |
| **HR-TASK-08** | `Alaprendszer & Multi-Tenancy` | eaisyHR többcég-kezelés és szigorú GDPR/béradat izoláció | DOC-05 | 🔴 Magas | Nagy (3-4 óra) | ⏳ Tervezett |

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

### HR-TASK-02: Munkaidőkorlátok (48h) és éves túlórakeret számláló
- **Eredeti hivatkozás:** HR-02
- **Üzleti cél:** Munkaügyi bírságok megelőzése a törvényi munkaidő-maximumok (Mt. 99. §) és rendkívüli munkaidő (túlóra) keretek automatikus felügyeletével.
- **Megvalósítási terv:**
  1. **Heti 48 órás maximális munkaidő figyelése:**
     - A tervezett műszakok és a tényleges jelenlétek összegzése heti ciklusokban (hétfőtől vasárnapig).
     - Ha egy dolgozó heti munkaideje meghaladja a 48 órát (rendes + rendkívüli munkaidő együtt), a rendszer figyelmeztetést (badge / banner) jelenít meg a vezetőnek.
  2. **Éves rendkívüli munkaidő (túlóra) számláló:**
     - Alapeset: Évi max. 250 óra rendkívüli munkaidő.
     - Írásbeli megállapodás esetén: Évi max. 400 óra ("önként vállalt túlmunka").
     - Vizuális folyamatjelző (progress bar) a dolgozó adatlapján és a jóváhagyási panelen:
       - 0 – 199 óra: Normál (zöld)
       - 200 – 249 óra: Sárga figyelmeztetés (80% elérése)
       - 250+ óra: Piros riasztás és blokkolási opció.
- **Érintett fájlok:**
  - `src/utils/hr-overtime-engine.ts`
  - `src/components/hr/overtime-balance-card.tsx`
  - `src/app/hr/time/page.tsx`
  - `src/app/hr/manager/page.tsx`
- **Elfogadási feltétel (DoD):** Sem a műszaktervezőben, sem a túlóra-jóváhagyáskor nem léphető át észrevétlenül az éves keret; a vezető azonnal látja a dolgozó éves felhasznált túlóráit.

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

---

### HR-TASK-05: Orvosi alkalmassági és beosztási blokkolás összehangolása
- **Eredeti hivatkozás:** HR-05
- **Üzleti cél:** A rendszerben jelenleg működik, hogy lejárt orvosi alkalmasság esetén a munkavállaló nem nyithat műszakot és nem csekkolhat be. Ezt a védelmi kaput ki kell terjeszteni az előzetes műszaktervezésre is.
- **Megvalósítási terv:**
  1. A `HR-TASK-01` műszaktervező naptárában a dolgozó beosztásakor a rendszer ellenőrzi a dolgozó orvosi alkalmasságának lejárati dátumát (`hr_orvosi_vizsgalat`).
  2. Ha a vizsgálat a beosztani kívánt műszak napján már lejárt:
     - A dolgozó neve mellett egy piros orvosi ikon és tooltip jelenik meg: *„Orvosi alkalmassága lejárt (YYYY.MM.DD) – nem osztható be műszakra!”*.
     - A beosztás mentése letiltásra kerül, megakadályozva a jogellenes munkavégzést.
- **Érintett fájlok:**
  - `src/components/hr/shift-planner-calendar.tsx`
  - `src/app/hr/time/attendance-actions.ts`
- **Elfogadási feltétel (DoD):** Lejárt orvosi alkalmassággal rendelkező dolgozó nem osztható be előre műszakra.

---

### HR-TASK-06: Offboarding kötelező hatósági kilépőigazolások és eaisyDocs iktatás
- **Eredeti hivatkozás:** HR-06
- **Üzleti cél:** A munkaviszony megszűnésekor a munkáltatónak az Mt. 80. § alapján a munkaviszony felmondása esetén az utolsó munkanapon kötelező kiadnia a törvényes igazolásokat. Ezek előállítása és eaisyDocs-ba történő archiválása a kiléptetés szerves része kell legyen.
- **Megvalósítási terv:**
  1. **Kilépő igazoláscsomag elemei a kiléptetési adatlapon (`/hr/offboarding`):**
     - *Igazolólap az álláskeresési járadék és segély megállapításához.*
     - *Adatlap a bírósági végrehajtói letiltásokról (tartozásmentességi igazolás).*
     - *Igazolás a tárgyévi jövedelemről és levont adókról/járulékokról.*
     - *TB kiskönyv (OEP igazolvány) átadás-átvételi jegyzőkönyv.*
  2. **PDF generálás és iktatási híd:**
     - A kiléptetési profil modálból egyetlen kattintással generálható a komplett igazoláscsomag.
     - A generált dokumentumok automatikusan beiktatásra kerülnek az eaisyDocs-ba a dolgozó személyi dossziéjába (`3.1 - HR és Munkaügyi dokumentumok`).
- **Érintett fájlok:**
  - `src/app/hr/offboarding/page.tsx`
  - `src/components/hr/exit-certificate-panel.tsx`
  - `src/utils/hr-filing-bridge.ts`
  - `src/utils/hr/exit-certificate-pdf-generator.ts`
- **Elfogadási feltétel (DoD):** Az offboarding lezárásakor az összes kilépő igazolás előáll, letölthető, és a dolgozó személyi iratai között automatikusan iktatva megtalálható.

---

### HR-TASK-07: Ütemezett bérpapír előállítás és dolgozói digitális átvételi nyugtázás
- **Eredeti hivatkozás:** HR-07
- **Üzleti cél:** Az Mt. 155. § alapján a munkabér elszámolásáról írásbeli tájékoztatást (bérpapírt) kell adni a dolgozónak. A cél a bérpapírok havi ütemezett digitális kiosztása és az átvétel auditálható digitális igazolása.
- **Megvalósítási terv:**
  1. **Bérpapírok kezelése (Admin/HR oldal):**
     - Bérszámfejtési export / bérpapír PDF-ek kötegelt feltöltése havonta (pl. a tárgyhót követő 10-ig).
     - Biztonságos tárolás RLS védelemmel: a dolgozó kizárólag a saját bérpapírját láthatja.
  2. **Dolgozói önkiszolgáló felület (Self-Service):**
     - Új menüpont: `/hr/self-service/payroll` (Bérpapírjaim).
     - Hónapok szerinti lista és in-browser PDF megtekintő.
     - **„Átvételt igazolom” gomb:** A dolgozó rákattint, a rendszer rögzíti az átvétel pontos dátumát és időpontját (`hr_berpapir_nyugta`).
  3. **HR Kimutatás:** Táblázatban látható, hogy mely dolgozók vették át a bérpapírt, és kinek kell még emlékeztetőt küldeni.
- **Érintett fájlok:**
  - `src/app/hr/self-service/payroll/page.tsx` (Új útvonal)
  - `src/components/hr/payroll-table.tsx` (Új komponens)
  - `src/app/hr/reports/page.tsx`
- **Elfogadási feltétel (DoD):** A dolgozó a telefonján vagy gépén megnézheti a bérpapírját, igazolhatja az átvételt, és a munkáltató rendelkezik a törvényes átvételi bizonyítékkal.

---

### HR-TASK-08: eaisyHR többcég-kezelés és szigorú GDPR/béradat izoláció
- **Eredeti hivatkozás:** DOC-05 & HR Koncepció (`docs/eaisyHR_tobbcég_koncepcio_es_dontesi_pontok.md`)
- **Üzleti cél:** A többcéges működés (Multi-Tenancy) kiterjesztése a HR modulra, garantálva, hogy egyetlen cég dolgozójának személyes és béradatai se szivároghassanak át másik céghez.
- **Megvalósítási terv:**
  1. `hr_alkalmazott.company_id` kötelezővé tétele.
  2. Az összes HR szerveroldali lekérdezés és akció felkészítése az aktív cég szűrésére (`getActiveCompanyIdServer()`):
     - Munkatársak névsora és adminisztráció (`/hr/admin`)
     - Munkaidő és jelenléti ívek (`/hr/time`)
     - Vezetői jóváhagyási központ (`/hr/manager`)
     - Toborzás és álláshirdetések (`/hr/recruitment`)
  3. Cégváltó reaktivitás (`key={companyScope}`) biztosítása a HR oldalakon is.
- **Érintett fájlok:**
  - `src/app/hr/admin/page.tsx`
  - `src/app/hr/time/page.tsx`
  - `src/app/hr/manager/page.tsx`
  - `src/app/hr/recruitment/page.tsx`
- **Elfogadási feltétel (DoD):** A felső cégválasztóban pl. *Think AI Kft.* és *Teszt Kft.* között váltva a HR felület azonnal az adott cég dolgozóira, jelenléteire és toborzási hirdetéseire vált át.

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
