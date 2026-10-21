# ADR A-079: 5-Lépéses Emberközpontú Teljesítményértékelési Workflow és Százalékmentes Modell

- **Dátum:** 2026-10-21
- **Státusz:** `Decided`
- **Hatókör:** `[HR]`
- **Kapcsolódó döntések:** [ADR A-029](./A-029-global-ui-consistency-and-unified-components.md), [ADR A-078](./A-078-performance-management-module-overhaul-and-kpi-catalogue.md), [PRD P-102](../product/decisions/P-102-performance-management-module-overhaul-and-kpi-catalogue-ux.md), [PRD P-103](../product/decisions/P-103-human-centric-performance-workflow-and-goals-self-service-ux.md)

---

## 1. Kontextus és Problémafelvetés

Az eaisyHR teljesítményértékelési modul korábbi iterációja két ellentétes modellt kényszerített egyetlen képernyőre:
1. **Mesterséges matematikai százalékok és képletek:** A felület megpróbált tört százalékos teljesülést (`0%`, `75%`), bináris Igen/Nem kapcsolókat és folyamatcsíkokat számolni, ami egy éves/féléves szakmai és személyes értékelési ciklusban nem életszerű, mesterkélt és zavaró volt a végfelhasználók számára.
2. **Fragmentált, 3-dobozos nézet:** A lenyitható célkártyák belsejében 3 különálló al-doboz versengett a figyelemért (bal oldali lépések, jobb oldali műveletek, alsó előzmények), ami információs túlterhelést okozott.
3. **Dolgozói Önkiszolgáló Félrecsúszás:** A munkatárs a saját Profil áttekintő oldalán kapott egy teljes menedzsment-funkcionalitású célszerkesztőt, holott dolgozói szinten a célok kezelése, az önértékelés leadása és a visszajelzések megtekintése egy különálló, fókuszált munkaterületet igényel.

## 2. Döntés

1. **A Százalékok és Bináris Kapcsolók Teljes Eltávolítása:**
   - Megszüntettük az összes százalékos indikátort, progress bart és `[Nem] / [Igen]` bináris gombot.
   - Helyette a rendszer kizárólag a **5 mérföldköves emberi munkafolyamatra** támaszkodik:
     - `1. Célkitűzés` (Rögzítve / Várakozás önértékelésre)
     - `2. Önértékelés` (Dolgozói önértékelés leadva a dolgozói portálról)
     - `3. Vezetői értékelés` (Vezetői értékelés és visszajelzés rögzítése)
     - `4. 1-on-1 Megbeszélés` (Személyes egyeztetés jegyzőkönyvezése)
     - `5. Lezárva` (Hitelesített lezárás és archiválás a kartonon)

2. **Kanonikus `KpiWorkflowStepper` Komponens:**
   - Egységesítettük a lépésszámláló vizuális modellt a vezetői és a dolgozói felületen.
   - A komponens 5 számozott csomóponttal, diszkrét összekötő vonallal és aktuális állapotjelzéssel mutatja a cél életciklusát.

3. **Egyetlen, Teljes Szélességű, Seamless `divide-y` Szakaszos Munkaterület:**
   - Megszüntettük a "doboz a dobozban" kialakítást. Az `AccordionContent` nem tartalmaz 3 külön keretezett kártyát.
   - Helyette 3 letisztult elválasztott sáv alkotja:
     - Felső folyamatsáv a `KpiWorkflowStepper`-rel.
     - Középső fókuszált munkaterület, amely kizárólag az éppen aktív fázis teendőjét jeleníti meg (pl. vezetői értékelés űrlap, 1-on-1 jóváhagyás vagy lezáró gomb).
     - Alsó diszkrét előzmény sáv és kényelmes, széles megjegyzésmező (`placeholder="Megjegyzés hozzáfűzése..."`).

4. **Dedikált Dolgozói Célkezelő Oldal (`/hr/self-service/goals`):**
   - Leválasztottuk a célok interaktív értékelését a személyes profilról.
   - A munkavállaló egy dedikált oldalon (`/hr/self-service/goals`) éri el a céljait, KpiCard mérőszámokkal és a strukturált önértékelési munkalappal (`SingleGoalWorkspace`).

5. **Célkitűzés Létrehozásának Radikális Egyszerűsítése (`AddKpiDialog`):**
   - Eltávolítottuk a mértékegység-típusokat, kezdeti és célértékeket.
   - Új cél kitűzése most mindössze: **Dolgozó + Megnevezés + Ciklus + Prioritás Súlyozás (1x / 1.5x / 2x)**.

## 3. Érintett Komponensek és Fájlok

- `src/components/hr/kpi-workflow-stepper.tsx` (5-lépéses folyamatsáv komponens)
- `src/components/hr/performance-list.tsx` (Vezetői lista, seamless divide-y szakaszok, százalékmentes nézet)
- `src/components/hr/employee-kpi-card.tsx` (Dolgozói fókuszált célkártya, önértékelési munkalap)
- `src/app/hr/self-service/goals/page.tsx` (Új önálló dolgozói célkitűzés és értékelés oldal)
- `src/components/hr/add-kpi-dialog.tsx` és `edit-kpi-dialog.tsx` (Egyszerűsített modálok)
- `src/app/hr/performance/actions.ts` (Munkafolyamat tranzakciók: önértékelés, vezetői értékelés, 1-on-1, végleges lezárás)

## 4. Következmények

- Megszűnt a kognitív túlterhelés és a mesterkélt matematikai százalékszámítás.
- A vezetők és a munkatársak egyértelműen látják a felelősség megoszlását: mikor ki következik a folyamatban.
- 100%-ban megfelel a Linear flat stílusnak és az ADR A-029 egységességi elvnek.
