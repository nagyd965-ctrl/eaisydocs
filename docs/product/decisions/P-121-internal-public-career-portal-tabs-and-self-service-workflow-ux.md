# P-121: [HR] Integrált Belső/Publikus Karrieroldal Fülválasztó, Előtöltött Belső Pályázás, Háromállású Hirdetés-kapcsoló és Önkiszolgáló Kérelemkezelés UX

**Status:** Decided  
**Date:** 2026-10-28  
**Scope:** `[HR]`  
**Category:** `HR / Career Portal, Recruitment, Self-Service Time & Goals UX`  
**Author:** Antigravity  
**Kapcsolódó ADR:** [A-088](../../architecture/decisions/A-088-internal-career-portal-auth-and-self-service-request-lifecycle.md)  
**Kapcsolódó Kód:** `src/components/hr/career-portal-client.tsx`, `src/app/karrier/page.tsx`, `src/app/karrier/[id]/page.tsx`, `src/app/karrier/[id]/application-form.tsx`, `src/components/hr/internal-career-view.tsx`, `src/components/hr/job-postings-list.tsx`, `src/components/hr/manage-posting-dialog.tsx`, `src/components/hr/leave-history-list.tsx`, `src/components/hr/employee-kpi-card.tsx`  

---

## 1. Question / Problémafelvetés

1. **Belső álláspályázat és pozíciórészletek áttekinthetősége:** A `/hr/self-service/career` oldalon a helyben felugró szűk pályázási ablak nem mutatta meg a pozíció részletes leírását, feladatait, elvárt kompetenciáit és bérsávját. A felhasználói igény az volt, hogy a „Pályázás” gomb vigye át a dolgozót a részletes karrieroldalra (`/karrier`), ahol alapértelmezetten a **„Belső hirdetések”** látszanak, de a dolgozó szabadon válthat a **„Belső hirdetések”** és a **„Publikus hirdetések”** között, miközben a külső látogatók („sima emberek”) egyáltalán nem láthatják a belső hirdetések fület.
2. **Hirdetés-láthatóság gyors kezelése (`/hr/recruitment`):** A „Csak Belső Hirdetés” kapcsoló a szerkesztő modál (`ManagePostingDialog`) alján volt elrejtve. Sokkal átláthatóbb, ha közvetlenül a hirdetéskártyák jobb oldalán, az **Aktív** és **Publikus** kapcsolók mellett egy **Belső** kapcsolóval állítható.
3. **Önkiszolgáló jelenléti kérelmek és célkitűzés kártyák:** A dolgozók nem látták az elutasított szabadság-/túlóra-kérelmek indoklását, nem tudták visszavonni a még elbírálás alatt álló kérelmeiket, a célkitűzés kártyák (`EmployeeKpiCard`) alján pedig egy felesleges másodlagos kommentmező foglalta a helyet.

---

## 2. Decision (A Meghozott Döntés)

### 2.1. Integrált Belső és Publikus Karrierportál Fülválasztó (`/karrier` & `/karrier/[id]`)
- **Átirányítás a részletes karrieroldalra (`src/components/hr/internal-career-view.tsx`):**
  - A `/hr/self-service/career` oldalon minden hirdetéskártya **„Pályázás”** gombja közvetlenül a `/karrier/[id]?scope=internal` részletoldalra navigál, a fejlécben pedig egy **„Karrieroldal (Belső hirdetések)”** (`/karrier?scope=internal`) gomb nyitja meg a belső karrierportált.
  - A `/hr/self-service/career` oldalon megmaradt a **„Saját pályázataim”** fül a már beküldött belső jelentkezések státuszkövetésére és visszavonására.
- **Dolgozói fülválasztó (`src/components/hr/career-portal-client.tsx` & `src/app/karrier/[id]/page.tsx`):**
  - Ha a látogató az adott vállalat igazolt, bejelentkezett dolgozója (`isEmployeeOfSelectedCompany`), a pozíciólista felett és a felső sávban megjelenik a fülválasztó:
    - **Belső hirdetések (`X`):** Kizárólag a belső (`is_internal = true`) álláshirdetéseket jeleníti meg.
    - **Publikus hirdetések (`Y`):** Kizárólag a nyilvános (`is_internal = false`) álláshirdetéseket jeleníti meg.
  - Külső látogatók („sima emberek”) számára a **„Belső hirdetések”** fül és a „Vissza a belső HR portálra” gomb nem renderelődik ki.
- **Dolgozói adatok automatikus előtöltése (`src/app/karrier/[id]/application-form.tsx`):**
  - Igazolt céges dolgozó esetén a jelentkezési űrlap automatikusan előtölti a **Teljes nevet**, az **E-mail címet** és a **Telefonszámot**, a **Forrás** mezőt **„Belső pályázat (Intranet)”** (`belso_palyazat`) értékre állítja, és az önéletrajz (CV) csatolását opcionálissá teszi.

### 2.2. Háromállású Kapcsolósor (`Aktív` / `Publikus` / `Belső`) az Álláshirdetések Listájában (`src/components/hr/job-postings-list.tsx`)
- Minden álláshirdetés kártyájának jobb oldalán az **Aktív** és **Publikus** kapcsolók mellett megjelent a **Belső** kapcsoló, a felső szűrősáv pedig kiegészült a **„Belső”** szűrőgombbal.
- A `ManagePostingDialog` (`src/components/hr/manage-posting-dialog.tsx`) aljáról eltávolításra került a redundáns „Csak Belső Hirdetés (Internal Mobility)” doboz.

### 2.3. Önkiszolgáló Kérelmek Visszavonása, Elutasítási Indok és KPI Kártya Tisztítás
- **Elutasítási indok és visszavonás (`src/components/hr/leave-history-list.tsx`):** A `LeaveHistoryList` táblázat kanonikus `TableToolbar` keresőt és szűrőt kapott, megjeleníti a vezető által megadott `elutasitas_oka` indoklást elutasított szabadság-, túlóra- és jelenlét-korrekciós kérelmeknél, a még `jovahagyasra_var` státuszú tételeknél pedig **„Visszavonás”** gombot biztosít.
- **KPI kártya letisztítás (`src/components/hr/employee-kpi-card.tsx`):** Eltávolításra került a kártya alján lévő másodlagos „Megjegyzés hozzáfűzése...” mező, mivel az 5 lépéses önértékelési folyamat már teljes körűen kezeli a dolgozói visszajelzést.

---

## 3. Rationale (Indoklás)

A belső pályázóknak ugyanúgy szükségük van a pozíció teljes leírására, feladataira és bérsávjára, mint a külső jelölteknek, ugyanakkor a saját törzsadataik automatikus előtöltése és a belső/publikus fülek közötti 1 kattintásos váltás gyors, prémium belső mobilitási élményt nyújt a külső látogatók teljes elszigetelése mellett.
