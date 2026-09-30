# [Docs] BRD-002: Selejtezési Folyamat és Négyszem-Elv Szabályozása

**Status:** Decided  
**Date:** 2026-09-29 (Auditálva: 2026-09-30)  
**Scope:** `[Docs]`  
**Category:** Governance & Compliance  
**Author:** Dani & ThinkAI  
**Kapcsolódó ADR:** [A-001](../../architecture/decisions/A-001-four-eyes-disposal-validation.md)  
**Kapcsolódó PRD:** [P-002](../../product/decisions/P-002-archive-protocol-popover-ux.md)  
**Kapcsolódó Kód:** `src/app/archive/disposal-actions.ts`, `src/utils/disposal-protocol-pdf.ts`, `supabase/migrations/20260716000003_add_disposal_tables.sql`

---

## 1. Üzleti Szabályzat
A megőrzési idő lejárta után a dokumentumok nem törlődhetnek automatikusan a rendszerből. A fizikai és digitális megsemmisítés kizárólag szigorúan szabályozott eljárásban mehet végbe:

1. **Javaslattétel (Felterjesztés):**
   - Az irattáros a lejárt megőrzési idejű ügyiratokból selejtezési javaslatot állít össze a `selejtezes_csomag` és `selejtezes_tetel` táblákban.
2. **Független Ellenőrzés és Jóváhagyás (Négyszem-elv):**
   - A javaslatot felterjesztő személy (`javaslattevo_user_id`) adatbázis RLS szinten kizárt a jóváhagyásból (`auth.uid() != javaslattevo_user_id`).
   - A jóváhagyást kizárólag másik szervezeti vezető vagy cégvezető hajthatja végre (`jovahagyo_user_id = auth.uid()`).
3. **Jegyzőkönyvezés:**
   - A jóváhagyás pillanatában hitelesített, sorszámozott PDF Selejtezési Jegyzőkönyv készül (`src/utils/disposal-protocol-pdf.ts`), amely rögzíti a felterjesztő nevét, a jóváhagyó nevét, a selejtezés pontos időpontját és az érintett iktatószámok listáját.
4. **Megsemmisítés és Integritás:**
   - A csatolt fizikai fájlok törlésre kerülnek a Storage-ből, az irat hash-e és az esemény bekerül a megmásíthatatlan (append-only) `esemeny_naplo` táblába. Az iktatószám megsemmisített státusszal a rendszerben marad.
