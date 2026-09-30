# [HR] A-014: eaisyHR GDPR Adatmegőrzési és Automatikus Anonimizálási Cron

**Status:** Decided  
**Date:** 2026-07-28 (Rögzítve: 2026-09-30)  
**Scope:** `[HR]`  
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `src/app/api/cron/nightly/route.ts`, `supabase/migrations/20260721000001_eaisyhr_backend_core.sql`, `20260728000001_hr_gdpr_anonymization.sql`, `hr_toborzas` tábla

---

## 1. Context (Kontextus)
A toborzási folyamatban beérkező önéletrajzok személyes és esetenként különleges adatokat tartalmaznak.
A GDPR 5. cikk (1) e) pontja (korlátozott tárolhatóság elve) és a NAIH állásfoglalásai kimondják, hogy az elutasított pályázók adatait a kiválasztási folyamat lezárása után törölni kell, kivéve, ha a jelölt kifejezetten hozzájárult a későbbi megkeresésekhez (Talent Pool hozzájárulás, max. 12 hónap).

---

## 2. Decision (A Meghozott Döntés)
1. **Adatkezelési Időkorlátok a `hr_toborzas` Táblában:**
   - Minden pályázónál rögzítésre kerül az `adatkezelesi_hozzajarulas` és a `talent_pool_hozzajarulas` jelölő, valamint az utolsó aktivitás vagy elutasítás dátuma.
   - Normál elutasítás esetén a megőrzési idő max. 30 nap; Talent Pool esetén legfeljebb 1 év (365 nap).
2. **Időzített Éjszakai Felügyelet (`src/app/api/cron/nightly/route.ts`):**
   - Minden éjjel lefutó cron job átvizsgálja a `hr_toborzas` rekordjait.
   - Azon jelöltek esetén, akiknek a megőrzési határideje lejárt, automatikus anonimizálás történik: a nevet `Anonimizált Jelölt`-re, az e-mailt és telefonszámot maszkolt formátumra cseréli, és törli a Supabase Storage-ből a csatolt önéletrajz PDF-eket.
3. **Audit Naplózás:**
   - Az automatikus anonimizálás tényét a `hr_esemeny_naplo` rögzíti jogi megfelelőségi igazolás céljából.

---

## 3. Consequences (Következmények)
* **Pozitív:** 100%-os GDPR megfelelőség; bírságkockázat minimalizálása automatizált adattörléssel.
* **Adatvesztés:** Az anonimizált jelöltek adatai nem állíthatók vissza, a statisztikai számlálók (pl. mennyi jelentkező volt az adott állásra) azonban aggregált formában megmaradnak.
