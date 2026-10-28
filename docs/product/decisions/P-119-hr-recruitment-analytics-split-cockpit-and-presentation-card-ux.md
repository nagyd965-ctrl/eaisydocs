# P-119: [HR] Toborzási Analitika Vezetői Split Cockpit (Terv C), Összecsukható „Cégünkről” Prezentáció Kártya és Karrieroldal Finomhangolás UX

**Status:** Decided  
**Date:** 2026-10-28  
**Scope:** `[HR]`  
**Category:** `HR / Recruitment Analytics, Employer Branding & Public Career Portal UX`  
**Author:** Antigravity Agent  
**Kapcsolódó ADR:** [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [A-086](../../architecture/decisions/A-086-multi-company-career-portal-and-ai-employer-branding-architecture.md)  
**Kapcsolódó Kód:** `src/components/hr/recruitment-analytics.tsx`, `src/components/hr/company-presentation-editor.tsx`, `src/components/hr/career-portal-client.tsx`, `src/app/karrier/[id]/page.tsx`, `src/utils/hr/career-constants.ts`, `src/app/hr/recruitment/recruitment-tabs.tsx`, `src/app/hr/performance/dashboard/page.tsx`, `src/app/hr/performance/dashboard/components/performance-calibration-dashboard.tsx`  

---

## 1. Question / Problémafelvetés

1. **Toborzási Analitika (`/hr/recruitment` -> `Analitika` fül):** A korábbi nézet vagy túl egyszerű volt (1 db alapvető tölcsércsík), vagy túl sok egymás alá zsúfolt táblázatot és szövegdobozt tartalmazott, miközben a valós adatbázis-oszlopok (`nev`, `kezdesi_ido`, `berigeny`, `forras`, `ai_relevance_score`) nem jelentek meg vizuális BI diagramokon.
2. **Vezetői Teljesítmény Riportok (`/hr/performance/dashboard`):** A korábbi nézet `max-w-6xl` korlátozással, ciklus- és részlegszűrő nélkül, egy félbevágott feliratú fánkdiagrammal és egyszerű táblázattal működött, nem támogatva az iparági (Lattice / Leapsome) teljesítmény-kalibrációs haranggörbét és a ciklusonkénti trendelemzést.
3. **„Cégünkről” Prezentáció Kezelő (`/hr/recruitment` -> `Cégünkről (AI Prezentáció)` fül):** Amikor egy vállalatnak már volt elmentett és publikált prezentációja, a fülre lépve továbbra is az 5 lépéses létrehozó varázsló 1. lépése (az űrlap) fogadta a HR munkatársat, azt a benyomást keltve, mintha újra ki kellene töltenie mindent.
4. **Publikus Karrieroldal (`/karrier` és `/karrier/[id]`):** A `Másik vállalat választása` gomb a bal felső logó mellett rossz vizuális helyen volt, a pozíció-szekcióváltó sávban és az állásrészletező alján feleslegesen ismétlődött a „Cégünkről” ajánló blokk, a foglalkoztatás típusánál pedig felesleges óraszám (`(40h)`) szerepelt.

## 2. Decision (A Meghozott Döntés)

### 2.1. Personio-stílusú Vezetői Split Cockpit Toborzási Analitika (`Terv C` — `src/components/hr/recruitment-analytics.tsx`)
A nemzetközi ATS/HRIS rendszerek (Ashby, Greenhouse, Lever, Personio) összehasonlítása és 3 vizuális látványterv elkészítése után a **Terv C (Personio stílusú Vezetői Split Cockpit)** került megvalósításra:
- **Felső Vezérlősáv és 4 KPI Kártya:**
  - Jobb felső szűrők: **Időszak választó** (`Összes`, `Elmúlt 30 nap`, `Elmúlt 90 nap`, `Idei év (YTD)`), **Részleg választó** (`Mind` / konkrét részlegek) és **Exportálás (CSV)** gomb.
  - 4 áttekintő KPI kártya inline pilula-jelvényekkel: **Nyitott pozíciók** (`+X publikus`), **Aktív jelöltek** (`X% interjún`), **Átlagos Time-to-Hire** (`X nap`), valamint **SLA Figyelmeztetés** (`Azonnali teendő` / `Naprakész`).
- **Bal oldali Stratégiai BI Szekció (`lg:col-span-8` — 2/3 szélesség):**
  1. **Toborzási Csatornák Hatékonysága & Konverzió:** Bal oldalán harmonikus Fintech Teal árnyalatú Recharts Fánkdiagram (`PieChart`) százalékos jelmagyarázattal (`LinkedIn`, `Karrieroldal`, `Profession.hu`, `Ajánlás`), jobb oldalán pedig csoportosított oszlopdiagram (`BarChart`), amely csatornánként egymás mellett hasonlítja össze a **Beérkezett jelentkezéseket (`#0f766e`)** és az **Interjúba jutottakat (`#14b8a6`)**.
  2. **Pozíciónkénti Bérigény vs. Meghirdetett Bérsáv (`Range Bar` + `Marker Dot`):** Minden nyitott pozícióhoz egy arányos bérkeret-tartománysáv (`bg-[#14b8a6]/40`) jelenik meg a vállalati bérskálán belül, rajta egy sötét-teal kör alakú pozíciójelölő ponttal (`bg-[#0f766e]`, túllépés esetén `bg-warning`), amely a jelöltek átlagos bruttó bérigényét mutatja.
- **Jobb oldali Operatív Akcióközpont (`lg:col-span-4` — 1/3 szélesség):**
  1. **Pozíciók Betöltöttségi Állapota:** Részlegenkénti `(betöltött/nyitott)` arányok lekerekített teal progress sávokkal.
  2. **Sürgős Beavatkozás (7+ napja várakozó):** A több mint 7 napja „Új” vagy „Előszűrt” státuszban álló jelöltek listája monogrammal, pozícióval és borostyánsárga `{X} napja vár` jelvénnyel.
  3. **Kiemelt AI Relevanciájú Jelöltek (>85%):** A legmagasabb AI pontszámú aktív jelöltek listája teal `AI: {X}%` jelvénnyel.

### 2.2. Kétmódú (Előnézet vs. Szerkesztő) és Kattintásra Lenyíló „Cégünkről” Prezentáció Kártya (`src/components/hr/company-presentation-editor.tsx`)
- Ha az aktív vállalatnak már van elmentett prezentációja (`hasSavedPresentation === true`), a `Cégünkről (AI Prezentáció)` fülre lépve **nem nyílik meg az 5 lépéses varázsló**, hanem egy összecsukott, kattintható fejléckártya jelenik meg.
- A kártyára rávive az egeret egyértelmű hover visszajelzés (`hover:border-primary/40`, `group-hover:text-primary`, `Kattints a prezentáció megtekintéséhez` + lenyíló ikon) jelzi, hogy a kártyára kattintva nyílik le (és csukódik vissza) a teljes interaktív prezentáció (`CompanyPresentationViewer`).
- A kártya jobb oldalán található **„Prezentáció szerkesztése”** gomb nyitja meg az 5 lépéses varázslót (amelyből a `Kilépés a szerkesztésből` gombbal vagy a `Mentés és publikálás` művelettel visszatérhetünk a kártyanézetre).

### 2.3. Publikus Karrierportál Finomhangolások (`src/components/hr/career-portal-client.tsx`, `src/app/karrier/[id]/page.tsx`, `src/utils/hr/career-constants.ts`)
- A **„Másik vállalat választása”** gomb a bal oldali logó mellől átkerült a fejléc jobb oldali műveleti sávjába, közvetlenül a `Pályázatstátusz lekérdezése` gomb mellé.
- A pozíció-szekcióváltó sávból kikerült a duplikált *„Ismerd meg a(z) ... kultúráját és irodáit 5 fejezetben”* szöveges link, a pozíció-részletező oldal (`/karrier/[id]`) aljáról pedig kikerült a „Cégünkről” teaser kártya (így ott csak a *További nyitott pozíciók* szekció látszik).
- Az `EMPLOYMENT_TYPE_LABELS` szótárból eltávolításra került a `(40h)` jelölés, így mindenhol egységesen `Teljes munkaidő` és `Részmunkaidő` jelenik meg.

### 2.4. Vezetői Teljesítmény Riportok — Lattice / Leapsome stílusú Kalibrációs Haranggörbe és Prémium Mátrix (`Terv B` — `src/app/hr/performance/dashboard/components/performance-calibration-dashboard.tsx`)
- **Teljes szélességű (`w-full`) elrendezés és globális vezérlősáv:** A fejléc jobb oldalán interaktív **Ciklusválasztó** (`Összes ciklus` / adott ciklus), **Részlegszűrő** (`Minden részleg` / konkrét szervezeti egység) és **CSV Exportálás** gomb kapott helyet.
- **4 Kanonikus `KpiCard`:** `Aktív célkitűzések`, `Átlagos teljesülés`, `Bónuszra jogosult` (`>=60%`) és `Lezárt értékelések` (`5. fázis aránya`).
- **Középső BI Szekció (2 oszlop):**
  1. **Teljesítmény Kalibrációs Eloszlás (Haranggörbe):** 5 kalibrációs sáv (`0–40% Alulteljesít`, `41–59% Fejlesztendő`, `60–74% Megfelelő`, `75–89% Magas`, `90–100% Kimagasló`) tényleges megoszlással, vállalati elvárt célértékkel (`Cél: X%`) és kattintható oszlop-szűréssel.
  2. **Ciklusonkénti Vállalati Teljesítmény Trend:** Recharts `AreaChart` finom Fintech Teal gradienssel (`2025 Q4` -> `2026 Q4`) és előző ciklushoz viszonyított delta jelvénnyel.
- **Bérszámfejtési és Prémium Kalibrációs Táblázat (`TableToolbar`):** Szabványos keresővel, oszlopválasztóval és szűrő popoverrel ellátott táblázat (`Dolgozó & Munkakör`, `Részleg`, `Kitűzött KPI`, `Workflow Fázis`, `Teljesítmény Index`, `Javasolt Prémium Sáv`).
