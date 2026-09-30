# [Docs] BRD-004: Bizalmas és Nyílt Iratok Minősítési Szabályozása

**Status:** Decided  
**Date:** 2026-09-29 (Auditálva: 2026-09-30)  
**Scope:** `[Docs]`  
**Category:** Security / Information Governance  
**Author:** Dani & ThinkAI  
**Kapcsolódó ADR:** [A-007](../../architecture/decisions/A-007-four-dimensional-rbac-rls-security.md)  
**Kapcsolódó Kód:** `src/app/api/pdf/[id]/route.ts`, `supabase/migrations/20260918000005_strict_confidential_rls.sql`

---

## 1. Üzleti Célkitűzés
A vállalatoknál és könyvelőirodáknál keletkező iratok jelentős része védendő üzleti titkot, személyes vagy egészségügyi adatot tartalmaz (pl. orvosi igazolások, vezetői bérszerződések, belső vizsgálatok). A rendszernek garantálnia kell, hogy az alacsonyabb minősítésű jogosultsággal rendelkező munkatársak még a dokumentumok létezéséről se szerezzenek tudomást, a betekintők pedig kizárólag védett módon tekinthessenek be.

---

## 2. Üzleti Szabályok (Business Rules)
1. **Négyszintű Minősítési Skála (`irat_minosites`):**
   - `nyilt`: Bármely belső munkatárs által megtekinthető irat.
   - `belso`: Szervezeten belüli irat, külső félnek nem adható át.
   - `bizalmas`: Csak a kijelölt osztályvezetők és jogosult ügyintézők láthatják.
   - `szigoruan_bizalmas`: Kizárólag a cégvezetés és a kijelölt döntéshozók férhetnek hozzá.
2. **Felhasználói Minősítési Plafon (`felhasznalo_profil.max_minosites`):**
   - Minden felhasználóhoz kötelezően rögzítve van egy maximális minősítési szint.
   - Ha egy irat minősítése meghaladja a felhasználó plafonját (`irat.minosites > user.max_minosites`), az irat még az iktatókönyvi listázásban sem jelenhet meg (adatbázis RLS védelem).
3. **Ügyiratszintű Védelem:**
   - Ha egy ügyirat tartalmaz legalább egy olyan iratot, ami meghaladja a felhasználó minősítését, a felhasználó a teljes ügyirat megtekintéséből kizárásra kerül (`check_ugyirat_has_unauthorized_irat`).
4. **Vízjelezett Betekintés:**
   - Betekintő szerepkör vagy bizalmas minősítés esetén a PDF megjelenítő (`/api/pdf/[id]`) átlós, vörös vízjelet ("BIZALMAS / BETEKINTŐ") helyez el az összes oldalon a képernyőfotók és jogosulatlan továbbítás ellen.

---

## 3. Kapcsolódó Rendszerelemek
- Adatbázis mezők: `irat.minosites`, `felhasznalo_profil.max_minosites`.
- RLS Policy: 4D ABAC ellenőrzés a `check_ugyirat_user_access` és `check_irat_fajl_access` függvényekkel.
- Architektúra döntés: [A-007](../../architecture/decisions/A-007-four-dimensional-rbac-rls-security.md).
