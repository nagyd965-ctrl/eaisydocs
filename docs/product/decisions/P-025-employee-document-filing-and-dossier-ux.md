# [HR] P-025: Munkavállalói Hivatalos Dokumentumok Iktatása és Személyi Dosszié UX

> **Dátum:** 2026-09-30  
> **Státusz:** Decided  
> **Hatókör:** `[HR]` / `[Docs]`  
> **Kapcsolódó ADR:** [A-026](../../architecture/decisions/A-026-employee-personal-dossier-and-hr-filing-bridge.md)  
> **Érintett fájlok:** `src/app/hr/employee/[id]/page.tsx`, `src/components/hr/file-hr-document-dialog.tsx`

---

## 1. Felhasználói Élmény és Célkitűzés
A HR munkatársak számára transzparens, azonnali áttekintést kell biztosítani a dolgozói adatlapon arról, hogy az egyes dokumentumok (szerződések, nyilatkozatok, orvosi leletek) csupán belső munkaközi vázlatok, vagy már hivatalosan le vannak iktatva az eaisyDocs központi rendszerébe.

A cél: egykattintásos, előtöltött iktatási folyamat, amely leveszi a felhasználó válláról a dossziényitás és iktatószám-kiosztás terhét.

---

## 2. Megjelenés a Dolgozó Adatlapján (`/hr/employee/[id]`)

A **„Munkaviszony & Szerződések”** fül alatt található **„Hivatalos Dokumentumok”** szekció kibővül:

1. **Dokumentum Állapotjelvények:**
   - 🟢 **Iktatva:** Zöld badge az eaisyDocs iktatószámmal (pl. `HR/2026/000001/2`), kattintható linkkel, amely közvetlenül megnyitja a hivatalos irat adatlapját.
   - ⚪ **Belső vázlat:** Szürke badge, amely jelzi, hogy a dokumentum még nem kapott hivatalos iratkezelési bejegyzést.

2. **Műveleti Gombok a Kártyán:**
   - `Előnézet` (meglévő PDF nézőke)
   - `Iktatás eaisyDocs-ba` (amennyiben még nincs iktatva): Megnyitja a célszerszám modált.
   - `Törlés` (csak belső vázlat esetén, iktatott irat törlése a törvényi szabályok szerint szigorúan tiltott).

---

## 3. Az „Iktatás eaisyDocs-ba” Dialógus (`FileHrDocumentDialog`)

A modál automatikusan előkészíti az iktatást:
- **Dolgozó:** Dolgozó neve és munkaköre (csak olvasható összegzés).
- **Irat tárgya:** Előtöltve a dokumentum nevével (pl. `Munkaszerződés - Kovács János`), szerkeszthető.
- **Cél Dosszié:**
  - Ha létezik: *„Kovács János személyi dossziéja (HR/2026/000001)”* megjelenítése zöld jelzéssel.
  - Ha új: *„Új személyi dosszié automatikus létrehozása (HR/2026/...)”* kék jelzéssel.
- **Irattári megőrzési tétel:** Automatikus javaslat: `3.1 - HR és Munkaügyi dokumentumok` (50 év megőrzési idő, nem selejtezhető).
- **Biztonsági besorolás:** Automatikusan `Bizalmas` (személyes adatok védelme).
- **Gomb:** `Hivatalos Iktatás Végrehajtása` – töltő animációval, a mentés után a dolgozó adatlapja automatikusan frissül az új iktatószámmal.

---

## 4. Egygombos Kötegelt Iktatás (`BatchFileHrDocumentsDialog`)

A HR munkatársak hatékonyságának maximalizálására megvalósítottuk a személyi dosszié „telibe áthúzását” / kötegelt iktatását:
- **Dinamikus Fejléc Gomb:** Amennyiben az adott dolgozónak van legalább 1 iktatatlan belső vázlata, a „Hivatalos Dokumentumok” fejlécében automatikusan megjelenik az **„Összes vázlat iktatása ({darabszám})”** kiemelt műveleti gomb.
- **Áttekintő Dialógus:**
  - Összegzi az érintett dokumentumokat (címek, kategóriák, tervezett sorszámok).
  - Megjeleníti a cél személyi dossziét (új dosszié nyitása vagy meglévő folytatása).
  - Tájékoztat az 50 éves megőrzésről és a törlési tilalom életbe lépéséről.
- **Egyidejű Tranzakció:** Egyetlen kattintással végigmegy az összes vázlaton, sorban kiosztja a gap-mentes alszámokat (`.../1`, `.../2`, stb.), rögzíti az iratokat, fájlokat, kapcsolatokat és audit naplókat.

