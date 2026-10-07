# [HR] A-031: HR Riportok Adataggregációja, Formátum-Normalizálása és Multi-Engine Export Architektúrája

**Státusz:** Decided  
**Dátum:** 2026-10-07  
**Hatókör:** `[HR]` (eaisyHR)  
**Kapcsolódó PRD:** [P-050](../../product/decisions/P-050-hr-reports-t1041-ksh-payroll-overhaul.md)  
**Kapcsolódó Kód:** `src/app/hr/reports/actions.ts`, `src/utils/hr/reports-export.ts`, `src/components/hr/reports-tabs.tsx`, `src/app/hr/reports/page.tsx`

---

## 1. Kontextus és Problémafelvetés

Az eaisyHR korábbi riport modulja (`/hr/reports`) kezdetleges állapotban volt:
1. **Hibás és használhatatlan CSV kimenet:** A korábbi export funkciók primitív szöveges CSV összefűzést használtak UTF-8 BOM (`\uFEFF`) és pontosvessző elválasztó nélkül. Ennek következtében a magyar Excel a teljes sort az első oszlopba tömörítette, az ékezetes karakterek pedig sérültek (pl. `BelĂ©pĂ©s`). Ezen felül csupán 3 semmitmondó oszlopot tartalmazott (`Nev, Tipus, Datum`).
2. **Adatbázis szigetek izolációja:** Bár az Onboarding és Offboarding modulokban már elkészült a hivatalos NAV T1041 generálás (`hr_t1041_bejelentes`) és a hivatalos NAV nyugták iktatási összekötése (`t1041-panel.tsx`), a riport felület teljesen független volt ettől, és nem gyűjtötte ki a havi hatósági tételeket.
3. **Hiányzó KSH és Bérszámfejtési aggregáció:** A KSH munkaügyi jelentésekhez és a külső bérprogramokhoz (Nexon, Kulcs-Bér, BaBér) szükséges jelenléti (`hr_jelenlet`), távolléti (`hr_tavollet`), havi zárási (`hr_havi_jelenlet_zaras`) és cafeteria (`hr_cafeteria_valasztas`) adatok nem voltak havi szinten összekapcsolva és validálva.

---

## 2. Végleges Építészeti Döntés

Elfogadásra került a komplex **HR Riportok Adataggregációs és Multi-Engine Export Architektúrája**:

### 2.1. Multi-Engine Export Pipeline (`src/utils/hr/reports-export.ts`)
- **Natív SheetJS `.xlsx` munkafüzetek:**
  - Minden táblázathoz automatikus oszlopszélesség (`!cols`), formázott fejléc és típuskonverzió (numerikus munkaórák, munkanapok, pénzösszegek tabular-nums formátumban) készül.
  - A KSH riport két munkalapot (`KSH_Fomutatok` és `Reszleg_Bontas`) tartalmaz egyetlen letisztult fájlban.
  - A bérszámfejtési export 19 hivatalos bérszámfejtési oszlopot fed le (tervezett/tény munkanapok, túlóra, táppénz, cafeteria, jelenlét jóváhagyási státusz).
- **Magyar Excel Kompatibilis CSV Engine (`\uFEFF` + `;`):**
  - UTF-8 BOM prefixálás (`\uFEFF`) és pontosvessző határoló (`delimiter: ";"`) biztosítja, hogy a magyar locale beállítású Microsoft Excel azonnal különálló oszlopokban és hibátlan ékezetekkel nyissa meg az állományt.
- **ÁNYK / ONYA Vágólap Szinkronizáció:**
  - Tabulátorral tagolt (`\t`) közvetlen vágólapra másolási formátum a hatósági ÁNYK / ONYA űrlapokba történő azonnali beilleszthetőséghez.

### 2.2. Központi Server Action Adatgyűjtés és Integritás (`src/app/hr/reports/actions.ts`)
- **T1041 Intelligens Gap-Detektálás:**
  - A szerver lekéri a meglévő `hr_t1041_bejelentes` rekordokat, és aláírt URL-t (`createSignedUrl`) generál a tárolt A4 adatlap PDF-hez és a NAV befogadási nyugtához.
  - Ezzel párhuzamosan ellenőrzi a `hr_jogviszony` táblát: amennyiben a hónapban belépő vagy kilépő dolgozóhoz még nincs rögzített T1041 bejelentés, automatikusan létrehoz egy virtuális `Bejelentésre vár` tételt, megakadályozva a hatósági mulasztást.
  - Biztosított adatok feloldása a titkosított táblából (`hr_dolgozo_titkos`) és az adatlapról (TAJ, adóazonosító, munkakör, FEOR-08, heti munkaidő).
