# P-038: [HR] Dinamikus Szervezeti Egység és Munkakör Katalógus Választó UX

**Dátum:** 2026-10-01  
**Hatókör:** `[HR]`  
**Státusz:** `ELFOGADVA / IMPLEMENTÁLVA`  
**Kapcsolódó döntések:** [P-015: Onboarding és offboarding checklist folyamatok UX](./P-015-hr-onboarding-offboarding-checklist-ux.md), [P-034: Megújított Onboarding Folyamat](./P-034-onboarding-lifecycle-redesign-and-activation-ux.md), [P-035: Közvetlen Beléptetés Indítás UX](./P-035-onboarding-manual-intake-and-asset-handover-ux.md), [P-037: Onboarding Munkaszerződés Előkészítés UX](./P-037-onboarding-employment-contract-generator-and-filing-ux.md)  
**Kapcsolódó forráskód:** `src/app/hr/actions/job-org-actions.ts`, `src/components/hr/job-org-selector.tsx`, `src/components/hr/add-onboarding-dialog.tsx`, `src/components/hr/employment-contract-panel.tsx`, `src/components/hr/onboarding-profile-modal.tsx`, `src/components/hr/onboarding-card.tsx`, `src/components/hr/onboarding-list.tsx`, `src/app/hr/recruitment/actions.ts`, `supabase/migrations/20261001000011_hr_munkaszerzodes_reszleg.sql`

---

## 1. Háttér és Problémafelvetés

Az eaisyHR beállításai között a Szervezet és munkatársak menüpont alatt nyilvántartott **Szervezeti Egységek** (pl. `FCM`, `HR`, `IT`, `Karbantartás`, `Vezetőség`) és **Munkakör-katalógus** (pl. `Flottakezelő` -> `FCM`, `Senior Fejlesztő` -> `IT`, `HR Menedzser` -> `HR`) képezik a vállalat szervezeti hierarchiájának törzsadatait.

Korábban az Onboarding felületeken és a munkaszerződés-előkészítő űrlapokon a munkakör és részleg szabad szöveges beviteli mezőként vagy hardkódolt opciókként szerepelt. Ez több problémához vezetett:
1. **Inkonzisztencia:** Eltérő elnevezések, elgépelések (pl. „flotta”, „Flottakezelés”, „FCM”).
2. **Kettős adatbevitel:** A munkakör kiválasztása után külön be kellett gépelni a részleget, holott az adatbázisban minden munkakör már hozzá van rendelve egy felelős szervezeti egységhez.
3. **Toborzási (ATS) adatvesztés:** Amikor a toborzási folyamatból egy jelöltet elfogadtak (`elfogadva` státusz), az Onboardingba csak a munkakör neve került át, a hozzá kapcsolódó szervezeti egység (`reszleg`) üresen maradt.

---

## 2. Megoldás és Kétirányú Interakciós Modell

A felhasználói elvárásnak megfelelően egy univerzális, kétirányúan szinkronizált komponenst hoztunk létre: `JobOrgSelector` (`src/components/hr/job-org-selector.tsx`), amely az alábbi két fő működési mintát támogatja:

### A) Minta: Szervezeti Egység szerinti szűrés (Unit First)
- A HR munkatárs először kiválasztja a kívánt szervezeti egységet (pl. `IT`).
- A Munkakör legördülő lista azonnal megszűri a tételeket, és **kizárólag az adott egységhez kapcsolt munkaköröket** listázza ki (pl. `Senior Fejlesztő`, `Junior Fejlesztő`, `UX/UI Designer`, `Projektmenedzser`).
- Ha az adott egységben csak egyetlen munkakör létezik, a rendszer automatikusan kiválasztja azt.

### B) Minta: Munkakör alapú automatikus kitöltés (Job First / ATS)
- Amennyiben a felhasználó közvetlenül a munkakört választja ki (vagy az ATS-ből egy pozícióra jelentkezett a jelölt, pl. `Flottakezelő`), a szoftver **azonnal és automatikusan beírja a hozzá tartozó szervezeti egységet** (jelen esetben `FCM`).
- A szervezeti egység választó azonnal átvált az érintett egységre, egy finom vizuális jelzéssel (*„FCM kapcsolva”*).

### C) Rugalmas tartalék üzemmód (Fallback)
- Bár a rendszer a hivatalosan nyilvántartott munkakörökből dolgozik, a „Nem találod? Egyéni megadás” funkcióval lehetőség van ad-hoc munkakör és szervezeti egység beírására is, megőrizve a folyamat folytonosságát speciális szerződéskötéseknél.

---

## 3. Rendszerszintű Integráció

1. **Adatbázis sémamódosítás és migráció:**
   - A `public.hr_munkaszerzodes` táblához hozzáadásra került a `reszleg TEXT` mező (`supabase/migrations/20261001000011_hr_munkaszerzodes_reszleg.sql`).
   - A meglévő adatbázis rekordok retroaktív javítása megtörtént (`Nagy Dániel` - `Flottakezelő` -> `FCM`).

2. **Katalógus Adatlekérdezés (`src/app/hr/actions/job-org-actions.ts`):**
   - Új szerver action: `getJobsAndOrgUnitsAction()`, amely lekéri a jóváhagyott `hr_szervezeti_egyseg` és `hr_munkakor` rekordokat szervezeti egység relációval és FEOR kóddal együtt.

3. **Toborzási (ATS) Átadás (`src/app/hr/recruitment/actions.ts`):**
   - Amikor egy jelentkező státusza `elfogadva`-ra változik, a rendszer lekérdezi a pozícióhoz kapcsolt szervezeti egység megnevezését (`hr_munkakor -> hr_szervezeti_egyseg.nev`), és közvetlenül beírja az új `hr_onboarding` rekord `reszleg` mezőjébe.

4. **Közvetlen Beléptetés Űrlap (`AddOnboardingDialog`):**
   - Új belépő manuális felvételekor a `JobOrgSelector` segíti a HR-est, így kizárt a hibás szervezeti besorolás.

5. **Munkaszerződés Előkészítés (`EmploymentContractPanel`):**
   - A szerződés adatai között a Szervezeti Egység és Munkakör dinamikusan választható és szinkronizálódik a `hr_munkaszerzodes` és `hr_onboarding` táblák között.

6. **Onboarding Áttekintő és Profil Kártya:**
   - Az `OnboardingCard`, `OnboardingList` és az `OnboardingProfileModal` fejlécében a munkakör mellett elegáns `Building2` ikonnal közvetlenül megjelenik a munkatárs szervezeti egysége (pl. `Flottakezelő • FCM`).
