# [Közös] A-005: eaisyDocs és eaisyHR Moduláris Függetlensége Közös Adatbázison

**Status:** Decided  
**Date:** 2026-09-29  
**Scope:** [Közös]
**Author:** Dani & ThinkAI  
**Kapcsolódó Szabály:** `.agents/AGENTS.md`  
**Kapcsolódó Kód:** `src/app/hr/*`, `supabase/migrations/20260724000001_hr_architecture_refactor.sql`

---

## 1. Context (Kontextus)
Az eaisyDocs (elektronikus iratkezelő) és az eaisyHR (munkaügyi és jelenléti rendszer) két külön termékként kerül értékesítésre.
Egyes ügyfelek csak az eaisyDocs-ot vásárolják meg, mások csak az eaisyHR-t, megint mások pedig a kettőt együtt, integrálva.
A két rendszer közös PostgreSQL / Supabase infrastruktúrán fut.

Kritikus architektúrális veszélyforrás:
Ha a két modul kódja vagy adatbázis-lekérdezései szorosan összekapcsolódnak (tight coupling), akkor az egyik modul hiánya vagy kikapcsolása a másik modul összeomlását okozhatja.

---

## 2. Decision (A Meghozott Döntés)
1. **Független Adatbázis Nézetek és Oszlopok:**
   - Egyik modul funkciója vagy adatbázis-lekérdezése sem omolhat össze amiatt, ha a másik modul nincs aktiválva, vagy annak specifikus táblái/adatai hiányoznak.
2. **Szeparált Jogosultságkezelés:**
   - A jogosultságokat (`szerepkor` az alaprendszerben vs `docs_szerepkor` / `hr_szerepkor`) szeparáltan kezeljük. Egy felhasználó lehet Admin a Docs-ban, de csupán Betekintő a HR-ben.
3. **Polimorf Kapcsolati Tábla (`irat_kapcsolat`):**
   - Az iratok és HR entitások (dolgozók, jelenléti ívek) közötti kapcsolatokat nem merev idegen kulcsokkal (Foreign Key) kényszerítjük ki az `irat` táblában, hanem az `irat_kapcsolat` kapcsolótáblán keresztül (`entitas_tipus = 'munkavallalo'`, `entitas_id = '...'`).
   - Ha a HR modul inaktív, az eaisyDocs zavartalanul működik tovább, a nem létező HR kapcsolatok egyszerűen üres listát adnak.

---

## 3. Consequences (Következmények)
* **Pozitív:** Teljes üzleti rugalmasság (külön-külön és együtt is eladható a két szoftver).
* **Fegyelem:** Tilos közvetlen JOIN-t építeni az alapvető iratkezelési lekérdezésekbe a HR táblákra feltételes védelem vagy lazán csatolt reláció nélkül.
