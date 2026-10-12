# A-052: [HR] Nyilvántartott Munkakörök Törzsadatai, Korszerű Szerkesztő és Rendszerszintű Integráció

- **Dátum:** 2026. október 12.
- **Státusz:** Elfogadva
- **Hatókör:** [HR] eaisyHR Munkaköri Rendszer, Dolgozói 360° Adatlap, Önkiszolgáló Portál
- **Kapcsolódó döntések:** [A-029](A-029-global-ui-consistency-and-unified-components.md), [A-039](A-039-hr-occupational-safety-compliance-matrix-architecture.md), [A-051](A-051-hr-organization-structural-separation-from-settings.md), [P-071](../product/decisions/P-071-hr-job-catalog-specification-and-omnipresent-integration.md)

---

## 1. Kontextus és Problémafelvetés

Az eaisyHR rendszerben a `hr_munkakor` tábla gazdag adatstruktúrával rendelkezett (FEOR kód, besorolási szint, feladatok és hatáskörök `jsonb` listája, elvárt kompetenciák `jsonb` listája, munkavédelmi kockázatok, egyéni védőeszköz (EVE) igény, kötelező orvosi vizsgálat típusa és gyakorisága hónapban, valamint csatolt verzionált munkaköri leírás dokumentumok a `hr_munkakor_leiras_verzio` táblában).

Ennek ellenére az adatok a rendszerben súlyosan elszigeteltek voltak:
1. **Adatlap izoláltság és szerkeszthetetlenség:** A részletes munkaköri adatlapon (`/hr/job/[id]`) nem volt szerkesztési lehetőség (100%-ban read-only volt). A felhasználó csak akkor tudta szerkeszteni az adatokat, ha visszament a listanézetbe (`/hr/organization?tab=jobs`), és a 3 pontos menüből megnyitott egy szűkös, `425px` széles modált, ahol a strukturált feladatok és kompetenciák nyers, sortöréses `textarea` mezőkbe voltak zsúfolva.
2. **Hiányzó integráció a Dolgozói Adatlapon (`/hr/employee/[id]`):** Bár a dolgozó beosztásához (`hr_beosztas`) hozzá volt rendelve a munkakör, a Dolgozói Adatlapon (a "Munkaviszony és Jogviszony" fülön) egyáltalán nem jelentek meg a feladatok, az elvárt kompetenciák, az előírt egyéni védőeszközök vagy az orvosi vizsgálati előírások, és nem volt közvetlen elérés a hivatalos Munkaköri Leírás PDF-hez sem.
3. **Hiányzó integráció az Önkiszolgáló Portálon (`/hr/self-service/profile`):** A munkavállaló nem láthatta részletezve a saját munkaköri felelősségeit és munkavédelmi felszereléseit, és a munkaköri leírás nyugtázási értesítőjében sem tudta közvetlenül megnyitni a csatolt dokumentumot.

## 2. Döntés és Architektúra

### 2.1. Kanonikus Munkakör Szerkesztő Komponens (`JobEditDialog`)
Létrehoztunk egy új, központi klienstári komponenst (`src/components/hr/job-edit-dialog.tsx`), amely tágas (`720px` széles), 3 tematikus fülre bontott felületen biztosítja a karbantartást:
- **Alapadatok & Besorolás:** Megnevezés, KSH FEOR-08 kód, Besorolási szint (Gyakornok, Junior, Medior, Senior, Vezető, Igazgató) és Szervezeti Egység hozzárendelés.
- **Feladatok & Kompetenciák Dinamikus Elemkezelő:**
  - Nyers textarea helyett interaktív, sorszámozott elemlista gyors hozzáadással és törléssel (`Trash2`), amely támogatja a több soros szöveg beillesztését is.
  - Elvárt kompetenciák és képzettségek badge/tag kezelővel (Enterre hozzáad, x-szel töröl).
- **Munkavédelem & Orvosi Előírások:** Kockázati besorolás, Kötelező egyéni védőeszköz (EVE) igény, Kötelező vizsgálat típusa és esedékességi gyakoriság (hónapban).

### 2.2. Kétirányú Elérés a Munkaköri Rendszerben
A `JobEditDialog` komponens közvetlenül elérhető:
- A Munkaköri Részletes Adatlap (`/hr/job/[id]`) fejlécéből és az "Alapadatok & Leírás" fülről.
- A Nyilvántartott Munkakörök központi listájának soraiból (`src/components/hr/job-action-menu.tsx`), teljesen kiváltva a korábbi szűkös dialógust.

### 2.3. Rendszerszintű Munkaköri Integráció a Dolgozói Profilban (`EmploymentTab`)
A dolgozói adatlap "Munkaviszony és Munkarend" nézetében egy új, dedikált **"Munkaköri Profil és Követelmények"** kártya került beépítésre:
- Megjeleníti az aktív munkakör megnevezését, FEOR kódját és szintjét.
- Strukturált rácsban listázza a munkakörhöz tartozó feladatokat és felelősségi köröket.
- Megjeleníti az elvárt kompetenciákat és a munkavédelmi előírásokat (kockázatok, EVE igény).
- Feltünteti a foglalkozás-egészségügyi alkalmassági vizsgálat típusát és gyakoriságát.
- Biztosítja a legfrissebb hivatalos Munkaköri Leírás dokumentum közvetlen PDF betekintését (`PdfViewerDialog`) és letöltését.
- Közvetlen navigációs hivatkozást nyújt a munkakör központi törzslapjára (`/hr/job/[id]`).

### 2.4. Önkiszolgáló Portál Integráció (`SelfServiceProfilePage`)
A dolgozó a saját önkiszolgáló felületén (`/hr/self-service/profile`):
- Dedikált kártyán megtekintheti a munkaköri feladatait, felelősségi köreit és a számára kötelező védőeszközöket.
- Az elektronikus nyugtázási figyelmeztetésnél (`JobDescriptionAcknowledgment`) közvetlenül megnyithatja és átolvashatja a verzionált PDF munkaköri leírást még az elfogadás előtt.

## 3. Következmények és Előnyök

- **Megszűnt a funkcionális elszigeteltség:** A munkakörök nem pusztán adminisztratív címkék a beállításokban, hanem a dolgozók mindennapi feladatainak, biztonságának és jogi kötelezettségeinek valós alapjai.
- **Transzparencia a dolgozók számára:** A munkavállaló pontosan látja, hogy a cég milyen feladatokat vár el tőle, és milyen munkavédelmi felszereléseket köteles használni.
- **Audit- és jogbiztonság:** A munkaköri leírások és azok digitális nyugtázása közvetlenül összekapcsolódik a feltöltött PDF verziókkal.
- **100% Típusbiztonság:** A módosítások a Next.js 15 és TypeScript szigorú típusellenőrzése mellett hiba nélkül fordulnak (`npx tsc --noEmit: 0 hiba`).
