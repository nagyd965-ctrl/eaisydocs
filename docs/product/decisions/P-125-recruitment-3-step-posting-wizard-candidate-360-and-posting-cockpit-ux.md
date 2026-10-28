# P-125: 3-Lépéses AI Álláshirdetés Varázsló, Egységes Kártya/Lista Nézet, Teljes Oldalas 360° Jelölti Tehetségprofil és Álláshirdetés Adatlap UX

**Status:** Decided  
**Date:** 2026-10-28  
**Scope:** `[HR]`  
**Category:** `HR / Recruitment, Talent Pool, Job Postings & Internal Career UX`  
**Author:** Antigravity  
**Kapcsolódó ADR:** [A-092](../../architecture/decisions/A-092-recruitment-talent-pool-deduplication-candidate-360-and-posting-cockpit-architecture.md)  
**Kapcsolódó Kód:** `src/components/hr/manage-posting-dialog.tsx`, `src/components/hr/job-postings-list.tsx`, `src/components/hr/internal-career-view.tsx`, `src/components/hr/talent-pool-list.tsx`, `src/app/hr/recruitment/candidate/[id]/candidate-talent-profile-client.tsx`, `src/app/hr/recruitment/posting/[id]/posting-detail-client.tsx`, `src/app/karrier/[id]/page.tsx`  

---

## 1. Question / Problémafelvetés
A toborzási és karrier felületek áttekintése során több UX inkonzisztenciát kellett feloldani:
1. Az álláshirdetés létrehozó modál (`ManagePostingDialog`) egyetlen zsúfolt űrlap volt, ahol az AI generátor külön dobozban, a pozíció-paraméterektől elszigetelve működött, és a leírásnak nem volt formázott előnézete.
2. A dolgozói Belső Álláspályázatok (`/hr/self-service/career`) és a HR Toborzási Álláshirdetések (`/hr/recruitment`) lista- és szűrőfelülete eltért egymástól; hiányzott a `Kártyák` / `Lista` nézetváltó, a `Már pályáztál` és `Pályázás` gombok szélessége pedig nem volt egységes.
3. A `/karrier/[id]` álláshirdetés részletező oldal zöld fejlécében és felső navigációjában duplikált metaadatok és redundáns vissza-gombok jelentek meg.
4. A Talent Pool-ban és az álláshirdetésekre kattintva oldalsáv vagy szűk pop-up helyett teljes oldalas, tágas, kattintható adatlapokra volt szükség.

## 2. Decision (A Meghozott Döntés)
1. **3-Lépéses Álláshirdetés Varázsló (`ManagePostingDialog`):**
   - **1. lépés – Mód és Alapadatok:** Vizuális módválasztó (`Generálás AI-val` vs. `Saját kezű kitöltés`), pozíció címe, belső munkakör, részleg, határidő, valamint AI mód esetén beágyazott kulcsszó/elvárás mező.
   - **2. lépés – Feltételek és Bérsáv:** Munkavégzés módja, foglalkoztatás típusa, tapasztalati szint, helyszín, valamint az EU 2023/970 bértranszparencia سáv és láthatósági kapcsolók (`Aktív`, `Publikus`, `Csak belső`).
   - **3. lépés – Tartalom és Előnézet:** AI módban a 3. lépésre lépve a rendszer automatikusan legenerálja a hirdetést az 1–2. lépés összes paramétere alapján; a szöveg `Szerkesztés` és `Formázott előnézet` módban is ellenőrizhető.
2. **Egységes `Kártyák` / `Lista` nézetváltó és Kanonikus `TableToolbar`:**
   - Mind a Belső Álláspályázatok (`InternalCareerView`), mind a Toborzási Álláshirdetések (`JobPostingsList`) megkapta a 4 elemű `KpiCard` sávot, a kanonikus `TableToolbar` szűrőrendszert és a `Kártyák` / `Lista` nézetváltót.
   - A belső állások lista nézetében a `Pályázás` és a `Már pályáztál` gombok fix `w-[116px]` szélességet kaptak a vizuális törések elkerülésére.
3. **Letisztított `/karrier/[id]` fejléc és navigáció:**
   - A felső navigációból kikerültek a redundáns vissza-gombok, a zöld fejléc pedig csak a pozíció címét, a részleget és a bértranszparencia összeget emeli ki, elkerülve az alatta lévő 4 metaadat-kártya duplikálását.
4. **Teljes oldalas 360°-os Jelölti Tehetségprofil (`/hr/recruitment/candidate/[id]`) és Álláshirdetés Adatlap (`/hr/recruitment/posting/[id]`):**
   - A Talent Pool-ban a jelölt sorára vagy a `Profil megnyitása` gombra kattintva a `/hr/recruitment/candidate/[id]` teljes oldalas nézet nyílik meg összesített AI kompetenciákkal, teljes pályázati előzményekkel és a `Behívás nyitott álláshirdetésre` művelettel.
   - A `JobPostingsList` kártyáin és táblázatában az álláshirdetés címére vagy az `X jelentkező` / `X fő` gombra kattintva pop-up helyett a `/hr/recruitment/posting/[id]` teljes oldalas pozíció-adatlap nyílik meg 4 pozíció-specifikus `KpiCard`-dal, kanonikus `TableToolbar`-ral, bérigény vs. bérsáv összevetéssel és inline státuszváltással.

## 3. Rationale (Indoklás)
A teljes oldalas adatlapok (`/hr/recruitment/candidate/[id]` és `/hr/recruitment/posting/[id]`) megszüntetik a szűk modálok és oldalsávok zsúfoltságát, és teljes összhangot teremtenek az eaisyHR 360°-os dolgozói és munkaköri adatlapjaival (ADR [A-029](../../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), PRD [P-043](./P-043-global-ui-consistency-and-unified-components.md)).
