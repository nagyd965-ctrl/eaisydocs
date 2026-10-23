# PRD P-109: 360° Dolgozói Profil Munkaviszony Fül Letisztítása és Munkavédelmi Oktatások Áthelyezése UX

- **Dátum:** 2026-10-23
- **Státusz:** `Approved`
- **Hatókör:** `[HR]`
- **Kapcsolódó döntések:** [ADR A-029](../architecture/decisions/A-029-global-ui-consistency-and-unified-components.md), [PRD P-043](./P-043-global-ui-consistency-and-unified-components.md), [PRD P-096](./P-096-employee-official-documents-dedicated-tab-ux.md), [PRD P-108](./P-108-hr-self-service-benefits-sidebar-and-safety-training-visibility-ux.md)

---

## 1. Felhasználói Igény és Probléma

1. **Összemosott Témakörök a Munkaviszony Fülön:**
   - A 360°-os dolgozói adatlapon (`/hr/employee/[id]`) a Munkaviszony fül a szerződéses és beosztási jogviszony mellett a kötelező munkavédelmi és tűzvédelmi oktatásokat is tartalmazta.
   - Ez zavarta a munkajogi áttekinthetőséget, hiszen a beosztás és munkakör vizsgálatakor nem a munkavédelmi jegyzőkönyvek a releváns információk.
2. **EHS és Munkavédelmi Adatok Széttagoltsága:**
   - A foglalkozás-egészségügyi orvosi alkalmassági vizsgálatok a *Bizalmas HR adatok* fülön szerepeltek, míg a munkavédelmi oktatások a *Munkaviszony* fülön. A munkavédelmi megbízottnak és a HR-nek így két különböző fül között kellett ugrálnia a dolgozó munkavédelmi érvényességének ellenőrzéséhez.

---

## 2. Termék és UX Döntések

1. **Munkavédelmi és Tűzvédelmi Oktatások Áthelyezése a Bizalmas Fülre (`src/app/hr/employee/[id]/page.tsx`):**
   - A `SafetyTrainingEmployeeCard` komponens átkerült a **„Bizalmas HR adatok”** (`bizalmas`) fülre, közvetlenül az Orvosi Alkalmassági Vizsgálatok (`MedicalTab`) alá.
   - Így a teljes munkavédelmi & egészségügyi megfelelőség (EHS compliance) egyetlen dedikált, biztonságos felületre került.
   - A `munkavedelmi` szerepkörrel rendelkező szakemberek közvetlenül ezen a fülön érik el és rögzíthetik a jegyzőkönyveket (`isHrOrAdmin || currentHrRole === "munkavedelmi"`).
2. **Munkaviszony Fül Letisztítása:**
   - A *Munkaviszony* fül kizárólag a szerződéses és beosztási jogviszonyra fókuszál:
     - Jogviszony és Munkarend (`EmploymentTab`): betöltött munkakör, FEOR, munkaidő (FTE), munkarend, közvetlen vezető, bérkategória.
     - Hozzárendelt munkaköri leírás: feladatok, hatáskörök, kompetenciák.
     - Előző és jövőbeli beosztások idővonala (Timeline).
     - Tanulmányi szerződések (`StudyContractTab`) átmenetileg megtartva a későbbi átgondolásig.
3. **Zero-Emoji és No-Decorative-Icons Megfelelőség (`src/components/hr/safety-training-employee-card.tsx`):**
   - Eltávolításra került a korábbi dekoratív védősisak (`HardHat`) ikon a kártya címéből és az üres állapotból (empty state).
   - A szekciócímek egységes stílust kaptak.

---

## 3. Érintett Képernyők és Komponensek

| Fájl | Típus | Módosítás |
|---|---|---|
| `src/app/hr/employee/[id]/page.tsx` | Next.js Page | Munkavédelmi és tűzvédelmi oktatások áthelyezése a munkaviszony fülről a bizalmas fülre |
| `src/components/hr/safety-training-employee-card.tsx` | Kliens Komponens | Dekoratív HardHat ikonok eltávolítása a címből és az üres állapotból |

---

## 4. Elfogadási Kritériumok (Acceptance Criteria)

- [x] A Munkaviszony fülön nem szerepel a munkavédelmi és tűzvédelmi oktatások doboza.
- [x] A Bizalmas HR adatok fülön egymás alatt megjelenik az Orvosi alkalmasság és a Munkavédelmi oktatás.
- [x] A munkavédelmi szerepkörű felhasználók hozzáférnek az oktatásokhoz a bizalmas fülön.
- [x] A felületeken betartásra került a Zero-Emoji és No-Decorative-Icons irányelv.
- [x] A TypeScript fordítás (`npx tsc --noEmit`) hibátlanul fut le.
