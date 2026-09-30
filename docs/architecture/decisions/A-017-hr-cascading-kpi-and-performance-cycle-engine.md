# [HR] A-017: eaisyHR Kaszkádolt KPI és Teljesítményértékelési Ciklus Architektúra

**Status:** Decided  
**Date:** 2026-07-25 (Rögzítve: 2026-09-30)  
**Scope:** `[HR]`  
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `src/app/hr/performance/page.tsx`, `src/app/hr/performance/dashboard/page.tsx`, `src/components/hr/kpi-workflow-stepper.tsx`, `src/components/hr/manage-cycles-dialog.tsx`, `supabase/migrations/20260725000003_hr_kpi_katalogus.sql`, `20260725000004_hr_ciklusok.sql`, `20260804000001_hr_idp_modul.sql`

---

## 1. Context (Kontextus)
A modern HR működésben a célkitűzések (KPI, OKR) és a periodikus értékelési ciklusok (féléves, éves értékelések) szervesen összekapcsolódnak az egyéni képzési tervekkel (IDP).
Szükség van egy rugalmas katalógusra, ahonnan sabloncélok választhatók, strukturált értékelési ciklusokra határidőkkel és státuszokkal, valamint vezetői és önértékelési munkafolyamatra.

---

## 2. Decision (A Meghozott Döntés)
1. **Központi Célkatalógus (`hr_kpi_katalogus`):**
   - Vállalati szintű sablon KPI-k (megnevezés, leírás, mértékegység, súlyozás, kategória).
2. **Értékelési Ciklusok Állapotgépe (`hr_teljesitmeny_ciklus`):**
   - Ciklusok (pl. "2026 Q1", "2026 Éves Értékelés") kezelése: `tervezet -> aktiv -> lezart`.
   - Zárási határidők figyelése.
3. **Egyéni Teljesítményértékelések (`hr_teljesitmeny`):**
   - Dolgozónkénti értékelések: önértékelés (`onertelkezes_szoveg`, `onertelkezes_pont`), vezetői értékelés (`vezeto_ertekeles_szoveg`, `vezeto_pont`), konszenzusos végső pontszám.
4. **Egyéni Fejlesztési Terv (IDP Integráció):**
   - `hr_fejlesztesi_terv` és `hr_fejlesztesi_cel` táblák a hiányosságok fejlesztésére, mentorálási támogatással (`hr_idp_megjegyzes`).

---

## 3. Consequences (Következmények)
* **Pozitív:** Strukturált, auditált értékelési folyamat; közvetlen kapcsolat a munkakör, a célok és a karrierfejlődés között.
* **Üzletmenet:** A lezárt értékelések közvetlenül alapját képezhetik az év végi bónuszkifizetéseknek.
