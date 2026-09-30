# [Docs] A-003: eaisybill Érkezési Mód ENUM Bővítés és Számlaimport Migráció

**Status:** Decided  
**Date:** 2026-09-29  
**Scope:** [Docs]
**Author:** Dani & ThinkAI  
**Kapcsolódó Kód:** `src/app/inbox/eaisybill-actions.ts`, `supabase/migrations/20260929000001_add_eaisybill_channel.sql`, `src/components/dashboard-overview.tsx`

---

## 1. Context (Kontextus)
Az EaisyDocs és az eaisyBill számlázó/bérszámfejtő rendszer közötti integráció során a beérkező vagy kiállított számlák elektronikus iktatásra kerülnek. 
Korábban a PostgreSQL adatbázisban az `erkezes_modja` ENUM típus nem tartalmazott dedikált értéket az eaisyBill számára, ezért az importált számlák az általános `'rendszer'` érkezési móddal kerültek mentésre.

Ez az alábbi problémákat okozta:
1. Az iktatási listákban és a dashboard statisztikákban nem lehetett megkülönböztetni a belső kézi manuális érkeztetést az automatikus eaisyBill számlaimporttól.
2. Nem lehetett önálló forgalmi trendet és csatornaarányt kimutatni az ERP számlákra.

---

## 2. Decision (A Meghozott Döntés)
1. **Adatbázis ENUM Bővítés:**
   - Létrehoztunk egy dedikált migrációt (`20260929000001_add_eaisybill_channel.sql`):
     ```sql
     ALTER TYPE erkezes_modja ADD VALUE IF NOT EXISTS 'eaisybill';
     UPDATE irat
     SET erkezes_modja = 'eaisybill'
     WHERE kulso_forras = 'eaisybill'
       AND erkezes_modja = 'rendszer';
     ```
2. **Server Action Frissítés:**
   - A `src/app/inbox/eaisybill-actions.ts` modulban az `importInvoiceFromEaisyBill` funkció mostantól közvetlenül `erkezes_modja: "eaisybill"` értéket ír az adatbázisba.
3. **UI és Statisztikai Támogatás:**
   - A `DashboardOverview` és az érkeztetési nézetek megkapták az `"eaisyBill"` csatorna címkét és színkódot.

---

## 3. Consequences (Következmények)
* **Pozitív:** Pontos, tiszta statisztikák; a számlaimportok önálló csatornaként szűrhetők és követhetők.
* **Kockázat:** Adatbázis visszaállításakor biztosítani kell, hogy a migráció lefusson az új típusérték bejegyzéséhez.
