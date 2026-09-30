# [HR] BRD-006: Jelenlét- és Túlóra-elszámolási Üzleti Logika

## 1. Üzleti Célkitűzés
A munkavégzés pontos követése, a ledolgozott munkaórák és az elvárt munkaidő (FTE) közötti eltérések (túlóra vagy hiány) automatikus nyilvántartása, a túlórák felhasználásának (lecsúsztatás vs kifizetés) jóváhagyási munkafolyamata, valamint a havi jelenléti ívek digitális lezárása.

---

## 2. Jelenleg Működő Üzleti Szabályok (A Valós Kód Alapján)

1. **Napi Munkaidő és Túlóra Delta Automatikus Számítása:**
   - A munkavállaló napi jelenléte rögzíti a becsekkolás és kicsekkolás pontos idejét (`hr_jelenlet`).
   - Kicsekkoláskor adatbázis trigger (`calculate_tulora_on_checkout`) automatikusan kiszámítja a ledolgozott perceket.
   - Az elvárt munkaidő a dolgozó beosztásában (`hr_beosztas`) rögzített FTE érték alapján számítódik: `v_elvaart_perc = v_fte * 480` perc (teljes munkaidő esetén 8 óra = 480 perc).
   - A differencia (`v_delta_perc = ledolgozott - elvárt`) azonnal és automatikusan jóváírásra kerül a dolgozó összesített túlóra egyenlegében (`hr_tulora_egyenleg.perc`), ami lehet pozitív (többletóra) vagy negatív (munkaidő-hiány).

2. **Túlóra Felhasználási Kérelmek:**
   - A felhalmozott pozitív túlóra egyenleg terhére a munkavállaló kérelmet nyújthat be (`hr_tulora_felhasznalás`).
   - A felhasználás kétféle lehet:
     - `kiveszi_szabinak`: Leúsztatás, szabadidő megváltásként.
     - `kifizetteti`: Pénzbeli kifizetés igénylése a bérszámfejtés felé.
   - A kérelem státusza alapértelmezetten `jovahagyasra_var`.
   - A közvetlen felettes vagy a HR hagyhatja jóvá (`jovahagyva`) vagy utasíthatja el (`elutasitva`).

3. **Havi Jelenléti Ív Lezárási Munkafolyamat:**
   - A havi jelenléti adatokat a hónap végén le kell zárni (`hr_havi_jelenlet_zaras`).
   - Állapotgép: `nyitott` → `jovahagyasra_var` (dolgozó beküldi) → `jovahagyva` (vezető jóváhagyja).
   - Dolgozónként, évenként és hónaponként egyetlen zárási rekord létezhet (UNIQUE constraint).

---

## 3. Tervezett, Még Nem Implementált Mt. Szabályok (Jövőbeli Fejlesztés)

> [!NOTE]
> Az alábbi Munka Törvénykönyve (Mt.) szabályok **még nincsenek lefejlesztve szoftveres validációként**, ezek jövőbeli feladatok:
- **11 órás napi pihenőidő vizsgálata:** Két egymást követő nap kicsekkolása és becsekkolása közötti idő ellenőrzése.
- **250 / 400 órás éves túlóra plafon:** Figyelmeztetés küldése a vezetőnek a törvényes korlát megközelítésekor.
- **Napi 12 órás abszolút maximum korlát:** Figyelmeztetés kiadása 12 órát meghaladó napi jelenlét esetén.
- **Többhavi munkaidőkeret kiegyenlítés:** Munkaidőkeret (pl. 3 hónapos keret) időszakos elszámoló modulja.

---

## 4. Érintett Adatbázis Elemek és Forrásfájlok
- Adatbázis táblák: `hr_jelenlet`, `hr_tulora_egyenleg`, `hr_tulora_felhasznalás`, `hr_havi_jelenlet_zaras`.
- Migráció: `supabase/migrations/20260826000002_tulora.sql`, `20260804000005_timesheet_workflow_and_rostering.sql`.
- Komponensek: `src/components/hr/overtime-balance-card.tsx`, `employee-timesheet.tsx`.
- PRD: [P-011](../../product/decisions/P-011-hr-timesheet-attendance-and-leave-calendar-ux.md).
