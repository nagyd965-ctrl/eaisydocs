# P-039: [HR] Pre-Onboarding Munkaköri Leírás, NAV T1041 Adatlap & Mt. 46. § Írásbeli Tájékoztató Generátor UX

**Dátum:** 2026-10-01  
**Hatókör:** `[HR]`  
**Státusz:** `ELFOGADVA / IMPLEMENTÁLVA`  
**Kapcsolódó döntések:** [P-015: Onboarding és offboarding checklist](./P-015-hr-onboarding-offboarding-checklist-ux.md), [P-034: Megújított Onboarding Folyamat](./P-034-onboarding-lifecycle-redesign-and-activation-ux.md), [P-037: Munkaszerződés Generátor és Iktatás](./P-037-onboarding-employment-contract-generator-and-filing-ux.md), [P-038: Munkakör és Szervezeti Egység Katalógus](./P-038-onboarding-dynamic-job-and-org-unit-catalog-selector-ux.md)  
**Kapcsolódó ADR-ek:** [A-026: Személyi Dosszié Híd](../../architecture/decisions/A-026-employee-personal-dossier-and-hr-filing-bridge.md), [A-027: Pre-onboarding Munkakör és T1041 Híd](../../architecture/decisions/A-027-pre-onboarding-filing-and-t1041-bridge.md)  
**Érintett komponensek:** `src/components/hr/t1041-panel.tsx`, `src/components/hr/job-description-panel.tsx`, `src/components/hr/employment-contract-panel.tsx`, `src/components/hr/onboarding-profile-modal.tsx`, `src/app/hr/actions/t1041-actions.ts`, `src/app/hr/actions/onboarding-job-actions.ts`

---

## 1. Háttér és Célkitűzés

A munkaügyi megfelelőség (Art. 22. §, Mt. 45. § (4), Mt. 46. §) megköveteli, hogy egy új munkavállaló beléptetésekor:
1. A NAV T1041 bejelentés határidőben, a munkakezdés előtt megtörténjen és a hatósági igazolás (nyugta) megőrzésre kerüljön.
2. A munkavállaló a munkaszerződés mellett részletes, aláírt munkaköri leírást kapjon feladataival és felelősségeivel.
3. A munkáltató írásbeli tájékoztatót adjon át az Mt. 46. § szerinti kötelező tartalmi elemekről (munkaidő-beosztás, pihenőnapok, bérfizetés módja, felmondási idők, NAV adatszolgáltatás).

Korábban az Onboarding folyamatban a munkaköri leírás generálása csak az aktív dolgozói adatlapon (`/hr/employee/[id]`) volt elérhető, vagyis pre-onboarding fázisban nem lehetett előkészíteni a dokumentumot, holott a szerződéssel egy időben kell átadni. A T1041 bejelentés pedig nem rendelkezett hivatalos A4-es adatlap PDF generátorral és ÁNYK másolási segédlettel.

---

## 2. Megvalósított UX és Funkcionalitás

### A) NAV T1041 Bejelentési Panel (`T1041Panel`)
- **Státusz Banner & Dinamikus Jogszabályi Záradék:** 
  - Világos jelzés a bejelentés állapotáról (Várakozik / Beküldve / Hatóságilag Igazolva / Iktatva).
  - A bejelentés típusának megfelelő határidős tájékoztató:
    - `U` (Új bejelentés): munkába állás első napján a munka megkezdése előtt.
    - `V` (Változás) és `T` (Megszűnés / Törlés): a bekövetkezést / hatálybalépést követő **8 napon belül** (Art. 22. §, 1. melléklet 3. pontja).
- **Dinamikusan Alkalmazkodó Űrlapmezők:**
  - `U` (Új jogviszony): Jogviszony kezdete, Heti munkaidő, Munkakör / FEOR kód.
  - `V` (Változás bejelentése):
    - *Változás jellege:* Munkaidő változás (pl. részmunkaidő), Munkakör / FEOR módosulás, Biztosítás szünetelése (fizetés nélküli szabi), Személyes adatok, Egyéb szerződésmódosítás.
    - *Változás időpontja (hatálya):* NAV 13-as pótlap 7. rovat (Kiemelt, kötelező).
    - *Eredeti jogviszony kezdete:* NAV 13-as pótlap 3. rovat (Kötelező azonosító rovat).
    - *Új adatok:* Új heti munkaidő, Új munkakör és FEOR kód.
  - `T` (Biztosítási jogviszony törlése / Megszűnés / Kijelentés):
    - *Jogviszony vége (Megszűnés napja):* NAV 13-as pótlap 4. rovat (Kiemelt, kötelező).
    - *Jogviszony kezdete:* Opcionális azonosító rovat.
- **Egykattintásos ÁNYK / ONYA Kimásolás:**
  - A fejlécbe integrált kényelmes gomb segítségével az összes hatósági adat (Cég adószáma, Biztosított adatai, Jogviszony kódja, Kezdete / Vége / Változás napja, FEOR kód, Heti munkaidő) egyben formázva a vágólapra kerül az ÁNYK / ONYA kitöltéséhez.
- **Hivatalos Nyomtatvány (A4 PDF):**
  - Puppeteer motorral generált hiteles NAV T1041 Adatlap, típusnak (`U`/`V`/`T`) megfelelő III. fejezettel és ÁNYK 13-as pótlap rovatsegédlettel, céges pecséttel és jogszabályi hivatkozásokkal.
- **NAV Nyugta Csatolása és Feladat Pipa:**
  - A NAV által visszaküldött `.pdf` igazolás / nyugta közvetlenül feltölthető, ami automatikusan elvégzettnek jelöli a checklist feladatot mind Onboarding, mind Offboarding esetén.

### B) Hivatalos Munkaköri Leírás Panel (`JobDescriptionPanel`)
- **3 rugalmas előkészítési mód:**
  1. *Központi Katalógus Verzió kiválasztása:* A jóváhagyott céges munkaköri katalógus aktuális verziójának hozzárendelése.
  2. *Dinamikus A4 PDF Generálás:* A munkavállaló adataival és a pozícióhoz tartozó feladatokkal, kompetenciákkal generált hivatalos nyomtatvány.
  3. *Aláírt / Egyedi PDF feltöltése:* Kézzel aláírt, beszkennelt PDF csatolása.
- **Előnézet és Letöltés:** Beépített PDF előnézeti és letöltési lehetőség.

### C) Mt. 46. § Munkáltatói Írásbeli Tájékoztató (`EmploymentContractPanel`)
- A munkaszerződés panelbe integrált generátor gomb, amely a szerződés adataiból legenerálja az Mt. 46. § (1) bekezdés mind a 9 törvényi pontját tartalmazó hivatalos tájékoztatót.

### D) Intelligens Modál Navigáció és eaisyDocs Iktatási Híd
- Az `OnboardingProfileModal` fejlécében közvetlen gyorsgombok és állapotjelvények navigálnak a szerződéshez, a munkaköri leíráshoz és a T1041 bejelentéshez.
- A checklist feladatok mellett interaktív akciógombokkal (`[ T1041 bejelentés ]`, `[ Munkaköri leírás ]`) közvetlenül megnyitható az adott szakasz.
- **Aktiváláskori Auto-Iktatás:** A fiók aktiválásakor az eaisyDocs személyi dossziéba automatikusan beiktatásra kerül:
  - Munkaköri leírás az `1.1 - Munkaköri leírások` tétel alá.
  - T1041 adatlap és igazolás az `1.3 - Hatósági bejelentések` tétel alá.
