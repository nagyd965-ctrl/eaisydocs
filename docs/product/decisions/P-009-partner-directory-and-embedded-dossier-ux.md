# [Docs] P-009: Partnertörzs és Beágyazható Partner-Dosszié UX

**Status:** Decided  
**Date:** 2026-08-28 (Rögzítve: 2026-09-30)  
**Scope:** [Docs]
**Category:** Partners / Integration  
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `src/app/partners/page.tsx`, `src/app/partners/[id]/page.tsx`, `src/app/embed/partner-dossiers/page.tsx`, `src/app/partners/actions.ts`

---

## 1. Question / Felhasználói Igény
A partnerek (vevők, beszállítók, alvállalkozók) esetén elengedhetetlen, hogy egyetlen kattintással elérhető legyen az adott céghez tartozó összes irat, szerződés és számla.
Emellett igény merült fel arra, hogy a külső rendszerek (pl. eaisyBill partnerlapja) be tudják ágyazni (iframe formájában) az adott partner eaisyDocs dossziéját.

---

## 2. Decision (A Meghozott Döntés)
1. **Partner Lista és Szűrők (`/partners`):**
   - Vevő / Szállító / Hatóság típusjelölők, adószám, székhely, közvetlen telefon- és e-mail kapcsolat.
2. **Partner 360° Adatlap (`/partners/[id]`):**
   - Alapadatok szerkesztése, duplikációvédelem adószám és cégjegyzékszám alapján.
   - Kapcsolódó ügyiratok és iratok tabos listája, közvetlen megnyitási linkkel.
3. **Beágyazható Nézet (`/embed/partner-dossiers`):**
   - Letisztult, fejléc és oldalsáv nélküli beágyazható nézet, amely `?partner_id=...` paraméter alapján biztonságos tokennel képes megjelenni az eaisyBill vagy más ERP partnerlapján.

---

## 3. Rationale (Indoklás)
Összekapcsolja a számlázást és az iratkezelést; a pénzügyi munkatársnak nem kell elhagynia a számlázó felületét, ha egy partner korábbi szerződéseit szeretné ellenőrizni.
