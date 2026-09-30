# [Docs] P-006: Összetett Kereső, Mentett Profilok és Riasztások UX

**Status:** Decided  
**Date:** 2026-07-19 (Rögzítve: 2026-09-30)  
**Scope:** [Docs]
**Category:** Search / Analytics  
**Author:** Dani & ThinkAI  
**Kapcsolódó ADR:** [A-016](../../architecture/decisions/A-016-hungarian-unaccent-full-text-search-architecture.md)  
**Kapcsolódó Kód:** `src/app/search/page.tsx`, `src/app/search/actions.ts`, `supabase/migrations/20260719075925_mentett_kereses.sql`

---

## 1. Question / Felhasználói Igény
Gyakori használati eset, hogy a felhasználók visszatérően ugyanazokat a bonyolult szűrési feltételeket keresik (pl. "Összes 500e Ft feletti bejövő számla, ami a Pénzügyi osztályhoz tartozik és még nincs leiktatva").
Szükség van a keresési feltételek elmentésére, és automatikus figyelmeztetésre (alert), ha új találat érkezik.

---

## 2. Decision (A Meghozott Döntés)
1. **Egyesített Globális Parancsközpont és Kereső (`Ctrl + K` / Fejléc):**
   - A korábbi dedikált `/search` külön oldal kivezetésre került, helyét a jobb felső fejlécből és globális `Ctrl+K` gyorsbillentyűvel elérhető felugró kereső vette át.
   - Keresési paraméterek: szabadszavas szöveg, iktatószám, érkeztetési szám, partner neve, irat iránya, minősítés (`nyilt`/`bizalmas`), dátum (tól-ig).
   - Magyar ékezetfüggetlen FTS + hibrid szemantikus keresőmotor valós idejű szövegrészlet-kiemeléssel (`snippet`).
2. **Mentett Keresések (Profilok) közvetlenül a Modálból:**
   - A beállított feltételrendszer és kulcsszó közvetlenül a keresőablakból elmenthető névvel (pl. "Havi szerződések — Kovács Kft.").
   - A mentett keresések a kereső felső sávjában lévő "Mentettek" gombbal azonnal megtekinthetők, betölthetők és törölhetők.
3. **Alert Értesítési Beállítás és Egykattintásos Kezelés:**
   - A felhasználó bejelölheti a mentéskor: *"Értesítés küldése új irat érkezésekor"*.
   - A mentett profilok listájában a harang ikonra (`Bell` / `BellOff`) kattintva egyetlen mozdulattal aktiválható vagy leállítható a figyelés.
   - Amikor egy újonnan iktatott irat megfelel a profil feltételeinek, a rendszer belső értesítést (harang ikon) küld az érintettnek.

---

## 3. Rationale (Indoklás)
Megszünteti a repetitív szűrésekkel töltött időt, és proaktívan értesíti az ügyintézőket a számukra releváns iratok beérkezéséről.
