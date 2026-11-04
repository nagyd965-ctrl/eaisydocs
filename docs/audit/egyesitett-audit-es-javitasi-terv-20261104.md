# Egyesített, Verifikált Rendszeraudit és Prioritizált Javítási Terv (eaisyDocs & eaisyHR)

**Dátum:** 2026-11-04  
**Státusz:** **TELJES KÖRŰEN MEGVALÓSÍTVA ÉS VERIFIKÁLVA (1–5. Szint lezárva — 2026-11-04)**  
**Kapcsolódó Döntések:** ADR [A-114](./architecture/decisions/A-114-unified-5-level-security-rls-and-cross-module-hardening.md), PRD [P-143](./product/decisions/P-143-unified-5-level-audit-remediation-and-permission-ux-sync.md), BRD [BRD-013](./business/decisions/013-unified-5-level-audit-payroll-holiday-and-policy-rules.md)  
**Ág:** `eaisyhr`  
**Források:**
1. Saját 3-ügynökös mélyaudit ([`docs/audit/full-system-deep-audit-20261104.md`](./audit/full-system-deep-audit-20261104.md))
2. Ellenőrző agent 3-területi mélyauditja ([`docs/audit/reviewer-eszrevetelek-20261104.md`](./audit/reviewer-eszrevetelek-20261104.md) és [`docs/develop/teljes-rendszer-audit-20261104.md`](./develop/teljes-rendszer-audit-20261104.md))
3. Élő PostgreSQL (`pg_policies`, `pg_proc`) és forráskód-szintű kereszt-verifikáció

> [!IMPORTANT]
> **SZŰRÉSI ALAPELV:** Ebben a dokumentumban **kizárólag olyan tételek szerepelnek, amelyeket az élő kódbázisban és az élő Supabase PostgreSQL adatbázisban soronként verifikáltunk**, és amelyek tényleges funkcionális, jogosultsági vagy biztonsági hibát okoznak.
> A lista felépítése a kérésnek megfelelően **a legegyszerűbben, leggyorsabban és 0 kockázattal javítható (1–5 soros) hibáktól halad a legösszetettebb, legkritikusabb jogosultsági és adatbázis-szintű pontokig (1. Szint -> 5. Szint).**

---

## 0. Összesített Készültségi Állapot (A Két Audit Konszenzusa)

| Rendszerrész | Jelenlegi Készültség (%) | Készültség az 1–5. Szint javítása után |
| :--- | :---: | :---: |
| **eaisyHR Alkalmazás** | **~87–89%** | **~96–98%** |
| **eaisyDocs Alkalmazás** | **~82–87%** | **~96–98%** |
| **Közös Platform, `/management` & Adatbázis/RLS** | **~75–84%** | **~97–98%** |
| **TELJES PLATFORM ÁTLAG** | **~85%** | **~97%** |

---

## 1. SZINT — Legegyszerűbb, Azonnali „Quick-Win” Javítások (1–5 soros, 0% töréskockázatú módosítások, ~15–20 perc)

Ezek a hibák fájlonként 1–5 soros módosítással (vagy fájlmozgatással) azonnal, mellékhatás nélkül javíthatók:

### 1.1. [P0] Rollback SQL fájlok eltávolítása a `supabase/migrations/` mappából
- **Érintett fájlok:**
  - `supabase/migrations/rollback_20261008000001_multitenancy_companies.sql`
  - `supabase/migrations/rollback_20261008000002_add_company_id_to_remaining_tables.sql`
  - `supabase/migrations/rollback_20261008000003_multitenancy_restrictive_rls.sql`
- **Valós hiba:** A Supabase CLI minden `.sql` fájlt migrációként futtat. Mivel a `rollback_*` ábécé-sorrendben a `2026*` után következik, egy `supabase db reset` vagy új környezetre történő `db push` végén lefut és törli a `company_id` oszlopokat és a `companies` táblát.
- **Javítás (1 lépés):** A 3 fájl áthelyezése a `supabase/archive/` mappába.

