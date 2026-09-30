# [Docs] P-002: Selejtezési Jegyzőkönyv Iktatószám Badge és Popover Részletező

**Status:** Decided  
**Date:** 2026-09-29  
**Scope:** [Docs]
**Category:** Archive / UI  
**Author:** Dani & ThinkAI  
**Kapcsolódó ADR:** [A-001](../../architecture/decisions/A-001-four-eyes-disposal-validation.md)  
**Kapcsolódó Kód:** `src/components/archive-client.tsx`, `src/app/archive/page.tsx`

---

## 1. Question / Problémafelvetés
A selejtezési jegyzőkönyvek táblázatában korábban nem látszott egyértelműen, hogy egy adott megsemmisítési jegyzőkönyv pontosan mely iktatószámokat és mennyi iratot fed le. Egy több tételből álló jegyzőkönyvnél a felhasználónak külön kellett kinyitnia a PDF-et, hogy ellenőrizze az érintett ügyeket.

---

## 2. Decision (A Meghozott Döntés)
1. **Intelligens Iktatószám Megjelenítés:**
   - 1 érintett ügyirat esetén: tisztán olvasható, monospace fonttal szedett iktatószám.
   - Több ügyirat esetén: kompakt, jól elkülönülő `Badge` címkék listája.
2. **Kattintható Érintett Iratok Popover:**
   - A jegyzőkönyv sorában lévő darabszámra (pl. "5 db") kattintva egy lebegő felugró ablak (Popover) nyílik meg.
   - A Popover tételesen felsorolja az összes érintett ügyiratot:
     - Iktatószám (monospace)
     - Ügy tárgya
     - Csatolt iratok darabszáma ügyiratonként.
3. **Folyamatjelzés Jóváhagyáskor:**
   - A jóváhagyási modálban a PDF kiállítás és archiválás közben gomb-letiltás és forgó spinner jelzi a folyamatot, megelőzve a véletlen többszöri rákattintást.

---

## 3. Rationale (Indoklás)
Jelentősen csökkenti az adminisztrációs terhet: az irattáros és a vezető közvetlenül a táblázatból azonnal ellenőrizheti a jegyzőkönyv tartalmát anélkül, hogy le kellene töltenie a PDF fájlt.
