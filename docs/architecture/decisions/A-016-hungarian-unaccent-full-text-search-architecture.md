# [Docs] A-016: Magyar Ékezetfüggetlen Keresés és FTS Architektúra

**Status:** Decided  
**Date:** 2026-09-20 (Rögzítve: 2026-09-30)  
**Scope:** [Docs]
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `supabase/migrations/20260714223158_fts_search_triggers.sql`, `20260920000005_fix_hungarian_accent_search.sql`, `src/app/search/actions.ts`

---

## 1. Context (Kontextus)
Az iratkezelő rendszerekben a keresések 80%-a magyar szövegekre (iktatószám, ügyintéző neve, irat tárgya, partner neve) irányul.
Két kritikus probléma merült fel:
1. **Ékezetérzékenység:** Ha a felhasználó beírja, hogy *"szerzodes"*, a rendszernek meg kell találnia a *"szerződés"* szót is.
2. **Keresési teljesítmény:** A sima `ILIKE '%szó%'` lekérdezések teljes táblapásztázást (Full Table Scan) végeznek, ami több tízezer iratnál másodpercekig tartó lassulást okoz.

---

## 2. Decision (A Meghozott Döntés)
1. **PostgreSQL `unaccent` Kiterjesztés:**
   - Bekapcsoltuk az `unaccent` bővítményt, és létrehoztunk egy normalizáló segédfüggvényt, amely mind a tárolt szövegekből, mind a keresési kifejezésből eltávolítja a diakritikus jeleket az összehasonlítás előtt.
2. **Postgres FTS Triggerek és GIN Index:**
   - Létrehoztunk egy generált `tsvector` oszlopot (`kereses_vektor`) az `irat` és `ugyirat` táblákon, amely összekombinálja az iktatószámot, a tárgyat, a partner nevét és a kulcs metaadatokat.
   - Erre az oszlopra GIN (Generalized Inverted Index) index épül, ami ezredmásodperces válaszidőt nyújt nagyméretű adatbázisban is.

---

## 3. Consequences (Következmények)
* **Pozitív:** Villámgyors, ékezetfüggetlen keresési élmény a `/search` felületen.
