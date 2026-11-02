# A-104: Egységes Háromcsatornás Értesítési Motor (`dispatchDocsNotification` & `dispatchHrNotification`), Cégszintű Éjszakai Cron és eaisyDocs 1. Csomag Hibajavítások

**Status:** Decided  
**Date:** 2026-11-02  
**Scope:** `[Közös]` `[Docs]` `[HR]`  
**Author:** Antigravity  
**Kapcsolódó PRD:** [P-133](../../product/decisions/P-133-unified-notification-rules-matrix-and-three-channel-toggle-ux.md)  
**Kapcsolódó Kód:** `src/utils/docs-notification-dispatcher.ts`, `src/utils/hr-notification-dispatcher.ts`, `src/app/api/cron/nightly/route.ts`, `src/app/settings/page.tsx`, `src/app/settings/notification-settings.tsx`, `src/app/settings/settings-actions.ts`, `src/app/hr/settings/page.tsx`, `src/app/hr/settings/notification-settings.tsx`, `src/app/hr/settings/notification-actions.ts`, `src/app/dossiers/dossier-actions.ts`, `src/app/archive/disposal-actions.ts`, `src/utils/imap-service.ts`, `src/app/tasks/task-actions.ts`, `src/app/dossiers/[id]/actions.ts`, `src/app/dossiers/[id]/access-actions.ts`, `src/utils/saved-search-alerts.ts`, `src/app/hr/self-service/actions.ts`, `src/app/hr/manager/actions.ts`, `src/app/hr/attendance-actions.ts`, `src/app/partners/eaisybill-partner-actions.ts`, `src/app/inbox/page.tsx`, `src/app/partners/contract-actions.ts`, `src/utils/permissions.ts`, `src/app/dossiers/[id]/page.tsx`

---

## 1. Context (Kontextus)

Az `eaisyDocs` 2026-11-02-es mélyauditja (`docs/eaisydocs-deep-analysis-20261102.md`) és az értesítési rendszer felülvizsgálata az alábbi kritikus hiányosságokat tárta fel:

1. **Széttagolt és bedrótozott értesítések (`eaisyDocs` & `eaisyHR`):**
   - Az `eaisyDocs`-ban 5 valós idejű értesítés (`uj_irat_erkezett`, `uj_feladat_szignalva`, `megjegyzes_emlitve`, `explicit_hozzaferes`, `mentett_kereses_talalat`), az `eaisyHR`-ben pedig 3 munkafolyamat-értesítés (`tavollet_elbiralas`, `jelenlet_korrekcio_kerelem`, `jelenlet_korrekcio_elbiralas`) közvetlenül az `alkalmazas_ertesites` táblába írt (`in_app`), anélkül hogy szerepelt volna az `ertesitesi_szabaly` táblában, így sem ki-/bekapcsolni, sem `E-mail` vagy `SMS` csatornára kiterjeszteni nem lehetett őket.
   - Az `eaisyDocs` beállítási felületén (`src/app/settings/notification-settings.tsx`) hiányzott a `Rendszeren belül` (`in_app`) csatorna gomb, és az `uj_szignalas` / `allapotvaltozas` események figyelmen kívül hagyták az `in_app` csatornát.
2. **Éjszakai Cron (`src/app/api/cron/nightly/route.ts`) hibák:**
   - A `megorzesi_ido_lejart` szabályra a cron `'megorzes_lejar'` néven keresett, így a megőrzési idő lejártáról szóló értesítés sosem futott le.
   - A `teljesitmeny_ertekeles` (*Teljesítményértékelés határidők*) szabály 0 helyen volt bekötve a kódban.
   - A `t1041_bejelentes` szabályból hiányzott az `SMS` ág és nem ellenőrizte a `hr_t1041_bejelentes` táblát (akkor is riasztott, ha már beküldték).
   - A cron minden szabályt globális `szabalyok.find(...)` hívással (`company_id` szűrés nélkül) értékelt ki, a HR címzetteket globálisan kereste, és SMS küldésnél nem vette figyelembe a HR Dolgozói Adatlapon tárolt `hr_dolgozo_adatlap.telefonszam` mezőt.
3. **eaisyDocs 1. Csomag (Azonnali funkcionális hibák):**
   - **Task 1.2 (`eaisyBill` számla-szinkron):** A `syncEaisyBillPartnerInvoicesAction` `statusz: "erkeztetett"` értékkel és érvénytelen `esemeny_tipus: "eaisybill_szamla_szinkron"`-nal szúrt be iratokat, miközben a `/inbox` oldal csak a `statusz IS NULL` és `statusz = 'erkeztetve'` sorokat listázta.
   - **Task 1.4 (`finalizeAndFileContractAction`):** A szerződés véglegesítésekor nem létező `kezbesites_ideje` oszlopra próbált frissíteni (`kezbesites_datuma` helyett), és hiányzott a `company_id` az `irat` és `esemeny_naplo` beszúrásokból.
   - **Task 1.5 (`rendszergazda` szerepkör):** A `src/utils/permissions.ts` (`canViewAll`, `canEdit`, `canAddIncoming`) és a `src/app/dossiers/[id]/page.tsx` (`isAdmin`) nem tartalmazta a `'rendszergazda'` szerepkört.

