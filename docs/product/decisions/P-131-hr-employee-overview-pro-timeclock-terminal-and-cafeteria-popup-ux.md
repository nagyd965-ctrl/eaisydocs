# P-131: [HR] Dolgozói Portál Áttekintés (`/hr`) Újratervezés, Profi Munkaidő Terminál és Cafeteria Nyilatkozat Pop-up + Dokumentumaim Integráció

- **Dátum:** 2026-11-02
- **Státusz:** Elfogadva / Implementálva
- **Hatókör:** `[HR]`
- **Érintett fájlok:**
  - `src/app/hr/page.tsx`
  - `src/components/hr/time-tracking-card.tsx`
  - `src/components/hr/cafeteria-declaration-modal.tsx`
  - `src/app/hr/self-service/documents/page.tsx`
  - `src/components/hr/employee-documents-view.tsx`
  - `src/app/hr/cafeteria-actions.ts`

## Kontextus és Probléma
A Dolgozói Portál nyitóoldala (`/hr` — `Áttekintés`) korábban aránytalanul üres „Időadat Rögzítés" dobozt, duplikált KPI kártyákat és egy állandóan kint lévő „Cafeteria Nyilatkozat" kártyát tartalmazott, miközben a véglegesített Cafeteria nyilatkozat nem volt közvetlenül elérhető a dolgozó saját `Dokumentumaim` (`/hr/self-service/documents`) tárhelyén.

## Döntés
1. **Megtartott Üdvözlő Fejléc (`/hr`):**
   - Az oldal tetején megmaradt az `Áttekintés` cím és a zöld üdvözlő sáv (`Üdvözlünk, {nev}!`, munkakör, belépési dátum, aktuális becsekkolási státusz és mai dátum), felesleges fejléc-gyorsgombok nélkül.
2. **Profi Munkaidő Terminál (`TimeTrackingCard` — bal oldali 7 oszlop):**
   - **Élő stopper és napi előírás:** Nagy pontosságú `HH:mm:ss` nettó munkaidő számláló a dolgozó szerződéses heti óraszámából számított napi előírással (alapértelmezetten `08:00:00`) és hátralévő/többlet idő kijelzéssel.
   - **4 műszak-telemetria cella:**
     1. *Munkakezdés (Be):* pontos mai belépési időpont.
     2. *Tervezett befejezés / Munkabefejezés (Ki):* a belépési időpontból, a napi normából és a már kivett szünetidőből dinamikusan számított várható munkabefejezés.
     3. *Mai szünetidő:* rögzített és aktív ebédszünet percekben.
     4. *Napi egyenleg:* a napi normáig hátralévő idő vagy a napi pozitív többletidő.
   - **Műszak előrehaladási sáv:** `0% -> 100%` vizuális előrehaladás (félidő és napi norma jelöléssel), túlóra esetén elkülönülő sávval.
   - **Tiszta vezérlőgombok:** Teljes szélességű `Munkakezdés rögzítése (Becsekkolás)` gomb (felesleges korrekciós mellékgombok nélkül, mivel a korrekció a `Jelenlét` táblázatban történik), aktív munkánál pedig `Ebédszünet / Szünet indítása` és `Munkanap befejezése (Kicsekkolás)`.
   - **Mai időbélyegzések naplója + Heti 5 napos (`H–P`) munkaidő-mérleg:** A terminál alsó sávjában tételesen látszik a mai nap idővonala és az aktuális hét 5 munkanapjának ledolgozott óraszáma élő szinkronnal.
3. **Szabadság és Időegyenleg + Teendőim és HR Megfelelőség (jobb oldali 5 oszlop):**
   - Egyesített **Szabadság és Időegyenleg** kártya (*Elérhető*, *Felhasznált + tervezett*, *Munkaidő mérleg*), szegmentált éves szabadságsávval, valamint a **következő kiírt szabadság** és a **következő munkaszüneti nap** kijelzésével.
   - **Teendőim és HR Megfelelőség** kártya: *Munkaköri orvosi alkalmassági* érvényessége (hátralévő napok számával), nyitott *Negyedéves KPI önértékelés*, *Elbírálásra váró kérelmek* és esetlegesen még le nem adott *Cafeteria nyilatkozat*.
4. **Alsó 7 / 5 oszlopos szekció:**
   - Bal oldalon (7 oszlop): **Legutóbbi Kérelmeim** egységes táblázatos nézetben (`Típus`, `Megnevezés`, `Időszak / Időpont`, `Státusz`).
   - Jobb oldalon (5 oszlop): **Aktuális Célkitűzéseim** (`EmployeeKpiWidget`).
5. **Cafeteria Nyilatkozat Pop-up és Dokumentumaim integráció:**
   - A Cafeteria kártya kikerült az `Áttekintés` oldalról.
   - Ha a dolgozónak van idei Cafeteria kerete, de még nem véglegesítette (`!nyilatkozat_lezarva`), az `Áttekintés` oldal megnyitásakor automatikusan megjelenik a `CafeteriaDeclarationModal` pop-up.
   - A véglegesített (`nyilatkozat_lezarva === true`) Cafeteria nyilatkozat automatikusan bekerül a `Dokumentumaim` (`/hr/self-service/documents`) oldalra (`Cafeteria / Béren kívüli juttatások` kategóriában), ahol helyben előnézetben megtekinthető (`DocumentViewer`) és PDF-ként letölthető.
