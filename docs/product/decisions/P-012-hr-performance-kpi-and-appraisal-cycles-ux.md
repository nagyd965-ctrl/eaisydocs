# [HR] P-012: Teljesítményértékelés, KPI és Értékelési Ciklusok UX

## 1. Kontextus és Célkitűzés
Az eaisyHR teljesítményértékelési modulja céges, szervezeti egység és egyéni szintű célkitűzések (KPI) menedzselését, valamint időszakos (pl. negyedéves, éves) értékelési ciklusok lebonyolítását teszi lehetővé. A felhasználói felület célja a transzparens célkövetés, az önértékelés és a vezetői felülvizsgálat zökkenőmentes folyamatának biztosítása.

## 2. Érintett Képernyők és Komponensek
- **Fő nézet:** `/hr/teljesitmeny` (Teljesítményértékelés áttekintő és menedzsment)
- **Komponensek:**
  - `src/components/hr/performance-list.tsx`: Dinamikus lista a munkavállalók aktuális KPI állásáról, szűrés ciklus, osztály és státusz szerint.
  - `src/components/hr/employee-kpi-card.tsx`: Dolgozói KPI részletező kártya, súlyozás, célértékek és aktuális elért szintek vizualizációja.
  - `src/components/hr/manage-cycles-dialog.tsx`: Értékelési ciklusok létrehozása, indítása, lezárása és archiválása.
  - `src/components/hr/kpi-workflow-stepper.tsx`: Folyamatléptető (Célkitűzés -> Féléves felülvizsgálat -> Önértékelés -> Vezetői értékelés -> Lezárt).
  - `src/components/hr/add-kpi-dialog.tsx` & `edit-kpi-dialog.tsx`: Célkitűzés definiálása mértékegységgel, súlyozással és határidővel.

## 3. Felhasználói Interakciók és Folyamatok
1. **Értékelési Ciklus Indítása:** A HR vezető definiálja a ciklus időtartamát (kezdő és záró dátum, önértékelési határidő).
2. **Célok Hozzárendelése:** A vezető vagy a dolgozó rögzíti a célokat, amelyekhez súlyozás (pl. 20%, 30%) és mérhető metrika tartozik (összegük 100% kell legyen).
3. **Értékelési Lépések:**
   - A dolgozó kitölti az önértékelést és szöveges reflexiót fűz hozzá.
   - A vezető pontozza az elérést, és összegző visszajelzést ír.
   - 1-on-1 interjút követően a státusz elfogadottra áll, ami zárolja az űrlapot.

## 4. UI Állapotok és Visszajelzések
- **Súlyozás érvényesítés:** Ha a dolgozó KPI-jainak összege nem éri el vagy meghaladja a 100%-ot, a felület sárga figyelmeztető bannerrel jelzi a validációs hibát.
- **Workflow státuszjelzők:** Színes badgek jelzik az állapotot (`Tervezet`, `Folyamatban`, `Önértékelés alatt`, `Vezetői értékelés alatt`, `Lezárva`).
- **Anonim / Zárt mód:** Lezárást követően a pontszámok kalkulációja automatikusan generálja a bónusz/prémium javaslati százalékot.
