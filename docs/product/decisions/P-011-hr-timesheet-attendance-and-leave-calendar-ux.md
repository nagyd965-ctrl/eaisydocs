# [HR] P-011: eaisyHR Jelenléti Ív, Munkaidő és Távolléti Naptár UX

**Status:** Decided  
**Date:** 2026-08-04 (Rögzítve: 2026-09-30)  
**Scope:** [HR]
**Category:** Time & Attendance UX  
**Author:** Dani & ThinkAI  
**Kapcsolódó ADR:** [A-013](../../architecture/decisions/A-013-hr-timesheet-overtime-holiday-calculation-engine.md)  
**Kapcsolódó Kód:** `src/app/hr/time/page.tsx`, `src/app/hr/self-service/time/page.tsx`, `src/app/hr/attendance-actions.ts`

---

## 1. Question / Felhasználói Igény
A munkaidő-nyilvántartásnak (jelenléti ívnek) mind a munkavállaló, mind a vezető, mind a bérszámfejtő igényeit ki kell elégítenie:
- A munkavállalónak egyszerűen kell tudnia rögzíteni a munkaidejét és beküldeni a szabadságkérelmét.
- A vezetőnek egy naptárban kell látnia, hogy a csapatából ki mikor van szabadságon, és egy kattintással jóvá kell hagynia az íveket.
- A bérszámfejtőnek összesített havi táblázat kell túlórabontással.

---

## 2. Decision (A Meghozott Döntés)
1. **Havi Munkaidő Mátrix (`/hr/time`):**
   - Havi naptárrács: napok szerint látható a ledolgozott óra, az elrendelt túlóra, és a távollét típusa (fizetett szabadság, betegszabadság, igazolt távollét).
   - Munkaszüneti napok és áthelyezett munkanapok automatikus színkiemelése.
2. **Dolgozói Rögzítés (`/hr/self-service/time`):**
   - Napi érkezési és távozási idő rögzítése, ebédidő automatikus levonásával.
   - Szabadságkérelem indítása indoklással és helyettes megjelölésével.
3. **Vezetői Jóváhagyási Munkafolyamat:**
   - Csoportos vagy egyéni havi jelenléti ív jóváhagyás. Jóváhagyás után az ív zárolttá válik.
4. **Digitális PDF Export és Archiválás:**
   - Hó végén egykattintásos PDF generálás, amely automatikusan archiválásra kerül az eaisyDocs-ba.

---

## 3. Rationale (Indoklás)
Átlátható, papírmentes munkaidő-gazdálkodás, amely garantálja a pontos bérszámfejtési alapokat és kiküszöböli a jelenléti ívek utólagos kézi javítgatását.
