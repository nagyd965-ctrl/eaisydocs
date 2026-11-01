# A-099: [Közös] HR Iktatási Híd (`hr-filing-bridge`) Cég-Izolációja és Iktatott HR-Iratok PDF Előnézeti Jogosultság-Szinkronizációja

**Status:** Decided  
**Date:** 2026-11-01  
**Scope:** `[Közös]` (`[Docs]` + `[HR]`)  
**Author:** Agent  
**Kapcsolódó ADR:** [A-066](./A-066-multi-tenant-company-members-colleague-visibility-and-hr-workforce-isolation.md), [A-087](./A-087-hr-simplified-roles-module-permission-matrix-and-p0-calculation-hardening.md), [A-089](./A-089-self-service-signed-document-immutability-and-archive-dossier-filing.md)  
**Kapcsolódó Kód:** `src/utils/hr-filing-bridge.ts`, `src/app/api/pdf/[id]/route.ts`, `src/app/dossiers/[id]/viewer-actions.ts`, `src/app/hr/employee/[id]/actions.ts`, `src/app/hr/self-service/profile/page.tsx`, `src/app/hr/self-service/actions.ts`, `src/components/hr/cafeteria-declaration.tsx`, `src/components/hr/time-tracking-card.tsx`

---

## 1. Context (Kontextus)

A többcéges (multi-tenant) működés és a Jogosultsági Mátrix (`company_members`) bevezetése után az eaisyHR és eaisyDocs közötti integrációs hídban, valamint az önkiszolgáló felületeken öt olyan funkcionális hiba maradt, amely a felhasználói felületen is reprodukálható volt:

1. **Iktatott HR-iratok PDF előnézeti elutasítása (`/dossiers/[id]`):** A HR-ből iktatott dokumentumok alapértelmezetten `bizalmas` biztonsági minősítést kapnak. Amikor egy HR-vezető vagy HR-moduljoggal rendelkező munkatárs (aki az eaisyDocs-ban nem globális `admin`, és a `max_minosites` szintje `nyilt` vagy `belso`) az iktatószám linkre kattintva megnyitotta a dolgozó személyi dossziéját (`/dossiers/[id]`), a `getDocumentSignedUrl` (`viewer-actions.ts`) és a `/api/pdf/[id]` végpont `403 Forbidden` hibával elutasította a PDF előnézetet, mert csak a saját tulajdonú (`dolgozo_id === user.id`) HR-dokumentumot engedte át, a cégszintű HR-jogosultságot nem vizsgálta.
2. **A `hr-filing-bridge.ts` cég-azonosító (`company_id`) hiánya:** A `getOrCreateEmployeeDossier`, `executeHrDocumentFiling` és `executeBatchHrDocumentsFiling` függvények `company_id` szűrés nélkül keresték a `3.1` irattári tételt és a HR szervezeti egységet (ami több cég esetén `.maybeSingle()` `PGRST116` hibához vagy idegen cég tételének kiválasztásához vezetett), továbbá az `ugy`, `ugyirat` és `irat` rekordokat `company_id` nélkül szúrták be. Emiatt a második cégben iktatott személyi dossziék az adatbázis alapértelmezett cégéhez (`Think AI Kft.`) kerültek.
3. **Dolgozói karton iktató műveleteinek globális profil-függése:** A `src/app/hr/employee/[id]/actions.ts` fájlban a `hasHrOrDocsAdminProfile` segédfüggvény kizárólag a globális `felhasznalo_profil` táblát olvasta, figyelmen kívül hagyva a `company_members` táblában kiosztott cégszintű szerepköröket és modulokat (valamint az `employees` modulkulcsot).
4. **Saját profil (`/hr/self-service/profile`) többcéges `hr_jogviszony` ütközés:** Ha egy dolgozónak két különböző cégben is volt aktív (`kilepes_datuma IS NULL`) jogviszonya, a `company_id` szűrés nélküli `.maybeSingle()` lekérdezés `null`-t adott vissza.
5. **Kliens-state szinkron cégváltáskor és jelenlét-korrekció `company_id`:** A `CafeteriaDeclaration` és a `TimeTrackingCard` belső state-jei cégváltáskor nem minden prop-változást követtek le, a `submitAttendanceCorrection` pedig nem adta át az aktív `company_id`-t a `hr_jelenlet_korrekcio` táblának.

