# [Közös] P-001: Vezetői és Operatív Dashboard Recharts Statisztikákkal

**Status:** Decided  
**Date:** 2026-09-30  
**Scope:** [Közös]
**Category:** Dashboard / Analytics  
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `src/components/dashboard-overview.tsx`, `src/app/page.tsx`

---

## 1. Question / Problémafelvetés
A rendszer kezdőképernyője korábban csupán statikus kártyákat és egyszerű felsorolásokat jelenített meg. A vezetők és az ügyintézők nem kaptak azonnali vizuális képet az iratforgalom napi trendjéről, a különböző beérkezési csatornák (e-mail, szkenner, posta, eaisyBill) arányáról, valamint a sürgős határidőkről.

---

## 2. Decision (A Meghozott Döntés)
A főoldalt (`/`) egy teljesen újragondolt, modern vezetői/operatív műszerfallá alakítottuk:

1. **Dinamikus Időszak-szűrő:**
   - A fejléc alatt gombcsoporttal váltható: `Összes`, `Ma`, `7 nap`, `Hónap`, `Év`.
   - A szűrés kliensoldalon azonnal újrakalkulálja a KPI-kat és a csatornamegoszlást.
2. **Kiemelt KPI Kártyák:**
   - *Bejövő iratok:* Iktatásra várók számlálójával (Teal szín).
   - *Kritikus határidők:* 3 napon belüli és lejárt ügyek kiemelése (Rose szín).
   - *Aktív ügyiratok:* Összes folyamatban lévő ügy (Emerald zöld).
   - *Irattár & Selejtezés:* Lezárt és selejtezésre váró állomány (Kék).
3. **Recharts Vizuális Analitika:**
   - *7 napos forgalmi trend:* Területdiagram (AreaChart) sima görbével és Fintech Teal színátmenettel.
   - *Érkezési csatornák megoszlása:* Donut diagram (PieChart) százalékos bontással és jelmagyarázattal.
4. **Operatív Munkaterület:**
   - *Bal oldal:* Sürgős határidők visszaszámlálóval (pl. "Ma", "2 napja lejárt", "3 nap").
   - *Jobb oldal:* A bejelentkezett felhasználóra szignált teendők listája állapotjelző címkékkel.
5. **Gyorsindító gombok:**
   - Közvetlen "Új Érkeztetés" és "Szkenner" gombok a jobb felső sarokban.

---

## 3. Rationale (Indoklás)
Az átlátható, modern műszerfal azonnali orientációt nyújt a munkakezdéskor, felgyorsítja a napi feladatok elérését, és a vezetők számára azonnal bemutatható képet ad a vállalat iratkezelési aktivitásáról.
