# [Docs] P-007: Fizikai Irattár és Kölcsönzéskezelés UX

**Status:** Decided  
**Date:** 2026-07-19 (Rögzítve: 2026-09-30)  
**Scope:** [Docs]
**Category:** Physical Storage & Custody  
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `src/components/physical-location-dialog.tsx`, `src/app/dossiers/borrow-actions.ts`, `supabase/migrations/20260719065027_szignalas_kolcsonzes.sql`, `20260805000004_fix_fizikai_hely_rls.sql`

---

## 1. Question / Felhasználói Igény
A digitális iktatás mellett a vállalatoknál továbbra is keletkeznek eredeti papíralapú szerződések, hivatalos végzések és aláírt számlák.
Gyakori probléma, hogy nem tudni, a fizikai dosszié melyik szekrényben vagy dobozban van, illetve ha egy kolléga kikéri az iratot az irattárból, az gyakran elkeveredik.

---

## 2. Decision (A Meghozott Döntés)
1. **Fizikai Hely Mezők és Dialógus (`PhysicalLocationDialog`):**
   - Minden ügyiratnál rögzíthető a fizikai koordináta: `Épület`, `Helyiség`, `Polc / Szekrény`, `Dobozszám`.
   - Az adatlap fejlécében doboz ikonnal megjelenik a tárolási hely, így az irattáros másodpercek alatt megtalálja a fizikai mappát.
2. **Kölcsönzési Munkafolyamat (`borrow-actions.ts`):**
   - Ha egy munkatárs kikéri az eredeti iratot, az irattáros rögzíti: ki vette át, mikor és milyen visszahozatali határidővel.
   - Az ügyirat státusza `kikérve`-re vált, és a dosszié adatlapján piros figyelmeztetés jelzi, hogy a fizikai példány jelenleg nincs a helyén.
3. **Visszavételezés és Naplózás:**
   - Amikor az irat visszakerül a dobozba, egyetlen kattintással lezárható a kölcsönzés, és a naplóban rögzítésre kerül a visszavétel pontos ideje.

---

## 3. Rationale (Indoklás)
Zárt láncú fizikai példány-nyilvántartás (Chain of Custody), amely megszünteti az elveszett vagy asztalokon felejtett papíralapú akták problémáját.