### 1.2. [P0] `/management` Szuperadmin ellenőrzés szűkítése (`verifySuperadminUser`)
- **Érintett fájl:** [`src/app/management/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/management/actions.ts#L156-L169)
- **Valós hiba:** A `verifySuperadminUser` jelenleg elfogadja a `profile?.szerepkor === "admin"`, `profile?.docs_szerepkor === "admin"` és `profile?.hr_szerepkor === "admin"` feltételeket, így bármely ügyfélcég normál adminja beléphet a `/management` szuperadmin felületre.
- **Javítás (3 sor):** Az `isRoleAdmin` feltétel szűkítése kizárólag `profile?.szerepkor === "rendszergazda"`-ra (megtartva az `isAllowedEmail` és `hasManagementModule` ágakat).

### 1.3. [P1] Autentikálatlan `anonymize-candidates` Edge Function lezárása
- **Érintett fájl:** [`supabase/functions/anonymize-candidates/index.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/supabase/functions/anonymize-candidates/index.ts#L4-L25)
- **Valós hiba:** A `Deno.serve` végpont nem ellenőriz `CRON_SECRET`-et, így anon kulccsal meghívva minden cég 6 hónapnál régebbi jelöltjét anonimizálja (ráadásul az élő `/api/cron/gdpr-anonymize` már kiváltotta).
- **Javítás (5 sor):** `Authorization: Bearer <CRON_SECRET>` ellenőrzés beépítése a `Deno.serve` legelejére (`!cronSecret || authHeader !== 'Bearer ' + cronSecret` -> `401 Unauthorized`).

### 1.4. [P1] eaisyHR `performance-access.ts` nem létező `helyettesitett_id` oszlopnév
- **Érintett fájl:** [`src/utils/hr/performance-access.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/performance-access.ts#L57)
- **Valós hiba:** Az 57. sorban `.select("helyettesitett_id")` szerepel, miközben a `hr_helyettesites` táblában az oszlop neve **`vezeto_id`**. Emiatt a lekérdezés mindig `null`-t ad vissza, és a helyettesítők nem látják a helyettesített vezető beosztottjainak KPI-jait és IDP-it.
- **Javítás (2 sor):** `.select("vezeto_id")` és `(s: any) => s.vezeto_id`.

### 1.5. [P1] eaisyDocs `splitAttachmentToNewIrat` hibás AI várólista státusz (`"varakozik"` -> `"fuggoben"`)
- **Érintett fájl:** [`src/app/inbox/filing-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/inbox/filing-actions.ts#L1455)
- **Valós hiba:** A csatolmány-szétválasztás `statusz: "varakozik"` értékkel szúr be az `ai_feladat_sor` táblába, miközben az AI worker (`src/utils/ai-worker-service.ts:49`) kizárólag a `statusz: "fuggoben"` sorokat dolgozza fel.
- **Javítás (1 sor):** `statusz: "fuggoben"`.

### 1.6. [P1] eaisyDocs `disposal-actions.ts` selejtezési csomag hiba elnyelése + `pdfa_path` törlése
- **Érintett fájl:** [`src/app/archive/disposal-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/archive/disposal-actions.ts#L77-L80) és `#L362-L372`
- **Valós hiba:**
  1. A `77–79. sorban` ha a `selejtezes_csomag` beszúrása sikertelen (`if (csomagError || !csomag)`), csak `console.error` fut, és a kód csomag nélkül átállítja az ügyiratokat `selejtezheto`-re.
  2. A `362–372. sorban` (`approveDisposal`) csak a `storage_path` kerül törlésre a Storage-ból, a `pdfa_path` nem.
- **Javítás (5 sor):** `if (csomagError || !csomag) return { error: ... }` visszatérés, valamint `f.pdfa_path` hozzáadása a törlendő fájlok listájához.

### 1.7. [P1] eaisyDocs `notification-audit-tab.tsx` HTML szanitizálás
- **Érintett fájl:** [`src/app/audit/notification-audit-tab.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/audit/notification-audit-tab.tsx#L707)
- **Valós hiba:** A `selectedLog.uzenet` közvetlenül `dangerouslySetInnerHTML={{ __html: selectedLog.uzenet }}`-nel renderelődik szanitizálás nélkül.
- **Javítás (2 sor):** `sanitizeRichTextHtml(selectedLog.uzenet)` használata (`@/lib/sanitize-html`).

### 1.8. [P1] eaisyHR `/hr/reports` archívum lekérdezésből hiányzó `"reports"` modul-kulcs
- **Érintett fájl:** [`src/app/hr/reports/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/reports/actions.ts#L1108-L1113)
- **Valós hiba:** A `getArchiveRecords` `requireHrAuthServer(["payroll", "admin", "auditor"], null)` hívásából hiányzik a `"reports"` kulcs, így a `"reports"` modullal rendelkező felhasználó üres archívumot kap.
- **Javítás (1 sor):** `["payroll", "reports", "admin", "auditor"]`.

---

## 2. SZINT — Egyszerű Frontend Állapot- és Jogosultság-Javítások (~30–40 perc)

Ezek a hibák lokális React komponenseket és oldalbetöltőket érintenek, egyszerű prop- vagy `useEffect`-szinkronizációval:

### 2.1. [P1] Cégváltás után beragadó állapot (Stale State) a Jogosultsági Mátrixban és a Beállításokban
- **Érintett fájlok:**
  - [`src/components/hr/permissions-matrix-view.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/hr/permissions-matrix-view.tsx#L54)
  - [`src/app/settings/settings-client.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/settings/settings-client.tsx#L65-L70)
- **Valós hiba:** Cégváltáskor (`router.refresh()`) a `PermissionsMatrixView` `employees` állapota (`useState(initialEmployees)`) és a `SettingsClient` IMAP / 4-szem elv állapota nem frissül az új cég szerverről érkező propjaira, így az előző cég dolgozóit/adatait mutatja.
- **Javítás:** `useEffect(() => { setEmployees(initialEmployees) }, [initialEmployees])` a `permissions-matrix-view.tsx`-ben, valamint `useEffect` szinkronizáció (és `key={activeCompanyId}` a `/settings/page.tsx`-ben és `/hr/organization/page.tsx`-ben).

### 2.2. [P1] `/settings` oldal globális `isAdmin` fallback megszüntetése és read-only védelem
- **Érintett fájlok:**
  - [`src/app/settings/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/settings/page.tsx#L55-L82)
  - [`src/app/settings/notification-settings.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/settings/notification-settings.tsx#L169-L222)
- **Valós hiba:**
  1. A `settings/page.tsx:79-82` sorában a `profile?.szerepkor === "admin" || profile?.docs_szerepkor === "admin"` globális profil-fallback miatt egy olyan felhasználó, aki az „A” cégben admin, a „B” cégre váltva (ahol csak beosztott) is látja az admin füleket.
  2. A `settings/page.tsx:55-60` read-only felhasználónál is `upsert`-eli az értesítési szabályokat, a `notification-settings.tsx` gombjai pedig nem kapnak `disabled={!isAdmin}` attribútumot.
- **Javítás:** A `profile?.szerepkor === "admin"` és `profile?.docs_szerepkor === "admin"` eltávolítása a `settings/page.tsx:79-82`-ből (csak a `scopedRoles` és a globális `rendszergazda` maradjon), az értesítési szabály seedelés kötése `isAdmin`-hoz, és `disabled={!isAdmin}` a csatorna-gombokra.

### 2.3. [P0/P1] eaisyHR `isStrictAdmin` (`hrRole === "admin"`) Read-Only megkerülés javítása 3 oldalon + `PersonalDataTab`
- **Érintett fájlok:**
  - [`src/app/hr/employee/[id]/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/page.tsx#L86-L92)
  - [`src/app/hr/organization/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/organization/page.tsx#L33-L38)
  - [`src/app/hr/admin/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/admin/page.tsx#L201)
  - [`src/app/hr/employee/[id]/tabs/PersonalDataTab.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/tabs/PersonalDataTab.tsx#L87-L155)
- **Valós hiba:**
  1. Mivel a `normalizeHrRoleAndModules` a `hr_vezeto`, `hr_munkatars` és `admin` szerepköröket egyaránt `role: "admin"`-ra normalizálja, a `currentHrRole === "admin"` ellenőrzés (`hasHrWriteAccess` nélkül) `true`-t ad akkor is, ha a felhasználónak a mátrixban minden írási jogát kikapcsolták (`hr_iras_modulok = []`).
  2. A `employee/[id]/page.tsx:87` sorában a `hasHrWriteAccess(..., "admin")` hívásból hiányzik az `"employees"` modul-kulcs (`["employees", "admin"]` kell).
  3. A `PersonalDataTab.tsx` egyetlen `isHrOrAdmin` proppal kezeli a megtekintést és a szerkesztést.
- **Javítás:** Mindhárom oldalon a `hasHrWriteAccess(currentHrRole, currentHrModules, currentHrWriteModules, ...)` használata az `isStrictAdmin` helyett, és külön `canEdit={isHrOrAdmin}` prop átadása a `PersonalDataTab`-nak.

### 2.4. [P1] eaisyDocs `/inbox` Read-Only előnézeti csapda és `/audit`, `/rules`, `TasksTab` Read-Only UX
- **Érintett fájlok:**
  - [`src/components/inbox-table-client.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/inbox-table-client.tsx#L411-L495)
  - [`src/app/inbox/[id]/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/inbox/%5Bid%5D/page.tsx#L51-L53)
  - [`src/app/audit/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/audit/actions.ts#L114-L117)
  - [`src/app/rules/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/rules/page.tsx#L23) & [`src/app/rules/rules-client.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/rules/rules-client.tsx)
  - [`src/components/tasks-tab.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/components/tasks-tab.tsx#L584-L648)
- **Valós hiba:**
  1. A `/inbox` táblázatban az `Eye` gyorsnézet gomb a `{canEdit && ...}` blokkba került, a sorra kattintás pedig `/inbox/${item.id}`-ra visz, ahonnan a `/inbox/[id]/page.tsx` visszadobja a read-only felhasználót (`/inbox/view/${item.id}` helyett).
  2. Az `/audit` és `/rules` oldalbetöltők írási jogot követelnek meg az olvasáshoz is.
  3. A `TasksTab` sorvégi menüje és checkboxa nem nézi a `canEdit` propot.
- **Javítás:** Az `Eye` gomb kivétele a `canEdit` feltételből, `!canEdit` esetén átirányítás `/inbox/view/${id}`-ra, olvasási ellenőrzés az `/audit` és `/rules` betöltésnél (`canEdit` prop átadásával a `RulesClient`-nek), és `canEdit` gate a `TasksTab` checkboxra/menüre.

---

## 3. SZINT — Üzleti Logikai, PDF és Kalkulációs Hibák (~45–60 perc)

### 3.1. [P1] eaisyDocs `generateFromTemplate` PDF generátor `ő`/`ű` összeomlás (WinAnsi -> UTF-8)
- **Érintett fájl:** [`src/app/dossiers/[id]/template-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/dossiers/%5Bid%5D/template-actions.ts#L427-L573)
- **Valós hiba:** A `generateFromTemplate` még a `StandardFonts.Helvetica` (WinAnsi) betűtípust használja, ami `ő`, `ű`, `Ő`, `Ű` karaktereknél a fejlécmezőkben (`targy`, `cimzett`, `profile.nev`) futásidejű kivétellel összeomlik, a törzsszövegből pedig kitörli az `ő`/`ű` betűket.
- **Javítás:** Átállítás a már meglévő, `LiberationSans` UTF-8 betűtípust használó `generateLetterPdfBuffer` (`@/utils/pdf-letter-generator`) függvényre.

### 3.2. [P1] eaisyHR Helyettesítés lejáratakor / kikapcsolásakor a helyettes saját csapatának felülírása
- **Érintett fájlok:**
  - [`src/utils/hr/substitute-sync.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/substitute-sync.ts#L36-L57)
  - [`src/app/hr/self-service/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/self-service/actions.ts#L1182-L1202)
- **Valós hiba:** Amikor „A” vezető helyettesítése lejár („B” volt a helyettese), a `.update({ aktualis_jovahagyo_id: sub.vezeto_id }).eq("aktualis_jovahagyo_id", sub.helyettes_id)` nem szűr „A” vezető saját beosztottjaira (`kozvetlen_vezeto_id = sub.vezeto_id`), így „B” vezető saját csapatának függő kérelmeit is átírja „A” vezetőre.
- **Javítás:** Először lekérdezzük `sub.vezeto_id` közvetlen beosztottjainak ID-jait (`subordinateIds`), és csak `.in("dolgozo_id", subordinateIds)` szűréssel adjuk vissza a függő kérelmeket.

### 3.3. [P1] eaisyHR Áthelyezett szombati munkanapok (`athelye_munkanap`), munkaszüneti napok és lezárt KPI védelem
- **Érintett fájlok:**
  - [`src/app/hr/compliance/compliance-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/compliance/compliance-actions.ts#L84-L91)
  - [`src/app/hr/reports/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/reports/actions.ts#L684-L762)
  - [`src/app/hr/performance/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/performance/actions.ts#L105-L180)
  - [`src/app/hr/performance/dashboard/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/performance/dashboard/page.tsx#L68-L85)
- **Valós hiba:**
  1. A `runWorkTimeComplianceCheck` nem szűr `.eq("athelye_munkanap", false)`-ra, így a ledolgozós szombatokat ünnepnapi munkavégzés szabálysértésnek jelöli.
  2. A `getPayrollReportData` a szabadságoknál naptári napokat számol a `munkanapok_szama` / munkanapok helyett.
  3. Az `updateKpiProgress` és `addKpiSelfEvaluation` engedi a már `"lezart"` KPI-ok módosítását.
  4. A `/hr/performance/dashboard` a Docs-os `szervezeti_egyseg` táblát kérdezi le a `hr_szervezeti_egyseg` helyett.
- **Javítás:** Célzott szűrések és állapot-ellenőrzések beépítése.

### 3.4. [P1] eaisyHR `/api/hr/download-document` vállalati szabályzat (`hr_ceges_dokumentum`) letöltés és audit naplózás
- **Érintett fájl:** [`src/app/api/hr/download-document/route.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/api/hr/download-document/route.ts#L43-L85)
- **Valós hiba:**
  1. A `43. sorban` a `scopedRoles.docsRole === "admin"` HR letöltési jogot ad egy csak-Docs adminnak.
  2. A munkavállalói (`!isHrOrAdmin`) ág nem ellenőrzi a `hr_ceges_dokumentum` táblát (kötelezően megismerendő vállalati szabályzatok), így a dolgozó `403`-at kap, ha le akarja tölteni a szabályzatot.
  3. A sikeres letöltés nem naplózódik a `hr_esemeny_naplo` táblába.
- **Javítás:** `docsRole` kivétele, `hr_ceges_dokumentum` (azonos `company_id`) engedélyezése, és `hr_esemeny_naplo` beszúrás.

---

## 4. SZINT — Server Action Jogosultsági (`requireDocsAuthServer` / `requireHrWriteServer`) és `company_id` Izolációs Keményítés (~1–1.5 óra)

### 4.1. [P0/P1] eaisyHR Server Action írási és `company_id` szűrések pótlása
- **Érintett fájlok:**
  - [`src/app/hr/employee/[id]/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/employee/%5Bid%5D/actions.ts#L1686-L1745): Az `updateGeneralPersonalInfo`-ban ha `user.id === employeeId` és a felhasználónak nincs HR `"employees"` írási joga, nem módosíthatja a `szuletesi_datum`, `gyermekek_szama`, `megvaltozott_munkakepessegu` és `orvosi_alkalmassag_ervenyesseg` mezőket; a `revealEmployeeSecretData` (`#L1598`) kapjon `requireHrAuthServer` + `company_id` ellenőrzést; a `hasHrOrDocsAdminProfile` (`#L24`) ne fogadja el a `docsRole === "admin"`-t; a törlő és iktató (`executeHrDocumentFiling`) hívások kapják meg az `activeCompanyId`-t.
  - [`src/app/hr/dashboard-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/dashboard-actions.ts#L23-L25): `reassignPendingLeaves` használjon `hasHrWriteAccess` ellenőrzést.
  - [`src/app/hr/actions/onboarding-job-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/actions/onboarding-job-actions.ts#L672): `fileExistingJobDescriptionDocument` hívja a `verifyOnboardingJobAccess`-t `{ requireWrite: true }` opcióval.
  - [`src/app/api/hr/parse-cv/route.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/api/hr/parse-cv/route.ts#L10-L15): `checkHrWriteAccess(auth, ["admin", "recruitment"])` hozzáadása.
  - [`src/app/hr/payroll/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/payroll/actions.ts#L191-L299) és `#L854-L922`, [`src/app/hr/actions/t1041-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/actions/t1041-actions.ts#L154-L438), [`src/app/hr/offboarding/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/hr/offboarding/actions.ts#L530-L1748): `.eq("company_id", ...)` szűrések pótlása az `adminClient` lekérdezésekben.

### 4.2. [P0/P1] eaisyDocs `requireDocsAuthServer` modul-kulcsok és `company_id` szűrések pótlása
- **Érintett fájlok:**
  - [`src/utils/docs-auth-guard.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/docs-auth-guard.ts#L144-L190): Amikor `isWriteCheck = true`, a `checkDossierWritePermission` (`dossiers/[id]/actions.ts:22`) és `checkVersionWritePermission` (`version-actions.ts:23`) kifejezetten a `"dossiers"` modul írási jogát ellenőrizze, az `inbox`, `archive`, `partners`, `tasks`, `rules`, `settings`, `search` módosító actionök pedig adják át a saját modul-kulcsukat.
  - [`src/app/partners/eaisybill-partner-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/partners/eaisybill-partner-actions.ts#L113-L805): `requireDocsAuthServer(["admin", "vezeto", "munkavallalo", "partners"])` hozzáadása a `getEaisyBillPartnersAction` és `syncEaisyBillPartnerInvoicesAction` elejére, valamint `p_company_id: activeCompany.id` átadása a `generate_erkeztetoszam` RPC-nek (`#L696`).
  - [`src/app/partners/[id]/page.tsx`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/partners/%5Bid%5D/page.tsx#L61-L114) & [`src/app/rules/filing-rules-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/rules/filing-rules-actions.ts#L91-L286): `.eq("company_id", activeCompanyId)` szűrések pótlása.
  - [`src/app/tasks/task-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/tasks/task-actions.ts#L11-L734) & [`src/app/settings/substitution-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/settings/substitution-actions.ts#L7-L85): Írási jogosultság-ellenőrzés és `company_id` szűrés pótlása.

---

## 5. SZINT — Központi Keresztmodul-Izoláció (`docs` vs. `hr`) és Adatbázis RLS Migráció (`20261104000006`) (~1–1.5 óra)

Ez a szint zárja le véglegesen a két modul (`eaisyDocs` és `eaisyHR`) közötti jogosultsági átszivárgást mind TypeScript, mind PostgreSQL RLS szinten:

### 5.1. [P0] TypeScript Keresztmodul-Izoláció (`company-server.ts`, `company-role-resolver.ts`, `docs-auth-guard.ts`, `hr-auth-guard.ts`, `company-actions.ts`, `management/actions.ts`)
1. [`src/utils/company-server.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/company-server.ts#L137-L177) & [`src/utils/hr/company-role-resolver.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr/company-role-resolver.ts#L441-L526):
   - Ha `!hasDocsModule` (`!elerheto_modulok.includes("docs")`), akkor a `membership.docs_szerepkor`, `membership.docs_modulok`, `membership.docs_iras_modulok` is maszkolásra kerül (`"none"`, `[]`, `[]`), és a `company_members.role = "admin"/"owner"` **nem** ad `docsRole = "admin"`-t egy csak-HR-es felhasználónak.
   - Ha `!hasHrModule` (`!elerheto_modulok.includes("hr")`), akkor a `membership.hr_szerepkor`, `membership.hr_modulok`, `membership.hr_iras_modulok` is maszkolásra kerül (`"none"`, `[]`, `[]`), és a `company_members.role = "admin"/"owner"` **nem** ad `hrRole = "admin"`-t egy csak-Docs-os felhasználónak.
   - A `resolveUserCompanyRoles` HR ága (`#L490-L496`) megkapja ugyanazt a globális admin cap-et, mint a Docs ág: ha a felhasználó egy másik cégben globális `hr_szerepkor = 'admin'`, de az adott cégben nincs explicit `membership.hr_szerepkor = 'admin'` és nem `isCompanyAdmin`, akkor `'munkavallalo'`-ra korlátozódik.
2. [`src/app/actions/company-actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/actions/company-actions.ts#L1271-L1277) (`inviteCompanyMemberAction` & `updateCompanyMemberRoleAction`):
   - Meglévő felhasználó meghívásakor az `elerheto_modulok` mindig egyesítésre kerül (`Array.from(new Set([...currentModules, data.module]))`), soha nem írja felül a másik modult.
   - Meghíváskor és szerepkör-módosításkor a `docs_iras_modulok` / `hr_iras_modulok` is szinkronban frissül az alapértelmezett modul-listával.
3. [`src/app/management/actions.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/app/management/actions.ts#L1115-L1202) (`updateManagementUserAction`):
   - Ha a felhasználó szerepköre a 3 kanonikus szerepkör (`munkavallalo`, `vezeto`, `admin`) között megváltozik a Szerkesztés modálban (`prev?.docs_szerepkor !== m.docs_szerepkor` vagy `prev?.hr_szerepkor !== m.hr_szerepkor`), a `docs_modulok`/`docs_iras_modulok` és `hr_modulok`/`hr_iras_modulok` felveszik az új szerepkör tiszta alapértelmezett moduljait (nem ragadnak bent a korábbi adminisztrátori modulok); ha pedig `!validModules.includes("docs")` vagy `!validModules.includes("hr")`, akkor `null` / `[]` értéket kapnak.

### 5.2. [P0] Egyetlen, Atomi PostgreSQL Migráció (`supabase/migrations/20261104000006_complete_rls_and_cross_module_hardening.sql`)
Az élő adatbázis-vizsgálat alapján az alábbi 7 elem kerül bele egyetlen tranzakciós (`BEGIN ... COMMIT`) migrációba:
1. **`public.handle_new_user()` trigger javítása:** A `szerepkor` oszlopba `'munkavallalo'::public.user_szerepkor` (nem `docs_szerepkor_enum`), a `docs_szerepkor` oszlopba `'munkavallalo'::public.docs_szerepkor_enum` kerül.
2. **`public.has_hr_module_access` és `public.has_hr_write_access` szigorítása:**
   - Mindkettő legelső lépésként ellenőrzi a `'hr' = ANY(COALESCE(fp.elerheto_modulok, ARRAY[]::text[]))` feltételt (így egy csak-Docs-os cégadmin sem kap HR hozzáférést), és eltávolítja a `fp.docs_szerepkor` fallbacket a `has_hr_module_access`-ből.
   - Mind a `has_docs_write_access`, mind a `has_hr_write_access` modulonkénti metszetet (`EXISTS (SELECT 1 FROM unnest(p_modules) m WHERE m = ANY(v_read) AND m = ANY(v_write))`) ellenőriz, és szinkronban kezeli a `company_members` -> `felhasznalo_profil` fallbacket, ha `cm.hr_modulok` / `cm.docs_modulok` üres (`'{}'`).
3. **`hr_toborzas` és `hr_teljesitmeny` PERMISSIVE RLS szabályok pótlása:**
   - Az élő adatbázisban jelenleg mindkét táblán csak a `RESTRICTIVE` `tenant_isolation_restrictive` policy létezik (0 `PERMISSIVE` policy!). Megkapják a cég-scoped `SELECT` (`has_hr_module_access`) és `INSERT`/`UPDATE`/`DELETE` (`has_hr_write_access`) szabályokat (plusz `hr_teljesitmeny`-en a saját dolgozói és felettesi hozzáférést).
4. **A 49 db HR tábla írási (`INSERT`/`UPDATE`/`DELETE`/`FOR ALL`) RLS szabályának szétválasztása:**
   - Ahol jelenleg `FOR ALL` policy hívja a `has_hr_module_access`-t, ott a `SELECT` policy megtartja a `has_hr_module_access`-t (Olvasás), az írási (`INSERT`/`UPDATE`/`DELETE`) policy pedig `has_hr_write_access`-re áll át (megtartva a dolgozói önkiszolgáló `dolgozo_id = auth.uid()` és vezetői jóváhagyói ágakat).
5. **Hiányzó Docs RLS írási szabályok (`partner`, `ugy`, `selejtezes_csomag`, `feladat`, `ugyirat_megjegyzes_csatolmany`, `attach_irat_to_dossier_atomic`):**
   - A `partner` és `feladat` táblákon a `USING (true)` policy lecserélése `has_docs_module_access` (SELECT) és `has_docs_write_access` (INSERT/UPDATE/DELETE) szabályokra.
   - Az `ugy_write_company`, `selejtezes_csomag`, `ugyirat_megjegyzes_csatolmany` és `attach_irat_to_dossier_atomic` átállítása `has_docs_write_access` ellenőrzésre.
6. **`public.rendszer_beallitas` RLS policy visszaállítása cég-scoped ellenőrzésre:**
   - A `:<company_uuid>` végződésű kulcsoknál az adott `company_id`-ra hívja meg a `get_effective_docs_role(v_company_id, auth.uid()) = 'admin' OR has_docs_write_access(ARRAY['settings'], v_company_id, auth.uid())` ellenőrzést.
7. **`storage.objects` (`hr_reports` bucket) cég-scoped RLS szigorítása:**
   - A `hr_reports` bucket szabályai a globális `felhasznalo_profil.hr_szerepkor` helyett a `has_hr_module_access` / `has_hr_write_access` függvényt használják.
