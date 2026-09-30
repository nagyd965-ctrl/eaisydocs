# [Docs] P-005: Iktatókönyv és Ügyirat Életciklus UX

**Status:** Decided  
**Date:** 2026-07-14 (Rögzítve: 2026-09-30)  
**Scope:** [Docs]
**Category:** Dossiers / Records Management  
**Author:** Dani & ThinkAI  
**Kapcsolódó ADR:** [A-006](../../architecture/decisions/A-006-gapless-filing-sequence-allocation.md), [A-010](../../architecture/decisions/A-010-pdfa-normalization-and-sha256-verification.md)  
**Kapcsolódó Kód:** `src/app/dossiers/page.tsx`, `src/app/dossiers/[id]/page.tsx`, `src/app/dossiers/dossiers-table-client.tsx`

---

## 1. Question / Felhasználói Igény
Az iktatókönyv a vállalat hivatalos iratnyilvántartása. A felhasználóknak gyorsan kell tudniuk szűrni állapotok, évek, felelősök és szervezeti egységek szerint, valamint az ügyirat adatlapján egyetlen helyen kell látniuk a bejövő és kimenő iratokat, válaszleveleket, feladatokat és az eseménynaplót.

---

## 2. Decision (A Meghozott Döntés)
1. **Iktatókönyvi Táblázat (`/dossiers`):**
   - Monospace iktatószámok, vizuális állapotjelzők (`Iktatva`, `Szignálva`, `Ügyintézés alatt`, `Lezárt`, `Irattárban`).
   - Sürgősségi színezés: ha a határidő 3 napon belül lejár, narancssárga; ha lejárt, vörös figyelmeztetés látható.
2. **Dosszié Munkalap (`/dossiers/[id]`):**
   - **Iratok füle:** Az ügyirathoz tartozó összes levél, számla és csatolmány időrendben, verziószámmal és letöltési/előnézeti lehetőséggel.
   - **Feladatok & Teendők:** Belső határidős feladatok hozzárendelése munkatársakhoz.
   - **Belső Kommunikáció:** Megjegyzések és jegyzetek rögzítése az ügyiraton (nem látható a partner számára).
   - **Eseménynapló:** Megtekintési, letöltési és módosítási idővonal.
   - **Fizikai Irattár Info:** Ha az iratnak van papír alapú példánya, a polc és doboz azonosítója megjelenik a fejlécben.

---

## 3. Rationale (Indoklás)
Egyetlen, tiszta adatlap biztosítja a teljes körű ügyintézést; minden releváns információ (digitális fájlok, fizikai tárolás, napló) egy pillantással átlátható.
