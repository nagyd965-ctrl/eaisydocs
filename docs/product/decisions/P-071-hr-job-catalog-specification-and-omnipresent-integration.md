# P-071: [HR] Nyilvántartott Munkakörök Törzsadatai, Korszerű Szerkesztő és Rendszerszintű Integráció

- **Dátum:** 2026. október 12.
- **Státusz:** Elfogadva
- **Hatókör:** [HR] eaisyHR Felhasználói Élmény (UX), Munkaköri Profil, Dolgozói 360° Nézet, Önkiszolgáló Portál
- **Kapcsolódó döntések:** [P-043](P-043-global-ui-consistency-and-unified-components.md), [P-070](P-070-hr-organization-structural-separation-from-settings.md), [A-052](../../architecture/decisions/A-052-hr-job-catalog-specification-and-omnipresent-integration.md)

---

## 1. Felhasználói Igény és Célkitűzés

A felhasználói visszajelzés alapján a munkakörök nyilvántartása két fő problémával küzdött:
1. **Adatlap izoláltság és kényelmetlen szerkesztés:** A munkakör részletes adatlapján (`/hr/job/[id]`) nem volt szerkesztési lehetőség. A felhasználónak vissza kellett navigálnia az összesítő listába, ahol egy szűkös, alacsony minőségű modálban, ömlesztett szövegmezőkben kellett a feladatokat és kompetenciákat begépelnie.
2. **A munkaköri adatok nem köszöntek vissza sehol máshol:** Bár a munkakörhöz rögzítve voltak a feladatok, elvárt kompetenciák, védőeszközök és orvosi vizsgálatok, ezek sem a Dolgozó Adatlapján, sem a Dolgozói Önkiszolgáló felületen nem jelentek meg.

**A cél:** A munkaköri adatok prémium minőségűvé és közvetlenül szerkeszthetővé tétele, valamint ezeknek az adatoknak a szerves beépítése a dolgozói adatlapokba és a munkavállalói önkiszolgáló profilba.

## 2. Megvalósított UX Megoldások

### 2.1. Új Munkakör Szerkesztő Dialógus (`JobEditDialog`)
- **Tágas, Linear-flat kialakítás:** 720px széles, kényelmes felület Montserrat tipográfiával és diszkrét szegélyekkel.
- **3 Dedikált Fül:**
  1. *Alapadatok & Besorolás:* Megnevezés, KSH FEOR-08 kód segédszöveggel, Besorolási szint, Hozzárendelt szervezeti egység.
  2. *Feladatok & Kompetenciák:* Interaktív elemlistás feladatkezelő (sorszámozott tételek, Enterrel hozzáadás, törlés gomb) és dinamikus címke/chip alapú kompetencia hozzáadó.
  3. *Munkavédelem & Orvosi:* Kockázati besorolás, Kötelező egyéni védőeszköz (EVE) és Foglalkozás-egészségügyi vizsgálat gyakoriság.
- **Egységes elérés:** A szerkesztő gomb mind a Munkaköri Adatlap fejlécében, mind az "Alapadatok & Leírás" fülön, mind pedig a Munkakörök listájában (`/hr/organization?tab=jobs`) közvetlenül elérhető.

### 2.2. Munkaköri Profil a Dolgozó Adatlapján (`EmploymentTab`)
- A dolgozó adatlapján a "Munkaviszony és Jogviszony" fülön kiemelten megjelenik a betöltött munkakör és FEOR kód.
- Új, reprezentatív **"Munkaköri Profil és Követelmények"** kártya:
  - Felsorolja a dolgozóhoz tartozó hivatalos feladatokat és hatásköröket.
  - Kiemeli az elvárt kompetenciákat és a védőeszközöket (EVE).
  - Mutatja az orvosi alkalmassági vizsgálat típusát és gyakoriságát.
  - Egy kattintással megnyitható vagy letölthető a hatályos Munkaköri Leírás PDF (`PdfViewerDialog`).
  - Közvetlen ugrást biztosít a munkakör központi adatlapjára.

### 2.3. Munkaköri Átláthatóság az Önkiszolgáló Portálon (`/hr/self-service/profile`)
- A munkavállaló a saját profilján közvetlenül látja a pozíciójához rendelt feladatokat és a kötelezően viselendő védőeszközöket.
- Az elektronikus Munkaköri Leírás nyugtázási értesítőben mostantól egy közvetlen **"Átolvasás (PDF)"** gomb segítségével a dolgozó egyetlen kattintással meg tudja nézni a dokumentumot, mielőtt kattint a "Megismertem és elfogadom" gombra.

## 3. Üzleti és UX Előnyök

- **Kiemelkedő ergonómia:** Nincsenek szűk, egymásba folyó szövegdobozok; strukturált elemlisták segítik az adatrögzítést.
- **Munkavállalói transzparencia:** A dolgozók azonnal megértik és bármikor visszakereshetik a pontos feladatkörüket és védőeszköz igényüket.
- **Megfelelőség támogatása:** A HR-es és a munkavédelmi felelős egyetlen felületen ellenőrizheti, hogy az adott dolgozó pozíciójához milyen orvosi és védőeszköz követelmények tartoznak.
