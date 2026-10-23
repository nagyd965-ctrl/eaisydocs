# [HR] ADR A-083: eaisyHR Párhuzamossági (Concurrency), Biztonsági és Adatintegritási Megerősítés

## Státusz
Elfogadva

## Dátum
2026-10-23

## Döntéshozók
eaisyHR Architektúra Csapat, Vezető Fejlesztő

## Kontextus és Problémafelvetés
A komplett eaisyHR program mélyreható átvilágítása és auditálása során több olyan kritikus hiba és kockázat került azonosításra, amelyek több felhasználó egyidejű párhuzamos használata esetén felléphetnek:
1. **API Letöltési Végpont (`/api/hr/download-document`):** Nem létező táblanévre (`hr_munkakor_verzio`) hivatkozott `hr_munkakor_leiras_verzio` helyett, emiatt normál munkavállalóknak minden munkaköri leírás letöltés 403 Forbidden hibát dobott.
2. **Szabadságkérelmek és Bérszámfejtés (`hr_tavollet`):** A dolgozói önkiszolgáló felületen a távollét mentésekor nem került átadásra a `company_id`. Ennek következtében a többvállalatos havi bérszámfejtő motor (amely cég szerint szűr) figyelmen kívül hagyta a jóváhagyott szabadságokat és 0 távolléti nappal kalkulált. Emellett hiányzott az azonos időszakra eső átfedő szabadságok szűrése.
3. **Munkaidő Rögzítés Versenyhelyzet (`hr_jelenlet`):** A `saveAttendanceRecord` nem-atomi select-then-insert logikát alkalmazott, ami gyors dupla kattintás vagy egyidejű terminálhasználat esetén PostgreSQL `23505 unique_violation` 500-as hibát eredményezett.
4. **Szerveroldali Jogosultsági Rések (`manager/actions.ts` és `cafeteria-actions.ts`):** A szabadság jóváhagyása és elutasítása, valamint a cafeteria keret beállítása nem rendelkezett elégséges szerveroldali szerepkör- és hierarchia-ellenőrzéssel.
5. **Adatbázis RLS és Helyettesítés:** A helyettesítési motor kijelölt helyettese az elavult UPDATE policy miatt nem tudta jóváhagyni a távollétet az adatbázisban, míg a korábbi migrációban teszt céllal megnyitott `hr_orvosi_vizsgalat` és `hr_fegyelmi` RLS szabályok súlyos GDPR kockázatot hordoztak.

## Döntések

### 1. Letöltési API Végpont Javítása
- Az `src/app/api/hr/download-document/route.ts` végponton a táblahivatkozás javításra került `hr_munkakor_leiras_verzio`-ra.

### 2. Távollétek Vállalati Kötése és Átfedés-validáció
- A `submitLeaveRequest` és `submitOvertimeRequest` távolléti rekord létrehozásakor kötelezően bejegyzésre kerül az aktív `company_id`.
- A kérelem benyújtása előtt lefut az átfedő, nem elutasított távollétek ellenőrzése, megakadályozva az egybeeső vagy duplikált igényeket.

### 3. Atomi Jelenlét (Munkaidő) Upsert
- A `saveAttendanceRecord` select-then-insert kódja helyett PostgreSQL natív atomi `upsert({ ... }, { onConflict: "dolgozo_id,datum" })` logikát alkalmazunk.

### 4. Szerveroldali Jogosultságok Szigorítása
- Az `approveLeaveRequest` és `rejectLeaveRequest` akciók ellenőrzik a közvetlen kijelölést (`aktualis_jovahagyo_id`), a vezetői alárendeltséget (`get_hr_subordinates`), illetve a HR/admin szerepkört (`hr_szerepkor`), kizárva az önjóváhagyást.
- A `submitCafeteriaDeclaration` ellenőrzi az éves keretösszeg túllépését, a `setCafeteriaBudget` és `reopenCafeteriaDeclaration` pedig kizárólag HR és admin szerepkörrel hívható meg.

### 5. Adatbázis RLS Megerősítés (Migráció 20261023000004)
- A `hr_tavollet` UPDATE szabály frissült: támogatja a kijelölt helyettest (`aktualis_jovahagyo_id`) és a `hr_szerepkor` mezőt vizsgálja.
- Az `hr_orvosi_vizsgalat`, `hr_fegyelmi` és `hr_elozo_munkahely` táblák megkapták a szigorú GDPR RLS védelmet (dolgozó csak a sajátját láthatja, módosítás kizárólag HR és szakági jogosultsággal lehetséges).

## Moduláris Függetlenség és eaisyDocs Határok
A módosítások kizárólag az eaisyHR modul fájljait és tábláit érintik (`hr_` előtag). Az eaisyDocs iratkezelő rendszer adatstruktúrája (`irat`, `ugyirat`, `partner`, stb.) és működése 100%-ban érintetlen maradt.

## Következmények és Eredmények
- Megszűnt a versenyhelyzetből adódó összeomlás munkaidő becsekkoláskor.
- A bérszámfejtés pontosan, hiánytalanul látja a jóváhagyott szabadságokat.
- A munkaköri leírások letöltése zökkenőmentesen működik valamennyi munkavállaló számára.
- A GDPR-köteles orvosi és fegyelmi adatok védelme helyreállt.
