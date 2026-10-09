# [HR] A-037: Műszaktervezési Rendszer és Beosztás Architektúra

## Státusz
Elfogadva

## Kontextus és Problémafelvetés
A vállalatok több műszakos munkarendjének kezeléséhez (pl. gyárak, ügyfélszolgálat, logisztika) az eaisyHR rendszerben szükségessé vált egy előzetes műszaktervező modul (`HR-TASK-01`).
A tervezőnek támogatnia kell az előre definiált vállalati műszaksablonokat (pl. Délelőttös `D`, Délutános `DU`, Éjszakás `É`, Normál irodai `N`), az egyéni időpont-felülbírálásokat, valamint szorosan együtt kell működnie a jóváhagyott távollétekkel (`hr_tavollet`), a heti 48 órás munkaidő-korláttal (`HR-TASK-02`) és az orvosi alkalmasság lejárati ellenőrzésével (`HR-TASK-05`).

## Döntések

### 1. Adatbázis Modellezés és Multi-Tenant Izoláció
Két dedikált tábla jött létre szigorú multi-tenant elszigeteléssel (`company_id` és RESTRICTIVE RLS):
- `public.hr_muszak_sablon`:
  - Cég-specifikus sablonok (`kod`, `megnevezes`, `kezdes_ido`, `befejezes_ido`, `munkaora`, `szunet_perc`, `szin_kod`, `is_active`).
  - Egyedi kényszer: `UNIQUE(company_id, kod)`.
  - Alapértelmezetten migrációkor létrehozva minden céghez: `D` (06:00-14:00), `DU` (14:00-22:00), `E` (22:00-06:00), `N` (08:00-16:30).
- `public.hr_muszak_beosztas`:
  - Napi dolgozói beosztás (`dolgozo_id`, `datum`, `sablon_id`, `egyedi_kezdes`, `egyedi_befejezes`, `tervezett_ora`, `megjegyzes`, `statusz`).
  - Egyedi kényszer: `UNIQUE(dolgozo_id, datum)` – egy dolgozónak egy napra egyetlen primer beosztása lehet.

### 2. Távollét és Szabadság Védelem (Cross-Module Integrity)
- A műszaktervező olvasási nézetében és az "Előző hét másolása" funkció során a rendszer lekérdezi a `hr_tavollet` tábla érvényes rekordjait.
- Ha egy dolgozó az adott cél napon jóváhagyott vagy elbírálás alatti távolléten van (szabadság, táppénz), a rendszer nem írja felül műszakkal, a nap védett marad (`filterShiftsForCopy`).

### 3. Törvényi Munkaidő és Orvosi Validáció
- Heti óraösszesítő: A heti tervezett órák valós időben összegződnek. Ha a heti óraszám meghaladja a 48 órát, vizuális figyelmeztetés és Mt. jelzés jelenik meg (`checkWeeklyHoursLimit`).
- Orvosi alkalmassági integráció: A rendszer ellenőrzi a `hr_dolgozo_adatlap.orvosi_alkalmassag_ervenyesseg` dátumot; lejárt státusz esetén figyelmeztető jelzés jelenik meg a munkatárs mellett.

### 4. UI/UX Integráció a `/hr/time` Útvonalon
- A meglévő távolléti naptár felülírása helyett 3 fülből álló tabulátoros nézet (`TimeTabsView`) készült:
  1. `Műszakbeosztás Tervező` (heti interaktív rács, 1-kattintásos sablonkezelés, napi létszám összesítő).
  2. `Távollétek & Csapatnaptár` (a meglévő `TeamCalendar` teljes funkcionalitása).
  3. `Műszaksablonok` (új sablon létrehozása, szerkesztése, színkódok beállítása).

## Következmények
- **Pozitívum:** A vezetők és HR munkatársak egy felületen láthatják a szabadságokat és tervezhetik a műszakokat, elkerülve a szabadságra történő beosztást.
- **Teljesítmény:** A heti lekérdezések dátumindexeken alapulnak (`idx_hr_muszak_beosztas_datum`), így azonnali a lapozás a hetek között.
