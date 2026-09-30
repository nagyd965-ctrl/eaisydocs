# [Docs] BRD-005: Fizikai Irattári Kölcsönzés és Leltári Felelősség

**Status:** Decided  
**Date:** 2026-09-29 (Auditálva: 2026-09-30)  
**Scope:** `[Docs]`  
**Category:** Physical Storage & Custody  
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `src/components/physical-location-dialog.tsx`, `src/app/dossiers/borrow-actions.ts`, `supabase/migrations/20260719065027_szignalas_kolcsonzes.sql`, `20260805000004_fix_fizikai_hely_rls.sql`

---

## 1. Üzleti Célkitűzés
A digitalizálás ellenére a papíralapú, eredeti példányok fizikai tárolása és kezelése törvényi kötelezettség. Biztosítani kell a fizikai irattárban (polc, doboz, mappa) lévő dokumentumok precíz helymeghatározását, a fizikai kölcsönzési folyamatot (Chain of Custody), a kölcsönzési határidők figyelését és az anyagi felelősség nyomon követhetőségét.

---

## 2. Üzleti Szabályok (Business Rules)
1. **Fizikai Helymeghatározás Kényszere (`irat_fizikai_hely` tábla):**
   - Minden papíralapú ügyirathoz rögzíthető a fizikai koordináta: `epulet`, `szoba`, `szekreny_polc`, `doboz`.
2. **Kölcsönzési Munkafolyamat (`irat_kolcsonzes_naplo` tábla):**
   - Fizikai iratot az ügyintézők kérhetnek ki indoklással és visszahozatali határidővel.
   - A kölcsönzés rögzíti a kölcsönvevő nevét (`kolcsonvevo_nev`), a kölcsönzés kezdetét (`kiadva_datum`), és a határidőt (`varhato_visszahozatal`).
3. **Kölcsönzési Határidő és Értesítés:**
   - Az éjszakai felügyeleti cron (`/api/cron/nightly`) ellenőrzi a lejárt és lejáró kölcsönzéseket, és automatikus figyelmeztetést küld a felelősöknek.
4. **Visszavétel és Lezárás:**
   - Visszavételkor az irattáros rögzíti a valós visszahozatali időt (`visszahozva_datum`).
   - A visszavétel ténye bekerül az `esemeny_naplo` táblába, megszüntetve a kölcsönvevő személyes felelősségét.

---

## 3. Kapcsolódó Rendszerelemek
- Táblák: `irat_fizikai_hely`, `irat_kolcsonzes_naplo`.
- Dialógus: `src/components/physical-location-dialog.tsx`, `src/components/borrow-dialog.tsx`.
- PRD: [P-007](../../product/decisions/P-007-physical-storage-and-borrowing-management-ux.md).