---

## 2. Decision (A Meghozott Döntés)

1. **Keresztmodulos PDF Előnézeti Jogosultság (`viewer-actions.ts` és `/api/pdf/[id]/route.ts`):**
   - Ha az előnézetre kért `irat` egy `hr_dokumentum` rekordhoz tartozik, a rendszer a `dolgozo_id === user.id` ellenőrzésen túl lekéri a dokumentum cégéhez tartozó cégszintű jogosultságokat (`getActiveCompanyMemberRolesServer`), és átengedi a cég-adminokat, valamint az `["employees", "compliance", "payroll", "onboarding", "offboarding", "auditor", "admin"]` HR-modulok valamelyikére jogosult felhasználókat.
   - A `/api/pdf/[id]/route.ts` 3.3-as fallback lekérdezéséből eltávolítottuk a hibás `id.eq.${fileId}` (`irat_fajl.id` vs `hr_dokumentum.id`) összekeverést.
2. **Teljes `company_id` láncolás a `hr-filing-bridge.ts`-ben:**
   - Bevezettük a `resolveFilingCompanyId` segédfüggvényt, amely explicit paraméterből, az aktív cég sütiből (`getActiveCompanyIdServer`), vagy a dolgozó `hr_dolgozo_adatlap.company_id` mezőjéből feloldja a célcéget.
   - A `findEmployeeDossier` cégre szűri a dolgozó személyi dossziéját (így egy többcéges dolgozónak cégenként külön, izolált személyi dossziéja nyílik).
   - A `3.1` irattári tétel és a HR szervezeti egység lekérdezése `.eq("company_id", effectiveCompanyId).limit(1).maybeSingle()` védelmet kapott.
   - Minden `ugy`, `ugyirat`, `irat`, `esemeny_naplo` és `hr_esemeny_naplo` beszúrás megkapja a feloldott `company_id`-t.
3. **Cégszintű Jogosultsági Mátrix integráció a dolgozói karton iktató action-jeiben:**
   - A `hasHrOrDocsAdminProfile` (`src/app/hr/employee/[id]/actions.ts`) aszinkron módon ellenőrzi a `getActiveCompanyMemberRolesServer()` és `isUserAuthorizedForHrView` eredményét is, beleértve az `employees` modulkulcsot.
4. **Önkiszolgáló cég-szűrés és prop-szinkron:**
   - A `/hr/self-service/profile` oldal az `activeCompanyId`-ra szűri az aktív `hr_jogviszony` lekérdezést.
   - A `CafeteriaDeclaration` és `TimeTrackingCard` komponensek `useEffect` hookkal szinkronizálják a szerverről érkező új propokat cégváltáskor, a `submitAttendanceCorrection` pedig elmenti az aktív `company_id`-t.

---

## 3. Consequences (Következmények)

- **Pozitív:** A második (és bármely további) cégben végzett HR-iktatás mostantól pontosan az adott cég iktatókönyvébe (`ugy`, `ugyirat`, `irat`) kerül, a Jogosultsági Mátrixban feljogosított HR-esek pedig mind az iktatást, mind az Ügyiratok oldali PDF-előnézetet fennakadás nélkül használhatják.
- **Kompatibilitás:** A `resolveFilingCompanyId` hibatűrő fallbackje biztosítja, hogy a Next.js kérés-kontextuson kívül futó egységtesztek (`hr-filing-bridge.test.ts`) továbbra is változatlanul fussanak.

