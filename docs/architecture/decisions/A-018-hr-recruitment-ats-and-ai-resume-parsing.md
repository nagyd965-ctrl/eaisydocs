# [HR] A-018: eaisyHR Toborzási ATS Csővezeték és AI Önéletrajz-Feldolgozás

**Status:** Decided  
**Date:** 2026-07-25 (Rögzítve: 2026-09-30)  
**Scope:** `[HR]`  
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `src/app/hr/recruitment/kanban-board.tsx`, `src/app/karrier/page.tsx`, `src/app/karrier/[id]/page.tsx`, `src/app/api/hr/parse-cv/route.ts`, `supabase/migrations/20260721000001_eaisyhr_backend_core.sql`, `20260725000007_hr_karrieroldal.sql`

---

## 1. Context (Kontextus)
A toborzás során a jelentkezők önéletrajzai sokszor e-mailben, PDF formátumban érkeznek, és az adatok (név, telefonszám, tapasztalat, végzettség) kézi rögzítése lassú.
Emellett a vállalatoknak szükségük van egy publikus karrierfelületre, ahol az állások közzétehetők, és ahonnan a jelentkezések közvetlenül bekerülnek a toborzási tölcsérbe (Applicant Tracking System - ATS).

---

## 2. Decision (A Meghozott Döntés)
1. **Publikus Karrierportál (`/karrier`, `/karrier/[id]`):**
   - Publikus, SEO-barát álláshirdetési aloldalak a `hr_allashirdetes` tábla alapján, ahová a jelöltek regisztráció nélkül feltölthetik adataikat és önéletrajzukat.
2. **ATS Állapotgép a `hr_toborzas` Táblában:**
   - Jelöltek életciklusa: `uj -> eloszurt -> interju -> ajanlat -> felveve -> elutasitva`.
   - Vizuális Kanban csővezeték (`src/app/hr/recruitment/kanban-board.tsx`).
3. **AI Önéletrajz Feldolgozó (Resume Parsing):**
   - A feltöltött PDF önéletrajzot a `/api/hr/parse-cv` végpont elemzi a Google GenAI SDK segítségével: kinyeri a jelölt nevét, e-mail címét, telefonszámát, korábbi pozícióit és strukturált képzettségeit.
   - Az adatok azonnal kitöltik a jelölt adatlapját, drasztikusan csökkentve a manuális adminisztrációt.
4. **Interjú SMS Értesítések:**
   - A reggeli cron (`/api/cron/morning`) a `sms_emlekezteto_kerve = true` jelölésű mai interjúkra automatikus Twilio SMS emlékeztetőt küld a jelölt mobiljára.
5. **Zökkenőmentes Átadás az Onboardingba:**
   - Ha a jelölt státusza `felveve` lesz, azonnal átvezethető az aktív munkavállalók közé (`hr_dolgozo_adatlap`), és elindítható a beléptetési folyamat (`hr_onboarding`).

---

## 3. Consequences (Következmények)
* **Pozitív:** Teljesen integrált toborzási folyamat; azonnali AI adatkinyerés, SMS interjú-emlékeztetők.
