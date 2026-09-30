# [Docs] BRD-001: Gap-mentes és Újrahasznosíthatatlan Iktatószám Allokáció

**Status:** Decided  
**Date:** 2026-09-29 (Auditálva: 2026-09-30)  
**Scope:** `[Docs]`  
**Category:** Legal Compliance / Records Management  
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `src/app/inbox/filing-actions.ts`, `supabase/migrations/20260714212708_iktatas_logic.sql`, `20260918000004_prefix_isolated_sequences.sql`

---

## 1. Üzleti és Jogi Háttér
A hatályos iratkezelési jogszabályok (különösen a tanúsított iratkezelő rendszereknél irányadó szabványok, pl. 335/2005. Korm. rendelet) kötelezően előírják:
1. Az iktatószámoknak szigorúan **folytonosnak és hézagmentesnek (gap-free)** kell lenniük egy adott naptári évben.
2. Egy kiadott iktatószám **soha többé nem használható fel újra**, még akkor sem, ha az ügyiratot később törlik vagy selejtezik.
3. Egyszerű PostgreSQL `SERIAL` vagy `IDENTITY` oszlop nem használható, mert egy visszagörgetett tranzakció (ROLLBACK) lyukat hagyna a sorszámozásban.

---

## 2. Üzleti Szabályok
1. Az iktatószám-kiosztás a zárolt `iktatoszam_allokacio` táblán alapul, amely prefixenként és évenként külön tartja nyilván az utolsó sorszámot.
2. Az iktatószám formátuma: `PREFIX/ÉV/SORSZÁM` (pl. `NYILV/2026/00001`, `IKT/2026/00042`, `HR/2026/00001`).
3. Az allokációt atomi PostgreSQL függvény (`generate_iktatoszam(p_ev, p_prefix)`) végzi.
4. Ha egy iktatott irat selejtezésre kerül, az iktatószám nem szűnik meg, hanem az ügyirat státusza `selejtezett`-té válik, megőrizve a sorszám folytonosságát az iktatókönyvben.
