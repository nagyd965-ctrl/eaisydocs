# [Docs] A-006: Gap-mentes Iktatószám Allokáció Tranzakciós Zárolással

**Status:** Decided  
**Date:** 2026-07-14 (Rögzítve: 2026-09-30)  
**Scope:** `[Docs]`  
**Author:** Dani & ThinkAI  
**Kapcsolódó BRD:** [BRD-001](../../business/decisions/001-gapless-filing-number-allocation.md)  
**Kapcsolódó Kód:** `src/app/inbox/filing-actions.ts`, `supabase/migrations/20260714212708_iktatas_logic.sql`, `20260918000004_prefix_isolated_sequences.sql`

---

## 1. Context (Kontextus)
Az iratkezelési jogszabályok előírják, hogy egy iktatókönyvön belül a sorszámoknak folytonosnak és hézagmentesnek (gap-free) kell lenniük.
Normál esetben az adatbázisok `SERIAL` vagy `IDENTITY` számlálót használnak, ám ha egy tranzakció sikertelen és `ROLLBACK`-el zárul, a lefoglalt sorszám elvész, ami lyukat eredményez a sorszámozásban.
Párhuzamos használat esetén (több iktató egyszerre iktat) pedig fennáll a versenyhelyzet (race condition) és sorszám-ütközés kockázata.

---

## 2. Decision (A Meghozott Döntés)
1. **Dedikált Számlálótábla és Tranzakciós Zárolás (`iktatoszam_allokacio`):**
   - Az allokáció az `iktatoszam_allokacio` táblán alapul, amelynek összetett elsődleges kulcsa: `(ev, prefix)`.
   - Sorszám generálásakor a `generate_iktatoszam(p_ev INTEGER, p_prefix TEXT)` Postgres tárolt eljárás (RPC) `INSERT ... ON CONFLICT (ev, prefix) DO UPDATE SET utolso_sorszam = iktatoszam_allokacio.utolso_sorszam + 1 RETURNING utolso_sorszam` zárolt atomi műveletet hajt végre.
   - A zárolás biztosítja, hogy a tranzakció lefutásáig más szál nem kaphatja meg ugyanazt a sorszámot, garantálva a szigorúan hézagmentes szekvenciát.
2. **Formátum és Prefix Elszigetelés (`20260918000004_prefix_isolated_sequences.sql`):**
   - A generált iktatószám formátuma: `v_clean_prefix || '/' || p_ev::TEXT || '/' || lpad(v_sorszam::TEXT, 5, '0')` (pl. `NYILV/2026/00001`, `IKT/2026/00042`, `HR/2026/00001`).
   - Különböző szervezeti egységek vagy iktatócsoportok egyedi prefixet használhatnak anélkül, hogy blokkolnák egymás számozási láncát.
   - Párhuzamosan az ügyekhez a `ugyszam_allokacio` tábla és a `generate_ugyszam(p_ev INTEGER, p_prefix TEXT)` függvény generál ügyszámot.
3. **Nem Újrahasznosítható Sorszámok:**
   - Ha egy iktatott ügyirat törlésre vagy selejtezésre kerül, az iktatószám nem szabadul fel és nem kerül visszaadásra: a rekord státusza `selejtezett`-té válik, de a sorszám örökre megőrződik az iktatókönyvben.

---

## 3. Consequences (Következmények)
* **Pozitív:** 100%-os jogi és tanúsítási megfelelőség; nincs sorszámduplikáció és nincsenek lyukak.
* **Kompromisszum:** Extrém magas párhuzamos iktatási terhelésnél a sorközi zárolás mikroszekundumos sorbanállást okoz, de a standard KKV és könyvelőirodai terhelésnél ez elhanyagolható késleltetést jelent.
