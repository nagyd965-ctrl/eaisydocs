# [HR] P-010: eaisyHR Munkavállalói Profil és Beosztás-történet UX

**Status:** Decided  
**Date:** 2026-07-22 (Rögzítve: 2026-09-30)  
**Scope:** [HR]
**Category:** HR / Employee Management  
**Author:** Dani & ThinkAI  
**Kapcsolódó ADR:** [A-012](../../architecture/decisions/A-012-hr-sensitive-data-rpc-encryption.md)  
**Kapcsolódó Kód:** `src/app/hr/employee/[id]/page.tsx`, `src/app/hr/employee/[id]/actions.ts`, `supabase/migrations/20260722000004_hr_dolgozo_tabs_tables.sql`, `20260724000002_beosztas_history.sql`

---

## 1. Question / Felhasználói Igény
A HR munkatársaknak és bérszámfejtőknek egy modern, tabos felületen kell átlátniuk a munkavállaló teljes életútját: alapadatok, szerződéses feltételek, beosztásváltozások, szabadság-egyenleg, orvosi alkalmasság és a titkosított személyi azonosítók.

---

## 2. Decision (A Meghozott Döntés)
A `/hr/employee/[id]` képernyőn egy átfogó, többfüles munkavállalói profilt valósítottunk meg:

1. **Fejléc:**
   - Avatar, név, beosztás, szervezeti egység, státusz badge (`Aktív`, `Távollévő`, `Felmondás alatt`).
2. **Fülek és Szekciók:**
   - **Áttekintés:** Munkaviszony kezdete, próbaidő vége, felettes vezető, közvetlen elérhetőségek.
   - **Beosztás és Történet (`BeosztasHistory`):** Előléptetések, munkakör-váltások és fizetésmódosítások időrendi naplója.
   - **Személyes és Adózási Adatok:** TAJ szám, adóazonosító jel, születési adatok, lakcím (szigorúan jogosultsághoz kötött megjelenítéssel).
   - **Szerződés & Munkajog:** Munkaidő mértéke (heti óra), bérforma, felmondási idő, határozott/határozatlan idő.
   - **Dokumentumok:** Munkaszerződés, orvosi alkalmassági lapok, adókedvezmény nyilatkozatok közvetlen linkje.

---

## 3. Rationale (Indoklás)
Megszünteti a papír alapú dolgozói kartonokat; a HR és a bérszámfejtés minden szükséges információt egyetlen auditált felületen ér el.