- **KSH Létszám- és Óraaggregáció:**
  - Záró állományi létszám és átlagos statisztikai létszám (FTE) számítása a havi jogviszonyok alapján.
  - Rendes és rendkívüli munkaórák összegzése a `hr_jelenlet` és `hr_tulora_felhasznalas` adatokból.
  - Távollétek nap- és órabontása (fizetett szabadság, betegszabadság, táppénz) a `hr_tavollet` jóváhagyott rekordjaiból.
  - Szervezeti egységenkénti (részlegenkénti) keresztmetszeti aggregáció.
- **Bérszámfejtési Csomag és Jelenlét Zárás:**
  - Munkavállalói szintű összefésülés: naptári tervezett munkanapok, valós jelenlétek, igazolt távollétek, elszámolt túlóra, havi cafeteria keret és a `hr_havi_jelenlet_zaras` vezetői jóváhagyási állapota.
- **In-place Hatósági Nyugta Feltöltés és Iratkezelési Iktatás:**
  - A `uploadT1041ReceiptFromReport` szerver action segítségével a HR adminisztrátor közvetlenül a riport táblázatból csatolhatja a NAV befogadási nyugtát.
  - A nyugta automatikusan bekerül a Supabase tárolóba, beiktatásra kerül az iratkezelő rendszerbe (`executeHrDocumentFiling`), és a bejelentés állapota azonnal zöld `Igazolva` státuszra vált.

### 2.3. Egyéni Dolgozói Riportálás és NAV T1041 On-Demand Generálás
- **Egyéni Bérszámfejtési Export (`exportSingleEmployeePayrollToXlsx`):**
  - Lehetővé teszi egyetlen kiválasztott munkavállaló havi kimutatásának generálását két munkalapos Excel formátumban (részletes személyi adatlap + bérprogram kompatibilis sor).
  - A táblázat soraiból egyetlen kattintással elérhető a közvetlen export, valamint az ugrás a dolgozó jelenléti ívéhez és személyi dossziéjához.
- **Egyéni NAV T1041 Generátor Modál:**
  - A vállalat teljes állományából kiválasztható bármely dolgozó, tetszőleges bejelentési típussal (`U` - Új, `V` - Változás, `T` - Törlés).
  - Azonnali ÁNYK vágólapos másolás és hivatalos A4-es PDF generálás (`generateT1041PdfAction`), amely automatikusan beiktatásra kerül a személyi irattárba.

### 2.4. Elavult Compliance Modul Kivezetése
- A korábbi különálló, elavult `/hr/compliance` menüpont kivezetésre került a navigációs oldalsávból.
- A végpont tiszta Next.js szerver átirányítással a `/hr/reports` modulra mutat.

### 2.5. Globális UI Konzisztencia és Beépített Időszakválasztó (`TableToolbar.periodPicker`)
- **Felső Statisztikai Sáv:** A korábbi különálló, nagyméretű felső időszakválasztó kártya megszüntetésre került. A Kanonikus Linear Flat KPI Grid kártyák közvetlenül a `Riportok` cím és alcím alá kerültek (P-043 / A-029 szabvány).
- **Központi `TableToolbar` Bővítés:** A központi [TableToolbar](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/table-toolbar/table-toolbar.tsx) kapott egy opcionális `periodPicker` propot, amellyel a havi naptárválasztó és az adatfrissítő gomb közvetlenül a zöld `Szűrés` gomb mellé épül be, megőrizve a maximális hasznos képernyőterületet.
- A korábbi manuális, kezdetleges segédfájlok (`nav-t1041-generator.tsx`, `ksh-report-generator.tsx`) törlésre kerültek, mivel funkcióikat teljes mértékben átvette a modern Riportok központ.

---

## 3. Következmények és Előnyök

- **Megbízhatóság:** Megszűntek a sérült ékezetes és egyoszlopos CSV fájlok; minden export professzionális `.xlsx` vagy szabványos CSV kimenetet ad.
- **Törvényi Megfelelőség:** A T1041 és KSH adatszolgáltatások szigorúan auditáltak, a NAV nyugták pedig azonnal ellenőrizhetők és előnézhetők a beépített nézőkében.
- **Bérszámfejtési Pontosság:** A bérszámfejtő külső iroda vagy bérprogram egyetlen kattintással kapja meg a vezető által lezárt, validált havi jelenléti és juttatási csomagot.
