# [Közös] A-007: Négy-Dimenziós RLS Jogosultsági Modell és Szerepkör Mátrix

**Status:** Decided  
**Date:** 2026-07-16 (Rögzítve: 2026-09-30)  
**Scope:** `[Közös]`  
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `supabase/migrations/20260714231019_rbac_schema_and_rls.sql`, `20260810000001_fix_docs_rls_role_column.sql`, `20260918000005_strict_confidential_rls.sql`, `20260920000002_fix_audit_findings_phase2.sql`

---

## 1. Context (Kontextus)
Az elektronikus iratkezelésben és a HR rendszerekben a jogosultságok nem kezelhetők egyszerű frontend oldali szűréssel:
- A bizalmas vagy szigorúan bizalmas iratokat (pl. orvosi alkalmassági lapok, vezetői szerződések, belső vizsgálatok) még a listázás szintjén sem láthatja az arra jogosulatlan munkatárs.
- Ha egy felhasználó közvetlen API hívást intéz a Supabase PostgREST felületére, a hozzáférés-szabályozásnak adatbázis szinten kell garantálnia az adatvédelmet.
- El kell kerülni az egymásra hivatkozó RLS szabályok végtelen rekurzióját (infinite recursion).

---

## 2. Decision (A Meghozott Döntés)
A hozzáférés-szabályozást **kizárólag PostgreSQL Row Level Security (RLS)** szabályokkal kényszerítjük ki az alábbi 4 dimenzió metszetében:

1. **Szerepkör (Role Dimenzió):**
   - Modulárisan szeparált szerepkör mezők a `felhasznalo_profil` táblában:
     - `docs_szerepkor`: `admin`, `iktato`, `vezeto`, `ugyintezo`, `betekinto`, `auditor`.
     - `hr_szerepkor`: `admin`, `hr_vezeto`, `hr_munkatars`, `reszlegvezeto`, `dolgozo`.
   - Az `admin` globális olvasási és írási joggal rendelkezik. Az `iktato` és `auditor` látja az iratokat (minősítési korlátig), míg az `ugyintezo` és `vezeto` a szervezeti egységére vagy kijelölésére korlátozott.
2. **Szervezeti Egység (Department Dimenzió):**
   - Az ügyintézők és osztályvezetők kizárólag a saját szervezeti egységükhöz tartozó ügyiratokat és iratokat látják (`ugyirat.szervezeti_egyseg_id = fp.szervezeti_egyseg_id`).
3. **Biztonsági Minősítés (Clearance Dimenzió):**
   - Négylépcsős biztonsági minősítés hierarchia: `nyilt` (1) < `belso` (2) < `bizalmas` (3) < `szigoruan_bizalmas` (4).
   - Minden felhasználó rendelkezik egy `max_minosites` értékkel a profiljában.
   - Szigorú feltétel: az irat minősítése nem haladhatja meg a felhasználó szintjét (`irat.minosites <= fp.max_minosites`), kivéve az `admin` szerepkört.
   - Ha egy ügyirat tartalmaz olyan iratot, ami meghaladja a felhasználó minősítését, az osztálytag sem láthatja az ügyiratot (`check_ugyirat_has_unauthorized_irat`).
4. **Explicit Hozzárendelés és Megosztás:**
   - Ügyiratszintű explicit megosztás a `ugyirat_hozzaferes` táblán keresztül (`check_ugyirat_user_access`).
   - Ha egy irat nem tartozik a felhasználandó osztályhoz, de a `ugyirat_hozzaferes` táblában explicit jogosultságot kapott, az irat láthatóvá válik számára (amennyiben a minősítési szintje megengedi).
5. **Security Definer Segédfüggvények (Rekurzió Védelem):**
   - `public.check_ugyirat_has_unauthorized_irat(p_ugyirat_id, p_max_minosites)`
   - `public.check_ugyirat_user_access(p_ugyirat_id, p_user_id, p_user_dept)`
   - `public.check_irat_fajl_access(p_irat_id, p_user_id, p_user_role, p_max_minosites, p_user_dept)`

---

## 3. Consequences (Következmények)
* **Pozitív:** Zero-trust adatbiztonság: még ha a frontend kód hibás is lenne, az adatbázis fizikailag nem ad vissza jogosulatlan sorokat.
* **Fegyelem:** Az RLS függvényeknek (`auth.uid()`, subquery-k) optimalizált indexeken kell futniuk a lassulások megelőzésére.
