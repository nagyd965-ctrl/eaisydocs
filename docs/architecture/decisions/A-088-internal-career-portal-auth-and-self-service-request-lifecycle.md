# A-088: [HR] Belső és Publikus Karrierportál Jogosultság-ellenőrzési Architektúra, Önkiszolgáló Kérelem-visszavonás és Elutasítási Indok Perzisztencia

**Status:** Decided  
**Date:** 2026-10-28  
**Scope:** `[HR]`  
**Author:** Antigravity  
**Kapcsolódó PRD:** [P-121](../../product/decisions/P-121-internal-public-career-portal-tabs-and-self-service-workflow-ux.md)  
**Kapcsolódó Kód:** `src/utils/hr/career-auth.ts`, `src/app/karrier/page.tsx`, `src/app/karrier/[id]/page.tsx`, `src/app/karrier/[id]/application-form.tsx`, `src/app/karrier/[id]/actions.ts`, `src/components/hr/career-portal-client.tsx`, `src/components/hr/internal-career-view.tsx`, `src/components/hr/job-postings-list.tsx`, `src/components/hr/manage-posting-dialog.tsx`, `src/app/hr/recruitment/actions.ts`, `src/app/hr/self-service/actions.ts`, `src/app/hr/manager/actions.ts`, `src/app/hr/attendance-actions.ts`, `supabase/migrations/20261028000004_add_elutasitas_oka_to_tavollet_and_tulora.sql`  

---

## 1. Context (Kontextus)

Az eaisyHR vezetői és önkiszolgáló munkafolyamatainak (9–12. P1) átvizsgálása során több építészeti és biztonsági hiányosság merült fel:
1. **Belső álláspályázatok és karrierportál szétválasztása:** Korábban a belső álláshirdetésekre (`is_internal = true`) vagy nem lehetett rálátni a részletes pozícióparaméterekkel együtt, vagy a `/karrier/[id]` végpont nem védett kellőképpen az ellen, hogy egy nem bejelentkezett külső látogató („sima ember”) az URL birtokában megnyissa a csak belső munkatársaknak szánt pozíciókat. Emellett a belső dolgozóknak manuálisan kellett újra begépelniük a saját adataikat jelentkezéskor.
2. **Hirdetés-láthatósági állapotgép (`publikus` vs. `is_internal`):** Az új álláshirdetések alapértelmezetten `publikus = true` értékkel jöttek létre, így a belső megjelölés bekapcsolásakor biztosítani kellett, hogy a `publikus` és `is_internal` jelzők kölcsönösen kizáró módon szinkronizálódjanak.
3. **Elutasítási indokok adatbázis-perzisztenciájának hiánya és hibás értesítési útvonal:** A `hr_tavollet` és `hr_tulora_felhasznalás` táblák nem rendelkeztek `elutasitas_oka` oszloppal, így a vezető által megadott elutasítási indok elveszett a dolgozó előzménytáblázatában (`LeaveHistoryList`), az elutasítási értesítés pedig nem létező `/hr/self-service/leave` (404) útvonalra irányított.
4. **Függőben lévő kérelmek visszavonhatatlansága:** A dolgozó nem tudta visszavonni a még el nem bírált (`jovahagyasra_var`) szabadság-, jelenlét-korrekciós vagy túlóra-igénylését.

---

## 2. Decision (A Meghozott Döntés)

### 2.1. Szerveroldali Dolgozói Kontextus-feloldás és Karrierportál Védelem (`resolveCareerEmployeeContext`)
- Létrejött a `src/utils/hr/career-auth.ts` modulban a `resolveCareerEmployeeContext()` szerveroldali segédfüggvény, amely a Supabase Auth session (`supabase.auth.getUser()`) alapján feloldja:
  - A felhasználó összes igazolt vállalati tagságát (`employeeCompanyIds`) a `company_members`, `hr_dolgozo_adatlap`, `hr_jogviszony` és `felhasznalo_profil` táblák metszetéből.
  - A dolgozó személyi törzsadatait (`nev`, `email`, `telefon`, `munkakor`) az űrlap-előtöltéshez.
- **Listaoldali szerveroldali szűrés (`src/app/karrier/page.tsx`):** A `hr_allashirdetes` lekérdezés eredményéből az `is_internal = true` hirdetéseket a szerver kizárólag akkor küldi le a kliensnek, ha a látogató be van jelentkezve és az adott vállalat igazolt dolgozója (`employeeCompanySet.has(resolvedCompanyId)`). Külső látogató számára a belső hirdetések a hálózati válaszba sem kerülnek bele.
- **Részletoldali hozzáférés-megtagadás (`src/app/karrier/[id]/page.tsx`):** Ha egy hirdetés csak belső (`hirdetes.is_internal && !hirdetes.publikus`), és a látogató nem az adott vállalat igazolt dolgozója (`!isEmployeeOfCompany`), a szerver azonnal `notFound()` (HTTP 404) választ ad.

### 2.2. Kölcsönösen Kizáró Publikus / Belső Állapotfrissítés (`updateJobPostingFlagsAction`)
- A `src/app/hr/recruitment/actions.ts` modulban az `updateJobPostingFlagsAction` Server Action kezeli az `aktiv`, `publikus` és `is_internal` kapcsolók mentését:
  - A **Belső** (`is_internal = true`) bekapcsolása automatikusan `publikus = false` értéket állít be.
  - A **Publikus** (`publikus = true`) bekapcsolása automatikusan `is_internal = false` értéket állít be.
  - Minden váltás után lefut a `revalidatePath` a `/hr/recruitment`, `/karrier`, `/karrier/[id]` és `/hr/self-service/career` útvonalakra.

### 2.3. Elutasítási Indok Perzisztencia és Kérelem-visszavonás (`20261028000004_add_elutasitas_oka_to_tavollet_and_tulora.sql`)
- A `hr_tavollet` és `hr_tulora_felhasznalás` táblák `elutasitas_oka text` oszloppal bővültek.
- A vezetői döntés (`handleLeaveApproval` a `src/app/hr/manager/actions.ts` fájlban és `handleOvertimeApproval` a `src/app/hr/attendance-actions.ts` fájlban) elmenti az `elutasitas_oka` mezőt az adatbázisba, javítja az értesítési linket `/hr/self-service/time`-ra, és jóváhagyáskor is küld in-app értesítést.
- A `withdrawSelfServiceRequest` (`src/app/hr/self-service/actions.ts`) és `withdrawInternalApplicationAction` (`src/app/hr/self-service/career/referral-actions.ts`) lehetővé teszi a még függőben lévő (`jovahagyasra_var` / `uj`) kérelmek biztonságos, saját dolgozóra korlátozott visszavonását.

---

## 3. Consequences (Következmények)

**Pozitív:**
- Külső látogatók sem a `/karrier` listában, sem közvetlen URL-lel (`/karrier/[id]`) nem férhetnek hozzá a belső álláshirdetésekhez.
- A bejelentkezett dolgozók teljes pozícióleírást, bérsávot és előtöltött jelentkezési űrlapot kapnak, miközben 1 kattintással válthatnak a belső és publikus hirdetések között.
- A szabadság-, túlóra- és jelenlét-korrekciós elutasítások indoklása tartósan visszanézhető a dolgozói előzményekben.

**Kockázat / Kompromisszum:**
- A `resolveCareerEmployeeContext` szerveroldali session-olvasást végez a `/karrier` útvonalon, ezért a `/karrier` és `/karrier/[id]` oldalak `dynamic = "force-dynamic"` módban futnak (ami már korábban is érvényben volt az élő álláshirdetések miatt).