---

## 2. Decision (A Meghozott Döntés)

1. **Központi Háromcsatornás Értesítési Motorok (`dispatchDocsNotification` és `dispatchHrNotification`):**
   - Létrehoztuk a [`src/utils/docs-notification-dispatcher.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/docs-notification-dispatcher.ts) és [`src/utils/hr-notification-dispatcher.ts`](file:///c:/Users/dani%20pc%20xd/Desktop/Projectek/easydocs/src/utils/hr-notification-dispatcher.ts) segédmodulokat, amelyek:
     - Lekérdezik az aktív vállalathoz (`company_id`) tartozó `ertesitesi_szabaly` rekordot.
     - Tiszteletben tartják az `aktiv` kapcsolót (`aktiv === false` esetén nem küldenek értesítést).
     - A `csatorna` tömb alapján kiküldik az értesítést `in_app` (`alkalmazas_ertesites`), `email` (`sendNotificationEmail` Brevo API-n) és `sms` (`sendSmsNotification` Twilio API-n) csatornákon.
     - Telefonszám feloldásakor a `felhasznalo_profil.telefon` hiánya esetén automatikusan visszaesnek a `hr_dolgozo_adatlap.telefonszam` mezőre.
2. **11 `eaisyDocs` és 10 `eaisyHR` Szabály Automatikus Céges Inicializálása és Szétválasztása:**
   - A `/settings` (`src/app/settings/page.tsx`) megnyitásakor az aktív céghez idempotensen (`upsert` `onConflict: "company_id,esemeny_tipus,kinek", ignoreDuplicates: true`) létrejön mind a 11 `eaisyDocs` szabály, a `/hr/settings` (`src/app/hr/settings/page.tsx`) megnyitásakor pedig mind a 10 `eaisyHR` szabály, modulonként szűrve (`DOCS_RULE_TYPES` vs `HR_RULE_TYPES`).
3. **Cégszintű Éjszakai Cron (`src/app/api/cron/nightly/route.ts`):**
   - Bevezettük a `findRuleForCompany(esemenyTipus, companyId, kinekMatch)` függvényt: ha egy céghez létezik szabály és `aktiv === false`, a cron nem esik vissza másik cég szabályára.
   - A HR és Iratkezelő címzetteket a `getCompanyHrUserIds(companyId)` és `getCompanyIratkezelokIds(companyId)` függvények a `company_members` és a céges `felhasznalo_profil` alapján oldják fel.
   - Bekötöttük az `I)` blokkban a `teljesitmeny_ertekeles` szabályt (7 nappal a `hr_teljesitmeny_ciklus.befejezo_datum` előtt értesíti a lezáratlan KPI-jal rendelkező dolgozókat és vezetőiket), az `F)` blokkban a `hr_t1041_bejelentes` ellenőrzést és az SMS ágat, a `C)` blokkban pedig a `megorzesi_ido_lejart` kulcsot.
4. **eaisyDocs 1. Csomag Javítások:**
   - `src/app/partners/eaisybill-partner-actions.ts` & `src/app/inbox/page.tsx`: `statusz: "erkeztetve"`, `company_id: activeCompanyId`, érvényes `esemeny_tipus` (`"adat_modositas"` / `"erkeztetve"`), `revalidatePath("/inbox")`, valamint visszafelé kompatibilis `.or("statusz.is.null,statusz.eq.erkeztetve,statusz.eq.erkeztetett")` szűrés a `/inbox` oldalon.
   - `src/app/partners/contract-actions.ts`: `kezbesites_ideje` javítva `kezbesites_datuma`-ra, `company_id: activeCompanyId` pótolva az `irat` és `esemeny_naplo` beszúrásoknál.
   - `src/utils/permissions.ts` & `src/app/dossiers/[id]/page.tsx`: `'rendszergazda'` szerepkör felvéve az `admin` mellé.

---

## 3. Consequences (Következmények)

- **Pozitív:** Mind az `eaisyDocs` (11 szabály), mind az `eaisyHR` (10 szabály) összes értesítése egységesen, cégszinten (`company_id`) konfigurálható és mindhárom csatornán (`in_app`, `email`, `sms`) működik; az `eaisyBill` számlák azonnal megjelennek a Bejövő sorban; a szerződés-véglegesítés és a `rendszergazda` jogosultságok hibamentesen működnek.
- **Kockázat / Kompromisszum:** Az éjszakai cron ciklusonként lekérdezi a céghez tartozó HR/iratkezelő tagokat, amelyet memóriabeli `Map` (`hrUsersCache`, `docsIratkezelokCache`) gyorsítótáraz cégenként, így nincs `N+1` lekérdezési többlet.
