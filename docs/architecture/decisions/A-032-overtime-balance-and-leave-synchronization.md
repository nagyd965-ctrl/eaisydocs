# A-032: [HR] Túlóra-egyenleg Levonás és Távollét Szinkronizáció Adatbázis Architektúra

## Státusz
Elfogadva (2026-10-07)

## Kontextus
Az eaisyHR rendszerben a túlórák automatikus számlálása a napi kicsekkoláskor történik a `calculate_tulora_on_checkout` adatbázis-trigger segítségével a `hr_tulora_egyenleg` táblában.
A túlóra felhasználásához (`hr_tulora_felhasznalás`) és a csúsztatott szabadnapokhoz (`hr_tavollet`) olyan robusztus architektúrára volt szükség, amely:
1. Megakadályozza a fedezet nélküli vagy túllépő csúsztatási igényeket.
2. Garantálja az egyenleg automatikus és pontos percalapú levonását jóváhagyáskor (`perc = perc - NEW.perc`).
3. Adatbázis-szinten garantálja a kétirányú konzisztenciát: ha a vezető a túlóra panelen vagy a szabadság jóváhagyási listában hagyja jóvá a csúsztatást, mindkét rekord szinkronban maradjon és az egyenleg pontosan egyszer kerüljön levonásra (rekurzió nélkül).

## Döntések

### 1. Séma Bővítések (`20261007000001_overtime_workflow_enhancements.sql`)
- **Távollét Típus Enum:** Bővítve a `hr_tavollet_tipus` PostgreSQL enum a `'csusztatas'` értékkel.
- **Túlóra Felhasználás Mezők:**
  - `datum DATE`: a kért csúsztatási nap dátuma (ha szabadnapként kéri).
  - `tavollet_id UUID REFERENCES hr_tavollet(id) ON DELETE SET NULL`: közvetlen idegen kulcsos kapcsolat a távollét rekordhoz.
- **Nézet Kompatibilitás:** `hr_tulora_felhasznalas` nézet létrehozása a magyar ékezetes táblanévre (`"hr_tulora_felhasznalás"`), így minden szerveroldali és PostgREST lekérdezés ékezetes és ékezetmentes formában is megbízhatóan működik.

### 2. Kétirányú, Nem-Rekurzív Triggerek
A PostgreSQL motor szintjén két egymást kiegészítő trigger biztosítja a szinkronizációt:
1. `trg_tulora_felhasznalas_approval` a `"hr_tulora_felhasznalás"` táblán:
   - `statusz = 'jovahagyva'` esetén levonja a perceket a `hr_tulora_egyenleg` táblából, és a kapcsolt `hr_tavollet` státuszát is jóváhagyottra állítja (ha az még nem az).
   - `statusz = 'elutasitva'` esetén az egyenleget nem módosítja (vagy korábban jóváhagyott kérelem visszavonásakor visszapótolja), és a kapcsolt távollétet elutasítja.
2. `trg_tavollet_csusztatas_sync` a `hr_tavollet` táblán:
   - Ha a vezető a rendes távolléti listából hagyja jóvá a `'csusztatas'` típusú kérelmet, a trigger átállítja a kapcsolt túlóra felhasználási rekord státuszát, ami automatikusan kiváltja az egyenleglevonást.
   - Mindkét trigger tartalmazza a `WHERE statusz != '...'` feltételt, így a híváslánc azonnal megáll, rekurzió nem alakulhat ki.

### 3. Server Action Validációk és Számítások
- `submitLeaveRequest`: Munkanapok (hétfő–péntek) számítása az időszakra, 480 perc / nap norma, egyenlegellenőrzés. Hiány esetén felhasználóbarát hibaüzenet a hiányzó órákról.
- `submitOvertimeRequest`: Dedikált akció csúsztatás (dátummal, 4/8/egyedi órával) vagy kifizetés (kívánt óraszám) beküldésére, automatikus vezetői eszkalációval és értesítéssel.
- `handleOvertimeApproval`: Vezetői jóváhagyási akció automatikus dolgozói értesítéssel és útvonal-újraérvényesítéssel (`revalidatePath`).

### 4. Timesheet és PDF Riport Számítás
- A `calculateMonthlyTimesheet` kalkulátorban a `csusztatas` típus a fizetett távollétek közé tartozik (`plannedHours = standardDailyHours * fte; actualHours = plannedHours; balance = 0;`), így nem eredményez munkaidő-hiányt a dolgozónak.
