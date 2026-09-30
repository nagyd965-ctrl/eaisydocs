# [HR] A-013: eaisyHR Jelenléti Ív, Túlóra és Munkaszüneti Nap Kalkulációs Szabálymotor

**Status:** Decided  
**Date:** 2026-08-04 (Rögzítve: 2026-09-30)  
**Scope:** [HR]
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `supabase/migrations/20260804000005_timesheet_workflow_and_rostering.sql`, `20260826000001_munkaszuneti_napok.sql`, `20260826000002_tulora.sql`, `src/app/hr/attendance-actions.ts`

---

## 1. Context (Kontextus)
A munkaidő-nyilvántartás és a jelenléti adatok feldolgozása során kezelni szükséges:
- A munkavállaló napi becsekkolását és kicsekkolását.
- A ténylegesen ledolgozott percek és az elvárt munkaidő (FTE szerinti napi norma) összevetését.
- A keletkező munkaidő-többlet vagy -hiány (túlóra delta) azonnali elszámolását.
- A magyarországi hivatalos munkaszüneti napokat és az áthelyezett munkanapokat (ledolgozandó szombatok).
- A havi jelenléti ívek lezárási és jóváhagyási munkafolyamatát.

---

## 2. Decision (A Meghozott Döntés)

1. **Munkaszüneti Napok Törzstábla (`hr_munkaszuneti_nap`):**
   - Évenként előre feltöltött naptár (2025, 2026, 2027), amely tárolja a magyarországi ünnepnapokat és az áthelyezett munkanapokat (`athelye_munkanap: boolean`). RLS: minden hitelesített felhasználó olvashatja.

2. **Automatikus Túlóra Számítás Kicsekkoláskor (`calculate_tulora_on_checkout` trigger):**
   - Kicsekkoláskor az adatbázis trigger kiszámolja a munkanap hosszát (`NEW.kicsekkolas_ideje - NEW.becsekkolas_ideje`).
   - Lekéri a dolgozó érvényes beosztásából a munkaidő FTE-t (`v_fte`), és kiszámítja a napi elvárt perceket (`v_fte * 480`).
   - A differenciával (`v_delta_perc`) azonnal frissíti a dolgozó összesített egyenlegét a `hr_tulora_egyenleg` táblában (UPSERT).

3. **Túlóra Felhasználási Folyamat (`hr_tulora_felhasznalás`):**
   - A dolgozó kérelmet nyújthat be az egyenleg terhére: `kiveszi_szabinak` (szabadidő megváltás) vagy `kifizetteti` (bérként történő kifizetés).
   - Státuszok: `jovahagyasra_var` → `jovahagyva` / `elutasitva` (közvetlen felettes vagy HR által).

4. **Havi Jelenlét Zárás Állapotgép (`hr_havi_jelenlet_zaras`):**
   - Havi ciklus dolgozónként: `nyitott` → `jovahagyasra_var` → `jovahagyva`.
   - Adatbázis szintű `UNIQUE(dolgozo_id, ev, honap)` védelem.

---

## 3. Consequences (Következmények)
* **Pozitív:** Automatikus egyenlegkezelés emberi beavatkozás nélkül; transzparens kérelmezés a dolgozó és a vezető között.
* **Jövőbeli kiegészítések:** A szigorú Mt. korlátok (11 órás pihenőidő, 250 órás éves plafon, többhavi munkaidőkeret) jövőbeli szoftveres szabályként építendők rá erre az alapra.
