# [HR] BRD-007: Toborzási Adatkezelés, GDPR Retenció és Jelölt Életciklus

**Status:** Decided  
**Date:** 2026-09-29 (Auditálva: 2026-09-30)  
**Scope:** `[HR]`  
**Category:** Recruitment / Data Privacy  
**Author:** Dani & ThinkAI  
**Kapcsolódó ADR:** [A-014](../../architecture/decisions/A-014-hr-gdpr-data-retention-and-anonymization-cron.md), [A-018](../../architecture/decisions/A-018-hr-recruitment-ats-and-ai-resume-parsing.md)  
**Kapcsolódó PRD:** [P-013](../../product/decisions/P-013-hr-recruitment-ats-and-public-careers-portal-ux.md)  
**Kapcsolódó Kód:** `src/app/hr/recruitment/actions.ts`, `src/app/karrier/[id]/actions.ts`, `supabase/migrations/20260721000001_eaisyhr_backend_core.sql`, `20260725000007_hr_karrieroldal.sql`

---

## 1. Üzleti Célkitűzés és GDPR Megfelelőség
A toborzás során beérkező önéletrajzok, motivációs levelek és értékelések személyes adatokat tartalmaznak. A rendszernek garantálnia kell a GDPR szerinti adattakarékosság és korlátozott tárolhatóság elvét, a hozzájárulások kezelését, valamint a lezárt toborzási folyamatok adatainak automatikus törlését vagy anonimizálását.

---

## 2. Üzleti Szabályok (Business Rules)
1. **Hozzájárulási Nyilatkozat:**
   - A publikus karrierportálon (`/karrier/[id]`) a jelentkezés elküldésének feltétele az Adatkezelési Tájékoztató elfogadása és a hozzájárulás megadása az adott pozíció elbírálásához (`adatkezelesi_hozzajarulas = true`).
   - Külön, opcionális mező kéri a hozzájárulást a tehetségbankba (Talent Pool) történő felvételhez további 12 hónapra (`talent_pool_hozzajarulas = true`).
2. **Megőrzési Idő és Automatikus Anonimizálás:**
   - Elutasított pályázó esetén – ha nem adott hozzájárulást a talent poolhoz – az önéletrajzot és személyes adatokat a kiválasztási folyamat lezárását követő 30 napon belül anonimizálni kell.
   - Talent pool esetén a megőrzési idő legfeljebb 1 év.
   - Az éjszakai felügyeleti cron (`/api/cron/nightly`) automatikusan maszkolja a személyes adatokat és eltávolítja a feltöltött önéletrajz fájlokat a lejáratkor.
3. **Elfeledtetéshez Való Jog (GDPR Törlés):**
   - A jelölt kérésére a HR munkatárs azonnali végleges törlést tud végrehajtani a `hr_toborzas` táblából és a csatolt CV fájlokból.
4. **Átadás Onboardingba:**
   - A felvett (`statusz = 'felveve'`) pályázókból egyetlen kattintással aktív dolgozói rekord (`hr_dolgozo_adatlap`) és beléptetési feladatlista (`hr_onboarding`) generálható.

---

## 3. Kapcsolódó Rendszerelemek
- Adatbázis táblák: `hr_allashirdetes`, `hr_toborzas`, `hr_onboarding`.
- Végpontok: `/api/hr/parse-cv`, `/api/cron/morning`, `/api/cron/nightly`.
- PRD: [P-013](../../product/decisions/P-013-hr-recruitment-ats-and-public-careers-portal-ux.md).
