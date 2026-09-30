# [Közös] A-011: Polimorf Entitáskapcsolatok és Keresztmodulos Gráf (`irat_kapcsolat`)

**Status:** Decided  
**Date:** 2026-07-25 (Rögzítve: 2026-09-30)  
**Scope:** `[Közös]`  
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `src/components/polymorphic-links-tab.tsx`, `src/app/dossiers/[id]/access-actions.ts`, `supabase/migrations/20260714183540_init_schema.sql`

---

## 1. Context (Kontextus)
Az iratokat számos különböző külső és belső üzleti objektumhoz kell tudni kapcsolni:
- Partnerekhez, szerződésekhez
- Számlákhoz, tranzakciókhoz (eaisyBill)
- Szállítólevelekhez, raktári átvételekhez (EasyWare)
- Munkavállalókhoz, jelenléti ívekhez (eaisyHR)
- Fuvarlevelekhez / CMR-ekhez (Szállítmányozás)
Ha az `irat` táblában minden lehetséges külső objektumnak külön oszlopot (`szamla_id`, `munkavallalo_id`, `cmr_id`) hoznánk létre merev Foreign Key kényszerekkel, a sémánk átláthatatlanná és merevvé válna, ráadásul szorosan összekapcsolná az önálló modulokat.

---

## 2. Decision (A Meghozott Döntés)
Egy univerzális, polimorf kapcsolótáblát valósítottunk meg: **`irat_kapcsolat`**.

### Táblastruktúra (Valós SQL Séma Alapján):
* `id`: UUID elsődleges kulcs.
* `irat_id`: UUID idegen kulcs az `irat(id)` táblára (`ON DELETE CASCADE`).
* `entitas_tipus`: `entitas_tipus` ENUM (`'partner'`, `'tranzakcio'`, `'folyamat'`, `'projekt'`, `'szerzodes'`, `'szamla'`).
* `entitas_id`: UUID azonosító a kapcsolódó rekordra.
* `entitas_forras`: `entitas_forras` ENUM (`'belso'`, `'erp'`, `'crm'`).
* `kapcsolat_tipusa`: `kapcsolat_tipus` ENUM (`'targya'`, `'melleklete'`, `'hivatkozas'`, `'elozmeny'`).
* `letrehozva`: TIMESTAMPTZ időbélyeg (`DEFAULT NOW()`).

---

## 3. Consequences (Következmények)
* **Pozitív:** Teljes moduláris szabadság: tetszőleges új ERP vagy szakmodul azonnal összeköthető az eaisyDocs irataival adatbázis séma-módosítás nélkül.
* **Konzisztencia:** Mivel nincs merev adatbázis szintű FK a külső modulok tábláira, a külső objektumok törlését az alkalmazás logikájának vagy triggereknek kell lekezelniük.
