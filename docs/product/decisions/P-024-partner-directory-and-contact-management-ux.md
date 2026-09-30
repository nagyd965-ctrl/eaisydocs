# P-024: [Docs] Partnertörzs és Kapcsolattartói Adatlap Megújított UX

> **Dátum:** 2026-09-30  
> **Státusz:** Decided  
> **Hatókör:** `[Docs]`  
> **Kapcsolódó ADR:** [A-024](../../architecture/decisions/A-024-partner-dual-classification-and-contacts-architecture.md)  
> **Érintett komponensek:** `src/app/partners/page.tsx`, `src/app/partners/partners-table-client.tsx`, `src/app/partners/[id]/page.tsx`, `src/components/partner-dialog.tsx`, `src/components/partner-contact-dialog.tsx`

---

## 1. Felhasználói Igény és Probléma
A korábbi Partner Lista és Adatlap felület minimalista volt: hiányoztak a felső összegző mutatószámok, a kimenő iratforgalom megtekintése, az aktív/inaktív szűrés, valamint a partnerekhez tartozó konkrét kapcsolattartó személyek nyilvántartása.

## 2. Megvalósított UX Elemek

### 2.1. Partner Lista (`/partners`)
1. **Felső KPI Statisztikai Kártyák (Linear Flat Grid):**
   - *Összes partner* (törzs mérete)
   - *Aktív partnerek* (százalékos aránnyal)
   - *Vevők / Szállítók / Hatóságok* megoszlása
   - *Élő iratforgalommal rendelkező partnerek* száma
2. **Gyors Szűrő Sáv (Quick Tabs):**
   - `[ Mind | Vevők | Szállítók | Hatóságok | Magánszemélyek | Inaktívak ]` számláló badge-ekkel.
3. **Táblázat fejlesztések:**
   - Székhely és székhely város megjelenítése a cégnév alatt.
   - Színkódolt szerepkör badge-ek (Teal = Vevő, Kék = Szállító, Lila = Hatóság).
   - Finom státuszjelző pont (zöld aktív, szürke inaktív).
   - Iratforgalmi pill számláló (`X irat`).

### 2.2. Partner Részletes Adatlap (`/partners/[id]`)
1. **Fejléc & Műveleti Központ:**
   - Cég neve, Jogi forma, Üzleti szerepkör, Aktív/Inaktív státusz toggle gomb.
   - Gyorsgombok: `Szerkesztés`, `+ Új Kapcsolattartó`, `+ Új Irat Érkeztetése` (partner nevével előkitöltve az iktatóban).
   - Belső ügyintézői megjegyzés kiemelt kártyán.
2. **4 Oszlopos Információs Panel:**
   - Azonosítók (Adószám, EU adószám, Cégjegyzékszám).
   - Elérhetőségek (Központi e-mail, telefon, weboldal, székhely).
   - Pénzügy & Fizetés (Bankszámlaszám, fizetési határidő, fizetési mód).
   - Iratforgalmi összegző (Összes, bejövő, kimenő iratok, csatolt ügyek).
3. **3 Részletes Fül:**
   - **Iratforgalom:** Egyetlen átlátható táblázatban a bejövő és kimenő iratok, irányjelző ikonokkal és ügyirat hivatkozásokkal.
   - **Kapcsolattartók:** Munkatársak listája beosztással, közvetlen `tel:` és `mailto:` linkekkel, elsődleges kapcsolattartó kiemeléssel, szerkesztési és törlési műveletekkel.
   - **Csatolt Ügyek:** Polimorf entitáskapcsolatok (`irat_kapcsolat`) listája.

### 2.3. Partner Dialógus (`PartnerDialog`)
- Kettős besorolás (Jogi forma + Üzleti szerepkör).
- 3 füles struktúra: Alapadatok, Pénzügy & Feltételek, Kapcsolattartó / Megjegyzés.
- Valós idejű duplikáció-figyelmeztetés gépelés közben az adószám vagy a cégnév egyezésekor.
