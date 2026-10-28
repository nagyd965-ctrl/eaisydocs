# A-092: Toborzási Tehetségbázis Deduplikáció, 360°-os Jelölti Profil, Pozíció-hozzárendelés és Belső/Publikus Pályázati Szétválasztás Architektúra

**Status:** Decided  
**Date:** 2026-10-28  
**Scope:** `[HR]`  
**Author:** Antigravity  
**Kapcsolódó PRD:** [P-125](../../product/decisions/P-125-recruitment-3-step-posting-wizard-candidate-360-and-posting-cockpit-ux.md)  
**Kapcsolódó Kód:** `src/app/hr/recruitment/actions.ts`, `src/app/hr/recruitment/ai-posting-actions.ts`, `src/app/hr/recruitment/candidate/[id]/page.tsx`, `src/app/hr/recruitment/posting/[id]/page.tsx`, `src/app/karrier/[id]/page.tsx`, `src/app/karrier/[id]/actions.ts`, `src/components/hr/talent-pool-list.tsx`, `src/components/hr/job-postings-list.tsx`  

---

## 1. Context (Kontextus)
A toborzási modul (`/hr/recruitment`) és a karrierportál (`/karrier/[id]`) használata során négy összefüggő architektúrális probléma merült fel:
1. **Talent Pool duplikációk és kontextustévesztés:** Ugyanaz a jelölt több álláshirdetésre történő jelentkezéskor többször is megjelent a Talent Pool-ban, ráadásul a sorra kattintva a Kanban táblához tervezett oldalsáv (`CandidateProfileSheet`) nyílt meg `[Elfogad]` / `[Elutasít]` gombokkal, ami szembehelyezkedett a hosszú távú tehetségmenedzsment céljával.
2. **Álláshirdetésre jelentkezettek áttekinthetősége:** A hirdetéslistában (`JobPostingsList`) látszott a jelentkezők száma (`X jelentkező`), de az adott álláshirdetésre kattintva nem volt dedikált, teljes oldalas pozíció-adatlap a jelentkezők szűrésére, bérigény vs. bérsáv összevetésére és státuszkezelésére.
3. **Publikus vs. belső pályázati űrlap szétválasztása és duplikált pályázatok megelőzése:** Ha egy bejelentkezett munkavállaló publikus (`is_internal = false`) álláshirdetést nyitott meg a `/karrier/[id]` oldalon, a rendszer belső dolgozóként kezelte, továbbá nem volt szerveroldali védelem az ellen, hogy ugyanarra az álláshirdetésre ugyanazzal az e-mail címmel többször is beküldjék a jelentkezést.
4. **AI álláshirdetés-generálás teljes kontextussal:** Az álláshirdetés varázslóban az AI generátor korábban csak a pozíció nevét kapta meg, a kiválasztott munkavégzési módot, foglalkoztatási típust, szenioritást, helyszínt és bérsávot nem építette be a generált hirdetésszövegbe.

## 2. Decision (A Meghozott Döntés)
1. **E-mail alapú deduplikáció és 360°-os Jelölti Tehetségprofil (`/hr/recruitment/candidate/[id]`):**
   - A `TalentPoolList` és az álláshirdetés-szintű jelentkezőszámláló (`getApplicantCount`) e-mail cím (illetve név fallback) alapján csoportosítja a `hr_toborzas` rekordokat, mindig a legfrissebb jelentkezést tekintve elsődlegesnek, miközben összesíti a jelölt összes megpályázott pozícióját (`uniquePositions`) és AI készségeit (`ai_skills`).
   - Létrejött a `/hr/recruitment/candidate/[id]` szerveroldali végpont, amely lekéri a jelölt összes – azonos vállalaton belüli – múltbeli és jelenlegi jelentkezését (`hr_toborzas`), előállítja az aláírt CV megtekintő URL-eket, és kiszolgálja a teljes oldalas 360°-os tehetségprofilt.
   - Az `assignCandidateToPostingAction(candidateId, targetPostingId)` szerver akció lehetővé teszi, hogy a Talent Pool-ból egy jelöltet egyetlen kattintással behívjanak egy nyitott álláshirdetésre: ha még nincs jelentkezése az adott hirdetésre, a meglévő CV-vel, AI profillal és adatokkal új `eloszurt` státuszú pályázati rekordot hoz létre és auditálja a műveletet.
2. **Teljes oldalas Álláshirdetés Részletes Adatlap (`/hr/recruitment/posting/[id]`):**
   - Pop-up modál helyett dedikált route (`/hr/recruitment/posting/[id]`) szolgálja ki az adott álláshirdetéshez tartozó összes egyedi jelentkezőt, pozíció-specifikus KPI-okat, bérigény vs. bérsáv összevetést (`bersav_min`, `bersav_max`), inline státuszváltást (`updateCandidateStatus`) és CV előnézetet (`DocumentViewer`).
3. **Szigorú belső/publikus pályázati szétválasztás és duplikáció-védelem (`/karrier/[id]`):**
   - A `/karrier/[id]/page.tsx` és `submitApplication` (`actions.ts`) kizárólag akkor alkalmazza a belső pályázati logikát (`isStrictlyInternalApplication`), ha maga a meghirdetett pozíció is belső (`posting.is_internal === true`) ÉS a felhasználó a hirdető vállalat igazolt munkavállalója. Publikus hirdetésnél (`is_internal = false`) mindig a tiszta publikus jelentkezési folyamat fut le.
   - A `submitApplication` szerveroldalon ellenőrzi, hogy létezik-e már nem elutasított jelentkezés ugyanarra az `(allashirdetes_id, email)` párra, és meglévő pályázat esetén informatív hibaüzenettel megakadályozza a duplikált beküldést.
   - A `/hr/self-service/career` oldal szerveroldalon kizárólag a valódi belső hirdetéseket (`eq("is_internal", true)`) kérdezi le.
4. **Kontextus-gazdag AI álláshirdetés-generálás (`generateJobPostingContentAction`):**
   - Az `ai-posting-actions.ts` kibővült a `workMode`, `employmentType`, `seniority`, `location`, `salaryMin`, `salaryMax` és `salaryPublic` paraméterekkel, amelyeket a rendszerprompt strukturáltan átad a nyelvi modellnek.

## 3. Consequences (Következmények)
**Pozitív:**
- Megszűntek a duplikált jelöltsorok a Talent Pool-ban és az álláshirdetések jelentkezőszámlálóiban.
- A HR munkatársak teljes képernyős, kanonikus (`KpiCard` + `TableToolbar`) munkafelületen kezelhetik mind a jelöltek teljes életútját (`/hr/recruitment/candidate/[id]`), mind az egyes álláshirdetésekre beérkezett pályázatokat (`/hr/recruitment/posting/[id]`).
- A publikus és belső karrierfolyamatok adatszinten és jogosultságilag is tisztán elválasztva működnek.

**Kockázat / Kompromisszum:**
- Az e-mail alapú deduplikáció feltételezi, hogy ugyanaz a jelölt azonos e-mail címmel pályázik; eltérő e-mail cím használata esetén a rendszer külön jelöltként kezeli a rekordokat.
